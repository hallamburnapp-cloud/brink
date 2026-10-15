/**
 * The 17 simulator gates of SPEC section 16, with the thresholds exactly as written there (and in
 * the reference's calibrate.py `gates`). "Holds the world" means WORLD UNITED or CEASEFIRE.
 *
 * Each gate reports the measured value, `pass` against the exact threshold, and `passLoose`: the
 * threshold lies within the sampling noise of the measure (about two standard errors). The CLI's
 * full run applies `pass`; the quick test on a small sample applies `passLoose`.
 */
import { STAFF_IDS, type StaffId } from '../content/staff';
import type { BotName } from './bots';
import { quantileInterval, twoSigma } from './stats';
import type { BotStats } from './summary';

/** An allowed range: `min` and `max` are inclusive unless marked open. */
interface Bound {
  min?: number;
  minOpen?: boolean;
  max?: number;
  maxOpen?: boolean;
}

export interface GateResult {
  id: string;
  title: string;
  /** The threshold as SPEC section 16 prints it. */
  threshold: string;
  value: number;
  /** The value as printed ('63.1%', '15.0', 'OLDHAND 23.0%'). */
  text: string;
  pass: boolean;
  passLoose: boolean;
}

export type StatsByBot = Readonly<Partial<Record<BotName, BotStats>>>;

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const one = (x: number) => x.toFixed(1);

function inside(x: number, b: Bound): boolean {
  if (b.min !== undefined && (b.minOpen ? x <= b.min : x < b.min)) return false;
  if (b.max !== undefined && (b.maxOpen ? x >= b.max : x > b.max)) return false;
  return true;
}

/** Does the interval [lo, hi] reach into the allowed range? */
function reaches(lo: number, hi: number, b: Bound): boolean {
  if (b.min !== undefined && (b.minOpen ? hi <= b.min : hi < b.min)) return false;
  if (b.max !== undefined && (b.maxOpen ? lo >= b.max : lo > b.max)) return false;
  return true;
}

/** A share measured on n samples: loose when within two standard errors of the bound it is near. */
function shareLoose(x: number, n: number, b: Bound): boolean {
  const lo = b.min !== undefined ? b.min - twoSigma(b.min, n) : -Infinity;
  const hi = b.max !== undefined ? b.max + twoSigma(b.max, n) : Infinity;
  return x >= lo && x <= hi;
}

interface Measure {
  value: number;
  text: string;
  /** Loose check for this measure against the bound. */
  loose: (b: Bound) => boolean;
}

function shareOf(x: number, n: number): Measure {
  return { value: x, text: pct(x), loose: (b) => shareLoose(x, n, b) };
}

/** A quantile of a sample (the value is the reference's own statistic of it). */
function quantileOf(value: number, sample: readonly number[], p: number): Measure {
  const [lo, hi] = quantileInterval(sample, p);
  return { value, text: one(value), loose: (b) => reaches(Math.min(lo, value), Math.max(hi, value), b) };
}

/** Share of held line-ups that include each staff. */
function staffShares(s: BotStats): Array<{ id: StaffId; share: number }> {
  const count = new Map(s.staffHeld);
  return STAFF_IDS.map((id) => ({ id, share: (count.get(id) ?? 0) / Math.max(1, s.heldGames) }));
}

/** The lowest (or highest) staff share; ties as the reference's min/max over (share, id) tuples. */
function extremeStaff(s: BotStats, lowest: boolean): { id: StaffId; share: number } {
  const shares = staffShares(s);
  return shares.reduce((best, x) => {
    if (x.share !== best.share) return lowest === x.share < best.share ? x : best;
    return lowest === x.id < best.id ? x : best;
  });
}

interface GateSpec {
  id: string;
  title: string;
  threshold: string;
  bound: Bound;
  bots: readonly BotName[];
  measure: (S: Readonly<Record<BotName, BotStats>>) => Measure;
}

export const GATES: readonly GateSpec[] = [
  {
    id: 'G1',
    title: 'sensible holds the world',
    threshold: '55-70%',
    bound: { min: 0.55, max: 0.7 },
    bots: ['sensible'],
    measure: (S) => shareOf(S.sensible.held, S.sensible.n),
  },
  {
    id: 'G2',
    title: 'sensible WORLD UNITED (30/30)',
    threshold: '≥ 40%',
    bound: { min: 0.4 },
    bots: ['sensible'],
    measure: (S) => shareOf(S.sensible.worldUnited, S.sensible.n),
  },
  {
    id: 'G3',
    title: 'greedy, never shops, holds',
    threshold: '< 25%',
    bound: { max: 0.25, maxOpen: true },
    bots: ['greedy'],
    measure: (S) => shareOf(S.greedy.held, S.greedy.n),
  },
  {
    id: 'G4',
    title: 'random holds',
    threshold: '< 5%',
    bound: { max: 0.05, maxOpen: true },
    bots: ['random'],
    measure: (S) => shareOf(S.random.held, S.random.n),
  },
  {
    id: 'G5',
    title: 'best send ≥ 2x the median send (sensible, opening deal)',
    threshold: '≥ 85% of turns',
    bound: { min: 0.85 },
    bots: ['sensible'],
    // Turns within a game are not independent; the game count is the honest sample size.
    measure: (S) => shareOf(S.sensible.spread2, S.sensible.n),
  },
  {
    id: 'G6',
    title: 'sensible median game',
    threshold: '15-19 turns',
    bound: { min: 15, max: 19 },
    bots: ['sensible'],
    measure: (S) => quantileOf(S.sensible.turns.median, S.sensible.samples.turns, 0.5),
  },
  {
    id: 'G7',
    title: 'first-game minutes, median',
    threshold: '13-16',
    bound: { min: 13, max: 16 },
    bots: ['sensible'],
    measure: (S) => quantileOf(S.sensible.minutes.first.median, S.sensible.samples.minutesFirst, 0.5),
  },
  {
    id: 'G8',
    title: 'first-game minutes, p90',
    threshold: '≤ 18',
    bound: { max: 18 },
    bots: ['sensible'],
    measure: (S) => quantileOf(S.sensible.minutes.first.p90, S.sensible.samples.minutesFirst, 0.9),
  },
  {
    id: 'G9',
    title: 'first-game minutes, games that hold, median',
    threshold: '14-17',
    bound: { min: 14, max: 17 },
    bots: ['sensible'],
    measure: (S) => quantileOf(S.sensible.minutesHeld.first.median, S.sensible.samples.minutesFirstHeld, 0.5),
  },
  {
    id: 'G10',
    title: 'held games where war reached 6+',
    threshold: '≥ 25%',
    bound: { min: 0.25 },
    bots: ['sensible'],
    measure: (S) => shareOf(S.sensible.warPeak6InHeld, S.sensible.heldGames),
  },
  {
    id: 'G11',
    title: 'close losses (WAR while holding 18+ gold)',
    threshold: '6-14% of games',
    bound: { min: 0.06, max: 0.14 },
    bots: ['sensible'],
    measure: (S) => shareOf(S.sensible.closeLoss, S.sensible.n),
  },
  {
    id: 'G12',
    title: 'hopeless losses (WAR holding ≤ 8 gold)',
    threshold: '< 10% of games',
    bound: { max: 0.1, maxOpen: true },
    bots: ['sensible'],
    measure: (S) => shareOf(S.sensible.hopeless, S.sensible.n),
  },
  {
    id: 'G13',
    title: 'novice median game',
    threshold: '≥ 7 turns',
    bound: { min: 7 },
    bots: ['novice'],
    measure: (S) => quantileOf(S.novice.turns.median, S.novice.samples.turns, 0.5),
  },
  {
    id: 'G14',
    title: 'preview bot holds',
    threshold: '≥ 30%',
    bound: { min: 0.3 },
    bots: ['preview'],
    measure: (S) => shareOf(S.preview.held, S.preview.n),
  },
  {
    id: 'G15',
    title: 'every staff in held line-ups',
    threshold: '≥ 8% each',
    bound: { min: 0.08 },
    bots: ['sensible'],
    measure: (S) => {
      const s = S.sensible;
      const low = extremeStaff(s, true);
      return {
        value: low.share,
        text: `${low.id} ${pct(low.share)}`,
        loose: (b) => staffShares(s).every((x) => shareLoose(x.share, s.heldGames, b)),
      };
    },
  },
  {
    id: 'G16',
    title: 'no staff in held line-ups above',
    threshold: '≤ 85%',
    bound: { max: 0.85 },
    bots: ['sensible'],
    measure: (S) => {
      const s = S.sensible;
      const high = extremeStaff(s, false);
      return {
        value: high.share,
        text: `${high.id} ${pct(high.share)}`,
        loose: (b) => staffShares(s).every((x) => shareLoose(x.share, s.heldGames, b)),
      };
    },
  },
  {
    id: 'G17',
    title: 'stalls (every bot)',
    threshold: '0',
    bound: { max: 0 },
    bots: ['random', 'novice', 'greedy', 'preview', 'sensible', 'breaker'],
    measure: (S) => {
      const stalls = Object.values(S).reduce((k, s) => k + s.stalls, 0);
      // A stall is a bug, not a sample: no slack.
      return { value: stalls, text: `${stalls}`, loose: (b) => inside(stalls, b) };
    },
  },
];

/** Every gate whose bots were all played. */
export function evaluateGates(stats: StatsByBot): GateResult[] {
  const out: GateResult[] = [];
  for (const g of GATES) {
    if (!g.bots.every((b) => stats[b])) continue;
    const m = g.measure(stats as Readonly<Record<BotName, BotStats>>);
    out.push({
      id: g.id,
      title: g.title,
      threshold: g.threshold,
      value: m.value,
      text: m.text,
      pass: inside(m.value, g.bound),
      passLoose: m.loose(g.bound),
    });
  }
  return out;
}
