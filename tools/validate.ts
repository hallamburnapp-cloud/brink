/** CLI: npm run content:validate [-- --json] [--strict]  (exit 1 on errors; --strict also fails on warnings). */
import { loadContent, formatIssues } from './load';
import { summarise } from '../src/content/validate';

const args = new Set(process.argv.slice(2));
const { content, issues } = loadContent();
const errors = issues.filter((i) => i.level === 'error').length;
const warnings = issues.filter((i) => i.level === 'warning').length;
if (args.has('--json')) {
  console.log(JSON.stringify({ summary: summarise(content), errors, warnings, issues }, null, 2));
} else {
  const s = summarise(content);
  console.log(
    `BRINK content: ${s.cards} cards (${s.arcs} arcs), ${s.pieces} pieces (${s.advisors} advisors / ${s.doctrines} doctrines / ${s.assets} assets), ${s.endings} endings, ${s.flashpoints} flashpoints, ${s.speakers} speakers`,
  );
  console.log(formatIssues(issues));
}
process.exit(errors > 0 || (args.has('--strict') && warnings > 0) ? 1 : 0);
