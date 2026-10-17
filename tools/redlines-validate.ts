/**
 * CLI: npx tsx tools/redlines-validate.ts [--json] [--strict]
 * (npm run content:validate:redlines once the integrator adds the script.)
 * Exit 1 on errors; --strict also fails on warnings. BRINK_REDLINES_DIR points at another pack.
 * Errors include: a phone over forty words once its slots are filled, any option or adviser line
 * with "if they" or "if you", an unknown slot, id, region or caller, a missing adviser voice.
 */
import { formatRedlinesIssues, loadRedlinesContent, redlinesContentRoot, summariseRedlines } from '../src/redlines/content/load.ts';

const args = new Set(process.argv.slice(2));
const root = redlinesContentRoot();
const { content, issues } = loadRedlinesContent(root);
const errors = issues.filter((i) => i.level === 'error').length;
const warnings = issues.filter((i) => i.level === 'warning').length;
if (args.has('--json')) {
  console.log(JSON.stringify({ root, summary: summariseRedlines(content), errors, warnings, issues }, null, 2));
} else {
  const s = summariseRedlines(content);
  console.log(`Red Lines content (${root}): ${s.advisers} advisers, ${s.lines} lines, ${s.phones} phone templates (${s.kinds} kinds), ${s.thoughts} thoughts, ${s.strings} strings`);
  console.log(formatRedlinesIssues(issues));
}
process.exit(errors > 0 || (args.has('--strict') && warnings > 0) ? 1 : 0);
