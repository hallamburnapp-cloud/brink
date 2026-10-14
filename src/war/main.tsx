/**
 * The war-room slice's entry point: fonts (self-hosted), material textures, styles, the app, and
 * in development the window.__war scripting hook.
 */
import { render } from 'preact';
import { BRAND } from '../config';
import { App } from './ui/app/App';
import { installDevHook } from './ui/app/devHook';
import { installTextures } from './ui/fx/textures';
import './ui/war.css';

function linkFonts(): void {
  const href = `${import.meta.env.BASE_URL}war/fonts/fonts.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

linkFonts();
installTextures();
document.title = BRAND.name;
if (import.meta.env.DEV || import.meta.env.VITE_WAR_HOOK === '1') installDevHook();

const root = document.getElementById('app');
if (root) render(<App />, root);
