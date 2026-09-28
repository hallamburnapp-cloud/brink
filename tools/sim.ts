/**
 * CLI: headless balance simulation.
 *
 *   npx tsx tools/sim.ts --runs 20000 --policy heuristic|greedy|random|all --seat republic|all \
 *       --seed base --difficulty 5 --out sim-output/ [--mode endless] [--quiet] [--json] [--strict] [--fixture]
 *
 * Loads content from ./content (exit 1 with the issues when it has errors), or the
 * engine test fixture when BRINK_SIM_FIXTURE=1 / --fixture is given. Writes
 * <out>/report-<timestamp>.md, <out>/report-latest.md and <out>/report-latest.json.
 * Prints progress every 5% to stderr unless --quiet; prints the markdown report to
 * stdout (or the JSON with --json). --strict exits 1 when any balance target FAILs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fixture } from '../src/engine/fixture';
import { SEATS, type Content, type Mode, type Seat } from '../src/engine/types';
import { POLICY_NAMES, policyByName, type Policy } from '../src/sim/policies';
import { formatReport, simulate } from '../src/sim/simulate';
import { formatIssues, loadContent } from './load';

interface Args {
  runs: number;
  policies: Policy[];
  seats: Seat[] | 'all';
  seed: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  mode: Mode;
  out: string;
  quiet: boolean;
  json: boolean;
  strict: boolean;
  fixture: boolean;
  help: boolean;
}

const USAGE = `usage: tsx tools/sim.ts [options]
  --runs N            runs per policy (default 2000)
  --policy P          heuristic | greedy | random | all, or a comma list (default all)
  --seat S            republic | federation | coalition | all, or a comma list (default all, round-robin)
  --seed BASE         seed base; run i uses "BASE-i" (default brink)
  --difficulty 1..5   DEFCON level (default 5)
  --mode M            endless | daily | challenge (default endless)
  --out DIR           output directory (default sim-output/)
  --quiet             no progress, one-line summary only
  --json              print the JSON report to stdout instead of markdown
  --strict            exit 1 when any balance target fails
  --fixture           simulate the engine test fixture instead of ./content (also BRINK_SIM_FIXTURE=1)
  --help`;

function fail(msg: string): never {
  console.error(msg);
  process.exit(2);
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    runs: 2000,
    policies: POLICY_NAMES.map(policyByName),
    seats: 'all',
    seed: 'brink',
    difficulty: 5,
    mode: 'endless',
    out: 'sim-output',
    quiet: false,
    json: false,
    strict: false,
    fixture: process.env.BRINK_SIM_FIXTURE === '1',
    help: false,
  };
  const next = (i: number, flag: string): string => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) fail(`${flag} needs a value\n${USAGE}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    const flag = eq >= 0 ? arg.slice(0, eq) : arg;
    const inline = eq >= 0 ? arg.slice(eq + 1) : undefined;
    const value = (): string => {
      if (inline !== undefined) return inline;
      const v = next(i, flag);
      i++;
      return v;
    };
    switch (flag) {
      case '--runs': {
        const n = Number(value());
        if (!Number.isFinite(n) || n < 0) fail('--runs must be a non-negative number');
        a.runs = Math.floor(n);
        break;
      }
      case '--policy': {
        const v = value();
        a.policies = v === 'all' ? POLICY_NAMES.map(policyByName) : v.split(',').map((s) => policyByName(s.trim()));
        break;
      }
      case '--seat': {
        const v = value();
        if (v === 'all') a.seats = 'all';
        else {
          const seats = v.split(',').map((s) => s.trim());
          for (const s of seats) if (!(SEATS as readonly string[]).includes(s)) fail(`unknown seat "${s}" (expected ${SEATS.join(', ')} or all)`);
          a.seats = seats as Seat[];
        }
        break;
      }
      case '--seed':
        a.seed = value();
        break;
      case '--difficulty': {
        const n = Number(value());
        if (![1, 2, 3, 4, 5].includes(n)) fail('--difficulty must be 1..5');
        a.difficulty = n as Args['difficulty'];
        break;
      }
      case '--mode': {
        const v = value();
        if (!['endless', 'daily', 'challenge'].includes(v)) fail('--mode must be endless, daily or challenge');
        a.mode = v as Mode;
        break;
      }
      case '--out':
        a.out = value();
        break;
      case '--quiet':
        a.quiet = true;
        break;
      case '--json':
        a.json = true;
        break;
      case '--strict':
        a.strict = true;
        break;
      case '--fixture':
        a.fixture = true;
        break;
      case '--help':
      case '-h':
        a.help = true;
        break;
      default:
        fail(`unknown option ${arg}\n${USAGE}`);
    }
  }
  return a;
}

function loadForSim(useFixture: boolean, quiet: boolean): Content {
  if (useFixture) {
    if (!quiet) console.error('Using the engine test fixture (BRINK_SIM_FIXTURE=1 / --fixture).');
    return fixture();
  }
  const { content, issues } = loadContent();
  const errors = issues.filter((i) => i.level === 'error').length;
  if (errors > 0) {
    console.error('Content has validation errors; fix them before simulating:');
    console.error(formatIssues(issues));
    process.exit(1);
  }
  if (!quiet && issues.length) console.error(formatIssues(issues));
  return content;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const content = loadForSim(args.fixture, args.quiet);

  const started = Date.now();
  let lastBucket = -1;
  const report = simulate(content, {
    runs: args.runs,
    policies: args.policies,
    seats: args.seats,
    seedBase: args.seed,
    difficulty: args.difficulty,
    mode: args.mode,
    onProgress: args.quiet
      ? undefined
      : (done, total, policy) => {
          const bucket = Math.floor((done / total) * 20);
          if (bucket !== lastBucket) {
            lastBucket = bucket;
            const secs = ((Date.now() - started) / 1000).toFixed(1);
            console.error(`  ${String(bucket * 5).padStart(3)}%  ${done}/${total} runs  (${policy})  ${secs}s`);
          }
        },
  });
  const elapsed = (Date.now() - started) / 1000;

  const outDir = resolve(process.cwd(), args.out);
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const md = formatReport(report);
  const json = JSON.stringify(report, null, 2);
  const stamped = join(outDir, `report-${stamp}.md`);
  writeFileSync(stamped, md);
  writeFileSync(join(outDir, 'report-latest.md'), md);
  writeFileSync(join(outDir, 'report-latest.json'), json);

  const pass = report.targets.filter((t) => t.status === 'PASS').length;
  const failCount = report.targets.filter((t) => t.status === 'FAIL').length;
  if (args.json) console.log(json);
  else if (!args.quiet) console.log(md);
  console.error(
    `Simulated ${report.meta.runsPerPolicy} × ${report.meta.policies.length} runs in ${elapsed.toFixed(1)}s. Targets: ${pass} PASS, ${failCount} FAIL. Wrote ${stamped}, report-latest.md, report-latest.json in ${outDir}`,
  );
  if (args.strict && failCount > 0) process.exit(1);
}

main();
