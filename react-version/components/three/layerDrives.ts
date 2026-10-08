/**
 * Which Match Score dimensions each X-ray layer mainly drives, with the
 * engine's own weights. Same mapping as lib/categories DIMENSION_TO_LAYER
 * (heat -> cover, pressureRelief -> comfort, motion -> transition,
 * support / edge / durability -> support); weights are read from the live
 * rules file (v0.2 baseWeights), never typed in by hand.
 *
 * Base weights are what the engine starts from before a sleeper's answers
 * re-weight them, so the UI labels them as such.
 */

import rules from '@/lib/rules/0.2.json';
import type { ScoreCategory } from '@/lib/types';
import type { DefaultLayerId } from './types';

export const LAYER_DRIVES: Readonly<Record<DefaultLayerId, readonly ScoreCategory[]>> = {
  cover: ['heat'],
  comfort: ['pressureRelief'],
  transition: ['motion'],
  support: ['support', 'edge', 'durability'],
};

export const DIMENSION_LABELS: Readonly<Record<ScoreCategory, string>> = {
  pressureRelief: 'Pressure relief',
  support: 'Support',
  heat: 'Cooling',
  motion: 'Motion isolation',
  edge: 'Edge support',
  durability: 'Durability',
};

/** Dimension weights keyed by dimension id (engine base or a profile's effective weights). */
export type DimensionWeights = Readonly<Record<string, number>>;

export interface LayerDrive {
  id: ScoreCategory;
  label: string;
  /** Whole percent of the Match Score, or null when no weight is known. */
  percent: number | null;
}

export const BASE_WEIGHTS: DimensionWeights = Object.freeze({ ...rules.baseWeights });
export const SCORE_VERSION: string = rules.version || '0.2';

function isDefaultLayerId(id: string): id is DefaultLayerId {
  return Object.prototype.hasOwnProperty.call(LAYER_DRIVES, id);
}

/** Dimensions a layer drives, with whole-percent weights (base weights by default). */
export function drivesFor(layerId: string, weights: DimensionWeights = BASE_WEIGHTS): LayerDrive[] {
  if (!isDefaultLayerId(layerId)) return [];
  return LAYER_DRIVES[layerId].map((id) => {
    const raw = weights ? weights[id] : undefined;
    const w = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    return { id, label: DIMENSION_LABELS[id] || id, percent: w === null ? null : Math.round(w * 100) };
  });
}
