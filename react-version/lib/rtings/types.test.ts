import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IMAGE_USAGE_STATUSES,
  MATCH_CONFIDENCES,
  MATCH_METHODS,
  REVIEW_STATUSES,
  RTINGS_RAW_KNOWN_FIELDS,
  RTINGS_RAW_REQUIRED_FIELDS,
  SCORE_VALUE_KINDS,
  SYNC_COVERAGES,
  SYNC_RUN_STATUSES,
  SYNC_TRIGGERS,
} from './types';

// vitest runs from react-version/; the migration and the real actor sample live at the repo root.
const REPO_ROOT = path.join(process.cwd(), '..');
const MIGRATION = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '0005_rtings_pipeline.sql'), 'utf8');
const SAMPLE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'raw', 'rtings-mattresses-raw.json'), 'utf8')) as Record<string, unknown>[];

/** The quoted values of the `<column> in (...)` check that follows `constraintName` in the migration. */
function checkValues(constraintName: string): string[] {
  const start = MIGRATION.indexOf(constraintName);
  expect(start, `${constraintName} exists in 0005`).toBeGreaterThan(-1);
  const inList = MIGRATION.slice(start).match(/in \(([^)]*)\)/);
  expect(inList).not.toBeNull();
  return Array.from((inList as RegExpMatchArray)[1]!.matchAll(/'([^']+)'/g), (m) => m[1] as string);
}

describe('RTINGS types match migration 0005', () => {
  it.each([
    ['rtings_reviews_status_check', REVIEW_STATUSES],
    ['rtings_reviews_match_method_check', MATCH_METHODS],
    ['rtings_reviews_match_confidence_check', MATCH_CONFIDENCES],
    ['rtings_scores_value_kind_check', SCORE_VALUE_KINDS],
    ['rtings_images_usage_status_check', IMAGE_USAGE_STATUSES],
    ['rtings_sync_runs_status_check', SYNC_RUN_STATUSES],
    ['rtings_sync_runs_trigger_check', SYNC_TRIGGERS],
    ['rtings_sync_runs_coverage_check', SYNC_COVERAGES],
  ] as const)('%s', (constraint, values) => {
    expect(checkValues(constraint).sort()).toEqual([...values].sort());
  });
});

describe('RTINGS raw field contract vs the real actor sample', () => {
  it('has the real sample to check against', () => {
    expect(SAMPLE.length).toBeGreaterThan(0);
  });

  it('every returned field is a known field', () => {
    const known = new Set<string>(RTINGS_RAW_KNOWN_FIELDS);
    const unknown = new Set(SAMPLE.flatMap((item) => Object.keys(item)).filter((key) => !known.has(key)));
    expect([...unknown]).toEqual([]);
  });

  it('every sample item carries the required identity fields', () => {
    for (const item of SAMPLE) {
      for (const field of RTINGS_RAW_REQUIRED_FIELDS) {
        expect(typeof item[field], `${String(item.productId)}.${field}`).toBe('string');
      }
    }
  });

  it('records the observed absence of review text and numeric ratings (normalize must emit null, not invent)', () => {
    for (const item of SAMPLE) {
      for (const absent of ['verdict', 'pros', 'cons', 'summary', 'overallScore']) expect(item).not.toHaveProperty(absent);
      const featured = (item.featuredTests ?? []) as { score?: unknown }[];
      expect(featured.every((t) => t.score === 0)).toBe(true);
    }
  });
});
