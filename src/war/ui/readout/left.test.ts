import { describe, expect, it } from 'vitest';
import { must, newGame, pinAll, position, send, sendOptions } from '../../engine';
import { readoutLeft } from './left';

const first = () => newGame('FIRST-WORLD');
const lineOf = (s: ReturnType<typeof first>) => readoutLeft(s, '');

describe('the readout says what this moment needs', () => {
  it('while choosing: the crisis hint, how far short, and how far the next region is', () => {
    expect(lineOf(first())).toEqual({ label: 'TARGET', value: '64', line: 'PIN THE CRISIS FOR ×2' });
    expect(lineOf(pinAll(first(), ['SHL'])).line).toBe('NEED 50 MORE');
    // Shoal + Lantern Key: 68 wins 1; the next region is at 256, 188 more. Nobody multiplies in their head.
    const two = pinAll(first(), ['SHL', 'LNK']);
    expect(readoutLeft(two, 'NEXT REGION AT 256').line).toBe('NEXT REGION AT 256 · 188 MORE');
    // 264 (WINS 2): the next mark is 1,024. The long form drops 'AT' to fit the line.
    const four = pinAll(first(), ['SHL', 'LNK', 'PBB', 'MRM']);
    expect(readoutLeft(four, 'NEXT REGION AT 1,024').line).toBe('NEXT REGION 1,024 · 760 MORE');
  });

  it('on a dead deal, before any pin: NO SEND CAN WIN, in red; pinned, how far short as ever', () => {
    const dead = position(first(), { deal: { ...first().deal, target: 1_000_000n } });
    expect(lineOf(dead)).toEqual({ label: 'TARGET', value: '1,000,000', line: 'NO SEND CAN WIN', lineTone: 'dead' });
    expect(lineOf(pinAll(dead, ['SHL']))).toEqual({ label: 'TARGET', value: '1,000,000', line: 'NEED 999,986 MORE' });
  });

  it('on a deal only another seating wins, before any pin: REORDER STAFF TO WIN, in brass', () => {
    // Strategist then Duty Officer: as seated (50 x3 +40) the best send falls short; Duty first wins.
    const t = first();
    const seated = position(t, { seats: ['STRATEGIST', 'DUTY'], deal: { ...t.deal, target: 1n } });
    const best = (seats: Array<'STRATEGIST' | 'DUTY'>) => sendOptions(position(t, { seats, deal: { ...t.deal } }))[0].score;
    const T = best(['STRATEGIST', 'DUTY']) + 1n;
    expect(best(['DUTY', 'STRATEGIST'])).toBeGreaterThanOrEqual(T);
    const s = position(seated, { deal: { ...t.deal, target: T } });
    expect(lineOf(s)).toMatchObject({ line: 'REORDER STAFF TO WIN', lineTone: 'reorder' });
    expect(lineOf(pinAll(s, ['SHL'])).line).toMatch(/^NEED /);
  });

  it('once the send is in the ring: the next target, nothing stale', () => {
    const s = pinAll(first(), ['SHL']);
    expect(readoutLeft(s, '', { ahead: 'turn' })).toEqual({ label: 'NEXT TARGET', value: '96', line: '' });
    expect(readoutLeft(s, '', { ahead: 'shop' }).label).toBe('NEXT TARGET');
    expect(readoutLeft(s, '', { ahead: 'end' })).toEqual({ label: 'TARGET', value: '64', line: '' });
    expect(readoutLeft(must(send(s)), '').label).toBe('NEXT TARGET');
  });

  it('when the game ends: how it ended, in its colour', () => {
    const s = first();
    expect(readoutLeft(s, '', { ahead: 'WORLD UNITED', final: { gold: 30, red: 0 } })).toEqual({ label: 'WORLD UNITED', value: '30/30', line: '', tone: 'gold' });
    expect(readoutLeft(s, '', { ahead: 'CEASEFIRE', final: { gold: 26, red: 4 } })).toMatchObject({ label: 'CEASEFIRE', value: '26/30' });
    expect(readoutLeft(s, '', { ahead: 'WAR', final: { gold: 19, red: 10 } })).toEqual({ label: 'WAR', value: '10/10', line: '', tone: 'red' });
  });

  it("in the intro the lesson keeps its own target, whatever turn its sends are played as", () => {
    const missed = must(send({ ...pinAll(first(), ['SHL']), turn: 3 }));
    expect(readoutLeft(missed, '', { intro: true })).toEqual({ label: 'TARGET', value: '64', line: '' });
  });
});
