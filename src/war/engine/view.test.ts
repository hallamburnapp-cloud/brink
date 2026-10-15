import { describe, expect, it } from 'vitest';
import { IDS } from './board';
import { newGame, nextTurn, send, setOwners, swap } from './run';
import { must, ownersFrom, pinAll, position, sendOptions, tapOrder } from './testkit';
import type { GameState } from './types';
import {
  actsOn,
  controlsView,
  preview,
  shopView,
  endView,
  goalView,
  mapView,
  menuView,
  readoutView,
  receipt,
  regionViews,
  seatViews,
  sendLabel,
} from './view';

const t1 = newGame('FIRST-WORLD');
const after1 = must(send(pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])));
const t2 = must(nextTurn(after1));

describe('goalView (the Big Board)', () => {
  it('reads GOLD 1/30 and WAR 3/10 from the first second, with the war tag on Marram', () => {
    expect(goalView(t1)).toMatchObject({
      gold: 1,
      red: 3,
      grey: 26,
      goldGoal: 30,
      warLimit: 10,
      warNext: { id: 'MRM', turns: 3 },
      warTag: 'WAR · 3 TURNS',
      finalPush: false,
      after: null,
    });
  });

  it('counts down to the spread: 2 turns on turn 2, THIS TURN on turn 3', () => {
    expect(goalView(t2).warTag).toBe('WAR · 2 TURNS');
    const shop = must(send(pinAll(t2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
    expect(goalView(shop).warNext).toEqual({ id: 'MRM', turns: 1 });
    expect(goalView(must(nextTurn(shop))).warTag).toBe('WAR · THIS TURN');
  });

  it('shows the ghost segments for the current pins', () => {
    expect(goalView(pinAll(t1, ['SHL'])).after).toEqual({ gold: 1, red: 4 });
    expect(goalView(pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM'])).after).toEqual({ gold: 3, red: 3 });
  });
});

describe('the map', () => {
  it('draws the crisis ring, the threads between pins and their scoring order', () => {
    const view = mapView(pinAll(t1, ['SHL', 'LNK', 'PBB']));
    expect(view.crisis).toEqual({ id: 'SHL', target: '64', doubled: true });
    expect(view.joinedPins).toEqual([
      ['PBB', 'LNK'],
      ['PBB', 'SHL'],
      ['LNK', 'SHL'],
    ]);
    expect(view.pinOrder).toEqual({ PBB: 1, LNK: 2, SHL: 3 });
    expect(view.warNext).toEqual({ id: 'MRM', turns: 3 });
    expect(mapView(t1).crisis!.doubled).toBe(false);
    expect(mapView(after1).crisis).toBeNull();
  });

  it('lights the deal and dims the rest; only regions touching a pin can be added', () => {
    const one = regionViews(pinAll(t1, ['SHL']));
    expect(one.SHL).toMatchObject({ lit: true, pinned: true, addable: false, owner: 'grey', port: true });
    expect(one.LNK).toMatchObject({ lit: true, addable: true, joinable: true, owner: 'gold', capital: true });
    expect(one.LTL).toMatchObject({ addable: true, joinable: true });
    expect(one.TRN).toMatchObject({ lit: true, addable: false, joinable: false });
    expect(one.BRN).toMatchObject({ lit: false, addable: false });
    expect(one.DNM.owner).toBe('red');
    const none = regionViews(t1);
    expect(none.TRN).toMatchObject({ addable: true, joinable: false });
    // Between turns the map shows the plain world: nothing lit, nothing pinnable.
    expect(IDS.filter((r) => regionViews(after1)[r].lit || regionViews(after1)[r].addable)).toHaveLength(0);
  });

  it('previews the outcome: numbered wins, or the crisis hatched red', () => {
    const miss = regionViews(pinAll(t1, ['SHL']));
    expect(miss.SHL.preview).toEqual({ kind: 'war', order: 1 });
    const win = regionViews(pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM']));
    expect(win.SHL.preview).toEqual({ kind: 'win', order: 1 });
    expect(win.PBB.preview).toEqual({ kind: 'win', order: 2 });
    expect(IDS.filter((r) => win[r].preview)).toHaveLength(2);
    expect(regionViews(after1).SHL).toMatchObject({ owner: 'gold', brass: true, preview: null });
  });

  it('knows where a staff acts', () => {
    expect(actsOn(t1, 'GOVERNOR')).toEqual(['LNK']);
    expect(actsOn(t1, 'HARBOUR')).toHaveLength(18);
    expect(actsOn(t1, 'SOVEREIGN')).toHaveLength(5);
    expect(actsOn(t1, 'QM')).toEqual([]);
  });
});

describe('the readout, the SEND label and the controls', () => {
  it('says what the turn needs and what the pins will do', () => {
    expect(readoutView(t1)).toMatchObject({ targetText: '64', line: 'NEED 64', points: 0n, m10: 0n, regions: 0 });
    expect(sendLabel(t1)).toEqual({ text: 'PIN A REGION', tone: 'off', enabled: false, regions: 0 });
    const shoal = pinAll(t1, ['SHL']);
    expect(readoutView(shoal)).toMatchObject({ line: 'NEED 64', pointsText: '7', multiplierText: '2.0', score: 14n });
    expect(sendLabel(shoal)).toEqual({ text: 'MISS · SHORT BY 50', tone: 'miss', enabled: true, regions: 0 });
    const two = pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM']);
    expect(readoutView(two)).toMatchObject({ line: 'NEXT REGION AT 1,024', pointsText: '33', multiplierText: '8.0' });
    expect(sendLabel(two)).toMatchObject({ text: 'WINS 2 REGIONS', tone: 'win' });
    expect(sendLabel(pinAll(t1, ['SHL', 'LNK']))).toMatchObject({ text: 'WINS 1 REGION', regions: 1 });
    expect(sendLabel(after1).text).toBe('');
  });

  it('never promises more regions than are left: the last one says UNITES THE WORLD', () => {
    // One red region left in the final push; the best send is worth two on the ladder.
    const push = must(setOwners(newGame('E2E-END'), 'G'.repeat(29) + 'R'));
    const best = pinAll(push, tapOrder(sendOptions(push)[0].pins));
    expect(preview(best)).toMatchObject({ regions: 1, wins: [push.deal.crisis], unites: true });
    expect(sendLabel(best)).toMatchObject({ text: 'WINS 1 REGION', regions: 1 });
    expect(readoutView(best)).toMatchObject({ line: 'UNITES THE WORLD', nearNext: false });
    expect(must(send(best)).lastSend!.regions).toBe(1);
  });

  it('flags a score close below the next mark', () => {
    // Turn 2: 380 is 4 short of the next region at 384.
    expect(readoutView(pinAll(t2, ['TRN', 'MRD', 'EDV', 'LNK', 'PBB'])).nearNext).toBe(true);
    expect(readoutView(pinAll(t2, ['TRN', 'LNK'])).nearNext).toBe(false);
  });

  it('labels SWAP and the coins', () => {
    expect(controlsView(t1).swap).toEqual({ enabled: false, sub: 'next turn', reason: 'Swap opens next turn.' });
    expect(controlsView(t2).swap).toMatchObject({ enabled: true, sub: '1 left' });
    expect(controlsView(must(swap(t2))).swap).toMatchObject({ enabled: false, sub: 'used' });
    // An empty pile: SWAP is refused and says so instead of '1 left'.
    expect(controlsView({ ...t2, deal: { ...t2.deal, pile: [] } }).swap).toMatchObject({ enabled: false, sub: 'none left' });
    expect(controlsView(t1).coinsText).toBe('◆ 4');
  });
});

describe('the staff rail', () => {
  it('shows live chips, what the Deputy copies and the Herald on two lines', () => {
    const crown = newGame('CROWN', { demo: 'crown' });
    const seats = seatViews(crown);
    expect(seats.map((x) => x.chip)).toEqual(['+4', 'COPY', '×2 CAPITAL', '×1.5 PORT', 'ALL PINS ★ ⚓']);
    expect(seats[1]).toMatchObject({ copies: 'SOVEREIGN', chipLines: ['COPY', '→ Sovereign'], tone: 'multiplier' });
    expect(seats[4].chipLines).toEqual(['ALL PINS', '★ ⚓']);
    expect(seats[0]).toMatchObject({ name: 'Duty Officer', sellText: 'SELL ◆1', isNew: false });
    const surveyor = position(crown, { seats: ['SURVEYOR', 'QM', 'OLDHAND'], oldHandM10: 14 });
    expect(seatViews(surveyor).map((x) => [x.chip, x.tone])).toEqual([
      ['+7', 'multiplier'],
      ['+20', 'points'],
      ['×1.4', 'multiplier'],
    ]);
  });
});

describe('the end card', () => {
  it('WORLD UNITED: three stars, the turn and war at its peak', () => {
    const won = must(setOwners(t1, 'G'.repeat(30)));
    expect(endView(won)).toMatchObject({
      ending: 'WORLD UNITED',
      stars: 3,
      title: 'WORLD UNITED · 30 of 30',
      lines: ['Turn 1 · war peaked at 3'],
      gold: 30,
    });
    expect(endView(t1)).toBeNull();
  });

  it('CEASEFIRE: two stars at 25-29, one at 21-24', () => {
    const map = ownersFrom(IDS.slice(0, 23), IDS.slice(23));
    const push = position(t1, {
      owner: map,
      turn: 20,
      deal: { crisis: IDS[23], lit: [], target: 1_000_000n, finalPush: true },
    });
    const s = must(send(pinAll(push, [IDS[23]])));
    expect(endView(s)).toMatchObject({
      ending: 'CEASEFIRE',
      stars: 1,
      title: 'CEASEFIRE · 23 of 30 gold',
      lines: ['War held 7 regions when it stopped.'],
    });
    expect(receipt(s)!.line).toBe('LAST TURN · MISS · CEASEFIRE');
  });

  it('WAR: what war took, and the grey regions short of the final push', () => {
    const lost = must(setOwners(t1, 'R'.repeat(10) + 'G'.repeat(18) + '..'));
    expect(endView(lost)).toMatchObject({
      ending: 'WAR',
      stars: 0,
      title: 'WAR',
      lines: ['War took 10 regions. You held 18 of 30.', '2 grey regions from the final push.'],
      nearMiss: IDS.slice(28),
    });
    // Lost on the last grey region: no '0 grey regions' line.
    const none = must(setOwners(t1, 'R'.repeat(10) + 'G'.repeat(20)));
    expect(endView(none)).toMatchObject({ lines: ['War took 10 regions. You held 20 of 30.'], nearMiss: [] });
  });

  it('keeps as best send the biggest win: a later miss never takes its place', () => {
    const a = must(send(pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM']))); // 264 on 64: a win
    // A later turn with a target of 1,600: 380 outscores 264 but misses.
    const lit = [...t1.deal.lit.filter((r) => r !== 'TRN'), 'SHL'];
    const late = position(must(nextTurn(a)), { turn: 9, deal: { crisis: 'TRN', lit, target: 1600n } });
    const b = must(send(pinAll(late, ['TRN', 'LNK', 'PBB', 'SHL', 'MRM'])));
    expect(b.lastSend).toMatchObject({ score: 380n, result: 'miss' });
    expect(b.best).toMatchObject({ score: 264n, target: 64n, turn: 1 });
    // A bigger win does take its place.
    const c = must(send(pinAll(must(nextTurn(a)), ['TRN', 'LNK', 'PBB', 'SHL', 'GUL']))); // 310 on 96
    expect(c.best).toMatchObject({ score: 310n, turn: 2 });
  });

  it('prints the best send against its target and the biggest turn', () => {
    const crown = must(send(pinAll(newGame('CROWN', { demo: 'crown' }), ['LTL', 'TLM', 'ORN', 'FLE', 'MRM'])));
    const ended = must(setOwners(crown, 'G'.repeat(30)));
    expect(endView(ended)!.best!.text).toBe('5,598,720 · 466x the target');
    expect(endView(ended)!.biggestTurn).toEqual({ regions: 7, text: '7 regions' });
    expect(endView(ended)!.staff).toEqual(['DUTY', 'DEPUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD']);
  });
});

describe('the menu and the receipt', () => {
  it('says the turn and when the next shop opens', () => {
    expect(menuView(t1).line).toBe('Turn 1 · next shop after turn 2');
    expect(menuView(after1).line).toBe('Turn 1 · next shop after turn 2');
    const t9 = position(t1, { turn: 9, deal: { crisis: 'SHL', lit: ['LNK'] } });
    expect(menuView(t9).line).toBe('Turn 9 · next shop after turn 10');
  });

  it('writes the receipt for a miss and for war spreading', () => {
    expect(receipt(must(send(pinAll(t1, ['SHL']))))).toEqual({ line: 'LAST TURN · MISS · WAR TOOK SHOAL', spread: null });
    const at3 = position(t1, { turn: 3, deal: { crisis: 'SHL', lit: ['LNK'], target: 1n } });
    expect(receipt(must(send(pinAll(at3, ['SHL']))))!.spread).toBe('WAR SPREAD TO MARRAM');
  });
});

describe('every view, every phase', () => {
  it('reads a whole game without throwing, and each view appears in its phase only', () => {
    const seen = new Set<string>();
    for (const seed of ['V1', 'V2', 'CROWN']) {
      let s: GameState = seed === 'CROWN' ? newGame(seed, { demo: 'crown' }) : newGame(seed);
      for (let guard = 0; guard < 80; guard++) {
        seen.add(s.phase);
        const views = [goalView(s), mapView(s), readoutView(s), sendLabel(s), controlsView(s), seatViews(s), menuView(s)];
        expect(views.every((v) => v !== undefined)).toBe(true);
        expect(shopView(s) !== null).toBe(s.phase === 'shop');
        expect(endView(s) !== null).toBe(s.phase === 'over');
        expect(mapView(s).crisis !== null).toBe(s.phase === 'choose');
        if (s.phase === 'over') break;
        if (s.phase === 'choose') {
          const best = sendOptions(s)[0];
          s = pinAll(s, tapOrder(best.pins));
          expect(preview(s)!.score).toBe(best.score);
          s = must(send(s));
        } else {
          s = must(nextTurn(s));
        }
      }
      expect(s.phase).toBe('over');
    }
    expect([...seen].sort()).toEqual(['choose', 'outcome', 'over', 'shop']);
  });

  it('the CROWN plays on: Quillon flares next; with no grey left, the final push', () => {
    const shop = must(send(pinAll(newGame('CROWN', { demo: 'crown' }), ['LTL', 'TLM', 'ORN', 'FLE', 'MRM'])));
    expect(shop.phase).toBe('shop');
    const t15 = must(nextTurn(shop));
    expect([t15.turn, t15.deal.crisis, t15.deal.finalPush]).toEqual([15, 'QLN', false]);
    const best = must(send(pinAll(t15, tapOrder(sendOptions(t15)[0].pins))));
    expect(best.ending).toBe('WORLD UNITED');
    const missed = must(send(pinAll(t15, ['QLN'])));
    expect(missed.owner.QLN).toBe('red');
    const push = must(nextTurn(missed));
    expect(push.deal.finalPush).toBe(true);
    expect(['NWK', 'QLN']).toContain(push.deal.crisis);
    expect(goalView(push).finalPush).toBe(true);
    expect(sendLabel(pinAll(push, [push.deal.crisis])).text).toBe('MISS · CEASEFIRE');
  });
});
