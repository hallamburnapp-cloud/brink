/**
 * Small things on the table: Old Hand's tin mug, Mediator's teacup, Governor's wax seal,
 * the Sovereign's signet ring.
 */
import { INK, MAT, OUT, highlight, line, rod, type Draw } from '../kit';
import { blobPath, starPath } from '../shapes';

/** Old Hand: a chipped steel tin mug. Its count is shown on the seat's tag, not on the drawing. */
export const tinMug: Draw = () => {
  const [sl, sm, sd] = MAT.steel;
  const [, , gd] = MAT.gun;
  const body = 'M12 20 L12 50 Q12 56.6 27 56.6 Q42 56.6 42 50 L42 20 Z';
  return (
    <>
      {rod('M42 26 Q55.6 24.6 54.6 35 Q53.6 44.6 42 46.4', 3.4, sm)}
      {line('M44 27.2 Q52.4 27 52.4 33', sl, 1.2)}
      <path d={body} fill={sm} {...OUT} />
      <path d="M14.4 22 L14.4 49.6 Q14.4 52.8 19.6 54.2 L19.6 22 Z" fill={sl} />
      <path d="M35.6 22.4 L39.6 22 L39.6 49.6 Q39.6 52.4 35.6 53.8 Z" fill={sd} />
      <path d={body} fill="none" {...OUT} />
      <ellipse cx="27" cy="20" rx="15" ry="4.8" fill={sm} {...OUT} />
      <ellipse cx="27" cy="20.6" rx="12.2" ry="3.2" fill={gd} />
      <path d="M36.4 23.9 Q38.6 23.6 39.4 22.9 M14.6 21.6 L15.8 22.4" stroke={gd} stroke-width="1.6" stroke-linecap="round" />
      {line('M13.8 19 Q17 16 24 15.6', sl, 1.4)}
      {highlight('M17 26 L17 46', 2)}
    </>
  );
};

/** Mediator: a china teacup of tea on its saucer. */
export const teacup: Draw = () => {
  const [il, im, id] = MAT.ivory;
  const [, tea] = MAT.leather;
  const bowl = 'M14 27 Q14 41.6 22 46.6 L38 46.6 Q46 41.6 46 27 Z';
  return (
    <>
      <ellipse cx="32" cy="50" rx="25" ry="7.6" fill={im} {...OUT} />
      <path d="M8.4 51.4 Q32 62 55.6 51.4 Q32 58.6 8.4 51.4 Z" fill={id} />
      <ellipse cx="32" cy="49.4" rx="15.6" ry="4" fill="none" stroke={id} stroke-width="1.6" />
      {line('M10.4 48 Q14 44.6 22 43.6', il, 1.6)}
      <ellipse cx="32" cy="50" rx="25" ry="7.6" fill="none" {...OUT} />
      {rod('M45.4 30 Q54.6 29.4 53.6 35.4 Q52.6 41 43.6 41.8', 3, im)}
      <path d={bowl} fill={im} {...OUT} />
      <path d="M16.4 29 Q16.8 39.6 23 45 L26 45 Q20.4 38.6 20 29 Z" fill={il} />
      <path d="M40.6 29 L43.6 29 Q43.4 39 37.6 45 L35 45 Q40 38.4 40.6 29 Z" fill={id} />
      <path d={bowl} fill="none" {...OUT} />
      <ellipse cx="30" cy="27" rx="16" ry="4.6" fill={il} {...OUT} />
      <ellipse cx="30" cy="27.6" rx="13.2" ry="3" fill={tea} />
      {highlight('M18.4 31.6 Q19 36.6 21.2 40', 2)}
    </>
  );
};

/** Governor: a brass desk seal standing beside the pool of red wax it has just stamped. */
export const waxSeal: Draw = () => {
  const [bl, bm, bd] = MAT.brass;
  const [rl, rm, rd] = MAT.red;
  const pool = (dy: number) => blobPath(23, 46 + dy, 14, 6, 0.08, 1.1, 0.52);
  const neck = 'M41 22.6 L40 34 Q34 37.6 34 43 L34 47 L54 47 L54 43 Q54 37.6 48 34 L47 22.6 Z';
  return (
    <>
      <path d={pool(3)} fill={rd} {...OUT} />
      <path d={pool(0)} fill={rm} stroke={INK} stroke-width="1.3" />
      <path d="M11.4 44.4 Q13.6 40.2 20.4 39.2 Q15.4 41.8 14.6 45.8 Z" fill={rl} />
      <ellipse cx="23.4" cy="46.4" rx="8" ry="4.4" fill={rd} />
      <path d="M29.6 47.6 Q28.6 50.4 23.4 50.8" fill="none" stroke={rl} stroke-width="1.4" stroke-linecap="round" />
      <path d={starPath(23.4, 46.4, 5.2, 0.55)} fill={rm} />
      <g transform="rotate(12 44 54)">
        <rect x="33" y="46" width="22" height="7.6" rx="1.8" fill={bd} {...OUT} />
        <path d={neck} fill={bm} {...OUT} />
        <path d="M41.6 24.2 L40.8 34.8 Q36 38 35.8 43 L35.8 45.2 L39.2 45.2 L39.2 42.6 Q39.6 38.4 43 35.4 L43.4 24.2 Z" fill={bl} />
        <path d="M45 24.2 L45.6 35 Q51 38.4 52 45.2 L49.4 45.2 Q48.4 39.6 44.4 36 Z" fill={bd} />
        <path d={neck} fill="none" {...OUT} />
        <rect x="38" y="32.4" width="12" height="4" rx="1.6" fill={bd} {...OUT} stroke-width="1.8" />
        <circle cx="44" cy="16" r="7.4" fill={bm} {...OUT} />
        <path d="M38.8 15.6 A5.4 5.4 0 0 1 44.4 10.4" fill="none" stroke={bl} stroke-width="2.4" stroke-linecap="round" />
        <path d="M49.4 17.2 A5.4 5.4 0 0 1 45 21.4" fill="none" stroke={bd} stroke-width="2" stroke-linecap="round" />
        {highlight('M39.8 13.8 Q40.8 11.6 42.8 11', 1.6)}
      </g>
    </>
  );
};

/** The Sovereign: a gold signet ring at three-quarters, a star cut into its face. */
export const signetRing: Draw = () => {
  const [gl, gm, gd] = MAT.gold;
  const band =
    'M15 40 A17 17.6 0 1 0 49 40 A17 17.6 0 1 0 15 40 Z M23.6 41.4 A10.4 12 0 1 0 44.4 41.4 A10.4 12 0 1 0 23.6 41.4 Z';
  return (
    <>
      <path d={band} fill={gm} fill-rule="evenodd" {...OUT} />
      <path d="M23.6 41.4 A10.4 12 0 0 1 34 29.4 Q28 32.4 27 41.4 Q27.4 50.4 34 53.4 A10.4 12 0 0 1 23.6 41.4 Z" fill={gd} />
      <path d="M18.2 47.6 Q16.4 41 18.6 34.4" fill="none" stroke={gl} stroke-width="2.6" stroke-linecap="round" />
      <path d="M45.4 47.6 Q41 55.4 32 55.6" fill="none" stroke={gd} stroke-width="2.4" stroke-linecap="round" />
      <path d={band} fill="none" fill-rule="evenodd" {...OUT} />
      <path d="M17.6 19.6 L18.4 25.4 Q32 34.6 45.6 25.4 L46.4 19.6 Z" fill={gd} {...OUT} />
      <path d="M19.6 24.6 Q24 28.2 30 29.2 L30 31.4 Q24 30.4 19.8 27.4 Z" fill={gm} />
      <ellipse cx="32" cy="19.6" rx="14.4" ry="6.8" fill={gl} {...OUT} />
      <ellipse cx="32" cy="19.8" rx="10.6" ry="4.6" fill="none" stroke={gm} stroke-width="1.4" />
      <path d={starPath(32, 19.9, 6.2, 0.5, 0.44)} fill={gd} />
      {highlight('M21 16.6 Q24 14 29 13.6', 1.6)}
    </>
  );
};
