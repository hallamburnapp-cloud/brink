/**
 * The scene: what to draw at time `now`, derived from the last MapView and the effect timeline.
 * Pure (no DOM). Painters read only this.
 */
import type { Colour, MapView, RegionId, RegionStatus, Stamp } from './contract';
import { LAND_JOINS, REGION, REGIONS, SEA_LANES, pairKey, type MapRegion } from './data';
import { clamp01, easeOut, lerp } from './draw';
import type { MapViewExtras, MapViewPlus } from './extensions';
import { progress, tweenAt, type FxState } from './fx';
import type { FillState } from './palette';

export type JoinKind = 'land' | 'lane' | 'cable' | 'ferry';

export interface RegionVis {
  id: RegionId;
  def: MapRegion;
  /** Colour as drawn (the view's, or an ink spread's while it runs). */
  colour: Colour;
  status: RegionStatus;
  pinned: boolean;
  airlift: boolean;
  capital: boolean;
  port: boolean;
  stamp: Stamp;
  brass: number;
  glow: number;
  fill: FillState;
  /** Dim the land layer is baked at (1 = full light; spec 9 fades the rest to 30%). */
  dim: number;
  /** Dim right now, mid-transition (markers and overlays). */
  dimNow: number;
  /** Pinned but not scoring: a grey pin. */
  loose: boolean;
  /** 1-based sweep order badge, or null. */
  order: number | null;
  /** The badge turns to linen once the pin has scored. */
  orderDone: boolean;
  /** Its colour is blacked out (Summit BLACKOUT). */
  blackout: boolean;
  /** Lighting up on a deal: 0 just lit, 1 fully warm (1 for everything else). */
  warm: number;
  /** Lit, unpinned, and a pin here would join the pins already down. */
  joinable: boolean;
}

export interface ThreadVis {
  a: RegionId;
  b: RegionId;
  traffic: number;
  kind: JoinKind;
}

export interface LiveThread extends ThreadVis {
  width: number;
  /** A loose end: drawn thin and grey. */
  grey: boolean;
  /** HEAT, 0..1 (crossfades over 150 ms). */
  hot: number;
  /** Snap-taut progress for a join that just formed, 0..1 (1 = settled). */
  snap: number;
}

export interface Scene {
  now: number;
  reduced: boolean;
  regions: Record<RegionId, RegionVis>;
  list: RegionVis[];
  /** A sweep is playing (dimExcept with ids): the sea veil and quieter coasts. */
  sweeping: boolean;
  oldThreads: ThreadVis[];
  live: LiveThread[];
  cables: Array<[RegionId, RegionId]>;
  cableKeys: Set<string>;
  gridlock: boolean;
  ferry: boolean;
  blackout: Colour | null;
  flashpoint: RegionId | null;
  /** Ring radius factor right now (animated). */
  ring: number;
  /** The crisis is cleared and the collapse has finished: the cooled ring shows. */
  cooled: boolean;
  /** The clear's collapse, 0..1, while it plays (null otherwise). */
  collapse: number | null;
  /** The flashpoint has been swept (its ring dims: it cannot score again this crisis). */
  flashpointSpent: boolean;
  armed: MapView['armed'];
  highlight: Set<RegionId> | null;
  finger: RegionId | null;
  ringed: RegionId | null;
  cableDrag: MapViewExtras['cableDrag'];
}

const STATIC_KIND = new Map<string, JoinKind>();
for (const [a, b] of LAND_JOINS) STATIC_KIND.set(pairKey(a, b), 'land');
for (const [a, b] of SEA_LANES) STATIC_KIND.set(pairKey(a, b), 'lane');

/** How a join is drawn: straight for land and lanes, bowed along a cable, arced for a ferry join. */
export function joinKind(a: RegionId, b: RegionId, cableKeys: ReadonlySet<string>): JoinKind {
  const key = pairKey(a, b);
  return STATIC_KIND.get(key) ?? (cableKeys.has(key) ? 'cable' : 'ferry');
}

/** Thread width by traffic (spec 1; STYLE 5.8). */
export function threadWidth(traffic: number): number {
  if (traffic >= 10) return 4.5;
  if (traffic >= 6) return 3.5;
  if (traffic >= 3) return 2.5;
  return 1.5;
}

export function westEast(a: RegionId, b: RegionId): number {
  const ra = REGION[a];
  const rb = REGION[b];
  return ra.x - rb.x || ra.y - rb.y;
}

/** Spec 9: unpinned lit regions fade to 30%; the reference fades everything else to 55%. */
export function dimTarget(scoring: ReadonlySet<RegionId> | null, id: RegionId, status: RegionStatus, pinned: boolean): number {
  if (!scoring || scoring.has(id)) return 1;
  return status === 'lit' || pinned ? 0.3 : 0.55;
}

/** HEAT level 0..1 at `now`. */
export function heatLevel(fx: FxState, now: number): number {
  const p = progress(fx.heatTween, now);
  return fx.heatOn ? p : 1 - p;
}

export function buildScene(view: MapViewPlus, fx: FxState, now: number, reduced: boolean): Scene {
  const scoring = fx.scoring;
  const dimP = easeOut(progress(fx.dimTween, now));
  const looseSet = new Set(view.loose ?? []);
  const joinableSet = new Set(scoring ? [] : (view.joinable ?? []));
  const cableKeys = new Set(view.cables.map(([a, b]) => pairKey(a, b)));

  // Ink spreads in progress show the old colour outside the ink.
  const inkBefore = new Map<RegionId, Colour>();
  for (const ink of fx.inks) for (const [id, c] of ink.before) inkBefore.set(id, c);

  let order: Map<RegionId, number> | null = null;
  if (scoring) {
    order = new Map([...scoring].sort(westEast).map((id, i) => [id, i + 1]));
  } else if (view.sweepOrder) {
    order = new Map(Object.entries(view.sweepOrder));
  }

  const regions: Record<RegionId, RegionVis> = {};
  const list: RegionVis[] = [];
  for (const def of REGIONS) {
    const v = view.regions[def.id];
    // A region still waiting for its turn in the deal shows dark.
    const light = fx.lightUps.get(def.id);
    const waiting = !!light && now < light.start;
    const status: RegionStatus = waiting ? 'dark' : (v?.status ?? 'dark');
    const pinned = !!v?.pinned;
    const airlift = !!v?.airlift;
    const colour = inkBefore.get(def.id) ?? fx.colourOverride.get(def.id)?.colour ?? v?.colour ?? def.colour;
    let fill: FillState;
    if (status === 'retired') fill = 'retired';
    else if (fx.scored.has(def.id)) fill = 'scored';
    else if (pinned || airlift || status === 'lit') fill = 'lit';
    else fill = status;
    const target = dimTarget(scoring, def.id, status, pinned || airlift);
    const from = fx.dimFrom.get(def.id) ?? target;
    const o = order?.get(def.id) ?? null;
    const vis: RegionVis = {
      id: def.id,
      def,
      colour,
      status,
      pinned,
      airlift,
      capital: v?.capital ?? false,
      port: v?.port ?? false,
      stamp: v?.stamp ?? null,
      brass: v?.brass ?? 0,
      glow: clamp01((v?.glow ?? 0) / 0.4) * 0.4,
      fill,
      dim: target,
      dimNow: lerp(from, target, dimP),
      loose: (pinned || airlift) && (looseSet.has(def.id) || (!!scoring && !scoring.has(def.id))),
      order: (pinned || airlift) && o ? o : null,
      orderDone: !!scoring && fx.scored.has(def.id),
      blackout: view.blackout !== null && colour === view.blackout,
      warm: light && !waiting ? easeOut(progress(light, now)) : 1,
      joinable: status === 'lit' && !pinned && !airlift && joinableSet.has(def.id),
    };
    regions[def.id] = vis;
    list.push(vis);
  }

  const traffic = new Map(view.threads.map((t) => [pairKey(t.a, t.b), t.traffic]));
  const grow = fx.liveGrow ? easeOut(progress(fx.liveGrow, now)) : 0;
  const hot = heatLevel(fx, now);
  const live: LiveThread[] = [];
  const liveKeys = new Set<string>();
  for (const [a, b] of view.joinedPins) {
    const key = pairKey(a, b);
    if (liveKeys.has(key)) continue;
    liveKeys.add(key);
    const t = traffic.get(key) ?? 0;
    const inSet = !scoring || (scoring.has(a) && scoring.has(b));
    const grey = regions[a]?.loose || regions[b]?.loose || !inSet;
    const base = threadWidth(t);
    const width = grey ? 1 : scoring ? lerp(Math.max(1.5, base), Math.max(2, base), grow) : Math.max(1.5, base);
    const snapAt = fx.joinSnaps.get(key);
    live.push({
      a,
      b,
      traffic: t,
      kind: joinKind(a, b, cableKeys),
      width,
      grey,
      hot: scoring && inSet ? hot : 0,
      snap: snapAt === undefined || reduced ? 1 : clamp01((now - snapAt) / 420),
    });
  }
  const oldThreads: ThreadVis[] = view.threads
    .filter((t) => t.traffic > 0 && !liveKeys.has(pairKey(t.a, t.b)))
    .map((t) => ({ a: t.a, b: t.b, traffic: t.traffic, kind: joinKind(t.a, t.b, cableKeys) }));

  const ring = fx.ring ? tweenAt(fx.ring, now, easeOut) : view.ring;

  return {
    now,
    reduced,
    regions,
    list,
    sweeping: !!scoring,
    oldThreads,
    live,
    cables: view.cables,
    cableKeys,
    gridlock: view.gridlock,
    ferry: view.ferry && !view.gridlock,
    blackout: view.blackout,
    flashpoint: view.flashpoint,
    ring: Math.max(0, ring),
    cooled: !!view.flashpoint && view.ring <= 0 && !fx.ring && !fx.collapse && !view.ringHold,
    collapse: fx.collapse ? progress(fx.collapse, now) : null,
    flashpointSpent: !!view.flashpoint && view.regions[view.flashpoint]?.status === 'spent',
    armed: view.armed,
    highlight: view.highlight ? new Set(view.highlight) : null,
    finger: view.finger,
    ringed: view.ringed ?? null,
    cableDrag: view.cableDrag ?? null,
  };
}

/**
 * The land layer only changes when this does. `global` covers everything that reaches across the
 * table (dims fade lanes and threads, ports move the ferry route); `regions` covers what stays
 * inside one plate, so a change there can be repainted in that plate's bounds alone.
 */
export interface LandSignature {
  global: string;
  regions: Record<RegionId, string>;
}

export function landSignature(s: Scene): LandSignature {
  const parts: string[] = [s.sweeping ? 'S' : '-', s.gridlock ? 'G' : '-', s.ferry ? 'F' : '-', s.blackout ?? '-'];
  const regions: Record<RegionId, string> = {};
  for (const r of s.list) {
    parts.push(`${r.dim}${r.port ? 'p' : ''}`);
    regions[r.id] = `${r.colour}${r.fill}${r.stamp ?? ''}${r.glow.toFixed(3)}`;
  }
  for (const t of s.oldThreads) parts.push(`${t.a}${t.b}${t.traffic}`);
  for (const [a, b] of s.cables) parts.push(`c${a}${b}`);
  return { global: parts.join('|'), regions };
}

/** Regions whose plate changed, or null when something table-wide changed (repaint it all). */
export function changedRegions(before: LandSignature | null, after: LandSignature): RegionId[] | null {
  if (!before || before.global !== after.global) return null;
  return Object.keys(after.regions).filter((id) => before.regions[id] !== after.regions[id]);
}
