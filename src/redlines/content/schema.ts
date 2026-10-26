/**
 * The strict pack format (zod) and the compiler from authored YAML to `RedlinesPack` (the engine's
 * `RedlinesContent` with the pack's extras). The kind lists are the engine's own
 * (src/redlines/engine/content.ts), so a key the engine looks up is a key the schema demands.
 * Pure: no filesystem access here (see load.ts). Cross-reference and voice checks live in
 * validate.ts; this file owns the shape of one item.
 */
import { z } from 'zod';
import {
  ACT_KINDS,
  ADVISER_IDS,
  FALL_CAUSES,
  HEADLINE_KINDS,
  HIDDEN_KINDS,
  HOLD_CODES,
  LINE_KINDS,
  PHONE_KINDS,
  REFUSAL_CODES,
  REFUSE_WHYS,
  WAY_OUT_TERMS,
  WHY_KINDS,
} from '../engine/content.ts';
import type { Adviser, AdviserId, ContentIssue, HiddenKind, PackLine, PackPhone, PackStrings, PhoneKind, PhoneOptionDef, RedlinesPack } from './types.ts';

export { ACT_KINDS, ADVISER_IDS, FALL_CAUSES, HEADLINE_KINDS, HIDDEN_KINDS, HOLD_CODES, LINE_KINDS, PHONE_KINDS, REFUSAL_CODES, REFUSE_WHYS, WAY_OUT_TERMS, WHY_KINDS };
/** Wintermast's short words on the tape after a refused way out: quoted, this many characters once filled ("Wintermast: " takes the rest of the 46). */
export const MAX_WINTERMAST_CHARS = 34;

/** A phone message, filled, is forty words or fewer (SPEC-SMALL "The phone"). */
export const MAX_PHONE_WORDS = 40;
/** An adviser's slip is one line, two at most. */
export const MAX_ADVISER_WORDS = 22;
export const MAX_ADVISER_CHARS = 120;
/** A line as Wintermast declares it. */
export const MAX_LINE_WORDS = 30;
/** The teleprinter prints about 46 characters a line after the time stamp; the map wraps or clips past 56. */
export const MAX_TAPE_CHARS = 46;
export const HARD_TAPE_CHARS = 56;
/** A typed form's cost line: two lines of type under the word. */
export const MAX_COST_CHARS = 110;
export const SOFT_COST_CHARS = 92;
/** A thought in the debrief. */
export const MAX_THOUGHT_WORDS = 30;
/** A choice's word on the typed form. */
export const MAX_LABEL_WORDS = 3;
export const WEEKS = 8;
export const DECLARED_LINES = 8;
/** The kinds that are a test of a promise (one pool: a real push and a feint draw from it alike). */
export const TEST_KINDS: readonly PhoneKind[] = ['test', 'test-inherited', 'feint'];
export const PHONE_KEYS = ['back', 'down', 'wait'] as const;
export const LADDER_WORDS = ['TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT'] as const;
export const BLOC_IDS = ['CAP', 'HMR', 'SCT', 'SND', 'FRS'] as const;
export const PIECE_IDS = ['fleet', 'brigade', 'alert', 'promise'] as const;

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, 'ids are kebab-case: [a-z][a-z0-9-]*');
const regionId = z.string().regex(/^[A-Z]{3}$/, 'regions are three-letter ids from the map (SHL, WMS, VSY ...)');
const line = z.string().trim().min(1);
const s = line;

/** A strict object with one string per key of a list, typed by the list. */
function recordOf<K extends string>(keys: readonly K[]) {
  return z.strictObject(Object.fromEntries(keys.map((k) => [k, s])) as Record<K, typeof s>);
}

export const adviserSchema = z.strictObject({
  id: z.enum(ADVISER_IDS),
  name: line.max(40),
  role: line.max(40),
  tag: line.max(24),
  voice: line.max(240),
});

export const lineSchema = z.strictObject({
  id,
  kind: z.enum(LINE_KINDS),
  regions: z.array(regionId).min(1, { message: 'a line covers at least one region' }),
  text: line,
  tape: line,
});

export const phoneOptionSchema = z.strictObject({ label: line.max(24), cost: line });

export const phoneSchema = z.strictObject({
  id,
  kind: z.enum(PHONE_KINDS as readonly [PhoneKind, ...PhoneKind[]]),
  caller: z.enum(ADVISER_IDS),
  /** Trawler templates: about an island you promised ('promised': the words may claim the promise) or one you did not ('unpromised': they claim none). Absent: either. */
  when: z.enum(['promised', 'unpromised']).optional(),
  text: line,
  again: line.optional(),
  advisers: z.strictObject({ hawk: line, dove: line, intel: line }),
  options: z.strictObject({ back: phoneOptionSchema, down: phoneOptionSchema, wait: phoneOptionSchema }),
});

export const debriefSchema = z.strictObject({
  kind: z.enum(HIDDEN_KINDS),
  thoughts: z.array(line).min(1, { message: 'at least one thought' }),
});

/** strings.yaml, every key named (unknown keys are errors, so a typo cannot hide a missing word). */
export const stringsSchema = z.strictObject({
  // ---- the engine's sections (src/redlines/engine/content.ts `Strings`) ----
  words: z.strictObject({
    defend: s,
    tested: s,
    fighting: s,
    back: s,
    down: s,
    wait: s,
    steps: z.tuple([s, s, s, s, s]),
    waitIsBackDown: s,
    sendOrders: s,
    wayOut: s,
    theyAre: s,
    war: s,
    treaty: s,
    worldWar: s,
    frozen: s,
    week: s,
    influence: s,
  }),
  explanation: z.tuple([s, s, s]),
  collision: z.strictObject({ alliance: s, forces: s, near: s, heading: s }),
  blocs: recordOf(BLOC_IDS),
  pieces: recordOf(PIECE_IDS),
  terms: recordOf(WAY_OUT_TERMS),
  numbers: z.array(s).length(13, { message: 'number words for 0 to 12 (the WAR bar counts to twelve)' }),
  counts: z.strictObject({ none: s, one: s, many: s, sentenceNone: s, sentenceOne: s, sentenceMany: s, placesOne: s, placesMany: s }),
  endings: z.strictObject({ treaty: z.tuple([s, s]), frozen: z.tuple([s, s]), war: z.tuple([s, s]) }),
  because: z.strictObject({ heldAndWayOut: s, held: s, wayOut: s, quiet: s }),
  causes: recordOf(FALL_CAUSES),
  dials: z.strictObject({
    appetite: z.strictObject({ low: s, mid: s, high: s }),
    jumpiness: z.strictObject({ low: s, mid: s, high: s }),
    line: s,
    lineOne: s,
  }),
  why: recordOf(WHY_KINDS),
  wintermast: recordOf(REFUSE_WHYS),
  headlines: recordOf(HEADLINE_KINDS),
  acts: recordOf(ACT_KINDS),
  refusals: recordOf(REFUSAL_CODES),
  hold: recordOf(HOLD_CODES),
  // ---- the screens' sections (types.ts `ScreenStrings`) ----
  title: z.strictObject({ subtitle: s, play: s, continue: s, howToPlay: s, blurb: s }),
  screen: z.strictObject({
    pressed: s,
    weekOf: s,
    warNone: s,
    warOne: s,
    warMany: s,
    treatySub: s,
    ordersSent: s,
    heading: s,
    inherited: s,
    skip: s,
    next: s,
    begin: s,
  }),
  act: z.strictObject({
    promise: s,
    withdraw: s,
    moveHere: s,
    move: s,
    cancel: s,
    promiseCost: s,
    promiseSolid: s,
    promiseDashed: s,
    moveCost: s,
    withdrawCost: s,
    wayOutIntro: s,
    wayOutOffered: s,
    termLabels: recordOf(WAY_OUT_TERMS),
    termCosts: recordOf(WAY_OUT_TERMS),
  }),
  note: z.strictObject({ pushing: s, pushingTwo: s, taken: s, takenMany: s, tested: s, heading: s }),
  phone: z.strictObject({ ringing: s, round2: s, round3: s, answered: s }),
  menu: z.strictObject({ menu: s, resume: s, howToPlay: s, sound: s, off: s, on: s, quit: s, quitSure: s, yes: s, no: s }),
  debrief: z.strictObject({ title: s, intro: s, week: s, youDid: s, theyThought: s, nothingHidden: s, next: s, back: s, done: s, score: s, again: s, toTitle: s }),
  howToPlay: z.strictObject({ title: s, lines: z.array(s).min(3).max(8) }),
  flavour: z.array(s).min(1),
});

/** The schema's output is the pack's strings type, checked at compile time both ways. */
type Inferred = z.infer<typeof stringsSchema>;
const _toPack: PackStrings = {} as Inferred;
const _fromPack: Inferred = {} as PackStrings;
void _toPack;
void _fromPack;

/**
 * The keys of strings.yaml whose value is a word on a button, a stamp or a label, and is therefore
 * typed in capitals (the validator warns when one is not). Dotted paths.
 */
export const UPPER_PATHS: readonly string[] = [
  'words.defend', 'words.tested', 'words.fighting', 'words.back', 'words.down', 'words.wait', 'words.sendOrders', 'words.wayOut', 'words.theyAre',
  'words.war', 'words.treaty', 'words.worldWar', 'words.frozen', 'words.week',
  'title.play', 'title.continue', 'title.howToPlay', 'screen.pressed', 'screen.ordersSent', 'screen.skip', 'screen.next', 'screen.begin',
  'act.promise', 'act.withdraw', 'act.moveHere', 'act.move', 'act.cancel', 'act.termLabels.drop-promise', 'act.termLabels.pull-back', 'act.termLabels.summit',
  'phone.ringing', 'phone.answered', 'headlines.treatySigned',
  'debrief.title', 'debrief.next', 'debrief.back', 'debrief.done', 'debrief.score', 'debrief.again', 'debrief.toTitle',
  'menu.menu', 'menu.resume', 'menu.howToPlay', 'menu.sound', 'menu.off', 'menu.on', 'menu.quit', 'menu.yes', 'menu.no', 'howToPlay.title',
];

/** A pack file as read from disk: its path relative to the pack and its parsed YAML. */
export interface RawFile {
  file: string;
  items: unknown;
}

export interface RawRedlines {
  advisers: RawFile;
  lines: RawFile;
  phones: RawFile;
  debrief: RawFile;
  /** A YAML map, not a list. */
  strings: RawFile;
}

export function formatZodError(e: z.ZodError): string {
  return e.issues.map((i) => (i.path.length ? `${i.path.map(String).join('.')}: ${i.message}` : i.message)).join('; ');
}

/**
 * Parse every item of the pack against the schema and assemble the content. Shape errors are
 * reported per item and the item is dropped; the rest of the pack still compiles, so a writer
 * mid-edit keeps a playable pack in dev. strings.yaml is all or nothing: a bad strings file is one
 * error and the compiled pack is null (the loader and the plugin treat that as fatal).
 */
export function compileRedlines(raw: RawRedlines): { content: RedlinesPack | null; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });

  const parseList = <T>(f: RawFile, what: string, schema: z.ZodType<T, any>, onItem: (item: T, where: string) => void) => {
    if (f.items === undefined || f.items === null) return;
    if (!Array.isArray(f.items)) {
      err(f.file, `file must contain a YAML list of ${what}`);
      return;
    }
    f.items.forEach((item, i) => {
      const rec = item as { id?: unknown; kind?: unknown } | null;
      const guess = typeof rec?.id === 'string' ? rec.id : typeof rec?.kind === 'string' ? rec.kind : `item #${i + 1}`;
      const where = `${f.file} › ${guess}`;
      const r = schema.safeParse(item);
      if (!r.success) {
        err(where, formatZodError(r.error));
        return;
      }
      onItem(r.data, where);
    });
  };

  const advisers = {} as Record<AdviserId, Adviser>;
  const adviserOrder: AdviserId[] = [];
  parseList(raw.advisers, 'advisers', adviserSchema, (a, where) => {
    if (advisers[a.id]) return err(where, 'duplicate adviser id');
    advisers[a.id] = { id: a.id, name: a.name, role: a.role, tag: a.tag, voice: a.voice };
    adviserOrder.push(a.id);
  });

  const lines: PackLine[] = [];
  parseList(raw.lines, 'lines', lineSchema, (l, where) => {
    if (lines.some((x) => x.id === l.id)) return err(where, 'duplicate line id');
    lines.push({ id: l.id, kind: l.kind, regions: [...l.regions], text: l.text, tape: l.tape });
  });

  const phones: PackPhone[] = [];
  parseList(raw.phones, 'phone templates', phoneSchema, (p, where) => {
    if (phones.some((x) => x.id === p.id)) return err(where, 'duplicate phone id');
    const opt = (o: { label: string; cost: string }): PhoneOptionDef => ({ label: o.label, cost: o.cost });
    const phone: PackPhone = {
      id: p.id,
      kind: p.kind,
      caller: p.caller,
      text: p.text,
      advisers: { hawk: p.advisers.hawk, dove: p.advisers.dove, intel: p.advisers.intel },
      options: { back: opt(p.options.back), down: opt(p.options.down), wait: opt(p.options.wait) },
    };
    if (p.again) phone.again = p.again;
    if (p.when) phone.when = p.when;
    phones.push(phone);
  });

  const debrief = {} as Record<HiddenKind, string[]>;
  parseList(raw.debrief, 'debrief thoughts', debriefSchema, (d, where) => {
    if (debrief[d.kind]) return err(where, 'duplicate debrief kind');
    debrief[d.kind] = [...d.thoughts];
  });

  let strings: PackStrings | null = null;
  if (raw.strings.items === undefined || raw.strings.items === null) {
    err(raw.strings.file, 'strings.yaml is empty');
  } else {
    const r = stringsSchema.safeParse(raw.strings.items);
    if (!r.success) err(raw.strings.file, formatZodError(r.error));
    else strings = r.data;
  }

  if (!strings) return { content: null, issues };
  return { content: { advisers, adviserOrder, lines, phones, debrief, strings }, issues };
}
