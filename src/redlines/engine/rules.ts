/**
 * Every number of the game in one place (SPEC-SMALL "The other side", "The two bars", "Endings and
 * the score"; BUILD.md "Numbers to start from"). Those the spec fixes are marked `spec`; the rest
 * are rulings or tuned by the simulator, and docs/redlines/ENGINE.md records every change.
 */
import type { EndingKind, Step, WayOutTerm } from './types.ts';

export const RULES = {
  /** spec: eight weeks. */
  weeks: 8,
  /** BUILD: influence 30 at start, +8 a week, −1 a week per promise. */
  influenceStart: 30,
  income: 8,
  upkeep: 1,
  /** spec: at most three promises. */
  maxPromises: 3,
  /** Ruling: drawing a promise costs this (the garrison's first week), then the upkeep. */
  promiseCost: 2,
  /** BUILD: a move costs 3; one move per piece per week. */
  moveCost: 3,
  /** BUILD: withdraw: belief −5, no other cost. */
  withdrawBelief: 5,
  /** BUILD: back a holdable promise 12 (6 once belief ≥ 60); a non-holdable one 24 and it fails one time in three. */
  backCost: 12,
  backCostBelieved: 6,
  believedAt: 60,
  backFarCost: 24,
  farFail: 1 / 3,
  /** Ruling ("the stakes up"): each WAIT adds this to the next round's BACK IT cost. */
  waitStakes: 6,
  /** BUILD: a way out costs 10 to 25, by term. The summit came down from 20 in round 12: a stopped Federation nearly always takes it, and at 20 a careful player could rarely afford it in the last weeks. */
  wayOutPrice: { 'drop-promise': 10, 'pull-back': 15, summit: 15 } as Record<WayOutTerm, number>,

  // ---- belief (hidden, 0..100) ----
  beliefStart: 50,
  /** BUILD: they test a promise they do not believe: dashed, or belief under this. */
  beliefTest: 40,
  backedBelief: 15,
  /** Ruling: backing a promise nothing of yours could reach, when it holds, teaches them nothing (you were lucky); they do not turn away from it either. */
  backedFarBelief: 0,
  failedBelief: 15,
  backDownBelief: 15,
  waitBelief: 5,
  /** spec: crossing the bluff makes them believe you more. */
  bluffBelief: 10,
  /** The trawler: backing the ally / disowning them. */
  allyBelief: 8,
  disownBelief: 8,
  /** The false alarm: going on alert looks like readiness. */
  alertBelief: 5,
  /** Sending force to a place nobody promised (you did more than you said). */
  unpromisedBelief: 5,
  /** The debrief's "by now they believed you" / "thought you would back down". */
  believedLine: 60,
  doubtedLine: 40,

  // ---- the TREATY bar (fed.will, public) ----
  /** Ruling: where the bar starts (tuning log, round 9). */
  willStart: 55,
  /** spec: +5 if they gained nothing this week. */
  willQuiet: 5,
  /** spec: +15 when a way out is accepted. */
  willWayOut: 15,
  /** spec: +10 when another bloc signs (at most two). */
  willBloc: 10,
  maxBlocs: 2,
  /** spec: −5 for each place they gained. */
  willPerGain: 5,
  /** spec: −10 when humiliated (a public ultimatum they must refuse). Ruling: a way out they refuse is that. */
  willHumiliated: 10,
  /** spec: at 100 they sign, if no place fell this week. */
  willSign: 100,
  /** Ruling: in a quiet week from this week on, another bloc signs with this chance (until two have). 0.5 until round 12. */
  blocSignChance: 0.45,
  blocSignFrom: 3,

  // ---- the WAR bar ----
  /**
   * spec (SPEC-SMALL v6 "The two bars"): eight pencil boxes; the eighth is WORLD WAR. The first draft
   * said twelve of thirty; in eight weeks twelve was out of reach and a collapse ran out of weeks
   * instead of ending (tuning round 12), so the owner's cut set the line at eight.
   */
  warLimit: 8,

  // ---- places ----
  /**
   * BUILD: a pressed region falls after N weeks unanswered: 3 at TESTING, 2 at PUSHING, 1 at MASSING and
   * above (index = step). The clock runs every week the place is pressed and unanswered.
   */
  fallWeeks: [0, 3, 2, 1, 1, 1] as const,
  /** BUILD: pressed returns to calm after two quiet weeks. */
  quietToCalm: 2,
  /** Ruling: real pushes a week by step (one at TESTING and PUSHING, two from MASSING). */
  pushesByStep: [0, 1, 1, 2, 2, 2] as const,
  /** BUILD: a feint one week in three (when two pushes were due, one of them is the feint instead). */
  feintChance: 1 / 3,
  /** Ruling: the feint points at a promised place (to make you jump) this often; otherwise at an unguarded one. */
  feintAtPromise: 0.5,
  /**
   * Ruling: from MASSING the fighting spreads on its own to this many neighbours of a fighting place a
   * week (3 at MASSING, 5 at FIGHTING, 8 at ALL-OUT). At MASSING it spares answered places (a piece in
   * them, or a solid promise not under test); from FIGHTING only a piece standing in a place keeps it
   * out (the fighting rolls over a promise nobody is there to keep). Round 12: with WORLD WAR at eight,
   * a collapse that ran out of weeks at five to seven places fighting is what this closes.
   */
  spreadByStep: [0, 0, 0, 3, 5, 8] as const,
  spreadIgnoresPromisesFrom: 4 as Step,
  /** Ruling: their forces reach this many steps (land joins and lanes) from a foothold: the Cap, or a place pressed or fighting. One: a creeping front. */
  reach: 1,
  /** Ruling: after a promise is backed and held they leave that place alone for this many weeks. */
  turnAwayWeeks: 2,

  // ---- the ladder ----
  /** spec: "a place taken unanswered" is a step up. Ruling: per place (true) or at most one step a week for falls (false). */
  stepPerFall: true,
  /** spec: at MASSING and above, an accident one chance in twenty a week. */
  accidentFrom: 3 as Step,
  accidentChance: 1 / 20,
  /** Ruling: a piece of yours on their doorstep (NEAR_CAP) climbs the ladder with chance jumpiness × this, each week. */
  jumpyScale: 0.45,

  // ---- their choice of where to push (weights) ----
  weight: {
    /** An unguarded place: unguarded + appetite × appetite (a hungry Federation prefers the open door; see planHeadings for how often it opens one). */
    unguarded: 1,
    appetite: 1.0,
    /** A place already pressed, when they are not opening a new front (keep the pressure on). */
    pressed: 0.6,
    /** A place with one of your pieces standing in it. */
    piece: 0.15,
    /** A dashed promise (a test!). */
    dashed: 1.4,
    /** A solid promise when belief is under beliefTest. */
    doubted: 0.9,
    /** (see believedTestByStep) */
    believed: 0.05,
    /** Highmarch itself (the Republic's own regions). */
    home: 0.5,
    /** Two steps from their nearest foothold rather than one. */
    far: 0.6,
  },

  /**
   * Ruling: a solid promise they believe is tested rarely ("mostly do not"), and more the higher the
   * ladder (index = step): committed forces probe even what they believe.
   */
  believedTestByStep: [0, 0.3, 0.35, 0.4, 0.5, 0.6] as const,
  /** Ruling: appetite bites. Over appetitePushOver, a second real push lands some weeks, with chance (appetite − over) × scale. */
  appetitePushOver: 0.5,
  appetitePushScale: 2,

  // ---- ways out (the chance they accept; a refusal humiliates them) ----
  wayOut: {
    /** Ruling: before this week a way out is refused ("they saw no need to talk yet"): nothing has stopped them. */
    fromWeek: 3,
    /** They refuse outright when they took this many places this week; one place halves the chance. */
    gainedRefuse: 2,
    gainedScale: 0.5,
    /** drop-promise: the promise is one they were heading for, testing, or could not be held → grievance; else indifferent (0.25 until round 12). */
    dropGrievance: 0.8,
    dropIndifferent: 0.35,
    /** pull-back: the piece is on their doorstep or inside a line's regions → base + jumpiness × scale. */
    pullNearBase: 0.35,
    pullNearJumpy: 0.6,
    pullFar: 0.2,
    /** summit by step (index = step). Round 12 raised the two low steps from 0.3 / 0.45: a Federation that has been stopped talks. */
    summitByStep: [0, 0.45, 0.55, 0.7, 0.75, 0.8] as const,
    /** + (will − 50) / this. */
    summitWill: 150,
    /** + this when they gained nothing last week either (they have been stopped: "they could not take X"). 0.3 until round 12. */
    blocked: 0.5,
    /** − (appetite − 0.5) × this: a hungry Federation refuses more. */
    appetite: 0.4,
    min: 0.05,
    max: 0.95,
  },

  /** Ruling: "blocked" counts from this week on (before it they have had no time to take anything). */
  blockedFromWeek: 3,

  // ---- the event phones ----
  events: {
    maxPerGame: 4,
    /** Their own summit offers a game, at most. */
    summitMax: 2,
    summitChance: 0.5,
    summitFromStep: 1 as Step,
    summitFromWeek: 4,
    summitMinWill: 45,
    summitAcceptCost: 10,
    summitRefuseWill: 5,
    falseAlarmChance: 0.25,
    falseAlarmFromStep: 3 as Step,
    alertCost: 6,
    trawlerChance: 0.12,
    trawlerFromWeek: 2,
    trawlerBackCost: 6,
    trawlerLeanCost: 3,
    trawlerBackWill: 5,
    trawlerDisownWill: 5,
    unpromisedBackCost: 15,
    bluffPullBelief: 5,
  },

  // ---- the score (spec) ----
  score: { treatyBase: 100, treatyPerWeek: 10, treatyPerFighting: 5, treatyMin: 10, frozenBase: 9, frozenMin: 1 },

  // ---- the dials ----
  dialMin: 0.2,
  dialMax: 0.8,
  /** In words: under low is "careful"/"not easily scared", over high is "hungry"/"easily scared". */
  dialLow: 0.4,
  dialHigh: 0.6,

  /** The tape keeps this many lines. */
  tapeLines: 6,
} as const;

export const TESTING: Step = 1;
export const PUSHING: Step = 2;
export const MASSING: Step = 3;
export const FIGHTING: Step = 4;
export const ALL_OUT: Step = 5;

export function clampStep(n: number): Step {
  return (n < 1 ? 1 : n > 5 ? 5 : Math.round(n)) as Step;
}
export function fallWeeksAt(step: Step): number {
  return RULES.fallWeeks[step];
}
export function pushesAt(step: Step): number {
  return RULES.pushesByStep[step];
}
export function spreadAt(step: Step): number {
  return RULES.spreadByStep[step];
}

/** spec: treaty 100 − 10w − 5f (min 10); frozen 9 − f (min 1); war 0. */
export function scoreOf(ending: { kind: EndingKind; week: number; fighting: number }): number {
  const S = RULES.score;
  if (ending.kind === 'treaty') return Math.max(S.treatyMin, S.treatyBase - S.treatyPerWeek * ending.week - S.treatyPerFighting * ending.fighting);
  if (ending.kind === 'frozen') return Math.max(S.frozenMin, S.frozenBase - ending.fighting);
  return 0;
}

export function clamp100(n: number): number {
  return n < 0 ? 0 : n > 100 ? 100 : Math.round(n);
}
