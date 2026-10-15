/**
 * The hint line under a button, in words (SPEC "The card"; CONTENT.md "Hints"). The authored hint is
 * the plain case; when pieces change the outcome, or the map makes the printed line untrue (the
 * region is already calm, a show of force must pick its own neighbour), the engine writes the line:
 * what DANGER does, then what happens in the world, joined by ' · ', at most 60 characters.
 */
import { MAX_HINT_CHARS } from '../content/schema.ts';
import type { ChoiceTag, Heat, Mark, RegionId } from '../content/types.ts';
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
}

/** True when the authored line tells the truth today and nothing more needs saying. */
export function isPlain(h: HintInput): boolean {
  if (h.pieces.length || h.penalty) return false;
  switch (h.tag) {
    case 'HOME':
      return true;
    case 'CALM':
      return h.heatBefore > 0;
    case 'FORCE':
      return h.heatBefore > 0 && h.namedNeighbour;
    case 'RISKY':
      return h.heatBefore > 0 && h.odds === h.printedOdds;
  }
}

export function hintLine(h: HintInput): string {
  if (isPlain(h)) return h.authored;
  return fit(composeHint(h));
}

/** The engine's own line, before fitting it to one line. */
export function composeHint(h: HintInput): string {
  const delta = h.dangerAfter - h.dangerBefore;
  const cooled = h.changes.filter((c) => c.to < c.from);
  const heated = h.changes.filter((c) => c.to > c.from);
  const risky = h.tag === 'RISKY' && h.odds !== null && h.odds > 0 && h.odds < 100;

  let danger: string;
  if (risky) danger = `Holds ${h.odds}%`;
  else if (delta < 0) danger = heated.length ? 'Danger down here' : 'Danger down';
  else if (delta > 0) danger = 'Danger up';
  // A mark is a change of its own, so the line does not claim that nothing happens.
  else danger = h.mark ? 'Danger unchanged' : 'Nothing changes';

  const parts: string[] = [];
  if (h.certainBy === 'dove-foreign') parts.push('talks cannot fail');
  else if (h.certainBy === 'false-alarm') parts.push('a false alarm');
  else if (h.certainBy === 'real-alarm') parts.push('the alarm is real');

  const names = (list: HeatChange[]) => new Set(list.map((c) => c.region));
  const cooledRegions = names(cooled);
  const heatedRegions = names(heated);
  if (cooledRegions.size === 1) {
    const r = [...cooledRegions][0];
    const last = cooled[cooled.length - 1];
    parts.push(last.to === 0 ? `${regionName(r)} calms` : `${regionName(r)} cools`);
  } else if (cooledRegions.size > 1) parts.push(`calms ${cooledRegions.size} regions`);
  if (heatedRegions.size === 1) parts.push(`heats ${regionName([...heatedRegions][0])}`);
  else if (heatedRegions.size > 1) parts.push(`heats ${heatedRegions.size} regions`);
  if (h.penalty) parts.push(`DANGER +${h.penalty}`);
  if (h.mark) parts.push(markClause(h.mark, h.acted));

  if (!parts.length) {
    if (h.tag === 'HOME') parts.push('a quiet day at home');
    else if (h.heatBefore === 0) parts.push(`${regionName(h.acted)} is already calm`);
    else parts.push('nothing changes abroad');
  }
  return `${danger} · ${parts.join(', ')}`;
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

/** At most 60 characters: drop the last clauses first, then cut. */
export function fit(line: string, max = MAX_HINT_CHARS): string {
  if (line.length <= max) return line;
  const [danger, world = ''] = line.split(' · ');
  const parts = world.split(', ');
  while (parts.length > 1) {
    parts.pop();
    const out = `${danger} · ${parts.join(', ')}`;
    if (out.length <= max) return out;
  }
  const out = `${danger} · ${parts[0] ?? ''}`;
  return out.length <= max ? out : `${out.slice(0, max - 1)}…`;
}
