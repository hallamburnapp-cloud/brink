/**
 * What the teleprinter prints: the engine's tape lines. The engine says a declared line in the pack's
 * headline form (`tape`, 46 characters) since the first build was joined up; a save written before
 * that carries the whole declaration (up to thirty words), which this still swaps for the short form
 * so nothing runs off the paper.
 */
import { content, type GameState } from './engine';
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

/** The last lines on the tape for a state, in the teleprinter's words. */
export function tapeFor(s: GameState, shown?: number): TapeLine[] {
  return shorten(tapeOf(s, content.strings.words.week, shown));
}
