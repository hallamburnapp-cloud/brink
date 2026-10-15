/**
 * The teaching, as pure rules (SPEC section 4): what the coached first turn lets the player do at
 * each step, and which coach line a moment earns. No timers and no storage here: hints.ts plays
 * the lines and remembers which one-time lines a device has seen.
 */
import { REGION } from '../../content/map';
import { STAFF_DEF, STAFF_IDS, type StaffId } from '../../content/staff';
import {
  ADJ,
  bestScore,
  dealState,
  formatInt,
  goalView,
  preview,
  price,
  readoutView,
  regionViews,
  RULES,
  sellValue,
  sendLabel,
  shopDue,
  shopView,
  swapProblem,
  type GameState,
  type RegionId,
} from '../../engine';

// ---------------------------------------------------------------- the coached first turn

export interface TurnOneStep {
  /** 1: tap the crisis. 2: a region touching it. 3: more pins. 4: WINS 2 is showing (send). */
  step: 1 | 2 | 3 | 4;
  /** The regions a tap may pin or lift now (null: whatever the rules allow). */
  tappable: RegionId[] | null;
  /** SEND may be pressed: only once the pins win. */
  send: boolean;
  /** The teaching finger pulses here. */
  finger: RegionId | null;
}

/** The coached turn: turn 1 of the first game (seed FIRST-WORLD, also PRACTICE). */
function isCoachedTurnOne(s: GameState): boolean {
  return s.mode === 'first' && s.turn === 1 && s.phase === 'choose';
}

/** What turn 1 allows now, or null outside it. Each step enables only what it names. */
export function turnOneStep(s: GameState): TurnOneStep | null {
  if (!isCoachedTurnOne(s)) return null;
  const { crisis, pins } = s.deal;
  if (!pins.includes(crisis)) return { step: 1, tappable: [crisis, ...pins], send: false, finger: crisis };
  if (pins.length === 1) return { step: 2, tappable: null, send: false, finger: null };
  const p = preview(s);
  const regions = p?.regions ?? 0;
  return { step: regions >= 2 ? 4 : 3, tappable: null, send: regions >= 1, finger: null };
}

// ---------------------------------------------------------------- coach lines

export type CoachSpot = 'map' | 'tray';

export interface Line {
  /** Identifies the line: one-time lines are remembered by it. */
  key: string;
  text: string;
  /** How long it stays (ms); Infinity stays until the next line replaces it. */
  ms: number;
  at: CoachSpot;
  /** 'device': shown once per device, ever. 'game': once per game. null: whenever earned. */
  once: 'device' | 'game' | null;
  /** The control that beckons while this line is up. */
  beckon?: 'send' | 'swap';
  /**
   * A teaching line that must be read: it stays its whole time (a queued line waits, a tap does not
   * end it). Other timed lines give way to a newer line once they have been up a moment.
   */
  full?: boolean;
}

const STICKY = Infinity;
const LINE_MS = 3500;
/** War's own spread: up through its ink and the 'WAR · NOW' hold; the next deal clears it sooner. */
const SPREAD_LINE_MS = 2600;

function line(key: string, text: string, ms: number, once: Line['once'] = null, at: CoachSpot = 'map', beckon?: Line['beckon']): Line {
  return { key, text, ms, at, once, ...(beckon ? { beckon } : {}) };
}

/** A teaching line: it stays its whole time. */
function teach(l: Line): Line {
  return { ...l, full: true };
}

const regionName = (id: RegionId) => REGION[id].name;

/** The lines the first turn's steps earn (prev is the game before the tap, null at the start). */
function turnOneLines(prev: GameState | null, s: GameState): Line[] {
  const now = turnOneStep(s);
  if (!now) return [];
  const was = prev ? turnOneStep(prev) : null;
  if (was && was.step === now.step) return [];
  switch (now.step) {
    case 1:
      return [line('t1-crisis', 'Tap the crisis: the white ring.', STICKY)];
    case 2:
      return [line('t1-touch', 'Now a lit region touching it.', STICKY)];
    case 3: {
      const out: Line[] = [];
      const p = preview(s);
      if (was?.step === 2 && p && p.regions > 0) {
        const beats = `${formatInt(p.score)} beats ${formatInt(s.deal.target)}. ${regionName(s.deal.crisis)} will turn gold.`;
        out.push(teach(line('t1-beats', beats, 2200)));
      }
      out.push(line('t1-more', 'More pins score more. Up to 5.', STICKY));
      return out;
    }
    case 4:
      return [
        teach(line('t1-bymore', 'Beat it by more: win more regions. Your pins go first.', 3000, 'game', 'map', 'send')),
        line('t1-send', 'SEND.', STICKY, null, 'map', 'send'),
      ];
  }
}

/** A new turn has been dealt: prev is the game before (the outcome or shop), s the new deal. */
function turnStartLines(s: GameState): Line[] {
  const out: Line[] = [];
  if (s.mode === 'first' && s.turn === 2) {
    out.push(teach(line('t2-gold', 'Gold regions can be pinned too.', 3500, 'game')));
    out.push(teach(line('t2-swap', 'Once a turn, SWAP brings new regions. Your pins stay.', 4000, 'game', 'map', 'swap')));
  }
  if (s.mode === 'first' && s.turn === 3) out.push(teach(line('t3-war', 'Every 3rd turn war spreads into the red tag. Pin it in a win to save it.', 4500, 'game')));
  if (s.deal.finalPush) out.push(teach(line('push', PUSH_LINE, 4500, 'device')));
  const deal = dealLines(s);
  out.push(...deal);
  if (!deal.length) out.push(...unlitGoldLines(s));
  return out;
}

/** The best any legal send of the lit regions scores now (the fast scorer, a few hundred groups). */
export function bestNow(s: GameState): bigint {
  return bestScore(
    s.deal.lit,
    s.deal.crisis,
    s.owner,
    s.seats.map((x) => x.id),
    s.oldHandM10,
  );
}

/** The final push, said once (SPEC section 4). */
export const PUSH_LINE = 'No grey left. Win back the red. Three misses: ceasefire.';
/** A dead deal, explained once, with a swap left (SWAP beckons) and a hire within reach at the next shop. */
export const DEAD_LINE = 'Nothing here can win. SWAP for new regions, and hire stronger staff at the next shop.';
/** ...with a swap left, when no hire is within reach (no shop after this turn, or nothing likely affordable). */
export const DEAD_SWAP_LINE = 'Nothing here can win. SWAP for new regions.';
/** ...once SWAP cannot help (used, locked, or nothing left to bring) and a hire is within reach. */
export const DEAD_STAFF_LINE = 'Nothing here can win. Hire stronger staff at the next shop.';
/** ...once SWAP cannot help and no hire is within reach: how to end the turn. */
export const DEAD_PASS_LINE = 'Nothing here can win. Pin one region and send to move on.';
/** No send wins as seated, but one does in another order (the readout says REORDER STAFF TO WIN). */
export const REORDER_LINE = 'Drag your staff into a new order: this deal can win.';

/**
 * A hire is within reach: a shop opens after this turn, and the coins (a miss pays none), with the
 * best sale when every seat is taken, buy at least one of the staff it can offer.
 */
export function hireLikely(s: GameState): boolean {
  if (!shopDue(s.turn)) return false;
  const seated = new Set(s.seats.map((x) => x.id));
  const sale = s.seats.length >= RULES.seats ? Math.max(0, ...s.seats.map((x) => sellValue(x.id))) : 0;
  return STAFF_IDS.some((id) => !seated.has(id) && price(id) <= s.coins + sale);
}

/**
 * What the deal allows, said once each (a dealt turn, or after a swap). The readout and the SEND lever
 * say it every time: 'NO SEND CAN WIN' ('· SWAP' while it can help, and SWAP beckons; else how the turn
 * ends), or 'REORDER STAFF TO WIN' (the seats to move beckon). The coach explains: what can change it
 * now (a reorder, SWAP), what changes it for good (staff, only when a hire is within reach), or how to
 * move on.
 */
function dealLines(s: GameState): Line[] {
  const state = dealState(s);
  if (state === 'reorder') return [teach(line('reorder', REORDER_LINE, 4500, 'device'))];
  if (state !== 'dead') return [];
  const hire = hireLikely(s);
  if (swapProblem(s) === null) return [teach(hire ? line('dead', DEAD_LINE, 5000, 'device', 'map', 'swap') : line('dead-swap', DEAD_SWAP_LINE, 4500, 'device', 'map', 'swap'))];
  return [teach(hire ? line('dead-staff', DEAD_STAFF_LINE, 4500, 'device') : line('dead-pass', DEAD_PASS_LINE, 4500, 'device'))];
}

/** A push miss that left the push going: what is left of it. */
export function pushMissLine(left: number): Line {
  const text = left <= 1 ? 'Missed. The red holds. Miss once more: ceasefire.' : `Missed. The red holds. ${left === 2 ? 'Two' : String(left)} misses left.`;
  return line('push-miss', text, LINE_MS);
}

/** A send has resolved: prev was the game SEND was pressed on. */
function sendLines(prev: GameState, s: GameState): Line[] {
  const rec = s.lastSend;
  if (!rec || s.phase === 'over') return [];
  const out: Line[] = [];
  if (prev.mode === 'first' && prev.turn === 1 && rec.result === 'win') out.push(teach(line('t1-gold', 'Gold is yours for good. Each region won pays ◆1.', LINE_MS, 'game')));
  if (rec.result === 'miss' && rec.lost) out.push(line('miss', 'War took it. Ten red and you lose.', LINE_MS, 'device'));
  if (rec.result === 'miss' && rec.finalPush) out.push(pushMissLine(RULES.pushMisses - rec.pushMisses));
  // War's own spread is named by the director, with its drum (spreadLine), not here after the send.
  const g = goalView(s);
  if (g.red >= 8 && goalView(prev).red < 8) out.push(line('war8', warStakes(g.warLimit - g.red), LINE_MS, 'device'));
  return out;
}

/** The stakes as war nears its limit, with the number that is really left. */
export function warStakes(left: number): string {
  return left <= 1 ? 'One more red and the war wins.' : `${left === 2 ? 'Two' : String(left)} more red and the war wins.`;
}

/**
 * War spread by itself: every time, in every game, the region named (half of war's own moves come
 * on turns with no shop and no receipt). Said as the drum sounds; the next deal clears it.
 */
export function spreadLine(region: RegionId): Line {
  return line('spread', `War spread to ${regionName(region)} by itself.`, SPREAD_LINE_MS);
}

/** The shop has opened, or changed. */
function shopLines(prev: GameState | null, s: GameState): Line[] {
  if (s.phase !== 'shop' || !s.shop) return [];
  const out: Line[] = [];
  const opened = prev?.phase !== 'shop';
  if (opened && s.mode === 'first' && s.shop.visit === 1) {
    out.push(teach(line('shop-hire', 'Hire staff. They boost every send. The number shows by how much.', 6000, 'game', 'tray')));
  }
  // The first card that scores ports or capitals: the marks on the map, said once.
  const marks = s.shop.offers.some((id) => id !== null && (STAFF_DEF[id].actsOn === 'port' || STAFF_DEF[id].actsOn === 'capital' || id === 'HERALD'));
  if (opened && marks) out.push(teach(line('marks', '⚓ marks a port, ★ a capital. Some staff score them.', 4500, 'device', 'tray')));
  // A full table is taught when a shop opens on one (when there is something to replace), read in full.
  if (opened && s.seats.length >= 5 && s.shop.offers.some((o) => o !== null)) {
    out.push(teach(line('full', 'Full table. Tap a seat to replace it.', 4500, 'device', 'tray')));
  }
  // The header says YOUR BEST ... · NEXT TARGET ... in red: said in words the first time.
  if (opened && shopView(s)?.behind) out.push(teach(line('behind', 'Behind: your best last turn would miss the next target. Hire to catch up.', 5000, 'device', 'tray')));
  return out;
}

/**
 * A + staff has just landed to the right of a × staff (hires take the leftmost free seat): order
 * matters and dragging fixes it, said once.
 */
function orderLines(prev: GameState | null, s: GameState): Line[] {
  if (!prev || s.seats.length <= prev.seats.length || !adderRightOfMultiplier(s.seats.map((x) => x.id))) return [];
  return [teach(line('order', 'Order matters: + multiplier staff work best left of × staff. Drag to reorder.', 4500, 'device', s.phase === 'shop' ? 'tray' : 'map'))];
}

/** Staff that add to the MULTIPLIER (order-sensitive; + points can sit anywhere) and staff that multiply it. */
const ADDS_MULT: ReadonlySet<StaffId> = new Set(['DUTY', 'SURVEYOR']);
const TIMES_MULT: ReadonlySet<StaffId> = new Set(['OLDHAND', 'SOVEREIGN', 'STRATEGIST', 'GOVERNOR', 'HARBOUR']);

/** A + multiplier staff sits right of a × staff: it would add more on the left. */
export function adderRightOfMultiplier(seats: readonly StaffId[]): boolean {
  let multiplied = false;
  for (const id of seats) {
    if (TIMES_MULT.has(id)) multiplied = true;
    else if (multiplied && ADDS_MULT.has(id)) return true;
  }
  return false;
}

/** Lines earned while choosing (a tap, a swap). */
function choosingLines(prev: GameState | null, s: GameState): Line[] {
  if (s.phase !== 'choose') return [];
  const out: Line[] = [];
  // After a swap the deal is asked again (on any turn): dead, or won only by a reorder, it is said.
  const swapped = !!prev && prev.phase === 'choose' && prev.turn === s.turn && prev.deal.swapsLeft > s.deal.swapsLeft;
  if (swapped) out.push(...dealLines(s));
  if (s.turn === 1) return out;
  const label = sendLabel(s);
  // A miss with no way to grow it here (5 pins, or nothing lit can be added) and SWAP pressable.
  if (label.tone === 'miss' && swapProblem(s) === null && !s.deal.finalPush && (s.deal.pins.length >= 5 || boxedIn(s))) {
    out.push(line('swap', 'Short? SWAP brings new regions. Your pins stay.', 4500, 'device', 'map', 'swap'));
  }
  if (readoutView(s).nearNext && !(prev && prev.phase === 'choose' && readoutView(prev).nearNext)) {
    out.push(line('near', 'Close to the next region. Try other pins.', LINE_MS, 'device'));
  }
  return out;
}

/** Your own gold touches the crisis but is not lit this turn: only lit regions can be pinned (said once). */
function unlitGoldLines(s: GameState): Line[] {
  if (s.phase !== 'choose' || s.mode === 'first' && s.turn <= 2) return [];
  const d = s.deal;
  const unlit = ADJ[d.crisis].some((r) => s.owner[r] === 'gold' && !d.lit.includes(r));
  if (!unlit) return [];
  const text = swapProblem(s) === null ? 'Only lit regions can be pinned. SWAP brings others.' : 'Only lit regions can be pinned, even your own gold.';
  return [line('unlit-gold', text, 4500, 'device', 'map', swapProblem(s) === null ? 'swap' : undefined)];
}

/** Pins are down and no lit region can be added to them. */
function boxedIn(s: GameState): boolean {
  if (s.deal.pins.length === 0) return false;
  return !Object.values(regionViews(s)).some((r) => r.addable);
}

/** The Deputy has just taken a seat. */
function deputyLines(prev: GameState | null, s: GameState): Line[] {
  const had = !!prev?.seats.some((x) => x.id === 'DEPUTY');
  return !had && s.seats.some((x) => x.id === 'DEPUTY') ? [line('deputy', 'The Deputy copies whoever sits to its right.', 4500, 'device', s.phase === 'shop' ? 'tray' : 'map')] : [];
}

/**
 * Every line the move from `prev` to `s` earns, in the order they should show. `prev` is null when a
 * game is first put on the table. The caller drops one-time lines already seen.
 */
export function linesFor(prev: GameState | null, s: GameState): Line[] {
  const out: Line[] = [];
  const sent = !!prev && s.lastSend !== prev.lastSend && !!s.lastSend;
  if (sent) out.push(...sendLines(prev, s));
  // A deal put on the table: a new turn, or the same turn dealt again on a new map (the dev hook's setOwner).
  const redealt =
    !!prev && prev.phase === 'choose' && s.phase === 'choose' && prev.turn === s.turn && (prev.deal.crisis !== s.deal.crisis || prev.deal.opening.join() !== s.deal.opening.join());
  const newTurn = s.phase === 'choose' && (!prev || prev.turn !== s.turn || prev.phase !== 'choose' || redealt);
  if (newTurn && prev) out.push(...turnStartLines(s));
  // A game put on the table (a new game, or one continued from its save): what the deal allows is
  // said too, so a continued dead or reorder deal is explained as a freshly dealt one is.
  if (newTurn && !prev) out.push(...dealLines(s));
  out.push(...turnOneLines(newTurn ? null : prev, s));
  out.push(...shopLines(prev, s));
  out.push(...deputyLines(prev, s));
  out.push(...orderLines(prev, s));
  if (!newTurn) out.push(...choosingLines(prev, s));
  return out;
}
