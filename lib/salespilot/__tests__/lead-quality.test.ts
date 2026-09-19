import { describe, expect, it } from "vitest";
import {
  assessBuyerDiscoveryResult,
  assessOrganicResult,
  buildSearchQueries,
  resolveSearchLocale,
  validateSearchInputs,
} from "../discovery";
import { emailMatchesCompanyDomain } from "../scraping";
import { finalizeLeadScore, type ModelScore } from "../classification";
import type { CompanyResearch, CriterionScore, ScanRequest } from "../types";

const criterion = (criterionName: string, maxPoints: number, awardedPoints: number): CriterionScore => ({
  criterion: criterionName,
  maxPoints,
  awardedPoints,
  confidence: "high",
  reasoning: "Test kanıtı",
  evidenceRefs: ["ev_1"],
});

const scanRequest: ScanRequest = {
  userCompanyName: "Satıcı AŞ",
  userWebsite: "https://seller.example",
  productOrService: "lineer kızak ve hassas hareket sistemleri",
  targetSector: "CNC makine üreticileri",
  targetRegion: "Almanya",
  extraCriteria: "makine tasarımı ve imalatı yapıyor",
  scoreThreshold: 75,
};

const baseResearch: CompanyResearch = {
  companyName: "FOURMAK",
  domain: "fourmak.com.tr",
  officialWebsite: "yes",
  entityType: "company",
  buyerRole: "oem_manufacturer",
  identityConfidence: "high",
  relationshipSignals: {
    sellsSameOffering: "no",
    usesOfferingInProductsOrOperations: "yes",
    relationshipReason: "CNC router üretiminde lineer hareket bileşenlerini kullanır.",
    evidenceRefs: ["ev_1"],
  },
  summary: "CNC router üreten bir OEM.",
  facts: [{ id: "ev_1", claim: "CNC router üretir", status: "verified", sourceUrl: "https://fourmak.com.tr", sourcePage: "/" }],
  contactEmails: [{ email: "info@fourmak.com.tr", sourceUrl: "https://fourmak.com.tr/contact", sourcePath: "/contact", domainMatch: true, verificationStatus: "domain_verified" }],
  collectedAt: new Date(0).toISOString(),
  pagesVisited: ["/", "/about", "/products", "/contact"],
};

const modelScore: ModelScore = {
  // Eski prompttaki hatayı taklit ediyor: model OEM'i yanlışlıkla rakip saydı.
  isPlausibleLead: false,
  leadViabilityReason: "Makine üreticisi olduğu için rakip.",
  sectorFit: criterion("Sektör uyumu", 30, 28),
  regionFit: criterion("Bölge uyumu", 15, 15),
  productFit: criterion("Ürün uyumu", 25, 23),
  extraCriteria: [criterion("Makine tasarımı ve imalatı", 30, 27)],
};

describe("aday keşfi", () => {
  it("Almanya için aramayı de/de yereline taşır", () => {
    expect(resolveSearchLocale("Almanya")).toMatchObject({ gl: "de", hl: "de", nativeRegion: "Deutschland" });
    const queries = buildSearchQueries(scanRequest);
    expect(queries.length).toBeGreaterThanOrEqual(12);
    expect(queries.some((query) => query.includes("Hersteller"))).toBe(true);
    expect(queries.some((query) => query.includes("site:.de"))).toBe(true);
  });

  it("Europages gibi dizinleri ve tekil liste yazılarını lead olarak kabul etmez", () => {
    expect(assessOrganicResult({ title: "Makine Üretimi Almanya", url: "https://europages.com.tr/x", domain: "europages.com.tr", occurrenceCount: 3 }).accepted).toBe(false);
    expect(assessOrganicResult({ title: "Almanya'daki En İyi 15 CNC Üreticisi", url: "https://example.com/blog/top-cnc", domain: "example.com", occurrenceCount: 1 }).accepted).toBe(false);
  });

  it("sektör alanına bölge yazıldığında aramayı başlamadan durdurur", () => {
    expect(validateSearchInputs({ ...scanRequest, targetSector: "Türkiye", targetRegion: "Türkiye" }))
      .toContain("aynı olamaz");
    expect(validateSearchInputs({ ...scanRequest, targetSector: "Almanya", targetRegion: "Berlin" }))
      .toContain("ülke/bölge");
  });

  it("son kullanıcı hedefinde makine satıcısı sayfalarını ön filtrede eler", () => {
    const endBuyerSearch = {
      ...scanRequest,
      targetSector: "Gıda ve içecek üretimi",
      targetRegion: "Türkiye",
      productOrService: "Otomatik paketleme ve dolum makineleri",
      companyType: "Paketli gıda üreticileri. Makine üreticileri, distribütörler ve danışmanlar hedef değildir.",
    };
    const result = assessBuyerDiscoveryResult({
      title: "Paketleme Makinesi Üreticisi",
      snippet: "Gıda firmalarına otomasyon çözümleri sunar.",
      url: "https://packplus.com.tr/",
      domain: "packplus.com.tr",
      occurrenceCount: 3,
      searchInputs: endBuyerSearch,
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("satıcısı");
  });

  it("ürün adını keşif sorgularına koyup satıcıları çağırmaz", () => {
    const queries = buildSearchQueries({
      ...scanRequest,
      productOrService: "Otomatik paketleme ve dolum makineleri",
    });
    expect(queries.some((query) => query.includes("Otomatik paketleme ve dolum makineleri"))).toBe(false);
  });
});

describe("ticari rol ve güven", () => {
  it("ürünü makinesinde kullanan OEM'i model hatasına rağmen doğal alıcı sayar", () => {
    const result = finalizeLeadScore(modelScore, baseResearch, scanRequest);
    expect(result.isPlausibleLead).toBe(true);
    expect(result.reviewStatus).toBe("qualified");
    expect(result.totalScore).toBe(93);
    expect(result.leadViabilityReason).toContain("doğal");
  });

  it("veri bulunmamasını uygunsuzlukla karıştırmaz", () => {
    const sparse: CompanyResearch = {
      ...baseResearch,
      officialWebsite: "unknown",
      entityType: "unknown",
      identityConfidence: "low",
      relationshipSignals: { sellsSameOffering: "unknown", usesOfferingInProductsOrOperations: "unknown", relationshipReason: "Bilinmiyor", evidenceRefs: [] },
      facts: [],
      contactEmails: [],
      pagesVisited: ["/"],
    };
    const result = finalizeLeadScore({ ...modelScore, isPlausibleLead: true }, sparse, scanRequest);
    expect(result.reviewStatus).toBe("needs_research");
    expect(result.isPlausibleLead).toBe(true);
  });

  it("ek kriter yokken çekirdek puanı 100 üzerinden normalize eder", () => {
    const noExtras = { ...scanRequest, extraCriteria: "" };
    const strongCoreScore: ModelScore = {
      ...modelScore,
      isPlausibleLead: true,
      sectorFit: criterion("Sektör uyumu", 30, 27),
      regionFit: criterion("Bölge uyumu", 15, 15),
      productFit: criterion("Ürün uyumu", 25, 23),
      extraCriteria: [],
    };
    const result = finalizeLeadScore(strongCoreScore, baseResearch, noExtras);
    expect(result.totalScore).toBe(93);
    expect(result.reviewStatus).toBe("qualified");
  });

  it("model çekirdek kriter ağırlıklarını değiştiremez", () => {
    const manipulated: ModelScore = {
      ...modelScore,
      sectorFit: criterion("Sektör uyumu", 999, 999),
      regionFit: criterion("Bölge uyumu", 999, 999),
      productFit: criterion("Ürün uyumu", 999, 999),
    };
    const result = finalizeLeadScore(manipulated, baseResearch, scanRequest);
    expect(result.sectorFit.maxPoints).toBe(30);
    expect(result.regionFit.maxPoints).toBe(15);
    expect(result.productFit.maxPoints).toBe(25);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("yayın ve dizinleri puanları yüksek olsa bile diskalifiye eder", () => {
    const publisher: CompanyResearch = { ...baseResearch, entityType: "publisher", buyerRole: "unknown" };
    const result = finalizeLeadScore({ ...modelScore, isPlausibleLead: true }, publisher, scanRequest);
    expect(result.reviewStatus).toBe("disqualified");
    expect(result.sectorFit.awardedPoints).toBeLessThanOrEqual(5);
    expect(result.productFit.awardedPoints).toBeLessThanOrEqual(5);
  });

  it("son kullanıcı hedefinde sistem entegratörünü model yüksek puanlasa bile diskalifiye eder", () => {
    const endBuyerRequest: ScanRequest = {
      ...scanRequest,
      targetSector: "Gıda ve içecek üretimi",
      targetRegion: "Türkiye",
      companyType: "Türkiye’de aktif üretim tesisi bulunan paketli gıda üreticileri. Makine üreticileri, distribütörler ve danışmanlar hedef değildir.",
    };
    const integrator: CompanyResearch = {
      ...baseResearch,
      companyName: "ATC Process",
      buyerRole: "system_integrator",
      relationshipSignals: {
        sellsSameOffering: "no",
        usesOfferingInProductsOrOperations: "yes",
        relationshipReason: "Gıda fabrikaları kurar ve makineleri projelerine entegre eder.",
        evidenceRefs: ["ev_1"],
      },
    };
    const result = finalizeLeadScore({ ...modelScore, isPlausibleLead: true }, integrator, endBuyerRequest);
    expect(result.reviewStatus).toBe("disqualified");
    expect(result.qualified).toBe(false);
    expect(result.totalScore).toBeLessThan(30);
  });

  it("aynı ürünü satan entegratörü son kullanıcı hedefinde kesin rakip olarak eler", () => {
    const request: ScanRequest = {
      ...scanRequest,
      targetSector: "Gıda ve içecek üretimi",
      targetRegion: "Türkiye",
      companyType: "Aktif üretim tesisi bulunan paketli ürün üreticileri. Makine üreticileri, distribütörler ve danışmanlar hedef değildir.",
    };
    const atcLike: CompanyResearch = {
      ...baseResearch,
      buyerRole: "system_integrator",
      relationshipSignals: {
        sellsSameOffering: "yes",
        usesOfferingInProductsOrOperations: "yes",
        relationshipReason: "Dolum ve paketleme makinelerini kendi anahtar teslim projelerinde satar.",
        evidenceRefs: ["ev_1"],
      },
    };
    const result = finalizeLeadScore({ ...modelScore, isPlausibleLead: true }, atcLike, request);
    expect(result.reviewStatus).toBe("disqualified");
    expect(result.isPlausibleLead).toBe(false);
  });
});

describe("kurumsal e-posta doğrulaması", () => {
  it("yalnızca şirketin kayıtlı alan adıyla eşleşen e-postayı kabul eder", () => {
    expect(emailMatchesCompanyDomain("sales@fourmak.com.tr", "www.fourmak.com.tr")).toBe(true);
    expect(emailMatchesCompanyDomain("writer@naitetech.com", "german-oem.de")).toBe(false);
    expect(emailMatchesCompanyDomain("company@gmail.com", "company.de")).toBe(false);
  });
});
