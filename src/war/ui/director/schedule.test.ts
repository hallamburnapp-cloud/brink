import { describe, expect, it } from 'vitest';
import {
  buy,
  CROWN,
  CROWN_SEED,
  FIRST_WORLD_SEED,
  must,
  newGame,
  nextTurn,
  ownersFrom,
  pinAll,
  position,
  send,
  sendOptions,
  type GameState,
  type RegionId,
  type SendRecord,
  type StaffId,
} from '../../engine';
import {
  beatsOf,
  BRISK_PLATE_HOLD_MS,
  CEASEFIRE_BUZZ,
  CALM_GAP_MS,
  CATCH_MS,
  COLLAPSE_MS,
  CASCADE_CAP_MS,
  eventDuration,
  HOLD_AFTER_MULT_MS,
  isBrisk,
  multPitch,
  multWeight,
  outcomeSchedule,
  PLATE_HOLD_MS,
  ratio,
  REDUCED_BUDGET,
  REDUCED_OUTCOME_BUDGET,
  RISER_MS,
  RISER_SLACK_MS,
  sendSchedule,
  shakeFor,
  SHOP_HOLD_MS,
  SHOWCASE_AT,
  SHOWCASE_HOLD_MS,
  showcaseLine,
  sizeOf,
  slamIntensity,
  SLIDE_MS,
  tickIntensity,
  thinSounds,
  TO_RING_MS,
  UNITED_BUZZ,
  UNITED_HOLD_MS,
  WAR_ENDING_BUZZ,
  WIN_CAP_MS,
  type Cue,
  type OutcomeCue,
} from './schedule';

// ---------------------------------------------------------------- positions

function sent(s: GameState, pins: readonly RegionId[]): { prev: GameState; next: GameState; rec: SendRecord } {
  const prev = pinAll(s, pins);
  const next = must(send(prev));
  return { prev, next, rec: next.lastSend! };
}

const firstWorld = () => sent(newGame(FIRST_WORLD_SEED), ['SHL', 'LNK', 'PBB', 'MRM']);
const crown = () => sent(newGame(CROWN_SEED, { demo: 'crown' }), CROWN.pins);
const firstMiss = () => sent(newGame(FIRST_WORLD_SEED), ['SHL']);

// Example 2's map (SPEC section 6, seed W56, turn 11).
const EX2_GOLD: RegionId[] = ['BRK', 'DRF', 'FLE', 'FRM', 'GLM', 'GUL', 'HRT', 'KLM', 'KLP', 'LNK', 'MRD', 'MRM', 'ORN', 'PBB', 'RMH', 'SHL', 'SLW', 'TLM', 'TRN', 'WMS', 'WNM'];
const EX2_RED: RegionId[] = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY'];
const EX2_LIT: RegionId[] = ['LNK', 'DNM', 'MRM', 'GUL', 'PBB', 'TLM', 'FLE', 'ORN', 'DRF', 'WMS'];
const EX2_SEATS: StaffId[] = ['QM', 'DUTY', 'STRATEGIST', 'GOVERNOR', 'HARBOUR'];

function ex2(owner = ownersFrom(EX2_GOLD, EX2_RED), target?: bigint, finalPush = false, crisis: RegionId = 'LTL', lit = EX2_LIT): GameState {
  return position(newGame('EX2'), { owner, seats: EX2_SEATS, turn: 11, deal: { crisis, lit, target: target ?? 3_700n, finalPush } });
}
const example2 = () => sent(ex2(), ['LTL', 'TLM', 'ORN', 'FLE', 'MRM']);

function cascade(rec: SendRecord, opts: { reduced?: boolean; rate?: number; newSeats?: Set<number>; brisk?: boolean } = {}) {
  return sendSchedule({
    trace: rec.trace,
    score: rec.score,
    target: rec.target,
    win: rec.result === 'win',
    newSeats: opts.newSeats,
    reduced: !!opts.reduced,
    rate: opts.rate ?? 1,
    brisk: opts.brisk,
  });
}

/** No sound repeats closer than `gap` ms to itself. */
function spaced(cues: readonly (Cue | OutcomeCue)[], gap: number): boolean {
  const last = new Map<string, number>();
  for (const c of cues) {
    if (c.do !== 'sound') continue;
    const at = last.get(c.sfx);
    if (at !== undefined && c.t - at < gap) return false;
    last.set(c.sfx, c.t);
  }
  return true;
}

function outcomeInput(rec: SendRecord, opts: { reduced?: boolean; riserPlayed?: boolean } = {}) {
  return {
    crisis: rec.crisis,
    result: rec.result,
    won: rec.won,
    lost: rec.lost,
    spread: rec.spread,
    ending: rec.ending,
    coinsBefore: rec.coinsBefore,
    goldBefore: rec.goldBefore,
    redBefore: rec.redBefore,
    reduced: !!opts.reduced,
    riserPlayed: opts.riserPlayed ?? true,
  };
}

function outcome(rec: SendRecord, opts: { reduced?: boolean; riserPlayed?: boolean } = {}) {
  return outcomeSchedule(outcomeInput(rec, opts));
}

const of = <K extends Cue['do']>(cues: readonly Cue[], kind: K) => cues.filter((c): c is Extract<Cue, { do: K }> => c.do === kind);
const out = <K extends OutcomeCue['do']>(cues: readonly OutcomeCue[], kind: K) => cues.filter((c): c is Extract<OutcomeCue, { do: K }> => c.do === kind);
const sounds = (cues: readonly (Cue | OutcomeCue)[], sfx: string) => cues.filter((c) => c.do === 'sound' && c.sfx === sfx);
const isSorted = (cues: readonly { t: number }[]) => cues.every((c, i) => i === 0 || cues[i - 1].t <= c.t);

// ---------------------------------------------------------------- sizes and pitches

describe('durations, sizes and pitches', () => {
  it('gives the k-th pin max(120, round(320 x 0.94^k)) ms', () => {
    expect([0, 1, 2, 3, 4].map(eventDuration)).toEqual([320, 301, 283, 266, 250]);
    expect(eventDuration(12)).toBe(60);
  });

  it('sizes the slam by score ÷ target', () => {
    expect(ratio(264n, 64n)).toBeCloseTo(4.125, 4);
    expect(ratio(5_598_720n, 12_000n)).toBeCloseTo(466.56, 2);
    expect([0.2, 0.5, 4.1, 22.4, 466].map(shakeFor)).toEqual([0, 2, 5, 9, 9]);
    expect(slamIntensity(264n, 4.125)).toBeGreaterThan(slamIntensity(14n, 0.22));
    expect(slamIntensity(5_598_720n, 466)).toBeGreaterThan(slamIntensity(264n, 4.125));
    // A miss keeps its plain size: no flourish.
    expect(slamIntensity(14n, 0.22, true)).toBeCloseTo(sizeOf(14n), 6);
  });

  it('climbs a pentatonic over the pins and a semitone a multiplier', () => {
    const four = [0, 1, 2, 3].map((k) => tickIntensity(k, 4));
    for (let i = 1; i < 4; i++) expect(four[i]).toBeGreaterThan(four[i - 1]);
    expect(multPitch(1)).toBeGreaterThan(multPitch(0));
    expect([multWeight(15), multWeight(20), multWeight(30)]).toEqual([0.9, 1, 1.2]);
  });

  it('groups a per-region staff’s pops into one beat', () => {
    const beats = beatsOf(crown().rec.trace);
    expect(beats.map((b) => (b.kind === 'pops' ? `pops${b.seat}x${b.e.length}` : b.kind))).toEqual([
      'pin',
      'pin',
      'pin',
      'pin',
      'pin',
      'staff',
      'pops1x5',
      'pops2x5',
      'pops3x5',
      'crisis',
    ]);
  });
});

// ---------------------------------------------------------------- FIRST-WORLD turn 1

describe('FIRST-WORLD turn 1: 264, WIN 2', () => {
  const { rec } = firstWorld();
  const s = cascade(rec);

  it('dims, then scans the pins west to east, each flinging +n into POINTS and +1 into MULTIPLIER', () => {
    expect(rec.score).toBe(264n);
    expect(of(s.cues, 'dim')[0].t).toBe(0);
    expect(of(s.cues, 'scan').map((c) => [c.region, c.t])).toEqual([
      ['PBB', 450],
      ['MRM', 770],
      ['LNK', 1071],
      ['SHL', 1354],
    ]);
    const flies = of(s.cues, 'fly');
    expect(flies.filter((c) => c.look === 'pin').map((c) => c.text)).toEqual(['+6', '+10', '+10', '+7']);
    expect(flies.filter((c) => c.look === 'one').map((c) => c.text)).toEqual(['+1', '+1', '+1', '+1']);
    expect(of(s.cues, 'land').filter((c) => c.box === 'points').map((c) => c.value)).toEqual([6n, 16n, 26n, 33n]);
    expect(of(s.cues, 'land').filter((c) => c.box === 'mult').map((c) => c.value)).toEqual([10n, 20n, 30n, 40n, 80n]);
    expect(isSorted(s.cues)).toBe(true);
  });

  it('stamps the ring’s ×2 and flies it from the ring’s chip', () => {
    const stamp = of(s.cues, 'ringStamp');
    expect(stamp).toHaveLength(1);
    const x2 = of(s.cues, 'fly').find((c) => c.look === 'crisis')!;
    expect(x2).toMatchObject({ t: stamp[0].t, text: '×2', box: 'mult', from: { ringChip: 'SHL' } });
    expect(sounds(s.cues, 'stamp').map((c) => c.t)).toEqual([stamp[0].t]);
  });

  it('holds its breath, slams (5 px for 4.1x), then flies the score into the ring', () => {
    const lastLand = Math.max(...of(s.cues, 'land').map((c) => c.t));
    expect(s.slamAt - lastLand).toBeGreaterThanOrEqual(HOLD_AFTER_MULT_MS);
    expect(s.hitAt).toBe(s.slamAt + SLIDE_MS);
    expect(of(s.cues, 'breath')).toHaveLength(1);
    expect(of(s.cues, 'shake').filter((c) => c.t === s.hitAt).map((c) => c.px)).toEqual([5]);
    expect(of(s.cues, 'showcase')).toHaveLength(0);
    const toRing = of(s.cues, 'toRing')[0];
    expect(toRing).toMatchObject({ t: s.hitAt + PLATE_HOLD_MS, from: 'plate', ms: TO_RING_MS });
    expect(of(s.cues, 'landed')[0].t).toBe(toRing.t + TO_RING_MS);
    // The ring catches the score and holds a beat before the outcome collapses it.
    expect(s.end).toBe(toRing.t + TO_RING_MS + CATCH_MS);
  });

  it('runs about 3.3 s to the ring, and the whole turn about 5 s', () => {
    expect(s.end).toBeGreaterThan(3000);
    expect(s.end).toBeLessThan(3600);
    const o = outcome(rec);
    expect(s.end + o.end).toBeGreaterThan(4500);
    expect(s.end + o.end).toBeLessThan(5500);
  });

  it('collapses the ring, floods Shoal, then pulses to Pebbleby and floods it, a coin each', () => {
    const o = outcome(rec);
    expect(out(o.cues, 'collapse')[0]).toMatchObject({ t: 0, ms: COLLAPSE_MS });
    expect(out(o.cues, 'shockwave')[0]).toMatchObject({ t: COLLAPSE_MS, region: 'SHL' });
    expect(out(o.cues, 'claim').map((c) => [c.region, c.from, c.t, c.ms, c.gold, c.red])).toEqual([
      ['SHL', 'SHL', 300, 600, 2, 3],
      ['PBB', 'SHL', 1150, 400, 3, 3],
    ]);
    expect(out(o.cues, 'travel')).toEqual([{ t: 1000, do: 'travel', path: ['SHL', 'PBB'], stepMs: 150, colour: 'gold' }]);
    expect(out(o.cues, 'coins').map((c) => c.coins)).toEqual([5, 6]);
    expect(out(o.cues, 'coin').map((c) => c.region)).toEqual(['SHL', 'PBB']);
    // No war this turn, no ending: the tag settles once the regions have changed hands.
    expect(out(o.cues, 'take')).toHaveLength(0);
    expect(out(o.cues, 'tag')).toHaveLength(1);
    expect(o.end - o.settled).toBe(150);
    expect(o.settled).toBe(1550);
    // Then the table clears: the result holds on the plain map.
    expect(out(o.cues, 'clear').map((c) => c.t)).toEqual([o.settled]);
  });

  it('starts the claim chord so that it lands on Shoal’s gold ink at 1x and 2x; at 4x a quick chord plays', () => {
    for (const rate of [1, 2]) {
      const r = cascade(rec, { rate });
      expect(r.riserAt).not.toBeNull();
      expect(r.riserAt!).toBeGreaterThanOrEqual(r.hitAt);
      // Real time from the riser to the ink is the riser's own length (the chord at most 80 ms late).
      const late = RISER_MS - (r.end + COLLAPSE_MS - r.riserAt!) / rate;
      expect(late).toBeGreaterThanOrEqual(0);
      expect(late).toBeLessThanOrEqual(RISER_SLACK_MS);
    }
    expect(cascade(rec, { rate: 4 }).riserAt).toBeNull();
    expect(sounds(outcome(rec, { riserPlayed: false }).cues, 'roll_success').map((c) => c.t)).toEqual([COLLAPSE_MS]);
    expect(sounds(outcome(rec, { riserPlayed: true }).cues, 'roll_success')).toHaveLength(0);
  });

  it('plays the same schedule at 2x and 4x in half and a quarter of the time', () => {
    for (const rate of [2, 4]) {
      const r = cascade(rec, { rate });
      expect(r.end).toBe(s.end);
      expect(r.end / rate).toBeCloseTo(s.end / rate, 6);
    }
    expect(s.end / 4).toBeLessThan(900);
  });

  it('fits in 1.2 s with reduced motion, flying nothing, with one pin note, one multiplier note and the slam', () => {
    const r = cascade(rec, { reduced: true });
    const o = outcome(rec, { reduced: true, riserPlayed: false });
    expect(r.end).toBeLessThanOrEqual(REDUCED_BUDGET);
    expect(r.end + o.end).toBeLessThanOrEqual(1200);
    expect(of(r.cues, 'fly')).toHaveLength(0);
    expect(of(r.cues, 'shake')).toHaveLength(0);
    expect(of(r.cues, 'toRing')).toHaveLength(0);
    expect(sounds(r.cues.filter((c) => c.t < r.hitAt), 'tally_tick')).toHaveLength(1);
    expect(sounds(r.cues, 'tally_mult')).toHaveLength(1);
    // The one multiplier note is the climb's top pitch.
    const top = Math.max(...sounds(s.cues, 'tally_mult').map((c) => (c as { intensity: number }).intensity));
    expect(sounds(r.cues, 'tally_mult')[0]).toMatchObject({ intensity: top });
    expect(sounds(r.cues, 'tally_slam')).toHaveLength(1);
    expect(spaced(r.cues, CALM_GAP_MS)).toBe(true);
    expect(spaced(o.cues, CALM_GAP_MS)).toBe(true);
    expect(out(o.cues, 'claim')).toHaveLength(2);
    expect(out(o.cues, 'travel')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- Example 2

describe('Example 2: 82,884, WIN 3 (22x the target)', () => {
  const { rec, prev } = example2();
  const s = cascade(rec);

  it('scores 82,884 and lands every multiplier in order', () => {
    expect(rec.score).toBe(82_884n);
    expect(rec.won.map((w) => w.id)).toEqual(['LTL', 'DNM', 'BRN']);
    const mults = of(s.cues, 'land').filter((c) => c.box === 'mult').map((c) => c.value);
    for (let i = 1; i < mults.length; i++) expect(mults[i] >= mults[i - 1]).toBe(true);
    expect(mults[mults.length - 1]).toBe(13_814n);
  });

  it('hops each staff in seat order and pops ×1.5 off each matching region, 150 ms apart', () => {
    expect([...new Set(of(s.cues, 'hop').map((c) => c.seat))]).toEqual([0, 1, 2, 3, 4]);
    const pops = of(s.cues, 'fly').filter((c) => c.look === 'pop');
    expect(pops.map((c) => ('region' in c.from ? c.from.region : ''))).toEqual(['MRM', 'FLE', 'TLM', 'ORN', 'MRM', 'LTL', 'FLE', 'ORN']);
    expect(pops.every((c) => c.text === '×1.5')).toBe(true);
    expect(pops[1].t - pops[0].t).toBe(150);
    // Each pop flashes its region and shudders the room when its × lands.
    for (const p of pops) expect(of(s.cues, 'flash').some((f) => f.t === p.t)).toBe(true);
    const shudders = of(s.cues, 'shake').filter((c) => c.t < s.slamAt);
    expect(shudders.length).toBeGreaterThanOrEqual(8);
    expect(shudders.every((c) => c.t <= s.slamAt - 300)).toBe(true);
  });

  it('flies the points adders into POINTS and the rest into MULTIPLIER', () => {
    const staff = of(s.cues, 'fly').filter((c) => c.look === 'staff');
    expect(staff.map((c) => [c.text, c.box])).toEqual([
      ['+20', 'points'],
      ['+4', 'mult'],
      ['×3', 'mult'],
    ]);
    expect(prev.seats.map((x) => x.id)).toEqual(EX2_SEATS);
  });

  it('slams with the full 9 px, the gold bloom and the showcase, which flies into the ring', () => {
    expect(s.r).toBeCloseTo(22.4, 1);
    expect(of(s.cues, 'shake').filter((c) => c.t === s.hitAt).map((c) => c.px)).toEqual([9]);
    expect(of(s.cues, 'bloom')).toHaveLength(1);
    expect(of(s.cues, 'showcase')).toHaveLength(1);
    expect(of(s.cues, 'toRing')[0]).toMatchObject({ t: s.hitAt + SHOWCASE_HOLD_MS, from: 'showcase' });
  });

  it('wins Lintel, Dunmarrow, then Brindle Coast back from war four joins away', () => {
    const o = outcome(rec);
    const claims = out(o.cues, 'claim');
    expect(claims.map((c) => [c.region, c.wasRed, c.gold, c.red])).toEqual([
      ['LTL', false, 22, 5],
      ['DNM', false, 23, 5],
      ['BRN', true, 24, 4],
    ]);
    const brindle = out(o.cues, 'travel').find((c) => c.path[c.path.length - 1] === 'BRN')!;
    expect(brindle.path[0]).toBe('LTL');
    // A long chain travels quicker (at most 450 ms), so the next region keeps its 0.5 s slot.
    expect(brindle.stepMs * (brindle.path.length - 1)).toBeLessThanOrEqual(450);
    // Won back from war: a deeper chord under its note.
    expect(sounds(o.cues, 'tally_slam').map((c) => c.t)).toEqual([claims[2].t]);
  });

  it('keeps the cascade and the outcome under 8 s and 5 s', () => {
    expect(s.end).toBeLessThan(CASCADE_CAP_MS);
    expect(outcome(rec).settled).toBeLessThanOrEqual(WIN_CAP_MS);
  });
});

// ---------------------------------------------------------------- the CROWN

describe('the CROWN: 5,598,720, WIN 7 (466x)', () => {
  const { rec } = crown();
  const s = cascade(rec);

  it('pops ×2 fifteen times and lands the multiplier at 139,968.0', () => {
    expect(rec.score).toBe(5_598_720n);
    expect(of(s.cues, 'fly').filter((c) => c.look === 'pop')).toHaveLength(15);
    expect(of(s.cues, 'land').filter((c) => c.box === 'mult').at(-1)!.value).toBe(1_399_680n);
  });

  it('builds for about 6.5 s, under the 8 s cap, and shows the showcase 0.9 s', () => {
    expect(s.end).toBeGreaterThan(5500);
    expect(s.end).toBeLessThan(CASCADE_CAP_MS);
    const r = of(s.cues, 'showcase')[0].r;
    expect(showcaseLine(r, rec.regions)).toBe('466× THE TARGET · WINS 7');
    expect(showcaseLine(22.41, 3)).toBe('22.4× THE TARGET · WINS 3');
  });

  it('holds the new map 0.7 s before the shop tray rises over it', () => {
    const o = outcomeSchedule({ ...outcomeInput(rec), holdMs: SHOP_HOLD_MS });
    expect(o.end - o.settled).toBe(SHOP_HOLD_MS);
  });

  it('turns seven regions gold, four of them won back from war, in 4 s', () => {
    const o = outcome(rec);
    const claims = out(o.cues, 'claim');
    expect(claims.map((c) => c.region)).toEqual(['LTL', 'DNM', 'BRN', 'ICW', 'EDV', 'ASK', 'VSY']);
    expect(claims.filter((c) => c.wasRed)).toHaveLength(4);
    expect(claims.at(-1)).toMatchObject({ gold: 28, red: 1 });
    expect(out(o.cues, 'coins').map((c) => c.coins)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    // A region every 0.5 s after the crisis's 1.0 s.
    const travels = out(o.cues, 'travel').map((c) => c.t);
    expect(travels).toEqual([1000, 1500, 2000, 2500, 3000, 3500]);
    expect(o.settled).toBeLessThanOrEqual(WIN_CAP_MS);
  });

  it('draws a new hire’s first firing 1.5x with “· new”: its hop and its first number', () => {
    const n = cascade(rec, { newSeats: new Set([2]) });
    const hops = of(n.cues, 'hop').filter((c) => c.seat === 2);
    expect(hops.every((c) => c.isNew)).toBe(true);
    const pops = of(n.cues, 'fly').filter((c) => c.look === 'pop' && c.isNew);
    expect(pops).toHaveLength(1);
    expect(of(n.cues, 'hop').filter((c) => c.seat !== 2).every((c) => !c.isNew)).toBe(true);
  });

  it('fits in 1.2 s with reduced motion', () => {
    const r = cascade(rec, { reduced: true });
    const o = outcome(rec, { reduced: true, riserPlayed: false });
    expect(r.end + o.end).toBeLessThanOrEqual(REDUCED_BUDGET + REDUCED_OUTCOME_BUDGET);
    expect(r.end + o.end).toBeLessThanOrEqual(1200);
    expect(of(r.cues, 'showcase')).toHaveLength(0);
    expect(out(o.cues, 'claim')).toHaveLength(7);
    expect(out(o.cues, 'coin')).toHaveLength(0);
    expect(out(o.cues, 'coins')).toHaveLength(7);
    // Calm, not a burst: no sound repeats within 120 ms (the full CROWN plays 15 ×2 thumps).
    expect(spaced(r.cues, CALM_GAP_MS)).toBe(true);
    expect(spaced(o.cues, CALM_GAP_MS)).toBe(true);
    expect(of(r.cues, 'sound').length).toBeLessThan(of(s.cues, 'sound').length / 4);
  });

  it('caps a longer send at 8 s by playing its beats closer together', () => {
    // The same trace with every pop doubled: far past 8 s at the usual pace.
    const pops = rec.trace.filter((e) => e.kind === 'regionStaff');
    const long = [...rec.trace.slice(0, -2), ...pops, ...pops, ...rec.trace.slice(-2)];
    const l = sendSchedule({ trace: long, score: rec.score, target: rec.target, win: true, reduced: false });
    expect(l.end).toBeLessThanOrEqual(CASCADE_CAP_MS + 50);
    expect(isSorted(l.cues)).toBe(true);
  });
});

// ---------------------------------------------------------------- misses, war, endings

describe('a miss: Shoal alone, 14 against 64', () => {
  const { rec } = firstMiss();
  const s = cascade(rec);

  it('slams with no flourish: no shake, no bloom, no showcase, no riser', () => {
    expect(rec.result).toBe('miss');
    expect(of(s.cues, 'shake').filter((c) => c.t >= s.hitAt)).toHaveLength(0);
    expect(of(s.cues, 'bloom')).toHaveLength(0);
    expect(s.riserAt).toBeNull();
    expect(of(s.cues, 'toRing')[0].from).toBe('plate');
  });

  it('dips the drone and runs red ink into Shoal (from its centre: no war touches it), WAR 3 → 4, in 0.8 s', () => {
    const o = outcome(rec);
    expect(out(o.cues, 'take')).toEqual([{ t: 100, do: 'take', region: 'SHL', from: 'SHL', ms: 700, gold: 1, red: 4 }]);
    expect(out(o.cues, 'drone')[0]).toMatchObject({ t: 0, level: 0.05 });
    expect(sounds(o.cues, 'ante_miss')).toHaveLength(1);
    expect(out(o.cues, 'shake')[0]).toMatchObject({ px: 2 });
    expect(out(o.cues, 'claim')).toHaveLength(0);
    expect(o.settled).toBe(800);
  });

  it('fits in 1.2 s with reduced motion', () => {
    expect(cascade(rec, { reduced: true }).end + outcome(rec, { reduced: true }).end).toBeLessThanOrEqual(1200);
  });
});

describe('war spreads by itself after turn 3', () => {
  // FIRST-WORLD played as coached, the first shop skipped, then the best send of turn 3.
  let s = must(send(pinAll(newGame(FIRST_WORLD_SEED), ['SHL', 'LNK', 'PBB', 'MRM'])));
  s = must(nextTurn(s));
  s = must(send(pinAll(s, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
  s = must(nextTurn(must(buy(s, 2))));
  // The best send that wins but leaves Marram (war's tag) unpinned: war takes it after the claims.
  const opts = sendOptions(s);
  const leaves = opts.find((o) => !o.pins.includes('MRM') && sent(s, o.pins).rec.spread?.id === 'MRM' && sent(s, o.pins).rec.result === 'win')!;
  const { rec } = sent(s, leaves.pins);

  it('drums half a second after the outcome, runs a red pulse over the border, then takes Marram, and moves the tag', () => {
    expect(rec.turn).toBe(3);
    expect(rec.spread).toMatchObject({ id: 'MRM' });
    const o = outcome(rec);
    const take = out(o.cues, 'take').find((c) => c.region === 'MRM')!;
    const lastClaim = out(o.cues, 'claim').at(-1)!;
    const drum = lastClaim.t + lastClaim.ms + 500;
    expect(sounds(o.cues, 'flashpoint_hit').map((c) => c.t)).toEqual([drum]);
    expect(out(o.cues, 'travel').filter((c) => c.colour === 'red')).toEqual([
      { t: drum, do: 'travel', path: [rec.spread!.from, 'MRM'], stepMs: 150, colour: 'red' },
    ]);
    expect(take).toMatchObject({ t: drum + 150, from: rec.spread!.from, ms: 700, red: rec.red, spread: true });
    // The tag moves once, after war has spread: never to its next target before then.
    expect(out(o.cues, 'tag').map((c) => c.t)).toEqual([take.t + 700]);
    // The coach names the region with the drum, not after the send has played.
    expect(out(o.cues, 'spreadLine')).toEqual([{ t: drum, do: 'spreadLine', region: 'MRM' }]);
  });

  it('draws the Harbourmaster hired in the shop as new on this send', () => {
    expect(rec.newHires).toHaveLength(1);
  });

  it('pin it to claim it: the best send pins Marram and wins it, so war spreads elsewhere', () => {
    const best = sent(s, opts[0].pins).rec;
    expect(opts[0].pins).toContain('MRM');
    expect(best.won.map((w) => w.id)).toContain('MRM');
    expect(best.spread?.id).not.toBe('MRM');
    // The red ink runs into the region war really takes, and nothing red runs into Marram.
    const o = outcome(best);
    expect(out(o.cues, 'take').map((c) => c.region)).toEqual([best.spread!.id]);
  });
});

describe('endings', () => {
  const gold27 = [...EX2_GOLD, 'DNM', 'ICW', 'LTL', 'BRN', 'NWK', 'VSY'];
  const push = ownersFrom(gold27, ['EDV', 'ASK', 'QLN']);
  const pushGame = (target: bigint) => ex2(push, target, true, 'EDV', ['VSY', 'MRD', 'RMH']);

  it('WORLD UNITED: three regions won back, then the sunrise and a gold wave from the last one', () => {
    const { rec } = sent(pushGame(1n), ['EDV']);
    expect(rec.ending).toBe('WORLD UNITED');
    const o = outcome(rec);
    expect(out(o.cues, 'claim').map((c) => [c.region, c.wasRed])).toEqual([
      ['EDV', true],
      ['ASK', true],
      ['QLN', true],
    ]);
    const sunrise = out(o.cues, 'sunrise')[0];
    const wave = out(o.cues, 'wave')[0];
    expect(sunrise.t).toBeGreaterThanOrEqual(o.settled);
    expect(wave).toMatchObject({ region: 'QLN', t: sunrise.t + RISER_MS, ms: 1200 });
    expect(sounds(o.cues, 'ante_smash').map((c) => c.t)).toEqual([sunrise.t]);
    // The loudest beat in the game: the console says so, WORLD UNITED slams over the map with the
    // wave, a rising run of notes and the longest haptic; the stamp lifts, then the gold world holds.
    expect(out(o.cues, 'ending')).toEqual([{ t: sunrise.t, do: 'ending', ending: 'WORLD UNITED' }]);
    expect(out(o.cues, 'united')).toEqual([{ t: wave.t, do: 'united', region: 'QLN' }]);
    expect(out(o.cues, 'shake')).toContainEqual({ t: wave.t, do: 'shake', px: 6, ms: 300 });
    expect(out(o.cues, 'buzz').map((c) => c.pattern)).toContainEqual(UNITED_BUZZ);
    const run = out(o.cues, 'sound').filter((c) => c.sfx === 'tally_tick' && c.t >= wave.t);
    expect(run).toHaveLength(12);
    expect(run.map((c) => c.intensity)).toEqual([...run.map((c) => c.intensity)].sort((a, b) => a - b));
    const off = out(o.cues, 'unitedOff')[0];
    expect(off.t).toBe(wave.t + 1200 + 300);
    expect(o.end).toBe(off.t + UNITED_HOLD_MS);
  });

  it('CEASEFIRE: a push miss changes no region; red stops pulsing', () => {
    const { rec } = sent(pushGame(10n ** 12n), ['EDV']);
    expect(rec.ending).toBe('CEASEFIRE');
    const o = outcome(rec);
    expect(out(o.cues, 'take')).toHaveLength(0);
    expect(out(o.cues, 'claim')).toHaveLength(0);
    expect(out(o.cues, 'ceasefire')).toHaveLength(1);
    expect(out(o.cues, 'drone').at(-1)!.level).toBe(0);
    // The war stopping is felt as well as heard, and the console says how it ended.
    expect(out(o.cues, 'buzz').map((c) => c.pattern)).toContainEqual(CEASEFIRE_BUZZ);
    expect(out(o.cues, 'ending').map((c) => c.ending)).toEqual(['CEASEFIRE']);
  });

  it('WAR: the tenth red region, then the lights go out over grey for 2 s', () => {
    const red = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY', 'DNM', 'ICW', 'QLN', 'WNM'];
    const owner = ownersFrom(EX2_GOLD.filter((r) => r !== 'WNM'), red);
    const { rec } = sent(ex2(owner, 10n ** 12n), ['LTL']);
    expect(rec.ending).toBe('WAR');
    const o = outcome(rec);
    const take = out(o.cues, 'take')[0];
    expect(take).toMatchObject({ region: 'LTL', red: 10 });
    expect(take.spread).toBeUndefined();
    // War's red pulse crosses from the war region next to Lintel as the miss lands.
    expect(out(o.cues, 'travel')).toEqual([{ t: 0, do: 'travel', path: [take.from, 'LTL'], stepMs: take.t, colour: 'red' }]);
    // The loss buzzes heavier than any miss.
    expect(out(o.cues, 'buzz').map((c) => c.pattern)).toContainEqual(WAR_ENDING_BUZZ);
    const lights = out(o.cues, 'lightsOut')[0];
    expect(lights.ms).toBe(2000);
    expect(lights.t).toBeGreaterThanOrEqual(take.t + take.ms);
    expect(o.end).toBeGreaterThanOrEqual(lights.t + 2000);
    const r = outcome(rec, { reduced: true });
    expect(r.end).toBeLessThanOrEqual(REDUCED_OUTCOME_BUDGET);
    expect(out(r.cues, 'lightsOut')).toHaveLength(1);
  });
});

describe('fanfare and pace', () => {
  const { rec } = firstWorld();
  const at = (r: number) => sendSchedule({ trace: rec.trace, score: rec.score, target: (rec.score * 10n) / BigInt(Math.round(r * 10)), win: true, reduced: false });

  it('plays the showcase and the gold bloom from 16x the target (three regions on the ladder), not at 12x', () => {
    expect(SHOWCASE_AT).toBe(16);
    const twelve = at(12);
    expect(of(twelve.cues, 'showcase')).toHaveLength(0);
    expect(of(twelve.cues, 'bloom')).toHaveLength(0);
    expect(of(twelve.cues, 'toRing')[0].from).toBe('plate');
    const sixteen = at(16);
    expect(of(sixteen.cues, 'showcase')).toHaveLength(1);
    expect(of(sixteen.cues, 'bloom')).toHaveLength(1);
  });

  it('plays a send that changes little brisk: a miss, or one region under 4x', () => {
    expect(isBrisk(false, 0, 0.2)).toBe(true);
    expect(isBrisk(true, 1, 2.3)).toBe(true);
    expect(isBrisk(true, 1, 4)).toBe(false);
    expect(isBrisk(true, 2, 4.1)).toBe(false);
    const full = cascade(rec);
    const brisk = cascade(rec, { brisk: true });
    expect(brisk.end).toBeLessThan(full.end - 400);
    expect(of(brisk.cues, 'toRing')[0].t).toBe(brisk.hitAt + BRISK_PLATE_HOLD_MS);
    expect(of(brisk.cues, 'land').map((c) => c.value)).toEqual(of(full.cues, 'land').map((c) => c.value));
  });

  it('thins a burst of one sound to one every gap, keeping other cues', () => {
    const cues = [
      { t: 0, do: 'sound', sfx: 'thump', intensity: 1 },
      { t: 30, do: 'sound', sfx: 'thump', intensity: 1 },
      { t: 30, do: 'sound', sfx: 'tick', intensity: 1 },
      { t: 30, do: 'press' },
      { t: 130, do: 'sound', sfx: 'thump', intensity: 1 },
    ] as Cue[];
    expect(thinSounds(cues, 120).map((c) => [c.t, c.do === 'sound' ? c.sfx : c.do])).toEqual([
      [0, 'thump'],
      [30, 'tick'],
      [30, 'press'],
      [130, 'thump'],
    ]);
  });
});
