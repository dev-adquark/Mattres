import { describe, expect, it } from 'vitest';
import {
  COUNT_DROP_RATIO,
  INVALID_DOMAIN_RATE,
  MAX_REJECTION_RATE,
  SCHEMA_DRIFT_RATE,
  SCORES_DISAPPEARED_RATE,
  evaluateRunSafety,
} from './safety';
import type { RunSafetyInput } from './safety';
import { computeFingerprint } from './fingerprint';
import { validateRawRecord } from './validate';
import type { NormalizedReview, SafetyFlagCode, ValidationProblem } from './types';
import { realRecords, syntheticForeignDomain, syntheticScoresGone, syntheticWithout } from './__fixtures__/records';
import { storedFrom, toNormalized } from './__fixtures__/normalized';
import { makeRunRow } from './__fixtures__/rows';

/** Runs items through the real validator and builds the safety input the pipeline would. */
function inputFor(items: unknown[], extra: Partial<RunSafetyInput> = {}): RunSafetyInput {
  const rejectedProblems: ValidationProblem[][] = [];
  const warnings: ValidationProblem[][] = [];
  const normalized: NormalizedReview[] = [];
  for (const item of items) {
    const v = validateRawRecord(item);
    if (v.ok) {
      normalized.push(toNormalized(item));
      warnings.push(v.warnings);
    } else rejectedProblems.push(v.problems);
  }
  return { items, validCount: normalized.length, rejectedProblems, warnings, previousPublished: [], lastComparableRun: null, normalized, ...extra };
}

function publishedFrom(reviews: NormalizedReview[]) {
  return reviews.map((r, i) => storedFrom(r, computeFingerprint(r), { id: i + 1, status: 'published', mattress_id: `m-${i}`, match_confidence: 'exact' }));
}

const flagCodes = (input: RunSafetyInput): SafetyFlagCode[] => evaluateRunSafety(input).flags.map((f) => f.code);

describe('thresholds are the contract values', () => {
  it('exports the agreed numbers', () => {
    expect({ COUNT_DROP_RATIO, MAX_REJECTION_RATE, INVALID_DOMAIN_RATE, SCHEMA_DRIFT_RATE, SCORES_DISAPPEARED_RATE }).toEqual({
      COUNT_DROP_RATIO: 0.5,
      MAX_REJECTION_RATE: 0.5,
      INVALID_DOMAIN_RATE: 0.2,
      SCHEMA_DRIFT_RATE: 0.5,
      SCORES_DISAPPEARED_RATE: 0.3,
    });
  });
});

describe('evaluateRunSafety', () => {
  it('the real 20-record sample on a first run is publishable', () => {
    expect(evaluateRunSafety(inputFor(realRecords()))).toEqual({ publishable: true, flags: [], warnings: [] });
  });

  it('the real sample after a comparable 20-item run with the same reviews published is publishable', () => {
    const items = realRecords();
    const input = inputFor(items);
    input.previousPublished = publishedFrom(input.normalized);
    input.lastComparableRun = makeRunRow({ records_received: 20 });
    expect(evaluateRunSafety(input).publishable).toBe(true);
  });

  it('malformed response (not an array) is never publishable', () => {
    const verdict = evaluateRunSafety({ ...inputFor([]), items: { error: 'nope' } });
    expect(verdict.publishable).toBe(false);
    expect(verdict.flags.map((f) => f.code)).toContain('MALFORMED_RESPONSE');
  });

  it('an array of non-objects is malformed', () => {
    expect(flagCodes({ ...inputFor([]), items: [1, 'two', null] })).toContain('MALFORMED_RESPONSE');
  });

  it('empty dataset while reviews are published -> EMPTY_DATASET (never wipe production)', () => {
    const published = publishedFrom(realRecords().slice(0, 3).map((r) => toNormalized(r)));
    const verdict = evaluateRunSafety(inputFor([], { previousPublished: [], previousPublishedCount: published.length }));
    expect(verdict.publishable).toBe(false);
    expect(verdict.flags.map((f) => f.code)).toContain('EMPTY_DATASET');
  });

  it('empty dataset on a fresh store is not flagged (nothing to protect)', () => {
    expect(flagCodes(inputFor([]))).not.toContain('EMPTY_DATASET');
  });

  it('suspicious count drop (3 vs 20) -> COUNT_DROP', () => {
    const verdict = evaluateRunSafety(inputFor(realRecords().slice(0, 3), { lastComparableRun: makeRunRow({ records_received: 20 }) }));
    expect(verdict.publishable).toBe(false);
    expect(verdict.flags.find((f) => f.code === 'COUNT_DROP')?.detail).toMatchObject({ previous: 20, received: 3 });
  });

  it('a drop to exactly half is not flagged', () => {
    expect(flagCodes(inputFor(realRecords().slice(0, 10), { lastComparableRun: makeRunRow({ records_received: 20 }) }))).not.toContain('COUNT_DROP');
  });

  it('high rejection rate -> HIGH_REJECTION_RATE', () => {
    const items = [...realRecords().slice(0, 2), ...Array.from({ length: 4 }, () => syntheticWithout('productId'))];
    expect(flagCodes(inputFor(items))).toContain('HIGH_REJECTION_RATE');
  });

  it('a few rejections (partial invalid) stay publishable', () => {
    const items = [...realRecords(), syntheticWithout('productId'), syntheticWithout('brand')];
    expect(evaluateRunSafety(inputFor(items)).publishable).toBe(true);
  });

  it('many off-domain URLs -> INVALID_DOMAIN', () => {
    const items = [...realRecords().slice(0, 7), syntheticForeignDomain(), syntheticForeignDomain(), syntheticForeignDomain()];
    expect(flagCodes(inputFor(items))).toContain('INVALID_DOMAIN');
  });

  it('new unknown fields on every item are a non-blocking NEW_OPTIONAL_FIELDS warning, not SCHEMA_DRIFT', () => {
    const items = realRecords().map((r) => ({ ...r, unexpectedNewField: 'x' }));
    const verdict = evaluateRunSafety(inputFor(items));
    expect(verdict.publishable).toBe(true);
    expect(verdict.flags).toEqual([]);
    expect(verdict.warnings?.map((w) => w.code)).toEqual(['NEW_OPTIONAL_FIELDS']);
    expect(verdict.warnings?.[0]?.detail).toMatchObject({ withUnknownFields: 20, unknownFields: 'unexpectedNewField' });
  });

  it('the documented verdict/pros/cons/overallScore fields are known: no drift, no warning', () => {
    // Synthetic editorial values (the actor has not returned these for mattresses yet).
    const items = realRecords().map((r) => ({ ...r, overallScore: 7.5, verdict: 'SYNTHETIC TEST VERDICT', pros: ['SYNTHETIC PRO'], cons: ['SYNTHETIC CON'] }));
    expect(evaluateRunSafety(inputFor(items))).toEqual({ publishable: true, flags: [], warnings: [] });
  });

  it('missing required fields on most items -> SCHEMA_DRIFT', () => {
    const items = realRecords().map((r) => ({ ...r, brand: null }));
    expect(flagCodes({ ...inputFor(realRecords()), items })).toContain('SCHEMA_DRIFT');
  });

  it('a known field changing type on most items -> SCHEMA_DRIFT', () => {
    const items = realRecords().map((r) => ({ ...r, pros: 'SYNTHETIC: a string where an array is documented' }));
    expect(flagCodes(inputFor(items))).toContain('SCHEMA_DRIFT');
  });

  it('huge score disappearance on published reviews -> SCORES_DISAPPEARED', () => {
    const before = realRecords().slice(0, 5).map((r) => toNormalized(r));
    const items = realRecords().slice(0, 5).map((r) => syntheticScoresGone(r.productId as string));
    const input = inputFor(items, { previousPublished: publishedFrom(before) });
    expect(flagCodes(input)).toContain('SCORES_DISAPPEARED');
  });

  it('all images suddenly missing -> IMAGES_DISAPPEARED', () => {
    const before = realRecords().slice(0, 5).map((r) => toNormalized(r));
    const items = realRecords().slice(0, 5).map((r) => syntheticWithout('mainImageUrl', r.productId as string));
    expect(flagCodes(inputFor(items, { previousPublished: publishedFrom(before) }))).toContain('IMAGES_DISAPPEARED');
  });

  it('all verdicts missing where verdicts existed -> VERDICTS_DISAPPEARED', () => {
    // Synthetic: the actor has never returned verdicts; this only proves the guard works if it ever does.
    const before = realRecords().slice(0, 3).map((r) => ({ ...toNormalized(r), verdict: 'SYNTHETIC TEST VERDICT' }));
    const input = inputFor(realRecords().slice(0, 3), { previousPublished: publishedFrom(before) });
    expect(flagCodes(input)).toContain('VERDICTS_DISAPPEARED');
  });

  it('any flag makes the run unpublishable', () => {
    const verdict = evaluateRunSafety(inputFor(realRecords().slice(0, 3), { lastComparableRun: makeRunRow({ records_received: 20 }) }));
    expect(verdict.flags.length).toBeGreaterThan(0);
    expect(verdict.publishable).toBe(false);
  });
});
