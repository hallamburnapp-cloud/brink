import { describe, expect, it } from 'vitest';
import { joinKey, type Colour } from '../content/map';
import type { PatternId } from '../content/patterns';
import type { StaffId } from '../content/staff';
import { buildBoard } from './board';
import referenceCases from './fixtures/reference-cases.json';
import { startingWorld } from './run';
import { scoreSelection } from './score';
import { seatedStaff, testBoard } from './testkit';
import type { StampKind, Twist, World } from './types';

const traffic = (w: World, list: Array<[string, string, number]>) => {
  for (const [a, b, t] of list) w.traffic[joinKey(a, b)] = t;
};

/** Example 2 (spec section 4 / DESIGN): 01:00 Standoff with three staff. */
function example2(staff: StaffId[]) {
  const board = testBoard({
    staff,
    edit: (w) => {
      w.levels.NETWORK = 3;
      w.stamps.KLP = 'FORTIFY';
      traffic(w, [
        ['SHL', 'LTL', 2],
        ['LTL', 'TLM', 3],
        ['KLP', 'TLM', 2],
        ['KLM', 'KLP', 1],
      ]);
    },
  });
  return scoreSelection(board, {
    pins: ['SHL', 'LTL', 'TLM', 'KLP', 'KLM'],
    lit: ['SHL', 'LTL', 'TLM', 'KLP', 'KLM', 'EDV', 'ICW', 'DRF'],
    flashpoint: 'TLM',
  });
}

/** Example 3: the broken late game. */
function example3(staff: StaffId[]) {
  const board = testBoard({
    staff,
    edit: (w) => {
      w.levels.NETWORK = 6;
      w.brass.LNK = 2;
      traffic(w, [
        ['EDV', 'MRD', 6],
        ['MRD', 'TRN', 9],
        ['TRN', 'LNK', 7],
        ['GUL', 'TRN', 4],
        ['GUL', 'LNK', 3],
      ]);
    },
  });
  return scoreSelection(board, {
    pins: ['EDV', 'MRD', 'TRN', 'LNK', 'GUL'],
    lit: ['EDV', 'MRD', 'TRN', 'LNK', 'GUL', 'ICW', 'HRT', 'BRK'],
    flashpoint: 'HRT',
  });
}

describe('worked examples', () => {
  it('Example 1, sweep 1: CHAIN 60 x 3 = 180 with the flashpoint scoring twice', () => {
    const res = scoreSelection(testBoard(), {
      pins: ['LNK', 'GUL', 'SHL'],
      lit: ['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT'],
      flashpoint: 'LNK',
    });
    expect(res.leverage).toBe(180n);
    expect(res.influence).toBe(60n);
    expect(res.m10).toBe(30n);
    expect(res.trace.map((e) => [e.phase, e.region ?? '', e.amount, e.I])).toEqual([
      ['pattern', '', '30', '30'],
      ['pin', 'GUL', '3', '33'],
      ['pin', 'LNK', '10', '43'],
      ['thread', 'LNK', '0', '43'],
      ['again', 'LNK', 'AGAIN', '43'],
      ['pin', 'LNK', '10', '53'],
      ['pin', 'SHL', '7', '60'],
      ['thread', 'SHL', '0', '60'],
      ['slam', '', '180', '60'],
    ]);
  });

  it('Example 2: 10,920, with the exact trace', () => {
    const res = example2(['HARBOUR', 'HOTLINE', 'STRATEGIST']);
    expect(res.leverage).toBe(10_920n);
    expect(res.pattern).toBe('NETWORK');
    expect(res.topRegion).toBe('KLP');
    expect(res.contributions.KLP).toBe(40n);
    const t = res.trace.map((e) => `${e.phase}:${e.region ?? ''}${e.other ? '<' + e.other : ''}:${e.staffId ?? ''}:${e.op}${e.amount}:${e.I}/${e.M10}`);
    expect(t).toEqual([
      'pattern:::base140:140/120',
      'pin:SHL::+I7:147/120',
      'staff:SHL:HARBOUR:+I15:162/120',
      'pin:LTL::+I6:168/120',
      'thread:LTL<SHL::+I2:170/120',
      'staff:LTL:HARBOUR:+I15:185/120',
      'pin:KLP::+I5:190/120',
      'thread:KLP<LTL::+I0:190/120', // joined by land, no traffic yet: a pulse with nothing to add
      'stamp:KLP::+I20:210/120',
      'staff:KLP:HARBOUR:+I15:225/120',
      'pin:KLM::+I7:232/120',
      'thread:KLM<KLP::+I1:233/120',
      'staff:KLM:HARBOUR:+I15:248/120',
      'pin:TLM::+I10:258/120',
      'thread:TLM<LTL::+I3:261/120',
      'thread:TLM<KLP::+I2:263/120',
      'again:TLM::againAGAIN:263/120',
      'pin:TLM::+I10:273/120',
      'desk::HOTLINE:+M8:273/200',
      'desk::STRATEGIST:xM2:273/400',
      'slam:::slam10920:273/400',
    ]);
    // Seats are indexes into state.staff.
    expect(res.trace.filter((e) => e.phase === 'desk').map((e) => e.seat)).toEqual([1, 2]);
    expect(res.firedSeats).toEqual([0, 1, 2]);
  });

  it('Example 2: seats 2 and 3 swapped gives 8,736; no staff 2,556', () => {
    expect(example2(['HARBOUR', 'STRATEGIST', 'HOTLINE']).leverage).toBe(8_736n);
    expect(example2([]).leverage).toBe(2_556n);
  });

  it('Example 3: 10,559,856,944; Governor last 8,651,450,444; Deputy copying Signals 415,461,382', () => {
    const res = example3(['HERALD', 'GOVERNOR', 'SIGNALS', 'DEPUTY', 'SOVEREIGN']);
    expect(res.leverage).toBe(10_559_856_944n);
    expect(res.influence).toBe(364n);
    expect(res.m10).toBe(290_105_960n);
    expect(res.trace.filter((e) => e.phase === 'pin')).toHaveLength(10);
    expect(example3(['HERALD', 'SIGNALS', 'DEPUTY', 'SOVEREIGN', 'GOVERNOR']).leverage).toBe(8_651_450_444n);
    expect(example3(['HERALD', 'GOVERNOR', 'DEPUTY', 'SIGNALS', 'SOVEREIGN']).leverage).toBe(415_461_382n);
  });

  it('Example 3: the Deputy acts as the Sovereign at its own seat', () => {
    const res = example3(['HERALD', 'GOVERNOR', 'SIGNALS', 'DEPUTY', 'SOVEREIGN']);
    const firstPass = res.trace.filter((e) => e.phase === 'staff' && e.region === 'EDV' && e.pass === 0);
    expect(firstPass.map((e) => [e.seat, e.staffId, e.viaDeputy, e.op, e.amount])).toEqual([
      [1, 'GOVERNOR', false, '+M', '5'],
      [3, 'SOVEREIGN', true, 'xM', '2'],
      [4, 'SOVEREIGN', false, 'xM', '2'],
    ]);
    const agains = res.trace.filter((e) => e.phase === 'again');
    expect(agains).toHaveLength(5);
    expect(agains.every((e) => e.reason === 'signals' && e.seat === 2)).toBe(true);
  });
});

describe('staff rules', () => {
  const lit = ['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT'];
  const score = (staff: StaffId[], pins: string[], opts: { flashpoint?: string | null; edit?: (w: World) => void; twist?: Twist; lit?: string[] } = {}) =>
    scoreSelection(testBoard({ staff, edit: opts.edit, twist: opts.twist ?? null }), {
      pins,
      lit: opts.lit ?? lit,
      flashpoint: opts.flashpoint ?? null,
    });

  it('Duty Officer +4 Momentum and Quartermaster +30 Influence at the desk', () => {
    // CHAIN GUL LNK SHL: (30 + 20) x 3 = 150 without staff.
    expect(score([], ['LNK', 'GUL', 'SHL']).leverage).toBe(150n);
    expect(score(['DUTY'], ['LNK', 'GUL', 'SHL']).leverage).toBe(350n);
    expect(score(['QM'], ['LNK', 'GUL', 'SHL']).leverage).toBe(240n);
  });

  it('Courier makes the first pin score twice', () => {
    const res = score(['COURIER'], ['LNK', 'GUL', 'SHL']);
    expect(res.influence).toBe(30n + 3n + 3n + 10n + 7n);
    expect(res.trace.find((e) => e.phase === 'again')).toMatchObject({ region: 'GUL', reason: 'courier', seat: 0 });
  });

  it('Signals Officer makes Capitals score twice; Herald makes every region a Capital', () => {
    expect(score(['SIGNALS'], ['LNK', 'GUL', 'SHL']).influence).toBe(30n + 3n + 10n + 10n + 7n);
    expect(score(['HERALD', 'SIGNALS'], ['LNK', 'GUL', 'SHL']).influence).toBe(30n + 2n * 20n);
  });

  it('Surveyor +15 for weight 4 or less; Harbourmaster +15 per Port; Admiral x1.5 per Port', () => {
    // GUL (3, port), LNK (10), SHL (7, port)
    expect(score(['SURVEYOR'], ['LNK', 'GUL', 'SHL']).influence).toBe(50n + 15n);
    expect(score(['HARBOUR'], ['LNK', 'GUL', 'SHL']).influence).toBe(50n + 30n);
    expect(score(['ADMIRAL'], ['LNK', 'GUL', 'SHL']).m10).toBe(67n); // 30 -> 45 -> 67
  });

  it('Governor +5 Momentum per Capital, the Sovereign x2', () => {
    expect(score(['GOVERNOR'], ['LNK', 'GUL', 'SHL']).m10).toBe(80n);
    expect(score(['SOVEREIGN'], ['LNK', 'GUL', 'SHL']).m10).toBe(60n);
  });

  it('Hotline needs 3 joined scoring pins, Strategist 4, Envoy 4 colours, Mediator 3 pins or fewer', () => {
    expect(score(['HOTLINE'], ['LNK', 'GUL']).m10).toBe(20n);
    expect(score(['HOTLINE'], ['LNK', 'GUL', 'SHL']).m10).toBe(110n);
    expect(score(['STRATEGIST'], ['LNK', 'GUL', 'SHL']).m10).toBe(30n);
    expect(score(['STRATEGIST'], ['NWK', 'FRM', 'WNM', 'WMS'], { lit: ['NWK', 'FRM', 'WNM', 'WMS'] }).m10).toBe(80n);
    expect(score(['ENVOY'], ['NWK', 'EDV', 'LNK', 'TLM', 'MRM']).m10).toBe(40n);
    expect(score(['MEDIATOR'], ['LNK', 'GUL', 'SHL']).m10).toBe(90n);
    // Four pins (one loose) is too many for the Mediator.
    expect(score(['MEDIATOR'], ['LNK', 'GUL', 'SHL', 'ICW']).m10).toBe(30n);
  });

  it('Old Hand adds its count; a Deputy copies the count', () => {
    const world = startingWorld();
    const board = buildBoard(world, seatedStaff(['DEPUTY', 'OLDHAND'], { 1: 15 }), null);
    const res = scoreSelection(board, { pins: ['LNK', 'GUL', 'SHL'], lit, flashpoint: null });
    expect(res.influence).toBe(50n + 15n + 15n);
    // A count of 0 adds nothing and does not fire.
    const fresh = buildBoard(world, seatedStaff(['OLDHAND']), null);
    expect(scoreSelection(fresh, { pins: ['LNK'], lit, flashpoint: null }).firedSeats).toEqual([]);
  });

  it('a Deputy with nothing to its right does nothing; Deputies chain to the first non-Deputy', () => {
    expect(score(['DUTY', 'DEPUTY'], ['LNK', 'GUL', 'SHL']).m10).toBe(70n);
    expect(score(['DEPUTY', 'DEPUTY', 'DUTY'], ['LNK', 'GUL', 'SHL']).m10).toBe(150n);
  });

  it('Rail Clerk triples thread traffic', () => {
    const edit = (w: World) => traffic(w, [['GUL', 'LNK', 4]]);
    expect(score([], ['LNK', 'GUL'], { edit }).influence).toBe(10n + 13n + 4n);
    expect(score(['RAILCLERK'], ['LNK', 'GUL'], { edit }).influence).toBe(10n + 13n + 12n);
  });

  it('Chief of Staff: x1.5 for each lit Capital left unpinned, once per Chief and Deputy copy', () => {
    // Lit capitals LNK and EDV are left unpinned. GUL-SHL are not joined: SINGLE (SHL), M 10 -> 15 -> 22.
    expect(score(['CHIEF'], ['GUL', 'SHL']).m10).toBe(22n);
    // Two unpinned lit capitals (EDV, LNK), each x1.5 twice: 10 -> 15 -> 22 -> 33 -> 49.
    expect(score(['DEPUTY', 'CHIEF'], ['GUL', 'SHL']).m10).toBe(49n);
    // Pinning a capital takes it out of standby.
    expect(score(['CHIEF'], ['LNK']).m10).toBe(15n);
  });

  it('Ferry Master joins every Port to every other; a Deputy copying it adds nothing', () => {
    // ICW is not a port; GUL is.
    expect(score(['FERRY'], ['NWK', 'ICW'], { lit: ['NWK', 'ICW'] }).pattern).toBe('SINGLE');
    expect(score(['FERRY'], ['NWK', 'GUL'], { lit: ['NWK', 'GUL'] }).pattern).toBe('LINK');
    const once = score(['FERRY'], ['NWK', 'GUL', 'ORN'], { lit: ['NWK', 'GUL', 'ORN'] });
    const twice = score(['DEPUTY', 'FERRY'], ['NWK', 'GUL', 'ORN'], { lit: ['NWK', 'GUL', 'ORN'] });
    expect(once.pattern).toBe('CHAIN');
    expect(twice.leverage).toBe(once.leverage);
  });

  it('stamps: FORTIFY +20, RELAY x1.5, ECHO scores twice; brass +5 each', () => {
    const stamp = (s: StampKind) => (w: World) => (w.stamps.GUL = s);
    expect(score([], ['LNK', 'GUL', 'SHL'], { edit: stamp('FORTIFY') }).influence).toBe(70n);
    expect(score([], ['LNK', 'GUL', 'SHL'], { edit: stamp('RELAY') }).m10).toBe(45n);
    expect(score([], ['LNK', 'GUL', 'SHL'], { edit: stamp('ECHO') }).influence).toBe(53n);
    expect(score([], ['LNK', 'GUL', 'SHL'], { edit: (w) => (w.brass.SHL = 2) }).influence).toBe(60n);
  });

  it('topRegion: the most Influence from its own steps, ties to the westmost', () => {
    expect(score([], ['LNK', 'GUL', 'SHL']).topRegion).toBe('LNK');
    // NWK 4, FRM 3, WNM 6, WMS 10.
    expect(score([], ['NWK', 'FRM', 'WNM', 'WMS']).topRegion).toBe('WMS');
    // Lane NWK-VSY with the Harbourmaster: VSY 5 + 15 = 20 beats NWK 4 + 15 = 19.
    expect(score(['HARBOUR'], ['NWK', 'VSY'], { lit: ['NWK', 'VSY'] }).topRegion).toBe('VSY');
    // A tie (EDV 10 and LNK 10 with no other Influence, joined by a cable) goes to the westmost: EDV.
    const tie = score([], ['EDV', 'LNK'], { lit: ['EDV', 'LNK'], edit: (w) => w.cables.push(['EDV', 'LNK']) });
    expect(tie.contributions.EDV).toBe(tie.contributions.LNK);
    expect(tie.topRegion).toBe('EDV');
  });
});

describe('twists', () => {
  const lit = ['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT'];

  it('BLACKOUT: the colour still makes the shape but adds nothing and triggers nothing', () => {
    const twist: Twist = { kind: 'BLACKOUT', colour: 'SCT' };
    const board = testBoard({ staff: ['HARBOUR'], twist });
    const res = scoreSelection(board, { pins: ['LNK', 'GUL', 'SHL'], lit, flashpoint: 'LNK' });
    expect(res.pattern).toBe('CHAIN');
    expect(res.influence).toBe(30n);
    expect(res.leverage).toBe(90n);
    expect(res.trace.filter((e) => e.phase === 'pin').every((e) => e.dark)).toBe(true);
    expect(res.trace.some((e) => e.phase === 'again' || e.phase === 'staff')).toBe(false);
  });

  it('BLACKOUT: blacked-out lit Capitals do not trigger the Chief of Staff', () => {
    const twist: Twist = { kind: 'BLACKOUT', colour: 'HMR' };
    const board = testBoard({ staff: ['CHIEF'], twist });
    // Lit capitals: LNK (SCT) pinned? no: pin GUL only; unpinned capitals LNK and EDV (HMR, dark).
    const res = scoreSelection(board, { pins: ['GUL'], lit, flashpoint: null });
    expect(res.m10).toBe(15n);
  });

  it('GRIDLOCK cuts sea lanes: no traffic flows over them', () => {
    const edit = (w: World) => traffic(w, [['SHL', 'LTL', 5]]);
    const open = scoreSelection(testBoard({ edit }), { pins: ['SHL', 'LTL'], lit: ['SHL', 'LTL'], flashpoint: null });
    expect(open.pattern).toBe('LINK');
    const cut = scoreSelection(testBoard({ edit, twist: { kind: 'GRIDLOCK', colour: null } }), {
      pins: ['SHL', 'LTL'],
      lit: ['SHL', 'LTL'],
      flashpoint: null,
    });
    expect(cut.pattern).toBe('SINGLE');
    expect(cut.threads).toEqual([]);
  });
});

interface RefCase {
  staff: StaffId[];
  oldHand: number[];
  traffic: Array<[string, string, number]>;
  stamps: Record<string, StampKind>;
  brass: Record<string, number>;
  cables: Array<[string, string]>;
  promoted: string[];
  colour: Record<string, Colour>;
  retired: string[];
  twist: null | 'GRIDLOCK' | ['BLACKOUT', Colour];
  lit: string[];
  flashpoint: string | null;
  pins: string[];
  leverage: string;
  pattern: PatternId;
  scoring: string[];
  top: string;
}

describe('agreement with the Python reference', () => {
  const cases = referenceCases as unknown as RefCase[];

  it(`scores all ${cases.length} reference positions identically`, () => {
    expect(cases.length).toBeGreaterThan(1000);
    const mismatches: string[] = [];
    cases.forEach((c, n) => {
      const w = startingWorld();
      traffic(w, c.traffic);
      Object.assign(w.stamps, c.stamps);
      Object.assign(w.brass, c.brass);
      w.cables.push(...c.cables);
      w.promoted.push(...c.promoted);
      Object.assign(w.colour, c.colour);
      w.retired.push(...c.retired);
      const twist: Twist | null =
        c.twist === null ? null : c.twist === 'GRIDLOCK' ? { kind: 'GRIDLOCK', colour: null } : { kind: 'BLACKOUT', colour: c.twist[1] };
      const counts = Object.fromEntries(c.oldHand.map((v, i) => [i, v]));
      const board = buildBoard(w, seatedStaff(c.staff, counts), twist);
      const res = scoreSelection(board, { pins: c.pins, lit: c.lit, flashpoint: c.flashpoint });
      const got = [res.leverage.toString(), res.pattern, [...res.scoringSet].sort().join(','), res.topRegion];
      const want = [c.leverage, c.pattern, c.scoring.join(','), c.top];
      if (got.join('|') !== want.join('|')) mismatches.push(`#${n}: got ${got.join(' ')} want ${want.join(' ')}`);
    });
    expect(mismatches.slice(0, 10)).toEqual([]);
  });
});
