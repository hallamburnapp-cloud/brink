/**
 * The strict card format (zod) and the compiler from authored YAML to `ThirtyContent`.
 * Pure: no filesystem access here (see load.ts). Cross-reference checks (regions, advisers,
 * pieces, follow-ups) live in validate.ts; this file owns the shape of one item.
 */
import { z } from 'zod';
import { REGION_SET_NAMES } from './regions.ts';
import type {
  Adviser,
  Card,
  Choice,
  ChoiceCard,
  Condition,
  Consequence,
  ContentIssue,
  Follow,
  MapCard,
  MapTarget,
  Piece,
  ThirtyContent,
} from './types.ts';

export const MAX_TEXT_WORDS = 40;
export const MAX_HINT_CHARS = 60;
export const MAX_CHOICE_WORDS = 6;
export const DAYS = 30;

export const CHOICE_TAGS = ['CALM', 'FORCE', 'RISKY', 'HOME'] as const;
export const PIECE_TAGS = [...CHOICE_TAGS, 'any', 'arcs', 'map'] as const;
export const MARKS = ['red-line', 'warned', 'guarded'] as const;

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, 'ids are kebab-case: [a-z][a-z0-9-]*');
const regionId = z.string().regex(/^[A-Z]{3}$/, 'regions are three-letter ids from the map (SHL, WMS, VSY ...)');
const tag = z.enum(CHOICE_TAGS);
const heat = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const dayNumber = z.number().int().min(1).max(DAYS);
const line = z.string().trim().min(1);

const dayRange = z
  .tuple([dayNumber, dayNumber])
  .refine(([a, b]) => a <= b, { message: 'day range must be [first, last] with first <= last' });

/** `follow: strait-02` or `follow: { card: strait-02, in: 2 }` or `in: [1, 3]`; normalised to { card, in: [min, max] }. */
const followSchema = z
  .union([
    id,
    z.strictObject({
      card: id,
      in: z.union([z.number().int().min(0).max(DAYS), z.tuple([z.number().int().min(0).max(DAYS), z.number().int().min(0).max(DAYS)])]).optional(),
    }),
  ])
  .transform((f): Follow => {
    if (typeof f === 'string') return { card: f, in: [1, 2] };
    const win = f.in === undefined ? [1, 2] : typeof f.in === 'number' ? [f.in, f.in] : f.in;
    return { card: f.card, in: [win[0], win[1]] };
  })
  .refine((f) => f.in[0] <= f.in[1], { message: 'follow-up window must be [soonest, latest]' });

const consequenceFields = {
  heats: regionId.optional(),
  crisis: regionId.optional(),
  relieve: regionId.optional(),
  mark: z.enum(MARKS).optional(),
  follow: followSchema.optional(),
};

const consequenceSchema = z.strictObject(consequenceFields);

const odds = z.number().int().min(5).max(95);

const oddsRule = (c: { tag: string; odds?: number; fail?: unknown }, ctx: z.RefinementCtx) => {
  if (c.tag === 'RISKY' && c.odds === undefined) ctx.addIssue({ code: 'custom', message: 'a RISKY choice needs odds (5–95)', path: ['odds'] });
  if (c.tag !== 'RISKY' && c.odds !== undefined) ctx.addIssue({ code: 'custom', message: 'only a RISKY choice has odds', path: ['odds'] });
  if (c.tag !== 'RISKY' && c.fail !== undefined) ctx.addIssue({ code: 'custom', message: 'only a RISKY choice has a fail branch', path: ['fail'] });
};

export const choiceSchema = z
  .strictObject({
    text: line.refine((s) => wordCount(s) <= MAX_CHOICE_WORDS, { message: `the action is 3 to 5 words (at most ${MAX_CHOICE_WORDS})` }),
    tag,
    hint: line.max(MAX_HINT_CHARS, { message: `the hint fits one line: at most ${MAX_HINT_CHARS} characters` }),
    odds: odds.optional(),
    fail: consequenceSchema.optional(),
    ...consequenceFields,
  })
  .superRefine(oddsRule);

export const targetSchema = z
  .strictObject({
    region: regionId,
    /** The place is chosen from this set on the live map when the card is dealt; `region` is then the fallback. */
    from: z.enum(REGION_SET_NAMES).optional(),
    hint: line.max(MAX_HINT_CHARS, { message: `the label fits one line: at most ${MAX_HINT_CHARS} characters` }),
    tag: tag.default('CALM'),
    odds: odds.optional(),
    fail: consequenceSchema.optional(),
    ...consequenceFields,
  })
  .superRefine(oddsRule);

const conditionSchema = z.strictObject({
  heat: z
    .tuple([heat, heat])
    .refine(([a, b]) => a <= b, { message: 'heat range must be [lowest, highest]' })
    .optional(),
  pieces: z.array(id).optional(),
  without: z.array(id).optional(),
});

const cardFields = {
  id,
  arc: id.optional(),
  adviser: id,
  day: dayRange.default([1, DAYS]),
  text: line.refine((s) => wordCount(s) <= MAX_TEXT_WORDS, { message: `the message is ${MAX_TEXT_WORDS} words or fewer` }),
  when: conditionSchema.optional(),
  domestic: z.enum(['public', 'economy']).optional(),
  /** A warning card: the early-warning screens show something that may not be real (the false-alarm arc). */
  alarm: z.boolean().optional(),
};

export const choiceCardSchema = z.strictObject({
  ...cardFields,
  map: z.literal(false).optional(),
  region: regionId,
  left: choiceSchema,
  right: choiceSchema,
});

export const mapCardSchema = z.strictObject({
  ...cardFields,
  map: z.literal(true),
  region: regionId.optional(),
  targets: z
    .array(targetSchema)
    .min(2, { message: 'a map card offers two or three places to tap' })
    .max(3, { message: 'a map card offers two or three places to tap' }),
});

export const adviserSchema = z.strictObject({
  id,
  name: line.max(40),
  role: line.max(40),
  voice: line.max(200),
  portrait: id.optional(),
});

export const pieceSchema = z.strictObject({
  id,
  name: line.max(40),
  chip: line.max(12, { message: 'the chip name is one short word (at most 12 characters)' }),
  icon: id,
  rule: line.max(120),
  tags: z.array(z.enum(PIECE_TAGS)).min(1).max(2),
  kind: z.enum(['adviser', 'policy']),
  excludes: z.array(id).optional(),
});

export type RawChoiceCard = z.infer<typeof choiceCardSchema>;
export type RawMapCard = z.infer<typeof mapCardSchema>;

/** A pack file as read from disk: its path relative to the pack and its parsed YAML (a list). */
export interface RawFile {
  file: string;
  items: unknown;
}

export interface RawThirty {
  advisers: RawFile;
  pieces: RawFile;
  /** regions.yaml, domestic.yaml, map.yaml and every arcs/*.yaml. */
  cards: RawFile[];
}

export function formatZodError(e: z.ZodError): string {
  return e.issues.map((i) => (i.path.length ? `${i.path.map(String).join('.')}: ${i.message}` : i.message)).join('; ');
}

const compileConsequence = (c: z.infer<typeof consequenceSchema> | undefined): Consequence | undefined => {
  if (!c) return undefined;
  const out: Consequence = {};
  if (c.heats) out.heats = c.heats;
  if (c.crisis) out.crisis = c.crisis;
  if (c.relieve) out.relieve = c.relieve;
  if (c.mark) out.mark = c.mark;
  if (c.follow) out.follow = c.follow;
  return out;
};

const compileChoice = (c: z.infer<typeof choiceSchema>): Choice => {
  const out: Choice = { text: c.text, tag: c.tag, hint: c.hint, ...compileConsequence(c) };
  if (c.odds !== undefined) out.odds = c.odds;
  const fail = compileConsequence(c.fail);
  if (fail) out.fail = fail;
  return out;
};

const compileTarget = (t: z.infer<typeof targetSchema>): MapTarget => {
  const out: MapTarget = { region: t.region, hint: t.hint, tag: t.tag, ...compileConsequence(t) };
  if (t.from) out.from = t.from;
  if (t.odds !== undefined) out.odds = t.odds;
  const fail = compileConsequence(t.fail);
  if (fail) out.fail = fail;
  return out;
};

const compileCondition = (w: z.infer<typeof conditionSchema> | undefined): Condition => ({
  heat: w?.heat ?? [0, 3],
  pieces: w?.pieces ?? [],
  without: w?.without ?? [],
});

/** Every follow-up a card can issue, from either button, either branch, or any target. */
export function followsOf(card: Card): Follow[] {
  const out: Follow[] = [];
  const take = (c: Consequence | undefined) => {
    if (c?.follow) out.push(c.follow);
  };
  if (card.map) {
    for (const t of card.targets) {
      take(t);
      take(t.fail);
    }
  } else {
    for (const ch of [card.left, card.right]) {
      take(ch);
      take(ch.fail);
    }
  }
  return out;
}

/**
 * Parse every item of the pack against the schema and assemble the content. Shape errors are
 * reported per item and the item is dropped; the rest of the pack still compiles, so a writer
 * mid-edit keeps a playable pack in dev.
 */
export function compileThirty(raw: RawThirty): { content: ThirtyContent; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });

  const parseList = <T>(f: RawFile, what: string, schema: z.ZodType<T, any>, onItem: (item: T, where: string) => void) => {
    if (f.items === undefined || f.items === null) return;
    if (!Array.isArray(f.items)) {
      err(f.file, `file must contain a YAML list of ${what}`);
      return;
    }
    f.items.forEach((item, i) => {
      const guess = typeof (item as { id?: unknown })?.id === 'string' ? (item as { id: string }).id : `item #${i + 1}`;
      const where = `${f.file} › ${guess}`;
      const r = schema.safeParse(item);
      if (!r.success) {
        err(where, formatZodError(r.error));
        return;
      }
      onItem(r.data, where);
    });
  };

  const advisers: Record<string, Adviser> = {};
  const adviserOrder: string[] = [];
  parseList(raw.advisers, 'advisers', adviserSchema, (a, where) => {
    if (advisers[a.id]) return err(where, 'duplicate adviser id');
    advisers[a.id] = { id: a.id, name: a.name, role: a.role, voice: a.voice, portrait: a.portrait ?? a.id };
    adviserOrder.push(a.id);
  });

  const pieces: Record<string, Piece> = {};
  const pieceOrder: string[] = [];
  parseList(raw.pieces, 'pieces', pieceSchema, (p, where) => {
    if (pieces[p.id]) return err(where, 'duplicate piece id');
    pieces[p.id] = { id: p.id, name: p.name, chip: p.chip, icon: p.icon, rule: p.rule, tags: p.tags, kind: p.kind, excludes: p.excludes ?? [] };
    pieceOrder.push(p.id);
  });

  const cards: Record<string, Card> = {};
  const cardOrder: string[] = [];
  const arcs: Record<string, string[]> = {};
  const addCard = (card: Card, where: string) => {
    if (cards[card.id]) return err(where, `duplicate card id (also in ${cards[card.id].file})`);
    cards[card.id] = card;
    cardOrder.push(card.id);
    if (card.arc) (arcs[card.arc] ??= []).push(card.id);
  };
  for (const f of raw.cards) {
    if (f.items === undefined || f.items === null) continue;
    if (!Array.isArray(f.items)) {
      err(f.file, 'file must contain a YAML list of cards');
      continue;
    }
    f.items.forEach((item, i) => {
      const isMap = (item as { map?: unknown })?.map === true;
      const guess = typeof (item as { id?: unknown })?.id === 'string' ? (item as { id: string }).id : `item #${i + 1}`;
      const where = `${f.file} › ${guess}`;
      if (isMap) {
        const r = mapCardSchema.safeParse(item);
        if (!r.success) return err(where, formatZodError(r.error));
        const d = r.data;
        const card: MapCard = {
          id: d.id,
          adviser: d.adviser,
          arc: d.arc ?? null,
          day: d.day,
          text: d.text,
          when: compileCondition(d.when),
          domestic: d.domestic ?? null,
          alarm: d.alarm ?? false,
          chained: false,
          file: f.file,
          map: true,
          region: d.region ?? null,
          targets: d.targets.map(compileTarget),
        };
        addCard(card, where);
      } else {
        const r = choiceCardSchema.safeParse(item);
        if (!r.success) return err(where, formatZodError(r.error));
        const d = r.data;
        const card: ChoiceCard = {
          id: d.id,
          adviser: d.adviser,
          arc: d.arc ?? null,
          day: d.day,
          text: d.text,
          when: compileCondition(d.when),
          domestic: d.domestic ?? null,
          alarm: d.alarm ?? false,
          chained: false,
          file: f.file,
          map: false,
          region: d.region,
          left: compileChoice(d.left),
          right: compileChoice(d.right),
        };
        addCard(card, where);
      }
    });
  }
  // A card some follow-up names is reached through its arc, never drawn on its own.
  for (const id of cardOrder) for (const f of followsOf(cards[id])) if (cards[f.card]) cards[f.card].chained = true;

  return { content: { advisers, adviserOrder, pieces, pieceOrder, cards, cardOrder, arcs }, issues };
}
