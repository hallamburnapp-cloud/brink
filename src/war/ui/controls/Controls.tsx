/**
 * The controls (spec 10: 0,739,390,68): SWAP, the two in-tray slots and the brass SWEEP lever with
 * its CLEARS lamp. Illegal buttons show at 40% and say why when tapped. Papers arm on a tap, or
 * can be dragged straight onto the map.
 */
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { boardLabels, preview, trayViews, type PaperView, type RunState } from '../../engine';
import { ORDER } from '../../content/orders';
import { OrderIcon } from '../art';
import { above, applyOrder, armSlot, sweepNow, swapNow, tapRegion } from '../app/actions';
import { boardHint, controlHint } from '../app/hints';
import { balloon, busy, frameScale, run, showToast } from '../app/store';
import { R, type Rect } from '../common/layout';
import { leverDown } from '../fx/anim';
import { clientToMap, getMap } from '../table/mapRef';

export function Controls({ s }: { s: RunState }): JSX.Element {
  const p = preview(s);
  const b = boardLabels(s);
  const pressed = leverDown.value;
  const sweepHinted = boardHint.value?.text === 'Sweep.';
  // Between crises the console rests under the Briefing: nothing is greyed out.
  const live = s.phase === 'crisis';
  const canSwap = p.canSwap || !live;
  const canSweep = p.canSweep || !live;
  return (
    <div class="layer controls-layer">
      <div class="controls" />
      <button
        class={`btn-outline swap abs${canSwap ? '' : ' off'}`}
        onClick={() => (p.canSwap ? swapNow() : showToast(p.swapReason ?? 'No swaps left.', above(R.swap)))}
      >
        <span class="btn-title">SWAP</span>
        <span class="btn-sub">{b.swapsLeft} left</span>
      </button>

      <TraySlots s={s} />

      <button
        class={`brass sweep abs${canSweep ? '' : ' disabled'}${pressed ? ' pressed' : ''}${sweepHinted && p.canSweep ? ' beckon' : ''}`}
        onClick={() => (p.canSweep ? void sweepNow() : showToast(p.sweepReason ?? 'Pin at least one lit region.', above(R.sweep)))}
        aria-label={`Sweep, ${b.sweepsLeft} left${p.clears ? '. This sweep clears the crisis.' : ''}`}
      >
        <span class="btn-title">SWEEP</span>
        <span class="btn-sub">{b.sweepsLeft} left</span>
      </button>
      <div class={`lamp abs${p.clears && live ? ' on' : ''}`} aria-hidden="true" />
      <div class="lamp-label abs">CLEARS</div>
    </div>
  );
}

/** A one-time hint over SWAP or the in-tray; drawn above the Briefing tray too. */
export function ControlHint(): JSX.Element | null {
  const hint = controlHint.value;
  if (!hint) return null;
  const r: Rect = hint.at === 'swap' ? R.swap : R.tray0;
  return (
    <div key={hint.n} class="control-hint abs" style={{ left: `${Math.max(10, r[0] - 4)}px`, bottom: `${844 - r[1] + 10}px` }} role="status">
      {hint.text}
    </div>
  );
}

/** The two in-tray wells, in play and in the Briefing. */
export function TraySlots({ s, briefing = false }: { s: RunState; briefing?: boolean }): JSX.Element {
  const papers = trayViews(s);
  return (
    <>
      {[0, 1].slice(0, s.traySlots).map((slot) => {
        const r = slot === 0 ? R.tray0 : R.tray1;
        const paper = papers.find((p) => p.slot === slot) ?? null;
        return <Well key={slot} r={r} paper={paper} briefing={briefing} />;
      })}
    </>
  );
}

interface DragState {
  dx: number;
  dy: number;
}

function Well({ r, paper, briefing }: { r: Rect; paper: PaperView | null; briefing: boolean }): JSX.Element {
  const [drag, setDrag] = useState<DragState | null>(null);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const style = { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` };
  if (!paper) {
    return (
      <div class="well abs" style={style}>
        <span class="empty-mark">{briefing ? 'EMPTY' : 'IN-TRAY'}</span>
      </div>
    );
  }

  const onPointerDown = (e: PointerEvent) => {
    if (busy.value) return;
    e.stopPropagation();
    press.current = { x: e.clientX, y: e.clientY, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const k = frameScale.value || 1;
    const dx = (e.clientX - p.x) / k;
    const dy = (e.clientY - p.y) / k;
    if (!p.moved && Math.hypot(dx, dy) < 8) return;
    p.moved = true;
    setDrag({ dx, dy });
  };
  const onPointerUp = (e: PointerEvent) => {
    e.stopPropagation();
    const was = press.current;
    press.current = null;
    setDrag(null);
    if (!was) return;
    if (!was.moved) {
      if (briefing) balloon.value = balloon.value?.kind === 'paper' && balloon.value.index === paper.slot ? null : { kind: 'paper', index: paper.slot };
      else armSlot(paper.slot, r);
      return;
    }
    dropOnMap(paper, e.clientX, e.clientY, r);
  };

  return (
    <div class={`well abs${paper.armed ? ' armed' : ''}`} style={style}>
      <div
        class={`slip${drag ? ' dragging' : ''}${paper.reason ? ' unusable' : ''}`}
        style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-1deg) scale(1.08)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null;
          setDrag(null);
        }}
        role="button"
        aria-label={`${paper.name}: ${paper.rule}`}
      >
        <span class="stamp">
          <OrderIcon id={paper.id} variant="stamp" size={28} />
        </span>
        <i class="rule-line" />
        <span class="name">{shortName(paper.name)}</span>
      </div>
    </div>
  );
}

function shortName(name: string): string {
  return name === 'LAY CABLE' ? 'CABLE' : name;
}

/** A paper dropped on the map: one-target Orders apply there; the others arm with that region chosen. */
function dropOnMap(paper: PaperView, clientX: number, clientY: number, r: Rect): void {
  const s = run.value;
  const map = getMap();
  const p = clientToMap(clientX, clientY);
  if (!s || !map || !p) return;
  const id = map.hit(p.x, p.y);
  if (!id) return;
  const t = ORDER[paper.id].targeting;
  if (t.kind === 'regions' || t.kind === 'unlit') {
    applyOrder(paper.slot, [id]);
    return;
  }
  if (!s.armed || s.armed.slot !== paper.slot) armSlot(paper.slot, r);
  if (run.value?.armed) tapRegion(id);
}
