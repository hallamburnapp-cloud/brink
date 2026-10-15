/**
 * Glyph: the small single-colour marks the HUD needs, and the characters the self-hosted fonts lack
 * (◆ ⚓ ★ →, STYLE section 4), drawn as SVG so iOS never substitutes an emoji or a system face.
 * Glyphs take `currentColor` unless given a colour, and size by height: text glyphs keep their own
 * narrow aspect so they sit in a line of type like a character.
 */
import type { JSX } from 'preact';
import { COLOURS, type Colour } from '../../content/map';
import { Frame, type FrameProps } from './kit';
import { poly } from './shapes';

export type GlyphName =
  | 'swap'
  | 'speed'
  | 'info'
  | 'close'
  | 'settings'
  | 'home'
  | 'soundOn'
  | 'soundOff'
  | 'sell'
  | 'lock'
  | 'reroll'
  | 'check'
  | 'back'
  | 'diamond'
  | 'anchor'
  | 'star'
  | 'arrow';

interface GlyphDef {
  /** viewBox width and height. */
  box: readonly [number, number];
  draw: (c: string) => JSX.Element;
}

const strokeProps = (c: string, w = 2) =>
  ({ fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) as const;

function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const pts: Array<[number, number]> = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [
      [-0.3, inner],
      [-0.17, outer],
      [0.17, outer],
      [0.3, inner],
    ] as const) {
      const t = a + da * step * 1.6;
      pts.push([cx + Math.sin(t) * r, cy - Math.cos(t) * r]);
    }
  }
  return poly(pts);
}

const SPEAKER = 'M3.6 9.4 H7.6 L12.6 5 V19 L7.6 14.6 H3.6 Z';

const GLYPHS: Readonly<Record<GlyphName, GlyphDef>> = {
  swap: {
    box: [24, 24],
    draw: (c) => <path d="M4 8.5 H18.5 M15 5 L18.5 8.5 L15 12 M20 15.5 H5.5 M9 12 L5.5 15.5 L9 19" {...strokeProps(c)} />,
  },
  speed: {
    box: [24, 24],
    draw: (c) => (
      <path d="M3.6 6.4 L11.4 12 L3.6 17.6 Z M12.4 6.4 L20.2 12 L12.4 17.6 Z" fill={c} stroke={c} stroke-width="1.6" stroke-linejoin="round" />
    ),
  },
  info: {
    box: [24, 24],
    draw: (c) => (
      <>
        <circle cx="12" cy="12" r="9" {...strokeProps(c)} />
        <path d="M12 11 V16.6" {...strokeProps(c, 2.2)} />
        <circle cx="12" cy="7.6" r="1.35" fill={c} />
      </>
    ),
  },
  close: { box: [24, 24], draw: (c) => <path d="M6 6 L18 18 M18 6 L6 18" {...strokeProps(c, 2.2)} /> },
  settings: {
    box: [24, 24],
    draw: (c) => (
      <>
        <path d={gearPath(12, 12, 9.6, 7.2, 8)} {...strokeProps(c, 1.8)} />
        <circle cx="12" cy="12" r="3" {...strokeProps(c, 1.8)} />
      </>
    ),
  },
  home: {
    box: [24, 24],
    draw: (c) => (
      <path d="M3.6 11.4 L12 4 L20.4 11.4 M6 9.6 V20 H18 V9.6 M10 20 V14.6 H14 V20" {...strokeProps(c)} />
    ),
  },
  soundOn: {
    box: [24, 24],
    draw: (c) => (
      <>
        <path d={SPEAKER} {...strokeProps(c)} />
        <path d="M15.6 9.2 Q17.2 12 15.6 14.8 M18.2 6.6 Q21.6 12 18.2 17.4" {...strokeProps(c)} />
      </>
    ),
  },
  soundOff: {
    box: [24, 24],
    draw: (c) => (
      <>
        <path d={SPEAKER} {...strokeProps(c)} />
        <path d="M16 9.6 L20.8 14.4 M20.8 9.6 L16 14.4" {...strokeProps(c)} />
      </>
    ),
  },
  sell: {
    box: [24, 24],
    draw: (c) => (
      <>
        <path d="M3.8 12.4 V5.4 Q3.8 3.8 5.4 3.8 H12.4 L20.6 12 L12 20.6 Z" {...strokeProps(c)} />
        <circle cx="8.4" cy="8.4" r="1.7" fill={c} />
      </>
    ),
  },
  lock: {
    box: [24, 24],
    draw: (c) => (
      <>
        <rect x="5" y="10.6" width="14" height="10" rx="2" {...strokeProps(c)} />
        <path d="M8.2 10.6 V7.8 A3.8 3.8 0 0 1 15.8 7.8 V10.6" {...strokeProps(c)} />
        <path d="M12 14.4 V16.6" {...strokeProps(c, 2.2)} />
      </>
    ),
  },
  reroll: {
    box: [24, 24],
    draw: (c) => (
      <>
        <path d="M19.4 9.6 A7.8 7.8 0 0 0 5 8.2 M4.6 14.4 A7.8 7.8 0 0 0 19 15.8" {...strokeProps(c)} />
        <path d="M19.8 4.6 V9.8 H14.6 M4.2 19.4 V14.2 H9.4" {...strokeProps(c)} />
      </>
    ),
  },
  check: { box: [24, 24], draw: (c) => <path d="M5 12.6 L10 17.4 L19 7" {...strokeProps(c, 2.4)} /> },
  back: { box: [24, 24], draw: (c) => <path d="M14.6 5 L7.6 12 L14.6 19" {...strokeProps(c, 2.2)} /> },
  diamond: { box: [10, 12], draw: (c) => <path d="M5 0.6 L9.4 6 L5 11.4 L0.6 6 Z" fill={c} /> },
  anchor: {
    box: [10, 12],
    draw: (c) => (
      <g {...strokeProps(c, 1.35)}>
        <circle cx="5" cy="2.3" r="1.3" />
        <path d="M5 3.6 V10.6 M2.6 5.2 H7.4 M1.2 7.6 Q1.8 10.7 5 10.7 Q8.2 10.7 8.8 7.6" />
      </g>
    ),
  },
  star: {
    box: [12, 12],
    draw: (c) => <path d="M6 0.6 L7.6 4.3 L11.6 4.6 L8.6 7.2 L9.5 11.2 L6 9.1 L2.5 11.2 L3.4 7.2 L0.4 4.6 L4.4 4.3 Z" fill={c} />,
  },
  arrow: {
    box: [14, 10],
    draw: (c) => <path d="M1 5 H12 M8.4 1.4 L12.2 5 L8.4 8.6" {...strokeProps(c, 1.6)} />,
  },
};

export const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];

export interface GlyphProps extends Partial<FrameProps> {
  name: GlyphName;
  /** Any CSS colour; defaults to the surrounding text colour. */
  color?: string;
}

/** A glyph `size` px tall (default 16; use '1em' to sit in running text). */
export function Glyph({ name, size = 16, color = 'currentColor', ...frame }: GlyphProps): JSX.Element {
  const g = GLYPHS[name];
  const [w, h] = g.box;
  const width = typeof size === 'number' ? (size * w) / h : `calc(${size} * ${w / h})`;
  return (
    <Frame size={size} width={width} viewBox={`0 0 ${w} ${h}`} {...frame}>
      {g.draw(color)}
    </Frame>
  );
}

const BLOC_SHAPES: Readonly<Record<(typeof COLOURS)[Colour]['glyph'], () => JSX.Element>> = {
  triangle: () => <path d="M6 1.2 L11.2 10.4 L0.8 10.4 Z" />,
  circle: () => <circle cx="6" cy="6" r="4.8" />,
  diamond: () => <path d="M6 0.6 L11 6 L6 11.4 L1 6 Z" />,
  square: () => <rect x="1.4" y="1.4" width="9.2" height="9.2" />,
  hexagon: () => <path d="M6 0.8 L10.6 3.4 L10.6 8.6 L6 11.2 L1.4 8.6 L1.4 3.4 Z" />,
};

export interface BlocGlyphProps extends Partial<FrameProps> {
  colour: Colour;
  /** Fill colour; defaults to the bloc's own colour. */
  color?: string;
}

/** A bloc's glyph (CAP triangle, HMR circle, SCT diamond, SND square, FRS hexagon) for chips and legends. */
export function BlocGlyph({ colour, color, size = 12, ...frame }: BlocGlyphProps): JSX.Element {
  const def = COLOURS[colour];
  return (
    <Frame size={size} viewBox="0 0 12 12" {...frame}>
      <g fill={color ?? def.hex}>{BLOC_SHAPES[def.glyph]()}</g>
    </Frame>
  );
}

/** For tests and the contact sheet. */
export function drawGlyph(name: GlyphName, color = 'currentColor'): JSX.Element {
  return GLYPHS[name].draw(color);
}
