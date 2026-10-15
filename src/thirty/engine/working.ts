/**
 * A day in progress: the heats being changed, the DANGER additions, and the trace of every step,
 * with the two rules that touch every heat change (the Spin Doctor's "home never heats" and Red
 * Lines' doubled calming and +15 at war) applied in one place. Both the real resolution and the
 * preview run on one of these; the preview's is thrown away.
 */
import type { Heat, PieceId, RegionId } from '../content/types.ts';
import { RULES, WAR, dangerOf } from './rules.ts';
import type { GameState, HeatChange, HeatWhy, TraceStep } from './types.ts';
import { isHome, regionName } from './world.ts';

export interface HeatOptions {
  piece?: PieceId;
  source?: RegionId;
  /** Pressure at the end of the day: a guarded region turns it away. */
  pressure?: boolean;
}

export class Working {
  heats: Record<RegionId, Heat>;
  penalty: number;
  readonly steps: TraceStep[] = [];
  readonly fired = new Set<PieceId>();
  readonly team: ReadonlySet<PieceId>;
  readonly day: number;
  redLine: RegionId | null;
  readonly warned: Set<RegionId>;
  readonly guarded: Record<RegionId, number>;
  /** The region whose heating (or penalty) took DANGER from below 100 to 100 (the WAR ending names it). */
  tipping: RegionId | null = null;
  /** DANGER additions made today. */
  added = 0;
  private absorbed = new Set<RegionId>();

  constructor(s: GameState) {
    this.heats = { ...s.heats };
    this.penalty = s.penalty;
    this.team = new Set(s.team);
    this.day = s.day;
    this.redLine = s.redLine;
    this.warned = new Set(s.warned);
    this.guarded = { ...s.guarded };
  }

  has(piece: PieceId): boolean {
    return this.team.has(piece);
  }

  danger(): number {
    return dangerOf(this.heats, this.penalty);
  }

  /** The chips to glow: pieces that changed something. */
  fire(piece: PieceId): void {
    this.fired.add(piece);
  }

  note(piece: PieceId, note: string): void {
    this.fired.add(piece);
    this.steps.push({ kind: 'piece', piece, note });
  }

  checkpoint(at: 'start' | 'choice' | 'pressure'): void {
    this.steps.push({ kind: 'danger', at, danger: this.danger() });
  }

  /** True when nothing may heat this region today: the Spin Doctor's home, or a guarded region under pressure. */
  protectedFrom(region: RegionId, pressure: boolean): PieceId | 'guarded' | null {
    if (this.has('spin-doctor') && isHome(region)) return 'spin-doctor';
    if (pressure && (this.guarded[region] ?? 0) >= this.day) return 'guarded';
    return null;
  }

  /**
   * Heat a region by `steps` (clamped at WAR). Returns the steps actually applied. A protected region
   * absorbs it: the Spin Doctor is noted once per region per day; a guard is silent.
   */
  heat(region: RegionId, steps: number, why: HeatWhy, o: HeatOptions = {}): number {
    if (steps <= 0) return 0;
    const shield = this.protectedFrom(region, !!o.pressure);
    if (shield) {
      if (shield === 'spin-doctor' && !this.absorbed.has(region)) {
        this.absorbed.add(region);
        this.note('spin-doctor', `${regionName(region)} does not heat`);
      }
      return 0;
    }
    const from = this.heats[region];
    const to = Math.min(WAR, from + steps) as Heat;
    if (to === from) return 0;
    const before = this.danger();
    this.heats[region] = to;
    this.push({ region, from, to, why, ...(o.piece ? { piece: o.piece } : {}), ...(o.source ? { source: o.source } : {}) });
    if (before < RULES.dangerCap && this.danger() >= RULES.dangerCap) this.tipping = region;
    if (to === WAR && region === this.redLine && this.has('red-lines')) {
      this.addPenalty(RULES.redLinePenalty, 'red-lines', region, `${regionName(region)} was the red line`);
    }
    return to - from;
  }

  /** Cool a region by `steps` (clamped at CALM; doubled on the Red Lines region). Returns the steps applied. */
  cool(region: RegionId, steps: number, why: HeatWhy, o: HeatOptions = {}): number {
    if (steps <= 0) return 0;
    const from = this.heats[region];
    if (from === 0) return 0;
    let n = steps;
    if (region === this.redLine && this.has('red-lines')) {
      n *= 2;
      this.fire('red-lines');
    }
    const to = Math.max(0, from - n) as Heat;
    this.heats[region] = to;
    this.push({ region, from, to, why, ...(o.piece ? { piece: o.piece } : {}), ...(o.source ? { source: o.source } : {}) });
    return from - to;
  }

  addPenalty(amount: number, piece: PieceId, region: RegionId, text: string): void {
    const before = this.danger();
    this.penalty += amount;
    this.added += amount;
    this.fire(piece);
    this.steps.push({ kind: 'penalty', amount, piece, region, danger: this.danger(), text });
    if (before < RULES.dangerCap && this.danger() >= RULES.dangerCap) this.tipping = region;
  }

  mark(mark: 'red-line' | 'warned' | 'guarded', region: RegionId): void {
    if (mark === 'red-line') this.redLine = region;
    else if (mark === 'warned') this.warned.add(region);
    else this.guarded[region] = this.day + RULES.guardDays - 1;
    this.steps.push({ kind: 'mark', mark, region });
  }

  /** Every heat change so far, in order. */
  changes(): HeatChange[] {
    const out: HeatChange[] = [];
    for (const s of this.steps) {
      if (s.kind !== 'heat') continue;
      const { kind: _k, danger: _d, ...change } = s;
      out.push(change);
    }
    return out;
  }

  private push(c: HeatChange): void {
    if (c.piece) this.fired.add(c.piece);
    this.steps.push({ kind: 'heat', danger: this.danger(), ...c });
  }
}
