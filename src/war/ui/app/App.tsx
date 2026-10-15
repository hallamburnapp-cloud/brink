/**
 * The app shell: the 390 x 844 war room scaled uniformly to fit the window, letterboxed in the
 * table colour, clear of the device's safe areas; on a desktop the console is framed as an object
 * set into the room. Every tap first unlocks audio and ends a timed coach line; while a send plays,
 * a tap skips ahead instead of acting. Desktop keys: Space sends, S swaps, 1-5 pick a seat (arrows
 * move it), Esc opens the menu. The game is saved whenever the page is hidden.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { fitFrame, FRAME_H, FRAME_W, type FitMode } from '../common/layout';
import { FlyerCanvas } from '../fx/FlyerCanvas';
import { setShakeTarget } from '../fx/shake';
import { Game } from '../screens/Game';
import { Title } from '../screens/Title';
import { Sheets } from '../sheets/Sheets';
import { droneFor, moveSeat, saveNow, sendNow, swapNow } from './actions';
import { curtain, veil } from './curtain';
import { installBrowserGuards } from './guards';
import { coachTap } from './hints';
import { installBackButton } from './history';
import { introRunning } from './intro';
import { director } from './playback';
import { balloon, busy, frameScale, pressHighlight, run, screen, sheet, shown, speed } from './store';

interface Fit {
  scale: number;
  left: number;
  top: number;
  mode: FitMode;
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

/** Desktop keys, in play. Returns true when the key was used. */
function gameKey(e: KeyboardEvent): boolean {
  const s = run.value;
  if (!s || screen.value !== 'game' || introRunning()) return false;
  if (e.key === ' ' || e.key === 'Enter') {
    if (s.phase !== 'choose') return false;
    void sendNow();
    return true;
  }
  if (e.key === 's' || e.key === 'S') {
    swapNow();
    return true;
  }
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= 5) {
    balloon.value = n <= s.seats.length && balloon.value?.seat !== n - 1 ? { seat: n - 1 } : null;
    return true;
  }
  const b = balloon.value;
  if (b && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const to = b.seat + (e.key === 'ArrowLeft' ? -1 : 1);
    if (to >= 0 && to < s.seats.length) moveSeat(b.seat, to);
    return true;
  }
  return false;
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
      // No insets: a desktop window, or a phone browser whose toolbars already take the edges.
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
      if (e.repeat) return;
      if (e.key === 'Escape') {
        if (sheet.value) sheet.value = null;
        else if (balloon.value) balloon.value = null;
        else if (screen.value === 'game') {
          if (busy.value) director().skip();
          sheet.value = 'menu';
        }
        return;
      }
      if (sheet.value) return;
      if (busy.value) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          director().tapSkip(null);
        }
        return;
      }
      if (gameKey(e)) e.preventDefault();
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

  // In the background (another app, another tab) the game is saved and the war room falls silent.
  useEffect(() => {
    const onHide = () => {
      saveNow();
      audio.suspend();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        onHide();
        return;
      }
      audio.resume();
      droneFor(screen.value === 'game' && !introRunning() ? run.value : null);
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
    coachTap();
    if (busy.value && !sheet.value) {
      // During playback a tap never acts; it may skip ahead (the director guards the first moments).
      e.stopPropagation();
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      director().tapSkip({ x: ((e.clientX - r.left) / r.width) * FRAME_W, y: ((e.clientY - r.top) / r.height) * FRAME_H });
    }
  };

  // A tap that reaches the frame (nothing else claimed it) closes the balloon and the highlight.
  const onPointerDown = () => {
    balloon.value = null;
    pressHighlight.value = null;
  };

  const place = `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})`;
  const inGame = screen.value === 'game';
  const desk = fit.mode === 'desk';
  // From the title into a game, the title stays up as a curtain until the table has drawn.
  const cover = curtain.value;
  return (
    <div ref={root} class="war-root">
      <div ref={probe} class="inset-probe" aria-hidden="true" />
      {desk && <div class="war-bezel" style={{ transform: place }} aria-hidden="true" />}
      {!desk && inGame && fit.left > 0.5 && <Bleed fit={fit} />}
      <div
        class={`war-frame${desk ? ' desk' : fit.mode === 'browser' ? ' bare' : ''}`}
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
          {inGame && <div class={`quit-veil${veil.value ? ' on' : ''}`} aria-hidden="true" />}
        </div>
        <Sheets s={inGame ? run.value : null} />
      </div>
      {fit.sideways && (
        <div class="turn-upright" role="alert">
          <span>Turn your phone upright</span>
        </div>
      )}
    </div>
  );
}

/**
 * A phone browser a little wider than the frame: the Big Board, the rail and the console run on to
 * the window's edges, so the side gap reads as more of the same desk, not as black bars. While the
 * shop is up, the tray's linen runs on instead of the console.
 */
function Bleed({ fit }: { fit: Fit }): JSX.Element {
  const band = (y: number, h: number): JSX.CSSProperties => ({ top: `${fit.top + y * fit.scale}px`, height: `${h * fit.scale}px` });
  const tray = shown.value?.phase === 'shop';
  return (
    <div class="war-bleed" aria-hidden="true">
      <i class="bleed-board" style={band(47, 60)} />
      <i class="bleed-rail" style={band(107, 64)} />
      {tray ? (
        <i class="bleed-tray" style={{ top: `${fit.top + 451 * fit.scale}px`, bottom: 0 }} />
      ) : (
        <>
          <i class="bleed-trim" style={band(689, 2)} />
          <i class="bleed-readout" style={band(691, 48)} />
          <i class="bleed-controls" style={band(739, 68)} />
          <i class="bleed-home" style={{ top: `${fit.top + 807 * fit.scale}px`, bottom: 0 }} />
        </>
      )}
    </div>
  );
}
