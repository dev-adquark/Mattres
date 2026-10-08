/** Floor: a faint warm pool of light plus soft contact shadows (no visible plane). */

import * as THREE from 'three';
import { makeRadialCanvas } from '@/lib/threeUtils';
import { PLATFORM_H } from '../sceneConfig';
import type { SceneVariant } from '../types';
import { createContactShadows, type ContactShadows } from './contactShadows';
import type { MaterialKit } from './materials';

export interface Floor {
  glow: THREE.Mesh;
  contact: ContactShadows;
}

export function createFloor(
  renderer: THREE.WebGLRenderer,
  root: THREE.Group,
  kit: MaterialKit,
  { variant, lightBg }: { variant: SceneVariant; lightBg: boolean },
): Floor {
  const floorY = variant === 'hero' ? -PLATFORM_H : -0.02;
  const glowMap = kit.track(
    new THREE.CanvasTexture(
      makeRadialCanvas(
        256,
        lightBg
          ? [
              [0, 'rgba(255,255,255,0.5)'],
              [1, 'rgba(255,255,255,0)'],
            ]
          : [
              [0, 'rgba(216,203,183,0.10)'],
              [0.55, 'rgba(216,203,183,0.035)'],
              [1, 'rgba(0,0,0,0)'],
            ],
      ),
    ),
  );
  glowMap.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: glowMap, transparent: true, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = floorY - 0.003;
  root.add(glow);

  const contact = createContactShadows(renderer, {
    width: 8,
    depth: 9,
    resolution: kit.isFull ? 512 : 256,
    blur: 2.5,
    opacity: lightBg ? 0.3 : 0.35 * 1.6, // night ink needs a touch more to register
    far: variant === 'hero' ? 3 : 4,
  });
  contact.group.position.y = floorY;
  root.add(contact.group);
  return { glow, contact };
}
