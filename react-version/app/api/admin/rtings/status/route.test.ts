/**
 * GET /api/admin/rtings/status: ADMIN_API_SECRET-protected observability.
 * Must never call Apify or run a sync.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimitForTests } from '@/lib/rateLimit';
import { makeRunRow } from '@/lib/rtings/__fixtures__/rows';
import { stubRepository } from '@/lib/rtings/__fixtures__/stubRepository';
import type { RtingsRepository } from '@/lib/rtings/types';

const h = vi.hoisted(() => ({
  repo: null as unknown as RtingsRepository,
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
  getApifyPort: h.getApifyPort,
}));

import { GET } from './route';

const SECRET = 'test-admin-secret-not-real';
const saved = process.env.ADMIN_API_SECRET;
let ip = 0;

function req(authorization?: string): Request {
  const headers = new Headers({ 'x-real-ip': `10.1.0.${++ip % 250}` });
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/admin/rtings/status', { headers });
}

const LAST = makeRunRow({ id: 4, status: 'partial', completed_at: '2026-09-30T06:35:00.000Z', finished_at: '2026-09-30T06:35:00.000Z', records_rejected: 1 });

beforeEach(() => {
  resetRateLimitForTests();
  process.env.ADMIN_API_SECRET = SECRET;
  h.repo = stubRepository({
    kind: 'memory',
    getLastSuccessfulRun: async () => LAST,
    getAwaitingApifyRun: async () => null,
    listRecentRuns: async () => [LAST],
    countReviews: async ({ statuses }) => (statuses?.[0] === 'published' ? 3 : 0),
  });
  h.runPipeline.mockReset();
  h.getApifyPort.mockReset();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => {
  if (saved === undefined) delete process.env.ADMIN_API_SECRET;
  else process.env.ADMIN_API_SECRET = saved;
});

describe('GET /api/admin/rtings/status: security', () => {
  it('500 when ADMIN_API_SECRET is not configured', async () => {
    delete process.env.ADMIN_API_SECRET;
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(500);
  });

  it('401 when the token is missing', async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it('401 when the token is invalid', async () => {
    expect((await GET(req('Bearer nope'))).status).toBe(401);
  });
});

describe('GET /api/admin/rtings/status: report', () => {
  it('returns store kind, last run, recent runs and review counts without calling Apify', async () => {
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    const data = body.data;
    expect(data.store).toBe('memory');
    expect(typeof data.apifyConfigured).toBe('boolean');
    expect(data.lastSuccessfulSyncAt).toBe('2026-09-30T06:35:00.000Z');
    expect(typeof data.nextScheduledSyncAt).toBe('string');
    expect(data.lastRun).toMatchObject({ status: 'partial' });
    expect(Array.isArray(data.recentRuns)).toBe(true);
    expect(data.reviewCounts).toMatchObject({ published: 3 });
    expect(h.getApifyPort).not.toHaveBeenCalled();
    expect(h.runPipeline).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('explains a held_awaiting_review / failed_backoff skip via dueReason and lastAttempt', async () => {
    const at = new Date(Date.now() - 3600_000).toISOString();
    const failed = makeRunRow({ id: 9, status: 'failed', started_at: at, completed_at: at, finished_at: at });
    h.repo = stubRepository({
      kind: 'memory',
      getLastSuccessfulRun: async () => null,
      getAwaitingApifyRun: async () => null,
      listRecentRuns: async () => [failed],
      countReviews: async () => 0,
    });
    const body = (await (await GET(req(`Bearer ${SECRET}`))).json()) as { data: Record<string, unknown> };
    expect(body.data.dueNow).toBe(false);
    expect(body.data.dueReason).toBe('failed_backoff');
    expect(body.data.lastAttempt).toMatchObject({ runId: 9, status: 'failed', consecutiveFailures: 1 });
    expect(typeof body.data.nextDueAt).toBe('string');
  });

  it('never includes the admin secret or an Apify token in the body', async () => {
    process.env.APIFY_API_TOKEN = 'apify_api_TESTONLYfaketoken123456';
    const text = await (await GET(req(`Bearer ${SECRET}`))).text();
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain('apify_api_TESTONLYfaketoken123456');
    delete process.env.APIFY_API_TOKEN;
  });
});
