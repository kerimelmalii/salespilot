import { NextRequest, NextResponse } from "next/server";
import { parseExtraCriteria } from "@/lib/salespilot/pipeline";
import type { ScanRequest } from "@/lib/salespilot/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { recordAiUsage, recordScanError } from "@/lib/salespilot/measurement";

interface CriteriaRequestBody extends ScanRequest {
  scanId: string;
}

/**
 * Bu endpoint tarama başına SADECE BİR KEZ çağrılmalı (arama sonuçları
 * geldikten hemen sonra). Dönen rubric'i saklayıp her /api/score isteğine
 * AYNEN göndermelisiniz - aksi halde her şirket farklı bir kriter
 * cetveliyle puanlanır ve sonuçlar karşılaştırılamaz hale gelir.
 */
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`criteria:${getClientIp(req)}`, 20, 60_000);
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

  let body: CriteriaRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.scanId) {
    return NextResponse.json({ error: "scanId zorunlu." }, { status: 400 });
  }

  try {
    const { rubric, usage } = await parseExtraCriteria(body);
    if (usage) {
      await recordAiUsage({
        scanId: body.scanId,
        purpose: "criteria_generation",
        modelName: usage.modelName,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens,
        durationMs: usage.durationMs,
      });
    }
    return NextResponse.json({ rubric });
  } catch (err) {
    console.error("Kriter ayrıştırma başarısız", err);
    await recordScanError({
      scanId: body.scanId,
      stage: "criteria",
      error: err,
      retryable: true,
      finalStatus: "failed",
    });
    return NextResponse.json(
      { error: "Kriterler ayrıştırılırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
