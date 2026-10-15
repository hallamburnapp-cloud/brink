/**
 * Staff objects made of paper: the Strategist's map, the Deputy's carbon paper, the Herald's
 * paper crown. Each keeps its own silhouette: an accordion, two fanned sheets, a crown.
 */
import { MAT, OUT, THREAD, highlight, line, type Draw } from '../kit';

/** Strategist: a folded map with a red route. */
export const foldedMap: Draw = () => {
  const [pl, pm, pd] = MAT.paper;
  const sheet = 'M7 16 L23.5 10.5 L40.5 16.5 L57 11 L57 51 L40.5 56.5 L23.5 50.5 L7 56 Z';
  return (
    <>
      <path d={sheet} fill={pl} {...OUT} />
      <path d="M23.5 10.5 L40.5 16.5 L40.5 56.5 L23.5 50.5 Z" fill={pm} />
      <path d="M48 52.2 L57 49.2 L57 51 L40.5 56.5 L40.5 54.6 Z" fill={pd} />
      <path d="M9.5 30 Q14 26 19 29 Q21.5 31 23.5 30.5 L23.5 44 Q17 46 13 42 Q10.5 40 9.5 41 Z" fill="#9FD3FF" opacity="0.75" />
      <path d="M40.5 30 Q46 33 50 29 Q53 26.5 55 27.5 L55 21 Q49 19.5 46 22 Q43 24 40.5 23 Z" fill="#9FD3FF" opacity="0.65" />
      <path d="M28 22 Q32 20.6 36 24 Q37.6 26 36.6 30 Q34 33 30 32 Q26.4 30.4 28 22 Z" fill={pd} opacity="0.55" />
      <path
        d="M12 47 L18.5 39 L25.5 41.5 L32 34.5 L39 37.5 L45.5 30 L51.5 32"
        fill="none"
        stroke={THREAD}
        stroke-width="2.2"
        stroke-dasharray="3.2 2.4"
        stroke-linecap="round"
      />
      <path d="M49.4 17.4 L54 22 M54 17.4 L49.4 22" stroke={THREAD} stroke-width="2.4" stroke-linecap="round" />
      {line('M23.5 10.5 L23.5 50.5 M40.5 16.5 L40.5 56.5', pd, 1.4)}
      <path d={sheet} fill="none" {...OUT} />
      {highlight('M10 18.4 L21 14.8')}
    </>
  );
};

/** Deputy: carbon paper, a blue-black carbon behind a typed sheet that shows the copy. */
export const carbonPaper: Draw = () => {
  const [cl, cm, cd] = MAT.carbon;
  const [pl, pm, pd] = MAT.paper;
  const copy = [24.6, 29.4, 34.2, 39, 43.8]
    .map((y, i) => `M16.6 ${y} L${[36, 39, 33, 38, 29][i]} ${y}`)
    .join(' ');
  return (
    <>
      <g transform="rotate(11 38 32)">
        <rect x="21" y="6" width="34" height="45" rx="1.4" fill={cm} {...OUT} />
        <path d="M23.2 8.2 L52.8 8.2 L52.8 10.6 L25.6 10.6 L25.6 48.8 L23.2 48.8 Z" fill={cl} />
        <path d="M52.8 10.6 L52.8 48.8 L25.6 48.8 L25.6 46.6 L50.6 46.6 L50.6 10.6 Z" fill={cd} />
        {highlight('M30 9.6 L50.4 9.6 M46 13.6 L50.4 13.6', 1.6)}
      </g>
      <g transform="rotate(-7 28 36)">
        <path d="M11 16 L45 16 L45 49 L37 58 L11 58 Z" fill={pl} {...OUT} />
        <path d="M11.9 50.4 L40.4 50.4 L37 54.6 L11.9 54.6 Z" fill={pm} />
        <path d="M45 49 L37 49 L37 58 Z" fill={pd} {...OUT} stroke-width="1.8" />
        {line(copy, cl, 1.8)}
        {line('M16.6 24.6 L22 24.6', cm, 1.8)}
      </g>
    </>
  );
};

/** Herald: a crown cut from paper, five points, a red paper jewel. */
export const paperCrown: Draw = () => {
  const [pl, pm, pd] = MAT.paper;
  const [rl, rm] = MAT.red;
  const front =
    'M8.5 47 L8.5 32.5 L11 14 L16.25 30 L21.5 10.4 L26.75 29.2 L32 8 L37.25 29.2 L42.5 10.4 L47.75 30 L53 14 L55.5 32.5 L55.5 47 Q32 55.6 8.5 47 Z';
  return (
    <>
      <path d="M10 35 L16.25 16.6 L21.5 30 L26.75 14.6 L32 30 L37.25 14.6 L42.5 30 L47.75 16.6 L54 35 Z" fill={pd} {...OUT} />
      <path d={front} fill={pm} {...OUT} />
      <path d="M10.8 46 L10.8 32.8 L12.4 21 L15.4 30.6 L19.6 18 L20.2 50.2 Q14.6 49 10.8 46 Z" fill={pl} />
      <path d="M53.2 46 L53.2 33 L52.4 25.2 L48.8 33 L46.4 51.2 Q50.6 49.4 53.2 46 Z" fill={pd} />
      {line('M10.2 41.6 Q32 49.2 53.8 41.6', pd, 1.6)}
      <path d={front} fill="none" {...OUT} />
      <circle cx="32" cy="38" r="4.2" fill={rm} {...OUT} />
      <circle cx="30.8" cy="36.8" r="1.4" fill={rl} />
      {highlight('M13.2 34 L13.2 43')}
    </>
  );
};
