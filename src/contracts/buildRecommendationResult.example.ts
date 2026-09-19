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
  ScoreTrace,
} from './mattress-match';

/** Stand-in for scoreEngine.js's real return shape (see src/scoreEngine.js). */
interface ScoringOutput {
  modelVersion: string;
  overallScore: number;
  subScores: Record<ScoreCategory, number>;
  comfortBand: ComfortBand;
  riskFlags: RiskFlag[];
  trace: ScoreTrace;
}

/** Minimal deterministic stand-in for scoreEngine.js, same output shape. */
function scoreOneMattress(_profile: SleepProfile, mattress: MattressSummary): ScoringOutput {
  const isFoamNoCooling = mattress.type === 'foam';

  return {
    modelVersion: '0.1',
    overallScore: mattress.type === 'hybrid' ? 88 : 74,
    subScores: {
      pressureRelief: 7.5,
      support: 8,
      heat: isFoamNoCooling ? 5 : 7,
      motion: 7,
      edge: 7,
      durability: 7,
    },
    comfortBand: { min: 5, max: 8, weightBand: '180-230' },
    riskFlags: isFoamNoCooling
      ? [
          {
            code: 'HEAT_RETENTION_LIKELY',
            category: 'heat',
            rationale: 'Heat sub-score is 5/10 and this profile sleeps hot.',
            mitigation: 'Look for gel-infused foam or an added cooling cover.',
          },
        ]
      : [],
    trace: {
      modelVersion: '0.1',
      categoryRulesUsed: [
        {
          ruleId: 'BASELINE_BY_TYPE',
          category: null,
          description: `Starting sub-scores come from the ${mattress.type} baseline.`,
          delta: 0,
          note: `Mattress type "${mattress.type}" baseline applied.`,
        },
        ...(isFoamNoCooling
          ? [
              {
                ruleId: 'HEAT_NO_COOLING_FOAM_PENALTY' as const,
                category: 'heat' as const,
                description: 'All-foam construction with no cooling cover reduces the heat sub-score.',
                delta: -1,
                note: 'No cooling cover specified on an all-foam mattress.',
              },
            ]
          : []),
      ],
      riskRulesUsed: [
        {
          ruleId: 'HEAT_RETENTION_LIKELY',
          triggered: isFoamNoCooling,
          thresholdId: 'thresholds.heatRetentionMaxHeatScore',
          thresholdValue: 6,
          evaluatedValue: isFoamNoCooling ? 5 : 7,
        },
      ],
    },
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
      modelVersion: scoring.modelVersion,
      overallScore: scoring.overallScore,
      subScores: scoring.subScores,
      comfortBand: scoring.comfortBand,
      riskFlags: scoring.riskFlags,
      trace: scoring.trace,
      mattress: candidate.mattress,
      reviewHighlights: candidate.reviewHighlights,
      placement,
      rank,
      isSelectedForComparison: rank <= 3, // Pre-select the top 3 into the comparison tray, same as the compare-page mockup's "Comparing 3 of 3".
    };
    return result;
  });
}
