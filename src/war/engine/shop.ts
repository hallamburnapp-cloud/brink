/**
 * The shop (SPEC section 7): opens after turns 2, 4, 6 ... with 3 offers drawn by the 'shop'
 * stream, uniformly among staff not seated. The preview number on every card rescores the opening
 * deal of the turn just played (its crisis and its 10 lit regions, on today's map) with that staff
 * added to the first free seat, or in place of a seat, and prints the best send before and after.
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
    const key = `${f.points}/${f.pins}/${f.capitals}/${f.ports}/${f.gold}/${f.crisis ? 1 : 0}`;
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()];
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

const openingCache = new WeakMap<GameState, Features[]>();

/** The best send of the turn just played (its opening deal, today's map) with these seats. */
export function bestOnOpening(s: GameState, seats: readonly StaffId[]): bigint {
  let features = openingCache.get(s);
  if (!features) {
    features = dealFeatures(s.deal.opening, s.deal.crisis, s.owner);
    openingCache.set(s, features);
  }
  const old = seats.includes('OLDHAND') && s.seats.some((x) => x.id === 'OLDHAND') ? s.oldHandM10 : RULES.oldHandStartM10;
  return bestOf(features, seats, goldCount(s.owner), old);
}

export interface PreviewNumber {
  /** The best send last turn with the seats as they are. */
  before: bigint;
  /** ... and with this offer hired. */
  after: bigint;
  /** The seat it would take (0-based): the first free seat, or the seat it replaces. */
  seat: number;
  replaces: boolean;
}

/**
 * The number printed on a shop card: 'BEST LAST TURN 390 → 2,343'. With `replaceSeat`, the offer
 * replaces that seat; with no free seat and no `replaceSeat`, the best seat to replace is used
 * (ties to the leftmost). null when the slot is empty or the shop is closed.
 */
export function previewNumber(s: GameState, slot: number, replaceSeat?: number): PreviewNumber | null {
  const id = s.shop?.offers[slot];
  if (!id) return null;
  const seats = s.seats.map((x) => x.id);
  const before = bestOnOpening(s, seats);
  const replaced = (j: number) => seats.map((x, i) => (i === j ? id : x));
  if (replaceSeat !== undefined) {
    if (replaceSeat < 0 || replaceSeat >= seats.length) return null;
    return { before, after: bestOnOpening(s, replaced(replaceSeat)), seat: replaceSeat, replaces: true };
  }
  if (seats.length < RULES.seats) {
    return { before, after: bestOnOpening(s, [...seats, id]), seat: seats.length, replaces: false };
  }
  let best: PreviewNumber | null = null;
  for (let j = 0; j < seats.length; j++) {
    const after = bestOnOpening(s, replaced(j));
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
