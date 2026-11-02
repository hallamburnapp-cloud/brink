/**
 * What an order would do, said before you pay (SPEC-SMALL rulings after the second review: "The three lines stay on
 * the sheet" and "A form that will fail says so before you pay"). Pure questions about a state in the act phase, for
 * the screens' slips and note: the three declarations in their tape words; the declared line a move or a promise
 * would cross; the rings a move would leave dashed; whether a ring on a place will be a call; the places that fall
 * when this week resolves unless something of yours answers them, and whether those falls would be world war.
 * Nothing here changes a state.
 */
import { holdInfo, isAnswered, pieceOf, pressedRegions, promiseAt, weeksLeft } from './board.ts';
import { RULES } from './rules.ts';
import type { GameState, Line, PieceKind, RegionId } from './types.ts';

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
 * Whether a promise on this place will be a call when the week resolves: one of their arrows points at it (a real push
 * or a feint alike: a ring on an arrow's target turns the push into a test), and no other test is on the line.
 */
export function promiseWillRing(s: GameState, region: RegionId): boolean {
  if (s.pendingTest || s.regions[region]?.state === 'fighting') return false;
  if (!s.fed.headings.some((h) => h.to === region)) return false;
  // At most one test a week: the first arrow at a promised place rings.
  const first = s.fed.headings.find((h) => h.to === region || !!promiseAt(s, h.to));
  return !first || first.to === region;
}

/**
 * The places that fall when this week resolves unless something of yours answers them first: pressed, unanswered, one
 * week left on the clock (the single ringed tick). The sheet's own clock (`weeksLeft`), so the note never disagrees.
 */
export function fallsThisWeek(s: GameState): RegionId[] {
  if (s.phase !== 'act') return [];
  return pressedRegions(s).filter((r) => !isAnswered(s, r) && s.pendingTest !== r && weeksLeft(s, r) === 1);
}

/** Whether those falls would make the eighth place fighting: world war when the week resolves (the note says so). */
export function fallsEndTheGame(s: GameState): boolean {
  const n = fallsThisWeek(s).length;
  return n > 0 && s.war + n >= RULES.warLimit;
}
