/**
 * The app shell: the 390 x 844 paper room scaled uniformly to fit the window, letterboxed on a dark
 * desk, clear of the device's safe areas. One room, one sheet: the title, the week, the call, the
 * ending and the menu are layers of paper over the same map. Esc and the phone's back button open
 * the menu (or close what is open); the game is saved whenever the page is hidden.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Room } from '../screens/Room';
import { cancelAct, ensureTitleWorld, explainSkip, saveNow, skipPlayback } from './actions';
import { installBrowserGuards } from './guards';
import { installBackButton } from './history';
import { fitFrame, FRAME_H, FRAME_W, type FitMode, type Insets } from './layout';
import { armed, explain, frameFit, inGame, lifted, play, sheet } from './store';

function matches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

function readInsets(probe: HTMLElement | null): Insets {
  if (!probe) return { top: 0, bottom: 0, left: 0, right: 0 };
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  return { top: px(cs.paddingTop), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft), right: px(cs.paddingRight) };
}

export function App(): JSX.Element {
  const probe = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<FitMode>('phone');
  const [sideways, setSideways] = useState(false);

  useLayoutEffect(() => {
    ensureTitleWorld();
    const measure = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      const insets = readInsets(probe.current);
      const m: FitMode = matches('(hover: hover) and (pointer: fine)') && w > FRAME_W + 2 * 24 ? 'desk' : 'phone';
      const f = fitFrame(w, h, insets, m);
      setMode(m);
      setSideways(matches('(pointer: coarse)') && w > h && h < 520);
      frameFit.value = f;
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
      if (e.repeat || e.key !== 'Escape') return;
      if (sheet.value) sheet.value = null;
      else if (explain.value !== null) explainSkip();
      else if (play.value) skipPlayback();
      else if (armed.value || lifted.value) cancelAct();
      else if (inGame.value) sheet.value = 'menu';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const stopBack = installBackButton();
    const stopGuards = root.current ? installBrowserGuards(root.current) : null;
    return () => {
      stopBack();
      stopGuards?.();
    };
  }, []);

  useEffect(() => {
    const onHide = () => saveNow();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const fit = frameFit.value;
  const place = `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})`;
  return (
    <div ref={root} class="rl-root">
      <div ref={probe} class="rl-inset-probe" aria-hidden="true" />
      <div class={`rl-frame${mode === 'desk' ? ' rl-desk' : ''}`} style={{ transform: place, width: `${FRAME_W}px`, height: `${FRAME_H}px` }}>
        <Room />
      </div>
      {sideways && (
        <div class="rl-upright" role="alert">
          <span>Turn your phone upright</span>
        </div>
      )}
    </div>
  );
}
