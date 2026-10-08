import { describe, expect, it } from 'vitest';
import { metricKeyFromLabel, normalizeRecord, toBrandKey, toModelKey } from './normalize';
import { validateRawRecord } from './validate';
import type { NormalizedReview, ValidatedRawRecord } from './types';
import {
  NORMALIZE_CTX,
  RECEIVED_AT,
  REAL_IDS,
  realRecord,
  realRecords,
  syntheticNaNMeasurement,
  syntheticNegativeMeasurement,
} from './__fixtures__/records';

function validated(raw: unknown): ValidatedRawRecord {
  const v = validateRawRecord(raw);
  if (!v.ok) throw new Error(`fixture failed validation: ${JSON.stringify(v.problems)}`);
  return v.record;
}

function normalize(raw: unknown): NormalizedReview {
  const n = normalizeRecord(validated(raw), NORMALIZE_CTX);
  if (!n.ok) throw new Error(`fixture failed normalization: ${JSON.stringify(n.problems)}`);
  return n.review;
}

describe('brand normalization', () => {
  it('treats "&" and "and" as the same brand', () => {
    expect(toBrandKey('Tuft & Needle')).toBe(toBrandKey('Tuft and Needle'));
    expect(toBrandKey('Silk & Snow')).toBe(toBrandKey('Silk and Snow'));
  });

  it('is case and punctuation insensitive', () => {
    expect(toBrandKey('Tempur-Pedic')).toBe(toBrandKey('TEMPUR PEDIC'));
    expect(toBrandKey('  Bear ')).toBe(toBrandKey('bear'));
  });

  it('keeps different brands apart', () => {
    expect(toBrandKey('Casper')).not.toBe(toBrandKey('Helix'));
  });
});

describe('model normalization', () => {
  it('removes the brand and filler words so title reformatting does not change the key', () => {
    expect(toModelKey('Bear Elite Hybrid', 'Bear')).toBe(toModelKey('Elite Hybrid', 'Bear'));
    expect(toModelKey('Big Fig Mattress', 'Big Fig')).toBe(toModelKey('BIG FIG MATTRESS', 'Big Fig'));
    expect(toModelKey('Elite Hybrid', 'Bear')).toBe(toModelKey('The Elite Hybrid Mattress', 'Bear'));
    expect(toModelKey('TEMPUR-Adapt', 'Tempur-Pedic')).toBe(toModelKey('Tempur-Adapt', 'Tempur-Pedic'));
  });

  it('never returns an empty key for a model that is only filler words', () => {
    expect(toModelKey('Mattress', 'Big Fig').length).toBeGreaterThan(0);
  });

  it('keeps different tiers apart (never fuzzy)', () => {
    expect(toModelKey('Midnight Luxe 2025', 'Helix')).not.toBe(toModelKey('Midnight', 'Helix'));
    expect(toModelKey('RestorePlus Hybrid', 'Purple')).not.toBe(toModelKey('Restore Hybrid', 'Purple'));
  });

  it('strips the brand prefix from the real product name into model', () => {
    const review = normalize(realRecord(REAL_IDS.bearEliteHybrid));
    expect(review.productName).toBe('Bear Elite Hybrid');
    expect(review.brand).toBe('Bear');
    expect(review.model).toBe('Elite Hybrid');
    expect(review.brandKey).toBe(toBrandKey('Bear'));
    expect(review.modelKey).toBe(toModelKey('Elite Hybrid', 'Bear'));
  });

  it('metricKeyFromLabel produces snake_case keys matching ^[a-z0-9_]+$', () => {
    expect(metricKeyFromLabel('Firmness Level')).toBe('firmness_level');
    expect(metricKeyFromLabel('Bed-In-A-Box')).toBe('bed_in_a_box');
    for (const r of realRecords()) {
      for (const label of Object.keys(r.testScoresFlat as Record<string, string>)) {
        expect(metricKeyFromLabel(label)).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });
});

describe('score conversion', () => {
  const review = normalize(realRecord(REAL_IDS.allswellHybrid));
  const byKey = new Map(review.scores.map((s) => [s.metricKey, s]));

  it('parses "Medium-Firm (54 Pa/mm)" as a measurement and keeps the raw text', () => {
    expect(byKey.get('firmness_level')).toMatchObject({
      metricLabel: 'Firmness Level',
      rawValue: 'Medium-Firm (54 Pa/mm)',
      value: 54,
      scale: 'Pa/mm',
      valueKind: 'measurement',
    });
  });

  it('parses Yes/No as boolean 1/0', () => {
    expect(byKey.get('bed_in_a_box')).toMatchObject({ rawValue: 'Yes', value: 1, valueKind: 'boolean' });
    const noBox = normalize(realRecord('122826')); // Sleep On Latex Hybrid: "Bed-In-A-Box": "No"
    expect(noBox.scores.find((s) => s.metricKey === 'bed_in_a_box')).toMatchObject({ rawValue: 'No', value: 0, valueKind: 'boolean' });
  });

  it('keeps any other text as a label with value null (never 0)', () => {
    expect(byKey.get('mattress_type')).toMatchObject({ rawValue: 'Hybrid', value: null, scale: null, valueKind: 'label' });
  });

  it('emits exactly one row per returned metric and none for metrics not returned', () => {
    const raw = realRecord(REAL_IDS.allswellHybrid);
    expect(review.scores).toHaveLength(Object.keys(raw.testScoresFlat as object).length);
    expect(byKey.has('overall')).toBe(false);
  });

  it('ignores featuredTests[].score === 0 (a placeholder, not a rating)', () => {
    expect(review.overallScore).toBeNull();
    expect(review.scores.some((s) => s.valueKind === 'score_0_10' && s.value === 0)).toBe(false);
  });

  it('never stores a negative or NaN measurement', () => {
    for (const make of [syntheticNegativeMeasurement, syntheticNaNMeasurement]) {
      const v = validateRawRecord(make());
      if (!v.ok) {
        expect(v.problems.map((p) => p.code)).toContain('INVALID_SCORE');
        continue;
      }
      const n = normalizeRecord(v.record, NORMALIZE_CTX);
      if (!n.ok) continue;
      const firmness = n.review.scores.find((s) => s.metricKey === 'firmness_level');
      if (firmness && firmness.value !== null) {
        expect(Number.isFinite(firmness.value)).toBe(true);
        expect(firmness.value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every real record yields only valid value kinds and in-range values', () => {
    for (const r of realRecords()) {
      for (const s of normalize(r).scores) {
        if (s.valueKind === 'score_0_10') expect(s.value === null || (s.value >= 0 && s.value <= 10)).toBe(true);
        if (s.valueKind === 'measurement') expect(s.value).toBeGreaterThanOrEqual(0);
        if (s.valueKind === 'boolean') expect([0, 1]).toContain(s.value);
        if (s.valueKind === 'label') expect(s.value).toBeNull();
      }
    }
  });
});

describe('content fields the actor did not return stay null (never invented)', () => {
  it.each(realRecords().map((r) => [String(r.productId)] as const))('record %s', (id) => {
    const review = normalize(realRecord(id));
    expect(review.verdict).toBeNull();
    expect(review.pros).toBeNull();
    expect(review.cons).toBeNull();
    expect(review.mixedSummary).toBeNull();
    expect(review.overallScore).toBeNull();
  });
});

describe('dates and provenance', () => {
  it('publishedAt = firstPublishedAt when returned; sourceUpdatedAt = publishedAt', () => {
    const review = normalize(realRecord(REAL_IDS.casperCoolingSelect));
    // Real record: firstPublishedAt "2026-02-02 12:45:43 -0500"
    expect(review.publishedAt).toBe('2026-02-02T17:45:43.000Z');
    expect(review.sourceUpdatedAt).not.toBeNull();
    expect(review.sourceUpdatedAt).not.toBe(review.publishedAt);
  });

  it('publishedAt falls back to publishedAt when firstPublishedAt is absent', () => {
    const review = normalize(realRecord(REAL_IDS.allswellHybrid));
    expect(review.publishedAt).toBe('2026-01-30T17:38:27.000Z');
    expect(review.sourceUpdatedAt).toBe('2026-01-30T17:38:27.000Z');
  });

  it('retrievedAt uses a valid scrapedAt, else the receive time', () => {
    expect(normalize(realRecord(REAL_IDS.allswellHybrid)).provenance.retrievedAt).toMatch(/^2026-09-25T13:02:20/);
    const noScrape = realRecord(REAL_IDS.allswellHybrid);
    delete noScrape.scrapedAt;
    expect(normalize(noScrape).provenance.retrievedAt).toBe(RECEIVED_AT);
  });

  it('carries RTINGS provenance and the run context verbatim', () => {
    const review = normalize(realRecord(REAL_IDS.allswellHybrid));
    expect(review.provenance).toMatchObject({
      source: 'RTINGS',
      sourceType: 'independent_review',
      sourceUrl: 'https://www.rtings.com/mattress/reviews/allswell/hybrid-mattress',
      apifyActorId: NORMALIZE_CTX.apifyActorId,
      apifyRunId: NORMALIZE_CTX.apifyRunId,
      datasetId: NORMALIZE_CTX.datasetId,
    });
  });

  it('turns the real mainImageUrl into one source image (alt never generated)', () => {
    const raw = realRecord(REAL_IDS.allswellHybrid);
    const review = normalize(raw);
    expect(review.images).toEqual([
      { sourceUrl: review.reviewUrl, imageUrl: String(raw.mainImageUrl), sourceField: 'mainImageUrl', alt: null },
    ]);
  });

  it('drops recommendedFor when it is only RTINGS section navigation (the real actor output)', () => {
    const raw = realRecord(REAL_IDS.allswellHybrid);
    expect(raw.recommendedFor).toEqual(expect.arrayContaining(['Side Sleeping', 'Cooling']));
    expect(normalize(raw).recommendedFor).toEqual([]);
  });

  it('keeps a recommendedFor list that holds a tag outside the section headings', () => {
    const raw = { ...realRecord(REAL_IDS.allswellHybrid), recommendedFor: ['Side Sleepers', 'Side Sleeping'] };
    expect([...normalize(raw).recommendedFor].sort()).toEqual(['Side Sleepers', 'Side Sleeping']);
  });
});

describe('documented editorial fields (verdict, pros, cons, overallScore)', () => {
  // SYNTHETIC values on a real record: the actor documents these fields but has not returned them for mattresses yet.
  const withEditorial = () => ({
    ...realRecord(REAL_IDS.bearEliteHybrid),
    overallScore: 7.8,
    verdict: '  SYNTHETIC TEST VERDICT paragraph.  ',
    pros: ['SYNTHETIC PRO one', ' SYNTHETIC PRO two ', '', 'SYNTHETIC PRO one'],
    cons: ['SYNTHETIC CON'],
  });

  it('maps them verbatim (trimmed, blanks and duplicates dropped) when present and well typed', () => {
    const review = normalize(withEditorial());
    expect(review.overallScore).toBe(7.8);
    expect(review.verdict).toBe('SYNTHETIC TEST VERDICT paragraph.');
    expect(review.pros).toEqual(['SYNTHETIC PRO one', 'SYNTHETIC PRO two']);
    expect(review.cons).toEqual(['SYNTHETIC CON']);
    // The mixed-notes field name is undocumented, so it is never guessed.
    expect(review.mixedSummary).toBeNull();
  });

  it('drops wrongly typed values to null with a MALFORMED_FIELD warning (never coerced)', () => {
    const raw = { ...withEditorial(), overallScore: '7.8', verdict: ['not', 'a', 'string'], pros: 'not an array', cons: [1, 2] };
    const v = validateRawRecord(raw);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.warnings.filter((w) => w.code === 'MALFORMED_FIELD').map((w) => w.field).sort()).toEqual(['cons', 'overallScore', 'pros', 'verdict']);
    const n = normalizeRecord(v.record, NORMALIZE_CTX);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect([n.review.overallScore, n.review.verdict, n.review.pros, n.review.cons]).toEqual([null, null, null, null]);
  });

  it('rejects an overallScore outside 0-10', () => {
    expect(normalize({ ...withEditorial(), overallScore: 42 }).overallScore).toBeNull();
  });

  it('empty lists and blank text stay null, not empty values', () => {
    const review = normalize({ ...withEditorial(), verdict: '   ', pros: [], cons: ['  '] });
    expect([review.verdict, review.pros, review.cons]).toEqual([null, null, null]);
  });
});
