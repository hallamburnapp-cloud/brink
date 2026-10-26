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
  /** SPEC-SMALL ruling: backing a feint earns nothing (they were not coming); the debrief says so. */
  backedFeintBelief: 0,
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
  willStart: 50,
  /** spec: +5 if they gained nothing this week. SPEC-SMALL ruling: only when no place is pressed and unanswered (see quietBlockedBy). */
  willQuiet: 5,
  /**
   * Which pressed, unanswered places hold the +5 back: 'any' (the ruling's words) or only those something of
   * yours could reach ('reachable': a place beyond both pieces is nobody's failure). Tuning round 13 decides.
   */
  quietBlockedBy: 'reachable' as 'any' | 'reachable',
  /** spec: +15 when a way out is accepted. */
  willWayOut: 15,
  /** spec: +10 when another bloc signs (at most two). */
  willBloc: 10,
  maxBlocs: 2,
  /** spec: −5 for each place they gained. */
  willPerGain: 5,
  /**
   * spec: −10 when humiliated (a public ultimatum they must refuse). SPEC-SMALL ruling (after the first review): a
   * way out they refuse costs NOTHING on the bar (the tape prints their reason instead); the one humiliation in the
   * first build is refusing their own summit offer in public.
   */
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
   * above (index = step). The clock runs every week the place is pressed and unanswered. SPEC-SMALL ruling:
   * the clock reads the step the week STARTED at, never a step climbed inside the same week.
   */
  fallWeeks: [0, 3, 2, 1, 1, 1] as const,
  /**
   * Tuning knob (round 13): the fall clock of a pressed place nothing of yours could reach (nobody is there
   * to slow them): null reads the step's clock like any other place; a number is the weeks it takes (0: taken
   * the week it is pushed).
   */
  outOfReachFallWeeks: null as number | null,
  /** BUILD: pressed returns to calm after two quiet weeks. */
  quietToCalm: 2,
  /** Ruling: real pushes a week by step (one at TESTING and PUSHING, two from MASSING). */
  pushesByStep: [0, 1, 1, 2, 2, 2] as const,
  /** BUILD: a feint one week in three (when two pushes were due, one of them is the feint instead). */
  feintChance: 1 / 3,
  /** Ruling: the feint points at a promised place (to make you jump) this often; otherwise at an unguarded one. */
  feintAtPromise: 0.5,
  /**
   * SPEC-SMALL ("The other side", and the rulings after the first review): the fighting spreads only at
   * FIGHTING and ALL-OUT, one or two places a week, to neighbours of a fighting place; a piece standing in a
   * place or a solid promise on it spares it. (Round 12 had 3 / 5 / 8 from MASSING, which made the ladder a
   * cliff: round 13.)
   */
  spreadByStep: [0, 0, 0, 0, 1, 2] as const,
  /** SPEC-SMALL ruling: the Federation's first fronts touch the Scatter and Highmarch before the Sound (the Sound's weight is scaled down for these weeks). */
  earlyFronts: { untilWeek: 2, soundScale: 0.25 },
  /** Ruling: their forces reach this many steps (land joins and lanes) from a foothold: the Cap, or a place pressed or fighting. One: a creeping front. */
  reach: 1,
  /** Ruling: after a promise is backed and held they leave that place alone for this many weeks (2 until round 13: they came back to the same ring every other week). */
  turnAwayWeeks: 3,

  // ---- the ladder ----
  /** spec: "a place taken unanswered" is a step up. SPEC-SMALL ruling: falls move the ladder at most one step in a week (false); per place was round 9-12. */
  stepPerFall: false,
  /**
   * SPEC-SMALL ruling: "BACK DOWN near a scared Federation is a step down": when jumpiness is over dialHigh, a
   * back-down at a real test eases them a step instead of climbing one (the place still falls to them).
   */
  backDownEasesWhenScared: true,
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
    /** drop-promise: the promise is within their reach (a place they could push next week), heading for or under test → grievance; else indifferent. SPEC-SMALL ruling: a far promise cannot be sold (round 12 counted any dashed promise as minded). */
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
    falseAlarmChance: 0.25,
    /** From PUSHING (round 13; MASSING before): the alarm is one of the few places jumpiness shows. */
    falseAlarmFromStep: 2 as Step,
    alertCost: 6,
    trawlerChance: 0.12,
    trawlerFromWeek: 2,
    trawlerBackCost: 6,
    trawlerLeanCost: 3,
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
/** The Federation is "scared" (easily scared) when its jumpiness is over the high mark. */
export function isScared(jumpiness: number): boolean {
  return jumpiness > RULES.dialHigh;
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
