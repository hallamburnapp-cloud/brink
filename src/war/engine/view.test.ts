import { describe, expect, it } from 'vitest';
import { newRun, newSandbox, sweep, useOrder } from './run';
import { must, pinAll, tweak } from './testkit';
import { boardOf } from './run';
import { listCandidates } from './patterns';
import {
  actsOn,
  armedView,
  litHasJoin,
  mapFlags,
  patternExample,
  patternTable,
  pinChips,
  preview,
  ringFactor,
  seatViews,
  shopView,
  trayViews,
} from './view';

describe('views for the UI', () => {
  it('shrinks the flashpoint ring with the total (Example 1: 180 of 300 leaves 40%)', () => {
    const s = must(sweep(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL'])));
    expect(ringFactor(s)).toBeCloseTo(0.4, 5);
  });

  it('previews which seats will fire and how the pins join', () => {
    const s = pinAll(newSandbox('mid'), ['SHL', 'LTL', 'KLP']);
    const p = preview(s);
    expect(p.pattern).toBe('CHAIN');
    // West to east: Shoal (x 228), Lintel (290), Kelpmouth (298).
    expect(p.joins).toEqual([
      ['SHL', 'LTL'],
      ['LTL', 'KLP'],
    ]);
    // Harbourmaster (ports) and Hotline (3 joined) fire; the Strategist (4 joined) does not.
    expect(p.firingSeats).toEqual([0, 1]);
    expect(p.biggestGroup).toBe(3);
    expect(preview(s)).toBe(p); // cached per state
  });

  it('shows seats with chips, and what a Deputy copies', () => {
    const seats = seatViews(newSandbox('late'));
    expect(seats.map((x) => [x.id, x.chip])).toEqual([
      ['HERALD', 'all★'],
      ['GOVERNOR', '+5M★'],
      ['SIGNALS', '★×2'],
      ['DEPUTY', 'COPY'],
      ['SOVEREIGN', '★×2M'],
    ]);
    expect(seats[3].copies).toBe('SOVEREIGN');
    expect(seats[0]).toMatchObject({ name: 'Herald', object: 'paper crown', sell: 4, rarity: 'rare' });
  });

  it('lists the 11 patterns with secrets hidden until made', () => {
    const rows = patternTable(newSandbox('late'));
    expect(rows).toHaveLength(11);
    expect(rows.find((r) => r.id === 'NETWORK')).toMatchObject({ level: 6, influence: 245, momentum: 21 });
    expect(rows.filter((r) => r.hidden).map((r) => r.name)).toEqual(['???', '???']);
    const made = tweak(newRun('x'), (d) => (d.made.WHOLE_BLOC = 1));
    expect(patternTable(made).find((r) => r.id === 'WHOLE_BLOC')).toMatchObject({ name: 'WHOLE BLOC', hidden: false });
  });

  it('builds the Briefing cards with prices and reasons', () => {
    let s = must(sweep(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL'])));
    s = must(sweep(pinAll(s, ['NWK', 'FRM', 'WNM', 'WMS'])));
    const v = shopView(s)!;
    expect(v.offers.map((o) => [o!.name, o!.price, o!.reason])).toEqual([
      ['Duty Officer', 3, null],
      ['Harbourmaster', 4, null],
    ]);
    expect(v.offers[0]).toMatchObject({ kind: 'staff', rarity: 'common', object: 'desk lamp', rule: '+4 Momentum.' });
    expect(v.folder).toMatchObject({ kind: 'recruit', name: 'RECRUIT FOLDER', price: 4, status: 'sealed', reason: null });
    expect(v.folder.cards.map((c) => c.name)).toEqual(['Hotline Operator', 'Quartermaster', 'Courier']);
    expect(v.next).toMatchObject({ crisis: 'STANDOFF', target: 450n });
    const poor = shopView(tweak(s, (d) => (d.funds = 2)))!;
    expect(poor.offers[0]!.reason).toBe('Not enough Funds.');
    expect(poor.canReroll).toBe(false);
    expect(shopView(newRun('x'))).toBeNull();
  });

  it('shows tray papers and the armed Order', () => {
    const s = tweak(newRun('FIRST-NIGHT'), (d) => {
      d.tray = [
        { uid: 1, id: 'AIRLIFT' },
        { uid: 2, id: 'FORTIFY' },
      ];
      d.armed = { slot: 1, order: 'FORTIFY', chosen: [] };
    });
    expect(trayViews(s).map((p) => [p.name, p.armed, p.reason])).toEqual([
      ['AIRLIFT', false, null],
      ['FORTIFY', true, null],
    ]);
    expect(armedView(s)).toMatchObject({ order: 'FORTIFY', kind: 'tap', prompt: 'Tap up to 2 regions.' });
    const briefing = tweak(s, (d) => (d.phase = 'briefing'));
    expect(trayViews(briefing)[0].reason).toBe('AIRLIFT works only during a crisis.');
  });

  it('answers the map flags and the first-night hint checks', () => {
    const s = newRun('FIRST-NIGHT');
    expect(litHasJoin(s)).toBe(true);
    expect(mapFlags(s)).toEqual({ gridlock: false, ferry: false, blackout: null });
    expect(actsOn(s, { kind: 'staff', id: 'HARBOUR' })).toHaveLength(18);
    expect(actsOn(s, { kind: 'staff', id: 'GOVERNOR' })).toEqual(['WMS', 'EDV', 'LNK', 'TLM', 'MRM']);
    const cabled = must(useOrder(tweak(s, (d) => (d.tray = [{ uid: 1, id: 'CABLE' }])), 0, ['ICW', 'HRT']));
    expect(actsOn(cabled, { kind: 'staff', id: 'HARBOUR' })).toHaveLength(20);
  });
});

describe('what each pin will add, and example shapes', () => {
  it('gives each scoring pin its own share: the flashpoint scores twice, a loose pin has none', () => {
    const chips = pinChips(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL']))!;
    expect(chips.LNK).toEqual({ inf: 20n, momAdd: 0n, mults: [], passes: 2 });
    expect(chips.GUL).toEqual({ inf: 3n, momAdd: 0n, mults: [], passes: 1 });
    expect(chips.SHL).toEqual({ inf: 7n, momAdd: 0n, mults: [], passes: 1 });
    // A SINGLE of Edda Vale leaves Lantern Key loose: it has no chip at all.
    const single = pinChips(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'EDV']))!;
    expect(Object.keys(single)).toEqual(['EDV']);
    expect(pinChips(newRun('FIRST-NIGHT'))).toBeNull();
  });

  it('tells two picks of the same shape apart: the Courier and a RELAY stamp show on their pin', () => {
    const s = tweak(newRun('FIRST-NIGHT'), (d) => {
      d.staff = [{ uid: 1, id: 'COURIER', count: 0 }];
      d.world.stamps.GUL = 'RELAY';
    });
    const chips = pinChips(pinAll(s, ['LNK', 'GUL', 'SHL']))!;
    // Gullrest is first west to east: it scores twice, and its RELAY multiplies each time.
    expect(chips.GUL).toEqual({ inf: 6n, momAdd: 0n, mults: ['1.5', '1.5'], passes: 2 });
  });

  it('outlines a shape that really makes each public pattern on the starting map', () => {
    const s = newRun('FIRST-NIGHT');
    const board = boardOf(s);
    for (const id of ['SINGLE', 'LINK', 'TWO_LINKS', 'CHAIN', 'FRONT', 'NETWORK', 'BLOC', 'WORLDWIDE', 'SURROUND'] as const) {
      const ex = patternExample(s, id);
      expect(ex.length, id).toBeGreaterThan(0);
      expect(listCandidates(ex, board).map((c) => c.pattern), id).toContain(id);
    }
  });
});
