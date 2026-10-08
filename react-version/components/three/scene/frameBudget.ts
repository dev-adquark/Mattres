/**
 * Frame-loop budgets for the stage, kept pure so they can be unit tested.
 *
 *  - Ambient budget: idle sway and drifting dust are decoration. They may run
 *    only for a short window after the last real motion (reveal, explode,
 *    layer focus, drag, inertia), so a page left alone goes fully idle and
 *    stops requesting frames.
 *  - Ambient frame rate: while only ambient motion is running, frames are
 *    rendered at about 30 fps instead of the display rate.
 *  - Watchdog: times the first frames; if the median frame is slower than
 *    ~50 ms (software WebGL, an overloaded GPU) the scene gives up and the
 *    viewer falls back to the static poster.
 */

/** Seconds of ambient motion allowed after the last real motion. */
export const AMBIENT_WINDOW_S = 4.5;
/** Minimum milliseconds between rendered frames while only ambient motion runs (~30 fps). */
export const AMBIENT_FRAME_MS = 1000 / 30 - 2;

export interface AmbientBudget {
  /** Records real (non-ambient) motion or interaction at scene time `now` (seconds). */
  touch(now: number): void;
  /** Whether ambient motion may still run at scene time `now`. */
  allows(now: number): boolean;
}

/** Scene time starts at 0, so a new stage gets one ambient window after its first frame. */
export function createAmbientBudget(windowS: number = AMBIENT_WINDOW_S): AmbientBudget {
  let lastActive = 0;
  return {
    touch(now) {
      lastActive = now;
    },
    allows(now) {
      return now - lastActive < windowS;
    },
  };
}

export type WatchdogVerdict = 'pending' | 'ok' | 'slow';

export interface FrameWatchdogOptions {
  /** Leading frames to ignore (shader compilation, hydration). */
  skip?: number;
  /** Frames to sample after the skipped ones. */
  samples?: number;
  /** Median frame time above which the scene is too slow, in ms. */
  maxMedianMs?: number;
}

export interface FrameWatchdog {
  /** Records one frame's cost in ms; returns the verdict, which never changes once decided. */
  record(ms: number): WatchdogVerdict;
  readonly verdict: WatchdogVerdict;
}

export function createFrameWatchdog({ skip = 3, samples = 8, maxMedianMs = 50 }: FrameWatchdogOptions = {}): FrameWatchdog {
  const buf: number[] = [];
  let seen = 0;
  let verdict: WatchdogVerdict = 'pending';
  return {
    record(ms) {
      if (verdict !== 'pending') return verdict;
      seen += 1;
      if (seen <= skip || !Number.isFinite(ms)) return verdict;
      buf.push(ms);
      if (buf.length >= samples) {
        const s = [...buf].sort((a, b) => a - b);
        const lo = s[(samples - 1) >> 1] ?? 0;
        const hi = s[samples >> 1] ?? 0;
        verdict = (lo + hi) / 2 > maxMedianMs ? 'slow' : 'ok';
      }
      return verdict;
    },
    get verdict() {
      return verdict;
    },
  };
}
