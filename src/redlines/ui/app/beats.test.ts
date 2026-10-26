import { describe, expect, it } from 'vitest';
import type { PaperView, PieceView } from '../paper/contract';
import type { GameState } from '../../engine/types';
import { newLines, weekBeats } from './beats';
import { content, newGame, regionName, REGION_IDS } from './fakeEngine';

const H = content.strings.headlines;
const idOf = (name: string) => REGION_IDS.find((id) => regionName(id) === name) ?? null;
const holdable = (pieces: readonly PieceView[], region: string) => pieces.some((p) => p.at === region || (p.at === 'EDV' && region === 'VSY'));

function viewOf(s: GameState): PaperView {
  const states: PaperView['states'] = {};
  for (const [id, r] of Object.entries(s.regions)) if (r.state !== 'calm') states[id] = r.state;
  return {
    states,
    promises: s.promises.map((p) => ({ region: p.region, solid: holdable(s.pieces, p.region) })),
    headings: s.fed.headings.map((h) => ({ from: h.from, to: h.to })),
    pieces: s.pieces.map((p) => ({ kind: p.kind, at: p.at })),
    tested: s.pendingTest,
    pressed: null,
    lifted: null,
  };
}

function log(week: number, visible: string[]) {
  return { week, visible, hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 as const } };
}

describe('a week in beats', () => {
  const before = newGame(null, 'B');

  it('reads the new lines only: what the resolve added to this week', () => {
    const mid: GameState = { ...before, log: [log(1, ['a', 'b'])] };
    const after: GameState = { ...before, log: [log(1, ['a', 'b', 'c', 'd'])] };
    expect(newLines(before, after)).toEqual(['a', 'b', 'c', 'd']);
    expect(newLines(mid, after)).toEqual(['c', 'd']);
  });

  it('presses, tests, fells and recovers places as the tape says, counts the ladder, and settles on the engine', () => {
    const after: GameState = JSON.parse(JSON.stringify(before));
    after.log = [
      log(1, [
        'Federation forces push into Kelpmouth',
        'They are testing your promise at Lintel',
        'You backed down at Lintel',
        'Shoal has fallen',
        'A place taken, nobody came · now MASSING',
        'Guns quiet at Shoal',
        'They took one place this week',
      ]),
    ];
    after.regions.KLP.state = 'pressed';
    after.regions.LTL.state = 'fighting';
    after.regions.SHL.state = 'pressed';
    after.promises = [];
    after.fed.step = 3;
    after.treaty = 45;
    after.fed.will = 45;
    after.war = 1;
    after.fed.headings = [{ from: 'KLM', to: 'KLP', real: true }];
    after.week = 2;
    const beats = weekBeats({ before, after, headlines: H, idOf, holdable, startView: viewOf(before), endView: viewOf(after) });
    expect(beats.map((b) => b.kind)).toEqual(['pushed', 'tested', 'backedDown', 'fell', 'takenStepUp', 'recovered', 'gainedWeek']);
    expect(beats[0].view.states.KLP).toBe('pressed');
    expect(beats[0].view.tested).toBeNull();
    expect(beats[1].view.tested).toBe('LTL');
    expect(beats[2].view.tested).toBeNull();
    // Backing down drops the ring and leaves the place pressed; the sheet settles on the engine's fighting at the end.
    expect(beats[2].view.states.LTL).toBe('pressed');
    expect(beats[2].view.promises).toEqual([]);
    expect(beats[2].step).toBe(2);
    expect(beats[2].war).toBe(0);
    expect(beats[3].view.states.SHL).toBe('fighting');
    expect(beats[3].war).toBe(1);
    expect(beats[4].step).toBe(3);
    expect(beats[5].view.states.SHL).toBe('pressed');
    expect(beats[5].war).toBe(0);
    // The bar waits for the week's reading; the old headings stay until the last beat.
    expect(beats[5].treaty).toBe(50);
    expect(beats[5].view.headings.length).toBe(2);
    const last = beats[6];
    expect(last.treaty).toBe(45);
    expect(last.step).toBe(3);
    expect(last.view.headings).toEqual([{ from: 'KLM', to: 'KLP' }]);
    expect(last.view.states).toEqual({ KLP: 'pressed', LTL: 'fighting', SHL: 'pressed' });
  });

  it('attributes a step down it cannot see to the backed promise, and never shows a word the engine did not reach', () => {
    const start: GameState = JSON.parse(JSON.stringify(before));
    start.fed.step = 2;
    start.pendingTest = 'LTL';
    const after: GameState = JSON.parse(JSON.stringify(start));
    after.log = [log(1, ['You backed Lintel · they turn away', 'A quiet week · they gained nothing'])];
    after.fed.step = 1;
    after.pendingTest = null;
    const beats = weekBeats({ before: start, after, headlines: H, idOf, holdable, startView: viewOf(start), endView: viewOf(after) });
    expect(beats[0].step).toBe(1);
    expect(beats[0].view.tested).toBeNull();
    expect(beats[1].step).toBe(1);
  });

  it('moves the bar beside each line by that line\'s own amount, and lands the rest on the last mover', () => {
    const start: GameState = JSON.parse(JSON.stringify(before));
    start.treaty = 50;
    start.fed.will = 50;
    const after: GameState = JSON.parse(JSON.stringify(start));
    // Quiet (+5) with a bloc signing (+10), then a refused way out, which costs nothing on the bar: 50 → 55 → 65 → 65.
    after.log = [log(1, ['A quiet week · they gained nothing', 'the Scatter signs · Wintermast feels the pull', 'Wintermast refuses: a summit', "Wintermast: 'nothing to talk about yet'"])];
    after.treaty = 65;
    after.fed.will = 65;
    const H2 = { ...H, blocSigned: '{bloc} signs · Wintermast feels the pull', wayOutRefused: 'Wintermast refuses: {term}', wayOutRefusedWhy: 'Wintermast: {why}' };
    const barMove = (kind: string) => (kind === 'quietWeek' ? 5 : kind === 'blocSigned' ? 10 : kind === 'summitRefused' ? -10 : null);
    const beats = weekBeats({ before: start, after, headlines: H2, idOf, holdable, startView: viewOf(start), endView: viewOf(after), barMove });
    expect(beats.map((b) => b.kind)).toEqual(['quietWeek', 'blocSigned', 'wayOutRefused', 'wayOutRefusedWhy']);
    expect(beats.map((b) => b.treaty)).toEqual([55, 65, 65, 65]);
    // Their own summit refused in public is the one humiliation: −10 beside its line, and a quiet week after it +5.
    const insult: GameState = JSON.parse(JSON.stringify(start));
    insult.log = [log(1, ['You refused the summit · an insult, they say', 'A quiet week · they gained nothing'])];
    insult.treaty = 45;
    insult.fed.will = 45;
    const H4 = { ...H, summitRefused: 'You refused the summit · an insult, they say' };
    const b3 = weekBeats({ before: start, after: insult, headlines: H4, idOf, holdable, startView: viewOf(start), endView: viewOf(insult), barMove });
    expect(b3.map((b) => b.treaty)).toEqual([40, 45]);
    // "They took two places this week" takes 10 off beside its line.
    const taken: GameState = JSON.parse(JSON.stringify(start));
    taken.log = [log(1, ['Shoal has fallen', 'Lintel has fallen', 'They took two places this week'])];
    taken.regions.SHL.state = 'fighting';
    taken.regions.LTL.state = 'fighting';
    taken.treaty = 40;
    taken.fed.will = 40;
    const b2 = weekBeats({ before: start, after: taken, headlines: H, idOf, holdable, startView: viewOf(start), endView: viewOf(taken), barMove: (k, slots) => (k === 'gainedWeek' ? -5 * (slots.n.startsWith('two') ? 2 : 1) : null) });
    expect(b2.map((b) => b.treaty)).toEqual([50, 50, 40]);
  });

  it('reads the step a line says it reached ("· now MASSING"), whatever its kind', () => {
    const start: GameState = JSON.parse(JSON.stringify(before));
    start.fed.step = 1;
    const after: GameState = JSON.parse(JSON.stringify(start));
    after.log = [log(1, ['Kelpmouth out of reach · still TESTING', 'Shoal taken, nobody came · now MASSING', 'A quiet week · they gained nothing'])];
    after.fed.step = 3;
    const H3 = { ...H, fellOutOfReach: '{region} out of reach · still {step}', takenStepUp: '{n} taken, nobody came · now {step}' };
    const steps = ['TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT'];
    const beats = weekBeats({ before: start, after, headlines: H3, idOf, holdable, startView: viewOf(start), endView: viewOf(after), steps });
    expect(beats.map((b) => b.kind)).toEqual(['fellOutOfReach', 'takenStepUp', 'quietWeek']);
    expect(beats.map((b) => b.step)).toEqual([1, 3, 3]);
    expect(beats[0].view.states.KLP).toBe('fighting');
  });

  it('gives one settled beat when the engine said nothing', () => {
    const after: GameState = { ...before, week: 2 };
    const beats = weekBeats({ before, after, headlines: H, idOf, holdable, startView: viewOf(before), endView: viewOf(after) });
    expect(beats.length).toBe(1);
    expect(beats[0].text).toBe('');
  });
});
