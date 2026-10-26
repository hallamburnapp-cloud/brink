/**
 * The game (BUILD.md "The engine"): a new game with its opening collision, the player's acts in the
 * week (promise, withdraw, move a piece, offer a way out), SEND ORDERS (endWeek), the phone's answer.
 * Every act takes a state and returns a Result holding a NEW state, or a refusal code (the words for
 * it are in strings.refusals). endWeek and answerPhone take the content, because the week writes words.
 */
import { Rng } from '../../engine/rng.ts';
import { planHeadings } from './agent.ts';
import { draft, emptyTally, holdInfo, pieceOf, promiseAt, say, type HoldInfo } from './board.ts';
import type { LineDef, RedlinesContent, RefusalCode } from './content.ts';
import { answerCost } from './phone.ts';
import { BRIGADE_START, FLEET_START, applyAnswer, beginWeek, finishWeek } from './resolve.ts';
import { RULES } from './rules.ts';
import type { GameState, Line, PieceKind, PromiseMark, RegionId, RegionRec, Result, WayOutTerm } from './types.ts';
import { fill } from './words.ts';
import { REGION_IDS, blocOf, distanceFromCap, isCap, kindMoves, regionName } from './world.ts';

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
  const lines: Line[] = picked.map((l, i) => ({ id: l.id, text: l.text, real: i !== bluffIndex }));
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
  // The tape prints the pack's short form of a declaration when it has one; the whole line runs off the paper.
  for (const l of picked) say(content, s, 'declared', { line: l.tape ?? l.text });
  s.log = [];

  // The collision: an inherited promise on a place a real line covers. The strongest kinds weigh most: a
  // promise that itself crosses the line (alliance, 3), one nothing of yours can reach near their border
  // (dashed: making it good means moving a piece across the line; 2), one far away (1); failing those, a
  // place a piece can reach but standing in it would cross the line (near). The pick is weighted rather than
  // the strongest every time, so openings differ by seed; a Sound collision weighs less (SPEC-SMALL: the first
  // fronts touch the Scatter and Highmarch before the Sound).
  const realDefs = picked.filter((_, i) => i !== bluffIndex);
  type Collision = { def: LineDef; region: RegionId; kind: 'alliance' | 'forces' | 'near'; score: number };
  const options: Collision[] = [];
  for (const def of rng.shuffle([...realDefs])) {
    const regs = def.regions.filter((r) => !isCap(r));
    if (!regs.length) continue;
    const dashed = regs.filter((r) => !holdInfo(s, r).ok);
    const nearDashed = dashed.filter((r) => distanceFromCap(r) <= RULES.reach);
    let kind: 'alliance' | 'forces' | 'near';
    let pool: RegionId[];
    let score: number;
    if (def.kind === 'alliance') {
      kind = 'alliance';
      pool = nearDashed.length ? nearDashed : dashed.length ? dashed : regs;
      score = 3;
    } else if (dashed.length) {
      kind = 'forces';
      pool = nearDashed.length ? nearDashed : dashed;
      score = nearDashed.length ? 2 : 1;
    } else {
      kind = 'near';
      pool = regs;
      score = 0.5;
    }
    const region = rng.pick(pool);
    if (blocOf(region) === 'SND') score *= RULES.earlyFronts.soundScale * 2;
    options.push({ def, region, kind, score });
  }
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
    const piece = content.strings.pieces[collision.def.kind === 'sea' ? 'fleet' : collision.def.kind === 'missiles' ? 'brigade' : 'brigade'];
    s.collision = fill(collision.kind === 'alliance' ? C.alliance : collision.kind === 'forces' ? C.forces : C.near, { region: regionName(collision.region), line: collision.def.text, piece });
  }
  // A second inherited promise, half the time, somewhere else outside the Cap and not fighting.
  if (rng.next() < 0.5) {
    const pool = REGION_IDS.filter((r) => !isCap(r) && !inherited.some((p) => p.region === r) && distanceFromCap(r) <= RULES.reach + 1);
    if (pool.length) inherited.push({ region: rng.pick(pool), since: 0, inherited: true });
  }
  s.promises = inherited;
  for (const p of inherited) say(content, s, 'inherited', { region: p.region });
  s.log = [];

  // Their first headings: at the collision when it is dashed (the inherited promise is tested), else by appetite.
  const force = collision && !holdInfo(s, collision.region).ok ? collision.region : null;
  const plan = planHeadings(s, rng, force);
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
  n.promises.push({ region, since: n.week, inherited: false });
  n.influence -= RULES.promiseCost;
  n.acts.push({ kind: 'promise', region });
  return ok(n);
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
  if (s.influence < price) return no('no-influence');
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
