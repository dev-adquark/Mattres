import { comparableQueenPriceUsd, type QueenPriceSource } from '@/lib/commerce';
import { scoreEngine } from '@/lib/scoreEngine';
import type { EngineProfile, ScoringInputV01, ScoringInputV02 } from '@/lib/scoreEngine';
import { getCatalog } from '@/lib/db/mattressRepo';
import { auditCatalog, getVerificationLevel, isRecordVerified, missingFields } from '@/lib/dataIntegrity';
import { explainMatch } from '@/lib/explain';
import type { MatchBadge, MatchItem, MatchResponse, MattressEntry, MattressType, ScoreResult, ScoreVersion } from '@/lib/types';

/** Scoring model used when a caller does not ask for a specific one. */
export const DEFAULT_SCORE_VERSION: ScoreVersion = '0.2';
export const SUPPORTED_SCORE_VERSIONS: readonly ScoreVersion[] = ['0.1', '0.2'];

/** The profile matchProfile/filterCatalog accept: the engine's profile fields plus the catalog filters. */
export type MatchProfileInput = EngineProfile;

export interface MatchOptions {
  scoreVersion?: string;
}

/** Where each v0.1 scoring input came from (real data vs. a documented fallback). */
export type DataProvenance = {
  firmness: string;
  heat: 'independent_rating' | 'heuristic_from_materials_text';
  edge: 'independent_rating' | 'heuristic_from_type';
  durability: 'stated' | 'unknown';
};

export interface AdaptedEntryV01 {
  scoringInput: ScoringInputV01 & { id: string; type: MattressType; topFoamDensityLbFt3: number | null };
  dataProvenance: DataProvenance;
}

/** The catalog fields the v0.1/v0.2 adapters read. */
export type ScorableEntry = Pick<MattressEntry, 'id' | 'type' | 'firmnessRange'> &
  Partial<Pick<MattressEntry,
    | 'firmnessSource'
    | 'coreMaterialNotes'
    | 'coolingRatingOutOf10'
    | 'motionIsolationRatingOutOf10'
    | 'edgeSupportRatingOutOf10'
    | 'durabilityRatingOutOf10'
    | 'topFoamDensityLbFt3'>>;

// The catalog is a real, source-attributed set of currently-sold
// mattresses (Casper, Helix, Saatva, Purple, Leesa, Bear, Birch,
// PlushBeds, and - via the RTINGS enrichment pipeline - Brooklyn
// Bedding, Avocado, Sleep On Latex, DreamCloud, and others), each
// fetched directly from the manufacturer's official product page and
// cross-checked against independent sources where available. Every
// field not literally stated on a fetched page is null, not guessed.
//
// getCatalog() (lib/db/mattressRepo.ts) reads from the Supabase
// `mattresses` table when the database is configured, and falls back to
// the git-committed lib/data/mattress-catalog.json snapshot otherwise
// (or if a DB query fails) - the app must keep serving real results
// either way. That JSON file is kept in sync as the last-known-good
// snapshot (see scripts/migrate-catalog-to-db.js), not deleted, so local
// development and CI never require live DB access.
//
// lib/dataIntegrity.ts computes the real 4-state verification level from
// these fields fresh on every request - this replaced an earlier catalog
// of real brand names with fabricated demo specs, all of which were
// honestly labeled unverified.

export function displayTitle(entry: Pick<MattressEntry, 'brand' | 'model'>): string {
  const firstBrandWord = (entry.brand.split(' ')[0] as string).toLowerCase();
  if (entry.model.toLowerCase().indexOf(firstBrandWord) === 0) return entry.model;
  // The model already names the whole brand as a word ("The Purple Mattress").
  const brandWord = new RegExp(`(^|[^a-z0-9])${entry.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i');
  if (brandWord.test(entry.model)) return entry.model;
  return `${entry.brand} ${entry.model}`;
}

/**
 * v0.1 adapter (unchanged; still used for result.dataProvenance and for
 * scoreVersion '0.1'). Bridges a catalog entry into the shape the v0.1 scoring math expects (a
 * single firmnessRating + a few booleans/numbers), and separately reports
 * which of those inputs came from real stated/independent data vs. a
 * heuristic or neutral fallback used only because no real data exists for
 * that mattress. The fallback values themselves are unchanged from the
 * original v0.1 design (documented there as intentional) - this only adds
 * visibility into when they're in use, per the rule that unknown data must
 * never be silently presented as if it were a measured positive or
 * negative.
 */
export function adaptCatalogEntryForScoring(entry: ScorableEntry): AdaptedEntryV01 {
  let firmnessRating: number;
  let firmnessProvenance: string;
  if (entry.firmnessRange && typeof entry.firmnessRange.min === 'number' && typeof entry.firmnessRange.max === 'number') {
    firmnessRating = (entry.firmnessRange.min + entry.firmnessRange.max) / 2;
    firmnessProvenance = entry.firmnessSource || 'stated';
  } else {
    firmnessRating = 5.5; // No firmness on file for this mattress; fall back to a neutral middle value.
    firmnessProvenance = 'unknown_neutral_fallback';
  }

  const notes = (entry.coreMaterialNotes || '').toLowerCase();
  const heuristicCooling = notes.indexOf('gel') !== -1 || notes.indexOf('cooling') !== -1 || notes.indexOf('cool') !== -1;
  let hasCoolingCover: boolean;
  let heatProvenance: DataProvenance['heat'];
  if (typeof entry.coolingRatingOutOf10 === 'number') {
    hasCoolingCover = entry.coolingRatingOutOf10 >= 7;
    heatProvenance = 'independent_rating';
  } else {
    hasCoolingCover = heuristicCooling;
    heatProvenance = 'heuristic_from_materials_text';
  }

  let edgeSupportReinforced: boolean;
  let edgeProvenance: DataProvenance['edge'];
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

/**
 * v0.2 adapter: passes the catalog's REAL graded fields straight through to
 * the engine (third-party ratings out of 10, stated firmness). Nothing is
 * derived or guessed here - a missing rating stays null and the engine
 * marks that dimension 'estimated' (see lib/rules/0.2.json). Firmness uses
 * the midpoint of the stated firmnessRange, same as v0.1; null when the
 * catalog has no firmness.
 */
function ratingOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function adaptCatalogEntryForScoringV2(entry: ScorableEntry): ScoringInputV02 & { id: string; type: MattressType; firmnessRating: number | null } {
  const range = entry.firmnessRange;
  const firmnessRating = range && typeof range.min === 'number' && typeof range.max === 'number'
    ? (range.min + range.max) / 2
    : null;
  return {
    id: entry.id,
    type: entry.type,
    firmnessRating,
    coolingRatingOutOf10: ratingOrNull(entry.coolingRatingOutOf10),
    motionIsolationRatingOutOf10: ratingOrNull(entry.motionIsolationRatingOutOf10),
    edgeSupportRatingOutOf10: ratingOrNull(entry.edgeSupportRatingOutOf10),
    durabilityRatingOutOf10: ratingOrNull(entry.durabilityRatingOutOf10),
    topFoamDensityLbFt3: ratingOrNull(entry.topFoamDensityLbFt3),
  };
}

/**
 * The id of the cheapest result with a REAL, known price - or null when no
 * result has one. A null/missing price is never treated as 0 (which is what
 * a plain `a.priceUsd < b.priceUsd` comparison silently does, since
 * `null < 899` is true in JS).
 */
export function pickBestValueId(
  results: ReadonlyArray<{ entry?: { id: string; priceUsd?: number | null } | null } | null | undefined> | null | undefined
): string | null {
  let best: { id: string; price: number } | null = null;
  for (const item of results || []) {
    const price = item && item.entry ? item.entry.priceUsd : undefined;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
    if (!best || price < best.price) best = { id: (item as { entry: { id: string } }).entry.id, price };
  }
  return best ? best.id : null;
}

function countMeasured(result: ScoreResult): number {
  if (!result.dimensionProvenance) return 0;
  return Object.values(result.dimensionProvenance).filter((p) => p === 'measured').length;
}

export function filterCatalog<T extends Pick<MattressEntry, 'type' | 'priceUsd'> & QueenPriceSource>(profile: MatchProfileInput, catalog: readonly T[]): T[] {
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
      // practice: the match quiz (components/match/quizModel.ts) sends `min: 0` whenever someone
      // sets only a max (the common case - "up to $2,000", no minimum),
      // so treating any numeric min as a bound was silently excluding
      // every null-priced mattress (10 of 37 entries) for most real
      // quiz submissions, not just ones with a genuine minimum.
      const hasRealMinBound = typeof min === 'number' && min > 0;
      const hasRealMaxBound = typeof max === 'number' && Number.isFinite(max);
      const hasBudgetBound = hasRealMinBound || hasRealMaxBound;
      // A price whose currency isn't confirmed as USD, or that is flagged
      // for a re-check, can't be held against a USD budget either
      // (lib/commerce comparableQueenPriceUsd): it counts as unknown here.
      const comparable = comparableQueenPriceUsd(entry);
      if (hasBudgetBound && comparable === null) {
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
      // Without a real bound an unpriced entry reaches these comparisons;
      // null compares false here, exactly as in the JS original.
      const price = entry.priceUsd as number;
      if (typeof min === 'number' && price < min) return false;
      if (typeof max === 'number' && Number.isFinite(max) && price > max) return false;
    }
    return true;
  });
}

export function badgeFor(entry: Pick<MattressEntry, 'sponsored'>, isTopMatch: boolean): MatchBadge {
  if (entry.sponsored) return { label: 'Sponsored', className: 'badge-sponsored' };
  if (isTopMatch) return { label: 'Top match — Algorithmic Pick', className: 'badge-top' };
  return { label: 'Algorithmic Pick', className: 'badge-none' };
}

/**
 * Plain-language "why it fits you" reasons for a result card - the same
 * real rule notes the scoring trace already carries (see
 * lib/scoreEngine.ts's recordCategoryRule calls), just without the
 * debug-style "category: +N —" prefix, and limited to rules that
 * actually helped the score. Risk flags (real negatives) are already
 * shown separately on the card, so they're not duplicated here.
 */
export function buildWhyThisMatch(scored: {
  trace: { categoryRulesUsed: readonly { delta: number; note: string }[]; riskRulesUsed?: readonly unknown[] };
}): string[] {
  return scored.trace.categoryRulesUsed
    .filter((r) => r.delta > 0)
    .map((r) => r.note);
}

function isSupportedScoreVersion(value: string): value is ScoreVersion {
  return (SUPPORTED_SCORE_VERSIONS as readonly string[]).indexOf(value) !== -1;
}

/**
 * Filters the real catalog against a Sleep Profile, scores every survivor
 * with the real scoreEngine, sorts by score, and assigns badges - the one
 * place this logic lives, called from both app/api/match/route.ts (the
 * client-side quiz flow) and app/compare (a server-rendered page
 * using a fixed, clearly-disclosed demo profile instead of real user
 * input). No caller duplicates this scoring/filtering logic by hand.
 *
 * Async because the catalog now comes from getCatalog() (database-first,
 * JSON-fallback) - every caller already runs in a context that can
 * await this (a Route Handler or an async Server Component).
 */
export async function matchProfile(profile: MatchProfileInput, options: MatchOptions = {}): Promise<MatchResponse> {
  const requested = options.scoreVersion || profile.scoreVersion || DEFAULT_SCORE_VERSION;
  if (!isSupportedScoreVersion(requested)) {
    throw new Error(`Unsupported scoreVersion "${requested}".`);
  }
  const scoreVersion: ScoreVersion = requested;
  const { entries: catalog, source: catalogSource } = await getCatalog();
  const filtered = filterCatalog(profile, catalog);
  if (filtered.length === 0) {
    return { results: [], modelVersion: null, all: [], catalogSource };
  }

  const scored = filtered.map((entry) => {
    const { scoringInput, dataProvenance } = adaptCatalogEntryForScoring(entry);
    const engineInput = scoreVersion === '0.1' ? scoringInput : adaptCatalogEntryForScoringV2(entry);
    return { entry, result: scoreEngine(scoreVersion, profile, engineInput), dataProvenance };
  });
  if (scoreVersion === '0.1') {
    scored.sort((a, b) => b.result.overallScore - a.result.overallScore);
  } else {
    // Deterministic tie-break: more independently-rated dimensions first,
    // then id, so equal scores never depend on catalog order.
    scored.sort((a, b) =>
      b.result.overallScore - a.result.overallScore ||
      countMeasured(b.result) - countMeasured(a.result) ||
      String(a.entry.id).localeCompare(String(b.entry.id)));
  }

  let firstNonSponsoredSeen = false;
  const results = scored.map((item, index) => {
    const { entry, result, dataProvenance } = item;
    const isTopMatch = !entry.sponsored && !firstNonSponsoredSeen;
    if (!entry.sponsored) firstNonSponsoredSeen = true;
    const badge = badgeFor(entry, isTopMatch);
    const base: Omit<MatchItem, 'explanation'> = {
      entry,
      result,
      dataProvenance,
      badge,
      displayTitle: displayTitle(entry),
      whyThisMatch: buildWhyThisMatch(result),
      preselect: index < 3,
      // Recomputed from the real underlying fields every time (see
      // lib/dataIntegrity.ts), not trusted from a stored flag - so a
      // result can never claim verification it doesn't actually have.
      verified: isRecordVerified(entry),
      verificationLevel: getVerificationLevel(entry),
      missingFields: missingFields(entry),
    };
    // Same object, explanation appended last (its key order is part of the response).
    const matchItem: MatchItem = Object.assign(base, { explanation: explainMatch(base, profile) });
    if (scoreVersion !== '0.1') {
      // v0.2 trace notes are engine bookkeeping, not user copy - the
      // plain-language reasons come from the explanation layer.
      matchItem.whyThisMatch = matchItem.explanation.reasons.map((r) => r.text);
    }
    return matchItem;
  });

  const bestValueId = pickBestValueId(results);
  for (const item of results) item.isBestValue = item.entry.id === bestValueId;

  return {
    results,
    modelVersion: results[0]?.result.modelVersion ?? scoreVersion,
    scoreVersion,
    bestValueId,
    all: results.map((r) => ({ id: r.entry.id, brand: r.entry.brand, model: r.entry.model, score: r.result.overallScore })),
    // Catalog-wide honesty summary: how much of what's being shown is
    // actually verified vs placeholder, surfaced so this is never a
    // silent gap.
    catalogAudit: auditCatalog(catalog),
    catalogSource, // 'database' or 'json_fallback' - see lib/db/mattressRepo.ts.
  };
}
