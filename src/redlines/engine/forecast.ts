/**
 * What an order would do, said before you pay (SPEC-SMALL rulings after the second review: "The three lines stay on
 * the sheet" and "A form that will fail says so before you pay"). Pure questions about a state in the act phase, for
 * the screens' slips and note: the three declarations in their tape words; the declared line a move or a promise
 * would cross; the rings a move would leave dashed; whether a ring on a place will be a call; the places that fall
 * when this week resolves unless something of yours answers them, and whether those falls would be world war.
 * Nothing here changes a state.
 */
import { clockOf, fightingRegions, holdDistance, holdInfo, isAnswered, isSpared, pieceAt, pieceOf, pressedRegions, promiseAt, weeksLeft } from './board.ts';
import { RULES, spreadAt } from './rules.ts';
import type { GameState, Line, PieceKind, RegionId } from './types.ts';
import { NEIGHBOURS, isCap } from './world.ts';

/** The three declarations as the tape prints them, in the order they were declared. */
export function declaredTapes(s: GameState): string[] {
  return s.fed.lines.map((l) => l.tape ?? l.text);
}

/** Whether a piece of this kind standing in `region` crosses this line (proximity: either piece; sea: the fleet; missiles: the brigade). */
function pieceCrosses(l: Line, kind: PieceKind, region: RegionId): boolean {
  if (!l.regions?.includes(region)) return false;
  return l.kind === 'proximity' || (l.kind === 'sea' && kind === 'fleet') || (l.kind === 'missiles' && kind === 'brigade');
}

/** The declared lines, not yet crossed, that moving this piece to `to` would cross, in their tape words (empty when none). */
export function linesCrossedByMove(s: GameState, kind: PieceKind, to: RegionId): string[] {
  return s.fed.lines.filter((l) => s.crossed[l.id] === undefined && pieceCrosses(l, kind, to)).map((l) => l.tape ?? l.text);
}

/** The declared lines, not yet crossed, that a promise on `region` would cross (an alliance line drawn there), in their tape words. */
export function linesCrossedByPromise(s: GameState, region: RegionId): string[] {
  return s.fed.lines.filter((l) => s.crossed[l.id] === undefined && l.kind === 'alliance' && !!l.regions?.includes(region)).map((l) => l.tape ?? l.text);
}

/** The promises that are solid now and would be dashed once this piece moved to `to` (nothing else of yours in reach). */
export function ringsLeftDashed(s: GameState, kind: PieceKind, to: RegionId): RegionId[] {
  const piece = pieceOf(s, kind);
  if (!piece) return [];
  const moved: GameState = { ...s, pieces: s.pieces.map((p) => (p.kind === kind ? { ...p, at: to } : p)) };
  return s.promises.filter((p) => holdInfo(s, p.region).ok && !holdInfo(moved, p.region).ok).map((p) => p.region);
}

/**
 * The test the coming resolve will ring, as `beginWeek` picks it (one a week): the carried test; else the first arrow at a
 * promised place; else (SPEC-SMALL "Too late is said before you pay") the first promised place at its last tick that
 * nothing of yours answers, which they come to take. Null when none.
 */
export function testThisWeek(s: GameState): RegionId | null {
  if (s.pendingTest) {
    // A carried test whose place is at its last tick falls while you waited (`waitedFell`), and the week's test passes on.
    const carried = s.regions[s.pendingTest];
    if (!(carried?.state === 'pressed' && weeksLeft(s, s.pendingTest) === 1)) return s.pendingTest;
  }
  const arrow = s.fed.headings.find((h) => h.to !== s.pendingTest && !!promiseAt(s, h.to) && s.regions[h.to]?.state !== 'fighting');
  if (arrow) return arrow.to;
  if (!RULES.lastTickRingCalls) return null;
  return s.promises.find((p) => p.region !== s.pendingTest && s.regions[p.region]?.state === 'pressed' && !isAnswered(s, p.region) && weeksLeft(s, p.region) === 1)?.region ?? null;
}

/** The state as it would stand with a ring drawn here now (a provocation when the place is hatched, as `promise` draws it). */
export function withRing(s: GameState, region: RegionId): GameState {
  if (promiseAt(s, region)) return s;
  const provocation = RULES.provocationRings && s.regions[region]?.state === 'pressed' && !pieceAt(s, region);
  return { ...s, promises: [...s.promises, { region, since: s.week, inherited: false, ...(provocation ? { provocation: true } : {}) }] };
}

/**
 * Whether a promise on this place will be a call when the week resolves: one of their arrows points at it (a real push
 * or a feint alike: a ring on an arrow's target turns the push into a test), or it stands at its last tick with nothing
 * of yours answering it (they come to take it), and no other test has the week.
 */
export function promiseWillRing(s: GameState, region: RegionId): boolean {
  if (s.phase !== 'act' || s.regions[region]?.state === 'fighting') return false;
  return testThisWeek(withRing(s, region)) === region;
}

/**
 * SPEC-SMALL "Too late is said before you pay": a ring drawn here now cannot save the place this week. It stands at its
 * last tick, the ring would not answer it (drawn into their siege, or dashed), and another test has the week, so it falls
 * when the week resolves unless a piece stands there. The PROMISE slip says so.
 */
export function promiseTooLate(s: GameState, region: RegionId): boolean {
  if (s.phase !== 'act' || s.regions[region]?.state !== 'pressed' || weeksLeft(s, region) !== 1) return false;
  const ringed = withRing(s, region);
  if (isAnswered(ringed, region)) return false;
  return testThisWeek(ringed) !== region;
}

/**
 * The pressed places this piece now answers (standing in one, or holding a solid ring on it) that it would leave at their
 * last tick with nothing of yours answering them: they fall when the week resolves (SPEC-SMALL "the MOVE HERE slip names a
 * pressed place the piece would leave to fall this week"). On the phone, a place whose last tick is next week counts too
 * (it did not tick this week while the piece stood in it).
 */
export function leavesToFall(s: GameState, kind: PieceKind, to: RegionId): RegionId[] {
  if (!pieceOf(s, kind)) return [];
  const moved: GameState = { ...s, pieces: s.pieces.map((p) => (p.kind === kind ? { ...p, at: to } : p)) };
  const limit = s.phase === 'phone' ? 2 : 1;
  return pressedRegions(s).filter((r) => r !== to && isAnswered(s, r) && !isAnswered(moved, r) && s.pendingTest !== r && (weeksLeft(moved, r) ?? Infinity) <= limit);
}

/**
 * The places that fall when this week resolves unless something of yours answers them first: pressed, unanswered, one
 * week left on the clock (the single ringed tick). The sheet's own clock (`weeksLeft`), so the note never disagrees.
 */
export function fallsThisWeek(s: GameState): RegionId[] {
  if (s.phase !== 'act') return [];
  return pressedRegions(s).filter((r) => !isAnswered(s, r) && s.pendingTest !== r && weeksLeft(s, r) === 1);
}

/**
 * The falls this week that something of yours could still answer before the week resolves: a piece that could stand in
 * the place or hold it solid with the move it has left this week, by a route that crosses no declared line. The note says
 * "unless something of ours reaches it" only of these; the rest it says nothing of ours can reach.
 */
export function fallsAnswerable(s: GameState): RegionId[] {
  return fallsThisWeek(s).filter((r) => s.pieces.some((p) => holdDistance(s, p, r) <= (s.moved.includes(p.kind) ? 0 : 1)));
}

/**
 * How many places the fighting would spread to when this week resolves (SPEC-SMALL: one a week at FIGHTING, two at
 * ALL-OUT, to neighbours of a fighting place, a piece or a solid ring sparing a place), counting this week's falls as
 * fighting, at the step they are on now.
 */
export function spreadThisWeek(s: GameState): number {
  if (s.phase !== 'act') return 0;
  const n = spreadAt(s.fed.step);
  if (!n) return 0;
  const falling = new Set(fallsThisWeek(s));
  const pool = new Set<RegionId>();
  for (const f of [...fightingRegions(s), ...falling])
    for (const r of NEIGHBOURS[f] ?? []) if (!isCap(r) && s.regions[r]?.state !== 'fighting' && !falling.has(r) && s.regions[r]?.recoveredWeek !== s.week && !isSpared(s, r)) pool.add(r);
  return Math.min(n, pool.size);
}

/** Whether this week's falls, with the spread that follows them, would make the eighth place fighting: world war when the week resolves (the note says so). */
export function fallsEndTheGame(s: GameState): boolean {
  const n = fallsThisWeek(s).length;
  return n > 0 && s.war + n + spreadThisWeek(s) >= RULES.warLimit;
}

/** Whether the spread alone (with no fall this week, or with falls that would not reach it on their own) is what would fill the eighth box. */
export function spreadEndsTheGame(s: GameState): boolean {
  const n = fallsThisWeek(s).length;
  const sp = spreadThisWeek(s);
  return sp > 0 && s.war + n < RULES.warLimit && s.war + n + sp >= RULES.warLimit;
}

/**
 * The piece of yours fewest moves from holding this place by a route that crosses no declared line, and how many moves
 * (0 when it holds it now); null when none can (SPEC-SMALL "Out of reach means out of reach"). A dashed ring's slip says
 * how far it is, so the reach behind "taken unanswered" and "out of reach" is on the sheet before it decides anything.
 */
export function nearestHold(s: GameState, region: RegionId): { piece: PieceKind; moves: number } | null {
  let best: { piece: PieceKind; moves: number } | null = null;
  for (const p of s.pieces) {
    const d = holdDistance(s, p, region);
    if (Number.isFinite(d) && (!best || d < best.moves)) best = { piece: p.kind, moves: d };
  }
  return best;
}

export { clockOf };
