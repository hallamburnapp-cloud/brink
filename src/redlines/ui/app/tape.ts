/**
 * What the teleprinter prints: the engine's tape lines. The engine says a declared line in the pack's
 * headline form (`tape`, 46 characters) since the first build was joined up; a save written before
 * that carries the whole declaration (up to thirty words), which this still swaps for the short form
 * so nothing runs off the paper.
 */
import { content, declaredTapes, type GameState } from './engine';
import { tapeOf, type TapeLine } from './words';

let shortForms: Map<string, string> | null = null;
let shortFrom: unknown = null;

/** The tape form of a declared line, else the line itself. */
export function shortTape(text: string): string {
  if (shortFrom !== content.lines) {
    shortFrom = content.lines;
    shortForms = new Map(content.lines.map((l) => [l.text, l.tape]));
  }
  return shortForms?.get(text) ?? text;
}

export function shorten(lines: TapeLine[]): TapeLine[] {
  return lines.map((l) => (shortTape(l.text) === l.text ? l : { ...l, text: shortTape(l.text) }));
}

/**
 * Wintermast's three declared lines in the teleprinter's words, in the order they were declared: what the tape
 * keeps pinned at its head all game (SPEC-SMALL "The three lines stay on the sheet").
 */
export function pinnedFor(s: GameState): string[] {
  // The engine's declaredTapes; a save from before the lines carried their tape words gives the whole declaration, shortened here.
  return declaredTapes(s).map(shortTape);
}

/**
 * The last lines on the tape for a state, in the teleprinter's words. With `pinned` (the declared lines kept at the
 * tape's head) the opening's own printing of them is left out of the running lines.
 */
export function tapeFor(s: GameState, shown?: number, pinned: readonly string[] = []): TapeLine[] {
  return tapeOf({ ...s, headline: s.headline.map(shortTape) }, content.strings.words.week, shown, pinned).map((l) => (shortTape(l.text) === l.text ? l : { ...l, text: shortTape(l.text) }));
}
