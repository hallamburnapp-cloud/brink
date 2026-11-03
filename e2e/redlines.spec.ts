import { expect, test, type Page } from '@playwright/test';
import { loadRedlinesContent } from '../src/redlines/content/load';
import {
  answerCost,
  answerPhone,
  backCost,
  blocOf,
  declaredTapes,
  endWeek,
  fallsAnswerable,
  fallsEndTheGame,
  fallsThisWeek,
  fallWeeksAt,
  HEADLINE_KINDS,
  holdable,
  isCap,
  isProvocation,
  leavesToFall,
  linesCrossedByMove,
  linesCrossedByPromise,
  loadGame,
  movesFor,
  nearestHold,
  NEIGHBOURS,
  newGame,
  offerWayOut,
  promise,
  promiseTooLate,
  promiseWillRing,
  regionName,
  REGION_IDS,
  ringsLeftDashed,
  RULES,
  saveGame,
  spreadEndsTheGame,
  unansweredRegions,
  weeksLeft,
  type GameState,
  type RegionId,
} from '../src/redlines/engine';
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
 * Seeds found on this pack and engine by a seed finder that replays newGame/endWeek/answerPhone in Node with the
 * properties each test needs (re-run it when the rules change):
 * - WEEK: the one inherited promise is at Driftholm (an island nothing of yours can reach: a dashed ring); their first
 *   heading points at it, so SEND ORDERS with no orders rings the inherited-promise test, BACK IT costs 24 (far) and
 *   holds, and WAIT carries the call to week 2 as round 2 at 30. Vessary is free and within the brigade's reach from
 *   Edda Vale; Shoal is out of reach.
 * - QUIET: week 1 resolves without a call (a push that lands, a column stopping short), for the playback.
 * - RULING-A0 / RULING-B1: with backDownPatch / fallWeekPatch staged, the recheck's two paths (a back-down at a dashed
 *   ring facing a scared Federation; a summit accepted in a week a place fell), each with a place fallen a week before.
 * What those weeks say and do is computed in Node from the same pack and seed, never written out here. The second recheck's
 * tests (said before you pay, the eve note, the bar at 100) stage a desk on the WEEK seed (`desk`) and ask the engine's own
 * forecasts in Node what the slips and the note must say. All seeds re-checked against round 16's engine.
 */
const SEED_WEEK = 'E2E-WEEK-21';
const SEED_QUIET = 'E2E-QUIET-15';
/** MOVE: the brigade's move to Rimeholt crosses a declared line and leaves the inherited ring at Quillon dashed (the MOVE HERE slip). */
const SEED_MOVE = 'FIX-25';
/** SUMMIT: with summitPatch staged, SEND ORDERS rings their own summit offer; ACCEPT steps them down to TESTING. With a way out of yours offered first, it never rings. */
const SEED_SUMMIT = 'E2E-SUMMIT-1';
/** TRAWLER: with trawlerPatch staged, SEND ORDERS rings the trawler about Gullrest under a ring of yours (promised), or in the words that claim no promise (not). */
const SEED_TRAWLER = 'E2E-TRAWLER-3';
const PREFS_KEY = 'brink.redlines.v1.prefs';
const SAVE_KEY = 'brink.redlines.v1.save';
/** A refusal's torn slip stays this long (actions.ts REFUSAL_MS) and a little more. */
const REFUSAL_GONE = 2600;

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
  // The forms take taps only once they are on the paper (a thumb still drumming to skip the playback is not an answer).
  await page.locator('.rl-forms.rl-armed').waitFor({ state: 'attached', timeout: 5_000 });
  await page.locator('.pp-ch').filter({ hasText: opt.label }).tap();
  await page.waitForFunction(() => !!window.__redlines && !window.__redlines.busy() && window.__redlines.state()?.phase !== 'phone', null, { timeout: 60_000 });
  await page.waitForTimeout(200);
  return state(page);
}

const choice = (page: Page, word: string) => page.getByRole('button', { name: new RegExp(`^${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`) });
/** True when one of the lines came from this headline template with these slots (other slots may hold anything). */
function said(lines: readonly string[], template: string, slots: Record<string, string> = {}): boolean {
  const src = template
    .split(/(\{\w+\})/g)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return slots[m[1]] !== undefined ? slots[m[1]].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '.+?';
    })
    .join('');
  const re = new RegExp(`^${src}$`);
  return lines.some((l) => re.test(l));
}

/** An element's box in frame px (the 390 x 844 sheet), through the frame's fit. */
async function frameBox(page: Page, selector: string): Promise<{ x0: number; y0: number; x1: number; y1: number }> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  const f = await page.evaluate(() => window.__redlines!.frame());
  return { x0: (box.x - f.left) / f.scale, y0: (box.y - f.top) / f.scale, x1: (box.x + box.width - f.left) / f.scale, y1: (box.y + box.height - f.top) / f.scale };
}
const slip = (page: Page) => page.locator('.rl-slip');
/** The hook's set() in Node: the same patch through the save format, so the engine run here is the one the page runs. */
const staged = (s: GameState, patch: Partial<GameState>): GameState => loadGame(saveGame({ ...s, ...patch } as GameState))!;
const summitPatch = (s: GameState): Partial<GameState> => ({ regions: calm(s), promises: [], pendingTest: null, offer: null, events: 0, phonesUsed: [], phone: null, acts: [], moved: [], week: 6, war: 0, treaty: 60, fed: { ...s.fed, will: 60, step: 2, headings: [] } });
const trawlerPatch = (s: GameState, promised: boolean): Partial<GameState> => ({
  regions: calm(s),
  promises: promised ? [{ region: 'GUL', since: 1, inherited: false }] : [],
  pendingTest: null,
  offer: null,
  events: 0,
  phonesUsed: [],
  phone: null,
  acts: [],
  moved: [],
  week: 3,
  war: 0,
  treaty: 50,
  fed: { ...s.fed, will: 50, step: 1, headings: [] },
});
/** A headline template filled: what the engine prints. */
const line = (kind: keyof typeof S.headlines, slots: Record<string, string> = {}) => S.headlines[kind].replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m);
const calm = (s: GameState): GameState['regions'] => Object.fromEntries(Object.keys(s.regions).map((k) => [k, { state: 'calm' as const, pressedWeeks: 0, quietWeeks: 0 }]));
/** A pack string with its slots filled (the screens' own fill). */
const fill = (template: string, slots: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (m, k: string) => (slots[k] !== undefined ? String(slots[k]) : m));
/**
 * A desk staged on the WEEK seed: week 4 at TESTING, belief 50, nothing pressed or fighting, no promise, no heading, no
 * event left to ring (events 4), the pieces where the seed put them; `patch` and `fed` on top.
 */
const desk = (s: GameState, patch: Partial<GameState> = {}, fed: Partial<GameState['fed']> = {}): Partial<GameState> => ({
  regions: calm(s),
  pieces: s.pieces,
  influence: s.influence,
  promises: [],
  pendingTest: null,
  offer: null,
  events: 4,
  phonesUsed: [],
  phone: null,
  acts: [],
  moved: [],
  week: 4,
  war: 0,
  treaty: 50,
  ...patch,
  fed: { ...s.fed, will: 50, step: 1, belief: 50, headings: [], ...fed },
});
/** A pressed place with this many weeks left on its clock at this step (one: its single ringed tick runs out this week). */
const pressedLeft = (left: number, step: 1 | 2 | 3 | 4 | 5 = 1) => ({ state: 'pressed' as const, pressedWeeks: fallWeeksAt(step) - left, quietWeeks: 0 });
/** Places fighting since week 2, in this order (their fellSeq), for a desk on the edge of WORLD WAR. */
const fighting = (s: GameState, ids: readonly RegionId[]): GameState['regions'] => {
  const regions = calm(s);
  ids.forEach((r, i) => (regions[r] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 2, fellSeq: i + 1, fellBy: 'unanswered' }));
  return regions;
};
/**
 * A ring's price line on its PROMISE or WITHDRAW slip (dashed, or drawn into their siege): how far the nearest piece is
 * from holding it, by a route that crosses no declared line, and what BACK IT will cost; computed from the engine.
 */
function priceText(s: GameState, region: RegionId): string {
  const ringed: GameState = s.promises.some((p) => p.region === region) ? s : { ...s, promises: [...s.promises, { region, since: s.week, inherited: false, ...(isProvocation(s, region) ? { provocation: true } : {}) }] };
  // The distance is said of a dashed ring only (a solid one drawn into their siege has a piece in reach already).
  const near = holdable(ringed, region).ok ? null : nearestHold(s, region);
  const parts: string[] = [];
  if (near && near.moves > 0) parts.push(fill(near.moves === 1 ? S.act.movesAwayOne : S.act.movesAway, { piece: S.pieces[near.piece], n: near.moves }));
  parts.push(fill(S.act.backPrice, { cost: backCost(ringed, region, 1) }));
  return parts.join(' · ');
}

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
  // The teleprinter keeps running under the title: the opening's lines.
  await expect(page.locator('.pp-tape .ln').first()).toBeVisible();

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
  // Ten weeks: the calendar's "of 10" is the rules' count of weeks.
  expect(RULES.weeks).toBe(10);
  await expect(page.locator('.pp-cal .num small')).toHaveText(`of ${RULES.weeks}`);
  await expect(page.locator('.pp-cal .nt')).toContainText(`${S.words.influence} ${s.influence}`);
  await expect(page.locator('.pp-note')).toHaveText(s.collision);
  await expect(page.locator('.pp-card .lab').nth(0)).toHaveText(S.words.war);
  await expect(page.locator('.pp-card .lab').nth(1)).toHaveText(S.words.treaty);
  await expect(page.locator('.pp-card .ww')).toHaveText(S.words.worldWar);
  await expect(page.getByRole('img', { name: S.words.steps[0] })).toBeVisible();
  await expect(page.getByRole('button', { name: S.words.sendOrders })).toBeVisible();
  // Wintermast's three declared lines are pinned at the tape's head, in the tape's words; the running lines under them
  // are the opening's others (the inherited promises), never the declared lines again.
  const pinned = declaredTapes(s);
  expect(pinned).toHaveLength(3);
  await expect(page.locator('.pp-tape .ln.pp-decl')).toHaveText(pinned);
  const running = page.locator('.pp-tape .ln:not(.pp-decl)');
  await expect(running).toHaveCount(Math.min(3, s.promises.filter((p) => p.inherited).length));
  for (const t of await running.allTextContents()) for (const d of pinned) expect(t.toUpperCase()).not.toContain(d.toUpperCase());
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
  await expect(slip(page).locator('.c').first()).toContainText(S.act.promiseCost);
  await expect(slip(page).locator('.c').first()).toContainText('solid');
  // A ring on their arrow's target says it will be a call when the engine says it will (SPEC-SMALL: a form says so before you pay).
  await expect(slip(page).locator('.c.rl-warn', { hasText: S.act.promiseCall })).toHaveCount(promiseWillRing(s0, 'VSY') ? 1 : 0);
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  await expect(slip(page)).toHaveCount(0);
  let s = await state(page);
  expect(s.promises.map((p) => p.region)).toEqual(['DRF', 'VSY']);
  expect(s.influence).toBe(s0.influence - 2);
  await expect(page.locator('.pp-l-prom .pp-solid')).toHaveCount(1);
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.defend })).toHaveCount(2);
  // The note says what the player did, in the log's words.
  await expect(page.locator('.pp-note')).toContainText(`You promised to defend ${regionName('VSY')}.`);

  // Hold it again: WITHDRAW. A ring drawn this week and taken back before the orders go is no order at all: the slip
  // does not say "they'll believe us a little less" (the pack's undo words when it has them), and the engine gives the
  // 2 back and takes no belief (the cold recheck: the note said nothing happened while it cost both).
  await hold(page, 'VSY');
  await expect(slip(page).getByRole('button', { name: S.act.withdraw })).toBeVisible();
  await expect(slip(page)).not.toContainText(S.act.withdrawCost);
  await expect(slip(page).locator('.c').first()).toHaveText(S.act.undoCost.replace('{cost}', String(RULES.promiseCost)));
  await slip(page).getByRole('button', { name: S.act.withdraw }).tap();
  s = await state(page);
  expect(s.promises.map((p) => p.region)).toEqual(['DRF']);
  expect(s.influence).toBe(s0.influence);
  expect(s.fed.belief).toBe(s0.fed.belief);
  await expect(page.locator('.pp-l-prom .pp-solid')).toHaveCount(0);

  // The inherited ring at Driftholm: WITHDRAW at a little belief. Its slip says that keeping it crosses a declared line
  // (in the line's tape words), how far the nearest piece is and what backing it will cost when they test it (the cold
  // recheck: BACK IT's price was only seen once the phone rang). Then CANCEL.
  const keep = linesCrossedByPromise(s0, 'DRF');
  expect(keep.length).toBeGreaterThan(0);
  await hold(page, 'DRF');
  await expect(slip(page).locator('.c').first()).toHaveText(S.act.withdrawCost);
  await expect(slip(page).locator('.c.rl-warn')).toHaveText([...keep.map((l) => fill(S.act.keepCrosses, { line: l })), priceText(s0, 'DRF')]);
  expect(priceText(s0, 'DRF')).toContain(fill(S.act.backPrice, { cost: RULES.backFarCost }));
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();
  await expect(slip(page)).toHaveCount(0);

  // Hold the Federation's capital: the refusal, in the content's words, and no PROMISE TO DEFEND.
  await hold(page, 'WMS');
  await expect(slip(page).locator('.c')).toHaveText(S.refusals['inside-the-cap']);
  await expect(slip(page).getByRole('button', { name: S.act.promise })).toHaveCount(0);
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();
  await expect(slip(page)).toHaveCount(0);

  // A dashed promise: Shoal is out of reach of both pieces.
  await hold(page, 'SHL');
  await expect(slip(page).locator('.c').first()).toContainText('dashed');
  await expect(slip(page).locator('.c').first()).toContainText(S.hold['out-of-reach']);
  // Before it is paid for, the dashed ring's price: the nearest piece's distance and BACK IT's cost, last on the slip.
  await expect(slip(page).locator('.c.rl-warn').last()).toHaveText(priceText(await state(page), 'SHL'));
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
  await expect(slip(page).locator('.c').first()).toHaveText(S.act.moveCost);
  await expect(slip(page).locator('.c.rl-hint')).toHaveText(S.act.moveHint);
  const before = await state(page);
  // The places it can reach are pencilled round on the sheet while it is lifted.
  await expect(page.locator('.pp-l-hold [data-key^="reach:"]')).toHaveCount(movesFor(before, 'brigade').length);
  // Nothing to warn of on this seed: the move is made at once (a move that crosses a line asks first: the next test).
  expect(linesCrossedByMove(before, 'brigade', 'VSY')).toEqual([]);
  expect(ringsLeftDashed(before, 'brigade', 'VSY')).toEqual([]);
  // The slip leaves every place the brigade can move to clear for the tap that moves it.
  const slipBox = await frameBox(page, '.rl-slip');
  for (const r of movesFor(before, 'brigade')) {
    const c = (await page.evaluate((id) => window.__redlines!.centre(id), r))!;
    const clear = c.x < slipBox.x0 - 10 || c.x > slipBox.x1 + 10 || c.y < slipBox.y0 - 10 || c.y > slipBox.y1 + 10;
    expect(clear, `${r} under the MOVE slip`).toBe(true);
  }
  await tapPlace(page, 'VSY');
  await expect(slip(page)).toHaveCount(0);
  await expect(page.locator('.pp-l-hold [data-key^="reach:"]')).toHaveCount(0);
  s = await state(page);
  expect(s.pieces.find((p) => p.kind === 'brigade')?.at).toBe('VSY');
  expect(s.influence).toBe(before.influence - 3);
  await expect(page.locator('.pp-piece[data-kind="brigade"]')).toHaveAttribute('data-at', 'VSY');
  // A second move the same week is refused on a torn slip, in the content's words (the counter slides for 460 ms first).
  await page.waitForTimeout(600);
  await tapCounter(page, 'brigade');
  await expect(page.locator('.pp-piece[data-kind="brigade"]')).toHaveClass(/pp-lift/);
  // Quillon, a place the brigade could reach, is clear of the MOVE slip by construction; one move a week is refused before reach is looked at.
  await tapPlace(page, 'QLN');
  await expect(page.locator('.rl-refusal')).toHaveText(S.refusals['moved-already']);
  expect((await state(page)).pieces.find((p) => p.kind === 'brigade')?.at).toBe('VSY');
  // The MOVE word itself is inert (a tap on it once fell through to a refusal): the counter stays lifted, nothing is refused.
  await page.waitForTimeout(REFUSAL_GONE);
  await tapCounter(page, 'fleet');
  await expect(page.locator('.pp-piece[data-kind="fleet"]')).toHaveClass(/pp-lift/);
  await slip(page).locator('.w').tap();
  await page.waitForTimeout(300);
  await expect(page.locator('.rl-refusal')).toHaveCount(0);
  await expect(page.locator('.pp-piece[data-kind="fleet"]')).toHaveClass(/pp-lift/);
  // A tap on the rest of the MOVE slip (not its CANCEL) goes through to the sheet under it: it is not swallowed.
  const costLine = await slip(page).locator('.c').first().boundingBox();
  if (!costLine) throw new Error('no MOVE slip');
  await page.touchscreen.tap(costLine.x + costLine.width * 0.5, costLine.y + costLine.height * 0.5);
  // Under the slip is a place the fleet cannot reach (refused in the content's words) or the open sea (put down): either way the tap was heard.
  await expect
    .poll(async () => (await page.locator('.rl-refusal').count()) > 0 || !(await page.locator('.pp-piece[data-kind="fleet"]').getAttribute('class'))?.includes('pp-lift'))
    .toBe(true);
  // The game is saved after every order.
  const saved = await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  expect(saved && JSON.parse(saved).state.pieces.find((p: { kind: string }) => p.kind === 'brigade').at).toBe('VSY');
});

test('a move that crosses a declared line or leaves a ring dashed asks MOVE HERE first and says so; a plain tap on a place puts its slip down', async ({ page }) => {
  await open(page);
  const s0 = await seed(page, SEED_MOVE);
  const crossed = linesCrossedByMove(s0, 'brigade', 'RMH');
  const dashed = ringsLeftDashed(s0, 'brigade', 'RMH');
  expect(crossed.length).toBeGreaterThan(0);
  expect(dashed).toEqual(['QLN']);
  // A first-time player's plain tap on a place is answered: the slip a hold would put down.
  await tapPlace(page, 'VSY');
  await expect(slip(page)).toBeVisible();
  await expect(slip(page).locator('.hd span')).toContainText(regionName('VSY').toUpperCase());
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();
  await expect(slip(page)).toHaveCount(0);
  // The brigade to Rimeholt: nothing is paid yet; the MOVE HERE slip at Rimeholt names the line in its tape words and the ring left dashed.
  await tapCounter(page, 'brigade');
  await tapPlace(page, 'RMH');
  await expect(slip(page).getByRole('button', { name: S.act.moveHere })).toBeVisible();
  await expect(slip(page).locator('.hd span')).toContainText(regionName('RMH').toUpperCase());
  await expect(slip(page).locator('.c.rl-warn').nth(0)).toHaveText(S.act.crosses.replace('{line}', crossed[0]));
  await expect(slip(page).locator('.c.rl-warn').nth(1)).toHaveText(S.act.leavesDashed.replace('{region}', regionName('QLN')));
  expect((await state(page)).pieces.find((p) => p.kind === 'brigade')?.at).toBe('EDV');
  expect((await state(page)).influence).toBe(s0.influence);
  // MOVE HERE: the move is made, the ring redraws dashed and the note says why, where it happened.
  await slip(page).getByRole('button', { name: S.act.moveHere }).tap();
  await expect(slip(page)).toHaveCount(0);
  const s = await state(page);
  expect(s.pieces.find((p) => p.kind === 'brigade')?.at).toBe('RMH');
  await expect(page.locator('.pp-note')).toContainText(S.note.movedDashed.replace('{region}', regionName('QLN')));
  await expect(page.locator('.pp-l-prom [data-key="prom:QLN:d"]')).toBeAttached();

  // A ring on a place already under siege is a provocation (the engine's isProvocation): its slip says so before it is paid for.
  const free = (r: RegionId) => s.regions[r]?.state === 'calm' && !isCap(r) && !s.pieces.some((p) => p.at === r) && !s.promises.some((p) => p.region === r) && !s.fed.headings.some((h) => h.to === r);
  const besieged = (['MRD', 'ASK', 'BRK', 'TLM', 'VSY', 'LTL'] as RegionId[]).find(free) ?? REGION_IDS.find(free)!;
  const s2 = await set(page, { regions: { ...s.regions, [besieged]: { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 } } });
  expect(isProvocation(s2, besieged)).toBe(true);
  await hold(page, besieged);
  await expect(slip(page).locator('.hd span')).toContainText(regionName(besieged).toUpperCase());
  await expect(slip(page).locator('.c.rl-warn', { hasText: S.act.promiseProvokes })).toHaveCount(1);
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  await expect(slip(page)).toHaveCount(0);
  expect((await state(page)).promises.find((p) => p.region === besieged)?.provocation).toBe(true);
});

test('a slip put down under the finger takes only a new press: the lift of a hold at the foot of the sheet neither promises nor cancels', async ({ page }) => {
  await open(page);
  const s0 = await seed(page, SEED_WEEK);
  // Hearth and Floe End lie at the foot of the sheet: their slip goes over the place, under the finger that held it.
  for (const r of ['HRT', 'FLE'] as RegionId[]) {
    if (s0.promises.some((p) => p.region === r) || s0.regions[r].state === 'fighting') continue;
    const { x, y } = await placeOf(page, r);
    await hold(page, r);
    await expect(slip(page).locator('.hd span')).toContainText(regionName(r).toUpperCase());
    // The slip lies under the finger, and the lift took nothing from it: no promise, the slip still down.
    expect(await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('.rl-slip'), [x, y] as const)).toBe(true);
    expect((await state(page)).promises.some((p) => p.region === r)).toBe(false);
    // A new press on PROMISE TO DEFEND is an order.
    await slip(page).getByRole('button', { name: S.act.promise }).tap();
    await expect(slip(page)).toHaveCount(0);
    expect((await state(page)).promises.some((p) => p.region === r)).toBe(true);
    await page.evaluate((x) => window.__redlines!.withdraw(x), r);
    await settle(page);
  }
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
  await expect(form.getByRole('button', { name: new RegExp(`^${S.act.termLabels['pull-back']}`) })).toContainText(`costs ${RULES.wayOutPrice['pull-back']} influence`);
  await expect(form.getByRole('button', { name: new RegExp(`^${S.act.termLabels['drop-promise']}`) })).toContainText(`costs ${RULES.wayOutPrice['drop-promise']} influence`);
  // Week 1: they will not talk yet, so each term is dimmed with their reason in its own line (no price is paid for an answer fixed in advance).
  for (const term of ['drop-promise', 'pull-back', 'summit'] as const) {
    const b = form.getByRole('button', { name: new RegExp(`^${S.act.termLabels[term]}`) });
    await expect(b).toBeDisabled();
    await expect(b).toContainText(S.refusals['too-early']);
  }
  await form.getByRole('button', { name: S.act.cancel }).tap();
  await expect(form).toHaveCount(0);
  // The week after a way out was accepted (at most one in any two weeks) the refusal is fixed too: dimmed, never paid for.
  const g = await state(page);
  await set(page, { week: 5, wayOutWeek: 4, acts: [], moved: [], offer: null });
  await page.getByRole('button', { name: new RegExp(`^${S.words.wayOut}`) }).tap();
  for (const term of ['drop-promise', 'pull-back', 'summit'] as const) {
    const b = form.getByRole('button', { name: new RegExp(`^${S.act.termLabels[term]}`) });
    await expect(b).toBeDisabled();
    await expect(b).toContainText(S.refusals['too-soon']);
  }
  await form.getByRole('button', { name: S.act.cancel }).tap();
  await expect(form).toHaveCount(0);
  // Week 3, the fleet out at Gullrest and the brigade at home: PULL A PIECE BACK names only the fleet; the fleet goes home.
  await set(page, { week: 3, wayOutWeek: null, pieces: [{ kind: 'fleet', at: 'GUL' }, { kind: 'brigade', at: g.pieces.find((p) => p.kind === 'brigade')!.at }], acts: [], moved: [], offer: null });
  await page.getByRole('button', { name: new RegExp(`^${S.words.wayOut}`) }).tap();
  await expect(form.getByRole('button', { name: new RegExp(`^${S.act.termLabels.summit}`) })).toBeEnabled();
  await form.getByRole('button', { name: new RegExp(`^${S.act.termLabels['pull-back']}`) }).tap();
  await expect(form.getByRole('button', { name: new RegExp(`^${S.pieces.fleet.toUpperCase()}`) })).toBeVisible();
  await expect(form.getByRole('button', { name: new RegExp(`^${S.pieces.brigade.toUpperCase()}`) })).toHaveCount(0);
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

test('said before you pay: MOVE HERE names the place a move leaves to fall; a ring at a last tick is a call, or too late; a provocation costs the full price and buys the pause only', async ({ page }) => {
  await open(page);
  const g = await seed(page, SEED_WEEK);
  const warns = slip(page).locator('.c.rl-warn');

  // The brigade stands in Vessary, hatched, its clock stopped while it stands there; it has one week left once the
  // brigade goes. The move to Rimeholt asks MOVE HERE first and says Vessary falls this week (SPEC-SMALL "The note keeps
  // its warning"); nothing is paid until MOVE HERE.
  const standPatch = desk(g, { regions: { ...calm(g), VSY: pressedLeft(1) }, pieces: [{ kind: 'fleet', at: 'TRN' }, { kind: 'brigade', at: 'VSY' }] });
  const stand = staged(g, standPatch);
  expect(weeksLeft(stand, 'VSY')).toBeNull();
  expect(leavesToFall(stand, 'brigade', 'RMH')).toEqual(['VSY']);
  await set(page, standPatch);
  await tapCounter(page, 'brigade');
  await tapPlace(page, 'RMH');
  await expect(slip(page).getByRole('button', { name: S.act.moveHere })).toBeVisible();
  await expect(warns.filter({ hasText: fill(S.act.leavesToFall, { region: regionName('VSY') }) })).toHaveCount(1);
  expect((await state(page)).pieces.find((p) => p.kind === 'brigade')?.at).toBe('VSY');
  expect((await state(page)).influence).toBe(stand.influence);
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();
  await expect(slip(page)).toHaveCount(0);

  // Morrow Downs at its last tick, hatched, nothing of ours in it, and their arrow at Driftholm's ring has the week's one
  // test: a ring at Morrow Downs cannot pause it, and the PROMISE slip says so before it is paid for (SPEC-SMALL "Too late
  // is said before you pay"), with the provocation and its price.
  const latePatch = desk(g, { regions: { ...calm(g), MRD: pressedLeft(1) }, promises: [{ region: 'DRF', since: 1, inherited: true }] }, { headings: [{ from: 'GLM', to: 'DRF', real: true }] });
  const late = staged(g, latePatch);
  expect(promiseTooLate(late, 'MRD')).toBe(true);
  expect(promiseWillRing(late, 'MRD')).toBe(false);
  await set(page, latePatch);
  await hold(page, 'MRD');
  await expect(slip(page).locator('.hd span')).toContainText(regionName('MRD').toUpperCase());
  await expect(warns.filter({ hasText: S.act.tooLate })).toHaveCount(1);
  await expect(warns.filter({ hasText: S.act.promiseCall })).toHaveCount(0);
  await expect(warns.filter({ hasText: S.act.promiseProvokes })).toHaveCount(1);
  await expect(warns.last()).toHaveText(priceText(late, 'MRD'));
  await slip(page).getByRole('button', { name: S.act.cancel }).tap();
  await expect(slip(page)).toHaveCount(0);

  // The same place with no other test this week, at PUSHING: the ring is a call, they come to take it (the call is the
  // ruling's preferred answer). The slip says so; the price is the full one (12) although they believe us enough (50)
  // that a solid ring is backed at 6.
  const callPatch = desk(g, { regions: { ...calm(g), MRD: pressedLeft(1, 2) } }, { step: 2 });
  const callAt = staged(g, callPatch);
  expect(promiseWillRing(callAt, 'MRD')).toBe(true);
  expect(isProvocation(callAt, 'MRD')).toBe(true);
  const ringed = (promise(callAt, 'MRD') as { ok: true; state: GameState }).state;
  const unprovoked: GameState = { ...ringed, promises: ringed.promises.map((p) => ({ region: p.region, since: p.since, inherited: p.inherited })) };
  expect(backCost(unprovoked, 'MRD', 1)).toBe(RULES.backCostBelieved);
  expect(backCost(ringed, 'MRD', 1)).toBe(RULES.backCost);
  await set(page, callPatch);
  await hold(page, 'MRD');
  await expect(warns.filter({ hasText: S.act.promiseCall })).toHaveCount(1);
  await expect(warns.filter({ hasText: S.act.tooLate })).toHaveCount(0);
  await expect(warns.filter({ hasText: S.act.promiseProvokes })).toHaveCount(1);
  await expect(warns.last()).toHaveText(fill(S.act.backPrice, { cost: RULES.backCost }));
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  await expect(slip(page)).toHaveCount(0);
  expect((await state(page)).promises.find((p) => p.region === 'MRD')?.provocation).toBe(true);
  const rung = await sendOrders(page);
  expect(rung.phase).toBe('phone');
  expect(rung.phone?.region).toBe('MRD');
  // BACK IT at the full price on its typed form, and WAIT says what waiting would make it.
  await expect(page.locator('.pp-ch').nth(0).locator('.c')).toContainText(`costs ${RULES.backCost} influence`);
  await expect(page.locator('.pp-ch').nth(2).locator('.c')).toContainText(fill(S.words.waitNext, { cost: RULES.backCost + RULES.waitStakes }));
  // Backing it buys the pause only (SPEC-SMALL "A provocation costs what it claims"): "You backed Morrow Downs" alone, no
  // turn-away, no step down; the place stays hatched with its clock stopped. The week is the one the engine plays in Node.
  const node = answerPhone(content, endWeek(content, ringed), 'back');
  const after = await answer(page, 'back');
  const lines = after.log.find((w) => w.week === 4)!.visible;
  expect(lines).toEqual(node.log.find((w) => w.week === 4)!.visible);
  expect(lines).toContain(line('backedOnly', { region: regionName('MRD') }));
  expect(lines).not.toContain(line('backed', { region: regionName('MRD') }));
  expect(lines.some((l) => said([l], S.headlines.easedStep))).toBe(false);
  expect(after.fed.step).toBe(2);
  expect(after.regions.MRD.state).toBe('pressed');
  await expect(page.getByRole('img', { name: S.words.steps[1] })).toBeVisible();
  await expect(page.locator('.pp-l-press [data-key="press:MRD"]')).toBeAttached();
  await expect(page.locator('.pp-l-clock [data-key^="clock:MRD:"]')).toHaveCount(0);
});

test('the note keeps its warning: the eve of a fall names what a piece can still reach and what nothing can, stays under the orders, and says when it would be world war', async ({ page }) => {
  await open(page);
  const g = await seed(page, SEED_WEEK);
  const note = page.locator('.pp-note');

  // Week 4: Vessary and Lintel both at their last tick. The brigade can still reach Vessary this week; nothing of ours
  // can reach Lintel. The note says each truly (the shoulder recheck: it offered an answer that did not exist).
  const evePatch = desk(g, { regions: { ...calm(g), VSY: pressedLeft(1), LTL: pressedLeft(1) } });
  const eve = staged(g, evePatch);
  expect(fallsThisWeek(eve).sort()).toEqual(['LTL', 'VSY']);
  expect(fallsAnswerable(eve)).toEqual(['VSY']);
  expect(fallsEndTheGame(eve)).toBe(false);
  const warning = `${fill(S.note.fallsOne, { region: regionName('VSY') })} ${fill(S.note.fallsOneFar, { region: regionName('LTL') })}`;
  await set(page, evePatch);
  await expect(note).toContainText(warning);
  await expect(note).not.toContainText(S.note.worldWarEve);
  // The pencil ticks agree: one, ringed, beside each.
  for (const r of ['VSY', 'LTL']) await expect(page.locator(`.pp-l-clock [data-key="clock:${r}:1"] .pp-tick`)).toHaveCount(2);
  // An order does not wipe it (the niche recheck): the act first, the warning under it.
  await hold(page, 'QLN');
  await slip(page).getByRole('button', { name: S.act.promise }).tap();
  await expect(note).toHaveText(`You promised to defend ${regionName('QLN')}. ${warning}`);

  // Seven places fighting and Vessary at its last tick: that fall would be the eighth, and the note says it would be world war.
  const seven = ['KLP', 'BRK', 'LTL', 'TLM', 'DNM', 'ORN', 'SHL'] as RegionId[];
  const wwPatch = desk(g, { regions: { ...fighting(g, seven), VSY: pressedLeft(1) }, war: 7 });
  const ww = staged(g, wwPatch);
  expect(fallsEndTheGame(ww)).toBe(true);
  expect(spreadEndsTheGame(ww)).toBe(false);
  await set(page, wwPatch);
  await expect(note).toContainText(`${fill(S.note.fallsOne, { region: regionName('VSY') })} ${S.note.worldWarEve}`);

  // The same seven at FIGHTING with nothing hatched: no fall, but the fighting's own spread would fill the eighth box,
  // and the note says that too (the shoulder recheck: the eve missed the spread).
  const spreadPatch = desk(g, { regions: fighting(g, seven), war: 7 }, { step: 4, will: 30 });
  const spread = staged(g, spreadPatch);
  expect(fallsThisWeek(spread)).toEqual([]);
  expect(spreadEndsTheGame(spread)).toBe(true);
  await set(page, spreadPatch);
  await expect(note).toContainText(S.note.spreadWorldWar);
  await expect(page.getByRole('img', { name: S.words.steps[3] })).toBeVisible();
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
  // Their push lands: the place it landed on is hatched (pressed) on the sheet.
  const pressed = Object.keys(expected.regions).filter((r) => expected.regions[r].state === 'pressed');
  expect(pressed.length).toBeGreaterThanOrEqual(1);
  await expect(page.locator(`.pp-l-press [data-key="press:${pressed[0]}"]`)).toBeAttached({ timeout: 15_000 });
  await settle(page);

  const s2 = await state(page);
  expect(s2.week).toBe(2);
  expect(s2.phase).toBe('act');
  expect(s2.log[0].visible).toEqual(lines);
  expect(s2.regions[pressed[0]].state).toBe('pressed');
  await expect(page.locator('.pp-cal .num')).toContainText('2');
  await expect(page.locator('.pp-cal .nt')).toContainText(`${S.words.influence} ${s2.influence}`);
  // The tape shows the last three lines, tagged with the week; the note now reads the world.
  const tape = await page.locator('.pp-tape .ln:not(.pp-decl)').allTextContents();
  expect(tape).toHaveLength(3);
  expect(tape[2].toUpperCase()).toContain(lines[lines.length - 1].toUpperCase());
  await expect(page.locator('.pp-tape .ln i').last()).toHaveText(`${S.words.week} 1`);
  // The three declared lines stay pinned at the head all game.
  await expect(page.locator('.pp-tape .ln.pp-decl')).toHaveText(declaredTapes(s2));
  await expect(page.locator('.pp-note')).toContainText(`They are pushing ${S.blocs[blocOf(pressed[0])]}`);
  // Week 2's headings are the new pins and arrows.
  for (const h of s2.fed.headings) await expect(page.locator(`.pp-l-head [data-key="pin:${h.from}:${h.to}"]`)).toBeAttached();
  // A pressed place shows its clock: its weeks left as pencil ticks beside the hatching (the engine's weeksLeft).
  for (const r of pressed) {
    const n = weeksLeft(s2, r);
    if (n === null) await expect(page.locator(`.pp-l-clock [data-key^="clock:${r}:"]`)).toHaveCount(0);
    else {
      await expect(page.locator(`.pp-l-clock [data-key="clock:${r}:${n}"]`)).toBeAttached();
      await expect(page.locator(`.pp-l-clock [data-key="clock:${r}:${n}"] .pp-tick`)).toHaveCount(n === 1 ? 2 : n);
    }
  }
  // The WAR boxes are the sheet's own count.
  await expect(page.locator('.pp-card .row').first().locator('svg.bar g')).toHaveCount(Object.values(s2.regions).filter((r) => r.state === 'fighting').length);
  expect(s2.influence).toBe(expected.influence);
  expect(s1.week).toBe(1);
});

test('the phone: the inherited promise is tested, the room goes dark, forty words, three advisers, three forms; BACK IT holds and the week finishes', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  const expected = endWeek(content, newGame(content, SEED_WEEK));
  expect(expected.phase).toBe('phone');
  const phone = expected.phone!;

  // SEND ORDERS, and the moment the call is laid down a tap where WAIT will be: it is not an answer (the forms are not on the paper yet).
  await page.getByRole('button', { name: S.words.sendOrders }).tap();
  await page.locator('.pp-ch').nth(2).waitFor({ state: 'attached', timeout: 60_000 });
  const f = await page.evaluate(() => window.__redlines!.frame());
  await page.touchscreen.tap(f.left + 120 * f.scale, f.top + 724 * f.scale);
  await page.waitForTimeout(400);
  let s = await state(page);
  expect(s.phase).toBe('phone');
  expect(s.phone?.round).toBe(1);
  await settle(page);
  s = await state(page);
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
  // WAIT says what waiting costs: BACK IT a week later, at the stakes (the cold recheck: the form hid the rise).
  expect(backCost(expected, 'DRF', 2)).toBe(30);
  await expect(forms.nth(2).locator('.c')).toHaveText(phone.options[2].cost);
  await expect(forms.nth(2).locator('.c')).toContainText(fill(S.words.waitNext, { cost: 30 }));
  await expect(forms.nth(0)).toBeEnabled();
  // The tested place is over-circled on the sheet with TESTED, and the sheet has slid so it shows in the band between the handset and the caller card.
  await expect(page.locator('.pp-l-test [data-key="test:DRF"]')).toBeAttached();
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.tested })).toHaveCount(1);
  await page.waitForTimeout(500);
  const ring = await frameBox(page, '.pp-l-test [data-key="test:DRF"]');
  expect(ring.y0).toBeGreaterThan(55);
  expect(ring.y1).toBeLessThan(165);
  expect(ring.x0).toBeGreaterThan(100);
  expect(ring.x1).toBeLessThan(390);

  // BACK IT: the rest of the week plays; it held; influence down by 24 (then the week's income); the room is light again.
  const backed = answerPhone(content, expected, 'back');
  const after = await answer(page, 'back');
  expect(after.week).toBe(2);
  expect(after.phase).toBe('act');
  expect(after.influence).toBe(backed.influence);
  expect(backed.influence).toBeLessThanOrEqual(30 - 24 + 8);
  // The week on the sheet is the week the engine computed in Node, line for line; and on this seed the far promise held.
  expect(after.log[0].visible).toEqual(backed.log[0].visible);
  expect(said(after.log[0].visible, S.headlines.backedFar, { region: regionName('DRF') })).toBe(true);
  // What you did is printed as what you did: the answer as the act, never the form's forecast.
  expect(after.log[0].acts).toContain(S.answers.test.back.replace('{region}', regionName('DRF')));
  await expect(page.locator('.pp-room')).not.toHaveClass(/pp-room-call/);
  await expect(page.locator('.pp-cal .num')).toContainText('2');
  await expect(page.locator('.pp-l-hw text', { hasText: S.words.tested })).toHaveCount(0);
});

test('a thumb drumming to skip the playback never answers the call: the forms arm only once the finger is still', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  // The robustness critic's drum: SEND ORDERS, then a tap mid-screen every 150 ms (BACK DOWN sits there) for two seconds.
  await page.getByRole('button', { name: S.words.sendOrders }).tap();
  const f = await page.evaluate(() => window.__redlines!.frame());
  for (let i = 0; i < 13; i++) {
    await page.touchscreen.tap(f.left + 195 * f.scale, f.top + 640 * f.scale);
    await page.waitForTimeout(150);
  }
  // The first tap skipped the playback; none of the others answered: the call is still ringing, round 1.
  await page.waitForTimeout(1_000);
  const s = await state(page);
  expect(s.phase).toBe('phone');
  expect(s.phone?.round).toBe(1);
  expect(s.week).toBe(1);
  // Once the finger is still the forms arm, and a fresh tap answers.
  await page.locator('.rl-forms.rl-armed').waitFor({ state: 'attached', timeout: 5_000 });
  const after = await answer(page, 'back');
  expect(after.week).toBe(2);
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
  // BACK DOWN: the promise goes, the place they were testing is theirs to take (pressed, or fallen when its clock has
  // run), the ladder moves as the engine says, and the stamp reads the new word; the sheet shows the place's state.
  const node = answerPhone(content, endWeek(content, answerPhone(content, endWeek(content, newGame(content, SEED_WEEK)), 'wait')), 'down');
  s = await answer(page, 'down');
  expect(s.promises.some((p) => p.region === 'DRF')).toBe(false);
  expect(['pressed', 'fighting']).toContain(s.regions.DRF.state);
  expect(s.regions.DRF.state).toBe(node.regions.DRF.state);
  expect(s.fed.step).toBe(node.fed.step);
  expect(said(s.log[1].visible, S.headlines.backedDown, { region: regionName('DRF') }) || said(s.log[1].visible, S.headlines.backedDownEased ?? S.headlines.backedDown, { region: regionName('DRF') })).toBe(true);
  await expect(page.getByRole('img', { name: S.words.steps[s.fed.step - 1] })).toBeVisible();
  await expect(page.locator(s.regions.DRF.state === 'fighting' ? '.pp-l-fight [data-key="fight:DRF"]' : '.pp-l-press [data-key="press:DRF"]')).toBeAttached();
});

test('influence is on the call: the influence in hand beside the forms, and a form you cannot afford says why in its own line', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  let s = await sendOrders(page);
  expect(s.phase).toBe('phone');
  await expect(page.locator('.rl-purse')).toHaveText(S.phone.inHand.replace('{influence}', String(s.influence)));
  await expect(page.locator('.pp-ch').nth(0)).toBeEnabled();
  // Five influence left: BACK IT is dimmed, and its typed line says what it needs and what is in hand.
  s = await set(page, { influence: 5 });
  const need = answerCost(s, 'back');
  expect(need).toBeGreaterThan(5);
  await expect(page.locator('.rl-purse')).toHaveText(S.phone.inHand.replace('{influence}', '5'));
  await expect(page.locator('.pp-ch').nth(0)).toBeDisabled();
  const back = page.locator('.pp-ch').nth(0).locator('.c');
  await expect(back).toContainText(s.phone!.options[0].cost);
  await expect(back).toContainText(`${s.phone!.options[0].cost} · ${S.phone.needs.replace('{cost}', String(need)).replace('{influence}', '5')}`);
  // The other two forms can still be had.
  await expect(page.locator('.pp-ch').nth(1)).toBeEnabled();
  await expect(page.locator('.pp-ch').nth(2)).toBeEnabled();
});

test('their summit: it rings when they have been stopped, ACCEPT moves the bar +15 beside its line and the stamp back to TESTING; never over a way out of yours', async ({ page }) => {
  await open(page);
  const g = await seed(page, SEED_SUMMIT);
  const node = endWeek(content, staged(g, summitPatch(g)));
  expect(node.phone?.kind).toBe('summit');
  await set(page, summitPatch(g));
  let s = await sendOrders(page);
  expect(s.phase).toBe('phone');
  expect(s.phone?.kind).toBe('summit');
  await expect(page.locator('.pp-caller .msg')).toHaveText(node.phone!.text);
  expect(s.fed.step).toBe(2);
  const before = s.treaty;
  // ACCEPT: the line prints, and beside it the bar has moved by the rules' +15 and the stamp reads TESTING.
  const opt = s.phone!.options.find((o) => o.key === 'back')!;
  await page.locator('.rl-forms.rl-armed').waitFor({ state: 'attached', timeout: 5_000 });
  await page.locator('.pp-ch').filter({ hasText: opt.label }).tap();
  const accepted = line('summitAccepted', { step: S.words.steps[0] });
  await expect(page.locator('.pp-note')).toHaveText(new RegExp(`^${accepted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), { timeout: 15_000 });
  await expect(page.locator('.pp-card .val')).toHaveText(`${before + RULES.willWayOut}%`);
  await expect(page.getByRole('img', { name: S.words.steps[0] })).toBeVisible();
  await settle(page);
  s = await state(page);
  expect(s.fed.step).toBe(1);
  expect(s.log[s.log.length - 1].visible).toContain(accepted);

  // The same week with a summit of yours on the table: theirs does not ring over it.
  const h = await seed(page, SEED_SUMMIT);
  const offered = offerWayOut(staged(h, summitPatch(h)), 'summit');
  expect(offered.ok).toBe(true);
  if (offered.ok) expect(endWeek(content, offered.state).phone?.kind).not.toBe('summit');
  await set(page, summitPatch(h));
  await page.getByRole('button', { name: new RegExp(`^${S.words.wayOut}`) }).tap();
  await page.getByRole('dialog', { name: S.words.wayOut }).getByRole('button', { name: new RegExp(`^${S.act.termLabels.summit}`) }).tap();
  s = await sendOrders(page);
  expect(s.phone?.kind ?? null).not.toBe('summit');
});

test('the trawler rings about an island under a ring of yours, or in words that claim no promise; BACK THEM answers it', async ({ page }) => {
  await open(page);
  // Gullrest promised: the call is about Gullrest, and may speak of the promise.
  const g = await seed(page, SEED_TRAWLER);
  await set(page, trawlerPatch(g, true));
  let s = await sendOrders(page);
  expect(s.phone?.kind).toBe('trawler');
  expect(s.phone?.region).toBe('GUL');
  await expect(page.locator('.pp-caller .msg')).toContainText(regionName('GUL'));
  const back = s.phone!.options.find((o) => o.key === 'back')!;
  s = await answer(page, 'back');
  expect(s.log[s.log.length - 1].visible).toContain(line('trawlerBacked', { region: regionName('GUL') }));
  // Nothing promised: the call is in the words that claim no promise.
  const h = await seed(page, SEED_TRAWLER);
  await set(page, trawlerPatch(h, false));
  s = await sendOrders(page);
  expect(s.phone?.kind).toBe('trawler');
  expect(s.phone?.template).toBe('trawler-unpromised');
  const t = content.phones.find((p) => p.id === 'trawler-unpromised')!;
  expect(t.when).toBe('unpromised');
  expect(back.label).toBeTruthy();
});

test('a bar at 100 that does not sign says why on the tape and names the places it would not sign over; the sheet hatches them', async ({ page }) => {
  await open(page);
  const g = await seed(page, SEED_WEEK);
  // Week 5, the bar at 95; Vessary and Quillon hatched a week, nothing of ours in them, each one line-free move from a
  // piece: "unanswered". A quiet week takes the bar to 100 and they do not sign (SPEC-SMALL "The treaty is signed over a
  // quiet map"); the tape names the two places (the cold recheck: it counted places the sheet did not mark).
  const patch = desk(g, { week: 5, treaty: 95, regions: { ...calm(g), VSY: pressedLeft(2), QLN: pressedLeft(2) } }, { will: 95 });
  const st = staged(g, patch);
  expect(unansweredRegions(st).sort()).toEqual(['QLN', 'VSY']);
  const node = endWeek(content, st);
  expect(node.phase).toBe('act');
  expect(node.fed.will).toBeGreaterThanOrEqual(RULES.willSign);
  const week5 = node.log.find((w) => w.week === 5)!.visible;
  const noSign = week5.find((l) => said([l], S.headlines.noSignPressed));
  expect(noSign, week5.join(' | ')).toBeTruthy();
  expect(noSign).toContain(regionName('VSY'));
  expect(noSign).toContain(regionName('QLN'));
  expect(noSign!.length).toBeLessThanOrEqual(46);
  await set(page, patch);
  const s = await sendOrders(page);
  expect(s.phase).toBe('act');
  expect(s.week).toBe(6);
  expect(s.log.find((w) => w.week === 5)!.visible).toEqual(week5);
  // The newest line on the tape is the reason, and the bar reads 100.
  const tape = await page.locator('.pp-tape .ln:not(.pp-decl)').allTextContents();
  expect(tape[tape.length - 1].toUpperCase()).toContain(week5[week5.length - 1].toUpperCase());
  expect(week5[week5.length - 1]).toBe(noSign);
  await expect(page.locator('.pp-card .val')).toHaveText(`${s.treaty}%`);
  expect(s.treaty).toBeGreaterThanOrEqual(RULES.willSign);
  // The places it names are the hatched places on the sheet.
  for (const r of ['VSY', 'QLN']) await expect(page.locator(`.pp-l-press [data-key="press:${r}"]`)).toBeAttached();
  await expect(page.locator('.pp-l-press [data-key^="press:"]')).toHaveCount(2);
});

/** What the screen shows at one beat of a playback: the tape's newest line, the WAR boxes, the places the sheet draws fighting (and its red stamps), the stamp, the bar. */
interface BeatSeen {
  tape: string;
  war: number;
  fighting: string[];
  red: number;
  stamp: string;
  treaty: string;
}
/** Start writing down every beat: each time the tape's newest line changes, what the screen shows half a beat later. */
async function recordBeats(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __beats: unknown[]; __rec: number };
    const snap = () => {
      const lines = [...document.querySelectorAll('.pp-tape .ln')];
      const card = document.querySelector('.pp-card');
      const v = window.__redlines!.view();
      return {
        tape: (lines[lines.length - 1]?.querySelector('i') ? lines[lines.length - 1].childNodes[1]?.textContent : lines[lines.length - 1]?.textContent) ?? '',
        war: card?.querySelector('.row svg.bar')?.querySelectorAll('g').length ?? -1,
        fighting: Object.entries(v.states).filter(([, st]) => st === 'fighting').map(([k]) => k).sort(),
        red: document.querySelectorAll('.pp-l-fight .pp-mk').length,
        stamp: card?.querySelector('.pp-stamp')?.getAttribute('aria-label') ?? '',
        treaty: card?.querySelector('.val')?.textContent ?? '',
      };
    };
    w.__beats = [];
    let seen = '';
    w.__rec = window.setInterval(() => {
      const now = [...document.querySelectorAll('.pp-tape .ln')].map((l) => l.textContent).join('|');
      if (now === seen) return;
      seen = now;
      window.setTimeout(() => w.__beats.push(snap()), 450);
    }, 40);
  });
}
async function beatsSeen(page: Page): Promise<BeatSeen[]> {
  await page.waitForTimeout(600);
  const all = await page.evaluate(() => {
    const w = window as unknown as { __beats: BeatSeen[]; __rec: number };
    window.clearInterval(w.__rec);
    return w.__beats;
  });
  // One entry per line, the call's dark room left out (no index card under it).
  return all.filter((b, i) => b.war >= 0 && (i === 0 || b.tape !== all[i - 1].tape));
}
/** A place that fell in an earlier week (the one a step down may quiet): Kelpmouth, fighting since week 2. */
const fellEarlier = (s: GameState, week: number): GameState['regions'] => ({
  ...calm(s),
  KLP: { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: week, fellSeq: 1, fellBy: 'unanswered', fellReach: true },
});
const weekLog = (week: number, war: number, step: 1 | 2 | 3 | 4 | 5, treaty: number) => ({ week, visible: [], hidden: [], acts: [], danger: { war, treaty, step }, beats: [] });
/** RULING-A0: week 3, a dashed inherited ring at Driftholm their push tests, a scared Federation (jumpiness 0.8), Kelpmouth fallen in week 2. */
const backDownPatch = (s: GameState): Partial<GameState> => ({
  week: 3,
  regions: fellEarlier(s, 2),
  war: 1,
  promises: [{ region: 'DRF', since: 1, inherited: true }],
  pieces: [
    { kind: 'fleet', at: 'TRN' },
    { kind: 'brigade', at: 'EDV' },
  ],
  pendingTest: null,
  offer: null,
  phone: null,
  acts: [],
  moved: [],
  events: 4,
  phonesUsed: [],
  log: [weekLog(1, 0, 1, 45), weekLog(2, 1, 2, 40), weekLog(3, 1, 2, 40)],
  treaty: 40,
  fed: { ...s.fed, jumpiness: 0.8, appetite: 0.5, step: 2, will: 40, belief: 30, headings: [{ from: 'GLM', to: 'DRF', real: true }] },
});
/** RULING-B1: week 5, Brackwater pressed with one week left and nothing of yours near it, Kelpmouth fallen in week 3, the bar at 85. */
const fallWeekPatch = (s: GameState): Partial<GameState> => ({
  week: 5,
  regions: { ...fellEarlier(s, 3), BRK: { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 } },
  war: 1,
  promises: [],
  pieces: [
    { kind: 'fleet', at: 'TRN' },
    { kind: 'brigade', at: 'EDV' },
  ],
  pendingTest: null,
  offer: null,
  phone: null,
  acts: [],
  moved: [],
  events: 4,
  phonesUsed: [],
  log: [weekLog(1, 0, 1, 45), weekLog(2, 0, 1, 50), weekLog(3, 1, 2, 75), weekLog(4, 1, 2, 80), weekLog(5, 1, 2, 85)],
  treaty: 85,
  fed: { ...s.fed, appetite: 0.2, step: 2, will: 85, headings: [] },
});

test('cause before effect on the sheet: a back-down at a dashed ring facing a scared Federation, and a way out accepted in a week a place fell, beat by beat', async ({ page }) => {
  await open(page);
  // A: the engine in Node says what the week prints; the page must play exactly that, one line a beat, the sheet with it.
  const a = await seed(page, 'RULING-A0');
  const nodeA = answerPhone(content, endWeek(content, staged(a, backDownPatch(a))), 'down');
  const linesA = nodeA.log.find((w) => w.week === 3)!.visible;
  const downAt = linesA.indexOf(line('backedDownEased', { region: regionName('DRF') }));
  expect(downAt).toBeGreaterThanOrEqual(0);
  expect(linesA[downAt + 1]).toBe(line('fell', { region: regionName('DRF') }));
  // SPEC-SMALL "Backing down is never the best answer": the scared Federation's step down returns no place.
  expect(linesA).not.toContain(line('recovered', { region: regionName('KLP') }));
  await set(page, backDownPatch(a));
  // The dashed ring, Kelpmouth red, one WAR box.
  await expect(page.locator('.pp-l-prom .pp-dashed')).toHaveCount(1);
  await expect(page.locator('.pp-card .row').first().locator('svg.bar g')).toHaveCount(1);
  let s = await sendOrders(page);
  expect(s.phase).toBe('phone');
  expect(s.phone?.region).toBe('DRF');
  await recordBeats(page);
  s = await answer(page, 'down');
  // The answer's half of the week: every line from the back-down on, each on its own beat, in the engine's order.
  const seenA = (await beatsSeen(page)).filter((b) => linesA.slice(downAt).includes(b.tape));
  expect(seenA.map((b) => b.tape)).toEqual(linesA.slice(downAt));
  const at = (text: string) => seenA.find((b) => b.tape === text)!;
  // The back-down first: the ring goes, Driftholm is not yet red, the stamp eases a step, one WAR box.
  const down = at(line('backedDownEased', { region: regionName('DRF') }));
  expect(down.fighting).toEqual(['KLP']);
  expect(down.war).toBe(1);
  expect(down.stamp).toBe(S.words.steps[1]);
  // Then what it cost: Driftholm falls, two boxes, two red stamps.
  const fell = at(line('fell', { region: regionName('DRF') }));
  expect(fell.fighting).toEqual(['DRF', 'KLP']);
  expect(fell.war).toBe(2);
  // Kelpmouth, fallen a week earlier, stays fallen: the step down returns nothing.
  expect(seenA[seenA.length - 1].fighting).toEqual(['DRF', 'KLP']);
  // Every beat: the WAR boxes are the sheet's own count, and the sheet's red stamps agree.
  for (const b of seenA) {
    expect(b.war, b.tape).toBe(b.fighting.length);
    expect(b.red, b.tape).toBe(b.fighting.length);
  }
  expect(s.regions.DRF.state).toBe('fighting');
  expect(s.log.find((w) => w.week === 3)!.acts).toContain(S.answers.test.down.replace('{region}', regionName('DRF')));

  // B: a summit offered by its typed form in a week Brackwater's clock runs out.
  const b0 = await seed(page, 'RULING-B1');
  const r = offerWayOut(staged(b0, fallWeekPatch(b0)), 'summit');
  expect(r.ok).toBe(true);
  const nodeB = endWeek(content, (r as { ok: true; state: GameState }).state);
  const linesB = nodeB.log.find((w) => w.week === 5)!.visible;
  expect(linesB).toContain(line('wayOutAccepted', { term: S.terms.summit }));
  await set(page, fallWeekPatch(b0));
  // The pressed place shows its clock: one tick, ringed.
  await expect(page.locator('.pp-l-clock [data-key="clock:BRK:1"] .pp-tick')).toHaveCount(2);
  await page.getByRole('button', { name: new RegExp(`^${S.words.wayOut}`) }).tap();
  await page.getByRole('dialog', { name: S.words.wayOut }).getByRole('button', { name: new RegExp(`^${S.act.termLabels.summit}`) }).tap();
  await recordBeats(page);
  s = await sendOrders(page);
  const seenB = (await beatsSeen(page)).filter((b) => linesB.includes(b.tape));
  expect(seenB.map((b) => b.tape)).toEqual(linesB);
  const fellB = linesB.indexOf(line('fell', { region: regionName('BRK') }));
  const accepts = linesB.indexOf(line('wayOutAccepted', { term: S.terms.summit }));
  const eased = linesB.indexOf(line('easedStep', { step: S.words.steps[0] }));
  const quietB = linesB.indexOf(line('recovered', { region: regionName('KLP') }));
  // The week's fall, then their acceptance, then the step down on its own line, then the place it returns: one that
  // fell in an earlier week.
  expect(fellB).toBeGreaterThanOrEqual(0);
  expect(accepts).toBeGreaterThan(fellB);
  expect(eased).toBe(accepts + 1);
  expect(quietB).toBe(eased + 1);
  expect(linesB).not.toContain(line('recovered', { region: regionName('BRK') }));
  // Brackwater stays red from its fall to the end of the week; the boxes follow the sheet every beat.
  seenB.forEach((b, i) => {
    expect(b.war, b.tape).toBe(b.fighting.length);
    expect(b.red, b.tape).toBe(b.fighting.length);
    if (i >= fellB) expect(b.fighting, b.tape).toContain('BRK');
  });
  // The bar moves beside the acceptance; the stamp eases beside its own line, not before it.
  expect(seenB[accepts].treaty).toBe(`${85 + RULES.willWayOut}%`);
  expect(seenB[accepts].stamp).toBe(S.words.steps[1]);
  expect(seenB[eased].stamp).toBe(S.words.steps[0]);
  expect(seenB[quietB].fighting).toEqual(['BRK']);
  expect(s.regions.BRK.state).toBe('fighting');
  expect(s.regions.KLP.state).toBe('pressed');
});

test('the tape: every line the engine can print fits the teleprinter after a WEEK 10 tag, in the real font, and the live tape never runs over', async ({ page }) => {
  await open(page);
  await seed(page, SEED_WEEK);
  // The longest words each slot can take.
  const longest = (xs: readonly string[]) => xs.reduce((a, b) => (b.length > a.length ? b : a), '');
  const names = REGION_IDS.map((r) => regionName(r));
  const numbers = S.numbers.slice(2, RULES.warLimit + 1);
  const slots: Record<string, string> = {
    region: longest(names),
    from: longest(names),
    step: longest(S.words.steps),
    n: longest([longest(names), ...numbers.map((n) => S.counts.placesMany.replace('{n}', n))]),
    term: longest(Object.values(S.terms)),
    bloc: longest(Object.values(S.blocs)).replace(/^./, (c) => c.toUpperCase()),
    piece: longest(Object.values(S.pieces)).replace(/^./, (c) => c.toUpperCase()),
    why: longest(Object.values(S.wintermast).map((w) => w.replace('{region}', longest(names)).replace('{piece}', longest(Object.values(S.pieces))))),
    line: longest(content.lines.map((l) => l.tape)),
  };
  // The spread names two places next door to each other: the longest such pair.
  const pairs = REGION_IDS.flatMap((a) => (NEIGHBOURS[a] ?? []).map((b) => [regionName(a), regionName(b)] as const));
  const spread = pairs.reduce((a, b) => (b[0].length + b[1].length > a[0].length + a[1].length ? b : a));
  const lines = HEADLINE_KINDS.map((k) => (k === 'spread' ? line(k, { from: spread[0], region: spread[1] }) : line(k, slots))).concat(content.lines.map((l) => l.tape), S.flavour);
  for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(46);
  const over = await page.evaluate(
    ([all, tag]) => {
      const tape = document.querySelector('.pp-tape')!;
      const out: string[] = [];
      for (const text of all) {
        const ln = document.createElement('div');
        ln.className = 'ln';
        const i = document.createElement('i');
        i.textContent = tag;
        ln.append(i, text);
        tape.appendChild(ln);
        if (ln.scrollWidth > ln.clientWidth + 0.5) out.push(`${text} (${ln.scrollWidth} > ${ln.clientWidth})`);
        ln.remove();
      }
      return out;
    },
    [lines, `${S.words.week} ${RULES.weeks}`] as const,
  );
  expect(over).toEqual([]);
  // The live tape, after a week has resolved.
  await sendOrders(page);
  const live = await page.evaluate(() => [...document.querySelectorAll('.pp-tape .ln')].map((l) => l.scrollWidth - l.clientWidth));
  for (const d of live) expect(d).toBeLessThanOrEqual(0.5);
});

// ---------------------------------------------------------------- the endings and the debrief

test('the three endings through the hook: TREATY, WORLD WAR and FROZEN on their typed cards, then the debrief pages', async ({ page }) => {
  await open(page);
  const g = await seed(page, SEED_WEEK);
  const quiet = { regions: calm(g), promises: [], pendingTest: null, offer: null, events: 4, phone: null, acts: [], moved: [] } as Partial<GameState>;

  // TREATY: the bar at 95 and a quiet week: +5 and they sign. The game's tally is staged so the closing card has
  // lessons to draw (a feint backed, a back-down, only dashed rings tested).
  const tally = {
    testsSolid: 0,
    testsDashed: 2,
    backed: 0,
    backedDown: 1,
    backedDownFirst: 'VSY',
    feintsBacked: 1,
    feintBackedFirst: 'SHL',
    outOfReach: 0,
    outOfReachFirst: null,
    moves: 3,
    idleWeeks: 0,
    farDrops: 0,
    farDropFirst: null,
    stoppedThenTalked: 0,
    jumpinessSeen: false,
  };
  await set(page, { ...quiet, week: 5, fed: { ...g.fed, will: 95, step: 1, headings: [] }, treaty: 95, tally });
  let s = await sendOrders(page);
  expect(s.phase).toBe('ended');
  expect(s.ending?.kind).toBe('treaty');
  await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.treaty);
  await expect(page.locator('.pp-typed .ti')).toHaveClass(/blue/);
  await expect(page.locator('.pp-typed .ln').nth(0)).toHaveText(s.ending!.lines[0]);
  await expect(page.locator('.pp-typed .ln').nth(1)).toHaveText(s.ending!.lines[1]);
  await expect(page.locator('.pp-typed .sc b')).toHaveText(String(s.ending!.score));
  // Treaty in week w with f fighting: 100 − 8w − 5f (SPEC-SMALL, ten weeks), as the rules have it.
  expect(RULES.score.treatyPerWeek).toBe(8);
  expect(s.ending!.score).toBe(RULES.score.treatyBase - RULES.score.treatyPerWeek * 5 - RULES.score.treatyPerFighting * s.ending!.fighting);
  expect(s.log[s.log.length - 1].visible).toContain(S.headlines.treatySigned);
  // The teleprinter runs on under the card: its last line is the signing.
  await expect(page.locator('.pp-tape .ln').last()).toContainText(S.headlines.treatySigned);

  // The debrief: one page a week, what you did and what they were thinking (in red), BACK and NEXT, then the closing card.
  // (The card takes taps once it has landed, like the phone's forms.)
  await page.locator('.rl-ending.rl-armed').waitFor({ state: 'attached', timeout: 5_000 });
  await choice(page, S.debrief.next).tap();
  const pages = s.log.length;
  await expect(page.locator('.pp-debrief .wk')).toContainText(`WEEK ${s.log[0].week}`);
  await expect(page.locator('.pp-debrief .lab').nth(0)).toHaveText(S.debrief.youDid.toUpperCase());
  await expect(page.locator('.pp-debrief .lab').nth(1)).toHaveText(S.debrief.theyThought.toUpperCase());
  // A lesson and the dials print once, on the closing card: a page carries the week's own thoughts only.
  const closing = [...(s.ending!.lessons ?? []), s.ending!.dials];
  const thoughts0 = s.log[0].hidden.filter((h) => !closing.includes(h));
  await expect(page.locator('.pp-debrief .thought').first()).toHaveText(thoughts0[0] ?? S.debrief.nothingHidden);
  await expect(page.locator('.pp-debrief .pg')).toHaveText(`1 / ${pages}`);
  for (let i = 1; i < pages; i++) {
    await choice(page, S.debrief.next).tap();
    await expect(page.locator('.pp-debrief .pg')).toHaveText(`${i + 1} / ${pages}`);
  }
  // A reload mid-debrief comes back, through CONTINUE, to the page being read.
  await page.reload();
  await page.waitForFunction(() => !!window.__redlines);
  await page.getByRole('button', { name: /^CONTINUE/ }).tap();
  await expect(page.locator('.pp-debrief .pg')).toHaveText(`${pages} / ${pages}`);
  await page.waitForTimeout(500);
  // The last page does not repeat the closing card (the second review: the lessons printed twice). BACK turns a page back
  // (to the ending card from the first page); DONE shows the closing card with the lessons and the dials, PLAY AGAIN and TITLE.
  for (const t of await page.locator('.pp-debrief .thought').allTextContents()) expect(closing).not.toContain(t);
  await choice(page, S.debrief.back).tap();
  if (pages > 1) await expect(page.locator('.pp-debrief .pg')).toHaveText(`${pages - 1} / ${pages}`);
  else await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.treaty);
  await choice(page, S.debrief.next).tap();
  await expect(page.locator('.pp-debrief .pg')).toHaveText(`${pages} / ${pages}`);
  await choice(page, S.debrief.done).tap();
  await expect(page.locator('.pp-typed .hd')).toHaveText(S.debrief.title);
  // The closing card: the game's own lessons (two or three, from the staged tally), each on the card, then the dials in words last.
  const lessons = s.ending!.lessons ?? [];
  expect(lessons.length).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.pp-typed .ln')).toHaveCount(lessons.length + 1);
  for (let i = 0; i < lessons.length; i++) await expect(page.locator('.pp-typed .ln').nth(i)).toHaveText(lessons[i]);
  await expect(page.locator('.pp-typed .ln').last()).toHaveText(s.ending!.dials);
  await expect(choice(page, S.debrief.again)).toBeVisible();
  await expect(choice(page, S.debrief.toTitle)).toBeVisible();

  // PLAY AGAIN: a new world.
  await choice(page, S.debrief.again).tap();
  await settle(page);
  s = await state(page);
  expect(s.week).toBe(1);
  expect(s.seed).not.toBe(SEED_WEEK);

  // WORLD WAR: seven places fighting at ALL-OUT; the fighting spreads to the eighth.
  const warRegions = fighting(s, ['KLP', 'BRK', 'LTL', 'TLM', 'DNM', 'ORN', 'SHL']);
  await set(page, { ...quiet, week: 5, regions: warRegions, war: 7, fed: { ...s.fed, step: 5, will: 30, headings: [] }, treaty: 30 });
  await expect(page.locator('.pp-l-fight .pp-mk')).toHaveCount(7);
  // The WAR boxes count the places fighting on the sheet: seven hatched boxes for seven red places.
  await expect(page.locator('.pp-card .row').first().locator('svg.bar g')).toHaveCount(7);
  s = await sendOrders(page);
  expect(s.ending?.kind).toBe('war');
  expect(s.war).toBeGreaterThanOrEqual(8);
  await expect(page.locator('.pp-typed .ti')).toHaveText(S.words.worldWar);
  await expect(page.locator('.pp-typed .ti')).toHaveClass(/red/);
  await expect(page.locator('.pp-typed .ln').nth(0)).toHaveText('Week 5.');
  await expect(page.locator('.pp-typed .sc b')).toHaveText('0');
  expect(s.log[s.log.length - 1].visible.some((l) => l.includes(S.words.worldWar))).toBe(true);
  // The map draws the chain (SPEC-SMALL): each place fighting numbered in red pencil in the order it fell, the first
  // ringed. Each number is placed beside its own stamp: on no stamp, and nearer its own than any other (the look recheck:
  // numbers landed on other places' stamps).
  const fellAt = (r: RegionId) => s.regions[r].fellSeq ?? (s.regions[r].fellWeek ?? 99) * 1000;
  const chain = Object.keys(s.regions)
    .filter((r) => s.regions[r].state === 'fighting')
    .sort((a, b) => fellAt(a) - fellAt(b));
  expect(chain.length).toBe(s.war);
  await expect(page.locator('.pp-l-stamp [data-key^="chain:"]')).toHaveCount(chain.length);
  for (let i = 0; i < chain.length; i++) await expect(page.locator(`.pp-l-stamp [data-key="chain:${chain[i]}:${i + 1}"]`)).toHaveText(String(i + 1));
  await expect(page.locator('.pp-l-test [data-key^="chain-first:"]')).toHaveCount(1);
  await expect(page.locator(`.pp-l-test [data-key="chain-first:${chain[0]}"]`)).toBeAttached();
  const spots = await page.evaluate((ids) => {
    type B = { x0: number; y0: number; x1: number; y1: number };
    const box = (el: Element | null): B | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    };
    const gap = (a: B, b: B) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
    // A stamp is its inked frame (the box round FIGHTING).
    const stamps = ids.map((id) => box(document.querySelector(`.pp-l-stamp [data-key="stamp:${id}"] rect[stroke]`)));
    return ids.map((id, i) => {
      const n = box(document.querySelector(`.pp-l-stamp [data-key="chain:${id}:${i + 1}"] text`));
      if (!n || !stamps[i]) return { id, own: -1, other: -1 };
      const others = stamps.filter((b, j): b is B => j !== i && !!b).map((b) => gap(n, b));
      return { id, own: gap(n, stamps[i]!), other: Math.min(...others) };
    });
  }, chain);
  for (const sp of spots) {
    expect(sp.own, sp.id).toBeGreaterThanOrEqual(0);
    expect(sp.other, `${sp.id}'s number on another stamp`).toBeGreaterThan(0);
    expect(sp.own, `${sp.id}'s number nearer another stamp than its own`).toBeLessThan(sp.other);
  }
  await page.locator('.rl-ending.rl-armed').waitFor({ state: 'attached', timeout: 5_000 });
  await choice(page, S.debrief.next).tap();
  await expect(page.locator('.pp-debrief')).toBeVisible();
  // NEXT through the pages to DONE; TITLE from the closing card puts the finished game away.
  for (let i = 1; i < s.log.length; i++) await choice(page, S.debrief.next).tap();
  await choice(page, S.debrief.done).tap();
  await expect(page.locator('.pp-typed .hd')).toHaveText(S.debrief.title);
  await choice(page, S.debrief.toTitle).tap();
  await expect(choice(page, S.title.play)).toBeVisible();
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toHaveCount(0);

  // Week 8 no longer ends the game (ten weeks); FROZEN is the end of week 10 with neither.
  const h = await seed(page, SEED_QUIET);
  await set(page, { ...quiet, week: 8, fed: { ...h.fed, will: 50, step: 1, headings: [] }, treaty: 50 });
  s = await sendOrders(page);
  expect(s.phase).not.toBe('ended');
  expect(s.week).toBe(9);
  await expect(page.locator('.pp-cal .num')).toContainText('9');
  await set(page, { ...quiet, week: RULES.weeks, fed: { ...h.fed, will: 50, step: 1, headings: [] }, treaty: 50 });
  s = await sendOrders(page);
  expect(s.ending?.kind).toBe('frozen');
  expect(s.ending?.week).toBe(10);
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
  await expect(cont).toContainText(`${S.words.week} 1 ${S.screen.weekOf.replace('{weeks}', String(RULES.weeks))}`);
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

  // HOW TO PLAY: its typed lines; DONE goes back to the menu it was opened from.
  await page.locator('.rl-tag').tap();
  await menu.getByRole('button', { name: S.menu.howToPlay }).tap();
  const how = page.getByRole('dialog', { name: S.howToPlay.title });
  await expect(how).toBeVisible();
  await expect(how.locator('.ln')).toHaveCount(S.howToPlay.lines.length);
  await expect(how.locator('.ln').nth(0)).toHaveText(S.howToPlay.lines[0]);
  await how.getByRole('button', { name: S.debrief.done }).tap();
  await expect(how).toHaveCount(0);
  await expect(menu).toBeVisible();

  // QUIT TO TITLE asks once; NO returns to the menu; YES goes to the title, the game saved.
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

  // PLAY over the game in progress asks once, as QUIT does; NO keeps the saved game.
  await choice(page, S.title.play).tap();
  const fresh = page.getByRole('alertdialog', { name: S.title.play });
  await expect(fresh).toBeVisible();
  await expect(fresh.locator('.ln')).toHaveText(S.title.newGameSure);
  await fresh.getByRole('button', { name: S.menu.no }).tap();
  await expect(fresh).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^CONTINUE/ })).toBeVisible();
  expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY)) ?? 'null')?.state?.seed ?? SEED_WEEK).toBe(SEED_WEEK);

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
