/**
 * Helpers for tests, the simulator and the dev hook: unwrap results, pin several regions, build a
 * map from lists, set up a position, and enumerate every legal send of the current deal.
 */
import type { RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import { ADJ, INDEX, idsMask, maskIds } from './board';
import { groupMasks } from './groups';
import { regionsWon } from './ladder';
import { maskFeatures, Scorer, goldCount } from './score';
import { pin } from './run';
import type { Deal, GameState, Owner, Result } from './types';
import { freshOwners, type OwnerMap } from './world';

/** The state of a successful result; throws with the refusal reason otherwise. */
export function must(r: Result): GameState {
  if (!r.ok) throw new Error(`refused: ${r.reason}`);
  return r.state;
}

/** Pin each region in turn (throws on refusal). */
export function pinAll(s: GameState, ids: readonly RegionId[]): GameState {
  return ids.reduce((st, id) => must(pin(st, id)), s);
}

/** A touching group in an order that can be tapped (each region touches an earlier one). */
export function tapOrder(group: readonly RegionId[]): RegionId[] {
  if (!group.length) return [];
  const order = [group[0]];
  while (order.length < group.length) {
    const next = group.find((r) => !order.includes(r) && ADJ[r].some((n) => order.includes(n)));
    if (!next) throw new Error(`not a touching group: ${group.join(' ')}`);
    order.push(next);
  }
  return order;
}

/** A map with these gold and red regions (every other region grey; home is not forced gold). */
export function ownersFrom(gold: readonly RegionId[], red: readonly RegionId[]): OwnerMap {
  const owner = freshOwners();
  for (const r of Object.keys(owner)) owner[r] = 'grey';
  for (const r of gold) owner[r] = 'gold';
  for (const r of red) owner[r] = 'red';
  return owner;
}

/**
 * A copy of `s` in phase 'choose' with a hand-made position: any of the map, seats, coins, turn
 * and deal (the deal's target defaults to the turn's).
 */
export function position(
  s: GameState,
  opts: {
    owner?: Record<RegionId, Owner>;
    seats?: readonly StaffId[];
    coins?: number;
    turn?: number;
    oldHandM10?: number;
    deal?: Partial<Deal> & { crisis: RegionId; lit: readonly RegionId[] };
  },
): GameState {
  const seats = opts.seats ? opts.seats.map((id, i) => ({ uid: i + 1, id })) : s.seats;
  const d = opts.deal;
  const deal: Deal = d
    ? {
        crisis: d.crisis,
        target: d.target ?? s.deal.target,
        finalPush: d.finalPush ?? false,
        lit: [...d.lit],
        pile: [...(d.pile ?? [])],
        opening: [...(d.opening ?? d.lit)],
        pins: [...(d.pins ?? [])],
        swapsLeft: d.swapsLeft ?? 1,
        swapLocked: d.swapLocked ?? false,
      }
    : s.deal;
  return {
    ...s,
    owner: opts.owner ? { ...opts.owner } : s.owner,
    seats,
    nextUid: Math.max(s.nextUid, seats.length + 1),
    coins: opts.coins ?? s.coins,
    turn: opts.turn ?? s.turn,
    oldHandM10: opts.oldHandM10 ?? s.oldHandM10,
    deal,
    phase: 'choose',
    shop: null,
    ending: null,
  };
}

export interface SendOption {
  /** Sorted by id. */
  pins: RegionId[];
  score: bigint;
  regions: number;
}

/** Every legal send of the current deal with its score (the fast scorer), best first. */
export function sendOptions(s: GameState): SendOption[] {
  const d = s.deal;
  const scorer = new Scorer(s.seats.map((x) => x.id), goldCount(s.owner), s.oldHandM10);
  const goldMask = idsMask(Object.keys(s.owner).filter((r) => s.owner[r] === 'gold'));
  const crisisMask = 1 << INDEX[d.crisis];
  const out = groupMasks(d.lit, d.crisis).map((m) => {
    const score = scorer.score(maskFeatures(m, goldMask, crisisMask));
    return { pins: maskIds(m), score, regions: regionsWon(score, d.target) };
  });
  const key = (o: SendOption) => o.pins.join(' ');
  return out.sort((a, b) => (a.score !== b.score ? (a.score > b.score ? -1 : 1) : key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

/** The median score of a list of sends (the mean of the middle two for an even count, floored). */
export function medianScore(options: readonly SendOption[]): bigint {
  const v = options.map((o) => o.score).sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
  if (!v.length) return 0n;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2n;
}
