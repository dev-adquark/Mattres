/**
 * Progressive "offline" renderer built on three.js WebGL.
 *
 * Each pass renders the scene once into a linear HDR target and adds it to a
 * float accumulation buffer. Between passes we jitter:
 *  - the camera sub-pixel offset (anti-aliasing),
 *  - the camera position on a lens disc (depth of field, optional),
 *  - the active light group, one shadow-casting light per pass, sampled over
 *    an area (soft shadows) or over the sky hemisphere (ambient occlusion and
 *    soft contact shadows).
 *
 * Light groups are rendered in alternation and weighted so the result is the
 * sum of every group's average: lighting is linear, so this equals rendering
 * all lights with noise-free area/sky shadows. The final pass divides,
 * applies tone mapping, a gentle vignette, a black-level lift and fine grain.
 */

import * as THREE from 'three';
import type { Shot } from './types.js';

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const ACCUM_FRAG = /* glsl */ `
uniform sampler2D tPrev;
uniform sampler2D tSample;
uniform float uWeight;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tSample, vUv);
  // clamp extreme specular samples so one pass cannot leave a firefly
  s.rgb = min(s.rgb, vec3(24.0));
  gl_FragColor = texture2D(tPrev, vUv) + s * uWeight;
}
`;

const FINAL_FRAG = /* glsl */ `
uniform sampler2D tAccum;
uniform float uInv;
uniform vec2 uRes;
uniform float uVignette;
uniform vec3 uLift;
uniform float uGrain;
uniform float uSeed;
uniform vec3 uTint;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main() {
  vec3 c = texture2D(tAccum, vUv).rgb * uInv;
  vec2 d = vUv - 0.5;
  d.x *= uRes.x / uRes.y;
  float r = length(d) / length(vec2(0.5 * uRes.x / uRes.y, 0.5));
  c *= 1.0 - uVignette * smoothstep(0.35, 1.0, r);
  c *= uTint;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec3 o = gl_FragColor.rgb;
  o = uLift + (1.0 - uLift) * o;
  float g = (hash(gl_FragCoord.xy + uSeed) + hash(gl_FragCoord.xy * 1.37 + uSeed + 3.1) - 1.0);
  // grain is strongest in the midtones, like film
  float lum = dot(o, vec3(0.299, 0.587, 0.114));
  o += g * uGrain * (0.35 + 0.65 * (1.0 - abs(lum - 0.45) * 1.6));
  gl_FragColor = vec4(clamp(o, 0.0, 1.0), 1.0);
}
`;

function radicalInverse(i: number, base: number): number {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

export class Accumulator {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly quadScene: THREE.Scene;
  readonly quadCam: THREE.OrthographicCamera;
  readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>;
  readonly accumMat: THREE.ShaderMaterial;
  readonly finalMat: THREE.ShaderMaterial;
  w = 0;
  h = 0;
  sampleRT: THREE.WebGLRenderTarget | null = null;
  accA: THREE.WebGLRenderTarget | null = null;
  accB: THREE.WebGLRenderTarget | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.accumMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: ACCUM_FRAG,
      uniforms: { tPrev: { value: null }, tSample: { value: null }, uWeight: { value: 1 } },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.finalMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: FINAL_FRAG,
      uniforms: {
        tAccum: { value: null },
        uInv: { value: 1 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uVignette: { value: 0.2 },
        uLift: { value: new THREE.Color(0, 0, 0) },
        uGrain: { value: 0.012 },
        uSeed: { value: 0 },
        uTint: { value: new THREE.Color(1, 1, 1) },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  ensureTargets(w: number, h: number): { sampleRT: THREE.WebGLRenderTarget; accA: THREE.WebGLRenderTarget; accB: THREE.WebGLRenderTarget } {
    if (this.w === w && this.h === h && this.sampleRT && this.accA && this.accB) return { sampleRT: this.sampleRT, accA: this.accA, accB: this.accB };
    [this.sampleRT, this.accA, this.accB].forEach((t) => t && t.dispose());
    this.sampleRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const opts = { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.accA = new THREE.WebGLRenderTarget(w, h, opts);
    this.accB = new THREE.WebGLRenderTarget(w, h, opts);
    this.w = w;
    this.h = h;
    return { sampleRT: this.sampleRT, accA: this.accA, accB: this.accB };
  }

  /** Renders `shot` progressively; resolves to a PNG data URL. */
  async render(shot: Shot, onProgress?: (done: number, total: number) => void): Promise<string> {
    const { renderer } = this;
    const W = shot.width;
    const H = shot.height;
    renderer.setSize(W, H, false);
    const { sampleRT, accA, accB } = this.ensureTargets(W, H);
    renderer.toneMapping = shot.toneMapping ?? THREE.AgXToneMapping;
    renderer.toneMappingExposure = shot.exposure ?? 1;
    renderer.setClearColor(0x000000, 0);

    const cam = shot.camera;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    const basePos = shot.view.position.clone();
    const target = shot.view.target.clone();
    const focus = shot.view.focus ? shot.view.focus.clone() : target.clone();
    const aperture = shot.view.aperture || 0;
    // fixed orientation (aimed at the composition target); depth of field comes
    // from translating the camera on the lens disc and shifting the frustum so
    // the focus plane stays registered (an off-axis "thin lens")
    cam.position.copy(basePos);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    const quat = cam.quaternion.clone();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    const focusDist = Math.max(0.01, focus.clone().sub(basePos).dot(fwd));
    const fPx = H / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const lensSign = shot.lensSign ?? -1;

    // schedule of groups, weighted by share
    const cycle: number[] = [];
    shot.groups.forEach((g, gi) => {
      for (let s = 0; s < (g.share || 1); s++) cycle.push(gi);
    });
    const cycles = Math.max(1, Math.round(shot.samples / cycle.length));
    const total = cycles * cycle.length;
    const perGroup = shot.groups.map((g) => cycles * (g.share || 1));
    const counters = shot.groups.map(() => 0);
    const allLights = new Set<THREE.Light>();
    shot.groups.forEach((g) => g.lights.forEach((l) => allLights.add(l)));
    // objects that only exist for one group (e.g. a window occluder that should
    // shape the moonlight but not block the sky)
    const exclusive = new Set<THREE.Object3D>();
    shot.groups.forEach((g) => (g.only || []).forEach((o) => exclusive.add(o)));
    const baseIntensity = new Map<THREE.Light, number>();
    const baseShadow = new Map<THREE.Light, boolean>();
    allLights.forEach((l) => {
      baseIntensity.set(l, l.intensity);
      baseShadow.set(l, l.castShadow);
    });

    // clear accumulation
    renderer.setRenderTarget(accA);
    renderer.clear(true, false, false);
    let src = accA;
    let dst = accB;

    for (let pass = 0; pass < total; pass++) {
      const gi = cycle[pass % cycle.length] ?? 0;
      const group = shot.groups[gi];
      if (!group) continue;
      const k = counters[gi] ?? 0;
      counters[gi] = k + 1;
      allLights.forEach((l) => {
        const on = group.lights.includes(l);
        l.intensity = on ? (baseIntensity.get(l) ?? 0) : 0;
        l.castShadow = on ? (baseShadow.get(l) ?? false) : false;
      });
      exclusive.forEach((o) => {
        o.visible = (group.only || []).includes(o);
      });
      (shot.envMaterials || []).forEach(({ material, intensity }) => {
        material.envMapIntensity = group.env ? intensity : 0;
      });
      if (group.sample) group.sample(k, perGroup[gi] ?? 0, [radicalInverse(k + 1, 2), radicalInverse(k + 1, 3)]);

      // camera: lens + sub-pixel jitter
      const lx = radicalInverse(pass + 1, 5);
      const ly = radicalInverse(pass + 1, 7);
      const rr = Math.sqrt(lx) * aperture;
      const th = ly * Math.PI * 2;
      const dx = Math.cos(th) * rr;
      const dy = Math.sin(th) * rr;
      cam.position.copy(basePos).addScaledVector(right, dx).addScaledVector(up, dy);
      cam.quaternion.copy(quat);
      const jx = radicalInverse(pass + 1, 2) - 0.5;
      const jy = radicalInverse(pass + 1, 3) - 0.5;
      const sx = lensSign * (dx * fPx) / focusDist;
      const sy = -lensSign * (dy * fPx) / focusDist;
      cam.setViewOffset(W, H, jx * 1.2 + sx, jy * 1.2 + sy, W, H);
      cam.updateMatrixWorld();

      renderer.setRenderTarget(sampleRT);
      renderer.clear(true, true, true);
      renderer.render(shot.scene, cam);

      const au = this.accumMat.uniforms;
      au.tPrev!.value = src.texture;
      au.tSample!.value = sampleRT.texture;
      au.uWeight!.value = cycle.length / (group.share || 1);
      this.quad.material = this.accumMat;
      renderer.setRenderTarget(dst);
      renderer.render(this.quadScene, this.quadCam);
      [src, dst] = [dst, src];

      if (pass % 6 === 5) {
        renderer.getContext().finish();
        await new Promise((r) => setTimeout(r, 0));
        if (onProgress) onProgress(pass + 1, total);
      }
    }
    cam.clearViewOffset();
    allLights.forEach((l) => {
      l.intensity = baseIntensity.get(l) ?? 0;
      l.castShadow = baseShadow.get(l) ?? false;
    });

    const g = shot.grade || {};
    const u = this.finalMat.uniforms;
    u.tAccum!.value = src.texture;
    u.uInv!.value = 1 / total;
    (u.uRes!.value as THREE.Vector2).set(W, H);
    u.uVignette!.value = g.vignette ?? 0.2;
    (u.uLift!.value as THREE.Color).set(g.lift ?? '#000000');
    u.uGrain!.value = g.grain ?? 0.012;
    u.uSeed!.value = (shot.seed || 1) * 13.7;
    (u.uTint!.value as THREE.Color).set(g.tint ?? '#ffffff');
    this.quad.material = this.finalMat;
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCam);
    renderer.getContext().finish();
    return this.canvas.toDataURL('image/png');
  }
}

/** Cosine-weighted direction on the upper hemisphere from a 2D sample. */
export function hemisphereDir(u: number, v: number, minElevation = 0.06): THREE.Vector3 {
  const r = Math.sqrt(u);
  const phi = v * Math.PI * 2;
  let x = r * Math.cos(phi);
  let z = r * Math.sin(phi);
  let y = Math.sqrt(Math.max(0, 1 - u));
  if (y < Math.sin(minElevation)) {
    y = Math.sin(minElevation);
    const s = Math.sqrt(1 - y * y) / Math.hypot(x, z);
    x *= s;
    z *= s;
  }
  return new THREE.Vector3(x, y, z);
}

/** Uniform point on a disc of radius 1 from a 2D sample. */
export function discPoint(u: number, v: number): [number, number] {
  const r = Math.sqrt(u);
  const a = v * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
