/**
 * The plotting table (spec 10: 0,171,390,520): the map canvas, fed from the shown run and the
 * HUD's extras. A deal or a refill lights its regions one by one. A tap pins (or feeds the armed
 * Order); LAY CABLE is a drag from one region to another.
 */
import type { JSX } from 'preact';
import { effect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { armedView } from '../../engine';
import { createMap, type MapControllerPlus } from '../art';
import { tapRegion, applyOrder } from '../app/actions';
import { finger } from '../app/hints';
import { balloon, busy, cableDrag, frameScale, highlight, hoverRegion, receiptOpen, reduced, run, shown, speed } from '../app/store';
import { buzz } from '../fx/shake';
import { dealIn } from '../director/play';
import { brassHold, ringHold, tableKeep, totalShown } from '../fx/anim';
import { clientToMap, setMap } from './mapRef';
import { mapViewOf } from './view';

/** Hold a region this long to see its card instead of pinning it. */
const REGION_HOLD_MS = 400;
/** How far (frame px) a press may wander and still be a tap. */
const HOLD_SLOP_PX = 14;

export function Table(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapControllerPlus | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const m = createMap(c, { reducedMotion: reduced.value, speed: speed.value }) as MapControllerPlus;
    map.current = m;
    setMap(m, c);
    // The map follows the shown run and the HUD's extras; effects run synchronously, so the
    // director can update a signal and play an effect on the very next line.
    let lit = new Set<string>();
    const stopView = effect(() => {
      const s = shown.value;
      if (!s) return;
      const view = mapViewOf(s, {
        highlight: highlight.value,
        finger: finger.value,
        cableDrag: cableDrag.value,
        total: totalShown.value,
        brassHold: brassHold.value,
        keep: tableKeep.value,
        ringHold: ringHold.value,
        hover: hoverRegion.value,
      });
      // Regions that have just come on (a deal, a refill after a sweep or a swap) light in deal order.
      const now = new Set(Object.values(view.regions).filter((r) => r.status === 'lit').map((r) => r.id));
      const fresh = s.crisis.lit.filter((id) => now.has(id) && !lit.has(id) && !view.regions[id].pinned);
      lit = now;
      if (fresh.length) dealIn(m, fresh);
      m.update(view);
    });
    const stopSettings = effect(() => {
      m.setSpeed(speed.value);
      m.setReducedMotion(reduced.value);
    });
    return () => {
      stopView();
      stopSettings();
      setMap(null, null);
      m.destroy();
      map.current = null;
    };
  }, []);

  const drag = useRef<{ from: string; slot: number; id: number } | null>(null);
  /** A press on a region: a tap pins it on release; held, it shows the region's card instead. */
  const hold = useRef<{ id: string; x: number; y: number; timer: number; long: boolean } | null>(null);
  const endHold = () => {
    const h = hold.current;
    hold.current = null;
    if (h) clearTimeout(h.timer);
    return h;
  };

  const onPointerDown = (e: PointerEvent) => {
    const m = map.current;
    const s = run.value;
    if (!m || !s || busy.value) return;
    // A tap that only closes a balloon or a receipt does nothing else (the frame closes them).
    if (balloon.value || receiptOpen.value) return;
    const p = clientToMap(e.clientX, e.clientY);
    if (!p) return;
    const id = m.hit(p.x, p.y);
    const armed = armedView(s);
    if (armed?.kind === 'drag') {
      // LAY CABLE: press on a region and drag to the other end, or tap one end and then the other.
      if (!id) return;
      if (armed.chosen.length === 1) {
        // One end is already chosen (a tap, or the paper dropped on it): this tap is the other end.
        tapRegion(id);
        return;
      }
      drag.current = { from: id, slot: armed.slot, id: e.pointerId };
      cableDrag.value = { from: id, x: p.x, y: p.y };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!id || armed) {
      if (id) tapRegion(id);
      return;
    }
    endHold();
    const h = { id, x: e.clientX, y: e.clientY, long: false, timer: 0 };
    h.timer = window.setTimeout(() => {
      h.long = true;
      buzz(8);
      balloon.value = { kind: 'region', index: 0, region: id };
    }, REGION_HOLD_MS);
    hold.current = h;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !drag.current) hoverAt(e);
    const h = hold.current;
    // A press that wanders off is not a tap.
    if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_SLOP_PX * (frameScale.value || 1)) endHold();
    const d = drag.current;
    if (!d) return;
    const p = clientToMap(e.clientX, e.clientY);
    if (p) cableDrag.value = { from: d.from, x: p.x, y: p.y };
  };

  /** A mouse over a region it could pin: the cursor turns to a hand and the region breathes. */
  const hoverAt = (e: PointerEvent) => {
    const m = map.current;
    const s = run.value;
    const p = clientToMap(e.clientX, e.clientY);
    const id = m && s && p && !busy.value && s.phase === 'crisis' ? m.hit(p.x, p.y) : null;
    const can = !!id && !!s && (s.armed ? armedView(s)!.valid.includes(id) : s.crisis.lit.includes(id));
    (e.currentTarget as HTMLElement).style.cursor = can ? 'pointer' : 'default';
    const hover = can && !s?.armed ? id : null;
    if (hoverRegion.value !== hover) hoverRegion.value = hover;
  };

  const onPointerUp = (e: PointerEvent) => {
    const h = endHold();
    if (h && !h.long) tapRegion(h.id);
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cableDrag.value = null;
    const m = map.current;
    const p = clientToMap(e.clientX, e.clientY);
    const to = m && p ? m.hit(p.x, p.y) : null;
    if (to && to !== d.from) applyOrder(d.slot, [d.from, to]);
    // Released where it started: a tap, which chooses the first end ('Now the other end.').
    else if (to === d.from) tapRegion(d.from);
  };

  return (
    <div class="table abs">
      <canvas
        ref={canvas}
        class="map-canvas"
        style={{ width: '390px', height: '520px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          if (hoverRegion.value) hoverRegion.value = null;
        }}
        onPointerCancel={() => {
          endHold();
          drag.current = null;
          cableDrag.value = null;
        }}
        aria-label="The plotting table. Tap lit regions to pin them."
        role="img"
      />
    </div>
  );
}
