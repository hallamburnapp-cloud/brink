import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Test-only signing key pair for the stubbed unlock Worker (never used in production).
const keys = JSON.parse(readFileSync(new URL('./e2e/fixtures/test-keys.json', import.meta.url), 'utf8')) as { publicJwkB64: string };

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_PAYWALL: 'true',
      VITE_UNLOCK_WORKER_URL: 'http://unlock.test',
      VITE_UNLOCK_PUBLIC_KEY: keys.publicJwkB64,
      VITE_STRIPE_PAYMENT_LINK: 'https://buy.stripe.com/test_link',
      VITE_ANALYTICS: 'off',
    },
  },
});
