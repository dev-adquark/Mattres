/**
 * ExplodeController: how far apart the layers are. A number (0..1) is
 * applied directly, 'scroll' follows the stage's scroll position, and the
 * x-ray reveal ('view') holds the stack assembled until ~40% of the stage is
 * on screen (or a layer is chosen), then separates it over REVEAL_MS with an
 * ease-out-expo. Reduced motion: every change is applied instantly.
 */

import { REVEAL_MS, defaultExplode } from '../sceneConfig';
import type { SceneVariant } from '../types';
import { clamp, easeOutExpo } from './math';
import type { FrameStep, LiveSceneProps } from './types';

export interface ExplodeController {
  /** Current separation, 0..1. */
  readonly value: number;
  readonly revealed: boolean;
  /** The reveal threshold was crossed (the stage is ~40% visible). */
  markInView(): void;
  readonly inView: boolean;
  /** Advances the separation; returns true when it changed (shadows need re-rendering). */
  update(step: FrameStep, props: LiveSceneProps): boolean;
}

/**
 * @param scrollProgress 0..1 eased progress of the stage through the
 *   viewport, used when explode is 'scroll'.
 */
export function createExplodeController(
  variant: SceneVariant,
  initial: LiveSceneProps,
  scrollProgress: () => number,
): ExplodeController {
  const numeric = (p: LiveSceneProps): number => {
    const e = p.explode;
    if (typeof e === 'number' && Number.isFinite(e)) return clamp(e, 0, 1);
    return defaultExplode(variant);
  };
  const fromScroll = (p: LiveSceneProps): number => (p.reducedMotion ? (variant === 'xray' ? 0.7 : 0) : scrollProgress());
  // The x-ray reveal waits for the viewer to be seen; everything else applies at once.
  const gated = (p: LiveSceneProps): boolean => variant === 'xray' && p.explode !== 'scroll' && p.reveal === 'view';

  let revealed = !gated(initial);
  let inView = false;
  let startT = -1;
  let from = 0;
  let value = initial.explode === 'scroll' ? fromScroll(initial) : revealed ? numeric(initial) : 0;

  return {
    get value() {
      return value;
    },
    get revealed() {
      return revealed;
    },
    get inView() {
      return inView;
    },
    markInView() {
      inView = true;
    },
    update(step, props) {
      // a chosen layer reveals immediately
      if (!revealed && (props.activeLayerId || !gated(props) || inView)) {
        revealed = true;
        startT = step.now;
        from = value;
        props.onRevealed?.();
      }
      const prev = value;
      if (props.explode === 'scroll') {
        value = step.approach(value, fromScroll(props), 5);
      } else if (!revealed) {
        value = step.settle(value, 0);
      } else {
        const target = numeric(props);
        const since = (step.now - startT) * 1000;
        if (!step.reducedMotion && startT >= 0 && since < REVEAL_MS) {
          value = from + (target - from) * easeOutExpo(since / REVEAL_MS);
          step.markMoving();
        } else {
          value = step.approach(value, target, 6);
        }
      }
      return Math.abs(value - prev) > 1e-5;
    },
  };
}
