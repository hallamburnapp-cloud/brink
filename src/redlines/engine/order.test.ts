/**
 * SPEC-SMALL "Rulings after the recheck": cause before effect, and a place that falls stays fallen that week. Each
 * path of the resolve is walked here line by line (the tape, and the beat beside each line), then the WAR count
 * in mid-week states, then WORLD WAR's first place.
 */
import { describe, expect, it } from 'vitest';
import { firstFallen } from './debrief.ts';
import { answerPhone, endWeek, offerWayOut, promise } from './run.ts';
import { RULES } from './rules.ts';
import { FIXTURE_CONTENT, fixtureGame } from './testkit.ts';
import type { GameState, Heading, RegionId, WeekLog } from './types.ts';
import { brokenInvariants } from '../sim/invariants.ts';

const c = FIXTURE_CONTENT;

/** A week-1 state with no inherited promises, the pieces at home, no line to cross, their arrows as given. */
function staged(headings: Heading[], seed = 'order'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.headings = headings;
  // Lines none of these tests cross (no promise in Farsouth, the fleet never at Vessary, Kelpmouth or Driftholm, the brigade at home).
  s.fed.lines = [
    { id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true },
    { id: 'cap-lanes', text: 'The sea lanes to the Cap stay open. A fleet across them is a blockade.', real: true },
    { id: 'missiles-north', text: 'No missiles north of Edda Vale.', real: false },
  ];
  s.collision = '';
  return s;
}
function promised(s: GameState, region: RegionId): GameState {
  const r = promise(s, region);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}
/** A place that fell in an earlier week (so a step down may bring it back). */
function fellBefore(s: GameState, region: RegionId, week: number, seq: number): void {
  s.regions[region] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: week, fellSeq: seq, fellBy: 'unanswered' };
  s.war = Object.values(s.regions).filter((r) => r.state === 'fighting').length;
}
const at = (log: WeekLog, line: string) => {
  const i = log.visible.indexOf(line);
  if (i < 0) throw new Error(`"${line}" is not on the tape: ${JSON.stringify(log.visible)}`);
  return i;
};
const toLtl: Heading[] = [
  { from: 'KLM', to: 'LTL', real: true },
  { from: 'GLM', to: 'DRF', real: false },
];
const toVsy: Heading[] = [
  { from: 'NWK', to: 'VSY', real: true },
  { from: 'GLM', to: 'DRF', real: false },
];
const toDrf: Heading[] = [
  { from: 'GLM', to: 'DRF', real: true },
  { from: 'KLM', to: 'KLP', real: false },
];

describe('cause before effect, path by path', () => {
  it('BACK DOWN at a dashed ring facing a scared Federation: the back-down, then the fall, then an older place quieted; never a quiet week', () => {
    const s = promised(staged(toLtl), 'LTL');
    s.fed.step = 3;
    s.fed.jumpiness = 0.75;
    s.week = 2;
    s.log = [{ week: 1, visible: [], hidden: [], acts: [], danger: { war: 1, treaty: 50, step: 3 } }];
    fellBefore(s, 'KLP', 1, 1);
    const rang = endWeek(c, s);
    expect(rang.phase).toBe('phone');
    const n = answerPhone(c, rang, 'down');
    const log = n.log[1];
    const tested = at(log, 'They are testing your promise at Lintel.');
    const down = at(log, 'You backed down at Lintel. They stand down.');
    const fell = at(log, 'Lintel has fallen.');
    const quiet = at(log, 'Guns quiet at Kelpmouth.');
    expect(tested).toBeLessThan(down);
    expect(down).toBeLessThan(fell);
    expect(fell).toBeLessThan(quiet);
    // Lintel fell this week and stays fallen; Kelpmouth (an earlier week's fall) is the one that comes back.
    expect(n.regions.LTL.state).toBe('fighting');
    expect(n.regions.KLP.state).toBe('pressed');
    expect(log.visible.some((v) => v === 'Guns quiet at Lintel.')).toBe(false);
    expect(log.visible.some((v) => v.startsWith('A quiet week'))).toBe(false);
    expect(log.visible).toContain('They took one place this week.');
    // The beats: WAR 2 at the fall, 1 when Kelpmouth quiets; the stamp is down from the back-down's line on.
    expect(log.beats![fell]).toMatchObject({ kind: 'fell', region: 'LTL', war: 2 });
    expect(log.beats![quiet]).toMatchObject({ kind: 'recovered', region: 'KLP', war: 1 });
    expect(log.beats![down]).toMatchObject({ kind: 'backedDownEased', step: 2 });
    expect(n.war).toBe(1);
    expect(brokenInvariants(n)).toEqual([]);
  });

  it('BACK DOWN at a dashed ring facing a bold Federation: one step for the back-down, then the fall, and no second step for it', () => {
    const s = promised(staged(toLtl), 'LTL');
    s.fed.jumpiness = 0.3;
    const n = answerPhone(c, endWeek(c, s), 'down');
    const log = n.log[0];
    expect(at(log, 'You backed down at Lintel. They are PUSHING.')).toBeLessThan(at(log, 'Lintel has fallen.'));
    expect(log.visible.some((v) => v.includes('nobody came'))).toBe(false);
    expect(n.fed.step).toBe(2);
    expect(n.regions.LTL.fellBy).toBe('back-down');
    expect(brokenInvariants(n)).toEqual([]);
  });

  it('BACK DOWN at a solid ring: the place is pressed, not taken, that week', () => {
    const s = promised(staged(toVsy), 'VSY');
    s.fed.jumpiness = 0.3;
    const n = answerPhone(c, endWeek(c, s), 'down');
    expect(n.regions.VSY.state).toBe('pressed');
    expect(n.log[0].visible.some((v) => v === 'Vessary has fallen.')).toBe(false);
    expect(n.log[0].visible).toContain('A quiet week. They gained nothing.');
  });

  it('WAIT, then BACK DOWN at a dashed ring: "Backed down at Driftholm", then "Driftholm has fallen", and no "taken" step on top', () => {
    const s = promised(staged(toDrf), 'DRF');
    s.fed.step = 2;
    s.fed.jumpiness = 0.3;
    const w = answerPhone(c, endWeek(c, s), 'wait');
    expect(w.pendingTest).toBe('DRF');
    w.fed.headings = [{ from: 'KLM', to: 'KLP', real: true }];
    const rang = endWeek(c, w);
    expect(rang.phone?.round).toBe(2);
    const n = answerPhone(c, rang, 'down');
    const log = n.log[1];
    expect(at(log, 'You backed down at Driftholm. They are MASSING.')).toBeLessThan(at(log, 'Driftholm has fallen.'));
    expect(log.visible.some((v) => v.includes('Driftholm taken'))).toBe(false);
    expect(n.fed.step).toBe(3);
    expect(brokenInvariants(n)).toEqual([]);
  });

  it('BACK IT, held: the backing, then the place the step down quiets (one that fell in an earlier week)', () => {
    const s = promised(staged(toVsy), 'VSY');
    s.fed.step = 3;
    s.week = 2;
    s.log = [{ week: 1, visible: [], hidden: [], acts: [], danger: { war: 1, treaty: 50, step: 3 } }];
    fellBefore(s, 'KLP', 1, 1);
    const n = answerPhone(c, endWeek(c, s), 'back');
    const log = n.log[1];
    expect(at(log, 'You backed Vessary. They turned away. They are PUSHING.')).toBeLessThan(at(log, 'Guns quiet at Kelpmouth.'));
    expect(brokenInvariants(n)).toEqual([]);
  });

  it('a far back that holds answers the place that week; one that fails says so before the place falls', () => {
    let held = 0;
    let failed = 0;
    for (let i = 0; i < 60 && !(held && failed); i++) {
      const s = promised(staged(toLtl, `far-${i}`), 'LTL');
      s.regions.LTL = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0 };
      const n = answerPhone(c, endWeek(c, s), 'back');
      const log = n.log[0];
      if (n.promises.some((p) => p.region === 'LTL')) {
        held++;
        // "It held": its clock starts again, so the same week never prints "Lintel has fallen".
        expect(log.visible).toContain('You backed Lintel from far away, and it held. They are TESTING.');
        expect(log.visible).not.toContain('Lintel has fallen.');
        expect(n.regions.LTL).toMatchObject({ state: 'pressed', pressedWeeks: 0 });
      } else {
        failed++;
        expect(at(log, 'You backed Lintel from too far away. It failed.')).toBeLessThan(at(log, 'Lintel has fallen.'));
      }
      expect(brokenInvariants(n)).toEqual([]);
    }
    expect(held).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
  });

  it('a way out accepted in a week a place fell: the fall, their acceptance, then an older place back; the new fall stays', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const s = staged([], `wo-${i}`);
      s.week = 4;
      s.fed.step = 2;
      s.fed.appetite = 0.2;
      s.fed.will = 70;
      s.treaty = 70;
      s.log = [1, 2, 3].map((w) => ({ week: w, visible: [], hidden: [], acts: [], danger: { war: 1, treaty: 60, step: 2 as const } }));
      fellBefore(s, 'KLP', 2, 1);
      s.regions.TLM = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
      const offered = offerWayOut(s, 'summit');
      if (!offered.ok) throw new Error(offered.reason);
      let n = endWeek(c, offered.state);
      while (n.phase === 'phone') n = answerPhone(c, n, 'wait');
      const log = n.log[n.log.length - 1];
      if (!log.visible.some((v) => v.startsWith('Wintermast accepted'))) continue;
      found = true;
      const fell = at(log, 'Tallowmere has fallen.');
      const accepted = log.visible.findIndex((v) => v.startsWith('Wintermast accepted'));
      const quiet = at(log, 'Guns quiet at Kelpmouth.');
      expect(fell).toBeLessThan(accepted);
      expect(accepted).toBeLessThan(quiet);
      expect(n.regions.TLM.state).toBe('fighting');
      expect(log.visible.some((v) => v.startsWith('A quiet week'))).toBe(false);
      expect(brokenInvariants(n)).toEqual([]);
    }
    expect(found).toBe(true);
  });

  it('their summit accepted: the acceptance, then the place it returns', () => {
    let found = false;
    for (let i = 0; i < 60 && !found; i++) {
      const s = staged([], `sum-${i}`);
      s.week = 4;
      s.fed.will = 60;
      s.treaty = 60;
      s.fed.step = 2;
      s.log = [1, 2, 3].map((w) => ({ week: w, visible: [], hidden: [], acts: [], danger: { war: 1, treaty: 55, step: 2 as const } }));
      fellBefore(s, 'KLP', 2, 1);
      const rang = endWeek(c, s);
      if (rang.phase !== 'phone' || rang.phone!.kind !== 'summit') continue;
      found = true;
      const n = answerPhone(c, rang, 'back');
      const log = n.log[n.log.length - 1];
      expect(at(log, 'You accepted the summit. They are TESTING.')).toBeLessThan(at(log, 'Guns quiet at Kelpmouth.'));
      expect(log.acts).toContain('You accepted their summit.');
      expect(brokenInvariants(n)).toEqual([]);
    }
    expect(found).toBe(true);
  });

  it('the spread: the falls of the week first, then the places it spread to; a place that came back this week is spared', () => {
    const s = staged([], 'spread');
    s.week = 3;
    s.fed.step = 5;
    s.log = [1, 2].map((w) => ({ week: w, visible: [], hidden: [], acts: [], danger: { war: 1, treaty: 50, step: 5 as const } }));
    fellBefore(s, 'KLP', 1, 1);
    s.regions.TLM = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'wait');
    const log = n.log.find((w) => w.week === 3)!;
    const falls = log.beats!.map((b, i) => (b.kind === 'fell' ? i : -1)).filter((i) => i >= 0);
    const spreads = log.beats!.map((b, i) => (b.kind === 'spread' ? i : -1)).filter((i) => i >= 0);
    expect(falls.length).toBeGreaterThan(0);
    expect(spreads.length).toBe(RULES.spreadByStep[5]);
    expect(Math.max(...falls)).toBeLessThan(Math.min(...spreads));
    expect(brokenInvariants(n)).toEqual([]);
  });
});

describe('the WAR boxes match the sheet in every state', () => {
  it('a state returned mid-week (phase "phone") carries the places that fell before the call', () => {
    // Vessary was waited on last week and its clock has run down: it falls as the week opens. Then their push
    // tests the promise at Lintel and the phone rings, with Vessary already counted.
    const s = promised(staged(toLtl), 'LTL');
    s.week = 2;
    s.fed.step = 2;
    s.log = [{ week: 1, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 2 } }];
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    s.pendingTest = 'VSY';
    s.pendingRound = 2;
    const rang = endWeek(c, s);
    expect(rang.phase).toBe('phone');
    expect(rang.regions.VSY.state).toBe('fighting');
    expect(rang.war).toBe(1);
    const log = rang.log[rang.log.length - 1];
    expect(log.beats![at(log, 'You waited too long. Vessary has fallen.')].war).toBe(1);
  });
  it('the answer that loses a place counts it at once', () => {
    const s = promised(staged(toLtl), 'LTL');
    s.fed.jumpiness = 0.3;
    const n = answerPhone(c, endWeek(c, s), 'down');
    expect(n.war).toBe(1);
    expect(n.war).toBe(Object.values(n.regions).filter((r) => r.state === 'fighting').length);
  });
});

describe('WORLD WAR names the first place that fell and stayed fallen', () => {
  it('a place that fell first and came back in a later week is not named', () => {
    const s = staged([], 'ww');
    s.week = 5;
    s.fed.step = 5;
    // Shoal fell first (seq 1) and came back; Gullrest (seq 2) has been fighting since.
    s.regions.SHL = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, fellWeek: 1, fellSeq: 1, recoveredWeek: 2 };
    s.regions.GUL = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 2, fellSeq: 2, fellBy: 'unanswered' };
    for (const [i, r] of ['KLP', 'BRK', 'LTL', 'TLM', 'DNM', 'ORN'].entries()) s.regions[r] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 3, fellSeq: 3 + i, fellBy: 'unanswered' };
    s.war = 7;
    expect(firstFallen(s)).toBe('GUL');
  });
});
