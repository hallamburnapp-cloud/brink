/**
 * Headless balance simulator: plays whole runs with bot policies through the
 * engine's public API and aggregates wins, scores, antes, accidents, capital,
 * orders, archetypes, piece buy rates, card coverage, combo effects and
 * per-card impact into a Report (plain JSON) plus a markdown rendering.
 * Everything is deterministic for a given seed base.
 *
 * Runs are independent and never cloned: each run creates one RunState and
 * mutates it through createRun / view / useOrder / choose / buryCard / the shop
 * functions / leaveShop / continueRun. Aggregation is incremental so 60k runs
 * stay cheap; only a lean record per run (pieces, outcome, score) is kept for
 * the combo and piece-profile tables.
 */
import { Rng } from '../engine/rng';
import { estimateMinutes } from '../engine/leverage';
import {
  buryCard,
  buyOrder,
  buyPiece,
  choose,
  continueRun,
  createRun,
  ctxFor,
  difficultyDef,
  leaveShop,
  maxOrders,
  maxPieces,
  removeTag,
  rerollCost,
  rerollShop,
  sellPiece,
  sellPrice,
  useOrder,
  view,
} from '../engine/run';
import { METERS, type CardView, type Content, type Effects, type EndingKind, type Mode, type Pool, type Rarity, type RunEvent, type RunState, type Seat } from '../engine/types';
import { archetypeAssembled, policyByName, type Decision, type Policy, type ShopApi } from './policies';

// ------------------------------------------------------------------ one run

export type AnteResult = 'met' | 'smashed' | 'missed';

export interface RunSummary {
  seed: string;
  seat: Seat;
  policy: string;
  /** The run's result: the first ending reached (before any endless continuation). */
  ending: string;
  kind: EndingKind;
  /** How the run finally stopped (differs from `ending` only after a continuation). */
  finalEnding: string;
  finalKind: EndingKind;
  /** Reached a run_end ending (stand-down or survival) on the last authored act. */
  won: boolean;
  standdown: boolean;
  days: number;
  /** Final act reached (past the authored acts in endless). */
  act: number;
  cards: number;
  pieces: string[];
  /** Piece ids offered (one entry per shop visit that offered them, rerolls included). */
  offered: string[];
  bought: string[];
  sold: string[];
  ordersOffered: string[];
  ordersBought: string[];
  ordersUsed: string[];
  shops: number;
  rerolls: number;
  tagsRemoved: number;
  timeouts: number;
  timedCards: number;
  rolls: number;
  nearMisses: number;
  falseAlarms: number;
  seen: string[];
  peakEscalation: number;
  bestChoice: number;
  score: number;
  capitalEarned: number;
  capitalSpent: number;
  /** Cards that had an accident attached. */
  accidentsAttached: number;
  /** Accidents that fired. */
  accidents: number;
  accidentsSurvived: number;
  /** Escalation applied by fired accidents, summed. */
  accidentEscalation: number;
  antesMet: number;
  antesMissed: number;
  antesSmashed: number;
  antes: { act: number; result: AnteResult }[];
  endless: boolean;
  endlessActs: number;
  /** Archetype with ≥ 2 core pieces held at the end (most core wins), or null. */
  archetype: string | null;
  /** The same, measured when act 3 begins. */
  archetypeByAct3: string | null;
  /** Estimated minutes of human play up to the first ending. */
  estMinutes: number;
  /** Estimated minutes including any endless continuation. */
  estMinutesTotal: number;
  /** The step cap was hit before the run ended (a content gap or an unbeatable endless build). */
  capped: boolean;
}

/** Called once per presented card so the simulator can build the per-card table without keeping histories. */
export interface RunObserver {
  /** Called after each card resolves; `state` is the live run state (read only). */
  onCard(card: CardView, decision: Decision, applied: Effects | null, leverage: number, state: RunState): void;
  /** Optional: the raw engine events of that step (for attribution probes). */
  onEvents?(events: RunEvent[], state: RunState): void;
}

export interface RunOneOptions {
  seed: string;
  seat: Seat;
  policy: Policy;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  mode?: Mode;
  observer?: RunObserver;
}

/** Hard stop against a content gap or an endless build that never dies. A full run is ~90 cards plus ~10 shops. */
export const MAX_STEPS = 6000;
/** Orders a policy may fire on one card. */
export const MAX_ORDERS_PER_CARD = 4;
export const UNFINISHED = 'unfinished';

const KINDS: readonly EndingKind[] = ['nuclear', 'removed', 'standdown', 'survival', 'special'] as const;

/** Per-run tally fed by the engine's events. */
class Tally {
  earned = 0;
  spent = 0;
  attached = 0;
  accidentEscalation = 0;
  antes: { act: number; result: AnteResult }[] = [];
  ordersUsed: string[] = [];

  apply(events: readonly RunEvent[], act: number): void {
    for (const e of events) {
      switch (e.type) {
        case 'capital':
          if (e.delta > 0) this.earned += e.delta;
          else this.spent -= e.delta;
          break;
        case 'accident':
          this.attached++;
          if (e.result.fired) this.accidentEscalation += e.result.applied.escalation ?? 0;
          break;
        case 'ante':
          this.antes.push({ act, result: e.met ? (e.smashed ? 'smashed' : 'met') : 'missed' });
          break;
        case 'order_used':
          this.ordersUsed.push(e.order);
          break;
        default:
          break;
      }
    }
  }
}

/** The ShopApi over the engine, recording offers and purchases for the report. */
class ShopSession implements ShopApi {
  offered: string[] = [];
  bought: string[] = [];
  sold: string[] = [];
  ordersOffered: string[] = [];
  ordersBought: string[] = [];
  rerolls = 0;
  removed = 0;

  constructor(
    private readonly content: Content,
    private readonly state: RunState,
    private readonly tally: Tally,
  ) {
    this.noteOffers();
  }

  private noteOffers(): void {
    const shop = this.state.shop;
    if (!shop) return;
    for (const o of shop.offers) if (!o.sold) this.offered.push(o.piece);
    for (const o of shop.orders) if (!o.sold) this.ordersOffered.push(o.order);
  }

  buyPiece(index: number): boolean {
    const s = this.state;
    const offer = s.shop?.offers[index];
    if (!offer || offer.sold) return false;
    const { events } = buyPiece(this.content, s, index);
    this.tally.apply(events, s.act);
    if (!offer.sold) return false;
    this.bought.push(offer.piece);
    return true;
  }

  buyOrder(index: number): boolean {
    const s = this.state;
    const offer = s.shop?.orders[index];
    if (!offer || offer.sold) return false;
    const { events } = buyOrder(this.content, s, index);
    this.tally.apply(events, s.act);
    if (!offer.sold) return false;
    this.ordersBought.push(offer.order);
    return true;
  }

  sellPiece(pieceId: string): boolean {
    const s = this.state;
    if (!s.pieces.includes(pieceId)) return false;
    const { events } = sellPiece(this.content, s, pieceId);
    this.tally.apply(events, s.act);
    if (s.pieces.includes(pieceId)) return false;
    this.sold.push(pieceId);
    return true;
  }

  reroll(): boolean {
    const s = this.state;
    const before = s.shop?.rerolls ?? 0;
    const { events } = rerollShop(this.content, s);
    this.tally.apply(events, s.act);
    if ((s.shop?.rerolls ?? 0) === before) return false;
    this.rerolls++;
    this.noteOffers();
    return true;
  }

  removeTag(tag: string): boolean {
    const s = this.state;
    const before = s.removedTags.length;
    const { events } = removeTag(this.content, s, tag);
    this.tally.apply(events, s.act);
    if (s.removedTags.length === before) return false;
    this.removed++;
    return true;
  }

  rerollCost(): number {
    return rerollCost(this.state, ctxFor(this.content, this.state));
  }

  sellPrice(pieceId: string): number {
    return sellPrice(this.content, this.state, pieceId);
  }

  maxPieces(): number {
    return maxPieces(ctxFor(this.content, this.state));
  }

  maxOrders(): number {
    return maxOrders(ctxFor(this.content, this.state));
  }
}

export function runOne(content: Content, opts: RunOneOptions): RunSummary {
  const policy = opts.policy;
  const state = createRun(content, { seed: opts.seed, seat: opts.seat, mode: opts.mode ?? 'endless', difficulty: opts.difficulty, unlocked: 'all' });
  const rng = new Rng(`${opts.seed}|${policy.name}`);
  const observer = opts.observer;
  const tally = new Tally();
  const lastAct = content.acts.length;

  const offered: string[] = [];
  const bought: string[] = [];
  const sold: string[] = [];
  const ordersOffered: string[] = [];
  const ordersBought: string[] = [];
  let shops = 0;
  let rerolls = 0;
  let tagsRemoved = 0;
  let timedCards = 0;
  let archetypeByAct3: string | null | undefined;

  // The first ending is the run's result; a continuation only adds score.
  let ending: string | null = null;
  let kind: EndingKind = 'special';
  let won = false;
  let estMinutes = 0;
  let capped = true;

  const noteAct = () => {
    if (archetypeByAct3 === undefined && state.act >= 3) archetypeByAct3 = archetypeAssembled(content, state);
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    if (state.phase === 'ended') {
      if (ending === null) {
        ending = state.ending ?? UNFINISHED;
        kind = content.endings[ending]?.kind ?? 'special';
        // Expert wins by reaching the Endgame's end with the option to continue; the night (simple
        // ruleset) wins by reaching 6:00, which is any run_end ending.
        won = state.ruleset === 'simple' ? content.endings[ending]?.trigger.type === 'run_end' : state.canContinue && state.act >= lastAct && !state.endless;
        estMinutes = estimateMinutes(state.cardsPlayed, state.stats.rolls, shops, state.stats.accidents);
      }
      if (state.canContinue && policy.continueRun(content, state, rng)) {
        const r = continueRun(content, state);
        tally.apply(r.events, state.act);
        continue;
      }
      capped = false;
      break;
    }

    if (state.phase === 'shop') {
      shops++;
      const session = new ShopSession(content, state, tally);
      policy.shop(content, state, rng, session);
      for (const id of session.offered) offered.push(id);
      for (const id of session.bought) bought.push(id);
      for (const id of session.sold) sold.push(id);
      for (const id of session.ordersOffered) ordersOffered.push(id);
      for (const id of session.ordersBought) ordersBought.push(id);
      rerolls += session.rerolls;
      tagsRemoved += session.removed;
      const r = leaveShop(content, state);
      tally.apply(r.events, state.act);
      noteAct();
      continue;
    }

    let v = view(content, state);
    if (!v) break;

    // Orders first: a policy may fire several, but an order that is not consumed ends the round.
    let used = 0;
    while (state.orders.length > 0 && used < MAX_ORDERS_PER_CARD) {
      const idx = policy.useOrder(content, state, v, rng, used);
      if (idx < 0 || idx >= state.orders.length) break;
      const before = state.orders.length;
      const r = useOrder(content, state, idx);
      tally.apply(r.events, state.act);
      if (state.orders.length === before) break;
      used++;
      if (state.phase !== 'card') break;
      const v2 = view(content, state);
      if (!v2) break;
      v = v2;
    }
    if (state.phase !== 'card') {
      noteAct();
      continue;
    }

    let decision = policy.choose(content, state, v, rng);
    if (decision === 'bury' && (state.charges.removal <= 0 || v.isFlashpoint)) decision = v.timeout;
    if (decision === 'timeout' && v.timer === null) decision = v.timeout;
    if (decision === 'bury') {
      const r = buryCard(content, state);
      tally.apply(r.events, state.act);
      if (observer) observer.onCard(v, 'bury', null, 0, state);
      noteAct();
      continue;
    }
    if (v.timer !== null) timedCards++;
    const side = decision === 'timeout' ? v.timeout : decision;
    const leverage = v[side].leverage.total;
    const r = choose(content, state, decision);
    tally.apply(r.events, state.act);
    if (observer) {
      const h = state.history[state.history.length - 1];
      observer.onCard(v, decision, h ? h.applied : null, leverage, state);
      observer.onEvents?.(r.events, state);
    }
    noteAct();
  }

  if (ending === null) {
    ending = state.ending ?? UNFINISHED;
    kind = content.endings[ending]?.kind ?? 'special';
    estMinutes = estimateMinutes(state.cardsPlayed, state.stats.rolls, shops, state.stats.accidents);
  }
  const finalEnding = state.phase === 'ended' ? (state.ending ?? UNFINISHED) : UNFINISHED;
  const finalKind: EndingKind = content.endings[finalEnding]?.kind ?? 'special';
  const st = state.stats;
  return {
    seed: opts.seed,
    seat: opts.seat,
    policy: policy.name,
    ending,
    kind,
    finalEnding,
    finalKind,
    won,
    standdown: kind === 'standdown',
    days: state.day,
    act: state.act,
    cards: state.cardsPlayed,
    pieces: state.pieces.slice(),
    offered,
    bought,
    sold,
    ordersOffered,
    ordersBought,
    ordersUsed: tally.ordersUsed,
    shops,
    rerolls,
    tagsRemoved,
    timeouts: st.timeouts,
    timedCards,
    rolls: st.rolls,
    nearMisses: st.nearMisses,
    falseAlarms: st.falseAlarms,
    seen: state.seen.slice(),
    peakEscalation: st.peakEscalation,
    bestChoice: st.bestChoice,
    score: state.score,
    capitalEarned: tally.earned,
    capitalSpent: tally.spent,
    accidentsAttached: tally.attached,
    accidents: st.accidents,
    accidentsSurvived: st.accidentsSurvived,
    accidentEscalation: tally.accidentEscalation,
    antesMet: st.antesMet,
    antesMissed: st.antesMissed,
    antesSmashed: st.antesSmashed,
    antes: tally.antes,
    endless: state.endless,
    endlessActs: Math.max(0, state.act - lastAct),
    archetype: archetypeAssembled(content, state),
    archetypeByAct3: archetypeByAct3 ?? null,
    estMinutes: round(estMinutes, 2),
    estMinutesTotal: round(estimateMinutes(state.cardsPlayed, st.rolls, shops, st.accidents), 2),
    capped,
  };
}

// ------------------------------------------------------------------ report types

export interface Percentiles {
  mean: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  p99: number;
  max: number;
}

export interface EndingCount {
  id: string;
  kind: EndingKind;
  count: number;
  pct: number;
}

export interface KindCount {
  kind: EndingKind;
  count: number;
  pct: number;
}

export interface ActCount {
  act: number;
  count: number;
  pct: number;
}

export interface AnteActStat {
  act: number;
  /** Antes settled in this act (runs that reached its end). */
  settled: number;
  met: number;
  missed: number;
  smashed: number;
  metPct: number;
  missedPct: number;
  smashedPct: number;
}

export interface AccidentStats {
  /** Cards with an accident attached, per run. */
  attachedPerRun: number;
  firedPerRun: number;
  /** Share of played cards that carried an accident, in %. */
  attachRate: number;
  /** Share of attached accidents that fired, in %. */
  fireRate: number;
  /** Fired accidents that ended the run at once, in % of fired. */
  fatalRate: number;
  /** Mean escalation applied per fired accident. */
  meanEscalation: number;
}

export interface CapitalStats {
  earnedPerRun: number;
  spentPerRun: number;
  shopsPerRun: number;
  rerollsPerRun: number;
  tagsRemovedPerRun: number;
  piecesBoughtPerRun: number;
  piecesSoldPerRun: number;
}

export interface OrderStat {
  id: string;
  offered: number;
  bought: number;
  used: number;
  /** bought / offered, or null when never offered. */
  buyRate: number | null;
  /** used / bought, or null when never bought. */
  useRate: number | null;
}

export interface OrderStats {
  boughtPerRun: number;
  usedPerRun: number;
  byOrder: OrderStat[];
}

export interface EndlessStats {
  /** Runs that continued past a winning ending. */
  continued: number;
  continuedPct: number;
  /** Mean endless acts started, over continued runs. */
  meanActs: number;
  maxActs: number;
}

export interface PieceBuyRate {
  id: string;
  pool: Pool;
  rarity: Rarity;
  offered: number;
  bought: number;
  /** bought / offered, or null when never offered. */
  rate: number | null;
}

export interface RareCard {
  id: string;
  runs: number;
  pct: number;
}

export interface SeatStats {
  seat: Seat;
  runs: number;
  medianDays: number;
  winRate: number;
  medianScore: number;
  kinds: KindCount[];
}

export interface CardStat {
  id: string;
  /** Times the card was presented (a `once: false` card can exceed the run count). */
  seen: number;
  /** Runs in which the card was seen at least once. */
  seenRuns: number;
  seenPct: number;
  left: number;
  right: number;
  timeouts: number;
  buried: number;
  /** Share of played (non-buried) cards resolved on the left, in %. */
  leftPct: number;
  /** Mean applied escalation delta per play. */
  avgEscalation: number;
  /** Mean leverage scored per play. */
  avgLeverage: number;
  /** Mean L1 change across the five visible meters per play (roll outcomes included). */
  swing: number;
  /** Mean L1 distance between the two previews (+6 per hidden-cost difference, +5 when only one side rolls). */
  gap: number;
  /** swing + gap: how much the card matters. Low = weak candidate. */
  impact: number;
}

export interface PolicyReport {
  policy: string;
  runs: number;
  days: Percentiles;
  score: Percentiles;
  estMinutes: Percentiles;
  endings: EndingCount[];
  kinds: KindCount[];
  /** How runs finally stopped, continuation included. */
  finalKinds: KindCount[];
  topEnding: string | null;
  /** Largest single-ending share, in %. */
  topEndingShare: number;
  acts: ActCount[];
  avgCards: number;
  timeouts: number;
  timedCards: number;
  timerExpiryRate: number | null;
  rolls: number;
  nearMisses: number;
  nearMissRate: number | null;
  avgPeakEscalation: number;
  avgBestChoice: number;
  falseAlarmsPerRun: number;
  winRate: number;
  standdownRate: number;
  nuclearRate: number;
  /** Runs that hit the step cap without ending. */
  capped: number;
  brokeGame: { runs: number; pct: number; threshold: number };
  accidents: AccidentStats;
  antes: AnteActStat[];
  capital: CapitalStats;
  orders: OrderStats;
  endless: EndlessStats;
  pieceBuys: PieceBuyRate[];
  /** Offered pieces whose buy rate falls outside 15..60%. */
  piecesOutsideBand: PieceBuyRate[];
  neverSeen: string[];
  /** Cards seen in fewer than 0.5% of runs (but at least once). */
  rare: RareCard[];
  seats: SeatStats[];
  cards: CardStat[];
  weakestCards: CardStat[];
}

export interface ComboStat {
  a: string;
  b: string;
  runs: number;
  winRate: number;
  nuclearRate: number;
  baselineRuns: number;
  baselineWin: number;
  baselineNuclear: number;
  /** Percentage points vs the baseline of runs holding neither piece. */
  deltaWin: number;
  deltaNuclear: number;
}

export interface ComboAnalysis {
  policy: string;
  minRuns: number;
  pairsAnalysed: number;
  /** Pairs with |Δ win| ≥ 10 percentage points. */
  measurablyDifferent: number;
  top: ComboStat[];
}

export interface PieceProfile {
  id: string;
  pool: Pool;
  rarity: Rarity;
  offered: number;
  bought: number;
  buyRate: number | null;
  heldRuns: number;
  /** Runs won while holding the piece at the end. */
  wins: number;
  /** Share of all winning builds that hold the piece, in %. */
  shareOfWins: number;
  /** Total-variation distance (pp) between the ending-kind mix with and without the piece. */
  profileDelta: number;
  deltaWin: number;
  deltaNuclear: number;
}

export interface ArchetypeStat {
  id: string;
  name: string;
  style: string;
  /** Heuristic runs that had the archetype assembled (≥ 2 core) when act 3 began. */
  runs: number;
  reachedEndgame: number;
  reachedPct: number;
  won: number;
  wonPct: number;
  medianScore: number;
  /** Runs holding the archetype at the end. */
  finalRuns: number;
}

export type TargetStatus = 'PASS' | 'FAIL' | 'N/A';

export interface Target {
  id: string;
  label: string;
  status: TargetStatus;
  value: string;
  detail?: string;
}

export interface Report {
  meta: {
    runsPerPolicy: number;
    seedBase: string;
    difficulty: number;
    mode: Mode;
    seats: Seat[];
    policies: string[];
    actNames: string[];
    /** Last authored act's target × difficulty target scale. */
    finalTarget: number;
    brokeGameThreshold: number;
    content: { cards: number; pieces: number; orders: number; archetypes: number; endings: number; flashpoints: number };
  };
  /** One entry per policy plus 'all'. */
  policies: Record<string, PolicyReport>;
  policyOrder: string[];
  combos: ComboAnalysis | null;
  /** Heuristic when run, otherwise all policies. */
  pieceProfiles: PieceProfile[];
  weakestPieces: PieceProfile[];
  /** Archetype table (heuristic), or null when the heuristic policy was not run. */
  archetypes: ArchetypeStat[] | null;
  /** Heuristic win rate in %, or null when the heuristic policy was not run. */
  winRate: number | null;
  targets: Target[];
}

export const PICK_BAND: readonly [number, number] = [15, 60];
export const COMBO_MIN_RUNS = 40;
export const COMBO_DELTA_PP = 10;
export const RARE_PCT = 0.5;
export const WIN_BAND: readonly [number, number] = [5, 12];
export const ARCHETYPES_REQUIRED = 10;
export const ARCHETYPE_REACH_PCT = 10;
export const ARCHETYPE_MIN_RUNS = 20;
export const PIECE_SHARE_MAX = 35;
export const PACE_BAND: readonly [number, number] = [15, 25];
/** The night (simple ruleset): the calm bot should reach dawn about half the time, the random bot rarely. */
export const NIGHT_DAWN_BAND: readonly [number, number] = [45, 65];
export const NIGHT_RANDOM_DAWN_MAX = 10;
/** A night is two to four minutes: ~7 s per two-sentence card, 4 s per roll. */
export const NIGHT_PACE_BAND: readonly [number, number] = [2, 4];
export const NIGHT_SECONDS_PER_CARD = 7;
export const NIGHT_TOP_ENDING_MAX = 35;
/** Share of the calm bot's nights that reach the crisis and do not come out: a real test, not a coin flip. */
export const NIGHT_CRISIS_BAND: readonly [number, number] = [25, 45];
export const BROKE_GAME_MULT = 100;
export const BROKE_GAME_PCT = 3;

// ------------------------------------------------------------------ accumulation

interface CardAcc {
  seen: number;
  seenRuns: number;
  left: number;
  right: number;
  timeouts: number;
  buried: number;
  escSum: number;
  levSum: number;
  swingSum: number;
  gapSum: number;
}

interface SeatAcc {
  runs: number;
  days: number[];
  scores: number[];
  won: number;
  kinds: Record<EndingKind, number>;
}

interface ArchAcc {
  runs: number;
  reached: number;
  won: number;
  scores: number[];
}

interface RunRecord {
  pieces: string[];
  kind: EndingKind;
  won: boolean;
}

interface AnteAcc {
  met: number;
  missed: number;
  smashed: number;
}

function zeroKinds(): Record<EndingKind, number> {
  return { nuclear: 0, removed: 0, standdown: 0, survival: 0, special: 0 };
}

function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

class Group {
  runs = 0;
  days: number[] = [];
  scores: number[] = [];
  minutes: number[] = [];
  cardsTotal = 0;
  endings = new Map<string, number>();
  kinds = zeroKinds();
  finalKinds = zeroKinds();
  acts = new Map<number, number>();
  timeouts = 0;
  timedCards = 0;
  rolls = 0;
  nearMisses = 0;
  falseAlarms = 0;
  peakEscSum = 0;
  bestChoiceSum = 0;
  won = 0;
  capped = 0;
  broke = 0;
  continued = 0;
  endlessActsSum = 0;
  endlessActsMax = 0;
  accAttached = 0;
  accFired = 0;
  accSurvived = 0;
  accEscalation = 0;
  antes = new Map<number, AnteAcc>();
  capitalEarned = 0;
  capitalSpent = 0;
  shops = 0;
  rerolls = 0;
  tagsRemoved = 0;
  offered = new Map<string, number>();
  bought = new Map<string, number>();
  sold = new Map<string, number>();
  ordersOffered = new Map<string, number>();
  ordersBought = new Map<string, number>();
  ordersUsed = new Map<string, number>();
  seenRuns = new Map<string, number>();
  seats = new Map<Seat, SeatAcc>();
  archetypesByAct3 = new Map<string, ArchAcc>();
  archetypesFinal = new Map<string, number>();
  records: RunRecord[] = [];
  cards = new Map<string, CardAcc>();

  constructor(
    readonly policy: string,
    readonly lastAct: number,
    readonly brokeThreshold: number,
  ) {}

  card(id: string): CardAcc {
    let c = this.cards.get(id);
    if (!c) {
      c = { seen: 0, seenRuns: 0, left: 0, right: 0, timeouts: 0, buried: 0, escSum: 0, levSum: 0, swingSum: 0, gapSum: 0 };
      this.cards.set(id, c);
    }
    return c;
  }

  observe(v: CardView, decision: Decision, applied: Effects | null, leverage: number): void {
    const c = this.card(v.id);
    c.seen++;
    if (decision === 'bury') {
      c.buried++;
      return;
    }
    if (decision === 'timeout') {
      c.timeouts++;
      if (v.timeout === 'left') c.left++;
      else c.right++;
    } else if (decision === 'left') c.left++;
    else c.right++;
    c.levSum += leverage;
    if (applied) {
      c.escSum += applied.escalation ?? 0;
      let swing = 0;
      for (const k of METERS) {
        const d = applied[k];
        if (d) swing += d < 0 ? -d : d;
      }
      c.swingSum += swing;
    }
    let gap = 0;
    for (const k of METERS) {
      const d = (v.left.preview[k] ?? 0) - (v.right.preview[k] ?? 0);
      gap += d < 0 ? -d : d;
    }
    const hiddenDiff = v.left.hiddenCosts.length - v.right.hiddenCosts.length;
    gap += 6 * (hiddenDiff < 0 ? -hiddenDiff : hiddenDiff);
    if (!!v.left.odds !== !!v.right.odds) gap += 5;
    c.gapSum += gap;
  }

  ingest(s: RunSummary): void {
    this.runs++;
    this.days.push(s.days);
    this.scores.push(s.score);
    this.minutes.push(s.estMinutes);
    this.cardsTotal += s.cards;
    bump(this.endings, s.ending);
    this.kinds[s.kind]++;
    this.finalKinds[s.finalKind]++;
    this.acts.set(s.act, (this.acts.get(s.act) ?? 0) + 1);
    this.timeouts += s.timeouts;
    this.timedCards += s.timedCards;
    this.rolls += s.rolls;
    this.nearMisses += s.nearMisses;
    this.falseAlarms += s.falseAlarms;
    this.peakEscSum += s.peakEscalation;
    this.bestChoiceSum += s.bestChoice;
    if (s.won) this.won++;
    if (s.capped) this.capped++;
    if (s.score >= this.brokeThreshold) this.broke++;
    if (s.endless) {
      this.continued++;
      this.endlessActsSum += s.endlessActs;
      if (s.endlessActs > this.endlessActsMax) this.endlessActsMax = s.endlessActs;
    }
    this.accAttached += s.accidentsAttached;
    this.accFired += s.accidents;
    this.accSurvived += s.accidentsSurvived;
    this.accEscalation += s.accidentEscalation;
    for (const a of s.antes) {
      let acc = this.antes.get(a.act);
      if (!acc) {
        acc = { met: 0, missed: 0, smashed: 0 };
        this.antes.set(a.act, acc);
      }
      if (a.result === 'missed') acc.missed++;
      else {
        acc.met++;
        if (a.result === 'smashed') acc.smashed++;
      }
    }
    this.capitalEarned += s.capitalEarned;
    this.capitalSpent += s.capitalSpent;
    this.shops += s.shops;
    this.rerolls += s.rerolls;
    this.tagsRemoved += s.tagsRemoved;
    for (const id of s.offered) bump(this.offered, id);
    for (const id of s.bought) bump(this.bought, id);
    for (const id of s.sold) bump(this.sold, id);
    for (const id of s.ordersOffered) bump(this.ordersOffered, id);
    for (const id of s.ordersBought) bump(this.ordersBought, id);
    for (const id of s.ordersUsed) bump(this.ordersUsed, id);
    for (const id of s.seen) {
      bump(this.seenRuns, id);
      this.card(id).seenRuns++;
    }
    let seat = this.seats.get(s.seat);
    if (!seat) {
      seat = { runs: 0, days: [], scores: [], won: 0, kinds: zeroKinds() };
      this.seats.set(s.seat, seat);
    }
    seat.runs++;
    seat.days.push(s.days);
    seat.scores.push(s.score);
    if (s.won) seat.won++;
    seat.kinds[s.kind]++;
    if (s.archetypeByAct3) {
      let a = this.archetypesByAct3.get(s.archetypeByAct3);
      if (!a) {
        a = { runs: 0, reached: 0, won: 0, scores: [] };
        this.archetypesByAct3.set(s.archetypeByAct3, a);
      }
      a.runs++;
      if (s.act >= this.lastAct) a.reached++;
      if (s.won) a.won++;
      a.scores.push(s.score);
    }
    if (s.archetype) bump(this.archetypesFinal, s.archetype);
    this.records.push({ pieces: s.pieces, kind: s.kind, won: s.won });
  }
}

// ------------------------------------------------------------------ statistics helpers

function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? round((100 * part) / whole, 2) : 0;
}

function per(total: number, runs: number, places = 2): number {
  return runs > 0 ? round(total / runs, places) : 0;
}

function quantile(sorted: readonly number[], q: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function percentiles(values: readonly number[]): Percentiles {
  const sorted = values.slice().sort((a, b) => a - b);
  let sum = 0;
  for (const v of sorted) sum += v;
  return {
    mean: sorted.length ? round(sum / sorted.length, 2) : 0,
    p10: round(quantile(sorted, 0.1), 2),
    p25: round(quantile(sorted, 0.25), 2),
    median: round(quantile(sorted, 0.5), 2),
    p75: round(quantile(sorted, 0.75), 2),
    p90: round(quantile(sorted, 0.9), 2),
    p99: round(quantile(sorted, 0.99), 2),
    max: sorted.length ? round(sorted[sorted.length - 1], 2) : 0,
  };
}

function kindCounts(kinds: Record<EndingKind, number>, total: number): KindCount[] {
  return KINDS.map((k) => ({ kind: k, count: kinds[k], pct: pct(kinds[k], total) }));
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ------------------------------------------------------------------ report building

function buildPolicyReport(content: Content, g: Group): PolicyReport {
  const runs = g.runs;
  const endings: EndingCount[] = [...g.endings.entries()]
    .map(([id, count]) => ({ id, kind: content.endings[id]?.kind ?? 'special', count, pct: pct(count, runs) }))
    .sort((a, b) => b.count - a.count || byId(a, b));
  const acts: ActCount[] = [...g.acts.entries()].sort((a, b) => a[0] - b[0]).map(([act, count]) => ({ act, count, pct: pct(count, runs) }));

  const pieceBuys: PieceBuyRate[] = content.pieceOrder.map((id) => {
    const offered = g.offered.get(id) ?? 0;
    const bought = g.bought.get(id) ?? 0;
    const p = content.pieces[id];
    return { id, pool: p.pool, rarity: p.rarity, offered, bought, rate: offered > 0 ? round((100 * bought) / offered, 2) : null };
  });
  const piecesOutsideBand = pieceBuys.filter((p) => p.rate !== null && (p.rate < PICK_BAND[0] || p.rate > PICK_BAND[1]));

  const neverSeen: string[] = [];
  const rare: RareCard[] = [];
  for (const id of content.cardOrder) {
    const n = g.seenRuns.get(id) ?? 0;
    if (n === 0) neverSeen.push(id);
    else if (runs > 0 && (100 * n) / runs < RARE_PCT) rare.push({ id, runs: n, pct: pct(n, runs) });
  }

  const seats: SeatStats[] = [...g.seats.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([seat, acc]) => ({
      seat,
      runs: acc.runs,
      medianDays: percentiles(acc.days).median,
      winRate: pct(acc.won, acc.runs),
      medianScore: percentiles(acc.scores).median,
      kinds: kindCounts(acc.kinds, acc.runs),
    }));

  const cards: CardStat[] = [];
  for (const id of content.cardOrder) {
    const c = g.cards.get(id);
    if (!c) continue;
    const played = c.seen - c.buried;
    cards.push({
      id,
      seen: c.seen,
      seenRuns: c.seenRuns,
      seenPct: pct(c.seenRuns, runs),
      left: c.left,
      right: c.right,
      timeouts: c.timeouts,
      buried: c.buried,
      leftPct: played > 0 ? round((100 * c.left) / played, 1) : 0,
      avgEscalation: played > 0 ? round(c.escSum / played, 2) : 0,
      avgLeverage: played > 0 ? round(c.levSum / played, 1) : 0,
      swing: played > 0 ? round(c.swingSum / played, 2) : 0,
      gap: c.seen > 0 ? round(c.gapSum / c.seen, 2) : 0,
      impact: played > 0 ? round(c.swingSum / played + c.gapSum / c.seen, 2) : 0,
    });
  }
  // Weakest: cards that are actually seen (≥ 1% of runs when possible), least impact first.
  const often = cards.filter((c) => c.seenPct >= 1);
  const pool = often.length >= 15 ? often : cards;
  const weakestCards = pool
    .slice()
    .sort((a, b) => a.impact - b.impact || b.seen - a.seen || byId(a, b))
    .slice(0, 15);

  let top: EndingCount | null = null;
  for (const e of endings) if (!top || e.count > top.count) top = e;

  const antes: AnteActStat[] = [...g.antes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([act, a]) => {
      const settled = a.met + a.missed;
      return { act, settled, met: a.met, missed: a.missed, smashed: a.smashed, metPct: pct(a.met, settled), missedPct: pct(a.missed, settled), smashedPct: pct(a.smashed, settled) };
    });

  const byOrder: OrderStat[] = content.orderOrder.map((id) => {
    const offered = g.ordersOffered.get(id) ?? 0;
    const bought = g.ordersBought.get(id) ?? 0;
    const used = g.ordersUsed.get(id) ?? 0;
    return { id, offered, bought, used, buyRate: offered > 0 ? round((100 * bought) / offered, 2) : null, useRate: bought > 0 ? round((100 * used) / bought, 2) : null };
  });
  let piecesBought = 0;
  for (const n of g.bought.values()) piecesBought += n;
  let piecesSold = 0;
  for (const n of g.sold.values()) piecesSold += n;
  let ordersBought = 0;
  for (const n of g.ordersBought.values()) ordersBought += n;
  let ordersUsed = 0;
  for (const n of g.ordersUsed.values()) ordersUsed += n;

  return {
    policy: g.policy,
    runs,
    days: percentiles(g.days),
    score: percentiles(g.scores),
    estMinutes: percentiles(g.minutes),
    endings,
    kinds: kindCounts(g.kinds, runs),
    finalKinds: kindCounts(g.finalKinds, runs),
    topEnding: top ? top.id : null,
    topEndingShare: top ? top.pct : 0,
    acts,
    avgCards: per(g.cardsTotal, runs),
    timeouts: g.timeouts,
    timedCards: g.timedCards,
    timerExpiryRate: g.timedCards > 0 ? round((100 * g.timeouts) / g.timedCards, 2) : null,
    rolls: g.rolls,
    nearMisses: g.nearMisses,
    nearMissRate: g.rolls > 0 ? round((100 * g.nearMisses) / g.rolls, 2) : null,
    avgPeakEscalation: per(g.peakEscSum, runs),
    avgBestChoice: per(g.bestChoiceSum, runs),
    falseAlarmsPerRun: per(g.falseAlarms, runs, 3),
    winRate: pct(g.won, runs),
    standdownRate: pct(g.kinds.standdown, runs),
    nuclearRate: pct(g.kinds.nuclear, runs),
    capped: g.capped,
    brokeGame: { runs: g.broke, pct: pct(g.broke, runs), threshold: g.brokeThreshold },
    accidents: {
      attachedPerRun: per(g.accAttached, runs),
      firedPerRun: per(g.accFired, runs),
      attachRate: pct(g.accAttached, g.cardsTotal),
      fireRate: pct(g.accFired, g.accAttached),
      fatalRate: pct(g.accFired - g.accSurvived, g.accFired),
      meanEscalation: per(g.accEscalation, g.accFired),
    },
    antes,
    capital: {
      earnedPerRun: per(g.capitalEarned, runs),
      spentPerRun: per(g.capitalSpent, runs),
      shopsPerRun: per(g.shops, runs),
      rerollsPerRun: per(g.rerolls, runs),
      tagsRemovedPerRun: per(g.tagsRemoved, runs, 3),
      piecesBoughtPerRun: per(piecesBought, runs),
      piecesSoldPerRun: per(piecesSold, runs, 3),
    },
    orders: { boughtPerRun: per(ordersBought, runs), usedPerRun: per(ordersUsed, runs), byOrder },
    endless: { continued: g.continued, continuedPct: pct(g.continued, runs), meanActs: per(g.endlessActsSum, g.continued), maxActs: g.endlessActsMax },
    pieceBuys,
    piecesOutsideBand,
    neverSeen,
    rare,
    seats,
    cards,
    weakestCards,
  };
}

interface PieceAcc {
  runs: number;
  won: number;
  kinds: Record<EndingKind, number>;
}

function pieceAccs(g: Group): Map<string, PieceAcc> {
  const per = new Map<string, PieceAcc>();
  for (const r of g.records) {
    for (const id of r.pieces) {
      let a = per.get(id);
      if (!a) {
        a = { runs: 0, won: 0, kinds: zeroKinds() };
        per.set(id, a);
      }
      a.runs++;
      if (r.won) a.won++;
      a.kinds[r.kind]++;
    }
  }
  return per;
}

function buildCombos(g: Group): ComboAnalysis {
  const N = g.runs;
  const WON = g.won;
  const NUC = g.kinds.nuclear;
  const per = pieceAccs(g);
  const pairs = new Map<string, { a: string; b: string; n: number; won: number; nuc: number }>();
  for (const r of g.records) {
    if (r.pieces.length < 2) continue;
    const ps = r.pieces.slice().sort();
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        if (ps[i] === ps[j]) continue;
        const key = `${ps[i]}|${ps[j]}`;
        let p = pairs.get(key);
        if (!p) {
          p = { a: ps[i], b: ps[j], n: 0, won: 0, nuc: 0 };
          pairs.set(key, p);
        }
        p.n++;
        if (r.won) p.won++;
        if (r.kind === 'nuclear') p.nuc++;
      }
    }
  }
  const stats: ComboStat[] = [];
  for (const p of pairs.values()) {
    if (p.n < COMBO_MIN_RUNS) continue;
    const A = per.get(p.a)!;
    const B = per.get(p.b)!;
    const neitherRuns = N - (A.runs + B.runs - p.n);
    const neitherWon = WON - (A.won + B.won - p.won);
    const neitherNuc = NUC - (A.kinds.nuclear + B.kinds.nuclear - p.nuc);
    const winRate = (100 * p.won) / p.n;
    const nucRate = (100 * p.nuc) / p.n;
    const baseWin = neitherRuns > 0 ? (100 * neitherWon) / neitherRuns : 0;
    const baseNuc = neitherRuns > 0 ? (100 * neitherNuc) / neitherRuns : 0;
    stats.push({
      a: p.a,
      b: p.b,
      runs: p.n,
      winRate: round(winRate, 2),
      nuclearRate: round(nucRate, 2),
      baselineRuns: neitherRuns,
      baselineWin: round(baseWin, 2),
      baselineNuclear: round(baseNuc, 2),
      deltaWin: round(winRate - baseWin, 2),
      deltaNuclear: round(nucRate - baseNuc, 2),
    });
  }
  stats.sort((x, y) => Math.abs(y.deltaWin) - Math.abs(x.deltaWin) || Math.abs(y.deltaNuclear) - Math.abs(x.deltaNuclear) || (x.a + x.b < y.a + y.b ? -1 : 1));
  return {
    policy: g.policy,
    minRuns: COMBO_MIN_RUNS,
    pairsAnalysed: stats.length,
    measurablyDifferent: stats.filter((s) => Math.abs(s.deltaWin) >= COMBO_DELTA_PP).length,
    top: stats.slice(0, 20),
  };
}

function buildPieceProfiles(content: Content, g: Group): PieceProfile[] {
  const per = pieceAccs(g);
  const N = g.runs;
  const out: PieceProfile[] = [];
  for (const id of content.pieceOrder) {
    const a = per.get(id) ?? { runs: 0, won: 0, kinds: zeroKinds() };
    const offered = g.offered.get(id) ?? 0;
    const bought = g.bought.get(id) ?? 0;
    const without = N - a.runs;
    let tv = 0;
    let dWin = 0;
    let dNuc = 0;
    if (a.runs > 0 && without > 0) {
      for (const k of KINDS) {
        const w = (100 * a.kinds[k]) / a.runs;
        const wo = (100 * (g.kinds[k] - a.kinds[k])) / without;
        tv += Math.abs(w - wo);
        if (k === 'nuclear') dNuc = w - wo;
      }
      tv /= 2;
      dWin = (100 * a.won) / a.runs - (100 * (g.won - a.won)) / without;
    }
    const p = content.pieces[id];
    out.push({
      id,
      pool: p.pool,
      rarity: p.rarity,
      offered,
      bought,
      buyRate: offered > 0 ? round((100 * bought) / offered, 2) : null,
      heldRuns: a.runs,
      wins: a.won,
      shareOfWins: pct(a.won, g.won),
      profileDelta: round(tv, 2),
      deltaWin: round(dWin, 2),
      deltaNuclear: round(dNuc, 2),
    });
  }
  return out;
}

/** Lowest combined rank of buy rate and |Δ win|: pieces nobody wants that change nothing. */
function weakestPieces(profiles: PieceProfile[]): PieceProfile[] {
  const offered = profiles.filter((p) => p.offered > 0);
  if (offered.length === 0) return [];
  const byBuy = offered.slice().sort((a, b) => (a.buyRate ?? 0) - (b.buyRate ?? 0) || byId(a, b));
  const byDelta = offered.slice().sort((a, b) => Math.abs(a.deltaWin) - Math.abs(b.deltaWin) || byId(a, b));
  const rank = new Map<string, number>();
  byBuy.forEach((p, i) => rank.set(p.id, i));
  byDelta.forEach((p, i) => rank.set(p.id, (rank.get(p.id) ?? 0) + i));
  return offered
    .slice()
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0) || (a.buyRate ?? 0) - (b.buyRate ?? 0) || byId(a, b))
    .slice(0, 5);
}

function buildArchetypes(content: Content, g: Group): ArchetypeStat[] {
  const out: ArchetypeStat[] = [];
  for (const id of Object.keys(content.archetypes)) {
    const def = content.archetypes[id];
    const a = g.archetypesByAct3.get(id) ?? { runs: 0, reached: 0, won: 0, scores: [] };
    out.push({
      id,
      name: def.name,
      style: def.style,
      runs: a.runs,
      reachedEndgame: a.reached,
      reachedPct: pct(a.reached, a.runs),
      won: a.won,
      wonPct: pct(a.won, a.runs),
      medianScore: percentiles(a.scores).median,
      finalRuns: g.archetypesFinal.get(id) ?? 0,
    });
  }
  return out.sort((a, b) => b.runs - a.runs || byId(a, b));
}

/** The night's targets (N1–N5) for the simple ruleset; see BALANCE.md "The night". */
function buildNightTargets(report: Omit<Report, 'targets'>): Target[] {
  const h = report.policies.heuristic;
  const r = report.policies.random;
  const targets: Target[] = [];
  const na = (id: string, label: string, detail = 'heuristic policy not run'): Target => ({ id, label, status: 'N/A', value: '—', detail });
  const kindPct = (p: PolicyReport, kind: string) => p.kinds.find((k) => k.kind === kind)?.pct ?? 0;

  const n1 = `N1 Calm (heuristic) bot reaches dawn ${NIGHT_DAWN_BAND[0]}–${NIGHT_DAWN_BAND[1]}% of nights`;
  if (!h) targets.push(na('dawn_rate', n1));
  else
    targets.push({
      id: 'dawn_rate',
      label: n1,
      status: h.winRate >= NIGHT_DAWN_BAND[0] && h.winRate <= NIGHT_DAWN_BAND[1] ? 'PASS' : 'FAIL',
      value: `${h.winRate}%`,
      detail: `${kindPct(h, 'standdown')}% stand-down, ${kindPct(h, 'survival')}% survival; fell: ${kindPct(h, 'removed')}% removed, ${kindPct(h, 'nuclear')}% nuclear`,
    });

  const n2 = `N2 Random bot reaches dawn in fewer than ${NIGHT_RANDOM_DAWN_MAX}% of nights`;
  if (!r) targets.push(na('random_dawn', n2, 'random policy not run'));
  else targets.push({ id: 'random_dawn', label: n2, status: r.winRate < NIGHT_RANDOM_DAWN_MAX ? 'PASS' : 'FAIL', value: `${r.winRate}%`, detail: `${kindPct(r, 'removed')}% removed, ${kindPct(r, 'nuclear')}% nuclear` });

  const n3 = `N3 Calm bot's average night ${NIGHT_PACE_BAND[0]}–${NIGHT_PACE_BAND[1]} minutes (${NIGHT_SECONDS_PER_CARD} s per card, 4 s per roll)`;
  if (!h) targets.push(na('night_pace', n3));
  else {
    const rollsPerNight = h.runs ? h.rolls / h.runs : 0;
    const mins = (h.avgCards * NIGHT_SECONDS_PER_CARD + rollsPerNight * 4) / 60;
    targets.push({ id: 'night_pace', label: n3, status: mins >= NIGHT_PACE_BAND[0] && mins <= NIGHT_PACE_BAND[1] ? 'PASS' : 'FAIL', value: `${mins.toFixed(1)} min`, detail: `${h.avgCards} cards and ${rollsPerNight.toFixed(1)} rolls per night` });
  }

  const n4 = `N4 No single ending in more than ${NIGHT_TOP_ENDING_MAX}% of the calm bot's nights`;
  if (!h) targets.push(na('night_variety', n4));
  else targets.push({ id: 'night_variety', label: n4, status: h.topEndingShare <= NIGHT_TOP_ENDING_MAX ? 'PASS' : 'FAIL', value: `${h.topEnding ?? '—'} ${h.topEndingShare}%`, detail: `${h.endings.length} distinct endings` });

  const n5 = `N5 The crisis ends ${NIGHT_CRISIS_BAND[0]}–${NIGHT_CRISIS_BAND[1]}% of the calm bot's nights that reach it`;
  if (!h) targets.push(na('crisis_share', n5));
  else {
    const lastAct = h.acts.reduce((m, a) => Math.max(m, a.act), 0);
    const reached = h.acts.find((a) => a.act === lastAct)?.count ?? 0;
    const dawns = Math.round((h.winRate / 100) * h.runs);
    const crisisFalls = Math.max(0, reached - dawns);
    const share = reached ? Math.round((1000 * crisisFalls) / reached) / 10 : 0;
    const fellBefore = Math.max(0, h.runs - reached);
    targets.push({
      id: 'crisis_share',
      label: n5,
      status: reached === 0 ? 'N/A' : share >= NIGHT_CRISIS_BAND[0] && share <= NIGHT_CRISIS_BAND[1] ? 'PASS' : 'FAIL',
      value: `${share}%`,
      detail: `${reached} of ${h.runs} nights reached the crisis (act ${lastAct}); ${crisisFalls} fell there, ${fellBefore} fell earlier; ended by act: ${h.acts.map((a) => `${a.act}: ${a.pct}%`).join(', ')}`,
    });
  }
  return targets;
}

function buildTargets(report: Omit<Report, 'targets'>): Target[] {
  if (report.meta.mode === 'daily' || report.meta.mode === 'night') return buildNightTargets(report);
  const h = report.policies.heuristic;
  const targets: Target[] = [];
  const na = (id: string, label: string, detail = 'heuristic policy not run'): Target => ({ id, label, status: 'N/A', value: '—', detail });

  const t1 = `T1 Heuristic win rate ${WIN_BAND[0]}–${WIN_BAND[1]}% at DEFCON 5`;
  if (!h) targets.push(na('win_rate', t1));
  else if (report.meta.difficulty !== 5) targets.push(na('win_rate', t1, `measured at DEFCON ${report.meta.difficulty}: ${h.winRate}%`));
  else targets.push({ id: 'win_rate', label: t1, status: h.winRate >= WIN_BAND[0] && h.winRate <= WIN_BAND[1] ? 'PASS' : 'FAIL', value: `${h.winRate}%`, detail: `${h.kinds.find((k) => k.kind === 'standdown')?.pct ?? 0}% stand-down, ${h.kinds.find((k) => k.kind === 'survival')?.pct ?? 0}% survival` });

  const t2 = `T2 ≥ ${ARCHETYPES_REQUIRED} archetypes reach the Endgame ≥ ${ARCHETYPE_REACH_PCT}% of the time (heuristic, assembled by act 3, ≥ ${ARCHETYPE_MIN_RUNS} runs)`;
  if (!report.archetypes) targets.push(na('archetypes_endgame', t2));
  else {
    const qualified = report.archetypes.filter((a) => a.runs >= ARCHETYPE_MIN_RUNS && a.reachedPct >= ARCHETYPE_REACH_PCT);
    const assembled = report.archetypes.filter((a) => a.runs >= ARCHETYPE_MIN_RUNS);
    targets.push({
      id: 'archetypes_endgame',
      label: t2,
      status: qualified.length >= ARCHETYPES_REQUIRED ? 'PASS' : 'FAIL',
      value: `${qualified.length} of ${report.archetypes.length} archetypes`,
      detail: `${assembled.length} assembled in ≥ ${ARCHETYPE_MIN_RUNS} runs${qualified.length ? `: ${qualified.map((a) => `${a.id} ${a.reachedPct}%`).join(', ')}` : ''}`,
    });
  }

  const t3 = `T3 No piece in more than ${PIECE_SHARE_MAX}% of winning builds (heuristic)`;
  if (!h) targets.push(na('piece_share', t3));
  else if (h.winRate === 0 || report.pieceProfiles.every((p) => p.wins === 0)) targets.push(na('piece_share', t3, 'no winning runs to measure'));
  else {
    const over = report.pieceProfiles.filter((p) => p.shareOfWins > PIECE_SHARE_MAX).sort((a, b) => b.shareOfWins - a.shareOfWins);
    const top = report.pieceProfiles.slice().sort((a, b) => b.shareOfWins - a.shareOfWins)[0];
    targets.push({
      id: 'piece_share',
      label: t3,
      status: over.length === 0 ? 'PASS' : 'FAIL',
      value: `${over.length} over; top ${top ? `${top.id} ${top.shareOfWins}%` : '—'}`,
      detail: over.length ? over.slice(0, 8).map((p) => `${p.id} ${p.shareOfWins}%`).join(', ') : undefined,
    });
  }

  const t4 = `T4 Heuristic median estimated minutes ${PACE_BAND[0]}–${PACE_BAND[1]}`;
  if (!h) targets.push(na('pace', t4));
  else {
    const med = h.estMinutes.median;
    targets.push({ id: 'pace', label: t4, status: med >= PACE_BAND[0] && med <= PACE_BAND[1] ? 'PASS' : 'FAIL', value: `${med} min`, detail: `p10 ${h.estMinutes.p10}, p90 ${h.estMinutes.p90}; ${h.avgCards} cards and ${h.capital.shopsPerRun} shops per run` });
  }

  const t5 = `T5 ≥ ${BROKE_GAME_PCT}% of heuristic runs score ≥ ${BROKE_GAME_MULT} × the final target ("broke the game")`;
  if (!h) targets.push(na('broke_game', t5));
  else
    targets.push({
      id: 'broke_game',
      label: t5,
      status: h.brokeGame.pct >= BROKE_GAME_PCT ? 'PASS' : 'FAIL',
      value: `${h.brokeGame.pct}% (${h.brokeGame.runs} runs ≥ ${h.brokeGame.threshold})`,
      detail: `score median ${h.score.median}, p90 ${h.score.p90}, p99 ${h.score.p99}, max ${h.score.max}`,
    });

  return targets;
}

// ------------------------------------------------------------------ simulate

export interface SimulateOptions {
  /** Runs per policy. */
  runs: number;
  policies: readonly (Policy | string)[];
  /** Seats to rotate through (round-robin by run index), or 'all'. */
  seats?: readonly Seat[] | 'all';
  seedBase: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  mode?: Mode;
  /** Called after every run with the number of runs completed across all policies. */
  onProgress?: (done: number, total: number, policy: string) => void;
}

export const ALL_SEATS: readonly Seat[] = ['republic', 'federation', 'coalition'] as const;

/** The last authored act's leverage target at a difficulty (the "final target"). */
export function finalTarget(content: Content, difficulty: number): number {
  const scale = difficultyDef(content, difficulty).target_scale ?? 1;
  const last = content.acts[content.acts.length - 1];
  return Math.round((last ? last.target : 0) * scale);
}

export function simulate(content: Content, opts: SimulateOptions): Report {
  const policies = opts.policies.map((p) => (typeof p === 'string' ? policyByName(p) : p));
  // "all" means the seats this pack defines (the hotel has one).
  const seats: Seat[] = !opts.seats || opts.seats === 'all' ? (Object.keys(content.seats) as Seat[]) : opts.seats.filter((s) => content.seats[s]);
  if (seats.length === 0) throw new Error('simulate: at least one seat is required');
  if (policies.length === 0) throw new Error('simulate: at least one policy is required');
  const difficulty = opts.difficulty ?? 5;
  const mode = opts.mode ?? 'endless';
  const runs = Math.max(0, Math.floor(opts.runs));
  const total = runs * policies.length;
  const lastAct = content.acts.length;
  const target = finalTarget(content, difficulty);
  const threshold = BROKE_GAME_MULT * target;

  const all = new Group('all', lastAct, threshold);
  const groups: Group[] = [];
  let done = 0;
  for (const policy of policies) {
    const g = new Group(policy.name, lastAct, threshold);
    groups.push(g);
    const observer: RunObserver = {
      onCard(v, decision, applied, leverage) {
        g.observe(v, decision, applied, leverage);
        all.observe(v, decision, applied, leverage);
      },
    };
    for (let i = 0; i < runs; i++) {
      const summary = runOne(content, { seed: `${opts.seedBase}-${i}`, seat: seats[i % seats.length], policy, difficulty, mode, observer });
      g.ingest(summary);
      all.ingest(summary);
      done++;
      if (opts.onProgress) opts.onProgress(done, total, policy.name);
    }
  }

  const reports: Record<string, PolicyReport> = {};
  const order: string[] = [];
  for (const g of groups) {
    reports[g.policy] = buildPolicyReport(content, g);
    order.push(g.policy);
  }
  reports.all = buildPolicyReport(content, all);
  order.push('all');

  const heuristic = groups.find((g) => g.policy === 'heuristic');
  const profileGroup = heuristic ?? all;
  const pieceProfiles = buildPieceProfiles(content, profileGroup);

  const partial: Omit<Report, 'targets'> = {
    meta: {
      runsPerPolicy: runs,
      seedBase: opts.seedBase,
      difficulty,
      mode,
      seats,
      policies: policies.map((p) => p.name),
      actNames: content.acts.map((a) => a.name),
      finalTarget: target,
      brokeGameThreshold: threshold,
      content: {
        cards: content.cardOrder.length,
        pieces: content.pieceOrder.length,
        orders: content.orderOrder.length,
        archetypes: Object.keys(content.archetypes).length,
        endings: content.endingOrder.length,
        flashpoints: Object.keys(content.flashpoints).length,
      },
    },
    policies: reports,
    policyOrder: order,
    combos: heuristic ? buildCombos(heuristic) : null,
    pieceProfiles,
    weakestPieces: weakestPieces(pieceProfiles),
    archetypes: heuristic ? buildArchetypes(content, heuristic) : null,
    winRate: heuristic ? reports.heuristic.winRate : null,
  };
  return { ...partial, targets: buildTargets(partial) };
}

// ------------------------------------------------------------------ markdown

function table(header: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => (v === null || v === undefined ? '—' : String(v));
  const lines = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`];
  for (const r of rows) lines.push(`| ${r.map(cell).join(' | ')} |`);
  return lines.join('\n');
}

function fmtRate(v: number | null, suffix = '%'): string {
  return v === null ? '—' : `${v}${suffix}`;
}

function actName(actNames: readonly string[], act: number): string {
  return actNames[act - 1] ?? `Endless ${act - actNames.length}`;
}

function policySection(actNames: readonly string[], r: PolicyReport): string {
  const out: string[] = [];
  out.push(`## Policy: ${r.policy}`);
  out.push('');
  out.push(`- Runs: **${r.runs}**${r.capped ? ` (${r.capped} hit the step cap without ending)` : ''}`);
  out.push(`- Win rate (run_end ending on the last act): **${r.winRate}%**; stand-down ${r.standdownRate}%; nuclear ${r.nuclearRate}%`);
  out.push(`- Score: median **${r.score.median}**, mean ${r.score.mean}, p90 ${r.score.p90}, p99 ${r.score.p99}, max ${r.score.max}; best single choice ${r.avgBestChoice} on average`);
  out.push(`- Broke the game (score ≥ ${r.brokeGame.threshold}): **${r.brokeGame.pct}%** (${r.brokeGame.runs} runs)`);
  out.push(`- Estimated minutes to the first ending: median **${r.estMinutes.median}**, p10 ${r.estMinutes.p10}, p90 ${r.estMinutes.p90}`);
  out.push(`- Days: median ${r.days.median}, mean ${r.days.mean}, p10 ${r.days.p10}, p90 ${r.days.p90}; cards per run ${r.avgCards}`);
  out.push(`- Endless: ${r.endless.continued} runs continued (${r.endless.continuedPct}%), ${r.endless.meanActs} endless acts on average, max ${r.endless.maxActs}`);
  out.push(`- Timer expiry rate: ${fmtRate(r.timerExpiryRate)} (${r.timeouts} expiries / ${r.timedCards} timed cards)`);
  out.push(`- Near-miss rate: ${fmtRate(r.nearMissRate)} (${r.nearMisses} / ${r.rolls} rolls)`);
  out.push(`- Average peak escalation: ${r.avgPeakEscalation}; false alarms per run: ${r.falseAlarmsPerRun}`);
  out.push(`- Top ending share: **${r.topEndingShare}%**${r.topEnding ? ` (${r.topEnding})` : ''}`);
  out.push('');
  out.push(`### Endings (${r.policy})`);
  out.push('');
  out.push('The first ending reached (a continuation into endless does not change it).');
  out.push('');
  out.push(table(['Ending', 'Kind', 'Runs', '%'], r.endings.map((e) => [e.id, e.kind, e.count, e.pct])));
  out.push('');
  out.push(table(['Kind', 'Runs', '%', 'Final kind runs', 'Final %'], r.kinds.map((k, i) => [k.kind, k.count, k.pct, r.finalKinds[i].count, r.finalKinds[i].pct])));
  out.push('');
  out.push(`### Act reached (${r.policy})`);
  out.push('');
  out.push(table(['Act', 'Name', 'Runs', '%'], r.acts.map((a) => [a.act, actName(actNames, a.act), a.count, a.pct])));
  out.push('');
  out.push(`### Antes per act (${r.policy})`);
  out.push('');
  out.push('Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.');
  out.push('');
  out.push(
    table(
      ['Act', 'Name', 'Settled', 'Met', 'Met %', 'Missed', 'Missed %', 'Smashed', 'Smashed %'],
      r.antes.map((a) => [a.act, actName(actNames, a.act), a.settled, a.met, a.metPct, a.missed, a.missedPct, a.smashed, a.smashedPct]),
    ),
  );
  out.push('');
  out.push(`### Accidents (${r.policy})`);
  out.push('');
  const a = r.accidents;
  out.push(`- Attached to ${a.attachRate}% of cards (${a.attachedPerRun} per run); ${a.fireRate}% of those fired (${a.firedPerRun} per run)`);
  out.push(`- Fatal at once: ${a.fatalRate}% of fired; mean escalation per fired accident: ${a.meanEscalation}`);
  out.push('');
  out.push(`### Capital and orders (${r.policy})`);
  out.push('');
  const c = r.capital;
  out.push(`- Capital earned ${c.earnedPerRun} / spent ${c.spentPerRun} per run; ${c.shopsPerRun} shop visits, ${c.rerollsPerRun} rerolls, ${c.tagsRemovedPerRun} tags removed per run`);
  out.push(`- Pieces bought ${c.piecesBoughtPerRun} / sold ${c.piecesSoldPerRun} per run; orders bought ${r.orders.boughtPerRun} / used ${r.orders.usedPerRun} per run`);
  out.push('');
  out.push(table(['Order', 'Offered', 'Bought', 'Buy rate', 'Used', 'Use rate'], r.orders.byOrder.map((o) => [o.id, o.offered, o.bought, fmtRate(o.buyRate), o.used, fmtRate(o.useRate)])));
  out.push('');
  out.push(`### Score distribution (${r.policy})`);
  out.push('');
  out.push(table(['Mean', 'p10', 'p25', 'Median', 'p75', 'p90', 'p99', 'Max'], [[r.score.mean, r.score.p10, r.score.p25, r.score.median, r.score.p75, r.score.p90, r.score.p99, r.score.max]]));
  out.push('');
  out.push(`### Per seat (${r.policy})`);
  out.push('');
  out.push(
    table(
      ['Seat', 'Runs', 'Win %', 'Median score', 'Median days', ...KINDS.map((k) => `${k} %`)],
      r.seats.map((s) => [s.seat, s.runs, s.winRate, s.medianScore, s.medianDays, ...s.kinds.map((k) => k.pct)]),
    ),
  );
  out.push('');
  out.push(`### Piece buy rates (${r.policy})`);
  out.push('');
  out.push(`Bought / offered per piece (one offer per shop visit that showed it). Band: ${PICK_BAND[0]}–${PICK_BAND[1]}%.`);
  out.push('');
  out.push(
    table(
      ['Piece', 'Pool', 'Rarity', 'Offered', 'Bought', 'Rate', 'In band'],
      r.pieceBuys.map((p) => [p.id, p.pool, p.rarity, p.offered, p.bought, fmtRate(p.rate), p.rate === null ? '—' : p.rate < PICK_BAND[0] || p.rate > PICK_BAND[1] ? 'no' : 'yes']),
    ),
  );
  out.push('');
  out.push(
    r.piecesOutsideBand.length
      ? `Outside band (${r.piecesOutsideBand.length}): ${r.piecesOutsideBand.map((p) => `${p.id} (${p.rate}%)`).join(', ')}`
      : 'All offered pieces are inside the band.',
  );
  out.push('');
  out.push(`### Card coverage (${r.policy})`);
  out.push('');
  out.push(`- Cards never seen: ${r.neverSeen.length}${r.neverSeen.length ? ` — ${r.neverSeen.join(', ')}` : ''}`);
  out.push(`- Rare cards (seen in < ${RARE_PCT}% of runs): ${r.rare.length}${r.rare.length ? ` — ${r.rare.map((c) => `${c.id} (${c.runs})`).join(', ')}` : ''}`);
  out.push('');
  return out.join('\n');
}

function cardTable(r: PolicyReport): string {
  const out: string[] = [];
  out.push(`## Per-card table (${r.policy})`);
  out.push('');
  out.push(
    'Seen = presentations; L% = share of plays resolved left; Δesc = mean applied escalation; lev = mean leverage scored; swing = mean |Δ| over the five meters per play; gap = mean distance between the two previews; impact = swing + gap.',
  );
  out.push('');
  out.push(
    table(
      ['Card', 'Seen', 'Runs %', 'Left', 'Right', 'L%', 'Timeouts', 'Buried', 'Δesc', 'Lev', 'Swing', 'Gap', 'Impact'],
      r.cards.map((c) => [c.id, c.seen, c.seenPct, c.left, c.right, c.leftPct, c.timeouts, c.buried, c.avgEscalation, c.avgLeverage, c.swing, c.gap, c.impact]),
    ),
  );
  out.push('');
  out.push(`## Weakest cards (${r.policy})`);
  out.push('');
  out.push('Lowest impact among cards that are actually seen: tiny effects, near-identical choices, or both. Candidates for a rewrite or a cut.');
  out.push('');
  out.push(
    table(
      ['#', 'Card', 'Seen', 'L%', 'Δesc', 'Lev', 'Swing', 'Gap', 'Impact'],
      r.weakestCards.map((c, i) => [i + 1, c.id, c.seen, c.leftPct, c.avgEscalation, c.avgLeverage, c.swing, c.gap, c.impact]),
    ),
  );
  out.push('');
  return out.join('\n');
}

export function formatReport(report: Report): string {
  const m = report.meta;
  const out: string[] = [];
  out.push('# BRINK balance simulation');
  out.push('');
  out.push(
    `${m.runsPerPolicy} runs per policy × ${m.policies.length} policies (${m.policies.join(', ')}) · seats: ${m.seats.join(', ')} · difficulty DEFCON ${m.difficulty} · mode ${m.mode} · seed base \`${m.seedBase}\``,
  );
  out.push('');
  out.push(
    `Content: ${m.content.cards} cards, ${m.content.pieces} pieces, ${m.content.orders} orders, ${m.content.archetypes} archetypes, ${m.content.endings} endings, ${m.content.flashpoints} flashpoints. Final target ${m.finalTarget}; "broke the game" at score ≥ ${m.brokeGameThreshold}.`,
  );
  out.push('');

  out.push('## Targets');
  out.push('');
  out.push(table(['Status', 'Target', 'Value', 'Detail'], report.targets.map((t) => [t.status, t.label, t.value, t.detail ?? ''])));
  const passed = report.targets.filter((t) => t.status === 'PASS').length;
  const failed = report.targets.filter((t) => t.status === 'FAIL').length;
  out.push('');
  out.push(`**${passed} PASS, ${failed} FAIL, ${report.targets.length - passed - failed} N/A.** Heuristic win rate: ${report.winRate === null ? '—' : `${report.winRate}%`}.`);
  out.push('');

  out.push('## Summary');
  out.push('');
  out.push(
    table(
      ['Policy', 'Runs', 'Win %', 'Nuclear %', 'Median score', 'p99 score', 'Broke game %', 'Median min', 'Cards', 'Antes missed / run', 'Accidents fired / run', 'Timer expiry %', 'Near-miss %'],
      report.policyOrder.map((name) => {
        const r = report.policies[name];
        let missed = 0;
        for (const a of r.antes) missed += a.missed;
        return [
          r.policy,
          r.runs,
          r.winRate,
          r.nuclearRate,
          r.score.median,
          r.score.p99,
          r.brokeGame.pct,
          r.estMinutes.median,
          r.avgCards,
          r.runs > 0 ? round(missed / r.runs, 2) : 0,
          r.accidents.firedPerRun,
          fmtRate(r.timerExpiryRate, ''),
          fmtRate(r.nearMissRate, ''),
        ];
      }),
    ),
  );
  out.push('');

  for (const name of report.policyOrder) out.push(policySection(m.actNames, report.policies[name]));

  const all = report.policies.all;
  out.push('## Cards never seen (all policies)');
  out.push('');
  out.push(all.neverSeen.length ? all.neverSeen.map((id) => `- ${id}`).join('\n') : 'None: every card in the content was reached at least once.');
  out.push('');
  out.push(`### Rare cards (seen in < ${RARE_PCT}% of runs, all policies)`);
  out.push('');
  out.push(all.rare.length ? table(['Card', 'Runs', '%'], all.rare.map((c) => [c.id, c.runs, c.pct])) : 'None.');
  out.push('');

  out.push('## Archetypes (heuristic)');
  out.push('');
  if (report.archetypes) {
    out.push(`Runs in which the archetype (≥ 2 core pieces) was assembled when act 3 began, how often those runs reached the Endgame (act ${m.actNames.length}) and won, and their median score. Final = runs holding the archetype at the end.`);
    out.push('');
    out.push(
      table(
        ['Archetype', 'Style', 'Assembled by act 3', 'Reached Endgame', '%', 'Won', 'Won %', 'Median score', 'Final'],
        report.archetypes.map((a) => [a.id, a.style, a.runs, a.reachedEndgame, a.reachedPct, a.won, a.wonPct, a.medianScore, a.finalRuns]),
      ),
    );
  } else out.push('The heuristic policy was not run; no archetype table.');
  out.push('');

  out.push('## Piece share among winning builds (heuristic)');
  out.push('');
  {
    const wins = report.pieceProfiles.reduce((n, p) => Math.max(n, p.wins), 0);
    const held = report.pieceProfiles.filter((p) => p.wins > 0).sort((a, b) => b.shareOfWins - a.shareOfWins || byId(a, b));
    out.push(wins > 0 ? `Share of winning runs that held each piece at the end (cap ${PIECE_SHARE_MAX}%).` : 'No winning runs.');
    out.push('');
    if (held.length) out.push(table(['Piece', 'Pool', 'Rarity', 'Wins holding it', 'Share of wins', 'Δ win'], held.map((p) => [p.id, p.pool, p.rarity, p.wins, p.shareOfWins, p.deltaWin])));
  }
  out.push('');

  out.push('## Combos (heuristic)');
  out.push('');
  if (report.combos) {
    const c = report.combos;
    out.push(`Pairs of pieces held together in ≥ ${c.minRuns} runs: ${c.pairsAnalysed}. Pairs with |Δ win| ≥ ${COMBO_DELTA_PP}pp vs runs holding neither: **${c.measurablyDifferent}**.`);
    out.push('');
    out.push(
      c.top.length
        ? table(
            ['Piece A', 'Piece B', 'Runs', 'Win %', 'Nuclear %', 'Baseline win %', 'Baseline nuclear %', 'Δ win', 'Δ nuclear'],
            c.top.map((s) => [s.a, s.b, s.runs, s.winRate, s.nuclearRate, s.baselineWin, s.baselineNuclear, s.deltaWin, s.deltaNuclear]),
          )
        : 'No pair reached the minimum run count.',
    );
  } else out.push('The heuristic policy was not run; no combo analysis.');
  out.push('');

  out.push('## Piece ending profiles');
  out.push('');
  out.push('Win rate and ending-kind mix with vs without each piece (heuristic when run, otherwise all policies). Profile Δ is the total-variation distance in percentage points.');
  out.push('');
  out.push(
    table(
      ['Piece', 'Pool', 'Rarity', 'Offered', 'Buy rate', 'Held runs', 'Wins', 'Share of wins', 'Δ win', 'Δ nuclear', 'Profile Δ'],
      report.pieceProfiles.map((p) => [p.id, p.pool, p.rarity, p.offered, fmtRate(p.buyRate), p.heldRuns, p.wins, p.shareOfWins, p.deltaWin, p.deltaNuclear, p.profileDelta]),
    ),
  );
  out.push('');
  out.push('## Weakest pieces');
  out.push('');
  out.push('Lowest combined rank of buy rate and |Δ win|: pieces players do not want, or that do not change whether runs are won.');
  out.push('');
  out.push(
    report.weakestPieces.length
      ? table(['#', 'Piece', 'Pool', 'Rarity', 'Buy rate', 'Held runs', 'Δ win'], report.weakestPieces.map((p, i) => [i + 1, p.id, p.pool, p.rarity, fmtRate(p.buyRate), p.heldRuns, p.deltaWin]))
      : 'No piece was offered.',
  );
  out.push('');

  const cardGroup = report.policies.heuristic ?? all;
  out.push(cardTable(cardGroup));
  return out.join('\n');
}
