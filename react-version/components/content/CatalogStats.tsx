import type { MattressEntry, MattressType } from '@/lib/types';

/**
 * Small live summaries of the catalog for editorial copy. Every figure is
 * computed from the catalog at render time; types with no ratings on file
 * are left out rather than shown as zero.
 */

/** The 0-10 independent rating fields a summary can be computed for. */
export type RatingField =
  | 'coolingRatingOutOf10'
  | 'motionIsolationRatingOutOf10'
  | 'edgeSupportRatingOutOf10'
  | 'durabilityRatingOutOf10';

export interface RatingSummaryRow {
  type: MattressType;
  label: string;
  n: number;
  total: number;
  median: number;
  min: number;
  max: number;
}

const TYPE_LABEL: Record<MattressType, string> = { foam: 'all-foam', hybrid: 'hybrid', innerspring: 'innerspring', latex: 'latex' };
const TYPES = Object.keys(TYPE_LABEL) as MattressType[];

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const hi = s[mid] ?? 0;
  return s.length % 2 ? hi : ((s[mid - 1] ?? hi) + hi) / 2;
}

/** A rating rounded to at most two decimals, without trailing zeros ("7.5", "8"). */
export const formatRating = (n: number): string => String(Math.round(n * 100) / 100);

/** The numeric ratings on file for `field` (unrated entries are skipped). */
export function ratingValues(entries: readonly MattressEntry[], field: RatingField): number[] {
  return entries.map((e) => e[field]).filter((v): v is number => typeof v === 'number');
}

/** Rows of { type, label, n, total, median, min, max } for a 0-10 rating field. */
export function ratingSummary(catalog: readonly MattressEntry[], field: RatingField): RatingSummaryRow[] {
  const rows: RatingSummaryRow[] = [];
  for (const type of TYPES) {
    const all = catalog.filter((e) => e.type === type);
    const values = ratingValues(all, field);
    const mid = median(values);
    if (mid === null) continue;
    rows.push({ type, label: TYPE_LABEL[type], n: values.length, total: all.length, median: mid, min: Math.min(...values), max: Math.max(...values) });
  }
  return rows;
}

interface MedianSentenceProps {
  catalog: readonly MattressEntry[];
  field: RatingField;
  /** Lower-case dimension name used in the sentence ("motion isolation"). */
  dimension: string;
}

/** "In our catalog, the median motion isolation rating is 8/10 for all-foam (9 rated) and 7.5/10 for hybrid (15 rated)." */
export function MedianSentence({ catalog, field, dimension }: MedianSentenceProps) {
  const rows = ratingSummary(catalog, field);
  if (!rows.length) return null;
  const parts = rows.map((r) => `${formatRating(r.median)}/10 for ${r.label} (${r.n} rated)`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return (
    <p>
      In our catalog, the median independent {dimension} rating is {list}. Mattresses without a rating are not included.
    </p>
  );
}
