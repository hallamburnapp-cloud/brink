/**
 * Regressions from the adversarial engine review: each test pins a bug that
 * was confirmed and fixed (commitment lock semantics, warning follow-ups in
 * flashpoints, mode checks in the fallback draw, injected `always` mults,
 * rule level merging).
 */
import { describe, expect, it } from 'vitest';
import { fixture } from './fixture';
import { choose, createRun, leaveShop, view } from './run';
import { resolveEffects, rules, type ModContext } from './modifiers';
import type { Content, PieceDef, RunState } from './types';

const content: Content = fixture();
const run = (seed = 'r'): RunState => createRun(content, { seed, seat: 'republic', mode: 'endless' });
const ctx = (pieces: PieceDef[]): ModContext => ({ pieces, act: content.acts[0], difficulty: content.difficulties[0] });
const mk = (id: string, modifiers: PieceDef['modifiers']): PieceDef => ({ ...content.pieces.p_hawk, id, modifiers });

describe('review regressions', () => {
  it('commitment_lock pieces add to the base trap instead of replacing it', () => {
    const s = run();
    s.hidden.commitment = 100;
    s.current = 'c_walkback';
    expect(view(content, s)!.left.preview.public).toBe(-20);
    s.pieces.push('p_spin');
    // lock 1 + 1 = 2 → -10 × (1 + 2) = -30, then Spin's ×0.5 damping → -15 (more than the -10 damping alone would give)
    expect(view(content, s)!.left.preview.public).toBe(-15);
  });

  it('a warning inside a flashpoint queues its follow-up immediately and never strands a flashpoint card', () => {
    const c = fixture();
    c.cards.fp_1.warning = { true_follow: 'fp_2', false_follow: 'fp_2', in: 3 };
    c.cards.fp_1.left.follow = undefined;
    c.cards.fp_1.right.follow = undefined;
    const s = createRun(c, { seed: 'fpw', seat: 'republic', mode: 'endless' });
    for (let i = 0; i < 40 && s.current !== 'fp_1' && s.phase !== 'ended'; i++) {
      if (s.phase === 'shop') leaveShop(c, s);
      else choose(c, s, 'right');
    }
    expect(s.current).toBe('fp_1');
    choose(c, s, 'right');
    expect(s.current).toBe('fp_2');
    expect(s.flashpoint).toBe('fp_test');
  });

  it('a stray flashpoint card in the queue outside its flashpoint is dropped, not played', () => {
    const s = run('stray');
    s.queue.push({ card: 'fp_2', in: 0 });
    s.current = 'c_filler';
    choose(content, s, 'right');
    expect(s.current).not.toBe('fp_2');
    expect(s.queue.some((q) => q.card === 'fp_2')).toBe(false);
  });

  it('the fallback draw respects modes and removed tags', () => {
    const c = fixture();
    for (const id of c.cardOrder) if (!c.cards[id].chained && !c.cards[id].flashpoint && !c.cards[id].bluff) c.cards[id].modes = ['challenge'];
    c.cards.c_filler.modes = undefined;
    c.cards.c_filler.tags = ['proxy'];
    const s = createRun(c, { seed: 'modes', seat: 'republic', mode: 'daily' });
    expect(s.current).toBe('c_filler');
    s.removedTags.push('proxy');
    choose(c, s, 'right');
    // nothing eligible → act ends into the ante/flashpoint rather than dealing a challenge-only card
    expect(s.current === null || c.cards[s.current!].flashpoint || c.cards[s.current!].bluff).toBeTruthy();
  });

  it('an injected `always` add still gets its own mult', () => {
    const p = mk('p', [{ kind: 'effect', key: 'allies', tags: ['deescalate'], add: -2, mult: 2, always: true }]);
    expect(resolveEffects({ escalation: -3 }, ['deescalate'], ctx([p]))).toEqual({ escalation: -3, allies: -4 });
    expect(resolveEffects({ allies: 4 }, ['deescalate'], ctx([p]))).toEqual({ allies: 4 });
  });

  it('level rules take the strongest value; count rules sum; discounts multiply', () => {
    const a = mk('a', [{ kind: 'rule', rule: 'warning_floor', value: 70 }, { kind: 'rule', rule: 'free_deescalation_per_act', value: 1 }, { kind: 'rule', rule: 'shop_discount', value: 0.8 }]);
    const b = mk('b', [{ kind: 'rule', rule: 'warning_floor', value: 50 }, { kind: 'rule', rule: 'free_deescalation_per_act', value: 1 }, { kind: 'rule', rule: 'shop_discount', value: 0.5 }]);
    const r = rules(ctx([a, b]));
    expect(r.get('warning_floor')).toBe(70);
    expect(r.get('free_deescalation_per_act')).toBe(2);
    expect(r.get('shop_discount')).toBeCloseTo(0.4);
  });
});
