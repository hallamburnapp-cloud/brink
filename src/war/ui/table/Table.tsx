/**
 * The plotting table (SPEC 9: 0,171,390,520): the map canvas, fed from the shown game and the
 * HUD's extras on every change. A new deal (or a swap) lights its regions one by one. A tap pins or
 * lifts the region under it; a mouse over a region it could pin turns the cursor to a hand.
 */
import type { JSX } from 'preact';
import { effect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import type { GameState } from '../../engine';
import { createMap, type MapController } from '../art';
import { tapRegion } from '../app/actions';
import { finger } from '../app/hints';
import { introView } from '../app/intro';
import { busy, hoverRegion, pressHighlight, reduced, shown, speed } from '../app/store';
import { dealIn } from './deal';
import { clientToMap, setMap } from './mapRef';
import { freshlyLit, mapViewFor } from './view';

export function Table(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapController | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const m = createMap(c, { reducedMotion: reduced.value, speed: speed.value });
    map.current = m;
    setMap(m, c);
    // The map follows the shown game and the HUD's extras. Effects run synchronously, so the
    // director and the intro can set a signal and play an effect on the very next line.
    let last: GameState | null = null;
    const stopView = effect(() => {
      const s = shown.value;
      if (!s) return;
      const intro = introView.value;
      const view = mapViewFor(s, {
        highlight: intro?.highlight ?? pressHighlight.value,
        finger: intro ? intro.finger : finger.value,
        hover: intro ? null : hoverRegion.value,
        calm: !!intro?.calm,
        warNext: intro?.warNext,
      });
      // The intro lights its own deal; a game lights each new deal and a swap's new regions.
      if (!intro && last !== s) {
        const fresh = freshlyLit(last, s);
        if (fresh.length) dealIn(m, fresh);
      }
      last = s;
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

  const regionAt = (e: PointerEvent): string | null => {
    const m = map.current;
    const p = clientToMap(e.clientX, e.clientY);
    return m && p ? m.hit(p.x, p.y) : null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (busy.value || introView.value) return;
    const id = regionAt(e);
    if (id) tapRegion(id);
  };

  /** A mouse over a region it could pin: the cursor turns to a hand and the region breathes. */
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const s = shown.value;
    const id = s && s.phase === 'choose' && !busy.value && !introView.value ? regionAt(e) : null;
    const v = id && s ? mapViewFor(s, { highlight: null, finger: null, hover: null, calm: false }).regions[id] : null;
    const can = !!v && (v.addable || v.pinned);
    (e.currentTarget as HTMLElement).style.cursor = can ? 'pointer' : 'default';
    const hover = can ? id : null;
    if (hoverRegion.value !== hover) hoverRegion.value = hover;
  };

  return (
    <div class="table abs">
      <canvas
        ref={canvas}
        class="map-canvas"
        style={{ width: '390px', height: '520px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          if (hoverRegion.value) hoverRegion.value = null;
        }}
        aria-label="The world map. Tap lit regions to pin them."
        role="img"
      />
    </div>
  );
}
