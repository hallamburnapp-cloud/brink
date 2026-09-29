import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const PORT = 4190; const OUT = process.argv[2] ?? '/home/user/brink/playtest-output/night'; mkdirSync(OUT, { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: '/home/user/brink', stdio: 'ignore', env: { ...process.env, VITE_PAYWALL: 'false' } });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(4000);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/`); await page.waitForSelector('text=Play tonight');
  await page.screenshot({ path: `${OUT}/01-home.png` });
  await page.getByRole('button', { name: 'Play tonight' }).click();
  await wait(800); await page.screenshot({ path: `${OUT}/02-intro.png` });
  const intro = page.getByRole('dialog', { name: 'How this works' }); if (await intro.isVisible().catch(() => false)) await intro.getByRole('button').click();
  await wait(1600); await page.screenshot({ path: `${OUT}/03-first-card.png` });
  let shots = 3; let step = 0; let crisisShot = false;
  while (step < 80) {
    step++;
    if (await page.getByRole('button', { name: /Copy result/ }).isVisible().catch(() => false)) break;
    const dialog = page.getByRole('dialog'); if (await dialog.isVisible().catch(() => false)) { await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {}); continue; }
    const btn = page.getByRole('button', { name: step % 2 ? /^Left:/ : /^Right:/ });
    if (!(await btn.isVisible().catch(() => false))) { await wait(300); continue; }
    if (!crisisShot && (await page.getByText('THE CRISIS').first().isVisible().catch(() => false))) { crisisShot = true; await page.screenshot({ path: `${OUT}/0${++shots}-crisis.png` }); }
    if (step === 6) await page.screenshot({ path: `${OUT}/0${++shots}-mid.png` });
    await btn.click({ timeout: 5000 }).catch(() => {}); await wait(900);
  }
  await wait(800); await page.screenshot({ path: `${OUT}/0${++shots}-ending.png`, fullPage: true });
  const clock = await page.locator('.clock').first().innerText().catch(() => '');
  const head = await page.locator('h2').first().innerText().catch(() => '');
  await page.getByRole('button', { name: 'Home' }).click(); await wait(600); await page.screenshot({ path: `${OUT}/0${++shots}-home-after.png` });
  console.log(JSON.stringify({ steps: step, ending: head, clock, errors: errors.slice(0, 5) }));
  await browser.close(); vite.kill(); setTimeout(() => process.exit(0), 300);
})().catch((e) => { console.error(e); vite.kill(); process.exit(1); });
