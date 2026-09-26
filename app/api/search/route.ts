import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Faz 0 - temel arama endpoint'i.
 *
 * Kullanıcının kriterlerinden birkaç farklı Google araması oluşturur,
 * Serper'a gönderir, aynı domain'i birden fazla aramadan gelse de
 * tekilleştirir, sosyal medya sonuçlarını (LinkedIn, Instagram vb.) eler.
 *
 * Bu adımda henüz puanlama YOK - sadece "aday şirketleri keşfetme"
 * (bkz. orijinal spesifikasyonun 1. bölümü). Kanıta dayalı puanlama
 * Faz 1'de lib/salespilot/pipeline.ts ile eklenecek.
 */

interface SearchRequestBody {
  targetSector: string;
  targetRegion: string;
  productOrService: string;
  extraCriteria?: string;
}

interface CompanyCandidate {
  domain: string;
  title: string;
  snippet: string;
  url: string;
  foundVia: string[]; // hangi sorgu(lar) bu domain'i buldu
}

// Bunlar şirket değil, sosyal medya profili - listeye şirket olarak girmesin.
const SOCIAL_DOMAINS = [
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
];

// 17 Eylül 2026'da gerçek bir taramada gözlemlendi: bu tür siteler şirket
// gibi listeye giriyor ama aslında rehber/arama motoru/dizin siteleri -
// araştırma+puanlama bütçesini boşa harcıyorlar (20 sonuçtan 10'u böyleydi).
const DIRECTORY_AND_SEARCH_DOMAINS = [
  "yandex.com",
  "yandex.com.tr",
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "bulurum.com",
  "kompass.com",
  "tr.kompass.com",
  "infobel.com",
  "rehber.com",
  "ticaretrehberi.com",
  "sanayi.com",
  "firmarehberi.com",
  "firmabul.com",
  "sahibinden.com", // 17 Eylül 2026: ilan sitesi, şirket değil
  "capterra.web.tr", // 17 Eylül 2026: yazılım karşılaştırma/inceleme sitesi
  "capterra.com",
];

function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isSocialDomain(domain: string): boolean {
  return SOCIAL_DOMAINS.some((social) => domain === social || domain.endsWith(`.${social}`));
}

function isDirectoryOrSearchDomain(domain: string): boolean {
  return DIRECTORY_AND_SEARCH_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/**
 * .gov.tr (devlet kurumu) ve .org.tr (dernek/birlik/borsa/teknopark) gibi
 * domain'ler pratikte neredeyse hiç "satın alan müşteri" olmuyor - ticaret
 * odası, ihracatçı birliği, kalkınma ajansı gibi kurumlar. Bu basit bir
 * sezgisel kural; gerçek şirketler ezici çoğunlukla .com/.com.tr kullanıyor.
 * Yanlış filtrelenen meşru bir şirket fark ederseniz bu listeyi daraltın.
 */
function isLikelyInstitutionalDomain(domain: string): boolean {
  return domain.endsWith(".gov.tr") || domain.endsWith(".org.tr");
}

function shouldExcludeDomain(domain: string): boolean {
  return (
    isSocialDomain(domain) ||
    isDirectoryOrSearchDomain(domain) ||
    isLikelyInstitutionalDomain(domain)
  );
}

function buildQueries(body: SearchRequestBody): string[] {
  const { targetSector, targetRegion, productOrService, extraCriteria } = body;
  const queries = [
    `${targetSector} ${targetRegion}`,
    `${targetSector} ${productOrService} ${targetRegion}`,
  ];
  if (extraCriteria && extraCriteria.trim().length > 0) {
    queries.push(`${targetSector} ${targetRegion} ${extraCriteria}`);
  }
  return queries;
}

interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
}

async function searchOneQuery(
  query: string,
  apiKey: string
): Promise<SerperOrganicResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, gl: "tr", hl: "tr", num: 20 }),
  });

  if (!response.ok) {
    throw new Error(`Serper API hatası: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.organic ?? []) as SerperOrganicResult[];
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`search:${getClientIp(req)}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPER_API_KEY tanımlı değil. .env.local dosyasını kontrol edin." },
      { status: 500 }
    );
  }

  let body: SearchRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.targetSector || !body.targetRegion || !body.productOrService) {
    return NextResponse.json(
      { error: "targetSector, targetRegion ve productOrService zorunlu." },
      { status: 400 }
    );
  }

  const queries = buildQueries(body);
  const candidatesByDomain = new Map<string, CompanyCandidate>();
  let lastQueryError: unknown = null;
  let failedQueryCount = 0;

  for (const query of queries) {
    let results: SerperOrganicResult[] = [];
    try {
      results = await searchOneQuery(query, apiKey);
    } catch (err) {
      // Bir sorgu başarısız olursa tüm taramayı çökertme, sadece o sorguyu atla.
      console.error(`Arama sorgusu başarısız: "${query}"`, err);
      failedQueryCount += 1;
      lastQueryError = err;
      continue;
    }

    for (const result of results) {
      const domain = result.link ? extractDomain(result.link) : null;
      if (!domain || shouldExcludeDomain(domain)) continue;

      const existing = candidatesByDomain.get(domain);
      if (existing) {
        if (!existing.foundVia.includes(query)) existing.foundVia.push(query);
      } else {
        candidatesByDomain.set(domain, {
          domain,
          title: result.title ?? domain,
          snippet: result.snippet ?? "",
          url: result.link!,
          foundVia: [query],
        });
      }
    }
  }

  // Sorguların HEPSİ başarısız olduysa (örn. geçersiz/eksik API anahtarı,
  // Serper kotası bitmiş vb.) bunu "0 sonuç bulundu" gibi göstermek yanıltıcı
  // - kullanıcı sanki hedef bölgede hiç şirket yokmuş gibi düşünür. Gerçek
  // hatayı bildiriyoruz.
  if (failedQueryCount === queries.length) {
    const message = lastQueryError instanceof Error ? lastQueryError.message : "Bilinmeyen hata";
    return NextResponse.json(
      { error: `Arama yapılamadı: ${message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    queries,
    totalFound: candidatesByDomain.size,
    companies: Array.from(candidatesByDomain.values()),
  });
}
