import { describe, expect, it } from 'vitest';
import { newRun, newSandbox, pin, sweep, type RunState, type SweepRecord } from '../../engine';
import { PATTERN } from '../../content/patterns';
import {
  eventDuration,
  groupTrace,
  outcomeSchedule,
  shakeFor,
  slamIntensity,
  sweepSchedule,
  type Cue,
  type SweepInput,
} from './schedule';

function pinAll(s: RunState, ids: string[]): RunState {
  for (const id of ids) {
    const r = pin(s, id);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
  }
  return s;
}

function swept(s: RunState): SweepRecord {
  const r = sweep(s);
  if (!r.ok) throw new Error(r.reason);
  return r.state.lastSweep!;
}

function input(rec: SweepRecord, reduced = false): SweepInput {
  return {
    trace: rec.trace,
    leverage: rec.leverage,
    target: rec.target,
    totalBefore: rec.totalBefore,
    topRegion: rec.topRegion,
    patternName: PATTERN[rec.pattern].name,
    reduced,
  };
}

const at = (cues: Cue[], kind: Cue['do']) => cues.filter((c) => c.do === kind);

describe('event durations', () => {
  it('follows d_k = max(120, round(320 x 0.94^k)), then 60 ms from the 13th', () => {
    expect([0, 1, 2, 3].map(eventDuration)).toEqual([320, 301, 283, 266]);
    expect(eventDuration(11)).toBe(162);
    expect(eventDuration(12)).toBe(60);
    expect(eventDuration(40)).toBe(60);
  });

  it('shakes by the share of the target still left', () => {
    expect(shakeFor(0.2)).toBe(0);
    expect(shakeFor(0.5)).toBe(2);
    expect(shakeFor(1.2)).toBe(5);
    expect(shakeFor(17.6)).toBe(9);
    expect(slamIntensity(10_559_856_944n)).toBe(1);
    expect(slamIntensity(180n)).toBeCloseTo(Math.log10(180) / 9, 5);
  });
});

describe('first night, sweep 1 (Chain 180)', () => {
  const rec = swept(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL']));
  const s = sweepSchedule(input(rec));

  it('has four events: Gullrest, Lantern Key, AGAIN, Shoal', () => {
    const g = groupTrace(rec.trace);
    expect(g.passes.map((p) => [p.pin.region, !!p.again])).toEqual([
      ['GUL', false],
      ['LNK', false],
      ['LNK', true],
      ['SHL', false],
    ]);
    expect(s.events).toBe(4);
    const scans = at(s.cues, 'scan');
    expect(scans.map((c) => c.t)).toEqual([450, 770, 1071, 1354]);
  });

  it('stamps the pattern at 150 ms and lands the base values', () => {
    const stamp = at(s.cues, 'stamp')[0];
    expect(stamp).toMatchObject({ t: 150, name: 'CHAIN', level: 1 });
    expect(at(s.cues, 'base')[0]).toMatchObject({ I: 30n, M10: 30n });
  });

  it('flies every pin weight into Influence and lands the running value', () => {
    const lands = at(s.cues, 'land').filter((c) => c.do === 'land' && c.box === 'inf');
    expect(lands.map((c) => (c.do === 'land' ? c.value : 0n))).toEqual([33n, 43n, 53n, 60n]);
  });

  it('runs about 2.5 s to the total', () => {
    expect(s.end).toBeGreaterThan(2300);
    expect(s.end).toBeLessThan(2900);
    expect(at(s.cues, 'shake')).toHaveLength(1); // 180 / 300 = 0.6 -> 2 px
    expect(s.heatAt).toBeNull();
  });
});

describe('Mid Shift, Example 2 (Network 10,920)', () => {
  const rec = swept(pinAll(newSandbox('mid'), ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']));
  const s = sweepSchedule(input(rec));

  it('scores 10,920 and slams near 2.6 s', () => {
    expect(rec.leverage).toBe(10_920n);
    expect(s.events).toBe(6);
    expect(s.slamAt).toBeGreaterThanOrEqual(2550);
    expect(s.slamAt).toBeLessThanOrEqual(2700);
  });

  it('reaches the total in about 3.5 s, heats before the slam, hops staff in seat order', () => {
    expect(s.end).toBeGreaterThan(3300);
    expect(s.end).toBeLessThan(3900);
    expect(s.heatAt).not.toBeNull();
    expect(s.heatAt!).toBeLessThan(s.slamAt);
    const deskHops = at(s.cues, 'hop').filter((c) => c.t >= 2105);
    expect(deskHops.map((c) => (c.do === 'hop' ? c.seat : -1))).toEqual([1, 2]);
    expect(at(s.cues, 'shake')[0]).toBeDefined();
  });

  it('times the clear to the Briefing in about 5 s', () => {
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 5, fundsAfter: 11, reduced: false });
    expect(s.end + o.end).toBeGreaterThan(4600);
    expect(s.end + o.end).toBeLessThan(5800);
    expect(o.cues.filter((c) => c.do === 'coin')).toHaveLength(6);
  });
});

describe('Late Shift, Example 3 (10.6B)', () => {
  const rec = swept(pinAll(newSandbox('late'), ['EDV', 'MRD', 'TRN', 'GUL', 'LNK']));
  const s = sweepSchedule(input(rec));

  it('has ten events and the full 9 px shake with a map flash', () => {
    expect(s.events).toBe(10);
    expect(s.r).toBeGreaterThan(17);
    expect(at(s.cues, 'mapFlash')).toHaveLength(1);
    expect(at(s.cues, 'shake').some((c) => c.do === 'shake' && c.px === 9)).toBe(true);
  });

  it('keeps every sub-step inside its event, so numbers land in order', () => {
    const lands = at(s.cues, 'land').filter((c) => c.do === 'land' && c.box === 'mom');
    const values = lands.map((c) => (c.do === 'land' ? c.value : 0n));
    for (let i = 1; i < values.length; i++) expect(values[i] >= values[i - 1]).toBe(true);
  });

  it('runs about 4.3 to 4.8 s', () => {
    expect(s.end).toBeGreaterThan(4000);
    expect(s.end).toBeLessThan(5000);
  });

  it('fits in 1.2 s with reduced motion, keeps every sound and flies nothing', () => {
    const r = sweepSchedule(input(rec, true));
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 40, fundsAfter: 53, reduced: true });
    expect(r.end + o.end).toBeLessThanOrEqual(1200);
    expect(o.cues.filter((c) => c.do === 'coin')).toHaveLength(13);
    expect(at(r.cues, 'fly')).toHaveLength(0);
    expect(at(r.cues, 'shake')).toHaveLength(0);
    expect(at(r.cues, 'sound').length).toBe(at(s.cues, 'sound').length);
  });
});

describe('outcomes', () => {
  it('lights out over 2 s before the summary card on a miss', () => {
    const o = outcomeSchedule({ kind: 'miss', fundsBefore: 5, fundsAfter: 5, reduced: false });
    expect(o.cues.find((c) => c.do === 'card')!.t).toBeGreaterThanOrEqual(2000);
  });

  it('ticks one coin per 90 ms and raises the tray 400 ms after the last', () => {
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 5, fundsAfter: 8, reduced: false });
    const coins = o.cues.filter((c) => c.do === 'coin').map((c) => c.t);
    expect(coins).toEqual([650, 740, 830]);
    expect(o.cues.find((c) => c.do === 'rise')!.t).toBe(1230);
  });
});
