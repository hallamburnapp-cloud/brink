/**
 * BRINK: THIRTY DAYS — the run state and the records the engine hands to the UI and the bots.
 * Plain JSON data: a Preact signal can hold a state, a save is JSON.stringify of one, and every
 * action returns a new object (the one it was given is never changed).
 */
import type { RngState } from '../../engine/rng.ts';
import type { CardId, ChoiceTag, Heat, PieceId, RegionId } from '../content/types.ts';

export type { CardId, ChoiceTag, Heat, PieceId, RegionId };

/**
 * - 'choose': today's card is on the table; choose('left' | 'right') or tapRegion(id) on a map day.
 * - 'offer':  the day is over and three pieces are offered; pick(index) or pick(null).
 * - 'over':   the game has ended; `ending` says how.
 */
export type Phase = 'choose' | 'offer' | 'over';

export type EndingKind = 'WAR' | 'STAND-DOWN' | 'HELD';

export type Ending =
  /** DANGER reached 100: `region` is the one whose heat tipped it, `day` the day it happened. */
  | { kind: 'WAR'; day: number; danger: 100; region: RegionId }
  /** DANGER read 0 at the end of a day from day 5 on: the day is the score. */
  | { kind: 'STAND-DOWN'; day: number; danger: 0 }
  /** The end of day 30 with DANGER below 100; `clean` when it ended under 20. */
  | { kind: 'HELD'; day: 30; danger: number; clean: boolean };

/** The seeded streams: forked once from the seed, each for one job, so a change in one never shifts another. */
export interface Streams {
  /** The starting map. */
  world: RngState;
  /** Which card comes each day (and whether it is a map day). */
  deal: RngState;
  /** Each card's odds roll and the Paranoid Intel Director's false alarms. */
  odds: RngState;
  /** Pressure at the end of each day. */
  pressure: RngState;
  /** The three pieces offered after days 5, 10, 15, 20 and 25. */
  offer: RngState;
}

/** What the engine knows about a warning card's alarm (cards with `alarm: true` in the content). */
export type AlarmState =
  /** Not a warning card. */
  | 'none'
  /** A warning; whether it is false is decided but not shown (no Cautious Intel Director). */
  | 'unknown'
  /** Marked false before the choice (Cautious Intel Director): waiting holds. */
  | 'false'
  /** Marked real before the choice: waiting fails. */
  | 'real';

/** Today's card as dealt. */
export interface DealtCard {
  id: CardId;
  /** The ringed region: the card's own, or null on a map card about no one place. */
  region: RegionId | null;
  /** The day's odds roll in [0, 1), made when the card was dealt; a RISKY choice holds when roll * 100 < its odds. */
  roll: number;
  /** True when the roll is a false alarm (decided at the deal; shown only as `alarm` says). */
  alarmFalse: boolean;
  alarm: AlarmState;
  /** What happened as the card arrived (the Hotline calming it, the Cautious director's mark): animate before the choice. */
  arrival: TraceStep[];
}

/** A follow-up waiting its turn: due on a day in [from, to] (dealt late if something else had to come first). */
export interface QueuedFollow {
  card: CardId;
  from: number;
  to: number;
}

export interface Deck {
  /** Cards dealt this game, in order. A card comes once; single-day cards are reused only when nothing else fits. */
  used: CardId[];
  queue: QueuedFollow[];
  /** The last day each region had a card. */
  lastCardDay: Record<RegionId, number>;
  /** The day a region reached CRISIS or WAR (cleared when it cools below). */
  hotSince: Record<RegionId, number>;
  /** The last day a map card was dealt (never two in a row). */
  lastMapDay: number;
}

/** One pick at a team offer. */
export interface Pick {
  day: number;
  offer: PieceId[];
  taken: PieceId | null;
}

export interface GameState {
  version: 1;
  seed: string;
  /** The day on the strip, 1–30. After the end it stays on the last day played. */
  day: number;
  phase: Phase;
  heats: Record<RegionId, Heat>;
  /** DANGER added by the two policies that say so (Red Lines +15, Launch on Warning +20). Never falls. */
  penalty: number;
  /** Pieces held, in the order taken (at most five). */
  team: PieceId[];
  /** The Red Lines region, once named. */
  redLine: RegionId | null;
  /** Regions marked `warned`. */
  warned: RegionId[];
  /** Regions marked `guarded`: pressure cannot heat them through this day. */
  guarded: Record<RegionId, number>;
  /** The week (1–6) the Hotline was last used, or null. */
  hotlineWeek: number | null;
  /** The day of the last HOME choice: no domestic card the day after. */
  homeDay: number | null;
  card: DealtCard | null;
  offer: PieceId[] | null;
  picks: Pick[];
  deck: Deck;
  rng: Streams;
  /** One trace per resolved day; the last is the one to animate after a choice. */
  log: DayTrace[];
  ending: Ending | null;
  /** The highest DANGER read at the end of any day (and at the start). */
  peak: number;
}

/** How a region's heat changed and why. */
export type HeatWhy =
  /** The tag's own effect or a consequence the button named (heats, crisis, relieve, a missed roll's +1). */
  | 'choice'
  /** The card's own news: an arc's first card finds its region in trouble (in `card.arrival`). */
  | 'news'
  /** A piece reached it (`piece` says which). */
  | 'piece'
  /** A WAR region spread to it at the end of the day (`source`). */
  | 'spread'
  /** A CRISIS region's one-in-three heated it at the end of the day (`source`), or a TENSE region boiled over on its own. */
  | 'pressure'
  /** Trouble flared in a calm region at the end of the day (the slide). */
  | 'flare';

export interface HeatChange {
  region: RegionId;
  from: Heat;
  to: Heat;
  why: HeatWhy;
  piece?: PieceId;
  source?: RegionId;
}

export type TraceStep =
  | ({ kind: 'heat'; danger: number } & HeatChange)
  /** A piece fired without changing a heat itself (the Dove making talks certain, the Spin Doctor absorbing a heat). */
  | { kind: 'piece'; piece: PieceId; note: string }
  /** The odds roll of a RISKY choice. `text` is 'Held' or 'Missed by 4%'. */
  | { kind: 'roll'; odds: number; roll: number; held: boolean; text: string }
  /** A warning card resolved: was it a false alarm? */
  | { kind: 'alarm'; false: boolean }
  /** DANGER added by a policy: Red Lines crossed (+15) or a false alarm on a warned region (+20). */
  | { kind: 'penalty'; amount: number; piece: PieceId; region: RegionId; danger: number; text: string }
  | { kind: 'mark'; mark: 'red-line' | 'warned' | 'guarded'; region: RegionId }
  /** A follow-up card queued, due in [from, to]. */
  | { kind: 'follow'; card: CardId; from: number; to: number }
  /** A checkpoint for the gauge: after the choice ('choice') and after pressure ('pressure'). */
  | { kind: 'danger'; at: 'start' | 'choice' | 'pressure'; danger: number };

/** Everything that happened on one day, in order, for the UI to animate and the log to keep. */
export interface DayTrace {
  day: number;
  card: CardId;
  /** The ringed region. */
  region: RegionId | null;
  /** The region the choice acted on: the card's region, or the tapped target. */
  acted: RegionId | null;
  choice: 'left' | 'right' | { tapped: RegionId };
  tag: ChoiceTag;
  dangerBefore: number;
  dangerAfterChoice: number;
  dangerAfter: number;
  steps: TraceStep[];
  /** Pieces that changed today's outcome: the chips to glow. */
  fired: PieceId[];
  ending: Ending | null;
  /** The team offer that followed, if any. */
  offer: PieceId[] | null;
}

/** What one option will do, computed exactly as choose/tapRegion would. */
export interface Preview {
  /** 'left' | 'right', or the target region on a map day. */
  option: 'left' | 'right' | RegionId;
  tag: ChoiceTag;
  /** The button's action text (a target has none: the UI labels it with `hint`). */
  text: string | null;
  /** The hint line under the action, in words. */
  hint: string;
  /** The authored hint, for reference. */
  authored: string;
  /** RISKY: the chance it holds after pieces (100 when certain); null for other tags. */
  odds: number | null;
  dangerBefore: number;
  /** DANGER after the choice (if a RISKY choice holds). Pressure comes after and is not included. */
  dangerAfter: number;
  /** RISKY: DANGER if the roll misses. */
  dangerIfMissed: number | null;
  changes: HeatChange[];
  changesIfMissed: HeatChange[] | null;
  /** Pieces that will fire. */
  pieces: PieceId[];
  /** DANGER the choice adds through a policy (Red Lines, Launch on Warning), if it holds. */
  penalty: number;
}

export type Result = { ok: true; state: GameState } | { ok: false; state: GameState; reason: string };
