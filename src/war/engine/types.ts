/**
 * The game state and the records the engine hands to the UI, the director and the bots. State is
 * plain data: BigInt for every score-sized number (POINTS, M10, scores, targets), numbers for
 * coins and counts. Actions never mutate a state they were given: each returns a new object, so a
 * Preact signal can hold it and see every change.
 */
import type { RngState } from '../../engine/rng';
import type { StaffId } from '../content/staff';
import type { Colour, Owner, RegionId } from '../ui/map/contract';

export type { Colour, Owner, RegionId, StaffId };

/**
 * - 'choose':  a turn is dealt; pin, swap, send.
 * - 'outcome': the send is resolved (lastSend holds it); no shop this turn. NEXT TURN deals the next.
 * - 'shop':    the send is resolved and the shop is open (after turns 2, 4, 6 ...).
 * - 'over':    the game has ended (ending is set).
 */
export type Phase = 'choose' | 'outcome' | 'shop' | 'over';
export type Ending = 'WORLD UNITED' | 'CEASEFIRE' | 'WAR';
/** 'first' is seed FIRST-WORLD (scripted turns 1-2 and first shop); 'crown' is the CROWN demo. */
export type Mode = 'game' | 'first' | 'crown';

export interface Seat {
  /** Unique within the game and stable across seat moves (use it as a list key). */
  uid: number;
  id: StaffId;
}

/** The turn being played (phase 'choose') or just played (the other phases). */
export interface Deal {
  crisis: RegionId;
  target: bigint;
  /**
   * No grey region was left when the turn began: the crisis is on red. A miss changes no region and
   * spends one of the push's misses; the last one (RULES.pushMisses) is a CEASEFIRE.
   */
  finalPush: boolean;
  /** Lit regions in light-up order (the crisis is lit too but not listed). */
  lit: RegionId[];
  /** Regions a swap lights next, first on top. */
  pile: RegionId[];
  /** The lit regions as first dealt, before any swap (the shop's preview number rescores them). */
  opening: RegionId[];
  /** The current selection, in tap order. */
  pins: RegionId[];
  swapsLeft: number;
  /** SWAP is switched off this turn (FIRST-WORLD turn 1). */
  swapLocked: boolean;
}

export interface Shop {
  /** 1 for the first shop of the game. */
  visit: number;
  /** Three offer slots; null once hired. */
  offers: Array<StaffId | null>;
  rerollCost: number;
}

/**
 * One step of a send, in animation order. `points` and `m10` are the running POINTS and
 * MULTIPLIER (in tenths) after the step.
 */
export type TraceEvent = PinEvent | StaffEvent | RegionStaffEvent | CrisisEvent | SlamEvent;

/** A pin scores (west to east): +its number to POINTS, +1 to MULTIPLIER. */
export interface PinEvent {
  kind: 'pin';
  region: RegionId;
  /** The region's number (3-10). */
  amount: number;
  /** '+10' */
  label: string;
  points: bigint;
  m10: bigint;
}

export type StaffOp = '+P' | '+M' | 'xM';

/** A staff that fires once (Duty Officer, Quartermaster, Surveyor, Old Hand, Strategist). */
export interface StaffEvent {
  kind: 'staff';
  /** The seat that fires, 0 = leftmost. */
  seat: number;
  /** The rule applied (for a Deputy, the staff it copies). */
  staff: StaffId;
  viaDeputy: boolean;
  op: StaffOp;
  /** '+P': points added. '+M': multiplier added, in tenths. 'xM': the factor, in tenths (30 = x3, 14 = x1.4). */
  amount: number;
  /** What flies into the box: '+20', '+4', '×3', '×1.4'. */
  label: string;
  points: bigint;
  m10: bigint;
}

/** A per-region staff (Governor, Harbourmaster, Sovereign) fires from one matching pin. */
export interface RegionStaffEvent {
  kind: 'regionStaff';
  seat: number;
  staff: StaffId;
  viaDeputy: boolean;
  /** The pin it pops from. */
  region: RegionId;
  op: 'xM';
  /** The factor in tenths: 15 (x1.5) or 20 (x2). */
  amount: number;
  /** '×1.5' or '×2'. */
  label: string;
  points: bigint;
  m10: bigint;
}

/** The crisis region was pinned: x2 MULTIPLIER, applied last. */
export interface CrisisEvent {
  kind: 'crisisX2';
  region: RegionId;
  amount: 20;
  label: '×2';
  points: bigint;
  m10: bigint;
}

/** SCORE = POINTS x MULTIPLIER, rounded down. */
export interface SlamEvent {
  kind: 'slam';
  score: bigint;
  points: bigint;
  m10: bigint;
}

/** A region a win turned gold: in spread order, with the chain of joins the gold pulse travels. */
export interface WonRegion {
  id: RegionId;
  /** 1 = the crisis. */
  order: number;
  /** It was war's (won back: red wipes to gold). */
  wasRed: boolean;
  /** Shortest chain of joins from the crisis to this region, both ends included. */
  path: RegionId[];
}

/** Red ink running into a region: `from` is the war region it runs from (null: it blooms from the centre). */
export interface WarTake {
  id: RegionId;
  from: RegionId | null;
}

/** The full record of the latest send, for the cascade, the outcome and the shop's receipt. */
export interface SendRecord {
  turn: number;
  crisis: RegionId;
  target: bigint;
  finalPush: boolean;
  /** The pins in scoring order (west to east). */
  pins: RegionId[];
  onCrisis: boolean;
  points: bigint;
  m10: bigint;
  score: bigint;
  /** Regions won (0 on a miss). */
  regions: number;
  result: 'win' | 'miss';
  won: WonRegion[];
  /** A miss outside the final push: the crisis turned red. */
  lost: WarTake | null;
  /** War spread by itself after this turn. */
  spread: WarTake | null;
  coinsBefore: number;
  coinsAfter: number;
  goldBefore: number;
  redBefore: number;
  gold: number;
  red: number;
  grey: number;
  /** Seat uids hired since the previous send (their first firing is drawn larger, '+4 · new'). */
  newHires: number[];
  /** Set when this send ended the game. */
  ending: Ending | null;
  /** Misses made in the final push after this send (a push miss spends one; the last is a CEASEFIRE). */
  pushMisses: number;
  trace: TraceEvent[];
}

/** One line per turn played, for the end card. */
export interface TurnLog {
  turn: number;
  target: bigint;
  score: bigint;
  regions: number;
  result: 'win' | 'miss';
  spread: RegionId | null;
  gold: number;
  red: number;
}

/** The biggest winning send (the biggest miss while nothing has won). */
export interface BestSend {
  score: bigint;
  target: bigint;
  turn: number;
  regions: number;
}

export interface GameState {
  version: 3;
  seed: string;
  mode: Mode;
  rng: { war: RngState; crisis: RngState; deal: RngState; shop: RngState };
  phase: Phase;
  /** The turn being played (or just played), from 1. */
  turn: number;
  owner: Record<RegionId, Owner>;
  coins: number;
  /** Seated staff, left to right; empty seats are the slots past the end (5 seats). */
  seats: Seat[];
  /** The Old Hand's multiplier in tenths (10 = x1.0); back to 10 when it leaves. */
  oldHandM10: number;
  nextUid: number;
  /** Seat uids hired since the last send. */
  hiredSinceSend: number[];
  deal: Deal;
  shop: Shop | null;
  shopVisits: number;
  ending: Ending | null;
  /**
   * Misses made in the final push (0 before it). The push forgives: RULES.pushMisses - pushMisses
   * misses are left, and the last of them ends the game as a CEASEFIRE.
   */
  pushMisses: number;
  lastSend: SendRecord | null;
  log: TurnLog[];
  best: BestSend | null;
  /** The most regions war has held at once this game. */
  peakWar: number;
  /** Regions won as a crisis (a brass pin as decoration). */
  brass: RegionId[];
}

/** What every action returns. On refusal the state is the one passed in, unchanged. */
export type Result = { ok: true; state: GameState } | { ok: false; reason: string; state: GameState };
