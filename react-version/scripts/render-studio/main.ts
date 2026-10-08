/**
 * Studio page entry. scripts/render-stills.mts drives it through Playwright:
 *   await window.renderShot({ kind, type, colourway, samples, ... }) -> PNG data URL
 */
import * as THREE from 'three';
import { Accumulator } from './accumulator.js';
import { buildShot } from './shots.js';

const canvas = document.getElementById('c');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Render studio: missing <canvas id="c">');
const acc = new Accumulator(canvas);

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

window.renderShot = async (spec) => {
  const t0 = performance.now();
  const shot = buildShot(spec, acc.renderer);
  const t1 = performance.now();
  const url = await acc.render(shot, (done, total) => {
    window.__progress = `${done}/${total}`;
  });
  disposeScene(shot.scene);
  acc.renderer.renderLists.dispose();
  return { url, buildMs: Math.round(t1 - t0), renderMs: Math.round(performance.now() - t1) };
};
window.__studioReady = true;
