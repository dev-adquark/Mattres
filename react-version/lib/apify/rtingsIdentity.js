'use strict';

/**
 * Deterministic identity matching between a normalized RTINGS record and
 * this project's real catalog (lib/data/mattress-catalog.json). RTINGS
 * has no shared product id with our catalog, so this can only match on
 * brand + model text - and the catalog's own "model" field is
 * inconsistent about whether it includes the brand name (e.g. Bear's
 * catalog model is "Elite Hybrid", but Purple's is "The Purple
 * Mattress"), so a naive string-equality or substring check would either
 * miss real matches or wrongly conflate different products (e.g.
 * RTINGS's real "Helix Midnight Luxe 2025" is a different, newer tier
 * from this catalog's "Helix Midnight" - a substring match would
 * incorrectly treat them as the same product).
 *
 * Approach: reduce both sides to a token set with the brand name and
 * generic filler words ("the", "mattress") removed, then compare token
 * sets:
 *   - identical sets            -> matched (high confidence)
 *   - one set a proper subset   -> review_required (a real near-miss,
 *                                  e.g. a "Luxe"/"Plus"/year-suffixed
 *                                  variant - never auto-merged)
 *   - no overlap                -> unmatched
 */

const FILLER_WORDS = new Set(['the', 'mattress']);

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function tokensWithoutBrandAndFiller(text, brand) {
  const brandTokens = new Set(normalizeText(brand));
  return new Set(normalizeText(text).filter((t) => !brandTokens.has(t) && !FILLER_WORDS.has(t)));
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function isProperSubset(a, b) {
  if (a.size >= b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

/**
 * @param {object} record - a normalized RTINGS record (from rtingsNormalize.js).
 * @param {object[]} catalog - the real mattress-catalog.json array.
 * @returns {{status:'matched', catalogId:string, confidence:'high'}
 *          |{status:'review_required', candidates:string[], reason:string}
 *          |{status:'unmatched'}}
 */
function matchRtingsRecordToCatalog(record, catalog) {
  const recordBrandNorm = normalizeText(record.brand).join(' ');
  const sameBrandEntries = catalog.filter((e) => normalizeText(e.brand).join(' ') === recordBrandNorm);
  if (sameBrandEntries.length === 0) return { status: 'unmatched' };

  const recordTokens = tokensWithoutBrandAndFiller(record.model, record.brand);

  const exactMatches = [];
  const subsetEitherWay = [];

  for (const entry of sameBrandEntries) {
    const entryTokens = tokensWithoutBrandAndFiller(entry.model, entry.brand);
    if (sameSet(recordTokens, entryTokens)) {
      exactMatches.push(entry.id);
    } else if (isProperSubset(entryTokens, recordTokens) || isProperSubset(recordTokens, entryTokens)) {
      subsetEitherWay.push(entry.id);
    }
  }

  if (exactMatches.length === 1) return { status: 'matched', catalogId: exactMatches[0], confidence: 'high' };
  if (exactMatches.length > 1) {
    // Should not happen with a real, deduplicated catalog, but two
    // catalog entries reducing to the identical token set is itself a
    // data problem worth surfacing rather than silently picking one.
    return { status: 'review_required', candidates: exactMatches, reason: 'multiple catalog entries reduce to the same brand+model tokens' };
  }
  if (subsetEitherWay.length > 0) {
    return { status: 'review_required', candidates: subsetEitherWay, reason: 'same brand, overlapping but not identical model tokens (likely a different tier/variant)' };
  }
  return { status: 'unmatched' };
}

module.exports = { matchRtingsRecordToCatalog, normalizeText, tokensWithoutBrandAndFiller };
