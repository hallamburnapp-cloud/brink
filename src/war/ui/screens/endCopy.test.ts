import { describe, expect, it } from 'vitest';
import { REGION } from '../../content/map';
import type { EndView, GameState } from '../../engine';
import { endCopy, timesText } from './endCopy';
import { cardLow } from './EndCard';

const base: EndView = {
  ending: 'WAR',
  stars: 0,
  title: 'WAR',
  lines: [],
  turn: 6,
  gold: 3,
  red: 10,
  grey: 17,
  peakWar: 10,
  best: { score: 6n, target: 64n, text: '' },
  biggestTurn: { regions: 0, text: '0 regions' },
  staff: [],
  nearMiss: [],
};

describe('the end card copy', () => {
  it('never reads as broken when nothing was won', () => {
    const c = endCopy(base);
    expect(c.lines).toEqual(['War took 10 regions. You held 3 of 30.']);
    expect(c.best).toEqual({ value: '6', note: 'NEEDED 64', won: false });
    expect(c.biggest).toBeNull();
  });

  it('measures a winning best send against its target', () => {
    expect(endCopy({ ...base, best: { score: 749_414n, target: 19_000n, text: '' } }).best).toEqual({ value: '749,414', note: '39× THE TARGET', won: true });
    expect(timesText(5_598_720n, 12_000n)).toBe('466×');
    expect(timesText(96n, 64n)).toBe('1.5×');
  });

  it('says plainly how close a lost world came, and where to look', () => {
    const near = { ...base, gold: 18, grey: 2, nearMiss: ['VSY', 'QLN'], biggestTurn: { regions: 3, text: '' } };
    const c = endCopy(near);
    expect(c.lines[1]).toBe('Only 2 free regions were left to win.');
    expect(c.biggest).toBe('3 regions');
    // Vessary and Quillon sit in the upper half of the map: the card moves down out of their way.
    expect(cardLow(near)).toBe(true);
    expect(cardLow(base)).toBe(false);
  });

  it('keeps a CEASEFIRE card off the red regions it leaves outlined', () => {
    const cease = { ...base, ending: 'CEASEFIRE' as const, red: 2 };
    const owner = (red: string[]) => Object.fromEntries(Object.keys(REGION).map((id) => [id, red.includes(id) ? 'red' : 'gold'])) as GameState['owner'];
    // Vessary and Rimeholt (upper half): the card stands low; Iceward and Hearth (lower half): it hangs high.
    expect(cardLow(cease, owner(['VSY', 'RMH']))).toBe(true);
    expect(cardLow(cease, owner(['ICW', 'HRT']))).toBe(false);
  });

  it('keeps the WORLD UNITED and CEASEFIRE lines', () => {
    expect(endCopy({ ...base, ending: 'WORLD UNITED', turn: 15, peakWar: 6 }).lines).toEqual(['Turn 15 · war peaked at 6']);
    expect(endCopy({ ...base, ending: 'CEASEFIRE', red: 1 }).lines).toEqual(['War held 1 region when it stopped.']);
  });
});
