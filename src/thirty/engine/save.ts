/**
 * The save: the whole state as versioned JSON. loadGame checks what it reads and returns null for
 * anything it cannot trust (a truncated or edited save, a card the pack no longer has), so the title
 * offers a new game instead of crashing. Storage itself (localStorage under SAVE_KEY, in try/catch)
 * belongs to the app.
 */
import type { ThirtyContent } from '../content/types.ts';
import { RULES } from './rules.ts';
import type { GameState } from './types.ts';
import { REGION_IDS } from './world.ts';

export const SAVE_KEY = 'brink.thirty.v1.save';
const FORMAT = 'brink.thirty';
const VERSION = 1;

export function saveGame(s: GameState): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, state: s });
}

/** The state in a save, or null when the text is missing, unreadable or not a game this pack can continue. */
export function loadGame(content: ThirtyContent, text: string | null | undefined): GameState | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.format !== FORMAT || data.version !== VERSION) return null;
  return isGameState(content, data.state) ? data.state : null;
}

type Obj = Record<string, unknown>;

const isObject = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown, min = 0, max = Infinity): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isRegion = (x: unknown): x is string => typeof x === 'string' && REGION_IDS.includes(x);
const isHeat = (x: unknown) => isInt(x, 0, 3);
const PHASES = ['choose', 'offer', 'over'];
const MARKS = ['red-line', 'warned', 'guarded'];

/** Four 32-bit words (the generator keeps some as signed ints). */
function isRngState(x: unknown): boolean {
  return Array.isArray(x) && x.length === 4 && x.every((n) => isInt(n, -0x80000000, 0xffffffff));
}

function isGameState(content: ThirtyContent, x: unknown): x is GameState {
  if (!isObject(x) || x.version !== VERSION || typeof x.seed !== 'string') return false;
  if (!isInt(x.day, 1, RULES.days) || !PHASES.includes(x.phase as string)) return false;
  const heats = x.heats;
  if (!isObject(heats) || Object.keys(heats).length !== REGION_IDS.length || !REGION_IDS.every((r) => isHeat(heats[r]))) return false;
  if (!isInt(x.penalty) || !isInt(x.peak, 0, RULES.dangerCap)) return false;
  const isPiece = (p: unknown) => typeof p === 'string' && p in content.pieces;
  if (!Array.isArray(x.team) || x.team.length > RULES.maxTeam || !x.team.every(isPiece)) return false;
  if (new Set(x.team).size !== x.team.length) return false;
  if (x.redLine !== null && !isRegion(x.redLine)) return false;
  if (!Array.isArray(x.warned) || !x.warned.every(isRegion)) return false;
  if (!isObject(x.guarded) || !Object.entries(x.guarded).every(([r, d]) => isRegion(r) && isInt(d))) return false;
  if (x.hotlineWeek !== null && !isInt(x.hotlineWeek, 1)) return false;
  if (x.homeDay !== null && !isInt(x.homeDay, 1)) return false;
  const rng = x.rng;
  if (!isObject(rng) || !['world', 'deal', 'odds', 'pressure', 'offer'].every((k) => isRngState(rng[k]))) return false;

  const card = x.card;
  if (card !== null) {
    if (!isObject(card) || typeof card.id !== 'string' || !(card.id in content.cards)) return false;
    if (card.region !== null && !isRegion(card.region)) return false;
    if (typeof card.roll !== 'number' || card.roll < 0 || card.roll >= 1) return false;
    if (typeof card.alarmFalse !== 'boolean' || !['none', 'unknown', 'false', 'real'].includes(card.alarm as string)) return false;
    if (!Array.isArray(card.arrival)) return false;
  }
  if (x.offer !== null && !(Array.isArray(x.offer) && x.offer.every(isPiece))) return false;
  if ((x.phase === 'choose') !== (card !== null)) return false;
  if ((x.phase === 'offer') !== (x.offer !== null)) return false;
  if (!Array.isArray(x.picks) || !x.picks.every((p) => isObject(p) && isInt(p.day, 1) && Array.isArray(p.offer) && (p.taken === null || isPiece(p.taken)))) return false;

  const deck = x.deck;
  if (!isObject(deck) || !Array.isArray(deck.used) || !deck.used.every((id) => typeof id === 'string')) return false;
  if (!Array.isArray(deck.queue) || !deck.queue.every((q) => isObject(q) && typeof q.card === 'string' && isInt(q.from, 1) && isInt(q.to, 1))) return false;
  if (!isObject(deck.lastCardDay) || !Object.entries(deck.lastCardDay).every(([r, d]) => isRegion(r) && isInt(d, 1))) return false;
  if (!isObject(deck.hotSince) || !Object.entries(deck.hotSince).every(([r, d]) => isRegion(r) && isInt(d, 1))) return false;
  if (!isInt(deck.lastMapDay)) return false;

  if (!Array.isArray(x.log) || !x.log.every((t) => isObject(t) && isInt(t.day, 1) && Array.isArray(t.steps) && Array.isArray(t.fired))) return false;
  const ending = x.ending;
  if (ending !== null) {
    if (!isObject(ending) || !['WAR', 'STAND-DOWN', 'HELD'].includes(ending.kind as string) || !isInt(ending.day, 1, RULES.days)) return false;
    if (ending.kind === 'WAR' && !isRegion(ending.region)) return false;
    if (!isInt(ending.danger, 0, RULES.dangerCap)) return false;
  }
  if ((x.phase === 'over') !== (ending !== null)) return false;
  if (!MARKS.length) return false;
  return true;
}
