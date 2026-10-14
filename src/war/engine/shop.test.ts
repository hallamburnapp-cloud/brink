import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng';
import { STAFF_DEF, type StaffId } from '../content/staff';
import {
  buyFolder,
  buyOffer,
  moveSeat,
  newRun,
  nextCrisis,
  pickFromFolder,
  reroll,
  sellPaper,
  sellStaff,
  skipFolder,
  sweep,
} from './run';
import { openBriefing, playbookPool, rollStaff } from './shop';
import { draft } from './draft';
import { must, pinAll, tweak } from './testkit';
import type { Offer, RunState, Shop } from './types';

/** Clear the first crisis of a seed and stand in its Briefing. */
function firstBriefing(seed: string, funds = 30): RunState {
  const s = tweak(newRun(seed), (d) => {
    d.crisis.target = 1n;
  });
  const cleared = must(sweep(pinAll(s, [s.crisis.lit[0]])));
  return tweak(cleared, (d) => {
    d.funds = funds;
  });
}

/** A Briefing whose two offers are exactly these. */
function withOffers(s: RunState, offers: Array<Offer | null>): RunState {
  return tweak(s, (d) => {
    d.shop!.offers = offers;
  });
}

describe('the Briefing', () => {
  it('opens after a clear with 2 offers, a folder and reroll at ◆4', () => {
    const s = firstBriefing('SHOP-1');
    expect(s.phase).toBe('briefing');
    const shop = s.shop!;
    expect(shop.briefing).toBe(1);
    expect(shop.offers).toHaveLength(2);
    expect(shop.rerollCost).toBe(4);
    // The first Briefing always holds a Recruit Folder of 3 different staff.
    expect(shop.folder.kind).toBe('recruit');
    expect(shop.folder.price).toBe(4);
    expect(new Set(shop.folder.contents).size).toBe(3);
  });

  it('never offers seated staff, staff already on the table, or the Sovereign', () => {
    for (let i = 0; i < 60; i++) {
      const s = tweak(firstBriefing(`SHOP-SEATED-${i}`), (d) => {
        d.staff = (['DUTY', 'QM', 'HARBOUR', 'SURVEYOR', 'HOTLINE'] as StaffId[]).map((id, uid) => ({ uid: 100 + uid, id, count: 0 }));
      });
      const d = draft(s);
      d.briefings = 1; // not the first Briefing any more
      openBriefing(d);
      const shop = d.shop!;
      const offered = shop.offers.flatMap((o) => (o?.kind === 'staff' ? [o.id] : []));
      const folder = shop.folder.kind === 'recruit' ? shop.folder.contents : [];
      const all = [...offered, ...folder];
      expect(new Set(all).size).toBe(all.length);
      for (const id of all) {
        expect(['DUTY', 'QM', 'HARBOUR', 'SURVEYOR', 'HOTLINE']).not.toContain(id);
        expect(id).not.toBe('SOVEREIGN');
      }
    }
  });

  it('weights offer types 70 / 15 / 15 and rarities 70 / 25 / 5', () => {
    const kinds = { staff: 0, order: 0, playbook: 0 };
    let s = firstBriefing('SHOP-WEIGHTS', 100_000);
    for (let i = 0; i < 1500; i++) {
      s = must(reroll(tweak(s, (d) => (d.shop!.rerollCost = 0))));
      for (const o of s.shop!.offers) kinds[o!.kind]++;
    }
    const n = 3000;
    expect(kinds.staff / n).toBeGreaterThan(0.64);
    expect(kinds.staff / n).toBeLessThan(0.76);
    expect(kinds.order / n).toBeGreaterThan(0.11);
    expect(kinds.playbook / n).toBeGreaterThan(0.11);

    const rng = new Rng('RARITY');
    const tally = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 20_000; i++) tally[STAFF_DEF[rollStaff(rng, new Set())!].rarity]++;
    expect(tally.common / 20_000).toBeCloseTo(0.7, 1);
    expect(tally.uncommon / 20_000).toBeCloseTo(0.25, 1);
    expect(tally.rare / 20_000).toBeCloseTo(0.05, 1);
    expect(tally.legendary).toBe(0);
  });

  it('falls back to the next rarity down when a rarity is used up', () => {
    const rng = new Rng('FALLBACK');
    const noRares = new Set<StaffId>(['SIGNALS', 'ADMIRAL', 'CHIEF', 'DEPUTY', 'HERALD']);
    for (let i = 0; i < 500; i++) expect(STAFF_DEF[rollStaff(rng, noRares)!].rarity).not.toBe('rare');
    const onlyRares = new Set<StaffId>(['DUTY', 'QM', 'HARBOUR', 'SURVEYOR', 'HOTLINE', 'GOVERNOR', 'TREASURER', 'OLDHAND']);
    // No commons left: a Common roll goes up rather than offering nothing.
    for (let i = 0; i < 200; i++) expect(rollStaff(rng, onlyRares)).not.toBeNull();
  });

  it('buys staff into the leftmost free seat and takes the Funds', () => {
    const s = withOffers(firstBriefing('BUY', 10), [
      { kind: 'staff', id: 'DUTY', price: 3 },
      { kind: 'staff', id: 'HARBOUR', price: 4 },
    ]);
    const a = must(buyOffer(s, 1));
    expect(a.staff.map((x) => x.id)).toEqual(['HARBOUR']);
    expect(a.funds).toBe(6);
    expect(a.shop!.offers[1]).toBeNull();
    expect(buyOffer(a, 1)).toMatchObject({ ok: false, reason: 'Nothing there.' });
    const b = must(buyOffer(a, 0));
    expect(b.staff.map((x) => x.id)).toEqual(['HARBOUR', 'DUTY']);
    expect(b.funds).toBe(3);
  });

  it('refuses without Funds or a free seat or tray slot', () => {
    const poor = withOffers(firstBriefing('POOR', 2), [{ kind: 'staff', id: 'DUTY', price: 3 }, null]);
    expect(buyOffer(poor, 0)).toMatchObject({ ok: false, reason: 'Not enough Funds.' });

    const full = tweak(withOffers(firstBriefing('FULL', 30), [{ kind: 'staff', id: 'ENVOY', price: 7 }, { kind: 'order', id: 'ECHO', price: 3 }]), (d) => {
      d.staff = (['DUTY', 'QM', 'HARBOUR', 'SURVEYOR', 'HOTLINE'] as StaffId[]).map((id, uid) => ({ uid: 100 + uid, id, count: 0 }));
      d.tray = [
        { uid: 200, id: 'FORTIFY' },
        { uid: 201, id: 'RELAY' },
      ];
    });
    expect(buyOffer(full, 0)).toMatchObject({ ok: false, reason: 'No free seat. Sell someone first.' });
    expect(buyOffer(full, 1)).toMatchObject({ ok: false, reason: 'In-tray full. Use or sell a paper first.' });
    const sold = must(sellStaff(full, 2));
    expect(sold.funds).toBe(30 + 2);
    expect(sold.staff.map((x) => x.id)).toEqual(['DUTY', 'QM', 'SURVEYOR', 'HOTLINE']);
    expect(must(buyOffer(sold, 0)).staff.at(-1)!.id).toBe('ENVOY');
    const soldPaper = must(sellPaper(full, 0));
    expect(soldPaper.funds).toBe(31);
    expect(soldPaper.tray.map((p) => p.id)).toEqual(['RELAY']);
    expect(must(buyOffer(soldPaper, 1)).tray.map((p) => p.id)).toEqual(['RELAY', 'ECHO']);
  });

  it('applies a Playbook the moment it is bought', () => {
    const s = withOffers(firstBriefing('BOOK', 10), [{ kind: 'playbook', pattern: 'NETWORK', price: 3 }, null]);
    const after = must(buyOffer(s, 0));
    expect(after.world.levels.NETWORK).toBe(2);
    expect(after.tray).toEqual([]);
    expect(after.funds).toBe(7);
  });

  it('offers secret Playbooks only after that pattern was made this run', () => {
    const s = firstBriefing('SECRET');
    expect(playbookPool(s)).not.toContain('WHOLE_BLOC');
    expect(playbookPool(s)).not.toContain('AROUND_THE_WORLD');
    expect(playbookPool(s)).toHaveLength(9);
    const made = tweak(s, (d) => (d.made.WHOLE_BLOC = 1));
    expect(playbookPool(made)).toContain('WHOLE_BLOC');
    expect(playbookPool(made)).not.toContain('AROUND_THE_WORLD');
    // And never in offers before that.
    let r = tweak(s, (d) => (d.funds = 100_000));
    for (let i = 0; i < 400; i++) {
      r = must(reroll(tweak(r, (d) => (d.shop!.rerollCost = 0))));
      for (const o of r.shop!.offers) if (o?.kind === 'playbook') expect(['WHOLE_BLOC', 'AROUND_THE_WORLD']).not.toContain(o.pattern);
    }
  });

  it('rerolls the two offers at 4, 5, 6 ... and resets the price next Briefing', () => {
    let s = firstBriefing('REROLL', 20);
    const folder = s.shop!.folder;
    s = must(reroll(s));
    expect(s.funds).toBe(16);
    expect(s.shop!.rerollCost).toBe(5);
    s = must(reroll(s));
    expect(s.funds).toBe(11);
    expect(s.shop!.rerollCost).toBe(6);
    expect(s.shop!.folder).toEqual(folder);
    s = must(reroll(s));
    expect(s.funds).toBe(5);
    expect(reroll(s)).toMatchObject({ ok: false, reason: 'Not enough Funds.' });
    // Next Briefing: back to 4.
    s = must(nextCrisis(s));
    s = tweak(s, (d) => (d.crisis.target = 1n));
    s = must(sweep(pinAll(s, [s.crisis.lit[0]])));
    expect(s.shop!.briefing).toBe(2);
    expect(s.shop!.rerollCost).toBe(4);
  });

  it('opens a folder, then picks one card or skips', () => {
    const s = tweak(firstBriefing('FOLDER', 10), (d) => {
      d.shop!.folder = { kind: 'recruit', price: 4, contents: ['HOTLINE', 'QM', 'COURIER'], status: 'sealed' };
    });
    expect(pickFromFolder(s, 0)).toMatchObject({ ok: false, reason: 'Open the folder first.' });
    const open = must(buyFolder(s));
    expect(open.funds).toBe(6);
    expect(open.shop!.folder.status).toBe('open');
    expect(buyFolder(open)).toMatchObject({ ok: false });
    const picked = must(pickFromFolder(open, 2));
    expect(picked.staff.map((x) => x.id)).toEqual(['COURIER']);
    expect(picked.shop!.folder.status).toBe('used');
    const skipped = must(skipFolder(open));
    expect(skipped.staff).toEqual([]);
    expect(skipped.shop!.folder.status).toBe('used');

    const orders = tweak(firstBriefing('FOLDER-2', 10), (d) => {
      d.shop!.folder = { kind: 'orders', price: 4, contents: ['ECHO', 'RETIRE', 'AIRLIFT'], status: 'sealed' };
    });
    const got = must(pickFromFolder(must(buyFolder(orders)), 1));
    expect(got.tray.map((p) => p.id)).toEqual(['RETIRE']);
  });

  it('draws Recruit and Orders folders about 50/50 after the first Briefing', () => {
    let recruit = 0;
    for (let i = 0; i < 300; i++) {
      const d = draft(firstBriefing(`FOLDERS-${i}`));
      d.briefings = 3;
      openBriefing(d);
      if ((d.shop as Shop).folder.kind === 'recruit') recruit++;
    }
    expect(recruit / 300).toBeGreaterThan(0.38);
    expect(recruit / 300).toBeLessThan(0.62);
  });

  it('moves seats: the others slide aside', () => {
    const s = tweak(firstBriefing('SEATS'), (d) => {
      d.staff = (['DUTY', 'QM', 'HARBOUR', 'SURVEYOR'] as StaffId[]).map((id, uid) => ({ uid: 100 + uid, id, count: 0 }));
    });
    expect(must(moveSeat(s, 0, 3)).staff.map((x) => x.id)).toEqual(['QM', 'HARBOUR', 'SURVEYOR', 'DUTY']);
    expect(must(moveSeat(s, 3, 1)).staff.map((x) => x.id)).toEqual(['DUTY', 'SURVEYOR', 'QM', 'HARBOUR']);
    expect(must(moveSeat(s, 3, 1)).staff.map((x) => x.uid)).toEqual([100, 103, 101, 102]);
    expect(moveSeat(s, 4, 0)).toMatchObject({ ok: false, reason: 'That seat is empty.' });
  });

  it('closes the shop when the next crisis is dealt', () => {
    const s = must(nextCrisis(firstBriefing('NEXT')));
    expect(s.phase).toBe('crisis');
    expect(s.shop).toBeNull();
    expect(s.crisis.kind).toBe('STANDOFF');
    expect(s.crisis.target).toBe(450n);
    expect(s.crisis.sweepsLeft).toBe(4);
    expect(buyOffer(s, 0)).toMatchObject({ ok: false, reason: 'The Briefing is closed.' });
  });
});
