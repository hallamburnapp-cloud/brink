/**
 * Everything a tap does, in one place. Each action drives the engine through the seam, writes the
 * truth (`run`), saves it, and (for SEND ORDERS and the phone's answer) hands the week's outcome to
 * the playback, which moves what the sheet shows (`shown`) a beat at a time.
 */
import { liftTitle, dropCurtain } from './curtain';
import {
  answerPhone,
  canAnswer,
  canPromise,
  content,
  endWeek,
  movePiece,
  newGame,
  offerWayOut,
  promise,
  promiseAt,
  withdraw,
  type GameState,
  type PieceKind,
  type RefusalCode,
  type RegionId,
  type WayOutTerm,
} from './engine';
import { cancelPlayback, playResolve, skipPlayback } from './playback';
import { clearSave, hasSave, readSave, writeSave } from './storage';
import { armed, busy, debriefPage, explain, held, lifted, play as playing, prefs, refusal, run, saved, screen, setPrefs, sheet, shown, titleWorld, wayOutTerm, type ExplainStep } from './store';
import { randomSeed } from './words';

export { cancelPlayback, randomSeed, skipPlayback };

/** The seed of the world under the title when nothing is saved (never saved itself). */
export const SAMPLE_SEED = 'A-SAMPLE-WORLD';

/** Put a state on the desk as the truth and as what the sheet shows. */
function put(s: GameState): void {
  cancelPlayback();
  run.value = s;
  shown.value = s;
  clearFinger();
  debriefPage.value = null;
}

function clearFinger(): void {
  held.value = null;
  armed.value = null;
  lifted.value = null;
  wayOutTerm.value = null;
}

/** Write a new truth: on the desk, on the sheet, and saved. */
function commit(s: GameState): void {
  run.value = s;
  shown.value = s;
  writeSave(s);
  saved.value = true;
}

/** The world under the title: the saved game if there is one, else a sample world. */
export function ensureTitleWorld(): void {
  if (titleWorld.value) return;
  titleWorld.value = readSave() ?? newGame(content, SAMPLE_SEED);
}

/**
 * A new game on this seed, on the desk and saved. The explanation comes first: all three lines the
 * first time, then only the collision slip (the game's own dilemma); `explain: false` skips it.
 */
export function startGame(seed: string, opts: { explain?: boolean } = {}): GameState {
  const s = newGame(content, seed);
  put(s);
  if (prefs.value.debriefPage !== null) setPrefs({ debriefPage: null });
  writeSave(s);
  saved.value = true;
  sheet.value = null;
  explain.value = opts.explain === false ? null : prefs.value.explained ? 4 : 1;
  enterGame();
  return s;
}

/** The title lifts off the sheet (or the game is already on it). */
function enterGame(): void {
  if (screen.value === 'game') return;
  screen.value = 'game';
  liftTitle(() => {});
}

export function play(): void {
  startGame(randomSeed());
}

export function continueGame(): void {
  const s = readSave();
  if (!s) {
    saved.value = false;
    play();
    return;
  }
  put(s);
  // A game that had ended comes back to the debrief page being read, not the ending card.
  if (s.phase === 'ended' && prefs.value.debriefPage !== null) debriefPage.value = Math.min(prefs.value.debriefPage, s.log.length);
  sheet.value = null;
  explain.value = null;
  enterGame();
}

/** From the title with a saved game: start afresh, the old game replaced. */
export function newGameNow(): void {
  clearSave();
  startGame(randomSeed());
}

/** HOW TO PLAY: the typed card of the rules, from the title or the menu. */
export function howToPlay(): void {
  sheet.value = 'how';
}

export function explainNext(): void {
  const e = explain.value;
  if (e === null) return;
  if (e < 4) explain.value = (e + 1) as ExplainStep;
  else finishExplain();
}

export function explainSkip(): void {
  if (explain.value !== null) finishExplain();
}

function finishExplain(): void {
  setPrefs({ explained: true });
  explain.value = null;
}

/** The state the player may give orders to now, or null (a playback, the explanation, a sheet, the phone). */
export function canAct(): GameState | null {
  const s = run.value;
  if (!s || busy.value || explain.value !== null || screen.value !== 'game' || shown.value !== s || s.phase !== 'act') return null;
  return s;
}

// ---------------------------------------------------------------- the finger on the sheet

export function holdStart(region: RegionId): void {
  if (!canAct()) return;
  held.value = region;
}

export function holdEnd(): void {
  held.value = null;
}

/** Held long enough: the slip offering PROMISE TO DEFEND, WITHDRAW, or saying why not. */
export function armRegion(region: RegionId): void {
  const s = canAct();
  if (!s) return;
  lifted.value = null;
  const R = content.strings.refusals;
  if (promiseAt(s, region)) {
    armed.value = s.pendingTest === region ? { region, act: 'refused', reason: R['under-test'] } : { region, act: 'withdraw' };
    return;
  }
  const can = canPromise(s, region);
  armed.value = can.ok ? { region, act: 'promise' } : { region, act: 'refused', reason: R[can.reason ?? 'not-this-phase'] };
}

/** Put the slip away, put the counter down. */
export function cancelAct(): void {
  clearFinger();
  if (sheet.value === 'wayout') sheet.value = null;
}

let refusalKey = 0;
let refusalTimer: ReturnType<typeof setTimeout> | null = null;
export const REFUSAL_MS = 2400;

/** A refused order, in the content's words, on a slip for a moment. */
export function refuse(code: RefusalCode): void {
  refusal.value = { text: content.strings.refusals[code], key: ++refusalKey };
  if (refusalTimer) clearTimeout(refusalTimer);
  refusalTimer = setTimeout(() => {
    refusal.value = null;
    refusalTimer = null;
  }, REFUSAL_MS);
}

export function doPromise(region: RegionId): boolean {
  const s = canAct();
  if (!s) return false;
  const res = promise(s, region);
  armed.value = null;
  if (!res.ok) {
    refuse(res.reason as RefusalCode);
    return false;
  }
  commit(res.state);
  return true;
}

export function doWithdraw(region: RegionId): boolean {
  const s = canAct();
  if (!s) return false;
  const res = withdraw(s, region);
  armed.value = null;
  if (!res.ok) {
    refuse(res.reason as RefusalCode);
    return false;
  }
  commit(res.state);
  return true;
}

/** Tap a counter, then a place: the move. */
export function moveTo(kind: PieceKind, region: RegionId): boolean {
  const s = canAct();
  if (!s) return false;
  const res = movePiece(s, kind, region);
  if (!res.ok) {
    refuse(res.reason as RefusalCode);
    return false;
  }
  lifted.value = null;
  commit(res.state);
  return true;
}

/** A plain tap on the sheet: on a counter (pick it up or put it down), on a place (move the lifted counter there), or on nothing. */
export function tapSheet(region: RegionId | null, counter: PieceKind | null): void {
  if (!canAct()) return;
  if (armed.value) {
    armed.value = null;
    return;
  }
  if (counter) {
    lifted.value = lifted.value === counter ? null : counter;
    return;
  }
  if (lifted.value && region) {
    moveTo(lifted.value, region);
    return;
  }
  if (!region) lifted.value = null;
}

/** Pick a counter up by its name (the hook, a tap on a counter). */
export function liftPiece(kind: PieceKind | null): void {
  if (!canAct()) return;
  armed.value = null;
  lifted.value = kind;
}

// ---------------------------------------------------------------- the way out

export function openWayOut(): void {
  if (!canAct()) return;
  clearFinger();
  sheet.value = 'wayout';
}

export function offer(term: WayOutTerm, detail?: RegionId | PieceKind): boolean {
  const s = canAct();
  if (!s) return false;
  const res = offerWayOut(s, term, detail);
  if (!res.ok) {
    refuse(res.reason as RefusalCode);
    return false;
  }
  commit(res.state);
  wayOutTerm.value = null;
  sheet.value = null;
  return true;
}

// ---------------------------------------------------------------- the week ends, the phone

/** SEND ORDERS. Resolves once the week's outcome has played (and the phone, if it rings, is on screen). */
export async function sendOrders(): Promise<void> {
  const before = canAct();
  if (!before) return;
  clearFinger();
  sheet.value = null;
  const after = endWeek(content, before);
  run.value = after;
  writeSave(after);
  await playResolve(before, after);
}

/** BACK IT / BACK DOWN / WAIT. Resolves once the rest of the week has played. */
export async function answer(key: 'back' | 'down' | 'wait'): Promise<void> {
  const before = run.value;
  if (!before || busy.value || before.phase !== 'phone' || shown.value !== before || explain.value !== null) return;
  const can = canAnswer(before, key);
  if (!can.ok) {
    refuse(can.reason ?? 'no-such-phone');
    return;
  }
  const after = answerPhone(content, before, key);
  run.value = after;
  writeSave(after);
  await playResolve(before, after);
}

// ---------------------------------------------------------------- the menu, the title, the end

export function openMenu(): void {
  if (playing.value) return;
  sheet.value = 'menu';
}

export function closeSheet(): void {
  if (sheet.value === 'wayout') wayOutTerm.value = null;
  sheet.value = null;
}

/** SOUND in the menu: a preference only; there is no sound in this build. Returns the new setting. */
export function toggleSound(): boolean {
  const on = !prefs.value.sound;
  setPrefs({ sound: on });
  return on;
}

/** Leave the game on the desk (it is saved) for the title. */
export function quitToTitle(): void {
  cancelPlayback();
  dropCurtain();
  sheet.value = null;
  explain.value = null;
  clearFinger();
  titleWorld.value = run.value ?? readSave() ?? titleWorld.value;
  screen.value = 'title';
  shown.value = null;
  run.value = null;
  saved.value = hasSave();
  ensureTitleWorld();
}

/** From the ending: a new world. */
export function playAgain(): void {
  clearSave();
  startGame(randomSeed(), { explain: false });
}

/** From the ending: the title, the finished game put away. */
export function home(): void {
  clearSave();
  if (prefs.value.debriefPage !== null) setPrefs({ debriefPage: null });
  titleWorld.value = null;
  quitToTitle();
}

/** Save the game on the desk (the page is being hidden). */
export function saveNow(): void {
  const s = run.value;
  if (s) writeSave(s);
}

/** The debrief: null is the ending card, 0..n-1 a week's page, n the closing card. The page is kept, so a reload comes back to it. */
export function debriefGo(page: number | null): void {
  debriefPage.value = page;
  setPrefs({ debriefPage: page });
}
