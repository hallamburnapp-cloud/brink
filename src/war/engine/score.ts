/**
 * The scoring engine (spec section 4). Pure and deterministic, all BigInt.
 * Influence (I) is a whole number; Momentum is held in tenths (M10). 'x1.5' floors to tenths.
 *
 * Order: twist (already in the Board) -> pattern base -> sweep, pin by pin west to east
 * (weight + brass, threads on the first pass, stamp, pin staff; again for each extra pass)
 * -> standby -> desk -> leverage = I x M10 / 10.
 */
import { REGION, compareWestEast, type RegionId } from '../content/map';
import { patternValues, type PatternId } from '../content/patterns';
import type { StaffId } from '../content/staff';
import { components, detectPattern } from './patterns';
import type { ActingStaff, Board } from './board';
import { RULES } from './rules';
import type { AgainReason, StampKind, TraceEvent } from './types';

export interface ScoreInput {
  /** The pinned set (1-5 regions, including an Airlift pin). */
  pins: readonly RegionId[];
  /** The lit regions (for standby). */
  lit: readonly RegionId[];
  flashpoint: RegionId | null;
}

export interface ScoreOptions {
  /** Build the trace (default true). Bots and the CLEARS lamp turn it off for speed. */
  trace?: boolean;
}

export interface ScoreResult {
  leverage: bigint;
  pattern: PatternId;
  level: number;
  /** The pins that score, in sweep order (west to east). */
  scoringSet: RegionId[];
  /** Pinned but not scoring. */
  loose: RegionId[];
  topRegion: RegionId;
  ringed: RegionId | null;
  baseInfluence: bigint;
  baseM10: bigint;
  influence: bigint;
  m10: bigint;
  /** Joined pairs inside the scoring set: each gains +1 traffic on commit. */
  threads: Array<[RegionId, RegionId]>;
  /** How many times each scoring region scored (passes; blacked-out pins score 0). */
  passes: Record<RegionId, number>;
  /** Influence each scoring pin's (a)-(d) steps added. */
  contributions: Record<RegionId, bigint>;
  /** Seats that fired at least once (pin, again, standby, desk, or tripled threads). */
  firedSeats: number[];
  trace: TraceEvent[];
}

const x1_5 = (m10: bigint) => (m10 * 3n) / 2n;

interface AgainSource {
  reason: AgainReason;
  seat?: number;
  staffId?: StaffId;
  viaDeputy?: boolean;
}

export function scoreSelection(board: Board, input: ScoreInput, opts: ScoreOptions = {}): ScoreResult {
  const wantTrace = opts.trace ?? true;
  const { world } = board;
  const pins = [...new Set(input.pins)];
  const det = detectPattern(pins, board, world.levels);
  const base = patternValues(det.pattern, det.level);
  const baseInfluence = BigInt(base.influence);
  const baseM10 = BigInt(base.momentum) * 10n;
  let I = baseInfluence;
  let M10 = baseM10;

  const trace: TraceEvent[] = [];
  const fired = new Set<number>();
  const emit = (e: Omit<TraceEvent, 'i' | 'I' | 'M10'>) => {
    if (e.seat !== undefined) fired.add(e.seat);
    if (wantTrace) trace.push({ i: trace.length, ...e, I: I.toString(), M10: M10.toString() } as TraceEvent);
  };

  emit({ phase: 'pattern', op: 'base', amount: baseInfluence.toString(), pattern: det.pattern, level: det.level });

  // Seats that apply a rule (a Deputy with nothing to its right applies none).
  const acting = board.acting.filter((s): s is ActingStaff & { id: StaffId } => s.id !== null);
  const railClerk = acting.find((s) => s.id === 'RAILCLERK');
  const threadFactor = railClerk ? 3 : 1;
  const blackout = board.twist?.kind === 'BLACKOUT' ? board.twist.colour : null;
  const order = det.scoring; // already west to east
  const scored: RegionId[] = [];
  const contributions: Record<RegionId, bigint> = {};
  const passes: Record<RegionId, number> = {};

  order.forEach((p, step) => {
    const def = REGION[p];
    contributions[p] = 0n;
    passes[p] = 0;
    if (blackout && board.colourOf(p) === blackout) {
      emit({ phase: 'pin', region: p, step, pass: 0, op: '+I', amount: '0', dark: true });
      return; // counts for the pattern but adds nothing, triggers nothing, and is never 'scored'
    }
    const stamp: StampKind | undefined = world.stamps[p];
    const capital = board.isCapital(p);
    const port = board.isPort(p);

    const agains: AgainSource[] = [];
    if (p === input.flashpoint) agains.push({ reason: 'flashpoint' });
    if (stamp === 'ECHO') agains.push({ reason: 'echo' });
    for (const s of acting) {
      const from = { seat: s.seat, staffId: s.id, viaDeputy: s.viaDeputy };
      if (s.id === 'COURIER' && step === 0) agains.push({ reason: 'courier', ...from });
      if (s.id === 'SIGNALS' && capital) agains.push({ reason: 'signals', ...from });
    }

    const gain = BigInt(def.weight + RULES.brassInfluence * (world.brass[p] ?? 0));
    for (let pass = 0; pass <= agains.length; pass++) {
      if (pass > 0) {
        const src = agains[pass - 1];
        emit({ phase: 'again', region: p, step, pass, op: 'again', amount: 'AGAIN', ...src });
      }
      // (a) weight and brass pins
      I += gain;
      contributions[p] += gain;
      passes[p] += 1;
      emit({ phase: 'pin', region: p, step, pass, op: '+I', amount: gain.toString() });

      // (b) threads back to pins already scored this sweep (first pass only)
      if (pass === 0) {
        for (const q of scored) {
          if (!board.joined(p, q)) continue;
          const t = BigInt(board.traffic(p, q) * threadFactor);
          I += t;
          contributions[p] += t;
          const tripled = railClerk && t > 0n ? { seat: railClerk.seat, staffId: railClerk.id } : {};
          emit({ phase: 'thread', region: p, other: q, step, op: '+I', amount: t.toString(), ...tripled });
        }
      }

      // (c) stamp
      if (stamp === 'FORTIFY') {
        I += 20n;
        contributions[p] += 20n;
        emit({ phase: 'stamp', region: p, step, pass, stamp, op: '+I', amount: '20' });
      } else if (stamp === 'RELAY') {
        M10 = x1_5(M10);
        emit({ phase: 'stamp', region: p, step, pass, stamp, op: 'xM', amount: '1.5' });
      }

      // (d) pin staff, seat order
      for (const s of acting) {
        const at = { phase: 'staff' as const, region: p, step, pass, seat: s.seat, staffId: s.id, viaDeputy: s.viaDeputy };
        switch (s.id) {
          case 'HARBOUR':
            if (port) {
              I += 15n;
              contributions[p] += 15n;
              emit({ ...at, op: '+I', amount: '15' });
            }
            break;
          case 'SURVEYOR':
            if (def.weight <= 4) {
              I += 15n;
              contributions[p] += 15n;
              emit({ ...at, op: '+I', amount: '15' });
            }
            break;
          case 'GOVERNOR':
            if (capital) {
              M10 += 50n;
              emit({ ...at, op: '+M', amount: '5' });
            }
            break;
          case 'ADMIRAL':
            if (port) {
              M10 = x1_5(M10);
              emit({ ...at, op: 'xM', amount: '1.5' });
            }
            break;
          case 'SOVEREIGN':
            if (capital) {
              M10 *= 2n;
              emit({ ...at, op: 'xM', amount: '2' });
            }
            break;
          default:
            break;
        }
      }
    }
    scored.push(p);
  });

  // STANDBY: lit regions left unpinned, west to east.
  const pinned = new Set(pins);
  const standby = input.lit.filter((r) => !pinned.has(r)).sort(compareWestEast);
  for (const r of standby) {
    if (blackout && board.colourOf(r) === blackout) continue;
    if (!board.isCapital(r)) continue;
    for (const s of acting) {
      if (s.id !== 'CHIEF') continue;
      M10 = x1_5(M10);
      emit({ phase: 'standby', region: r, seat: s.seat, staffId: s.id, viaDeputy: s.viaDeputy, op: 'xM', amount: '1.5' });
    }
  }

  // DESK, seat order.
  const biggestGroup = components(order, board.adj)[0]?.length ?? 0;
  const colourCount = new Set(order.map((r) => board.colourOf(r))).size;
  for (const s of acting) {
    const at = { phase: 'desk' as const, seat: s.seat, staffId: s.id, viaDeputy: s.viaDeputy };
    switch (s.id) {
      case 'DUTY':
        M10 += 40n;
        emit({ ...at, op: '+M', amount: '4' });
        break;
      case 'QM':
        I += 30n;
        emit({ ...at, op: '+I', amount: '30' });
        break;
      case 'HOTLINE':
        if (biggestGroup >= 3) {
          M10 += 80n;
          emit({ ...at, op: '+M', amount: '8' });
        }
        break;
      case 'MEDIATOR':
        if (pins.length <= 3) {
          M10 *= 3n;
          emit({ ...at, op: 'xM', amount: '3' });
        }
        break;
      case 'STRATEGIST':
        if (biggestGroup >= 4) {
          M10 *= 2n;
          emit({ ...at, op: 'xM', amount: '2' });
        }
        break;
      case 'ENVOY':
        if (colourCount >= 4) {
          M10 *= 2n;
          emit({ ...at, op: 'xM', amount: '2' });
        }
        break;
      case 'OLDHAND':
        if (s.count > 0) {
          I += BigInt(s.count);
          emit({ ...at, op: '+I', amount: String(s.count) });
        }
        break;
      default:
        break;
    }
  }

  const leverage = (I * M10) / 10n;
  emit({ phase: 'slam', op: 'slam', amount: leverage.toString() });

  // topRegion: most Influence from (a)-(d); order is west to east, so ties keep the westmost.
  let topRegion = order[0];
  for (const r of order) if (contributions[r] > contributions[topRegion]) topRegion = r;

  const threads: Array<[RegionId, RegionId]> = [];
  for (let a = 0; a < order.length; a++) {
    for (let b = a + 1; b < order.length; b++) {
      if (board.joined(order[a], order[b])) threads.push([order[a], order[b]]);
    }
  }

  const scoringSet = new Set(order);
  return {
    leverage,
    pattern: det.pattern,
    level: det.level,
    scoringSet: order,
    loose: pins.filter((r) => !scoringSet.has(r)).sort(compareWestEast),
    topRegion,
    ringed: det.ringed ?? null,
    baseInfluence,
    baseM10,
    influence: I,
    m10: M10,
    threads,
    passes,
    contributions,
    firedSeats: [...fired].sort((a, b) => a - b),
    trace,
  };
}
