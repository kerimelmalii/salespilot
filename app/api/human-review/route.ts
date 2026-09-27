import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db/client";
import { humanReviews } from "@/lib/db/schema";

/**
 * Kullanıcının bir şirket hakkındaki GERÇEK değerlendirmesi ("ground truth").
 * Sistemin tahminiyle (company_evaluations.decisionStatus) karşılaştırılarak
 * precision/yanlış pozitif/yanlış negatif gibi kalite metrikleri hesaplanır.
 * Şirket başına tek bir güncel karar tutulur - kullanıcı fikrini değiştirirse
 * mevcut satır güncellenir (bkz. lib/db/schema.ts human_reviews_scan_company_idx).
 */

const VALID_STATUSES = [
  "gercek_hedef",
  "olasi_hedef",
  "hedef_degil",
  "dogrudan_rakip",
  "incelenmesi_gerekiyor",
] as const;

interface HumanReviewRequestBody {
  scanId: string;
  companyId: string;
  reviewStatus: (typeof VALID_STATUSES)[number];
  reasoningText?: string;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`human-review:${getClientIp(req)}`, 120, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body: HumanReviewRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.scanId || !body.companyId || !VALID_STATUSES.includes(body.reviewStatus)) {
    return NextResponse.json(
      { error: "scanId, companyId ve geçerli bir reviewStatus zorunlu." },
      { status: 400 }
    );
  }

  await db
    .insert(humanReviews)
    .values({
      scanId: body.scanId,
      companyId: body.companyId,
      reviewStatus: body.reviewStatus,
      reasoningText: body.reasoningText ?? null,
    })
    .onConflictDoUpdate({
      target: [humanReviews.scanId, humanReviews.companyId],
      set: {
        reviewStatus: body.reviewStatus,
        reasoningText: body.reasoningText ?? null,
        reviewedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
