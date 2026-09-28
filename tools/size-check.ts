/**
 * Initial-JS budget check for the production build.
 *
 * Reads dist/index.html, collects the JavaScript it loads up-front (every
 * <script type="module" src> and <link rel="modulepreload" href>), drops the
 * lazily-loaded manual chunks (content / audio / share, see vite.config.ts) and
 * sums their gzip sizes. Fails when the total exceeds the budget (250 KB gzipped).
 * Prints a table of every file in dist with raw and gzip sizes.
 *
 * CLI: npm run size  [-- --limit 250] [--dist dist]
 * Exit codes: 0 within budget, 1 over budget or dist missing.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const DEFAULT_LIMIT_KB = 250;
/** Manual chunks that load after first paint and therefore do not count. */
export const DEFERRED_CHUNKS = /^(content|audio|share)(?:[-.][\w-]*)?\.js$/i;

export interface AssetRow {
  file: string;
  raw: number;
  gzip: number;
  initial: boolean;
  deferred: boolean;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/** Script/modulepreload URLs referenced by index.html, resolved to paths inside dist. */
export function initialScripts(html: string): string[] {
  const urls: string[] = [];
  const scriptRe = /<script\b[^>]*\btype\s*=\s*["']module["'][^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const scriptRe2 = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*\btype\s*=\s*["']module["'][^>]*>/gi;
  const preloadRe = /<link\b[^>]*\brel\s*=\s*["']modulepreload["'][^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const preloadRe2 = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']modulepreload["'][^>]*>/gi;
  for (const re of [scriptRe, scriptRe2, preloadRe, preloadRe2]) {
    for (let m: RegExpExecArray | null; (m = re.exec(html)); ) urls.push(m[1]);
  }
  return [...new Set(urls)]
    .filter((u) => !/^(https?:)?\/\//i.test(u) && !u.startsWith('data:'))
    .map((u) => u.replace(/^\.?\//, '').replace(/[?#].*$/, ''));
}

function fmt(bytes: number): string {
  return (bytes / 1024).toFixed(1).padStart(8) + ' KB';
}

export function analyse(distDir: string): { rows: AssetRow[]; initialGzip: number; initialRaw: number } {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const initial = new Set(initialScripts(html).map((u) => u.split('/').join('/')));
  const rows: AssetRow[] = walk(distDir)
    .map((p) => {
      const rel = relative(distDir, p).split('\\').join('/');
      const data = readFileSync(p);
      const isJs = /\.m?js$/i.test(rel);
      const deferred = isJs && DEFERRED_CHUNKS.test(basename(rel));
      return {
        file: rel,
        raw: data.length,
        gzip: gzipSync(data, { level: 9 }).length,
        initial: isJs && initial.has(rel) && !deferred,
        deferred,
      };
    })
    .sort((a, b) => b.gzip - a.gzip);
  const initialRows = rows.filter((r) => r.initial);
  return {
    rows,
    initialGzip: initialRows.reduce((s, r) => s + r.gzip, 0),
    initialRaw: initialRows.reduce((s, r) => s + r.raw, 0),
  };
}

function main() {
  const distDir = resolve(ROOT, arg('--dist') ?? 'dist');
  const limitKb = Number(arg('--limit') ?? DEFAULT_LIMIT_KB);
  const limit = limitKb * 1024;

  if (!existsSync(join(distDir, 'index.html'))) {
    console.error(`[size] ${relative(ROOT, distDir) || '.'}/index.html not found. Run \`npm run build\` first.`);
    process.exit(1);
  }
  if (!statSync(distDir).isDirectory()) {
    console.error(`[size] ${distDir} is not a directory`);
    process.exit(1);
  }

  const { rows, initialGzip, initialRaw } = analyse(distDir);
  const width = Math.max(4, ...rows.map((r) => r.file.length));
  console.log(`\n${'file'.padEnd(width)}  ${'raw'.padStart(11)}  ${'gzip'.padStart(11)}  role`);
  console.log('-'.repeat(width + 2 + 11 + 2 + 11 + 2 + 8));
  for (const r of rows) {
    const role = r.initial ? 'initial' : r.deferred ? 'deferred' : '';
    console.log(`${r.file.padEnd(width)}  ${fmt(r.raw)}  ${fmt(r.gzip)}  ${role}`);
  }
  console.log('-'.repeat(width + 2 + 11 + 2 + 11 + 2 + 8));
  const total = rows.reduce((s, r) => s + r.raw, 0);
  console.log(`${'all files'.padEnd(width)}  ${fmt(total)}  ${fmt(rows.reduce((s, r) => s + r.gzip, 0))}`);
  console.log(`${'initial JS'.padEnd(width)}  ${fmt(initialRaw)}  ${fmt(initialGzip)}  budget ${limitKb} KB gzip`);

  const initialCount = rows.filter((r) => r.initial).length;
  if (initialCount === 0) {
    console.error('\n[size] FAIL: no initial JS found in index.html (build output unexpected?)');
    process.exit(1);
  }
  if (initialGzip > limit) {
    console.error(`\n[size] FAIL: initial JS is ${(initialGzip / 1024).toFixed(1)} KB gzipped, over the ${limitKb} KB budget by ${((initialGzip - limit) / 1024).toFixed(1)} KB`);
    process.exit(1);
  }
  console.log(`\n[size] OK: initial JS ${(initialGzip / 1024).toFixed(1)} KB gzipped across ${initialCount} file(s) (${((initialGzip / limit) * 100).toFixed(0)}% of budget)`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
