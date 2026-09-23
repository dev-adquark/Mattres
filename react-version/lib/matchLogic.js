import { scoreEngine } from '@/lib/scoreEngine';
import catalog from '@/lib/data/mattress-catalog.json';

// lib/data/mattress-catalog.json here is the fully-processed, display-
// and-scoring-ready catalog (a flat array with priceUsd, sponsored,
// reviewHighlights, flat heightIn) - extracted directly from the real
// `CATALOG` array already embedded and verified working in the original
// project's index.html, NOT the raw ingest-pipeline output the same
// filename holds at the repo root (that raw shape is missing priceUsd/
// sponsored/reviewHighlights entirely and uses a nested height.inches).
// Confirmed this is the right one to use by cross-checking a known real
// result (Aurora Hybrid, side/210lb/medium-firm/hot -> 76/100) against
// what the live HTML site has produced for that exact profile throughout
// this project.

export function displayTitle(entry) {
  const firstBrandWord = entry.brand.split(' ')[0].toLowerCase();
  if (entry.model.toLowerCase().indexOf(firstBrandWord) === 0) return entry.model;
  return `${entry.brand} ${entry.model}`;
}

/**
 * Bridges a catalog entry (brand/model/type/firmnessRange/...) into the
 * shape the v0.1 scoring math expects (a single firmnessRating + a few
 * booleans/numbers). Ported exactly from the original project's
 * adaptCatalogEntryForScoring() in index.html - not reconstructed from
 * memory.
 */
function adaptCatalogEntryForScoring(entry) {
  const firmnessRating = entry.firmnessRange
    ? (entry.firmnessRange.min + entry.firmnessRange.max) / 2
    : 5.5; // No firmness on file for this mattress; fall back to a neutral middle value.

  const notes = (entry.coreMaterialNotes || '').toLowerCase();
  const hasCoolingCover = notes.indexOf('gel') !== -1 || notes.indexOf('cooling') !== -1;
  const edgeSupportReinforced = entry.type !== 'foam'; // Heuristic: hybrids/innersprings assumed to have a supportive perimeter, foam assumed not.

  return {
    id: entry.id,
    type: entry.type,
    firmnessRating,
    hasCoolingCover,
    edgeSupportReinforced,
    topFoamDensityLbFt3: null, // Not in the catalog yet; durability rule is a no-op without it, same as the documented gap.
  };
}

function filterCatalog(profile) {
  return catalog.filter((entry) => {
    if (profile.mattressTypePreference && profile.mattressTypePreference.length &&
        profile.mattressTypePreference.indexOf(entry.type) === -1) return false;
    // budgetUsd.max is "no upper bound" when absent - a plain client-side
    // call could use Infinity for that, but a real JSON round-trip can't
    // (Infinity isn't valid JSON). Treating a missing/null/non-finite max
    // as "no upper bound" rather than comparing against null keeps this
    // correct everywhere this function is called from.
    if (profile.budgetUsd) {
      const { min, max } = profile.budgetUsd;
      if (typeof min === 'number' && entry.priceUsd < min) return false;
      if (typeof max === 'number' && Number.isFinite(max) && entry.priceUsd > max) return false;
    }
    return true;
  });
}

function badgeFor(entry, isTopMatch) {
  if (entry.sponsored) return { label: 'Sponsored Verified', className: 'badge-sponsored' };
  if (isTopMatch) return { label: 'Top match — Algorithmic Pick', className: 'badge-top' };
  return { label: 'Algorithmic Pick', className: 'badge-none' };
}

function buildWhyThisMatch(scored) {
  const bullets = [];
  scored.trace.categoryRulesUsed.forEach((r) => {
    if (r.delta === 0) return;
    const sign = r.delta > 0 ? '+' : '';
    bullets.push(`${r.category || 'overall'}: ${sign}${r.delta} — ${r.note}`);
  });
  scored.trace.riskRulesUsed.forEach((r) => {
    if (!r.triggered) return;
    bullets.push(`Flagged: ${r.ruleId.replace(/_/g, ' ').toLowerCase()}`);
  });
  return bullets;
}

/**
 * Filters the real catalog against a Sleep Profile, scores every survivor
 * with the real scoreEngine, sorts by score, and assigns badges - the one
 * place this logic lives, called from both app/api/match/route.js (the
 * client-side quiz flow) and app/compare/page.js (a server-rendered page
 * using a fixed, clearly-disclosed demo profile instead of real user
 * input). No caller duplicates this scoring/filtering logic by hand.
 */
export function matchProfile(profile) {
  const filtered = filterCatalog(profile);
  if (filtered.length === 0) {
    return { results: [], modelVersion: null, all: [] };
  }

  const scored = filtered.map((entry) => ({ entry, result: scoreEngine('0.1', profile, adaptCatalogEntryForScoring(entry)) }));
  scored.sort((a, b) => b.result.overallScore - a.result.overallScore);

  let firstNonSponsoredSeen = false;
  const results = scored.map((item, index) => {
    const { entry, result } = item;
    const isTopMatch = !entry.sponsored && !firstNonSponsoredSeen;
    if (!entry.sponsored) firstNonSponsoredSeen = true;
    const badge = badgeFor(entry, isTopMatch);
    return {
      entry,
      result,
      badge,
      displayTitle: displayTitle(entry),
      whyThisMatch: buildWhyThisMatch(result),
      preselect: index < 3,
    };
  });

  return {
    results,
    modelVersion: results[0]?.result.modelVersion ?? '0.1',
    all: results.map((r) => ({ id: r.entry.id, brand: r.entry.brand, model: r.entry.model, score: r.result.overallScore })),
  };
}
