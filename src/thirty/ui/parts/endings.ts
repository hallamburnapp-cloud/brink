/** The ending's title and two lines of story, in plain English (pure, for tests). */
import { REGION } from '../map';
import type { Ending } from '../app/engine';

export function endingLines(e: Ending): { title: string; lines: [string, string] } {
  switch (e.kind) {
    case 'WAR': {
      const held = e.day - 1;
      return {
        title: 'War.',
        lines: [
          `The fighting began in ${REGION[e.region]?.name ?? e.region} on day ${e.day}, and the world followed.`,
          held > 0 ? `You held it together for ${held} ${held === 1 ? 'day' : 'days'}.` : 'It was over before it began.',
        ],
      };
    }
    case 'STAND-DOWN':
      return {
        title: 'The world stands down.',
        lines: [`Every region is calm. The crisis is over on day ${e.day}.`, `Thirty days were asked of you. You needed ${e.day}.`],
      };
    case 'HELD':
      return {
        title: e.clean ? 'You held, cleanly.' : 'You held.',
        lines: [
          `Thirty days are up and the world is still standing. Danger ended at ${e.danger}.`,
          e.clean ? 'Under 20 at the end: they will write about this one.' : 'It was close. The map remembers where.',
        ],
      };
  }
}
