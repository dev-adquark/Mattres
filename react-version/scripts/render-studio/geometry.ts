/**
 * Procedural geometry for the still-render studio: a detailed mattress
 * (swept side profile, displaced quilt panel, piping), bedding (pillows,
 * a turned-down duvet), a bed frame, room and studio sweeps, and stair-step
 * cutaways that expose the same four layers the interactive X-ray uses
 * (components/three/layers.js).
 *
 * Units are metres. Queen size: 1.52 m x 2.03 m, head towards -z.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { quiltRelief, fbm, seeded, type QuiltPattern } from './textures.js';
import type { CutOptions, LayerMaterial, MattressType } from './types.js';

/** A point on a closed xz path: position, outward normal, arc length so far. */
export interface PathPoint {
  x: number;
  z: number;
  nx: number;
  nz: number;
  s: number;
}
/** A side-profile vertex: outward offset, height, material index of the segment starting here. */
export interface ProfilePoint {
  o: number;
  y: number;
  m: number;
}
export interface Piping {
  o: number;
  y: number;
  r?: number;
}
export interface QuiltSpec {
  pattern: QuiltPattern;
  tile: number;
  depth: number;
  crown: number;
}
export interface MattressSpec {
  H: number;
  profile: ProfilePoint[];
  pipings: Piping[];
  quilt: QuiltSpec;
}
/** Cover materials of a dressed mattress (steel and pocket are added for cutaways). */
export interface MattressMaterials {
  quilt: THREE.Material;
  knit: THREE.Material;
  band?: THREE.Material;
  gusset?: THREE.Material;
  piping: THREE.Material;
  steel?: THREE.Material;
  pocket?: THREE.Material;
}
export interface CutawayLayerInfo {
  kind: LayerMaterial | undefined;
  y0: number;
  y1: number;
  xc: number;
  zc: number;
}

export const MW = 1.52;
export const ML = 2.03;
export const CORNER_R = 0.06;

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------ perimeter ------------------------------- */

/** Closed rounded-rectangle path in xz with outward normals and arc length. */
export function roundedRectPath(w: number, l: number, r: number, perCorner = 10, perSide = 60): PathPoint[] {
  const pts: PathPoint[] = [];
  const centres: [number, number][] = [
    [w / 2 - r, l / 2 - r],
    [-w / 2 + r, l / 2 - r],
    [-w / 2 + r, -l / 2 + r],
    [w / 2 - r, -l / 2 + r],
  ];
  centres.forEach(([cx, cz], ci) => {
    for (let i = 0; i <= perCorner; i++) {
      const a = ((ci + i / perCorner) * Math.PI) / 2;
      const nx = Math.cos(a);
      const nz = Math.sin(a);
      pts.push({ x: cx + nx * r, z: cz + nz * r, nx, nz, s: 0 });
    }
    const last = pts[pts.length - 1]!;
    const [ncx, ncz] = centres[(ci + 1) % 4]!;
    const a1 = (((ci + 1) % 4) * Math.PI) / 2;
    const sx = ncx + Math.cos(a1) * r;
    const sz = ncz + Math.sin(a1) * r;
    const len = Math.hypot(sx - last.x, sz - last.z);
    const n = Math.max(2, Math.round((perSide * len) / Math.max(w, l)));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push({ x: last.x + (sx - last.x) * t, z: last.z + (sz - last.z) * t, nx: last.nx, nz: last.nz, s: 0 });
    }
  });
  pts.push({ ...pts[0]! });
  let s = 0;
  pts.forEach((p, i) => {
    const prev = pts[i - 1];
    if (i && prev) s += Math.hypot(p.x - prev.x, p.z - prev.z);
    p.s = s;
  });
  return pts;
}

/**
 * Sweep a side profile [{o (outward offset), y, m (material index of the
 * segment starting here)}] around a closed path. UVs are world-scaled
 * (u = arc length, v = height, both / tile).
 */
export function sweepProfile(path: readonly PathPoint[], profile: readonly ProfilePoint[], tile = 0.12): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const cols = path.length;
  profile.forEach((pr) => {
    path.forEach((p) => {
      pos.push(p.x + p.nx * pr.o, pr.y, p.z + p.nz * pr.o);
      uv.push(p.s / tile, pr.y / tile);
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // winding: path runs counter-clockwise seen from below, so flip when the
  // first quad's geometric normal points inwards
  const p0 = path[0]!;
  const p1 = path[1]!;
  const tx = p1.x - p0.x;
  const tz = p1.z - p0.z;
  const dy = profile[1]!.y - profile[0]!.y || 1;
  // normal of (a, c, b) = (c - a) x (b - a) ~ (0, dy, 0) x (tx, 0, tz)
  const nxw = dy * tz;
  const nzw = -dy * tx;
  const flip = nxw * p0.nx + nzw * p0.nz < 0;
  const index: number[] = [];
  let groupStart = 0;
  let currentM = profile[0]!.m || 0;
  const flush = (m: number) => {
    if (index.length > groupStart) geo.addGroup(groupStart, index.length - groupStart, m);
    groupStart = index.length;
  };
  for (let j = 0; j < profile.length - 1; j++) {
    const m = profile[j]!.m || 0;
    if (m !== currentM) {
      flush(currentM);
      currentM = m;
    }
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (flip) index.push(a, b, c, b, d, c);
      else index.push(a, c, b, b, c, d);
    }
  }
  flush(currentM);
  geo.setIndex(index);
  geo.computeVertexNormals();
  // the seam column duplicates vertices: average their normals for a seamless wrap
  const n = geo.getAttribute('normal');
  for (let j = 0; j < profile.length; j++) {
    const a = j * cols;
    const b = a + cols - 1;
    const nx = n.getX(a) + n.getX(b);
    const ny = n.getY(a) + n.getY(b);
    const nz = n.getZ(a) + n.getZ(b);
    const len = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / len, ny / len, nz / len);
    n.setXYZ(b, nx / len, ny / len, nz / len);
  }
  return geo;
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number, m = 0): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ o: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, m });
  }
  return out;
}

function line(o0: number, y0: number, o1: number, y1: number, n: number, m = 0, bulge = 0): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ o: o0 + (o1 - o0) * t + bulge * Math.sin(Math.PI * t), y: y0 + (y1 - y0) * t, m });
  }
  return out;
}

function join(...parts: ProfilePoint[][]): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  parts.forEach((p) => {
    p.forEach((pt, i) => {
      const joint = out[out.length - 1];
      if (i === 0 && joint) {
        // the joint keeps the previous segment's end but adopts the new material from here on
        joint.m = pt.m;
        return;
      }
      out.push({ ...pt });
    });
  });
  return out;
}

/* ------------------------------ mattress -------------------------------- */

/**
 * Per-type construction for the dressed (un-cut) mattress.
 * materials: 0 side knit, 1 border band (spacer mesh), 2 gusset.
 */
export function mattressSpec(type: MattressType): MattressSpec {
  switch (type) {
    case 'foam': {
      const H = 0.25;
      const re = 0.03;
      return {
        H,
        profile: join(arc(-0.015, 0.015, 0.015, -Math.PI / 2, 0, 6), line(0, 0.015, 0, H - re, 24, 0, 0.004), arc(-re, H - re, re, 0, Math.PI / 2, 10)),
        pipings: [{ o: -re * (1 - Math.SQRT1_2), y: H - re + re * Math.SQRT1_2 }],
        quilt: { pattern: 'wave', tile: 0.24, depth: 0.006, crown: 0.012 },
      };
    }
    case 'innerspring': {
      const H1 = 0.26;
      const H = 0.36;
      const r1 = 0.022;
      const re = 0.03;
      return {
        H,
        profile: join(
          arc(-0.015, 0.015, 0.015, -Math.PI / 2, 0, 6),
          line(0, 0.015, 0, H1 - r1, 22, 0, 0.005),
          arc(-r1, H1 - r1, r1, 0, Math.PI / 2, 8, 2),
          line(-r1, H1, -r1, H1 + 0.016, 3, 0),
          arc(-0.008 - 0.016, H1 + 0.016 + 0.016, 0.016, -Math.PI / 2, 0, 6, 0),
          line(-0.008, H1 + 0.032, -0.008, H - re, 8, 0, 0.004),
          arc(-0.008 - re, H - re, re, 0, Math.PI / 2, 10)
        ),
        pipings: [
          { o: -r1 * (1 - Math.SQRT1_2), y: H1 - r1 + r1 * Math.SQRT1_2 },
          { o: -0.008 - re * (1 - Math.SQRT1_2), y: H - re + re * Math.SQRT1_2 },
        ],
        quilt: { pattern: 'pillowtop', tile: 0.2, depth: 0.028, crown: 0.034 },
      };
    }
    case 'latex': {
      const H = 0.28;
      const re = 0.04;
      return {
        H,
        profile: join(arc(-0.02, 0.02, 0.02, -Math.PI / 2, 0, 6), line(0, 0.02, 0, H - re, 22, 0, 0.006), arc(-re, H - re, re, 0, Math.PI / 2, 12)),
        pipings: [{ o: -re * (1 - Math.SQRT1_2), y: H - re + re * Math.SQRT1_2 }],
        quilt: { pattern: 'tuft', tile: 0.19, depth: 0.016, crown: 0.02 },
      };
    }
    default: {
      // hybrid
      const H = 0.33;
      const re = 0.035;
      const band = 0.115;
      return {
        H,
        profile: join(
          arc(-0.015, 0.015, 0.015, -Math.PI / 2, 0, 6, 1),
          line(0, 0.015, 0, band, 8, 1, 0.002),
          line(0, band, 0, H - re, 18, 0, 0.004),
          arc(-re, H - re, re, 0, Math.PI / 2, 10)
        ),
        pipings: [
          { o: -re * (1 - Math.SQRT1_2), y: H - re + re * Math.SQRT1_2 },
          { o: 0.001, y: band, r: 0.004 },
          { o: -0.015 * (1 - Math.SQRT1_2), y: 0.015 - 0.015 * Math.SQRT1_2 },
        ],
        quilt: { pattern: 'diamond', tile: 0.17, depth: 0.016, crown: 0.022 },
      };
    }
  }
}

/** Signed distance (positive inside) to a rounded rectangle centred at the origin. */
function rrInside(x: number, z: number, hw: number, hl: number, r: number): number {
  const qx = Math.abs(x) - (hw - r);
  const qz = Math.abs(z) - (hl - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
  return -outside;
}

/**
 * Displaced quilt panel on a rounded rectangle (w x l, corner r) at height y0.
 * step: grid spacing in metres. `clip(x, z)` may return false to drop cells
 * (used by the cutaway).
 */
export interface QuiltPanelOptions {
  w: number;
  l: number;
  r: number;
  y0: number;
  quilt: QuiltSpec;
  step?: number;
  clip?: ((x: number, z: number) => boolean) | null;
  edgeRoll?: number;
}

export function quiltPanel({ w, l, r, y0, quilt, step = 0.006, clip = null, edgeRoll = 0.06 }: QuiltPanelOptions): THREE.BufferGeometry {
  const nx = Math.ceil(w / step);
  const nz = Math.ceil(l / step);
  const hw = w / 2;
  const hl = l / 2;
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const uv = new Float32Array((nx + 1) * (nz + 1) * 2);
  const keep = new Uint8Array((nx + 1) * (nz + 1));
  let k = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      let x = -hw + (i / nx) * w;
      let z = -hl + (j / nz) * l;
      // pull corner points onto the arc
      const qx = Math.abs(x) - (hw - r);
      const qz = Math.abs(z) - (hl - r);
      if (qx > 0 && qz > 0) {
        const d = Math.hypot(qx, qz);
        if (d > r) {
          x = Math.sign(x) * (hw - r + (qx / d) * r);
          z = Math.sign(z) * (hl - r + (qz / d) * r);
        }
      }
      const inside = Math.max(0, rrInside(x, z, hw, hl, r));
      const fadeCrown = smoothstep(0, edgeRoll, inside);
      const fadeQuilt = smoothstep(0.004, edgeRoll * 0.7, inside);
      const rel = quiltRelief(quilt.pattern, x / quilt.tile, z / quilt.tile);
      const y = y0 + fadeCrown * quilt.crown + fadeQuilt * quilt.depth * (rel - 1);
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      uv[k * 2] = x / quilt.tile;
      uv[k * 2 + 1] = z / quilt.tile;
      keep[k] = clip ? (clip(x, z) ? 1 : 0) : 1;
      k++;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      if (!(keep[a] && keep[b] && keep[c] && keep[d])) continue;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function pipingAlong(path: readonly PathPoint[], o: number, y: number, radius: number, mat: THREE.Material): THREE.Mesh {
  const pts = path.slice(0, -1).map((p) => new THREE.Vector3(p.x + p.nx * o, y, p.z + p.nz * o));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, Math.min(1400, pts.length * 3), radius, 10, true);
  return new THREE.Mesh(geo, mat);
}

/** Dressed mattress, bottom at y = 0. Returns { group, height }. */
export function buildMattress(type: MattressType, mats: MattressMaterials, { step = 0.006 }: { step?: number } = {}): { group: THREE.Group; height: number; spec: MattressSpec } {
  const spec = mattressSpec(type);
  const group = new THREE.Group();
  const path = roundedRectPath(MW, ML, CORNER_R, 12, 90);
  const side = new THREE.Mesh(sweepProfile(path, spec.profile, 0.12), [mats.knit, mats.band || mats.knit, mats.gusset || mats.knit]);
  group.add(side);
  const end = spec.profile[spec.profile.length - 1]!;
  const inset = -end.o;
  const panel = new THREE.Mesh(
    quiltPanel({ w: MW - 2 * inset, l: ML - 2 * inset, r: Math.max(0.012, CORNER_R - inset), y0: spec.H, quilt: spec.quilt, step }),
    mats.quilt
  );
  group.add(panel);
  // underside
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(MW - 0.03, ML - 0.03), mats.knit);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = 0.0005;
  group.add(bottom);
  spec.pipings.forEach((pp) => group.add(pipingAlong(path, pp.o, pp.y, pp.r || 0.0058, mats.piping)));
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, height: spec.H + spec.quilt.crown, spec };
}

/* ------------------------------- bedding -------------------------------- */

/**
 * Pillow: a near-rectangular footprint with a sewn boxed edge, a crowned
 * (not lens-shaped) top that dips slightly where a head would rest, soft
 * creases running in from the corners and a little asymmetry per seed.
 */
export function pillowGeometry(w: number, h: number, d: number, seed = 1): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(1, 160, 80);
  const p = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    // squarer footprint than a superellipse of 0.36: reads as a sewn case, not a lens
    const sx = Math.sign(x) * Math.pow(Math.abs(x), 0.24);
    const sz = Math.sign(z) * Math.pow(Math.abs(z), 0.24);
    const ex = Math.pow(Math.abs(sx), 9);
    const ez = Math.pow(Math.abs(sz), 9);
    const puff = (1 - ex) * (1 - ez);
    // keep a real edge height (boxed seam) instead of pinching to zero
    const body = 0.2 + 0.8 * Math.pow(puff, 0.42);
    const cornerness = Math.pow(Math.abs(sx * sz), 4);
    const crease = Math.sin(Math.atan2(sz, sx) * 14 + seed) * 0.06 * cornerness;
    const wobble = (fbm((sx + 1) / 2, (sz + 1) / 2, 3, 3, seed) - 0.5) * 0.14;
    // a soft hollow on the upper face, slightly off-centre
    const dent = y > 0 ? Math.exp(-((sx - 0.12) * (sx - 0.12) * 3.2 + sz * sz * 4.5)) * 0.16 : 0;
    const yy = ((y * h) / 2) * body * (1 + wobble + crease - dent);
    p.setXYZ(i, (sx * w) / 2, yy, (sz * d) / 2);
    uv.setXY(i, ((sx + 1) / 2) * (w / 0.25) + (y > 0 ? 0 : 0.37), ((sz + 1) / 2) * (d / 0.25));
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A duvet lying on the bed from zHead to foldZ, folded back on itself
 * (turn-down) for `turn` metres, draping over both sides.
 * top: y of the mattress surface; width: mattress width.
 */
export interface DuvetOptions {
  width: number;
  top: number;
  zHead: number;
  foldZ: number;
  turn?: number;
  thick?: number;
  drop?: number;
  seed?: number;
}

export function duvetGeometry({ width, top, zHead, foldZ, turn = 0.42, thick = 0.035, drop = 0.3, seed = 3 }: DuvetOptions): THREE.BufferGeometry {
  const rnd = seeded(seed);
  const phases = Array.from({ length: 10 }, (): [number, number, number] => [rnd() * 6.28, 0.6 + rnd() * 1.6, rnd() * 2 - 1]);
  const r = thick;
  const L1 = foldZ - zHead;
  const segs = [
    { len: L1, kind: 'bottom' },
    { len: Math.PI * r, kind: 'fold' },
    { len: turn, kind: 'turn' },
    { len: (Math.PI / 2) * r, kind: 'hem' },
  ];
  const total = segs.reduce((a, s) => a + s.len, 0);
  const pathAt = (s: number): [number, number, number] => {
    // returns [z, y, layer 0..1]
    let acc = 0;
    for (const sg of segs) {
      if (s <= acc + sg.len || sg === segs[segs.length - 1]) {
        const t = Math.min(sg.len, Math.max(0, s - acc));
        if (sg.kind === 'bottom') return [zHead + t, top + 0.004, 0];
        if (sg.kind === 'fold') {
          const a = t / r; // 0..PI
          return [foldZ + Math.sin(a) * r, top + 0.004 + r - Math.cos(a) * r, a / Math.PI];
        }
        if (sg.kind === 'turn') return [foldZ - t, top + 0.004 + 2 * r, 1];
        const a = t / r; // 0..PI/2, rolling down towards the head
        return [foldZ - turn - Math.sin(a) * r, top + 0.004 + r + Math.cos(a) * r, 1];
      }
      acc += sg.len;
    }
    return [foldZ, top, 0];
  };
  const halfTop = width / 2;
  const nA = 220;
  const nS = 260;
  const across = halfTop + drop + 0.06;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= nS; j++) {
    const s = (j / nS) * total;
    const [z0, y0, layer] = pathAt(s);
    for (let i = 0; i <= nA; i++) {
      const a = -across + (i / nA) * across * 2;
      const rr = 0.05 + layer * 2 * thick;
      const hw = halfTop + layer * 1.2 * thick;
      const e = Math.abs(a) - hw;
      const sgn = Math.sign(a) || 1;
      let x: number;
      let y: number;
      let out = 0; // outward displacement on the drop
      const arcLen = (rr * Math.PI) / 2;
      if (e <= 0) {
        x = a;
        y = y0;
      } else if (e < arcLen) {
        const ang = e / rr;
        x = sgn * (hw + Math.sin(ang) * rr);
        y = y0 - rr * (1 - Math.cos(ang));
      } else {
        const dn = e - arcLen;
        x = sgn * (hw + rr + dn * 0.08);
        y = y0 - rr - dn;
        // vertical folds on the drop, growing towards the hem
        let f = 0;
        phases.slice(0, 4).forEach(([ph, fr]) => {
          f += Math.sin(z0 * (5 + fr * 4) + ph) * 0.012;
        });
        out = f * smoothstep(0, 0.25, dn);
      }
      // soft wrinkles on top, fading over the edge
      let wr = 0;
      phases.forEach(([ph, fr, dir]) => {
        const k = 4 + fr * 6;
        const u = a * Math.cos(dir) + z0 * Math.sin(dir);
        wr += (1 - Math.abs(Math.sin(u * k + ph))) * 0.0045;
      });
      const lo = (fbm((a + 2) / 4, (s + 2) / 6, 3, 3, seed) - 0.5) * 0.035;
      const onTop = e <= 0 ? 1 : Math.max(0, 1 - e / 0.08);
      x += sgn * out;
      y += (wr + lo) * onTop + (layer > 0.5 ? 0.004 : 0);
      pos.push(x, y, z0);
      uv.push((a + across) / 0.3, s / 0.3);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nS; j++) {
    for (let i = 0; i < nA; i++) {
      const a = j * (nA + 1) + i;
      const b = a + 1;
      const c = a + nA + 1;
      const d = c + 1;
      // past the fold the sheet is seen from its other side: flip the winding
      // so normals face outwards (keeps shadow normal-bias pointing away)
      if ((j / nS) * total > L1 + 1e-6) index.push(a, b, c, b, d, c);
      else index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------ furniture ------------------------------- */

/** Multiply a geometry's UVs (so a 0..1 face maps to world-sized tiles). */
export function scaleUV<G extends THREE.BufferGeometry>(geo: G, su: number, sv: number): G {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

export type HeadboardStyle = 'channel' | 'wide' | 'wood';

export function bedFrame(
  mats: { upholstery: THREE.Material; shadowBlack: THREE.Material },
  { platformH = 0.24, headH = 1.12, style = 'channel' }: { platformH?: number; headH?: number; style?: HeadboardStyle } = {},
): { group: THREE.Group; top: number } {
  const g = new THREE.Group();
  const plat = new THREE.Mesh(scaleUV(new RoundedBoxGeometry(MW + 0.1, platformH, ML + 0.08, 6, style === 'wood' ? 0.012 : 0.04), (MW + 0.1) / 0.3, platformH / 0.3), mats.upholstery);
  plat.position.set(0, platformH / 2, 0.0);
  g.add(plat);
  // recessed plinth so the bed floats a little
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(MW - 0.2, 0.06, ML - 0.2), mats.shadowBlack);
  plinth.position.set(0, 0.03, 0);
  plat.position.y = platformH / 2 + 0.05;
  g.add(plinth);
  const head = new THREE.Group();
  if (style === 'wood') {
    // one solid timber panel with a shallow reveal line: quieter than tufting
    const panelH = headH * 0.82;
    const m = new THREE.Mesh(scaleUV(new RoundedBoxGeometry(MW + 0.16, panelH, 0.06, 4, 0.01), (MW + 0.16) / 0.9, panelH / 0.9), mats.upholstery);
    m.position.set(0, panelH / 2, 0);
    head.add(m);
    const reveal = new THREE.Mesh(new THREE.BoxGeometry(MW + 0.1, 0.008, 0.062), mats.shadowBlack);
    reveal.position.set(0, panelH * 0.62, 0.0);
    head.add(reveal);
  } else {
    // channel-tufted, upholstered headboard
    const panels = style === 'wide' ? 4 : 7;
    const pw = (MW + 0.16) / panels;
    for (let i = 0; i < panels; i++) {
      const m = new THREE.Mesh(scaleUV(new RoundedBoxGeometry(pw - 0.004, headH, 0.1, 6, 0.045), pw / 0.3, headH / 0.3), mats.upholstery);
      m.position.set(-(MW + 0.16) / 2 + pw * (i + 0.5), headH / 2, 0);
      head.add(m);
    }
  }
  head.position.set(0, 0.02, -ML / 2 - 0.09);
  g.add(head);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group: g, top: platformH + 0.05 };
}

/**
 * Bedside table with a linen-shaded lamp. The shade is an open cylinder, so
 * a light placed inside it throws a pool up the wall and down onto the table
 * the way a real lamp does. Returns { group, bulb } (bulb = world position).
 */
export function nightstand(
  mats: { wood: THREE.Material; shadowBlack: THREE.Material; ceramic: THREE.Material; shade: THREE.Material },
  { x = 1.22, z = -ML / 2 + 0.2 }: { x?: number; z?: number } = {},
): { group: THREE.Group; bulb: THREE.Vector3; shade: THREE.Mesh } {
  const g = new THREE.Group();
  const top = 0.5;
  const body = new THREE.Mesh(scaleUV(new RoundedBoxGeometry(0.5, top, 0.42, 4, 0.012), 0.5 / 0.5, top / 0.5), mats.wood);
  body.position.set(0, top / 2, 0);
  g.add(body);
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.006, 0.005), mats.shadowBlack);
  drawer.position.set(0, top * 0.62, 0.211);
  g.add(drawer);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.26, 40), mats.ceramic);
  base.position.set(0.02, top + 0.13, -0.02);
  g.add(base);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.22, 64, 1, true), mats.shade);
  shade.position.set(0.02, top + 0.37, -0.02);
  g.add(shade);
  g.position.set(x, 0, z);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = o !== shade;
      o.receiveShadow = true;
    }
  });
  shade.castShadow = true;
  return { group: g, bulb: new THREE.Vector3(x + 0.02, top + 0.36, z - 0.02), shade };
}

/** Seamless studio sweep: floor curving up into a back wall. */
export function cyclorama(
  mat: THREE.Material,
  { width = 16, depth = 9, height = 6, radius = 2.2, back = -3.2 }: { width?: number; depth?: number; height?: number; radius?: number; back?: number } = {},
): THREE.Mesh {
  const prof: [number, number][] = [];
  const front = back + depth;
  for (let i = 0; i <= 20; i++) prof.push([front - (i / 20) * (depth - radius), 0]);
  for (let i = 1; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    prof.push([back + radius - Math.sin(a) * radius, radius - Math.cos(a) * radius]);
  }
  for (let i = 1; i <= 10; i++) prof.push([back, radius + (i / 10) * (height - radius)]);
  const nx = 2;
  const pos: number[] = [];
  const uv: number[] = [];
  let s = 0;
  prof.forEach(([z, y], j) => {
    const prev = prof[j - 1];
    if (j && prev) s += Math.hypot(z - prev[0], y - prev[1]);
    for (let i = 0; i <= nx; i++) {
      const x = -width / 2 + (i / nx) * width;
      pos.push(x, y, z);
      uv.push(x / 1.5, s / 1.5);
    }
  });
  const index: number[] = [];
  for (let j = 0; j < prof.length - 1; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

/** A window-shaped occluder: big opaque sheet with pane-shaped holes. */
export function windowOccluder({
  panesX = 2,
  panesY = 3,
  paneW = 0.42,
  paneH = 0.5,
  mullion = 0.05,
  size = 9,
}: { panesX?: number; panesY?: number; paneW?: number; paneH?: number; mullion?: number; size?: number }): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-size / 2, -size / 2);
  shape.lineTo(size / 2, -size / 2);
  shape.lineTo(size / 2, size / 2);
  shape.lineTo(-size / 2, size / 2);
  shape.lineTo(-size / 2, -size / 2);
  const totalW = panesX * paneW + (panesX - 1) * mullion;
  const totalH = panesY * paneH + (panesY - 1) * mullion;
  for (let i = 0; i < panesX; i++) {
    for (let j = 0; j < panesY; j++) {
      const x0 = -totalW / 2 + i * (paneW + mullion);
      const y0 = -totalH / 2 + j * (paneH + mullion);
      const h = new THREE.Path();
      h.moveTo(x0, y0);
      h.lineTo(x0, y0 + paneH);
      h.lineTo(x0 + paneW, y0 + paneH);
      h.lineTo(x0 + paneW, y0);
      h.lineTo(x0, y0);
      shape.holes.push(h);
    }
  }
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = false;
  m.userData.occluder = true;
  return m;
}

/* ------------------------------- cutaway -------------------------------- */

/** Per-type layer thicknesses for the cutaway, top to bottom (m). */
export const CUT_HEIGHTS: Record<MattressType, readonly number[]> = {
  hybrid: [0.035, 0.05, 0.03, 0.215],
  innerspring: [0.05, 0.03, 0.016, 0.2],
  foam: [0.032, 0.062, 0.05, 0.12],
  latex: [0.032, 0.06, 0.05, 0.14],
};

/** Box with world-scaled UVs (projected per face), translated into place. */
function worldBox(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, tile: number, bevel = 0.0045): THREE.BufferGeometry {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = z1 - z0;
  // a few millimetres of bevel: cut foam has a soft, slightly rounded arris, never a CG-crisp edge
  const r = Math.min(bevel, Math.min(w, h, d) / 2 - 1e-4);
  const geo = r > 0.0005 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = geo.getAttribute('position');
  const n = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
    else if (ax > 0.5) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
    else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
  }
  return geo;
}

/**
 * Stair-step cutaway. The front-right corner (+x, +z) is removed; each lower
 * layer reaches further into the cut so its top surface shows as a step.
 * layerMats: one material per layer (top to bottom) for cut faces/tops.
 */
export function buildCutaway(
  type: MattressType,
  layerKinds: readonly (LayerMaterial | undefined)[],
  mats: MattressMaterials,
  layerMats: readonly THREE.Material[],
  { cutW = 0.78, cutL = 1.02, stepIn = 0.13, quiltStep = 0.006 }: CutOptions = {},
): { group: THREE.Group; height: number; info: CutawayLayerInfo[] } {
  const heights = CUT_HEIGHTS[type] || CUT_HEIGHTS.hybrid;
  const group = new THREE.Group();
  const total = heights.reduce((a, b) => a + b, 0);
  const hw = MW / 2;
  const hl = ML / 2;
  let yTop = total;
  const rnd = seeded(17);
  const info: CutawayLayerInfo[] = [];
  heights.forEach((h, i) => {
    const kind = layerKinds[i];
    const y1 = yTop;
    const y0 = yTop - h;
    yTop = y0;
    const xc = hw - cutW + i * stepIn;
    const zc = hl - cutL + i * stepIn;
    info.push({ kind, y0, y1, xc, zc });
    const cutMat = layerMats[i] ?? mats.knit;
    const outer = mats.knit;
    // material order for BoxGeometry groups: +x, -x, +y, -y, +z, -z
    if (kind === 'quilt') {
      const quilt = mattressSpec(type === 'innerspring' ? 'innerspring' : type).quilt;
      const qq = { ...quilt, crown: Math.min(quilt.crown, h * 0.5), depth: Math.min(quilt.depth, h * 0.45) };
      const base = y1 - qq.crown;
      const a = new THREE.Mesh(worldBox(-hw, hw, y0, base, -hl, zc, 0.1), [outer, outer, cutMat, cutMat, cutMat, outer]);
      const b = new THREE.Mesh(worldBox(-hw, xc, y0, base, zc, hl, 0.1), [cutMat, outer, cutMat, cutMat, outer, outer]);
      group.add(a, b);
      const panel = new THREE.Mesh(
        quiltPanel({ w: MW, l: ML, r: 0.004, y0: base, quilt: qq, step: quiltStep, edgeRoll: 0.035, clip: (x, z) => !(x > xc + 0.001 && z > zc + 0.001) }),
        mats.quilt
      );
      group.add(panel);
      return;
    }
    if (kind === 'pocket-coils' || kind === 'bonnell-coils') {
      const pocket = kind === 'pocket-coils';
      const baseH = pocket ? 0.022 : 0.0;
      const rail = pocket ? 0.075 : 0;
      const support = cutMat;
      if (baseH) {
        group.add(new THREE.Mesh(worldBox(-hw, hw, y0, y0 + baseH, -hl, zc, 0.1), [support, outer, support, support, support, outer]));
        group.add(new THREE.Mesh(worldBox(-hw, xc, y0, y0 + baseH, zc, hl, 0.1), [support, outer, support, support, outer, outer]));
      }
      const cy0 = y0 + baseH;
      if (rail) {
        // foam encasement rails, knit outside, foam on the cut ends and inside
        const railBoxes: [number, number, number, number][] = [
          [-hw, -hw + rail, -hl, hl], // left
          [hw - rail, hw, -hl, zc], // right (stops at the cut)
          [-hw + rail, hw - rail, -hl, -hl + rail], // back
          [-hw + rail, xc, hl - rail, hl], // front (stops at the cut)
        ];
        railBoxes.forEach(([xa, xb, za, zb], k) => {
          const m = [support, support, support, support, support, support];
          if (k === 0) m[1] = outer;
          if (k === 1) m[0] = outer;
          if (k === 2) m[5] = outer;
          if (k === 3) m[4] = outer;
          group.add(new THREE.Mesh(worldBox(xa, xb, cy0, y1, za, zb, 0.1), m));
        });
      } else {
        // thin knit wall around the outside of the spring unit
        const t = 0.006;
        const walls: [number, number, number, number][] = [
          [-hw, -hw + t, -hl, hl],
          [hw - t, hw, -hl, zc],
          [-hw, hw, -hl, -hl + t],
          [-hw, xc, hl - t, hl],
        ];
        walls.forEach(([xa, xb, za, zb]) => group.add(new THREE.Mesh(worldBox(xa, xb, y0, y1, za, zb, 0.1), outer)));
      }
      // coils fill the L-shaped interior
      const pitch = pocket ? 0.068 : 0.078;
      const coilH = y1 - cy0 - 0.004;
      const r = pitch * 0.47;
      const x0 = -hw + rail + pitch / 2 + 0.004;
      const z0 = -hl + rail + pitch / 2 + 0.004;
      const cols = Math.floor((MW - 2 * rail - 0.008) / pitch);
      const rows = Math.floor((ML - 2 * rail - 0.008) / pitch);
      const cells: { x: number; z: number; exposed: 'x' | 'z' | null }[] = [];
      for (let rI = 0; rI < rows; rI++) {
        for (let cI = 0; cI < cols; cI++) {
          const x = x0 + cI * pitch;
          const z = z0 + rI * pitch;
          if (x + r > xc && z + r > zc) continue; // inside the cut
          // exposed: the row/column touching a cut face
          const nearX = z > zc && x + pitch + r > xc; // faces +x cut
          const nearZ = x > xc && z + pitch + r > zc; // faces +z cut
          cells.push({ x, z, exposed: nearX ? 'x' : nearZ ? 'z' : null });
        }
      }
      const steelGeo = new THREE.TubeGeometry(new HourglassHelix(r * 0.86, coilH * (pocket ? 0.94 : 0.98), pocket ? 6.5 : 5, pocket ? 0.12 : 0.38), pocket ? 220 : 260, pocket ? 0.0024 : 0.0032, 7, false);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const one = new THREE.Vector3(1, 1, 1);
      const midY = cy0 + (y1 - cy0) / 2;
      if (pocket) {
        const pocketGeo = pocketGeometry(r, coilH, Math.PI * 2);
        const halfGeo = pocketGeometry(r, coilH, Math.PI); // back half only, for cut-open pockets
        const closed = cells.filter((c) => !c.exposed);
        const open = cells.filter((c) => c.exposed);
        const im = new THREE.InstancedMesh(pocketGeo, mats.pocket, closed.length);
        closed.forEach((c, n) => {
          q.setFromAxisAngle(up, rnd() * Math.PI * 2);
          m4.compose(new THREE.Vector3(c.x, midY, c.z), q, one);
          im.setMatrixAt(n, m4);
        });
        group.add(im);
        const ih = new THREE.InstancedMesh(halfGeo, mats.pocket, open.length);
        const is = new THREE.InstancedMesh(steelGeo, mats.steel, open.length);
        open.forEach((c, n) => {
          // lathe half spans phi 0..PI (from +z round to -z via +x): rotate so the open side faces the cut
          q.setFromAxisAngle(up, c.exposed === 'x' ? Math.PI : -Math.PI / 2);
          m4.compose(new THREE.Vector3(c.x, midY, c.z), q, one);
          ih.setMatrixAt(n, m4);
          q.setFromAxisAngle(up, rnd() * Math.PI * 2);
          m4.compose(new THREE.Vector3(c.x, midY, c.z), q, one);
          is.setMatrixAt(n, m4);
        });
        group.add(ih, is);
      } else {
        const is = new THREE.InstancedMesh(steelGeo, mats.steel, cells.length);
        cells.forEach((c, n) => {
          q.setFromAxisAngle(up, rnd() * Math.PI * 2);
          m4.compose(new THREE.Vector3(c.x, midY, c.z), q, one);
          is.setMatrixAt(n, m4);
        });
        group.add(is);
        // border wire, top and bottom
        const bw = roundedRectPath(MW - 0.03, ML - 0.03, 0.05, 6, 40);
        [y1 - 0.006, y0 + 0.006].forEach((yy) => {
          const pts = bw.slice(0, -1).filter((p) => !(p.x > xc - 0.02 && p.z > zc - 0.02)).map((p) => new THREE.Vector3(p.x, yy, p.z));
          // split at the cut: draw as an open polyline
          const curve = new THREE.CatmullRomCurve3(pts, false);
          group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 0.004, 6, false), mats.steel));
        });
      }
      return;
    }
    // solid foam / latex layers
    const a = new THREE.Mesh(worldBox(-hw, hw, y0, y1, -hl, zc, 0.1), [outer, outer, cutMat, cutMat, cutMat, outer]);
    const b = new THREE.Mesh(worldBox(-hw, xc, y0, y1, zc, hl, 0.1), [cutMat, outer, cutMat, cutMat, outer, outer]);
    group.add(a, b);
  });
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, height: total, info };
}

export class HourglassHelix extends THREE.Curve<THREE.Vector3> {
  radius: number;
  height: number;
  turns: number;
  waist: number;

  constructor(radius: number, height: number, turns: number, waist = 0.3) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
    this.waist = waist;
  }
  override getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const k = Math.abs(2 * t - 1);
    const r = this.radius * (1 - this.waist + this.waist * Math.pow(k, 1.6));
    // closed end turns are flatter
    const yt = t < 0.06 ? t * 0.6 : t > 0.94 ? 1 - (1 - t) * 0.6 : 0.036 + (t - 0.06) * (0.928 / 0.88);
    return target.set(Math.cos(a) * r, (yt - 0.5) * this.height, Math.sin(a) * r);
  }
}

/** Barrel-shaped fabric pocket around a coil (lathe), optionally only part of it. */
export function pocketGeometry(r: number, h: number, phiLength: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 18;
  pts.push(new THREE.Vector2(0.0001, -h / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bulge = 0.86 + 0.14 * Math.sin(Math.PI * t);
    // slight pinch at the top/bottom seams
    pts.push(new THREE.Vector2(r * bulge * (t < 0.05 || t > 0.95 ? 0.9 : 1), (t - 0.5) * h));
  }
  pts.push(new THREE.Vector2(0.0001, h / 2));
  const geo = new THREE.LatheGeometry(pts, phiLength < Math.PI * 2 ? 24 : 36, 0, phiLength);
  geo.computeVertexNormals();
  return geo;
}
