import { describe, expect, it } from 'vitest';
import {
  BORDERS,
  CAPITALS,
  CAUSEWAYS,
  COLOUR_ORDER,
  COLOURS,
  ISLANDS,
  LAND,
  LANES,
  OUTLINES,
  PORTS,
  REGION,
  REGIONS,
  joinKey,
} from './map';
import { loadFixtures } from '../engine/testdata';
import { STAFF, STAFF_DEF, STAFF_IDS, isStaffId, seatChip } from './staff';

describe('the map', () => {
  it('has 30 regions, 6 per colour, with unique ids', () => {
    expect(REGIONS).toHaveLength(30);
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(30);
    for (const c of COLOUR_ORDER) expect(REGIONS.filter((r) => r.colour === c)).toHaveLength(6);
  });

  it('gives every colour the weights 10, 7, 6, 5, 4, 3', () => {
    for (const c of COLOUR_ORDER) {
      const weights = REGIONS.filter((r) => r.colour === c)
        .map((r) => r.weight)
        .sort((a, b) => b - a);
      expect(weights).toEqual([10, 7, 6, 5, 4, 3]);
    }
  });

  it('has 45 land joins: 36 borders and 9 causeways, all within one colour', () => {
    expect(LAND).toHaveLength(45);
    expect(BORDERS).toHaveLength(36);
    expect(CAUSEWAYS).toHaveLength(9);
    expect(new Set(LAND.map(([a, b]) => joinKey(a, b))).size).toBe(45);
    for (const [a, b] of LAND) expect(REGION[a].colour).toBe(REGION[b].colour);
    expect(CAUSEWAYS.map(([a, b]) => joinKey(a, b)).sort()).toEqual(
      [
        ['GUL', 'DRF'],
        ['GUL', 'TRN'],
        ['GUL', 'LNK'],
        ['DRF', 'LNK'],
        ['TRN', 'LNK'],
        ['TRN', 'PBB'],
        ['LNK', 'PBB'],
        ['LNK', 'SHL'],
        ['PBB', 'SHL'],
      ]
        .map(([a, b]) => joinKey(a, b))
        .sort(),
    );
  });

  it('has 9 sea lanes between different colours, at most one per region', () => {
    expect(LANES).toHaveLength(9);
    const count = new Map<string, number>();
    for (const [a, b] of LANES) {
      expect(REGION[a].colour).not.toBe(REGION[b].colour);
      for (const r of [a, b]) count.set(r, (count.get(r) ?? 0) + 1);
    }
    expect(Math.max(...count.values())).toBe(1);
    expect(LAND.length + LANES.length).toBe(54);
  });

  it('has 18 ports and 5 capitals, one capital per colour', () => {
    expect(PORTS).toHaveLength(18);
    expect(CAPITALS).toHaveLength(5);
    expect(new Set(CAPITALS.map((r) => REGION[r].colour)).size).toBe(5);
    for (const r of REGIONS) expect(r.port).toBe(r.lane !== null);
  });

  it('matches the neighbour lists in the spec', () => {
    const nb = (id: string) => [...REGION[id].neighbours].sort();
    expect(nb('NWK')).toEqual(['FRM', 'VSY', 'WNM']);
    expect(nb('GLM')).toEqual(['DRF', 'FRM', 'KLM', 'WMS', 'WNM']);
    expect(nb('LNK')).toEqual(['DRF', 'GUL', 'PBB', 'SHL', 'TRN']);
    expect(nb('MRM')).toEqual(['BRN', 'FLE', 'HRT', 'ICW', 'PBB', 'SLW']);
    expect(nb('TLM')).toEqual(['BRK', 'DNM', 'KLP', 'LTL', 'ORN']);
  });

  it('has colours, outlines and island discs', () => {
    expect(COLOURS.CAP).toEqual({ id: 'CAP', name: 'The Cap', hex: '#7CC4FF', glyph: 'triangle' });
    expect(COLOURS.FRS.hex).toBe('#A98BFF');
    expect(Object.keys(OUTLINES).sort()).toEqual(['CAP', 'FRS', 'HMR', 'SND']);
    expect(OUTLINES.CAP[0]).toEqual([24, 22]);
    expect(ISLANDS.map((i) => i.id).sort()).toEqual(['DRF', 'GUL', 'LNK', 'PBB', 'SHL', 'TRN']);
    expect(ISLANDS.every((i) => i.r === 24)).toBe(true);
    expect(REGIONS.filter((r) => r.island).every((r) => r.colour === 'SCT')).toBe(true);
  });
});

describe('staff', () => {
  it('has the ten staff of SPEC section 7, in shop order, with prices and sale values', () => {
    expect(STAFF.map((x) => [x.id, x.name, x.object, x.price, x.sell])).toEqual([
      ['DUTY', 'Duty Officer', 'desk lamp', 3, 1],
      ['QM', 'Quartermaster', 'supply crate', 3, 1],
      ['SURVEYOR', 'Surveyor', 'theodolite', 4, 2],
      ['OLDHAND', 'Old Hand', 'tin mug', 4, 2],
      ['SOVEREIGN', 'Sovereign', 'signet ring', 5, 2],
      ['STRATEGIST', 'Strategist', 'folded map', 5, 2],
      ['GOVERNOR', 'Governor', 'wax seal', 6, 3],
      ['HARBOUR', 'Harbourmaster', "ship's bell", 6, 3],
      ['HERALD', 'Herald', 'paper crown', 6, 3],
      ['DEPUTY', 'Deputy', 'carbon paper', 7, 3],
    ]);
    expect(STAFF_IDS).toHaveLength(10);
    for (const x of STAFF) expect(x.sell).toBe(Math.floor(x.price / 2));
  });

  it('prints every rule exactly, in 8 words or fewer', () => {
    expect(STAFF.map((x) => x.rule)).toEqual([
      '+4 multiplier.',
      '+20 points.',
      '+1 multiplier for every 3 regions you hold.',
      '×1 multiplier. Grows by 0.2 every turn.',
      '×2 multiplier for each capital pinned.',
      '×3 multiplier if you pin 4 or 5.',
      '×1.5 multiplier for each gold region pinned.',
      '×1.5 multiplier for each port pinned.',
      'Every pin counts as a capital and port.',
      'Copies the staff to its right.',
    ]);
    for (const x of STAFF) expect(x.rule.split(' ').length).toBeLessThanOrEqual(8);
  });

  it('matches the reference staff table', () => {
    const ref = loadFixtures().staff;
    expect(Object.keys(ref)).toEqual([...STAFF_IDS]);
    for (const x of STAFF) {
      expect(ref[x.id]).toEqual({ name: x.name, icon: x.object, price: x.price, rule: x.rule, chip: x.chip });
    }
  });

  it('has the seat chips, with the Surveyor and Old Hand live', () => {
    expect(STAFF.map((x) => seatChip(x.id))).toEqual([
      '+4', '+20', '+0', '×1.0', '×2 CAPITAL', '×3 IF 4+', '×1.5 GOLD', '×1.5 PORT', 'ALL PINS ★ ⚓', 'COPY',
    ]);
    expect(seatChip('SURVEYOR', { gold: 14 })).toBe('+4');
    expect(seatChip('OLDHAND', { oldHandM10: 14 })).toBe('×1.4');
    expect(seatChip('OLDHAND', { oldHandM10: 30 })).toBe('×3.0');
  });

  it('colours chips by what they add and knows where each acts', () => {
    expect(STAFF.filter((x) => x.tone === 'points').map((x) => x.id)).toEqual(['QM']);
    expect(STAFF_DEF.GOVERNOR.actsOn).toBe('gold');
    expect(STAFF_DEF.HARBOUR.actsOn).toBe('port');
    expect(STAFF_DEF.SOVEREIGN.actsOn).toBe('capital');
    expect(isStaffId('HERALD')).toBe(true);
    expect(isStaffId('FERRY')).toBe(false);
  });
});
