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
  /**
   * Beyond BUILD.md (SPEC-SMALL "No formula wins"): a ring drawn on a place already under siege is a provocation. Until
   * they believe it, or it is backed on a call, it pauses no clock, and their next plan tests it.
   */
  provocation?: boolean;
}
/** Declared before week 1; `real` is hidden from the player until the debrief. */
export interface Line {
  id: string;
  text: string;
  real: boolean;
  /**
   * Beyond BUILD.md: what crosses it and where (the pack's line, copied at the opening so the rules can read it without
   * the pack: SPEC-SMALL "Out of reach means out of reach"), and its tape words (SPEC-SMALL "The three lines stay on the
   * sheet"). Missing in an old save.
   */
  kind?: 'proximity' | 'sea' | 'alliance' | 'missiles';
  regions?: RegionId[];
  tape?: string;
}
/** Where their forces are heading next week; `real` is hidden (a feint looks the same on the map). */
export interface Heading {
  from: RegionId;
  to: RegionId;
  real: boolean;
  /**
   * Beyond BUILD.md (SPEC-SMALL "The debrief reads motives when they were formed"): why they chose the place, recorded
   * when the heading was planned (a strings.why code), and the piece the 'piece' reason names. Missing in an old save.
   */
  why?: string;
  whyPiece?: PieceKind;
  /** Beyond BUILD.md: a real push that is there only because their timetable calls for two from RULES.bothRealFromWeek (the debrief blames the timetable, not their appetite). */
  timetable?: boolean;
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
  /** Beyond BUILD.md: the order in which places fell over the game (1 is the first fall on the tape); the WORLD WAR card names the lowest. */
  fellSeq?: number;
  /** Beyond BUILD.md: whether something of yours could have reached it when it fell (a fall out of reach climbs no step; the tape says so). */
  fellReach?: boolean;
  /**
   * Beyond BUILD.md (SPEC-SMALL "An out-of-reach fall is war, not a failure": the reckoning is checked against the note):
   * set at the start of a week whose note called this place out of reach (it falls this week and no piece could answer it
   * with the move it had), and kept while it stands hatched. Such a place is never counted as reachable when it falls.
   */
  noteFar?: boolean;
  /** Beyond BUILD.md: the week whose note, at its start, said this place falls "unless something of ours reaches it" (a piece could). */
  noteNear?: number;
  /**
   * Beyond BUILD.md (SPEC-SMALL "The ladder is not a cliff, at any rung"): the length of this place's fall clock, in weeks,
   * set when it is pressed (the step's clock then) and moved at most one tick by each step of the ladder while it runs. It
   * falls when `pressedWeeks` reaches it. Missing in an old save: the clock of the step the week started at.
   */
  clock?: number;
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
  /** What the tape showed: the resolve's lines, in order (cause before effect: what you or they did, then what it caused). */
  visible: string[];
  /** The Federation's hidden decisions, in plain past-tense lines addressed to the player. */
  hidden: string[];
  danger: { war: number; treaty: number; step: Step };
  /** Beyond BUILD.md: the player's own orders and answers that week, in plain words (the debrief's "what"). */
  acts: string[];
  /**
   * Beyond BUILD.md (after the recheck): one entry per `visible` line, in step with it: the headline kind the
   * line was written from, the place it names (an id, or null), and the sheet right after it (places fighting,
   * the ladder's step, the TREATY bar). A playback can set the WAR boxes, the stamp and the bar beat by beat
   * from these and never disagree with the sheet. Missing in a save from before it.
   */
  beats?: LogBeat[];
}
/** One tape line's facts (WeekLog.beats). `kind` is a strings.headlines key (content.ts HEADLINE_KINDS). */
export interface LogBeat {
  kind: string;
  region: RegionId | null;
  war: number;
  step: Step;
  treaty: number;
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
  /** Beyond BUILD.md: two or three lessons drawn from the game's own events, for the closing card (also the last hidden lines of the final week). */
  lessons?: string[];
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
  | { kind: 'answer'; key: 'back' | 'down' | 'wait'; region: RegionId | null; phone: PhoneKind; round?: 1 | 2 | 3 };
export interface GameState {
  seed: string;
  week: number;
  phase: Phase;
  influence: number;
  regions: Record<RegionId, RegionRec>;
  promises: PromiseMark[];
  pieces: Piece[];
  fed: Federation;
  /** Regions fighting: kept current in every state the engine returns, mid-week included (SPEC-SMALL: the WAR boxes always match the sheet). */
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
  /** Beyond BUILD.md: a feint you waited on last week; this week's tape says the column has gone (WAIT buys information). */
  feintGone?: RegionId | null;
  /** Beyond BUILD.md: what the game has shown so far, for the closing card's lessons and the dials line. Missing in an old save means zeros. */
  tally?: Tally;
  /**
   * Beyond BUILD.md (SPEC-SMALL "The feint keeps its mystery"): the other columns of a week whose test call is on the
   * line. They land, and their lines print, after the answer. Null otherwise.
   */
  afterCall?: Heading[] | null;
  /** Beyond BUILD.md: the week the debrief's one "they went for X" thought was written (at most one a week, across the call). */
  headingSaid?: number;
  /** Beyond BUILD.md: the week a way out (yours or their summit) was last accepted; at most one is accepted in any two weeks (SPEC-SMALL "No formula wins"). */
  wayOutWeek?: number | null;
  /**
   * Beyond BUILD.md (integrated round 15): a believed ring their plan for this week leaves alone, chosen when the week was
   * planned and said on this week's debrief page ("They left Vessary alone because they believed you"), not on the page of
   * the week before, where they may well have been testing it.
   */
  quietRing?: RegionId | null;
}
/** One back-down at a test, for the closing card's lesson (which reads what became of the place). */
export interface BackDownRec {
  region: RegionId;
  week: number;
  /** The column was a feint (nothing came; the step up was for the public back-down). */
  feint: boolean;
  /** A scared Federation stood down too (once a game at most). */
  eased: boolean;
  /** Integrated round 15: they were at the top of the ladder already ("· still ALL-OUT"), so the back-down climbed no step. */
  top?: boolean;
}
/** Counts kept over the game for the debrief's lessons (SPEC-SMALL rulings: "The debrief teaches"). */
export interface Tally {
  /** Tests of a solid promise, and of a dashed one. */
  testsSolid: number;
  testsDashed: number;
  /** Real tests backed and held; back-downs at a test (and the first place); feints backed (paid for nothing; and the first place). */
  backed: number;
  backedDown: number;
  backedDownFirst: RegionId | null;
  feintsBacked: number;
  feintBackedFirst: RegionId | null;
  /** Places that fell with nothing of yours in reach; the first of them. */
  outOfReach: number;
  outOfReachFirst: RegionId | null;
  /** Counter moves over the game; weeks with no orders at all. */
  moves: number;
  idleWeeks: number;
  /** A dropped promise offered that they did not care about (nowhere near their front); the first such place. */
  farDrops: number;
  farDropFirst: RegionId | null;
  /** A way out accepted (or their summit taken) in the week after a week in which they took nothing. */
  stoppedThenTalked: number;
  /** Whether anything let jumpiness act where the player could see it (a piece on their doorstep, an alarm, a pull-back, a back-down). */
  jumpinessSeen: boolean;
  /** Every back-down at a test, in order (the lesson reads whether the place fell and stayed fallen). Missing in an old save. */
  backDowns?: BackDownRec[];
  /** Weeks with no orders in which an order could have answered something (a hatched place a piece could hold after one move). */
  idleAnswerable?: number;
  /** Steps up their doorstep provoked (a piece of yours next to the Cap), and the first piece and place that provoked one. */
  jumpySteps?: number;
  jumpyFirst?: { piece: PieceKind; region: RegionId } | null;
  /** Times a scared Federation stood down after a back-down (at most once a game: SPEC-SMALL "Backing down is never the best answer"). */
  eased?: number;
  /** Every place the player promised over the game, inherited rings included (a lesson about a place answers only one the player touched). */
  ringed?: RegionId[];
  /** The first fall out of reach of a place the player had promised at some time. */
  outOfReachRinged?: RegionId | null;
  /** The last week the TREATY bar stood at 100 and they did not sign, and why (a place taken that week, or the places still unanswered). */
  noSign?: { week: number; taken: boolean; regions: RegionId[] } | null;
  /** Places offered up as a dropped promise and refused as "a small thing" (the form dims them after: the tape already said so). */
  smallThings?: RegionId[];
  /** Whether the debrief has said the timetable's two real arrows once (it is said once a game). */
  timetableSaid?: boolean;
  /** The plain "both arrows were real" line, said once a game too (the third recheck: it printed on four pages of five). */
  bothRealSaid?: boolean;
}
export type Result = { ok: true; state: GameState } | { ok: false; reason: string };
