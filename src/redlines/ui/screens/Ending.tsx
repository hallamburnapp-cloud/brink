/**
 * The end (SPEC-SMALL "Endings and the score"): a typed card with the ending's two lines and the
 * score over the map as it was left (the war's chain is on it), then the debrief: one typed page a
 * week, what you did over what they were thinking (in red), flipped through with BACK and NEXT, and a
 * closing card that names the two dials in words, with PLAY AGAIN and TITLE.
 */
import type { JSX } from 'preact';
import { DebriefPage, Dim, TypedCard } from '../paper';
import { debriefGo, home, playAgain } from '../app/actions';
import { content, type Ending as EndingT } from '../app/engine';
import { debriefPage, shown } from '../app/store';
import { fill } from '../app/words';
import { Choice } from './Title';

function titleOf(e: EndingT): { title: string; tone: 'red' | 'blue' | 'plain' } {
  const W = content.strings.words;
  if (e.kind === 'treaty') return { title: W.treaty, tone: 'blue' };
  if (e.kind === 'war') return { title: W.worldWar, tone: 'red' };
  return { title: W.frozen, tone: 'plain' };
}

export function Ending(): JSX.Element | null {
  const s = shown.value;
  const e = s?.ending;
  if (!s || !e) return null;
  const S = content.strings;
  const page = debriefPage.value;
  const weeks = s.log;
  const n = weeks.length;
  const { title, tone } = titleOf(e);

  if (page === null) {
    return (
      <div class="rl-layer rl-ending">
        <Dim />
        <TypedCard title={title} tone={tone} lines={e.lines} score={{ label: S.debrief.score, value: e.score }} style="top:396px">
          <div class="rl-row">
            <Choice word={S.debrief.next} sub={S.debrief.intro} onTap={() => debriefGo(0)} seed="debrief" />
          </div>
        </TypedCard>
      </div>
    );
  }

  if (page >= n) {
    return (
      <div class="rl-layer rl-ending">
        <Dim />
        <TypedCard head={S.debrief.title} title={title} tone={tone} lines={[e.dials]} score={{ label: S.debrief.score, value: e.score }} style="top:330px">
          <div class="rl-row">
            <Choice word={S.debrief.again} onTap={playAgain} seed="again" />
            <Choice word={S.debrief.toTitle} onTap={home} seed="title" small />
          </div>
        </TypedCard>
      </div>
    );
  }

  const w = weeks[page];
  const dense = w.hidden.length + w.acts.length > 7;
  return (
    <div class="rl-layer rl-ending">
      <Dim />
      <div class={dense ? 'rl-dense' : undefined}>
        <DebriefPage
          key={page}
          week={fill(S.debrief.week, { week: w.week }).toUpperCase()}
          tag={S.debrief.title}
          whatLabel={S.debrief.youDid.toUpperCase()}
          what={w.acts.length ? w.acts : [S.acts.none]}
          thoughtLabel={S.debrief.theyThought.toUpperCase()}
          thoughts={w.hidden.length ? w.hidden : [S.debrief.nothingHidden]}
          page={`${page + 1} / ${n}`}
        />
      </div>
      <div class="rl-nav">
        <Choice word={S.debrief.back} onTap={() => debriefGo(page === 0 ? null : page - 1)} seed="back" small />
        <Choice word={page === n - 1 ? S.debrief.done : S.debrief.next} onTap={() => debriefGo(page + 1)} seed={'next' + page} />
      </div>
    </div>
  );
}
