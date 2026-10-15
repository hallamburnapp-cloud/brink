/**
 * The map's view of a game: the engine's MapView with the HUD's extras set on a copy (the
 * long-press highlight, the teaching finger, the desktop hover), and the intro's calm world
 * before the first crisis (the plain world at rest: nothing lit, no ring, no war tag).
 */
import { endView, mapView, preview, warSpreadTarget, type GameState, type Owner, type RegionId } from '../../engine';
import type { MapView } from '../art';

export interface ViewExtras {
  /** Regions to light while the rest dim (a long-press on a shop card, the intro). */
  highlight: RegionId[] | null;
  finger: RegionId | null;
  hover: RegionId | null;
  /** The intro's opening: the world as it stands, before any crisis flares. */
  calm: boolean;
  /** The intro's war tag, when it tells its own story (undefined: the game's own tag). */
  warNext?: MapView['warNext'];
}

export const NO_EXTRAS: ViewExtras = { highlight: null, finger: null, hover: null, calm: false };

export function mapViewFor(s: GameState, x: ViewExtras): MapView {
  const base = mapView(s);
  const choosing = s.phase === 'choose' && !x.calm;
  let regions = base.regions;
  if (x.calm) {
    // Nothing lit: the map draws the world at rest, every region named, no sockets to read as dead.
    regions = Object.fromEntries(
      Object.entries(base.regions).map(([id, r]) => [id, { ...r, lit: false, pinned: false, addable: false, joinable: false, preview: null }]),
    );
  }
  const hoverable = choosing && x.hover !== null && !!regions[x.hover]?.lit;
  return {
    ...base,
    regions,
    joinedPins: x.calm ? [] : base.joinedPins,
    crisis: x.calm ? null : base.crisis,
    warNext: x.calm ? null : x.warNext !== undefined ? x.warNext : warTag(s, base.warNext),
    highlight: x.highlight ?? (s.phase === 'over' ? nearMiss(s) : null),
    finger: choosing ? x.finger : null,
    hover: hoverable ? x.hover : null,
  };
}

/**
 * The war tag as the map draws it. Outside a turn the engine counts from the coming turn, so the
 * tag says so ('WAR · NEXT TURN', 'WAR · IN 2 TURNS') rather than 'THIS TURN' over the shop. On the
 * turn war spreads, the tag shows where it would go if SEND went now: a win that takes the tagged
 * region, or a miss that turns the crisis red beside another grey region, moves war elsewhere, and
 * the tag hops there as the pins change (and back when they do), so it never promises a region war
 * will not take.
 */
export function warTag(s: GameState, tag: MapView['warNext']): MapView['warNext'] {
  if (!tag) return tag;
  if (s.phase !== 'choose') return { ...tag, between: true };
  if (tag.turns !== 1) return tag;
  const p = preview(s);
  if (!p) return tag;
  const owner: Record<RegionId, Owner> = { ...s.owner };
  if (p.regions > 0) for (const id of p.wins) owner[id] = 'gold';
  else if (!s.deal.finalPush) owner[s.deal.crisis] = 'red';
  const next = warSpreadTarget(owner);
  return next && next !== tag.id ? { ...tag, id: next } : tag;
}

/** A WAR lost with three or fewer grey regions left: they are picked out on the dark map. */
function nearMiss(s: GameState): RegionId[] | null {
  const e = endView(s);
  return e && e.nearMiss.length ? e.nearMiss : null;
}

/** Regions that have just come on (a new deal, or a swap's new regions), in light-up order. */
export function freshlyLit(prev: GameState | null, s: GameState): RegionId[] {
  if (s.phase !== 'choose') return [];
  const was = prev && prev.phase === 'choose' && prev.turn === s.turn ? new Set(prev.deal.lit) : new Set<RegionId>();
  const fresh = s.deal.lit.filter((id) => !was.has(id));
  // A new turn's crisis lights first, with its ring.
  return was.size === 0 ? [s.deal.crisis, ...fresh] : fresh;
}
