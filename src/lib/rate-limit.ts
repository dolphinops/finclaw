/**
 * Simple in-memory rate limiter.
 * For production, consider Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

const store = new Map<string, RateLimitEntry>();

export function createRateLimiter(config: RateLimiterConfig) {
  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true, remaining: config.max - 1, resetMs: config.windowMs };
      }

      entry.count += 1;

      if (entry.count > config.max) {
        return {
          allowed: false,
          remaining: 0,
          resetMs: entry.resetAt - now,
        };
      }

      return {
        allowed: true,
        remaining: config.max - entry.count,
        resetMs: entry.resetAt - now,
      };
    },
  };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
