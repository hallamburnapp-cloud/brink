import { describe, expect, it } from 'vitest';
import { marks, nextMark, regionsWon, target } from './ladder';

describe('targets (SPEC section 5)', () => {
  it('T(1..26) match the table', () => {
    const table = [
      64, 96, 140, 220, 320, 490, 730, 1_100, 1_600, 2_500, 3_700, 5_500, 8_300, 12_000, 19_000, 28_000, 42_000,
      63_000, 95_000, 140_000, 210_000, 320_000, 480_000, 720_000, 1_100_000, 1_600_000,
    ];
    expect(table.map((_, i) => target(i + 1))).toEqual(table.map(BigInt));
  });
});

describe('the region ladder at T = 1,100 (SPEC section 15.3)', () => {
  const T = 1_100n;
  const cases: Array<[bigint, number, bigint]> = [
    [1_099n, 0, 1_100n],
    [1_100n, 1, 4_400n],
    [4_399n, 1, 4_400n],
    [4_400n, 2, 17_600n],
    [17_600n, 3, 35_200n],
    [35_200n, 4, 70_400n],
    [140_800n, 6, 281_600n],
    [1_000_000n, 8, 1_126_400n],
  ];
  it.each(cases)('%s wins %i, next region at %s', (score, regions, next) => {
    expect(regionsWon(score, T)).toBe(regions);
    expect(nextMark(score, T)).toBe(next);
  });

  it('lists the marks: 1,100, 4,400, 17,600, then doubling', () => {
    expect(marks(T, 8)).toEqual([1_100n, 4_400n, 17_600n, 35_200n, 70_400n, 140_800n, 281_600n, 563_200n]);
  });

  it('has no cap', () => {
    expect(regionsWon(1_100n * 2n ** 40n, T)).toBe(39);
    expect(regionsWon(0n, T)).toBe(0);
    expect(nextMark(0n, T)).toBe(T);
  });
});
