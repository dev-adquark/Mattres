/**
 * Failure recovery + the stubbed end-to-end journey (brief sections 35-36):
 *
 *   mock Apify dataset (the 20 REAL actor records) -> runRtingsPipeline
 *   -> validation -> InMemoryRtingsRepository -> loadPublishedEvidence
 *
 * No network, no Apify credits: the ApifyPort is a vi.fn() fake and global
 * fetch throws if anything reaches for it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));

import { ApifyCallError } from '@/lib/apify/apifyClient';
import type { RtingsActorInput } from '@/lib/apify/apifyClient';
import catalogJson from '@/lib/data/mattress-catalog.json';
import { loadPublishedEvidence } from './evidence';
import { matchToCatalog } from './match';
import type { CatalogIdentity } from './match';
import { InMemoryRtingsRepository } from './repository';
import { runRtingsPipeline } from './syncPipeline';
import { RtingsRepositoryError } from './types';
import type { ReviewWrite, RtingsAlias, RtingsReviewRow, SyncSummary } from './types';
import { REAL_IDS, realRecords, syntheticFirmnessChanged, syntheticForeignDomain, syntheticWithout } from './__fixtures__/records';
import { mockApify } from './__fixtures__/mockApify';
import type { MockApifyOptions } from './__fixtures__/mockApify';
import { toNormalized } from './__fixtures__/normalized';

const CATALOG = catalogJson as unknown as CatalogIdentity[];
const CATALOG_BEFORE = JSON.stringify(CATALOG);
const ALIASES: RtingsAlias[] = [];
const CATEGORY_INPUT: RtingsActorInput = { mode: 'byCategory', category: 'mattress', sortBy: 'newest', maxItems: 50 };

/** Real records the real catalog matches with exact/high confidence (computed, not hard-coded). */
const EXPECTED_PUBLISHED = realRecords().filter((r) => matchToCatalog(toNormalized(r), CATALOG, ALIASES).kind === 'matched');

let clockMs = Date.parse('2026-10-07T06:30:00.000Z');
const clock = () => new Date(clockMs);
const advance = (ms: number) => {
  clockMs += ms;
};

function newRepo(): InMemoryRtingsRepository {
  return new InMemoryRtingsRepository({ now: clock });
}

async function sync(repo: InMemoryRtingsRepository, apify: MockApifyOptions | ReturnType<typeof mockApify>, input: RtingsActorInput = CATEGORY_INPUT): Promise<SyncSummary> {
  const port = 'startRun' in apify ? apify : mockApify(apify);
  const summary = await runRtingsPipeline({ trigger: 'cron', triggerSource: 'cron', input, repo, apify: port, catalog: CATALOG, aliases: ALIASES, now: clock, waitBudgetMs: 0 });
  advance(60_000);
  return summary;
}

async function seeded(): Promise<InMemoryRtingsRepository> {
  const repo = newRepo();
  const first = await sync(repo, { items: realRecords() });
  expect(first.status).toBe('success');
  advance(24 * 3600_000);
  return repo;
}

async function bearFirmness(repo: InMemoryRtingsRepository): Promise<string | null | undefined> {
  const ev = await loadPublishedEvidence('bear-elite-hybrid', repo);
  return ev?.metrics.find((m) => m.key === 'firmness_level')?.rawValue;
}

async function noRunLeftRunning(repo: InMemoryRtingsRepository): Promise<void> {
  const runs = await repo.listRecentRuns(100);
  expect(runs.filter((r) => r.status === 'running')).toEqual([]);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------

describe('mocked end-to-end: Apify dataset -> pipeline -> repository -> website read', () => {
  it('the real sample has matchable records (guards the fixture itself)', () => {
    expect(EXPECTED_PUBLISHED.length).toBeGreaterThan(0);
    expect(EXPECTED_PUBLISHED.map((r) => r.productId)).toContain(REAL_IDS.bearEliteHybrid);
  });

  it('publishes matched reviews and the product page read returns them', async () => {
    const repo = newRepo();
    const apify = mockApify({ items: realRecords() });
    const summary = await sync(repo, apify);

    expect(apify.startRun).toHaveBeenCalledTimes(1);
    expect(apify.startRun).toHaveBeenCalledWith(CATEGORY_INPUT);
    expect(summary).toMatchObject({ status: 'success', trigger: 'cron', triggerSource: 'cron', actorId: 'dCa1uCOn8ZtEkUamC', coverage: 'partial', store: 'memory', estimatedCostUsd: 0.0123 });
    expect(summary.counts).toMatchObject({ received: 20, valid: 20, rejected: 0, created: 20, updated: 0, unchanged: 0, failed: 0, published: EXPECTED_PUBLISHED.length });
    expect(summary.counts.newCandidate).toBeGreaterThan(0);
    expect(summary.safety).toEqual({ publishable: true, flags: [], warnings: [] });

    const ev = await loadPublishedEvidence('bear-elite-hybrid', repo);
    expect(ev).not.toBeNull();
    expect(ev).toMatchObject({
      mattressId: 'bear-elite-hybrid',
      source: 'RTINGS',
      sourceType: 'independent_review',
      reviewUrl: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid',
      productName: 'Bear Elite Hybrid',
      verdict: null,
      pros: null,
      cons: null,
      overallScore: null,
      licensedImages: [],
      provenance: { apifyActorId: 'dCa1uCOn8ZtEkUamC', apifyRunId: summary.apifyRunId, datasetId: summary.datasetId },
    });
    expect(ev!.metrics.find((m) => m.key === 'firmness_level')).toMatchObject({ rawValue: 'Medium-Firm (51 Pa/mm)', value: 51, scale: 'Pa/mm', kind: 'measurement' });
  });

  it('records the run, every raw item, and leaves the Match Score catalog untouched', async () => {
    const repo = newRepo();
    const summary = await sync(repo, { items: realRecords() });
    const run = await repo.getRun(summary.syncRunId!);
    expect(run).toMatchObject({
      status: 'success',
      trigger: 'cron',
      trigger_source: 'cron',
      actor_id: 'dCa1uCOn8ZtEkUamC',
      apify_run_id: summary.apifyRunId,
      dataset_id: summary.datasetId,
      records_received: 20,
      records_published: EXPECTED_PUBLISHED.length,
      estimated_cost_usd: 0.0123,
    });
    expect(run!.completed_at).not.toBeNull();
    expect(run!.finished_at).toBe(run!.completed_at);
    expect(JSON.stringify(run!.actor_input)).not.toMatch(/token/i);

    const raw = repo.listRawRecords(summary.syncRunId!);
    expect(raw).toHaveLength(20);
    expect(raw.every((r) => r.validation_status === 'valid' && /^[0-9a-f]{64}$/.test(r.payload_sha256))).toBe(true);
    expect(JSON.stringify(CATALOG)).toBe(CATALOG_BEFORE);
  });

  it('ambiguous and unknown products never reach the site', async () => {
    const repo = newRepo();
    await sync(repo, { items: realRecords() });
    // Helix Midnight Luxe 2025 is a different tier than the catalog's Midnight / Midnight Luxe.
    expect(await loadPublishedEvidence('helix-midnight', repo)).toBeNull();
    const pendingOrNew = await repo.listReviews({ statuses: ['pending', 'new_candidate'] });
    expect(pendingOrNew.every((r) => r.site_published_at === null)).toBe(true);
    expect(pendingOrNew.some((r) => r.product_id === REAL_IDS.allswellHybrid && r.status === 'new_candidate')).toBe(true);
  });

  it('source images stay source_only (not displayed) until a human licenses them', async () => {
    const repo = newRepo();
    await sync(repo, { items: realRecords() });
    const [stored] = await repo.getPublishedForMattress('bear-elite-hybrid');
    expect(stored!.images.length).toBe(1);
    expect(stored!.images[0]!.usage_status).toBe('source_only');
    expect((await loadPublishedEvidence('bear-elite-hybrid', repo))!.licensedImages).toEqual([]);
  });

  it('a second identical sync is all unchanged and writes no change log', async () => {
    const repo = await seeded();
    const before = (await repo.getPublishedForMattress('bear-elite-hybrid'))[0]!.review.site_published_at;
    const summary = await sync(repo, { items: realRecords() });
    expect(summary.status).toBe('success');
    expect(summary.counts).toMatchObject({ received: 20, created: 0, updated: 0, unchanged: 20, published: EXPECTED_PUBLISHED.length });
    expect(repo.listChangeLog()).toEqual([]);
    expect((await repo.getPublishedForMattress('bear-elite-hybrid'))[0]!.review.site_published_at).toBe(before);
  });

  it('a changed score is updated, logged with old/new values, and shown on the site', async () => {
    const repo = await seeded();
    const items = realRecords().map((r) => (r.productId === REAL_IDS.bearEliteHybrid ? syntheticFirmnessChanged() : r));
    const summary = await sync(repo, { items });
    expect(summary.status).toBe('success');
    expect(summary.counts).toMatchObject({ updated: 1, unchanged: 19 });
    const log = repo.listChangeLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ changed_fields: ['scores.firmness_level'], outcome: 'published', sync_run_id: summary.syncRunId });
    expect(log[0]!.old_fingerprint).not.toBe(log[0]!.new_fingerprint);
    expect(await bearFirmness(repo)).toBe('Firm (99 Pa/mm)');
  });

  it('a run that returns only one listing page (20 items) is partial and never marks anything source_missing', async () => {
    const repo = await seeded();
    const summary = await sync(repo, { items: realRecords().filter((r) => r.productId !== REAL_IDS.bearEliteHybrid) });
    expect(summary.coverage).toBe('partial');
    expect(summary.counts.sourceMissing).toBe(0);
    expect(await loadPublishedEvidence('bear-elite-hybrid', repo)).not.toBeNull();
  });

  it('a full-category run that no longer returns a review marks it source_missing (history kept, hidden)', async () => {
    const repo = await seeded();
    // SYNTHETIC padding (not RTINGS data): extra unmatched items take the run past one listing page.
    const base = realRecords()[0]!;
    const padding = Array.from({ length: 5 }, (_, i) => ({
      ...base,
      productId: `TEST-PAD-${i}`,
      name: `Testpad Model ${i}`,
      brand: 'Testpad',
      brandSlug: 'testpad',
      modelSlug: `model-${i}`,
      reviewUrl: `https://www.rtings.com/mattress/reviews/testpad/model-${i}`,
      productUrl: `https://www.rtings.com/mattress/reviews/testpad/model-${i}`,
    }));
    const summary = await sync(repo, { items: [...realRecords().filter((r) => r.productId !== REAL_IDS.bearEliteHybrid), ...padding] });
    expect(summary.coverage).toBe('full_category');
    expect(summary.status).toBe('success');
    expect(summary.counts.sourceMissing).toBe(1);
    expect(await loadPublishedEvidence('bear-elite-hybrid', repo)).toBeNull();
    const rows = await repo.listReviews({ statuses: ['source_missing'] });
    expect(rows.map((r) => r.product_id)).toEqual([REAL_IDS.bearEliteHybrid]);
  });
});

// ---------------------------------------------------------------------------
// Failure recovery
// ---------------------------------------------------------------------------

describe('failure recovery: Apify failure', () => {
  it('startRun failure -> failed run, previous evidence kept, no throw', async () => {
    const repo = await seeded();
    const summary = await sync(repo, { startError: new ApifyCallError('APIFY_RUN_FAILED', 'TEST: Apify returned HTTP 500', true, 500) });
    expect(summary.status).toBe('failed');
    expect(summary.errors[0]).toMatchObject({ code: 'APIFY_RUN_FAILED' });
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
    expect(await repo.countReviews({ statuses: ['published'] })).toBe(EXPECTED_PUBLISHED.length);
    const run = await repo.getRun(summary.syncRunId!);
    expect(run).toMatchObject({ status: 'failed' });
    expect(run!.error_message).toMatch(/APIFY_RUN_FAILED/);
    await noRunLeftRunning(repo);
  });

  it('unauthorized Apify token -> failed with APIFY_UNAUTHORIZED', async () => {
    const summary = await sync(newRepo(), { startError: new ApifyCallError('APIFY_UNAUTHORIZED', 'TEST: HTTP 401', false, 401) });
    expect(summary.status).toBe('failed');
    expect(summary.errors.map((e) => e.code)).toContain('APIFY_UNAUTHORIZED');
  });

  it('a non-Apify exception from the port is still recorded, not thrown', async () => {
    const repo = newRepo();
    const summary = await sync(repo, { startError: new TypeError('TEST: boom') });
    expect(summary.status).toBe('failed');
    await noRunLeftRunning(repo);
  });

  it.each(['FAILED', 'ABORTED', 'TIMED-OUT'])('Apify run ending %s -> failed, nothing written', async (finalStatus) => {
    const repo = newRepo();
    const summary = await sync(repo, { startStatus: finalStatus, items: realRecords() });
    expect(summary.status).toBe('failed');
    expect(await repo.countReviews({})).toBe(0);
  });

  it('dataset download failure -> failed, previous evidence kept', async () => {
    const repo = await seeded();
    const summary = await sync(repo, { datasetError: new ApifyCallError('APIFY_NETWORK_ERROR', 'TEST: socket hang up', true) });
    expect(summary.status).toBe('failed');
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
  });

  it('malformed dataset (not an array) -> failed with MALFORMED_RESPONSE, nothing written', async () => {
    const repo = await seeded();
    const summary = await sync(repo, { items: { error: 'not a list' } });
    expect(summary.status).toBe('failed');
    expect(summary.safety.flags.map((f) => f.code)).toContain('MALFORMED_RESPONSE');
    expect(await repo.countReviews({ statuses: ['published'] })).toBe(EXPECTED_PUBLISHED.length);
  });

  it('a still-running Apify run is parked as awaiting_apify and resumed next time without a new scrape', async () => {
    const repo = newRepo();
    const parked = mockApify({ startStatus: 'RUNNING', finalStatus: 'RUNNING', items: realRecords() });
    const first = await sync(repo, parked);
    expect(first.status).toBe('awaiting_apify');
    expect((await repo.getAwaitingApifyRun())?.apify_run_id).toBe(first.apifyRunId);

    const resume = mockApify({ items: realRecords() });
    const second = await sync(repo, resume);
    expect(resume.startRun).not.toHaveBeenCalled();
    expect(resume.getRun).toHaveBeenCalledWith(first.apifyRunId);
    expect(second.status).toBe('success');
    expect(second.apifyRunId).toBe(first.apifyRunId);
    expect(await repo.getAwaitingApifyRun()).toBeNull();
  });
});

describe('failure recovery: empty dataset', () => {
  it('0 items while reviews are published -> held with EMPTY_DATASET; production untouched', async () => {
    const repo = await seeded();
    const summary = await sync(repo, { items: [] });
    expect(summary.status).toBe('held');
    expect(summary.safety.publishable).toBe(false);
    expect(summary.safety.flags.map((f) => f.code)).toContain('EMPTY_DATASET');
    expect(summary.counts.sourceMissing).toBe(0);
    expect(await repo.countReviews({ statuses: ['published'] })).toBe(EXPECTED_PUBLISHED.length);
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
  });

  it('a held run does not reset the 14-day clock', async () => {
    const repo = await seeded();
    const lastBefore = await repo.getLastSuccessfulRun();
    await sync(repo, { items: [] });
    expect((await repo.getLastSuccessfulRun())?.id).toBe(lastBefore?.id);
  });
});

describe('failure recovery: partial invalid dataset', () => {
  it('valid records are processed, invalid ones are rejected and kept only as raw evidence', async () => {
    const repo = newRepo();
    const items = [...realRecords(), syntheticWithout('productId'), syntheticForeignDomain()];
    const summary = await sync(repo, { items });
    expect(summary.status).toBe('partial');
    expect(summary.counts).toMatchObject({ received: 22, valid: 20, rejected: 2, published: EXPECTED_PUBLISHED.length });
    expect(summary.errors.map((e) => e.code)).toContain('VALIDATION_REJECTED');
    const raw = repo.listRawRecords(summary.syncRunId!);
    expect(raw).toHaveLength(22);
    expect(raw.filter((r) => r.validation_status === 'rejected')).toHaveLength(2);
    expect(await repo.countReviews({})).toBe(20);
    expect((await repo.listReviews({})).some((r) => !r.review_url.startsWith('https://www.rtings.com/'))).toBe(false);
  });

  it('a partial run still counts as successful for the 14-day gate', async () => {
    const repo = newRepo();
    const summary = await sync(repo, { items: [...realRecords(), syntheticWithout('brand')] });
    expect((await repo.getLastSuccessfulRun())?.id).toBe(summary.syncRunId);
  });

  it('duplicate items in one dataset are collapsed (last occurrence wins)', async () => {
    const repo = newRepo();
    const items = [...realRecords(), syntheticFirmnessChanged()];
    const summary = await sync(repo, { items });
    expect(summary.errors.map((e) => e.code)).toContain('DUPLICATE_IN_BATCH');
    expect(await repo.countReviews({})).toBe(20);
    expect(await bearFirmness(repo)).toBe('Firm (99 Pa/mm)');
  });
});

describe('failure recovery: database failure', () => {
  it('cannot start a run -> failed summary with DB_ERROR, Apify never called (no credits spent)', async () => {
    const repo = newRepo();
    vi.spyOn(repo, 'startRun').mockRejectedValue(new RtingsRepositoryError('startRun', 'TEST: connection refused', true));
    const apify = mockApify({ items: realRecords() });
    const summary = await sync(repo, apify);
    expect(summary.status).toBe('failed');
    expect(summary.syncRunId).toBeNull();
    expect(summary.errors[0]).toMatchObject({ code: 'DB_ERROR', retryable: true });
    expect(apify.startRun).not.toHaveBeenCalled();
  });

  it('one review write failing -> partial; the rest is stored', async () => {
    const repo = newRepo();
    const original = repo.upsertReview.bind(repo);
    vi.spyOn(repo, 'upsertReview').mockImplementation(async (w: ReviewWrite): Promise<RtingsReviewRow> => {
      if (w.product_id === REAL_IDS.leesaOriginal) throw new RtingsRepositoryError('upsertReview', 'TEST: deadlock', true);
      return original(w);
    });
    const summary = await sync(repo, { items: realRecords() });
    expect(summary.status).toBe('partial');
    expect(summary.counts.failed).toBe(1);
    expect(summary.errors.find((e) => e.code === 'DB_ERROR')?.affected).toEqual([REAL_IDS.leesaOriginal]);
    expect(await repo.countReviews({})).toBe(19);
    await noRunLeftRunning(repo);
  });

  it('every write failing -> failed, run row closed', async () => {
    const repo = newRepo();
    vi.spyOn(repo, 'upsertReview').mockRejectedValue(new RtingsRepositoryError('upsertReview', 'TEST: database is down', true));
    const summary = await sync(repo, { items: realRecords() });
    expect(summary.status).toBe('failed');
    expect(summary.counts.failed).toBe(20);
    await noRunLeftRunning(repo);
  });

  it('raw-record insert failing -> failed before any review is touched', async () => {
    const repo = await seeded();
    vi.spyOn(repo, 'appendRawRecords').mockRejectedValue(new RtingsRepositoryError('appendRawRecords', 'TEST: disk full', true));
    const upsert = vi.spyOn(repo, 'upsertReview');
    const summary = await sync(repo, { items: realRecords() });
    expect(summary.status).toBe('failed');
    expect(upsert).not.toHaveBeenCalled();
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
  });
});

describe('failure recovery: suspicious data', () => {
  it('massive count drop -> held; published rows stay published and visible', async () => {
    const repo = await seeded();
    const three = realRecords().filter((r) => [REAL_IDS.allswellHybrid, REAL_IDS.tuftMint, REAL_IDS.casperSnow].includes(r.productId as never));
    const summary = await sync(repo, { items: three });
    expect(summary.status).toBe('held');
    expect(summary.safety.flags.map((f) => f.code)).toContain('COUNT_DROP');
    expect(summary.counts.published).toBe(0);
    expect(summary.counts.sourceMissing).toBe(0);
    expect(await repo.countReviews({ statuses: ['published'] })).toBe(EXPECTED_PUBLISHED.length);
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
  });

  it('a held run keeps the previously published content and logs the newer read as held', async () => {
    const repo = await seeded();
    const items = realRecords()
      .slice(0, 8)
      .map((r) => (r.productId === REAL_IDS.bearEliteHybrid ? syntheticFirmnessChanged() : r));
    if (!items.some((r) => r.productId === REAL_IDS.bearEliteHybrid)) items.push(syntheticFirmnessChanged());
    const summary = await sync(repo, { items });
    expect(summary.status).toBe('held');
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
    const log = repo.listChangeLog();
    expect(log.some((e) => e.outcome === 'held' && e.changed_fields.includes('scores.firmness_level'))).toBe(true);
  });

  it('scores disappearing from published reviews -> held', async () => {
    const repo = await seeded();
    const items = realRecords().map((r) => ({ ...r, testScoresFlat: {}, featuredTests: [] }));
    const summary = await sync(repo, { items });
    expect(summary.status).toBe('held');
    expect(summary.safety.flags.map((f) => f.code)).toContain('SCORES_DISAPPEARED');
    expect(await bearFirmness(repo)).toBe('Medium-Firm (51 Pa/mm)');
  });
});

describe('locking', () => {
  it('a second concurrent sync is refused with SYNC_ALREADY_RUNNING and spends nothing', async () => {
    const repo = newRepo();
    await repo.startRun({ trigger: 'cron', triggerSource: 'cron', actorId: 'dCa1uCOn8ZtEkUamC', actorInput: { ...CATEGORY_INPUT } });
    const apify = mockApify({ items: realRecords() });
    const summary = await sync(repo, apify);
    expect(summary.status).toBe('failed');
    expect(summary.errors[0]?.code).toBe('SYNC_ALREADY_RUNNING');
    expect(apify.startRun).not.toHaveBeenCalled();
  });

  it('a crashed run older than 30 minutes is released and the next sync proceeds', async () => {
    const repo = newRepo();
    const stuck = await repo.startRun({ trigger: 'cron', triggerSource: 'cron', actorId: 'dCa1uCOn8ZtEkUamC', actorInput: { ...CATEGORY_INPUT } });
    advance(31 * 60_000);
    const summary = await sync(repo, { items: realRecords() });
    expect(summary.status).toBe('success');
    expect(stuck.ok && (await repo.getRun(stuck.run.id))?.status).toBe('failed');
  });
});

describe('server path hygiene', () => {
  it('the pipeline never imports the filesystem', () => {
    const src = fs.readFileSync(path.join(import.meta.dirname, 'syncPipeline.ts'), 'utf8');
    expect(src).not.toMatch(/from\s+['"](node:)?fs['"]/);
  });
});

describe('actor starts returning its documented editorial fields', () => {
  it('maps verdict/pros/cons/overallScore, publishes (no SCHEMA_DRIFT hold) and records new fields as a notice', async () => {
    const repo = await seeded();
    // SYNTHETIC editorial values plus one undocumented key, on every real record.
    const items = realRecords().map((r) => ({
      ...r,
      overallScore: 7.1,
      verdict: 'SYNTHETIC TEST VERDICT',
      pros: ['SYNTHETIC PRO'],
      cons: ['SYNTHETIC CON'],
      someFutureField: 'SYNTHETIC',
    }));
    const summary = await sync(repo, { items });
    expect(summary.status).toBe('success');
    expect(summary.safety.publishable).toBe(true);
    expect(summary.safety.flags).toEqual([]);
    expect(summary.safety.warnings?.map((w) => w.code)).toEqual(['NEW_OPTIONAL_FIELDS']);

    const run = await repo.getRun(summary.syncRunId!);
    expect(run?.safety_flags).toEqual([]);
    expect(run?.error_message).toBeNull();
    expect(run?.error_summary).toEqual([expect.objectContaining({ code: 'NEW_OPTIONAL_FIELDS', affected: ['someFutureField'], retryable: false })]);

    const ev = await loadPublishedEvidence('bear-elite-hybrid', repo);
    expect(ev).toMatchObject({ overallScore: 7.1, verdict: 'SYNTHETIC TEST VERDICT', pros: ['SYNTHETIC PRO'], cons: ['SYNTHETIC CON'] });
  });
});
