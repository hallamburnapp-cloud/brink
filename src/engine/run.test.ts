import { describe, expect, it } from 'vitest';
import { fixture } from './fixture';
import { Rng } from './rng';
import { buryCard, choose, createRun, deserialise, pickPiece, serialise, view } from './run';
import type { Content, RunState } from './types';

const content: Content = fixture();

function run(seed = 'test', extra: Partial<Parameters<typeof createRun>[1]> = {}): RunState {
  return createRun(content, { seed, seat: 'republic', mode: 'endless', ...extra });
}

/** Play until a predicate holds or the run ends, always choosing `side`. */
function playUntil(state: RunState, pred: (s: RunState) => boolean, side: 'left' | 'right' = 'right', max = 500): RunState {
  for (let i = 0; i < max && !pred(state) && state.phase !== 'ended'; i++) {
    if (state.phase === 'offer') pickPiece(content, state, state.offer![0]);
    else choose(content, state, side);
  }
  return state;
}

describe('createRun', () => {
  it('is deterministic for a seed and different across seeds', () => {
    const a = run('alpha');
    const b = run('alpha');
    expect(a.current).toBe(b.current);
    expect(a.rng).toEqual(b.rng);
    const c = run('beta');
    expect(a.rng).not.toEqual(c.rng);
  });
  it('starts with seat meters, act 1, day 1 and a current card', () => {
    const s = run();
    expect(s.act).toBe(1);
    expect(s.day).toBe(1);
    expect(s.meters.escalation).toBe(20);
    expect(s.current).not.toBeNull();
    expect(view(content, s)?.actName).toBe('Week One');
  });
  it('applies difficulty start escalation', () => {
    expect(run('x', { difficulty: 1 }).meters.escalation).toBe(40);
  });
});

describe('choose', () => {
  it('applies effects, records history and advances the day', () => {
    const s = run();
    s.current = 'c_basic';
    const before = { ...s.meters };
    choose(content, s, 'left');
    expect(s.meters.public).toBe(before.public - 5);
    expect(s.meters.escalation).toBe(before.escalation + 5);
    expect(s.history[0].card).toBe('c_basic');
    expect(s.history[0].applied.public).toBe(-5);
    expect(s.day).toBe(1.5);
    expect(s.trail).toHaveLength(1);
  });
  it('clamps meters to 0..100 and ends the run at 0 with the best matching ending', () => {
    const s = run();
    s.meters.public = 3;
    s.current = 'c_basic';
    const { events } = choose(content, s, 'left');
    expect(s.meters.public).toBe(0);
    expect(s.phase).toBe('ended');
    expect(s.ending).toBe('impeached');
    expect(events.some((e) => e.type === 'ending')).toBe(true);
    expect(s.moment).toBe('c_basic');
  });
  it('prefers higher-priority endings whose conditions hold', () => {
    const s = run();
    s.pieces.push('p_hawk');
    s.meters.public = 2;
    s.current = 'c_basic';
    choose(content, s, 'left');
    expect(s.ending).toBe('impeached_hawk');
  });
  it('ends in nuclear war at escalation 100', () => {
    const s = run();
    s.meters.escalation = 98;
    s.current = 'c_basic';
    choose(content, s, 'left');
    expect(s.ending).toBe('nuclear_war');
  });
  it('resolves odds rolls deterministically with near-miss margins', () => {
    const s = run('odds');
    s.current = 'c_odds';
    const { events } = choose(content, s, 'left');
    const roll = events.find((e) => e.type === 'roll');
    expect(roll).toBeDefined();
    if (roll && roll.type === 'roll') {
      expect(roll.result.p).toBeCloseTo(0.5);
      expect(roll.result.margin).toBeCloseTo(Math.abs(0.5 - roll.result.roll) * 100);
      if (roll.result.success) expect(s.flags).toContain('won');
      else expect(s.current).toBe('c_chain');
    }
    expect(s.stats.rolls).toBe(1);
  });
  it('shows odds after piece modifiers in the view', () => {
    const s = run('odds');
    s.pieces.push('p_odds');
    s.current = 'c_odds';
    expect(view(content, s)!.left.odds!.p).toBeCloseTo(0.7);
  });
  it('queues true or false warning follow-ups and tracks stats', () => {
    let trues = 0;
    let falses = 0;
    for (let i = 0; i < 40; i++) {
      const s = run(`w${i}`);
      s.current = 'c_warning';
      // the truth is decided on draw; emulate a draw
      s.truth = new Rng(`t${i}`).next() < 0.7;
      choose(content, s, 'right');
      expect(['c_true', 'c_false']).toContain(s.current);
      if (s.current === 'c_true') trues++;
      else falses++;
    }
    expect(trues + falses).toBe(40);
    expect(falses).toBeGreaterThan(0);
  });
  it('makes walking back cost more the more committed you are (commitment trap)', () => {
    const low = run();
    low.hidden.commitment = 0;
    low.current = 'c_walkback';
    const high = run();
    high.hidden.commitment = 100;
    high.current = 'c_walkback';
    expect(view(content, low)!.left.preview.public).toBe(-10);
    expect(view(content, high)!.left.preview.public).toBe(-20);
    high.pieces.push('p_spin'); // lock 1 → ×(1+1) = -20, then ×0.5 damping = -10
    expect(view(content, high)!.left.preview.public).toBe(-10);
    low.pieces.push('p_spin'); // at zero commitment the damping alone applies
    expect(view(content, low)!.left.preview.public).toBe(-5);
  });
  it('spends a free de-escalation charge to remove public/military costs', () => {
    const s = run();
    s.pieces.push('p_hotline');
    s.charges.deescalation = 1;
    s.current = 'c_charge';
    const v = view(content, s)!;
    expect(v.left.usesCharge).toBe(true);
    expect(v.left.preview.public).toBeUndefined();
    const pub = s.meters.public;
    const { events } = choose(content, s, 'left');
    expect(s.meters.public).toBe(pub);
    expect(s.charges.deescalation).toBe(0);
    expect(events.some((e) => e.type === 'charge_used')).toBe(true);
  });
  it('hides escalation costs in the preview with the Hawk General', () => {
    const s = run();
    s.pieces.push('p_hawk');
    s.current = 'c_basic';
    const v = view(content, s)!;
    expect(v.left.hiddenCosts).toContain('escalation');
    expect(v.left.preview.escalation).toBeUndefined();
    expect(v.left.preview.military).toBe(6);
  });
  it('uses the card timeout side on expiry', () => {
    const s = run();
    s.current = 'c_timer';
    const esc = s.meters.escalation;
    const { events } = choose(content, s, 'timeout');
    expect(s.meters.escalation).toBe(esc + 8);
    expect(s.stats.timeouts).toBe(1);
    expect(events[0].type).toBe('timeout');
  });
  it('forces endings from choices', () => {
    const s = run();
    s.current = 'c_end';
    choose(content, s, 'right');
    expect(s.ending).toBe('resigned');
  });
});

describe('acts and flashpoints', () => {
  it('runs act → flashpoint → offer → next act', () => {
    const s = run('acts');
    const events: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = choose(content, s, 'right');
      events.push(...r.events.map((e) => e.type));
    }
    expect(events).toContain('flashpoint_start');
    expect(s.flashpoint).toBe('fp_test');
    expect(s.current).toBe('fp_1');
    choose(content, s, 'right');
    expect(s.current).toBe('fp_2');
    const r = choose(content, s, 'right');
    expect(r.events.map((e) => e.type)).toContain('flashpoint_end');
    expect(s.phase).toBe('offer');
    expect(s.offer).toHaveLength(3);
    const picked = s.offer![0];
    const r2 = pickPiece(content, s, picked);
    expect(s.pieces).toContain(picked);
    expect(s.act).toBe(2);
    expect(r2.events.map((e) => e.type)).toContain('act_start');
    expect(s.phase).toBe('card');
  });
  it('uses the false-alarm entry when a false alarm is live', () => {
    const s = run('fa');
    s.flags.push('false_alarm_live');
    playUntil(s, (x) => x.flashpoint !== null);
    expect(s.current).toBe('fp_false');
  });
  it('never offers locked, held or excluded pieces', () => {
    for (let i = 0; i < 30; i++) {
      const s = run(`offer${i}`, { unlocked: [] });
      s.pieces.push('p_excl_a');
      playUntil(s, (x) => x.phase === 'offer');
      if (s.phase !== 'offer') continue;
      expect(s.offer).not.toContain('p_locked');
      expect(s.offer).not.toContain('p_excl_a');
      expect(s.offer).not.toContain('p_excl_b');
    }
  });
  it('reaches a run_end ending after the last act', () => {
    const s = run('end');
    playUntil(s, () => false, 'right');
    expect(s.phase).toBe('ended');
    expect(['standdown_quiet', 'survival_cold', 'fallback_standdown', 'fallback_survival', 'impeached', 'nuclear_war', 'launch']).toContain(s.ending);
    if (s.ending === 'standdown_quiet' || s.ending === 'survival_cold') expect(s.act).toBe(5);
  });
});

describe('serialisation', () => {
  it('resumes identically from JSON mid-run', () => {
    const a = run('resume');
    for (let i = 0; i < 4; i++) choose(content, a, i % 2 ? 'left' : 'right');
    const b = deserialise(serialise(a));
    for (let i = 0; i < 20; i++) {
      if (a.phase === 'offer') {
        pickPiece(content, a, a.offer![1]);
        pickPiece(content, b, b.offer![1]);
      } else if (a.phase === 'card') {
        choose(content, a, 'left');
        choose(content, b, 'left');
      }
      expect(serialise(b)).toBe(serialise(a));
    }
  });
  it('replays a whole run identically from the seed', () => {
    const play = () => {
      const s = run('replay');
      const sides: ('left' | 'right')[] = ['left', 'right', 'right', 'left'];
      let i = 0;
      while (s.phase !== 'ended' && i < 300) {
        if (s.phase === 'offer') pickPiece(content, s, s.offer![i % s.offer!.length]);
        else choose(content, s, sides[i % 4]);
        i++;
      }
      return serialise(s);
    };
    expect(play()).toBe(play());
  });
});

describe('buryCard', () => {
  it('spends a removal charge and draws another card', () => {
    const s = run('bury');
    s.pieces.push('p_fixer');
    s.charges.removal = 1;
    const before = s.current;
    buryCard(content, s);
    expect(s.charges.removal).toBe(0);
    expect(s.seen).toContain(before);
    expect(s.current).not.toBe(before);
    buryCard(content, s);
    expect(s.charges.removal).toBe(0);
  });
});
