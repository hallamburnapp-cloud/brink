/**
 * BRINK: THIRTY DAYS entry point: the self-hosted fonts, the styles, the app, and in development
 * (or with VITE_THIRTY_HOOK=1) the window.__thirty scripting hook.
 */
import { render } from 'preact';
import { BRAND } from '../config';
import { App } from './ui/app/App';
import { installDevHook } from './ui/app/devHook';
import './ui/thirty.css';

function linkFonts(): void {
  const href = `${import.meta.env.BASE_URL}war/fonts/fonts.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

linkFonts();
document.title = BRAND.name;
if (import.meta.env.DEV || import.meta.env.VITE_THIRTY_HOOK === '1') installDevHook();

const root = document.getElementById('app');
if (root) render(<App />, root);
