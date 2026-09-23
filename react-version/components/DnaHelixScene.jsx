'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeVisibilityGate, fitRendererToCanvas, prefersReducedMotion, makeGlowTexture } from '@/lib/threeUtils';

/**
 * Ported as-is from the original project's buildDNAScene(). scale=1 for the
 * hero canvas, scale=0.85 for the smaller Sleep DNA orb canvas.
 */
export default function DnaHelixScene({ scale = 1, className = 'dna-canvas' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reducedMotion = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 11 / scale);

    const group = new THREE.Group();
    scene.add(group);

    const strandPoints1 = [];
    const strandPoints2 = [];
    const turns = 3.4;
    const pointsPerTurn = 26;
    const radius = 1.1 * scale;
    const height = 5.2 * scale;
    const total = Math.floor(turns * pointsPerTurn);
    for (let i = 0; i <= total; i++) {
      const t = (i / pointsPerTurn) * Math.PI * 2;
      const y = (i / total - 0.5) * height;
      strandPoints1.push(new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
      strandPoints2.push(new THREE.Vector3(Math.cos(t + Math.PI) * radius, y, Math.sin(t + Math.PI) * radius));
    }
    const geo1 = new THREE.BufferGeometry().setFromPoints(strandPoints1);
    const geo2 = new THREE.BufferGeometry().setFromPoints(strandPoints2);
    const lineMat1 = new THREE.LineBasicMaterial({ color: 0x3fd4ff, transparent: true, opacity: 0.85 });
    const lineMat2 = new THREE.LineBasicMaterial({ color: 0x3b6cf6, transparent: true, opacity: 0.85 });
    group.add(new THREE.Line(geo1, lineMat1));
    group.add(new THREE.Line(geo2, lineMat2));

    const rungMat = new THREE.LineBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.25 });
    for (let j = 0; j < strandPoints1.length; j += 3) {
      const rg = new THREE.BufferGeometry().setFromPoints([strandPoints1[j], strandPoints2[j]]);
      group.add(new THREE.Line(rg, rungMat));
    }

    const nodeGeo = new THREE.SphereGeometry(0.045 * scale, 8, 8);
    const nodeMat1 = new THREE.MeshBasicMaterial({ color: 0x3fd4ff });
    const nodeMat2 = new THREE.MeshBasicMaterial({ color: 0x5b8dff });
    for (let k = 0; k < strandPoints1.length; k += 2) {
      const n1 = new THREE.Mesh(nodeGeo, nodeMat1);
      n1.position.copy(strandPoints1[k]);
      group.add(n1);
      const n2 = new THREE.Mesh(nodeGeo, nodeMat2);
      n2.position.copy(strandPoints2[k]);
      group.add(n2);
    }

    [1.9, 2.4].forEach((r, idx) => {
      const ringGeo = new THREE.TorusGeometry(r * scale, 0.006 * scale, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x3fd4ff : 0x5b8dff, transparent: true, opacity: 0.22 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + idx * 0.5;
      ring.rotation.y = idx * 0.3;
      ring.userData.spin = 0.0015 + idx * 0.0007;
      group.add(ring);
    });

    const glowTex = makeGlowTexture(THREE, '#3fd4ff');
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(3.2 * scale, 3.2 * scale, 1);
    scene.add(glow);

    scene.add(new THREE.AmbientLight(0x223355, 1.2));

    const gate = makeVisibilityGate(canvas);
    let rafId = null;

    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!gate()) return;
      fitRendererToCanvas(renderer, camera, canvas);
      if (!reducedMotion) {
        group.rotation.y += 0.0022;
        group.children.forEach((child) => {
          if (child.userData.spin) child.rotation.z += child.userData.spin;
        });
      }
      renderer.render(scene, camera);
    }

    function onResize() {
      fitRendererToCanvas(renderer, camera, canvas);
      if (reducedMotion) renderer.render(scene, camera);
    }

    fitRendererToCanvas(renderer, camera, canvas);
    renderer.render(scene, camera);
    if (!reducedMotion) rafId = requestAnimationFrame(animate);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafId) cancelAnimationFrame(rafId);
      gate.disconnect();
      renderer.dispose();
      geo1.dispose();
      geo2.dispose();
      nodeGeo.dispose();
      glowTex.dispose();
    };
  }, [scale]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
