/**
 * Vite plugin: compiles content-thirty/ to one JSON module, `virtual:thirty-content`, and hot
 * reloads it when any YAML under the pack changes. Issues are printed to the terminal and shipped
 * with the module so a dev banner can show them in-game. Register it in vite.config.ts next to
 * brinkContentPlugin() (or in place of it when VITE_GAME=thirty).
 */
import type { Plugin, ViteDevServer } from 'vite';
import { formatThirtyIssues, loadThirtyContent, thirtyContentRoot } from '../src/thirty/content/load.ts';

const VIRTUAL = 'virtual:thirty-content';
const RESOLVED = '\0' + VIRTUAL;

export function thirtyContentPlugin(): Plugin {
  const root = thirtyContentRoot();
  let server: ViteDevServer | null = null;

  const build = () => {
    const { content, issues } = loadThirtyContent(root);
    const errors = issues.filter((i) => i.level === 'error');
    if (issues.length) console.log('\n[thirty content]\n' + formatThirtyIssues(issues));
    // Production builds refuse invalid content; BRINK_CONTENT_LENIENT=1 lets a preview build through.
    if (errors.length && !server && !process.env.BRINK_CONTENT_LENIENT) throw new Error(`Thirty Days content validation failed with ${errors.length} error(s)`);
    return { content, issues };
  };

  return {
    name: 'thirty-content',
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
    // Route pack file changes to the virtual module so Vite's own HMR propagation reaches
    // src/thirty/content/index.ts (which self-accepts) instead of a full page reload.
    handleHotUpdate({ file, server: s }) {
      if (!file.startsWith(root)) return;
      const mod = s.moduleGraph.getModuleById(RESOLVED);
      if (!mod) return [];
      s.moduleGraph.invalidateModule(mod);
      return [mod];
    },
  };
}
