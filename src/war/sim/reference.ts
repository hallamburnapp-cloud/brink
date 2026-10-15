/**
 * The reference's own results (docs/war/v2/reference/RESULTS.txt, written by `python3 calibrate.py
 * 5000 --write`), read from the file so the report always prints beside what is committed there.
 * Node only (the simulator and its tests).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { BotName } from './bots';
import { BOT_NAMES, isBotName } from './roster';

export const RESULTS_PATH = fileURLToPath(new URL('../../../docs/war/v2/reference/RESULTS.txt', import.meta.url));

export interface ReferenceGate {
  id: string;
  pass: boolean;
  /** The value column as printed ('63.1%', '15.0', 'OLDHAND 23.0%'). */
  text: string;
}

/** One row of the OUTCOMES table. Shares are fractions; null where the reference printed None. */
export interface ReferenceOutcome {
  worldUnited: number;
  ceasefire: number;
  held: number;
  war: number;
  stall: number;
  turns: { median: number; p10: number; p90: number };
  turnsHeld: number | null;
  turnsWorldUnited: number | null;
  turnsLost: number | null;
  minutes: { std: [number, number]; first: [number, number]; slow: [number, number]; fast: number };
}

/** A few figures from a bot's block, by name (shares as fractions). */
export interface ReferenceDetail {
  spread2?: number;
  bestWinsMedianMisses?: number;
  bestMedian?: number;
  million?: number;
  flood5?: number;
  warPeak6InHeld?: number;
  closeLoss?: number;
  hopeless?: number;
  finalPush?: number;
  onCrisis?: number;
  /** Winning sends by regions taken: [regions, share]. */
  sizes?: Array<[number, number]>;
}

export interface Reference {
  /** Games per bot. */
  games: number;
  gates: ReferenceGate[];
  allPass: boolean;
  outcomes: Partial<Record<BotName, ReferenceOutcome>>;
  detail: Partial<Record<BotName, ReferenceDetail>>;
}

const percent = (s: string) => Number(s.replace('%', '')) / 100;
const orNull = (s: string) => (s === 'None' ? null : Number(s));

function parseOutcome(line: string): [BotName, ReferenceOutcome] | null {
  const [left, mid, right] = line.split('|');
  if (right === undefined) return null;
  const cells = left.trim().split(/\s+/);
  const bot = cells[0];
  if (!isBotName(bot) || cells.length !== 6) return null;
  const turns = /^\s*([\d.]+)\s*\(\s*(\d+)-\s*(\d+)\)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/.exec(mid);
  const mins = (right.match(/[\d.]+/g) ?? []).map(Number);
  if (!turns || mins.length !== 7) return null;
  const [, med, p10, p90, held, wu, lost] = turns;
  return [
    bot,
    {
      worldUnited: percent(cells[1]),
      ceasefire: percent(cells[2]),
      held: percent(cells[3]),
      war: percent(cells[4]),
      stall: percent(cells[5]),
      turns: { median: Number(med), p10: Number(p10), p90: Number(p90) },
      turnsHeld: orNull(held),
      turnsWorldUnited: orNull(wu),
      turnsLost: orNull(lost),
      minutes: { std: [mins[0], mins[1]], first: [mins[2], mins[3]], slow: [mins[4], mins[5]], fast: mins[6] },
    },
  ];
}

const DETAIL: ReadonlyArray<[keyof ReferenceDetail, RegExp, (m: string) => number]> = [
  ['spread2', /best >= 2x median ([\d.]+)%/, (m) => Number(m) / 100],
  ['bestWinsMedianMisses', /best wins where the median misses ([\d.]+)%/, (m) => Number(m) / 100],
  ['bestMedian', /best send per game: median ([\d,.]+),/, (m) => Number(m.replace(/,/g, ''))],
  ['million', /games with a 1,000,000\+ send ([\d.]+)%/, (m) => Number(m) / 100],
  ['flood5', /games with a 5\+ region send ([\d.]+)%/, (m) => Number(m) / 100],
  ['warPeak6InHeld', /held games that saw war at 6\+ ([\d.]+)%/, (m) => Number(m) / 100],
  ['closeLoss', /close losses \(WAR holding 18\+ gold\) ([\d.]+)%/, (m) => Number(m) / 100],
  ['hopeless', /hopeless losses \(WAR holding <=8 gold\) ([\d.]+)%/, (m) => Number(m) / 100],
  ['finalPush', /final push reached in ([\d.]+)%/, (m) => Number(m) / 100],
  ['onCrisis', /sends that pin the crisis ([\d.]+)%/, (m) => Number(m) / 100],
];

function parseDetail(block: string): ReferenceDetail {
  const d: ReferenceDetail = {};
  for (const [key, re, read] of DETAIL) {
    const m = re.exec(block);
    if (m) (d as Record<string, number>)[key] = read(m[1]);
  }
  const sizes = /regions per winning send: ([^;]*);/.exec(block);
  if (sizes) {
    d.sizes = [...sizes[1].matchAll(/(\d+): ([\d.]+)%/g)].map((m) => [Number(m[1]), Number(m[2]) / 100]);
  }
  return d;
}

export function parseReference(text: string): Reference {
  const lines = text.split('\n');
  const games = Number(/^(\d+) games per bot/m.exec(text)?.[1] ?? NaN);
  const gates: ReferenceGate[] = [];
  const outcomes: Reference['outcomes'] = {};
  const detail: Reference['detail'] = {};
  for (const line of lines) {
    // '  PASS G1  sensible holds the world ... 55-70%      63.1%': the value follows the last run of 2+ spaces.
    const g = /^\s+(PASS|FAIL)\s+(G\d+)\s.*\S\s{2,}(\S.*?)\s*$/.exec(line);
    if (g) gates.push({ id: g[2], pass: g[1] === 'PASS', text: g[3] });
    const o = parseOutcome(line);
    if (o) outcomes[o[0]] = o[1];
  }
  for (const bot of BOT_NAMES) {
    const start = lines.indexOf(bot.toUpperCase());
    if (start < 0) continue;
    const end = lines.findIndex((l, i) => i > start && l.trim() === '');
    detail[bot] = parseDetail(lines.slice(start, end < 0 ? undefined : end).join('\n'));
  }
  return { games, gates, allPass: /ALL GATES PASS/.test(text), outcomes, detail };
}

let cached: Reference | null = null;

export function loadReference(path: string = RESULTS_PATH): Reference {
  if (path !== RESULTS_PATH) return parseReference(readFileSync(path, 'utf8'));
  cached ??= parseReference(readFileSync(RESULTS_PATH, 'utf8'));
  return cached;
}
