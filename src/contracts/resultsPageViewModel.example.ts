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
  /** Compact "Why this match?" bullets, built from trace.categoryRulesUsed + trace.riskRulesUsed. */
  whyThisMatch: string[];
}

export interface ResultsPageViewModel {
  profileSummaryChips: string[];
  /** Surfaced next to the methodology page link, per this task's "modelVersion... in each recommendation card" requirement. */
  modelVersion: string | null;
  totalResults: number;
  selectedForComparisonCount: number;
  cards: RecommendationCardViewModel[];
}

function formatPrice(priceUsd?: number): string {
  return priceUsd !== undefined ? `$${priceUsd.toLocaleString()}` : 'Price unavailable';
}

/**
 * Builds the compact "Why this match?" bullets for one result: one line per
 * category rule that actually moved a sub-score (skips zero-delta/baseline
 * noise), plus one line per triggered risk rule. This is the only place
 * that reads trace.categoryRulesUsed/riskRulesUsed for display — everything
 * else on the card reads the already-computed subScores/riskFlags.
 */
function buildWhyThisMatch(result: RecommendationResult): string[] {
  const bullets: string[] = [];

  for (const rule of result.trace.categoryRulesUsed) {
    if (rule.delta === 0) continue; // Skip the baseline / no-op entries — not interesting to a shopper.
    const sign = rule.delta > 0 ? '+' : '';
    const categoryLabel = rule.category ?? 'overall';
    bullets.push(`${categoryLabel}: ${sign}${rule.delta} — ${rule.note}`);
  }

  for (const rule of result.trace.riskRulesUsed) {
    if (!rule.triggered) continue;
    bullets.push(`Flagged: ${rule.ruleId.replace(/_/g, ' ').toLowerCase()}`);
  }

  return bullets;
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
    whyThisMatch: buildWhyThisMatch(result),
  };
}

export function buildResultsPageViewModel(
  profile: SleepProfile,
  results: RecommendationResult[]
): ResultsPageViewModel {
  return {
    profileSummaryChips: buildProfileSummaryChips(profile),
    modelVersion: results[0]?.modelVersion ?? null,
    totalResults: results.length,
    selectedForComparisonCount: results.filter((r) => r.isSelectedForComparison).length,
    cards: results.map(buildCard),
  };
}
