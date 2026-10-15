import { expect, test, type Page } from '@playwright/test';
import { REGION } from '../src/war/content/map';
import { INTRO_COPY, RULES_COPY } from '../src/war/ui/app/copy';
import {
  crisisPool,
  dealState,
  deadDeal,
  decodeOwners,
  hashState,
  hashTrace,
  must,
  newGame,
  pinAll,
  position,
  pushPool,
  pushWinnable,
  SAVE_KEY,
  saveGame,
  send,
  sendOptions,
  setOwners,
  swap,
  tapOrder,
  type GameState,
} from '../src/war/engine';
import { DEAD_PASS_LINE, DEAD_SWAP_LINE, PUSH_LINE, REORDER_LINE } from '../src/war/ui/app/teach';
import { SEAT_W, SEAT_X, SEAT_Y } from '../src/war/ui/common/layout';

/**
 * WIN THE WORLD on a phone and on a desktop, end to end (VITE_GAME=war; `npm run e2e:war`).
 * docs/war/v2/SPEC.md section 15.
 *
 * What a player lives through is driven by real taps: the title buttons, the intro, pins on the map
 * canvas, SEND, the shop cards, the seats (tap, long-press and drag), the menu and the back button.
 * The window.__war hook only sets up positions that would take minutes to reach by hand (an
 * ownership map, a seed), speeds the animation up where the test is not about it, and reads the
 * game back.
 *
 * Every test also fails on any console error, any uncaught exception, and any request that leaves
 * the page's own origin.
 */

// ---------------------------------------------------------------- guards

let problems: string[] = [];

test.beforeEach(async ({ page, baseURL }, info) => {
  // The hotel's config (playwright.config.ts) also looks in e2e/; this file is the war room's.
  test.skip(!info.project.name.startsWith('war'), 'Runs under playwright.war.config.ts (npm run e2e:war).');
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
  if (info.project.name.startsWith('war')) expect(problems, problems.join('\n')).toEqual([]);
});

// ---------------------------------------------------------------- helpers

const PREFS_KEY = 'brink.war.v2.prefs';

/**
 * Load the title and wait for the hook. `device` seeds this device's settings the first time the
 * page loads (a reload keeps whatever the game has stored since): 'new' is a first launch (the
 * intro), 'taught' has seen the intro but not played (PLAY starts FIRST-WORLD), 'veteran' has played
 * (PLAY starts a fresh world).
 */
async function open(page: Page, device: 'new' | 'taught' | 'veteran' = 'new'): Promise<void> {
  if (device !== 'new') {
    const prefs = { speed: 1, motion: 'system', introSeen: true, playedFirst: device === 'veteran', hints: [] };
    await page.addInitScript(
      ([key, value]) => {
        try {
          if (!localStorage.getItem(key)) localStorage.setItem(key, value);
        } catch {
          /* storage blocked: the defaults apply */
        }
      },
      [PREFS_KEY, JSON.stringify(prefs)] as const,
    );
  }
  await page.goto('./');
  await page.waitForFunction(() => !!window.__war);
  await expect(page.getByRole('button', { name: /^(PLAY|CONTINUE)/ })).toBeVisible();
}

/**
 * Load the title with a saved game in progress (a position built by the engine in Node) and CONTINUE
 * it: for positions that would take many turns to reach by hand.
 */
async function openSaved(page: Page, s: GameState): Promise<void> {
  const prefs = { speed: 1, motion: 'system', introSeen: true, playedFirst: true, hints: [] };
  await page.addInitScript(
    ([pk, pv, sk, sv]) => {
      try {
        if (!localStorage.getItem(pk)) {
          localStorage.setItem(pk, pv);
          localStorage.setItem(sk, sv);
        }
      } catch {
        /* storage blocked: the title has nothing to continue */
      }
    },
    [PREFS_KEY, JSON.stringify(prefs), SAVE_KEY, saveGame(s)] as const,
  );
  await page.goto('./');
  await page.waitForFunction(() => !!window.__war);
  await page.getByRole('button', { name: /^CONTINUE/ }).tap();
  await waitFor(page, 'choose', s.turn);
}

/** A point in the 390 x 844 frame, in page coordinates. */
async function framePoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('.war-frame').boundingBox();
  if (!box) throw new Error('the war room is not on screen');
  return { x: box.x + (x / 390) * box.width, y: box.y + (y / 844) * box.height };
}

/** A region's pin on the map canvas, in page coordinates. */
async function regionPoint(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas.map-canvas').boundingBox();
  if (!box) throw new Error('the map is not on screen');
  const r = REGION[id];
  return { x: box.x + (r.x / 390) * box.width, y: box.y + (r.y / 520) * box.height };
}

/** Tap a region's pin with a real touch. */
async function tapRegion(page: Page, id: string): Promise<void> {
  const p = await regionPoint(page, id);
  await page.touchscreen.tap(p.x, p.y);
}

async function tapRegions(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) await tapRegion(page, id);
}

/** Tap SEND (forced: the lever may be beckoning, which Playwright reads as not yet stable). */
async function tapSend(page: Page): Promise<void> {
  await page.locator('button.send').tap({ force: true });
}

/** Wait until no send is playing. */
async function idle(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__war && !window.__war.busy(), null, { timeout: 30_000 });
}

/** Wait for a phase (and turn), e.g. the next turn dealt after an outcome. */
async function waitFor(page: Page, phase: GameState['phase'], turn?: number): Promise<void> {
  await page.waitForFunction(
    ([p, t]) => {
      const s = window.__war?.state();
      return !!s && s.phase === p && (t === null || s.turn === t) && !window.__war!.busy();
    },
    [phase, turn ?? null] as const,
    { timeout: 30_000 },
  );
}

/** A few fields of the game, with BigInts as strings. */
async function info(page: Page) {
  return page.evaluate(() => {
    const s = window.__war!.state();
    if (!s) return null;
    const count = (o: string) => Object.values(s.owner).filter((x) => x === o).length;
    return {
      seed: s.seed,
      mode: s.mode,
      phase: s.phase,
      turn: s.turn,
      coins: s.coins,
      crisis: s.deal.crisis,
      target: String(s.deal.target),
      pins: [...s.deal.pins],
      lit: [...s.deal.lit],
      seats: s.seats.map((x) => x.id),
      owner: { ...s.owner },
      gold: count('gold'),
      red: count('red'),
      ending: s.ending,
      pushMisses: s.pushMisses,
      rerollCost: s.shop?.rerollCost ?? null,
      offers: s.shop ? [...s.shop.offers] : null,
      last: s.lastSend
        ? {
            score: String(s.lastSend.score),
            regions: s.lastSend.regions,
            result: s.lastSend.result,
            won: s.lastSend.won.map((w) => w.id),
            spread: s.lastSend.spread?.id ?? null,
          }
        : null,
    };
  });
}

/** What the map is drawing for the game on show: lit, addable and pinned regions, previews, threads. */
async function drawn(page: Page) {
  return page.evaluate(() => {
    const v = window.__war!.view()!;
    const list = Object.values(v.regions);
    return {
      lit: list.filter((r) => r.lit).map((r) => r.id),
      addable: list.filter((r) => r.addable).map((r) => r.id),
      pinned: list.filter((r) => r.pinned).map((r) => r.id),
      previews: Object.fromEntries(list.filter((r) => r.preview).map((r) => [r.id, `${r.preview!.kind} ${r.preview!.order}`])),
      joins: v.joinedPins.map(([a, b]) => [a, b].sort().join('-')),
      warNext: v.warNext,
      crisis: v.crisis,
      highlight: v.highlight,
    };
  });
}

const sendSub = (page: Page) => page.locator('.send-sub');
/** What the SEND lever says, as one line ('NO SEND CAN WIN · SWAP' is drawn on two). */
const lever = (page: Page) => page.locator('button.send');
const leverSays = (page: Page, text: string) => expect(lever(page)).toHaveAttribute('aria-label', `Send. ${text}`);
const coach = (page: Page) => page.locator('.coach:not(.out) .coach-text');
const goldCount = (page: Page) => page.locator('.goal-count.gold');
const warCount = (page: Page) => page.locator('.goal-count.war');
const box = (page: Page, kind: 'points' | 'mult') => page.locator(`.box.${kind} [role=img]`);
const introLayer = (page: Page, n: number) => page.locator(`.intro-layer[aria-label="How to play, ${n} of 3"]`);

/** Speed the animation up (and optionally drop motion) where a test is not about it. */
async function fast(page: Page, motion: 'full' | 'reduce' = 'full'): Promise<void> {
  await page.evaluate((m) => {
    window.__war!.speed(4);
    window.__war!.motion(m);
  }, motion);
}

/** The intro screen's tap-to-continue is listening (1.5 s in). */
async function introReady(page: Page): Promise<void> {
  await expect(page.locator('.intro-next.on')).toBeVisible({ timeout: 10_000 });
}

/** Average brightness of the map canvas in a 32 x 32 pt box around a region's pin, as drawn now. */
async function plateLuma(page: Page, id: string): Promise<number> {
  return page.evaluate(({ x, y }) => {
    const c = document.querySelector<HTMLCanvasElement>('canvas.map-canvas')!;
    const k = c.width / 390;
    const d = c.getContext('2d')!.getImageData(Math.round((x - 16) * k), Math.round((y - 16) * k), Math.round(32 * k), Math.round(32 * k)).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return sum / (d.length / 4);
  }, REGION[id]);
}

/** Two animation frames: whatever a tap changed has been drawn. */
async function frames(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}

/** Press, hold past the long-press, move in steps, release (a pointer drag). */
async function longDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(420);
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

const seatCentre = (page: Page, seat: number) => framePoint(page, SEAT_X[seat] + SEAT_W / 2, SEAT_Y + 29);

/** No grey left; war holds the last four regions in id order (Tern Isle, Vessary, Wintermast, Wenmoor). */
const PUSH_MAP = 'G'.repeat(26) + 'RRRR';

/**
 * One miss in the final push: the crisis alone, far short of the target. `label` is what SEND must
 * say first. The miss leaves the map as it was; returns once the next turn is dealt (through the
 * shop when one is due), or, on the push's last miss, as soon as SEND is pressed.
 */
async function pushMiss(page: Page, label: string): Promise<void> {
  const before = (await info(page))!;
  await tapRegion(page, before.crisis);
  await expect(sendSub(page)).toHaveText(label);
  await tapSend(page);
  if (label === 'MISS · CEASEFIRE') return;
  await page.waitForFunction(
    (t) => {
      const s = window.__war?.state();
      return !!s && (s.phase === 'shop' || (s.phase === 'choose' && s.turn > t)) && !window.__war!.busy();
    },
    before.turn,
    { timeout: 30_000 },
  );
  const after = (await info(page))!;
  expect(after.owner).toEqual(before.owner);
  expect(after.last).toMatchObject({ result: 'miss', regions: 0 });
  if (after.phase === 'shop') {
    await page.locator('button.next').tap();
    await waitFor(page, 'choose', before.turn + 1);
  }
}

// ---------------------------------------------------------------- the explanation at the start

test('the intro: three screens on the real map, beats follow the lesson, an early tap hurries it, TRY IT starts the coached first turn', async ({ page }) => {
  await open(page, 'new');
  const play = page.getByRole('button', { name: /^PLAY/ });
  await expect(play).toContainText('A short how-to, then your first world');
  await play.tap();

  // Screen 1: the goal, with the live counts on the Big Board.
  await expect(introLayer(page, 1)).toBeVisible();
  await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[1][0]);
  await expect(page.getByRole('button', { name: 'SKIP' })).toBeVisible();
  // Before any crisis exists the console rests: no target, no send label.
  await expect(page.locator('.ro-target')).not.toContainText('64');
  await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 1 of 30 regions');
  await expect(warCount(page)).toHaveAttribute('aria-label', 'War: 3 of 10 regions');
  // A tap before the lesson has played hurries it (2x); it never leaves the screen.
  await page.locator('.intro-layer').tap({ position: { x: 200, y: 600 } });
  await expect(introLayer(page, 1)).toBeVisible();
  await introReady(page);
  await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[1].at(-1)!);
  await page.locator('.intro-layer').tap({ position: { x: 200, y: 600 } });

  // Screen 2: the turn. The ghost finger pins Shoal, Lantern Key, Pebbleby and Marram: WINS 2.
  await expect(introLayer(page, 2)).toBeVisible();
  await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[2][0]);
  await expect(sendSub(page)).toHaveText('WINS 2 REGIONS', { timeout: 10_000 });
  await expect(box(page, 'points')).toHaveAttribute('aria-label', '33');
  await expect(box(page, 'mult')).toHaveAttribute('aria-label', '8');
  expect((await drawn(page)).previews).toEqual({ SHL: 'win 1', PBB: 'win 2' });
  await introReady(page);
  await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[2].at(-1)!);
  await page.locator('.intro-layer').tap({ position: { x: 200, y: 600 } });

  // Screen 3: the outcome, and TRY IT on a first launch.
  await expect(introLayer(page, 3)).toBeVisible();
  await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[3][0]);
  await introReady(page);
  await expect(page.locator('.intro-next .label')).toHaveText('TRY IT');
  await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[3].at(-1)!);
  await page.locator('.intro-layer').tap({ position: { x: 200, y: 600 } });

  // Turn 1 of FIRST-WORLD on the same map, coached.
  await expect(page.locator('.intro-layer')).toHaveCount(0);
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  const s = (await info(page))!;
  expect(s).toMatchObject({ seed: 'FIRST-WORLD', mode: 'first', phase: 'choose', turn: 1, crisis: 'SHL', target: '64', pins: [] });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('brink.war.v2.prefs')!).introSeen)).toBe(true);
});

test('SKIP leaves the intro; HOW TO PLAY replays the three screens, then the rules sheet with PRACTICE', async ({ page }) => {
  await open(page, 'new');
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await expect(introLayer(page, 1)).toBeVisible();
  await page.getByRole('button', { name: 'SKIP' }).tap();
  await expect(page.locator('.intro-layer')).toHaveCount(0);
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  await tapRegion(page, 'SHL');
  expect((await info(page))!.pins).toEqual(['SHL']);

  // Menu > HOW TO PLAY: the three screens again (no TRY IT: the game in hand carries on after).
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /HOW TO PLAY/ }).tap();
  for (const n of [1, 2, 3]) {
    await expect(introLayer(page, n)).toBeVisible();
    await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[n as 1 | 2 | 3][0]);
    await introReady(page);
    await expect(page.locator('.intro-layer .coach-text')).toHaveText(INTRO_COPY[n as 1 | 2 | 3].at(-1)!);
    if (n === 3) await expect(page.locator('.intro-next .label')).toHaveText('TAP TO CONTINUE');
    await page.locator('.intro-layer').tap({ position: { x: 200, y: 600 } });
  }

  // The rules, word for word, over the game as it was.
  const rules = page.getByRole('dialog', { name: 'How to play' });
  await expect(rules).toBeVisible();
  await expect(rules.locator('.rules-goal')).toHaveText(RULES_COPY[0]);
  await expect(rules.locator('.steps li')).toHaveText(RULES_COPY.slice(1));
  expect((await info(page))!.pins).toEqual(['SHL']);

  // PRACTICE starts FIRST-WORLD again, coached.
  await rules.getByRole('button', { name: 'PRACTICE' }).tap();
  await expect(rules).toHaveCount(0);
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  expect((await info(page))!).toMatchObject({ seed: 'FIRST-WORLD', turn: 1, pins: [] });
});

// ---------------------------------------------------------------- the first game, taught by doing

test('FIRST-WORLD turn 1, coached step by step; turn 2; the first shop with 702 / 590 / 2,343', async ({ page }) => {
  await open(page, 'taught');
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  await expect(sendSub(page)).toHaveText('PIN A REGION');
  await expect(page.locator('.ro-line')).toHaveText('PIN THE CRISIS FOR ×2');

  // Step 1: only Shoal can be tapped.
  await tapRegion(page, 'LNK');
  await expect(page.locator('.toast')).toHaveText('Tap the white ring first.');
  expect((await info(page))!.pins).toEqual([]);
  await tapRegion(page, 'SHL');
  expect((await info(page))!.pins).toEqual(['SHL']);
  await expect(box(page, 'points')).toHaveAttribute('aria-label', '7');
  await expect(box(page, 'mult')).toHaveAttribute('aria-label', '2');
  await expect(sendSub(page)).toHaveText('MISS · SHORT BY 50');
  await expect(page.locator('.ro-line')).toHaveText('NEED 50 MORE');
  expect((await drawn(page)).previews).toEqual({ SHL: 'war 1' });

  // Step 2: a lit region touching it. Lantern Key, Pebbleby and Lintel can be added; the rest dim.
  await expect(coach(page)).toHaveText('Now a lit region touching it.');
  const step2 = await drawn(page);
  expect(step2.addable.sort()).toEqual(['LNK', 'LTL', 'PBB']);
  // A coached miss cannot be sent.
  await tapSend(page);
  expect((await info(page))!.phase).toBe('choose');
  await tapRegion(page, 'LNK');
  await expect(box(page, 'points')).toHaveAttribute('aria-label', '17');
  await expect(box(page, 'mult')).toHaveAttribute('aria-label', '4');
  await expect(sendSub(page)).toHaveText('WINS 1 REGION');
  // How far the next region is, worked out: nobody multiplies POINTS by MULTIPLIER in their head.
  await expect(page.locator('.ro-line')).toHaveText('NEXT REGION AT 256 · 188 MORE');
  expect((await drawn(page)).previews).toEqual({ SHL: 'win 1' });
  await expect(coach(page)).toHaveText('68 beats 64. Shoal will turn gold.');

  // Step 3: more pins. Pebbleby (138), then Marram over the dashed sea lane: WINS 2.
  await tapRegion(page, 'PBB');
  await expect(box(page, 'points')).toHaveAttribute('aria-label', '23');
  await expect(box(page, 'mult')).toHaveAttribute('aria-label', '6');
  await expect(sendSub(page)).toHaveText('WINS 1 REGION');
  await tapRegion(page, 'MRM');
  await expect(sendSub(page)).toHaveText('WINS 2 REGIONS');
  await expect(box(page, 'points')).toHaveAttribute('aria-label', '33');
  await expect(box(page, 'mult')).toHaveAttribute('aria-label', '8');
  await expect(page.locator('.ro-line')).toHaveText('NEXT REGION 1,024 · 760 MORE');
  expect((await drawn(page)).previews).toEqual({ SHL: 'win 1', PBB: 'win 2' });
  await expect(coach(page)).toHaveText('Beat it by more: win more regions. Your pins go first.', { timeout: 8_000 });
  // Ghost segments on the GOLD bar show the two regions before SEND.
  await expect(page.locator('.goal-bar.gold .seg.gain')).toHaveCount(2);

  // Step 4-5: SEND. The cascade plays in full; Shoal, then Pebbleby, flood gold.
  await tapSend(page);
  await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 3 of 30 regions', { timeout: 15_000 });
  await waitFor(page, 'choose', 2);
  let s = (await info(page))!;
  expect(s.last).toMatchObject({ score: '264', regions: 2, result: 'win', won: ['SHL', 'PBB'] });
  expect(s).toMatchObject({ coins: 6, gold: 3, crisis: 'TRN', target: '96' });
  expect(s.owner.SHL).toBe('gold');
  expect(s.owner.PBB).toBe('gold');
  await expect(page.locator('.coin-chip')).toHaveAttribute('aria-label', '6 coins');

  // Turn 2: SWAP opens; the only send of 171 that wins 2.
  await expect(page.locator('button.swap')).toHaveAttribute('aria-label', 'Swap, 1 left');
  await tapRegions(page, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL']);
  await expect(sendSub(page)).toHaveText('WINS 2 REGIONS');
  await tapSend(page);
  await waitFor(page, 'shop', 2);
  s = (await info(page))!;
  expect(s).toMatchObject({ coins: 8, gold: 5, offers: ['DUTY', 'QM', 'HARBOUR'] });
  expect(s.last).toMatchObject({ score: '390', regions: 2, won: ['TRN', 'MRD'] });

  // The first shop: fixed offers, each with the best send of the turn just played, rescored.
  await expect(page.locator('.tray-head')).toHaveText(/SHOP\s*·\s*NEXT TARGET\s*140/);
  await expect(page.locator('.offer .name')).toHaveText(['Duty Officer', 'Quartermaster', 'Harbourmaster']);
  await expect(page.locator('.offer .pv-line')).toHaveText(['390→702', '390→590', '390→2,343']);
  await expect(page.locator('.receipt')).toHaveAttribute('aria-label', 'LAST TURN · WIN 2 · +◆2');
  await expect(page.locator('.coach.on-tray .coach-text')).toHaveText('Hire staff. They boost every send. The number shows by how much.');

  // Hire the Harbourmaster: it takes seat 1, marked NEW until its first send.
  await page.locator('.offer').nth(2).tap();
  await expect(page.locator('.seat:not(.empty)')).toHaveCount(1);
  await expect(page.locator('.seat.new .new-tag')).toHaveText('NEW');
  expect((await info(page))!).toMatchObject({ seats: ['HARBOUR'], coins: 2 });

  // NEXT TURN: turn 3, and the war's beat is explained.
  await page.locator('button.next').tap();
  await waitFor(page, 'choose', 3);
  await expect(coach(page)).toHaveText('Every 3rd turn war spreads into the red tag. Pin it in a win to save it.', { timeout: 8_000 });
  expect((await drawn(page)).warNext).toEqual({ id: 'MRM', turns: 1 });
});

test('the touch rule: sea lanes join; a lit region that cannot be added dims within a frame of the tap', async ({ page }) => {
  await open(page, 'taught');
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  // Let the deal's light-up finish so the plates are at rest.
  await page.waitForTimeout(1500);
  await frames(page);

  // Tern Isle is lit and, with nothing pinned, can be pinned: its plate is bright.
  expect((await drawn(page)).addable).toContain('TRN');
  const before = await plateLuma(page, 'TRN');
  await tapRegion(page, 'SHL');
  await frames(page);
  const after = await plateLuma(page, 'TRN');
  const view = await drawn(page);
  expect(view.lit).toContain('TRN');
  expect(view.addable).not.toContain('TRN');
  expect(after).toBeLessThan(before * 0.85);

  // Lintel joins Shoal across a dashed sea lane.
  await tapRegion(page, 'LTL');
  // Morrow Downs joins Tern Isle across a sea lane.
  await tapRegions(page, ['LNK', 'TRN', 'MRD']);
  const s = (await info(page))!;
  expect(s.pins).toEqual(['SHL', 'LTL', 'LNK', 'TRN', 'MRD']);
  const joins = (await drawn(page)).joins;
  expect(joins).toContain('LTL-SHL');
  expect(joins).toContain('MRD-TRN');
  // Five pins: nothing more can be added.
  expect((await drawn(page)).addable).toEqual([]);
});

// ---------------------------------------------------------------- pin it to claim it

test('pin it to claim it: a win takes the crisis, then your own pins, before a nearer region', async ({ page }) => {
  await open(page, 'taught');
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  // Shoal, Lantern Key, Lintel (over the sea lane) and Tallowmere: 264, two regions.
  await tapRegions(page, ['SHL', 'LNK', 'LTL', 'TLM']);
  await expect(sendSub(page)).toHaveText('WINS 2 REGIONS');
  // The map marks what SEND will turn gold: Shoal and the pinned Lintel, not Pebbleby (nearer, not pinned).
  expect((await drawn(page)).previews).toEqual({ SHL: 'win 1', LTL: 'win 2' });
  await page.evaluate(() => window.__war!.speed(4));
  await tapSend(page);
  await waitFor(page, 'choose', 2);
  const s = (await info(page))!;
  expect(s.last).toMatchObject({ score: '264', regions: 2, result: 'win', won: ['SHL', 'LTL'] });
  expect(s.owner.LTL).toBe('gold');
  expect(s.owner.PBB).toBe('grey');
  await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 3 of 30 regions');
});

// ---------------------------------------------------------------- the break, and a full table

test('the CROWN demo scores 5,598,720 and wins 7; then a full table: replace, sell, reroll, drag to reorder', async ({ page }) => {
  await open(page, 'veteran');
  await page.getByRole('button', { name: /^CROWN DEMO/ }).tap();
  await waitFor(page, 'choose', 14);
  let s = (await info(page))!;
  expect(s).toMatchObject({ crisis: 'LTL', target: '12000', seats: ['DUTY', 'DEPUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD'], coins: 6 });
  await expect(page.locator('.ro-target')).toContainText('12,000');

  await tapRegions(page, ['LTL', 'TLM', 'ORN', 'FLE', 'MRM']);
  await expect(sendSub(page)).toHaveText('WINS 7 REGIONS');
  await page.evaluate(() => window.__war!.speed(2));
  await tapSend(page);
  // 466x the target: the showcase stamps the score over the map.
  await expect(page.locator('.showcase .big')).toHaveText('5,598,720', { timeout: 10_000 });
  await waitFor(page, 'shop', 14);
  s = (await info(page))!;
  expect(s.last).toMatchObject({
    score: '5598720',
    regions: 7,
    won: ['LTL', 'DNM', 'BRN', 'ICW', 'EDV', 'ASK', 'VSY'],
  });
  expect(s.coins).toBe(13);
  await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 28 of 30 regions');
  await expect(warCount(page)).toHaveAttribute('aria-label', 'War: 1 of 10 regions');

  // Full table: tapping an offer shows on each seat what replacing it would make; a seat tap hires.
  const slot = s.offers!.indexOf('QM');
  expect(slot).toBeGreaterThanOrEqual(0);
  await page.locator('.offer').nth(slot).tap();
  await expect(page.locator('.replace-tag')).toHaveCount(5);
  await page.locator('.seat:not(.empty)').first().tap();
  await expect(page.locator('.replace-tag')).toHaveCount(0);
  s = (await info(page))!;
  // The Duty Officer sold for ◆1, the Quartermaster cost ◆3.
  expect(s).toMatchObject({ seats: ['QM', 'DEPUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD'], coins: 11 });

  // Sell: tap a seat, then SELL in its balloon (the Herald sells for ◆3).
  await page.locator('.seat:not(.empty)').nth(4).tap();
  await page.locator('.balloon .sell').tap();
  await expect(page.locator('.seat:not(.empty)')).toHaveCount(4);
  expect((await info(page))!).toMatchObject({ seats: ['QM', 'DEPUTY', 'SOVEREIGN', 'HARBOUR'], coins: 14 });

  // Reroll: ◆2, then ◆3.
  await page.locator('button.reroll').tap();
  expect((await info(page))!).toMatchObject({ coins: 12, rerollCost: 3 });
  await expect(page.locator('button.reroll')).toHaveAttribute('aria-label', 'Reroll the offers for 3 coins');

  // Drag the Quartermaster from seat 1 to seat 3; the others slide aside.
  await longDrag(page, await seatCentre(page, 0), await seatCentre(page, 2));
  await expect.poll(async () => (await info(page))!.seats).toEqual(['DEPUTY', 'SOVEREIGN', 'QM', 'HARBOUR']);
});

// ---------------------------------------------------------------- war

test('a miss turns the crisis red and WAR ticks; after turn 3 war spreads by itself to the tagged region', async ({ page }) => {
  await open(page, 'veteran');
  await page.evaluate(() => {
    window.__war!.seed('E2E-MISS');
    window.__war!.speed(4);
  });
  await waitFor(page, 'choose', 1);
  const crisis = (await info(page))!.crisis;

  // Only the crisis: a miss. The map hatches it red and the WAR bar's next segment blinks.
  await tapRegion(page, crisis);
  await expect(sendSub(page)).toHaveText(/^MISS · SHORT BY /);
  expect((await drawn(page)).previews).toEqual({ [crisis]: 'war 1' });
  await expect(page.locator('.goal-bar.war.blink')).toHaveCount(1);
  await tapSend(page);
  await expect(warCount(page)).toHaveAttribute('aria-label', 'War: 4 of 10 regions', { timeout: 15_000 });
  await waitFor(page, 'choose', 2);
  let s = (await info(page))!;
  expect(s.owner[crisis]).toBe('red');
  expect(s.last).toMatchObject({ result: 'miss', regions: 0 });

  // Turn 2 misses too; the shop; turn 3 is war's turn to spread.
  await tapRegion(page, s.crisis);
  await tapSend(page);
  await waitFor(page, 'shop', 2);
  await page.locator('button.next').tap();
  await waitFor(page, 'choose', 3);
  expect((await drawn(page)).warNext!.turns).toBe(1);
  s = (await info(page))!;
  // With the miss pinned, the tag shows where war really goes this turn.
  await tapRegion(page, s.crisis);
  const tag = (await drawn(page)).warNext!;
  expect(tag.turns).toBe(1);
  expect(s.owner[tag.id]).toBe('grey');
  await tapSend(page);
  await waitFor(page, 'choose', 4);
  s = (await info(page))!;
  expect(s.last!.spread).toBe(tag.id);
  expect(s.owner[tag.id]).toBe('red');
  await expect(warCount(page)).toHaveAttribute('aria-label', 'War: 7 of 10 regions');
  // The tag moves on and counts three turns again.
  expect((await drawn(page)).warNext?.turns).toBe(3);
});

// ---------------------------------------------------------------- the endings

test('the three endings: WORLD UNITED, CEASEFIRE and WAR, with NEW GAME and HOME', async ({ page }) => {
  await open(page, 'veteran');
  await page.evaluate(() => window.__war!.speed(4));

  // WORLD UNITED: the last red region won in the final push, with the deal's best send (the
  // engine in Node deals the same position from the same seed and finds it).
  const push = must(setOwners(newGame('E2E-END'), 'G'.repeat(29) + 'R'));
  const best = tapOrder(sendOptions(push)[0].pins);
  await page.evaluate(() => {
    window.__war!.seed('E2E-END');
    window.__war!.setOwner('G'.repeat(29) + 'R');
  });
  expect((await info(page))!.crisis).toBe(push.deal.crisis);
  await tapRegions(page, best);
  expect((await info(page))!.pins).toEqual(best);
  // Worth more on the ladder, but one region is all that is left: the labels never promise more.
  await expect(sendSub(page)).toHaveText('WINS 1 REGION');
  await expect(page.locator('.ro-line')).toHaveText('UNITES THE WORLD');
  await tapSend(page);
  const united = page.getByRole('dialog', { name: 'WORLD UNITED · 30 of 30' });
  await expect(united).toBeVisible({ timeout: 20_000 });
  await expect(united.locator('.report-stars')).toHaveAttribute('aria-label', '3 of 3 stars');
  await expect(united).toContainText('Turn 1 · war peaked at 3');
  await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 30 of 30 regions');

  // NEW GAME: a new deal at once.
  const t0 = Date.now();
  await page.getByRole('button', { name: 'NEW GAME' }).tap();
  await waitFor(page, 'choose', 1);
  expect(Date.now() - t0).toBeLessThan(2000);
  expect((await info(page))!.seed).not.toBe('E2E-END');
  await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 1 of 30 regions');

  // CEASEFIRE: no grey left, and the push misses three times (the final push test below follows it
  // miss by miss). The board ghosts CEASEFIRE before the third.
  await page.evaluate((map) => {
    window.__war!.seed('E2E-END');
    window.__war!.setOwner(map);
  }, PUSH_MAP);
  await pushMiss(page, 'MISS · 2 MISSES LEFT');
  await pushMiss(page, 'MISS · 1 MISS LEFT');
  await pushMiss(page, 'MISS · CEASEFIRE');
  const ceasefire = page.getByRole('dialog', { name: 'CEASEFIRE · 26 of 30 gold' });
  await expect(ceasefire).toBeVisible({ timeout: 20_000 });
  await expect(ceasefire.locator('.report-stars')).toHaveAttribute('aria-label', '2 of 3 stars');
  await expect(ceasefire).toContainText('The final push missed three times.');
  await expect(ceasefire).toContainText('War held 4 regions when it stopped.');

  // HOME: back to the title; a finished game leaves nothing to continue.
  await page.getByRole('button', { name: 'HOME' }).tap();
  await expect(page.getByRole('button', { name: /^PLAY/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toHaveCount(0);

  // WAR: the tenth red region. One grey region was left: it is picked out on the map.
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await waitFor(page, 'choose', 1);
  await page.evaluate(() => {
    window.__war!.seed('E2E-END');
    window.__war!.setOwner('R'.repeat(9) + 'G'.repeat(19) + '..');
  });
  await tapRegion(page, (await info(page))!.crisis);
  await expect(sendSub(page)).toHaveText(/^MISS · SHORT BY /);
  await tapSend(page);
  const war = page.getByRole('dialog', { name: 'WAR' });
  await expect(war).toBeVisible({ timeout: 20_000 });
  await expect(war).toContainText('War took 10 regions. You held 19 of 30.');
  await expect(war).toContainText('Only 1 free region was left to win.');
  await expect(war.locator('.report-stars')).toHaveAttribute('aria-label', 'No stars');
  expect((await drawn(page)).highlight).toEqual(['WNM']);
  await expect(warCount(page)).toHaveAttribute('aria-label', 'War: 10 of 10 regions');
});

test('the final push forgives: three lamps beside WAR, two misses that change nothing, the third a CEASEFIRE', async ({ page }) => {
  await open(page, 'veteran');
  await page.evaluate((map) => {
    window.__war!.seed('E2E-PUSH');
    window.__war!.speed(4);
    window.__war!.setOwner(map);
  }, PUSH_MAP);
  await waitFor(page, 'choose', 1);
  const lamps = page.locator('.push-lamps');
  const lit = page.locator('.push-lamps .lamp.lit');
  // No grey left: the coach says the rule once, and the board lights the push's three lamps, read as lives.
  await expect(coach(page)).toHaveText(PUSH_LINE);
  await expect(lamps).toHaveAttribute('aria-label', 'PUSH · MISSES LEFT: 3 of 3; the last is a ceasefire');
  await expect(lamps.locator('.push-cap')).toHaveText(['PUSH', 'MISSES LEFT']);
  await expect(lit).toHaveCount(3);
  await expect(page.locator('.push-lamps .lamp.out')).toHaveCount(0);
  const start = (await info(page))!;
  expect(start).toMatchObject({ gold: 26, red: 4, pushMisses: 0 });

  // A miss preview blinks the lamp it would put out and hands war nothing (no WAR ghost, no CEASEFIRE ghost).
  await tapRegion(page, start.crisis);
  await expect(sendSub(page)).toHaveText('MISS · 2 MISSES LEFT');
  await expect(page.locator('.push-lamps .lamp.next')).toHaveCount(1);
  await expect(page.locator('.ceasefire-ghost')).toHaveCount(0);
  await expect(page.locator('.goal-bar.war.blink')).toHaveCount(0);
  expect((await drawn(page)).previews).toEqual({});
  await tapRegion(page, start.crisis);

  // Miss one: no region changes, one lamp goes out, the coach counts what is left.
  await pushMiss(page, 'MISS · 2 MISSES LEFT');
  await expect(lit).toHaveCount(2);
  await expect(page.locator('.push-lamps .lamp.out')).toHaveCount(1);
  await expect(lamps).toHaveAttribute('aria-label', 'PUSH · MISSES LEFT: 2 of 3; the last is a ceasefire');
  let s = (await info(page))!;
  expect(s).toMatchObject({ turn: 2, gold: 26, red: 4, pushMisses: 1, ending: null });
  expect(s.owner).toEqual(start.owner);
  await expect(warCount(page)).toHaveAttribute('aria-label', 'War: 4 of 10 regions');

  // Miss two, on turn 2: the shop opens after it, and its receipt says what is left.
  await tapRegion(page, s.crisis);
  await expect(sendSub(page)).toHaveText('MISS · 1 MISS LEFT');
  await tapSend(page);
  await waitFor(page, 'shop', 2);
  await expect(page.locator('.receipt')).toHaveAttribute('aria-label', 'LAST TURN · MISS · 1 MISS LEFT');
  await expect(lit).toHaveCount(1);
  await page.locator('button.next').tap();
  await waitFor(page, 'choose', 3);
  s = (await info(page))!;
  expect(s).toMatchObject({ gold: 26, red: 4, pushMisses: 2 });
  expect(s.owner).toEqual(start.owner);

  // The third: SEND says so, the board ghosts CEASEFIRE, and the last lamp goes out with the war.
  await tapRegion(page, s.crisis);
  await expect(sendSub(page)).toHaveText('MISS · CEASEFIRE');
  await expect(page.locator('.ceasefire-ghost')).toHaveText('CEASEFIRE');
  await tapSend(page);
  const card = page.getByRole('dialog', { name: 'CEASEFIRE · 26 of 30 gold' });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toContainText('The final push missed three times.');
  await expect(card.locator('.report-stars')).toHaveAttribute('aria-label', '2 of 3 stars');
  await expect(lit).toHaveCount(0);
  await expect(page.locator('.war-stopped')).toHaveText('STOPPED');
  expect((await info(page))!).toMatchObject({ ending: 'CEASEFIRE', pushMisses: 3, gold: 26, red: 4 });
});

test('a dead deal says NO SEND CAN WIN · SWAP, SWAP beckons, and after SWAP the deal is asked again', async ({ page }) => {
  // Two positions the engine in Node deals from the same seeds: one a SWAP revives, one it cannot.
  const REVIVED = 'G..GR....R..R.G...RR..GR......';
  const STILL = 'R.GR..R...GG..RG....R....R...R';
  const revived = must(setOwners(newGame('E2E-DEAD-3'), REVIVED));
  const still = must(setOwners(newGame('E2E-DEAD-3'), STILL));
  expect([deadDeal(revived), deadDeal(must(swap(revived)))]).toEqual([true, false]);
  expect([deadDeal(still), deadDeal(must(swap(still)))]).toEqual([true, true]);

  await open(page, 'veteran');
  await page.evaluate((map) => {
    window.__war!.seed('E2E-DEAD-3');
    window.__war!.setOwner(map);
  }, REVIVED);
  await waitFor(page, 'choose', 1);
  expect((await info(page))!.lit).toEqual(revived.deal.lit);
  // Before any pin: the readout and the lever say it plainly, SWAP beckons, the coach explains once
  // (turn 1: no shop follows, so no hire is suggested).
  await expect(page.locator('.ro-line')).toHaveText('NO SEND CAN WIN');
  await expect(page.locator('.ro-line.dead')).toHaveCount(1);
  await leverSays(page, 'NO SEND CAN WIN · SWAP');
  await expect(sendSub(page).locator('.dead-news')).toHaveText('NO SEND CAN WIN');
  await expect(sendSub(page).locator('.dead-act')).toHaveText('SWAP');
  await expect(page.locator('button.send.disabled')).toHaveCount(1);
  await expect(page.locator('button.swap.beckon')).toHaveCount(1);
  await expect(coach(page)).toHaveText(DEAD_SWAP_LINE);
  // Pinned, the lever says what the pins do; SWAP still beckons.
  const crisis = (await info(page))!.crisis;
  await tapRegion(page, crisis);
  await expect(sendSub(page)).toHaveText(/^MISS · SHORT BY /);
  await expect(page.locator('button.swap.beckon')).toHaveCount(1);
  await tapRegion(page, crisis);
  await leverSays(page, 'NO SEND CAN WIN · SWAP');

  // SWAP: the check runs again on the new lit regions, and this deal can be won.
  await page.locator('button.swap').tap({ force: true });
  await expect(sendSub(page)).toHaveText('PIN A REGION');
  await expect(page.locator('.ro-line')).toHaveText('PIN THE CRISIS FOR ×2');
  await expect(page.locator('button.swap.beckon')).toHaveCount(0);
  expect((await info(page))!.lit).toEqual(must(swap(revived)).deal.lit);
});

test('a dead deal SWAP cannot save says how the turn ends: NO SEND CAN WIN · SEND TO PASS, and one pin lets SEND move on', async ({ page }) => {
  const STILL = 'R.GR..R...GG..RG....R....R...R';
  const still = must(swap(must(setOwners(newGame('E2E-DEAD-3'), STILL))));
  expect(deadDeal(still)).toBe(true);

  await open(page, 'veteran');
  await page.evaluate((map) => {
    window.__war!.seed('E2E-DEAD-3');
    window.__war!.setOwner(map);
  }, STILL);
  await waitFor(page, 'choose', 1);
  await leverSays(page, 'NO SEND CAN WIN · SWAP');
  await page.locator('button.swap').tap({ force: true });
  await expect(page.locator('button.swap')).toHaveAttribute('aria-label', 'Swap, used');
  // Still dead: the lever says how to end the turn, the readout says why, SWAP no longer beckons, and
  // the coach (turn 1: no shop follows) says what to do now.
  await leverSays(page, 'NO SEND CAN WIN · SEND TO PASS');
  await expect(sendSub(page).locator('.dead-news')).toHaveText('NO SEND CAN WIN');
  await expect(sendSub(page).locator('.dead-act')).toHaveText('SEND TO PASS');
  await expect(page.locator('.ro-line')).toHaveText('NO SEND CAN WIN');
  await expect(page.locator('button.swap.beckon')).toHaveCount(0);
  await expect(coach(page)).toHaveText(DEAD_PASS_LINE);
  // One pin down and the lever can be pulled: the turn moves on (war takes the crisis).
  const s = (await info(page))!;
  await tapRegion(page, s.crisis);
  await expect(page.locator('button.send.disabled')).toHaveCount(0);
  await expect(sendSub(page)).toHaveText(/^MISS · SHORT BY /);
  await page.evaluate(() => window.__war!.speed(4));
  await tapSend(page);
  await page.waitForFunction(() => window.__war!.state()?.lastSend?.turn === 1 && !window.__war!.busy(), null, { timeout: 30_000 });
  const after = (await info(page))!;
  expect(after.last).toMatchObject({ result: 'miss' });
  expect(after.owner[s.crisis]).toBe('red');
});

test('REORDER STAFF TO WIN: a deal only another seat order wins is not dead; one drag and it wins', async ({ page }) => {
  // The critic's position (CRIT-preview-3, turn 10): as seated (Strategist, Duty Officer, Sovereign)
  // the best send makes 2,052 against 2,500. The Duty Officer first: 27 x 108 = 2,916.
  const crit = position(newGame('CRIT-preview-3'), {
    owner: decodeOwners('G.R.GGR..GR...G.GRGRGGGG.RGG..')!,
    seats: ['STRATEGIST', 'DUTY', 'SOVEREIGN'],
    coins: 3,
    turn: 10,
    oldHandM10: 10,
    deal: {
      crisis: 'GLM',
      lit: ['VSY', 'NWK', 'WMS', 'DRF', 'KLP', 'FRM', 'GUL', 'TRN', 'SHL', 'BRK'],
      pile: ['LNK', 'WNM', 'KLM', 'PBB', 'LTL', 'RMH'],
      target: 2500n,
    },
  });
  expect(dealState(crit)).toBe('reorder');

  await openSaved(page, crit);
  // The readout says a reorder wins, not NO SEND CAN WIN; the two staff that sit elsewhere in a
  // winning order beckon; SWAP does not; the coach says it once. The crisis is in the map's top third,
  // so the coach strip lies along the map's foot, clear of the ring.
  await expect(page.locator('.ro-line')).toHaveText('REORDER STAFF TO WIN');
  await expect(page.locator('.ro-line.reorder')).toHaveCount(1);
  await expect(sendSub(page)).toHaveText('PIN A REGION');
  await expect(page.locator('.seat.beckon')).toHaveCount(2);
  await expect(page.locator('button.swap.beckon')).toHaveCount(0);
  await expect(coach(page)).toHaveText(REORDER_LINE);
  await expect(page.locator('.coach.on-map.low')).toHaveCount(1);
  const strip = (await page.locator('.coach.on-map').boundingBox())!;
  const ring = await regionPoint(page, 'GLM');
  expect(strip.y).toBeGreaterThan(ring.y + 60);

  // A real long-press drag: the Duty Officer to seat 1.
  await longDrag(page, await seatCentre(page, 1), await seatCentre(page, 0));
  await expect.poll(async () => (await info(page))!.seats).toEqual(['DUTY', 'STRATEGIST', 'SOVEREIGN']);
  await expect(page.locator('.ro-line')).toHaveText('PIN THE CRISIS FOR ×2');
  await expect(page.locator('.seat.beckon')).toHaveCount(0);
  await tapRegions(page, ['GLM', 'DRF', 'GUL', 'TRN', 'WMS']);
  await expect(sendSub(page)).toHaveText('WINS 1 REGION');
  await expect(box(page, 'points')).toHaveAttribute('aria-label', '27');
});

test('the final push draws its crisis from the red regions a fresh deal can win', async ({ page }) => {
  // Turn 8 of the push (target 1,100) with a Strategist: of war's four regions, a fresh deal can win
  // Tern Isle and Wintermast (some touching group of up to 5 there reaches 1,100), not Vessary or Wenmoor.
  const s = must(setOwners(position(newGame('E2E-PUSH-DRAW'), { turn: 8, seats: ['STRATEGIST'] }), PUSH_MAP));
  expect([s.turn, s.deal.target, s.deal.finalPush]).toEqual([8, 1100n, true]);
  const red = crisisPool(s.owner).pool;
  expect(red).toEqual(['TRN', 'VSY', 'WMS', 'WNM']);
  expect(pushPool(s.owner, red, ['STRATEGIST'], s.oldHandM10, s.deal.target)).toEqual({ pool: ['TRN', 'WMS'], draw: 'winnable' });
  expect(['TRN', 'WMS']).toContain(s.deal.crisis);

  await openSaved(page, s);
  expect((await info(page))!.crisis).toBe(s.deal.crisis);
  await expect(page.locator('.push-lamps')).toBeVisible();
  // Dealt again and again on the same map (the dev hook's setOwner draws this turn's crisis afresh,
  // from the crisis stream): every crisis is one a fresh deal can win, never Vessary or Wenmoor.
  const seen = new Set<string>([s.deal.crisis]);
  for (let i = 0; i < 8; i++) {
    const c = await page.evaluate((map) => window.__war!.setOwner(map)!.deal.crisis, PUSH_MAP);
    expect(['TRN', 'WMS']).toContain(c);
    expect(pushWinnable(decodeOwners(PUSH_MAP)!, c, ['STRATEGIST'], 10, 1100n)).toBe(true);
    seen.add(c);
  }
  expect((await info(page))!).toMatchObject({ turn: 8, target: '1100', seats: ['STRATEGIST'] });
  expect([...seen].sort()).toEqual(['TRN', 'WMS']);
});

// ---------------------------------------------------------------- the way home

test('the way home: back opens and closes the menu; QUIT TO TITLE asks once; the title shows CONTINUE; a reload resumes', async ({ page }) => {
  await open(page, 'veteran');
  const home = page.url();
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await waitFor(page, 'choose', 1);
  const crisis = (await info(page))!.crisis;
  await tapRegion(page, crisis);
  expect((await info(page))!.pins).toEqual([crisis]);
  const menu = page.getByRole('dialog', { name: 'Menu' });

  // Back opens the menu; back again closes it. The page never leaves.
  await page.goBack();
  await expect(menu).toBeVisible();
  await expect(menu.locator('.menu-line')).toHaveText('Turn 1 · next shop after turn 2');
  expect(page.url()).toBe(home);
  await page.goBack();
  await expect(menu).toHaveCount(0);
  expect(page.url()).toBe(home);
  expect((await info(page))!.pins).toEqual([crisis]);

  // The menu button; QUIT TO TITLE asks; STAY goes back to the menu.
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await menu.getByRole('button', { name: /QUIT TO TITLE/ }).tap();
  const confirm = page.getByRole('alertdialog', { name: 'Leave this game?' });
  await expect(confirm).toContainText('Your game is saved. CONTINUE on the title picks it up.');
  await confirm.getByRole('button', { name: 'STAY' }).tap();
  await expect(menu).toBeVisible();
  const saved = await page.evaluate(() => window.__war!.hash().state);
  await menu.getByRole('button', { name: /QUIT TO TITLE/ }).tap();
  await confirm.getByRole('button', { name: 'LEAVE' }).tap();

  // The title offers to continue the saved game.
  const cont = page.getByRole('button', { name: /^CONTINUE/ });
  await expect(cont).toBeVisible();
  await expect(cont).toContainText('Turn 1 · Gold 1 · War 3');
  await expect(page.getByRole('button', { name: 'NEW GAME' })).toBeVisible();
  expect(page.url()).toBe(home);

  // A reload, then CONTINUE: the same game, pins and all.
  await page.reload();
  await page.waitForFunction(() => !!window.__war);
  await page.getByRole('button', { name: /^CONTINUE/ }).tap();
  await waitFor(page, 'choose', 1);
  expect((await info(page))!.pins).toEqual([crisis]);
  expect(await page.evaluate(() => window.__war!.hash().state)).toBe(saved);
});

test('the way home from How to play: closing the rules on the title never leaves the game', async ({ page }) => {
  // Another page before the game in this tab: a stray history.back() would land on it.
  await page.goto('data:text/html,<p>the page before</p>');
  await open(page, 'taught');
  const home = page.url();
  const rules = page.getByRole('dialog', { name: 'How to play' });
  const fromTitle = async () => {
    await page.getByRole('button', { name: /HOW TO PLAY/ }).tap();
    await expect(introLayer(page, 1)).toBeVisible();
    await page.getByRole('button', { name: 'SKIP' }).tap();
    await expect(rules).toBeVisible();
  };
  const closes: Array<[string, () => Promise<void>]> = [
    ['CLOSE', () => rules.getByRole('button', { name: /^CLOSE/ }).tap()],
    ['the X', () => rules.getByRole('button', { name: 'Close', exact: true }).tap()],
    ['the scrim', () => page.locator('.scrim').tap({ position: { x: 10, y: 10 } })],
  ];
  for (const [how, close] of closes) {
    await fromTitle();
    await close();
    await expect(rules, how).toHaveCount(0);
    // Long enough for a history.back() to have landed.
    await page.waitForTimeout(500);
    expect(page.url(), how).toBe(home);
    await expect(page.getByRole('button', { name: /^PLAY/ }), how).toBeVisible();
  }

  // PRACTICE from the same sheet, then QUIT TO TITLE: still the game's page, with CONTINUE.
  await fromTitle();
  await rules.getByRole('button', { name: 'PRACTICE' }).tap();
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /QUIT TO TITLE/ }).tap();
  await page.getByRole('alertdialog', { name: 'Leave this game?' }).getByRole('button', { name: 'LEAVE' }).tap();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toBeVisible();
  await page.waitForTimeout(500);
  expect(page.url()).toBe(home);
});

test('PRACTICE never loses a game in progress, and NEW GAME asks before it would', async ({ page }) => {
  await open(page, 'veteran');
  await page.getByRole('button', { name: /^PLAY/ }).tap();
  await waitFor(page, 'choose', 1);
  const crisis = (await info(page))!.crisis;
  await tapRegion(page, crisis);
  await tapSend(page);
  await waitFor(page, 'choose', 2);
  const game = (await info(page))!;

  // Menu > HOW TO PLAY > SKIP: over a game, BACK is the bright button and PRACTICE the quiet one.
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /HOW TO PLAY/ }).tap();
  await page.getByRole('button', { name: 'SKIP' }).tap();
  const rules = page.getByRole('dialog', { name: 'How to play' });
  await expect(rules.locator('button.brass')).toHaveText('BACK');
  await rules.getByRole('button', { name: 'PRACTICE' }).tap();
  await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
  expect((await info(page))!).toMatchObject({ seed: 'FIRST-WORLD', turn: 1 });

  // Leaving the practice says it is not saved; the title still continues the real game.
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /QUIT TO TITLE/ }).tap();
  const confirm = page.getByRole('alertdialog', { name: 'Leave this game?' });
  await expect(confirm).toContainText('LEAVE PRACTICE?');
  await expect(confirm).toContainText('Practice is not saved.');
  await confirm.getByRole('button', { name: 'LEAVE' }).tap();
  const cont = page.getByRole('button', { name: /^CONTINUE/ });
  await expect(cont).toContainText('Turn 2');

  // NEW GAME over it asks once; KEEP MY GAME keeps it.
  await page.getByRole('button', { name: 'NEW GAME' }).tap();
  const ask = page.getByRole('alertdialog', { name: 'Start a new game?' });
  await expect(ask).toContainText('Your game in progress will be lost.');
  await ask.getByRole('button', { name: 'KEEP MY GAME' }).tap();
  await expect(ask).toHaveCount(0);
  await cont.tap();
  await waitFor(page, 'choose', 2);
  expect((await info(page))!).toMatchObject({ seed: game.seed, turn: 2, crisis: game.crisis });
});

test('a reload during the game-ending send still shows how the world ended, once', async ({ page }) => {
  await open(page, 'veteran');
  await page.evaluate((map) => {
    window.__war!.seed('E2E-END');
    window.__war!.speed(4);
    window.__war!.setOwner(map);
  }, PUSH_MAP);
  // Two push misses are forgiven; the third ends the game.
  await pushMiss(page, 'MISS · 2 MISSES LEFT');
  await pushMiss(page, 'MISS · 1 MISS LEFT');
  await page.evaluate(() => window.__war!.speed(1));
  await pushMiss(page, 'MISS · CEASEFIRE');
  // The tab is reloaded (or killed) while the last send plays.
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForFunction(() => !!window.__war);
  const cont = page.getByRole('button', { name: /^CONTINUE/ });
  await expect(cont).toContainText('See how your world ended');
  await cont.tap();
  await expect(page.getByRole('dialog', { name: 'CEASEFIRE · 26 of 30 gold' })).toBeVisible({ timeout: 20_000 });
  // Seen: the finished game is done with.
  await page.getByRole('button', { name: 'HOME' }).tap();
  await expect(page.getByRole('button', { name: /^PLAY/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toHaveCount(0);
  await page.reload();
  await page.waitForFunction(() => !!window.__war);
  await expect(page.getByRole('button', { name: /^PLAY/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toHaveCount(0);
});

test('HOW TO PLAY from the menu during a send: the send settles, the intro plays, BACK finds the next turn', async ({ page }) => {
  await open(page, 'veteran');
  const start = newGame('E2E-HOW');
  const best = tapOrder(sendOptions(start)[0].pins);
  await page.evaluate(() => window.__war!.seed('E2E-HOW'));
  await waitFor(page, 'choose', 1);
  await tapRegions(page, best);
  await tapSend(page);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__war!.busy())).toBe(true);
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /HOW TO PLAY/ }).tap();
  await expect(introLayer(page, 1)).toBeVisible({ timeout: 10_000 });
  // Nothing of the send is dealt under the intro.
  expect((await info(page))!.turn).toBe(1);
  await page.getByRole('button', { name: 'SKIP' }).tap();
  const rules = page.getByRole('dialog', { name: 'How to play' });
  await expect(rules).toBeVisible();
  await rules.getByRole('button', { name: /^BACK/ }).tap();
  await waitFor(page, 'choose', 2);
  const s = (await info(page))!;
  expect(s.last).toMatchObject({ result: 'win' });
  await expect(goldCount(page)).toHaveAttribute('aria-label', `Gold: ${s.gold} of 30 regions`);
});

// ---------------------------------------------------------------- fit, motion, determinism

test.describe('a phone browser with its toolbars showing', () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test('the war room fills the height: the live area is fitted and the desk runs on to the edges', async ({ page }) => {
    await open(page, 'veteran');
    await page.getByRole('button', { name: /^PLAY/ }).tap();
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

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a send, its outcome and the next deal finish within 1.2 s', async ({ page }) => {
    await open(page, 'taught');
    await page.getByRole('button', { name: /^PLAY/ }).tap();
    await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
    await tapRegions(page, ['SHL', 'LNK', 'PBB', 'MRM']);
    await expect(sendSub(page)).toHaveText('WINS 2 REGIONS');

    // Press SEND and time it until the war room takes input again.
    const ms = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const t0 = performance.now();
          document.querySelector<HTMLButtonElement>('button.send')!.click();
          const tick = () => (window.__war!.busy() ? requestAnimationFrame(tick) : resolve(performance.now() - t0));
          requestAnimationFrame(tick);
        }),
    );
    expect(ms).toBeLessThanOrEqual(1200);
    expect((await info(page))!.gold).toBe(3);
    await expect(goldCount(page)).toHaveAttribute('aria-label', 'Gold: 3 of 30 regions');
    // No flying numbers, no shake: nothing moved the war room.
    expect(await page.locator('.war-shake').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

test('determinism: the same seed and actions give the same state and trace hashes, twice and in Node', async ({ page }) => {
  // The same games played in Node by the engine itself.
  const play = (seed: string, pins: (s: GameState) => string[]) => {
    const s = newGame(seed);
    const r = send(pinAll(s, pins(s)));
    if (!r.ok) throw new Error(r.reason);
    return { trace: hashTrace(r.state.lastSend!.trace), state: hashState(r.state) };
  };
  const nodeFirst = play('FIRST-WORLD', () => ['SHL', 'LNK', 'PBB', 'MRM']);
  const nodeOther = play('E2E-DETERMINISM', (s) => [s.deal.crisis]);

  const inBrowser = async () => {
    await page.waitForFunction(() => !!window.__war);
    await fast(page, 'reduce');
    return page.evaluate(async () => {
      const w = window.__war!;
      w.seed('FIRST-WORLD');
      w.pin(['SHL', 'LNK', 'PBB', 'MRM']);
      await w.send();
      const first = w.hash();
      const s = w.seed('E2E-DETERMINISM');
      w.pin([s.deal.crisis]);
      await w.send();
      return { first, other: w.hash() };
    });
  };
  await open(page, 'veteran');
  const a = await inBrowser();
  await page.reload();
  const b = await inBrowser();

  expect(a.first.trace).toMatch(/^[0-9a-f]{8}$/);
  expect(b).toEqual(a);
  expect(a.first).toEqual(nodeFirst);
  expect(a.other).toEqual(nodeOther);
});

// ---------------------------------------------------------------- desktop

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false, deviceScaleFactor: 1 });

  test('mouse and keys: the hand over pinnable regions, Space sends, S swaps, 1-5 and arrows move a seat, Esc opens the menu', async ({ page }) => {
    await open(page, 'taught');
    await expect(page.locator('.war-bezel')).toHaveCount(1);
    await page.getByRole('button', { name: /^PLAY/ }).click();
    await expect(coach(page)).toHaveText('Tap the crisis: the white ring.', { timeout: 8_000 });
    const canvas = page.locator('canvas.map-canvas');

    // The cursor is a hand over a region that can be pinned, and an arrow over one that cannot.
    const shl = await regionPoint(page, 'SHL');
    await page.mouse.move(shl.x, shl.y);
    await expect(canvas).toHaveCSS('cursor', 'pointer');
    await page.mouse.click(shl.x, shl.y);
    const trn = await regionPoint(page, 'TRN');
    await page.mouse.move(trn.x, trn.y);
    await expect(canvas).toHaveCSS('cursor', 'default');
    for (const id of ['LNK', 'PBB', 'MRM']) {
      const p = await regionPoint(page, id);
      await page.mouse.click(p.x, p.y);
    }
    await expect(sendSub(page)).toHaveText('WINS 2 REGIONS');

    // Space sends.
    await page.evaluate(() => window.__war!.speed(4));
    await page.keyboard.press('Space');
    await waitFor(page, 'choose', 2);
    expect((await info(page))!.gold).toBe(3);

    // S swaps (once a turn).
    await page.keyboard.press('s');
    await expect(page.locator('button.swap')).toHaveAttribute('aria-label', 'Swap, used');

    // Esc opens the menu and closes it again.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);

    // Two staff from the first shop, then 2 and ArrowLeft move the second one to seat 1.
    const s = (await info(page))!;
    await page.evaluate((pins) => window.__war!.pin(pins), ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'].filter((id) => s.lit.includes(id) || id === s.crisis));
    await page.evaluate(async () => {
      await window.__war!.send();
    });
    await waitFor(page, 'shop', 2);
    await page.locator('.offer', { hasText: 'Duty Officer' }).click();
    await page.locator('.offer', { hasText: 'Quartermaster' }).click();
    expect((await info(page))!.seats).toEqual(['DUTY', 'QM']);
    await page.keyboard.press('2');
    await expect(page.locator('.balloon .b-name')).toHaveText('Quartermaster');
    await page.keyboard.press('ArrowLeft');
    expect((await info(page))!.seats).toEqual(['QM', 'DUTY']);
  });
});
