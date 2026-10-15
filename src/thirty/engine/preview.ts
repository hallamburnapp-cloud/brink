/**
 * What an option will do, before the player commits: computed by running the same resolution the
 * choice will run, on a copy. For a RISKY option both branches are run. The UI shows `hint`, and
 * may use the numbers; it never computes anything itself.
 */
import type { Card, ThirtyContent } from '../content/types.ts';
import { isAlarmCard, isTalks, optionsOf } from './cards.ts';
import { hintLine, type HintInput } from './hint.ts';
import { actOf, effectiveOdds, resolve, type Act } from './resolve.ts';
import { dangerOf } from './rules.ts';
import type { GameState, Preview, RegionId } from './types.ts';
import { Working } from './working.ts';

/** Today's card, or null when no card is on the table. */
export function todayCard(content: ThirtyContent, state: GameState): Card | null {
  if (!state.card) return null;
  return content.cards[state.card.id] ?? null;
}

/** The options the player has today ('left' and 'right', or the target regions), in card order. */
export function todayOptions(content: ThirtyContent, state: GameState): Array<'left' | 'right' | RegionId> {
  const card = todayCard(content, state);
  return card && state.phase === 'choose' ? optionsOf(card) : [];
}

export function preview(content: ThirtyContent, state: GameState, option: 'left' | 'right' | RegionId): Preview | null {
  if (state.phase !== 'choose' || !state.card) return null;
  const card = content.cards[state.card.id];
  if (!card) return null;
  const act = actOf(card, option);
  if (!act) return null;
  return previewAct(card, state, act);
}

export function previewAct(card: Card, state: GameState, act: Act): Preview {
  const dealt = state.card!;
  const before = dangerOf(state.heats, state.penalty);
  const risky = act.tag === 'RISKY';
  const odds = risky ? effectiveOdds(new Working(state), card, dealt, act) : null;

  const run = (force?: 'held' | 'missed') => {
    const w = new Working(state);
    resolve(w, card, dealt, act, force);
    return { danger: w.danger(), changes: w.changes(), pieces: [...w.fired], penalty: w.added };
  };

  const main = run(risky ? (odds === 0 ? 'missed' : 'held') : undefined);
  const missed = risky && odds !== 0 && odds !== 100 ? run('missed') : null;

  let certainBy: HintInput['certainBy'] = null;
  if (risky && odds === 100) certainBy = state.team.includes('dove-foreign') && isTalks(card) ? 'dove-foreign' : isAlarmCard(card) ? 'false-alarm' : null;
  else if (risky && odds === 0) certainBy = 'real-alarm';

  const hint = hintLine({
    tag: act.tag,
    authored: act.hint,
    acted: act.acted,
    heatBefore: state.heats[act.acted],
    namedNeighbour: act.heats !== undefined,
    printedOdds: act.odds ?? null,
    odds,
    certainBy,
    dangerBefore: before,
    dangerAfter: main.danger,
    changes: main.changes,
    pieces: main.pieces,
    penalty: main.penalty,
    mark: act.mark ?? null,
  });

  return {
    option: act.option,
    tag: act.tag,
    text: act.text,
    hint,
    authored: act.hint,
    odds,
    dangerBefore: before,
    dangerAfter: main.danger,
    dangerIfMissed: missed ? missed.danger : risky && odds === 0 ? main.danger : null,
    changes: main.changes,
    changesIfMissed: missed ? missed.changes : risky && odds === 0 ? main.changes : null,
    pieces: main.pieces,
    penalty: main.penalty,
  };
}
