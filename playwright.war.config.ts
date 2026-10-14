import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * End-to-end tests for the war room (VITE_GAME=war) on a phone-sized Chromium.
 *
 * By default the tests run against a production build with the window.__war hook compiled in
 * (VITE_WAR_HOOK=1), served by `vite preview`: what ships is what is tested. WAR_E2E_DEV=1 runs
 * them against the dev server instead, for quick iteration.
 *
 * Only Chromium is configured: it is the one browser installed in this sandbox. The determinism
 * test is written to run unchanged under WebKit and Firefox projects when those are available.
 */
// WAR_E2E_PORT picks another port when 4180 is taken (another server, a parallel run).
const PORT = Number(process.env.WAR_E2E_PORT ?? 4180);
const DEV = process.env.WAR_E2E_DEV === '1';
const OUT = 'dist-war-e2e';
// Local sandboxes may carry a pre-installed Chromium at a fixed path; CI installs its own.
const localChromium = process.env.PW_CHROMIUM_PATH ?? (!process.env.CI && existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'war.spec.ts',
  timeout: 120_000,
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
      name: 'war',
      use: {
        ...devices['Pixel 7'],
        launchOptions: localChromium ? { executablePath: localChromium } : {},
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
      VITE_GAME: 'war',
      VITE_WAR_HOOK: '1',
      BRINK_BASE: './',
    },
  },
});
