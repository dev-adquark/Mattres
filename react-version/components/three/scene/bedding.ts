/**
 * Hero environment: two sewn pillows and a draped duvet that ride on the top
 * layer (the duvet fades out as the stack opens), on a low upholstered
 * platform with a recessed plinth.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MATTRESS_D as D, MATTRESS_W as W, PLATFORM_H, SCENE_COLORS } from '../sceneConfig';
import { drapedDuvetGeometry } from './duvet';
import { pillowGeometry } from './geometries';
import { smooth01 } from './math';
import { shadowy, type MaterialKit } from './materials';
import type { LayerRec } from './layerViewer';

export interface HeroBedding {
  /** Follows the top layer. */
  update(explode: number, top: LayerRec | undefined, totalH: number): void;
}

export function createHeroBedding(root: THREE.Group, kit: MaterialKit, mattressH: number): HeroBedding {
  const { knit, quilt } = kit.canvases;
  const topProps = new THREE.Group();
  const pillowMat = kit.fabric({
    color: SCENE_COLORS.pillow,
    normalMap: kit.tex(knit.normal, { repeat: [3, 3] }),
    normalScale: new THREE.Vector2(0.15, 0.15),
  });
  const pGeo = pillowGeometry(1.26, 0.26, 0.7);
  [-0.68, 0.68].forEach((px, i) => {
    const pillow = new THREE.Mesh(pGeo, pillowMat);
    pillow.position.set(px, 0.11, -D / 2 + 0.55);
    pillow.rotation.set(-0.1, i ? -0.05 : 0.04, i ? 0.025 : -0.02);
    topProps.add(pillow);
  });
  const duvetMat = kit.fabric({
    color: SCENE_COLORS.duvet,
    side: THREE.DoubleSide,
    transparent: true,
    vertexColors: true,
    roughness: 0.9,
    map: kit.tex(knit.color, { srgb: true }),
    normalMap: kit.tex(quilt.normal, { repeat: [0.42, 0.42] }),
    normalScale: kit.isFull ? new THREE.Vector2(0.22, 0.22) : new THREE.Vector2(0.09, 0.09),
    ...(kit.isFull ? { sheen: 0.8, sheenRoughness: 0.55 } : {}),
  });
  // hem stays clear of the platform; corners may hang a little lower
  const drop = Math.min(0.44, mattressH * 0.74);
  const duvet = new THREE.Mesh(
    drapedDuvetGeometry({
      halfWidth: W / 2 + 0.012,
      zFoot: D / 2 + 0.012,
      length: 1.85,
      drop,
      floorY: -mattressH + 0.025,
      turn: 0.5,
      loft: 0.05,
      segments: kit.isFull ? [150, 170] : [90, 110],
    }),
    duvetMat,
  );
  topProps.add(duvet);

  // soft contact shade on the border panel just under the hem (all tiers, so the
  // drape never floats on 'lite', which has no shadow maps)
  const shadeMap = kit.track(new THREE.CanvasTexture(makeHemShadeCanvas()));
  const shadeMat = new THREE.MeshBasicMaterial({ map: shadeMap, transparent: true, depthWrite: false, opacity: 0.55 });
  const shadeH = 0.2;
  // where the curled hem ends (see drapedDuvetGeometry: lift - edge radius - fall - curl)
  const hemY = 0.03 - 0.06 - (drop * 0.84 - 0.03 * Math.PI) - 0.048;
  const bands: THREE.Mesh[] = [];
  const band = (len: number, x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, shadeH), shadeMat);
    m.position.set(x, hemY - shadeH / 2 + 0.02, z);
    m.rotation.y = ry;
    m.renderOrder = 2;
    topProps.add(m);
    bands.push(m);
  };
  const sideLen = 1.85 - 0.1;
  const sideZ = D / 2 - sideLen / 2 - 0.05;
  band(sideLen, W / 2 + 0.009, sideZ, Math.PI / 2);
  band(sideLen, -W / 2 - 0.009, sideZ, -Math.PI / 2);
  band(W - 0.12, 0, D / 2 + 0.009, 0);
  const duvetMeshes: THREE.Mesh[] = [duvet, ...bands];
  topProps.children.forEach((o) => {
    if (!bands.includes(o as THREE.Mesh)) shadowy(o, kit.isFull);
  });
  root.add(topProps);

  // upholstered platform: a soft-edged body on a recessed plinth, so the bed floats
  // on a thin shadow line instead of sitting as a box
  const plinthH = 0.075;
  const bodyH = PLATFORM_H - plinthH;
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W + 0.3, bodyH, D + 0.3, kit.isFull ? 6 : 4, 0.085),
    kit.knitSide(SCENE_COLORS.platform),
  );
  body.position.y = -bodyH / 2;
  const plinth = new THREE.Mesh(
    new RoundedBoxGeometry(W - 0.1, plinthH + 0.01, D - 0.1, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.8 }),
  );
  plinth.position.y = -bodyH - plinthH / 2 + 0.005;
  const platform = new THREE.Group();
  platform.add(body, plinth);
  shadowy(platform, kit.isFull);
  root.add(platform);

  return {
    update(e, top, totalH) {
      const topY = top ? top.y + top.h / 2 : totalH;
      topProps.position.set(0, Math.max(topY, totalH), top ? top.group.position.z : 0);
      const duvetOpacity = 1 - smooth01(e / 0.3);
      duvetMat.opacity = duvetOpacity;
      duvetMat.depthWrite = duvetOpacity > 0.98;
      shadeMat.opacity = 0.55 * duvetOpacity;
      duvetMeshes.forEach((m) => {
        m.visible = duvetOpacity > 0.002;
      });
    },
  };
}

/** Vertical falloff (dark under the hem, fading down) with softened ends. */
function makeHemShadeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const v = ctx.createLinearGradient(0, 0, 0, 64);
  v.addColorStop(0, 'rgba(0,0,0,0.75)');
  v.addColorStop(0.35, 'rgba(0,0,0,0.3)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 128, 64);
  ctx.globalCompositeOperation = 'destination-in';
  const h = ctx.createLinearGradient(0, 0, 128, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.12, 'rgba(0,0,0,1)');
  h.addColorStop(0.88, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 128, 64);
  return c;
}
