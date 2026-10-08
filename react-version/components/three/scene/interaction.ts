/**
 * InteractionController: drag to orbit (with inertia), hover and tap to pick
 * a layer. No wheel, no scroll-jacking: on touch only horizontal drags orbit,
 * vertical swipes keep scrolling the page (the canvas is touch-action: pan-y).
 */

import * as THREE from 'three';
import type { CameraController } from './cameraController';
import type { LiveSceneProps } from './types';

export interface InteractionController {
  readonly hovered: string | null;
  readonly dragging: boolean;
  dispose(): void;
}

interface InteractionOptions {
  canvas: HTMLCanvasElement;
  camera: CameraController;
  proxies: readonly THREE.Object3D[];
  getProps: () => LiveSceneProps;
  /** Whether a click can pick a layer right now. */
  canPick: () => boolean;
  /** Scene time in seconds (for the idle-sway timer). */
  now: () => number;
  /** Schedules frames. */
  wake: () => void;
}

const TAP_MAX_TRAVEL = 6; // px
const TAP_MAX_MS = 600;
const STALE_RELEASE_MS = 90;

export function createInteractionController({ canvas, camera, proxies, getProps, canPick, now, wake }: InteractionOptions): InteractionController {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: string | null = null;
  let dragging = false;
  let pointerId: number | null = null;
  let downT = 0;
  let lastX = 0;
  let lastY = 0;
  let lastMoveT = 0;
  let moved = 0;

  const pick = (clientX: number, clientY: number): string | null => {
    if (!canPick()) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera.camera);
    const hit = raycaster.intersectObjects(proxies as THREE.Object3D[], false)[0];
    const id: unknown = hit?.object.userData.layerId;
    return typeof id === 'string' ? id : null;
  };
  const setHovered = (id: string | null) => {
    if (hovered === id) return;
    hovered = id;
    getProps().onLayerHover?.(id);
    wake();
  };
  const updateCursor = () => {
    canvas.style.cursor = dragging ? 'grabbing' : hovered ? 'pointer' : getProps().interactive ? 'grab' : 'default';
  };

  const onPointerDown = (ev: PointerEvent) => {
    if (!getProps().interactive || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    dragging = true;
    pointerId = ev.pointerId;
    lastX = ev.clientX;
    lastY = ev.clientY;
    downT = lastMoveT = performance.now();
    moved = 0;
    camera.stop();
    camera.rig.lastInteract = now();
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {
      /* capture is best-effort */
    }
    updateCursor();
    wake();
  };
  const onPointerMove = (ev: PointerEvent) => {
    if (!getProps().interactive) return;
    if (dragging && ev.pointerId === pointerId) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      const t = performance.now();
      const dts = Math.max(0.008, (t - lastMoveT) / 1000);
      lastX = ev.clientX;
      lastY = ev.clientY;
      lastMoveT = t;
      moved += Math.abs(dx) + Math.abs(dy);
      const dEl = ev.pointerType === 'touch' ? 0 : dy * 0.005; // touch: vertical swipes scroll the page
      camera.drag(-dx * 0.0075, dEl, dts, now());
      wake();
      return;
    }
    if (ev.pointerType === 'mouse') {
      setHovered(pick(ev.clientX, ev.clientY));
      updateCursor();
    }
  };
  const endDrag = (ev: PointerEvent, cancelled: boolean) => {
    if (!dragging || ev.pointerId !== pointerId) return;
    dragging = false;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* already released */
    }
    // stale velocity (pointer held still before release) should not fling
    if (performance.now() - lastMoveT > STALE_RELEASE_MS) camera.stop();
    if (!cancelled && moved < TAP_MAX_TRAVEL && performance.now() - downT < TAP_MAX_MS) {
      const id = pick(ev.clientX, ev.clientY);
      if (id || canPick()) getProps().onLayerSelect?.(id);
    }
    updateCursor();
    wake();
  };
  const onPointerUp = (ev: PointerEvent) => endDrag(ev, false);
  const onPointerCancel = (ev: PointerEvent) => endDrag(ev, true);
  const onPointerLeave = (ev: PointerEvent) => {
    if (ev.pointerType === 'mouse' && !dragging) {
      setHovered(null);
      updateCursor();
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);
  updateCursor();

  return {
    get hovered() {
      return hovered;
    },
    get dragging() {
      return dragging;
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
