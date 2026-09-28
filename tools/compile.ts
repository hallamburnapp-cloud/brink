/** Write compiled content JSON to stdout or a file: tsx tools/compile.ts [out.json] */
import { writeFileSync } from 'node:fs';
import { loadContent, formatIssues } from './load';

const { content, issues } = loadContent();
if (issues.some((i) => i.level === 'error')) {
  console.error(formatIssues(issues));
  process.exit(1);
}
const out = process.argv[2];
const json = JSON.stringify(content);
if (out) writeFileSync(out, json);
else process.stdout.write(json);
