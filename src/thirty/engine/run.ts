/**
 * The game (SPEC "The rules"): a new game, the day (choose or tap, pressure, tomorrow's card and its
 * news, the ending check, the team offer), the team pick. Every action takes a state and returns a
 * Result holding a NEW state, or the same state and a short reason when the action is refused.
 */
import { Rng } from '../../engine/rng.ts';
import type { Card, Heat, ThirtyContent } from '../content/types.ts';
import { todayCard } from './cards.ts';
import { dealCard, drawOffer, fits, hasRedLineCard, hottestRegion, queueFollows } from './deck.ts';
import { pressure } from './pressure.ts';
import { actOf, resolve, type Act } from './resolve.ts';
import { CALM, CRISIS, RULES, TENSE, WAR, dangerOf, isOfferDay } from './rules.ts';
import type { DayTrace, DealtCard, Ending, GameState, RegionId, Result, Streams } from './types.ts';
import { HOME_REGIONS, REGION_IDS, hottestFirst } from './world.ts';
import { Working } from './working.ts';

const ok = (state: GameState): Result => ({ ok: true, state });
const no = (state: GameState, reason: string): Result => ({ ok: false, state, reason });

function copyDealt(c: DealtCard | null | undefined): DealtCard | null {
  if (!c) return null;
  return { ...c, arrival: [...c.arrival], ...(c.targets ? { targets: c.targets.map((t) => ({ ...t })) } : {}) };
}

/** A copy safe to change. Traces and picks never change once made, so they are shared. */
export function draft(s: GameState): GameState {
  return {
    ...s,
    heats: { ...s.heats },
    team: [...s.team],
    warned: [...s.warned],
    guarded: { ...s.guarded },
    card: copyDealt(s.card),
    offer: s.offer && [...s.offer],
    picks: [...s.picks],
    deck: {
      used: [...s.deck.used],
      queue: s.deck.queue.map((q) => ({ ...q })),
      lastCardDay: { ...s.deck.lastCardDay },
      hotSince: { ...s.deck.hotSince },
      lastMapDay: s.deck.lastMapDay,
      next: copyDealt(s.deck.next),
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
    deck: { used: [], queue: [], lastCardDay: {}, hotSince: {}, lastMapDay: 0, next: null },
    rng,
    log: [],
    ending: null,
    peak: dangerOf(heats, 0),
  };
  // Day 1 has no night before it: the first card's news (none, it is about the crisis) arrives with the card.
  s.card = dealCard(content, s, 1);
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

/** Choose a side of today's card. */
export function choose(content: ThirtyContent, state: GameState, side: 'left' | 'right'): Result {
  if (state.phase !== 'choose') return no(state, state.phase === 'offer' ? 'pick a piece first' : 'the game is over');
  const card = todayCard(content, state);
  if (!card) return no(state, 'no card today');
  if (card.map) return no(state, 'tap a place on the map');
  const act = actOf(card, side);
  if (!act) return no(state, 'no such choice');
  return playDay(content, state, card, act);
}

/** Tap a glowing region on a map day. */
export function tapRegion(content: ThirtyContent, state: GameState, region: RegionId): Result {
  if (state.phase !== 'choose') return no(state, state.phase === 'offer' ? 'pick a piece first' : 'the game is over');
  const card = todayCard(content, state);
  if (!card) return no(state, 'no card today');
  if (!card.map) return no(state, 'choose a side');
  const act = actOf(card, region);
  if (!act) return no(state, 'that place is not offered today');
  return playDay(content, state, card, act);
}

/** Write the Working's map and marks back to the draft. */
function commit(s: GameState, w: Working): void {
  s.heats = w.heats;
  s.penalty = w.penalty;
  s.redLine = w.redLine;
  s.warned = [...w.warned];
  s.guarded = w.guarded;
}

/**
 * A day: the choice; a calm map is a STAND-DOWN (from RULES.standDownFromDay, the night skipped);
 * otherwise pressure, then tomorrow's card dealt so its news is the last step of the night; then the
 * ending check; then the team offer or the next morning.
 */
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

  const standDown = dangerAfterChoice === 0 && s.day >= RULES.standDownFromDay;
  let next: DealtCard | null = null;
  if (!standDown) {
    const pr = new Rng(s.rng.pressure);
    pressure(w, pr);
    s.rng.pressure = pr.snapshot();
    // Tomorrow's card comes tonight, so that its news is part of the night and the ending check sees it.
    if (w.danger() < RULES.dangerCap && s.day < RULES.days) next = dealCard(content, s, s.day + 1, w);
  }
  w.checkpoint('pressure');

  let ending = standDown ? endingAfter(s, 0, null) : endingAfter(s, w.danger(), w.tipping);
  if (ending?.kind === 'WAR') ending = { ...ending, region: warRegion(w) };
  commit(s, w);
  noteHot(s);
  const danger = w.danger();
  s.peak = Math.max(s.peak, danger);

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
  s.deck.next = null;
  if (ending) {
    s.ending = ending;
    s.phase = 'over';
  } else if (isOfferDay(s.day)) {
    const offer = drawOffer(content, s);
    if (offer.length) {
      s.offer = offer;
      s.phase = 'offer';
      s.deck.next = next;
      trace.offer = offer;
    } else morning(content, s, next);
  } else morning(content, s, next);
  s.log.push(trace);
  return ok(s);
}

/**
 * The ending the day brings, if any (SPEC "Ends"). STAND-DOWN is judged on the map after the choice
 * (a calm map has nothing for pressure to work on; see ENGINE.md "Rulings"); WAR and HELD after
 * pressure and the night's news. A WAR's region is settled by `warRegion` so the map shows it red.
 */
export function endingAfter(s: GameState, danger: number, tipping: RegionId | null): Ending | null {
  if (danger >= RULES.dangerCap) return { kind: 'WAR', day: s.day, danger: 100, region: tipping ?? hottestRegion(s) };
  if (danger === 0 && s.day >= RULES.standDownFromDay) return { kind: 'STAND-DOWN', day: s.day, danger: 0 };
  if (s.day >= RULES.days) return { kind: 'HELD', day: 30, danger, clean: danger < RULES.cleanHoldUnder };
  return null;
}

/**
 * Where the fighting began: a region that is red on the final map, so the ending and the picture
 * agree. The region whose step filled the gauge, if it is at war; if it is in crisis, it goes to
 * war now (the 'war' step); else the region that most recently went to war; else the hottest crisis
 * goes to war; else (a map of tense regions and penalties) the hottest region does.
 */
export function warRegion(w: Working): RegionId {
  const tip = w.tipping;
  if (tip && w.heats[tip] === WAR) return tip;
  if (tip && w.heats[tip] === CRISIS && w.heat(tip, 1, 'war')) return tip;
  for (let i = w.steps.length - 1; i >= 0; i--) {
    const st = w.steps[i];
    if (st.kind === 'heat' && st.to === WAR) return st.region;
  }
  const red = REGION_IDS.find((r) => w.heats[r] === WAR);
  if (red) return red;
  for (const r of hottestFirst(w.heats, REGION_IDS)) if (w.heat(r, WAR - w.heats[r], 'war')) return r;
  return tip ?? hottestFirst(w.heats, REGION_IDS)[0];
}

/** The next morning: the card dealt last night comes to the table. */
function morning(content: ThirtyContent, s: GameState, next: DealtCard | null): void {
  s.day += 1;
  s.phase = 'choose';
  // Always dealt at night when the game goes on; the fallback keeps an old save or a test fixture moving.
  s.card = next ?? dealCard(content, s, s.day);
  s.deck.next = null;
  noteHot(s);
}

/** Take one of the offered pieces (by index) or none (null). */
export function pick(content: ThirtyContent, state: GameState, index: number | null): Result {
  if (state.phase !== 'offer' || !state.offer) return no(state, 'no offer is open');
  if (index !== null && (!Number.isInteger(index) || index < 0 || index >= state.offer.length)) return no(state, 'no such piece');
  const s = draft(state);
  const offer = s.offer!;
  const taken = index === null ? null : offer[index];
  let next = s.deck.next;
  if (taken) {
    if (s.team.length >= RULES.maxTeam) return no(state, 'the team is full');
    s.team.push(taken);
    // Red Lines names its region through a map card; a pack without one names the hottest region now.
    if (taken === 'red-lines' && s.redLine === null && !hasRedLineCard(content)) s.redLine = hottestRegion(s);
    // The pick may change what can come tomorrow (the Spin Doctor stops a domestic card): then deal again, the news arriving with the card.
    const pending = next && content.cards[next.id];
    if (next && pending && !fits(pending, { ...s, day: s.day + 1 }, new Set(s.deck.used.filter((id) => id !== next!.id)))) {
      s.deck.used = s.deck.used.filter((id) => id !== next!.id);
      next = dealCard(content, s, s.day + 1);
    }
  }
  s.picks.push({ day: s.day, offer, taken });
  s.offer = null;
  morning(content, s, next);
  return ok(s);
}

/** DANGER as the gauge shows it. */
export function danger(state: GameState): number {
  return dangerOf(state.heats, state.penalty);
}
