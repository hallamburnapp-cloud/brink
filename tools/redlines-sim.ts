/**
 * The Red Lines simulator CLI (BUILD.md "The simulator").
 *
 *   npx tsx tools/redlines-sim.ts [--games 2000] [--bots passive,sensible] [--seed R] [--pack DIR|fixture] [--md] [--json PATH] [--strict] [--quiet]
 *
 * Plays N games per bot and prints the gates, the outcomes, the phones and the ladder. --strict exits 1
 * when a gate fails. The pack is the engine's built-in fixture unless --pack names a content directory
 * (then the content builder's loader, src/redlines/content/load.ts, reads and validates it).
 */
import { writeFileSync } from 'node:fs';
import { BRAND } from '../src/config.ts';
import { checkContent, type RedlinesContent } from '../src/redlines/engine/content.ts';
import { FIXTURE_CONTENT } from '../src/redlines/engine/testkit.ts';
import { BOT_NAMES, dialsTable, gatesTable, isBotName, ladderTable, outcomesTable, phonesTable, simulate, treatyWeeksTable, type BotName, type Format } from '../src/redlines/sim/index.ts';

const USAGE = `usage: npx tsx tools/redlines-sim.ts [options]
  --games N     games per bot (default 2000)
  --bots LIST   passive, promise-everything, far-promise, sensible (default all four; the gates need passive, far-promise and sensible)
  --seed P      seed prefix: games are P0 ... P{N-1} for every bot (default R)
  --pack DIR    a content-redlines directory to load through src/redlines/content/load.ts (default: the engine's fixture pack)
  --md          tables as Markdown
  --json PATH   also write the statistics, gates and every game as JSON
  --strict      exit 1 if a gate fails
  --quiet       no progress lines
  --help`;

interface Args {
  games: number;
  bots: BotName[];
  prefix: string;
  pack: string | null;
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
  const a: Args = { games: 2000, bots: [...BOT_NAMES], prefix: 'R', pack: null, format: 'text', json: null, strict: false, quiet: false };
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
      case '--pack':
        a.pack = value();
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

/** The pack: the fixture, or a directory read through the content builder's loader (found at run time, so the engine builds without it). */
async function loadPack(dir: string | null): Promise<{ content: RedlinesContent; from: string }> {
  if (!dir || dir === 'fixture') return { content: FIXTURE_CONTENT, from: 'the engine fixture pack (src/redlines/engine/testkit.ts)' };
  const loaderPath = '../src/redlines/content/load.ts';
  let mod: { loadRedlinesContent?: (root: string) => { content: RedlinesContent | null; issues: Array<{ level: string; where: string; message: string }> } };
  try {
    mod = await import(loaderPath);
  } catch (e) {
    console.error(`cannot load ${loaderPath}: ${(e as Error).message}`);
    process.exit(1);
  }
  if (!mod.loadRedlinesContent) {
    console.error(`${loaderPath} has no loadRedlinesContent(root)`);
    process.exit(1);
  }
  const root = dir.startsWith('/') ? dir : `${process.cwd()}/${dir}`;
  const { content, issues } = mod.loadRedlinesContent(root);
  const errors = issues.filter((i) => i.level === 'error');
  if (!content || errors.length) {
    console.error(`the pack at ${root} has errors:\n${errors.map((i) => `  ${i.where}: ${i.message}`).join('\n')}`);
    process.exit(1);
  }
  const missing = checkContent(content);
  if (missing.length) {
    console.error(`the pack at ${root} is missing what the engine needs:\n${missing.map((m) => `  ${m}`).join('\n')}`);
    process.exit(1);
  }
  return { content, from: root };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { content, from } = await loadPack(args.pack);
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
  const out: string[] = [
    `${BRAND.name} · RED LINES SIMULATOR`,
    `${args.games.toLocaleString('en-GB')} games per bot (${res.options.bots.join(', ')}), seeds ${args.prefix}0-${args.prefix}${args.games - 1}, ${content.phones.length} phone templates from ${from} · ${res.seconds.toFixed(1)} s`,
    '',
    'GATES (BUILD.md "The simulator")',
    gatesTable(res.gates, fmt),
    res.gates.every((g) => g.pass) ? '=> ALL GATES PASS' : `=> ${res.gates.filter((g) => !g.pass).length} GATE(S) FAIL`,
    '',
    'OUTCOMES',
    outcomesTable(res.stats, fmt),
    '',
    'THE PHONE (means per game)',
    phonesTable(res.stats, fmt),
    '',
    'THE LADDER (games by the highest step reached)',
    ladderTable(res.stats, fmt),
  ];
  const s = res.stats.sensible;
  if (s) out.push('', 'TREATIES BY WEEK (sensible)', treatyWeeksTable(s, fmt), '', 'WHAT THEY WERE LIKE (sensible)', dialsTable(s, fmt));
  console.log(out.join('\n'));
  if (args.json) writeFileSync(args.json, JSON.stringify({ options: res.options, stats: res.stats, gates: res.gates, games: res.games }, null, 2));
  if (args.strict && !res.gates.every((g) => g.pass)) process.exit(1);
}

main();
