/**
 * The THIRTY DAYS simulator CLI (SPEC "Balance gates").
 *
 *   npx tsx tools/thirty-sim.ts [--games 2000] [--bots random,sensible] [--seed T] [--md] [--json PATH] [--strict] [--quiet]
 *
 * Plays N games per bot on the pack in content-thirty/ (or BRINK_THIRTY_DIR) and prints the gates,
 * the outcomes, the piece take rates and the DANGER curve. --strict exits 1 when a gate fails.
 */
import { writeFileSync } from 'node:fs';
import { BRAND } from '../src/config.ts';
import { formatThirtyIssues, loadThirtyContent, thirtyContentRoot } from '../src/thirty/content/load.ts';
import { BOT_NAMES, curveLine, feelTable, gatesTable, isBotName, outcomesTable, piecesTable, simulate, teamSizeTable, type BotName, type Format } from '../src/thirty/sim/index.ts';

const USAGE = `usage: npx tsx tools/thirty-sim.ts [options]
  --games N     games per bot (default 2000)
  --bots LIST   random, sensible, hawk (default all three; the gates need all three)
  --seed P      seed prefix: games are P0 ... P{N-1} for every bot (default T)
  --md          tables as Markdown
  --json PATH   also write the statistics, gates and every game as JSON
  --strict      exit 1 if a gate fails
  --quiet       no progress lines
  --help`;

interface Args {
  games: number;
  bots: BotName[];
  prefix: string;
  format: Format;
  json: string | null;
  strict: boolean;
  quiet: boolean;
}

function fail(msg: string): never {
  console.error(`${msg}\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv: readonly string[]): Args {
  const a: Args = { games: 2000, bots: [...BOT_NAMES], prefix: 'T', format: 'text', json: null, strict: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => argv[++i] ?? fail(`${flag} needs a value`);
    switch (flag) {
      case '--games': {
        const n = Number(value());
        if (!Number.isInteger(n) || n < 1) fail('--games needs a whole number of at least 1');
        a.games = n;
        break;
      }
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
      case '--md':
        a.format = 'md';
        break;
      case '--json':
        a.json = value();
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

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const root = thirtyContentRoot();
  const { content, issues } = loadThirtyContent(root);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) {
    console.error(`the pack at ${root} has errors:\n${formatThirtyIssues(errors)}`);
    process.exit(1);
  }
  let shown = -1;
  const res = simulate(content, {
    games: args.games,
    bots: args.bots,
    prefix: args.prefix,
    onProgress: (done, total) => {
      const step = Math.floor((10 * done) / total);
      if (args.quiet || step === shown) return;
      shown = step;
      process.stderr.write(`  ${String(10 * step).padStart(3)}%  ${done}/${total} games\n`);
    },
  });
  const fmt = args.format;
  const out: string[] = [];
  out.push(
    `${BRAND.name} · THIRTY DAYS SIMULATOR`,
    `${args.games.toLocaleString('en-GB')} games per bot (${res.options.bots.join(', ')}), seeds ${args.prefix}0-${args.prefix}${args.games - 1}, ` +
      `${content.cardOrder.length} cards from ${root} · ${res.seconds.toFixed(1)} s`,
    '',
    'GATES (SPEC "Balance gates")',
    gatesTable(res.gates, fmt),
    res.gates.every((g) => g.pass) ? '=> ALL GATES PASS' : `=> ${res.gates.filter((g) => !g.pass).length} GATE(S) FAIL`,
    '',
    'OUTCOMES',
    outcomesTable(res.stats, fmt),
    '',
    'OVER THE SHOULDER (what the playtests measured)',
    feelTable(res.stats, fmt),
  );
  const s = res.stats.sensible;
  if (s) {
    out.push('', 'PIECES (sensible)', piecesTable(content, s, fmt), '', 'HOLD RATE BY TEAM SIZE (sensible)', teamSizeTable(s, fmt), '', 'MEAN DANGER BY DAY (sensible, games still going)', curveLine(s));
  }
  const r = res.stats.random;
  if (r) out.push('', 'MEAN DANGER BY DAY (random, games still going)', curveLine(r));
  console.log(out.join('\n'));
  if (args.json) writeFileSync(args.json, JSON.stringify({ options: res.options, stats: res.stats, gates: res.gates, games: res.games }, null, 2));
  if (args.strict && !res.gates.every((g) => g.pass)) process.exit(1);
}

main();
