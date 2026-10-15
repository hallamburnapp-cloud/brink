/**
 * The shop (SPEC section 7): opens after turns 2, 4, 6 ... with 3 offers drawn by the 'shop'
 * stream, uniformly among staff not seated. The preview number on every card rescores the turn just
 * played (its crisis and its lit regions as first dealt and as they stood at SEND, on the map as it
 * was when SEND was pressed) with that staff added to the first free seat, or in place of a seat,
 * and prints the best send before and after. Played as the best send, its left number is the score
 * the player just saw.
 */
import { Rng } from '../../engine/rng';
import type { RegionId } from '../content/map';
import { STAFF_DEF, STAFF_IDS, type StaffId } from '../content/staff';
import { INDEX, idsMask } from './board';
import { groupMasks } from './groups';
import { RULES } from './rules';
import { FIRST_WORLD } from './seeds';
import { Scorer, goldCount, maskFeatures, type Features } from './score';
import type { GameState, Owner } from './types';

/** The shop opens after this turn. */
export function shopDue(turn: number): boolean {
  const t = turn - RULES.shopFirst;
  return t >= 0 && t % RULES.shopEvery === 0;
}

/** The first turn at or after `turn` that a shop follows. */
export function nextShopAfter(turn: number): number {
  let t = Math.max(turn, RULES.shopFirst);
  while (!shopDue(t)) t++;
  return t;
}

/** Draw a fresh set of offers (mutates the state's shop stream). */
export function drawOffers(s: GameState): Array<StaffId | null> {
  const rng = new Rng(s.rng.shop);
  const seated = new Set(s.seats.map((x) => x.id));
  const avail = rng.shuffle(STAFF_IDS.filter((id) => !seated.has(id)));
  s.rng.shop = rng.snapshot();
  const offers: Array<StaffId | null> = avail.slice(0, RULES.offers);
  while (offers.length < RULES.offers) offers.push(null);
  return offers;
}

/** Open the shop after the turn just played (mutates a draft state). */
export function openShop(s: GameState): void {
  s.shopVisits += 1;
  const offers = drawOffers(s);
  const script = s.mode === 'first' ? FIRST_WORLD.shop[s.turn] : undefined;
  s.shop = { visit: s.shopVisits, offers: script ? [...script] : offers, rerollCost: RULES.reroll };
  s.phase = 'shop';
}

/** The distinct feature sets of every legal send of a deal on this map (what a score depends on). */
export function dealFeatures(lit: readonly RegionId[], crisis: RegionId, owner: Readonly<Record<RegionId, Owner>>): Features[] {
  const goldMask = idsMask(Object.keys(owner).filter((r) => owner[r] === 'gold'));
  const crisisMask = 1 << INDEX[crisis];
  const seen = new Map<string, Features>();
  for (const m of groupMasks(lit, crisis)) {
    const f = maskFeatures(m, goldMask, crisisMask);
    const key = featureKey(f);
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()];
}

function featureKey(f: Features): string {
  return `${f.points}/${f.pins}/${f.capitals}/${f.ports}/${f.gold}/${f.crisis ? 1 : 0}`;
}

function bestOf(features: readonly Features[], seats: readonly StaffId[], gold: number, oldHandM10: number): bigint {
  const scorer = new Scorer(seats, gold, oldHandM10);
  let best = 0n;
  for (const f of features) {
    const v = scorer.score(f);
    if (v > best) best = v;
  }
  return best;
}

/** The best score any legal send of a deal makes with these seats, on this map. */
export function bestScore(
  lit: readonly RegionId[],
  crisis: RegionId,
  owner: Readonly<Record<RegionId, Owner>>,
  seats: readonly StaffId[],
  oldHandM10: number,
): bigint {
  return bestOf(dealFeatures(lit, crisis, owner), seats, goldCount(owner), oldHandM10);
}

/**
 * The map as it stood when last turn's SEND was pressed: today's map with the outcome undone (the
 * regions won back to grey or red, the crisis lost back to grey, war's own spread back to grey). A
 * crisis is never gold while it is pinned, so a just-won crisis must not count for the Governor.
 */
export function ownerAtSend(s: GameState): Record<RegionId, Owner> {
  const r = s.lastSend;
  const o = { ...s.owner };
  if (!r || r.turn !== s.turn) return o;
  if (r.spread) o[r.spread.id] = 'grey';
  if (r.lost) o[r.lost.id] = 'grey';
  for (const w of r.won) o[w.id] = w.wasRed ? 'red' : 'grey';
  return o;
}

interface LastTurn {
  features: Features[];
  gold: number;
  /** The Old Hand's value at SEND (it grows at the end of the turn). */
  oldHandM10: number | null;
}

const lastTurnCache = new WeakMap<GameState, LastTurn>();

function lastTurnOf(s: GameState): LastTurn {
  let l = lastTurnCache.get(s);
  if (l) return l;
  const owner = ownerAtSend(s);
  const seen = new Map<string, Features>();
  // Every send the turn offered: the deal as first dealt, and as it stood at SEND (after a swap).
  for (const lit of [s.deal.opening, s.deal.lit]) {
    for (const f of dealFeatures(lit, s.deal.crisis, owner)) seen.set(featureKey(f), f);
  }
  const fired = s.lastSend?.trace.find((e) => e.kind === 'staff' && e.staff === 'OLDHAND');
  l = { features: [...seen.values()], gold: goldCount(owner), oldHandM10: fired && fired.kind === 'staff' ? fired.amount : null };
  lastTurnCache.set(s, l);
  return l;
}

/**
 * The best send of the turn just played with these seats: any send its deal offered (as first
 * dealt, or after the swap), on the map as it was at SEND. With the seats unchanged and the best
 * send played, it is the score the player just saw.
 */
export function bestLastTurn(s: GameState, seats: readonly StaffId[]): bigint {
  const l = lastTurnOf(s);
  const seated = s.seats.some((x) => x.id === 'OLDHAND');
  const old = seats.includes('OLDHAND') && seated ? (l.oldHandM10 ?? s.oldHandM10) : RULES.oldHandStartM10;
  return bestOf(l.features, seats, l.gold, old);
}

export interface PreviewNumber {
  /** The best send last turn with the seats as they are (bestLastTurn). */
  before: bigint;
  /** ... and with this offer hired. */
  after: bigint;
  /** The seat it would take (0-based): the first free seat, or the seat it replaces. */
  seat: number;
  replaces: boolean;
}

/**
 * The number printed on a shop card: 'BEST LAST TURN 390 → 2,343' (bestLastTurn before and after). With `replaceSeat`, the offer
 * replaces that seat; with no free seat and no `replaceSeat`, the best seat to replace is used
 * (ties to the leftmost). null when the slot is empty or the shop is closed.
 */
export function previewNumber(s: GameState, slot: number, replaceSeat?: number): PreviewNumber | null {
  const id = s.shop?.offers[slot];
  if (!id) return null;
  const seats = s.seats.map((x) => x.id);
  const before = bestLastTurn(s, seats);
  const replaced = (j: number) => seats.map((x, i) => (i === j ? id : x));
  if (replaceSeat !== undefined) {
    if (replaceSeat < 0 || replaceSeat >= seats.length) return null;
    return { before, after: bestLastTurn(s, replaced(replaceSeat)), seat: replaceSeat, replaces: true };
  }
  if (seats.length < RULES.seats) {
    return { before, after: bestLastTurn(s, [...seats, id]), seat: seats.length, replaces: false };
  }
  let best: PreviewNumber | null = null;
  for (let j = 0; j < seats.length; j++) {
    const after = bestLastTurn(s, replaced(j));
    if (!best || after > best.after) best = { before, after, seat: j, replaces: true };
  }
  return best;
}

export function price(id: StaffId): number {
  return STAFF_DEF[id].price;
}

export function sellValue(id: StaffId): number {
  return STAFF_DEF[id].sell;
}
