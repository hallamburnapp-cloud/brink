/**
 * The ending's title and two lines of story, in plain English (pure, for tests). The lines agree
 * with the final map and with what the watcher saw: a WAR ending names where the fighting began
 * (the first region to go red that is still red) and the region that was the last straw, says so
 * when the engine's own push on the final night decided it (too many crises at once), or says the
 * world went to war under too many crises when no region is red; a HELD ending is graded by the
 * final reading.
 */
import { REGION } from '../map';
import type { DayTrace, Ending, GameState, RegionId } from '../app/engine';

const name = (id: RegionId) => REGION[id]?.name ?? id;

/** The first region in the log to reach WAR by anything but the ending's own push, among those still red, and the day. */
function firstToWar(log: readonly DayTrace[], atWar: readonly RegionId[]): { region: RegionId; day: number } | null {
  for (const t of log) for (const st of t.steps) if (st.kind === 'heat' && st.to === 3 && st.why !== 'war' && atWar.includes(st.region)) return { region: st.region, day: t.day };
  return null;
}

/** The last region to reach WAR in the log, among those still red. */
function lastToWar(log: readonly DayTrace[], atWar: readonly RegionId[]): RegionId | null {
  let last: RegionId | null = null;
  for (const t of log) for (const st of t.steps) if (st.kind === 'heat' && st.to === 3 && atWar.includes(st.region)) last = st.region;
  return last;
}

/** True when the final night ended with the engine pushing a crisis red to fill the gauge (the 'war' step). */
function pushedRed(log: readonly DayTrace[]): boolean {
  const last = log[log.length - 1];
  return !!last && last.steps.some((st) => st.kind === 'heat' && st.why === 'war');
}

/** How near the end a HELD ending was: barely from this reading up. */
export const BARELY_FROM = 70;

/** HELD, graded by the final reading: the spec's clean hold (the engine's `clean`, under 20), a hold, or barely. */
export function heldGrade(e: { danger: number; clean: boolean }): 'clean' | 'held' | 'barely' {
  return e.clean ? 'clean' : e.danger < BARELY_FROM ? 'held' : 'barely';
}

/** The WAR ending's first line: where it began, what was the last straw, and whether too many crises decided it. */
export function warLine(e: { day: number; region: RegionId }, final: Pick<GameState, 'heats' | 'log'> | null): string {
  if (!final) return `The fighting began in ${name(e.region)} on day ${e.day}, and the world followed.`;
  const atWar = Object.keys(final.heats).filter((id) => final.heats[id] === 3);
  if (!atWar.length) return `Too many crises at once. On day ${e.day} the world went to war.`;
  const last = atWar.includes(e.region) ? e.region : (lastToWar(final.log, atWar) ?? atWar[0]);
  const first = firstToWar(final.log, atWar);
  const pushed = pushedRed(final.log);
  if (first && first.region !== last && first.day < e.day) {
    return pushed
      ? `The fighting began in ${name(first.region)} on day ${first.day}. On day ${e.day}, with too many crises at once, ${name(last)} fell and the world followed.`
      : `The fighting began in ${name(first.region)} on day ${first.day}. On day ${e.day} ${name(last)} fell, and the world followed.`;
  }
  if (pushed) return `Too many crises at once. On day ${e.day} the fighting began in ${name(last)}, and the world followed.`;
  return `The fighting began in ${name(last)} on day ${e.day}, and the world followed.`;
}

export function endingLines(e: Ending, final: Pick<GameState, 'heats' | 'log'> | null = null): { title: string; lines: [string, string] } {
  switch (e.kind) {
    case 'WAR': {
      const held = e.day - 1;
      const second = held > 0 ? `You held it together for ${held} ${held === 1 ? 'day' : 'days'}.` : 'It was over before it began.';
      return { title: 'War.', lines: [warLine(e, final), second] };
    }
    case 'STAND-DOWN':
      return {
        title: 'The world stands down.',
        lines: [`Every region is calm. The crisis is over on day ${e.day}.`, `Thirty days were asked of you. You needed ${e.day}.`],
      };
    case 'HELD': {
      const grade = heldGrade(e);
      const first = `Thirty days are up and the world is still standing. Danger ended at ${e.danger}.`;
      if (grade === 'clean') return { title: 'You held, cleanly.', lines: [first, 'Under 20 at the end: they will write about this one.'] };
      if (grade === 'held') return { title: 'You held.', lines: [first, 'It was close. The map remembers where.'] };
      return { title: 'You held, barely.', lines: [first, 'Another week and it would have gone. The map shows how near.'] };
    }
  }
}
