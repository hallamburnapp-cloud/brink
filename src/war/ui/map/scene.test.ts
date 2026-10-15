import { describe, expect, it } from 'vitest';
import type { MapView, RegionView } from './contract';
import { REGIONS } from './data';
import { FxState, TRAVEL_LINGER_MS } from './fx';
import { ownerTone, toneLuminance } from './palette';
import { buildScene, changedRegions, joinKind, landSignature, plateLevel } from './scene';

function view(over: Partial<MapView> = {}, regions: Record<string, Partial<RegionView>> = {}): MapView {
  const base: Record<string, RegionView> = {};
  for (const r of REGIONS) {
    base[r.id] = {
      id: r.id,
      colour: r.colour,
      owner: 'grey',
      lit: false,
      pinned: false,
      addable: false,
      joinable: false,
      capital: r.capital,
      port: r.port,
      preview: null,
      ...regions[r.id],
    };
  }
  return {
    regions: base,
    joinedPins: [],
    crisis: null,
    warNext: null,
    ceased: false,
    highlight: null,
    finger: null,
    hover: null,
    ...over,
  };
}

const lit = { lit: true, addable: true };
const pin = { lit: true, pinned: true };

describe('scene: ownership and the deal', () => {
  it('draws each region in its owner, and the deal as lit and in play', () => {
    const s = buildScene(view({}, { LNK: { owner: 'gold', ...lit }, DNM: { owner: 'red' }, SHL: lit }), new FxState(), 0, false);
    expect(s.regions.LNK.owner).toBe('gold');
    expect(s.regions.DNM.owner).toBe('red');
    expect(s.regions.SHL.owner).toBe('grey');
    expect(s.regions.SHL.live).toBe(true);
    expect(s.regions.LNK.live).toBe(true);
    expect(s.regions.DNM.live).toBe(false);
    expect(s.regions.NWK.lit).toBe(false);
  });

  it('drops a lit region that cannot be added to the dark plate at once', () => {
    const s = buildScene(view({}, { SHL: pin, LNK: lit, KLP: { lit: true, addable: false } }), new FxState(), 0, false);
    expect(s.regions.SHL.live).toBe(true);
    expect(s.regions.LNK.live).toBe(true);
    expect(s.regions.KLP.lit).toBe(true);
    expect(s.regions.KLP.live).toBe(false);
    // No tween: the change is in the very next frame's bake.
    expect(s.regions.KLP.dimNow).toBe(1);
  });

  it('keeps a region dark until its turn in the deal comes', () => {
    const fx = new FxState();
    fx.lightUps.set('GUL', { id: 'GUL', start: 500, dur: 150 });
    const v = view({}, { GUL: lit });
    expect(buildScene(v, fx, 100, false).regions.GUL.lit).toBe(false);
    const warming = buildScene(v, fx, 560, false).regions.GUL;
    expect(warming.lit).toBe(true);
    expect(warming.warm).toBeGreaterThan(0);
    expect(warming.warm).toBeLessThan(1);
  });

  it('breathes a joinable region, and the hovered one only when it can be added', () => {
    const v = view({ hover: 'GUL' }, { SHL: pin, LNK: { ...lit, joinable: true }, GUL: lit, KLP: { lit: true } });
    const s = buildScene(v, new FxState(), 0, false);
    expect(s.regions.LNK.joinable).toBe(true);
    expect(s.regions.GUL.joinable).toBe(true);
    expect(buildScene({ ...v, hover: 'KLP' }, new FxState(), 0, false).regions.KLP.joinable).toBe(false);
  });

  it('passes the outcome preview through while choosing, and hides it once the send plays', () => {
    const v = view({}, { SHL: { ...pin, preview: { kind: 'win', order: 1 } }, PBB: { ...pin, preview: { kind: 'win', order: 2 } } });
    const fx = new FxState();
    expect(buildScene(v, fx, 0, false).regions.PBB.preview).toEqual({ kind: 'win', order: 2 });
    fx.scoring = new Set(['SHL', 'PBB']);
    expect(buildScene(v, fx, 0, false).regions.PBB.preview).toBeNull();
  });
  it("keeps a miss's red hatch on the crisis while the send plays (it never reads as safe)", () => {
    const v = view({}, { SHL: { ...pin, preview: { kind: 'war', order: 1 } } });
    const fx = new FxState();
    fx.scoring = new Set(['SHL']);
    expect(buildScene(v, fx, 0, false).regions.SHL.preview).toEqual({ kind: 'war', order: 1 });
  });


  it('shows the three owners at three brightnesses, gold over grey over hatched red, lit and dark', () => {
    const v = view({}, { LNK: { owner: 'gold', ...lit }, SHL: lit, ORN: { owner: 'red', lit: true, addable: true }, WMS: { owner: 'gold' }, NWK: {}, FLE: { owner: 'red' } });
    const s = buildScene(v, new FxState(), 0, false);
    const L = (id: string) => toneLuminance(ownerTone(s.regions[id].owner, plateLevel(s.regions[id], s.rest), s.ceased));
    expect(L('LNK')).toBeGreaterThan(L('SHL'));
    expect(L('SHL')).toBeGreaterThan(L('ORN'));
    expect(L('WMS')).toBeGreaterThan(L('NWK'));
    expect(L('NWK')).toBeGreaterThan(L('FLE'));
  });

  it('draws the plain world at rest when no deal is on the table, and dark plates only beside a deal', () => {
    const rest = buildScene(view({}, { LNK: { owner: 'gold' } }), new FxState(), 0, false);
    expect(rest.rest).toBe(true);
    expect(plateLevel(rest.regions.SHL, rest.rest)).toBe('rest');
    const dealt = buildScene(view({ crisis: { id: 'SHL', target: '64', doubled: false } }, { SHL: lit }), new FxState(), 0, false);
    expect(dealt.rest).toBe(false);
    expect(plateLevel(dealt.regions.SHL, dealt.rest)).toBe('lit');
    expect(plateLevel(dealt.regions.NWK, dealt.rest)).toBe('dark');
    // Going to rest is a table-wide change: the whole land layer repaints.
    expect(changedRegions(landSignature(dealt), landSignature(rest))).toBeNull();
  });
});

describe('scene: the send', () => {
  it('dims everything outside the scoring set (lit to 30%, the rest of the world to 50%), but never gold', () => {
    const fx = new FxState();
    fx.scoring = new Set(['LNK', 'SHL']);
    const s = buildScene(view({}, { LNK: pin, SHL: pin, GUL: lit, DRF: { ...lit, owner: 'gold' }, WMS: { owner: 'gold' } }), fx, 1000, false);
    expect(s.sweeping).toBe(true);
    expect(s.regions.LNK.dim).toBe(1);
    expect(s.regions.GUL.dim).toBe(0.3);
    expect(s.regions.NWK.dim).toBe(0.5);
    expect(s.regions.DRF.dim).toBe(1);
    expect(s.regions.WMS.dim).toBe(1);
  });

  it('draws joins between pins as threads, dashed over sea lanes, each pair once', () => {
    const v = view(
      {
        joinedPins: [
          ['LNK', 'SHL'],
          ['SHL', 'LTL'],
          ['SHL', 'LNK'],
        ],
      },
      { LNK: pin, SHL: pin, LTL: pin },
    );
    const s = buildScene(v, new FxState(), 0, false);
    expect(s.threads.map((t) => [t.a, t.b, t.kind])).toEqual([
      ['LNK', 'SHL', 'land'],
      ['SHL', 'LTL', 'lane'],
    ]);
    expect(joinKind('MRM', 'PBB')).toBe('lane');
    expect(joinKind('GUL', 'LNK')).toBe('land');
  });

  it('carries the crisis ring, its ×2 stamp and its collapse', () => {
    const fx = new FxState();
    const v = view({ crisis: { id: 'SHL', target: '64', doubled: true } });
    const s = buildScene(v, fx, 0, false);
    expect(s.ring).toMatchObject({ id: 'SHL', target: '64', doubled: true, stamp: null, collapse: null });
    fx.ringStamp = { start: 0, dur: 300 };
    fx.ringCollapse = { start: 0, dur: 300, crisis: 'SHL' };
    const mid = buildScene(v, fx, 150, false).ring!;
    expect(mid.stamp).toBeCloseTo(0.5);
    expect(mid.collapse).toBeCloseTo(0.5);
    // A collapse on another region does not touch this ring.
    fx.ringCollapse = { start: 0, dur: 300, crisis: 'LTL' };
    expect(buildScene(v, fx, 150, false).ring!.collapse).toBeNull();
    expect(buildScene(view(), fx, 0, false).ring).toBeNull();
  });
});

describe('scene: ownership changes', () => {
  it('shows an ink spread’s old owner until it finishes', () => {
    const fx = new FxState();
    fx.inks.push({ source: 'SHL', targets: ['SHL'], owner: 'gold', before: new Map([['SHL', 'grey']]), start: 0, dur: 600 });
    const v = view({}, { SHL: { owner: 'gold' } });
    expect(buildScene(v, fx, 300, false).regions.SHL.owner).toBe('grey');
    fx.inks = [];
    expect(buildScene(v, fx, 700, false).regions.SHL.owner).toBe('gold');
  });

  it('keeps an ink’s owner after it ends until the view catches up', () => {
    const fx = new FxState();
    fx.ownerOverride.set('MRM', { owner: 'red', before: 'grey' });
    expect(buildScene(view(), fx, 0, false).regions.MRM.owner).toBe('red');
  });

  it('stops the war where it stands on a ceasefire', () => {
    expect(buildScene(view({ ceased: true }, { ORN: { owner: 'red' } }), new FxState(), 0, false).ceased).toBe(true);
  });
});

describe('land layer signature', () => {
  it('repaints only the plates that changed on a tap, and everything when ownership or dims change', () => {
    const fx = new FxState();
    const a = landSignature(buildScene(view({}, { LNK: lit, SHL: lit }), fx, 0, false));
    const b = landSignature(buildScene(view({}, { LNK: pin, SHL: { lit: true, addable: false } }), fx, 0, false));
    expect(changedRegions(a, b)).toEqual(['SHL']);
    const c = landSignature(buildScene(view({}, { LNK: pin, SHL: { lit: true, addable: false, owner: 'gold' } }), fx, 0, false));
    expect(changedRegions(b, c)).toBeNull();
    fx.scoring = new Set(['LNK']);
    const d = landSignature(buildScene(view({}, { LNK: pin }), fx, 0, false));
    expect(changedRegions(b, d)).toBeNull();
    expect(changedRegions(null, d)).toBeNull();
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

  it('keeps a finished ink fully flooded for a moment, so the plate never flickers back', () => {
    const fx = new FxState();
    fx.inks.push({ source: 'SHL', targets: ['SHL'], owner: 'gold', before: new Map([['SHL', 'grey']]), start: 0, dur: 600 });
    fx.prune(650);
    expect(fx.inks).toHaveLength(1);
    fx.prune(720);
    expect(fx.inks).toHaveLength(0);
  });

  it('runs a travel for one step per join, then lets its lit path linger and fade', () => {
    const fx = new FxState();
    fx.travels.push({ path: ['LTL', 'DNM', 'ORN'], colour: 'gold', stepMs: 150, start: 0, dur: 300 });
    expect(fx.prune(299)).toBe(true);
    fx.prune(300 + TRAVEL_LINGER_MS - 1);
    expect(fx.travels).toHaveLength(1);
    fx.prune(300 + TRAVEL_LINGER_MS + 1);
    expect(fx.travels).toHaveLength(0);
  });
});
