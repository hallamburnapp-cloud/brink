/**
 * The scene: what to draw at time `now`, derived from the last MapView and the effect timeline.
 * Pure (no DOM). Painters read only this.
 */
import type { CrisisView, MapView, Owner, RegionId, RegionView } from './contract';
import { LAND_JOINS, REGION, REGIONS, SEA_LANES, pairKey, type MapRegion } from './data';
import { clamp01, easeOut, lerp } from './draw';
import { progress, type FxState } from './fx';
import type { PlateLevel } from './palette';

/** A join between two pins: across a land border or causeway, or a dashed sea lane. */
export type JoinKind = 'land' | 'lane';

export interface RegionVis {
  id: RegionId;
  def: MapRegion;
  /** Owner as drawn (the view's, or the old owner outside a running ink spread). */
  owner: Owner;
  /** In this turn's deal (and its turn in the light-up has come). */
  lit: boolean;
  /**
   * Lit and in play: pinned, or a pin here would be legal. Its lamp is on and its socket bright.
   * A lit region that cannot be added drops to the dark plate at once; its marks step back a
   * little (gold's never do).
   */
  live: boolean;
  pinned: boolean;
  /** Breathes: a pin here would join the group, or the pointer is over it. */
  joinable: boolean;
  capital: boolean;
  port: boolean;
  crisis: boolean;
  preview: RegionView['preview'];
  /** Flashed by the current send: its lamp holds bright. */
  scored: boolean;
  /** Dim the land layer is baked at (1 = full light; a send fades the rest). */
  dim: number;
  /** Dim right now, mid-transition (markers and overlays). */
  dimNow: number;
  /** Lighting up on a deal: 0 just lit, 1 fully warm (1 for everything else). */
  warm: number;
}

export interface ThreadVis {
  a: RegionId;
  b: RegionId;
  kind: JoinKind;
  /** Snap-taut progress for a join that just formed, 0..1 (1 = settled). */
  snap: number;
}

export interface RingVis extends CrisisView {
  /** The ×2 stamp, 0..1 while it plays. */
  stamp: number | null;
  /** The collapse, 0..1 while it plays; 1 once collapsed (the ring is gone). */
  collapse: number | null;
  /** The ring catching the score, 0..1 while it swells; and how the send came out once caught. */
  caught: { p: number; win: boolean } | null;
}

export interface Scene {
  now: number;
  reduced: boolean;
  regions: Record<RegionId, RegionVis>;
  list: RegionVis[];
  /** A send is playing (dimExcept with ids): the sea veil and quieter coasts. */
  sweeping: boolean;
  /**
   * No deal is on the table (between turns, the title, the shop, the end cards): the plain world,
   * its free regions at the rest tone with their names, rather than dark as though left out of a deal.
   */
  rest: boolean;
  threads: ThreadVis[];
  ring: RingVis | null;
  warNext: MapView['warNext'];
  /** The war tag hopping from one region to another, 0..1. */
  tagHop: { from: RegionId; to: RegionId; p: number } | null;
  /** The war tag's count stamping in, 0..1. */
  tagStamp: number | null;
  ceased: boolean;
  highlight: Set<RegionId> | null;
  finger: RegionId | null;
}

const LANES = new Set(SEA_LANES.map(([a, b]) => pairKey(a, b)));
const JOINS = new Set([...LAND_JOINS, ...SEA_LANES].map(([a, b]) => pairKey(a, b)));

export function joinKind(a: RegionId, b: RegionId): JoinKind {
  return LANES.has(pairKey(a, b)) ? 'lane' : 'land';
}

export function isJoin(a: RegionId, b: RegionId): boolean {
  return JOINS.has(pairKey(a, b));
}

/** West to east (by x, then y): the scoring order. */
export function westEast(a: RegionId, b: RegionId): number {
  const ra = REGION[a];
  const rb = REGION[b];
  return ra.x - rb.x || ra.y - rb.y;
}

/**
 * During a send the scoring pins stay at full light; lit regions outside it fade to 30% and the
 * rest of the world to 50%, so the world stays legible as a world while the pins blaze. Gold never
 * dims: it is yours for good, and dimmed gold reads as lost (the pins still stand out on it by
 * their heads, threads and flashes).
 */
export function dimTarget(scoring: ReadonlySet<RegionId> | null, id: RegionId, lit: boolean, owner: Owner): number {
  if (!scoring || scoring.has(id) || owner === 'gold') return 1;
  return lit ? 0.3 : 0.5;
}

/** A plate's tone level: lit and in play, the plain world at rest, or dark (left out of the deal). */
export function plateLevel(r: Pick<RegionVis, 'live'>, rest: boolean): PlateLevel {
  return r.live ? 'lit' : rest ? 'rest' : 'dark';
}

/** No deal on the table: no ring and nothing lit or pinned. */
export function atRest(view: MapView): boolean {
  if (view.crisis) return false;
  for (const id in view.regions) {
    const r = view.regions[id];
    if (r.lit || r.pinned) return false;
  }
  return true;
}

const EMPTY_REGION = (def: MapRegion): RegionView => ({
  id: def.id,
  colour: def.colour,
  owner: 'grey',
  lit: false,
  pinned: false,
  addable: false,
  joinable: false,
  capital: def.capital,
  port: def.port,
  preview: null,
});

export function buildScene(view: MapView, fx: FxState, now: number, reduced: boolean): Scene {
  const scoring = fx.scoring;
  const dimP = easeOut(progress(fx.dimTween, now));

  // Ink spreads in progress show the old owner outside the ink.
  const inkBefore = new Map<RegionId, Owner>();
  for (const ink of fx.inks) for (const [id, o] of ink.before) inkBefore.set(id, o);

  const crisisId = view.crisis?.id ?? null;
  const regions: Record<RegionId, RegionVis> = {};
  const list: RegionVis[] = [];
  for (const def of REGIONS) {
    const v = view.regions[def.id] ?? EMPTY_REGION(def);
    // A region still waiting for its turn in the deal shows dark.
    const light = fx.lightUps.get(def.id);
    const waiting = !!light && now < light.start;
    const lit = v.lit && !waiting;
    const pinned = v.pinned;
    const owner = inkBefore.get(def.id) ?? fx.ownerOverride.get(def.id)?.owner ?? v.owner;
    const target = dimTarget(scoring, def.id, lit || pinned, owner);
    const from = fx.dimFrom.get(def.id) ?? target;
    const vis: RegionVis = {
      id: def.id,
      def,
      owner,
      lit,
      live: lit && (pinned || v.addable),
      pinned,
      joinable: lit && !pinned && !scoring && (v.joinable || (view.hover === def.id && v.addable)),
      capital: v.capital,
      port: v.port,
      crisis: def.id === crisisId,
      // While the send plays the win outlines step aside for the pins; a miss keeps its red hatch on
      // the crisis, so it never reads as safe before the red ink runs.
      preview: scoring && v.preview?.kind !== 'war' ? null : v.preview,
      scored: fx.scored.has(def.id),
      dim: target,
      dimNow: lerp(from, target, dimP),
      warm: light && !waiting ? easeOut(progress(light, now)) : 1,
    };
    regions[def.id] = vis;
    list.push(vis);
  }

  const threads: ThreadVis[] = [];
  const seen = new Set<string>();
  for (const [a, b] of view.joinedPins) {
    const key = pairKey(a, b);
    if (seen.has(key) || !REGION[a] || !REGION[b]) continue;
    seen.add(key);
    const snapAt = fx.joinSnaps.get(key);
    threads.push({ a, b, kind: joinKind(a, b), snap: snapAt === undefined || reduced ? 1 : clamp01((now - snapAt) / 420) });
  }

  let ring: RingVis | null = null;
  if (view.crisis && REGION[view.crisis.id]) {
    const c = fx.ringCollapse && fx.ringCollapse.crisis === view.crisis.id ? fx.ringCollapse : null;
    const k = fx.ringCatch && fx.ringCatch.crisis === view.crisis.id ? fx.ringCatch : null;
    ring = {
      ...view.crisis,
      stamp: fx.ringStamp ? progress(fx.ringStamp, now) : null,
      collapse: c ? progress(c, now) : null,
      caught: k ? { p: progress(k, now), win: k.win } : null,
    };
  }

  return {
    now,
    reduced,
    regions,
    list,
    sweeping: !!scoring,
    rest: atRest(view),
    threads,
    ring,
    warNext: view.warNext && REGION[view.warNext.id] ? view.warNext : null,
    tagHop: fx.tagHop && now < fx.tagHop.start + fx.tagHop.dur ? { from: fx.tagHop.from, to: fx.tagHop.to, p: progress(fx.tagHop, now) } : null,
    tagStamp: fx.tagStamp && now < fx.tagStamp.start + fx.tagStamp.dur ? progress(fx.tagStamp, now) : null,
    ceased: view.ceased,
    highlight: view.highlight ? new Set(view.highlight) : null,
    finger: view.finger && REGION[view.finger] ? view.finger : null,
  };
}

/**
 * The land layer only changes when this does. `global` covers everything that reaches across the
 * table (ownership: gold glows onto the sea; dims fade lanes and causeways); `regions` covers what
 * stays inside one plate, so a change there can be repainted in that plate's bounds alone.
 */
export interface LandSignature {
  global: string;
  regions: Record<RegionId, string>;
}

const OWNER_CODE: Record<Owner, string> = { grey: '.', gold: 'g', red: 'r' };

export function landSignature(s: Scene): LandSignature {
  const parts: string[] = [s.sweeping ? 'S' : '-', s.ceased ? 'C' : '-', s.rest ? 'R' : '-'];
  const regions: Record<RegionId, string> = {};
  for (const r of s.list) {
    parts.push(`${OWNER_CODE[r.owner]}${r.dim}`);
    regions[r.id] = `${r.live ? 'L' : '-'}${r.scored ? 'S' : '-'}`;
  }
  return { global: parts.join('|'), regions };
}

/** Regions whose plate changed, or null when something table-wide changed (repaint it all). */
export function changedRegions(before: LandSignature | null, after: LandSignature): RegionId[] | null {
  if (!before || before.global !== after.global) return null;
  return Object.keys(after.regions).filter((id) => before.regions[id] !== after.regions[id]);
}
