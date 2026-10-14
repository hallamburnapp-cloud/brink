import { describe, expect, it } from 'vitest';
import { newRun } from '../../engine';
import { backStep } from './history';
import { goalLine, joinSpotlight } from './hints';

describe('the back button', () => {
  const base = { screen: 'game' as const, sheetOpen: false, balloonOpen: false, armed: false, busy: false, over: false };

  it('asks before it drops a night, and closes what is open first', () => {
    expect(backStep(base)).toBe('ask-quit');
    expect(backStep({ ...base, sheetOpen: true })).toBe('close-sheet');
    expect(backStep({ ...base, balloonOpen: true })).toBe('close-balloon');
    expect(backStep({ ...base, armed: true })).toBe('cancel-order');
    expect(backStep({ ...base, busy: true })).toBe('skip-and-ask');
  });

  it('goes home from a finished night, and leaves from the bare title', () => {
    expect(backStep({ ...base, over: true })).toBe('go-home');
    expect(backStep({ ...base, screen: 'title' })).toBe('leave');
    expect(backStep({ ...base, screen: 'title', sheetOpen: true })).toBe('close-sheet');
  });
});

describe('first-night teaching', () => {
  it('opens with the goal in the crisis\'s own numbers', () => {
    expect(goalLine(newRun('FIRST-NIGHT'))).toBe('Reach *300* in *4 sweeps*, or the world tips.');
  });

  it('lights the pins and the lit regions a further pin would join', () => {
    const s = newRun('FIRST-NIGHT');
    expect(joinSpotlight(s)).toBeNull();
    const one = { ...s, crisis: { ...s.crisis, pins: ['LNK'] } };
    // Lantern Key's lit neighbours on the first deal: Gullrest and Shoal (by causeway).
    expect(joinSpotlight(one)?.sort()).toEqual(['GUL', 'LNK', 'SHL']);
    const two = { ...s, crisis: { ...s.crisis, pins: ['LNK', 'GUL'] } };
    expect(joinSpotlight(two)?.sort()).toEqual(['GUL', 'LNK', 'SHL']);
    // Edda Vale's only lit neighbour is Quillon.
    const edv = { ...s, crisis: { ...s.crisis, pins: ['EDV'] } };
    expect(joinSpotlight(edv)?.sort()).toEqual(['EDV', 'QLN']);
    // Nothing lit joins Hearth: no spotlight.
    const hrt = { ...s, crisis: { ...s.crisis, pins: ['HRT'] } };
    expect(joinSpotlight(hrt)).toBeNull();
  });
});
