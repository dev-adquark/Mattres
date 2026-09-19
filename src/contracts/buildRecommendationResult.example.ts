/**
 * buildRecommendationResult.example.ts
 * -------------------------------------
 * Demonstrates the shape of an API handler (e.g. POST /api/recommendations)
 * that takes a SleepProfile, runs it against the catalog + scoring engine +
 * review tags, and returns RecommendationResult[]. Exercises every
 * RecommendationResult field.
 *
 * This intentionally does NOT import the real src/scoreEngine.js (a CommonJS
 * JS module) to keep this file a pure, dependency-free type-checking
 * example — `scoreOneMattress` below is a minimal stand-in with the same
 * output shape scoreEngine.js actually returns.
 */

import {
  SleepProfile,
  MattressSummary,
  RecommendationResult,
  ReviewHighlight,
  RiskFlag,
  ComfortBand,
  ScoreCategory,
  ListingPlacement,
} from './mattress-match';

/** Stand-in for scoreEngine.js's real return shape (see src/scoreEngine.js). */
interface ScoringOutput {
  scoreModelVersion: string;
  overallScore: number;
  subScores: Record<ScoreCategory, number>;
  comfortBand: ComfortBand;
  riskFlags: RiskFlag[];
}

/** Minimal deterministic stand-in for scoreEngine.js, same output shape. */
function scoreOneMattress(_profile: SleepProfile, mattress: MattressSummary): ScoringOutput {
  return {
    scoreModelVersion: '0.1',
    overallScore: mattress.type === 'hybrid' ? 88 : 74,
    subScores: {
      pressureRelief: 7.5,
      support: 8,
      heat: 7,
      motion: 7,
      edge: 7,
      durability: 7,
    },
    comfortBand: { min: 5, max: 8, weightBand: '180-230' },
    riskFlags: [],
  };
}

export interface CandidateMattress {
  mattress: MattressSummary;
  reviewHighlights: ReviewHighlight[];
  placement: ListingPlacement;
}

/**
 * Applies the SleepProfile's optional filters (mattressTypePreference,
 * budgetUsd) before scoring — this is what actually reads those two
 * SleepProfile fields on the recommendation-building side (as opposed to
 * the profile-summary-chip side in formToProfile.example.ts).
 */
export function filterCandidates(profile: SleepProfile, candidates: CandidateMattress[]): CandidateMattress[] {
  return candidates.filter(({ mattress }) => {
    if (profile.mattressTypePreference && profile.mattressTypePreference.length > 0) {
      if (!profile.mattressTypePreference.includes(mattress.type)) return false;
    }
    if (profile.budgetUsd && mattress.priceUsd !== undefined) {
      if (mattress.priceUsd < profile.budgetUsd.min || mattress.priceUsd > profile.budgetUsd.max) return false;
    }
    return true;
  });
}

/**
 * Scores every candidate, ranks by overallScore, and assembles the final
 * RecommendationResult[] — the exact shape the results page and comparison
 * tray render from.
 */
export function buildRecommendationResults(
  profile: SleepProfile,
  candidates: CandidateMattress[]
): RecommendationResult[] {
  const filtered = filterCandidates(profile, candidates);

  const scored = filtered.map((candidate) => ({
    candidate,
    scoring: scoreOneMattress(profile, candidate.mattress),
  }));

  // Highest score first; deterministic tie-break by mattressId so output ordering is stable.
  scored.sort(
    (a, b) =>
      b.scoring.overallScore - a.scoring.overallScore ||
      a.candidate.mattress.mattressId.localeCompare(b.candidate.mattress.mattressId)
  );

  return scored.map(({ candidate, scoring }, index) => {
    const rank = index + 1;

    // A sponsored listing keeps its own placement; an algorithmic listing at
    // rank 1 becomes the "Top match" — mirrors the compare-page mockup's
    // "Top match — algorithmic" vs "Algorithmic pick" distinction, expressed
    // through the ListingPlacement discriminated union instead of ad hoc booleans.
    const placement: ListingPlacement =
      candidate.placement.kind === 'sponsored'
        ? candidate.placement
        : { kind: 'algorithmic', isTopMatch: rank === 1 };

    const result: RecommendationResult = {
      mattressId: candidate.mattress.mattressId,
      profileId: profile.profileId,
      scoreModelVersion: scoring.scoreModelVersion,
      overallScore: scoring.overallScore,
      subScores: scoring.subScores,
      comfortBand: scoring.comfortBand,
      riskFlags: scoring.riskFlags,
      mattress: candidate.mattress,
      reviewHighlights: candidate.reviewHighlights,
      placement,
      rank,
      isSelectedForComparison: rank <= 3, // Pre-select the top 3 into the comparison tray, same as the compare-page mockup's "Comparing 3 of 3".
    };
    return result;
  });
}
