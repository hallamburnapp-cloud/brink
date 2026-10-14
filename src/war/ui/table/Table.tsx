/**
 * The plotting table (spec 10: 0,171,390,520): the map canvas, fed from the shown run and the
 * HUD's extras. A tap pins (or feeds the armed Order); LAY CABLE is a drag from one region to
 * another.
 */
import type { JSX } from 'preact';
import { effect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { armedView } from '../../engine';
import { createMap, type MapControllerPlus } from '../art';
import { tapRegion, applyOrder } from '../app/actions';
import { finger } from '../app/hints';
import { busy, cableDrag, highlight, reduced, run, shown, speed } from '../app/store';
import { brassHold, keepLit, totalShown } from '../fx/anim';
import { clientToMap, setMap } from './mapRef';
import { mapViewOf } from './view';

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
    const stopView = effect(() => {
      const s = shown.value;
      if (!s) return;
      m.update(
        mapViewOf(s, {
          highlight: highlight.value,
          finger: finger.value,
          cableDrag: cableDrag.value,
          total: totalShown.value,
          brassHold: brassHold.value,
          keepLit: keepLit.value,
        }),
      );
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

  const onPointerDown = (e: PointerEvent) => {
    const m = map.current;
    const s = run.value;
    if (!m || !s || busy.value) return;
    const p = clientToMap(e.clientX, e.clientY);
    if (!p) return;
    const id = m.hit(p.x, p.y);
    const armed = armedView(s);
    if (armed?.kind === 'drag') {
      // LAY CABLE: press on a region, drag to the other end.
      if (!id) return;
      drag.current = { from: id, slot: armed.slot, id: e.pointerId };
      cableDrag.value = { from: id, x: p.x, y: p.y };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (id) tapRegion(id);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = clientToMap(e.clientX, e.clientY);
    if (p) cableDrag.value = { from: d.from, x: p.x, y: p.y };
  };

  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cableDrag.value = null;
    const m = map.current;
    const p = clientToMap(e.clientX, e.clientY);
    const to = m && p ? m.hit(p.x, p.y) : null;
    if (to && to !== d.from) applyOrder(d.slot, [d.from, to]);
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
        onPointerCancel={() => {
          drag.current = null;
          cableDrag.value = null;
        }}
        aria-label="The plotting table. Tap lit regions to pin them."
        role="img"
      />
    </div>
  );
}
