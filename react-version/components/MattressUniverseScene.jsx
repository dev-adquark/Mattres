'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeVisibilityGate, fitRendererToCanvas, prefersReducedMotion } from '@/lib/threeUtils';
import { displayTitle } from '@/lib/format';
import MattressThumb from './MattressThumb';

/**
 * Ported from the original project's buildUniverseScene() +
 * showUniverseInfoPanel(). The Three.js scene construction/animation stays
 * imperative (a continuous render loop is much simpler to keep running
 * that way than to re-model as React state), but the click-to-inspect
 * panel is now real React state + JSX instead of raw innerHTML - more
 * idiomatic, and means the panel can use the real `payload` prop (the
 * last real quiz result, if any) directly rather than reading a global.
 */
const MattressUniverseScene = forwardRef(function MattressUniverseScene({ catalog, initialHighlightId, payload }, ref) {
  const canvasRef = useRef(null);
  const labelsRef = useRef(null);
  const nodesRef = useRef([]);
  const [selected, setSelected] = useState(null); // { entry, isCenter } | null

  useImperativeHandle(ref, () => ({
    /**
     * Makes the real top-match node visually dominant once a quiz result
     * exists, without a full scene rebuild: boosts its scale/glow, gently
     * dims everything else so the "best fit" reads as obviously selected.
     */
    highlightReal(topId) {
      nodesRef.current.forEach((mesh) => {
        const isTop = mesh.userData.entry.id === topId;
        mesh.userData.targetScale = isTop ? 1.6 : 0.85;
        mesh.userData.targetEmissive = isTop ? 1.0 : 0.12;
        mesh.userData.isRealTop = isTop;
      });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const labelsContainer = labelsRef.current;
    if (!canvas || !labelsContainer || !catalog?.length) return undefined;
    const reducedMotion = prefersReducedMotion();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 5.2, 8.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x334466, 1.4));
    const pointLight = new THREE.PointLight(0x3fd4ff, 1.2, 30);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    const typeColor = { foam: 0x8ff2e4, hybrid: 0x3fd4ff, innerspring: 0x5b8dff };
    const nodes = [];
    const centerIndex = Math.max(0, catalog.findIndex((m) => m.id === initialHighlightId));
    const others = catalog.filter((_, i) => i !== centerIndex);
    const centerEntry = catalog[centerIndex];

    function makeMattressMesh(entry, isCenter) {
      const w = isCenter ? 1.5 : 1.0;
      const d = isCenter ? 1.0 : 0.68;
      const h = isCenter ? 0.26 : 0.18;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: typeColor[entry.type] || 0x9fb3c8,
        emissive: isCenter ? 0x1a3a4a : 0x0a1a24,
        emissiveIntensity: isCenter ? 0.7 : 0.25,
        roughness: 0.4,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.entry = entry;
      mesh.userData.baseEmissive = mat.emissiveIntensity;
      return mesh;
    }

    const centerMesh = makeMattressMesh(centerEntry, true);
    centerMesh.position.set(0, 0, 0);
    scene.add(centerMesh);
    nodes.push(centerMesh);

    const ringRadius = 5.2;
    others.forEach((entry, i) => {
      const angle = (i / others.length) * Math.PI * 2;
      const mesh = makeMattressMesh(entry, false);
      mesh.position.set(Math.cos(angle) * ringRadius, Math.sin(i * 1.7) * 1.1, Math.sin(angle) * ringRadius * 0.62);
      mesh.userData.angle = angle;
      mesh.userData.bobSeed = i;
      scene.add(mesh);
      nodes.push(mesh);
    });
    nodesRef.current = nodes;

    const orbitGeo = new THREE.RingGeometry(ringRadius - 0.01, ringRadius + 0.01, 96);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x2a5a7a, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
    orbitRing.rotation.x = Math.PI / 2 - 0.35;
    scene.add(orbitRing);

    const labelEls = nodes.map((mesh, i) => {
      const el = document.createElement('div');
      el.className = `universe-node-label${i === 0 ? ' center' : ''}`;
      el.textContent = displayTitle(mesh.userData.entry);
      labelsContainer.appendChild(el);
      return el;
    });

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(-10, -10);
    let hovered = null;

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function onMouseLeave() {
      mouseNDC.set(-10, -10);
    }
    function onClick(e) {
      const rect = canvas.getBoundingClientRect();
      const clickNDC = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(clickNDC, camera);
      const hits = raycaster.intersectObjects(nodes);
      if (!hits.length) {
        setSelected(null);
        return;
      }
      setSelected({ entry: hits[0].object.userData.entry, isCenter: hits[0].object === centerMesh });
    }
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);

    const gate = makeVisibilityGate(canvas);
    let t = 0;
    let rafId = null;

    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!gate()) return;
      fitRendererToCanvas(renderer, camera, canvas);
      t += 0.01;
      if (!reducedMotion) {
        nodes.forEach((mesh, i) => {
          if (i === 0) {
            mesh.rotation.y += 0.004;
            return;
          }
          const a = mesh.userData.angle + t * 0.06;
          mesh.position.x = Math.cos(a) * ringRadius;
          mesh.position.z = Math.sin(a) * ringRadius * 0.62;
          mesh.position.y = Math.sin(t + mesh.userData.bobSeed) * 0.7;
          mesh.rotation.y += 0.003;
        });
      }

      nodes.forEach((mesh) => {
        if (mesh.userData.targetScale != null) {
          const s = mesh.scale.x + (mesh.userData.targetScale - mesh.scale.x) * 0.06;
          mesh.scale.set(s, s, s);
        }
        if (mesh.userData.targetEmissive != null) {
          mesh.userData.baseEmissive += (mesh.userData.targetEmissive - mesh.userData.baseEmissive) * 0.06;
          if (mesh !== hovered) mesh.material.emissiveIntensity = mesh.userData.baseEmissive;
        }
      });

      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObjects(nodes);
      if (hovered && (!hits.length || hits[0].object !== hovered)) {
        hovered.material.emissiveIntensity = hovered.userData.baseEmissive;
        hovered = null;
      }
      if (hits.length && hits[0].object !== centerMesh) {
        hovered = hits[0].object;
        hovered.material.emissiveIntensity = 0.9;
      }

      nodes.forEach((mesh, i) => {
        const pos = mesh.position.clone().project(camera);
        const x = (pos.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-pos.y * 0.5 + 0.5) * canvas.clientHeight;
        const behind = pos.z > 1;
        labelEls[i].style.left = `${x}px`;
        labelEls[i].style.top = `${y}px`;
        const baseOpacity = mesh.userData.isRealTop ? '1' : i === 0 ? '1' : '0.32';
        labelEls[i].style.opacity = behind ? '0' : mesh === hovered ? '1' : baseOpacity;
      });

      renderer.render(scene, camera);
    }

    function onResize() {
      fitRendererToCanvas(renderer, camera, canvas);
    }

    fitRendererToCanvas(renderer, camera, canvas);
    renderer.render(scene, camera);
    if (!reducedMotion) rafId = requestAnimationFrame(animate);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('click', onClick);
      if (rafId) cancelAnimationFrame(rafId);
      gate.disconnect();
      labelEls.forEach((el) => el.remove());
      renderer.dispose();
      orbitGeo.dispose();
      nodes.forEach((m) => m.geometry.dispose());
    };
  }, [catalog, initialHighlightId]);

  const scoreEntry = selected && payload?.all ? payload.all.find((m) => m.id === selected.entry.id) : null;
  const showReasons = selected?.isCenter && payload?.top?.entry?.id === selected.entry.id;
  const reasonBullets = showReasons
    ? (payload.top.result.trace.categoryRulesUsed || []).filter((r) => r.delta > 0).slice(0, 3)
    : [];

  return (
    <>
      <canvas ref={canvasRef} id="universeCanvas" className="dna-canvas" aria-hidden="true" />
      <div ref={labelsRef} className="universe-labels" />
      {selected && (
        <div className="universe-info-panel">
          <button className="uip-close" aria-label="Close" type="button" onClick={() => setSelected(null)}>
            ✕
          </button>
          <MattressThumb entry={selected.entry} />
          <div className="uip-name">{displayTitle(selected.entry)}</div>
          <div className="uip-meta">
            {selected.entry.type.charAt(0).toUpperCase() + selected.entry.type.slice(1)} · ${selected.entry.priceUsd.toLocaleString()} ·{' '}
            {selected.entry.trialDays}-night trial
          </div>
          {scoreEntry ? (
            <div className="uip-score">
              {scoreEntry.score}
              <span>/100</span>
            </div>
          ) : (
            <div className="uip-score" style={{ color: 'var(--ink-dim)', fontSize: '14px' }}>
              Take the quiz to see your score
            </div>
          )}
          {reasonBullets.length > 0 && (
            <ul className="uip-reasons">
              {reasonBullets.map((r, i) => (
                <li key={i}>{r.note}</li>
              ))}
            </ul>
          )}
          <a href="/disclosures" className="uip-cta" style={{ marginTop: '10px' }}>
            View at retailer →
          </a>
        </div>
      )}
    </>
  );
});

export default MattressUniverseScene;
