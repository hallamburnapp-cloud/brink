/**
 * The map's view of a run: the engine's region and thread views in the contract's shape, plus the
 * HUD's extras (sweep-order badges, loose pins, the armed Order's targets, highlights, the finger).
 * Between crises the table goes quiet: nothing is lit, only the run's marks remain. While a clear
 * or a miss plays out, `keep` holds the sweep on the table (its pins, threads and lit regions).
 */
import {
  armedView,
  boardOf,
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
  /** The sweep held on the table after the crisis ended (until the outcome has played). */
  keep: { lit: RegionId[]; pins: RegionId[]; joins: Array<[RegionId, RegionId]> } | null;
  /** The crisis is won but the clear has not played: the flashpoint ring is not cooled yet. */
  ringHold: boolean;
}

export const NO_EXTRAS: ViewExtras = {
  highlight: null,
  finger: null,
  cableDrag: null,
  total: null,
  brassHold: null,
  keep: null,
  ringHold: false,
};

function ringOf(s: RunState, total: bigint | null): number {
  if (total === null) return ringFactor(s);
  const t = s.crisis.target;
  if (t <= 0n || total >= t) return 0;
  return 1 - Number((total * 10_000n) / t) / 10_000;
}

export function mapViewOf(s: RunState, x: ViewExtras): MapViewPlus {
  const live = s.phase === 'crisis';
  const keep = x.keep;
  const keptLit = new Set(keep?.lit ?? []);
  const keptPins = new Set(keep?.pins ?? []);
  // Between crises, and while a sweep is held, only what is kept stays lit.
  const quiet = !live || !!keep;
  let regions = regionViews(s);
  if (quiet || x.brassHold) {
    regions = { ...regions };
    for (const [id, r] of Object.entries(regions)) {
      let v = r;
      const pinned = keptPins.has(id);
      if (pinned || keptLit.has(id)) v = { ...v, status: 'lit', pinned, airlift: false };
      else if (quiet && (r.status === 'lit' || r.pinned || r.airlift)) v = { ...v, status: r.status === 'lit' ? 'dark' : r.status, pinned: false, airlift: false };
      if (x.brassHold === id && v.brass > 0) v = { ...v, brass: v.brass - 1 };
      regions[id] = v;
    }
  }
  const p = live && !keep ? preview(s) : null;
  const armed = (live || s.phase === 'briefing') && !keep ? armedView(s) : null;
  const flags = mapFlags(s);
  return {
    joinable: p ? joinableOf(s, p.pins) : null,
    regions,
    threads: threadViews(s),
    cables: s.world.cables,
    joinedPins: keep?.joins ?? p?.joins ?? [],
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
    ringHold: x.ringHold,
  };
}

/** Lit regions a further pin would join to `pins` (none once five are down). */
function joinableOf(s: RunState, pins: RegionId[]): RegionId[] | null {
  if (pins.length === 0 || pins.length >= 5 || s.armed) return null;
  const board = boardOf(s);
  const out = s.crisis.lit.filter((r) => !pins.includes(r) && pins.some((q) => board.joined(q, r)));
  return out.length ? out : null;
}
