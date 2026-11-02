import { describe, expect, it, vi } from 'vitest';
import type { PaperView, PieceView } from '../paper/contract';
import type { GameState } from '../../engine/types';
import { BAR, barMover, countFighting, newLines, STEP_DOWN, STEP_UP, weekBeats } from './beats';
import { content, newGame, regionName, REGION_IDS, RULES } from './fakeEngine';

// words.ts and beats.ts read the engine's own netActs and actLine through the seam; the tests give them the fake engine, as the store's tests do.
vi.mock('./engine', async () => await import('./fakeEngine'));

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

describe('the rules the beats read (one source: the engine\'s kinds and RULES)', () => {
  const R = RULES;
  const move = barMover(R, content.strings.numbers);

  it('moves the bar by the rules\' own numbers, and never for a refused way out or the trawler', () => {
    expect(move('quietWeek', {})).toBe(R.willQuiet);
    expect(move('blocSigned', { bloc: 'the Scatter' })).toBe(R.willBloc);
    expect(move('wayOutAccepted', { term: 'a summit' })).toBe(R.willWayOut);
    expect(move('summitAccepted', {})).toBe(R.willWayOut);
    expect(move('summitRefused', {})).toBe(-R.willHumiliated);
    expect(move('gainedWeek', { n: 'one place' })).toBe(-R.willPerGain);
    expect(move('gainedWeek', { n: 'two places' })).toBe(-2 * R.willPerGain);
    for (const k of ['wayOutRefused', 'wayOutRefusedWhy', 'trawlerBacked', 'trawlerDisowned', 'trawlerLeaned', 'backed', 'fell']) expect(move(k, { region: 'Shoal' }), k).toBeNull();
    // The spec's numbers, as the engine keeps them.
    expect([R.willQuiet, R.willBloc, R.willWayOut, R.willPerGain, R.willHumiliated]).toEqual([5, 10, 15, 5, 10]);
  });

  it('steps the ladder for the kinds the rules step, and only those', () => {
    expect([...STEP_UP].sort()).toEqual(['accident', 'backedDown', 'jumpy', 'lineCrossed', 'takenStepUp']);
    expect([...STEP_DOWN].sort()).toEqual(['backedDownEased', 'summitAccepted', 'wayOutAccepted']);
    expect(BAR.has('wayOutRefused')).toBe(false);
    expect(BAR.has('trawlerBacked')).toBe(false);
  });

  it('takes the bar 55 → 65 → 55: a bloc signs (+10), then two places are taken (−10) beside their own lines', () => {
    const before = newGame(null, 'B');
    const start: GameState = JSON.parse(JSON.stringify(before));
    start.treaty = 55;
    start.fed.will = 55;
    const after: GameState = JSON.parse(JSON.stringify(start));
    after.log = [log(1, ['the Scatter signs the call for a treaty', 'Shoal has fallen', 'Lintel has fallen', 'They took two places this week'])];
    after.regions.SHL.state = 'fighting';
    after.regions.LTL.state = 'fighting';
    after.war = 2;
    after.treaty = 55;
    after.fed.will = 55;
    const H5 = { ...H, blocSigned: '{bloc} signs the call for a treaty' };
    const beats = weekBeats({ before: start, after, headlines: H5, idOf, holdable, startView: viewOf(start), endView: viewOf(after), barMove: move });
    expect(beats.map((b) => b.kind)).toEqual(['blocSigned', 'fell', 'fell', 'gainedWeek']);
    expect(beats.map((b) => b.treaty)).toEqual([65, 65, 65, 55]);
  });

  it('counts the WAR boxes from the sheet each beat draws, the last beat before the phone too', () => {
    const start: GameState = JSON.parse(JSON.stringify(newGame(null, 'B')));
    start.regions.SHL = { state: 'fighting', pressedWeeks: 0, quietWeeks: 0, fellWeek: 1 };
    start.war = 1;
    const after: GameState = JSON.parse(JSON.stringify(start));
    after.log = [log(1, ['You waited too long · Lintel has fallen', 'Federation forces push into Vessary', 'Their column near Kelpmouth stops short'])];
    after.regions.LTL.state = 'fighting';
    after.regions.VSY.state = 'pressed';
    after.promises = [];
    // A state whose own count lags (the recheck's case: the phone's state said 0 while two places stood red).
    after.war = 0;
    after.phase = 'phone';
    const H6 = { ...H, stoppedShort: 'Their column near {region} stops short' };
    const beats = weekBeats({ before: start, after, headlines: H6, idOf, holdable, startView: viewOf(start), endView: viewOf(after) });
    for (const b of beats) expect(b.war, b.text).toBe(Object.values(b.view.states).filter((x) => x === 'fighting').length);
    expect(beats.map((b) => b.war)).toEqual([2, 2, 2]);
    expect(countFighting(beats[2].view)).toBe(2);
  });

  it('keeps each pressed place\'s weeks-left clock on the sheet through the beats, and drops it when the place falls', () => {
    const start: GameState = JSON.parse(JSON.stringify(newGame(null, 'B')));
    start.regions.SHL = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0 };
    const after: GameState = JSON.parse(JSON.stringify(start));
    after.log = [log(1, ['Federation forces push into Kelpmouth', 'Shoal has fallen'])];
    after.regions.KLP.state = 'pressed';
    after.regions.SHL.state = 'fighting';
    after.war = 1;
    const sv = { ...viewOf(start), clocks: { SHL: 1 } };
    const ev = { ...viewOf(after), clocks: { KLP: 3 } };
    const beats = weekBeats({ before: start, after, headlines: H, idOf, holdable, startView: sv, endView: ev });
    expect(beats[0].view.clocks).toEqual({ SHL: 1, KLP: 3 });
    expect(beats[1].view.clocks).toEqual({ KLP: 3 });
  });
});
