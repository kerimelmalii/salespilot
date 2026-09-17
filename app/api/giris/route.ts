import { NextRequest, NextResponse } from "next/server";
import { computeExpectedToken } from "@/proxy";

const COOKIE_NAME = "sp_auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.SITE_PASSWORD) {
    return NextResponse.json(
      { error: "SITE_PASSWORD tanımlı değil. .env.local dosyasını kontrol edin." },
      { status: 500 }
    );
  }

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Şifre yanlış." }, { status: 401 });
  }

  const token = await computeExpectedToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
    path: "/",
  });
  return res;
}
