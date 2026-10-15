/**
 * Small line glyphs: the menu button and the twelve chip icons named in pieces.yaml (handshake,
 * phone, dove, bell, olive, medal, anchor, eye, radar, megaphone, flag, siren). Drawn, never typed.
 */
import type { JSX } from 'preact';

const PATHS: Record<string, JSX.Element> = {
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  handshake: <path d="M2 11l5-5 4 2 4-2 7 6-4 4-3-2-2 2-3-1-3 2-5-6z" />,
  phone: <path d="M5 3h4l2 5-2.5 1.5a9 9 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  dove: <path d="M3 13c4 1 8-1 10-5l2-4 2 3 4 1-3 2c0 5-4 9-9 9l-3 2 1-4c-2-1-3-2-4-4z" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />,
  olive: <path d="M4 20C8 10 14 6 21 4c-2 7-6 13-16 16zM4 20l8-8M9 11l-1 4M13 7l-1 4" />,
  medal: <path d="M8 3h8l-2 6h-4zM12 9a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />,
  anchor: <path d="M12 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 7v14M7 11h10M4 15c1 4 4 6 8 6s7-2 8-6" />,
  eye: <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />,
  radar: <path d="M12 12l6-6M12 12a8 8 0 1 0 8-8M12 12a4 4 0 1 0 4-4" />,
  megaphone: <path d="M3 10v4l10 4V6L3 10zM13 8l6-3v14l-6-3M6 14l1 5h3l-1-5" />,
  flag: <path d="M5 21V4M5 4h12l-2 4 2 4H5" />,
  siren: <path d="M7 18v-6a5 5 0 0 1 10 0v6M4 18h16v3H4zM12 3v2M5 6l1.5 1.5M19 6l-1.5 1.5" />,
};

export function Glyph({ name, size = 14 }: { name: string; size?: number }): JSX.Element {
  return (
    <svg class="glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {PATHS[name] ?? <circle cx="12" cy="12" r="6" />}
    </svg>
  );
}
