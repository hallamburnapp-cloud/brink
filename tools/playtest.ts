/**
 * Playtest harness: drives the real game in a mobile Chromium through the DOM,
 * using only what a player sees (card text, choice text, odds %, preview dots,
 * meter bars), with a named decision style. Writes a full transcript and
 * screenshots so a run can be read back and judged for feel.
 *
 *   tsx tools/playtest.ts --style dove|hawk|balanced|gambler --seat republic --seed ABC --out playtest-output
 *   tsx tools/playtest.ts --game night --style balanced --seat republic --seed ABC   (the night: five dials, the clock, no numbers)
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
/** 'night' drives the simple ruleset (the redesign); 'expert' the long game with the numbers on. */
const game = (args.get('game') ?? 'expert') as 'night' | 'expert';

const DOVE_WORDS = /talk|wait|call|pause|stand down|offer|hotline|ask|listen|withdraw|open|share|apolog|invite|delay|hold off|de-?escalat|quiet|back.?channel|accept|agree|restrain|reassur|publish|disclose|second radar/i;
/** Either ending screen: the dawn screen ("Copy result") or the Expert ending ("Replay this seed"). */
const ENDED = /replay this seed|^Copy result$/i;
const HAWK_WORDS = /strike|mobilis|board|deploy|send|refuse|reject|escalat|launch|attack|seize|blockade|intercept|retaliat|arm|alert|fire|package|surge|deny|expel|sanction|jam|hack|counter|shadow|warn/i;

function startVite(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // Its own process group, so the whole npx → vite tree can be killed at the end and the port freed for the next run.
    const child = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: process.cwd(), env: { ...process.env, VITE_ANALYTICS: 'off', VITE_PAYWALL: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
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
    if (m) return Number(m[1]);
    // The night shows odds as a word; read it the way a player would.
    const w = s?.match(/, (likely|even|risky)$/i)?.[1]?.toLowerCase();
    return w === 'likely' ? 75 : w === 'even' ? 55 : w === 'risky' ? 35 : null;
  };
  const meters: Record<string, number> = {};
  for (const t of await page.locator('.meter-track').all()) {
    const title = (await t.getAttribute('title')) ?? '';
    const m = title.match(/^(\w+) (\d+)$/);
    if (m) meters[m[1].toLowerCase()] = Number(m[2]);
  }
  if (game === 'night') {
    // No numbers on screen: read the dial fills (what the eye reads) in dial order.
    const fills = await page.locator('.dial-fill').all();
    const keys = ['public', 'military', 'allies', 'economy', 'escalation'];
    for (let i = 0; i < fills.length && i < keys.length; i++) {
      const h = (await fills[i].getAttribute('style')) ?? '';
      const m = h.match(/height:\s*([\d.]+)%/);
      if (m) meters[keys[i]] = Math.round(Number(m[1]));
    }
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
  const previews = page.locator('.meter-preview, .dial-preview');
  const n = await previews.count();
  for (let i = 0; i < n; i++) {
    const p = previews.nth(i);
    const opacity = await p.evaluate((el) => getComputedStyle(el).opacity);
    if (Number(opacity) < 0.5) continue;
    const q = p.locator('span').first();
    // A dial with nothing to preview renders no dot at all; do not wait on one.
    if ((await q.count().catch(() => 0)) === 0) continue;
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
  const allUnlocks = ['seat_federation', 'seat_coalition', 'defcon_4', 'defcon_3', 'defcon_2', 'defcon_1', 'arsenal', 'false_alarm_survivor', 'limited_striker', 'late_hands', 'cool_head', 'low_survivor', 'bankrupt', 'no_backchannel_standdown', 'five_endings', 'unloved_peacemaker', 'over_the_top', 'the_switch', 'two_standdowns', 'smash_three', 'broke_the_game'];
  await context.addInitScript((ids: string[]) => {
    try {
      if (!localStorage.getItem('brink.unlocks')) localStorage.setItem('brink.unlocks', JSON.stringify(ids));
    } catch {}
  }, allUnlocks);
  const page = await context.newPage();
  const log: string[] = [`# Playtest — ${game === 'night' ? 'the night' : 'Expert'}, style ${style}, seat ${seat}, seed ${seed}${game === 'expert' ? `, DEFCON ${difficulty}` : ''}`, '', `Started ${new Date().toISOString()}`, ''];
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
    const nightAfterNight = page.locator('section').filter({ hasText: 'NIGHT AFTER NIGHT' });
    await nightAfterNight.getByRole('button', { name: game === 'night' ? 'CHOOSE A SEAT OR SEED' : 'EXPERT' }).click();
    await page.getByText('Take a seat').waitFor();
    if (game === 'expert') await page.getByRole('tab', { name: 'EXPERT' }).click();
    const seatName = seat === 'republic' ? 'The Republic' : seat === 'federation' ? 'The Federation' : 'The Coalition';
    await page.getByRole('button', { name: new RegExp(seatName) }).first().click();
    if (game === 'expert') await page.getByRole('button', { name: difficulty, exact: true }).click().catch(() => {});
    await page.getByPlaceholder(/.+/).first().fill(seed);
    await shot('seat');
    await page.getByRole('button', { name: game === 'night' ? /Start the night as/ : /Pick up the phone as/ }).click();
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
      if (await page.getByRole('button', { name: ENDED }).first().isVisible().catch(() => false)) break;
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
      const leave = page.getByRole('button', { name: /^Back to the desk$|^Begin |^Into the endless night$/ });
      if (await leave.isVisible().catch(() => false)) {
        const pieces = page.locator('button').filter({ hasText: /ADVISOR|DOCTRINE|ASSET/ });
        const names = await pieces.allInnerTexts();
        const prefs = PIECE_PREFS[style];
        const capital = Number((await page.getByText(/^\d+$/).first().innerText().catch(() => '0')) || 0);
        // Buy in preference order while affordable (the button is disabled when it is not).
        const ranked = names.map((n, i) => ({ i, rank: (() => { const r = prefs.findIndex((p) => n.includes(p)); return r === -1 ? 99 : r; })() })).sort((a, b) => a.rank - b.rank);
        const bought: string[] = [];
        for (const { i } of ranked) {
          const b = pieces.nth(i);
          if (!(await b.isEnabled().catch(() => false))) continue;
          await b.click().catch(() => {});
          bought.push(names[i].split('\n')[1] ?? names[i]);
          await page.waitForTimeout(150);
          if (bought.length >= 2) break;
        }
        await shot('shop');
        log.push(`## SHOP (capital ${capital})`, ...names.map((n) => `- ${n.replace(/\n+/g, ' · ')}`), bought.length ? `- **BOUGHT** ${bought.join(', ')}` : '- bought nothing', '');
        await leave.click();
        await page.waitForTimeout(500);
        continue;
      }
      const alert = page.getByRole('alert');
      if (await alert.isVisible().catch(() => false)) {
        const txt = (await alert.innerText().catch(() => '')).replace(/\n+/g, ' · ');
        log.push(`> ⚠ ACCIDENT ${txt}`, '');
        await alert.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => {});
        continue;
      }
      const r = await readCard(page);
      if (!r) {
        // A dev-server reload lands on Home with the saved run; resume it.
        const resume = page.getByRole('button', { name: /Resume the crisis|Pick the phone back up/ });
        if (await resume.isVisible().catch(() => false)) {
          log.push('> (page reloaded — resumed the saved run)', '');
          await resume.click();
        }
        await page.waitForTimeout(250);
        continue;
      }
      if (game === 'night') {
        const crisis = /THE CRISIS/.test(r.act);
        if (step === 1) await shot('card');
        if (crisis && !/THE CRISIS/.test(lastAct)) {
          log.push('## THE CRISIS', '');
          await shot('crisis');
        } else if (step % 5 === 1 && step > 1) await shot('card');
        lastAct = r.act;
      } else if (r.act !== lastAct) {
        const actOnly = r.act.replace(/\s*Day \d+.*$/i, '');
        const wasFlashpoint = /FLASHPOINT/.test(lastAct);
        const isFlashpoint = /FLASHPOINT/.test(r.act);
        const newAct = actOnly !== lastAct.replace(/\s*Day \d+.*$/i, '');
        lastAct = r.act;
        if (newAct) {
          log.push(`## ${actOnly}`, '');
          if (isFlashpoint && !wasFlashpoint) await shot('flashpoint');
          else if (!isFlashpoint) await shot('card');
        }
      }
      if (r.timer) timers++;
      const side = await decide(page, r);
      const m = r.meters;
      const clockNote = game === 'night' ? `${r.act.replace(/\s*THE CRISIS\s*/i, '').trim()} · ` : '';
      log.push(
        `**${r.speaker}** — ${r.text}`,
        `- ${side === 'left' ? '**→** ' : ''}${r.left.replace(/^Left: /, '')}`,
        `- ${side === 'right' ? '**→** ' : ''}${r.right.replace(/^Right: /, '')}`,
        `- ${clockNote}${game === 'night' ? 'dials' : 'meters'} before: P${m.public} M${m.military} A${m.allies} E${m.economy} ESC${m.escalation}${r.timer ? ' · ⏱ timer' : ''}`,
        '',
      );
      const btn = page.getByRole('button', { name: side === 'left' ? /^Left:/ : /^Right:/ });
      await btn.click({ timeout: 5000 }).catch(() => {});
      // The tally shows the score; wait for it to clear so the next card is readable.
      await page.waitForTimeout(500);
      const tallyBox = page.getByLabel(/^Leverage \d+/);
      if (await tallyBox.isVisible().catch(() => false)) {
        const scored = await tallyBox.innerText().catch(() => '');
        const m = scored.match(/\+([\d.,kM]+)/);
        if (m) log.push(`> leverage +${m[1]}`, '');
        await tallyBox.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      }
    }
    await page.getByRole('button', { name: ENDED }).first().waitFor({ timeout: 20_000 });
    await shot('ending');
    const endingName = await page.locator('h2.serif').first().innerText().catch(() => '?');
    const days = game === 'night' ? await page.getByText(/DAWN|FELL AT/).first().innerText().catch(() => '') : await page.getByText(/DAYS IN OFFICE/).innerText().catch(() => '');
    const endingText = await page.locator('section .serif.space-y-3').first().innerText().catch(() => '');
    const moment = game === 'night' ? await page.getByLabel('The moment').innerText().catch(() => '') : await page.locator('section.paper-dark').first().innerText().catch(() => '');
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
    try {
      if (vite.pid) process.kill(-vite.pid, 'SIGTERM');
      else vite.kill();
    } catch {
      vite.kill();
    }
    // The dev server's shell wrapper can outlive kill(); do not leave the harness hanging.
    setTimeout(() => process.exit(0), 500).unref();
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
