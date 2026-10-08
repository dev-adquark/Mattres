import { describe, expect, it } from 'vitest';
import { isSoftwareRenderer } from '@/lib/deviceTier';
import { createCameraController } from './cameraController';
import { AMBIENT_WINDOW_S, createAmbientBudget, createFrameWatchdog } from './frameBudget';
import { createFrameStep } from './math';

/**
 * Mirrors the stage's per-frame decision for an untouched hero scene with
 * auto-rotate and dust: ambient motion is gated by the budget, so the loop
 * must report "not moving" a few seconds after load and stay idle.
 */
function simulateIdleHero(seconds: number, withDust: boolean): { stoppedAt: number | null } {
  const cam = createCameraController('hero');
  cam.fit(1350, 940, 0);
  const ambient = createAmbientBudget();
  const dt = 1 / 60;
  let time = 0;
  let stoppedAt: number | null = null;
  for (let i = 0; i < seconds * 60; i++) {
    time += dt;
    const step = createFrameStep(dt, time, false);
    const ambientOn = ambient.allows(time);
    cam.update(step, { explode: 0, focus: null, totalH: 1, count: 4, autoRotate: ambientOn, dragging: false });
    if (withDust && ambientOn) step.markMoving();
    if (!step.moving) {
      stoppedAt = time;
      break;
    }
  }
  return { stoppedAt };
}

describe('ambient budget', () => {
  it('allows ambient motion only inside the window after the last real motion', () => {
    const b = createAmbientBudget(2);
    expect(b.allows(0.5)).toBe(true);
    expect(b.allows(2.1)).toBe(false);
    b.touch(3);
    expect(b.allows(4.9)).toBe(true);
    expect(b.allows(5.1)).toBe(false);
  });

  it('lets an untouched auto-rotating hero with dust go idle within ~10 s', () => {
    const { stoppedAt } = simulateIdleHero(30, true);
    expect(stoppedAt).not.toBeNull();
    expect(stoppedAt!).toBeGreaterThan(AMBIENT_WINDOW_S);
    expect(stoppedAt!).toBeLessThan(10);
  });

  it('never keeps the loop alive with dust alone', () => {
    const { stoppedAt } = simulateIdleHero(30, true);
    const noDust = simulateIdleHero(30, false);
    expect(stoppedAt).toBe(noDust.stoppedAt);
  });
});

describe('frame watchdog', () => {
  it('passes a 60 fps scene after skipping the warm-up frames', () => {
    const w = createFrameWatchdog();
    [400, 300, 120].forEach((ms) => w.record(ms));
    for (let i = 0; i < 8; i++) w.record(16.7);
    expect(w.verdict).toBe('ok');
  });

  it('flags a software-rendered scene (~275 ms frames)', () => {
    const w = createFrameWatchdog();
    let v = w.verdict;
    for (let i = 0; i < 11; i++) v = w.record(275 + (i % 3) * 20);
    expect(v).toBe('slow');
  });

  it('tolerates a few hydration hiccups', () => {
    const w = createFrameWatchdog();
    const frames = [500, 200, 90, 16, 17, 140, 16, 18, 120, 16, 17];
    frames.forEach((ms) => w.record(ms));
    expect(w.verdict).toBe('ok');
  });

  it('stays pending until enough frames are seen', () => {
    const w = createFrameWatchdog();
    for (let i = 0; i < 10; i++) w.record(300);
    expect(w.verdict).toBe('pending');
  });
});

describe('isSoftwareRenderer', () => {
  it('recognises CPU rasterisers', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)')).toBe(true);
  });

  it('keeps hardware GPUs', () => {
    expect(isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe(false);
    expect(isSoftwareRenderer('Apple GPU')).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
});
