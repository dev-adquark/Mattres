/**
 * Procedural texture and teardown helpers for components/three/scene/*.
 *
 * Nothing here imports three at runtime: the texture generators return plain
 * <canvas> elements (the scene wraps them in THREE.CanvasTexture itself) and
 * three is referenced only as a type, so this module never pulls three.js
 * into a shared bundle. Call the generators from effects (they need a DOM).
 */

import type { Material, Object3D, Texture } from 'three';

/** A colour (albedo) canvas and its matching tangent-space normal map. */
export interface TextureCanvases {
  color: HTMLCanvasElement;
  normal: HTMLCanvasElement;
}

/** [offset 0..1, CSS colour] */
export type GradientStop = readonly [number, string];

/** Objects that may carry a geometry and one or many materials (Mesh, Line, Points...). */
interface Renderable extends Object3D {
  geometry?: { dispose(): void };
  material?: Material | Material[];
}

function isTexture(value: unknown): value is Texture {
  return typeof value === 'object' && value !== null && (value as { isTexture?: boolean }).isTexture === true;
}

/**
 * Disposes every geometry, material and texture reachable from `root`
 * (de-duplicated, so shared resources are released exactly once).
 */
export function disposeObjectTree(root: Object3D): void {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((obj) => {
    const o = obj as Renderable;
    if (o.geometry) geometries.add(o.geometry);
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => materials.add(m));
  });
  materials.forEach((m) => {
    // Material subclasses keep their maps as plain fields (map, normalMap, ...).
    Object.values(m as unknown as Record<string, unknown>).forEach((v) => {
      if (isTexture(v)) textures.add(v);
    });
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

/** Small deterministic PRNG so generated textures look identical on every load. */
export function seededRandom(seed = 1): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function context2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

/** Reads a Float32Array sample that is in range by construction. */
const at = (arr: Float32Array, i: number): number => arr[i] ?? 0;

/** Turns a tileable height field (Float32Array size*size, 0..1) into a tangent-space normal map canvas. */
function heightToNormalCanvas(height: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const c = makeCanvas(size);
  const ctx = context2d(c);
  const img = ctx.createImageData(size, size);
  const h = (x: number, y: number) => at(height, ((y + size) % size) * size + ((x + size) % size));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      let nx = -dx;
      let ny = dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function shadeCanvas(
  height: Float32Array,
  size: number,
  base: readonly [number, number, number],
  lo: number,
  hi: number,
  extra?: Float32Array,
): HTMLCanvasElement {
  const c = makeCanvas(size);
  const ctx = context2d(c);
  const img = ctx.createImageData(size, size);
  const [r, g, b] = base;
  for (let p = 0; p < size * size; p++) {
    const t = lo + (hi - lo) * at(height, p) + (extra ? at(extra, p) : 0);
    const i = p * 4;
    img.data[i] = Math.max(0, Math.min(255, r * t));
    img.data[i + 1] = Math.max(0, Math.min(255, g * t));
    img.data[i + 2] = Math.max(0, Math.min(255, b * t));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Quilted cover: one diamond cell per tile (repeat it on the material),
 * puffed domes, sunken stitch channels with dashed thread, a tuft at each
 * intersection and a faint knit micro-texture.
 */
export function makeQuiltCanvases(size = 512): TextureCanvases {
  const rand = seededRandom(7);
  const height = new Float32Array(size * size);
  const stitch = new Float32Array(size * size);
  const fracDist = (v: number) => Math.abs(v - Math.round(v));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const d1 = fracDist(u + v);
      const d2 = fracDist(u - v);
      const d = Math.min(d1, d2) / Math.SQRT2; // distance to nearest channel
      const dome = Math.pow(Math.min(1, d / 0.2), 0.55);
      // tufts where both channel families cross
      const tuft = Math.exp(-((d1 * d1 + d2 * d2) / 0.0009));
      const knit = Math.sin(x * 1.7) * Math.sin(y * 1.9) * 0.012 + (rand() - 0.5) * 0.02;
      height[y * size + x] = Math.max(0, Math.min(1, dome * 0.96 - tuft * 0.25 + knit));
      // dashed thread along the channel centre
      if (d < 0.006) {
        const along = d1 < d2 ? u - v : u + v;
        stitch[y * size + x] = (along * 36) % 1 < 0.55 ? -0.18 : 0;
      }
    }
  }
  return {
    color: shadeCanvas(height, size, [236, 232, 223], 0.86, 1.0, stitch),
    normal: heightToNormalCanvas(height, size, 9),
  };
}

/** Knit side border: fine vertical ribs. Grayscale albedo + normal. */
export function makeKnitCanvases(size = 256): TextureCanvases {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rib = 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 2 * 32);
      const loop = 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 2 * 64 + (x % 8 < 4 ? 0 : Math.PI));
      height[y * size + x] = rib * 0.8 + loop * 0.2;
    }
  }
  return {
    color: shadeCanvas(height, size, [255, 255, 255], 0.94, 1.0),
    normal: heightToNormalCanvas(height, size, 1.6),
  };
}

/** Open-cell foam: soft speckled noise. Grayscale albedo + normal. */
export function makeFoamCanvases(size = 256, seed = 3): TextureCanvases {
  const rand = seededRandom(seed);
  const height = new Float32Array(size * size).fill(0.6);
  // scatter soft pores
  const pores = Math.floor(size * size * 0.012);
  for (let n = 0; n < pores; n++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 1 + rand() * 2.6;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dd = Math.hypot(dx, dy);
        if (dd > r) continue;
        const px = (Math.floor(cx + dx) + size) % size;
        const py = (Math.floor(cy + dy) + size) % size;
        const idx = py * size + px;
        height[idx] = at(height, idx) - (1 - dd / r) * 0.45;
      }
    }
  }
  for (let p = 0; p < height.length; p++) height[p] = Math.max(0, Math.min(1, at(height, p)));
  return {
    color: shadeCanvas(height, size, [255, 255, 255], 0.8, 1.05),
    normal: heightToNormalCanvas(height, size, 2.5),
  };
}

/** Latex: regular pinhole grid on a smooth surface. Grayscale albedo + normal. */
export function makePinholeCanvases(size = 256, holesPerTile = 8): TextureCanvases {
  const height = new Float32Array(size * size).fill(1);
  const cell = size / holesPerTile;
  const r = cell * 0.17;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = (x % cell) - cell / 2;
      const ly = (y % cell) - cell / 2;
      const d = Math.hypot(lx, ly);
      if (d < r) height[y * size + x] = 0.05;
      else if (d < r * 1.6) height[y * size + x] = 0.05 + ((d - r) / (r * 0.6)) * 0.95;
    }
  }
  return {
    color: shadeCanvas(height, size, [255, 255, 255], 0.62, 1.0),
    normal: heightToNormalCanvas(height, size, 3),
  };
}

const DEFAULT_RADIAL_STOPS: readonly GradientStop[] = [
  [0, 'rgba(0,0,0,0.65)'],
  [1, 'rgba(0,0,0,0)'],
];

/** Radial alpha gradient (used for contact shadows / floor glow). */
export function makeRadialCanvas(size = 256, stops: readonly GradientStop[] = DEFAULT_RADIAL_STOPS): HTMLCanvasElement {
  const c = makeCanvas(size);
  const ctx = context2d(c);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Soft radial glow sprite (white core fading through `color`), 128px. */
export function makeGlowCanvas(color: string): HTMLCanvasElement {
  return makeRadialCanvas(128, [
    [0, 'rgba(255,255,255,0.9)'],
    [0.4, color],
    [1, 'rgba(0,0,0,0)'],
  ]);
}
