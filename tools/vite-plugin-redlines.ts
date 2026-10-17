/**
 * Vite plugin: compiles content-redlines/ to one JSON module, `virtual:redlines-content`, and hot
 * reloads it when any YAML in the pack changes. Issues are printed to the terminal and shipped with
 * the module so a dev banner can show them in-game. Register it in vite.config.ts next to
 * thirtyContentPlugin(), for VITE_GAME=redlines (the integrator's step).
 */
import type { Plugin, ViteDevServer } from 'vite';
import { formatRedlinesIssues, loadRedlinesContent, redlinesContentRoot } from '../src/redlines/content/load.ts';

const VIRTUAL = 'virtual:redlines-content';
const RESOLVED = '\0' + VIRTUAL;

export function redlinesContentPlugin(): Plugin {
  const root = redlinesContentRoot();
  let server: ViteDevServer | null = null;

  const build = () => {
    const { content, issues } = loadRedlinesContent(root);
    const errors = issues.filter((i) => i.level === 'error');
    if (issues.length) console.log('\n[redlines content]\n' + formatRedlinesIssues(issues));
    // Production builds refuse invalid content; BRINK_CONTENT_LENIENT=1 lets a preview build through.
    if (errors.length && !server && !process.env.BRINK_CONTENT_LENIENT) throw new Error(`Red Lines content validation failed with ${errors.length} error(s)`);
    // Without strings there is nothing to show; in dev the HMR handler keeps the last good pack.
    if (!content) throw new Error('Red Lines content: strings.yaml did not compile');
    return { content, issues };
  };

  return {
    name: 'redlines-content',
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
    // src/redlines/content/index.ts (which self-accepts) instead of a full page reload.
    handleHotUpdate({ file, server: s }) {
      if (!file.startsWith(root)) return;
      const mod = s.moduleGraph.getModuleById(RESOLVED);
      if (!mod) return [];
      s.moduleGraph.invalidateModule(mod);
      return [mod];
    },
  };
}
