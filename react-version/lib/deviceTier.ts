'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-side rendering-tier detection for the 3D mattress system.
 *
 *   'static' - no WebGL, a software rasteriser (SwiftShader, llvmpipe, Microsoft
 *              Basic Render), or detection impossible: keep the SVG poster.
 *   'lite'   - WebGL works but the device is modest (low memory / few cores,
 *              Save-Data on, small screen) or the visitor prefers reduced
 *              motion: render 3D with dpr <= 1.25, no shadows, no particles.
 *   'full'   - everything: dpr <= 2, soft shadows, atmospheric particles.
 *
 * Reduced motion never forces 'static' on its own - the scene still renders,
 * just without auto-rotation, particles or eased camera moves (the scene
 * reads useReducedMotion() separately for that).
 *
 * Server render and the first client render always report 'static', so the
 * poster markup is identical on both sides (no hydration mismatch); the real
 * tier arrives right after hydration via useSyncExternalStore.
 */

export type DeviceTier = 'static' | 'lite' | 'full';

/** Non-standard (Chromium-only) hints; absent elsewhere, so every field is optional. */
interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let webglSupportCache: boolean | null = null;

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** True when a GL renderer string names a CPU rasteriser (every frame would block the main thread). */
export function isSoftwareRenderer(renderer: string | null | undefined): boolean {
  return !!renderer && SOFTWARE_RENDERER.test(renderer);
}

/** Best available renderer string: the plain RENDERER (unmasked in current Chromium/Firefox), else the debug extension. */
function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  let name = '';
  try {
    const plain = gl.getParameter(gl.RENDERER);
    if (typeof plain === 'string') name = plain;
    // only a masked, generic RENDERER ('WebKit WebGL', 'Mozilla') needs the debug extension;
    // asking for it otherwise makes Firefox log a deprecation warning
    if (!name || /^(webkit webgl|mozilla)$/i.test(name.trim())) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const unmasked = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null;
      if (typeof unmasked === 'string') name = `${name} ${unmasked}`;
    }
  } catch {
    /* some browsers throw on restricted parameters: treat as unknown (hardware) */
  }
  return name;
}

/** True when a hardware-accelerated WebGL (2 or 1) context can actually be created. Cached. */
export function hasWebGL(): boolean {
  if (webglSupportCache !== null) return webglSupportCache;
  if (typeof document === 'undefined') return false;
  let ok = false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    ok = !!gl && !isSoftwareRenderer(rendererName(gl));
    // Free the probe context immediately - browsers cap live contexts.
    const lose = gl ? gl.getExtension('WEBGL_lose_context') : null;
    if (lose) lose.loseContext();
  } catch {
    ok = false;
  }
  webglSupportCache = ok;
  return ok;
}

export function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Synchronous detection. Safe to call on the server (returns 'static'). */
export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'static';
  if (!hasWebGL()) return 'static';

  const nav = navigator as Navigator & NavigatorHints;
  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  const saveData = !!(nav.connection && nav.connection.saveData);
  const shortSide = Math.min(window.innerWidth || 0, window.screen?.width || Infinity);

  const modest =
    (memory !== null && memory <= 4) ||
    (cores !== null && cores <= 4) ||
    saveData ||
    shortSide < 768 ||
    prefersReducedMotionNow();

  return modest ? 'lite' : 'full';
}

/* ---------- external store plumbing (shared by every hook instance) ---------- */

function subscribeMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function subscribeTier(callback: () => void): () => void {
  const offMotion = subscribeMotion(callback);
  // Crossing the small-screen threshold (e.g. rotating a tablet) can change the tier.
  let raf = 0;
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(callback);
  };
  window.addEventListener('resize', onResize);
  return () => {
    offMotion();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}

const serverTier = (): DeviceTier => 'static';
const serverMotion = (): boolean => false;

/**
 * React hook -> 'static' | 'lite' | 'full'. Reports 'static' during SSR and
 * hydration, then the detected tier.
 */
export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(subscribeTier, detectDeviceTier, serverTier);
}

/** React hook -> boolean, live-updating prefers-reduced-motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, prefersReducedMotionNow, serverMotion);
}

/** Device pixel ratio cap per tier. */
export function maxDprForTier(tier: DeviceTier): number {
  return tier === 'full' ? 2 : 1.25;
}
