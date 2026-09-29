/**
 * Rate limit API requests. When Upstash Redis REST credentials are present,
 * use an atomic shared fixed-window counter across serverless instances.
 * Without credentials, use the bounded per-instance fallback for development.
 */
const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;

export function isRateLimited(key, { limit = 30, windowMs = WINDOW_MS, now = Date.now() } = {}) {
  if (typeof key !== 'string' || !key) return true;
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs || now < bucket.startedAt) {
    if (buckets.size >= MAX_KEYS) {
      for (const [entryKey, entry] of buckets) {
        if (now - entry.startedAt >= windowMs || now < entry.startedAt) buckets.delete(entryKey);
        if (buckets.size < MAX_KEYS) break;
      }
      if (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value);
    }
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export async function checkRateLimit(key, { limit = 30, windowMs = WINDOW_MS } = {}) {
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
    const payload = await response.json();
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
export function resetRateLimitForTests() {
  buckets.clear();
}
