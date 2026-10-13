// Render a local HTML file to PNG with the pre-installed Chromium.
// usage: node render.mjs <file.html> <out.png> [width=390] [height=844] [dpr=2] [waitMs=600]
// The page may set window.__ready = true when its canvas work is done; we wait for it (up to 15 s).
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
const [, , file, out, w = '390', h = '844', dpr = '2', wait = '600'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + resolve(file));
await page.waitForFunction(() => (window).__ready === true, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
console.log('wrote ' + out);
