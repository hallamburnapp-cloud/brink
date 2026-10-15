/**
 * The two bots of SPEC "Balance gates": random (a random button or tap, a random piece or none) and
 * sensible (the option whose preview leaves DANGER lowest once tonight's expected pressure is counted,
 * odds-weighted for a risk, ties towards cooling the hottest region; the piece that stacks with what
 * it holds). Each bot draws its own
 * randomness from an Rng the simulator gives it, so a game is reproducible from (seed, bot seed).
 */
import type { Rng } from '../../engine/rng.ts';
import type { Heat, PieceId, PieceTag, RegionId, ThirtyContent } from '../content/types.ts';
import { preview, todayOptions } from '../engine/preview.ts';
import { CRISIS, RULES, TENSE, WAR, crisisPressureAt, tensePressureAt } from '../engine/rules.ts';
import type { GameState, HeatChange, Preview } from '../engine/types.ts';

export type BotName = 'random' | 'sensible';
export const BOT_NAMES: readonly BotName[] = ['random', 'sensible'];

export function isBotName(x: string): x is BotName {
  return (BOT_NAMES as readonly string[]).includes(x);
}

export interface Bot {
  name: BotName;
  /** Which button or target today. */
  option(content: ThirtyContent, state: GameState, rng: Rng): 'left' | 'right' | RegionId;
  /** Which offered piece (an index), or null for none. */
  pick(content: ThirtyContent, state: GameState, rng: Rng): number | null;
}

export const randomBot: Bot = {
  name: 'random',
  option: (content, state, rng) => rng.pick(todayOptions(content, state)),
  pick: (_content, state, rng) => {
    const n = state.offer?.length ?? 0;
    const i = rng.int(n + 1);
    return i === n ? null : i;
  },
};

/** DANGER a preview expects after the choice: the two branches of a risk weighted by its odds. */
export function expectedDanger(p: Preview): number {
  if (p.odds === null || p.dangerIfMissed === null) return p.dangerAfter;
  const q = p.odds / 100;
  return q * p.dangerAfter + (1 - q) * p.dangerIfMissed;
}

/** The map after these changes. */
function heatsAfter(heats: Readonly<Record<RegionId, Heat>>, changes: readonly HeatChange[]): Record<RegionId, Heat> {
  const out = { ...heats };
  for (const c of changes) out[c.region] = c.to;
  return out;
}

/**
 * What tonight's pressure is expected to add to DANGER on this map: a WAR region spreads for sure, a
 * CRISIS region with the day's odds, a TENSE region boils with the day's odds (flares fall on every
 * map alike and are left out). The sensible bot sees red spread the way the player does.
 */
export function expectedPressure(heats: Readonly<Record<RegionId, Heat>>, day: number): number {
  const crisis = crisisPressureAt(day);
  const tense = tensePressureAt(day);
  let total = 0;
  for (const h of Object.values(heats)) {
    if (h === WAR) total += RULES.warSpreads * 2.5;
    else if (h === CRISIS) total += crisis * 2.5;
    else if (h === TENSE) total += tense * 3;
  }
  return total;
}

/** The bot's view of an option: DANGER after the choice plus the pressure the map then invites, odds-weighted. */
export function expectedCost(p: Preview, state: GameState): number {
  const held = p.dangerAfter + expectedPressure(heatsAfter(state.heats, p.changes), state.day);
  if (p.odds === null || p.dangerIfMissed === null || !p.changesIfMissed) return held;
  const q = p.odds / 100;
  const missed = p.dangerIfMissed + expectedPressure(heatsAfter(state.heats, p.changesIfMissed), state.day);
  return q * held + (1 - q) * missed;
}

/** The hottest heat an option cools from (its tie-breaker: cool the worst place first). */
function hottestCooled(p: Preview): number {
  let best = -1;
  for (const c of p.changes) if (c.to < c.from && c.from > best) best = c.from;
  return best;
}

/** How well a piece stacks with the team: a point per shared tag with each held piece (`any` stacks with everything for half a point). */
export function stackScore(content: ThirtyContent, team: readonly PieceId[], piece: PieceId): number {
  const tags = new Set<PieceTag>(content.pieces[piece]?.tags ?? []);
  let score = 0;
  for (const held of team) {
    const other = content.pieces[held]?.tags ?? [];
    if (tags.has('any') || other.includes('any')) score += 0.5;
    for (const t of other) if (tags.has(t)) score += 1;
  }
  return score;
}

/** The other pieces in the pack this one could later stack with (a shared tag, neither excluding the other). */
export function partners(content: ThirtyContent, piece: PieceId): number {
  const me = content.pieces[piece];
  if (!me) return 0;
  const tags = new Set<PieceTag>(me.tags);
  let n = 0;
  for (const id of content.pieceOrder) {
    if (id === piece || me.excludes.includes(id)) continue;
    const other = content.pieces[id];
    if (other.excludes.includes(piece)) continue;
    if (other.tags.some((t) => t !== 'any' && tags.has(t))) n++;
  }
  return n;
}

export const sensibleBot: Bot = {
  name: 'sensible',
  option: (content, state, rng) => {
    const options = todayOptions(content, state);
    let best: { option: 'left' | 'right' | RegionId; danger: number; cooled: number }[] = [];
    for (const o of options) {
      const p = preview(content, state, o);
      if (!p) continue;
      const row = { option: o, danger: expectedCost(p, state), cooled: hottestCooled(p) };
      if (!best.length || row.danger < best[0].danger - 1e-9) best = [row];
      else if (Math.abs(row.danger - best[0].danger) <= 1e-9) best.push(row);
    }
    if (!best.length) return options[0];
    const top = Math.max(...best.map((b) => b.cooled));
    const tied = best.filter((b) => b.cooled === top);
    return tied.length === 1 ? tied[0].option : rng.pick(tied).option;
  },
  pick: (content, state, rng) => {
    const offer = state.offer ?? [];
    if (!offer.length) return null;
    // Nothing held yet: lean to the pieces that build (the spec's "takes stacking pieces"), weighted by their partners.
    if (!state.team.length) return Math.max(0, rng.weightedIndex(offer.map((p) => 1 + partners(content, p))));
    const scores = offer.map((p) => stackScore(content, state.team, p));
    const top = Math.max(...scores);
    const tied = offer.map((_, i) => i).filter((i) => scores[i] === top);
    return tied.length === 1 ? tied[0] : rng.pick(tied);
  },
};

export const BOTS: Readonly<Record<BotName, Bot>> = { random: randomBot, sensible: sensibleBot };
