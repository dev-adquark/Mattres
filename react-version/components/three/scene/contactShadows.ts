/**
 * Soft contact shadows: the scene's depth seen from below, blurred twice and
 * laid on the floor. Fades to nothing at the edges, so no visible plane or
 * rectangle - the approach of three.js's webgl_shadow_contact example.
 */

import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

export interface ContactShadowOptions {
  width: number;
  depth: number;
  resolution: number;
  blur: number;
  opacity: number;
  far: number;
  darkness?: number;
}

export interface ContactShadows {
  group: THREE.Group;
  /** Re-render the shadow texture; objects in `hide` are left out of it. */
  update(scene: THREE.Scene, hide?: readonly THREE.Object3D[]): void;
  dispose(): void;
}

export function createContactShadows(
  renderer: THREE.WebGLRenderer,
  { width, depth, resolution, blur, opacity, far, darkness = 1.4 }: ContactShadowOptions,
): ContactShadows {
  const group = new THREE.Group();
  const rt = new THREE.WebGLRenderTarget(resolution, resolution);
  rt.texture.generateMipmaps = false;
  const rtBlur = new THREE.WebGLRenderTarget(resolution, resolution);
  rtBlur.texture.generateMipmaps = false;
  const planeGeo = new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2);
  const planeMat = new THREE.MeshBasicMaterial({ map: rt.texture, opacity, transparent: true, depthWrite: false });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.renderOrder = 1;
  plane.scale.y = -1; // flip so the texture reads from below
  group.add(plane);
  const blurPlane = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(planeGeo);
  blurPlane.visible = false;
  group.add(blurPlane);
  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, far);
  cam.rotation.x = Math.PI / 2;
  group.add(cam);

  const darknessUniform = { value: darkness };
  const depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = darknessUniform;
    shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );',
    )}`;
  };
  depthMaterial.depthTest = false;
  depthMaterial.depthWrite = false;

  const hUniforms = { tDiffuse: { value: null as THREE.Texture | null }, h: { value: 0 } };
  const hBlur = new THREE.ShaderMaterial({ ...HorizontalBlurShader, uniforms: hUniforms });
  hBlur.depthTest = false;
  const vUniforms = { tDiffuse: { value: null as THREE.Texture | null }, v: { value: 0 } };
  const vBlur = new THREE.ShaderMaterial({ ...VerticalBlurShader, uniforms: vUniforms });
  vBlur.depthTest = false;

  const blurPass = (amount: number) => {
    blurPlane.visible = true;
    blurPlane.material = hBlur;
    hUniforms.tDiffuse.value = rt.texture;
    hUniforms.h.value = amount / 256;
    renderer.setRenderTarget(rtBlur);
    renderer.render(blurPlane, cam);
    blurPlane.material = vBlur;
    vUniforms.tDiffuse.value = rtBlur.texture;
    vUniforms.v.value = amount / 256;
    renderer.setRenderTarget(rt);
    renderer.render(blurPlane, cam);
    blurPlane.visible = false;
  };

  const clear = new THREE.Color();
  return {
    group,
    update(scene, hide = []) {
      const prevBg = scene.background;
      const prevFog = scene.fog;
      const prevAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      const prevShadowAuto = renderer.shadowMap.autoUpdate;
      scene.background = null;
      scene.fog = null;
      plane.visible = false;
      const hidden = hide.filter((o) => o.visible);
      hidden.forEach((o) => (o.visible = false));
      renderer.shadowMap.autoUpdate = false;
      scene.overrideMaterial = depthMaterial;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = null;
      blurPass(blur);
      blurPass(blur * 0.4);
      renderer.setRenderTarget(null);
      renderer.setClearColor(clear, prevAlpha);
      renderer.shadowMap.autoUpdate = prevShadowAuto;
      hidden.forEach((o) => (o.visible = true));
      plane.visible = true;
      scene.background = prevBg;
      scene.fog = prevFog;
    },
    dispose() {
      rt.dispose();
      rtBlur.dispose();
      planeGeo.dispose();
      planeMat.dispose();
      depthMaterial.dispose();
      hBlur.dispose();
      vBlur.dispose();
    },
  };
}
