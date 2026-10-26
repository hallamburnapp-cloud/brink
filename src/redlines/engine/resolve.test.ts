import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { acceptWayOut, crossesLine, promiseMinded } from './agent.ts';
import { couldHaveReached } from './board.ts';
import { firstFallen } from './debrief.ts';
import { answerPhone, endWeek, movePiece, offerWayOut, promise } from './run.ts';
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
  it('rings like a real test; WAIT lets it lapse and next week the tape says the column went home; BACK DOWN still climbs; BACK IT earns nothing', () => {
    const rang = endWeek(c, promised(staged(feintVsy), 'VSY'));
    expect(rang.phase).toBe('phone');
    expect(TEST_KINDS).toContain(rang.phone!.kind);
    const waited = answerPhone(c, rang, 'wait');
    expect(waited.pendingTest).toBeNull();
    expect(waited.regions.VSY.state).toBe('calm');
    expect(waited.feintGone).toBe('VSY');
    expect(waited.log[0].hidden.some((h) => h.includes('bluffing at Vessary'))).toBe(true);
    // WAIT bought information: the next week's tape says the column at Vessary has gone home.
    waited.fed.headings = quiet;
    let next = endWeek(c, waited);
    while (next.phase === 'phone') next = answerPhone(c, next, 'down');
    expect(next.log[1].visible).toContain('Their column near Vessary has gone home.');
    expect(next.feintGone).toBeNull();
    const down = answerPhone(c, rang, 'down');
    expect(down.fed.step).toBe(2);
    expect(down.regions.VSY.state).toBe('calm');
    expect(down.promises).toEqual([]);
    expect(down.log[0].hidden.some((h) => h.includes('Backing it would have cost nothing'))).toBe(true);
    // SPEC-SMALL: backing a feint earns nothing: no belief, no turn-away, not the treaty's "could not take X", but the price.
    const s = promised(staged(feintVsy), 'VSY');
    s.fed.step = 2;
    const backed = answerPhone(c, endWeek(c, s), 'back');
    expect(backed.fed.belief).toBe(RULES.beliefStart + RULES.backedFeintBelief);
    expect(backed.fed.step).toBe(2); // no step down for a feint
    expect(backed.turnedAway.VSY).toBeUndefined();
    expect(backed.lastBacked).toBeNull();
    expect(backed.influence).toBe(RULES.influenceStart - RULES.promiseCost - RULES.backCost + RULES.income - RULES.upkeep);
    expect(backed.log[0].hidden.some((h) => h.includes('They were bluffing at Vessary'))).toBe(true);
    expect(backed.tally!.feintsBacked).toBe(1);
  });
  it('a feint at an unpromised place is a column that stops short; the debrief mentions it only when you acted on it', () => {
    const s = endWeek(c, staged(feintVsy));
    expect(s.regions.VSY.state).toBe('calm');
    expect(s.regions.KLP.state).toBe('pressed');
    expect(s.log[0].visible).toContain('Their column near Vessary stopped short.');
    expect(s.log[0].hidden.some((h) => h.includes('was a feint'))).toBe(false);
    // Moving the brigade up to meet the feint: that changed something, so the debrief says it was for show.
    const moved = movePiece(staged(feintVsy), 'brigade', 'VSY');
    if (!moved.ok) throw new Error(moved.reason);
    const m = endWeek(c, moved.state);
    expect(m.log[0].hidden.some((h) => h.includes('was a feint'))).toBe(true);
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
  it('a pressed place out of reach falls after three weeks unanswered at TESTING without a step, and the tape says so', () => {
    let s = pressedUnanswered();
    s = week(s);
    expect(s.regions.TLM.state).toBe('pressed');
    expect(s.regions.TLM.pressedWeeks).toBe(1);
    s = week(s);
    expect(s.regions.TLM.state).toBe('pressed');
    s = week(s);
    expect(s.regions.TLM.state).toBe('fighting');
    expect(s.regions.TLM.fellWeek).toBe(3);
    expect(s.regions.TLM.fellSeq).toBe(1);
    expect(s.regions.TLM.fellReach).toBe(false);
    expect(s.war).toBe(1);
    // Tallowmere is inland in the Sound: the brigade cannot get there at all, so nothing of yours could have reached it.
    expect(s.fed.step).toBe(1);
    expect(s.log[2].visible).toContain('Tallowmere has fallen.');
    expect(s.log[2].visible).toContain('Tallowmere was out of reach. They are still TESTING.');
    expect(s.log[2].visible.some((v) => v.includes('nobody came'))).toBe(false);
    expect(s.log[2].hidden.some((h) => h.includes('Nothing of yours could reach Tallowmere'))).toBe(true);
    expect(s.log[2].danger.treaty).toBeLessThan(s.log[1].danger.treaty);
    expect(s.tally!.outOfReach).toBe(1);
  });
  it('a pressed place something of yours could have reached falls with one step up that names it', () => {
    // Vessary is one move from the brigade at Edda Vale: a promise there would have been solid.
    let s = staged(quiet);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    s = week(s);
    s = week(s);
    s = week(s);
    expect(s.regions.VSY.state).toBe('fighting');
    expect(s.regions.VSY.fellReach).toBe(true);
    expect(s.fed.step).toBe(2);
    expect(s.log[2].visible).toContain('Vessary taken and nobody came. They are PUSHING.');
    expect(s.log[2].hidden.some((h) => h.includes('You left Vessary unanswered'))).toBe(true);
  });
  it('"could have reached" counts the weeks a place stood pressed: the fleet could sail to a Sound port in that time', () => {
    const s = staged(quiet);
    s.pieces = [
      { kind: 'fleet', at: 'TRN' },
      { kind: 'brigade', at: 'EDV' },
    ];
    // Kelpmouth is four fleet moves from Tern Isle (Lantern Key, Shoal, Lintel, then alongside): three weeks pressed and a week's warning.
    expect(couldHaveReached(s, 'KLP', 3)).toBe(true);
    expect(couldHaveReached(s, 'KLP', 1)).toBe(false);
    // Brackwater is inland: no piece can ever get there.
    expect(couldHaveReached(s, 'BRK', 8)).toBe(false);
    // Vessary is within one move of the brigade: reachable at once.
    expect(couldHaveReached(s, 'VSY', 0)).toBe(true);
  });
  it('two places taken in a week climb one step, not two', () => {
    let s = staged(quiet);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0 };
    s.regions.RMH = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0 };
    s = week(s);
    expect(s.regions.VSY.state).toBe('fighting');
    expect(s.regions.RMH.state).toBe('fighting');
    expect(s.fed.step).toBe(2);
    expect(s.log[0].visible).toContain('two places taken and nobody came. They are PUSHING.');
    expect(s.log[0].visible.filter((v) => v.includes('nobody came'))).toHaveLength(1);
  });
  it('the fall clock reads the step the week started at, not a step climbed inside the week', () => {
    // Vessary pressed one week; a line crossed this week climbs to PUSHING (clock 2), but the clock still reads TESTING's 3.
    const s = staged(quiet);
    s.fed.lines = [
      { id: 'sound-forces', text: 'Republic forces in the Sound would be a grave matter.', real: true },
      { id: 'cap-lanes', text: 'x', real: false },
      { id: 'missiles-north', text: 'y', real: false },
    ];
    s.pieces = [
      { kind: 'fleet', at: 'LTL' },
      { kind: 'brigade', at: 'ASK' },
    ];
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    const n = week(s);
    expect(n.fed.step).toBe(2);
    expect(n.regions.VSY.state).toBe('pressed');
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
  it('the fighting spreads only at FIGHTING (one place) and ALL-OUT (two), never at MASSING; a piece or a solid promise spares a place', () => {
    const massing = staged(quiet);
    massing.fed.step = 3;
    massing.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    massing.fed.headings = [{ from: 'KLP', to: 'LTL', real: true }];
    expect(week(massing).log[0].visible.some((v) => v.includes('spread to'))).toBe(false);
    const s = staged(quiet);
    s.fed.step = 4;
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    s.fed.headings = [{ from: 'KLP', to: 'LTL', real: true }];
    const n = week(s);
    expect(n.log[0].visible.filter((v) => v.includes('spread to'))).toHaveLength(1);
    expect(n.war).toBe(2);
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
    expect(m.log[0].visible.filter((v) => v.includes('spread to'))).toHaveLength(2);
    expect(m.regions.BRK.state).toBe('fighting'); // a dashed promise (nothing in reach) does not spare it
    expect(m.regions.TLM.state).not.toBe('fighting'); // the fleet standing in it does
    const solid = staged(quiet);
    solid.fed.step = 5;
    solid.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    solid.promises = [{ region: 'LTL', since: 1, inherited: false }];
    solid.pieces = [
      { kind: 'fleet', at: 'SHL' },
      { kind: 'brigade', at: 'EDV' },
    ];
    solid.fed.headings = [];
    const q = week(solid);
    expect(q.regions.LTL.state).not.toBe('fighting'); // a solid promise (the fleet one move away) spares it
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
    // The tape names what crossed it and where, then Wintermast's word with the step.
    expect(n.log[0].visible).toContain('the fleet at Lintel crosses a line they drew.');
    expect(n.log[0].visible).toContain("Wintermast: 'You have crossed our line.' They are PUSHING.");
    expect(n.log[0].visible.indexOf('the fleet at Lintel crosses a line they drew.')).toBeLessThan(n.log[0].visible.findIndex((v) => v.includes('crossed our line')));
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
    expect(n.log[0].visible).toContain('your promise at Brindle Coast crosses a line they drew.');
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
    const before = offered.state.treaty;
    let n = endWeek(c, offered.state);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.log[0].visible.some((v) => v.startsWith('Wintermast refused the way out'))).toBe(true);
    // SPEC-SMALL: a refused way out costs nothing on the bar; the tape prints their reason.
    expect(n.log[0].visible).toContain("Wintermast: 'why stop while we are winning'");
    expect(n.treaty).toBe(before - RULES.willPerGain * 2);
    expect(n.log[0].hidden.some((h) => h.includes('still gaining'))).toBe(true);
  });
  it('a far promise cannot be sold: a dropped promise moves them only when it is within their reach or under test', () => {
    const s = staged(quiet);
    s.week = 3;
    // Hearth is on the far side of Farsouth: nothing of yours can reach it, and neither can they.
    s.promises = [{ region: 'HRT', since: 2, inherited: false }];
    expect(promiseMinded(s, 'HRT')).toBe(false);
    expect(acceptWayOut(s, { term: 'drop-promise', detail: 'HRT', price: 10 }, 0, stub(0.5)).chance).toBeLessThan(0.4);
    // Vessary touches the Cap: a promise there is in their way.
    s.promises = [{ region: 'VSY', since: 2, inherited: false }];
    expect(promiseMinded(s, 'VSY')).toBe(true);
    // A promise a real alliance line of theirs covers is a grievance they named in public, however far it is.
    s.fed.lines = [{ id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true }, { id: 'cap-lanes', text: 'x', real: false }, { id: 'missiles-north', text: 'y', real: false }];
    expect(promiseMinded(s, 'HRT', c.lines)).toBe(true);
    expect(promiseMinded(s, 'HRT')).toBe(false);
    expect(acceptWayOut(s, { term: 'drop-promise', detail: 'VSY', price: 10 }, 0, stub(0.5)).chance).toBeGreaterThan(0.6);
    // Refused as indifferent: the tape says so in Wintermast's words, and the closing card has a lesson for it.
    s.promises = [{ region: 'HRT', since: 2, inherited: false }];
    const offered = offerWayOut(s, 'drop-promise', 'HRT');
    if (!offered.ok) throw new Error(offered.reason);
    let n = endWeek(c, offered.state);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    if (n.log[0].visible.some((v) => v.startsWith('Wintermast refused'))) {
      expect(n.log[0].visible).toContain("Wintermast: 'Hearth? a small thing'");
      expect(n.tally!.farDrops).toBe(1);
      expect(n.tally!.farDropFirst).toBe('HRT');
    }
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
        expect(n.pieces.find((p) => p.kind === 'fleet')!.at).toBe('TRN');
        expect(n.log[0].hidden.some((h) => h.includes('took the way out'))).toBe(true);
      }
    }
    expect(found).toBe(true);
  });
});

describe('the bars and the endings', () => {
  it('a quiet week is +5 only when no place you could answer stands pressed and unanswered; a place taken is −5', () => {
    // Kelpmouth pressed: beyond both pieces (nothing of yours can answer it), so the week still counts as quiet.
    const s = staged(quiet);
    const n = endWeek(c, s);
    expect(n.treaty).toBe(RULES.willStart + RULES.willQuiet);
    expect(n.log[0].visible).toContain('A quiet week. They gained nothing.');
    // Vessary pressed and unanswered, one move from the brigade: no +5, and the tape says what is unanswered.
    const held = staged([
      { from: 'NWK', to: 'VSY', real: true },
      { from: 'GLM', to: 'DRF', real: false },
    ]);
    const h = endWeek(c, held);
    expect(h.treaty).toBe(RULES.willStart);
    expect(h.log[0].visible).toContain('Nothing taken. Vessary unanswered.');
    expect(h.log[0].visible.some((v) => v.startsWith('A quiet week'))).toBe(false);
    // Answer it with a solid promise and the +5 is back.
    const answered = promised(held, 'VSY');
    let a = endWeek(c, answered);
    while (a.phase === 'phone') a = answerPhone(c, a, 'back');
    expect(a.log[0].visible).toContain('A quiet week. They gained nothing.');
  });
  it('their summit refused is the one humiliation: −10; accepted it is a way out', () => {
    const s = staged(quiet);
    s.week = 4;
    s.fed.will = 60;
    s.treaty = 60;
    s.fed.step = 2;
    s.fed.headings = [];
    s.log = [
      { week: 1, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 } },
      { week: 2, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 55, step: 1 } },
      { week: 3, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 60, step: 1 } },
    ];
    let rang: GameState | null = null;
    for (let i = 0; i < 30 && !rang; i++) {
      const t = { ...s, seed: `sum-${i}` };
      const n = endWeek(c, t);
      if (n.phase === 'phone' && n.phone!.kind === 'summit') rang = n;
    }
    expect(rang).not.toBeNull();
    const refused = answerPhone(c, rang!, 'down');
    expect(refused.treaty).toBe(60 - RULES.willHumiliated + RULES.willQuiet);
    expect(refused.log[refused.log.length - 1].visible).toContain('You refused the summit.');
    const accepted = answerPhone(c, rang!, 'back');
    expect(accepted.fed.step).toBe(1);
    expect(accepted.waysOut).toBe(1);
    expect(accepted.treaty).toBe(60 + RULES.willWayOut + RULES.willQuiet);
  });
  it('their summit never rings in a week you have a way out on the table', () => {
    const s = staged(quiet);
    s.week = 4;
    s.fed.will = 60;
    s.treaty = 60;
    s.fed.step = 2;
    s.fed.headings = [];
    s.log = [
      { week: 1, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 } },
      { week: 2, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 55, step: 1 } },
      { week: 3, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 60, step: 1 } },
    ];
    for (let i = 0; i < 30; i++) {
      const offered = offerWayOut({ ...s, seed: `sum-${i}` }, 'summit');
      if (!offered.ok) throw new Error(offered.reason);
      const n = endWeek(c, offered.state);
      expect(n.phone?.kind).not.toBe('summit');
    }
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
    expect(n.ending!.dials).toMatch(/^They were .*\.$/);
    expect(n.log[n.log.length - 1].hidden[n.log[n.log.length - 1].hidden.length - 1]).toBe(n.ending!.dials);
    expect(Array.isArray(n.ending!.lessons)).toBe(true);
  });
  it('WORLD WAR names the first place that fell on the tape, by the order of the falls, not the map', () => {
    const s = staged(quiet);
    s.fed.step = 5;
    s.week = 4;
    // Shoal fell first (seq 1), Gullrest after (seq 2) although Gullrest comes first on the map.
    s.regions.SHL = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 2, fellSeq: 1, fellBy: 'unanswered' };
    s.regions.GUL = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 2, fellSeq: 2, fellBy: 'back-down' };
    expect(firstFallen(s)).toBe('SHL');
    for (const r of ['KLP', 'BRK', 'LTL', 'TLM', 'DNM']) s.regions[r] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 3, fellSeq: 3, fellBy: 'unanswered' };
    s.war = 7;
    s.fed.headings = [];
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.ending?.kind).toBe('war');
    expect(n.ending!.lines[1]).toMatch(/^It began at Shoal,/);
  });
  it('TREATY at 100 when no place fell this week; a fall the same week holds it off', () => {
    const s = staged(quiet);
    s.fed.will = 95;
    s.treaty = 95;
    s.week = 6;
    s.lastBacked = 'VSY';
    s.waysOut = 1;
    s.fed.headings = [];
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
      let s = staged([], `bloc-${i}`);
      for (let w = 0; w < 8 && s.phase !== 'ended'; w++) {
        s = endWeek(c, s);
        while (s.phase === 'phone') s = answerPhone(c, s, 'down');
        if (s.phase === 'act') s.fed.headings = [];
      }
      signedMax = Math.max(signedMax, s.signed);
      expect(s.signed).toBeLessThanOrEqual(RULES.maxBlocs);
    }
    expect(signedMax).toBe(RULES.maxBlocs);
  });
});

describe('a scared Federation and a backed-down promise', () => {
  it('BACK DOWN at a real test eases a scared Federation a step; a bold one climbs', () => {
    const scared = promised(staged(toVsy), 'VSY');
    scared.fed.step = 3;
    scared.fed.jumpiness = 0.75;
    const rang = endWeek(c, scared);
    const s = answerPhone(c, rang, 'down');
    expect(s.fed.step).toBe(2);
    expect(s.regions.VSY.state).toBe('pressed');
    expect(s.promises).toEqual([]);
    expect(s.log[0].visible).toContain('You backed down at Vessary. They stand down.');
    expect(s.log[0].hidden.some((h) => h.includes('a fight scared them too'))).toBe(true);
    expect(s.tally!.jumpinessSeen).toBe(true);
    const bold = promised(staged(toVsy), 'VSY');
    bold.fed.step = 3;
    bold.fed.jumpiness = 0.3;
    const b = answerPhone(c, endWeek(c, bold), 'down');
    expect(b.fed.step).toBeGreaterThanOrEqual(4); // (an accident at MASSING and above may add one)
    expect(b.log[0].visible).toContain('You backed down at Vessary. They are FIGHTING.');
  });
  it('the dials line names jumpiness only when something let it show', () => {
    const s = staged([], 'dials');
    s.week = 8;
    s.fed.headings = [];
    let n = endWeek(c, s);
    while (n.phase === 'phone') n = answerPhone(c, n, 'down');
    expect(n.ending?.kind).toBe('frozen');
    expect(n.ending!.dials).toMatch(/^They were \w[\w ]*\. You never came close enough/);
    const seen = staged([], 'dials-seen');
    seen.week = 8;
    seen.fed.headings = [];
    seen.fed.lines = []; // no line to cross, so nothing pulls the brigade back
    seen.pieces = [
      { kind: 'fleet', at: 'TRN' },
      { kind: 'brigade', at: 'VSY' }, // on their doorstep: jumpiness acts
    ];
    let m = endWeek(c, seen);
    while (m.phase === 'phone') m = answerPhone(c, m, 'back');
    expect(m.ending!.dials).toMatch(/^They were .* and .*\.$/);
  });
});

describe('the trawler', () => {
  function island(seed: string, promisedIsle: boolean): GameState {
    const s = staged([], seed);
    s.week = 2;
    s.fed.step = 1;
    if (promisedIsle) s.promises = [{ region: 'PBB', since: 1, inherited: false }];
    s.pieces = [
      { kind: 'fleet', at: 'TRN' },
      { kind: 'brigade', at: 'EDV' },
    ];
    return s;
  }
  it('rings about an island you promised when you have one, else with words that claim no promise; backing it answers the island this week', () => {
    let rangPromised: GameState | null = null;
    let rangUnpromised: GameState | null = null;
    for (let i = 0; i < 80 && !(rangPromised && rangUnpromised); i++) {
      const a = endWeek(c, island(`tr-${i}`, true));
      if (a.phase === 'phone' && a.phone!.kind === 'trawler' && !rangPromised) rangPromised = a;
      const b = endWeek(c, island(`tr-${i}`, false));
      if (b.phase === 'phone' && b.phone!.kind === 'trawler' && !rangUnpromised) rangUnpromised = b;
    }
    expect(rangPromised).not.toBeNull();
    expect(rangPromised!.phone!.region).toBe('PBB');
    expect(rangUnpromised).not.toBeNull();
    expect(rangUnpromised!.promises.some((p) => p.region === rangUnpromised!.phone!.region)).toBe(false);
    // BACK THEM: belief up, the bar untouched, the island's clock restarted.
    const before = rangPromised!.treaty;
    const backed = answerPhone(c, rangPromised!, 'back');
    expect(backed.fed.belief).toBe(rangPromised!.fed.belief + RULES.allyBelief);
    expect(backed.treaty - before).toBe(RULES.willQuiet);
  });
});
