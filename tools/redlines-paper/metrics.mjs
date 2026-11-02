#!/usr/bin/env node
/**
 * Measures the three self-hosted faces of the paper look (public/redlines/fonts) in a real browser and
 * writes src/redlines/ui/paper/metrics.ts: for every character the hand, the typewriter and the printed
 * sheet may set, its advance and its ink box (left, right, above and below the baseline) in em. The
 * marks (marks.ts) place words and counters against these boxes, so a word is kept off a printed name
 * by the glyphs' real ascenders and descenders, not by a guess.
 *
 * usage: npm run dev:redlines -- --port <port> --strictPort   (in another shell)
 *        node tools/redlines-paper/metrics.mjs http://localhost:<port>/
 */
import { writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/';
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
await page.goto(url);
const FACES = {
  hand: "700 100px 'Caveat'",
  type: "400 100px 'Special Elite'",
  print: "400 100px 'Gelasio'",
  printBold: "700 100px 'Gelasio'",
};
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '-.,:·?!";
const out = await page.evaluate(
  async ({ faces, chars }) => {
    for (const f of Object.values(faces)) await document.fonts.load(f, chars);
    await document.fonts.ready;
    const c = document.createElement('canvas').getContext('2d');
    const res = {};
    for (const [name, font] of Object.entries(faces)) {
      c.font = font;
      const table = {};
      for (const ch of chars) {
        const m = c.measureText(ch);
        const r = (v) => Math.round(v * 10) / 1000;
        table[ch] = [r(m.width), r(m.actualBoundingBoxLeft), r(m.actualBoundingBoxRight), r(m.actualBoundingBoxAscent), r(m.actualBoundingBoxDescent)];
      }
      res[name] = { loaded: document.fonts.check(font, 'A'), table };
    }
    return res;
  },
  { faces: FACES, chars: CHARS },
);
await browser.close();
for (const [k, v] of Object.entries(out)) if (!v.loaded) throw new Error(`${k} did not load`);

const lines = [
  '/**',
  ' * The paper look\'s three faces, measured in a browser by tools/redlines-paper/metrics.mjs (do not edit by hand):',
  ' * per character [advance, ink left of the pen, ink right of the pen, ink above the baseline, ink below it], in em.',
  ' * hand: Caveat 700 (WE DEFEND, TESTED); type: Special Elite (the counters\' labels, the stamps); print: Gelasio',
  ' * 400 and 700 (the printed names and the bloc titles).',
  ' */',
  "export type Face = 'hand' | 'type' | 'print' | 'printBold';",
  'export type Glyph = readonly [number, number, number, number, number];',
  'export const GLYPHS: Record<Face, Record<string, Glyph>> = {',
];
for (const [face, v] of Object.entries(out)) {
  lines.push(`  ${face}: {`);
  for (const [ch, g] of Object.entries(v.table)) lines.push(`    ${JSON.stringify(ch)}: [${g.join(', ')}],`);
  lines.push('  },');
}
lines.push('};', '');
writeFileSync(new URL('../../src/redlines/ui/paper/metrics.ts', import.meta.url), lines.join('\n'));
console.log('wrote src/redlines/ui/paper/metrics.ts');
