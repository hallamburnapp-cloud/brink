/**
 * The bots of BUILD.md "The simulator" and SPEC-SMALL's rulings: passive (never promises, never backs),
 * promise-everything (three promises wherever, backs every test), far-promise opening (the review's opening:
 * one promise two or more moves from both pieces, never walked to, its far price kept in hand and backed from
 * afar whenever tested), sensible (promises holdable places near their headings, moves its pieces to hold
 * them, backs tests it can hold, offers a way out whenever they have been stopped), no-orders (withdraws
 * everything in week 1 and sits still, taking their summit when it comes: the "sitting still" line the spec
 * gates at half of sensible), seller (one far dashed promise at a time, offered up as a dropped promise the
 * next week: the sold far promise the second review found) and careful (the hand the recheck's critic played:
 * withdraw the far inherited rings, walk a piece to the front, promise only what a piece holds, back every
 * solid test, take their summit; reported beside the gates, never gated), and SPEC-SMALL "No formula wins"'s three:
 * the shark (the second review's visible-information line), summit-only and shark-still (its one-rule cousins), all
 * gated. Each bot draws its own randomness
 * from an Rng the simulator gives it, so a game is reproducible from (seed, bot).
 */
import type { Rng } from '../../engine/rng.ts';
import { promiseMinded } from '../engine/agent.ts';
import { holdInfo, isAnswered, pieceOf, pressedRegions, promiseAt, weeksLeft } from '../engine/board.ts';
import type { RedlinesContent } from '../engine/content.ts';
import { answerCost } from '../engine/phone.ts';
import { RULES } from '../engine/rules.ts';
import { canAnswer, canOfferWayOut, canPromise, movePiece, movesFor, offerWayOut, promise, withdraw } from '../engine/run.ts';
import type { GameState, PieceKind, RegionId, WayOutTerm } from '../engine/types.ts';
import { CAP_REGIONS, NEAR_CAP, REGION_IDS, distance, isCap, isHome, pieceDistance, reachOf } from '../engine/world.ts';

export type BotName = 'passive' | 'promise-everything' | 'far-promise' | 'sensible' | 'no-orders' | 'seller' | 'careful' | 'shark' | 'summit-only' | 'shark-still';
export const BOT_NAMES: readonly BotName[] = ['passive', 'promise-everything', 'far-promise', 'sensible', 'no-orders', 'seller', 'careful', 'shark', 'summit-only', 'shark-still'];
/**
 * The bots the gates judge (the careful hand is reported beside them, not gated: SPEC-SMALL "Hand play is reported").
 * SPEC-SMALL "No formula wins" adds the strongest visible-information player the second review found (the shark) and
 * its one-rule cousins (summits only; never move a piece).
 */
export const GATED_BOTS: readonly BotName[] = ['passive', 'promise-everything', 'far-promise', 'sensible', 'no-orders', 'seller', 'shark', 'summit-only', 'shark-still'];
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

/**
 * The sensible bot's week. `keep` is the far-promise opening's promise: never withdrawn, never offered up, never
 * walked to (no move brings a piece nearer it), and its far price (24) kept in hand while it stands.
 */
export function sensibleAct(c: RedlinesContent, s0: GameState, keep: RegionId | null = null): GameState {
  let s = s0;
  // The influence to keep in hand for a test: 12, or 6 once they believe you (BACK IT then costs 6); the far price while a far promise is kept.
  const reserve = keep && promiseAt(s, keep) ? RULES.backFarCost : s.fed.belief >= RULES.believedAt ? RULES.backCostBelieved : RULES.backCost;
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
  const concerns = unique([...threatened(s), ...s.promises.map((p) => p.region), ...NEAR_CAP]).filter((r) => r !== keep);
  for (const kind of ['fleet', 'brigade'] as PieceKind[]) {
    const piece = pieceOf(s, kind);
    if (!piece || saving || s.influence - RULES.moveCost < reserve) continue;
    // The far-promise opening never walks a piece towards its far promise.
    const towardsKeep = (to: RegionId) => !!keep && pieceDistance(kind, to, keep) < pieceDistance(kind, piece.at, keep);
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
      if (towardsKeep(to)) continue;
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
    const minded = s.promises.find((p) => p.region !== keep && p.since < s.week && promiseMinded(s, p.region, c.lines));
    const tries: Array<[WayOutTerm, RegionId | PieceKind | undefined]> = [];
    if (minded) tries.push(['drop-promise', minded.region]);
    if (near) tries.push(['pull-back', near.kind]);
    tries.push(['summit', undefined]);
    for (const [term, detail] of tries) {
      // A way out that would sign is worth the whole purse; otherwise keep a believed test's price in hand.
      const wouldSign = s.fed.will + RULES.willWayOut >= RULES.willSign;
      // The far-promise opening keeps its far price in hand whatever it offers.
      const floor = keep && promiseAt(s, keep) ? RULES.backFarCost : wouldSign ? 0 : RULES.backCostBelieved;
      if (s.influence - RULES.wayOutPrice[term] < floor) continue;
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

/**
 * The review's "one cheap far promise": a place two or more moves from both pieces (no single move makes it
 * solid), not in the Cap, not fighting, nearest their arrows (on one when it can be).
 */
export function farPromiseTarget(s: GameState): RegionId | null {
  const far = REGION_IDS.filter((r) => !isCap(r) && s.regions[r].state !== 'fighting' && !promiseAt(s, r) && s.pieces.every((p) => pieceDistance(p.kind, p.at, r) >= 2) && canPromise(s, r).ok);
  if (!far.length) return null;
  const targets = s.fed.headings.map((h) => h.to);
  const onArrow = far.filter((r) => targets.includes(r));
  if (onArrow.length) return onArrow[0];
  const nearest = (r: RegionId) => Math.min(...targets.map((t) => distance(t, r)), 9);
  return [...far].sort((a, b) => nearest(a) - nearest(b))[0];
}

/** The far-promise opening's own promise while it stands: drawn by the bot in week 1, not inherited. */
function farKept(s: GameState): RegionId | null {
  return s.promises.find((p) => !p.inherited && p.since === 1 && s.pieces.every((piece) => pieceDistance(piece.kind, piece.at, p.region) >= 2))?.region ?? null;
}

/**
 * The solved-opening check, as the review played it: in week 1 one promise two or more moves from both pieces;
 * the pieces never walk towards it; the far price (24) kept in hand; backed from afar whenever it is tested,
 * every round. Everything else is the sensible bot. SPEC-SMALL gates it at half the sensible bot's treaties.
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
    return sensibleAct(c, s, farKept(s));
  },
  answer: (c, s) => {
    const p = s.phone!;
    const isTest = p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint';
    if (isTest && p.region && p.region === farKept(s) && canAnswer(s, 'back').ok) return 'back';
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

/** Where the war is: their arrows and every pressed place (not fighting). */
function front(s: GameState): RegionId[] {
  return unique([...s.fed.headings.map((h) => h.to), ...pressedRegions(s)]).filter((r) => s.regions[r].state !== 'fighting' && !isCap(r));
}

/**
 * The careful hand (SPEC-SMALL "Hand play is reported, not gated"): the way the recheck's critic played six games.
 * Week 1: withdraw the inherited rings nothing of yours can reach. Every week: walk one piece a move towards the
 * front (their arrows and the pressed places), never onto a line they declared for it; promise only what a piece
 * holds, the front first, keeping BACK IT's price in hand; withdraw a ring a piece no longer holds. Back every
 * solid test it can pay for (else back down), take their summit, offer no way out of its own.
 */
export const carefulBot: Bot = {
  name: 'careful',
  act: (c, s0) => {
    let s = s0;
    const reserve = s.fed.belief >= RULES.believedAt ? RULES.backCostBelieved : RULES.backCost;
    // 1. The far inherited rings go.
    for (const p of [...s.promises]) {
      if (!p.inherited || p.region === s.pendingTest || holdInfo(s, p.region).ok) continue;
      const r = withdraw(s, p.region);
      if (r.ok) s = r.state;
    }
    // 2. One piece walks a move towards the front, unless a piece already holds every front place it can.
    const places = front(s);
    const holdDist = (kind: PieceKind, at: RegionId) => Math.min(...places.map((f) => Math.max(0, pieceDistance(kind, at, f) - 1)), Infinity);
    const steps: Array<{ kind: PieceKind; to: RegionId; gain: number; d: number }> = [];
    for (const kind of ['fleet', 'brigade'] as PieceKind[]) {
      const piece = pieceOf(s, kind);
      if (!piece || !places.length) continue;
      const here = holdDist(kind, piece.at);
      if (here === 0 || !Number.isFinite(here)) continue;
      const avoid = lineRegions(c, s, kind === 'fleet' ? ['proximity', 'sea'] : ['proximity', 'missiles']);
      for (const to of movesFor(s, kind)) {
        if (avoid.has(to) || NEAR_CAP.includes(to)) continue;
        const d = holdDist(kind, to);
        if (d < here) steps.push({ kind, to, gain: here - d, d });
      }
    }
    steps.sort((a, b) => a.d - b.d || b.gain - a.gain);
    if (steps.length && s.influence - RULES.moveCost >= reserve) {
      const r = movePiece(s, steps[0].kind, steps[0].to);
      if (r.ok) s = r.state;
    }
    // 3. Promise only what a piece holds, the arrows first; never on a declared alliance line.
    const avoidPromise = lineRegions(c, s, ['alliance']);
    const arrows = s.fed.headings.map((h) => h.to);
    const want = front(s)
      .filter((r) => !promiseAt(s, r) && holdInfo(s, r).ok && !avoidPromise.has(r) && canPromise(s, r).ok)
      .sort((a, b) => (arrows.includes(b) ? 1 : 0) - (arrows.includes(a) ? 1 : 0));
    for (const r of want) {
      if (s.promises.length >= RULES.maxPromises || s.influence - RULES.promiseCost < reserve) break;
      const res = promise(s, r);
      if (res.ok) s = res.state;
    }
    // 4. A ring no piece holds any more is withdrawn (not the one under test: that is answered on the phone).
    for (const p of [...s.promises]) {
      if (p.region === s.pendingTest || holdInfo(s, p.region).ok) continue;
      const r = withdraw(s, p.region);
      if (r.ok) s = r.state;
    }
    return s;
  },
  answer: (_c, s) => {
    const p = s.phone!;
    if (isTestKind(p.kind)) return p.region && holdInfo(s, p.region).ok && canAnswer(s, 'back').ok ? 'back' : 'down';
    if (p.kind === 'fall-unpromised') return 'down';
    return eventAnswer(s);
  },
};

/** Quiet last week: the WAR boxes did not rise (visible on the index card). */
function quietLastWeek(s: GameState): boolean {
  const last = s.log[s.log.length - 1];
  const prev = s.log[s.log.length - 2];
  return !!last && last.danger.war <= (prev ? prev.danger.war : 0);
}

/**
 * The shark (SPEC-SMALL "No formula wins"; the second review's deep-strategy critic's bot, from what a player can see):
 * drop the dashed rings a move cannot make solid; walk the pieces so every hatched, unanswered place is in reach, the
 * shortest clock first (stepping into a hatched place answers it), never onto a declared line for that piece, never
 * stranding a solid ring; ring the hatched places a piece holds, never an arrow's target (a ring there turns a push
 * into a call); drop rings on calm places nobody heads for; from week 3 offer a summit after every quiet week. On the
 * phone: back a solid test it can pay for, wait on a dashed one, take their summit, send what it has to a place nobody
 * promised only with influence to spare. `move: false` is the one-rule cousin that never moves a piece.
 */
export function sharkBot(name: BotName, opts: { move?: boolean } = {}): Bot {
  const move = opts.move ?? true;
  return {
    name,
    act(c, s0) {
      let s = s0;
      const avoidPiece = (kind: PieceKind) => lineRegions(c, s, kind === 'fleet' ? ['proximity', 'sea'] : ['proximity', 'missiles']);
      const avoidPromise = lineRegions(c, s, ['alliance']);
      // 1. Dashed rings go, unless a single move can make them solid.
      for (const p of [...s.promises]) {
        if (p.region === s.pendingTest || holdInfo(s, p.region).ok) continue;
        const canFix = move && (['fleet', 'brigade'] as PieceKind[]).some((k) => movesFor(s, k).some((to) => reachOf({ kind: k, at: to }).includes(p.region) && !avoidPiece(k).has(to)));
        if (canFix) continue;
        const r = withdraw(s, p.region);
        if (r.ok) s = r.state;
      }
      // 2. Pieces: cover the hatched, unanswered places by urgency, then the arrows, then the rings.
      const open = pressedRegions(s).filter((r) => !isAnswered(s, r));
      const urgency = (r: RegionId) => {
        const w = weeksLeft(s, r);
        return w === null ? 0 : 4 - w;
      };
      const arrows = s.fed.headings.map((h) => h.to).filter((r) => s.regions[r].state !== 'fighting');
      const concerns: Array<{ r: RegionId; w: number }> = [
        ...open.map((r) => ({ r, w: 3 + 2 * urgency(r) })),
        ...arrows.filter((r) => !open.includes(r)).map((r) => ({ r, w: 2 })),
        ...s.promises.map((p) => ({ r: p.region, w: 2 })),
      ];
      for (const kind of ['fleet', 'brigade'] as PieceKind[]) {
        if (!move || s.influence - RULES.moveCost < RULES.backCostBelieved) break;
        const piece = pieceOf(s, kind)!;
        const avoid = avoidPiece(kind);
        const score = (at: RegionId) => {
          const reach = reachOf({ kind, at });
          let v = 0;
          for (const { r, w } of concerns) {
            if (at === r && s.regions[r].state === 'pressed') v += w * 1.3;
            else if (reach.includes(r)) v += w;
            else v += w * Math.pow(0.5, Math.max(1, pieceDistance(kind, at, r) - 1));
          }
          if (avoid.has(at)) v -= 4;
          if (NEAR_CAP.includes(at)) v -= 1.5;
          return v;
        };
        const here = score(piece.at);
        let best: { to: RegionId; v: number } | null = null;
        for (const to of movesFor(s, kind)) {
          const would: GameState = { ...s, pieces: s.pieces.map((p) => (p.kind === kind ? { ...p, at: to } : p)) };
          if (s.promises.some((p) => holdInfo(s, p.region).ok && !holdInfo(would, p.region).ok)) continue;
          const v = score(to);
          if (v > here + 0.5 && (!best || v > best.v)) best = { to, v };
        }
        if (best) {
          const r = movePiece(s, kind, best.to);
          if (r.ok) s = r.state;
        }
      }
      // 3. Ring the hatched, unanswered places a piece holds (never an arrow's target that is not hatched).
      const want = pressedRegions(s)
        .filter((r) => !isAnswered(s, r) && !promiseAt(s, r) && holdInfo(s, r).ok && canPromise(s, r).ok && !avoidPromise.has(r))
        .sort((a, b) => urgency(b) - urgency(a));
      for (const r of want) {
        if (s.promises.length >= RULES.maxPromises) {
          const idle = s.promises.find((p) => s.regions[p.region].state === 'calm' && !arrows.includes(p.region) && p.region !== s.pendingTest);
          if (!idle) break;
          const w = withdraw(s, idle.region);
          if (w.ok) s = w.state;
          else break;
        }
        if (s.influence - RULES.promiseCost < 4) break;
        const res = promise(s, r);
        if (res.ok) s = res.state;
      }
      // 3b. Rings on calm places nobody heads for cost upkeep and draw tests: they go.
      for (const p of [...s.promises]) {
        if (p.region === s.pendingTest) continue;
        if (s.regions[p.region].state === 'calm' && !arrows.includes(p.region)) {
          const r = withdraw(s, p.region);
          if (r.ok) s = r.state;
        }
      }
      // 4. The summit, from week 3, after every quiet week.
      if (!s.offer && s.fed.will < RULES.willSign && quietLastWeek(s) && canOfferWayOut(s, 'summit').ok) {
        const wouldSign = s.fed.will + RULES.willWayOut >= RULES.willSign;
        if (s.influence - RULES.wayOutPrice.summit >= (wouldSign ? 0 : RULES.backCostBelieved)) {
          const r = offerWayOut(s, 'summit');
          if (r.ok) s = r.state;
        }
      }
      return s;
    },
    answer(_c, s) {
      const p = s.phone!;
      if (isTestKind(p.kind)) {
        const solid = !!p.region && holdInfo(s, p.region).ok;
        if (solid && canAnswer(s, 'back').ok) return 'back';
        return p.round < 3 ? 'wait' : 'down';
      }
      switch (p.kind) {
        case 'summit':
          return canAnswer(s, 'back').ok ? 'back' : 'wait';
        case 'false-alarm':
        case 'trawler':
          return 'down';
        case 'bluff-crossed':
          return 'back';
        case 'fall-unpromised':
          return canAnswer(s, 'back').ok && s.influence - answerCost(s, 'back') >= RULES.backCostBelieved ? 'back' : 'wait';
      }
      return 'down';
    },
  };
}

/**
 * One rule only (SPEC-SMALL "No formula wins": no one-rule bot signs more than 45%): every promise withdrawn, nothing
 * moved, BACK DOWN on every test, a summit offered every week it can be (from week 3), and their summit taken.
 */
export const summitOnlyBot: Bot = {
  name: 'summit-only',
  act(_c, s0) {
    let s = s0;
    for (const p of [...s.promises]) {
      if (p.region === s.pendingTest) continue;
      const r = withdraw(s, p.region);
      if (r.ok) s = r.state;
    }
    if (!s.offer && canOfferWayOut(s, 'summit').ok) {
      const r = offerWayOut(s, 'summit');
      if (r.ok) s = r.state;
    }
    return s;
  },
  answer(_c, s) {
    const p = s.phone!;
    if (isTestKind(p.kind)) return 'down';
    if (p.kind === 'summit') return canAnswer(s, 'back').ok ? 'back' : 'wait';
    if (p.kind === 'bluff-crossed') return 'back';
    return 'down';
  },
};

export const BOTS: Record<BotName, Bot> = {
  passive: passiveBot,
  'promise-everything': promiseEverythingBot,
  'far-promise': farPromiseBot,
  sensible: sensibleBot,
  'no-orders': noOrdersBot,
  seller: sellerBot,
  careful: carefulBot,
  shark: sharkBot('shark'),
  'summit-only': summitOnlyBot,
  'shark-still': sharkBot('shark-still', { move: false }),
};
