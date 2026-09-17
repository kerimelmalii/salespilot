/**
 * MVP1 için basit, bellek içi istek sınırlayıcı. Sabit bir zaman
 * penceresinde IP başına istek sayısını sınırlar.
 *
 * SINIRLAMA: Bu bellek içi bir çözüm - sunucu yeniden başladığında sıfırlanır
 * ve birden fazla sunucu örneği (instance) arasında paylaşılmaz. Vercel gibi
 * serverless platformlarda her instance kendi sayacını tutar, yani gerçek
 * limit burada yazdığınızdan daha gevşek olabilir. Düşük hacimli bir pilot
 * için bu yeterli - gerçek ölçekte (Prototip1) Vercel KV veya Upstash gibi
 * paylaşılan bir çözüme geçin.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: maxRequests - bucket.count };
}

/** İstemci IP'sini Next.js request header'larından çıkarır. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
