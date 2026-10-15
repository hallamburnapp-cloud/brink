/**
 * The ending's title and two lines of story, in plain English (pure, for tests). The lines agree
 * with the final map: a WAR ending names a region that is red on it, or says the world went to war
 * under too many crises when none is; a HELD ending is graded by the final reading.
 */
import { REGION } from '../map';
import type { DayTrace, Ending, GameState, RegionId } from '../app/engine';

const name = (id: RegionId) => REGION[id]?.name ?? id;

/** The last region to reach WAR in the log, among those still red. */
function lastToWar(log: readonly DayTrace[], atWar: readonly RegionId[]): RegionId | null {
  let last: RegionId | null = null;
  for (const t of log) for (const st of t.steps) if (st.kind === 'heat' && st.to === 3 && atWar.includes(st.region)) last = st.region;
  return last;
}

/** How near the end a HELD ending was: barely from this reading up. */
export const BARELY_FROM = 70;

/** HELD, graded by the final reading: the spec's clean hold (the engine's `clean`, under 20), a hold, or barely. */
export function heldGrade(e: { danger: number; clean: boolean }): 'clean' | 'held' | 'barely' {
  return e.clean ? 'clean' : e.danger < BARELY_FROM ? 'held' : 'barely';
}

export function endingLines(e: Ending, final: Pick<GameState, 'heats' | 'log'> | null = null): { title: string; lines: [string, string] } {
  switch (e.kind) {
    case 'WAR': {
      const held = e.day - 1;
      const second = held > 0 ? `You held it together for ${held} ${held === 1 ? 'day' : 'days'}.` : 'It was over before it began.';
      const atWar = final ? Object.keys(final.heats).filter((id) => final.heats[id] === 3) : [];
      let first: string;
      if (!final || atWar.includes(e.region)) first = `The fighting began in ${name(e.region)} on day ${e.day}, and the world followed.`;
      else if (atWar.length) first = `The war in ${name(lastToWar(final.log, atWar) ?? atWar[0])} could not be contained. On day ${e.day} the world followed.`;
      else first = `Too many crises at once. On day ${e.day} the world went to war.`;
      return { title: 'War.', lines: [first, second] };
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
