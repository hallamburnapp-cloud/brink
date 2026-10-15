/**
 * The map controller: owns the canvas, bakes the layers, runs the recolouring and implements the
 * MapController contract.
 *
 * Rendering is on demand. A frame is drawn when the view changes or a change is running; while
 * changes run frames follow requestAnimationFrame; at rest, idle life (a CRISIS pulse, a glowing
 * target) ticks at a low frame rate, and nothing runs at all when there is none, the page is
 * hidden or motion is reduced.
 */
import type { CreateMapOptions, Heat, HeatStep, MapController, MapView, RegionId } from './contract';
import { MAP_H as H, MAP_W as W, REGION, REGIONS } from './data';
import { clamp01, MAP_FONTS, type Gfx } from './draw';
import { FxState, schedule } from './fx';
import { deviceClip, getGeometry, hitTest } from './geometry';
import { paintCrisisPulse, paintTransitions } from './layers/effects';
import { paintLand } from './layers/land';
import { paintMarks } from './layers/marks';
import { makeLayer, paintGlass, paintSea, type Layer } from './layers/static';

/** Time and scheduling, injectable so tests can freeze and step time. */
export interface Clock {
  now(): number;
  raf(cb: () => void): number;
  cancelRaf(id: number): void;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export const realClock: Clock = {
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(() => cb()),
  cancelRaf: (id) => cancelAnimationFrame(id),
  setTimeout: (cb, ms) => window.setTimeout(cb, ms),
  clearTimeout: (id) => window.clearTimeout(id),
};

export interface ControllerDeps {
  clock: Clock;
  /** Cap on device pixels per map point (memory: every layer is 390 x 400 at this scale). */
  maxScale: number;
}

/** Hooks for tests; not part of the contract. */
export interface MapDevHooks {
  renderNow(): void;
  stats(): { frames: number; bakes: number };
}

/** The static layers at a backing scale are shared: the title's map bakes them, the game's draws at once. */
interface StaticLayers {
  base: Layer;
  glass: Layer;
}
const staticLayers = new Map<number, StaticLayers>();

function staticAt(k: number): StaticLayers {
  const key = Math.round(k * 100);
  let l = staticLayers.get(key);
  if (!l) {
    const base = makeLayer(k);
    paintSea(base);
    const glass = makeLayer(k);
    paintGlass(glass);
    staticLayers.clear();
    l = { base, glass };
    staticLayers.set(key, l);
  }
  return l;
}

const IDLE_FPS = 12;
/** A heat that changes with no recolouring scheduled cross-fades over this long. */
const SNAP_FADE_MS = 160;
/** The ring and the targets of a new card fade in over this long. */
const ARRIVE_MS = 220;
export const RECOLOUR_MS = 600;

const EMPTY_VIEW: MapView = { heats: {}, ring: null, targets: [], home: '', pressed: null };

export function createMapController(canvas: HTMLCanvasElement, opts: CreateMapOptions, deps: ControllerDeps = { clock: realClock, maxScale: 4 }): MapController & MapDevHooks {
  const { clock } = deps;
  const ctx = canvas.getContext('2d')!;
  const fx = new FxState();
  const geo = getGeometry();

  let view: MapView = EMPTY_VIEW;
  let reduced = opts.reducedMotion;
  let destroyed = false;

  /** The heat each plate is baked at: the view's, or a change's result once it has settled. */
  const settled: Record<RegionId, Heat> = Object.fromEntries(REGIONS.map((r) => [r.id, 0 as Heat]));

  let k = 0;
  let scaleDirty = true;
  let base: Layer | null = null;
  let glass: Layer | null = null;
  let land: Layer | null = null;
  let landPrev: Layer | null = null;
  let landSig: string | null = null;
  let landFade = { start: 0, dur: 0 };
  let pendingFade = 0;
  let marksSince = -1e9;

  let rafId = 0;
  let idleTimer = 0;
  let fontsOk = false;
  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((r) => (readyResolve = r));
  const stats = { frames: 0, bakes: 0 };

  // ------------------------------------------------------------ sizing and layers

  function targetScale(): number {
    const rect = canvas.getBoundingClientRect();
    const cssScale = rect.width > 0 ? rect.width / W : 1;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.max(1, Math.min(deps.maxScale, dpr * cssScale));
  }

  function ensureScale(): void {
    if (!scaleDirty && base) return;
    scaleDirty = false;
    const next = targetScale();
    if (Math.abs(next - k) < 0.01 && base) return;
    k = next;
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    if (!canvas.style.width) canvas.style.width = `${W}px`;
    if (!canvas.style.height) canvas.style.height = `${H}px`;
    ({ base, glass } = staticAt(k));
    land = makeLayer(k);
    landPrev = makeLayer(k);
    landSig = null;
  }

  function signature(): string {
    let s = '';
    for (const r of REGIONS) s += settled[r.id];
    return s;
  }

  function changedPlates(before: string | null, after: string): RegionId[] | null {
    if (!before || before.length !== after.length) return null;
    const out: RegionId[] = [];
    for (let i = 0; i < after.length; i++) if (before[i] !== after[i]) out.push(REGIONS[i].id);
    return out;
  }

  function rebakeLand(sig: string, changed: RegionId[] | null, now: number): void {
    const fade = reduced ? 0 : pendingFade;
    if (fade > 0 && landSig) {
      const fading = now < landFade.start + landFade.dur;
      const p = clamp01((now - landFade.start) / (landFade.dur || 1));
      landPrev!.ctx.save();
      landPrev!.ctx.setTransform(1, 0, 0, 1, 0, 0);
      landPrev!.ctx.globalAlpha = fading ? p : 1;
      landPrev!.ctx.drawImage(land!.canvas, 0, 0);
      landPrev!.ctx.restore();
      landFade = { start: now, dur: fade };
    } else if (!(now < landFade.start + landFade.dur)) {
      landFade = { start: 0, dur: 0 };
    }
    const l = land!;
    if (fade === 0 && changed && changed.length <= 8) {
      // Only some plates changed: repaint inside their bounds, snapped to whole device pixels so no
      // anti-aliased clip edge blends the layers twice and leaves a seam.
      l.ctx.save();
      l.ctx.setTransform(1, 0, 0, 1, 0, 0);
      l.ctx.beginPath();
      for (const id of changed) {
        const r = deviceClip(geo.bounds[id], l.k, l.canvas.width, l.canvas.height);
        l.ctx.rect(r.x, r.y, r.w, r.h);
      }
      l.ctx.clip();
      l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      l.ctx.setTransform(l.k, 0, 0, l.k, 0, 0);
      paintLand(l, settled, base!);
      l.ctx.restore();
    } else {
      paintLand(l, settled, base!);
    }
    landSig = sig;
    stats.bakes++;
  }

  // ------------------------------------------------------------ frames

  function hasIdleLife(): boolean {
    if (reduced) return false;
    if (view.targets.length) return true;
    for (const id in settled) if (settled[id] === 2) return true;
    return false;
  }

  function frame(): void {
    rafId = 0;
    if (destroyed || !fontsOk) return;
    const now = clock.now();
    const busy = fx.prune(now, settled);
    ensureScale();
    const sig = signature();
    const changed = changedPlates(landSig, sig);
    if (!changed || changed.length) rebakeLand(sig, changed, now);
    pendingFade = 0;
    draw(now);
    stats.frames++;
    readyResolve?.();
    readyResolve = null;

    const fading = now < landFade.start + landFade.dur || now < marksSince + ARRIVE_MS;
    if (busy || fading) requestFrame();
    else if (hasIdleLife() && !documentHidden()) {
      idleTimer = clock.setTimeout(() => {
        idleTimer = 0;
        requestFrame();
      }, 1000 / IDLE_FPS);
    }
  }

  function draw(now: number): void {
    const g: Gfx = { ctx, k };
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const fadeP = landFade.dur > 0 ? clamp01((now - landFade.start) / landFade.dur) : 1;
    if (fadeP < 1) {
      ctx.drawImage(landPrev!.canvas, 0, 0, W, H);
      ctx.globalAlpha = fadeP;
      ctx.drawImage(land!.canvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(land!.canvas, 0, 0, W, H);
    }
    paintTransitions(g, fx.transitions, now);
    paintCrisisPulse(g, settled, now, reduced);
    paintMarks(g, view, { now, reduced, arrive: reduced ? 1 : clamp01((now - marksSince) / ARRIVE_MS) });
    ctx.drawImage(glass!.canvas, 0, 0, W, H);
  }

  function requestFrame(): void {
    if (destroyed || rafId) return;
    if (idleTimer) {
      clock.clearTimeout(idleTimer);
      idleTimer = 0;
    }
    rafId = clock.raf(frame);
  }

  function documentHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  /** A promise for an effect's end that also resolves while the page is hidden (no frames then). */
  function waitFor(end: number): Promise<void> {
    const p = fx.wait(end);
    clock.setTimeout(
      () => {
        fx.prune(clock.now(), settled);
        requestFrame();
      },
      Math.max(0, end - clock.now()) + 20,
    );
    requestFrame();
    return p;
  }

  // ------------------------------------------------------------ fonts, resize, visibility

  function onFontsReady(): void {
    if (destroyed || fontsOk) return;
    fontsOk = true;
    requestFrame();
  }
  function onFontsChanged(): void {
    if (!destroyed && fontsOk) requestFrame();
  }

  if (typeof document !== 'undefined' && document.fonts) {
    const fonts = document.fonts;
    const fallback = clock.setTimeout(onFontsReady, 2000);
    Promise.all(MAP_FONTS.map((f) => fonts.load(f).catch(() => [])))
      .then(() => fonts.ready)
      .then(() => {
        clock.clearTimeout(fallback);
        onFontsReady();
      })
      .catch(onFontsReady);
    fonts.addEventListener?.('loadingdone', onFontsChanged);
  } else {
    fontsOk = true;
  }

  const onResize = () => {
    scaleDirty = true;
    requestFrame();
  };
  const onVisibility = () => {
    if (!documentHidden()) requestFrame();
  };
  const onContextRestored = () => {
    base = null;
    k = 0;
    scaleDirty = true;
    requestFrame();
  };
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  resizeObserver?.observe(canvas);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('contextrestored', onContextRestored);

  // Build the hit mask after the first paint, off the critical path.
  clock.setTimeout(() => void geo.mask, 300);

  // ------------------------------------------------------------ the contract

  function update(next: MapView): void {
    if (destroyed) return;
    const now = clock.now();
    const prev = view;
    let fade = 0;
    let first = prev === EMPTY_VIEW;
    for (const r of REGIONS) {
      const h = next.heats[r.id];
      if (h === undefined || fx.pending(r.id)) continue;
      if (settled[r.id] !== h) {
        settled[r.id] = h;
        if (!first) fade = Math.max(fade, SNAP_FADE_MS);
      }
    }
    first = false;
    const ringChanged = prev.ring !== next.ring;
    const targetsChanged = prev.targets.length !== next.targets.length || prev.targets.some((t, i) => t.id !== next.targets[i]?.id);
    if ((ringChanged || targetsChanged) && (next.ring || next.targets.length)) marksSince = now;
    pendingFade = Math.max(pendingFade, fade);
    view = next;
    requestFrame();
  }

  function recolour(steps: HeatStep[], ms = RECOLOUR_MS): Promise<void> {
    const valid = steps.filter((s) => REGION[s.region]);
    if (!valid.length) return Promise.resolve();
    const now = clock.now();
    if (reduced) {
      for (const s of valid) settled[s.region] = s.to;
      requestFrame();
      return Promise.resolve();
    }
    const plan = schedule(valid.length, ms);
    valid.forEach((s, i) => fx.transitions.push({ ...s, source: s.source ?? null, start: now + plan[i].offset, dur: plan[i].dur, begun: false }));
    return waitFor(now + ms);
  }

  function preferred(): Set<RegionId> {
    return new Set(view.targets.map((t) => t.id));
  }

  const controller: MapController & MapDevHooks = {
    update,
    recolour,
    hit: (x, y) => hitTest(geo, x, y, preferred()),
    centre: (id) => {
      const r = REGION[id];
      return r ? { x: r.x, y: r.y } : { x: W / 2, y: H / 2 };
    },
    setReducedMotion(on) {
      reduced = on;
      requestFrame();
    },
    ready: () => readyPromise,
    destroy() {
      destroyed = true;
      if (rafId) clock.cancelRaf(rafId);
      if (idleTimer) clock.clearTimeout(idleTimer);
      fx.reset(settled);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('contextrestored', onContextRestored);
      document.fonts?.removeEventListener?.('loadingdone', onFontsChanged);
    },
    renderNow() {
      if (rafId) {
        clock.cancelRaf(rafId);
        rafId = 0;
      }
      fontsOk = true;
      frame();
    },
    stats: () => ({ ...stats }),
  };
  return controller;
}
