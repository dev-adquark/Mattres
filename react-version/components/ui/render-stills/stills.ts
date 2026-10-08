/**
 * Lookup helpers for the generated campaign stills (public/renders, built by
 * scripts/render-stills.mts). Pure and client-safe.
 *
 * Every still is an ORIGINAL code-generated render of a typical
 * construction for a mattress TYPE. None depicts a specific product; per
 * mattress variation is limited to a brand-neutral border colourway (which
 * also picks the composition and backdrop of card/product stills - see
 * STILL_BACKDROP) and, for 'detail', the crop.
 */

import { RENDER_STILLS } from './manifest';

export type StillType = 'foam' | 'hybrid' | 'innerspring' | 'latex';
export type StillAspect = 'card' | 'product' | 'hero' | 'cutaway' | 'detail';
export type Colourway = 'linen' | 'mist' | 'sand' | 'dusk';
export type MaterialSubject = 'quilt' | 'coils' | 'foam';
export type DetailCrop = 'edge' | 'top' | 'bedding';

/** One generated still (an entry of manifest.ts). */
export interface RenderStill {
  kind: StillAspect | 'material';
  type: StillType | null;
  colourway: Colourway | null;
  subject: MaterialSubject | null;
  crop?: DetailCrop;
  src: string;
  avif: string;
  png: string;
  width: number;
  height: number;
  blurDataURL: string;
}

export const STILL_TYPES: readonly StillType[] = ['foam', 'hybrid', 'innerspring', 'latex'];
export const COLOURWAYS: readonly Colourway[] = ['linen', 'mist', 'sand', 'dusk'];
/** Editorial detail crops per construction (4:5): low edge close-up, top-down quilting macro, bedding corner. */
export const DETAIL_CROPS: readonly DetailCrop[] = ['edge', 'top', 'bedding'];

/** Same hash as the SVG illustration so a mattress keeps one colourway everywhere. */
export function colourwayFor(seed: unknown): Colourway {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return COLOURWAYS[Math.abs(h) % COLOURWAYS.length] as Colourway;
}

/**
 * Card / product stills are four art-directed compositions, one per colourway
 * (scripts/render-studio/shots.ts COMPOSITIONS): the backdrop each is shot on.
 *   linen -> night ink, low profile    mist -> linen, three-quarter packshot
 *   sand  -> indigo dusk, corner crop  dusk -> warm sand, overhead quilting
 */
export type StillBackdrop = 'night' | 'linen' | 'dusk' | 'sand';
export const STILL_BACKDROP: Readonly<Record<Colourway, StillBackdrop>> = { linen: 'night', mist: 'linen', sand: 'dusk', dusk: 'sand' };

const SLOT_ORDER: readonly Colourway[] = ['mist', 'linen', 'dusk', 'sand'];
const SLOT_TONE: Readonly<Record<'dark' | 'light', readonly Colourway[]>> = {
  // dark sections: night ink + indigo dusk backdrops; light sections: linen + warm sand
  dark: ['linen', 'sand'],
  light: ['mist', 'dusk'],
};

/**
 * Colourway for the `index`-th card of a row or grid, so neighbours never share
 * a composition. With `tone`, only backdrops that sit in that section's key are
 * used (night/dusk on dark sections, linen/sand on light ones). Pass the result
 * as MattressRender's `colourway`.
 */
export function colourwayForSlot(index: number, tone?: 'dark' | 'light'): Colourway {
  const order = tone ? SLOT_TONE[tone] : SLOT_ORDER;
  const i = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  return order[i % order.length] as Colourway;
}

/** Exact catalog type strings only: an unknown type gets the generic SVG, not a guessed render. */
export function stillType(type: unknown): StillType | null {
  const t = String(type || '').toLowerCase();
  return (STILL_TYPES as readonly string[]).includes(t) ? (t as StillType) : null;
}

/** Detail crop for a seed (same hash as the colourway, offset so crop and colourway vary independently). */
export function detailCropFor(seed: unknown): DetailCrop {
  let h = 2166136261;
  const s = `crop:${seed || ''}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return DETAIL_CROPS[Math.abs(h) % DETAIL_CROPS.length] as DetailCrop;
}

/**
 * The still for a mattress type + aspect, or null.
 * aspect: 'card' (1:1) | 'product' (4:3) | 'hero' (3:2, dressed bed at night) | 'cutaway' (16:9, layers)
 *   | 'detail' (4:5 editorial crop; `crop` picks 'edge' | 'top' | 'bedding', otherwise rotated by `seed`).
 */
export interface StillQuery {
  type?: string | null;
  aspect?: StillAspect | string;
  seed?: string | null;
  colourway?: string | null;
  crop?: string | null;
}

export function getRenderStill({ type, aspect = 'card', seed, colourway, crop }: StillQuery = {}): RenderStill | null {
  const t = stillType(type);
  if (!t) return null;
  if (aspect === 'hero' || aspect === 'cutaway') return RENDER_STILLS[`${aspect}-${t}`] || null;
  if (aspect === 'detail') {
    const c = crop && (DETAIL_CROPS as readonly string[]).includes(crop) ? crop : detailCropFor(seed || t);
    return RENDER_STILLS[`detail-${t}-${c}`] || null;
  }
  const cw = colourway && (COLOURWAYS as readonly string[]).includes(colourway) ? colourway : colourwayFor(seed || t);
  return RENDER_STILLS[`${aspect}-${t}-${cw}`] || null;
}

/** Editorial material close-up: 'quilt' | 'coils' | 'foam' (3:2). */
export function getMaterialStill(subject: string | null | undefined): RenderStill | null {
  return RENDER_STILLS[`material-${subject}`] || null;
}

const TYPE_WORD: Record<StillType, string> = { foam: 'foam', hybrid: 'hybrid', innerspring: 'innerspring', latex: 'latex' };

/** Accessible description: always says it is an illustration, never a product photo. */
export function stillAlt(type: unknown, aspect: string = 'card'): string {
  const st = stillType(type);
  const word = st ? TYPE_WORD[st] : '';
  const a = word ? `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}` : 'a';
  if (aspect === 'hero') return `Illustration of ${a} mattress dressed with bedding in a bedroom at night — rendered artwork, not a product photo`;
  if (aspect === 'cutaway') return `Illustration of ${a} mattress cut away to show its typical layers — rendered artwork, not a product photo`;
  if (aspect === 'detail') return `Illustration: close-up of ${a} mattress's cover, edge and bedding — rendered artwork, not a product photo`;
  return `Illustration of ${a} mattress — not a product photo`;
}

export const MATERIAL_ALT: Record<string, string> = {
  quilt: 'Illustration: close-up of a quilted mattress cover and its piped edge — rendered artwork, not a product photo',
  coils: 'Illustration: close-up of pocketed support coils, some pockets cut open to show the steel springs — rendered artwork, not a product photo',
  foam: 'Illustration: close-up of stepped foam comfort and support layers — rendered artwork, not a product photo',
};

/** Default `sizes` per aspect (matches the layouts the stills are designed for). */
export const DEFAULT_SIZES: Record<string, string> = {
  card: '(min-width: 1080px) 380px, (min-width: 640px) 46vw, 92vw',
  product: '(min-width: 1080px) 640px, 92vw',
  hero: '100vw',
  cutaway: '(min-width: 1080px) 960px, 100vw',
  detail: '(min-width: 1080px) 380px, (min-width: 640px) 46vw, 92vw',
  material: '(min-width: 1080px) 720px, 100vw',
};
