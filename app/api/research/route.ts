import { NextRequest, NextResponse } from "next/server";
import { scrapeCompanyPages } from "@/lib/salespilot/scraping";
import { researchCompany } from "@/lib/salespilot/pipeline";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface ResearchRequestBody {
  companyName: string;
  domain: string;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`research:${getClientIp(req)}`, 60, 60_000);
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

  let body: ResearchRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.companyName || !body.domain) {
    return NextResponse.json({ error: "companyName ve domain zorunlu." }, { status: 400 });
  }

  try {
    const { pages, emailCandidates } = await scrapeCompanyPages(body.domain);
    const research = await researchCompany(body.companyName, body.domain, pages, emailCandidates);
    return NextResponse.json({ research });
  } catch (err) {
    // MVP1 test aşamasındayız - gerçek hata mesajını istemciye de gönderiyoruz
    // ki teşhis kolay olsun. Gerçek müşterilere satarken bunu sadeleştirin.
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Araştırma başarısız: ${body.domain}`, err);
    return NextResponse.json(
      { error: `Araştırma sırasında hata: ${message}` },
      { status: 500 }
    );
  }
}
