/**
 * PaperIcon: the Briefing's paper goods (spec sections 6 and 8).
 * - PLAYBOOK: a linen field manual; its cover diagram is the pattern it levels, the red chevrons are +1 Lv.
 * - RECRUIT: a kraft Recruit Folder, three staff cards peeking with their rarity rims, a red rosette stamp.
 * - ORDERS: a kraft Orders Folder, three stamped slips peeking, bound in red tape.
 */
import type { JSX } from 'preact';
import type { PatternId } from '../../content/patterns';
import { CREASE, Frame, INK, MAT, OUT, STAMP_INK, TYPE_INK, highlight, line, type FrameProps } from './kit';
import { poly, starPath } from './shapes';

export type PaperKind = 'PLAYBOOK' | 'RECRUIT' | 'ORDERS';

type Shape = 'triangle' | 'circle' | 'diamond' | 'square' | 'hexagon';
type Node = readonly [x: number, y: number];

/** A bloc glyph as a filled path, for the diagrams that are about colours. */
function shapeNode(kind: Shape, x: number, y: number, r: number): string {
  switch (kind) {
    case 'triangle':
      return poly([
        [x, y - r * 1.1],
        [x + r, y + r * 0.75],
        [x - r, y + r * 0.75],
      ]);
    case 'circle':
      return `M${x - r} ${y} A${r} ${r} 0 1 0 ${x + r} ${y} A${r} ${r} 0 1 0 ${x - r} ${y} Z`;
    case 'diamond':
      return poly([
        [x, y - r * 1.15],
        [x + r, y],
        [x, y + r * 1.15],
        [x - r, y],
      ]);
    case 'square':
      return poly([
        [x - r * 0.85, y - r * 0.85],
        [x + r * 0.85, y - r * 0.85],
        [x + r * 0.85, y + r * 0.85],
        [x - r * 0.85, y + r * 0.85],
      ]);
    case 'hexagon':
      return poly(Array.from({ length: 6 }, (_, i) => [x + Math.sin((i * Math.PI) / 3) * r, y - Math.cos((i * Math.PI) / 3) * r] as const));
  }
}

const FIVE: readonly Shape[] = ['triangle', 'circle', 'diamond', 'square', 'hexagon'];
const ring = (r: number, n = 5, turn = -90): Node[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((turn + (i * 360) / n) * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });

interface Diagram {
  nodes: readonly Node[];
  joins: ReadonlyArray<readonly [number, number]>;
  /** Draw nodes as the five bloc glyphs rather than dots. */
  colours?: boolean;
  /** An unpinned region at the centre, drawn hollow. */
  hollow?: Node;
  /** A dashed boundary round the nodes (a whole bloc). */
  boundary?: boolean;
}

/** Each pattern's shape in a few dots and lines, in a box of about 24 x 20 centred on the origin. */
const DIAGRAMS: Readonly<Record<PatternId, Diagram>> = {
  SINGLE: { nodes: [[0, 0]], joins: [] },
  LINK: { nodes: [[-7, 4], [7, -4]], joins: [[0, 1]] },
  TWO_LINKS: { nodes: [[-11, -2], [-3, -8], [3, 8], [11, 2]], joins: [[0, 1], [2, 3]] },
  WORLDWIDE: { nodes: ring(9), joins: [], colours: true },
  CHAIN: { nodes: [[-10, 6], [0, -5], [10, 4]], joins: [[0, 1], [1, 2]] },
  FRONT: { nodes: [[-12, 5], [-4, -5], [4, 5], [12, -5]], joins: [[0, 1], [1, 2], [2, 3]] },
  SURROUND: { nodes: ring(10, 4, -45), joins: [[0, 1], [1, 2], [2, 3], [3, 0]], hollow: [0, 0] },
  NETWORK: { nodes: [[-11, -3], [-2, 2], [7, -6], [0, 10], [12, 3]], joins: [[0, 1], [1, 2], [1, 3], [2, 4]] },
  BLOC: { nodes: [[-9, -5], [0, -8], [9, -5], [-5, 5], [5, 5]], joins: [] },
  WHOLE_BLOC: { nodes: [[-6, -4], [5, -5], [-4, 6], [7, 5]], joins: [], boundary: true },
  AROUND_THE_WORLD: { nodes: ring(9.5), joins: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], colours: true },
};

function diagram(pattern: PatternId, cx: number, cy: number): JSX.Element {
  const d = DIAGRAMS[pattern];
  const at = ([x, y]: Node): Node => [cx + x, cy + y];
  const joins = d.joins
    .map(([a, b]) => {
      const [x1, y1] = at(d.nodes[a]);
      const [x2, y2] = at(d.nodes[b]);
      return `M${x1} ${y1} L${x2} ${y2}`;
    })
    .join(' ');
  const r = d.nodes.length === 1 ? 4.6 : 3.1;
  return (
    <g>
      {d.boundary ? (
        <rect x={cx - 13} y={cy - 11} width="26" height="22" rx="7" fill="none" stroke={TYPE_INK} stroke-width="1.4" stroke-dasharray="2.6 2" />
      ) : null}
      {joins ? line(joins, TYPE_INK, 2.2) : null}
      {d.hollow ? <circle cx={cx + d.hollow[0]} cy={cy + d.hollow[1]} r="3.4" fill="none" stroke={TYPE_INK} stroke-width="1.6" /> : null}
      {d.nodes.map((n, i) => {
        const [x, y] = at(n);
        return d.colours ? (
          <path key={i} d={shapeNode(FIVE[i % 5], x, y, 3.3)} fill={TYPE_INK} />
        ) : (
          <circle key={i} cx={x} cy={y} r={r} fill={TYPE_INK} />
        );
      })}
    </g>
  );
}

function playbook(pattern: PatternId): JSX.Element {
  const [ll, lm, ld] = MAT.linen;
  const [rl, rm, rd] = MAT.red;
  const chevron = (y: number) => `M28.6 ${y + 4.4} L36 ${y} L43.4 ${y + 4.4}`;
  return (
    <g transform="rotate(-5 32 32)">
      <rect x="14.6" y="9.6" width="40" height="50" rx="2" fill={ld} {...OUT} />
      {line('M52.6 13 L52.6 57.4 L18 57.4', lm, 1.1)}
      <rect x="12" y="7" width="40" height="50" rx="2" fill={lm} {...OUT} />
      <path d="M21.4 9.2 L49.8 9.2 L49.8 11.2 L21.4 11.2 Z" fill={ll} />
      <path d="M12 9 Q12 7 14 7 L20.6 7 L20.6 57 L14 57 Q12 57 12 55 Z" fill={rm} />
      <path d="M13.8 9.6 L15.6 9.6 L15.6 54.6 L13.8 54.6 Z" fill={rl} />
      <path d="M18.6 9 L20.6 9 L20.6 55 L18.6 55 Z" fill={rd} />
      <path d="M20.6 7 L20.6 57" {...CREASE} stroke-width="1.6" />
      <rect x="12" y="7" width="40" height="50" rx="2" fill="none" {...OUT} />
      <rect x="24" y="13.6" width="24.4" height="24.4" rx="1.4" fill="none" stroke={TYPE_INK} stroke-width="1.2" stroke-opacity="0.55" />
      {diagram(pattern, 36.2, 25.8)}
      {line(`${chevron(42.4)} ${chevron(48.4)}`, STAMP_INK, 3.2)}
      {highlight('M15.6 12 L15.6 22', 1.4)}
    </g>
  );
}

const FOLDER_BACK = 'M8 56 L8 16.6 Q8 13 11.6 13 L23 13 Q25 13 26.2 15 L27.4 17 L52.4 17 Q56 17 56 20.6 L56 56 Z';
const FOLDER_FRONT = 'M6.6 25 Q6.6 22.4 9.2 22.4 L54.8 22.4 Q57.4 22.4 57.4 25 L57.4 55.4 Q57.4 58 54.8 58 L9.2 58 Q6.6 58 6.6 55.4 Z';

function folder(peek: JSX.Element, mark: JSX.Element): JSX.Element {
  const [kl, km, kd] = MAT.kraft;
  const [, lm] = MAT.linen;
  return (
    <>
      <path d={FOLDER_BACK} fill={kd} {...OUT} />
      {peek}
      <path d={FOLDER_FRONT} fill={km} {...OUT} />
      <path d="M9 24.8 L55 24.8 L55 27.4 L9 27.4 Z" fill={kl} />
      <path d="M55 27.4 L55 55.6 L9.2 55.6 L9.2 53.4 L52.8 53.4 L52.8 27.4 Z" fill={kd} />
      <path d={FOLDER_FRONT} fill="none" {...OUT} />
      <rect x="11.4" y="31" width="23.6" height="8.4" rx="0.8" fill={lm} stroke={INK} stroke-width="1.4" />
      {line('M14.2 35.2 L30.4 35.2', TYPE_INK, 1.6, 0.7)}
      {mark}
      {highlight('M10.6 29.6 L10.6 40', 1.6)}
    </>
  );
}

function recruitFolder(): JSX.Element {
  const card = (x: number, top: number, turn: number, rim: string) => (
    <g transform={`rotate(${turn} ${x + 7} 30)`}>
      <rect x={x} y={top} width="14" height="24" rx="1.6" fill="#1A2633" {...OUT} stroke-width="1.8" />
      <path d={`M${x + 0.9} ${top + 1.6} Q${x + 0.9} ${top + 0.9} ${x + 1.6} ${top + 0.9} L${x + 12.4} ${top + 0.9} Q${x + 13.1} ${top + 0.9} ${x + 13.1} ${top + 1.6} L${x + 13.1} ${top + 4} L${x + 0.9} ${top + 4} Z`} fill={rim} />
      <circle cx={x + 7} cy={top + 10.6} r="2.8" fill={MAT.brass[1]} stroke={INK} stroke-width="1.2" />
    </g>
  );
  return folder(
    <>
      {card(13, 8.4, -7, '#8A8F98')}
      {card(25.4, 5.6, 1, '#C9A35B')}
      {card(37.6, 8.6, 7, '#9DB8D9')}
    </>,
    <g transform="rotate(-8 45 45)">
      <circle cx="45" cy="45" r="8" fill="none" stroke={STAMP_INK} stroke-width="2.2" />
      <circle cx="45" cy="45" r="5.8" fill="none" stroke={STAMP_INK} stroke-width="0.9" />
      <path d={starPath(45, 45.4, 4.6)} fill={STAMP_INK} />
    </g>,
  );
}

function ordersFolder(): JSX.Element {
  const [ll, lm] = MAT.linen;
  const slip = (x: number, top: number, turn: number, mark: JSX.Element) => (
    <g transform={`rotate(${turn} ${x + 7} 30)`}>
      <rect x={x} y={top} width="14" height="24" rx="1" fill={lm} {...OUT} stroke-width="1.8" />
      <path d={`M${x + 1} ${top + 1.2} L${x + 13} ${top + 1.2} L${x + 13} ${top + 2.6} L${x + 1} ${top + 2.6} Z`} fill={ll} />
      {mark}
    </g>
  );
  const ink = { fill: 'none', stroke: STAMP_INK, 'stroke-width': 1.8 } as const;
  return folder(
    <>
      {slip(13, 8.6, -7, <circle cx="20" cy="15.4" r="3.6" {...ink} />)}
      {slip(25.4, 5.6, 1, <path d={starPath(32.4, 12.8, 4.4)} fill={STAMP_INK} />)}
      {slip(37.6, 8.6, 7, <path d="M41.2 12.2 L48 12.2 M41.2 15.4 L48 15.4 M41.2 18.6 L48 18.6" {...ink} stroke-width="2" />)}
    </>,
    <>
      <path d="M41.4 22.4 L47.4 22.4 L47.4 58 L41.4 58 Z" fill={MAT.red[1]} />
      <path d="M41.4 24.6 L43.2 24.6 L43.2 55.6 L41.4 55.6 Z" fill={MAT.red[0]} />
      <path d="M41.4 22.4 L41.4 58 M47.4 22.4 L47.4 58" {...CREASE} stroke-width="1.6" />
      <path d="M40.4 19.6 L48.4 19.6 L47.4 22.4 L41.4 22.4 Z" fill={MAT.red[2]} {...OUT} stroke-width="1.6" />
    </>,
  );
}

export function drawPaper(kind: PaperKind, pattern: PatternId = 'NETWORK'): JSX.Element {
  switch (kind) {
    case 'PLAYBOOK':
      return playbook(pattern);
    case 'RECRUIT':
      return recruitFolder();
    case 'ORDERS':
      return ordersFolder();
  }
}

export interface PaperIconProps extends Partial<FrameProps> {
  kind: PaperKind;
  /** PLAYBOOK only: the pattern drawn on the cover. Defaults to NETWORK. */
  pattern?: PatternId;
}

export function PaperIcon({ kind, pattern, size = 48, ...frame }: PaperIconProps): JSX.Element {
  // Paper goods use no gradients, clips or filters, so they need no per-instance ids.
  return (
    <Frame size={size} {...frame}>
      {drawPaper(kind, pattern)}
    </Frame>
  );
}
