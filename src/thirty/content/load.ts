/**
 * Node loader: content-thirty/ on disk → RawThirty → ThirtyContent with issues. Used by the Vite
 * plugin (tools/vite-plugin-thirty.ts), the validator, the simulator and the tests. The browser
 * never imports this: it reads `virtual:thirty-content` through index.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';
import { compileThirty, type RawFile, type RawThirty } from './schema.ts';
import type { ContentIssue, ThirtyContent } from './types.ts';
import { validateThirty } from './validate.ts';

export { formatThirtyIssues, summariseThirty } from './validate.ts';

/** The pack directory: `content-thirty/` by default, or BRINK_THIRTY_DIR (relative to cwd or absolute). */
export function thirtyContentRoot(): string {
  const dir = process.env.BRINK_THIRTY_DIR || 'content-thirty';
  return dir.startsWith('/') ? dir : join(process.cwd(), dir);
}

function yamlFiles(dir: string): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((e) => /\.ya?ml$/.test(e))
    .sort()
    .map((e) => join(dir, e))
    .filter((p) => statSync(p).isFile());
}

export function loadThirtyRaw(root: string): { raw: RawThirty; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const read = (file: string): RawFile => {
    const rel = relative(root, file);
    try {
      return { file: rel, items: yaml.load(readFileSync(file, 'utf8'), { filename: file }) };
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0];
      issues.push({ level: 'error', where: rel, message: /ENOENT/.test(msg) ? 'file is missing' : `YAML parse error: ${msg}` });
      return { file: rel, items: undefined };
    }
  };
  const cards: RawFile[] = [];
  for (const name of ['regions.yaml', 'domestic.yaml', 'map.yaml']) cards.push(read(join(root, name)));
  for (const f of yamlFiles(join(root, 'arcs'))) cards.push(read(f));
  const raw: RawThirty = {
    advisers: read(join(root, 'advisers.yaml')),
    pieces: read(join(root, 'pieces.yaml')),
    cards,
  };
  return { raw, issues };
}

/**
 * Read, compile and validate the pack. Cross-reference checks run only when every item parsed, so
 * one broken card does not bury the writer in follow-on errors.
 */
export function loadThirtyContent(root = thirtyContentRoot()): { content: ThirtyContent; issues: ContentIssue[] } {
  const { raw, issues } = loadThirtyRaw(root);
  const compiled = compileThirty(raw);
  const all = [...issues, ...compiled.issues];
  if (!all.some((i) => i.level === 'error')) all.push(...validateThirty(compiled.content));
  return { content: compiled.content, issues: all };
}
