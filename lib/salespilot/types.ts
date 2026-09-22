/**
 * SalesPilot - Temel Veri Tipleri
 *
 * Bu dosya, "kelime eşleştirme" yerine "kanıta dayalı AI puanlama" adımına
 * geçiş için gereken veri şemasını tanımlar. Mevcut Next.js prototipinizdeki
 * /api/search endpoint'inin ürettiği ham sonuçları bu şemaya dönüştürerek
 * kullanabilirsiniz.
 *
 * Tasarım prensipleri (konuştuklarımızdan):
 * 1. Her puanın bir "kanıt"a (evidence) bağlı olması zorunlu.
 * 2. Kanıt bulunamayan bilgi "doğrulanamadı" olarak işaretlenir, asla uydurulmaz.
 * 3. Her lead için İYS ret/opt-out durumu baştan takip edilir.
 * 4. WhatsApp numarası saklanır ama otomatik gönderim için KULLANILMAZ
 *    (bkz. README.md - manuel wa.me akışı notu).
 */

// ---- Doğrulama durumu ----

export type VerificationStatus = "verified" | "unverified" | "not_found";

export type EntityType =
  | "company"
  | "directory"
  | "marketplace"
  | "publisher"
  | "public_institution"
  | "unknown";

export type BuyerRole =
  | "oem_manufacturer"
  | "system_integrator"
  | "end_user"
  | "distributor"
  | "service_provider"
  | "direct_competitor"
  | "unknown";

export type TernarySignal = "yes" | "no" | "unknown";

/** Araştırma sırasında bulunan tek bir bilgi parçası ve kaynağı. */
export interface EvidenceItem {
  id: string; // örn. "ev_1" - puanlamada referans vermek için
  claim: string; // örn. "İhracat yapıyor"
  status: VerificationStatus;
  sourceSnippet?: string; // kaynaktan kısa, kendi cümlelerimizle özet (asla birebir kopya değil)
  sourceUrl?: string;
  sourcePage?: string; // örn. "/hakkimizda", "/ihracat"
}

/**
 * Şirket sitesinden gerçekten bulunan (uydurulmamış) bir e-posta adresi.
 * Bu, AI tarafından değil, doğrudan sayfa içeriğinden regex/DOM ile
 * çıkarılır - "e-posta uydurmayacağız" prensibi burada koda gömülü.
 */
export interface ContactEmailCandidate {
  email: string;
  sourceUrl: string;
  sourcePath: string;
  domainMatch: boolean;
  verificationStatus: "domain_verified" | "rejected";
  rejectionReason?: string;
}

/** Bir şirket hakkında toplanan tüm ham araştırma verisi. */
export interface CompanyResearch {
  companyName: string;
  domain: string;
  officialWebsite: TernarySignal;
  entityType: EntityType;
  buyerRole: BuyerRole;
  identityConfidence: "high" | "medium" | "low";
  relationshipSignals: {
    sellsSameOffering: TernarySignal;
    usesOfferingInProductsOrOperations: TernarySignal;
    relationshipReason: string;
    evidenceRefs: string[];
  };
  summary: string; // 2-3 cümlelik nötr özet, spekülasyon içermez
  facts: EvidenceItem[];
  contactEmails: ContactEmailCandidate[]; // boş olabilir - o zaman bulunamadı demektir
  collectedAt: string; // ISO timestamp - veri ne zaman toplandı
  pagesVisited: string[];
  scrapeFailed?: boolean; // site erişilemediyse true - sistem çökmemeli
}

// ---- Puanlama ----

export interface CriterionScore {
  criterion: string; // örn. "Üretim tesisi var"
  maxPoints: number;
  awardedPoints: number;
  confidence: "high" | "medium" | "low"; // kanıt kalitesine göre
  reasoning: string; // neden bu puan verildi (kısa, kanıta atıfla)
  evidenceRefs: string[]; // CompanyResearch.facts[].id referansları
}

/**
 * Kullanıcının serbest metin "ek kriterler" alanının, bir tarama için TEK
 * SEFERLİK ayrıştırılmış hali. Tüm şirketler bu SABİT cetvelle puanlanır -
 * her şirket için ayrı ayrı yeniden yorumlanmaz. Bu, puanların şirketler
 * arasında karşılaştırılabilir kalması için zorunlu.
 */
export interface ExtraCriterion {
  criterion: string;
  maxPoints: number;
}

export interface ScoreBreakdown {
  // 17 Eylül 2026'da gerçek bir testte (SaaS/hizmet satışı) gözlemlendi:
  // model bazen bir rakip/tedarikçi şirketi ("bu ürünü satan, alan değil"
  // diye kendi gerekçesinde yazdığı halde) yüksek puanla değerlendiriyordu.
  // Bu alan, o kontrolü ayrı ve zorunlu bir adım haline getirir.
  isPlausibleLead: boolean;
  leadViabilityReason: string;
  sectorFit: CriterionScore;
  regionFit: CriterionScore;
  productFit: CriterionScore;
  extraCriteria: CriterionScore[]; // toplam max 30 - kullanıcının serbest metninden ayrıştırılır
  totalScore: number; // 0-100
  /** Araştırmanın bu skoru destekleme gücü; uygunluk puanından ayrıdır. */
  evidenceConfidence: number; // 0-100
  reviewStatus: "qualified" | "unqualified" | "needs_research" | "disqualified";
  qualified: boolean; // eşik + yeterli kanıt + geçerli şirket şartlarının tümü
}

// ---- Arama / aday keşfi ----

export interface CompanyCandidate {
  domain: string;
  title: string;
  snippet: string;
  url: string;
  foundVia: string[];
  discoveryConfidence: "high" | "medium";
  discoveryReason: string;
}

// ---- AI hedef müşteri profili ----

export interface TargetCustomerProfile {
  id: string;
  name: string;
  targetSector: string;
  companyType: string;
  targetRegion: string;
  likelyNeed: string;
  fitReason: string;
  buyingSignals: string[];
  exclusionRules: string[];
  extraCriteria: string;
}

export interface SellerCompanyAnalysis {
  companySummary: string;
  productOrService: string;
  valueProposition: string;
  profiles: TargetCustomerProfile[];
}

export interface SellerProfileRequest {
  userCompanyName: string;
  userWebsite: string;
  productOrService: string;
  targetRegion: string;
  desiredMarket?: string;
}

// ---- İYS / rıza takibi ----

export type ConsentStatus =
  | "not_contacted"
  | "contacted"
  | "opted_out" // ret hakkını kullandı - bir daha ASLA iletişim kurulmaz
  | "replied";

// ---- Lead ----

export interface Lead {
  id: string;
  scanId: string;
  research: CompanyResearch;
  score: ScoreBreakdown;
  contactEmail?: string;
  contactEmailSource?: string; // hangi sayfadan bulundu
  whatsappNumber?: string; // bulunduysa saklanır, otomatik KULLANILMAZ
  consentStatus: ConsentStatus;
  optedOutAt?: string;
  lastContactedAt?: string;
}

// ---- E-posta taslağı ----

export interface EmailDraft {
  leadId: string;
  subject: string;
  body: string; // ret/opt-out satırı zorunlu olarak içerir
  basedOnFacts: string[]; // sadece status:"verified" olan EvidenceItem id'leri
  createdAt: string;
  approvedAt?: string; // kullanıcı onayladığında dolar
  sentAt?: string;
}

// ---- Tarama isteği (kullanıcının "Yeni Tarama" formundan) ----

export interface ScanRequest {
  userCompanyName: string;
  userWebsite: string;
  productOrService: string;
  targetSector: string;
  targetRegion: string;
  companyType?: string; // üretici, distribütör, bayi vb.
  companySize?: string;
  extraCriteria: string; // serbest metin - AI bunu alt kriterlere bölecek
  scoreThreshold: number; // varsayılan 75
}
