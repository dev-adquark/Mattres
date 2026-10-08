/**
 * Repository contract tests: the in-memory store enforces the 0005 schema
 * constraints, and the file store (CLI only) writes append-only raw files and
 * a published-only snapshot that the read-only site store serves. File tests
 * write only inside a fresh os.tmpdir() folder.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));

import catalogJson from '@/lib/data/mattress-catalog.json';
import { loadPublishedEvidence } from './evidence';
import type { CatalogIdentity } from './match';
import { computeFingerprint } from './fingerprint';
import { buildImageWrites, buildReviewWrite, buildScoreWrites } from './publish';
import { FileRtingsRepository, InMemoryRtingsRepository, getRtingsRepository, isWritableRepository } from './repository';
import { runRtingsPipeline } from './syncPipeline';
import { RtingsRepositoryError } from './types';
import type { CatalogMatchResult, ReviewChange, ReviewWrite } from './types';
import { REAL_IDS, realRecord, realRecords } from './__fixtures__/records';
import { mockApify } from './__fixtures__/mockApify';
import { toNormalized } from './__fixtures__/normalized';

const MATCHED: CatalogMatchResult = { kind: 'matched', mattressId: 'bear-elite-hybrid', method: 'review_url', confidence: 'exact' };
const CREATED: ReviewChange = { kind: 'created', oldFingerprint: null, newFingerprint: 'f'.repeat(64), changedFields: [], oldValues: {}, newValues: {} };
const NOW = '2026-10-07T06:30:00.000Z';

function bearWrite(overrides: Partial<ReviewWrite> = {}): ReviewWrite {
  const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
  return {
    ...buildReviewWrite({ review, fingerprint: computeFingerprint(review), match: MATCHED, status: 'published', statusReason: null, syncRunId: null, existing: null, change: CREATED, now: NOW }),
    ...overrides,
  };
}

describe('InMemoryRtingsRepository: schema constraints', () => {
  it('refuses a published review without a mattress id or with a weak match', async () => {
    const repo = new InMemoryRtingsRepository();
    await expect(repo.upsertReview(bearWrite({ mattress_id: null }))).rejects.toBeInstanceOf(RtingsRepositoryError);
    await expect(repo.upsertReview(bearWrite({ match_confidence: 'ambiguous' }))).rejects.toBeInstanceOf(RtingsRepositoryError);
  });

  it('refuses a non-RTINGS review URL and a malformed fingerprint', async () => {
    const repo = new InMemoryRtingsRepository();
    await expect(repo.upsertReview(bearWrite({ review_url: 'https://www.example.com/x' }))).rejects.toThrow(/review_url/);
    await expect(repo.upsertReview(bearWrite({ fingerprint: 'abc' }))).rejects.toThrow(/fingerprint/);
  });

  it('upserts by product_id: a second write updates, never duplicates', async () => {
    const repo = new InMemoryRtingsRepository();
    const a = await repo.upsertReview(bearWrite());
    const b = await repo.upsertReview(bearWrite({ status_reason: 'second write' }));
    expect(b.id).toBe(a.id);
    expect(b.first_seen_at).toBe(a.first_seen_at);
    expect(await repo.countReviews({})).toBe(1);
  });

  it('replaceScores removes metrics that are no longer returned (never zero-fills)', async () => {
    const repo = new InMemoryRtingsRepository();
    const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
    const row = await repo.upsertReview(bearWrite());
    await repo.replaceScores(row.id, buildScoreWrites(review));
    const kept = await repo.replaceScores(row.id, buildScoreWrites(review).filter((s) => s.metric_key === 'firmness_level'));
    expect(kept.map((s) => s.metric_key)).toEqual(['firmness_level']);
  });

  it('refuses impossible score values', async () => {
    const repo = new InMemoryRtingsRepository();
    const row = await repo.upsertReview(bearWrite());
    const base = buildScoreWrites(toNormalized(realRecord(REAL_IDS.bearEliteHybrid)))[0]!;
    await expect(repo.replaceScores(row.id, [{ ...base, metric_key: 'x', value_kind: 'score_0_10', value: 11 }])).rejects.toBeInstanceOf(RtingsRepositoryError);
    await expect(repo.replaceScores(row.id, [{ ...base, metric_key: 'y', value_kind: 'measurement', value: -1 }])).rejects.toBeInstanceOf(RtingsRepositoryError);
    await expect(repo.replaceScores(row.id, [{ ...base, metric_key: 'Bad Key', value_kind: 'label', value: null }])).rejects.toBeInstanceOf(RtingsRepositoryError);
  });

  it('upsertImages never changes a human licensing decision', async () => {
    const seed = new InMemoryRtingsRepository();
    const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
    const row = await seed.upsertReview(bearWrite());
    await seed.upsertImages(row.id, buildImageWrites(review));
    const state = seed.snapshotState();
    state.images[0]!.usage_status = 'licensed';
    state.images[0]!.license_note = 'TEST-ONLY license note';
    const repo = new InMemoryRtingsRepository({ state });
    const [img] = await repo.upsertImages(row.id, buildImageWrites(review));
    expect(img).toMatchObject({ usage_status: 'licensed', license_note: 'TEST-ONLY license note' });
  });

  it('startRun is an exclusive lock', async () => {
    const repo = new InMemoryRtingsRepository();
    const input = { trigger: 'manual' as const, triggerSource: 'cli' as const, actorId: 'dCa1uCOn8ZtEkUamC', actorInput: {} };
    expect((await repo.startRun(input)).ok).toBe(true);
    expect(await repo.startRun(input)).toEqual({ ok: false, reason: 'already_running' });
  });

  it('raw records and the change log are append-only', async () => {
    const repo = new InMemoryRtingsRepository();
    const started = await repo.startRun({ trigger: 'manual', triggerSource: 'cli', actorId: 'dCa1uCOn8ZtEkUamC', actorInput: {} });
    if (!started.ok) throw new Error('lock');
    const raw = { sync_run_id: started.run.id, item_index: 0, apify_actor_id: 'dCa1uCOn8ZtEkUamC', apify_run_id: null, dataset_id: null, product_id: null, review_url: null, payload: {}, payload_sha256: '0'.repeat(64), validation_status: 'valid' as const, validation_problems: [] };
    await repo.appendRawRecords([raw]);
    await expect(repo.appendRawRecords([raw])).rejects.toThrow(/append-only/);

    const row = await repo.upsertReview(bearWrite());
    const same = 'a'.repeat(64);
    await expect(
      repo.appendChangeLog([{ reviewId: row.id, oldFingerprint: same, newFingerprint: same, changedFields: [], oldValues: {}, newValues: {}, detectedAt: NOW, apifyRunId: null, syncRunId: null, outcome: 'recorded' }])
    ).rejects.toThrow(/differ/);
  });
});

describe('FileRtingsRepository (CLI store)', () => {
  let root: string;
  const savedVercel = process.env.VERCEL;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'rtings-file-repo-'));
    delete process.env.VERCEL;
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    if (savedVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedVercel;
  });

  const snapshotPath = () => path.join(root, 'react-version', 'lib', 'data', 'rtings-evidence.json');

  it('refuses to open for writing on Vercel', () => {
    process.env.VERCEL = '1';
    expect(() => new FileRtingsRepository({ rootDir: root })).toThrow(RtingsRepositoryError);
    expect(() => new FileRtingsRepository({ rootDir: root, readOnly: true })).not.toThrow();
  });

  it('a CLI sync writes store.json, an append-only raw file, and a published-only snapshot the site can read', async () => {
    const repo = new FileRtingsRepository({ rootDir: root });
    const summary = await runRtingsPipeline({
      trigger: 'manual',
      triggerSource: 'cli',
      input: { mode: 'byCategory', category: 'mattress', sortBy: 'newest', maxItems: 50 },
      repo,
      apify: mockApify({ items: realRecords() }),
      catalog: catalogJson as unknown as CatalogIdentity[],
      aliases: [],
      waitBudgetMs: 0,
    });
    expect(summary.store).toBe('file');
    expect(summary.status).toBe('success');

    expect(fs.existsSync(path.join(root, 'data', 'rtings', 'store.json'))).toBe(true);
    const rawFile = path.join(root, 'data', 'rtings', 'raw', `run-${summary.syncRunId}.json`);
    expect(JSON.parse(fs.readFileSync(rawFile, 'utf8')).records).toHaveLength(20);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath(), 'utf8')) as { published: { review: { status: string } }[] };
    expect(snapshot.published.length).toBe(summary.counts.published);
    expect(snapshot.published.every((s) => s.review.status === 'published')).toBe(true);

    // Raw files are never overwritten.
    const raw = { sync_run_id: summary.syncRunId!, item_index: 99, apify_actor_id: 'dCa1uCOn8ZtEkUamC', apify_run_id: null, dataset_id: null, product_id: null, review_url: null, payload: {}, payload_sha256: '0'.repeat(64), validation_status: 'valid' as const, validation_problems: [] };
    await expect(repo.appendRawRecords([raw])).rejects.toThrow(/append-only|already exists/);

    // The site's read-only store serves the snapshot.
    const site = new FileRtingsRepository({ rootDir: root, readOnly: true });
    expect(isWritableRepository(site)).toBe(false);
    const ev = await loadPublishedEvidence('bear-elite-hybrid', site);
    expect(ev?.metrics.find((m) => m.key === 'firmness_level')?.rawValue).toBe('Medium-Firm (51 Pa/mm)');
    await expect(site.upsertReview(bearWrite())).rejects.toThrow(/read-only/);
  });
});

describe('getRtingsRepository', () => {
  it('without Supabase credentials the server gets the read-only snapshot store, never a writable one', () => {
    const keys = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL'] as const;
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    try {
      const repo = getRtingsRepository();
      expect(repo.kind).toBe('file');
      expect(isWritableRepository(repo)).toBe(false);
    } finally {
      for (const k of keys) if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  });
});
