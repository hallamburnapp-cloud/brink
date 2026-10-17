/**
 * The paper map as a Preact component: a host div that owns one controller for its lifetime and
 * passes every new `view` to it. The controller is handed back through `mapRef` for hit testing,
 * centre() and the call's shift; pointer gestures (tap and hold, tap a counter then a place) are the
 * screens' and read `map.hit(fx, fy)` with frame px.
 */
import { useEffect, useRef } from 'preact/hooks';
import type { PaperMap, PaperMapOptions, PaperView, UpdateOptions } from './contract';
import { createPaperMap } from './map';

export interface PaperMapRef {
  current: PaperMap | null;
}

export interface PaperMapProps {
  view: PaperView;
  options?: PaperMapOptions;
  /** Receives the controller once mounted (null again when unmounted). */
  mapRef?: PaperMapRef;
  /** Called when a view has settled on the sheet (new marks drawn in). */
  onSettled?: () => void;
  /** Per-update options (animate: false puts marks down at once). */
  update?: UpdateOptions;
  class?: string;
  style?: string | Record<string, string | number>;
}

export function PaperMapView({ view, options, mapRef, onSettled, update, class: cls, style }: PaperMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const ctrl = useRef<PaperMap | null>(null);
  const latest = useRef({ onSettled, update });
  latest.current = { onSettled, update };

  useEffect(() => {
    if (!host.current) return;
    const map = createPaperMap(host.current, options);
    ctrl.current = map;
    if (mapRef) mapRef.current = map;
    return () => {
      map.destroy();
      ctrl.current = null;
      if (mapRef) mapRef.current = null;
    };
    // The controller lives as long as the host: options are read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = ctrl.current;
    if (!map) return;
    let live = true;
    void map.update(view, latest.current.update).then(() => {
      if (live) latest.current.onSettled?.();
    });
    return () => {
      live = false;
    };
  }, [view]);

  return <div ref={host} class={`pp-maphost${cls ? ` ${cls}` : ''}`} style={style} />;
}
