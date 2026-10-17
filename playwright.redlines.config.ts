import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * End-to-end tests for BRINK: Red Lines (VITE_GAME=redlines): a Pixel-7-like phone at 390 x 844 and a
 * desktop window, both in Chromium (e2e/redlines.spec.ts). Tests tagged @desktop run only on the
 * desktop project; the rest only on the phone.
 *
 * By default the tests run against a production build with the window.__redlines hook compiled in
 * (VITE_REDLINES_HOOK=1), served by `vite preview`: what ships is what is tested. REDLINES_E2E_DEV=1
 * runs them against the dev server instead, for quick iteration.
 *
 * Only Chromium is configured: it is the one browser installed in this sandbox.
 */
// REDLINES_E2E_PORT picks another port when 4610 is taken (another server, a parallel run).
const PORT = Number(process.env.REDLINES_E2E_PORT ?? 4610);
const DEV = process.env.REDLINES_E2E_DEV === '1';
const OUT = 'dist-redlines-e2e';
// Local sandboxes may carry a pre-installed Chromium at a fixed path; CI installs its own.
const localChromium = process.env.PW_CHROMIUM_PATH ?? (!process.env.CI && existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const launchOptions = localChromium ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'redlines.spec.ts',
  timeout: 150_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // The production build registers a service worker; tests always talk to the server.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'redlines-phone',
      grepInvert: /@desktop/,
      use: {
        ...devices['Pixel 7'],
        // The spec's phone: the 390 x 844 frame at 3x.
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        launchOptions,
      },
    },
    {
      name: 'redlines-desktop',
      grep: /@desktop/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        launchOptions,
      },
    },
  ],
  webServer: {
    command: DEV
      ? `npx vite --port ${PORT} --strictPort`
      : `npx vite build --outDir ${OUT} --emptyOutDir --logLevel warn && npx vite preview --outDir ${OUT} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_GAME: 'redlines',
      VITE_REDLINES_HOOK: '1',
      BRINK_BASE: './',
    },
  },
});
