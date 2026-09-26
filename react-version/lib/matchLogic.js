import { scoreEngine } from '@/lib/scoreEngine';
import { getCatalog } from '@/lib/db/mattressRepo';
import { auditCatalog, getVerificationLevel, isRecordVerified, missingFields } from '@/lib/dataIntegrity';

// The catalog is a real, source-attributed set of currently-sold
// mattresses (Casper, Helix, Saatva, Purple, Leesa, Bear, Birch,
// PlushBeds, and - via the RTINGS enrichment pipeline - Brooklyn
// Bedding, Avocado, Sleep On Latex, DreamCloud, and others), each
// fetched directly from the manufacturer's official product page and
// cross-checked against independent sources where available. Every
// field not literally stated on a fetched page is null, not guessed.
//
// getCatalog() (lib/db/mattressRepo.js) reads from the Supabase
// `mattresses` table when the database is configured, and falls back to
// the git-committed lib/data/mattress-catalog.json snapshot otherwise
// (or if a DB query fails) - the app must keep serving real results
// either way. That JSON file is kept in sync as the last-known-good
// snapshot (see scripts/migrate-catalog-to-db.js), not deleted, so local
// development and CI never require live DB access.
//
// lib/dataIntegrity.js computes the real 4-state verification level from
// these fields fresh on every request - this replaced an earlier catalog
// of real brand names with fabricated demo specs, all of which were
// honestly labeled unverified.

export function displayTitle(entry) {
  const firstBrandWord = entry.brand.split(' ')[0].toLowerCase();
  if (entry.model.toLowerCase().indexOf(firstBrandWord) === 0) return entry.model;
  return `${entry.brand} ${entry.model}`;
}

/**
 * Bridges a catalog entry into the shape the v0.1 scoring math expects (a
 * single firmnessRating + a few booleans/numbers), and separately reports
 * which of those inputs came from real stated/independent data vs. a
 * heuristic or neutral fallback used only because no real data exists for
 * that mattress. The fallback values themselves are unchanged from the
 * original v0.1 design (documented there as intentional) - this only adds
 * visibility into when they're in use, per the rule that unknown data must
 * never be silently presented as if it were a measured positive or
 * negative.
 */
export function adaptCatalogEntryForScoring(entry) {
  let firmnessRating;
  let firmnessProvenance;
  if (entry.firmnessRange && typeof entry.firmnessRange.min === 'number' && typeof entry.firmnessRange.max === 'number') {
    firmnessRating = (entry.firmnessRange.min + entry.firmnessRange.max) / 2;
    firmnessProvenance = entry.firmnessSource || 'stated';
  } else {
    firmnessRating = 5.5; // No firmness on file for this mattress; fall back to a neutral middle value.
    firmnessProvenance = 'unknown_neutral_fallback';
  }

  const notes = (entry.coreMaterialNotes || '').toLowerCase();
  const heuristicCooling = notes.indexOf('gel') !== -1 || notes.indexOf('cooling') !== -1 || notes.indexOf('cool') !== -1;
  let hasCoolingCover;
  let heatProvenance;
  if (typeof entry.coolingRatingOutOf10 === 'number') {
    hasCoolingCover = entry.coolingRatingOutOf10 >= 7;
    heatProvenance = 'independent_rating';
  } else {
    hasCoolingCover = heuristicCooling;
    heatProvenance = 'heuristic_from_materials_text';
  }

  let edgeSupportReinforced;
  let edgeProvenance;
  if (typeof entry.edgeSupportRatingOutOf10 === 'number') {
    edgeSupportReinforced = entry.edgeSupportRatingOutOf10 >= 7;
    edgeProvenance = 'independent_rating';
  } else {
    edgeSupportReinforced = entry.type !== 'foam'; // Heuristic: hybrids/innersprings/latex assumed to have a supportive perimeter, foam assumed not.
    edgeProvenance = 'heuristic_from_type';
  }

  const topFoamDensityLbFt3 = typeof entry.topFoamDensityLbFt3 === 'number' ? entry.topFoamDensityLbFt3 : null;

  return {
    scoringInput: {
      id: entry.id,
      type: entry.type,
      firmnessRating,
      hasCoolingCover,
      edgeSupportReinforced,
      topFoamDensityLbFt3,
    },
    dataProvenance: {
      firmness: firmnessProvenance,
      heat: heatProvenance,
      edge: edgeProvenance,
      durability: topFoamDensityLbFt3 != null ? 'stated' : 'unknown',
    },
  };
}

export function filterCatalog(profile, catalog) {
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
      // min:0 is not a real constraint - no mattress costs less than $0,
      // so a floor of exactly 0 can never be violated and must not, on
      // its own, count as "the user has a budget bound." This matters in
      // practice: QuizForm sends `min: budgetMin ?? 0` whenever someone
      // sets only a max (the common case - "up to $2,000", no minimum),
      // so treating any numeric min as a bound was silently excluding
      // every null-priced mattress (10 of 37 entries) for most real
      // quiz submissions, not just ones with a genuine minimum.
      const hasRealMinBound = typeof min === 'number' && min > 0;
      const hasRealMaxBound = typeof max === 'number' && Number.isFinite(max);
      const hasBudgetBound = hasRealMinBound || hasRealMaxBound;
      if (hasBudgetBound && typeof entry.priceUsd !== 'number') {
        // Price isn't known for this mattress (real catalog data has
        // several - Helix's is JS-rendered, some Leesa sizes only have a
        // "from" price). `null < min` / `null > max` both evaluate to
        // false in JS, which would silently let an unpriced mattress pass
        // ANY budget filter regardless of its real cost - exactly the
        // kind of "unknown treated as a pass" the scoring-safety rules
        // forbid. Since we can't confirm it fits, exclude it from a
        // budget-filtered search rather than risk recommending something
        // that might be well outside it.
        return false;
      }
      if (typeof min === 'number' && entry.priceUsd < min) return false;
      if (typeof max === 'number' && Number.isFinite(max) && entry.priceUsd > max) return false;
    }
    return true;
  });
}

export function badgeFor(entry, isTopMatch) {
  if (entry.sponsored) return { label: 'Sponsored Verified', className: 'badge-sponsored' };
  if (isTopMatch) return { label: 'Top match — Algorithmic Pick', className: 'badge-top' };
  return { label: 'Algorithmic Pick', className: 'badge-none' };
}

export function buildWhyThisMatch(scored) {
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
 *
 * Async because the catalog now comes from getCatalog() (database-first,
 * JSON-fallback) - every caller already runs in a context that can
 * await this (a Route Handler or an async Server Component).
 */
export async function matchProfile(profile) {
  const { entries: catalog, source: catalogSource } = await getCatalog();
  const filtered = filterCatalog(profile, catalog);
  if (filtered.length === 0) {
    return { results: [], modelVersion: null, all: [], catalogSource };
  }

  const scored = filtered.map((entry) => {
    const { scoringInput, dataProvenance } = adaptCatalogEntryForScoring(entry);
    return { entry, result: scoreEngine('0.1', profile, scoringInput), dataProvenance };
  });
  scored.sort((a, b) => b.result.overallScore - a.result.overallScore);

  let firstNonSponsoredSeen = false;
  const results = scored.map((item, index) => {
    const { entry, result, dataProvenance } = item;
    const isTopMatch = !entry.sponsored && !firstNonSponsoredSeen;
    if (!entry.sponsored) firstNonSponsoredSeen = true;
    const badge = badgeFor(entry, isTopMatch);
    return {
      entry,
      result,
      dataProvenance,
      badge,
      displayTitle: displayTitle(entry),
      whyThisMatch: buildWhyThisMatch(result),
      preselect: index < 3,
      // Recomputed from the real underlying fields every time (see
      // lib/dataIntegrity.js), not trusted from a stored flag - so a
      // result can never claim verification it doesn't actually have.
      verified: isRecordVerified(entry),
      verificationLevel: getVerificationLevel(entry),
      missingFields: missingFields(entry),
    };
  });

  return {
    results,
    modelVersion: results[0]?.result.modelVersion ?? '0.1',
    all: results.map((r) => ({ id: r.entry.id, brand: r.entry.brand, model: r.entry.model, score: r.result.overallScore })),
    // Catalog-wide honesty summary: how much of what's being shown is
    // actually verified vs placeholder, surfaced so this is never a
    // silent gap - see AuditBanner.jsx.
    catalogAudit: auditCatalog(catalog),
    catalogSource, // 'database' or 'json_fallback' - see lib/db/mattressRepo.js.
  };
}
