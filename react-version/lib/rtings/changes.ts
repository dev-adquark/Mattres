/**
 * Change detection between the stored review and a fresh normalization
 * (brief sections 15-16). Pure.
 *
 * The fingerprint decides WHETHER something changed; this module says WHAT
 * changed, as field paths with old and new values, for rtings_change_log:
 *   'identity.<field>', 'overallScore', 'verdict', 'pros', 'cons',
 *   'mixedSummary', 'recommendedFor', 'publishedAt', 'sourceUpdatedAt',
 *   'scores.<metric_key>', 'images'.
 */

import { FINGERPRINT_VERSION } from './types';
import type { NormalizedReview, ReviewChange, RtingsImageRow, RtingsReviewRow, StoredReview } from './types';

type ScoreView = { rawValue: string | null; value: number | null } | null;

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Dates compare by instant: '2026-01-30T17:38:27Z' equals '2026-01-30T17:38:27.000+00:00'. */
function sameInstant(a: string | null, b: string | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return a === b;
  return ta === tb;
}

function sameStringArray(a: readonly string[] | null, b: readonly string[] | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

/**
 * Images the latest stored read returned. upsertImages never deletes, so a
 * review keeps every image reference it ever had; the ones written with the
 * review's current retrieved_at are the current ones.
 */
export function currentImages(stored: StoredReview): RtingsImageRow[] {
  const retrievedAt = Date.parse(stored.review.retrieved_at);
  if (!Number.isFinite(retrievedAt)) return stored.images;
  return stored.images.filter((img) => {
    const t = Date.parse(img.scraped_at);
    return !Number.isFinite(t) || t >= retrievedAt;
  });
}

const IDENTITY_FIELDS: readonly [keyof NormalizedReview, keyof RtingsReviewRow][] = [
  ['productId', 'product_id'],
  ['reviewUrl', 'review_url'],
  ['brand', 'brand'],
  ['productName', 'product_name'],
  ['model', 'model'],
];

export function diffReview(existing: StoredReview | null, next: NormalizedReview, nextFingerprint: string): ReviewChange {
  if (!existing) {
    return { kind: 'created', oldFingerprint: null, newFingerprint: nextFingerprint, changedFields: [], oldValues: {}, newValues: {} };
  }
  const row = existing.review;
  if (row.fingerprint === nextFingerprint && Number(row.fingerprint_version) === FINGERPRINT_VERSION) {
    return { kind: 'unchanged', oldFingerprint: row.fingerprint, newFingerprint: nextFingerprint, changedFields: [], oldValues: {}, newValues: {} };
  }

  const changedFields: string[] = [];
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const record = (field: string, oldValue: unknown, newValue: unknown): void => {
    changedFields.push(field);
    oldValues[field] = oldValue;
    newValues[field] = newValue;
  };

  for (const [nextKey, rowKey] of IDENTITY_FIELDS) {
    if (next[nextKey] !== row[rowKey]) record(`identity.${nextKey}`, row[rowKey], next[nextKey]);
  }

  const oldOverall = numOrNull(row.overall_score);
  if (oldOverall !== next.overallScore) record('overallScore', oldOverall, next.overallScore);
  if ((row.verdict ?? null) !== next.verdict) record('verdict', row.verdict ?? null, next.verdict);
  if (!sameStringArray(row.pros ?? null, next.pros)) record('pros', row.pros ?? null, next.pros);
  if (!sameStringArray(row.cons ?? null, next.cons)) record('cons', row.cons ?? null, next.cons);
  if ((row.mixed_summary ?? null) !== next.mixedSummary) record('mixedSummary', row.mixed_summary ?? null, next.mixedSummary);

  const oldTags = sorted(row.recommended_for ?? []);
  const newTags = sorted(next.recommendedFor);
  if (!sameStringArray(oldTags, newTags)) record('recommendedFor', row.recommended_for ?? [], next.recommendedFor);

  if (!sameInstant(row.published_at, next.publishedAt)) record('publishedAt', row.published_at, next.publishedAt);
  if (!sameInstant(row.source_updated_at, next.sourceUpdatedAt)) record('sourceUpdatedAt', row.source_updated_at, next.sourceUpdatedAt);

  const oldScores = new Map<string, ScoreView>(existing.scores.map((s) => [s.metric_key, { rawValue: s.raw_value, value: numOrNull(s.value) }]));
  const newScores = new Map<string, ScoreView>(next.scores.map((s) => [s.metricKey, { rawValue: s.rawValue, value: s.value }]));
  for (const key of sorted(Array.from(new Set([...oldScores.keys(), ...newScores.keys()])))) {
    const before = oldScores.get(key) ?? null;
    const after = newScores.get(key) ?? null;
    if (before?.rawValue !== after?.rawValue || before?.value !== after?.value) record(`scores.${key}`, before, after);
  }

  const oldImages = sorted(currentImages(existing).map((img) => img.image_url));
  const newImages = sorted(next.images.map((img) => img.imageUrl));
  if (!sameStringArray(oldImages, newImages)) record('images', oldImages, newImages);

  if (Number(row.fingerprint_version) !== FINGERPRINT_VERSION) record('fingerprintVersion', row.fingerprint_version, FINGERPRINT_VERSION);

  return { kind: 'updated', oldFingerprint: row.fingerprint, newFingerprint: nextFingerprint, changedFields, oldValues, newValues };
}
