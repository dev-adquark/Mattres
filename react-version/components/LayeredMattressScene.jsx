'use client';

import { useEffect, useRef, useState } from 'react';
import { fitRendererToCanvas, makeVisibilityGate, prefersReducedMotion } from '@/lib/threeUtils';

// Four generic, distinguishable layers - the same honest framing the
// X-Ray section uses (illustrative construction, not a specific real
// product's teardown). Colors are neutral fabric/foam tones with a
// teal rim-light, matching this site's own brand palette rather than
// inventing a new one for a single component.
const LAYERS = [
  { label: 'Support core', height: 0.62, color: 0x3a4658, y: 0 },
  { label: 'Transition layer', height: 0.32, color: 0x5c6b7e, y: 0 },
  { label: 'Comfort layer', height: 0.34, color: 0xe9ecef, y: 0 },
  { label: 'Cooling cover', height: 0.16, color: 0xf7f9fa, y: 0 },
];

/**
 * A real, original Three.js hero visual: a generic layered mattress,
 * slowly rotating, with its layers held a little apart so each is
 * individually distinguishable - not a specific product's real
 * construction (the parent renders its own "illustrative" caption).
 * Loaded only via next/dynamic(..., { ssr:false }) from Hero.jsx, so it
 * never ships in the initial bundle; call the `onUnavailable` prop if
 * WebGL itself can't be created, so the parent can swap to a static
 * fallback instead of leaving a blank canvas.
 */
export default function LayeredMattressScene({ onUnavailable }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let THREE;
    let renderer;
    let raf;
    let gate;
    let disposed = false;
    const geometries = [];
    const materials = [];

    async function init() {
      THREE = await import('three');
      if (disposed) return;

      let localRenderer;
      try {
        localRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch {
        onUnavailable?.();
        return;
      }
      renderer = localRenderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
      camera.position.set(2.6, 2.1, 3.4);
      camera.lookAt(0, 0.2, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(3, 5, 2);
      scene.add(key);
      const rim = new THREE.PointLight(0x3fd4ff, 1.4, 12);
      rim.position.set(-2.2, 1.4, -1.6);
      scene.add(rim);

      // Soft unlit gradient disc standing in for a cast shadow - cheap,
      // no real-time shadow mapping, matching the codebase's other
      // lightweight scenes.
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const ctx = shadowCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(3.4, 3.4);
      const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
      geometries.push(shadowGeo);
      materials.push(shadowMat, shadowTex);
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.05;
      scene.add(shadowMesh);

      const group = new THREE.Group();
      let cursorY = 0;
      LAYERS.forEach((layer) => {
        const geo = new THREE.BoxGeometry(2.2, layer.height, 1.4, 1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: layer.color, roughness: 0.75, metalness: 0.05 });
        geometries.push(geo);
        materials.push(mat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.restY = cursorY + layer.height / 2;
        mesh.position.y = mesh.userData.restY;
        cursorY += layer.height + 0.05; // small real gap between layers
        group.add(mesh);
      });
      group.position.y = -cursorY / 2;
      scene.add(group);

      fitRendererToCanvas(renderer, camera, canvas);
      const onResize = () => fitRendererToCanvas(renderer, camera, canvas);
      window.addEventListener('resize', onResize);

      gate = makeVisibilityGate(canvas);
      const reducedMotion = prefersReducedMotion();

      // Gentle pointer-tilt on hover-capable devices only - a small,
      // bounded offset, not a continuous heavy per-frame computation.
      let targetTiltX = 0;
      let targetTiltY = 0;
      const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
      function onPointerMove(e) {
        const rect = canvas.getBoundingClientRect();
        targetTiltY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.35;
        targetTiltX = ((e.clientY - rect.top) / rect.height - 0.5) * -0.2;
      }
      function onPointerLeave() {
        targetTiltX = 0;
        targetTiltY = 0;
      }
      if (canHover && !reducedMotion) {
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerleave', onPointerLeave);
      }

      function renderFrame() {
        group.rotation.x += (targetTiltX - group.rotation.x) * 0.06;
        group.rotation.z += (targetTiltY - group.rotation.z) * 0.06;
        renderer.render(scene, camera);
      }

      if (reducedMotion) {
        renderFrame();
      } else {
        const animate = () => {
          raf = requestAnimationFrame(animate);
          if (!gate()) return;
          group.rotation.y += 0.0035;
          renderFrame();
        };
        animate();
      }

      setReady(true);

      return () => {
        window.removeEventListener('resize', onResize);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
      };
    }

    let cleanupExtra;
    init().then((fn) => {
      cleanupExtra = fn;
    });

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      gate?.disconnect();
      cleanupExtra?.();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer?.dispose();
    };
  }, [onUnavailable]);

  return <canvas ref={canvasRef} className="layered-mattress-canvas" aria-hidden="true" style={{ opacity: ready ? 1 : 0 }} />;
}
