// Playwright webServer entry: `next start` on the E2E port against an existing
// production build. Order of preference for the build directory:
//   1. E2E_DIST_DIR (explicit), else
//   2. the shared `.next` when it holds a finished build, else
//   3. `.next-e2e`, built here first if missing (never clobbers `.next`).
// Set E2E_REBUILD=1 to force a fresh build into `.next-e2e`.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.E2E_PORT || '3790';
const nextBin = join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const built = (dir) => existsSync(join(appRoot, dir, 'BUILD_ID'));

let dist = process.env.E2E_DIST_DIR;
if (!dist) {
  if (process.env.E2E_REBUILD === '1') dist = '.next-e2e';
  else dist = built('.next') ? '.next' : '.next-e2e';
}

if (!built(dist) || (process.env.E2E_REBUILD === '1' && dist === '.next-e2e')) {
  console.log(`[e2e] building into ${dist} ...`);
  const res = spawnSync(process.execPath, [nextBin, 'build'], {
    cwd: appRoot,
    stdio: 'inherit',
    env: { ...process.env, NEXT_DIST_DIR: dist },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

console.log(`[e2e] next start -p ${port} (dist: ${dist})`);
const child = spawn(process.execPath, [nextBin, 'start', '-p', port], {
  cwd: appRoot,
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: dist },
});
const stop = () => child.kill('SIGTERM');
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', (code) => process.exit(code ?? 0));
