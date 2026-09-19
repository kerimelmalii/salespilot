import type {
  CompanyResearch,
  CriterionScore,
  EntityType,
  ScanRequest,
  ScoreBreakdown,
} from "./types";

export type ModelScore = Pick<
  ScoreBreakdown,
  "isPlausibleLead" | "leadViabilityReason" | "sectorFit" | "regionFit" | "productFit" | "extraCriteria"
>;

const INVALID_ENTITY_TYPES: EntityType[] = [
  "directory", "marketplace", "publisher", "public_institution",
];

function normalizedTargetText(scanRequest: ScanRequest): string {
  return `${scanRequest.companyType ?? ""} ${scanRequest.extraCriteria ?? ""}`
    .toLocaleLowerCase("tr-TR");
}

export function targetRequiresEndUser(scanRequest: ScanRequest): boolean {
  const text = normalizedTargetText(scanRequest);
  const explicitlyExcludesSuppliers = /hedef değildir|hariç|dahil etme|ele/.test(text) &&
    /makine üretici|makina üretici|distribütör|bayi|danışman|tedarikçi/.test(text);
  const describesOperatingCompany =
    /son kullanıcı|aktif üretim tesisi|paketli ürün üreten|fabrika(?:sı)? bulunan/.test(text);
  return explicitlyExcludesSuppliers && describesOperatingCompany;
}

export function excludedBuyerRoles(scanRequest: ScanRequest): Set<CompanyResearch["buyerRole"]> {
  const text = normalizedTargetText(scanRequest);
  const hasExclusion = /hedef değildir|hariç|dahil etme|ele/.test(text);
  const excluded = new Set<CompanyResearch["buyerRole"]>();
  if (!hasExclusion) return excluded;
  if (targetRequiresEndUser(scanRequest)) {
    excluded.add("oem_manufacturer");
    excluded.add("system_integrator");
    excluded.add("distributor");
    excluded.add("service_provider");
    excluded.add("direct_competitor");
    return excluded;
  }
  if (/makine üretici|makina üretici|oem/.test(text)) {
    excluded.add("oem_manufacturer");
    excluded.add("direct_competitor");
  }
  if (/entegratör|sistem entegrat/.test(text)) excluded.add("system_integrator");
  if (/distribütör|bayi|tedarikçi/.test(text)) excluded.add("distributor");
  if (/danışman|hizmet şirket/.test(text)) excluded.add("service_provider");
  return excluded;
}

export function hardDisqualificationReason(
  research: CompanyResearch,
  scanRequest: ScanRequest
): string | null {
  if (INVALID_ENTITY_TYPES.includes(research.entityType) || research.officialWebsite === "no") {
    return "Doğrulanmış bir şirket/resmî şirket sitesi değil.";
  }
  if (
    research.buyerRole === "direct_competitor" &&
    research.relationshipSignals.sellsSameOffering === "yes"
  ) {
    return "Aynı nihai ürünü üreten doğrulanmış doğrudan rakip.";
  }
  if (
    targetRequiresEndUser(scanRequest) &&
    research.relationshipSignals.sellsSameOffering === "yes"
  ) {
    return "Hedef son kullanıcı olmasına rağmen şirket aynı makine/çözümü müşterilerine satan bir sağlayıcı.";
  }
  if (excludedBuyerRoles(scanRequest).has(research.buyerRole)) {
    return `Şirketin ticari rolü (${research.buyerRole}) kullanıcının açıkça hariç tuttuğu hedefler arasında.`;
  }
  return null;
}

export function createHardDisqualifiedScore(
  research: CompanyResearch,
  scanRequest: ScanRequest,
  extraCriteria: Array<{ criterion: string; maxPoints: number }>
): ScoreBreakdown | null {
  const reason = hardDisqualificationReason(research, scanRequest);
  if (!reason) return null;
  const emptyCriterion = (criterion: string, maxPoints: number): CriterionScore => ({
    criterion,
    maxPoints,
    awardedPoints: 0,
    confidence: research.identityConfidence === "high" ? "high" : "medium",
    reasoning: reason,
    evidenceRefs: research.relationshipSignals.evidenceRefs,
  });
  return {
    isPlausibleLead: false,
    leadViabilityReason: reason,
    sectorFit: emptyCriterion("Sektör uyumu", 30),
    regionFit: emptyCriterion("Bölge uyumu", 15),
    productFit: emptyCriterion("Ürün/Hizmet uyumu", 25),
    extraCriteria: extraCriteria.map((item) => emptyCriterion(item.criterion, item.maxPoints)),
    totalScore: 0,
    evidenceConfidence: calculateEvidenceConfidence(research),
    reviewStatus: "disqualified",
    qualified: false,
  };
}

function clampCriterion(score: CriterionScore, requiredMax?: number): CriterionScore {
  const maxPoints = requiredMax ?? Math.max(0, Number(score.maxPoints) || 0);
  const awardedPoints = Math.min(maxPoints, Math.max(0, Number(score.awardedPoints) || 0));
  return { ...score, maxPoints, awardedPoints };
}

export function calculateEvidenceConfidence(research: CompanyResearch): number {
  if (research.scrapeFailed) return 0;
  const verifiedFacts = research.facts.filter((fact) => fact.status === "verified").length;
  const identityPoints = research.identityConfidence === "high" ? 25 : research.identityConfidence === "medium" ? 15 : 5;
  return Math.min(
    100,
    identityPoints +
      Math.min(25, research.pagesVisited.length * 5) +
      Math.min(40, verifiedFacts * 8) +
      (research.contactEmails.some((email) => email.domainMatch) ? 10 : 0)
  );
}

export function finalizeLeadScore(
  modelScore: ModelScore,
  research: CompanyResearch,
  scanRequest: ScanRequest
): ScoreBreakdown {
  const parsed: ModelScore = {
    ...modelScore,
    // Çekirdek ağırlıkları modelin değiştirmesine izin vermeyiz.
    sectorFit: clampCriterion(modelScore.sectorFit, 30),
    regionFit: clampCriterion(modelScore.regionFit, 15),
    productFit: clampCriterion(modelScore.productFit, 25),
    extraCriteria: (modelScore.extraCriteria ?? []).map((score) => clampCriterion(score)),
  };

  const naturalBuyer =
    ["oem_manufacturer", "system_integrator", "end_user"].includes(research.buyerRole) &&
    research.relationshipSignals.usesOfferingInProductsOrOperations === "yes";
  const hardReason = hardDisqualificationReason(research, scanRequest);

  if (hardReason) {
    parsed.isPlausibleLead = false;
    parsed.leadViabilityReason = hardReason;
  } else if (naturalBuyer) {
    parsed.isPlausibleLead = true;
    parsed.leadViabilityReason =
      "Ürünü kendi makinesi, çözümü veya operasyonunda kullanan doğal bir kurumsal alıcı.";
  }

  if (!parsed.isPlausibleLead) {
    parsed.sectorFit.awardedPoints = Math.min(parsed.sectorFit.awardedPoints, 5);
    parsed.regionFit.awardedPoints = Math.min(parsed.regionFit.awardedPoints, 5);
    parsed.productFit.awardedPoints = Math.min(parsed.productFit.awardedPoints, 5);
    parsed.extraCriteria = parsed.extraCriteria.map((criterion) => ({ ...criterion, awardedPoints: 0 }));
  }

  const rawScore =
    parsed.sectorFit.awardedPoints +
    parsed.regionFit.awardedPoints +
    parsed.productFit.awardedPoints +
    parsed.extraCriteria.reduce((sum, criterion) => sum + criterion.awardedPoints, 0);
  const availablePoints =
    parsed.sectorFit.maxPoints +
    parsed.regionFit.maxPoints +
    parsed.productFit.maxPoints +
    parsed.extraCriteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  // Ek kriter yoksa çekirdek cetvel 70 puandır. Kullanılan cetvelin gerçek
  // maksimumunu 100'e normalize ederek varsayılan 75 eşiğini anlamlı tutarız.
  const totalScore = availablePoints > 0
    ? Math.round((rawScore / availablePoints) * 100)
    : 0;
  const evidenceConfidence = calculateEvidenceConfidence(research);
  const reviewStatus = !parsed.isPlausibleLead
    ? "disqualified"
    : evidenceConfidence < 45
      ? "needs_research"
      : totalScore >= scanRequest.scoreThreshold
        ? "qualified"
        : "unqualified";

  return {
    ...parsed,
    totalScore,
    evidenceConfidence,
    reviewStatus,
    qualified: reviewStatus === "qualified",
  };
}
