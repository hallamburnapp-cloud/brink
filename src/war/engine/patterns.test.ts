import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../content/map';
import { detectPattern, listCandidates, startingLevels } from './patterns';
import { testBoard } from './testkit';
import type { World } from './types';

const levels = startingLevels();
const detectOn = (board: ReturnType<typeof testBoard>, pins: string[]) => detectPattern(pins, board, board.world.levels);
const detect = (pins: string[], edit?: (w: World) => void) => detectOn(testBoard({ edit }), pins);

describe('pattern detection: the spec examples', () => {
  it('Example 1: Lantern Key, Gullrest and Shoal make a CHAIN', () => {
    const d = detect(['LNK', 'GUL', 'SHL']);
    expect(d.pattern).toBe('CHAIN');
    expect(d.scoring).toEqual(['GUL', 'LNK', 'SHL']);
  });

  it('Example 1: the four northern regions make a FRONT', () => {
    const d = detect(['NWK', 'FRM', 'WNM', 'WMS']);
    expect(d.pattern).toBe('FRONT');
    expect(d.scoring).toEqual(['NWK', 'WNM', 'FRM', 'WMS']);
  });

  it('Example 1: the other plays on the same deal', () => {
    expect(detect(['LNK']).pattern).toBe('SINGLE');
    expect(detect(['LNK', 'GUL']).pattern).toBe('LINK');
    expect(detect(['EDV', 'QLN']).pattern).toBe('LINK');
  });

  it('Example 2: a NETWORK across three colours through two sea lanes', () => {
    const d = detect(['SHL', 'LTL', 'TLM', 'KLP', 'KLM']);
    expect(d.pattern).toBe('NETWORK');
    expect(d.scoring).toEqual(['SHL', 'LTL', 'KLP', 'KLM', 'TLM']);
  });

  it('Example 3: a NETWORK over land, a lane and causeways', () => {
    const d = detect(['EDV', 'MRD', 'TRN', 'GUL', 'LNK']);
    expect(d.pattern).toBe('NETWORK');
    expect(d.scoring).toEqual(['EDV', 'MRD', 'TRN', 'GUL', 'LNK']);
  });
});

describe('pattern detection: shapes', () => {
  it('SINGLE scores the heaviest pin, ties to the westmost', () => {
    expect(detect(['ICW', 'HRT', 'EDV']).scoring).toEqual(['EDV']);
    // NWK and QLN both weigh 4; QLN (x 30) is west of NWK (x 62).
    expect(detect(['NWK', 'QLN']).scoring).toEqual(['QLN']);
  });

  it('3 + 2 pins gives CHAIN, scoring only the three', () => {
    const d = detect(['LNK', 'GUL', 'SHL', 'EDV', 'QLN']);
    expect(d.pattern).toBe('CHAIN');
    expect(d.scoring).toEqual(['GUL', 'LNK', 'SHL']);
  });

  it('2 + 2 + 1 gives TWO LINKS, scoring both pairs', () => {
    const d = detect(['EDV', 'QLN', 'NWK', 'FRM', 'ICW']);
    expect(d.pattern).toBe('TWO_LINKS');
    expect(d.scoring).toEqual(['QLN', 'NWK', 'EDV', 'FRM']);
  });

  it('LINK picks the heavier pair when two pairs are not enough for anything else', () => {
    // One pair and two loose pins.
    const d = detect(['TLM', 'ORN', 'ICW']);
    expect(d.pattern).toBe('LINK');
    expect(d.scoring).toEqual(['TLM', 'ORN']);
  });

  it('4 joined pins make a FRONT, 5 a NETWORK', () => {
    expect(detect(['VSY', 'RMH', 'EDV', 'QLN']).pattern).toBe('FRONT');
    expect(detect(['VSY', 'RMH', 'EDV', 'QLN', 'ASK']).pattern).toBe('BLOC');
    expect(detect(['VSY', 'RMH', 'EDV', 'QLN', 'NWK']).pattern).toBe('NETWORK');
  });

  it('SURROUND rings an unpinned region whose neighbours are all pinned', () => {
    // KLM's neighbours: WMS, GLM, KLP.
    const d = detect(['WMS', 'GLM', 'KLP']);
    expect(d.pattern).toBe('SURROUND');
    expect(d.ringed).toBe('KLM');
    expect(d.scoring).toEqual(['GLM', 'WMS', 'KLP']);
  });

  it('SURROUND picks the heaviest ring', () => {
    // These pins ring both Wenmoor (FRM, GLM, NWK: weight 12) and Wintermast (FRM, GLM, KLM: 15).
    const d = detect(['NWK', 'FRM', 'GLM', 'KLM', 'EDV']);
    expect(d.pattern).toBe('SURROUND');
    expect(d.ringed).toBe('WMS');
    expect(d.scoring).toEqual(['FRM', 'GLM', 'KLM']);
    const rings = listCandidates(['NWK', 'FRM', 'GLM', 'KLM', 'EDV'], testBoard()).filter((c) => c.pattern === 'SURROUND');
    expect(rings).toHaveLength(1);
  });

  it('SURROUND needs 3 or more neighbours, and ignores retired regions', () => {
    // BRK has only 2 neighbours (KLP, TLM).
    expect(detect(['KLP', 'TLM']).pattern).toBe('LINK');
    // Retire KLM: nothing to ring any more.
    expect(detect(['WMS', 'GLM', 'KLP'], (w) => w.retired.push('KLM')).pattern).not.toBe('SURROUND');
  });

  it('WORLDWIDE: five pins of five colours; BLOC: five of one colour', () => {
    expect(detect(['NWK', 'EDV', 'LNK', 'TLM', 'MRM']).pattern).toBe('WORLDWIDE');
    expect(detect(['BRN', 'MRM', 'FLE', 'ICW', 'SLW']).pattern).toBe('BLOC');
  });

  it('WHOLE BLOC becomes possible after Retire', () => {
    const pins = ['NWK', 'FRM', 'WMS', 'WNM', 'GLM'];
    expect(detect(pins).pattern).toBe('BLOC');
    const d = detect(pins, (w) => w.retired.push('KLM'));
    expect(d.pattern).toBe('WHOLE_BLOC');
    expect(d.scoring).toEqual(['NWK', 'WNM', 'FRM', 'GLM', 'WMS']);
  });

  it('WHOLE BLOC follows colours changed by DEFECT', () => {
    const edit = (w: World) => {
      w.colour.KLP = 'SCT';
      w.colour.BRK = 'SCT';
      w.colour.LTL = 'SCT';
    };
    // Sundry is down to TLM, DNM, ORN: pin all three.
    const d = detect(['TLM', 'DNM', 'ORN'], edit);
    expect(d.pattern).toBe('WHOLE_BLOC');
  });

  it('AROUND THE WORLD with a cable joining five colours', () => {
    // A chain NWK-VSY (lane) VSY-RMH... is one colour pair; build one with cables instead.
    const edit = (w: World) => {
      w.cables.push(['WMS', 'EDV'], ['EDV', 'LNK'], ['LNK', 'TLM'], ['TLM', 'MRM']);
    };
    const d = detect(['WMS', 'EDV', 'LNK', 'TLM', 'MRM'], edit);
    expect(d.pattern).toBe('AROUND_THE_WORLD');
  });

  it('GRIDLOCK cuts lanes and cables: Example 2 falls apart', () => {
    const board = testBoard({ twist: { kind: 'GRIDLOCK', colour: null } });
    expect(detectOn(board, ['SHL', 'LTL', 'TLM', 'KLP', 'KLM']).pattern).toBe('CHAIN');
  });

  it('FERRY MASTER joins every port to every other port (not under Gridlock)', () => {
    const ferry = testBoard({ staff: ['FERRY'] });
    expect(detectOn(ferry, ['NWK', 'ORN']).pattern).toBe('LINK');
    const gridlocked = testBoard({ staff: ['FERRY'], twist: { kind: 'GRIDLOCK', colour: null } });
    expect(detectOn(gridlocked, ['NWK', 'ORN']).pattern).toBe('SINGLE');
  });

  it('picks the largest base product at its level, not the highest rung', () => {
    // WMS-GLM is a LINK and the three pins ring KLM: SURROUND (250) beats LINK (20) at level 1...
    const board = testBoard();
    const pins = ['WMS', 'GLM', 'KLP'];
    expect(detectPattern(pins, board, levels).pattern).toBe('SURROUND');
    // ...but LINK at level 6 is (10 + 75) x (2 + 5) = 595.
    const d = detectPattern(pins, board, { ...levels, LINK: 6 });
    expect(d.pattern).toBe('LINK');
    expect(d.level).toBe(6);
    expect(d.scoring).toEqual(['GLM', 'WMS']);
  });

  it('breaks a tie in base product in favour of the higher rung', () => {
    const board = testBoard();
    // SINGLE at level 3 is 25 x 3 = 75; LINK at level 2 is 25 x 3 = 75.
    expect(detectPattern(['LNK', 'GUL'], board, { ...levels, SINGLE: 3, LINK: 2 }).pattern).toBe('LINK');
    // SINGLE at level 4 (35 x 4 = 140) wins outright.
    expect(detectPattern(['LNK', 'GUL'], board, { ...levels, SINGLE: 4, LINK: 2 }).pattern).toBe('SINGLE');
  });
});

describe('AROUND THE WORLD on the starting map', () => {
  it('is impossible in every one of the 142,506 five-sets', () => {
    const board = testBoard();
    const ids = REGION_IDS;
    let sets = 0;
    let around = 0;
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++)
        for (let c = b + 1; c < ids.length; c++)
          for (let d = c + 1; d < ids.length; d++)
            for (let e = d + 1; e < ids.length; e++) {
              sets++;
              const cands = listCandidates([ids[a], ids[b], ids[c], ids[d], ids[e]], board);
              if (cands.some((x) => x.pattern === 'AROUND_THE_WORLD')) around++;
            }
    expect(sets).toBe(142_506);
    expect(around).toBe(0);
  });
});
