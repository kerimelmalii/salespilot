import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db/client";
import { scanRuns, searchQueries, searchResults, companyCandidates } from "@/lib/db/schema";
import { PROMPT_VERSION, SCORING_VERSION, getDeploymentMetadata, recordScanError } from "@/lib/salespilot/measurement";

/**
 * Arama endpoint'i.
 *
 * Kullanıcının kriterlerinden birkaç farklı Google araması oluşturur,
 * Serper'a gönderir, aynı domain'i birden fazla aramadan gelse de
 * tekilleştirir, sosyal medya sonuçlarını (LinkedIn, Instagram vb.) eler.
 *
 * ÖLÇÜM (28 Eylül 2026): bu istek aynı zamanda taramanın scan_runs kaydını
 * açar - dönen scanId, sonraki tüm /api/research, /api/score, /api/draft-email
 * çağrılarına AYNEN iletilmelidir. Ham sonuçlar, elenenler (nedenleriyle) ve
 * tekilleştirilmiş şirket adayları da bu istekte kalıcı olarak yazılır.
 */

interface SearchRequestBody {
  userCompanyName?: string;
  userWebsite?: string;
  targetSector: string;
  targetRegion: string;
  productOrService: string;
  extraCriteria?: string;
  scoreThreshold?: number;
}

interface CompanyCandidateOut {
  id: string; // company_candidates.id - sonraki tüm çağrılarda kullanılır
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

type ExclusionReason =
  | "directory"
  | "social_network"
  | "government"
  | "invalid_url";

/**
 * Domain'i eleme nedenine göre sınıflandırır, elenmiyorsa null döner.
 * .org.tr (dernek/birlik/borsa) için tam karşılığı olan bir kod yok - en
 * yakın kategori olan "directory" (rehber/dizin niteliğinde kurum) kullanılır.
 */
function classifyExclusion(domain: string): ExclusionReason | null {
  if (isSocialDomain(domain)) return "social_network";
  if (isDirectoryOrSearchDomain(domain)) return "directory";
  if (domain.endsWith(".gov.tr")) return "government";
  if (domain.endsWith(".org.tr")) return "directory";
  return null;
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

async function searchOneQuery(query: string, apiKey: string): Promise<SerperOrganicResult[]> {
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

// Bu adımda kullanılan tek model - route bunu scan_runs.aiModel'e yazar.
// Puanlama/araştırma modelleri değişirse burayı da güncelleyin.
const PRIMARY_AI_MODEL = "claude-haiku-4-5-20251001";

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

  const searchStartedAt = Date.now();
  const deployment = getDeploymentMetadata();

  const [scanRun] = await db
    .insert(scanRuns)
    .values({
      gitBranch: deployment.gitBranch,
      gitCommitSha: deployment.gitCommitSha,
      vercelDeploymentId: deployment.vercelDeploymentId,
      promptVersion: PROMPT_VERSION,
      scoringVersion: SCORING_VERSION,
      aiModel: PRIMARY_AI_MODEL,
      workspaceId: "pilot-anonymous",
      userCompanyName: body.userCompanyName ?? "",
      userWebsite: body.userWebsite ?? "",
      targetSector: body.targetSector,
      targetRegion: body.targetRegion,
      productOrService: body.productOrService,
      extraCriteria: body.extraCriteria ?? null,
      scoreThreshold: body.scoreThreshold ?? 75,
    })
    .returning({ id: scanRuns.id });
  const scanId = scanRun.id;

  const queries = buildQueries(body);
  const queryRows = await db
    .insert(searchQueries)
    .values(
      queries.map((queryText, index) => ({
        scanId,
        queryText,
        queryOrder: index,
        generationMethod: "deterministic_fallback" as const,
      }))
    )
    .returning({ id: searchQueries.id, queryText: searchQueries.queryText });

  const candidatesByDomain = new Map<
    string,
    { title: string; snippet: string; url: string; queryIds: Set<string> }
  >();
  let lastQueryError: unknown = null;
  let failedQueryCount = 0;

  for (const queryRow of queryRows) {
    let results: SerperOrganicResult[] = [];
    try {
      results = await searchOneQuery(queryRow.queryText, apiKey);
    } catch (err) {
      // Bir sorgu başarısız olursa tüm taramayı çökertme, sadece o sorguyu atla.
      console.error(`Arama sorgusu başarısız: "${queryRow.queryText}"`, err);
      failedQueryCount += 1;
      lastQueryError = err;
      await recordScanError({
        scanId,
        queryId: queryRow.id,
        stage: "search",
        error: err,
        retryable: true,
        finalStatus: "failed",
      });
      continue;
    }

    const resultRows = results.map((result, position) => {
      const domain = result.link ? extractDomain(result.link) : null;
      const exclusionReason: ExclusionReason | null = !domain
        ? "invalid_url"
        : classifyExclusion(domain);

      if (!exclusionReason && domain) {
        const existing = candidatesByDomain.get(domain);
        if (existing) {
          existing.queryIds.add(queryRow.id);
        } else {
          candidatesByDomain.set(domain, {
            title: result.title ?? domain,
            snippet: result.snippet ?? "",
            url: result.link!,
            queryIds: new Set([queryRow.id]),
          });
        }
      }

      return {
        scanId,
        queryId: queryRow.id,
        resultPosition: position,
        title: result.title ?? null,
        url: result.link ?? "",
        snippet: result.snippet ?? null,
        domain,
        excluded: exclusionReason !== null,
        exclusionReason,
      };
    });

    if (resultRows.length > 0) {
      await db.insert(searchResults).values(resultRows);
    }
  }

  // Sorguların HEPSİ başarısız olduysa (örn. geçersiz/eksik API anahtarı,
  // Serper kotası bitmiş vb.) bunu "0 sonuç bulundu" gibi göstermek yanıltıcı
  // - kullanıcı sanki hedef bölgede hiç şirket yokmuş gibi düşünür. Gerçek
  // hatayı bildiriyoruz. scan_run kaydı yine de kalır (başarısız denemeyi
  // ölçmek için).
  if (failedQueryCount === queryRows.length) {
    const message = lastQueryError instanceof Error ? lastQueryError.message : "Bilinmeyen hata";
    return NextResponse.json(
      { error: `Arama yapılamadı: ${message}`, scanId },
      { status: 502 }
    );
  }

  let companies: CompanyCandidateOut[] = [];
  if (candidatesByDomain.size > 0) {
    const insertedCandidates = await db
      .insert(companyCandidates)
      .values(
        Array.from(candidatesByDomain.entries()).map(([domain, c]) => ({
          scanId,
          searchResultName: c.title,
          officialDomain: domain,
          sourceUrls: [c.url],
          sourceQueryIds: Array.from(c.queryIds),
        }))
      )
      .returning({ id: companyCandidates.id, officialDomain: companyCandidates.officialDomain });

    const queryTextById = new Map(queryRows.map((q) => [q.id, q.queryText]));
    companies = insertedCandidates.map((row) => {
      const c = candidatesByDomain.get(row.officialDomain)!;
      return {
        id: row.id,
        domain: row.officialDomain,
        title: c.title,
        snippet: c.snippet,
        url: c.url,
        foundVia: Array.from(c.queryIds).map((id) => queryTextById.get(id) ?? id),
      };
    });
  }

  await db
    .update(scanRuns)
    .set({ stageDurations: { searchMs: Date.now() - searchStartedAt } })
    .where(eq(scanRuns.id, scanId));

  return NextResponse.json({
    scanId,
    queries,
    totalFound: companies.length,
    companies,
  });
}
