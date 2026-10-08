/** ParticleField: sparse, warm atmospheric dust (full tier, hero only, never with reduced motion). */

import * as THREE from 'three';
import { makeGlowCanvas } from '@/lib/threeUtils';
import type { MaterialKit } from './materials';

export interface ParticleField {
  points: THREE.Points;
  /** Drifts the dust by one frame. The stage only calls it inside its ambient budget. */
  update(dt: number, now: number): void;
}

const COUNT = 110;

export function createParticleField(scene: THREE.Scene, kit: MaterialKit, rnd: () => number): ParticleField {
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const sx = (rnd() - 0.5) * 11;
    const sy = rnd() * 4.5 - 0.3;
    const sz = (rnd() - 0.5) * 9;
    seeds.set([sx, sy, sz, rnd() * Math.PI * 2], i * 4);
    positions.set([sx, sy, sz], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', attr);
  const sprite = kit.track(new THREE.CanvasTexture(makeGlowCanvas('rgba(242,220,184,0.45)')));
  sprite.colorSpace = THREE.SRGBColorSpace;
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.05,
      map: sprite,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: '#f2dcb8',
    }),
  );
  scene.add(points);

  const seed = (i: number) => seeds[i] ?? 0;
  return {
    points,
    update(dt, now) {
      for (let i = 0; i < COUNT; i++) {
        const ph = seed(i * 4 + 3);
        let y = (positions[i * 3 + 1] ?? 0) + dt * 0.05;
        if (y > 4.3) y = -0.3;
        positions[i * 3] = seed(i * 4) + Math.sin(now * 0.2 + ph) * 0.16;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = seed(i * 4 + 2) + Math.cos(now * 0.17 + ph) * 0.16;
      }
      attr.needsUpdate = true;
    },
  };
}
