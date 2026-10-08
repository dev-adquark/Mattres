/**
 * Builders for each homepage data slice. Server-only (they call the engine
 * and read the catalog); every value is an engine output or a catalog field
 * on file, never filled in.
 */
import { matchProfile } from '@/lib/matchLogic';
import { computeEffectiveWeights, type FirmnessBand, type RulesV02 } from '@/lib/scoreEngine';
import { tierFor } from '@/lib/scoreTiers';
import { getVerificationLevel, missingFields } from '@/lib/dataIntegrity';
import { displayTitle } from '@/lib/format';
import { priceAwaitingRecheck } from '@/lib/commerce';
import { firmnessFor, firmnessRangeText, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { buildCategoryView } from '@/components/catalog/buildCategory';
import { REFERENCE_PROFILES } from '@/components/catalog/referenceRankings';
import type { MatchItem, MatchResponse, MattressEntry, MattressType, SleepPosition, SleepProfile, SubScores, TierId, VerificationLevel } from '@/lib/types';
import {
  ATTRIBUTE_FIELDS,
  CONTRAST_PROFILES,
  PREVIEW_BUDGETS,
  PREVIEW_DEFAULTS,
  PREVIEW_EDGE,
  PREVIEW_FIRMNESS,
  PREVIEW_PAIN,
  PREVIEW_POSITIONS,
  PREVIEW_SHARING,
  PREVIEW_TEMPERATURES,
  PREVIEW_WEIGHTS,
  SCORE_VERSION,
  isNum,
  measuredCount,
} from './homeConfig';
import { cellCount, cellIndex, previewProfile, topFromRun } from './previewGrid';
import type { BandRange, BandTuple, CompareFinalist, HomeContrast, HomePersonal, HomePreview, PreviewCell, PreviewMattress, SleepCategoryCard, StorySlideData } from './types';

export const runMatch = (profile: SleepProfile): Promise<MatchResponse> => matchProfile(profile, { scoreVersion: SCORE_VERSION });

export const effectiveWeights = (rules: RulesV02, profile: Partial<SleepProfile>): SubScores => computeEffectiveWeights(rules, profile).effective;

const typeLabelOf = (type: MattressType): string => MATTRESS_TYPE_LABEL[type] || type;
const round1 = (v: number): number => Math.round(v * 10) / 10;
const bandOf = (band: { min: number; max: number } | null | undefined): BandRange | null => (band ? { min: band.min, max: band.max } : null);

/** The [min, max] comfort range the rules dataset gives a position and weight band. */
function comfortBand(rules: RulesV02, position: SleepPosition, weightBand: string): BandTuple {
  const byWeight = rules.firmnessComfortBands[position];
  const band: FirmnessBand | undefined = typeof byWeight === 'object' ? byWeight[weightBand] : undefined;
  if (!band) throw new Error(`Rules ${rules.version} have no comfort band for ${position} / ${weightBand}.`);
  return band;
}

// ---------------------------------------------------------------------------
// Ordering: "most complete data on file"
// ---------------------------------------------------------------------------

const LEVEL_RANK: Record<VerificationLevel, number> = { verified: 3, partially_verified: 2, unverified: 1, unknown: 0 };

/** Verification level, then independent ratings, then fewest missing fields, then id. */
export function completenessCompare(a: MattressEntry, b: MattressEntry): number {
  return (
    LEVEL_RANK[getVerificationLevel(b)] - LEVEL_RANK[getVerificationLevel(a)] ||
    measuredCount(b) - measuredCount(a) ||
    missingFields(a).length - missingFields(b).length ||
    String(a.id).localeCompare(String(b.id))
  );
}

// ---------------------------------------------------------------------------
// Slices
// ---------------------------------------------------------------------------

/** A serialisable story-slider slide: only fields on file, never filled in. */
export function storySlide(entry: MattressEntry): StorySlideData {
  const firmness = firmnessFor(entry);
  const typeLabel = typeLabelOf(entry.type);
  const attributes = ATTRIBUTE_FIELDS.flatMap(({ field, label }) => {
    const value = entry[field];
    return isNum(value) ? [{ label, rating: value }] : [];
  })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2)
    .map(({ label, rating }) => ({ label, value: `${rating}/10` }));
  if (attributes.length < 2 && isNum(entry.heightIn)) attributes.push({ label: 'Height', value: `${entry.heightIn} in` });
  if (attributes.length < 2 && isNum(entry.warrantyYears)) attributes.push({ label: 'Warranty', value: `${entry.warrantyYears} years` });
  const range = firmnessRangeText(entry);
  const article = firmness && /^[aeiou]/i.test(firmness.label) ? 'An' : 'A';
  return {
    id: entry.id,
    brand: entry.brand,
    title: displayTitle(entry),
    type: entry.type,
    typeLabel,
    firmnessLabel: firmness ? firmness.label : null,
    photo: entry.photo ?? null,
    positioning: firmness
      ? firmness.multi
        ? `${/^[aeiou]/i.test(typeLabel) ? 'An' : 'A'} ${typeLabel.toLowerCase()} sold in several firmness options${range ? `, ${range} on the firmness scale.` : '.'}`
        : `${article} ${firmness.label.toLowerCase()} ${typeLabel.toLowerCase()}${range ? `, ${range} on the firmness scale.` : '.'}`
      : `${/^[aeiou]/i.test(typeLabel) ? 'An' : 'A'} ${typeLabel.toLowerCase()} build. Firmness not yet verified.`,
    attributes: attributes.slice(0, 2),
    trialDays: isNum(entry.trialDays) ? entry.trialDays : null,
    // A figure flagged for a re-check is withheld everywhere (lib/commerce).
    priceUsd: isNum(entry.priceUsd) && !priceAwaitingRecheck(entry) ? entry.priceUsd : null,
    priceFromUsd: isNum(entry.priceFromUsd) ? entry.priceFromUsd : null,
  };
}

/** 02 One mattress, two sleepers: the best-documented mattress with the widest score spread. */
export async function buildContrast(catalog: MattressEntry[]): Promise<HomeContrast | null> {
  const runs = await Promise.all(CONTRAST_PROFILES.map((p) => runMatch(p.profile)));
  const [first, second] = runs.map((run) => new Map(run.results.map((r) => [r.entry.id, r] as const)));
  let contrast: { entry: MattressEntry; a: MatchItem; b: MatchItem; spread: number; measured: number } | null = null;
  for (const entry of catalog) {
    const a = first?.get(entry.id);
    const b = second?.get(entry.id);
    if (!a || !b || entry.sponsored) continue;
    const spread = Math.abs(a.result.overallScore - b.result.overallScore);
    // Prefer well-documented mattresses so the example rests on real ratings.
    const candidate = { entry, a, b, spread, measured: measuredCount(entry) };
    if (!contrast || (candidate.measured >= 3 && (contrast.measured < 3 || candidate.spread > contrast.spread))) {
      contrast = candidate;
    }
  }
  if (!contrast) return null;
  const picked = contrast;
  return {
    id: picked.entry.id,
    brand: picked.entry.brand,
    title: displayTitle(picked.entry),
    type: picked.entry.type,
    firmness: firmnessFor(picked.entry),
    sleepers: CONTRAST_PROFILES.map((p, i) => {
      const item = i === 0 ? picked.a : picked.b;
      return {
        id: p.id,
        label: p.label,
        score: item.result.overallScore,
        tier: tierFor(item.result.overallScore).label,
        band: bandOf(item.result.comfortBand),
        headline: item.explanation.headline,
      };
    }),
  };
}

/** 03 Personalisation: the real comfort-range and weighting rules. */
export function buildPersonal(rules: RulesV02): HomePersonal {
  const weightBands = rules.weightBands.map((b) => ({
    key: b.key,
    label: b.minLb == null ? `Under ${b.maxLb} lb` : b.maxLb == null ? `${b.minLb} lb and over` : `${b.minLb}–${b.maxLb} lb`,
    side: comfortBand(rules, 'side', b.key),
  }));
  const hotWeights = effectiveWeights(rules, { sleepPosition: 'side', sleepTemperature: 'hot' });
  const neutralWeights = effectiveWeights(rules, { sleepPosition: 'side', sleepTemperature: 'neutral' });
  return {
    positionBands: PREVIEW_POSITIONS.map((p) => ({ ...p, band: comfortBand(rules, p.id, '130-180') })),
    weightBands,
    cooling: {
      base: rules.baseWeights.heat,
      hot: round1(hotWeights.heat * 100),
      neutral: round1(neutralWeights.heat * 100),
      multiplier: rules.weightModifiers.rules.find((r) => r.id === 'WEIGHT_TEMPERATURE_HOT')?.multiply.heat ?? null,
    },
  };
}

/**
 * 03 Interactive sleep profile: every position x feel x weight x temperature x
 * sharing combination, scored by the engine. Cells are packed (PreviewCell)
 * against shared mattress / tier / reason tables so the whole grid ships to
 * the client as a small payload; previewGrid.ts decodes it.
 */
export async function buildPreviewGrid(rules: RulesV02): Promise<HomePreview> {
  const firmness = PREVIEW_FIRMNESS.map((f) => {
    const value = rules.firmnessLabelScale[f.id];
    if (value === undefined) throw new Error(`Rules ${rules.version} have no firmness value for "${f.id}".`);
    return { ...f, value };
  });
  const axes = { positions: PREVIEW_POSITIONS, firmness, weights: PREVIEW_WEIGHTS, temperatures: PREVIEW_TEMPERATURES, sharing: PREVIEW_SHARING };
  const cells: PreviewCell[] = new Array(cellCount(axes)).fill(null);
  const mattresses: PreviewMattress[] = [];
  const mattressIndex = new Map<string, number>();
  const tiers: { id: TierId; label: string }[] = [];
  const reasons: string[] = [];
  const reasonIndex = new Map<string, number>();
  const comfortBands: Record<string, BandRange> = {};

  const intern = <T,>(list: T[], index: Map<string, number>, key: string, make: () => T): number => {
    let i = index.get(key);
    if (i === undefined) {
      i = list.push(make()) - 1;
      index.set(key, i);
    }
    return i;
  };
  const tierIndex = new Map<string, number>();

  const jobs: Promise<void>[] = [];
  PREVIEW_POSITIONS.forEach((pos, p) =>
    firmness.forEach((firm, f) =>
      PREVIEW_WEIGHTS.forEach((weight, w) =>
        PREVIEW_TEMPERATURES.forEach((temp, t) =>
          PREVIEW_SHARING.forEach((share, sh) => {
            jobs.push(
              runMatch(previewProfile({ position: pos.id, firmness: firm.id, weightLb: weight.weightLb, temperature: temp.id, sharing: share.id })).then((run) => {
                const idx = cellIndex(axes, { position: p, firmness: f, weight: w, temperature: t, sharing: sh });
                const first = run.results.find((r) => !r.entry.sponsored);
                if (first?.result.comfortBand) comfortBands[`${pos.id}|${weight.id}`] = { min: first.result.comfortBand.min, max: first.result.comfortBand.max };
                // Same reading as the live path (previewGrid.topFromRun).
                const top = topFromRun(run.results);
                if (!top) return;
                const m = intern(mattresses, mattressIndex, top.id, () => ({
                  id: top.id,
                  brand: top.brand,
                  title: top.title,
                  type: top.type,
                  typeLabel: top.typeLabel,
                  firmness: top.firmness,
                }));
                const ti = intern(tiers, tierIndex, top.tier.id, () => top.tier);
                const r = top.reasons.map((text) => intern(reasons, reasonIndex, text, () => text));
                cells[idx] = [m, top.score, ti, top.strongCount, top.total, r];
              }),
            );
          }),
        ),
      ),
    ),
  );
  await Promise.all(jobs);

  return {
    scoreVersion: SCORE_VERSION,
    ...axes,
    pains: PREVIEW_PAIN,
    edges: PREVIEW_EDGE,
    budgets: PREVIEW_BUDGETS,
    defaults: PREVIEW_DEFAULTS,
    mattresses,
    tiers,
    reasons,
    cells,
    comfortBands,
  };
}

/**
 * Discover by how you sleep: the destination category page's own No. 1, built
 * by the same buildCategoryView() call /mattresses/<slug> renders from, so the
 * card's top pick, score, reference sleeper and "ranked of shown" count can
 * never disagree with the page it links to.
 */
export async function buildSleepCategory(slug: string, catalog: MattressEntry[]): Promise<SleepCategoryCard | null> {
  const view = await buildCategoryView(slug, catalog);
  if (!view) return null;
  const first = view.lists[0]?.ranked[0]?.entry ?? view.lists[0]?.unranked[0]?.entry;
  if (!first) return null;
  const top = view.podium[0] ?? null;
  const profile = view.editorial.ranking.method === 'profile' ? REFERENCE_PROFILES[view.editorial.ranking.profile] : null;
  return {
    slug,
    href: view.href,
    title: view.category.chip,
    description: view.category.description,
    shown: view.shown,
    ranked: view.rankedCount,
    profileLabel: profile ? profile.label : null,
    profileText: view.profileText,
    type: top ? top.entry.type : first.type,
    seed: top ? top.id : first.id,
    top: top
      ? { id: top.id, brand: top.entry.brand, title: top.title, display: top.metric.display, metricKind: top.metric.kind, metricLabel: top.metric.label }
      : null,
  };
}

/** One column of the demo comparison. */
export function toFinalist(item: MatchItem): CompareFinalist {
  return {
    id: item.entry.id,
    brand: item.entry.brand,
    title: displayTitle(item.entry),
    type: item.entry.type,
    typeLabel: typeLabelOf(item.entry.type),
    priceUsd: isNum(item.entry.priceUsd) && !priceAwaitingRecheck(item.entry) ? item.entry.priceUsd : null,
    priceFromUsd: isNum(item.entry.priceFromUsd) ? item.entry.priceFromUsd : null,
    firmness: firmnessFor(item.entry),
    score: item.result.overallScore,
    tier: item.explanation.tier.label,
    subScores: item.result.subScores,
    provenance: item.result.dimensionProvenance ?? null,
    watchOut: item.explanation.watchOuts.find((w) => w.severity !== 'info') || null,
    isBestValue: !!item.isBestValue,
  };
}
