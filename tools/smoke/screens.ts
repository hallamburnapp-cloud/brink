/**
 * Screenshot the secondary screens (record, endings, about, paywall, seat picker) against
 * the built app (`npm run build` first): a visual check, no assertions.
 *
 *   npx tsx tools/smoke/screens.ts            → playtest-output/screens/*.png
 */
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const PORT = 4191;
const OUT = 'playtest-output/screens';
mkdirSync(OUT, { recursive: true });
const vite = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const exe = process.env.PW_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (let i = 0; i < 40; i++) {
    try {
      await page.goto(`http://localhost:${PORT}/`, { timeout: 2000 });
      break;
    } catch {
      await wait(500);
    }
  }
  await page.getByRole('heading', { name: 'BRINK' }).waitFor();
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Record' }).click();
  await wait(200);
  await shot('record');
  await page.getByRole('button', { name: '← HOME' }).click();
  await page.getByRole('button', { name: /Endings \d+\/\d+/ }).click();
  await wait(200);
  await shot('endings');
  await page.getByRole('button', { name: '← HOME' }).click();
  await page.getByRole('button', { name: 'About' }).click();
  await wait(200);
  await shot('about');
  await page.getByRole('button', { name: '← HOME' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await wait(200);
  await shot('settings');
  await page.getByRole('button', { name: '← HOME' }).click();
  await page.getByRole('button', { name: 'CHOOSE A SEAT OR SEED' }).click();
  await wait(200);
  await shot('seat-night');
  await page.getByRole('tab', { name: 'EXPERT' }).click();
  await wait(200);
  await shot('seat-expert');
  await page.getByRole('button', { name: '← HOME' }).click();
  // The paywall: reachable in this build only through the dawn screen when paywalled; render it by hash route if the app supports it, else skip.
  await page.goto(`http://localhost:${PORT}/privacy`);
  await page.getByText(/What is stored/).waitFor().catch(() => {});
  await shot('privacy');
  await browser.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      if (vite.pid) process.kill(-vite.pid, 'SIGTERM');
    } catch {
      vite.kill();
    }
    setTimeout(() => process.exit(), 300).unref();
  });
