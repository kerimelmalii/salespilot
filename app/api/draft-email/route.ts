import { NextRequest, NextResponse } from "next/server";
import { draftEmail } from "@/lib/salespilot/pipeline";
import type { CompanyResearch, ScanRequest } from "@/lib/salespilot/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface DraftEmailRequestBody {
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

  if (!body.research || !body.scanRequest) {
    return NextResponse.json({ error: "research ve scanRequest zorunlu." }, { status: 400 });
  }

  try {
    // Gönderen adı olarak kullanıcının kendi tarama formunda girdiği şirket
    // adını kullanıyoruz - ayrıca bir "ürün kataloğu" alanına gerek yok,
    // scanRequest.productOrService zaten bu amaçla kullanılıyor (sade tutmak
    // için MVP1'de ayrı bir alan eklemedik).
    const draft = await draftEmail(body.research, body.scanRequest, body.scanRequest.userCompanyName);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Mail taslağı oluşturma başarısız: ${body.research.domain}`, err);
    return NextResponse.json(
      { error: `Mail taslağı oluşturulurken hata: ${message}` },
      { status: 500 }
    );
  }
}
