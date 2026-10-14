/** Path builders shared by the staff drawings. Pure geometry, no JSX. */

const f = (n: number): string => (Math.round(n * 100) / 100).toString();

/**
 * A soft, lumpy closed blob (wax, ink): a circle whose radius ripples with `lobes` bumps,
 * squashed vertically by `squash` to sit on the table in three-quarter view.
 */
export function blobPath(cx: number, cy: number, r: number, lobes: number, amp: number, phase = 0, squash = 1): string {
  const n = lobes * 4;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + amp * Math.sin(a * lobes + phase));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  // Quadratic curves through the midpoints keep the outline smooth with no corners.
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d} Z`;
}

/** A five-point star centred on (cx, cy), outer radius r, squashed vertically by `squash`. */
export function starPath(cx: number, cy: number, r: number, squash = 1, inner = 0.42): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    d += `${i === 0 ? 'M' : 'L'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr * squash)} `;
  }
  return `${d}Z`;
}

/** A polygon through the given points. */
export function poly(points: ReadonlyArray<readonly [number, number]>): string {
  return `${points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`).join(' ')} Z`;
}
