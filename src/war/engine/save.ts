/**
 * The save game (SPEC section 11): the whole state as versioned JSON, BigInts as decimal strings.
 * loadGame() checks what it reads and returns null for anything it cannot trust, so a truncated or
 * edited save is discarded rather than crashing the game. A version 2 save (before the final push
 * forgave misses) is brought up to version 3 exactly: its game had made no push miss unless it had
 * ended in a CEASEFIRE. Storage itself (the localStorage key 'brink.war.v2.save', try/catch)
 * belongs to the app.
 */
import { REGION } from '../content/map';
import { isStaffId } from '../content/staff';
import { RULES } from './rules';
import type { Deal, GameState, Owner, Seat, Shop } from './types';
import { IDS } from './board';

export const SAVE_KEY = 'brink.war.v2.save';
const FORMAT = 'brink.war';
const VERSION = 3;
/** The last version without the push's misses (`pushMisses`): loaded and brought up to VERSION. */
const PUSH_V = 2;

/** Every state field with one of these names holds a BigInt (and no other field does). */
const BIGINT_KEYS = new Set(['target', 'score', 'points', 'm10']);

export function saveGame(s: GameState): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, state: s }, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
}

/** The state in a save, or null when the text is missing, unreadable or not a v2 game. */
export function loadGame(text: string | null | undefined): GameState | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text, (key, value) =>
      BIGINT_KEYS.has(key) && typeof value === 'string' && /^-?\d+$/.test(value) ? BigInt(value) : value,
    );
  } catch {
    return null;
  }
  if (!isObject(data) || data.format !== FORMAT) return null;
  if (data.version === PUSH_V) data.state = fromV2(data.state);
  else if (data.version !== VERSION) return null;
  return isGameState(data.state) ? data.state : null;
}

/**
 * A version 2 game in version 3's shape. Before the push forgave, its first miss ended the game: a
 * game still going has made no push miss, and a CEASEFIRE has spent the push. Anything else is left
 * for isGameState to refuse.
 */
function fromV2(state: unknown): unknown {
  if (!isObject(state) || state.version !== PUSH_V || 'pushMisses' in state) return null;
  const misses = state.ending === 'CEASEFIRE' ? RULES.pushMisses : 0;
  const last = isObject(state.lastSend) ? { ...state.lastSend, pushMisses: misses } : state.lastSend;
  return { ...state, version: VERSION, pushMisses: misses, lastSend: last };
}

// ---------------------------------------------------------------- checks

type Obj = Record<string, unknown>;

const isObject = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown, min = 0): x is number => Number.isInteger(x) && (x as number) >= min;
const isRegion = (x: unknown): x is string => typeof x === 'string' && x in REGION;
const isRegionList = (x: unknown): x is string[] => Array.isArray(x) && x.every(isRegion);
const isBig = (x: unknown): x is bigint => typeof x === 'bigint';
const OWNERS: readonly Owner[] = ['grey', 'gold', 'red'];
const PHASES = ['choose', 'outcome', 'shop', 'over'];
const ENDINGS = ['WORLD UNITED', 'CEASEFIRE', 'WAR'];
const MODES = ['game', 'first', 'crown'];

/** Four 32-bit words (the generator keeps some as signed ints). */
function isRngState(x: unknown): boolean {
  return Array.isArray(x) && x.length === 4 && x.every((n) => isInt(n, -0x80000000) && n <= 0xffffffff);
}

function isSeat(x: unknown): x is Seat {
  return isObject(x) && isInt(x.uid, 1) && isStaffId(x.id);
}

function isDeal(x: unknown): x is Deal {
  return (
    isObject(x) &&
    isRegion(x.crisis) &&
    isBig(x.target) &&
    typeof x.finalPush === 'boolean' &&
    isRegionList(x.lit) &&
    isRegionList(x.pile) &&
    isRegionList(x.opening) &&
    isRegionList(x.pins) &&
    x.pins.length <= RULES.maxPins &&
    isInt(x.swapsLeft) &&
    typeof x.swapLocked === 'boolean'
  );
}

function isShop(x: unknown): x is Shop {
  return (
    isObject(x) &&
    isInt(x.visit, 1) &&
    Array.isArray(x.offers) &&
    x.offers.every((o) => o === null || isStaffId(o)) &&
    isInt(x.rerollCost)
  );
}

function isGameState(x: unknown): x is GameState {
  if (!isObject(x) || x.version !== VERSION || typeof x.seed !== 'string' || !MODES.includes(x.mode as string)) return false;
  const rng = x.rng;
  if (!isObject(rng) || !['war', 'crisis', 'deal', 'shop'].every((k) => isRngState(rng[k]))) return false;
  if (!PHASES.includes(x.phase as string) || !isInt(x.turn, 1)) return false;
  const owner = x.owner;
  if (!isObject(owner) || Object.keys(owner).length !== IDS.length) return false;
  if (!IDS.every((r) => OWNERS.includes(owner[r] as Owner))) return false;
  if (!isInt(x.coins) || !isInt(x.oldHandM10, 1) || !isInt(x.nextUid, 1) || !isInt(x.shopVisits) || !isInt(x.peakWar)) return false;
  if (!Array.isArray(x.seats) || x.seats.length > RULES.seats || !x.seats.every(isSeat)) return false;
  if (new Set(x.seats.map((s) => s.id)).size !== x.seats.length) return false;
  if (!Array.isArray(x.hiredSinceSend) || !x.hiredSinceSend.every((u) => isInt(u, 1))) return false;
  if (!isDeal(x.deal)) return false;
  if (x.shop !== null && !isShop(x.shop)) return false;
  if ((x.phase === 'shop') !== (x.shop !== null)) return false;
  if (x.ending !== null && !ENDINGS.includes(x.ending as string)) return false;
  if ((x.phase === 'over') !== (x.ending !== null)) return false;
  if (!isInt(x.pushMisses) || x.pushMisses > RULES.pushMisses) return false;
  if (x.lastSend !== null && !(isObject(x.lastSend) && Array.isArray(x.lastSend.trace) && isBig(x.lastSend.score) && isInt(x.lastSend.pushMisses))) return false;
  if (!Array.isArray(x.log) || !x.log.every((l) => isObject(l) && isBig(l.score) && isBig(l.target))) return false;
  if (x.best !== null && !(isObject(x.best) && isBig(x.best.score) && isBig(x.best.target))) return false;
  return isRegionList(x.brass);
}
