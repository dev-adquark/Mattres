import { describe, expect, it } from 'vitest';
import { canonicalReviewUrl, isRtingsImageUrl, parseSourceDate, validateRawRecord } from './validate';
import type { ValidationProblemCode, ValidationResult } from './types';
import {
  realRecords,
  syntheticAncientDate,
  syntheticForeignDomain,
  syntheticForeignImage,
  syntheticFutureDate,
  syntheticGarbageDate,
  syntheticHttpUrl,
  syntheticLookalikeDomain,
  syntheticNonMattressPath,
  syntheticNotAUrl,
  syntheticTestScoresNotObject,
  syntheticWithout,
  syntheticWrongCategory,
} from './__fixtures__/records';

function codes(result: ValidationResult): ValidationProblemCode[] {
  return result.ok ? result.warnings.map((w) => w.code) : result.problems.map((p) => p.code);
}

describe('validateRawRecord: valid actor response (real sample)', () => {
  it.each(realRecords().map((r) => [r.productId, r] as const))('accepts real record %s', (_id, record) => {
    const result = validateRawRecord(record);
    expect(result.ok, JSON.stringify(codes(result))).toBe(true);
    if (result.ok) {
      expect(result.record.productId).toBe(record.productId);
      expect(result.record.reviewUrl.startsWith('https://www.rtings.com/mattress/')).toBe(true);
      // Nothing fatal is ever returned as a warning.
      expect(result.warnings.every((w) => !w.fatal)).toBe(true);
    }
  });
});

describe('validateRawRecord: missing fields', () => {
  it.each([
    ['productId', 'MISSING_PRODUCT_ID'],
    ['name', 'MISSING_NAME'],
    ['brand', 'MISSING_BRAND'],
    ['reviewUrl', 'INVALID_REVIEW_URL'],
  ] as const)('rejects a record without %s', (field, code) => {
    const result = validateRawRecord(syntheticWithout(field));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems.some((p) => p.fatal)).toBe(true);
      expect(result.problems.map((p) => p.code)).toContain(code);
    }
  });

  it('rejects an empty-string productId', () => {
    const r = realRecords()[0]!;
    r.productId = '   ';
    expect(validateRawRecord(r).ok).toBe(false);
  });

  it('rejects a name that is only the brand (no model left)', () => {
    const r = realRecords()[0]!;
    r.name = r.brand;
    const result = validateRawRecord(r);
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('MISSING_MODEL');
  });

  it.each([null, undefined, 42, 'string', [1, 2]])('rejects a non-object item: %s', (input) => {
    const result = validateRawRecord(input);
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('NOT_AN_OBJECT');
  });

  it('accepts a record missing only optional fields (they normalize to null later)', () => {
    const r = syntheticWithout('mainImageUrl');
    delete r.testBenchName;
    delete r.commentCount;
    expect(validateRawRecord(r).ok).toBe(true);
  });
});

describe('validateRawRecord: malformed URLs', () => {
  it.each([
    ['foreign domain', syntheticForeignDomain],
    ['look-alike domain', syntheticLookalikeDomain],
    ['plain http', syntheticHttpUrl],
    ['not a URL', syntheticNotAUrl],
    ['non-mattress RTINGS path', syntheticNonMattressPath],
  ])('rejects %s', (_label, make) => {
    const result = validateRawRecord(make());
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('INVALID_REVIEW_URL');
  });

  it('rejects a wrong category', () => {
    const result = validateRawRecord(syntheticWrongCategory());
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('WRONG_CATEGORY');
  });

  it('drops a non-RTINGS image without rejecting the review', () => {
    const result = validateRawRecord(syntheticForeignImage());
    expect(result.ok).toBe(true);
    expect(codes(result)).toContain('INVALID_IMAGE_URL');
  });
});

describe('validateRawRecord: malformed scores and dates', () => {
  it('flags testScoresFlat of the wrong JSON type without inventing scores', () => {
    const result = validateRawRecord(syntheticTestScoresNotObject());
    expect(codes(result)).toContain('MALFORMED_FIELD');
  });

  it.each([
    ['future', syntheticFutureDate],
    ['pre-2010', syntheticAncientDate],
    ['garbage', syntheticGarbageDate],
  ])('flags a %s publishedAt as INVALID_DATE', (_label, make) => {
    expect(codes(validateRawRecord(make()))).toContain('INVALID_DATE');
  });
});

describe('canonicalReviewUrl', () => {
  it('lowercases the host and strips query, hash and trailing slash', () => {
    expect(canonicalReviewUrl('https://WWW.RTINGS.COM/mattress/reviews/bear/elite-hybrid/?utm_source=x#top')).toBe(
      'https://www.rtings.com/mattress/reviews/bear/elite-hybrid'
    );
  });

  it('is idempotent on a real canonical URL', () => {
    const url = 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid';
    expect(canonicalReviewUrl(url)).toBe(url);
  });

  it.each([
    'http://www.rtings.com/mattress/reviews/bear/elite-hybrid',
    'https://rtings.com.evil.example/mattress/reviews/bear/elite-hybrid',
    'https://www.example.com/mattress/reviews/bear/elite-hybrid',
    'javascript:alert(1)',
    '',
    'not a url',
  ])('returns null for %s', (url) => {
    expect(canonicalReviewUrl(url)).toBeNull();
  });
});

describe('isRtingsImageUrl', () => {
  it('accepts the real i.rtings.com image from the sample', () => {
    expect(isRtingsImageUrl(String(realRecords()[0]!.mainImageUrl))).toBe(true);
  });

  it.each([
    'http://i.rtings.com/assets/products/x/design-small.jpg',
    'https://cdn.example.com/x.jpg',
    'https://i.rtings.com.evil.example/x.jpg',
    'data:image/png;base64,AAAA',
  ])('rejects %s', (url) => {
    expect(isRtingsImageUrl(url)).toBe(false);
  });
});

describe('parseSourceDate', () => {
  it('parses the RTINGS "YYYY-MM-DD HH:MM:SS -0500" format to ISO', () => {
    expect(parseSourceDate('2026-01-30 12:38:27 -0500')).toBe('2026-01-30T17:38:27.000Z');
  });

  it('parses the actor scrapedAt ISO format', () => {
    expect(parseSourceDate('2026-09-25T13:02:20.105339+00:00')).toMatch(/^2026-09-25T13:02:20\.105/);
  });

  it.each([null, undefined, '', 'garbage', 12, '1999-12-31 00:00:00 -0500', '2099-01-01 00:00:00 -0500'])('returns null for %s', (v) => {
    expect(parseSourceDate(v)).toBeNull();
  });
});
