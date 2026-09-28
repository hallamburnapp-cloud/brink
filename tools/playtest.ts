/**
 * Playtest harness: drives the real game in a mobile Chromium through the DOM,
 * using only what a player sees (card text, choice text, odds %, preview dots,
 * meter bars), with a named decision style. Writes a full transcript and
 * screenshots so a run can be read back and judged for feel.
 *
 *   tsx tools/playtest.ts --style dove|hawk|balanced|gambler --seat republic --seed ABC --out playtest-output
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices, type Page } from '@playwright/test';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1] ?? '');
const style = (args.get('style') ?? 'balanced') as 'dove' | 'hawk' | 'balanced' | 'gambler';
const seat = args.get('seat') ?? 'republic';
const seed = args.get('seed') ?? `PT-${style.toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
const outDir = args.get('out') ?? 'playtest-output';
const port = Number(args.get('port') ?? 4175);
const difficulty = args.get('defcon') ?? '5';

const DOVE_WORDS = /talk|wait|call|pause|stand down|offer|hotline|ask|listen|withdraw|open|share|apolog|invite|delay|hold off|de-?escalat|quiet|back.?channel|accept|agree|restrain|reassur|publish|disclose|second radar/i;
const HAWK_WORDS = /strike|mobilis|board|deploy|send|refuse|reject|escalat|launch|attack|seize|blockade|intercept|retaliat|arm|alert|fire|package|surge|deny|expel|sanction|jam|hack|counter|shadow|warn/i;

function startVite(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: process.cwd(), env: { ...process.env, VITE_ANALYTICS: 'off' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let ready = false;
    const onData = (b: Buffer) => {
      const s = b.toString();
      if (!ready && /localhost:\d+/.test(s)) {
        ready = true;
        resolve(child);
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', (code) => {
      if (!ready) reject(new Error(`vite exited ${code}`));
    });
    setTimeout(() => {
      if (!ready) reject(new Error('vite did not start'));
    }, 60_000);
  });
}

interface Reading {
  speaker: string;
  text: string;
  left: string;
  right: string;
  leftOdds: number | null;
  rightOdds: number | null;
  meters: Record<string, number>;
  act: string;
  timer: boolean;
}

async function readCard(page: Page): Promise<Reading | null> {
  const card = page.getByRole('group', { name: /Card from/ });
  if (!(await card.isVisible().catch(() => false))) return null;
  const speaker = (await card.getAttribute('aria-label')) ?? '';
  const paras = await card.locator('.serif').allInnerTexts();
  const text = paras.length > 1 ? paras[1] : paras[0] ?? '';
  const left = await page.getByRole('button', { name: /^Left:/ }).getAttribute('aria-label');
  const right = await page.getByRole('button', { name: /^Right:/ }).getAttribute('aria-label');
  const odds = (s: string | null) => {
    const m = s?.match(/(\d+) percent/);
    return m ? Number(m[1]) : null;
  };
  const meters: Record<string, number> = {};
  for (const t of await page.locator('.meter-track').all()) {
    const title = (await t.getAttribute('title')) ?? '';
    const m = title.match(/^(\w+) (\d+)$/);
    if (m) meters[m[1].toLowerCase()] = Number(m[2]);
  }
  const act = (await card.locator('.mono').last().innerText().catch(() => '')) ?? '';
  const timer = await page.getByRole('timer').isVisible().catch(() => false);
  return { speaker: speaker.replace('Card from ', ''), text, left: left ?? '', right: right ?? '', leftOdds: odds(left), rightOdds: odds(right), meters, act, timer };
}

/** Read the preview dots by hovering a choice: returns per-meter sign (+1 good / −1 bad / 0 none) and rough magnitude. */
async function previewFor(page: Page, side: 'left' | 'right'): Promise<{ score: number; hidden: boolean }> {
  const btn = page.getByRole('button', { name: side === 'left' ? /^Left:/ : /^Right:/ });
  await btn.hover().catch(() => {});
  await page.waitForTimeout(60);
  let score = 0;
  let hidden = false;
  const previews = page.locator('.meter-preview');
  const n = await previews.count();
  for (let i = 0; i < n; i++) {
    const p = previews.nth(i);
    const opacity = await p.evaluate((el) => getComputedStyle(el).opacity);
    if (Number(opacity) < 0.5) continue;
    const q = await p.locator('span').first();
    const txt = (await q.innerText().catch(() => '')) ?? '';
    if (txt.trim() === '?') {
      hidden = true;
      score -= 6;
      continue;
    }
    const style = (await q.getAttribute('style')) ?? '';
    const size = Number(style.match(/width:\s*(\d+)px/)?.[1] ?? 5);
    const good = /green/.test(style);
    score += (good ? 1 : -1) * (size >= 12 ? 3 : size >= 8 ? 2 : 1);
  }
  await page.mouse.move(5, 5);
  return { score, hidden };
}

function edgeRisk(meters: Record<string, number>): number {
  let risk = 0;
  for (const k of ['public', 'military', 'allies', 'economy']) {
    const v = meters[k] ?? 50;
    const edge = Math.min(v, 100 - v);
    if (edge < 15) risk += 15 - edge;
  }
  if ((meters.escalation ?? 0) > 60) risk += (meters.escalation - 60) / 2;
  return risk;
}

async function decide(page: Page, r: Reading): Promise<'left' | 'right'> {
  const wordScore = (s: string) => (DOVE_WORDS.test(s) ? 1 : 0) - (HAWK_WORDS.test(s) ? 1 : 0);
  const l = await previewFor(page, 'left');
  const rr = await previewFor(page, 'right');
  const esc = r.meters.escalation ?? 0;
  let left = l.score;
  let right = rr.score;
  if (style === 'dove') {
    left += wordScore(r.left) * 3;
    right += wordScore(r.right) * 3;
  } else if (style === 'hawk') {
    left -= wordScore(r.left) * 3;
    right -= wordScore(r.right) * 3;
  } else if (style === 'gambler') {
    if (r.leftOdds !== null) left += 4;
    if (r.rightOdds !== null) right += 4;
  }
  // odds: avoid poor rolls unless gambler
  const oddsAdj = (o: number | null) => (o === null ? 0 : style === 'gambler' ? 0 : o >= 60 ? 1 : o >= 45 ? -1 : -3);
  left += oddsAdj(r.leftOdds);
  right += oddsAdj(r.rightOdds);
  // escalation panic: lean dove when high
  if (esc >= 65 && style !== 'hawk') {
    left += wordScore(r.left) * 2;
    right += wordScore(r.right) * 2;
  }
  if (left === right) return Math.random() < 0.5 ? 'left' : 'right';
  return left > right ? 'left' : 'right';
}

const PIECE_PREFS: Record<string, string[]> = {
  dove: ['Hotline Protocol', 'No First Use', 'Ilse Marrow', 'Back-Channel', 'Hale Okonkwo-Reyes', 'Transparency', 'Signals Intercept', 'Hardened', 'Strategic Reserve', 'Civil Defence'],
  hawk: ['Oren Vasska', 'Launch on Warning', 'Missile Defence', 'Deterrence by Denial', 'Petra Volanski', 'Blue-Water', 'Rapid-Response', 'Pre-delegation', 'Red Lines', 'Corin Ashby-Tal', 'Escalate'],
  balanced: ['Hotline Protocol', 'Hardened', 'Strategic Reserve', 'Sefton Lyle (measured)', 'Signals Intercept', 'Alliance First', 'Transparency', 'Ferris Nkemelu', 'Early-Warning', 'Allied Basing'],
  gambler: ['Strategic Ambiguity', 'Red Lines', 'Missile Defence', 'Cyber Unit', 'Teodora Vance', 'Escalate', 'Launch on Warning', 'Sefton Lyle (unsleeping)', 'Commercial Satellite'],
};

async function main() {
  mkdirSync(outDir, { recursive: true });
  const vite = await startVite();
  const exe = process.env.PW_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const context = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce' });
  // Playtests may use any seat or tier: pre-unlock everything in this throwaway profile.
  const allUnlocks = ['seat_federation', 'seat_coalition', 'defcon_4', 'defcon_3', 'defcon_2', 'defcon_1', 'arsenal', 'false_alarm_survivor', 'limited_striker', 'late_hands', 'cool_head', 'low_survivor', 'bankrupt', 'no_backchannel_standdown', 'five_endings', 'unloved_peacemaker'];
  await context.addInitScript((ids: string[]) => {
    try {
      if (!localStorage.getItem('brink.unlocks')) localStorage.setItem('brink.unlocks', JSON.stringify(ids));
    } catch {}
  }, allUnlocks);
  const page = await context.newPage();
  const log: string[] = [`# Playtest — style ${style}, seat ${seat}, seed ${seed}, DEFCON ${difficulty}`, '', `Started ${new Date().toISOString()}`, ''];
  const shots: string[] = [];
  const shot = async (name: string) => {
    const file = join(outDir, `${style}-${seed}-${String(shots.length + 1).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage: false }).catch(() => {});
    shots.push(file);
  };
  try {
    await page.goto(`http://localhost:${port}/`);
    await page.getByRole('heading', { name: 'BRINK' }).waitFor();
    await shot('home');
    await page.locator('section').filter({ hasText: 'ENDLESS' }).getByRole('button', { name: 'Play' }).click();
    await page.getByText('Take a seat').waitFor();
    const seatName = seat === 'republic' ? 'The Republic' : seat === 'federation' ? 'The Federation' : 'The Coalition';
    await page.getByRole('button', { name: new RegExp(seatName) }).first().click();
    await page.getByRole('button', { name: difficulty, exact: true }).click().catch(() => {});
    await page.getByPlaceholder(/.+/).first().fill(seed);
    await shot('seat');
    await page.getByRole('button', { name: /Pick up the phone/ }).click();
    // First-run standing orders
    const intro = page.getByRole('dialog', { name: 'How this works' });
    if (await intro.isVisible({ timeout: 1500 }).catch(() => false)) {
      await shot('intro');
      await intro.getByRole('button').click();
    }

    let step = 0;
    let lastAct = '';
    let timers = 0;
    let rolls = 0;
    while (step < 500) {
      step++;
      if (await page.getByRole('button', { name: /replay this seed/i }).isVisible().catch(() => false)) break;
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible().catch(() => false)) {
        const label = (await dialog.getAttribute('aria-label')) ?? '';
        const result = await dialog.locator('.serif.text-3xl').innerText().catch(() => '');
        const detail = await dialog.locator('.mono.text-xs').innerText().catch(() => '');
        rolls++;
        log.push(`> 🎲 **${label}** → ${result} ${detail}`, '');
        await dialog.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => {});
        continue;
      }
      if (await page.getByRole('button', { name: /^Choose one|^Bring in/ }).isVisible().catch(() => false)) {
        const pieces = page.locator('button').filter({ hasText: /ADVISOR|DOCTRINE|ASSET/ });
        const names = await pieces.allInnerTexts();
        const prefs = PIECE_PREFS[style];
        let pickIdx = 0;
        let best = Infinity;
        names.forEach((n, i) => {
          const rank = prefs.findIndex((p) => n.includes(p));
          const r = rank === -1 ? 99 : rank;
          if (r < best) {
            best = r;
            pickIdx = i;
          }
        });
        await shot('offer');
        log.push(`## OFFER`, ...names.map((n, i) => `- ${i === pickIdx ? '**TAKEN** ' : ''}${n.replace(/\n+/g, ' · ')}`), '');
        await pieces.nth(pickIdx).click();
        await page.getByRole('button', { name: /^Bring in/ }).click();
        await page.waitForTimeout(500);
        continue;
      }
      const r = await readCard(page);
      if (!r) {
        // A dev-server reload lands on Home with the saved run; resume it.
        const resume = page.getByRole('button', { name: /Resume the crisis/ });
        if (await resume.isVisible().catch(() => false)) {
          log.push('> (page reloaded — resumed the saved run)', '');
          await resume.click();
        }
        await page.waitForTimeout(250);
        continue;
      }
      if (r.act !== lastAct) {
        lastAct = r.act;
        log.push(`## ${r.act}`, '');
        if (/FLASHPOINT/.test(r.act)) await shot('flashpoint');
      }
      if (r.timer) timers++;
      const side = await decide(page, r);
      const m = r.meters;
      log.push(
        `**${r.speaker}** — ${r.text}`,
        `- ${side === 'left' ? '**→** ' : ''}${r.left.replace(/^Left: /, '')}`,
        `- ${side === 'right' ? '**→** ' : ''}${r.right.replace(/^Right: /, '')}`,
        `- meters before: P${m.public} M${m.military} A${m.allies} E${m.economy} ESC${m.escalation}${r.timer ? ' · ⏱ timer' : ''}`,
        '',
      );
      const btn = page.getByRole('button', { name: side === 'left' ? /^Left:/ : /^Right:/ });
      await btn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.getByRole('button', { name: /replay this seed/i }).waitFor({ timeout: 20_000 });
    await shot('ending');
    const endingName = await page.locator('h2.serif').first().innerText().catch(() => '?');
    const days = await page.getByText(/DAYS IN OFFICE/).innerText().catch(() => '');
    const endingText = await page.locator('section.paper .serif.space-y-3').innerText().catch(() => '');
    const moment = await page.locator('section.paper-dark').first().innerText().catch(() => '');
    log.push(`# ENDING: ${endingName}`, '', days, '', endingText, '', `**Moment:** ${moment.replace(/\n+/g, ' · ')}`, '', `Cards ${step}, rolls ${rolls}, timed cards ${timers}`, '', 'Screenshots:', ...shots.map((s) => `- ${s}`));
    const img = page.locator('img[alt="Share card"]');
    if (await img.isVisible().catch(() => false)) await img.screenshot({ path: join(outDir, `${style}-${seed}-share.png`) }).catch(() => {});
  } catch (e) {
    log.push('', `ERROR: ${(e as Error).message}`);
    await shot('error');
  } finally {
    const file = join(outDir, `${style}-${seed}.md`);
    writeFileSync(file, log.join('\n'));
    console.log(`transcript → ${file}`);
    await browser.close();
    vite.kill();
  }
}

if (!existsSync('package.json')) {
  console.error('run from the project root');
  process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
