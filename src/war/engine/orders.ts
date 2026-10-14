/**
 * Orders (spec section 6): target validation and permanent effects. Every effect is applied to
 * a drafted state. A region holds one stamp; a new stamp replaces the old one.
 */
import { REGION, REGION_IDS, compareWestEast, type RegionId } from '../content/map';
import { ORDER, type OrderId } from '../content/orders';
import { baseCapital, permanentlyJoined } from './board';
import { refill } from './deck';
import { RULES } from './rules';
import type { RunState, StampKind } from './types';

const STAMP_OF: Partial<Record<OrderId, StampKind>> = { FORTIFY: 'FORTIFY', RELAY: 'RELAY', ECHO: 'ECHO' };

export type RegionStatusName = 'lit' | 'dark' | 'spent' | 'retired';

export function statusOf(s: RunState, r: RegionId): RegionStatusName {
  if (s.world.retired.includes(r)) return 'retired';
  if (s.crisis.lit.includes(r)) return 'lit';
  if (s.crisis.spent.includes(r)) return 'spent';
  return 'dark';
}

/**
 * Why `region` can't be the next target of `order` after `chosen`, or null if it can.
 * Order-level checks (phase, tray) are made by the caller.
 */
export function targetProblem(s: RunState, order: OrderId, chosen: readonly RegionId[], region: RegionId): string | null {
  if (!REGION[region]) return 'Not a region.';
  if (s.world.retired.includes(region)) return 'That region is retired.';
  if (chosen.includes(region)) return 'Already chosen.';
  const def = ORDER[order];
  if (chosen.length >= def.targeting.max) return 'All targets chosen.';
  const inCrisis = s.phase === 'crisis';

  switch (order) {
    case 'FORTIFY':
    case 'RELAY':
    case 'ECHO':
      return s.world.stamps[region] === STAMP_OF[order] ? `Already stamped ${def.name}.` : null;
    case 'PROMOTE':
      return baseCapital(s.world, region) ? 'Already a Capital.' : null;
    case 'RETIRE': {
      if (inCrisis && region === s.crisis.flashpoint) return "The flashpoint can't be retired mid-crisis.";
      if (inCrisis && s.crisis.pins.includes(region)) return 'Lift that pin first.';
      const live = REGION_IDS.length - s.world.retired.length;
      if (live - chosen.length - 1 < RULES.minLiveRegions) return `The map needs at least ${RULES.minLiveRegions} regions.`;
      return null;
    }
    case 'CABLE':
      if (chosen.length === 1 && permanentlyJoined(s.world, chosen[0], region)) return 'Those two are already joined.';
      return null;
    case 'DEFECT':
      if (chosen.length >= 1 && s.world.colour[region] === s.world.colour[chosen[0]]) return 'Already that colour.';
      return null;
    case 'AIRLIFT': {
      if (!inCrisis) return 'AIRLIFT works only during a crisis.';
      if (s.crisis.airlift) return 'One Airlift per sweep.';
      if (s.crisis.pins.length >= RULES.maxPins) return 'Five pins is the limit. Lift one first.';
      const status = statusOf(s, region);
      if (status === 'lit') return 'It is lit: just pin it.';
      if (status === 'spent') return 'That region is spent this crisis.';
      return null;
    }
  }
}

/** Regions that may be the next target, west to east (for the map's highlight). */
export function validTargets(s: RunState, order: OrderId, chosen: readonly RegionId[]): RegionId[] {
  return REGION_IDS.filter((r) => targetProblem(s, order, chosen, r) === null).sort(compareWestEast);
}

/** Check a complete target list. Returns a reason, or null if the Order can be applied. */
export function targetsProblem(s: RunState, order: OrderId, targets: readonly RegionId[]): string | null {
  const { min, max } = ORDER[order].targeting;
  if (targets.length < min) return min === 1 ? 'Choose a region.' : `Choose ${min} regions.`;
  if (targets.length > max) return `At most ${max} regions.`;
  for (let i = 0; i < targets.length; i++) {
    const problem = targetProblem(s, order, targets.slice(0, i), targets[i]);
    if (problem) return problem;
  }
  return null;
}

/** Apply an Order's effect to a drafted state. Targets must have passed targetsProblem(). */
export function applyOrderEffect(s: RunState, order: OrderId, targets: readonly RegionId[]): void {
  const w = s.world;
  const c = s.crisis;
  switch (order) {
    case 'FORTIFY':
    case 'RELAY':
    case 'ECHO':
      for (const r of targets) w.stamps[r] = STAMP_OF[order]!;
      return;
    case 'PROMOTE':
      w.promoted.push(targets[0]);
      return;
    case 'CABLE':
      w.cables.push([targets[0], targets[1]]);
      return;
    case 'DEFECT':
      for (const r of targets.slice(1)) w.colour[r] = w.colour[targets[0]];
      return;
    case 'RETIRE': {
      const gone = new Set(targets);
      w.retired.push(...targets);
      const wasLit = c.lit.some((r) => gone.has(r));
      c.lit = c.lit.filter((r) => !gone.has(r));
      c.pile = c.pile.filter((r) => !gone.has(r));
      c.spent = c.spent.filter((r) => !gone.has(r));
      if (wasLit && s.phase === 'crisis') refill(s);
      return;
    }
    case 'AIRLIFT': {
      const r = targets[0];
      c.pile = c.pile.filter((x) => x !== r);
      c.pins.push(r);
      c.airlift = r;
      return;
    }
  }
}

/** One short line telling the player what to tap next while an Order is armed. */
export function armedPrompt(order: OrderId, chosen: readonly RegionId[]): string {
  switch (order) {
    case 'FORTIFY':
    case 'RETIRE':
      return chosen.length === 0 ? 'Tap up to 2 regions.' : 'Tap one more, or confirm.';
    case 'RELAY':
    case 'ECHO':
    case 'PROMOTE':
      return 'Tap a region.';
    case 'CABLE':
      return chosen.length === 0 ? 'Drag from one region to another.' : 'Now the other end.';
    case 'DEFECT':
      if (chosen.length === 0) return 'Tap the colour to spread.';
      return chosen.length === 1 ? 'Tap up to 2 regions to recolour.' : 'Tap one more, or confirm.';
    case 'AIRLIFT':
      return 'Tap an unlit region to pin it.';
  }
}
