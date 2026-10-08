import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
}));

import { loadPublishedEvidence, toEvidence } from './evidence';
import { computeFingerprint } from './fingerprint';
import { REAL_IDS, realRecord } from './__fixtures__/records';
import { storedFrom, toNormalized } from './__fixtures__/normalized';
import { stubRepository } from './__fixtures__/stubRepository';
import type { RtingsRepository, StoredReview } from './types';

function publishedBear(overrides: Parameters<typeof storedFrom>[2] = {}): StoredReview {
  const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
  return storedFrom(review, computeFingerprint(review), {
    status: 'published',
    mattress_id: 'bear-elite-hybrid',
    match_method: 'review_url',
    match_confidence: 'exact',
    site_published_at: '2026-09-25T13:06:00.000Z',
    ...overrides,
  });
}

function fakeRepo(rows: StoredReview[] | Error): RtingsRepository {
  return stubRepository({
    getPublishedForMattress: async (id: string) => {
      if (rows instanceof Error) throw rows;
      return rows.filter((s) => s.review.mattress_id === id);
    },
  });
}

describe('loadPublishedEvidence', () => {
  it('returns the published RTINGS record with raw metric text and separate dates', async () => {
    const ev = await loadPublishedEvidence('bear-elite-hybrid', fakeRepo([publishedBear()]));
    expect(ev).not.toBeNull();
    expect(ev!.source).toBe('RTINGS');
    expect(ev!.reviewUrl).toBe('https://www.rtings.com/mattress/reviews/bear/elite-hybrid');
    expect(ev!.metrics.find((m) => m.key === 'firmness_level')).toMatchObject({ rawValue: 'Medium-Firm (51 Pa/mm)', value: 51, scale: 'Pa/mm' });
    expect(ev!.sourceUpdatedAt).toBe('2025-08-11T16:47:48.000Z');
    expect(ev!.retrievedAt).not.toBe(ev!.sourceUpdatedAt);
    // Not returned by the actor -> stays null, never invented.
    expect(ev!.verdict).toBeNull();
    expect(ev!.pros).toBeNull();
    expect(ev!.overallScore).toBeNull();
  });

  it.each(['pending', 'validated', 'changed', 'new_candidate', 'source_missing', 'rejected'] as const)(
    'never shows a %s review',
    async (status) => {
      expect(await loadPublishedEvidence('bear-elite-hybrid', fakeRepo([publishedBear({ status })]))).toBeNull();
    }
  );

  it('never shows a review matched to another mattress', async () => {
    expect(await loadPublishedEvidence('casper-snow', fakeRepo([publishedBear()]))).toBeNull();
  });

  it('never shows an ambiguous-confidence row even if marked published', async () => {
    expect(await loadPublishedEvidence('bear-elite-hybrid', fakeRepo([publishedBear({ match_confidence: 'ambiguous' })]))).toBeNull();
  });

  it('returns null (page still renders) when the store throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await loadPublishedEvidence('bear-elite-hybrid', fakeRepo(new Error('TEST: store down')))).toBeNull();
    warn.mockRestore();
  });

  it('returns null for an empty id', async () => {
    expect(await loadPublishedEvidence('', fakeRepo([publishedBear()]))).toBeNull();
  });
});

describe('toEvidence', () => {
  it('omits source_only images and includes licensed ones with their note', () => {
    const stored = publishedBear();
    expect(stored.images[0]!.usage_status).toBe('source_only');
    expect(toEvidence(stored, 'bear-elite-hybrid').licensedImages).toEqual([]);

    const licensed: StoredReview = {
      ...stored,
      images: [{ ...stored.images[0]!, usage_status: 'licensed', license_note: 'TEST-ONLY license note' }],
    };
    expect(toEvidence(licensed, 'bear-elite-hybrid').licensedImages).toEqual([
      { imageUrl: stored.images[0]!.image_url, alt: null, licenseNote: 'TEST-ONLY license note' },
    ]);
  });

  it('only includes metrics that exist (no zero-filled placeholders)', () => {
    const stored = publishedBear();
    const fewer: StoredReview = { ...stored, scores: stored.scores.filter((s) => s.metric_key === 'firmness_level') };
    const ev = toEvidence(fewer, 'bear-elite-hybrid');
    expect(ev.metrics.map((m) => m.key)).toEqual(['firmness_level']);
  });
});

describe('evidence module boundaries', () => {
  it('never imports the Apify client (a page view can never start a scrape)', () => {
    const src = fs.readFileSync(path.join(import.meta.dirname, 'evidence.ts'), 'utf8');
    expect(src).not.toMatch(/from\s+['"][^'"]*apify/);
  });
});
