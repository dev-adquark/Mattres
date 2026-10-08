/**
 * Client-safe helpers for the homepage sleep-profile preview grid. The
 * server (homeSections.buildPreviewGrid) fills HomePreview.cells in this
 * row-major order; MatchPreview reads it back with the same function, so
 * the two can never disagree about which profile a cell belongs to.
 */
import { displayTitle } from '@/lib/format';
import { MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import type { EdgeImportance, FirmnessLabel, MattressEntry, MotionSensitivity, PainFocus, SleepPosition, SleepProfile, SleepTemperature, TierId } from '@/lib/types';
import { PREVIEW_DEFAULTS } from './homeConfig';
import type { HomePreview, PreviewTop } from './types';

export interface PreviewAnswers {
  position: SleepPosition;
  firmness: FirmnessLabel;
  weightLb: number;
  temperature: SleepTemperature;
  sharing: MotionSensitivity;
  /** Defaults (the grid's): PREVIEW_DEFAULTS.pain / .edge, no budget. */
  pain?: PainFocus;
  edge?: EdgeImportance;
  budgetMax?: number | null;
}

/**
 * The Sleep Profile a preview answer set is scored as, for both the server
 * grid and the live POST /api/match call. Pain and edge are always sent
 * (their defaults explicitly), so the two paths score the same profile.
 */
export function previewProfile(a: PreviewAnswers): SleepProfile {
  const profile: SleepProfile = {
    sleepPosition: a.position,
    preferredFirmnessLabel: a.firmness,
    weightLb: a.weightLb,
    sleepTemperature: a.temperature,
    motionSensitivity: a.sharing,
    painFocus: a.pain ?? PREVIEW_DEFAULTS.pain,
    edgeImportance: a.edge ?? PREVIEW_DEFAULTS.edge,
  };
  if (typeof a.budgetMax === 'number') profile.budgetUsd = { min: 0, max: a.budgetMax };
  return profile;
}

/** The parts of one /api/match result (or matchProfile() item) the preview reads. */
export interface PreviewRunItem {
  entry: Pick<MattressEntry, 'id' | 'brand' | 'model' | 'type' | 'sponsored'>;
  result: { overallScore: number; firmnessFit?: { firmness?: number | null } | null };
  explanation: { tier: { id: TierId; label: string }; reasons: readonly { text: string }[] };
}

/** A Strong match or better: the same cut the grid's strong-match count uses. */
export const STRONG_MATCH_MIN = 80;

/**
 * The preview's reading of one engine run: its top organic (never sponsored)
 * result, the first two reasons, and how many results score a Strong match.
 * The server grid (homeSections.buildPreviewGrid) and the live POST
 * /api/match path both go through this, so a cell and a live answer for the
 * same profile can never be read differently. null when nothing scored.
 */
export function topFromRun(results: readonly PreviewRunItem[]): PreviewTop | null {
  const top = results.find((r) => !r.entry.sponsored);
  if (!top) return null;
  const { entry, result, explanation } = top;
  const firmness = result.firmnessFit?.firmness;
  return {
    id: entry.id,
    brand: entry.brand,
    title: displayTitle(entry),
    type: entry.type,
    typeLabel: MATTRESS_TYPE_LABEL[entry.type] || entry.type,
    firmness: typeof firmness === 'number' && Number.isFinite(firmness) ? firmness : null,
    score: result.overallScore,
    tier: { id: explanation.tier.id, label: explanation.tier.label },
    reasons: explanation.reasons.slice(0, 2).map((r) => r.text),
    strongCount: results.filter((r) => r.result.overallScore >= STRONG_MATCH_MIN).length,
    total: results.length,
  };
}

export interface PreviewSelection {
  position: number;
  firmness: number;
  weight: number;
  temperature: number;
  sharing: number;
}

type AxisSizes = Pick<HomePreview, 'positions' | 'firmness' | 'weights' | 'temperatures' | 'sharing'>;

export function cellIndex(axes: AxisSizes, sel: PreviewSelection): number {
  return (
    (((sel.position * axes.firmness.length + sel.firmness) * axes.weights.length + sel.weight) * axes.temperatures.length + sel.temperature) *
      axes.sharing.length +
    sel.sharing
  );
}

export function cellCount(axes: AxisSizes): number {
  return axes.positions.length * axes.firmness.length * axes.weights.length * axes.temperatures.length * axes.sharing.length;
}

/** Decodes one packed cell into the shape MatchResult renders. Every value is the server's engine output. */
export function decodeCell(preview: HomePreview, index: number): PreviewTop | null {
  const cell = preview.cells[index];
  if (!cell) return null;
  const [m, score, t, strongCount, total, reasons] = cell;
  const mattress = preview.mattresses[m];
  const tier = preview.tiers[t];
  if (!mattress || !tier) return null;
  return {
    ...mattress,
    score,
    tier,
    strongCount,
    total,
    reasons: reasons.map((r) => preview.reasons[r]).filter((r): r is string => typeof r === 'string'),
  };
}
