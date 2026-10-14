import { describe, expect, it } from 'vitest';
import { REGION_IDS, joinKey } from '../content/map';
import { canonical, hashState, hashTrace } from './hash';
import { clockOf, hourTargets } from './hours';
import {
  FIRST_NIGHT_PILE,
  armOrder,
  buyFolder,
  buyOffer,
  clearPins,
  confirmArmed,
  keepGoing,
  moveSeat,
  newRun,
  newSandbox,
  nextCrisis,
  pickFromFolder,
  pin,
  reroll,
  sellPaper,
  sellStaff,
  swap,
  sweep,
  tapArmed,
  twistInForce,
  unpin,
  useOrder,
} from './run';
import { bestPins, greedySweep, must, pinAll, tweak } from './testkit';
import type { Result, RunState, TraceEvent } from './types';
import { boardLabels, endLabels, nextCrisisInfo, preview, regionViews, threadViews } from './view';

describe('Example 1 through the state machine (seed FIRST-NIGHT)', () => {
  it('deals the scripted first crisis', () => {
    const s = newRun('FIRST-NIGHT');
    expect(s.firstNight).toBe(true);
    expect(s.phase).toBe('crisis');
    expect(s.crisis.flashpoint).toBe('LNK');
    expect(s.crisis.lit).toEqual(['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT']);
    expect(s.crisis.pile.slice(0, 3)).toEqual(['FRM', 'WNM', 'WMS']);
    expect(s.crisis.pile).toHaveLength(22);
    expect(new Set([...s.crisis.lit, ...s.crisis.pile])).toEqual(new Set(REGION_IDS));
    expect(boardLabels(s)).toMatchObject({ clock: '22:00', crisis: 'FLARE-UP', target: 300n, sweepsLeft: 4, swapsLeft: 3, funds: 5 });
    expect(boardLabels(s).summitChip).toBe('SUMMIT: GRIDLOCK');
    expect(FIRST_NIGHT_PILE).toHaveLength(11);
  });

  it('plays Chain 180, then Front 272: 452 cleared, Funds 11, brass pin on Wintermast', () => {
    let s = newRun('FIRST-NIGHT');
    s = pinAll(s, ['LNK', 'GUL', 'SHL']);
    const p1 = preview(s);
    expect([p1.name, p1.level, p1.influence, p1.m10, p1.clears]).toEqual(['CHAIN', 1, 30n, 30n, false]);
    expect(p1.sweepOrder).toEqual({ GUL: 1, LNK: 2, SHL: 3 });
    s = must(sweep(s));
    expect(s.lastSweep!.leverage).toBe(180n);
    expect(s.crisis.total).toBe(180n);
    expect(s.crisis.lit).toEqual(['EDV', 'QLN', 'NWK', 'ICW', 'HRT', 'FRM', 'WNM', 'WMS']);
    expect(s.crisis.spent).toEqual(['LNK', 'GUL', 'SHL']);
    expect(s.crisis.sweepsLeft).toBe(3);

    s = pinAll(s, ['NWK', 'FRM', 'WNM', 'WMS']);
    const p2 = preview(s);
    expect([p2.name, p2.influence, p2.m10, p2.clears]).toEqual(['FRONT', 45n, 40n, true]);
    s = must(sweep(s));
    expect(s.lastSweep!.leverage).toBe(272n);
    expect(s.lastSweep!.pattern).toBe('FRONT');
    expect(s.crisis.total).toBe(452n);
    expect(s.crisis.cleared).toBe(true);
    expect(s.funds).toBe(11);
    expect(s.lastClear).toMatchObject({ reward: 3, unusedSweeps: 2, interest: 1, overwhelm: 0, payout: 6, brass: 'WMS' });
    expect(s.world.brass).toEqual({ WMS: 1 });
    expect(s.phase).toBe('briefing');
    // The six threads used so far carry traffic 1: two in the Chain, four in the Front.
    expect(threadViews(s).map((t) => joinKey(t.a, t.b)).sort()).toEqual(
      [
        ['GUL', 'LNK'],
        ['LNK', 'SHL'],
        ['NWK', 'FRM'],
        ['NWK', 'WNM'],
        ['FRM', 'WNM'],
        ['FRM', 'WMS'],
      ]
        .map(([a, b]) => joinKey(a, b))
        .sort(),
    );
    expect(s.best).toMatchObject({ leverage: 272n, pattern: 'FRONT' });
    expect(s.log).toHaveLength(1);
    expect(s.log[0]).toMatchObject({ kind: 'FLARE_UP', total: 452n, cleared: true, sweepsUsed: 2 });
  });

  it('opens the fixed first Briefing', () => {
    let s = newRun('FIRST-NIGHT');
    s = must(sweep(pinAll(s, ['LNK', 'GUL', 'SHL'])));
    s = must(sweep(pinAll(s, ['NWK', 'FRM', 'WNM', 'WMS'])));
    expect(s.shop).toEqual({
      briefing: 1,
      offers: [
        { kind: 'staff', id: 'DUTY', price: 3 },
        { kind: 'staff', id: 'HARBOUR', price: 4 },
      ],
      folder: { kind: 'recruit', price: 4, contents: ['HOTLINE', 'QM', 'COURIER'], status: 'sealed' },
      rerollCost: 4,
    });
    expect(nextCrisisInfo(s)).toMatchObject({ crisis: 'STANDOFF', target: 450n });
  });
});

describe('the sandboxes', () => {
  it('MID SHIFT: 10,920 clears 9,000; seats 2 and 3 swapped 8,736; no staff 2,556', () => {
    const s0 = newSandbox('mid');
    expect(boardLabels(s0)).toMatchObject({ clock: '01:00', hour: '01:00', crisis: 'STANDOFF', crisisIndex: 1, target: 9_000n });
    expect(s0.crisis.flashpoint).toBe('TLM');
    expect(s0.crisis.lit).toEqual(['SHL', 'LTL', 'TLM', 'KLP', 'KLM', 'EDV', 'ICW', 'DRF']);
    const s = pinAll(s0, ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']);
    expect(preview(s).leverage).toBe(10_920n);
    expect(preview(s).clears).toBe(true);
    expect(preview(must(moveSeat(s, 1, 2))).leverage).toBe(8_736n);
    expect(preview(must(moveSeat(s, 2, 1))).leverage).toBe(8_736n);
    let bare = s;
    while (bare.staff.length) bare = must(sellStaff(bare, 0));
    expect(preview(bare).leverage).toBe(2_556n);

    const done = must(sweep(s));
    expect(done.lastSweep!.leverage).toBe(10_920n);
    expect(done.world.brass).toEqual({ KLP: 1 });
    expect(done.phase).toBe('briefing');
  });

  it('LATE SHIFT: 10,559,856,944; Governor last 8,651,450,444; Deputy copying Signals 415,461,382', () => {
    const s0 = newSandbox('late');
    const labels = boardLabels(s0);
    expect(labels).toMatchObject({ hour: 'OVERTIME 10:00', clock: '10:00', overtime: true, crisis: 'FLARE-UP', target: 600_000_000n, funds: 40 });
    expect(s0.staff.map((x) => x.id)).toEqual(['HERALD', 'GOVERNOR', 'SIGNALS', 'DEPUTY', 'SOVEREIGN']);
    expect(s0.crisis.flashpoint).toBe('HRT');
    const s = pinAll(s0, ['EDV', 'MRD', 'TRN', 'GUL', 'LNK']);
    expect(preview(s).leverage).toBe(10_559_856_944n);
    expect(preview(must(moveSeat(s, 1, 4))).leverage).toBe(8_651_450_444n);
    expect(preview(must(moveSeat(s, 2, 3))).leverage).toBe(415_461_382n);
    const done = must(sweep(s));
    expect(done.lastSweep!.leverage).toBe(10_559_856_944n);
    // 17.6x the target pays the full Overwhelm.
    expect(done.lastClear).toMatchObject({ overwhelm: 3, reward: 3, unusedSweeps: 3, interest: 4 });
    expect(done.funds).toBe(40 + 3 + 3 + 4 + 3);
  });
});

describe('pins, sweeps and swaps', () => {
  it('pins lit regions only, up to 5', () => {
    const s = newRun('FIRST-NIGHT');
    expect(pin(s, 'FRM')).toMatchObject({ ok: false, reason: 'Only lit regions can be pinned.' });
    const five = pinAll(s, ['LNK', 'GUL', 'SHL', 'EDV', 'QLN']);
    expect(pin(five, 'NWK')).toMatchObject({ ok: false, reason: 'Five pins is the limit.' });
    expect(pin(five, 'LNK')).toMatchObject({ ok: false, reason: 'Already pinned.' });
    expect(must(unpin(five, 'GUL')).crisis.pins).toEqual(['LNK', 'SHL', 'EDV', 'QLN']);
    expect(must(clearPins(five)).crisis.pins).toEqual([]);
    const swept = must(sweep(pinAll(s, ['LNK'])));
    expect(pin(swept, 'LNK')).toMatchObject({ ok: false, reason: 'That region is spent this crisis.' });
  });

  it('refuses to sweep with no pins', () => {
    const s = newRun('FIRST-NIGHT');
    expect(sweep(s)).toMatchObject({ ok: false, reason: 'Pin at least one lit region.' });
    expect(preview(s)).toMatchObject({ pattern: null, canSweep: false, sweepReason: 'Pin at least one lit region.', clears: false });
  });

  it('swaps: the selected regions are spent and new ones light', () => {
    const s = pinAll(newRun('FIRST-NIGHT'), ['ICW', 'HRT']);
    const after = must(swap(s));
    expect(after.crisis.swapsLeft).toBe(2);
    expect(after.crisis.spent).toEqual(['ICW', 'HRT']);
    expect(after.crisis.lit).toEqual(['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'FRM', 'WNM']);
    expect(after.crisis.pins).toEqual([]);
    expect(after.crisis.sweepsLeft).toBe(4);
    let t = after;
    for (let i = 0; i < 2; i++) t = must(swap(pinAll(t, [t.crisis.lit[7]])));
    expect(swap(pinAll(t, [t.crisis.lit[7]]))).toMatchObject({ ok: false, reason: 'No swaps left.' });
    expect(swap(newRun('x'))).toMatchObject({ ok: false, reason: 'Select lit regions to swap.' });
  });

  it('refills from the spent regions when the pile runs out', () => {
    let s = newRun('REFILL');
    // Leave one region in the pile and twelve spent (the other nine sit this crisis out).
    s = tweak(s, (d) => {
      const c = d.crisis;
      c.spent = c.pile.slice(0, 12);
      c.pile = c.pile.slice(12, 13);
    });
    const lonePile = s.crisis.pile[0];
    const spentBefore = [...s.crisis.spent];
    const pins = s.crisis.lit.slice(0, 3);
    const after = must(sweep(pinAll(s, pins)));
    const c = after.crisis;
    expect(c.lit).toHaveLength(8);
    // The pile had 1 but 3 were needed: the 15 spent regions (12 + the 3 swept) were shuffled in after it.
    expect(c.lit[5]).toBe(lonePile);
    expect(c.spent).toEqual([]);
    expect(c.pile.length + 2).toBe(spentBefore.length + 3);
    expect(new Set([...c.lit, ...c.pile]).size).toBe(c.lit.length + c.pile.length);
  });

  it('misses after the 4th sweep below the target', () => {
    let s = tweak(newRun('MISS'), (d) => {
      d.crisis.target = 1_000_000n;
    });
    for (let i = 0; i < 4; i++) s = must(sweep(pinAll(s, [s.crisis.lit[0]])));
    expect(s.phase).toBe('missed');
    expect(s.crisis.sweepsLeft).toBe(0);
    expect(s.log.at(-1)).toMatchObject({ cleared: false, sweepsUsed: 4 });
    expect(endLabels(s)).toEqual({ title: 'THE WORLD TIPPED', line: '22:00 FLARE-UP' });
    expect(pin(s, s.crisis.lit[0])).toMatchObject({ ok: false });
    expect(nextCrisis(s)).toMatchObject({ ok: false });
  });

  it('pays interest (capped at 4), Overwhelm and the Treasurer on a clear', () => {
    let s = tweak(newRun('PAY'), (d) => {
      d.funds = 37;
      d.crisis.target = 10n;
      d.staff.push({ uid: 99, id: 'TREASURER', count: 0 }, { uid: 98, id: 'DEPUTY', count: 0 }, { uid: 97, id: 'TREASURER', count: 0 });
    });
    s = must(sweep(pinAll(s, bestPins(s))));
    const lev = s.lastSweep!.leverage;
    expect(lev >= 80n).toBe(true);
    // 8x the target or more: +3. Two Treasurers and a Deputy copying one: +12.
    expect(s.lastClear).toMatchObject({ reward: 3, unusedSweeps: 3, interest: 4, overwhelm: 3, treasurer: 12, payout: 25 });
    expect(s.funds).toBe(62);
  });

  it('grows the Old Hand by 5 after every sweep and adds traffic only inside the scoring set', () => {
    let s = tweak(newRun('FIRST-NIGHT'), (d) => d.staff.push({ uid: 50, id: 'OLDHAND', count: 0 }));
    s = must(sweep(pinAll(s, ['LNK', 'GUL', 'SHL', 'ICW'])));
    expect(s.staff[0].count).toBe(5);
    expect(s.world.traffic).toEqual({ [joinKey('GUL', 'LNK')]: 1, [joinKey('LNK', 'SHL')]: 1 });
    s = must(sweep(pinAll(s, [s.crisis.lit[0]])));
    expect(s.staff[0].count).toBe(10);
    expect(s.lastSweep!.trace.some((e) => e.phase === 'desk' && e.staffId === 'OLDHAND' && e.amount === '5')).toBe(true);
  });
});

describe('Summit twists', () => {
  /** Jump to the Summit of `hour` with a fresh deal. */
  function atSummit(seed: string, hour: number): RunState {
    let s = newRun(seed);
    // Walk the Briefing chain without playing: pretend each crisis cleared.
    while (!(s.crisis.hour === hour && s.crisis.index === 2)) {
      s = tweak(s, (d) => {
        d.phase = 'briefing';
        d.shop = { briefing: 1, offers: [null, null], folder: { kind: 'orders', price: 4, contents: [], status: 'used' }, rerollCost: 4 };
      });
      s = must(nextCrisis(s));
    }
    return s;
  }

  it('GRIDLOCK (22:00 Summit): lanes and cables are cut only during the Summit', () => {
    const s = atSummit('GRID', 0);
    expect(s.hour.twist).toEqual({ kind: 'GRIDLOCK', colour: null });
    expect(twistInForce(s)).toEqual({ kind: 'GRIDLOCK', colour: null });
    expect(boardLabels(s)).toMatchObject({ crisis: 'SUMMIT', target: 600n, twistNow: true });
    const lit = tweak(s, (d) => {
      d.crisis.lit = ['SHL', 'LTL', 'TLM', 'KLP', 'KLM', 'EDV', 'ICW', 'DRF'];
    });
    const p = preview(pinAll(lit, ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']));
    expect(p.pattern).toBe('CHAIN');
    expect(p.joins.map(([a, b]) => joinKey(a, b)).sort()).toEqual(
      [joinKey('KLP', 'LTL'), joinKey('KLP', 'TLM'), joinKey('LTL', 'TLM')].sort(),
    );
    const flare = newRun('GRID');
    expect(twistInForce(flare)).toBeNull();
  });

  it('BLACKOUT (23:00 Summit): the colour is drawn by rng twist at the start of the Hour and shown from then', () => {
    const s = atSummit('DARK', 1);
    const colour = s.hour.twist.colour;
    expect(s.hour.twist.kind).toBe('BLACKOUT');
    expect(['CAP', 'HMR', 'SCT', 'SND', 'FRS']).toContain(colour);
    // Already visible at the Hour's Flare-up, in force only at the Summit.
    let flare = newRun('DARK');
    flare = tweak(flare, (d) => {
      d.phase = 'briefing';
      d.crisis.index = 2;
    });
    flare = must(nextCrisis(flare));
    expect(flare.crisis.index).toBe(0);
    expect(flare.hour.twist).toEqual(s.hour.twist);
    expect(twistInForce(flare)).toBeNull();
    expect(twistInForce(s)).toEqual({ kind: 'BLACKOUT', colour });
    // Same seed, same colour.
    expect(atSummit('DARK', 1).hour.twist).toEqual(s.hour.twist);
    // A blacked-out pin adds nothing.
    const dark = s.crisis.lit.find((r) => s.world.colour[r] === colour);
    if (dark) {
      const res = must(sweep(pinAll(s, [dark])));
      expect(res.lastSweep!.trace.find((e) => e.phase === 'pin')).toMatchObject({ dark: true, amount: '0' });
    }
  });

  it('FULL TABLE (00:00 Summit): SWEEP needs exactly 5 pins; swaps are unaffected', () => {
    const s = atSummit('FULL', 2);
    expect(s.hour.twist.kind).toBe('FULL_TABLE');
    expect(boardLabels(s)).toMatchObject({ clock: '00:00', crisis: 'SUMMIT', target: 5_000n, summitChip: 'SUMMIT: FULL TABLE' });
    const four = pinAll(s, s.crisis.lit.slice(0, 4));
    expect(sweep(four)).toMatchObject({ ok: false, reason: 'FULL TABLE: pin exactly 5.' });
    expect(preview(four).canSweep).toBe(false);
    expect(swap(pinAll(s, s.crisis.lit.slice(0, 2))).ok).toBe(true);
    expect(sweep(pinAll(four, [s.crisis.lit[4]])).ok).toBe(true);
  });
});

describe('the end of the slice and KEEP GOING', () => {
  function sliceEnd(): RunState {
    let s = tweak(newRun('KEEP'), (d) => {
      d.hour = { ...d.hour, index: 2, targets: [2500n, 3750n, 5000n], twist: { kind: 'FULL_TABLE', colour: null } };
      d.crisis.hour = 2;
      d.crisis.index = 2;
      d.crisis.kind = 'SUMMIT';
      d.crisis.target = 1n;
    });
    s = must(sweep(pinAll(s, s.crisis.lit.slice(0, 5))));
    return s;
  }

  it('ends the slice after the 00:00 Summit with no Briefing', () => {
    const s = sliceEnd();
    expect(s.phase).toBe('sliceEnd');
    expect(s.shop).toBeNull();
    expect(endLabels(s)).toEqual({ title: 'END OF SLICE', line: 'YOU HELD UNTIL 01:00' });
    expect(nextCrisis(s)).toMatchObject({ ok: false });
  });

  it('KEEP GOING: a Briefing, then 01:00 at 6,000 / 9,000 / 12,000, then x2.2 per Hour', () => {
    let s = must(keepGoing(sliceEnd()));
    expect(s.phase).toBe('briefing');
    expect(s.sliceEndHour).toBeNull();
    expect(s.shop).not.toBeNull();
    expect(nextCrisisInfo(s)).toMatchObject({ hour: '01:00', crisis: 'FLARE-UP', target: 6_000n });
    s = must(nextCrisis(s));
    expect(s.hour.index).toBe(3);
    expect(s.hour.targets).toEqual([6_000n, 9_000n, 12_000n]);
    expect(['GRIDLOCK', 'BLACKOUT', 'FULL_TABLE']).toContain(s.hour.twist.kind);
    expect(boardLabels(s)).toMatchObject({ clock: '01:00', target: 6_000n });
    expect(hourTargets(4, s.hour.targets)).toEqual([13_200n, 19_800n, 26_400n]);
    expect(hourTargets(5, hourTargets(4, s.hour.targets))).toEqual([29_040n, 43_560n, 58_080n]);
    expect(clockOf(4)).toBe('02:00');
  });
});

describe('state handling', () => {
  it('never mutates a state it was given', () => {
    let s = newRun('FIRST-NIGHT');
    const steps: Array<(x: RunState) => Result> = [
      (x) => pin(x, 'LNK'),
      (x) => pin(x, 'GUL'),
      (x) => pin(x, 'SHL'),
      (x) => unpin(x, 'SHL'),
      (x) => pin(x, 'SHL'),
      (x) => sweep(x),
      (x) => pin(x, 'NWK'),
      (x) => swap(x),
      (x) => pin(x, x.crisis.lit[0]),
      (x) => sweep(x),
    ];
    for (const step of steps) {
      const before = canonical(s);
      const r = step(s);
      expect(canonical(s)).toBe(before);
      if (r.ok) {
        expect(r.state).not.toBe(s);
        s = r.state;
      }
    }
  });

  it('returns the same state object on refusal', () => {
    const s = newRun('FIRST-NIGHT');
    const r = pin(s, 'FRM');
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it('exposes region views in the map contract shape', () => {
    const s = pinAll(newRun('FIRST-NIGHT'), ['LNK']);
    const v = regionViews(s);
    expect(Object.keys(v)).toHaveLength(30);
    expect(v.LNK).toEqual({ id: 'LNK', colour: 'SCT', status: 'lit', pinned: true, airlift: false, capital: true, port: false, stamp: null, brass: 0, glow: 0 });
    expect(v.FRM.status).toBe('dark');
    expect(v.SHL.port).toBe(true);
  });
});

describe('determinism', () => {
  /** A greedy player through the whole slice, buying the first affordable staff offer. */
  function playNight(seed: string): { traces: TraceEvent[][]; final: RunState } {
    let s = newRun(seed);
    const traces: TraceEvent[][] = [];
    for (let guard = 0; guard < 60 && (s.phase === 'crisis' || s.phase === 'briefing'); guard++) {
      if (s.phase === 'crisis') {
        s = greedySweep(s);
        traces.push(s.lastSweep!.trace);
      } else {
        const slot = s.shop!.offers.findIndex((o) => o && o.price <= s.funds && (o.kind !== 'staff' || s.staff.length < 5));
        if (slot >= 0) {
          const r = buyOffer(s, slot);
          if (r.ok) s = r.state;
        }
        s = must(nextCrisis(s));
      }
    }
    return { traces, final: s };
  }

  it('the same seed and actions give an identical trace hash', () => {
    const a = playNight('DETERMINISM-1');
    const b = playNight('DETERMINISM-1');
    expect(a.traces.length).toBeGreaterThan(3);
    expect(hashTrace(a.traces.flat())).toBe(hashTrace(b.traces.flat()));
    expect(hashState(a.final)).toBe(hashState(b.final));
    const c = playNight('DETERMINISM-2');
    expect(hashState(c.final)).not.toBe(hashState(a.final));
  });
});

describe('immutability under every action', () => {
  function deepFreeze<T>(v: T): T {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      Object.freeze(v);
      for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k]);
    }
    return v;
  }

  it('no action writes to the state it was given (frozen inputs never throw)', () => {
    const script: Array<[string, (x: RunState) => Result]> = [
      ['pin', (x) => pin(x, 'LNK')],
      ['pin', (x) => pin(x, 'GUL')],
      ['pin', (x) => pin(x, 'SHL')],
      ['sweep', (x) => sweep(x)],
      ['pin', (x) => pin(x, 'ICW')],
      ['swap', (x) => swap(x)],
      ['pins', (x) => ({ ok: true, state: pinAll(x, ['NWK', 'FRM', 'WNM', 'WMS']) })],
      ['sweep', (x) => sweep(x)],
      ['funds', (x) => ({ ok: true, state: tweak(x, (d) => (d.funds = 50)) })],
      ['buy staff', (x) => buyOffer(x, 0)],
      ['buy staff', (x) => buyOffer(x, 1)],
      ['reroll', (x) => reroll(x)],
      ['folder', (x) => buyFolder(x)],
      ['pick', (x) => pickFromFolder(x, 0)],
      ['move', (x) => moveSeat(x, 0, 2)],
      ['sell', (x) => sellStaff(x, 1)],
      ['give papers', (x) => ({ ok: true, state: tweak(x, (d) => (d.tray = [{ uid: 900, id: 'FORTIFY' }, { uid: 901, id: 'AIRLIFT' }])) })],
      ['arm', (x) => armOrder(x, 0)],
      ['tap', (x) => tapArmed(x, 'KLP')],
      ['confirm', (x) => confirmArmed(x)],
      ['next', (x) => nextCrisis(x)],
      ['airlift', (x) => useOrder(x, 0, [x.crisis.pile[0]])],
      ['unpin airlift', (x) => unpin(x, x.crisis.airlift!)],
      ['sell paper', (x) => sellPaper(x, 0)],
      ['sweep greedy', (x) => ({ ok: true, state: greedySweep(x) })],
    ];
    let s = newRun('FIRST-NIGHT');
    for (const [name, step] of script) {
      deepFreeze(s);
      const r = step(s);
      expect(r.ok, `${name}: ${r.ok ? '' : r.reason}`).toBe(true);
      s = r.state;
    }
    expect(s.world.stamps).toEqual({ KLP: 'FORTIFY' });
    expect(s.staff).toHaveLength(2);
  });
});
