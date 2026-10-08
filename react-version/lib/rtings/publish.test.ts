import { describe, expect, it } from 'vitest';
import { buildImageWrites, buildReviewWrite, buildScoreWrites, decideStatus } from './publish';
import { computeFingerprint } from './fingerprint';
import type { CatalogMatchResult, ReviewChange, SafetyVerdict } from './types';
import { REAL_IDS, realRecord } from './__fixtures__/records';
import { storedFrom, toNormalized } from './__fixtures__/normalized';

const MATCHED: CatalogMatchResult = { kind: 'matched', mattressId: 'bear-elite-hybrid', method: 'review_url', confidence: 'exact' };
const AMBIGUOUS: CatalogMatchResult = { kind: 'ambiguous', candidates: ['helix-midnight', 'helix-midnight-luxe'], reason: 'test' };
const NEW: CatalogMatchResult = { kind: 'new_candidate', reason: 'test' };
const OK: SafetyVerdict = { publishable: true, flags: [] };
const HELD: SafetyVerdict = { publishable: false, flags: [{ code: 'COUNT_DROP', message: 'test', detail: {} }] };
const change = (kind: ReviewChange['kind']): ReviewChange => ({ kind, oldFingerprint: kind === 'created' ? null : 'a'.repeat(64), newFingerprint: 'b'.repeat(64), changedFields: [], oldValues: {}, newValues: {} });

describe('decideStatus', () => {
  it('matched + publishable -> published', () => {
    expect(decideStatus(MATCHED, OK, change('created'))).toBe('published');
    expect(decideStatus(MATCHED, OK, change('updated'), 'validated')).toBe('published');
  });

  it('matched + held + new -> validated', () => {
    expect(decideStatus(MATCHED, HELD, change('created'))).toBe('validated');
  });

  it('matched + held + changed -> changed', () => {
    expect(decideStatus(MATCHED, HELD, change('updated'), 'validated')).toBe('changed');
  });

  it('a published row stays published while held (site keeps last known good)', () => {
    expect(decideStatus(MATCHED, HELD, change('unchanged'), 'published')).toBe('published');
    expect(decideStatus(MATCHED, HELD, change('updated'), 'published')).toBe('published');
  });

  it('ambiguous -> pending, even on a publishable run', () => {
    expect(decideStatus(AMBIGUOUS, OK, change('created'))).toBe('pending');
  });

  it('no catalog product -> new_candidate, never auto-published', () => {
    expect(decideStatus(NEW, OK, change('created'))).toBe('new_candidate');
  });
});

describe('buildReviewWrite', () => {
  const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
  const fp = computeFingerprint(review);
  const now = '2026-10-07T06:31:00.000Z';

  it('a published write carries the mattress id, exact confidence and site_published_at', () => {
    const w = buildReviewWrite({ review, fingerprint: fp, match: MATCHED, status: 'published', statusReason: null, syncRunId: 3, existing: null, change: change('created'), now });
    expect(w).toMatchObject({
      mattress_id: 'bear-elite-hybrid',
      match_method: 'review_url',
      match_confidence: 'exact',
      status: 'published',
      site_published_at: now,
      source: 'RTINGS',
      source_type: 'independent_review',
      fingerprint: fp,
      fingerprint_version: 1,
      first_seen_at: now,
      sync_run_id: 3,
    });
  });

  it('respects the DB rule: published requires mattress_id and exact/high', () => {
    for (const match of [MATCHED, AMBIGUOUS, NEW]) {
      const status = decideStatus(match, OK, change('created'));
      const w = buildReviewWrite({ review, fingerprint: fp, match, status, statusReason: null, syncRunId: 1, existing: null, change: change('created'), now });
      if (w.status === 'published') {
        expect(w.mattress_id).not.toBeNull();
        expect(['exact', 'high']).toContain(w.match_confidence);
      }
    }
  });

  it('an unchanged re-publish keeps the original site_published_at and first_seen_at', () => {
    const existing = storedFrom(review, fp, { status: 'published', mattress_id: 'bear-elite-hybrid', site_published_at: '2026-09-25T13:06:00.000Z' });
    const w = buildReviewWrite({ review, fingerprint: fp, match: MATCHED, status: 'published', statusReason: null, syncRunId: 4, existing, change: change('unchanged'), now });
    expect(w.site_published_at).toBe('2026-09-25T13:06:00.000Z');
    expect(w.first_seen_at).toBeUndefined();
    expect(w.last_seen_at).toBe(now);
  });

  it('ambiguous writes keep the candidates and no mattress id', () => {
    const w = buildReviewWrite({ review, fingerprint: fp, match: AMBIGUOUS, status: 'pending', statusReason: 'x', syncRunId: 1, existing: null, change: change('created'), now });
    expect(w).toMatchObject({ mattress_id: null, match_confidence: 'ambiguous', match_candidates: ['helix-midnight', 'helix-midnight-luxe'], site_published_at: null });
  });
});

describe('score and image writes', () => {
  const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));

  it('one score write per returned metric, verbatim raw text', () => {
    const writes = buildScoreWrites(review);
    expect(writes).toHaveLength(review.scores.length);
    expect(writes.find((w) => w.metric_key === 'firmness_level')).toMatchObject({ raw_value: 'Medium-Firm (51 Pa/mm)', value: 51, scale: 'Pa/mm', value_kind: 'measurement', source: 'RTINGS' });
  });

  it('image writes never set usage_status (stays source_only in the store)', () => {
    const writes = buildImageWrites(review);
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toHaveProperty('usage_status');
    expect(writes[0]).not.toHaveProperty('license_note');
    expect(writes[0]!.image_url).toMatch(/^https:\/\/i\.rtings\.com\//);
  });
});
