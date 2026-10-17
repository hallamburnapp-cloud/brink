/**
 * The hand on the map: path strings for the marks, ported from tools/redlines-paper/build.py.
 * Grease-pencil rings, pencil lines and arrows, the seeded island coasts, the hachured hills.
 * Every function is pure and seeded; coordinates are whatever the caller passes (frame px).
 */
import { rnd } from './rand';

export type P = readonly [number, number];

const f1 = (n: number) => n.toFixed(1);

export function fmt(p: P): string {
  return `${f1(p[0])} ${f1(p[1])}`;
}

/** A closed polygon as a path. */
export function polyPath(pts: readonly P[]): string {
  return 'M' + pts.map(fmt).join('L') + 'Z';
}

/** A closed Catmull-Rom spline through the points. */
export function catmullClosed(pts: readonly P[], tension = 1): string {
  const n = pts.length;
  let d = `M${fmt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: P = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d + 'Z';
}

/** An open Catmull-Rom spline through the points. */
export function catmullOpen(pts: readonly P[], tension = 1): string {
  const n = pts.length;
  let d = `M${fmt(pts[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, n - 1)];
    const c1: P = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d;
}

/** A seeded irregular island: a smoothed noisy circle with one bay and one headland. */
export function island(cx: number, cy: number, r: number, seed: number | string, n = 18): string {
  const g = rnd(seed);
  const raw = Array.from({ length: n }, () => 0.74 + 0.36 * g.random());
  const sm = raw.map((_, i) => (raw[(i - 1 + n) % n] + 2 * raw[i] + raw[(i + 1) % n]) / 4);
  const bay = g.randrange(n);
  const head = (bay + Math.floor(n / 2) + g.range(-2, 3) + n) % n;
  sm[bay] *= 0.7;
  sm[(bay + 1) % n] *= 0.82;
  sm[head] *= 1.18;
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n + g.uniform(-0.08, 0.08);
    const rr = r * sm[i];
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a) * 0.92]);
  }
  return catmullClosed(pts, 0.9);
}

/** A grease-pencil ring: a little more than one turn, wobbling, drifting as the hand goes round. */
export function greaseRing(cx: number, cy: number, rx: number, ry: number, seed: number | string, turns = 1.12, start = -1.1, wobble = 1.6, n = 40): string {
  const g = rnd(seed);
  const k = typeof seed === 'number' ? seed : 3;
  const pts: P[] = [];
  const total = Math.floor(n * turns);
  for (let i = 0; i <= total; i++) {
    const a = start + (i / n) * 2 * Math.PI;
    const drift = 1 + 0.03 * Math.sin(a * 2.3 + k);
    pts.push([
      cx + (rx * drift + g.uniform(-wobble, wobble)) * Math.cos(a) + (i / total) * 1.5,
      cy + (ry * drift + g.uniform(-wobble, wobble)) * Math.sin(a) - (i / total) * 1.0,
    ]);
  }
  return catmullOpen(pts, 0.8);
}

/** A pencil line with a little wobble. */
export function pencilLine(x1: number, y1: number, x2: number, y2: number, seed: number | string, wob = 0.7, segs = 6): string {
  const g = rnd(seed);
  const pts: P[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push([x1 + (x2 - x1) * t + g.uniform(-wob, wob), y1 + (y2 - y1) * t + g.uniform(-wob, wob)]);
  }
  return catmullOpen(pts, 0.9);
}

export function arrowHead(x: number, y: number, ang: number, size = 7): string {
  const a1 = ang + (150 * Math.PI) / 180;
  const a2 = ang - (150 * Math.PI) / 180;
  return `M${f1(x + size * Math.cos(a1))} ${f1(y + size * Math.sin(a1))}L${f1(x)} ${f1(y)}L${f1(x + size * Math.cos(a2))} ${f1(y + size * Math.sin(a2))}`;
}

/** A pencil arrow through the points: the stroke, its head, and a faint second stroke beside it. Returns the three d strings. */
export function pencilArrow(pts: readonly P[], seed: number | string): { d: string; head: string } {
  const g = rnd(seed);
  const pp: P[] = pts.map(([x, y]) => [x + g.uniform(-0.6, 0.6), y + g.uniform(-0.6, 0.6)]);
  const d = catmullOpen(pp, 0.9);
  const [x1, y1] = pp[pp.length - 2];
  const [x2, y2] = pp[pp.length - 1];
  const ang = Math.atan2(y2 - y1, x2 - x1);
  return { d, head: arrowHead(x2, y2, ang, 6.5) };
}

/** A short row of hachured hills, as the printed sheet shows them. SVG markup. */
export function ridge(x: number, y: number, w: number, n = 4, seed: number | string = 1): string {
  const g = rnd(seed);
  const parts: string[] = [];
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const bx = x + i * step + g.uniform(-1, 1);
    const by = y + g.uniform(-1.2, 1.2);
    const h = 3.2 + g.uniform(-0.6, 1.2);
    parts.push(
      `<path d="M${f1(bx)} ${f1(by)}L${f1(bx + step * 0.45)} ${f1(by - h)}L${f1(bx + step * 0.95)} ${f1(by)}" stroke="#4a3b25" stroke-width="0.6" fill="none" stroke-opacity="0.55"/>`,
    );
    for (let j = 0; j < 3; j++) {
      const t = 0.25 + j * 0.25;
      const sx = bx + step * 0.45 + step * 0.5 * t;
      const sy = by - h + h * t;
      parts.push(`<path d="M${f1(sx)} ${f1(sy)}L${f1(sx + 0.6)} ${f1(sy + h * 0.28)}" stroke="#4a3b25" stroke-width="0.45" stroke-opacity="0.45"/>`);
    }
  }
  return parts.join('');
}

/** The art director's pushpin: a red glass head on a steel pin, with its shadow. `p` is the id prefix for the defs. */
export function pushpin(x: number, y: number, p: string): string {
  return (
    `<g transform="translate(${f1(x)} ${f1(y)})">` +
    `<ellipse cx="-3" cy="5.5" rx="5.5" ry="2.2" fill="#2a1a08" opacity="0.38" filter="url(#${p}-shadow)"/>` +
    `<path d="M0 0L-2.4 4.4" stroke="#7a7a7a" stroke-width="1.1"/>` +
    `<path d="M-1.2 2.1L0 0" stroke="#d8d8d8" stroke-width="0.5"/>` +
    `<circle r="5.2" fill="url(#${p}-pinR)"/>` +
    `<circle r="5.2" fill="none" stroke="#4a0a0a" stroke-width="0.6" stroke-opacity="0.7"/>` +
    `<ellipse cx="-1.6" cy="-1.9" rx="1.6" ry="1" fill="#fff" opacity="0.55"/>` +
    `</g>`
  );
}

/** The two invented flags on pins at the capitals: the Republic's (blue, a pale diagonal, a gold sun) and the Federation's (dark red, a black wedge, a pale disc). */
export function flagPin(x: number, y: number, kind: 'republic' | 'federation'): string {
  const g = [`<g transform="translate(${f1(x)} ${f1(y)})">`];
  g.push('<ellipse cx="1.5" cy="1.2" rx="3.2" ry="1.3" fill="#3b2a12" opacity="0.35"/>');
  g.push('<path d="M0 0V-13" stroke="#5a5048" stroke-width="0.9"/>');
  g.push('<path d="M0 -13V-11" stroke="#d9cfb8" stroke-width="0.9"/>');
  if (kind === 'republic') {
    g.push('<path d="M0 -13H12.5L11 -8.7L12.5 -4.5H0Z" fill="#1d4b6e"/>');
    g.push('<path d="M0 -4.5L12.5 -13" stroke="#f1e9d2" stroke-width="1.6"/>');
    g.push('<circle cx="3.4" cy="-9.8" r="1.5" fill="#e8b84a"/>');
  } else {
    g.push('<path d="M0 -13H12.5L11 -8.7L12.5 -4.5H0Z" fill="#8f1b1b"/>');
    g.push('<path d="M0 -13L5.5 -8.7L0 -4.5Z" fill="#1a1412"/>');
    g.push('<circle cx="8.3" cy="-8.7" r="1.6" fill="#f1e9d2"/>');
  }
  g.push('<path d="M0 -13H12.5L11 -8.7L12.5 -4.5H0Z" fill="none" stroke="#1a1412" stroke-width="0.5" stroke-opacity="0.7"/>');
  g.push('<circle cx="0" cy="0" r="1.1" fill="#3b3028"/>');
  g.push('</g>');
  return g.join('');
}

/** The paper counters: a dark card chit with a pale glyph, the fleet a ship, the brigade a crossed box. Drawn at the origin. */
export function counterGlyph(kind: 'fleet' | 'brigade', p: string): string {
  const base =
    `<rect x="-6.5" y="-5.5" width="15" height="13" rx="1" fill="#1a1208" opacity="0.35" filter="url(#${p}-shadow)"/>` +
    `<rect x="-7.5" y="-7.5" width="15" height="13" rx="1" fill="url(#${p}-chit)" stroke="#dbcfb0" stroke-width="0.8"/>`;
  if (kind === 'fleet') {
    return (
      base +
      '<path d="M-4 1.5h8l-1.3 2.2h-5.4zM-0.2 1.5v-5.5M-0.2 -4h2.6l-2.6 2.2" fill="#f1e9d2" stroke="#f1e9d2" stroke-width="0.6" stroke-linejoin="round"/>' +
      '<path d="M-4.6 2.6q2 1.4 4.4 0t4.4 0" fill="none" stroke="#f1e9d2" stroke-width="0.6"/>'
    );
  }
  return (
    base +
    '<rect x="-4.6" y="-4.4" width="9.2" height="6.8" fill="none" stroke="#f1e9d2" stroke-width="0.7"/>' +
    '<path d="M-4.6 -4.4L4.6 2.4M4.6 -4.4L-4.6 2.4" stroke="#f1e9d2" stroke-width="0.7"/>' +
    '<path d="M-3.2 4.2h6.4" stroke="#f1e9d2" stroke-width="0.6"/>'
  );
}
