/**
 * LayerViewer: the layer stack and its assembled shell. Builds every layer
 * (with an invisible picking proxy and a 1px signal-amber selection edge)
 * and, each frame, separates them by the explode amount, lifts and slides
 * the active layer out like a drawer, dims the others to half brightness
 * and fades the shell as the stack opens.
 */

import * as THREE from 'three';
import type { MattressType } from '@/lib/types';
import {
  ACTIVE_LIFT,
  ACTIVE_SLIDE,
  BACK_SHIFT,
  LAYER_GAP,
  MATTRESS_D as D,
  MATTRESS_W as W,
  SCENE_COLORS,
  inferLayerMaterial,
  layerHeights,
} from '../sceneConfig';
import type { LayerMaterial, MattressLayer } from '../types';
import { smooth01 } from './math';
import { buildLayerMesh, buildShell, type AssembledShell, type TrackedMaterial } from './layerMeshes';
import { shadowy, type MaterialKit } from './materials';
import type { FrameStep } from './types';

export interface LayerRec {
  id: string;
  index: number;
  h: number;
  kind: LayerMaterial;
  group: THREE.Group;
  proxy: THREE.Mesh;
  bracket: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  mats: TrackedMaterial[];
  /** Collapsed resting centre height (bottom of the mattress at y = 0). */
  restY: number;
  glow: number;
  dim: number;
  lift: number;
  slide: number;
  y: number;
  z: number;
}

export interface LayerFrameInput {
  explode: number;
  activeId: string | null;
  focusId: string | null;
  pickable: boolean;
}

export interface LayerViewer {
  recs: LayerRec[];
  count: number;
  /** Assembled thickness. */
  totalH: number;
  shell: AssembledShell;
  proxies: THREE.Mesh[];
  find(id: string): LayerRec | undefined;
  /** Positions, dims and highlights the layers; returns true when shadows need re-rendering. */
  update(step: FrameStep, input: LayerFrameInput): boolean;
}

interface LayerViewerOptions {
  layers: readonly MattressLayer[];
  type: MattressType;
  kit: MaterialKit;
  rnd: () => number;
  lightBg: boolean;
}

export function createLayerViewer(root: THREE.Group, { layers, type, kit, rnd, lightBg }: LayerViewerOptions): LayerViewer {
  const count = layers.length;
  const heights = layerHeights(count);
  const totalH = heights.reduce((a, b) => a + b, 0);
  const amber = new THREE.Color(SCENE_COLORS.amber);

  let y = totalH;
  const recs: LayerRec[] = layers.map((def, index) => {
    const h = heights[index] ?? 0;
    const kind = inferLayerMaterial(def, index, count, type);
    const { group, mats } = buildLayerMesh(kind, h, { kit, rnd, lightBg });
    shadowy(group, kit.isFull);
    root.add(group);

    // Invisible proxy for cheap, reliable picking (instanced coils are expensive to raycast).
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, h + 0.02, D + 0.02), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.userData.layerId = def.id;
    root.add(proxy);

    // Selection edge: a 1px signal-amber outline hugging the layer.
    const bracket = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.035, h + 0.02, D + 0.035)),
      new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    );
    bracket.renderOrder = 5;
    bracket.visible = false;
    root.add(bracket);

    const restY = y - h / 2;
    y -= h;
    return { id: def.id, index, h, kind, group, proxy, bracket, mats, restY, glow: 0, dim: 0, lift: 0, slide: 0, y: 0, z: 0 };
  });

  const shell = buildShell(totalH, kit);
  shadowy(shell.group, kit.isFull);
  root.add(shell.group);

  return {
    recs,
    count,
    totalH,
    shell,
    proxies: recs.map((r) => r.proxy),
    find: (id) => recs.find((r) => r.id === id),
    update(step, { explode: e, activeId, focusId, pickable }) {
      let shadowDirty = false;
      recs.forEach((rec) => {
        const b = count - 1 - rec.index;
        const isActive = activeId === rec.id;
        const isFocus = focusId === rec.id;
        const prevLift = rec.lift;
        rec.lift = step.approach(rec.lift, isActive && pickable ? ACTIVE_LIFT * e : 0, 9);
        const prevSlide = rec.slide;
        rec.slide = step.approach(rec.slide, isActive && pickable ? ACTIVE_SLIDE * e : 0, 9);
        if (Math.abs(rec.lift - prevLift) > 1e-5 || Math.abs(rec.slide - prevSlide) > 1e-5) shadowDirty = true;
        rec.y = rec.restY + b * LAYER_GAP * e + rec.lift;
        rec.z = -b * BACK_SHIFT * e + rec.slide;
        rec.group.position.set(0, rec.y, rec.z);
        rec.proxy.position.set(0, rec.y, rec.z);
        rec.bracket.position.set(0, rec.y, rec.z);
        rec.group.visible = e > 0.004;

        rec.glow = step.approach(rec.glow, isFocus && pickable ? (isActive ? 1 : 0.45) : 0, 10);
        // active layer selected: the others drop to half brightness
        rec.dim = step.approach(rec.dim, activeId && !isActive && pickable ? 1 : 0, 8);
        rec.mats.forEach(({ mat, base }) => {
          mat.color.copy(base).multiplyScalar(1 - rec.dim * 0.5);
        });
        rec.bracket.visible = rec.glow > 0.01;
        rec.bracket.material.opacity = rec.glow;
      });

      const shellOpacity = 1 - smooth01(e / 0.14);
      shell.group.visible = shellOpacity > 0.002;
      shell.mats.forEach((m) => {
        m.opacity = shellOpacity;
        m.depthWrite = shellOpacity > 0.98;
      });
      return shadowDirty;
    },
  };
}
