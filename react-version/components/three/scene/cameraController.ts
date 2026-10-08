/**
 * CameraController: an orbit rig around the stack. Drag inertia, an idle
 * sway when auto-rotating, framing that keeps the whole (possibly exploded)
 * stack in view, and a damped dolly to the active layer (lambda 7: ~95% of
 * the move done in ~430ms, nothing overshoots). Reduced motion: no inertia,
 * no sway, every move applied instantly.
 */

import * as THREE from 'three';
import { BACK_SHIFT, LAYER_GAP } from '../sceneConfig';
import type { SceneVariant } from '../types';
import { clamp } from './math';
import type { LayerRec } from './layerViewer';
import type { FrameStep } from './types';

interface ViewPreset {
  azimuth: number;
  elevation: number;
  distance: number;
  targetY: number;
  targetZ: number;
  fov: number;
}

const VARIANT_VIEW: Record<SceneVariant, ViewPreset> = {
  hero: { azimuth: 0.62, elevation: 0.36, distance: 9.0, targetY: 0.2, targetZ: 0.2, fov: 30 },
  xray: { azimuth: 0.78, elevation: 0.34, distance: 9.4, targetY: 0.45, targetZ: 0, fov: 30 },
};

const AZIMUTH_RANGE = 1.25;
const ELEVATION_MIN = 0.06;
const ELEVATION_MAX = 1.05;

export interface CameraFrameInput {
  explode: number;
  focus: LayerRec | null;
  totalH: number;
  count: number;
  autoRotate: boolean;
  dragging: boolean;
}

/** Live rig state. */
export interface CameraRig {
  azimuth: number;
  elevation: number;
  velAz: number;
  velEl: number;
  sway: number;
  swayAmp: number;
  /** Scene time of the last drag/press, in seconds. */
  lastInteract: number;
  target: THREE.Vector3;
  distScale: number;
  elOffset: number;
  fitDist: number;
  portrait: boolean;
}

export interface CameraController {
  camera: THREE.PerspectiveCamera;
  rig: CameraRig;
  /** Sizes the projection; `pad` px at the bottom are covered by UI, so the subject sits higher by pad/2. */
  fit(width: number, height: number, pad: number): void;
  /** Current bottom view offset in px (0 when none). */
  readonly viewOffsetY: number;
  /** Rotates by a drag delta (radians) and records its velocity for inertia. */
  drag(dAz: number, dEl: number, dts: number, now: number): void;
  /** Stops any inertia (press, or a stale release). */
  stop(): void;
  /** Positions the camera; returns the orbit distance (for fog). */
  update(step: FrameStep, input: CameraFrameInput): number;
}

export function createCameraController(variant: SceneVariant): CameraController {
  const view = VARIANT_VIEW[variant];
  const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.1, 60);
  const rig: CameraRig = {
    azimuth: view.azimuth,
    elevation: view.elevation,
    velAz: 0,
    velEl: 0,
    sway: 0,
    swayAmp: 0,
    lastInteract: -1e9,
    target: new THREE.Vector3(0, view.targetY, view.targetZ),
    distScale: 1,
    elOffset: 0,
    fitDist: view.distance,
    portrait: false,
  };
  const lookTarget = new THREE.Vector3();

  return {
    camera,
    rig,
    fit(w, h, pad) {
      // Render the lower part of a taller virtual frame so the subject sits higher by pad/2.
      camera.aspect = w / (h + pad);
      if (pad > 0) camera.setViewOffset(w, h + pad, 0, pad, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      const aspect = w / h;
      const ref = variant === 'xray' ? 1.35 : 1.5;
      rig.fitDist = view.distance * (aspect < ref ? Math.pow(ref / aspect, variant === 'xray' ? 1.02 : 0.85) : 1);
      rig.portrait = aspect < 1;
    },
    get viewOffsetY() {
      return camera.view && camera.view.enabled ? camera.view.offsetY : 0;
    },
    drag(dAz, dEl, dts, now) {
      rig.azimuth += dAz;
      rig.elevation += dEl;
      rig.velAz = dAz / dts;
      rig.velEl = dEl / dts;
      rig.lastInteract = now;
    },
    stop() {
      rig.velAz = 0;
      rig.velEl = 0;
    },
    update(step, { explode: e, focus, totalH, count, autoRotate, dragging }) {
      const { dt, now, reducedMotion: rm } = step;
      if (!dragging && !rm) {
        if (Math.abs(rig.velAz) > 1e-4 || Math.abs(rig.velEl) > 1e-4) {
          rig.azimuth += rig.velAz * dt;
          rig.elevation += rig.velEl * dt;
          rig.velAz *= Math.exp(-dt * 4.5);
          rig.velEl *= Math.exp(-dt * 4.5);
          step.markMoving();
        }
      }
      rig.azimuth = clamp(rig.azimuth, view.azimuth - AZIMUTH_RANGE, view.azimuth + AZIMUTH_RANGE);
      rig.elevation = clamp(rig.elevation, ELEVATION_MIN, ELEVATION_MAX);

      const swaying = autoRotate && !rm && !dragging && now - rig.lastInteract > 2.5;
      // eases in slowly, settles faster so an idle scene stops requesting frames soon
      rig.swayAmp = step.approach(rig.swayAmp, swaying ? 0.32 : 0, swaying ? 0.8 : 1.6);
      if (swaying) rig.sway += dt * 0.22;
      if (rig.swayAmp > 1e-4) step.markMoving();

      let ty = view.targetY;
      let tz = view.targetZ;
      let distScale = 1;
      let elOffset = 0;
      if (variant === 'xray') {
        // keep the whole (possibly exploded) stack framed
        ty = (totalH + (count - 1) * LAYER_GAP * e) / 2 + 0.05;
        tz = -((count - 1) * BACK_SHIFT * e) / 2;
        distScale = 0.92 + 0.08 * e;
      }
      if (focus) {
        // dolly in towards the chosen layer, a touch lower so its edge reads
        ty = focus.y;
        tz = focus.z;
        distScale = rig.portrait ? 0.9 : 0.78;
        elOffset = 0.04;
      }
      rig.target.y = step.approach(rig.target.y, ty, 7);
      rig.target.z = step.approach(rig.target.z, tz, 7);
      rig.distScale = step.approach(rig.distScale, distScale, 7);
      rig.elOffset = step.approach(rig.elOffset, elOffset, 7);

      const az = rig.azimuth + Math.sin(rig.sway) * rig.swayAmp;
      const el = clamp(rig.elevation + rig.elOffset, ELEVATION_MIN, ELEVATION_MAX);
      const dist = rig.fitDist * rig.distScale;
      lookTarget.copy(rig.target);
      camera.position.set(
        lookTarget.x + Math.sin(az) * Math.cos(el) * dist,
        lookTarget.y + Math.sin(el) * dist,
        lookTarget.z + Math.cos(az) * Math.cos(el) * dist,
      );
      camera.lookAt(lookTarget);
      return dist;
    },
  };
}
