/** Tiny synthetic content for engine tests: short acts, a few cards, pieces and endings. */
import type { CardDef, Content, EndingDef, PieceDef, Seat, SeatDef } from './types';

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
  left: { text: 'Left', effects: {}, tags: [] },
  right: { text: 'Right', effects: {}, tags: [] },
  tags: [],
  weight: 1,
  once: true,
  chained: false,
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

export function fixture(): Content {
  const cards: CardDef[] = [
    card('c_basic', {
      left: { text: 'Mobilise', effects: { public: -5, escalation: 5, military: 4 }, tags: ['military'] },
      right: { text: 'Talk', effects: { public: 3, escalation: -3, allies: 2 }, tags: ['deescalate'] },
      once: false,
    }),
    card('c_filler', { once: false, left: { text: 'A', effects: { economy: -2 }, tags: [] }, right: { text: 'B', effects: { economy: 2 }, tags: [] } }),
    card('c_timer', { timer: 10, timeout: 'left', left: { text: 'L', effects: { escalation: 8 }, tags: ['escalatory'] }, right: { text: 'R', effects: { public: -4 }, tags: [] } }),
    card('c_odds', {
      left: {
        text: 'Intercept',
        effects: {},
        tags: ['military'],
        odds: {
          label: 'Intercept',
          base: 0.5,
          tags: ['adversary'],
          success: { effects: { escalation: -10, public: 5 }, set: ['won'] },
          failure: { effects: { escalation: 15 }, follow: [{ card: 'c_chain', in: 0 }] },
        },
      },
      right: { text: 'Wait', effects: { escalation: 2 }, tags: [] },
    }),
    card('c_chain', { chained: true, left: { text: 'L', effects: { public: -3 }, tags: [] }, right: { text: 'R', effects: { public: -3 }, tags: [] } }),
    card('c_warning', {
      tags: ['warning'],
      warning: { true_follow: 'c_true', false_follow: 'c_false', in: 0 },
      left: { text: 'Act', effects: { military: 2 }, tags: ['military'] },
      right: { text: 'Wait', effects: { intel: 2 }, tags: [] },
    }),
    card('c_true', { chained: true, left: { text: 'L', effects: { escalation: 6 }, tags: [] }, right: { text: 'R', effects: { escalation: 3 }, tags: [] } }),
    card('c_false', { chained: true, left: { text: 'L', effects: { public: -2 }, tags: [], set: ['false_alarm_live'] }, right: { text: 'R', effects: { public: 1 }, tags: [], clear: ['false_alarm_live'] } }),
    card('c_walkback', { left: { text: 'Walk back', effects: { public: -10, commitment: -10 }, tags: ['walk_back'] }, right: { text: 'Hold', effects: { escalation: 4, commitment: 5 }, tags: ['public_commitment'] } }),
    card('c_charge', {
      left: { text: 'Hotline', effects: { public: -6, escalation: -8 }, tags: ['deescalate'], spend_charge: 'deescalation' },
      right: { text: 'Nothing', effects: { escalation: 1 }, tags: [] },
    }),
    card('c_end', {
      conditions: { flags_all: ['allow_end'] },
      left: { text: 'Fine', effects: { economy: 1 }, tags: [] },
      right: { text: 'Resign', effects: {}, tags: [], ending: 'resigned' },
    }),
    card('fp_1', { flashpoint: 'fp_test', chained: true, left: { text: 'L', effects: { escalation: 5 }, tags: [], follow: [{ card: 'fp_2', in: 0 }] }, right: { text: 'R', effects: { escalation: -2 }, tags: [], follow: [{ card: 'fp_2', in: 0 }] } }),
    card('fp_2', { flashpoint: 'fp_test', chained: true, left: { text: 'L', effects: { escalation: 10 }, tags: [] }, right: { text: 'R', effects: { escalation: -10 }, tags: [] } }),
    card('fp_false', { flashpoint: 'fp_test', chained: true, left: { text: 'Launch', effects: {}, tags: [], ending: 'launch' }, right: { text: 'Wait', effects: { escalation: -5 }, tags: [], clear: ['false_alarm_live'] } }),
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
    piece('p_hawk', { modifiers: [{ kind: 'effect', key: 'military', tags: ['military'], sign: 'pos', mult: 1.5 }, { kind: 'rule', rule: 'hide_escalation_cost' }] }),
    piece('p_dove', { modifiers: [{ kind: 'effect', key: 'escalation', tags: ['deescalate'], sign: 'neg', mult: 2 }, { kind: 'effect', key: 'allies', tags: ['deescalate'], add: -2, always: true }] }),
    piece('p_hotline', { pool: 'doctrine', modifiers: [{ kind: 'rule', rule: 'free_deescalation_per_act', value: 1 }] }),
    piece('p_spin', { modifiers: [{ kind: 'rule', rule: 'commitment_lock', value: 1 }, { kind: 'effect', key: 'public', mult: 0.5 }] }),
    piece('p_odds', { pool: 'asset', modifiers: [{ kind: 'odds', tags: ['adversary'], add: 0.2 }] }),
    piece('p_fixer', { modifiers: [{ kind: 'rule', rule: 'remove_card_per_act', value: 1 }] }),
    piece('p_locked', { pool: 'asset', unlock: { id: 'ach_x', label: 'X', hint: 'Do X' } }),
    piece('p_excl_a', { pool: 'doctrine', excludes: ['p_excl_b'] }),
    piece('p_excl_b', { pool: 'doctrine' }),
  ];
  const content: Content = {
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    pieces: Object.fromEntries(pieces.map((p) => [p.id, p])),
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
      { index: 1, name: 'Week One', cards: 3, effect_scale: 1, intel_shift: 0, timer_scale: 1, day_per_card: 0.5 },
      { index: 2, name: 'Week Two', cards: 3, effect_scale: 1.1, intel_shift: -5, timer_scale: 0.9, day_per_card: 0.5 },
      { index: 3, name: 'Week Three', cards: 3, effect_scale: 1.2, intel_shift: -10, timer_scale: 0.8, day_per_card: 0.5 },
      { index: 4, name: 'Week Four', cards: 3, effect_scale: 1.35, intel_shift: -15, timer_scale: 0.7, day_per_card: 0.5 },
      { index: 5, name: 'Endgame', cards: 3, effect_scale: 1.5, intel_shift: -20, timer_scale: 0.6, day_per_card: 0.5 },
    ],
    difficulties: [
      { level: 5, name: 'DEFCON 5', effect_scale: 1, intel_shift: 0, timer_scale: 1, start_escalation: 0 },
      { level: 1, name: 'DEFCON 1', effect_scale: 1.5, intel_shift: -20, timer_scale: 0.65, start_escalation: 20 },
    ],
    cardOrder: cards.map((c) => c.id),
    pieceOrder: pieces.map((p) => p.id),
    endingOrder: endings.map((e) => e.id),
  };
  return content;
}
