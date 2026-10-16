/**
 * Which card comes tomorrow (SPEC "Days", "The content"): arcs advance by their follow-ups; otherwise a
 * card whose day range and conditions fit, preferring the hottest regions (a CRISIS or WAR region gets
 * a card within two days), a map card about one day in five when its places are worth tapping,
 * domestic cards unless the Spin Doctor is held or yesterday's choice was HOME. The deck never
 * stalls: when nothing fits it relaxes, in a fixed order, down to reusing single-day cards. The card
 * is dealt at night, after pressure, so its news (its region found in trouble) is the last step of
 * the night and the ending check sees it. Also the team offer after days 5, 10, 15, 20 and 25.
 */
import { Rng } from '../../engine/rng.ts';
import { REGION_SETS } from '../content/regions.ts';
import type { Card, CardId, Follow, MapCard, MapTarget, PieceId, RegionId, ThirtyContent } from '../content/types.ts';
import { isAlarmCard, riskyOdds } from './cards.ts';
import { previewAct } from './preview.ts';
import { actOf } from './resolve.ts';
import { CALM, CRISIS, RULES, WAR, weekOf } from './rules.ts';
import type { DealtCard, GameState, QueuedFollow, TraceStep } from './types.ts';
import { REGION_IDS, hottestFirst, isHome, regionName } from './world.ts';
import { Working } from './working.ts';

interface Relax {
  /** Allow cards already dealt this game. */
  used: boolean;
  /** Ignore `when` (heat range, pieces, a map card's places). */
  when: boolean;
  /** Ignore the day range. */
  day: boolean;
}

const STRICT: Relax = { used: false, when: false, day: false };
/** The order the deck relaxes in when nothing fits. */
const RELAXATIONS: readonly Relax[] = [
  STRICT,
  { used: true, when: false, day: false },
  { used: true, when: true, day: false },
  { used: true, when: true, day: true },
];


/** Whether the card may come on `s.day` with the map as `s.heats` reads. */
export function fits(card: Card, s: GameState, used: ReadonlySet<CardId>, relax: Relax = STRICT): boolean {
  if (card.chained) return false;
  if (!relax.used && used.has(card.id)) return false;
  if (!relax.day) {
    const [a, b] = card.day;
    if (s.day < a || s.day > b) return false;
  }
  if (card.domestic) {
    if (s.team.includes('spin-doctor')) return false;
    if (s.homeDay !== null && s.homeDay === s.day - 1) return false;
  }
  if (!relax.when) {
    const w = card.when;
    if (card.region) {
      const h = s.heats[card.region];
      if (h < w.heat[0] || h > w.heat[1]) return false;
    }
    if (!w.pieces.every((p) => s.team.includes(p))) return false;
    if (w.without.some((p) => s.team.includes(p))) return false;
    // A card about a region that is calm and that its own news cannot light (the Spin Doctor's home) would leave the player nothing to do.
    if (card.region && s.heats[card.region] === CALM && s.team.includes('spin-doctor') && isHome(card.region)) return false;
    // A map day needs places worth tapping.
    if (card.map && !resolveTargets(card, s)) return false;
  }
  return true;
}

/**
 * The places a map card offers today, read off the live map. A target with `from` takes the hottest
 * region of that set above CALM that is not already offered (fixed targets are reserved first), and
 * `{region}` in its hint is filled in; then every label is written by the engine (hint.ts), the same
 * way for every place, so the player compares like for like. Strict (the default): null unless at
 * least RULES.mapTargetsLowering of the places lower DANGER, so a map day is never a day of no-ops.
 * Lenient: the best effort for a deck that has run out of other cards (a template whose set is all
 * calm falls back to its authored region).
 */
export function resolveTargets(card: MapCard, s: GameState, strict = true): MapTarget[] | null {
  const taken = new Set<RegionId>(card.targets.filter((t) => !t.from).map((t) => t.region));
  const chosen: MapTarget[] = [];
  for (const t of card.targets) {
    let region = t.region;
    if (t.from) {
      const pool = REGION_SETS[t.from].filter((r) => !taken.has(r) && s.heats[r] > CALM);
      const [hot] = hottestFirst(s.heats, pool);
      if (hot) region = hot;
      else if (strict || taken.has(region)) continue;
      taken.add(region);
    }
    chosen.push({ ...t, region, hint: t.hint.replace(/\{region\}/g, regionName(region)) });
  }
  if (chosen.length < 2) return null;
  const live: MapCard = { ...card, targets: chosen };
  const dealt: DealtCard = { id: card.id, region: card.region, roll: 0.5, alarmFalse: false, alarm: 'none', arrival: [], targets: chosen };
  const view: GameState = { ...s, phase: 'choose', card: dealt };
  let lowering = 0;
  for (const t of chosen) {
    const act = actOf(live, t.region);
    if (!act) continue;
    const p = previewAct(live, view, act);
    t.hint = p.hint;
    if (p.dangerAfter < p.dangerBefore) lowering++;
  }
  if (strict && lowering < RULES.mapTargetsLowering) return null;
  return chosen;
}

/** The weight a card draws with: by its region's heat; a map card by the heat of its places. */
function weightOf(card: Card, s: GameState): number {
  if (card.map) {
    let w = 1;
    for (const t of resolveTargets(card, s, false) ?? card.targets) w += s.heats[t.region];
    return w;
  }
  return RULES.drawWeight[s.heats[card.region]];
}

/**
 * Regions at CRISIS or WAR that have waited their time for a card (SPEC: a crisis within two days;
 * RULES.hotCardWithin, RULES.warCardWithin). With the Paranoid Intel Director held, by the next
 * morning (RULES.paranoidCardWithin); `paranoid` false asks what the plain rule would say.
 */
export function starvingRegions(s: GameState, paranoid = s.team.includes('paranoid-intel')): RegionId[] {
  return REGION_IDS.filter((r) => {
    if (s.heats[r] < CRISIS) return false;
    const since = Math.max(s.deck.hotSince[r] ?? s.day, s.deck.lastCardDay[r] ?? 0);
    const within = s.heats[r] === WAR ? RULES.warCardWithin : RULES.hotCardWithin;
    return s.day - since >= (paranoid ? Math.min(within, RULES.paranoidCardWithin) : within);
  });
}

function concerns(card: Card, s: GameState, regions: ReadonlySet<RegionId>): boolean {
  if (card.region && regions.has(card.region)) return true;
  return card.map && (resolveTargets(card, s, false) ?? []).some((t) => regions.has(t.region));
}

function weightedPick(rng: Rng, cards: Card[], s: GameState): Card {
  return cards[Math.max(0, rng.weightedIndex(cards.map((c) => weightOf(c, s))))];
}

/** Why a card was chosen; `early` when the Paranoid Intel Director brought a crisis card a day before the plain rule would. */
export interface Selection {
  card: Card;
  early: boolean;
}

/**
 * Choose the card for `day` on a draft state whose map reads as it will that morning (reads and
 * advances rng.deal). Follow-ups first; then priority cards unlocked by a held piece; then a card for
 * a starving region; then the map roll; then the weighted draw; then the relaxations. `avoid` names
 * regions the day's choice cooled: a card about one of them waits a day when it can, so the morning's
 * news does not undo the day's work (a follow-up at its deadline still comes).
 */
export function selectCard(content: ThirtyContent, s: GameState, day = s.day, avoid: ReadonlySet<RegionId> = new Set()): Card {
  return selectCardWhy(content, s, day, avoid).card;
}

export function selectCardWhy(content: ThirtyContent, s: GameState, day = s.day, avoid: ReadonlySet<RegionId> = new Set()): Selection {
  const at: GameState = day === s.day ? s : { ...s, day };
  const rng = new Rng(s.rng.deal);
  const pick = (card: Card, early = false): Selection => ({ card, early });
  try {
    const due = dueFollow(content, s, day, avoid);
    if (due) return pick(due);

    const used = new Set(s.deck.used);
    const all = content.cardOrder.map((id) => content.cards[id]);
    const fitting = all.filter((c) => fits(c, at, used));
    const rested = fitting.filter((c) => !c.region || !avoid.has(c.region));
    const candidates = rested.length ? rested : fitting;

    const unlocked = candidates.filter((c) => c.when.pieces.length > 0);
    if (unlocked.length) return pick(weightedPick(rng, unlocked, at));

    // Day 1 is about the starting crisis: the first decision is the obvious trouble (and the start reads 11).
    const starving = new Set(day === 1 ? REGION_IDS.filter((r) => at.heats[r] >= CRISIS) : starvingRegions(at));
    if (starving.size) {
      const urgent = candidates.filter((c) => concerns(c, at, starving));
      if (urgent.length) {
        const card = weightedPick(rng, urgent, at);
        const plain = new Set(day === 1 ? [...starving] : starvingRegions(at, false));
        return pick(card, !concerns(card, at, plain));
      }
    }

    const maps = candidates.filter((c) => c.map);
    const choices = candidates.filter((c) => !c.map);
    if (maps.length && day > 1 && s.deck.lastMapDay !== day - 1 && (choices.length === 0 || rng.next() < RULES.mapDayChance)) {
      return pick(weightedPick(rng, maps, at));
    }
    if (choices.length) return pick(weightedPick(rng, choices, at));

    // Nothing unused fits: relax, preferring the card dealt longest ago.
    for (const relax of RELAXATIONS.slice(1)) {
      const again = all.filter((c) => fits(c, at, used, relax));
      if (!again.length) continue;
      const order = new Map(s.deck.used.map((id, i) => [id, i]));
      const oldest = Math.min(...again.map((c) => order.get(c.id) ?? -1));
      const pool = again.filter((c) => (order.get(c.id) ?? -1) === oldest);
      return pick(weightedPick(rng, pool, at));
    }
    throw new Error('the pack has no card to deal');
  } finally {
    s.rng.deal = rng.snapshot();
  }
}

/**
 * The follow-up due on `day` (soonest deadline first, then the hottest region), removed from the queue.
 * One about a region in `avoid` waits while its window allows.
 */
function dueFollow(content: ThirtyContent, s: GameState, day: number, avoid: ReadonlySet<RegionId>): Card | null {
  const used = new Set(s.deck.used);
  s.deck.queue = s.deck.queue.filter((q) => content.cards[q.card] && !used.has(q.card));
  const due = s.deck.queue.filter((q) => q.from <= day && !(q.to > day && content.cards[q.card].region && avoid.has(content.cards[q.card].region!)));
  if (!due.length) return null;
  const heat = (q: QueuedFollow) => {
    const r = content.cards[q.card].region;
    return r ? s.heats[r] : 0;
  };
  due.sort((a, b) => a.to - b.to || heat(b) - heat(a));
  const pick = due[0];
  s.deck.queue = s.deck.queue.filter((q) => q !== pick);
  return content.cards[pick.card];
}

/**
 * Queue an arc's follow-ups from today: due in [day + in0, day + in1], never before tomorrow. A
 * follow-up that could only come after day 30 is dropped.
 */
export function queueFollows(content: ThirtyContent, s: GameState, follows: readonly Follow[]): QueuedFollow[] {
  const out: QueuedFollow[] = [];
  for (const f of follows) {
    const target = content.cards[f.card];
    if (!target) continue;
    let from = s.day + f.in[0];
    let to = s.day + f.in[1];
    from = Math.max(s.day + 1, from);
    to = Math.max(from, to);
    if (from > RULES.days) continue;
    const q = { card: f.card, from, to };
    s.deck.queue.push(q);
    out.push(q);
  }
  return out;
}

/**
 * Deal the card for `day` on a draft: select it, roll its odds, decide a warning's truth, let its
 * news light its region, let the Hotline calm a crisis card, choose a map card's places, and keep
 * the deck's books. Reads rng.deal and rng.odds. The news is a heat step on `w` (the night in
 * progress, so the trace and the ending check see it); without a Working of the night (day 1, a test)
 * it goes to the card's `arrival`. The Hotline's cooling is always in `arrival`: the chip takes credit
 * as the card arrives.
 */
export function dealCard(content: ThirtyContent, s: GameState, day = s.day, w?: Working): DealtCard {
  const own = !w;
  const night = w ?? new Working(s);
  s.heats = night.heats;
  s.penalty = night.penalty;
  const { card, early } = selectCardWhy(content, s, day, night.cooledToday);

  const odds = new Rng(s.rng.odds);
  const roll = odds.next();
  const alarm = isAlarmCard(card);
  // A warning is false exactly when the wait would hold at the printed odds (CONTENT.md: the odds are the chance it is false).
  const alarmFalse = alarm && roll * 100 < (riskyOdds(card) ?? 25);
  s.rng.odds = odds.snapshot();

  // News: the card finds its region in trouble (an arc's first card more so).
  const newsAt = night.steps.length;
  const news = card.arc && !card.chained ? RULES.newsHeat : RULES.newsHeatPlain;
  if (card.region && night.heats[card.region] < news) night.heat(card.region, news - night.heats[card.region], 'news');
  s.heats = night.heats;
  s.penalty = night.penalty;

  const arrival: TraceStep[] = own ? night.steps.splice(newsAt) : [];
  const cautious = alarm && s.team.includes('cautious-intel');
  if (cautious) arrival.push({ kind: 'piece', piece: 'cautious-intel', note: alarmFalse ? 'A false alarm' : 'The warning is real' });
  if (early) arrival.push({ kind: 'piece', piece: 'paranoid-intel', note: `${regionName(card.region!)} spotted early` });

  // The Hotline: once a week, a crisis card calms itself before you choose (the crisis ends: CRISIS to TENSE).
  if (card.region && s.team.includes('hotline') && s.heats[card.region] >= CRISIS && s.hotlineWeek !== weekOf(day)) {
    const h = new Working({ ...s, day });
    if (h.cool(card.region, RULES.hotlineCool, 'piece', { piece: 'hotline' })) {
      night.heats = h.heats;
      s.heats = h.heats;
      s.hotlineWeek = weekOf(day);
      arrival.push(...h.steps);
    }
  }

  s.deck.used.push(card.id);
  if (card.region) s.deck.lastCardDay[card.region] = day;
  const dealt: DealtCard = { id: card.id, region: card.region, roll, alarmFalse, alarm: alarm ? (cautious ? (alarmFalse ? 'false' : 'real') : 'unknown') : 'none', arrival };
  if (card.map) {
    s.deck.lastMapDay = day;
    const targets = resolveTargets(card, { ...s, day }) ?? resolveTargets(card, { ...s, day }, false) ?? card.targets;
    for (const t of targets) s.deck.lastCardDay[t.region] = day;
    dealt.targets = targets;
  }
  return dealt;
}

/** Pieces that may still be offered: not held, not excluded by (or excluding) a held piece. */
export function availablePieces(content: ThirtyContent, team: readonly PieceId[]): PieceId[] {
  return content.pieceOrder.filter((id) => {
    if (team.includes(id)) return false;
    const p = content.pieces[id];
    return !team.some((h) => p.excludes.includes(h) || content.pieces[h]?.excludes.includes(id));
  });
}

/** Three pieces for the team offer, seeded (reads rng.offer on the draft). Fewer when fewer remain; none when the team is full. */
export function drawOffer(content: ThirtyContent, s: GameState): PieceId[] {
  if (s.team.length >= RULES.maxTeam) return [];
  const rng = new Rng(s.rng.offer);
  const picked = rng.shuffle(availablePieces(content, s.team)).slice(0, RULES.offerSize);
  s.rng.offer = rng.snapshot();
  return picked;
}

/** Whether the pack has a card that draws a red line (a choice or target with mark red-line). */
export function hasRedLineCard(content: ThirtyContent): boolean {
  return content.cardOrder.some((id) => {
    const c = content.cards[id];
    return c.map ? c.targets.some((t) => t.mark === 'red-line') : c.left.mark === 'red-line' || c.right.mark === 'red-line';
  });
}

/** The hottest region, ties in map order: the fallback red line when no card names one. */
export function hottestRegion(s: GameState): RegionId {
  return hottestFirst(s.heats, REGION_IDS)[0];
}
