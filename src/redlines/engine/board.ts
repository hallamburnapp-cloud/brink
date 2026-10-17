/**
 * The state as the rules handle it: a safe copy, the small questions (is this promised, who can
 * hold it, is it answered), the small changes (press, fall, a step up or down, belief, will), and the
 * two kinds of line a week writes: what the tape shows and what the Federation thought.
 */
import type { HiddenKind, HoldCode, RedlinesContent, HeadlineKind } from './content.ts';
import { RULES, clamp100, clampStep } from './rules.ts';
import type { FallCause, GameState, Piece, PieceKind, PromiseMark, RegionId, WeekLog } from './types.ts';
import { fill, type Slots } from './words.ts';
import { isCap, mapOrder, reachOf, regionName } from './world.ts';

/** A copy safe to change. */
export function draft(s: GameState): GameState {
  return {
    ...s,
    regions: Object.fromEntries(Object.entries(s.regions).map(([k, v]) => [k, { ...v }])),
    promises: s.promises.map((p) => ({ ...p })),
    pieces: s.pieces.map((p) => ({ ...p })),
    fed: { ...s.fed, lines: s.fed.lines.map((l) => ({ ...l })), headings: s.fed.headings.map((h) => ({ ...h })) },
    phone: s.phone ? { ...s.phone, caller: { ...s.phone.caller }, advisers: { ...s.phone.advisers }, options: s.phone.options.map((o) => ({ ...o })) } : null,
    log: s.log.map((w) => ({ ...w, visible: [...w.visible], hidden: [...w.hidden], acts: [...w.acts], danger: { ...w.danger } })),
    ending: s.ending ? { ...s.ending, lines: [s.ending.lines[0], s.ending.lines[1]] } : null,
    headline: [...s.headline],
    offer: s.offer ? { ...s.offer } : null,
    moved: [...s.moved],
    acts: s.acts.map((a) => ({ ...a })),
    crossed: { ...s.crossed },
    turnedAway: { ...s.turnedAway },
    phonesUsed: [...s.phonesUsed],
  };
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
  return !!pm && s.pendingTest !== region && holdInfo(s, region).ok;
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

/** Their forces move in: calm becomes pressed (clock at 0); pressed stays pressed with its quiet weeks reset. */
export function press(s: GameState, region: RegionId): boolean {
  const rec = s.regions[region];
  if (rec.state === 'fighting') return false;
  rec.quietWeeks = 0;
  if (rec.state === 'pressed') return false;
  rec.state = 'pressed';
  rec.pressedWeeks = 0;
  return true;
}

/** The place falls: fighting; any promise on it is void. `by` is kept for the WORLD WAR sentence unless a back-down already named the cause. */
export function fall(s: GameState, region: RegionId, by: FallCause): void {
  const rec = s.regions[region];
  rec.state = 'fighting';
  rec.fellWeek = s.week;
  rec.pressedWeeks = 0;
  rec.quietWeeks = 0;
  if (!rec.fellBy || by === 'spread') rec.fellBy = by;
  removePromise(s, region);
  if (s.pendingTest === region) s.pendingTest = null;
}

export function removePromise(s: GameState, region: RegionId): void {
  s.promises = s.promises.filter((p) => p.region !== region);
}

export function stepUp(s: GameState): boolean {
  const before = s.fed.step;
  s.fed.step = clampStep(before + 1);
  return s.fed.step !== before;
}

/**
 * A step down (a promise backed and held, a way out accepted). Ruling: it also quiets the fighting
 * place that fell most recently (fighting → pressed), one place per step down. Returns that place.
 */
export function stepDown(s: GameState): RegionId | null {
  const before = s.fed.step;
  s.fed.step = clampStep(before - 1);
  if (s.fed.step === before) return null;
  return recoverLatest(s);
}

/** The most recently fallen fighting place becomes pressed again ("Guns quiet at X"). */
export function recoverLatest(s: GameState): RegionId | null {
  const fighting = fightingRegions(s);
  if (!fighting.length) return null;
  let best = fighting[0];
  for (const r of fighting) if ((s.regions[r].fellWeek ?? 0) > (s.regions[best].fellWeek ?? 0)) best = r;
  recover(s, best);
  return best;
}
export function recover(s: GameState, region: RegionId): void {
  const rec = s.regions[region];
  if (rec.state !== 'fighting') return;
  rec.state = 'pressed';
  rec.recoveredWeek = s.week;
  rec.pressedWeeks = 0;
  rec.quietWeeks = 0;
  delete rec.fellBy;
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
  const fresh: WeekLog = { week: s.week, visible: [], hidden: [], acts: [], danger: { war: s.war, treaty: s.treaty, step: s.fed.step } };
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

/** A line on the tape (and in the week's visible log). */
export function say(c: RedlinesContent, s: GameState, kind: HeadlineKind, slots: Slots = {}): string {
  const text = fill(c.strings.headlines[kind], baseSlots(c, s, slots));
  currentLog(s).visible.push(text);
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

/** The player's own line in the week's acts. */
export function note(s: GameState, text: string): void {
  currentLog(s).acts.push(text);
}
