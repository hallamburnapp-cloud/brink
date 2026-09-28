import { render } from 'preact';
import './styles.css';
import { App } from './ui/App';
import { boot } from './ui/store';

boot();
render(<App />, document.getElementById('app')!);

// PWA: registered by vite-plugin-pwa (registerType: autoUpdate) in production builds.
if (import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}
