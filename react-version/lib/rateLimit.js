/**
 * Lightweight per-instance fixed-window limiter for public endpoints.
 * On serverless/multi-instance deployments use a shared store (e.g. Redis)
 * for globally consistent limits; this is a best-effort local safeguard.
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

/** Clear state for deterministic unit tests. */
export function resetRateLimitForTests() {
  buckets.clear();
}
