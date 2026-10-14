/**
 * The LAST SWEEP receipt as a typed linen slip: where a sweep's points came from, line by line,
 * ending on 'I x M = leverage'. It unfolds above the readout from the sweep's sum, or above the
 * Briefing tray from the clear's ticket; a tap on it, or anywhere else, folds it away.
 */
import type { JSX } from 'preact';
import type { SweepRecord } from '../../engine';
import { receiptOpen } from '../app/store';
import { receiptOf } from './receipt';

export function ReceiptPaper({ rec, bottom }: { rec: SweepRecord; bottom: number }): JSX.Element {
  const r = receiptOf(rec);
  return (
    <div
      class="receipt abs"
      style={{ bottom: `${bottom}px` }}
      role="dialog"
      aria-label={r.title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => (receiptOpen.value = null)}
    >
      <div class="r-head">{r.title}</div>
      {r.lines.map((l, i) => (
        <div key={i} class="r-line">
          <span class="r-label">{l.label}</span>
          <span class={`r-val num ${l.tone}`}>{l.value}</span>
        </div>
      ))}
      <div class="r-total num">= {r.total}</div>
    </div>
  );
}
