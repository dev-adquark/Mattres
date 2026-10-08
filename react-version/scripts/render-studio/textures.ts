/**
 * Procedural, tileable material textures for the still-render studio.
 *
 * Everything is generated from seeded noise so every run produces the same
 * pixels. Each generator returns plain canvases ({ map, normal, rough? }):
 * albedo maps are mostly greyscale so one texture can be tinted per
 * colourway through material.color.
 *
 * Browser-only (uses <canvas>); runs inside the headless studio page.
 */

/** Plain canvases for one material: greyscale albedo, tangent-space normal, optional roughness. */
export interface TextureSet {
  map: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  rough?: HTMLCanvasElement;
}

/** Quilt stitch patterns shared by the top-panel geometry and its micro texture. */
export type QuiltPattern = 'diamond' | 'pillowtop' | 'wave' | 'tuft';

/* --------------------------------- noise --------------------------------- */

function hash3(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Tileable value noise with integer period p (x, y in lattice units). */
export function vnoise(x: number, y: number, p: number, seed = 1): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = mod(xi, p);
  const y0 = mod(yi, p);
  const x1 = mod(xi + 1, p);
  const y1 = mod(yi + 1, p);
  const a = hash3(x0, y0, seed);
  const b = hash3(x1, y0, seed);
  const c = hash3(x0, y1, seed);
  const d = hash3(x1, y1, seed);
  const u = fade(xf);
  const v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Tileable fBm in [0,1]. u, v in tile units [0,1). */
export function fbm(u: number, v: number, basePeriod: number, octaves: number, seed = 1, gain = 0.5): number {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let p = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += vnoise(u * p, v * p, p, seed + o * 17) * amp;
    norm += amp;
    amp *= gain;
    p *= 2;
  }
  return sum / norm;
}

/** Tileable Worley noise: returns [F1, F2] in cell units. u, v in tile units. */
export function worley(u: number, v: number, cells: number, seed = 1): [number, number] {
  const x = u * cells;
  const y = v * cells;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i;
      const cy = yi + j;
      const wx = mod(cx, cells);
      const wy = mod(cy, cells);
      const px = cx + hash3(wx, wy, seed);
      const py = cy + hash3(wx, wy, seed + 101);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return [f1, f2];
}

export function seeded(seed = 1): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------ canvas utils ----------------------------- */

function canvas(size: number): HTMLCanvasElement {
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

/** Height field (Float32Array, tileable) -> tangent-space normal map canvas. */
export function heightToNormal(height: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const c = canvas(size);
  const ctx = context2d(c);
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number): number => height[mod(y, size) * size + mod(x, size)] ?? 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = (-dx / len) * 127.5 + 127.5;
      img.data[i + 1] = (dy / len) * 127.5 + 127.5;
      img.data[i + 2] = (1 / len) * 127.5 + 127.5;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Float field (0..1-ish) -> greyscale (or tinted rgb triple) canvas. */
function fieldToCanvas(field: Float32Array, size: number, rgb: readonly [number, number, number] = [1, 1, 1]): HTMLCanvasElement {
  const c = canvas(size);
  const ctx = context2d(c);
  const img = ctx.createImageData(size, size);
  for (let p = 0; p < size * size; p++) {
    const v = field[p] ?? 0;
    const i = p * 4;
    img.data[i] = Math.max(0, Math.min(255, v * rgb[0] * 255));
    img.data[i + 1] = Math.max(0, Math.min(255, v * rgb[1] * 255));
    img.data[i + 2] = Math.max(0, Math.min(255, v * rgb[2] * 255));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* -------------------------------- weaves -------------------------------- */

/**
 * Plain-weave linen with slubs and heathered threads.
 * threads: threads per tile in each direction.
 */
export function linenWeave(size = 1024, threads = 64, seed = 3, { slub = 1 }: { slub?: number } = {}): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = (y / size) * threads;
    const j = Math.floor(v);
    const fv = v - j;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * threads;
      const i = Math.floor(u);
      const fu = u - i;
      // thread thickness varies slowly along each thread (slubs)
      const warpW = 0.36 + 0.12 * slub * (vnoise(i * 3.1, v * 0.35, threads * 3, seed) - 0.5) * 2;
      const weftW = 0.36 + 0.12 * slub * (vnoise(u * 0.35, j * 2.7, threads * 3, seed + 9) - 0.5) * 2;
      const warpUp = (i + j) % 2 === 0;
      const warpProfile = Math.max(0, 1 - Math.pow(Math.abs(fu - 0.5) / warpW, 2));
      const weftProfile = Math.max(0, 1 - Math.pow(Math.abs(fv - 0.5) / weftW, 2));
      const arch = Math.sin(Math.PI * (warpUp ? fv : fu));
      let h: number;
      let tone: number;
      if (warpUp) {
        h = Math.sqrt(warpProfile) * (0.55 + 0.45 * arch);
        tone = hash3(i, 7, seed);
        if (warpProfile < 0.05) h = Math.max(h, Math.sqrt(weftProfile) * 0.35);
      } else {
        h = Math.sqrt(weftProfile) * (0.55 + 0.45 * arch);
        tone = hash3(j, 13, seed + 4);
        if (weftProfile < 0.05) h = Math.max(h, Math.sqrt(warpProfile) * 0.35);
      }
      const p = y * size + x;
      height[p] = h;
      const mottle = fbm(x / size, y / size, 3, 4, seed + 31);
      albedo[p] = 0.8 + 0.12 * h + 0.07 * (tone - 0.5) + 0.08 * (mottle - 0.5);
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 2.2) };
}

/** Fine jersey knit with heathered (melange) fibres. Greyscale. */
export function jerseyKnit(size = 1024, cols = 96, seed = 5, { heather = 1 }: { heather?: number } = {}): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  const rows = cols * 1.5;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * rows;
    const fv = v - Math.floor(v);
    for (let x = 0; x < size; x++) {
      const u = (x / size) * cols;
      const fu = u - Math.floor(u);
      // each stitch is a "V": two legs leaning in towards the column centre
      const lean = (fv - 0.5) * 0.35;
      const leg = Math.min(Math.abs(fu - (0.27 - lean)), Math.abs(fu - (0.73 + lean)));
      const h = Math.max(0, 1 - Math.pow(leg / 0.24, 2)) * (0.75 + 0.25 * Math.sin(Math.PI * fv));
      const p = y * size + x;
      height[p] = h;
      const fibre = vnoise((x / size) * cols * 4, (y / size) * 6, cols * 4, seed) ; // vertical streaks
      const fleck = hash3(Math.floor(u * 2), Math.floor(v), seed + 3);
      albedo[p] = 0.84 + 0.1 * h + heather * (0.1 * (fibre - 0.5) + (fleck > 0.93 ? 0.06 : fleck < 0.05 ? -0.07 : 0));
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 1.6) };
}

/** 3D spacer mesh (hexagonal open cells) used on breathable border bands. */
export function spacerMesh(size = 512, cells = 18): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  const sq3 = Math.sqrt(3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // hex grid distance via axial rounding
      const px = (x / size) * cells;
      const py = (y / size) * cells * (2 / sq3) * 0.5 * sq3; // keep tileable: rows = cells
      const row = Math.floor(py);
      const off = row % 2 ? 0.5 : 0;
      const fx = px + off - Math.floor(px + off) - 0.5;
      const fy = py - row - 0.5;
      const d = Math.max(Math.abs(fx) * 0.95 + Math.abs(fy) * 0.32, Math.abs(fy) * 0.9);
      const hole = smoothstep(0.34, 0.3, d);
      const p = y * size + x;
      height[p] = 1 - hole * 0.85;
      albedo[p] = 0.92 - hole * 0.55;
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 3) };
}

/** Upholstery boucle: knotted loops over a coarse weave. Greyscale. */
export function boucle(size = 1024, seed = 21): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const [f1, f2] = worley(u, v, 70, seed);
      const loop = smoothstep(0.55, 0.05, f1) * 0.8 + smoothstep(0.0, 0.25, f2 - f1) * 0.2;
      const n = fbm(u, v, 24, 3, seed + 2);
      const p = y * size + x;
      height[p] = loop * 0.8 + n * 0.3;
      albedo[p] = 0.82 + 0.16 * loop + 0.1 * (n - 0.5);
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 3.2) };
}

/* ------------------------------- quilting ------------------------------- */

/**
 * Macro quilt relief, 0..1, for a pattern at tile coords (u, v) (period 1).
 * The same function displaces the top-panel geometry, so the puffs cast real
 * shadows; the texture below only carries thread/stitch micro detail.
 */
export function quiltRelief(pattern: QuiltPattern, u: number, v: number): number {
  const fd = (t: number): number => Math.abs(t - Math.round(t));
  if (pattern === 'wave') {
    const w = v + 0.11 * Math.sin(u * Math.PI * 2);
    const d = fd(w * 2) / 2; // two channels per tile
    return Math.pow(smoothstep(0, 0.2, d), 0.7);
  }
  if (pattern === 'tuft') {
    const du = fd(u) ;
    const dv = fd(v + (Math.floor(u + 0.5) % 2 ? 0.5 : 0));
    const r = Math.hypot(du, dv);
    const ang = Math.atan2(dv, du);
    const pleat = (1 - smoothstep(0.02, 0.32, r)) * 0.18 * Math.max(0, Math.sin(ang * 6));
    return Math.pow(smoothstep(0.015, 0.36, r), 0.75) - pleat;
  }
  // diamond (and 'pillowtop'): rounded puffs between sunken stitch channels.
  // A product of sines gives soft, domed cells (a distance-to-channel ramp
  // reads as faceted pyramids).
  const fr = (t: number): number => t - Math.floor(t);
  const a = Math.sin(Math.PI * fr(u + v));
  const b = Math.sin(Math.PI * fr(u - v));
  let h = Math.pow(Math.max(0, a * b), pattern === 'pillowtop' ? 0.32 : 0.4);
  if (pattern === 'pillowtop') {
    const d1 = fd(u + v);
    const d2 = fd(u - v);
    h -= Math.exp(-(d1 * d1 + d2 * d2) / 0.0016) * 0.35;
  }
  return h;
}

/**
 * Quilt surface micro-detail (stitch thread, channel crease, knit), tiled
 * once per quilt cell. Greyscale albedo + normal.
 */
export function quiltMicro(pattern: QuiltPattern, size = 1024, seed = 7): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  const fd = (t: number): number => Math.abs(t - Math.round(t));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const relief = quiltRelief(pattern, u, v);
      let crease = 0;
      let thread = 0;
      if (pattern === 'wave') {
        const w = v + 0.11 * Math.sin(u * Math.PI * 2);
        const d = fd(w * 2) / 2;
        crease = 1 - smoothstep(0, 0.03, d);
        thread = d < 0.0045 && (u * 70) % 1 < 0.6 ? 1 : 0;
      } else if (pattern === 'tuft') {
        const du = fd(u);
        const dv = fd(v + (Math.floor(u + 0.5) % 2 ? 0.5 : 0));
        const r = Math.hypot(du, dv);
        crease = 1 - smoothstep(0.0, 0.05, r);
        thread = r < 0.022 ? 1 : 0; // the tuft knot
      } else {
        const d1 = fd(u + v);
        const d2 = fd(u - v);
        const d = Math.min(d1, d2) / Math.SQRT2;
        crease = 1 - smoothstep(0, 0.035, d);
        const along = d1 < d2 ? u - v : u + v;
        thread = d < 0.005 && (along * 40) % 1 < 0.62 ? 1 : 0;
      }
      // knit micro texture
      const ku = u * 180;
      const kv = v * 260;
      const knit = 0.5 + 0.5 * Math.sin(ku * Math.PI * 2) * Math.sin(kv * Math.PI * 2 + (Math.floor(ku) % 2) * 1.5);
      const fibre = fbm(u, v, 32, 3, seed);
      const p = y * size + x;
      height[p] = knit * 0.18 + fibre * 0.25 - crease * 0.9 + thread * 0.25;
      albedo[p] = 0.93 + 0.04 * relief - crease * 0.07 - thread * 0.1 + 0.05 * (fibre - 0.5) + 0.02 * knit;
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 4.5) };
}

/* -------------------------------- foams --------------------------------- */

/** Open-cell foam: pores (Worley cells) at two scales. Greyscale albedo + normal. */
export function foamCells(size = 1024, seed = 3, { cells = 46, contrast = 1 }: { cells?: number; contrast?: number } = {}): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const [a1, a2] = worley(u, v, cells, seed);
      const [b1, b2] = worley(u, v, cells * 2.6 | 0, seed + 7);
      const wallA = smoothstep(0.0, 0.14, a2 - a1);
      const wallB = smoothstep(0.0, 0.18, b2 - b1);
      const pore = 1 - smoothstep(0.05, 0.5, a1);
      const p = y * size + x;
      // walls (where F2 - F1 is small) stand proud, pore centres sink
      height[p] = 0.5 + 0.35 * (1 - wallA) - 0.4 * pore + 0.12 * (1 - wallB);
      albedo[p] = 0.86 + contrast * (0.1 * (1 - wallA) - 0.16 * pore + 0.04 * (1 - wallB));
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 3.5) };
}

/** Moulded latex: pinholes on a hex grid + faint organic variation. */
export function latexPinholes(size = 1024, holes = 4, seed = 11): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * holes;
      const v = (y / size) * holes;
      const row = Math.floor(v);
      const off = row % 2 ? 0.5 : 0;
      const fx = u + off - Math.floor(u + off) - 0.5;
      const fy = v - row - 0.5;
      const r = Math.hypot(fx, fy);
      const hole = 1 - smoothstep(0.07, 0.085, r);
      const rim = smoothstep(0.085, 0.16, r);
      const organic = fbm(x / size, y / size, 6, 4, seed);
      const [f1, f2] = worley(x / size, y / size, 60, seed + 3);
      const cell = smoothstep(0, 0.2, f2 - f1);
      const p = y * size + x;
      height[p] = hole ? 0 : 0.6 + 0.4 * rim + 0.03 * cell;
      albedo[p] = hole ? 0.32 : 0.9 + 0.06 * (organic - 0.5) + 0.03 * cell - 0.05 * (1 - rim);
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 6) };
}

/* ------------------------------ environment ----------------------------- */

/** Hand-troweled plaster. */
export function plaster(size = 1024, seed = 41): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const lo = fbm(u, v, 3, 5, seed);
      const hi = fbm(u, v, 64, 2, seed + 5);
      const p = y * size + x;
      height[p] = lo * 0.6 + hi * 0.25;
      albedo[p] = 0.9 + 0.12 * (lo - 0.5) + 0.04 * (hi - 0.5);
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 1.4) };
}

/** Smoked oak floor boards along u. 4 boards per tile. Returns map + roughness. */
export function oakBoards(size = 1024, seed = 51): TextureSet & { rough: HTMLCanvasElement } {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const boards = 4;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * boards;
    const b = Math.floor(v);
    const fv = v - b;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const shift = hash3(b, 3, seed);
      const uu = mod(u + shift, 1);
      const seamEnd = uu < 0.004 || (b % 2 === 0 && Math.abs(uu - 0.5) < 0.002);
      const seam = fv < 0.012 || fv > 0.988 || seamEnd;
      const grain = fbm(uu * 1, fv * 0.25 + b * 0.37, 2, 3, seed + b) * 0.5 + 0.5 * fbm(uu * 0.5, fv, 24, 3, seed + 9);
      const streak = 0.5 + 0.5 * Math.sin((fv * 9 + grain * 6) * Math.PI);
      const tone = hash3(b, 9, seed + 1);
      const p = y * size + x;
      height[p] = seam ? 0 : 0.5 + 0.12 * streak;
      albedo[p] = seam ? 0.35 : 0.72 + 0.14 * (tone - 0.5) + 0.12 * (streak - 0.5) + 0.06 * (grain - 0.5);
      rough[p] = seam ? 0.95 : 0.52 + 0.14 * streak;
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 2), rough: fieldToCanvas(rough, size) };
}

/** Seamless studio paper: soft fibre grain. */
export function paper(size = 512, seed = 61): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u, v, 16, 4, seed);
      const p = y * size + x;
      height[p] = n;
      albedo[p] = 0.97 + 0.04 * (n - 0.5);
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 0.6) };
}

/** Non-woven polypropylene (coil pockets): fibrous, slightly translucent-looking. */
export function nonWoven(size = 512, seed = 71): TextureSet {
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const a = fbm(u, v, 40, 3, seed);
      const b = fbm(u, v, 8, 3, seed + 3);
      // dotted thermal-bond pattern
      const du = (u * 48) % 1 - 0.5;
      const dv = (v * 48) % 1 - 0.5;
      const dot = 1 - smoothstep(0.12, 0.2, Math.hypot(du, dv));
      const p = y * size + x;
      height[p] = a * 0.7 - dot * 0.3;
      albedo[p] = 0.9 + 0.1 * (a - 0.5) + 0.05 * (b - 0.5) - dot * 0.04;
    }
  }
  return { map: fieldToCanvas(albedo, size), normal: heightToNormal(height, size, 2) };
}
