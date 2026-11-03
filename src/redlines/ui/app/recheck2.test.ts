/**
 * The second recheck's screen words, held to the real engine and the real pack: the note keeps its falls warning under
 * the player's acts every week, a promise drawn and withdrawn the same week is an undo (no belief line on its slip),
 * and a step up takes its tick off the running clocks exactly as the engine does.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('./engine', async () => {
  const E = await import('../../engine');
  const B = await import('../../engine/board');
  const R = await import('../../content/regions');
  const { loadRedlinesContent } = await import('../../content/load');
  const content = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
  return { ...E, fallOrder: B.fallOrder, BLOC_TITLES: R.BLOC_TITLES, content, contentIssues: [], onRedlinesContentChange: () => () => {} };
});

import { content, newGame, promise, regionName, RULES, weeksLeft, type GameState } from './engine';
import { shiftedLeft } from '../../engine/board';
import { ticksAfterStepUp } from './beats';
import { withdrawCostLine, withdrawIsUndo } from './orders';
import { eveSentence, noteFor } from './words';

const S = content.strings;
const bloc = () => 'the Sound';

describe('the note keeps its warning (SPEC-SMALL, after the second recheck)', () => {
  it('keeps the falls sentence under the acts, not only on the world-war eve', () => {
    const s = newGame(content, 'EVE-2');
    const free = Object.keys(s.regions).filter((r) => !s.promises.some((p) => p.region === r) && !s.pieces.some((p) => p.at === r) && s.regions[r].state === 'calm');
    const eve: GameState = JSON.parse(JSON.stringify(s));
    eve.week = 4;
    eve.collision = '';
    eve.regions[free[0]] = { ...eve.regions[free[0]], state: 'pressed', pressedWeeks: 5 };
    expect(weeksLeft(eve, free[0])).toBe(1);
    const other = free.slice(1).find((r) => promise(eve, r).ok)!;
    const res = promise(eve, other);
    expect(res.ok).toBe(true);
    const ordered = (res as { state: GameState }).state;
    const note = noteFor(ordered, S, regionName, bloc);
    const falls = eveSentence(ordered, S, regionName);
    expect(falls).toContain(regionName(free[0]));
    expect(note).toContain(falls);
    expect(note.indexOf(falls)).toBeGreaterThan(0);
  });
});

describe('a promise withdrawn the same week is an undo', () => {
  it('says no belief line on the WITHDRAW slip of a ring drawn this week; an inherited ring keeps it', () => {
    const s = newGame(content, 'UNDO-1');
    const free = Object.keys(s.regions).find((r) => !s.promises.some((p) => p.region === r) && s.regions[r].state === 'calm' && promise(s, r).ok)!;
    const drawn = (promise(s, free) as { state: GameState }).state;
    expect(withdrawIsUndo(drawn, free)).toBe(true);
    expect(withdrawCostLine(drawn, free)).toBe(S.act.undoCost.replace('{cost}', String(RULES.promiseCost)));
    const inherited = s.promises.find((p) => p.inherited);
    if (inherited) {
      expect(withdrawIsUndo(s, inherited.region)).toBe(false);
      expect(withdrawCostLine(s, inherited.region)).toBe(S.act.withdrawCost);
    }
  });
});

describe('the ticks change beside their own line', () => {
  it('takes a step up\'s tick off as the engine does (the week\'s own tick not yet taken)', () => {
    for (let n = 1; n <= 5; n++) expect(ticksAfterStepUp(n), `${n} ticks`).toBe(shiftedLeft(n - 1, 4, 1) + 1);
  });
});
