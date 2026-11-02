/** Slot filling and the few number words the engine needs. Every string comes from the content. */
import { answerGroup, type RedlinesContent, type Strings } from './content.ts';
import { STEP_WORDS, type Act, type PieceKind, type Step } from './types.ts';
import { regionName } from './world.ts';

export type Slots = Record<string, string | number | null | undefined>;

/** Replace every `{name}` with its slot; unknown slots are left as they are so a missing one shows. */
export function fill(template: string, slots: Slots = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = slots[k];
    return v === undefined || v === null ? m : String(v);
  });
}

/** 0..12 in words from the pack, else digits. */
export function numberWord(c: RedlinesContent, n: number): string {
  return c.strings.numbers[n] ?? String(n);
}

export function stepWord(c: RedlinesContent | null, step: Step): string {
  return c ? c.strings.words.steps[step - 1] : STEP_WORDS[step];
}

export function pieceWord(c: RedlinesContent, kind: PieceKind): string {
  return c.strings.pieces[kind];
}

/** "no place fighting", "one place still fighting", "three places still fighting". */
export function fightingPhrase(c: RedlinesContent, n: number): string {
  const k = c.strings.counts;
  return n === 0 ? k.none : n === 1 ? k.one : fill(k.many, { n: numberWord(c, n) });
}
/** "No place is fighting." "One place is still fighting." "Three places are still fighting." */
export function fightingSentence(c: RedlinesContent, n: number): string {
  const k = c.strings.counts;
  return n === 0 ? k.sentenceNone : n === 1 ? k.sentenceOne : cap(fill(k.sentenceMany, { n: numberWord(c, n) }));
}
/** "one place", "two places". */
export function placesPhrase(c: RedlinesContent, n: number): string {
  const k = c.strings.counts;
  return n === 1 ? k.placesOne : fill(k.placesMany, { n: numberWord(c, n) });
}

/** A capital first letter (a number word at the start of a sentence). */
export function cap(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

export function name(id: string | null | undefined): string {
  return id ? regionName(id) : '';
}

/**
 * One act of the player's in the log's words: an order ("You promised to defend Lintel.") or an answer on the phone
 * as the act it was ("You protested at Vessary.", never the form's forecast). A third WAIT on a test is backing
 * down, and prints as one. The debrief's "what you did" and the screens' note both read this.
 */
export function actLine(c: { strings: Pick<Strings, 'acts' | 'answers' | 'pieces' | 'terms'> }, a: Act): string {
  const S = c.strings;
  switch (a.kind) {
    case 'promise':
      return fill(S.acts.promise, { region: regionName(a.region) });
    case 'withdraw':
      return fill(S.acts.withdraw, { region: regionName(a.region) });
    case 'move':
      return fill(S.acts.move, { piece: S.pieces[a.piece], region: regionName(a.to) });
    case 'way-out':
      return fill(S.acts.wayOut, { term: S.terms[a.term] });
    case 'answer': {
      const group = answerGroup(a.phone);
      const key = group === 'test' && a.key === 'wait' && (a.round ?? 1) >= 3 ? 'down' : a.key;
      return fill(S.answers[group][key], { region: a.region ? regionName(a.region) : '' });
    }
  }
}
