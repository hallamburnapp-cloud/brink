/**
 * The app shell: the 390 x 844 war room scaled uniformly to fit the window, letterboxed in the
 * table colour, clear of the device's safe areas; on a desktop the console is framed as an object set
 * into the room. Every tap first unlocks audio and ends the hint on show; while a sweep plays, a
 * tap skips ahead instead of acting. The back button never drops a night (history.ts), and from the
 * title the title stays up until the war room's table has drawn (curtain.ts).
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { preview } from '../../engine';
import { fitFrame, FRAME_H, FRAME_W } from '../common/layout';
import { droneFor, tapSkip } from '../director/play';
import { FlyerCanvas } from '../fx/FlyerCanvas';
import { setShakeTarget } from '../fx/shake';
import { Game } from '../screens/Game';
import { Title } from '../screens/Title';
import { Sheets } from '../sheets/Sheets';
import { cancelOrder, sweepNow, swapNow } from './actions';
import { curtain } from './curtain';
import { installBrowserGuards } from './guards';
import { hintTap } from './hints';
import { installBackButton } from './history';
import { balloon, busy, frameScale, pressHighlight, run, screen, sheet, shown, speed } from './store';

interface Fit {
  scale: number;
  left: number;
  top: number;
  /** A desktop window: the console is framed as an object set into the room (no OS bands). */
  desk: boolean;
  /** A phone held sideways: the war room asks to be turned upright. */
  sideways: boolean;
}

function matches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

function readInsets(probe: HTMLElement | null): { top: number; bottom: number; left: number; right: number } {
  if (!probe) return { top: 0, bottom: 0, left: 0, right: 0 };
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  return { top: px(cs.paddingTop), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft), right: px(cs.paddingRight) };
}

export function App(): JSX.Element {
  const probe = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ scale: 1, left: 0, top: 0, desk: false, sideways: false });

  useLayoutEffect(() => {
    const measure = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      const insets = readInsets(probe.current);
      const desk = matches('(hover: hover) and (pointer: fine)') && insets.top === 0 && insets.bottom === 0;
      const f = fitFrame(w, h, insets, desk);
      setFit({ ...f, desk, sideways: matches('(pointer: coarse)') && w > h && h < 520 });
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
          tapSkip(null);
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

  // The phone's back button, the context menu and iOS pinch zoom.
  useEffect(() => {
    const stopBack = installBackButton();
    const stopGuards = root.current ? installBrowserGuards(root.current) : null;
    return () => {
      stopBack();
      stopGuards?.();
    };
  }, []);

  // In the background (another app, another tab) the war room falls silent; a sweep still finishes
  // (the director's timeline has a slow backup clock), and the drone comes back for the run on show.
  useEffect(() => {
    const onHide = () => audio.suspend();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        audio.suspend();
        return;
      }
      audio.resume();
      droneFor(screen.value === 'game' ? run.value : null);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onVisibility);
    };
  }, []);

  const onPointerDownCapture = (e: PointerEvent) => {
    audio.unlock();
    hintTap();
    if (busy.value && !sheet.value) {
      // During playback a tap never acts; it may skip ahead (play.ts guards the first moments and SWEEP).
      e.stopPropagation();
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      tapSkip({ x: ((e.clientX - r.left) / r.width) * FRAME_W, y: ((e.clientY - r.top) / r.height) * FRAME_H });
    }
  };

  // A tap that reaches the frame (nothing else claimed it) closes balloons and highlights.
  const onPointerDown = () => {
    balloon.value = null;
    pressHighlight.value = null;
  };

  const place = `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})`;
  const inGame = screen.value === 'game';
  // From the title into a night, the title stays up as a curtain until the table has drawn.
  const cover = curtain.value;
  return (
    <div ref={root} class="war-root">
      <div ref={probe} class="inset-probe" aria-hidden="true" />
      {fit.desk && <div class="war-bezel" style={{ transform: place }} aria-hidden="true" />}
      <div
        class={`war-frame${fit.desk ? ' desk' : ''}`}
        style={{ transform: place, '--speed': speed.value } as JSX.CSSProperties}
        onPointerDownCapture={onPointerDownCapture}
        onPointerDown={onPointerDown}
      >
        <div class="war-shake" ref={(el) => setShakeTarget(el)}>
          <div class="room" />
          {inGame && <Game />}
          {(!inGame || cover !== null) && <Title leaving={inGame} lifting={inGame && cover === 'lifting'} />}
          <div class="room-light" />
          <FlyerCanvas />
        </div>
        <Sheets s={shown.value} />
      </div>
      {fit.sideways && (
        <div class="turn-upright" role="alert">
          <span>Turn your phone upright</span>
        </div>
      )}
    </div>
  );
}
