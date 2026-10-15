import { describe, expect, it } from 'vitest';
import type { StaffId } from '../content/staff';
import { STAFF_DEF } from '../content/staff';
import { RULES } from './rules';
import { buy, moveSeat, newGame, nextTurn, reroll, sell, send } from './run';
import { nextShopAfter, shopDue } from './shop';
import { must, pinAll } from './testkit';
import type { GameState } from './types';
import { shopView } from './view';

/** FIRST-WORLD after turn 2 (the first shop), with these seats and coins. */
function firstShop(seats: readonly StaffId[] = [], coins = 8): GameState {
  let s = newGame('FIRST-WORLD');
  s = must(send(pinAll(s, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])));
  s = must(send(pinAll(must(nextTurn(s)), ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
  return { ...s, seats: seats.map((id, i) => ({ uid: 100 + i, id })), coins };
}

describe('the shop', () => {
  it('opens after turns 2, 4, 6 ...', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(shopDue)).toEqual([false, true, false, true, false, true, false, true]);
    expect([1, 2, 3, 9, 10].map(nextShopAfter)).toEqual([2, 2, 4, 10, 10]);
  });

  it("FIRST-WORLD's first shop offers Duty Officer, Quartermaster, Harbourmaster", () => {
    expect(firstShop().shop).toEqual({ visit: 1, offers: ['DUTY', 'QM', 'HARBOUR'], rerollCost: 2 });
  });

  it('never offers a seated staff, and offers 3 different staff', () => {
    let s = firstShop(['DUTY', 'SOVEREIGN', 'HERALD', 'DEPUTY'], 10_000);
    for (let i = 0; i < 60; i++) {
      s = must(reroll(s));
      const offers = s.shop!.offers as StaffId[];
      expect(offers).toHaveLength(3);
      expect(new Set(offers).size).toBe(3);
      for (const id of offers) expect(['DUTY', 'SOVEREIGN', 'HERALD', 'DEPUTY']).not.toContain(id);
    }
  });

  it('hires into the leftmost free seat and marks the hire new', () => {
    const s = must(buy(firstShop(['GOVERNOR']), 0));
    expect(s.seats.map((x) => x.id)).toEqual(['GOVERNOR', 'DUTY']);
    expect(s.coins).toBe(5);
    expect(s.shop!.offers).toEqual([null, 'QM', 'HARBOUR']);
    expect(s.hiredSinceSend).toEqual([s.seats[1].uid]);
    expect(buy(s, 0)).toMatchObject({ ok: false, reason: 'Already hired.' });
    expect(buy(s, 2)).toMatchObject({ ok: false, reason: 'Not enough coins.' });
  });

  it('with a full table, replaces a seat: the old staff sells for half (rounded down) first', () => {
    const full = firstShop(['QM', 'SURVEYOR', 'STRATEGIST', 'GOVERNOR', 'DEPUTY'], 4);
    expect(buy(full, 2)).toMatchObject({ ok: false, reason: 'No free seat. Tap a seat to replace.' });
    expect(buy(full, 2, 0)).toMatchObject({ ok: false, reason: 'Not enough coins.' }); // 4 + 1 < 6
    const s = must(buy(full, 2, 4)); // Deputy sells for 3: 4 + 3 - 6 = 1
    expect(s.seats.map((x) => x.id)).toEqual(['QM', 'SURVEYOR', 'STRATEGIST', 'GOVERNOR', 'HARBOUR']);
    expect(s.coins).toBe(1);
    const view = shopView(full)!;
    expect(view.fullTable).toBe(true);
    expect(view.offers[2].replace!.map((r) => r.affordable)).toEqual([false, true, true, true, true]);
  });

  it('sells for half the price, rounded down, only in the shop', () => {
    const s = must(sell(firstShop(['GOVERNOR', 'DUTY'], 0), 0));
    expect(s.seats.map((x) => x.id)).toEqual(['DUTY']);
    expect(s.coins).toBe(STAFF_DEF.GOVERNOR.sell);
    expect(sell(newGame('X'), 0)).toMatchObject({ ok: false, reason: 'Sell in the shop.' });
    expect(sell(firstShop([]), 0)).toMatchObject({ ok: false, reason: 'No one in that seat.' });
  });

  it('rerolls for ◆2, then ◆3, ◆4, and back to ◆2 at the next visit', () => {
    let s = firstShop([], 20);
    for (const cost of [2, 3, 4]) {
      expect(s.shop!.rerollCost).toBe(cost);
      const before = s.coins;
      s = must(reroll(s));
      expect(s.coins).toBe(before - cost);
    }
    expect(s.shop!.rerollCost).toBe(5);
    s = must(nextTurn(s));
    s = must(send(pinAll(s, [s.deal.crisis])));
    expect(s.phase).toBe('outcome');
    s = must(nextTurn(s));
    s = must(send(pinAll(s, [s.deal.crisis])));
    expect(s.turn).toBe(4);
    expect(s.shop).toMatchObject({ visit: 2, rerollCost: RULES.reroll });
    expect(reroll({ ...s, coins: 1 })).toMatchObject({ ok: false, reason: 'Not enough coins.' });
  });

  it('resets the Old Hand to ×1.0 when it is sold or replaced', () => {
    const grown = { ...firstShop(['OLDHAND', 'DUTY'], 10), oldHandM10: 16 };
    expect(must(sell(grown, 0)).oldHandM10).toBe(10);
    const full = { ...firstShop(['OLDHAND', 'QM', 'SURVEYOR', 'STRATEGIST', 'GOVERNOR'], 10), oldHandM10: 16 };
    expect(must(buy(full, 0, 0)).oldHandM10).toBe(10);
    expect(must(buy(full, 0, 1)).oldHandM10).toBe(16);
  });

  it('moves seats; the others slide aside', () => {
    const s = firstShop(['QM', 'DUTY', 'STRATEGIST']);
    expect(must(moveSeat(s, 0, 2)).seats.map((x) => x.id)).toEqual(['DUTY', 'STRATEGIST', 'QM']);
    expect(must(moveSeat(s, 2, 0)).seats.map((x) => x.id)).toEqual(['STRATEGIST', 'QM', 'DUTY']);
    expect(moveSeat(s, 4, 0)).toMatchObject({ ok: false, reason: 'No one in that seat.' });
  });

  it('shows the cards with their preview lines and the receipt', () => {
    const view = shopView(firstShop())!;
    expect(view.title).toBe('SHOP · NEXT TARGET 140');
    expect(view.offers.map((o) => [o.name, o.priceText, o.preview!.text])).toEqual([
      ['Duty Officer', '◆3', '390 → 702'],
      ['Quartermaster', '◆3', '390 → 590'],
      ['Harbourmaster', '◆6', '390 → 2,343'],
    ]);
    expect(view.offers.every((o) => o.affordable)).toBe(true);
    expect(view.reroll).toEqual({ cost: 2, text: 'REROLL ◆2', enabled: true });
    expect(view.receipt).toEqual({ line: 'LAST TURN · WIN 2 · +◆2', spread: null });
    expect(view.nothingAffordable).toBe(false);
    expect(shopView(firstShop([], 0))!.nothingAffordable).toBe(true);
  });
});
