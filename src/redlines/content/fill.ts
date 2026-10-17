/**
 * Slot filling for the content's templates ("{region}", "{cost}" ...), shared by the engine, the
 * screens and the validator. Pure.
 *
 *   fill('Armour is at {region}. {crosser} crossed it.', { region: 'Lintel', crosser: 'our brigade' })
 *   → 'Armour is at Lintel. Our brigade crossed it.'
 *
 * A slot at the start of the text or of a sentence is capitalised, so a template can start a
 * sentence with "{crosser}" or "{region}" without the writer caring what the engine puts there.
 * Unknown slots are left as written (and `missingSlots` names them), so a half-filled line is
 * visible rather than silently wrong.
 */

export const SLOT_RE = /\{([a-z][a-zA-Z]*)\}/g;

export type Slots = Readonly<Record<string, string | number | undefined>>;

/** The distinct slot names in a template, in order of first appearance. */
export function slotsOf(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(SLOT_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

export function fill(text: string, slots: Slots): string {
  return text.replace(SLOT_RE, (whole: string, name: string, offset: number) => {
    const v = slots[name];
    if (v === undefined) return whole;
    const s = String(v);
    const before = text.slice(0, offset);
    const startsSentence = /^\s*$/.test(before) || /[.!?]\s+$/.test(before);
    return startsSentence && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  });
}

/** The slots the template needs that `slots` does not provide. */
export function missingSlots(text: string, slots: Slots): string[] {
  return slotsOf(text).filter((name) => slots[name] === undefined);
}

/** True when nothing is left to fill. */
export function isFilled(text: string): boolean {
  return !SLOT_RE.test(text);
}

/**
 * One of several variants, chosen by a number the caller owns (the engine's seeded roll, a week
 * number); the same number always gives the same variant. Empty lists give ''.
 */
export function pick<T>(variants: readonly T[], n: number): T | undefined {
  if (!variants.length) return undefined;
  const i = Math.abs(Math.trunc(n)) % variants.length;
  return variants[i];
}

/** The number words of strings.yaml (`numbers`), falling back to digits past the list. */
export function numberWord(numbers: readonly string[], n: number): string {
  return n >= 0 && n < numbers.length ? numbers[n] : String(n);
}
