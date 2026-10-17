/**
 * The save: the whole state as versioned JSON. loadGame checks what it reads and returns null for
 * anything it cannot trust (a truncated or edited save), so the title offers a new game instead of
 * crashing. Storage itself (localStorage under SAVE_KEY, in try/catch) belongs to the app.
 */
import { RULES } from './rules.ts';
import type { GameState } from './types.ts';
import { REGION_IDS } from './world.ts';

export const SAVE_KEY = 'brink.redlines.v1.save';
const FORMAT = 'brink.redlines';
const VERSION = 1;

export function saveGame(s: GameState): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, state: s });
}

export function loadGame(text: string | null | undefined): GameState | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.format !== FORMAT || data.version !== VERSION) return null;
  return isGameState(data.state) ? data.state : null;
}

type Obj = Record<string, unknown>;
const isObject = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown, min = 0, max = Infinity): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isNum = (x: unknown, min = -Infinity, max = Infinity): x is number => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const isStr = (x: unknown): x is string => typeof x === 'string';
const isRegion = (x: unknown): x is string => isStr(x) && REGION_IDS.includes(x);
const isStrings = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);
const STATES = ['calm', 'pressed', 'fighting'];
const PHASES = ['act', 'phone', 'ended'];
const KINDS = ['fleet', 'brigade'];
const KEYS = ['back', 'down', 'wait'];
const TERMS = ['drop-promise', 'pull-back', 'summit'];
const ENDINGS = ['treaty', 'war', 'frozen'];

export function isGameState(x: unknown): x is GameState {
  if (!isObject(x) || !isStr(x.seed)) return false;
  if (!isInt(x.week, 1, RULES.weeks + 1) || !PHASES.includes(x.phase as string) || !isInt(x.influence)) return false;
  const regions = x.regions;
  if (!isObject(regions) || Object.keys(regions).length !== REGION_IDS.length) return false;
  for (const r of REGION_IDS) {
    const rec = regions[r];
    if (!isObject(rec) || !STATES.includes(rec.state as string) || !isInt(rec.pressedWeeks) || !isInt(rec.quietWeeks)) return false;
    if (rec.fellWeek !== undefined && !isInt(rec.fellWeek)) return false;
    if (rec.recoveredWeek !== undefined && !isInt(rec.recoveredWeek)) return false;
  }
  if (!Array.isArray(x.promises) || x.promises.length > RULES.maxPromises) return false;
  if (!x.promises.every((p) => isObject(p) && isRegion(p.region) && isInt(p.since) && typeof p.inherited === 'boolean')) return false;
  if (!Array.isArray(x.pieces) || x.pieces.length !== 2 || !x.pieces.every((p) => isObject(p) && KINDS.includes(p.kind as string) && isRegion(p.at))) return false;
  const fed = x.fed;
  if (!isObject(fed) || !isNum(fed.appetite, 0, 1) || !isNum(fed.jumpiness, 0, 1) || !isInt(fed.step, 1, 5)) return false;
  if (!isNum(fed.belief, 0, 100) || !isNum(fed.will, 0, 100)) return false;
  if (!Array.isArray(fed.lines) || fed.lines.length !== 3 || !fed.lines.every((l) => isObject(l) && isStr(l.id) && isStr(l.text) && typeof l.real === 'boolean')) return false;
  if (!Array.isArray(fed.headings) || !fed.headings.every((h) => isObject(h) && isRegion(h.from) && isRegion(h.to) && typeof h.real === 'boolean')) return false;
  if (!isInt(x.war, 0, REGION_IDS.length) || !isNum(x.treaty, 0, 100)) return false;
  if (x.pendingTest !== null && !isRegion(x.pendingTest)) return false;
  const phone = x.phone;
  if (phone !== null) {
    if (!isObject(phone) || !isStr(phone.template) || !isStr(phone.text) || !isStr(phone.kind)) return false;
    if (!isObject(phone.caller) || !isObject(phone.advisers)) return false;
    if (phone.region !== null && !isRegion(phone.region)) return false;
    if (!isInt(phone.round, 1, 3)) return false;
    if (!Array.isArray(phone.options) || !phone.options.every((o) => isObject(o) && KEYS.includes(o.key as string) && isStr(o.label) && isStr(o.cost))) return false;
  }
  if ((x.phase === 'phone') !== (phone !== null)) return false;
  if (!Array.isArray(x.log)) return false;
  for (const w of x.log) {
    if (!isObject(w) || !isInt(w.week, 1) || !isStrings(w.visible) || !isStrings(w.hidden) || !isStrings(w.acts)) return false;
    if (!isObject(w.danger) || !isInt(w.danger.war) || !isNum(w.danger.treaty) || !isInt(w.danger.step, 1, 5)) return false;
  }
  const ending = x.ending;
  if (ending !== null) {
    if (!isObject(ending) || !ENDINGS.includes(ending.kind as string) || !isInt(ending.week, 1) || !isInt(ending.fighting) || !isInt(ending.score)) return false;
    if (!isStrings(ending.lines) || ending.lines.length !== 2 || !isStr(ending.because) || !isStr(ending.dials)) return false;
  }
  if ((x.phase === 'ended') !== (ending !== null)) return false;
  if (!isStr(x.collision) || !isStrings(x.headline)) return false;
  const offer = x.offer;
  if (offer !== null && !(isObject(offer) && TERMS.includes(offer.term as string) && isInt(offer.price) && (offer.detail === null || isStr(offer.detail)))) return false;
  if (!Array.isArray(x.moved) || !x.moved.every((k) => KINDS.includes(k as string))) return false;
  if (!Array.isArray(x.acts) || !x.acts.every((a) => isObject(a) && isStr(a.kind))) return false;
  if (!isInt(x.signed, 0, RULES.maxBlocs) || !isInt(x.waysOut) || !isInt(x.events)) return false;
  if (!isObject(x.crossed) || !Object.values(x.crossed).every((w) => isInt(w))) return false;
  if (!isInt(x.pendingRound, 1, 3)) return false;
  if (!isObject(x.turnedAway) || !Object.entries(x.turnedAway).every(([r, w]) => isRegion(r) && isInt(w))) return false;
  if (!isStrings(x.phonesUsed)) return false;
  if (x.lastBacked !== null && !isRegion(x.lastBacked)) return false;
  if (!isNum(x.beliefWas, 0, 100)) return false;
  return true;
}
