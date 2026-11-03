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
  ringsLeftDashed,
  offerWayOut,
  promise,
  promiseAt,
  RULES,
  withdraw,
  type GameState,
  type PieceKind,
  type RefusalCode,
  type RegionId,
  type WayOutTerm,
} from './engine';
import { cancelPlayback, playResolve, skipPlayback } from './playback';
import { clearSave, hasSave, readSave, writeSave } from './storage';
import { tryMove } from './orders';
import { armed, busy, debriefPage, explain, held, lifted, moveAsk, movedDashed, play as playing, prefs, refusal, run, saved, screen, setPrefs, sheet, shown, titleWorld, wayOutTerm, type ExplainStep } from './store';
import { fill, randomSeed } from './words';

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
  moveAsk.value = null;
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

/** Where HOW TO PLAY was opened from: DONE goes back to the menu when it was the menu. */
let howFromMenu = false;

/** HOW TO PLAY: the typed card of the rules, from the title or the menu. */
export function howToPlay(): void {
  howFromMenu = sheet.value === 'menu';
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
  moveAsk.value = null;
  const R = content.strings.refusals;
  if (promiseAt(s, region)) {
    armed.value = s.pendingTest === region ? { region, act: 'refused', reason: R['under-test'] } : { region, act: 'withdraw' };
    return;
  }
  const can = canPromise(s, region);
  // Short of influence, the slip gives the numbers, as the call and the way-out form do ("needs 2 · you have 1").
  const why = can.reason === 'no-influence' ? needsLine(RULES.promiseCost, s.influence) : R[can.reason ?? 'not-this-phase'];
  armed.value = can.ok ? { region, act: 'promise' } : { region, act: 'refused', reason: why };
}

/** "needs 3 · you have 1": the call's own words for a price the influence in hand cannot meet. */
function needsLine(cost: number, influence: number): string {
  return fill(content.strings.phone.needs, { cost, influence });
}

/** Put the slip away, put the counter down. */
export function cancelAct(): void {
  clearFinger();
  if (sheet.value === 'wayout') sheet.value = null;
}

let refusalKey = 0;
let refusalTimer: ReturnType<typeof setTimeout> | null = null;
export const REFUSAL_MS = 2400;

/** A refused order, in the content's words, on a slip for a moment (a price short of influence gives its numbers). */
export function refuse(code: RefusalCode, text?: string): void {
  refusal.value = { text: text ?? content.strings.refusals[code], key: ++refusalKey };
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

/** The move itself (MOVE HERE, a tap on a place with nothing to warn of, the hook). */
export function moveTo(kind: PieceKind, region: RegionId): boolean {
  const s = canAct();
  if (!s) return false;
  const res = movePiece(s, kind, region);
  if (!res.ok) {
    refuse(res.reason as RefusalCode);
    return false;
  }
  lifted.value = null;
  moveAsk.value = null;
  const dashed = ringsLeftDashed(s, kind, region);
  const kept = movedDashed.value.week === s.week ? movedDashed.value.regions : [];
  movedDashed.value = { week: s.week, regions: [...kept.filter((r) => !dashed.includes(r)), ...dashed] };
  commit(res.state);
  return true;
}

/**
 * Tap a counter, then a place. Nothing is paid yet: the MOVE HERE slip is put down at the place with the price and
 * whatever the move would do (a declared line crossed, a ring left dashed, a place left to fall: SPEC-SMALL "A form
 * that will fail says so before you pay"), and MOVE HERE makes it. Every move asks, warned or not (round B, the cold
 * player: a tap to look moved the fleet at once and a move cannot be taken back, while a warned one asked first, so
 * the same tap sometimes asked and sometimes acted). One the engine refuses says why.
 */
export function askMove(kind: PieceKind, region: RegionId): void {
  const s = canAct();
  if (!s) return;
  const o = tryMove(s, kind, region);
  if (!o.ok) {
    moveAsk.value = null;
    refuse(o.reason as RefusalCode, o.reason === 'no-influence' ? needsLine(RULES.moveCost, s.influence) : undefined);
    return;
  }
  moveAsk.value = { kind, region };
}

/**
 * A plain tap on the sheet: on a counter (pick it up or put it down); on a place with a counter lifted (move it
 * there); on a place with nothing lifted (the slip a hold puts down: a first-time player's tap is answered, the
 * second review); on nothing (put everything down).
 */
export function tapSheet(region: RegionId | null, counter: PieceKind | null): void {
  if (!canAct()) return;
  if (counter) {
    armed.value = null;
    moveAsk.value = null;
    lifted.value = lifted.value === counter ? null : counter;
    return;
  }
  if (lifted.value && region) {
    askMove(lifted.value, region);
    return;
  }
  if (armed.value) {
    // A tap on another place moves the slip there; a tap on the same place or the sea puts it away.
    if (region && region !== armed.value.region) armRegion(region);
    else armed.value = null;
    return;
  }
  if (region) {
    armRegion(region);
    return;
  }
  lifted.value = null;
  moveAsk.value = null;
}

/** Pick a counter up by its name (the hook, a tap on a counter). */
export function liftPiece(kind: PieceKind | null): void {
  if (!canAct()) return;
  armed.value = null;
  moveAsk.value = null;
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
  // HOW TO PLAY opened from the menu closes back to the menu (the second review), not to the game.
  if (sheet.value === 'how' && howFromMenu) {
    howFromMenu = false;
    sheet.value = 'menu';
    return;
  }
  howFromMenu = false;
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
