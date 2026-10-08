/**
 * The imperative three.js stage MattressScene owns: one renderer, one
 * on-demand frame loop (it runs only while something moves and never off
 * screen or in a hidden tab; ambient sway and dust get a short budget after
 * the last real motion, at ~30 fps, so an untouched page goes fully idle),
 * a watchdog that hands over to the poster when frames are too slow, and a
 * teardown that releases every GPU resource. Live props are read through `getProps` every frame, so prop
 * changes never rebuild the scene; only a new StageConfig does.
 */

import * as THREE from 'three';
import { buildScene } from './buildScene';
import { createCameraController } from './cameraController';
import { createExplodeController } from './explodeController';
import { observeHost } from './hostObservers';
import { AMBIENT_FRAME_MS, createAmbientBudget, createFrameWatchdog } from './frameBudget';
import { createInteractionController } from './interaction';
import { clamp, createFrameStep, smooth01 } from './math';
import type { LiveSceneProps, StageApi, StageConfig } from './types';

/** Creates the stage inside `host`; returns null (after calling onError) when WebGL is unavailable. */
export function createStage(host: HTMLElement, config: StageConfig, getProps: () => LiveSceneProps): StageApi | null {
  const { variant } = config;
  const isFull = config.quality === 'full';
  const maxDpr = isFull ? 2 : 1.25;

  /* ---------- renderer ---------- */
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  // Runtime-created canvas: sized by its host; pan-y keeps vertical swipes scrolling the page.
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;outline:none;';
  host.appendChild(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: isFull ? 'high-performance' : 'default' });
  } catch (err) {
    canvas.remove();
    getProps().onError?.(err instanceof Error ? err : new Error('WebGL unavailable'));
    return null;
  }
  const bgColor = new THREE.Color(config.background);
  const lightBg = bgColor.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
  renderer.setClearColor(bgColor, 1);
  // Neutral tone mapping keeps linen reading as linen (ACES greys and shifts warm whites).
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = lightBg ? 0.95 : 1.0;
  renderer.shadowMap.enabled = isFull;
  // VSM gives the soft, wide penumbra of a large key (no hard-edged rectangles between layers)
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const contents = buildScene(renderer, config, getProps().layers, { lightBg, bgColor });
  const { scene, layers } = contents;
  const cam = createCameraController(variant);

  /* ---------- state ---------- */
  let visible = true;
  let hidden = document.hidden;
  let disposed = false;
  let readySent = false;
  let rafId = 0;
  let lastT = 0;
  let time = 0;
  let shadowDirty = true;
  let settleKey: string | null | undefined;
  let settleSent = true;
  let viewW = 1;
  let viewH = 1;
  let lastRenderT = 0;
  // true while the only thing moving is ambient decoration (sway, dust)
  let ambientOnly = false;
  const ambient = createAmbientBudget();
  const watchdog = createFrameWatchdog();

  const explode = createExplodeController(variant, getProps(), () => {
    const rect = host.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    return smooth01((vh * 0.92 - rect.top) / (vh * 0.62));
  });

  const resize = () => {
    const w = Math.max(1, host.clientWidth || 300);
    const h = Math.max(1, host.clientHeight || 300);
    const pad = clamp(getProps().framePadBottom || 0, 0, h * 0.4);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    cam.fit(w, h, pad);
    viewW = w;
    viewH = h;
  };
  resize();

  const wake = () => {
    if (rafId || disposed || !visible || hidden) return;
    rafId = requestAnimationFrame(frame);
  };

  const interaction = createInteractionController({
    canvas,
    camera: cam,
    proxies: layers.proxies,
    getProps,
    // x-ray: an assembled mattress is still pickable (a tap reveals and selects)
    canPick: () => explode.value > 0.15 || (variant === 'xray' && getProps().explode !== 'scroll'),
    now: () => time,
    wake,
  });

  /* ---------- per-frame update; returns whether anything still moves ---------- */
  const update = (dt: number): boolean => {
    const props = getProps();
    const step = createFrameStep(dt, time, props.reducedMotion);
    const activeId = props.activeLayerId ?? null;

    let real = false;
    if (explode.update(step, props)) {
      shadowDirty = true;
      real = true;
    }
    const e = explode.value;
    const pickable = e > 0.15;
    const focusId = activeId ?? (pickable ? (props.highlightLayerId ?? interaction.hovered) : null);

    if (layers.update(step, { explode: e, activeId, focusId, pickable })) {
      shadowDirty = true;
      real = true;
    }
    contents.bedding?.update(e, layers.recs[0], layers.totalH);

    // reveal, explode, layer focus, drag and inertia are real motion; they renew the ambient budget
    const rig = cam.rig;
    const realNow = real || step.moving || interaction.dragging || Math.abs(rig.velAz) > 1e-4 || Math.abs(rig.velEl) > 1e-4;
    if (realNow) ambient.touch(time);
    const ambientOn = ambient.allows(time);

    const focus = activeId && pickable && props.focusCamera !== false ? (layers.find(activeId) ?? null) : null;
    const dist = cam.update(step, {
      explode: e,
      focus,
      totalH: layers.totalH,
      count: layers.count,
      autoRotate: props.autoRotate && ambientOn,
      dragging: interaction.dragging,
    });
    contents.fog.near = dist * 0.9;
    contents.fog.far = dist * 2.6;

    // dust drifts only inside the ambient budget, so it never keeps the loop alive on its own
    if (contents.particles && ambientOn) {
      contents.particles.update(dt, time);
      step.markMoving();
    }
    ambientOnly = !realNow;

    // tell the host when the camera has arrived (once per destination)
    const key = focus ? focus.id : null;
    if (key !== settleKey) {
      settleKey = key;
      settleSent = false;
    }
    if (!step.moving && !settleSent) {
      settleSent = true;
      props.onFocusSettled?.(key);
    }
    return step.moving;
  };

  function frame(t: number) {
    rafId = 0;
    if (disposed || !visible || hidden) return;
    // only ambient motion left: render at ~30 fps rather than the display rate
    if (ambientOnly && lastT && t - lastRenderT < AMBIENT_FRAME_MS) {
      rafId = requestAnimationFrame(frame);
      return;
    }
    const t0 = performance.now();
    const interval = lastT ? t - lastRenderT : 0;
    const dt = lastT ? clamp((t - lastT) / 1000, 1 / 240, 0.05) : 1 / 60;
    lastT = t;
    lastRenderT = t;
    time += dt;
    const moving = update(dt);
    if (shadowDirty) {
      contents.floor.contact.update(scene, contents.shadowHidden());
      shadowDirty = false;
    }
    renderer.render(scene, cam.camera);
    if (!readySent) {
      readySent = true;
      getProps().onReady?.();
    }
    // a frame's cost is the longer of its own work and the gap since the last one
    // (software WebGL stalls inside the GPU process, which only shows up as the gap)
    if (watchdog.record(Math.max(performance.now() - t0, interval)) === 'slow') {
      disposed = true;
      getProps().onError?.(new Error('WebGL too slow on this device'));
      return;
    }
    if (moving || interaction.dragging) rafId = requestAnimationFrame(frame);
    else lastT = 0;
  }

  /* ---------- lifecycle ---------- */
  const unobserve = observeHost(host, {
    onVisible(v) {
      visible = v;
      lastT = 0;
      if (v) {
        // coming back into view earns one more short ambient window
        ambient.touch(time);
        wake();
      }
    },
    onRevealThreshold() {
      explode.markInView();
      wake();
    },
    onResize() {
      resize();
      wake();
    },
    onScroll() {
      if (getProps().explode === 'scroll') wake();
    },
    onDocumentHidden(h) {
      hidden = h;
      lastT = 0;
      if (!h) wake();
    },
  });
  const onContextLost = (ev: Event) => {
    ev.preventDefault();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    disposed = true;
    getProps().onError?.(new Error('WebGL context lost'));
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  wake();

  return {
    wake,
    sync() {
      const pad = clamp(getProps().framePadBottom || 0, 0, viewH * 0.4);
      if (Math.abs(pad - cam.viewOffsetY) > 0.5 || host.clientWidth !== viewW || host.clientHeight !== viewH) {
        resize();
        wake();
      }
    },
    dispose() {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      unobserve();
      interaction.dispose();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      contents.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
