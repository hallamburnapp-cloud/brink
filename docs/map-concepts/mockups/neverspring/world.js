// NEVERSPRING world painter. Fixed seed: every render is identical.
// One round world seen from above its North Pole, painted twice (a thawed gouache dusk and a
// frozen snow painting) and revealed region by region through a feathered noise mask.
// Land snow and sea ice are painted differently: snow over relief with pines, iced lakes and
// frozen rivers; sea ice as pale cracked plates.
(function () {
'use strict';
const TAU = Math.PI * 2;

// ---------- seeded random ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

// ---------- simplex 2D ----------
function makeSimplex(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
  const g = [1,1,-1,1,1,-1,-1,-1,1,0,-1,0,1,0,-1,0,0,1,0,-1,0,1,0,-1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function (xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { const gi = pm12[ii + perm[jj]] * 2; t0 *= t0; n0 = t0 * t0 * (g[gi] * x0 + g[gi + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { const gi = pm12[ii + i1 + perm[jj + j1]] * 2; t1 *= t1; n1 = t1 * t1 * (g[gi] * x1 + g[gi + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { const gi = pm12[ii + 1 + perm[jj + 1]] * 2; t2 *= t2; n2 = t2 * t2 * (g[gi] * x2 + g[gi + 1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}
const N1 = makeSimplex(1907), N2 = makeSimplex(2213), N3 = makeSimplex(3301), N4 = makeSimplex(4447), N5 = makeSimplex(5581), N6 = makeSimplex(6661);
function fbm(n, x, y, oct, lac, gain) { let a = 0, amp = 1, f = 1, norm = 0; for (let o = 0; o < oct; o++) { a += amp * n(x * f + o * 17.3, y * f - o * 9.1); norm += amp; amp *= gain; f *= lac; } return a / norm; }
function ridged(n, x, y, oct) { let a = 0, amp = 1, f = 1, norm = 0; for (let o = 0; o < oct; o++) { let v = 1 - Math.abs(n(x * f + o * 7.7, y * f + o * 3.1)); v *= v; a += amp * v; norm += amp; amp *= 0.5; f *= 2.03; } return a / norm; }
const CELL = new Float64Array(5);
function cellular(x, y, seed, jit) {
  const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0, sx = 0, sy = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = xi + dx, cy = yi + dy;
    const px = cx + 0.5 + (hash2(cx, cy, seed) - 0.5) * jit, py = cy + 0.5 + (hash2(cx, cy, seed + 1) - 0.5) * jit;
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = hash2(cx, cy, seed + 2); sx = px; sy = py; } else if (d < f2) f2 = d;
  }
  CELL[0] = f1; CELL[1] = f2; CELL[2] = id; CELL[3] = sx; CELL[4] = sy; return CELL;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixc(o, a, b, t) { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; }
function setc(o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; }

// ---------- geography (clock hours as seen on screen, radius 0..1) ----------
function arcIn(h, h0, h1) { const span = (h1 - h0 + 12) % 12; const t = (h - h0 + 12) % 12; if (t <= span) return Math.min(t, span - t); return -Math.min(t - span, 12 - t); }
function bump(h, c, w) { let d = Math.abs(h - c); d = Math.min(d, 12 - d); return Math.exp(-(d * d) / (w * w)); }
function polar(h, r) { const a = h / 12 * TAU; return [r * Math.sin(a), -r * Math.cos(a)]; }
function hourOf(x, y) { let h = Math.atan2(x, -y) / TAU * 12; if (h < 0) h += 12; return h; }
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay; const t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1); return [Math.hypot(px - ax - vx * t, py - ay - vy * t), t]; }

const SPINE = [polar(4.62, 0.30), polar(4.42, 0.55), polar(4.12, 0.80), polar(3.98, 1.08)];
const ISLES = [ // h, r, size, white?
  [11.30, 0.845, 0.050, 0], [11.68, 0.9, 0.032, 0], [0.04, 0.885, 0.04, 1],
  [0.42, 0.92, 0.036, 1], [0.78, 0.835, 0.044, 0], [1.12, 0.94, 0.030, 0]];
ISLES.forEach(s => { const p = polar(s[0], s[1]); s.push(p[0], p[1]); });
function spineDist(x, y) { let best = 9, bt = 0; for (let i = 0; i < SPINE.length - 1; i++) { const [d, t] = segDist(x, y, SPINE[i][0], SPINE[i][1], SPINE[i + 1][0], SPINE[i + 1][1]); if (d < best) { best = d; bt = (i + t) / (SPINE.length - 1); } } return [best, bt]; }

function landShape(x, y) {
  const r = Math.hypot(x, y); const h = hourOf(x, y);
  const K = r * Math.PI / 6;
  let L = -1;
  // Northlands ring around the Polar Sea, with a cape reaching for the Narrows at 8 o'clock
  const nIn = 0.20 + 0.022 * Math.sin(h * 1.7 + 1) + 0.012 * Math.sin(h * 4.1);
  const nOut = 0.372 + 0.02 * Math.sin(h * 2.3 + 0.4) + 0.012 * bump(h, 8.0, 0.3) + 0.02 * bump(h, 11.3, 0.6) - 0.03 * bump(h, 6.2, 0.5) + 0.013 * Math.sin(h * 5.2);
  let NL = Math.min(r - nIn - 0.025 * Math.sin(h * 3 + 2), nOut - r);
  for (const [sh0, w] of [[2.05, 0.018], [6.35, 0.022], [9.6, 0.010]]) { const ang = sh0 / 12 * TAU; const ux = Math.sin(ang), uy = -Math.cos(ang); const along = x * ux + y * uy; const perp = Math.abs(-x * uy + y * ux); if (along > 0.1) NL = Math.min(NL, perp - w); }
  for (const [fh, fr, fl] of [[0.9, 0.36, 0.07], [4.0, 0.37, 0.06], [7.0, 0.36, 0.06], [11.0, 0.22, 0.05]]) { const a = polar(fh, fr), b = polar(fh + 0.25, fr - (fr > 0.3 ? fl : -fl)); NL = Math.min(NL, segDist(x, y, a[0], a[1], b[0], b[1])[0] - 0.012); }
  L = Math.max(L, NL);
  // Heartland crescent 7.45 -> 2.65, with a cape at the Narrows
  const hIn = 0.47 + 0.022 * Math.sin(h * 2.9) - 0.025 * bump(h, 7.95, 0.3) + 0.025 * bump(h, 0.9, 0.5);
  const hOut = 0.70 + 0.03 * Math.sin(h * 1.9 + 2) - 0.05 * bump(h, 1.05, 0.35) + 0.02 * Math.sin(h * 4.7) - 0.03 * bump(h, 0.0, 0.5);
  L = Math.max(L, Math.min(Math.min(r - hIn, hOut - r), arcIn(h, 7.45, 2.65) * K));
  // Eastmarch (rim beyond the Inner Sea)
  L = Math.max(L, Math.min(Math.min(r - (0.735 + 0.03 * Math.sin(h * 4) + 0.02 * bump(h, 3.3, 0.3)), 1.4 - r), arcIn(h, 1.72, 3.9) * K));
  // High Country spine
  const [sd, st] = spineDist(x, y);
  L = Math.max(L, 0.068 + 0.02 * Math.sin(st * 9) - sd);
  // Sunlands rim; the west coast stands back from the rim so the Western Ocean is open water
  const westCoast = smooth(8.55, 8.95, h) * smooth(11.5, 11.3, h);
  const outer = mix(1.4, 0.872 + 0.012 * Math.sin(h * 6) + 0.03 * bump(h, 9.0, 0.22), westCoast);
  const joinHeart = smooth(8.45, 8.85, h) * smooth(11.4, 11.0, h);
  const inner = mix(0.765 + 0.02 * Math.sin(h * 3.3) + 0.03 * bump(h, 6.0, 0.4), 0.64, joinHeart);
  L = Math.max(L, Math.min(Math.min(r - inner, outer - r), arcIn(h, 4.42, 11.12) * K));
  // Scattered Isles
  for (const s of ISLES) { const dx = x - s[4], dy = y - s[5]; const a = Math.atan2(dy, dx); L = Math.max(L, s[2] * (1 + 0.35 * Math.sin(a * 2 + s[0] * 3) + 0.15 * Math.sin(a * 3 + s[1] * 9)) - Math.hypot(dx, dy)); }
  // gulfs and capes
  L = Math.min(L, Math.hypot(x - polar(9.9, 0.66)[0], y - polar(9.9, 0.66)[1]) - 0.035);
  L = Math.min(L, Math.hypot(x - polar(6.9, 0.80)[0], y - polar(6.9, 0.80)[1]) - 0.045);
  L = Math.min(L, Math.hypot(x - polar(2.0, 0.58)[0], y - polar(2.0, 0.58)[1]) - 0.035);
  return L;
}
function warp(x, y) { return [x + 0.05 * fbm(N1, x * 2.1 + 3, y * 2.1, 3, 2, 0.5), y + 0.05 * fbm(N2, x * 2.1, y * 2.1 - 5, 3, 2, 0.5)]; }
// the western inner channel, pinched into the Narrows at 8 o'clock
function carve(l, qx, qy) {
  const r = Math.hypot(qx, qy); const h = hourOf(qx, qy);
  const inArcW = smooth(-0.25, 0.15, arcIn(h, 7.55, 11.4));
  if (inArcW <= 0) return l;
  const mid = 0.432 - 0.025 * bump(h, 8.0, 0.3) + 0.01 * Math.sin(h * 3.1) + 0.004 * N5(qx * 9, qy * 9);
  const half = 0.044 - 0.02 * bump(h, 8.0, 0.3) + 0.003 * N6(qx * 14, qy * 14);
  return Math.min(l, Math.abs(r - mid) - half * inArcW + (1 - inArcW) * 0.05);
}
function landFull(qx, qy) { return carve(landShape(qx, qy) + 0.042 * fbm(N3, qx * 3.2, qy * 3.2, 5, 2.05, 0.5) + 0.011 * fbm(N4, qx * 14, qy * 14, 3, 2, 0.5), qx, qy); }
function landPot(x, y) { const [qx, qy] = warp(x, y); return landFull(qx, qy); }

// ---------- regions ----------
// frost: 1 frozen, 0 thawed; people: 0 none, 1 some, 2 many
const MID_FROST = {
  heart: [0.0, 0.0, 0.0, 0.0, 1, 1, 1, 0.0, 0.0],
  sun: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  isle: [0, 0, 1, 1, 0, 0]
};
const HEART_NAMES = ['Hask', 'Ostrel', 'Velloran', 'Mirrin', 'Tessaly', 'Corrow', 'Anvel', 'Brisk', 'Daunt'];
function buildRegions(state) {
  const R = []; const rnd = mulberry32(77);
  const add = (mass, h, r, frost, people) => { const p = polar(h, r); R.push({ mass, h, r, x: p[0], y: p[1], frost, people }); };
  for (let k = 0; k < 9; k++) add('north', (k + 0.3) * 12 / 9 + (rnd() - 0.5) * 0.4, 0.295 + (rnd() - 0.5) * 0.04, 1, 0);
  const hh = [7.9, 8.8, 9.7, 10.6, 11.45, 0.35, 1.25]; const hp = [2, 2, 2, 2, 1, 1, 1];
  hh.forEach((h, i) => add('heart', h, 0.58 + (rnd() - 0.5) * 0.05, MID_FROST.heart[i], hp[i]));
  add('heart', 2.25, 0.84, MID_FROST.heart[7], 1); add('heart', 3.15, 0.87, MID_FROST.heart[8], 2);
  for (let t = 0; t < 6; t++) { const s = t / 5; const p = [mix(SPINE[0][0], SPINE[3][0], s * 0.92 + 0.03), mix(SPINE[0][1], SPINE[3][1], s * 0.92 + 0.03)]; R.push({ mass: 'high', x: p[0], y: p[1], h: hourOf(p[0], p[1]), r: Math.hypot(p[0], p[1]), frost: 1, people: 0 }); }
  for (let k = 0; k < 10; k++) { const h = 4.85 + k * 0.69; add('sun', h, (h > 9.3 ? 0.80 : 0.85) + (rnd() - 0.5) * 0.04, MID_FROST.sun[k], k >= 3 ? 2 : 1); }
  ISLES.forEach((s, i) => add('isle', s[0], s[1], MID_FROST.isle[i], 1));
  if (state === 'win') R.forEach(r => r.frost = 1);
  return R;
}

// ---------- sea ice target ----------
function wArc(h, a, b, soft) { return smooth(-soft, soft, arcIn(h, a, b)); }
function warmTongue(x, y) { const [d, t] = segDist(x, y, polar(1.0, 1.05)[0], polar(1.0, 1.05)[1], polar(1.25, 0.70)[0], polar(1.25, 0.70)[1]); return smooth(0.075 + 0.03 * (1 - t), 0.0, d); }
// the ice bridge that closes the Narrows: a band across the strait at 8 o'clock
function narrowsBridge(x, y) {
  const [qx, qy] = warp(x, y); const r = Math.hypot(qx, qy), h = hourOf(qx, qy);
  const arc = Math.abs(arcIn(h, 8.0, 8.0)) / 12 * TAU * r; // distance along the strait from its middle
  const n = 0.006 * N2(x * 40, y * 40) + 0.004 * N3(x * 90, y * 90);
  return smooth(0.05, 0.04, arc + n) * smooth(0.33, 0.36, r) * smooth(0.48, 0.45, r);
}
function nearNarrows(x, y) { const [qx, qy] = warp(x, y); const r = Math.hypot(qx, qy), h = hourOf(qx, qy); const arc = Math.abs(arcIn(h, 8.0, 8.0)) / 12 * TAU * r; return smooth(0.14, 0.08, arc) * smooth(0.3, 0.34, r) * smooth(0.56, 0.5, r); }
function seaIceTarget(x, y, r, h, state) {
  if (state === 'win') return 1;
  let v = smooth(0.235, 0.19, r);                                                  // Polar Sea
  v = Math.max(v, narrowsBridge(x, y));                                     // the Narrows
  v = Math.max(v, smooth(0.6, 0.54, r) * wArc(h, 2.55, 4.35, 0.2));               // Inner Sea, the half nearer the pole
  v *= 1 - 0.95 * warmTongue(x, y);
  return v;
}

// ---------- image helpers ----------
function boxBlur(src, W, H, rad, passes) {
  let a = Float32Array.from(src), b = new Float32Array(W * H);
  if (rad < 1) return a;
  const n = 2 * rad + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) { const row = y * W; let acc = 0; for (let x = -rad; x <= rad; x++) acc += a[row + clamp(x, 0, W - 1)];
      for (let x = 0; x < W; x++) { b[row + x] = acc / n; acc += a[row + Math.min(x + rad + 1, W - 1)] - a[row + Math.max(x - rad, 0)]; } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -rad; y <= rad; y++) acc += b[clamp(y, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) { a[y * W + x] = acc / n; acc += b[Math.min(y + rad + 1, H - 1) * W + x] - b[Math.max(y - rad, 0) * W + x]; } }
  }
  return a;
}
function normBlur(B, V, W, H, rad, passes) {
  const n = W * H; const bv = new Float32Array(n), vv = new Float32Array(n);
  for (let i = 0; i < n; i++) { vv[i] = V[i]; bv[i] = B[i] * V[i]; }
  const a = boxBlur(bv, W, H, rad, passes), b = boxBlur(vv, W, H, rad, passes);
  for (let i = 0; i < n; i++) a[i] = b[i] > 1e-4 ? a[i] / b[i] : B[i];
  return a;
}
function cleanMask(B, V, W, H, minArea) {
  const n = W * H; const seen = new Uint8Array(n); const comp = new Int32Array(n);
  for (const target of [1, 0]) {
    seen.fill(0);
    for (let s = 0; s < n; s++) {
      if (seen[s] || !V[s] || B[s] !== target) continue;
      let head = 0, tail = 0; comp[tail++] = s; seen[s] = 1;
      while (head < tail) { const i = comp[head++]; const x = i % W;
        if (x > 0) { const j = i - 1; if (!seen[j] && V[j] && B[j] === target) { seen[j] = 1; comp[tail++] = j; } }
        if (x < W - 1) { const j = i + 1; if (!seen[j] && V[j] && B[j] === target) { seen[j] = 1; comp[tail++] = j; } }
        if (i >= W) { const j = i - W; if (!seen[j] && V[j] && B[j] === target) { seen[j] = 1; comp[tail++] = j; } }
        if (i < n - W) { const j = i + W; if (!seen[j] && V[j] && B[j] === target) { seen[j] = 1; comp[tail++] = j; } } }
      if (tail < minArea) for (let k = 0; k < tail; k++) B[comp[k]] = 1 - target;
    }
  }
}
function rgbaOf(cv) { return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; }

// ---------- palette ----------
const C = {
  snow: hex('#F2F7FB'), shadow: hex('#9CC9E8'), pack: hex('#DCEAF4'), crack: hex('#9CC9E8'),
  sea: hex('#1E4A5A'), deep: hex('#153A4B'), shallow: hex('#286070'), shelf: hex('#367878'), warm: hex('#2C6B70'),
  ochre: hex('#C9A46A'), wheat: hex('#D9B97A'), meadow: hex('#5E7F4E'), green: hex('#7A9C58'), sage: hex('#98A065'), forest: hex('#3E6440'),
  pine: hex('#2B4A38'), tundra: hex('#8C9A7E'), tundraD: hex('#6E806A'),
  desert: hex('#D8B47C'), dune: hex('#E8C994'), rust: hex('#C0905E'), savanna: hex('#BFA160'), scrub: hex('#8E9556'),
  jungle: hex('#3F6B45'), jungleD: hex('#2F5838'), slate: hex('#7A8494'), slateD: hex('#4E5A6C'), sand: hex('#E6CD9C')
};
const TEMPERATE = [[C.ochre, 0.27], [C.wheat, 0.13], [C.meadow, 0.22], [C.green, 0.16], [C.sage, 0.1], [C.forest, 0.12]];
function pick(list, t) { let acc = 0; for (const [c, w] of list) { acc += w; if (t < acc) return c; } return list[list.length - 1][0]; }

// ---------- glyphs: atlas mountains and pines, painted twice ----------
function rangePeaks() {
  const rnd = mulberry32(4242); const P = [];
  // the High Country spine: a double row of peaks, tallest in the middle
  for (let t = 0.0; t <= 1.0001; t += 0.024) {
    const seg = Math.min(2, Math.floor(t * 3)); const lt = t * 3 - seg; const a = SPINE[seg], b = SPINE[seg + 1];
    const x = mix(a[0], b[0], lt), y = mix(a[1], b[1], lt); const dx = b[0] - a[0], dy = b[1] - a[1]; const dl = Math.hypot(dx, dy); const nx = -dy / dl, ny = dx / dl;
    const big = 0.6 + 0.4 * Math.sin(Math.PI * clamp(t * 1.1, 0, 1));
    for (let j = 0; j < 2; j++) { const off = (j ? 1 : -1) * (0.012 + rnd() * 0.022); const w = (0.03 + rnd() * 0.016) * big;
      P.push({ x: x + nx * off + (rnd() - 0.5) * 0.01, y: y + ny * off + (rnd() - 0.5) * 0.01, w, hr: 0.75 + rnd() * 0.3, sk: (rnd() - 0.5) * 0.25, kind: 'high' }); }
  }
  // a dry range near Toradel, 7 to 8.5 o'clock
  for (let h = 7.2; h <= 8.5; h += 0.075) { const r = 0.80 + 0.02 * Math.sin(h * 9) + (rnd() - 0.5) * 0.02; const p = polar(h, r); P.push({ x: p[0], y: p[1], w: 0.022 + rnd() * 0.012, hr: 0.65 + rnd() * 0.25, sk: (rnd() - 0.5) * 0.3, kind: 'dry' }); }
  // northern fells
  for (let h = 0.7; h <= 2.5; h += 0.12) { const r = 0.30 + (rnd() - 0.5) * 0.04; const p = polar(h, r); P.push({ x: p[0], y: p[1], w: 0.018 + rnd() * 0.008, hr: 0.55 + rnd() * 0.2, sk: (rnd() - 0.5) * 0.3, kind: 'fell' }); }
  // Eastmarch hills
  for (let h = 2.3; h <= 3.6; h += 0.13) { const r = 0.86 + (rnd() - 0.5) * 0.06; const p = polar(h, r); P.push({ x: p[0], y: p[1], w: 0.02 + rnd() * 0.008, hr: 0.55 + rnd() * 0.2, sk: (rnd() - 0.5) * 0.3, kind: 'dry' }); }
  return P.filter(p => landPot(p.x, p.y + 0.005) > 0.012).sort((a, b) => a.y - b.y);
}
function drawPeaks(g, peaks, half, frozen) {
  const toPx = (x, y) => [x * half + half, y * half + half];
  for (const p of peaks) {
    const [X, Y] = toPx(p.x, p.y); const w = p.w * half, hgt = w * p.hr; const ax = X + p.sk * w, ay = Y - hgt; const mx = X + p.sk * w * 0.4 + w * 0.06;
    const L = [X - w / 2, Y], R = [X + w / 2, Y];
    let lit, shd, ridge, cap = null;
    if (frozen) { lit = '#FFFFFF'; shd = p.kind === 'high' ? '#AFCFE8' : '#BFD8EC'; ridge = 'rgba(132,174,210,0.85)'; }
    else if (p.kind === 'high') { lit = '#B9B2A6'; shd = '#5F6878'; ridge = 'rgba(70,72,80,0.6)'; cap = ['#FFFFFF', '#C8D8E6']; }
    else if (p.kind === 'fell') { lit = '#9AA28A'; shd = '#5E6A62'; ridge = 'rgba(60,66,60,0.5)'; }
    else { lit = '#CFAE80'; shd = '#8A6E5E'; ridge = 'rgba(96,72,60,0.55)'; }
    // a soft cast shadow to the lower right
    g.save(); g.globalAlpha = frozen ? 0.32 : 0.28; g.fillStyle = frozen ? '#7FA9CF' : '#3A3A40';
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(R[0] + w * 0.35, Y + w * 0.05); g.lineTo(mx, Y); g.closePath(); g.fill(); g.restore();
    g.fillStyle = lit; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(ax, ay); g.lineTo(mx, Y); g.closePath(); g.fill();
    g.fillStyle = shd; g.beginPath(); g.moveTo(ax, ay); g.lineTo(R[0], R[1]); g.lineTo(mx, Y); g.closePath(); g.fill();
    if (cap) { const t = 0.38; const c1 = [mix(ax, L[0], t), mix(ay, Y, t)], c2 = [mix(ax, mx, t * 1.1), mix(ay, Y, t * 1.1)], c3 = [mix(ax, R[0], t), mix(ay, Y, t)];
      g.fillStyle = cap[0]; g.beginPath(); g.moveTo(ax, ay); g.lineTo(...c1); g.lineTo(mix(c1[0], c2[0], 0.5), c1[1] - hgt * 0.06); g.lineTo(...c2); g.closePath(); g.fill();
      g.fillStyle = cap[1]; g.beginPath(); g.moveTo(ax, ay); g.lineTo(...c2); g.lineTo(mix(c2[0], c3[0], 0.5), c3[1] - hgt * 0.04); g.lineTo(...c3); g.closePath(); g.fill(); }
    g.strokeStyle = ridge; g.lineWidth = Math.max(0.6, w * 0.06); g.lineCap = 'round';
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx, Y - hgt * 0.1); g.stroke();
    if (frozen) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(0.5, w * 0.05); g.beginPath(); g.moveTo(L[0] + w * 0.08, Y - hgt * 0.06); g.lineTo(ax - w * 0.02, ay + hgt * 0.06); g.stroke(); }
  }
}

// ---------- the painter ----------
// opts: { px, unit (painting px per phone css px), state: 'mid'|'win', hearths, storms, selected (region id), preview: 'packice' }
function paintWorld(opts) {
  const state = opts.state || 'mid';
  const M = opts.px, W = M, H = M, NPX = W * H, half = M / 2;
  const u = opts.unit || 2;
  const regions = buildRegions(state);
  const hearths = (opts.hearths || []).map(([h, r]) => polar(h, r));

  const L = new Float32Array(NPX), HT = new Float32Array(NPX), MNT = new Float32Array(NPX), BRD = new Float32Array(NPX);
  const RID = new Uint8Array(NPX), inD = new Uint8Array(NPX), land = new Uint8Array(NPX), sea = new Uint8Array(NPX);
  const highIdx = regions.map((g, i) => g.mass === 'high' ? i : -1).filter(i => i >= 0);
  const lowIdx = regions.map((g, i) => g.mass !== 'high' ? i : -1).filter(i => i >= 0);
  // ---- pass 1: shape, height, regions
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px; const x = (px + 0.5 - half) / half, y = (py + 0.5 - half) / half;
    const r = Math.hypot(x, y); if (r > 1.015) { L[i] = -0.2; BRD[i] = 99; continue; }
    inD[i] = 1;
    const [qx, qy] = warp(x, y);
    const l = landFull(qx, qy);
    L[i] = l; if (l > 0) land[i] = 1; else sea[i] = 1;
    const [sd] = spineDist(qx, qy);
    const spn = smooth(0.105, 0.0, sd + 0.012 * N3(qx * 20, qy * 20));
    const qr = Math.hypot(qx, qy), qh = hourOf(qx, qy);
    let mnt = spn;
    mnt = Math.max(mnt, 0.7 * smooth(0.05, 0.0, Math.abs(qr - 0.80 - 0.02 * Math.sin(qx * 9))) * bump(qh, 7.85, 0.5));
    mnt = Math.max(mnt, 0.45 * smooth(0.05, 0.0, Math.abs(qr - 0.30)) * bump(qh, 1.6, 0.9));
    mnt = Math.max(mnt, 0.4 * smooth(0.06, 0.0, Math.abs(qr - 0.86)) * bump(qh, 2.95, 0.6));
    MNT[i] = mnt;
    const hills = 0.5 + 0.5 * fbm(N4, qx * 4.5, qy * 4.5, 4, 2, 0.5);
    HT[i] = Math.max(0, Math.min(l * 5, 0.3)) * 0.4 + hills * 0.16 + mnt * (0.5 + 0.8 * ridged(N5, qx * 6, qy * 6, 3));
    if (l > -0.03) {
      const jx = x + 0.010 * N6(x * 22, y * 22), jy = y + 0.010 * N6(x * 22 + 40, y * 22);
      const set = spn > 0.32 ? highIdx : lowIdx;
      let d1 = 9, d2 = 9, i1 = set[0], i2 = set[0];
      for (const k of set) { const g = regions[k]; const d = (jx - g.x) * (jx - g.x) + (jy - g.y) * (jy - g.y); if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = k; } else if (d < d2) { d2 = d; i2 = k; } }
      RID[i] = i1;
      const a = regions[i1], b = regions[i2]; const sep = Math.hypot(a.x - b.x, a.y - b.y);
      BRD[i] = (d2 - d1) / (2 * sep) * half;
      if (spn > 0.32 && spn < 0.45) BRD[i] = 99;
    } else BRD[i] = 99;
  }
  // ---- coverage and coast distance
  const LC = new Float32Array(NPX), SD = new Float32Array(NPX);
  for (let py = 1; py < H - 1; py++) for (let px = 1; px < W - 1; px++) {
    const i = py * W + px; if (!inD[i]) continue;
    const gx = (L[i + 1] - L[i - 1]) * 0.5, gy = (L[i + W] - L[i - W]) * 0.5; const g = Math.hypot(gx, gy) + 1e-7;
    const sdp = clamp(L[i] / g, -80, 80); SD[i] = sdp; LC[i] = clamp(0.5 + sdp, 0, 1);
  }
  const C2 = boxBlur(LC, W, H, Math.max(2, Math.round(5 * u)), 3);
  const C3 = boxBlur(LC, W, H, Math.max(3, Math.round(16 * u)), 3);
  const off = Math.max(1, Math.round(1.6 * u));

  // ---- land snow mask
  const LR = 4, lw = Math.ceil(W / LR), lh = Math.ceil(H / LR);
  const SFv = new Float32Array(lw * lh), SFm = new Float32Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = Math.min(H - 1, y * LR + 2) * W + Math.min(W - 1, x * LR + 2);
    if (land[i]) { SFv[y * lw + x] = regions[RID[i]].frost; SFm[y * lw + x] = 1; }
  }
  const SF = normBlur(SFv, SFm, lw, lh, Math.max(2, Math.round(lw / 80)), 3);
  const sampleSF = (px, py) => { const fx = clamp(px / LR - 0.5, 0, lw - 1.001), fy = clamp(py / LR - 0.5, 0, lh - 1.001); const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0; const a = SF[y0 * lw + x0], b = SF[y0 * lw + x0 + 1], c = SF[(y0 + 1) * lw + x0], d = SF[(y0 + 1) * lw + x0 + 1]; return mix(mix(a, b, tx), mix(c, d, tx), ty); };
  const BS = new Uint8Array(NPX);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px; if (!inD[i] || !land[i]) continue;
    const x = (px + 0.5 - half) / half, y = (py + 0.5 - half) / half; const r = Math.hypot(x, y); const h = hourOf(x, y);
    let S = sampleSF(px, py);
    if (state === 'mid') {
      if (h > 9.0) { const hF = 9.75 + (r - 0.46) * 7 + 0.35 * fbm(N4, x * 5 + 2, y * 5, 3, 2, 0.5); S = Math.max(S, smooth(-0.3, 0.3, h - hF) * smooth(0.77, 0.71, r)); }
      for (const b of (opts.storms || [])) { const bp = polar(b[0], b[1]); const d = Math.hypot(x - bp[0], y - bp[1]); S = Math.max(S, 0.9 * smooth(0.085, 0.035, d)); }
    }
    for (const hp of hearths) { const d = Math.hypot(x - hp[0], y - hp[1]); S -= 0.6 * smooth(0.055, 0.015, d); }
    const nz = fbm(N1, x * 9 + 4, y * 9, 5, 2.1, 0.55) * 0.5 + fbm(N2, x * 26, y * 26, 2, 2, 0.5) * 0.14;
    const p = S - 0.5 + nz * 0.46 + (S > 0.02 ? 0.12 * MNT[i] : 0);
    if (p > 0) BS[i] = 1;
  }
  const minA = Math.round(6 * u * 6 * u * 0.75);
  cleanMask(BS, land, W, H, minA);
  const feather = Math.max(1, Math.round(0.6 * u));
  const snowA = normBlur(BS, land, W, H, feather, 2);
  // shore-fast ice: a thin fringe along frozen coasts
  const FL = new Float32Array(NPX); for (let i = 0; i < NPX; i++) FL[i] = land[i] && snowA[i] > 0.5 ? 1 : 0;
  const FLb = boxBlur(FL, W, H, Math.max(1, Math.round(2.2 * u)), 2);

  // ---- sea ice mask
  const BI = new Uint8Array(NPX), BRG = new Float32Array(NPX);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px; if (!inD[i] || !sea[i]) continue;
    const x = (px + 0.5 - half) / half, y = (py + 0.5 - half) / half; const r = Math.hypot(x, y); const h = hourOf(x, y);
    let t = seaIceTarget(x, y, r, h, state);
    if (state === 'mid') BRG[i] = narrowsBridge(x, y);
    const fast = smooth(0.14, 0.34, FLb[i] + 0.12 * N4(x * 60, y * 60)) * (1 - warmTongue(x, y)) * (state === 'mid' ? 1 - nearNarrows(x, y) : 1);
    const cf = cellular((x + 0.01 * N3(x * 30, y * 30)) * 24, (y + 0.01 * N4(x * 30, y * 30)) * 24, 11, 0.9);
    const gap = smooth(0.05, 0.13, cf[1] - cf[0]);
    const edge = smooth(0.15, 0.45, t) * smooth(0.95, 0.6, t);
    let p = t - 0.5 + 0.3 * fbm(N1, x * 4.2, y * 4.2, 5, 2.1, 0.55) + edge * ((cf[2] - 0.45) * 0.6) - edge * (1 - gap) * 0.35;
    p = Math.max(p, fast - 0.5);
    if (p > 0) BI[i] = 1;
  }
  cleanMask(BI, sea, W, H, Math.round(minA * 0.5));
  const iceA = normBlur(BI, sea, W, H, feather, 2);
  const IEb = normBlur(iceA, sea, W, H, Math.max(1, Math.round(1.3 * u)), 2);
  const WF = new Float32Array(NPX), SWF = new Float32Array(NPX);
  for (let i = 0; i < NPX; i++) { const c = LC[i]; SWF[i] = c * snowA[i]; WF[i] = SWF[i] + (1 - c) * iceA[i]; }
  const lipR = Math.max(1, Math.round(1.1 * u));
  const WFb = boxBlur(WF, W, H, lipR, 2), SWFb = boxBlur(SWF, W, H, lipR, 2);
  const W2 = boxBlur(WF, W, H, Math.max(2, Math.round(4 * u)), 2);

  // ---- rivers, lakes, pines and peaks (rasterised layers)
  const riverA = new Float32Array(NPX);
  let pineT, pineF, peakT, peakF;
  {
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const cv = mk(); const g = cv.getContext('2d');
    const rnd = mulberry32(991); g.lineCap = 'round'; g.lineJoin = 'round';
    const toPx = (x, y) => [x * half + half, y * half + half];
    const sources = [[8.6, 0.62], [9.4, 0.60], [10.2, 0.6], [11.0, 0.62], [11.9, 0.6], [0.8, 0.58], [1.6, 0.6], [2.7, 0.88], [3.4, 0.9], [7.6, 0.9], [8.3, 0.86], [6.6, 0.92], [10.4, 0.82], [5.6, 0.92], [0.3, 0.29], [2.5, 0.31], [5.2, 0.3], [9.8, 0.3], [4.5, 0.62], [6.1, 0.9]];
    for (const [sh, sr] of sources) {
      let [x, y] = polar(sh, sr); if (landPot(x, y) < 0.03) continue;
      const pts = [[x, y]]; let ang = rnd() * TAU;
      for (let s = 0; s < 160; s++) {
        const e = 0.004; const gx = (landPot(x + e, y) - landPot(x - e, y)) / (2 * e), gy = (landPot(x, y + e) - landPot(x, y - e)) / (2 * e);
        const gl = Math.hypot(gx, gy) + 1e-6; const target = Math.atan2(-gy / gl, -gx / gl);
        let da = target - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; ang += da * 0.35 + (N2(x * 30, y * 30)) * 0.5;
        x += Math.cos(ang) * 0.0065; y += Math.sin(ang) * 0.0065; pts.push([x, y]); if (landPot(x, y) < -0.004) break;
      }
      for (let k = 1; k < pts.length; k++) { const t = k / pts.length; g.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.45 * t) + ')'; g.lineWidth = (0.5 + 0.9 * t) * u; g.beginPath(); const a = toPx(...pts[k - 1]), b = toPx(...pts[k]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    const rd = rgbaOf(cv); for (let i = 0; i < NPX; i++) riverA[i] = rd[i * 4 + 3] / 255;
    // pines: clustered in forests; the thawed ones dark green, the frozen ones laden with snow
    const pT = mk(), pF = mk(); const gT = pT.getContext('2d'), gF = pF.getContext('2d');
    const step = Math.max(2, 2.0 * u); const list = [];
    for (let py = 0; py < H; py += step) for (let px = 0; px < W; px += step) {
      const jx = px + hash2(px | 0, py | 0, 5) * step, jy = py + hash2(px | 0, py | 0, 6) * step; const i = (jy | 0) * W + (jx | 0); if (i >= NPX || !land[i] || SD[i] < 2 * u) continue;
      const wx = (jx - half) / half, wy = (jy - half) / half; const r = Math.hypot(wx, wy);
      const hh2 = hourOf(wx, wy); const westWet = arcIn(hh2, 9.4, 11.3) >= 0;
      const forest = fbm(N5, wx * 6, wy * 6, 3, 2, 0.5) + (r < 0.42 ? 0.18 : r < 0.72 ? -0.02 : (westWet ? -0.12 : -0.7)) - MNT[i] * 0.6;
      if (forest < 0.2 || hash2(px | 0, py | 0, 7) > forest * 1.7) continue;
      list.push([jx, jy, (1.1 + hash2(px | 0, py | 0, 8) * 0.7) * u]);
    }
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of list) {
      // thawed: a dark spire with a lit left edge
      gT.fillStyle = '#26402F'; gT.beginPath(); gT.moveTo(x, y - s * 1.35); gT.lineTo(x + s * 0.62, y + s * 0.5); gT.lineTo(x - s * 0.62, y + s * 0.5); gT.closePath(); gT.fill();
      gT.fillStyle = '#4C6E48'; gT.beginPath(); gT.moveTo(x, y - s * 1.35); gT.lineTo(x - s * 0.62, y + s * 0.5); gT.lineTo(x - s * 0.1, y + s * 0.5); gT.closePath(); gT.fill();
      // frozen: dark needles under white caps
      gF.fillStyle = 'rgba(120,160,196,0.45)'; gF.beginPath(); gF.ellipse(x + s * 0.5, y + s * 0.55, s * 0.75, s * 0.22, 0, 0, TAU); gF.fill();
      gF.fillStyle = '#2C4A4A'; gF.beginPath(); gF.moveTo(x, y - s * 1.35); gF.lineTo(x + s * 0.62, y + s * 0.5); gF.lineTo(x - s * 0.62, y + s * 0.5); gF.closePath(); gF.fill();
      gF.fillStyle = '#FFFFFF'; gF.beginPath(); gF.moveTo(x, y - s * 1.4); gF.lineTo(x + s * 0.36, y - s * 0.3); gF.lineTo(x - s * 0.05, y - s * 0.45); gF.lineTo(x - s * 0.4, y - s * 0.28); gF.closePath(); gF.fill();
      gF.fillStyle = '#EAF3FA'; gF.beginPath(); gF.moveTo(x - s * 0.5, y + s * 0.18); gF.lineTo(x + s * 0.12, y - s * 0.12); gF.lineTo(x + s * 0.58, y + s * 0.3); gF.lineTo(x + s * 0.1, y + s * 0.12); gF.closePath(); gF.fill();
    }
    pineT = rgbaOf(pT); pineF = rgbaOf(pF);
    const peaks = rangePeaks();
    const kT = mk(), kF = mk(); drawPeaks(kT.getContext('2d'), peaks, half, false); drawPeaks(kF.getContext('2d'), peaks, half, true);
    peakT = rgbaOf(kT); peakF = rgbaOf(kF);
  }
  const over = (c, D, i, a = 1) => { const al = D[i * 4 + 3] / 255 * a; if (al <= 0) return; c[0] += (D[i * 4] - c[0]) * al; c[1] += (D[i * 4 + 1] - c[1]) * al; c[2] += (D[i * 4 + 2] - c[2]) * al; };

  // ---- selection outline and the Pack Ice preview
  let SEL = null, SELg = null, SELm = null, PRE = null, PREe = null;
  if (opts.selected != null) {
    SELm = new Float32Array(NPX); for (let i = 0; i < NPX; i++) SELm[i] = (RID[i] === opts.selected && L[i] > -0.03) ? LC[i] : 0;
    SEL = boxBlur(SELm, W, H, Math.max(1, Math.round(0.8 * u)), 2);
    SELg = boxBlur(SELm, W, H, Math.max(2, Math.round(3.2 * u)), 3);
  }
  if (opts.preview === 'packice') {
    const near = boxBlur(FL, W, H, Math.max(3, Math.round(10 * u)), 3);
    const B = new Uint8Array(NPX);
    for (let i = 0; i < NPX; i++) { if (!inD[i] || !sea[i] || iceA[i] > 0.5) continue; const px = i % W, py = (i / W) | 0; const x = (px + 0.5 - half) / half, y = (py + 0.5 - half) / half;
      const v = near[i] * (1 - warmTongue(x, y)) * (1 - nearNarrows(x, y)) + 0.05 * N2(x * 20, y * 20); if (v > 0.07) B[i] = 1; }
    cleanMask(B, sea, W, H, minA);
    PRE = normBlur(B, sea, W, H, feather, 2);
    const Pb = boxBlur(PRE, W, H, Math.max(1, Math.round(2.4 * u)), 2); PREe = Pb;
  }

  // ---- pass 2: colour
  const out = new ImageData(W, H); const D = out.data;
  const tc = [0, 0, 0], fc = [0, 0, 0], sc = [0, 0, 0], ic = [0, 0, 0], col = [0, 0, 0], tmp = [0, 0, 0];
  const lx = -0.55, ly = -0.65, lz = 0.52;
  const relief = 4.6 * (M / 740);
  const csz = state === 'win' ? 12.5 : 13; const cellPx = half / csz; const crackW = 0.75 * u / cellPx;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px; const o = i * 4;
    if (!inD[i]) { D[o + 3] = 0; continue; }
    const x = (px + 0.5 - half) / half, y = (py + 0.5 - half) / half; const r = Math.hypot(x, y); const h = hourOf(x, y);
    const cov = LC[i];
    const glob = clamp(0.5 + 0.55 * (x * 0.55 + y * 0.7), 0, 1);
    const gran = N2(x * 90, y * 90) * 0.5 + N1(x * 210, y * 210) * 0.5;

    // ===== SEA =====
    if (cov < 1) {
      const far = C3[i] * 2, near = C2[i] * 2;
      const n1 = 0.05 * N4(x * 7, y * 7) + 0.03 * N5(x * 30, y * 30);
      // depth bands, painted flat with soft edges
      setc(sc, C.deep);
      mixc(sc, sc, C.sea, 0.35 + 0.65 * smooth(0.04 + n1, 0.2 + n1, far));
      mixc(sc, sc, C.shallow, smooth(0.42 + n1, 0.48 + n1, near) * 0.9);
      mixc(sc, sc, C.shelf, smooth(0.74 + n1, 0.8 + n1, near) * 0.55);
      const wt = warmTongue(x, y) * (0.7 + 0.3 * N3(x * 10 + y * 4, y * 26));
      if (wt > 0) mixc(sc, sc, C.warm, clamp(wt * 1.05, 0, 0.92));
      const dist = Math.max(0, -SD[i]);
      // coastline glow and one engraved contour line offshore
      mixc(sc, sc, [128, 186, 196], smooth(1.6 * u, 0.2 * u, dist) * 0.5);
      const ct = Math.abs(dist - 4.2 * u); mixc(sc, sc, [108, 160, 172], smooth(0.55 * u, 0.1 * u, ct) * 0.22 * (0.6 + 0.4 * N1(x * 20, y * 20)));
      const swell = 1 + 0.03 * N4(x * 40 + y * 10, y * 44 - x * 12) + 0.02 * gran;
      sc[0] *= swell * (1 - glob * 0.14); sc[1] *= swell * (1 - glob * 0.11); sc[2] *= swell * (1 - glob * 0.06);
      // ===== SEA ICE: cracked plates =====
      const ia = iceA[i];
      if (ia > 0.002) {
        const wx2 = x + 0.006 * N3(x * 26, y * 26), wy2 = y + 0.006 * N4(x * 26, y * 26);
        const c1 = cellular(wx2 * csz, wy2 * csz, 21, 0.95); const g1 = c1[1] - c1[0]; const pid = c1[2];
        const crack1 = smooth(crackW * (0.7 + 0.5 * N1(x * 25, y * 25)), 0.0, g1);
        const c2 = cellular(wx2 * csz * 2.4 + 3, wy2 * csz * 2.4, 31, 1.0); const crack2 = smooth(crackW * 1.6, 0.0, c2[1] - c2[0]) * 0.45 * smooth(0.0, 0.4, N2(x * 6, y * 6));
        const tone = (pid - 0.5) * 0.06;
        if (state === 'win') mixc(ic, [194, 215, 234], [218, 232, 245], clamp(0.55 + tone * 6 + 0.18 * fbm(N6, x * 5, y * 5, 3, 2, 0.5) - glob * 0.5, 0, 1));
        else mixc(ic, [208, 225, 239], [228, 238, 247], clamp(0.55 + tone * 6 + 0.18 * fbm(N6, x * 5, y * 5, 3, 2, 0.5) - glob * 0.45, 0, 1));
        // snow dusting on the plates
        mixc(ic, ic, [240, 246, 251], smooth(0.15, 0.55, fbm(N5, x * 7 + 3, y * 7, 3, 2, 0.5)) * 0.45);
        // ice over deep water reads a shade darker
        mixc(ic, ic, [176, 204, 228], smooth(0.5, 0.05, far) * 0.32);
        // a faint bevel on the lit side of each plate
        const bx = (c1[3] / csz - wx2), by2 = (c1[4] / csz - wy2); const facing = clamp((bx * 0.6 + by2 * 0.75) * csz * 1.4, -1, 1);
        mixc(ic, ic, [248, 252, 255], smooth(crackW * 3.5, crackW, g1) * clamp(-facing, 0, 1) * 0.35);
        mixc(ic, ic, C.crack, clamp(crack1 * 0.9 + crack2, 0, 1));
        // the bridge across the Narrows is fresh white ice
        if (BRG[i] > 0) { mixc(ic, ic, [222, 236, 247], BRG[i] * 0.6); mixc(ic, ic, [120, 172, 214], BRG[i] * crack1 * 0.6); }
        // blue shadow along coasts and the land's cast shadow to the lower right
        mixc(ic, ic, [150, 190, 222], smooth(1.6 * u, 0, dist) * 0.5);
        const castI = Math.max(0, i - off * W - off); const cast = clamp(LC[castI] - cov, 0, 1);
        mixc(ic, ic, [132, 170, 206], cast * 0.5);
        const rim = smooth(0.97, 0.75, IEb[i]) * smooth(0.35, 0.6, ia);
        mixc(ic, ic, [252, 254, 255], rim * 0.9);
        mixc(sc, sc, ic, ia);
      }
      if (ia < 0.6) { const halo = smooth(0.0, 0.25, IEb[i]) * (1 - ia); mixc(sc, sc, [16, 40, 56], halo * 0.35); }
    }
    // ===== LAND =====
    if (cov > 0) {
      const hx = (HT[Math.min(i + 1, NPX - 1)] - HT[Math.max(i - 1, 0)]) * relief, hy = (HT[Math.min(i + W, NPX - 1)] - HT[Math.max(i - W, 0)]) * relief;
      const nl = 1 / Math.hypot(hx, hy, 1); const sh = ((-hx * lx - hy * ly + lz) * nl - 0.52) * 1.6;
      // posterised light: shadow, body, light, with brushy edges
      const shn = sh + 0.06 * N3(x * 60, y * 60) + 0.03 * N4(x * 150, y * 150);
      const lv = -1 + smooth(-0.2, -0.12, shn) + smooth(0.14, 0.22, shn);
      const ds = Math.max(0, SD[i]) / u; const mnt = MNT[i];
      const T = r - 0.42 * mnt + 0.05 * fbm(N2, x * 4, y * 4, 3, 2, 0.5);
      const wet = fbm(N3, x * 2.6 + 7, y * 2.6, 3, 2, 0.5) + (arcIn(h, 9.3, 11.4) >= 0 ? 0.38 : 0) + (arcIn(h, 6.2, 7.2) >= 0 ? 0.2 : 0) - (arcIn(h, 7.4, 9.1) >= 0 ? 0.3 : 0) + smooth(10, 0, ds) * 0.15;
      // patches: flat colour shapes with wavy, brushed edges
      const qx = x + 0.022 * N1(x * 8, y * 8) + 0.006 * N2(x * 40, y * 40), qy = y + 0.022 * N2(x * 8 + 5, y * 8) + 0.006 * N3(x * 40, y * 40);
      const hot = T > 0.745 + 0.02 * N4(x * 12, y * 12);
      const cc = cellular(qx * (hot ? 9 : 15), qy * (hot ? 9 : 15), hot ? 51 : 41, 0.9); const pid = cc[2]; const pedge = smooth(0.05, 0.0, cc[1] - cc[0]);
      const ang = pid * Math.PI; const ca = Math.cos(ang), sn = Math.sin(ang); const along = x * ca + y * sn, across = -x * sn + y * ca;
      const brush = 1 + 0.05 * N4(along * 240, across * 24) + 0.03 * N5(along * 70, across * 70);
      // -- thawed painting
      if (T < 0.44) {
        mixc(tc, C.tundra, C.tundraD, pid > 0.5 ? 0.6 : 0.1);
      } else if (!hot) {
        const zone = fbm(N4, qx * 3, qy * 3, 3, 2, 0.5) + 0.2 + 0.05 * (pid - 0.5);
        if (zone > 0.08) {
          const f2 = cellular(qx * 34, qy * 34, 61, 0.85); const fid = f2[2];
          setc(tc, fid < 0.4 ? C.ochre : fid < 0.7 ? C.wheat : fid < 0.88 ? C.sage : C.green);
          const fa = fid * Math.PI; const fu = x * Math.cos(fa) + y * Math.sin(fa);
          const fur = 1 + 0.035 * Math.sin(fu * 900 + fid * 20);
          tc[0] *= fur; tc[1] *= fur; tc[2] *= fur;
          const hedge = smooth(0.07, 0.0, f2[1] - f2[0]) * 0.13; tc[0] *= 1 - hedge; tc[1] *= 1 - hedge * 0.9; tc[2] *= 1 - hedge;
          mixc(tc, tc, C.meadow, smooth(0.14, 0.08, zone) * 0.5);
        } else if (zone > -0.12) mixc(tc, C.meadow, C.green, pid < 0.6 ? 0.15 : 0.6);
        else mixc(tc, C.forest, C.meadow, pid < 0.7 ? 0.0 : 0.3);
        const cold = smooth(0.55, 0.45, T); mixc(tc, tc, C.tundra, cold * 0.6);
      } else {
        const dry = wet + 0.25 * (pid - 0.5);
        if (dry < -0.05) setc(tc, pid < 0.5 ? C.desert : pid < 0.93 ? C.dune : C.rust);
        else if (dry < 0.22) setc(tc, pid < 0.45 ? C.savanna : pid < 0.82 ? C.desert : C.scrub);
        else if (dry < 0.42) setc(tc, pid < 0.5 ? C.scrub : C.jungle);
        else setc(tc, pid < 0.55 ? C.jungle : C.jungleD);
        // long dune strokes on the dry rim
        const dl = smooth(0.9, 0.97, 0.5 + 0.5 * Math.sin((x * 0.6 + y * 0.8) * 170 + 5 * fbm(N1, x * 5, y * 5, 2, 2, 0.5))) * smooth(0.1, -0.15, dry);
        mixc(tc, tc, [240, 214, 166], dl * 0.35);
      }
      tc[0] *= brush; tc[1] *= brush; tc[2] *= brush;
      const pe = pedge * (0.6 + 0.4 * N2(x * 30, y * 30)); tc[0] *= 1 - pe * 0.1; tc[1] *= 1 - pe * 0.1; tc[2] *= 1 - pe * 0.08;
      if (mnt > 0.05) { mixc(tmp, C.slate, C.slateD, clamp(0.4 - lv * 0.4, 0, 1)); if (T > 0.7) mixc(tmp, tmp, [150, 120, 96], 0.5); mixc(tc, tc, tmp, smooth(0.25, 0.7, mnt) * 0.7); }
      if (T > 0.6) mixc(tc, tc, C.sand, smooth(1.4, 0.3, ds) * 0.5);
      // light: lit faces warm, shadow faces cool
      if (lv > 0) { tc[0] *= 1 + 0.09 * lv; tc[1] *= 1 + 0.07 * lv; tc[2] *= 1 + 0.03 * lv; }
      else { mixc(tc, tc, [tc[0] * 0.72, tc[1] * 0.78, tc[2] * 0.92 + 14], -lv * 0.8); }
      over(tc, peakT, i); over(tc, pineT, i, 0.92);
      const lake = smooth(0.565, 0.6, fbm(N6, x * 9 + 2, y * 9, 3, 2, 0.5)) * smooth(4, 8, ds) * (1 - smooth(0.1, 0.3, mnt)) * (T < 0.72 ? 1 : 0);
      mixc(tc, tc, [150, 188, 200], riverA[i] * 0.6);
      if (lake > 0) { mixc(tmp, [40, 86, 98], [132, 178, 188], smooth(0.5, 0.0, lake) * 0.7); mixc(tc, tc, tmp, smooth(0.0, 0.25, lake)); }
      // blue-hour dusk: dimmed but still warm and saturated
      { const lum = tc[0] * 0.3 + tc[1] * 0.59 + tc[2] * 0.11; tc[0] = lum + (tc[0] - lum) * 1.12; tc[1] = lum + (tc[1] - lum) * 1.12; tc[2] = lum + (tc[2] - lum) * 1.12; }
      { const dk = hot ? 0.85 : 0.78; tc[0] = tc[0] * dk + 2; tc[1] = tc[1] * dk + 4; tc[2] = tc[2] * (dk + 0.02) + 13; }
      tc[0] *= 1 - glob * 0.13; tc[1] *= 1 - glob * 0.11; tc[2] *= 1 - glob * 0.05;
      const pool = smooth(1.8, 0.2, ds) * 0.12; tc[0] *= 1 - pool; tc[1] *= 1 - pool; tc[2] *= 1 - pool * 0.6;

      // -- frozen painting: snow over the same relief
      const streak = N3((x * 0.8 - y * 0.6) * 9, (x * 0.6 + y * 0.8) * 70) * 0.5 + N4(x * 25, y * 25) * 0.5;
      const hxs = hx * 2.6, hys = hy * 2.6; const nls = 1 / Math.hypot(hxs, hys, 1); const shs = ((-hxs * lx - hys * ly + lz) * nls - 0.52) * 1.6 + 0.05 * N3(x * 60, y * 60);
      const sdark = clamp(-shs * 1.25 + glob * 0.3 - streak * 0.06 + 0.04, 0, 1.4);
      const slv = smooth(0.16, 0.24, sdark) + smooth(0.62, 0.7, sdark);
      mixc(fc, [255, 255, 255], C.snow, smooth(-0.1, 0.12, sdark));
      mixc(fc, fc, [204, 224, 240], smooth(0.9, 1.1, slv) * 0.85);
      mixc(fc, fc, [166, 202, 230], smooth(1.9, 2.0, slv) * 0.75);
      mixc(fc, fc, [216, 232, 245], clamp(streak, 0, 1) * 0.12);
      over(fc, peakF, i);
      over(fc, pineF, i);
      mixc(fc, fc, [170, 204, 230], riverA[i] * 0.7);
      if (lake > 0) { mixc(tmp, [176, 208, 232], [216, 234, 246], smooth(0.1, 0.4, lake) * (0.6 + 0.4 * N2(x * 50, y * 20))); mixc(fc, fc, tmp, smooth(0.0, 0.2, lake)); }
      // crisp frozen shoreline: a lit lip inside, a blue line at the water
      mixc(fc, fc, [255, 255, 255], smooth(2.4 * u, 1.0 * u, SD[i]) * smooth(0.4 * u, 1.0 * u, SD[i]) * clamp(0.5 - glob, 0, 0.5));
      mixc(fc, fc, [120, 160, 198], smooth(1.0 * u, 0.25 * u, SD[i]) * 0.8);
      fc[0] *= 1 - glob * 0.06; fc[1] *= 1 - glob * 0.04;
      const fg = 1 + gran * 0.015; fc[0] *= fg; fc[1] *= fg; fc[2] *= fg;
      // -- reveal
      const sa = snowA[i];
      const inner = clamp(1 - Math.abs(sa - 0.75) * 4, 0, 1) * (1 - smooth(0.85, 1, sa));
      mixc(fc, fc, C.shadow, inner * 0.55);
      const dust = clamp(SWFb[i] - SWF[i], 0, 1) * 2.2 + clamp(W2[i] - WF[i], 0, 1) * 0.6 * smooth(-0.2, 0.6, N5(x * 50, y * 50));
      mixc(tc, tc, [176, 206, 228], clamp(dust, 0, 1) * 0.55);
      mixc(tmp, tc, fc, sa);
      // region borders: one soft line per region, with a drift ridge on the lit side
      const bd = BRD[i];
      if (bd < 3 * u) {
        const jit = 0.45 + 0.55 * smooth(-0.4, 0.3, N5(x * 16, y * 16));
        const a = smooth(0.75 * u, 0.2 * u, bd) * jit;
        if (sa > 0.5) {
          const ob = Math.round(0.9 * u); const bd2 = BRD[Math.max(0, i - ob * W - ob)];
          mixc(tmp, tmp, [255, 255, 255], smooth(0.75 * u, 0.2 * u, bd2) * (1 - a) * 0.7 * jit);
          mixc(tmp, tmp, [150, 184, 214], a * 0.55);
        } else mixc(tmp, tmp, [44, 40, 32], a * 0.3);
      }
      mixc(col, sc, tmp, cov);
      // ink coastline on thawed shores
      if (snowA[i] < 0.5) mixc(col, col, [24, 34, 38], smooth(0.9 * u, 0.15 * u, Math.abs(SD[i])) * 0.28 * (1 - snowA[i] * 2));
    } else setc(col, sc);
    // shadow lip on the open side of every white edge
    const lipV = clamp((WFb[i] - WF[i]) * 2.4, 0, 1) * (1 - WF[i]);
    if (lipV > 0) mixc(col, col, [170, 208, 232], lipV * 0.32);
    // selection: a soft glowing frost outline
    if (SEL) {
      const inside = SELm[i]; const e = 1 - Math.abs(SEL[i] * 2 - 1); const halo = clamp((SELg[i] - inside) * 2.2, 0, 1);
      if (inside > 0.5) { col[0] = col[0] * 1.05 + 4; col[1] = col[1] * 1.05 + 6; col[2] = col[2] * 1.06 + 10; }
      mixc(col, col, [156, 201, 232], halo * 0.45);
      mixc(col, col, [226, 241, 252], smooth(0.3, 0.85, e) * 0.85);
    }
    // Pack Ice preview: the real frozen-sea texture at half strength, with a bright edge
    if (PRE && PREe[i] > 0.01) {
      const p = PRE[i];
      if (p > 0.01) {
        const wx2 = x + 0.006 * N3(x * 26, y * 26), wy2 = y + 0.006 * N4(x * 26, y * 26);
        const c1 = cellular(wx2 * csz, wy2 * csz, 21, 0.95); const crack1 = smooth(crackW, 0.0, c1[1] - c1[0]);
        mixc(ic, [206, 224, 239], [226, 237, 247], clamp(0.5 + (c1[2] - 0.5) * 0.4 - glob * 0.3, 0, 1)); mixc(ic, ic, C.crack, crack1 * 0.9);
        mixc(col, col, ic, p * 0.5);
      }
      const ring = clamp((PREe[i] - p) * 3, 0, 1); const e = 1 - Math.abs(p * 2 - 1);
      mixc(col, col, [156, 201, 232], ring * 0.5);
      mixc(col, col, [214, 238, 252], smooth(0.35, 0.9, e) * 0.9);
    }
    // graticule, faint and engraved
    const gr = r * 4; const gfr = Math.abs(gr - Math.round(gr)) * half / 4; let grat = gr > 0.5 && gr < 3.9 ? smooth(0.8 * u / 2, 0.15, gfr) : 0;
    const mer = Math.abs(((h + 0.5) % 1) - 0.5) * r * Math.PI / 6 * half; grat = Math.max(grat, r > 0.22 ? smooth(0.8 * u / 2, 0.15, mer) * 0.8 : 0);
    const whiteHere = WF[i] > 0.5;
    mixc(col, col, whiteHere ? [120, 160, 196] : [210, 230, 244], grat * (whiteHere ? 0.08 : 0.05));
    // paper grain and fibres, a soft rim vignette
    const grain = 1 + 0.028 * N4(x * 320, y * 320) + 0.018 * N3(x * 16, y * 150) + 0.012 * N5(x * 140, y * 12) + (hash2(px, py, 1) - 0.5) * 0.03;
    const vig = 1 - smooth(0.8, 1.0, r) * 0.12;
    D[o] = clamp(col[0] * grain * vig, 0, 255); D[o + 1] = clamp(col[1] * grain * vig, 0, 255); D[o + 2] = clamp(col[2] * grain * vig + smooth(0.86, 1, r) * 5, 0, 255);
    D[o + 3] = 255 * clamp((1 - r) * half + 0.5, 0, 1);
  }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').putImageData(out, 0, 0);
  const sample = (x, y) => { const px = clamp(Math.round(x * half + half - 0.5), 0, W - 1), py = clamp(Math.round(y * half + half - 0.5), 0, H - 1); const i = py * W + px;
    return { land: land[i], snow: snowA[i], ice: iceA[i], white: WF[i], l: L[i], rid: RID[i], mnt: MNT[i], cov: LC[i], coast: SD[i] / u, river: riverA[i], bridge: BRG[i] }; };
  let bridge = null;
  { let sx = 0, sy = 0, n = 0; for (let i = 0; i < NPX; i++) if (BRG[i] > 0.5 && iceA[i] > 0.5) { sx += i % W; sy += (i / W) | 0; n++; }
    if (n) { const cx = (sx / n + 0.5 - half) / half, cy = (sy / n + 0.5 - half) / half; const rr = Math.hypot(cx, cy); const tx = -cy / rr, ty = cx / rr; // tangent, clockwise
      let lo = 0, hi = 0; for (let i = 0; i < NPX; i++) if (BRG[i] > 0.5 && iceA[i] > 0.5) { const x = ((i % W) + 0.5 - half) / half - cx, y = (((i / W) | 0) + 0.5 - half) / half - cy; const t = x * tx + y * ty; if (t < lo) lo = t; if (t > hi) hi = t; }
      const mc = document.createElement('canvas'); mc.width = W; mc.height = H; const mg = mc.getContext('2d'); const md = mg.createImageData(W, H);
      for (let i = 0; i < NPX; i++) { const a = BRG[i] * iceA[i]; if (a > 0.01) { md.data[i * 4] = 255; md.data[i * 4 + 1] = 255; md.data[i * 4 + 2] = 255; md.data[i * 4 + 3] = a * 255; } }
      mg.putImageData(md, 0, 0);
      bridge = { x: cx, y: cy, tx, ty, lo, hi, mask: mc }; } }
  return { canvas: cv, M, regions, land, L, RID, W, H, sample, u, bridge };
}

window.NS = { paintWorld, polar, hourOf, mulberry32, hash2, fbm, N1, N2, N3, N4, N5, N6, clamp, smooth, mix, landPot, ISLES, buildRegions, cellular, HEART_NAMES };
})();
