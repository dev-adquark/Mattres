/** Procedural geometry for the scene: piping loops, pillows, coil springs (the duvet lives in duvet.ts). */

import * as THREE from 'three';

/** Closed rounded-rectangle loop at height y (piping along the cover's edges). */
export function roundedRectCurve(w: number, d: number, r: number, y: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, d / 2 - r, 0],
    [-w / 2 + r, d / 2 - r, Math.PI / 2],
    [-w / 2 + r, -d / 2 + r, Math.PI],
    [w / 2 - r, -d / 2 + r, (3 * Math.PI) / 2],
  ];
  corners.forEach(([cx, cz, a0]) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
  });
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

/** A sewn pillow: squarer footprint, boxed edge, soft crown (never lens-shaped). */
export function pillowGeometry(w: number, h: number, d: number): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(1, 64, 32);
  const p = g.attributes.position;
  if (!p) return g;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const sx = Math.sign(x) * Math.pow(Math.abs(x), 0.26);
    const sz = Math.sign(z) * Math.pow(Math.abs(z), 0.26);
    const puff = (1 - Math.pow(Math.abs(sx), 9)) * (1 - Math.pow(Math.abs(sz), 9));
    const body = 0.22 + 0.78 * Math.pow(puff, 0.45);
    const dent = y > 0 ? Math.exp(-(sx * sx * 3 + sz * sz * 4)) * 0.14 : 0;
    p.setXYZ(i, (sx * w) / 2, ((y * h) / 2) * body * (1 - dent), (sz * d) / 2);
  }
  g.computeVertexNormals();
  return g;
}

/** Coil spring: barrel-shaped (pocketed) or hourglass (Bonnell), flatter closed end turns. */
export class CoilCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly radius: number,
    private readonly height: number,
    private readonly turns: number,
    private readonly hourglass: boolean,
  ) {
    super();
  }

  override getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const k = Math.abs(2 * t - 1);
    const shape = this.hourglass ? 0.62 + 0.38 * Math.pow(k, 1.4) : 0.86 + 0.14 * Math.cos(k * Math.PI * 0.5);
    const yt = t < 0.06 ? t * 0.6 : t > 0.94 ? 1 - (1 - t) * 0.6 : 0.036 + (t - 0.06) * (0.928 / 0.88);
    return target.set(Math.cos(a) * this.radius * shape, (yt - 0.5) * this.height, Math.sin(a) * this.radius * shape);
  }
}
