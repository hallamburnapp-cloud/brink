/**
 * The one entry point. VITE_GAME is fixed at build time, so the branch not taken is removed from
 * the bundle: a war build (VITE_GAME=war) never ships the hotel's app or its content chunk, and an
 * unset build boots the hotel exactly as before.
 */
async function bootHotel(): Promise<void> {
  const [{ h, render }, { App }, { boot }] = await Promise.all([
    import('preact'),
    import('./ui/App'),
    import('./ui/store'),
    import('./styles.css'),
  ]);
  boot();
  render(h(App, null), document.getElementById('app')!);
}

const started = import.meta.env.VITE_GAME === 'war' ? import('./war/main') : bootHotel();

// PWA: registered by vite-plugin-pwa (registerType: autoUpdate) in production builds, once the
// game is on screen so the precache never competes with first paint.
if (import.meta.env.PROD) {
  started
    .then(() => import('virtual:pwa-register'))
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}
