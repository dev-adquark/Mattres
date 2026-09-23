'use client';

/**
 * Ported as-is from the original project's inline script. Framework-
 * agnostic helpers meant to be called from inside a component's
 * useEffect, where `canvas`/`el` are real DOM nodes obtained via refs.
 */

export function makeVisibilityGate(el) {
  let visible = true;
  let observer = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
  }
  const gate = () => visible;
  gate.disconnect = () => observer && observer.disconnect();
  return gate;
}

export function fitRendererToCanvas(renderer, camera, canvas) {
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 300;
  const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 300;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Generates a soft radial glow sprite texture. Needs the THREE module passed in (avoids importing three.js in a file that might get pulled into a server context). */
export function makeGlowTexture(THREE, hexColor) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, hexColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
