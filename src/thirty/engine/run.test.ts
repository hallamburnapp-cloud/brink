import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { loadThirtyContent } from '../content/load.ts';
import type { ThirtyContent } from '../content/types.ts';
import { optionsOf } from './cards.ts';
import { preview } from './preview.ts';
import { RULES, dangerOf, mapDanger } from './rules.ts';
import { choose, danger, newGame, pick, startingHeats, tapRegion } from './run.ts';
import { loadGame, saveGame } from './save.ts';
import { fixture, quiet, withCard, withHeats, withTeam } from './testkit.ts';
import type { GameState } from './types.ts';
import { HOME_REGIONS, REGION_IDS } from './world.ts';

const content = fixture();
const PACK = join(process.cwd(), 'content-thirty');

/** Play a whole game with a seeded random bot; returns every state. */
function playRandom(c: ThirtyContent, seed: string, botSeed = 'bot'): GameState[] {
  const rng = new Rng(botSeed);
  let s = newGame(c, seed);
  const states = [s];
  let guard = 0;
  while (s.phase !== 'over' && guard++ < 200) {
    let r;
    if (s.phase === 'offer') r = pick(c, s, rng.int(2) ? rng.int(s.offer!.length) : null);
    else {
      const card = c.cards[s.card!.id];
      const options = optionsOf(card);
      const o = rng.pick(options);
      r = card.map ? tapRegion(c, s, o) : choose(c, s, o as 'left' | 'right');
    }
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    states.push(s);
  }
  return states;
}

describe('newGame', () => {
  it('starts on day 1 with three TENSE and one CRISIS abroad, DANGER 11, and a card dealt', () => {
    const s = newGame(content, 'alpha');
    expect(s.day).toBe(1);
    expect(s.phase).toBe('choose');
    const hot = REGION_IDS.filter((r) => s.heats[r] > 0);
    expect(hot).toHaveLength(4);
    expect(REGION_IDS.filter((r) => s.heats[r] === 2)).toHaveLength(1);
    expect(REGION_IDS.filter((r) => s.heats[r] === 1)).toHaveLength(3);
    expect(hot.some((r) => HOME_REGIONS.includes(r))).toBe(false);
    expect(danger(s)).toBe(11);
    expect(s.peak).toBe(11);
    expect(s.card).not.toBeNull();
    // The first card is about the crisis, so its news changes nothing.
    expect(s.card!.region).toBe(REGION_IDS.find((r) => s.heats[r] === 2));
    expect(s.card!.arrival).toEqual([]);
    expect(s.deck.used).toEqual([s.card!.id]);
    expect(s.team).toEqual([]);
  });

  it('is seeded: the same seed gives the same map and card, another seed another', () => {
    expect(newGame(content, 'alpha')).toEqual(newGame(content, 'alpha'));
    const a = startingHeats('alpha').heats;
    const b = startingHeats('beta').heats;
    expect(a).not.toEqual(b);
    const seeds = Array.from({ length: 40 }, (_, i) => `s${i}`);
    expect(new Set(seeds.map((x) => REGION_IDS.find((r) => startingHeats(x).heats[r] === 2))).size).toBeGreaterThan(5);
  });

  it('refuses an empty pack', () => {
    expect(() => newGame({ ...content, cardOrder: [] }, 'x')).toThrow();
  });
});

describe('a day', () => {
  it('choose resolves the choice, the pressure and the ending check, then deals the next card', () => {
    const s = quiet(content, 'plain-shl', { SHL: 2, WMS: 1 });
    const r = choose(content, s, 'left');
    expect(r.ok).toBe(true);
    const n = r.state;
    expect(n.day).toBe(2);
    expect(n.phase).toBe('choose');
    expect(n.card).not.toBeNull();
    expect(n.card!.id).not.toBe('plain-shl');
    expect(n.log).toHaveLength(1);
    const t = n.log[0];
    expect(t.day).toBe(1);
    expect(t.card).toBe('plain-shl');
    expect(t.region).toBe('SHL');
    expect(t.acted).toBe('SHL');
    expect(t.choice).toBe('left');
    expect(t.tag).toBe('CALM');
    expect(t.dangerBefore).toBe(7);
    expect(t.dangerAfterChoice).toBe(4);
    expect(t.steps[0]).toEqual({ kind: 'danger', at: 'start', danger: 7 });
    expect(t.steps[1]).toEqual({ kind: 'heat', region: 'SHL', from: 2, to: 1, why: 'choice', danger: 4 });
    expect(t.steps.filter((x) => x.kind === 'danger').map((x) => (x as { at: string }).at)).toEqual(['start', 'choice', 'pressure']);
    // The gauge now reads the day's end plus the next card's news (in card.arrival).
    const news = n.card!.arrival.filter((x) => x.kind === 'heat').reduce((a, x) => a + ((x as { to: number }).to - (x as { from: number }).from) * 2, 0);
    expect(danger(n)).toBe(t.dangerAfter + news);
    expect(t.ending).toBeNull();
    expect(t.offer).toBeNull();
    // The state given is untouched.
    expect(s.day).toBe(1);
    expect(s.heats.SHL).toBe(2);
    expect(s.log).toEqual([]);
  });

  it('a HOME choice holds off the next domestic card', () => {
    const s = quiet(content, 'shoal-risky', { SHL: 2 });
    const n = choose(content, s, 'right').state;
    expect(n.homeDay).toBe(1);
    expect(n.log[0].steps.filter((x) => x.kind === 'heat').filter((x) => (x as { why: string }).why === 'choice')).toEqual([]);
  });

  it('a follow-up is queued and comes when due', () => {
    const s = withCard(content, withHeats({ ...quiet(content, 'strait-01'), day: 4 }, { SHL: 2 }), 'strait-01');
    const n = choose(content, s, 'right').state;
    expect(n.log[0].steps).toContainEqual({ kind: 'follow', card: 'strait-03', from: 5, to: 7 });
    expect(n.day).toBe(5);
    // Due from day 5: it is today's card, and the queue is spent.
    expect(n.card!.id).toBe('strait-03');
    expect(n.deck.queue).toEqual([]);
    // The other branch queues the other card.
    const later = withCard(content, withHeats({ ...quiet(content, 'strait-01'), day: 4 }, { SHL: 2 }), 'strait-01');
    const m = choose(content, later, 'left').state;
    expect(m.log[0].steps).toContainEqual({ kind: 'follow', card: 'strait-02', from: 5, to: 6 });
    expect(m.card!.id).toBe('strait-02');
  });

  it('a map day takes a tap, not a side; a choice day takes a side, not a tap', () => {
    const map = quiet(content, 'fleet-map', { ORN: 2 });
    expect(choose(content, map, 'left')).toMatchObject({ ok: false, reason: 'tap a place on the map' });
    expect(tapRegion(content, map, 'EDV')).toMatchObject({ ok: false, reason: 'that place is not offered today' });
    const r = tapRegion(content, map, 'ORN');
    expect(r.ok).toBe(true);
    expect(r.state.log[0].choice).toEqual({ tapped: 'ORN' });
    expect(r.state.log[0].acted).toBe('ORN');
    expect(r.state.warned).toEqual(['ORN']);
    const side = quiet(content, 'plain-shl', { SHL: 1 });
    expect(tapRegion(content, side, 'SHL')).toMatchObject({ ok: false, reason: 'choose a side' });
    expect(pick(content, side, 0)).toMatchObject({ ok: false, reason: 'no offer is open' });
  });

  it('the trace lists the chips that fired', () => {
    const s = withCard(content, withTeam(quiet(content, 'plain-shl', { SHL: 3, LNK: 2 }), ['old-ambassador', 'back-channel']), 'plain-shl');
    const n = choose(content, s, 'left').state;
    expect(n.log[0].fired).toEqual(['old-ambassador', 'back-channel']);
  });

  it('the preview is exactly what the choice then does', () => {
    for (let i = 0; i < 40; i++) {
      const s = newGame(content, `pv-${i}`);
      const card = content.cards[s.card!.id];
      for (const o of optionsOf(card)) {
        const p = preview(content, s, o)!;
        const r = card.map ? tapRegion(content, s, o) : choose(content, s, o as 'left' | 'right');
        const t = r.state.log[0];
        expect(t.dangerBefore).toBe(p.dangerBefore);
        const held = t.steps.find((x) => x.kind === 'roll') as { held: boolean } | undefined;
        if (p.tag === 'RISKY' && held && !held.held) expect(t.dangerAfterChoice).toBe(p.dangerIfMissed);
        else expect(t.dangerAfterChoice).toBe(p.dangerAfter);
      }
    }
  });
});

describe('the team offer', () => {
  it('comes after day 5 with three pieces; pick takes one or none and deals day 6', () => {
    const s = withHeats({ ...quiet(content, 'plain-shl'), day: 5 }, { SHL: 2, WMS: 1 });
    const n = choose(content, s, 'left').state;
    expect(n.phase).toBe('offer');
    expect(n.day).toBe(5);
    expect(n.card).toBeNull();
    expect(n.offer).toHaveLength(3);
    expect(n.log[0].offer).toEqual(n.offer);
    expect(choose(content, n, 'left')).toMatchObject({ ok: false, reason: 'pick a piece first' });
    expect(pick(content, n, 3)).toMatchObject({ ok: false, reason: 'no such piece' });
    const took = pick(content, n, 1).state;
    expect(took.team).toEqual([n.offer![1]]);
    expect(took.day).toBe(6);
    expect(took.phase).toBe('choose');
    expect(took.picks).toEqual([{ day: 5, offer: n.offer, taken: n.offer![1] }]);
    const none = pick(content, n, null).state;
    expect(none.team).toEqual([]);
    expect(none.day).toBe(6);
    expect(none.picks[0].taken).toBeNull();
  });

  it('Red Lines names the hottest region at the pick when the pack has no red-line card', () => {
    const noCard = { ...content, cardOrder: content.cardOrder.filter((id) => id !== 'redline-map'), cards: { ...content.cards } };
    delete noCard.cards['redline-map'];
    const s = withHeats({ ...quiet(noCard, 'plain-shl'), day: 5 }, { SHL: 2, WMS: 3 });
    let n = choose(noCard, s, 'left').state;
    n = { ...n, offer: ['red-lines', 'hotline', 'spin-doctor'] };
    const took = pick(noCard, n, 0).state;
    expect(took.redLine).toBe('WMS');
    // With the card in the pack, the line waits for the tap.
    const withCardPack = withHeats({ ...quiet(content, 'plain-shl'), day: 5 }, { SHL: 2, WMS: 3 });
    let m = choose(content, withCardPack, 'left').state;
    m = { ...m, offer: ['red-lines', 'hotline', 'spin-doctor'] };
    const waited = pick(content, m, 0).state;
    expect(waited.redLine).toBeNull();
    expect(waited.card!.id).toBe('redline-map');
    const drawn = tapRegion(content, waited, 'SHL').state;
    expect(drawn.redLine).toBe('SHL');
  });
});

describe('endings (SPEC "Ends", checked after pressure)', () => {
  it('WAR at DANGER 100 names the region that tipped it and the day', () => {
    const heats: Record<string, 0 | 1 | 2 | 3> = { NWK: 3, FRM: 3, WMS: 3, WNM: 3, GLM: 3, KLM: 3, KLP: 3, BRK: 3 };
    const s = withHeats({ ...quiet(content, 'lintel-force'), day: 9 }, { ...heats, LTL: 1 });
    expect(mapDanger(s.heats)).toBe(98);
    // Forcing Lintel heats Kelpmouth (already at war: nothing) — use the CALM side whose consequence raises Orrinth to CRISIS (+5).
    const n = choose(content, withCard(content, s, 'lintel-force'), 'right').state;
    expect(n.phase).toBe('over');
    expect(n.ending).toEqual({ kind: 'WAR', day: 9, danger: 100, region: 'ORN' });
    expect(n.card).toBeNull();
    expect(n.log[0].ending).toEqual(n.ending);
    expect(choose(content, n, 'left')).toMatchObject({ ok: false, reason: 'the game is over' });
  });

  it('STAND-DOWN at DANGER 0 from the end of day 5, not before', () => {
    const early = quiet(content, 'plain-shl', { SHL: 1 });
    const e = choose(content, early, 'left').state;
    expect(e.log[0].dangerAfterChoice).toBe(0);
    expect(e.ending).toBeNull();
    expect(e.phase).toBe('choose');
    expect(e.day).toBe(2);
    const five = withHeats({ ...quiet(content, 'plain-shl'), day: 5 }, { SHL: 1 });
    const f = choose(content, withCard(content, five, 'plain-shl'), 'left').state;
    expect(f.ending).toEqual({ kind: 'STAND-DOWN', day: 5, danger: 0 });
    expect(f.phase).toBe('over');
  });

  it('a penalty keeps the map from standing down', () => {
    const s = withHeats({ ...quiet(content, 'plain-shl'), day: 6, penalty: 15 }, { SHL: 1 });
    const n = choose(content, withCard(content, s, 'plain-shl'), 'left').state;
    expect(n.log[0].dangerAfterChoice).toBe(15);
    expect(n.ending).toBeNull();
  });

  it('HELD at the end of day 30, clean under 20', () => {
    const s = withHeats({ ...quiet(content, 'plain-shl'), day: 30 }, { SHL: 2, WMS: 1 });
    const n = choose(content, withCard(content, s, 'plain-shl'), 'left').state;
    expect(n.ending).toMatchObject({ kind: 'HELD', day: 30, clean: true });
    expect(n.ending!.danger).toBeLessThan(20);
    const hot = withHeats({ ...quiet(content, 'plain-shl'), day: 30 }, { SHL: 2, WMS: 3, ORN: 3, MRM: 1, FLE: 1 });
    const h = choose(content, withCard(content, hot, 'plain-shl'), 'left').state;
    expect(h.ending).toMatchObject({ kind: 'HELD', day: 30, clean: false });
  });

  it('day 30 ends the game even on an offer-free day; no offer follows an ending', () => {
    const s = withHeats({ ...quiet(content, 'plain-shl'), day: 25 }, { SHL: 1 });
    const n = choose(content, withCard(content, s, 'plain-shl'), 'left').state;
    // DANGER 0 after day 5: STAND-DOWN wins over the offer.
    expect(n.ending?.kind).toBe('STAND-DOWN');
    expect(n.offer).toBeNull();
  });
});

describe('whole games', () => {
  it('a random bot plays the fixture pack to an ending without stalling, deterministically', () => {
    const a = playRandom(content, 'game-1');
    const b = playRandom(content, 'game-1');
    expect(a.length).toBe(b.length);
    expect(saveGame(a[a.length - 1])).toBe(saveGame(b[b.length - 1]));
    const last = a[a.length - 1];
    expect(last.phase).toBe('over');
    expect(['WAR', 'STAND-DOWN', 'HELD']).toContain(last.ending!.kind);
    expect(last.log.length).toBe(last.ending!.day);
    for (const s of a) expect(dangerOf(s.heats, s.penalty)).toBe(danger(s));
    expect(last.peak).toBeGreaterThanOrEqual(11);
  });

  it('a different bot seed on the same game seed plays a different game', () => {
    const a = playRandom(content, 'game-2', 'x');
    const b = playRandom(content, 'game-2', 'y');
    expect(a[0]).toEqual(b[0]);
    expect(saveGame(a[a.length - 1])).not.toBe(saveGame(b[b.length - 1]));
  });

  it('the shipped pack plays through', () => {
    const { content: pack, issues } = loadThirtyContent(PACK);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    for (let i = 0; i < 5; i++) {
      const states = playRandom(pack, `ship-${i}`);
      const last = states[states.length - 1];
      expect(last.phase).toBe('over');
      expect(last.log.length).toBeGreaterThanOrEqual(RULES.standDownFromDay);
      // Every day a card the pack knows.
      for (const t of last.log) expect(pack.cards[t.card]).toBeDefined();
    }
  });
});

describe('the save', () => {
  it('round-trips a game in every phase and continues identically', () => {
    const states = playRandom(content, 'save-1');
    const mid = states.find((s) => s.phase === 'offer') ?? states[3];
    const text = saveGame(mid);
    const back = loadGame(content, text)!;
    expect(back).toEqual(mid);
    expect(saveGame(back)).toBe(text);
    const last = states[states.length - 1];
    expect(loadGame(content, saveGame(last))).toEqual(last);
    // Continuing from the loaded state matches continuing from the original.
    const s = states.find((x) => x.phase === 'choose' && x.day > 2)!;
    const l = loadGame(content, saveGame(s))!;
    const card = content.cards[s.card!.id];
    const o = optionsOf(card)[0];
    const r1 = card.map ? tapRegion(content, s, o) : choose(content, s, o as 'left');
    const r2 = card.map ? tapRegion(content, l, o) : choose(content, l, o as 'left');
    expect(saveGame(r1.state)).toBe(saveGame(r2.state));
  });

  it('refuses what it cannot trust', () => {
    const s = newGame(content, 'save-2');
    expect(loadGame(content, null)).toBeNull();
    expect(loadGame(content, '')).toBeNull();
    expect(loadGame(content, 'not json')).toBeNull();
    expect(loadGame(content, JSON.stringify({ format: 'brink.war', version: 3, state: s }))).toBeNull();
    expect(loadGame(content, JSON.stringify({ format: 'brink.thirty', version: 2, state: s }))).toBeNull();
    const broken = JSON.parse(saveGame(s));
    broken.state.heats.SHL = 7;
    expect(loadGame(content, JSON.stringify(broken))).toBeNull();
    const unknownCard = JSON.parse(saveGame(s));
    unknownCard.state.card.id = 'no-such-card';
    expect(loadGame(content, JSON.stringify(unknownCard))).toBeNull();
    const unknownPiece = JSON.parse(saveGame(s));
    unknownPiece.state.team = ['nobody'];
    expect(loadGame(content, JSON.stringify(unknownPiece))).toBeNull();
    const phase = JSON.parse(saveGame(s));
    phase.state.phase = 'offer';
    expect(loadGame(content, JSON.stringify(phase))).toBeNull();
    expect(loadGame(content, saveGame(s).slice(0, -20))).toBeNull();
  });
});
