// usage: node render.mjs <fragment.html> <out.png> [fonts|nofonts]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, frag, out, mode='fonts'] = process.argv;
const body = fs.readFileSync(frag, 'utf8');
const local = fs.readFileSync('/tmp/claude-0/-home-user/8a83eba3-4efc-53f8-a9ad-433378148d32/scratchpad/paperbuild/fonts/local.css','utf8');
const style = mode === 'fonts' ? `<style>${local}</style>` : '';
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390">${style}<style>html,body{margin:0;padding:0;background:#333}</style></head><body>${body}</body></html>`;
const wrap = out.replace(/\.png$/, '.wrap.html');
fs.writeFileSync(wrap, html);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('file://' + wrap, { waitUntil: 'load' });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.waitForTimeout(500);
const fontsLoaded = await page.evaluate(() => [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+':'+f.weight));
const over = await page.evaluate(() => {
  const root = document.body.firstElementChild; const rb = root.getBoundingClientRect();
  const bad = [];
  root.querySelectorAll('*').forEach(el => {
    if (el.closest('svg') && el.tagName !== 'svg') return;
    const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return;
    if (r.left < rb.left - 0.5 || r.right > rb.right + 0.5 || r.top < rb.top - 0.5 || r.bottom > rb.bottom + 0.5)
      bad.push(`${el.tagName}.${(el.className && el.className.baseVal!==undefined? el.className.baseVal: el.className)||''} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
  });
  return { root: [rb.width, rb.height], scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], bad: bad.slice(0, 30) };
});
console.log(JSON.stringify({fontsLoaded, ...over}));
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 390, height: 844 } });
await browser.close();
fs.unlinkSync(wrap);
