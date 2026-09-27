import { NextRequest, NextResponse } from "next/server";
import { draftEmail } from "@/lib/salespilot/pipeline";
import type { CompanyResearch, ScanRequest } from "@/lib/salespilot/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { recordAiUsage, recordScanError } from "@/lib/salespilot/measurement";

interface DraftEmailRequestBody {
  scanId: string;
  companyId: string;
  research: CompanyResearch;
  scanRequest: ScanRequest;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`draft-email:${getClientIp(req)}`, 30, 60_000);
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

  let body: DraftEmailRequestBody;
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
    // Gönderen adı olarak kullanıcının kendi tarama formunda girdiği şirket
    // adını kullanıyoruz - ayrıca bir "ürün kataloğu" alanına gerek yok,
    // scanRequest.productOrService zaten bu amaçla kullanılıyor (sade tutmak
    // için MVP1'de ayrı bir alan eklemedik).
    const { draft, usage } = await draftEmail(
      body.research,
      body.scanRequest,
      body.scanRequest.userCompanyName
    );

    await recordAiUsage({
      scanId: body.scanId,
      companyId: body.companyId,
      purpose: "email_drafting",
      modelName: usage.modelName,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      durationMs: usage.durationMs,
    });

    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Mail taslağı oluşturma başarısız: ${body.research.domain}`, err);
    await recordScanError({
      scanId: body.scanId,
      companyId: body.companyId,
      stage: "email_drafting",
      error: err,
      retryable: true,
      finalStatus: "failed",
    });
    return NextResponse.json(
      { error: `Mail taslağı oluşturulurken hata: ${message}` },
      { status: 500 }
    );
  }
}
