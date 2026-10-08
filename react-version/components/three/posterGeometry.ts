/**
 * Pure layout for MattressPoster: the scene's boxes, projected
 * orthographically from the scene's default camera angle and fitted to an
 * 800x600 viewBox. Every coordinate is rounded to 2 decimals so server and
 * client markup match exactly (no float drift, no hydration mismatch).
 */

import type { MattressType } from '@/lib/types';
import {
  BACK_SHIFT,
  LAYER_GAP,
  MATTRESS_D as D,
  MATTRESS_W as W,
  PLATFORM_H,
  inferLayerMaterial,
  layerHeights,
} from './sceneConfig';
import type { ExplodeValue, LayerMaterial, MattressLayer, SceneVariant } from './types';

export type Pt = readonly [number, number];
type Projector = (x: number, y: number, z: number) => Pt;

/** Box faces visible from the default camera (top, front +z, right +x). */
export interface BoxFaces {
  top: Pt[];
  front: Pt[];
  right: Pt[];
}

export interface PosterShape {
  key: string;
  /** null for the assembled shell and the platform. */
  layerId: string | null;
  kind: LayerMaterial | null;
  faces: BoxFaces;
  fill: string;
  /** Border colour for the front/right faces; null shades the fill instead. */
  side: string | null;
  quilt: boolean;
  /** Centre height, depth offset and thickness (layers only; 0 otherwise). */
  cy: number;
  cz: number;
  h: number;
  /** Plane the quilting lines are projected on. */
  quiltY: number;
  quiltZ: number;
}

export const VIEWBOX = { width: 800, height: 600 } as const;

const VIEW: Record<SceneVariant, { az: number; el: number }> = {
  hero: { az: 0.62, el: 0.36 },
  xray: { az: 0.78, el: 0.32 },
};

// Same palette as the WebGL scene (SCENE_COLORS): ivory knit, charcoal border,
// warm sand foams, steel coils on a night-ink base.
const FILL: Record<LayerMaterial, string> = {
  quilt: '#e9e4da',
  foam: '#d8cbb7',
  'dense-foam': '#b9a88e',
  'foam-core': '#8e8070',
  latex: '#eadfc4',
  'latex-core': '#d9c79f',
  'pocket-coils': '#1a2131',
  'bonnell-coils': '#1a2131',
};
const SIDE = '#2d2f36';
const CORE_FRAME = '#161c2b';
const PLATFORM_FILL = '#2a2622';
const PLINTH_FILL = '#0d0e10';

export const r2 = (v: number): number => Math.round(v * 100) / 100;
export const pts = (arr: readonly Pt[]): string => arr.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(Math.min(255, ((n >> 16) & 255) * f));
  const g = Math.round(Math.min(255, ((n >> 8) & 255) * f));
  const b = Math.round(Math.min(255, (n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function makeProjector(az: number, el: number): Projector {
  const rx = Math.cos(az);
  const rz = -Math.sin(az);
  const ux = -Math.sin(az) * Math.sin(el);
  const uy = Math.cos(el);
  const uz = -Math.cos(az) * Math.sin(el);
  return (x, y, z) => [x * rx + z * rz, -(x * ux + y * uy + z * uz)];
}

function boxFaces(P: Projector, cx: number, cy: number, cz: number, w: number, h: number, d: number): BoxFaces {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  return {
    top: [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)],
    front: [P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1), P(x0, y0, z1)],
    right: [P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1)],
  };
}

/** Poster explode: a number is clamped; otherwise the scene's resting value ('scroll' x-ray rests at 0.7). */
export function posterExplode(variant: SceneVariant, explode: ExplodeValue | undefined): number {
  if (typeof explode === 'number' && Number.isFinite(explode)) return Math.min(1, Math.max(0, explode));
  if (variant !== 'xray') return 0;
  return explode === 'scroll' ? 0.7 : 0.75;
}

export interface PosterLayoutInput {
  variant: SceneVariant;
  type: MattressType;
  layers: readonly MattressLayer[];
  explode: number;
  activeLayerId: string | null;
}

export interface PosterLayout {
  shapes: PosterShape[];
  exploded: boolean;
  totalH: number;
  /** World units -> viewBox units. */
  scale: number;
  /** Camera elevation (for coil/pinhole ellipse squash). */
  elevation: number;
  /** World point -> rounded viewBox point. */
  S: (x: number, y: number, z: number) => Pt;
  /** Projected face -> SVG points attribute. */
  poly: (face: readonly Pt[]) => string;
}

export function layoutPoster({ variant, type, layers, explode: e, activeLayerId }: PosterLayoutInput): PosterLayout {
  const count = layers.length;
  const heights = layerHeights(count);
  const totalH = heights.reduce((a, b) => a + b, 0);
  const view = VIEW[variant];
  const P = makeProjector(view.az, view.el);
  const exploded = e > 0.05;

  const shapes: PosterShape[] = [];
  const blank = { kind: null, side: null, quilt: false, cy: 0, cz: 0, h: 0, quiltY: 0, quiltZ: 0 };

  if (variant === 'hero') {
    // upholstered body on a recessed plinth (matches the WebGL platform)
    const plinthH = 0.075;
    const bodyH = PLATFORM_H - plinthH;
    shapes.push({ ...blank, key: 'plinth', layerId: null, faces: boxFaces(P, 0, -bodyH - plinthH / 2, 0, W - 0.1, plinthH, D - 0.1), fill: PLINTH_FILL });
    shapes.push({ ...blank, key: 'platform', layerId: null, faces: boxFaces(P, 0, -bodyH / 2, 0, W + 0.3, bodyH, D + 0.3), fill: PLATFORM_FILL });
  }

  if (!exploded) {
    shapes.push({
      ...blank,
      key: 'shell',
      layerId: null,
      faces: boxFaces(P, 0, totalH / 2, 0, W, totalH, D),
      fill: FILL.quilt,
      side: SIDE,
      quilt: true,
      quiltY: totalH,
    });
  } else {
    let y = totalH;
    const recs = layers.map((def, i) => {
      const h = heights[i] ?? 0;
      const restY = y - h / 2;
      y -= h;
      return { def, i, h, restY };
    });
    // bottom layer first (painter's order)
    [...recs].reverse().forEach(({ def, i, h, restY }) => {
      const b = count - 1 - i;
      const lift = activeLayerId === def.id ? 0.21 * e : 0;
      const cy = restY + b * LAYER_GAP * e + lift;
      const cz = -b * BACK_SHIFT * e;
      const kind = inferLayerMaterial(def, i, count, type);
      shapes.push({
        key: def.id,
        layerId: def.id,
        kind,
        cy,
        cz,
        h,
        quiltY: cy,
        quiltZ: cz,
        faces: boxFaces(P, 0, cy, cz, W, h, D),
        fill: FILL[kind] || FILL.foam,
        side: kind === 'quilt' ? SIDE : kind.endsWith('coils') ? CORE_FRAME : null,
        quilt: kind === 'quilt',
      });
    });
  }

  // fit to viewBox
  const all = shapes.flatMap((s) => [...s.faces.top, ...s.faces.front, ...s.faces.right]);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = variant === 'hero' ? 110 : 70;
  const scale = Math.min((VIEWBOX.width - pad * 2) / (maxX - minX), (VIEWBOX.height - pad * 2) / (maxY - minY));
  const ox = VIEWBOX.width / 2 - ((minX + maxX) / 2) * scale;
  const oy = VIEWBOX.height / 2 - ((minY + maxY) / 2) * scale + (variant === 'hero' ? 10 : 0);
  const T = ([x, y]: Pt): Pt => [r2(x * scale + ox), r2(y * scale + oy)];
  const S = (x: number, y: number, z: number): Pt => T(P(x, y, z));
  const poly = (face: readonly Pt[]): string => pts(face.map(T));

  return { shapes, exploded, totalH, scale, elevation: view.el, S, poly };
}

/** Diagonal quilting lines across a top face at height `cy` (clipped to the face when drawn). */
export function quiltLines(S: PosterLayout['S'], cy: number, cz: number): [Pt, Pt][] {
  const lines: [Pt, Pt][] = [];
  const step = 0.62;
  for (let k = -12; k <= 12; k++) {
    const c = k * step;
    // x + z = c  and  x - z = c
    lines.push([S(-W / 2 - 1, cy, c + W / 2 + 1 + cz), S(W / 2 + 1, cy, c - W / 2 - 1 + cz)]);
    lines.push([S(-W / 2 - 1, cy, -c - W / 2 - 1 + cz), S(W / 2 + 1, cy, -c + W / 2 + 1 + cz)]);
  }
  return lines;
}
