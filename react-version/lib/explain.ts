/**
 * Centralised explanation layer. Turns a scored match item (from
 * matchProfile) into user-facing copy built ONLY from what the scoring
 * engine actually produced: sub-scores, dimensionProvenance, firmnessFit,
 * effectiveWeights, riskFlags and the catalog's missingFields. UI
 * components render these strings; they must not compute their own.
 *
 * Rules enforced here:
 *  - A dimension marked 'estimated' is never presented as a measured
 *    strength (it never appears in `reasons`); it is disclosed in
 *    `dataNotes` instead.
 *  - Internal codes are never placed in user-facing text (watchOuts keep
 *    `code` only as a stable key for rendering/analytics).
 *
 * Pure (no Node APIs), safe to import anywhere.
 */

import { tierFor, dimensionLabel } from './scoreTiers';
import type {
  DimensionProvenance,
  Explanation,
  FirmnessLabel,
  MattressEntry,
  RiskFlag,
  ScoreCategory,
  ScoreResult,
  SleepPosition,
  SubScores,
  WatchOut,
  WatchOutSeverity,
} from '@/lib/types';

export interface DimensionDef {
  id: ScoreCategory;
  label: string;
  short: string;
}

/** The profile fields the explanation layer reads (an engine profile is assignable). */
export interface ExplainProfile {
  sleepPosition?: string;
  weightLb?: number;
  preferredFirmnessLabel?: string;
  sleepTemperature?: string;
  motionSensitivity?: string;
  edgeImportance?: string | null;
  painFocus?: string | readonly string[] | null;
}

/** The parts of a matchProfile() item the explanation layer reads. */
export interface ExplainItem {
  result: ScoreResult;
  entry?: Pick<MattressEntry, 'firmnessRange'> | null;
  dataProvenance?: Partial<Record<string, string>> | null;
  missingFields?: readonly string[] | null;
}

type Provenance = Record<ScoreCategory, DimensionProvenance>;
type Reason = Explanation['reasons'][number];
type ProfileFactor = Explanation['profileFactors'][number];
type DataNote = Explanation['dataNotes'][number];
type PainKey = 'shoulders' | 'hips' | 'lower-back' | 'whole-body';

export const DIMENSIONS: readonly DimensionDef[] = [
  { id: 'pressureRelief', label: 'Pressure relief', short: 'How well it cushions shoulders and hips.' },
  { id: 'support', label: 'Support & alignment', short: 'How well it keeps your spine level for your position and weight.' },
  { id: 'heat', label: 'Cooling', short: 'How well it avoids trapping body heat.' },
  { id: 'motion', label: 'Motion isolation', short: "How little a partner's movement carries across the bed." },
  { id: 'edge', label: 'Edge support', short: 'How firm the perimeter feels when sitting or sleeping near the edge.' },
  { id: 'durability', label: 'Durability', short: 'How well it is expected to keep its shape over the years.' },
];

export const DIMENSION_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d])) as Record<ScoreCategory, DimensionDef>;

const POSITION_NOUN: Record<SleepPosition, string> = {
  side: 'side sleeper',
  back: 'back sleeper',
  stomach: 'stomach sleeper',
  combination: 'combination sleeper',
};

const FIRMNESS_LABEL_TEXT: Record<FirmnessLabel, string> = {
  soft: 'soft',
  'medium-soft': 'medium-soft',
  medium: 'medium',
  'medium-firm': 'medium-firm',
  firm: 'firm',
  'extra-firm': 'extra-firm',
};

const PAIN_TEXT: Record<PainKey, string> = {
  shoulders: 'Shoulder discomfort',
  hips: 'Hip discomfort',
  'lower-back': 'Lower-back discomfort',
  'whole-body': 'General aches',
};

const MISSING_FIELD_NOTES: Record<string, DataNote> = {
  priceUsd: { id: 'price-unverified', text: 'Price not yet verified.' },
  warrantyYears: { id: 'warranty-unverified', text: 'Warranty length not yet verified.' },
  trialDays: { id: 'trial-unverified', text: 'Trial length not yet verified.' },
  heightIn: { id: 'height-unverified', text: 'Mattress height not yet verified.' },
  firmnessRange: { id: 'firmness-unverified', text: 'Firmness not yet verified; a neutral medium feel was assumed, so support and pressure relief are estimates.' },
  type: { id: 'type-unverified', text: 'Construction type not yet verified.' },
  brand: { id: 'brand-unverified', text: 'Brand not yet verified.' },
  model: { id: 'model-unverified', text: 'Model name not yet verified.' },
};

const SEVERITY_ORDER: Record<WatchOutSeverity, number> = { warning: 0, caution: 1, info: 2 };

function fmt(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function pct(w: number): string {
  return `${Math.round(w * 100)}%`;
}

function normalizePainFocus(painFocus: unknown): PainKey[] {
  const aliases: Record<string, PainKey> = { shoulder: 'shoulders', shoulders: 'shoulders', hip: 'hips', hips: 'hips', back: 'lower-back', lowerBack: 'lower-back', 'lower-back': 'lower-back', 'whole-body': 'whole-body' };
  const raw: readonly unknown[] = Array.isArray(painFocus) ? painFocus : painFocus == null ? [] : [painFocus];
  return [...new Set(raw.map((v) => aliases[v as string]).filter((v): v is PainKey => Boolean(v)))].sort();
}

/**
 * dimensionProvenance for a result. v0.2 results carry it; for a v0.1
 * result (no such field) every dimension is treated as estimated except
 * support/pressure relief when a real firmness was on file - the safe
 * direction, since v0.1 reduced ratings to yes/no switches.
 */
export function provenanceFor(item: Partial<ExplainItem> | null | undefined): Provenance {
  const result: Partial<ScoreResult> = item && item.result ? item.result : {};
  if (result.dimensionProvenance) return result.dimensionProvenance;
  const firmnessKnown = !(item && item.dataProvenance && item.dataProvenance.firmness === 'unknown_neutral_fallback');
  return {
    pressureRelief: firmnessKnown ? 'measured' : 'estimated',
    support: firmnessKnown ? 'measured' : 'estimated',
    heat: 'estimated',
    motion: 'estimated',
    edge: 'estimated',
    durability: 'estimated',
  };
}

/** Lookup by an unvalidated profile value; unknown keys read as undefined, like the JS original. */
function lookup<V>(table: Record<string, V>, key: string | null | undefined): V | undefined {
  return table[key as string];
}

function profileDescriptor(profile: ExplainProfile | null | undefined): string {
  return `a ${lookup(POSITION_NOUN, profile && profile.sleepPosition) || 'sleeper'}`;
}

function reasonText(dim: ScoreCategory, item: ExplainItem, profile: ExplainProfile | null | undefined): string {
  const result = item.result;
  const score = result.subScores[dim];
  const level = dimensionLabel(score);
  const fit = result.firmnessFit;
  const band = result.comfortBand;
  const noun = lookup(POSITION_NOUN, profile && profile.sleepPosition) || 'sleeper';
  switch (dim) {
    case 'support':
      if (fit && fit.known && fit.bandDirection === 'in-band' && band) {
        return `Its firmness (about ${fmt(fit.firmness)}/10) sits inside the ${fmt(band.min)}–${fmt(band.max)}/10 range that keeps a ${noun} at your weight aligned.`;
      }
      return `${level} support and alignment for your position and weight.`;
    case 'pressureRelief': {
      const why = profile && profile.sleepPosition === 'side' ? ' That matters most for side sleepers.' : '';
      if (fit && fit.known) return `${level} pressure relief: at about ${fmt(fit.firmness)}/10 firmness, shoulders and hips can settle in rather than press against the surface.${why}`;
      return `${level} pressure relief for your profile.${why}`;
    }
    case 'heat':
      return `Independent reviewers rate its cooling ${fmt(score)}/10${profile && profile.sleepTemperature === 'hot' ? ', which matters because you sleep hot' : ''}.`;
    case 'motion':
      return `Independent reviewers rate its motion isolation ${fmt(score)}/10${profile && (profile.motionSensitivity === 'couple-high' || profile.motionSensitivity === 'couple-low') ? ', helpful when you share the bed' : ''}.`;
    case 'edge':
      return `Independent reviewers rate its edge support ${fmt(score)}/10${profile && profile.edgeImportance === 'high' ? ', which you said matters a lot' : ''}.`;
    case 'durability':
      // A missing weight compares false, as in the JS original.
      return `Independent reviewers rate its durability ${fmt(score)}/10${profile && (profile.weightLb as number) >= 230 ? ', relevant at your weight' : ''}.`;
    default:
      return '';
  }
}

type WatchOutCopy = (flag: RiskFlag, item: ExplainItem, profile: ExplainProfile | null | undefined) => { title: string; severity: WatchOutSeverity };

const WATCH_OUT_COPY: Record<string, WatchOutCopy> = {
  SUPPORT_THRESHOLD_MISMATCH: (flag, item) => {
    const dir = item.result.firmnessFit && item.result.firmnessFit.bandDirection;
    const distance = item.result.firmnessFit && item.result.firmnessFit.bandDistance;
    return {
      title: dir === 'softer' ? 'Softer than recommended for you' : 'Firmer than recommended for you',
      severity: typeof distance === 'number' && distance >= 1.5 ? 'warning' : 'caution',
    };
  },
  PREFERRED_FIRMNESS_MISMATCH: () => ({ title: 'Different feel from what you asked for', severity: 'caution' }),
  HEAT_RETENTION_LIKELY: (flag) => ({ title: 'May sleep warm', severity: flag.basis === 'estimated' ? 'caution' : 'warning' }),
  EDGE_SUPPORT_CONCERN: (flag, item, profile) => ({
    title: 'Softer edges',
    severity: flag.basis !== 'estimated' && profile && profile.edgeImportance === 'high' ? 'warning' : 'caution',
  }),
  MOTION_TRANSFER_LIKELY: (flag) => ({ title: "A partner's movement may carry", severity: flag.basis === 'estimated' ? 'caution' : 'warning' }),
  PRESSURE_POINT_RISK: (flag, item) => ({
    title: 'Possible pressure points',
    severity: item.result.subScores.pressureRelief < 5 ? 'warning' : 'caution',
  }),
  DURABILITY_SAG_RISK: () => ({ title: 'Faster wear at higher body weights', severity: 'warning' }),
};

function buildWatchOuts(item: ExplainItem, profile: ExplainProfile | null | undefined): WatchOut[] {
  const out: WatchOut[] = [];
  for (const flag of item.result.riskFlags || []) {
    const copyFor = WATCH_OUT_COPY[flag.code];
    const copy: { title: string; severity: WatchOutSeverity } = copyFor ? copyFor(flag, item, profile) : { title: 'Worth checking', severity: 'caution' };
    out.push({ code: flag.code, severity: copy.severity, title: copy.title, text: flag.rationale, mitigation: flag.mitigation });
  }
  const range = item.entry && item.entry.firmnessRange;
  if (range && typeof range.min === 'number' && typeof range.max === 'number' && range.max - range.min >= 2) {
    const mid = (range.min + range.max) / 2;
    out.push({
      code: 'MULTIPLE_FIRMNESS_OPTIONS',
      severity: 'info',
      title: 'Sold in more than one firmness',
      text: `Firmness is listed from ${fmt(range.min)} to ${fmt(range.max)}/10. This score uses the middle of that range (about ${fmt(mid)}/10); the option you choose will change how well it fits.`,
      mitigation: 'Pick the option closest to your recommended firmness range.',
    });
  }
  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function buildProfileFactors(item: ExplainItem, profile: ExplainProfile | null | undefined): ProfileFactor[] {
  const result = item.result;
  const eff: Partial<SubScores> = result.effectiveWeights || result.weights || {};
  const base: Partial<SubScores> = result.baseWeights || {};
  const factors: ProfileFactor[] = [];
  const shift = (dim: ScoreCategory): string => (base[dim] !== undefined && eff[dim] !== undefined
    ? `${DIMENSION_BY_ID[dim].label} counts for ${pct(eff[dim] as number)} of this score (${pct(base[dim] as number)} by default).`
    : `${DIMENSION_BY_ID[dim].label} carries more weight in this score.`);

  const positionNoun = profile ? lookup(POSITION_NOUN, profile.sleepPosition) : undefined;
  if (profile && positionNoun) {
    const band = result.comfortBand;
    factors.push({
      id: 'position',
      label: `${(positionNoun[0] as string).toUpperCase()}${positionNoun.slice(1)}${typeof profile.weightLb === 'number' ? `, ${fmt(profile.weightLb)} lb` : ''}`,
      text: band ? `Recommended firmness for you: ${fmt(band.min)}–${fmt(band.max)}/10.` : 'Sets your recommended firmness range.',
    });
  }
  const preferenceText = profile ? lookup(FIRMNESS_LABEL_TEXT, profile.preferredFirmnessLabel) : undefined;
  if (profile && preferenceText) {
    const fit = result.firmnessFit;
    factors.push({
      id: 'preference',
      label: `Prefers ${preferenceText}`,
      text: fit && typeof fit.preferred === 'number'
        ? `About ${fmt(fit.preferred)}/10; mattresses further from this lose points.`
        : 'Compared against each mattress’s firmness.',
    });
  }
  if (profile && profile.sleepTemperature === 'hot') factors.push({ id: 'temperature', label: 'Sleeps hot', text: shift('heat') });
  if (profile && profile.sleepTemperature === 'cold') factors.push({ id: 'temperature', label: 'Sleeps cold', text: shift('heat') });
  if (profile && profile.motionSensitivity === 'couple-high') factors.push({ id: 'motion', label: 'Easily woken by a partner', text: shift('motion') });
  if (profile && profile.motionSensitivity === 'single') factors.push({ id: 'motion', label: 'Sleeps alone', text: shift('motion') });
  if (profile && profile.edgeImportance === 'high') factors.push({ id: 'edge', label: 'Edge support matters', text: shift('edge') });
  if (profile && profile.edgeImportance === 'low') factors.push({ id: 'edge', label: 'Edge support matters little', text: shift('edge') });
  for (const pain of normalizePainFocus(profile && profile.painFocus)) {
    const dim = pain === 'lower-back' ? 'support' : 'pressureRelief';
    factors.push({ id: `pain-${pain}`, label: PAIN_TEXT[pain], text: shift(dim) });
  }
  if (profile && typeof profile.weightLb === 'number' && profile.weightLb >= 230) {
    factors.push({ id: 'weight', label: 'Heavier build', text: shift('durability') });
  }
  return factors;
}

function buildDataNotes(item: ExplainItem): DataNote[] {
  const notes: DataNote[] = [];
  const prov = provenanceFor(item);
  const estimated = DIMENSIONS.filter((d) => prov[d.id] !== 'measured');
  if (estimated.length >= 3) {
    notes.push({
      id: 'limited-data',
      text: `Limited verified data: ${estimated.length} of ${DIMENSIONS.length} dimensions (${estimated.map((d) => d.label.toLowerCase()).join(', ')}) are estimated from the mattress's construction type because no independent rating is on file.`,
    });
  } else {
    for (const d of estimated) {
      notes.push({ id: `estimated-${d.id}`, text: `${d.label} is estimated from the mattress's construction type; no independent rating is on file.` });
    }
  }
  for (const field of item.missingFields || []) {
    const note = MISSING_FIELD_NOTES[field];
    if (field === 'firmnessRange' && estimated.length >= 3 && prov.support !== 'measured') {
      notes.push(MISSING_FIELD_NOTES.firmnessRange as DataNote);
      continue;
    }
    if (note) notes.push(note);
  }
  return notes;
}

/**
 * @param item a matchProfile() result item ({entry, result, missingFields, dataProvenance, ...})
 * @param profile the Sleep Profile that produced it
 */
export function explainMatch(item: ExplainItem, profile: ExplainProfile | null | undefined): Explanation {
  const result = item.result;
  const tier = tierFor(result.overallScore);
  const prov = provenanceFor(item);
  const weights: Partial<SubScores> = result.effectiveWeights || result.weights || {};

  // Reasons: only measured dimensions that genuinely score well, ordered by
  // how much they contribute to this profile's score.
  const candidates = DIMENSIONS
    .map((d) => d.id)
    .filter((dim) => prov[dim] === 'measured' && result.subScores[dim] >= 7)
    .sort((a, b) => (weights[b] || 0) * result.subScores[b] - (weights[a] || 0) * result.subScores[a] || a.localeCompare(b));
  const reasons: Reason[] = candidates.slice(0, 4).map((dim) => ({ dimension: dim, text: reasonText(dim, item, profile) }));

  const fit = result.firmnessFit;
  const preferenceText = profile ? lookup(FIRMNESS_LABEL_TEXT, profile.preferredFirmnessLabel) : undefined;
  if (fit && fit.known && typeof fit.preferenceDistance === 'number' && fit.preferenceDistance <= 1 && profile && preferenceText) {
    reasons.push({
      dimension: 'preference',
      text: `Close to the ${preferenceText} feel you asked for (about ${fmt(fit.firmness)}/10).`,
    });
  }

  const strongest = candidates.slice(0, 2).map((dim) => DIMENSION_BY_ID[dim].label.toLowerCase());
  const scored = tier.id !== 'unscored';
  let headline = scored ? `${tier.label} for ${profileDescriptor(profile)}` : 'Not scored';
  if (scored && strongest.length) headline += `: strongest on ${strongest.join(' and ')}`;
  headline += '.';

  return {
    tier,
    headline,
    reasons,
    watchOuts: buildWatchOuts(item, profile),
    profileFactors: buildProfileFactors(item, profile),
    dataNotes: buildDataNotes(item),
  };
}

/**
 * Explanations are written to the person who took the quiz ("at your weight").
 * Reference pages (category rankings, head-to-heads, product reference scores)
 * score a fixed sleeper, so their text must not read as a claim about the
 * visitor. Presentation-layer only: engine output and snapshots are untouched.
 */
export function toReferenceVoice(text: string): string {
  return text
    .replace(/keeps your spine level for your position and weight/g, 'keeps the spine level for this position and weight')
    .replace(/support and alignment for your position and weight/g, 'support and alignment for this position and weight')
    .replace(/aligned at your weight|at your weight/g, 'at this weight')
    .replace(/for your profile/g, 'for this profile')
    .replace(/, which matters because you sleep hot/g, ', which matters for a hot sleeper')
    .replace(/, helpful when you share the bed/g, ', helpful when sharing a bed')
    .replace(/, which you said matters a lot/g, ', which matters a lot to this sleeper')
    .replace(/Recommended firmness for you/g, 'Recommended firmness for this sleeper');
}
