/**
 * Read-only views of a run for the UI: the readout preview, the map's region and thread views,
 * labels for the Big Board, Run Info and the armed Order. Nothing here changes state, and the
 * UI never recomputes a score: preview() and the sweep trace carry every number it shows.
 */
import { REGION, REGION_IDS, compareWestEast, splitJoinKey, type RegionId } from '../content/map';
import { FOLDER_NAME, FOLDER_RULE, ORDER, playbook, type OrderId } from '../content/orders';
import { PATTERN, PATTERNS, patternValues, type PatternId } from '../content/patterns';
import { STAFF_DEF, seatChip, type Rarity, type StaffId } from '../content/staff';
import type { RegionView, ThreadView } from '../ui/map/contract';
import { baseCapital, portSet } from './board';
import { CRISIS_NAME, TWIST_NAME, clockOf, hourLabel, hourTargets, isOvertime, twistRule } from './hours';
import { armedPrompt, statusOf, validTargets } from './orders';
import { components } from './patterns';
import {
  boardOf,
  canConfirmArmed,
  folderProblem,
  offerProblem,
  paperProblem,
  pickProblem,
  scorePins,
  swapProblem,
  sweepProblem,
  twistInForce,
} from './run';
import type { Colour, CrisisKind, Offer, RunState, Twist } from './types';

/** Per-state memo: states are never mutated, so a view computed once stays right. */
function memo<T>(fn: (s: RunState) => T): (s: RunState) => T {
  const cache = new WeakMap<RunState, T>();
  return (s) => {
    if (cache.has(s)) return cache.get(s)!;
    const v = fn(s);
    cache.set(s, v);
    return v;
  };
}

// ---------------------------------------------------------------- readout preview

export interface Preview {
  /** Pins in tap order. */
  pins: RegionId[];
  /** null when nothing is pinned (the readout says 'Tap lit regions'). */
  pattern: PatternId | null;
  name: string | null;
  level: number;
  /** Base values at the pattern's level: what the boxes show before a sweep. */
  influence: bigint;
  m10: bigint;
  /** Scoring pins in sweep order, and their 1-based order numbers for the map. */
  scoringSet: RegionId[];
  sweepOrder: Record<RegionId, number>;
  /** Pinned but not scoring (drawn grey). */
  loose: RegionId[];
  /** SURROUND: the ringed region (it glows). */
  ringed: RegionId | null;
  /** Joins between pinned regions, so the map can draw pins joining up. */
  joins: Array<[RegionId, RegionId]>;
  /** Size of the largest joined group among the pins (first-night hint: 3 joined -> 'Sweep.'). */
  biggestGroup: number;
  /** Seats that would fire (they lift slightly on the rail). */
  firingSeats: number[];
  /** The full silent result. NEVER display this number: the total is the reveal. */
  leverage: bigint;
  /** The CLEARS lamp: this sweep would reach the target. */
  clears: boolean;
  canSweep: boolean;
  sweepReason: string | null;
  canSwap: boolean;
  swapReason: string | null;
}

/** What the readout shows for the current selection. Same object per state. */
export const preview = memo((s: RunState): Preview => {
  const c = s.crisis;
  const pins = [...c.pins];
  const res = s.phase === 'crisis' ? scorePins(s, pins, { trace: false }) : null;
  const board = boardOf(s);
  const joins: Array<[RegionId, RegionId]> = [];
  const sorted = [...pins].sort(compareWestEast);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) if (board.joined(sorted[i], sorted[j])) joins.push([sorted[i], sorted[j]]);
  }
  const sweepReason = sweepProblem(s);
  const swapReason = swapProblem(s);
  const p: Preview = {
    pins,
    pattern: res?.pattern ?? null,
    name: res ? PATTERN[res.pattern].name : null,
    level: res?.level ?? 0,
    influence: res?.baseInfluence ?? 0n,
    m10: res?.baseM10 ?? 0n,
    scoringSet: res?.scoringSet ?? [],
    sweepOrder: Object.fromEntries((res?.scoringSet ?? []).map((r, i) => [r, i + 1])),
    loose: res?.loose ?? [],
    ringed: res?.ringed ?? null,
    joins,
    biggestGroup: pins.length ? components(pins, board.adj)[0].length : 0,
    firingSeats: res?.firedSeats ?? [],
    leverage: res?.leverage ?? 0n,
    clears: !!res && sweepReason === null && res.leverage >= c.target - c.total,
    canSweep: sweepReason === null,
    sweepReason,
    canSwap: swapReason === null,
    swapReason,
  };
  return p;
});

/** What one scoring pin will add if you sweep now, read off the silent scorer's trace. */
export interface PinChip {
  /** Influence it adds, every pass, thread, stamp and pin staff included. */
  inf: bigint;
  /** Momentum it adds (whole units). */
  momAdd: bigint;
  /** The Momentum multipliers it applies, in order ('1.5', '2'). */
  mults: string[];
  /** How many times it scores (the flashpoint, the Courier's first pin, an Echo: 2). */
  passes: number;
}

/**
 * Each scoring pin's own share of the sweep, so two picks of the same shape can be told apart
 * before SWEEP. Never the total: that stays the reveal. Same object per state.
 */
export const pinChips = memo((s: RunState): Record<RegionId, PinChip> | null => {
  if (s.phase !== 'crisis' || s.crisis.pins.length === 0) return null;
  const res = scorePins(s, s.crisis.pins, { trace: true });
  if (!res) return null;
  const out: Record<RegionId, PinChip> = {};
  for (const r of res.scoringSet) out[r] = { inf: 0n, momAdd: 0n, mults: [], passes: res.passes[r] ?? 0 };
  for (const e of res.trace) {
    const c = e.region ? out[e.region] : undefined;
    if (!c || (e.phase !== 'pin' && e.phase !== 'thread' && e.phase !== 'stamp' && e.phase !== 'staff')) continue;
    if (e.op === '+I') c.inf += BigInt(e.amount);
    else if (e.op === '+M') c.momAdd += BigInt(e.amount);
    else if (e.op === 'xM') c.mults.push(e.amount);
  }
  return out;
});

// ---------------------------------------------------------------- map views

export function isCapital(s: RunState, r: RegionId): boolean {
  return boardOf(s).isCapital(r);
}

export function isPort(s: RunState, r: RegionId): boolean {
  return boardOf(s).isPort(r);
}

/** Region views in the shape the map renderer takes (contract.ts RegionView). Same object per state. */
export const regionViews = memo((s: RunState): Record<RegionId, RegionView> => {
  const board = boardOf(s);
  const pinned = new Set(s.crisis.pins);
  const out: Record<RegionId, RegionView> = {};
  for (const id of REGION_IDS) {
    out[id] = {
      id,
      colour: s.world.colour[id],
      status: statusOf(s, id),
      pinned: pinned.has(id),
      airlift: s.crisis.airlift === id,
      capital: board.isCapital(id),
      port: board.isPort(id),
      stamp: s.world.stamps[id] ?? null,
      brass: s.world.brass[id] ?? 0,
      glow: Math.min(0.4, 0.03 * (s.world.scored[id] ?? 0)),
    };
  }
  return out;
});

/** Every join that has carried traffic (the map decides how to draw each weight). Same array per state. */
export const threadViews = memo((s: RunState): ThreadView[] =>
  Object.entries(s.world.traffic)
    .filter(([, t]) => t > 0)
    .map(([k, traffic]) => {
      const [a, b] = splitJoinKey(k);
      return { a, b, traffic };
    })
    .sort((x, y) => compareWestEast(x.a, y.a) || compareWestEast(x.b, y.b)),
);

/** Flashpoint ring radius factor: max(0, 1 - total / target). */
export function ringFactor(s: RunState): number {
  const c = s.crisis;
  if (c.target <= 0n || c.total >= c.target) return 0;
  return 1 - Number((c.total * 10_000n) / c.target) / 10_000;
}

/** Progress rule fill, 0..1 (1 at or past the target). */
export function progress(s: RunState): number {
  return 1 - ringFactor(s);
}

/** Map flags for the current moment. */
export function mapFlags(s: RunState): { gridlock: boolean; ferry: boolean; blackout: Colour | null } {
  const t = twistInForce(s);
  const board = boardOf(s);
  return {
    gridlock: t?.kind === 'GRIDLOCK',
    ferry: board.ferry,
    blackout: t?.kind === 'BLACKOUT' ? t.colour : null,
  };
}

/** True if any two lit regions are joined (for the 'Nothing joins?' first-night hint). */
export function litHasJoin(s: RunState): boolean {
  const board = boardOf(s);
  const lit = s.crisis.lit;
  return lit.some((a, i) => lit.slice(i + 1).some((b) => board.joined(a, b)));
}

// ---------------------------------------------------------------- the Big Board

export interface BoardLabels {
  /** '23:00' (or '10:00' in Overtime). */
  clock: string;
  /** '23:00' or 'OVERTIME 10:00'. */
  hour: string;
  overtime: boolean;
  /** 'STANDOFF'. */
  crisis: string;
  crisisKind: CrisisKind;
  /** 0, 1 or 2: which of the Hour's three dots is current. */
  crisisIndex: number;
  /** 'SUMMIT: BLACKOUT', shown from the start of the Hour. */
  summitChip: string;
  twist: Twist;
  twistRule: string;
  /** The twist applies to the crisis on the table right now. */
  twistNow: boolean;
  target: bigint;
  total: bigint;
  sweepsLeft: number;
  swapsLeft: number;
  funds: number;
}

export function boardLabels(s: RunState): BoardLabels {
  const c = s.crisis;
  return {
    clock: clockOf(c.hour),
    hour: hourLabel(c.hour),
    overtime: isOvertime(c.hour),
    crisis: CRISIS_NAME[c.kind],
    crisisKind: c.kind,
    crisisIndex: c.index,
    summitChip: `SUMMIT: ${TWIST_NAME[s.hour.twist.kind]}`,
    twist: s.hour.twist,
    twistRule: twistRule(s.hour.twist),
    twistNow: twistInForce(s) !== null,
    target: c.target,
    total: c.total,
    sweepsLeft: c.sweepsLeft,
    swapsLeft: c.swapsLeft,
    funds: s.funds,
  };
}

export interface NextCrisisInfo {
  hour: string;
  crisis: string;
  kind: CrisisKind;
  target: bigint;
  /** The next crisis starts a new Hour (and shows its Summit twist). */
  newHour: boolean;
}

/** The crisis the Briefing leads to, for 'BRIEFING · next: STANDOFF 1,350'. */
export function nextCrisisInfo(s: RunState): NextCrisisInfo {
  const c = s.crisis;
  if (c.index < 2) {
    const kind = (['FLARE_UP', 'STANDOFF', 'SUMMIT'] as const)[c.index + 1];
    return { hour: hourLabel(c.hour), crisis: CRISIS_NAME[kind], kind, target: s.hour.targets[c.index + 1], newHour: false };
  }
  const next = c.hour + 1;
  const target = hourTargets(next, s.hour.targets)[0];
  return { hour: hourLabel(next), crisis: CRISIS_NAME.FLARE_UP, kind: 'FLARE_UP', target, newHour: true };
}

/** End screens: 'THE WORLD TIPPED · 23:00 STANDOFF' / 'YOU HELD UNTIL 01:00'. */
export function endLabels(s: RunState): { title: string; line: string } {
  const c = s.crisis;
  if (s.phase === 'missed') return { title: 'THE WORLD TIPPED', line: `${hourLabel(c.hour)} ${CRISIS_NAME[c.kind]}` };
  return { title: 'END OF SLICE', line: `YOU HELD UNTIL ${clockOf(c.hour + 1)}` };
}

// ---------------------------------------------------------------- staff, papers, patterns

export interface SeatView {
  seat: number;
  uid: number;
  id: StaffId;
  name: string;
  object: string;
  rule: string;
  chip: string;
  count: number;
  rarity: string;
  sell: number;
  /** For a Deputy: the staff it copies right now (null if nothing to its right). */
  copies: StaffId | null;
}

export function seatViews(s: RunState): SeatView[] {
  const acting = boardOf(s).acting;
  return s.staff.map((st, seat) => {
    const def = STAFF_DEF[st.id];
    return {
      seat,
      uid: st.uid,
      id: st.id,
      name: def.name,
      object: def.object,
      rule: def.rule,
      chip: seatChip(st.id, st.count),
      count: st.count,
      rarity: def.rarity,
      sell: def.sell,
      copies: st.id === 'DEPUTY' ? acting[seat].id : null,
    };
  });
}

export interface PatternRow {
  id: PatternId;
  /** '???' for a secret not yet made. */
  name: string;
  shape: string;
  level: number;
  influence: number;
  momentum: number;
  made: number;
  secret: boolean;
  hidden: boolean;
}

/** Run Info: the 11 patterns with levels and values. */
export function patternTable(s: RunState): PatternRow[] {
  return PATTERNS.map((p) => {
    const level = s.world.levels[p.id];
    const v = patternValues(p.id, level);
    const hidden = p.secret && s.made[p.id] === 0;
    return {
      id: p.id,
      name: hidden ? '???' : p.name,
      shape: hidden ? '???' : p.shape,
      level,
      influence: v.influence,
      momentum: v.momentum,
      made: s.made[p.id],
      secret: p.secret,
      hidden,
    };
  });
}

export interface ArmedView {
  order: OrderId;
  name: string;
  slot: number;
  chosen: RegionId[];
  /** Regions that may be tapped next. */
  valid: RegionId[];
  kind: 'tap' | 'drag';
  prompt: string;
  canConfirm: boolean;
}

export function armedView(s: RunState): ArmedView | null {
  const a = s.armed;
  if (!a) return null;
  const def = ORDER[a.order];
  return {
    order: a.order,
    name: def.name,
    slot: a.slot,
    chosen: [...a.chosen],
    valid: validTargets(s, a.order, a.chosen),
    kind: def.targeting.kind === 'drag' ? 'drag' : 'tap',
    prompt: armedPrompt(a.order, a.chosen),
    canConfirm: canConfirmArmed(s) && a.chosen.length < def.targeting.max,
  };
}

/** Regions an offer (or seated staff) acts on, for the long-press highlight. */
export function actsOn(s: RunState, item: Offer | { kind: 'staff'; id: StaffId }): RegionId[] {
  const ports = portSet(s.world);
  const live = REGION_IDS.filter((r) => !s.world.retired.includes(r));
  const caps = live.filter((r) => baseCapital(s.world, r));
  if (item.kind === 'order') return validTargets(s, item.id, []);
  if (item.kind === 'playbook') return [];
  switch (item.id) {
    case 'HARBOUR':
    case 'ADMIRAL':
    case 'FERRY':
      return live.filter((r) => ports.has(r));
    case 'SURVEYOR':
      return live.filter((r) => REGION[r].weight <= 4);
    case 'GOVERNOR':
    case 'SIGNALS':
    case 'SOVEREIGN':
    case 'CHIEF':
      return caps;
    case 'HERALD':
      return live;
    default:
      return [];
  }
}

/**
 * A few live regions that make a pattern on this map, heaviest first: what a Playbook's long-press
 * outlines as an example. Empty when the map has no such shape (a secret not open to it).
 */
export function patternExample(s: RunState, id: PatternId): RegionId[] {
  const board = boardOf(s);
  const byWeight = [...board.live].sort((a, b) => REGION[b].weight - REGION[a].weight || compareWestEast(a, b));
  const joinsAny = (r: RegionId, set: readonly RegionId[]) => set.some((p) => board.joined(p, r));
  /** From `start`, add the heaviest joined region until there are k (never one in `avoid` or joined to it). */
  const grow = (k: number, start: RegionId | undefined, avoid: readonly RegionId[] = []): RegionId[] => {
    if (!start) return [];
    const set = [start];
    while (set.length < k) {
      const next = byWeight.find((r) => !set.includes(r) && !avoid.includes(r) && !joinsAny(r, avoid) && joinsAny(r, set));
      if (!next) return [];
      set.push(next);
    }
    return set;
  };
  const byColour = new Map<Colour, RegionId[]>();
  for (const r of byWeight) byColour.set(board.colourOf(r), [...(byColour.get(board.colourOf(r)) ?? []), r]);
  const colours = [...byColour.values()];
  switch (id) {
    case 'SINGLE':
      return byWeight.slice(0, 1);
    case 'LINK':
      return grow(2, byWeight[0]);
    case 'CHAIN':
      return grow(3, byWeight[0]);
    case 'FRONT':
      return grow(4, byWeight[0]);
    case 'NETWORK':
      return grow(5, byWeight[0]);
    case 'TWO_LINKS': {
      const a = grow(2, byWeight[0]);
      const b = grow(2, byWeight.find((r) => !a.includes(r) && !joinsAny(r, a)), a);
      return a.length && b.length ? [...a, ...b] : [];
    }
    case 'WORLDWIDE':
      return colours.length >= 5 ? colours.map((c) => c[0]).slice(0, 5) : [];
    case 'BLOC': {
      const most = [...colours].sort((a, b) => b.length - a.length)[0] ?? [];
      return most.length >= 5 ? most.slice(0, 5) : [];
    }
    case 'WHOLE_BLOC': {
      const fewest = colours.filter((c) => c.length >= 3 && c.length <= 5).sort((a, b) => a.length - b.length)[0];
      return fewest ?? [];
    }
    case 'SURROUND': {
      let best: RegionId[] = [];
      let bestSum = -1;
      for (const r of board.live) {
        const ring = [...(board.adj.get(r) ?? [])];
        if (ring.length < 3 || ring.length > 5) continue;
        const sum = ring.reduce((t, q) => t + REGION[q].weight, 0);
        if (sum > bestSum) {
          best = ring;
          bestSum = sum;
        }
      }
      return best;
    }
    case 'AROUND_THE_WORLD': {
      // Five joined regions, one of each colour: a small search, only ever run on a long-press.
      const find = (set: RegionId[]): RegionId[] | null => {
        if (set.length === 5) return set;
        const used = new Set(set.map((r) => board.colourOf(r)));
        for (const r of byWeight) {
          if (set.includes(r) || used.has(board.colourOf(r)) || !joinsAny(r, set)) continue;
          const found = find([...set, r]);
          if (found) return found;
        }
        return null;
      };
      for (const start of byWeight) {
        const found = find([start]);
        if (found) return found;
      }
      return [];
    }
  }
}

// ---------------------------------------------------------------- the Briefing and the in-tray

/** A card as the Briefing shows it (offer, folder card or tray paper). */
export interface CardView {
  kind: 'staff' | 'order' | 'playbook';
  /** StaffId, OrderId or PatternId. */
  id: string;
  name: string;
  rule: string;
  price: number;
  /** Staff only: rarity (for the rim) and the object drawn as the icon. */
  rarity: Rarity | null;
  object: string | null;
}

function card(kind: CardView['kind'], id: string): CardView {
  if (kind === 'staff') {
    const d = STAFF_DEF[id as StaffId];
    return { kind, id, name: d.name, rule: d.rule, price: d.price, rarity: d.rarity, object: d.object };
  }
  if (kind === 'order') {
    const d = ORDER[id as OrderId];
    return { kind, id, name: d.name, rule: d.rule, price: d.price, rarity: null, object: null };
  }
  const d = playbook(id as PatternId);
  return { kind, id, name: d.name, rule: d.rule, price: d.price, rarity: null, object: null };
}

export interface OfferView extends CardView {
  slot: number;
  /** Why it can't be bought right now ('Not enough Funds.'), or null. */
  reason: string | null;
}

export interface FolderView {
  kind: 'recruit' | 'orders';
  name: string;
  rule: string;
  price: number;
  status: 'sealed' | 'open' | 'used';
  /** Why it can't be opened, or null. */
  reason: string | null;
  /** The 3 cards (shown once open), each with why it can't be taken. */
  cards: Array<CardView & { index: number; reason: string | null }>;
}

export interface ShopView {
  briefing: number;
  offers: Array<OfferView | null>;
  folder: FolderView;
  rerollCost: number;
  canReroll: boolean;
  next: NextCrisisInfo;
}

/** Everything the Briefing tray draws, or null outside a Briefing. */
export function shopView(s: RunState): ShopView | null {
  const shop = s.shop;
  if (s.phase !== 'briefing' || !shop) return null;
  const offers = shop.offers.map((o, slot) => {
    if (!o) return null;
    const base = o.kind === 'playbook' ? card('playbook', o.pattern) : card(o.kind, o.id);
    return { ...base, price: o.price, slot, reason: offerProblem(s, slot) };
  });
  const f = shop.folder;
  const folder: FolderView = {
    kind: f.kind,
    name: FOLDER_NAME[f.kind],
    rule: FOLDER_RULE[f.kind],
    price: f.price,
    status: f.status,
    reason: folderProblem(s),
    cards: f.contents.map((id, index) => ({
      ...card(f.kind === 'recruit' ? 'staff' : 'order', id),
      index,
      reason: pickProblem(s, index),
    })),
  };
  return {
    briefing: shop.briefing,
    offers,
    folder,
    rerollCost: shop.rerollCost,
    canReroll: s.funds >= shop.rerollCost,
    next: nextCrisisInfo(s),
  };
}

export interface PaperView {
  slot: number;
  uid: number;
  id: OrderId;
  name: string;
  rule: string;
  sell: number;
  armed: boolean;
  /** Why it can't be armed right now (AIRLIFT outside a crisis), or null. */
  reason: string | null;
}

export function trayViews(s: RunState): PaperView[] {
  return s.tray.map((p, slot) => ({
    slot,
    uid: p.uid,
    id: p.id,
    name: ORDER[p.id].name,
    rule: ORDER[p.id].rule,
    sell: ORDER[p.id].sell,
    armed: s.armed?.slot === slot,
    reason: paperProblem(s, slot),
  }));
}
