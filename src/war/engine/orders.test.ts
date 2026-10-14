import { describe, expect, it } from 'vitest';
import type { OrderId } from '../content/orders';
import {
  armOrder,
  canConfirmArmed,
  confirmArmed,
  disarm,
  newRun,
  nextCrisis,
  pin,
  sellPaper,
  swap,
  sweep,
  tapArmed,
  unpin,
  useOrder,
} from './run';
import { validTargets } from './orders';
import { must, pinAll, tweak } from './testkit';
import type { RunState } from './types';
import { armedView, isCapital, isPort, preview, regionViews } from './view';

/** The first night's opening deal with these papers in the tray. */
function withPapers(...ids: OrderId[]): RunState {
  return tweak(newRun('FIRST-NIGHT'), (d) => {
    d.tray = ids.map((id, i) => ({ uid: 500 + i, id }));
  });
}

/** The same, standing in a Briefing (after clearing crisis 1). */
function briefingWith(...ids: OrderId[]): RunState {
  let s = withPapers(...ids);
  s = must(sweep(pinAll(s, ['LNK', 'GUL', 'SHL'])));
  s = must(sweep(pinAll(s, ['NWK', 'FRM', 'WNM', 'WMS'])));
  expect(s.phase).toBe('briefing');
  return s;
}

describe('Orders', () => {
  it('FORTIFY stamps up to 2 regions: +20 Influence each time they score', () => {
    const s = must(useOrder(withPapers('FORTIFY'), 0, ['GUL', 'SHL']));
    expect(s.tray).toEqual([]);
    expect(s.world.stamps).toEqual({ GUL: 'FORTIFY', SHL: 'FORTIFY' });
    // Chain 180 becomes (60 + 40) x 3.
    expect(preview(pinAll(s, ['LNK', 'GUL', 'SHL'])).leverage).toBe(300n);
    expect(useOrder(withPapers('FORTIFY'), 0, [])).toMatchObject({ ok: false, reason: 'Choose a region.' });
    expect(useOrder(withPapers('FORTIFY'), 0, ['GUL', 'SHL', 'LNK'])).toMatchObject({ ok: false, reason: 'At most 2 regions.' });
  });

  it('RELAY: x1.5 Momentum when it scores; ECHO: it scores twice; a new stamp replaces the old', () => {
    const relay = must(useOrder(withPapers('RELAY'), 0, ['GUL']));
    expect(preview(pinAll(relay, ['LNK', 'GUL', 'SHL'])).leverage).toBe(270n); // 60 x 4.5
    const echo = must(useOrder(withPapers('ECHO'), 0, ['GUL']));
    expect(preview(pinAll(echo, ['LNK', 'GUL', 'SHL'])).leverage).toBe(189n); // 63 x 3
    const both = must(useOrder(must(useOrder(withPapers('RELAY', 'ECHO'), 0, ['GUL'])), 0, ['GUL']));
    expect(both.world.stamps).toEqual({ GUL: 'ECHO' });
    expect(useOrder(both, 0, ['GUL'])).toMatchObject({ ok: false });
    expect(regionViews(both).GUL.stamp).toBe('ECHO');
  });

  it('LAY CABLE joins two unjoined regions for good, and both become Ports', () => {
    const s0 = withPapers('CABLE', 'CABLE');
    expect(useOrder(s0, 0, ['LNK', 'GUL'])).toMatchObject({ ok: false, reason: 'Those two are already joined.' });
    expect(useOrder(s0, 0, ['NWK', 'VSY'])).toMatchObject({ ok: false, reason: 'Those two are already joined.' });
    const s = must(useOrder(s0, 0, ['LNK', 'EDV']));
    expect(s.world.cables).toEqual([['LNK', 'EDV']]);
    expect(isPort(s, 'LNK')).toBe(true);
    expect(isPort(s, 'EDV')).toBe(true);
    const p = preview(pinAll(s, ['LNK', 'EDV']));
    expect(p.pattern).toBe('LINK');
    expect(p.joins).toEqual([['EDV', 'LNK']]);
  });

  it('DEFECT: a source, then up to 2 regions that take its colour', () => {
    const s0 = withPapers('DEFECT');
    expect(useOrder(s0, 0, ['LNK'])).toMatchObject({ ok: false, reason: 'Choose 2 regions.' });
    expect(useOrder(s0, 0, ['LNK', 'GUL'])).toMatchObject({ ok: false, reason: 'Already that colour.' });
    const s = must(useOrder(s0, 0, ['LNK', 'EDV', 'QLN']));
    expect(s.world.colour.EDV).toBe('SCT');
    expect(s.world.colour.QLN).toBe('SCT');
    expect(s.world.colour.LNK).toBe('SCT');
    expect(regionViews(s).EDV.colour).toBe('SCT');
  });

  it('PROMOTE makes a Capital (weight unchanged)', () => {
    const s0 = withPapers('PROMOTE');
    expect(useOrder(s0, 0, ['LNK'])).toMatchObject({ ok: false, reason: 'Already a Capital.' });
    const s = must(useOrder(s0, 0, ['GUL']));
    expect(isCapital(s, 'GUL')).toBe(true);
    expect(s.world.promoted).toEqual(['GUL']);
    expect(regionViews(s).GUL.capital).toBe(true);
  });

  it('RETIRE takes up to 2 regions out of the deck for the run, refilling the hand mid-crisis', () => {
    const s0 = withPapers('RETIRE');
    expect(useOrder(s0, 0, ['LNK'])).toMatchObject({ ok: false, reason: "The flashpoint can't be retired mid-crisis." });
    expect(useOrder(pinAll(s0, ['ICW']), 0, ['ICW'])).toMatchObject({ ok: false, reason: 'Lift that pin first.' });
    const s = must(useOrder(s0, 0, ['ICW', 'KLM']));
    expect(s.world.retired).toEqual(['ICW', 'KLM']);
    expect(s.crisis.lit).toEqual(['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'HRT', 'FRM']);
    expect(s.crisis.pile).not.toContain('KLM');
    expect(regionViews(s).ICW.status).toBe('retired');
    expect(pin(s, 'ICW')).toMatchObject({ ok: false, reason: 'That region is retired.' });
    // Never dealt again.
    let next = must(sweep(pinAll(s, ['LNK', 'GUL', 'SHL'])));
    next = must(sweep(pinAll(next, ['NWK', 'FRM', 'EDV', 'QLN'])));
    if (next.phase === 'briefing') {
      const c = must(nextCrisis(next)).crisis;
      expect([...c.lit, ...c.pile]).not.toContain('ICW');
      expect(c.lit.length + c.pile.length).toBe(28);
    }
  });

  it('RETIRE never takes the map below 12 regions', () => {
    const s0 = tweak(withPapers('RETIRE'), (d) => {
      d.world.retired = ['BRK', 'DNM', 'ORN', 'FLE', 'SLW', 'HRT', 'BRN', 'ASK', 'MRD', 'VSY', 'RMH', 'KLM', 'GLM', 'TLM', 'LTL', 'KLP', 'PBB'];
    });
    // 13 left: one more may go, not two.
    expect(useOrder(s0, 0, ['MRM', 'WNM'])).toMatchObject({ ok: false, reason: 'The map needs at least 12 regions.' });
    const twelve = must(useOrder(s0, 0, ['MRM']));
    expect(30 - twelve.world.retired.length).toBe(12);
  });

  it('AIRLIFT pins one unlit region during a crisis; it counts towards the 5 and is spent after the sweep', () => {
    const s0 = withPapers('AIRLIFT');
    expect(useOrder(s0, 0, ['GUL'])).toMatchObject({ ok: false, reason: 'It is lit: just pin it.' });
    const s = must(useOrder(pinAll(s0, ['LNK', 'GUL', 'SHL']), 0, ['PBB']));
    expect(s.crisis.pins).toEqual(['LNK', 'GUL', 'SHL', 'PBB']);
    expect(s.crisis.airlift).toBe('PBB');
    expect(s.crisis.pile).not.toContain('PBB');
    expect(regionViews(s).PBB).toMatchObject({ status: 'dark', pinned: true, airlift: true });
    // GUL LNK PBB SHL: a FRONT on the causeways.
    const p = preview(s);
    expect(p.pattern).toBe('FRONT');
    // It counts towards the 5.
    const full = pinAll(s, ['EDV']);
    expect(pin(full, 'QLN')).toMatchObject({ ok: false, reason: 'Five pins is the limit.' });
    const swept = must(sweep(s));
    expect(swept.crisis.spent).toContain('PBB');
    expect(swept.crisis.airlift).toBeNull();
    expect(swept.tray).toEqual([]);
  });

  it('AIRLIFT: lifting the pin returns the paper; a swap keeps it; only during a crisis', () => {
    const s = must(useOrder(withPapers('AIRLIFT'), 0, ['PBB']));
    const lifted = must(unpin(s, 'PBB'));
    expect(lifted.tray.map((p) => p.id)).toEqual(['AIRLIFT']);
    expect(lifted.crisis.airlift).toBeNull();
    expect(lifted.crisis.pile).toContain('PBB');
    const swapped = must(swap(pinAll(s, ['ICW'])));
    expect(swapped.crisis.pins).toEqual(['PBB']);
    expect(swap(s)).toMatchObject({ ok: false, reason: 'Select lit regions to swap.' });
    const b = briefingWith('AIRLIFT');
    expect(armOrder(b, 0)).toMatchObject({ ok: false, reason: 'AIRLIFT works only during a crisis.' });
    expect(useOrder(b, 0, ['PBB'])).toMatchObject({ ok: false, reason: 'AIRLIFT works only during a crisis.' });
    // A second Airlift in the same sweep is refused.
    const second = tweak(s, (d) => d.tray.push({ uid: 900, id: 'AIRLIFT' }));
    expect(useOrder(second, 0, ['MRM'])).toMatchObject({ ok: false, reason: 'One Airlift per sweep.' });
  });

  it('works in the Briefing too, and is permanent', () => {
    const b = must(useOrder(briefingWith('FORTIFY'), 0, ['TLM']));
    const next = must(nextCrisis(b));
    expect(next.world.stamps.TLM).toBe('FORTIFY');
  });
});

describe('arming an Order', () => {
  it('arms, shows valid targets, and applies itself on the last target', () => {
    const s = must(armOrder(withPapers('RELAY'), 0));
    const v = armedView(s)!;
    expect(v).toMatchObject({ order: 'RELAY', kind: 'tap', chosen: [], canConfirm: false, prompt: 'Tap a region.' });
    expect(v.valid).toHaveLength(30);
    const done = must(tapArmed(s, 'GUL'));
    expect(done.armed).toBeNull();
    expect(done.world.stamps.GUL).toBe('RELAY');
    expect(done.tray).toEqual([]);
  });

  it('confirms an up-to-2 Order early, toggles a chosen target off, and disarms', () => {
    let s = must(armOrder(withPapers('FORTIFY'), 0));
    s = must(tapArmed(s, 'GUL'));
    expect(armedView(s)).toMatchObject({ chosen: ['GUL'], canConfirm: true });
    expect(canConfirmArmed(s)).toBe(true);
    const untapped = must(tapArmed(s, 'GUL'));
    expect(untapped.armed!.chosen).toEqual([]);
    expect(confirmArmed(untapped)).toMatchObject({ ok: false, reason: 'Choose a region.' });
    const done = must(confirmArmed(s));
    expect(done.world.stamps).toEqual({ GUL: 'FORTIFY' });
    expect(must(disarm(s)).armed).toBeNull();
    // Tapping the armed slot again disarms it.
    expect(must(armOrder(s, 0)).armed).toBeNull();
  });

  it('DEFECT: un-choosing the source starts over; CABLE is a drag', () => {
    let s = must(armOrder(withPapers('DEFECT', 'CABLE'), 0));
    s = must(tapArmed(s, 'LNK'));
    expect(armedView(s)!.valid).not.toContain('GUL'); // already that colour
    s = must(tapArmed(s, 'EDV'));
    expect(must(tapArmed(s, 'LNK')).armed!.chosen).toEqual([]);
    const cable = must(armOrder(s, 1));
    expect(armedView(cable)).toMatchObject({ order: 'CABLE', kind: 'drag' });
    const half = must(tapArmed(cable, 'LNK'));
    expect(validTargets(half, 'CABLE', ['LNK'])).not.toContain('GUL');
    expect(must(tapArmed(half, 'EDV')).world.cables).toEqual([['LNK', 'EDV']]);
  });

  it('selling an armed paper disarms it', () => {
    const s = must(armOrder(withPapers('ECHO'), 0));
    const sold = must(sellPaper(s, 0));
    expect(sold.armed).toBeNull();
    expect(sold.funds).toBe(6);
  });
});
