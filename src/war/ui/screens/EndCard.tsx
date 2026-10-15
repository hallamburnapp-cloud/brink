/**
 * The end screens (SPEC section 9): the map stays behind a card that says how the world ended.
 * WORLD UNITED ★★★ (30 of 30); CEASEFIRE ★★ or ★ (the push missed; the war stops where it
 * stands); WAR (war took 10; with 3 or fewer grey left, those regions are picked out on the map).
 * Then the best send, the biggest turn and the staff in seat order. NEW GAME and HOME.
 */
import type { JSX } from 'preact';
import { endView, type EndView, type GameState } from '../../engine';
import { StaffIcon } from '../art';
import { newGameNow, quitToTitle } from '../app/actions';
import { R, rectStyle } from '../common/layout';

const KICKER: Record<EndView['ending'], string> = {
  'WORLD UNITED': 'The whole world is yours',
  CEASEFIRE: 'The war stops where it stands',
  WAR: 'The war won',
};

export function EndCard({ s }: { s: GameState }): JSX.Element | null {
  const e = endView(s);
  if (!e) return null;
  const tone = e.ending === 'WORLD UNITED' ? 'united' : e.ending === 'CEASEFIRE' ? 'ceasefire' : 'war';
  // 'WORLD UNITED · 30 of 30': the ending large, the count under it.
  const [head, tail] = e.title.split(' · ');
  return (
    <div class="layer end-layer">
      <div class={`report abs ${tone}`} style={rectStyle(R.endCard)} role="dialog" aria-label={e.title}>
        <div class="report-kicker">{KICKER[e.ending]}</div>
        <Stars n={e.stars} />
        <div class="report-title">{head}</div>
        {tail && <div class="report-sub num">{tail}</div>}
        {e.lines.map((l) => (
          <div key={l} class="report-line">
            {l}
          </div>
        ))}
        <div class="report-rows">
          <Row k="BEST SEND" v={e.best?.text ?? '–'} />
          {e.biggestTurn && <Row k="BIGGEST TURN" v={e.biggestTurn.text} />}
          <div class="report-row">
            <span class="k">STAFF</span>
            <span class="v staff">
              {e.staff.length ? (
                e.staff.map((id, i) => (
                  <span key={`${i}-${id}`} class="mini-seat">
                    <StaffIcon id={id} size={24} />
                  </span>
                ))
              ) : (
                <span class="none">Nobody hired.</span>
              )}
            </span>
          </div>
        </div>
      </div>
      <button class="brass end-btn abs" style={rectStyle(R.endNew)} onClick={newGameNow}>
        <span class="btn-title">NEW GAME</span>
      </button>
      <button class="btn-outline end-home abs" style={rectStyle(R.endHome)} onClick={quitToTitle}>
        <span class="btn-title">HOME</span>
      </button>
    </div>
  );
}

function Stars({ n }: { n: number }): JSX.Element {
  return (
    <div class="report-stars" aria-label={n ? `${n} of 3 stars` : 'No stars'}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="22" height="22" class={i < n ? 'on' : ''} aria-hidden="true">
          <path d="M12 2.6 L14.8 8.9 L21.6 9.5 L16.4 14 L18 20.7 L12 17.1 L6 20.7 L7.6 14 L2.4 9.5 L9.2 8.9 Z" />
        </svg>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <div class="report-row">
      <span class="k">{k}</span>
      <span class="v num">{v}</span>
    </div>
  );
}
