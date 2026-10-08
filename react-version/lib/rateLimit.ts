/**
 * Rate limit API requests. When Supabase is configured, use an atomic shared
 * fixed-window counter in Postgres (rate_limit_hit, migration 0006) across
 * serverless instances. Without Supabase, use the bounded per-instance
 * fallback for development.
 */
import 'server-only';
import { getSupabaseClient } from '@/lib/db/supabaseClient';
export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export type RateLimitBackend = 'memory' | 'supabase' | 'supabase-error' | 'invalid-key';

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
  const client = getSupabaseClient();
  if (!client) {
    return { limited: isRateLimited(key, { limit, windowMs }), backend: 'memory' };
  }

  try {
    const { data, error } = await client.rpc('rate_limit_hit', { p_key: `match:${key}`, p_window_ms: windowMs });
    if (error || !Number.isFinite(Number(data))) return { limited: true, backend: 'supabase-error' };
    return { limited: Number(data) > limit, backend: 'supabase' };
  } catch {
    // Fail closed when shared limiting is configured but unavailable.
    return { limited: true, backend: 'supabase-error' };
  }
}

/** Clear local state for deterministic unit tests. */
export function resetRateLimitForTests(): void {
  buckets.clear();
}
