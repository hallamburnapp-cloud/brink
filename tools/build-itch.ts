/**
 * Builds the itch.io flavour of BRINK and zips it for upload.
 *
 *   VITE_FLAVOUR=itch VITE_ALL_UNLOCKED=1 VITE_PAYWALL=0 BRINK_BASE=./
 *   npx vite build --outDir dist-itch --base ./
 *   → dist-itch/brink-itch.zip  (store-method zip, index.html at the archive root)
 *
 * itch.io serves HTML5 games from a sandboxed sub-path, hence the relative base.
 * Exit codes: 0 on success, 1 when vite build or zipping fails (the vite output is
 * streamed through unchanged so the real error is visible).
 *
 * CLI: npm run build:itch   [-- --skip-build]   (--skip-build only re-zips dist-itch)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipDirectory } from './zip';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = 'dist-itch';
const ZIP_NAME = 'brink-itch.zip';

export const ITCH_ENV = {
  VITE_FLAVOUR: 'itch',
  VITE_ALL_UNLOCKED: '1',
  VITE_PAYWALL: '0',
  BRINK_BASE: './',
} as const;

function fmt(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function runViteBuild(): { ok: boolean; message: string } {
  const args = ['vite', 'build', '--outDir', OUT_DIR, '--base', './'];
  console.log(`[itch] ${Object.entries(ITCH_ENV).map(([k, v]) => `${k}=${v}`).join(' ')} npx ${args.join(' ')}`);
  const res = spawnSync('npx', args, {
    cwd: ROOT,
    env: { ...process.env, ...ITCH_ENV },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.error) return { ok: false, message: `could not start vite: ${res.error.message}` };
  if (res.status !== 0) return { ok: false, message: `vite build exited with code ${res.status ?? 'null'}${res.signal ? ` (signal ${res.signal})` : ''}` };
  return { ok: true, message: 'vite build ok' };
}

async function main() {
  const outDir = join(ROOT, OUT_DIR);
  const zipPath = join(outDir, ZIP_NAME);
  const skipBuild = process.argv.includes('--skip-build');

  if (!skipBuild) {
    await fs.rm(outDir, { recursive: true, force: true });
    const build = runViteBuild();
    if (!build.ok) {
      console.error(`\n[itch] BUILD FAILED: ${build.message}`);
      console.error('[itch] The vite error above is the cause; nothing was zipped.');
      process.exit(1);
    }
  }

  if (!existsSync(join(outDir, 'index.html'))) {
    console.error(`[itch] ${OUT_DIR}/index.html not found after build; refusing to zip an incomplete bundle.`);
    process.exit(1);
  }

  await fs.rm(zipPath, { force: true });
  const count = await zipDirectory(outDir, zipPath);
  const { size } = await fs.stat(zipPath);
  console.log(`\n[itch] ${OUT_DIR}/${ZIP_NAME}: ${count} files, ${fmt(size)} (store method, uncompressed)`);
  console.log('[itch] Upload at itch.io → your project → Edit → Uploads → "This file will be played in the browser".');
  console.log('[itch] Viewport: 430×860 portrait, or enable "Mobile friendly" + fullscreen button.');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('[itch] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
