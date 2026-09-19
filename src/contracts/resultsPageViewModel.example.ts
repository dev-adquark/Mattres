/**
 * resultsPageViewModel.example.ts
 * --------------------------------
 * Demonstrates the "page component" side of the contract: consuming
 * SleepProfile + RecommendationResult[] to build the plain-data view model a
 * results/compare page would render. Written as a pure function (no
 * React/JSX dependency) so it type-checks standalone, but the shape below is
 * exactly what a component's props would look like.
 */

import { SleepProfile, RecommendationResult, getPlacementBadge } from './mattress-match';
import { buildProfileSummaryChips } from './formToProfile.example';

export interface RecommendationCardViewModel {
  mattressId: string;
  title: string; // "Aurora Sleep Aurora Hybrid"
  priceLabel: string; // "$899" or "Price unavailable"
  overallScore: number;
  subScoreRows: Array<{ category: string; value: number; percent: number }>;
  badgeLabel: string;
  badgeEmphasis: boolean;
  riskFlagLabels: string[]; // human-readable, from riskFlags[].rationale
  topReviewSnippet: string | null;
  isSelectedForComparison: boolean;
  retailerCtaUrl: string | null;
}

export interface ResultsPageViewModel {
  profileSummaryChips: string[];
  totalResults: number;
  selectedForComparisonCount: number;
  cards: RecommendationCardViewModel[];
}

function formatPrice(priceUsd?: number): string {
  return priceUsd !== undefined ? `$${priceUsd.toLocaleString()}` : 'Price unavailable';
}

function buildCard(result: RecommendationResult): RecommendationCardViewModel {
  const badge = getPlacementBadge(result.placement);

  // Prioritize review highlights whose category matches the sub-score the
  // profile most needs to see justified (pressure relief first, since it's
  // the most commonly checked category); falls back to the first highlight.
  const topHighlight = result.reviewHighlights[0] ?? null;

  return {
    mattressId: result.mattressId,
    title: `${result.mattress.brand} ${result.mattress.model}`,
    priceLabel: formatPrice(result.mattress.priceUsd),
    overallScore: result.overallScore,
    subScoreRows: Object.entries(result.subScores).map(([category, value]) => ({
      category,
      value,
      percent: Math.round((value / 10) * 100),
    })),
    badgeLabel: badge.label,
    badgeEmphasis: badge.emphasis,
    riskFlagLabels: result.riskFlags.map((f) => f.rationale),
    topReviewSnippet: topHighlight ? topHighlight.snippet : null,
    isSelectedForComparison: result.isSelectedForComparison,
    retailerCtaUrl: result.mattress.affiliateUrl ?? null,
  };
}

export function buildResultsPageViewModel(
  profile: SleepProfile,
  results: RecommendationResult[]
): ResultsPageViewModel {
  return {
    profileSummaryChips: buildProfileSummaryChips(profile),
    totalResults: results.length,
    selectedForComparisonCount: results.filter((r) => r.isSelectedForComparison).length,
    cards: results.map(buildCard),
  };
}
