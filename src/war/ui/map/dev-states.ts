/**
 * Named map states for the dev harness (dev.html?state=<name>). Each builds a MapView and, where
 * the state is a moment in an effect, plays the effects on a frozen clock up to that moment.
 * The numbers follow docs/war/v2/SPEC.md (FIRST-WORLD and Example 2). Nothing here ships.
 */
import type { MapController, MapView, Owner, RegionId, RegionView } from './contract';
import { REGIONS } from './data';
import { isJoin } from './scene';

export interface ViewSpec {
  gold?: RegionId[];
  red?: RegionId[];
  lit?: RegionId[];
  /** Pins in tap order. */
  pinned?: RegionId[];
  crisis?: { id: RegionId; target: string } | null;
  /** The send's outcome preview: the regions it would win in order, or 'miss'. */
  preview?: RegionId[] | 'miss' | null;
  warNext?: MapView['warNext'];
  brass?: RegionId[];
  /** Override which lit regions may be added (a coach step); by default the touch rule decides. */
  addable?: RegionId[];
  ceased?: boolean;
  highlight?: RegionId[] | null;
  finger?: RegionId | null;
  hover?: RegionId | null;
}

/** A lit region can be pinned if nothing is pinned yet or it touches a pin; never past 5 pins. */
export function canAdd(id: RegionId, pins: RegionId[]): boolean {
  if (pins.includes(id) || pins.length >= 5) return false;
  return pins.length === 0 || pins.some((p) => isJoin(p, id));
}

function joinsAmong(pins: RegionId[]): Array<[RegionId, RegionId]> {
  const out: Array<[RegionId, RegionId]> = [];
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) if (isJoin(pins[i], pins[j])) out.push([pins[i], pins[j]]);
  return out;
}

export function makeView(s: ViewSpec): MapView {
  const pins = s.pinned ?? [];
  const lit = new Set([...(s.lit ?? []), ...pins, ...(s.crisis ? [s.crisis.id] : [])]);
  const regions: Record<RegionId, RegionView> = {};
  const winOrder = Array.isArray(s.preview) ? s.preview : [];
  for (const r of REGIONS) {
    const owner: Owner = s.gold?.includes(r.id) ? 'gold' : s.red?.includes(r.id) ? 'red' : 'grey';
    const isLit = lit.has(r.id);
    const pinned = pins.includes(r.id);
    const addable = isLit && !pinned && (s.addable ? s.addable.includes(r.id) : canAdd(r.id, pins));
    const order = winOrder.indexOf(r.id);
    regions[r.id] = {
      id: r.id,
      colour: r.colour,
      owner,
      lit: isLit,
      pinned,
      addable,
      joinable: addable && pins.length > 0,
      capital: r.capital,
      port: r.port,
      preview: order >= 0 ? { kind: 'win', order: order + 1 } : s.preview === 'miss' && s.crisis?.id === r.id ? { kind: 'war', order: 1 } : null,
    };
  }
  return {
    regions,
    joinedPins: joinsAmong(pins),
    crisis: s.crisis ? { ...s.crisis, doubled: pins.includes(s.crisis.id) } : null,
    warNext: s.warNext ?? null,
    ceased: !!s.ceased,
    highlight: s.highlight ?? null,
    finger: s.finger ?? null,
    hover: s.hover ?? null,
  };
}

/** A frozen clock the scenario scripts move by hand. */
export interface Stepper {
  at(t: number): void;
}

export interface Scenario {
  title: string;
  view: ViewSpec;
  /** Effects to play, moving the clock with step.at(t) before each call. */
  script?: (map: MapController, step: Stepper) => void;
  /** The moment to capture, in ms on the scenario clock (default: 2 s, when everything has settled). */
  capture?: number;
}

// ------------------------------------------------------------------ FIRST-WORLD (SPEC 4 and 13)

const FW_RED: RegionId[] = ['DNM', 'ORN', 'FLE'];
const FW_TURN1_LIT: RegionId[] = ['LNK', 'PBB', 'TRN', 'GUL', 'DRF', 'LTL', 'MRM', 'MRD', 'KLP', 'TLM'];
const FW_TURN1: ViewSpec = {
  gold: ['LNK'],
  red: FW_RED,
  lit: FW_TURN1_LIT,
  crisis: { id: 'SHL', target: '64' },
  warNext: { id: 'MRM', turns: 3 },
};

// ------------------------------------------------------------------ Example 2 (SPEC 6, turn 11)

const EX2_GOLD: RegionId[] = ['BRK', 'DRF', 'FLE', 'FRM', 'GLM', 'GUL', 'HRT', 'KLM', 'KLP', 'LNK', 'MRD', 'MRM', 'ORN', 'PBB', 'RMH', 'SHL', 'SLW', 'TLM', 'TRN', 'WMS', 'WNM'];
const EX2_RED: RegionId[] = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY'];
const EX2_LIT: RegionId[] = ['LNK', 'DNM', 'MRM', 'GUL', 'PBB', 'TLM', 'FLE', 'ORN', 'DRF', 'WMS'];
/** Regions this game won as crises (the brass pins are decoration). */
const EX2_BRASS: RegionId[] = ['SHL', 'TRN', 'MRD', 'GLM', 'KLP', 'RMH', 'WNM', 'HRT'];

const ALL: RegionId[] = REGIONS.map((r) => r.id);

export const SCENARIOS: Record<string, Scenario> = {
  start: {
    title: 'A fresh game (FIRST-WORLD): Lantern Key gold, war on Dunmarrow, Orrinth and Floe End, 26 grey',
    view: { gold: ['LNK'], red: FW_RED },
  },

  wave: {
    title: 'Intro screen 1: the gold wave rolls out from Lantern Key over all 30 regions (the goal)',
    view: { gold: ['LNK'], red: FW_RED },
    script: (map, step) => {
      step.at(0);
      void map.fx.wave('LNK', 'gold', 1200);
    },
    capture: 330,
  },

  turn1: {
    title: 'Turn 1: the crisis on Shoal (target 64), ten regions lit, war will take Marram in 3 turns',
    view: FW_TURN1,
    capture: 400,
  },

  miss: {
    title: 'Shoal alone: 7 × 2.0 = 14, a MISS. Shoal hatched red; only regions touching it stay lit',
    view: { ...FW_TURN1, pinned: ['SHL'], preview: 'miss' },
    capture: 400,
  },

  win2: {
    title: 'Shoal + Lantern Key + Pebbleby + Marram: 264, WINS 2 REGIONS (1 Shoal, 2 Pebbleby)',
    view: { ...FW_TURN1, pinned: ['SHL', 'LNK', 'PBB', 'MRM'], preview: ['SHL', 'PBB'] },
    capture: 400,
  },

  'ink-gold': {
    title: 'The win: the ring collapsed, Shoal is gold, a gold pulse reached Pebbleby and gold floods it',
    view: { ...FW_TURN1, pinned: ['SHL', 'LNK', 'PBB', 'MRM'] },
    script: (map, step) => {
      const won: ViewSpec = { ...FW_TURN1, pinned: ['SHL', 'LNK', 'PBB', 'MRM'] };
      step.at(0);
      void map.fx.ringCollapse();
      step.at(300);
      map.update(makeView({ ...won, gold: ['LNK', 'SHL'] }));
      void map.fx.inkSpread('SHL', ['SHL'], 'gold');
      void map.fx.shockwave('SHL');
      step.at(1000);
      void map.fx.travel(['SHL', 'PBB'], 'gold');
      step.at(1150);
      map.update(makeView({ ...won, gold: ['LNK', 'SHL', 'PBB'] }));
      void map.fx.inkSpread('SHL', ['PBB'], 'gold', 400);
    },
    capture: 1370,
  },

  midgame: {
    title: 'Turn 11 (Example 2): 21 gold, war holds 5. Crisis Lintel (3,700); the best send WINS 3, taking back Brindle Coast',
    view: {
      gold: EX2_GOLD,
      red: EX2_RED,
      lit: EX2_LIT,
      crisis: { id: 'LTL', target: '3,700' },
      pinned: ['MRM', 'LTL', 'FLE', 'TLM', 'ORN'],
      preview: ['LTL', 'DNM', 'BRN'],
      warNext: { id: 'ICW', turns: 2 },
      brass: EX2_BRASS,
    },
    capture: 400,
  },

  choosing: {
    title: 'Turn 11 before any pin: the deal around Lintel, war will take Iceward in 2 turns',
    view: { gold: EX2_GOLD, red: EX2_RED, lit: EX2_LIT, crisis: { id: 'LTL', target: '3,700' }, warNext: { id: 'ICW', turns: 2 }, brass: EX2_BRASS },
    capture: 400,
  },

  'war-spread': {
    title: 'War spreads by itself after turn 3: red ink runs from Floe End into Marram; the tag moves on',
    view: { gold: ['LNK', 'SHL', 'PBB', 'TRN', 'MRD'], red: FW_RED, warNext: { id: 'MRM', turns: 1 }, brass: ['SHL', 'TRN'] },
    script: (map, step) => {
      step.at(0);
      map.update(makeView({ gold: ['LNK', 'SHL', 'PBB', 'TRN', 'MRD'], red: [...FW_RED, 'MRM'], warNext: { id: 'SLW', turns: 3 }, brass: ['SHL', 'TRN'] }));
      void map.fx.inkSpread('FLE', ['MRM'], 'red', 700);
    },
    capture: 430,
  },

  push: {
    title: 'The final push (Example 5): no grey left, the crisis flares on war’s Edda Vale; WINS 2 takes back Ashkettle too',
    view: {
      gold: ALL.filter((id) => !['EDV', 'ASK', 'QLN'].includes(id)),
      red: ['EDV', 'ASK', 'QLN'],
      lit: ['RMH', 'MRD', 'VSY', 'WNM', 'BRN', 'TRN', 'GUL', 'PBB', 'NWK', 'LNK'],
      crisis: { id: 'EDV', target: '42,000' },
      pinned: ['EDV', 'MRD', 'RMH', 'VSY'],
      preview: ['EDV', 'ASK'],
      brass: ['SHL', 'TRN', 'MRD', 'GLM', 'KLP', 'RMH', 'WNM', 'HRT', 'LTL', 'DNM', 'ICW'],
    },
    capture: 400,
  },

  ceasefire: {
    title: 'CEASEFIRE: the push missed three times; war stops where it stands (no pulse, faded); 27 of 30 gold',
    view: {
      gold: ALL.filter((id) => !['EDV', 'ASK', 'QLN'].includes(id)),
      red: ['EDV', 'ASK', 'QLN'],
      ceased: true,
      brass: ['SHL', 'TRN', 'MRD', 'GLM', 'KLP', 'RMH', 'WNM', 'HRT', 'LTL', 'DNM', 'ICW'],
    },
  },

  'lights-out': {
    title: 'WAR: war took 10. The free regions go dark one by one; gold stays lit; red pulses once',
    view: {
      gold: ['LNK', 'SHL', 'PBB', 'TRN', 'GUL', 'DRF', 'MRD', 'GLM', 'KLP', 'LTL', 'TLM', 'BRK', 'KLM', 'WMS'],
      red: ['DNM', 'ORN', 'FLE', 'MRM', 'HRT', 'SLW', 'ICW', 'BRN', 'ASK', 'QLN'],
      brass: ['SHL', 'TRN', 'MRD', 'GLM', 'KLP', 'LTL'],
    },
    script: (map, step) => {
      step.at(0);
      void map.fx.lightsOut();
    },
    capture: 1720,
  },

  united: {
    title: 'WORLD UNITED: 30 of 30, the gold wave from the last region won',
    view: { gold: ALL, brass: ['SHL', 'TRN', 'MRD', 'GLM', 'KLP', 'RMH', 'WNM', 'HRT', 'LTL', 'DNM', 'ICW', 'EDV', 'QLN'] },
    script: (map, step) => {
      step.at(0);
      void map.fx.wave('QLN', 'gold', 1600);
    },
    capture: 560,
  },

  deal: {
    title: 'A deal: the crisis drops on Shoal and ten regions light one by one',
    view: FW_TURN1,
    script: (map, step) => {
      step.at(0);
      map.lightUp(FW_TURN1_LIT, 120);
      map.update(makeView(FW_TURN1));
    },
    capture: 640,
  },

  highlight: {
    title: 'Long-press on the Harbourmaster: the ports light where it acts',
    view: { ...FW_TURN1, highlight: REGIONS.filter((r) => r.port).map((r) => r.id) },
    capture: 400,
  },

  coach: {
    title: 'Coach step 1: “Tap the crisis: the white ring.” Only Shoal is tappable; the finger pulses on it',
    view: { ...FW_TURN1, addable: ['SHL'], finger: 'SHL' },
    capture: 700,
  },
};

