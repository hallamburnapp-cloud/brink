import { expect, test, type Page } from '@playwright/test';
import { loadRedlinesContent } from '../src/redlines/content/load';
import { endWeek, newGame, regionName, RULES, type GameState, type RegionId } from '../src/redlines/engine';
import type { RedlinesHook } from '../src/redlines/ui/app/devHook';

/**
 * BRINK: Red Lines on a phone and on a desktop, end to end (VITE_GAME=redlines; `npm run e2e:redlines`).
 * docs/redlines/SPEC-SMALL.md is the game; docs/redlines/BUILD.md "Acceptance" is what this checks.
 *
 * What a player lives through is driven by real taps: the title's typed forms, the explanation's slips,
 * a place pressed and held on the paper map, a counter tapped and then a place, SEND ORDERS, the phone's
 * three forms, the debrief's pages, the menu, the back button. The window.__redlines hook only sets up
 * positions that would take minutes to reach by hand (a seed, a week on the edge of an ending) and
 * reads the game back.
 *
 * Every test also fails on any console error, any uncaught exception, and any request that leaves the
 * page's own origin (the game makes no network requests of its own).
 */

declare global {
  interface Window {
    __redlines?: RedlinesHook;
  }
}

// ---------------------------------------------------------------- guards

let problems: string[] = [];

test.beforeEach(async ({ page, baseURL }, info) => {
  // The hotel's config (playwright.config.ts) also looks in e2e/; this file is Red Lines'.
  test.skip(!info.project.name.startsWith('redlines'), 'Runs under playwright.redlines.config.ts (npm run e2e:redlines).');
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
  if (info.project.name.startsWith('redlines')) expect(problems, problems.join('\n')).toEqual([]);
});

// ---------------------------------------------------------------- the pack, in Node

/** The same pack the build compiled, read in Node: the words the screens must show, and the engine's own answers to compare with. */
const { content } = loadRedlinesContent();
if (!content) throw new Error('content-redlines did not compile');
const S = content.strings;

/**
 * Seeds found on this pack (the scratch finder replays newGame/endWeek):
 * - WEEK: the inherited promise is at Driftholm (an island nothing of yours can reach: a dashed ring); their first
 *   heading points at it, so SEND ORDERS with no orders rings the inherited-promise test, BACK IT costs 24 (far) and
 *   holds, and WAIT carries the call to week 2 as round 2. Vessary is within the brigade's reach from Edda Vale.
 * - QUIET: week 1 resolves without a call (a push into Kelpmouth, a column stopping short), for the playback.
 */
const SEED_WEEK = 'E2E-WEEK-2';
const SEED_QUIET = 'E2E-QUIET-5';
const PREFS_KEY = 'brink.redlines.v1.prefs';
const SAVE_KEY = 'brink.redlines.v1.save';

// ---------------------------------------------------------------- helpers

/** Load the title and wait for the hook. 'new' is a first launch (PLAY opens the three lines); 'taught' has seen them (PLAY shows the collision slip). */
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
      [PREFS_KEY, JSON.stringify({ explained: true, sound: false })] as const,
    );
  }
  await page.goto('./');
  await page.waitForFunction(() => !!window.__redlines);
  await expect(page.getByRole('button', { name: /^(PLAY|CONTINUE)/ })).toBeVisible();
}

/** Wait until no playback is running. */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => !!window.__redlines && !window.__redlines.busy(), null, { timeout: 60_000 });
  await page.waitForTimeout(150);
}

/** A new game on this seed through the hook (the title's PLAY with a chosen seed, no explanation). */
async function seed(page: Page, s: string): Promise<GameState> {
  const state = await page.evaluate((x) => window.__redlines!.seed(x), s);
  await settle(page);
  // The title lifts off the sheet (the curtain); give it its 360 ms.
  await page.waitForTimeout(500);
  return state;
}

async function state(page: Page): Promise<GameState> {
  const s = await page.evaluate(() => window.__redlines!.state());
  if (!s) throw new Error('no game on the desk');
  return s;
}

/** Patch the game on the desk (through the save format, so only a sound state is taken). */
async function set(page: Page, patch: Partial<GameState>): Promise<GameState> {
  const s = await page.evaluate((p) => window.__redlines!.set(p), patch);
  if (!s) throw new Error('the hook refused the patch');
  await settle(page);
  return s;
}

/** A region's centre in page px: the hook's frame px through the frame's fit. */
async function placeOf(page: Page, region: RegionId): Promise<{ x: number; y: number }> {
  const p = await page.evaluate((r) => {
    const h = window.__redlines!;
    const c = h.centre(r);
    const f = h.frame();
    return c && { x: f.left + c.x * f.scale, y: f.top + c.y * f.scale };
  }, region);
  if (!p) throw new Error(`no centre for ${region}`);
  return p;
}

/** Press and hold a place with a real touch for longer than the gesture's 450 ms (a mouse on the desktop). */
async function hold(page: Page, region: RegionId, ms = 700): Promise<void> {
  const { x, y } = await placeOf(page, region);
  if (test.info().project.name.endsWith('desktop')) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** A plain tap on a place. */
async function tapPlace(page: Page, region: RegionId): Promise<void> {
  const { x, y } = await placeOf(page, region);
  await page.touchscreen.tap(x, y);
}

/** Tap a counter on the sheet (the fleet or the brigade). */
async function tapCounter(page: Page, kind: 'fleet' | 'brigade'): Promise<void> {
  const box = await page.locator(`.pp-piece[data-kind="${kind}"] .pp-chit`).boundingBox();
  if (!box) throw new Error(`no ${kind} counter on the sheet`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Tap SEND ORDERS and wait for the week to play out (the phone may then be ringing). */
async function sendOrders(page: Page): Promise<GameState> {
  const before = await state(page);
  await page.getByRole('button', { name: S.words.sendOrders }).tap();
  await page.waitForFunction(
    ([week]) => {
      const h = window.__redlines!;
      const s = h.state();
      return !!s && !h.busy() && (s.week !== week || s.phase !== 'act');
    },
    [before.week] as const,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(200);
  return state(page);
}

/** Answer the call by tapping its typed form, and wait for the rest of the week to play. */
async function answer(page: Page, key: 'back' | 'down' | 'wait'): Promise<GameState> {
  const s = await state(page);
  const opt = s.phone!.options.find((o) => o.key === key)!;
  await page.locator('.pp-ch').filter({ hasText: opt.label }).tap();
  await page.waitForFunction(() => !!window.__redlines && !window.__redlines.busy() && window.__redlines.state()?.phase !== 'phone', null, { timeout: 60_000 });
  await page.waitForTimeout(200);
  return state(page);
}

const choice = (page: Page, word: string) => page.getByRole('button', { name: new RegExp(`^${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`) });
const slip = (page: Page) => page.locator('.rl-slip');
const calm = (s: GameState): GameState['regions'] => Object.fromEntries(Object.keys(s.regions).map((k) => [k, { state: 'calm' as const, pressedWeeks: 0, quietWeeks: 0 }]));

// ---------------------------------------------------------------- the first minute

test('the title, the three lines of the explanation over the live map, the collision on its slip, and week 1', async ({ page }) => {
  await open(page, 'new');
  await expect(page.locator('.rl-name')).toHaveText('BRINK');
  await expect(page.locator('.rl-sub')).toHaveText(S.title.subtitle);
  await expect(choice(page, S.title.howToPlay)).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toHaveCount(0);
  // The world under the title is drawn: the paper map with its printed names.
  await expect(page.locator('.pp-map')).toBeVisible();
  await expect(page.locator('.pp-names text').first()).toBeAttached();

  // PLAY: the first typed line over the live map, numbered 1, SKIP and NEXT.
  await choice(page, S.title.play).tap();
  await expect(page.locator('.rl-explain .ln')).toHaveText(S.explanation[0]);
  await expect(page.locator('.rl-explain .n')).toHaveText('1');
  await expect(page.locator('.pp-cal .num')).toContainText('1');
  await choice(page, S.screen.next).tap();
  await expect(page.locator('.rl-explain .ln')).toHaveText(S.explanation[1]);
  await choice(page, S.screen.next).tap();
  await expect(page.locator('.rl-explain .ln')).toHaveText(S.explanation[2]);
  await choice(page, S.screen.next).tap();
  // The collision: the game's own dilemma in one sentence, then BEGIN.
  const s = await state(page);
  expect(s.collision.length).toBeGreaterThan(20);
  await expect(page.locator('.rl-explain.rl-collision .ln')).toHaveText(s.collision);
  await choice(page, S.screen.begin).tap();
  await expect(page.locator('.rl-explain')).toHaveCount(0);

  // Week 1: the calendar, the note (the collision), the index card's words, SEND ORDERS, the tape, the MENU tag. Nothing else.
  await expect(page.locator('.pp-cal .hd')).toContainText(S.words.week);
  await expect(page.locator('.pp-cal .num')).toContainText('1');
  await expect(page.locator('.pp-cal .nt')).toContainText(`${S.words.influence} ${s.influence}`);
  await expect(page.locator('.pp-note')).toHaveText(s.collision);
  await expect(page.locator('.pp-card .lab').nth(0)).toHaveText(S.words.war);
  await expect(page.locator('.pp-card .lab').nth(1)).toHaveText(S.words.treaty);
  await expect(page.locator('.pp-card .ww')).toHaveText(S.words.worldWar);
  await expect(page.getByRole('img', { name: S.words.steps[0] })).toBeVisible();
  await expect(page.getByRole('button', { name: S.words.sendOrders })).toBeVisible();
  await expect(page.locator('.pp-tape .ln')).toHaveCount(Math.min(3, s.headline.length));
  await expect(page.locator('.rl-tag')).toHaveText(S.menu.menu);
  // The explanation is remembered: a new game starts at its collision slip.
  const prefs = await page.evaluate((k) => localStorage.getItem(k), PREFS_KEY);
  expect(JSON.parse(prefs ?? '{}').explained).toBe(true);
});

// ---------------------------------------------------------------- orders on the sheet

test('a promise by tap-and-hold (solid, WE DEFEND), a withdraw, a counter moved, a dashed promise, and the refusals in the content\'s words', async ({ page }) => {
  await open(page);
  const s0 = await seed(page, SEED_WEEK);
  expect(s0.promises.map((p) => p.region)).toEqual(['DRF']);
  // The inherited promise is a dashed ring (nothing of yours can reach the island) with WE DEFEND; the headings are two pins and arrows.
  await expect(page.locator('.pp-l-prom .pp-dashed')).toHaveCount(1);
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.defend })).toHaveCount(1);
  await expect(page.locator('.pp-l-head [data-key^="pin:"]')).toHaveCount(2);
  await expect(page.locator('.pp-l-head [data-key^="arrow:"]')).toHaveCount(2);

  // Hold Vessary: the slip names the place, PROMISE TO DEFEND, and says the ring would be solid and why.
  await hold(page, 'VSY');
  await expect(slip(page)).toBeVisible();
  await expect(slip(page).locator('.hd span')).toContainText(regionName('VSY').toUpperCase());
  await expect(slip(page).locator('.hd span')).toContainText(S.screen.heading);
  await expect(slip(page).locator('.c')).toContainText(S.act.promiseCost);
  await expect(slip(page).locator('.c')).toContainText('solid');
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  await expect(slip(page)).toHaveCount(0);
  let s = await state(page);
  expect(s.promises.map((p) => p.region)).toEqual(['DRF', 'VSY']);
  expect(s.influence).toBe(s0.influence - 2);
  await expect(page.locator('.pp-l-prom .pp-solid')).toHaveCount(1);
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.defend })).toHaveCount(2);
  // The note says what the player did, in the log's words.
  await expect(page.locator('.pp-note')).toContainText(`You promised to defend ${regionName('VSY')}.`);

  // Hold it again: WITHDRAW, with its cost line.
  await hold(page, 'VSY');
  await expect(slip(page).locator('.c')).toHaveText(S.act.withdrawCost);
  await slip(page).getByRole('button', { name: S.act.withdraw }).tap();
  s = await state(page);
  expect(s.promises.map((p) => p.region)).toEqual(['DRF']);
  await expect(page.locator('.pp-l-prom .pp-solid')).toHaveCount(0);

  // Hold the Federation's capital: the refusal, in the content's words, and no PROMISE TO DEFEND.
  await hold(page, 'WMS');
  await expect(slip(page).locator('.c')).toHaveText(S.refusals['inside-the-cap']);
  await expect(slip(page).getByRole('button', { name: S.act.promise })).toHaveCount(0);
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();
  await expect(slip(page)).toHaveCount(0);

  // A dashed promise: Shoal is out of reach of both pieces.
  await hold(page, 'SHL');
  await expect(slip(page).locator('.c')).toContainText('dashed');
  await expect(slip(page).locator('.c')).toContainText(S.hold['out-of-reach']);
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  s = await state(page);
  expect(s.promises.map((p) => p.region)).toEqual(['DRF', 'SHL']);
  await expect(page.locator('.pp-l-prom .pp-dashed')).toHaveCount(2);
  await hold(page, 'SHL');
  await slip(page).getByRole('button', { name: S.act.withdraw }).tap();

  // Tap the brigade: it lifts with its MOVE slip; tap Vessary: it moves there for 3 influence.
  await tapCounter(page, 'brigade');
  await expect(page.locator('.pp-piece[data-kind="brigade"]')).toHaveClass(/pp-lift/);
  await expect(slip(page).locator('.w')).toHaveText(S.act.move);
  await expect(slip(page).locator('.c')).toHaveText(S.act.moveCost);
  const before = await state(page);
  await tapPlace(page, 'VSY');
  await expect(slip(page)).toHaveCount(0);
  s = await state(page);
  expect(s.pieces.find((p) => p.kind === 'brigade')?.at).toBe('VSY');
  expect(s.influence).toBe(before.influence - 3);
  await expect(page.locator('.pp-piece[data-kind="brigade"]')).toHaveAttribute('data-at', 'VSY');
  // A second move the same week is refused on a torn slip, in the content's words (the counter slides for 460 ms first).
  await page.waitForTimeout(600);
  await tapCounter(page, 'brigade');
  await expect(page.locator('.pp-piece[data-kind="brigade"]')).toHaveClass(/pp-lift/);
  // Northwake is clear of the MOVE slip (which lies under Vessary); one move a week is refused before reach is looked at.
  await tapPlace(page, 'NWK');
  await expect(page.locator('.rl-refusal')).toHaveText(S.refusals['moved-already']);
  expect((await state(page)).pieces.find((p) => p.kind === 'brigade')?.at).toBe('VSY');
  // The game is saved after every order.
  const saved = await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  expect(saved && JSON.parse(saved).state.pieces.find((p: { kind: string }) => p.kind === 'brigade').at).toBe('VSY');
});

test('A WAY OUT: the typed form with the three terms and their prices; one offered, the slip says so; one a week', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  await page.getByRole('button', { name: new RegExp(`^${S.words.wayOut}`) }).tap();
  const form = page.getByRole('dialog', { name: S.words.wayOut });
  await expect(form).toBeVisible();
  await expect(form.locator('.ln')).toHaveText(S.act.wayOutIntro);
  for (const term of ['drop-promise', 'pull-back', 'summit'] as const) await expect(form.getByRole('button', { name: new RegExp(`^${S.act.termLabels[term]}`) })).toBeVisible();
  await expect(form.getByRole('button', { name: new RegExp(`^${S.act.termLabels.summit}`) })).toContainText(`costs ${RULES.wayOutPrice.summit} influence`);
  // PULL A PIECE BACK opens the two pieces by name; the fleet goes home.
  await form.getByRole('button', { name: new RegExp(`^${S.act.termLabels['pull-back']}`) }).tap();
  await expect(form.getByRole('button', { name: new RegExp(`^${S.pieces.fleet.toUpperCase()}`) })).toBeVisible();
  const before = await state(page);
  await form.getByRole('button', { name: new RegExp(`^${S.pieces.fleet.toUpperCase()}`) }).tap();
  await expect(form).toHaveCount(0);
  const s = await state(page);
  expect(s.offer).toEqual({ term: 'pull-back', detail: 'fleet', price: RULES.wayOutPrice['pull-back'] });
  expect(s.influence).toBe(before.influence - RULES.wayOutPrice['pull-back']);
  const wayOut = page.getByRole('button', { name: new RegExp(`^${S.words.wayOut}`) });
  await expect(wayOut).toContainText(S.act.termLabels['pull-back']);
  await expect(wayOut).toContainText(S.act.wayOutOffered);
  await expect(wayOut).toBeDisabled();
});

// ---------------------------------------------------------------- the week resolves, the phone

test('SEND ORDERS plays the week back a beat at a time: the tape feeds, the note says the same, the hatching scribbles in; week 2 drops new pins', async ({ page }) => {
  await open(page);
  const s1 = await seed(page, SEED_QUIET);
  // What the engine will say, computed in Node from the same pack and seed.
  const expected = endWeek(content, newGame(content, SEED_QUIET));
  expect(expected.phase).toBe('act');
  const lines = expected.log[0].visible;
  expect(lines.length).toBeGreaterThanOrEqual(3);

  await page.getByRole('button', { name: S.words.sendOrders }).tap();
  // Mid-playback: the slip reads ORDERS SENT, the first lines are on the tape and the note repeats the newest.
  await expect(page.locator('.pp-card .send')).toHaveText(S.screen.ordersSent, { timeout: 5_000 });
  await expect(page.locator('.pp-tape .ln.pp-feed')).toHaveCount(1, { timeout: 5_000 });
  const fed = (await page.locator('.pp-tape .ln.pp-feed').textContent())?.replace(/^WEEK \d+/, '').trim();
  expect(lines.map((l) => l.toUpperCase())).toContain((fed ?? '').toUpperCase());
  await expect(page.locator('.pp-note')).toHaveText(new RegExp(fed!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  // Their push lands: Kelpmouth is hatched (pressed) on the sheet.
  await expect(page.locator('.pp-l-press [data-key="press:KLP"]')).toBeAttached({ timeout: 15_000 });
  await settle(page);

  const s2 = await state(page);
  expect(s2.week).toBe(2);
  expect(s2.phase).toBe('act');
  expect(s2.log[0].visible).toEqual(lines);
  expect(s2.regions.KLP.state).toBe('pressed');
  await expect(page.locator('.pp-cal .num')).toContainText('2');
  await expect(page.locator('.pp-cal .nt')).toContainText(`${S.words.influence} ${s2.influence}`);
  // The tape shows the last three lines, tagged with the week; the note now reads the world.
  const tape = await page.locator('.pp-tape .ln').allTextContents();
  expect(tape).toHaveLength(3);
  expect(tape[2].toUpperCase()).toContain(lines[lines.length - 1].toUpperCase());
  await expect(page.locator('.pp-tape .ln i').last()).toHaveText(`${S.words.week} 1`);
  await expect(page.locator('.pp-note')).toHaveText(`They are pushing ${S.blocs.SND}.`);
  // Week 2's headings are the new pins and arrows.
  for (const h of s2.fed.headings) await expect(page.locator(`.pp-l-head [data-key="pin:${h.from}:${h.to}"]`)).toBeAttached();
  expect(s1.influence + 8 - s1.promises.length).toBe(s2.influence);
});

test('the phone: the inherited promise is tested, the room goes dark, forty words, three advisers, three forms; BACK IT holds and the week finishes', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  const expected = endWeek(content, newGame(content, SEED_WEEK));
  expect(expected.phase).toBe('phone');
  const phone = expected.phone!;

  const s = await sendOrders(page);
  expect(s.phase).toBe('phone');
  expect(s.phone?.region).toBe('DRF');
  expect(s.phone?.text).toBe(phone.text);
  // The call stops everything: the dim, the handset, the clock saying which week and INCOMING.
  await expect(page.locator('.pp-room')).toHaveClass(/pp-room-call/);
  await expect(page.locator('.pp-handset')).toBeVisible();
  await expect(page.locator('.pp-clock')).toContainText(`${S.words.week} 1`);
  await expect(page.locator('.pp-clock small')).toHaveText(S.phone.ringing);
  // The caller card: the typed name and role, the message of forty words or fewer.
  const caller = content.advisers[phone.template.startsWith('test-inherited-ambassador') ? 'ambassador' : 'hawk'];
  await expect(page.locator('.pp-caller .who')).toContainText(caller.name.toUpperCase());
  await expect(page.locator('.pp-caller .msg')).toHaveText(phone.text);
  expect(phone.text.split(/\s+/).length).toBeLessThanOrEqual(40);
  // The three advisers in character, no conditional annotations.
  await expect(page.locator('.pp-s1 .who')).toHaveText(`HAWK · ${content.advisers.hawk.role.toUpperCase()}`);
  await expect(page.locator('.pp-s1 .q')).toHaveText(phone.advisers.hawk);
  await expect(page.locator('.pp-s2 .q')).toHaveText(phone.advisers.dove);
  await expect(page.locator('.pp-s3 .who')).toHaveText('INTEL · DIRECTOR');
  await expect(page.locator('.pp-s3 .q')).toHaveText(phone.advisers.intel);
  for (const line of [phone.text, phone.advisers.hawk, phone.advisers.dove, phone.advisers.intel, ...phone.options.map((o) => o.cost)]) expect(line).not.toMatch(/\bif they\b/i);
  // The three typed forms with their costs; BACK IT costs 24 from far away and is affordable at 30.
  const forms = page.locator('.pp-ch');
  await expect(forms).toHaveCount(3);
  await expect(forms.nth(0).locator('.w')).toHaveText(S.words.back);
  await expect(forms.nth(0).locator('.c')).toHaveText(phone.options[0].cost);
  expect(phone.options[0].cost).toContain('costs 24 influence');
  await expect(forms.nth(1).locator('.w')).toHaveText(S.words.down);
  await expect(forms.nth(2).locator('.w')).toHaveText(S.words.wait);
  await expect(forms.nth(0)).toBeEnabled();
  // The tested place is over-circled on the sheet with TESTED.
  await expect(page.locator('.pp-l-test [data-key="test:DRF"]')).toBeAttached();
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.tested })).toHaveCount(1);

  // BACK IT: the rest of the week plays; it held; influence down by 24; the room is light again.
  const after = await answer(page, 'back');
  expect(after.week).toBe(2);
  expect(after.phase).toBe('act');
  expect(after.influence).toBe(30 - 24 + 8 - 1);
  expect(after.log[0].visible).toContain(`You backed ${regionName('DRF')} from afar · it held`);
  expect(after.log[0].acts.some((a) => a.startsWith(S.words.back))).toBe(true);
  await expect(page.locator('.pp-room')).not.toHaveClass(/pp-room-call/);
  await expect(page.locator('.pp-cal .num')).toContainText('2');
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.tested })).toHaveCount(0);
});

test('WAIT carries the test into next week with the stakes up: the second week of this, the price up by six', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  let s = await sendOrders(page);
  expect(s.phase).toBe('phone');
  s = await answer(page, 'wait');
  expect(s.week).toBe(2);
  expect(s.pendingTest).toBe('DRF');
  expect(s.pendingRound).toBe(2);
  // The tested place stays marked through the week.
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.tested })).toHaveCount(1);
  await expect(page.locator('.pp-note')).toContainText(`Your promise at ${regionName('DRF')} is being tested now.`);
  // Withdrawing the promise under test is refused: answer the phone.
  await hold(page, 'DRF');
  await expect(slip(page).locator('.c')).toHaveText(S.refusals['under-test']);
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();

  s = await sendOrders(page);
  expect(s.phase).toBe('phone');
  expect(s.phone?.round).toBe(2);
  expect(s.phone?.region).toBe('DRF');
  await expect(page.locator('.pp-clock small')).toHaveText(S.phone.round2);
  await expect(page.locator('.pp-ch').nth(0).locator('.c')).toContainText('costs 30 influence');
  // The message is the call's second-week words (the pack's `again`).
  const template = content.phones.find((p) => p.id === s.phone!.template)!;
  expect(template.again).toBeTruthy();
  await expect(page.locator('.pp-caller .msg')).toContainText(template.again!.split('{')[0].trim());
  // BACK DOWN: the promise goes, the place they were testing falls, they climb (a fall at MASSING spreads: the
  // ladder may run), and the stamp reads the new word.
  s = await answer(page, 'down');
  expect(s.promises.some((p) => p.region === 'DRF')).toBe(false);
  expect(s.regions.DRF.state).toBe('fighting');
  expect(s.fed.step).toBeGreaterThan(2);
  expect(s.log[1].visible).toContain(`You backed down at ${regionName('DRF')}`);
  await expect(page.getByRole('img', { name: S.words.steps[s.fed.step - 1] })).toBeVisible();
  await expect(page.locator('.pp-l-fight [data-key="fight:DRF"]')).toBeAttached();
});

// ---------------------------------------------------------------- the endings and the debrief

test('the three endings through the hook: TREATY, WORLD WAR and FROZEN on their typed cards, then the debrief pages', async ({ page }) => {
  await open(page);
  const g = await seed(page, SEED_WEEK);
  const quiet = { regions: calm(g), promises: [], pendingTest: null, offer: null, events: 4, phone: null, acts: [], moved: [] } as Partial<GameState>;

  // TREATY: the bar at 95 and a quiet week: +5 and they sign.
  await set(page, { ...quiet, week: 5, fed: { ...g.fed, will: 95, step: 1, headings: [] }, treaty: 95 });
  let s = await sendOrders(page);
  expect(s.phase).toBe('ended');
  expect(s.ending?.kind).toBe('treaty');
  await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.treaty);
  await expect(page.locator('.pp-typed .ti')).toHaveClass(/blue/);
  await expect(page.locator('.pp-typed .ln').nth(0)).toHaveText(s.ending!.lines[0]);
  await expect(page.locator('.pp-typed .ln').nth(1)).toHaveText(s.ending!.lines[1]);
  await expect(page.locator('.pp-typed .sc b')).toHaveText(String(s.ending!.score));
  expect(s.ending!.score).toBe(100 - 10 * 5);
  expect(s.log[s.log.length - 1].visible).toContain(S.headlines.treatySigned);

  // The debrief: one page a week, what you did and what they were thinking (in red), BACK and NEXT, then the closing card.
  await choice(page, S.debrief.next).tap();
  const pages = s.log.length;
  await expect(page.locator('.pp-debrief .wk')).toContainText(`WEEK ${s.log[0].week}`);
  await expect(page.locator('.pp-debrief .lab').nth(0)).toHaveText(S.debrief.youDid.toUpperCase());
  await expect(page.locator('.pp-debrief .lab').nth(1)).toHaveText(S.debrief.theyThought.toUpperCase());
  await expect(page.locator('.pp-debrief .thought').first()).toHaveText(s.log[0].hidden[0]);
  await expect(page.locator('.pp-debrief .pg')).toHaveText(`1 / ${pages}`);
  for (let i = 1; i < pages; i++) {
    await choice(page, S.debrief.next).tap();
    await expect(page.locator('.pp-debrief .pg')).toHaveText(`${i + 1} / ${pages}`);
  }
  // The last page names the dials among its thoughts. BACK turns a page back (to the ending card from the first page);
  // DONE shows the closing card with the dials in words, PLAY AGAIN and TITLE.
  await expect(page.locator('.pp-debrief .thought').last()).toHaveText(s.ending!.dials);
  await choice(page, S.debrief.back).tap();
  if (pages > 1) await expect(page.locator('.pp-debrief .pg')).toHaveText(`${pages - 1} / ${pages}`);
  else await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.treaty);
  await choice(page, S.debrief.next).tap();
  await expect(page.locator('.pp-debrief .pg')).toHaveText(`${pages} / ${pages}`);
  await choice(page, S.debrief.done).tap();
  await expect(page.locator('.pp-typed .hd')).toHaveText(S.debrief.title);
  await expect(page.locator('.pp-typed .ln').nth(0)).toHaveText(s.ending!.dials);
  await expect(choice(page, S.debrief.again)).toBeVisible();
  await expect(choice(page, S.debrief.toTitle)).toBeVisible();

  // PLAY AGAIN: a new world.
  await choice(page, S.debrief.again).tap();
  await settle(page);
  s = await state(page);
  expect(s.week).toBe(1);
  expect(s.seed).not.toBe(SEED_WEEK);

  // WORLD WAR: seven places fighting at ALL-OUT; the fighting spreads to the eighth.
  const warRegions = calm(s);
  for (const r of ['KLP', 'BRK', 'LTL', 'TLM', 'DNM', 'ORN', 'SHL']) warRegions[r] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 3, fellBy: 'unanswered' };
  await set(page, { ...quiet, week: 5, regions: warRegions, war: 7, fed: { ...s.fed, step: 5, will: 30, headings: [] }, treaty: 30 });
  await expect(page.locator('.pp-l-fight .pp-mk')).toHaveCount(7);
  s = await sendOrders(page);
  expect(s.ending?.kind).toBe('war');
  expect(s.war).toBeGreaterThanOrEqual(8);
  await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.worldWar);
  await expect(page.locator('.pp-typed .ti')).toHaveClass(/red/);
  await expect(page.locator('.pp-typed .ln').nth(0)).toHaveText('Week 5.');
  await expect(page.locator('.pp-typed .sc b')).toHaveText('0');
  expect(s.log[s.log.length - 1].visible.some((l) => l.includes(S.words.worldWar))).toBe(true);
  await choice(page, S.debrief.next).tap();
  await expect(page.locator('.pp-debrief')).toBeVisible();
  // NEXT through the pages to DONE; TITLE from the closing card puts the finished game away.
  for (let i = 1; i < s.log.length; i++) await choice(page, S.debrief.next).tap();
  await choice(page, S.debrief.done).tap();
  await expect(page.locator('.pp-typed .hd')).toHaveText(S.debrief.title);
  await choice(page, S.debrief.toTitle).tap();
  await expect(choice(page, S.title.play)).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toHaveCount(0);

  // FROZEN: week 8 ends with neither.
  const h = await seed(page, SEED_QUIET);
  await set(page, { ...quiet, week: 8, fed: { ...h.fed, will: 50, step: 1, headings: [] }, treaty: 50 });
  s = await sendOrders(page);
  expect(s.ending?.kind).toBe('frozen');
  await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.frozen);
  await expect(page.locator('.pp-typed .ln').nth(0)).toHaveText(S.endings.frozen[0]);
  await expect(page.locator('.pp-typed .sc b')).toHaveText('9');
});

// ---------------------------------------------------------------- the save, the menu, the way home

test('the game is saved after every order: a reload shows CONTINUE with the week, and the same game comes back', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  await hold(page, 'VSY');
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  const before = await state(page);
  expect(before.promises.map((p) => p.region)).toEqual(['DRF', 'VSY']);

  await page.reload();
  await page.waitForFunction(() => !!window.__redlines);
  const cont = page.getByRole('button', { name: /^CONTINUE/ });
  await expect(cont).toBeVisible();
  await expect(cont).toContainText(`${S.words.week} 1 ${S.screen.weekOf}`);
  await expect(choice(page, S.title.play)).toBeVisible();
  await cont.tap();
  await settle(page);
  await page.waitForTimeout(400);
  const s = await state(page);
  expect(s.seed).toBe(SEED_WEEK);
  expect(s.promises.map((p) => p.region)).toEqual(['DRF', 'VSY']);
  await expect(page.locator('.pp-l-prom .pp-solid')).toHaveCount(1);
  await expect(page.locator('.pp-cal .num')).toContainText('1');
});

test('the menu: the MENU tag, Esc and the back button open it; HOW TO PLAY; QUIT TO TITLE asks once and the title shows CONTINUE', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  const menu = page.getByRole('dialog', { name: S.menu.menu });

  await page.locator('.rl-tag').tap();
  await expect(menu).toBeVisible();
  for (const name of [S.menu.resume, S.menu.howToPlay, S.menu.sound, S.menu.quit]) await expect(menu.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(menu.getByRole('button', { name: new RegExp(`^${S.menu.sound}`) })).toContainText(S.menu.off);
  await menu.getByRole('button', { name: S.menu.resume }).tap();
  await expect(menu).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  // The phone's back button opens the menu instead of leaving the game.
  await page.goBack();
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await menu.getByRole('button', { name: S.menu.resume }).tap();
  await expect(menu).toBeHidden();
  expect((await state(page)).week).toBe(1);

  // HOW TO PLAY: the seven typed lines; DONE returns to the game.
  await page.locator('.rl-tag').tap();
  await menu.getByRole('button', { name: S.menu.howToPlay }).tap();
  const how = page.getByRole('dialog', { name: S.howToPlay.title });
  await expect(how).toBeVisible();
  await expect(how.locator('.ln')).toHaveCount(S.howToPlay.lines.length);
  await expect(how.locator('.ln').nth(0)).toHaveText(S.howToPlay.lines[0]);
  await how.getByRole('button', { name: S.debrief.done }).tap();
  await expect(how).toHaveCount(0);

  // QUIT TO TITLE asks once; NO returns to the menu; YES goes to the title, the game saved.
  await page.locator('.rl-tag').tap();
  await menu.getByRole('button', { name: S.menu.quit }).tap();
  const ask = page.getByRole('alertdialog', { name: S.menu.quit });
  await expect(ask).toBeVisible();
  await expect(ask.locator('.ln')).toHaveText(S.menu.quitSure);
  await ask.getByRole('button', { name: S.menu.no }).tap();
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: S.menu.quit }).tap();
  await ask.getByRole('button', { name: S.menu.yes }).tap();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toBeVisible();
  expect(await page.evaluate(() => window.__redlines!.state())).toBeNull();

  // HOW TO PLAY from the title does not start a game.
  await choice(page, S.title.howToPlay).tap();
  await expect(how).toBeVisible();
  await how.getByRole('button', { name: S.debrief.done }).tap();
  await expect(page.locator('.rl-name')).toHaveText('BRINK');
  expect(await page.evaluate(() => window.__redlines!.state())).toBeNull();
});

// ---------------------------------------------------------------- desktop

test('a desktop window @desktop: the frame sits centred on the dark desk, the mouse plays (a hold promises), Esc opens the menu', async ({ page }) => {
  await open(page);
  const frame = page.locator('.rl-frame');
  await expect(frame).toHaveClass(/\brl-desk\b/);
  const box = (await frame.boundingBox())!;
  // The whole 390 x 844 frame fits the window with desk showing either side, centred.
  expect(box.height).toBeLessThanOrEqual(900);
  expect(box.width / box.height).toBeCloseTo(390 / 844, 2);
  expect(box.x).toBeGreaterThan(200);
  expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);

  await seed(page, SEED_WEEK);
  await hold(page, 'VSY');
  await expect(slip(page)).toBeVisible();
  await slip(page).getByRole('button', { name: S.act.promise }).click();
  expect((await state(page)).promises.map((p) => p.region)).toEqual(['DRF', 'VSY']);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: S.menu.menu })).toBeVisible();
});
