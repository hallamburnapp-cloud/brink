/**
 * Full-run bots. Both play every crisis with the greedy bot through the real run state
 * (traffic, brass and Old Hand counts carry over; Summit twists apply).
 * - 'greedy' never buys anything: the floor.
 * - 'builder' (spec section 14) also buys the best-value staff in each Briefing. It judges a
 *   staff by the mean best-play leverage over a few sample deals of the current map with that
 *   staff seated, per Fund; with every seat taken it weighs selling the seat whose loss costs least.
 *   When nothing is worth buying and it holds more than the ◆20 that earns full interest, it
 *   rerolls (twice at most per Briefing). It opens a sealed Recruit Folder when it has a free
 *   seat and the Funds, then takes the best card or skips. It seats additive staff left of
 *   multipliers, Deputies just before them.
 * A run that holds the slice carries on with KEEP GOING (01:00 onwards) until it misses or
 * clears the Summit of LAST_HOUR, to show how deep a build goes.
 */
import { Rng } from '../../engine/rng';
import { REGION_IDS } from '../content/map';
import { STAFF_DEF, type StaffId } from '../content/staff';
import {
  buildBoard,
  buyFolder,
  buyOffer,
  folderProblem,
  keepGoing,
  moveSeat,
  newRun,
  nextCrisis,
  pickFromFolder,
  pickProblem,
  reroll,
  scoreSelection,
  sellStaff,
  skipFolder,
  type RegionId,
  type RunState,
  type SeatedStaff,
  type World,
} from '../engine';
import { must } from './act';
import { ALL_SIZES, subsets } from './combos';
import { playGreedyCrisis } from './greedy';

export type RunBot = 'greedy' | 'builder';

export interface CrisisLine {
  hour: number;
  index: number;
  target: number;
  total: number;
  cleared: boolean;
}

export interface RunOutcome {
  seed: string;
  bot: RunBot;
  /** Every crisis played, the slice's 9 first, then any after KEEP GOING. */
  crises: CrisisLine[];
  /** Crises of the slice cleared (9 means it was held until 01:00). */
  cleared: number;
  held: boolean;
  /** Summits cleared after the slice with KEEP GOING (01:00 is the first). */
  overtimeHours: number;
  /** Staff seated at the end, left to right. */
  staff: StaffId[];
  bought: StaffId[];
  sold: StaffId[];
  funds: number;
  bestLeverage: number;
}

/** Sample deals per valuation, and the smallest gain worth paying for (share of the current mean). */
const SAMPLE_DEALS = 6;
const MIN_GAIN = 0.02;
/** Funds kept back from rerolls: interest pays +1 per ◆5 up to +4. */
const RESERVE = 20;
const MAX_REROLLS = 2;
/** An Old Hand being considered is valued as if its count had grown for a few sweeps. */
const OLD_HAND_ASSUMED_COUNT = 20;
/** KEEP GOING stops after this Hour's Summit (index 8 is 06:00, the first Overtime Hour). */
export const LAST_HOUR = 8;
const SLICE_CRISES = 9;

const MULTIPLIERS: ReadonlySet<StaffId> = new Set(['ADMIRAL', 'SOVEREIGN', 'MEDIATOR', 'STRATEGIST', 'ENVOY', 'CHIEF']);

/** Additive staff, then Deputies, then multipliers (a Deputy copies its right neighbour). */
export function seatOrder<T extends { id: StaffId }>(staff: readonly T[]): T[] {
  const add = staff.filter((s) => s.id !== 'DEPUTY' && !MULTIPLIERS.has(s.id));
  const dep = staff.filter((s) => s.id === 'DEPUTY');
  const mul = staff.filter((s) => MULTIPLIERS.has(s.id));
  if (mul.length) return [...add, ...dep, ...mul];
  return [...add.slice(0, -1), ...dep, ...add.slice(-1)];
}

interface SampleDeal {
  lit: RegionId[];
  flashpoint: RegionId;
}

function sampleDeals(world: World, rng: Rng): SampleDeal[] {
  const live = REGION_IDS.filter((r) => !world.retired.includes(r));
  return Array.from({ length: SAMPLE_DEALS }, () => {
    const lit = rng.shuffle([...live]).slice(0, 8);
    return { lit, flashpoint: lit[0] };
  });
}

/** Mean best-play leverage over the sample deals with this line-up. */
function meanBest(world: World, staff: readonly SeatedStaff[], deals: readonly SampleDeal[]): number {
  const board = buildBoard(world, seatOrder(staff), null);
  let sum = 0;
  for (const d of deals) {
    let best = 0n;
    for (const pins of subsets(d.lit, ALL_SIZES)) {
      const lev = scoreSelection(board, { pins, lit: d.lit, flashpoint: d.flashpoint }, { trace: false }).leverage;
      if (lev > best) best = lev;
    }
    sum += Number(best);
  }
  return sum / deals.length;
}

const hypothetical = (id: StaffId): SeatedStaff => ({
  uid: -1,
  id,
  count: id === 'OLDHAND' ? OLD_HAND_ASSUMED_COUNT : 0,
});

interface Option {
  value: number;
  /** Funds spent net of any sale. */
  cost: number;
  apply: (s: RunState) => RunState;
}

/** Valuations within one Briefing: the sample deals and the weakest seat of each line-up. */
interface Appraiser {
  deals: readonly SampleDeal[];
  weakest: Map<string, number>;
}

/** The seated staff whose loss costs least: the one to sell for a better hire. */
function weakestSeat(s: RunState, a: Appraiser): number {
  const key = s.staff.map((x) => `${x.id}:${x.count}`).join();
  const hit = a.weakest.get(key);
  if (hit !== undefined) return hit;
  let seat = 0;
  let keep = -1;
  s.staff.forEach((_, i) => {
    const without = meanBest(s.world, s.staff.filter((__, j) => j !== i), a.deals);
    if (without > keep) {
      keep = without;
      seat = i;
    }
  });
  a.weakest.set(key, seat);
  return seat;
}

/** How to seat `id` (bought through `buy`): in a free seat, or in place of the weakest seat. */
function seatOption(s: RunState, id: StaffId, price: number, a: Appraiser, buy: (s: RunState) => RunState): Option | null {
  if (s.staff.length < s.seatCount) {
    if (s.funds < price) return null;
    return { value: meanBest(s.world, [...s.staff, hypothetical(id)], a.deals), cost: price, apply: buy };
  }
  const seat = weakestSeat(s, a);
  const refund = STAFF_DEF[s.staff[seat].id].sell;
  if (s.funds + refund < price) return null;
  const lineup = [...s.staff.filter((_, i) => i !== seat), hypothetical(id)];
  return {
    value: meanBest(s.world, lineup, a.deals),
    cost: price - refund,
    apply: (st) => buy(must(sellStaff(st, seat))),
  };
}

/** The option with the best gain per Fund, if any gains enough. */
function bestOption(options: readonly Option[], current: number): Option | null {
  let pick: Option | null = null;
  let pickScore = 0;
  for (const o of options) {
    const gain = o.value - current;
    if (gain <= current * MIN_GAIN) continue;
    const score = gain / Math.max(1, o.cost);
    if (score > pickScore) {
      pick = o;
      pickScore = score;
    }
  }
  return pick;
}

/** Re-seat the staff in seatOrder() with moveSeat. */
function reseat(s: RunState): RunState {
  const want = seatOrder(s.staff).map((x) => x.uid);
  let cur = s;
  want.forEach((uid, to) => {
    const from = cur.staff.findIndex((x) => x.uid === uid);
    if (from !== to) cur = must(moveSeat(cur, from, to));
  });
  return cur;
}

function idsOf(s: RunState): Set<number> {
  return new Set(s.staff.map((x) => x.uid));
}

/** Spend the Briefing on staff. */
export function shopForStaff(start: RunState, rng: Rng, log: { bought: StaffId[]; sold: StaffId[] }): RunState {
  let s = start;
  const appraiser: Appraiser = { deals: sampleDeals(s.world, rng), weakest: new Map() };
  const { deals } = appraiser;
  let current = meanBest(s.world, s.staff, deals);
  const track = (before: RunState, after: RunState) => {
    const had = idsOf(before);
    const has = idsOf(after);
    for (const x of after.staff) if (!had.has(x.uid)) log.bought.push(x.id);
    for (const x of before.staff) if (!has.has(x.uid)) log.sold.push(x.id);
  };

  // Offers, best value first, until nothing is worth buying; then maybe reroll and look again.
  for (let rerolls = 0; ; rerolls++) {
    for (let guard = 0; guard < 4; guard++) {
      const options: Option[] = [];
      s.shop!.offers.forEach((offer, slot) => {
        if (offer?.kind !== 'staff') return;
        const option = seatOption(s, offer.id, offer.price, appraiser, (st) => must(buyOffer(st, slot)));
        if (option) options.push(option);
      });
      const pick = bestOption(options, current);
      if (!pick) break;
      const next = pick.apply(s);
      track(s, next);
      s = reseat(next);
      current = pick.value;
    }
    if (rerolls >= MAX_REROLLS || s.funds - s.shop!.rerollCost < RESERVE) break;
    s = must(reroll(s));
  }

  // A sealed Recruit Folder: open it with a free seat to fill, then take the best card or skip.
  const folder = s.shop!.folder;
  if (folder.kind === 'recruit' && s.staff.length < s.seatCount && !folderProblem(s)) {
    s = must(buyFolder(s));
    const contents = folder.contents;
    const options: Array<Option & { index: number }> = [];
    contents.forEach((id, index) => {
      if (pickProblem(s, index)) return;
      const value = meanBest(s.world, [...s.staff, hypothetical(id)], deals);
      options.push({ index, value, cost: 0, apply: (st) => must(pickFromFolder(st, index)) });
    });
    const pick = bestOption(options, current);
    if (pick) {
      const next = pick.apply(s);
      track(s, next);
      s = reseat(next);
    } else {
      s = must(skipFolder(s));
    }
  }
  return s;
}

/** Play one run: the slice (22:00 to the 00:00 Summit), then KEEP GOING up to LAST_HOUR. */
export function playRun(seed: string, bot: RunBot): RunOutcome {
  let s = newRun(seed);
  const log = { bought: [] as StaffId[], sold: [] as StaffId[] };
  let held = false;
  for (let guard = 0; guard < 200; guard++) {
    if (s.phase === 'crisis') s = playGreedyCrisis(s).state;
    else if (s.phase === 'briefing') {
      if (bot === 'builder') s = shopForStaff(s, new Rng(`${seed}:builder:${s.briefings}`), log);
      s = must(nextCrisis(s));
    } else if (s.phase === 'sliceEnd') {
      held = true;
      s = must(keepGoing(s));
    } else break; // missed
    if (s.log.length && s.log[s.log.length - 1].hour >= LAST_HOUR && s.log[s.log.length - 1].crisisIndex === 2) break;
  }
  const crises: CrisisLine[] = s.log.map((e) => ({
    hour: e.hour,
    index: e.crisisIndex,
    target: Number(e.target),
    total: Number(e.total),
    cleared: e.cleared,
  }));
  const slice = crises.slice(0, SLICE_CRISES);
  return {
    seed,
    bot,
    crises,
    cleared: slice.filter((c) => c.cleared).length,
    held,
    overtimeHours: crises.filter((c) => c.hour > 2 && c.index === 2 && c.cleared).length,
    staff: s.staff.map((x) => x.id),
    bought: log.bought,
    sold: log.sold,
    funds: s.funds,
    bestLeverage: Number(s.best?.leverage ?? 0n),
  };
}

/** Runs [from, to) of a bot; run i uses seed `${seed}-run-${i}`. */
export function playRuns(bot: RunBot, seed: string, from: number, to: number): RunOutcome[] {
  const out: RunOutcome[] = [];
  for (let i = from; i < to; i++) out.push(playRun(`${seed}-run-${i}`, bot));
  return out;
}
