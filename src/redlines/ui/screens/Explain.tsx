/**
 * The explanation: three typed lines over the live map (SPEC-SMALL "The game in three sentences"),
 * one slip at a time with a pencilled number, then the opening's collision on a slip of its own.
 * SKIP goes straight into the week; NEXT turns the slips; BEGIN starts.
 */
import type { JSX } from 'preact';
import { Calendar, PencilUnderline, Tape } from '../paper';
import { seedOf } from '../paper/rand';
import { explainNext, explainSkip } from '../app/actions';
import { content } from '../app/engine';
import { explain, shown } from '../app/store';
import { tapeFor } from '../app/tape';

export function Explain(): JSX.Element | null {
  const S = content.strings;
  const step = explain.value;
  const s = shown.value;
  if (step === null || !s) return null;
  const text = step <= 3 ? S.explanation[step - 1] : s.collision;
  const last = step === 4;
  return (
    <>
      <Calendar head={S.words.week} n={s.week} of={S.screen.weekOf} note={S.words.influence} value={s.influence} />
      <Tape lines={tapeFor(s)} />
      <div class={`rl-explain pp-obj pp-ty${last ? ' rl-collision' : ''}`} key={step}>
        <div class="n pp-hand">{step}</div>
        <div class="ln">{text}</div>
        <div class="row">
          {!last ? (
            <button type="button" class="rl-word rl-quiet" onClick={explainSkip}>
              {S.screen.skip}
            </button>
          ) : (
            <span />
          )}
          <button type="button" class="rl-word" onClick={explainNext}>
            {last ? S.screen.begin : S.screen.next}
            <PencilUnderline seed={seedOf('rl:explain' + step)} />
          </button>
        </div>
      </div>
    </>
  );
}
