/**
 * Maps a catalog entry's 1-10 firmnessRange to the nearest label on the
 * same scale the scoring rules use (lib/rules/0.1.json firmnessLabelScale),
 * so the label a card shows is consistent with what the engine scored.
 */
import type { FirmnessLabel, MattressEntry, MattressType } from '@/lib/types';

export interface FirmnessInfo {
  /** Nearest scale point to the midpoint: what the engine scores. */
  id: FirmnessLabel;
  /**
   * The label to SHOW. For a model sold in several firmness options this is
   * MULTI_FIRMNESS_LABEL, never one midpoint word that misstates what is sold.
   */
  label: string;
  /** The midpoint's scale word ("Medium"), even for multi-option models. */
  pointLabel: string;
  rating: number;
  /** True when the model is sold in several firmness options. */
  multi: boolean;
}

export const MULTI_FIRMNESS_LABEL = 'Several options';

type FirmnessInput = Pick<MattressEntry, 'firmnessRange'> & { firmnessSource?: string | null };

/**
 * A model is sold in several firmness options when the catalog says its
 * number is a representative point of a listed set of options
 * (firmnessSource "..._representative"), or the range spans 3+ points
 * (Saatva Classic 3-8, Loom & Leaf 5-8, Silk & Snow 5-8.75). Narrow ranges
 * for ONE option (Saatva HD "Medium Firm 5-7", Leesa "medium to medium-firm")
 * keep their word.
 */
export function isMultiFirmness(entry: FirmnessInput | null | undefined): boolean {
  const range = entry && entry.firmnessRange;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return false;
  if (range.max - range.min >= 3) return true;
  const source = entry && typeof entry.firmnessSource === 'string' ? entry.firmnessSource : '';
  return range.max > range.min && source.includes('_representative');
}

type ScaleRow = readonly [FirmnessLabel, string, number];

const SCALE: readonly ScaleRow[] = [
  ['soft', 'Soft', 2],
  ['medium-soft', 'Medium-soft', 4],
  ['medium', 'Medium', 5.5],
  ['medium-firm', 'Medium-firm', 7],
  ['firm', 'Firm', 8.5],
  ['extra-firm', 'Extra-firm', 10],
];

function nearest(value: number): ScaleRow {
  let best = SCALE[0] as ScaleRow;
  for (const row of SCALE) if (Math.abs(row[2] - value) < Math.abs(best[2] - value)) best = row;
  return best;
}

/** null when firmness isn't on file */
export function firmnessFor(entry: FirmnessInput | null | undefined): FirmnessInfo | null {
  const range = entry && entry.firmnessRange;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return null;
  const rating = (range.min + range.max) / 2;
  const [id, pointLabel] = nearest(rating);
  const multi = isMultiFirmness(entry);
  return { id, label: multi ? MULTI_FIRMNESS_LABEL : pointLabel, pointLabel, rating, multi };
}

/**
 * Compact firmness for a card fact: "Medium-firm", or for a multi-option
 * model "Several options · 3–8/10" so the range sold is never hidden.
 */
export function firmnessCardText(entry: FirmnessInput | null | undefined): string | null {
  const firm = firmnessFor(entry);
  if (!firm) return null;
  if (!firm.multi) return firm.label;
  const range = firmnessRangeText(entry);
  // NBSP keeps the dot with the label; word joiners keep "3–8/10" on one line in narrow cards.
  return range ? `${firm.label}\u00a0· ${range.replace('-', '\u2060–\u2060')}` : firm.label;
}

export function firmnessRangeText(entry: Pick<MattressEntry, 'firmnessRange'> | null | undefined): string | null {
  const range = entry && entry.firmnessRange;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return null;
  return range.min === range.max ? `${range.min}/10` : `${range.min}-${range.max}/10`;
}

export const MATTRESS_TYPE_LABEL: Record<MattressType, string> = {
  foam: 'All-foam',
  hybrid: 'Hybrid',
  innerspring: 'Innerspring',
  latex: 'Latex',
};
