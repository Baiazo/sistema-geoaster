import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  __geoaster_rl?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> =
  globalForLimiter.__geoaster_rl ?? (globalForLimiter.__geoaster_rl = new Map());

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, remaining: 0, resetAt: existing.resetAt, retryAfterSeconds };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

export function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

// Limpeza periódica para evitar crescimento ilimitado
if (typeof setInterval !== "undefined" && !globalForLimiter.__geoaster_rl) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}
