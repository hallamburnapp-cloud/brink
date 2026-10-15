/**
 * CLI: npm run content:validate:thirty [-- --json] [--strict]
 * Exit 1 on errors; --strict also fails on warnings. BRINK_THIRTY_DIR points at another pack.
 */
import { formatThirtyIssues, loadThirtyContent, summariseThirty, thirtyContentRoot } from '../src/thirty/content/load.ts';

const args = new Set(process.argv.slice(2));
const root = thirtyContentRoot();
const { content, issues } = loadThirtyContent(root);
const errors = issues.filter((i) => i.level === 'error').length;
const warnings = issues.filter((i) => i.level === 'warning').length;
if (args.has('--json')) {
  console.log(JSON.stringify({ root, summary: summariseThirty(content), errors, warnings, issues }, null, 2));
} else {
  const s = summariseThirty(content);
  console.log(`Thirty Days content (${root}): ${s.cards} cards (${s.arcs} arcs, ${s.mapCards} map, ${s.domestic} domestic), ${s.advisers} advisers, ${s.pieces} pieces`);
  console.log(formatThirtyIssues(issues));
}
process.exit(errors > 0 || (args.has('--strict') && warnings > 0) ? 1 : 0);
