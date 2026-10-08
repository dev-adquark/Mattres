/**
 * Draped duvet for the hero bed: one subdivided sheet laid over the foot of
 * the mattress like a cloth over a table. Past the top rectangle the sheet
 * rolls over a soft rounded edge and falls (sides and foot), the corners
 * hang a little lower than the edges, vertical folds grow towards the hem,
 * and the hem curls under so the edge reads as a lofty duvet rather than a
 * paper-thin plane. At the head end the sheet folds back on itself
 * (turn-down) and the folded band drapes over the lower layer.
 *
 * Ambient occlusion is baked into vertex colours (fold valleys, the crease
 * under the turn-down, the underside of the hem) so the cloth keeps its
 * depth on the 'lite' tier, which renders without shadow maps.
 *
 * Local space: y = 0 is the mattress top surface, +z is the foot.
 */

import * as THREE from 'three';
import { seededRandom } from '@/lib/threeUtils';

export interface DuvetOptions {
  /** Half-width of the top surface the duvet lies on. */
  halfWidth: number;
  /** z of the foot edge of the mattress top. */
  zFoot: number;
  /** Length of the duvet lying flat on top (foot edge -> fold). */
  length: number;
  /** Fall over the sides and the foot, measured along the cloth. */
  drop: number;
  /** Lowest y the cloth may reach (keeps the corners off the platform). */
  floorY: number;
  /** Length of the turned-down band. */
  turn?: number;
  /** Loft: radius of the turn-down fold and of the hem curl. */
  loft?: number;
  /** Lift above the quilted top so the cloth never z-fights it. */
  lift?: number;
  /** Subdivision (across, along). */
  segments?: readonly [number, number];
  seed?: number;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Smooth 2D value noise in [0, 1], seeded and periodic-free. */
function valueNoise(seed: number): (x: number, y: number) => number {
  const rnd = seededRandom(seed);
  const N = 64;
  const grid = Array.from({ length: N * N }, () => rnd());
  const at = (i: number, j: number) => grid[(((j % N) + N) % N) * N + (((i % N) + N) % N)] ?? 0;
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export function drapedDuvetGeometry({
  halfWidth: hw0,
  zFoot,
  length,
  drop,
  floorY,
  turn = 0.5,
  loft = 0.05,
  lift = 0.03,
  segments = [150, 170],
  seed = 7,
}: DuvetOptions): THREE.BufferGeometry {
  const [nA, nS] = segments;
  const noise = valueNoise(seed);
  const rnd = seededRandom(seed * 31 + 5);
  const waves = Array.from({ length: 6 }, (): [number, number, number] => [rnd() * 6.28, 0.6 + rnd() * 1.4, rnd() * 2 - 1]);
  const drapes = Array.from({ length: 4 }, (): [number, number] => [rnd() * 6.28, 2.6 + rnd() * 2.4]);

  const r = loft;
  const zFold = zFoot - length;
  // the sheet's long coordinate s: < 0 on the foot drop, [0, length] lying flat,
  // then the fold (half turn), the turned-down band and a quarter-roll hem.
  const sFold = length;
  const sTurn = sFold + Math.PI * r;
  const sHem = sTurn + turn;
  const sEnd = sHem + (Math.PI / 2) * r * 0.8;
  const sStart = -drop;

  /** Along-path frame: z, base y, and which layer (0 lower sheet, 1 turned band). */
  const path = (s: number): [number, number, number] => {
    if (s <= sFold) return [zFoot - Math.max(0, s), 0, 0];
    if (s <= sTurn) {
      const a = (s - sFold) / r;
      return [zFold - Math.sin(a) * r, r - Math.cos(a) * r, a / Math.PI];
    }
    if (s <= sHem) return [zFold + (s - sTurn), 2 * r, 1];
    const a = (s - sHem) / r;
    return [zFold + turn + Math.sin(a) * r, r + Math.cos(a) * r, 1];
  };

  const across = hw0 + drop;
  const pos = new Float32Array((nA + 1) * (nS + 1) * 3);
  const uv = new Float32Array((nA + 1) * (nS + 1) * 2);
  const col = new Float32Array((nA + 1) * (nS + 1) * 3);
  let k = 0;
  for (let j = 0; j <= nS; j++) {
    const s = sStart + (sEnd - sStart) * (j / nS);
    const [z0, y0, layer] = path(s);
    const ez = s < 0 ? -s : 0;
    for (let i = 0; i <= nA; i++) {
      // the turned band is a touch wider and longer (its hem covers the sheet's)
      // and rolls over a softer radius
      const hw = hw0 + layer * 0.9 * r;
      const span = across + layer * (0.9 * r + 0.05);
      const a = (-1 + (i / nA) * 2) * span;
      const sgn = Math.sign(a) || 1;
      const rr = 0.06 + layer * 1.6 * r;
      const ex = Math.max(0, Math.abs(a) - hw);
      // p-norm distance past the top: the corners hang a little lower than the edges
      const e = ex > 0 || ez > 0 ? Math.min(drop * 1.02, Math.pow(Math.pow(ex, 3.2) + Math.pow(ez, 3.2), 1 / 3.2)) : 0;
      const el = Math.hypot(ex, ez) || 1;
      const dx = (sgn * ex) / el;
      const dz = ez / el;
      const baseX = sgn * Math.min(Math.abs(a), hw);
      const arc = (rr * Math.PI) / 2;
      // distance to the flat sheet's own border drives the hem curl
      const toEdge = Math.min(span - Math.abs(a), s < 0 ? drop - ez : Infinity);
      const curlLen = drop * 0.16;
      // (the turned band hangs straight: curling it would open a dark slot over the sheet's hem)
      const c = smoothstep(0, 1, (curlLen - toEdge) / curlLen) * (1 - layer);

      let out = 0;
      let dy = 0;
      let ao = 1;
      if (e > 0) {
        if (e < arc) {
          const ang = e / rr;
          out = Math.sin(ang) * rr;
          dy = -rr * (1 - Math.cos(ang));
        } else {
          // the fall stops where the curl begins
          const dn = Math.max(0, e - arc - c * curlLen);
          out = rr + dn * 0.07;
          dy = -rr - dn;
          // vertical folds along the edge, growing towards the hem (continuous round the corner)
          const perim = (s < 0 ? zFoot + Math.abs(baseX) : z0 + hw) * (sgn > 0 ? 1 : 1.13);
          let f = 0;
          drapes.forEach(([ph, fr]) => {
            f += Math.sin(perim * fr * 1.7 + ph);
          });
          f /= 2;
          f = Math.sign(f) * Math.pow(Math.min(1, Math.abs(f)), 0.75);
          const grow = smoothstep(0, 0.32, dn);
          out += f * 0.045 * grow;
          dy += f * 0.018 * grow;
          ao *= 1 - 0.22 * grow * Math.max(0, -f);
          // hem: the last few centimetres curl under (gives the edge its loft)
          if (c > 0) {
            const ca = c * Math.PI * 0.6;
            const cr = 0.05;
            dy -= Math.sin(ca) * cr;
            out -= (1 - Math.cos(ca)) * cr;
            ao *= 1 - (layer > 0.5 ? 0.15 : 0.4) * c;
          }
        }
      }

      let y = y0 + dy;
      // loft: a soft dome on top that relaxes over the edge
      const onTop = e <= 0 ? 1 : Math.max(0, 1 - e / 0.1);
      const dome = (1 - Math.pow(Math.min(1, Math.abs(a) / hw), 4)) * smoothstep(0, 0.35, Math.max(0, s)) * 0.022;
      let wr = 0;
      waves.forEach(([ph, fr, dir]) => {
        const u = a * Math.cos(dir) + z0 * Math.sin(dir);
        wr += (1 - Math.abs(Math.sin(u * (2.2 + fr * 2.4) + ph))) * 0.006;
      });
      const lo = (noise((a + 4) * 1.4, (s + 4) * 1.4) - 0.5) * 0.04;
      y += (dome + wr + lo) * onTop + (layer > 0.5 ? 0.006 : 0) + lift;
      y = Math.max(y, floorY);

      // crease where the turned band lies on the sheet
      if (layer < 0.5 && s >= 0) {
        const d = s - (sFold - turn); // < 0 towards the foot, in front of the band's hem
        ao *= 1 - 0.3 * Math.exp(-Math.pow(d / (d < 0 ? 0.11 : 0.05), 2));
      }
      ao *= 1 - 0.18 * Math.exp(-Math.pow((s - sFold) / 0.05, 2)) * (1 - layer);
      ao *= 1 - 0.06 * smoothstep(0.02, -0.01, wr - 0.018) * onTop;

      pos[k * 3] = baseX + dx * out;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = (s < 0 ? zFoot : z0) + dz * out;
      uv[k * 2] = (a + across) / 0.3;
      uv[k * 2 + 1] = (s - sStart) / 0.3;
      col[k * 3] = ao;
      col[k * 3 + 1] = ao;
      col[k * 3 + 2] = ao;
      k++;
    }
  }

  const index: number[] = [];
  for (let j = 0; j < nS; j++) {
    const sMid = sStart + (sEnd - sStart) * ((j + 0.5) / nS);
    const flipped = sMid > sFold + (Math.PI * r) / 2;
    for (let i = 0; i < nA; i++) {
      const a = j * (nA + 1) + i;
      const b = a + 1;
      const c = a + nA + 1;
      const d = c + 1;
      // past the fold the sheet is seen from its other side: flip the winding
      if (flipped) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
