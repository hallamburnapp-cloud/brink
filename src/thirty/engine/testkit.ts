/**
 * Fixtures for the engine's tests (and the simulator's): a small pack compiled through the real
 * schema, and helpers that put a state exactly where a test wants it (these heats, this card, this
 * team, this roll). Nothing here is imported by the game.
 */
import { compileThirty, type RawThirty } from '../content/schema.ts';
import type { Card, CardId, Heat, PieceId, RegionId, ThirtyContent } from '../content/types.ts';
import { CRISIS } from './rules.ts';
import { draft, newGame } from './run.ts';
import type { GameState } from './types.ts';
import { REGION_IDS } from './world.ts';

export const ADVISERS = [
  { id: 'foreign', name: 'Mara Teshen', role: 'Foreign Minister', voice: 'Measured.' },
  { id: 'general', name: 'Ruun Halder', role: 'General', voice: 'Blunt.' },
  { id: 'intel', name: 'Dagny Fell', role: 'Intel Director', voice: 'Hedged.' },
  { id: 'admiral', name: 'Tomas Reyde', role: 'Admiral', voice: 'Dry.' },
  { id: 'chief', name: 'Wen Adair', role: 'Chief of Staff', voice: 'Tired.' },
  { id: 'ambassador', name: 'Aurelio Stane', role: 'Old Ambassador', voice: 'Warm.' },
];

/** The twelve pieces of the spec's table, as the pack has them. */
export const PIECES = [
  { id: 'old-ambassador', name: 'Old Ambassador', chip: 'Ambassador', icon: 'handshake', kind: 'adviser', rule: 'Every calming choice cools one step more.', tags: ['CALM'] },
  { id: 'back-channel', name: 'Back-Channel', chip: 'Back-Channel', icon: 'phone', kind: 'policy', rule: 'Calming choices also cool one neighbour.', tags: ['CALM'] },
  { id: 'peace-movement', name: 'Peace Movement', chip: 'Peace', icon: 'dove', kind: 'policy', rule: 'Calming choices cool two more regions; shows of force heat home.', tags: ['CALM', 'FORCE'] },
  { id: 'hotline', name: 'Hotline', chip: 'Hotline', icon: 'bell', kind: 'policy', rule: 'Once a week, a crisis eases on its own before you choose.', tags: ['any'] },
  { id: 'dove-foreign', name: 'Dove Foreign Minister', chip: 'Dove', icon: 'olive', kind: 'adviser', rule: 'Talks never fail: a risky talk always works.', tags: ['RISKY'] },
  { id: 'hawk-general', name: 'Hawk General', chip: 'Hawk', icon: 'medal', kind: 'adviser', rule: 'A show of force also cools every neighbouring region one step, and still heats one of them.', tags: ['FORCE'] },
  { id: 'loyal-admiral', name: 'Loyal Admiral', chip: 'Admiral', icon: 'anchor', kind: 'adviser', rule: 'A show of force at sea also cools every neighbouring region two steps.', tags: ['FORCE'] },
  { id: 'cautious-intel', name: 'Cautious Intel Director', chip: 'Cautious', icon: 'eye', kind: 'adviser', rule: 'False alarms are marked before you choose; every risky choice is 10 points more likely to work.', tags: ['arcs', 'RISKY'], excludes: ['paranoid-intel'] },
  { id: 'paranoid-intel', name: 'Paranoid Intel Director', chip: 'Paranoid', icon: 'radar', kind: 'adviser', rule: 'Trouble is spotted early: a place in crisis gets its card by the next morning.', tags: ['any'], excludes: ['cautious-intel'] },
  { id: 'spin-doctor', name: 'Spin Doctor', chip: 'Spin Doctor', icon: 'megaphone', kind: 'adviser', rule: 'No trouble at home: home never heats.', tags: ['HOME'] },
  { id: 'red-lines', name: 'Red Lines', chip: 'Red Line', icon: 'flag', kind: 'policy', rule: 'Name one region: it calms twice as fast, but if it reaches war, DANGER +15.', tags: ['map'] },
  { id: 'launch-on-warning', name: 'Launch on Warning', chip: 'Launch', icon: 'siren', kind: 'policy', rule: 'Every show of force warns its region; a warned region never heats at night. A false alarm there is DANGER +20.', tags: ['arcs', 'FORCE'] },
];

const choice = (text: string, tag: string, hint: string, extra: Record<string, unknown> = {}) => ({ text, tag, hint, ...extra });

/** Single-day cards: one plain CALM/FORCE card for every region (so every map state has a card), plus the special ones. */
export function fixtureRegionCards(): unknown[] {
  return REGION_IDS.map((r) => ({
    id: `plain-${r.toLowerCase()}`,
    adviser: 'foreign',
    region: r,
    text: `Trouble in ${r}. Decide.`,
    left: choice('Talk it down', 'CALM', 'Danger down · it calms'),
    right: choice('Send the ships', 'FORCE', 'Danger down here · heats a neighbour'),
  }));
}

export const FIXTURE_CARDS = {
  regions: [
    ...fixtureRegionCards(),
    {
      id: 'shoal-risky',
      adviser: 'admiral',
      region: 'SHL',
      text: 'The Shoal strait again.',
      left: choice('Run the strait', 'RISKY', 'Danger down if it works (70%) · if not, Shoal heats', { odds: 70, fail: { crisis: 'LTL' } }),
      right: choice('Hold the fleet back', 'HOME', 'Danger unchanged · a quiet day at home'),
    },
    {
      id: 'shoal-talks',
      adviser: 'foreign',
      region: 'SHL',
      text: 'Talks over the Shoal strait.',
      left: choice('Send the minister', 'RISKY', 'Danger down if it works (60%) · if snubbed, Shoal heats', { odds: 60, relieve: 'LTL' }),
      right: choice('Say nothing', 'HOME', 'Danger unchanged · a quiet day at home'),
    },
    {
      id: 'lintel-force',
      adviser: 'general',
      region: 'LTL',
      text: 'Lintel closes the harbour.',
      left: choice('Force the harbour', 'FORCE', 'Danger down here · heats Kelpmouth', { heats: 'KLP', mark: 'warned' }),
      right: choice('Pay the port', 'CALM', 'Danger down · Lintel settles', { crisis: 'ORN' }),
    },
    {
      id: 'late-only',
      adviser: 'general',
      region: 'ORN',
      day: [20, 30],
      text: 'Orrinth, late in the month.',
      left: choice('Talk to Orrinth', 'CALM', 'Danger down · Orrinth settles'),
      right: choice('Warn Orrinth off', 'FORCE', 'Danger down here · heats Dunmarrow', { heats: 'DNM' }),
    },
    {
      id: 'needs-tense',
      adviser: 'intel',
      region: 'WMS',
      when: { heat: [1, 3] },
      text: 'Wintermast is tense.',
      left: choice('Watch Wintermast', 'CALM', 'Danger down · we look calm'),
      right: choice('Match their readiness', 'FORCE', 'Danger down here · heats Frostmere', { heats: 'FRM' }),
    },
  ],
  domestic: [
    {
      id: 'home-fuel',
      adviser: 'chief',
      region: 'EDV',
      domestic: 'economy',
      text: 'Fuel is up in Edda Vale.',
      left: choice('Release the reserve', 'CALM', 'Danger down · Edda Vale settles'),
      right: choice('Address the nation', 'RISKY', 'Danger down if it works (60%) · if it falls flat, home heats', { odds: 60 }),
    },
  ],
  map: [
    {
      id: 'fleet-map',
      adviser: 'admiral',
      map: true,
      day: [2, 28],
      text: 'The fleet can be in one place by morning. Tap where it goes.',
      targets: [
        { region: 'SHL', hint: 'Calms the strait' },
        { region: 'ORN', hint: 'Warns Orrinth off · heats Dunmarrow', tag: 'FORCE', heats: 'DNM', mark: 'warned' },
        { region: 'VSY', hint: 'Guards home', mark: 'guarded' },
      ],
    },
    {
      id: 'redline-map',
      adviser: 'foreign',
      map: true,
      day: [2, 28],
      when: { pieces: ['red-lines'] },
      text: 'Tap where the red line is drawn.',
      targets: [
        { region: 'TRN', hint: 'Red line at Tern Isle', mark: 'red-line' },
        { region: 'SHL', hint: 'Red line at the Shoal', mark: 'red-line' },
      ],
    },
    // Live places: the two hottest regions abroad, the hottest one risky talks (CONTENT.md "A map card").
    {
      id: 'envoy-map',
      adviser: 'foreign',
      map: true,
      day: [2, 28],
      text: 'One envoy, one flight. Tap where she goes.',
      targets: [
        { region: 'WMS', from: 'abroad', hint: 'Hard talks in {region} (60%)', tag: 'RISKY', odds: 60 },
        { region: 'TLM', from: 'abroad', hint: 'Talks in {region}' },
        { region: 'LNK', from: 'abroad', hint: 'Talks in {region}' },
      ],
    },
  ],
  arcs: {
    blockade: [
      {
        id: 'strait-01',
        arc: 'blockade',
        adviser: 'admiral',
        region: 'SHL',
        day: [3, 12],
        text: 'Federation ships sit across the Shoal strait.',
        left: choice('Escort the tankers through', 'FORCE', 'Danger down here · heats Lintel', { heats: 'LTL', follow: 'strait-02' }),
        right: choice('Reroute and talk', 'CALM', 'Danger down · slower', { follow: { card: 'strait-03', in: [1, 3] } }),
      },
      {
        id: 'strait-02',
        arc: 'blockade',
        adviser: 'foreign',
        region: 'LTL',
        day: [4, 15],
        text: 'Lintel has closed its harbour.',
        left: choice('Apologise and pay', 'CALM', 'Danger down · Lintel settles'),
        right: choice('Hold the convoy route', 'RISKY', 'Danger down if it works (60%) · if not, Kelpmouth joins in', { odds: 60, fail: { crisis: 'KLP' } }),
      },
      {
        id: 'strait-03',
        arc: 'blockade',
        adviser: 'ambassador',
        region: 'LNK',
        day: [4, 16],
        text: 'Lantern Key will host talks.',
        left: choice('Send the Ambassador', 'RISKY', 'Danger down if it works (70%) · the strait reopens', { odds: 70, relieve: 'SHL', fail: { heats: 'SHL' } }),
        right: choice('Keep the fleet nearby', 'FORCE', 'Danger down here · heats Pebbleby', { heats: 'PBB' }),
      },
    ],
    'false-alarm': [
      {
        id: 'alarm-02',
        arc: 'false-alarm',
        alarm: true,
        adviser: 'intel',
        region: 'WMS',
        day: [1, 30],
        text: 'Early warning shows six launches over the Cap.',
        left: choice('Wait for a second source', 'RISKY', 'Danger down if it works (70%) · if real, the Cap burns', { odds: 70, fail: { crisis: 'FRM' }, follow: 'alarm-03' }),
        right: choice('Raise the alert', 'FORCE', 'Danger down here · heats Frostmere', { heats: 'FRM', mark: 'warned', follow: 'alarm-03' }),
      },
      {
        id: 'alarm-03',
        arc: 'false-alarm',
        adviser: 'intel',
        region: 'FRM',
        day: [2, 30],
        text: 'It was a flock of birds over Frostmere.',
        left: choice('Tell them the truth', 'CALM', 'Danger down · Frostmere breathes out'),
        right: choice('Admit nothing', 'RISKY', 'Danger down if it works (60%) · if known, Frostmere heats', { odds: 60 }),
      },
    ],
  },
};

/** The fixture pack, compiled through the real schema; alarm-02 carries the warning flag. */
export function fixture(): ThirtyContent {
  const raw: RawThirty = {
    advisers: { file: 'advisers.yaml', items: ADVISERS },
    pieces: { file: 'pieces.yaml', items: PIECES },
    cards: [
      { file: 'regions.yaml', items: FIXTURE_CARDS.regions },
      { file: 'domestic.yaml', items: FIXTURE_CARDS.domestic },
      { file: 'map.yaml', items: FIXTURE_CARDS.map },
      ...Object.entries(FIXTURE_CARDS.arcs).map(([arc, items]) => ({ file: `arcs/${arc}.yaml`, items })),
    ],
  };
  const { content, issues } = compileThirty(raw);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) throw new Error(`fixture pack has errors: ${errors.map((e) => `${e.where}: ${e.message}`).join('; ')}`);
  (content.cards['alarm-02'] as Card & { alarm?: boolean }).alarm = true;
  return content;
}

/** A state with every region CALM and these heats set (the deck's hot-since book kept straight). */
export function withHeats(state: GameState, heats: Partial<Record<RegionId, Heat>>): GameState {
  const s = draft(state);
  for (const r of REGION_IDS) s.heats[r] = heats[r] ?? 0;
  for (const r of REGION_IDS) {
    if (s.heats[r] >= CRISIS) s.deck.hotSince[r] ??= s.day;
    else delete s.deck.hotSince[r];
  }
  return s;
}

/** Put this card on the table with this roll (and no arrival steps). */
export function withCard(content: ThirtyContent, state: GameState, id: CardId, roll = 0.5, alarm?: { false: boolean; known: boolean }): GameState {
  const card = content.cards[id];
  if (!card) throw new Error(`no card ${id}`);
  const s = draft(state);
  s.phase = 'choose';
  s.offer = null;
  s.card = {
    id,
    region: card.region,
    roll,
    alarmFalse: alarm?.false ?? false,
    alarm: alarm ? (alarm.known ? (alarm.false ? 'false' : 'real') : 'unknown') : 'none',
    arrival: [],
  };
  return s;
}

export function withTeam(state: GameState, team: PieceId[]): GameState {
  return { ...draft(state), team: [...team] };
}

export function onDay(state: GameState, day: number): GameState {
  return { ...draft(state), day };
}

/** A game at day 1 with a quiet map (every region CALM) and this card: the usual starting point of a rule test. */
export function quiet(content: ThirtyContent, id: CardId, heats: Partial<Record<RegionId, Heat>> = {}, roll = 0.5): GameState {
  return withCard(content, withHeats(newGame(content, 'test'), heats), id, roll);
}
