import { describe, expect, it } from 'vitest';
import { newRun, newSandbox, pin, sweep, type RunState, type SweepRecord } from '../../engine';
import { PATTERN } from '../../content/patterns';
import {
  CLEARED_AT,
  eventDuration,
  groupTrace,
  HOLD_MS,
  multPitch,
  multWeight,
  fifthUp,
  noteHz,
  outcomeSchedule,
  RISER_MS,
  shakeFor,
  sizeOf,
  slamIntensity,
  sweepSchedule,
  tickIntensity,
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

function input(rec: SweepRecord, reduced = false, rate = 1): SweepInput {
  return {
    trace: rec.trace,
    leverage: rec.leverage,
    target: rec.target,
    totalBefore: rec.totalBefore,
    topRegion: rec.topRegion,
    patternName: PATTERN[rec.pattern].name,
    reduced,
    clears: rec.cleared,
    rate,
  };
}

const at = <K extends Cue['do']>(cues: Cue[], kind: K) => cues.filter((c): c is Extract<Cue, { do: K }> => c.do === kind);
const sounds = (cues: Cue[], sfx: string) => at(cues, 'sound').filter((c) => c.sfx === sfx);

describe('event durations and sizes', () => {
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
  });

  it('makes every slam louder than the lever and the stamp, and a clear louder still', () => {
    expect(sizeOf(10_559_856_944n)).toBe(1);
    expect(sizeOf(180n)).toBeCloseTo(Math.log10(180) / 9, 5);
    const first = slamIntensity(180n, 0.6);
    const clear = slamIntensity(272n, 2.27);
    expect(first).toBeGreaterThan(0.6);
    expect(clear).toBeGreaterThan(first);
    expect(slamIntensity(10_559_856_944n, 17.6)).toBe(1);
    expect(slamIntensity(5n, 0.01)).toBeLessThan(0.5);
    // A missed crisis's last sweep keeps the plain size: no flourish.
    expect(slamIntensity(180n, 0.6, true)).toBeCloseTo(sizeOf(180n), 5);
  });

  it('climbs a pentatonic over the sweep, an AGAIN pings a fifth up, multipliers a semitone each', () => {
    const four = [0, 1, 2, 3].map((k) => tickIntensity(k, 4));
    for (let i = 1; i < four.length; i++) expect(four[i]).toBeGreaterThan(four[i - 1]);
    // A5 to B6 whatever the length: a short sweep climbs as far as a long one.
    expect(tickIntensity(0, 4)).toBeCloseTo(tickIntensity(0, 9), 6);
    expect(tickIntensity(3, 4)).toBeCloseTo(tickIntensity(8, 9), 6);
    expect(500 * Math.pow(4.4, fifthUp(noteHz(0, 4)))).toBeCloseTo(1320, 0);
    expect(multPitch(1)).toBeGreaterThan(multPitch(0));
    expect(380 * Math.pow(3.5, multPitch(1)) / (380 * Math.pow(3.5, multPitch(0)))).toBeCloseTo(Math.pow(2, 1 / 12), 4);
    expect([multWeight('1.5'), multWeight('2'), multWeight('3')]).toEqual([0.9, 1, 1.2]);
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
    expect(at(s.cues, 'scan').map((c) => c.t)).toEqual([450, 770, 1071, 1354]);
  });

  it('stamps the pattern at 150 ms with its own sound, and locks the base values', () => {
    expect(at(s.cues, 'stamp')[0]).toMatchObject({ t: 150, name: 'CHAIN', level: 1 });
    expect(at(s.cues, 'base')[0]).toMatchObject({ I: 30n, M10: 30n });
    expect(sounds(s.cues, 'stamp').map((c) => c.t)).toEqual([150]);
    expect(sounds(s.cues, 'commit').map((c) => c.t)).toEqual([0]);
  });

  it('flies every pin weight into Influence and lands the running value', () => {
    const lands = at(s.cues, 'land').filter((c) => c.box === 'inf');
    expect(lands.map((c) => c.value)).toEqual([33n, 43n, 53n, 60n]);
  });

  it('ticks up a scale; the AGAIN repeats its note with a ping a fifth above, and the climb gets louder', () => {
    const at = (t: number) => sounds(s.cues, 'tally_tick').filter((c) => c.t === t).map((c) => c.intensity);
    const [gul, lnk, again, shl] = [450, 770, 1071, 1354].map(at);
    expect(lnk[0]).toBeGreaterThan(gul[0]);
    expect(again).toContain(lnk[0]);
    expect(Math.max(...again)).toBeCloseTo(fifthUp(noteHz(1, 3)), 6);
    expect(shl[0]).toBeGreaterThan(lnk[0]);
    // Each note is doubled for body; a thump grows under the later ones.
    expect(sounds(s.cues, 'tick').filter((c) => c.t >= 450 && c.t <= 1354)).toHaveLength(4);
    const pins = sounds(s.cues, 'pin').map((c) => c.intensity);
    expect(pins).toHaveLength(4);
    expect(pins[0]).toBeCloseTo(0.2, 6);
    expect(pins[1]).toBeCloseTo(0.6, 6);
    expect(pins[2]).toBeCloseTo(0.6, 6);
    expect(pins[3]).toBeCloseTo(1, 6);
    expect(sounds(s.cues, 'thump').some((c) => c.t === 1354)).toBe(true);
    expect(sounds(s.cues, 'thump').some((c) => c.t === 450)).toBe(false);
  });

  it('holds its breath before the slam, then prints the product on the board and rolls the total', () => {
    const lastLand = Math.max(...at(s.cues, 'land').map((c) => c.t));
    expect(s.slamAt - lastLand).toBeGreaterThanOrEqual(HOLD_MS);
    expect(at(s.cues, 'breath')).toHaveLength(1);
    const print = at(s.cues, 'print')[0];
    const roll = at(s.cues, 'roll')[0];
    expect(print.from).toBe('plate');
    expect(print.t).toBeGreaterThan(s.hitAt);
    expect(roll.t).toBe(print.t + print.ms);
    expect(s.end).toBe(roll.t + roll.ms);
    expect(s.end - s.hitAt).toBeLessThanOrEqual(800);
  });

  it('runs about 2.5 s to the total, and lands the slam loud', () => {
    expect(s.end).toBeGreaterThan(2400);
    expect(s.end).toBeLessThan(2900);
    expect(at(s.cues, 'shake')).toHaveLength(1); // 180 / 300 = 0.6 -> 2 px
    expect(s.heatAt).toBeNull();
    const slam = sounds(s.cues, 'tally_slam').find((c) => c.t === s.hitAt)!;
    expect(slam.intensity).toBeGreaterThan(0.6);
    expect(sounds(s.cues, 'thump').some((c) => c.t === s.hitAt)).toBe(true);
    expect(at(s.cues, 'riser')).toHaveLength(0);
  });
});

describe('first night, sweep 2 (Front 272 clears)', () => {
  const first = sweep(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL'])).state;
  const rec = swept(pinAll(first, ['NWK', 'FRM', 'WNM', 'WMS']));

  it('starts the clear chord so that it lands on CLEARED, at any speed', () => {
    expect(rec.cleared).toBe(true);
    for (const rate of [1, 2, 4]) {
      const s = sweepSchedule(input(rec, false, rate));
      const riser = at(s.cues, 'riser')[0];
      expect(riser.t).toBeGreaterThanOrEqual(s.hitAt);
      // Real time from the riser to CLEARED is the riser's own length.
      if (riser.t > s.hitAt) expect((s.end + CLEARED_AT - riser.t) / rate).toBeCloseTo(RISER_MS, 0);
    }
  });
});

describe('Mid Shift, Example 2 (Network 10,920)', () => {
  const rec = swept(pinAll(newSandbox('mid'), ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']));
  const s = sweepSchedule(input(rec));

  it('scores 10,920 and slams after a held breath, near 2.9 s', () => {
    expect(rec.leverage).toBe(10_920n);
    expect(s.events).toBe(6);
    expect(s.slamAt).toBeGreaterThanOrEqual(2700);
    expect(s.slamAt).toBeLessThanOrEqual(3000);
  });

  it('reaches the total in under 4 s, heats before the slam, hops staff in seat order', () => {
    expect(s.end).toBeGreaterThan(3300);
    expect(s.end).toBeLessThan(4000);
    expect(s.heatAt).not.toBeNull();
    expect(s.heatAt!).toBeLessThan(s.slamAt);
    const deskHops = at(s.cues, 'hop').filter((c) => c.t >= 2105);
    expect(deskHops.map((c) => c.seat)).toEqual([1, 2]);
    expect(at(s.cues, 'shake')[0]).toBeDefined();
  });

  it('lands a multiplier heavier than an add, and only when the number arrives', () => {
    const mult = at(s.cues, 'fly').find((c) => c.text === '×2')!;
    const landAt = mult.t + mult.ms;
    expect(at(s.cues, 'land').some((c) => c.t === landAt && c.mult && c.weight === 1)).toBe(true);
    expect(sounds(s.cues, 'thump').some((c) => c.t === landAt)).toBe(true);
    expect(at(s.cues, 'shake').some((c) => c.t === landAt && c.px === 4)).toBe(true);
    expect(at(s.cues, 'buzz').some((c) => c.t === landAt && c.ms === 12)).toBe(true);
    // Nothing sounds as the number leaves its seat.
    expect(sounds(s.cues, 'tally_mult').some((c) => c.t === mult.t)).toBe(false);
    const add = at(s.cues, 'fly').find((c) => c.text === '+8')!;
    expect(sounds(s.cues, 'tally_mult').some((c) => c.t === add.t + add.ms && c.intensity === 0.4)).toBe(true);
  });

  it('times the clear to the Briefing in under 5.5 s', () => {
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 5, fundsAfter: 11, reduced: false, riserPlayed: true });
    const rise = o.cues.find((c) => c.do === 'rise')!.t;
    expect(s.end + rise).toBeGreaterThan(4600);
    expect(s.end + rise).toBeLessThan(5500);
    expect(o.cues.filter((c) => c.do === 'coin')).toHaveLength(6);
  });
});

describe('Late Shift, Example 3 (10.6B)', () => {
  const rec = swept(pinAll(newSandbox('late'), ['EDV', 'MRD', 'TRN', 'GUL', 'LNK']));
  const s = sweepSchedule(input(rec));

  it('has ten events, the full 9 px shake, a bloom and the showcase', () => {
    expect(s.events).toBe(10);
    expect(s.r).toBeGreaterThan(17);
    expect(at(s.cues, 'mapFlash')).toHaveLength(1);
    expect(at(s.cues, 'shake').some((c) => c.px === 9)).toBe(true);
    expect(at(s.cues, 'showcase')).toHaveLength(1);
    expect(at(s.cues, 'print')[0].from).toBe('map');
  });

  it('keeps every sub-step inside its event, so numbers land in order', () => {
    const values = at(s.cues, 'land')
      .filter((c) => c.box === 'mom')
      .map((c) => c.value);
    for (let i = 1; i < values.length; i++) expect(values[i] >= values[i - 1]).toBe(true);
  });

  it('runs about 4.6 s, the showcase and the roll within 1 s of the slam', () => {
    expect(s.end).toBeGreaterThan(4000);
    expect(s.end).toBeLessThan(4800);
    expect(s.end - s.hitAt).toBeLessThanOrEqual(1000);
  });

  it('fits in 1.2 s with reduced motion, keeps every sound and flies nothing', () => {
    const r = sweepSchedule(input(rec, true));
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 40, fundsAfter: 53, reduced: true, riserPlayed: true });
    expect(r.end + o.end).toBeLessThanOrEqual(1200);
    expect(o.cues.filter((c) => c.do === 'coin')).toHaveLength(13);
    expect(at(r.cues, 'fly')).toHaveLength(0);
    expect(at(r.cues, 'shake')).toHaveLength(0);
    expect(at(r.cues, 'showcase')).toHaveLength(0);
    expect(at(r.cues, 'sound').length).toBe(at(s.cues, 'sound').length);
  });
});

describe('outcomes', () => {
  it('lights out over 2 s before the summary card on a miss, with its haptic', () => {
    const o = outcomeSchedule({ kind: 'miss', fundsBefore: 5, fundsAfter: 5, reduced: false });
    expect(o.cues.find((c) => c.do === 'card')!.t).toBeGreaterThanOrEqual(2000);
    expect(o.cues.find((c) => c.do === 'buzz')).toMatchObject({ pattern: [60, 80, 140] });
  });

  it('keeps a reduced-motion miss inside 1.2 s, scoring included', () => {
    const rec = swept(pinAll(newSandbox('mid'), ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']));
    const s = sweepSchedule(input(rec, true));
    const o = outcomeSchedule({ kind: 'miss', fundsBefore: 5, fundsAfter: 5, reduced: true });
    expect(s.end + o.end).toBeLessThanOrEqual(1200);
  });

  it('stamps CLEARED on the chord, gives the brass pin its own beat, then the coins and the tray', () => {
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 5, fundsAfter: 12, reduced: false, riserPlayed: true });
    const t = (kind: string) => o.cues.find((c) => c.do === kind)!.t;
    expect(t('cleared')).toBe(CLEARED_AT);
    expect(o.cues.some((c) => c.do === 'sound' && c.sfx === 'ante_smash')).toBe(false);
    expect(t('drop') - t('cleared')).toBeGreaterThanOrEqual(250);
    // The total that cleared is held, readable, before the stamp covers the tiles.
    expect(t('cleared')).toBeGreaterThanOrEqual(350);
    const coins = o.cues.filter((c) => c.do === 'coin').map((c) => c.t);
    expect(coins[0]).toBeGreaterThan(t('drop') + 250);
    // 90 ms apart for the first five, quicker after.
    expect(coins.slice(1, 5).map((c, i) => c - coins[i])).toEqual([90, 90, 90, 90]);
    expect(coins[5] - coins[4]).toBe(70);
    expect(t('rise')).toBe(coins.at(-1)! + 240);
  });

  it('plays the chord at the start of the clear when the riser was skipped, and stamps CLEARED on it', () => {
    const o = outcomeSchedule({ kind: 'clear', fundsBefore: 5, fundsAfter: 8, reduced: false, riserPlayed: false, chordAt: RISER_MS });
    expect(o.cues.find((c) => c.do === 'sound' && c.sfx === 'ante_smash')!.t).toBe(0);
    expect(o.cues.find((c) => c.do === 'cleared')!.t).toBe(RISER_MS);
  });
});
