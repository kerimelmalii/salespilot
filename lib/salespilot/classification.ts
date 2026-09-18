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

  const invalidEntity = INVALID_ENTITY_TYPES.includes(research.entityType) || research.officialWebsite === "no";
  const directCompetitor =
    research.buyerRole === "direct_competitor" &&
    research.relationshipSignals.sellsSameOffering === "yes";
  const naturalBuyer =
    ["oem_manufacturer", "system_integrator", "end_user"].includes(research.buyerRole) &&
    research.relationshipSignals.usesOfferingInProductsOrOperations === "yes";

  if (invalidEntity) {
    parsed.isPlausibleLead = false;
    parsed.leadViabilityReason = "Doğrulanmış bir şirket/resmî şirket sitesi değil.";
  } else if (directCompetitor) {
    parsed.isPlausibleLead = false;
    parsed.leadViabilityReason = "Aynı nihai ürünü üreten doğrulanmış doğrudan rakip.";
  } else if (naturalBuyer) {
    parsed.isPlausibleLead = true;
    parsed.leadViabilityReason =
      "Ürünü kendi makinesi, çözümü veya operasyonunda kullanan doğal bir kurumsal alıcı.";
  }

  if (!parsed.isPlausibleLead) {
    parsed.sectorFit.awardedPoints = Math.min(parsed.sectorFit.awardedPoints, 5);
    parsed.productFit.awardedPoints = Math.min(parsed.productFit.awardedPoints, 5);
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
