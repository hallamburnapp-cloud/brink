import { expect, test, type Page } from '@playwright/test';
import { loadThirtyContent } from '../src/thirty/content/load';
import type { ThirtyContent } from '../src/thirty/content/types';
import { choose, danger, newGame, pick, preview, tapRegion, todayCard, type DealtCard, type GameState } from '../src/thirty/engine';
import type { ThirtyHook } from '../src/thirty/ui/app/devHook';

/**
 * BRINK: THIRTY DAYS on a phone and on a desktop, end to end (VITE_GAME=thirty; `npm run e2e:thirty`).
 * docs/thirty-days/SPEC.md.
 *
 * What a player lives through is driven by real taps: the title buttons, the explanation, the two
 * buttons on the card, a glowing place on the map canvas, the team offer, a chip, the menu, the
 * back button. The window.__thirty hook only sets up positions that would take minutes to reach by
 * hand (a seed, a day's card, a map on the edge of war) and reads the game back.
 *
 * Every test also fails on any console error, any uncaught exception, and any request that leaves
 * the page's own origin (the game makes no network requests of its own).
 */

declare global {
  interface Window {
    __thirty?: ThirtyHook;
  }
}

// ---------------------------------------------------------------- guards

let problems: string[] = [];

test.beforeEach(async ({ page, baseURL }, info) => {
  // The hotel's config (playwright.config.ts) also looks in e2e/; this file is THIRTY DAYS'.
  test.skip(!info.project.name.startsWith('thirty'), 'Runs under playwright.thirty.config.ts (npm run e2e:thirty).');
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
  if (info.project.name.startsWith('thirty')) expect(problems, problems.join('\n')).toEqual([]);
});

// ---------------------------------------------------------------- the pack, in Node

/** The same pack the build compiled, read in Node: for choosing seeds and for the determinism check. */
const { content } = loadThirtyContent();

// ---------------------------------------------------------------- helpers

const PREFS_KEY = 'brink.thirty.v1.prefs';

/**
 * Load the title and wait for the hook. 'new' is a first launch (PLAY opens the explanation);
 * 'taught' has seen it (PLAY starts day 1).
 */
async function open(page: Page, device: 'new' | 'taught' = 'taught'): Promise<void> {
  if (device === 'taught') {
    await page.addInitScript(
      ([key, value]) => {
        try {
          if (!localStorage.getItem(key)) localStorage.setItem(key, value);
        } catch {
          /* storage blocked: the defaults apply */
        }
      },
      [PREFS_KEY, JSON.stringify({ explained: true })] as const,
    );
  }
  await page.goto('./');
  await page.waitForFunction(() => !!window.__thirty);
  await expect(page.getByRole('button', { name: /^(PLAY|CONTINUE)/ })).toBeVisible();
}

/** Start a game on a seed through the hook (the title's PLAY, with a chosen seed). */
async function seed(page: Page, s: string): Promise<GameState> {
  const state = await page.evaluate((x) => window.__thirty!.seed(x), s);
  await settle(page);
  return state;
}

/** Wait until no day is playing. */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => !!window.__thirty && !window.__thirty.busy(), null, { timeout: 30_000 });
  await page.waitForTimeout(120);
}

async function state(page: Page): Promise<GameState> {
  const s = await page.evaluate(() => window.__thirty!.state());
  if (!s) throw new Error('no game on the table');
  return s;
}

/** A card put on the table through the hook, as the engine would have dealt it. */
function dealt(id: string, region: string | null): DealtCard {
  return { id, region, roll: 0.5, alarmFalse: false, alarm: 'none', arrival: [] };
}

/** Patch the game on the table (through the save format, so only a sound state is taken). */
async function set(page: Page, patch: Partial<GameState>): Promise<GameState> {
  const s = await page.evaluate((p) => window.__thirty!.set(p), patch);
  if (!s) throw new Error('the hook refused the patch');
  await page.waitForTimeout(150);
  return s;
}

/** A point in the 390 x 844 frame, in page coordinates. */
async function framePoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('.frame').boundingBox();
  if (!box) throw new Error('the frame is not on screen');
  return { x: box.x + (x / 390) * box.width, y: box.y + (y / 844) * box.height };
}

/** Tap a region's centre on the map canvas with a real touch. */
async function tapMap(page: Page, id: string): Promise<void> {
  const c = await page.evaluate((r) => window.__thirty!.centre(r), id);
  if (!c) throw new Error(`no centre for ${id}`);
  const p = await framePoint(page, c.x, c.y);
  await page.touchscreen.tap(p.x, p.y);
}

const choice = (page: Page, side: 'left' | 'right') => page.locator('.card .choice').nth(side === 'left' ? 0 : 1);
const gauge = (page: Page) => page.getByRole('meter', { name: 'Danger' });

async function gaugeValue(page: Page): Promise<number> {
  return Number(await gauge(page).getAttribute('aria-valuenow'));
}

/** All heats CALM. */
function calmMap(s: GameState): GameState['heats'] {
  return Object.fromEntries(Object.keys(s.heats).map((k) => [k, 0])) as GameState['heats'];
}

/**
 * The first seed (E2E-<name>-n) whose day 1 offers a button with this tag that moves DANGER the
 * given way, with the side: so the tests that tap a real day-1 button know what they are tapping.
 */
function seedWith(name: string, tag: string, direction: 'down' | 'up'): { seed: string; side: 'left' | 'right'; hint: string } {
  for (let n = 0; n < 200; n++) {
    const s = `E2E-${name}-${n}`;
    const g = newGame(content, s);
    for (const side of ['left', 'right'] as const) {
      const p = preview(content, g, side);
      if (!p || p.tag !== tag || p.odds !== null) continue;
      if (direction === 'down' ? p.dangerAfter < p.dangerBefore : p.dangerAfter > p.dangerBefore) return { seed: s, side, hint: p.hint };
    }
  }
  throw new Error(`no seed with a ${tag} day 1 that moves DANGER ${direction}`);
}

/** FNV-1a over the state's JSON: the same function runs in Node and in the page. */
function hashState(s: unknown): string {
  const text = JSON.stringify(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The fixed policy of the determinism test: the left button (the first glowing place on a map
 * day), the first piece at every offer, until the day is past `days` or the game ends.
 */
function playInNode(c: ThirtyContent, s0: string, days: number): GameState {
  let s = newGame(c, s0);
  while (s.phase !== 'over' && s.day <= days) {
    if (s.phase === 'offer') {
      const r = pick(c, s, 0);
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
      continue;
    }
    const card = todayCard(c, s);
    if (!card) throw new Error('no card');
    // On a map day the first glowing place in the map's own order (the page finds it the same way).
    const target = card.map ? Object.keys(s.heats).find((id) => card.targets.some((t) => t.region === id)) : null;
    const r = card.map ? tapRegion(c, s, target!) : choose(c, s, 'left');
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
  }
  return s;
}

// ---------------------------------------------------------------- the first minute

test('the title, the explanation and day 1 with real taps; the game screen is exactly four things', async ({ page }) => {
  await open(page, 'new');
  await expect(page.locator('.title-name')).toHaveText('BRINK');
  await expect(page.locator('.title-line')).toHaveText('THIRTY DAYS');
  await expect(page.getByRole('button', { name: 'HOW TO PLAY' })).toBeVisible();
  await expect(page.getByRole('button', { name: /CONTINUE/ })).toHaveCount(0);

  // PLAY: the explanation, over the live map.
  await page.getByRole('button', { name: 'PLAY', exact: true }).tap();
  await expect(page.locator('.offer-title')).toHaveText('HOW TO PLAY');
  await expect(page.getByText('The world is sliding towards war. You lead the Republic. Each day, one decision.')).toBeVisible();
  await expect(page.getByText('Keep DANGER below 100 for thirty days. Calm the whole map and the crisis ends early.')).toBeVisible();
  await expect(page.locator('.map canvas')).toBeVisible();
  await page.getByRole('button', { name: 'NEXT' }).tap();
  await expect(page.getByText('Your advisers make your decisions count for more. Choose them well.')).toBeVisible();
  await expect(page.locator('.team.slots .slot')).toHaveCount(3);
  await page.getByRole('button', { name: 'BEGIN DAY 1' }).tap();

  // Day 1: the strip, the map and the card; no team yet, so the team row is not there. Nothing else.
  await expect(page.locator('.day')).toHaveText('DAY 1 OF 30');
  const s = await state(page);
  expect(s.day).toBe(1);
  expect(s.phase).toBe('choose');
  expect(await gaugeValue(page)).toBe(danger(s));
  const things = page.locator('.table > *');
  await expect(things).toHaveCount(3);
  await expect(things.nth(0)).toHaveClass(/\bstrip\b/);
  await expect(things.nth(1)).toHaveClass(/\bmap\b/);
  await expect(things.nth(2)).toHaveClass(/\bcard\b/);
  // The card: the adviser's name and role, a message under 40 words, two buttons, each an action and a hint.
  const card = todayCard(content, s);
  if (!card || card.map) throw new Error('day 1 is a choice card');
  const adviser = content.advisers[card.adviser];
  await expect(page.locator('.adviser .who')).toHaveText(adviser.name);
  await expect(page.locator('.adviser .role')).toHaveText(adviser.role);
  await expect(page.locator('.card .message')).toHaveText(card.text);
  expect(card.text.split(/\s+/).length).toBeLessThanOrEqual(40);
  await expect(page.locator('.card .choice')).toHaveCount(2);
  await expect(choice(page, 'left').locator('.action')).toHaveText(card.left.text);
  await expect(choice(page, 'right').locator('.action')).toHaveText(card.right.text);
  await expect(choice(page, 'left').locator('.hint')).not.toBeEmpty();
  // The explanation is remembered: HOW TO PLAY from the menu replays it, PLAY on a new game will not.
  const prefs = await page.evaluate((k) => localStorage.getItem(k), PREFS_KEY);
  expect(JSON.parse(prefs ?? '{}')).toEqual({ explained: true });
});

// ---------------------------------------------------------------- the choices

test('a calming choice: the hint says Danger down, today\'s region cools, the gauge falls and the delta floats', async ({ page }) => {
  const pick1 = seedWith('CALM', 'CALM', 'down');
  await open(page);
  const before = await seed(page, pick1.seed);
  const card = todayCard(content, before)!;
  if (card.map) throw new Error('a choice card');
  const btn = choice(page, pick1.side);
  await expect(btn.locator('.hint')).toHaveText(pick1.hint);
  expect(pick1.hint).toMatch(/^Danger down/);
  const region = before.card!.region!;
  const gaugeBefore = await gaugeValue(page);

  await btn.tap();
  // The delta floats beside the needle for a second: a minus sign and the amount.
  await expect(page.locator('.gauge-delta')).toHaveText(/^−\d+$/, { timeout: 5_000 });
  await settle(page);

  const after = await state(page);
  const trace = after.log[after.log.length - 1];
  expect(trace.choice).toBe(pick1.side);
  expect(trace.tag).toBe('CALM');
  expect(trace.dangerAfterChoice).toBeLessThan(trace.dangerBefore);
  expect(trace.dangerBefore).toBe(gaugeBefore);
  const cooled = trace.steps.find((st) => st.kind === 'heat' && st.region === region && st.why === 'choice');
  expect(cooled && cooled.kind === 'heat' && cooled.to < cooled.from).toBeTruthy();
  // The screen has moved on: day 2 (or the offer), and the gauge reads the engine's DANGER.
  expect(after.day).toBe(2);
  await expect(page.locator('.day')).toHaveText('DAY 2 OF 30');
  expect(await gaugeValue(page)).toBe(danger(after));
});

test('a heating choice: the hint says Danger up, the neighbour heats and the gauge rises', async ({ page }) => {
  await open(page);
  const g = await seed(page, 'E2E-HEAT');
  // The Shoal strait card, with the strait and Lintel both calm: escorting the tankers heats Lintel and nothing cools.
  const heats = { ...g.heats, SHL: 0 as const, LTL: 0 as const };
  await set(page, { phase: 'choose', offer: null, ending: null, day: 7, team: [], heats, card: dealt('strait-01', 'SHL') });
  const p = await page.evaluate(() => window.__thirty!.preview('left'));
  expect(p?.tag).toBe('FORCE');
  expect(p!.dangerAfter).toBeGreaterThan(p!.dangerBefore);
  expect(p!.hint).toMatch(/^Danger up/);
  await expect(choice(page, 'left').locator('.hint')).toHaveText(p!.hint);
  await expect(choice(page, 'left').locator('.action')).toHaveText('Escort the tankers through');

  await choice(page, 'left').tap();
  await expect(page.locator('.gauge-delta')).toHaveText(/^\+\d+$/, { timeout: 5_000 });
  await settle(page);

  const after = await state(page);
  const trace = after.log[after.log.length - 1];
  expect(trace.tag).toBe('FORCE');
  expect(trace.dangerAfterChoice).toBeGreaterThan(trace.dangerBefore);
  const heated = trace.steps.find((st) => st.kind === 'heat' && st.region === 'LTL' && st.why === 'choice');
  expect(heated && heated.kind === 'heat' && heated.to > heated.from).toBeTruthy();
  expect(after.heats.LTL).toBeGreaterThanOrEqual(1);
  expect(await gaugeValue(page)).toBe(danger(after));
});

test('a map day: the card says to tap, the glowing place is tapped on the map and the day plays', async ({ page }) => {
  await open(page);
  await seed(page, 'E2E-MAP');
  await set(page, { phase: 'choose', offer: null, ending: null, day: 4, card: dealt('fleet-map', null) });
  const card = content.cards['fleet-map'];
  if (!card.map) throw new Error('fleet-map is a map card');
  await expect(page.locator('.card .message')).toHaveText(card.text);
  await expect(page.locator('.card .choice')).toHaveCount(0);
  await expect(page.locator('.tap-line .action')).toHaveText('Tap one of the glowing places on the map');
  // The places are named on the card as well as glowing on the map.
  await expect(page.locator('.tap-line .hint')).toContainText('Shoal');

  const before = await state(page);
  await tapMap(page, 'SHL');
  // The tapped place is named while the day plays.
  await expect(page.locator('.tap-line .action')).toHaveText(/Shoal/, { timeout: 5_000 });
  await settle(page);
  const after = await state(page);
  const trace = after.log[after.log.length - 1];
  expect(trace.choice).toEqual({ tapped: 'SHL' });
  expect(trace.card).toBe('fleet-map');
  expect(after.day).toBe(before.day + 1);

  // A place the card does not offer does nothing.
  const dayNow = after.day;
  await tapMap(page, 'WMS');
  await page.waitForTimeout(400);
  expect((await state(page)).day).toBe(dayNow);
});

test('a risky choice: the hint shows the odds, the roll\'s result shows on the hint line', async ({ page }) => {
  await open(page);
  const g = await seed(page, 'E2E-RISK');
  const heats = { ...g.heats, NWK: 2 as const };
  await set(page, { phase: 'choose', offer: null, ending: null, day: 9, team: [], heats, card: dealt('northwake-02', 'NWK') });
  const p = await page.evaluate(() => window.__thirty!.preview('left'));
  expect(p?.tag).toBe('RISKY');
  expect(typeof p?.odds).toBe('number');
  expect(p!.hint).toMatch(new RegExp(`${p!.odds}%`));
  await expect(choice(page, 'left').locator('.hint')).toHaveText(p!.hint);

  await choice(page, 'left').tap();
  // After the needle's sweep the result stands on the hint line for a second.
  await expect(choice(page, 'left').locator('.hint')).toHaveText(/^Held$|^Missed by \d+%$/, { timeout: 5_000 });
  await settle(page);
  const after = await state(page);
  const trace = after.log[after.log.length - 1];
  const roll = trace.steps.find((st) => st.kind === 'roll');
  expect(roll && roll.kind === 'roll' && roll.odds === p!.odds).toBeTruthy();
  expect(after.day).toBe(10);
});

// ---------------------------------------------------------------- the team

test('the team offer: three people, one taken, the chip in the row and its rule on a tap', async ({ page }) => {
  await open(page);
  await seed(page, 'E2E-TEAM');
  await expect(page.locator('.team')).toHaveCount(0);
  const offer = ['old-ambassador', 'hotline', 'spin-doctor'];
  await set(page, { phase: 'offer', card: null, ending: null, offer, team: [], day: 5 });
  await expect(page.locator('.offer-title')).toHaveText('YOUR TEAM');
  const pieces = page.locator('.card .choice.piece');
  await expect(pieces).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const piece = content.pieces[offer[i]];
    await expect(pieces.nth(i).locator('.action')).toHaveText(piece.name);
    await expect(pieces.nth(i).locator('.hint')).toHaveText(piece.rule);
  }
  await expect(page.getByRole('button', { name: 'No one this time' })).toBeVisible();

  await pieces.nth(0).tap();
  await settle(page);
  const s = await state(page);
  expect(s.team).toEqual(['old-ambassador']);
  expect(s.day).toBe(6);
  expect(s.phase).toBe('choose');
  // The team row is the fourth thing on the screen now.
  await expect(page.locator('.table > *')).toHaveCount(4);
  const chips = page.locator('.team .chip');
  await expect(chips).toHaveCount(1);
  await expect(chips.nth(0)).toHaveText(content.pieces['old-ambassador'].chip);
  await chips.nth(0).tap();
  await expect(page.locator('.team.rule .rule-text')).toHaveText(content.pieces['old-ambassador'].rule);
  await page.locator('.team.rule').tap();
  await expect(chips).toHaveCount(1);

  // The hint line shows the piece at work before the choice, in words.
  const previews = await page.evaluate(() => [window.__thirty!.preview('left'), window.__thirty!.preview('right')]);
  for (const p of previews) if (p && p.pieces.includes('old-ambassador')) expect(p.hint).toMatch(/calms|Danger down/);
});

// ---------------------------------------------------------------- the save, the menu, the way home

test('the game is saved after every day: a reload shows CONTINUE and resumes the same day', async ({ page }) => {
  const pick1 = seedWith('SAVE', 'CALM', 'down');
  await open(page);
  await seed(page, pick1.seed);
  await choice(page, pick1.side).tap();
  await settle(page);
  expect((await state(page)).day).toBe(2);

  await page.reload();
  await page.waitForFunction(() => !!window.__thirty);
  const cont = page.getByRole('button', { name: /^CONTINUE/ });
  await expect(cont).toBeVisible();
  await expect(cont).toContainText('Day 2 of 30');
  await expect(page.getByRole('button', { name: 'NEW GAME' })).toBeVisible();
  await cont.tap();
  await settle(page);
  await expect(page.locator('.day')).toHaveText('DAY 2 OF 30');
  const s = await state(page);
  expect(s.seed).toBe(pick1.seed);
  expect(s.day).toBe(2);
  expect(s.log).toHaveLength(1);
});

test('the menu: the ≡ button, Esc and the back button open it; QUIT TO TITLE asks once; the title shows CONTINUE', async ({ page }) => {
  await open(page);
  await seed(page, 'E2E-MENU');
  const menu = page.getByRole('dialog', { name: 'Menu' });

  await page.getByRole('button', { name: 'Menu' }).tap();
  await expect(menu).toBeVisible();
  for (const name of ['RESUME', 'HOW TO PLAY', 'SOUND', 'QUIT TO TITLE']) await expect(menu.getByRole('button', { name })).toBeVisible();
  await menu.getByRole('button', { name: 'RESUME' }).tap();
  await expect(menu).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  // The phone's back button opens the menu instead of leaving the game.
  await page.goBack();
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await menu.getByRole('button', { name: 'RESUME' }).tap();
  await expect(menu).toBeHidden();
  await expect(page.locator('.day')).toHaveText('DAY 1 OF 30');

  // HOW TO PLAY from the menu replays the explanation over the game, and BEGIN DAY 1 finds the game.
  await page.getByRole('button', { name: 'Menu' }).tap();
  await menu.getByRole('button', { name: 'HOW TO PLAY' }).tap();
  await expect(page.getByText('The world is sliding towards war. You lead the Republic. Each day, one decision.')).toBeVisible();
  await page.getByRole('button', { name: 'SKIP' }).tap();
  await expect(page.locator('.card .choice')).toHaveCount(2);

  // QUIT TO TITLE asks once; STAY returns to the menu; LEAVE goes to the title, the game saved.
  await page.getByRole('button', { name: 'Menu' }).tap();
  await menu.getByRole('button', { name: 'QUIT TO TITLE' }).tap();
  const ask = page.getByRole('alertdialog', { name: 'Leave this game?' });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'STAY' }).tap();
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'QUIT TO TITLE' }).tap();
  await ask.getByRole('button', { name: 'LEAVE' }).tap();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toContainText('Day 1 of 30');
  expect(await page.evaluate(() => window.__thirty!.state())).toBeNull();
});

// ---------------------------------------------------------------- the endings

test('the three endings: WAR, STAND-DOWN and HELD, with PLAY AGAIN, REPLAY THIS SEED and HOME', async ({ page }) => {
  await open(page);
  const g = await seed(page, 'E2E-END');
  const endButtons = async () => {
    for (const name of ['PLAY AGAIN', 'REPLAY THIS SEED', 'HOME']) await expect(page.getByRole('button', { name })).toBeVisible();
  };

  // WAR: seven regions at war and three in crisis read 99; the night's spread tips it.
  const warHeats = calmMap(g);
  for (const id of ['LTL', 'KLP', 'TLM', 'DNM', 'ORN', 'PBB', 'LNK']) warHeats[id] = 3;
  for (const id of ['SHL', 'GLM', 'FLE']) warHeats[id] = 2;
  await set(page, { phase: 'choose', offer: null, ending: null, day: 17, team: [], penalty: 0, heats: warHeats, card: dealt('strait-01', 'SHL') });
  expect(await gaugeValue(page)).toBe(99);
  await choice(page, 'right').tap();
  await settle(page);
  let s = await state(page);
  expect(s.phase).toBe('over');
  expect(s.ending?.kind).toBe('WAR');
  await expect(page.locator('.end-title')).toHaveText('War.');
  await expect(page.locator('.card .end-line')).toHaveCount(2);
  await expect(page.locator('.card .end-line').nth(0)).toContainText('day 17');
  expect(await gaugeValue(page)).toBe(100);
  await endButtons();
  await page.getByRole('button', { name: 'REPLAY THIS SEED' }).tap();
  await settle(page);
  s = await state(page);
  expect(s.seed).toBe('E2E-END');
  expect(s.day).toBe(1);
  expect(s.phase).toBe('choose');

  // STAND-DOWN: one tense region left, calmed on day 8.
  const standHeats = calmMap(g);
  standHeats.NWK = 1;
  await set(page, { phase: 'choose', offer: null, ending: null, day: 8, team: [], penalty: 0, heats: standHeats, card: dealt('northwake-02', 'NWK') });
  expect(await gaugeValue(page)).toBe(2);
  await expect(choice(page, 'right').locator('.hint')).toHaveText(/^Danger down/);
  await choice(page, 'right').tap();
  await settle(page);
  s = await state(page);
  expect(s.ending).toEqual({ kind: 'STAND-DOWN', day: 8, danger: 0 });
  await expect(page.locator('.end-title')).toHaveText('The world stands down.');
  await expect(page.locator('.card .end-line').nth(0)).toContainText('day 8');
  expect(await gaugeValue(page)).toBe(0);
  await endButtons();
  await page.getByRole('button', { name: 'PLAY AGAIN' }).tap();
  await settle(page);
  s = await state(page);
  expect(s.seed).not.toBe('E2E-END');
  expect(s.day).toBe(1);

  // HELD: day 30 with a quiet map.
  const heldHeats = calmMap(g);
  heldHeats.NWK = 1;
  heldHeats.SHL = 1;
  await set(page, { phase: 'choose', offer: null, ending: null, day: 30, team: [], penalty: 0, heats: heldHeats, card: dealt('northwake-02', 'NWK') });
  await choice(page, 'right').tap();
  await settle(page);
  s = await state(page);
  expect(s.phase).toBe('over');
  expect(s.ending?.kind).toBe('HELD');
  expect(s.ending?.kind === 'HELD' && s.ending.day).toBe(30);
  await expect(page.locator('.end-title')).toHaveText(/^You held/);
  await expect(page.locator('.card .end-line').nth(0)).toContainText(`Danger ended at ${danger(s)}`);
  await endButtons();
  // HOME puts the finished game away: the title offers PLAY, not CONTINUE.
  await page.getByRole('button', { name: 'HOME' }).tap();
  await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /CONTINUE/ })).toHaveCount(0);
});

// ---------------------------------------------------------------- determinism

test('determinism: the same seed and choices give the same state hash, twice and in Node', async ({ page }) => {
  const SEED = 'E2E-DETERMINISM';
  const DAYS = 7;
  const node = hashState(playInNode(content, SEED, DAYS));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const inBrowser = async () => {
    await page.evaluate((s) => window.__thirty!.seed(s), SEED);
    await settle(page);
    return page.evaluate(
      async ([days, hashSource]) => {
        const h = window.__thirty!;
        const hash = new Function(`return ${hashSource}`)() as (x: unknown) => string;
        // A tap waits for the day before it to finish playing, as a player's does.
        const idle = () =>
          new Promise<void>((resolve) => {
            const look = () => (h.busy() ? setTimeout(look, 20) : resolve());
            look();
          });
        let s = h.state()!;
        for (let step = 0; s.phase !== 'over' && s.day <= days; step++) {
          if (step > 60) throw new Error('the game did not advance');
          await idle();
          if (s.phase === 'offer') h.pick(0);
          // A map card has no left preview; its first glowing place in the map's order is the one tapped.
          else if (h.preview('left')) await h.choose('left');
          else await h.tap(Object.keys(s.heats).filter((id) => h.preview(id))[0]);
          await idle();
          s = h.state()!;
        }
        return { day: s.day, hash: hash(s) };
      },
      [DAYS, hashState.toString()] as const,
    );
  };
  const a = await inBrowser();
  await page.reload();
  await page.waitForFunction(() => !!window.__thirty);
  const b = await inBrowser();

  expect(a.hash).toMatch(/^[0-9a-f]{8}$/);
  expect(a.day).toBeGreaterThan(DAYS);
  expect(b).toEqual(a);
  expect(a.hash).toBe(node);
});

// ---------------------------------------------------------------- desktop

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false });

  test('a desktop window: the frame is letterboxed on the table, the mouse plays, Esc opens the menu', async ({ page }) => {
    await open(page);
    const frame = page.locator('.frame');
    await expect(frame).toHaveClass(/\bdesk\b/);
    const box = (await frame.boundingBox())!;
    // The whole live area fits the window, centred, with table showing either side.
    expect(box.height).toBeLessThanOrEqual(900 + 100);
    expect(box.x).toBeGreaterThan(100);
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);

    await page.getByRole('button', { name: 'PLAY', exact: true }).click();
    await expect(page.locator('.day')).toHaveText('DAY 1 OF 30');
    await choice(page, 'left').click();
    await settle(page);
    expect((await state(page)).day).toBe(2);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  });
});
