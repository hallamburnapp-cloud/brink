/**
 * The explanation: three typed lines over the live map (SPEC-SMALL "The game in three sentences"),
 * one slip at a time with a pencilled number, then the opening's collision on a slip of its own.
 * SKIP goes straight into the week; NEXT turns the slips; BEGIN starts.
 */
import type { JSX } from 'preact';
import { Calendar, IndexCard, PencilUnderline, Tape } from '../paper';
import { seedOf } from '../paper/rand';
import { explainNext, explainSkip } from '../app/actions';
import { content, RULES } from '../app/engine';
import { explain, shown } from '../app/store';
import { pinnedFor, tapeFor } from '../app/tape';
import { fightingCount, stepWord, warSub, weekOfLine } from '../app/words';

export function Explain(): JSX.Element | null {
  const S = content.strings;
  const step = explain.value;
  const s = shown.value;
  if (step === null || !s) return null;
  const text = step <= 3 ? S.explanation[step - 1] : s.collision;
  const last = step === 4;
  return (
    <>
      <Calendar head={S.words.week} n={s.week} of={weekOfLine(S, RULES.weeks)} note={S.words.influence} value={s.influence} />
      <Tape lines={tapeFor(s, undefined, pinnedFor(s))} pinned={pinnedFor(s)} />
      {/* Line 3 names the way to stop and the war: the index card (TREATY, WAR) and A WAY OUT are put out for it, and
          the slip moves up over the sheet's foot so they show (the look recheck: line 3 pointed at nothing). */}
      {step === 3 && (
        <>
          <span class="rl-wayout rl-shown pp-obj pp-ty" aria-hidden="true">
            <span class="w">
              {S.words.wayOut}
              <PencilUnderline seed={seedOf('rl:wayout')} />
            </span>
          </span>
          <IndexCard
            war={{ label: S.words.war, count: fightingCount(s), max: RULES.warLimit, sub: warSub(S, fightingCount(s), RULES.warLimit), last: S.words.worldWar }}
            treaty={{ label: S.words.treaty, value: s.treaty, sub: S.screen.treatySub }}
            they={{ label: S.words.theyAre, word: stepWord(S, s.fed.step) }}
          />
        </>
      )}
      <div class={`rl-explain pp-obj pp-ty${last ? ' rl-collision' : ''}${step === 3 ? ' rl-up' : ''}`} key={step}>
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
