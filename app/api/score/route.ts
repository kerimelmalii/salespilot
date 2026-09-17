import { NextRequest, NextResponse } from "next/server";
import { scoreCompany } from "@/lib/salespilot/pipeline";
import type { CompanyResearch, ScanRequest, ExtraCriterion } from "@/lib/salespilot/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface ScoreRequestBody {
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

  if (!body.research || !body.scanRequest) {
    return NextResponse.json({ error: "research ve scanRequest zorunlu." }, { status: 400 });
  }

  try {
    const score = await scoreCompany(
      body.research,
      body.scanRequest,
      body.extraCriteriaRubric ?? []
    );
    return NextResponse.json({ score });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Puanlama başarısız: ${body.research.domain}`, err);
    return NextResponse.json(
      { error: `Puanlama sırasında hata: ${message}` },
      { status: 500 }
    );
  }
}
