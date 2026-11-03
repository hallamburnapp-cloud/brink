/**
 * The state as the rules handle it: a safe copy, the small questions (is this promised, who can
 * hold it, is it answered), the small changes (press, fall, a step up or down, belief, will), and the
 * two kinds of line a week writes: what the tape shows and what the Federation thought.
 */
import type { HiddenKind, HoldCode, RedlinesContent, HeadlineKind } from './content.ts';
import { RULES, clamp100, clampStep, fallWeeksAt } from './rules.ts';
import type { Act, FallCause, GameState, Piece, PieceKind, PromiseMark, RegionId, Step, Tally, WeekLog } from './types.ts';
import { cap, fill, type Slots } from './words.ts';
import { REGION, isCap, kindMoves, mapOrder, pieceDistance, reachOf, regionName } from './world.ts';

/** A copy safe to change. */
export function draft(s: GameState): GameState {
  return {
    ...s,
    regions: Object.fromEntries(Object.entries(s.regions).map(([k, v]) => [k, { ...v }])),
    promises: s.promises.map((p) => ({ ...p })),
    pieces: s.pieces.map((p) => ({ ...p })),
    fed: { ...s.fed, lines: s.fed.lines.map((l) => ({ ...l, ...(l.regions ? { regions: [...l.regions] } : {}) })), headings: s.fed.headings.map((h) => ({ ...h })) },
    afterCall: s.afterCall ? s.afterCall.map((h) => ({ ...h })) : (s.afterCall ?? null),
    phone: s.phone ? { ...s.phone, caller: { ...s.phone.caller }, advisers: { ...s.phone.advisers }, options: s.phone.options.map((o) => ({ ...o })) } : null,
    log: s.log.map((w) => {
      const copy: WeekLog = { ...w, visible: [...w.visible], hidden: [...w.hidden], acts: [...w.acts], danger: { ...w.danger } };
      if (w.beats) copy.beats = w.beats.map((b) => ({ ...b }));
      return copy;
    }),
    ending: s.ending ? { ...s.ending, lines: [s.ending.lines[0], s.ending.lines[1]] } : null,
    headline: [...s.headline],
    offer: s.offer ? { ...s.offer } : null,
    moved: [...s.moved],
    acts: s.acts.map((a) => ({ ...a })),
    crossed: { ...s.crossed },
    turnedAway: { ...s.turnedAway },
    phonesUsed: [...s.phonesUsed],
    tally: copyTally(tallyOf(s)),
  };
}

/** A tally safe to change (its lists copied too). */
function copyTally(t: Tally): Tally {
  const out: Tally = { ...t };
  if (t.backDowns) out.backDowns = t.backDowns.map((b) => ({ ...b }));
  if (t.jumpyFirst) out.jumpyFirst = { ...t.jumpyFirst };
  if (t.ringed) out.ringed = [...t.ringed];
  if (t.noSign) out.noSign = { ...t.noSign, regions: [...t.noSign.regions] };
  if (t.smallThings) out.smallThings = [...t.smallThings];
  return out;
}

/** A fresh tally (a new game, or an old save without one). */
export function emptyTally(): Tally {
  return {
    testsSolid: 0,
    testsDashed: 0,
    backed: 0,
    backedDown: 0,
    backedDownFirst: null,
    feintsBacked: 0,
    feintBackedFirst: null,
    outOfReach: 0,
    outOfReachFirst: null,
    moves: 0,
    idleWeeks: 0,
    farDrops: 0,
    farDropFirst: null,
    stoppedThenTalked: 0,
    jumpinessSeen: false,
    backDowns: [],
    idleAnswerable: 0,
    jumpySteps: 0,
    jumpyFirst: null,
    eased: 0,
  };
}
/** The game's tally, zeros when the state has none. */
export function tallyOf(s: GameState): Tally {
  return s.tally ?? emptyTally();
}
/** The tally on a draft, created when missing, so a rule can count into it. */
export function tally(s: GameState): Tally {
  if (!s.tally) s.tally = emptyTally();
  return s.tally;
}

export function promiseAt(s: GameState, region: RegionId): PromiseMark | undefined {
  return s.promises.find((p) => p.region === region);
}
export function pieceAt(s: GameState, region: RegionId): Piece | undefined {
  return s.pieces.find((p) => p.at === region);
}
export function pieceOf(s: GameState, kind: PieceKind): Piece | undefined {
  return s.pieces.find((p) => p.kind === kind);
}
export function fleetAt(s: GameState): RegionId | null {
  return pieceOf(s, 'fleet')?.at ?? null;
}

export interface HoldInfo {
  ok: boolean;
  why: HoldCode;
  /** The piece that holds it (standing there, or one move away). */
  piece?: Piece;
}

/**
 * BUILD: a promise is solid (holdable) when a piece is within reach: in the region, or one move away
 * (a land join for the brigade; a lane or the coast for the fleet), and the region is not inside the Cap.
 */
export function holdInfo(s: GameState, region: RegionId): HoldInfo {
  if (isCap(region)) return { ok: false, why: 'inside-the-cap' };
  const there = pieceAt(s, region);
  if (there) return { ok: true, why: 'piece-there', piece: there };
  for (const p of s.pieces) if (reachOf(p).includes(region)) return { ok: true, why: 'piece-near', piece: p };
  return { ok: false, why: 'out-of-reach' };
}

/**
 * Ruling: a pressed place is answered, and its fall clock paused, when a piece of yours stands in it,
 * or a solid promise covers it and that promise is not the one under test.
 */
export function isAnswered(s: GameState, region: RegionId): boolean {
  if (pieceAt(s, region)) return true;
  const pm = promiseAt(s, region);
  if (!pm || s.pendingTest === region || !holdInfo(s, region).ok) return false;
  // A ring drawn on a place already under siege pauses nothing until they believe it or it is backed (a call, not a pause).
  // Whether they believe it is read at the week's start (beliefWas): a belief won or lost on this week's call changes it
  // at the turn of the week, so the clock the sheet and the slips showed at SEND ORDERS is the clock the week runs.
  return !pm.provocation || !RULES.provocationRings || (s.beliefWas ?? s.fed.belief) >= RULES.provocationBelief;
}

/** A ring they believe: solid, and their belief in your promises at RULES.beliefTest or more (what BACK IT's lower price shows). */
export function believedRing(s: GameState, region: RegionId): boolean {
  return !!promiseAt(s, region) && holdInfo(s, region).ok && s.fed.belief >= RULES.beliefTest;
}
/** A provocation ring they believe (round 15: the belief it takes is RULES.provocationBelief). */
export function provocationBelieved(s: GameState, region: RegionId): boolean {
  return !!promiseAt(s, region) && holdInfo(s, region).ok && s.fed.belief >= RULES.provocationBelief;
}

/**
 * The hatched places that stand unanswered: pressed, nothing of yours answering them, and pressed for at least a week
 * already (their clock has ticked once with nothing of yours there; a place pushed this very week has not yet been
 * yours to answer). The treaty is not signed over them, and a way out is accepted less while they stand (SPEC-SMALL
 * "No formula wins", "The treaty is signed over a quiet map").
 */
export function unansweredRegions(s: GameState, reachOnly: boolean = RULES.standingReach): RegionId[] {
  return pressedRegions(s).filter((r) => !isAnswered(s, r) && s.regions[r].pressedWeeks >= RULES.standingWeeks && (!reachOnly || s.pieces.some((p) => holdDistance(s, p, r) <= RULES.standingReachMoves)));
}

export function fightingRegions(s: GameState): RegionId[] {
  return mapOrder(Object.keys(s.regions).filter((r) => s.regions[r].state === 'fighting'));
}
export function pressedRegions(s: GameState): RegionId[] {
  return mapOrder(Object.keys(s.regions).filter((r) => s.regions[r].state === 'pressed'));
}
/** The places that fell in the given week (the week's gains). */
export function fellIn(s: GameState, week: number): RegionId[] {
  return mapOrder(Object.keys(s.regions).filter((r) => s.regions[r].state === 'fighting' && s.regions[r].fellWeek === week));
}

/** Their forces move in: calm becomes pressed (clock at 0, its length the step's clock now); pressed stays pressed with its quiet weeks reset. */
export function press(s: GameState, region: RegionId): boolean {
  const rec = s.regions[region];
  if (rec.state === 'fighting') return false;
  rec.quietWeeks = 0;
  if (rec.state === 'pressed') return false;
  rec.state = 'pressed';
  rec.pressedWeeks = 0;
  rec.clock = fallWeeksAt(s.fed.step);
  delete rec.noteFar;
  delete rec.noteNear;
  return true;
}

/**
 * SPEC-SMALL "The ladder is not a cliff, at any rung": the length of a pressed place's fall clock. Each place keeps its
 * own, set when it was pressed and moved at most one tick by each step of the ladder (`shiftClocks`); an old save
 * without one reads the clock of the step the week started at, as before.
 */
export function clockOf(s: GameState, region: RegionId): number {
  return s.regions[region]?.clock ?? fallWeeksAt(stepAtWeekStart(s));
}

/** A clock starts again (a promise backed and held, an island backed, a piece sent in): no ticks run, the step's clock now. */
export function restartClock(s: GameState, region: RegionId): void {
  const rec = s.regions[region];
  if (rec.state !== 'pressed') return;
  rec.pressedWeeks = 0;
  rec.clock = fallWeeksAt(s.fed.step);
}

/**
 * The weeks a running clock has left after a step of the ladder (SPEC-SMALL "A step up shortens a running clock by at
 * most one tick; a place keeps the clock it had less one"): up, the shorter of what it had and the new step's clock, but
 * never more than one tick less; down, the longer, never more than one tick more. `left` counts the week-ends still to
 * run; a clock with one left keeps it (a step never makes a place fall a week sooner than its last tick said).
 */
export function shiftedLeft(left: number, step: Step, dir: 1 | -1): number {
  const c = fallWeeksAt(step);
  if (dir > 0) return left <= 1 ? left : RULES.clockUpOneTick ? left - 1 : Math.max(left - 1, Math.min(left, c));
  return left < 1 ? left : Math.min(left + 1, Math.max(left, c));
}

/** Every running clock (a pressed place nothing of yours answers) moves with a step of the ladder: at most one tick. */
function shiftClocks(s: GameState, dir: 1 | -1): void {
  for (const r of Object.keys(s.regions)) {
    const rec = s.regions[r];
    if (rec.state !== 'pressed' || isAnswered(s, r)) continue;
    const clock = clockOf(s, r);
    rec.clock = rec.pressedWeeks + shiftedLeft(clock - rec.pressedWeeks, s.fed.step, dir);
  }
}

/**
 * The place falls: fighting; any promise on it is void. `by` is kept for the WORLD WAR sentence unless a
 * back-down already named the cause. The fall's order over the game (fellSeq) is what the WORLD WAR card
 * reads ("it began at ..."), and whether something of yours could have reached it (fellReach) is what the
 * ladder reads (a fall out of reach climbs no step).
 */
export function fall(s: GameState, region: RegionId, by: FallCause): void {
  const rec = s.regions[region];
  // SPEC-SMALL "An out-of-reach fall is war, not a failure": the reckoning agrees with the note. A place the note called
  // out of reach in any week it stood hatched is never reachable; one the note said a piece could reach this week was.
  rec.fellReach = rec.noteFar ? false : rec.noteNear === s.week ? true : couldHaveReached(s, region, rec.pressedWeeks);
  delete rec.noteFar;
  delete rec.noteNear;
  rec.fellSeq = nextFallSeq(s);
  rec.state = 'fighting';
  rec.fellWeek = s.week;
  rec.pressedWeeks = 0;
  rec.quietWeeks = 0;
  delete rec.clock;
  if (!rec.fellBy || by === 'spread') rec.fellBy = by;
  removePromise(s, region);
  if (s.pendingTest === region) s.pendingTest = null;
  // SPEC-SMALL "Sentences are true": a place they took is never the treaty's "they could not take X".
  if (s.lastBacked === region) s.lastBacked = null;
  countWar(s);
}
/** SPEC-SMALL ruling ("The WAR boxes always match the sheet"): the count of places fighting, kept current by every fall and recovery. */
export function countWar(s: GameState): number {
  s.war = Object.values(s.regions).filter((r) => r.state === 'fighting').length;
  return s.war;
}
/**
 * SPEC-SMALL: "a place taken unanswered that something of yours could have reached" is a step up; one no piece
 * could reach falls without a step. Could have reached: a piece of yours could have been within one move of the
 * place (holding it) by the time it fell, given the weeks of orders it stood pressed (`weeks`: its pressed weeks at the
 * fall, the fall week included, one move a week): its own distance to the place, less the one move that still holds it,
 * within `weeks`. Round 17 (the third recheck): the week's warning the arrow gave is no longer counted (it gave one move
 * more than the player had, and the tape climbed a step under a note that had said nothing of ours could reach it).
 */
export function couldHaveReached(s: GameState, region: RegionId, weeks: number): boolean {
  if (holdInfo(s, region).ok) return true;
  return s.pieces.some((p) => holdDistance(s, p, region) <= weeks + (RULES.reachArrowWeek ? 1 : 0));
}

/**
 * SPEC-SMALL "Out of reach means out of reach": the places a declared line not yet crossed closes to a piece of this
 * kind (a proximity line to both, a sea line to the fleet, a missiles line to the brigade; the player is not told
 * which line is the bluff, so all three close). A route through them is not a route.
 */
export function closedTo(s: GameState, kind: PieceKind): Set<RegionId> {
  const out = new Set<RegionId>();
  for (const l of s.fed.lines) {
    if (s.crossed[l.id] !== undefined || !l.regions || !l.kind) continue;
    if (l.kind === 'proximity' || (l.kind === 'sea' && kind === 'fleet') || (l.kind === 'missiles' && kind === 'brigade')) for (const r of l.regions) out.add(r);
  }
  return out;
}

/**
 * The moves a piece needs to hold `region` (stand in it, or one move from it) by a route that crosses no declared line:
 * 0 when it holds it now, Infinity when no such route exists. A piece already standing inside a line is not stopped
 * from moving out of it.
 */
export function holdDistance(s: GameState, piece: Piece, region: RegionId): number {
  const closed = closedTo(s, piece.kind);
  const fleetAt = null;
  const seen = new Map<RegionId, number>([[piece.at, 0]]);
  const queue: RegionId[] = [piece.at];
  let best = Infinity;
  while (queue.length) {
    const cur = queue.shift()!;
    const d = seen.get(cur)!;
    if (d >= best) break;
    if (reachOf({ kind: piece.kind, at: cur }).includes(region)) {
      best = d;
      break;
    }
    for (const n of kindMoves(piece.kind, cur, fleetAt)) {
      if (seen.has(n) || closed.has(n)) continue;
      seen.set(n, d + 1);
      queue.push(n);
    }
  }
  return best;
}
/**
 * The piece a call or a thought names for a place: the one that holds it, else the one with the fewest moves to it by
 * its own routes (the fleet for an island the brigade can never reach), the fleet on a tie.
 */
export function nearestPiece(s: GameState, region: RegionId): Piece {
  const hold = holdInfo(s, region);
  if (hold.ok && hold.piece) return hold.piece;
  let best = s.pieces[0];
  let bestD = Infinity;
  for (const p of s.pieces) {
    const d = pieceDistance(p.kind, p.at, region);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  if (!Number.isFinite(bestD)) return s.pieces.find((p) => p.kind === (REGION[region]?.island ? 'fleet' : 'brigade')) ?? s.pieces[0];
  return best;
}

/** Whether a piece of yours could ever hold the place without crossing a declared line (the collision's "nothing of ours can reach it" is the opposite). */
export function reachableWithoutLines(s: GameState, region: RegionId): boolean {
  return s.pieces.some((p) => Number.isFinite(holdDistance(s, p, region)));
}
/** One more than the highest fall number so far (1 for the first fall of the game). */
export function nextFallSeq(s: GameState): number {
  let max = 0;
  for (const r of Object.values(s.regions)) {
    const n = fallOrder(r);
    if (n !== undefined && n > max) max = n;
  }
  return max + 1;
}
/** Where a fall stands in the game's order: its fellSeq, or (a state made by hand, an old save) its week times a thousand. */
export function fallOrder(rec: { fellSeq?: number; fellWeek?: number }): number | undefined {
  if (rec.fellSeq !== undefined) return rec.fellSeq;
  return rec.fellWeek !== undefined ? rec.fellWeek * 1000 : undefined;
}
/** SPEC-SMALL ruling: a piece standing in a place, or a solid promise on it, spares it from the spread of the fighting. */
export function isSpared(s: GameState, region: RegionId): boolean {
  if (pieceAt(s, region)) return true;
  return !!promiseAt(s, region) && holdInfo(s, region).ok;
}
/** The step the week started at: the log entry `beginWeek` opens records it before anything moves (until round 16 every fall clock read that step; now only a clock an old save does not carry, `clockOf`). */
export function stepAtWeekStart(s: GameState): Step {
  const log = s.log[s.log.length - 1];
  return log && log.week === s.week ? log.danger.step : s.fed.step;
}

/**
 * SPEC-SMALL ruling ("A pressed place shows its clock"): the week-ends left before a pressed, unanswered place
 * falls on its own fall clock, as the engine counts it (`clockOf`: 3, 2 or 1 by the step it was pressed at, less at most
 * one tick for each step up since; 1: it falls when this week resolves, unless something of yours answers it first). Null for a place that is not pressed, is
 * already fighting, or is answered now (a piece of yours stands in it, or a solid promise covers it and is not
 * the one under test: its clock is paused), and once the game has ended. In the act phase it reads the clock the
 * coming resolve will read; on the phone (this week's tick already counted) it counts this week's end as one.
 */
export function weeksLeft(s: GameState, region: RegionId): number | null {
  const rec = s.regions[region];
  if (!rec || rec.state !== 'pressed' || s.phase === 'ended') return null;
  if (isAnswered(s, region)) return null;
  const clock = clockOf(s, region);
  const left = clock - rec.pressedWeeks + (s.phase === 'phone' ? 1 : 0);
  return Math.min(clock, Math.max(1, left));
}

export function removePromise(s: GameState, region: RegionId): void {
  s.promises = s.promises.filter((p) => p.region !== region);
}

/** A step up the ladder; every running clock is shortened by at most one tick (SPEC-SMALL "The ladder is not a cliff, at any rung"). */
export function stepUp(s: GameState): boolean {
  const before = s.fed.step;
  s.fed.step = clampStep(before + 1);
  if (s.fed.step === before) return false;
  shiftClocks(s, 1);
  return true;
}

/**
 * A step down (a promise backed and held, a way out accepted): the ladder word eases at once. Ruling: a step down
 * also quiets one fighting place (`recoverOne`), which the resolve does after it has printed the step's cause.
 * Returns whether the step changed.
 */
export function stepDown(s: GameState): boolean {
  const before = s.fed.step;
  s.fed.step = clampStep(before - 1);
  if (s.fed.step === before) return false;
  if (RULES.clockShiftDown) shiftClocks(s, -1);
  return true;
}

/**
 * SPEC-SMALL ruling ("a place that falls stays fallen that week"): only a place that fell in an earlier week can
 * come back. The most recently fallen of those becomes pressed again ("Guns quiet at X"); null when there is none.
 */
export function recoverOne(s: GameState): RegionId | null {
  const pool = fightingRegions(s).filter((r) => canRecover(s, r));
  if (!pool.length) return null;
  const order = (r: RegionId) => fallOrder(s.regions[r]) ?? 0;
  let best = pool[0];
  for (const r of pool) if (order(r) > order(best)) best = r;
  recover(s, best);
  return best;
}
/** A fighting place that fell before this week (one that fell this week stays fallen until the week is over). */
export function canRecover(s: GameState, region: RegionId): boolean {
  const rec = s.regions[region];
  return rec.state === 'fighting' && (rec.fellWeek === undefined || rec.fellWeek < s.week);
}
/** The place becomes pressed again, its clock restarted. Only a place that fell before this week (see canRecover). */
export function recover(s: GameState, region: RegionId): boolean {
  if (!canRecover(s, region)) return false;
  const rec = s.regions[region];
  rec.state = 'pressed';
  rec.recoveredWeek = s.week;
  rec.pressedWeeks = 0;
  rec.quietWeeks = 0;
  rec.clock = fallWeeksAt(s.fed.step);
  delete rec.fellBy;
  countWar(s);
  return true;
}

export function believe(s: GameState, delta: number): void {
  s.fed.belief = clamp100(s.fed.belief + delta);
}
export function willing(s: GameState, delta: number): void {
  s.fed.will = clamp100(s.fed.will + delta);
  s.treaty = s.fed.will;
}

/** The week's log entry (the last one, which `beginWeek` opened). */
export function currentLog(s: GameState): WeekLog {
  const w = s.log[s.log.length - 1];
  if (w && w.week === s.week) return w;
  const fresh: WeekLog = { week: s.week, visible: [], hidden: [], acts: [], danger: { war: s.war, treaty: s.treaty, step: s.fed.step }, beats: [] };
  s.log.push(fresh);
  return fresh;
}

/** Common slots: the region's name, the step word. */
function baseSlots(c: RedlinesContent, s: GameState, slots: Slots): Slots {
  const out: Slots = { step: c.strings.words.steps[s.fed.step - 1], ...slots };
  if (typeof slots.region === 'string') out.region = regionName(slots.region);
  else if (slots.region === null) out.region = '';
  if (typeof slots.from === 'string') out.from = regionName(slots.from);
  if (typeof slots.at === 'string') out.at = regionName(slots.at);
  return out;
}

/**
 * A line on the tape (and in the week's visible log), with its facts beside it (`WeekLog.beats`: the kind, the
 * place, and the sheet right after it). The resolve says a line after the change it reports, so the facts are the
 * sheet the line describes.
 */
export function say(c: RedlinesContent, s: GameState, kind: HeadlineKind, slots: Slots = {}): string {
  // A tape line starts with a capital, whatever its first slot is ("Your promise at Driftholm crosses a line").
  const text = cap(fill(c.strings.headlines[kind], baseSlots(c, s, slots)));
  const log = currentLog(s);
  log.visible.push(text);
  const region = typeof slots.region === 'string' && REGION[slots.region] ? slots.region : null;
  (log.beats ??= []).push({ kind, region, war: s.war, step: s.fed.step, treaty: s.fed.will });
  s.headline = [...s.headline, text].slice(-RULES.tapeLines);
  return text;
}

/** A hidden thought, for the debrief. The template is picked by the seed's week and the count so far. */
export function think(c: RedlinesContent, s: GameState, kind: HiddenKind, slots: Slots = {}): string {
  const pool = c.debrief[kind] ?? [`${kind}`];
  const log = currentLog(s);
  const template = pool[(s.week * 7 + log.hidden.length) % pool.length];
  const text = fill(template, baseSlots(c, s, slots));
  log.hidden.push(text);
  return text;
}

/**
 * The week's orders with the cancelled ones taken out: a promise withdrawn the same week (or a withdrawal
 * promised over again) is no order at all, so the debrief's "what you did" never reads "You promised to defend
 * Vessary. You withdrew your promise to Vessary. You promised to defend Vessary." (The screens' note does the same.)
 */
export function netActs(acts: readonly Act[]): Act[] {
  const out: Act[] = [];
  for (const a of acts) {
    if (a.kind === 'promise' || a.kind === 'withdraw') {
      const opposite = a.kind === 'promise' ? 'withdraw' : 'promise';
      const i = out.findIndex((b) => b.kind === opposite && b.region === a.region);
      if (i >= 0) {
        out.splice(i, 1);
        continue;
      }
    }
    out.push(a);
  }
  return out;
}

/** The player's own line in the week's acts. */
export function note(s: GameState, text: string): void {
  currentLog(s).acts.push(text);
}
