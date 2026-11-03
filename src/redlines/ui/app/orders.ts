/**
 * What an order would do before it is paid for (SPEC-SMALL, the second review's rulings: "A form that will fail
 * says so before you pay" and "The three lines stay on the sheet"), in the slips' words: the declared lines a move or
 * a promise would cross, in the line's own tape words; the rings a move would leave dashed; a ring on their arrow's
 * target being a call; why a way out cannot be offered yet. The questions are the engine's own (its forecast and
 * canOfferWayOut, through the seam), so a slip says exactly what the engine will do. No DOM, no signals.
 */
import {
  backCost,
  canOfferWayOut,
  content,
  holdable,
  isProvocation,
  leavesToFall,
  linesCrossedByMove,
  linesCrossedByPromise,
  movePiece,
  nearestHold,
  netActs,
  promiseTooLate,
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
import { dashedPriceLine, fill } from './words';

export interface MoveOutcome {
  /** The move is allowed (else the engine's refusal code). */
  ok: boolean;
  reason?: string;
  /** The declared lines it would cross, in their tape words. */
  crossings: string[];
  /** The rings that are solid now and would be dashed after it. */
  dashed: RegionId[];
  /** The pressed places it answers now that it would leave at their last tick (they fall this week). */
  falls: RegionId[];
}

/** A move, asked of the engine before it is made: allowed or why not, the lines it would cross, the rings it would leave dashed. */
export function tryMove(s: GameState, kind: PieceKind, region: RegionId): MoveOutcome {
  const res = movePiece(s, kind, region);
  if (!res.ok) return { ok: false, reason: res.reason, crossings: [], dashed: [], falls: [] };
  return { ok: true, crossings: linesCrossedByMove(s, kind, region), dashed: ringsLeftDashed(s, kind, region), falls: leavesToFall(s, kind, region) };
}

/** Whether a move needs the MOVE HERE slip first (it crosses a declared line, leaves a ring dashed, or leaves a pressed place to fall this week). */
export function moveNeedsAsk(o: MoveOutcome): boolean {
  return o.ok && (o.crossings.length > 0 || o.dashed.length > 0 || (o.falls ?? []).length > 0);
}

/** "crosses a line · Wintermast: no Republic forces in the Sound": the pack's act.crosses with the line's tape words. */
export function crossingLine(tape: string): string {
  return fill(content.strings.act.crosses, { line: tape });
}

/** "leaves Driftholm's ring dashed": the pack's act.leavesDashed, for a ring a move would leave dashed. */
export function dashedLine(region: RegionId): string {
  return fill(content.strings.act.leavesDashed, { region: regionName(region) });
}

/** "leaves Lantern Key to fall this week": the pack's act.leavesToFall (SPEC-SMALL "The note keeps its warning"). */
export function fallsLine(region: RegionId): string {
  return fill(content.strings.act.leavesToFall, { region: regionName(region) });
}

/** Every warning a move's MOVE HERE slip carries, in order: the lines it crosses, the rings it leaves dashed, the places it leaves to fall. */
export function moveWarnings(o: MoveOutcome): string[] {
  return [...o.crossings.map(crossingLine), ...o.dashed.map(dashedLine), ...(o.falls ?? []).map(fallsLine)];
}

/**
 * What a promise's slip warns of before it is paid for: a declared line it crosses, a ring on their arrow's target
 * being a call, and a ring on a place already under siege being a provocation (the engine's isProvocation: it pauses
 * no clock, and they test it unless they believe it).
 */
export function promiseWarnings(s: GameState, region: RegionId): string[] {
  const S = content.strings;
  const out = linesCrossedByPromise(s, region).map(crossingLine);
  if (promiseWillRing(s, region)) out.push(S.act.promiseCall);
  else if (promiseTooLate(s, region)) out.push(S.act.tooLate);
  const provokes = isProvocation(s, region);
  if (provokes) out.push(S.act.promiseProvokes);
  // A dashed ring, or one drawn into their siege (backed at the full price whatever they believe): how far the nearest
  // piece is from holding it, and what backing it will cost (the second recheck: the price was only seen once the phone rang).
  const ringed: GameState = { ...s, promises: [...s.promises, { region, since: s.week, inherited: false, ...(provokes ? { provocation: true } : {}) }] };
  const price = priceLine(ringed, region);
  if (price) out.push(price);
  return out;
}

/**
 * The price of keeping a ring, where the player decides whether to keep it (the PROMISE and WITHDRAW slips): for a
 * dashed ring, how far the nearest piece is and what BACK IT will cost when they test it; for a ring drawn into their
 * siege, the full price it is backed at. Null for a solid ring they would back at the usual price.
 */
export function priceLine(s: GameState, region: RegionId): string | null {
  const dashed = !holdable(s, region).ok;
  const provoked = !!s.promises.find((p) => p.region === region)?.provocation;
  if (!dashed && !provoked) return null;
  return dashedPriceLine(content.strings, dashed ? nearestHold(s, region) : null, backCost(s, region, 1));
}

/**
 * A promise drawn this week and withdrawn before the orders are sent is no order at all (the engine's withdraw gives
 * its 2 back and takes no belief): the WITHDRAW slip says so instead of "they'll believe us a little less".
 */
export function withdrawIsUndo(s: GameState, region: RegionId): boolean {
  const p = s.promises.find((q) => q.region === region);
  return !!p && !p.inherited && p.since === s.week && netActs(s.acts).some((a) => a.kind === 'promise' && a.region === region);
}

/**
 * What the WITHDRAW slip warns of: a ring that will cross a declared line when the week resolves (an inherited ring on a
 * place an alliance line covers: "keeping it crosses a line · Wintermast: no promises to the Scatter"), and what keeping
 * a dashed ring will cost when they test it ("the fleet is 3 moves away · backing it costs 24").
 */
export function withdrawWarnings(s: GameState, region: RegionId): string[] {
  const out = linesCrossedByPromise(s, region).map((line) => fill(content.strings.act.keepCrosses, { line }));
  const price = priceLine(s, region);
  if (price) out.push(price);
  return out;
}

/**
 * The WITHDRAW slip's cost line: quietly, at a little belief; or, for a ring drawn this week, the undo words
 * (act.undoCost: no order has gone, and the engine gives the promise's price back).
 */
export function withdrawCostLine(s: GameState, region: RegionId): string {
  const S = content.strings;
  if (!withdrawIsUndo(s, region)) return S.act.withdrawCost;
  return fill(S.act.undoCost, { cost: RULES.promiseCost });
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
