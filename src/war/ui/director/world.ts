/**
 * The map while the outcome plays (SPEC 8): the table as it was sent (pins, threads, lit regions),
 * at full light, with ownership advancing one region at a time in step with the ink. The director
 * pushes these views to the map itself; when it is done the screen shows the resolved game, whose
 * view matches the last one here.
 */
import type { CrisisView, MapView, Owner, RegionId } from '../map/contract';

export interface World {
  owner: Record<RegionId, Owner>;
  brass: ReadonlySet<RegionId>;
  /** Regions whose outcome has played: their preview outline is gone. */
  settled: ReadonlySet<RegionId>;
  /** The ring, until it has collapsed. */
  crisis: CrisisView | null;
  warNext: MapView['warNext'];
  ceased: boolean;
  /** The send is done with: the pins lift and the lamps go off, leaving the plain world. */
  cleared: boolean;
}

/** The world as SEND found it (the pre-send view). */
export function worldFrom(view: MapView): World {
  const owner: Record<RegionId, Owner> = {};
  const brass = new Set<RegionId>();
  for (const [id, r] of Object.entries(view.regions)) {
    owner[id] = r.owner;
    if (r.brass) brass.add(id);
  }
  return { owner, brass, settled: new Set(), crisis: view.crisis, warNext: view.warNext, ceased: view.ceased, cleared: false };
}

/** A region turns gold. The war tag on it goes: war spreads only into grey. */
export function claim(w: World, id: RegionId): World {
  return {
    ...w,
    owner: { ...w.owner, [id]: 'gold' },
    settled: new Set([...w.settled, id]),
    warNext: w.warNext?.id === id ? null : w.warNext,
  };
}

/** War takes a region. */
export function take(w: World, id: RegionId): World {
  return {
    ...w,
    owner: { ...w.owner, [id]: 'red' },
    settled: new Set([...w.settled, id]),
    warNext: w.warNext?.id === id ? null : w.warNext,
  };
}

/** The crisis won gets its brass pin. */
export function addBrass(w: World, id: RegionId): World {
  return { ...w, brass: new Set([...w.brass, id]) };
}

/** The send's previews have done their work: every outline goes. */
export function settleAll(w: World): World {
  return { ...w, settled: new Set(Object.keys(w.owner)) };
}

/** The table clears: pins, threads, lamps and outlines go; ownership, brass and the tag stay. */
export function clearTable(w: World): World {
  return { ...settleAll(w), crisis: null, cleared: true };
}

/** The pre-send view with the world's ownership, brass, ring, tag and ceasefire. */
export function viewOf(base: MapView, w: World): MapView {
  const regions: MapView['regions'] = {};
  for (const [id, r] of Object.entries(base.regions)) {
    const table = w.cleared ? { lit: false, pinned: false, addable: false, joinable: false } : {};
    regions[id] = {
      ...r,
      ...table,
      owner: w.owner[id] ?? r.owner,
      brass: w.brass.has(id),
      preview: w.settled.has(id) ? null : r.preview,
    };
  }
  return {
    ...base,
    regions,
    joinedPins: w.cleared ? [] : base.joinedPins,
    pinOrder: w.cleared ? null : base.pinOrder,
    crisis: w.crisis,
    warNext: w.warNext,
    ceased: w.ceased,
    highlight: null,
    finger: null,
    hover: null,
  };
}
