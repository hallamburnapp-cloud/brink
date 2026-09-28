import { describe, expect, it } from 'vitest';
import { fixture } from './fixture';
import { checkConditions } from './conditions';
import { createRun } from './run';

const content = fixture();
const base = () => createRun(content, { seed: 'c', seat: 'republic', mode: 'endless' });

describe('checkConditions', () => {
  it('handles flags including piece grants and engine flags', () => {
    const s = base();
    s.flags.push('x');
    expect(checkConditions({ flags_all: ['x', 'seat:republic'] }, s, [])).toBe(true);
    expect(checkConditions({ flags_any: ['nope', 'x'] }, s, [])).toBe(true);
    expect(checkConditions({ flags_none: ['x'] }, s, [])).toBe(false);
    const granted = { ...content.pieces.p_hawk, grants: ['g'] };
    expect(checkConditions({ flags_all: ['g'] }, s, [granted])).toBe(true);
    expect(checkConditions({ flags_all: ['g'] }, s, [])).toBe(false);
  });
  it('checks value ranges on meters and hidden values', () => {
    const s = base();
    s.meters.escalation = 40;
    s.hidden.intel = 20;
    expect(checkConditions({ values: { escalation: { min: 30, max: 50 } } }, s, [])).toBe(true);
    expect(checkConditions({ values: { escalation: { min: 41 } } }, s, [])).toBe(false);
    expect(checkConditions({ values: { intel: { max: 19 } } }, s, [])).toBe(false);
  });
  it('checks pieces, day, seen and act cards', () => {
    const s = base();
    s.pieces.push('p_hawk');
    s.seen.push('c_basic');
    s.day = 9;
    s.actCards = 4;
    expect(checkConditions({ pieces_any: ['p_hawk', 'p_dove'] }, s, [])).toBe(true);
    expect(checkConditions({ pieces_all: ['p_hawk', 'p_dove'] }, s, [])).toBe(false);
    expect(checkConditions({ pieces_none: ['p_hawk'] }, s, [])).toBe(false);
    expect(checkConditions({ day: { min: 8, max: 10 } }, s, [])).toBe(true);
    expect(checkConditions({ day: { min: 10 } }, s, [])).toBe(false);
    expect(checkConditions({ seen: ['c_basic'] }, s, [])).toBe(true);
    expect(checkConditions({ unseen: ['c_basic'] }, s, [])).toBe(false);
    expect(checkConditions({ act_card_min: 5 }, s, [])).toBe(false);
    expect(checkConditions(undefined, s, [])).toBe(true);
  });
});
