/**
 * Meta unlocks, evaluated once at the end of every run from the final
 * RunState, the ending reached and lifetime stats. Ids match the `unlock:`
 * entries in content/pieces, content/seats and content/rules.yaml exactly.
 */
import { FEATURES } from '../config';
import type { Content, EndingDef, HistoryEntry, RunState } from '../engine/types';
import type { Stats } from './stats';
import { load, remove, save } from './storage';

const KEY = 'brink.unlocks';

export type UnlockKind = 'seat' | 'piece' | 'difficulty' | 'other';

export interface UnlockCtx {
  state: RunState;
  content: Content;
  ending: EndingDef | null;
  /** Lifetime stats, after this run has been recorded. */
  stats: Stats;
}

export interface UnlockDef {
  id: string;
  kind: UnlockKind;
  label: string;
  hint: string;
  check: (ctx: UnlockCtx) => boolean;
}

const isStanddown = (e: EndingDef | null): boolean => e?.kind === 'standdown';
const isSafe = (e: EndingDef | null): boolean => e?.kind === 'standdown' || e?.kind === 'survival';
const runEnded = (ctx: UnlockCtx): boolean => ctx.state.phase === 'ended' || ctx.ending !== null;

/** Tags of the choice actually taken for a history entry (resolving timeouts to the card's timeout side). */
export function chosenTags(content: Content, entry: HistoryEntry): string[] {
  const card = content.cards[entry.card];
  if (!card) return [];
  const side = entry.side === 'timeout' ? (card.timeout ?? 'right') : entry.side;
  return card[side]?.tags ?? [];
}

function maxEscalation(state: RunState): number {
  let m = -Infinity;
  for (const t of state.trail) if (t[4] > m) m = t[4];
  return m === -Infinity ? state.meters.escalation : Math.max(m, state.meters.escalation);
}

export const UNLOCKS: UnlockDef[] = [
  // Seats
  {
    id: 'seat_federation',
    kind: 'seat',
    label: 'The Federation',
    hint: 'Survive to Week Three once.',
    check: ({ state }) => state.act >= 3,
  },
  {
    id: 'seat_coalition',
    kind: 'seat',
    label: 'The Coalition',
    hint: 'Reach any Stand-Down or Survival ending.',
    check: ({ ending }) => isSafe(ending),
  },
  // Difficulties
  {
    id: 'defcon_4',
    kind: 'difficulty',
    label: 'DEFCON 4',
    hint: 'Survive to Week Four once.',
    check: ({ state }) => state.act >= 4,
  },
  {
    id: 'defcon_3',
    kind: 'difficulty',
    label: 'DEFCON 3',
    hint: 'Reach any Stand-Down ending.',
    check: ({ ending }) => isStanddown(ending),
  },
  {
    id: 'defcon_2',
    kind: 'difficulty',
    label: 'DEFCON 2',
    hint: 'Reach Stand-Down at DEFCON 3 or harder.',
    check: ({ state, ending }) => isStanddown(ending) && state.difficulty <= 3,
  },
  {
    id: 'defcon_1',
    kind: 'difficulty',
    label: 'DEFCON 1',
    hint: 'Reach Stand-Down at DEFCON 2 or harder.',
    check: ({ state, ending }) => isStanddown(ending) && state.difficulty <= 2,
  },
  // Pieces
  {
    id: 'arsenal',
    kind: 'piece',
    label: 'The Defence Contractor',
    hint: 'Reach Week Four with military above 80.',
    check: ({ state }) => state.act >= 4 && state.trail.some((t) => t[1] > 80),
  },
  {
    id: 'false_alarm_survivor',
    kind: 'piece',
    label: 'Launch on Warning',
    hint: 'Survive a false alarm that reached a flashpoint.',
    check: ({ state, ending }) => state.seen.some((id) => id.startsWith('fp_intercept_fa')) && ending?.kind !== 'nuclear',
  },
  {
    id: 'limited_striker',
    kind: 'piece',
    label: 'Escalate to De-escalate',
    hint: 'Order a limited strike and survive to the next act.',
    check: ({ state, content }) => state.history.some((h) => h.act < state.act && chosenTags(content, h).includes('limited_strike')),
  },
  {
    id: 'late_hands',
    kind: 'piece',
    label: 'Pre-delegation',
    hint: 'Let five timers expire in one run and survive it.',
    check: ({ state, ending }) => state.stats.timeouts >= 5 && isSafe(ending),
  },
  {
    id: 'cool_head',
    kind: 'piece',
    label: 'Minimal Deterrence',
    hint: 'Finish a run in which escalation never passed 50.',
    check: (ctx) => runEnded(ctx) && ctx.state.act >= 3 && maxEscalation(ctx.state) <= 50,
  },
  {
    id: 'low_survivor',
    kind: 'piece',
    label: 'Hardened NC3',
    hint: 'Survive to Week Three with Launch on Warning.',
    check: ({ state }) => state.pieces.includes('launch_on_warning') && state.act >= 3,
  },
  {
    id: 'bankrupt',
    kind: 'piece',
    label: 'Commercial Satellite Deal',
    hint: 'Lose a run to economic collapse.',
    check: ({ ending }) => !!ending && ending.trigger.type === 'meter' && ending.trigger.key === 'economy' && ending.trigger.at === 0,
  },
  {
    id: 'no_backchannel_standdown',
    kind: 'piece',
    label: 'Signals Intercept',
    hint: 'Reach Stand-Down without a Back-Channel.',
    check: ({ state, ending }) => isStanddown(ending) && !state.pieces.includes('back_channel'),
  },
  {
    id: 'five_endings',
    kind: 'piece',
    label: 'The Chief of Staff',
    hint: 'See five different endings.',
    check: ({ stats }) => Object.keys(stats.endingsSeen).length >= 5,
  },
  {
    id: 'unloved_peacemaker',
    kind: 'piece',
    label: 'The Peace Movement Leader',
    hint: 'Reach Stand-Down with public support below 35.',
    check: ({ state, ending }) => isStanddown(ending) && state.meters.public < 35,
  },
];

const KNOWN = new Set(UNLOCKS.map((u) => u.id));

function persisted(): string[] {
  const raw = load<unknown>(KEY, []);
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) if (typeof id === 'string' && !out.includes(id)) out.push(id);
  return out;
}

/**
 * Evaluate every unlock against the finished run and persist the new ones.
 * Returns the ids unlocked by this run (empty if nothing new). Evaluation is
 * independent of FEATURES.allUnlocked so progress is still tracked on builds
 * that ship with everything open.
 */
export function evaluateUnlocks(ctx: UnlockCtx): string[] {
  const have = persisted();
  const fresh: string[] = [];
  for (const u of UNLOCKS) {
    if (have.includes(u.id)) continue;
    let ok = false;
    try {
      ok = u.check(ctx);
    } catch {
      ok = false;
    }
    if (ok) fresh.push(u.id);
  }
  if (fresh.length) save(KEY, [...have, ...fresh]);
  return fresh;
}

/** True when the build has everything open, or the player has earned this unlock. */
export function isUnlocked(id: string): boolean {
  if (FEATURES.allUnlocked) return true;
  return persisted().includes(id);
}

/** Ids the player has actually earned (persisted), regardless of FEATURES.allUnlocked. */
export function unlockedIds(): string[] {
  return persisted();
}

/** What to hand createRun as `unlocked`. */
export function unlockedForRun(): string[] | 'all' {
  return FEATURES.allUnlocked ? 'all' : unlockedIds();
}

export function unlockProgress(): { total: number; unlocked: number } {
  const earned = persisted().filter((id) => KNOWN.has(id));
  return { total: UNLOCKS.length, unlocked: earned.length };
}

export function unlockDef(id: string): UnlockDef | undefined {
  return UNLOCKS.find((u) => u.id === id);
}

export function __resetUnlocksForTests(): void {
  remove(KEY);
}
