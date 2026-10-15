/**
 * The map (SPEC "The screen", 2): one canvas at the map rect. It shows the heats the screen is
 * showing (the engine's, or the day's steps as they play), today's ring, the home flag and, on a
 * map day, the glowing places; a tap on one of those plays the day.
 */
import { effect } from '@preact/signals';
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { tapTarget } from '../app/actions';
import { content, HOME_CAPITAL, preview, todayCard, type GameState, type Heat, type RegionId } from '../app/engine';
import { R, rectStyle } from '../app/layout';
import { setMap } from '../app/mapRef';
import { busy, explain, reduced, shown, shownHeats } from '../app/store';
import { createMap, MAP_H, MAP_W, type MapController, type MapView } from '../map';

/** What the map draws for a state (pure, so it has a test). */
export function viewFor(s: GameState | null, heats: Record<RegionId, Heat> | null, explaining: boolean, pressed: RegionId | null): MapView {
  const view: MapView = { heats: heats ?? s?.heats ?? {}, ring: null, targets: [], home: HOME_CAPITAL, pressed };
  if (!s || explaining || s.phase !== 'choose' || !s.card) return view;
  const card = todayCard(content, s);
  view.ring = s.card.region;
  if (card?.map) {
    view.targets = card.targets.map((t) => ({ id: t.region, label: preview(content, s, t.region)?.hint ?? t.hint }));
  }
  return view;
}

export function MapPane(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapController | null>(null);
  const [pressed, setPressed] = useState<RegionId | null>(null);
  // Kept in step synchronously: a quick tap's pointerup arrives before any render.
  const pressedRef = useRef<RegionId | null>(null);
  const press = (id: RegionId | null) => {
    pressedRef.current = id;
    setPressed(id);
  };

  useEffect(() => {
    const m = createMap(canvas.current!, { reducedMotion: reduced.value });
    map.current = m;
    setMap(m);
    const stop = effect(() => m.update(viewFor(shown.value, shownHeats.value, explain.value !== null, pressedRef.current)));
    const stopMotion = effect(() => m.setReducedMotion(reduced.value));
    return () => {
      stop();
      stopMotion();
      setMap(null);
      map.current = null;
      m.destroy();
    };
  }, []);

  // The pressed target brightens: redraw the view with it.
  useEffect(() => {
    map.current?.update(viewFor(shown.value, shownHeats.value, explain.value !== null, pressed));
  }, [pressed]);

  const at = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * MAP_W, y: ((e.clientY - r.top) / r.height) * MAP_H };
  };
  const targetAt = (e: PointerEvent): RegionId | null => {
    const s = shown.value;
    if (!s || busy.value || explain.value !== null || s.phase !== 'choose') return null;
    const card = todayCard(content, s);
    if (!card?.map) return null;
    const { x, y } = at(e);
    const id = map.current?.hit(x, y) ?? null;
    return id && card.targets.some((t) => t.region === id) ? id : null;
  };

  return (
    <div class="map abs" style={rectStyle(R.map)}>
      <canvas
        ref={canvas}
        style={{ width: `${MAP_W}px`, height: `${MAP_H}px` }}
        aria-label="The world map"
        onPointerDown={(e) => press(targetAt(e))}
        onPointerUp={(e) => {
          const id = targetAt(e);
          const was = pressedRef.current;
          press(null);
          if (id && id === was) void tapTarget(id);
        }}
        onPointerCancel={() => press(null)}
        onPointerLeave={() => press(null)}
      />
    </div>
  );
}
