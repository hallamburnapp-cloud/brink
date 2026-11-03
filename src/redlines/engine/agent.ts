/**
 * The Federation's week (SPEC-SMALL "The other side"): where its forces head next (by appetite, with a
 * feint), which promises it tests (the ones it does not believe), whether it takes a way out, and
 * what crosses its lines. Nothing here writes to the state; the resolve applies the decisions and
 * writes the hidden lines.
 */
import type { Rng } from '../../engine/rng.ts';
import type { LineDef, WhyKind } from './content.ts';
import { believedRing, clockOf, fightingRegions, provocationBelieved, holdInfo, isAnswered, pieceAt, pieceOf, pressedRegions, promiseAt, unansweredRegions } from './board.ts';
import { RULES, isScared, pushesAt } from './rules.ts';
import type { GameState, Heading, PieceKind, RegionId, WayOutOffer } from './types.ts';
import { CAP_REGIONS, NEAR_CAP, NEIGHBOURS, REGION_IDS, blocOf, distance, isCap, isHome, mapOrder } from './world.ts';

/** Where their forces already are: the Cap, and every place pressed or fighting. */
export function footholds(s: GameState): RegionId[] {
  return [...CAP_REGIONS, ...REGION_IDS.filter((r) => !isCap(r) && s.regions[r].state !== 'calm')];
}

export interface Candidate {
  region: RegionId;
  /** Steps from the nearest foothold (a pressed place counts as 1). */
  dist: number;
  weight: number;
}

/** The places their forces can reach next week, weighted by how much they want each. */
export function candidates(s: GameState): Candidate[] {
  const holds = footholds(s);
  const out: Candidate[] = [];
  for (const r of REGION_IDS) {
    if (isCap(r) || s.regions[r].state === 'fighting') continue;
    if (s.pendingTest === r) continue;
    const away = s.turnedAway[r];
    if (away !== undefined && s.week - away < RULES.turnAwayWeeks) continue;
    const dist = Math.max(1, Math.min(...holds.map((f) => distance(f, r))));
    if (dist > RULES.reach) continue;
    const weight = weightOf(s, r, dist);
    if (weight > 0) out.push({ region: r, dist, weight });
  }
  return out;
}

/** How much they want to push this place next week. */
export function weightOf(s: GameState, r: RegionId, dist: number): number {
  const W = RULES.weight;
  const pm = promiseAt(s, r);
  let w: number;
  if (pm) {
    const solid = holdInfo(s, r).ok;
    w = !solid ? W.dashed : s.fed.belief < RULES.beliefTest ? W.doubted : RULES.believedTestByStep[s.fed.step];
  } else if (pieceAt(s, r)) w = W.piece;
  else w = W.unguarded + W.appetite * s.fed.appetite;
  if (s.regions[r].state === 'pressed' && !pm) w = W.pressed;
  if (isHome(r)) w *= W.home;
  if (dist >= 2) w *= W.far;
  // SPEC-SMALL ruling: the first fronts touch the Scatter and Highmarch before the Sound.
  if (s.week <= RULES.earlyFronts.untilWeek && blocOf(r) === 'SND') w *= RULES.earlyFronts.soundScale;
  return w;
}

/**
 * A pressed, unanswered place whose clock will have run down by the next resolve falls whether or not they
 * push it again: a push there is wasted (SPEC-SMALL ruling: "a push on a place whose clock has run down takes
 * it or opens a new front next door"), so the planner never spends an arrow on it.
 */
export function clockRunDown(s: GameState, r: RegionId): boolean {
  const rec = s.regions[r];
  return rec.state === 'pressed' && !isAnswered(s, r) && rec.pressedWeeks + 1 >= clockOf(s, r);
}

/** Why they chose this place, for the debrief. */
export function targetWhy(s: GameState, r: RegionId): WhyKind {
  const pm = promiseAt(s, r);
  if (pm) return !holdInfo(s, r).ok ? 'dashed' : s.fed.belief < RULES.beliefTest ? 'doubted' : 'curious';
  if (pieceAt(s, r)) return 'piece';
  if (s.regions[r].state === 'pressed') return 'finish';
  return 'unguarded';
}

/** Where the arrow starts: a Cap neighbour, else a fighting or pressed neighbour, else the nearest Cap region. */
export function headingFrom(s: GameState, to: RegionId): RegionId {
  const near = NEIGHBOURS[to];
  const cap = near.find(isCap);
  if (cap) return cap;
  const fighting = near.find((n) => s.regions[n]?.state === 'fighting');
  if (fighting) return fighting;
  const pressed = near.find((n) => s.regions[n]?.state === 'pressed');
  if (pressed) return pressed;
  let best = CAP_REGIONS[0];
  for (const c of CAP_REGIONS) if (distance(c, to) < distance(best, to)) best = c;
  return best;
}

export interface Plan {
  headings: Heading[];
  /** A believed, solid promise they left alone this week, if any (the debrief says so). */
  notTested: RegionId | null;
}

/**
 * The headings for week `forWeek`: two places. The real pushes number RULES.pushesByStep[step]; when that is
 * one, the second arrow is a feint; when it is two, one week in three (RULES.feintChance) the second is a
 * feint instead; from RULES.bothRealFromWeek both arrows are real. At most one promised place is targeted a
 * week (one test at a time), and none while a test is pending; a ring in their reach they do not believe draws
 * the first push RULES.weight.dashedFirst of the time ("dashed outlines get tested"). `force` makes the first real
 * target that place (the opening's collision).
 */
export function planHeadings(s: GameState, rng: Rng, force: RegionId | null = null, forWeek: number = s.week, slow = false): Plan {
  const pool = candidates(s);
  if (!pool.length) return { headings: [], notTested: null };
  let pushes = pushesAt(s.fed.step);
  let feint: boolean;
  // The pushes their timetable adds from RULES.bothRealFromWeek (the debrief blames the timetable for these, not appetite).
  let timetable = 0;
  if (forWeek >= RULES.bothRealFromWeek) {
    timetable = Math.max(0, 2 - pushes);
    pushes = Math.max(2, pushes);
    feint = false;
    // SPEC-SMALL "The feint keeps its mystery": feints continue after the timetable's week, rarer.
    if (rng.next() < RULES.lateFeintChance) {
      pushes -= 1;
      timetable = Math.max(0, timetable - 1);
      feint = true;
    }
  } else {
    if (pushes < 2 && rng.next() < (s.fed.appetite - RULES.appetitePushOver) * RULES.appetitePushScale) pushes = 2;
    feint = pushes <= 1;
    if (pushes >= 2 && rng.next() < RULES.feintChance) {
      pushes = 1;
      feint = true;
    }
  }
  // SPEC-SMALL "Backing down is never the best answer": a piece next to their door slows a scared Federation. One push
  // is held back, and its arrow stops short (the sheet shows it).
  if (slow && pushes > 0) {
    pushes -= 1;
    timetable = Math.max(0, timetable - 1);
    feint = true;
  }
  // Each real push is a new front (an unguarded calm place) with chance = appetite; otherwise they
  // test a promise or keep the pressure on a place already pressed, the two weighed together by how
  // much they want each (a dashed ring 1.4, a doubted one 0.9, a believed solid one 0.3 rising up the
  // ladder, pressure 0.6: "solid ones mostly do not" get tested). With neither, a new front anyway.
  const promised = (r: RegionId) => !!promiseAt(s, r);
  const isNew = (c: Candidate) => !promised(c.region) && s.regions[c.region].state === 'calm';
  const isOld = (c: Candidate) => !promised(c.region) && s.regions[c.region].state === 'pressed' && !clockRunDown(s, c.region);
  const base = pool.map((c) => (s.pendingTest && promised(c.region) ? 0 : clockRunDown(s, c.region) ? 0 : c.weight));
  const real: RegionId[] = [];
  let testTaken = !!s.pendingTest;
  const take = (i: number) => {
    const r = pool[i].region;
    real.push(r);
    base[i] = 0;
    if (promised(r)) testTaken = true;
  };
  if (force) {
    const i = pool.findIndex((c) => c.region === force);
    if (i >= 0) take(i);
  }
  // SPEC-SMALL "No formula wins": a ring drawn on a place already under siege is a provocation; they test it unless they believe it.
  if (!testTaken && real.length < pushes) {
    const provoked = pool.map((c, i) => (RULES.provocationRings && promiseAt(s, c.region)?.provocation && !provocationBelieved(s, c.region) && !(s.pendingTest && promised(c.region)) ? Math.max(base[i], 1) : 0));
    if (provoked.some((w) => w > 0)) {
      const i = rng.weightedIndex(provoked);
      if (i >= 0) take(i);
    }
  }
  // SPEC-SMALL: "It tests promises it does not believe ... dashed outlines get tested". A ring in their reach they do
  // not believe (dashed, or solid while belief is under RULES.beliefTest) draws the first push this often, before
  // anything else is weighed (so even a collapse, which otherwise opens new fronts, still tests a ring it doubts).
  if (!testTaken && real.length < pushes) {
    const doubted = pool.map((c, i) => (base[i] > 0 && promised(c.region) && (!holdInfo(s, c.region).ok || s.fed.belief < RULES.beliefTest) ? base[i] : 0));
    if (doubted.some((w) => w > 0) && rng.next() < RULES.weight.dashedFirst) {
      const i = rng.weightedIndex(doubted);
      if (i >= 0) take(i);
    }
  }
  // With RULES.newFrontsFromFighting places fighting, every push opens a new front (a collapse runs on instead of stalling).
  const collapsing = fightingRegions(s).length >= RULES.newFrontsFromFighting;
  while (real.length < pushes) {
    const newFront = collapsing || rng.next() < s.fed.appetite;
    const pick = (keep: (c: Candidate, i: number) => boolean) => rng.weightedIndex(pool.map((c, i) => (base[i] > 0 && keep(c, i) ? base[i] : 0)));
    let i = -1;
    if (newFront) i = pick(isNew);
    if (i < 0) i = pick((c) => (promised(c.region) && !testTaken) || isOld(c));
    if (i < 0) i = pick(isNew);
    if (i < 0) i = pick(() => true);
    if (i < 0) break;
    take(i);
  }
  // SPEC-SMALL "The debrief reads motives when they were formed": each heading carries its reason as it is planned.
  const motive = (to: RegionId): Pick<Heading, 'why' | 'whyPiece'> => {
    const why = targetWhy(s, to);
    const piece = why === 'piece' ? pieceAt(s, to)?.kind : undefined;
    return piece ? { why, whyPiece: piece } : { why };
  };
  const headings: Heading[] = real.map((to, i) => ({ from: headingFrom(s, to), to, real: true, ...motive(to), ...(i >= real.length - timetable ? { timetable: true } : {}) }));
  if (feint) {
    const left = pool.filter((c) => !real.includes(c.region));
    const promised = left.filter((c) => promiseAt(s, c.region) && !s.pendingTest);
    const anyPromisedReal = real.some((r) => promiseAt(s, r));
    let pick: RegionId | null = null;
    if (promised.length && !anyPromisedReal && rng.next() < RULES.feintAtPromise) pick = rng.pick(promised).region;
    else if (left.length) {
      const unpromised = left.filter((c) => !promiseAt(s, c.region));
      const from = unpromised.length ? unpromised : left;
      const i = rng.weightedIndex(from.map((c) => c.weight));
      pick = from[i < 0 ? 0 : i].region;
    }
    if (pick) headings.push({ from: headingFrom(s, pick), to: pick, real: false, ...motive(pick) });
  }
  // A believed, solid ring in their reach that the plan does not point at (SPEC-SMALL: said only of rings they did not target).
  const targeted = new Set(headings.map((h) => h.to));
  // A provocation ring they do not yet believe (RULES.provocationBelief) was left alone for want of an arrow, not for belief.
  const believedLeft = pool
    .filter((c) => !targeted.has(c.region) && promiseAt(s, c.region) && holdInfo(s, c.region).ok && s.fed.belief >= RULES.beliefTest && (!promiseAt(s, c.region)?.provocation || provocationBelieved(s, c.region)))
    .map((c) => c.region);
  const notTested = believedLeft.length ? mapOrder(believedLeft)[0] : null;
  return { headings, notTested };
}

/** The region where a declared line is crossed right now, or null. */
export function crossesLine(s: GameState, def: LineDef): RegionId | null {
  const inside = (r: RegionId | undefined) => (r && def.regions.includes(r) ? r : null);
  switch (def.kind) {
    case 'proximity':
      return s.pieces.map((p) => inside(p.at)).find((r) => r) ?? null;
    case 'sea':
      return inside(pieceOf(s, 'fleet')?.at);
    case 'missiles':
      return inside(pieceOf(s, 'brigade')?.at);
    case 'alliance':
      return s.promises.map((p) => inside(p.region)).find((r) => r) ?? null;
  }
}

/** What of yours crosses a line of this kind at this place. */
export function crossingThing(s: GameState, def: LineDef, at: RegionId): PieceKind | 'promise' {
  if (def.kind === 'alliance') return 'promise';
  if (def.kind === 'sea') return 'fleet';
  if (def.kind === 'missiles') return 'brigade';
  return pieceAt(s, at)?.kind ?? 'fleet';
}

/** They have been stopped: from week 3, the last finished week took no place (the WAR count did not rise). */
export function blockedLastWeek(s: GameState): boolean {
  if (s.week < RULES.blockedFromWeek) return false;
  const last = s.log[s.log.length - 2];
  const prev = s.log[s.log.length - 3];
  if (!last) return false;
  const before = prev ? prev.danger.war : 0;
  return last.danger.war <= before;
}

/**
 * SPEC-SMALL ruling ("A far promise cannot be sold"): a dropped promise moves them only when the place is within
 * their reach (one they could push next week), one their arrows point at, the one under test, or one a real
 * declared line of theirs covers (they said in public that a promise there was a grievance). A dashed ring on
 * the far side of the map is nothing to them, and the tape says so.
 */
export function promiseMinded(s: GameState, region: RegionId, lines: readonly LineDef[] = []): boolean {
  if (s.pendingTest === region) return true;
  if (s.fed.headings.some((h) => h.to === region)) return true;
  if (s.fed.lines.some((l) => l.real && lines.some((d) => d.id === l.id && d.kind === 'alliance' && d.regions.includes(region)))) return true;
  return candidates(s).some((c) => c.region === region);
}

/**
 * Why they offered or took a summit, as it was: both sides afraid from MASSING; else stopping while ahead only when
 * they held a place they had taken; else they had gained nothing (never "while they were ahead" over nothing), and saw
 * nothing cheap left only when nothing was hatched.
 */
export function summitWhy(s: GameState): WhyKind {
  if (s.fed.step >= 3) return 'afraid';
  if (fightingRegions(s).length > 0) return 'wantedToStop';
  // "Saw nothing cheap left to take" only over a map with nothing hatched (the niche recheck: said with three places hatched).
  return pressedRegions(s).length ? 'noGainYet' : 'noGain';
}

/** A way out (yours or their summit) was accepted last week: they will not take another yet (at most one in any two weeks). */
export function wayOutTooSoon(s: GameState): boolean {
  return s.wayOutWeek !== undefined && s.wayOutWeek !== null && s.week - s.wayOutWeek < RULES.wayOut.spacing;
}

/** Whether a line already crossed is drawn around this place (its regions from the state, else the pack). */
export function crossedLineAt(s: GameState, region: RegionId, lines: readonly LineDef[] = []): boolean {
  return s.fed.lines.some((l) => s.crossed[l.id] !== undefined && (l.regions ?? lines.find((d) => d.id === l.id)?.regions ?? []).includes(region));
}

export interface WayOutAnswer {
  accept: boolean;
  why: WhyKind;
  chance: number;
  /** A standing promise refused as "a small thing" (not one drawn this week): the form dims it from then on. */
  small?: boolean;
}

/**
 * Whether they take the way out (ruling). Never in a week they gained two places (one halves the chance). Otherwise a
 * chance by term: dropping a promise they minded (one they were heading for, testing, or that could
 * not be held) is likely taken; pulling back a piece on their doorstep is taken as often as they are
 * jumpy; a summit is taken more the higher the ladder and the fuller the bar. A hungry Federation
 * refuses more.
 */
export function acceptWayOut(s: GameState, offer: WayOutOffer, gained: number, rng: Rng, lines: readonly LineDef[] = []): WayOutAnswer {
  const R = RULES.wayOut;
  if (s.week < R.fromWeek) return { accept: false, why: 'noNeed', chance: 0 };
  if (gained >= R.gainedRefuse) return { accept: false, why: 'gaining', chance: 0 };
  // SPEC-SMALL "No formula wins": at most one way out accepted in any two weeks (they must sell it at home).
  if (wayOutTooSoon(s)) return { accept: false, why: 'tooSoon', chance: 0 };
  let p: number;
  let yes: WhyKind;
  let no: WhyKind;
  if (offer.term === 'drop-promise') {
    const region = offer.detail as RegionId;
    // A promise drawn this week and offered up the same week is seen through: they minded a standing promise.
    const standing = (promiseAt(s, region)?.since ?? s.week) < s.week;
    // SPEC-SMALL "A far promise cannot be sold": a dropped promise moves them only when they minded it; otherwise the
    // offer is indifferent to them (refused, and the tape says so). It is never "the thing in their way".
    if (!(standing && promiseMinded(s, region, lines))) return { accept: false, why: 'indifferent', chance: 0, ...(standing ? { small: true } : {}) };
    p = R.dropGrievance;
    yes = 'grievance';
    no = 'indifferent';
  } else if (offer.term === 'pull-back') {
    const piece = pieceOf(s, offer.detail as PieceKind);
    // "Near" is read from the piece itself: on their doorstep, or standing where a line it crossed is drawn.
    const near = !!piece && (NEAR_CAP.includes(piece.at) || crossedLineAt(s, piece.at, lines));
    // SPEC-SMALL "Reading their nerve pays": a pull-back from a scared Federation's door is accepted almost always.
    if (piece && NEAR_CAP.includes(piece.at) && isScared(s.fed.jumpiness)) {
      const chance = R.pullScaredDoor;
      const accept = rng.next() < chance;
      return { accept, why: accept ? 'threat' : 'notAfraid', chance };
    }
    p = near ? R.pullNearBase + R.pullNearJumpy * s.fed.jumpiness : R.pullFar;
    yes = 'threat';
    no = 'noThreat';
  } else {
    p = R.summitByStep[s.fed.step] + (s.fed.will - 50) / R.summitWill;
    // "They have been stopped" pulls only when nothing is hatched (SPEC-SMALL "They do not talk while they are winning").
    const hatched = R.blockedUnlessHatched === 'any' ? pressedRegions(s).length > 0 : R.blockedUnlessHatched === 'standing' ? unansweredRegions(s).length > 0 : false;
    if (gained === 0 && blockedLastWeek(s) && !hatched) p += R.blocked;
    yes = summitWhy(s);
    no = s.fed.step <= 1 ? 'noNeed' : 'notAfraid';
  }
  p -= (s.fed.appetite - 0.5) * R.appetite;
  if (gained > 0) p *= R.gainedScale;
  // A way out is accepted less while places they press stand unanswered: they do not talk while they are winning.
  const open = unansweredRegions(s, RULES.wayOutReachOnly && RULES.standingReach).length;
  p *= Math.pow(R.unansweredScale, open);
  const chance = Math.min(R.max, Math.max(R.min, p));
  const accept = rng.next() < chance;
  const refusedWhy: WhyKind = gained > 0 || open > 0 ? 'gaining' : s.fed.appetite >= RULES.dialHigh && offer.term === 'summit' ? 'hungry' : no;
  return { accept, why: accept ? yes : refusedWhy, chance };
}
