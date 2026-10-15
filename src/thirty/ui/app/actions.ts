/**
 * Everything a tap does, in one place. Each action drives the engine through the seam, writes the
 * truth (`run`), saves it, and hands the day's outcome to the playback, which moves what the screen
 * shows (`shown`) a second later.
 */
import { audio } from '../../../audio';
import { choose, content, danger, newGame, pick, tapRegion, type GameState, type RegionId } from './engine';
import { cancelPlayback, playArrival, playDay } from './playback';
import { tickDay } from './sound';
import { clearSave, hasSave, readSave, writeSave } from './storage';
import { busy, cardKey, chipOpen, chosen, delta, explain, explainFrom, glow, needle, night, prefs, run, saved, screen, setPrefs, sheet, shown, shownHeats } from './store';

/** A short readable seed, e.g. 'KX7-RM2'. */
export function randomSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

function show(s: GameState): void {
  cancelPlayback();
  run.value = s;
  shown.value = s;
  shownHeats.value = null;
  needle.value = danger(s);
  delta.value = null;
  chosen.value = null;
  night.value = null;
  glow.value = [];
  chipOpen.value = null;
}

/** A new game on this seed, on the table and saved. The explanation comes first when asked. */
export function startGame(seed: string, opts: { explain?: boolean } = {}): GameState {
  const s = newGame(content, seed);
  show(s);
  writeSave(s);
  saved.value = true;
  sheet.value = null;
  screen.value = 'game';
  explainFrom.value = 'game';
  explain.value = opts.explain ? 1 : null;
  cardKey.value++;
  return s;
}

export function play(): void {
  audio.unlock();
  startGame(randomSeed(), { explain: !prefs.value.explained });
}

export function continueGame(): void {
  audio.unlock();
  const s = readSave();
  if (!s) {
    saved.value = false;
    play();
    return;
  }
  show(s);
  sheet.value = null;
  screen.value = 'game';
  explain.value = null;
  cardKey.value++;
}

/** The two explanation screens, over the live map: from the title (over a sample world) or from the menu. */
export function howToPlay(): void {
  audio.unlock();
  sheet.value = null;
  if (screen.value === 'game' && shown.value) {
    explainFrom.value = 'game';
  } else {
    explainFrom.value = 'title';
    // A world to explain over; never saved, and gone again when the explanation ends.
    const sample = run.value ?? readSave() ?? newGame(content, 'A-SAMPLE-WORLD');
    shown.value = sample;
    shownHeats.value = null;
    needle.value = danger(sample);
    screen.value = 'game';
  }
  explain.value = 1;
}

export function explainNext(): void {
  if (explain.value === 1) explain.value = 2;
  else finishExplain();
}

export function explainSkip(): void {
  if (explain.value !== null) finishExplain();
}

function finishExplain(): void {
  setPrefs({ explained: true });
  explain.value = null;
  if (explainFrom.value === 'title') {
    screen.value = 'title';
    shown.value = run.value;
    return;
  }
  // The day begins (or goes on): the card slides up.
  cardKey.value++;
  tickDay();
}

/**
 * What the explanation's last button says: BEGIN DAY 1 when a new game is about to start, BACK TO
 * THE GAME when it was opened from the menu mid-game, DONE from the title (nothing starts).
 */
export function explainDoneLabel(): string {
  if (explainFrom.value === 'title') return 'DONE';
  const s = run.value;
  if (s && s.day === 1 && s.log.length === 0 && s.phase === 'choose') return 'BEGIN DAY 1';
  return 'BACK TO THE GAME';
}

function canAct(): GameState | null {
  const s = run.value;
  if (!s || busy.value || explain.value !== null || screen.value !== 'game' || shown.value !== s) return null;
  return s;
}

/** Play today's card by a button. Resolves once the day's outcome has played. */
export async function chooseSide(side: 'left' | 'right'): Promise<void> {
  const before = canAct();
  if (!before || before.phase !== 'choose') return;
  const res = choose(content, before, side);
  if (!res.ok) return;
  run.value = res.state;
  writeSave(res.state);
  await playDay(before, res.state, side);
}

/** Tap a glowing place on a map day. */
export async function tapTarget(region: RegionId): Promise<void> {
  const before = canAct();
  if (!before || before.phase !== 'choose') return;
  const res = tapRegion(content, before, region);
  if (!res.ok) return;
  run.value = res.state;
  writeSave(res.state);
  await playDay(before, res.state, region);
}

/** Take one of the offered pieces, or none. */
export function pickPiece(index: number | null): void {
  const before = canAct();
  if (!before || before.phase !== 'offer') return;
  const res = pick(content, before, index);
  if (!res.ok) return;
  run.value = res.state;
  writeSave(res.state);
  void playArrival(before, res.state);
}

export function openMenu(): void {
  audio.unlock();
  sheet.value = 'menu';
}

export function toggleSound(): boolean {
  audio.unlock();
  const muted = !audio.isMuted();
  audio.setMuted(muted);
  return muted;
}

/** Leave the game on the table (it is saved) for the title. */
export function quitToTitle(): void {
  cancelPlayback();
  sheet.value = null;
  explain.value = null;
  screen.value = 'title';
  shown.value = null;
  run.value = null;
  saved.value = hasSave();
}

/** From the ending: a new world. */
export function playAgain(): void {
  clearSave();
  startGame(randomSeed());
}

/** From the ending: the same world again. */
export function replaySeed(): void {
  const seed = run.value?.seed ?? randomSeed();
  clearSave();
  startGame(seed);
}

/** From the ending: the title, the finished game put away. */
export function home(): void {
  clearSave();
  quitToTitle();
}

/** From the title with a saved game: start afresh, the old game replaced. */
export function newGameNow(): void {
  audio.unlock();
  clearSave();
  startGame(randomSeed(), { explain: !prefs.value.explained });
}

/** Save the game on the table (the page is being hidden). */
export function saveNow(): void {
  const s = run.value;
  if (s) writeSave(s);
}
