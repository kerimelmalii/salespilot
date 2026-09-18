import type { CompanyCandidate } from "./types";

export interface SearchInputs {
  targetSector: string;
  targetRegion: string;
  productOrService: string;
  extraCriteria?: string;
  companyType?: string;
}

export interface LocaleProfile {
  aliases: string[];
  gl: string;
  hl: string;
  nativeRegion: string;
  companyTerms: string[];
  manufacturerTerms: string[];
  siteSuffix?: string;
}

const LOCALES: LocaleProfile[] = [
  { aliases: ["almanya", "germany", "deutschland"], gl: "de", hl: "de", nativeRegion: "Deutschland", companyTerms: ["Unternehmen", "Firma"], manufacturerTerms: ["Hersteller", "Maschinenbau"], siteSuffix: ".de" },
  { aliases: ["türkiye", "turkiye", "turkey"], gl: "tr", hl: "tr", nativeRegion: "Türkiye", companyTerms: ["şirket", "firma"], manufacturerTerms: ["üretici", "imalatçı"], siteSuffix: ".tr" },
  { aliases: ["fransa", "france"], gl: "fr", hl: "fr", nativeRegion: "France", companyTerms: ["entreprise", "société"], manufacturerTerms: ["fabricant", "industrie"], siteSuffix: ".fr" },
  { aliases: ["italya", "italy", "italia"], gl: "it", hl: "it", nativeRegion: "Italia", companyTerms: ["azienda", "impresa"], manufacturerTerms: ["produttore", "industria"], siteSuffix: ".it" },
  { aliases: ["ispanya", "spain", "españa"], gl: "es", hl: "es", nativeRegion: "España", companyTerms: ["empresa", "compañía"], manufacturerTerms: ["fabricante", "industria"], siteSuffix: ".es" },
  { aliases: ["ingiltere", "birleşik krallık", "united kingdom", "uk"], gl: "uk", hl: "en", nativeRegion: "United Kingdom", companyTerms: ["company", "business"], manufacturerTerms: ["manufacturer", "engineering"], siteSuffix: ".uk" },
  { aliases: ["amerika", "abd", "usa", "united states"], gl: "us", hl: "en", nativeRegion: "United States", companyTerms: ["company", "business"], manufacturerTerms: ["manufacturer", "industrial"] },
  { aliases: ["hollanda", "netherlands", "nederland"], gl: "nl", hl: "nl", nativeRegion: "Nederland", companyTerms: ["bedrijf", "onderneming"], manufacturerTerms: ["fabrikant", "industrie"], siteSuffix: ".nl" },
];

const DIRECTORY_DOMAINS = [
  "google.com", "bing.com", "duckduckgo.com", "yandex.com", "yandex.com.tr",
  "linkedin.com", "instagram.com", "facebook.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "pinterest.com", "xing.com", "crunchbase.com",
  "europages.com", "europages.com.tr", "wlw.de", "kompass.com", "tr.kompass.com",
  "infobel.com", "werliefertwas.de", "directindustry.com", "industrynet.com",
  "sahibinden.com", "capterra.com", "capterra.web.tr", "made-in-china.com",
  "alibaba.com", "amazon.com", "ebay.com", "yellowpages.com", "glassdoor.com",
  "indeed.com", "wikipedia.org",
];

const EDITORIAL_TITLE_PATTERNS = [
  /\b(en iyi|en büyük|top|best|liste|listesi|rehberi|guide)\b/i,
  /\b\d{1,3}\s+(üretici|şirket|firma|manufacturer|companies|firmen)\b/i,
  /\b(manufacturers? in|companies in|hersteller in)\b/i,
];

const EDITORIAL_PATH_PATTERNS = [
  /\/(blog|news|haber|magazin|article|articles|post|posts|liste|list|guide)(\/|$)/i,
  /\/(tag|author|search|category|kategori)(\/|$)/i,
];

export function normalizeDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function resolveSearchLocale(targetRegion: string): LocaleProfile {
  const normalized = targetRegion.trim().toLocaleLowerCase("tr-TR");
  const germanCities = ["berlin", "hamburg", "münih", "munich", "münchen", "frankfurt", "köln", "cologne", "stuttgart", "düsseldorf", "dusseldorf", "dortmund", "leipzig", "bremen", "hannover", "nürnberg", "nuremberg"];
  if (germanCities.some((city) => normalized.includes(city))) return LOCALES[0];
  return (
    LOCALES.find((profile) => profile.aliases.some((alias) => normalized.includes(alias))) ??
    { gl: "tr", hl: "tr", nativeRegion: targetRegion.trim(), companyTerms: ["şirket", "firma"], manufacturerTerms: ["üretici", "imalatçı"] , aliases: []}
  );
}

export function buildSearchQueries(input: SearchInputs): string[] {
  const locale = resolveSearchLocale(input.targetRegion);
  const sector = input.targetSector.trim();
  const region = locale.nativeRegion;
  const [companyTerm, secondCompanyTerm] = locale.companyTerms;
  const [manufacturerTerm, secondManufacturerTerm] = locale.manufacturerTerms;
  const negative = "-inurl:blog -inurl:news -inurl:magazin -inurl:category -inurl:liste";
  const site = locale.siteSuffix ? `site:${locale.siteSuffix}` : "";

  const queries = [
    `\"${sector}\" ${manufacturerTerm} ${region} ${negative}`,
    `\"${sector}\" ${companyTerm} ${region} ${negative}`,
    `${sector} ${secondManufacturerTerm} ${region} ${negative}`,
    `${sector} ${secondCompanyTerm} ${region} Kontakt Impressum ${negative}`,
    `${sector} ${manufacturerTerm} ${region} ${site} ${negative}`,
    `${sector} B2B ${region} ${site} ${negative}`,
  ];

  if (input.companyType?.trim()) {
    queries.push(`${sector} ${input.companyType.trim()} ${region} ${site} ${negative}`);
  }

  // Ürün sorgusu tek başına satıcıları getirir. Bu yüzden yalnızca hedef sektörle
  // birlikte ve "uygulama/kullanım" bağlamında bir keşif sorgusu olarak kullanılır.
  if (input.productOrService.trim()) {
    queries.push(`\"${input.productOrService.trim()}\" ${sector} Anwendung ${region} ${negative}`);
  }

  return Array.from(new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()))).slice(0, 8);
}

export function isBlockedDiscoveryDomain(domain: string): boolean {
  return DIRECTORY_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

export function assessOrganicResult(input: {
  title: string;
  url: string;
  domain: string;
  occurrenceCount: number;
}): { accepted: boolean; confidence: CompanyCandidate["discoveryConfidence"]; reason: string } {
  if (isBlockedDiscoveryDomain(input.domain)) {
    return { accepted: false, confidence: "medium", reason: "Dizin, sosyal ağ veya pazar yeri alan adı" };
  }
  if (/\.(gov|edu)(\.|$)/i.test(input.domain) || /\.(gov\.tr|bel\.tr|edu\.tr)$/i.test(input.domain)) {
    return { accepted: false, confidence: "medium", reason: "Kamu veya eğitim kurumu alan adı" };
  }

  let pathname = "/";
  try { pathname = new URL(input.url).pathname; } catch { /* üst katman URL'yi zaten doğrular */ }
  const editorial = EDITORIAL_TITLE_PATTERNS.some((pattern) => pattern.test(input.title)) ||
    EDITORIAL_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
  if (editorial && input.occurrenceCount < 2) {
    return { accepted: false, confidence: "medium", reason: "Tekil blog/liste/yayın sonucu" };
  }

  const officialPath = pathname === "/" || /^\/(about|about-us|company|unternehmen|firma|kontakt|contact|impressum)\/?$/i.test(pathname);
  const high = officialPath || input.occurrenceCount >= 2;
  return {
    accepted: true,
    confidence: high ? "high" : "medium",
    reason: high ? "Resmî site yolu veya birden fazla sorguda eşleşme" : "Şirket olabilecek bağımsız alan adı; araştırmada doğrulanacak",
  };
}

export function displayNameFromResult(title: string, domain: string): string {
  const cleaned = title.split(/\s+[|–—-]\s+/)[0]?.trim();
  if (cleaned && cleaned.length >= 2 && !EDITORIAL_TITLE_PATTERNS.some((p) => p.test(cleaned))) {
    return cleaned.slice(0, 120);
  }
  const brand = domain.split(".")[0].replace(/[-_]+/g, " ");
  return brand.replace(/\b\w/g, (char) => char.toUpperCase());
}
