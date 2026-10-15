import { defineConfig, loadEnv, type Plugin, type Rollup } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { brinkContentPlugin } from './tools/vite-plugin-content.ts';
import { thirtyContentPlugin } from './tools/vite-plugin-thirty.ts';
import { BRAND } from './src/config.ts';
import { WAR_META } from './src/war/meta.ts';
import { THIRTY_META } from './src/thirty/meta.ts';

const base = process.env.BRINK_BASE ?? '/';

type OutputChunk = Rollup.OutputChunk;

/** The game a build is for: the hotel by default, the war room or THIRTY DAYS by VITE_GAME. */
type Game = 'hotel' | 'war' | 'thirty';

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * src/main.tsx reaches the game through a dynamic import, so Vite would only fetch the game once
 * the entry has run. Preloading the chunks it imports (and theirs) from the page head keeps the
 * first load one parallel round trip, as it was when the hotel was imported statically.
 */
function gamePreload(): Plugin {
  let resolvedBase = base;
  return {
    name: 'brink-game-preload',
    configResolved(config) {
      resolvedBase = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const chunks = new Map<string, OutputChunk>();
        for (const c of Object.values(bundle)) if (c.type === 'chunk') chunks.set(c.fileName, c);
        // index.html is the only entry; its chunk is src/main.tsx.
        const entry = [...chunks.values()].find((c) => c.isEntry);
        if (!entry) return html;
        const files = new Set<string>();
        const add = (file: string) => {
          const c = chunks.get(file);
          if (!c || files.has(file) || file === entry.fileName) return;
          files.add(file);
          c.imports.forEach(add);
        };
        // The service-worker registration loads after the game is on screen; it is not preloaded.
        entry.dynamicImports.filter((f) => !/pwa-register|workbox/.test(f)).forEach(add);
        const links = [...files].map((f) => `<link rel="modulepreload" crossorigin href="${resolvedBase}${f}">`).join('\n    ');
        return links ? html.replace(/(\s*)(<script type="module")/, `$1${links}$1$2`) : html;
      },
    },
  };
}

/** What a game other than the hotel says about itself in the page head. */
interface HeadMeta {
  description: string;
  themeColor: string;
}

/**
 * VITE_GAME=war or thirty: the page head speaks for that game, not the hotel. index.html stays the
 * hotel's by default; this rewrites its title, description, link-preview tags and theme for the
 * build, links the self-hosted fonts early (both games share public/war/fonts), and paints the
 * table colour before any script runs.
 */
function gameHead(name: string, meta: HeadMeta): Plugin {
  let resolvedBase = base;
  return {
    name: `brink-${name}-head`,
    configResolved(config) {
      resolvedBase = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const description = escapeAttr(meta.description);
        const tag = (attr: 'name' | 'property', key: string, content: string) =>
          `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`;
        const out = html
          .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(BRAND.name)}</title>`)
          .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />')
          .replace(/<meta name="theme-color"[^>]*>/, tag('name', 'theme-color', meta.themeColor))
          .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}" />`)
          .replace(/<meta property="og:title"[^>]*>/, tag('property', 'og:title', BRAND.name))
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`)
          // The hotel's preview image is not this game's; a text card until the game has its own.
          .replace(/\s*<meta property="og:image"[^>]*>/, '')
          .replace(/<meta name="twitter:card"[^>]*>/, tag('name', 'twitter:card', 'summary'));
        const head = [
          '<meta name="color-scheme" content="dark" />',
          '<meta name="apple-mobile-web-app-capable" content="yes" />',
          '<meta name="mobile-web-app-capable" content="yes" />',
          '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
          `<link rel="stylesheet" href="${resolvedBase}war/fonts/fonts.css" />`,
          `<style>html,body{margin:0;background:${meta.themeColor}}</style>`,
        ].join('\n    ');
        return out.replace('</title>', `</title>\n    ${head}`);
      },
    },
    // public/ is shared by the games; the hotel's generated preview image has no place in this build.
    writeBundle(options) {
      if (options.dir) rmSync(join(options.dir, 'og-image.png'), { force: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const chosen = process.env.VITE_GAME ?? env.VITE_GAME;
  const game: Game = chosen === 'war' ? 'war' : chosen === 'thirty' ? 'thirty' : 'hotel';
  const war = game === 'war';
  const thirty = game === 'thirty';
  const themeColor = war ? WAR_META.themeColor : thirty ? THIRTY_META.themeColor : '#0b1220';
  const tagline = war ? WAR_META.tagline : thirty ? THIRTY_META.tagline : BRAND.tagline;
  return {
    base,
    plugins: [
      preact(),
      tailwindcss(),
      brinkContentPlugin(),
      // THIRTY DAYS compiles its own pack (content-thirty/) into virtual:thirty-content.
      ...(thirty ? [thirtyContentPlugin()] : []),
      ...(war ? [gameHead('war', WAR_META)] : []),
      ...(thirty ? [gameHead('thirty', THIRTY_META)] : []),
      gamePreload(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png'],
        manifest: {
          name: BRAND.name,
          short_name: BRAND.name,
          description: tagline,
          theme_color: themeColor,
          background_color: themeColor,
          display: 'standalone',
          orientation: 'portrait',
          // A sub-path deploy (GitHub Pages at /brink/) needs the manifest to start and scope there.
          start_url: base,
          scope: base,
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
          // Each game precaches only its own files: the fonts in public/war serve the war room and
          // THIRTY DAYS; the hotel leaves them out.
          globIgnores: game === 'hotel' ? ['**/node_modules/**', 'war/**'] : ['**/node_modules/**', 'og-image.png'],
          navigateFallback: 'index.html',
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('virtual:brink-content')) return 'content';
            if (id.includes('virtual:thirty-content')) return 'content';
            if (id.includes('/src/audio/')) return 'audio';
            if (id.includes('/src/meta/share')) return 'share';
          },
        },
      },
    },
    test: {
      include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
      environment: 'node',
    },
  };
});
