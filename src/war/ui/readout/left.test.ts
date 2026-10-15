import { describe, expect, it } from 'vitest';
import { must, newGame, pinAll, send } from '../../engine';
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
