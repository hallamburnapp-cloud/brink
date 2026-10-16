/**
 * The map (SPEC "The screen", 2): one canvas at the map rect. It shows the heats the screen is
 * showing (the engine's, or the day's steps as they play), today's ring with its name and the news
 * the card brought, the home flag and, on a map day, the glowing places; a tap on one of those
 * plays the day.
 */
import { effect } from '@preact/signals';
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { tapTarget } from '../app/actions';
import { content, fit, HOME_CAPITAL, preview, regionName, todayCard, type Card, type GameState, type Heat, type MapTarget, type RegionId } from '../app/engine';
import { R, rectStyle } from '../app/layout';
import { setMap } from '../app/mapRef';
import { busy, chosen, explain, night, reduced, shown, shownHeats } from '../app/store';
import { newsLabel } from '../app/words';
import { createMap, MAP_H, MAP_W, type MapController, type MapView } from '../map';

/**
 * The longest label the map carries beside a glowing place (the week-long guard fits). The engine's
 * own fitting (hint.ts `fit`) shortens a longer line: the DANGER words always stay, the place's own
 * calming goes first (the label sits on it), a `here` label keeps what heats.
 */
export const MAP_LABEL_MAX = 46;

/** A map day's places to tap: the ones the engine chose from the live map when it dealt the card, else the card's own. */
export function targetsOf(s: GameState, card: Card | null): MapTarget[] {
  if (!card?.map) return [];
  return s.card?.targets?.length ? s.card.targets : card.targets;
}

/** The news the card brought its region: its arrival steps, and the last night's news step (the engine may deal at night). */
function ringNoteFor(s: GameState): string | null {
  if (!s.card) return null;
  const last = s.log[s.log.length - 1];
  return newsLabel(s.card.region, s.card.arrival, last?.steps ?? []);
}

/**
 * What the map draws for a state (pure, so it has a test). `heats` is what the playback is showing
 * (null once settled); `chosen` is the option pressed while a choice's outcome plays (the ring's
 * news no longer holds, and on a map day only the tapped place keeps its label; the card repeats
 * it); `night` while the night's line is on the card, when the glowing places are gone (the day is
 * decided and the map is busy recolouring).
 */
export function viewFor(s: GameState | null, heats: Record<RegionId, Heat> | null, explaining: boolean, pressed: RegionId | null, chosen: string | null = null, night = false): MapView {
  const view: MapView = { heats: heats ?? s?.heats ?? {}, ring: null, ringNote: null, targets: [], home: HOME_CAPITAL, pressed };
  if (!s || explaining || s.phase !== 'choose' || !s.card) return view;
  const card = todayCard(content, s);
  view.ring = s.card.region;
  if (heats === null && chosen === null) view.ringNote = ringNoteFor(s);
  if (card?.map && !night) {
    const targets = targetsOf(s, card).filter((t) => chosen === null || t.region === chosen);
    view.targets = targets.map((t) => ({ id: t.region, label: fit(preview(content, s, t.region)?.hint ?? t.hint, MAP_LABEL_MAX, regionName(t.region)) }));
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
    const stop = effect(() => m.update(viewFor(shown.value, shownHeats.value, explain.value !== null, pressedRef.current, chosen.value?.option ?? null, night.value !== null)));
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
    map.current?.update(viewFor(shown.value, shownHeats.value, explain.value !== null, pressed, chosen.value?.option ?? null, night.value !== null));
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
    return id && targetsOf(s, card).some((t) => t.region === id) ? id : null;
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
