import { expect, test, type Page } from '@playwright/test';
import { BRAND } from '../src/config';
import { REGION } from '../src/war/content/map';
import { hashState, hashTrace, newRun, pin, sweep, type RunState } from '../src/war/engine';

/**
 * The war room on a phone, end to end (VITE_GAME=war; run with `npm run e2e:war`).
 *
 * The moments a player lives through are driven by real taps on the screen: the title buttons,
 * pins on the map canvas, SWEEP, the Briefing, the seat drag, the menu. The window.__war hook
 * (spec 14) only sets up states that would take minutes to reach by hand, speeds the animation
 * up where the test is not about it, and reads the run back.
 *
 * Every test also fails on any console error, any uncaught exception, and any request that
 * leaves the page's own origin.
 */

// ---------------------------------------------------------------- guards

let problems: string[] = [];

test.beforeEach(async ({ page, baseURL }, info) => {
  // The hotel's config (playwright.config.ts) also looks in e2e/; this file is the war room's.
  test.skip(info.project.name !== 'war', 'Runs under playwright.war.config.ts (npm run e2e:war).');
  problems = [];
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  page.on('request', (r) => {
    const url = r.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== origin) problems.push(`off-origin request: ${url}`);
  });
});

test.afterEach(({}, info) => {
  if (info.project.name === 'war') expect(problems, problems.join('\n')).toEqual([]);
});

// ---------------------------------------------------------------- helpers

/** Load the title and wait for the hook. */
async function open(page: Page): Promise<void> {
  await page.goto('./');
  await page.waitForFunction(() => !!window.__war);
  await expect(page.getByRole('button', { name: /^NEW NIGHT/ })).toBeVisible();
}

/** Tap a region's pin on the map canvas with a real touch. */
async function tapRegion(page: Page, id: string): Promise<void> {
  const box = await page.locator('canvas.map-canvas').boundingBox();
  if (!box) throw new Error('the map is not on screen');
  const r = REGION[id];
  await page.touchscreen.tap(box.x + (r.x / 390) * box.width, box.y + (r.y / 520) * box.height);
}

async function tapRegions(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) await tapRegion(page, id);
}

/** A point in the 390 x 844 frame, in page coordinates. */
async function framePoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('.war-frame').boundingBox();
  if (!box) throw new Error('the war room is not on screen');
  return { x: box.x + (x / 390) * box.width, y: box.y + (y / 844) * box.height };
}

/** Wait until no sweep or outcome is playing. */
async function idle(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__war && !window.__war.busy(), null, { timeout: 30_000 });
}

/** Read a few fields of the run, with BigInts as strings. */
async function runInfo(page: Page) {
  return page.evaluate(() => {
    const s = window.__war!.state();
    if (!s) return null;
    return {
      seed: s.seed,
      phase: s.phase,
      hour: s.crisis.hour,
      crisisIndex: s.crisis.index,
      total: String(s.crisis.total),
      target: String(s.crisis.target),
      funds: s.funds,
      lit: [...s.crisis.lit],
      pins: [...s.crisis.pins],
      staff: s.staff.map((x) => x.id),
      brass: { ...s.world.brass },
      pattern: s.lastSweep?.pattern ?? null,
      leverage: s.lastSweep ? String(s.lastSweep.leverage) : null,
    };
  });
}

/** The crisis total as the Big Board's tiles show it, once they have settled. */
async function boardTotal(page: Page): Promise<string> {
  const row = page.locator('.board-layer .total [role=img]');
  return (await row.getAttribute('aria-label')) ?? '';
}

/** The glyphs actually painted on the board's tiles (left to right), once every flip has landed. */
async function paintedTotal(page: Page): Promise<string> {
  return page.evaluate(() => {
    const row = document.querySelector('.board-layer .total .flap-row');
    if (!row) return '';
    return Array.from(row.children)
      .map((el) => (el.classList.contains('flap') ? (el.querySelector('.fh.bot .g')?.textContent ?? '') : (el.textContent ?? '')))
      .join('')
      .trim();
  });
}

const sweepButton = (page: Page) => page.getByRole('button', { name: /^Sweep, / });
/** The first-night coach: a line on tape under the rail, or on the Briefing tray's lip. */
const coach = (page: Page) => page.locator('.coach.on-map:not(.out)');
const trayCoach = (page: Page) => page.locator('.coach.on-tray:not(.out)');
/** A one-time balloon on a control (SWEEP, the lamp, SWAP, the in-tray). */
const controlHint = (page: Page) => page.locator('.control-hint');
const patternName = (page: Page) => page.locator('.readout-layer .pattern-name');

/** A board reading ('180', '13,800', '10.6B') as a number; NaN for anything unreadable. */
function boardValue(text: string): number {
  const t = text.replace(/,/g, '').trim();
  if (!t) return 0;
  const m = /^(\d+(?:\.\d+)?)([KMBT]?)$/.exec(t);
  if (!m) return Number.NaN;
  const unit = { '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2] as '' | 'K' | 'M' | 'B' | 'T'];
  return Number(m[1]) * unit;
}

/**
 * Start sampling, every animation frame, what the Big Board's total tiles actually paint: the upper
 * halves (the falling leaf while it is up) and the lower halves (the landing leaf once it shows),
 * plus the row's text label. Read the samples back with boardSamples().
 */
async function sampleBoard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __boardSamples: string[]; __boardSampling: boolean };
    w.__boardSamples = [];
    w.__boardSampling = true;
    const glyph = (tile: Element, leaf: string, half: string): string => {
      const moving = tile.querySelector<HTMLElement>(`.fl.${leaf}`);
      const el = moving && moving.style.visibility === 'visible' ? moving : tile.querySelector(`.fh.${half}`);
      return el?.querySelector('.g')?.textContent ?? '';
    };
    const read = () => {
      const row = document.querySelector('.board-layer .total .flap-row');
      if (row) {
        const tiles = Array.from(row.children);
        const line = (leaf: string, half: string) =>
          tiles.map((el) => (el.classList.contains('flap') ? glyph(el, leaf, half) : (el.textContent ?? ''))).join('');
        w.__boardSamples.push(line('top', 'top'), line('bot', 'bot'), row.getAttribute('aria-label') ?? '');
      }
      if (w.__boardSampling) requestAnimationFrame(read);
    };
    requestAnimationFrame(read);
  });
}

async function boardSamples(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __boardSamples: string[]; __boardSampling: boolean };
    w.__boardSampling = false;
    return w.__boardSamples;
  });
}

/** The Big Board never showed more than `final` reads: every sample is a number at or under it. */
function expectNeverAbove(samples: string[], final: string): void {
  expect(samples.length).toBeGreaterThan(10);
  const cap = boardValue(final);
  const bad = samples.filter((t) => !(boardValue(t) <= cap));
  expect(bad, `board readings above ${final}: ${[...new Set(bad)].join(' | ')}`).toEqual([]);
}

/** A rect in frame px (x, y, w, h) as the page's box for it. */
async function frameRect(page: Page, r: [number, number, number, number]) {
  const a = await framePoint(page, r[0], r[1]);
  const b = await framePoint(page, r[0] + r[2], r[1] + r[3]);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

async function fast(page: Page, motion: 'full' | 'reduce' = 'full'): Promise<void> {
  await page.evaluate((m) => {
    window.__war!.speed(4);
    window.__war!.motion(m);
  }, motion);
}

// ---------------------------------------------------------------- the first night

test('the first night: title, coach lines, CHAIN 180, FRONT 452, the Briefing, a hire, the next crisis', async ({ page }) => {
  await open(page);
  expect(await page.title()).toBe(BRAND.name);

  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  // The opening line states the goal in the crisis's own numbers; then the first move.
  await expect(coach(page)).toHaveText('Reach 300 in 4 sweeps, or the world tips.');
  await expect(coach(page)).toHaveText('Tap a lit region. The red ring scores twice.', { timeout: 7_000 });
  await expect(page.locator('.readout-layer .tap-lit')).toHaveText('Tap lit regions');
  await expect(page.locator('.board-layer .sweeps-left')).toHaveText('4 SWEEPS LEFT');
  const start = await runInfo(page);
  expect(start).toMatchObject({ seed: 'FIRST-NIGHT', phase: 'crisis', hour: 0, crisisIndex: 0, target: '300', funds: 5 });
  expect(start!.lit).toEqual(['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT']);

  await tapRegion(page, 'LNK');
  await expect(coach(page)).toHaveText('Pin a neighbour to join it: by border, bridge or sea lane.');
  await tapRegion(page, 'GUL');
  await expect(coach(page)).toHaveText('Joined pins make shapes. Bigger shapes multiply.');
  await tapRegion(page, 'SHL');
  await expect(patternName(page)).toHaveText('CHAIN');
  await expect(controlHint(page)).toHaveText('Sweep.');
  await expect(page.locator('button.sweep.beckon')).toBeVisible();
  expect((await runInfo(page))!.pins).toEqual(['LNK', 'GUL', 'SHL']);

  // Sweep 1 plays at 1x with full motion: this is the moment the slice exists for.
  await sampleBoard(page);
  await sweepButton(page).tap();
  await expect.poll(() => page.evaluate(() => window.__war!.busy())).toBe(true);
  await idle(page);
  expectNeverAbove(await boardSamples(page), '180');
  expect(await runInfo(page)).toMatchObject({ total: '180', pattern: 'CHAIN', leverage: '180', phase: 'crisis' });
  expect(await boardTotal(page)).toBe('180');
  await expect.poll(() => paintedTotal(page)).toBe('180');
  await expect(page.locator('.board-layer .sweeps-left')).toHaveText('3 SWEEPS LEFT');
  // The sweep's sum stays on the readout until the next pin, and opens its receipt.
  await expect(page.locator('.readout-layer .product .res')).toHaveText('=180');
  await page.locator('.readout-layer .sum-tab').tap();
  const receipt = page.getByRole('dialog', { name: /^LAST SWEEP/ });
  await expect(receipt).toContainText('60 × 3 = 180');
  await receipt.tap();
  await expect(receipt).toHaveCount(0);

  // The northern CHAIN already clears it: the lamp lights and says so, once.
  await tapRegions(page, ['NWK', 'FRM', 'WNM']);
  await expect(page.locator('.lamp.on')).toBeVisible();
  await expect(controlHint(page)).toHaveText('Green lamp: this sweep clears the crisis.');
  await tapRegion(page, 'WMS');
  await expect(patternName(page)).toHaveText('FRONT');
  await sweepButton(page).tap();
  await idle(page);

  const cleared = await runInfo(page);
  expect(cleared).toMatchObject({ total: '452', pattern: 'FRONT', leverage: '272', phase: 'briefing', funds: 11 });
  expect(cleared!.brass).toEqual({ WMS: 1 });
  await expect(page.locator('.board-layer .funds .amount')).toHaveText('11');
  await expect(page.locator('.tray-head')).toContainText('BRIEFING');
  await expect(page.locator('.tray-head')).toContainText('STANDOFF');
  // The Briefing's line lies on the tray beside the cards; CLEARED stays on the board above.
  await expect(trayCoach(page)).toHaveText('Hire staff: they fire every sweep. Hold a card to see where.');
  await expect(page.locator('.stamp-cleared')).toHaveText('CLEARED');
  const duty = page.getByRole('button', { name: /^Duty Officer, 3 Funds/ });
  await expect(duty).toBeVisible();
  await expect(page.getByRole('button', { name: /^Harbourmaster, 4 Funds/ })).toBeVisible();
  await expect(page.locator('.tray-layer')).toContainText('RECRUIT FOLDER');

  await duty.tap();
  await expect(page.getByRole('button', { name: /^Seat 1: Duty Officer/ })).toBeVisible();
  await expect(page.locator('.board-layer .funds .amount')).toHaveText('8');

  await page.getByRole('button', { name: /^NEXT CRISIS/ }).tap();
  await expect(page.locator('.crisis-line')).toContainText('STANDOFF');
  await expect(page.locator('.board-layer .target')).toContainText('450');
  expect(await runInfo(page)).toMatchObject({ phase: 'crisis', hour: 0, crisisIndex: 1, total: '0', target: '450', staff: ['DUTY'] });
});

test('the first deal: the goal stays on the Big Board while every coach line plays', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  const board = await frameRect(page, [104, 47, 196, 60]);
  const target = page.locator('.board-layer .target');
  const total = page.locator('.board-layer .total');
  /** The leverage module is on show and no coach line sits over it. */
  const goalInView = async () => {
    await expect(target).toBeVisible();
    await expect(target).toContainText('300');
    await expect(total).toBeVisible();
    const tape = (await coach(page).count()) ? await coach(page).boundingBox({ timeout: 300 }).catch(() => null) : null;
    if (tape) expect(tape.y, 'the coach line must sit below the Big Board').toBeGreaterThanOrEqual(board.y + board.height - 1);
  };
  // Through the opening line (4 s) and into the first move, sampled.
  await expect(coach(page)).toHaveText('Reach 300 in 4 sweeps, or the world tips.');
  for (let t = 0; t < 5_250; t += 350) {
    await goalInView();
    await page.waitForTimeout(350);
  }
  await expect(coach(page)).toHaveText('Tap a lit region. The red ring scores twice.');
  // And through each line the pins earn.
  for (const [id, line] of [
    ['LNK', 'Pin a neighbour to join it: by border, bridge or sea lane.'],
    ['GUL', 'Joined pins make shapes. Bigger shapes multiply.'],
  ] as const) {
    await tapRegion(page, id);
    await expect(coach(page)).toHaveText(line);
    await goalInView();
  }
  await tapRegion(page, 'SHL');
  await expect(controlHint(page)).toHaveText('Sweep.');
  await goalInView();
  // The SWEEP balloon sits beside the lever, never over the Influence or Momentum box.
  const balloon = (await controlHint(page).boundingBox())!;
  const boxes = await frameRect(page, [196, 695, 178, 40]);
  expect(balloon.y >= boxes.y + boxes.height || balloon.y + balloon.height <= boxes.y || balloon.x + balloon.width <= boxes.x).toBe(true);
});

test('a double tap on SWEEP never throws the first cascade away', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await expect(coach(page)).toHaveText(/Reach 300/);
  await tapRegions(page, ['LNK', 'GUL', 'SHL']);
  await expect(patternName(page)).toHaveText('CHAIN');
  const at = await framePoint(page, 238 + 68, 745 + 28);
  await sampleBoard(page);
  const t0 = Date.now();
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(140);
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(400);
  // An impatient third tap, on the map, right after.
  const map = await framePoint(page, 195, 420);
  await page.touchscreen.tap(map.x, map.y);
  // Still the cascade: no sum yet, the board still at 0.
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__war!.busy())).toBe(true);
  await expect(page.locator('.readout-layer')).not.toHaveClass(/slam-hit/);
  expect(await boardTotal(page)).toBe('0');
  await idle(page);
  // The whole first sweep played (about 2.7 s to the total at 1x), and only one sweep was taken.
  expect(Date.now() - t0).toBeGreaterThan(2_400);
  expectNeverAbove(await boardSamples(page), '180');
  expect(await runInfo(page)).toMatchObject({ total: '180', leverage: '180' });
  expect(await page.evaluate(() => window.__war!.state()!.sweepsTaken)).toBe(1);
});

// ---------------------------------------------------------------- the sandboxes

test('Late Shift: the Network shows 10.6B on the Big Board, never more on the way', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^LATE SHIFT/ }).tap();
  await tapRegions(page, ['EDV', 'MRD', 'TRN', 'GUL', 'LNK']);
  await expect(patternName(page)).toHaveText('NETWORK');
  await expect(page.locator('.readout-layer .pattern-lv')).toHaveText('Lv 6');
  // At 1x, with full motion: the showcase, the flight to the board and the odometer roll.
  await sampleBoard(page);
  await sweepButton(page).tap();
  await idle(page);
  expectNeverAbove(await boardSamples(page), '10.6B');
  expect(await runInfo(page)).toMatchObject({ leverage: '10559856944', total: '10559856944' });
  expect(await boardTotal(page)).toBe('10.6B');
  await expect.poll(() => paintedTotal(page)).toBe('10.6B');
});

test('Mid Shift: 10,920, then seats 2 and 3 dragged apart score 8,736', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^MID SHIFT/ }).tap();
  await fast(page);
  await page.evaluate(() => {
    (window as unknown as { __midStart: RunState }).__midStart = window.__war!.state()!;
  });
  const five = ['SHL', 'LTL', 'KLP', 'KLM', 'TLM'];
  await tapRegions(page, five);
  await expect(patternName(page)).toHaveText('NETWORK');
  await sweepButton(page).tap();
  await idle(page);
  expect(await runInfo(page)).toMatchObject({ leverage: '10920', staff: ['HARBOUR', 'HOTLINE', 'STRATEGIST'] });
  expect(await boardTotal(page)).toBe('10,920');

  // Long-press seat 2 and drag it onto seat 3 with a real pointer.
  const from = await framePoint(page, 90 + 32, 110 + 29);
  const to = await framePoint(page, 163 + 32, 110 + 29);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(450);
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y, { steps: 2 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: /^Seat 2: Strategist/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Seat 3: Hotline Operator/ })).toBeVisible();
  expect((await runInfo(page))!.staff).toEqual(['HARBOUR', 'STRATEGIST', 'HOTLINE']);

  // The identical deal again, with the table as it now sits.
  await page.evaluate(() => {
    const start = (window as unknown as { __midStart: RunState }).__midStart;
    window.__war!.load({ ...start, staff: window.__war!.state()!.staff });
  });
  await tapRegions(page, five);
  await sweepButton(page).tap();
  await idle(page);
  expect(await runInfo(page)).toMatchObject({ leverage: '8736', staff: ['HARBOUR', 'STRATEGIST', 'HOTLINE'] });
  expect(await boardTotal(page)).toBe('8,736');
});

test('Mid Shift at 1x: taps in the first moments never skip; a tap later skips to the slam, which still lands', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^MID SHIFT/ }).tap();
  await tapRegions(page, ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']);
  await expect(patternName(page)).toHaveText('NETWORK');
  await sampleBoard(page);
  const sweepAt = await framePoint(page, 238 + 68, 745 + 28);
  const mapAt = await framePoint(page, 195, 420);
  // When each tap lands, in page time from the first (a slow harness must not drift past the guard).
  await page.evaluate(() => {
    const w = window as unknown as { __downs: number[] };
    w.__downs = [];
    document.addEventListener('pointerdown', () => w.__downs.push(performance.now()), true);
  });
  await page.touchscreen.tap(sweepAt.x, sweepAt.y);
  await page.waitForTimeout(60);
  await page.touchscreen.tap(sweepAt.x, sweepAt.y);
  await page.touchscreen.tap(mapAt.x, mapAt.y);
  const downs = await page.evaluate(() => (window as unknown as { __downs: number[] }).__downs);
  expect(downs).toHaveLength(3);
  expect(downs[2] - downs[0], 'the early taps land inside the 700 ms guard').toBeLessThan(700);
  await page.waitForTimeout(Math.max(0, 900 - (downs[2] - downs[0])));
  expect(await page.evaluate(() => window.__war!.busy())).toBe(true);
  await expect(page.locator('.readout-layer')).not.toHaveClass(/slam-hit/);
  // Past the guard (and off the lever), a tap skips to the end of the slam.
  await page.touchscreen.tap(mapAt.x, mapAt.y);
  await expect(page.locator('.readout-layer')).toHaveClass(/slam-hit/, { timeout: 1_000 });
  await idle(page);
  expectNeverAbove(await boardSamples(page), '10,920');
  expect(await runInfo(page)).toMatchObject({ leverage: '10920', total: '10920' });
  await expect.poll(() => paintedTotal(page)).toBe('10,920');
});

test('LAY CABLE: tap one end, then the other', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await fast(page, 'reduce');
  await page.evaluate(() => {
    const w = window.__war!;
    const s = w.seed('E2E-CABLE');
    w.load({ ...s, tray: [{ uid: 900, id: 'CABLE' }], crisis: { ...s.crisis, lit: ['EDV', 'LNK', 'GUL', 'SHL', 'NWK', 'ICW', 'HRT', 'FLE'] } });
  });
  const slot = await framePoint(page, 120 + 26, 745 + 28);
  await page.touchscreen.tap(slot.x, slot.y);
  await expect(page.locator('.readout-layer .armed-prompt')).toBeVisible();
  await tapRegion(page, 'EDV');
  await expect(page.locator('.readout-layer .armed-prompt')).toHaveText('Now the other end.');
  await tapRegion(page, 'LNK');
  await expect(page.locator('.readout-layer .armed-prompt')).toHaveCount(0);
  const s = await page.evaluate(() => {
    const st = window.__war!.state()!;
    return { cables: st.world.cables, tray: st.tray.length, armed: st.armed };
  });
  expect(s).toEqual({ cables: [['EDV', 'LNK']], tray: 0, armed: null });
});

// ---------------------------------------------------------------- endings

test('a miss: THE WORLD TIPPED at 22:00 STANDOFF, and NEW NIGHT plays again', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await fast(page, 'reduce');
  // The first crisis as scripted, then the Standoff thrown away one region at a time.
  await page.evaluate(async () => {
    const w = window.__war!;
    w.pin(['LNK', 'GUL', 'SHL']);
    await w.sweep();
    w.pin(['NWK', 'FRM', 'WNM', 'WMS']);
    await w.sweep();
    w.next();
    for (let i = 0; i < 4; i++) {
      w.pin([w.state()!.crisis.lit[0]]);
      await w.sweep();
    }
  });
  await idle(page);
  const info = await runInfo(page);
  expect(info).toMatchObject({ phase: 'missed', hour: 0, crisisIndex: 1 });
  expect(BigInt(info!.total)).toBeLessThan(450n);
  await expect(page.locator('.report-stamp')).toHaveText('THE WORLD TIPPED');
  await expect(page.locator('.report-line')).toHaveText('22:00 STANDOFF');

  await page.locator('.end-btn', { hasText: 'NEW NIGHT' }).tap();
  await expect(page.locator('.readout-layer .tap-lit')).toHaveText('Tap lit regions');
  await expect(page.locator('.crisis-line')).toContainText('FLARE-UP');
  const fresh = await runInfo(page);
  expect(fresh).toMatchObject({ phase: 'crisis', hour: 0, crisisIndex: 0, total: '0', funds: 5 });
  // The scripted night is played once; the next is a fresh seed.
  expect(fresh!.seed).toMatch(/^NIGHT-[0-9A-F]{8}$/);
  await tapRegion(page, fresh!.lit[0]);
  expect((await runInfo(page))!.pins).toEqual([fresh!.lit[0]]);
});

test('END OF SLICE after the 00:00 Summit, and KEEP GOING carries on to 01:00', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await fast(page, 'reduce');
  // The 00:00 Summit, set up through the hook: FULL TABLE in force, a target one sweep can reach.
  await page.evaluate(async () => {
    const w = window.__war!;
    const s = w.seed('E2E-SLICE');
    w.load({
      ...s,
      hour: { index: 2, targets: [2500n, 3750n, 5000n], twist: { kind: 'FULL_TABLE', colour: s.hour.twist.colour } },
      // Any five pins score at least 8, so one sweep holds the Summit.
      crisis: { ...s.crisis, hour: 2, index: 2, kind: 'SUMMIT', target: 5n },
    });
    w.pin(w.state()!.crisis.lit.slice(0, 5));
    await w.sweep();
  });
  await idle(page);
  expect(await runInfo(page)).toMatchObject({ phase: 'sliceEnd', hour: 2, crisisIndex: 2 });
  await expect(page.locator('.report-stamp')).toHaveText('END OF SLICE');
  await expect(page.locator('.report-line')).toHaveText('YOU HELD UNTIL 01:00');

  await page.locator('.end-btn', { hasText: 'KEEP GOING' }).tap();
  await expect(page.locator('.tray-head')).toContainText('BRIEFING');
  await expect(page.locator('.tray-head')).toContainText('01:00');
  await page.getByRole('button', { name: /^NEXT CRISIS/ }).tap();
  expect(await runInfo(page)).toMatchObject({ phase: 'crisis', hour: 3, crisisIndex: 0, target: '6000' });
  await expect(page.locator('.board-layer .crisis-line')).toContainText('FLARE-UP');
  await expect(page.locator('.board-layer .target')).toContainText('6,000');
});

test('the menu quits to the title', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await expect(page.locator('canvas.map-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: /QUIT TO TITLE/ }).tap();
  const confirm = page.getByRole('alertdialog', { name: 'Quit this night?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'QUIT', exact: true }).tap();
  await expect(page.getByRole('button', { name: /^NEW NIGHT/ })).toBeVisible();
  await expect(page.locator('canvas.map-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.__war!.state())).toBeNull();
});

test('switching MOTION back to FULL mid-night: the Big Board keeps painting every total', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await page.evaluate(async () => {
    const w = window.__war!;
    w.speed(4);
    w.motion('reduce');
    w.pin(['LNK', 'GUL', 'SHL']);
    await w.sweep();
  });
  await expect.poll(() => paintedTotal(page)).toBe('180');
  // The player turns full motion back on from the menu.
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await menu.getByRole('radiogroup', { name: 'Motion' }).getByRole('radio', { name: 'FULL' }).tap();
  await menu.getByRole('button', { name: 'RESUME', exact: true }).tap();
  await expect(menu).toHaveCount(0);
  await tapRegions(page, ['NWK', 'FRM', 'WNM', 'WMS']);
  await sweepButton(page).tap();
  await idle(page);
  await expect.poll(() => paintedTotal(page)).toBe('452');
  await page.getByRole('button', { name: /^NEXT CRISIS/ }).tap();
  expect((await runInfo(page))!.total).toBe('0');
  await expect.poll(() => paintedTotal(page)).toBe('0');
});

test("the phone's back button asks before it drops a night, and never leaves the app", async ({ page }) => {
  await open(page);
  const home = page.url();
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await expect(page.locator('canvas.map-canvas')).toBeVisible();
  await tapRegion(page, 'LNK');
  const confirm = page.getByRole('alertdialog', { name: 'Quit this night?' });

  // Back opens the quit question; STAY carries on with the night as it was.
  await page.goBack();
  await expect(confirm).toBeVisible();
  expect(page.url()).toBe(home);
  await confirm.getByRole('button', { name: 'STAY', exact: true }).tap();
  await expect(confirm).toHaveCount(0);
  expect((await runInfo(page))!.pins).toEqual(['LNK']);

  // Back with the menu open closes the menu; back again asks; back once more closes the question.
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
  await page.goBack();
  await expect(confirm).toBeVisible();
  await page.goBack();
  await expect(confirm).toHaveCount(0);
  expect(page.url()).toBe(home);
  expect((await runInfo(page))!.phase).toBe('crisis');

  // QUIT goes home to the title.
  await page.goBack();
  await confirm.getByRole('button', { name: 'QUIT', exact: true }).tap();
  await expect(page.getByRole('button', { name: /^NEW NIGHT/ })).toBeVisible();
  expect(await page.evaluate(() => window.__war!.state())).toBeNull();
  expect(page.url()).toBe(home);
});

// ---------------------------------------------------------------- reading the table

/** Press and hold at a page point for `ms`, then release (a pointer long-press). */
async function hold(page: Page, at: { x: number; y: number }, ms: number, during?: () => Promise<void>): Promise<void> {
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await during?.();
  await page.mouse.up();
}

/** The first night up to its first Briefing, fast, then back to 1x with full motion. */
async function toFirstBriefing(page: Page): Promise<void> {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await fast(page, 'reduce');
  await page.evaluate(async () => {
    const w = window.__war!;
    w.pin(['LNK', 'GUL', 'SHL']);
    await w.sweep();
    w.pin(['NWK', 'FRM', 'WNM', 'WMS']);
    await w.sweep();
    w.speed(1);
    w.motion('full');
  });
  await idle(page);
  await expect(page.locator('.tray-head')).toContainText('BRIEFING');
}

test('Mid Shift at 1x: the board rolls up to 10,920 across the digit crossing, never reading more', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^MID SHIFT/ }).tap();
  await tapRegions(page, ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']);
  await expect(patternName(page)).toHaveText('NETWORK');
  await sampleBoard(page);
  await sweepButton(page).tap();
  await idle(page);
  const samples = await boardSamples(page);
  expectNeverAbove(samples, '10,920');
  // It rolled through four figures on its way to five, rather than jumping to the end.
  expect(samples.some((t) => /^\d,\d{3}$/.test(t.trim()))).toBe(true);
  await expect.poll(() => paintedTotal(page)).toBe('10,920');
});

test('the clearing sweep: 452 lands and reads on the board before CLEARED, which keeps it beside the stamp', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await fast(page, 'reduce');
  await page.evaluate(async () => {
    const w = window.__war!;
    w.pin(['LNK', 'GUL', 'SHL']);
    await w.sweep();
    w.speed(1);
    w.motion('full');
  });
  await idle(page);
  await tapRegions(page, ['NWK', 'FRM', 'WNM', 'WMS']);
  // Frame by frame: how long the landed 452 is on show before the stamp.
  await page.evaluate(() => {
    const w = window as unknown as { __clear: Array<{ t: number; total: string; cleared: boolean }>; __clearOn: boolean };
    w.__clear = [];
    w.__clearOn = true;
    const read = () => {
      const row = document.querySelector('.board-layer .total .flap-row');
      const total = row
        ? Array.from(row.children)
            .map((el) => (el.classList.contains('flap') ? (el.querySelector('.fh.bot .g')?.textContent ?? '') : (el.textContent ?? '')))
            .join('')
        : '';
      w.__clear.push({ t: performance.now(), total, cleared: !!document.querySelector('.stamp-cleared') });
      if (w.__clearOn) requestAnimationFrame(read);
    };
    requestAnimationFrame(read);
  });
  await sweepButton(page).tap();
  await idle(page);
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __clear: Array<{ t: number; total: string; cleared: boolean }>; __clearOn: boolean };
    w.__clearOn = false;
    return w.__clear;
  });
  const landed = frames.find((f) => f.total === '452');
  const stamped = frames.find((f) => f.cleared);
  expect(landed && stamped).toBeTruthy();
  // About 450 ms on a phone; a slow headless frame rate still leaves it well in view.
  expect(stamped!.t - landed!.t).toBeGreaterThanOrEqual(180);
  await expect(page.locator('.board-layer .total-line')).toHaveText('TOTAL 452');
});

test('the Briefing: a held card shows where it acts and is never bought; the ticket opens the clearing sweep; NEXT CRISIS slides the tray away', async ({ page }) => {
  await toFirstBriefing(page);

  // A desk staff has no place on the map: holding it says when it fires, over the readout.
  const duty = await page.getByRole('button', { name: /^Duty Officer, 3 Funds/ }).boundingBox();
  await hold(page, { x: duty!.x + duty!.width / 2, y: duty!.y + duty!.height / 2 }, 500, async () => {
    await expect(page.locator('.peek-note')).toContainText('EVERY SWEEP');
    await expect(page.locator('.peek-note')).toContainText('+4 Momentum');
    await expect(page.locator('.box.mom.peeked')).toHaveCount(1);
  });
  await expect(page.locator('.peek-note')).toHaveCount(0);
  expect((await runInfo(page))!.staff).toEqual([]);

  // An open folder's cards peek the same way; only a short tap takes one.
  await page.locator('.folder').tap();
  const courier = page.getByRole('button', { name: /^Courier\./ });
  const c = await courier.boundingBox();
  await hold(page, { x: c!.x + c!.width / 2, y: c!.y + c!.height / 2 }, 500, async () => {
    await expect(page.locator('.peek-note')).toContainText('scores twice');
  });
  expect((await runInfo(page))!.staff).toEqual([]);
  await expect(courier).toBeVisible();

  // The ticket's first line unfolds the sweep that cleared.
  await page.locator('.payout .sweep-row').tap();
  const receipt = page.getByRole('dialog', { name: 'LAST SWEEP · FRONT' });
  await expect(receipt).toContainText('68 × 4 = 272');
  await page.locator('.tray-head').tap();
  await expect(receipt).toHaveCount(0);

  await page.getByRole('button', { name: /^SKIP/ }).tap();
  await page.getByRole('button', { name: /^NEXT CRISIS/ }).tap();
  await expect(page.locator('.tray-layer.leaving')).toHaveCount(1);
  await expect(page.locator('.crisis-line')).toContainText('STANDOFF');
  await expect(page.locator('.tray-layer')).toHaveCount(0);
  expect(await boardTotal(page)).toBe('0');
});

test('reading the map: a loose pin is named, and a held region shows its card instead of pinning', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await expect(page.locator('canvas.map-canvas')).toBeVisible();
  await tapRegions(page, ['LNK', 'EDV']);
  await expect(page.locator('.readout-layer .pattern-loose')).toHaveText('1 LOOSE · SCORES NOTHING');
  await tapRegions(page, ['LNK', 'EDV']);
  expect((await runInfo(page))!.pins).toEqual([]);

  const box = await page.locator('canvas.map-canvas').boundingBox();
  const r = REGION.GUL;
  await hold(page, { x: box!.x + (r.x / 390) * box!.width, y: box!.y + (r.y / 520) * box!.height }, 600);
  const card = page.locator('.region-card');
  await expect(card).toContainText(/gullrest/i);
  await expect(card).toContainText('+3 Influence');
  expect((await runInfo(page))!.pins).toEqual([]);
  // The next tap only closes the card.
  await tapRegion(page, 'SHL');
  await expect(card).toHaveCount(0);
  expect((await runInfo(page))!.pins).toEqual([]);
});

test.describe('a phone browser with its toolbars showing', () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test('the war room fills the height: the live area is fitted and the desk runs on to the edges', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
    await expect(page.locator('canvas.map-canvas')).toBeVisible();
    const board = await page.locator('.board').boundingBox();
    const controls = await page.locator('.controls').boundingBox();
    // The Big Board meets the top of the window and the console its bottom.
    expect(Math.abs(board!.y)).toBeLessThan(1.5);
    expect(Math.abs(controls!.y + controls!.height - 664)).toBeLessThan(1.5);
    expect(board!.width).toBeGreaterThan(335);
    await expect(page.locator('.war-bleed .bleed-rail')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------- reduced motion

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a sweep, and a sweep that clears, each finish in 1.2 s or less', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
    await expect(coach(page)).toHaveText('Tap a lit region. The red ring scores twice.', { timeout: 8_000 });

    /** Press SWEEP and time it until the war room accepts input again. */
    const timedSweep = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const t0 = performance.now();
            document.querySelector<HTMLButtonElement>('button.sweep')!.click();
            const tick = () => (window.__war!.busy() ? requestAnimationFrame(tick) : resolve(performance.now() - t0));
            requestAnimationFrame(tick);
          }),
      );

    await tapRegions(page, ['LNK', 'GUL', 'SHL']);
    const plain = await timedSweep();
    expect((await runInfo(page))!.total).toBe('180');
    expect(plain).toBeLessThanOrEqual(1200);

    await tapRegions(page, ['NWK', 'FRM', 'WNM', 'WMS']);
    const clear = await timedSweep();
    expect((await runInfo(page))!.phase).toBe('briefing');
    await expect(page.locator('.tray-head')).toBeVisible();
    expect(clear).toBeLessThanOrEqual(1200);
    // No flying numbers, no shake: nothing transformed the war room.
    expect(await page.locator('.war-shake').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

// ---------------------------------------------------------------- determinism

test('determinism: the same seed and actions give the same trace hash, twice and in Node', async ({ page }) => {
  // The same game played in Node by the engine itself.
  const play = (seed: string, pins: (s: RunState) => string[]) => {
    let s = newRun(seed);
    for (const id of pins(s)) s = pin(s, id).state;
    s = sweep(s).state;
    return { trace: hashTrace(s.lastSweep!.trace), state: hashState(s) };
  };
  const nodeFirst = play('FIRST-NIGHT', () => ['LNK', 'GUL', 'SHL']);
  const nodeOther = play('E2E-DETERMINISM', (s) => s.crisis.lit.slice(0, 3));

  const inBrowser = async () => {
    await open(page);
    await fast(page, 'reduce');
    return page.evaluate(async () => {
      const w = window.__war!;
      w.seed('FIRST-NIGHT');
      w.pin(['LNK', 'GUL', 'SHL']);
      await w.sweep();
      const first = w.hash();
      const s = w.seed('E2E-DETERMINISM');
      w.pin(s.crisis.lit.slice(0, 3));
      await w.sweep();
      return { first, other: w.hash() };
    });
  };
  const a = await inBrowser();
  await page.reload();
  const b = await inBrowser();

  expect(a.first.trace).toMatch(/^[0-9a-f]{8}$/);
  expect(b).toEqual(a);
  expect(a.first).toEqual(nodeFirst);
  expect(a.other).toEqual(nodeOther);
});
