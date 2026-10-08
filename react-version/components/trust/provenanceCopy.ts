import type { DimensionProvenance, ScoreCategory } from '@/lib/types';

/**
 * Reader-facing words for the engine's dimension provenance.
 *
 * The engine enum stays 'measured' | 'estimated' (scoring output must not
 * change), but this site does no lab testing, so the word "Measured" is
 * never shown. A 'measured' dimension is one backed by data on file: an
 * independent reviewer rating out of 10, or the mattress's firmness, which
 * may be a brand's number or a brand's word label converted to a number.
 */
export const PROVENANCE_LABEL: Record<DimensionProvenance, string> = {
  measured: 'Sourced',
  estimated: 'Estimated',
};

/** Dimensions whose 'measured' value is an independent rating out of 10. */
const RATED: ReadonlySet<ScoreCategory> = new Set<ScoreCategory>(['heat', 'motion', 'edge', 'durability']);

export function isRatedDimension(dim: ScoreCategory): boolean {
  return RATED.has(dim);
}

/**
 * Where a firmness-driven sub-score (support, pressure relief) comes from,
 * as a lower-case phrase ("from the brand's firmness label").
 */
export function firmnessBasisText(code: string | null | undefined): string {
  const c = String(code || '');
  if (c.startsWith('independent_numeric')) return 'from an independent firmness rating';
  if (c.startsWith('stated_numeric')) return "from the brand's stated firmness number";
  if (c.startsWith('label_mapped')) return "from the brand's firmness label";
  if (c.startsWith('brand_')) return "converted from the brand's own firmness scale";
  return 'from the firmness on file';
}

/**
 * Lower-case phrase naming the source of one sourced dimension
 * ("from an independent rating", "from the brand's firmness label"), or
 * "estimated" when the engine fell back on the construction type.
 */
export function dimensionBasisText(
  dim: ScoreCategory,
  prov: DimensionProvenance | null | undefined,
  firmnessSource: string | null | undefined,
): string {
  if (prov !== 'measured') return 'estimated';
  return isRatedDimension(dim) ? 'from an independent rating' : firmnessBasisText(firmnessSource);
}
