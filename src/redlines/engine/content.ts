/**
 * BRINK: Red Lines — the compiled content the engine reads (BUILD.md "The content"). The content
 * builder compiles content-redlines/*.yaml into one `RedlinesContent`; the engine never reads YAML.
 * Every word the engine puts on screen comes from here: the phone templates, the debrief thoughts,
 * the headlines on the tape, the ending lines, the words on the map. Slots are `{name}` and the
 * engine fills them (words.ts `fill`). The const arrays are the keys a pack must provide, for the
 * schema's enums and for `checkContent`, which lists what a pack is missing.
 *
 * The product rules apply to every string: plain English a non-gamer can repeat; no conditional
 * annotation naming what the enemy is like (never "if they are scared of us"); fictional world.
 */
import type { Bloc } from './world.ts';
import type { FallCause, PhoneKind, PieceKind, RegionId, WayOutTerm } from './types.ts';

export type { Bloc, FallCause, PhoneKind, PieceKind, RegionId, WayOutTerm };

/** advisers.yaml: the four voices. hawk, dove and intel speak on every call; the ambassador is a caller. */
export const ADVISER_IDS = ['hawk', 'dove', 'intel', 'ambassador'] as const;
export type AdviserId = (typeof ADVISER_IDS)[number];
export interface Adviser {
  id: AdviserId;
  /** A fictional person's name, typed in capitals on the caller card ("GENERAL RUUN HALDER"). */
  name: string;
  /** "General", "Foreign Minister", "Director", "Old Ambassador". */
  role: string;
  /** The hand-written tag under the name: "the Hawk", "the Dove", "Intel", "the Ambassador". */
  tag: string;
  /** One line on how they speak; for the writer, never shown. */
  voice: string;
}

/**
 * lines.yaml: the eight lines Wintermast may declare. Three are drawn a game (two real, one bluff).
 * `text` is the line as Wintermast says it ("Republic forces in the Sound would be a grave matter.").
 * `kind` says what of yours crosses it, in the regions it covers:
 * - proximity: any piece of yours (fleet or brigade) standing in one of the regions;
 * - sea: the fleet standing in one of the regions;
 * - missiles: the brigade standing in one of the regions;
 * - alliance: a promise of yours on one of the regions.
 * Every line must cover at least one region outside the Cap (the opening puts an inherited promise there).
 */
export const LINE_KINDS = ['proximity', 'sea', 'alliance', 'missiles'] as const;
export type LineKind = (typeof LINE_KINDS)[number];
export interface LineDef {
  id: string;
  text: string;
  kind: LineKind;
  regions: RegionId[];
  /** The headline form for the teleprinter ("Wintermast: no Republic forces in the Sound"), 46 characters or fewer; the tape prints it in place of `text`. */
  tape?: string;
}

/**
 * phones.yaml: the call templates. Kinds:
 * - 'test', 'test-inherited', 'feint': a test of a promise. All three are one pool: a real push and a
 *   feint draw from it alike, so no template is a tell ('test-inherited' is preferred when the promise
 *   was inherited). Write them around forces that have arrived at a promised place and not yet moved.
 *   Options: back = BACK IT (costs {cost} influence), down = BACK DOWN, wait = WAIT (next week, stakes up).
 * - 'false-alarm': early warning at {region} (MASSING and above; never an instant loss).
 *   back = go on alert (costs influence; force they can see), down = stand down, wait = a second source.
 * - 'trawler': an allied island has seized a Federation trawler; Wintermast demands it back.
 *   back = back the ally, down = disown them, wait = lean on them privately.
 * - 'bluff-crossed': you crossed a declared line and Wintermast has said nothing.
 *   back = hold your ground, down = pull back, wait = wait and see.
 * - 'summit': Wintermast proposes a summit. back = accept (costs influence; counts as a way out),
 *   down = refuse, wait = ask for terms (the offer lapses).
 * - 'fall-unpromised': a place nobody promised will fall this week, and a piece of yours could reach it.
 *   back = send what you have (costs influence; holds only if the piece can reach), down = let it go, wait = protest.
 * Slots: {region} the place, {promise} the promised place (tests), {line} the line's text, {cost} the
 * influence BACK IT costs this round, {piece} your nearest piece ("the brigade"), {from} the other
 * heading's place, {step} the ladder word. The validator refuses texts over 40 words and any option
 * text containing "if they".
 */
export const PHONE_KINDS: readonly PhoneKind[] = ['test', 'test-inherited', 'feint', 'false-alarm', 'trawler', 'bluff-crossed', 'summit', 'fall-unpromised'];
export interface PhoneOptionDef {
  /** The word on the typed form: BACK IT, BACK DOWN, WAIT (or the event's own verbs). */
  label: string;
  /** The cost in plain words under it ("move the brigade up · costs {cost} influence · we keep our word"). */
  cost: string;
}
export interface PhoneTemplate {
  id: string;
  kind: PhoneKind;
  caller: AdviserId;
  /** The caller's message, 40 words or fewer. */
  text: string;
  /** Test kinds, optional: the message on the second and third round of the same call (after WAIT). */
  again?: string;
  /** One line each, in character. Intel reports what she has seen, never what it means. */
  advisers: { hawk: string; dove: string; intel: string };
  options: { back: PhoneOptionDef; down: PhoneOptionDef; wait: PhoneOptionDef };
}

/**
 * debrief.yaml: the Federation's hidden thoughts, one or more templates per kind; the engine picks
 * one by seed. Past tense, addressed to the player, plain. Slots as the phones, plus {why} (a reason
 * from strings.why), {from} (the real target when a column was a feint), {step}, {n}.
 */
export const HIDDEN_KINDS = [
  'heading', // They went for {region} because {why}.
  'feint', // Their column at {region} was a feint. The real push was at {from}.
  'bothReal', // Both arrows were real.
  'notTested', // They left {region} alone because they believed you.
  'feintBacked', // They were bluffing at {region}. You backed it anyway; it cost {cost} and they took note.
  'feintBackedDown', // They were bluffing at {region}. Backing it would have cost nothing.
  'feintWaited', // They were bluffing at {region}. You waited, and they left.
  'realBacked', // They meant it at {region}. You backed it and they turned away.
  'realBackFailed', // They meant it at {region}. You backed it from too far away, and it failed.
  'realBackedDown', // They meant it at {region}. You backed down, and they climbed a step.
  'realWaited', // They meant it at {region}. Their forces stayed and the stakes went up.
  'waitedFell', // You waited at {region} once too often. They took it.
  'lineReal', // That line was real: {line} Your {piece} at {region} crossed it.
  'lineBluff', // That line was a bluff: {line} Nothing happened, and they believed you a little more.
  'fall', // You left {region} unanswered, and they took it.
  'spread', // At {step} the fighting at {from} spread to {region} on its own.
  'wayOutAccepted', // They took the way out because {why}.
  'wayOutRefused', // They refused the way out because {why}.
  'accident', // The accident at {region} was nobody's plan.
  'jumpy', // Your {piece} at {region} looked like an invasion to them.
  'jumpyQuiet', // Your {piece} at {region} worried them, but they held their nerve.
  'believed', // By now they believed you would keep your word.
  'doubted', // By now they thought you would back down.
  'falseAlarm', // The alarm at {region} was nothing.
  'trawler', // The trawler at {region} was an excuse: {why}.
  'summit', // They offered the summit because {why}.
  'unpromised', // Nobody had promised {region}; they expected to take it for free.
  'bluffPhone', // Their silence over {region} was the silence of a bluff.
] as const;
export type HiddenKind = (typeof HIDDEN_KINDS)[number];

/** strings.yaml › why: the reasons that fill {why}. Slots {region}, {piece}. */
export const WHY_KINDS = [
  'unguarded', // nobody had promised it
  'dashed', // your promise there was only a line on a map
  'doubted', // they did not believe your promises any more
  'curious', // they wanted to see whether you meant it
  'finish', // they wanted to finish what they had started
  'piece', // they wanted to see whether {piece} would fight
  'gaining', // they were still gaining
  'grievance', // your promise at {region} was the thing in their way
  'indifferent', // they did not care about {region}
  'threat', // {piece} at {region} was what frightened them
  'noThreat', // {piece} was no threat to them
  'afraid', // both sides were afraid by then
  'notAfraid', // they were not afraid enough yet
  'noNeed', // they saw no need to talk yet
  'hungry', // they were hungry
  'wantedToStop', // they wanted to stop while they were ahead
] as const;
export type WhyKind = (typeof WHY_KINDS)[number];

/** strings.yaml › headlines: the tape. One line each, plain. Slots {region}, {from}, {line}, {step}, {n}, {piece}, {term}, {bloc}. */
export const HEADLINE_KINDS = [
  'declared', // Wintermast: '{line}'
  'inherited', // You inherited a promise to defend {region}.
  'pushed', // Their forces moved into {region}.
  'stoppedShort', // Their column near {region} stopped short.
  'tested', // They are testing your promise at {region}.
  'backed', // You backed {region}. They turned away. They are {step}.
  'backedFar', // You backed {region} from far away, and it held. They are {step}.
  'backFailed', // You backed {region} from too far away. It failed.
  'backedDown', // You backed down at {region}. They are {step}.
  'waited', // You waited at {region}.
  'waitedFell', // You waited too long. {region} has fallen.
  'fell', // {region} has fallen.
  'takenStepUp', // A place taken and nobody came. They are {step}.
  'spread', // The fighting at {from} spread to {region}.
  'recovered', // Guns quiet at {region}.
  'calmed', // {region} is calm again.
  'lineCrossed', // Wintermast: 'You have crossed our line. {line}' They are {step}.
  'jumpy', // Wintermast: 'Republic forces at {region} are a provocation.' They are {step}.
  'accident', // An accident at {region}. Nobody ordered it. They are {step}.
  'wayOutAccepted', // Wintermast accepted the way out: {term}. They are {step}.
  'wayOutRefused', // Wintermast refused the way out: {term}.
  'blocSigned', // {bloc} has signed. Wintermast feels the pull.
  'quietWeek', // A quiet week. They gained nothing.
  'gainedWeek', // They took {n} this week.
  'treatySigned', // They signed.
  'worldWar', // The eighth place is fighting. World war.
  'frozen', // Week eight ends. Nothing was signed.
  'alertOn', // You went on alert over {region}.
  'alertOff', // You stood down over {region}. It was nothing.
  'alertWaited', // You waited for a second source on {region}. None came.
  'trawlerBacked', // You backed {region} over the trawler.
  'trawlerDisowned', // You disowned {region} over the trawler.
  'trawlerLeaned', // You leaned on {region} privately.
  'summitAccepted', // You accepted the summit. They are {step}.
  'summitRefused', // You refused the summit.
  'summitWaited', // You asked for terms. The offer lapsed.
  'bluffHeld', // You held your ground at {region}.
  'bluffPulled', // You pulled back from {region}.
  'bluffWaited', // You waited at {region}. Wintermast stayed silent.
  'unpromisedHeld', // You sent what you had to {region}. It held.
  'unpromisedFailed', // You sent what you had to {region}. It was too far.
  'unpromisedLet', // You let {region} go.
] as const;
export type HeadlineKind = (typeof HEADLINE_KINDS)[number];

/** strings.yaml › acts: the player's own acts as the log writes them ('none': a week with no orders). Slots {region}, {piece}, {term}. */
export const ACT_KINDS = ['promise', 'withdraw', 'move', 'wayOut', 'none'] as const;
export type ActKind = (typeof ACT_KINDS)[number];

/** strings.yaml › refusals: why an act was refused (the engine returns the code; the UI shows the words). */
export const REFUSAL_CODES = [
  'not-this-phase',
  'inside-the-cap',
  'already-fighting',
  'already-promised',
  'three-promises',
  'no-influence',
  'not-promised',
  'under-test',
  'moved-already',
  'not-adjacent',
  'no-such-piece',
  'offered-already',
  'bad-term',
  'no-such-phone',
] as const;
export type RefusalCode = (typeof REFUSAL_CODES)[number];

/** strings.yaml › hold: why a promise is solid or dashed (the engine returns the code; slots {piece}, {at}). */
export const HOLD_CODES = ['piece-there', 'piece-near', 'inside-the-cap', 'out-of-reach'] as const;
export type HoldCode = (typeof HOLD_CODES)[number];

export const FALL_CAUSES: readonly FallCause[] = ['back-down', 'back-down-inherited', 'unanswered', 'failed', 'spread', 'waited'];
export const WAY_OUT_TERMS: readonly WayOutTerm[] = ['drop-promise', 'pull-back', 'summit'];

export interface Strings {
  /** The words on the map and the forms. */
  words: {
    defend: string; // WE DEFEND
    tested: string; // TESTED
    fighting: string; // FIGHTING
    back: string; // BACK IT
    down: string; // BACK DOWN
    wait: string; // WAIT
    /** TESTING PUSHING MASSING FIGHTING ALL-OUT. */
    steps: [string, string, string, string, string];
    /** The WAIT form's cost text on the third round, when waiting is backing down. */
    waitIsBackDown: string;
    sendOrders: string; // SEND ORDERS
    wayOut: string; // A WAY OUT
    theyAre: string; // THEY ARE
    war: string; // WAR
    treaty: string; // TREATY
    worldWar: string; // WORLD WAR
    frozen: string; // FROZEN (the third ending's title)
    week: string; // WEEK
    influence: string; // influence
  };
  /** The explanation's three lines (SPEC-SMALL "The game in three sentences"). */
  explanation: [string, string, string];
  /**
   * The collision sentence by what collides. Slots {region}, {line}, {piece}:
   * alliance (the inherited promise itself crosses the line), forces (nothing of yours can reach the
   * place; moving a piece there crosses the line), near (a piece can already reach it; standing in it
   * would cross the line), heading (no line collides; their forces head for the inherited promise).
   */
  collision: { alliance: string; forces: string; near: string; heading: string };
  blocs: Record<Bloc, string>; // the Cap, Highmarch, the Scatter, the Sound, Farsouth
  pieces: Record<PieceKind | 'alert' | 'promise', string>; // the fleet, the brigade, your alert, your promise
  terms: Record<WayOutTerm, string>; // drop a promise, pull a piece back, a summit without preconditions
  /** Number words 0..12 ("no", "one", ... "twelve"). */
  numbers: string[];
  counts: {
    none: string; // no place fighting
    one: string; // one place still fighting
    many: string; // {n} places still fighting
    sentenceNone: string; // No place is fighting.
    sentenceOne: string; // One place is still fighting.
    sentenceMany: string; // {n} places are still fighting.
    placesOne: string; // one place
    placesMany: string; // {n} places
  };
  /** The two typed lines of each ending. Slots {week}, {fighting} (a counts phrase), {because}, {region}, {cause}. */
  endings: { treaty: [string, string]; frozen: [string, string]; war: [string, string] };
  /** The treaty's reason. Slots {region}. */
  because: { heldAndWayOut: string; held: string; wayOut: string; quiet: string };
  /** The world war's "when ...". */
  causes: Record<FallCause, string>;
  /** The two dials in words, and the sentence that joins them. */
  dials: { appetite: { low: string; mid: string; high: string }; jumpiness: { low: string; mid: string; high: string }; line: string };
  why: Record<WhyKind, string>;
  headlines: Record<HeadlineKind, string>;
  acts: Record<ActKind, string>;
  refusals: Record<RefusalCode, string>;
  hold: Record<HoldCode, string>;
}

/** The whole pack, as the virtual module exports it and the loader returns it. */
export interface RedlinesContent {
  advisers: Record<AdviserId, Adviser>;
  lines: LineDef[];
  phones: PhoneTemplate[];
  debrief: Record<HiddenKind, string[]>;
  strings: Strings;
}

/**
 * What a pack is missing for the engine to run: a list of plain problems, empty when the pack will
 * do. The content builder's validator can call this after compiling; the engine's tests call it on
 * the fixture pack.
 */
export function checkContent(c: RedlinesContent): string[] {
  const out: string[] = [];
  for (const id of ADVISER_IDS) if (!c.advisers?.[id]) out.push(`advisers: missing ${id}`);
  if (!c.lines || c.lines.length < 3) out.push('lines: need at least three (the opening draws two real and one bluff)');
  for (const l of c.lines ?? []) {
    if (!LINE_KINDS.includes(l.kind)) out.push(`lines › ${l.id}: unknown kind ${l.kind}`);
    if (!l.regions?.length) out.push(`lines › ${l.id}: covers no region`);
  }
  const kinds = new Set((c.phones ?? []).map((p) => p.kind));
  for (const k of ['test', 'summit', 'false-alarm', 'trawler', 'bluff-crossed', 'fall-unpromised'] as PhoneKind[]) if (!kinds.has(k)) out.push(`phones: no template of kind ${k}`);
  for (const p of c.phones ?? []) {
    if (!PHONE_KINDS.includes(p.kind)) out.push(`phones › ${p.id}: unknown kind ${p.kind}`);
    if (!c.advisers?.[p.caller]) out.push(`phones › ${p.id}: unknown caller ${p.caller}`);
    if (p.text.split(/\s+/).filter(Boolean).length > 40) out.push(`phones › ${p.id}: text over 40 words`);
    for (const key of ['back', 'down', 'wait'] as const) {
      const o = p.options?.[key];
      if (!o?.label || !o?.cost) out.push(`phones › ${p.id}: option ${key} needs label and cost`);
      else if (/\bif they\b/i.test(`${o.label} ${o.cost}`)) out.push(`phones › ${p.id}: option ${key} says "if they"`);
    }
    for (const who of ['hawk', 'dove', 'intel'] as const) if (/\bif they\b/i.test(p.advisers?.[who] ?? '')) out.push(`phones › ${p.id}: ${who} says "if they"`);
  }
  for (const k of HIDDEN_KINDS) if (!c.debrief?.[k]?.length) out.push(`debrief: missing ${k}`);
  const s = c.strings;
  if (!s) return [...out, 'strings: missing'];
  for (const k of HEADLINE_KINDS) if (!s.headlines?.[k]) out.push(`strings › headlines: missing ${k}`);
  for (const k of WHY_KINDS) if (!s.why?.[k]) out.push(`strings › why: missing ${k}`);
  for (const k of ACT_KINDS) if (!s.acts?.[k]) out.push(`strings › acts: missing ${k}`);
  for (const k of REFUSAL_CODES) if (!s.refusals?.[k]) out.push(`strings › refusals: missing ${k}`);
  for (const k of HOLD_CODES) if (!s.hold?.[k]) out.push(`strings › hold: missing ${k}`);
  for (const k of FALL_CAUSES) if (!s.causes?.[k]) out.push(`strings › causes: missing ${k}`);
  for (const k of WAY_OUT_TERMS) if (!s.terms?.[k]) out.push(`strings › terms: missing ${k}`);
  if (!s.numbers || s.numbers.length < 13) out.push('strings › numbers: need the words for 0 to 12');
  if (s.words?.steps?.length !== 5) out.push('strings › words.steps: need five words');
  if (s.explanation?.length !== 3) out.push('strings › explanation: need three lines');
  return out;
}
