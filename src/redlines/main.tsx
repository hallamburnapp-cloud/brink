/**
 * BRINK: Red Lines entry point: the self-hosted fonts (public/redlines/fonts), the paper look's
 * styles, the app, and in development (or with VITE_REDLINES_HOOK=1) the window.__redlines hook.
 */
import { render } from 'preact';
import { BRAND } from '../config';
import { App } from './ui/app/App';
import { installDevHook } from './ui/app/devHook';
import './ui/paper/paper.css';
import './ui/redlines.css';

function linkFonts(): void {
  const href = `${import.meta.env.BASE_URL}redlines/fonts/fonts.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

linkFonts();
document.title = BRAND.name;
if (import.meta.env.DEV || import.meta.env.VITE_REDLINES_HOOK === '1') installDevHook();

const root = document.getElementById('app');
if (root) render(<App />, root);
