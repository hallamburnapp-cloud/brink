/**
 * The map's effect timeline: every running effect as data with a start time and a duration
 * (already divided by the speed). The controller adds effects; painters ask where each one is at
 * time `now`. No DOM here.
 */
import type { InkColour, Owner, RegionId } from './contract';
import type { RGB } from './palette';

export interface Timed {
  start: number;
  dur: number;
}

export interface RegionTimed extends Timed {
  id: RegionId;
}
export interface Pulse extends Timed {
  from: RegionId;
  to: RegionId;
}
/** Light blooming out from a point across the table (a slam of 10x the target or more). */
export interface Bloom extends Timed {
  rgb: RGB;
  x: number;
  y: number;
}
/** A region lighting up on the deal: dark until `start`, then warming up over `dur`. */
export type LightUp = RegionTimed;
export interface Shockwave extends Timed {
  from: RegionId;
}
export interface LightsOut extends Timed {
  /** When each grey region goes out, as a fraction of the duration. */
  at: Map<RegionId, number>;
}
export interface InkSpread extends Timed {
  source: RegionId;
  targets: RegionId[];
  owner: InkColour;
  /** The owner each target shows outside the spreading ink. */
  before: Map<RegionId, Owner>;
}
/** A pulse of colour stepping along a chain of joined regions, `stepMs` a join. */
export interface Travel extends Timed {
  path: RegionId[];
  colour: InkColour;
  stepMs: number;
}
export interface Wave extends Timed {
  from: RegionId;
  colour: InkColour;
}

interface Waiter {
  end: number;
  resolve: () => void;
}

export function progress(t: Timed, now: number): number {
  if (t.dur <= 0) return 1;
  const p = (now - t.start) / t.dur;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

function ended(t: Timed, now: number, tail = 0): boolean {
  return now >= t.start + t.dur + tail;
}

export class FxState {
  /** The scoring set while a send plays (from dimExcept); null otherwise. */
  scoring: Set<RegionId> | null = null;
  /** Dim per region at the start of the current dim transition. */
  dimFrom = new Map<RegionId, number>();
  dimTween: Timed = { start: 0, dur: 0 };
  /** Regions scored this send (flash, then hold bright). */
  scored = new Set<RegionId>();
  flashes: RegionTimed[] = [];
  scanX: number | null = null;
  /** When the scan line last jumped (its wake fades in after a jump). */
  scanJumpAt = -Infinity;
  pulses: Pulse[] = [];
  bloom: Bloom | null = null;
  shock: Shockwave | null = null;
  drops: RegionTimed[] = [];
  /** A brass pin landing: a brass ripple spreads from the tack. */
  ripples: RegionTimed[] = [];
  lightsOut: LightsOut | null = null;
  inks: InkSpread[] = [];
  travels: Travel[] = [];
  waves: Wave[] = [];
  /**
   * Owners set by a finished ink spread, kept until the view moves off `before` (it shows the new
   * owner, or something newer), so the ink may play before or after the update that applies it.
   */
  ownerOverride = new Map<RegionId, { owner: Owner; before: Owner }>();
  /** New joins between pins snapping taut. */
  joinSnaps = new Map<string, number>();
  /** Pins being pushed into the glass. */
  pinDrops = new Map<RegionId, number>();
  /** The crisis ring stamping its ×2. */
  ringStamp: Timed | null = null;
  /** The ring collapsing into its region; `crisis` is the region it collapsed on. */
  ringCollapse: (Timed & { crisis: RegionId }) | null = null;
  /** Regions lighting up one by one on a deal or a swap. */
  lightUps = new Map<RegionId, LightUp>();
  private waiters: Waiter[] = [];

  /** A promise that resolves at `end` (or on reset). */
  wait(end: number): Promise<void> {
    return new Promise((resolve) => this.waiters.push({ end, resolve }));
  }

  /** Drop finished effects and resolve due promises. Returns true while anything still runs. */
  prune(now: number): boolean {
    const live = <T extends Timed>(list: T[], tail = 0) => list.filter((e) => !ended(e, now, tail));
    this.flashes = live(this.flashes);
    this.pulses = live(this.pulses);
    this.drops = live(this.drops);
    this.ripples = live(this.ripples);
    // A finished ink lingers (fully flooded) until its owner has settled, so the plate never flickers back.
    this.inks = live(this.inks, 100);
    this.travels = live(this.travels, 120);
    this.waves = live(this.waves);
    if (this.bloom && ended(this.bloom, now)) this.bloom = null;
    if (this.shock && ended(this.shock, now, 120)) this.shock = null;
    if (this.ringStamp && ended(this.ringStamp, now)) this.ringStamp = null;
    for (const [id, l] of this.lightUps) if (ended(l, now)) this.lightUps.delete(id);
    for (const [key, t] of this.joinSnaps) if (now >= t + 420) this.joinSnaps.delete(key);
    for (const [id, t] of this.pinDrops) if (now >= t + 200) this.pinDrops.delete(id);
    const due = this.waiters.filter((w) => now >= w.end);
    if (due.length) {
      this.waiters = this.waiters.filter((w) => now < w.end);
      for (const w of due) w.resolve();
    }
    return this.busy(now);
  }

  /** Something is moving (as opposed to idle life such as breathing heads or the gold shimmer). */
  busy(now: number): boolean {
    return (
      this.flashes.length > 0 ||
      this.pulses.length > 0 ||
      this.drops.length > 0 ||
      this.ripples.length > 0 ||
      this.inks.length > 0 ||
      this.travels.length > 0 ||
      this.waves.length > 0 ||
      this.bloom !== null ||
      this.shock !== null ||
      this.ringStamp !== null ||
      (this.ringCollapse !== null && !ended(this.ringCollapse, now)) ||
      this.lightUps.size > 0 ||
      this.joinSnaps.size > 0 ||
      this.pinDrops.size > 0 ||
      this.waiters.length > 0 ||
      now < this.dimTween.start + this.dimTween.dur ||
      now < this.scanJumpAt + 260 ||
      (this.lightsOut !== null && !ended(this.lightsOut, now, 200))
    );
  }

  /** Cancel everything and resolve every pending promise. */
  reset(): void {
    this.scoring = null;
    this.dimFrom.clear();
    this.dimTween = { start: 0, dur: 0 };
    this.scored.clear();
    this.flashes = [];
    this.scanX = null;
    this.scanJumpAt = -Infinity;
    this.pulses = [];
    this.bloom = null;
    this.shock = null;
    this.drops = [];
    this.ripples = [];
    this.lightsOut = null;
    this.inks = [];
    this.travels = [];
    this.waves = [];
    // Back to the view's own owners: an ink that ran before the reset (the intro's rewind) must not linger.
    this.ownerOverride.clear();
    this.joinSnaps.clear();
    this.pinDrops.clear();
    this.ringStamp = null;
    this.ringCollapse = null;
    this.lightUps.clear();
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w.resolve();
  }
}
