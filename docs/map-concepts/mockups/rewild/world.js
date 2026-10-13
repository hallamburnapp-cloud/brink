// REWILD — the painted world. One fixed seed, one planet, painted twice.
// All geography is defined in "P-space": phone CSS px of the main screen, where the
// world spans x10–380, y178–690. A view maps P-space onto any canvas.
(function (G) {
'use strict';
const OX = 10, OY = 178, WW = 370, WH = 512;

// ---------- noise ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeSimplex(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = perm[i] % 12; }
  const g = [1,1,-1,1,1,-1,-1,-1,1,0,-1,0,1,0,-1,0,0,1,0,-1,0,1,0,-1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function (x, y) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { const k = pm[ii + perm[jj]] * 2; t0 *= t0; n0 = t0 * t0 * (g[k] * x0 + g[k + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { const k = pm[ii + i1 + perm[jj + j1]] * 2; t1 *= t1; n1 = t1 * t1 * (g[k] * x1 + g[k + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { const k = pm[ii + 1 + perm[jj + 1]] * 2; t2 *= t2; n2 = t2 * t2 * (g[k] * x2 + g[k + 1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}
const N = []; for (let i = 0; i < 16; i++) N.push(makeSimplex(4207 + i * 97));
function fbm(n, x, y, oct) { let a = 1, f = 1, s = 0, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2.03; } return s / t; }
function ridged(n, x, y, oct) { let a = 0.6, f = 1, s = 0, w = 1; for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(n(x * f, y * f)); v *= v; v *= w; w = Math.min(1, Math.max(0, v * 1.8)); s += v * a; a *= 0.5; f *= 2.1; } return s; }
function hash2(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1013904223)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = (a, b, v) => { let t = (v - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

let WF1 = 0, WDX = 0, WDY = 0, WH1 = 0, WH2 = 0;
function worley(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y); let best = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j;
    const fx = cx + 0.12 + 0.76 * hash2(cx, cy, seed), fy = cy + 0.12 + 0.76 * hash2(cx, cy, seed + 17);
    const dx = x - fx, dy = y - fy, d = dx * dx + dy * dy;
    if (d < best) { best = d; WDX = dx; WDY = dy; WH1 = hash2(cx, cy, seed + 31); WH2 = hash2(cx, cy, seed + 57); }
  }
  WF1 = Math.sqrt(best);
}

// ---------- geography (P-space) ----------
// caps: [ax, ay, bx, by, radius] capsules unioned with a smooth min; a 6th value of -1 marks a bay cut out of the land
const CONT = [
  { key: 'NR', label: 'THE NORTH REACH', caps: [[62,224,150,207,18],[150,207,240,213,22],[240,213,318,227,17],[110,232,184,236,12],[298,230,332,246,9],[122,200,166,192,11],[178,193,212,200,11],[224,199,252,194,9],[36,206,40,208,4],[24,216,26,217,3],[346,208,350,210,4],[362,219,363,220,3],
    [170,184,171,186,7,-1],[262,200,266,203,6,-1],[96,198,98,200,6,-1]] },
  { key: 'OH', label: 'THE OLD HEART', caps: [[60,302,126,284,30],[126,284,176,300,26],[70,346,148,352,27],[176,308,190,350,22],[116,268,158,262,11],[36,328,44,350,15],[54,370,48,388,11],[96,318,150,322,17],[212,300,214,302,4],[226,312,227,313,3],[14,372,15,373,3],
    [17,312,20,314,10,-1],[124,392,128,394,12,-1],[88,260,90,261,8,-1],[198,330,199,331,6,-1]] },
  { key: 'LC', label: 'THE LONG COAST', caps: [[298,280,334,318,22],[332,318,322,398,27],[322,398,334,478,30],[334,478,316,552,29],[316,552,298,578,15],[290,300,286,312,11],[350,350,357,420,17],[300,470,296,520,14],[374,470,375,472,3],[372,500,373,501,2.5],
    [300,430,302,432,7,-1]] },
  { key: 'DB', label: 'THE DRY BELT', caps: [[52,432,240,436,25],[90,456,205,460,17],[140,414,214,416,13],[240,436,256,446,13],[118,478,121,480,9,-1]] },
  { key: 'GI', label: 'THE GLASS ISLES', caps: [[22,497,50,503,10.5],[92,494,102,498,7],[42,538,72,556,12.5],[116,543,120,550,6],[90,584,98,588,6.5],[16,566,17,567,3],[132,600,133,601,2.5],[70,520,71,521,2.5]] },
  { key: 'SH', label: 'THE SOUTHERN HOOK', caps: [[336,597,262,616,21],[262,616,180,642,23],[180,642,146,660,18],[146,660,160,682,14],[160,682,214,686,8],[354,640,356,641,4],[366,652,367,653,3]] },
];
for (const C of CONT) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  C.bays = C.caps.filter(c => c[5] === -1); C.caps = C.caps.filter(c => c[5] !== -1);
  for (const c of C.caps) { x0 = Math.min(x0, c[0] - c[4], c[2] - c[4]); x1 = Math.max(x1, c[0] + c[4], c[2] + c[4]); y0 = Math.min(y0, c[1] - c[4], c[3] - c[4]); y1 = Math.max(y1, c[1] + c[4], c[3] + c[4]); }
  Object.assign(C, { x0, y0, x1, y1 });
}
// 42 regions, each with one city. wealth: r rich / p poor. sprawl radius in P units.
const REG = [
  // North Reach (0-3)
  { c: 0, x: 88, y: 221, sp: 6, name: 'Ellisk', w: 'p' },
  { c: 0, x: 160, y: 207, sp: 6, name: 'Hollin', w: 'p' },
  { c: 0, x: 226, y: 216, sp: 7, name: 'Vell', w: 'p' },
  { c: 0, x: 298, y: 230, sp: 6, name: 'Skarra', w: 'p' },
  // Old Heart (4-11)
  { c: 1, x: 55, y: 292, sp: 12, name: 'Corve', w: 'r' },
  { c: 1, x: 121, y: 281, sp: 14, name: 'Thrale', w: 'r' },
  { c: 1, x: 181, y: 302, sp: 13, name: 'Ostery', w: 'r' },
  { c: 1, x: 102, y: 324, sp: 17, name: 'Tarrowin', w: 'r' },
  { c: 1, x: 158, y: 350, sp: 13, name: 'Haldane', w: 'r' },
  { c: 1, x: 33, y: 336, sp: 9, name: 'Wennet', w: 'r' },
  { c: 1, x: 98, y: 363, sp: 10, name: 'Pellow', w: 'r' },
  { c: 1, x: 54, y: 383, sp: 8, name: 'Sefi', w: 'p' },
  // Long Coast (12-22)
  { c: 2, x: 301, y: 281, sp: 12, name: 'Quayle', w: 'r' },
  { c: 2, x: 344, y: 313, sp: 12, name: 'Marrish', w: 'r' },
  { c: 2, x: 303, y: 339, sp: 11, name: 'Ardent', w: 'r' },
  { c: 2, x: 341, y: 366, sp: 11, name: 'Lowsea', w: 'r' },
  { c: 2, x: 305, y: 393, sp: 10, name: 'Kesterby', w: 'r' },
  { c: 2, x: 347, y: 421, sp: 10, name: 'Dunmere', w: 'r' },
  { c: 2, x: 311, y: 449, sp: 10, name: 'Tolley', w: 'r' },
  { c: 2, x: 349, y: 476, sp: 9, name: 'Fennick', w: 'r' },
  { c: 2, x: 318, y: 503, sp: 10, name: 'Brannoch', w: 'r' },
  { c: 2, x: 336, y: 535, sp: 9, name: 'Rookhaven', w: 'r' },
  { c: 2, x: 306, y: 563, sp: 8, name: 'Ebbing', w: 'r' },
  // Dry Belt (23-27)
  { c: 3, x: 62, y: 434, sp: 6, name: 'Sorrel', w: 'p' },
  { c: 3, x: 102, y: 452, sp: 6, name: 'Ashkar', w: 'p' },
  { c: 3, x: 140, y: 424, sp: 7, name: 'Durra', w: 'p' },
  { c: 3, x: 178, y: 452, sp: 6, name: 'Pelt', w: 'p' },
  { c: 3, x: 216, y: 431, sp: 6, name: 'Qessa', w: 'p' },
  // Glass Isles (28-32)
  { c: 4, x: 39, y: 506, sp: 5, name: 'Glimmer', w: 'p' },
  { c: 4, x: 97, y: 498, sp: 4, name: 'Thessaly Rock', w: 'p' },
  { c: 4, x: 63, y: 545, sp: 5, name: 'Merrin', w: 'p' },
  { c: 4, x: 118, y: 547, sp: 4, name: 'Tallis', w: 'p' },
  { c: 4, x: 94, y: 586, sp: 5, name: 'Lune', w: 'p' },
  // Southern Hook (33-41)
  { c: 5, x: 326, y: 598, sp: 8, name: 'Barrowby', w: 'r' },
  { c: 5, x: 295, y: 609, sp: 8, name: 'Wickham', w: 'r' },
  { c: 5, x: 262, y: 620, sp: 9, name: 'Brand', w: 'r' },
  { c: 5, x: 229, y: 629, sp: 8, name: 'Ollery', w: 'r' },
  { c: 5, x: 197, y: 638, sp: 8, name: 'Cask', w: 'p' },
  { c: 5, x: 165, y: 648, sp: 7, name: 'Hobb', w: 'p' },
  { c: 5, x: 145, y: 667, sp: 6, name: 'Furrow', w: 'p' },
  { c: 5, x: 165, y: 683, sp: 5, name: 'Rime', w: 'p' },
  { c: 5, x: 201, y: 686, sp: 5, name: 'Last Light', w: 'p' },
];
REG.forEach((r, i) => { r.i = i; r.ang = (hash2(i, 3, 9) - 0.5) * 1.2; });
const BYC = CONT.map((_, c) => REG.filter(r => r.c === c));
// Glass Isles: each capsule (island) belongs to the nearest of the five island cities
const GIMAP = CONT[4].caps.map(cp => { const mx = (cp[0] + cp[2]) / 2, my = (cp[1] + cp[3]) / 2; let b = 1e9, bi = -1; for (const R of BYC[4]) { const d = Math.hypot(R.x - mx, R.y - my); if (d < b) { b = d; bi = R.i; } } return bi; });
const RIDGES = [[110,205,280,215,18],[60,286,150,277,14],[330,300,330,560,13],[150,670,205,686,10],[180,318,192,360,10]];
const RIVER_SRC = [[150,203],[262,216],[86,226],[80,292],[132,284],[152,302],[58,327],[186,334],[330,298],[336,380],[340,430],[331,470],[326,522],[150,430],[300,604],[242,624],[178,646],[118,350]];

function sdCap(x, y, c) {
  const ax = c[0], ay = c[1], bx = c[2] - ax, by = c[3] - ay, px = x - ax, py = y - ay;
  const h = clamp((px * bx + py * by) / (bx * bx + by * by + 1e-6), 0, 1);
  const dx = px - bx * h, dy = py - by * h; return Math.sqrt(dx * dx + dy * dy) - c[4];
}
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }

let F_C = -1, F_WX = 0, F_WY = 0, F_DS = 50, F_CAP = -1;
function landField(px, py) {
  const wx = px + 12 * fbm(N[0], px / 80, py / 80, 4);
  const wy = py + 12 * fbm(N[1], px / 80 + 3.1, py / 80 - 1.7, 4);
  let best = 1e9, bc = -1;
  for (let c = 0; c < CONT.length; c++) {
    const C = CONT[c];
    if (wx < C.x0 - 50 || wx > C.x1 + 50 || wy < C.y0 - 50 || wy > C.y1 + 50) continue;
    let d = 1e9, cd = 1e9, ci = -1; for (let q = 0; q < C.caps.length; q++) { const v = sdCap(wx, wy, C.caps[q]); if (v < cd) { cd = v; ci = q; } d = smin(d, v, 9); }
    for (const bp of C.bays) d = -smin(-d, sdCap(wx, wy, bp), 7);
    if (d < best) { best = d; bc = c; F_CAP = ci; }
  }
  F_C = bc; F_WX = wx; F_WY = wy;
  if (bc < 0) { F_DS = 50; return 50; }
  F_DS = best + 7.5 * fbm(N[2], wx / 32, wy / 32, 2);
  return best + 7.5 * fbm(N[2], wx / 32, wy / 32, 5) + 1.4 * N[3](wx / 6, wy / 6);
}

// ---------- the painter ----------
const C_ = {};
['#6F8790','#7F96A0','#8A8F86','#B9A98A','#5C5F63','#D9C9A3','#3E9B5F','#2F7D4F','#8FD694','#5FF2C8','#F2B33D','#FFE9A8','#EDE6D6','#A0522D','#0B1220','#F4EFE4','#22302A'].forEach(h => C_[h] = hex(h));
const PAL = {
  sea: hex('#6F8790'), seaDeep: hex('#6A8390'), seaNear: hex('#7690997'.slice(0,7)), shallow: hex('#89A7AA'), glow: hex('#E4EBE3'), wave: hex('#9BB0B7'),
  snow: hex('#E4E7E2'), ice: hex('#CDD6D8'), rock: hex('#A2A69F'), gpine: hex('#5E6863'), gpineL: hex('#88918B'), pineSh: hex('#AEB9BE'),
  conc: hex('#8A8F86'), concL: hex('#979B92'), concD: hex('#7C8179'), sprawl: hex('#5C5F63'), street: hex('#73777A'),
  och: [hex('#B9A98A'), hex('#AE9F81'), hex('#C3B493'), hex('#A6A288'), hex('#B2A27C'), hex('#9F9A86')], hedge: hex('#8E8A76'),
  sand: hex('#D9C9A3'), sandL: hex('#E4D7B6'), sandD: hex('#C7B48C'), salt: hex('#E9E1CB'),
  dullW: hex('#979B8B'), dullW2: hex('#8C907F'),
  // green world
  gap: hex('#1D4C33'), forD: hex('#2A6F46'), forest: hex('#2F7D4F'), canopy: hex('#3E9B5F'), canL: hex('#6DB46F'), leaf: hex('#8FD694'), moss: hex('#79AD5E'),
  pine: hex('#1F4A36'), pineL: hex('#3F7A57'), snowG: hex('#E6EDE8'), lichen: hex('#9DBB8A'), mossG: hex('#7FA866'), pineGSh: hex('#5E8A62'),
  cactus: hex('#5E9A57'), cactusL: hex('#8CBF6F'), scrub: hex('#B9C484'),
  wet: hex('#3A9468'), wetL: hex('#5DB386'), pool: hex('#4E8A80'), poolL: hex('#73AA9C'),
  mead: [hex('#7DB463'), hex('#94C46C'), hex('#69A85A'), hex('#A9CB78'), hex('#86BA66'), hex('#D9CF8E')],
  forGap: hex('#1C4631'), forDeep: hex('#245F3E'), forHi: hex('#4C8E5E'), mossD: hex('#3D7448'), mossM: hex('#5E8F55'), mossL: hex('#86AE6C'),
  savA: hex('#6E9250'), savB: hex('#97A65E'), cacD: hex('#355E36'),
  blossom: hex('#F6D9E1'), blossom2: hex('#FFF1C9'), lane: hex('#5BA06E'), hedgeG: hex('#B5D68C'), hedgeT: hex('#5E9A52'),
};

function paintWorld(cfg) {
  const t0 = performance.now();
  const cv = cfg.canvas, dpr = cfg.dpr, s = cfg.s, ox = cfg.ox, oy = cfg.oy;
  const Wd = cv.width, Hd = cv.height, NP = Wd * Hd;
  const pxs = 1 / (dpr * s); // P units per device px
  const st = cfg.state;
  const turned = new Uint8Array(REG.length); (st.turned || []).forEach(i => turned[i] = 1);
  const creepW = new Float32Array(REG.length); REG.forEach((r, i) => creepW[i] = (st.creep && st.creep[i]) || 10);
  const blobs = st.blobs || [];
  const cutAt = new Float32Array(REG.length).fill(-1); if (st.fringe) for (const k in st.fringe) cutAt[k] = st.fringe[k];
  const R2 = new Int16Array(NP).fill(-1);
  const D = new Float32Array(NP), DS = new Float32Array(NP), RG = new Int16Array(NP).fill(-1), BD = new Float32Array(NP), HT = new Float32Array(NP);
  const DIST = new Float32Array(NP), FF = new Float32Array(NP), RV = new Float32Array(NP), RIM = new Float32Array(NP), STB = new Float32Array(NP), OVR = new Float32Array(NP);
  const CN = new Int8Array(NP).fill(-1), CUTF = new Float32Array(NP);
  const greyBuf = new Uint8ClampedArray(NP * 4), greenBuf = new Uint8ClampedArray(NP * 4);
  const adj = new Set();
  const col = [0, 0, 0], tmp = [0, 0, 0];
  const PX = new Float32Array(Wd), PY = new Float32Array(Hd);
  for (let i = 0; i < Wd; i++) PX[i] = OX + ((i + 0.5) / dpr - ox) / s;
  for (let j = 0; j < Hd; j++) PY[j] = OY + ((j + 0.5) / dpr - oy) / s;

  // pass 1: land field, regions, height
  for (let j = 0; j < Hd; j++) {
    const py = PY[j];
    for (let i = 0; i < Wd; i++) {
      const k = j * Wd + i, px = PX[i];
      const d = landField(px, py); D[k] = d; DS[k] = F_DS;
      if (d > 2.5 || F_C < 0) continue;
      const wx = F_WX, wy = F_WY;
      const rx = wx + 3.2 * N[4](wx / 13, wy / 13) + 1.0 * N[5](wx / 4, wy / 4), ry = wy + 3.2 * N[6](wx / 13, wy / 13) + 1.0 * N[7](wx / 4, wy / 4);
      let d1 = 1e9, d2 = 1e9, r1 = -1, r2 = -1;
      const list = BYC[F_C];
      for (let q = 0; q < list.length; q++) { const R = list[q]; const dx = rx - R.x, dy = ry - R.y, dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; r2 = r1; d1 = dd; r1 = R.i; } else if (dd < d2) { d2 = dd; r2 = R.i; } }
      let bd = 99;
      if (F_C === 4) { r1 = GIMAP[F_CAP]; r2 = -1; } // each of the Glass Isles is one region
      if (r2 >= 0) { const A = REG[r1], B = REG[r2]; const sep = Math.hypot(A.x - B.x, A.y - B.y); bd = (d2 - d1) / (2 * sep); if (bd < 0.7 && d < 0) adj.add(Math.min(r1, r2) * 100 + Math.max(r1, r2)); }
      RG[k] = r1; R2[k] = r2; BD[k] = bd; CN[k] = F_C;
      let h = sstep(0, 30, -d) * 0.45 + 0.12 * fbm(N[8], wx / 22, wy / 22, 3);
      for (const rd of RIDGES) { const m = sstep(rd[4], 0, sdCap(wx, wy, [rd[0], rd[1], rd[2], rd[3], 0])); if (m > 0) h += m * 0.6 * ridged(N[9], wx / 19, wy / 19, 3); }
      HT[k] = h;
    }
  }
  // distance (device px) from land you have turned, travelling over land of the same continent only
  const INF = 1e9, SQ = Math.SQRT2;
  for (let k = 0; k < NP; k++) DIST[k] = (RG[k] >= 0 && turned[RG[k]]) ? 0 : INF;
  for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) {
    const k = j * Wd + i, c = CN[k]; if (c < 0 || DIST[k] === 0) continue; let v = DIST[k];
    if (i > 0 && CN[k - 1] === c) v = Math.min(v, DIST[k - 1] + 1);
    if (j > 0) { const u = k - Wd; if (CN[u] === c) v = Math.min(v, DIST[u] + 1); if (i > 0 && CN[u - 1] === c) v = Math.min(v, DIST[u - 1] + SQ); if (i < Wd - 1 && CN[u + 1] === c) v = Math.min(v, DIST[u + 1] + SQ); }
    DIST[k] = v;
  }
  for (let j = Hd - 1; j >= 0; j--) for (let i = Wd - 1; i >= 0; i--) {
    const k = j * Wd + i, c = CN[k]; if (c < 0 || DIST[k] === 0) continue; let v = DIST[k];
    if (i < Wd - 1 && CN[k + 1] === c) v = Math.min(v, DIST[k + 1] + 1);
    if (j < Hd - 1) { const u = k + Wd; if (CN[u] === c) v = Math.min(v, DIST[u] + 1); if (i < Wd - 1 && CN[u + 1] === c) v = Math.min(v, DIST[u + 1] + SQ); if (i > 0 && CN[u - 1] === c) v = Math.min(v, DIST[u - 1] + SQ); }
    DIST[k] = v;
  }
  // how green each spot wants to be, compared with one leafy noise texture
  for (let j = 0; j < Hd; j++) {
    const py = PY[j];
    for (let i = 0; i < Wd; i++) {
      const k = j * Wd + i, r = RG[k]; if (r < 0) continue; const px = PX[i];
      let g = 1, gp = 0;
      if (!turned[r]) {
        const dP = DIST[k] * pxs;
        g = dP < 1e6 ? clamp(1 - dP / creepW[r], 0, 1) : 0;
        gp = dP < 1e6 ? clamp(1 - dP / (creepW[r] * 1.6 + 4), 0, 1) : 0;
        g = g * g * (3 - 2 * g) * 0.35 + g * 0.65;
        for (const b of blobs) { const db = Math.hypot(px - b[0], py - b[1]); g = Math.max(g, clamp(1 - db / b[2], 0, 1)); gp = Math.max(gp, clamp(1 - db / (b[2] * 1.9), 0, 1)); }
        if (cutAt[r] >= 0) OVR[k] = (dP < 1e6 ? dP : 99) - (cutAt[r] + 1.8 * N[3](px / 9, py / 9) + 1.1 * N[15](px / 1.5, py / 1.5) + 0.9 * sstep(0.15, 0.55, N[14](px / 0.85, py / 0.85)));
      }
      const n01 = 0.5 + 1.5 * fbm(N[10], px / 12, py / 12, 4) + 0.08 * N[15](px / 2.2, py / 2.2);
      let F = turned[r] ? 1.5 : lerp(1.32 * g - Math.min(n01, 1.2) - (1 - sstep(0, 0.18, g)) * 0.7, 1.5, sstep(0.88, 1.0, g));
      if (!turned[r] && gp > 0) { // scattered patches lead the front, as seed blown ahead
        const pn = fbm(N[12], px / 4.2 + 11, py / 4.2, 3) + 0.25 * N[15](px / 1.4, py / 1.4);
        F = Math.max(F, (pn - (0.5 - 0.42 * gp)) * 5);
      }
      if (cutAt[r] >= 0 && !turned[r]) {
        const over = OVR[k];
        if (over > -0.5) F = Math.min(F, -over * 0.14);
        const band = 7 + 1.6 * N[2](px / 7, py / 7);
        STB[k] = sstep(-0.35, 0.35, over) * (1 - sstep(band - 1.6, band + 1.6, over));
      }
      FF[k] = F;
    }
  }
  const fe = 0.95 * dpr, rimW = 2.9 * dpr;
  for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) {
    const k = j * Wd + i; if (RG[k] < 0) continue;
    const f0 = FF[k];
    const fl = i > 0 && RG[k - 1] >= 0 ? FF[k - 1] : f0, fr = i < Wd - 1 && RG[k + 1] >= 0 ? FF[k + 1] : f0;
    const fu = j > 0 && RG[k - Wd] >= 0 ? FF[k - Wd] : f0, fd = j < Hd - 1 && RG[k + Wd] >= 0 ? FF[k + Wd] : f0;
    const gm = Math.hypot((fr - fl) * 0.5, (fd - fu) * 0.5) + 1e-5;
    const sd = f0 / gm;
    const rv = sstep(-fe, fe, sd);
    RV[k] = rv; RIM[k] = rv * (1 - sstep(0, rimW, sd));
    if (cutAt[RG[k]] >= 0 && !turned[RG[k]]) { const cut = 1 - sstep(1.2, 3.2, -OVR[k]); RIM[k] *= 1 - cut; CUTF[k] = cut * rv; }
  }

  // pass 2: the two paintings
  for (let j = 0; j < Hd; j++) {
    const py = PY[j];
    for (let i = 0; i < Wd; i++) {
      const k = j * Wd + i; const r = RG[k]; if (r < 0) continue;
      const px = PX[i];
      const R = REG[r], c = R.c, rv = RV[k], h = HT[k];
      const nn = N[12](px / 25, py / 25);
      let b1 = 1, b2 = 1, bt = 0;
      if (c === 0) { b1 = b2 = 0; }
      else if (c === 1) { b1 = b2 = 1; }
      else if (c === 2) { b1 = 1; b2 = 3; bt = sstep(398, 452, py + nn * 16); }
      else if (c === 3) { b1 = b2 = 2; }
      else if (c === 4) { b1 = b2 = 3; }
      else { b1 = 4; b2 = 0; bt = sstep(664, 678, py + nn * 7 - (px - 160) * 0.06); }
      cityAt(px, py, R);
      if (rv < 0.999) {
        greyPaint(b1, px, py, h, R, col);
        if (bt > 0.001) { greyPaint(b2, px, py, h, R, tmp); mix3(col, tmp, bt); }
        if (CFM > 0) cityGrey(col);
        put(greyBuf, k, col);
      }
      if (rv > 0.001) {
        greenPaint(b1, px, py, h, R, col);
        if (bt > 0.001) { greenPaint(b2, px, py, h, R, tmp); mix3(col, tmp, bt); }
        if (CFM > 0) cityGreen(col, px, py);
        put(greenBuf, k, col);
      }
    }
  }
  // pass 3: composite
  const out = new ImageData(Wd, Hd); const O = out.data;
  const ink = 0.3, INK = C_['#22302A'], LEAF = PAL.leaf;
  const SEA = cfg.sea || {}; const seaNear = SEA.near || PAL.seaNear, seaDeep = SEA.deep || PAL.seaDeep, waveC = SEA.wave || PAL.wave, shallowC = SEA.shallow || PAL.shallow;
  const borderA = cfg.borders === undefined ? 1 : cfg.borders;
  for (let j = 0; j < Hd; j++) {
    const py = PY[j];
    for (let i = 0; i < Wd; i++) {
      const k = j * Wd + i, k4 = k * 4;
      const px = PX[i];
      const d = D[k];
      const sv = fbm(N[13], px / 70, py / 70, 4);
      const dt = sstep(3, 40, d);
      let sr = lerp(seaNear[0], seaDeep[0], dt), sg = lerp(seaNear[1], seaDeep[1], dt), sb = lerp(seaNear[2], seaDeep[2], dt);
      const vm = 1 + sv * 0.05; sr *= vm; sg *= vm; sb *= vm;
      if (d > 0) {
        const sh = Math.pow(clamp(1 - d / 6, 0, 1), 1.5) * 0.5;
        sr = lerp(sr, shallowC[0], sh); sg = lerp(sg, shallowC[1], sh); sb = lerp(sb, shallowC[2], sh);
        const ds = Math.max(DS[k], d * 0.5), lw = 0.3 + pxs * 0.75;
        const e1 = (1 - sstep(lw * 0.35, lw, Math.abs(ds - 5.0))) * sstep(2.5, 4, d);
        const e2 = (1 - sstep(lw * 0.35, lw, Math.abs(ds - 9.5))) * sstep(5, 7, d);
        const e3 = (1 - sstep(lw * 0.35, lw, Math.abs(ds - 15))) * sstep(-0.3, 0.2, N[14](px / 25, py / 25)) * sstep(9, 11, d);
        const e = e1 * 0.55 + e2 * 0.34 + e3 * 0.2;
        sr = lerp(sr, waveC[0], e); sg = lerp(sg, waveC[1], e); sb = lerp(sb, waveC[2], e);
        const cg = Math.pow(clamp(1 - d / 1.6, 0, 1), 1.2) * 0.7;
        sr = lerp(sr, PAL.glow[0], cg); sg = lerp(sg, PAL.glow[1], cg); sb = lerp(sb, PAL.glow[2], cg);
      }
      let fr = sr, fg = sg, fb = sb;
      const la = sstep(pxs * 0.7, -pxs * 0.7, d);
      const r = RG[k];
      if (la > 0 && r >= 0) {
        const kl = i > 0 ? k - 1 : k, kr = i < Wd - 1 ? k + 1 : k, ku = j > 0 ? k - Wd : k, kd = j < Hd - 1 ? k + Wd : k;
        const hl = RG[kl] >= 0 ? HT[kl] : HT[k], hr = RG[kr] >= 0 ? HT[kr] : HT[k], hu = RG[ku] >= 0 ? HT[ku] : HT[k], hd = RG[kd] >= 0 ? HT[kd] : HT[k];
        const dhx = (hr - hl) / (2 * pxs), dhy = (hd - hu) / (2 * pxs);
        const shade = 1 + clamp((dhx + dhy) * 2.1, -0.4, 0.4) + (HT[k] - 0.3) * 0.12;
        const rv = RV[k];
        const gr = greyBuf[k4] / 255, gg = greyBuf[k4 + 1] / 255, gb = greyBuf[k4 + 2] / 255;
        const er = greenBuf[k4] / 255, eg = greenBuf[k4 + 1] / 255, eb = greenBuf[k4 + 2] / 255;
        let lr = lerp(gr, er, rv), lg = lerp(gg, eg, rv), lb = lerp(gb, eb, rv);
        // new growth: a lighter leafy rim just inside every living green edge
        const rim = RIM[k];
        if (rim > 0) { const t = rim * 0.55; lr = lerp(lr, LEAF[0], t); lg = lerp(lg, LEAF[1], t); lb = lerp(lb, LEAF[2], t); }
        // where the crews have cut it, the green ends in a dark cut face
        const cf = CUTF[k]; if (cf > 0) { const t = cf * 0.32; lr *= 1 - t; lg *= 1 - t * 0.8; lb *= 1 - t * 0.85; }
        // the mowing crews: grey cut stubble in mown rows, biting into the green
        const sb_ = STB[k] * (1 - rv);
        if (sb_ > 0) {
          const ov = OVR[k];
          const stripe = sstep(-0.35, 0.35, Math.sin(ov * 1.7 + N[5](px / 5, py / 5) * 0.5));
          let mr = lerp(0.47, 0.56, stripe), mg = lerp(0.50, 0.585, stripe), mb = lerp(0.46, 0.52, stripe);
          const fl = sstep(0.35, 0.75, N[9](px / 0.55, py / 1.5)); mr *= 1 - fl * 0.16; mg *= 1 - fl * 0.15; mb *= 1 - fl * 0.14;
          const tuft = sstep(0.55, 0.8, N[7](px / 1.1, py / 1.1)) * (1 - sstep(0, 3.5, ov));
          mr = lerp(mr, 0.27, tuft * 0.6); mg = lerp(mg, 0.42, tuft * 0.6); mb = lerp(mb, 0.29, tuft * 0.6);
          lr = lerp(lr, mr, sb_); lg = lerp(lg, mg, sb_); lb = lerp(lb, mb, sb_);
        }
        lr *= shade; lg *= shade; lb *= shade;
        // region borders: a 1 pt hand-inked line, fainter where the green paint has taken over
        const bd = BD[k], hw = (0.6 + 0.14 * N[6](px / 5, py / 5)) / s;
        const pen = 0.72 + 0.4 * (0.5 + 0.5 * N[3](px / 6, py / 6));
        const bl = (1 - sstep(hw, hw + pxs * 1.0, bd)) * pen;
        const bh = borderA * (sstep(hw, hw + pxs, bd) * (1 - sstep(hw + 1.1 / s, hw + 2.2 / s, bd))) * lerp(0.16, 0.06, rv);
        lr = lerp(lr, 0.97, bh); lg = lerp(lg, 0.95, bh); lb = lerp(lb, 0.9, bh);
        const ba = borderA * bl * lerp(0.55, 0.26, rv);
        lr = lerp(lr, INK[0], ba); lg = lerp(lg, INK[1], ba); lb = lerp(lb, INK[2], ba);
        // coast ink line
        const ci = 1 - sstep(0.35, 0.35 + 0.9 + pxs, -d);
        lr *= 1 - ci * ink; lg *= 1 - ci * ink; lb *= 1 - ci * ink;
        fr = lerp(sr, lr, la); fg = lerp(sg, lg, la); fb = lerp(sb, lb, la);
      }
      const gn = (hash2(i, j, 77) - 0.5) * 0.045 + fbm(N[11], px / 2.2, py / 2.2, 2) * 0.03 + N[14](px / 14, py / 14) * 0.018;
      fr *= 1 + gn; fg *= 1 + gn; fb *= 1 + gn;
      O[k4] = fr * 255; O[k4 + 1] = fg * 255; O[k4 + 2] = fb * 255; O[k4 + 3] = 255;
    }
  }
  const ctx = cv.getContext('2d');
  ctx.putImageData(out, 0, 0);
  const info = { D, RG, R2, RV, RIM, BD, HT, Wd, Hd, dpr, s, ox, oy, adj, ms: performance.now() - t0 };
  info.toCss = (px, py) => [ox + (px - OX) * s, oy + (py - OY) * s];
  info.toP = (x, y) => [OX + (x - ox) / s, OY + (y - oy) / s];
  info.sample = (px, py) => { const i = Math.round((ox + (px - OX) * s) * dpr), j = Math.round((oy + (py - OY) * s) * dpr); if (i < 0 || j < 0 || i >= Wd || j >= Hd) return { d: 50, rv: 0, r: -1 }; const k = j * Wd + i; return { d: D[k], rv: RV[k], r: RG[k] }; };
  return info;
}
function put(buf, k, c) { buf[k * 4] = c[0] * 255; buf[k * 4 + 1] = c[1] * 255; buf[k * 4 + 2] = c[2] * 255; buf[k * 4 + 3] = 255; }
function mix3(a, b, t) { a[0] = lerp(a[0], b[0], t); a[1] = lerp(a[1], b[1], t); a[2] = lerp(a[2], b[2], t); }
function set3(o, c) { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }
function mixTo(o, c, t) { o[0] = lerp(o[0], c[0], t); o[1] = lerp(o[1], c[1], t); o[2] = lerp(o[2], c[2], t); }

// patchwork fields aligned to each region: sets PE (edge distance, cell units) and PH (field hash)
let PE = 0, PH = 0;
function patch(px, py, size, seed, R) {
  const dx = px - R.x, dy = py - R.y, a = R.ang * 1.7 + seed * 0.37;
  const ca = Math.cos(a), sa = Math.sin(a);
  let x = (dx * ca - dy * sa) / size + R.i * 7.31, y = (dx * sa + dy * ca) / (size * 0.78) + R.i * 3.17;
  x += 0.07 * N[4](px / 5, py / 5); y += 0.07 * N[5](px / 5, py / 5);
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const hh = hash2(ix, iy, seed), sp = 0.3 + 0.4 * hash2(ix, iy, seed + 1);
  let ex = Math.min(fx, 1 - fx), ey = Math.min(fy, 1 - fy), sub = 0;
  if (hh < 0.45) { if (fx < sp) { ex = Math.min(fx, sp - fx); } else { ex = Math.min(fx - sp, 1 - fx); sub = 1; } }
  else if (hh < 0.85) { if (fy < sp) { ey = Math.min(fy, sp - fy); } else { ey = Math.min(fy - sp, 1 - fy); sub = 1; } }
  PE = Math.min(ex, ey * 0.78); PH = hash2(ix * 2 + sub, iy, seed + 5);
}

// ---------- one city per region, the same mark everywhere ----------
// grey land: a tight cluster of grey blocks with lit roofs and shadowed sides; green land: the same footprint, faint under the canopy
const CITY_R = R => R.w === 'r' ? 6.2 : 4.9;
let CFM = 0, CBL = 0, CLIT = 0, CSH = 0, CHS = 0;
function cityAt(px, py, R) {
  CFM = 0; CBL = 0; CLIT = 0; CSH = 0;
  const dx = px - R.x, dy = py - R.y; if (dx * dx + dy * dy > 100) return;
  const ca = Math.cos(R.ang), sa = Math.sin(R.ang);
  const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
  const rc = CITY_R(R);
  const rr = Math.hypot(lx, ly * 1.12) + 0.9 * N[11](px / 2.6, py / 2.6);
  CFM = 1 - sstep(rc - 0.4, rc + 1.1, rr);
  if (CFM <= 0) return;
  const cell = 1.72, m = 0.2;
  const gx = lx / cell + 0.5, gy = ly / cell + 0.5, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const on = (a, b) => { const cx = (a + 0.5 - 0.5) * cell, cy = (b + 0.5 - 0.5) * cell; const q = Math.hypot(cx, cy * 1.12); return hash2(a, b, R.i * 7 + 3) < 1.15 - sstep(rc * 0.3, rc + 0.3, q) * 1.05; };
  CHS = hash2(ix, iy, R.i * 7 + 5);
  if (fx > m && fx < 1 - m && fy > m && fy < 1 - m && on(ix, iy)) {
    CBL = 1;
    const e = Math.min(fx - m, fy - m), e2 = Math.min(1 - m - fx, 1 - m - fy);
    if (e < 0.16) CLIT = 1; else if (e2 < 0.16) CLIT = -1;
  } else {
    // the street gap just below or right of a block takes its shadow
    if ((fx >= 1 - m && fy > m && fy < 1 - m && on(ix, iy)) || (fy >= 1 - m && fx > m && fx < 1 - m && on(ix, iy))) CSH = 1;
  }
}
const SPR = [hex('#55585C'), hex('#5F6266'), hex('#6A6D70'), hex('#76787A')], STRT = hex('#A3A59E'), ROOFL = hex('#B9BBB4'), WALLD = hex('#3F4246');
function cityGrey(o) {
  mixTo(o, STRT, CFM * 0.88);
  if (CSH) mixTo(o, WALLD, CFM * 0.35);
  if (CBL) { const c = SPR[Math.floor(CHS * 4)]; mixTo(o, c, CFM * 0.95); if (CLIT > 0) mixTo(o, ROOFL, CFM * 0.55); else if (CLIT < 0) mixTo(o, WALLD, CFM * 0.6); }
}
const LANE = hex('#6FAF73'), FOOT = hex('#24573A');
function cityGreen(o, px, py) {
  // old streets show as faint lighter lanes; the blocks sit as darker, mossy shapes under the canopy
  if (!CBL) mixTo(o, LANE, CFM * 0.32);
  else mixTo(o, FOOT, CFM * (CLIT < 0 ? 0.34 : 0.2));
}

// ---------- pines as small directional strokes (an old map-maker's ticks) ----------
// returns 0 none, 1 lit flank, 2 shaded flank, 3 shadow on the ground
function pineAt(px, py, dens, seed) {
  const cw = 2.0, ch = 2.35;
  const ix = Math.floor(px / cw), iy = Math.floor(py / ch);
  let res = 0;
  for (let j = -1; j <= 2; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j;
    if (hash2(cx, cy, seed) > dens) continue;
    const sz = 0.78 + 0.5 * hash2(cx, cy, seed + 1);
    const tx = (cx + 0.15 + 0.7 * hash2(cx, cy, seed + 2)) * cw, ty = (cy + 0.2 + 0.7 * hash2(cx, cy, seed + 3)) * ch;
    const H = 2.7 * sz, W = 0.66 * sz;
    const u = px - tx, v = py - ty;
    const su = u - 0.5 * sz, sv = v - 0.15;
    if (res === 0 && su > -0.3 && su < 1.7 * sz && Math.abs(sv - su * 0.28) < 0.3 * sz) res = 3;
    if (v <= 0.2 && v >= -H) {
      const t = (v + H) / H;
      const hw = W * (0.06 + 0.94 * Math.pow(t, 0.9));
      const uu = u + 0.12 * v;
      if (Math.abs(uu) < hw) res = uu < hw * 0.1 ? 1 : 2;
    }
  }
  return res;
}

// ---------- painterly forest: crowns of varied size, warped off the grid, lit from the upper left, with brush texture ----------
const FOREST = { gap: hex('#173E2A'), base: hex('#2A6A42'), mid: hex('#3A8A52'), hi: hex('#86C273'), tints: [hex('#2F7D4F'), hex('#4E9A4C'), hex('#2B7A5E'), hex('#62A14A')] };
const WETF = { gap: hex('#163E30'), base: hex('#2A6E4E'), mid: hex('#3C9265'), hi: hex('#86C894'), tints: [hex('#3A9468'), hex('#2C8068'), hex('#4E9E5C'), hex('#3E9B5F')] };
const ORCH = { gap: hex('#2E5A34'), base: hex('#4C8C4A'), mid: hex('#62A659'), hi: hex('#B4DA8A'), tints: [hex('#5DA457'), hex('#79B062'), hex('#4E9A4C'), hex('#8CBF66')] };
const tC = [0, 0, 0];
let BCR = 0;
function brushCanopy(px, py, P, seed, sc, o, blossom) {
  const wq = 2.3 * sc;
  const wx = px + 0.62 * sc * N[4](px / wq, py / wq) + 0.25 * sc * N[6](px / (wq * 0.4), py / (wq * 0.4));
  const wy = py + 0.62 * sc * N[5](px / wq, py / wq) + 0.25 * sc * N[7](px / (wq * 0.4), py / (wq * 0.4));
  const mask = N[13](px / 17 + seed * 0.13, py / 17);
  worley(wx / (2.9 * sc), wy / (2.9 * sc), seed);
  let cr = clamp(1 - WF1 / 0.82, 0, 1), dx = WDX, dy = WDY, h1 = WH1, h2 = WH2;
  const bigOn = h1 < 0.18 + 0.6 * sstep(-0.45, 0.45, mask);
  let big = 1;
  if (!(bigOn && cr > 0.1)) { worley(wx / (1.4 * sc), wy / (1.4 * sc), seed + 7); cr = clamp(1 - WF1 / 0.82, 0, 1); dx = WDX; dy = WDY; h1 = WH1; h2 = WH2; big = 0; }
  // crowns are lumpy, not domes
  const lump = 0.22 * N[8](px / (0.55 * sc), py / (0.55 * sc));
  const c2 = clamp(cr + lump * cr, 0, 1);
  const light = clamp(0.52 - (dx * 0.95 + dy * 1.15) * 1.05 + lump * 0.5, 0, 1);
  const tint = P.tints[Math.floor(h1 * 4) & 3];
  tC[0] = lerp(P.base[0], tint[0], 0.5); tC[1] = lerp(P.base[1], tint[1], 0.5); tC[2] = lerp(P.base[2], tint[2], 0.5);
  set3(o, P.gap);
  const body = sstep(0.0, 0.32, c2);
  mixTo(o, tC, body);
  mixTo(o, P.mid, body * c2 * 0.5);
  mixTo(o, P.hi, light * sstep(0.15, 0.7, c2) * (big ? 0.62 : 0.48));
  const shd = (1 - light) * body * 0.2; o[0] *= 1 - shd; o[1] *= 1 - shd; o[2] *= 1 - shd;
  // brush strokes along one diagonal
  const u = px * 0.8 + py * 0.6, v = -px * 0.6 + py * 0.8;
  const br = N[15](u / (0.5 * sc), v / (1.7 * sc)) * 0.07 + N[14](u / (1.6 * sc), v / (4.5 * sc)) * 0.05;
  o[0] *= 1 + br; o[1] *= 1 + br; o[2] *= 1 + br;
  if (blossom && h2 < blossom && c2 > 0.35) { const bl = sstep(0.35, 0.75, N[9](px / 0.45, py / 0.45)); mixTo(o, h2 < blossom * 0.5 ? PAL.blossom : PAL.blossom2, bl * (0.45 + light * 0.35)); }
  BCR = c2;
  return c2;
}

// label areas kept clean (the North Reach's name sits on bare ice)
const CLEAR = [[134, 236, 62, 6.5]];
function clearAt(px, py) { let m = 0; for (const c of CLEAR) { const q = Math.hypot((px - c[0]) / c[2], (py - c[1]) / c[3]); m = Math.max(m, 1 - sstep(0.75, 1.25, q)); } return m; }

function greyPaint(b, px, py, h, R, o) {
  const n1 = N[8](px / 11, py / 11), n2 = N[9](px / 4, py / 4);
  if (b === 0) { // ice, snow, grey pine stands
    const clr = clearAt(px, py);
    set3(o, PAL.snow); mixTo(o, PAL.ice, sstep(-0.3, 0.6, n1) * 0.7 * (1 - clr * 0.6));
    const rock = sstep(0.6, 0.85, h + n2 * 0.08) * (1 - clr); mixTo(o, PAL.rock, rock * 0.75);
    const fm = sstep(0.0, 0.35, fbm(N[10], px / 22, py / 22, 3)) * (1 - rock) * (1 - clr);
    if (fm > 0.02) { const p = pineAt(px, py, fm * 0.78, 101); if (p === 3) mixTo(o, PAL.pineSh, 0.55); else if (p) mixTo(o, p === 1 ? PAL.gpineL : PAL.gpine, 0.92); }
    return;
  }
  if (b === 1 || b === 4) { // concrete sprawl + ochre patchwork
    const cityness = b === 1 ? sstep(-0.16, -0.08, fbm(N[10], px / 22, py / 22, 3) + (R.w === 'r' ? 0.1 : -0.15)) : 0;
    patch(px, py, 4.6, 11, R);
    const oc = PAL.och[Math.floor(PH * PAL.och.length)];
    set3(o, oc); const fv = 1 + n2 * 0.03 + (hash2(Math.floor(px * 3), Math.floor(py * 3), 4) - 0.5) * 0.02; o[0] *= fv; o[1] *= fv; o[2] *= fv;
    if (PE < 0.06) mixTo(o, PAL.hedge, 0.75);
    if (cityness > 0) {
      const bx = Math.floor(px / 3.1 + 0.3 * N[4](px / 7, py / 7)), by = Math.floor(py / 2.6 + 0.3 * N[5](px / 7, py / 7));
      const blk = hash2(bx, by, 9);
      const t = [PAL.conc[0], PAL.conc[1], PAL.conc[2]];
      const bv = (blk - 0.5) * 0.08 + N[9](px / 6, py / 6) * 0.03; t[0] *= 1 + bv; t[1] *= 1 + bv; t[2] *= 1 + bv;
      mixTo(o, t, cityness);
    }
    return;
  }
  if (b === 2) { // pale sand
    set3(o, PAL.sand);
    const dune = Math.sin((px * 0.35 + py * 0.9) / 1.9 + N[8](px / 18, py / 18) * 4);
    const dv = dune * 0.03 + n1 * 0.03; o[0] *= 1 + dv; o[1] *= 1 + dv; o[2] *= 1 + dv;
    mixTo(o, PAL.sandD, sstep(0.3, 0.7, N[9](px / 16, py / 16)) * 0.4);
    mixTo(o, PAL.salt, sstep(0.45, 0.75, N[12](px / 22 + 4, py / 22)) * 0.45);
    mixTo(o, PAL.rock, sstep(0.55, 0.85, h) * 0.45);
    return;
  }
  // b === 3: cleared tropics, dull and gridded plantation
  patch(px, py, 5, 33, R); set3(o, PAL.dullW); mixTo(o, PAL.och[Math.floor(PH * 6)], 0.45);
  const rows = Math.sin((px * 0.6 + py * 0.8) * 2.4) > 0.55 ? 1 : 0; if (rows) mixTo(o, PAL.dullW2, 0.45);
  if (PE < 0.06) mixTo(o, PAL.hedge, 0.6);
}

const tA = [0, 0, 0];
function greenPaint(b, px, py, h, R, o) {
  if (b === 0) { // the north turned: moss and lichen ground, snow in the hollows, dark pine strokes
    const clr = clearAt(px, py);
    set3(o, PAL.mossG); mixTo(o, PAL.lichen, sstep(-0.2, 0.6, N[8](px / 9, py / 9)) * 0.5);
    const snowy = sstep(0.3, 0.75, fbm(N[9], px / 16, py / 16, 3) + h * 0.5); mixTo(o, PAL.snowG, snowy * 0.55);
    const fm = Math.max(0.25, sstep(-0.25, 0.3, fbm(N[10], px / 22, py / 22, 3))) * (1 - clr * 0.8);
    const p = pineAt(px, py, 0.22 + fm * 0.46, 211);
    if (p === 3) mixTo(o, PAL.pineGSh, 0.5); else if (p) mixTo(o, p === 1 ? PAL.pineL : PAL.pine, 0.95);
  } else if (b === 1) { // deep forest: clumps of varied scale with clearings of meadow
    brushCanopy(px, py, FOREST, 307, 1, o, 0.05);
    const mv = fbm(N[13], px / 26 + 9, py / 26, 3);
    const vv = 0.94 + mv * 0.22; o[0] *= vv; o[1] *= vv; o[2] *= vv;
    const clear = sstep(0.38, 0.56, fbm(N[10], px / 18 + 7, py / 18, 3));
    if (clear > 0) { patch(px, py, 4, 21, R); set3(tA, PAL.mead[Math.floor(PH * 5)]); const st = 1 + N[9](px / 2.2, py / 2.2) * 0.05; tA[0] *= st; tA[1] *= st; tA[2] *= st; mixTo(o, tA, clear * 0.8 * (1 - sstep(0.4, 0.8, BCR) * 0.5)); }
  } else if (b === 2) { // the Dry Belt turned: savanna grass, cactus and acacia clumps, sand only in small flecks
    const sv = fbm(N[13], px / 17 + 3, py / 17, 3);
    const st = sstep(-0.35, 0.45, sv);
    o[0] = lerp(PAL.savA[0], PAL.savB[0], st); o[1] = lerp(PAL.savA[1], PAL.savB[1], st); o[2] = lerp(PAL.savA[2], PAL.savB[2], st);
    const gs = 1 + N[9](px / 1.6, py / 3.2) * 0.05 + Math.sin((px * 0.35 + py * 0.9) / 1.9 + N[8](px / 18, py / 18) * 4) * 0.02; o[0] *= gs; o[1] *= gs; o[2] *= gs;
    const pm = fbm(N[10], px / 15, py / 15, 3);
    const dens = sstep(-0.3, 0.2, pm);
    worley(px / 2.3, py / 2.3, 401); const cr = clamp(1 - WF1 / 0.7, 0, 1);
    if (WH1 < 0.14 + dens * 0.5) { const l = clamp(0.5 - (WDX + WDY) * 1.0, 0, 1); set3(tA, PAL.cacD); mixTo(tA, PAL.cactus, sstep(0.05, 0.4, cr)); mixTo(tA, PAL.cactusL, l * cr * 0.7); mixTo(o, tA, sstep(0.08, 0.3, cr) * (0.6 + dens * 0.35)); }
    mixTo(o, PAL.cacD, sstep(0.25, 0.6, pm) * 0.3);
    const fl = N[14](px / 2.6, py / 2.6) + 0.35 * N[3](px / 9, py / 9);
    if (fl > 0.6) { mixTo(o, PAL.sand, sstep(0.6, 0.76, fl) * 0.7); }
  } else if (b === 3) { // wetland forest + pools
    brushCanopy(px, py, WETF, 503, 0.95, o, 0.05);
    const pool = fbm(N[12], px / 15 + 3, py / 15, 3);
    const pm = sstep(0.5, 0.54, pool);
    if (pm > 0) { const q = sstep(0.5, 0.64, pool); tA[0] = lerp(PAL.pool[0], PAL.poolL[0], q); tA[1] = lerp(PAL.pool[1], PAL.poolL[1], q); tA[2] = lerp(PAL.pool[2], PAL.poolL[2], q); mixTo(o, tA, pm * 0.75); }
    const mv = fbm(N[9], px / 24 + 4, py / 24, 3); const vv = 0.95 + mv * 0.2; o[0] *= vv; o[1] *= vv; o[2] *= vv;
    const rim = sstep(0.44, 0.5, pool) * (1 - pm); mixTo(o, PAL.wetL, rim * 0.2);
  } else { // farmland gone wild: a meadow mosaic, soft lighter hedgerows, orchards and copses
    patch(px, py, 6.0, 71, R);
    const mc = PAL.mead[Math.floor(PH * PAL.mead.length)]; set3(o, mc);
    const stv = 1 + N[9](px / 3, py / 3) * 0.045 + N[15](px * 0.3 + py * 0.95, (py * 0.3 - px * 0.95) / 3) * 0.03; o[0] *= stv; o[1] *= stv; o[2] *= stv;
    if (PH > 0.84) { brushCanopy(px, py, ORCH, 77, 0.55, tA, 0.4); mixTo(o, tA, 0.8); }
    const hg = (1 - sstep(0.02, 0.085, PE)) * sstep(-0.35, 0.1, N[7](px / 4.5, py / 4.5));
    if (hg > 0) { mixTo(o, PAL.hedgeG, hg * 0.5); const dab = sstep(0.25, 0.6, N[8](px / 0.9, py / 0.9)); mixTo(o, PAL.hedgeT, hg * dab * 0.35); }
    const wood = sstep(0.2, 0.42, fbm(N[10], px / 20, py / 20, 3));
    if (wood > 0) { brushCanopy(px, py, FOREST, 83, 0.85, tA, 0.06); mixTo(o, tA, wood); }
  }
}

G.RW = { OX, OY, WW, WH, CONT, REG, RIVER_SRC, paintWorld, landField, fbm, N, hash2, clamp, sstep, lerp, mulberry32, CITY_R, hex };
G.RWDBG = { F_C: () => F_C };
})(window);
