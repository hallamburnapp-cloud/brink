/** Tiny synthetic content for engine tests: short acts, a few cards, pieces, orders and endings. */
import type { ArchetypeDef, CardDef, Content, EndingDef, OrderDef, PieceDef, Seat, SeatDef } from './types';

const seat = (id: Seat, rivals: [Seat, Seat]): SeatDef => ({
  id,
  name: id,
  the: `the ${id}`,
  adjective: id,
  leader_title: 'the Leader',
  capital: 'Capital',
  rivals,
  meters: { public: 50, military: 50, allies: 50, economy: 50, escalation: 20 },
  hidden: { trust_primary: 50, trust_secondary: 50, intel: 70, commitment: 30 },
  blurb: 'A seat used in tests only, with nothing remarkable about it at all.',
  strengths: 'none',
  vulnerabilities: 'none',
  accent: '#ffffff',
  starting_pieces: [],
});

const card = (id: string, extra: Partial<CardDef>): CardDef => ({
  id,
  advisor: 'aide',
  acts: [1, 5],
  text: `Test card ${id} text that is long enough to pass validation rules.`,
  left: { text: 'Left', effects: {}, tags: [], base: 10 },
  right: { text: 'Right', effects: {}, tags: [], base: 10 },
  tags: [],
  weight: 1,
  once: true,
  chained: false,
  bluff: false,
  shop: false,
  ...extra,
});

const ending = (id: string, extra: Partial<EndingDef>): EndingDef => ({
  id,
  name: id,
  kind: 'special',
  trigger: { type: 'forced' },
  priority: 0,
  text: 'Ending text long enough for schema purposes; it says something happened and it mattered to a lot of people.',
  moment_label: 'The moment it went wrong',
  compendium: 'A test ending.',
  emoji: '🧪',
  ...extra,
});

const piece = (id: string, extra: Partial<PieceDef>): PieceDef => ({
  id,
  pool: 'advisor',
  rarity: 'common',
  price: 3,
  name: id,
  title: id,
  blurb: 'A test piece that does test things.',
  mechanics: 'test',
  accent: '#ffffff',
  art: 'aide',
  modifiers: [],
  grants: [],
  tags: [],
  offer_weight: 1,
  ...extra,
});

const order = (id: string, effect: OrderDef['effect'], extra: Partial<OrderDef> = {}): OrderDef => ({
  id,
  name: id,
  blurb: 'A test order that does one thing once.',
  mechanics: 'test',
  price: 3,
  rarity: 'common',
  effect,
  art: 'generic',
  accent: '#ffffff',
  ...extra,
});

export function fixture(): Content {
  const cards: CardDef[] = [
    card('c_basic', {
      left: { text: 'Mobilise', effects: { public: -5, escalation: 5, military: 4 }, tags: ['military'], base: 12 },
      right: { text: 'Talk', effects: { public: 3, escalation: -3, allies: 2 }, tags: ['deescalate'], base: 8 },
      once: false,
    }),
    card('c_filler', { once: false, left: { text: 'A', effects: { economy: -2 }, tags: [], base: 6 }, right: { text: 'B', effects: { economy: 2 }, tags: [], base: 6 } }),
    card('c_timer', { timer: 10, timeout: 'left', left: { text: 'L', effects: { escalation: 8 }, tags: ['escalatory'], base: 14 }, right: { text: 'R', effects: { public: -4 }, tags: [], base: 8 } }),
    card('c_odds', {
      left: {
        text: 'Intercept',
        effects: {},
        tags: ['military'],
        base: 15,
        odds: {
          label: 'Intercept',
          base: 0.5,
          tags: ['adversary'],
          success: { effects: { escalation: -10, public: 5 }, set: ['won'], capital: 1 },
          failure: { effects: { escalation: 15 }, follow: [{ card: 'c_chain', in: 0 }] },
        },
      },
      right: { text: 'Wait', effects: { escalation: 2 }, tags: [], base: 6 },
    }),
    card('c_chain', { chained: true, left: { text: 'L', effects: { public: -3 }, tags: [], base: 8 }, right: { text: 'R', effects: { public: -3 }, tags: [], base: 8 } }),
    card('c_warning', {
      tags: ['warning'],
      warning: { true_follow: 'c_true', false_follow: 'c_false', in: 0 },
      left: { text: 'Act', effects: { military: 2 }, tags: ['military'], base: 10 },
      right: { text: 'Wait', effects: { intel: 2 }, tags: [], base: 6 },
    }),
    card('c_true', { chained: true, left: { text: 'L', effects: { escalation: 6 }, tags: [], base: 10 }, right: { text: 'R', effects: { escalation: 3 }, tags: [], base: 8 } }),
    card('c_false', { chained: true, left: { text: 'L', effects: { public: -2 }, tags: [], set: ['false_alarm_live'], base: 8 }, right: { text: 'R', effects: { public: 1 }, tags: [], clear: ['false_alarm_live'], base: 6 } }),
    card('c_walkback', { left: { text: 'Walk back', effects: { public: -10, commitment: -10 }, tags: ['walk_back'], base: 8 }, right: { text: 'Hold', effects: { escalation: 4, commitment: 5 }, tags: ['public_commitment'], base: 14 } }),
    card('c_charge', {
      left: { text: 'Hotline', effects: { public: -6, escalation: -8 }, tags: ['deescalate'], spend_charge: 'deescalation', base: 8 },
      right: { text: 'Nothing', effects: { escalation: 1 }, tags: [], base: 5 },
    }),
    card('c_end', {
      conditions: { flags_all: ['allow_end'] },
      left: { text: 'Fine', effects: { economy: 1 }, tags: [], base: 5 },
      right: { text: 'Resign', effects: {}, tags: [], ending: 'resigned', base: 5 },
    }),
    card('c_backchannel', { once: false, left: { text: 'Quiet word', effects: { trust_primary: 4 }, tags: ['back_channel'], base: 9 }, right: { text: 'No', effects: { trust_primary: -2 }, tags: [], base: 6 } }),
    card('c_shop', { conditions: { flags_all: ['allow_shop'] }, shop: true, left: { text: 'L', effects: { economy: 1 }, tags: [], base: 5 }, right: { text: 'R', effects: { economy: -1 }, tags: [], base: 5 } }),
    card('bluff_generic', { bluff: true, left: { text: 'Fold', effects: { public: -8, allies: -6 }, tags: ['concede'], base: 6 }, right: { text: 'Double down', effects: { escalation: 12 }, tags: ['escalatory'], base: 20 } }),
    card('fp_1', { flashpoint: 'fp_test', chained: true, left: { text: 'L', effects: { escalation: 5 }, tags: [], base: 12, follow: [{ card: 'fp_2', in: 0 }] }, right: { text: 'R', effects: { escalation: -2 }, tags: [], base: 10, follow: [{ card: 'fp_2', in: 0 }] } }),
    card('fp_2', { flashpoint: 'fp_test', chained: true, left: { text: 'L', effects: { escalation: 10 }, tags: [], base: 16 }, right: { text: 'R', effects: { escalation: -10 }, tags: [], base: 12 } }),
    card('fp_false', { flashpoint: 'fp_test', chained: true, left: { text: 'Launch', effects: {}, tags: [], ending: 'launch', base: 30 }, right: { text: 'Wait', effects: { escalation: -5 }, tags: [], clear: ['false_alarm_live'], base: 10 } }),
  ];
  const endings: EndingDef[] = [
    ending('fallback_nuclear', { kind: 'nuclear', trigger: { type: 'meter', key: 'escalation', at: 100 } }),
    ending('fallback_public_0', { kind: 'removed', trigger: { type: 'meter', key: 'public', at: 0 } }),
    ending('fallback_public_100', { kind: 'removed', trigger: { type: 'meter', key: 'public', at: 100 } }),
    ending('fallback_military_0', { kind: 'removed', trigger: { type: 'meter', key: 'military', at: 0 } }),
    ending('fallback_military_100', { kind: 'removed', trigger: { type: 'meter', key: 'military', at: 100 } }),
    ending('fallback_allies_0', { kind: 'removed', trigger: { type: 'meter', key: 'allies', at: 0 } }),
    ending('fallback_allies_100', { kind: 'removed', trigger: { type: 'meter', key: 'allies', at: 100 } }),
    ending('fallback_economy_0', { kind: 'removed', trigger: { type: 'meter', key: 'economy', at: 0 } }),
    ending('fallback_economy_100', { kind: 'removed', trigger: { type: 'meter', key: 'economy', at: 100 } }),
    ending('fallback_standdown', { kind: 'standdown', trigger: { type: 'run_end' } }),
    ending('fallback_survival', { kind: 'survival', trigger: { type: 'run_end' } }),
    ending('fallback_special', { kind: 'special', trigger: { type: 'forced' } }),
    ending('impeached', { kind: 'removed', trigger: { type: 'meter', key: 'public', at: 0 }, priority: 10 }),
    ending('impeached_hawk', { kind: 'removed', trigger: { type: 'meter', key: 'public', at: 0 }, priority: 20, conditions: { pieces_any: ['p_hawk'] } }),
    ending('nuclear_war', { kind: 'nuclear', trigger: { type: 'meter', key: 'escalation', at: 100 }, priority: 10 }),
    ending('resigned', { kind: 'special', trigger: { type: 'forced' }, priority: 10 }),
    ending('launch', { kind: 'nuclear', trigger: { type: 'forced' }, priority: 10 }),
    ending('standdown_quiet', { kind: 'standdown', trigger: { type: 'run_end' }, priority: 10, conditions: { values: { escalation: { max: 35 } } } }),
    ending('survival_cold', { kind: 'survival', trigger: { type: 'run_end' }, priority: 10, conditions: { values: { escalation: { min: 36 } } } }),
  ];
  const pieces: PieceDef[] = [
    piece('p_hawk', { modifiers: [{ kind: 'effect', key: 'military', tags: ['military'], sign: 'pos', mult: 1.5 }, { kind: 'rule', rule: 'hide_escalation_cost' }, { kind: 'leverage', tags: ['military'], base_add: 6 }] }),
    piece('p_dove', { modifiers: [{ kind: 'effect', key: 'escalation', tags: ['deescalate'], sign: 'neg', mult: 2 }, { kind: 'effect', key: 'allies', tags: ['deescalate'], add: -2, always: true }, { kind: 'leverage', tags: ['deescalate'], mult_add: 0.5 }] }),
    piece('p_hotline', { pool: 'doctrine', rarity: 'uncommon', price: 5, modifiers: [{ kind: 'rule', rule: 'free_deescalation_per_act', value: 1 }] }),
    piece('p_spin', { modifiers: [{ kind: 'rule', rule: 'commitment_lock', value: 1 }, { kind: 'effect', key: 'public', mult: 0.5 }] }),
    piece('p_odds', { pool: 'asset', modifiers: [{ kind: 'odds', tags: ['adversary'], add: 0.2 }] }),
    piece('p_fixer', { modifiers: [{ kind: 'rule', rule: 'remove_card_per_act', value: 1 }] }),
    piece('p_locked', { pool: 'asset', unlock: { id: 'ach_x', label: 'X', hint: 'Do X' } }),
    piece('p_excl_a', { pool: 'doctrine', excludes: ['p_excl_b'] }),
    piece('p_excl_b', { pool: 'doctrine' }),
    piece('p_mult', { pool: 'doctrine', rarity: 'rare', price: 8, modifiers: [{ kind: 'leverage', mult_mult: 2 }] }),
    piece('p_retrig', { pool: 'asset', rarity: 'rare', price: 8, modifiers: [{ kind: 'retrigger', tags: ['back_channel'] }] }),
    piece('p_scale', { pool: 'asset', rarity: 'uncommon', price: 5, modifiers: [{ kind: 'scale', on: 'accident_survived', mult_add: 0.5 }, { kind: 'scale', on: 'choice', tags: ['back_channel'], base_add: 2, max: 10 }] }),
    piece('p_madman', {
      pool: 'doctrine',
      rarity: 'legendary',
      price: 12,
      modifiers: [
        { kind: 'leverage', when: { values: { escalation: { min: 90 } } }, mult_mult: 3 },
        { kind: 'leverage', per: 'escalation', per_above: 50, per_step: 10, mult_add: 0.5 },
        { kind: 'rule', rule: 'accidents_twice' },
      ],
    }),
    piece('p_deadman', { pool: 'asset', rarity: 'legendary', price: 12, modifiers: [{ kind: 'rule', rule: 'deadman_switch' }] }),
    piece('p_intel', { pool: 'asset', rarity: 'rare', price: 8, modifiers: [{ kind: 'rule', rule: 'perfect_intel' }] }),
    piece('p_shopper', { pool: 'advisor', modifiers: [{ kind: 'rule', rule: 'extra_offer', value: 1 }, { kind: 'rule', rule: 'shop_discount', value: 0.5 }, { kind: 'rule', rule: 'capital_per_act', value: 2 }] }),
  ];
  const orders: OrderDef[] = [
    order('o_calm', { type: 'meter', key: 'escalation', delta: -20 }),
    order('o_retrig', { type: 'retrigger_next' }),
    order('o_skip', { type: 'skip_accident' }),
    order('o_bury', { type: 'bury' }),
    order('o_mult', { type: 'mult_next', mult: 2 }),
  ];
  const archetypes: ArchetypeDef[] = [
    { id: 'a_madman', name: 'Madman', blurb: 'Live at the top of the curve and dare them.', core: ['p_madman', 'p_hawk', 'p_deadman'], support: ['p_mult'], style: 'brink' },
    { id: 'a_quiet', name: 'Quiet Diplomat', blurb: 'Leverage from trust and back channels.', core: ['p_dove', 'p_retrig', 'p_scale'], support: ['p_hotline'], style: 'standdown' },
  ];
  const content: Content = {
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    pieces: Object.fromEntries(pieces.map((p) => [p.id, p])),
    orders: Object.fromEntries(orders.map((o) => [o.id, o])),
    archetypes: Object.fromEntries(archetypes.map((a) => [a.id, a])),
    endings: Object.fromEntries(endings.map((e) => [e.id, e])),
    seats: {
      republic: seat('republic', ['federation', 'coalition']),
      federation: seat('federation', ['republic', 'coalition']),
      coalition: seat('coalition', ['republic', 'federation']),
    },
    flashpoints: {
      fp_test: { id: 'fp_test', name: 'Test Flashpoint', acts: [1, 5], entry: 'fp_1', weight: 1, false_alarm_entry: 'fp_false', blurb: 'A flashpoint for tests.' },
    },
    speakers: { aide: { id: 'aide', name: 'Aide', role: 'Aide', accent: '#ffffff', art: 'aide' } },
    acts: [
      { index: 1, name: 'Week One', cards: 3, effect_scale: 1, intel_shift: 0, timer_scale: 1, day_per_card: 0.5, target: 20 },
      { index: 2, name: 'Week Two', cards: 3, effect_scale: 1.1, intel_shift: -5, timer_scale: 0.9, day_per_card: 0.5, target: 40 },
      { index: 3, name: 'Week Three', cards: 3, effect_scale: 1.2, intel_shift: -10, timer_scale: 0.8, day_per_card: 0.5, target: 60 },
      { index: 4, name: 'Week Four', cards: 3, effect_scale: 1.35, intel_shift: -15, timer_scale: 0.7, day_per_card: 0.5, target: 80 },
      { index: 5, name: 'Endgame', cards: 3, effect_scale: 1.5, intel_shift: -20, timer_scale: 0.6, day_per_card: 0.5, target: 100 },
    ],
    bookings: {},
    bookingOrder: [],
    night: { minutes: 7, oneSided: false, useEscalation: true, fullCards: {}, firstNightScale: 1, drift: 0, speakerCooldown: 1 },
    voice: 'crisis',
    nightActs: [
      { index: 1, name: '3:00am', cards: 2, effect_scale: 1, intel_shift: 0, timer_scale: 1, day_per_card: 0.1, target: 50, flashpoint: false },
      { index: 2, name: '3:35am', cards: 2, effect_scale: 1, intel_shift: 0, timer_scale: 1, day_per_card: 0.1, target: 50, flashpoint: false },
      { index: 3, name: '4:10am', cards: 2, effect_scale: 1.05, intel_shift: -5, timer_scale: 0.9, day_per_card: 0.1, target: 50, flashpoint: false },
      { index: 4, name: '4:45am', cards: 2, effect_scale: 1.1, intel_shift: -5, timer_scale: 0.9, day_per_card: 0.1, target: 50, flashpoint: false },
      { index: 5, name: '5:20am', cards: 1, effect_scale: 1.15, intel_shift: -10, timer_scale: 0.8, day_per_card: 0.1, target: 50, flashpoint: true },
    ],
    difficulties: [
      { level: 5, name: 'DEFCON 5', effect_scale: 1, intel_shift: 0, timer_scale: 1, start_escalation: 0 },
      { level: 1, name: 'DEFCON 1', effect_scale: 1.5, intel_shift: -20, timer_scale: 0.65, start_escalation: 20, target_scale: 1.5 },
    ],
    cardOrder: cards.map((c) => c.id),
    pieceOrder: pieces.map((p) => p.id),
    orderOrder: orders.map((o) => o.id),
    endingOrder: endings.map((e) => e.id),
  };
  return content;
}
