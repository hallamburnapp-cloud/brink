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
    expect(beats[2].view.states.LTL).toBe('fighting');
    expect(beats[2].view.promises).toEqual([]);
    expect(beats[2].step).toBe(2);
    expect(beats[2].war).toBe(1);
    expect(beats[3].view.states.SHL).toBe('fighting');
    expect(beats[3].war).toBe(2);
    expect(beats[4].step).toBe(3);
    expect(beats[5].view.states.SHL).toBe('pressed');
    expect(beats[5].war).toBe(1);
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

  it('gives one settled beat when the engine said nothing', () => {
    const after: GameState = { ...before, week: 2 };
    const beats = weekBeats({ before, after, headlines: H, idOf, holdable, startView: viewOf(before), endView: viewOf(after) });
    expect(beats.length).toBe(1);
    expect(beats[0].text).toBe('');
  });
});
