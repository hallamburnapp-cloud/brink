import { describe, expect, it } from 'vitest';
import type { RegionView } from './contract';
import { REGIONS } from './data';
import type { MapViewPlus } from './extensions';
import { FxState } from './fx';
import { buildScene, changedRegions, joinKind, landSignature, threadWidth } from './scene';

function view(over: Partial<MapViewPlus> = {}, regions: Record<string, Partial<RegionView>> = {}): MapViewPlus {
  const base: Record<string, RegionView> = {};
  for (const r of REGIONS) {
    base[r.id] = {
      id: r.id,
      colour: r.colour,
      status: 'dark',
      pinned: false,
      airlift: false,
      capital: r.capital,
      port: r.port,
      stamp: null,
      brass: 0,
      glow: 0,
      ...regions[r.id],
    };
  }
  return {
    regions: base,
    threads: [],
    cables: [],
    joinedPins: [],
    flashpoint: null,
    ring: 0,
    gridlock: false,
    ferry: false,
    blackout: null,
    armed: null,
    highlight: null,
    finger: null,
    ...over,
  };
}

const lit = { status: 'lit' as const };
const pin = { status: 'lit' as const, pinned: true };

describe('scene', () => {
  it('maps statuses to plate states', () => {
    const s = buildScene(view({}, { LNK: pin, GUL: lit, EDV: { status: 'spent' }, DNM: { status: 'retired' } }), new FxState(), 0, false);
    expect(s.regions.LNK.fill).toBe('lit');
    expect(s.regions.GUL.fill).toBe('lit');
    expect(s.regions.EDV.fill).toBe('spent');
    expect(s.regions.DNM.fill).toBe('retired');
    expect(s.regions.NWK.fill).toBe('dark');
  });

  it('dims everything outside the scoring set during a sweep (lit to 30%, the rest to 55%)', () => {
    const fx = new FxState();
    fx.scoring = new Set(['LNK', 'SHL']);
    const s = buildScene(view({}, { LNK: pin, SHL: pin, GUL: lit }), fx, 1000, false);
    expect(s.sweeping).toBe(true);
    expect(s.regions.LNK.dim).toBe(1);
    expect(s.regions.GUL.dim).toBe(0.3);
    expect(s.regions.NWK.dim).toBe(0.55);
  });

  it('numbers the scoring pins west to east during a sweep and marks loose pins', () => {
    const fx = new FxState();
    fx.scoring = new Set(['TLM', 'LNK', 'SHL']);
    fx.scored.add('LNK');
    const s = buildScene(view({}, { TLM: pin, LNK: pin, SHL: pin, QLN: pin }), fx, 0, false);
    expect(s.regions.LNK.order).toBe(1);
    expect(s.regions.SHL.order).toBe(2);
    expect(s.regions.TLM.order).toBe(3);
    expect(s.regions.LNK.orderDone).toBe(true);
    expect(s.regions.SHL.orderDone).toBe(false);
    expect(s.regions.QLN.loose).toBe(true);
    expect(s.regions.QLN.order).toBeNull();
    expect(s.regions.LNK.fill).toBe('scored');
  });

  it('draws joins between pins as live threads, grey when an end is loose', () => {
    const v = view(
      {
        joinedPins: [
          ['GUL', 'LNK'],
          ['LNK', 'SHL'],
        ],
        threads: [
          { a: 'GUL', b: 'LNK', traffic: 4 },
          { a: 'EDV', b: 'MRD', traffic: 2 },
        ],
        loose: ['SHL'],
      },
      { GUL: pin, LNK: pin, SHL: pin },
    );
    const s = buildScene(v, new FxState(), 0, false);
    expect(s.live.map((t) => [t.a, t.b, t.grey])).toEqual([
      ['GUL', 'LNK', false],
      ['LNK', 'SHL', true],
    ]);
    expect(s.live[0].width).toBe(2.5);
    // A live pair is not drawn again as an old thread.
    expect(s.oldThreads.map((t) => `${t.a}-${t.b}`)).toEqual(['EDV-MRD']);
  });

  it('classifies joins: land, lane, cable, and ferry for anything else', () => {
    expect(joinKind('GUL', 'LNK', new Set())).toBe('land');
    expect(joinKind('NWK', 'VSY', new Set())).toBe('lane');
    expect(joinKind('EDV', 'TRN', new Set(['EDV|TRN']))).toBe('cable');
    expect(joinKind('NWK', 'FLE', new Set())).toBe('ferry');
  });

  it('widens threads with traffic (spec 1)', () => {
    expect([1, 2, 3, 5, 6, 9, 10, 40].map(threadWidth)).toEqual([1.5, 1.5, 2.5, 2.5, 3.5, 3.5, 4.5, 4.5]);
  });

  it('shows the cooled ring only once the crisis is cleared and the collapse is over', () => {
    const fx = new FxState();
    expect(buildScene(view({ flashpoint: 'TLM', ring: 0.4 }), fx, 0, false).cooled).toBe(false);
    fx.ring = { start: 0, dur: 300, from: 0.4, to: 0 };
    const mid = buildScene(view({ flashpoint: 'TLM', ring: 0 }), fx, 150, false);
    expect(mid.cooled).toBe(false);
    expect(mid.ring).toBeGreaterThan(0);
    fx.ring = null;
    expect(buildScene(view({ flashpoint: 'TLM', ring: 0 }), fx, 400, false).cooled).toBe(true);
  });

  it('repaints only the plates that changed, and everything when a table-wide input changes', () => {
    const fx = new FxState();
    const a = landSignature(buildScene(view({}, { LNK: pin }), fx, 0, false));
    fx.scored.add('LNK');
    const b = landSignature(buildScene(view({}, { LNK: pin }), fx, 0, false));
    expect(changedRegions(a, b)).toEqual(['LNK']);
    fx.scoring = new Set(['LNK']);
    const c = landSignature(buildScene(view({}, { LNK: pin }), fx, 0, false));
    expect(changedRegions(b, c)).toBeNull();
    expect(changedRegions(null, c)).toBeNull();
  });

  it('shows an ink spread’s old colour until it finishes', () => {
    const fx = new FxState();
    fx.inks.push({ source: 'KLM', targets: ['KLP'], colour: 'CAP', before: new Map([['KLP', 'SND']]), start: 0, dur: 600 });
    const v = view({}, { KLP: { colour: 'CAP' } });
    expect(buildScene(v, fx, 300, false).regions.KLP.colour).toBe('SND');
    fx.inks = [];
    expect(buildScene(v, fx, 700, false).regions.KLP.colour).toBe('CAP');
  });
});

describe('effect timeline', () => {
  it('resolves waits when they are due, and all of them on reset', async () => {
    const fx = new FxState();
    const order: string[] = [];
    void fx.wait(100).then(() => order.push('a'));
    void fx.wait(300).then(() => order.push('b'));
    fx.prune(150);
    await Promise.resolve();
    expect(order).toEqual(['a']);
    fx.reset();
    await Promise.resolve();
    expect(order).toEqual(['a', 'b']);
  });

  it('is busy while an effect runs and idle after', () => {
    const fx = new FxState();
    fx.flashes.push({ id: 'LNK', start: 0, dur: 200 });
    expect(fx.prune(100)).toBe(true);
    expect(fx.prune(250)).toBe(false);
    expect(fx.flashes).toHaveLength(0);
  });
});
