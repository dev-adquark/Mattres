import { describe, expect, it } from 'vitest';
import { dedupeBatch } from './dedupe';
import { computeFingerprint } from './fingerprint';
import { REAL_IDS, realRecord, realRecords, syntheticFirmnessChanged, syntheticRetitled } from './__fixtures__/records';
import { toNormalized } from './__fixtures__/normalized';

describe('dedupeBatch', () => {
  it('keeps all 20 real records (the real sample has no duplicates)', () => {
    const result = dedupeBatch(realRecords().map((r) => toNormalized(r)));
    expect(result.unique).toHaveLength(20);
    expect(result.duplicates).toEqual([]);
  });

  it('same product id: keeps one, last occurrence wins', () => {
    const first = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
    const second = toNormalized(syntheticFirmnessChanged(REAL_IDS.bearEliteHybrid));
    const other = toNormalized(realRecord(REAL_IDS.leesaOriginal));
    const result = dedupeBatch([first, other, second]);
    expect(result.unique).toHaveLength(2);
    const bear = result.unique.find((r) => r.productId === REAL_IDS.bearEliteHybrid)!;
    expect(bear.scores.find((s) => s.metricKey === 'firmness_level')?.rawValue).toBe('Firm (99 Pa/mm)');
    expect(result.duplicates).toEqual([
      expect.objectContaining({ productId: REAL_IDS.bearEliteHybrid, keptIndex: 2, droppedIndex: 0 }),
    ]);
  });

  it('same RTINGS URL under a different product id is one review (canonical URL key)', () => {
    const a = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
    const bRaw = syntheticRetitled(REAL_IDS.bearEliteHybrid); // upper-cased host, query, hash, trailing slash
    bRaw.productId = '99999999'; // synthetic: actor re-keyed the product
    const b = toNormalized(bRaw);
    expect(b.reviewUrl).toBe(a.reviewUrl);
    const result = dedupeBatch([a, b]);
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0]!.productId).toBe('99999999');
    expect(result.duplicates).toHaveLength(1);
  });

  it('same fingerprint (an exact repeat) collapses to one and fingerprints match', () => {
    const a = toNormalized(realRecord(REAL_IDS.leesaOriginal));
    const b = toNormalized(realRecord(REAL_IDS.leesaOriginal));
    expect(computeFingerprint(a)).toBe(computeFingerprint(b));
    expect(dedupeBatch([a, b]).unique).toHaveLength(1);
  });

  it('title reformatting alone does not create a second review', () => {
    const a = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
    const b = toNormalized(syntheticRetitled(REAL_IDS.bearEliteHybrid));
    expect(b.brandKey).toBe(a.brandKey);
    expect(dedupeBatch([a, b]).unique).toHaveLength(1);
  });

  it('an empty batch is empty', () => {
    expect(dedupeBatch([])).toEqual({ unique: [], duplicates: [] });
  });
});
