/**
 * Contracts between MattressScene (React) and the imperative three.js stage
 * it owns. Type-only.
 */

import type { MattressType } from '@/lib/types';
import type { ExplodeValue, LayerIdCallback, MattressLayer, RevealMode, SceneQuality, SceneVariant } from '../types';

/**
 * Props the running stage reads every frame (through a ref, never captured),
 * so changing them never rebuilds the scene.
 */
export interface LiveSceneProps {
  layers: readonly MattressLayer[];
  explode: ExplodeValue | undefined;
  reveal: RevealMode;
  activeLayerId: string | null;
  highlightLayerId: string | null;
  /** When false the selected layer lifts and glows but the camera keeps the whole stack framed (no dolly). */
  focusCamera?: boolean;
  onLayerHover?: LayerIdCallback;
  onLayerSelect?: LayerIdCallback;
  onFocusSettled?: LayerIdCallback;
  onRevealed?: () => void;
  autoRotate: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  framePadBottom: number;
  onReady?: () => void;
  onError?: (err: Error) => void;
}

/** What the scene is built from; any change rebuilds it. */
export interface StageConfig {
  variant: SceneVariant;
  type: MattressType;
  quality: SceneQuality;
  background: string;
  showParticles: boolean;
}

/** Handle React keeps on the running stage. */
export interface StageApi {
  /** Schedule frames until the scene settles again. */
  wake(): void;
  /** Re-fit the camera if the host size or bottom padding changed. */
  sync(): void;
  /** Release every listener and GPU resource. */
  dispose(): void;
}

/**
 * Per-frame helper shared by the controllers: eased steps that record
 * whether anything is still moving, so the loop can stop when idle.
 */
export interface FrameStep {
  readonly dt: number;
  /** Elapsed scene time in seconds. */
  readonly now: number;
  readonly reducedMotion: boolean;
  /** Damped step towards target; reduced motion jumps straight there. */
  approach(current: number, target: number, lambda: number, eps?: number): number;
  /** Marks the frame as moving when next differs from current. */
  settle(current: number, next: number, eps?: number): number;
  /** Forces another frame. */
  markMoving(): void;
  readonly moving: boolean;
}
