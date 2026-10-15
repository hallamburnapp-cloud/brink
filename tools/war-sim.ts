/**
 * The WIN THE WORLD simulator CLI (SPEC section 16).
 *
 *   npx tsx tools/war-sim.ts --games 2000
 *
 * Replays every case of docs/war/v2/reference/fixtures.json through the engine, plays N games per bot
 * (ports of docs/war/v2/reference/bots.py driving the TypeScript engine), and prints the 17 gates and
 * the outcomes beside the reference's own results (docs/war/v2/reference/RESULTS.txt). Games are
 * spread over worker processes (--jobs). With --replay N the unmodified Python reference plays N games
 * per bot again on the engine's own random streams (src/war/sim/replay.py) and every turn is compared.
 */
import { fork, type ChildProcess } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { BRAND } from '../src/config';
import {
  BOT_NAMES,
  collect,
  crosscheckFixtures,
  crosscheckText,
  curveTable,
  detailTable,
  gatesTable,
  isBotName,
  loadReference,
  outcomesTable,
  planJobs,
  runJob,
  runReplay,
  staffLine,
  type BotName,
  type Executor,
  type Format,
  type Job,
  type JobResult,
  type SimOptions,
} from '../src/war/sim';

const USAGE = `usage: npx tsx tools/war-sim.ts [options]
  --games N     games per bot (default 2000; --runs N is the same)
  --bots LIST   bots to play, comma-separated (default: all six; the gates need all six)
                random, novice, greedy, preview, sensible, breaker
  --seed P      seed prefix: the games are P0 ... P{N-1} for every bot (default W, as the reference)
  --jobs J      worker processes (default: CPUs - 1, at most 4; 1 plays in this process)
  --md          print the tables as Markdown
  --json PATH   also write the statistics and gates as JSON
  --replay N    also play N games per bot again in the Python reference, on the same random
                streams, and compare every turn and calibrate.py's own gates (needs python3)
  --strict      exit 1 if a gate fails or a cross-check finds a difference
  --quiet       no progress lines
  --help`;

interface Args {
  games: number;
  bots: BotName[];
  prefix: string;
  jobs: number;
  format: Format;
  json: string | null;
  replay: number;
  strict: boolean;
  quiet: boolean;
}

function fail(msg: string): never {
  console.error(`${msg}\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv: readonly string[]): Args {
  const a: Args = {
    games: 2000,
    bots: [...BOT_NAMES],
    prefix: 'W',
    jobs: Math.max(1, Math.min(4, availableParallelism() - 1)),
    format: 'text',
    json: null,
    replay: 0,
    strict: false,
    quiet: false,
  };
  const whole = (v: string | undefined, flag: string, min: number) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min) fail(`${flag} needs a whole number of at least ${min}`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => argv[++i] ?? fail(`${flag} needs a value`);
    switch (flag) {
      case '--games':
      case '--runs':
        a.games = whole(value(), flag, 1);
        break;
      case '--bots': {
        const names = value().split(',').map((x) => x.trim());
        const bad = names.filter((x) => !isBotName(x));
        if (bad.length) fail(`unknown bot ${bad.join(', ')}`);
        a.bots = names as BotName[];
        break;
      }
      case '--seed':
        a.prefix = value();
        break;
      case '--jobs':
        a.jobs = whole(value(), flag, 1);
        break;
      case '--md':
        a.format = 'md';
        break;
      case '--json':
        a.json = value();
        break;
      case '--replay':
        a.replay = whole(value(), flag, 0);
        break;
      case '--strict':
        a.strict = true;
        break;
      case '--quiet':
        a.quiet = true;
        break;
      case '--help':
        console.log(USAGE);
        process.exit(0);
      default:
        fail(`unknown option ${flag}`);
    }
  }
  return a;
}

/** A pool of forked copies of this script, each playing one job at a time. */
function pool(size: number): Executor {
  return (jobs, onDone) =>
    new Promise<JobResult[]>((resolve, reject) => {
      const results: JobResult[] = new Array(jobs.length);
      const workers: ChildProcess[] = [];
      let next = 0;
      let done = 0;
      const finish = (err?: Error) => {
        for (const w of workers) w.kill();
        if (err) reject(err);
        else resolve(results);
      };
      const feed = (w: ChildProcess) => {
        if (next >= jobs.length) return;
        const index = next++;
        w.once('message', (msg) => {
          results[index] = msg as JobResult;
          onDone?.(++done, jobs.length);
          if (done === jobs.length) finish();
          else feed(w);
        });
        w.send(jobs[index]);
      };
      for (let i = 0; i < Math.min(size, jobs.length); i++) {
        const w = fork(process.argv[1], ['--worker'], { serialization: 'advanced' });
        w.on('error', (e) => finish(e));
        w.on('exit', (code) => {
          if (code && done < jobs.length) finish(new Error(`worker exited with code ${code}`));
        });
        workers.push(w);
        feed(w);
      }
      if (jobs.length === 0) finish();
    });
}

const inThisProcess: Executor = async (jobs, onDone) => {
  const out: JobResult[] = [];
  for (const job of jobs) {
    out.push(runJob(job));
    onDone?.(out.length, jobs.length);
  }
  return out;
};

/** JSON with bigints as strings. */
const toJson = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x), 2);

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ref = loadReference();
  const fmt = args.format;
  const out: string[] = [];
  const say = (...lines: string[]) => out.push(...lines);

  const cross = crosscheckFixtures();
  const replay = args.replay > 0 ? runReplay(args.replay, args.prefix) : null;

  const opts: SimOptions = { games: args.games, bots: args.bots, prefix: args.prefix };
  const jobs: Job[] = planJobs(opts);
  const exec = args.jobs > 1 ? pool(args.jobs) : inThisProcess;
  const started = Date.now();
  let shown = -1;
  const progress = (done: number, total: number) => {
    const step = Math.floor((20 * done) / total);
    if (args.quiet || step === shown) return;
    shown = step;
    process.stderr.write(`  ${String(5 * step).padStart(3)}%  ${done}/${total} jobs  ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
  };
  const res = collect(opts, await exec(jobs, progress));
  const secs = (Date.now() - started) / 1000;

  const n = args.games.toLocaleString('en-GB');
  say(
    `${BRAND.name} · WIN THE WORLD SIMULATOR`,
    `${n} games per bot (${args.bots.join(', ')}), seeds ${args.prefix}0-${args.prefix}${args.games - 1} · ` +
      `${secs.toFixed(0)} s on ${args.jobs} process${args.jobs > 1 ? 'es' : ''}`,
    `Reference: docs/war/v2/reference/RESULTS.txt (${ref.games.toLocaleString('en-GB')} games per bot, the Python reference's own streams)`,
    '',
    'CROSS-CHECK: docs/war/v2/reference/fixtures.json replayed through the engine',
    crosscheckText(cross),
    '',
  );
  if (replay) say(`REPLAY: ${args.replay.toLocaleString('en-GB')} games per bot played again by the Python reference on the same random streams`, replay.text, '');
  say(
    'GATES (SPEC section 16): this sim beside the reference',
  );
  const gatesOk = res.gates.length === 17 && res.gates.every((g) => g.pass);
  if (res.gates.length) {
    say(gatesTable(res.gates, ref, fmt));
    say(gatesOk ? '=> ALL GATES PASS' : res.gates.length < 17 ? `=> ${res.gates.length} of 17 gates played (the rest need all six bots)` : '=> SOME GATES FAIL');
  } else {
    say('(no gate can be judged without its bots)');
  }
  say('', 'OUTCOMES: this sim (reference)', outcomesTable(res.stats, ref, fmt));
  if (res.stats.sensible || res.stats.preview || res.stats.breaker) say('', 'DETAIL: this sim (reference)', detailTable(res.stats, ref, fmt));
  for (const bot of ['sensible', 'preview', 'breaker'] as const) {
    const s = res.stats[bot];
    if (s) say(`Staff in the final line-ups of held games, ${bot}: ${staffLine(s)}`);
  }
  for (const bot of ['sensible', 'greedy'] as const) {
    const points = res.curves[bot];
    if (points?.length) say('', `${bot.toUpperCase()} BY TURN (games still going)`, curveTable(points, fmt));
  }
  console.log(out.join('\n'));
  if (args.json) writeFileSync(args.json, toJson({ ...res, crosscheck: cross, replay }));

  const allBots = BOT_NAMES.every((b) => args.bots.includes(b));
  if (args.strict && (!cross.ok || (replay && !replay.ok) || (allBots && !gatesOk))) process.exit(1);
}

if (process.argv.includes('--worker')) {
  process.on('message', (job: Job) => process.send!(runJob(job)));
} else {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
