/**
 * Material kit: procedural textures wrapped once per scene, and factories
 * for the fabrics, foams and latex the layers are drawn with. Every texture
 * it creates is tracked so the stage can release them on teardown.
 */

import * as THREE from 'three';
import {
  makeFoamCanvases,
  makeKnitCanvases,
  makePinholeCanvases,
  makeQuiltCanvases,
  type TextureCanvases,
} from '@/lib/threeUtils';
import { MATTRESS_D as D, MATTRESS_W as W, SCENE_COLORS } from '../sceneConfig';

type Repeat = readonly [number, number];
/** Builds one material for a UV repeat (so each box face gets its own). */
export type RepeatMaterialFactory = (repeat: Repeat) => THREE.MeshStandardMaterial;

/** BoxGeometry group order: +x, -x, +y, -y, +z, -z. */
export interface SolidMaterials {
  list: THREE.MeshStandardMaterial[];
  /** The distinct materials (top, long sides, short sides). */
  unique: THREE.MeshStandardMaterial[];
}

export interface MaterialKit {
  isFull: boolean;
  /** Raw canvases reused by the bedding (knit/quilt normals). */
  canvases: { quilt: TextureCanvases; knit: TextureCanvases };
  /** Wraps a canvas as a repeating texture and tracks it. */
  tex(canvas: HTMLCanvasElement, opts?: { srgb?: boolean; repeat?: Repeat }): THREE.CanvasTexture;
  /** Tracks a texture created elsewhere so it is released with the kit. */
  track<T extends THREE.Texture>(t: T): T;
  fabric(opts: THREE.MeshPhysicalMaterialParameters): THREE.MeshStandardMaterial;
  quiltTop(): THREE.MeshStandardMaterial;
  knitSide(color?: THREE.ColorRepresentation): THREE.MeshStandardMaterial;
  foamMaker(color: THREE.ColorRepresentation): RepeatMaterialFactory;
  latexMaker(color: THREE.ColorRepresentation): RepeatMaterialFactory;
  foamMat(color: THREE.ColorRepresentation, cell?: number): THREE.MeshStandardMaterial;
  /** Per-face materials whose cells never stretch into stripes down the cut edges. */
  solidMats(make: RepeatMaterialFactory, cell: number, h: number): SolidMaterials;
  dispose(): void;
}

export function createMaterialKit({ isFull, maxAniso }: { isFull: boolean; maxAniso: number }): MaterialKit {
  const textures: THREE.Texture[] = [];
  const track = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };
  const tex: MaterialKit['tex'] = (canvasEl, { srgb = false, repeat = [1, 1] } = {}) => {
    const t = new THREE.CanvasTexture(canvasEl);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return track(t);
  };

  const texSize = isFull ? 512 : 256;
  const quilt = makeQuiltCanvases(texSize);
  const knit = makeKnitCanvases(256);
  const foamTx = makeFoamCanvases(256, 3);
  const pin = makePinholeCanvases(256, 12);
  const quiltRepeat: Repeat = [W / 0.62, D / 0.62];

  const fabric: MaterialKit['fabric'] = (opts) => {
    if (isFull) {
      return new THREE.MeshPhysicalMaterial({
        roughness: 0.85,
        sheen: 0.55,
        sheenRoughness: 0.65,
        sheenColor: new THREE.Color('#fff2e2').multiplyScalar(0.5),
        ...opts,
      });
    }
    return new THREE.MeshStandardMaterial({ roughness: 0.85, ...opts });
  };

  // fine open-cell foam: small repeat so the cells read as material, not pattern.
  const foamMaker: MaterialKit['foamMaker'] = (color) => (repeat) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.97,
      map: tex(foamTx.color, { srgb: true, repeat }),
      normalMap: tex(foamTx.normal, { repeat }),
      normalScale: new THREE.Vector2(0.75, 0.75),
    });
  const latexMaker: MaterialKit['latexMaker'] = (color) => (repeat) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      map: tex(pin.color, { srgb: true, repeat }),
      normalMap: tex(pin.normal, { repeat }),
      normalScale: new THREE.Vector2(0.55, 0.55),
    });

  return {
    isFull,
    canvases: { quilt, knit },
    tex,
    track,
    fabric,
    foamMaker,
    latexMaker,
    foamMat: (color, cell = 0.7) => foamMaker(color)([W / cell, D / cell]),
    // Box faces get their own UV repeat (top: W x D, sides: D x h or W x h).
    solidMats: (make, cell, h) => {
      const top = make([W / cell, D / cell]);
      const sideX = make([D / cell, Math.max(0.2, h / cell)]);
      const sideZ = make([W / cell, Math.max(0.2, h / cell)]);
      return { list: [sideX, sideX, top, top, sideZ, sideZ], unique: [top, sideX, sideZ] };
    },
    quiltTop: () =>
      fabric({
        color: SCENE_COLORS.coverTop,
        map: tex(quilt.color, { srgb: true, repeat: quiltRepeat }),
        normalMap: tex(quilt.normal, { repeat: quiltRepeat }),
        normalScale: new THREE.Vector2(1.05, 1.05),
      }),
    knitSide: (color = SCENE_COLORS.border) =>
      fabric({
        color,
        map: tex(knit.color, { srgb: true, repeat: [6, 1] }),
        normalMap: tex(knit.normal, { repeat: [6, 1] }),
        normalScale: new THREE.Vector2(0.3, 0.3),
      }),
    dispose() {
      textures.forEach((t) => t.dispose());
      textures.length = 0;
    },
  };
}

/** Marks every mesh under obj as a shadow caster/receiver (full tier only). */
export function shadowy<T extends THREE.Object3D>(obj: T, isFull: boolean): T {
  if (!isFull) return obj;
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}
