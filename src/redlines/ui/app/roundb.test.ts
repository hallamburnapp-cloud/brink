/**
 * Round B (the last recheck before the owner): every move asks MOVE HERE first, a piece that has moved says so on
 * its slip, the A WAY OUT form keeps their last answer in the tape's words, and the three fonts ship with their
 * licences beside them. The real engine and the real pack.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./engine', async () => {
  const E = await import('../../engine');
  const B = await import('../../engine/board');
  const R = await import('../../content/regions');
  const { loadRedlinesContent } = await import('../../content/load');
  const content = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
  return { ...E, fallOrder: B.fallOrder, BLOC_TITLES: R.BLOC_TITLES, content, contentIssues: [], onRedlinesContentChange: () => () => {} };
});

import { answerPhone, canAnswer, content, endWeek, movePiece, newGame, offerWayOut, type GameState } from './engine';
import { lastWayOutAnswer, moveHintFor, moveNeedsAsk, tryMove } from './orders';

const S = content.strings;

/** Play a week out: SEND ORDERS, then BACK DOWN (or whatever answer is open) on every call until the next week. */
function playOut(s: GameState): GameState {
  let n = endWeek(content, s);
  for (let i = 0; n.phase === 'phone' && i < 6; i++) {
    const key = (['down', 'wait', 'back'] as const).find((k) => canAnswer(n, k).ok);
    if (!key) break;
    n = answerPhone(content, n, key);
  }
  return n;
}

describe('a move is asked before it is paid for', () => {
  it('a move with nothing to warn of still asks: the slip carries the price and no warning (seed QRG-VN7)', () => {
    const s = newGame(content, 'QRG-VN7');
    const o = tryMove(s, 'fleet', 'GUL');
    expect(o.ok).toBe(true);
    // Nothing to warn of: the MOVE HERE slip says the price only. (actions.askMove puts it down all the same: app.test.ts.)
    expect(moveNeedsAsk(o)).toBe(false);
  });

  it('a piece that has moved this week says "one move a week" on its slip, not "tap a place it can reach"', () => {
    const s = newGame(content, 'QRG-VN7');
    expect(moveHintFor(s, 'fleet')).toBe(S.act.moveHint);
    const res = movePiece(s, 'fleet', 'GUL');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(moveHintFor(res.state, 'fleet')).toBe(S.refusals['moved-already']);
    expect(moveHintFor(res.state, 'brigade')).toBe(S.act.moveHint);
  });
});

describe('the A WAY OUT form keeps their last answer', () => {
  it('none before a way out was offered; after a summit, the answer and its week in the tape\'s words', () => {
    let s = newGame(content, 'QRG-VN7');
    expect(lastWayOutAnswer(s)).toBeNull();
    while (s.phase === 'act' && s.week < 3) s = playOut(s);
    expect(s.week).toBe(3);
    expect(lastWayOutAnswer(s)).toBeNull();
    const offered = offerWayOut(s, 'summit');
    expect(offered.ok).toBe(true);
    if (!offered.ok) return;
    const after = playOut(offered.state);
    const last = lastWayOutAnswer(after);
    expect(last?.week).toBe(3);
    const term = S.terms.summit;
    const accepted = S.headlines.wayOutAccepted.replace('{term}', term);
    const refused = S.headlines.wayOutRefused.replace('{term}', term);
    expect([accepted, refused]).toContain(last!.lines[0]);
    // Every line is one the tape printed that week.
    const log = after.log.find((l) => l.week === 3)!;
    for (const line of last!.lines) expect(log.visible).toContain(line);
    // A refusal carries their short words after it.
    if (last!.lines[0] === refused) expect(last!.lines[1]).toMatch(/^Wintermast: '/);
    // It stays while later weeks pass with no offer.
    if (after.phase === 'act') expect(lastWayOutAnswer(playOut(after))?.week).toBe(3);
  });
});

describe('the fonts ship with their licences', () => {
  const dir = `${process.cwd()}/public/redlines/fonts`;
  const css = readFileSync(`${dir}/fonts.css`, 'utf8');
  const faces = [
    { file: 'SpecialElite-400.woff2', licence: 'LICENSE-SpecialElite.txt', name: 'Apache License', copyright: 'Copyright (c) 2010 by Brian J. Bonislawsky DBA Astigmatic (AOETI)' },
    { file: 'Caveat-variable.woff2', licence: 'OFL-Caveat.txt', name: 'SIL OPEN FONT LICENSE Version 1.1', copyright: 'Copyright 2014 The Caveat Project Authors' },
    { file: 'Gelasio-variable.woff2', licence: 'OFL-Gelasio.txt', name: 'SIL OPEN FONT LICENSE Version 1.1', copyright: 'Copyright 2022 The Gelasio Project Authors' },
  ];
  it.each(faces)('$file has its licence beside it, with the copyright line from its name table', ({ file, licence, name, copyright }) => {
    expect(css).toContain(file);
    expect(existsSync(`${dir}/${licence}`)).toBe(true);
    const text = readFileSync(`${dir}/${licence}`, 'utf8');
    expect(text).toContain(name);
    expect(text).toContain(copyright);
  });
  it('every face fonts.css loads is one of the three', () => {
    const loaded = [...css.matchAll(/url\('\.\/([^']+)'\)/g)].map((m) => m[1]);
    expect(loaded.sort()).toEqual(faces.map((f) => f.file).sort());
  });
});
