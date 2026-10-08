/**
 * Types shared by the 3D mattress system (viewer, poster, scene, studio).
 * Type-only: importing this module never pulls code into a bundle.
 */

import type { MattressType } from '@/lib/types';

export type { MattressType };
export type { DeviceTier } from '@/lib/deviceTier';

/** 'hero': assembled bed with bedding. 'xray': bare layer stack that separates. */
export type SceneVariant = 'hero' | 'xray';
/** Rendering quality derived from the device tier ('static' never mounts the scene). */
export type SceneQuality = 'full' | 'lite';
/** Section mood the viewer sits in. */
export type ViewerTone = 'dark' | 'light';
/** 0..1 separation, or 'scroll' to link it to the stage's scroll position. */
export type ExplodeValue = number | 'scroll';
/** X-ray only: 'view' separates once ~40% visible (or a layer is chosen); 'immediate' at once. */
export type RevealMode = 'view' | 'immediate';

/** How the scene and poster draw a layer. */
export type LayerMaterial =
  | 'quilt'
  | 'foam'
  | 'dense-foam'
  | 'latex'
  | 'pocket-coils'
  | 'bonnell-coils'
  | 'foam-core'
  | 'latex-core';

/** Ids of the generic layer sets (lib/categories DIMENSION_TO_LAYER values). */
export type DefaultLayerId = 'cover' | 'comfort' | 'transition' | 'support';

/**
 * One layer of the illustration, top (body side) first. Generic and
 * educational; never a claim about a specific product's build.
 */
export interface MattressLayer {
  /** Stable key; the default sets use DefaultLayerId. */
  id: string;
  label: string;
  /** One or two plain-language sentences. */
  description: string;
  /** About two lines, for the X-ray tabs. Falls back to description. */
  summary?: string;
  /** Inferred from position and mattress type when omitted. */
  material?: LayerMaterial;
}

/** Layer id or null (overview / nothing). */
export type LayerIdCallback = (id: string | null) => void;
