/**
 * Staff objects that hold things: the Quartermaster's supply crate.
 */
import { CREASE, INK, MAT, OUT, highlight, line, rod, type Draw } from '../kit';
import { poly } from '../shapes';

type Pt = readonly [number, number];

/** Quartermaster: a wooden supply crate with brass corner caps, seen from above at three-quarters. */
export const supplyCrate: Draw = () => {
  const [wl, wm, wd] = MAT.wood;
  const [bl, bm, bd] = MAT.brass;
  const T: Pt = [32, 8];
  const L: Pt = [9, 19.5];
  const R: Pt = [55, 19.5];
  const C: Pt = [32, 31];
  const BL: Pt = [9, 45.5];
  const BR: Pt = [55, 45.5];
  const BC: Pt = [32, 57];
  const plate = { stroke: INK, 'stroke-width': 1.5, 'stroke-linejoin': 'round' } as const;
  return (
    <>
      <path d={poly([T, R, C, L])} fill={wl} />
      <path d={poly([L, C, BC, BL])} fill={wm} />
      <path d={poly([C, R, BR, BC])} fill={wd} />
      {line('M16.67 23.33 L39.67 11.83 M24.33 27.17 L47.33 15.67', wm, 1.3)}
      {line('M9 28.2 L32 39.7 M9 36.8 L32 48.3', wd, 1.3)}
      {line('M32 39.7 L55 28.2 M32 48.3 L55 36.8', INK, 1.3, 0.6)}
      {rod('M12.4 44 L29.2 33.6', 2.6, wl)}
      <path d={`M${L[0]} ${L[1]} L${C[0]} ${C[1]} L${R[0]} ${R[1]} M${C[0]} ${C[1]} L${BC[0]} ${BC[1]}`} {...CREASE} stroke-width="1.6" />
      <path d={poly([T, R, BR, BC, BL, L])} fill="none" {...OUT} />
      {/* Brass corner caps: light on the lid, base on the lit side, dark on the shaded side. */}
      <path d="M26.6 28.3 L32 25.6 L37.4 28.3 L32 31 Z" fill={bl} />
      <path d="M26.6 28.3 L32 31 L32 37 L26.6 34.3 Z" fill={bm} />
      <path d="M32 31 L37.4 28.3 L37.4 34.3 L32 37 Z" fill={bd} />
      <path d="M26.6 28.3 L32 25.6 L37.4 28.3 L37.4 34.3 L32 37 L26.6 34.3 Z" fill="none" {...plate} />
      <path d="M26.6 48.3 L32 51 L32 57 L26.6 54.3 Z" fill={bm} />
      <path d="M32 51 L37.4 48.3 L37.4 54.3 L32 57 Z" fill={bd} />
      <path d="M26.6 48.3 L32 51 L37.4 48.3 L37.4 54.3 L32 57 L26.6 54.3 Z" fill="none" {...plate} />
      <path d="M9 19.5 L14.4 16.8 L19.8 19.5 L14.4 22.2 Z" fill={bl} />
      <path d="M9 19.5 L14.4 22.2 L14.4 28.2 L9 25.5 Z" fill={bm} />
      <path d="M9 19.5 L14.4 16.8 L19.8 19.5 L14.4 22.2 L14.4 28.2 L9 25.5 Z" fill="none" {...plate} />
      <path d="M55 19.5 L49.6 16.8 L44.2 19.5 L49.6 22.2 Z" fill={bl} />
      <path d="M55 19.5 L49.6 22.2 L49.6 28.2 L55 25.5 Z" fill={bd} />
      <path d="M55 19.5 L49.6 16.8 L44.2 19.5 L49.6 22.2 L49.6 28.2 L55 25.5 Z" fill="none" {...plate} />
      <path d="M32 8 L37.4 10.7 L32 13.4 L26.6 10.7 Z" fill={bl} {...plate} />
      <path d="M9 45.5 L14.4 48.2 L14.4 42.2 L9 39.5 Z" fill={bm} {...plate} />
      <path d="M55 45.5 L49.6 48.2 L49.6 42.2 L55 39.5 Z" fill={bd} {...plate} />
      {highlight('M20.6 15.6 L26.2 12.8')}
    </>
  );
};

