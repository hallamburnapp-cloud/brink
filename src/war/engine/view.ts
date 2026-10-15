/**
 * Read-only views of a game for the UI (SPEC sections 8-11): the goal counts, the map, the readout,
 * the SEND label, the controls, the seats, the shop, the end card and the menu line. Nothing here
 * changes state, and the UI never computes a score: these views and state.lastSend carry every
 * number it shows. Views are memoised per state object (states are never mutated).
 */
import { REGION, type RegionId } from '../content/map';
import { STAFF_DEF, seatChip, type StaffId, type StaffTone } from '../content/staff';
import type { CrisisView, MapView, RegionView } from '../ui/map/contract';
import { IDS, isJoined, westToEast } from './board';
import { formatFunds, formatInt, formatM10Short, formatShort } from './format';
import { canAdd } from './groups';
import { nextMark, regionsWon, target } from './ladder';
import { RULES } from './rules';
import { effective, scorePins, type Features } from './score';
import { bestSeating, orderState, reduceFeatures, type DealState } from './order';
import { bestLastTurn, dealFeatures, nextShopAfter, previewNumber, sellValue, type PreviewNumber } from './shop';
import { sendProblem, swapProblem } from './run';
import type { Ending, GameState } from './types';
import { countOwner, encodeOwners, regionsOf, warSpreadTarget, winOrder } from './world';

function memo<T>(fn: (s: GameState) => T): (s: GameState) => T {
  const cache = new WeakMap<GameState, T>();
  return (s) => {
    if (cache.has(s)) return cache.get(s)!;
    const v = fn(s);
    cache.set(s, v);
    return v;
  };
}

const name = (id: RegionId) => REGION[id].name;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------- a dead deal

/** The legal sends' feature sets for one deal on one map (a tap or a seat drag does not enumerate again). */
let featureCache: { key: string; fs: Features[] } | null = null;

function lineUpFeatures(s: GameState): Features[] {
  const d = s.deal;
  const key = `${d.crisis}|${d.lit.join(',')}|${encodeOwners(s.owner)}`;
  if (featureCache?.key !== key) featureCache = { key, fs: reduceFeatures(dealFeatures(d.lit, d.crisis, s.owner)) };
  return featureCache.fs;
}

/**
 * What the game says of the deal before any pin (decisions B and B2; reference rules.py deal_state).
 * 'live': some legal send of the lit regions (the crisis among them) reaches the target with the
 * line-up as it sits. 'reorder': none does as seated, but one does under another seating (seats can
 * be dragged during a turn): the readout says REORDER STAFF TO WIN and the seats beckon. 'dead': none
 * does under any seating: NO SEND CAN WIN ('· SWAP' while SWAP can bring new regions, else how the
 * turn ends). After a swap or a seat drag it is asked again. It enumerates the legal groups with the
 * fast scorer, as the shop's preview number does, under every distinct seating (at most 120). null
 * outside phase 'choose'. The deal rule itself is unchanged.
 */
export const dealState = memo((s: GameState): DealState | null => {
  if (s.phase !== 'choose') return null;
  return orderState(lineUpFeatures(s), s.seats.map((x) => x.id), countOwner(s.owner, 'gold'), s.oldHandM10, s.deal.target);
});

/** A dead deal: no legal send of the lit regions reaches the target under any seating (dealState 'dead'). */
export const deadDeal = (s: GameState): boolean => dealState(s) === 'dead';

/** No send wins as seated, but one does after a reorder (dealState 'reorder'). */
export const reorderDeal = (s: GameState): boolean => dealState(s) === 'reorder';

/** The seating whose best send on the current deal scores most (what to drag the staff into on REORDER STAFF TO WIN). */
export function bestSeatingNow(s: GameState): StaffId[] {
  return bestSeating(lineUpFeatures(s), s.seats.map((x) => x.id), countOwner(s.owner, 'gold'), s.oldHandM10).seats;
}

// ---------------------------------------------------------------- the live preview

export interface LivePreview {
  /** Pins in tap order. */
  pins: RegionId[];
  /** Pins in scoring order (west to east). */
  order: RegionId[];
  points: bigint;
  m10: bigint;
  score: bigint;
  /**
   * Regions the send would win (0: a miss). The ladder's count, capped by what is left to win: a
   * score worth 3 regions with 2 not yet gold wins 2 (and unites the world).
   */
  regions: number;
  /** The regions it would win, in spread order (the crisis first). */
  wins: RegionId[];
  /** The send would turn every region left gold: WORLD UNITED. */
  unites: boolean;
  /** The score that wins one more region (the target while it misses). */
  nextMark: bigint;
  /** How far below the target (0 once it wins). */
  short: bigint;
  /** The crisis is pinned (its ×2 chip lights). */
  doubled: boolean;
  /** Seats that will fire with these pins (they lift on the rail). */
  firing: number[];
}

/** What the current pins would do. null outside phase 'choose' or with nothing pinned. */
export const preview = memo((s: GameState): LivePreview | null => {
  if (s.phase !== 'choose' || s.deal.pins.length === 0) return null;
  const d = s.deal;
  const res = scorePins(d.pins, s.seats.map((x) => x.id), s.owner, d.crisis, s.oldHandM10, { trace: true });
  const wins = winOrder(d.crisis, s.owner, regionsWon(res.score, d.target), d.pins);
  const firing = new Set<number>();
  for (const e of res.trace!) if (e.kind === 'staff' || e.kind === 'regionStaff') firing.add(e.seat);
  return {
    pins: [...d.pins],
    order: westToEast(d.pins),
    points: res.points,
    m10: res.m10,
    score: res.score,
    regions: wins.length,
    wins,
    unites: wins.length > 0 && countOwner(s.owner, 'gold') + wins.length === RULES.regions,
    nextMark: nextMark(res.score, d.target),
    short: res.score >= d.target ? 0n : d.target - res.score,
    doubled: d.pins.includes(d.crisis),
    firing: [...firing].sort((a, b) => a - b),
  };
});

// ---------------------------------------------------------------- the goal (Big Board)

export interface GoalView {
  gold: number;
  red: number;
  grey: number;
  /** 30 */
  goldGoal: number;
  /** 10: war holding this many is a loss. */
  warLimit: number;
  /** Where war spreads next by itself and in how many turns (3, 2, 1 = 'THIS TURN'); null when it cannot. */
  warNext: { id: RegionId; turns: number } | null;
  /**
   * The tag text: 'WAR · 3 TURNS', 'WAR · 2 TURNS', 'WAR · THIS TURN' while choosing; between turns it
   * counts from the coming turn: 'WAR · IN 2 TURNS', 'WAR · NEXT TURN' (never 'THIS TURN' over the shop).
   */
  warTag: string | null;
  /** No grey is left and war still holds some: crises flare on red. */
  finalPush: boolean;
  /**
   * The push's misses, while the game is in the final push and when it ended in its CEASEFIRE (null
   * otherwise): `left` of `limit` (3) are left, and the last of them is a CEASEFIRE. The Big Board
   * shows them as lamps beside WAR.
   */
  push: { misses: number; left: number; limit: number } | null;
  /** The ghost segments: the counts after SEND with the current pins (null with nothing pinned). */
  after: { gold: number; red: number } | null;
}

export const goalView = memo((s: GameState): GoalView => {
  const gold = countOwner(s.owner, 'gold');
  const red = countOwner(s.owner, 'red');
  let warNext: GoalView['warNext'] = null;
  if (s.phase !== 'over') {
    const id = warSpreadTarget(s.owner);
    const t = s.phase === 'choose' ? s.turn : s.turn + 1;
    if (id) warNext = { id, turns: RULES.warEvery - ((t - 1) % RULES.warEvery) };
  }
  const p = preview(s);
  let after: GoalView['after'] = null;
  if (p) {
    if (p.regions > 0) {
      const retaken = p.wins.filter((r) => s.owner[r] === 'red').length;
      after = { gold: gold + p.wins.length, red: red - retaken };
    } else {
      after = { gold, red: s.deal.finalPush ? red : red + 1 };
    }
  }
  const finalPush = s.phase === 'choose' ? s.deal.finalPush : gold + red === RULES.regions && red > 0;
  return {
    gold,
    red,
    grey: RULES.regions - gold - red,
    goldGoal: RULES.regions,
    warLimit: RULES.loseAt,
    warNext,
    warTag: warNext ? warTagText(warNext.turns, s.phase !== 'choose') : null,
    finalPush,
    // The push's lamps stay on the board through its CEASEFIRE (all out), and go with any other end.
    push:
      finalPush && (!s.ending || s.ending === 'CEASEFIRE')
        ? { misses: s.pushMisses, left: RULES.pushMisses - s.pushMisses, limit: RULES.pushMisses }
        : null,
    after,
  };
});

/** The war tag's words (the map draws the same: ui/map/layers/markers.ts warTagText). */
function warTagText(turns: number, between: boolean): string {
  if (between) return turns === 1 ? 'WAR · NEXT TURN' : `WAR · IN ${turns} TURNS`;
  return turns === 1 ? 'WAR · THIS TURN' : `WAR · ${turns} TURNS`;
}

// ---------------------------------------------------------------- the map

/** Every region as the map draws it (the RegionView shape of ui/map/contract.ts). */
export const regionViews = memo((s: GameState): Record<RegionId, RegionView> => {
  const choosing = s.phase === 'choose';
  const d = s.deal;
  const p = preview(s);
  const previewOf = new Map<RegionId, RegionView['preview']>();
  if (p && p.regions > 0) p.wins.forEach((r, i) => previewOf.set(r, { kind: 'win', order: i + 1 }));
  else if (p && !d.finalPush) previewOf.set(d.crisis, { kind: 'war', order: 1 });
  const out: Record<RegionId, RegionView> = {};
  for (const id of IDS) {
    const def = REGION[id];
    // Between turns nothing is lit: the map shows the plain world (gold, grey plates, hatched red).
    const lit = choosing && (id === d.crisis || d.lit.includes(id));
    const pinned = choosing && d.pins.includes(id);
    const addable = choosing && !pinned && lit && canAdd(d.pins, id, d.lit, d.crisis);
    out[id] = {
      id,
      colour: def.colour,
      owner: s.owner[id],
      lit,
      pinned,
      addable,
      joinable: addable && d.pins.length > 0,
      capital: def.capital,
      port: def.port,
      preview: previewOf.get(id) ?? null,
    };
  }
  return out;
});

/** The whole MapView. The UI may set highlight, finger and hover on a copy. */
export const mapView = memo((s: GameState): MapView => {
  const choosing = s.phase === 'choose';
  const d = s.deal;
  const order = choosing ? westToEast(d.pins) : [];
  const joinedPins: Array<[RegionId, RegionId]> = [];
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) if (isJoined(order[i], order[j])) joinedPins.push([order[i], order[j]]);
  }
  const crisis: CrisisView | null = choosing
    ? { id: d.crisis, target: formatInt(d.target), doubled: d.pins.includes(d.crisis) }
    : null;
  return {
    regions: regionViews(s),
    joinedPins,
    crisis,
    warNext: goalView(s).warNext,
    ceased: s.ending === 'CEASEFIRE',
    highlight: null,
    finger: null,
    hover: null,
  };
});

/** Regions a staff acts on (the long-press highlight): your gold, ports or capitals. */
export function actsOn(s: GameState, id: StaffId): RegionId[] {
  switch (STAFF_DEF[id].actsOn) {
    case 'gold':
      return regionsOf(s.owner, 'gold');
    case 'port':
      return IDS.filter((r) => REGION[r].port);
    case 'capital':
      return IDS.filter((r) => REGION[r].capital);
    default:
      return id === 'HERALD' ? [...IDS] : [];
  }
}

// ---------------------------------------------------------------- the readout and controls

export interface ReadoutView {
  target: bigint;
  /** '1,100' (the readout prints 'TARGET' before it). */
  targetText: string;
  /**
   * 'NEED 1,100' before the pins win; 'NEXT REGION AT 4,400' once they do; 'UNITES THE WORLD' when
   * nothing is left beyond. Before any pin: 'NO SEND CAN WIN' on a dead deal, 'REORDER STAFF TO WIN'
   * when only another seating wins.
   */
  line: string;
  nextMark: bigint;
  /** Regions the pins would win now. */
  regions: number;
  points: bigint;
  m10: bigint;
  /** The POINTS box: '40'. */
  pointsText: string;
  /** The MULTIPLIER box: '1,381.4'. */
  multiplierText: string;
  score: bigint;
  /** The live score is within 10% below the next mark (the coach's 'Close to the next region'). */
  nearNext: boolean;
  /** What the deal allows (dealState): 'live', 'reorder' or 'dead' (null outside a turn). */
  deal: DealState | null;
  /** A dead deal: no legal send of the lit regions reaches the target under any seating. */
  dead: boolean;
  /** No send wins as seated, one does after a reorder: REORDER STAFF TO WIN. */
  reorder: boolean;
}

/** What the readout says before any pin when the deal cannot be won as it stands. */
export const DEAL_LINE: Readonly<Record<'reorder' | 'dead', string>> = { reorder: 'REORDER STAFF TO WIN', dead: 'NO SEND CAN WIN' };

export const readoutView = memo((s: GameState): ReadoutView => {
  const p = preview(s);
  const last = s.phase === 'choose' ? null : s.lastSend;
  const T = s.deal.target;
  const score = p?.score ?? last?.score ?? 0n;
  const points = p?.points ?? last?.points ?? 0n;
  const m10 = p?.m10 ?? last?.m10 ?? 0n;
  const regions = p ? p.regions : last ? last.regions : 0;
  const next = p || last ? nextMark(score, T) : T;
  // Nothing left to win beyond these: there is no next region, the send unites the world.
  const unites = !!p?.unites;
  const deal = dealState(s);
  return {
    target: T,
    targetText: formatInt(T),
    line:
      !p && (deal === 'dead' || deal === 'reorder')
        ? DEAL_LINE[deal]
        : unites
          ? 'UNITES THE WORLD'
          : regions > 0
            ? `NEXT REGION AT ${formatInt(next)}`
            : `NEED ${formatInt(next)}`,
    nextMark: next,
    regions,
    points,
    m10,
    pointsText: formatShort(points, 6),
    multiplierText: formatM10Short(m10, 7),
    score,
    nearNext: p !== null && !unites && next - score <= next / 10n,
    deal,
    dead: deal === 'dead',
    reorder: deal === 'reorder',
  };
});

export interface SendLabel {
  /**
   * 'WINS 2 REGIONS', 'MISS · SHORT BY 620', in the final push 'MISS · 2 MISSES LEFT', 'MISS · 1 MISS
   * LEFT', then 'MISS · CEASEFIRE' on its last miss; 'PIN A REGION' before any pin. On a dead deal,
   * before any pin: 'NO SEND CAN WIN · SWAP' while SWAP can bring new regions, else how the turn ends:
   * 'NO SEND CAN WIN · SEND TO PASS' ('NO SEND CAN WIN · USES A MISS' in the final push). '' outside a turn.
   */
  text: string;
  /** 'win' gold, 'miss' red (a dead deal too), 'off' disabled at 40%. */
  tone: 'win' | 'miss' | 'off';
  /** SEND can be pressed: pins are down and legal (a dead deal too, once a pin is down). */
  enabled: boolean;
  regions: number;
  /** A dead deal: no legal send of the lit regions reaches the target under any seating. */
  dead: boolean;
  /** No send wins as seated, one does after a reorder (the readout says REORDER STAFF TO WIN). */
  reorder: boolean;
}

/** The lever on a dead deal, before any pin: what can change it (SWAP), or how the turn ends. */
export function deadLabel(s: GameState): string {
  const how = swapProblem(s) === null ? 'SWAP' : s.deal.finalPush ? 'USES A MISS' : 'SEND TO PASS';
  return `${DEAL_LINE.dead} · ${how}`;
}

/** 'MISS · 2 MISSES LEFT', 'MISS · 1 MISS LEFT', or 'MISS · CEASEFIRE' for the push's last miss. */
export function pushMissLabel(missesBefore: number): string {
  const left = RULES.pushMisses - missesBefore - 1;
  return left > 0 ? `MISS · ${plural(left, 'MISS', 'MISSES')} LEFT` : 'MISS · CEASEFIRE';
}

export const sendLabel = memo((s: GameState): SendLabel => {
  if (s.phase !== 'choose') return { text: '', tone: 'off', enabled: false, regions: 0, dead: false, reorder: false };
  const p = preview(s);
  const deal = dealState(s);
  const dead = deal === 'dead';
  const reorder = deal === 'reorder';
  if (!p) {
    if (dead) return { text: deadLabel(s), tone: 'miss', enabled: false, regions: 0, dead, reorder };
    return { text: 'PIN A REGION', tone: 'off', enabled: false, regions: 0, dead, reorder };
  }
  const enabled = sendProblem(s) === null;
  if (p.regions > 0) return { text: `WINS ${plural(p.regions, 'REGION', 'REGIONS')}`, tone: 'win', enabled, regions: p.regions, dead, reorder };
  // The push forgives: the label counts what this miss would leave; its last miss is the ceasefire.
  if (s.deal.finalPush) return { text: pushMissLabel(s.pushMisses), tone: 'miss', enabled, regions: 0, dead, reorder };
  return { text: `MISS · SHORT BY ${formatInt(p.short)}`, tone: 'miss', enabled, regions: 0, dead, reorder };
});

export interface ControlsView {
  /** `beckon`: the deal is dead and SWAP can still bring new regions. */
  swap: { enabled: boolean; sub: string; reason: string | null; beckon: boolean };
  coins: number;
  /** '◆ 7' */
  coinsText: string;
  send: SendLabel;
  /** The seats beckon: no send wins as seated, one does after a reorder (REORDER STAFF TO WIN). */
  seatsBeckon: boolean;
}

export const controlsView = memo((s: GameState): ControlsView => {
  const reason = swapProblem(s);
  const d = s.deal;
  const pileEmpty = d.swapsLeft > 0 && !d.swapLocked && d.pile.length === 0;
  const sub = d.swapLocked ? 'from turn 2' : d.swapsLeft === 0 ? 'used' : pileEmpty ? 'no new regions' : `${d.swapsLeft} left`;
  return {
    swap: { enabled: reason === null, sub, reason, beckon: reason === null && deadDeal(s) },
    coins: s.coins,
    coinsText: formatFunds(s.coins, { spaced: true }),
    send: sendLabel(s),
    seatsBeckon: reorderDeal(s),
  };
});

// ---------------------------------------------------------------- the staff rail

export interface SeatView {
  /** 0 = leftmost. */
  seat: number;
  uid: number;
  id: StaffId;
  name: string;
  object: string;
  rule: string;
  price: number;
  sell: number;
  /** 'SELL ◆3' */
  sellText: string;
  /** The live chip: '+4', '+7', '×1.4', '×2 CAPITAL', 'COPY'. */
  chip: string;
  /** The chip as printed, one or two lines: ['ALL PINS', '★ ⚓'], ['COPY', '→ Sovereign']. */
  chipLines: string[];
  /** Chip colour: cyan for points, amber for multiplier (a Deputy takes what it copies). */
  tone: StaffTone;
  /** A Deputy: the staff it copies now (null at the far right or beside the Herald). */
  copies: StaffId | null;
  /** Hired since the last send: its first firing is drawn larger ('+4 · new'). */
  isNew: boolean;
}

export const seatViews = memo((s: GameState): SeatView[] => {
  const ids = s.seats.map((x) => x.id);
  const eff = effective(ids);
  const gold = countOwner(s.owner, 'gold');
  return s.seats.map((x, seat) => {
    const def = STAFF_DEF[x.id];
    const chip = seatChip(x.id, { gold, oldHandM10: s.oldHandM10 });
    const copies = x.id === 'DEPUTY' ? eff[seat] : null;
    let chipLines = [chip];
    if (x.id === 'HERALD') chipLines = ['ALL PINS', '★ ⚓'];
    else if (x.id === 'DEPUTY' && copies) chipLines = ['COPY', `→ ${STAFF_DEF[copies].name}`];
    return {
      seat,
      uid: x.uid,
      id: x.id,
      name: def.name,
      object: def.object,
      rule: def.rule,
      price: def.price,
      sell: def.sell,
      sellText: `SELL ${formatFunds(def.sell)}`,
      chip,
      chipLines,
      tone: copies ? STAFF_DEF[copies].tone : def.tone,
      copies,
      isNew: s.hiredSinceSend.includes(x.uid),
    };
  });
});

// ---------------------------------------------------------------- the shop

export interface PreviewLine extends PreviewNumber {
  /** '390 → 2,343' (the card prints 'BEST LAST TURN' above it). */
  text: string;
  beforeText: string;
  afterText: string;
}

export interface OfferView {
  slot: number;
  /** null once hired. */
  id: StaffId | null;
  name: string;
  object: string;
  rule: string;
  price: number;
  /** '◆6' */
  priceText: string;
  /** Can be hired now: into a free seat with the coins in hand. */
  affordable: boolean;
  /** Can be hired after selling a seat (with a full table: replacing that seat). */
  affordableWithSale: boolean;
  /** Why it cannot be hired into a free seat now, or null. */
  reason: string | null;
  /** The card's preview line: into the first free seat, or (full table) the best seat to replace. */
  preview: PreviewLine | null;
  /** Full table only: the tag on each seat if this offer replaced it. */
  replace: Array<{ seat: number; after: bigint; text: string; affordable: boolean }> | null;
}

export interface ShopView {
  visit: number;
  nextTarget: bigint;
  /** 'SHOP · NEXT TARGET 1,600' */
  title: string;
  /**
   * The line-up's best send last turn (the cards' left number) cannot beat the next target: the
   * header says so ('YOUR BEST 2,926 · NEXT TARGET 5,500'), a turn before the misses come.
   */
  behind: { best: bigint; text: string } | null;
  offers: OfferView[];
  reroll: { cost: number; text: string; enabled: boolean };
  /** All 5 seats are taken: hiring means replacing a seat. */
  fullTable: boolean;
  /** No offer is affordable even after a sale: NEXT TURN pulses at once. */
  nothingAffordable: boolean;
  /** The receipt: 'LAST TURN · WIN 2 · +◆2', and 'WAR SPREAD TO MARRAM' when it did. */
  receipt: { line: string; spread: string | null } | null;
}

function previewLine(p: PreviewNumber): PreviewLine {
  const beforeText = formatInt(p.before);
  const afterText = formatInt(p.after);
  return { ...p, beforeText, afterText, text: `${beforeText} → ${afterText}` };
}

/** The receipt for the turn just played. */
export function receipt(s: GameState): ShopView['receipt'] {
  const r = s.lastSend;
  if (!r) return null;
  const gained = r.coinsAfter - r.coinsBefore;
  const left = RULES.pushMisses - r.pushMisses;
  const line =
    r.result === 'win'
      ? `LAST TURN · WIN ${r.regions} · +${formatFunds(gained)}`
      : r.ending === 'CEASEFIRE'
        ? 'LAST TURN · MISS · CEASEFIRE'
        : r.finalPush
          ? `LAST TURN · MISS · ${plural(left, 'MISS', 'MISSES')} LEFT`
          : `LAST TURN · MISS · WAR TOOK ${name(r.crisis).toUpperCase()}`;
  return { line, spread: r.spread ? `WAR SPREAD TO ${name(r.spread.id).toUpperCase()}` : null };
}

export const shopView = memo((s: GameState): ShopView | null => {
  if (s.phase !== 'shop' || !s.shop) return null;
  const shop = s.shop;
  const full = s.seats.length >= RULES.seats;
  const maxSell = s.seats.reduce((m, x) => Math.max(m, sellValue(x.id)), 0);
  const offers = shop.offers.map((id, slot): OfferView => {
    if (!id) {
      return {
        slot, id: null, name: '', object: '', rule: '', price: 0, priceText: '',
        affordable: false, affordableWithSale: false, reason: 'Already hired.', preview: null, replace: null,
      };
    }
    const def = STAFF_DEF[id];
    const affordable = !full && s.coins >= def.price;
    const affordableWithSale = s.coins + maxSell >= def.price || affordable;
    const p = previewNumber(s, slot);
    const replace = full
      ? s.seats.map((x, seat) => {
          const after = previewNumber(s, slot, seat)!.after;
          return { seat, after, text: formatInt(after), affordable: s.coins + sellValue(x.id) >= def.price };
        })
      : null;
    return {
      slot,
      id,
      name: def.name,
      object: def.object,
      rule: def.rule,
      price: def.price,
      priceText: formatFunds(def.price),
      affordable,
      affordableWithSale,
      reason: full ? 'Full table. Tap a seat to replace it.' : affordable ? null : 'Not enough coins.',
      preview: p && previewLine(p),
      replace,
    };
  });
  const nextTarget = target(s.turn + 1);
  const best = bestLastTurn(s, s.seats.map((x) => x.id));
  return {
    visit: shop.visit,
    nextTarget,
    title: `SHOP · NEXT TARGET ${formatInt(nextTarget)}`,
    behind: best < nextTarget ? { best, text: `YOUR BEST ${formatInt(best)} · NEXT TARGET ${formatInt(nextTarget)}` } : null,
    offers,
    reroll: { cost: shop.rerollCost, text: `REROLL ${formatFunds(shop.rerollCost)}`, enabled: s.coins >= shop.rerollCost },
    fullTable: full,
    nothingAffordable: !offers.some((o) => o.affordableWithSale),
    receipt: receipt(s),
  };
});

// ---------------------------------------------------------------- the end card

export interface EndView {
  ending: Ending;
  /** 3 WORLD UNITED; 2 CEASEFIRE holding 25-29; 1 CEASEFIRE holding 21-24; 0 WAR. */
  stars: number;
  /** 'WORLD UNITED · 30 of 30', 'CEASEFIRE · 26 of 30 gold', 'WAR'. */
  title: string;
  /** The card's lines under the title, in order. */
  lines: string[];
  turn: number;
  gold: number;
  red: number;
  grey: number;
  peakWar: number;
  /** '749,414 · 39x the target' */
  best: { score: bigint; target: bigint; text: string } | null;
  /** The most regions won in one send: '7 regions'. */
  biggestTurn: { regions: number; text: string } | null;
  /** The staff in seat order. */
  staff: StaffId[];
  /** WAR with 3 or fewer grey regions left: they are outlined gold on the dark map. */
  nearMiss: RegionId[];
}

/** 'three times': the push's misses in words, for the CEASEFIRE card. */
const PUSH_TIMES = ['no times', 'once', 'twice', 'three times', 'four times', 'five times'][RULES.pushMisses] ?? `${RULES.pushMisses} times`;

function timesTarget(score: bigint, T: bigint): string {
  if (score >= 10n * T) return `${formatInt(score / T)}x`;
  const tenths = (score * 10n) / T;
  return `${tenths / 10n}.${tenths % 10n}x`;
}

export const endView = memo((s: GameState): EndView | null => {
  if (!s.ending) return null;
  const gold = countOwner(s.owner, 'gold');
  const red = countOwner(s.owner, 'red');
  const grey = RULES.regions - gold - red;
  const lines: string[] = [];
  let title: string;
  let stars = 0;
  let nearMiss: RegionId[] = [];
  if (s.ending === 'WORLD UNITED') {
    stars = 3;
    title = `WORLD UNITED · ${gold} of ${RULES.regions}`;
    lines.push(`Turn ${s.turn} · war peaked at ${s.peakWar}`);
  } else if (s.ending === 'CEASEFIRE') {
    stars = gold >= 25 ? 2 : 1;
    title = `CEASEFIRE · ${gold} of ${RULES.regions} gold`;
    lines.push(`The final push missed ${PUSH_TIMES}.`);
    lines.push(`War held ${plural(red, 'region', 'regions')} when it stopped.`);
  } else {
    title = 'WAR';
    lines.push(`War took ${plural(red, 'region', 'regions')}. You held ${gold} of ${RULES.regions}.`);
    if (grey > 0 && grey <= 3) {
      nearMiss = regionsOf(s.owner, 'grey');
      lines.push(`Only ${plural(grey, 'free region was', 'free regions were')} left to win.`);
    }
  }
  const biggest = s.log.reduce((m, l) => Math.max(m, l.regions), 0);
  return {
    ending: s.ending,
    stars,
    title,
    lines,
    turn: s.turn,
    gold,
    red,
    grey,
    peakWar: s.peakWar,
    best: s.best && {
      score: s.best.score,
      target: s.best.target,
      // A best send that missed says what it needed, never '0.0x the target'.
      text:
        s.best.score >= s.best.target
          ? `${formatInt(s.best.score)} · ${timesTarget(s.best.score, s.best.target)} the target`
          : `${formatInt(s.best.score)} · needed ${formatInt(s.best.target)}`,
    },
    // No region won all game: no 'biggest turn' (never '0 regions').
    biggestTurn: biggest > 0 ? { regions: biggest, text: plural(biggest, 'region', 'regions') } : null,
    staff: s.seats.map((x) => x.id),
    nearMiss,
  };
});

// ---------------------------------------------------------------- the menu

export interface MenuView {
  turn: number;
  nextShopAfter: number;
  /** 'Turn 9 · next shop after turn 10' */
  line: string;
}

export function menuView(s: GameState): MenuView {
  const after = nextShopAfter(s.phase === 'choose' ? s.turn : s.turn + 1);
  return { turn: s.turn, nextShopAfter: after, line: `Turn ${s.turn} · next shop after turn ${after}` };
}
