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
  /** Spec: a STAND-DOWN needs DANGER 0 at the end of a day from this day on. */
  standDownFromDay: 5,
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
   * value (linear). The spec's one in three is the CRISIS odds at the start.
   */
  crisisPressureStart: 1 / 3,
  crisisPressureEnd: 1 / 3,
  /** Tunable: the chance a TENSE region boils over on its own at night, at the start and the end (0 = off). */
  tensePressureStart: 0,
  tensePressureEnd: 0.07,
  /** Tunable: flares. The expected number of CALM regions that turn TENSE each night, at the start and the end (0 = off). */
  flareStart: 0.3,
  flareEnd: 4,
  /** Tunable: the shape of the flare ramp: 1 is linear, 2 keeps the middle of the month quieter and the end as hot. */
  flareCurve: 1.25,
  /** Tunable (piece reach): how many steps the Hotline calms a crisis card by on arrival (2: the crisis ends). */
  hotlineCool: 2,
  /** Tunable (piece reach): how many steps the Loyal Admiral cools each neighbouring sea region by (2: as much as the force itself). */
  admiralCool: 2,
  /** Spec: each WAR region heats one CALM or TENSE neighbour every night. */
  warSpreads: 1,
  /** Ruling: a CRISIS region's pressure may push a CRISIS neighbour to WAR (true) or only reach CALM/TENSE ones (false). */
  crisisPressureReachesCrisis: false,
  /** Tunable: the chance of a map card on a day when one fits (spec: about one in five). */
  mapDayChance: 1 / 5,
  /** Spec: a CRISIS or WAR region gets a card within this many days. */
  hotCardWithin: 2,
  /** Draw weight of a card by its region's heat (CALM, TENSE, CRISIS, WAR). Tunable. */
  drawWeight: [1, 2, 4, 6] as const,
  /** Spec pieces. */
  oldAmbassadorExtra: 1,
  backChannelReach: 1,
  peaceMovementReach: 2,
  hawkExtra: 2,
  /** Spec: the Hotline works once a week; a week is five days. */
  weekDays: 5,
  /** Spec: Red Lines, if the region reaches war, DANGER +15; Launch on Warning, a false alarm there is +20. */
  redLinePenalty: 15,
  falseAlarmPenalty: 20,
  /** Spec: the Paranoid Intel Director's warnings are false one in four. */
  paranoidFalse: 1 / 4,
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
