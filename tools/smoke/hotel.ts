/**
 * Hotel smoke: plays the first night and tonight through the real screens against a served
 * build, screenshots every hotel screen and prints the share text. Not a test; a look.
 *
 *   BRINK_CONTENT_DIR=content-hotel npx vite build --outDir dist-hotel
 *   npx vite preview --outDir dist-hotel --port 4180 &
 *   npx tsx tools/smoke/hotel.ts            # shots under docs/playtests/hotel/shots
 */
import { chromium, devices, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

const BASE = process.env.BRINK_URL ?? 'http://localhost:4180';
const OUT = process.env.BRINK_SHOTS ?? 'docs/playtests/hotel/shots';
const exe = process.env.PW_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const ENDED = /^Copy result$/;

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`shot ${name}`);
}

async function playToEnd(page: Page, pick: 'left' | 'right' | 'alternate' = 'alternate', maxSteps = 400): Promise<number> {
  let step = 0;
  let taps = 0;
  while (step < maxSteps) {
    step++;
    if (await page.getByRole('button', { name: ENDED }).first().isVisible().catch(() => false)) return taps;
    const overlay = page.getByRole('dialog');
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      continue;
    }
    const left = page.getByRole('button', { name: /^Left:/ });
    const right = page.getByRole('button', { name: /^Right:/ });
    if (await left.isVisible().catch(() => false)) {
      const side = pick === 'alternate' ? (step % 2 ? 'left' : 'right') : pick;
      const btn = side === 'left' ? left : right;
      if (await btn.isEnabled().catch(() => false)) {
        await btn.click();
        taps++;
        await page.waitForTimeout(200);
        continue;
      }
    }
    await page.waitForTimeout(150);
  }
  throw new Error('the night did not end within the step budget');
}

async function clipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText()).catch(() => '(clipboard unavailable)');
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE', m.text());
  });
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'BRINK' }).waitFor();
  await shot(page, '01-home-first-open');

  // The first night: CLOCK IN → The Swan, gently.
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.getByRole('button', { name: /^Right:/ }).waitFor();
  await shot(page, '02-desk-first-card');
  await page.getByRole('button', { name: /^Right:/ }).hover();
  await page.waitForTimeout(200);
  await shot(page, '03-desk-preview');
  await page.getByRole('button', { name: /^Right:/ }).click();
  await page.waitForTimeout(500);
  await shot(page, '04-desk-reply');
  const taps1 = await playToEnd(page, 'alternate');
  await page.waitForTimeout(800);
  await shot(page, '05-review-first-night');
  const card1 = page.locator('img[alt="Share card"]');
  if (await card1.isVisible().catch(() => false)) await card1.screenshot({ path: `${OUT}/05b-share-card-first-night.png` });
  await page.getByRole('button', { name: 'Copy result' }).click();
  console.log(`first night: ${taps1} taps\n${await clipboard(page)}\n`);

  // Home, state two: tonight is waiting.
  await page.getByRole('button', { name: /^(← HOME|Home)/ }).first().click();
  await page.getByText(/TONIGHT · #\d+/).waitFor();
  await shot(page, '06-home-tonight');
  await page.getByRole('button', { name: 'Answer it' }).click();
  await page.getByRole('button', { name: /^Right:/ }).waitFor();
  await page.getByRole('button', { name: /^Right:/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Home/ }).first().click();
  await page.getByText(/TONIGHT · #\d+/).waitFor();
  await shot(page, '07-home-tonight-saved');
  await page.getByRole('button', { name: /Pick the phone back up/ }).click();
  const taps2 = await playToEnd(page, 'right');
  await page.waitForTimeout(800);
  await shot(page, '08-review-tonight');
  const card2 = page.locator('img[alt="Share card"]');
  if (await card2.isVisible().catch(() => false)) await card2.screenshot({ path: `${OUT}/08b-share-card-tonight.png` });
  await page.getByRole('button', { name: 'Copy result' }).click();
  console.log(`tonight: ${taps2 + 1} taps\n${await clipboard(page)}\n`);

  // Home, state three: today's review; then the Guest Book.
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByText(/TOMORROW'S NIGHT IN/).waitFor();
  await shot(page, '09-home-review');
  await page.getByRole('button', { name: /Guest Book/ }).click();
  await page.getByRole('heading', { name: 'Guest Book' }).waitFor();
  await shot(page, '10-guest-book');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
