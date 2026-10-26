/**
 * The bots of BUILD.md "The simulator" and SPEC-SMALL's rulings: passive (never promises, never backs),
 * promise-everything (three promises wherever, backs every test), far-promise opening (the sensible bot
 * with the solved opening forced on it: one far promise in week 1, backed once), sensible (promises
 * holdable places near their headings, moves its pieces to hold them, backs tests it can hold, offers a
 * way out whenever they have been stopped), no-orders (withdraws everything in week 1 and sits still,
 * taking their summit when it comes: the "sitting still" line the spec gates at half of sensible) and
 * seller (one far dashed promise at a time, offered up as a dropped promise the next week: the sold far
 * promise the second review found). Each bot draws its own randomness from an Rng the simulator gives
 * it, so a game is reproducible from (seed, bot).
 */
import type { Rng } from '../../engine/rng.ts';
import { promiseMinded } from '../engine/agent.ts';
import { holdInfo, isAnswered, pieceOf, pressedRegions, promiseAt } from '../engine/board.ts';
import type { RedlinesContent } from '../engine/content.ts';
import { answerCost } from '../engine/phone.ts';
import { RULES } from '../engine/rules.ts';
import { canAnswer, canPromise, movePiece, movesFor, offerWayOut, promise, withdraw } from '../engine/run.ts';
import type { GameState, PieceKind, RegionId, WayOutTerm } from '../engine/types.ts';
import { CAP_REGIONS, NEAR_CAP, REGION_IDS, distance, isCap, isHome, reachOf } from '../engine/world.ts';

export type BotName = 'passive' | 'promise-everything' | 'far-promise' | 'sensible' | 'no-orders' | 'seller';
export const BOT_NAMES: readonly BotName[] = ['passive', 'promise-everything', 'far-promise', 'sensible', 'no-orders', 'seller'];
export function isBotName(x: string): x is BotName {
  return (BOT_NAMES as readonly string[]).includes(x);
}

export type Key = 'back' | 'down' | 'wait';

export interface Bot {
  name: BotName;
  /** The week's orders: promises, moves, a way out. Returns the state ready for endWeek. */
  act(content: RedlinesContent, state: GameState, rng: Rng): GameState;
  /** The answer to the call on the line. */
  answer(content: RedlinesContent, state: GameState, rng: Rng): Key;
}

const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

/** Where their arrows point and what is already pressed and unanswered: the places to worry about. */
export function threatened(s: GameState): RegionId[] {
  return unique([...s.fed.headings.map((h) => h.to), ...pressedRegions(s).filter((r) => !isAnswered(s, r))]).filter((r) => s.regions[r].state !== 'fighting');
}

/**
 * Regions a declared line of this kind covers, when the line has not been crossed yet (the bot reads
 * the declared lines; it cannot know which are real; a line already crossed costs nothing more).
 */
function lineRegions(c: RedlinesContent, s: GameState, kinds: readonly string[]): Set<RegionId> {
  const out = new Set<RegionId>();
  for (const line of s.fed.lines) {
    if (s.crossed[line.id] !== undefined) continue;
    const def = c.lines.find((l) => l.id === line.id);
    if (def && kinds.includes(def.kind)) def.regions.forEach((r) => out.add(r));
  }
  return out;
}

export const passiveBot: Bot = {
  name: 'passive',
  act: (_c, s) => s,
  answer: () => 'down',
};

export const promiseEverythingBot: Bot = {
  name: 'promise-everything',
  act: (_c, s0, rng) => {
    let s = s0;
    const wanted = unique([...threatened(s), ...rng.shuffle(REGION_IDS.filter((r) => !isCap(r) && s.regions[r].state !== 'fighting'))]);
    for (const r of wanted) {
      if (s.promises.length >= RULES.maxPromises) break;
      if (!canPromise(s, r).ok) continue;
      const res = promise(s, r);
      if (res.ok) s = res.state;
    }
    return s;
  },
  answer: (_c, s) => (canAnswer(s, 'back').ok ? 'back' : 'down'),
};

/** How much the sensible bot wants a piece to be able to reach this place. */
function worth(s: GameState, r: RegionId): number {
  let v = 0;
  if (promiseAt(s, r)) v += 3;
  if (s.fed.headings.some((h) => h.to === r)) v += 2;
  if (s.regions[r].state === 'pressed' && !isAnswered(s, r)) v += 1;
  return v;
}

/** The sensible bot's week. `keep` is a promise it must not withdraw (the far-promise opening). */
export function sensibleAct(c: RedlinesContent, s0: GameState, keep: RegionId | null = null): GameState {
  let s = s0;
  // The influence to keep in hand for a test: 12, or 6 once they believe you (BACK IT then costs 6).
  const reserve = s.fed.belief >= RULES.believedAt ? RULES.backCostBelieved : RULES.backCost;
  const avoid = lineRegions(c, s, ['proximity', 'sea', 'missiles']);
  const avoidPromise = lineRegions(c, s, ['alliance']);
  // One accepted way out would sign the treaty: save for it (no moves, no new promises this week) once week 3 is here.
  const saving = s.week >= 3 && s.fed.will + RULES.willWayOut >= RULES.willSign && s.influence < RULES.wayOutPrice.summit + reserve;

  // 0. Promises nothing of yours could reach even after a move this week go first (they only invite a test).
  for (const p of [...s.promises]) {
    if (p.region === keep || p.region === s.pendingTest) continue;
    const near = s.pieces.some((piece) => distance(piece.at, p.region) <= 2);
    if (!near) {
      const res = withdraw(s, p.region);
      if (res.ok) s = res.state;
    }
  }

  // 1. Pieces: each may move once; take the destination from which the piece is nearest the most
  //    worth, with distance decaying the worth (it walks toward trouble, and towards the three doors
  //    their pushes come through). Not onto a declared line (two of the three are real) unless a
  //    cluster is at stake, and not onto their doorstep.
  const concerns = unique([...threatened(s), ...s.promises.map((p) => p.region), ...NEAR_CAP]);
  for (const kind of ['fleet', 'brigade'] as PieceKind[]) {
    const piece = pieceOf(s, kind);
    if (!piece || saving || s.influence - RULES.moveCost < reserve) continue;
    const score = (at: RegionId) => {
      const reach = reachOf({ kind, at });
      let v = 0;
      for (const r of concerns) {
        const w = Math.max(0.5, worth(s, r));
        v += reach.includes(r) ? w : w * Math.pow(0.55, Math.max(1, distance(at, r) - 1));
      }
      if (NEAR_CAP.includes(at)) v -= 2;
      if (avoid.has(at)) v -= 3;
      return v;
    };
    const here = score(piece.at);
    let best: { to: RegionId; v: number } | null = null;
    for (const to of movesFor(s, kind)) {
      const v = score(to);
      if (v > here + 0.25 && (!best || v > best.v)) best = { to, v };
    }
    if (best) {
      const res = movePiece(s, kind, best.to);
      if (res.ok) s = res.state;
    }
  }

  // 2. Promises: holdable threatened places, their arrows first; not on a declared alliance line unless nothing else.
  const want = threatened(s)
    .filter((r) => !promiseAt(s, r) && canPromise(s, r).ok && holdInfo(s, r).ok)
    .sort((a, b) => worth(s, b) - worth(s, a) || (avoidPromise.has(a) ? 1 : 0) - (avoidPromise.has(b) ? 1 : 0));
  for (const r of want) {
    if (s.promises.length >= RULES.maxPromises) break;
    if (saving || s.influence - RULES.promiseCost < reserve / 2) break;
    // A promise on a declared alliance line crosses it (likely a step up): only for a place their arrow points at.
    if (avoidPromise.has(r) && !s.fed.headings.some((h) => h.to === r)) continue;
    const res = promise(s, r);
    if (res.ok) s = res.state;
  }

  // 3. Withdraw promises nothing can reach (they invite a test that cannot be won), except the one under test.
  for (const p of [...s.promises]) {
    if (p.region === keep || p.region === s.pendingTest) continue;
    if (!holdInfo(s, p.region).ok) {
      const res = withdraw(s, p.region);
      if (res.ok) s = res.state;
    }
  }

  // 4. A way out: from week 3, whenever one can be afforded with a test's cost in hand and they took
  //    nothing last week (an offer while they are gaining is refused), or at MASSING and above every week;
  //    the term that fits (a piece on their doorstep: pull it back; a promise they mind: drop it; else a summit).
  //    A refusal costs nothing but the price (SPEC-SMALL ruling), so the bot offers freely once they are stopped.
  const last = s.log[s.log.length - 1];
  const prev = s.log[s.log.length - 2];
  const quietLastWeek = !!last && last.danger.war <= (prev ? prev.danger.war : 0);
  if (!s.offer && s.week >= 3 && s.fed.will < 100 && (quietLastWeek || s.fed.step >= 3)) {
    const near = s.pieces.find((p) => NEAR_CAP.includes(p.at) || avoid.has(p.at));
    // A promise they mind: within their reach, under test or in their arrows (SPEC-SMALL: a far promise cannot be
    // sold); at least a week old (a promise drawn and offered up the same week is seen through: ENGINE.md ruling 11).
    const minded = s.promises.find((p) => p.since < s.week && promiseMinded(s, p.region, c.lines));
    const tries: Array<[WayOutTerm, RegionId | PieceKind | undefined]> = [];
    if (minded) tries.push(['drop-promise', minded.region]);
    if (near) tries.push(['pull-back', near.kind]);
    tries.push(['summit', undefined]);
    for (const [term, detail] of tries) {
      // A way out that would sign is worth the whole purse; otherwise keep a believed test's price in hand.
      const wouldSign = s.fed.will + RULES.willWayOut >= RULES.willSign;
      if (s.influence - RULES.wayOutPrice[term] < (wouldSign ? 0 : RULES.backCostBelieved)) continue;
      const res = offerWayOut(s, term, detail);
      if (res.ok) {
        s = res.state;
        break;
      }
    }
  }
  return s;
}

export function sensibleAnswer(_c: RedlinesContent, s: GameState): Key {
  const p = s.phone!;
  const region = p.region;
  switch (p.kind) {
    case 'test':
    case 'test-inherited':
    case 'feint': {
      if (region && holdInfo(s, region).ok && canAnswer(s, 'back').ok) return 'back';
      return p.round === 1 ? 'wait' : 'down';
    }
    case 'summit':
      return canAnswer(s, 'back').ok ? 'back' : 'wait';
    case 'false-alarm':
      return 'down';
    case 'trawler':
      return canAnswer(s, 'wait').ok ? 'wait' : 'down';
    case 'bluff-crossed':
      return 'back';
    case 'fall-unpromised':
      return canAnswer(s, 'back').ok && s.influence - answerCost(s, 'back') >= RULES.backCostBelieved ? 'back' : 'down';
  }
}

export const sensibleBot: Bot = {
  name: 'sensible',
  act: (c, s) => sensibleAct(c, s),
  answer: sensibleAnswer,
};

/** A place far from both pieces (not holdable), nearest their arrows: the "one cheap far promise". */
export function farPromiseTarget(s: GameState): RegionId | null {
  const far = REGION_IDS.filter((r) => !isCap(r) && s.regions[r].state !== 'fighting' && !promiseAt(s, r) && !holdInfo(s, r).ok);
  if (!far.length) return null;
  const targets = s.fed.headings.map((h) => h.to);
  const onArrow = far.filter((r) => targets.includes(r));
  if (onArrow.length) return onArrow[0];
  const nearest = (r: RegionId) => Math.min(...targets.map((t) => distance(t, r)), 9);
  return [...far].sort((a, b) => nearest(a) - nearest(b))[0];
}

/**
 * The solved-opening check: the sensible bot, except that in week 1 it draws one promise it cannot
 * hold, keeps it, and backs it the first time it is tested (at the far price, with the far risk).
 */
export const farPromiseBot: Bot = {
  name: 'far-promise',
  act: (c, s0) => {
    let s = s0;
    if (s.week === 1) {
      const far = farPromiseTarget(s);
      if (far) {
        const res = promise(s, far);
        if (res.ok) s = res.state;
      }
    }
    const kept = s.promises.find((p) => !p.inherited && p.since === 1 && !holdInfo(s, p.region).ok)?.region ?? null;
    return sensibleAct(c, s, kept);
  },
  answer: (c, s) => {
    const p = s.phone!;
    const isTest = p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint';
    const mine = p.region ? promiseAt(s, p.region) : undefined;
    if (isTest && mine && !mine.inherited && mine.since === 1 && !holdInfo(s, p.region!).ok && p.round === 1 && !s.lastBacked) {
      if (canAnswer(s, 'back').ok) return 'back';
    }
    return sensibleAnswer(c, s);
  },
};

/** The answer to an event call that is not a test: take their summit when it can be paid for, stand down, lean, hold. */
export function eventAnswer(s: GameState): Key {
  const p = s.phone!;
  switch (p.kind) {
    case 'summit':
      return canAnswer(s, 'back').ok ? 'back' : 'wait';
    case 'false-alarm':
      return 'down';
    case 'trawler':
      return canAnswer(s, 'wait').ok ? 'wait' : 'down';
    case 'bluff-crossed':
      return 'back';
    default:
      return 'down';
  }
}
const isTestKind = (k: string) => k === 'test' || k === 'test-inherited' || k === 'feint';

/**
 * Sitting still: every promise withdrawn in week 1, no orders ever, BACK DOWN on any test, their summit taken
 * when it comes (the strongest do-nothing line the second review found). SPEC-SMALL gates it at half of sensible.
 */
export const noOrdersBot: Bot = {
  name: 'no-orders',
  act: (_c, s0) => {
    let s = s0;
    for (const p of [...s.promises]) {
      if (p.region === s.pendingTest) continue;
      const r = withdraw(s, p.region);
      if (r.ok) s = r.state;
    }
    return s;
  },
  answer: (_c, s) => (isTestKind(s.phone!.kind) ? 'down' : eventAnswer(s)),
};

/** Steps from their nearest foothold (the Cap, or a place pressed or fighting). */
function distFromFront(s: GameState, r: RegionId): number {
  const holds = [...CAP_REGIONS, ...REGION_IDS.filter((x) => !isCap(x) && s.regions[x].state !== 'calm')];
  return Math.min(...holds.map((f) => distance(f, r)));
}

/** A far, safe place to promise and offer up: out of their reach, dashed, not on a declared alliance line. */
export function sellableTarget(c: RedlinesContent, s: GameState): RegionId | null {
  const avoid = lineRegions(c, s, ['alliance']);
  const pool = REGION_IDS.filter(
    (r) => !isCap(r) && !isHome(r) && s.regions[r].state === 'calm' && !promiseAt(s, r) && !holdInfo(s, r).ok && !avoid.has(r) && distFromFront(s, r) >= 2 && canPromise(s, r).ok,
  );
  if (!pool.length) return null;
  pool.sort((a, b) => distFromFront(s, b) - distFromFront(s, a));
  return pool[0];
}

/**
 * The seller: one far dashed promise at a time (a place nothing of yours can reach and their forces cannot
 * either), offered up as a dropped promise the week after it was drawn, then drawn again; tests it can hold
 * are backed, the rest waited once and let go. SPEC-SMALL: a far promise cannot be sold, so this line must
 * sit well under the sensible bot.
 */
export const sellerBot: Bot = {
  name: 'seller',
  act: (c, s0) => {
    let s = s0;
    const avoid = lineRegions(c, s, ['alliance']);
    for (const p of [...s.promises]) {
      if (p.region === s.pendingTest) continue;
      if (!holdInfo(s, p.region).ok && distFromFront(s, p.region) < 2) {
        const r = withdraw(s, p.region);
        if (r.ok) s = r.state;
      }
    }
    const toSell = s.promises.find((p) => p.since < s.week && !holdInfo(s, p.region).ok && !avoid.has(p.region) && p.region !== s.pendingTest);
    if (toSell && s.week >= 3 && s.influence >= RULES.wayOutPrice['drop-promise']) {
      const r = offerWayOut(s, 'drop-promise', toSell.region);
      if (r.ok) s = r.state;
    }
    if (!s.promises.some((p) => !holdInfo(s, p.region).ok && !avoid.has(p.region)) && s.influence >= RULES.promiseCost + RULES.wayOutPrice['drop-promise']) {
      const far = sellableTarget(c, s);
      if (far) {
        const r = promise(s, far);
        if (r.ok) s = r.state;
      }
    }
    return s;
  },
  answer: (_c, s) => {
    const p = s.phone!;
    if (isTestKind(p.kind)) {
      if (p.region && holdInfo(s, p.region).ok && canAnswer(s, 'back').ok) return 'back';
      return p.round === 1 ? 'wait' : 'down';
    }
    return eventAnswer(s);
  },
};

export const BOTS: Record<BotName, Bot> = {
  passive: passiveBot,
  'promise-everything': promiseEverythingBot,
  'far-promise': farPromiseBot,
  sensible: sensibleBot,
  'no-orders': noOrdersBot,
  seller: sellerBot,
};
