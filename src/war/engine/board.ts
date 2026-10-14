/**
 * The board as the rules see it at one moment: which regions are live, which are joined
 * (land, lanes, cables, Ferry Master; minus lanes and cables under GRIDLOCK), each region's
 * current colour, and which regions count as Capitals and Ports. Also resolves Deputies.
 */
import { LAND, LANES, REGION, REGION_IDS, joinKey, type RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import type { Colour, SeatedStaff, Twist, World } from './types';

/** A seat as it acts: a Deputy acts as the nearest non-Deputy staff to its right. */
export interface ActingStaff {
  seat: number;
  /** The rule this seat applies; null for a Deputy with nothing to copy. */
  id: StaffId | null;
  count: number;
  viaDeputy: boolean;
}

export function resolveStaff(staff: readonly SeatedStaff[]): ActingStaff[] {
  return staff.map((s, seat) => {
    if (s.id !== 'DEPUTY') return { seat, id: s.id, count: s.count, viaDeputy: false };
    let j = seat + 1;
    while (j < staff.length && staff[j].id === 'DEPUTY') j++;
    if (j >= staff.length) return { seat, id: null, count: 0, viaDeputy: true };
    return { seat, id: staff[j].id, count: staff[j].count, viaDeputy: true };
  });
}

export interface Board {
  world: World;
  acting: ActingStaff[];
  /** Ids of seated staff (Deputies included). Rule staff work by presence. */
  seated: ReadonlySet<StaffId>;
  twist: Twist | null;
  gridlock: boolean;
  ferry: boolean;
  /** Non-retired regions in map order. */
  live: RegionId[];
  liveSet: ReadonlySet<RegionId>;
  adj: ReadonlyMap<RegionId, ReadonlySet<RegionId>>;
  colourOf(r: RegionId): Colour;
  isCapital(r: RegionId): boolean;
  isPort(r: RegionId): boolean;
  joined(a: RegionId, b: RegionId): boolean;
  traffic(a: RegionId, b: RegionId): number;
}

/** Ports: both ends of every sea lane and every cable. */
export function portSet(world: World): Set<RegionId> {
  const ports = new Set<RegionId>();
  for (const [a, b] of LANES) {
    ports.add(a);
    ports.add(b);
  }
  for (const [a, b] of world.cables) {
    ports.add(a);
    ports.add(b);
  }
  return ports;
}

/** Capitals before the Herald: the five starting capitals plus PROMOTE. */
export function baseCapital(world: World, r: RegionId): boolean {
  return REGION[r].capital || world.promoted.includes(r);
}

/** Joined on the permanent map (land, lane or cable), ignoring twists and staff. */
export function permanentlyJoined(world: World, a: RegionId, b: RegionId): boolean {
  const key = joinKey(a, b);
  return PERMANENT_KEYS.has(key) || world.cables.some(([x, y]) => joinKey(x, y) === key);
}

const PERMANENT_KEYS = new Set([...LAND, ...LANES].map(([a, b]) => joinKey(a, b)));

export function buildBoard(world: World, staff: readonly SeatedStaff[], twist: Twist | null): Board {
  const acting = resolveStaff(staff);
  const seated = new Set(staff.map((s) => s.id));
  const gridlock = twist?.kind === 'GRIDLOCK';
  const ferry = seated.has('FERRY') && !gridlock;
  const retired = new Set(world.retired);
  const live = REGION_IDS.filter((r) => !retired.has(r));
  const liveSet = new Set(live);
  const ports = portSet(world);
  const herald = seated.has('HERALD');

  const adj = new Map<RegionId, Set<RegionId>>();
  for (const r of live) adj.set(r, new Set());
  const link = (a: RegionId, b: RegionId) => {
    if (a === b || !liveSet.has(a) || !liveSet.has(b)) return;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const [a, b] of LAND) link(a, b);
  if (!gridlock) {
    for (const [a, b] of LANES) link(a, b);
    for (const [a, b] of world.cables) link(a, b);
  }
  if (ferry) {
    const livePorts = live.filter((r) => ports.has(r));
    for (let i = 0; i < livePorts.length; i++) {
      for (let j = i + 1; j < livePorts.length; j++) link(livePorts[i], livePorts[j]);
    }
  }

  return {
    world,
    acting,
    seated,
    twist,
    gridlock,
    ferry,
    live,
    liveSet,
    adj,
    colourOf: (r) => world.colour[r],
    isCapital: (r) => herald || baseCapital(world, r),
    isPort: (r) => ports.has(r),
    joined: (a, b) => adj.get(a)?.has(b) ?? false,
    traffic: (a, b) => world.traffic[joinKey(a, b)] ?? 0,
  };
}
