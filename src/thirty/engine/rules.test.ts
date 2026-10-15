import { describe, expect, it } from 'vitest';
import { RULES, clampHeat, dangerOf, isOfferDay, mapDanger, weekOf } from './rules.ts';
import { HOME_CAPITAL, HOME_REGIONS, REGION_IDS, SEA_REGIONS, coolestFirst, forceTarget, hotNeighbours, hottestFirst, isHome, isSea, neighboursOf } from './world.ts';
import type { Heat, RegionId } from '../content/types.ts';

const calm = (): Record<RegionId, Heat> => Object.fromEntries(REGION_IDS.map((r) => [r, 0 as Heat]));

describe('DANGER (SPEC: 2 x TENSE + 5 x CRISIS + 12 x WAR, capped at 100)', () => {
  it('reads 11 for the starting map of three TENSE and one CRISIS', () => {
    const h = calm();
    h.SHL = 2;
    h.WMS = 1;
    h.ORN = 1;
    h.MRM = 1;
    expect(mapDanger(h)).toBe(11);
  });

  it('caps at 100 and adds the penalty', () => {
    const h = calm();
    for (const r of ['SHL', 'WMS', 'ORN', 'MRM', 'LTL', 'KLP', 'NWK', 'FLE', 'HRT']) h[r] = 3;
    expect(mapDanger(h)).toBe(100);
    const quiet = calm();
    quiet.SHL = 1;
    expect(dangerOf(quiet, 15)).toBe(17);
    expect(dangerOf(calm(), 0)).toBe(0);
  });

  it('weights by heat', () => {
    const h = calm();
    h.SHL = 3;
    expect(mapDanger(h)).toBe(12);
    h.LTL = 2;
    expect(mapDanger(h)).toBe(17);
  });
});

describe('calendar', () => {
  it('weeks are five days, offers after days 5, 10, 15, 20, 25', () => {
    expect(weekOf(1)).toBe(1);
    expect(weekOf(5)).toBe(1);
    expect(weekOf(6)).toBe(2);
    expect(weekOf(30)).toBe(6);
    expect([5, 10, 15, 20, 25].every(isOfferDay)).toBe(true);
    expect([1, 4, 6, 30].some(isOfferDay)).toBe(false);
    expect(RULES.days).toBe(30);
  });

  it('clamps heats to 0..3', () => {
    expect(clampHeat(-1)).toBe(0);
    expect(clampHeat(5)).toBe(3);
    expect(clampHeat(2)).toBe(2);
  });
});

describe('the map as the rules see it', () => {
  it('has 30 regions, six at home with Edda Vale the capital, nineteen at sea', () => {
    expect(REGION_IDS).toHaveLength(30);
    expect(HOME_REGIONS).toEqual(['VSY', 'RMH', 'QLN', 'EDV', 'ASK', 'MRD']);
    expect(HOME_CAPITAL).toBe('EDV');
    expect(isHome('EDV')).toBe(true);
    expect(isHome('SHL')).toBe(false);
    // Every port plus Lantern Key, the island without a lane.
    expect(SEA_REGIONS).toHaveLength(19);
    expect(isSea('LNK')).toBe(true);
    expect(isSea('EDV')).toBe(false);
    expect(isSea('SHL')).toBe(true);
  });

  it('neighbours include land joins and sea lanes', () => {
    expect(neighboursOf('SHL')).toEqual(expect.arrayContaining(['LNK', 'PBB', 'LTL']));
    expect(neighboursOf('SHL')).toHaveLength(3);
    expect(neighboursOf('VSY')).toContain('NWK');
  });

  it('a show of force heats the coolest neighbour not at WAR, ties west to east', () => {
    const h = calm();
    h.LNK = 1;
    h.PBB = 0;
    h.LTL = 0;
    // PBB (x 178) is west of LTL (x 290): PBB first.
    expect(forceTarget(h, 'SHL', () => true)).toBe('PBB');
    h.PBB = 2;
    expect(forceTarget(h, 'SHL', () => true)).toBe('LTL');
    h.LTL = 3;
    h.LNK = 3;
    h.PBB = 3;
    expect(forceTarget(h, 'SHL', () => true)).toBeNull();
    h.LTL = 0;
    expect(forceTarget(h, 'SHL', (r) => r !== 'LTL')).toBeNull();
  });

  it('sorts hottest first with map order among equals, and coolest first keeping the order given', () => {
    const h = calm();
    h.LTL = 2;
    h.LNK = 2;
    h.PBB = 1;
    expect(hottestFirst(h, ['PBB', 'LTL', 'LNK'])).toEqual(['LNK', 'LTL', 'PBB']);
    expect(hottestFirst(h, ['PBB', 'LTL', 'LNK'], (r) => r === 'LTL')).toEqual(['LTL', 'LNK', 'PBB']);
    expect(coolestFirst(h, ['LTL', 'PBB', 'LNK'])).toEqual(['PBB', 'LTL', 'LNK']);
    expect(hotNeighbours(h, 'SHL')).toEqual(['LNK', 'LTL', 'PBB']);
  });
});
