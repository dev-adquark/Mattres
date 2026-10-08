/**
 * Lighting: a warm 3200K key from the upper left (split into a soft
 * shadow-casting half and a shadowless half), a low 7000K rim from the back
 * right, a faint indigo rim on dark sections, a soft fill, a hemisphere base
 * and low-intensity studio reflections for fabric sheen and the steel coils.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SCENE_COLORS } from '../sceneConfig';

export interface Lighting {
  /** Releases the environment map (lights are disposed with the scene). */
  dispose(): void;
}

export function setupLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  { lightBg, isFull }: { lightBg: boolean; isFull: boolean },
): Lighting {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = lightBg ? 0.42 : 0.2;

  scene.add(new THREE.HemisphereLight(lightBg ? '#f3eee6' : '#cfccc8', '#141210', lightBg ? 1.05 : 0.5));
  // The key is split: 60% casts (soft) shadows, 40% does not, so shadows between
  // separated layers read as gentle occlusion rather than dark panels.
  const keyPower = (lightBg ? 2.5 : 2.7) * (isFull ? 1 : 1.12);
  const key = new THREE.DirectionalLight(SCENE_COLORS.key, isFull ? keyPower * 0.6 : keyPower);
  key.position.set(-5, 7.5, 3.2);
  if (isFull) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -3.4;
    sc.right = 3.4;
    sc.top = 3.4;
    sc.bottom = -3.4;
    sc.near = 2;
    sc.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 22;
    key.shadow.blurSamples = 20;
  }
  scene.add(key);
  if (isFull) {
    const keySoft = new THREE.DirectionalLight(SCENE_COLORS.key, keyPower * 0.4);
    keySoft.position.copy(key.position);
    scene.add(keySoft);
  }
  const rim = new THREE.DirectionalLight(SCENE_COLORS.rim, lightBg ? 0.7 : 1.05);
  rim.position.set(4.5, 3.2, -6);
  scene.add(rim);
  if (!lightBg) {
    const dusk = new THREE.DirectionalLight(SCENE_COLORS.indigoRim, 0.9);
    dusk.position.set(-5, 2.2, -5);
    scene.add(dusk);
  }
  const fill = new THREE.DirectionalLight('#fff1e2', lightBg ? 0.45 : 0.32);
  fill.position.set(5, 2.5, 6);
  scene.add(fill);

  return {
    dispose() {
      scene.traverse((o) => {
        if ((o as THREE.Light).isLight) (o as THREE.Light).dispose();
      });
      envRT.dispose();
      scene.environment = null;
    },
  };
}
