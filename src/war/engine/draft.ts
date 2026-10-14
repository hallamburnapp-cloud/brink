/**
 * Copy-on-write for actions: draft() makes a copy of a state that is safe to mutate.
 * Records that are never changed after they are made (sweep records, clear records, the best
 * sweep, log entries, the Hour plan) are shared between the old and the new state.
 */
import type { Crisis, RunState, Shop, World } from './types';

function draftWorld(w: World): World {
  return {
    colour: { ...w.colour },
    promoted: [...w.promoted],
    cables: w.cables.map(([a, b]) => [a, b]),
    stamps: { ...w.stamps },
    brass: { ...w.brass },
    traffic: { ...w.traffic },
    retired: [...w.retired],
    levels: { ...w.levels },
    scored: { ...w.scored },
  };
}

function draftCrisis(c: Crisis): Crisis {
  return {
    ...c,
    pile: [...c.pile],
    lit: [...c.lit],
    spent: [...c.spent],
    pins: [...c.pins],
    airliftPaper: c.airliftPaper && { ...c.airliftPaper },
    sweeps: [...c.sweeps],
  };
}

function draftShop(s: Shop): Shop {
  return {
    ...s,
    offers: s.offers.map((o) => o && { ...o }),
    folder: { ...s.folder, contents: [...s.folder.contents] } as Shop['folder'],
  };
}

export function draft(s: RunState): RunState {
  return {
    ...s,
    rng: { deal: [...s.rng.deal], shop: [...s.rng.shop], twist: [...s.rng.twist] },
    staff: s.staff.map((x) => ({ ...x })),
    tray: s.tray.map((p) => ({ ...p })),
    world: draftWorld(s.world),
    crisis: draftCrisis(s.crisis),
    shop: s.shop && draftShop(s.shop),
    armed: s.armed && { ...s.armed, chosen: [...s.armed.chosen] },
    log: [...s.log],
    made: { ...s.made },
  };
}
