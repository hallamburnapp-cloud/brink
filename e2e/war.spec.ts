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
const boardHint = (page: Page) => page.locator('.board-hint');
const patternName = (page: Page) => page.locator('.readout-layer .pattern-name');

async function fast(page: Page, motion: 'full' | 'reduce' = 'full'): Promise<void> {
  await page.evaluate((m) => {
    window.__war!.speed(4);
    window.__war!.motion(m);
  }, motion);
}

// ---------------------------------------------------------------- the first night

test('the first night: title, hints, CHAIN 180, FRONT 452, the Briefing, a hire, the next crisis', async ({ page }) => {
  await open(page);
  expect(await page.title()).toBe(BRAND.name);

  await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
  await expect(boardHint(page)).toHaveText('Hold the world together until dawn.');
  await expect(boardHint(page)).toHaveText('Tap a lit region.', { timeout: 5_000 });
  await expect(page.locator('.readout-layer .tap-lit')).toHaveText('Tap lit regions');
  const start = await runInfo(page);
  expect(start).toMatchObject({ seed: 'FIRST-NIGHT', phase: 'crisis', hour: 0, crisisIndex: 0, target: '300', funds: 5 });
  expect(start!.lit).toEqual(['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT']);

  await tapRegion(page, 'LNK');
  await expect(boardHint(page)).toHaveText('Pins that touch join up.');
  await tapRegions(page, ['GUL', 'SHL']);
  await expect(patternName(page)).toHaveText('CHAIN');
  await expect(boardHint(page)).toHaveText('Sweep.');
  expect((await runInfo(page))!.pins).toEqual(['LNK', 'GUL', 'SHL']);

  // Sweep 1 plays at 1x with full motion: this is the moment the slice exists for.
  await sweepButton(page).tap();
  await expect.poll(() => page.evaluate(() => window.__war!.busy())).toBe(true);
  await idle(page);
  expect(await runInfo(page)).toMatchObject({ total: '180', pattern: 'CHAIN', leverage: '180', phase: 'crisis' });
  expect(await boardTotal(page)).toBe('180');
  await expect.poll(() => paintedTotal(page)).toBe('180');

  await tapRegions(page, ['NWK', 'FRM', 'WNM', 'WMS']);
  await expect(patternName(page)).toHaveText('FRONT');
  await expect(page.locator('.lamp.on')).toBeVisible();
  await sweepButton(page).tap();
  await idle(page);

  const cleared = await runInfo(page);
  expect(cleared).toMatchObject({ total: '452', pattern: 'FRONT', leverage: '272', phase: 'briefing', funds: 11 });
  expect(cleared!.brass).toEqual({ WMS: 1 });
  await expect(page.locator('.board-layer .funds .amount')).toHaveText('11');
  await expect(page.locator('.tray-head')).toContainText('BRIEFING');
  await expect(page.locator('.tray-head')).toContainText('STANDOFF');
  // The Briefing's hint holds the board's leverage module for 3.5 s; CLEARED is under it.
  await expect(boardHint(page)).toHaveText('Hire staff. They sit at your table and fire every sweep.');
  await expect(page.locator('.stamp-cleared')).toHaveText('CLEARED', { timeout: 6_000 });
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

// ---------------------------------------------------------------- the sandboxes

test('Late Shift: the Network shows 10.6B on the Big Board', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^LATE SHIFT/ }).tap();
  await fast(page);
  await tapRegions(page, ['EDV', 'MRD', 'TRN', 'GUL', 'LNK']);
  await expect(patternName(page)).toHaveText('NETWORK');
  await expect(page.locator('.readout-layer .pattern-lv')).toHaveText('Lv 6');
  await sweepButton(page).tap();
  await idle(page);
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

// ---------------------------------------------------------------- reduced motion

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a sweep, and a sweep that clears, each finish in 1.2 s or less', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^NEW NIGHT/ }).tap();
    await expect(boardHint(page)).toHaveText('Tap a lit region.', { timeout: 5_000 });

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
