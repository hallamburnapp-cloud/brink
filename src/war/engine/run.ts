/**
 * The game state machine (SPEC sections 1, 5, 7 and 13): new games, the turn (pin, swap, send),
 * the outcome on the map, war spreading by itself, the final push and the three endings, the
 * shop, and the scripted seeds. Every action takes a state and returns a Result holding a NEW
 * state, or the same state and a short reason the UI can show when the action is refused.
 */
import { Rng } from '../../engine/rng';
import type { RegionId } from '../content/map';
import { STAFF_DEF } from '../content/staff';
import { pathBetween } from './board';
import { deal, scriptedDeal, swapLit } from './deck';
import { canAdd, legal, lift } from './groups';
import { regionsWon, target } from './ladder';
import { RULES } from './rules';
import { scorePins } from './score';
import { CROWN, CROWN_SEED, FIRST_WORLD, FIRST_WORLD_SEED } from './seeds';
import { pushPool } from './order';
import { drawOffers, openShop, shopDue } from './shop';
import type { Ending, GameState, Owner, Result, SendRecord, WonRegion } from './types';
import {
  countOwner,
  crisisPool,
  decodeOwners,
  freshOwners,
  placeWar,
  warSource,
  warSpreadTarget,
  winOrder,
  type OwnerMap,
} from './world';

const ok = (state: GameState): Result => ({ ok: true, state });
const no = (state: GameState, reason: string): Result => ({ ok: false, reason, state });

/**
 * A copy that is safe to change. Records that never change once made (lastSend, log entries,
 * best) are shared between the old and the new state.
 */
function draft(s: GameState): GameState {
  return {
    ...s,
    rng: { war: [...s.rng.war], crisis: [...s.rng.crisis], deal: [...s.rng.deal], shop: [...s.rng.shop] },
    owner: { ...s.owner },
    seats: s.seats.map((x) => ({ ...x })),
    hiredSinceSend: [...s.hiredSinceSend],
    deal: {
      ...s.deal,
      lit: [...s.deal.lit],
      pile: [...s.deal.pile],
      opening: [...s.deal.opening],
      pins: [...s.deal.pins],
    },
    shop: s.shop && { ...s.shop, offers: [...s.shop.offers] },
    log: [...s.log],
    brass: [...s.brass],
  };
}

function streams(seed: string): GameState['rng'] {
  const root = new Rng(seed);
  return {
    war: root.fork('war').snapshot(),
    crisis: root.fork('crisis').snapshot(),
    deal: root.fork('deal').snapshot(),
    shop: root.fork('shop').snapshot(),
  };
}

function blankState(seed: string, mode: GameState['mode'], owner: OwnerMap): GameState {
  return {
    version: 3,
    seed,
    mode,
    rng: streams(seed),
    phase: 'choose',
    turn: 0,
    owner,
    coins: RULES.startCoins,
    seats: [],
    oldHandM10: RULES.oldHandStartM10,
    nextUid: 1,
    hiredSinceSend: [],
    deal: {
      crisis: RULES.home,
      target: 0n,
      finalPush: false,
      lit: [],
      pile: [],
      opening: [],
      pins: [],
      swapsLeft: 0,
      swapLocked: false,
    },
    shop: null,
    shopVisits: 0,
    ending: null,
    pushMisses: 0,
    lastSend: null,
    log: [],
    best: null,
    peakWar: countOwner(owner, 'red'),
    brass: [],
  };
}

/** Start the next turn on a draft: target, crisis, deal (SPEC section 5, steps 1-2). */
function beginTurn(s: GameState): void {
  s.turn += 1;
  const T = target(s.turn);
  const drawn = crisisPool(s.owner);
  const { finalPush } = drawn;
  // The final push draws from the red regions some fresh deal can win, when there are any (A2).
  const pool = finalPush ? pushPool(s.owner, drawn.pool, s.seats.map((x) => x.id), s.oldHandM10, T).pool : drawn.pool;
  if (!pool.length) throw new Error('no region for a crisis');
  const crisisRng = new Rng(s.rng.crisis);
  const pick = crisisRng.pick(pool);
  s.rng.crisis = crisisRng.snapshot();
  const script = s.mode === 'first' ? FIRST_WORLD.turns[s.turn] : undefined;
  let crisis = pick;
  let dealt;
  if (script && pool.includes(script.crisis)) {
    crisis = script.crisis;
    dealt = scriptedDeal(s.owner, crisis, script.lit, script.pile);
  } else {
    const dealRng = new Rng(s.rng.deal);
    dealt = deal(s.owner, crisis, dealRng);
    s.rng.deal = dealRng.snapshot();
  }
  const locked = s.mode === 'first' && FIRST_WORLD.swapLockedTurns.includes(s.turn);
  s.deal = {
    crisis,
    target: T,
    finalPush,
    lit: dealt.lit,
    pile: dealt.pile,
    opening: [...dealt.lit],
    pins: [],
    swapsLeft: locked ? 0 : RULES.swaps,
    swapLocked: locked,
  };
  s.shop = null;
  s.phase = 'choose';
}

export interface NewGameOptions {
  /** The scripted first game (seed FIRST-WORLD). The seed 'FIRST-WORLD' implies it. */
  firstWorld?: boolean;
  /** 'crown': the CROWN demo (Example 3 at turn 14), streams seeded 'CROWN'. */
  demo?: 'crown';
}

/** A new game, dealt and ready: turn 1 (or the CROWN's turn 14), phase 'choose'. */
export function newGame(seed: string, opts: NewGameOptions = {}): GameState {
  if (opts.demo === 'crown') return crownGame();
  const first = opts.firstWorld === true || seed === FIRST_WORLD_SEED;
  const s = blankState(first ? FIRST_WORLD_SEED : seed, first ? 'first' : 'game', freshOwners());
  if (first) {
    for (const r of FIRST_WORLD.war) s.owner[r] = 'red';
  } else {
    const rng = new Rng(s.rng.war);
    placeWar(s.owner, rng);
    s.rng.war = rng.snapshot();
  }
  s.peakWar = countOwner(s.owner, 'red');
  beginTurn(s);
  return s;
}

/** The CROWN demo: Example 3 exactly (SPEC section 13). */
function crownGame(): GameState {
  const owner = freshOwners();
  for (const r of CROWN.gold) owner[r] = 'gold';
  for (const r of CROWN.red) owner[r] = 'red';
  const s = blankState(CROWN_SEED, 'crown', owner);
  s.seats = CROWN.seats.map((id, i) => ({ uid: i + 1, id }));
  s.nextUid = CROWN.seats.length + 1;
  s.coins = CROWN.coins;
  s.turn = CROWN.turn;
  s.deal = {
    crisis: CROWN.crisis,
    target: target(CROWN.turn),
    finalPush: false,
    lit: [...CROWN.lit],
    pile: [...CROWN.pile],
    opening: [...CROWN.lit],
    pins: [],
    swapsLeft: RULES.swaps,
    swapLocked: false,
  };
  return s;
}

// ---------------------------------------------------------------- choosing

/** Pin a lit region (or the crisis) that touches the pins (SPEC section 5, step 3). */
export function pin(s: GameState, id: RegionId): Result {
  if (s.phase !== 'choose') return no(s, 'The turn is over.');
  const d = s.deal;
  if (d.pins.includes(id)) return no(s, 'Already pinned.');
  if (id !== d.crisis && !d.lit.includes(id)) return no(s, 'That region is not lit.');
  if (d.pins.length >= RULES.maxPins) return no(s, 'Five pins at most.');
  if (!canAdd(d.pins, id, d.lit, d.crisis)) return no(s, 'Pin a region that touches your pins.');
  return ok({ ...s, deal: { ...d, pins: [...d.pins, id] } });
}

/** Lift a pin, and every pin no longer touching the group of the earliest remaining pin. */
export function unpin(s: GameState, id: RegionId): Result {
  if (s.phase !== 'choose') return no(s, 'The turn is over.');
  if (!s.deal.pins.includes(id)) return no(s, 'Not pinned.');
  return ok({ ...s, deal: { ...s.deal, pins: lift(s.deal.pins, id) } });
}

/** Tap a region: lift it if pinned, else pin it. */
export function togglePin(s: GameState, id: RegionId): Result {
  return s.deal.pins.includes(id) ? unpin(s, id) : pin(s, id);
}

export function clearPins(s: GameState): Result {
  if (s.phase !== 'choose') return no(s, 'The turn is over.');
  if (s.deal.pins.length === 0) return ok(s);
  return ok({ ...s, deal: { ...s.deal, pins: [] } });
}

/** Why SWAP cannot be used now, or null. */
export function swapProblem(s: GameState): string | null {
  if (s.phase !== 'choose') return 'The turn is over.';
  const d = s.deal;
  if (d.swapLocked) return 'Swap opens next turn.';
  if (d.swapsLeft <= 0) return 'One swap a turn.';
  if (!d.lit.some((r) => !d.pins.includes(r))) return 'Nothing to swap.';
  if (d.pile.length === 0) return 'No regions left to swap in.';
  return null;
}

/** SWAP (once a turn): unpinned lit regions go dark to the bottom of the pile; new ones light. */
export function swap(s: GameState): Result {
  const problem = swapProblem(s);
  if (problem) return no(s, problem);
  const d = s.deal;
  const dealt = swapLit(d.lit, d.pile, d.pins);
  return ok({ ...s, deal: { ...d, lit: dealt.lit, pile: dealt.pile, swapsLeft: d.swapsLeft - 1 } });
}

/** Why SEND cannot be pressed now, or null. */
export function sendProblem(s: GameState): string | null {
  if (s.phase !== 'choose') return 'The turn is over.';
  const d = s.deal;
  if (d.pins.length === 0) return 'Pin a region first.';
  if (!legal(d.pins, d.lit, d.crisis)) return 'Pins must touch.';
  return null;
}

// ---------------------------------------------------------------- sending

/**
 * SEND: score the pins and resolve the turn (SPEC section 5, steps 5-10): the outcome on the map,
 * war's own spread after turns 3, 6, 9 ..., the Old Hand, the end check, then the shop (after
 * turns 2, 4, 6 ...) or phase 'outcome'. state.lastSend holds everything the cascade needs.
 */
export function send(s: GameState): Result {
  const problem = sendProblem(s);
  if (problem) return no(s, problem);
  const d = draft(s);
  const { crisis, target: T, finalPush } = d.deal;
  const res = scorePins(d.deal.pins, d.seats.map((x) => x.id), d.owner, crisis, d.oldHandM10, { trace: true });
  const k = regionsWon(res.score, T);
  const coinsBefore = d.coins;
  const goldBefore = countOwner(d.owner, 'gold');
  const redBefore = countOwner(d.owner, 'red');

  let ending: Ending | null = null;
  let won: WonRegion[] = [];
  let lost: SendRecord['lost'] = null;
  if (k > 0) {
    won = winOrder(crisis, d.owner, k, d.deal.pins).map((id, i) => ({
      id,
      order: i + 1,
      wasRed: d.owner[id] === 'red',
      path: pathBetween(crisis, id),
    }));
    for (const w of won) d.owner[w.id] = 'gold';
    d.coins += RULES.coinPerRegion * won.length;
    if (!d.brass.includes(crisis)) d.brass.push(crisis);
  } else if (finalPush) {
    // The push forgives: a miss changes no region (no grey is left for war, and gold is gold for
    // good); the last of its misses ends the game as a CEASEFIRE.
    d.pushMisses += 1;
    if (d.pushMisses >= RULES.pushMisses) ending = 'CEASEFIRE';
  } else {
    lost = { id: crisis, from: warSource(d.owner, crisis) };
    d.owner[crisis] = 'red';
  }

  let spread: SendRecord['spread'] = null;
  if (!ending && d.turn % RULES.warEvery === 0 && countOwner(d.owner, 'red') < RULES.loseAt) {
    const r = warSpreadTarget(d.owner);
    if (r) {
      spread = { id: r, from: warSource(d.owner, r) };
      d.owner[r] = 'red';
    }
  }

  if (d.seats.some((x) => x.id === 'OLDHAND')) d.oldHandM10 += RULES.oldHandStepM10;

  const gold = countOwner(d.owner, 'gold');
  const red = countOwner(d.owner, 'red');
  if (!ending) {
    if (red >= RULES.loseAt) ending = 'WAR';
    else if (gold === RULES.regions) ending = 'WORLD UNITED';
  }

  const record: SendRecord = {
    turn: d.turn,
    crisis,
    target: T,
    finalPush,
    pins: res.trace!.flatMap((e) => (e.kind === 'pin' ? [e.region] : [])),
    onCrisis: d.deal.pins.includes(crisis),
    points: res.points,
    m10: res.m10,
    score: res.score,
    regions: won.length,
    result: k > 0 ? 'win' : 'miss',
    won,
    lost,
    spread,
    coinsBefore,
    coinsAfter: d.coins,
    goldBefore,
    redBefore,
    gold,
    red,
    grey: RULES.regions - gold - red,
    newHires: d.hiredSinceSend,
    ending,
    pushMisses: d.pushMisses,
    trace: res.trace!,
  };
  d.lastSend = record;
  d.hiredSinceSend = [];
  d.log.push({
    turn: d.turn,
    target: T,
    score: res.score,
    regions: won.length,
    result: record.result,
    spread: spread?.id ?? null,
    gold,
    red,
  });
  // The best send is the biggest win; a miss counts only while nothing has won (a late miss can
  // outscore every win and still be no best send).
  const won1 = res.score >= T;
  const bestWon = !!d.best && d.best.score >= d.best.target;
  if (!d.best || (won1 && !bestWon) || (won1 === bestWon && res.score > d.best.score)) {
    d.best = { score: res.score, target: T, turn: d.turn, regions: won.length };
  }
  d.peakWar = Math.max(d.peakWar, red);

  if (ending) {
    d.ending = ending;
    d.phase = 'over';
  } else if (shopDue(d.turn)) {
    openShop(d);
  } else {
    d.phase = 'outcome';
  }
  return ok(d);
}

/** NEXT TURN: close the shop (if open) and deal turn t + 1. */
export function nextTurn(s: GameState): Result {
  if (s.phase === 'over') return no(s, 'The game is over.');
  if (s.phase === 'choose') return no(s, 'Send first.');
  const d = draft(s);
  beginTurn(d);
  return ok(d);
}

// ---------------------------------------------------------------- the shop

function shopProblem(s: GameState): string | null {
  return s.phase === 'shop' && s.shop ? null : 'The shop is closed.';
}

/** Why offer `slot` cannot be hired (into a free seat, or in place of `replaceSeat`), or null. */
export function buyProblem(s: GameState, slot: number, replaceSeat?: number): string | null {
  const closed = shopProblem(s);
  if (closed) return closed;
  const id = s.shop!.offers[slot];
  if (id === undefined) return 'No such offer.';
  if (id === null) return 'Already hired.';
  if (s.seats.some((x) => x.id === id)) return 'Already seated.';
  const cost = STAFF_DEF[id].price;
  if (replaceSeat === undefined) {
    if (s.seats.length >= RULES.seats) return 'No free seat. Tap a seat to replace.';
    return s.coins >= cost ? null : 'Not enough coins.';
  }
  const old = s.seats[replaceSeat];
  if (!old) return 'No one in that seat.';
  return s.coins + STAFF_DEF[old.id].sell >= cost ? null : 'Not enough coins.';
}

/**
 * Hire offer `slot` into the leftmost free seat, or in place of seat `replaceSeat` (that staff
 * sells for half its price, rounded down, first).
 */
export function buy(s: GameState, slot: number, replaceSeat?: number): Result {
  const problem = buyProblem(s, slot, replaceSeat);
  if (problem) return no(s, problem);
  const d = draft(s);
  const id = d.shop!.offers[slot]!;
  const seat = { uid: d.nextUid++, id };
  if (replaceSeat === undefined) {
    d.seats.push(seat);
  } else {
    const old = d.seats[replaceSeat];
    d.coins += STAFF_DEF[old.id].sell;
    d.seats[replaceSeat] = seat;
    d.hiredSinceSend = d.hiredSinceSend.filter((u) => u !== old.uid);
    if (old.id === 'OLDHAND') d.oldHandM10 = RULES.oldHandStartM10;
  }
  d.coins -= STAFF_DEF[id].price;
  d.shop!.offers[slot] = null;
  if (id === 'OLDHAND') d.oldHandM10 = RULES.oldHandStartM10;
  d.hiredSinceSend.push(seat.uid);
  return ok(d);
}

/** Sell the staff in `seat` for half its price, rounded down (in the shop). */
export function sell(s: GameState, seat: number): Result {
  const closed = shopProblem(s);
  if (closed) return no(s, 'Sell in the shop.');
  const old = s.seats[seat];
  if (!old) return no(s, 'No one in that seat.');
  const d = draft(s);
  d.seats.splice(seat, 1);
  d.coins += STAFF_DEF[old.id].sell;
  d.hiredSinceSend = d.hiredSinceSend.filter((u) => u !== old.uid);
  if (old.id === 'OLDHAND') d.oldHandM10 = RULES.oldHandStartM10;
  return ok(d);
}

/** Draw 3 new offers: ◆2, then ◆3, ◆4 ... within the same visit. */
export function reroll(s: GameState): Result {
  const closed = shopProblem(s);
  if (closed) return no(s, closed);
  if (s.coins < s.shop!.rerollCost) return no(s, 'Not enough coins.');
  const d = draft(s);
  d.coins -= d.shop!.rerollCost;
  d.shop!.rerollCost += 1;
  d.shop!.offers = drawOffers(d);
  return ok(d);
}

/** Drag the staff in seat `from` to seat `to`; the others slide aside. */
export function moveSeat(s: GameState, from: number, to: number): Result {
  if (s.phase === 'over') return no(s, 'The game is over.');
  if (!s.seats[from]) return no(s, 'No one in that seat.');
  const dest = Math.max(0, Math.min(s.seats.length - 1, to));
  if (dest === from) return ok(s);
  const d = draft(s);
  const [moved] = d.seats.splice(from, 1);
  d.seats.splice(dest, 0, moved);
  return ok(d);
}

// ---------------------------------------------------------------- dev and tests

/**
 * Set who owns regions (the dev hook's setOwner): a 30-character fixture string ('.', 'G', 'R' in
 * IDS order) or a partial map. The current turn is dealt again on the new map; a map that is all
 * gold, or with war at 10, ends the game at once.
 */
export function setOwners(s: GameState, owners: string | Partial<Record<RegionId, Owner>>): Result {
  const next = typeof owners === 'string' ? decodeOwners(owners) : { ...s.owner, ...owners };
  if (!next) return no(s, 'Unreadable map.');
  const d = draft(s);
  d.owner = next as OwnerMap;
  const gold = countOwner(d.owner, 'gold');
  const red = countOwner(d.owner, 'red');
  d.peakWar = Math.max(d.peakWar, red);
  if (gold === 0) return no(s, 'Keep at least one gold region.');
  if (red >= RULES.loseAt || gold === RULES.regions) {
    d.ending = red >= RULES.loseAt ? 'WAR' : 'WORLD UNITED';
    d.phase = 'over';
    d.shop = null;
    return ok(d);
  }
  d.ending = null;
  d.turn -= 1;
  beginTurn(d);
  // The push's misses count only in a push: a map with grey left starts it afresh.
  if (!d.deal.finalPush) d.pushMisses = 0;
  return ok(d);
}
