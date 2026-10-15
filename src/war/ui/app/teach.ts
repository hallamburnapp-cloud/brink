/**
 * The teaching, as pure rules (SPEC section 4): what the coached first turn lets the player do at
 * each step, and which coach line a moment earns. No timers and no storage here: hints.ts plays
 * the lines and remembers which one-time lines a device has seen.
 */
import { REGION } from '../../content/map';
import { formatInt, goalView, preview, readoutView, sendLabel, swapProblem, type GameState, type RegionId } from '../../engine';

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
  /** The SEND lever beckons while this line is up. */
  beckon?: boolean;
}

const STICKY = Infinity;
const LINE_MS = 3500;

function line(key: string, text: string, ms: number, once: Line['once'] = null, at: CoachSpot = 'map', beckon = false): Line {
  return { key, text, ms, at, once, beckon };
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
        out.push(line('t1-beats', beats, 2000));
      }
      out.push(line('t1-more', 'More pins score more. Up to 5.', STICKY));
      return out;
    }
    case 4:
      return [
        line('t1-bymore', 'Beat it by more: win more regions.', 2500, 'game', 'map', true),
        line('t1-send', 'SEND.', STICKY, null, 'map', true),
      ];
  }
}

/** A new turn has been dealt: prev is the game before (the outcome or shop), s the new deal. */
function turnStartLines(s: GameState): Line[] {
  const out: Line[] = [];
  if (s.mode === 'first' && s.turn === 2) out.push(line('t2-gold', 'Gold regions can be pinned too.', 4000, 'game'));
  if (s.mode === 'first' && s.turn === 3) out.push(line('t3-war', 'War spreads by itself every 3rd turn. Watch the red tag.', 4500, 'game'));
  if (s.deal.finalPush) out.push(line('push', 'No grey left. Win back the red. One miss: ceasefire.', 4500, 'device'));
  return out;
}

/** A send has resolved: prev was the game SEND was pressed on. */
function sendLines(prev: GameState, s: GameState): Line[] {
  const rec = s.lastSend;
  if (!rec || s.phase === 'over') return [];
  const out: Line[] = [];
  if (prev.mode === 'first' && prev.turn === 1 && rec.result === 'win') out.push(line('t1-gold', 'Gold is yours for good.', LINE_MS, 'game'));
  if (rec.result === 'miss') out.push(line('miss', 'War took it. Ten red and you lose.', LINE_MS, 'device'));
  if (rec.spread && s.mode !== 'first') out.push(line('spread', 'War spread by itself.', 1500, 'device'));
  const red = goalView(s).red;
  if (red >= 8 && goalView(prev).red < 8) out.push(line('war8', 'Two more red and the war wins.', LINE_MS, 'device'));
  return out;
}

/** The shop has opened, or changed. */
function shopLines(prev: GameState | null, s: GameState): Line[] {
  if (s.phase !== 'shop' || !s.shop) return [];
  const out: Line[] = [];
  const opened = prev?.phase !== 'shop';
  if (opened && s.mode === 'first' && s.shop.visit === 1) {
    out.push(line('shop-hire', 'Hire staff. They boost every send. The number shows by how much.', 6000, 'game', 'tray'));
  }
  if (s.seats.length >= 5 && s.shop.offers.some((o) => o !== null)) out.push(line('full', 'Full table. Tap a seat to replace it.', 4500, 'device', 'tray'));
  return out;
}

/** Lines earned while choosing (a tap, a swap). */
function choosingLines(prev: GameState | null, s: GameState): Line[] {
  if (s.phase !== 'choose' || s.turn === 1) return [];
  const out: Line[] = [];
  const label = sendLabel(s);
  // Only when SWAP can actually be pressed (not used, not locked, the pile not empty).
  if (label.tone === 'miss' && s.deal.pins.length >= 5 && swapProblem(s) === null && !s.deal.finalPush) {
    out.push(line('swap', 'Short? SWAP brings new regions. Your pins stay.', 4500, 'device'));
  }
  if (readoutView(s).nearNext && !(prev && prev.phase === 'choose' && readoutView(prev).nearNext)) {
    out.push(line('near', 'Close to the next region. Try other pins.', LINE_MS, 'device'));
  }
  return out;
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
  const newTurn = s.phase === 'choose' && (!prev || prev.turn !== s.turn || prev.phase !== 'choose');
  if (newTurn && prev) out.push(...turnStartLines(s));
  out.push(...turnOneLines(newTurn ? null : prev, s));
  out.push(...shopLines(prev, s));
  out.push(...deputyLines(prev, s));
  if (!newTurn) out.push(...choosingLines(prev, s));
  return out;
}
