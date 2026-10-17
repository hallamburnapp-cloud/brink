/**
 * Node loader: content-redlines/ on disk → RawRedlines → RedlinesContent with issues. Used by the
 * Vite plugin (tools/vite-plugin-redlines.ts), the validator (tools/redlines-validate.ts), the
 * simulator and the tests. The browser never imports this: it reads `virtual:redlines-content`
 * through index.ts.
 */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';
import { compileRedlines, type RawFile, type RawRedlines } from './schema.ts';
import type { ContentIssue, RedlinesPack } from './types.ts';
import { validateRedlines } from './validate.ts';

export { formatRedlinesIssues, summariseRedlines } from './validate.ts';

/** The pack directory: `content-redlines/` by default, or BRINK_REDLINES_DIR (relative to cwd or absolute). */
export function redlinesContentRoot(): string {
  const dir = process.env.BRINK_REDLINES_DIR || 'content-redlines';
  return dir.startsWith('/') ? dir : join(process.cwd(), dir);
}

export const PACK_FILES = ['advisers.yaml', 'lines.yaml', 'phones.yaml', 'debrief.yaml', 'strings.yaml'] as const;

export function loadRedlinesRaw(root: string): { raw: RawRedlines; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const read = (name: string): RawFile => {
    const file = join(root, name);
    const rel = relative(root, file);
    try {
      return { file: rel, items: yaml.load(readFileSync(file, 'utf8'), { filename: file }) };
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0];
      issues.push({ level: 'error', where: rel, message: /ENOENT/.test(msg) ? 'file is missing' : `YAML parse error: ${msg}` });
      return { file: rel, items: undefined };
    }
  };
  const raw: RawRedlines = {
    advisers: read('advisers.yaml'),
    lines: read('lines.yaml'),
    phones: read('phones.yaml'),
    debrief: read('debrief.yaml'),
    strings: read('strings.yaml'),
  };
  return { raw, issues };
}

/**
 * Read, compile and validate the pack. Cross-reference checks run only when every item parsed, so
 * one broken template does not bury the writer in follow-on errors. `content` is null only when
 * strings.yaml itself failed to parse or to match its schema.
 */
export function loadRedlinesContent(root = redlinesContentRoot()): { content: RedlinesPack | null; issues: ContentIssue[] } {
  const { raw, issues } = loadRedlinesRaw(root);
  const compiled = compileRedlines(raw);
  const all = [...issues, ...compiled.issues];
  if (compiled.content && !all.some((i) => i.level === 'error')) all.push(...validateRedlines(compiled.content));
  return { content: compiled.content, issues: all };
}
