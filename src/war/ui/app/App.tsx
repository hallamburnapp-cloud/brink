/**
 * The app shell: the 390 x 844 war room scaled uniformly to fit the window, letterboxed in the
 * table colour, clear of the device's safe areas. Every tap first unlocks audio and ends the hint
 * on show; while a sweep plays, a tap skips ahead instead of acting.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { preview } from '../../engine';
import { fitFrame } from '../common/layout';
import { skip } from '../director/play';
import { FlyerCanvas } from '../fx/FlyerCanvas';
import { setShakeTarget } from '../fx/shake';
import { Game } from '../screens/Game';
import { Title } from '../screens/Title';
import { Sheets } from '../sheets/Sheets';
import { cancelOrder, sweepNow, swapNow } from './actions';
import { hintTap } from './hints';
import { balloon, busy, frameScale, highlight, run, screen, sheet, shown } from './store';

interface Fit {
  scale: number;
  left: number;
  top: number;
}

function readInsets(probe: HTMLElement | null): { top: number; bottom: number; left: number; right: number } {
  if (!probe) return { top: 0, bottom: 0, left: 0, right: 0 };
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  return { top: px(cs.paddingTop), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft), right: px(cs.paddingRight) };
}

export function App(): JSX.Element {
  const probe = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ scale: 1, left: 0, top: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      const f = fitFrame(w, h, readInsets(probe.current));
      setFit(f);
      frameScale.value = f.scale;
    };
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (busy.value) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          skip();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (sheet.value) sheet.value = null;
        else if (balloon.value) balloon.value = null;
        else if (run.value?.armed) cancelOrder();
        else if (screen.value === 'game') sheet.value = 'menu';
        return;
      }
      if (sheet.value || screen.value !== 'game') return;
      const s = run.value;
      if (!s || s.phase !== 'crisis') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (preview(s).canSweep) void sweepNow();
      } else if (e.key === 's' || e.key === 'S') {
        swapNow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onPointerDownCapture = (e: PointerEvent) => {
    audio.unlock();
    hintTap();
    if (busy.value && !sheet.value) {
      e.stopPropagation();
      e.preventDefault();
      skip();
    }
  };

  // A tap that reaches the frame (nothing else claimed it) closes balloons and highlights.
  const onPointerDown = () => {
    balloon.value = null;
    highlight.value = null;
  };

  return (
    <div class="war-root">
      <div ref={probe} class="inset-probe" aria-hidden="true" />
      <div
        class="war-frame"
        style={{ transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})` }}
        onPointerDownCapture={onPointerDownCapture}
        onPointerDown={onPointerDown}
      >
        <div class="war-shake" ref={(el) => setShakeTarget(el)}>
          <div class="room" />
          {screen.value === 'title' ? <Title /> : <Game />}
          <div class="room-light" />
          <FlyerCanvas />
        </div>
        <Sheets s={shown.value} />
      </div>
    </div>
  );
}
