import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildScanReport } from "@/lib/salespilot/report";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(`scan-report:${getClientIp(req)}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const scanId = req.nextUrl.searchParams.get("scanId");
  if (!scanId) {
    return NextResponse.json({ error: "scanId zorunlu (query parametresi)." }, { status: 400 });
  }

  try {
    const report = await buildScanReport(scanId);
    if (!report) {
      return NextResponse.json({ error: "Bu scanId ile bir tarama bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Tarama raporu oluşturulamadı: ${scanId}`, err);
    return NextResponse.json({ error: `Rapor oluşturulurken hata: ${message}` }, { status: 500 });
  }
}
