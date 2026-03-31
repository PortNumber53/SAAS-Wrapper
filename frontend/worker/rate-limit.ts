// Simple in-memory rate limiter for Cloudflare Worker.
// Uses a sliding window counter per key (IP or user email).

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart > windowMs * 2) {
      buckets.delete(key);
    }
  }
  // Hard cap to prevent unbounded growth
  if (buckets.size > 10_000) {
    const toDelete = buckets.size - 5_000;
    let i = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++i >= toDelete) break;
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// Default configs for different endpoint types
export const RATE_LIMITS = {
  auth: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,       // 10 req/min
  api: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,        // 60 req/min
  upload: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,     // 20 req/min
  webhook: { maxRequests: 100, windowMs: 60_000 } as RateLimitConfig,   // 100 req/min
} as const;

/**
 * Check if a request should be rate-limited.
 * Returns null if allowed, or a Response (429) if rate-limited.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): Response | null {
  const now = Date.now();
  cleanup(now, config.windowMs);

  const entry = buckets.get(key);
  if (!entry || now - entry.windowStart > config.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return null;
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000);
    return new Response(
      JSON.stringify({ ok: false, error: 'rate_limited', retry_after: retryAfter }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(retryAfter),
        },
      }
    );
  }

  return null;
}

/** Extract a rate-limit key from the request (client IP or fallback). */
export function rateLimitKey(request: Request, prefix: string): string {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  return `${prefix}:${ip}`;
}
