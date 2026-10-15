/**
 * The end screens (SPEC section 9): a card that says how the world ended over the map, kept to the
 * upper map (or the lower, when the regions it points at are up there) so the final world stays in
 * view. WORLD UNITED ★★★ (30 of 30); CEASEFIRE ★★ or ★ (the push missed; the war stops where it
 * stands); WAR (war took 10; with 3 or fewer free regions left, those are picked out on the map).
 * The console carries on: the best send in the readout band, HOME and NEW GAME where SWAP and SEND
 * were.
 */
import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { REGION, type RegionId } from '../../content/map';
import { endView, type EndView, type GameState } from '../../engine';
import { StaffIcon } from '../art';
import { askNewGame, endShown, quitToTitle } from '../app/actions';
import { FRAME_H, R, rectStyle } from '../common/layout';
import { endCopy } from './endCopy';

const KICKER: Record<EndView['ending'], string> = {
  'WORLD UNITED': 'The whole world is yours',
  CEASEFIRE: 'The war stops where it stands',
  WAR: 'The war won',
};

/**
 * The regions the card points at: WAR's near miss (the free regions that were left), or the red
 * regions a CEASEFIRE leaves outlined.
 */
export function pointsAt(e: EndView, owner: GameState['owner'] | null = null): RegionId[] {
  if (e.nearMiss.length) return e.nearMiss;
  if (e.ending === 'CEASEFIRE' && owner) return (Object.keys(owner) as RegionId[]).filter((id) => owner[id] === 'red');
  return [];
}

/** The card sits low when the regions it points at are in the upper half of the map. */
export function cardLow(e: EndView, owner: GameState['owner'] | null = null): boolean {
  const ids = pointsAt(e, owner);
  if (!ids.length) return false;
  const y = ids.reduce((sum, id) => sum + REGION[id].y, 0) / ids.length;
  return y < R.map[3] / 2;
}

/** The card takes the height of what it says: hung from the top of its rect, or stood on the bottom of the low one. */
function cardStyle(low: boolean): JSX.CSSProperties {
  const [x, y, w, h] = low ? R.endCardLow : R.endCard;
  const at = low ? { bottom: `${FRAME_H - (y + h)}px` } : { top: `${y}px` };
  return { left: `${x}px`, width: `${w}px`, maxHeight: `${h}px`, ...at };
}

export function EndCard({ s }: { s: GameState }): JSX.Element | null {
  // Seen: the finished game leaves the save (until now a reload would still show this card).
  useEffect(() => endShown(s), [s]);
  const e = endView(s);
  if (!e) return null;
  const copy = endCopy(e);
  const tone = e.ending === 'WORLD UNITED' ? 'united' : e.ending === 'CEASEFIRE' ? 'ceasefire' : 'war';
  // 'WORLD UNITED · 30 of 30': the ending large, the count under it.
  const [head, tail] = e.title.split(' · ');
  return (
    <div class="layer end-layer">
      <div class={`report abs ${tone}`} style={cardStyle(cardLow(e, s.owner))} role="dialog" aria-label={e.title}>
        <div class="report-kicker">{KICKER[e.ending]}</div>
        <Stars n={e.stars} />
        <div class="report-title">{head}</div>
        {tail && <div class="report-sub num">{tail}</div>}
        {copy.lines.map((l) => (
          <div key={l} class="report-line">
            {l}
          </div>
        ))}
        <div class="report-rows">
          {copy.biggest && <Row k="BIGGEST TURN" v={copy.biggest} />}
          <div class="report-row">
            <span class="k">STAFF</span>
            <span class="v staff">
              {e.staff.length ? (
                e.staff.map((id, i) => (
                  <span key={`${i}-${id}`} class="mini-seat">
                    <StaffIcon id={id} size={22} />
                  </span>
                ))
              ) : (
                <span class="none">None hired</span>
              )}
            </span>
          </div>
        </div>
      </div>
      <div class="end-best abs" style={rectStyle(R.endBest)} aria-label={copy.best ? `Best send ${copy.best.value}, ${copy.best.note}` : 'No send'}>
        <span class="ro-label">BEST SEND</span>
        <span class="eb-value num">{copy.best?.value ?? '–'}</span>
        {copy.best && <span class={`eb-note${copy.best.won ? ' won' : ''}`}>{copy.best.note}</span>}
      </div>
      <button class="btn-outline end-home abs" style={rectStyle(R.endHome)} onClick={quitToTitle}>
        <span class="btn-title">HOME</span>
      </button>
      <button class="brass end-btn send abs" style={rectStyle(R.endNew)} onClick={askNewGame}>
        <span class="btn-title">NEW GAME</span>
        <span class="send-sub win">A NEW WORLD</span>
      </button>
    </div>
  );
}

function Stars({ n }: { n: number }): JSX.Element {
  return (
    <div class="report-stars" aria-label={n ? `${n} of 3 stars` : 'No stars'}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="20" height="20" class={i < n ? 'on' : ''} aria-hidden="true">
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
