/**
 * The Federation's week (SPEC-SMALL "The other side"): where its forces head next (by appetite, with a
 * feint), which promises it tests (the ones it does not believe), whether it takes a way out, and
 * what crosses its lines. Nothing here writes to the state; the resolve applies the decisions and
 * writes the hidden lines.
 */
import type { Rng } from '../../engine/rng.ts';
import type { LineDef, WhyKind } from './content.ts';
import { holdInfo, isAnswered, pieceAt, pieceOf, promiseAt } from './board.ts';
import { RULES, pushesAt } from './rules.ts';
import type { GameState, Heading, PieceKind, RegionId, WayOutOffer } from './types.ts';
import { CAP_REGIONS, NEAR_CAP, NEIGHBOURS, REGION_IDS, distance, isCap, isHome, mapOrder } from './world.ts';

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
  return w;
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
 * Next week's headings: two places. The real pushes number RULES.pushesByStep[step]; when that is one,
 * the second arrow is a feint; when it is two, one week in three (RULES.feintChance) the second is a
 * feint instead. At most one promised place is targeted a week (one test at a time), and none while a
 * test is pending. `force` makes the first real target that place (the opening's collision).
 */
export function planHeadings(s: GameState, rng: Rng, force: RegionId | null = null): Plan {
  const pool = candidates(s);
  const believedLeft = pool.filter((c) => promiseAt(s, c.region) && holdInfo(s, c.region).ok && s.fed.belief >= RULES.beliefTest).map((c) => c.region);
  const notTested = believedLeft.length ? mapOrder(believedLeft)[0] : null;
  if (!pool.length) return { headings: [], notTested };
  let pushes = pushesAt(s.fed.step);
  if (pushes < 2 && rng.next() < (s.fed.appetite - RULES.appetitePushOver) * RULES.appetitePushScale) pushes = 2;
  let feint = pushes <= 1;
  if (pushes >= 2 && rng.next() < RULES.feintChance) {
    pushes = 1;
    feint = true;
  }
  // Each real push is a new front (an unguarded calm place) with chance = appetite; otherwise they
  // test a promise (by how little they believe it) or keep the pressure on a place already pressed.
  // With nothing to test or press, a new front anyway.
  const promised = (r: RegionId) => !!promiseAt(s, r);
  const isNew = (c: Candidate) => !promised(c.region) && s.regions[c.region].state === 'calm';
  const isOld = (c: Candidate) => !promised(c.region) && s.regions[c.region].state === 'pressed';
  const base = pool.map((c) => (s.pendingTest && promised(c.region) ? 0 : c.weight));
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
  while (real.length < pushes) {
    const newFront = rng.next() < s.fed.appetite;
    const pick = (keep: (c: Candidate, i: number) => boolean) => rng.weightedIndex(pool.map((c, i) => (base[i] > 0 && keep(c, i) ? base[i] : 0)));
    let i = -1;
    if (newFront) i = pick(isNew);
    if (i < 0 && !testTaken) i = pick((c) => promised(c.region));
    if (i < 0) i = pick(isOld);
    if (i < 0) i = pick(() => true);
    if (i < 0) break;
    take(i);
  }
  const headings: Heading[] = real.map((to) => ({ from: headingFrom(s, to), to, real: true }));
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
    if (pick) headings.push({ from: headingFrom(s, pick), to: pick, real: false });
  }
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

export interface WayOutAnswer {
  accept: boolean;
  why: WhyKind;
  chance: number;
}

/**
 * Whether they take the way out (ruling). Never while they gained a place this week. Otherwise a
 * chance by term: dropping a promise they minded (one they were heading for, testing, or that could
 * not be held) is likely taken; pulling back a piece on their doorstep is taken as often as they are
 * jumpy; a summit is taken more the higher the ladder and the fuller the bar. A hungry Federation
 * refuses more.
 */
export function acceptWayOut(s: GameState, offer: WayOutOffer, gained: number, rng: Rng): WayOutAnswer {
  const R = RULES.wayOut;
  if (s.week < R.fromWeek) return { accept: false, why: 'noNeed', chance: 0 };
  if (gained >= R.gainedRefuse) return { accept: false, why: 'gaining', chance: 0 };
  let p: number;
  let yes: WhyKind;
  let no: WhyKind;
  if (offer.term === 'drop-promise') {
    const region = offer.detail as RegionId;
    // A promise drawn this week and offered up the same week is seen through: they minded a standing promise.
    const standing = (promiseAt(s, region)?.since ?? s.week) < s.week;
    const minded = standing && (s.fed.headings.some((h) => h.to === region) || s.pendingTest === region || !holdInfo(s, region).ok);
    p = minded ? R.dropGrievance : R.dropIndifferent;
    yes = 'grievance';
    no = 'indifferent';
  } else if (offer.term === 'pull-back') {
    const piece = pieceOf(s, offer.detail as PieceKind);
    const near = !!piece && (NEAR_CAP.includes(piece.at) || Object.keys(s.crossed).length > 0);
    p = near ? R.pullNearBase + R.pullNearJumpy * s.fed.jumpiness : R.pullFar;
    yes = 'threat';
    no = 'noThreat';
  } else {
    p = R.summitByStep[s.fed.step] + (s.fed.will - 50) / R.summitWill;
    if (gained === 0 && blockedLastWeek(s)) p += R.blocked;
    yes = s.fed.step >= 3 ? 'afraid' : 'wantedToStop';
    no = s.fed.step <= 1 ? 'noNeed' : 'notAfraid';
  }
  p -= (s.fed.appetite - 0.5) * R.appetite;
  if (gained > 0) p *= R.gainedScale;
  const chance = Math.min(R.max, Math.max(R.min, p));
  const accept = rng.next() < chance;
  const refusedWhy: WhyKind = gained > 0 ? 'gaining' : s.fed.appetite >= RULES.dialHigh && offer.term === 'summit' ? 'hungry' : no;
  return { accept, why: accept ? yes : refusedWhy, chance };
}
