import { describe, expect, it } from 'vitest';
import { hashState } from './hash';
import { newGame, nextTurn, send } from './run';
import { SAVE_KEY, loadGame, saveGame } from './save';
import { must, pinAll } from './testkit';
import type { GameState } from './types';
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
    expect(json.version).toBe(3);
    expect(json.state.lastSend.score).toBe('5598720');
  });

  it('brings a version 2 save (before the push forgave) up to version 3', () => {
    /** The save as version 2 wrote it: no pushMisses anywhere. */
    const v2 = (s: GameState) => {
      const data = JSON.parse(saveGame(s)) as { version: number; state: Record<string, unknown> };
      data.version = 2;
      data.state.version = 2;
      delete data.state.pushMisses;
      if (data.state.lastSend) delete (data.state.lastSend as Record<string, unknown>).pushMisses;
      return JSON.stringify(data);
    };
    for (const s of [t1, shop, crown]) {
      const back = loadGame(v2(s))!;
      expect(back).toEqual(s);
      expect(hashState(back)).toBe(hashState(s));
    }
    // A version 2 CEASEFIRE ended on its one push miss: the push is spent.
    const cease = { ...shop, phase: 'over' as const, ending: 'CEASEFIRE' as const, shop: null };
    const back = loadGame(v2(cease))!;
    expect([back.version, back.pushMisses, back.lastSend!.pushMisses, endView(back)!.ending]).toEqual([3, 3, 3, 'CEASEFIRE']);
    // A version 2 save that already has the field is not one version 2 wrote.
    const odd = JSON.parse(v2(shop)) as { state: Record<string, unknown> };
    odd.state.pushMisses = 0;
    expect(loadGame(JSON.stringify(odd))).toBeNull();
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
    expect(loadGame(edit((s) => (s.pushMisses = 4)))).toBeNull();
    expect(loadGame(edit((s) => delete s.pushMisses))).toBeNull();
  });

  it('keeps an ended game ended', () => {
    const lost = loadGame(saveGame({ ...shop, phase: 'over', ending: 'WAR', shop: null }))!;
    expect(endView(lost)!.ending).toBe('WAR');
  });
});
