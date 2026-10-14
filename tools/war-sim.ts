/**
 * The war-room simulator CLI (spec sections 7 and 14).
 *
 *   npx tsx tools/war-sim.ts --runs 1000
 *
 * Prints the CALIBRATION table, the five simulator gates and the choice spread, each beside the
 * Python reference result, plus full-run survival for a greedy bot and a builder bot.
 * Work is spread over worker processes (--jobs). With --crosscheck it also replays crises in
 * the Python reference (docs/war/reference) on the same deck orders and compares every sweep.
 */
import { fork, type ChildProcess } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { BRAND } from '../src/config';
import {
  calibrationTable,
  collect,
  gatesTable,
  planJobs,
  runJob,
  runsReport,
  spreadReport,
  type Executor,
  type Job,
  type JobResult,
  type SimOptions,
} from '../src/war/sim';
import { PY_RERUN } from '../src/war/sim/reference';
import { runCrosscheck } from '../src/war/sim/crosscheck';

const USAGE = `usage: npx tsx tools/war-sim.ts [options]
  --runs N         crises per calibration row and gate (default 1000)
  --deals N        fresh deals for the choice spread (default 40 x runs)
  --full-runs N    full runs of the slice per bot, greedy and builder (default 200; 0 skips)
  --seed S         seed base (default war-sim)
  --jobs J         worker processes (default: CPUs - 1, at most 4; 1 runs in this process)
  --json PATH      also write the raw results as JSON
  --crosscheck N   replay N crises per bot in the Python reference and compare (needs python3)
  --reference-ties cross-check against the reference's own Surround tie-break, not the spec's
  --strict         exit 1 if a gate fails or the cross-check finds a difference
  --quiet          no progress lines
  --help`;

interface Args {
  runs: number;
  deals: number | null;
  fullRuns: number;
  seed: string;
  jobs: number;
  json: string | null;
  crosscheck: number;
  referenceTies: boolean;
  strict: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    runs: 1000,
    deals: null,
    fullRuns: 200,
    seed: 'war-sim',
    jobs: Math.max(1, Math.min(4, availableParallelism() - 1)),
    json: null,
    crosscheck: 0,
    referenceTies: false,
    strict: false,
    quiet: false,
  };
  const num = (v: string | undefined, flag: string) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) fail(`${flag} needs a whole number`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = () => argv[++i];
    switch (flag) {
      case '--runs':
        a.runs = Math.max(1, num(val(), flag));
        break;
      case '--deals':
        a.deals = Math.max(1, num(val(), flag));
        break;
      case '--full-runs':
        a.fullRuns = num(val(), flag);
        break;
      case '--seed':
        a.seed = val() ?? fail('--seed needs a value');
        break;
      case '--jobs':
        a.jobs = Math.max(1, num(val(), flag));
        break;
      case '--json':
        a.json = val() ?? fail('--json needs a path');
        break;
      case '--crosscheck':
        a.crosscheck = num(val(), flag);
        break;
      case '--reference-ties':
        a.referenceTies = true;
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

function fail(msg: string): never {
  console.error(`${msg}\n${USAGE}`);
  process.exit(2);
}

/** A pool of forked copies of this script, each running one job at a time. */
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

function inProcessWithProgress(): Executor {
  return async (jobs, onDone) => {
    const out: JobResult[] = [];
    for (const job of jobs) {
      out.push(runJob(job));
      onDone?.(out.length, jobs.length);
    }
    return out;
  };
}

/** JSON with bigints written as strings. */
const toJson = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x), 2);

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const opts: SimOptions = {
    seed: args.seed,
    crises: args.runs,
    deals: args.deals ?? 40 * args.runs,
    runs: args.fullRuns > 0 ? { greedy: args.fullRuns, builder: args.fullRuns } : {},
  };
  const jobs: Job[] = planJobs(opts);
  const exec = args.jobs > 1 ? pool(args.jobs) : inProcessWithProgress();
  const started = Date.now();
  let shown = -1;
  const progress = (done: number, total: number) => {
    const p = Math.floor((20 * done) / total);
    if (args.quiet || p === shown) return;
    shown = p;
    process.stderr.write(`  ${String(5 * p).padStart(3)}%  ${done}/${total} jobs  ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
  };
  const results = collect(opts.seed, await exec(jobs, progress));
  const seconds = (Date.now() - started) / 1000;

  const int = (n: number) => n.toLocaleString('en-GB');
  const out: string[] = [];
  out.push(`${BRAND.name} WAR ROOM SIMULATOR`);
  out.push(
    `seed ${opts.seed} · ${int(opts.crises)} crises per row · ${int(opts.deals)} deals · ` +
      `${int(args.fullRuns)} full runs per bot · ${seconds.toFixed(0)} s on ${args.jobs} process${args.jobs > 1 ? 'es' : ''}`,
  );
  out.push('');
  out.push('CALIBRATION (spec section 7): greedy bot, one crisis from a fresh map, no Airlift');
  out.push(calibrationTable(results.tallies, PY_RERUN));
  out.push("Gap: this sim minus the reference re-run. '!' marks a gap beyond sampling noise (2 standard errors).");
  out.push('');
  out.push('GATES (spec section 14), reference results in brackets');
  out.push(gatesTable(results.gates));
  out.push('');
  out.push('CHOICE SPREAD (spec section 14): every legal play of a fresh deal');
  out.push(spreadReport(results.spread));
  if (args.fullRuns > 0) {
    out.push('');
    out.push('FULL RUNS: share of runs that cleared each crisis of the slice');
    out.push(runsReport(results.runs));
  }

  let crossOk = true;
  if (args.crosscheck > 0) {
    out.push('');
    const ties = args.referenceTies ? 'reference' : 'spec';
    out.push(
      `CROSS-CHECK: the same deck orders replayed in the Python reference, ${args.crosscheck} crises per row ` +
        `(Surround ties broken the ${ties === 'spec' ? "spec's way, westmost" : "reference's way"})`,
    );
    const cc = runCrosscheck({ seed: `${opts.seed}-xc`, crises: args.crosscheck, deals: 4 * args.crosscheck, ties });
    out.push(cc.text);
    crossOk = cc.ok;
  }
  console.log(out.join('\n'));
  if (args.json) writeFileSync(args.json, toJson(results));

  const gatesOk = results.gates.every((g) => g.pass);
  if (args.strict && (!gatesOk || !crossOk)) process.exit(1);
}

if (process.argv.includes('--worker')) {
  process.on('message', (job: Job) => process.send!(runJob(job)));
} else {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
