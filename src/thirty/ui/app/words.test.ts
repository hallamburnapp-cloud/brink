import { describe, expect, it } from 'vitest';
import type { TraceStep } from './engine';
import { arrivalPieces, chipLabels, newsLabel } from './words';

const heat = (region: string, from: 0 | 1 | 2 | 3, to: 0 | 1 | 2 | 3, why: 'choice' | 'news' | 'piece' | 'spread' | 'pressure' | 'flare', extra: { source?: string; piece?: string } = {}): TraceStep => ({
  kind: 'heat',
  region,
  from,
  to,
  why,
  danger: 0,
  ...extra,
});

describe('the news under the ring', () => {
  it('says what the card found, from the arrival or the last night', () => {
    expect(newsLabel('BRK', [heat('BRK', 0, 1, 'news')])).toBe('NOW TENSE');
    expect(newsLabel('BRK', [], [heat('QLN', 0, 1, 'flare'), heat('BRK', 1, 2, 'news')])).toBe('NOW A CRISIS');
    expect(newsLabel('WMS', [heat('WMS', 2, 0, 'piece', { piece: 'hotline' })])).toBe('CALMED BY THE HOTLINE');
    expect(newsLabel('WMS', [])).toBeNull();
    expect(newsLabel(null, [heat('WMS', 0, 1, 'news')])).toBeNull();
    // Another region's news is not this ring's.
    expect(newsLabel('WMS', [], [heat('BRK', 0, 1, 'news')])).toBeNull();
  });

  it('finds the pieces that acted on arrival', () => {
    expect(arrivalPieces([heat('WMS', 2, 0, 'piece', { piece: 'hotline' }), { kind: 'piece', piece: 'cautious-intel', note: 'x' }])).toEqual(['hotline', 'cautious-intel']);
    expect(arrivalPieces([heat('WMS', 0, 1, 'news')])).toEqual([]);
  });
});

describe('the chips', () => {
  it('show whole names while they fit the row, else the one-word names', () => {
    const team = [
      { name: 'Hotline', chip: 'Hotline' },
      { name: 'Red Lines', chip: 'Red Line' },
      { name: 'Spin Doctor', chip: 'Spin' },
    ];
    expect(chipLabels(team)).toEqual(['HOTLINE', 'RED LINES', 'SPIN DOCTOR']);
    const long = [
      { name: 'Cautious Intel Director', chip: 'Cautious' },
      { name: 'Launch on Warning', chip: 'Warning' },
      { name: 'Old Ambassador', chip: 'Ambassador' },
      { name: 'Peace Movement', chip: 'Peace' },
    ];
    expect(chipLabels(long)).toEqual(['CAUTIOUS', 'WARNING', 'AMBASSADOR', 'PEACE']);
    expect(chipLabels(long.slice(2))).toEqual(['OLD AMBASSADOR', 'PEACE MOVEMENT']);
    expect(chipLabels(long.slice(0, 2))).toEqual(['CAUTIOUS INTEL DIRECTOR', 'LAUNCH ON WARNING']);
    expect(chipLabels(long.slice(0, 3))).toEqual(['CAUTIOUS', 'WARNING', 'AMBASSADOR']);
  });
});
