/**
 * A week's resolve on the sheet, in beats a watcher can follow (BUILD.md "the resolve playback"):
 * the tape feeds one line, the same line is written large on the note, and the sheet changes with
 * it: a pin's push scribbles red hatching into the place, a fall washes it red and stamps it, a
 * backed promise clears TESTED, the stamp slams when the ladder word changes, the bars move with
 * the week's reading, and the last beat drops next week's pins. SEND ORDERS and the phone's answer
 * both resolve when the playback has finished; a tap anywhere skips to the end. Reduced motion:
 * short, even beats and no entrances.
 */
import { viewFromState, type PaperView, type PieceView } from '../paper';
import { weekBeats, type Beat } from './beats';
import { content, holdable, REGION_IDS, regionName, RULES, type GameState, type RegionId } from './engine';
import { busy, play, reduced, shown } from './store';
import { shorten } from './tape';
import { allTapeLines, TAPE_SHOWN, type TapeLine } from './words';

export const TIMES = {
  /** The orders are sent; a breath before the first line prints. */
  first: 380,
  /** One line, one change on the sheet. */
  beat: 1150,
  /** A beat whose stamp slams is held a little longer. */
  stamp: 1500,
  /** The last beat (next week's pins drop) before the slips come back up. */
  last: 420,
  /** The beat that fills the eighth box (WORLD WAR) is held, so the watcher sees the chain on the map before the card. */
  worldWar: 1400,
  reduced: 420,
} as const;

/** The beats waiting on a timer; a skip or a cancel lets them all go at once. */
const waiting = new Set<() => void>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      waiting.delete(done);
      resolve();
    };
    const timer = setTimeout(done, Math.max(0, ms));
    waiting.add(done);
  });
}

function release(): void {
  for (const done of [...waiting]) done();
}

let token = 0;
/** The state the playback is heading for, so a skip can settle on it. */
let pending: GameState | null = null;

/** A new game or a quit cancels the playback in progress, so its timers never put a game back on screen. */
export function cancelPlayback(): void {
  token++;
  pending = null;
  play.value = null;
  busy.value = false;
  release();
}

/** Finish the playback at once: the sheet shows the resolved week. */
export function skipPlayback(): void {
  if (!pending) return;
  const after = pending;
  token++;
  settle(after);
  release();
}

function settle(after: GameState): void {
  pending = null;
  play.value = null;
  shown.value = after;
  busy.value = false;
}

export function viewOf(s: GameState): PaperView {
  return viewFromState(s, (r) => holdable(s, r).ok);
}

let names: Map<string, RegionId> | null = null;
function idOf(name: string): RegionId | null {
  if (!names) names = new Map(REGION_IDS.map((id) => [regionName(id), id]));
  return names.get(name) ?? null;
}

/** How much a tape line of this kind moves the TREATY bar (SPEC-SMALL "The two bars"; RULES has the numbers). */
export function barMoveOf(kind: string, slots: Record<string, string>): number | null {
  const R = RULES as unknown as Record<string, number>;
  switch (kind) {
    case 'quietWeek':
      return R.willQuiet ?? 5;
    case 'blocSigned':
      return R.willBloc ?? 10;
    case 'wayOutAccepted':
    case 'summitAccepted':
      return R.willWayOut ?? 15;
    // Their own summit offer refused in public is the one humiliation (−10); a way out of yours they refuse costs
    // nothing on the bar (SPEC-SMALL ruling), and the trawler never touches it.
    case 'summitRefused':
      return -(R.willHumiliated ?? 10);
    case 'gainedWeek': {
      // "They took two places this week": the number word, or a digit, in the slot.
      const words = content.strings.numbers;
      const first = (slots.n ?? '').trim().split(/\s+/)[0] ?? '';
      const idx = words.indexOf(first);
      const n = idx >= 0 ? idx : parseInt(first, 10);
      return -(R.willPerGain ?? 5) * (Number.isFinite(n) && n > 0 ? n : 1);
    }
    default:
      return null;
  }
}

/** The beats of a resolve, read from the engine's lines (beats.ts). */
export function beatsFor(before: GameState, after: GameState): Beat[] {
  const holdableWith = (pieces: readonly PieceView[], region: RegionId) => holdable({ ...before, pieces: pieces.map((p) => ({ kind: p.kind, at: p.at })) }, region).ok;
  return weekBeats({
    before,
    after,
    headlines: content.strings.headlines,
    idOf,
    holdable: holdableWith,
    startView: viewOf(before),
    endView: viewOf(after),
    steps: content.strings.words.steps,
    barMove: barMoveOf,
  });
}

/**
 * Play a resolved week (or the half of it after the phone). `before` is the state the screen shows,
 * `after` the engine's result. Resolves when the sheet shows `after`.
 */
export async function playResolve(before: GameState, after: GameState): Promise<void> {
  const mine = ++token;
  const live = () => mine === token;
  pending = after;
  busy.value = true;
  const r = reduced.value;
  const beats = beatsFor(before, after);
  const weekWord = content.strings.words.week;
  const lines: TapeLine[] = shorten(allTapeLines(before, weekWord));
  const had = before.log.find((w) => w.week === before.week)?.visible.length ?? 0;
  let prevStep = before.fed.step;
  let prevWar = before.war;

  await wait(r ? TIMES.reduced : TIMES.first);
  if (!live()) return;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (b.text) lines.push(...shorten([{ tag: `${weekWord} ${before.week}`, text: b.text, key: `w${before.week}:${had + i}` }]));
    const tape = lines.slice(-TAPE_SHOWN).map((l, j, arr) => ({ ...l, feed: !!b.text && j === arr.length - 1 }));
    play.value = { view: b.view, step: b.step, war: b.war, treaty: b.treaty, note: b.text, tape };
    const slam = b.step !== prevStep;
    const eighth = b.war >= RULES.warLimit && prevWar < RULES.warLimit;
    prevStep = b.step;
    prevWar = b.war;
    const last = i === beats.length - 1;
    await wait(r ? TIMES.reduced : (last ? TIMES.beat + TIMES.last : slam ? TIMES.stamp : TIMES.beat) + (eighth ? TIMES.worldWar : 0));
    if (!live()) return;
  }
  settle(after);
}
