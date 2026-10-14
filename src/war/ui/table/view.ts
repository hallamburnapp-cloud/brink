/**
 * The map's view of a run: the engine's region and thread views in the contract's shape, plus the
 * HUD's extras (sweep-order badges, loose pins, the armed Order's targets, highlights, the finger).
 * Between crises the table goes quiet: nothing is lit, only the run's marks remain.
 */
import {
  armedView,
  mapFlags,
  preview,
  regionViews,
  ringFactor,
  threadViews,
  type RunState,
} from '../../engine';
import type { MapViewPlus, RegionId } from '../art';

export interface ViewExtras {
  highlight: RegionId[] | null;
  finger: RegionId | null;
  cableDrag: { from: RegionId; x: number; y: number } | null;
  /** The total the ring follows while a sweep is shown (null: the run's). */
  total: bigint | null;
  /** Show one brass pin fewer here until it drops. */
  brassHold: RegionId | null;
  /** Keep lit regions lit after the crisis ended (until the lights go out). */
  keepLit: boolean;
}

export const NO_EXTRAS: ViewExtras = {
  highlight: null,
  finger: null,
  cableDrag: null,
  total: null,
  brassHold: null,
  keepLit: false,
};

function ringOf(s: RunState, total: bigint | null): number {
  if (total === null) return ringFactor(s);
  const t = s.crisis.target;
  if (t <= 0n || total >= t) return 0;
  return 1 - Number((total * 10_000n) / t) / 10_000;
}

export function mapViewOf(s: RunState, x: ViewExtras): MapViewPlus {
  const live = s.phase === 'crisis';
  const quiet = !live && !x.keepLit;
  let regions = regionViews(s);
  if (quiet || x.brassHold) {
    regions = { ...regions };
    for (const [id, r] of Object.entries(regions)) {
      let v = r;
      if (quiet && (r.status === 'lit' || r.pinned || r.airlift)) v = { ...v, status: r.status === 'lit' ? 'dark' : r.status, pinned: false, airlift: false };
      if (x.brassHold === id && v.brass > 0) v = { ...v, brass: v.brass - 1 };
      regions[id] = v;
    }
  }
  const p = live ? preview(s) : null;
  const armed = live || s.phase === 'briefing' ? armedView(s) : null;
  const flags = mapFlags(s);
  return {
    regions,
    threads: threadViews(s),
    cables: s.world.cables,
    joinedPins: p?.joins ?? [],
    flashpoint: s.crisis.flashpoint,
    ring: ringOf(s, x.total),
    gridlock: live && flags.gridlock,
    ferry: flags.ferry,
    blackout: live ? flags.blackout : null,
    armed: armed ? { kind: armed.kind, valid: armed.valid, chosen: armed.chosen } : null,
    highlight: x.highlight,
    finger: live ? x.finger : null,
    sweepOrder: p && p.pins.length ? p.sweepOrder : null,
    loose: p?.loose ?? null,
    ringed: p?.ringed ?? null,
    cableDrag: x.cableDrag,
  };
}
