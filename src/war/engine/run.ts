/**
 * The run state machine: 3 Hours of 3 crises (plus KEEP GOING), the Briefing between crises,
 * Orders, seats and the sandboxes. Every action takes a state and returns a Result holding a
 * NEW state (or the same state and a short reason the UI can show when the action is refused).
 */
import { Rng } from '../../engine/rng';
import { REGION, REGION_IDS, joinKey, type Colour, type RegionId } from '../content/map';
import { ORDER } from '../content/orders';
import { PATTERN_IDS, type PatternId } from '../content/patterns';
import { STAFF_DEF, type StaffId } from '../content/staff';
import { buildBoard, resolveStaff, type Board } from './board';
import { dealRegions, makeCrisis, refill, spend, type Deal } from './deck';
import { draft } from './draft';
import { planHour } from './hours';
import { applyOrderEffect, targetProblem, targetsProblem } from './orders';
import { startingLevels } from './patterns';
import { OVERWHELM_STEPS, RULES } from './rules';
import { scoreSelection, type ScoreResult } from './score';
import { openBriefing, rollOffers } from './shop';
import type { HourPlan, Result, RunState, SweepRecord, SweepSummary, Twist, World } from './types';

export const FIRST_NIGHT_SEED = 'FIRST-NIGHT';

/** The first night's opening pile (spec section 11): 8 lit, then FRM, WNM, WMS. */
export const FIRST_NIGHT_PILE: readonly RegionId[] = [
  'LNK',
  'GUL',
  'SHL',
  'EDV',
  'QLN',
  'NWK',
  'ICW',
  'HRT',
  'FRM',
  'WNM',
  'WMS',
];

const ok = (state: RunState): Result => ({ ok: true, state });
const no = (state: RunState, reason: string): Result => ({ ok: false, reason, state });

// ---------------------------------------------------------------- setup

const REGION_COLOUR: Record<RegionId, Colour> = Object.fromEntries(REGION_IDS.map((id) => [id, REGION[id].colour]));

/** The map as it starts every run: starting colours, no stamps, cables, traffic or brass. */
export function startingWorld(): World {
  return {
    colour: { ...REGION_COLOUR },
    promoted: [],
    cables: [],
    stamps: {},
    brass: {},
    traffic: {},
    retired: [],
    levels: startingLevels(),
    scored: {},
  };
}

function zeroMade(): Record<PatternId, number> {
  return Object.fromEntries(PATTERN_IDS.map((p) => [p, 0])) as Record<PatternId, number>;
}

interface SetupOptions {
  mode: RunState['mode'];
  hour: number;
  crisisIndex: 0 | 1 | 2;
  targets?: [bigint, bigint, bigint];
  /** Lay out the first deal; receives the deal rng. */
  deal?: (rng: Rng) => Deal;
  /** Adjust the fresh state (staff, levels, traffic, Funds) after the first deal. */
  prepare?: (s: RunState) => void;
}

function setup(seed: string, opts: SetupOptions): RunState {
  const root = new Rng(seed);
  const dealRng = root.fork('deal');
  const shopRng = root.fork('shop');
  const twistRng = root.fork('twist');
  const hour = planHour(opts.hour, null, twistRng, opts.targets);
  const world = startingWorld();
  const deal = opts.deal ? opts.deal(dealRng) : dealRegions(world.retired, dealRng);
  const s: RunState = {
    version: 1,
    seed,
    mode: opts.mode,
    firstNight: seed === FIRST_NIGHT_SEED && opts.mode === 'run',
    rng: { deal: dealRng.snapshot(), shop: shopRng.snapshot(), twist: twistRng.snapshot() },
    phase: 'crisis',
    hour,
    sliceEndHour: opts.mode === 'run' ? RULES.sliceEndHour : opts.hour,
    funds: RULES.startFunds,
    seatCount: RULES.seats,
    traySlots: RULES.traySlots,
    staff: [],
    tray: [],
    world,
    crisis: makeCrisis(opts.hour, opts.crisisIndex, hour.targets[opts.crisisIndex], deal),
    shop: null,
    armed: null,
    lastSweep: null,
    lastClear: null,
    best: null,
    log: [],
    made: zeroMade(),
    sweepsTaken: 0,
    briefings: 0,
    nextUid: 1,
  };
  opts.prepare?.(s);
  return s;
}

/**
 * A new night. Seed 'FIRST-NIGHT' gives the scripted first deal and first Briefing.
 * `opts.sandbox` starts a sandbox instead (same as newSandbox).
 */
export function newRun(seed: string, opts: { sandbox?: 'late' | 'mid' } = {}): RunState {
  if (opts.sandbox) return newSandbox(opts.sandbox, seed);
  const scripted = seed === FIRST_NIGHT_SEED ? FIRST_NIGHT_PILE : [];
  return setup(seed, { mode: 'run', hour: 0, crisisIndex: 0, deal: (rng) => dealRegions([], rng, scripted) });
}

function seat(s: RunState, id: StaffId): void {
  s.staff.push({ uid: s.nextUid++, id, count: 0 });
}

function fixedDeal(rng: Rng, flashpoint: RegionId, lit: readonly RegionId[]): Deal {
  const rest = rng.shuffle(REGION_IDS.filter((r) => !lit.includes(r)));
  return { flashpoint, lit: [...lit], pile: rest };
}

function setTraffic(w: World, list: ReadonlyArray<readonly [RegionId, RegionId, number]>): void {
  for (const [a, b, t] of list) w.traffic[joinKey(a, b)] = t;
}

/**
 * Sandboxes (spec section 12).
 * - 'late' (Late Shift): OVERTIME 10:00 Flare-up, target 600,000,000; Herald, Governor, Signals
 *   Officer, Deputy, The Sovereign; Network level 6; 2 brass pins on LNK; ◆40.
 * - 'mid' (Mid Shift): 01:00 Standoff, target 9,000; Harbourmaster, Hotline Operator,
 *   Strategist; Network level 3; KLP Fortified.
 */
export function newSandbox(kind: 'late' | 'mid', seed = kind === 'late' ? 'LATE-SHIFT' : 'MID-SHIFT'): RunState {
  if (kind === 'late') {
    return setup(seed, {
      mode: 'late',
      hour: 12,
      crisisIndex: 0,
      targets: [600_000_000n, 900_000_000n, 1_200_000_000n],
      deal: (rng) => fixedDeal(rng, 'HRT', ['EDV', 'MRD', 'TRN', 'LNK', 'GUL', 'ICW', 'HRT', 'BRK']),
      prepare: (s) => {
        for (const id of ['HERALD', 'GOVERNOR', 'SIGNALS', 'DEPUTY', 'SOVEREIGN'] as const) seat(s, id);
        s.world.levels.NETWORK = 6;
        s.world.brass.LNK = 2;
        setTraffic(s.world, [
          ['EDV', 'MRD', 6],
          ['MRD', 'TRN', 9],
          ['TRN', 'GUL', 4],
          ['GUL', 'LNK', 3],
          ['TRN', 'LNK', 7],
        ]);
        s.funds = 40;
      },
    });
  }
  return setup(seed, {
    mode: 'mid',
    hour: 3,
    crisisIndex: 1,
    deal: (rng) => fixedDeal(rng, 'TLM', ['SHL', 'LTL', 'TLM', 'KLP', 'KLM', 'EDV', 'ICW', 'DRF']),
    prepare: (s) => {
      for (const id of ['HARBOUR', 'HOTLINE', 'STRATEGIST'] as const) seat(s, id);
      s.world.levels.NETWORK = 3;
      s.world.stamps.KLP = 'FORTIFY';
      setTraffic(s.world, [
        ['SHL', 'LTL', 2],
        ['LTL', 'TLM', 3],
        ['KLP', 'TLM', 2],
        ['KLM', 'KLP', 1],
      ]);
    },
  });
}

// ---------------------------------------------------------------- the board right now

/** The Summit twist when it is in force (during a Summit crisis), else null. */
export function twistInForce(s: RunState): Twist | null {
  return s.phase === 'crisis' && s.crisis.index === 2 ? s.hour.twist : null;
}

const boards = new WeakMap<RunState, Board>();

/**
 * The join graph and rules for this state. Cached per state object, which is safe because a
 * returned state is never mutated; never call it on a draft inside an action.
 */
export function boardOf(s: RunState): Board {
  let b = boards.get(s);
  if (!b) {
    b = buildBoard(s.world, s.staff, twistInForce(s));
    boards.set(s, b);
  }
  return b;
}

/** Score a selection on this state without committing anything (bots, the CLEARS lamp). */
export function scorePins(s: RunState, pins: readonly RegionId[], opts: { trace?: boolean } = {}): ScoreResult | null {
  if (pins.length === 0) return null;
  return scoreSelection(boardOf(s), { pins, lit: s.crisis.lit, flashpoint: s.crisis.flashpoint }, opts);
}

// ---------------------------------------------------------------- pins

function inCrisis(s: RunState): string | null {
  return s.phase === 'crisis' ? null : 'No crisis on the table.';
}

export function pin(s: RunState, region: RegionId): Result {
  const bad = inCrisis(s);
  if (bad) return no(s, bad);
  const c = s.crisis;
  if (c.pins.includes(region)) return no(s, 'Already pinned.');
  if (s.world.retired.includes(region)) return no(s, 'That region is retired.');
  if (c.spent.includes(region)) return no(s, 'That region is spent this crisis.');
  if (!c.lit.includes(region)) return no(s, 'Only lit regions can be pinned.');
  if (c.pins.length >= RULES.maxPins) return no(s, 'Five pins is the limit.');
  const d = draft(s);
  d.crisis.pins.push(region);
  return ok(d);
}

/** Lift a pin. Lifting the Airlift pin returns the AIRLIFT paper to the tray. */
export function unpin(s: RunState, region: RegionId): Result {
  const bad = inCrisis(s);
  if (bad) return no(s, bad);
  if (!s.crisis.pins.includes(region)) return no(s, 'Not pinned.');
  const d = draft(s);
  const c = d.crisis;
  c.pins = c.pins.filter((r) => r !== region);
  if (c.airlift === region) {
    c.pile.push(region);
    if (c.airliftPaper) d.tray.push(c.airliftPaper);
    c.airlift = null;
    c.airliftPaper = null;
  }
  return ok(d);
}

export function togglePin(s: RunState, region: RegionId): Result {
  return s.crisis.pins.includes(region) ? unpin(s, region) : pin(s, region);
}

/** Lift every pin (the Airlift pin too, returning its paper). */
export function clearPins(s: RunState): Result {
  let cur = s;
  for (const r of [...s.crisis.pins]) cur = unpin(cur, r).state;
  return ok(cur);
}

// ---------------------------------------------------------------- sweep and swap

export function sweepProblem(s: RunState): string | null {
  const bad = inCrisis(s);
  if (bad) return bad;
  const c = s.crisis;
  if (c.sweepsLeft <= 0) return 'No sweeps left.';
  if (c.pins.length === 0) return 'Pin at least one lit region.';
  if (twistInForce(s)?.kind === 'FULL_TABLE' && c.pins.length !== RULES.fullTable) return 'FULL TABLE: pin exactly 5.';
  return null;
}

export function swapProblem(s: RunState): string | null {
  const bad = inCrisis(s);
  if (bad) return bad;
  const c = s.crisis;
  if (c.swapsLeft <= 0) return 'No swaps left.';
  if (!c.pins.some((r) => r !== c.airlift)) return 'Pin the regions you want to swap out.';
  return null;
}

/** Score the pins, commit, spend them and refill; then clear, miss or carry on. */
export function sweep(s: RunState): Result {
  const bad = sweepProblem(s);
  if (bad) return no(s, bad);
  const res = scorePins(s, s.crisis.pins, { trace: true })!;
  const d = draft(s);
  const c = d.crisis;
  const w = d.world;

  // Commit: traffic, Old Hand, glow, total.
  for (const [a, b] of res.threads) {
    const k = joinKey(a, b);
    w.traffic[k] = (w.traffic[k] ?? 0) + 1;
  }
  for (const st of d.staff) if (st.id === 'OLDHAND') st.count += 5;
  for (const [r, n] of Object.entries(res.passes)) if (n > 0) w.scored[r] = (w.scored[r] ?? 0) + n;
  const totalBefore = c.total;
  c.total += res.leverage;
  c.sweepsLeft -= 1;
  d.sweepsTaken += 1;
  d.made[res.pattern] += 1;

  // Every pinned region is spent; the Airlift pin is used up.
  const pins = [...c.pins];
  spend(c, pins);
  c.pins = [];
  c.airlift = null;
  c.airliftPaper = null;
  refill(d);

  const cleared = c.total >= c.target;
  const record: SweepRecord = {
    n: c.sweeps.length + 1,
    pins,
    pattern: res.pattern,
    level: res.level,
    scoringSet: res.scoringSet,
    topRegion: res.topRegion,
    leverage: res.leverage,
    totalBefore,
    totalAfter: c.total,
    target: c.target,
    cleared,
    baseInfluence: res.baseInfluence,
    baseM10: res.baseM10,
    influence: res.influence,
    m10: res.m10,
    ringed: res.ringed,
    threads: res.threads,
    hour: c.hour,
    crisisIndex: c.index,
    trace: res.trace,
  };
  c.sweeps.push(summarize(record));
  d.lastSweep = record;
  d.lastClear = null;
  d.armed = null;
  if (!d.best || res.leverage > d.best.leverage) {
    d.best = {
      leverage: res.leverage,
      pattern: res.pattern,
      level: res.level,
      pins,
      scoringSet: res.scoringSet,
      hour: c.hour,
      crisisIndex: c.index,
    };
  }

  if (cleared) clearCrisis(d, res.topRegion);
  else if (c.sweepsLeft === 0) endCrisis(d, 'missed');
  return ok(d);
}

function summarize(r: SweepRecord): SweepSummary {
  const { n, pins, pattern, level, scoringSet, topRegion, leverage, totalBefore, totalAfter, target, cleared } = r;
  return { n, pins, pattern, level, scoringSet, topRegion, leverage, totalBefore, totalAfter, target, cleared };
}

function endCrisis(d: RunState, outcome: 'missed' | 'cleared'): void {
  const c = d.crisis;
  const best = c.sweeps.reduce<SweepSummary | null>(
    (b, x) => (!b || x.leverage > b.leverage ? x : b),
    null,
  );
  d.log.push({
    hour: c.hour,
    crisisIndex: c.index,
    kind: c.kind,
    target: c.target,
    total: c.total,
    sweepsUsed: c.sweeps.length,
    cleared: outcome === 'cleared',
    bestPattern: best?.pattern ?? null,
    bestLeverage: best?.leverage ?? 0n,
  });
  if (outcome === 'missed') d.phase = 'missed';
}

function clearCrisis(d: RunState, top: RegionId): void {
  const c = d.crisis;
  c.cleared = true;
  const fundsBefore = d.funds;
  const reward = RULES.rewards[c.index];
  const unusedSweeps = c.sweepsLeft;
  const interest = Math.min(RULES.interestCap, Math.floor(fundsBefore / RULES.interestPer));
  const overwhelm = OVERWHELM_STEPS.find(([x]) => c.total >= c.target * x)?.[1] ?? 0;
  // Never boardOf(d) here: d is a draft still being changed, and boards are cached per state.
  const treasurers = resolveStaff(d.staff).filter((a) => a.id === 'TREASURER').length;
  const treasurer = treasurers * RULES.treasurerFunds;
  const payout = reward + unusedSweeps + interest + overwhelm + treasurer;
  d.funds += payout;
  d.world.brass[top] = (d.world.brass[top] ?? 0) + 1;
  d.lastClear = {
    hour: c.hour,
    crisisIndex: c.index,
    reward,
    unusedSweeps,
    interest,
    overwhelm,
    treasurer,
    payout,
    fundsBefore,
    fundsAfter: d.funds,
    brass: top,
  };
  endCrisis(d, 'cleared');
  if (c.index === 2 && d.sliceEndHour === c.hour) {
    d.phase = 'sliceEnd';
  } else {
    d.phase = 'briefing';
    openBriefing(d);
  }
}

/** Send the selected lit regions dark and light new ones (the Airlift pin stays). */
export function swap(s: RunState): Result {
  const bad = swapProblem(s);
  if (bad) return no(s, bad);
  const d = draft(s);
  const c = d.crisis;
  const out = c.pins.filter((r) => r !== c.airlift);
  spend(c, out);
  c.pins = c.airlift ? [c.airlift] : [];
  c.swapsLeft -= 1;
  refill(d);
  d.armed = null;
  return ok(d);
}

// ---------------------------------------------------------------- between crises

function dealNext(d: RunState, hourIndex: number, index: 0 | 1 | 2): void {
  const rng = new Rng(d.rng.deal);
  const deal = dealRegions(d.world.retired, rng);
  d.rng.deal = rng.snapshot();
  d.crisis = makeCrisis(hourIndex, index, d.hour.targets[index], deal);
}

function startHour(d: RunState, hourIndex: number): void {
  const rng = new Rng(d.rng.twist);
  const plan: HourPlan = planHour(hourIndex, d.hour.targets, rng);
  d.rng.twist = rng.snapshot();
  d.hour = plan;
}

/** Leave the Briefing: deal the next crisis (and start the next Hour after a Summit). */
export function nextCrisis(s: RunState): Result {
  if (s.phase !== 'briefing') return no(s, 'Finish the crisis first.');
  const d = draft(s);
  d.shop = null;
  d.armed = null;
  d.lastClear = null;
  const c = s.crisis;
  if (c.index < 2) {
    dealNext(d, c.hour, (c.index + 1) as 1 | 2);
  } else {
    startHour(d, c.hour + 1);
    dealNext(d, c.hour + 1, 0);
  }
  d.phase = 'crisis';
  return ok(d);
}

/** After the slice's last Summit: carry on into the next Hour (testing only). Opens a Briefing. */
export function keepGoing(s: RunState): Result {
  if (s.phase !== 'sliceEnd') return no(s, 'The night is not over yet.');
  const d = draft(s);
  d.sliceEndHour = null;
  d.phase = 'briefing';
  openBriefing(d);
  return ok(d);
}

// ---------------------------------------------------------------- the Briefing

function inBriefing(s: RunState): string | null {
  return s.phase === 'briefing' && s.shop ? null : 'The Briefing is closed.';
}

function canAct(s: RunState): string | null {
  return s.phase === 'crisis' || s.phase === 'briefing' ? null : 'The night is over.';
}

const NO_SEAT = 'No free seat. Sell someone first.';
const NO_TRAY = 'In-tray full. Use or sell a paper first.';
const NO_FUNDS = 'Not enough Funds.';

/** Why offer `slot` can't be bought right now, or null. */
export function offerProblem(s: RunState, slot: number): string | null {
  const bad = inBriefing(s);
  if (bad) return bad;
  const offer = s.shop!.offers[slot];
  if (!offer) return 'Nothing there.';
  if (s.funds < offer.price) return NO_FUNDS;
  if (offer.kind === 'staff' && s.staff.length >= s.seatCount) return NO_SEAT;
  if (offer.kind === 'order' && s.tray.length >= s.traySlots) return NO_TRAY;
  return null;
}

/** Buy offer slot 0 or 1: staff take the leftmost free seat, Orders a tray slot, Playbooks apply now. */
export function buyOffer(s: RunState, slot: number): Result {
  const bad = offerProblem(s, slot);
  if (bad) return no(s, bad);
  const offer = s.shop!.offers[slot]!;
  const d = draft(s);
  d.funds -= offer.price;
  d.shop!.offers[slot] = null;
  if (offer.kind === 'staff') seat(d, offer.id);
  else if (offer.kind === 'order') d.tray.push({ uid: d.nextUid++, id: offer.id });
  else d.world.levels[offer.pattern] += 1;
  return ok(d);
}

/** Reroll both offer slots. Costs 4, then 5, 6 ... and resets each Briefing. */
export function reroll(s: RunState): Result {
  const bad = inBriefing(s);
  if (bad) return no(s, bad);
  // The offers are under the open folder: a reroll would spend Funds on cards nobody can see.
  if (s.shop!.folder.status === 'open') return no(s, 'Take a card or SKIP first.');
  const cost = s.shop!.rerollCost;
  if (s.funds < cost) return no(s, NO_FUNDS);
  const d = draft(s);
  d.funds -= cost;
  const rng = new Rng(d.rng.shop);
  d.shop!.offers = rollOffers(d, rng, d.shop);
  d.rng.shop = rng.snapshot();
  d.shop!.rerollCost = cost + 1;
  return ok(d);
}

/** Pay for the folder and open it. */
export function buyFolder(s: RunState): Result {
  const bad = folderProblem(s);
  if (bad) return no(s, bad);
  const d = draft(s);
  d.funds -= s.shop!.folder.price;
  d.shop!.folder.status = 'open';
  return ok(d);
}

/** Why the folder can't be bought (opened) right now, or null. */
export function folderProblem(s: RunState): string | null {
  const bad = inBriefing(s);
  if (bad) return bad;
  const f = s.shop!.folder;
  if (f.status !== 'sealed') return f.status === 'open' ? 'Already open.' : 'Folder already used.';
  // Never take Funds for a folder whose every card would be refused.
  if (f.kind === 'recruit' && s.staff.length >= s.seatCount) return NO_SEAT;
  if (f.kind === 'orders' && s.tray.length >= s.traySlots) return NO_TRAY;
  if (s.funds < f.price) return NO_FUNDS;
  return null;
}

/** Why card `index` can't be taken from the open folder, or null. */
export function pickProblem(s: RunState, index: number): string | null {
  const bad = inBriefing(s);
  if (bad) return bad;
  const f = s.shop!.folder;
  if (f.status !== 'open') return 'Open the folder first.';
  if (index < 0 || index >= f.contents.length) return 'Nothing there.';
  if (f.kind === 'recruit' && s.staff.length >= s.seatCount) return NO_SEAT;
  if (f.kind === 'orders' && s.tray.length >= s.traySlots) return NO_TRAY;
  return null;
}

/** Take card `index` (0-2) from the open folder. */
export function pickFromFolder(s: RunState, index: number): Result {
  const bad = pickProblem(s, index);
  if (bad) return no(s, bad);
  const d = draft(s);
  const folder = d.shop!.folder;
  if (folder.kind === 'recruit') seat(d, folder.contents[index]);
  else d.tray.push({ uid: d.nextUid++, id: folder.contents[index] });
  folder.status = 'used';
  return ok(d);
}

/** Close the open folder without taking anything. */
export function skipFolder(s: RunState): Result {
  const bad = inBriefing(s);
  if (bad) return no(s, bad);
  if (s.shop!.folder.status !== 'open') return no(s, 'Open the folder first.');
  const d = draft(s);
  d.shop!.folder.status = 'used';
  return ok(d);
}

/** Sell the staff in seat `seatIndex` (0 = leftmost). The others slide left. */
export function sellStaff(s: RunState, seatIndex: number): Result {
  const bad = canAct(s);
  if (bad) return no(s, bad);
  const st = s.staff[seatIndex];
  if (!st) return no(s, 'That seat is empty.');
  const d = draft(s);
  d.staff.splice(seatIndex, 1);
  d.funds += STAFF_DEF[st.id].sell;
  return ok(d);
}

/** Sell the paper in tray slot `slot`. */
export function sellPaper(s: RunState, slot: number): Result {
  const bad = canAct(s);
  if (bad) return no(s, bad);
  const p = s.tray[slot];
  if (!p) return no(s, 'That slot is empty.');
  const d = draft(s);
  d.tray.splice(slot, 1);
  d.funds += ORDER[p.id].sell;
  d.armed = null;
  return ok(d);
}

/** Move the staff at seat `from` to seat `to`; the others slide aside. Any time between sweeps. */
export function moveSeat(s: RunState, from: number, to: number): Result {
  const bad = canAct(s);
  if (bad) return no(s, bad);
  if (!s.staff[from]) return no(s, 'That seat is empty.');
  const target = Math.max(0, Math.min(s.staff.length - 1, to));
  if (target === from) return ok(s);
  const d = draft(s);
  const [moved] = d.staff.splice(from, 1);
  d.staff.splice(target, 0, moved);
  return ok(d);
}

// ---------------------------------------------------------------- Orders

/** Why the paper in tray `slot` can't be used right now (phase, empty slot, AIRLIFT outside a crisis). */
export function paperProblem(s: RunState, slot: number): string | null {
  const bad = canAct(s);
  if (bad) return bad;
  const p = s.tray[slot];
  if (!p) return 'That slot is empty.';
  if (ORDER[p.id].crisisOnly && s.phase !== 'crisis') return `${ORDER[p.id].name} works only during a crisis.`;
  return null;
}

/** Arm the Order in tray `slot` (tap it again to disarm). Then tapArmed() each target. */
export function armOrder(s: RunState, slot: number): Result {
  if (s.armed?.slot === slot) return disarm(s);
  const bad = paperProblem(s, slot);
  if (bad) return no(s, bad);
  const d = draft(s);
  d.armed = { slot, order: s.tray[slot].id, chosen: [] };
  return ok(d);
}

export function disarm(s: RunState): Result {
  if (!s.armed) return ok(s);
  const d = draft(s);
  d.armed = null;
  return ok(d);
}

/** Choose (or un-choose) a target for the armed Order. It applies itself when the last target is chosen. */
export function tapArmed(s: RunState, region: RegionId): Result {
  const a = s.armed;
  if (!a) return no(s, 'No Order armed.');
  if (a.chosen.includes(region)) {
    const d = draft(s);
    // Un-choosing a DEFECT source starts over; anything else just drops that target.
    d.armed!.chosen = a.order === 'DEFECT' && a.chosen[0] === region ? [] : a.chosen.filter((r) => r !== region);
    return ok(d);
  }
  const problem = targetProblem(s, a.order, a.chosen, region);
  if (problem) return no(s, problem);
  const chosen = [...a.chosen, region];
  if (chosen.length >= ORDER[a.order].targeting.max) return useOrder(s, a.slot, chosen);
  const d = draft(s);
  d.armed!.chosen = chosen;
  return ok(d);
}

/** Apply the armed Order with the targets chosen so far (for 'up to 2' Orders). */
export function confirmArmed(s: RunState): Result {
  const a = s.armed;
  if (!a) return no(s, 'No Order armed.');
  return useOrder(s, a.slot, a.chosen);
}

/** Can the armed Order be applied now with what has been chosen? */
export function canConfirmArmed(s: RunState): boolean {
  const a = s.armed;
  return !!a && a.chosen.length >= ORDER[a.order].targeting.min && targetsProblem(s, a.order, a.chosen) === null;
}

/** Use the Order in tray `slot` on `targets` in one go (bots, tests and drag gestures). */
export function useOrder(s: RunState, slot: number, targets: readonly RegionId[]): Result {
  const bad = paperProblem(s, slot);
  if (bad) return no(s, bad);
  const paper = s.tray[slot];
  const problem = targetsProblem(s, paper.id, targets);
  if (problem) return no(s, problem);
  const d = draft(s);
  d.tray.splice(slot, 1);
  d.armed = null;
  applyOrderEffect(d, paper.id, targets);
  if (paper.id === 'AIRLIFT') d.crisis.airliftPaper = { ...paper };
  return ok(d);
}
