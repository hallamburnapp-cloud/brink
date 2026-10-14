/**
 * Pattern detection (spec section 3). Given the pinned set S and the join graph J, list every
 * pattern S makes and pick the one with the largest base Influence x base Momentum at its level
 * (ties go to the higher rung). Only that pattern's pins score; the rest are loose.
 */
import { REGION, compareWestEast, type RegionId } from '../content/map';
import { PATTERNS, PATTERN, patternValues, type PatternId } from '../content/patterns';
import type { Colour } from './types';

/** The parts of the board detection needs. buildBoard() returns a superset of this. */
export interface PatternBoard {
  adj: ReadonlyMap<RegionId, ReadonlySet<RegionId>>;
  live: readonly RegionId[];
  colourOf(r: RegionId): Colour;
}

export interface Candidate {
  pattern: PatternId;
  /** The pins that would score, west to east. */
  scoring: RegionId[];
  /** SURROUND only: the unpinned region the pins ring. */
  ringed?: RegionId;
}

export interface Detection extends Candidate {
  level: number;
  /** Every pattern the pins make, lowest rung first. */
  candidates: Candidate[];
}

/** Connected groups of `sel` under `adj`, each listed west to east, largest group first. */
export function components(sel: readonly RegionId[], adj: ReadonlyMap<RegionId, ReadonlySet<RegionId>>): RegionId[][] {
  const inSel = new Set(sel);
  const seen = new Set<RegionId>();
  const groups: RegionId[][] = [];
  for (const start of [...sel].sort(compareWestEast)) {
    if (seen.has(start)) continue;
    const group: RegionId[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const r = stack.pop()!;
      group.push(r);
      for (const n of adj.get(r) ?? []) {
        if (inSel.has(n) && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    groups.push(group.sort(compareWestEast));
  }
  // Stable: equal sizes keep west-to-east order of their westmost pin.
  return groups.sort((a, b) => b.length - a.length);
}

const weightOf = (rs: readonly RegionId[]) => rs.reduce((sum, r) => sum + REGION[r].weight, 0);

/** Heaviest first; ties go to the group whose westmost pin is further west. */
function heaviest(groups: RegionId[][]): RegionId[] {
  return groups.reduce((best, g) => (weightOf(g) > weightOf(best) ? g : best));
}

/** Every pattern the pinned set makes (unordered by value). `pins` must be non-empty. */
export function listCandidates(pins: readonly RegionId[], board: PatternBoard): Candidate[] {
  const sel = [...new Set(pins)].sort(compareWestEast);
  const n = sel.length;
  const inSel = new Set(sel);
  const groups = components(sel, board.adj);
  const c = groups[0];
  const colours = new Set(sel.map((r) => board.colourOf(r)));
  const out: Candidate[] = [];

  // SINGLE: the heaviest pin, ties to the westmost (sel is already west to east).
  const single = sel.reduce((best, r) => (REGION[r].weight > REGION[best].weight ? r : best));
  out.push({ pattern: 'SINGLE', scoring: [single] });

  const pairs = groups.filter((g) => g.length === 2);
  if (c.length === 2) out.push({ pattern: 'LINK', scoring: heaviest(pairs) });
  if (pairs.length >= 2) out.push({ pattern: 'TWO_LINKS', scoring: [...pairs[0], ...pairs[1]].sort(compareWestEast) });
  if (c.length === 3) out.push({ pattern: 'CHAIN', scoring: c });
  if (c.length === 4) out.push({ pattern: 'FRONT', scoring: c });
  if (c.length === 5) out.push({ pattern: 'NETWORK', scoring: sel });

  const ring = findSurround(inSel, board);
  if (ring) out.push({ pattern: 'SURROUND', scoring: ring.neighbours, ringed: ring.region });

  if (n === 5 && colours.size === 5) out.push({ pattern: 'WORLDWIDE', scoring: sel });
  if (n === 5 && colours.size === 1) out.push({ pattern: 'BLOC', scoring: sel });

  for (const colour of colours) {
    const members = board.live.filter((r) => board.colourOf(r) === colour);
    if (members.length >= 3 && members.length <= 5 && members.every((r) => inSel.has(r))) {
      out.push({ pattern: 'WHOLE_BLOC', scoring: [...members].sort(compareWestEast) });
    }
  }

  if (n === 5 && c.length === 5 && colours.size === 5) out.push({ pattern: 'AROUND_THE_WORLD', scoring: sel });
  return out;
}

/**
 * SURROUND: an unpinned, live region with 3 or more neighbours in J, all of them pinned.
 * Several qualify: the highest neighbour weight sum wins, then the westmost ringed region.
 */
function findSurround(
  inSel: ReadonlySet<RegionId>,
  board: PatternBoard,
): { region: RegionId; neighbours: RegionId[] } | null {
  // Only a neighbour of some pin can be ringed by the pins.
  const options = new Set<RegionId>();
  for (const p of inSel) for (const n of board.adj.get(p) ?? []) if (!inSel.has(n)) options.add(n);
  let best: { region: RegionId; neighbours: RegionId[]; weight: number } | null = null;
  for (const r of [...options].sort(compareWestEast)) {
    const nb = board.adj.get(r);
    if (!nb || nb.size < 3) continue;
    const neighbours = [...nb];
    if (!neighbours.every((x) => inSel.has(x))) continue;
    const weight = weightOf(neighbours);
    if (!best || weight > best.weight) best = { region: r, neighbours: neighbours.sort(compareWestEast), weight };
  }
  return best && { region: best.region, neighbours: best.neighbours };
}

/** Base product at a level, the number the choice is made on. */
export function baseProduct(pattern: PatternId, level: number): number {
  const v = patternValues(pattern, level);
  return v.influence * v.momentum;
}

/** Detect the pattern that scores. `levels` gives each pattern's current level. */
export function detectPattern(
  pins: readonly RegionId[],
  board: PatternBoard,
  levels: Readonly<Record<PatternId, number>>,
): Detection {
  if (pins.length === 0) throw new Error('detectPattern needs at least one pin');
  const candidates = listCandidates(pins, board).sort((a, b) => PATTERN[a.pattern].rung - PATTERN[b.pattern].rung);
  let pick = candidates[0];
  let bestProduct = baseProduct(pick.pattern, levels[pick.pattern]);
  for (const cand of candidates.slice(1)) {
    const product = baseProduct(cand.pattern, levels[cand.pattern]);
    // >= : candidates run low rung to high, so ties go to the higher rung.
    if (product >= bestProduct) {
      pick = cand;
      bestProduct = product;
    }
  }
  return { ...pick, level: levels[pick.pattern], candidates };
}

/** Levels with every pattern at 1. */
export function startingLevels(): Record<PatternId, number> {
  return Object.fromEntries(PATTERNS.map((p) => [p.id, 1])) as Record<PatternId, number>;
}
