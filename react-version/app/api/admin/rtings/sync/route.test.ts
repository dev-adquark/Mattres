/**
 * POST /api/admin/rtings/sync: ADMIN_API_SECRET + rate limit, manual trigger
 * that ignores the 14-day gate, validated body. Pipeline and Apify mocked.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimitForTests } from '@/lib/rateLimit';
import { makeRunRow, makeSummary } from '@/lib/rtings/__fixtures__/rows';
import { stubRepository } from '@/lib/rtings/__fixtures__/stubRepository';
import type { RtingsRepository } from '@/lib/rtings/types';

const h = vi.hoisted(() => ({
  repo: null as unknown as RtingsRepository,
  apifyConfigured: true,
  runPipeline: vi.fn(),
  getApifyPort: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/rtings/syncPipeline', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  runRtingsPipeline: h.runPipeline,
}));
vi.mock('@/lib/rtings/repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getRtingsRepository: () => h.repo,
}));
vi.mock('@/lib/apify/apifyClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isApifyConfigured: () => h.apifyConfigured,
  getApifyPort: h.getApifyPort,
}));

import { POST } from './route';

const SECRET = 'test-admin-secret-not-real';
const saved = process.env.ADMIN_API_SECRET;
let ip = 0;

function req(authorization?: string, body?: unknown, clientIp = `10.0.0.${++ip % 250}`): Request {
  const headers = new Headers({ 'x-real-ip': clientIp, 'content-type': 'application/json' });
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/admin/rtings/sync', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimitForTests();
  process.env.ADMIN_API_SECRET = SECRET;
  h.apifyConfigured = true;
  h.repo = stubRepository({
    kind: 'supabase',
    // A sync finished an hour ago: the cron gate would say "not due", the admin route must ignore it.
    getLastSuccessfulRun: async () => makeRunRow({ completed_at: new Date(Date.now() - 3600_000).toISOString() }),
    getAwaitingApifyRun: async () => null,
    findReviewsByIdentity: async () => [],
  });
  h.runPipeline.mockReset().mockResolvedValue(makeSummary({ trigger: 'manual', triggerSource: 'admin' }));
  h.getApifyPort.mockReset().mockReturnValue({
    ok: true,
    port: {
      actorId: 'dCa1uCOn8ZtEkUamC',
      startRun: () => Promise.reject(new Error('TEST: Apify must not be called')),
      getRun: () => Promise.reject(new Error('TEST: Apify must not be called')),
      getDatasetItems: () => Promise.reject(new Error('TEST: Apify must not be called')),
    },
  });
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => {
  if (saved === undefined) delete process.env.ADMIN_API_SECRET;
  else process.env.ADMIN_API_SECRET = saved;
});

describe('POST /api/admin/rtings/sync: security', () => {
  it('500 when ADMIN_API_SECRET is not configured', async () => {
    delete process.env.ADMIN_API_SECRET;
    const res = await POST(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('401 when the token is missing', async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false, data: null, error: { code: 'UNAUTHORIZED' } });
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('401 when the token is invalid (a valid CRON_SECRET does not unlock it)', async () => {
    process.env.CRON_SECRET = 'test-cron-secret-not-real';
    const res = await POST(req('Bearer test-cron-secret-not-real'));
    expect(res.status).toBe(401);
    expect(h.runPipeline).not.toHaveBeenCalled();
    delete process.env.CRON_SECRET;
  });

  it('429 after 10 attempts per minute from one client', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await POST(req('Bearer wrong', undefined, '203.0.113.9'))).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('POST /api/admin/rtings/sync: valid secret', () => {
  it('runs immediately (ignores the 14-day gate) as trigger manual / admin and returns the envelope', async () => {
    const res = await POST(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { status: string }; error: unknown };
    expect(body.success).toBe(true);
    expect(body.error).toBeNull();
    expect(body.data.status).toBe('success');
    expect(h.runPipeline).toHaveBeenCalledTimes(1);
    expect(h.runPipeline.mock.calls[0]![0]).toMatchObject({ trigger: 'manual', triggerSource: 'admin', input: { mode: 'byCategory', category: 'mattress' } });
  });

  it('caps maxItems at 200: 500 is rejected as invalid input', async () => {
    const res = await POST(req(`Bearer ${SECRET}`, { maxItems: 500 }));
    expect(res.status).toBe(400);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('accepts maxItems within the cap', async () => {
    await POST(req(`Bearer ${SECRET}`, { maxItems: 5 }));
    expect(h.runPipeline.mock.calls[0]![0]).toMatchObject({ input: { mode: 'byCategory', maxItems: 5 } });
  });

  it.each([
    'https://www.example.com/mattress/reviews/bear/elite-hybrid',
    'http://www.rtings.com/mattress/reviews/bear/elite-hybrid',
    'https://www.rtings.com/tv/reviews/lg/c4-oled',
    'javascript:alert(1)',
  ])('rejects reviewUrl %s with 400 and never calls Apify', async (reviewUrl) => {
    const res = await POST(req(`Bearer ${SECRET}`, { reviewUrl }));
    expect(res.status).toBe(400);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('accepts an RTINGS mattress review URL the catalog cites, as a url-mode run', async () => {
    const res = await POST(req(`Bearer ${SECRET}`, { reviewUrl: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid' }));
    expect(res.status).toBe(200);
    expect(h.runPipeline.mock.calls[0]![0]).toMatchObject({ input: { mode: 'url', url: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid' } });
  });

  it('rejects unknown body fields', async () => {
    expect((await POST(req(`Bearer ${SECRET}`, { token: 'x' }))).status).toBe(400);
  });

  it('503 when Apify is not configured', async () => {
    h.apifyConfigured = false;
    expect((await POST(req(`Bearer ${SECRET}`))).status).toBe(503);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('409 when a sync is already running', async () => {
    h.runPipeline.mockResolvedValue(makeSummary({ status: 'failed', syncRunId: null, errors: [{ code: 'SYNC_ALREADY_RUNNING', message: 'test', affected: [], retryable: true }] }));
    expect((await POST(req(`Bearer ${SECRET}`))).status).toBe(409);
  });
});
