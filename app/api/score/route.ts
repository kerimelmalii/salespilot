import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { scoreCompany } from "@/lib/salespilot/pipeline";
import type { CompanyResearch, ScanRequest, ExtraCriterion } from "@/lib/salespilot/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db/client";
import { companyEvaluations, companyCandidates } from "@/lib/db/schema";
import { SCORING_VERSION, recordAiUsage, recordScanError } from "@/lib/salespilot/measurement";

interface ScoreRequestBody {
  scanId: string;
  companyId: string;
  research: CompanyResearch;
  scanRequest: ScanRequest;
  extraCriteriaRubric: ExtraCriterion[];
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`score:${getClientIp(req)}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY tanımlı değil. .env.local dosyasını kontrol edin." },
      { status: 500 }
    );
  }

  let body: ScoreRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.scanId || !body.companyId || !body.research || !body.scanRequest) {
    return NextResponse.json(
      { error: "scanId, companyId, research ve scanRequest zorunlu." },
      { status: 400 }
    );
  }

  try {
    const { score, usage } = await scoreCompany(
      body.research,
      body.scanRequest,
      body.extraCriteriaRubric ?? []
    );

    await recordAiUsage({
      scanId: body.scanId,
      companyId: body.companyId,
      purpose: "company_scoring",
      modelName: usage.modelName,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      durationMs: usage.durationMs,
    });

    await db.insert(companyEvaluations).values({
      scanId: body.scanId,
      companyId: body.companyId,
      sectorScore: score.sectorFit.awardedPoints,
      regionScore: score.regionFit.awardedPoints,
      buyerNeedScore: score.productFit.awardedPoints,
      extraCriteriaScore: score.extraCriteria.reduce((sum, c) => sum + c.awardedPoints, 0),
      totalScore: score.totalScore,
      sectorMatchClass: score.sectorMatchClass,
      buyerStatus: score.buyerStatus,
      competitorStatus: score.competitorStatus,
      evidenceConfidence: score.evidenceConfidence,
      decisionStatus: score.decisionStatus,
      scoringVersion: SCORING_VERSION,
    });

    // Rol sınıflandırması aynı puanlama çağrısında üretiliyor (ayrı bir AI
    // çağrısı gerektirmesin diye) - sonucu company_candidates'e yazıyoruz.
    await db
      .update(companyCandidates)
      .set({
        commercialRole: score.commercialRole,
        roleReasoning: score.roleReasoning,
      })
      .where(eq(companyCandidates.id, body.companyId));

    return NextResponse.json({ score });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Puanlama başarısız: ${body.research.domain}`, err);
    await recordScanError({
      scanId: body.scanId,
      companyId: body.companyId,
      stage: "score",
      error: err,
      retryable: true,
      finalStatus: "failed",
    });
    await db.insert(companyEvaluations).values({
      scanId: body.scanId,
      companyId: body.companyId,
      sectorScore: 0,
      regionScore: 0,
      buyerNeedScore: 0,
      extraCriteriaScore: 0,
      totalScore: 0,
      sectorMatchClass: "unknown",
      buyerStatus: "unknown",
      competitorStatus: "uncertain",
      evidenceConfidence: 0,
      decisionStatus: "technical_failure",
      scoringVersion: SCORING_VERSION,
    });
    return NextResponse.json(
      { error: `Puanlama sırasında hata: ${message}` },
      { status: 500 }
    );
  }
}
