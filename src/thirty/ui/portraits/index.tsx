/**
 * The advisers' portraits: six silhouettes, each a dark head-and-shoulders on a disc of its own
 * accent colour. No faces, no text. The manifest maps an adviser's `portrait` key to a drawing;
 * swap a drawing here and every card that names it changes.
 */
import type { JSX } from 'preact';

export interface Portrait {
  /** The disc behind the silhouette. */
  accent: string;
  /** The silhouette, drawn in a 48 x 48 box, filled with the ink colour. */
  shape: JSX.Element;
}

const INK = '#1A2130';

/** Head and shoulders shared by the six; each adds what tells them apart. */
const bust = <path d="M24 13a7.2 7.2 0 1 1 0 14.4A7.2 7.2 0 0 1 24 13zM10 44c0-9 6-14.5 14-14.5S38 35 38 44z" fill={INK} />;

export const PORTRAITS: Record<string, Portrait> = {
  foreign: {
    accent: '#8FB3D9',
    shape: (
      <g>
        {bust}
        {/* A high collar and a small brooch. */}
        <path d="M17 30l7 5 7-5v4l-7 4-7-4z" fill="#8FB3D9" opacity="0.55" />
        <circle cx="24" cy="36.5" r="1.6" fill="#F3EFE6" />
      </g>
    ),
  },
  general: {
    accent: '#9AA98C',
    shape: (
      <g>
        {bust}
        {/* A peaked cap. */}
        <path d="M14.5 15.5c2-5 17-5 19 0l1 2.5h-21z" fill={INK} />
        <path d="M12 18h24l-1.5 2.6H13.5z" fill={INK} />
        <path d="M15 30l9 4 9-4" stroke="#9AA98C" stroke-width="1.4" fill="none" opacity="0.6" />
      </g>
    ),
  },
  intel: {
    accent: '#B7A3CF',
    shape: (
      <g>
        {bust}
        {/* A soft hat with a brim, pulled low. */}
        <path d="M15.5 14.5c1-6 16-6 17 0l0.8 4H14.7z" fill={INK} />
        <path d="M11 18.5h26l-2 2.4H13z" fill={INK} />
      </g>
    ),
  },
  admiral: {
    accent: '#7FA8B8',
    shape: (
      <g>
        {bust}
        {/* A flat naval cap and epaulettes. */}
        <path d="M14 13.5h20v3.5H14z" fill={INK} />
        <path d="M15 17h18l-1 2H16z" fill={INK} />
        <path d="M10.5 36h6.5v2h-6.5zM31 36h6.5v2H31z" fill="#F3EFE6" opacity="0.8" />
      </g>
    ),
  },
  chief: {
    accent: '#D1A26B',
    shape: (
      <g>
        {bust}
        {/* Hair tied up, shoulders a little lower. */}
        <circle cx="24" cy="11" r="4" fill={INK} />
        <path d="M17.5 17c2-4 11-4 13 0z" fill={INK} />
      </g>
    ),
  },
  ambassador: {
    accent: '#C9B07A',
    shape: (
      <g>
        {bust}
        {/* A bowler hat and a bow tie. */}
        <path d="M16.5 15.5c0-6 15-6 15 0v1.5h-15z" fill={INK} />
        <path d="M12.5 17h23v2.2h-23z" fill={INK} />
        <path d="M19.5 31.5l4.5 2 4.5-2v4l-4.5-2-4.5 2z" fill="#F3EFE6" opacity="0.85" />
      </g>
    ),
  },
};

const FALLBACK: Portrait = { accent: '#8E99A8', shape: bust };

export function portraitFor(key: string): Portrait {
  return PORTRAITS[key] ?? FALLBACK;
}

/** The portrait as drawn on a card: a disc with the silhouette, `size` px across. */
export function Silhouette({ portrait, size = 36 }: { portrait: string; size?: number }): JSX.Element {
  const p = portraitFor(portrait);
  return (
    <svg class="portrait" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill={p.accent} />
      <clipPath id={`pc-${portrait}`}>
        <circle cx="24" cy="24" r="24" />
      </clipPath>
      <g clip-path={`url(#pc-${portrait})`}>{p.shape}</g>
    </svg>
  );
}
