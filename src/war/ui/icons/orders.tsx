/**
 * OrderIcon: the 8 Orders (spec section 6) as rubber stamps in red ink.
 * One family: the same ink, the same -6 degree tilt, the same stroke weight, the same speckle.
 * - variant 'slip' (default): the stamp on a typed linen slip with an ink outline. Reads on any background.
 * - variant 'stamp': the ink alone, for a surface that is already paper (a Briefing card, the in-tray slip).
 */
import type { JSX } from 'preact';
import type { OrderId } from '../../content/orders';
import { Frame, MAT, OUT, STAMP_INK, TYPE_INK, line, useIconUid, type FrameProps } from './kit';
import { starPath } from './shapes';

export type { OrderId };

const W = 3.6;
const stroke = { fill: 'none', stroke: STAMP_INK, 'stroke-width': W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;

/** The marks themselves, centred on (32, 32), before tilt and speckle. */
const MARKS: Readonly<Record<OrderId, (uid: string) => JSX.Element>> = {
  /** A star fort in plan: four bastions, the wall band hatched as on the map. */
  FORTIFY: (uid) => {
    const outer = 'M11 11 L32 18.6 L53 11 L45.4 32 L53 53 L32 45.4 L11 53 L18.6 32 Z';
    const inner = 'M21.5 21.5 L32 25.3 L42.5 21.5 L38.7 32 L42.5 42.5 L32 38.7 L21.5 42.5 L25.3 32 Z';
    const hatch = Array.from({ length: 14 }, (_, i) => `M${i * 5 - 14} 64 L${i * 5 + 26} 0`).join(' ');
    return (
      <>
        <clipPath id={`${uid}-wall`}>
          <path d={`${outer} ${inner}`} clip-rule="evenodd" />
        </clipPath>
        <path d={hatch} stroke={STAMP_INK} stroke-width="1.8" clip-path={`url(#${uid}-wall)`} />
        <path d={outer} {...stroke} />
        <path d={inner} {...stroke} stroke-width="2.6" />
      </>
    );
  },
  /** A double ring with a bead: the signal passed on. */
  RELAY: () => (
    <>
      <circle cx="32" cy="32" r="20" {...stroke} />
      <circle cx="32" cy="32" r="12" {...stroke} />
      <circle cx="32" cy="32" r="4.2" fill={STAMP_INK} />
    </>
  ),
  /** Two pin heads, one solid: the region that scores twice. */
  ECHO: () => (
    <>
      <circle cx="25" cy="32" r="13" {...stroke} />
      <circle cx="39" cy="32" r="13" fill={STAMP_INK} fill-opacity="0.85" />
      <circle cx="39" cy="32" r="13" {...stroke} />
    </>
  ),
  /** An arc between two terminals. */
  CABLE: () => {
    const terminal = (x: number, y: number) =>
      `M${x - 6.4} ${y} A6.4 6.4 0 1 0 ${x + 6.4} ${y} A6.4 6.4 0 1 0 ${x - 6.4} ${y} Z M${x - 2.4} ${y} A2.4 2.4 0 1 0 ${x + 2.4} ${y} A2.4 2.4 0 1 0 ${x - 2.4} ${y} Z`;
    return (
      <>
        <path d="M12.6 44.6 Q29 6 51.4 20.4" {...stroke} stroke-width={W + 0.6} />
        <path d={`${terminal(12, 49)} ${terminal(52, 19)}`} fill={STAMP_INK} fill-rule="evenodd" />
      </>
    );
  },
  /** An ink drop spreading: the region that changes colour. */
  DEFECT: () => (
    <>
      <path
        d="M30 7 C30 7 46 25.4 46 36.4 A16 16 0 0 1 14 36.4 C14 25.4 30 7 30 7 Z M21.4 36 A9 9 0 0 0 27 45.6 A11 11 0 0 1 21.4 36 Z"
        fill={STAMP_INK}
        fill-rule="evenodd"
      />
      <circle cx="49.6" cy="47.4" r="3.4" fill={STAMP_INK} />
      <circle cx="54.6" cy="38.4" r="2" fill={STAMP_INK} />
      <circle cx="44.4" cy="55" r="1.8" fill={STAMP_INK} />
    </>
  ),
  /** A star in a ring: the region raised to a Capital. */
  PROMOTE: () => (
    <>
      <circle cx="32" cy="32" r="22" {...stroke} stroke-width="2.6" />
      <path d={starPath(32, 33.4, 17, 1, 0.43)} fill={STAMP_INK} />
    </>
  ),
  /** A roller shutter pulled down: housing, slats, a handle. */
  RETIRE: () => (
    <>
      <rect x="9" y="8" width="46" height="8.4" rx="2" fill={STAMP_INK} />
      <path d="M13 16 L13 54.6 M51 16 L51 54.6" {...stroke} stroke-width="3" />
      {[19.2, 26.4, 33.6, 40.8].map((y) => (
        <rect key={y} x="17" y={y} width="30" height="5.4" rx="0.8" fill={STAMP_INK} />
      ))}
      <rect x="16" y="48" width="32" height="4.2" rx="1" fill={STAMP_INK} />
      <path d="M28.6 52.6 Q32 58.6 35.4 52.6" {...stroke} stroke-width="2.6" />
    </>
  ),
  /** A map pin with swept wings: a region flown in. */
  AIRLIFT: () => {
    const wing = 'M21 18.6 L4.6 12.6 Q5.8 18.4 9.8 20.6 L21 24.8 Z M21.6 27 L8.6 22.8 Q10.2 27.8 14 29.8 L22.8 32.4 Z';
    return (
      <>
        <path d={wing} fill={STAMP_INK} />
        <path d={wing} fill={STAMP_INK} transform="matrix(-1 0 0 1 64 0)" />
        <path
          d="M32 10 A10.6 10.6 0 0 1 42.6 20.6 C42.6 29.4 32 41.6 32 41.6 C32 41.6 21.4 29.4 21.4 20.6 A10.6 10.6 0 0 1 32 10 Z M32 16.4 A4.2 4.2 0 1 0 32 24.8 A4.2 4.2 0 1 0 32 16.4 Z"
          fill={STAMP_INK}
          fill-rule="evenodd"
        />
        <ellipse cx="32" cy="49.4" rx="7.4" ry="2.2" fill={STAMP_INK} />
      </>
    );
  },
};

/** Procedural speckle so the ink is never vector-clean (STYLE 5.6). Only worth it at 48 px and up. */
function speckle(id: string): JSX.Element {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={2} seed={3} result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.75" result="m" />
      <feComposite in="SourceGraphic" in2="m" operator="in" />
    </filter>
  );
}

function stampLayer(id: OrderId, uid: string, worn: boolean): JSX.Element {
  return (
    <>
      {worn ? speckle(`${uid}-ink`) : null}
      <g filter={worn ? `url(#${uid}-ink)` : undefined} transform="rotate(-6 32 32)">
        {MARKS[id](uid)}
      </g>
    </>
  );
}

/** A typed linen slip, a corner turned down, the stamp in its upper two thirds. */
function slipLayer(id: OrderId, uid: string, worn: boolean): JSX.Element {
  const [ll, lm, ld] = MAT.linen;
  const sheet = 'M13.6 5.6 L44 5.6 L51.6 13.2 L51.6 56.6 Q51.6 58.4 49.8 58.4 L13.6 58.4 Q11.8 58.4 11.8 56.6 L11.8 7.4 Q11.8 5.6 13.6 5.6 Z';
  return (
    <g transform="rotate(-3 32 32)">
      <path d={sheet} fill={lm} {...OUT} />
      <path d="M14.2 8 L43 8 L43 9.8 L16 9.8 L16 55.8 L14.2 55.8 Z" fill={ll} />
      <path d="M14.2 47.4 L49.4 47.4 L49.4 56.2 L14.2 56.2 Z" fill={ld} />
      <path d="M44 5.6 L44 13.2 L51.6 13.2 Z" fill={ld} {...OUT} stroke-width="1.6" />
      {line('M17.4 51.4 L37.6 51.4', TYPE_INK, 1.8, 0.7)}
      {line('M17.4 44 L46 44', TYPE_INK, 0.8, 0.35)}
      <g transform="translate(31.8 26.8) scale(0.6) translate(-32 -32)">{stampLayer(id, uid, worn)}</g>
    </g>
  );
}

export interface OrderIconProps extends Partial<FrameProps> {
  id: OrderId;
  variant?: 'slip' | 'stamp';
  /** Speckle the ink. Defaults on once the stamp itself is 48 px or more; smaller, speckle only blurs it. */
  worn?: boolean;
}

export function OrderIcon({ id, size = 34, variant = 'slip', worn, ...frame }: OrderIconProps): JSX.Element {
  const uid = useIconUid();
  const stampPx = typeof size === 'number' ? size * (variant === 'slip' ? 0.6 : 1) : 64;
  const isWorn = worn ?? stampPx >= 48;
  return (
    <Frame size={size} {...frame}>
      {variant === 'slip' ? slipLayer(id, uid, isWorn) : stampLayer(id, uid, isWorn)}
    </Frame>
  );
}

/** For tests and the contact sheet: the drawing alone. */
export function drawOrder(id: OrderId, variant: 'slip' | 'stamp', uid: string, worn = true): JSX.Element {
  return variant === 'slip' ? slipLayer(id, uid, worn) : stampLayer(id, uid, worn);
}
