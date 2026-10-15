import { describe, expect, it } from 'vitest';
import { hashState } from './hash';
import { newGame, nextTurn, send } from './run';
import { SAVE_KEY, loadGame, saveGame } from './save';
import { must, pinAll } from './testkit';
import { endView, shopView } from './view';

const t1 = newGame('FIRST-WORLD');
const t2 = must(nextTurn(must(send(pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])))));
const shop = must(send(pinAll(t2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
const crown = must(send(pinAll(newGame('CROWN', { demo: 'crown' }), ['LTL', 'TLM', 'ORN', 'FLE', 'MRM'])));

describe('save and load', () => {
  it('uses the v2 key', () => {
    expect(SAVE_KEY).toBe('brink.war.v2.save');
  });

  it('round-trips a game in every phase, BigInts included', () => {
    for (const s of [t1, pinAll(t1, ['SHL', 'LNK']), shop, crown, must(nextTurn(shop))]) {
      const text = saveGame(s);
      const back = loadGame(text);
      expect(back).toEqual(s);
      expect(hashState(back!)).toBe(hashState(s));
      expect(saveGame(back!)).toBe(text);
    }
  });

  it('writes BigInts as decimal strings', () => {
    const json = JSON.parse(saveGame(crown)) as { format: string; version: number; state: { lastSend: { score: unknown } } };
    expect(json.format).toBe('brink.war');
    expect(json.version).toBe(2);
    expect(json.state.lastSend.score).toBe('5598720');
  });

  it('plays on from a loaded game exactly as from the original', () => {
    const back = loadGame(saveGame(shop))!;
    expect(shopView(back)).toEqual(shopView(shop));
    expect(hashState(must(nextTurn(back)))).toBe(hashState(must(nextTurn(shop))));
  });

  it('returns null for anything it cannot trust', () => {
    const good = saveGame(shop);
    const edit = (f: (state: Record<string, unknown>) => void) => {
      const data = JSON.parse(good) as { state: Record<string, unknown> };
      f(data.state);
      return JSON.stringify(data);
    };
    expect(loadGame(null)).toBeNull();
    expect(loadGame('')).toBeNull();
    expect(loadGame('{not json')).toBeNull();
    expect(loadGame(good.slice(0, good.length - 20))).toBeNull();
    expect(loadGame(JSON.stringify({ format: 'brink.war', version: 1, state: {} }))).toBeNull();
    expect(loadGame(edit((s) => (s.version = 1)))).toBeNull();
    expect(loadGame(edit((s) => ((s.owner as Record<string, string>).LNK = 'blue')))).toBeNull();
    expect(loadGame(edit((s) => (s.seats = [{ uid: 1, id: 'FERRY' }])))).toBeNull();
    expect(loadGame(edit((s) => (s.phase = 'over')))).toBeNull();
    expect(loadGame(edit((s) => ((s.deal as Record<string, unknown>).target = 'lots')))).toBeNull();
    expect(loadGame(edit((s) => (s.coins = -1)))).toBeNull();
  });

  it('keeps an ended game ended', () => {
    const lost = loadGame(saveGame({ ...shop, phase: 'over', ending: 'WAR', shop: null }))!;
    expect(endView(lost)!.ending).toBe('WAR');
  });
});
