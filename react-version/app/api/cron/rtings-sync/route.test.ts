/**
 * Security + gate tests for GET /api/cron/rtings-sync. No network, no Apify:
 * the pipeline, the Apify port and the store are mocked at module boundaries
 * and global fetch throws if anything tries to reach the network.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRunRow, makeSummary } from '@/lib/rtings/__fixtures__/rows';
import { stubRepository } from '@/lib/rtings/__fixtures__/stubRepository';
import type { RtingsRepository, RtingsSyncRunRow } from '@/lib/rtings/types';
import { RTINGS_SYNC_INTERVAL_DAYS as N } from '@/lib/rtings/types';

const h = vi.hoisted(() => ({
  repo: null as unknown as RtingsRepository,
  apifyConfigured: true,
  runPipeline: vi.fn(),
  getApifyPort: vi.fn(),
  checkApifyBudget: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: h.revalidateTag, unstable_cache: <T>(fn: T) => fn }));
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
  checkApifyBudget: h.checkApifyBudget,
}));

import { GET, maxDuration } from './route';

const SECRET = 'test-cron-secret-not-real';
const ENV_KEYS = ['CRON_SECRET', 'APIFY_API_TOKEN'] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function req(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/cron/rtings-sync', { headers });
}

function repoWithLastSuccess(completedAt: string | null, recentRuns: RtingsSyncRunRow[] = []): RtingsRepository {
  const last = completedAt ? makeRunRow({ completed_at: completedAt, finished_at: completedAt }) : null;
  return stubRepository({
    kind: 'supabase',
    getLastSuccessfulRun: async () => last,
    getAwaitingApifyRun: async () => null,
    listRecentRuns: async () => (recentRuns.length > 0 ? recentRuns : last ? [last] : []),
  });
}

function finishedRun(id: number, status: 'held' | 'failed', hoursAgo: number): RtingsSyncRunRow {
  const at = new Date(Date.now() - hoursAgo * 3600_000).toISOString();
  return makeRunRow({ id, status, started_at: at, completed_at: at, finished_at: at });
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  delete process.env.APIFY_API_TOKEN;
  h.apifyConfigured = true;
  h.repo = repoWithLastSuccess(null);
  h.runPipeline.mockReset();
  h.getApifyPort.mockReset().mockReturnValue({
    ok: true,
    port: {
      actorId: 'dCa1uCOn8ZtEkUamC',
      startRun: () => Promise.reject(new Error('TEST: Apify must not be called')),
      getRun: () => Promise.reject(new Error('TEST: Apify must not be called')),
      getDatasetItems: () => Promise.reject(new Error('TEST: Apify must not be called')),
    },
  });
  h.checkApifyBudget.mockReset().mockResolvedValue({ ok: true, monthlyUsageUsd: 0, monthlyLimitUsd: 19, reservedUsd: 1.5, cycleEndsAt: null });
  h.revalidateTag.mockReset();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('GET /api/cron/rtings-sync: security', () => {
  it('declares a 300s maxDuration', () => {
    expect(maxDuration).toBe(300);
  });

  it('fails closed with 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('401 when the bearer token is missing', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(h.runPipeline).not.toHaveBeenCalled();
    expect(h.getApifyPort).not.toHaveBeenCalled();
  });

  // (A trailing space is trimmed by the Headers API itself, so it is not a distinct case here; lib/cronAuth.test.ts covers it.)
  it.each(['Bearer wrong-secret', SECRET, `bearer ${SECRET}`, `Bearer ${SECRET}x`, `Basic ${SECRET}`])('401 for an invalid token: %s', async (auth) => {
    const res = await GET(req(auth));
    expect(res.status).toBe(401);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('never echoes the secret in an error body', async () => {
    const res = await GET(req('Bearer wrong-secret'));
    expect(await res.text()).not.toContain(SECRET);
  });
});

describe('GET /api/cron/rtings-sync: valid secret', () => {
  it('runs the pipeline (trigger cron) when never synced and returns 200 on success', async () => {
    h.runPipeline.mockResolvedValue(makeSummary({ status: 'success' }));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(h.runPipeline).toHaveBeenCalledTimes(1);
    expect(h.runPipeline.mock.calls[0]![0]).toMatchObject({ trigger: 'cron', triggerSource: 'cron' });
  });

  it(`skips with 200 {skipped: not_due} inside the ${N}-day window and spends nothing`, async () => {
    h.repo = repoWithLastSuccess(new Date(Date.now() - (N - 1) * 24 * 3600 * 1000).toISOString());
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.skipped).toBe('not_due');
    expect(typeof body.nextDueAt).toBe('string');
    expect(h.runPipeline).not.toHaveBeenCalled();
    expect(h.getApifyPort).not.toHaveBeenCalled();
  });

  it(`runs again once ${N} days have passed`, async () => {
    h.repo = repoWithLastSuccess(new Date(Date.now() - (N + 1) * 24 * 3600 * 1000).toISOString());
    h.runPipeline.mockResolvedValue(makeSummary());
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(200);
    expect(h.runPipeline).toHaveBeenCalledTimes(1);
  });

  it('does not re-scrape every day after a held run: 200 {skipped: held_awaiting_review}', async () => {
    const DAY_H = 24;
    h.repo = repoWithLastSuccess(new Date(Date.now() - (N + 2) * DAY_H * 3600_000).toISOString(), [finishedRun(2, 'held', 2 * DAY_H)]);
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.skipped).toBe('held_awaiting_review');
    expect(typeof body.nextDueAt).toBe('string');
    expect(body.lastAttempt).toMatchObject({ runId: 2, status: 'held' });
    expect(h.runPipeline).not.toHaveBeenCalled();
    expect(h.getApifyPort).not.toHaveBeenCalled();
  });

  it('backs off after consecutive failures: 200 {skipped: failed_backoff}', async () => {
    // Two failures in a row; the latest 1 day ago -> 2-day backoff still running.
    h.repo = repoWithLastSuccess(null, [finishedRun(3, 'failed', 24), finishedRun(2, 'failed', 48)]);
    const res = await GET(req(`Bearer ${SECRET}`));
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.skipped).toBe('failed_backoff');
    expect(body.lastAttempt).toMatchObject({ runId: 3, status: 'failed', consecutiveFailures: 2 });
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('retries once the failure backoff has elapsed', async () => {
    h.repo = repoWithLastSuccess(null, [finishedRun(2, 'failed', 25)]);
    h.runPipeline.mockResolvedValue(makeSummary());
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(200);
    expect(h.runPipeline).toHaveBeenCalledTimes(1);
  });

  it('revalidates the evidence cache tag after a run that published', async () => {
    h.runPipeline.mockResolvedValue(makeSummary({ counts: { ...makeSummary().counts, published: 3 } }));
    await GET(req(`Bearer ${SECRET}`));
    expect(h.revalidateTag).toHaveBeenCalledWith('rtings-evidence', 'max');
  });

  it('does not revalidate when nothing was published', async () => {
    h.runPipeline.mockResolvedValue(makeSummary({ status: 'held', safety: { publishable: false, flags: [{ code: 'COUNT_DROP', message: 'test', detail: {} }] } }));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ['partial', 200],
    ['awaiting_apify', 200],
    ['failed', 502],
  ] as const)('maps a %s run to HTTP %i', async (status, http) => {
    h.runPipeline.mockResolvedValue(makeSummary({ status, errors: status === 'failed' ? [{ code: 'APIFY_RUN_FAILED', message: 'test', affected: [], retryable: true }] : [] }));
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(http);
  });

  it('409 when another sync is already running', async () => {
    h.runPipeline.mockResolvedValue(makeSummary({ status: 'failed', syncRunId: null, errors: [{ code: 'SYNC_ALREADY_RUNNING', message: 'test', affected: [], retryable: true }] }));
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(409);
  });

  it('503 when Apify is not configured, without starting the pipeline', async () => {
    h.apifyConfigured = false;
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('503 when the monthly Apify budget has no headroom, without starting the pipeline', async () => {
    h.checkApifyBudget.mockResolvedValue({ ok: false, monthlyUsageUsd: 19.05, monthlyLimitUsd: 19, reservedUsd: 1.5, cycleEndsAt: '2026-10-24T23:59:59.999Z' });
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.error as Record<string, unknown>).code).toBe('BUDGET_LIMIT_EXCEEDED');
    expect(h.runPipeline).not.toHaveBeenCalled();
    expect(h.checkApifyBudget).toHaveBeenCalledTimes(1);
  });

  it('503 and skips safely when the budget check itself cannot be completed (fails closed)', async () => {
    h.checkApifyBudget.mockResolvedValue({ success: false, code: 'APIFY_NETWORK_ERROR', message: 'TEST: offline', retryable: true });
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.error as Record<string, unknown>).code).toBe('BUDGET_CHECK_FAILED');
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('does not call the (paid-token) budget check when the tick is not due anyway', async () => {
    h.repo = repoWithLastSuccess(new Date(Date.now() - (N - 1) * 24 * 3600 * 1000).toISOString());
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(h.checkApifyBudget).not.toHaveBeenCalled();
    expect(h.runPipeline).not.toHaveBeenCalled();
  });

  it('calls the budget check before starting the pipeline when due', async () => {
    h.runPipeline.mockResolvedValue(makeSummary({ status: 'success' }));
    await GET(req(`Bearer ${SECRET}`));
    expect(h.checkApifyBudget).toHaveBeenCalledTimes(1);
    expect(h.runPipeline).toHaveBeenCalledTimes(1);
  });

  it('never leaks the Apify token in the response', async () => {
    process.env.APIFY_API_TOKEN = 'apify_api_TESTONLYfaketoken123456';
    h.runPipeline.mockResolvedValue(
      makeSummary({ status: 'failed', errors: [{ code: 'APIFY_RUN_FAILED', message: 'upstream said apify_api_TESTONLYfaketoken123456', affected: [], retryable: true }] })
    );
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(await res.text()).not.toContain('apify_api_TESTONLYfaketoken123456');
  });
});
