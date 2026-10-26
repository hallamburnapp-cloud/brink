/**
 * The printed sheet: the static SVG under the marks, built once as markup from the geometry
 * (a port of build_map() in tools/redlines-paper/build.py). Everything here is paper and ink:
 * the sea lanes, the water-lining, the bloc washes, the relief and the hachured hills, the dashed
 * borders, the ink coasts, the printed names, the bloc titles, the two flags, the compass. The
 * marks go into the empty layer groups this leaves in z-order (marks.ts fills them).
 */
import { FRAME, ISLAND_R, MASSES, OUTLINES, REGION, REGIONS, getGeometry, toFrame, type Bounds, type FrameTransform, type Geometry, type RegionId } from './geometry';
import type { MapWords } from './contract';
import { seedOf } from './rand';
import { flagPin, fmt, island, pencilLine, polyPath, ridge, type P } from './strokes';

export const INK = '#2b2418';
const TINT: Record<string, string> = { CAP: '#d9dfd8', HMR: '#e6e0b6', SND: '#ead8a6', FRS: '#dce3c0', SCT: '#e8dcaf' };
/** The island seeds the art director picked (python's Random; ours differ in sequence, not in kind). */
const ISLAND_SEEDS: Record<string, number> = { GUL: 11, DRF: 23, TRN: 37, LNK: 41, PBB: 59, SHL: 67 };
/** The drawn island radius in frame px (16.5 map points, stretched). */
export const ISLAND_DRAW_R = 16.5 * FRAME.sy;

/** Printed-name positions that differ from the pin (map points), as the sheet sets them. */
const LABEL_POS: Record<string, [number, number]> = {
  WMS: [246, 31],
  EDV: [84, 191],
  GUL: [176, 126],
  DRF: [226, 121],
  TRN: [166, 221],
  LNK: [226, 231],
  PBB: [176, 273],
  SHL: [228, 273],
  TLM: [349, 189],
  KLM: [316, 72],
  MRD: [110, 248],
  BRK: [357, 150],
  KLP: [292, 128],
  NWK: [58, 56],
};
const SMALL_NAMES = new Set(['BRK', 'MRD']);
/** The two flags: the Republic's at Edda Vale, the Federation's at Wintermast (map points). */
const FLAGS: Array<[RegionId, number, number, 'republic' | 'federation']> = [
  ['WMS', 281, 40, 'federation'],
  ['EDV', 110, 182, 'republic'],
];
/** The bloc titles (map points); the Scatter's sits in the water under its islands. */
const BLOC_POS: Array<[keyof MapWords['blocs'], number, number, boolean]> = [
  ['CAP', 300, 52, false],
  ['HMR', 68, 223, false],
  ['SND', 336, 273, false],
  ['FRS', 196, 346, false],
  ['SCT', 202, 284, true],
];
/** The hachured hills (map x, y; frame width; count; seed). */
const RIDGES: Array<[number, number, number, number, number]> = [
  [328, 44, 26, 4, 1],
  [150, 44, 22, 3, 2],
  [92, 150, 20, 3, 3],
  [320, 345, 24, 4, 4],
  [60, 352, 18, 3, 5],
  [240, 320, 18, 3, 6],
];

/** What the marks need to know about each region, in frame px. */
export interface SheetGeom {
  frame: FrameTransform;
  /** The region's plate (or island) as a path in frame px. */
  shape: Record<RegionId, string>;
  /** The pin, in frame px. */
  centre: Record<RegionId, P>;
  /** Where the printed name sits (its anchor), in frame px. */
  label: Record<RegionId, P>;
  /** Half the printed name's width, roughly, for underlines. */
  nameHalf: Record<RegionId, number>;
  /** Plate bounds in frame px. */
  bounds: Record<RegionId, Bounds>;
  island: Record<RegionId, boolean>;
  /** The printed name's box (frame px), what a mark must not cover. */
  labelBox: Record<RegionId, Bounds>;
  /** The bloc titles' boxes (frame px), and which are set small (the Scatter's, in the water under its islands). */
  blocBoxes: Bounds[];
  blocSmall: boolean[];
}

export interface Sheet {
  /** The sheet's inner markup: defs, clips, the paper, and the empty mark layers. */
  markup: string;
  geom: SheetGeom;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function defs(p: string): string {
  return (
    `<defs>` +
    `<filter id="${p}-rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `<filter id="${p}-wash" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.6"/></filter>` +
    `<filter id="${p}-ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>` +
    `<filter id="${p}-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>` +
    `<pattern id="${p}-hatch" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 0V4.6" stroke="#b5261b" stroke-width="1.05" stroke-opacity="0.72" stroke-linecap="round"/><path d="M2.3 0V4.6" stroke="#b5261b" stroke-width="0.5" stroke-opacity="0.28"/></pattern>` +
    `<pattern id="${p}-pencil" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(60)"><path d="M0 0V6" stroke="#6b5f4e" stroke-width="0.8" stroke-opacity="0.6"/></pattern>` +
    `<radialGradient id="${p}-pinR" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ff8a80"/><stop offset="0.35" stop-color="#d32f2f"/><stop offset="1" stop-color="#6e0e0e"/></radialGradient>` +
    `<linearGradient id="${p}-chit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f5567"/><stop offset="1" stop-color="#24323d"/></linearGradient>` +
    `</defs>`
  );
}

/** The compass rose and the faint cup ring on the open desk (frame px, the day frame). */
function desk(p: string, north: string): string {
  return (
    `<g class="pp-desk">` +
    `<g transform="translate(336 534)" fill="none" stroke="${INK}" stroke-opacity=".72">` +
    `<circle r="21" stroke-width=".6"/><circle r="17.5" stroke-width=".4"/>` +
    `<path d="M0 -25L3 -3L0 0L-3 -3Z" fill="${INK}" fill-opacity=".85" stroke="none"/>` +
    `<path d="M0 25L3 3L0 0L-3 3ZM25 0L3 3L0 0L3 -3ZM-25 0L-3 3L0 0L-3 -3Z" fill="${INK}" fill-opacity=".4" stroke="none"/>` +
    `<path d="M0 -25L3 -3L0 0L-3 -3ZM0 25L3 3L0 0L-3 3ZM25 0L3 3L0 0L3 -3ZM-25 0L-3 3L0 0L-3 -3Z" stroke-width=".5"/>` +
    `<path d="M16 -16L2.5 -2.5M16 16L2.5 2.5M-16 16L-2.5 2.5M-16 -16L-2.5 -2.5" stroke-width=".5"/>` +
    `<text y="-29" class="pp-nm" text-anchor="middle" style="font-size:7.5px">${esc(north)}</text></g>` +
    `<g filter="url(#${p}-wash)" opacity=".55"><circle cx="118" cy="700" r="33" fill="none" stroke="#7a5a2a" stroke-width="3.5" stroke-opacity=".16"/>` +
    `<circle cx="118" cy="700" r="30.5" fill="none" stroke="#7a5a2a" stroke-width="1" stroke-opacity=".12"/></g>` +
    `</g>`
  );
}

/** Build the sheet for a frame transform. `p` prefixes every id in the defs. */
export function buildSheet(words: MapWords, p = 'pp', frame: FrameTransform = FRAME, geo: Geometry = getGeometry()): Sheet {
  const T = (x: number, y: number): P => toFrame(frame, x, y);
  const tp = (pts: readonly P[]): P[] => pts.map(([x, y]) => T(x, y));

  const sea = REGIONS.filter((r) => r.island);
  const land = REGIONS.filter((r) => !r.island);

  // Shapes in frame px: the plates, the raw coasts, the seeded island blobs.
  const shape: Record<RegionId, string> = {};
  const centre: Record<RegionId, P> = {};
  const label: Record<RegionId, P> = {};
  const nameHalf: Record<RegionId, number> = {};
  const bounds: Record<RegionId, Bounds> = {};
  const isl: Record<RegionId, boolean> = {};
  const labelBox: Record<RegionId, Bounds> = {};
  for (const r of land) shape[r.id] = polyPath(tp(geo.plates[r.id]));
  for (const r of sea) {
    const [cx, cy] = T(r.x, r.y);
    shape[r.id] = island(cx, cy, ISLAND_DRAW_R, ISLAND_SEEDS[r.id] ?? seedOf(r.id));
  }
  for (const r of REGIONS) {
    centre[r.id] = T(r.x, r.y);
    const lp = LABEL_POS[r.id] ?? [r.x, r.y];
    label[r.id] = T(lp[0], lp[1]);
    const size = r.island ? 7.1 : SMALL_NAMES.has(r.id) ? 7.4 : r.capital ? 8.9 : 8.4;
    nameHalf[r.id] = (r.name.length * size * 0.69) / 2;
    const b = geo.bounds[r.id];
    const [x0, y0] = T(b.x0, b.y0);
    const [x1, y1] = T(b.x1, b.y1);
    bounds[r.id] = r.island ? { x0: centre[r.id][0] - ISLAND_DRAW_R, y0: centre[r.id][1] - ISLAND_DRAW_R, x1: centre[r.id][0] + ISLAND_DRAW_R, y1: centre[r.id][1] + ISLAND_DRAW_R } : { x0, y0, x1, y1 };
    isl[r.id] = r.island;
    const [lx, ly] = label[r.id];
    // Capitals: the glyphs stand about 0.8 em over the baseline and nothing hangs under it.
    labelBox[r.id] = { x0: lx - nameHalf[r.id], y0: ly - size * 0.8, x1: lx + nameHalf[r.id], y1: ly + 1.5 };
  }
  // The bloc titles, set wide: about 0.9 em a letter at their size.
  const blocBoxes: Bounds[] = BLOC_POS.map(([bloc, x, y, small]) => {
    const [fx, fy] = T(x, y);
    const size = small ? 7.6 : 9.4;
    const half = (words.blocs[bloc].length * size * 0.9) / 2;
    return { x0: fx - half, y0: fy - size * 0.8, x1: fx + half, y1: fy + 1.5 };
  });
  const coasts: Record<string, string> = {};
  for (const m of MASSES) coasts[m] = polyPath(tp(OUTLINES[m]));
  const coastList = [...MASSES.map((m) => coasts[m]), ...sea.map((r) => shape[r.id])];

  const o: string[] = [];
  o.push(defs(p));
  for (const m of MASSES) o.push(`<clipPath id="${p}-clip-${m}"><path d="${coasts[m]}"/></clipPath>`);
  for (const r of sea) o.push(`<clipPath id="${p}-clip-${r.id}"><path d="${shape[r.id]}"/></clipPath>`);

  // Sea lanes, under the land so only the sea shows them.
  o.push(`<g class="pp-lanes" fill="none" stroke="#4a3f30" stroke-width="0.7" stroke-dasharray="2.6 2.4" stroke-opacity="0.5">`);
  for (const [a, b] of geo.lanes) {
    const [ax, ay] = T(REGION[a].x, REGION[a].y);
    const [bx, by] = T(REGION[b].x, REGION[b].y);
    o.push(`<path d="${pencilLine(ax, ay, bx, by, seedOf(a + b), 0.5)}"/>`);
  }
  o.push('</g>');

  // Water lining: four fading strokes outside every coast.
  o.push('<g class="pp-wl" fill="none" stroke="#4a3b25" stroke-linejoin="round">');
  for (const [w, op] of [
    [12, 0.05],
    [8.4, 0.08],
    [5.2, 0.13],
    [2.4, 0.22],
  ] as const) {
    for (const d of coastList) o.push(`<path d="${d}" stroke-width="${w}" stroke-opacity="${op}"/>`);
  }
  o.push('</g>');

  // Land: paper under a bloc wash, region by region.
  o.push('<g class="pp-fills">');
  for (const r of land) o.push(`<path d="${shape[r.id]}" fill="#f5eacd" fill-opacity="0.85"/><path d="${shape[r.id]}" fill="${TINT[r.bloc]}" fill-opacity="0.5"/>`);
  for (const r of sea) o.push(`<path d="${shape[r.id]}" fill="#f5eacd" fill-opacity="0.9"/><path d="${shape[r.id]}" fill="${TINT.SCT}" fill-opacity="0.5"/>`);
  o.push('</g>');

  // Relief: the inner coast shading, clipped to each shore.
  o.push('<g class="pp-relief" fill="none" stroke="#5f4e32">');
  for (const m of MASSES) o.push(`<g clip-path="url(#${p}-clip-${m})"><path d="${coasts[m]}" stroke-width="5" stroke-opacity="0.16"/><path d="${coasts[m]}" stroke-width="1.8" stroke-opacity="0.22"/></g>`);
  for (const r of sea) o.push(`<g clip-path="url(#${p}-clip-${r.id})"><path d="${shape[r.id]}" stroke-width="5" stroke-opacity="0.16"/><path d="${shape[r.id]}" stroke-width="1.8" stroke-opacity="0.22"/></g>`);
  o.push('</g>');

  o.push('<g class="pp-ridges">');
  for (const [x, y, w, n, s] of RIDGES) {
    const [fx, fy] = T(x, y);
    o.push(ridge(fx, fy, w, n, s));
  }
  o.push('</g>');

  // The marks under the ink: pressure hatching and the fighting wash.
  o.push(`<g class="pp-l pp-l-press" filter="url(#${p}-rough)"></g>`);
  o.push('<g class="pp-l pp-l-fight"></g>');

  // Internal borders (dashed) and the coasts (ink, roughened).
  o.push(`<g class="pp-borders" fill="none" stroke="${INK}" stroke-width="0.55" stroke-dasharray="2.2 1.6" stroke-opacity="0.75">`);
  for (const r of land) o.push(`<path d="${shape[r.id]}"/>`);
  o.push('</g>');
  o.push(`<g class="pp-coasts" fill="none" stroke="${INK}" stroke-width="1.05" stroke-linejoin="round" filter="url(#${p}-rough)">`);
  for (const d of coastList) o.push(`<path d="${d}"/>`);
  o.push('</g>');

  // The held finger lifts a region, above the ink and under the names.
  o.push('<g class="pp-l pp-l-hold"></g>');

  // Printed names, with the ringed dot of a capital (the two powers' capitals carry flags instead).
  o.push('<g class="pp-names">');
  for (const r of REGIONS) {
    const [fx, fy] = label[r.id];
    let cls = 'pp-nm';
    if (r.island) cls += ' pp-isle';
    if (r.capital) cls += ' pp-cap';
    if (SMALL_NAMES.has(r.id)) cls += ' pp-sm';
    o.push(`<text class="${cls}" id="${p}-nm-${r.id}" x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" text-anchor="middle">${esc(r.name)}</text>`);
    if (r.capital && r.id !== 'EDV' && r.id !== 'WMS') {
      o.push(`<g transform="translate(${fx.toFixed(1)} ${(fy + (r.id === 'LNK' ? 7 : 6)).toFixed(1)})"><circle r="2.3" fill="none" stroke="${INK}" stroke-width="0.7"/><circle r="0.9" fill="${INK}"/></g>`);
    }
  }
  o.push('</g>');

  o.push('<g class="pp-blocs">');
  for (const [bloc, x, y, small] of BLOC_POS) {
    const [fx, fy] = T(x, y);
    o.push(`<text x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" text-anchor="middle"${small ? ' class="pp-bloc-sm"' : ''}>${esc(words.blocs[bloc])}</text>`);
  }
  o.push('</g>');

  o.push('<g class="pp-flags">');
  for (const [, x, y, kind] of FLAGS) {
    const [fx, fy] = T(x, y);
    o.push(flagPin(fx, fy, kind));
  }
  o.push('</g>');

  // The marks over the ink, in z-order.
  o.push('<g class="pp-l pp-l-head"></g>');
  o.push('<g class="pp-l pp-l-piece"></g>');
  o.push(`<g class="pp-l pp-l-prom" fill="none" stroke="#17120e" stroke-width="3.1" stroke-opacity="0.78" stroke-linecap="round" stroke-linejoin="round" filter="url(#${p}-rough)"></g>`);
  o.push(`<g class="pp-l pp-l-test" fill="none" stroke="#c0271a" stroke-width="2.1" stroke-opacity="0.85" stroke-linecap="round" filter="url(#${p}-rough)"></g>`);
  o.push('<g class="pp-l pp-l-hw"></g>');
  o.push('<g class="pp-l pp-l-stamp"></g>');
  o.push(desk(p, words.north));

  return { markup: o.join('\n'), geom: { frame, shape, centre, label, nameHalf, bounds, island: isl, labelBox, blocBoxes, blocSmall: BLOC_POS.map(([, , , small]) => small) } };
}

export { fmt, ISLAND_R };
