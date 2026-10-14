// Copies src/war/content/map.json into ../lib/map-data.js so the art pages work from file://
// (a file:// page cannot fetch JSON). Run from anywhere: node docs/war/art/tools/map-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../../../src/war/content/map.json');
const out = resolve(here, '../lib/map-data.js');
const data = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync(
  out,
  '// Generated from src/war/content/map.json by docs/war/art/tools/map-data.mjs. Do not edit by hand.\n' +
    `window.WAR_MAP = ${JSON.stringify(data)};\n`,
);
console.log(`wrote ${out} (${data.regions.length} regions)`);
