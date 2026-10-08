import { afterEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
let client: { rpc: typeof rpc } | null = null;
vi.mock('@/lib/db/supabaseClient', () => ({ getSupabaseClient: () => client }));

import { checkRateLimit, resetRateLimitForTests } from './rateLimit';

afterEach(() => {
  resetRateLimitForTests();
  rpc.mockReset();
  client = null;
});

describe('checkRateLimit', () => {
  it('uses the local fallback when Supabase is not configured', async () => {
    expect(await checkRateLimit('client', { limit: 1 })).toEqual({ limited: false, backend: 'memory' });
    expect(await checkRateLimit('client', { limit: 1 })).toEqual({ limited: true, backend: 'memory' });
  });

  it('uses the atomic Postgres counter and returns the shared decision', async () => {
    client = { rpc };
    rpc.mockResolvedValue({ data: 31, error: null });
    expect(await checkRateLimit('client', { limit: 30, windowMs: 60000 })).toEqual({ limited: true, backend: 'supabase' });
    expect(rpc).toHaveBeenCalledWith('rate_limit_hit', { p_key: 'match:client', p_window_ms: 60000 });
    rpc.mockResolvedValue({ data: 30, error: null });
    expect(await checkRateLimit('client', { limit: 30 })).toEqual({ limited: false, backend: 'supabase' });
  });

  it('falls back to memory counting while the migration is not yet applied', async () => {
    client = { rpc };
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'function not found' } });
    expect(await checkRateLimit('client', { limit: 1 })).toEqual({ limited: false, backend: 'memory' });
    expect(await checkRateLimit('client', { limit: 1 })).toEqual({ limited: true, backend: 'memory' });
  });

  it('fails closed when the configured database errors or is unreachable', async () => {
    client = { rpc };
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await checkRateLimit('client')).toEqual({ limited: true, backend: 'supabase-error' });
    rpc.mockRejectedValue(new Error('offline'));
    expect(await checkRateLimit('client')).toEqual({ limited: true, backend: 'supabase-error' });
  });
});
