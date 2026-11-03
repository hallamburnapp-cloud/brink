/**
 * The second review's findings in the engine's paths, one test (or more) each, and SPEC-SMALL's "Rulings after the
 * second review" as the engine reads them (docs/redlines/ENGINE.md, round 15).
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { loadRedlinesContent } from '../content/load.ts';
import { acceptWayOut, planHeadings } from './agent.ts';
import { closedTo, couldHaveReached, emptyTally, fall, holdDistance, isAnswered, nearestPiece, unansweredRegions } from './board.ts';
import type { RedlinesContent } from './content.ts';
import { backDownLesson, endingOf, lessonsOf } from './debrief.ts';
import { fallsEndTheGame, fallsThisWeek, linesCrossedByMove, linesCrossedByPromise, promiseWillRing, ringsLeftDashed } from './forecast.ts';
import { backCost, makePhone } from './phone.ts';
import { RULES } from './rules.ts';
import { answerPhone, canAnswer, canOfferWayOut, endWeek, holdable, isProvocation, movePiece, newGame, offerWayOut, promise, withdraw } from './run.ts';
import { finishWeek } from './resolve.ts';
import { FIXTURE_CONTENT, fixtureGame } from './testkit.ts';
import type { GameState, Heading, Line, RegionId } from './types.ts';
import { brokenInvariants } from '../sim/invariants.ts';

const c = FIXTURE_CONTENT;
const shipped = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
const pack = shipped as unknown as RedlinesContent;

/** No line any test here crosses by accident (the lines carry no regions, as an old save's do). */
const quietLines: Line[] = [
  { id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true },
  { id: 'cap-lanes', text: 'The sea lanes to the Cap stay open.', real: true },
  { id: 'missiles-north', text: 'No missiles north of Edda Vale.', real: false },
];
function staged(headings: Heading[], seed = 'r2'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.headings = headings;
  s.fed.lines = quietLines.map((l) => ({ ...l }));
  s.collision = '';
  return s;
}
function promised(s: GameState, region: RegionId): GameState {
  const r = promise(s, region);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}
const toVsy: Heading[] = [
  { from: 'NWK', to: 'VSY', real: true },
  { from: 'KLM', to: 'KLP', real: false },
];
const toVsyAndKlp: Heading[] = [
  { from: 'NWK', to: 'VSY', real: true },
  { from: 'KLM', to: 'KLP', real: true },
];

describe('the closing card says only what happened (shoulder blocker; robustness blocker)', () => {
  const base = () => {
    const s = staged([]);
    s.tally = emptyTally();
    return s;
  };
  it('"the place fell anyway" only for a place that fell after the back-down and stayed fallen', () => {
    const s = base();
    s.tally!.backDowns = [{ region: 'RMH', week: 2, feint: false, eased: false }];
    expect(backDownLesson(s)).toEqual(['lessonBackedDownHeld', 'RMH']);
    s.regions.RMH = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 3 };
    expect(backDownLesson(s)).toEqual(['lessonBackedDown', 'RMH']);
    // It fell, then came back: not "fell anyway".
    s.regions.RMH = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0, fellWeek: 3, recoveredWeek: 5 };
    expect(backDownLesson(s)).toEqual(['lessonBackedDownHeld', 'RMH']);
  });
  it('a back-down from a feint, or one a scared Federation answered by standing down, is said as it went', () => {
    const s = base();
    s.tally!.backDowns = [{ region: 'DRF', week: 1, feint: true, eased: false }];
    expect(backDownLesson(s)?.[0]).toBe('lessonBackedDownFeint');
    s.tally!.backDowns = [{ region: 'KLP', week: 4, feint: false, eased: true }];
    expect(backDownLesson(s)?.[0]).toBe('lessonBackedDownEased');
    const words = lessonsOf(pack, s).join(' ');
    expect(words).not.toMatch(/fell anyway/);
    expect(words).toMatch(/stood down too/);
  });
  it('a back-down at the top of the ladder ("· still ALL-OUT") is never said to have climbed a step', () => {
    const s = base();
    s.tally!.backDowns = [{ region: 'RMH', week: 8, feint: true, eased: false, top: true }];
    expect(backDownLesson(s)).toBeNull();
    s.tally!.backDowns.push({ region: 'VSY', week: 9, feint: false, eased: false });
    expect(backDownLesson(s)).toEqual(['lessonBackedDownHeld', 'VSY']);
    // "Fell anyway" claims no step, so a place lost at the top still says so.
    s.regions.RMH = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 8 };
    s.tally!.backDowns[0].feint = false;
    expect(backDownLesson(s)).toEqual(['lessonBackedDown', 'RMH']);
  });
  it('no-orders is drawn only when a place you could have reached fell unanswered, counting the weeks an order could have answered', () => {
    const s = base();
    s.week = 8;
    s.tally!.idleWeeks = 4;
    s.tally!.idleAnswerable = 4;
    s.tally!.moves = 2;
    // Nothing fell that a piece could have reached: no "the war came to the places you never answered".
    s.regions.TLM = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 6, fellReach: false, fellBy: 'unanswered' };
    expect(lessonsOf(pack, s).join(' ')).not.toMatch(/no orders/);
    s.regions.VSY = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 5, fellReach: true, fellBy: 'unanswered' };
    expect(lessonsOf(pack, s).join(' ')).toMatch(/You gave no orders in four weeks/);
  });
  it('names the doorstep that climbed the ladder (the jumpy lesson)', () => {
    const s = base();
    s.tally!.jumpySteps = 3;
    s.tally!.jumpyFirst = { piece: 'brigade', region: 'VSY' };
    expect(lessonsOf(pack, s).join(' ')).toMatch(/You kept the brigade at Vessary, on their doorstep/);
  });
  it('every lesson of 600 simulated games is a sentence about the game, never a slot, and never prints on a week\'s page', async () => {
    const { BOTS } = await import('../sim/bots.ts');
    for (const bot of [BOTS.sensible, BOTS.careful, BOTS.passive, BOTS.shark]) {
      for (let i = 0; i < 150; i++) {
        const seed = `r2-less-${bot.name}-${i}`;
        const rng = new Rng(`${bot.name}:${seed}`);
        let s = newGame(pack, seed);
        for (let k = 0; k < 60 && s.phase !== 'ended'; k++) s = s.phase === 'act' ? endWeek(pack, bot.act(pack, s, rng)) : answerPhone(pack, s, bot.answer(pack, s, rng));
        const lessons = s.ending!.lessons!;
        for (const l of lessons) {
          expect(l).not.toMatch(/\{\w+\}/);
          expect(s.log.flatMap((w) => w.hidden)).not.toContain(l);
          // "fell anyway" is only ever said of a place that is fighting at the end.
          const m = /backed down at ([A-Z][a-z]+(?: [A-Z][a-z]+)?)\. The promise went, the place fell anyway/.exec(l);
          if (m) expect(Object.values(s.regions).some((r) => r.state === 'fighting')).toBe(true);
        }
        expect(brokenInvariants(s)).toEqual([]);
      }
    }
  });
});

describe('the treaty names only a place they never took (robustness blocker)', () => {
  it('a backed place that falls later is no longer "they could not take X"', () => {
    const s = staged([]);
    s.lastBacked = 'KLP';
    s.regions.KLP = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    fall(s, 'KLP', 'unanswered');
    expect(s.lastBacked).toBeNull();
  });
  it('the card never names a fighting place, and names the places still hatched at the signing', () => {
    const s = staged([]);
    s.lastBacked = 'KLP';
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 2 };
    s.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    s.waysOut = 1;
    const e = endingOf(pack, s, 'treaty');
    expect(e.because).not.toMatch(/Kelpmouth/);
    expect(e.because).toBe('They stopped because you gave them a way out. They keep their forces at Vessary.');
  });
});

describe('words on a form are true (shoulder majors)', () => {
  it('names the piece by its real distance: the fleet for an island, never the brigade', () => {
    const s = staged([]);
    s.pieces = [
      { kind: 'fleet', at: 'TRN' },
      { kind: 'brigade', at: 'EDV' },
    ];
    expect(nearestPiece(s, 'SHL').kind).toBe('fleet');
    expect(nearestPiece(s, 'DRF').kind).toBe('fleet');
    expect(nearestPiece(s, 'VSY').kind).toBe('brigade');
    s.promises = [{ region: 'SHL', since: 0, inherited: true }];
    const p = makePhone(pack, s, new Rng('x'), { kind: 'test', region: 'SHL', round: 1 })!;
    expect(`${p.advisers.hawk} ${p.advisers.dove} ${p.options.map((o) => o.cost).join(' ')}`).not.toMatch(/the brigade/);
  });
  it('LEAN ON THEM names its price; a carried call\'s slips are a week on; the Director says what doubt looks like', () => {
    const s = staged([]);
    s.promises = [{ region: 'PBB', since: 0, inherited: false }];
    const t = makePhone(pack, s, new Rng('t'), { kind: 'trawler', region: 'PBB', round: 1 })!;
    expect(t.options[2].cost).toContain(`costs ${RULES.events.trawlerLeanCost} influence`);
    s.promises = [{ region: 'VSY', since: 0, inherited: false }];
    s.phonesUsed = ['test-column'];
    const r1 = makePhone(pack, s, new Rng('a'), { kind: 'test', region: 'VSY', round: 1 })!;
    const r2 = makePhone(pack, { ...s, phonesUsed: [r1.template] }, new Rng('a'), { kind: 'test', region: 'VSY', round: 2 })!;
    expect(r2.template).toBe(r1.template);
    expect(r2.advisers.hawk).not.toBe(r1.advisers.hawk);
    expect(r2.advisers.intel).not.toBe(r1.advisers.intel);
    // Their other column at Kelpmouth, so a template's {from} has a place to name (a call only draws templates that fit the place).
    const two = [{ from: 'VSY', to: 'VSY', real: true }, { from: 'KLP', to: 'KLP', real: true }] as Heading[];
    const doubted = makePhone(pack, { ...s, fed: { ...s.fed, belief: RULES.beliefTest - 1, headings: two }, phonesUsed: [] }, new Rng('a'), { kind: 'test', region: 'VSY', round: 1 })!;
    const tpl = pack.phones.find((p) => p.id === doubted.template)!;
    expect(doubted.advisers.intel).toBe(tpl.intelDoubted!.replace('{region}', 'Vessary').replace('{from}', 'Kelpmouth'));
  });
  it('BACK IT\'s price steps at the belief that changes their targeting (SPEC-SMALL "Doubt is visible where it matters")', () => {
    const s = promised(staged(toVsy), 'VSY');
    expect(RULES.believedAt).toBe(RULES.beliefTest);
    expect(backCost({ ...s, fed: { ...s.fed, belief: RULES.beliefTest } }, 'VSY', 1)).toBe(RULES.backCostBelieved);
    expect(backCost({ ...s, fed: { ...s.fed, belief: RULES.beliefTest - 1 } }, 'VSY', 1)).toBe(RULES.backCost);
  });
  it('says "· now STEP" only when the step changed: their summit at TESTING, a back-down at ALL-OUT', () => {
    const s = staged([]);
    s.week = 5;
    s.phase = 'phone';
    s.phone = makePhone(pack, s, new Rng('s'), { kind: 'summit', region: null, round: 1 });
    const n = answerPhone(pack, s, 'back');
    expect(n.log.at(-1)!.visible).toContain('You accepted the summit · still TESTING');
    const top = promised(staged(toVsy), 'VSY');
    top.fed.step = 5;
    top.fed.jumpiness = 0.3;
    const d = answerPhone(pack, endWeek(pack, top), 'down');
    expect(d.log[0].visible).toContain('Backed down at Vessary · still ALL-OUT');
    expect(d.log[0].visible.some((v) => /now ALL-OUT/.test(v) && v.startsWith('Backed down'))).toBe(false);
  });
  it('a summit offered over nothing taken is never "while they were ahead"; the trawler over an island nobody promised is not "whether you meant it"', () => {
    const s = staged([]);
    s.week = 5;
    s.phase = 'phone';
    s.phone = makePhone(pack, s, new Rng('s'), { kind: 'summit', region: null, round: 1 });
    const n = answerPhone(pack, s, 'back');
    expect(n.log.at(-1)!.hidden.join(' ')).not.toMatch(/while they were ahead/);
    expect(n.log.at(-1)!.hidden.join(' ')).toMatch(/had taken nothing/);
    const t = staged([]);
    t.week = 3;
    t.phase = 'phone';
    t.phone = makePhone(pack, t, new Rng('t'), { kind: 'trawler', region: 'PBB', round: 1 });
    const m = answerPhone(pack, t, 'down');
    const thought = m.log.at(-1)!.hidden.find((h) => h.includes('trawler'))!;
    expect(thought).toMatch(/nobody had promised it/);
  });
  it('the tape says what the bar is: "They took nothing this week", the count of places at WORLD WAR, the weeks that were played', () => {
    expect(pack.strings.headlines.quietWeek).not.toMatch(/quiet/i);
    expect(shipped.strings.debrief.intro).not.toMatch(/\bten\b/i);
    expect(pack.strings.headlines.worldWar).toContain('{n}');
  });
});

describe('a way out says before you pay when it will fail, and is read as it is (shoulder majors)', () => {
  it('a far promise cannot be sold: refused as indifferent, never "the thing in their way"', () => {
    const s = staged([]);
    s.week = 4;
    s.fed.lines = [];
    s.promises = [{ region: 'HRT', since: 1, inherited: true }];
    for (let i = 0; i < 200; i++) {
      const a = acceptWayOut(s, { term: 'drop-promise', detail: 'HRT', price: 10 }, 0, new Rng(`far-${i}`), pack.lines);
      expect(a).toMatchObject({ accept: false, why: 'indifferent' });
    }
  });
  it('a pull-back is read from the piece itself: a piece far from their door is no threat, whatever line was crossed elsewhere', () => {
    const s = staged([]);
    s.week = 4;
    s.crossed = { 'cap-lanes': 2 };
    s.fed.lines[1].regions = ['DRF', 'KLP'];
    s.pieces = [
      { kind: 'fleet', at: 'MRM' },
      { kind: 'brigade', at: 'EDV' },
    ];
    let accepted = 0;
    for (let i = 0; i < 400; i++) if (acceptWayOut({ ...s, seed: `pb-${i}` }, { term: 'pull-back', detail: 'fleet', price: 15 }, 0, new Rng(`pb-${i}`), pack.lines).accept) accepted++;
    expect(accepted / 400).toBeLessThan(RULES.wayOut.pullFar + 0.08);
  });
  it('at most one way out accepted in any two weeks; the stopped pull needs a map with nothing hatched; fewer taken while places stand unanswered', () => {
    const s = staged([]);
    s.week = 5;
    s.log = [3, 4].map((week) => ({ week, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 60, step: 1 as const } }));
    s.log.push({ week: 5, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 60, step: 1 } });
    const summit = { term: 'summit' as const, detail: null, price: 15 };
    const rate = (st: GameState) => {
      let n = 0;
      for (let i = 0; i < 400; i++) if (acceptWayOut(st, summit, 0, new Rng(`sp-${i}`)).accept) n++;
      return n / 400;
    };
    expect(acceptWayOut({ ...s, wayOutWeek: 4 }, summit, 0, new Rng('x'))).toMatchObject({ accept: false, why: 'tooSoon' });
    const quiet = rate(s);
    const hatched = staged([]);
    Object.assign(hatched, { week: 5, log: s.log });
    hatched.regions.VSY = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
    expect(rate(hatched)).toBeLessThan(quiet);
    const standing = { ...hatched, regions: { ...hatched.regions, VSY: { state: 'pressed' as const, pressedWeeks: 1, quietWeeks: 0 } } };
    expect(unansweredRegions(standing)).toEqual(['VSY']);
    expect(rate(standing)).toBeLessThan(rate(hatched));
  });
});

describe('the eve of a fall, a move that leaves a ring dashed, a ring that will be a call, a line an order crosses (forms say so before you pay)', () => {
  it('fallsThisWeek reads the sheet\'s own clock; fallsEndTheGame when those falls make the eighth place', () => {
    const s = staged([]);
    s.regions.TLM = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0 };
    s.regions.BRK = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    expect(fallsThisWeek(s)).toEqual(['TLM']);
    expect(fallsEndTheGame(s)).toBe(false);
    s.war = RULES.warLimit - 1;
    expect(fallsEndTheGame(s)).toBe(true);
    // The clock says it: TLM falls when this week resolves.
    const n = endWeek(c, { ...s, war: 0 });
    expect(n.regions.TLM.state).toBe('fighting');
    expect(n.regions.BRK.state).toBe('pressed');
  });
  it('ringsLeftDashed names the solid rings a move strands; promiseWillRing for a ring on an arrow\'s target', () => {
    const s = promised(staged(toVsy), 'RMH');
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    expect(ringsLeftDashed(s, 'brigade', 'EDV').length).toBeGreaterThanOrEqual(0);
    s.pieces[1].at = 'RMH';
    expect(ringsLeftDashed(s, 'brigade', 'QLN')).toEqual(['RMH']);
    expect(promiseWillRing(s, 'VSY')).toBe(true);
    expect(promiseWillRing(s, 'TLM')).toBe(false);
  });
  it('names the declared line a move or a promise would cross, in its tape words', () => {
    const s = newGame(pack, 'lines-cross');
    for (const l of s.fed.lines) {
      const r = l.regions![0];
      if (l.kind === 'alliance') expect(linesCrossedByPromise(s, r)).toContain(l.tape);
      else expect(linesCrossedByMove(s, l.kind === 'missiles' ? 'brigade' : 'fleet', r)).toContain(l.tape);
    }
    expect(linesCrossedByMove({ ...s, crossed: Object.fromEntries(s.fed.lines.map((l) => [l.id, 1])) }, 'fleet', s.fed.lines[0].regions![0])).toEqual([]);
  });
});

describe('out of reach means out of reach (niche major)', () => {
  it('a route through a declared line is not a route: the place it alone reaches falls with no step', () => {
    const s = staged([]);
    s.pieces = [
      { kind: 'fleet', at: 'TRN' },
      { kind: 'brigade', at: 'EDV' },
    ];
    s.fed.lines = [{ id: 'sound-forces', text: 'x', real: true, kind: 'proximity', regions: ['KLP', 'BRK', 'LTL', 'TLM', 'DNM', 'ORN'] }];
    expect(closedTo(s, 'fleet').has('LTL')).toBe(true);
    // Kelpmouth is reached by the fleet only through the Sound.
    expect(holdDistance(s, s.pieces[0], 'KLP')).toBe(Infinity);
    expect(couldHaveReached(s, 'KLP', 6)).toBe(false);
    // Crossed, the line closes nothing more.
    expect(couldHaveReached({ ...s, crossed: { 'sound-forces': 1 } }, 'KLP', 6)).toBe(true);
  });
});

describe('the feint keeps its mystery (niche major)', () => {
  it('the call rings before the other column\'s line prints; that line prints after the answer', () => {
    const s = promised(staged(toVsyAndKlp), 'VSY');
    const rang = endWeek(c, s);
    expect(rang.phase).toBe('phone');
    expect(rang.log[0].visible.some((v) => v.includes('Kelpmouth'))).toBe(false);
    expect(rang.regions.KLP.state).toBe('calm');
    const n = answerPhone(c, rang, 'back');
    const v = n.log[0].visible;
    expect(v.findIndex((x) => x.includes('Kelpmouth'))).toBeGreaterThan(v.findIndex((x) => x.startsWith('You backed')));
    expect(n.regions.KLP.state).toBe('pressed');
    expect(brokenInvariants(n)).toEqual([]);
  });
  it('feints continue after the timetable\'s week, rarer; both arrows real by the timetable is blamed on the timetable', () => {
    let feints = 0;
    let timetable = 0;
    for (let i = 0; i < 300; i++) {
      const s = staged([], `late-${i}`);
      s.week = 6;
      const plan = planHeadings(s, new Rng(`late-${i}`), null, 6);
      if (plan.headings.some((h) => !h.real)) feints++;
      if (plan.headings.some((h) => h.timetable)) timetable++;
      for (const h of plan.headings) expect(h.why).toBeDefined();
    }
    expect(feints).toBeGreaterThan(300 * RULES.lateFeintChance * 0.5);
    expect(feints).toBeLessThan(300 * RULES.feintChance);
    expect(timetable).toBeGreaterThan(100);
    expect(pack.debrief.bothRealTimetable[0]).toMatch(/timetable/);
  });
  it('a ring they believe is "left alone" only when the plan does not point at it', () => {
    for (let i = 0; i < 100; i++) {
      const s = promised(staged([], `nt-${i}`), 'VSY');
      s.fed.belief = 70;
      const plan = planHeadings(s, new Rng(`nt-${i}`), null, 2);
      if (plan.notTested) expect(plan.headings.map((h) => h.to)).not.toContain(plan.notTested);
    }
  });
});

describe('the bluff is not a free read (niche major)', () => {
  it('a real line crossed rings the same call as the bluff; its silence is a bluff\'s only for the bluff', () => {
    const s = staged([]);
    s.fed.lines = [{ id: 'north-missiles', text: 'No brigade north of Edda Vale.', real: true, kind: 'missiles', regions: ['VSY', 'RMH'] }];
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    const rang = endWeek(pack, s);
    expect(rang.phone?.kind).toBe('bluff-crossed');
    const n = answerPhone(pack, rang, 'back');
    expect(n.log[0].hidden.join(' ')).not.toMatch(/silence of a bluff/);
    expect(n.fed.step).toBe(2);
  });
});

describe('backing down is never the best answer; jumpiness shows on the sheet (niche major)', () => {
  const doorstep = (jumpiness: number, seed: string) => {
    const s = staged([], seed);
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    s.fed.jumpiness = jumpiness;
    return finishWeek(c, s);
  };
  it('a piece next to their door slows a scared Federation (one push held back) and provokes a bold one (a step up)', () => {
    let wary = 0;
    let jumpy = 0;
    for (let i = 0; i < 200; i++) {
      const scared = doorstep(0.8, `door-s-${i}`);
      const w = scared.log[0].beats!.map((b) => b.kind);
      expect(w).not.toContain('jumpy');
      if (w.includes('wary')) {
        wary++;
        expect(scared.fed.headings.filter((h) => h.real).length).toBeLessThan(2);
      }
      const bold = doorstep(0.25, `door-b-${i}`);
      const b = bold.log[0].beats!.map((x) => x.kind);
      expect(b).not.toContain('wary');
      if (b.includes('jumpy')) jumpy++;
    }
    expect(wary).toBeGreaterThan(30);
    expect(jumpy).toBeGreaterThan(30);
  });
});

describe('no formula wins: a ring on a hatched place, the treaty over a quiet map (niche blocker)', () => {
  it('a ring drawn on a place already under siege pauses nothing until they believe it, and their next plan tests it', () => {
    const s = staged([]);
    s.regions.RMH = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    expect(isProvocation(s, 'RMH')).toBe(true);
    s.fed.belief = RULES.beliefTest - 5;
    const p = promised(s, 'RMH');
    expect(p.promises[0].provocation).toBe(true);
    expect(isAnswered(p, 'RMH')).toBe(false);
    for (let i = 0; i < 40; i++) {
      const plan = planHeadings({ ...p, seed: `pv-${i}` }, new Rng(`pv-${i}`), null, 2);
      expect(plan.headings.some((h) => h.real && h.to === 'RMH')).toBe(true);
    }
    // Believed, it is an ordinary ring: it pauses the clock.
    // (Read as the week began, beliefWas: a belief won on this week's call counts from the turn of the week.)
    const believed = { ...p, fed: { ...p.fed, belief: RULES.provocationBelief }, beliefWas: RULES.provocationBelief };
    expect(isAnswered(believed, 'RMH')).toBe(true);
    expect(isAnswered({ ...p, fed: { ...p.fed, belief: RULES.provocationBelief } }, 'RMH')).toBe(false);
    // A piece standing in it already answers it: no provocation.
    expect(isProvocation({ ...s, pieces: [s.pieces[0], { kind: 'brigade', at: 'RMH' }] }, 'RMH')).toBe(false);
  });
  it('at 100 they do not sign while a hatched place stands unanswered, and the tape says why', () => {
    const s = staged([]);
    s.fed.will = 100;
    s.treaty = 100;
    s.week = 6;
    s.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'EDV' },
    ];
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    const n = finishWeek(pack, s);
    expect(n.ending).toBeNull();
    expect(n.log.at(-1)!.visible).toContain('No treaty · Vessary unanswered');
    const answered = staged([]);
    Object.assign(answered, { week: 6 });
    answered.fed.will = 100;
    answered.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    answered.pieces = [
      { kind: 'fleet', at: 'ASK' },
      { kind: 'brigade', at: 'VSY' },
    ];
    const m = finishWeek(pack, answered);
    expect(m.ending?.kind).toBe('treaty');
    expect(m.ending!.lines[1]).toMatch(/They keep their forces at Vessary\.$/);
    // The game is over: no pins for a week that never comes.
    expect(m.fed.headings).toEqual([]);
  });
  it('a way out cannot be offered before week 3 (the price is never paid for an answer fixed in advance)', () => {
    const s = staged([]);
    expect(offerWayOut(s, 'summit')).toEqual({ ok: false, reason: 'too-early' });
  });
  it('nor the week after a way out was accepted: a refusal fixed in advance is refused before you pay (too-soon)', () => {
    const s: GameState = { ...staged([]), week: 5, influence: 30, wayOutWeek: 4 };
    expect(canOfferWayOut(s, 'summit')).toEqual({ ok: false, reason: 'too-soon' });
    expect(offerWayOut(s, 'summit')).toEqual({ ok: false, reason: 'too-soon' });
    // Two weeks on, it can be offered again (at most one accepted in any two weeks).
    const later: GameState = { ...s, week: 6 };
    expect(canOfferWayOut(later, 'summit').ok).toBe(true);
    const r = offerWayOut(later, 'summit');
    expect(r.ok && r.state.influence).toBe(30 - RULES.wayOutPrice.summit);
  });
});

describe('a held back answers its place against the spread too, and every week\'s log has its beats', () => {
  it('a carried test says so on the tape before the call rings again', () => {
    const s = promised(staged(toVsy), 'VSY');
    const waited = answerPhone(c, endWeek(c, s), 'wait');
    const again = endWeek(c, waited);
    expect(again.phase).toBe('phone');
    const log = again.log.at(-1)!;
    expect(log.beats!.length).toBe(log.visible.length);
    expect(log.beats![0].kind).toBe('tested');
  });
});

describe('a believed ring they leave alone is said on the page of the week they leave it alone, once a game (integration)', () => {
  it('never on the page of a week in which their column was at it (X4E-QY7: a feint at Vessary in week 2)', () => {
    const ok = (r: ReturnType<typeof promise>) => {
      if (!r.ok) throw new Error(r.reason);
      return r.state;
    };
    let s = newGame(pack, 'X4E-QY7');
    s = ok(withdraw(s, 'TLM'));
    s = ok(movePiece(s, 'fleet', 'GUL'));
    s = ok(promise(s, 'VSY'));
    s = answerPhone(pack, endWeek(pack, s), 'back');
    s = answerPhone(pack, endWeek(pack, s), 'back');
    s = endWeek(pack, s);
    while (s.phase === 'phone') s = answerPhone(pack, s, 'down');
    const left = (w: number) => s.log[w - 1].hidden.filter((h) => pack.debrief.notTested.some((t) => h === t.replace('{region}', 'Vessary')));
    expect(s.log[1].hidden.some((h) => /not coming to Vessary/.test(h))).toBe(true);
    expect(left(2)).toEqual([]);
    expect(left(3)).toHaveLength(1);
  });
  it('whichever of its wordings was said, it is said once a game per place', () => {
    for (let i = 0; i < 60; i++) {
      let s = newGame(pack, 'LEFT-' + i);
      for (let w = 0; w < 10 && s.phase !== 'ended'; w++) {
        for (const h of s.fed.headings) {
          const r = promise(s, h.to);
          if (r.ok && holdable(r.state, h.to).ok) s = r.state;
        }
        s = endWeek(pack, s);
        while (s.phase === 'phone') s = answerPhone(pack, s, canAnswer(s, 'back').ok ? 'back' : 'down');
      }
      const said = new Map<string, number>();
      for (const w of s.log)
        for (const h of w.hidden) {
          const m = pack.debrief.notTested.map((t) => new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{region\\}', '(.+)') + '$').exec(h)).find(Boolean);
          if (m) said.set(m[1], (said.get(m[1]) ?? 0) + 1);
        }
      for (const n of said.values()) expect(n).toBe(1);
    }
  });
});
