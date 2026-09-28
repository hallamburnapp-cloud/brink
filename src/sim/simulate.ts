/**
 * Headless balance simulator: plays whole runs with bot policies and
 * aggregates survival, endings, piece pick rates, card coverage, combo
 * effects and per-card impact into a Report (plain JSON) plus a markdown
 * rendering. Everything is deterministic for a given seed base.
 *
 * Runs are independent and never cloned: each run creates one RunState and
 * mutates it through the engine's public API (createRun / view / choose /
 * buryCard / pickPiece). Aggregation is incremental so 60k runs stay cheap.
 */
import { Rng } from '../engine/rng';
import { buryCard, choose, createRun, pickPiece, view } from '../engine/run';
import { METERS, type CardView, type Content, type Effects, type EndingKind, type MeterKey, type Mode, type Pool, type Seat, type Side } from '../engine/types';
import { policyByName, type Decision, type Policy } from './policies';

// ------------------------------------------------------------------ one run

export interface RunSummary {
  seed: string;
  seat: Seat;
  policy: string;
  ending: string;
  kind: EndingKind;
  days: number;
  act: number;
  cards: number;
  pieces: string[];
  offered: string[];
  timeouts: number;
  timedCards: number;
  rolls: number;
  nearMisses: number;
  seen: string[];
  maxEscalation: number;
  standdown: boolean;
  falseAlarms: number;
}

/** Called once per presented card so the simulator can build the per-card table without keeping histories. */
export interface RunObserver {
  onCard(card: CardView, decision: Decision, applied: Effects | null): void;
}

export interface RunOneOptions {
  seed: string;
  seat: Seat;
  policy: Policy;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  mode?: Mode;
  observer?: RunObserver;
}

/** Hard stop against a content gap that could loop forever. A full run is ~90 cards. */
export const MAX_STEPS = 5000;
export const UNFINISHED = 'unfinished';

const KINDS: readonly EndingKind[] = ['nuclear', 'removed', 'standdown', 'survival', 'special'] as const;

export function runOne(content: Content, opts: RunOneOptions): RunSummary {
  const policy = opts.policy;
  const state = createRun(content, { seed: opts.seed, seat: opts.seat, mode: opts.mode ?? 'endless', difficulty: opts.difficulty, unlocked: 'all' });
  const rng = new Rng(`${opts.seed}|${policy.name}`);
  const observer = opts.observer;
  const offered: string[] = [];
  let timedCards = 0;
  let maxEscalation = state.meters.escalation;

  for (let step = 0; step < MAX_STEPS && state.phase !== 'ended'; step++) {
    if (state.phase === 'offer') {
      const offer = state.offer;
      if (!offer || offer.length === 0) break;
      for (const id of offer) offered.push(id);
      let pick = policy.pickPiece(content, state, offer, rng);
      if (!offer.includes(pick)) pick = offer[0];
      pickPiece(content, state, pick);
      continue;
    }
    const v = view(content, state);
    if (!v) break;
    let decision = policy.choose(content, state, v, rng);
    if (decision === 'bury' && (state.charges.removal <= 0 || v.isFlashpoint)) decision = v.timeout;
    if (decision === 'timeout' && v.timer === null) decision = v.timeout;
    if (decision === 'bury') {
      buryCard(content, state);
      if (observer) observer.onCard(v, 'bury', null);
      continue;
    }
    if (v.timer !== null) timedCards++;
    choose(content, state, decision);
    if (observer) {
      const h = state.history[state.history.length - 1];
      observer.onCard(v, decision, h ? h.applied : null);
    }
    if (state.meters.escalation > maxEscalation) maxEscalation = state.meters.escalation;
  }

  const ending = state.ending ?? UNFINISHED;
  const kind: EndingKind = content.endings[ending]?.kind ?? 'special';
  return {
    seed: opts.seed,
    seat: opts.seat,
    policy: policy.name,
    ending,
    kind,
    days: state.day,
    act: state.act,
    cards: state.cardsPlayed,
    pieces: state.pieces.slice(),
    offered,
    timeouts: state.stats.timeouts,
    timedCards,
    rolls: state.stats.rolls,
    nearMisses: state.stats.nearMisses,
    seen: state.seen.slice(),
    maxEscalation,
    standdown: kind === 'standdown',
    falseAlarms: state.stats.falseAlarms,
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

export interface PiecePickRate {
  id: string;
  pool: Pool;
  offered: number;
  picked: number;
  /** picked / offered, or null when never offered. */
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
  endings: EndingCount[];
  kinds: KindCount[];
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
  avgMaxEscalation: number;
  falseAlarmsPerRun: number;
  standdownRate: number;
  nuclearRate: number;
  piecePicks: PiecePickRate[];
  /** Offered pieces whose pick rate falls outside 15..60%. */
  piecesOutsideBand: PiecePickRate[];
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
  standdownRate: number;
  nuclearRate: number;
  baselineRuns: number;
  baselineStanddown: number;
  baselineNuclear: number;
  /** Percentage points vs the baseline of runs holding neither piece. */
  deltaStanddown: number;
  deltaNuclear: number;
}

export interface ComboAnalysis {
  policy: string;
  minRuns: number;
  pairsAnalysed: number;
  /** Pairs with |Δ stand-down| ≥ 10 percentage points. */
  measurablyDifferent: number;
  top: ComboStat[];
}

export interface PieceProfile {
  id: string;
  pool: Pool;
  offered: number;
  picked: number;
  pickRate: number | null;
  heldRuns: number;
  /** Total-variation distance (pp) between the ending-kind mix with and without the piece. */
  profileDelta: number;
  deltaStanddown: number;
  deltaNuclear: number;
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
    content: { cards: number; pieces: number; endings: number; flashpoints: number };
  };
  /** One entry per policy plus 'all'. */
  policies: Record<string, PolicyReport>;
  policyOrder: string[];
  combos: ComboAnalysis | null;
  pieceProfiles: PieceProfile[];
  weakestPieces: PieceProfile[];
  /** Heuristic stand-down rate in %, or null when the heuristic policy was not run. */
  perfectRunRate: number | null;
  targets: Target[];
}

export const PICK_BAND: readonly [number, number] = [15, 60];
export const COMBO_MIN_RUNS = 40;
export const COMBO_DELTA_PP = 10;
export const RARE_PCT = 0.5;

// ------------------------------------------------------------------ accumulation

interface CardAcc {
  seen: number;
  seenRuns: number;
  left: number;
  right: number;
  timeouts: number;
  buried: number;
  escSum: number;
  swingSum: number;
  gapSum: number;
}

interface SeatAcc {
  runs: number;
  days: number[];
  kinds: Record<EndingKind, number>;
}

interface RunRecord {
  pieces: string[];
  kind: EndingKind;
}

function zeroKinds(): Record<EndingKind, number> {
  return { nuclear: 0, removed: 0, standdown: 0, survival: 0, special: 0 };
}

class Group {
  runs = 0;
  days: number[] = [];
  cardsTotal = 0;
  endings = new Map<string, number>();
  kinds = zeroKinds();
  acts = new Map<number, number>();
  timeouts = 0;
  timedCards = 0;
  rolls = 0;
  nearMisses = 0;
  falseAlarms = 0;
  maxEscSum = 0;
  offered = new Map<string, number>();
  picked = new Map<string, number>();
  seenRuns = new Map<string, number>();
  seats = new Map<Seat, SeatAcc>();
  records: RunRecord[] = [];
  cards = new Map<string, CardAcc>();

  constructor(readonly policy: string) {}

  card(id: string): CardAcc {
    let c = this.cards.get(id);
    if (!c) {
      c = { seen: 0, seenRuns: 0, left: 0, right: 0, timeouts: 0, buried: 0, escSum: 0, swingSum: 0, gapSum: 0 };
      this.cards.set(id, c);
    }
    return c;
  }

  observe(v: CardView, decision: Decision, applied: Effects | null): void {
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
    this.cardsTotal += s.cards;
    this.endings.set(s.ending, (this.endings.get(s.ending) ?? 0) + 1);
    this.kinds[s.kind]++;
    this.acts.set(s.act, (this.acts.get(s.act) ?? 0) + 1);
    this.timeouts += s.timeouts;
    this.timedCards += s.timedCards;
    this.rolls += s.rolls;
    this.nearMisses += s.nearMisses;
    this.falseAlarms += s.falseAlarms;
    this.maxEscSum += s.maxEscalation;
    for (const id of s.offered) this.offered.set(id, (this.offered.get(id) ?? 0) + 1);
    for (const id of s.pieces) this.picked.set(id, (this.picked.get(id) ?? 0) + 1);
    for (const id of s.seen) {
      this.seenRuns.set(id, (this.seenRuns.get(id) ?? 0) + 1);
      this.card(id).seenRuns++;
    }
    let seat = this.seats.get(s.seat);
    if (!seat) {
      seat = { runs: 0, days: [], kinds: zeroKinds() };
      this.seats.set(s.seat, seat);
    }
    seat.runs++;
    seat.days.push(s.days);
    seat.kinds[s.kind]++;
    this.records.push({ pieces: s.pieces, kind: s.kind });
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
  };
}

function kindCounts(kinds: Record<EndingKind, number>, total: number): KindCount[] {
  return KINDS.map((k) => ({ kind: k, count: kinds[k], pct: pct(kinds[k], total) }));
}

// ------------------------------------------------------------------ report building

function buildPolicyReport(content: Content, g: Group): PolicyReport {
  const runs = g.runs;
  const endings: EndingCount[] = [...g.endings.entries()]
    .map(([id, count]) => ({ id, kind: content.endings[id]?.kind ?? 'special', count, pct: pct(count, runs) }))
    .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const acts: ActCount[] = [...g.acts.entries()].sort((a, b) => a[0] - b[0]).map(([act, count]) => ({ act, count, pct: pct(count, runs) }));

  const piecePicks: PiecePickRate[] = content.pieceOrder.map((id) => {
    const offered = g.offered.get(id) ?? 0;
    const picked = g.picked.get(id) ?? 0;
    return { id, pool: content.pieces[id].pool, offered, picked, rate: offered > 0 ? round((100 * picked) / offered, 2) : null };
  });
  const piecesOutsideBand = piecePicks.filter((p) => p.rate !== null && (p.rate < PICK_BAND[0] || p.rate > PICK_BAND[1]));

  const neverSeen: string[] = [];
  const rare: RareCard[] = [];
  for (const id of content.cardOrder) {
    const n = g.seenRuns.get(id) ?? 0;
    if (n === 0) neverSeen.push(id);
    else if (runs > 0 && (100 * n) / runs < RARE_PCT) rare.push({ id, runs: n, pct: pct(n, runs) });
  }

  const seats: SeatStats[] = [...g.seats.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([seat, acc]) => ({ seat, runs: acc.runs, medianDays: percentiles(acc.days).median, kinds: kindCounts(acc.kinds, acc.runs) }));

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
    .sort((a, b) => a.impact - b.impact || b.seen - a.seen || (a.id < b.id ? -1 : 1))
    .slice(0, 15);

  let top: EndingCount | null = null;
  for (const e of endings) if (!top || e.count > top.count) top = e;

  return {
    policy: g.policy,
    runs,
    days: percentiles(g.days),
    endings,
    kinds: kindCounts(g.kinds, runs),
    topEnding: top ? top.id : null,
    topEndingShare: top ? top.pct : 0,
    acts,
    avgCards: runs > 0 ? round(g.cardsTotal / runs, 2) : 0,
    timeouts: g.timeouts,
    timedCards: g.timedCards,
    timerExpiryRate: g.timedCards > 0 ? round((100 * g.timeouts) / g.timedCards, 2) : null,
    rolls: g.rolls,
    nearMisses: g.nearMisses,
    nearMissRate: g.rolls > 0 ? round((100 * g.nearMisses) / g.rolls, 2) : null,
    avgMaxEscalation: runs > 0 ? round(g.maxEscSum / runs, 2) : 0,
    falseAlarmsPerRun: runs > 0 ? round(g.falseAlarms / runs, 3) : 0,
    standdownRate: pct(g.kinds.standdown, runs),
    nuclearRate: pct(g.kinds.nuclear, runs),
    piecePicks,
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
  kinds: Record<EndingKind, number>;
}

function pieceAccs(g: Group): Map<string, PieceAcc> {
  const per = new Map<string, PieceAcc>();
  for (const r of g.records) {
    for (const id of r.pieces) {
      let a = per.get(id);
      if (!a) {
        a = { runs: 0, kinds: zeroKinds() };
        per.set(id, a);
      }
      a.runs++;
      a.kinds[r.kind]++;
    }
  }
  return per;
}

function buildCombos(g: Group): ComboAnalysis {
  const N = g.runs;
  const SD = g.kinds.standdown;
  const NUC = g.kinds.nuclear;
  const per = pieceAccs(g);
  const pairs = new Map<string, { a: string; b: string; n: number; sd: number; nuc: number }>();
  for (const r of g.records) {
    if (r.pieces.length < 2) continue;
    const ps = r.pieces.slice().sort();
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        if (ps[i] === ps[j]) continue;
        const key = `${ps[i]}|${ps[j]}`;
        let p = pairs.get(key);
        if (!p) {
          p = { a: ps[i], b: ps[j], n: 0, sd: 0, nuc: 0 };
          pairs.set(key, p);
        }
        p.n++;
        if (r.kind === 'standdown') p.sd++;
        else if (r.kind === 'nuclear') p.nuc++;
      }
    }
  }
  const stats: ComboStat[] = [];
  for (const p of pairs.values()) {
    if (p.n < COMBO_MIN_RUNS) continue;
    const A = per.get(p.a)!;
    const B = per.get(p.b)!;
    const neitherRuns = N - (A.runs + B.runs - p.n);
    const neitherSd = SD - (A.kinds.standdown + B.kinds.standdown - p.sd);
    const neitherNuc = NUC - (A.kinds.nuclear + B.kinds.nuclear - p.nuc);
    const sdRate = (100 * p.sd) / p.n;
    const nucRate = (100 * p.nuc) / p.n;
    const baseSd = neitherRuns > 0 ? (100 * neitherSd) / neitherRuns : 0;
    const baseNuc = neitherRuns > 0 ? (100 * neitherNuc) / neitherRuns : 0;
    stats.push({
      a: p.a,
      b: p.b,
      runs: p.n,
      standdownRate: round(sdRate, 2),
      nuclearRate: round(nucRate, 2),
      baselineRuns: neitherRuns,
      baselineStanddown: round(baseSd, 2),
      baselineNuclear: round(baseNuc, 2),
      deltaStanddown: round(sdRate - baseSd, 2),
      deltaNuclear: round(nucRate - baseNuc, 2),
    });
  }
  stats.sort((x, y) => Math.abs(y.deltaStanddown) - Math.abs(x.deltaStanddown) || Math.abs(y.deltaNuclear) - Math.abs(x.deltaNuclear) || (x.a + x.b < y.a + y.b ? -1 : 1));
  return {
    policy: g.policy,
    minRuns: COMBO_MIN_RUNS,
    pairsAnalysed: stats.length,
    measurablyDifferent: stats.filter((s) => Math.abs(s.deltaStanddown) >= COMBO_DELTA_PP).length,
    top: stats.slice(0, 20),
  };
}

function buildPieceProfiles(content: Content, g: Group): PieceProfile[] {
  const per = pieceAccs(g);
  const N = g.runs;
  const out: PieceProfile[] = [];
  for (const id of content.pieceOrder) {
    const a = per.get(id) ?? { runs: 0, kinds: zeroKinds() };
    const offered = g.offered.get(id) ?? 0;
    const picked = g.picked.get(id) ?? 0;
    const without = N - a.runs;
    let tv = 0;
    let dSd = 0;
    let dNuc = 0;
    if (a.runs > 0 && without > 0) {
      for (const k of KINDS) {
        const w = (100 * a.kinds[k]) / a.runs;
        const wo = (100 * (g.kinds[k] - a.kinds[k])) / without;
        tv += Math.abs(w - wo);
        if (k === 'standdown') dSd = w - wo;
        if (k === 'nuclear') dNuc = w - wo;
      }
      tv /= 2;
    }
    out.push({
      id,
      pool: content.pieces[id].pool,
      offered,
      picked,
      pickRate: offered > 0 ? round((100 * picked) / offered, 2) : null,
      heldRuns: a.runs,
      profileDelta: round(tv, 2),
      deltaStanddown: round(dSd, 2),
      deltaNuclear: round(dNuc, 2),
    });
  }
  return out;
}

function weakestPieces(profiles: PieceProfile[]): PieceProfile[] {
  const offered = profiles.filter((p) => p.offered > 0);
  if (offered.length === 0) return [];
  const byPick = offered.slice().sort((a, b) => (a.pickRate ?? 0) - (b.pickRate ?? 0) || (a.id < b.id ? -1 : 1));
  const byDelta = offered.slice().sort((a, b) => a.profileDelta - b.profileDelta || (a.id < b.id ? -1 : 1));
  const rank = new Map<string, number>();
  byPick.forEach((p, i) => rank.set(p.id, i));
  byDelta.forEach((p, i) => rank.set(p.id, (rank.get(p.id) ?? 0) + i));
  return offered
    .slice()
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0) || (a.pickRate ?? 0) - (b.pickRate ?? 0) || (a.id < b.id ? -1 : 1))
    .slice(0, 5);
}

function buildTargets(report: Omit<Report, 'targets'>): Target[] {
  const h = report.policies.heuristic;
  const all = report.policies.all;
  const targets: Target[] = [];
  const na = (id: string, label: string): Target => ({ id, label, status: 'N/A', value: '—', detail: 'heuristic policy not run' });

  if (h) {
    const med = h.days.median;
    targets.push({ id: 'median_days', label: 'Heuristic median survival 28–45 days', status: med >= 28 && med <= 45 ? 'PASS' : 'FAIL', value: `${med} days` });
    targets.push({
      id: 'ending_share',
      label: 'No single ending above 30% (heuristic)',
      status: h.topEndingShare <= 30 ? 'PASS' : 'FAIL',
      value: `${h.topEndingShare}%`,
      detail: h.topEnding ? `top: ${h.topEnding}` : undefined,
    });
  } else {
    targets.push(na('median_days', 'Heuristic median survival 28–45 days'));
    targets.push(na('ending_share', 'No single ending above 30% (heuristic)'));
  }

  targets.push({
    id: 'reachable',
    label: 'Every card reachable (never-seen list empty, all policies)',
    status: all.neverSeen.length === 0 ? 'PASS' : 'FAIL',
    value: `${all.neverSeen.length} never seen`,
    detail: all.neverSeen.length ? all.neverSeen.slice(0, 12).join(', ') + (all.neverSeen.length > 12 ? ', …' : '') : undefined,
  });

  if (h) {
    const offered = h.piecePicks.filter((p) => p.offered > 0);
    targets.push({
      id: 'pick_band',
      label: 'Every offered piece picked 15–60% of the time (heuristic)',
      status: offered.length > 0 && h.piecesOutsideBand.length === 0 ? 'PASS' : 'FAIL',
      value: `${h.piecesOutsideBand.length} of ${offered.length} outside band`,
      detail: h.piecesOutsideBand.length ? h.piecesOutsideBand.slice(0, 12).map((p) => `${p.id} ${p.rate}%`).join(', ') : undefined,
    });
  } else targets.push(na('pick_band', 'Every offered piece picked 15–60% of the time (heuristic)'));

  if (report.combos) {
    targets.push({
      id: 'combos',
      label: `≥ 12 piece pairs with |Δ stand-down| ≥ ${COMBO_DELTA_PP}pp (heuristic, ≥ ${COMBO_MIN_RUNS} runs each)`,
      status: report.combos.measurablyDifferent >= 12 ? 'PASS' : 'FAIL',
      value: `${report.combos.measurablyDifferent} of ${report.combos.pairsAnalysed} pairs`,
    });
  } else targets.push(na('combos', `≥ 12 piece pairs with |Δ stand-down| ≥ ${COMBO_DELTA_PP}pp (heuristic)`));

  if (h) {
    const r = h.standdownRate;
    targets.push({ id: 'perfect_run', label: 'Heuristic stand-down (perfect run) rate > 0% and < 8%', status: r > 0 && r < 8 ? 'PASS' : 'FAIL', value: `${r}%` });
  } else targets.push(na('perfect_run', 'Heuristic stand-down (perfect run) rate > 0% and < 8%'));

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

export function simulate(content: Content, opts: SimulateOptions): Report {
  const policies = opts.policies.map((p) => (typeof p === 'string' ? policyByName(p) : p));
  const seats: Seat[] = !opts.seats || opts.seats === 'all' ? ALL_SEATS.slice() : opts.seats.slice();
  if (seats.length === 0) throw new Error('simulate: at least one seat is required');
  if (policies.length === 0) throw new Error('simulate: at least one policy is required');
  const difficulty = opts.difficulty ?? 5;
  const mode = opts.mode ?? 'endless';
  const runs = Math.max(0, Math.floor(opts.runs));
  const total = runs * policies.length;

  const all = new Group('all');
  const groups: Group[] = [];
  let done = 0;
  for (const policy of policies) {
    const g = new Group(policy.name);
    groups.push(g);
    const observer: RunObserver = {
      onCard(v, decision, applied) {
        g.observe(v, decision, applied);
        all.observe(v, decision, applied);
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
      content: {
        cards: content.cardOrder.length,
        pieces: content.pieceOrder.length,
        endings: content.endingOrder.length,
        flashpoints: Object.keys(content.flashpoints).length,
      },
    },
    policies: reports,
    policyOrder: order,
    combos: heuristic ? buildCombos(heuristic) : null,
    pieceProfiles,
    weakestPieces: weakestPieces(pieceProfiles),
    perfectRunRate: heuristic ? reports.heuristic.standdownRate : null,
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

function policySection(actNames: readonly string[], r: PolicyReport): string {
  const out: string[] = [];
  out.push(`## Policy: ${r.policy}`);
  out.push('');
  out.push(`- Runs: **${r.runs}**`);
  out.push(`- Survival days: median **${r.days.median}**, mean ${r.days.mean}, p10 ${r.days.p10}, p25 ${r.days.p25}, p75 ${r.days.p75}, p90 ${r.days.p90}`);
  out.push(`- Cards per run: ${r.avgCards}`);
  out.push(`- Timer expiry rate: ${fmtRate(r.timerExpiryRate)} (${r.timeouts} expiries / ${r.timedCards} timed cards)`);
  out.push(`- Near-miss rate: ${fmtRate(r.nearMissRate)} (${r.nearMisses} / ${r.rolls} rolls)`);
  out.push(`- Average peak escalation: ${r.avgMaxEscalation}; false alarms per run: ${r.falseAlarmsPerRun}`);
  out.push(`- Stand-down rate: **${r.standdownRate}%**; nuclear rate: **${r.nuclearRate}%**`);
  out.push(`- Top ending share: **${r.topEndingShare}%**${r.topEnding ? ` (${r.topEnding})` : ''}`);
  out.push('');
  out.push(`### Endings (${r.policy})`);
  out.push('');
  out.push(table(['Ending', 'Kind', 'Runs', '%'], r.endings.map((e) => [e.id, e.kind, e.count, e.pct])));
  out.push('');
  out.push(table(['Kind', 'Runs', '%'], r.kinds.map((k) => [k.kind, k.count, k.pct])));
  out.push('');
  out.push(`### Act reached (${r.policy})`);
  out.push('');
  out.push(table(['Act', 'Name', 'Runs', '%'], r.acts.map((a) => [a.act, actNames[a.act - 1] ?? '', a.count, a.pct])));
  out.push('');
  out.push(`### Per seat (${r.policy})`);
  out.push('');
  out.push(
    table(
      ['Seat', 'Runs', 'Median days', ...KINDS.map((k) => `${k} %`)],
      r.seats.map((s) => [s.seat, s.runs, s.medianDays, ...s.kinds.map((k) => k.pct)]),
    ),
  );
  out.push('');
  out.push(`### Piece pick rates (${r.policy})`);
  out.push('');
  out.push(`Picked / offered per piece. Band: ${PICK_BAND[0]}–${PICK_BAND[1]}%.`);
  out.push('');
  out.push(
    table(
      ['Piece', 'Pool', 'Offered', 'Picked', 'Rate', 'In band'],
      r.piecePicks.map((p) => [p.id, p.pool, p.offered, p.picked, fmtRate(p.rate), p.rate === null ? '—' : p.rate < PICK_BAND[0] || p.rate > PICK_BAND[1] ? 'no' : 'yes']),
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
  out.push('Seen = presentations; L% = share of plays resolved left; Δesc = mean applied escalation; swing = mean |Δ| over the five meters per play; gap = mean distance between the two previews; impact = swing + gap.');
  out.push('');
  out.push(
    table(
      ['Card', 'Seen', 'Runs %', 'Left', 'Right', 'L%', 'Timeouts', 'Buried', 'Δesc', 'Swing', 'Gap', 'Impact'],
      r.cards.map((c) => [c.id, c.seen, c.seenPct, c.left, c.right, c.leftPct, c.timeouts, c.buried, c.avgEscalation, c.swing, c.gap, c.impact]),
    ),
  );
  out.push('');
  out.push(`## Weakest cards (${r.policy})`);
  out.push('');
  out.push('Lowest impact among cards that are actually seen: tiny effects, near-identical choices, or both. Candidates for a rewrite or a cut.');
  out.push('');
  out.push(
    table(
      ['#', 'Card', 'Seen', 'L%', 'Δesc', 'Swing', 'Gap', 'Impact'],
      r.weakestCards.map((c, i) => [i + 1, c.id, c.seen, c.leftPct, c.avgEscalation, c.swing, c.gap, c.impact]),
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
  out.push(`Content: ${m.content.cards} cards, ${m.content.pieces} pieces, ${m.content.endings} endings, ${m.content.flashpoints} flashpoints.`);
  out.push('');

  out.push('## Targets');
  out.push('');
  out.push(table(['Status', 'Target', 'Value', 'Detail'], report.targets.map((t) => [t.status, t.label, t.value, t.detail ?? ''])));
  const passed = report.targets.filter((t) => t.status === 'PASS').length;
  const failed = report.targets.filter((t) => t.status === 'FAIL').length;
  out.push('');
  out.push(`**${passed} PASS, ${failed} FAIL, ${report.targets.length - passed - failed} N/A.** Perfect-run (heuristic stand-down) rate: ${report.perfectRunRate === null ? '—' : `${report.perfectRunRate}%`}.`);
  out.push('');

  out.push('## Summary');
  out.push('');
  out.push(
    table(
      ['Policy', 'Runs', 'Median days', 'Mean days', 'Cards', 'Stand-down %', 'Nuclear %', 'Top ending %', 'Timer expiry %', 'Near-miss %'],
      report.policyOrder.map((name) => {
        const r = report.policies[name];
        return [r.policy, r.runs, r.days.median, r.days.mean, r.avgCards, r.standdownRate, r.nuclearRate, r.topEndingShare, fmtRate(r.timerExpiryRate, ''), fmtRate(r.nearMissRate, '')];
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

  out.push('## Combos (heuristic)');
  out.push('');
  if (report.combos) {
    const c = report.combos;
    out.push(`Pairs of pieces held together in ≥ ${c.minRuns} runs: ${c.pairsAnalysed}. Pairs with |Δ stand-down| ≥ ${COMBO_DELTA_PP}pp vs runs holding neither: **${c.measurablyDifferent}**.`);
    out.push('');
    out.push(
      c.top.length
        ? table(
            ['Piece A', 'Piece B', 'Runs', 'Stand-down %', 'Nuclear %', 'Baseline SD %', 'Baseline nuclear %', 'Δ stand-down', 'Δ nuclear'],
            c.top.map((s) => [s.a, s.b, s.runs, s.standdownRate, s.nuclearRate, s.baselineStanddown, s.baselineNuclear, s.deltaStanddown, s.deltaNuclear]),
          )
        : 'No pair reached the minimum run count.',
    );
  } else out.push('The heuristic policy was not run; no combo analysis.');
  out.push('');

  out.push('## Piece ending profiles');
  out.push('');
  out.push('Ending-kind mix with vs without each piece (heuristic when run, otherwise all policies). Profile Δ is the total-variation distance in percentage points.');
  out.push('');
  out.push(
    table(
      ['Piece', 'Pool', 'Offered', 'Pick rate', 'Held runs', 'Profile Δ', 'Δ stand-down', 'Δ nuclear'],
      report.pieceProfiles.map((p) => [p.id, p.pool, p.offered, fmtRate(p.pickRate), p.heldRuns, p.profileDelta, p.deltaStanddown, p.deltaNuclear]),
    ),
  );
  out.push('');
  out.push('## Weakest pieces');
  out.push('');
  out.push('Lowest combined rank of pick rate and ending-profile delta: pieces players do not want, or that do not change how runs end.');
  out.push('');
  out.push(
    report.weakestPieces.length
      ? table(['#', 'Piece', 'Pool', 'Pick rate', 'Held runs', 'Profile Δ'], report.weakestPieces.map((p, i) => [i + 1, p.id, p.pool, fmtRate(p.pickRate), p.heldRuns, p.profileDelta]))
      : 'No piece was offered.',
  );
  out.push('');

  const cardGroup = report.policies.heuristic ?? all;
  out.push(cardTable(cardGroup));
  return out.join('\n');
}
