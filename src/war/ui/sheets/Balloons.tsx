/**
 * The rule balloon under a seat (tap a seat, or keys 1-5): the staff's name, its rule as printed,
 * what a Deputy copies now, when it fires, and SELL in the shop. And the one-line refusals.
 */
import type { JSX } from 'preact';
import { seatViews, type GameState } from '../../engine';
import { STAFF_DEF } from '../../content/staff';
import { sellSeat } from '../app/actions';
import { balloon, toast } from '../app/store';
import { clampBalloonX, SEAT_W, SEAT_X } from '../common/layout';
import { Funds, RuleText } from '../common/text';

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];

export function Balloons({ s }: { s: GameState }): JSX.Element | null {
  const b = balloon.value;
  return b ? <SeatBalloon s={s} seat={b.seat} /> : null;
}

function SeatBalloon({ s, seat }: { s: GameState; seat: number }): JSX.Element | null {
  const v = seatViews(s)[seat];
  if (!v) return null;
  const canSell = s.phase === 'shop';
  const w = 230;
  const cx = SEAT_X[seat] + SEAT_W / 2;
  const left = clampBalloonX(cx, w);
  let note: string | null = null;
  if (v.id === 'DEPUTY') note = v.copies ? `Now copying the ${STAFF_DEF[v.copies].name}.` : 'Nothing to its right to copy.';
  if (v.id === 'OLDHAND') note = `Now ${v.chip}.`;
  if (v.id === 'SURVEYOR') note = `Now ${v.chip}.`;
  const fires = v.id === 'HERALD' ? 'Always on.' : `Fires ${ORDINAL[seat]}, after the pins.`;
  return (
    <div class="balloon down abs" style={{ left: `${left}px`, top: '176px', width: `${w}px` }} onPointerDown={(e) => e.stopPropagation()}>
      <i class="nib" style={{ left: `${cx - left - 6}px` }} />
      <div class="b-head">
        <span class="b-name">{v.name}</span>
        <span class="b-meta">SEAT {seat + 1}</span>
      </div>
      <div class="b-rule">
        <RuleText rule={v.rule} size={10} />
        {note && <span class="b-note"> {note}</span>}
      </div>
      <div class="b-drag">
        {fires}
        {s.seats.length > 1 ? ' Hold and drag to move it.' : ''}
      </div>
      {canSell && (
        <button class="mini-btn brass-mini sell" onClick={() => sellSeat(seat)}>
          SELL <Funds n={v.sell} size={8} />
        </button>
      )}
    </div>
  );
}

export function Toast(): JSX.Element | null {
  const t = toast.value;
  if (!t) return null;
  const w = 260;
  const left = t.x === null ? (390 - w) / 2 : clampBalloonX(t.x, w);
  return (
    <div key={t.n} class="toast abs" style={{ left: `${left}px`, bottom: `${844 - t.bottom}px`, width: `${w}px` }} role="alert">
      <span>{t.text}</span>
    </div>
  );
}
