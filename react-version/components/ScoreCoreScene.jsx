'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { makeVisibilityGate, fitRendererToCanvas, prefersReducedMotion, makeGlowTexture } from '@/lib/threeUtils';

/**
 * Ported as-is from the original project's buildScoreCoreScene(). The
 * original exposed a `{ pulse(ms) }` object from the builder function so
 * the score-reveal sequence could call it directly; here that becomes a
 * ref handle via useImperativeHandle - the React-idiomatic equivalent of
 * "give the parent an imperative method", used because a smooth,
 * continuous Three.js render loop is much simpler to keep running
 * imperatively than to re-model as React state.
 */
const ScoreCoreScene = forwardRef(function ScoreCoreScene(props, ref) {
  const canvasRef = useRef(null);
  const pulseUntilRef = useRef(0);

  useImperativeHandle(ref, () => ({
    /** Briefly speeds up rotation and brightens the core - called at the start of the score reveal. */
    pulse(ms) {
      pulseUntilRef.current = performance.now() + (ms || 1400);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reducedMotion = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const group = new THREE.Group();
    scene.add(group);

    const coreGeo = new THREE.IcosahedronGeometry(1.15, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0c2740,
      emissive: 0x3fd4ff,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.2,
      wireframe: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);
    const wireGeo = new THREE.IcosahedronGeometry(1.22, 1);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x7fe9ff, wireframe: true, transparent: true, opacity: 0.18 });
    group.add(new THREE.Mesh(wireGeo, wireMat));

    [
      { r: 2.0, color: 0x3fd4ff, opacity: 0.3, tilt: 0.35 },
      { r: 2.55, color: 0x5b8dff, opacity: 0.24, tilt: -0.5 },
      { r: 3.05, color: 0x8f6bff, opacity: 0.16, tilt: 1.1 },
    ].forEach((ringDef, idx) => {
      const geo = new THREE.TorusGeometry(ringDef.r, 0.008, 8, 80);
      const mat = new THREE.MeshBasicMaterial({ color: ringDef.color, transparent: true, opacity: ringDef.opacity });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2 + ringDef.tilt;
      mesh.userData.spin = 0.001 + idx * 0.0006;
      group.add(mesh);
    });

    const particleGroup = new THREE.Group();
    const pGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const pMatCyan = new THREE.MeshBasicMaterial({ color: 0x7fe9ff });
    const pMatViolet = new THREE.MeshBasicMaterial({ color: 0xc85bea });
    for (let i = 0; i < 22; i++) {
      const mesh = new THREE.Mesh(pGeo, i % 6 === 0 ? pMatViolet : pMatCyan);
      const r = 1.7 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      mesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      mesh.userData.orbitSpeed = 0.0015 + Math.random() * 0.0025;
      mesh.userData.orbitAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      particleGroup.add(mesh);
    }
    group.add(particleGroup);

    const glowTex = makeGlowTexture(THREE, '#3fd4ff');
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(4.2, 4.2, 1);
    scene.add(glow);

    scene.add(new THREE.AmbientLight(0x223355, 1.3));
    const pointLight = new THREE.PointLight(0x3fd4ff, 1.1, 20);
    pointLight.position.set(2, 2, 4);
    scene.add(pointLight);

    const gate = makeVisibilityGate(canvas);
    let rafId = null;

    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!gate()) return;
      fitRendererToCanvas(renderer, camera, canvas);
      const now = performance.now();
      const pulsing = now < pulseUntilRef.current;
      if (!reducedMotion) {
        const speedMul = pulsing ? 2.6 : 1;
        group.rotation.y += 0.0016 * speedMul;
        core.rotation.y -= 0.0012 * speedMul;
        core.rotation.x += 0.0006 * speedMul;
        group.children.forEach((child) => {
          if (child.userData.spin) child.rotation.z += child.userData.spin * speedMul;
        });
        particleGroup.children.forEach((p) => {
          p.position.applyAxisAngle(p.userData.orbitAxis, p.userData.orbitSpeed * speedMul);
        });
      }
      const targetEmissive = pulsing ? 1.1 : 0.55;
      coreMat.emissiveIntensity += (targetEmissive - coreMat.emissiveIntensity) * 0.08;
      glowMat.opacity = 0.6 + (pulsing ? 0.25 : 0) * Math.sin(now / 90);
      renderer.render(scene, camera);
    }

    function onResize() {
      fitRendererToCanvas(renderer, camera, canvas);
      if (reducedMotion) renderer.render(scene, camera);
    }

    fitRendererToCanvas(renderer, camera, canvas);
    renderer.render(scene, camera);
    if (!reducedMotion) {
      rafId = requestAnimationFrame(animate);
    } else {
      coreMat.emissiveIntensity = 0.7;
      renderer.render(scene, camera);
    }
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafId) cancelAnimationFrame(rafId);
      gate.disconnect();
      renderer.dispose();
      coreGeo.dispose();
      wireGeo.dispose();
      pGeo.dispose();
      glowTex.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="score-core-canvas" aria-hidden="true" />;
});

export default ScoreCoreScene;
