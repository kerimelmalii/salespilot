import * as cheerio from "cheerio";
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
const MAX_PAGES = 6;

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
];

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
  const baseUrl = `https://${domain}`;

  const blocked = await isFullyDisallowed(baseUrl);
  if (blocked) {
    return { pages: [], emailCandidates: [] }; // site kazınmasın istemiş - saygı gösteriyoruz
  }

  const pages: ScrapedPage[] = [];
  const emailCandidates: ContactEmailCandidate[] = [];
  const seenEmails = new Set<string>();

  for (const path of CANDIDATE_PATHS) {
    if (pages.length >= MAX_PAGES) break;

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
        emailCandidates.push({ email, sourceUrl: url, sourcePath: path });
      }
    }

    const textContent = extractCleanText(html);
    if (textContent.length < 50) continue; // anlamsız/boş sayfa, araştırma metnine ekleme

    pages.push({ url, path, textContent });
  }

  return { pages, emailCandidates: rankEmailCandidates(emailCandidates) };
}
