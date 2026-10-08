/**
 * GET /api/cron/rtings-check: report-only freshness check. Must never run a
 * sync, never call Apify, and never touch the filesystem for freshness.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const SECRET = 'test-cron-secret-not-real';
const saved = process.env.CRON_SECRET;

function req(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/cron/rtings-check', { headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  h.repo = stubRepository({ kind: 'file', getLastSuccessfulRun: async () => null, getAwaitingApifyRun: async () => null, listRecentRuns: async () => [] });
  h.runPipeline.mockReset();
  h.getApifyPort.mockReset();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => {
  if (saved === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = saved;
});

describe('GET /api/cron/rtings-check: security', () => {
  it('500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(500);
  });

  it('401 when the token is missing', async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it('401 when the token is invalid', async () => {
    expect((await GET(req('Bearer nope'))).status).toBe(401);
  });

  it('200 with a valid token', async () => {
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(200);
  });
});

describe('GET /api/cron/rtings-check: report only', () => {
  it('reports a never-synced store without running a sync', async () => {
    const res = await GET(req(`Bearer ${SECRET}`));
    const text = await res.text();
    expect(text).toMatch(/never_synced/);
    expect(h.runPipeline).not.toHaveBeenCalled();
    expect(h.getApifyPort).not.toHaveBeenCalled();
  });

  it('reports the last successful sync from the repository (not a file mtime)', async () => {
    const completed = '2026-09-30T06:35:00.000Z';
    h.repo = stubRepository({
      kind: 'supabase',
      getLastSuccessfulRun: async () => makeRunRow({ completed_at: completed, finished_at: completed }),
      getAwaitingApifyRun: async () => null,
      listRecentRuns: async () => [makeRunRow({ completed_at: completed, finished_at: completed })],
    });
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(completed);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('reports held_awaiting_review after a held run, with the last attempt', async () => {
    const at = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();
    h.repo = stubRepository({
      kind: 'supabase',
      getLastSuccessfulRun: async () => null,
      getAwaitingApifyRun: async () => null,
      listRecentRuns: async () => [makeRunRow({ id: 6, status: 'held', started_at: at, completed_at: at, finished_at: at })],
    });
    const body = (await (await GET(req(`Bearer ${SECRET}`))).json()) as Record<string, unknown>;
    expect(body.status).toBe('held_awaiting_review');
    expect(body.lastAttempt).toMatchObject({ runId: 6, status: 'held' });
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('reports failed_backoff after a recent failure', async () => {
    const at = new Date(Date.now() - 3600_000).toISOString();
    h.repo = stubRepository({
      kind: 'supabase',
      getLastSuccessfulRun: async () => null,
      getAwaitingApifyRun: async () => null,
      listRecentRuns: async () => [makeRunRow({ id: 7, status: 'failed', started_at: at, completed_at: at, finished_at: at })],
    });
    const body = (await (await GET(req(`Bearer ${SECRET}`))).json()) as Record<string, unknown>;
    expect(body.status).toBe('failed_backoff');
    expect(body.lastAttempt).toMatchObject({ runId: 7, consecutiveFailures: 1 });
  });

  it('degrades (does not 500 with a stack) when the store cannot be read', async () => {
    h.repo = stubRepository({ kind: 'supabase' }); // every read rejects
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).not.toBe(401);
    expect(await res.text()).not.toMatch(/at .*\.ts:\d+/);
    err.mockRestore();
    warn.mockRestore();
  });
});
