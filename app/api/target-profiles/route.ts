import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateTargetCustomerProfiles } from "@/lib/salespilot/pipeline";
import { normalizeDomain } from "@/lib/salespilot/discovery";
import { scrapeCompanyPages } from "@/lib/salespilot/scraping";
import type { SellerProfileRequest } from "@/lib/salespilot/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`target-profiles:${getClientIp(req)}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." }, { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY tanımlı değil." }, { status: 500 });
  }

  let body: SellerProfileRequest;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 }); }

  if (!body.userCompanyName?.trim() || !body.userWebsite?.trim() ||
      !body.productOrService?.trim() || !body.targetRegion?.trim()) {
    return NextResponse.json(
      { error: "Şirket adı, web sitesi, ürün/hizmet ve hedef bölge zorunlu." },
      { status: 400 }
    );
  }

  const website = /^https?:\/\//i.test(body.userWebsite)
    ? body.userWebsite
    : `https://${body.userWebsite}`;
  const domain = normalizeDomain(website);
  if (!domain) {
    return NextResponse.json({ error: "Geçerli bir şirket web sitesi girin." }, { status: 400 });
  }

  try {
    const { pages } = await scrapeCompanyPages(domain);
    const analysis = await generateTargetCustomerProfiles(
      { ...body, userWebsite: website },
      pages
    );
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Hedef müşteri profili üretilemedi", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: `Şirket analizi tamamlanamadı: ${message}` }, { status: 500 });
  }
}
