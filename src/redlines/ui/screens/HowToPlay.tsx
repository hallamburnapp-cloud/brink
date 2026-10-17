/** HOW TO PLAY: the rules a player can read, seven typed lines on one card, from the title or the menu. */
import type { JSX } from 'preact';
import { Paperclip } from '../paper';
import { closeSheet } from '../app/actions';
import { content } from '../app/engine';
import { Choice } from './Title';

export function HowToPlay(): JSX.Element {
  const S = content.strings;
  return (
    <div class="rl-card rl-how pp-obj pp-ty" role="dialog" aria-label={S.howToPlay.title}>
      <Paperclip />
      <div class="rl-head">{S.howToPlay.title}</div>
      {S.howToPlay.lines.map((l, i) => (
        <div class="ln" key={i}>
          {l}
        </div>
      ))}
      <div class="rl-row">
        <Choice word={S.debrief.done} onTap={closeSheet} seed="howdone" />
      </div>
    </div>
  );
}
