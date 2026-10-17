import { describe, expect, it } from 'vitest';
import { answerPhone, canPromise, endWeek, holdable, movePiece, movesFor, newGame, offerWayOut, promise, withdraw } from './run.ts';
import { RULES } from './rules.ts';
import { isGameState, loadGame, saveGame } from './save.ts';
import { FIXTURE_CONTENT, fixtureGame } from './testkit.ts';
import type { GameState } from './types.ts';
import { REGION_IDS, isCap, regionName } from './world.ts';

const c = FIXTURE_CONTENT;

describe('the opening', () => {
  it('is the same for the same seed and different for another', () => {
    expect(JSON.stringify(newGame(c, 'alpha'))).toBe(JSON.stringify(newGame(c, 'alpha')));
    expect(JSON.stringify(newGame(c, 'alpha'))).not.toBe(JSON.stringify(newGame(c, 'beta')));
  });
  it('draws two hidden dials between 0.2 and 0.8, three lines (two real, one bluff), two headings', () => {
    for (let i = 0; i < 40; i++) {
      const s = newGame(c, `open-${i}`);
      expect(s.fed.appetite).toBeGreaterThanOrEqual(RULES.dialMin);
      expect(s.fed.appetite).toBeLessThanOrEqual(RULES.dialMax);
      expect(s.fed.jumpiness).toBeGreaterThanOrEqual(RULES.dialMin);
      expect(s.fed.jumpiness).toBeLessThanOrEqual(RULES.dialMax);
      expect(s.fed.lines).toHaveLength(3);
      expect(s.fed.lines.filter((l) => l.real)).toHaveLength(2);
      expect(s.fed.headings).toHaveLength(2);
      const real = s.fed.headings.filter((h) => h.real).length;
      expect(real).toBeGreaterThanOrEqual(1);
      if (real === 2) expect(s.fed.appetite).toBeGreaterThan(RULES.appetitePushOver);
      expect(s.fed.headings.every((h) => !isCap(h.to))).toBe(true);
      expect(s.fed.step).toBe(1);
      expect(s.week).toBe(1);
      expect(s.phase).toBe('act');
      expect(s.influence).toBe(RULES.influenceStart);
      expect(s.treaty).toBe(RULES.willStart);
      expect(Object.keys(s.regions)).toHaveLength(30);
      expect(Object.values(s.regions).every((r) => r.state === 'calm')).toBe(true);
    }
  });
  it('inherits one or two promises and names the collision with one of them and a real line', () => {
    let two = 0;
    for (let i = 0; i < 60; i++) {
      const s = newGame(c, `coll-${i}`);
      expect(s.promises.length).toBeGreaterThanOrEqual(1);
      expect(s.promises.length).toBeLessThanOrEqual(2);
      expect(s.promises.every((p) => p.inherited && p.since === 0)).toBe(true);
      if (s.promises.length === 2) two++;
      expect(s.collision.length).toBeGreaterThan(20);
      const named = s.promises.some((p) => s.collision.includes(regionName(p.region)));
      expect(named).toBe(true);
      const realTexts = s.fed.lines.filter((l) => l.real).map((l) => l.text);
      const quotesReal = realTexts.some((t) => s.collision.includes(t));
      expect(quotesReal || s.collision.includes('heading there')).toBe(true);
    }
    expect(two).toBeGreaterThan(10);
  });
  it('the collision promise is inside a real line, and when it is dashed their first push aims at it', () => {
    let aimed = 0;
    let dashed = 0;
    for (let i = 0; i < 60; i++) {
      const s = newGame(c, `aim-${i}`);
      const first = s.promises[0].region;
      const covering = s.fed.lines.filter((l) => l.real).map((l) => c.lines.find((d) => d.id === l.id)!);
      expect(covering.some((d) => d.regions.includes(first))).toBe(true);
      if (!holdable(s, first).ok) {
        dashed++;
        if (s.fed.headings.some((h) => h.real && h.to === first)) aimed++;
      }
    }
    expect(dashed).toBeGreaterThan(20);
    // A dashed inherited promise is tested in week 1 whenever their forces can reach it.
    expect(aimed / dashed).toBeGreaterThan(0.5);
  });
  it('puts the declared lines and the inherited promises on the tape', () => {
    const s = newGame(c, 'tape');
    expect(s.headline.filter((h) => h.startsWith('Wintermast:'))).toHaveLength(3);
    expect(s.headline.some((h) => h.startsWith('You inherited'))).toBe(true);
    expect(s.log).toEqual([]);
  });
});

function fresh(seed = 'acts'): GameState {
  const s = fixtureGame(seed);
  return { ...s, promises: [], pieces: [{ kind: 'fleet', at: 'ASK' }, { kind: 'brigade', at: 'EDV' }] };
}

describe('promises', () => {
  it('canPromise: outside the Cap, not fighting, fewer than three, influence for the garrison', () => {
    const s = fresh();
    expect(canPromise(s, 'WMS')).toEqual({ ok: false, reason: 'inside-the-cap' });
    expect(canPromise(s, 'LTL').ok).toBe(true);
    s.regions.LTL.state = 'fighting';
    expect(canPromise(s, 'LTL')).toEqual({ ok: false, reason: 'already-fighting' });
    s.regions.LTL.state = 'pressed';
    expect(canPromise(s, 'LTL').ok).toBe(true);
    s.promises = [{ region: 'VSY', since: 1, inherited: false }];
    expect(canPromise(s, 'VSY')).toEqual({ ok: false, reason: 'already-promised' });
    s.promises.push({ region: 'RMH', since: 1, inherited: false }, { region: 'QLN', since: 1, inherited: false });
    expect(canPromise(s, 'LTL')).toEqual({ ok: false, reason: 'three-promises' });
    s.promises = [];
    s.influence = 1;
    expect(canPromise(s, 'LTL')).toEqual({ ok: false, reason: 'no-influence' });
  });
  it('promise costs the first week and is logged; withdraw costs belief only', () => {
    const s = fresh();
    const r = promise(s, 'VSY');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.influence).toBe(s.influence - RULES.promiseCost);
    expect(r.state.promises).toEqual([{ region: 'VSY', since: 1, inherited: false }]);
    expect(r.state.acts).toEqual([{ kind: 'promise', region: 'VSY' }]);
    expect(s.promises).toEqual([]); // the given state is never changed
    const w = withdraw(r.state, 'VSY');
    expect(w.ok).toBe(true);
    if (!w.ok) return;
    expect(w.state.promises).toEqual([]);
    expect(w.state.fed.belief).toBe(r.state.fed.belief - RULES.withdrawBelief);
    expect(w.state.influence).toBe(r.state.influence);
    expect(withdraw(w.state, 'VSY')).toEqual({ ok: false, reason: 'not-promised' });
  });
  it('a promise under test cannot be withdrawn: answer the phone', () => {
    const s = fresh();
    s.promises = [{ region: 'VSY', since: 1, inherited: false }];
    s.pendingTest = 'VSY';
    expect(withdraw(s, 'VSY')).toEqual({ ok: false, reason: 'under-test' });
  });
  it('holdable: a piece there, a piece one move away, never inside the Cap', () => {
    const s = fresh();
    expect(holdable(s, 'EDV')).toMatchObject({ ok: true, why: 'piece-there' });
    expect(holdable(s, 'VSY')).toMatchObject({ ok: true, why: 'piece-near', piece: { kind: 'brigade' } });
    expect(holdable(s, 'BRN')).toMatchObject({ ok: true, why: 'piece-near', piece: { kind: 'fleet' } });
    expect(holdable(s, 'LTL')).toMatchObject({ ok: false, why: 'out-of-reach' });
    expect(holdable(s, 'NWK')).toMatchObject({ ok: false, why: 'inside-the-cap' });
  });
});

describe('pieces', () => {
  it('the fleet moves on lanes and coasts at a cost of 3, once a week', () => {
    const s = fresh();
    expect(movesFor(s, 'fleet').sort()).toEqual(['BRN', 'MRD']);
    expect(movePiece(s, 'fleet', 'LNK')).toEqual({ ok: false, reason: 'not-adjacent' });
    const r = movePiece(s, 'fleet', 'MRD');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.pieces.find((p) => p.kind === 'fleet')!.at).toBe('MRD');
    expect(r.state.influence).toBe(s.influence - RULES.moveCost);
    expect(r.state.moved).toEqual(['fleet']);
    expect(movePiece(r.state, 'fleet', 'TRN')).toEqual({ ok: false, reason: 'moved-already' });
    expect(movesFor(r.state, 'fleet')).toEqual([]);
  });
  it('the brigade moves on land joins, and across a lane only when the fleet holds it; never into the Cap', () => {
    const s = fresh();
    expect(movePiece(s, 'brigade', 'TRN')).toEqual({ ok: false, reason: 'not-adjacent' });
    const toMrd = movePiece(s, 'brigade', 'MRD');
    expect(toMrd.ok).toBe(true);
    if (!toMrd.ok) return;
    const fleetToMrd = movePiece(toMrd.state, 'fleet', 'MRD');
    expect(fleetToMrd.ok).toBe(true);
    if (!fleetToMrd.ok) return;
    // Next week: the brigade may cross the Morrow Downs lane because the fleet is at its end.
    const next = { ...fleetToMrd.state, moved: [] as never[] };
    expect(movesFor(next, 'brigade')).toContain('TRN');
    const atVsy = { ...fresh(), pieces: [{ kind: 'fleet' as const, at: 'VSY' }, { kind: 'brigade' as const, at: 'VSY' }] };
    expect(movesFor(atVsy, 'brigade')).not.toContain('NWK');
    expect(movesFor(atVsy, 'fleet')).not.toContain('NWK');
  });
  it('needs influence', () => {
    const s = { ...fresh(), influence: 2 };
    expect(movePiece(s, 'fleet', 'MRD')).toEqual({ ok: false, reason: 'no-influence' });
  });
});

describe('a way out', () => {
  it('once a week, priced by term, the detail checked', () => {
    const s = fresh();
    expect(offerWayOut(s, 'drop-promise', 'VSY')).toEqual({ ok: false, reason: 'not-promised' });
    expect(offerWayOut(s, 'pull-back', 'VSY' as never)).toEqual({ ok: false, reason: 'no-such-piece' });
    const r = offerWayOut(s, 'summit');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.influence).toBe(s.influence - RULES.wayOutPrice.summit);
    expect(r.state.offer).toEqual({ term: 'summit', detail: null, price: RULES.wayOutPrice.summit });
    expect(offerWayOut(r.state, 'pull-back', 'fleet')).toEqual({ ok: false, reason: 'offered-already' });
    const poor = { ...fresh(), influence: 5 };
    expect(offerWayOut(poor, 'drop-promise', poor.promises[0]?.region ?? 'VSY')).toMatchObject({ ok: false });
  });
  it('is answered at the resolve and gone by the next week', () => {
    let s = fresh();
    s.fed.headings = [{ from: 'KLM', to: 'KLP', real: true }, { from: 'GLM', to: 'DRF', real: false }];
    const r = offerWayOut(s, 'summit');
    if (!r.ok) throw new Error(r.reason);
    s = endWeek(c, r.state);
    if (s.phase === 'phone') s = answerPhone(c, s, 'down');
    expect(s.offer).toBeNull();
    const last = s.log[0];
    expect(last.visible.some((v) => v.includes('the way out'))).toBe(true);
    expect(last.hidden.some((h) => h.includes('the way out'))).toBe(true);
  });
});

describe('the week', () => {
  it('endWeek only in the act phase; answerPhone only on the phone', () => {
    const s = fresh();
    const ended = { ...s, phase: 'ended' as const };
    expect(endWeek(c, ended)).toBe(ended);
    expect(answerPhone(c, s, 'back')).toBe(s);
  });
  it('pays income less upkeep at the turn of the week and clears the week', () => {
    let s = fresh();
    s.fed.headings = [{ from: 'KLM', to: 'KLP', real: true }, { from: 'GLM', to: 'DRF', real: false }];
    const p = promise(s, 'VSY');
    if (!p.ok) throw new Error(p.reason);
    s = endWeek(c, p.state);
    if (s.phase === 'phone') s = answerPhone(c, s, 'down');
    expect(s.week).toBe(2);
    expect(s.influence).toBe(RULES.influenceStart - RULES.promiseCost + RULES.income - RULES.upkeep);
    expect(s.acts).toEqual([]);
    expect(s.moved).toEqual([]);
    expect(s.log).toHaveLength(1);
    expect(s.log[0].acts[0]).toBe('You promised to defend Vessary.');
  });
});

/** A fixed script of orders, the same every run: the determinism check. */
function play(seed: string, from?: GameState): GameState {
  let s = from ?? newGame(c, seed);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 60) {
    if (s.phase === 'act') {
      const target = s.fed.headings[0]?.to;
      if (target && canPromise(s, target).ok) {
        const r = promise(s, target);
        if (r.ok) s = r.state;
      }
      const m = movesFor(s, 'fleet')[0];
      if (m && s.influence >= 20) {
        const r = movePiece(s, 'fleet', m);
        if (r.ok) s = r.state;
      }
      if (s.week === 3 && s.influence >= 30) {
        const r = offerWayOut(s, 'summit');
        if (r.ok) s = r.state;
      }
      s = endWeek(c, s);
    } else {
      s = answerPhone(c, s, s.phone!.region && holdable(s, s.phone!.region).ok ? 'back' : s.phone!.round === 1 ? 'wait' : 'down');
    }
  }
  return s;
}

describe('determinism and the save', () => {
  it('the same seed and the same orders give the same state', () => {
    for (const seed of ['det-1', 'det-2', 'det-3']) expect(JSON.stringify(play(seed))).toBe(JSON.stringify(play(seed)));
  });
  it('a game saved in the middle continues exactly as the unsaved one', () => {
    const seed = 'mid';
    let a = newGame(c, seed);
    for (let i = 0; i < 3; i++) {
      a = endWeek(c, a);
      while (a.phase === 'phone') a = answerPhone(c, a, 'down');
    }
    const text = saveGame(a);
    const b = loadGame(text);
    expect(b).not.toBeNull();
    expect(JSON.stringify(play(seed, a))).toBe(JSON.stringify(play(seed, b!)));
  });
  it('round-trips in every phase and refuses what it cannot trust', () => {
    const s0 = newGame(c, 'save');
    expect(loadGame(saveGame(s0))).toEqual(s0);
    let s = s0;
    let guard = 0;
    while (s.phase !== 'phone' && guard++ < 20) {
      s = endWeek(c, s);
      if (s.phase === 'ended') break;
    }
    if (s.phase === 'phone') expect(loadGame(saveGame(s))).toEqual(s);
    const end = play('save-end');
    expect(end.phase).toBe('ended');
    expect(loadGame(saveGame(end))).toEqual(end);
    expect(loadGame(null)).toBeNull();
    expect(loadGame('not json')).toBeNull();
    expect(loadGame(JSON.stringify({ format: 'brink.redlines', version: 2, state: s0 }))).toBeNull();
    const tampered = JSON.parse(saveGame(s0));
    tampered.state.fed.step = 9;
    expect(loadGame(JSON.stringify(tampered))).toBeNull();
    const missing = JSON.parse(saveGame(s0));
    delete missing.state.regions[REGION_IDS[0]];
    expect(loadGame(JSON.stringify(missing))).toBeNull();
    expect(isGameState({})).toBe(false);
  });
});
