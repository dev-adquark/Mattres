/**
 * Deterministic catalog matching (brief section 31). Pure, no fuzzy logic.
 *
 * Order, first hit wins:
 *   1. review_url equals a catalog reviewSources[].sourceUrl     -> exact ('review_url')
 *   2. a curated alias (lib/rtings/aliases.json) for the product
 *      id or review URL                                           -> exact ('product_id_alias')
 *   3. same brand and identical model token sets                 -> high ('brand_model')
 *   4. same brand, subset tokens or several identical candidates -> ambiguous (status pending)
 *   5. no same-brand catalog entry, or none overlapping          -> new_candidate
 * A review is never attached to a mattress on a guess: anything short of
 * 1-3 leaves mattress_id null.
 */

import type { MattressEntry } from '@/lib/types';
import type { CatalogMatchResult, NormalizedReview, RtingsAlias } from './types';
import { canonicalReviewUrl } from './validate';
import { normalizeText, tokensWithoutBrandAndFiller } from '../apify/rtingsIdentity';

export type CatalogIdentity = Pick<MattressEntry, 'id' | 'brand' | 'model'> & { reviewSources?: MattressEntry['reviewSources'] | null };

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function isProperSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size >= b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function unique(ids: string[]): string[] {
  return Array.from(new Set(ids)).sort();
}

export function matchToCatalog(
  review: Pick<NormalizedReview, 'productId' | 'brand' | 'model' | 'reviewUrl'>,
  catalog: readonly CatalogIdentity[],
  aliases: readonly RtingsAlias[]
): CatalogMatchResult {
  const catalogIds = new Set(catalog.map((e) => e.id));
  const reviewUrl = canonicalReviewUrl(review.reviewUrl) ?? review.reviewUrl;

  // 1. Known RTINGS URL already recorded on a catalog entry.
  const byUrl = unique(
    catalog
      .filter((entry) => (entry.reviewSources ?? []).some((s) => s && canonicalReviewUrl(s.sourceUrl) === reviewUrl))
      .map((entry) => entry.id)
  );
  if (byUrl.length === 1) return { kind: 'matched', mattressId: byUrl[0] as string, method: 'review_url', confidence: 'exact' };
  if (byUrl.length > 1) return { kind: 'ambiguous', candidates: byUrl, reason: 'RTINGS review URL is listed on more than one catalog entry' };

  // 2. Curated alias by product id or review URL.
  const aliasTargets = unique(
    aliases
      .filter((a) => a.rtingsProductId === review.productId || canonicalReviewUrl(a.reviewUrl) === reviewUrl)
      .map((a) => a.catalogId)
  );
  if (aliasTargets.length === 1) {
    const target = aliasTargets[0] as string;
    if (catalogIds.has(target)) return { kind: 'matched', mattressId: target, method: 'product_id_alias', confidence: 'exact' };
    return { kind: 'ambiguous', candidates: [target], reason: `alias points to catalog id "${target}", which is not in the catalog` };
  }
  if (aliasTargets.length > 1) return { kind: 'ambiguous', candidates: aliasTargets, reason: 'aliases disagree about the catalog entry' };

  // 3-5. Brand + model tokens.
  const brandNorm = normalizeText(review.brand).join(' ');
  const sameBrand = catalog.filter((entry) => normalizeText(entry.brand).join(' ') === brandNorm);
  if (sameBrand.length === 0) return { kind: 'new_candidate', reason: `no catalog entry for brand "${review.brand}"` };

  const reviewTokens = tokensWithoutBrandAndFiller(review.model, review.brand);
  const exact: string[] = [];
  const overlapping: string[] = [];
  for (const entry of sameBrand) {
    const entryTokens = tokensWithoutBrandAndFiller(entry.model, entry.brand);
    if (sameSet(reviewTokens, entryTokens)) exact.push(entry.id);
    else if (isProperSubset(entryTokens, reviewTokens) || isProperSubset(reviewTokens, entryTokens)) overlapping.push(entry.id);
  }
  if (exact.length === 1) return { kind: 'matched', mattressId: exact[0] as string, method: 'brand_model', confidence: 'high' };
  if (exact.length > 1) return { kind: 'ambiguous', candidates: unique(exact), reason: 'several catalog entries reduce to the same brand + model tokens' };
  if (overlapping.length > 0) {
    return { kind: 'ambiguous', candidates: unique(overlapping), reason: 'same brand, overlapping but not identical model tokens (likely a different tier or variant)' };
  }
  return { kind: 'new_candidate', reason: `brand "${review.brand}" is in the catalog but no model matches "${review.model}"` };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Keeps only well-formed alias entries from the curated file. Malformed
 * entries are reported, never repaired: a broken alias must not attach a
 * review to a mattress.
 */
export function validateAliases(input: unknown): { aliases: RtingsAlias[]; problems: string[] } {
  if (!Array.isArray(input)) return { aliases: [], problems: ['aliases file is not a JSON array'] };
  const aliases: RtingsAlias[] = [];
  const problems: string[] = [];
  input.forEach((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const reviewUrl = canonicalReviewUrl(e.reviewUrl);
    if (!isNonEmptyString(e.rtingsProductId) || !reviewUrl || !isNonEmptyString(e.catalogId) || !isNonEmptyString(e.note) || !isNonEmptyString(e.addedAt)) {
      problems.push(`alias #${i} is missing rtingsProductId, a valid RTINGS reviewUrl, catalogId, note or addedAt`);
      return;
    }
    aliases.push({ rtingsProductId: e.rtingsProductId.trim(), reviewUrl, catalogId: e.catalogId.trim(), note: e.note, addedAt: e.addedAt });
  });
  return { aliases, problems };
}
