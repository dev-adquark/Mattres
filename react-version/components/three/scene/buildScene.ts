/**
 * SceneLoader: assembles the stage's contents in a fixed order (lighting,
 * layer stack + assembled shell, hero bedding, floor, dust) and owns their
 * teardown. Construction order matters: the coil rotations and the dust
 * positions share one seeded random sequence, so the scene is identical on
 * every load.
 */

import * as THREE from 'three';
import { disposeObjectTree, seededRandom } from '@/lib/threeUtils';
import type { MattressLayer } from '../types';
import { createHeroBedding, type HeroBedding } from './bedding';
import { createFloor, type Floor } from './floor';
import { createLayerViewer, type LayerViewer } from './layerViewer';
import { setupLighting } from './lighting';
import { createMaterialKit } from './materials';
import { createParticleField, type ParticleField } from './particles';
import type { StageConfig } from './types';

export interface SceneContents {
  scene: THREE.Scene;
  fog: THREE.Fog;
  layers: LayerViewer;
  bedding: HeroBedding | null;
  floor: Floor;
  particles: ParticleField | null;
  /** Objects left out of the contact-shadow pass. */
  shadowHidden(): THREE.Object3D[];
  /** Releases every geometry, material, texture, light and render target. */
  dispose(): void;
}

export function buildScene(
  renderer: THREE.WebGLRenderer,
  config: StageConfig,
  layerDefs: readonly MattressLayer[],
  { lightBg, bgColor }: { lightBg: boolean; bgColor: THREE.Color },
): SceneContents {
  const isFull = config.quality === 'full';
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(bgColor, 14, 30);
  scene.fog = fog;

  const lighting = setupLighting(renderer, scene, { lightBg, isFull });
  const kit = createMaterialKit({ isFull, maxAniso: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });

  const root = new THREE.Group();
  scene.add(root);

  const rnd = seededRandom(11);
  const layers = createLayerViewer(root, { layers: layerDefs, type: config.type, kit, rnd, lightBg });
  const bedding = config.variant === 'hero' ? createHeroBedding(root, kit, layers.totalH) : null;
  const floor = createFloor(renderer, root, kit, { variant: config.variant, lightBg });
  const particles = config.showParticles ? createParticleField(scene, kit, rnd) : null;

  return {
    scene,
    fog,
    layers,
    bedding,
    floor,
    particles,
    shadowHidden: () => [floor.glow, ...layers.recs.map((r) => r.bracket), ...(particles ? [particles.points] : [])],
    dispose() {
      lighting.dispose();
      floor.contact.dispose();
      disposeObjectTree(scene);
      kit.dispose();
    },
  };
}
