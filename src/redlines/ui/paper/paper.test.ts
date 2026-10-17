import { describe, expect, it } from 'vitest';
import { REGION, REGIONS } from '../../../thirty/ui/map/data';
import { EMPTY_VIEW, MAP_WORDS, type PaperView } from './contract';
import { CALL_SHIFT, FRAME, boundsOf, centreOf, computeGeometry, hitFrame, hitMap, regionAt, toFrame, toMap } from './geometry';
import { defendPos, marksOf, pinPos, ringSize, testedPos } from './marks';
import { rnd, seedOf } from './rand';
import { buildSheet } from './sheet';
import { greaseRing, island, pencilArrow, pencilLine } from './strokes';
import { sameView, testedOf, viewFromState } from './view';
import type { GameState } from '../../engine/types';

const geo = computeGeometry();
const sheet = buildSheet(MAP_WORDS, 'pp', FRAME, geo);

/** MOMENT.md's day 18 as a view. */
const DAY18: PaperView = {
  states: { DRF: 'fighting', KLP: 'pressed', LTL: 'pressed', BRK: 'pressed', GUL: 'pressed' },
  promises: [
    { region: 'VSY', solid: true },
    { region: 'LNK', solid: true },
    { region: 'LTL', solid: false },
  ],
  headings: [
    { from: 'KLM', to: 'KLP' },
    { from: 'WMS', to: 'VSY' },
  ],
  pieces: [{ kind: 'fleet', at: 'LNK' }],
  tested: 'LTL',
  pressed: null,
};

describe('the frame', () => {
  it('puts the map on the sheet as the mock does: x as is, y stretched 1.08 and dropped 58', () => {
    expect(toFrame(FRAME, 0, 0)).toEqual([0, 58]);
    expect(toFrame(FRAME, 100, 100)[1]).toBeCloseTo(166);
    const [x, y] = toMap(FRAME, 100, 166);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(100);
    // The whole map sits inside the neat line (46..642) and above the index card.
    for (const r of REGIONS) {
      const c = centreOf(FRAME, r.id)!;
      expect(c.y).toBeGreaterThan(60);
      expect(c.y).toBeLessThan(500);
    }
    expect(CALL_SHIFT).toBe(-170);
  });
});

describe('hit testing', () => {
  it('finds every region at its centre, in map points and in frame px', () => {
    for (const r of REGIONS) {
      expect(regionAt(geo, r.x, r.y)).toBe(r.id);
      const c = centreOf(FRAME, r.id)!;
      expect(hitFrame(geo, FRAME, c.x, c.y)).toBe(r.id);
    }
  });

  it('returns null on the open sea, the desk and off the frame', () => {
    expect(hitFrame(geo, FRAME, 2, 2)).toBeNull();
    expect(hitFrame(geo, FRAME, 200, 700)).toBeNull();
    expect(hitFrame(geo, FRAME, -5, 300)).toBeNull();
    expect(hitFrame(geo, FRAME, 395, 300)).toBeNull();
    expect(hitMap(geo, 2, 398)).toBeNull();
  });

  it('gives an island a little slack round its disc for a finger', () => {
    const lnk = REGION.LNK;
    expect(hitMap(geo, lnk.x + 24, lnk.y)).toBe('LNK');
    expect(hitMap(geo, lnk.x, lnk.y - 24)).toBe('LNK');
  });

  it('keeps the two capitals and the Sound where the moment needs them', () => {
    expect(hitFrame(geo, FRAME, ...(toFrame(FRAME, 92, 190.8) as [number, number]))).toBe('EDV');
    expect(hitFrame(geo, FRAME, ...(toFrame(FRAME, 258, 30.8) as [number, number]))).toBe('WMS');
    expect(hitFrame(geo, FRAME, ...(toFrame(FRAME, 290, 192.3) as [number, number]))).toBe('LTL');
  });

  it('bounds every plate inside the frame', () => {
    for (const r of REGIONS) {
      const b = boundsOf(geo, FRAME, r.id)!;
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(390);
      expect(b.x1 - b.x0).toBeGreaterThan(20);
      expect(b.y1 - b.y0).toBeGreaterThan(20);
      const c = centreOf(FRAME, r.id)!;
      expect(c.x).toBeGreaterThanOrEqual(b.x0);
      expect(c.x).toBeLessThanOrEqual(b.x1);
    }
  });
});

describe('the sheet', () => {
  it('prints every region name, the five bloc titles, the two flags and the compass', () => {
    for (const r of REGIONS) expect(sheet.markup).toContain(`id="pp-nm-${r.id}"`);
    for (const t of Object.values(MAP_WORDS.blocs)) expect(sheet.markup).toContain(`>${t}<`);
    expect(sheet.markup.match(/fill="#1d4b6e"/g)).toHaveLength(1); // the Republic's blue
    expect(sheet.markup.match(/fill="#8f1b1b"/g)).toHaveLength(1); // the Federation's red
    expect(sheet.markup).toContain('translate(336 534)');
    expect(sheet.markup).toContain(`>${MAP_WORDS.north}<`);
  });

  it('leaves the mark layers empty, in z-order', () => {
    const order = ['pp-l-press', 'pp-l-fight', 'pp-borders', 'pp-coasts', 'pp-l-hold', 'pp-names', 'pp-l-head', 'pp-l-piece', 'pp-l-prom', 'pp-l-test', 'pp-l-hw', 'pp-l-stamp'];
    let last = -1;
    for (const cls of order) {
      const i = sheet.markup.indexOf(cls);
      expect(i, cls).toBeGreaterThan(last);
      last = i;
    }
    expect(sheet.markup).toContain('<g class="pp-l pp-l-prom"');
    expect(sheet.markup).toMatch(/<g class="pp-l pp-l-prom"[^>]*><\/g>/);
  });

  it('has a shape and a centre for every region and uses the ids it is given', () => {
    for (const r of REGIONS) {
      expect(sheet.geom.shape[r.id]).toMatch(/^M/);
      expect(sheet.geom.centre[r.id]).toHaveLength(2);
    }
    const other = buildSheet(MAP_WORDS, 'zz', FRAME, geo);
    expect(other.markup).toContain('id="zz-rough"');
    expect(other.markup).not.toContain('id="pp-rough"');
    expect(sheet.markup).toContain('filter="url(#pp-rough)"');
  });

  it('writes the words it is given', () => {
    const w = { ...MAP_WORDS, blocs: { ...MAP_WORDS.blocs, SND: 'THE STRAIT' }, north: 'NORTH' };
    const s = buildSheet(w, 'pp', FRAME, geo);
    expect(s.markup).toContain('>THE STRAIT<');
    expect(s.markup).toContain('>NORTH<');
  });
});

describe('the marks for a view', () => {
  const m = marksOf(DAY18, sheet.geom, MAP_WORDS, 'pp');

  it('hatches the pressed places and washes the fighting one, with its stamp and its name in red', () => {
    expect(m.press.map((i) => i.key).sort()).toEqual(['press:BRK', 'press:GUL', 'press:KLP', 'press:LTL']);
    expect(m.fight.map((i) => i.key)).toEqual(['fight:DRF']);
    expect(m.stamp).toHaveLength(1);
    expect(m.stamp[0].html).toContain('>FIGHTING<');
    expect(m.stamp[0].enter).toBe('slam');
    expect([...m.redNames]).toEqual(['DRF']);
    expect(m.press[0].html).toContain('url(#pp-hatch)');
  });

  it('rings every promise, solid where it can be held and dashed where it cannot, each with WE DEFEND', () => {
    expect(m.prom.map((i) => i.key)).toEqual(['prom:VSY:s', 'prom:LNK:s', 'prom:LTL:d']);
    expect(m.prom[0].html).toContain('pp-solid');
    expect(m.prom[2].html).toContain('stroke-dasharray=');
    expect(m.prom[2].enter).toBe('fade');
    expect(m.prom[0].enter).toBe('draw');
    expect(m.hw.filter((i) => i.key.startsWith('hw:defend:'))).toHaveLength(3);
    expect(m.hw[0].html).toContain('>WE DEFEND<');
  });

  it('pins the place their forces leave and arrows where they head', () => {
    expect(m.head.map((i) => i.key)).toEqual(['arrow:KLM:KLP', 'arrow:WMS:VSY', 'pin:KLM:KLP', 'pin:WMS:VSY']);
    const [px, py] = pinPos(sheet.geom, 'KLM', 'KLP');
    const [kx, ky] = sheet.geom.centre.KLM;
    const [tx, ty] = sheet.geom.centre.KLP;
    // The pin sits on Kellmark, nudged toward Kelpmouth.
    expect(Math.hypot(px - kx, py - ky)).toBeCloseTo(20);
    expect(Math.hypot(px - tx, py - ty)).toBeLessThan(Math.hypot(kx - tx, ky - ty));
    expect(m.head[0].enter).toBe('draw');
    expect(m.head[2].enter).toBe('drop');
  });

  it('puts the fleet beside Lantern Key as a counter with its label, moved by patch', () => {
    expect(m.piece.map((i) => i.key)).toEqual(['piece:fleet']);
    expect(m.piece[0].html).toContain('>FLEET<');
    expect(m.piece[0].patch).toBeDefined();
  });

  it('over-circles the tested place in red with TESTED underlined', () => {
    expect(m.test.map((i) => i.key)).toEqual(['test:LTL']);
    expect(m.test[0].html).toContain('pp-under');
    const tested = m.hw.find((i) => i.key === 'hw:tested:LTL')!;
    expect(tested.html).toContain('>TESTED<');
    expect(tested.html).toContain('pp-hwred');
    const t = testedPos(sheet.geom, 'LTL');
    expect(t.y).toBeGreaterThan(sheet.geom.label.LTL[1]);
    // The tested ring is a little bigger than a promise ring.
    expect(m.test[0].html.length).toBeGreaterThan(m.prom[2].html.length);
  });

  it('lifts a held region and ignores ids it does not know', () => {
    const held = marksOf({ ...DAY18, pressed: 'EDV', states: { ...DAY18.states, NOPE: 'pressed' }, promises: [{ region: 'NOPE', solid: true }] }, sheet.geom, MAP_WORDS, 'pp');
    expect(held.hold.map((i) => i.key)).toEqual(['hold:EDV']);
    expect(held.hold[0].enter).toBe('none');
    expect(held.press.map((i) => i.key)).not.toContain('press:NOPE');
    expect(held.prom).toHaveLength(0);
  });

  it('draws nothing for the empty view', () => {
    const e = marksOf(EMPTY_VIEW, sheet.geom, MAP_WORDS, 'pp');
    for (const k of ['press', 'fight', 'hold', 'head', 'piece', 'prom', 'test', 'hw', 'stamp'] as const) expect(e[k]).toHaveLength(0);
  });

  it('is the same markup for the same view (seeded, so nothing jitters on an update)', () => {
    const again = marksOf(DAY18, sheet.geom, MAP_WORDS, 'pp');
    expect(again.prom.map((i) => i.html)).toEqual(m.prom.map((i) => i.html));
    expect(again.head.map((i) => i.html)).toEqual(m.head.map((i) => i.html));
  });

  it('sizes rings to the place and puts WE DEFEND where the name is not', () => {
    for (const r of REGIONS) {
      const s = ringSize(sheet.geom, r.id);
      expect(s.rx).toBeGreaterThanOrEqual(22);
      expect(s.rx).toBeLessThanOrEqual(38);
      expect(s.ry).toBeGreaterThanOrEqual(20);
      expect(s.ry).toBeLessThanOrEqual(38);
    }
    // Lantern Key's name is under the island, so WE DEFEND goes over it; Vessary's goes under the ring.
    expect(defendPos(sheet.geom, 'LNK').y).toBeLessThan(sheet.geom.centre.LNK[1]);
    expect(defendPos(sheet.geom, 'VSY').y).toBeGreaterThan(sheet.geom.centre.VSY[1]);
  });
});

describe('the strokes', () => {
  it('are seeded and well formed', () => {
    expect(greaseRing(100, 100, 30, 25, 3)).toBe(greaseRing(100, 100, 30, 25, 3));
    expect(greaseRing(100, 100, 30, 25, 3)).not.toBe(greaseRing(100, 100, 30, 25, 4));
    expect(island(50, 50, 17, 11)).toMatch(/^M[\d. -]+(C[\d. -]+)+Z$/);
    expect(pencilLine(0, 0, 50, 0, 1)).toMatch(/^M/);
    const a = pencilArrow(
      [
        [0, 0],
        [20, 5],
        [40, 0],
      ],
      7,
    );
    expect(a.d).toMatch(/^M/);
    expect(a.head).toMatch(/^M[\d. -]+L[\d. -]+L[\d. -]+$/);
    expect(seedOf('LTL')).toBe(seedOf('LTL'));
    expect(seedOf('LTL')).not.toBe(seedOf('LNK'));
    const g = rnd(1);
    for (let i = 0; i < 100; i++) {
      const v = g.uniform(-2, 3);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(3);
      expect(g.range(-2, 3)).toBeGreaterThanOrEqual(-2);
    }
  });
});

describe('the view from a GameState', () => {
  const base = {
    seed: 's',
    week: 3,
    phase: 'act',
    influence: 31,
    regions: {
      DRF: { state: 'fighting', pressedWeeks: 2, quietWeeks: 0 },
      LTL: { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 },
      EDV: { state: 'calm', pressedWeeks: 0, quietWeeks: 0 },
    },
    promises: [
      { region: 'VSY', since: 1, inherited: false },
      { region: 'LTL', since: 0, inherited: true },
    ],
    pieces: [
      { kind: 'fleet', at: 'LNK' },
      { kind: 'brigade', at: 'EDV' },
    ],
    fed: {
      appetite: 0.5,
      jumpiness: 0.5,
      step: 2,
      belief: 40,
      will: 22,
      lines: [],
      headings: [
        { from: 'KLM', to: 'KLP', real: true },
        { from: 'WMS', to: 'VSY', real: false },
      ],
    },
    war: 1,
    treaty: 22,
    phone: null,
    pendingTest: null,
    log: [],
    ending: null,
    collision: '',
    headline: [],
    offer: null,
    moved: [],
    acts: [],
    signed: 0,
    waysOut: 0,
    crossed: {},
    pendingRound: 1,
    turnedAway: {},
    events: 0,
    phonesUsed: [],
    lastBacked: null,
    beliefWas: 40,
  } as unknown as GameState;

  it('carries the states, the promises with hold, the headings without their truth, and the pieces', () => {
    const v = viewFromState(base, (r) => r === 'VSY');
    expect(v.states).toEqual({ DRF: 'fighting', LTL: 'pressed' });
    expect(v.promises).toEqual([
      { region: 'VSY', solid: true },
      { region: 'LTL', solid: false },
    ]);
    expect(v.headings).toEqual([
      { from: 'KLM', to: 'KLP' },
      { from: 'WMS', to: 'VSY' },
    ]);
    expect(JSON.stringify(v)).not.toContain('real');
    expect(v.pieces).toEqual([
      { kind: 'fleet', at: 'LNK' },
      { kind: 'brigade', at: 'EDV' },
    ]);
    expect(v.tested).toBeNull();
    expect(v.pressed).toBeNull();
  });

  it('marks the tested place from the ringing phone or the carried test, and takes the finger from extras', () => {
    const ringing = {
      ...base,
      phase: 'phone',
      phone: { template: 't', caller: { name: 'n', role: 'r', tag: 't' }, text: '', advisers: { hawk: '', dove: '', intel: '' }, region: 'LTL', round: 1, options: [], kind: 'test-inherited' },
    } as unknown as GameState;
    expect(testedOf(ringing)).toBe('LTL');
    const summit = { ...ringing, phone: { ...ringing.phone!, kind: 'summit', region: 'LTL' } } as unknown as GameState;
    expect(testedOf(summit)).toBeNull();
    expect(testedOf({ ...base, pendingTest: 'VSY' } as GameState)).toBe('VSY');
    const v = viewFromState(ringing, () => true, { pressed: 'EDV', lifted: 'fleet' });
    expect(v.tested).toBe('LTL');
    expect(v.pressed).toBe('EDV');
    expect(v.lifted).toBe('fleet');
    expect(viewFromState(ringing, () => true, { tested: null }).tested).toBeNull();
  });

  it('knows when two views draw the same sheet', () => {
    const a = viewFromState(base, () => true);
    const b = viewFromState(base, () => true);
    expect(sameView(a, b)).toBe(true);
    expect(sameView(a, { ...b, pressed: 'EDV' })).toBe(false);
    expect(sameView(a, { ...b, states: { ...b.states, EDV: 'pressed' } })).toBe(false);
    expect(sameView(a, { ...b, promises: b.promises.map((p) => ({ ...p, solid: false })) })).toBe(false);
  });
});
