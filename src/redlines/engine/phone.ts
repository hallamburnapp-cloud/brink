/**
 * The call: pick a template of the right kind from the content, fill its slots, and price BACK IT
 * for this round. Also which event, if any, rings when no promise was tested this week.
 */
import type { Rng } from '../../engine/rng.ts';
import type { PhoneTemplate, RedlinesContent } from './content.ts';
import { blockedLastWeek } from './agent.ts';
import { holdInfo, isAnswered, pieceAt, pressedRegions, promiseAt } from './board.ts';
import { RULES, fallWeeksAt } from './rules.ts';
import type { GameState, Line, Phone, PhoneKind, RegionId } from './types.ts';
import { fill, type Slots } from './words.ts';
import { NEAR_CAP, REGION, REGION_IDS, regionName } from './world.ts';

/** BUILD: 12 to back a holdable promise (6 once belief ≥ 60), 24 a non-holdable one; each WAIT adds the stakes. */
export function backCost(s: GameState, region: RegionId, round: number): number {
  const base = holdInfo(s, region).ok ? (s.fed.belief >= RULES.believedAt ? RULES.backCostBelieved : RULES.backCost) : RULES.backFarCost;
  return base + RULES.waitStakes * Math.max(0, round - 1);
}

/** What an answer costs in influence (0 when free). */
export function answerCost(s: GameState, key: 'back' | 'down' | 'wait'): number {
  const p = s.phone;
  if (!p) return 0;
  const E = RULES.events;
  switch (p.kind) {
    case 'test':
    case 'test-inherited':
    case 'feint':
      return key === 'back' && p.region ? backCost(s, p.region, p.round) : 0;
    case 'false-alarm':
      return key === 'back' ? E.alertCost : 0;
    case 'trawler':
      return key === 'back' ? E.trawlerBackCost : key === 'wait' ? E.trawlerLeanCost : 0;
    case 'summit':
      return key === 'back' ? E.summitAcceptCost : 0;
    case 'fall-unpromised':
      return key === 'back' ? E.unpromisedBackCost : 0;
    case 'bluff-crossed':
      return 0;
  }
}

/** A test's templates: one pool for a real push, a feint and an inherited promise alike (no tell); inherited first when it fits. */
function testPool(c: RedlinesContent, inherited: boolean): PhoneTemplate[] {
  const all = c.phones.filter((p) => p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint');
  if (inherited) {
    const own = all.filter((p) => p.kind === 'test-inherited');
    if (own.length) return own;
  }
  const notInherited = all.filter((p) => p.kind !== 'test-inherited');
  return notInherited.length ? notInherited : all;
}

export interface PhoneContext {
  kind: PhoneKind;
  region: RegionId | null;
  round: 1 | 2 | 3;
  line?: string;
}

/** The call, or null when the pack has no template for it. */
export function makePhone(c: RedlinesContent, s: GameState, rng: Rng, ctx: PhoneContext): Phone | null {
  const isTest = ctx.kind === 'test' || ctx.kind === 'test-inherited' || ctx.kind === 'feint';
  let pool = isTest ? testPool(c, !!(ctx.region && promiseAt(s, ctx.region)?.inherited)) : c.phones.filter((p) => p.kind === ctx.kind);
  if (!pool.length) return null;
  const last = s.phonesUsed[s.phonesUsed.length - 1];
  if (pool.length > 1 && last) pool = pool.filter((p) => p.id !== last).length ? pool.filter((p) => p.id !== last) : pool;
  const t = rng.pick(pool);
  const region = ctx.region;
  const cost = region && isTest ? backCost(s, region, ctx.round) : answerCost({ ...s, phone: { kind: ctx.kind } as Phone }, 'back');
  const other = s.fed.headings.find((h) => h.to !== region)?.to ?? region;
  const hold = region ? holdInfo(s, region) : null;
  const piece = hold?.piece ?? s.pieces[1] ?? s.pieces[0];
  const slots: Slots = {
    region: region ? regionName(region) : '',
    promise: region ? regionName(region) : '',
    line: ctx.line ?? '',
    cost,
    piece: c.strings.pieces[piece.kind],
    from: other ? regionName(other) : '',
    step: c.strings.words.steps[s.fed.step - 1],
  };
  const caller = c.advisers[t.caller];
  const waitCost = isTest && ctx.round >= 3 ? c.strings.words.waitIsBackDown : fill(t.options.wait.cost, slots);
  return {
    template: t.id,
    kind: isTest ? t.kind : ctx.kind,
    caller: { name: caller.name, role: caller.role, tag: caller.tag },
    text: fill(isTest && ctx.round > 1 && t.again ? t.again : t.text, slots),
    advisers: { hawk: fill(t.advisers.hawk, slots), dove: fill(t.advisers.dove, slots), intel: fill(t.advisers.intel, slots) },
    region,
    round: ctx.round,
    options: [
      { key: 'back', label: fill(t.options.back.label, slots), cost: fill(t.options.back.cost, slots) },
      { key: 'down', label: fill(t.options.down.label, slots), cost: fill(t.options.down.cost, slots) },
      { key: 'wait', label: fill(t.options.wait.label, slots), cost: waitCost },
    ],
  };
}

export interface EventPick {
  kind: PhoneKind;
  region: RegionId | null;
  line?: string;
}

/**
 * Which event rings this week, if any (at most RULES.events.maxPerGame a game), in this order: a bluff
 * you crossed (Wintermast's silence); a place nobody promised that will fall this week and a piece of
 * yours could reach; a summit offer (MASSING and above, the bar not empty); a false alarm (MASSING and
 * above); the trawler (an allied island, from week 2). Only kinds the pack has a template for.
 */
export function pickEvent(c: RedlinesContent, s: GameState, rng: Rng, bluff: { line: Line; region: RegionId } | null): EventPick | null {
  if (s.events >= RULES.events.maxPerGame) return null;
  const has = (k: PhoneKind) => c.phones.some((p) => p.kind === k);
  const E = RULES.events;
  if (bluff && has('bluff-crossed')) return { kind: 'bluff-crossed', region: bluff.region, line: bluff.line.text };
  const doomed = pressedRegions(s).filter((r) => !promiseAt(s, r) && !isAnswered(s, r) && s.regions[r].pressedWeeks >= fallWeeksAt(s.fed.step) && holdInfo(s, r).ok);
  if (doomed.length && has('fall-unpromised')) return { kind: 'fall-unpromised', region: doomed[0] };
  const stopped = s.fed.step >= 2 || blockedLastWeek(s);
  const summits = s.phonesUsed.filter((id) => c.phones.find((p) => p.id === id)?.kind === 'summit').length;
  if (summits < E.summitMax && s.week >= E.summitFromWeek && s.fed.step >= E.summitFromStep && s.fed.will >= E.summitMinWill && stopped && has('summit') && rng.next() < E.summitChance) return { kind: 'summit', region: null };
  if (s.fed.step >= E.falseAlarmFromStep && has('false-alarm') && rng.next() < E.falseAlarmChance) {
    const where = s.fed.headings.find((h) => h.real)?.to ?? NEAR_CAP[0];
    return { kind: 'false-alarm', region: where };
  }
  if (s.week >= E.trawlerFromWeek && has('trawler') && rng.next() < E.trawlerChance) {
    const isles = REGION_IDS.filter((r) => REGION[r].bloc === 'SCT' && REGION[r].port && s.regions[r].state !== 'fighting' && !pieceAt(s, r));
    if (isles.length) return { kind: 'trawler', region: rng.pick(isles) };
  }
  return null;
}
