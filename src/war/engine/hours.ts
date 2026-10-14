/**
 * Hours, crises and Summit twists (spec section 7). The slice is 22:00, 23:00 and 00:00;
 * KEEP GOING continues at 01:00 (6,000 / 9,000 / 12,000) and then x2.2 per Hour, with each
 * Summit drawing a random twist. A BLACKOUT's colour is drawn when its Hour starts.
 */
import { Rng } from '../../engine/rng';
import { COLOUR_ORDER, COLOURS } from '../content/map';
import { FIXED_TWISTS, HOUR_GROWTH, HOUR_TARGETS, TWIST_POOL } from './rules';
import type { CrisisKind, HourPlan, Twist, TwistKind } from './types';

/** Hour index to clock: 0 -> '22:00', 2 -> '00:00', 12 -> '10:00'. */
export function clockOf(hour: number): string {
  const h = (((22 + hour) % 24) + 24) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

/** Hours from 06:00 on (index 8+) are Overtime: 'OVERTIME 10:00'. */
export function isOvertime(hour: number): boolean {
  return hour >= 8;
}

export function hourLabel(hour: number): string {
  return isOvertime(hour) ? `OVERTIME ${clockOf(hour)}` : clockOf(hour);
}

export const CRISIS_NAME: Readonly<Record<CrisisKind, string>> = {
  FLARE_UP: 'FLARE-UP',
  STANDOFF: 'STANDOFF',
  SUMMIT: 'SUMMIT',
};

export const TWIST_NAME: Readonly<Record<TwistKind, string>> = {
  GRIDLOCK: 'GRIDLOCK',
  BLACKOUT: 'BLACKOUT',
  FULL_TABLE: 'FULL TABLE',
};

/** One plain line for the twist. */
export function twistRule(twist: Twist): string {
  switch (twist.kind) {
    case 'GRIDLOCK':
      return 'Sea lanes and cables are cut.';
    case 'BLACKOUT':
      return `${twist.colour ? COLOURS[twist.colour].name : 'One colour'} adds nothing.`;
    case 'FULL_TABLE':
      return 'Every sweep must pin exactly 5.';
  }
}

/** Targets for an Hour: fixed through 01:00, then the previous Hour's x2.2. */
export function hourTargets(hour: number, previous: readonly [bigint, bigint, bigint] | null): [bigint, bigint, bigint] {
  const fixed = HOUR_TARGETS[hour];
  if (fixed && hour >= 0) return [BigInt(fixed[0]), BigInt(fixed[1]), BigInt(fixed[2])];
  if (!previous) {
    // Derive from 01:00 by repeated growth (used when a run starts past the table).
    let t: [bigint, bigint, bigint] = hourTargets(HOUR_TARGETS.length - 1, null);
    for (let h = HOUR_TARGETS.length; h <= hour; h++) t = grow(t);
    return t;
  }
  return grow(previous);
}

function grow(t: readonly [bigint, bigint, bigint]): [bigint, bigint, bigint] {
  const g = (x: bigint) => (x * HOUR_GROWTH.num) / HOUR_GROWTH.den;
  return [g(t[0]), g(t[1]), g(t[2])];
}

/** Draw the Hour's Summit twist with rng 'twist' (mutates the rng). */
export function drawTwist(hour: number, rng: Rng): Twist {
  const kind: TwistKind = hour >= 0 && hour < FIXED_TWISTS.length ? FIXED_TWISTS[hour] : rng.pick(TWIST_POOL);
  const colour = kind === 'BLACKOUT' ? rng.pick(COLOUR_ORDER) : null;
  return { kind, colour };
}

export function planHour(
  hour: number,
  previous: readonly [bigint, bigint, bigint] | null,
  rng: Rng,
  targetsOverride?: [bigint, bigint, bigint],
): HourPlan {
  return { index: hour, targets: targetsOverride ?? hourTargets(hour, previous), twist: drawTwist(hour, rng) };
}
