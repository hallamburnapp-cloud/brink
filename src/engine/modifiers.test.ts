import { describe, expect, it } from 'vitest';
import { fixture } from './fixture';
import { resolveEffect, resolveEffects, resolveIntel, resolveOdds, resolveTimer, resolveWeight, escalationBounds, type ModContext } from './modifiers';
import type { PieceDef } from './types';

const content = fixture();
const ctx = (pieces: PieceDef[], act = 1, difficulty = 5): ModContext => ({
  pieces,
  act: content.acts[act - 1],
  difficulty: content.difficulties.find((d) => d.level === difficulty)!,
});
const mk = (id: string, modifiers: PieceDef['modifiers']): PieceDef => ({ ...content.pieces.p_hawk, id, modifiers });

describe('resolveEffect ordering', () => {
  it('sums adds before multiplying, regardless of piece order', () => {
    const a = mk('a', [{ kind: 'effect', key: 'public', add: -2 }]);
    const b = mk('b', [{ kind: 'effect', key: 'public', mult: 2 }]);
    const ab = resolveEffect('public', -5, [], ctx([a, b])).value;
    const ba = resolveEffect('public', -5, [], ctx([b, a])).value;
    expect(ab).toBe(-14); // (-5 + -2) × 2
    expect(ba).toBe(ab);
  });
  it('never flips the sign with additive modifiers', () => {
    const a = mk('a', [{ kind: 'effect', key: 'public', add: 12 }]);
    expect(resolveEffect('public', -5, [], ctx([a])).value).toBe(0);
    expect(resolveEffect('public', 5, [], ctx([a])).value).toBe(17);
  });
  it('applies tag and sign filters', () => {
    const a = mk('a', [{ kind: 'effect', key: 'military', tags: ['military'], sign: 'pos', mult: 1.5 }]);
    expect(resolveEffect('military', 4, ['military'], ctx([a])).value).toBe(6);
    expect(resolveEffect('military', 4, ['naval'], ctx([a])).value).toBe(4);
    expect(resolveEffect('military', -4, ['military'], ctx([a])).value).toBe(-4);
  });
  it('scales costs by act × difficulty but not benefits', () => {
    const c = ctx([], 5, 1); // 1.5 × 1.5 = 2.25
    expect(resolveEffect('public', -4, [], c).value).toBeCloseTo(-9);
    expect(resolveEffect('public', 4, [], c).value).toBe(4);
    expect(resolveEffect('escalation', 4, [], c).value).toBeCloseTo(9);
    expect(resolveEffect('escalation', -4, [], c).value).toBe(-4);
    // hidden values are never scaled
    expect(resolveEffect('trust_primary', -4, [], c).value).toBe(-4);
  });
  it('group keys match meters / hidden / trust', () => {
    const a = mk('a', [{ kind: 'effect', key: 'trust', mult: 2 }, { kind: 'effect', key: 'meters', add: -1 }]);
    expect(resolveEffect('trust_secondary', -5, [], ctx([a])).value).toBe(-10);
    expect(resolveEffect('economy', -5, [], ctx([a])).value).toBe(-6);
    expect(resolveEffect('intel', -5, [], ctx([a])).value).toBe(-5);
  });
});

describe('resolveEffects with always', () => {
  it('injects a new effect once and lets other multipliers act on it', () => {
    const dove = content.pieces.p_dove; // allies -2 always on deescalate
    const half = mk('half', [{ kind: 'effect', key: 'allies', mult: 0.5 }]);
    expect(resolveEffects({ escalation: -3 }, ['deescalate'], ctx([dove]))).toEqual({ escalation: -6, allies: -2 });
    expect(resolveEffects({ escalation: -3 }, ['deescalate'], ctx([dove, half]))).toEqual({ escalation: -6, allies: -1 });
    // not injected when tags do not match
    expect(resolveEffects({ escalation: 3 }, ['military'], ctx([dove]))).toEqual({ escalation: 3 });
    // when the key is already present it behaves as a normal add
    expect(resolveEffects({ allies: 4 }, ['deescalate'], ctx([dove]))).toEqual({ allies: 2 });
  });
  it('rounds half away from zero and drops zeros', () => {
    const a = mk('a', [{ kind: 'effect', key: 'public', mult: 0.5 }]);
    expect(resolveEffects({ public: -5, economy: 0 }, [], ctx([a]))).toEqual({ public: -3 });
  });
});

describe('odds, intel, timer, weight', () => {
  const hidden = { trust_primary: 50, trust_secondary: 50, intel: 70, commitment: 30 };
  it('adds then multiplies and clamps odds', () => {
    const a = mk('a', [{ kind: 'odds', tags: ['adversary'], add: 0.2 }, { kind: 'odds', mult: 1.5 }]);
    expect(resolveOdds(0.5, ['adversary'], ctx([a]), hidden).p).toBeCloseTo(0.97);
    expect(resolveOdds(0.5, ['other'], ctx([a]), hidden).p).toBeCloseTo(0.75);
    expect(resolveOdds(0.05, [], ctx([mk('b', [{ kind: 'odds', add: -0.4 }])]), hidden).p).toBe(0.03);
  });
  it('trust and intel shift adversary and intel rolls', () => {
    expect(resolveOdds(0.5, ['adversary'], ctx([]), { ...hidden, trust_primary: 90 }).p).toBeCloseTo(0.7);
    expect(resolveOdds(0.5, ['adversary'], ctx([]), { ...hidden, trust_primary: 10 }).p).toBeCloseTo(0.3);
    expect(resolveOdds(0.5, ['intel'], ctx([]), { ...hidden, intel: 30 }).p).toBeCloseTo(0.4);
  });
  it('intel reliability includes act and difficulty shifts and clamps', () => {
    expect(resolveIntel(70, ctx([]))).toBe(70);
    expect(resolveIntel(70, ctx([], 5, 1))).toBe(30);
    expect(resolveIntel(70, ctx([mk('a', [{ kind: 'intel', add: 40 }])]))).toBe(95);
  });
  it('timers scale and clamp', () => {
    expect(resolveTimer(10, ctx([]))).toBe(10);
    expect(resolveTimer(10, ctx([], 5, 1))).toBe(4);
    expect(resolveTimer(10, ctx([mk('a', [{ kind: 'timer', mult: 0.5 }])]))).toBe(5);
    expect(resolveTimer(undefined, ctx([]))).toBeNull();
  });
  it('weights multiply by tag or id and warning_frequency', () => {
    const a = mk('a', [{ kind: 'weight', tags: ['naval'], mult: 2 }, { kind: 'weight', ids: ['x'], mult: 3 }, { kind: 'rule', rule: 'warning_frequency', value: 1 }]);
    expect(resolveWeight(1, 'y', ['naval'], ctx([a]))).toBe(2);
    expect(resolveWeight(1, 'x', [], ctx([a]))).toBe(3);
    expect(resolveWeight(1, 'y', ['warning'], ctx([a]))).toBe(2);
  });
  it('escalation bounds combine floors and ceilings', () => {
    const a = mk('a', [{ kind: 'floor', value: 30 }, { kind: 'ceiling', value: 95 }]);
    expect(escalationBounds(ctx([a]), 10)).toEqual({ floor: 30, ceiling: 95 });
    expect(escalationBounds(ctx([]), 40)).toEqual({ floor: 40, ceiling: 100 });
  });
});
