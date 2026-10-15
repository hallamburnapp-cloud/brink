/**
 * Shared drawing kit for the war room's icons (docs/war/art/STYLE.md section 6).
 *
 * Every staff object lives on a 64 x 64 canvas with a 6 unit clear margin, a 2.25 unit ink outline
 * around every part, three flat tones per material (light on faces turned to the top-left lamp,
 * dark on faces turned away) and a single highlight stroke. Drawings are pure functions of a
 * per-instance uid, so the same icon can appear many times on one page without id clashes.
 */
import type { ComponentChildren, JSX } from 'preact';
import { useRef } from 'preact/hooks';

export const INK = '#0B0D11';
/** The single highlight on the top-left of the main form. */
export const HI = 'rgba(255,252,240,0.85)';

/** A material as [light, base, dark]. */
export type Tones = readonly [light: string, base: string, dark: string];

export const MAT = {
  brass: ['#F1D28A', '#C9A35B', '#8A6A2E'],
  gun: ['#5B636E', '#363C45', '#1F2329'],
  red: ['#F06A57', '#C93A2E', '#82211B'],
  paper: ['#F4EEDF', '#DDD2B8', '#B3A585'],
  steel: ['#DFE5EC', '#A5AEB9', '#66707C'],
  lens: ['#D6ECFF', '#9DB8D9', '#56708F'],
  wood: ['#C68E52', '#9A6634', '#5E3B1C'],
  gold: ['#FFE9A6', '#F2C94C', '#A37C16'],
  /** Carbon paper: blue-black, with a lit edge so it still reads on navy felt. */
  carbon: ['#56648A', '#2C3550', '#171C2C'],
} as const satisfies Record<string, Tones>;

/** The thread red, used for routes drawn on paper. */
export const THREAD = '#E0483C';
/** The lamp's light (STYLE 6: only the Duty Officer's lamp may glow). */
export const LAMP_LIGHT = '#FFB547';

type PathAttrs = JSX.SVGAttributes<SVGPathElement>;

/** The ink outline every part carries. */
export const OUT = {
  stroke: INK,
  'stroke-width': 2.25,
  'stroke-linejoin': 'round',
  'stroke-linecap': 'round',
} as const satisfies PathAttrs;

/** A thin ink line for creases and inner edges of one part. */
export const CREASE = {
  stroke: INK,
  'stroke-width': 1.3,
  'stroke-linejoin': 'round',
  'stroke-linecap': 'round',
  fill: 'none',
} as const satisfies PathAttrs;

/** A drawing: pure, intrinsic SVG elements only, ids prefixed with `uid`. */
export type Draw = (uid: string) => JSX.Element;

/** A thick rod: an ink underlay 4.5 units wider, then the material on top. */
export function rod(d: string, width: number, colour: string): JSX.Element {
  return (
    <>
      <path d={d} fill="none" stroke={INK} stroke-width={width + 4.5} stroke-linecap="round" stroke-linejoin="round" />
      <path d={d} fill="none" stroke={colour} stroke-width={width} stroke-linecap="round" stroke-linejoin="round" />
    </>
  );
}

/** A flat-toned stroke with round ends (bevel lines, rules, creases in a material's own tone). */
export function line(d: string, colour: string, width = 1.6, opacity?: number): JSX.Element {
  return (
    <path
      d={d}
      fill="none"
      stroke={colour}
      stroke-width={width}
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-opacity={opacity}
    />
  );
}

/** The one highlight. */
export function highlight(d: string, width = 1.8): JSX.Element {
  return line(d, HI, width);
}

let counter = 0;

/** A document-unique id prefix for one icon instance, stable across re-renders. */
export function useIconUid(): string {
  const ref = useRef<string>('');
  if (!ref.current) ref.current = `wi${(counter++).toString(36)}`;
  return ref.current;
}

export interface FrameProps {
  /** Rendered width and height in CSS px (or any CSS length). */
  size: number | string;
  /** Accessible name; without it the icon is decorative and hidden from assistive tech. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** The outer <svg>: a square box on a 64 unit canvas unless told otherwise. */
export function Frame(
  props: FrameProps & { viewBox?: string; width?: number | string; children: ComponentChildren },
): JSX.Element {
  const { size, title, viewBox = '0 0 64 64', width = size, children } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width}
      height={size}
      class={props.class}
      style={props.style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {children}
    </svg>
  );
}
