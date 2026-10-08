/**
 * Rate limit API requests. When Upstash Redis REST credentials are present,
 * use an atomic shared fixed-window counter across serverless instances.
 * Without credentials, use the bounded per-instance fallback for development.
 */
import 'server-only';
export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export type RateLimitBackend = 'memory' | 'redis' | 'redis-error' | 'invalid-key';

export interface RateLimitResult {
  limited: boolean;
  backend: RateLimitBackend;
}

interface Bucket {
  startedAt: number;
  count: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;

export function isRateLimited(
  key: unknown,
  { limit = 30, windowMs = WINDOW_MS, now = Date.now() }: RateLimitOptions & { now?: number } = {}
): boolean {
  if (typeof key !== 'string' || !key) return true;
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs || now < bucket.startedAt) {
    if (buckets.size >= MAX_KEYS) {
      for (const [entryKey, entry] of buckets) {
        if (now - entry.startedAt >= windowMs || now < entry.startedAt) buckets.delete(entryKey);
        if (buckets.size < MAX_KEYS) break;
      }
      const oldest = buckets.keys().next();
      if (buckets.size >= MAX_KEYS && !oldest.done) buckets.delete(oldest.value);
    }
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export async function checkRateLimit(key: unknown, { limit = 30, windowMs = WINDOW_MS }: RateLimitOptions = {}): Promise<RateLimitResult> {
  if (typeof key !== 'string' || !key) return { limited: true, backend: 'invalid-key' };
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { limited: isRateLimited(key, { limit, windowMs }), backend: 'memory' };
  }

  const script = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return n";
  try {
    const response = await fetch(url.replace(/\/$/, ''), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', script, '1', `rate-limit:match:${key}`, String(windowMs)]),
      cache: 'no-store',
    });
    if (!response.ok) return { limited: true, backend: 'redis-error' };
    const payload = (await response.json()) as { result?: unknown; error?: unknown };
    if (payload.error || !Number.isFinite(Number(payload.result))) {
      return { limited: true, backend: 'redis-error' };
    }
    return { limited: Number(payload.result) > limit, backend: 'redis' };
  } catch {
    // Fail closed when shared limiting is explicitly configured but unavailable.
    return { limited: true, backend: 'redis-error' };
  }
}

/** Clear local state for deterministic unit tests. */
export function resetRateLimitForTests(): void {
  buckets.clear();
}
