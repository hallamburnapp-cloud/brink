/**
 * The reference fixtures (docs/war/v2/reference/fixtures.json, written by the reference's own
 * fixtures.py), typed. Node only: for tests and the simulator's cross-check, never the app.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import type { TraceEvent } from './types';

/**
 * A reference trace row: ['pin', r, n, points, m10], ['staff', seat (1-5), id, r | null, op, amount,
 * points, m10], ['crisis', r, 'xM', '2', points, m10] or ['slam', score]. Ints past 2^52 are strings.
 */
export type RefTraceRow = Array<string | number | null>;

export interface Fixtures {
  ids: RegionId[];
  params: Record<string, unknown>;
  staff: Record<StaffId, { name: string; icon: string; price: number; rule: string; chip: string }>;
  targets: number[];
  score: Array<{
    owner: string;
    crisis: RegionId;
    lit: RegionId[];
    pins: RegionId[];
    seats: StaffId[];
    oldhandM10: number;
    score: string;
    points: number;
    m10: string;
    trace?: RefTraceRow[];
  }>;
  ladder: Array<{ target: number; score: string; regions: number; next: string }>;
  legal: Array<{ crisis: RegionId; lit: RegionId[]; pins: RegionId[]; legal: boolean }>;
  groups: Array<{ crisis: RegionId; lit: RegionId[]; count: number }>;
  winOrder: Array<{ owner: string; crisis: RegionId; k: number; order: RegionId[] }>;
  warSpread: Array<{ owner: string; spreadsTo: RegionId | null }>;
  lift: Array<{ pinsInTapOrder: RegionId[]; lift: RegionId; left: RegionId[] }>;
  firstWorld: Array<{
    turn: number;
    crisis: RegionId;
    target: number;
    lit: RegionId[];
    pins: RegionId[];
    score: string;
    won: RegionId[];
    gold: number;
    red: number;
    coins: number;
    owner: string;
  }>;
}

export const FIXTURES_PATH = fileURLToPath(new URL('../../../docs/war/v2/reference/fixtures.json', import.meta.url));

let cached: Fixtures | null = null;

export function loadFixtures(): Fixtures {
  cached ??= JSON.parse(readFileSync(FIXTURES_PATH, 'utf8')) as Fixtures;
  return cached;
}

/** A BigInt as the reference writes it: a number, or a string past 2^52. */
const py = (x: bigint): number | string => (x > 2n ** 52n || x < -(2n ** 52n) ? x.toString() : Number(x));

/** A trace in the reference's row form (compare with a fixture's `trace`). */
export function toReference(events: readonly TraceEvent[]): RefTraceRow[] {
  return events.map((e): RefTraceRow => {
    switch (e.kind) {
      case 'pin':
        return ['pin', e.region, e.amount, py(e.points), py(e.m10)];
      case 'staff':
        return ['staff', e.seat + 1, e.staff, null, e.op, e.op === 'xM' ? e.label.slice(1) : e.amount, py(e.points), py(e.m10)];
      case 'regionStaff':
        return ['staff', e.seat + 1, e.staff, e.region, 'xM', e.label.slice(1), py(e.points), py(e.m10)];
      case 'crisisX2':
        return ['crisis', e.region, 'xM', '2', py(e.points), py(e.m10)];
      case 'slam':
        return ['slam', py(e.score)];
    }
  });
}
