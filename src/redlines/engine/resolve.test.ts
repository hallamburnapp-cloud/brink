import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { acceptWayOut, crossesLine } from './agent.ts';
import { answerPhone, endWeek, offerWayOut, promise } from './run.ts';
import { RULES } from './rules.ts';
import { FIXTURE_CONTENT, fixtureGame } from './testkit.ts';
import type { GameState, Heading, RegionId } from './types.ts';

const c = FIXTURE_CONTENT;
const TEST_KINDS = ['test', 'test-inherited', 'feint'];

/** A week-1 state with no inherited promises, the pieces at home, their arrows where the test wants them. */
function staged(headings: Heading[], seed = 'stage'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.headings = headings;
  // Lines none of these tests cross unless they mean to (the Scatter's, and the missiles line).
  s.fed.lines = [
    { id: 'lantern-key', text: 'Lantern Key is not yours to defend.', real: true },
    { id: 'scatter-fleet', text: "Republic warships in the Scatter's waters will be met.", real: true },
    { id: 'missiles-north', text: 'No missiles north of Edda Vale.', real: false },
  ];
  s.collision = '';
  return s;
}
const toVsy: Heading[] = [
  { from: 'NWK', to: 'VSY', real: true },
  { from: 'KLM', to: 'KLP', real: false },
];
const toLtl: Heading[] = [
  { from: 'KLM', to: 'LTL', real: true },
  { from: 'GLM', to: 'DRF', real: false },
];
const feintVsy: Heading[] = [
  { from: 'KLM', to: 'KLP', real: true },
  { from: 'NWK', to: 'VSY', real: false },
];
const quiet: Heading[] = [
  { from: 'KLM', to: 'KLP', real: true },
  { from: 'GLM', to: 'DRF', real: false },
];

function promised(s: GameState, region: RegionId): GameState {
  const r = promise(s, region);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('a test of a promise', () => {
  it('rings the phone when their real push lands on a promise; a solid promise costs 12, a dashed one 24', () => {
    const solid = endWeek(c, promised(staged(toVsy), 'VSY'));
    expect(solid.phase).toBe('phone');
    expect(TEST_KINDS).toContain(solid.phone!.kind);
    expect(solid.phone!.region).toBe('VSY');
    expect(solid.phone!.round).toBe(1);
    expect(solid.phone!.options.map((o) => o.key)).toEqual(['back', 'down', 'wait']);
    expect(solid.phone!.options[0].cost).toContain('12');
    expect(solid.pendingTest).toBe('VSY');
    expect(solid.log[0].visible).toContain('They are testing your promise at Vessary.');
    const dashed = endWeek(c, promised(staged(toLtl), 'LTL'));
    expect(dashed.phase).toBe('phone');
    expect(dashed.phone!.options[0].cost).toContain('24');
    for (const o of dashed.phone!.options) expect(o.cost).not.toMatch(/\{/);
    expect(dashed.phone!.text).not.toMatch(/\{/);
  });
  it('BACK IT on a solid promise: pays, belief +15, they turn away, the place stays as it was', () => {
    const rang = endWeek(c, promised(staged(toVsy), 'VSY'));
    const s = answerPhone(c, rang, 'back');
    expect(s.phase).toBe('act');
    expect(s.week).toBe(2);
    expect(s.fed.belief).toBe(RULES.beliefStart + RULES.backedBelief);
    expect(s.influence).toBe(RULES.influenceStart - RULES.promiseCost - RULES.backCost + RULES.income - RULES.upkeep);
    expect(s.regions.VSY.state).toBe('calm');
    expect(s.promises.map((p) => p.region)).toEqual(['VSY']);
    expect(s.turnedAway.VSY).toBe(1);
    expect(s.lastBacked).toBe('VSY');
    expect(s.pendingTest).toBeNull();
    expect(s.fed.step).toBe(1);
    expect(s.log[0].visible.some((v) => v.startsWith('You backed Vessary'))).toBe(true);
    expect(s.log[0].hidden.some((h) => h.includes('They meant it at Vessary'))).toBe(true);
    // They leave the place alone for a while.
    expect(s.fed.headings.every((h) => h.to !== 'VSY')).toBe(true);
  });
  it('BACK IT costs 6 once they believe you', () => {
    const s = promised(staged(toVsy), 'VSY');
    s.fed.belief = RULES.believedAt;
    const rang = endWeek(c, s);
    expect(rang.phone!.options[0].cost).toContain('6');
    const after = answerPhone(c, rang, 'back');
    expect(after.influence).toBe(RULES.influenceStart - RULES.promiseCost - RULES.backCostBelieved + RULES.income - RULES.upkeep);
  });
  it('BACK DOWN: belief −15, the promise is gone, the place is pressed, they climb a step', () => {
    const rang = endWeek(c, promised(staged(toVsy), 'VSY'));
    const s = answerPhone(c, rang, 'down');
    expect(s.fed.belief).toBe(RULES.beliefStart - RULES.backDownBelief);
    expect(s.promises).toEqual([]);
    expect(s.regions.VSY.state).toBe('pressed');
    expect(s.regions.VSY.fellBy).toBe('back-down');
    expect(s.fed.step).toBe(2);
    expect(s.log[0].visible.some((v) => v.startsWith('You backed down at Vessary'))).toBe(true);
    expect(s.log[0].hidden.some((h) => h.includes('You backed down, and they climbed a step'))).toBe(true);
  });
  it('WAIT carries the test with the stakes up; the third WAIT is backing down', () => {
    const rang = endWeek(c, promised(staged(toVsy), 'VSY'));
    const w1 = answerPhone(c, rang, 'wait');
    expect(w1.fed.belief).toBe(RULES.beliefStart - RULES.waitBelief);
    expect(w1.regions.VSY.state).toBe('pressed');
    expect(w1.pendingTest).toBe('VSY');
    expect(w1.pendingRound).toBe(2);
    expect(w1.week).toBe(2);
    const rang2 = endWeek(c, w1);
    expect(rang2.phase).toBe('phone');
    expect(rang2.phone!.round).toBe(2);
    expect(rang2.phone!.region).toBe('VSY');
    expect(rang2.phone!.options[0].cost).toContain(String(RULES.backCost + RULES.waitStakes));
    const w2 = answerPhone(c, rang2, 'wait');
    const rang3 = endWeek(c, w2);
    expect(rang3.phone!.round).toBe(3);
    expect(rang3.phone!.options[2].cost).toBe(c.strings.words.waitIsBackDown);
    const w3 = answerPhone(c, rang3, 'wait');
    expect(w3.promises).toEqual([]);
    expect(w3.pendingTest).toBeNull();
    expect(w3.fed.step).toBeGreaterThanOrEqual(2);
  });
  it('a dashed promise backed from too far away fails about one time in three', () => {
    let failed = 0;
    const n = 240;
    for (let i = 0; i < n; i++) {
      const rang = endWeek(c, promised(staged(toLtl, `far-${i}`), 'LTL'));
      expect(rang.phase).toBe('phone');
      const s = answerPhone(c, rang, 'back');
      expect(s.influence).toBe(RULES.influenceStart - RULES.promiseCost - RULES.backFarCost + RULES.income - RULES.upkeep * s.promises.length);
      if (s.promises.length === 0) {
        failed++;
        expect(s.fed.belief).toBe(RULES.beliefStart - RULES.failedBelief);
        expect(s.regions.LTL.state).toBe('pressed');
        expect(s.log[0].visible.some((v) => v.includes('too far away'))).toBe(true);
      } else {
        // Held: but backing what you could not hold teaches them nothing and does not turn them away.
        expect(s.fed.belief).toBe(RULES.beliefStart + RULES.backedFarBelief);
        expect(s.turnedAway.LTL).toBeUndefined();
      }
    }
    expect(failed / n).toBeGreaterThan(0.22);
    expect(failed / n).toBeLessThan(0.45);
  });
  it('cannot be backed without the influence; the UI asks canAnswer first', () => {
    const s = promised(staged(toLtl), 'LTL');
    s.influence = 10;
    const rang = endWeek(c, s);
    expect(rang.phase).toBe('phone');
    expect(answerPhone(c, rang, 'back')).toBe(rang);
    const down = answerPhone(c, rang, 'down');
    expect(down.phase).toBe('act');
  });
});

describe('a feint at a promised place', () => {
  it('rings like a real test; WAIT lets it lapse; BACK DOWN still climbs; BACK IT still earns belief but no step', () => {
    const rang = endWeek(c, promised(staged(feintVsy), 'VSY'));
    expect(rang.phase).toBe('phone');
    expect(TEST_KINDS).toContain(rang.phone!.kind);
    const waited = answerPhone(c, rang, 'wait');
    expect(waited.pendingTest).toBeNull();
    expect(waited.regions.VSY.state).toBe('calm');
    expect(waited.log[0].hidden.some((h) => h.includes('bluffing at Vessary'))).toBe(true);
    const down = answerPhone(c, rang, 'down');
    expect(down.fed.step).toBe(2);
    expect(down.regions.VSY.state).toBe('calm');
    expect(down.promises).toEqual([]);
    expect(down.log[0].hidden.some((h) => h.includes('Backing it would have cost nothing'))).toBe(true);
    const s = promised(staged(feintVsy), 'VSY');
    s.fed.step = 2;
    const backed = answerPhone(c, endWeek(c, s), 'back');
    expect(backed.fed.belief).toBe(RULES.beliefStart + RULES.backedBelief);
    expect(backed.fed.step).toBe(2); // no step down for a feint
    expect(backed.log[0].hidden.some((h) => h.includes('You backed it anyway'))).toBe(true);
  });
  it('a feint at an unpromised place is a column that stops short', () => {
    const s = endWeek(c, staged(feintVsy));
    expect(s.regions.VSY.state).toBe('calm');
    expect(s.regions.KLP.state).toBe('pressed');
    expect(s.log[0].visible).toContain('Their column near Vessary stopped short.');
    expect(s.log[0].hidden.some((h) => h.includes('was a feint'))).toBe(true);
  });
});

describe('places', () => {
  function pressedUnanswered(seed = 'fall'): GameState {
    const s = staged(quiet, seed);
    s.regions.TLM = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    s.fed.headings = [
      { from: 'KLM', to: 'KLP', real: true },
      { from: 'GLM', to: 'DRF', real: false },
    ];
    return s;
  }
  /** A week with their arrows pinned where the test put them, and any event answered without effect. */
  function week(s: GameState): GameState {
    const pinned = s.fed.headings;
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'wait');
    if (n.phase === 'act') n.fed.headings = pinned;
    return n;
  }
  it('a pressed place falls after three weeks unanswered at TESTING', () => {
    let s = pressedUnanswered();
    s = week(s);
    expect(s.regions.TLM.state).toBe('pressed');
    expect(s.regions.TLM.pressedWeeks).toBe(1);
    s = week(s);
    expect(s.regions.TLM.state).toBe('pressed');
    s = week(s);
    expect(s.regions.TLM.state).toBe('fighting');
    expect(s.regions.TLM.fellWeek).toBe(3);
    expect(s.war).toBe(1);
    expect(s.fed.step).toBe(2);
    expect(s.log[2].visible).toContain('Tallowmere has fallen.');
    expect(s.log[2].visible).toContain('A place taken and nobody came. They are PUSHING.');
    expect(s.log[2].hidden.some((h) => h.includes('You left Tallowmere unanswered'))).toBe(true);
    expect(s.log[2].danger.treaty).toBeLessThan(s.log[1].danger.treaty);
  });
  it('falls after one week from MASSING', () => {
    const s = pressedUnanswered();
    s.fed.step = 3;
    const n = week(s);
    expect(n.regions.TLM.state).toBe('fighting');
  });
  it('a piece standing in a pressed place answers it, and two quiet weeks make it calm', () => {
    const s = pressedUnanswered();
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    s.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    let n = week(s);
    expect(n.regions.VSY.state).toBe('pressed');
    expect(n.regions.VSY.quietWeeks).toBe(1);
    n = week(n);
    expect(n.regions.VSY.state).toBe('calm');
    expect(n.regions.VSY.recoveredWeek).toBe(2);
    expect(n.log[1].visible).toContain('Vessary is calm again.');
  });
  it('a solid promise on a pressed place pauses its clock; a dashed one does not', () => {
    const s = pressedUnanswered();
    s.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    s.promises = [
      { region: 'VSY', since: 1, inherited: false },
      { region: 'TLM', since: 1, inherited: false },
    ];
    const n = week(s);
    expect(n.regions.VSY.quietWeeks).toBe(1);
    expect(n.regions.VSY.pressedWeeks).toBe(0);
    expect(n.regions.TLM.pressedWeeks).toBe(1);
  });
  it('the fighting spreads at FIGHTING, and rolls over promises at ALL-OUT', () => {
    const s = staged(quiet);
    s.fed.step = 4;
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    s.fed.headings = [{ from: 'KLP', to: 'LTL', real: true }];
    const n = week(s);
    expect(n.log[0].visible.some((v) => v.includes('spread to'))).toBe(true);
    expect(n.war).toBeGreaterThan(1);
    const all = staged(quiet);
    all.fed.step = 5;
    all.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    all.promises = [{ region: 'BRK', since: 1, inherited: false }];
    all.pieces = [
      { kind: 'fleet', at: 'TLM' },
      { kind: 'brigade', at: 'EDV' },
    ];
    all.fed.headings = [{ from: 'KLP', to: 'LTL', real: true }];
    const m = week(all);
    expect(m.regions.BRK.state).toBe('fighting'); // a promise does not stop ALL-OUT
    expect(m.regions.TLM.state).not.toBe('fighting'); // the fleet standing in it does
  });
  it('a step down quiets the place that fell most recently', () => {
    const s = promised(staged(toVsy), 'VSY');
    s.fed.step = 3;
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    s.regions.LTL = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 1 };
    const rang = endWeek(c, s);
    const n = answerPhone(c, rang, 'back');
    expect(n.fed.step).toBe(2);
    expect(n.regions.LTL.state).toBe('pressed');
    expect(n.regions.KLP.state).toBe('fighting');
    expect(n.log[0].visible).toContain('Guns quiet at Lintel.');
  });
});

describe('their lines', () => {
  it('a real line crossed climbs a step and says so; a bluff crossed makes them believe you more and says nothing', () => {
    const s = staged(quiet);
    s.fed.lines = [
      { id: 'sound-forces', text: 'Republic forces in the Sound would be a grave matter.', real: true },
      { id: 'cap-lanes', text: 'The sea lanes to the Cap stay open. A fleet across them is a blockade.', real: false },
      { id: 'missiles-north', text: 'No missiles north of Edda Vale.', real: false },
    ];
    s.pieces = [
      { kind: 'fleet', at: 'LTL' },
      { kind: 'brigade', at: 'EDV' },
    ];
    expect(crossesLine(s, c.lines.find((l) => l.id === 'sound-forces')!)).toBe('LTL');
    expect(crossesLine(s, c.lines.find((l) => l.id === 'missiles-north')!)).toBeNull();
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'back');
    expect(n.fed.step).toBe(2);
    expect(n.crossed['sound-forces']).toBe(1);
    expect(n.log[0].visible.some((v) => v.includes('You have crossed our line') && v.includes('grave matter'))).toBe(true);
    expect(n.log[0].hidden.some((h) => h.includes('That line was real'))).toBe(true);
    // Crossed once; staying across it costs nothing more.
    let m = endWeek(c, n);
    while (m.phase === 'phone') m = answerPhone(c, m, 'back');
    expect(m.fed.step).toBeLessThanOrEqual(3);
    expect(m.log[1].visible.some((v) => v.includes('You have crossed our line'))).toBe(false);

    const bluff = staged(quiet);
    bluff.fed.lines = [
      { id: 'sound-forces', text: 'Republic forces in the Sound would be a grave matter.', real: false },
      { id: 'cap-lanes', text: 'x', real: true },
      { id: 'missiles-north', text: 'y', real: true },
    ];
    bluff.pieces = [
      { kind: 'fleet', at: 'LTL' },
      { kind: 'brigade', at: 'EDV' },
    ];
    let b = endWeek(c, bluff);
    const hidden = [...b.log[0].hidden];
    while (b.phase === 'phone') b = answerPhone(c, b, 'back');
    expect(b.fed.step).toBe(1);
    expect(b.fed.belief).toBeGreaterThanOrEqual(RULES.beliefStart + RULES.bluffBelief - RULES.waitBelief);
    expect(hidden.some((h) => h.includes('That line was a bluff'))).toBe(true);
    expect(b.log[0].visible.some((v) => v.includes('crossed our line'))).toBe(false);
  });
  it('an alliance line is crossed by a promise', () => {
    const s = staged(quiet);
    s.fed.lines = [{ id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true }, { id: 'cap-lanes', text: 'x', real: false }, { id: 'missiles-north', text: 'y', real: false }];
    s.promises = [{ region: 'BRN', since: 0, inherited: true }];
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.fed.step).toBe(2);
    expect(n.log[0].hidden.some((h) => h.includes('your promise at Brindle Coast'))).toBe(true);
  });
});

describe('a way out', () => {
  const stub = (x: number) => ({ next: () => x }) as unknown as Rng;
  it('is refused while they are gaining, and a refusal humiliates them', () => {
    const s = staged(quiet);
    s.fed.step = 3;
    s.week = 3;
    expect(acceptWayOut(s, { term: 'summit', detail: null, price: 20 }, 2, stub(0.01))).toMatchObject({ accept: false, why: 'gaining' });
    expect(acceptWayOut({ ...s, week: 2 }, { term: 'summit', detail: null, price: 20 }, 0, stub(0.01))).toMatchObject({ accept: false, why: 'noNeed' });
    const m = staged(quiet);
    m.fed.step = 3;
    m.week = 3;
    m.regions.TLM = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    m.regions.DNM = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    const offered = offerWayOut(m, 'summit');
    if (!offered.ok) throw new Error(offered.reason);
    let n = endWeek(c, offered.state);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.log[0].visible.some((v) => v.startsWith('Wintermast refused the way out'))).toBe(true);
    expect(n.log[0].hidden.some((h) => h.includes('still gaining'))).toBe(true);
  });
  it('a summit is likelier the higher the ladder, when they are blocked, and for a careful Federation', () => {
    const low = staged(quiet);
    low.fed.step = 1;
    low.week = 3;
    const high = staged(quiet);
    high.fed.step = 4;
    high.week = 3;
    const hungry = staged(quiet);
    hungry.fed.step = 4;
    hungry.week = 3;
    hungry.fed.appetite = 0.8;
    const offer = { term: 'summit' as const, detail: null, price: 20 };
    expect(acceptWayOut(low, offer, 0, stub(0.5)).chance).toBeLessThan(acceptWayOut(high, offer, 0, stub(0.5)).chance);
    expect(acceptWayOut(hungry, offer, 0, stub(0.5)).chance).toBeLessThan(acceptWayOut(high, offer, 0, stub(0.5)).chance);
  });
  it('dropping a promise they minded is likely taken; one drawn this week is seen through', () => {
    const s = staged(toLtl);
    s.week = 3;
    s.promises = [{ region: 'LTL', since: 2, inherited: false }];
    const minded = acceptWayOut(s, { term: 'drop-promise', detail: 'LTL', price: 10 }, 0, stub(0.5));
    expect(minded.chance).toBeGreaterThan(0.6);
    s.promises = [{ region: 'LTL', since: 3, inherited: false }];
    const fresh = acceptWayOut(s, { term: 'drop-promise', detail: 'LTL', price: 10 }, 0, stub(0.5));
    expect(fresh.chance).toBeLessThan(0.4);
  });
  it('accepted: +15 on the bar, a step down, the term kept; the price is paid at the offer', () => {
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      const s = staged(quiet, `wo-${i}`);
      s.fed.step = 4;
      s.fed.will = 60;
      s.treaty = 60;
      s.week = 3;
      s.pieces = [
        { kind: 'fleet', at: 'KLP' },
        { kind: 'brigade', at: 'EDV' },
      ];
      const offered = offerWayOut(s, 'pull-back', 'fleet');
      if (!offered.ok) throw new Error(offered.reason);
      expect(offered.state.influence).toBe(s.influence - RULES.wayOutPrice['pull-back']);
      let n = endWeek(c, offered.state);
      while (n.phase === 'phone') n = answerPhone(c, n, 'down');
      if (n.log[0].visible.some((v) => v.startsWith('Wintermast accepted the way out'))) {
        found = true;
        expect(n.waysOut).toBe(1);
        expect(n.fed.step).toBeLessThanOrEqual(4);
        expect(n.pieces.find((p) => p.kind === 'fleet')!.at).toBe('ASK');
        expect(n.log[0].hidden.some((h) => h.includes('took the way out'))).toBe(true);
      }
    }
    expect(found).toBe(true);
  });
});

describe('the bars and the endings', () => {
  it('a quiet week is +5; a place taken is −5 and no +5', () => {
    const s = staged(quiet);
    const n = endWeek(c, s);
    expect(n.treaty).toBe(RULES.willStart + RULES.willQuiet);
    expect(n.log[0].visible).toContain('A quiet week. They gained nothing.');
  });
  it('WORLD WAR at the eighth place (RULES.warLimit), score 0, and it says where it began', () => {
    const s = staged(quiet);
    s.fed.step = 3;
    const fighting = ['GUL', 'DRF', 'TRN', 'LNK', 'PBB', 'SHL', 'KLP', 'BRK', 'LTL', 'DNM', 'ORN'].slice(0, RULES.warLimit - 1);
    fighting.forEach((r, i) => (s.regions[r] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: i === 0 ? 1 : 2, fellBy: i === 0 ? 'back-down-inherited' : 'unanswered' }));
    s.regions.TLM = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    s.war = fighting.length;
    s.week = 5;
    s.fed.headings = [{ from: 'LTL', to: 'TLM', real: true }];
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.phase).toBe('ended');
    expect(n.ending).toMatchObject({ kind: 'war', week: 5, score: 0 });
    expect(n.ending!.fighting).toBeGreaterThanOrEqual(RULES.warLimit);
    expect(n.ending!.lines[0]).toBe('Week 5.');
    expect(n.ending!.lines[1]).toBe('It began at Gullrest, when the promise you inherited was tested and you backed down.');
    expect(n.ending!.dials).toMatch(/^They were .* and .*\.$/);
    expect(n.log[n.log.length - 1].hidden[n.log[n.log.length - 1].hidden.length - 1]).toBe(n.ending!.dials);
  });
  it('TREATY at 100 when no place fell this week; a fall the same week holds it off', () => {
    const s = staged(quiet);
    s.fed.will = 95;
    s.treaty = 95;
    s.week = 6;
    s.lastBacked = 'VSY';
    s.waysOut = 1;
    const n = endWeek(c, s);
    expect(n.phase).toBe('ended');
    expect(n.ending).toMatchObject({ kind: 'treaty', week: 6, fighting: 0, score: 100 - 60 });
    expect(n.ending!.lines[0]).toBe('Signed in week 6 with no place fighting.');
    expect(n.ending!.lines[1]).toBe('They stopped because they could not take Vessary and you gave them a way out.');
    const held = staged(quiet);
    held.fed.will = 100;
    held.treaty = 100;
    held.week = 6;
    held.regions.TLM = { state: 'pressed', pressedWeeks: 3, quietWeeks: 0 };
    let m = endWeek(c, held);
    while (m.phase === 'phone') m = answerPhone(c, m, 'down');
    expect(m.regions.TLM.state).toBe('fighting');
    expect(m.ending).toBeNull();
    expect(m.week).toBe(7);
  });
  it('FROZEN when week 8 ends with neither', () => {
    const s = staged(quiet);
    s.week = 8;
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 5 };
    s.war = 1;
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.ending).toMatchObject({ kind: 'frozen', week: 8 });
    expect(n.ending!.lines[0]).toBe('Nothing was signed.');
    expect(n.ending!.lines[1]).toMatch(/still fighting\.$/);
    expect(n.ending!.score).toBe(9 - n.ending!.fighting);
  });
  it('another bloc signs in quiet weeks, at most twice', () => {
    let signedMax = 0;
    for (let i = 0; i < 30; i++) {
      let s = staged(quiet, `bloc-${i}`);
      for (let w = 0; w < 8 && s.phase !== 'ended'; w++) {
        s = endWeek(c, s);
        while (s.phase === 'phone') s = answerPhone(c, s, 'down');
      }
      signedMax = Math.max(signedMax, s.signed);
      expect(s.signed).toBeLessThanOrEqual(RULES.maxBlocs);
    }
    expect(signedMax).toBe(RULES.maxBlocs);
  });
});
