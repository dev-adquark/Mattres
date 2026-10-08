/**
 * lib/apify/rtingsSync.ts is now a thin wrapper over the pipeline. These
 * tests pin the two regressions it exists to fix: no filesystem writes on
 * the server path, and no paid scrape when the result could not be stored.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as rtingsSync from './rtingsSync';
import { runRtingsSync, syncSummaryHttpStatus } from './rtingsSync';
import { FileRtingsRepository, InMemoryRtingsRepository } from '@/lib/rtings/repository';
import { realRecords } from '@/lib/rtings/__fixtures__/records';
import { mockApify } from '@/lib/rtings/__fixtures__/mockApify';
import { makeSummary } from '@/lib/rtings/__fixtures__/rows';

const savedEnv = { ...process.env };

beforeEach(() => {
  delete process.env.APIFY_API_TOKEN;
  delete process.env.APIFY_RTINGS_ACTOR_ID;
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.env = { ...savedEnv };
});

describe('no filesystem writes on the server path', () => {
  it('no longer exports RAW_PATH / PROPOSALS_PATH', () => {
    expect('RAW_PATH' in rtingsSync).toBe(false);
    expect('PROPOSALS_PATH' in rtingsSync).toBe(false);
  });

  it('source contains no write/append/mkdir calls', () => {
    const src = fs.readFileSync(path.join(import.meta.dirname, 'rtingsSync.ts'), 'utf8');
    expect(src).not.toMatch(/\b(writeFileSync|writeFile|appendFileSync|appendFile|mkdirSync|renameSync|createWriteStream)\b/);
  });

  it('a full sync through the wrapper performs no fs write', async () => {
    const writes = [vi.spyOn(fs, 'writeFileSync'), vi.spyOn(fs, 'mkdirSync'), vi.spyOn(fs, 'renameSync')];
    const repo = new InMemoryRtingsRepository();
    const summary = await runRtingsSync({ triggerSource: 'admin', repo, apify: mockApify({ items: realRecords() }), waitBudgetMs: 0 });
    expect(summary.status).toBe('success');
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
  });
});

describe('runRtingsSync', () => {
  it('delegates to the pipeline with trigger manual for an admin call', async () => {
    const repo = new InMemoryRtingsRepository();
    const summary = await runRtingsSync({ triggerSource: 'admin', maxItems: 25, repo, apify: mockApify({ items: realRecords() }), waitBudgetMs: 0 });
    expect(summary).toMatchObject({ trigger: 'manual', triggerSource: 'admin', store: 'memory' });
    const run = await repo.getRun(summary.syncRunId!);
    expect(run?.actor_input).toMatchObject({ mode: 'byCategory', maxItems: 25 });
  });

  it('refuses with APIFY_NOT_CONFIGURED when no token is set, before touching the store', async () => {
    const repo = new InMemoryRtingsRepository();
    const summary = await runRtingsSync({ triggerSource: 'cron', repo });
    expect(summary.status).toBe('failed');
    expect(summary.errors[0]?.code).toBe('APIFY_NOT_CONFIGURED');
    expect(await repo.listRecentRuns(5)).toEqual([]);
    expect(syncSummaryHttpStatus(summary)).toBe(503);
  });

  it('refuses a mismatched actor override (APIFY_ACTOR_MISMATCH)', async () => {
    process.env.APIFY_API_TOKEN = 'apify_api_TESTONLYfaketoken123456';
    process.env.APIFY_RTINGS_ACTOR_ID = 'someone/other-scraper';
    const summary = await runRtingsSync({ triggerSource: 'cron', repo: new InMemoryRtingsRepository() });
    expect(summary.errors[0]?.code).toBe('APIFY_ACTOR_MISMATCH');
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(summary)).not.toContain('apify_api_TESTONLYfaketoken123456');
  });

  it('refuses STORE_READ_ONLY on the read-only snapshot store and never calls Apify', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rtings-ro-'));
    try {
      const apify = mockApify({ items: realRecords() });
      const summary = await runRtingsSync({ triggerSource: 'cron', repo: new FileRtingsRepository({ rootDir: root, readOnly: true }), apify });
      expect(summary.errors[0]?.code).toBe('STORE_READ_ONLY');
      expect(apify.startRun).not.toHaveBeenCalled();
      expect(syncSummaryHttpStatus(summary)).toBe(503);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses a non-RTINGS review URL as INVALID_INPUT (400)', async () => {
    const apify = mockApify({ items: [] });
    const summary = await runRtingsSync({ mode: 'url', reviewUrl: 'https://www.example.com/mattress/x', repo: new InMemoryRtingsRepository(), apify });
    expect(summary.errors[0]?.code).toBe('INVALID_INPUT');
    expect(syncSummaryHttpStatus(summary)).toBe(400);
    expect(apify.startRun).not.toHaveBeenCalled();
  });
});

describe('syncSummaryHttpStatus', () => {
  it.each([
    ['success', [], 200],
    ['partial', [], 200],
    ['held', [], 200],
    ['awaiting_apify', [], 200],
    ['failed', ['APIFY_RUN_FAILED'], 502],
    ['failed', ['SYNC_ALREADY_RUNNING'], 409],
    ['failed', ['APIFY_NOT_CONFIGURED'], 503],
  ] as const)('%s with %j -> %i', (status, codes, http) => {
    const summary = makeSummary({ status, errors: codes.map((code) => ({ code, message: 'test', affected: [], retryable: false })) });
    expect(syncSummaryHttpStatus(summary)).toBe(http);
  });
});
