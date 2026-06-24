// ponytail: in-memory rate limiter. swap to Upstash/Redis if multi-instance or stricter limits needed.
const buckets = new Map<string, { tokens: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { tokens: maxRequests - 1, resetAt: now + windowMs });
    return { success: true, retryAfter: 0 };
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { success: true, retryAfter: 0 };
  }

  return { success: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

// Periodic cleanup of stale buckets (runs every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref();
