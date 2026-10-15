/**
 * The map while the outcome plays (SPEC 8): the table as it was sent (pins, threads, lit regions),
 * at full light, with ownership advancing one region at a time in step with the ink. The director
 * pushes these views to the map itself; when it is done the screen shows the resolved game, whose
 * view matches the last one here.
 */
import type { CrisisView, MapView, Owner, RegionId } from '../map/contract';

/** The war tag as the map draws it. */
export type WarTag = MapView['warNext'];

export interface World {
  owner: Record<RegionId, Owner>;
  /** Regions whose outcome has played: their preview outline is gone. */
  settled: ReadonlySet<RegionId>;
  /** The ring, until it has collapsed. */
  crisis: CrisisView | null;
  warNext: MapView['warNext'];
  ceased: boolean;
  /** The send is done with: the pins lift and the lamps go off, leaving the plain world. */
  cleared: boolean;
  /** Regions picked out on the map (WAR's near miss, from the moment the lights go out). */
  highlight?: RegionId[] | null;
}

/** The world as SEND found it (the pre-send view). */
export function worldFrom(view: MapView): World {
  const owner: Record<RegionId, Owner> = {};
  for (const [id, r] of Object.entries(view.regions)) owner[id] = r.owner;
  return { owner, settled: new Set(), crisis: view.crisis, warNext: view.warNext, ceased: view.ceased, cleared: false };
}

/**
 * A region turns gold. War spreads only into grey, so a war tag on it hops to `hop` (where war
 * goes instead), never simply vanishing: the red ink must always run into a tagged region.
 */
export function claim(w: World, id: RegionId, hop: WarTag = null): World {
  return {
    ...w,
    owner: { ...w.owner, [id]: 'gold' },
    settled: new Set([...w.settled, id]),
    warNext: w.warNext?.id === id ? hop : w.warNext,
  };
}

/**
 * War takes a region on a miss. A war tag on it hops to `hop`, as for a claim. The miss's red hatch
 * stays on it while its red ink runs (until the table clears), so it never reads as safe.
 */
export function take(w: World, id: RegionId, hop: WarTag = null): World {
  return {
    ...w,
    owner: { ...w.owner, [id]: 'red' },
    warNext: w.warNext?.id === id ? hop : w.warNext,
  };
}

/**
 * War spreads by itself this turn into `spread`, and a region changing hands moved where it goes (a
 * miss turned the crisis red beside another grey region, or a win took back war's border): the tag
 * hops there now, so the drum and the red ink that follow land on the region the tag points at.
 */
export function aimAt(w: World, spread: RegionId | undefined): World {
  if (!spread || !w.warNext || w.warNext.id === spread) return w;
  return { ...w, warNext: { id: spread, turns: 1 } };
}

/** War spreads by itself into a region: the tag stays on it, reading WAR · NOW, until the tag moves on. */
export function spreadInto(w: World, id: RegionId): World {
  return {
    ...w,
    owner: { ...w.owner, [id]: 'red' },
    settled: new Set([...w.settled, id]),
    warNext: { id, turns: 0 },
  };
}

/** The send's previews have done their work: every outline goes. */
export function settleAll(w: World): World {
  return { ...w, settled: new Set(Object.keys(w.owner)) };
}

/** The table clears: pins, threads, lamps and outlines go; ownership and the tag stay. */
export function clearTable(w: World): World {
  return { ...settleAll(w), crisis: null, cleared: true };
}

/** The pre-send view with the world's ownership, ring, tag and ceasefire. */
export function viewOf(base: MapView, w: World): MapView {
  const regions: MapView['regions'] = {};
  for (const [id, r] of Object.entries(base.regions)) {
    const table = w.cleared ? { lit: false, pinned: false, addable: false, joinable: false } : {};
    regions[id] = {
      ...r,
      ...table,
      owner: w.owner[id] ?? r.owner,
      preview: w.settled.has(id) ? null : r.preview,
    };
  }
  return {
    ...base,
    regions,
    joinedPins: w.cleared ? [] : base.joinedPins,
    crisis: w.crisis,
    warNext: w.warNext,
    ceased: w.ceased,
    highlight: w.highlight ?? null,
    finger: null,
    hover: null,
    outcome: true,
  };
}
