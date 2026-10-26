/**
 * The words the screens put beside the engine's, every one from strings.yaml via the content: the
 * tape's tagged lines, the handwritten note (this week's orders, or the opening's collision, or how
 * many places are fighting), the WAR line on the index card, the cost lines on the slips, the
 * caller card's lines, and the reading of a headline back to its kind (for the playback's beats).
 * Pure: no DOM, no signals, no engine import, so every line has a test.
 */
import type { Act, GameState, HoldInfo, Phone, PieceKind, PackStrings, WayOutTerm } from './engine';

export interface TapeLine {
  tag?: string;
  text: string;
  feed?: boolean;
  key?: string;
}

export type Slots = Record<string, string | number | null | undefined>;

/** Replace every `{name}` with its slot, as the engine does (no capitalising); unknown slots stay visible. */
export function fill(template: string, slots: Slots = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = slots[k];
    return v === undefined || v === null ? m : String(v);
  });
}

export type Namer = (id: string) => string;

// ---------------------------------------------------------------- the tape

/**
 * Every line said so far, tagged with its week: the opening's lines (the declared lines, the
 * inherited promises; said before week 1 and not in the log) first, then the log's lines in order.
 */
export function allTapeLines(s: GameState, weekWord: string): TapeLine[] {
  const fromLog: TapeLine[] = [];
  for (const w of s.log) w.visible.forEach((text, i) => fromLog.push({ tag: `${weekWord} ${w.week}`, text, key: `w${w.week}:${i}` }));
  // s.headline is the last six lines said, opening included; what the log does not account for is the opening's.
  const opening = Math.max(0, s.headline.length - fromLog.length);
  const open = s.headline.slice(0, opening).map((text, i) => ({ tag: `${weekWord} 1`, text, key: `w0:${i}` }));
  return [...open, ...fromLog];
}

/** The tape shows this many lines. */
export const TAPE_SHOWN = 3;

export function tapeOf(s: GameState, weekWord: string, shown = TAPE_SHOWN): TapeLine[] {
  return allTapeLines(s, weekWord).slice(-shown);
}

// ---------------------------------------------------------------- the note and the card

/**
 * The week's orders with the cancelled ones taken out: a promise withdrawn the same week (or a
 * withdrawal promised over again) is no order at all, so the note never reads "You promised to
 * defend Vessary. You withdrew your promise to Vessary. You promised to defend Vessary."
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

/** This week's orders so far, in the log's own words ("You promised to defend Lintel."), cancelled pairs left out. */
export function actLines(acts: readonly Act[], S: PackStrings, name: Namer): string[] {
  const out: string[] = [];
  for (const a of netActs(acts)) {
    if (a.kind === 'promise') out.push(fill(S.acts.promise, { region: name(a.region) }));
    else if (a.kind === 'withdraw') out.push(fill(S.acts.withdraw, { region: name(a.region) }));
    else if (a.kind === 'move') out.push(fill(S.acts.move, { piece: S.pieces[a.piece], region: name(a.to) }));
    else if (a.kind === 'way-out') out.push(fill(S.acts.wayOut, { term: S.terms[a.term] }));
  }
  return out;
}

/** "No place is fighting." "One place is still fighting." "Three places are still fighting." */
export function fightingSentence(S: PackStrings, n: number): string {
  const k = S.counts;
  if (n === 0) return k.sentenceNone;
  if (n === 1) return k.sentenceOne;
  const word = S.numbers[n] ?? String(n);
  const text = fill(k.sentenceMany, { n: word });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The handwritten note on the sheet, the sentence a watcher reads: this week's orders when there
 * are any; in week 1 before any order, the opening's collision; else the world as it stands
 * (`situation`). `bloc` names a place's bloc ("the Sound").
 */
export function noteFor(s: GameState, S: PackStrings, name: Namer, bloc: Namer): string {
  const acts = actLines(s.acts, S, name);
  if (acts.length) return acts.join(' ');
  if (s.week === 1 && s.collision) return s.collision;
  return situation(s, S, name, bloc);
}

/**
 * The world in one or two sentences, from strings.note: where they are pushing (by bloc), what they
 * have taken, which promise is under test; with none of those, where their forces are heading; with
 * no headings either, that no place is fighting.
 */
export function situation(s: GameState, S: PackStrings, name: Namer, bloc: Namer): string {
  const N = S.note;
  const parts: string[] = [];
  const ids = Object.keys(s.regions);
  const pressed = ids.filter((r) => s.regions[r].state === 'pressed');
  const fighting = ids.filter((r) => s.regions[r].state === 'fighting');
  if (pressed.length) {
    const blocs = [...new Set(pressed.map(bloc))];
    parts.push(blocs.length === 1 ? fill(N.pushing, { bloc: blocs[0] }) : fill(N.pushingTwo, { a: blocs[0], b: blocs[1] }));
  }
  if (fighting.length === 1) parts.push(fill(N.taken, { region: name(fighting[0]) }));
  else if (fighting.length > 1) parts.push(fill(N.takenMany, { n: S.numbers[fighting.length] ?? String(fighting.length) }));
  if (s.pendingTest) parts.push(fill(N.tested, { region: name(s.pendingTest) }));
  if (parts.length) return parts.join(' ');
  const to = s.fed.headings[0]?.to;
  if (to) return fill(N.heading, { region: name(to) });
  return S.counts.sentenceNone;
}

/**
 * The small line under WAR on the index card. With two or more fighting the line would run into the
 * WORLD WAR label at its right, so it keeps its first clause only ("2 regions fighting"): the boxes and
 * the label already say where world war is.
 */
export function warSub(S: PackStrings, n: number): string {
  if (n === 0) return S.screen.warNone;
  if (n === 1) return S.screen.warOne;
  return fill(S.screen.warMany, { n }).split(' · ')[0];
}

export function stepWord(S: PackStrings, step: number): string {
  return S.words.steps[Math.max(0, Math.min(4, step - 1))];
}

// ---------------------------------------------------------------- the slips

/** Why a promise is solid or dashed, in words: "the brigade is at Edda Vale, within reach". */
export function holdWords(S: PackStrings, hold: HoldInfo, name: Namer): string {
  return fill(S.hold[hold.why], { piece: hold.piece ? S.pieces[hold.piece.kind] : '', at: hold.piece ? name(hold.piece.at) : '' });
}

/** The cost line under PROMISE TO DEFEND: the upkeep, then solid or dashed and why. */
export function promiseLine(S: PackStrings, hold: HoldInfo, name: Namer): string {
  const why = holdWords(S, hold, name);
  return `${S.act.promiseCost} · ${fill(hold.ok ? S.act.promiseSolid : S.act.promiseDashed, { hold: why })}`;
}

/** The cost line under a way-out term. With no piece named yet, the clauses that would name one are left out ("costs 15 influence"). */
export function termLine(S: PackStrings, term: WayOutTerm, cost: number, piece: PieceKind | null): string {
  const template = S.act.termCosts[term];
  if (piece || !template.includes('{piece}')) return fill(template, { cost, piece: piece ? S.pieces[piece] : '' });
  return template
    .split(' · ')
    .filter((clause) => !clause.includes('{piece}'))
    .map((clause) => fill(clause, { cost }))
    .join(' · ');
}

/** A counter's label on the sheet, from the piece's name: "the fleet" → FLEET. */
export function counterLabel(S: PackStrings, kind: PieceKind): string {
  return S.pieces[kind].replace(/^(the|a|an)\s+/i, '').toUpperCase();
}

// ---------------------------------------------------------------- the call

/** The caller card's lines: the typed name ("GENERAL RUUN HALDER") and the hand's "the" + "Hawk". */
export function callerLines(phone: Pick<Phone, 'caller'>): { name: string; lead: string; role: string } {
  const name = `${phone.caller.role} ${phone.caller.name}`.trim().toUpperCase();
  const tag = phone.caller.tag.trim();
  const sp = tag.indexOf(' ');
  if (sp > 0) return { name, lead: tag.slice(0, sp), role: tag.slice(sp + 1) };
  return { name, lead: '', role: tag };
}

/** The adviser slip's header: the id and the role in capitals ("HAWK · GENERAL"; "INTEL · DIRECTOR", not the id twice). */
export function adviserWho(id: string, role: string): string {
  const ID = id.toUpperCase();
  let ROLE = role.toUpperCase();
  if (ROLE.startsWith(ID + ' ')) ROLE = ROLE.slice(ID.length + 1);
  return `${ID} · ${ROLE}`;
}

/** The round line on the clock: INCOMING, or the second or third week of this. */
export function roundLine(S: PackStrings, round: 1 | 2 | 3): string {
  return round === 1 ? S.phone.ringing : round === 2 ? S.phone.round2 : S.phone.round3;
}

// ---------------------------------------------------------------- reading a headline back

export interface Matched {
  kind: string;
  slots: Record<string, string>;
}

interface Compiled {
  kind: string;
  re: RegExp;
  names: string[];
  literal: number;
}

const compiledCache = new WeakMap<Record<string, string>, Compiled[]>();

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The templates as regexes, the most literal first, so "{region} has fallen" never swallows "You waited too long · X has fallen". */
function compile(templates: Record<string, string>): Compiled[] {
  let out = compiledCache.get(templates);
  if (out) return out;
  out = Object.entries(templates).map(([kind, t]) => {
    const names: string[] = [];
    const src = t
      .split(/(\{\w+\})/g)
      .map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m) {
          names.push(m[1]);
          return '(.+?)';
        }
        return escapeRe(part);
      })
      .join('');
    return { kind, re: new RegExp(`^${src}$`), names, literal: t.replace(/\{\w+\}/g, '').length };
  });
  out.sort((a, b) => b.literal - a.literal);
  compiledCache.set(templates, out);
  return out;
}

/**
 * Which headline template a tape line came from, and its slots. `isRegion` rejects a match whose
 * {region} or {from} is not a place's name. Null when no template fits.
 */
export function matchHeadline(templates: Record<string, string>, line: string, isRegion: (name: string) => boolean = () => true): Matched | null {
  for (const c of compile(templates)) {
    const m = c.re.exec(line);
    if (!m) continue;
    const slots: Record<string, string> = {};
    let ok = true;
    c.names.forEach((n, i) => {
      slots[n] = m[i + 1];
      if ((n === 'region' || n === 'from') && !isRegion(m[i + 1])) ok = false;
    });
    if (ok) return { kind: c.kind, slots };
  }
  return null;
}

/** A short readable seed, e.g. 'KX7-RM2'. */
export function randomSeed(rand: () => number = Math.random): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(rand() * chars.length)];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}
