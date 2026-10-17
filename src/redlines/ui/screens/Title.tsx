/**
 * The title: the world as it stands under a dim, and a typed card paper-clipped over it: the name,
 * "Red Lines" in the hand, one line, then PLAY (or CONTINUE, with PLAY under it for a new game) and
 * HOW TO PLAY as typed forms. While a game begins the card lifts off the sheet (the curtain).
 */
import type { JSX } from 'preact';
import { BRAND } from '../../../config';
import { Dim, Paperclip, PencilUnderline } from '../paper';
import { continueGame, howToPlay, newGameNow, play } from '../app/actions';
import { content } from '../app/engine';
import { saved, titleWorld } from '../app/store';
import { seedOf } from '../paper/rand';

export function Title({ lifting }: { lifting: boolean }): JSX.Element {
  const S = content.strings;
  const save = saved.value ? titleWorld.value : null;
  const sub = save && save.phase !== 'ended' ? `${S.words.week} ${save.week} ${S.screen.weekOf}` : null;
  return (
    <div class={`rl-layer rl-title${lifting ? ' rl-lifting' : ''}`}>
      <Dim />
      <div class="rl-card rl-title-card pp-obj pp-ty">
        <Paperclip />
        <div class="rl-name">{BRAND.name}</div>
        <div class="rl-sub pp-hand">{S.title.subtitle}</div>
        <div class="rl-blurb">{S.title.blurb}</div>
        {save ? (
          <Choice word={S.title.continue} sub={sub ?? undefined} onTap={continueGame} seed="continue" />
        ) : null}
        <Choice word={S.title.play} onTap={save ? newGameNow : play} seed="play" />
        <Choice word={S.title.howToPlay} onTap={howToPlay} seed="how" small />
      </div>
    </div>
  );
}

/** A typed form with a pencil underline: the look's button. */
export function Choice({ word, sub, onTap, seed, small, disabled, class: cls }: { word: string; sub?: string; onTap: () => void; seed: string; small?: boolean; disabled?: boolean; class?: string }): JSX.Element {
  return (
    <button type="button" class={`rl-choice${small ? ' rl-small' : ''}${cls ? ` ${cls}` : ''}`} onClick={onTap} disabled={disabled}>
      <span class="w">
        {word}
        <PencilUnderline seed={seedOf('rl:' + seed)} />
      </span>
      {sub ? <span class="c">{sub}</span> : null}
    </button>
  );
}
