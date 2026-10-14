/**
 * End screens (spec 7 and 10): THE WORLD TIPPED after a miss, END OF SLICE after the 00:00 Summit.
 * A typed after-action report lies on the night map: the hour and crisis, the best sweep, the
 * night crisis by crisis, and the staff at the table. NEW NIGHT (and KEEP GOING after the slice).
 */
import type { JSX } from 'preact';
import { clockOf, endLabels, formatInt, formatShort, type RunState } from '../../engine';
import { PATTERN } from '../../content/patterns';
import type { StaffId } from '../../content/staff';
import { StaffIcon } from '../art';
import { keepGoing, newNight } from '../app/actions';
import { R } from '../common/layout';

export function EndCard({ s }: { s: RunState }): JSX.Element {
  const e = endLabels(s);
  const tipped = s.phase === 'missed';
  const best = s.best;
  const hours = new Map<number, Array<boolean | null>>();
  for (const l of s.log) {
    const row = hours.get(l.hour) ?? [null, null, null];
    row[l.crisisIndex] = l.cleared;
    hours.set(l.hour, row);
  }
  const [x, y, w, h] = R.endCard;
  return (
    <>
      <div class={`report abs${tipped ? ' tipped' : ' held'}`} style={{ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` }}>
        <i class="clip" />
        <div class="report-head">
          <span>AFTER-ACTION REPORT</span>
          <span class="num">{s.seed === 'FIRST-NIGHT' ? 'FIRST NIGHT' : s.mode === 'run' ? 'NIGHT SHIFT' : s.mode === 'late' ? 'LATE SHIFT' : 'MID SHIFT'}</span>
        </div>
        <div class="report-stamp">{e.title}</div>
        <div class="report-line">{e.line}</div>
        {tipped ? (
          <div class="report-total num">
            {formatInt(s.crisis.total)} <span class="of">of</span> {formatInt(s.crisis.target)}
          </div>
        ) : (
          <div class="report-total num">
            {s.log.filter((l) => l.cleared).length} <span class="of">of</span> {s.log.length} <span class="of">crises held</span>
          </div>
        )}
        <Gauge total={s.crisis.total} target={s.crisis.target} tipped={tipped} />
        <div class="report-rows">
          <div class="report-row">
            <span class="k">BEST SWEEP</span>
            <span class="v">
              {best ? (
                <>
                  <b class="stencil">{PATTERN[best.pattern].name}</b> <span class="num lv">Lv {best.level}</span>{' '}
                  <span class="num big">{formatShort(best.leverage, 9)}</span>
                </>
              ) : (
                <span class="num">—</span>
              )}
            </span>
          </div>
          <div class="report-row">
            <span class="k">THE NIGHT</span>
            <span class="v night">
              {[...hours.entries()].map(([hour, row]) => (
                <span key={hour} class="hour">
                  <span class="num">{clockOf(hour)}</span>
                  {row.map((c, i) => (
                    <i key={i} class={c === null ? 'todo' : c ? 'won' : 'lost'} />
                  ))}
                </span>
              ))}
            </span>
          </div>
          <div class="report-row">
            <span class="k">AT THE TABLE</span>
            <span class="v staff">
              {s.staff.length ? (
                s.staff.map((st) => (
                  <span key={st.uid} class="mini-seat">
                    <StaffIcon id={st.id as StaffId} size={24} />
                  </span>
                ))
              ) : (
                <span class="none">Nobody. Hire staff in the Briefing.</span>
              )}
            </span>
          </div>
        </div>
      </div>
      {tipped ? (
        <button class="brass end-btn abs" style={{ left: `${R.endButton[0]}px`, top: `${R.endButton[1]}px`, width: `${R.endButton[2]}px`, height: `${R.endButton[3]}px` }} onClick={newNight}>
          <span class="btn-title">NEW NIGHT</span>
        </button>
      ) : (
        <>
          <button class="brass end-btn abs" style={{ left: '24px', top: `${R.endButton[1]}px`, width: '200px', height: '56px' }} onClick={newNight}>
            <span class="btn-title">NEW NIGHT</span>
          </button>
          <button class="btn-outline end-btn abs" style={{ left: '234px', top: `${R.endButton[1]}px`, width: '132px', height: '56px' }} onClick={keepGoing}>
            <span class="btn-title">KEEP GOING</span>
            <span class="btn-sub">into {clockOf(s.crisis.hour + 1)}</span>
          </button>
        </>
      )}
    </>
  );
}

/**
 * The deciding crisis as a typed gauge: how close the miss came, or how far the Summit was
 * overwhelmed. The tick marks the target; past it, the bar rescales so the tick moves left.
 */
function Gauge({ total, target, tipped }: { total: bigint; target: bigint; tipped: boolean }): JSX.Element | null {
  if (target <= 0n) return null;
  const ratio = Number((total * 10_000n) / target) / 10_000;
  const span = Math.max(1, ratio);
  const fill = Math.min(1, ratio / span);
  const tick = Math.max(0.2, 1 / span);
  const label = tipped ? `${formatInt(target - total)} SHORT` : `+${formatShort(total - target, 9)} OVER`;
  return (
    <div class="report-gauge" aria-label={label}>
      <span class="track">
        <i class="fill" style={{ width: `${(fill * 100).toFixed(1)}%` }} />
        <i class="tick" style={{ left: `${(tick * 100).toFixed(1)}%` }} />
      </span>
      <span class="num">{label}</span>
    </div>
  );
}
