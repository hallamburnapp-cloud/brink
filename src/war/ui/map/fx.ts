/**
 * The map's effect timeline: every running effect as data with a start time and a duration
 * (already divided by the speed). The controller adds effects; painters ask where each one is at
 * time `now`. No DOM here.
 */
import type { Colour, RegionId } from './contract';
import type { RGB } from './palette';

export interface Timed {
  start: number;
  dur: number;
}

export interface Flash extends Timed {
  id: RegionId;
}
export interface ScanSnap extends Timed {
  from: number;
  to: number;
}
export interface Pulse extends Timed {
  from: RegionId;
  to: RegionId;
}
/** A number or tag that pops on the map (thread traffic, stamp effect, AGAIN). */
export interface Pop extends Timed {
  text: string;
  tone: 'influence' | 'momentum' | 'again';
  x: number;
  y: number;
}
export interface RegionPulse extends Timed {
  id: RegionId;
}
export interface MapFlash extends Timed {
  rgb: RGB;
}
export interface Shockwave extends Timed {
  from: RegionId;
}
export interface LightsOut extends Timed {
  /** When each region goes out, as a fraction of the duration. */
  at: Map<RegionId, number>;
}
export interface InkSpread extends Timed {
  source: RegionId;
  targets: RegionId[];
  colour: Colour;
  /** The colour each target shows outside the spreading ink. */
  before: Map<RegionId, Colour>;
}
export interface Tween extends Timed {
  from: number;
  to: number;
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

export function tweenAt(t: Tween, now: number, ease: (x: number) => number = (x) => x): number {
  return t.from + (t.to - t.from) * ease(progress(t, now));
}

export class FxState {
  /** The scoring set while a sweep plays (from dimExcept); null otherwise. */
  scoring: Set<RegionId> | null = null;
  /** Dim per region at the start of the current dim transition. */
  dimFrom = new Map<RegionId, number>();
  dimTween: Timed = { start: 0, dur: 0 };
  /** When the live threads start growing to 2 pt (spec 9, 150-350 ms). */
  liveGrow: Timed | null = null;
  /** Regions scored this sweep (flash, then hold at 70%). */
  scored = new Set<RegionId>();
  lastFlashed: RegionId | null = null;
  flashes: Flash[] = [];
  scanX: number | null = null;
  /** When the scan line last jumped (its wake fades in after a jump). */
  scanJumpAt = -Infinity;
  scanSnap: ScanSnap | null = null;
  pulses: Pulse[] = [];
  pops: Pop[] = [];
  stampPulses: RegionPulse[] = [];
  standby: RegionPulse[] = [];
  heatOn = false;
  heatTween: Timed = { start: 0, dur: 0 };
  mapFlash: MapFlash | null = null;
  shock: Shockwave | null = null;
  drops: RegionPulse[] = [];
  lightsOut: LightsOut | null = null;
  inks: InkSpread[] = [];
  /**
   * Colours set by a finished ink spread, kept until the view moves off `before` (it either shows
   * the new colour or something newer).
   */
  colourOverride = new Map<RegionId, { colour: Colour; before: Colour }>();
  /** New joins between pins snapping taut. */
  joinSnaps = new Map<string, number>();
  /** Pins being pushed into the glass. */
  pinDrops = new Map<RegionId, number>();
  ring: Tween | null = null;
  private waiters: Waiter[] = [];

  /** A promise that resolves at `end` (or on reset). */
  wait(end: number): Promise<void> {
    return new Promise((resolve) => this.waiters.push({ end, resolve }));
  }

  /** Drop finished effects and resolve due promises. Returns true while anything still runs. */
  prune(now: number): boolean {
    const live = <T extends Timed>(list: T[], tail = 0) => list.filter((e) => now < e.start + e.dur + tail);
    this.flashes = live(this.flashes);
    this.pulses = live(this.pulses);
    this.pops = live(this.pops);
    this.stampPulses = live(this.stampPulses);
    this.standby = live(this.standby);
    this.drops = live(this.drops);
    this.inks = live(this.inks);
    if (this.mapFlash && now >= this.mapFlash.start + this.mapFlash.dur) this.mapFlash = null;
    if (this.shock && now >= this.shock.start + this.shock.dur + 120) this.shock = null;
    if (this.scanSnap && now >= this.scanSnap.start + this.scanSnap.dur) this.scanSnap = null;
    if (this.ring && now >= this.ring.start + this.ring.dur) this.ring = null;
    for (const [key, t] of this.joinSnaps) if (now >= t + 420) this.joinSnaps.delete(key);
    for (const [id, t] of this.pinDrops) if (now >= t + 200) this.pinDrops.delete(id);
    const due = this.waiters.filter((w) => now >= w.end);
    if (due.length) {
      this.waiters = this.waiters.filter((w) => now < w.end);
      for (const w of due) w.resolve();
    }
    return this.busy(now);
  }

  /** Something is moving (as opposed to idle life such as breathing pins). */
  busy(now: number): boolean {
    return (
      this.flashes.length > 0 ||
      this.pulses.length > 0 ||
      this.pops.length > 0 ||
      this.stampPulses.length > 0 ||
      this.standby.length > 0 ||
      this.drops.length > 0 ||
      this.inks.length > 0 ||
      this.mapFlash !== null ||
      this.shock !== null ||
      this.scanSnap !== null ||
      this.ring !== null ||
      this.joinSnaps.size > 0 ||
      this.pinDrops.size > 0 ||
      this.waiters.length > 0 ||
      now < this.dimTween.start + this.dimTween.dur ||
      now < this.heatTween.start + this.heatTween.dur ||
      now < this.scanJumpAt + 260 ||
      (this.liveGrow !== null && now < this.liveGrow.start + this.liveGrow.dur) ||
      (this.lightsOut !== null && now < this.lightsOut.start + this.lightsOut.dur + 200)
    );
  }

  /** Cancel everything and resolve every pending promise. */
  reset(): void {
    this.scoring = null;
    this.dimFrom.clear();
    this.dimTween = { start: 0, dur: 0 };
    this.liveGrow = null;
    this.scored.clear();
    this.lastFlashed = null;
    this.flashes = [];
    this.scanX = null;
    this.scanJumpAt = -Infinity;
    this.scanSnap = null;
    this.pulses = [];
    this.pops = [];
    this.stampPulses = [];
    this.standby = [];
    this.heatOn = false;
    this.heatTween = { start: 0, dur: 0 };
    this.mapFlash = null;
    this.shock = null;
    this.drops = [];
    this.lightsOut = null;
    this.inks = [];
    this.joinSnaps.clear();
    this.pinDrops.clear();
    this.ring = null;
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w.resolve();
  }
}
