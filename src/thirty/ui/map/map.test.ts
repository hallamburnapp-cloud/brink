import { describe, expect, it } from 'vitest';
import { ISLAND_R, MAP_H, MAP_W, REGION, REGIONS } from './data';
import { FxState, schedule } from './fx';
import { computeGeometry, hitTest, regionAt } from './geometry';
import { LABEL_H, placeLabels, ringRadius } from './layers/marks';
import { CALM, CRISIS, heatTone, luminance, TENSE, WAR } from './palette';

describe('the map data, fitted to 390 x 400', () => {
  it('keeps every region inside the map', () => {
    expect(REGIONS).toHaveLength(30);
    for (const r of REGIONS) {
      expect(r.x).toBeGreaterThan(0);
      expect(r.x).toBeLessThan(MAP_W);
      expect(r.y).toBeGreaterThan(0);
      expect(r.y).toBeLessThan(MAP_H);
    }
    expect(ISLAND_R).toBeGreaterThan(15);
    expect(ISLAND_R).toBeLessThan(24);
  });

  it('knows the home capital', () => {
    expect(REGION.EDV.capital).toBe(true);
    expect(REGION.EDV.bloc).toBe('HMR');
  });
});

describe('the geometry', () => {
  const geo = computeGeometry();

  it('gives every region a plate and a hit area', () => {
    const seen = new Set<string>();
    for (let i = 0; i < geo.mask.length; i++) if (geo.mask[i]) seen.add(REGIONS[geo.mask[i] - 1].id);
    expect(seen.size).toBe(30);
    for (const r of REGIONS) expect(regionAt(geo, r.x, r.y)).toBe(r.id);
  });

  it('prefers the targets on a border, and returns null on the open sea', () => {
    const edv = REGION.EDV;
    expect(hitTest(geo, edv.x, edv.y, new Set(['EDV']))).toBe('EDV');
    expect(hitTest(geo, -5, -5, new Set())).toBeNull();
    // Far from any island or coast: the sea between the Scatter's columns is not open, so use a corner.
    expect(regionAt(geo, 2, MAP_H - 2)).toBeNull();
  });
});

describe('the four heats', () => {
  it('are distinct, TENSE the brightest, WAR the only hatched one', () => {
    const l = [CALM, TENSE, CRISIS, WAR].map(luminance);
    expect(new Set(l.map((v) => v.toFixed(3))).size).toBe(4);
    expect(l[1]).toBeGreaterThan(l[2]);
    expect(l[2]).toBeGreaterThan(l[0]);
    expect(heatTone(3).hatch).not.toBeNull();
    expect(heatTone(0).hatch).toBeNull();
    expect(heatTone(1).hatch).toBeNull();
    expect(heatTone(2).hatch).toBeNull();
  });
});

describe('the recolouring timeline', () => {
  it('spreads the steps over the time given, the last ending on time', () => {
    expect(schedule(0, 600)).toEqual([]);
    expect(schedule(1, 600)).toEqual([{ offset: 0, dur: 600 }]);
    const plan = schedule(4, 600);
    expect(plan[0].offset).toBe(0);
    const last = plan[plan.length - 1];
    expect(last.offset + last.dur).toBeCloseTo(600);
    for (let i = 1; i < plan.length; i++) expect(plan[i].offset).toBeGreaterThan(plan[i - 1].offset);
  });

  it('settles each change into the map when it ends, a later change on the same region taking over', () => {
    const fx = new FxState();
    const settled: Record<string, 0 | 1 | 2 | 3> = { SHL: 2, LTL: 0 };
    fx.transitions.push({ region: 'SHL', from: 2, to: 1, source: null, start: 0, dur: 300, begun: false });
    fx.transitions.push({ region: 'SHL', from: 1, to: 0, source: null, start: 150, dur: 300, begun: false });
    fx.transitions.push({ region: 'LTL', from: 0, to: 1, source: 'SHL', start: 200, dur: 300, begun: false });
    expect(fx.prune(0, settled)).toBe(true);
    expect(settled.SHL).toBe(2);
    expect(fx.baseHeat('LTL', settled)).toBe(0);
    // The second SHL change begins: the first gives way at once.
    fx.prune(160, settled);
    expect(settled.SHL).toBe(1);
    fx.prune(460, settled);
    expect(settled.SHL).toBe(0);
    expect(settled.LTL).toBe(0);
    expect(fx.prune(520, settled)).toBe(false);
    expect(settled.LTL).toBe(1);
  });

  it('resolves its waiters when the time comes, and on reset', async () => {
    const fx = new FxState();
    const settled: Record<string, 0 | 1 | 2 | 3> = { SHL: 0 };
    let done = 0;
    void fx.wait(100).then(() => done++);
    fx.prune(50, settled);
    await Promise.resolve();
    expect(done).toBe(0);
    fx.prune(100, settled);
    await Promise.resolve();
    expect(done).toBe(1);
    void fx.wait(1000).then(() => done++);
    fx.transitions.push({ region: 'SHL', from: 0, to: 3, source: null, start: 0, dur: 500, begun: true });
    fx.reset(settled);
    await Promise.resolve();
    expect(done).toBe(2);
    expect(settled.SHL).toBe(3);
  });
});

describe('the labels on the map', () => {
  const measure = (s: string) => s.length * 5.5;

  it('sit under their region, on the map, and never on one another', () => {
    const labels = placeLabels(
      [
        { id: 'SHL', text: 'Calms the strait', target: true },
        { id: 'LTL', text: 'Warns Lintel off · heats Dunmarrow', target: true },
        { id: 'PBB', text: 'Guards Pebbleby', target: true },
        { id: 'ICW', text: 'ICEWARD', target: false },
      ],
      measure,
    );
    expect(labels).toHaveLength(4);
    for (const l of labels) {
      expect(l.x - l.w / 2).toBeGreaterThanOrEqual(0);
      expect(l.x + l.w / 2).toBeLessThanOrEqual(MAP_W);
      expect(l.y - LABEL_H / 2).toBeGreaterThanOrEqual(0);
      expect(l.y + LABEL_H / 2).toBeLessThanOrEqual(MAP_H);
    }
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= LABEL_H;
        expect(apart).toBe(true);
      }
    }
    // Iceward sits near the bottom edge: its label goes above the ring.
    const icw = labels.find((l) => l.id === 'ICW')!;
    expect(icw.y).toBeLessThan(REGION.ICW.y);
  });

  it('rings hug their region and stay on the map', () => {
    for (const r of REGIONS) {
      const rad = ringRadius(r.id);
      expect(rad).toBeGreaterThanOrEqual(12);
      expect(r.x - rad).toBeGreaterThanOrEqual(0);
      expect(r.x + rad).toBeLessThanOrEqual(MAP_W);
      expect(r.y + rad).toBeLessThanOrEqual(MAP_H);
    }
  });
});
