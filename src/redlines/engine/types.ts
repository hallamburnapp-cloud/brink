/**
 * BRINK: Red Lines — the state the engine hands to the screens, the bots and the save. Plain JSON:
 * a Preact signal can hold a state, a save is JSON.stringify of one, and every action returns a new
 * object (the one it was given is never changed). The block up to `GameState` is BUILD.md's contract
 * word for word; the fields marked "beyond BUILD.md" are the engine's own and the screens may ignore
 * them. docs/redlines/ENGINE.md explains each.
 */

export type RegionId = string; // the 30 ids in src/thirty/ui/map/data.ts
export type RegionState = 'calm' | 'pressed' | 'fighting';
export type Step = 1 | 2 | 3 | 4 | 5; // TESTING PUSHING MASSING FIGHTING ALL-OUT
export const STEP_WORDS = ['', 'TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT'] as const;
export type PieceKind = 'fleet' | 'brigade';
export interface Piece {
  kind: PieceKind;
  at: RegionId;
}
export interface PromiseMark {
  region: RegionId;
  since: number;
  inherited: boolean;
}
/** Declared before week 1; `real` is hidden from the player until the debrief. */
export interface Line {
  id: string;
  text: string;
  real: boolean;
}
/** Where their forces are heading next week; `real` is hidden (a feint looks the same on the map). */
export interface Heading {
  from: RegionId;
  to: RegionId;
  real: boolean;
}
export interface Federation {
  /** 0.2..0.8, hidden: how hard it pushes unguarded places. */
  appetite: number;
  /** 0.2..0.8, hidden: how little force near its borders it tolerates. */
  jumpiness: number;
  /** Public: the stamped word. */
  step: Step;
  /** 0..100, hidden: how far they believe your promises. */
  belief: number;
  /** 0..100: the TREATY bar (public). */
  will: number;
  /** 3: two real, one bluff. */
  lines: Line[];
  /** What the map shows for next week (2; one may be a feint). */
  headings: Heading[];
}
export interface RegionRec {
  state: RegionState;
  /** Weeks pressed and unanswered: the fall clock (0 the week it is pushed). */
  pressedWeeks: number;
  fellWeek?: number;
  recoveredWeek?: number;
  /** Beyond BUILD.md: weeks in a row the pressure was answered or paused; at RULES.quietToCalm the place is calm again. */
  quietWeeks: number;
  /** Beyond BUILD.md: how it fell, for the WORLD WAR ending's sentence. */
  fellBy?: FallCause;
}
export type FallCause = 'back-down' | 'back-down-inherited' | 'unanswered' | 'failed' | 'spread' | 'waited';
export type Phase = 'act' | 'phone' | 'ended';
export interface PhoneOption {
  key: 'back' | 'down' | 'wait';
  label: string;
  cost: string;
}
export interface Phone {
  template: string;
  caller: { name: string; role: string; tag: string };
  text: string;
  advisers: { hawk: string; dove: string; intel: string };
  region: RegionId | null;
  round: 1 | 2 | 3;
  options: PhoneOption[];
  /** Beyond BUILD.md: what the call is about (a test of a promise, or one of the events). */
  kind: PhoneKind;
}
/** The call's kind: a test of a promise (three flavours of template, drawn alike) or an event. */
export type PhoneKind = 'test' | 'test-inherited' | 'feint' | 'false-alarm' | 'trawler' | 'bluff-crossed' | 'summit' | 'fall-unpromised';
export interface WeekLog {
  week: number;
  /** What the tape showed: the resolve's lines, in order. */
  visible: string[];
  /** The Federation's hidden decisions, in plain past-tense lines addressed to the player. */
  hidden: string[];
  danger: { war: number; treaty: number; step: Step };
  /** Beyond BUILD.md: the player's own orders and answers that week, in plain words (the debrief's "what"). */
  acts: string[];
}
export type EndingKind = 'treaty' | 'war' | 'frozen';
export interface Ending {
  kind: EndingKind;
  week: number;
  fighting: number;
  score: number;
  lines: [string, string];
  because: string;
  dials: string;
}
export type WayOutTerm = 'drop-promise' | 'pull-back' | 'summit';
/** Beyond BUILD.md: this week's way out; the Federation answers it at resolve. */
export interface WayOutOffer {
  term: WayOutTerm;
  /** The promise's region for 'drop-promise', the piece for 'pull-back', null for 'summit'. */
  detail: RegionId | PieceKind | null;
  price: number;
}
/** Beyond BUILD.md: one thing the player did this week, written into the week's visible log at resolve. */
export type Act =
  | { kind: 'promise'; region: RegionId }
  | { kind: 'withdraw'; region: RegionId }
  | { kind: 'move'; piece: PieceKind; to: RegionId }
  | { kind: 'way-out'; term: WayOutTerm; detail: RegionId | PieceKind | null }
  | { kind: 'answer'; key: 'back' | 'down' | 'wait'; region: RegionId | null; phone: PhoneKind };
export interface GameState {
  seed: string;
  week: number;
  phase: Phase;
  influence: number;
  regions: Record<RegionId, RegionRec>;
  promises: PromiseMark[];
  pieces: Piece[];
  fed: Federation;
  /** Regions fighting. */
  war: number;
  /** = fed.will. */
  treaty: number;
  phone: Phone | null;
  pendingTest: RegionId | null;
  log: WeekLog[];
  ending: Ending | null;
  /** The opening's dilemma in one plain sentence. */
  collision: string;
  /** The tape, newest last (keep 6). */
  headline: string[];
  // ---- beyond BUILD.md ----
  /** This week's way out, if offered (once a week). */
  offer: WayOutOffer | null;
  /** Pieces moved this week (one move per piece per week). */
  moved: PieceKind[];
  /** This week's acts, in order; written into the log at resolve. */
  acts: Act[];
  /** Other blocs that have signed (at most RULES.maxBlocs). */
  signed: number;
  /** Ways out accepted so far. */
  waysOut: number;
  /** Line id → the week it was crossed. A line is crossed once. */
  crossed: Record<string, number>;
  /** The round the carried test will ring with (2 or 3); meaningful while pendingTest is set. */
  pendingRound: 1 | 2 | 3;
  /** Region → the week a backed promise turned them away from it (they leave it alone for a while). */
  turnedAway: Record<RegionId, number>;
  /** Event phones so far (at most RULES.events.maxPerGame). */
  events: number;
  /** Phone templates used, in order (variety: the same template is not drawn twice in a row). */
  phonesUsed: string[];
  /** The last promise backed and held (the treaty ending's "they could not take X"). */
  lastBacked: RegionId | null;
  /** Belief at the start of the week (the debrief's "by now they believed you" lines). */
  beliefWas: number;
}
export type Result = { ok: true; state: GameState } | { ok: false; reason: string };
