import { describe, expect, it } from 'vitest';
import { CAP_REGIONS, FLEET_MOVES, HOME_REGIONS, NEAR_CAP, REGION_IDS, brigadeMoves, distance, fleetMoves, isCap, isSea, reachOf, regionName } from './world.ts';

describe('the world', () => {
  it('has the thirty regions, six in the Cap and six at home', () => {
    expect(REGION_IDS).toHaveLength(30);
    expect(CAP_REGIONS).toHaveLength(6);
    expect(HOME_REGIONS).toHaveLength(6);
    expect(regionName('LTL')).toBe('Lintel');
    expect(isCap('WMS')).toBe(true);
    expect(isCap('VSY')).toBe(false);
  });
  it('the three doors: the places outside the Cap that touch it', () => {
    expect([...NEAR_CAP].sort()).toEqual(['DRF', 'KLP', 'VSY']);
  });
  it('the fleet moves on lanes and along coasts, never into the Cap', () => {
    expect(FLEET_MOVES.ASK).toEqual(expect.arrayContaining(['BRN', 'MRD']));
    expect(fleetMoves('VSY')).toEqual(['RMH']); // the lane to Northwake is the Cap's
    expect(fleetMoves('LNK')).toEqual(expect.arrayContaining(['GUL', 'DRF', 'TRN', 'PBB', 'SHL']));
    expect(isSea('EDV')).toBe(false);
    expect(FLEET_MOVES.EDV).toEqual([]);
  });
  it('the brigade moves on land joins, or across a lane the fleet holds', () => {
    expect(brigadeMoves('EDV', null)).toEqual(expect.arrayContaining(['VSY', 'RMH', 'QLN', 'ASK', 'MRD']));
    expect(brigadeMoves('MRD', null)).not.toContain('TRN');
    expect(brigadeMoves('MRD', 'MRD')).toContain('TRN');
    expect(brigadeMoves('MRD', 'TRN')).toContain('TRN');
    expect(brigadeMoves('VSY', 'VSY')).not.toContain('NWK');
  });
  it('reach: where a piece stands and one move away', () => {
    expect(reachOf({ kind: 'fleet', at: 'RMH' })).toEqual(expect.arrayContaining(['RMH', 'GUL', 'VSY']));
    expect(reachOf({ kind: 'brigade', at: 'EDV' })).toEqual(expect.arrayContaining(['EDV', 'VSY', 'RMH', 'QLN', 'ASK', 'MRD']));
    expect(reachOf({ kind: 'brigade', at: 'EDV' })).not.toContain('GUL');
  });
  it('distances follow land joins and lanes', () => {
    expect(distance('ASK', 'ASK')).toBe(0);
    expect(distance('ASK', 'BRN')).toBe(1);
    expect(distance('KLM', 'KLP')).toBe(1);
    expect(distance('EDV', 'LTL')).toBeGreaterThan(3);
  });
});
