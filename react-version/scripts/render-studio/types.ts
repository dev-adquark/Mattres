/**
 * Shared types for the still-render studio. Type-only: the studio is served
 * to Chromium type-stripped (scripts/render-stills.mts), so this module
 * erases to nothing and nothing imports it at runtime.
 */

import type * as THREE from 'three';
import type { MattressType } from '@/lib/types';
import type { LayerMaterial } from '@/components/three/types';
import type { Colourway, DetailCrop, MaterialSubject } from '@/components/ui/render-stills/stills';

export type { Colourway, DetailCrop, LayerMaterial, MaterialSubject, MattressType };

export type ShotKind = 'hero' | 'product' | 'card' | 'detail' | 'cutaway' | 'material';

/** Cutaway knobs (stair-step depth and quilt mesh density). */
export interface CutOptions {
  cutW?: number;
  cutL?: number;
  stepIn?: number;
  quiltStep?: number;
}

/** What window.renderShot() receives (render-stills.mts sends the first block; the rest are internal overrides). */
export interface ShotSpec {
  kind: ShotKind;
  type?: MattressType;
  colourway?: Colourway;
  crop?: DetailCrop;
  subject?: MaterialSubject;
  samples?: number;
  seed?: number;
  /** Output size override, [width, height] in px. */
  size?: readonly [number, number];
  /** Mattress yaw override (radians). */
  rotate?: number;
  /* cutaway / material camera overrides */
  fov?: number;
  target?: readonly [number, number, number];
  focus?: readonly [number, number, number];
  az?: number;
  el?: number;
  dist?: number;
  aperture?: number;
  exposure?: number;
  cut?: CutOptions;
}

/** A 2D low-discrepancy sample in [0,1)^2. */
export type Sample2 = readonly [number, number];

/** Lights rendered together in one pass; groups alternate and are weighted by `share`. */
export interface LightGroup {
  name: string;
  share?: number;
  lights: THREE.Light[];
  /** Objects visible only while this group renders (e.g. a window occluder). */
  only?: THREE.Object3D[];
  /** Whether environment reflections are on for this group. */
  env?: boolean;
  sample?: (k: number, n: number, uv: Sample2) => void;
}

export interface ShotView {
  position: THREE.Vector3;
  target: THREE.Vector3;
  focus?: THREE.Vector3 | undefined;
  aperture?: number;
}

export interface Grade {
  vignette?: number;
  lift?: string;
  grain?: number;
  tint?: string;
}

/** A built scene, ready for the accumulator. */
export interface ShotScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  view: ShotView;
  groups: LightGroup[];
  envMaterials?: { material: THREE.MeshStandardMaterial; intensity: number }[];
  toneMapping?: THREE.ToneMapping;
  exposure?: number;
  grade?: Grade;
  lensSign?: number;
}

export interface Shot extends ShotScene {
  width: number;
  height: number;
  samples: number;
  seed: number;
}

/** window.renderShot() result: a PNG data URL plus timings. */
export interface ShotResult {
  url: string;
  buildMs: number;
  renderMs: number;
}

declare global {
  interface Window {
    __studioReady?: boolean;
    __progress?: string;
    renderShot?: (spec: ShotSpec) => Promise<ShotResult>;
  }
}
