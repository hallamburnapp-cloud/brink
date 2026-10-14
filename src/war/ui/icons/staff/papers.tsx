/**
 * Staff objects made of paper: Strategist's map, Rail Clerk's timetable, Ferry Master's
 * timetable, Chief of Staff's clipboard, Deputy's carbon paper, Herald's paper crown.
 * Five of these are sheets of paper, so each keeps its own silhouette: an accordion, an open
 * booklet with a ribbon, a leaflet hung from a nail, a board with a clip, two fanned sheets, a crown.
 */
import { CREASE, INK, MAT, OUT, THREAD, TYPE_INK, highlight, line, rod, type Draw } from '../kit';

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

/** Rail Clerk: a pocket timetable lying open, red-ruled columns, a red ribbon marker. */
export const railTimetable: Draw = () => {
  const [pl, pm, pd] = MAT.paper;
  const rows = (x0: number, x1: number, ys: number[], bow: number) =>
    ys.map((y) => `M${x0} ${y} Q${(x0 + x1) / 2} ${y - bow} ${x1} ${y + (bow > 0 ? 1.2 : -1.2)}`).join(' ');
  return (
    <g transform="rotate(-9 32 34)">
      <path d="M33.6 47 L33.6 60 L36.2 57.6 L38.8 60 L38.8 46.4 Z" fill={THREAD} {...OUT} />
      <path d="M6 24 Q19 19 32 24 Q45 19 58 24 L58 52.4 Q45 48.4 32 53.4 Q19 48.4 6 52.4 Z" fill={pd} {...OUT} />
      <path d="M7 21 Q19.4 16.4 32 21.4 L32 50.4 Q19.4 45.6 7 49.4 Z" fill={pl} />
      <path d="M32 21.4 Q44.6 16.4 57 21 L57 49.4 Q44.6 45.6 32 50.4 Z" fill={pm} />
      <path d="M7 21 Q19.4 16.4 32 21.4 Q44.6 16.4 57 21 L57 49.4 Q44.6 45.6 32 50.4 Q19.4 45.6 7 49.4 Z" fill="none" {...OUT} />
      {line('M10.4 25.6 Q19.4 22.2 29 25.4 M35 25.4 Q44.6 22.2 53.6 25.6', THREAD, 2.4)}
      {line(rows(10.4, 29, [31, 35.6, 40.2, 44.8], 2.6), INK, 1.1, 0.45)}
      {line(rows(35, 53.6, [31, 35.6, 40.2, 44.8], 2.6), INK, 1.1, 0.4)}
      {line('M16.6 27 L16.6 45.6 M41.2 26.6 L41.2 45.4', THREAD, 1.6)}
      <path d="M32 21.4 L32 50.4" {...CREASE} stroke-width="1.6" />
      {line('M30.4 22.6 L30.4 48.6', pd, 1.4)}
      {highlight('M10 22.8 Q15 21 20.4 20.6')}
    </g>
  );
};

/** Ferry Master: a ferry timetable folded once and hung open from a nail, a blue band and an anchor. */
export const ferryTimetable: Draw = () => {
  const [pl, pm, pd] = MAT.paper;
  const [fl, fm, fd] = MAT.ferry;
  const rows = [33, 38.4, 43.8, 49.2].map((y) => `M14.6 ${y} L22.8 ${y + 1.95}`).join(' ');
  const times = [33, 38.4, 43.8, 49.2].map((y) => `M25.2 ${y + 2.5} L28.6 ${y + 3.3}`).join(' ');
  const sheet = 'M10 13 L32 18.4 L54 13 L54 52 L32 57.4 L10 52 Z';
  return (
    <g transform="rotate(4 32 35)">
      <path d="M22.6 16.8 L32 5.6 L41.4 16.8" fill="none" stroke={INK} stroke-width="1.6" stroke-linejoin="round" />
      <circle cx="32" cy="5.4" r="2.6" fill={MAT.brass[1]} {...OUT} stroke-width="1.6" />
      <path d={sheet} fill={pl} {...OUT} />
      <path d="M32 18.4 L54 13 L54 52 L32 57.4 Z" fill={pm} />
      <path d="M10 13 L32 18.4 L32 27.4 L10 22 Z" fill={fm} />
      <path d="M32 18.4 L54 13 L54 22 L32 27.4 Z" fill={fd} />
      {line('M12.6 18.6 Q15 16.4 17.6 18.8 Q20.2 21 22.8 19.6 Q25.4 18.2 28.4 20.8', pl, 1.4)}
      {line('M35.6 21.2 Q38.4 18.4 41 20.2 Q43.6 22 46.2 19.6 Q48.8 17.2 51.4 18.4', fl, 1.4)}
      {line(rows, INK, 1.4, 0.5)}
      {line(times, fm, 1.6)}
      <path d="M53 50.6 L54 52 L32 57.4 L32 55.4 Z" fill={pd} />
      <g fill="none" stroke={fm} stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="43" cy="31.4" r="2" />
        <path d="M43 33.4 L43 48 M39 37 L47 37 M36.6 42.8 Q37.6 48.6 43 48.6 Q48.4 48.6 49.4 42.8" />
      </g>
      <path d="M32 18.4 L32 57.4" {...CREASE} stroke-width="1.6" />
      <path d={sheet} fill="none" {...OUT} />
      <circle cx="22.6" cy="17.4" r="1.3" fill={INK} />
      <circle cx="41.4" cy="17.4" r="1.3" fill={INK} />
      {highlight('M12.4 25 L12.4 36', 1.6)}
    </g>
  );
};

/** Chief of Staff: a clipboard with a steel clip and a checklist half ticked. */
export const clipboard: Draw = () => {
  const [wl, wm, wd] = MAT.wood;
  const [pl, pm] = MAT.paper;
  const [sl, sm, sd] = MAT.steel;
  const rows = [25, 32, 39, 46];
  return (
    <g transform="rotate(-7 32 34)">
      <rect x="12.5" y="10" width="39" height="49" rx="3.2" fill={wm} {...OUT} />
      <path d="M14.6 13 Q14.6 12.1 15.6 12.1 L49.4 12.1 L49.4 14.2 L16.8 14.2 L16.8 56.9 L14.6 56.9 Z" fill={wl} />
      <path d="M49.4 14.2 L49.4 56.9 L16.8 56.9 L16.8 55 L47.4 55 L47.4 14.2 Z" fill={wd} />
      <rect x="17" y="16.4" width="30" height="38.6" rx="0.8" fill={pl} {...OUT} stroke-width="1.6" />
      <path d="M17.8 47 L46.2 47 L46.2 54.2 L17.8 54.2 Z" fill={pm} />
      {rows.map((y, i) => (
        <g key={y}>
          <rect x="20.4" y={y - 2.6} width="5.2" height="5.2" rx="0.6" fill="none" stroke={TYPE_INK} stroke-width="1.3" />
          {line(`M29 ${y} L${i % 2 ? 39 : 43} ${y}`, TYPE_INK, 1.5, 0.5)}
          {i < 2 ? line(`M21 ${y - 0.4} L23 ${y + 1.9} L27.6 ${y - 4.6}`, THREAD, 1.9) : null}
        </g>
      ))}
      <path d="M22 8.2 Q22 6 24.2 6 L39.8 6 Q42 6 42 8.2 L42 15 Q42 17.6 39.4 17.6 L24.6 17.6 Q22 17.6 22 15 Z" fill={sm} {...OUT} />
      <path d="M24 8 L40 8 L40 10 L24 10 Z" fill={sl} />
      <path d="M24.6 15.6 L39.4 15.6 L40 13.6 L40 15 Q40 15.6 39.4 15.6 Z" fill={sd} />
      {rod('M27 6.4 Q32 0.6 37 6.4', 1.6, sm)}
      <circle cx="26" cy="12.8" r="1.2" fill={INK} />
      <circle cx="38" cy="12.8" r="1.2" fill={INK} />
      {highlight('M14.2 19 L14.2 34')}
    </g>
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
