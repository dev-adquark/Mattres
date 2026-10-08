/**
 * MattressLayer meshes: one THREE.Group per layer material (quilted cover,
 * foams, latex, coil cores) plus the assembled shell shown when explode = 0.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MATTRESS_D as D, MATTRESS_W as W, SCENE_COLORS } from '../sceneConfig';
import type { LayerMaterial } from '../types';
import { CoilCurve, roundedRectCurve } from './geometries';
import type { MaterialKit } from './materials';

/** A material whose colour the layer viewer dims, with its undimmed colour. */
export interface TrackedMaterial {
  mat: THREE.MeshStandardMaterial;
  base: THREE.Color;
}

export interface LayerMesh {
  group: THREE.Group;
  mats: TrackedMaterial[];
}

interface BuildContext {
  kit: MaterialKit;
  /** Seeded random (coil rotations), shared with the particle field so the sequence stays stable. */
  rnd: () => number;
  lightBg: boolean;
}

function coilCore(kind: 'pocket-coils' | 'bonnell-coils', h: number, ctx: BuildContext, group: THREE.Group, track: (m: THREE.MeshStandardMaterial) => THREE.MeshStandardMaterial) {
  const { kit, rnd, lightBg } = ctx;
  const isFull = kit.isFull;
  // night-ink base board, foam encasement rails, brushed-steel coils
  const baseH = 0.04;
  const rail = 0.14;
  const baseMat = track(kit.foamMat(SCENE_COLORS.coreBase, 0.9));
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, baseH, D, 2, 0.015), baseMat);
  base.position.y = -h / 2 + baseH / 2;
  group.add(base);
  const railMat = track(kit.foamMat(SCENE_COLORS.rail, 0.9));
  const railH = h - baseH;
  const railY = -h / 2 + baseH + railH / 2;
  const rails: [number, number, number, number][] = [
    [W, rail, 0, D / 2 - rail / 2],
    [W, rail, 0, -D / 2 + rail / 2],
    [rail, D - rail * 2, W / 2 - rail / 2, 0],
    [rail, D - rail * 2, -W / 2 + rail / 2, 0],
  ];
  rails.forEach(([sx, sz, px, pz]) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(sx, railH, sz, 2, 0.015), railMat);
    m.position.set(px, railY, pz);
    group.add(m);
  });
  const pitch = isFull ? 0.205 : 0.27;
  const innerW = W - rail * 2 - 0.02;
  const innerD = D - rail * 2 - 0.02;
  const cols = Math.floor(innerW / pitch);
  const rows = Math.floor(innerD / pitch);
  const coilR = pitch * 0.44;
  const coilH = railH - 0.012;
  const bonnell = kind === 'bonnell-coils';
  const coilGeo = new THREE.TubeGeometry(
    new CoilCurve(coilR, coilH, bonnell ? 4.5 : 6, bonnell),
    isFull ? 110 : 60,
    bonnell ? 0.012 : 0.009,
    isFull ? 6 : 4,
    false,
  );
  const coilMat = track(
    new THREE.MeshStandardMaterial({
      color: SCENE_COLORS.steel,
      metalness: 0.92,
      roughness: 0.38, // brushed, not chrome
      envMapIntensity: lightBg ? 0.9 : 1.4,
    }),
  );
  const coils = new THREE.InstancedMesh(coilGeo, coilMat, cols * rows);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const x0 = -((cols - 1) * pitch) / 2;
  const z0 = -((rows - 1) * pitch) / 2;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pos.set(x0 + c * pitch, railY + 0.004, z0 + r * pitch);
      q.setFromAxisAngle(up, rnd() * Math.PI * 2);
      m4.compose(pos, q, s);
      coils.setMatrixAt(n++, m4);
    }
  }
  coils.instanceMatrix.needsUpdate = true;
  group.add(coils);
}

/** Builds one layer, centred on y = 0, `h` thick. */
export function buildLayerMesh(kind: LayerMaterial, h: number, ctx: BuildContext): LayerMesh {
  const { kit } = ctx;
  const group = new THREE.Group();
  const mats: TrackedMaterial[] = [];
  const track = (m: THREE.MeshStandardMaterial) => {
    mats.push({ mat: m, base: m.color.clone() });
    return m;
  };

  if (kind === 'quilt') {
    const top = track(kit.quiltTop());
    const side = track(kit.knitSide());
    const geo = new RoundedBoxGeometry(W, h, D, 3, Math.min(0.035, h / 2 - 0.002));
    group.add(new THREE.Mesh(geo, [side, side, top, side, side, side]));
    const pipeMat = track(kit.fabric({ color: SCENE_COLORS.piping }));
    const pipe = new THREE.TubeGeometry(roundedRectCurve(W - 0.01, D - 0.01, 0.05, h / 2 - 0.012), 220, 0.013, 6, true);
    group.add(new THREE.Mesh(pipe, pipeMat));
  } else if (kind === 'foam' || kind === 'dense-foam' || kind === 'foam-core') {
    const color = kind === 'foam' ? SCENE_COLORS.comfort : kind === 'dense-foam' ? SCENE_COLORS.transition : SCENE_COLORS.foamCore;
    const m = kit.solidMats(kit.foamMaker(color), kind === 'foam' ? 0.6 : 0.8, h);
    m.unique.forEach(track);
    group.add(new THREE.Mesh(new RoundedBoxGeometry(W, h, D, 3, Math.min(0.03, h / 2 - 0.002)), m.list));
  } else if (kind === 'latex' || kind === 'latex-core') {
    const m = kit.solidMats(kit.latexMaker(kind === 'latex' ? SCENE_COLORS.latex : SCENE_COLORS.latexCore), 0.8, h);
    m.unique.forEach(track);
    group.add(new THREE.Mesh(new RoundedBoxGeometry(W, h, D, 3, Math.min(0.03, h / 2 - 0.002)), m.list));
  } else {
    coilCore(kind, h, ctx, group, track);
  }
  return { group, mats };
}

export interface AssembledShell {
  group: THREE.Group;
  /** Faded out as the layers separate. */
  mats: THREE.MeshStandardMaterial[];
}

/** The closed mattress (what you see when explode = 0): cover, border and two piping loops. */
export function buildShell(totalH: number, kit: MaterialKit): AssembledShell {
  const group = new THREE.Group();
  const shellTop = kit.quiltTop();
  const shellSide = kit.knitSide();
  shellTop.transparent = true;
  shellSide.transparent = true;
  const shellMesh = new THREE.Mesh(new RoundedBoxGeometry(W + 0.012, totalH + 0.006, D + 0.012, 5, 0.075), [
    shellSide,
    shellSide,
    shellTop,
    shellSide,
    shellSide,
    shellSide,
  ]);
  shellMesh.position.y = totalH / 2;
  group.add(shellMesh);
  const pipingMat = kit.fabric({ color: SCENE_COLORS.piping, transparent: true });
  [totalH - 0.012, 0.014].forEach((py) => {
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(roundedRectCurve(W + 0.004, D + 0.004, 0.08, py), 240, 0.016, 6, true), pipingMat);
    group.add(pipe);
  });
  return { group, mats: [shellTop, shellSide, pipingMat] };
}
