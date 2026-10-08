/**
 * Typed readers for the comfort-window tables in the scoring rules
 * (lib/rules/0.2.json firmnessComfortBands / weightBands). Charts and copy
 * read every number through here, so nothing editorial restates a band.
 */

import type { SleepPosition } from '@/lib/types';
import type { RangeRow, ScoringRules, WeightBandKey } from './types';

const WEIGHT_BAND_LABEL: Record<WeightBandKey, string> = {
  'under-130': 'Under 130 lb',
  '130-180': '130–179 lb',
  '180-230': '180–229 lb',
  'over-230': '230 lb and up',
};

const POSITION_LABEL: Record<SleepPosition, string> = { side: 'Side', back: 'Back', stomach: 'Stomach', combination: 'Combination' };
const POSITIONS = Object.keys(POSITION_LABEL) as SleepPosition[];

export function isWeightBandKey(key: string): key is WeightBandKey {
  return Object.hasOwn(WEIGHT_BAND_LABEL, key);
}

export function weightBandLabel(key: string): string {
  return isWeightBandKey(key) ? WEIGHT_BAND_LABEL[key] : key;
}

/** [min, max] firmness (1-10) the rules treat as comfortable for a position at a weight band. */
export function comfortWindow(rules: ScoringRules, position: SleepPosition, band: WeightBandKey): [number, number] {
  const [min, max] = rules.firmnessComfortBands[position][band];
  if (min === undefined || max === undefined) throw new Error(`Scoring rules have no comfort band for ${position} / ${band}`);
  return [min, max];
}

/** The weight-band keys in rules order. */
export function weightBandKeys(rules: ScoringRules): WeightBandKey[] {
  return rules.weightBands.map((b) => b.key).filter(isWeightBandKey);
}

/** The weight band a body weight falls in (the heaviest band when none matches). */
export function weightBandFor(rules: ScoringRules, weightLb: number): WeightBandKey {
  const bands: { key: string; minLb?: number; maxLb?: number }[] = rules.weightBands;
  const band = bands.find((b) => (b.minLb === undefined || weightLb >= b.minLb) && (b.maxLb === undefined || weightLb < b.maxLb));
  const key = band ? band.key : bands.at(-1)?.key;
  if (!key || !isWeightBandKey(key)) throw new Error(`Scoring rules have no weight band for ${weightLb} lb`);
  return key;
}

/** Rows for one position across every weight band, straight from the rules file. */
export function bandRowsForPosition(rules: ScoringRules, position: SleepPosition, highlightBand?: string): RangeRow[] {
  return weightBandKeys(rules).map((key) => {
    const [min, max] = comfortWindow(rules, position, key);
    return { key, label: weightBandLabel(key), min, max, highlight: key === highlightBand };
  });
}

/** Rows for every position at one weight band. */
export function bandRowsForWeight(rules: ScoringRules, bandKey: WeightBandKey): RangeRow[] {
  return POSITIONS.map((pos) => {
    const [min, max] = comfortWindow(rules, pos, bandKey);
    return { key: pos, label: POSITION_LABEL[pos], min, max };
  });
}

/** A weight-modifier rule from the rules file by id (throws if the rules file no longer has it). */
export function weightRule(rules: ScoringRules, id: string): ScoringRules['weightModifiers']['rules'][number] {
  const rule = rules.weightModifiers.rules.find((r) => r.id === id);
  if (!rule) throw new Error(`Scoring rules have no weight modifier "${id}"`);
  return rule;
}
