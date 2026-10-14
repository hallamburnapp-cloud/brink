/** The canvas the flying numbers are drawn on: the whole frame, never taking a tap. */
import type { JSX } from 'preact';
import { effect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { frameScale } from '../app/store';
import { setFlyerLayer } from '../director/play';
import { FlyerLayer } from './flyers';

export function FlyerCanvas(): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const layer = new FlyerLayer(ref.current!);
    setFlyerLayer(layer);
    const stop = effect(() => layer.resize(frameScale.value));
    return () => {
      stop();
      setFlyerLayer(null);
      layer.destroy();
    };
  }, []);
  return <canvas ref={ref} class="flyers" aria-hidden="true" />;
}
