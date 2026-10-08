import type { FrameStep } from './types';

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
export const smooth01 = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** One frame's stepping context (see FrameStep). */
export function createFrameStep(dt: number, now: number, reducedMotion: boolean): FrameStep {
  let moving = false;
  return {
    dt,
    now,
    reducedMotion,
    // Reports "still moving" by distance to the target, not by step size, so a
    // short or duplicated frame can never stall an animation.
    approach(cur, target, lambda, eps = 1e-3) {
      const next = reducedMotion ? target : damp(cur, target, lambda, dt);
      if (Math.abs(target - next) > eps) moving = true;
      else return target;
      return next;
    },
    settle(cur, next, eps = 1e-4) {
      if (Math.abs(next - cur) > eps) moving = true;
      return next;
    },
    markMoving() {
      moving = true;
    },
    get moving() {
      return moving;
    },
  };
}
