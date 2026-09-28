/**
 * Strict content schema (zod) and the compiler from authored YAML shapes to the
 * engine's Content type. Pure: no filesystem access here (see tools/load.ts).
 */
import { z } from 'zod';
import type {
  ActDef,
  ArchetypeDef,
  CardDef,
  Content,
  DifficultyDef,
  EndingDef,
  FlashpointDef,
  OrderDef,
  PieceDef,
  Seat,
  SeatDef,
  SpeakerDef,
} from '../engine/types.ts';
import { SEATS } from '../engine/types.ts';
import { RARITY_PRICE, deriveBase } from '../engine/leverage.ts';

const seat = z.enum(['republic', 'federation', 'coalition']);
const mode = z.enum(['daily', 'endless', 'challenge']);
const meterKey = z.enum(['public', 'military', 'allies', 'economy', 'escalation']);
const hiddenKey = z.enum(['trust_primary', 'trust_secondary', 'intel', 'commitment']);
const effectKey = z.enum(['public', 'military', 'allies', 'economy', 'escalation', 'trust_primary', 'trust_secondary', 'intel', 'commitment']);
const rarity = z.enum(['common', 'uncommon', 'rare', 'legendary']);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'ids are snake_case: [a-z][a-z0-9_]*');
const flag = z.string().regex(/^[a-z][a-z0-9_:]*$/, 'flags are snake_case, optionally namespaced with ":"');
const tag = z.string().regex(/^[a-z][a-z0-9_]*$/);

// partialRecord: zod v4's record over an enum is exhaustive; effects name only the keys they touch.
export const effectsSchema = z.partialRecord(effectKey, z.number().int().min(-60).max(60));

const range = z.object({ min: z.number().optional(), max: z.number().optional() }).strict();

export const conditionSchema = z
  .object({
    flags_all: z.array(flag).optional(),
    flags_any: z.array(flag).optional(),
    flags_none: z.array(flag).optional(),
    values: z.partialRecord(effectKey, range).optional(),
    pieces_any: z.array(id).optional(),
    pieces_all: z.array(id).optional(),
    pieces_none: z.array(id).optional(),
    day: range.optional(),
    seen: z.array(id).optional(),
    unseen: z.array(id).optional(),
    act_card_min: z.number().int().min(0).optional(),
    act: range.optional(),
  })
  .strict();

const followSchema = z
  .object({ card: id, in: z.number().int().min(0).max(12).default(1), chance: z.number().min(0).max(1).optional() })
  .strict();

const outcomeSchema = z
  .object({
    text: z.string().max(400).optional(),
    effects: effectsSchema.optional(),
    follow: z.array(followSchema).optional(),
    set: z.array(flag).optional(),
    clear: z.array(flag).optional(),
    ending: id.optional(),
    capital: z.number().int().min(-6).max(6).optional(),
  })
  .strict();

const oddsSchema = z
  .object({
    label: z.string().min(2).max(40),
    base: z.number().min(0.05).max(0.95),
    tags: z.array(tag).default([]),
    success: outcomeSchema,
    failure: outcomeSchema,
  })
  .strict();

export const choiceSchema = z
  .object({
    text: z.string().min(2).max(90),
    effects: effectsSchema.default({}),
    tags: z.array(tag).default([]),
    /** Printed base leverage; derived from effects and tags when omitted. */
    base: z.number().int().min(1).max(80).optional(),
    capital: z.number().int().min(-6).max(6).optional(),
    odds: oddsSchema.optional(),
    follow: z.array(followSchema).optional(),
    set: z.array(flag).optional(),
    clear: z.array(flag).optional(),
    ending: id.optional(),
    reveal: hiddenKey.optional(),
    spend_charge: z.literal('deescalation').optional(),
  })
  .strict();

const actRange = z.union([z.number().int().min(1).max(5), z.tuple([z.number().int().min(1).max(5), z.number().int().min(1).max(5)])]);

export const cardSchema = z
  .object({
    id,
    arc: id.optional(),
    advisor: id,
    acts: actRange.default([1, 5]),
    seats: z.array(seat).min(1).optional(),
    text: z.string().min(20).max(520),
    left: choiceSchema,
    right: choiceSchema,
    timer: z.number().int().min(5).max(20).optional(),
    timeout: z.enum(['left', 'right']).optional(),
    conditions: conditionSchema.optional(),
    tags: z.array(tag).default([]),
    weight: z.number().min(0).max(10).optional(),
    modes: z.array(mode).min(1).optional(),
    once: z.boolean().default(true),
    warning: z
      .object({ true_follow: id, false_follow: id, in: z.number().int().min(0).max(12).default(2), bias: z.number().min(-0.5).max(0.5).optional() })
      .strict()
      .optional(),
    flashpoint: id.optional(),
    bluff: z.boolean().default(false),
    shop: z.boolean().default(false),
    chained: z.boolean().optional(),
    note: z.string().optional(),
  })
  .strict();

export type RawCard = z.infer<typeof cardSchema>;

const ruleId = z.enum([
  'hide_escalation_cost',
  'free_deescalation_per_act',
  'remove_card_per_act',
  'reveal_intel',
  'reveal_trust',
  'reveal_commitment',
  'trust_variance',
  'commitment_lock',
  'warning_floor',
  'warning_frequency',
  'launch_on_warning',
  'escalation_twitch',
  'allies_anchor',
  'military_floor',
  'nfu',
  'security_dilemma',
  'deterrence',
  'reassurance',
  'red_lines',
  'economy_floor',
  'escalate_to_deescalate',
  'predelegation',
  'accidents_twice',
  'deadman_switch',
  'perfect_intel',
  'extra_offer',
  'shop_discount',
  'capital_per_act',
  'sell_bonus',
  'free_rerolls',
  'extra_order_slot',
  'extra_piece_slot',
]);

const scaleTrigger = z.enum(['accident_survived', 'accident_avoided', 'flashpoint_cleared', 'ante_met', 'ante_smashed', 'choice', 'act_start', 'roll_success', 'roll_failure', 'near_miss']);

const modifierSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('effect'),
      key: z.union([effectKey, z.enum(['meters', 'hidden', 'trust'])]).optional(),
      tags: z.array(tag).optional(),
      sign: z.enum(['pos', 'neg']).optional(),
      add: z.number().optional(),
      mult: z.number().min(0).max(4).optional(),
      always: z.boolean().optional(),
    })
    .strict()
    .refine((m) => !m.always || (m.add !== undefined && m.key !== undefined && m.key !== 'meters' && m.key !== 'hidden'), {
      message: '`always` needs an `add` and a specific key (or "trust")',
    }),
  z.object({ kind: z.literal('odds'), tags: z.array(tag).optional(), add: z.number().min(-0.5).max(0.5).optional(), mult: z.number().min(0).max(3).optional() }).strict(),
  z.object({ kind: z.literal('intel'), add: z.number().optional(), mult: z.number().min(0).max(3).optional() }).strict(),
  z.object({ kind: z.literal('timer'), add: z.number().optional(), mult: z.number().min(0.2).max(3).optional() }).strict(),
  z.object({ kind: z.literal('weight'), tags: z.array(tag).optional(), ids: z.array(id).optional(), mult: z.number().min(0).max(10) }).strict(),
  z.object({ kind: z.literal('drift'), key: effectKey, per_card: z.number().min(-3).max(3), when: conditionSchema.optional() }).strict(),
  z.object({ kind: z.literal('floor'), value: z.number().int().min(0).max(90) }).strict(),
  z.object({ kind: z.literal('ceiling'), value: z.number().int().min(10).max(100) }).strict(),
  z
    .object({
      kind: z.literal('leverage'),
      tags: z.array(tag).optional(),
      when: conditionSchema.optional(),
      base_add: z.number().min(-40).max(80).optional(),
      mult_add: z.number().min(-3).max(12).optional(),
      mult_mult: z.number().min(0.1).max(10).optional(),
      per: effectKey.optional(),
      per_above: z.number().min(0).max(100).optional(),
      per_step: z.number().min(1).max(50).optional(),
    })
    .strict(),
  z.object({ kind: z.literal('retrigger'), tags: z.array(tag).optional(), when: conditionSchema.optional(), times: z.number().int().min(1).max(3).optional() }).strict(),
  z
    .object({
      kind: z.literal('scale'),
      on: scaleTrigger,
      tags: z.array(tag).optional(),
      mult_add: z.number().min(0).max(3).optional(),
      base_add: z.number().min(0).max(30).optional(),
      max: z.number().min(0).max(100).optional(),
    })
    .strict(),
  z.object({ kind: z.literal('accident'), mult: z.number().min(0).max(4).optional(), severity_mult: z.number().min(0).max(4).optional() }).strict(),
  z.object({ kind: z.literal('rule'), rule: ruleId, value: z.number().optional() }).strict(),
]);

const unlockSchema = z.object({ id, label: z.string().min(2).max(80), hint: z.string().min(2).max(160) }).strict();

export const pieceSchema = z
  .object({
    id,
    pool: z.enum(['advisor', 'doctrine', 'asset']),
    rarity: rarity.default('common'),
    price: z.number().int().min(1).max(30).optional(),
    name: z.string().min(2).max(60),
    title: z.string().min(2).max(60),
    blurb: z.string().min(10).max(320),
    mechanics: z.string().min(10).max(360),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    art: id,
    modifiers: z.array(modifierSchema).default([]),
    grants: z.array(flag).default([]),
    tags: z.array(tag).default([]),
    offer_weight: z.number().min(0).max(5).default(1),
    seats: z.array(seat).min(1).optional(),
    min_act: z.number().int().min(1).max(5).optional(),
    excludes: z.array(id).optional(),
    unlock: unlockSchema.optional(),
  })
  .strict();

const orderEffect = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meter'), key: effectKey, delta: z.number().int().min(-40).max(40) }).strict(),
  z.object({ type: z.literal('retrigger_next'), times: z.number().int().min(1).max(3).optional() }).strict(),
  z.object({ type: z.literal('reveal'), key: hiddenKey }).strict(),
  z.object({ type: z.literal('skip_accident') }).strict(),
  z.object({ type: z.literal('bury') }).strict(),
  z.object({ type: z.literal('capital'), delta: z.number().int().min(1).max(10) }).strict(),
  z.object({ type: z.literal('charge'), charge: z.enum(['deescalation', 'removal']), count: z.number().int().min(1).max(3) }).strict(),
  z.object({ type: z.literal('leverage'), amount: z.number().int().min(1).max(5000) }).strict(),
  z.object({ type: z.literal('mult_next'), mult: z.number().min(1.1).max(10) }).strict(),
]);

export const orderSchema = z
  .object({
    id,
    name: z.string().min(2).max(40),
    blurb: z.string().min(10).max(240),
    mechanics: z.string().min(5).max(200),
    price: z.number().int().min(1).max(20),
    rarity: rarity.default('common'),
    effect: orderEffect,
    art: id,
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();

export const archetypeSchema = z
  .object({
    id,
    name: z.string().min(2).max(40),
    blurb: z.string().min(10).max(320),
    core: z.array(id).min(2),
    support: z.array(id).default([]),
    style: z.enum(['brink', 'standdown', 'hybrid']),
  })
  .strict();

const endingTrigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meter'), key: meterKey, at: z.union([z.literal(0), z.literal(100)]) }).strict(),
  z.object({ type: z.literal('run_end') }).strict(),
  z.object({ type: z.literal('forced') }).strict(),
]);

export const endingSchema = z
  .object({
    id,
    name: z.string().min(2).max(60),
    kind: z.enum(['nuclear', 'removed', 'standdown', 'survival', 'special']),
    trigger: endingTrigger,
    conditions: conditionSchema.optional(),
    seats: z.array(seat).min(1).optional(),
    priority: z.number().int().min(0).max(100).default(10),
    text: z.string().min(80).max(1600),
    moment_label: z.string().min(4).max(60),
    compendium: z.string().min(10).max(200),
    emoji: z.string().min(1).max(8),
    achievements: z.array(id).optional(),
  })
  .strict();

export const seatSchema = z
  .object({
    id: seat,
    name: z.string(),
    the: z.string(),
    adjective: z.string(),
    leader_title: z.string(),
    capital: z.string(),
    rivals: z.tuple([seat, seat]),
    meters: z.object({ public: z.number(), military: z.number(), allies: z.number(), economy: z.number(), escalation: z.number() }).strict(),
    hidden: z.object({ trust_primary: z.number(), trust_secondary: z.number(), intel: z.number(), commitment: z.number() }).strict(),
    blurb: z.string().min(20).max(400),
    strengths: z.string().min(5).max(200),
    vulnerabilities: z.string().min(5).max(200),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    starting_pieces: z.array(id).default([]),
    starting_capital: z.number().int().min(0).max(20).optional(),
    unlock: unlockSchema.optional(),
  })
  .strict();

export const flashpointSchema = z
  .object({
    id,
    name: z.string().min(2).max(60),
    acts: actRange,
    conditions: conditionSchema.optional(),
    entry: id,
    weight: z.number().min(0).max(10).default(1),
    false_alarm_entry: id.optional(),
    bluff_entry: id.optional(),
    blurb: z.string().min(10).max(300),
  })
  .strict();

export const speakerSchema = z
  .object({
    id,
    name: z.string().min(1).max(60),
    role: z.string().min(2).max(60),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    art: id,
    voice: z.string().max(400).optional(),
  })
  .strict();

export const actSchema = z
  .object({
    index: z.number().int().min(1).max(5),
    name: z.string(),
    cards: z.number().int().min(6).max(30),
    effect_scale: z.number().min(0.5).max(3),
    intel_shift: z.number().min(-50).max(50),
    timer_scale: z.number().min(0.3).max(2),
    day_per_card: z.number().min(0.1).max(2),
    target: z.number().int().min(50),
    cooling: z.number().min(0).max(3).optional(),
    recovery: z.number().min(0).max(3).optional(),
  })
  .strict();

export const difficultySchema = z
  .object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    name: z.string(),
    effect_scale: z.number().min(0.5).max(3),
    intel_shift: z.number().min(-50).max(50),
    timer_scale: z.number().min(0.3).max(2),
    start_escalation: z.number().min(-30).max(60),
    target_scale: z.number().min(0.5).max(3).optional(),
    unlock: id.optional(),
  })
  .strict();

export const rulesFileSchema = z.object({ acts: z.array(actSchema).length(5), difficulties: z.array(difficultySchema).min(1) }).strict();

export interface RawContent {
  cards: { file: string; items: unknown[] }[];
  pieces: { file: string; items: unknown[] }[];
  endings: { file: string; items: unknown[] }[];
  seats: { file: string; item: unknown }[];
  flashpoints: { file: string; items: unknown[] }[];
  speakers: { file: string; items: unknown[] };
  rules: { file: string; item: unknown };
  orders?: { file: string; items: unknown[] };
  archetypes?: { file: string; items: unknown[] };
}

export interface ContentIssue {
  level: 'error' | 'warning';
  where: string;
  message: string;
}

function fmtZod(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

function normActs(a: number | [number, number]): [number, number] {
  return typeof a === 'number' ? [a, a] : a;
}

/**
 * Compile raw YAML documents into Content. Schema errors are collected, not
 * thrown, so the validator can report them all at once.
 */
export function compileContent(raw: RawContent): { content: Content; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });

  const cards: Record<string, CardDef> = {};
  const cardOrder: string[] = [];
  const rawCards: RawCard[] = [];
  for (const f of raw.cards) {
    if (!Array.isArray(f.items)) {
      err(f.file, 'file must contain a YAML list of cards');
      continue;
    }
    f.items.forEach((item, i) => {
      const r = cardSchema.safeParse(item);
      if (!r.success) {
        const guess = (item as any)?.id ? `card ${(item as any).id}` : `item #${i + 1}`;
        err(`${f.file} › ${guess}`, fmtZod(r.error));
        return;
      }
      rawCards.push(r.data);
    });
  }
  // Cards referenced by a follow-up / warning / flashpoint entry default to chained.
  const referenced = new Set<string>();
  const fpEntries = new Set<string>();
  for (const c of rawCards) {
    for (const ch of [c.left, c.right]) {
      for (const f of ch.follow ?? []) referenced.add(f.card);
      if (ch.odds) for (const o of [ch.odds.success, ch.odds.failure]) for (const f of o.follow ?? []) referenced.add(f.card);
    }
    if (c.warning) {
      referenced.add(c.warning.true_follow);
      referenced.add(c.warning.false_follow);
    }
  }
  const flashpoints: Record<string, FlashpointDef> = {};
  for (const f of raw.flashpoints) {
    if (!Array.isArray(f.items)) {
      err(f.file, 'file must contain a YAML list of flashpoints');
      continue;
    }
    f.items.forEach((item, i) => {
      const r = flashpointSchema.safeParse(item);
      if (!r.success) {
        err(`${f.file} › item #${i + 1}`, fmtZod(r.error));
        return;
      }
      const d = r.data;
      if (flashpoints[d.id]) err(`${f.file} › ${d.id}`, 'duplicate flashpoint id');
      flashpoints[d.id] = { ...d, acts: normActs(d.acts) };
      fpEntries.add(d.entry);
      if (d.false_alarm_entry) fpEntries.add(d.false_alarm_entry);
      if (d.bluff_entry) fpEntries.add(d.bluff_entry);
    });
  }
  const compileChoice = (ch: RawCard['left']): CardDef['left'] => ({
    ...ch,
    base: ch.base ?? deriveBase(ch.effects, ch.tags, ch.odds),
  });
  for (const c of rawCards) {
    if (cards[c.id]) {
      err(`card ${c.id}`, 'duplicate card id');
      continue;
    }
    const chained = c.chained ?? (referenced.has(c.id) || fpEntries.has(c.id) || !!c.flashpoint);
    const card: CardDef = {
      id: c.id,
      arc: c.arc,
      advisor: c.advisor,
      acts: normActs(c.acts),
      seats: c.seats as Seat[] | undefined,
      text: c.text,
      left: compileChoice(c.left),
      right: compileChoice(c.right),
      timer: c.timer,
      timeout: c.timeout,
      conditions: c.conditions,
      tags: c.tags,
      weight: c.weight ?? 1,
      modes: c.modes,
      once: c.once,
      warning: c.warning,
      flashpoint: c.flashpoint,
      bluff: c.bluff,
      chained: c.bluff ? false : chained,
      shop: c.shop,
      note: c.note,
    };
    cards[c.id] = card;
    cardOrder.push(c.id);
  }

  const pieces: Record<string, PieceDef> = {};
  const pieceOrder: string[] = [];
  for (const f of raw.pieces) {
    if (!Array.isArray(f.items)) {
      err(f.file, 'file must contain a YAML list of pieces');
      continue;
    }
    f.items.forEach((item, i) => {
      const r = pieceSchema.safeParse(item);
      if (!r.success) {
        const guess = (item as any)?.id ? `piece ${(item as any).id}` : `item #${i + 1}`;
        err(`${f.file} › ${guess}`, fmtZod(r.error));
        return;
      }
      if (pieces[r.data.id]) {
        err(`${f.file} › ${r.data.id}`, 'duplicate piece id');
        return;
      }
      pieces[r.data.id] = { ...r.data, price: r.data.price ?? RARITY_PRICE[r.data.rarity] } as PieceDef;
      pieceOrder.push(r.data.id);
    });
  }

  const orders: Record<string, OrderDef> = {};
  const orderOrder: string[] = [];
  if (raw.orders) {
    if (!Array.isArray(raw.orders.items)) err(raw.orders.file, 'orders file must contain a YAML list');
    else
      raw.orders.items.forEach((item, i) => {
        const r = orderSchema.safeParse(item);
        if (!r.success) {
          const guess = (item as any)?.id ? `order ${(item as any).id}` : `item #${i + 1}`;
          err(`${raw.orders!.file} › ${guess}`, fmtZod(r.error));
          return;
        }
        if (orders[r.data.id]) {
          err(`${raw.orders!.file} › ${r.data.id}`, 'duplicate order id');
          return;
        }
        orders[r.data.id] = r.data as OrderDef;
        orderOrder.push(r.data.id);
      });
  }

  const archetypes: Record<string, ArchetypeDef> = {};
  if (raw.archetypes) {
    if (!Array.isArray(raw.archetypes.items)) err(raw.archetypes.file, 'archetypes file must contain a YAML list');
    else
      raw.archetypes.items.forEach((item, i) => {
        const r = archetypeSchema.safeParse(item);
        if (!r.success) {
          const guess = (item as any)?.id ? `archetype ${(item as any).id}` : `item #${i + 1}`;
          err(`${raw.archetypes!.file} › ${guess}`, fmtZod(r.error));
          return;
        }
        if (archetypes[r.data.id]) {
          err(`${raw.archetypes!.file} › ${r.data.id}`, 'duplicate archetype id');
          return;
        }
        archetypes[r.data.id] = r.data as ArchetypeDef;
      });
  }

  const endings: Record<string, EndingDef> = {};
  const endingOrder: string[] = [];
  for (const f of raw.endings) {
    if (!Array.isArray(f.items)) {
      err(f.file, 'file must contain a YAML list of endings');
      continue;
    }
    f.items.forEach((item, i) => {
      const r = endingSchema.safeParse(item);
      if (!r.success) {
        const guess = (item as any)?.id ? `ending ${(item as any).id}` : `item #${i + 1}`;
        err(`${f.file} › ${guess}`, fmtZod(r.error));
        return;
      }
      if (endings[r.data.id]) {
        err(`${f.file} › ${r.data.id}`, 'duplicate ending id');
        return;
      }
      endings[r.data.id] = r.data as EndingDef;
      endingOrder.push(r.data.id);
    });
  }

  const seats = {} as Record<Seat, SeatDef>;
  for (const f of raw.seats) {
    const r = seatSchema.safeParse(f.item);
    if (!r.success) {
      err(f.file, fmtZod(r.error));
      continue;
    }
    seats[r.data.id] = r.data as SeatDef;
  }
  for (const s of SEATS) if (!seats[s]) err('seats', `missing seat definition for ${s}`);

  const speakers: Record<string, SpeakerDef> = {};
  if (Array.isArray(raw.speakers.items)) {
    raw.speakers.items.forEach((item, i) => {
      const r = speakerSchema.safeParse(item);
      if (!r.success) {
        err(`${raw.speakers.file} › item #${i + 1}`, fmtZod(r.error));
        return;
      }
      speakers[r.data.id] = r.data;
    });
  } else err(raw.speakers.file, 'speakers file must contain a YAML list');

  let acts: ActDef[] = [];
  let difficulties: DifficultyDef[] = [];
  const rr = rulesFileSchema.safeParse(raw.rules.item);
  if (!rr.success) err(raw.rules.file, fmtZod(rr.error));
  else {
    acts = [...rr.data.acts].sort((a, b) => a.index - b.index);
    difficulties = rr.data.difficulties as DifficultyDef[];
  }

  return {
    content: { cards, pieces, orders, archetypes, endings, seats, flashpoints, speakers, acts, difficulties, cardOrder, pieceOrder, orderOrder, endingOrder },
    issues,
  };
}
