import { NextRequest, NextResponse } from "next/server";

/**
 * MVP1 için GEÇİCİ, basit bir koruma katmanı. Gerçek kullanıcı bazlı
 * kimlik doğrulama (çoklu müşteri, ayrı hesaplar) Prototip1'de geliyor -
 * bu sadece "siteyi deploy ettik, rastgele internet trafiği/bot API
 * bütçemizi tüketmesin" sorununu çözüyor. Tek bir paylaşılan şifre.
 */

const COOKIE_NAME = "sp_auth";
const PUBLIC_PATHS = ["/giris", "/kayit", "/fiyatlandirma", "/hakkimizda", "/showcase", "/api/giris"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const expected = await computeExpectedToken();

  if (!expected || cookie !== expected) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const loginUrl = new URL("/giris", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Cookie değeri, şifrenin kendisi DEĞİL - SITE_PASSWORD + SESSION_SECRET'in
 * hash'i. Böylece cookie sızsa bile paylaşılan şifreyi doğrudan göstermez.
 */
export async function computeExpectedToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) return null;

  const data = new TextEncoder().encode(`${password}:${secret}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
