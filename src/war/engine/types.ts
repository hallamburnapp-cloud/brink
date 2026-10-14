/**
 * The run state and the records the engine hands to the UI, the audio and the bots.
 * State is plain data (BigInt for every score-sized number). Actions never mutate a state they
 * were given: each returns a new object, so a Preact signal can hold it and see every change.
 */
import type { RngState } from '../../engine/rng';
import type { Colour, RegionId, Stamp } from '../ui/map/contract';
import type { FolderKind, OrderId } from '../content/orders';
import type { PatternId } from '../content/patterns';
import type { StaffId } from '../content/staff';

export type { Colour, RegionId, PatternId, StaffId, OrderId, FolderKind };

export type StampKind = Exclude<Stamp, null>;

export type CrisisKind = 'FLARE_UP' | 'STANDOFF' | 'SUMMIT';
export type TwistKind = 'GRIDLOCK' | 'BLACKOUT' | 'FULL_TABLE';
export type Phase = 'crisis' | 'briefing' | 'missed' | 'sliceEnd';
export type RunMode = 'run' | 'late' | 'mid';

export interface Twist {
  kind: TwistKind;
  /** The blacked-out colour (BLACKOUT only), picked when the Hour starts. */
  colour: Colour | null;
}

/** One Hour of the night: three crises and the Summit's twist. */
export interface HourPlan {
  /** 0 is 22:00, 1 is 23:00, 2 is 00:00, 3 is 01:00 ... 8 and later are Overtime. */
  index: number;
  /** Flare-up, Standoff and Summit targets. */
  targets: [bigint, bigint, bigint];
  twist: Twist;
}

/** Everything about the map that persists for the whole run. */
export interface World {
  /** Current colour of every region (DEFECT changes it). */
  colour: Record<RegionId, Colour>;
  /** Regions made Capitals by PROMOTE. */
  promoted: RegionId[];
  /** LAY CABLE joins, in the order laid. Both ends count as Ports. */
  cables: Array<[RegionId, RegionId]>;
  /** One stamp per region at most; only stamped regions have a key. */
  stamps: Record<RegionId, StampKind>;
  /** Brass pins per region (+5 Influence each when it scores); only regions with pins have a key. */
  brass: Record<RegionId, number>;
  /** Traffic per join, keyed by joinKey(a, b) ('AAA|BBB', sorted). */
  traffic: Record<string, number>;
  /** Regions out of the deck for the run (RETIRE). */
  retired: RegionId[];
  /** Pattern levels, all starting at 1. */
  levels: Record<PatternId, number>;
  /** Times each region has scored this run (drives the Influence glow). */
  scored: Record<RegionId, number>;
}

export interface SeatedStaff {
  /** Unique within the run; stable across seat moves (use it as a list key). */
  uid: number;
  id: StaffId;
  /** The Old Hand's count (0 for everyone else). */
  count: number;
}

export interface Paper {
  uid: number;
  id: OrderId;
}

/** A finished sweep, without its trace (kept on the crisis for the end screens). */
export interface SweepSummary {
  /** 1-based sweep number within its crisis. */
  n: number;
  pins: RegionId[];
  pattern: PatternId;
  level: number;
  scoringSet: RegionId[];
  topRegion: RegionId;
  leverage: bigint;
  totalBefore: bigint;
  totalAfter: bigint;
  target: bigint;
  cleared: boolean;
}

export type TracePhase = 'pattern' | 'pin' | 'thread' | 'stamp' | 'staff' | 'again' | 'standby' | 'desk' | 'slam';
export type TraceOp = 'base' | '+I' | '+M' | 'xM' | 'again' | 'slam';
export type AgainReason = 'flashpoint' | 'echo' | 'courier' | 'signals';

/**
 * One step of a sweep, in animation order. I and M10 are the running values after the step.
 * `amount` is the human-sized change: Influence for '+I', whole Momentum for '+M' ('4'),
 * the factor for 'xM' ('1.5', '2', '3'), the leverage for 'slam', base Influence for 'pattern'.
 */
export interface TraceEvent {
  i: number;
  phase: TracePhase;
  region?: RegionId;
  /** thread: the already-scored pin the thread runs back to. */
  other?: RegionId;
  /** Index into state.staff of the seat that fired (0 = leftmost). */
  seat?: number;
  /** The rule that fired. For a Deputy this is the copied staff's id (and viaDeputy is set). */
  staffId?: StaffId;
  op: TraceOp;
  amount: string;
  I: string;
  M10: string;
  /** pin / thread / stamp / staff / again: index of the pin in sweep order. */
  step?: number;
  /** pin / stamp / staff / again: 0 on the first pass, 1.. on each AGAIN. */
  pass?: number;
  /** again: why this pin scores again. */
  reason?: AgainReason;
  stamp?: StampKind;
  viaDeputy?: boolean;
  /** pin: BLACKOUT. The scan line passes this pin and it adds nothing. */
  dark?: boolean;
  /** pattern: the pattern made and its level. */
  pattern?: PatternId;
  level?: number;
}

/** The full record of the latest sweep, for the scoring animation. */
export interface SweepRecord extends SweepSummary {
  /** Base values at the pattern's level. */
  baseInfluence: bigint;
  baseM10: bigint;
  influence: bigint;
  m10: bigint;
  /** The Surround's ringed region, if the pattern is SURROUND. */
  ringed: RegionId | null;
  /** Joined pairs inside the scoring set (each gained +1 traffic). */
  threads: Array<[RegionId, RegionId]>;
  /** Index of the crisis's Hour and the crisis in it, for labels. */
  hour: number;
  crisisIndex: number;
  trace: TraceEvent[];
}

export interface ClearRecord {
  hour: number;
  crisisIndex: number;
  reward: number;
  unusedSweeps: number;
  interest: number;
  overwhelm: number;
  treasurer: number;
  /** The sum of the above. */
  payout: number;
  fundsBefore: number;
  fundsAfter: number;
  /** Where the brass pin dropped (topRegion of the clearing sweep). */
  brass: RegionId;
}

export interface Crisis {
  hour: number;
  index: 0 | 1 | 2;
  kind: CrisisKind;
  target: bigint;
  total: bigint;
  sweepsLeft: number;
  swapsLeft: number;
  flashpoint: RegionId;
  /** Regions still to light, next first. */
  pile: RegionId[];
  /** Lit regions in the order they lit. */
  lit: RegionId[];
  spent: RegionId[];
  /** The current selection, in tap order (includes the Airlift pin). */
  pins: RegionId[];
  /** The region pinned by AIRLIFT for the next sweep (not lit). */
  airlift: RegionId | null;
  /** The AIRLIFT paper, returned to the tray if that pin is lifted. */
  airliftPaper: Paper | null;
  sweeps: SweepSummary[];
  cleared: boolean;
}

export type Offer =
  | { kind: 'staff'; id: StaffId; price: number }
  | { kind: 'order'; id: OrderId; price: number }
  | { kind: 'playbook'; pattern: PatternId; price: number };

export type FolderStatus = 'sealed' | 'open' | 'used';

export type Folder =
  | { kind: 'recruit'; price: number; contents: StaffId[]; status: FolderStatus }
  | { kind: 'orders'; price: number; contents: OrderId[]; status: FolderStatus };

export interface Shop {
  /** 1 for the run's first Briefing. */
  briefing: number;
  /** Two offer slots; null once bought. */
  offers: Array<Offer | null>;
  folder: Folder;
  rerollCost: number;
}

/** An Order waiting for its targets. */
export interface Armed {
  slot: number;
  order: OrderId;
  chosen: RegionId[];
}

export interface RunLogEntry {
  hour: number;
  crisisIndex: number;
  kind: CrisisKind;
  target: bigint;
  total: bigint;
  sweepsUsed: number;
  cleared: boolean;
  bestPattern: PatternId | null;
  bestLeverage: bigint;
}

export interface BestSweep {
  leverage: bigint;
  pattern: PatternId;
  level: number;
  pins: RegionId[];
  scoringSet: RegionId[];
  hour: number;
  crisisIndex: number;
}

export interface RunState {
  version: 1;
  seed: string;
  mode: RunMode;
  /** Seed 'FIRST-NIGHT': scripted first deal and first Briefing, first-night hints. */
  firstNight: boolean;
  rng: { deal: RngState; shop: RngState; twist: RngState };
  phase: Phase;
  hour: HourPlan;
  /** The Hour whose Summit ends the slice (null after KEEP GOING). */
  sliceEndHour: number | null;
  funds: number;
  seatCount: number;
  traySlots: number;
  /** Seated staff, left to right; empty seats are the slots past the end. */
  staff: SeatedStaff[];
  /** In-tray papers, slot order. */
  tray: Paper[];
  world: World;
  crisis: Crisis;
  shop: Shop | null;
  armed: Armed | null;
  lastSweep: SweepRecord | null;
  lastClear: ClearRecord | null;
  best: BestSweep | null;
  log: RunLogEntry[];
  /** How many times each pattern has been made this run. */
  made: Record<PatternId, number>;
  sweepsTaken: number;
  briefings: number;
  nextUid: number;
}

/** What every action returns. On refusal the state is the one passed in, unchanged. */
export type Result = { ok: true; state: RunState } | { ok: false; reason: string; state: RunState };
