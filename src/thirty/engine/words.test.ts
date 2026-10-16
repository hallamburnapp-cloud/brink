import { describe, expect, it } from 'vitest';
import type { TraceStep } from './types.ts';
import { listNames, nightDelta, nightLine, nightSteps } from './words.ts';

type Why = 'choice' | 'news' | 'piece' | 'spread' | 'pressure' | 'flare' | 'war';
const heat = (region: string, from: 0 | 1 | 2 | 3, to: 0 | 1 | 2 | 3, why: Why, extra: { source?: string; piece?: string } = {}): TraceStep => ({
  kind: 'heat',
  region,
  from,
  to,
  why,
  danger: 0,
  ...extra,
});
const choiceMark: TraceStep = { kind: 'danger', at: 'choice', danger: 10 };
/** A trace whose night is these steps (the choice before the checkpoint is a cooling the line must not mention). */
const night = (...steps: TraceStep[]) => ({ steps: [heat('SHL', 2, 1, 'choice'), choiceMark, ...steps] });

describe('the night, in words', () => {
  it('reads only the steps after the choice, and says nothing when nothing happened', () => {
    expect(nightSteps(night()).length).toBe(0);
    expect(nightSteps({ steps: [heat('SHL', 2, 1, 'choice')] })).toEqual([]);
    expect(nightLine(night())).toBeNull();
    expect(nightLine(night({ kind: 'danger', at: 'pressure', danger: 10 }))).toBeNull();
    expect(nightLine({ steps: [heat('QLN', 0, 1, 'flare')] })).toBeNull();
  });

  it('names a flare, a spread, a spill, a boil, a crisis tipping into war and where the fighting began', () => {
    expect(nightLine(night(heat('QLN', 0, 1, 'flare')))).toBe('Trouble flared in Quillon.');
    expect(nightLine(night(heat('EDV', 1, 2, 'spread', { source: 'VSY' })))).toBe('The war in Vessary spread to Edda Vale.');
    expect(nightLine(night(heat('LTL', 0, 1, 'pressure', { source: 'SHL' })))).toBe('The crisis in Shoal spilled into Lintel.');
    expect(nightLine(night(heat('SHL', 1, 2, 'pressure', { source: 'SHL' })))).toBe('Shoal boiled over.');
    expect(nightLine(night(heat('LTL', 2, 3, 'pressure', { source: 'SHL' })))).toBe('The crisis in Shoal tipped Lintel into war.');
    expect(nightLine(night(heat('LTL', 2, 3, 'war')))).toBe('The fighting began in Lintel.');
  });

  it('puts the most important first, joins with semicolons and lists places', () => {
    const line = nightLine(night(heat('QLN', 0, 1, 'flare'), heat('MRM', 0, 1, 'flare'), heat('EDV', 1, 2, 'spread', { source: 'VSY' }), heat('SHL', 0, 1, 'flare')));
    expect(line).toBe('The war in Vessary spread to Edda Vale; trouble flared in Quillon, Marram and Shoal.');
    expect(listNames(['QLN', 'MRM', 'SHL', 'LTL'])).toBe('Quillon, Marram and 2 other places');
    expect(listNames(['QLN', 'MRM'])).toBe('Quillon and Marram');
    expect(listNames(['QLN', 'QLN'])).toBe('Quillon');
    // Two sources each get a clause; three or more become one.
    expect(nightLine(night(heat('A1', 0, 1, 'spread', { source: 'VSY' }), heat('EDV', 0, 1, 'spread', { source: 'SHL' })))).toBe('The war in Vessary spread to A1; the war in Shoal spread to Edda Vale.');
    const crowd = nightLine(night(heat('LTL', 0, 1, 'pressure', { source: 'SHL' }), heat('EDV', 0, 1, 'pressure', { source: 'VSY' }), heat('QLN', 0, 1, 'pressure', { source: 'MRM' })));
    expect(crowd).toBe('Crises spilled into Lintel, Edda Vale and Quillon.');
  });

  it('tells the news the morning brings, the Hotline, a calming and a penalty', () => {
    expect(nightLine(night(heat('BRK', 0, 1, 'news')))).toBe('The morning brought bad news from Brackwater.');
    expect(nightLine(night(heat('WMS', 2, 1, 'piece', { piece: 'hotline' })))).toBe('The Hotline calmed Wintermast.');
    expect(nightLine(night(heat('WMS', 2, 1, 'piece', { piece: 'back-channel' })))).toBe('Wintermast calmed.');
    expect(nightLine(night(heat('WMS', 1, 2, 'piece', { piece: 'peace-movement' })))).toBe('Trouble grew in Wintermast.');
    const pen: TraceStep = { kind: 'penalty', amount: 15, piece: 'red-lines', region: 'SHL', danger: 50, text: 'Shoal was the red line' };
    expect(nightLine(night(heat('SHL', 2, 3, 'spread', { source: 'LTL' }), pen))).toBe('The war in Lintel spread to Shoal; Shoal was the red line: DANGER +15.');
  });

  it('says when a warned region turned the night away', () => {
    const held: TraceStep = { kind: 'piece', piece: 'launch-on-warning', note: 'The warning held: Orrinth did not heat' };
    expect(nightLine(night(held))).toBe('The warning held: Orrinth did not heat.');
    expect(nightLine(night(heat('QLN', 0, 1, 'flare'), held))).toBe('Trouble flared in Quillon; the warning held: Orrinth did not heat.');
    // Other pieces' notes are not the night's story.
    expect(nightLine(night({ kind: 'piece', piece: 'spin-doctor', note: 'Edda Vale does not heat' }))).toBeNull();
  });

  it('reads what DANGER did overnight off the trace', () => {
    expect(nightDelta({ dangerAfterChoice: 12, dangerAfter: 19 })).toBe(7);
    expect(nightDelta({ dangerAfterChoice: 12, dangerAfter: 12 })).toBe(0);
  });
});
