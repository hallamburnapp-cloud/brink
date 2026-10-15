import { describe, expect, it } from 'vitest';
import { REGION, type RegionId } from '../../content/map';
import { newGame, position } from '../../engine';
import { coachLow } from './Coach';

describe('the coach strip never covers the crisis', () => {
  const t1 = newGame('FIRST-WORLD');
  const at = (crisis: RegionId) => position(t1, { deal: { ...t1.deal, crisis } });
  const ids = Object.keys(REGION) as RegionId[];

  it('lies along the map foot when the crisis flares in the top third of the map, else along its top edge', () => {
    for (const id of ids) expect(coachLow(at(id)), id).toBe(REGION[id].y < 520 / 3);
    expect(ids.some((id) => coachLow(at(id)))).toBe(true);
    expect(ids.some((id) => !coachLow(at(id)))).toBe(true);
  });

  it('stays at the top edge in the shop and with no game', () => {
    const high = ids.reduce((a, b) => (REGION[a].y < REGION[b].y ? a : b));
    expect(coachLow({ ...at(high), phase: 'shop' })).toBe(false);
    expect(coachLow(null)).toBe(false);
  });
});
