/**
 * Which card comes today (SPEC "Days", "The content"): arcs advance by their follow-ups; otherwise a
 * card whose day range and conditions fit, preferring the hottest regions (a CRISIS or WAR region gets
 * a card within two days), a map card about one day in five, domestic cards unless the Spin Doctor
 * is held or yesterday's choice was HOME. The deck never stalls: when nothing fits it relaxes, in a
 * fixed order, down to reusing single-day cards. Also the team offer after days 5, 10, 15, 20 and 25.
 */
import { Rng } from '../../engine/rng.ts';
import type { Card, CardId, Follow, PieceId, RegionId, ThirtyContent } from '../content/types.ts';
import { isAlarmCard, riskyOdds } from './cards.ts';
import { CRISIS, RULES, weekOf } from './rules.ts';
import type { DealtCard, GameState, QueuedFollow, TraceStep } from './types.ts';
import { REGION_IDS, hottestFirst } from './world.ts';
import { Working } from './working.ts';

interface Relax {
  /** Allow cards already dealt this game. */
  used: boolean;
  /** Ignore `when` (heat range, pieces). */
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

/** The day range a card may be drawn on; the Paranoid director brings warnings a day earlier. */
function dayRange(card: Card, s: GameState): [number, number] {
  if (isAlarmCard(card) && s.team.includes('paranoid-intel')) return [Math.max(1, card.day[0] - 1), card.day[1]];
  return card.day;
}

export function fits(card: Card, s: GameState, used: ReadonlySet<CardId>, relax: Relax = STRICT): boolean {
  if (card.chained) return false;
  if (!relax.used && used.has(card.id)) return false;
  if (!relax.day) {
    const [a, b] = dayRange(card, s);
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
  }
  return true;
}

/** The weight a card draws with: by its region's heat; a map card by the heat of its targets. */
function weightOf(card: Card, s: GameState): number {
  if (card.map) {
    let w = 1;
    for (const t of card.targets) w += s.heats[t.region];
    return w;
  }
  return RULES.drawWeight[s.heats[card.region]];
}

/** Regions at CRISIS or WAR that have waited two days for a card (SPEC: within two days). */
export function starvingRegions(s: GameState): RegionId[] {
  return REGION_IDS.filter((r) => {
    if (s.heats[r] < CRISIS) return false;
    const since = Math.max(s.deck.hotSince[r] ?? s.day, s.deck.lastCardDay[r] ?? 0);
    return s.day - since >= RULES.hotCardWithin;
  });
}

function concerns(card: Card, regions: ReadonlySet<RegionId>): boolean {
  if (card.region && regions.has(card.region)) return true;
  return card.map && card.targets.some((t) => regions.has(t.region));
}

function weightedPick(rng: Rng, cards: Card[], s: GameState): Card {
  return cards[Math.max(0, rng.weightedIndex(cards.map((c) => weightOf(c, s))))];
}

/**
 * Choose today's card on a draft state (reads and advances rng.deal). Follow-ups first; then priority
 * cards unlocked by a held piece; then a card for a starving region; then the map roll; then the
 * weighted draw; then the relaxations.
 */
export function selectCard(content: ThirtyContent, s: GameState): Card {
  const rng = new Rng(s.rng.deal);
  try {
    const due = dueFollow(content, s);
    if (due) return due;

    const used = new Set(s.deck.used);
    const all = content.cardOrder.map((id) => content.cards[id]);
    const candidates = all.filter((c) => fits(c, s, used));

    const unlocked = candidates.filter((c) => c.when.pieces.length > 0);
    if (unlocked.length) return weightedPick(rng, unlocked, s);

    // Day 1 is about the starting crisis: the first decision is the obvious trouble (and the start reads 11).
    const starving = new Set(s.day === 1 ? REGION_IDS.filter((r) => s.heats[r] >= CRISIS) : starvingRegions(s));
    if (starving.size) {
      const urgent = candidates.filter((c) => concerns(c, starving));
      if (urgent.length) return weightedPick(rng, urgent, s);
    }

    const maps = candidates.filter((c) => c.map);
    const choices = candidates.filter((c) => !c.map);
    if (maps.length && s.day > 1 && s.deck.lastMapDay !== s.day - 1 && (choices.length === 0 || rng.next() < RULES.mapDayChance)) {
      return weightedPick(rng, maps, s);
    }
    if (choices.length) return weightedPick(rng, choices, s);

    // Nothing unused fits today: relax, preferring the card dealt longest ago.
    for (const relax of RELAXATIONS.slice(1)) {
      const again = all.filter((c) => fits(c, s, used, relax));
      if (!again.length) continue;
      const order = new Map(s.deck.used.map((id, i) => [id, i]));
      const oldest = Math.min(...again.map((c) => order.get(c.id) ?? -1));
      const pool = again.filter((c) => (order.get(c.id) ?? -1) === oldest);
      return weightedPick(rng, pool, s);
    }
    throw new Error('the pack has no card to deal');
  } finally {
    s.rng.deal = rng.snapshot();
  }
}

/** The follow-up due today (soonest deadline first, then the hottest region), removed from the queue. */
function dueFollow(content: ThirtyContent, s: GameState): Card | null {
  const used = new Set(s.deck.used);
  s.deck.queue = s.deck.queue.filter((q) => content.cards[q.card] && !used.has(q.card));
  const due = s.deck.queue.filter((q) => q.from <= s.day);
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
 * Queue an arc's follow-ups from today: due in [day + in0, day + in1]; the Paranoid director's warnings a
 * day earlier (never before tomorrow). A follow-up that could only come after day 30 is dropped.
 */
export function queueFollows(content: ThirtyContent, s: GameState, follows: readonly Follow[]): QueuedFollow[] {
  const out: QueuedFollow[] = [];
  for (const f of follows) {
    const target = content.cards[f.card];
    if (!target) continue;
    let from = s.day + f.in[0];
    let to = s.day + f.in[1];
    if (s.team.includes('paranoid-intel') && isAlarmCard(target)) {
      from -= 1;
      to -= 1;
    }
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
 * Deal today's card on a draft: select it, roll its odds, decide a warning's truth, let the Hotline
 * calm a crisis card, and keep the deck's books. Reads rng.deal and rng.odds.
 */
export function dealCard(content: ThirtyContent, s: GameState): DealtCard {
  const card = selectCard(content, s);
  const odds = new Rng(s.rng.odds);
  const roll = odds.next();
  const alarm = isAlarmCard(card);
  let alarmFalse = false;
  if (alarm) {
    const paranoid = s.team.includes('paranoid-intel') && odds.next() < RULES.paranoidFalse;
    alarmFalse = paranoid || roll * 100 < (riskyOdds(card) ?? RULES.paranoidFalse * 100);
  }
  s.rng.odds = odds.snapshot();

  const arrival: TraceStep[] = [];
  // News: the card finds its region in trouble (an arc's first card more so).
  const news = card.arc && !card.chained ? RULES.newsHeat : RULES.newsHeatPlain;
  if (card.region && s.heats[card.region] < news) {
    const w = new Working(s);
    w.heat(card.region, news - s.heats[card.region], 'news');
    s.heats = w.heats;
    s.penalty = w.penalty;
    arrival.push(...w.steps);
  }
  const cautious = alarm && s.team.includes('cautious-intel');
  if (cautious) arrival.push({ kind: 'piece', piece: 'cautious-intel', note: alarmFalse ? 'A false alarm' : 'The warning is real' });

  // The Hotline: once a week, a crisis card calms itself before you choose.
  if (card.region && s.team.includes('hotline') && s.heats[card.region] >= CRISIS && s.hotlineWeek !== weekOf(s.day)) {
    const w = new Working(s);
    if (w.cool(card.region, RULES.hotlineCool, 'piece', { piece: 'hotline' })) {
      s.heats = w.heats;
      s.hotlineWeek = weekOf(s.day);
      arrival.push(...w.steps);
    }
  }

  s.deck.used.push(card.id);
  if (card.region) s.deck.lastCardDay[card.region] = s.day;
  if (card.map) {
    s.deck.lastMapDay = s.day;
    for (const t of card.targets) s.deck.lastCardDay[t.region] = s.day;
  }
  return { id: card.id, region: card.region, roll, alarmFalse, alarm: alarm ? (cautious ? (alarmFalse ? 'false' : 'real') : 'unknown') : 'none', arrival };
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
