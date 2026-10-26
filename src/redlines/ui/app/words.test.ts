import { describe, expect, it } from 'vitest';
import type { GameState } from '../../engine/types';
import { blocOf, content, newGame, regionName } from './fakeEngine';
import { actLines, adviserWho, allTapeLines, callerLines, counterLabel, fightingSentence, holdWords, matchHeadline, noteFor, promiseLine, randomSeed, situation, tapeOf, termLine, warSub } from './words';

const S = content.strings as unknown as Parameters<typeof noteFor>[1];

describe('the tape', () => {
  it('tags the opening lines as week 1 and the log lines with their week, and shows the last three', () => {
    const s = newGame(null, 'T');
    expect(allTapeLines(s, 'WEEK').map((l) => l.tag)).toEqual(['WEEK 1', 'WEEK 1']);
    const later: GameState = {
      ...s,
      log: [
        { week: 1, visible: ['a', 'b'], hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 } },
        { week: 2, visible: ['c'], hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 } },
      ],
      headline: [...s.headline, 'a', 'b', 'c'],
    };
    const all = allTapeLines(later, 'WEEK');
    expect(all.map((l) => `${l.tag}:${l.text}`)).toEqual(['WEEK 1:' + s.headline[0], 'WEEK 1:' + s.headline[1], 'WEEK 1:a', 'WEEK 1:b', 'WEEK 2:c']);
    expect(tapeOf(later, 'WEEK').map((l) => l.text)).toEqual(['a', 'b', 'c']);
    // Keys are stable, so a line already on the tape never re-feeds.
    expect(all[2].key).toBe('w1:0');
  });

  it('forgets the opening once the log has six lines', () => {
    const s = newGame(null, 'T');
    const lines = ['1', '2', '3', '4', '5', '6', '7'];
    const later: GameState = { ...s, log: [{ week: 1, visible: lines, hidden: [], acts: [], danger: { war: 0, treaty: 50, step: 1 } }], headline: lines.slice(-6) };
    expect(allTapeLines(later, 'WEEK').map((l) => l.text)).toEqual(lines);
  });
});

describe('the note and the card', () => {
  it('writes the orders so far, else the collision in week 1, else the world as it stands', () => {
    const s = newGame(null, 'T');
    const bloc = (r: string) => S.blocs[blocOf(r)];
    expect(noteFor(s, S, regionName, bloc)).toBe('You inherited a promise to Lintel.');
    const acted: GameState = { ...s, acts: [{ kind: 'promise', region: 'VSY' }, { kind: 'move', piece: 'brigade', to: 'VSY' }] };
    expect(noteFor(acted, S, regionName, bloc)).toBe('You promised to defend Vessary. You moved the brigade to Vessary.');
    // A promise withdrawn the same week (and promised again) is no order: the note keeps the net orders only.
    const undone: GameState = { ...s, acts: [{ kind: 'move', piece: 'fleet', to: 'ASK' }, { kind: 'promise', region: 'VSY' }, { kind: 'withdraw', region: 'VSY' }, { kind: 'promise', region: 'VSY' }] };
    expect(noteFor(undone, S, regionName, bloc)).toBe('You moved the fleet to Ashkettle. You promised to defend Vessary.');
    const inherited: GameState = { ...s, acts: [{ kind: 'withdraw', region: 'LTL' }, { kind: 'promise', region: 'LTL' }] };
    expect(noteFor(inherited, S, regionName, bloc)).toBe('You inherited a promise to Lintel.');
    expect(actLines([{ kind: 'way-out', term: 'summit', detail: null }], S, regionName)).toEqual(['You offered a way out: a summit.']);
    // Nothing pressed, nothing taken, no test: where their forces are heading.
    expect(noteFor({ ...s, week: 3, war: 0 }, S, regionName, bloc)).toBe('Their forces are heading for Kelpmouth.');
    expect(fightingSentence(S, 1)).toBe('One place is still fighting.');
    expect(fightingSentence(S, 3)).toBe('Three places are still fighting.');
  });

  it("the situation: where they are pushing (by bloc), what they have taken, the promise under test (MOMENT.md's note)", () => {
    const s = newGame(null, 'T');
    const bloc = (r: string) => S.blocs[blocOf(r)];
    const regions = { ...s.regions, KLP: { state: 'pressed' as const, pressedWeeks: 1, quietWeeks: 0 }, LTL: { state: 'pressed' as const, pressedWeeks: 0, quietWeeks: 0 }, SHL: { state: 'fighting' as const, pressedWeeks: 0, quietWeeks: 0, fellWeek: 2 } };
    expect(situation({ ...s, week: 3, regions, pendingTest: 'LTL' }, S, regionName, bloc)).toBe('They are pushing the Sound. They have taken Shoal. Your promise at Lintel is being tested now.');
    const two = { ...regions, VSY: { state: 'pressed' as const, pressedWeeks: 0, quietWeeks: 0 }, ASK: { state: 'fighting' as const, pressedWeeks: 0, quietWeeks: 0, fellWeek: 2 } };
    expect(situation({ ...s, week: 3, regions: two, pendingTest: null }, S, regionName, bloc)).toBe('They are pushing Highmarch and the Sound. They have taken two places.');
    expect(situation({ ...s, week: 3, fed: { ...s.fed, headings: [] } }, S, regionName, bloc)).toBe('No place is fighting.');
  });

  it('says how many regions are fighting under WAR', () => {
    expect(warSub(S, 0)).toBe('nothing fighting · world war at 8');
    expect(warSub(S, 1)).toBe('1 region fighting · world war at 8');
    // From two up the line would run into the WORLD WAR label at the card's right: the first clause only.
    expect(warSub(S, 4)).toBe('4 regions fighting');
  });
});

describe('the slips', () => {
  it('says why a promise is solid or dashed, in the content\'s words', () => {
    const piece = { kind: 'brigade' as const, at: 'EDV' };
    expect(holdWords(S, { ok: true, why: 'piece-near', piece }, regionName)).toBe('the brigade is at Edda Vale, within reach');
    expect(promiseLine(S, { ok: true, why: 'piece-near', piece }, regionName)).toBe('costs 1 influence a week · solid · the brigade is at Edda Vale, within reach');
    expect(promiseLine(S, { ok: false, why: 'out-of-reach' }, regionName)).toBe('costs 1 influence a week · dashed · nothing of ours is within reach · a dashed ring invites a test');
    expect(counterLabel(S, 'fleet')).toBe('FLEET');
  });

  it('prices a way-out term with no piece named yet by its cost alone', () => {
    expect(termLine(S, 'pull-back', 15, null)).toBe('costs 15 influence');
    expect(termLine(S, 'pull-back', 15, 'fleet')).toBe('the fleet goes home · costs 15 influence');
    expect(termLine(S, 'summit', 20, null)).toBe('no preconditions · costs 20 influence');
  });

  it('types the caller card from the adviser', () => {
    expect(callerLines({ caller: { name: 'Ruun Halder', role: 'General', tag: 'the Hawk' } })).toEqual({ name: 'GENERAL RUUN HALDER', lead: 'the', role: 'Hawk' });
    expect(callerLines({ caller: { name: 'Dagny Fell', role: 'Intel Director', tag: 'Intel' } })).toEqual({ name: 'INTEL DIRECTOR DAGNY FELL', lead: '', role: 'Intel' });
    expect(adviserWho('hawk', 'General')).toBe('HAWK · GENERAL');
    expect(adviserWho('intel', 'Intel Director')).toBe('INTEL · DIRECTOR');
  });
});

describe('reading a headline back', () => {
  const H = S.headlines;
  const isRegion = (n: string) => ['Lintel', 'Kelpmouth', 'Shoal'].includes(n);

  it('finds the kind and the slots, most literal template first', () => {
    expect(matchHeadline(H, 'Federation forces push into Kelpmouth', isRegion)).toEqual({ kind: 'pushed', slots: { region: 'Kelpmouth' } });
    expect(matchHeadline(H, 'You waited too long · Lintel has fallen', isRegion)).toEqual({ kind: 'waitedFell', slots: { region: 'Lintel' } });
    expect(matchHeadline(H, 'Lintel has fallen', isRegion)).toEqual({ kind: 'fell', slots: { region: 'Lintel' } });
    expect(matchHeadline(H, 'TREATY SIGNED', isRegion)).toEqual({ kind: 'treatySigned', slots: {} });
    expect(matchHeadline(H, 'A place taken, nobody came · now PUSHING', isRegion)).toEqual({ kind: 'takenStepUp', slots: { step: 'PUSHING' } });
  });

  it('falls back to the declared line (which matches anything) last, and rejects a non-place in a region slot', () => {
    expect(matchHeadline(H, "Wintermast: 'no missiles north of Edda Vale'", isRegion)?.kind).toBe('declared');
    expect(matchHeadline(H, 'Nonsense has fallen', isRegion)?.kind).toBe('declared');
  });
});

describe('seeds', () => {
  it('are short and readable', () => {
    let i = 0;
    expect(randomSeed(() => (i++ % 10) / 10)).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  });
});
