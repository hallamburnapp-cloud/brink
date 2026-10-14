/**
 * The map controller: owns the canvas, bakes the layers, runs the effect timeline and implements
 * the MapController contract.
 *
 * Rendering is on demand. A frame is drawn when the view or an effect changes; while effects run
 * frames follow requestAnimationFrame; at rest, idle life (breathing lit pins, the pulsing
 * flashpoint ring, the first-night finger) ticks at a low frame rate, and nothing runs at all when
 * there is no idle life, the page is hidden or motion is reduced.
 */
import type { Colour, CreateMapOptions, MapView, RegionId } from './contract';
import { MAP_H as H, MAP_W as W, REGION, REGIONS, pairKey } from './data';
import { clamp01, MAP_FONTS, type Gfx } from './draw';
import type { MapControllerPlus, MapViewPlus } from './extensions';
import { FxState, progress } from './fx';
import { getGeometry, hitTest } from './geometry';
import { paintLand } from './layers/land';
import { paintFinger, paintMarkers } from './layers/markers';
import {
  lightsLeft,
  paintBlinks,
  paintCableDrag,
  paintFlashes,
  paintFlashpoint,
  paintInk,
  paintLightsOut,
  paintLiveThreads,
  paintMapFlash,
  paintPops,
  paintPulses,
  paintRinged,
  paintScan,
  paintScanCursor,
  paintShockwave,
  paintStampPulses,
  paintStandby,
  paintTargets,
  scanXAt,
} from './layers/overlays';
import { makeLayer, paintGlass, paintSea, paintTerrain, type Layer } from './layers/static';
import { joinCurve, pointOn } from './layers/threads';
import { hex } from './palette';
import { mulberry32 } from './rand';
import { buildScene, changedRegions, landSignature, type LandSignature, type Scene } from './scene';

/** Time and scheduling, injectable so the dev harness can freeze and step time. */
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
  /** Cap on device pixels per map point (memory: every layer is 390 x 520 at this scale). */
  maxScale: number;
}

/** Hooks for the dev harness and tests; not part of the contract. */
export interface MapDevHooks {
  /** Draw a frame now, at the clock's current time. */
  renderNow(): void;
  /** Resolves once fonts are ready and the first full frame is drawn. */
  ready(): Promise<void>;
  stats(): { frames: number; bakes: number; lastFrameMs: number; lastBakeMs: number };
}

const IDLE_FPS = 15;
const FINGER_FPS = 30;
/** Crossfade when the view changes the land (a region lighting up or going spent). */
const VIEW_FADE_MS = 160;

const EMPTY_VIEW: MapViewPlus = {
  regions: {},
  threads: [],
  cables: [],
  joinedPins: [],
  flashpoint: null,
  ring: 0,
  gridlock: false,
  ferry: false,
  blackout: null,
  armed: null,
  highlight: null,
  finger: null,
};

export function createMapController(
  canvas: HTMLCanvasElement,
  opts: CreateMapOptions,
  deps: ControllerDeps = { clock: realClock, maxScale: 3 },
): MapControllerPlus & MapDevHooks {
  const { clock } = deps;
  const ctx = canvas.getContext('2d')!;
  const fx = new FxState();
  const geo = getGeometry();

  let view: MapViewPlus = EMPTY_VIEW;
  let speed = clampSpeed(opts.speed ?? 1);
  let reduced = opts.reducedMotion;
  let destroyed = false;

  let k = 0;
  /** Recompute the backing scale (reads layout) only after a resize, never every frame. */
  let scaleDirty = true;
  let base: Layer | null = null;
  let terrain: Layer | null = null;
  let glass: Layer | null = null;
  let land: Layer | null = null;
  let landPrev: Layer | null = null;
  let landSig: LandSignature | null = null;
  let landFade = { start: 0, dur: 0 };
  let pendingFade: number | null = null;

  let rafId = 0;
  let idleTimer = 0;
  let fontsOk = false;
  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((r) => (readyResolve = r));
  let targetsSince = -1e9;
  /** Each region's colour before its last change, for an ink spread that follows the update. */
  const colourWas = new Map<RegionId, Colour>();
  let lightsSeed = 1;
  const stats = { frames: 0, bakes: 0, lastFrameMs: 0, lastBakeMs: 0 };

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
    base = makeLayer(k);
    paintSea(base);
    terrain = makeLayer(k);
    paintTerrain(terrain);
    glass = makeLayer(k);
    paintGlass(glass);
    land = makeLayer(k);
    landPrev = makeLayer(k);
    landSig = null;
  }

  /** `changed`: the plates that changed, or null to repaint the whole land layer. */
  function rebakeLand(scene: Scene, sig: LandSignature, changed: RegionId[] | null, now: number): void {
    const t0 = performance.now();
    const fade = pendingFade ?? (reduced ? 120 : VIEW_FADE_MS);
    if (fade > 0 && landSig) {
      // Keep what is on screen (mid-fade included) as the layer to fade from.
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
      // Only some plates changed (a flash, a stamp): repaint inside their bounds. The painter
      // redraws every layer in order there, so the result matches a full bake exactly.
      l.ctx.save();
      l.ctx.beginPath();
      for (const id of changed) {
        const b = geo.bounds[id];
        l.ctx.rect(b.x0 - 4, b.y0 - 4, b.x1 - b.x0 + 8, b.y1 - b.y0 + 8);
      }
      l.ctx.clip();
      paintLand(l, scene, { base: base!, terrain: terrain! });
      l.ctx.restore();
    } else {
      paintLand(l, scene, { base: base!, terrain: terrain! });
    }
    landSig = sig;
    stats.bakes++;
    stats.lastBakeMs = performance.now() - t0;
  }

  // ------------------------------------------------------------ frames

  function hasIdleLife(scene: Scene): boolean {
    if (reduced) return false;
    if (scene.finger || scene.armed || scene.highlight || scene.ringed) return true;
    if (scene.flashpoint && !scene.cooled && scene.ring > 0) return true;
    return scene.list.some((r) => r.status === 'lit' && !r.pinned);
  }

  function frame(): void {
    rafId = 0;
    if (destroyed) return;
    if (!fontsOk) return;
    const t0 = performance.now();
    const now = clock.now();
    const busy = fx.prune(now);
    ensureScale();
    const scene = buildScene(view, fx, now, reduced);
    const sig = landSignature(scene);
    const changed = changedRegions(landSig, sig);
    if (!changed || changed.length) rebakeLand(scene, sig, changed, now);
    // A fade requested by an effect applies to this frame's bake only.
    pendingFade = null;
    draw(scene, now);
    stats.frames++;
    stats.lastFrameMs = performance.now() - t0;
    readyResolve?.();
    readyResolve = null;

    const fading = now < landFade.start + landFade.dur || now < targetsSince + 160;
    if (busy || fading) requestFrame();
    else if (hasIdleLife(scene) && !documentHidden()) {
      idleTimer = clock.setTimeout(() => {
        idleTimer = 0;
        requestFrame();
      }, 1000 / (scene.finger ? FINGER_FPS : IDLE_FPS));
    }
  }

  function draw(scene: Scene, now: number): void {
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

    const targetsIn = reduced ? 1 : clamp01((now - targetsSince) / 150);
    paintTargets(g, scene, targetsIn);
    paintLightsOut(g, scene, fx);
    paintInk(g, scene, fx);
    paintFlashes(g, scene, fx);
    paintBlinks(g, scene, fx, speed);
    paintStandby(g, scene, fx);
    paintRinged(g, scene);
    paintLiveThreads(g, scene);
    paintPulses(g, scene, fx);
    paintFlashpoint(g, scene, fx);
    paintScan(g, scene, fx);
    paintStampPulses(g, scene, fx);
    paintShockwave(g, scene, fx);
    paintCableDrag(g, scene);

    if (fx.lightsOut) for (const r of scene.list) r.dimNow *= lightsLeft(fx, r.id, now);
    paintMarkers(g, scene, {
      pinDrop: (id) => {
        const t = fx.pinDrops.get(id);
        return t === undefined ? null : clamp01((now - t) / 120);
      },
      brassDrop: (id) => {
        const d = fx.drops.find((e) => e.id === id);
        return d ? progress(d, now) : null;
      },
    });
    if (scene.finger) {
      const f = REGION[scene.finger];
      if (f) paintFinger(g, f.x, f.y, now, reduced);
    }
    paintPops(g, scene, fx);
    paintMapFlash(g, scene, fx);
    ctx.drawImage(glass!.canvas, 0, 0, W, H);
    paintScanCursor(g, scene, fx);
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
        fx.prune(clock.now());
        requestFrame();
      },
      Math.max(0, end - clock.now()) + 20,
    );
    requestFrame();
    return p;
  }

  // ------------------------------------------------------------ fonts, resize, visibility

  /** First full draw waits for the map's faces (or 2 s, then draws with fallbacks). */
  function onFontsReady(): void {
    if (destroyed || fontsOk) return;
    fontsOk = true;
    onFontsChanged();
  }

  /** A face arrived later: the baked bearing strip has text, the rest is drawn each frame. */
  function onFontsChanged(): void {
    if (destroyed || !fontsOk) return;
    if (glass) {
      glass = makeLayer(k);
      paintGlass(glass);
    }
    requestFrame();
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
    // Measured on the next frame, after the page has applied its own resize handling.
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

  function currentRing(now: number): number {
    return fx.ring ? fx.ring.from + (fx.ring.to - fx.ring.from) * progress(fx.ring, now) : view.ring;
  }

  function update(next: MapViewPlus): void {
    if (destroyed) return;
    const now = clock.now();
    const prev = view;
    for (const r of REGIONS) {
      const a = prev.regions[r.id];
      const b = next.regions[r.id];
      if (!b) continue;
      if (!reduced && (b.pinned || b.airlift) && !(a?.pinned || a?.airlift)) fx.pinDrops.set(r.id, now);
      if (a && a.colour !== b.colour) colourWas.set(r.id, a.colour);
      const o = fx.colourOverride.get(r.id);
      if (o && b.colour !== o.before) fx.colourOverride.delete(r.id);
    }
    if (!reduced) {
      const had = new Set(prev.joinedPins.map(([a, b]) => pairKey(a, b)));
      for (const [a, b] of next.joinedPins) {
        const key = pairKey(a, b);
        if (!had.has(key)) fx.joinSnaps.set(key, now);
      }
    }
    // The flashpoint ring shrinks with the total (300 ms) and collapses on a clear; a new crisis resets it at once.
    const shown = currentRing(now);
    if (next.flashpoint === prev.flashpoint && next.ring < shown - 1e-4 && !reduced) {
      fx.ring = { start: now, dur: 300 / speed, from: shown, to: next.ring };
    } else if (next.flashpoint !== prev.flashpoint || next.ring > shown) {
      fx.ring = null;
    }
    const hadTargets = !!(prev.armed || prev.highlight);
    if (!hadTargets && (next.armed || next.highlight)) targetsSince = now;
    view = next;
    requestFrame();
  }

  function preferred(): Set<RegionId> {
    if (view.armed) return new Set([...view.armed.valid, ...view.armed.chosen]);
    const out = new Set<RegionId>();
    for (const [id, r] of Object.entries(view.regions)) if (r.status === 'lit' || r.pinned || r.airlift) out.add(id);
    return out;
  }

  function ms(d: number | undefined, fallback: number): number {
    return (d ?? fallback) / speed;
  }

  function addPop(text: string, tone: 'influence' | 'momentum' | 'again', x: number, y: number, start: number, dur: number) {
    fx.pops.push({ text, tone, x, y, start, dur });
  }

  const controller: MapControllerPlus & MapDevHooks = {
    update,
    hit: (x, y) => hitTest(geo, x, y, preferred()),
    pinPos: (id) => {
      const r = REGION[id];
      return r ? { x: r.x, y: r.y } : { x: W / 2, y: H / 2 };
    },
    pulseThreadAmount(from, to, amount, d) {
      const now = clock.now();
      const dur = ms(d, 100);
      if (!reduced) fx.pulses.push({ from, to, start: now, dur });
      const traffic = view.threads.find((t) => pairKey(t.a, t.b) === pairKey(from, to))?.traffic ?? 0;
      const n = amount ?? traffic;
      if (n > 0) {
        const kind = view.cables.some(([a, b]) => pairKey(a, b) === pairKey(from, to)) ? 'cable' : 'land';
        const c = joinCurve(from, to, kind);
        const [px, py] = pointOn(c, 0.55);
        // Beside the thread, on the side away from the scoring cluster, so pops never pile up on it.
        const pins = [...(fx.scoring ?? [from, to])].map((id) => REGION[id]);
        const cx = pins.reduce((t, r) => t + r.x, 0) / pins.length;
        const cy = pins.reduce((t, r) => t + r.y, 0) / pins.length;
        const len = Math.hypot(c.bx - c.ax, c.by - c.ay) || 1;
        let nx = -(c.by - c.ay) / len;
        let ny = (c.bx - c.ax) / len;
        if (nx * (px - cx) + ny * (py - cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        addPop(`+${n}`, 'influence', px + nx * 10, py + ny * 9, now + dur * 0.6, 440 / speed);
      }
      requestFrame();
    },
    fx: {
      dimExcept(ids, d) {
        const now = clock.now();
        const scene = buildScene(view, fx, now, reduced);
        fx.dimFrom = new Map(scene.list.map((r) => [r.id, r.dimNow]));
        const dur = reduced ? 0 : ms(d, 150);
        fx.dimTween = { start: now, dur };
        const was = fx.scoring;
        const next = ids ? new Set(ids) : null;
        const same = !!was && !!next && was.size === next.size && [...next].every((id) => was.has(id));
        if (!same) {
          fx.scored.clear();
          fx.lastFlashed = null;
        }
        fx.scoring = next;
        fx.liveGrow = next ? { start: now + (reduced ? 0 : 150 / speed), dur: reduced ? 0 : 200 / speed } : null;
        pendingFade = dur;
        requestFrame();
      },
      scanTo(x) {
        fx.scanX = x;
        fx.scanSnap = null;
        fx.scanJumpAt = clock.now();
        requestFrame();
      },
      scanAgain(x) {
        const now = clock.now();
        const from = scanXAt(fx, now);
        fx.scanX = x;
        fx.scanJumpAt = now;
        fx.scanSnap = reduced ? null : { start: now, dur: 80 / speed, from: from !== null && from !== x ? from : x - 26, to: x };
        // The AGAIN tag sits above the pin being scored again.
        const id =
          fx.lastFlashed && REGION[fx.lastFlashed].x === x
            ? fx.lastFlashed
            : [...(fx.scoring ?? [])].sort((a, b) => Math.abs(REGION[a].x - x) - Math.abs(REGION[b].x - x))[0];
        const r = id ? REGION[id] : null;
        addPop('AGAIN', 'again', r ? r.x : x, r ? r.y - 18 : 30, now, 640 / speed);
        requestFrame();
      },
      flash(id) {
        const now = clock.now();
        if (!reduced) fx.flashes.push({ id, start: now, dur: 200 / speed });
        fx.scored.add(id);
        fx.lastFlashed = id;
        // Reduced motion: no white flash, the plate cross-fades to its scored tone in place.
        pendingFade = reduced ? 120 : 0;
        requestFrame();
      },
      pulseThread(from, to, d) {
        controller.pulseThreadAmount(from, to, null, d);
      },
      stampPulse(id) {
        const now = clock.now();
        fx.stampPulses.push({ id, start: now, dur: 360 / speed });
        const stamp = view.regions[id]?.stamp;
        const r = REGION[id];
        if (stamp === 'FORTIFY') addPop('+20', 'influence', r.x, r.y - 19, now, 600 / speed);
        if (stamp === 'RELAY') addPop('×1.5', 'momentum', r.x, r.y - 19, now, 600 / speed);
        requestFrame();
      },
      standbyPulse(id) {
        fx.standby.push({ id, start: clock.now(), dur: 200 / speed });
        requestFrame();
      },
      heat(on) {
        if (fx.heatOn === on) return;
        fx.heatOn = on;
        fx.heatTween = { start: clock.now(), dur: 150 / speed };
        requestFrame();
      },
      mapFlash(colour, d) {
        if (reduced) return;
        fx.mapFlash = { rgb: hex(colour), start: clock.now(), dur: ms(d, 600) };
        requestFrame();
      },
      shockwave(from, d) {
        if (reduced) return Promise.resolve();
        const now = clock.now();
        fx.shock = { from, start: now, dur: ms(d, 600) };
        return waitFor(now + fx.shock.dur);
      },
      dropBrass(id) {
        if (reduced) {
          requestFrame();
          return Promise.resolve();
        }
        const now = clock.now();
        const dur = 310 / speed;
        fx.drops.push({ id, start: now, dur });
        return waitFor(now + dur);
      },
      lightsOut(d) {
        const now = clock.now();
        const dur = reduced ? 300 / speed : ms(d, 2000);
        const rnd = mulberry32(0x5eed + lightsSeed++);
        const order = REGIONS.map((r) => ({ id: r.id, k: rnd() })).sort((a, b) => a.k - b.k);
        const at = new Map(order.map((o, i) => [o.id, reduced ? 0 : (i / order.length) * 0.93]));
        fx.lightsOut = { at, start: now, dur };
        return waitFor(now + dur + (reduced ? 0 : 150));
      },
      inkSpread(source, targets, d) {
        const now = clock.now();
        const colour = fx.colourOverride.get(source)?.colour ?? view.regions[source]?.colour ?? REGION[source].colour;
        const before = new Map<RegionId, Colour>();
        for (const id of targets) {
          const cur = view.regions[id]?.colour ?? REGION[id].colour;
          before.set(id, cur === colour ? (colourWas.get(id) ?? cur) : cur);
        }
        const settle = () => {
          for (const [id, was] of before) {
            const cur = view.regions[id]?.colour ?? REGION[id].colour;
            if (cur !== colour) fx.colourOverride.set(id, { colour, before: was });
          }
        };
        if (reduced) {
          // No spreading: the plates take the new colour in place (a 120 ms cross-fade).
          settle();
          pendingFade = 120;
          requestFrame();
          return Promise.resolve();
        }
        const dur = ms(d, 600);
        fx.inks.push({ source, targets: [...targets], colour, before, start: now, dur });
        return waitFor(now + dur).then(() => {
          settle();
          pendingFade = 0;
          requestFrame();
        });
      },
      reset() {
        fx.reset();
        pendingFade = 0;
        requestFrame();
      },
    },
    setSpeed(s) {
      speed = clampSpeed(s);
    },
    setReducedMotion(on) {
      reduced = on;
      requestFrame();
    },
    destroy() {
      destroyed = true;
      if (rafId) clock.cancelRaf(rafId);
      if (idleTimer) clock.clearTimeout(idleTimer);
      fx.reset();
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
    ready: () => readyPromise,
    stats: () => ({ ...stats }),
  };
  return controller;
}

function clampSpeed(s: number): number {
  return Number.isFinite(s) && s > 0 ? Math.min(8, Math.max(0.25, s)) : 1;
}

export type { MapView };
