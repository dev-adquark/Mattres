/**
 * Shot definitions for the campaign set: materials, lighting rigs, cameras.
 *
 *   hero     3:2   night bedroom, dressed bed; one mood per construction
 *   product  4:3   mattress only; four art-directed compositions, one per colourway,
 *                  on night-ink, linen, indigo-dusk or warm-sand seamless (COMPOSITIONS)
 *   card     1:1   the same four compositions, framed tighter
 *   detail   4:5   editorial crops per construction: 'edge' (low edge close-up on
 *                  night ink or linen), 'top' (top-down quilting macro), 'bedding'
 *                  (corner fold + pillow on linen or indigo dusk)
 *   cutaway  16:9  Night Ink studio, stair-step cut through the four layers
 *   material 3:2   editorial macro close-ups (quilting, coils, foam) with depth of field
 *
 * Art direction (brief v3): ivory knit cover (#E9E4DA family, rough ~0.85),
 * border panels in ivory / sand / charcoal / night ink, warm 3200K key from
 * the upper left, low cool 7000K rim from the back right, indigo only ever as
 * light, never as albedo. Everything is an illustration of a typical
 * construction for a mattress TYPE - never a model of a specific product.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LAYER_SETS } from '@/components/three/layers.js';
import * as TX from './textures.js';
import type { QuiltPattern } from './textures.js';
import { MW, ML, scaleUV, buildMattress, bedFrame, nightstand, buildCutaway, cyclorama, duvetGeometry, pillowGeometry, windowOccluder } from './geometry.js';
import { discPoint, hemisphereDir } from './accumulator.js';
import type { MattressMaterials, HeadboardStyle } from './geometry.js';
import type { TextureSet } from './textures.js';
import type { Colourway, LayerMaterial, LightGroup, MattressType, Sample2, Shot, ShotScene, ShotSpec, ShotView } from './types.js';

interface BorderColours {
  knit: string;
  piping: string;
  band: string;
  gusset: string;
}
interface TexSet {
  map: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  rough: THREE.CanvasTexture | null;
}
/** A light that is re-positioned (and maybe re-coloured) per pass. */
interface LightRig<L extends THREE.Light = THREE.DirectionalLight> {
  light: L;
  objects: THREE.Object3D[];
  sample(u: number, v: number): void;
}

/* ------------------------------ colourways ------------------------------ */

// Border-panel colourways (the top panel is always ivory knit). Names are kept
// stable for the manifest/filenames: linen = ivory, sand = warm sand,
// mist = charcoal, dusk = night ink.
export const COLOURWAYS: Record<Colourway, BorderColours> = {
  linen: { knit: '#d9d1c3', piping: '#bcb09c', band: '#9a8f7e', gusset: '#cec5b5' },
  sand: { knit: '#c3af8f', piping: '#9b8567', band: '#776b5b', gusset: '#b39f80' },
  mist: { knit: '#5c5c62', piping: '#3f3f45', band: '#333338', gusset: '#4e4e54' },
  dusk: { knit: '#1c2232', piping: '#131828', band: '#0d1220', gusset: '#181e2d' },
};

const COVER_TOP = '#ebe5da';

// Colour temperatures used across rigs (approximate sRGB for the Kelvin values).
const K3200 = '#ffe4c8';
const K4500 = '#fff1e2';
const K7000 = '#e9edff';
const INDIGO = '#2b3a67';

/* -------------------------------- textures ------------------------------ */

const texCache = new Map<string, THREE.CanvasTexture>();
let maxAniso = 8;

function canvasTex(key: string, make: () => HTMLCanvasElement, { srgb = false }: { srgb?: boolean } = {}): THREE.CanvasTexture {
  const k = `${key}:${srgb}`;
  const cached = texCache.get(k);
  if (cached) return cached;
  const c = make();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  texCache.set(k, t);
  return t;
}

const genCache = new Map<string, TextureSet>();
function gen(key: string, fn: () => TextureSet): TextureSet {
  let set = genCache.get(key);
  if (!set) {
    set = fn();
    genCache.set(key, set);
  }
  return set;
}

function texSet(key: string, fn: () => TextureSet): TexSet {
  const g = () => gen(key, fn);
  const rough = g().rough;
  return {
    map: canvasTex(`${key}.map`, () => g().map, { srgb: true }),
    normal: canvasTex(`${key}.normal`, () => g().normal),
    rough: rough ? canvasTex(`${key}.rough`, () => rough) : null,
  };
}

/* -------------------------------- materials ----------------------------- */

interface FabricOptions {
  color: THREE.ColorRepresentation;
  set?: TexSet | null;
  normalScale?: number;
  sheen?: number;
  sheenColor?: THREE.ColorRepresentation;
  sheenRoughness?: number;
  roughness?: number;
  side?: THREE.Side;
}

function fabric({ color, set, normalScale = 0.8, sheen = 0.7, sheenColor = '#ffffff', sheenRoughness = 0.55, roughness = 0.9, side = THREE.FrontSide }: FabricOptions): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: set?.map || null,
    normalMap: set?.normal || null,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughness,
    sheen,
    sheenRoughness,
    sheenColor: new THREE.Color(sheenColor).multiplyScalar(0.55),
    side,
  });
}

const QUILT_PATTERN: Record<MattressType, QuiltPattern> = { foam: 'wave', innerspring: 'pillowtop', latex: 'tuft', hybrid: 'diamond' };

function mattressMaterials(type: MattressType, colourway: Colourway): MattressMaterials & { band: THREE.Material; gusset: THREE.Material } {
  const cw = COLOURWAYS[colourway] || COLOURWAYS.linen;
  const pattern = QUILT_PATTERN[type] || 'diamond';
  const quiltSet = texSet(`quilt-${pattern}`, () => TX.quiltMicro(pattern, 1024, 7));
  const knitSet = texSet('jersey', () => TX.jerseyKnit(1024, 96, 5, { heather: type === 'latex' ? 0.5 : 1 }));
  const meshSet = texSet('spacer', () => TX.spacerMesh(512, 18));
  return {
    quilt: fabric({ color: type === 'latex' ? '#ece3d2' : COVER_TOP, set: quiltSet, normalScale: 0.9, sheen: 0.7, roughness: 0.85, sheenColor: '#fff4e6' }),
    knit: fabric({ color: cw.knit, set: knitSet, normalScale: 0.6, sheen: 0.8, roughness: 0.88 }),
    band: fabric({ color: cw.band, set: meshSet, normalScale: 1.2, sheen: 0.3, roughness: 0.75 }),
    gusset: fabric({ color: cw.gusset, set: knitSet, normalScale: 0.5, sheen: 0.6 }),
    piping: fabric({ color: cw.piping, set: knitSet, normalScale: 0.4, sheen: 0.9 }),
  };
}

function layerMaterial(kind: LayerMaterial | undefined): THREE.MeshPhysicalMaterial {
  const foamSet = texSet('foam', () => TX.foamCells(1024, 3, { cells: 46 }));
  const fineFoam = texSet('foam-fine', () => TX.foamCells(1024, 9, { cells: 70, contrast: 0.7 }));
  const latexSet = texSet('latex', () => TX.latexPinholes(1024, 4, 11));
  const batting = texSet('batting', () => TX.foamCells(1024, 13, { cells: 90, contrast: 0.35 }));
  const foam = (color: THREE.ColorRepresentation, set: TexSet, sheen = 0.3) =>
    new THREE.MeshPhysicalMaterial({ color, map: set.map, normalMap: set.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.96, sheen, sheenRoughness: 0.8, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.5).multiplyScalar(0.45) });
  const latex = (color: THREE.ColorRepresentation) =>
    new THREE.MeshPhysicalMaterial({ color, map: latexSet.map, normalMap: latexSet.normal, normalScale: new THREE.Vector2(1, 1), roughness: 0.66, sheen: 0.2, sheenColor: new THREE.Color('#fff6e0').multiplyScalar(0.35) });
  switch (kind) {
    case 'quilt':
      return foam('#efe9df', batting, 0.5);
    case 'foam':
      return foam('#d8cbb7', foamSet); // warm sand open-cell comfort foam
    case 'dense-foam':
      return foam('#b9a88e', fineFoam); // deeper sand transition
    case 'foam-core':
      return foam('#8e8070', fineFoam, 0.2); // dense support foam, umber
    case 'latex':
      return latex('#eadfc4');
    case 'latex-core':
      return latex('#d9c79f');
    case 'pocket-coils':
    case 'bonnell-coils':
    default:
      return foam('#141a28', fineFoam, 0.15); // night-ink base and encasement
  }
}

let envTex: THREE.Texture | null = null;
function environment(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (envTex) return envTex;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  envTex = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  return envTex;
}

/* --------------------------------- lights ------------------------------- */

/** Area-ish key light: a shadowed directional light sampled over a disc. */
interface AreaKeyOptions {
  color: THREE.ColorRepresentation;
  intensity: number;
  dir: THREE.Vector3;
  dist?: number;
  soft?: number;
  target?: THREE.Vector3;
  half?: number;
  mapSize?: number;
  bias?: number;
  normalBias?: number;
}

function areaKey({ color, intensity, dir, dist = 9, soft = 1.2, target = new THREE.Vector3(), half = 2.6, mapSize = 4096, bias = -0.0002, normalBias = 0.006 }: AreaKeyOptions): LightRig {
  const light = new THREE.DirectionalLight(color, intensity);
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  const sc = light.shadow.camera;
  sc.left = -half;
  sc.right = half;
  sc.top = half;
  sc.bottom = -half;
  sc.near = 0.5;
  sc.far = dist * 2.5;
  light.shadow.bias = bias;
  light.shadow.normalBias = normalBias;
  light.target.position.copy(target);
  const d = dir.clone().normalize();
  const t1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize();
  const t2 = new THREE.Vector3().crossVectors(d, t1).normalize();
  const base = target.clone().addScaledVector(d, dist);
  light.position.copy(base);
  return {
    light,
    objects: [light, light.target],
    sample(u, v) {
      const [px, py] = discPoint(u, v);
      light.position.copy(base).addScaledVector(t1, px * soft).addScaledVector(t2, py * soft);
      light.updateMatrixWorld();
    },
  };
}

/** Stochastic sky: one shadowed directional per pass, cosine-distributed. */
interface SkyDomeOptions {
  color: THREE.ColorRepresentation;
  intensity: number;
  center?: THREE.Vector3;
  radius?: number;
  mapSize?: number;
  minElevation?: number;
  colorAt?: ((dir: THREE.Vector3) => THREE.Color) | null;
  bias?: number;
  normalBias?: number;
  azimuthRange?: readonly [number, number] | null;
}

function skyDome({
  color,
  intensity,
  center = new THREE.Vector3(),
  radius = 3,
  mapSize = 2048,
  minElevation = 0.1,
  colorAt = null,
  bias = -0.0004,
  normalBias = 0.008,
  azimuthRange = null,
}: SkyDomeOptions): LightRig {
  const light = new THREE.DirectionalLight(color, intensity);
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  const sc = light.shadow.camera;
  sc.left = -radius;
  sc.right = radius;
  sc.top = radius;
  sc.bottom = -radius;
  sc.near = 0.1;
  sc.far = radius * 5;
  light.shadow.bias = bias;
  light.shadow.normalBias = normalBias;
  light.target.position.copy(center);
  const base = new THREE.Color(color);
  return {
    light,
    objects: [light, light.target],
    sample(u, v) {
      let vv = v;
      if (azimuthRange) vv = azimuthRange[0] + v * (azimuthRange[1] - azimuthRange[0]);
      const dir = hemisphereDir(u, vv, minElevation);
      light.position.copy(center).addScaledVector(dir, radius * 2.2);
      if (colorAt) light.color.copy(colorAt(dir));
      else light.color.copy(base);
      light.updateMatrixWorld();
    },
  };
}

function addAll(scene: THREE.Scene, rig: { objects: THREE.Object3D[] }): void {
  rig.objects.forEach((o) => scene.add(o));
}

/* ------------------------------ camera rig ------------------------------ */

function orbit(target: THREE.Vector3, az: number, el: number, dist: number): THREE.Vector3 {
  return new THREE.Vector3(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
}

/* --------------------------------- shots -------------------------------- */

const SIZES: Record<ShotSpec['kind'], readonly [number, number]> = {
  hero: [2400, 1600],
  product: [2400, 1800],
  card: [1200, 1200],
  detail: [1600, 2000],
  cutaway: [1920, 1080],
  material: [1800, 1200],
};

export function buildShot(spec: ShotSpec, renderer: THREE.WebGLRenderer): Shot {
  maxAniso = renderer.capabilities.getMaxAnisotropy();
  const [width, height] = spec.size || SIZES[spec.kind];
  const base = { width, height, samples: spec.samples || 192, seed: spec.seed || 1 };
  if (spec.kind === 'hero') return { ...base, ...heroShot(spec) };
  if (spec.kind === 'product' || spec.kind === 'card') return { ...base, ...studioShot(spec) };
  if (spec.kind === 'detail') return { ...base, ...detailShot(spec) };
  if (spec.kind === 'cutaway') return { ...base, ...cutawayShot(spec, renderer) };
  if (spec.kind === 'material') return { ...base, ...materialShot(spec, renderer) };
  throw new Error(`Unknown shot kind ${String(spec.kind)}`);
}

/* ---- shared: seamless studio with four backdrops ---- */

/**
 * Seamless sweep in one of four Night Sleep Lab backdrops:
 *   sand   warm sand paper (the original campaign studio)
 *   linen  pale linen paper, cooler and brighter, for light sections
 *   night  night-ink paper, for dark sections: the cover reads luminous
 *   dusk   indigo dusk paper washed by a warm amber key, like a lamp at night
 * The key is a warm (~3000K) area light from the upper left, a low 7000K rim
 * separates the far edge from the sweep, and a sky dome supplies contact
 * shadows and ambient occlusion. `sweepYaw` turns the whole sweep so the
 * camera always looks into the curve, whatever its azimuth.
 */
export type Backdrop = 'sand' | 'linen' | 'night' | 'dusk';

interface BackdropLook {
  paper: string;
  sky: string;
  skyWarm: string;
  skyGain: number;
  rimGain: number;
  fillGain: number;
  keyColour: string;
  keyGain: number;
  exposure: number;
  lift: string;
  vignette: number;
}

const K3000 = '#ffdcb8';
const BACKDROPS: Record<Backdrop, BackdropLook> = {
  sand: { paper: '#d9cfbf', sky: '#eceae6', skyWarm: '#f8efe2', skyGain: 1, rimGain: 1, fillGain: 1, keyColour: K3000, keyGain: 1.04, exposure: 0.98, lift: '#060403', vignette: 0.24 },
  linen: { paper: '#ece8e1', sky: '#f0f0ee', skyWarm: '#fbf4ea', skyGain: 1.12, rimGain: 0.8, fillGain: 1.1, keyColour: K3200, keyGain: 0.96, exposure: 1.0, lift: '#07070a', vignette: 0.16 },
  night: { paper: '#0d1630', sky: '#3e4e86', skyWarm: '#6c6a74', skyGain: 0.42, rimGain: 2.1, fillGain: 0.35, keyColour: K3000, keyGain: 1.12, exposure: 0.9, lift: '#03060d', vignette: 0.34 },
  dusk: { paper: '#2c3760', sky: '#3a4a82', skyWarm: '#8a6a58', skyGain: 0.5, rimGain: 1.5, fillGain: 0.3, keyColour: '#ffd6aa', keyGain: 1.05, exposure: 0.92, lift: '#04060f', vignette: 0.32 },
};

interface StudioOptions {
  backdrop?: Backdrop;
  key?: number;
  keyDir?: THREE.Vector3;
  keySoft?: number;
  rim?: number;
  rimDir?: THREE.Vector3;
  sky?: number;
  fill?: number;
  half?: number;
  sweepYaw?: number;
}

function makeStudio(
  target: THREE.Vector3,
  { backdrop = 'sand', key = 3.3, keyDir = new THREE.Vector3(-0.62, 0.78, 0.18), keySoft = 2.2, rim = 0.75, rimDir = new THREE.Vector3(0.7, 0.55, -0.75), sky = 1.25, fill = 0.55, half = 2.6, sweepYaw = 0 }: StudioOptions = {},
): { scene: THREE.Scene; groups: LightGroup[]; keyRig: LightRig; look: BackdropLook } {
  const look = BACKDROPS[backdrop];
  const scene = new THREE.Scene();
  const paperSet = texSet('paper', () => TX.paper(512, 61));
  const sweep = cyclorama(new THREE.MeshStandardMaterial({ color: look.paper, map: paperSet.map, roughness: 1 }), { back: -5.5, depth: 30, radius: 3, height: 24, width: 60 });
  sweep.rotation.y = sweepYaw;
  scene.add(sweep);
  const keyRig = areaKey({ color: look.keyColour, intensity: key * look.keyGain, dir: keyDir, dist: 9, soft: keySoft, target, half });
  const skyRig = skyDome({
    color: look.sky,
    intensity: sky * look.skyGain,
    center: new THREE.Vector3(0, 0.2, 0),
    radius: 2.7,
    minElevation: 0.12,
    // warmer from the key side, a touch cooler overhead: a soft floor gradient
    colorAt: (d) => new THREE.Color(look.sky).lerp(new THREE.Color(look.skyWarm), Math.max(0, -d.x) * 0.7),
  });
  const fillRig = areaKey({ color: K4500, intensity: fill * look.fillGain, dir: new THREE.Vector3(0.8, 0.4, 0.6), dist: 9, soft: 3, target, half, mapSize: 2048 });
  const rimRig = areaKey({ color: K7000, intensity: rim * look.rimGain, dir: rimDir, dist: 9, soft: 1.4, target, half, mapSize: 2048 });
  [keyRig, skyRig, fillRig, rimRig].forEach((r) => addAll(scene, r));
  const groups: LightGroup[] = [
    { name: 'key', lights: [keyRig.light], sample: (_k, _n, [u, v]) => keyRig.sample(u, v) },
    {
      name: 'rim',
      lights: [rimRig.light, fillRig.light],
      sample: (_k, _n, [u, v]) => {
        rimRig.sample(u, v);
        fillRig.sample(v, u);
      },
    },
    { name: 'sky', share: 2, lights: [skyRig.light], sample: (_k, _n, [u, v]) => skyRig.sample(u, v) },
  ];
  return { scene, groups, keyRig, look };
}

/** The original warm-sand studio (detail crops keep it unless told otherwise). */
function sandStudio(target: THREE.Vector3, opts: Omit<StudioOptions, 'backdrop'> = {}): ReturnType<typeof makeStudio> {
  return makeStudio(target, { ...opts, backdrop: 'sand' });
}

/* ---- product / card: four art-directed compositions, one per colourway ---- */

/**
 * Each border colourway is its own photograph, not just another camera angle:
 * a backdrop, a lens and a crop. Cards are picked by colourway (seeded per
 * mattress, or rotated by grid index), so neighbours never read as one
 * packshot repeated.
 *
 *   linen  ivory border on NIGHT INK - low profile along the long side at a
 *          long lens, the far end running out of frame, near corner in focus
 *   mist   charcoal border on LINEN - the clean three-quarter packshot (the
 *          one that still reads at thumbnail size)
 *   sand   sand border on INDIGO DUSK - low corner crop at ~85mm with shallow
 *          depth of field, a warm amber key raking the border
 *   dusk   night-ink border on WARM SAND - high overhead, rotated, cropped
 *          into the quilting with a low raking key
 */
interface Composition {
  backdrop: Backdrop;
  /** Camera azimuth / elevation (radians) and distance multiplier. */
  az: number;
  el: number;
  dist: number;
  /** Vertical field of view, card / product. */
  fov: readonly [number, number];
  /** Mattress yaw. */
  rot: number;
  /** Target offset from the mattress centre, in units of (MW/2, mh, ML/2). */
  aim: readonly [number, number, number];
  /** Optional focus point (same units) and lens aperture: depth of field. */
  focus?: readonly [number, number, number];
  aperture?: number;
  keyDir: readonly [number, number, number];
  keySoft: number;
  key: number;
  rim: number;
  rimDir?: readonly [number, number, number];
  sky: number;
  fill: number;
}

const COMPOSITIONS: Record<Colourway, Composition> = {
  linen: {
    backdrop: 'night',
    az: 1.26,
    el: 0.15,
    dist: 1.02,
    fov: [17, 15],
    rot: 0,
    aim: [0.6, 0.75, 0.6],
    focus: [1, 0.55, 0.9],
    aperture: 0.016,
    keyDir: [0.5, 0.62, 0.6],
    keySoft: 1.6,
    key: 3.6,
    rim: 1.2,
    rimDir: [-0.85, 0.5, -0.3],
    sky: 1.2,
    fill: 0.4,
  },
  mist: { backdrop: 'linen', az: 0.66, el: 0.36, dist: 0.98, fov: [26, 22], rot: -0.12, aim: [0, 0.32, 0.02], keyDir: [-0.62, 0.78, 0.18], keySoft: 2.2, key: 3.3, rim: 0.75, sky: 1.25, fill: 0.55 },
  sand: {
    backdrop: 'dusk',
    az: 0.8,
    el: 0.19,
    dist: 0.5,
    fov: [26, 23],
    rot: 0,
    aim: [0.85, 0.4, 0.78],
    focus: [1, 0.6, 1],
    aperture: 0.02,
    keyDir: [-0.75, 0.5, 0.45],
    keySoft: 1.2,
    key: 3.8,
    rim: 1.0,
    sky: 1.1,
    fill: 0.3,
  },
  dusk: {
    backdrop: 'sand',
    az: 0.25,
    el: 1.0,
    dist: 1.0,
    fov: [26, 22],
    rot: -0.62,
    aim: [0.1, 1, 0.1],
    keyDir: [-0.88, 0.42, 0.22],
    keySoft: 1.1,
    key: 3.5,
    rim: 0.55,
    sky: 1.05,
    fill: 0.4,
  },
};

const vec = (t: readonly [number, number, number]): THREE.Vector3 => new THREE.Vector3(...t);

function studioShot(spec: ShotSpec): ShotScene {
  const { type = 'hybrid', colourway = 'linen', kind } = spec;
  const c = COMPOSITIONS[colourway] || COMPOSITIONS.mist;
  const isCard = kind === 'card';
  const mats = mattressMaterials(type, colourway);
  const { group, height: mh } = buildMattress(type, mats, { step: isCard ? 0.007 : 0.005 });
  group.rotation.y = spec.rotate ?? c.rot;
  group.position.y = -0.012; // settle into the sweep: no light leak under the edge
  // aim / focus are given in the mattress's own frame, then turned with it
  const local = (t: readonly [number, number, number]) => new THREE.Vector3((t[0] * MW) / 2, t[1] * mh, (t[2] * ML) / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y);
  const target = local(c.aim);
  const st = makeStudio(target, {
    backdrop: c.backdrop,
    key: c.key,
    keyDir: vec(c.keyDir),
    keySoft: c.keySoft,
    rim: c.rim,
    rimDir: c.rimDir ? vec(c.rimDir) : undefined,
    sky: c.sky,
    fill: c.fill,
    sweepYaw: c.az,
  });
  st.scene.add(group);
  const camera = new THREE.PerspectiveCamera(isCard ? c.fov[0] : c.fov[1], 1, 0.05, 80);
  const dist = 5.6 * c.dist * (isCard ? 1 : 1.04);
  const view: ShotView = { target, position: orbit(target, c.az, c.el, dist), focus: c.focus ? local(c.focus) : undefined, aperture: c.aperture ?? 0 };
  return {
    scene: st.scene,
    camera,
    view,
    groups: st.groups,
    toneMapping: THREE.NeutralToneMapping,
    exposure: st.look.exposure,
    grade: { vignette: st.look.vignette, lift: st.look.lift, grain: 0.018 },
  };
}

/* ---- detail crops: edge close-up, quilting macro, bedding ---- */

const DETAIL_COLOURWAY: Record<MattressType, Colourway> = { hybrid: 'dusk', foam: 'mist', latex: 'linen', innerspring: 'sand' };
const BEDDING: Record<MattressType, { duvet: string; pillow: string }> = {
  hybrid: { duvet: '#cbbda5', pillow: '#efe9df' },
  foam: { duvet: '#5b5c62', pillow: '#ece6dc' },
  latex: { duvet: '#e3dccc', pillow: '#d9cdb9' },
  innerspring: { duvet: '#b8a382', pillow: '#efe9df' },
};

function detailShot(spec: Pick<ShotSpec, 'type' | 'crop' | 'colourway'>): ShotScene {
  const { type = 'hybrid', crop = 'edge' } = spec;
  const colourway = spec.colourway || DETAIL_COLOURWAY[type] || 'linen';
  const mats = mattressMaterials(type, colourway);
  const { group, height: mh } = buildMattress(type, mats, { step: crop === 'bedding' ? 0.004 : 0.0028 });
  group.position.y = -0.012;
  const corner = new THREE.Vector3(MW / 2, mh, ML / 2);
  // Backdrop by border tone so the edge always separates: a light border on
  // night ink, a dark one on linen; the dressed corner goes linen or indigo dusk.
  const darkBorder = colourway === 'dusk' || colourway === 'mist';

  if (crop === 'top') {
    // top-down macro: low raking warm light models every puff of the quilting
    const focus = new THREE.Vector3(0.12, mh, 0.35);
    const studio = sandStudio(focus, { key: 3.6, keyDir: new THREE.Vector3(-0.9, 0.36, 0.2), keySoft: 0.9, rim: 0.45, sky: 0.9, fill: 0.35, half: 1.6 });
    studio.scene.add(group);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.02, 30);
    const view = { target: focus, position: orbit(focus, 0.35, 1.18, 1.05), focus, aperture: 0.006 };
    return { scene: studio.scene, camera, view, groups: studio.groups, toneMapping: THREE.NeutralToneMapping, exposure: 0.98, grade: { vignette: 0.3, lift: '#0a0806', grain: 0.016 } };
  }

  if (crop === 'bedding') {
    // dressed foot corner: the duvet turned down over the edge, pillows soft in the distance
    const studio = makeStudio(new THREE.Vector3(0, mh, 0), { backdrop: darkBorder ? 'dusk' : 'linen', key: 3.0, keyDir: new THREE.Vector3(-0.6, 0.7, 0.35), rim: 0.8, sweepYaw: 0.69 });
    studio.scene.add(group);
    const bed = BEDDING[type] || BEDDING.hybrid;
    const linenSet = texSet('linen-fine', () => TX.linenWeave(1024, 200, 3));
    const duvetMat = fabric({ color: bed.duvet, set: linenSet, normalScale: 0.7, sheen: 0.9, sheenColor: '#fff2e2', side: THREE.DoubleSide });
    const duvet = new THREE.Mesh(duvetGeometry({ width: MW + 0.02, top: mh - 0.012, zHead: -ML / 2 + 0.75, foldZ: 0.42, turn: 0.38, thick: 0.045, drop: mh - 0.05, seed: 9 }), duvetMat);
    duvet.castShadow = true;
    duvet.receiveShadow = true;
    studio.scene.add(duvet);
    const pillowMat = fabric({ color: bed.pillow, set: linenSet, normalScale: 0.5, sheen: 0.8 });
    [
      { x: -0.36, rz: 0.03, ry: 0.06, s: 4 },
      { x: 0.38, rz: -0.03, ry: -0.1, s: 5 },
    ].forEach((pp) => {
      const m = new THREE.Mesh(pillowGeometry(0.66, 0.17, 0.46, pp.s), pillowMat);
      m.position.set(pp.x, mh + 0.07, -ML / 2 + 0.36);
      m.rotation.set(-0.12, pp.ry, pp.rz);
      m.castShadow = true;
      m.receiveShadow = true;
      studio.scene.add(m);
    });
    const focus = corner.clone().add(new THREE.Vector3(-0.25, -0.02, -0.55));
    const t = corner.clone().add(new THREE.Vector3(-0.55, -0.06, -0.95));
    const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 30);
    const view = { target: t, position: corner.clone().add(new THREE.Vector3(0.62, 0.28, 0.75)), focus, aperture: 0.012 };
    return { scene: studio.scene, camera, view, groups: studio.groups, toneMapping: THREE.NeutralToneMapping, exposure: studio.look.exposure, grade: { vignette: studio.look.vignette + 0.04, lift: studio.look.lift, grain: 0.018 } };
  }

  // edge: low, near the foot corner, piping and border panel in focus
  const studio = makeStudio(corner, { backdrop: darkBorder ? 'linen' : 'night', key: 3.2, keyDir: new THREE.Vector3(-0.55, 0.62, 0.55), keySoft: 1.6, rim: 1.0, half: 1.8, sweepYaw: 0.8 });
  studio.scene.add(group);
  const focus = corner.clone().add(new THREE.Vector3(-0.02, -mh * 0.35, -0.05));
  const t = corner.clone().add(new THREE.Vector3(-0.42, -mh * 0.45, -0.5));
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 30);
  const view = { target: t, position: corner.clone().add(new THREE.Vector3(0.66, -mh * 0.3 + 0.1, 0.64)), focus, aperture: 0.012 };
  return { scene: studio.scene, camera, view, groups: studio.groups, toneMapping: THREE.NeutralToneMapping, exposure: studio.look.exposure, grade: { vignette: studio.look.vignette + 0.04, lift: studio.look.lift, grain: 0.018 } };
}

/* ---- hero: night bedroom, one mood per construction ---- */

/**
 * Each construction gets its own room so foam and hybrid pages never share a
 * bedroom: different frame, bedding, wall tone and balance of moonlight to
 * lamp. Moonlight is a desaturated cool white, the lamp a warm 2700-3200K.
 */
interface HeroMood {
  colourway: Colourway;
  frame: FrameKind;
  headboard: HeadboardStyle;
  duvet: string;
  wall: string;
  moon: number;
  sky: number;
  lamp: number;
  exposure: number;
  az: number;
  el: number;
  dist: number;
}
type FrameKind = 'oat' | 'charcoal' | 'oak' | 'walnut';

const HERO_MOODS: Record<MattressType, HeroMood> = {
  hybrid: { colourway: 'linen', frame: 'oat', headboard: 'channel', duvet: '#c9bba2', wall: '#383940', moon: 6.0, sky: 3.0, lamp: 7, exposure: 1.3, az: 0.62, el: 0.2, dist: 5.15 },
  foam: { colourway: 'mist', frame: 'charcoal', headboard: 'wide', duvet: '#5c5d63', wall: '#2f3240', moon: 7.0, sky: 3.4, lamp: 4, exposure: 1.32, az: 0.36, el: 0.3, dist: 5.5 },
  latex: { colourway: 'linen', frame: 'oak', headboard: 'wood', duvet: '#e2dbca', wall: '#3b3834', moon: 5.4, sky: 2.9, lamp: 6, exposure: 1.3, az: 0.86, el: 0.13, dist: 5.0 },
  innerspring: { colourway: 'sand', frame: 'walnut', headboard: 'wood', duvet: '#b9a483', wall: '#38343a', moon: 5.0, sky: 2.8, lamp: 9, exposure: 1.28, az: 0.55, el: 0.24, dist: 4.7 },
};

function frameMaterial(kind: FrameKind): THREE.Material {
  const boucleSet = texSet('boucle', () => TX.boucle(1024, 21));
  const oakSet = texSet('oak', () => TX.oakBoards(1024, 51));
  if (kind === 'oak') return new THREE.MeshStandardMaterial({ color: '#b08e66', map: oakSet.map, normalMap: oakSet.normal, roughnessMap: oakSet.rough, roughness: 0.9, normalScale: new THREE.Vector2(0.4, 0.4) });
  if (kind === 'walnut') return new THREE.MeshStandardMaterial({ color: '#6a4c36', map: oakSet.map, normalMap: oakSet.normal, roughnessMap: oakSet.rough, roughness: 0.85, normalScale: new THREE.Vector2(0.4, 0.4) });
  if (kind === 'charcoal') return fabric({ color: '#3d3d42', set: boucleSet, normalScale: 1.1, sheen: 0.5, roughness: 0.95 });
  return fabric({ color: '#a69a86', set: boucleSet, normalScale: 1.1, sheen: 0.6, roughness: 0.95 }); // oat boucle
}

function heroShot(spec: ShotSpec): ShotScene {
  const { type = 'hybrid' } = spec;
  const mood = HERO_MOODS[type] || HERO_MOODS.hybrid;
  const colourway = spec.colourway || mood.colourway;
  const scene = new THREE.Scene();
  const plasterSet = texSet('plaster', () => TX.plaster(1024, 41));
  const oakSet = texSet('oak', () => TX.oakBoards(1024, 51));
  const linenSet = texSet('linen', () => TX.linenWeave(1024, 64, 3));

  // room
  const wallMat = new THREE.MeshStandardMaterial({ color: mood.wall, map: plasterSet.map, normalMap: plasterSet.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95 });
  const back = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(14, 6), 14 / 2.2, 6 / 2.2), wallMat);
  back.position.set(0, 3, -ML / 2 - 0.22);
  back.receiveShadow = true;
  scene.add(back);
  const left = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(10, 6), 10 / 2.2, 6 / 2.2), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-3.1, 3, 2);
  left.receiveShadow = true;
  scene.add(left);
  const floorMat = new THREE.MeshStandardMaterial({ color: '#6c5a4a', map: oakSet.map, normalMap: oakSet.normal, roughnessMap: oakSet.rough, roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) });
  const floor = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(14, 14), 14 / 1.3, 14 / 1.3), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const rugSet = texSet('rug', () => TX.boucle(1024, 33));
  const rug = new THREE.Mesh(
    scaleUV(new THREE.BoxGeometry(2.9, 0.012, 3.0), 2.9 / 0.3, 3.0 / 0.3),
    new THREE.MeshPhysicalMaterial({ color: '#8f8b84', map: rugSet.map, normalMap: rugSet.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 1, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color('#c8bfb0').multiplyScalar(0.5) })
  );
  rug.position.set(0.15, 0.006, 0.25);
  rug.receiveShadow = true;
  scene.add(rug);

  // bed
  const shadowBlack = new THREE.MeshStandardMaterial({ color: '#08090c', roughness: 1 });
  const frame = bedFrame({ upholstery: frameMaterial(mood.frame), shadowBlack }, { style: mood.headboard });
  scene.add(frame.group);
  const mats = mattressMaterials(type, colourway);
  const { group: mattress, height: mh } = buildMattress(type, mats, { step: 0.006 });
  mattress.position.y = frame.top;
  scene.add(mattress);
  const top = frame.top + mh;

  // bedside table + lamp (right of the headboard)
  const stand = nightstand(
    {
      wood: frameMaterial(mood.frame === 'oak' || mood.frame === 'walnut' ? mood.frame : 'walnut'),
      shadowBlack,
      ceramic: new THREE.MeshPhysicalMaterial({ color: '#d9d0c2', roughness: 0.45, clearcoat: 0.4 }),
      shade: new THREE.MeshPhysicalMaterial({ color: '#efe4d0', map: linenSet.map, roughness: 0.95, side: THREE.DoubleSide, emissive: '#ffc27f', emissiveIntensity: 0.35 }),
    },
    { x: MW / 2 + 0.45, z: -ML / 2 + 0.18 }
  );
  scene.add(stand.group);

  // bedding: two sleeping pillows - restraint reads more premium than a pile of shams
  const pillowWhite = fabric({ color: '#f0ebe2', set: linenSet, normalScale: 0.5, sheen: 0.8 });
  const pillows = [
    { w: 0.66, h: 0.16, d: 0.45, x: -0.33, y: top + 0.075, z: -ML / 2 + 0.42, rx: -0.16, ry: 0.06, rz: 0.02, m: pillowWhite, s: 4 },
    { w: 0.66, h: 0.16, d: 0.45, x: 0.35, y: top + 0.07, z: -ML / 2 + 0.44, rx: -0.14, ry: -0.08, rz: -0.03, m: pillowWhite, s: 5 },
  ];
  pillows.forEach((p) => {
    const m = new THREE.Mesh(pillowGeometry(p.w, p.h, p.d, p.s), p.m);
    m.position.set(p.x, p.y, p.z);
    m.rotation.set(p.rx, p.ry, p.rz);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  });
  const duvetMat = fabric({ color: mood.duvet, set: linenSet, normalScale: 0.75, sheen: 0.9, sheenColor: '#fff0dc', side: THREE.DoubleSide });
  // thinner turn-down: a soft linen hem, not a rolled tube
  const duvet = new THREE.Mesh(duvetGeometry({ width: MW + 0.02, top, zHead: -ML / 2 + 0.78, foldZ: 0.2, turn: 0.42, thick: 0.03, drop: top - 0.1, seed: 5 }), duvetMat);
  duvet.castShadow = true;
  duvet.receiveShadow = true;
  scene.add(duvet);
  // lighting: moonlight through a window (off-frame, front-left), cool sky, warm lamp
  const target = new THREE.Vector3(0, 0.6, -0.2);
  const moonDir = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();
  const moon = areaKey({ color: '#d3dbf2', intensity: mood.moon, dir: moonDir, dist: 7, soft: 0.14, target, half: 3.4, mapSize: 4096, bias: -0.0003 });
  const occ = windowOccluder({ panesX: 2, panesY: 2, paneW: 1.05, paneH: 1.25, mullion: 0.07, size: 12 });
  occ.position.copy(target).addScaledVector(moonDir, 2.4);
  occ.lookAt(target);
  occ.translateX(0.1);
  occ.translateY(0.05);
  scene.add(occ);
  addAll(scene, moon);
  const sky = skyDome({
    color: '#444857',
    intensity: mood.sky,
    center: new THREE.Vector3(0, 0.5, 0),
    radius: 3.6,
    minElevation: 0.15,
    // neutral sky with an indigo cast only from the window side: indigo as light, never as paint
    colorAt: (d) => new THREE.Color('#40434f').lerp(new THREE.Color(INDIGO).multiplyScalar(1.7), Math.max(0, -d.x) * 0.35),
  });
  addAll(scene, sky);
  const lamp = new THREE.PointLight('#ffb36b', mood.lamp, 7, 2);
  lamp.position.copy(stand.bulb);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.002;
  lamp.shadow.camera.near = 0.03;
  scene.add(lamp);
  // the shade itself must not block its own bulb: the occluding shell is lit from inside via emissive
  stand.shade.castShadow = false;
  const lampBase = lamp.position.clone();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const t = new THREE.Vector3(0.05, 0.5, -0.1);
  const view = { target: t, position: orbit(t, mood.az, mood.el, mood.dist) };
  return {
    scene,
    camera,
    view,
    groups: [
      { name: 'moon', share: 1, lights: [moon.light], only: [occ], sample: (_k, _n, [u, v]) => moon.sample(u, v) },
      { name: 'sky', share: 2, lights: [sky.light], sample: (_k, _n, [u, v]) => sky.sample(u, v) },
      {
        name: 'lamp',
        share: 1,
        lights: [lamp],
        sample: (_k: number, _n: number, [u, v]: Sample2) => {
          const [px, py] = discPoint(u, v);
          lamp.position.set(lampBase.x + px * 0.05, lampBase.y + py * 0.04, lampBase.z);
        },
      },
    ],
    toneMapping: THREE.AgXToneMapping,
    exposure: mood.exposure,
    grade: { vignette: 0.32, lift: '#06070b', grain: 0.016 },
  };
}

/* ---- cutaway: Night Ink studio ---- */

function cutawayShot(spec: Omit<ShotSpec, 'kind'>, renderer: THREE.WebGLRenderer): ShotScene {
  const { type = 'hybrid', colourway = 'linen' } = spec;
  const scene = new THREE.Scene();
  const paperSet = texSet('paper', () => TX.paper(512, 61));
  scene.add(cyclorama(new THREE.MeshStandardMaterial({ color: '#0a1020', map: paperSet.map, roughness: 1 }), { back: -5.5, depth: 30, radius: 3, height: 24, width: 60 }));
  const mats = mattressMaterials(type, colourway);
  const env = environment(renderer);
  // brushed steel: anisotropic-looking via moderate roughness and a warm env reflection
  const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.34, envMap: env, envMapIntensity: 1 });
  const pocketSet = texSet('nonwoven', () => TX.nonWoven(512, 71));
  mats.steel = steel;
  mats.pocket = new THREE.MeshPhysicalMaterial({ color: '#e6e1d7', map: pocketSet.map, normalMap: pocketSet.normal, roughness: 0.9, sheen: 0.5, sheenColor: new THREE.Color('#ffffff').multiplyScalar(0.4), side: THREE.DoubleSide });
  const kinds = (LAYER_SETS[type] || LAYER_SETS.hybrid).map((l) => l.material);
  const layerMats = kinds.map((k) => layerMaterial(k));
  const { group, height: mh } = buildCutaway(type, kinds, mats, layerMats, spec.cut || {});
  group.rotation.y = spec.rotate ?? -0.2;
  scene.add(group);

  const target = new THREE.Vector3(0, mh * 0.5, 0);
  const key = areaKey({ color: K4500, intensity: 3.8, dir: new THREE.Vector3(-0.55, 0.82, 0.38), dist: 9, soft: 2.2, target, half: 2.4 });
  const rimRig = areaKey({ color: K7000, intensity: 0.8, dir: new THREE.Vector3(0.75, 0.45, -0.6), dist: 9, soft: 1.0, target, half: 2.4, mapSize: 2048 });
  const sky = skyDome({ color: '#4a5476', intensity: 0.5, center: new THREE.Vector3(0, 0.2, 0), radius: 2.7, minElevation: 0.12, colorAt: (d) => new THREE.Color('#3b4568').lerp(new THREE.Color('#6d6a70'), Math.max(0, -d.x) * 0.6) });
  [key, rimRig, sky].forEach((r) => addAll(scene, r));
  const camera = new THREE.PerspectiveCamera(spec.fov || 24, 1, 0.1, 60);
  const t = spec.target ? new THREE.Vector3(...spec.target) : new THREE.Vector3(0.06, mh * 0.3 + 0.05, -0.12);
  const view: ShotView = {
    target: t,
    position: orbit(t, spec.az ?? 0.62, spec.el ?? 0.4, spec.dist ?? 4.75),
    focus: spec.focus ? new THREE.Vector3(...spec.focus) : undefined,
    aperture: spec.aperture || 0,
  };
  const envMaterials = [{ material: steel, intensity: 0.9 }];
  return {
    scene,
    camera,
    view,
    envMaterials,
    groups: [
      { name: 'key', lights: [key.light], sample: (_k: number, _n: number, [u, v]: Sample2) => key.sample(u, v), env: true },
      { name: 'rim', lights: [rimRig.light], sample: (_k: number, _n: number, [u, v]: Sample2) => rimRig.sample(u, v) },
      { name: 'sky', share: 2, lights: [sky.light], sample: (_k: number, _n: number, [u, v]: Sample2) => sky.sample(u, v) },
    ],
    toneMapping: THREE.NeutralToneMapping,
    exposure: (spec.exposure ?? 1.12) * 0.8,
    grade: { vignette: 0.3, lift: '#03060d', grain: 0.012 },
  };
}

/* ---- material macros ---- */

function materialShot(spec: ShotSpec, renderer: THREE.WebGLRenderer): ShotScene {
  if (spec.subject === 'quilt') {
    return detailShot({ type: 'hybrid', crop: 'edge', colourway: spec.colourway || 'dusk' });
  }
  if (spec.subject === 'coils') {
    return cutawayShot(
      {
        type: 'hybrid',
        colourway: 'dusk',
        rotate: 0,
        fov: 26,
        target: [MW / 2 - 0.62, 0.12, ML / 2 - 0.62],
        focus: [MW / 2 - 0.6, 0.13, ML / 2 - 0.45],
        az: 0.95,
        el: 0.16,
        dist: 1.25,
        aperture: 0.01,
        exposure: 1.3,
      },
      renderer
    );
  }
  // foam: the stepped corner of an all-foam cut
  return cutawayShot(
    {
      type: spec.type || 'foam',
      colourway: 'mist',
      rotate: 0,
      fov: 28,
      target: [MW / 2 - 0.55, 0.16, ML / 2 - 0.82],
      focus: [MW / 2 - 0.52, 0.18, ML / 2 - 0.75],
      az: 0.62,
      el: 0.3,
      dist: 1.2,
      aperture: 0.01,
      exposure: 1.25,
    },
    renderer
  );
}
