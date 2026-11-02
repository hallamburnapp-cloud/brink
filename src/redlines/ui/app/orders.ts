/**
 * What an order would do before it is paid for (SPEC-SMALL, the second review's rulings: "A form that will fail
 * says so before you pay" and "The three lines stay on the sheet"), in the slips' words: the declared lines a move or
 * a promise would cross, in the line's own tape words; the rings a move would leave dashed; a ring on their arrow's
 * target being a call; why a way out cannot be offered yet. The questions are the engine's own (its forecast and
 * canOfferWayOut, through the seam), so a slip says exactly what the engine will do. No DOM, no signals.
 */
import {
  canOfferWayOut,
  content,
  isProvocation,
  linesCrossedByMove,
  linesCrossedByPromise,
  movePiece,
  promiseWillRing,
  pullBackPieces,
  regionName,
  RULES,
  ringsLeftDashed,
  type GameState,
  type PieceKind,
  type RegionId,
  type WayOutTerm,
} from './engine';
import { fill } from './words';

export interface MoveOutcome {
  /** The move is allowed (else the engine's refusal code). */
  ok: boolean;
  reason?: string;
  /** The declared lines it would cross, in their tape words. */
  crossings: string[];
  /** The rings that are solid now and would be dashed after it. */
  dashed: RegionId[];
}

/** A move, asked of the engine before it is made: allowed or why not, the lines it would cross, the rings it would leave dashed. */
export function tryMove(s: GameState, kind: PieceKind, region: RegionId): MoveOutcome {
  const res = movePiece(s, kind, region);
  if (!res.ok) return { ok: false, reason: res.reason, crossings: [], dashed: [] };
  return { ok: true, crossings: linesCrossedByMove(s, kind, region), dashed: ringsLeftDashed(s, kind, region) };
}

/** Whether a move needs the MOVE HERE slip first (it crosses a declared line or leaves a ring dashed). */
export function moveNeedsAsk(o: MoveOutcome): boolean {
  return o.ok && (o.crossings.length > 0 || o.dashed.length > 0);
}

/** "crosses a line · Wintermast: no Republic forces in the Sound": the pack's act.crosses with the line's tape words. */
export function crossingLine(tape: string): string {
  return fill(content.strings.act.crosses, { line: tape });
}

/** "leaves Driftholm's ring dashed": the pack's act.leavesDashed, for a ring a move would leave dashed. */
export function dashedLine(region: RegionId): string {
  return fill(content.strings.act.leavesDashed, { region: regionName(region) });
}

/** Every warning a move's MOVE HERE slip carries, in order: the lines it crosses, then the rings it leaves dashed. */
export function moveWarnings(o: MoveOutcome): string[] {
  return [...o.crossings.map(crossingLine), ...o.dashed.map(dashedLine)];
}

/**
 * What a promise's slip warns of before it is paid for: a declared line it crosses, a ring on their arrow's target
 * being a call, and a ring on a place already under siege being a provocation (the engine's isProvocation: it pauses
 * no clock, and they test it unless they believe it).
 */
export function promiseWarnings(s: GameState, region: RegionId): string[] {
  const out = linesCrossedByPromise(s, region).map(crossingLine);
  if (promiseWillRing(s, region)) out.push(content.strings.act.promiseCall);
  if (isProvocation(s, region)) out.push(content.strings.act.promiseProvokes);
  return out;
}

/**
 * Why a way-out term (or one promise, one piece) cannot be offered now, in the content's words, asked of the engine:
 * "needs 15 · you have 11" when the influence is short (the call's own line), else the engine's refusal (they will
 * not talk yet, it is at home already, no promise to drop). Null when it can be offered.
 */
export function wayOutBlock(s: GameState, term: WayOutTerm, detail?: RegionId | PieceKind): string | null {
  const S = content.strings;
  const can = canOfferWayOut(s, term, detail);
  if (can.ok) return null;
  if (can.reason === 'no-influence') return fill(S.phone.needs, { cost: RULES.wayOutPrice[term], influence: s.influence });
  return can.reason ? S.refusals[can.reason] : null;
}

/** The pieces PULL A PIECE BACK lists: only those away from home (the engine's pullBackPieces). */
export function pullable(s: GameState): PieceKind[] {
  return pullBackPieces(s);
}
