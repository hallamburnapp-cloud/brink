/**
 * SPEC-SMALL "A pressed place shows its clock": weeksLeft(state, region), checked against the real fall. The
 * number is the week-ends left before a pressed, unanswered place falls (3, 2 or 1 by the step the week starts
 * at; 1 means it falls when this week resolves); null for a place that is calm, fighting or answered.
 */
import { describe, expect, it } from 'vitest';
import { weeksLeft } from './board.ts';
import { weeksLeft as fromIndex } from './index.ts';
import { answerPhone, endWeek, movePiece, promise } from './run.ts';
import { RULES } from './rules.ts';
import { FIXTURE_CONTENT, fixtureGame } from './testkit.ts';
import type { GameState, RegionId, Step } from './types.ts';

const c = FIXTURE_CONTENT;

/** Tallowmere pressed (inland in the Sound: nothing of yours can answer it), their arrows elsewhere, no line to cross. */
function pressedAt(step: Step, seed = 'clock'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.lines = [
    { id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true },
    { id: 'cap-lanes', text: 'x', real: true },
    { id: 'missiles-north', text: 'y', real: false },
  ];
  s.fed.step = step;
  s.fed.headings = [];
  s.regions.TLM = { state: 'pressed', pressedWeeks: 0, quietWeeks: 0 };
  return s;
}
/** One week with no orders, their arrows kept off the board and the ladder held where the test put it. */
function week(s: GameState): GameState {
  const step = s.fed.step;
  let n = endWeek(c, s);
  while (n.phase === 'phone') n = answerPhone(c, n, 'wait');
  if (n.phase === 'act') {
    n.fed.headings = [];
    n.fed.step = step;
  }
  return n;
}
/** Weeks until the place falls, played for real. */
function weeksToFall(s: GameState, region: RegionId): number {
  let n = s;
  for (let i = 1; i <= 6; i++) {
    n = week(n);
    if (n.regions[region].state === 'fighting') return i;
  }
  return Infinity;
}

describe('weeksLeft: the pencil ticks beside a hatched place', () => {
  it('is exported from the engine', () => {
    expect(fromIndex).toBe(weeksLeft);
  });
  it('reads 3 at TESTING, 2 at PUSHING, 1 from MASSING for a place just pressed, and the place falls exactly then', () => {
    for (const [step, left] of [
      [1, 3],
      [2, 2],
      [3, 1],
      [4, 1],
      [5, 1],
    ] as const) {
      const s = pressedAt(step, `fresh-${step}`);
      expect(weeksLeft(s, 'TLM')).toBe(left);
      expect(weeksToFall(s, 'TLM')).toBe(left);
    }
  });
  it('counts down a week at a time, the single last tick meaning it falls when this week resolves', () => {
    let s = pressedAt(1);
    const seen: Array<number | null> = [];
    for (let i = 0; i < 3; i++) {
      seen.push(weeksLeft(s, 'TLM'));
      s = week(s);
    }
    expect(seen).toEqual([3, 2, 1]);
    expect(s.regions.TLM.state).toBe('fighting');
    expect(weeksLeft(s, 'TLM')).toBeNull();
  });
  it('reads the step the coming resolve will read: a climb shortens the clock from the next week', () => {
    const s = pressedAt(1);
    s.regions.TLM.pressedWeeks = 1;
    expect(weeksLeft(s, 'TLM')).toBe(2);
    s.fed.step = 2;
    expect(weeksLeft(s, 'TLM')).toBe(1);
    expect(weeksToFall(s, 'TLM')).toBe(1);
  });
  it('is null for a place calm, fighting, or answered (a piece in it, or a solid promise not under test), and once the game is over', () => {
    const s = pressedAt(1);
    expect(weeksLeft(s, 'VSY')).toBeNull();
    s.regions.KLP = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 0 };
    expect(weeksLeft(s, 'KLP')).toBeNull();
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    expect(weeksLeft(s, 'VSY')).toBe(2);
    // A ring drawn on a place already under siege is a provocation (SPEC-SMALL "No formula wins"): its clock runs on, the
    // ticks stay, until they believe it or it is backed on its call.
    const provoked = promise(s, 'VSY');
    if (!provoked.ok) throw new Error(provoked.reason);
    expect(weeksLeft(provoked.state, 'VSY')).toBe(2);
    // Believed (RULES.provocationBelief), a solid promise answers it: its clock pauses, no ticks.
    const answered = promise({ ...s, fed: { ...s.fed, belief: RULES.provocationBelief } }, 'VSY');
    if (!answered.ok) throw new Error(answered.reason);
    expect(weeksLeft(answered.state, 'VSY')).toBeNull();
    // Under test it is not answered: the ticks come back.
    expect(weeksLeft({ ...answered.state, pendingTest: 'VSY' }, 'VSY')).toBe(2);
    // The brigade walking in answers it too.
    const walked = movePiece(s, 'brigade', 'VSY');
    if (!walked.ok) throw new Error(walked.reason);
    expect(weeksLeft(walked.state, 'VSY')).toBeNull();
    expect(weeksLeft({ ...s, phase: 'ended' }, 'VSY')).toBeNull();
  });
  it('an answered place does not fall while answered; the clock it shows when the answer goes is the real one', () => {
    const s = pressedAt(2);
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0 };
    const walked = movePiece(s, 'brigade', 'VSY');
    if (!walked.ok) throw new Error(walked.reason);
    const n = week(walked.state);
    expect(n.regions.VSY.state).toBe('pressed');
    // The brigade leaves: one week left, and it falls that week.
    const left = movePiece(n, 'brigade', 'EDV');
    if (!left.ok) throw new Error(left.reason);
    expect(weeksLeft(left.state, 'VSY')).toBe(1);
    expect(week(left.state).regions.VSY.state).toBe('fighting');
  });
  it('on the phone (this week already counted) it counts this week as one', () => {
    const s = pressedAt(1);
    s.regions.TLM.pressedWeeks = 2;
    // A promise at Vessary tested this week, so the phone rings mid-week.
    s.regions.VSY = { state: 'calm', pressedWeeks: 0, quietWeeks: 0 };
    const p = promise(s, 'VSY');
    if (!p.ok) throw new Error(p.reason);
    const t = p.state;
    t.fed.headings = [{ from: 'NWK', to: 'VSY', real: true }];
    const rang = endWeek(c, t);
    expect(rang.phase).toBe('phone');
    expect(rang.regions.TLM.pressedWeeks).toBe(3);
    expect(weeksLeft(rang, 'TLM')).toBe(1);
    const n = answerPhone(c, rang, 'back');
    expect(n.regions.TLM.state).toBe('fighting');
  });
});
