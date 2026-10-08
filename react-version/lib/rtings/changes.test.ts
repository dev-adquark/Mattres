import { describe, expect, it } from 'vitest';
import { diffReview } from './changes';
import { computeFingerprint, fingerprintInputOf } from './fingerprint';
import {
  REAL_IDS,
  realRecord,
  realRecords,
  syntheticFirmnessChanged,
  syntheticImageChanged,
  syntheticRescrapedOnly,
  syntheticRetitled,
} from './__fixtures__/records';
import { storedFrom, toNormalized } from './__fixtures__/normalized';
import type { NormalizedReview } from './types';

const base = () => toNormalized(realRecord(REAL_IDS.bearEliteHybrid));

/** Synthetic content the actor has never returned; used only to prove verdict changes are detected. */
const SYNTHETIC_VERDICT = 'SYNTHETIC TEST VERDICT (not RTINGS text)';

describe('computeFingerprint', () => {
  it('is 64 lowercase hex characters (sha256)', () => {
    expect(computeFingerprint(base())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic and unique across the 20 real records', () => {
    const fps = realRecords().map((r) => computeFingerprint(toNormalized(r)));
    expect(realRecords().map((r) => computeFingerprint(toNormalized(r)))).toEqual(fps);
    expect(new Set(fps).size).toBe(20);
  });

  it('ignores scrapedAt/retrievedAt, commentCount and run ids', () => {
    const a = base();
    const b = toNormalized(syntheticRescrapedOnly(), { apifyRunId: 'TEST_RUN_other', datasetId: 'TEST_DATASET_other', receivedAt: '2026-10-06T09:00:00.000Z' });
    expect(computeFingerprint(b)).toBe(computeFingerprint(a));
  });

  it('ignores score, image and recommendedFor ordering', () => {
    const a = base();
    const shuffled: NormalizedReview = { ...a, scores: [...a.scores].reverse(), recommendedFor: [...a.recommendedFor].reverse(), images: [...a.images].reverse() };
    expect(computeFingerprint(shuffled)).toBe(computeFingerprint(a));
  });

  it('ignores title reformatting that canonicalizes to the same URL', () => {
    const retitled = toNormalized(syntheticRetitled());
    expect(retitled.reviewUrl).toBe(base().reviewUrl);
  });

  it('fingerprintInputOf sorts scores by key and carries the version', () => {
    const input = fingerprintInputOf(base());
    expect(input.v).toBe(1);
    const keys = input.scores.map((s) => s.metricKey);
    expect(keys).toEqual([...keys].sort());
    expect(input).not.toHaveProperty('retrievedAt');
  });
});

describe('diffReview: change detection', () => {
  it('created when nothing is stored', () => {
    const next = base();
    const fp = computeFingerprint(next);
    expect(diffReview(null, next, fp)).toMatchObject({ kind: 'created', oldFingerprint: null, newFingerprint: fp, changedFields: [] });
  });

  it('unchanged when the fingerprint is the same (rescrape only)', () => {
    const prev = base();
    const stored = storedFrom(prev, computeFingerprint(prev));
    const next = toNormalized(syntheticRescrapedOnly(), { apifyRunId: 'TEST_RUN_2' });
    const change = diffReview(stored, next, computeFingerprint(next));
    expect(change.kind).toBe('unchanged');
    expect(change.changedFields).toEqual([]);
  });

  it('score changed: reports scores.<key> with old and new values', () => {
    const prev = base();
    const stored = storedFrom(prev, computeFingerprint(prev));
    const next = toNormalized(syntheticFirmnessChanged());
    const fp = computeFingerprint(next);
    expect(fp).not.toBe(stored.review.fingerprint);
    const change = diffReview(stored, next, fp);
    expect(change.kind).toBe('updated');
    expect(change.changedFields).toEqual(['scores.firmness_level']);
    expect(JSON.stringify(change.oldValues)).toContain('Medium-Firm (51 Pa/mm)');
    expect(JSON.stringify(change.newValues)).toContain('Firm (99 Pa/mm)');
    expect(change.oldFingerprint).toBe(stored.review.fingerprint);
  });

  it('a metric that disappears is a change (never silently treated as 0)', () => {
    const prev = base();
    const stored = storedFrom(prev, computeFingerprint(prev));
    const next: NormalizedReview = { ...prev, scores: prev.scores.filter((s) => s.metricKey !== 'firmness_level') };
    const change = diffReview(stored, next, computeFingerprint(next));
    expect(change.kind).toBe('updated');
    expect(change.changedFields).toContain('scores.firmness_level');
  });

  it('verdict changed: reports verdict', () => {
    const prev = base();
    const stored = storedFrom(prev, computeFingerprint(prev));
    const next: NormalizedReview = { ...prev, verdict: SYNTHETIC_VERDICT };
    const fp = computeFingerprint(next);
    expect(fp).not.toBe(stored.review.fingerprint);
    const change = diffReview(stored, next, fp);
    expect(change.kind).toBe('updated');
    expect(change.changedFields).toEqual(['verdict']);
    expect(change.newValues).toMatchObject({ verdict: SYNTHETIC_VERDICT });
  });

  it('image changed: reports images', () => {
    const prev = base();
    const stored = storedFrom(prev, computeFingerprint(prev));
    const next = toNormalized(syntheticImageChanged());
    const fp = computeFingerprint(next);
    expect(fp).not.toBe(stored.review.fingerprint);
    const change = diffReview(stored, next, fp);
    expect(change.kind).toBe('updated');
    expect(change.changedFields).toEqual(['images']);
  });

  it('several changes are all listed', () => {
    const prev = base();
    const stored = storedFrom(prev, computeFingerprint(prev));
    const changed = toNormalized(syntheticFirmnessChanged());
    const next: NormalizedReview = { ...changed, verdict: SYNTHETIC_VERDICT, images: toNormalized(syntheticImageChanged()).images };
    const change = diffReview(stored, next, computeFingerprint(next));
    expect([...change.changedFields].sort()).toEqual(['images', 'scores.firmness_level', 'verdict']);
  });
});
