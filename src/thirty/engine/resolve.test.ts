import { describe, expect, it } from 'vitest';
import { actOf, effectiveOdds, missedBy, resolve } from './resolve.ts';
import { fixture, quiet, withCard, withHeats, withTeam } from './testkit.ts';
import type { GameState } from './types.ts';
import { Working } from './working.ts';

const content = fixture();

function play(s: GameState, option: 'left' | 'right' | string, force?: 'held' | 'missed') {
  const card = content.cards[s.card!.id];
  const act = actOf(card, option)!;
  const w = new Working(s);
  const res = resolve(w, card, s.card!, act, force);
  return { w, res, act };
}

const changes = (w: Working) => w.changes().map((c) => `${c.region}:${c.from}>${c.to}:${c.why}${c.piece ? ':' + c.piece : ''}`);

describe('the four tags (SPEC "Choices")', () => {
  it('CALM cools today\'s region by one', () => {
    const { w } = play(quiet(content, 'plain-shl', { SHL: 2 }), 'left');
    expect(changes(w)).toEqual(['SHL:2>1:choice']);
    expect(w.danger()).toBe(2);
  });

  it('CALM on a region already calm changes nothing', () => {
    const { w } = play(quiet(content, 'plain-shl'), 'left');
    expect(changes(w)).toEqual([]);
  });

  it('FORCE cools by two and heats the coolest neighbour by one when the card names none', () => {
    const { w, res } = play(quiet(content, 'plain-shl', { SHL: 3, LNK: 1 }), 'right');
    // SHL neighbours: LNK (1), PBB (0), LTL (0); PBB is west of LTL.
    expect(changes(w)).toEqual(['SHL:3>1:choice', 'PBB:0>1:choice']);
    expect(res.forced).toBe('PBB');
  });

  it('FORCE heats the neighbour the card names, even into WAR', () => {
    const { w, res } = play(quiet(content, 'lintel-force', { LTL: 2, KLP: 2 }), 'left');
    expect(changes(w)).toEqual(['LTL:2>0:choice', 'KLP:2>3:choice']);
    expect(res.forced).toBe('KLP');
    expect(w.warned.has('LTL')).toBe(true);
  });

  it('RISKY holds when the roll is under the odds: cools by two and applies the consequences', () => {
    const { w, res } = play(quiet(content, 'shoal-talks', { SHL: 2, LTL: 2 }, 0.59), 'left');
    expect(res.held).toBe(true);
    expect(res.odds).toBe(60);
    expect(changes(w)).toEqual(['SHL:2>0:choice', 'LTL:2>1:choice']);
    expect(w.steps.find((s) => s.kind === 'roll')).toMatchObject({ odds: 60, held: true, text: 'It worked · Danger down, cools Shoal and 1 more' });
  });

  it('RISKY misses at the odds and above: heats by one, applies `fail`, says what happened in words', () => {
    const { w, res } = play(quiet(content, 'shoal-risky', { SHL: 1 }, 0.733), 'left');
    expect(res.held).toBe(false);
    expect(changes(w)).toEqual(['SHL:1>2:choice', 'LTL:0>2:choice']);
    expect(w.steps.find((s) => s.kind === 'roll')).toMatchObject({ held: false, text: 'It failed · Danger up, Shoal heats and Lintel boils over' });
    const held = play(quiet(content, 'shoal-risky', { SHL: 2 }, 0.1), 'left').w;
    expect(held.steps.find((s) => s.kind === 'roll')).toMatchObject({ held: true, text: 'It worked · Danger down, Shoal calms' });
    expect(missedBy(0.7, 70)).toBe(1);
    expect(missedBy(0.999, 70)).toBe(30);
  });

  it('a `crisis` consequence never lowers a WAR region, `relieve` only lowers a CRISIS', () => {
    const atWar = play(quiet(content, 'shoal-risky', { SHL: 1, LTL: 3 }, 0.9), 'left');
    expect(changes(atWar.w)).toEqual(['SHL:1>2:choice']);
    const tense = play(quiet(content, 'shoal-talks', { SHL: 2, LTL: 1 }, 0.1), 'left');
    expect(changes(tense.w)).toEqual(['SHL:2>0:choice']);
  });

  it('HOME changes nothing on the map and says so', () => {
    const { w, res } = play(quiet(content, 'shoal-risky', { SHL: 2 }), 'right');
    expect(changes(w)).toEqual([]);
    expect(res.home).toBe(true);
  });

  it('a CALM button with `crisis` raises that region to CRISIS', () => {
    const { w } = play(quiet(content, 'lintel-force', { LTL: 1 }), 'right');
    expect(changes(w)).toEqual(['LTL:1>0:choice', 'ORN:0>2:choice']);
  });

  it('a map target acts on the tapped region with its own tag and mark', () => {
    const s = quiet(content, 'fleet-map', { ORN: 2, DNM: 0, VSY: 1 });
    const force = play(s, 'ORN');
    expect(changes(force.w)).toEqual(['ORN:2>0:choice', 'DNM:0>1:choice']);
    expect(force.w.warned.has('ORN')).toBe(true);
    const guard = play(s, 'VSY');
    expect(changes(guard.w)).toEqual(['VSY:1>0:choice']);
    expect(guard.w.guarded.VSY).toBe(1 + 7 - 1);
    expect(actOf(content.cards['fleet-map'], 'left')).toBeNull();
    expect(actOf(content.cards['fleet-map'], 'EDV')).toBeNull();
    expect(actOf(content.cards['plain-shl'], 'SHL')).toBeNull();
  });
});

describe('the pieces (SPEC "The team")', () => {
  const held = (s: GameState, team: string[]) => withCard(content, withTeam(s, team), s.card!.id, s.card!.roll);

  it('Old Ambassador: every calming choice cools one step more', () => {
    const { w } = play(held(quiet(content, 'plain-shl', { SHL: 3 }), ['old-ambassador']), 'left');
    expect(changes(w)).toEqual(['SHL:3>2:choice', 'SHL:2>1:piece:old-ambassador']);
    expect([...w.fired]).toEqual(['old-ambassador']);
    // Nothing left to cool: the chip does not glow.
    const tense = play(held(quiet(content, 'plain-shl', { SHL: 1 }), ['old-ambassador']), 'left');
    expect([...tense.w.fired]).toEqual([]);
    // Not a calming choice.
    const force = play(held(quiet(content, 'plain-shl', { SHL: 3 }), ['old-ambassador']), 'right');
    expect(force.w.fired.size).toBe(0);
  });

  it('Back-Channel: calming choices also cool the hottest neighbour', () => {
    const { w } = play(held(quiet(content, 'plain-shl', { SHL: 2, LNK: 1, LTL: 2 }), ['back-channel']), 'left');
    expect(changes(w)).toEqual(['SHL:2>1:choice', 'LTL:2>1:piece:back-channel']);
  });

  it('Peace Movement: calming choices cool the two hottest other regions; force heats Edda Vale', () => {
    const calm = play(held(quiet(content, 'plain-shl', { SHL: 2, WMS: 3, ORN: 2, MRM: 1 }), ['peace-movement']), 'left');
    expect(changes(calm.w)).toEqual(['SHL:2>1:choice', 'WMS:3>2:piece:peace-movement', 'ORN:2>1:piece:peace-movement']);
    const force = play(held(quiet(content, 'plain-shl', { SHL: 2 }), ['peace-movement']), 'right');
    expect(changes(force.w)).toEqual(['SHL:2>0:choice', 'PBB:0>1:choice', 'EDV:0>1:piece:peace-movement']);
  });

  it('the three calming pieces together turn one Talks into a wave across four regions', () => {
    const s = held(quiet(content, 'plain-shl', { SHL: 3, LNK: 2, WMS: 3, ORN: 2, MRM: 1 }), ['old-ambassador', 'back-channel', 'peace-movement']);
    const { w } = play(s, 'left');
    // The Ambassador's extra step rides on every cooling the calming choice makes (ENGINE.md "Rulings").
    expect(changes(w)).toEqual([
      'SHL:3>2:choice',
      'SHL:2>1:piece:old-ambassador',
      'LNK:2>1:piece:back-channel',
      'LNK:1>0:piece:old-ambassador',
      'WMS:3>2:piece:peace-movement',
      'WMS:2>1:piece:old-ambassador',
      'ORN:2>1:piece:peace-movement',
      'ORN:1>0:piece:old-ambassador',
    ]);
    expect(w.danger()).toBe(2 + 0 + 2 + 0 + 2);
    expect([...w.fired]).toEqual(['old-ambassador', 'back-channel', 'peace-movement']);
  });

  it('the wave from a hot map drops the gauge by twenty or thirty in one go (SPEC "The team")', () => {
    const crises = held(quiet(content, 'plain-shl', { SHL: 2, LNK: 2, WMS: 2, ORN: 2, MRM: 1 }), ['old-ambassador', 'back-channel', 'peace-movement']);
    const a = play(crises, 'left');
    expect(5 * 4 + 2 - a.w.danger()).toBe(20);
    const wars = held(quiet(content, 'plain-shl', { SHL: 3, LNK: 3, WMS: 3, ORN: 2, MRM: 1 }), ['old-ambassador', 'back-channel', 'peace-movement']);
    const b = play(wars, 'left');
    expect(12 * 3 + 5 + 2 - b.w.danger()).toBe(30 + 5);
  });

  it('Dove Foreign Minister: risky talks (a Foreign Minister\'s or Ambassador\'s card) become certain; other risks do not', () => {
    const talks = play(held(quiet(content, 'shoal-talks', { SHL: 2 }, 0.99), ['dove-foreign']), 'left');
    expect(talks.res.held).toBe(true);
    expect(talks.res.odds).toBe(100);
    expect(talks.w.steps[0]).toEqual({ kind: 'piece', piece: 'dove-foreign', note: 'Talks cannot fail' });
    const ships = play(held(quiet(content, 'shoal-risky', { SHL: 2 }, 0.99), ['dove-foreign']), 'left');
    expect(ships.res.held).toBe(false);
    expect(ships.res.odds).toBe(70);
  });

  it('Hawk General: a show of force also cools every neighbour one step, and still heats one of them', () => {
    // SHL's neighbours west to east: PBB, LNK, LTL. The wave cools the hot ones; the force then heats the coolest (Pebbleby, calm).
    const { w } = play(held(quiet(content, 'plain-shl', { SHL: 3, LNK: 2, LTL: 1 }), ['hawk-general']), 'right');
    expect(changes(w)).toEqual(['SHL:3>1:choice', 'LNK:2>1:piece:hawk-general', 'LTL:1>0:piece:hawk-general', 'PBB:0>1:choice']);
    expect([...w.fired]).toEqual(['hawk-general']);
    // Every neighbour hot: the wave cools them all, and the one the force heats ends where it began.
    const all = play(held(quiet(content, 'plain-shl', { SHL: 2, LNK: 1, LTL: 1, PBB: 1 }), ['hawk-general']), 'right');
    expect(changes(all.w)).toEqual(['SHL:2>0:choice', 'PBB:1>0:piece:hawk-general', 'LNK:1>0:piece:hawk-general', 'LTL:1>0:piece:hawk-general', 'PBB:0>1:choice']);
    expect(all.w.danger()).toBe(2);
    // Calm neighbours all round: nothing for the wave to do, the chip stays dark.
    const quietMap = play(held(quiet(content, 'plain-shl', { SHL: 2 }), ['hawk-general']), 'right');
    expect(quietMap.w.fired.has('hawk-general')).toBe(false);
  });

  it('Loyal Admiral: a show of force at sea cools every neighbouring region two steps; not on land', () => {
    // SHL is at sea; PBB, LNK and LTL (west to east) are its neighbours. The Admiral's wave comes first, then
    // the force heats the coolest neighbour (Pebbleby, now calm).
    const sea = play(held(quiet(content, 'plain-shl', { SHL: 2, LNK: 1, PBB: 1, LTL: 3 }), ['loyal-admiral']), 'right');
    expect(changes(sea.w)).toEqual(['SHL:2>0:choice', 'PBB:1>0:piece:loyal-admiral', 'LNK:1>0:piece:loyal-admiral', 'LTL:3>1:piece:loyal-admiral', 'PBB:0>1:choice']);
    // Edda Vale is inland: nothing extra.
    const land = play(held(quiet(content, 'plain-edv', { EDV: 2, VSY: 2 }), ['loyal-admiral']), 'right');
    expect(land.w.fired.has('loyal-admiral')).toBe(false);
    // Vessary is a port whose neighbours include inland Edda Vale: the wave reaches it too.
    const port = play(held(quiet(content, 'plain-vsy', { VSY: 2, EDV: 2, NWK: 2 }), ['loyal-admiral']), 'right');
    expect(port.w.heats.EDV).toBe(0);
    expect(port.w.fired.has('loyal-admiral')).toBe(true);
    // Hawk and Admiral stack: three steps on every neighbour of a sea region.
    const both = play(held(quiet(content, 'plain-shl', { SHL: 2, LTL: 3, LNK: 3 }), ['loyal-admiral', 'hawk-general']), 'right');
    expect(both.w.heats.LTL).toBe(0);
    expect(both.w.heats.LNK).toBe(0);
  });

  it('Spin Doctor: home never heats, from a show of force, a consequence or Peace Movement', () => {
    const s = held(quiet(content, 'plain-nwk', { NWK: 2 }), ['spin-doctor', 'peace-movement']);
    const { w } = play(s, 'right');
    // NWK's neighbours west to east: WNM, FRM (land), VSY (lane, home). The coolest non-home is picked; Edda Vale is absorbed.
    expect(changes(w)).toEqual(['NWK:2>0:choice', 'WNM:0>1:choice']);
    expect(w.steps).toContainEqual({ kind: 'piece', piece: 'spin-doctor', note: 'Edda Vale does not heat' });
  });

  it('Red Lines: the named region calms twice as fast; reaching war there is DANGER +15', () => {
    const fast = withTeam(quiet(content, 'plain-shl', { SHL: 3 }), ['red-lines']);
    fast.redLine = 'SHL';
    const { w } = play(withCard(content, fast, 'plain-shl'), 'left');
    expect(changes(w)).toEqual(['SHL:3>1:choice']);
    expect(w.fired.has('red-lines')).toBe(true);

    const crossed = withTeam(quiet(content, 'lintel-force', { LTL: 2, KLP: 2 }), ['red-lines']);
    crossed.redLine = 'KLP';
    const hit = play(withCard(content, crossed, 'lintel-force'), 'left');
    expect(hit.w.penalty).toBe(15);
    expect(hit.w.steps).toContainEqual(expect.objectContaining({ kind: 'penalty', amount: 15, piece: 'red-lines', region: 'KLP' }));
    expect(hit.w.danger()).toBe(12 + 15);
  });

  it('Launch on Warning: a false alarm on a warned region is +20 (the mark may be today\'s)', () => {
    const base = withTeam(quiet(content, 'alarm-02', { WMS: 2 }), ['launch-on-warning']);
    const falseAlarm = withCard(content, base, 'alarm-02', 0.5, { false: true, known: false });
    const raised = play(falseAlarm, 'right');
    expect(raised.w.penalty).toBe(20);
    expect(raised.w.steps).toContainEqual(expect.objectContaining({ kind: 'penalty', amount: 20, piece: 'launch-on-warning', region: 'WMS' }));
    // Waiting on a false alarm holds, and the region was never warned: no penalty.
    const waited = play(falseAlarm, 'left');
    expect(waited.res.held).toBe(true);
    expect(waited.w.penalty).toBe(0);
    // A real alarm: raising the alert costs nothing extra.
    const real = play(withCard(content, base, 'alarm-02', 0.9, { false: false, known: false }), 'right');
    expect(real.w.penalty).toBe(0);
  });

  it('a warning card\'s wait holds exactly when the alarm is false; the Cautious director\'s mark sets the odds shown', () => {
    const unknown = quiet(content, 'alarm-02', { WMS: 2 });
    const w0 = new Working(unknown);
    expect(effectiveOdds(w0, content.cards['alarm-02'], unknown.card!, actOf(content.cards['alarm-02'], 'left')!)).toBe(70);
    const known = withCard(content, withTeam(unknown, ['cautious-intel']), 'alarm-02', 0.5, { false: false, known: true });
    const a = actOf(content.cards['alarm-02'], 'left')!;
    expect(effectiveOdds(new Working(known), content.cards['alarm-02'], known.card!, a)).toBe(0);
    const miss = play(known, 'left');
    expect(miss.res.held).toBe(false);
    expect(miss.w.steps).toContainEqual({ kind: 'alarm', false: false });
    const knownFalse = withCard(content, withTeam(unknown, ['cautious-intel']), 'alarm-02', 0.9, { false: true, known: true });
    expect(effectiveOdds(new Working(knownFalse), content.cards['alarm-02'], knownFalse.card!, a)).toBe(100);
    expect(play(knownFalse, 'left').res.held).toBe(true);
  });

  it('Cautious Intel Director: every risky choice is ten points more likely to work (capped at 95), and the roll uses those odds', () => {
    const s = held(quiet(content, 'shoal-risky', { SHL: 2 }, 0.75), ['cautious-intel']);
    const a = actOf(content.cards['shoal-risky'], 'left')!;
    expect(effectiveOdds(new Working(s), content.cards['shoal-risky'], s.card!, a)).toBe(80);
    // A roll of 0.75 misses the printed 70% and holds the Cautious 80%.
    const { res, w } = play(s, 'left');
    expect(res.held).toBe(true);
    expect(res.odds).toBe(80);
    expect(w.fired.has('cautious-intel')).toBe(true);
    expect(play(quiet(content, 'shoal-risky', { SHL: 2 }, 0.75), 'left').res.held).toBe(false);
    // Odds stop at 95; a warning card keeps its own odds (the director marks it instead).
    const high = { ...content.cards['shoal-risky'], left: { ...(content.cards['shoal-risky'] as { left: { odds: number } }).left, odds: 90 } };
    expect(effectiveOdds(new Working(s), high as typeof content.cards['shoal-risky'], s.card!, actOf(high as typeof content.cards['shoal-risky'], 'left')!)).toBe(95);
    const alarm = withCard(content, withTeam(quiet(content, 'alarm-02', { WMS: 2 }), ['cautious-intel']), 'alarm-02');
    expect(effectiveOdds(new Working(alarm), content.cards['alarm-02'], alarm.card!, actOf(content.cards['alarm-02'], 'left')!)).toBe(70);
  });
});

describe('the Working', () => {
  it('records DANGER after every heat step and the tipping region at 100', () => {
    const s = withHeats(quiet(content, 'plain-shl'), { NWK: 3, FRM: 3, WMS: 3, WNM: 3, GLM: 3, KLM: 3, KLP: 3, BRK: 2 });
    const w = new Working(s);
    expect(w.danger()).toBe(89);
    w.heat('BRK', 1, 'choice');
    expect(w.danger()).toBe(96);
    expect(w.tipping).toBeNull();
    w.heat('LTL', 2, 'choice');
    expect(w.danger()).toBe(100);
    expect(w.tipping).toBe('LTL');
    const heats = w.steps.filter((x) => x.kind === 'heat');
    expect(heats.map((x) => (x as { danger: number }).danger)).toEqual([96, 100]);
  });
});
