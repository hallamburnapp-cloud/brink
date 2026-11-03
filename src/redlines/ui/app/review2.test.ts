/**
 * The second review's screen findings, each with its fix held to the real engine and the real pack: the forms arm
 * only once the finger is still (a drumming thumb never answers the call), Wintermast's three lines stay pinned at the
 * tape's head, a move or a promise says what it would cross or leave dashed before it is paid for, a way out that
 * cannot be offered yet is dimmed with its reason, the note says what falls this week, a lesson prints once.
 */
import { describe, expect, it, vi } from 'vitest';

// The seam with the real engine and the real pack (the browser's virtual module is not here).
vi.mock('./engine', async () => {
  const E = await import('../../engine');
  const B = await import('../../engine/board');
  const R = await import('../../content/regions');
  const { loadRedlinesContent } = await import('../../content/load');
  const content = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
  return { ...E, fallOrder: B.fallOrder, BLOC_TITLES: R.BLOC_TITLES, content, contentIssues: [], onRedlinesContentChange: () => () => {} };
});

import { ArmGate, ARM_MS } from './armed';
import { content, holdable, linesCrossedByMove, movePiece, newGame, offerWayOut, promise, regionName, weeksLeft, type GameState } from './engine';
import { moveNeedsAsk, moveWarnings, promiseWarnings, pullable, tryMove, wayOutBlock } from './orders';
import { pinnedFor, tapeFor } from './tape';
import { eveSentence, noteFor, pageThoughts, rollingLines, type TapeLine } from './words';
import { chainOf, explainMarks } from './view';

const S = content.strings;
const bloc = () => 'the Sound';

/** A clock and timers the test turns by hand. */
function fakeTime() {
  let now = 0;
  let timers: Array<{ at: number; fn: () => void; id: number }> = [];
  let id = 0;
  return {
    now: () => now,
    timers: {
      set: (fn: () => void, ms: number) => {
        timers.push({ at: now + ms, fn, id: ++id });
        return id;
      },
      clear: (t: unknown) => {
        timers = timers.filter((x) => x.id !== t);
      },
    },
    advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const next = timers.filter((t) => t.at <= until).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        now = next.at;
        timers = timers.filter((t) => t !== next);
        next.fn();
      }
      now = until;
    },
  };
}

describe('the call arms only once the finger is still (the second review: drumming to skip answered BACK DOWN)', () => {
  it('stays unarmed while a thumb drums, every 150 ms for as long as it likes', () => {
    const t = fakeTime();
    const gate = new ArmGate(ARM_MS, t.now, t.timers);
    gate.reset();
    for (let i = 0; i < 20; i++) {
      t.advance(150);
      gate.press();
      expect(gate.accepts(), `tap ${i + 1}`).toBe(false);
    }
    // The finger stops: the forms arm ARM_MS after the last tap, and only a press after that answers.
    t.advance(ARM_MS - 1);
    expect(gate.armed).toBe(false);
    t.advance(2);
    expect(gate.armed).toBe(true);
    expect(gate.accepts()).toBe(false); // the click of the last drum tap, landing late, is not an answer
    t.advance(300);
    gate.press();
    expect(gate.accepts()).toBe(true);
  });

  it('under the old rule (armed 450 ms after the call landed, whatever the finger did) the sixth drum tap answered', () => {
    const t = fakeTime();
    const gate = new ArmGate(ARM_MS, t.now, t.timers);
    gate.reset();
    // The same six taps 150 ms apart, the last at 900 ms: with the gate, none of them answers.
    const answered = [1, 2, 3, 4, 5, 6].map(() => {
      t.advance(150);
      gate.press();
      return gate.accepts();
    });
    expect(answered).toEqual([false, false, false, false, false, false]);
  });

  it('is armed at once under reduced motion', () => {
    const t = fakeTime();
    const gate = new ArmGate(ARM_MS, t.now, t.timers);
    gate.armNow();
    gate.press();
    expect(gate.accepts()).toBe(true);
  });
});

describe('the three lines stay on the sheet (pinned at the head of the tape)', () => {
  it('pins all three declared lines, in the tape words, in every game, and does not print them again below', () => {
    for (let i = 0; i < 60; i++) {
      const s = newGame(content, `PIN-${i}`);
      const pinned = pinnedFor(s);
      expect(pinned).toHaveLength(3);
      for (const p of pinned) expect(p.length).toBeLessThanOrEqual(46);
      expect(pinned).toEqual(s.fed.lines.map((l) => content.lines.find((d) => d.id === l.id)!.tape));
      const rolling = tapeFor(s, undefined, pinned);
      for (const l of rolling) expect(pinned).not.toContain(l.text);
      // Week 1's running tape ends on the inherited promises (the opening's own lines, after the pinned three).
      const inherited = s.promises.filter((p) => p.inherited).length;
      expect(rolling.length).toBe(Math.min(3, inherited));
    }
  });

  it('keeps a line said later in the week on the running tape (only the opening printing is pinned)', () => {
    const lines: TapeLine[] = [
      { text: 'Wintermast: no fleet at Driftholm or Kelpmouth', key: 'w0:0' },
      { text: 'Inherited: a promise to defend Lintel', key: 'w0:1' },
      { text: 'Wintermast: no fleet at Driftholm or Kelpmouth', key: 'w1:0' },
    ];
    expect(rollingLines(lines, ['Wintermast: no fleet at Driftholm or Kelpmouth']).map((l) => l.key)).toEqual(['w0:1', 'w1:0']);
  });
});

describe('a form that will fail says so before you pay', () => {
  it('a move that crosses a declared line and leaves a ring dashed asks first, in the line\'s own tape words (seed FIX-25)', () => {
    const s = newGame(content, 'FIX-25');
    const o = tryMove(s, 'brigade', 'RMH');
    expect(moveNeedsAsk(o)).toBe(true);
    const words = moveWarnings(o);
    expect(words).toContain(`crosses a line · ${linesCrossedByMove(s, 'brigade', 'RMH')[0]}`);
    expect(words).toContain(`leaves ${regionName('QLN')}'s ring dashed`);
    // What the slip says is what the engine does: after the move the ring is dashed.
    const after = movePiece(s, 'brigade', 'RMH');
    expect(after.ok && !holdable(after.state, 'QLN').ok).toBe(true);
    // The note says so where it happened.
    if (after.ok) expect(noteFor(after.state, S, regionName, bloc, ['QLN'])).toContain(`${regionName('QLN')}'s ring is dashed now`);
  });

  it('a move with nothing to warn of is made at once, and a refused one says why', () => {
    const s = newGame(content, 'QRG-VN7');
    expect(moveNeedsAsk(tryMove(s, 'fleet', 'GUL'))).toBe(false);
    const far = tryMove(s, 'fleet', 'DRF');
    expect(far.ok).toBe(false);
    expect(far.reason).toBe('not-adjacent');
  });

  it('a promise on their arrow\'s target says it will be a call, and one inside an alliance line says which line (seed FIX-66)', () => {
    const s = newGame(content, 'FIX-66');
    const w = promiseWarnings(s, 'DRF');
    expect(w).toContain(S.act.promiseCall);
    expect(w.some((x) => x.startsWith('crosses a line · Wintermast:'))).toBe(true);
    // A place nobody is heading for, outside every line, carries no warning.
    const calm = Object.keys(s.regions).find((r) => promise(s, r).ok && promiseWarnings(s, r).length === 0);
    expect(calm).toBeTruthy();
    // A ring on a place already under siege, with no piece of ours in it, is a provocation, and its slip says so.
    const besieged: GameState = { ...s, regions: { ...s.regions, [calm!]: { ...s.regions[calm!], state: 'pressed', pressedWeeks: 1 } } };
    expect(promiseWarnings(besieged, calm!)).toContain(S.act.promiseProvokes);
    const drawn = promise(besieged, calm!);
    expect(drawn.ok && drawn.state.promises.find((p) => p.region === calm)?.provocation).toBe(true);
  });

  it('A WAY OUT before week three is dimmed with their reason; a piece at home is not offered; no promise, no drop', () => {
    const s = newGame(content, 'TJK-ZJC');
    for (const term of ['drop-promise', 'pull-back', 'summit'] as const) expect(wayOutBlock(s, term)).toBe(S.refusals['too-early']);
    expect(offerWayOut(s, 'summit').ok).toBe(false);
    const w3: GameState = { ...s, week: 3 };
    expect(pullable(w3)).toEqual([]);
    expect(wayOutBlock(w3, 'pull-back')).toBe(S.refusals['piece-home']);
    expect(wayOutBlock({ ...w3, promises: [] }, 'drop-promise')).toBe(S.refusals['no-promises']);
    expect(wayOutBlock(w3, 'summit')).toBeNull();
    // Short of influence: the call's own line, "needs 15 · you have 11".
    expect(wayOutBlock({ ...w3, influence: 11 }, 'summit')).toBe('needs 15 · you have 11');
    const moved = movePiece(w3, 'fleet', 'GUL');
    expect(moved.ok && pullable(moved.state)).toEqual(['fleet']);
  });
});

describe('the note on the eve of a fall', () => {
  it('names the places whose single ringed tick runs out this week, and says when that would be world war', () => {
    const s = newGame(content, 'EVE-1');
    const a = Object.keys(s.regions).filter((r) => !s.promises.some((p) => p.region === r) && !s.pieces.some((p) => p.at === r) && s.regions[r].state === 'calm').slice(0, 9);
    const eve: GameState = JSON.parse(JSON.stringify(s));
    eve.week = 4;
    eve.collision = '';
    for (const r of a.slice(0, 2)) eve.regions[r] = { ...eve.regions[r], state: 'pressed', pressedWeeks: 5 };
    expect(a.slice(0, 2).every((r) => weeksLeft(eve, r) === 1)).toBe(true);
    const line = eveSentence(eve, S, regionName);
    // Each named once, in the "unless" sentence when a piece of ours could still reach it this week, else "nothing of ours can reach".
    for (const r of a.slice(0, 2)) expect(line).toMatch(new RegExp(`${regionName(r)}[^.]* fall`));
    expect(line).toMatch(/fall this week/);
    expect(line).not.toContain(S.note.worldWarEve);
    // With six already fighting, two more is the eighth box.
    for (const r of a.slice(2, 8)) eve.regions[r] = { ...eve.regions[r], state: 'fighting', pressedWeeks: 0, fellWeek: 2 };
    eve.war = 6;
    expect(eveSentence(eve, S, regionName)).toContain(S.note.worldWarEve);
    expect(noteFor(eve, S, regionName, bloc)).toContain(S.note.worldWarEve);
  });
});

describe('the explanation points at what it names, and the ending draws the chain', () => {
  it('line 1 lays a ghost of hatching with three ticks and a ghost of the red wash on the sheet; line 2 lifts the inherited ring', () => {
    const s = newGame(content, 'E2E-WEEK-18');
    const one = explainMarks(s, 1);
    expect(one.ghost?.pressed).toBe(s.fed.headings[0].to);
    expect(one.ghost?.ticks).toBe(3);
    expect(explainMarks(s, 2).pressed).toBe(s.promises.find((p) => p.inherited)!.region);
    expect(explainMarks(s, 3).ghost).toBeNull();
  });

  it('numbers the places fighting at a WORLD WAR in the order they fell', () => {
    const s: GameState = JSON.parse(JSON.stringify(newGame(content, 'CHAIN-1')));
    s.phase = 'ended';
    s.ending = { kind: 'war', week: 6, fighting: 3, score: 0, lines: ['', ''], because: '', dials: '' };
    s.regions.SHL = { ...s.regions.SHL, state: 'fighting', fellSeq: 2 };
    s.regions.DRF = { ...s.regions.DRF, state: 'fighting', fellSeq: 1 };
    s.regions.LTL = { ...s.regions.LTL, state: 'fighting', fellSeq: 3 };
    expect(chainOf(s)).toEqual(['DRF', 'SHL', 'LTL']);
    expect(chainOf({ ...s, ending: { ...s.ending!, kind: 'treaty' } })).toEqual([]);
  });

  it('prints a lesson and the dials once, on the closing card, never also under a week', () => {
    const hidden = ['They went for Lintel because nobody had promised it.', 'You backed down at Rimeholt.', 'They were hungry and easily scared.'];
    expect(pageThoughts(hidden, { lessons: ['You backed down at Rimeholt.'], dials: 'They were hungry and easily scared.' })).toEqual([hidden[0]]);
  });
});
