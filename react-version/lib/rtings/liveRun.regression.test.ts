/**
 * Regression guard built from the first controlled live run
 * (Apify run UfDUazV8gNM2kE3Zh, dataset rZ7Ityg5qDgWuve2V, 2026-10-07).
 * The fixture is a trimmed byte copy of 6 of the 20 items saved in
 * data/raw/rtings-live-UfDUazV8gNM2kE3Zh.json. No network: the ApifyPort is
 * a fake that replays the fixture.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));

import live from './__fixtures__/rtings-live-UfDUazV8gNM2kE3Zh.real.json';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { ApifyPort } from '@/lib/apify/apifyClient';
import { validateRawRecord } from './validate';
import { normalizeRecord } from './normalize';
import { matchToCatalog } from './match';
import type { CatalogIdentity } from './match';
import { InMemoryRtingsRepository } from './repository';
import { runRtingsPipeline } from './syncPipeline';
import { loadPublishedEvidence } from './evidence';
import { RTINGS_RAW_KNOWN_FIELDS } from './types';
import type { NormalizedReview } from './types';

const CATALOG = catalogJson as unknown as CatalogIdentity[];
const ITEMS = live as Record<string, unknown>[];
const CTX = { apifyActorId: 'dCa1uCOn8ZtEkUamC', apifyRunId: 'UfDUazV8gNM2kE3Zh', datasetId: 'rZ7Ityg5qDgWuve2V', receivedAt: '2026-10-07T11:15:40.000Z' };
const NOW = new Date('2026-10-07T11:16:00.000Z');

function normalized(productId: string): NormalizedReview {
  const item = ITEMS.find((i) => i.productId === productId);
  const v = validateRawRecord(item, NOW);
  if (!v.ok) throw new Error(`fixture ${productId} failed validation`);
  const n = normalizeRecord(v.record, { ...CTX, now: NOW });
  if (!n.ok) throw new Error(`fixture ${productId} failed normalization`);
  return n.review;
}

describe('live run UfDUazV8gNM2kE3Zh (real actor output)', () => {
  it('returns only fields the normalizer knows (no schema drift)', () => {
    const known = new Set<string>(RTINGS_RAW_KNOWN_FIELDS);
    for (const item of ITEMS) expect(Object.keys(item).filter((k) => !known.has(k))).toEqual([]);
  });

  it('every item validates; verdict, pros, cons and overall score stay null because the actor returned none', () => {
    for (const item of ITEMS) {
      const r = normalized(item.productId as string);
      expect(r.verdict).toBeNull();
      expect(r.pros).toBeNull();
      expect(r.cons).toBeNull();
      expect(r.overallScore).toBeNull();
    }
  });

  it('parses the firmness measurement verbatim and never turns featuredTests score 0 into a metric value', () => {
    const bear = normalized('52386');
    const firmness = bear.scores.find((s) => s.metricKey === 'firmness_level');
    expect(firmness).toMatchObject({ rawValue: 'Medium-Firm (51 Pa/mm)', value: 51, scale: 'Pa/mm', valueKind: 'measurement' });
    expect(bear.scores.find((s) => s.metricKey === 'bed_in_a_box')).toMatchObject({ value: 1, valueKind: 'boolean' });
    expect(bear.scores.some((s) => s.value === 0 && s.valueKind === 'score_0_10')).toBe(false);
  });

  it('keeps RTINGS first-published and last-updated dates apart', () => {
    const legacy = normalized('109858');
    expect(legacy.publishedAt).toBe(new Date('2025-10-23T09:03:27-04:00').toISOString());
    expect(legacy.sourceUpdatedAt).toBe(new Date('2026-09-15T09:49:07-04:00').toISOString());
  });

  it('matches against the real catalog exactly as the live run did', () => {
    expect(matchToCatalog(normalized('52386'), CATALOG, [])).toMatchObject({ kind: 'matched', mattressId: 'bear-elite-hybrid', confidence: 'exact' });
    expect(matchToCatalog(normalized('60405'), CATALOG, [])).toMatchObject({ kind: 'matched', mattressId: 'casper-cooling-select', confidence: 'high' });
    expect(matchToCatalog(normalized('105249'), CATALOG, []).kind).toBe('ambiguous');
    expect(matchToCatalog(normalized('57746'), CATALOG, []).kind).toBe('ambiguous');
    expect(matchToCatalog(normalized('124347'), CATALOG, []).kind).toBe('new_candidate');
    expect(matchToCatalog(normalized('109858'), CATALOG, []).kind).toBe('new_candidate');
  });

  it('a listing-only category run is partial coverage and publishes only the matched reviews', async () => {
    const info = { runId: 'UfDUazV8gNM2kE3Zh', status: 'SUCCEEDED', defaultDatasetId: 'rZ7Ityg5qDgWuve2V', usageTotalUsd: null, startedAt: null, finishedAt: null };
    const apify: ApifyPort = { actorId: 'dCa1uCOn8ZtEkUamC', startRun: async () => info, getRun: async () => info, getDatasetItems: async () => structuredClone(ITEMS) };
    const repo = new InMemoryRtingsRepository({ now: () => NOW });
    const summary = await runRtingsPipeline({
      trigger: 'manual',
      triggerSource: 'cli',
      input: { mode: 'byCategory', category: 'mattress', sortBy: 'newest', maxItems: 200 },
      repo,
      apify,
      catalog: CATALOG,
      aliases: [],
      now: () => NOW,
      waitBudgetMs: 0,
    });
    expect(summary).toMatchObject({ status: 'success', coverage: 'partial' });
    expect(summary.counts).toMatchObject({ received: 6, valid: 6, rejected: 0, published: 2, pending: 2, newCandidate: 2, sourceMissing: 0 });
    const ev = await loadPublishedEvidence('bear-elite-hybrid', repo);
    expect(ev?.reviewUrl).toBe('https://www.rtings.com/mattress/reviews/bear/elite-hybrid');
    expect(ev?.licensedImages).toEqual([]);
    expect(ev?.metrics.find((m) => m.key === 'firmness_level')?.rawValue).toBe('Medium-Firm (51 Pa/mm)');
    expect(ev?.provenance).toEqual({ apifyActorId: 'dCa1uCOn8ZtEkUamC', apifyRunId: 'UfDUazV8gNM2kE3Zh', datasetId: 'rZ7Ityg5qDgWuve2V' });
  });
});
