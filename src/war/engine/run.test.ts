import { describe, expect, it } from 'vitest';
import type { RegionId } from '../content/map';
import { ADJ, IDS, distance } from './board';
import { hashState, hashTrace } from './hash';
import { RULES } from './rules';
import {
  buy,
  clearPins,
  newGame,
  nextTurn,
  pin,
  send,
  setOwners,
  swap,
  swapProblem,
  togglePin,
  unpin,
} from './run';
import { previewNumber } from './shop';
import { must, ownersFrom, pinAll, position, sendOptions, tapOrder } from './testkit';
import type { GameState } from './types';
import { countOwner, crisisPool, warSpreadTarget } from './world';

/** A deterministic player: the best send (swapping once on a miss), then buys by the card's preview number. */
function step(s: GameState): GameState {
  if (s.phase === 'choose') {
    let best = sendOptions(s)[0];
    if (best.regions === 0 && swapProblem(pinAll(s, tapOrder(best.pins))) === null) {
      s = must(clearPins(must(swap(pinAll(s, tapOrder(best.pins))))));
      best = sendOptions(s)[0];
    }
    return must(send(pinAll(must(clearPins(s)), tapOrder(best.pins))));
  }
  if (s.phase === 'shop') {
    for (;;) {
      let pick: { slot: number; seat?: number; gain: bigint } | null = null;
      s.shop!.offers.forEach((id, slot) => {
        if (!id) return;
        const seats = s.seats.length < RULES.seats ? [undefined] : s.seats.map((_, j) => j);
        for (const seat of seats) {
          const r = buy(s, slot, seat);
          const p = previewNumber(s, slot, seat);
          if (!r.ok || !p) continue;
          const gain = p.after - p.before;
          if (gain > 0n && (!pick || gain > pick.gain)) pick = { slot, seat, gain };
        }
      });
      if (!pick) break;
      const chosen: { slot: number; seat?: number } = pick;
      s = must(buy(s, chosen.slot, chosen.seat));
    }
    return must(nextTurn(s));
  }
  return must(nextTurn(s));
}

function play(seed: string, maxTurns = 60): GameState[] {
  const states = [newGame(seed)];
  let s = states[0];
  while (s.phase !== 'over' && s.turn <= maxTurns) {
    s = step(s);
    states.push(s);
  }
  return states;
}

describe('a new game', () => {
  it('starts with Lantern Key gold, war on 3 joined regions at least 3 joins away, ◆4, turn 1', () => {
    for (const seed of ['A', 'B', 'C', 'W56', 'ZZ-TOP', 'seed 7']) {
      const s = newGame(seed);
      const red = IDS.filter((r) => s.owner[r] === 'red');
      expect(s.owner.LNK).toBe('gold');
      expect(countOwner(s.owner, 'gold')).toBe(1);
      expect(red).toHaveLength(3);
      for (const r of red) expect(distance('LNK', r)).toBeGreaterThanOrEqual(3);
      const joined = red.filter((r) => ADJ[r].some((n) => red.includes(n)));
      expect(joined).toHaveLength(3);
      expect([s.coins, s.seats.length, s.turn, s.phase, s.peakWar]).toEqual([4, 0, 1, 'choose', 3]);
      expect(s.deal.target).toBe(64n);
    }
  });

  it('deals near the crisis: 10 lit, none red, within 3 joins, one touching the crisis', () => {
    for (const seed of ['D1', 'D2', 'D3', 'D4']) {
      for (const s of play(seed)) {
        if (s.phase !== 'choose') continue;
        const d = s.deal;
        const { pool, finalPush } = crisisPool(s.owner);
        expect(pool).toContain(d.crisis);
        expect(d.finalPush).toBe(finalPush);
        expect(d.lit.length).toBeLessThanOrEqual(10);
        expect(d.lit).not.toContain(d.crisis);
        for (const r of [...d.lit, ...d.pile]) {
          expect(s.owner[r]).not.toBe('red');
          expect(distance(d.crisis, r)).toBeLessThanOrEqual(RULES.near);
        }
        const near = IDS.filter((r) => r !== d.crisis && s.owner[r] !== 'red' && distance(d.crisis, r) <= RULES.near);
        expect(d.lit.length + d.pile.length).toBe(near.length);
        if (near.some((r) => ADJ[d.crisis].includes(r))) expect(d.lit.some((r) => ADJ[d.crisis].includes(r))).toBe(true);
      }
    }
  });
});

describe('pinning (the tap and lift rules)', () => {
  const s = newGame('FIRST-WORLD');

  it('pins lit regions and the crisis that touch; up to 5', () => {
    expect(pin(s, 'BRN')).toMatchObject({ ok: false, reason: 'That region is not lit.' });
    const one = must(pin(s, 'SHL'));
    expect(pin(one, 'TRN')).toMatchObject({ ok: false, reason: 'Pin a region that touches your pins.' });
    expect(pin(one, 'SHL')).toMatchObject({ ok: false, reason: 'Already pinned.' });
    expect(pin(one, 'LTL').ok).toBe(true); // across the sea lane
    const five = pinAll(s, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN']);
    expect(pin(five, 'GUL')).toMatchObject({ ok: false, reason: 'Five pins at most.' });
    expect(five.deal.pins).toEqual(['SHL', 'LNK', 'PBB', 'MRM', 'TRN']);
  });

  it('lifting a pin lifts every pin cut off from the earliest remaining pin', () => {
    const four = pinAll(s, ['SHL', 'PBB', 'MRM', 'LNK']);
    expect(must(unpin(four, 'PBB')).deal.pins).toEqual(['SHL', 'LNK']);
    expect(must(togglePin(four, 'SHL')).deal.pins).toEqual(['PBB', 'MRM', 'LNK']);
    expect(unpin(s, 'SHL')).toMatchObject({ ok: false, reason: 'Not pinned.' });
  });

  it('never changes the state it was given', () => {
    const before = hashState(s);
    pinAll(s, ['SHL', 'LNK']);
    must(send(pinAll(s, ['SHL', 'LNK'])));
    expect(hashState(s)).toBe(before);
  });
});

describe('swap', () => {
  it('is switched off on FIRST-WORLD turn 1 and on again on turn 2', () => {
    const t1 = newGame('FIRST-WORLD');
    expect(swap(t1)).toMatchObject({ ok: false, reason: 'Swap opens next turn.' });
    const t2 = must(nextTurn(must(send(pinAll(t1, ['SHL', 'LNK'])))));
    expect(t2.deal.swapLocked).toBe(false);
    expect(swap(t2).ok).toBe(true);
  });

  it('keeps the pins, sends the other lit regions to the bottom of the pile, once a turn', () => {
    const t1 = newGame('FIRST-WORLD');
    const t2 = pinAll(must(nextTurn(must(send(pinAll(t1, ['SHL', 'LNK']))))), ['TRN', 'LNK']);
    const d = t2.deal;
    const after = must(swap(t2));
    const out = d.lit.filter((r) => !d.pins.includes(r));
    expect(after.deal.pins).toEqual(['TRN', 'LNK']);
    expect(after.deal.lit).toEqual(['LNK', ...[...d.pile, ...out].slice(0, out.length)]);
    expect(after.deal.pile).toEqual([...d.pile, ...out].slice(out.length));
    expect(after.deal.opening).toEqual(d.opening);
    expect(swap(after)).toMatchObject({ ok: false, reason: 'One swap a turn.' });
  });
});

describe('the turn loop', () => {
  it('turn 1 resolves to the outcome, turn 2 opens the shop; NEXT TURN deals the next', () => {
    const t1 = newGame('FIRST-WORLD');
    expect(send(t1)).toMatchObject({ ok: false, reason: 'Pin a region first.' });
    expect(nextTurn(t1)).toMatchObject({ ok: false, reason: 'Send first.' });
    const o1 = must(send(pinAll(t1, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])));
    expect(o1.phase).toBe('outcome');
    expect(o1.shop).toBeNull();
    expect(pin(o1, 'SHL')).toMatchObject({ ok: false, reason: 'The turn is over.' });
    const t2 = must(nextTurn(o1));
    expect([t2.turn, t2.phase, t2.deal.target]).toEqual([2, 'choose', 96n]);
    const o2 = must(send(pinAll(t2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
    expect(o2.phase).toBe('shop');
    expect(o2.shop).toMatchObject({ visit: 1, offers: ['DUTY', 'QM', 'HARBOUR'], rerollCost: 2 });
    const t3 = must(nextTurn(o2));
    expect([t3.turn, t3.phase, t3.shop]).toEqual([3, 'choose', null]);
  });

  it('a miss on FIRST-WORLD turn 1 turns Shoal red; turn 2 skips it and tops up from the pile', () => {
    const t1 = newGame('FIRST-WORLD');
    const o1 = must(send(pinAll(t1, ['SHL'])));
    expect(o1.lastSend).toMatchObject({ result: 'miss', regions: 0, lost: { id: 'SHL', from: null } });
    expect(o1.owner.SHL).toBe('red');
    expect(o1.coins).toBe(4);
    const t2 = must(nextTurn(o1));
    expect(t2.deal.crisis).toBe('TRN');
    expect(t2.deal.lit).toEqual(['LNK', 'PBB', 'GUL', 'MRD', 'RMH', 'EDV', 'ASK', 'DRF', 'GLM', 'MRM']);
  });

  it('pays ◆1 per region won and drops a brass pin on the crisis', () => {
    const s = must(send(pinAll(newGame('FIRST-WORLD'), ['SHL', 'LNK', 'PBB', 'MRM'])));
    expect(s.lastSend).toMatchObject({ coinsBefore: 4, coinsAfter: 6, regions: 2, goldBefore: 1, gold: 3 });
    expect(s.brass).toEqual(['SHL']);
    expect(s.lastSend!.won.map((w) => w.path)).toEqual([['SHL'], ['SHL', 'PBB']]);
  });

  it('grows the Old Hand by 0.2 at the end of every turn it is seated', () => {
    const s = position(newGame('OLD'), { seats: ['OLDHAND'], turn: 1 });
    const after = must(send(pinAll(s, [s.deal.crisis])));
    expect(after.oldHandM10).toBe(12);
  });
});

describe('war spreading by itself', () => {
  it('goes to Marram from the FIRST-WORLD start', () => {
    expect(warSpreadTarget(newGame('FIRST-WORLD').owner)).toBe('MRM');
  });

  it('spreads only after turns 3, 6, 9 ..., to the target on the map the outcome left', () => {
    let spreads = 0;
    for (const seed of ['S1', 'S2', 'S3', 'S4']) {
      const states = play(seed);
      for (let i = 1; i < states.length; i++) {
        const r = states[i].lastSend!;
        if (r === states[i - 1].lastSend) continue;
        if (r.turn % 3 !== 0 || r.ending === 'CEASEFIRE') {
          expect(r.spread).toBeNull();
          continue;
        }
        const map = { ...states[i - 1].owner };
        for (const w of r.won) map[w.id] = 'gold';
        if (r.lost) map[r.lost.id] = 'red';
        const expected = countOwner(map, 'red') < RULES.loseAt ? warSpreadTarget(map) : null;
        expect(r.spread?.id ?? null).toBe(expected);
        if (r.spread) spreads++;
      }
    }
    expect(spreads).toBeGreaterThan(4);
  });

  it('after turn 3 it takes the tagged region; not after turn 4', () => {
    const base = newGame('FIRST-WORLD');
    const at3 = position(base, { turn: 3, deal: { crisis: 'SHL', lit: ['LNK'], target: 1n } });
    const s3 = must(send(pinAll(at3, ['SHL'])));
    expect(s3.lastSend!.spread).toEqual({ id: 'MRM', from: 'FLE' });
    expect(s3.owner.MRM).toBe('red');
    const at4 = position(base, { turn: 4, deal: { crisis: 'SHL', lit: ['LNK'], target: 1n } });
    expect(must(send(pinAll(at4, ['SHL']))).lastSend!.spread).toBeNull();
  });

  it('does nothing when war holds nothing or touches no grey', () => {
    expect(warSpreadTarget(ownersFrom(['LNK'], []))).toBeNull();
    const boxed = ownersFrom(IDS.filter((r) => r !== 'NWK'), ['NWK']);
    expect(warSpreadTarget(boxed)).toBeNull();
  });
});

describe('the end of the game', () => {
  const nine: RegionId[] = ['NWK', 'FRM', 'VSY', 'WNM', 'QLN', 'RMH', 'EDV', 'ASK', 'BRN'];

  it('WAR at 10, checked after war spreads by itself', () => {
    const s = position(newGame('END'), {
      owner: ownersFrom(['LNK', 'SHL'], nine),
      turn: 3,
      deal: { crisis: 'PBB', lit: ['LNK'], target: 1n },
    });
    expect(warSpreadTarget(s.owner)).not.toBeNull();
    const after = must(send(pinAll(s, ['PBB'])));
    expect(after.lastSend!.result).toBe('win');
    expect(after.lastSend!.spread).not.toBeNull();
    expect(countOwner(after.owner, 'red')).toBe(10);
    expect([after.ending, after.phase]).toEqual(['WAR', 'over']);
  });

  it('a miss that makes 10 ends it at once (war does not spread past 10)', () => {
    const s = position(newGame('END'), {
      owner: ownersFrom(['LNK'], nine),
      turn: 3,
      deal: { crisis: 'PBB', lit: ['LNK'], target: 10_000n },
    });
    const after = must(send(pinAll(s, ['PBB'])));
    expect(after.lastSend!.spread).toBeNull();
    expect(countOwner(after.owner, 'red')).toBe(10);
    expect(after.ending).toBe('WAR');
  });

  it('WORLD UNITED only at 30 gold: 29 gold and 1 red goes on to the final push', () => {
    const owner = ownersFrom(IDS.filter((r) => r !== 'NWK' && r !== 'QLN'), ['NWK']);
    const s = position(newGame('END'), { owner, turn: 5, deal: { crisis: 'QLN', lit: ['EDV'], target: 5n } });
    const after = must(send(pinAll(s, ['QLN'])));
    expect(after.lastSend!.won.map((w) => w.id)).toEqual(['QLN']);
    expect(countOwner(after.owner, 'gold')).toBe(29);
    expect(after.ending).toBeNull();
    const push = must(nextTurn(after));
    expect(push.deal).toMatchObject({ crisis: 'NWK', finalPush: true });
  });

  it('every game ends, within 25 turns, and plays the same twice (determinism)', () => {
    for (const seed of ['G1', 'G2', 'G3', 'G4', 'G5', 'W56']) {
      const a = play(seed);
      const b = play(seed);
      const end = a[a.length - 1];
      expect(end.ending, seed).not.toBeNull();
      expect(end.turn, seed).toBeLessThanOrEqual(25);
      expect(a.map(hashState)).toEqual(b.map(hashState));
      expect(hashTrace(end.lastSend!.trace)).toBe(hashTrace(b[b.length - 1].lastSend!.trace));
    }
    expect(hashState(play('G1')[5])).not.toBe(hashState(play('G2')[5]));
  });
});

describe('setOwners (the dev hook)', () => {
  it('re-deals the current turn on the new map', () => {
    const s = must(setOwners(newGame('DEV'), { PBB: 'gold', TRN: 'gold' }));
    expect(s.turn).toBe(1);
    expect(countOwner(s.owner, 'gold')).toBe(3);
    expect(crisisPool(s.owner).pool).toContain(s.deal.crisis);
  });

  it('ends the game when the map is all gold or war holds 10', () => {
    expect(must(setOwners(newGame('DEV'), 'G'.repeat(30))).ending).toBe('WORLD UNITED');
    expect(must(setOwners(newGame('DEV'), 'R'.repeat(10) + 'G'.repeat(20))).ending).toBe('WAR');
    expect(setOwners(newGame('DEV'), 'nonsense').ok).toBe(false);
  });
});
