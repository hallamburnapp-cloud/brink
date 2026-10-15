/**
 * The map controller: owns the canvas, bakes the layers, runs the effect timeline and implements
 * the MapController contract.
 *
 * Rendering is on demand. A frame is drawn when the view or an effect changes; while effects run
 * frames follow requestAnimationFrame; at rest, idle life (gold's shimmer, war's pulse, breathing
 * sockets, the crisis ring, the teaching finger) ticks at a low frame rate, and nothing runs at all
 * when there is no idle life, the page is hidden or motion is reduced.
 */
import type { CreateMapOptions, MapController, MapView, Owner, RegionId } from './contract';
import { MAP_H as H, MAP_W as W, REGION, REGIONS, pairKey } from './data';
import { clamp01, MAP_FONTS, type Gfx } from './draw';
import { FxState } from './fx';
import { deviceClip, getGeometry, hitTest } from './geometry';
import {
  lightsLeft,
  lightsOutOrder,
  paintBlinks,
  paintBloom,
  paintFlashes,
  paintInk,
  paintLightsOut,
  paintLightUps,
  paintCease,
  paintPulses,
  paintScan,
  paintScanCursor,
  paintShimmer,
  paintShockwave,
  paintTravel,
  paintWarPulse,
  paintWave,
} from './layers/effects';
import { paintLand } from './layers/land';
import { paintMarkers } from './layers/markers';
import { paintHighlight, paintPreviews, paintWarNext } from './layers/preview';
import { paintRing } from './layers/ring';
import { makeLayer, paintGlass, paintSea, paintTerrain, type Layer } from './layers/static';
import { drawThread, joinCurve } from './layers/threads';
import { hex } from './palette';
import { atRest, buildScene, changedRegions, landSignature, type LandSignature, type Scene } from './scene';

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
  stats(): { frames: number; bakes: number; lastFrameMs: number; lastBakeMs: number };
}

/**
 * The layers that never change at a given backing scale (sea, terrain, glass) are shared by every
 * controller: the title's table bakes them, and the game's table, mounted next, draws at once.
 */
interface StaticLayers {
  base: Layer;
  terrain: Layer;
  glass: Layer;
}
const staticLayers = new Map<number, StaticLayers>();

function staticAt(k: number): StaticLayers {
  const key = Math.round(k * 100);
  let l = staticLayers.get(key);
  if (!l) {
    const base = makeLayer(k);
    paintSea(base);
    const terrain = makeLayer(k);
    paintTerrain(terrain);
    const glass = makeLayer(k);
    paintGlass(glass);
    // One scale at a time: a resize to a new scale drops the old bake.
    staticLayers.clear();
    l = { base, terrain, glass };
    staticLayers.set(key, l);
  }
  return l;
}

/** Idle frame rates: slow light (shimmer, pulses, breathing) and the quicker teaching finger. */
const IDLE_FPS = 15;
const FINGER_FPS = 30;
/** Regions that leave the deal fade out over this long (pins and dims change at once). */
const DARKEN_FADE_MS = 160;
/** An owner that changes with no ink running cross-fades over this long. */
const OWNER_FADE_MS = 120;
/** The world going to rest (the table clears) or a deal coming onto it: the free regions' tone eases over. */
const REST_FADE_MS = 260;
/** The war tag hopping to its next region, and its count stamping in. */
const TAG_HOP_MS = 300;
const TAG_STAMP_MS = 260;
/** The ring swelling to catch the score (120 ms out, 120 ms back). */
const RING_CATCH_MS = 240;
/** CEASEFIRE: the war's outlines flash, and its red fades to the ceased tone. */
const CEASE_MS = 900;

const EMPTY_VIEW: MapView = {
  regions: {},
  joinedPins: [],
  crisis: null,
  warNext: null,
  ceased: false,
  highlight: null,
  finger: null,
  hover: null,
};

export function createMapController(
  canvas: HTMLCanvasElement,
  opts: CreateMapOptions,
  deps: ControllerDeps = { clock: realClock, maxScale: 4 },
): MapController & MapDevHooks {
  const { clock } = deps;
  const ctx = canvas.getContext('2d')!;
  const fx = new FxState();
  const geo = getGeometry();

  let view: MapView = EMPTY_VIEW;
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
  /** The cross-fade the next land bake uses (an effect or the last update asked for it). */
  let pendingFade = 0;

  let rafId = 0;
  let idleTimer = 0;
  let fontsOk = false;
  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((r) => (readyResolve = r));
  let highlightSince = -1e9;
  /** Each region's owner before its last change, for an ink spread that follows the update. */
  const ownerWas = new Map<RegionId, Owner>();
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
    ({ base, terrain, glass } = staticAt(k));
    land = makeLayer(k);
    landPrev = makeLayer(k);
    landSig = null;
  }

  /** `changed`: the plates that changed, or null to repaint the whole land layer. */
  function rebakeLand(scene: Scene, sig: LandSignature, changed: RegionId[] | null, now: number): void {
    const t0 = performance.now();
    const fade = reduced ? Math.min(pendingFade, 120) : pendingFade;
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
      // Only some plates changed (a tap, a flash): repaint inside their bounds. The painter redraws
      // every layer in order there, so the result matches a full bake exactly: the clip is snapped
      // to whole device pixels (an anti-aliased clip edge would blend each translucent layer over
      // the old pixels twice, leaving hairline seams) and cleared before the repaint.
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
    if (scene.finger || scene.highlight || scene.warNext) return true;
    if (scene.ring && (scene.ring.collapse ?? 0) < 1) return true;
    return scene.list.some((r) => r.owner === 'gold' || (r.owner === 'red' && !scene.ceased) || r.live || r.preview);
  }

  function frame(): void {
    rafId = 0;
    if (destroyed || !fontsOk) return;
    const t0 = performance.now();
    const now = clock.now();
    const busy = fx.prune(now);
    ensureScale();
    const scene = buildScene(view, fx, now, reduced);
    const sig = landSignature(scene);
    const changed = changedRegions(landSig, sig);
    if (!changed || changed.length) rebakeLand(scene, sig, changed, now);
    // A fade applies to the next bake only.
    pendingFade = 0;
    draw(scene, now);
    stats.frames++;
    stats.lastFrameMs = performance.now() - t0;
    readyResolve?.();
    readyResolve = null;

    const fading = now < landFade.start + landFade.dur || now < highlightSince + 160;
    if (busy || fading) requestFrame();
    else if (hasIdleLife(scene) && !documentHidden()) {
      idleTimer = clock.setTimeout(
        () => {
          idleTimer = 0;
          requestFrame();
        },
        1000 / (scene.finger ? FINGER_FPS : IDLE_FPS),
      );
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

    paintShimmer(g, scene);
    paintWarPulse(g, scene);
    paintLightUps(g, scene);
    paintInk(g, scene, fx);
    paintWave(g, scene, fx);
    paintPreviews(g, scene);
    paintWarNext(g, scene);
    paintLightsOut(g, scene, fx);
    paintCease(g, scene, fx);
    // Over lights out: the WAR card's near miss (the free regions that were left) is outlined gold.
    paintHighlight(g, scene, reduced ? 1 : clamp01((now - highlightSince) / 150), !!fx.lightsOut);
    paintTravel(g, scene, fx);
    paintFlashes(g, scene, fx);
    paintBlinks(g, scene, fx, speed);
    // Once the score is in the ring (the outcome plays), the pin threads step back to 35% so only
    // the gold paths a win travels along are bright.
    const threadA = view.outcome ? 0.35 : 1;
    for (const t of scene.threads) {
      // Snap taut: a slack thread overshoots and settles (a damped wobble over 420 ms).
      const sag = t.snap >= 1 ? 0 : 7 * Math.exp(-5 * t.snap) * Math.cos(t.snap * 15);
      drawThread(g, joinCurve(t.a, t.b, sag), t.kind, threadA * Math.min(scene.regions[t.a].dimNow, scene.regions[t.b].dimNow));
    }
    paintPulses(g, scene, fx);
    if (scene.ring) {
      const out = fx.lightsOut ? clamp01((now - fx.lightsOut.start) / fx.lightsOut.dur) : 0;
      paintRing(g, scene.ring, now, reduced, 1 - out);
    }
    paintScan(g, scene, fx);
    paintShockwave(g, scene, fx);

    for (const r of scene.list) r.dimNow *= (scene.highlight?.has(r.id) ? 1 : lightsLeft(fx, r.id, now)) * r.warm;
    paintMarkers(g, scene, {
      pinDrop: (id) => {
        const t = fx.pinDrops.get(id);
        return t === undefined ? null : clamp01((now - t) / 120);
      },
    });
    paintBloom(g, scene, fx);
    ctx.drawImage(glass!.canvas, 0, 0, W, H);
    paintScanCursor(g, fx);
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

  /** A face arrived later: every label is drawn each frame, so the next frame picks it up. */
  function onFontsChanged(): void {
    if (destroyed || !fontsOk) return;
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

  function inkRunsOn(id: RegionId): boolean {
    return fx.inks.some((i) => i.targets.includes(id));
  }

  function update(next: MapView): void {
    if (destroyed) return;
    const now = clock.now();
    const prev = view;
    let fade = 0;
    for (const r of REGIONS) {
      const a = prev.regions[r.id];
      const b = next.regions[r.id];
      if (!b) continue;
      if (!reduced && b.pinned && !a?.pinned) fx.pinDrops.set(r.id, now);
      if (a?.lit && !b.lit) fade = Math.max(fade, DARKEN_FADE_MS);
      if (a && a.owner !== b.owner) {
        ownerWas.set(r.id, a.owner);
        if (!inkRunsOn(r.id) && fx.ownerOverride.get(r.id)?.owner !== b.owner) fade = Math.max(fade, OWNER_FADE_MS);
      }
      const o = fx.ownerOverride.get(r.id);
      if (o && b.owner !== o.before) fx.ownerOverride.delete(r.id);
    }
    if (!reduced) {
      const had = new Set(prev.joinedPins.map(([a, b]) => pairKey(a, b)));
      for (const [a, b] of next.joinedPins) {
        const key = pairKey(a, b);
        if (!had.has(key)) fx.joinSnaps.set(key, now);
      }
    }
    // A new crisis (or none) brings the ring back after a collapse.
    if (fx.ringCollapse && next.crisis?.id !== fx.ringCollapse.crisis) fx.ringCollapse = null;
    if (fx.ringCatch && next.crisis?.id !== fx.ringCatch.crisis) fx.ringCatch = null;
    // The table clearing to the plain world, or a deal coming onto it: the free regions ease over.
    if (atRest(prev) !== atRest(next) && prev !== EMPTY_VIEW) fade = Math.max(fade, REST_FADE_MS);
    // The war tag hops to its next region; a new count on the same region stamps in.
    const tag = prev.warNext;
    const nextTag = next.warNext;
    if (!reduced && tag && nextTag) {
      if (tag.id !== nextTag.id) fx.tagHop = { from: tag.id, to: nextTag.id, start: now, dur: TAG_HOP_MS / speed };
      else if (tag.turns !== nextTag.turns || !!tag.between !== !!nextTag.between) fx.tagStamp = { start: now, dur: TAG_STAMP_MS / speed };
    }
    // CEASEFIRE: red fades to its ceased tone (the land layer) as its outlines flash.
    if (!prev.ceased && next.ceased && prev !== EMPTY_VIEW) {
      fade = Math.max(fade, reduced ? 120 : 600 / speed);
      if (!reduced) fx.cease = { start: now, dur: CEASE_MS / speed };
    }
    if (!prev.highlight && next.highlight) highlightSince = now;
    pendingFade = Math.max(pendingFade, fade);
    view = next;
    requestFrame();
  }

  /** The regions a tap prefers: lit and pinned ones. */
  function preferred(): Set<RegionId> {
    const out = new Set<RegionId>();
    for (const [id, r] of Object.entries(view.regions)) if (r.lit || r.pinned) out.add(id);
    return out;
  }

  function ms(d: number | undefined, fallback: number): number {
    return (d ?? fallback) / speed;
  }

  function displayedOwner(id: RegionId): Owner {
    const now = clock.now();
    for (const ink of fx.inks) if (ink.targets.includes(id) && now < ink.start + ink.dur) return ink.before.get(id) ?? 'grey';
    return fx.ownerOverride.get(id)?.owner ?? view.regions[id]?.owner ?? 'grey';
  }

  const controller: MapController & MapDevHooks = {
    update,
    hit: (x, y) => hitTest(geo, x, y, preferred()),
    pinPos: (id) => {
      const r = REGION[id];
      return r ? { x: r.x, y: r.y } : { x: W / 2, y: H / 2 };
    },
    lightUp(ids, gapMs, delayMs = 0) {
      if (reduced) return;
      const now = clock.now() + delayMs / speed;
      const gap = gapMs / speed;
      ids.forEach((id, i) => fx.lightUps.set(id, { id, start: now + i * gap, dur: 150 / speed }));
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
        if (!same) fx.scored.clear();
        fx.scoring = next;
        pendingFade = Math.max(pendingFade, dur);
        requestFrame();
      },
      scanTo(x) {
        fx.scanX = x;
        fx.scanJumpAt = clock.now();
        requestFrame();
      },
      flash(id) {
        if (!REGION[id]) return;
        if (!reduced) fx.flashes.push({ id, start: clock.now(), dur: 200 / speed });
        fx.scored.add(id);
        // Reduced motion: no white flash, the plate cross-fades to its held light in place.
        if (reduced) pendingFade = Math.max(pendingFade, 120);
        requestFrame();
      },
      pulseThread(from, to, d) {
        if (reduced || !REGION[from] || !REGION[to]) return;
        fx.pulses.push({ from, to, start: clock.now(), dur: ms(d, 100) });
        requestFrame();
      },
      ringStamp() {
        if (!reduced) fx.ringStamp = { start: clock.now(), dur: 300 / speed };
        requestFrame();
      },
      ringCollapse(d) {
        const crisis = view.crisis?.id;
        if (!crisis) return Promise.resolve();
        const now = clock.now();
        const dur = reduced ? 0 : ms(d, 300);
        fx.ringCollapse = { start: now, dur, crisis };
        return waitFor(now + dur);
      },
      shockwave(from, d) {
        if (reduced || !REGION[from]) return Promise.resolve();
        const now = clock.now();
        fx.shock = { from, start: now, dur: ms(d, 600) };
        return waitFor(now + fx.shock.dur);
      },
      travel(path, colour, msPerStep) {
        const steps = path.filter((id) => REGION[id]);
        if (reduced || steps.length < 2) return Promise.resolve();
        const now = clock.now();
        const stepMs = ms(msPerStep, 150);
        const dur = stepMs * (steps.length - 1);
        fx.travels.push({ path: steps, colour, stepMs, start: now, dur });
        return waitFor(now + dur);
      },
      inkSpread(source, targets, colour, d) {
        const ids = targets.filter((id) => REGION[id]);
        if (!REGION[source] || !ids.length) return Promise.resolve();
        const now = clock.now();
        const before = new Map<RegionId, Owner>();
        for (const id of ids) {
          const shown = displayedOwner(id);
          // The view may already carry the new owner (the update came first): ink from the old one.
          before.set(id, shown === colour ? (ownerWas.get(id) ?? shown) : shown);
        }
        // Once the ink has run, its owner stays until the view catches up (or moves on).
        const settle = () => {
          for (const id of ids) {
            const cur = view.regions[id]?.owner ?? 'grey';
            if (cur !== colour) fx.ownerOverride.set(id, { owner: colour, before: cur });
          }
        };
        if (reduced) {
          // No spreading: the plates take the new owner in place (a 120 ms cross-fade).
          settle();
          pendingFade = Math.max(pendingFade, 120);
          requestFrame();
          return Promise.resolve();
        }
        const dur = ms(d, 600);
        fx.inks.push({ source, targets: ids, owner: colour, before, start: now, dur });
        return waitFor(now + dur).then(() => {
          settle();
          requestFrame();
        });
      },
      bloom(from, colour, d) {
        if (reduced) return;
        const r = REGION[from];
        fx.bloom = { rgb: hex(colour), x: r?.x ?? W / 2, y: r?.y ?? H / 2, start: clock.now(), dur: ms(d, 600) };
        requestFrame();
      },
      wave(from, colour, d) {
        if (reduced || !REGION[from]) return Promise.resolve();
        const now = clock.now();
        const dur = ms(d, 1200);
        fx.waves.push({ from, colour, start: now, dur });
        return waitFor(now + dur);
      },
      ringCatch(win) {
        const crisis = view.crisis?.id;
        if (!crisis) return;
        fx.ringCatch = { crisis, win, start: clock.now(), dur: reduced ? 0 : RING_CATCH_MS / speed };
        requestFrame();
      },
      lightsOut(d, keep = []) {
        const now = clock.now();
        const dur = reduced ? 300 / speed : ms(d, 2000);
        const kept = new Set(keep);
        const grey = REGIONS.filter((r) => displayedOwner(r.id) === 'grey' && !kept.has(r.id)).map((r) => r.id);
        const at = reduced ? new Map(grey.map((id) => [id, 0])) : lightsOutOrder(grey, lightsSeed++);
        fx.lightsOut = { at, start: now, dur };
        return waitFor(now + dur + (reduced ? 0 : 150));
      },
      crossFade(d) {
        pendingFade = Math.max(pendingFade, reduced ? Math.min(d, 120) : d / speed);
        requestFrame();
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
    ready: () => readyPromise,
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
    stats: () => ({ ...stats }),
  };
  return controller;
}

function clampSpeed(s: number): number {
  return Number.isFinite(s) && s > 0 ? Math.min(8, Math.max(0.25, s)) : 1;
}
