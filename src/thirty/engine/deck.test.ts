import { describe, expect, it } from 'vitest';
import { RULES } from './rules.ts';
import { Rng } from '../../engine/rng.ts';
import { availablePieces, dealCard, drawOffer, fits, hasRedLineCard, hottestRegion, queueFollows, selectCard, selectCardWhy, starvingRegions } from './deck.ts';
import { draft, newGame } from './run.ts';
import { fixture, onDay, quiet, withCard, withHeats, withTeam } from './testkit.ts';
import type { GameState } from './types.ts';

const content = fixture();

/** Deal many times from the same state with different deal streams; the ids dealt. */
function dealt(s0: GameState, n = 60): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < n; i++) {
    const s = draft(s0);
    s.rng.deal = new Rng(`deal-${i}`).snapshot();
    out.add(selectCard(content, s).id);
  }
  return out;
}

describe('fits: day range and conditions', () => {
  const base = quiet(content, 'plain-shl');
  const used = new Set<string>();

  it('a card comes only in its day range, and a chained card never on its own', () => {
    expect(fits(content.cards['late-only'], onDay(base, 19), used)).toBe(false);
    expect(fits(content.cards['late-only'], onDay(base, 20), used)).toBe(true);
    expect(fits(content.cards['strait-02'], onDay(base, 10), used)).toBe(false);
    expect(fits(content.cards['strait-01'], onDay(base, 2), used)).toBe(false);
    expect(fits(content.cards['strait-01'], onDay(base, 3), used)).toBe(true);
  });

  it('when.heat is the card region\'s heat range; when.pieces must be held', () => {
    expect(fits(content.cards['needs-tense'], base, used)).toBe(false);
    expect(fits(content.cards['needs-tense'], withHeats(base, { WMS: 1 }), used)).toBe(true);
    const hot = withHeats(onDay(base, 5), { TRN: 1, SHL: 2 });
    expect(fits(content.cards['redline-map'], hot, used)).toBe(false);
    expect(fits(content.cards['redline-map'], withTeam(hot, ['red-lines']), used)).toBe(true);
    // A map card needs at least two places that would lower DANGER: on a calm map it waits.
    expect(fits(content.cards['redline-map'], withTeam(onDay(base, 5), ['red-lines']), used)).toBe(false);
    expect(fits(content.cards['redline-map'], withTeam(withHeats(onDay(base, 5), { SHL: 3 }), ['red-lines']), used)).toBe(false);
  });

  it('a used card does not come again unless the deck relaxes', () => {
    expect(fits(content.cards['plain-shl'], base, new Set(['plain-shl']))).toBe(false);
    expect(fits(content.cards['plain-shl'], base, new Set(['plain-shl']), { used: true, when: false, day: false })).toBe(true);
  });

  it('domestic cards stay away the day after a HOME choice and under the Spin Doctor', () => {
    const s = onDay(base, 6);
    expect(fits(content.cards['home-fuel'], s, used)).toBe(true);
    expect(fits(content.cards['home-fuel'], { ...s, homeDay: 5 }, used)).toBe(false);
    expect(fits(content.cards['home-fuel'], { ...s, homeDay: 4 }, used)).toBe(true);
    expect(fits(content.cards['home-fuel'], withTeam(s, ['spin-doctor']), used)).toBe(false);
  });
});

describe('selectCard: what comes today', () => {
  it('a due follow-up comes before anything else, soonest deadline first, then the hottest region', () => {
    const s = withHeats(onDay(newGame(content, 'q'), 6), { LNK: 2, LTL: 1 });
    s.deck.queue = [
      { card: 'strait-02', from: 5, to: 9 },
      { card: 'strait-03', from: 6, to: 8 },
    ];
    expect(selectCard(content, s).id).toBe('strait-03');
    expect(s.deck.queue).toEqual([{ card: 'strait-02', from: 5, to: 9 }]);
    // Same deadline: the hotter region (LNK 2 over LTL 1).
    const tie = withHeats(onDay(newGame(content, 'q'), 6), { LNK: 2, LTL: 1 });
    tie.deck.queue = [
      { card: 'strait-02', from: 5, to: 8 },
      { card: 'strait-03', from: 6, to: 8 },
    ];
    expect(selectCard(content, tie).id).toBe('strait-03');
    // Not yet due: nothing from the queue.
    const early = withHeats(onDay(newGame(content, 'q'), 6), {});
    early.deck.queue = [{ card: 'strait-02', from: 7, to: 9 }];
    expect(selectCard(content, early).id).not.toBe('strait-02');
    expect(early.deck.queue).toHaveLength(1);
  });

  it('a follow-up comes late rather than never, and ignores `when`', () => {
    const s = withHeats(onDay(newGame(content, 'q'), 12), {});
    s.deck.queue = [{ card: 'strait-02', from: 5, to: 7 }];
    expect(selectCard(content, s).id).toBe('strait-02');
  });

  it('cards unlocked by a held piece come as soon as they fit', () => {
    const s = withTeam(withHeats(onDay(newGame(content, 'q'), 7), { SHL: 3, TRN: 1 }), ['red-lines']);
    expect([...dealt(s)]).toEqual(['redline-map']);
  });

  it('a CRISIS or WAR region that has waited RULES.hotCardWithin / warCardWithin days gets its card', () => {
    const s = withHeats(onDay(newGame(content, 'q'), 8), { ORN: 2, SHL: 1 });
    s.deck.hotSince.ORN = 6;
    expect(starvingRegions(s)).toEqual(['ORN']);
    s.deck.lastCardDay.ORN = 7;
    expect(starvingRegions(s)).toEqual([]);
    s.deck.lastCardDay.ORN = 6;
    expect(starvingRegions(s)).toEqual(['ORN']);
    // Red is answered within RULES.warCardWithin days (two, like a crisis): yesterday's card holds it off, an older one does not.
    expect(RULES.warCardWithin).toBe(2);
    s.heats.ORN = 3;
    s.deck.lastCardDay.ORN = 7;
    expect(starvingRegions(s)).toEqual([]);
    s.deck.lastCardDay.ORN = 6;
    expect(starvingRegions(s)).toEqual(['ORN']);
    // Every deal is about Orrinth (its plain card, or a map card whose places include it).
    for (const id of dealt(s)) expect(['plain-orn', 'fleet-map', 'envoy-map']).toContain(id);
  });

  it('prefers the hottest regions', () => {
    const s = withHeats(onDay(newGame(content, 'q'), 2), { WMS: 3 });
    s.deck.hotSince.WMS = 2;
    let wms = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const d = draft(s);
      d.rng.deal = new Rng(`w-${i}`).snapshot();
      const c = selectCard(content, d);
      if (c.region === 'WMS') wms++;
    }
    // WMS cards weigh 6 each (two of them: plain and needs-tense) against 29 regions at weight 1 and the maps.
    expect(wms / n).toBeGreaterThan(0.2);
    expect(wms / n).toBeLessThan(0.5);
  });

  it('map cards come at RULES.mapDayChance when their places are worth tapping, never on day 1 or two days running', () => {
    const warm = { SHL: 1, ORN: 1, WMS: 1, TLM: 1 } as const;
    const s = withHeats(onDay(newGame(content, 'q'), 3), warm);
    let maps = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const d = draft(s);
      d.rng.deal = new Rng(`m-${i}`).snapshot();
      if (selectCard(content, d).map) maps++;
    }
    expect(maps / n).toBeGreaterThan(RULES.mapDayChance - 0.04);
    expect(maps / n).toBeLessThan(RULES.mapDayChance + 0.05);
    const dayOne = withHeats(newGame(content, 'q'), warm);
    expect([...dealt(dayOne)].some((id) => content.cards[id].map)).toBe(false);
    const after = withHeats(onDay(newGame(content, 'q'), 4), warm);
    after.deck.lastMapDay = 3;
    expect([...dealt(after)].some((id) => content.cards[id].map)).toBe(false);
    // On a calm map no map card fits: there is nothing worth tapping.
    expect([...dealt(withHeats(onDay(newGame(content, 'q'), 4), {}))].some((id) => content.cards[id].map)).toBe(false);
  });

  it('never stalls: with every card used it deals the one used longest ago', () => {
    const s = withHeats(onDay(newGame(content, 'q'), 10), {});
    s.deck.used = content.cardOrder.filter((id) => !content.cards[id].chained);
    const first = selectCard(content, s);
    expect(first.id).toBe(s.deck.used[0]);
  });
});

describe('queueFollows', () => {
  it('schedules in [day + in0, day + in1], never before tomorrow, dropping what cannot come by day 30', () => {
    const s = onDay(newGame(content, 'q'), 10);
    s.deck.queue = [];
    const q = queueFollows(content, s, [
      { card: 'strait-02', in: [1, 2] },
      { card: 'strait-03', in: [0, 0] },
      { card: 'alarm-03', in: [25, 26] },
    ]);
    expect(q).toEqual([
      { card: 'strait-02', from: 11, to: 12 },
      { card: 'strait-03', from: 11, to: 11 },
    ]);
    expect(s.deck.queue).toEqual(q);
  });

  it('the Paranoid director brings a crisis its card by the next morning, and the card says so', () => {
    // Orrinth went into crisis on day 8: the plain rule waits two days, the Paranoid director one.
    const s = withTeam(withHeats(onDay(newGame(content, 'q'), 9), { ORN: 2 }), ['paranoid-intel']);
    s.deck.hotSince = { ORN: 8 };
    expect(starvingRegions(s)).toEqual(['ORN']);
    expect(starvingRegions(s, false)).toEqual([]);
    const picked = selectCardWhy(content, s);
    expect(picked.card.region).toBe('ORN');
    expect(picked.early).toBe(true);
    const dealt = dealCard(content, { ...withTeam(withHeats(onDay(newGame(content, 'q'), 9), { ORN: 2 }), ['paranoid-intel']), deck: { ...s.deck, used: [] } });
    expect(dealt.region).toBe('ORN');
    expect(dealt.arrival).toContainEqual({ kind: 'piece', piece: 'paranoid-intel', note: 'Orrinth spotted early' });
    // Without the piece the region waits, and a card the plain rule would deal anyway is not "early".
    const plain = withHeats(onDay(newGame(content, 'q'), 9), { ORN: 2 });
    plain.deck.hotSince = { ORN: 8 };
    expect(selectCardWhy(content, plain).early).toBe(false);
    const overdue = withTeam(withHeats(onDay(newGame(content, 'q'), 10), { ORN: 2 }), ['paranoid-intel']);
    overdue.deck.hotSince = { ORN: 8 };
    expect(selectCardWhy(content, overdue).early).toBe(false);
  });

  it('a card about a region the choice cooled today waits a day when it can', () => {
    // Shoal was cooled today: the follow-up about it (window to tomorrow) waits; at its deadline it comes.
    const s = withHeats(onDay(newGame(content, 'q'), 10), { SHL: 1 });
    s.deck.queue = [{ card: 'strait-03', from: 10, to: 11 }];
    expect(selectCard(content, s, 10, new Set(['LNK'])).id).not.toBe('strait-03');
    expect(s.deck.queue.map((q) => q.card)).toContain('strait-03');
    const deadline = withHeats(onDay(newGame(content, 'q'), 11), { SHL: 1 });
    deadline.deck.queue = [{ card: 'strait-03', from: 10, to: 11 }];
    expect(selectCard(content, deadline, 11, new Set(['LNK'])).id).toBe('strait-03');
    // A single-day draw about a cooled region is passed over while another card fits.
    const cooled = withHeats(onDay(newGame(content, 'q'), 10), { SHL: 1, WMS: 1 });
    for (let i = 0; i < 20; i++) expect(selectCard(content, { ...cooled, rng: { ...cooled.rng, deal: new Rng(`d${i}`).snapshot() } }, 10, new Set(['SHL'])).region).not.toBe('SHL');
  });
});

describe('dealCard', () => {
  it('rolls the odds once, keeps the books, and marks a warning\'s truth', () => {
    const s = withHeats(onDay(newGame(content, 'q'), 9), { WMS: 2 });
    s.deck.queue = [{ card: 'alarm-02', from: 9, to: 10 }];
    const before = s.rng.odds.join(',');
    const card = dealCard(content, s);
    expect(card.id).toBe('alarm-02');
    expect(card.alarm).toBe('unknown');
    expect(card.alarmFalse).toBe(card.roll * 100 < 70);
    expect(s.rng.odds.join(',')).not.toBe(before);
    expect(s.deck.used).toContain('alarm-02');
    expect(s.deck.lastCardDay.WMS).toBe(9);
    expect(card.arrival).toEqual([]);
  });

  it('the Cautious director marks the alarm on arrival', () => {
    const s = withTeam(withHeats(onDay(newGame(content, 'q'), 9), { WMS: 2 }), ['cautious-intel']);
    s.deck.queue = [{ card: 'alarm-02', from: 9, to: 10 }];
    const card = dealCard(content, s);
    expect(card.alarm).toBe(card.alarmFalse ? 'false' : 'real');
    expect(card.arrival[0]).toEqual({ kind: 'piece', piece: 'cautious-intel', note: card.alarmFalse ? 'A false alarm' : 'The warning is real' });
  });

  it('the Hotline ends a crisis card\'s crisis on arrival (CRISIS to TENSE, so the card still has work), once a week', () => {
    const s = withTeam(withHeats(onDay(newGame(content, 'q'), 6), { SHL: 2 }), ['hotline']);
    s.deck.queue = [{ card: 'strait-01', from: 6, to: 6 }];
    const card = dealCard(content, s);
    expect(card.id).toBe('strait-01');
    expect(s.heats.SHL).toBe(1);
    expect(s.hotlineWeek).toBe(2);
    expect(card.arrival).toEqual([{ kind: 'heat', region: 'SHL', from: 2, to: 1, why: 'piece', piece: 'hotline', danger: 2 }]);
    // Used this week: a second crisis card is not calmed.
    const again = withHeats(onDay(s, 8), { LTL: 2 });
    again.deck.queue = [{ card: 'strait-02', from: 8, to: 8 }];
    dealCard(content, again);
    expect(again.heats.LTL).toBe(2);
    // Next week it works again (a WAR region falls to CRISIS).
    const next = withHeats(onDay(s, 11), { LTL: 3 });
    next.deck.queue = [{ card: 'strait-02', from: 11, to: 11 }];
    dealCard(content, next);
    expect(next.heats.LTL).toBe(2);
    // Not for a TENSE region (a plain card's news leaves it TENSE).
    const tense = withTeam(withHeats(onDay(newGame(content, 'q'), 6), { SHL: 1 }), ['hotline']);
    tense.deck.queue = [{ card: 'plain-shl', from: 6, to: 6 }];
    dealCard(content, tense);
    expect(tense.heats.SHL).toBe(1);
    expect(tense.hotlineWeek).toBeNull();
  });
});

describe('news on arrival', () => {
  it('a card finds its region in trouble: TENSE for a plain card, CRISIS for an arc\'s first card, nothing for a hotter region', () => {
    const plain = withHeats(onDay(newGame(content, 'q'), 6), {});
    plain.deck.queue = [{ card: 'plain-shl', from: 6, to: 6 }];
    const a = dealCard(content, plain);
    expect(plain.heats.SHL).toBe(1);
    expect(a.arrival).toEqual([{ kind: 'heat', region: 'SHL', from: 0, to: 1, why: 'news', danger: 2 }]);
    const arc = withHeats(onDay(newGame(content, 'q'), 6), {});
    arc.deck.queue = [{ card: 'strait-01', from: 6, to: 6 }];
    const b = dealCard(content, arc);
    expect(arc.heats.SHL).toBe(2);
    expect(b.arrival).toEqual([{ kind: 'heat', region: 'SHL', from: 0, to: 2, why: 'news', danger: 5 }]);
    const hot = withHeats(onDay(newGame(content, 'q'), 6), { SHL: 3 });
    hot.deck.queue = [{ card: 'strait-01', from: 6, to: 6 }];
    const c = dealCard(content, hot);
    expect(hot.heats.SHL).toBe(3);
    expect(c.arrival).toEqual([]);
    // A chained card brings plain news.
    const chained = withHeats(onDay(newGame(content, 'q'), 6), {});
    chained.deck.queue = [{ card: 'strait-02', from: 6, to: 6 }];
    dealCard(content, chained);
    expect(chained.heats.LTL).toBe(1);
  });

  it('day 1 is about the starting crisis', () => {
    for (let i = 0; i < 20; i++) {
      const s = newGame(content, `d1-${i}`);
      const card = content.cards[s.card!.id];
      const crisis = Object.entries(s.heats).find(([, h]) => h === 2)![0];
      expect(card.region ?? card.map).toBeTruthy();
      if (!card.map) expect(card.region).toBe(crisis);
    }
  });
});

describe('the team offer', () => {
  it('offers three pieces not held and not excluded, seeded; fewer when fewer remain; none when the team is full', () => {
    const s = quiet(content, 'plain-shl');
    const offer = drawOffer(content, s);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    expect(drawOffer(content, quiet(content, 'plain-shl'))).toEqual(offer);
    const cautious = withTeam(s, ['cautious-intel']);
    expect(availablePieces(content, cautious.team)).not.toContain('paranoid-intel');
    expect(availablePieces(content, cautious.team)).not.toContain('cautious-intel');
    expect(availablePieces(content, ['paranoid-intel'])).not.toContain('cautious-intel');
    const full = withTeam(s, ['old-ambassador', 'back-channel', 'peace-movement', 'hotline', 'dove-foreign']);
    expect(drawOffer(content, full)).toEqual([]);
    const nearly = withTeam(s, content.pieceOrder.filter((p) => p !== 'hotline' && p !== 'red-lines').slice(0, 4));
    expect(drawOffer(content, nearly).length).toBeLessThanOrEqual(3);
  });

  it('knows whether the pack can draw a red line, and the hottest region as the fallback', () => {
    expect(hasRedLineCard(content)).toBe(true);
    const s = withHeats(quiet(content, 'plain-shl'), { ORN: 2, WMS: 3, LTL: 3 });
    expect(hottestRegion(s)).toBe('WMS');
    expect(withCard(content, s, 'plain-shl').card!.id).toBe('plain-shl');
  });
});
