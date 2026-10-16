/**
 * The numbers of the game (SPEC "The rules") in one place. Those the spec fixes are marked so;
 * the rest are the ones the simulator may tune (pressure odds, piece reach), and ENGINE.md
 * records every change to them.
 */
import type { Heat } from '../content/types.ts';

export const RULES = {
  /** Spec: 30 days. */
  days: 30,
  /** Spec: three TENSE regions and one CRISIS to start, never in Highmarch on day 1. */
  startTense: 3,
  startCrisis: 1,
  /** Spec: DANGER = 2 x TENSE + 5 x CRISIS + 12 x WAR, capped at 100. */
  dangerPer: [0, 2, 5, 12] as const,
  dangerCap: 100,
  /**
   * Ruling: a STAND-DOWN needs DANGER 0 after the choice from this day on. The spec says "after day 5";
   * the playtests found a day-6 win over a map that was never in danger read as a bug, so the crisis
   * must have run ten days before it can be over (ENGINE.md "Tuning", item 9).
   */
  standDownFromDay: 10,
  /**
   * Ruling: and there must have been a crisis to end: the gauge must have reached this reading at the
   * end of some day before a calm map is a STAND-DOWN. Below it a calm map is a quiet morning and the
   * month goes on (ENGINE.md "Tuning", item 15: a stand-down over a map that was never above 25 read
   * as the game giving up; 30 is two crises and ten tense regions, or a war and nine).
   */
  standDownPeak: 30,
  /** Spec: a HELD under this is a clean hold. */
  cleanHoldUnder: 20,
  /** Spec: the team offer comes after these days. */
  offerDays: [5, 10, 15, 20, 25] as const,
  offerSize: 3,
  /** Spec: up to five chips. */
  maxTeam: 5,
  /** Spec: CALM cools 1, FORCE cools 2 and heats a neighbour 1, RISKY cools 2 or heats 1. */
  calmCool: 1,
  forceCool: 2,
  forceHeat: 1,
  riskyCool: 2,
  riskyMissHeat: 1,
  /**
   * Ruling (beyond the spec's pressure): news. A card finds its region in trouble: on arrival the
   * region rises to `newsHeat` for an arc's first card and to `newsHeatPlain` for any other card about
   * a region, if it was calmer (0 switches either off). The story is what makes the world slide; see
   * ENGINE.md "Tuning".
   */
  newsHeat: 2 as Heat,
  newsHeatPlain: 1 as Heat,
  /**
   * Tunable: the slide. Pressure odds rise through the month from their day-1 value to their day-30
   * value (linear). The spec's one in three is the CRISIS odds; it is flat (item 15).
   */
  crisisPressureStart: 1 / 3,
  crisisPressureEnd: 1 / 3,
  /**
   * Tunable: the chance a TENSE region boils over on its own at night, at the start and the end (0 = off).
   * This is the number that makes the month slide at all: with the boil confined to regions beside a
   * crisis, random choices held in 40% of games at any rate (ENGINE.md "Tuning", item 13).
   */
  tensePressureStart: 0,
  tensePressureEnd: 0.08,
  /**
   * Tunable: flares. The expected number of CALM regions that turn TENSE each night, at the start and
   * the end (0 = off). Fading through the month (item 15): early on, flares are what gives the player
   * something to do; later the slide comes from the red and orange the player can see (spread, the
   * crisis-to-war pushes below), not from trouble starting at random, and a calm map has quiet nights.
   * A region the choice cooled today never flares the same night (the day's work is not undone before
   * morning).
   */
  flareStart: 1.0,
  flareEnd: 0.35,
  /** Tunable: the shape of the flare ramp: 1 is linear, 2 keeps the middle of the month quieter and the end as hot. */
  flareCurve: 1,
  /**
   * Tunable: from this day a CRISIS region that borders another CRISIS region may push it to WAR at
   * night, with a chance rising from 0 on that day to `warFromCrisisEnd` on day 30. Two orange regions
   * touching are the thing to break up.
   */
  warFromCrisisDay: 6,
  warFromCrisisEnd: 0.6,
  /**
   * Tunable: a crisis left standing turns red. From `warFromCrisisDay`, a CRISIS region that has stood
   * at least `crisisTipAfter` nights may go to WAR on its own, with a chance of `crisisTipStart` rising
   * to `crisisTipEnd` on day 30 (item 15: red the player can see coming, and point at).
   */
  crisisTipAfter: 1,
  crisisTipStart: 0.35,
  crisisTipEnd: 0.6,
  /**
   * Tunable (piece reach): how many steps the Hotline calms a crisis card by on arrival. One: the crisis
   * ends (CRISIS becomes TENSE) and the card still has something for the player to do.
   */
  hotlineCool: 1,
  /** Tunable (piece reach): how many steps the Loyal Admiral's show of force at sea cools each neighbouring region by (2: as much as the force itself). */
  admiralCool: 2,
  /** Spec: each WAR region heats one CALM or TENSE neighbour every night. */
  warSpreads: 1,
  /**
   * Tunable: the chance of a map card on a day when one fits ("sometimes a tap on the map"). One in eight: a
   * map day is kind to careless play (two of its three places lower DANGER, so a random tap is usually
   * right); one in five left random choices holding in just over 10% of games (ENGINE.md item 13), and
   * one in six did again once the force pieces became waves (item 15).
   */
  mapDayChance: 1 / 8,
  /** Ruling: a map card is dealt only when at least this many of its places would lower DANGER (no days of no-ops). */
  mapTargetsLowering: 2,
  /** Spec: a CRISIS region gets a card within this many days. */
  hotCardWithin: 2,
  /**
   * Ruling: a WAR region gets its card within this many days, like a crisis (the spec's two), so red can be
   * answered (it cools only through a choice). Next-day cards for red were a hand to the careless player,
   * who has red in four games of five (ENGINE.md item 13).
   */
  warCardWithin: 2,
  /** Draw weight of a card by its region's heat (CALM, TENSE, CRISIS, WAR). Tunable. */
  drawWeight: [1, 2, 4, 6] as const,
  /** Spec pieces. */
  oldAmbassadorExtra: 1,
  backChannelReach: 1,
  peaceMovementReach: 2,
  /**
   * Ruling (the pieces rewritten after the playtests; SPEC "The team"): the Hawk General's show of
   * force also cools every neighbouring region by this many steps (the spec's "two steps more" on the
   * acted region fired in 1% of games held: a force already takes orange to calm).
   */
  hawkNeighbourCool: 1,
  /** Ruling: the Cautious Intel Director adds this to the odds of every risky choice (capped at `oddsCap`). */
  cautiousOdds: 10,
  oddsCap: 95,
  /** Ruling: with the Paranoid Intel Director a CRISIS or WAR region gets its card within this many days (the next morning). */
  paranoidCardWithin: 1,
  /** Spec: the Hotline works once a week; a week is five days. */
  weekDays: 5,
  /** Spec: Red Lines, if the region reaches war, DANGER +15; Launch on Warning, a false alarm there is +20. */
  redLinePenalty: 15,
  falseAlarmPenalty: 20,
  /** Ruling: a `guarded` mark keeps pressure off the region for seven nights. */
  guardDays: 7,
} as const;

export const HEATS: readonly Heat[] = [0, 1, 2, 3];
export const HEAT_NAME: Readonly<Record<Heat, 'CALM' | 'TENSE' | 'CRISIS' | 'WAR'>> = { 0: 'CALM', 1: 'TENSE', 2: 'CRISIS', 3: 'WAR' };

export const CALM: Heat = 0;
export const TENSE: Heat = 1;
export const CRISIS: Heat = 2;
export const WAR: Heat = 3;

export function clampHeat(n: number): Heat {
  return (n < 0 ? 0 : n > 3 ? 3 : Math.round(n)) as Heat;
}

/** Where the month stands, 0 on day 1 to 1 on day 30: the pressure odds slide along it. */
export function slideAt(day: number): number {
  return Math.min(1, Math.max(0, (day - 1) / (RULES.days - 1)));
}

/** The chance a CRISIS region heats a neighbour tonight. */
export function crisisPressureAt(day: number): number {
  return RULES.crisisPressureStart + (RULES.crisisPressureEnd - RULES.crisisPressureStart) * slideAt(day);
}

/** The expected number of flares tonight: calm regions that turn TENSE on their own. */
export function flareAt(day: number): number {
  return RULES.flareStart + (RULES.flareEnd - RULES.flareStart) * Math.pow(slideAt(day), RULES.flareCurve);
}

/** The chance a TENSE region boils over tonight. */
export function tensePressureAt(day: number): number {
  return RULES.tensePressureStart + (RULES.tensePressureEnd - RULES.tensePressureStart) * slideAt(day);
}

/** The chance tonight that a CRISIS region pushes a CRISIS neighbour to WAR (0 before `warFromCrisisDay`). */
export function warFromCrisisAt(day: number): number {
  const span = RULES.days - RULES.warFromCrisisDay;
  if (day < RULES.warFromCrisisDay || span <= 0) return 0;
  return RULES.warFromCrisisEnd * Math.min(1, (day - RULES.warFromCrisisDay) / span);
}

/** The chance tonight that a crisis which has stood `crisisTipAfter` nights goes to WAR on its own (0 before `warFromCrisisDay`). */
export function crisisTipAt(day: number): number {
  const span = RULES.days - RULES.warFromCrisisDay;
  if (day < RULES.warFromCrisisDay || span <= 0) return 0;
  return RULES.crisisTipStart + (RULES.crisisTipEnd - RULES.crisisTipStart) * Math.min(1, (day - RULES.warFromCrisisDay) / span);
}

/** DANGER read off a map, without any penalty. */
export function mapDanger(heats: Readonly<Record<string, Heat>>): number {
  let d = 0;
  for (const h of Object.values(heats)) d += RULES.dangerPer[h];
  return Math.min(RULES.dangerCap, d);
}

/** DANGER as the gauge shows it: the map plus the policies' additions, capped. */
export function dangerOf(heats: Readonly<Record<string, Heat>>, penalty: number): number {
  return Math.min(RULES.dangerCap, mapDanger(heats) + penalty);
}

/** The week a day falls in: days 1–5 are week 1. */
export function weekOf(day: number): number {
  return Math.floor((day - 1) / RULES.weekDays) + 1;
}

export function isOfferDay(day: number): boolean {
  return (RULES.offerDays as readonly number[]).includes(day);
}
