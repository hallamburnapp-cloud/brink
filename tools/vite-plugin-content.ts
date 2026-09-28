/**
 * Vite plugin: exposes compiled content as `virtual:brink-content` and hot
 * reloads it when anything under /content changes. Validation issues are
 * printed to the terminal and shipped with the module so the dev banner can
 * show them in-game without leaving the run.
 */
import type { Plugin, ViteDevServer } from 'vite';
import { join } from 'node:path';
import { loadContent, formatIssues } from './load.ts';

const VIRTUAL = 'virtual:brink-content';
const RESOLVED = '\0' + VIRTUAL;

export function brinkContentPlugin(): Plugin {
  const root = join(process.cwd(), 'content');
  let server: ViteDevServer | null = null;

  const build = () => {
    const { content, issues } = loadContent(root);
    const errors = issues.filter((i) => i.level === 'error');
    if (issues.length) console.log('\n[brink content]\n' + formatIssues(issues));
    // Production builds refuse invalid content; BRINK_CONTENT_LENIENT=1 lets a preview build through.
    if (errors.length && !server && !process.env.BRINK_CONTENT_LENIENT) throw new Error(`Content validation failed with ${errors.length} error(s)`);
    return { content, issues };
  };

  return {
    name: 'brink-content',
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      const { content, issues } = build();
      return `export default ${JSON.stringify(content)};\nexport const issues = ${JSON.stringify(issues)};`;
    },
    configureServer(s) {
      server = s;
      s.watcher.add(root);
    },
    // Route content file changes to the virtual module so Vite's own HMR
    // propagation reaches src/content/index.ts (which self-accepts) instead
    // of falling back to a full page reload.
    handleHotUpdate({ file, server: s }) {
      if (!file.startsWith(root)) return;
      const mod = s.moduleGraph.getModuleById(RESOLVED);
      if (!mod) return [];
      s.moduleGraph.invalidateModule(mod);
      return [mod];
    },
  };
}
