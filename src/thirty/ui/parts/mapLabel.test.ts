import { describe, expect, it } from 'vitest';
import { MAP_LABEL_MAX, clausesOf, mapLabel } from './mapLabel';

describe('a hint fitted to the map', () => {
  it('keeps a short line whole and drops the last clauses of a long one, DANGER clause first', () => {
    expect(mapLabel('Danger down · Shoal calms')).toBe('Danger down · Shoal calms');
    expect(mapLabel('Danger down · Shoal calms, heats Lintel')).toBe('Danger down · Shoal calms, heats Lintel');
    expect(mapLabel('Danger down here · Orrinth calms, heats Dunmarrow, Orrinth is warned')).toBe('Danger down here · Orrinth calms');
    expect(mapLabel('Danger unchanged · Vessary guarded for a week')).toBe('Danger unchanged · Vessary guarded for a week');
  });

  it('never cuts a risky miss in half: "if not, Shoal heats" goes as one clause', () => {
    expect(clausesOf('if not, Northwake heats')).toEqual(['if not, Northwake heats']);
    expect(clausesOf('Shoal calms, if not, Lintel heats, DANGER +15')).toEqual(['Shoal calms', 'if not, Lintel heats', 'DANGER +15']);
    expect(mapLabel('Danger down if it works (60%) · if not, Northwake heats')).toBe('Danger down if it works (60%)');
    expect(mapLabel('Danger down if it works (60%) · if not, Shoal heats', 60)).toBe('Danger down if it works (60%) · if not, Shoal heats');
  });

  it('cuts only when even the DANGER clause is too long', () => {
    expect(mapLabel('Danger up even if it works (60%) · heats Lintel and 2 more', 20)).toBe('Danger up even if i…');
    expect(MAP_LABEL_MAX).toBe(46);
  });
});
