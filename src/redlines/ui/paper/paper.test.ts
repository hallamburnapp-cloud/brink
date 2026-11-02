import { describe, expect, it } from 'vitest';
import { REGION, REGIONS } from '../../../thirty/ui/map/data';
import { EMPTY_VIEW, MAP_WORDS, type PaperView } from './contract';
import { CALL_BAND, CALL_SHIFT, FRAME, boundsOf, callShiftFor, centreOf, computeGeometry, hitFrame, hitMap, regionAt, toFrame, toMap } from './geometry';
import { arrowEnds, defendPos, marksOf, piecePos, pinPos, ringGeom, ringSize, SHEET_FOOT, stampPos, testedPos } from './marks';
import { arrange, testRingGeom, type Arrangement, type Placed } from './arrange';
import { overlap } from './place';
import { inkBox, TEXT } from './text';
import { GLYPHS } from './metrics';
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
    // The pin sits on Kellmark, nudged a little toward Kelpmouth (the arrow carries the rest of the way).
    expect(Math.hypot(px - kx, py - ky)).toBeCloseTo(10);
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
    // Lantern Key's name is under the island, so WE DEFEND goes over it; Vessary's touches its own ring, in the sea above it rather than on Quillon's land.
    expect(defendPos(sheet.geom, 'LNK').y).toBeLessThan(sheet.geom.centre.LNK[1]);
    const v = defendPos(sheet.geom, 'VSY');
    const r = ringGeom(sheet.geom, 'VSY');
    expect(Math.hypot((v.x - r.cx) / r.rx, (v.y - 4 - r.cy) / r.ry)).toBeLessThan(1.8);
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

describe('the marks keep clear of the sheet (the critics\' collisions)', () => {
  const geomSheet = buildSheet(MAP_WORDS, 'pp');
  const G = geomSheet.geom;
  const overlapBox = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) =>
    Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const wordBox = (x: number, y: number, w = 58) => ({ x0: x - w / 2, y0: y - 11, x1: x + w / 2, y1: y + 2 });

  it('pulls a ring on the sheet\'s right edge in so it, its TESTED ring and WE DEFEND stay on the paper', () => {
    for (const id of ['BRK', 'ORN', 'TLM', 'QLN', 'VSY', 'ASK']) {
      const r = ringGeom(G, id);
      expect(r.cx + r.rx + 5).toBeLessThanOrEqual(386);
      expect(r.cx - r.rx - 5).toBeGreaterThanOrEqual(4);
      expect(r.rx).toBeGreaterThanOrEqual(18);
      const d = defendPos(G, id);
      expect(d.x + 29).toBeLessThanOrEqual(386);
      expect(d.x - 29).toBeGreaterThanOrEqual(4);
    }
  });

  it('writes WE DEFEND for two neighbouring islands apart, and never on a printed name or a bloc title', () => {
    const pairs: Array<[string, string]> = [
      ['GUL', 'DRF'],
      ['TRN', 'LNK'],
      ['PBB', 'SHL'],
    ];
    for (const [a, b] of pairs) {
      const view: PaperView = { ...EMPTY_VIEW, promises: [{ region: a, solid: false }, { region: b, solid: false }] };
      const m = marksOf(view, G, MAP_WORDS, 'pp');
      const words = m.hw.map((i) => /translate\(([-\d.]+) ([-\d.]+)\)/.exec(i.html)!).map((x) => wordBox(parseFloat(x[1]), parseFloat(x[2])));
      expect(words).toHaveLength(2);
      expect(overlapBox(words[0], words[1])).toBe(0);
      for (const w of words) {
        for (const id of Object.keys(G.shape)) expect(overlapBox(w, G.labelBox[id])).toBeLessThan(12);
        // The small Scatter title, printed in the water the bottom islands crowd, may be crossed a little; the others not.
        G.blocBoxes.forEach((bb, i) => expect(overlapBox(w, bb)).toBeLessThan(G.blocSmall[i] ? 200 : 12));
      }
    }
    // Saltwhite, on the bottom row, writes its word clear of FARSOUTH; Orrinth's TESTED clears THE SOUND.
    const slw = defendPos(G, 'SLW');
    for (const bb of G.blocBoxes) expect(overlapBox(wordBox(slw.x, slw.y), bb)).toBeLessThan(12);
    const orn = testedPos(G, 'ORN');
    for (const bb of G.blocBoxes) expect(overlapBox(wordBox(orn.x, orn.y, 50), bb)).toBeLessThan(12);
    expect(orn.x + 25).toBeLessThanOrEqual(386);
  });

  it('writes WE DEFEND for any one place clear of every printed name and (but for the small Scatter title) every bloc title', () => {
    for (const id of Object.keys(G.shape)) {
      const d = defendPos(G, id);
      const w = wordBox(d.x, d.y);
      for (const other of Object.keys(G.shape)) expect(overlapBox(w, G.labelBox[other]), `${id}'s word on ${other}'s name`).toBeLessThan(12);
      G.blocBoxes.forEach((bb, i) => expect(overlapBox(w, bb), `${id}'s word on a bloc title`).toBeLessThan(G.blocSmall[i] ? 200 : 12));
      expect(d.y).toBeLessThanOrEqual(SHEET_FOOT);
      expect(d.y - 11).toBeGreaterThanOrEqual(50);
    }
  });

  it('puts a counter where the printed name is not: under Morrow Downs, beside Pebbleby clear of PEBBLEBY', () => {
    const chit = (x: number, y: number) => ({ x0: x - 9, y0: y - 9, x1: x + 9, y1: y + 17 });
    const [mx, my] = piecePos(G, 'MRD');
    expect(overlapBox(chit(mx, my), G.labelBox.MRD)).toBe(0);
    const [px, py] = piecePos(G, 'PBB');
    expect(overlapBox(chit(px, py), G.labelBox.PBB)).toBe(0);
    expect(overlapBox(chit(px, py), G.labelBox.SHL)).toBe(0);
    // The brigade at Edda Vale stands on its own plate, beside its name.
    const [ex, ey] = piecePos(G, 'EDV', 'brigade');
    expect(G.regionAt(ex, ey)).toBe('EDV');
    expect(overlapBox(chit(ex, ey), G.labelBox.EDV)).toBe(0);
    expect(Math.hypot(ex - G.centre.EDV[0], ey - G.centre.EDV[1])).toBeLessThan(36);
  });

  it('steps a pin round an offset name (Northwake) and gives a heading to a next-door place a visible arrow', () => {
    const [px, py] = pinPos(G, 'NWK', 'VSY');
    expect(overlapBox({ x0: px - 6, y0: py - 6, x1: px + 6, y1: py + 7 }, G.labelBox.NWK)).toBe(0);
    for (const [from, to] of [
      ['LTL', 'TLM'],
      ['GUL', 'DRF'],
      ['TRN', 'LNK'],
      ['PBB', 'SHL'],
      ['GLM', 'DRF'],
      ['KLP', 'BRK'],
    ] as const) {
      const { start, end } = arrowEnds(G, from, to);
      expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeGreaterThanOrEqual(16);
    }
  });

  it('stamps neighbouring islands small and tilted apart, so two FIGHTING stamps never read as one', () => {
    const view: PaperView = { ...EMPTY_VIEW, states: { GUL: 'fighting', DRF: 'fighting' } };
    const m = marksOf(view, G, MAP_WORDS, 'pp');
    expect(m.stamp).toHaveLength(2);
    const a = stampPos(G, 'GUL');
    const b = stampPos(G, 'DRF');
    expect(a.scale).toBeLessThan(1);
    expect(a.rot).not.toBe(b.rot);
    expect(a.x + 26 * a.scale).toBeLessThan(b.x - 26 * b.scale);
    expect(stampPos(G, 'KLP').scale).toBe(1);
  });

  it('slides a tested place into the band under the handset on a call (callShiftFor)', () => {
    for (const id of Object.keys(G.shape)) {
      const c = centreOf(FRAME, id)!;
      const sh = callShiftFor(c);
      const x = c.x + sh.x;
      const y = c.y + sh.y;
      expect(Math.abs(y - CALL_BAND.y)).toBeLessThan(0.51);
      expect(x).toBeGreaterThanOrEqual(CALL_BAND.x0);
      expect(x).toBeLessThanOrEqual(CALL_BAND.x1);
    }
    expect(callShiftFor(null)).toEqual({ x: 0, y: CALL_SHIFT });
  });
});

describe('every mark keeps clear (the recheck\'s findings: real glyph boxes, every mark an obstacle for the next)', () => {
  const G = sheet.geom;
  const printed = (): Array<[string, { x0: number; y0: number; x1: number; y1: number }]> => [
    ...Object.entries(G.labelBox).map(([id, b]) => [`name:${id}`, b] as [string, typeof b]),
    ...G.blocBoxes.map((b, i) => [`bloc:${i}`, b] as [string, typeof b]),
    ...G.flagBoxes.map((b, i) => [`flag:${i}`, b] as [string, typeof b]),
  ];
  /** Every overlap in an arrangement: placed mark on printed word, and placed mark on placed mark (of another key). */
  function clashes(a: Arrangement, tolerance = 0.5): string[] {
    const out: string[] = [];
    const P: Placed[] = a.placed;
    for (let i = 0; i < P.length; i++) {
      for (const [n, b] of printed()) if (overlap(P[i].box, b) > tolerance) out.push(`${P[i].key} on ${n}`);
      for (let j = i + 1; j < P.length; j++) if (P[i].key !== P[j].key && overlap(P[i].box, P[j].box) > tolerance) out.push(`${P[i].key} on ${P[j].key}`);
    }
    return out;
  }
  const view = (v: Partial<PaperView>): PaperView => ({ ...EMPTY_VIEW, ...v });
  const insideRing = (r: { cx: number; cy: number; rx: number; ry: number }, b: { x0: number; y0: number; x1: number; y1: number }, grow = 3) => {
    for (const x of [b.x0, (b.x0 + b.x1) / 2, b.x1]) for (const y of [b.y0, (b.y0 + b.y1) / 2, b.y1]) if (Math.hypot((x - r.cx) / (r.rx + grow), (y - r.cy) / (r.ry + grow)) <= 1) return true;
    return false;
  };

  it('measures the faces from their real glyphs: the hand\'s capitals stand higher and hang lower than the print\'s', () => {
    expect(GLYPHS.hand.W[0]).toBeGreaterThan(0.5);
    const word = inkBox(TEXT.hand, 'WE DEFEND', 100, 100);
    expect(word.y0).toBeLessThan(100 - 7.5);
    expect(word.y1).toBeGreaterThan(100);
    expect(word.x1 - word.x0).toBeGreaterThan(50);
    const name = inkBox(TEXT.isle, 'Driftholm', 100, 100);
    expect(name.x1 - name.x0).toBeGreaterThan(38);
  });

  it('keeps TESTED on its own island when their pins start from it (E2E-WEEK-18 week 2: Driftholm pressed, tested, a foothold)', () => {
    const v = view({
      states: { DRF: 'pressed' },
      promises: [{ region: 'DRF', solid: false }, { region: 'VSY', solid: true }, { region: 'SHL', solid: false }],
      headings: [{ from: 'DRF', to: 'LNK' }, { from: 'DRF', to: 'GUL' }],
      pieces: [{ kind: 'fleet', at: 'TRN' }, { kind: 'brigade', at: 'EDV' }],
      tested: 'DRF',
      clocks: { DRF: 2 },
    });
    const a = arrange(v, G, MAP_WORDS);
    const r = testRingGeom(G, 'DRF');
    // The word's anchor inside its red ring (it was pushed out past Gullrest, two ring radii away), the pins still on the sheet.
    expect(Math.hypot((a.tested!.x - r.cx) / r.rx, (a.tested!.y - 4 - r.cy) / r.ry)).toBeLessThan(1);
    expect(a.pins.size).toBe(2);
    expect(clashes(a)).toEqual([]);
  });

  it('writes the inherited Driftholm promise\'s WE DEFEND clear of DRIFTHOLM and every other name (E2E-WEEK-18 week 1)', () => {
    const a = arrange(view({ promises: [{ region: 'DRF', solid: false }], headings: [{ from: 'GLM', to: 'DRF' }, { from: 'NWK', to: 'VSY' }], pieces: [{ kind: 'fleet', at: 'TRN' }, { kind: 'brigade', at: 'EDV' }] }), G, MAP_WORDS);
    expect(clashes(a)).toEqual([]);
    const words = a.placed.filter((p) => p.key === 'defend:DRF');
    for (const w of words) expect(overlap(w.box, G.labelBox.DRF)).toBe(0);
  });

  it('keeps the brigade at Quillon off the Vessary ring: a counter never stands inside or on another place\'s ring', () => {
    const a = arrange(view({ promises: [{ region: 'VSY', solid: true }, { region: 'DRF', solid: false }], pieces: [{ kind: 'fleet', at: 'TRN' }, { kind: 'brigade', at: 'QLN' }] }), G, MAP_WORDS);
    expect(clashes(a)).toEqual([]);
    const ring = ringGeom(G, 'VSY');
    for (const p of a.placed.filter((x) => x.key === 'piece:brigade')) expect(insideRing(ring, p.box, 0), `${p.kind} in the Vessary ring`).toBe(false);
    const at = a.pieces.get('brigade')!;
    expect(G.regionAt(at.x, at.y)).toBe('QLN');
  });

  it('writes TESTED off the fleet at a tested Pebbleby, and WE DEFEND off the brigade\'s label and THE SCATTER', () => {
    const a = arrange(
      view({
        states: { PBB: 'pressed', SHL: 'pressed', LNK: 'pressed' },
        promises: [{ region: 'PBB', solid: true }, { region: 'LNK', solid: true }, { region: 'DRF', solid: false }],
        pieces: [{ kind: 'fleet', at: 'PBB' }, { kind: 'brigade', at: 'MRD' }],
        headings: [{ from: 'SHL', to: 'TRN' }, { from: 'SHL', to: 'PBB' }],
        tested: 'PBB',
        clocks: { SHL: 1 },
      }),
      G,
      MAP_WORDS,
    );
    // The most crowded sheet the Scatter can hold: every box clear but for a graze inside a word's 1.4 px margin.
    expect(clashes(a, 2)).toEqual([]);
    expect(a.tested?.id).toBe('PBB');
    const tested = a.placed.filter((p) => p.key === 'tested:PBB');
    for (const p of a.placed.filter((x) => x.key === 'piece:fleet')) for (const t of tested) expect(overlap(p.box, t.box)).toBe(0);
    for (const p of a.placed.filter((x) => x.key === 'defend:PBB')) {
      for (const b of a.placed.filter((x) => x.key === 'piece:brigade')) expect(overlap(p.box, b.box)).toBe(0);
      expect(overlap(p.box, G.blocBoxes[4])).toBeLessThan(2);
    }
    // Each counter reads as standing at its own place, and the fleet is off every other place's ring.
    const fleet = a.pieces.get('fleet')!;
    expect(Math.hypot(fleet.x - G.centre.PBB[0], fleet.y - G.centre.PBB[1])).toBeLessThan(46);
    for (const id of ['LNK', 'DRF']) for (const p of a.placed.filter((x) => x.key === 'piece:fleet')) expect(insideRing(ringGeom(G, id), p.box, 0)).toBe(false);
  });

  it('stamps a collapsed Sound off its names and off THE SOUND, each stamp clear of the next', () => {
    const states: PaperView['states'] = { KLP: 'fighting', BRK: 'fighting', LTL: 'fighting', TLM: 'fighting', DNM: 'fighting', ORN: 'fighting' };
    const a = arrange(view({ states }), G, MAP_WORDS);
    expect(clashes(a)).toEqual([]);
    expect(a.stamps.size).toBe(6);
  });

  it('stands two pins from one place apart, each with its own arrow, and draws a hop between islands as a bowed arrow', () => {
    const a = arrange(view({ headings: [{ from: 'SHL', to: 'TRN' }, { from: 'SHL', to: 'PBB' }] }), G, MAP_WORDS);
    const [p, q] = [a.pins.get('SHL:TRN')!, a.pins.get('SHL:PBB')!];
    expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeGreaterThanOrEqual(12);
    expect(clashes(a)).toEqual([]);
    for (const [from, to] of [
      ['TRN', 'LNK'],
      ['PBB', 'SHL'],
      ['GUL', 'DRF'],
      ['LTL', 'TLM'],
    ] as const) {
      const { start, mid, end } = arrowEnds(G, from, to);
      const length = Math.hypot(mid[0] - start[0], mid[1] - start[1]) + Math.hypot(end[0] - mid[0], end[1] - mid[1]);
      expect(length, `${from} to ${to}`).toBeGreaterThanOrEqual(24);
    }
  });

  it('draws a pressed place\'s weeks left as ticks beside its hatching: three, two, one (ringed), clear of the names', () => {
    const v = view({ states: { VSY: 'pressed', KLP: 'pressed', GUL: 'pressed', DNM: 'fighting' }, clocks: { VSY: 3, KLP: 2, GUL: 1 } });
    const m = marksOf(v, G, MAP_WORDS, 'pp');
    expect(m.clock.map((i) => i.key).sort()).toEqual(['clock:GUL:1', 'clock:KLP:2', 'clock:VSY:3']);
    const ticks = (key: string) => (m.clock.find((i) => i.key === key)!.html.match(/class="pp-tick"/g) ?? []).length;
    expect(ticks('clock:VSY:3')).toBe(3);
    expect(ticks('clock:KLP:2')).toBe(2);
    expect(ticks('clock:GUL:1')).toBe(1);
    expect(m.clock.find((i) => i.key === 'clock:GUL:1')!.html).toContain('pp-tick-ring');
    const a = arrange(v, G, MAP_WORDS);
    expect(clashes(a)).toEqual([]);
    // A land place's ticks are on its own hatched plate; an island's in the water beside it.
    const vsy = a.clocks.get('VSY')!;
    expect(G.regionAt(vsy.x, vsy.y)).toBe('VSY');
    const gul = a.clocks.get('GUL')!;
    expect([null, 'GUL']).toContain(G.regionAt(gul.x, gul.y));
    // A place that is not pressed, or has no clock, draws none.
    expect(marksOf(view({ states: { VSY: 'fighting' }, clocks: { VSY: 2 } }), G, MAP_WORDS, 'pp').clock).toHaveLength(0);
  });

  it('keeps every mark clear on many seeded sheets (words, counters, pins, stamps and ticks; a counter on a fighting place aside)', () => {
    const g = rnd('arrange-fuzz');
    const ids = REGIONS.map((r) => r.id);
    const open = REGIONS.filter((r) => r.bloc !== 'CAP').map((r) => r.id);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(g.random() * xs.length)];
    let bad = 0;
    const runs = 60;
    for (let i = 0; i < runs; i++) {
      const states: PaperView['states'] = {};
      for (let k = 0; k < Math.floor(g.random() * 8); k++) states[pick(open)] = g.random() < 0.5 ? 'pressed' : 'fighting';
      const promises = [...new Set(Array.from({ length: Math.floor(g.random() * 4) }, () => pick(open)))].filter((r) => states[r] !== 'fighting').map((region) => ({ region, solid: g.random() < 0.5 }));
      const free = open.filter((r) => states[r] !== 'fighting');
      const pieces = [
        { kind: 'fleet' as const, at: pick(free) },
        { kind: 'brigade' as const, at: pick(free.filter((r) => !REGION[r].island)) },
      ];
      const clocks: Record<string, number> = {};
      for (const [r, st] of Object.entries(states)) if (st === 'pressed') clocks[r] = 1 + Math.floor(g.random() * 3);
      const v = view({ states, promises, pieces, headings: [{ from: pick(ids), to: pick(open) }, { from: pick(ids), to: pick(open) }].filter((h) => h.from !== h.to), tested: promises.length && g.random() < 0.5 ? promises[0].region : null, clocks });
      if (clashes(arrange(v, G, MAP_WORDS), 1.5).length) bad++;
    }
    expect(bad).toBeLessThanOrEqual(1);
  });

  it('rings the tested place five px wider than its promise', () => {
    const r = ringGeom(G, 'LTL');
    const t = testRingGeom(G, 'LTL');
    expect(t.rx - r.rx).toBe(5);
    expect(t.ry - r.ry).toBe(5);
  });
});
