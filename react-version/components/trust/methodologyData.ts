/**
 * Server-only data for /methodology. Everything on that page that is a
 * number comes from here, and everything here comes from the real engine
 * (lib/scoreEngine.ts), the real rules files (lib/rules/*.json, loaded by
 * the engine's own loadRules) or the real catalog (lib/db/mattressRepo
 * getCatalog) - nothing is typed in by hand.
 *
 * Do not import this from a client component: the engine and the catalog
 * loader read from disk. Client components import types from
 * methodologyTypes.ts instead.
 */
import type { ComfortBand, MattressEntry, ScoreCategory, ScoreResult, ScoreVersion } from '@/lib/types';
import { scoreEngine, computeEffectiveWeights, loadRules, type EngineProfile } from '@/lib/scoreEngine';
import { getCatalog } from '@/lib/db/mattressRepo';
import { loadRtingsPipelineStatus, type RtingsPipelineStatus } from '@/lib/rtings/evidence';
import { RTINGS_ACTOR_SLUG, RTINGS_SYNC_INTERVAL_DAYS } from '@/lib/rtings/types';
import { adaptCatalogEntryForScoring, adaptCatalogEntryForScoringV2, displayTitle } from '@/lib/matchLogic';
import { auditCatalog } from '@/lib/dataIntegrity';
import { DIMENSIONS } from '@/lib/explain';
import { EXPLORER_FIELDS } from './explorerModel';
import { monetizationStatus } from './monetization';
import type {
  ContrastProfile,
  CurvePoint,
  CurvePosition,
  CurveSeries,
  ExampleProfile,
  ExplorerData,
  ExplorerField,
  ExplorerFieldId,
  ExplorerOption,
  MethodologyData,
  Provenance,
  TopScoreStats,
  WorkedExample,
} from './methodologyTypes';

export const DIM_IDS: readonly ScoreCategory[] = DIMENSIONS.map((d) => d.id);

const rulesV2 = loadRules('0.2');
const rulesV1 = loadRules('0.1');

/* ------------------------------------------------------------------ */
/* Weight explorer: every combination of the answers that re-weight the
   score, run through the engine's own computeEffectiveWeights.        */
/* ------------------------------------------------------------------ */

type Combo = Partial<Record<ExplorerFieldId, ExplorerOption>>;

function* combinations(fields: readonly ExplorerField[], i = 0, acc: Combo = {}): Generator<Combo> {
  const field = fields[i];
  if (!field) {
    yield { ...acc };
    return;
  }
  for (const option of field.options) {
    acc[field.id] = option;
    yield* combinations(fields, i + 1, acc);
  }
}

function buildWeightTable(): Pick<ExplorerData, 'stride' | 'table'> {
  const rules = rulesV2.weightModifiers.rules;
  const ruleIndex = new Map(rules.map((r, i) => [r.id, i]));
  const stride = DIM_IDS.length + 1;
  const table: number[] = [];
  for (const combo of combinations(EXPLORER_FIELDS)) {
    const profile: EngineProfile = {
      sleepPosition: combo.sleepPosition?.value,
      sleepTemperature: combo.sleepTemperature?.value,
      motionSensitivity: combo.motionSensitivity?.value,
      edgeImportance: combo.edgeImportance?.value,
      painFocus: combo.painFocus?.value,
      weightLb: combo.bodyWeight?.weightLb,
      preferredFirmnessLabel: 'medium',
    };
    const { effective, weightRulesUsed } = computeEffectiveWeights(rulesV2, profile);
    // Permyriad integers keep the payload small; the client divides by 100 for a percentage.
    for (const id of DIM_IDS) table.push(Math.round(effective[id] * 10000));
    let mask = 0;
    for (const used of weightRulesUsed) mask |= 1 << (ruleIndex.get(used.ruleId) ?? 0);
    table.push(mask);
  }
  return { stride, table };
}

/* ------------------------------------------------------------------ */
/* Firmness fit curves: the engine scoring a generic hybrid at every
   firmness, for each sleep position at 160 lb.                        */
/* ------------------------------------------------------------------ */

const CURVE_WEIGHT_LB = 160;
const CURVE_POSITIONS: readonly CurvePosition[] = ['side', 'back', 'stomach', 'combination'];

function buildFirmnessCurves(): CurveSeries[] {
  return CURVE_POSITIONS.map((position) => {
    const profile: EngineProfile = { sleepPosition: position, weightLb: CURVE_WEIGHT_LB, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' };
    const points: CurvePoint[] = [];
    let band: ComfortBand | null = null;
    for (let f = 1; f <= 10.0001; f += 0.5) {
      const firmness = Math.round(f * 10) / 10;
      const r = scoreEngine('0.2', profile, { id: 'illustration', type: 'hybrid', firmnessRating: firmness });
      band = r.comfortBand;
      points.push({
        firmness,
        support: r.subScores.support,
        pressureRelief: r.subScores.pressureRelief,
        bandFit: r.firmnessFit ? r.firmnessFit.bandFit : null,
      });
    }
    if (!band) throw new Error('Firmness curve loop produced no points');
    return { position, band: { min: band.min, max: band.max }, points };
  });
}

/* ------------------------------------------------------------------ */
/* Worked example: the real #1 match for a fixed, disclosed profile.   */
/* ------------------------------------------------------------------ */

export const EXAMPLE_PROFILE: ExampleProfile = {
  sleepPosition: 'side',
  weightLb: 160,
  preferredFirmnessLabel: 'medium-soft',
  sleepTemperature: 'hot',
  motionSensitivity: 'couple-high',
  painFocus: 'shoulders',
};

function countMeasured(result: ScoreResult): number {
  return Object.values(result.dimensionProvenance || {}).filter((p) => p === 'measured').length;
}

function rankV2(profile: EngineProfile, entries: readonly MattressEntry[]): { entry: MattressEntry; result: ScoreResult }[] {
  return entries
    .map((entry) => ({ entry, result: scoreEngine('0.2', profile, adaptCatalogEntryForScoringV2(entry)) }))
    .sort((a, b) =>
      b.result.overallScore - a.result.overallScore ||
      countMeasured(b.result) - countMeasured(a.result) ||
      String(a.entry.id).localeCompare(String(b.entry.id)));
}

/** Three contrasting sleepers scored against the same mattress. */
export const CONTRAST_PROFILES: readonly ContrastProfile[] = [
  { id: 'side', label: 'Side sleeper, 160 lb, sleeps hot, light-sleeping partner', profile: EXAMPLE_PROFILE },
  { id: 'back', label: 'Back sleeper, 200 lb, likes medium-firm, sleeps alone', profile: { sleepPosition: 'back', weightLb: 200, preferredFirmnessLabel: 'medium-firm', sleepTemperature: 'neutral', motionSensitivity: 'single' } },
  { id: 'stomach', label: 'Stomach sleeper, 250 lb, likes firm, lower-back discomfort', profile: { sleepPosition: 'stomach', weightLb: 250, preferredFirmnessLabel: 'firm', sleepTemperature: 'neutral', motionSensitivity: 'single', painFocus: 'lower-back' } },
];

function buildWorkedExample(entries: readonly MattressEntry[]): WorkedExample | null {
  const [top] = rankV2(EXAMPLE_PROFILE, entries);
  if (!top) return null;
  const { entry, result } = top;
  const { effectiveWeights, dimensionProvenance, scoreBreakdown } = result;
  // A v0.2 result always carries these; without them there is no breakdown to show.
  if (!effectiveWeights || !dimensionProvenance || !scoreBreakdown) return null;
  const engineInput = adaptCatalogEntryForScoringV2(entry);
  const contrasts = CONTRAST_PROFILES.map(({ id, label, profile }) => ({
    id,
    label,
    score: scoreEngine('0.2', profile, engineInput).overallScore,
  }));
  return {
    contrasts,
    id: entry.id,
    brand: entry.brand,
    title: displayTitle(entry),
    type: entry.type,
    overallScore: result.overallScore,
    subScores: result.subScores,
    effectiveWeights,
    dimensionProvenance,
    scoreBreakdown,
    firmnessFit: result.firmnessFit ?? null,
    comfortBand: result.comfortBand,
    riskFlagCount: result.riskFlags.length,
  };
}

/* ------------------------------------------------------------------ */
/* Version comparison: the same 288 profiles the engine tests use.     */
/* ------------------------------------------------------------------ */

function quizGrid(): EngineProfile[] {
  const out: EngineProfile[] = [];
  for (const sleepPosition of ['side', 'back', 'stomach', 'combination'])
    for (const weightLb of [120, 160, 200, 250])
      for (const preferredFirmnessLabel of ['soft', 'medium-soft', 'medium', 'medium-firm', 'firm', 'extra-firm'])
        for (const sleepTemperature of ['cold', 'neutral', 'hot'])
          out.push({ sleepPosition, weightLb, preferredFirmnessLabel, sleepTemperature, motionSensitivity: 'single' });
  return out;
}

function topScoreStats(version: Extract<ScoreVersion, '0.1' | '0.2'>, entries: readonly MattressEntry[], profiles: readonly EngineProfile[]): TopScoreStats {
  const counts = new Map<number, number>();
  const tops = new Set<string>();
  for (const profile of profiles) {
    let best: { id: string; score: number } | null = null;
    for (const entry of entries) {
      const input = version === '0.1' ? adaptCatalogEntryForScoring(entry).scoringInput : adaptCatalogEntryForScoringV2(entry);
      const { overallScore } = scoreEngine(version, profile, input);
      if (!best || overallScore > best.score) best = { id: entry.id, score: overallScore };
    }
    if (!best) continue;
    counts.set(best.score, (counts.get(best.score) || 0) + 1);
    tops.add(best.id);
  }
  const scores = [...counts.keys()].sort((a, b) => a - b);
  return {
    version,
    distribution: scores.map((score) => ({ score, count: counts.get(score) ?? 0 })),
    min: scores[0] ?? 0,
    max: scores[scores.length - 1] ?? 0,
    distinctScores: scores.length,
    distinctTopMattresses: tops.size,
  };
}

/* ------------------------------------------------------------------ */
/* Catalog provenance.                                                 */
/* ------------------------------------------------------------------ */

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function buildProvenance(entries: readonly MattressEntry[], pipeline: RtingsPipelineStatus): Provenance {
  const audit = auditCatalog(entries);
  const dates = entries.map((e) => e.lastVerified).filter((d): d is string => Boolean(d)).sort();
  const rtings = entries
    .map((e) => e.rtingsCrossCheckedAt)
    .filter((d): d is string => Boolean(d))
    .map((d) => String(d).slice(0, 10))
    .sort();

  const reviewSources = new Map<string, number>();
  for (const e of entries) {
    // Read defensively: database rows may carry a partial reviewSources array.
    const names = new Set((e.reviewSources || []).map((s) => s?.sourceName).filter((n): n is string => Boolean(n)));
    for (const name of names) reviewSources.set(name, (reviewSources.get(name) || 0) + 1);
  }
  const officialSource = entries.filter((e) => e.dataOrigin === 'manufacturer-official-source' || e.sourceUrl).length;
  const brandPageSource = entries.filter((e) => e.sourceUrl && e.officialProductUrl).length;
  const retailerSource = entries.filter((e) => e.sourceUrl && !e.officialProductUrl).length;
  const independentFirmness = entries.filter((e) => typeof e.firmnessSource === 'string' && e.firmnessSource.startsWith('independent')).length;

  const coverage: Provenance['coverage'] = [
    { id: 'firmness', label: 'Firmness', count: entries.filter((e) => e.firmnessRange && isNum(e.firmnessRange.min)).length },
    { id: 'trial', label: 'Trial length', count: entries.filter((e) => isNum(e.trialDays)).length },
    { id: 'height', label: 'Height', count: entries.filter((e) => isNum(e.heightIn)).length },
    { id: 'price', label: 'Queen price', count: entries.filter((e) => isNum(e.priceUsd)).length },
    { id: 'warranty', label: 'Warranty', count: entries.filter((e) => isNum(e.warrantyYears) || e.warrantyLifetime === true).length },
    { id: 'motion', label: 'Motion isolation rating', count: entries.filter((e) => isNum(e.motionIsolationRatingOutOf10)).length },
    { id: 'edge', label: 'Edge support rating', count: entries.filter((e) => isNum(e.edgeSupportRatingOutOf10)).length },
    { id: 'durability', label: 'Durability rating', count: entries.filter((e) => isNum(e.durabilityRatingOutOf10)).length },
    { id: 'cooling', label: 'Cooling rating', count: entries.filter((e) => isNum(e.coolingRatingOutOf10)).length },
    { id: 'density', label: 'Foam density', count: entries.filter((e) => isNum(e.topFoamDensityLbFt3)).length },
  ];

  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  return {
    audit: { total: audit.total, byLevel: audit.byLevel },
    lastVerified: earliest && latest ? { earliest, latest } : null,
    rtingsCrossChecks: { count: rtings.length, latest: rtings[rtings.length - 1] ?? null },
    rtingsPipeline: { ...pipeline, syncIntervalDays: RTINGS_SYNC_INTERVAL_DAYS, actorSlug: RTINGS_ACTOR_SLUG },
    reviewSources: [...reviewSources.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    officialSource,
    brandPageSource,
    retailerSource,
    independentFirmness,
    coverage,
  };
}

/** Per-dimension: how many catalog mattresses get a measured vs estimated sub-score (engine output). */
function buildDimensionCoverage(entries: readonly MattressEntry[]): Record<ScoreCategory, number> {
  const profile: EngineProfile = { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' };
  const counts = Object.fromEntries(DIM_IDS.map((id) => [id, 0])) as Record<ScoreCategory, number>;
  for (const entry of entries) {
    const r = scoreEngine('0.2', profile, adaptCatalogEntryForScoringV2(entry));
    for (const id of DIM_IDS) if (r.dimensionProvenance?.[id] === 'measured') counts[id] += 1;
  }
  return counts;
}

/* ------------------------------------------------------------------ */

export async function getMethodologyData(): Promise<MethodologyData> {
  const [{ entries, source }, rtingsPipeline] = await Promise.all([getCatalog(), loadRtingsPipelineStatus()]);
  const { stride, table } = buildWeightTable();
  const profiles = quizGrid();

  return {
    catalogSource: source,
    catalog: {
      total: entries.length,
      brands: new Set(entries.map((e) => e.brand).filter(Boolean)).size,
    },
    rules: {
      version: rulesV2.version,
      baseWeights: rulesV2.baseWeights,
      v1Weights: rulesV1.weights,
      weightRules: rulesV2.weightModifiers.rules.map(({ id, description, rationale, multiply }) => ({ id, description, rationale, multiply })),
      typeBaselines: rulesV2.typeBaselines,
      estimateCap: rulesV2.estimateCap,
      estimateCapRationale: rulesV2.estimateCapRationale,
      ratedDimensions: rulesV2.ratedDimensions,
      firmnessFit: rulesV2.firmnessFit,
      preferenceFit: rulesV2.preferenceFit,
      thresholds: rulesV2.thresholds,
      durability: rulesV2.durability,
      riskFlagRules: rulesV2.riskFlagRules.map(({ code, category, description, mitigation }) => ({ code, category, description, mitigation })),
      firmnessLabelScale: rulesV2.firmnessLabelScale,
    },
    explorer: { fields: EXPLORER_FIELDS, stride, table },
    curves: { weightLb: CURVE_WEIGHT_LB, series: buildFirmnessCurves() },
    example: { profile: EXAMPLE_PROFILE, match: entries.length ? buildWorkedExample(entries) : null },
    versions: entries.length
      ? { profiles: profiles.length, v1: topScoreStats('0.1', entries, profiles), v2: topScoreStats('0.2', entries, profiles) }
      : null,
    provenance: buildProvenance(entries, rtingsPipeline),
    money: monetizationStatus(entries),
    dimensionCoverage: buildDimensionCoverage(entries),
  };
}
