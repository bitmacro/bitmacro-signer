type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function resetAttempts(): void {
  buckets.clear();
}

export function forgetAttempt(key: string): void {
  buckets.delete(key);
}

export function clientIpFromRequest(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 80);
  return "unknown";
}

/**
 * Fixed window counter. A full window starts on the first hit.
 * Returns ok:false when this call would exceed `limit`.
 */
export function takeAttempt(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (buckets.size > 4000) {
    for (const [k, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(k);
    }
  }

  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.hits >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.hits += 1;
  return { ok: true };
}
