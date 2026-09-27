import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  scanRuns,
  searchQueries,
  searchResults,
  companyCandidates,
  companyEvaluations,
  aiUsageLogs,
  scanErrors,
  humanReviews,
} from "@/lib/db/schema";

/**
 * Tarama raporu - bkz. proje kökündeki 28 Eylül 2026 tarihli ölçüm sistemi
 * tasarımı, "Önerilen test raporu ekranı" bölümü.
 *
 * Bazı metrikler bugünkü veri toplama kapsamında TAM karşılığı olmadığı için
 * en yakın, dürüst bir yaklaşıklıkla hesaplanır - ilgili alanların yanına not
 * düşüldü. Precision/yanlış pozitif/yanlış negatif, human_reviews'ta hiç
 * kayıt yoksa null döner (henüz "gerçek referans etiketi" toplanmadı demektir).
 */

export interface ScanReport {
  scanId: string;
  startedAt: string;
  completedAt: string | null;
  totalDurationSeconds: number;

  hamSonucSayisi: number;
  benzersizDomainSayisi: number;
  onFiltredeElenenSayisi: number;
  elenenNedenler: { reason: string; count: number }[];

  arastirilanSirketSayisi: number;
  nitelikliLeadSayisi: number;
  olasiEslesmeSayisi: number;
  reddedilenSayisi: number;
  teknikHataSayisi: number;

  gercekHedefOnaySayisi: number;
  olasiHedefOnaySayisi: number;
  hedefDegilSayisi: number;
  rakipIsaretlenenSayisi: number;

  yanlisPozitif: number | null;
  yanlisNegatif: number | null;
  precision: number | null; // 0-100, null = henüz insan değerlendirmesi yok

  kanitliSonucOrani: number | null; // 0-100 - evidenceConfidence >= 40 olan değerlendirme oranı
  dizinEditoryalOrani: number | null; // 0-100 - ham sonuçlar içinde dizin/editoryal pay

  serperIstekSayisi: number;
  anthropicCagriSayisi: number;
  anthropicCagrilariAmaca: { purpose: string; count: number }[];
  toplamGirdiTokeni: number;
  toplamCiktiTokeni: number;
  toplamMaliyetUsd: number;

  hataSayisi: number;
}

export async function buildScanReport(scanId: string): Promise<ScanReport | null> {
  const [scanRun] = await db.select().from(scanRuns).where(eq(scanRuns.id, scanId));
  if (!scanRun) return null;

  // Rapor ilk kez istendiğinde tarama "bitmiş" sayılır - süre ölçümü burada sabitlenir.
  let completedAt = scanRun.completedAt;
  if (!completedAt) {
    completedAt = new Date();
    await db.update(scanRuns).set({ completedAt }).where(eq(scanRuns.id, scanId));
  }
  const totalDurationSeconds = Math.round(
    (completedAt.getTime() - scanRun.startedAt.getTime()) / 1000
  );

  const [{ count: hamSonucSayisi }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchResults)
    .where(eq(searchResults.scanId, scanId));

  const [{ count: benzersizDomainSayisi }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companyCandidates)
    .where(eq(companyCandidates.scanId, scanId));

  const [{ count: onFiltredeElenenSayisi }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchResults)
    .where(and(eq(searchResults.scanId, scanId), eq(searchResults.excluded, true)));

  const elenenNedenlerRaw = await db
    .select({
      reason: searchResults.exclusionReason,
      count: sql<number>`count(*)::int`,
    })
    .from(searchResults)
    .where(and(eq(searchResults.scanId, scanId), eq(searchResults.excluded, true)))
    .groupBy(searchResults.exclusionReason);
  const elenenNedenler = elenenNedenlerRaw.map((r) => ({
    reason: r.reason ?? "unknown",
    count: r.count,
  }));

  const dizinEditoryalCount = elenenNedenler
    .filter((r) => ["directory", "editorial_article", "listicle"].includes(r.reason))
    .reduce((sum, r) => sum + r.count, 0);
  const dizinEditoryalOrani = hamSonucSayisi > 0 ? (dizinEditoryalCount / hamSonucSayisi) * 100 : null;

  const evaluationRows = await db
    .select({
      decisionStatus: companyEvaluations.decisionStatus,
      evidenceConfidence: companyEvaluations.evidenceConfidence,
      count: sql<number>`count(*)::int`,
    })
    .from(companyEvaluations)
    .where(eq(companyEvaluations.scanId, scanId))
    .groupBy(companyEvaluations.decisionStatus, companyEvaluations.evidenceConfidence);

  const arastirilanSirketSayisi = evaluationRows.reduce((sum, r) => sum + r.count, 0);
  const byDecision = (status: string) =>
    evaluationRows.filter((r) => r.decisionStatus === status).reduce((sum, r) => sum + r.count, 0);
  const nitelikliLeadSayisi = byDecision("qualified");
  const olasiEslesmeSayisi = byDecision("possible_match");
  const reddedilenSayisi = byDecision("rejected") + byDecision("needs_research");
  const teknikHataSayisi = byDecision("technical_failure");

  const evidentEnoughCount = evaluationRows
    .filter((r) => r.evidenceConfidence >= 40)
    .reduce((sum, r) => sum + r.count, 0);
  const kanitliSonucOrani =
    arastirilanSirketSayisi > 0 ? (evidentEnoughCount / arastirilanSirketSayisi) * 100 : null;

  const reviewRows = await db
    .select({ reviewStatus: humanReviews.reviewStatus, count: sql<number>`count(*)::int` })
    .from(humanReviews)
    .where(eq(humanReviews.scanId, scanId))
    .groupBy(humanReviews.reviewStatus);
  const byReview = (status: string) =>
    reviewRows.find((r) => r.reviewStatus === status)?.count ?? 0;
  const gercekHedefOnaySayisi = byReview("gercek_hedef");
  const olasiHedefOnaySayisi = byReview("olasi_hedef");
  const hedefDegilSayisi = byReview("hedef_degil");
  const rakipIsaretlenenSayisi = byReview("dogrudan_rakip");
  const hasHumanReviews = reviewRows.length > 0;

  let yanlisPozitif: number | null = null;
  let yanlisNegatif: number | null = null;
  let precision: number | null = null;

  if (hasHumanReviews) {
    const crossTab = await db
      .select({
        decisionStatus: companyEvaluations.decisionStatus,
        reviewStatus: humanReviews.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(companyEvaluations)
      .innerJoin(
        humanReviews,
        and(
          eq(humanReviews.companyId, companyEvaluations.companyId),
          eq(humanReviews.scanId, companyEvaluations.scanId)
        )
      )
      .where(eq(companyEvaluations.scanId, scanId))
      .groupBy(companyEvaluations.decisionStatus, humanReviews.reviewStatus);

    const truePositive = crossTab
      .filter((r) => r.decisionStatus === "qualified" && r.reviewStatus === "gercek_hedef")
      .reduce((sum, r) => sum + r.count, 0);
    const falsePositive = crossTab
      .filter(
        (r) =>
          r.decisionStatus === "qualified" &&
          ["hedef_degil", "dogrudan_rakip"].includes(r.reviewStatus)
      )
      .reduce((sum, r) => sum + r.count, 0);
    const falseNegative = crossTab
      .filter(
        (r) =>
          ["rejected", "needs_research"].includes(r.decisionStatus) &&
          r.reviewStatus === "gercek_hedef"
      )
      .reduce((sum, r) => sum + r.count, 0);

    yanlisPozitif = falsePositive;
    yanlisNegatif = falseNegative;
    precision =
      truePositive + falsePositive > 0 ? (truePositive / (truePositive + falsePositive)) * 100 : null;
  }

  const [{ count: serperIstekSayisi }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchQueries)
    .where(eq(searchQueries.scanId, scanId));

  const usagePurposeRows = await db
    .select({
      purpose: aiUsageLogs.purpose,
      count: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
      totalCost: sql<number>`coalesce(sum(${aiUsageLogs.totalCostUsd}), 0)::float`,
    })
    .from(aiUsageLogs)
    .where(eq(aiUsageLogs.scanId, scanId))
    .groupBy(aiUsageLogs.purpose);

  const anthropicCagriSayisi = usagePurposeRows.reduce((sum, r) => sum + r.count, 0);
  const toplamGirdiTokeni = usagePurposeRows.reduce((sum, r) => sum + r.inputTokens, 0);
  const toplamCiktiTokeni = usagePurposeRows.reduce((sum, r) => sum + r.outputTokens, 0);
  const toplamMaliyetUsd = usagePurposeRows.reduce((sum, r) => sum + r.totalCost, 0);

  const [{ count: hataSayisi }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scanErrors)
    .where(eq(scanErrors.scanId, scanId));

  return {
    scanId,
    startedAt: scanRun.startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationSeconds,

    hamSonucSayisi,
    benzersizDomainSayisi,
    onFiltredeElenenSayisi,
    elenenNedenler,

    arastirilanSirketSayisi,
    nitelikliLeadSayisi,
    olasiEslesmeSayisi,
    reddedilenSayisi,
    teknikHataSayisi,

    gercekHedefOnaySayisi,
    olasiHedefOnaySayisi,
    hedefDegilSayisi,
    rakipIsaretlenenSayisi,

    yanlisPozitif,
    yanlisNegatif,
    precision,

    kanitliSonucOrani,
    dizinEditoryalOrani,

    serperIstekSayisi,
    anthropicCagriSayisi,
    anthropicCagrilariAmaca: usagePurposeRows.map((r) => ({ purpose: r.purpose, count: r.count })),
    toplamGirdiTokeni,
    toplamCiktiTokeni,
    toplamMaliyetUsd,

    hataSayisi,
  };
}
