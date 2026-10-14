/**
 * Balloons and toasts: the rule balloon under a seat (spec 10: 220 x 40, over the map), a paper's
 * balloon in the Briefing (USE / SELL), the Summit chip's rule, and the one-line refusals.
 */
import type { JSX } from 'preact';
import { boardLabels, seatViews, trayViews, type RunState } from '../../engine';
import { STAFF_DEF, type StaffId } from '../../content/staff';
import { armSlot, sellSeat, sellTray } from '../app/actions';
import { balloon, toast } from '../app/store';
import { clampBalloonX, R, SEAT_X, SEAT_W } from '../common/layout';
import { Funds, RuleText } from '../common/text';

export function Balloons({ s }: { s: RunState }): JSX.Element | null {
  const b = balloon.value;
  if (!b) return null;
  if (b.kind === 'seat') return <SeatBalloon s={s} seat={b.index} />;
  if (b.kind === 'paper') return <PaperBalloon s={s} slot={b.index} />;
  return <SummitBalloon s={s} />;
}

function stop(e: Event): void {
  e.stopPropagation();
}

function SeatBalloon({ s, seat }: { s: RunState; seat: number }): JSX.Element | null {
  const v = seatViews(s)[seat];
  if (!v) return null;
  const canSell = s.phase === 'briefing';
  const w = 220;
  const cx = SEAT_X[seat] + SEAT_W / 2;
  const left = clampBalloonX(cx, w);
  const copies = v.copies ? STAFF_DEF[v.copies as StaffId].name : null;
  return (
    <div class="balloon down abs" style={{ left: `${left}px`, top: '176px', width: `${w}px` }} onPointerDown={stop}>
      <i class="nib" style={{ left: `${cx - left - 6}px` }} />
      <div class="b-head">
        <span class="b-name">{v.name}</span>
        <span class="b-meta">{STAFF_DEF[v.id as StaffId].rarity.toUpperCase()}</span>
      </div>
      <div class="b-rule">
        <RuleText rule={v.rule} />
        {v.id === 'DEPUTY' && <span class="b-note">{copies ? ` Now copying the ${copies}.` : ' Nothing to its right to copy.'}</span>}
        {v.id === 'OLDHAND' && <span class="b-note"> Count: {v.count}.</span>}
      </div>
      {canSell && (
        <button class="mini-btn brass-mini sell" onClick={() => sellSeat(seat)}>
          SELL <Funds n={v.sell} size={8} />
        </button>
      )}
    </div>
  );
}

function PaperBalloon({ s, slot }: { s: RunState; slot: number }): JSX.Element | null {
  const p = trayViews(s).find((x) => x.slot === slot);
  if (!p) return null;
  const r = slot === 0 ? R.tray0 : R.tray1;
  const w = 220;
  const cx = r[0] + r[2] / 2;
  const left = clampBalloonX(cx, w);
  return (
    <div class="balloon up abs" style={{ left: `${left}px`, bottom: `${844 - r[1] + 8}px`, width: `${w}px` }} onPointerDown={stop}>
      <i class="nib" style={{ left: `${cx - left - 6}px` }} />
      <div class="b-head">
        <span class="b-name">{p.name}</span>
        <span class="b-meta">ORDER</span>
      </div>
      <div class="b-rule">
        <RuleText rule={p.rule} />
      </div>
      <div class="b-actions">
        {p.reason ? (
          <span class="b-note">{p.reason}</span>
        ) : (
          <button
            class="mini-btn"
            onClick={() => {
              balloon.value = null;
              armSlot(slot, r);
            }}
          >
            USE
          </button>
        )}
        <button class="mini-btn brass-mini" onClick={() => sellTray(slot)}>
          SELL <Funds n={p.sell} size={8} />
        </button>
      </div>
    </div>
  );
}

function SummitBalloon({ s }: { s: RunState }): JSX.Element {
  const b = boardLabels(s);
  return (
    <div class="balloon down abs" style={{ left: '10px', top: '102px', width: '220px' }} onPointerDown={stop}>
      <i class="nib" style={{ left: '40px' }} />
      <div class="b-head">
        <span class="b-name alarm">{b.summitChip}</span>
        <span class="b-meta">{b.twistNow ? 'IN FORCE' : 'AT THE SUMMIT'}</span>
      </div>
      <div class="b-rule">{b.twistRule}</div>
    </div>
  );
}

export function Toast(): JSX.Element | null {
  const t = toast.value;
  if (!t) return null;
  const w = 240;
  const left = t.x === null ? (390 - w) / 2 : clampBalloonX(t.x, w);
  return (
    <div key={t.n} class="toast abs" style={{ left: `${left}px`, bottom: `${844 - t.bottom}px`, width: `${w}px` }} role="alert">
      <span>{t.text}</span>
    </div>
  );
}
