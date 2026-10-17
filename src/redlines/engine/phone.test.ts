import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { answerCost, backCost, makePhone, pickEvent } from './phone.ts';
import { RULES } from './rules.ts';
import { FIXTURE_CONTENT, fixtureGame } from './testkit.ts';
import type { GameState } from './types.ts';

const c = FIXTURE_CONTENT;
function base(seed = 'phone'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.headings = [
    { from: 'NWK', to: 'VSY', real: true },
    { from: 'KLM', to: 'KLP', real: false },
  ];
  return s;
}

describe('the templates', () => {
  it('an inherited promise gets an inherited-promise template; another promise never does', () => {
    const s = base();
    s.promises = [{ region: 'VSY', since: 0, inherited: true }];
    const inherited = makePhone(c, s, new Rng('a'), { kind: 'test', region: 'VSY', round: 1 })!;
    expect(inherited.kind).toBe('test-inherited');
    expect(inherited.text).toContain('Vessary');
    s.promises = [{ region: 'VSY', since: 1, inherited: false }];
    for (let i = 0; i < 20; i++) {
      const own = makePhone(c, s, new Rng(`b${i}`), { kind: 'test', region: 'VSY', round: 1 })!;
      expect(['test', 'feint']).toContain(own.kind);
    }
  });
  it('fills every slot and prices BACK IT for the round', () => {
    const s = base();
    s.promises = [{ region: 'LTL', since: 1, inherited: false }];
    const p = makePhone(c, s, new Rng('c'), { kind: 'test', region: 'LTL', round: 2 })!;
    const all = [p.text, p.advisers.hawk, p.advisers.dove, p.advisers.intel, ...p.options.map((o) => `${o.label} ${o.cost}`)].join(' ');
    expect(all).not.toMatch(/\{\w+\}/);
    expect(p.options[0].cost).toContain(String(RULES.backFarCost + RULES.waitStakes));
    expect(p.caller.name.length).toBeGreaterThan(0);
    expect(p.round).toBe(2);
    const third = makePhone(c, s, new Rng('c'), { kind: 'test', region: 'LTL', round: 3 })!;
    expect(third.options[2].cost).toBe(c.strings.words.waitIsBackDown);
  });
  it('does not draw the same template twice running when another fits', () => {
    const s = base();
    s.promises = [{ region: 'VSY', since: 1, inherited: false }];
    s.phonesUsed = ['test-column'];
    for (let i = 0; i < 10; i++) expect(makePhone(c, s, new Rng(`d${i}`), { kind: 'test', region: 'VSY', round: 1 })!.template).not.toBe('test-column');
  });
  it('returns null for a kind the pack lacks', () => {
    const thin = { ...c, phones: c.phones.filter((p) => p.kind !== 'trawler') };
    expect(makePhone(thin, base(), new Rng('e'), { kind: 'trawler', region: 'SHL', round: 1 })).toBeNull();
  });
});

describe('what an answer costs', () => {
  it('a test: BACK IT by hold and belief, plus the stakes; the rest free', () => {
    const s = base();
    s.promises = [{ region: 'VSY', since: 1, inherited: false }];
    expect(backCost(s, 'VSY', 1)).toBe(RULES.backCost);
    s.fed.belief = 70;
    expect(backCost(s, 'VSY', 1)).toBe(RULES.backCostBelieved);
    expect(backCost(s, 'LTL', 1)).toBe(RULES.backFarCost);
    expect(backCost(s, 'LTL', 3)).toBe(RULES.backFarCost + 2 * RULES.waitStakes);
    s.phone = makePhone(c, s, new Rng('f'), { kind: 'test', region: 'VSY', round: 1 });
    expect(answerCost(s, 'back')).toBe(RULES.backCostBelieved);
    expect(answerCost(s, 'down')).toBe(0);
    expect(answerCost(s, 'wait')).toBe(0);
  });
  it('events: alert, summit, the trawler and sending what you have cost influence', () => {
    const s = base();
    for (const [kind, back, wait] of [
      ['false-alarm', RULES.events.alertCost, 0],
      ['summit', RULES.events.summitAcceptCost, 0],
      ['trawler', RULES.events.trawlerBackCost, RULES.events.trawlerLeanCost],
      ['fall-unpromised', RULES.events.unpromisedBackCost, 0],
      ['bluff-crossed', 0, 0],
    ] as const) {
      s.phone = makePhone(c, s, new Rng('g'), { kind, region: 'SHL', round: 1, line: 'x' });
      expect(answerCost(s, 'back')).toBe(back);
      expect(answerCost(s, 'wait')).toBe(wait);
      expect(answerCost(s, 'down')).toBe(0);
    }
  });
});

describe('which event rings', () => {
  it('a bluff you crossed comes first', () => {
    const s = base();
    const line = s.fed.lines[0];
    expect(pickEvent(c, s, new Rng('h'), { line, region: 'LTL' })).toMatchObject({ kind: 'bluff-crossed', region: 'LTL', line: line.text });
  });
  it('a place nobody promised that will fall this week, when a piece can reach it', () => {
    const s = base();
    s.fed.step = 3;
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    expect(pickEvent(c, s, new Rng('i'), null)).toMatchObject({ kind: 'fall-unpromised', region: 'VSY' });
    s.regions.VSY.state = 'calm';
    s.regions.LTL = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 }; // out of reach: it just falls
    const ev = pickEvent(c, s, new Rng('i'), null);
    expect(ev?.kind).not.toBe('fall-unpromised');
  });
  it('a summit when they have been stopped and the bar is not empty, at most twice', () => {
    const s = base();
    s.week = 4;
    s.fed.will = 60;
    s.log = [
      { week: 1, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 } },
      { week: 2, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 55, step: 1 } },
      { week: 3, visible: [], hidden: [], acts: [], danger: { war: 0, treaty: 60, step: 1 } },
    ];
    let summits = 0;
    for (let i = 0; i < 40; i++) if (pickEvent(c, s, new Rng(`j${i}`), null)?.kind === 'summit') summits++;
    expect(summits).toBeGreaterThan(8);
    s.phonesUsed = ['summit-offer', 'summit-offer'];
    for (let i = 0; i < 40; i++) expect(pickEvent(c, s, new Rng(`j${i}`), null)?.kind).not.toBe('summit');
  });
  it('a false alarm only from MASSING; the trawler from week 2; none past the cap', () => {
    const s = base();
    s.week = 1;
    for (let i = 0; i < 40; i++) expect(pickEvent(c, s, new Rng(`k${i}`), null)).toBeNull();
    s.fed.step = 3;
    let alarms = 0;
    for (let i = 0; i < 60; i++) if (pickEvent(c, s, new Rng(`l${i}`), null)?.kind === 'false-alarm') alarms++;
    expect(alarms).toBeGreaterThan(5);
    s.fed.step = 1;
    s.week = 2;
    let trawlers = 0;
    for (let i = 0; i < 100; i++) if (pickEvent(c, s, new Rng(`m${i}`), null)?.kind === 'trawler') trawlers++;
    expect(trawlers).toBeGreaterThan(3);
    s.events = RULES.events.maxPerGame;
    for (let i = 0; i < 20; i++) expect(pickEvent(c, s, new Rng(`m${i}`), null)).toBeNull();
  });
});
