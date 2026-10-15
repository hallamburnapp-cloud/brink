/**
 * The game (SPEC "The rules"): a new game, the day (choose or tap, pressure, the ending check, the
 * team offer, the next card), the team pick. Every action takes a state and returns a Result holding
 * a NEW state, or the same state and a short reason when the action is refused.
 */
import { Rng } from '../../engine/rng.ts';
import type { Card, Heat, ThirtyContent } from '../content/types.ts';
import { dealCard, drawOffer, hasRedLineCard, hottestRegion, queueFollows } from './deck.ts';
import { pressure } from './pressure.ts';
import { actOf, resolve, type Act } from './resolve.ts';
import { CALM, CRISIS, RULES, TENSE, dangerOf, isOfferDay } from './rules.ts';
import type { DayTrace, Ending, GameState, RegionId, Result, Streams } from './types.ts';
import { HOME_REGIONS, REGION_IDS } from './world.ts';
import { Working } from './working.ts';

const ok = (state: GameState): Result => ({ ok: true, state });
const no = (state: GameState, reason: string): Result => ({ ok: false, state, reason });

/** A copy safe to change. Traces and picks never change once made, so they are shared. */
export function draft(s: GameState): GameState {
  return {
    ...s,
    heats: { ...s.heats },
    team: [...s.team],
    warned: [...s.warned],
    guarded: { ...s.guarded },
    card: s.card && { ...s.card, arrival: [...s.card.arrival] },
    offer: s.offer && [...s.offer],
    picks: [...s.picks],
    deck: {
      used: [...s.deck.used],
      queue: s.deck.queue.map((q) => ({ ...q })),
      lastCardDay: { ...s.deck.lastCardDay },
      hotSince: { ...s.deck.hotSince },
      lastMapDay: s.deck.lastMapDay,
    },
    rng: { world: [...s.rng.world], deal: [...s.rng.deal], odds: [...s.rng.odds], pressure: [...s.rng.pressure], offer: [...s.rng.offer] },
    log: [...s.log],
  };
}

function streams(seed: string): Streams {
  const root = new Rng(seed);
  return {
    world: root.fork('world').snapshot(),
    deal: root.fork('deal').snapshot(),
    odds: root.fork('odds').snapshot(),
    pressure: root.fork('pressure').snapshot(),
    offer: root.fork('offer').snapshot(),
  };
}

/** The starting map: one CRISIS and three TENSE regions, seeded, never in Highmarch (SPEC "Regions"). */
export function startingHeats(seed: string): { heats: Record<RegionId, Heat>; rng: Streams } {
  const rng = streams(seed);
  const world = new Rng(rng.world);
  const heats: Record<RegionId, Heat> = Object.fromEntries(REGION_IDS.map((r) => [r, CALM]));
  const abroad = world.shuffle(REGION_IDS.filter((r) => !HOME_REGIONS.includes(r)));
  for (let i = 0; i < RULES.startCrisis; i++) heats[abroad[i]] = CRISIS;
  for (let i = 0; i < RULES.startTense; i++) heats[abroad[RULES.startCrisis + i]] = TENSE;
  rng.world = world.snapshot();
  return { heats, rng };
}

export function newGame(content: ThirtyContent, seed: string): GameState {
  if (!content.cardOrder.length) throw new Error('the pack has no cards');
  const { heats, rng } = startingHeats(seed);
  const s: GameState = {
    version: 1,
    seed,
    day: 1,
    phase: 'choose',
    heats,
    penalty: 0,
    team: [],
    redLine: null,
    warned: [],
    guarded: {},
    hotlineWeek: null,
    homeDay: null,
    card: null,
    offer: null,
    picks: [],
    deck: { used: [], queue: [], lastCardDay: {}, hotSince: {}, lastMapDay: 0 },
    rng,
    log: [],
    ending: null,
    peak: dangerOf(heats, 0),
  };
  s.card = dealCard(content, s);
  noteHot(s);
  return s;
}

/** Keep the day each region became hot, for the two-day card guarantee. */
function noteHot(s: GameState): void {
  for (const r of REGION_IDS) {
    if (s.heats[r] >= CRISIS) s.deck.hotSince[r] ??= s.day;
    else delete s.deck.hotSince[r];
  }
}

function todays(content: ThirtyContent, s: GameState): Card | null {
  return s.card ? content.cards[s.card.id] ?? null : null;
}

/** Choose a side of today's card. */
export function choose(content: ThirtyContent, state: GameState, side: 'left' | 'right'): Result {
  if (state.phase !== 'choose') return no(state, state.phase === 'offer' ? 'pick a piece first' : 'the game is over');
  const card = todays(content, state);
  if (!card) return no(state, 'no card today');
  if (card.map) return no(state, 'tap a place on the map');
  const act = actOf(card, side);
  if (!act) return no(state, 'no such choice');
  return playDay(content, state, card, act);
}

/** Tap a glowing region on a map day. */
export function tapRegion(content: ThirtyContent, state: GameState, region: RegionId): Result {
  if (state.phase !== 'choose') return no(state, state.phase === 'offer' ? 'pick a piece first' : 'the game is over');
  const card = todays(content, state);
  if (!card) return no(state, 'no card today');
  if (!card.map) return no(state, 'choose a side');
  const act = actOf(card, region);
  if (!act) return no(state, 'that place is not offered today');
  return playDay(content, state, card, act);
}

function playDay(content: ThirtyContent, s0: GameState, card: Card, act: Act): Result {
  const s = draft(s0);
  const dealt = s.card!;
  const w = new Working(s);
  w.checkpoint('start');
  const dangerBefore = w.danger();

  const res = resolve(w, card, dealt, act);
  if (res.home) s.homeDay = s.day;
  for (const q of queueFollows(content, s, res.follows)) w.steps.push({ kind: 'follow', ...q });
  w.checkpoint('choice');
  const dangerAfterChoice = w.danger();

  // A map read calm after the choice is a STAND-DOWN (from day 5): nothing is left for pressure to work on.
  const standDown = dangerAfterChoice === 0 && s.day >= RULES.standDownFromDay;
  if (!standDown) {
    const pr = new Rng(s.rng.pressure);
    pressure(w, pr);
    s.rng.pressure = pr.snapshot();
  }
  w.checkpoint('pressure');

  s.heats = w.heats;
  s.penalty = w.penalty;
  s.redLine = w.redLine;
  s.warned = [...w.warned];
  s.guarded = w.guarded;
  noteHot(s);
  const danger = w.danger();
  s.peak = Math.max(s.peak, danger);

  const ending = standDown ? endingAfter(s, 0, null) : endingAfter(s, danger, w.tipping);
  const trace: DayTrace = {
    day: s.day,
    card: card.id,
    region: dealt.region,
    acted: act.acted,
    choice: card.map ? { tapped: act.acted } : (act.option as 'left' | 'right'),
    tag: act.tag,
    dangerBefore,
    dangerAfterChoice,
    dangerAfter: danger,
    steps: w.steps,
    fired: [...w.fired],
    ending,
    offer: null,
  };
  s.card = null;
  if (ending) {
    s.ending = ending;
    s.phase = 'over';
  } else if (isOfferDay(s.day)) {
    const offer = drawOffer(content, s);
    if (offer.length) {
      s.offer = offer;
      s.phase = 'offer';
      trace.offer = offer;
    } else advanceDay(content, s);
  } else advanceDay(content, s);
  s.log.push(trace);
  return ok(s);
}

/**
 * The ending the day brings, if any (SPEC "Ends"). STAND-DOWN is judged on the map after the choice
 * (a calm map has nothing for pressure to work on; see ENGINE.md "Rulings"); WAR and HELD after pressure.
 */
export function endingAfter(s: GameState, danger: number, tipping: RegionId | null): Ending | null {
  if (danger >= RULES.dangerCap) return { kind: 'WAR', day: s.day, danger: 100, region: tipping ?? hottestRegion(s) };
  if (danger === 0 && s.day >= RULES.standDownFromDay) return { kind: 'STAND-DOWN', day: s.day, danger: 0 };
  if (s.day >= RULES.days) return { kind: 'HELD', day: 30, danger, clean: danger < RULES.cleanHoldUnder };
  return null;
}

function advanceDay(content: ThirtyContent, s: GameState): void {
  s.day += 1;
  s.phase = 'choose';
  s.card = dealCard(content, s);
  noteHot(s);
}

/** Take one of the offered pieces (by index) or none (null). */
export function pick(content: ThirtyContent, state: GameState, index: number | null): Result {
  if (state.phase !== 'offer' || !state.offer) return no(state, 'no offer is open');
  if (index !== null && (!Number.isInteger(index) || index < 0 || index >= state.offer.length)) return no(state, 'no such piece');
  const s = draft(state);
  const offer = s.offer!;
  const taken = index === null ? null : offer[index];
  if (taken) {
    if (s.team.length >= RULES.maxTeam) return no(state, 'the team is full');
    s.team.push(taken);
    // Red Lines names its region through a map card; a pack without one names the hottest region now.
    if (taken === 'red-lines' && s.redLine === null && !hasRedLineCard(content)) s.redLine = hottestRegion(s);
  }
  s.picks.push({ day: s.day, offer, taken });
  s.offer = null;
  advanceDay(content, s);
  return ok(s);
}

/** DANGER as the gauge shows it. */
export function danger(state: GameState): number {
  return dangerOf(state.heats, state.penalty);
}
