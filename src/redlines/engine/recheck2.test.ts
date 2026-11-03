/**
 * The second recheck's findings in the engine's paths, one test (or more) each, and SPEC-SMALL's "Rulings after the
 * second recheck" as the engine reads them (docs/redlines/ENGINE.md, round 16).
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { loadRedlinesContent } from '../content/load.ts';
import { acceptWayOut, planHeadings, summitWhy } from './agent.ts';
import { clockOf, emptyTally, isAnswered, press, shiftedLeft, stepUp, weeksLeft } from './board.ts';
import type { RedlinesContent } from './content.ts';
import { endingOf, lessonsOf } from './debrief.ts';
import { fallsAnswerable, fallsEndTheGame, fallsThisWeek, leavesToFall, nearestHold, promiseTooLate, promiseWillRing, spreadEndsTheGame, spreadThisWeek, testThisWeek } from './forecast.ts';
import { answerCost, backCost, makePhone, ringBackCost } from './phone.ts';
import { RULES, fallWeeksAt } from './rules.ts';
import { answerPhone, canOfferWayOut, endWeek, newGame, offerWayOut, promise, smallThing, withdraw } from './run.ts';
import { finishWeek } from './resolve.ts';
import { fixtureGame } from './testkit.ts';
import type { GameState, Heading, Line, RegionId } from './types.ts';
import { fill } from './words.ts';
import { REGION, regionName } from './world.ts';
import { brokenInvariants } from '../sim/invariants.ts';
import { BOTS } from '../sim/bots.ts';
import { playGame } from '../sim/play.ts';

const shipped = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
const pack = shipped as unknown as RedlinesContent;
const H = pack.strings.headlines;

const quietLines: Line[] = [
  { id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true },
  { id: 'cap-lanes', text: 'The sea lanes to the Cap stay open.', real: true },
  { id: 'missiles-north', text: 'No missiles north of Edda Vale.', real: false },
];
function staged(headings: Heading[], seed = 'r3'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.headings = headings;
  s.fed.lines = quietLines.map((l) => ({ ...l }));
  s.fed.jumpiness = 0.3;
  s.collision = '';
  return s;
}
function promised(s: GameState, region: RegionId): GameState {
  const r = promise(s, region);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}
const line = (kind: keyof typeof H, slots: Record<string, string> = {}) => {
  const t = fill(H[kind], slots);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
/** Every wording of a thought, filled. */
const thoughts = (kind: string, slots: Record<string, string>) => (pack.debrief[kind as keyof typeof pack.debrief] ?? []).map((t) => fill(t, slots));
const feintAtVsy: Heading[] = [
  { from: 'NWK', to: 'VSY', real: false, why: 'curious' },
  { from: 'KLM', to: 'QLN', real: true, why: 'unguarded' },
];
const realAtVsy: Heading[] = [
  { from: 'NWK', to: 'VSY', real: true, why: 'curious' },
  { from: 'KLM', to: 'QLN', real: false, why: 'unguarded' },
];

describe('"They turn away" only when they do (the cold blocker; the niche major)', () => {
  it('backing a feint prints "You backed X" alone: no turn-away, no step, and the debrief keeps "they were not coming"', () => {
    const s = promised(staged(feintAtVsy), 'VSY');
    s.fed.step = 2;
    const rang = endWeek(pack, s);
    expect(rang.phase).toBe('phone');
    const n = answerPhone(pack, rang, 'back');
    const v = n.log[0].visible;
    expect(v).toContain(line('backedOnly', { region: 'Vessary' }));
    expect(v).not.toContain(line('backed', { region: 'Vessary' }));
    expect(n.turnedAway.VSY).toBeUndefined();
    expect(n.log[0].beats!.find((b) => b.kind === 'backedOnly')!.step).toBe(2);
    expect(n.log[0].visible).not.toContain(line('easedStep', { step: 'TESTING' }));
    expect(n.log[0].hidden.some((h) => thoughts('feintBacked', { region: 'Vessary', cost: '12' }).concat(thoughts('feintBacked', { region: 'Vessary', cost: '6' })).includes(h))).toBe(true);
    expect(brokenInvariants(n)).toEqual([]);
  });
  it('a real test held still says they turn away, and the step down follows on its own line, the stamp easing there', () => {
    const s = promised(staged(realAtVsy), 'VSY');
    s.fed.step = 2;
    const n = answerPhone(pack, endWeek(pack, s), 'back');
    const v = n.log[0].visible;
    const b = n.log[0].beats!;
    const backed = v.indexOf(line('backed', { region: 'Vessary' }));
    const eased = v.indexOf(line('easedStep', { step: 'TESTING' }));
    expect(backed).toBeGreaterThanOrEqual(0);
    expect(eased).toBe(backed + 1);
    expect(b[backed].step).toBe(2);
    expect(b[eased].step).toBe(1);
    expect(n.turnedAway.VSY).toBe(1);
    expect(brokenInvariants(n)).toEqual([]);
  });
});

describe('the debrief page tells the truth (the shoulder blocker and majors; the niche major)', () => {
  it('a back-down at the top of the ladder never says they climbed a step, on the page as on the card', () => {
    const s = promised(staged(realAtVsy), 'VSY');
    s.fed.step = 5;
    const n = answerPhone(pack, endWeek(pack, s), 'down');
    expect(n.log[0].visible).toContain(line('backedDownSame', { region: 'Vessary', step: 'ALL-OUT' }));
    const page = n.log[0].hidden.join(' ');
    expect(page).not.toMatch(/climbed a step/);
    expect(n.log[0].hidden).toEqual(expect.arrayContaining([thoughts('realBackedDownTop', { region: 'Vessary' })[0]]));
  });
  it('the heading reason reads as of the moment they chose: "when they chose it, nobody had promised it", under "You promised to defend X"', () => {
    const s = promised(staged([{ from: 'NWK', to: 'VSY', real: true, why: 'unguarded' }, { from: 'KLM', to: 'QLN', real: false, why: 'unguarded' }]), 'VSY');
    const n = answerPhone(pack, endWeek(pack, s), 'back');
    const why = pack.strings.why.unguarded;
    const page = n.log[0].hidden;
    expect(page.some((h) => thoughts('headingThen', { region: 'Vessary', why }).includes(h))).toBe(true);
    expect(page.some((h) => thoughts('heading', { region: 'Vessary', why }).includes(h))).toBe(false);
    // A place that is as it was when they chose it keeps the plain reason.
    const t = staged([{ from: 'KLM', to: 'QLN', real: true, why: 'unguarded' }, { from: 'NWK', to: 'RMH', real: false, why: 'unguarded' }]);
    const m = endWeek(pack, t);
    expect(m.log[0].hidden.some((h) => thoughts('heading', { region: 'Quillon', why }).includes(h))).toBe(true);
  });
  it('a ring "believed and left" is only one they believed (a provocation at the higher belief) that still stands at the week\'s end', () => {
    // A provocation ring at belief 50, left alone only because a test was pending elsewhere: not "believed".
    const s = staged([]);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    s.promises = [
      { region: 'VSY', since: 1, inherited: false, provocation: true },
      { region: 'QLN', since: 1, inherited: false },
    ];
    s.pendingTest = 'QLN';
    s.fed.belief = 50;
    for (let i = 0; i < 40; i++) expect(planHeadings(s, new Rng(`left-${i}`)).notTested).not.toBe('VSY');
    // Believed, and still standing at the week's end: said once, on its own week's page.
    const ok = staged([{ from: 'KLM', to: 'QLN', real: true }]);
    ok.promises = [{ region: 'RMH', since: 1, inherited: false }];
    ok.fed.belief = 55;
    ok.quietRing = 'RMH';
    const said = finishWeek(pack, ok);
    expect(said.log[0].hidden.some((h) => thoughts('notTested', { region: 'Rimeholt' }).includes(h))).toBe(true);
    // Withdrawn before the week's end: not said.
    const gone = staged([{ from: 'KLM', to: 'QLN', real: true }]);
    gone.fed.belief = 55;
    gone.quietRing = 'RMH';
    expect(finishWeek(pack, gone).log[0].hidden.some((h) => thoughts('notTested', { region: 'Rimeholt' }).includes(h))).toBe(false);
    // A provocation they do not yet believe: not said either.
    const prov = staged([{ from: 'KLM', to: 'QLN', real: true }]);
    prov.regions.RMH = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    prov.promises = [{ region: 'RMH', since: 1, inherited: false, provocation: true }];
    prov.fed.belief = 55;
    prov.quietRing = 'RMH';
    expect(finishWeek(pack, prov).log[0].hidden.some((h) => thoughts('notTested', { region: 'Rimeholt' }).includes(h))).toBe(false);
  });
  it('a ring that came too late is never "unanswered" on the page', () => {
    const s = staged([{ from: 'KLM', to: 'QLN', real: true }]);
    s.regions.KLP = { state: 'pressed', pressedWeeks: 3, quietWeeks: 0 };
    s.promises = [{ region: 'KLP', since: 1, inherited: false, provocation: true }];
    s.pendingTest = 'QLN';
    s.promises.push({ region: 'QLN', since: 1, inherited: false });
    const n = finishWeek(pack, { ...s, pendingTest: null, promises: [s.promises[0]] });
    expect(n.regions.KLP.state).toBe('fighting');
    expect(n.log[0].hidden.join(' ')).not.toMatch(/left Kelpmouth unanswered|Nobody answered at Kelpmouth/);
  });
});

describe('the closing card answers what the player did (the shoulder majors; the cold minor)', () => {
  const base = () => {
    const s = staged([]);
    s.tally = emptyTally();
    s.week = 10;
    return s;
  };
  it('a place out of reach is a lesson only when the player ringed it, or when nothing else happened', () => {
    const s = base();
    s.tally!.outOfReach = 1;
    s.tally!.outOfReachFirst = 'TLM';
    s.tally!.moves = 3;
    // Nothing else happened: the filler is allowed.
    expect(lessonsOf(pack, s).join(' ')).toMatch(/Tallowmere fell with nothing of yours in reach/);
    // Something the player did happened: the untouched place gives way.
    s.tally!.backed = 2;
    s.fed.belief = 55;
    expect(lessonsOf(pack, s).join(' ')).not.toMatch(/Tallowmere/);
    // A place the player had ringed is a lesson whatever else happened.
    s.tally!.outOfReachRinged = 'TLM';
    expect(lessonsOf(pack, s).join(' ')).toMatch(/Tallowmere fell with nothing of yours in reach/);
  });
  it('a bar at 100 that did not sign is the first lesson of a game that was not a treaty', () => {
    const s = base();
    s.tally!.feintsBacked = 1;
    s.tally!.feintBackedFirst = 'VSY';
    s.tally!.noSign = { week: 8, taken: false, regions: ['DRF'] };
    const frozen = lessonsOf(pack, s, 'frozen');
    expect(frozen[0]).toBe(fill(pack.debrief.lessonNoSign[0], { week: '8', region: 'Driftholm' }));
    expect(lessonsOf(pack, s, 'treaty').join(' ')).not.toMatch(/The bar reached 100/);
    s.tally!.noSign = { week: 9, taken: true, regions: [] };
    expect(lessonsOf(pack, s, 'war')[0]).toBe(fill(pack.debrief.lessonNoSignTaken[0], { week: '9' }));
  });
  it('"by the end they believed you" only when they did', () => {
    const s = base();
    s.tally!.backed = 3;
    s.fed.belief = 35;
    expect(lessonsOf(pack, s).join(' ')).not.toMatch(/believed you/);
    s.fed.belief = RULES.beliefTest;
    expect(lessonsOf(pack, s).join(' ')).toMatch(/believed you/);
  });
  it('WORLD WAR that began at a place nothing of ours could reach says so, never "taken while nobody answered"', () => {
    const s = staged([]);
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 4, fellSeq: 1, fellBy: 'unanswered', fellReach: false };
    s.regions.LTL = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 5, fellSeq: 2, fellBy: 'unanswered', fellReach: true };
    s.war = 2;
    const e = endingOf(pack, s, 'war');
    expect(e.lines[1]).toContain('Kelpmouth');
    expect(e.lines[1]).toContain(pack.strings.causes['out-of-reach']);
    expect(e.lines[1]).not.toContain(pack.strings.causes.unanswered);
  });
  it('the TREATY card: "could not take X" only of a place no longer pressed; "nothing cheap was left" only over a map with nothing hatched', () => {
    const s = staged([]);
    s.lastBacked = 'TRN';
    s.regions.TRN = { state: 'pressed', pressedWeeks: 0, quietWeeks: 1 };
    s.regions.PBB = { state: 'pressed', pressedWeeks: 0, quietWeeks: 1 };
    const e = endingOf(pack, s, 'treaty');
    expect(e.because).not.toMatch(/could not take Tern Isle/);
    expect(e.because).toContain(pack.strings.because.stalled);
    expect(e.because).toContain('Tern Isle and Pebbleby');
    s.regions.TRN = { state: 'calm', pressedWeeks: 0, quietWeeks: 0 };
    s.regions.PBB = { state: 'calm', pressedWeeks: 0, quietWeeks: 0 };
    expect(endingOf(pack, s, 'treaty').because).toBe(fill(pack.strings.because.held, { region: 'Tern Isle' }));
    s.lastBacked = null;
    expect(endingOf(pack, s, 'treaty').because).toBe(pack.strings.because.quiet);
    // Their summit's reason: nothing cheap left only with nothing hatched.
    expect(summitWhy(s)).toBe('noGain');
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    expect(summitWhy(s)).toBe('noGainYet');
    expect(pack.strings.why.noGainYet).not.toMatch(/cheap/);
  });
});

describe('a provocation costs what it claims (SPEC-SMALL, the second recheck)', () => {
  it('BACK IT on a ring drawn into their siege costs the full price whatever they believe, and buys the pause only', () => {
    const s = staged(realAtVsy);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    s.fed.belief = 55;
    s.fed.step = 2;
    const p = promised(s, 'VSY');
    expect(p.promises[0].provocation).toBe(true);
    expect(backCost(p, 'VSY', 1)).toBe(RULES.backCost);
    // An ordinary ring at the same belief costs the lower price.
    expect(backCost(promised(staged(realAtVsy), 'QLN'), 'QLN', 1)).toBe(RULES.backCostBelieved);
    const rang = endWeek(pack, p);
    expect(rang.phone?.region).toBe('VSY');
    const before = rang.regions.VSY.pressedWeeks;
    const n = answerPhone(pack, rang, 'back');
    expect(answerCost(rang, 'back')).toBe(RULES.backCost);
    expect(n.fed.belief).toBe(rang.fed.belief);
    expect(n.log[0].visible).toContain(line('backedOnly', { region: 'Vessary' }));
    expect(n.log[0].visible).not.toContain(line('easedStep', { step: 'TESTING' }));
    expect(n.turnedAway.VSY).toBeUndefined();
    expect(n.log[0].hidden).toEqual(expect.arrayContaining([thoughts('provokedBacked', { region: 'Vessary' })[0]]));
    // The pause: the ring answers the place from now on, and its clock stops where it stood (not started again).
    expect(n.promises.find((x) => x.region === 'VSY')?.provocation).toBeUndefined();
    expect(isAnswered(n, 'VSY')).toBe(true);
    expect(n.regions.VSY.state).toBe('pressed');
    expect(n.regions.VSY.pressedWeeks).toBe(before);
    expect(brokenInvariants(n)).toEqual([]);
  });
});

describe('too late is said before you pay (SPEC-SMALL, the second recheck; the niche major)', () => {
  const lastTick = () => {
    const s = staged([{ from: 'KLM', to: 'QLN', real: true }, { from: 'NWK', to: 'RMH', real: false }]);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3 };
    return s;
  };
  it('a ring on a place at its last tick is a call that very week: they come to take it', () => {
    const s = lastTick();
    expect(weeksLeft(s, 'VSY')).toBe(1);
    expect(promiseWillRing(s, 'VSY')).toBe(true);
    expect(promiseTooLate(s, 'VSY')).toBe(false);
    const p = promised(s, 'VSY');
    expect(testThisWeek(p)).toBe('VSY');
    const rang = endWeek(pack, p);
    expect(rang.phase).toBe('phone');
    expect(rang.phone!.region).toBe('VSY');
    expect(rang.log[0].visible).toContain(line('tested', { region: 'Vessary' }));
    expect(rang.log[0].hidden).toEqual(expect.arrayContaining([thoughts('lastTick', { region: 'Vessary' })[0]]));
    // Backed, it holds that week.
    const n = answerPhone(pack, rang, 'back');
    expect(n.regions.VSY.state).toBe('pressed');
    // Not backed, it falls, and the tape says why after the answer.
    const lost = answerPhone(pack, rang, 'down');
    expect(lost.regions.VSY.state).not.toBe('calm');
    expect(brokenInvariants(n)).toEqual([]);
    expect(brokenInvariants(lost)).toEqual([]);
  });
  it('when another test has the week, the slip says too late before it is paid for, and the page says the ring came too late', () => {
    const s = lastTick();
    s.fed.headings = [{ from: 'KLM', to: 'QLN', real: true }, { from: 'NWK', to: 'RMH', real: false }];
    const q = promised(s, 'QLN');
    // (Belief low enough that backing the other ring does not make them believe this one: a provocation's standing is
    // read at the week's start, beliefWas, so the slip's forecast holds whatever the call does to their belief.)
    q.fed.belief = 55;
    q.beliefWas = 55;
    expect(promiseTooLate(q, 'VSY')).toBe(true);
    expect(promiseWillRing(q, 'VSY')).toBe(false);
    const p = promised(q, 'VSY');
    const rang = endWeek(pack, p);
    expect(rang.phone!.region).toBe('QLN');
    const n = answerPhone(pack, rang, 'back');
    expect(n.regions.VSY.state).toBe('fighting');
    expect(n.log[0].hidden).toEqual(expect.arrayContaining([thoughts('fallTooLate', { region: 'Vessary' })[0]]));
    expect(n.log[0].hidden.join(' ')).not.toMatch(/left Vessary unanswered|Nobody answered at Vessary/);
    expect(brokenInvariants(n)).toEqual([]);
  });
});

describe('reading their nerve pays (SPEC-SMALL, the second recheck; the niche major)', () => {
  it('a piece at a scared Federation\'s door holds back a push every week it stands there, and provokes a bold one', () => {
    for (let i = 0; i < 20; i++) {
      const s = staged([{ from: 'KLM', to: 'QLN', real: true }], `door-${i}`);
      s.pieces[1].at = 'VSY';
      s.fed.jumpiness = 0.8;
      const n = finishWeek(pack, s);
      expect(n.log[0].visible).toContain(line('wary', { region: 'Vessary' }));
    }
    let bold = 0;
    for (let i = 0; i < 40; i++) {
      const s = staged([{ from: 'KLM', to: 'QLN', real: true }], `bold-${i}`);
      s.pieces[1].at = 'VSY';
      s.fed.jumpiness = 0.1;
      const n = finishWeek(pack, s);
      expect(n.log[0].visible).not.toContain(line('wary', { region: 'Vessary' }));
      if (n.log[0].beats!.some((b) => b.kind === 'jumpy')) bold++;
    }
    expect(bold).toBeGreaterThan(0);
  });
  it('a pull-back from a scared Federation\'s door is accepted almost always', () => {
    const s = staged([]);
    s.week = 4;
    s.pieces[1].at = 'VSY';
    s.fed.jumpiness = 0.8;
    const a = acceptWayOut(s, { term: 'pull-back', detail: 'brigade', price: 15 }, 0, new Rng('pull'));
    expect(a.chance).toBe(RULES.wayOut.pullScaredDoor);
    expect(RULES.wayOut.pullScaredDoor).toBeGreaterThanOrEqual(0.9);
    // From a bold Federation's door, the old odds.
    const bold = { ...s, fed: { ...s.fed, jumpiness: 0.2 } };
    expect(acceptWayOut(bold, { term: 'pull-back', detail: 'brigade', price: 15 }, 0, new Rng('pull')).chance).toBeLessThan(0.6);
  });
});

describe('the ladder is not a cliff, at any rung (SPEC-SMALL, the second recheck; the niche major)', () => {
  it('a step up takes at most one tick off a running clock; the last tick is never taken; a place pressed keeps its own clock', () => {
    expect(shiftedLeft(3, 2, 1)).toBe(2);
    expect(shiftedLeft(2, 3, 1)).toBe(1);
    expect(shiftedLeft(1, 3, 1)).toBe(1);
    const s = staged([]);
    press(s, 'VSY');
    expect(clockOf(s, 'VSY')).toBe(fallWeeksAt(1));
    s.regions.RMH = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    s.regions.QLN = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3 };
    const before = { VSY: weeksLeft(s, 'VSY')!, RMH: weeksLeft(s, 'RMH')!, QLN: weeksLeft(s, 'QLN')! };
    stepUp(s); // PUSHING
    stepUp(s); // MASSING: the old rule made every running clock one week
    for (const r of ['VSY', 'RMH', 'QLN'] as const) expect(weeksLeft(s, r)!).toBeGreaterThanOrEqual(Math.max(1, before[r] - 2));
    expect(weeksLeft(s, 'VSY')).toBe(1);
    expect(weeksLeft(s, 'QLN')).toBe(1);
    // One step: one tick at most.
    const t = staged([]);
    t.regions.RMH = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, clock: 3 };
    stepUp(t);
    stepUp(t);
    expect(weeksLeft(t, 'RMH')).toBe(1);
    const u = staged([]);
    u.regions.RMH = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, clock: 3 };
    stepUp(u);
    expect(weeksLeft(u, 'RMH')).toBe(2);
    // An answered place's clock is paused: a step leaves it alone.
    const v = staged([]);
    v.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, clock: 3 };
    v.pieces[1].at = 'VSY';
    stepUp(v);
    expect(v.regions.VSY.clock).toBe(3);
  });
  it('a save from before the clocks reads the clock of the step the week started at', () => {
    const s = staged([]);
    s.fed.step = 2;
    s.regions.RMH = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    expect(clockOf(s, 'RMH')).toBe(fallWeeksAt(2));
    expect(weeksLeft(s, 'RMH')).toBe(1);
  });
  it('in 300 simulated games a week\'s steps never take more than one tick per step off a clock the sheet showed', () => {
    for (let i = 0; i < 300; i++) {
      const g = playGame(pack, BOTS[(['sensible', 'careful', 'shark', 'passive'] as const)[i % 4]], `cliff-${i}`);
      expect(g.brokenFirst, `cliff-${i}`).toBeNull();
    }
  });
});

describe('the note keeps its warning, and the slips say what an order leaves (SPEC-SMALL, the second recheck)', () => {
  it('the falls the note warns of are split into those something of ours can still reach and those it cannot', () => {
    const s = staged([]);
    s.regions.QLN = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3 };
    s.regions.TLM = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3 };
    expect(fallsThisWeek(s)).toEqual(['QLN', 'TLM']);
    expect(fallsAnswerable(s)).toEqual(['QLN']);
    // A piece already moved this week cannot answer what it does not already hold.
    expect(fallsAnswerable({ ...s, moved: ['brigade'], pieces: [{ kind: 'fleet', at: 'ASK' }, { kind: 'brigade', at: 'MRD' }] })).toEqual([]);
  });
  it('the eve counts the spread: at FIGHTING the eighth place can be the spread\'s', () => {
    const s = staged([]);
    s.fed.step = 4;
    for (const r of ['NWK', 'FRM'] as const) void r;
    const fighting: RegionId[] = ['KLP', 'BRK', 'DNM', 'ORN', 'BRN', 'MRM', 'FLE'];
    for (const r of fighting) s.regions[r] = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 1 };
    s.war = fighting.length;
    expect(spreadThisWeek(s)).toBe(1);
    expect(spreadEndsTheGame(s)).toBe(true);
    expect(fallsEndTheGame(s)).toBe(false);
    s.regions.TLM = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, clock: 1 };
    s.regions[fighting[6]] = { state: 'calm', pressedWeeks: 0, quietWeeks: 0 };
    s.war = 6;
    expect(fallsThisWeek(s)).toEqual(['TLM']);
    expect(fallsEndTheGame(s)).toBe(true);
    // At MASSING nothing spreads.
    expect(spreadThisWeek({ ...s, fed: { ...s.fed, step: 3 } })).toBe(0);
  });
  it('MOVE HERE names a pressed place the piece would leave to fall this week; the call\'s SEND THEM says it too', () => {
    const s = staged([]);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3 };
    s.pieces[1].at = 'VSY';
    expect(leavesToFall(s, 'brigade', 'EDV')).toEqual(['VSY']);
    s.regions.VSY.pressedWeeks = 0;
    expect(leavesToFall(s, 'brigade', 'EDV')).toEqual([]);
  });
  it('a dashed ring\'s slip can say how far the nearest piece is; the WAIT form says what BACK IT will cost next week', () => {
    const s = staged([]);
    expect(nearestHold(s, 'VSY')).toEqual({ piece: 'brigade', moves: 0 });
    expect(nearestHold(s, 'KLP')!.moves).toBeGreaterThan(0);
    const p = promised(staged(realAtVsy), 'VSY');
    // Belief 42: BACK IT is at the believed price now, but the WAIT itself costs belief, so next week's is the full one.
    p.fed.belief = 42;
    p.beliefWas = 42;
    const rang = endWeek(pack, p);
    expect(answerCost(rang, 'back')).toBe(RULES.backCostBelieved);
    const wait = rang.phone!.options.find((o) => o.key === 'wait')!;
    expect(wait.cost).toContain(fill(pack.strings.words.waitNext, { cost: RULES.backCost + RULES.waitStakes }));
    const next = endWeek(pack, answerPhone(pack, rang, 'wait'));
    expect(next.phone?.round).toBe(2);
    expect(answerCost(next, 'back')).toBe(RULES.backCost + RULES.waitStakes);
    const phone = makePhone(pack, rang, new Rng('x'), { kind: 'test', region: 'VSY', round: 3 });
    expect(phone!.options.find((o) => o.key === 'wait')!.cost).toBe(pack.strings.words.waitIsBackDown);
    // The PROMISE slip's price before the ring is drawn: the full price for a provocation, the far price for a dashed ring.
    const q = staged([]);
    q.fed.belief = 55;
    q.beliefWas = 55;
    q.regions.RMH = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    expect(ringBackCost(q, 'QLN')).toBe(RULES.backCostBelieved);
    expect(ringBackCost(q, 'RMH')).toBe(RULES.backCost);
    expect(ringBackCost(q, 'KLP')).toBe(RULES.backFarCost);
  });
  it('the third round of a carried call has its own words, never the second\'s repeated', () => {
    const p = promised(staged(realAtVsy), 'VSY');
    const rang = endWeek(pack, p);
    const r2 = makePhone(pack, rang, new Rng('x'), { kind: 'test', region: 'VSY', round: 2 })!;
    const r3 = makePhone(pack, rang, new Rng('x'), { kind: 'test', region: 'VSY', round: 3 })!;
    expect(r3.text).not.toBe(r2.text);
    for (const k of ['hawk', 'dove', 'intel'] as const) expect(r3.advisers[k]).not.toBe(r2.advisers[k]);
    for (const t of pack.phones.filter((x) => x.kind === 'test' || x.kind === 'test-inherited' || x.kind === 'feint')) {
      expect(t.lastAgain, t.id).toBeTruthy();
      expect(t.lastAdvisers, t.id).toBeTruthy();
    }
  });
});

describe('the tape and the forms tell the truth (the shoulder and niche minors; the cold majors)', () => {
  it('a bar at 100 that does not sign names the places when they fit the teleprinter', () => {
    const s = staged([]);
    s.week = 6;
    s.fed.will = 100;
    s.regions.RMH = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    const n = finishWeek(pack, s);
    const said = n.log[0].visible.find((v) => v.startsWith('No treaty'))!;
    expect(said).toBe(line('noSignPressed', { n: 'Vessary and Rimeholt' }));
    expect(said.length).toBeLessThanOrEqual(46);
    expect(n.tally!.noSign).toEqual({ week: 6, taken: false, regions: ['VSY', 'RMH'] });
  });
  it('a bar that touched 100 this week and came down says why; a bloc never signs over a full bar', () => {
    const s = staged([]);
    s.week = 5;
    s.fed.will = 95;
    s.log = [{ week: 5, visible: ['x'], hidden: [], acts: [], danger: { war: 0, treaty: 95, step: 1 }, beats: [{ kind: 'wayOutAccepted', region: null, war: 0, step: 1, treaty: 100 }] }];
    s.regions.TLM = { state: 'pressed', pressedWeeks: 3, quietWeeks: 0, clock: 3 };
    const n = finishWeek(pack, s);
    expect(n.log[0].visible).toContain(line('noSignTaken'));
    for (let i = 0; i < 60; i++) {
      const t = staged([], `bloc-${i}`);
      t.week = 6;
      t.fed.will = 100;
      t.regions.RMH = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
      expect(finishWeek(pack, t).log[0].beats!.some((b) => b.kind === 'blocSigned')).toBe(false);
    }
  });
  it('the column that went home is not contradicted by a new one at the same ring', () => {
    const s = promised(staged(realAtVsy), 'VSY');
    s.feintGone = 'VSY';
    const n = endWeek(pack, s);
    expect(n.log[0].visible).toContain(line('feintGoneNew', { region: 'Vessary' }));
    expect(n.log[0].visible).not.toContain(line('feintGone', { region: 'Vessary' }));
  });
  it('a far promise called a small thing is dimmed after, with the tape\'s own words', () => {
    let s = staged([]);
    s.week = 4;
    s.fed.lines = [];
    s.promises = [{ region: 'HRT', since: 1, inherited: false }];
    s.influence = 40;
    const r = offerWayOut(s, 'drop-promise', 'HRT');
    expect(r.ok).toBe(true);
    s = finishWeek(pack, (r as { ok: true; state: GameState }).state);
    expect(s.tally!.smallThings).toEqual(['HRT']);
    expect(smallThing(s, 'HRT')).toBe(true);
    expect(canOfferWayOut({ ...s, wayOutWeek: null }, 'drop-promise', 'HRT')).toEqual({ ok: false, reason: 'small-thing' });
    expect(pack.strings.refusals['small-thing']).toMatch(/small thing/);
  });
  it('a promise taken back the same week is no order: refunded and no belief lost, as the note already says', () => {
    const s = staged([]);
    const p = promised(s, 'QLN');
    const w = withdraw(p, 'QLN');
    expect(w.ok && w.state.influence).toBe(s.influence);
    expect(w.ok && w.state.fed.belief).toBe(s.fed.belief);
  });
  it('"by their timetable" is said once a game, the first week the timetable takes over', () => {
    for (let i = 0; i < 40; i++) {
      const g = newGame(pack, `tt-${i}`);
      let s = g;
      let n = 0;
      while (s.phase !== 'ended') {
        s = s.phase === 'phone' ? answerPhone(pack, s, 'down') : endWeek(pack, s);
      }
      for (const w of s.log) for (const h of w.hidden) if (pack.debrief.bothRealTimetable.includes(h)) n++;
      expect(n).toBeLessThanOrEqual(1);
    }
  });
  it('HOW TO PLAY gives the limit of three promises, the provocation\'s price, WAIT\'s rising price, and which falls move the ladder', () => {
    const all = shipped.strings.howToPlay.lines.join(' ');
    expect(all).toMatch(/three promises at most/);
    expect(all).toMatch(/full price/);
    expect(all).toMatch(/WAIT raises the price/);
    expect(all).toMatch(/a place you could have reached/);
    void regionName;
  });
});

describe('the engine step after the restarts (the forecast and the final week tell the truth)', () => {
  it('a carried test whose place falls while you waited passes the week\'s test on: the forecast reads it as the resolve does', () => {
    const s = staged([{ from: 'KLM', to: 'QLN', real: true }, { from: 'NWK', to: 'RMH', real: false }]);
    let p = promised(promised(s, 'VSY'), 'QLN');
    p.pendingTest = 'VSY';
    p.pendingRound = 2;
    p.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 2 };
    expect(weeksLeft(p, 'VSY')).toBe(1);
    expect(testThisWeek(p)).toBe('QLN');
    p = endWeek(pack, p);
    expect(p.regions.VSY.state).toBe('fighting');
    expect(p.phase).toBe('phone');
    expect(p.phone!.region).toBe('QLN');
    // A carried test with weeks still left keeps the week.
    const q = promised(promised(s, 'VSY'), 'QLN');
    q.pendingTest = 'VSY';
    q.pendingRound = 2;
    q.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, clock: 2 };
    expect(testThisWeek(q)).toBe('VSY');
    expect(endWeek(pack, q).phone!.region).toBe('VSY');
  });
  it('a feint waited on in the last week goes home on the tape before the ending, as the debrief says', () => {
    const s = staged(feintAtVsy);
    s.week = RULES.weeks;
    const rang = endWeek(pack, promised(s, 'VSY'));
    expect(rang.phase).toBe('phone');
    expect(rang.phone!.region).toBe('VSY');
    const n = answerPhone(pack, rang, 'wait');
    expect(n.phase).toBe('ended');
    const log = n.log[n.log.length - 1];
    const gone = log.visible.indexOf(line('feintGone', { region: 'Vessary' }));
    expect(gone).toBeGreaterThanOrEqual(0);
    expect(gone).toBeLessThan(log.visible.length - 1);
    expect(log.hidden).toEqual(expect.arrayContaining([thoughts('feintWaited', { region: 'Vessary' })[0]]));
    expect(n.feintGone ?? null).toBeNull();
    expect(brokenInvariants(n)).toEqual([]);
  });
});

describe('a call speaks of the place it is about', () => {
  // The screens' last check: a test at Morrow Downs, a land place, read "we tell their captain we meant it" and "we see
  // whether the ships stay". A template with `place: island` is drawn only for an island; the pool stays one pool for a
  // real push and a feint alike (no tell).
  it('never draws a ships call for a land place, and still can for an island', () => {
    const ships = pack.phones.filter((p) => p.place === 'island').map((p) => p.id);
    expect(ships).toContain('test-ships');
    const s = newGame(pack, 'PLACE-1');
    const plain = { ...s, promises: [], phonesUsed: [] } as GameState;
    const land = (Object.keys(s.regions) as RegionId[]).filter((r) => !REGION[r].island);
    const isles = (Object.keys(s.regions) as RegionId[]).filter((r) => REGION[r].island);
    const drawn = (regions: RegionId[]) => {
      const ids = new Set<string>();
      for (const kind of ['test', 'feint'] as const) for (const region of regions) for (let i = 0; i < 12; i++) ids.add(makePhone(pack, plain, new Rng(`place-${region}-${kind}-${i}`), { kind, region, round: 1 })!.template);
      return ids;
    };
    const onLand = drawn(land);
    for (const id of ships) expect(onLand.has(id)).toBe(false);
    expect(onLand.size).toBeGreaterThan(1);
    expect(drawn(isles).has('test-ships')).toBe(true);
  });
});
