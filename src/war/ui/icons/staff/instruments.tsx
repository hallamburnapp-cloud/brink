/**
 * Staff objects made of metal and bakelite: the instruments on the desk.
 * Duty Officer, Hotline Operator, Harbourmaster, Surveyor, Admiral, Signals Officer.
 */
import { CREASE, INK, MAT, MOMENTUM, OUT, highlight, line, rod, type Draw } from '../kit';

/** Duty Officer: a brass desk lamp, switched on. The one object allowed to glow. */
export const deskLamp: Draw = (u) => {
  const [bl, bm, bd] = MAT.brass;
  const [gl, gm, gd] = MAT.gun;
  return (
    <>
      <defs>
        <radialGradient id={`${u}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#FFD27A" stop-opacity="0.85" />
          <stop offset="1" stop-color={MOMENTUM} stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="47" cy="29" r="13" fill={`url(#${u}-glow)`} />
      <path d="M10 57 Q10 50 17 50 L37 50 Q44 50 44 57 Z" fill={bm} {...OUT} />
      {line('M13 53.5 Q14 51.5 17.5 51.5 L36 51.5', bl)}
      {rod('M27 49 L17 31 L32 18', 3.2, bm)}
      {line('M26 47 L17.6 31.6', bl, 1.2)}
      <circle cx="17" cy="31" r="3.6" fill={bm} {...OUT} />
      <circle cx="27" cy="49" r="3" fill={bd} {...OUT} />
      <g transform="translate(40 21) rotate(-45)">
        <path d="M-5 -11 Q0 -14 5 -11 L12 7 Q0 11 -12 7 Z" fill={gm} {...OUT} />
        <path d="M-5 -11 Q-2 -12.6 0 -12.6 L-1.5 8.6 Q-7 8.2 -12 7 Z" fill={gl} />
        <path d="M3 -11.2 Q4.2 -11.6 5 -11 L12 7 Q9.6 7.9 7 8.4 Z" fill={gd} />
        <path d="M-5 -11 Q0 -14 5 -11 L12 7 Q0 11 -12 7 Z" fill="none" {...OUT} />
        <ellipse cx="0" cy="7.4" rx="12" ry="3.2" fill="#FFE2A3" {...OUT} />
        <ellipse cx="0" cy="7.4" rx="6" ry="1.4" fill="#FFF8E6" />
        {highlight('M-3.4 -9.4 L-8.6 4.4', 1.6)}
      </g>
      <circle cx="32" cy="18" r="2.8" fill={bl} {...OUT} />
    </>
  );
};

/** Hotline Operator: a red rotary telephone. */
export const redPhone: Draw = () => {
  const [rl, rm, rd] = MAT.red;
  const [il, im, id] = MAT.ivory;
  const holes = Array.from({ length: 9 }, (_, i) => {
    const a = ((-120 + i * 30) * Math.PI) / 180;
    return (
      <circle key={i} cx={(32 + Math.cos(a) * 6.2).toFixed(2)} cy={(43 + Math.sin(a) * 6.2).toFixed(2)} r="1.45" fill={id} />
    );
  });
  const body = 'M11 54 L15.5 36.5 Q17 31 23 31 L41 31 Q47 31 48.5 36.5 L53 54 Q53.4 57 50 57 L14 57 Q10.6 57 11 54 Z';
  return (
    <>
      <path d={body} fill={rm} {...OUT} />
      <path d="M13.6 52 L17.6 37 Q18.8 33.2 23 33.2 L27 33.2 L21 55 L14.2 55 Z" fill={rl} />
      <path d="M44 33.6 Q46.4 34.6 47 37 L51 54 Q51 55 49.6 55 L45 55 Z" fill={rd} />
      <path d={body} fill="none" {...OUT} />
      <circle cx="32" cy="43" r="9.6" fill={im} {...OUT} />
      {line('M24.6 40 A8 8 0 0 1 35 35.4', il, 2)}
      {holes}
      <circle cx="32" cy="43" r="2.4" fill={rm} stroke={INK} stroke-width="1.4" />
      <path d="M21 27 L21 31.5 M43 27 L43 31.5" stroke={INK} stroke-width="3.4" stroke-linecap="round" />
      <path
        d="M7 26.6 Q5.4 18.4 13.6 17.4 L50.4 17.4 Q58.6 18.4 57 26.6 Q56.4 29 53.8 29 L49 29 Q47.6 24.4 43 24.6 L21 24.6 Q16.4 24.4 15 29 L10.2 29 Q7.6 29 7 26.6 Z"
        fill={rm}
        {...OUT}
      />
      <path d="M9.4 25.6 Q8.6 20.6 13.8 19.8 L18 19.8 Q13 21.6 12.6 27 L10.6 27 Z" fill={rl} />
      <path d="M50 19.8 Q55.6 20.6 54.6 25.6 Q54.4 26.8 53.2 27 L50.6 27 Q50.2 22 46 19.8 Z" fill={rd} />
      {highlight('M17 20.6 L44 20.6')}
    </>
  );
};

/** Harbourmaster: a brass ship's bell. */
export const shipsBell: Draw = () => {
  const [bl, bm, bd] = MAT.brass;
  const bell = 'M19.5 47 C19.5 30 22 16 32 13.6 C42 16 44.5 30 44.5 47 Z';
  return (
    <>
      <path d="M27 8 L37 8 L38.5 14 L25.5 14 Z" fill={bd} {...OUT} />
      <circle cx="32" cy="6.4" r="2.6" fill="none" stroke={INK} stroke-width="2.25" />
      <path d={bell} fill={bm} {...OUT} />
      <path d="M22 46 C22 31 24.4 18.6 31 15.6 C27.4 21.6 26.4 32 26.6 46 Z" fill={bl} />
      <path d="M38 46 C38.4 32 37.2 21.4 34 15.8 C40.4 18.8 42.2 30.6 42.2 46 Z" fill={bd} />
      <path d={bell} fill="none" {...OUT} />
      {line('M21.4 25 Q32 22.6 42.6 25 M20.4 38 Q32 35.6 43.6 38', bd, 1.4)}
      <rect x="14" y="46" width="36" height="7.4" rx="3.7" fill={bm} {...OUT} />
      {line('M17.4 48.6 L30 48.6', bl)}
      {line('M40 51.4 L47 51.4', bd)}
      <path d="M32 53.4 L32 56" stroke={INK} stroke-width="2" />
      <circle cx="32" cy="58" r="3.2" fill={bd} {...OUT} />
      {highlight('M25 21.6 Q23.6 30 23.8 41', 2)}
    </>
  );
};

/** Surveyor: a brass theodolite on a gunmetal tripod. */
export const theodolite: Draw = () => {
  const [bl, bm, bd] = MAT.brass;
  const [gl, gm, gd] = MAT.gun;
  const [ll, lm] = MAT.lens;
  return (
    <>
      {rod('M32 38 L32.6 55', 2.6, gd)}
      {rod('M28.6 38 L13 57', 3.2, gl)}
      {rod('M35.4 38 L51 57', 3.2, gm)}
      <path d="M13 57 L15.4 54" stroke={bm} stroke-width="2" stroke-linecap="round" />
      <path d="M51 57 L48.6 54" stroke={bm} stroke-width="2" stroke-linecap="round" />
      <ellipse cx="32" cy="37.6" rx="10.5" ry="3.4" fill={gm} {...OUT} />
      {line('M23.6 37 Q28 35.2 33 35.3', gl, 1.4)}
      <path d="M25 35.6 L26.8 29.4 L37.2 29.4 L39 35.6 Z" fill={bm} {...OUT} />
      <path d="M26.9 34.6 L28.2 30.4 L31 30.4 L30.2 34.6 Z" fill={bl} />
      <path d="M26.6 29.6 L26.6 20 M37.4 29.6 L37.4 20" stroke={INK} stroke-width="6.2" stroke-linecap="round" />
      <path d="M26.6 29.6 L26.6 20 M37.4 29.6 L37.4 20" stroke={bm} stroke-width="2.6" stroke-linecap="round" />
      <circle cx="32" cy="22" r="7.6" fill={bm} {...OUT} />
      <path d="M26.2 20.4 A6 6 0 0 1 33.6 16.2" fill="none" stroke={bl} stroke-width="2" stroke-linecap="round" />
      <path d="M37.4 24 A6 6 0 0 1 30.4 27.8" fill="none" stroke={bd} stroke-width="2" stroke-linecap="round" />
      <circle cx="32" cy="22" r="4.6" fill="none" stroke={bd} stroke-width="1.1" />
      <g transform="rotate(-14 32 15)">
        <rect x="16" y="11.4" width="30" height="7.2" rx="1.6" fill={bm} {...OUT} />
        {line('M18 13.6 L43.4 13.6', bl, 1.8)}
        <rect x="43" y="9.4" width="7" height="11.2" rx="1.6" fill={bm} {...OUT} />
        <ellipse cx="50.6" cy="15" rx="1.8" ry="4.4" fill={lm} {...OUT} />
        {line('M50.4 12.2 L50.4 14.8', ll, 1.2)}
        <rect x="11.6" y="12.6" width="5.6" height="4.8" rx="1.2" fill={bd} {...OUT} />
        {highlight('M21 12.6 L33 12.6', 1.4)}
      </g>
      <circle cx="32" cy="22" r="2.2" fill={gd} stroke={INK} stroke-width="1.4" />
    </>
  );
};

/** Admiral: a brass telescope with a leather grip, raised to the horizon. */
export const telescope: Draw = () => {
  const [bl, bm, bd] = MAT.brass;
  const [ll, lm, ld] = MAT.leather;
  const [gl, gm] = MAT.lens;
  return (
    <g transform="rotate(-32 32 34)">
      <rect x="3" y="29" width="11" height="9" rx="2" fill={bm} {...OUT} />
      <rect x="13" y="27.2" width="14" height="12.6" rx="1.6" fill={bm} {...OUT} />
      {line('M14.2 29 L25.8 29', bl, 2)}
      {line('M14.2 38 L25.8 38', bd)}
      <rect x="26" y="24.6" width="22" height="17.8" rx="1.6" fill={lm} {...OUT} />
      <path d="M27.4 26.6 L46.6 26.6 L46.6 30 L27.4 30 Z" fill={ll} />
      <path d="M27.4 38.4 L46.6 38.4 L46.6 41 L27.4 41 Z" fill={ld} />
      <rect x="26" y="24.6" width="22" height="17.8" rx="1.6" fill="none" {...OUT} />
      <rect x="24.6" y="23.6" width="4.6" height="19.8" rx="1.2" fill={bm} {...OUT} />
      <rect x="46.6" y="21.6" width="12" height="23.8" rx="2.2" fill={bm} {...OUT} />
      {line('M48 24 L57.4 24', bl, 2.2)}
      {line('M48 42.6 L57.4 42.6', bd, 2)}
      <ellipse cx="59.6" cy="33.5" rx="2.6" ry="10.4" fill={gm} {...OUT} />
      <path d="M59.2 26.4 Q60.4 30 60 33" stroke={gl} stroke-width="1.6" fill="none" stroke-linecap="round" />
      {highlight('M30 27.8 L44 27.8', 1.6)}
    </g>
  );
};

/** Signals Officer: a morse key on a gunmetal base. */
export const morseKey: Draw = () => {
  const [bl, bm, bd] = MAT.brass;
  const [gl, gm, gd] = MAT.gun;
  return (
    <>
      <rect x="6" y="44" width="52" height="12" rx="3" fill={gm} {...OUT} />
      {line('M8.6 47 L30 47', gl, 2)}
      {line('M40 53.4 L55 53.4', gd, 2)}
      <rect x="40" y="36" width="8" height="9" rx="1" fill={bd} {...OUT} />
      {rod('M14 33 L50 26', 3.6, bm)}
      {line('M16 31.6 L46 25.8', bl, 1.2)}
      <circle cx="44" cy="27" r="3" fill={bm} {...OUT} />
      <rect x="22" y="36" width="5" height="9" rx="1" fill={bm} {...OUT} />
      <ellipse cx="13" cy="31.6" rx="8" ry="4.6" fill="#2B2F36" {...OUT} />
      <ellipse cx="13" cy="30.4" rx="7" ry="2.8" fill="#4A515B" />
      {highlight('M8.6 30 Q11 28.6 14 28.8', 1.4)}
      <path d="M44 27 L44 36" {...CREASE} />
    </>
  );
};
