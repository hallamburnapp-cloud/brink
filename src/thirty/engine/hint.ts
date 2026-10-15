/**
 * The hint line under a button, in words (SPEC "The card"; CONTENT.md "Hints"). The authored hint is
 * the plain case; when pieces change the outcome, or the map makes the printed line untrue (the
 * region is already calm, a show of force must pick its own neighbour), or the option is a place on
 * a map day (every glowing label is written the same way so they compare), the engine writes the
 * line: what DANGER does, then what happens in the world, joined by ' · ', at most 60 characters.
 *
 * The forms a non-gamer meets, and only these:
 *   Danger down · Shoal calms                       Danger down here · Shoal calms, heats Pebbleby
 *   Danger up · heats Lintel                        Danger unchanged · Vessary guarded for a week
 *   Danger down if it works (65%) · if not, Shoal heats
 * and after a risky tap, on the same line: `It worked · Danger down, Shoal calms` / `It failed · Danger
 * up, Shoal heats`.
 */
import { MAX_HINT_CHARS } from '../content/schema.ts';
import type { ChoiceTag, Heat, Mark, RegionId } from '../content/types.ts';
import { CRISIS, WAR } from './rules.ts';
import type { HeatChange } from './types.ts';
import { regionName } from './world.ts';

export interface HintInput {
  tag: ChoiceTag;
  authored: string;
  acted: RegionId;
  /** The acted region's heat before the choice. */
  heatBefore: Heat;
  /** The card named the neighbour a show of force heats (so the authored line can name it). */
  namedNeighbour: boolean;
  /** RISKY: the odds as printed. */
  printedOdds: number | null;
  /** RISKY: the odds after pieces (100 certain, 0 known to fail). */
  odds: number | null;
  /** Why a RISKY option is certain or doomed. */
  certainBy: 'dove-foreign' | 'false-alarm' | 'real-alarm' | null;
  dangerBefore: number;
  dangerAfter: number;
  changes: HeatChange[];
  pieces: string[];
  penalty: number;
  /** The mark the option puts on the acted region (guarded, warned, the red line), if any. */
  mark?: Mark | null;
  /** RISKY: what the miss does (null when the outcome is certain). */
  missed?: { danger: number; changes: HeatChange[] } | null;
  /** A place on a map day: its label is always the engine's. */
  map?: boolean;
}

/** True when the authored line tells the truth today and nothing more needs saying. */
export function isPlain(h: HintInput): boolean {
  if (h.map || h.pieces.length || h.penalty) return false;
  switch (h.tag) {
    case 'HOME':
      return true;
    case 'CALM':
      return h.heatBefore > 0;
    case 'FORCE':
      return h.heatBefore > 0 && h.namedNeighbour;
    case 'RISKY':
      // The authored line promises "Danger down if it works (N%)": true at the printed odds when it does lower DANGER.
      return h.heatBefore > 0 && h.odds === h.printedOdds && h.dangerAfter < h.dangerBefore;
  }
}

export function hintLine(h: HintInput): string {
  if (isPlain(h)) return h.authored;
  return fit(composeHint(h));
}

/** The engine's own line, before fitting it to one line. */
export function composeHint(h: HintInput): string {
  const delta = h.dangerAfter - h.dangerBefore;
  const heated = h.changes.some((c) => c.to > c.from);
  const risky = h.tag === 'RISKY' && h.odds !== null && h.odds > 0 && h.odds < 100;

  let danger = delta < 0 ? (heated ? 'Danger down here' : 'Danger down') : delta > 0 ? 'Danger up' : 'Danger unchanged';
  if (risky) danger = delta > 0 ? `Danger up even if it works (${h.odds}%)` : `${danger} if it works (${h.odds}%)`;

  const parts: string[] = [];
  if (h.certainBy === 'dove-foreign') parts.push('talks cannot fail');
  else if (h.certainBy === 'false-alarm') parts.push('a false alarm');
  else if (h.certainBy === 'real-alarm') parts.push('the alarm is real');

  const world = worldClauses(h.changes, h.acted);
  // A risky button says what the miss does; when it does nothing (the region is already at war) it says so.
  const miss = risky && h.missed ? worldClauses(h.missed.changes, h.acted, true) : [];
  if (risky && h.missed && !miss.length) miss.push('nothing changes');
  // "Danger down" already says the acted region calms: when the miss has words, only a wave or a side effect needs more.
  const own = new RegExp(`^${regionName(h.acted)} (calms|cools)$`);
  parts.push(...(miss.length ? world.filter((w) => !own.test(w)) : world));
  if (miss.length) parts.push(`if not, ${miss.join(' and ')}`);
  if (h.penalty) parts.push(`DANGER +${h.penalty}`);
  if (h.mark) parts.push(markClause(h.mark, h.acted));

  if (!parts.length) {
    if (h.tag === 'HOME') parts.push('a quiet day at home');
    else if (h.heatBefore === 0) parts.push(`nothing to calm in ${regionName(h.acted)}`);
    else parts.push('nothing changes abroad');
  }
  return `${danger} · ${parts.join(', ')}`;
}

/**
 * What the world does, as clauses: the regions that cool (the acted region named first) and the
 * regions that heat. `plain` writes each heated region as its own clause ("Shoal heats", "Lintel
 * boils over") for the miss of a risky button.
 */
export function worldClauses(changes: readonly HeatChange[], acted: RegionId | null, plain = false): string[] {
  const out: string[] = [];
  const final = new Map<RegionId, { from: Heat; to: Heat }>();
  for (const c of changes) {
    const f = final.get(c.region);
    final.set(c.region, { from: f ? f.from : c.from, to: c.to });
  }
  const order = (ids: RegionId[]) => (acted && ids.includes(acted) ? [acted, ...ids.filter((r) => r !== acted)] : ids);
  const cooled = order([...final.entries()].filter(([, x]) => x.to < x.from).map(([r]) => r));
  const heatedUp = order([...final.entries()].filter(([, x]) => x.to > x.from).map(([r]) => r));

  if (cooled.length === 1) {
    const r = cooled[0];
    out.push(final.get(r)!.to === 0 ? `${regionName(r)} calms` : `${regionName(r)} cools`);
  } else if (cooled.length > 1) {
    const all = cooled.every((r) => final.get(r)!.to === 0);
    out.push(`${all ? 'calms' : 'cools'} ${regionName(cooled[0])} and ${cooled.length - 1} more`);
  }

  if (plain) {
    for (const r of heatedUp) {
      const x = final.get(r)!;
      out.push(x.to === WAR ? `${regionName(r)} goes to war` : x.to === CRISIS && x.from === 0 ? `${regionName(r)} boils over` : `${regionName(r)} heats`);
    }
  } else if (heatedUp.length === 1) out.push(`heats ${regionName(heatedUp[0])}`);
  else if (heatedUp.length === 2) out.push(`heats ${regionName(heatedUp[0])} and ${regionName(heatedUp[1])}`);
  else if (heatedUp.length > 2) out.push(`heats ${regionName(heatedUp[0])} and ${heatedUp.length - 1} more`);
  return out;
}

/**
 * The line after a risky tap, in the hint's own words, DANGER first: `It worked · Danger down, Shoal
 * calms`, `It failed · Danger up, Shoal heats and Lintel boils over`. `delta` is what the choice did
 * to DANGER (a policy's penalty included).
 */
export function rollText(held: boolean, changes: readonly HeatChange[], acted: RegionId, delta: number): string {
  const head = held ? 'It worked' : 'It failed';
  const danger = delta < 0 ? 'Danger down' : delta > 0 ? 'Danger up' : 'Danger unchanged';
  const world = worldClauses(changes, acted, true).join(' and ');
  return fit(world ? `${head} · ${danger}, ${world}` : `${head} · ${danger}`);
}

/** What a mark does, in words: the player should know the region is guarded, warned or the red line. */
function markClause(mark: Mark, region: RegionId): string {
  switch (mark) {
    case 'guarded':
      return `${regionName(region)} guarded for a week`;
    case 'warned':
      return `${regionName(region)} is warned`;
    case 'red-line':
      return `the red line is ${regionName(region)}`;
  }
}

/**
 * At most 60 characters: drop clauses from the end first (a mark, a penalty), but keep the miss of
 * a risky button ("if not, ...") for as long as any other clause can go; then shorten the miss to its
 * first region; then cut.
 */
export function fit(line: string, max = MAX_HINT_CHARS): string {
  if (line.length <= max) return line;
  const [danger, world = ''] = line.split(' · ');
  const parts: string[] = [];
  for (const p of world.split(', ')) {
    if (p === 'if not') parts.push(p);
    else if (parts[parts.length - 1] === 'if not') parts[parts.length - 1] = `if not, ${p}`;
    else parts.push(p);
  }
  const join = () => `${danger} · ${parts.join(', ')}`;
  while (parts.length > 1) {
    let i = parts.length - 1;
    while (i > 0 && parts[i].startsWith('if not, ')) i--;
    parts.splice(i, 1);
    if (join().length <= max) return join();
  }
  if (parts.length === 1 && parts[0].includes(' and ')) {
    parts[0] = parts[0].slice(0, parts[0].indexOf(' and '));
    if (join().length <= max) return join();
  }
  const out = join();
  return out.length <= max ? out : `${out.slice(0, max - 1)}…`;
}
