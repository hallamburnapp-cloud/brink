/** Filesystem loader: content/**.yaml → RawContent → Content (node only). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';
import { compileContent, type RawContent, type ContentIssue } from '../src/content/schema.ts';
import { validateContent } from '../src/content/validate.ts';
import type { Content } from '../src/engine/types.ts';

export function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries.sort()) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ya?ml$/.test(e)) out.push(p);
  }
  return out;
}

export function loadRaw(root: string): { raw: RawContent; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const read = (file: string): unknown => {
    try {
      return yaml.load(readFileSync(file, 'utf8'), { filename: file });
    } catch (e) {
      issues.push({ level: 'error', where: relative(root, file), message: `YAML parse error: ${(e as Error).message.split('\n')[0]}` });
      return undefined;
    }
  };
  const list = (dir: string) =>
    walk(join(root, dir))
      .map((f) => ({ file: relative(root, f), items: read(f) }))
      .filter((x) => x.items !== undefined) as { file: string; items: unknown[] }[];
  const raw: RawContent = {
    cards: list('cards'),
    pieces: list('pieces'),
    endings: list('endings'),
    seats: walk(join(root, 'seats')).map((f) => ({ file: relative(root, f), item: read(f) })),
    flashpoints: list('flashpoints'),
    speakers: { file: 'speakers.yaml', items: (read(join(root, 'speakers.yaml')) as unknown[]) ?? [] },
    rules: { file: 'rules.yaml', item: read(join(root, 'rules.yaml')) },
  };
  return { raw, issues };
}

export function loadContent(root = join(process.cwd(), 'content')): { content: Content; issues: ContentIssue[] } {
  const { raw, issues } = loadRaw(root);
  const compiled = compileContent(raw);
  const all = [...issues, ...compiled.issues];
  if (!all.some((i) => i.level === 'error')) all.push(...validateContent(compiled.content));
  return { content: compiled.content, issues: all };
}

export function formatIssues(issues: ContentIssue[]): string {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const lines: string[] = [];
  for (const i of errors) lines.push(`  ✖ ${i.where}: ${i.message}`);
  for (const i of warnings) lines.push(`  ⚠ ${i.where}: ${i.message}`);
  lines.push(`${errors.length} error(s), ${warnings.length} warning(s)`);
  return lines.join('\n');
}
