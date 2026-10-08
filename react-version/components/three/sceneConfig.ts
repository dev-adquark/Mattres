/**
 * Dimensions, palette and layer rules shared by the WebGL scene and its SVG
 * twin (MattressPoster), so the two always draw the same mattress. No three
 * import: the poster renders on the server from this module.
 */

import type { MattressType } from '@/lib/types';
import type { LayerMaterial, MattressLayer, SceneVariant } from './types';

export const MATTRESS_W = 3.0; // width (x)
export const MATTRESS_D = 4.0; // length (z), head at -z
export const LAYER_GAP = 0.52; // vertical separation per layer at explode = 1
export const BACK_SHIFT = 0.16; // upper layers slide back slightly when exploded
export const ACTIVE_LIFT = 0.21; // ~24px at the default x-ray framing
export const ACTIVE_SLIDE = 0.5; // and slides out towards the viewer, like a drawer
export const PLATFORM_H = 0.3;
export const REVEAL_MS = 900;

/**
 * Art direction (brief v3): ivory knit cover with a charcoal border panel,
 * warm sand foams, brushed-steel coils on a night-ink base, warm key and
 * cool rim light; indigo only as a faint rim light on dark sections.
 */
export const SCENE_COLORS = {
  coverTop: '#e9e4da', // linen / ivory knit
  border: '#2b2e36', // charcoal border panel
  piping: '#1c1e24',
  comfort: '#d8cbb7', // warm sand open-cell foam
  transition: '#b9a88e', // deeper sand
  foamCore: '#8e8070',
  latex: '#eadfc4',
  latexCore: '#d9c79f',
  coreBase: '#0a1020', // night ink
  rail: '#161c2b',
  steel: '#c9ccd2',
  platform: '#24231f',
  pillow: '#f1ece3',
  duvet: '#cbbda5',
  amber: '#f2b45a',
  key: '#ffe8d2', // ~3200K, tempered so linen stays linen
  rim: '#e9edff', // ~7000K
  indigoRim: '#4a5ea8', // dusk indigo (#2B3A67) as light, lifted so it registers
} as const;

/** Canvas/poster background per section tone (--c-night-ink / --c-linen). */
export const TONE_BACKGROUNDS = { dark: '#050b16', light: '#e9e4da' } as const;

/** Explode amount when the caller passes none. */
export function defaultExplode(variant: SceneVariant): number {
  return variant === 'xray' ? 0.75 : 0;
}

/** The material a layer is drawn with: its own, or inferred from its position and the construction. */
export function inferLayerMaterial(layer: MattressLayer, index: number, count: number, type: MattressType): LayerMaterial {
  if (layer.material) return layer.material;
  if (index === 0) return 'quilt';
  if (index === count - 1) {
    if (type === 'latex') return 'latex-core';
    if (type === 'foam') return 'foam-core';
    if (type === 'innerspring') return 'bonnell-coils';
    return 'pocket-coils';
  }
  if (type === 'latex') return 'latex';
  return index === 1 ? 'foam' : 'dense-foam';
}

/** Layer thicknesses, top to bottom. Cover thin, core thick, the rest share the middle. */
export function layerHeights(count: number): number[] {
  if (count === 1) return [0.56];
  if (count === 2) return [0.08, 0.48];
  const cover = 0.075;
  const core = 0.3;
  const middle = 0.2 / (count - 2);
  return Array.from({ length: count }, (_, i) => (i === 0 ? cover : i === count - 1 ? core : middle));
}

export const isCoilMaterial = (m: LayerMaterial): boolean => m === 'pocket-coils' || m === 'bonnell-coils';
