/**
 * Named map states for the dev harness (dev.html?state=<name>). Each builds a MapView and, where
 * the state is a moment in an effect, plays the effects on a frozen clock up to that moment.
 * Fictional data only; nothing here ships in the game.
 */
import type { Colour, MapController, MapView, RegionId, RegionView, Stamp } from './contract';
import { LAND_JOINS, REGION, REGIONS, SEA_LANES, pairKey } from './data';
import type { MapControllerPlus, MapViewPlus } from './extensions';

export interface ViewSpec {
  lit?: RegionId[];
  pinned?: RegionId[];
  airlift?: RegionId[];
  spent?: RegionId[];
  retired?: RegionId[];
  brass?: Record<RegionId, number>;
  glow?: Record<RegionId, number>;
  stamps?: Record<RegionId, Stamp>;
  colours?: Record<RegionId, Colour>;
  capitals?: RegionId[];
  threads?: Array<[RegionId, RegionId, number]>;
  cables?: Array<[RegionId, RegionId]>;
  /** Joins to draw between pins; by default every land, lane and cable join among the pins. */
  joined?: Array<[RegionId, RegionId]>;
  flashpoint?: RegionId | null;
  ring?: number;
  gridlock?: boolean;
  ferry?: boolean;
  blackout?: Colour | null;
  armed?: MapView['armed'];
  highlight?: RegionId[] | null;
  finger?: RegionId | null;
  sweepOrder?: boolean;
  loose?: RegionId[];
  ringed?: RegionId | null;
  cableDrag?: MapViewPlus['cableDrag'];
}

const JOINS = new Set([...LAND_JOINS, ...SEA_LANES].map(([a, b]) => pairKey(a, b)));

export function joinsAmong(pins: RegionId[], cables: Array<[RegionId, RegionId]> = [], ferry = false): Array<[RegionId, RegionId]> {
  const cableKeys = new Set(cables.map(([a, b]) => pairKey(a, b)));
  const ports = new Set(REGIONS.filter((r) => r.port).map((r) => r.id));
  for (const [a, b] of cables) ports.add(a).add(b);
  const out: Array<[RegionId, RegionId]> = [];
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      const key = pairKey(pins[i], pins[j]);
      const ferried = ferry && ports.has(pins[i]) && ports.has(pins[j]);
      if (JOINS.has(key) || cableKeys.has(key) || ferried) out.push([pins[i], pins[j]]);
    }
  }
  return out;
}

export function makeView(s: ViewSpec): MapViewPlus {
  const cables = s.cables ?? [];
  const cableEnds = new Set(cables.flat());
  const pinned = new Set([...(s.pinned ?? []), ...(s.airlift ?? [])]);
  const regions: Record<RegionId, RegionView> = {};
  for (const r of REGIONS) {
    const status = s.retired?.includes(r.id)
      ? 'retired'
      : s.spent?.includes(r.id)
        ? 'spent'
        : s.lit?.includes(r.id) || s.pinned?.includes(r.id)
          ? 'lit'
          : 'dark';
    regions[r.id] = {
      id: r.id,
      colour: s.colours?.[r.id] ?? r.colour,
      status,
      pinned: !!s.pinned?.includes(r.id),
      airlift: !!s.airlift?.includes(r.id),
      capital: r.capital || !!s.capitals?.includes(r.id),
      port: r.port || cableEnds.has(r.id),
      stamp: s.stamps?.[r.id] ?? null,
      brass: s.brass?.[r.id] ?? 0,
      glow: s.glow?.[r.id] ?? 0,
    };
  }
  const pins = [...pinned];
  const sweepOrder = s.sweepOrder
    ? Object.fromEntries(
        pins
          .filter((id) => !s.loose?.includes(id))
          .sort((a, b) => REGION[a].x - REGION[b].x || REGION[a].y - REGION[b].y)
          .map((id, i) => [id, i + 1]),
      )
    : null;
  return {
    regions,
    threads: (s.threads ?? []).map(([a, b, traffic]) => ({ a, b, traffic })),
    cables,
    joinedPins: s.joined ?? joinsAmong(pins, cables, !!s.ferry && !s.gridlock),
    flashpoint: s.flashpoint ?? null,
    ring: s.ring ?? (s.flashpoint ? 1 : 0),
    gridlock: !!s.gridlock,
    ferry: !!s.ferry,
    blackout: s.blackout ?? null,
    armed: s.armed ?? null,
    highlight: s.highlight ?? null,
    finger: s.finger ?? null,
    sweepOrder,
    loose: s.loose ?? null,
    ringed: s.ringed ?? null,
    cableDrag: s.cableDrag ?? null,
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
  script?: (map: MapControllerPlus, step: Stepper) => void;
  /** The moment to capture, in ms on the scenario clock (default: 2 s, when everything has settled). */
  capture?: number;
}

/** First night (spec 11): the opening deal. */
const FIRST_DEAL: RegionId[] = ['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT'];

/** The run so far in the style frame: traffic, brass and spent regions from earlier sweeps. */
const RUN_THREADS: Array<[RegionId, RegionId, number]> = [
  ['EDV', 'MRD', 4],
  ['MRD', 'ASK', 2],
  ['FRM', 'WMS', 3],
  ['WMS', 'KLM', 2],
  ['MRM', 'SLW', 2],
  ['BRN', 'MRM', 1],
];

const SWEEP_PINS: RegionId[] = ['LNK', 'SHL', 'LTL', 'KLP', 'TLM'];

const DEFECT_VIEW: ViewSpec = {
  lit: ['KLM', 'KLP', 'BRK', 'TLM', 'GLM', 'EDV', 'MRM', 'PBB'],
  flashpoint: 'TLM',
  ring: 1,
};

/** Event timing from spec 9: event k lasts max(120, round(320 x 0.94^k)) ms, from 450 ms. */
export function eventTimes(n: number): number[] {
  const out: number[] = [];
  let t = 450;
  for (let k = 0; k < n; k++) {
    out.push(t);
    t += k >= 12 ? 60 : Math.max(120, Math.round(320 * Math.pow(0.94, k)));
  }
  return out;
}

/** Plays a sweep's pin events over the scoring set (west to east) up to the frozen moment. */
function playSweep(map: MapController, step: Stepper, pins: RegionId[], upto: number, heatAt?: number): number[] {
  const order = [...pins].sort((a, b) => REGION[a].x - REGION[b].x || REGION[a].y - REGION[b].y);
  step.at(0);
  map.fx.dimExcept(order);
  const times = eventTimes(order.length);
  const joined = new Set(joinsAmong(order).map(([a, b]) => pairKey(a, b)));
  for (let i = 0; i < Math.min(upto, order.length); i++) {
    step.at(times[i]);
    if (heatAt !== undefined && heatAt === i) map.fx.heat(true);
    map.fx.scanTo(REGION[order[i]].x);
    map.fx.flash(order[i]);
    step.at(times[i] + 60);
    for (let j = 0; j < i; j++) if (joined.has(pairKey(order[i], order[j]))) map.fx.pulseThread(order[j], order[i]);
  }
  return times;
}

export const SCENARIOS: Record<string, Scenario> = {
  fresh: {
    title: 'Fresh deal: 8 lit regions, the flashpoint ring at full size',
    view: { lit: FIRST_DEAL, flashpoint: 'LNK', ring: 1 },
  },

  joined: {
    title: 'Three pins joined: a Chain with sweep-order badges',
    view: {
      lit: ['EDV', 'QLN', 'NWK', 'ICW', 'HRT'],
      pinned: ['GUL', 'LNK', 'SHL'],
      spent: ['WMS', 'FRM', 'WNM'],
      brass: { LNK: 1, EDV: 1, WMS: 1, MRM: 2 },
      glow: { LNK: 0.12, EDV: 0.09 },
      stamps: { HRT: 'FORTIFY' },
      threads: [
        ['GUL', 'LNK', 1],
        ['LNK', 'SHL', 1],
        ['NWK', 'FRM', 2],
        ['FRM', 'WMS', 3],
        ['EDV', 'MRD', 6],
        ['MRD', 'TRN', 2],
      ],
      flashpoint: 'LNK',
      ring: 1,
      sweepOrder: true,
    },
  },

  sweep: {
    title: 'Mid-sweep: dimmed table, scan line on the third pin, HEAT on, a thread pulse',
    view: {
      lit: ['QLN', 'GLM', 'BRN'],
      pinned: SWEEP_PINS,
      spent: ['EDV', 'MRD', 'ASK', 'FRM', 'WMS', 'KLM'],
      brass: { LNK: 1, EDV: 1, WMS: 1, MRM: 1 },
      glow: { LNK: 0.12, SHL: 0.06 },
      stamps: { KLP: 'FORTIFY' },
      threads: [
        ['LNK', 'SHL', 2],
        ['SHL', 'LTL', 2],
        ['LTL', 'KLP', 1],
        ['LTL', 'TLM', 1],
        ['KLP', 'TLM', 3],
        ...RUN_THREADS,
      ],
      flashpoint: 'TLM',
      ring: 1 - 1046 / 1350,
    },
    script: (map, step) => {
      const t = playSweep(map, step, SWEEP_PINS, 3, 2);
      step.at(t[2] + 60 + 70);
    },
  },

  traffic: {
    title: 'Traffic and brass: threads worn by use, brass pins from cleared crises',
    view: {
      lit: ['NWK', 'VSY', 'QLN', 'KLP', 'BRK', 'ICW', 'FLE', 'DRF'],
      spent: ['WMS', 'GLM', 'TRN', 'LNK', 'MRM', 'HRT'],
      brass: { LNK: 3, MRM: 5, EDV: 2, TLM: 1, WMS: 1 },
      glow: { LNK: 0.4, MRM: 0.3, EDV: 0.24, MRD: 0.15, TLM: 0.12, WMS: 0.09, GLM: 0.06 },
      threads: [
        ['EDV', 'MRD', 12],
        ['MRD', 'TRN', 9],
        ['TRN', 'LNK', 7],
        ['GUL', 'LNK', 4],
        ['TRN', 'GUL', 3],
        ['LNK', 'PBB', 2],
        ['PBB', 'MRM', 6],
        ['MRM', 'HRT', 10],
        ['MRM', 'SLW', 1],
        ['WMS', 'GLM', 2],
        ['GLM', 'DRF', 5],
        ['TLM', 'LTL', 3],
      ],
      flashpoint: 'EDV',
      ring: 0.62,
    },
  },

  stamps: {
    title: 'Stamps: FORTIFY hatching, RELAY double ring, ECHO doubled head, PROMOTE star',
    view: {
      lit: ['WNM', 'GLM', 'EDV', 'TLM', 'LTL', 'MRM', 'ICW', 'GUL'],
      pinned: ['EDV'],
      stamps: { WNM: 'FORTIFY', TLM: 'FORTIFY', GLM: 'RELAY', EDV: 'ECHO', BRN: 'RELAY', ASK: 'ECHO', SHL: 'FORTIFY' },
      capitals: ['ICW'],
      flashpoint: 'MRM',
      ring: 0.85,
    },
    script: (map, step) => {
      step.at(0);
      map.fx.stampPulse('TLM');
      step.at(150);
    },
  },

  cables: {
    title: 'Cables: brass lines laid across the sea, a thread running along one, a cable being dragged',
    view: {
      lit: ['EDV', 'TRN', 'QLN', 'KLP', 'DNM', 'FLE', 'WNM', 'GUL'],
      pinned: ['EDV', 'TRN'],
      cables: [
        ['EDV', 'TRN'],
        ['LNK', 'TLM'],
        ['MRM', 'DNM'],
      ],
      threads: [['LNK', 'TLM', 3]],
      flashpoint: 'TRN',
      ring: 0.7,
      cableDrag: { from: 'HRT', x: 356, y: 392 },
    },
  },

  defect: {
    title: 'DEFECT: Kellmark’s blue spreading like ink into Kelpmouth and Brackwater',
    view: DEFECT_VIEW,
    script: (map, step) => {
      // As in the game: the engine applies the Order (new colours), then the map plays the ink.
      step.at(1000);
      map.update(makeView({ ...DEFECT_VIEW, colours: { KLP: 'CAP', BRK: 'CAP' } }));
      void map.fx.inkSpread('KLM', ['KLP', 'BRK']);
      step.at(1330);
    },
  },

  retired: {
    title: 'RETIRE: two regions shuttered for the rest of the run',
    view: {
      lit: ['TLM', 'LTL', 'ORN', 'KLP', 'MRM', 'HRT', 'EDV', 'GUL'],
      retired: ['DNM', 'SLW'],
      spent: ['BRK'],
      flashpoint: 'ORN',
      ring: 0.9,
    },
  },

  gridlock: {
    title: 'Summit GRIDLOCK: sea lanes and cables crossed out',
    view: {
      lit: ['NWK', 'VSY', 'GLM', 'DRF', 'MRD', 'TRN', 'ORN', 'FLE'],
      cables: [['LNK', 'TLM']],
      threads: RUN_THREADS,
      gridlock: true,
      flashpoint: 'DRF',
      ring: 1,
    },
  },

  blackout: {
    title: 'Summit BLACKOUT: Sundry darkened (its regions still count for patterns)',
    view: {
      lit: ['KLP', 'TLM', 'DNM', 'LNK', 'SHL', 'EDV', 'WMS', 'HRT'],
      threads: RUN_THREADS,
      blackout: 'SND',
      flashpoint: 'LNK',
      ring: 1,
    },
  },

  ferry: {
    title: 'Ferry Master: every port joined; two far ports pinned and joined by ferry',
    view: {
      lit: ['NWK', 'FLE', 'GUL', 'EDV', 'KLP', 'ICW', 'WMS', 'DNM'],
      pinned: ['NWK', 'FLE'],
      ferry: true,
      flashpoint: 'EDV',
      ring: 1,
      sweepOrder: true,
    },
  },

  shockwave: {
    title: 'Clear: the shockwave rolls out from the flashpoint and a brass pin drops',
    view: {
      spent: SWEEP_PINS,
      brass: { LNK: 1, EDV: 1, WMS: 1, MRM: 1, TLM: 1 },
      glow: { LNK: 0.15, SHL: 0.09, LTL: 0.06, KLP: 0.06, TLM: 0.09 },
      stamps: { KLP: 'FORTIFY' },
      threads: [
        ['LNK', 'SHL', 3],
        ['SHL', 'LTL', 3],
        ['LTL', 'KLP', 2],
        ['LTL', 'TLM', 2],
        ['KLP', 'TLM', 4],
        ...RUN_THREADS,
      ],
      flashpoint: 'TLM',
      ring: 0,
    },
    script: (map, step) => {
      step.at(0);
      void map.fx.shockwave('TLM');
      step.at(60);
      void map.fx.dropBrass('TLM');
      step.at(190);
    },
  },

  lightsout: {
    title: 'Miss: the lights go out region by region',
    view: {
      lit: ['QLN', 'GLM', 'BRN', 'ICW', 'DRF', 'ORN', 'NWK', 'HRT'],
      spent: SWEEP_PINS,
      brass: { EDV: 1, WMS: 1 },
      threads: RUN_THREADS,
      flashpoint: 'TLM',
      ring: 0.22,
    },
    script: (map, step) => {
      step.at(0);
      void map.fx.lightsOut();
      step.at(1150);
    },
  },

  armed: {
    title: 'Order armed (FORTIFY): valid targets glow, one chosen',
    view: {
      lit: ['NWK', 'WMS', 'EDV', 'LNK', 'TLM', 'MRM', 'QLN', 'HRT'],
      armed: {
        kind: 'tap',
        valid: ['NWK', 'WMS', 'EDV', 'LNK', 'TLM', 'MRM', 'QLN', 'HRT', 'GLM', 'KLM', 'ASK', 'DNM'],
        chosen: ['TLM'],
      },
      flashpoint: 'LNK',
      ring: 1,
    },
    capture: 400,
  },

  firstnight: {
    title: 'First night: the finger pulse on Lantern Key',
    view: { lit: FIRST_DEAL, flashpoint: 'LNK', ring: 1, finger: 'LNK' },
    capture: 700,
  },

  cleared: {
    title: 'After the clear: the cooled flashpoint, the run’s threads and brass',
    view: {
      brass: { LNK: 1, TLM: 1, EDV: 1, WMS: 1, MRM: 1 },
      glow: { LNK: 0.15, SHL: 0.09, LTL: 0.06, KLP: 0.06, TLM: 0.09, EDV: 0.12, MRD: 0.06, WMS: 0.12, FRM: 0.06, KLM: 0.06 },
      stamps: { KLP: 'FORTIFY' },
      threads: [
        ['LNK', 'SHL', 3],
        ['SHL', 'LTL', 3],
        ['LTL', 'KLP', 2],
        ['LTL', 'TLM', 2],
        ['KLP', 'TLM', 4],
        ['EDV', 'MRD', 4],
        ['MRD', 'ASK', 2],
        ['FRM', 'WMS', 3],
        ['WMS', 'KLM', 2],
        ['NWK', 'FRM', 1],
      ],
      flashpoint: 'TLM',
      ring: 0,
    },
  },

  airlift: {
    title: 'AIRLIFT: a white winged pin joins the Chain from a dark region',
    view: {
      lit: ['EDV', 'QLN', 'NWK', 'ICW', 'HRT'],
      pinned: ['GUL', 'LNK', 'SHL'],
      airlift: ['PBB'],
      threads: [['LNK', 'PBB', 2]],
      flashpoint: 'LNK',
      ring: 0.8,
      sweepOrder: true,
    },
  },

  again: {
    title: 'AGAIN: the flashpoint scores twice; the scan line snaps back',
    view: {
      lit: ['QLN', 'GLM', 'BRN', 'MRM'],
      pinned: ['EDV', 'MRD', 'ASK', 'QLN'],
      loose: ['QLN'],
      threads: [
        ['EDV', 'MRD', 4],
        ['MRD', 'ASK', 2],
      ],
      flashpoint: 'MRD',
      ring: 0.55,
      sweepOrder: true,
    },
    script: (map, step) => {
      const pins = ['ASK', 'EDV', 'MRD'];
      const t = playSweep(map, step, pins, 3);
      step.at(t[2] + 260);
      map.fx.scanAgain(REGION.MRD.x);
      map.fx.flash('MRD');
      map.fx.standbyPulse('MRM');
      step.at(t[2] + 260 + 110);
    },
  },
};
