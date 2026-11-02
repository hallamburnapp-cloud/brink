/**
 * The game (BUILD.md "The engine"): a new game with its opening collision, the player's acts in the
 * week (promise, withdraw, move a piece, offer a way out), SEND ORDERS (endWeek), the phone's answer.
 * Every act takes a state and returns a Result holding a NEW state, or a refusal code (the words for
 * it are in strings.refusals). endWeek and answerPhone take the content, because the week writes words.
 */
import { Rng } from '../../engine/rng.ts';
import { planHeadings, wayOutTooSoon } from './agent.ts';
import { draft, emptyTally, holdInfo, nearestPiece, pieceAt, pieceOf, promiseAt, reachableWithoutLines, say, type HoldInfo } from './board.ts';
import type { LineDef, RedlinesContent, RefusalCode } from './content.ts';
import { answerCost } from './phone.ts';
import { BRIGADE_START, FLEET_START, applyAnswer, beginWeek, finishWeek, homeOf } from './resolve.ts';
import { RULES } from './rules.ts';
import type { GameState, Line, PieceKind, PromiseMark, RegionId, RegionRec, Result, WayOutTerm } from './types.ts';
import { cap, fill } from './words.ts';
import { HOME_CAPITAL, REGION_IDS, blocOf, distanceFromCap, isCap, kindMoves, pieceDistance, regionName } from './world.ts';

const ok = (state: GameState): Result => ({ ok: true, state });
const no = (reason: RefusalCode): Result => ({ ok: false, reason });

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Week 1: the dials, three lines (two real, one bluff), one or two inherited promises, and the
 * collision: an inherited promise on a place a real line covers (keeping the promise, or making it
 * good, crosses the line), written in plain words; their first heading aims at it when it is dashed.
 */
export function newGame(content: RedlinesContent, seed: string): GameState {
  if (content.lines.length < 3) throw new Error('the pack needs at least three lines');
  const rng = new Rng(`${seed}:setup`);
  const span = RULES.dialMax - RULES.dialMin;
  const appetite = round2(RULES.dialMin + span * rng.next());
  const jumpiness = round2(RULES.dialMin + span * rng.next());
  const picked = rng.shuffle([...content.lines]).slice(0, 3);
  const bluffIndex = rng.int(3);
  const lines: Line[] = picked.map((l, i) => ({ id: l.id, text: l.text, real: i !== bluffIndex, kind: l.kind, regions: [...l.regions], tape: l.tape ?? l.text }));
  const regions: Record<RegionId, RegionRec> = Object.fromEntries(REGION_IDS.map((r) => [r, { state: 'calm' as const, pressedWeeks: 0, quietWeeks: 0 }]));
  const s: GameState = {
    seed,
    week: 1,
    phase: 'act',
    influence: RULES.influenceStart,
    regions,
    promises: [],
    pieces: [
      { kind: 'fleet', at: FLEET_START },
      { kind: 'brigade', at: BRIGADE_START },
    ],
    fed: { appetite, jumpiness, step: 1, belief: RULES.beliefStart, will: RULES.willStart, lines, headings: [] },
    war: 0,
    treaty: RULES.willStart,
    phone: null,
    pendingTest: null,
    log: [],
    ending: null,
    collision: '',
    headline: [],
    offer: null,
    moved: [],
    acts: [],
    signed: 0,
    waysOut: 0,
    crossed: {},
    pendingRound: 1,
    turnedAway: {},
    events: 0,
    phonesUsed: [],
    lastBacked: null,
    beliefWas: RULES.beliefStart,
    feintGone: null,
    tally: emptyTally(),
  };
  // The collision: an inherited promise on a place one of the three declared lines covers (SPEC-SMALL "The bluff is
  // not a free read": drawn from any of the three, the bluff included). Every sentence is true of the sheet:
  // - alliance (3): the promise itself is on the line; keeping it crosses it;
  // - forces (2 near their border, 1 far): nothing of ours can hold it by a route that crosses no declared line, and
  //   the piece named can get there, across this line (SPEC-SMALL "Out of reach means out of reach");
  // - near (0.5): a piece holds it already, and standing in it would cross the line.
  // A place a piece could walk to without crossing a line is no dilemma and is not drawn. The pick is weighted, so
  // openings differ by seed; a Sound collision weighs less (the first fronts touch the Scatter and Highmarch first).
  type Collision = { def: LineDef; region: RegionId; kind: 'alliance' | 'forces' | 'near'; score: number; piece: PieceKind };
  const options: Collision[] = [];
  const crosses = (def: LineDef, kind: PieceKind) => def.kind === 'proximity' || (def.kind === 'sea' && kind === 'fleet') || (def.kind === 'missiles' && kind === 'brigade');
  for (const def of rng.shuffle([...picked])) {
    const regs = def.regions.filter((r) => !isCap(r));
    if (!regs.length) continue;
    if (def.kind === 'alliance') {
      const dashed = regs.filter((r) => !holdInfo(s, r).ok);
      const nearDashed = dashed.filter((r) => distanceFromCap(r) <= RULES.reach);
      const region = rng.pick(nearDashed.length ? nearDashed : dashed.length ? dashed : regs);
      options.push({ def, region, kind: 'alliance', score: 3, piece: nearestPiece(s, region).kind });
      continue;
    }
    // A piece that could get there at all, and whose standing there crosses this line.
    const sender = (r: RegionId) => s.pieces.filter((p) => crosses(def, p.kind) && Number.isFinite(pieceDistance(p.kind, p.at, r))).sort((a, b) => pieceDistance(a.kind, a.at, r) - pieceDistance(b.kind, b.at, r))[0];
    const forces = regs.filter((r) => !holdInfo(s, r).ok && !reachableWithoutLines(s, r) && sender(r));
    const near = regs.filter((r) => {
      const h = holdInfo(s, r);
      return h.ok && h.piece && crosses(def, h.piece.kind) && h.piece.at !== r;
    });
    if (forces.length) {
      const nearCap = forces.filter((r) => distanceFromCap(r) <= RULES.reach);
      const region = rng.pick(nearCap.length ? nearCap : forces);
      options.push({ def, region, kind: 'forces', score: nearCap.length ? 2 : 1, piece: sender(region)!.kind });
    } else if (near.length) {
      const region = rng.pick(near);
      options.push({ def, region, kind: 'near', score: 0.5, piece: holdInfo(s, region).piece!.kind });
    }
  }
  for (const o of options) if (blocOf(o.region) === 'SND') o.score *= RULES.earlyFronts.soundScale * 2;
  let collision: Collision | null = null;
  if (options.length) {
    const strong = options.filter((o) => o.kind !== 'near');
    const from = strong.length ? strong : options;
    const i = rng.weightedIndex(from.map((o) => o.score));
    collision = from[i < 0 ? 0 : i];
  }
  const inherited: PromiseMark[] = [];
  if (collision) {
    inherited.push({ region: collision.region, since: 0, inherited: true });
    const C = content.strings.collision;
    const piece = content.strings.pieces[collision.piece];
    s.collision = cap(fill(collision.kind === 'alliance' ? C.alliance : collision.kind === 'forces' ? C.forces : C.near, { region: regionName(collision.region), line: collision.def.text, piece }));
  }
  // A second inherited promise, half the time, somewhere else outside the Cap and not fighting; never Edda Vale,
  // the Republic's own capital (nobody inherits a promise to defend their own capital).
  if (rng.next() < 0.5) {
    const pool = REGION_IDS.filter((r) => !isCap(r) && r !== HOME_CAPITAL && !inherited.some((p) => p.region === r) && distanceFromCap(r) <= RULES.reach + 1);
    if (pool.length) inherited.push({ region: rng.pick(pool), since: 0, inherited: true });
  }
  s.promises = inherited;
  // The opening's tape: the inherited promises, then the three declared lines last, so the tape's last three lines are
  // the three declarations (SPEC-SMALL "The three lines stay on the sheet"). The pack's short form of a declaration is
  // printed when it has one; the whole line runs off the paper.
  for (const p of inherited) say(content, s, 'inherited', { region: p.region });
  for (const l of picked) say(content, s, 'declared', { line: l.tape ?? l.text });
  s.log = [];

  // Their first headings: at the collision when it is dashed (the inherited promise is tested), else by appetite.
  const force = collision && !holdInfo(s, collision.region).ok ? collision.region : null;
  const plan = planHeadings(s, rng, force, 1);
  s.fed.headings = plan.headings;
  if (!s.collision) {
    const first = plan.headings.find((h) => h.real && promiseAt(s, h.to)) ?? plan.headings[0];
    if (first && inherited.length) s.collision = fill(content.strings.collision.heading, { region: regionName(promiseAt(s, first.to) ? first.to : inherited[0].region) });
  }
  return s;
}

/** BUILD: outside the Cap, calm or pressed, fewer than three promises, influence for the garrison. */
export function canPromise(s: GameState, region: RegionId): { ok: boolean; reason?: RefusalCode } {
  if (s.phase !== 'act') return { ok: false, reason: 'not-this-phase' };
  if (!s.regions[region] || isCap(region)) return { ok: false, reason: 'inside-the-cap' };
  if (s.regions[region].state === 'fighting') return { ok: false, reason: 'already-fighting' };
  if (promiseAt(s, region)) return { ok: false, reason: 'already-promised' };
  if (s.promises.length >= RULES.maxPromises) return { ok: false, reason: 'three-promises' };
  if (s.influence < RULES.promiseCost) return { ok: false, reason: 'no-influence' };
  return { ok: true };
}

/** BUILD: a piece within reach (there, or one move away), the region not inside the Cap. `why` is a strings.hold code. */
export function holdable(s: GameState, region: RegionId): HoldInfo {
  return holdInfo(s, region);
}

export function promise(s: GameState, region: RegionId): Result {
  const can = canPromise(s, region);
  if (!can.ok) return no(can.reason!);
  const n = draft(s);
  // SPEC-SMALL "No formula wins": a ring drawn on a place already under siege is a provocation (a call, not a pause).
  n.promises.push({ region, since: n.week, inherited: false, ...(isProvocation(n, region) ? { provocation: true } : {}) });
  n.influence -= RULES.promiseCost;
  n.acts.push({ kind: 'promise', region });
  return ok(n);
}

/**
 * SPEC-SMALL "No formula wins": a ring drawn on a place already under siege (hatched, and no piece of yours standing in
 * it) is a provocation. They test it unless they believe you; until then it pauses no clock (a call, not a pause).
 * The PROMISE slip says so before you pay.
 */
export function isProvocation(s: GameState, region: RegionId): boolean {
  return RULES.provocationRings && s.regions[region]?.state === 'pressed' && !pieceAt(s, region) && !promiseAt(s, region);
}

/** BUILD: withdraw: belief −5, no other cost. Not the promise under test (that is backing down: answer the phone). */
export function withdraw(s: GameState, region: RegionId): Result {
  if (s.phase !== 'act') return no('not-this-phase');
  if (!promiseAt(s, region)) return no('not-promised');
  if (s.pendingTest === region) return no('under-test');
  const n = draft(s);
  n.promises = n.promises.filter((p) => p.region !== region);
  n.fed.belief = Math.max(0, n.fed.belief - RULES.withdrawBelief);
  n.acts.push({ kind: 'withdraw', region });
  return ok(n);
}

/** Where a piece may go this week (empty when it has moved). */
export function movesFor(s: GameState, kind: PieceKind): RegionId[] {
  const piece = pieceOf(s, kind);
  if (!piece || s.moved.includes(kind)) return [];
  return kindMoves(kind, piece.at, pieceOf(s, 'fleet')?.at ?? null);
}

/** BUILD: one move per piece per week; the fleet on lanes and coasts, the brigade on land joins (or across a lane the fleet holds); cost 3. */
export function movePiece(s: GameState, kind: PieceKind, region: RegionId): Result {
  if (s.phase !== 'act') return no('not-this-phase');
  const piece = pieceOf(s, kind);
  if (!piece) return no('no-such-piece');
  if (s.moved.includes(kind)) return no('moved-already');
  if (!movesFor(s, kind).includes(region)) return no('not-adjacent');
  if (s.influence < RULES.moveCost) return no('no-influence');
  const n = draft(s);
  pieceOf(n, kind)!.at = region;
  n.influence -= RULES.moveCost;
  n.moved.push(kind);
  n.acts.push({ kind: 'move', piece: kind, to: region });
  return ok(n);
}

/**
 * Whether a way out can be offered now, and the reason when not (SPEC-SMALL "A form that will fail says so before you
 * pay"): not before RULES.wayOut.fromWeek ('too-early': they will not talk yet), not the week after a way out (yours or
 * their summit) was accepted ('too-soon': at most one in any two weeks, a refusal fixed in advance), no promise to drop
 * ('no-promises'), a piece already at home ('piece-home'), one a week, and the price in hand. With no `detail` it answers for the term
 * as a whole (any promise to drop, any piece away from home), which is what the form dims.
 */
export function canOfferWayOut(s: GameState, term: WayOutTerm, detail?: RegionId | PieceKind): { ok: boolean; reason?: RefusalCode } {
  if (s.phase !== 'act') return { ok: false, reason: 'not-this-phase' };
  if (s.offer) return { ok: false, reason: 'offered-already' };
  const price = RULES.wayOutPrice[term];
  if (price === undefined) return { ok: false, reason: 'bad-term' };
  if (s.week < RULES.wayOut.fromWeek) return { ok: false, reason: 'too-early' };
  if (wayOutTooSoon(s)) return { ok: false, reason: 'too-soon' };
  if (term === 'drop-promise') {
    const droppable = s.promises.filter((p) => p.region !== s.pendingTest);
    if (!droppable.length) return { ok: false, reason: 'no-promises' };
    if (detail !== undefined && !promiseAt(s, detail)) return { ok: false, reason: 'not-promised' };
  } else if (term === 'pull-back') {
    if (detail !== undefined && detail !== 'fleet' && detail !== 'brigade') return { ok: false, reason: 'no-such-piece' };
    const away = s.pieces.filter((p) => p.at !== homeOf(p.kind) && (detail === undefined || p.kind === detail));
    if (!away.length) return { ok: false, reason: 'piece-home' };
  }
  if (s.influence < price) return { ok: false, reason: 'no-influence' };
  return { ok: true };
}

/** The pieces a pull-back can name: those away from home (a piece at home has nowhere to be pulled back to). */
export function pullBackPieces(s: GameState): PieceKind[] {
  return s.pieces.filter((p) => p.at !== homeOf(p.kind)).map((p) => p.kind);
}

/** BUILD: once a week; the price is paid now (10 to 25 by term); the answer lands at resolve. */
export function offerWayOut(s: GameState, term: WayOutTerm, detail?: RegionId | PieceKind): Result {
  if (s.phase !== 'act') return no('not-this-phase');
  if (s.offer) return no('offered-already');
  const price = RULES.wayOutPrice[term];
  if (price === undefined) return no('bad-term');
  let kept: RegionId | PieceKind | null = null;
  if (term === 'drop-promise') {
    if (!detail || !promiseAt(s, detail)) return no('not-promised');
    kept = detail;
  } else if (term === 'pull-back') {
    if (detail !== 'fleet' && detail !== 'brigade') return no('no-such-piece');
    kept = detail;
  }
  const can = canOfferWayOut(s, term, kept ?? undefined);
  if (!can.ok) return no(can.reason!);
  const n = draft(s);
  n.influence -= price;
  n.offer = { term, detail: kept, price };
  n.acts.push({ kind: 'way-out', term, detail: kept });
  return ok(n);
}

/** SEND ORDERS: the week resolves; the phone may ring (phase 'phone'), else the next week begins or the game ends. */
export function endWeek(content: RedlinesContent, s: GameState): GameState {
  if (s.phase !== 'act') return s;
  return beginWeek(content, draft(s));
}

/** Whether this answer can be given now (BACK IT needs the influence). */
export function canAnswer(s: GameState, key: 'back' | 'down' | 'wait'): { ok: boolean; reason?: RefusalCode } {
  if (s.phase !== 'phone' || !s.phone) return { ok: false, reason: 'no-such-phone' };
  if (answerCost(s, key) > s.influence) return { ok: false, reason: 'no-influence' };
  return { ok: true };
}

/** The answer; the week then finishes. WAIT carries a test to next week with the stakes up; the third WAIT is backing down. */
export function answerPhone(content: RedlinesContent, s: GameState, key: 'back' | 'down' | 'wait'): GameState {
  if (!canAnswer(s, key).ok) return s;
  const n = draft(s);
  applyAnswer(content, n, key);
  n.phone = null;
  return finishWeek(content, n);
}

export { finishWeek };
