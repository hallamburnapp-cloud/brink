/**
 * The replay check: TypeScript games played again by the Python reference on identical inputs.
 * replay.py ports the engine's seeded generator (src/engine/rng.ts) to Python and hands it to the
 * unmodified reference (rules.py, bots.py), so the reference deals, draws offers and decides exactly
 * as the TypeScript game did; every turn of every game must then match (pins, score, regions won,
 * the map's counts, coins, the shop), and calibrate.py's own gates on those games must print the
 * same values as ours. Needs python3; dev only (`tools/war-sim.ts --replay N`).
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RegionId, StaffId } from '../engine';
import type { BotName } from './bots';
import { seatIds } from './drive';
import { evaluateGates, type GateResult } from './gates';
import { playGame, type GameLog, type TurnRow } from './play';
import { BOT_NAMES } from './roster';
import { digest, summarize, type BotStats, type GameDigest } from './summary';

const SCRIPT = fileURLToPath(new URL('./replay.py', import.meta.url));

/** What a turn adds to its log row for the comparison. */
interface TurnExtra {
  crisis: RegionId;
  /** The pins sent, sorted by id. */
  sent: RegionId[];
  /** Exact, as text. */
  score: string;
  /** The regions won, in spread order. */
  won: RegionId[];
  /** Coins after the send, and the line-up and coins leaving the shop. */
  coins: number;
  /** Where war spread by itself after the turn. */
  spread: RegionId | null;
  seats?: StaffId[];
  coinsAfterShop?: number;
}

/** A game as the reference's replay is compared with it. */
export interface ReplayGame extends Omit<GameLog, 'log' | 'spread'> {
  log: Array<Omit<TurnRow, 'score' | 'won' | 'spread'> & TurnExtra>;
}

/** Play a game and keep what the reference's replay is compared with. */
export function recordGame(seed: string, bot: BotName): { record: ReplayGame; game: GameLog } {
  const extra: TurnExtra[] = [];
  const game = playGame(seed, bot, {
    observer: {
      sent: (s) => {
        const rec = s.lastSend!;
        extra.push({
          crisis: rec.crisis,
          sent: [...rec.pins].sort(),
          score: rec.score.toString(),
          won: rec.won.map((w) => w.id),
          coins: s.coins,
          spread: rec.spread?.id ?? null,
        });
      },
      shopped: (s) => {
        const last = extra[extra.length - 1];
        last.seats = seatIds(s);
        last.coinsAfterShop = s.coins;
      },
    },
  });
  const record: ReplayGame = {
    bot: game.bot,
    seed: game.seed,
    end: game.end,
    turns: game.turns,
    gold: game.gold,
    red: game.red,
    grey: game.grey,
    seats: game.seats,
    shops: game.shops,
    log: game.log.map((row, i) => ({ ...row, ...extra[i] })),
  };
  return { record, game };
}

export interface ReplayResult {
  ok: boolean;
  games: number;
  turns: number;
  /** Games the reference played identically, turn for turn. */
  identical: number;
  differences: string[];
  /** Gates whose value calibrate.py prints differently on the same games ('G7: reference 13.6, this sim 13.7'). */
  gateDifferences: string[];
  text: string;
}

/** The number in a gate's printed value, with any staff id in front ('OLDHAND 23.0%' -> 'OLDHAND 23'). */
const gateValue = (text: string) => text.replace(/[\d.]+/, (m) => String(Number(m))).replace('%', '');

function compareGates(ours: readonly GateResult[], theirs: ReadonlyArray<[string, string, boolean]>): string[] {
  const ref = new Map(theirs.map(([id, text, ok]) => [id, { text, ok }]));
  return ours.flatMap((g) => {
    const r = ref.get(g.id);
    if (!r) return [`${g.id}: not printed by the reference`];
    return gateValue(r.text) === gateValue(g.text) && r.ok === g.pass ? [] : [`${g.id}: reference ${r.text} (${r.ok ? 'pass' : 'fail'}), this sim ${g.text} (${g.pass ? 'pass' : 'fail'})`];
  });
}

/**
 * Play `games` games per bot (seeds `${prefix}0` ...) and replay them all in the reference. Games are
 * streamed to the reference one JSON line each, so a full-size run never holds them all at once.
 */
export function runReplay(games: number, prefix = 'W', bots: readonly BotName[] = BOT_NAMES): ReplayResult {
  const dir = mkdtempSync(join(tmpdir(), 'war-replay-'));
  try {
    const file = join(dir, 'games.jsonl');
    writeFileSync(file, '');
    const stats: Partial<Record<BotName, BotStats>> = {};
    let played = 0;
    for (const bot of bots) {
      const digests: GameDigest[] = [];
      let lines = '';
      for (let i = 0; i < games; i++) {
        const { record, game } = recordGame(`${prefix}${i}`, bot);
        digests.push(digest(game));
        lines += `${JSON.stringify(record)}\n`;
        if (lines.length > 1 << 20) {
          appendFileSync(file, lines);
          lines = '';
        }
      }
      appendFileSync(file, lines);
      stats[bot] = summarize(bot, digests);
      played += games;
    }
    const ours = evaluateGates(stats);
    const py = spawnSync('python3', [SCRIPT, file], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (py.status !== 0) throw new Error(`replay.py failed (${py.status}): ${py.stderr || py.error?.message}`);
    const out = JSON.parse(py.stdout) as {
      games: number;
      turns: number;
      identical: number;
      differences: string[];
      gates: Array<[string, string, boolean]>;
    };
    const gateDifferences = out.gates.length ? compareGates(ours, out.gates) : [];
    const ok = out.differences.length === 0 && out.identical === played && gateDifferences.length === 0;
    const n = (x: number) => x.toLocaleString('en-GB');
    const lines = [
      `${out.identical === out.games ? 'OK' : 'DIFFERENCES'}: ${n(out.identical)} of ${n(out.games)} games (${bots.join(', ')}; ` +
        `${n(out.turns)} turns) played identically by the reference`,
      ...out.differences.slice(0, 12).map((d) => `    ${d}`),
      ...(out.differences.length > 12 ? [`    ... and ${out.differences.length - 12} more`] : []),
    ];
    if (out.gates.length) {
      lines.push(
        gateDifferences.length
          ? `DIFFERENCES: calibrate.py's gates on the same games differ from ours`
          : `OK: calibrate.py's own 17 gates on the same games print the same values as ours`,
        ...gateDifferences.map((d) => `    ${d}`),
      );
    }
    return { ok, ...out, gateDifferences, text: lines.join('\n') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
