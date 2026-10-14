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
import { ORDERS, ORDER_IDS, playbook } from './orders';
import { PATTERNS, PUBLIC_PATTERNS, SECRET_PATTERNS, patternValues } from './patterns';
import { SHOP_STAFF, STAFF, STAFF_DEF, seatChip } from './staff';

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

describe('patterns', () => {
  it('lists the 11 rungs with the spec values', () => {
    expect(PATTERNS.map((p) => [p.name, p.baseInfluence, p.baseMomentum, p.influencePerLevel, p.momentumPerLevel])).toEqual([
      ['SINGLE', 5, 1, 10, 1],
      ['LINK', 10, 2, 15, 1],
      ['TWO LINKS', 20, 2, 20, 1],
      ['WORLDWIDE', 30, 2, 25, 2],
      ['CHAIN', 30, 3, 20, 2],
      ['FRONT', 45, 4, 25, 3],
      ['SURROUND', 50, 5, 30, 3],
      ['NETWORK', 70, 6, 35, 3],
      ['BLOC', 90, 8, 40, 4],
      ['WHOLE BLOC', 140, 12, 50, 4],
      ['AROUND THE WORLD', 180, 15, 50, 5],
    ]);
    expect(PUBLIC_PATTERNS).toHaveLength(9);
    expect(SECRET_PATTERNS).toEqual(['WHOLE_BLOC', 'AROUND_THE_WORLD']);
  });

  it('levels add their gain', () => {
    expect(patternValues('NETWORK', 3)).toEqual({ influence: 140, momentum: 12 });
    expect(patternValues('NETWORK', 6)).toEqual({ influence: 245, momentum: 21 });
  });
});

describe('staff', () => {
  it('has the 20 staff with spec prices and sell values', () => {
    expect(STAFF).toHaveLength(20);
    const row = (id: keyof typeof STAFF_DEF) => [STAFF_DEF[id].rarity, STAFF_DEF[id].price, STAFF_DEF[id].sell];
    expect(row('DUTY')).toEqual(['common', 3, 1]);
    expect(row('GOVERNOR')).toEqual(['common', 5, 2]);
    expect(row('FERRY')).toEqual(['uncommon', 7, 3]);
    expect(row('CHIEF')).toEqual(['rare', 9, 4]);
    expect(row('DEPUTY')).toEqual(['rare', 10, 5]);
    expect(STAFF_DEF.SOVEREIGN.sell).toBe(10);
    for (const s of STAFF) if (s.id !== 'SOVEREIGN') expect(s.sell).toBe(Math.max(1, Math.floor(s.price / 2)));
  });

  it('sells staff 1-19 in the shop, never the Sovereign', () => {
    expect(SHOP_STAFF).toHaveLength(19);
    expect(SHOP_STAFF).not.toContain('SOVEREIGN');
    expect(STAFF.filter((s) => s.rarity === 'common')).toHaveLength(8);
    expect(STAFF.filter((s) => s.rarity === 'uncommon')).toHaveLength(6);
    expect(STAFF.filter((s) => s.rarity === 'rare')).toHaveLength(5);
  });

  it('has the spec seat chips, with the Old Hand count live', () => {
    expect(STAFF.map((s) => s.chip)).toEqual([
      '+4M', '+30I', '+15⚓', '+15≤4', '+8M·3', '+5M★', '+4◆', '+nI', 'thr×3', '×3≤3',
      '×2·4', '×2·4c', '1st×2', '⚓=⚓', '★×2', '×1.5⚓', '×1.5★sb', 'COPY', 'all★', '★×2M',
    ]);
    expect(seatChip('OLDHAND', 15)).toBe('+15I');
    expect(seatChip('DUTY')).toBe('+4M');
  });

  it('writes every rule in plain words with no placeholder text', () => {
    for (const s of STAFF) {
      expect(s.rule.length).toBeGreaterThan(8);
      expect(s.rule.length).toBeLessThanOrEqual(80);
      expect(s.object.length).toBeGreaterThan(2);
    }
  });
});

describe('orders and playbooks', () => {
  it('has the 8 Orders at ◆3, selling for ◆1', () => {
    expect(ORDER_IDS).toEqual(['FORTIFY', 'RELAY', 'ECHO', 'CABLE', 'DEFECT', 'PROMOTE', 'RETIRE', 'AIRLIFT']);
    for (const o of ORDERS) {
      expect(o.price).toBe(3);
      expect(o.sell).toBe(1);
      expect(o.crisisOnly).toBe(o.id === 'AIRLIFT');
    }
  });

  it('describes Playbooks from the ladder', () => {
    expect(playbook('NETWORK')).toMatchObject({ name: 'NETWORK PLAYBOOK', price: 3 });
    expect(playbook('NETWORK').rule).toBe('NETWORK: +35 Influence, +3 Momentum.');
  });
});
