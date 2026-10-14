// Renders an art page to PNG with the pre-installed Chromium (never runs a browser download).
// usage: node docs/war/art/tools/render.mjs <page.html> <out.png> [width=390] [height=844] [dpr=3] [waitMs=400]
// The page sets window.__ready = true when its canvas work is done; we wait for it (up to 15 s).
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const [, , file, out, w = '390', h = '844', dpr = '3', wait = '400'] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
await page.goto('file://' + resolve(file));
await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => errors.push('page never set __ready'));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.join('\n'));
  process.exitCode = 1;
}
console.log('wrote ' + out);
