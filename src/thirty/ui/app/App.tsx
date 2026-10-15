/**
 * The app shell: the 390 x 844 frame scaled uniformly to fit the window, letterboxed in the table
 * colour, clear of the device's safe areas. The game screen is exactly four things: the strip, the
 * map, the team row and the card. The title covers it; the menu sits over it. Esc and the phone's
 * back button open the menu; the game is saved whenever the page is hidden.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { CardArea } from '../parts/CardArea';
import { MapPane } from '../parts/MapPane';
import { Strip } from '../parts/Strip';
import { TeamRow } from '../parts/TeamRow';
import { Sheets } from '../screens/Sheets';
import { Title } from '../screens/Title';
import { explainSkip, saveNow } from './actions';
import { installBrowserGuards } from './guards';
import { installBackButton } from './history';
import { fitFrame, FRAME_H, FRAME_W, type FitMode, type Insets } from './layout';
import { chipOpen, explain, frameScale, nudge, reduced, screen, sheet, shown } from './store';

interface Fit {
  scale: number;
  left: number;
  top: number;
  mode: FitMode;
  /** A phone held sideways: the game asks to be turned upright. */
  sideways: boolean;
}

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
  const [fit, setFit] = useState<Fit>({ scale: 1, left: 0, top: 0, mode: 'device', sideways: false });

  useLayoutEffect(() => {
    const measure = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      const insets = readInsets(probe.current);
      const bare = insets.top === 0 && insets.bottom === 0;
      const mode: FitMode = !bare ? 'device' : matches('(hover: hover) and (pointer: fine)') ? 'desk' : 'browser';
      const f = fitFrame(w, h, insets, mode);
      setFit({ ...f, mode, sideways: matches('(pointer: coarse)') && w > h && h < 520 });
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
      if (e.repeat || e.key !== 'Escape') return;
      if (sheet.value) sheet.value = null;
      else if (chipOpen.value) chipOpen.value = null;
      else if (explain.value !== null) explainSkip();
      else if (screen.value === 'game') sheet.value = 'menu';
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
    const onHide = () => {
      saveNow();
      audio.suspend();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
      else audio.resume();
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

  const place = `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})`;
  const inGame = screen.value === 'game' && shown.value !== null;
  const n = nudge.value;
  return (
    <div ref={root} class="thirty-root">
      <div ref={probe} class="inset-probe" aria-hidden="true" />
      <div
        class={`frame${fit.mode === 'desk' ? ' desk' : ''}`}
        style={{ transform: place, width: `${FRAME_W}px`, height: `${FRAME_H}px` }}
        onPointerDownCapture={() => audio.unlock()}
        onPointerDown={() => (chipOpen.value = null)}
      >
        <div key={n} class={`table${n && !reduced.value ? ' nudged' : ''}`}>
          {inGame && (
            <>
              <Strip />
              <MapPane />
              <TeamRow />
              <CardArea />
            </>
          )}
          {!inGame && <Title />}
        </div>
        <Sheets />
      </div>
      {fit.sideways && (
        <div class="turn-upright" role="alert">
          <span>Turn your phone upright</span>
        </div>
      )}
    </div>
  );
}
