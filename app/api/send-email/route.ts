import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/salespilot/mailer";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface SendEmailRequestBody {
  to: string;
  subject: string;
  body: string;
}

export async function POST(req: NextRequest) {
  // Gönderim, araştırma/puanlamadan çok daha hassas bir işlem - daha sıkı sınır.
  const rateLimit = checkRateLimit(`send-email:${getClientIp(req)}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body: SendEmailRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "to, subject ve body zorunlu." }, { status: 400 });
  }

  try {
    const result = await sendEmail(body);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("Mail gönderimi başarısız", err);
    return NextResponse.json({ error: `Gönderim sırasında hata: ${message}` }, { status: 500 });
  }
}
