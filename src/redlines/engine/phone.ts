/**
 * The call: pick a template of the right kind from the content, fill its slots, and price BACK IT
 * for this round. Also which event, if any, rings when no promise was tested this week.
 */
import type { Rng } from '../../engine/rng.ts';
import type { PhoneTemplate, RedlinesContent } from './content.ts';
import { blockedLastWeek, wayOutTooSoon } from './agent.ts';
import { clockOf, holdInfo, isAnswered, nearestPiece, pieceAt, pressedRegions, promiseAt, stepAtWeekStart, unansweredRegions } from './board.ts';
import { RULES } from './rules.ts';
import type { GameState, Line, Phone, PhoneKind, RegionId } from './types.ts';
import { fill, listNames, type Slots } from './words.ts';
import { leavesToFall, withRing } from './forecast.ts';
import { NEAR_CAP, REGION, REGION_IDS, regionName } from './world.ts';

/**
 * What BACK IT would cost on the first round if a ring drawn here now were tested (SPEC-SMALL "A provocation costs what it
 * claims" and the cold recheck: the price is on the PROMISE slip before it is paid): the full price for a ring drawn into
 * their siege, the far price for a dashed one, the believed price for a solid ring they believe.
 */
export function ringBackCost(s: GameState, region: RegionId): number {
  return backCost(withRing(s, region), region, 1);
}

/** BUILD: 12 to back a holdable promise (6 once belief ≥ 40), 24 a non-holdable one; each WAIT adds the stakes. */
export function backCost(s: GameState, region: RegionId, round: number): number {
  // SPEC-SMALL "A provocation costs what it claims": a ring drawn into their siege is backed at the full price, whatever they believe.
  const provoked = RULES.provocationFullPrice && !!promiseAt(s, region)?.provocation;
  const base = holdInfo(s, region).ok ? (s.fed.belief >= RULES.believedAt && !provoked ? RULES.backCostBelieved : RULES.backCost) : RULES.backFarCost;
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

/**
 * A test's templates: one pool for a real push, a feint and an inherited promise alike (no tell); inherited first when
 * it fits. Only templates whose words fit the place (`place`: ships off an island, never off a land place).
 */
function testPool(c: RedlinesContent, inherited: boolean, region: RegionId | null): PhoneTemplate[] {
  const tests = c.phones.filter((p) => p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint');
  const place = region ? (REGION[region]?.island ? 'island' : 'land') : null;
  const fits = tests.filter((p) => !p.place || !place || p.place === place);
  const all = fits.length ? fits : tests;
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

/** The trawler templates that fit an island you promised (or did not): `when` on the template, absent means either. */
export function trawlerPool(c: RedlinesContent, promised: boolean): PhoneTemplate[] {
  return c.phones.filter((p) => p.kind === 'trawler' && (!p.when || p.when === (promised ? 'promised' : 'unpromised')));
}

/**
 * The call, or null when the pack has no template for it. The second and third round of a carried test
 * keep the first round's template (its own `again` text, its own caller and advisers): one crisis, one voice.
 */
export function makePhone(c: RedlinesContent, s: GameState, rng: Rng, ctx: PhoneContext): Phone | null {
  const isTest = ctx.kind === 'test' || ctx.kind === 'test-inherited' || ctx.kind === 'feint';
  let pool = isTest ? testPool(c, !!(ctx.region && promiseAt(s, ctx.region)?.inherited), ctx.region) : ctx.kind === 'trawler' ? trawlerPool(c, !!(ctx.region && promiseAt(s, ctx.region))) : c.phones.filter((p) => p.kind === ctx.kind);
  if (!pool.length) return null;
  const last = s.phonesUsed[s.phonesUsed.length - 1];
  const carried = isTest && ctx.round > 1 ? c.phones.find((p) => p.id === last && (p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint')) : undefined;
  if (!carried && pool.length > 1 && last) pool = pool.filter((p) => p.id !== last).length ? pool.filter((p) => p.id !== last) : pool;
  const t = carried ?? rng.pick(pool);
  const region = ctx.region;
  const cost = region && isTest ? backCost(s, region, ctx.round) : answerCost({ ...s, phone: { kind: ctx.kind } as Phone }, 'back');
  const other = s.fed.headings.find((h) => h.to !== region)?.to ?? region;
  // The piece the call names: the one that holds the place, else the nearest by its own routes (never the brigade
  // for an island it cannot reach).
  const piece = region ? nearestPiece(s, region) : s.pieces[1] ?? s.pieces[0];
  const slots: Slots = {
    region: region ? regionName(region) : '',
    promise: region ? regionName(region) : '',
    line: ctx.line ?? '',
    cost,
    waitCost: answerCost({ ...s, phone: { kind: isTest ? 'test' : ctx.kind, region, round: ctx.round } as Phone }, 'wait'),
    piece: c.strings.pieces[piece.kind],
    from: other ? regionName(other) : '',
    step: c.strings.words.steps[s.fed.step - 1],
  };
  const caller = c.advisers[t.caller];
  // The WAIT form says what BACK IT will cost next week (each WAIT raises it): the price is on the call before it rises,
  // read with the belief the WAIT itself costs (a price at the believed rate can step up to the full one).
  const waited: GameState = { ...s, fed: { ...s.fed, belief: Math.max(0, s.fed.belief - RULES.waitBelief) }, beliefWas: Math.max(0, s.fed.belief - RULES.waitBelief) };
  const waitNext = isTest && region && c.strings.words.waitNext ? ` · ${fill(c.strings.words.waitNext, { cost: backCost(waited, region, ctx.round + 1) })}` : '';
  const waitCost = isTest && ctx.round >= 3 ? c.strings.words.waitIsBackDown : fill(t.options.wait.cost, slots) + waitNext;
  // SEND THEM about a place nobody promised moves a piece: when that piece answers a place at its last tick, the form says it leaves it to fall.
  const sender = ctx.kind === 'fall-unpromised' && region ? holdInfo(s, region).piece : undefined;
  const leaves = sender && c.strings.words.leavesToFall ? leavesToFall(s, sender.kind, region!) : [];
  const backCostLine = fill(t.options.back.cost, slots) + (leaves.length ? ` · ${fill(c.strings.words.leavesToFall, { region: listNames(leaves) })}` : '');
  // A carried call's slips are a week on (againAdvisers); the Director's slip, while they doubt your promises, says
  // what she has seen of it (SPEC-SMALL "Doubt is visible where it matters").
  const slips = isTest && ctx.round >= 3 && t.lastAdvisers ? t.lastAdvisers : isTest && ctx.round > 1 && t.againAdvisers ? t.againAdvisers : t.advisers;
  const intel = isTest && s.fed.belief < RULES.beliefTest && t.intelDoubted ? t.intelDoubted : slips.intel;
  return {
    template: t.id,
    kind: isTest ? t.kind : ctx.kind,
    caller: { name: caller.name, role: caller.role, tag: caller.tag },
    text: fill(isTest && ctx.round >= 3 && t.lastAgain ? t.lastAgain : isTest && ctx.round > 1 && t.again ? t.again : t.text, slots),
    advisers: { hawk: fill(slips.hawk, slots), dove: fill(slips.dove, slots), intel: fill(intel, slots) },
    region,
    round: ctx.round,
    options: [
      { key: 'back', label: fill(t.options.back.label, slots), cost: backCostLine },
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
 * yours could reach; their summit offer (from week 4, the bar not empty, never in a week you have a way
 * out on the table yourself: two summits in one week contradict each other); a false alarm (PUSHING and
 * above); the trawler (an allied island, from week 2: one under a ring of yours when there is one, with a
 * template that may speak of the promise; otherwise one you never promised, with a template that claims
 * none). Only kinds the pack has a template for.
 */
export function pickEvent(c: RedlinesContent, s: GameState, rng: Rng, bluff: { line: Line; region: RegionId } | null): EventPick | null {
  // `bluff`: a line crossed this week, the bluff or a real one (SPEC-SMALL "The bluff is not a free read": both ring the same call).
  if (s.events >= RULES.events.maxPerGame) return null;
  const has = (k: PhoneKind) => c.phones.some((p) => p.kind === k);
  const E = RULES.events;
  if (bluff && has('bluff-crossed')) return { kind: 'bluff-crossed', region: bluff.region, line: bluff.line.text };
  const doomed = pressedRegions(s).filter((r) => !promiseAt(s, r) && !isAnswered(s, r) && s.regions[r].pressedWeeks >= clockOf(s, r) && holdInfo(s, r).ok);
  if (doomed.length && has('fall-unpromised')) return { kind: 'fall-unpromised', region: doomed[0] };
  const stopped = s.fed.step >= 2 || blockedLastWeek(s);
  const summits = s.phonesUsed.filter((id) => c.phones.find((p) => p.id === id)?.kind === 'summit').length;
  // Their own summit: never in a week you have a way out on the table, never the week after a way out was accepted (one
  // in any two weeks), and less often while places they press stand unanswered (they do not talk while they are winning).
  const summitChance = E.summitChance * Math.pow(RULES.wayOut.unansweredScale, unansweredRegions(s, RULES.wayOutReachOnly && RULES.standingReach).length);
  if (!s.offer && !wayOutTooSoon(s) && summits < E.summitMax && s.week >= E.summitFromWeek && s.fed.step >= E.summitFromStep && s.fed.will >= E.summitMinWill && stopped && has('summit') && rng.next() < summitChance) return { kind: 'summit', region: null };
  if (s.fed.step >= E.falseAlarmFromStep && has('false-alarm') && rng.next() < E.falseAlarmChance) {
    const where = s.fed.headings.find((h) => h.real)?.to ?? NEAR_CAP[0];
    return { kind: 'false-alarm', region: where };
  }
  if (s.week >= E.trawlerFromWeek && has('trawler') && rng.next() < E.trawlerChance) {
    const isles = REGION_IDS.filter((r) => REGION[r].bloc === 'SCT' && REGION[r].port && s.regions[r].state !== 'fighting' && !pieceAt(s, r) && s.pendingTest !== r);
    const promised = isles.filter((r) => promiseAt(s, r));
    const pick = (pool: RegionId[]) => (pool.length ? rng.pick(pool) : null);
    const region = promised.length && trawlerPool(c, true).length ? pick(promised) : trawlerPool(c, false).length ? pick(isles.filter((r) => !promiseAt(s, r))) : null;
    if (region) return { kind: 'trawler', region };
  }
  return null;
}

export { stepAtWeekStart };
