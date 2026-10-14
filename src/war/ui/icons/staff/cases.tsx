/**
 * Staff objects that hold things: Quartermaster's crate, Treasurer's cash box,
 * Courier's satchel, Envoy's diplomatic bag.
 */
import { CREASE, INK, MAT, OUT, highlight, line, rod, type Draw } from '../kit';
import { blobPath, poly } from '../shapes';

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

/** Treasurer: a gunmetal cash box, lid open, brass coins stacked inside, a brass lock plate. */
export const cashBox: Draw = () => {
  const [gl, gm, gd] = MAT.gun;
  const [bl, bm, bd] = MAT.brass;
  const stack = (x: number, top: number, w: number) => {
    const cx = x + w / 2;
    const ridges = [];
    for (let y = top + 3.2; y < 34; y += 2.6) ridges.push(`M${x + 0.8} ${y} Q${cx} ${y + 1.4} ${x + w - 0.8} ${y}`);
    return (
      <>
        <path d={`M${x} ${top} L${x} 34 L${x + w} 34 L${x + w} ${top} Z`} fill={bm} {...OUT} />
        <path d={`M${x + w - 2.6} ${top + 1} L${x + w - 1} ${top + 1} L${x + w - 1} 34 L${x + w - 2.6} 34 Z`} fill={bd} />
        {line(ridges.join(' '), bd, 1)}
        <ellipse cx={cx} cy={top} rx={w / 2} ry="1.9" fill={bl} {...OUT} />
      </>
    );
  };
  return (
    <>
      <path d="M18 28.5 L54 28.5 L52.4 9.5 L16.4 9.5 Z" fill={gm} {...OUT} />
      <path d="M18.6 12.4 L51.6 12.4 L52.8 26.4 L19.6 26.4 Z" fill={gd} />
      {line('M17.6 11.4 L51 11.4', gl, 1.6)}
      <path d="M9 34 L45 34 L54 28 L18 28 Z" fill={gd} {...OUT} />
      {stack(17.5, 26.6, 9)}
      {stack(28, 23.2, 9)}
      {stack(38.6, 28.8, 8)}
      <path d="M9 34 L45 34 L45 56 L9 56 Z" fill={gm} />
      <path d="M45 34 L54 28 L54 50 L45 56 Z" fill={gd} />
      <path d="M9 34 L45 34 L45 38 L9 38 Z" fill={gl} />
      <path d="M9 34 L45 34 L54 28 L54 50 L45 56 L9 56 Z" fill="none" {...OUT} />
      <path d="M45 34 L45 56 M9 38 L45 38 L54 32" {...CREASE} />
      <rect x="21.6" y="41.4" width="10.8" height="10" rx="2" fill={bm} {...OUT} />
      {line('M23.6 43.4 L28 43.4', bl, 1.4)}
      <circle cx="27" cy="45.6" r="1.7" fill={INK} />
      <path d="M27 46.4 L27 49.2" stroke={INK} stroke-width="1.8" stroke-linecap="round" />
      {highlight('M12 36 L24 36', 1.6)}
    </>
  );
};

/** Courier: a leather messenger satchel with a shoulder strap and two buckled straps. */
export const satchel: Draw = () => {
  const [ll, lm, ld] = MAT.leather;
  const [bl, bm] = MAT.brass;
  const flap = 'M8 25 Q8 20.5 12.5 20.5 L51.5 20.5 Q56 20.5 56 25 L56 36 Q56 44.5 47.5 44.5 L16.5 44.5 Q8 44.5 8 36 Z';
  const strap = (x: number) => (
    <>
      <rect x={x} y="35" width="5.4" height="20" rx="1" fill={ld} {...OUT} stroke-width="1.8" />
      <rect x={x - 1.4} y="41.4" width="8.2" height="5.6" rx="1.2" fill={bm} {...OUT} stroke-width="1.8" />
      {line(`M${x + 0.2} 43 L${x + 3.6} 43`, bl, 1.1)}
    </>
  );
  return (
    <>
      {rod('M11.5 30 C10 6 54 6 52.5 30', 3, ld)}
      {line('M14.6 22 C15 12 24 9.6 31 9.4', ll, 1.2)}
      <path d="M9 27 Q9 23 13 23 L51 23 Q55 23 55 27 L55 49 Q55 56 48 56 L16 56 Q9 56 9 49 Z" fill={lm} {...OUT} />
      <path d="M48 44 L53 44 L53 49 Q53 54 48 54 L44 54 Z" fill={ld} />
      {line('M12 46.8 L52 46.8', ld, 2.2)}
      <path d={flap} fill={lm} {...OUT} />
      <path d="M10.4 25.2 Q10.4 22.9 12.8 22.9 L36 22.9 Q20 26.6 10.4 37.6 Z" fill={ll} />
      <path d="M53.6 31 L53.6 36 Q53.6 42.1 47.5 42.1 L34 42.1 Q47.6 39.8 53.6 31 Z" fill={ld} />
      <path d={flap} fill="none" {...OUT} />
      {strap(18.4)}
      {strap(40.2)}
      {highlight('M13.4 24.8 L27 24.8')}
    </>
  );
};

/** Envoy: a diplomatic bag, its neck tied off and the cord sealed under red wax. */
export const diplomaticBag: Draw = () => {
  const [ll, lm, ld] = MAT.leather;
  const [rl, rm, rd] = MAT.red;
  const body = 'M24.6 22.6 C17.6 26.6 11.6 33 11 42.4 C10.4 51.6 13 57.6 21.6 57.6 L42.4 57.6 C51 57.6 53.6 51.6 53 42.4 C52.4 33 46.4 26.6 39.4 22.6 Z';
  const frill = 'M25.2 22 L20.4 10.8 Q24.8 13.6 27.2 9 Q29.8 13 32.2 8.2 Q34.8 12.6 37.6 9 Q39.8 13.4 43.6 10.8 L38.8 22 Z';
  const seal = blobPath(32, 40.4, 7.8, 7, 0.07, 0.6);
  return (
    <>
      <path d={body} fill={lm} {...OUT} />
      <path d="M24 25.6 C17.6 30 13.4 36 13.2 43 C13 49.4 14.4 53.6 18.4 55.4 C16.4 47 18 35.4 26.2 27 Z" fill={ll} />
      <path d="M46 31.4 C49.6 35.6 51 39.6 50.8 44 C50.6 51.6 46.8 55.2 38 55.4 C46.4 51.6 49.2 43.4 46 31.4 Z" fill={ld} />
      <path d={body} fill="none" {...OUT} />
      {line('M22.4 30.6 Q19.6 37.4 19.6 44 M41.6 30.6 Q44.6 37 45 42.6', ld, 1.5)}
      <path d={frill} fill={lm} {...OUT} />
      <path d="M23.2 13.6 Q25 14.2 26.8 12 L28.6 20.8 L25.4 20.8 Z" fill={ll} />
      {line('M30 20.8 L31.6 11.8 M35.2 20.8 L36.4 12.6', ld, 1.2)}
      <rect x="23" y="19.4" width="18" height="5.6" rx="2.8" fill={ld} {...OUT} />
      {line('M27.4 20.2 L26.2 24.2 M32 20.2 L30.8 24.2 M36.6 20.2 L35.4 24.2', INK, 1, 0.55)}
      {rod('M30.4 24.6 Q27.6 30 28.4 36 M33.6 24.6 Q36.6 30 35.6 36', 1.3, ll)}
      <path d={seal} fill={rm} {...OUT} />
      <path d="M25.6 38.4 Q26.6 34.2 31.2 33.4 Q28.2 35.8 27.6 40 Z" fill={rl} />
      <circle cx="32.2" cy="40.6" r="4.4" fill={rd} />
      <path d="M35.4 42.6 Q34.2 44.6 31.4 44.8" fill="none" stroke={rl} stroke-width="1.2" stroke-linecap="round" />
      <circle cx="32.2" cy="40.6" r="1.7" fill={rm} />
      {highlight('M15.6 41 Q16.6 34.6 21 30.4', 2)}
    </>
  );
};
