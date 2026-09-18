import * as cheerio from "cheerio";
import { isIP } from "node:net";
import type { ScrapedPage } from "./prompts";
import type { ContactEmailCandidate } from "./types";

/**
 * Faz 1 - şirket web sitesi kazıma.
 *
 * Prensipler (konuştuklarımızdan):
 * - robots.txt'ye uy - tamamen yasaklıyorsa hiç dokunma.
 * - Kendini tanıt (User-Agent) - kim olduğun belirsiz bir bot gibi davranma.
 * - Bir sayfa başarısız olursa tüm taramayı çökertme, sadece o sayfayı atla.
 * - Aşırı istek gönderme - sabit, küçük bir sayfa listesiyle sınırlı kal.
 */

const USER_AGENT = "SalesPilotBot/0.1 (+https://salespilot.example/bot)";
const FETCH_TIMEOUT_MS = 8000;
const MAX_PAGES = 8;

// Türkçe ve İngilizce yaygın sayfa yolları - hepsi denenir, bulunanlar kullanılır.
const CANDIDATE_PATHS = [
  "/",
  "/hakkimizda",
  "/about",
  "/about-us",
  "/urunler",
  "/products",
  "/hizmetler",
  "/services",
  "/ihracat",
  "/export",
  "/iletisim",
  "/contact",
  "/unternehmen",
  "/ueber-uns",
  "/uber-uns",
  "/produkte",
  "/anwendungen",
  "/branchen",
  "/kontakt",
  "/impressum",
];

const RELEVANT_LINK_PATTERN = /(about|company|hakkimizda|hakkımızda|unternehmen|ueber|über|firma|products?|produkte|urunler|ürünler|services?|hizmetler|applications?|anwendungen|industries|branchen|export|ihracat|contact|kontakt|iletisim|iletişim|impressum)/i;

const COMMON_TWO_PART_SUFFIXES = new Set([
  "com.tr", "com.de", "co.uk", "com.au", "co.nz", "co.jp", "com.br", "com.cn",
]);

export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  return COMMON_TWO_PART_SUFFIXES.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

export function isSafePublicHostname(domain: string): boolean {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  if (!/^[a-z0-9.-]+$/.test(normalized) || normalized.includes("..")) return false;
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) return false;
  if (isIP(normalized)) {
    return !/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(normalized) && normalized !== "::1";
  }
  return normalized.includes(".");
}

export function emailMatchesCompanyDomain(email: string, companyDomain: string): boolean {
  const emailDomain = email.toLowerCase().split("@")[1] ?? "";
  return Boolean(emailDomain) && registrableDomain(emailDomain) === registrableDomain(companyDomain);
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    return res;
  } catch {
    return null; // timeout, DNS hatası, bağlantı reddi vb. - sessizce atla
  } finally {
    clearTimeout(timeout);
  }
}

/** robots.txt'de "*" için "/" tamamen yasaklanmış mı, basit bir kontrol. */
async function isFullyDisallowed(baseUrl: string): Promise<boolean> {
  const res = await fetchWithTimeout(`${baseUrl}/robots.txt`);
  if (!res || !res.ok) return false; // robots.txt yoksa/okunamıyorsa engelleme yok say

  const text = await res.text();
  const lines = text.split("\n").map((l) => l.trim().toLowerCase());

  let inWildcardBlock = false;
  for (const line of lines) {
    if (line.startsWith("user-agent:")) {
      inWildcardBlock = line.includes("*");
    } else if (inWildcardBlock && line.startsWith("disallow:")) {
      const path = line.split(":")[1]?.trim();
      if (path === "/") return true; // tüm site yasaklanmış
    }
  }
  return false;
}

/** Cheerio ile bir HTML sayfasından gürültüsüz, temiz metin çıkarır. */
export function extractCleanText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, noscript, svg").remove();
  const text = $("body").text();
  // Fazla boşluk/satır sonlarını sadeleştir
  return text.replace(/\s+/g, " ").trim();
}

// Sitelerde sık görülen ama gerçek iletişim adresi olmayan yaygın örnekler
// (analytics/tracking script'lerinde, örnek/placeholder metinlerde geçebilir).
const EMAIL_FALSE_POSITIVE_PATTERNS = [
  /^example@/i,
  /^test@/i,
  /^your-?email@/i,
  /@sentry\.io$/i,
  /@example\.com$/i,
  /\.(png|jpg|jpeg|gif|svg|webp)$/i, // "icon@2x.png" gibi görsel adları değil
];

function isLikelyRealEmail(email: string): boolean {
  return !EMAIL_FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(email));
}

/**
 * Bir HTML sayfasından GERÇEKTEN yazılı olan e-posta adreslerini çıkarır.
 * Bu tamamen deterministik (regex/DOM tabanlı) - AI kullanılmıyor, çünkü
 * "e-posta adresi uydurmayacağız" prensibi burada koda gömülü olmalı.
 * İki kaynaktan toplar: (1) mailto: linkleri, (2) sayfa metninde yazılı
 * e-posta görünümlü string'ler.
 */
export function extractEmailsFromHtml(html: string): string[] {
  const $ = cheerio.load(html);
  const found = new Set<string>();

  // 1) mailto: linkleri - en güvenilir kaynak, sitenin kendi işaretlediği adres
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (email) found.add(email.toLowerCase());
  });

  // 2) Düz metinde yazılı e-posta görünümlü ifadeler (birçok site mailto
  // linki koymadan sadece "info@sirket.com" yazar)
  $("script, style").remove();
  // $('body').text() bitişik metin node'larını ARAYA BOŞLUK KOYMADAN
  // birleştirir (örn. "info@site.com" hemen ardından gelen "Nasıl Gidebilirim"
  // linkiyle birleşip "info@site.comNasıl" gibi bozuk bir adres üretebiliyor -
  // gerçek bir taramada tespit edildi, 18 Eylül 2026). Metin node'larını tek
  // tek gezip ARALARINA boşluk koyarak birleştiriyoruz, bu sorunu önler.
  const textParts: string[] = [];
  $("body")
    .find("*")
    .addBack()
    .contents()
    .each((_, node) => {
      if (node.type === "text") {
        const text = $(node).text().trim();
        if (text) textParts.push(text);
      }
    });
  const bodyText = textParts.join(" ");
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = bodyText.match(emailRegex) ?? [];
  for (const m of matches) found.add(m.toLowerCase());

  return Array.from(found).filter(isLikelyRealEmail);
}

/**
 * Bulunan e-posta adaylarından "genel kurumsal" görünenleri öne çıkarır
 * (info@, bilgi@, iletisim@ gibi) - bunlar kişisel bir isme değil, genel
 * bir kutuya gittiği için soğuk satış maili için daha uygun bir seçim.
 * Bu sadece SIRALAMA için - hiçbir aday bulunmadıysa boş liste döner,
 * asla bir adres icat edilmez.
 */
export function rankEmailCandidates(
  candidates: ContactEmailCandidate[]
): ContactEmailCandidate[] {
  const GENERIC_PREFIXES = ["info", "bilgi", "iletisim", "contact", "satis", "sales"];
  return [...candidates].sort((a, b) => {
    const aGeneric = GENERIC_PREFIXES.some((p) => a.email.startsWith(`${p}@`));
    const bGeneric = GENERIC_PREFIXES.some((p) => b.email.startsWith(`${p}@`));
    if (aGeneric && !bGeneric) return -1;
    if (!aGeneric && bGeneric) return 1;
    return 0;
  });
}

export interface ScrapeResult {
  pages: ScrapedPage[];
  emailCandidates: ContactEmailCandidate[];
}

export async function scrapeCompanyPages(domain: string): Promise<ScrapeResult> {
  if (!isSafePublicHostname(domain)) {
    throw new Error("Güvenli olmayan veya geçersiz şirket alan adı.");
  }

  let baseUrl = `https://${domain}`;
  const httpsProbe = await fetchWithTimeout(baseUrl);
  if (!httpsProbe || !httpsProbe.ok) {
    const httpProbe = await fetchWithTimeout(`http://${domain}`);
    if (httpProbe?.ok) baseUrl = `http://${domain}`;
  }

  const blocked = await isFullyDisallowed(baseUrl);
  if (blocked) {
    return { pages: [], emailCandidates: [] }; // site kazınmasın istemiş - saygı gösteriyoruz
  }

  const pages: ScrapedPage[] = [];
  const emailCandidates: ContactEmailCandidate[] = [];
  const seenEmails = new Set<string>();

  const queuedPaths = [...CANDIDATE_PATHS];
  const visitedPaths = new Set<string>();

  for (let index = 0; index < queuedPaths.length; index += 1) {
    if (pages.length >= MAX_PAGES) break;

    const path = queuedPaths[index];
    if (visitedPaths.has(path)) continue;
    visitedPaths.add(path);

    const url = `${baseUrl}${path}`;
    const res = await fetchWithTimeout(url);
    if (!res || !res.ok) continue;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) continue;

    const html = await res.text();

    // E-posta çıkarımı sayfa uzunluğundan bağımsız - "hakkımızda" sayfası
    // 50 karakterin altında olsa bile içinde bir mailto linki olabilir.
    for (const email of extractEmailsFromHtml(html)) {
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        const domainMatch = emailMatchesCompanyDomain(email, domain);
        // Üçüncü taraf ajans, liste yazarı veya ücretsiz e-posta sağlayıcısının
        // adresi yanlış şirkete bağlanmasın. Gönderilebilir listeye yalnızca
        // doğrulanmış şirket domain'iyle eşleşen adresler girer.
        if (domainMatch) {
          emailCandidates.push({
            email,
            sourceUrl: url,
            sourcePath: path,
            domainMatch: true,
            verificationStatus: "domain_verified",
          });
        }
      }
    }

    // Sabit yol listesi bütün dillerde çalışmaz. Bulunan sayfalardaki ilgili
    // şirket içi linkleri keşfedip sınırlı kuyruğa ekliyoruz.
    const $ = cheerio.load(html);
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      const label = $(element).text();
      if (!href || !RELEVANT_LINK_PATTERN.test(`${href} ${label}`)) return;
      try {
        const resolved = new URL(href, baseUrl);
        if (registrableDomain(resolved.hostname) !== registrableDomain(domain)) return;
        const discoveredPath = `${resolved.pathname}${resolved.search}`;
        if (!visitedPaths.has(discoveredPath) && !queuedPaths.includes(discoveredPath)) {
          queuedPaths.push(discoveredPath);
        }
      } catch { /* bozuk link */ }
    });

    const textContent = extractCleanText(html);
    if (textContent.length < 50) continue; // anlamsız/boş sayfa, araştırma metnine ekleme

    pages.push({ url, path, textContent });
  }

  return { pages, emailCandidates: rankEmailCandidates(emailCandidates) };
}
