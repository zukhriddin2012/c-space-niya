// SEC-015: In-memory rate limiter with sliding window
// ADR-001: Uses Map for single Vercel deployment. Swap to Vercel KV if multi-instance.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds until reset
}

export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // New window or expired window
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfter };
  }

  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt };
}

// Preset configurations
export function loginRateLimit(ip: string): RateLimitResult {
  return rateLimit(`login:${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 min
}

export function apiRateLimit(ip: string, path: string): RateLimitResult {
  return rateLimit(`api:${ip}:${path}`, 100, 60 * 1000); // 100 req/min per IP per path
}
