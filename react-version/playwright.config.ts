import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite (npm run test:e2e). Runs against a production server
 * (`next start` on port 3790, see e2e/serve.mjs) in three projects:
 *   desktop         1440x900 Chromium, mouse + keyboard
 *   mobile          390x844 touch (iPhone-class viewport, Chromium engine)
 *   reduced-motion  1440x900 with prefers-reduced-motion: reduce
 * Results go to .next-e2e-results/ (covered by the .next-* gitignore rule).
 */
const PORT = Number(process.env.E2E_PORT || 3790);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const webgl = { args: ['--use-angle=metal', '--ignore-gpu-blocklist'] };

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: './.next-e2e-results',
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: webgl,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: webgl },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        launchOptions: webgl,
      },
      // The compare-header width sweep sets its own viewports; it runs once, in desktop.
      testIgnore: '**/compare-header.spec.ts',
    },
    {
      name: 'reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
        launchOptions: webgl,
      },
      testIgnore: '**/compare-header.spec.ts',
    },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `${BASE_URL}/api/search-index`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { E2E_PORT: String(PORT) },
  },
});
