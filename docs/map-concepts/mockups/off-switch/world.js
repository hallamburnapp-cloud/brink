/* OFF SWITCH — painted night-side world map (shared by all three mockups).
   All geometry is authored in "design" coordinates: the phone frame, where the
   world box is x 8–382, y 150–696. paint() maps that box onto any rect.        */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise(seed) {
    const rng = mulberry32(seed);
    const p = []; for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint16Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const gx = new Float32Array(256), gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const a = rng() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    function n2(x, y) {
      let xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi; xi &= 255; yi &= 255;
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      const a = perm[xi] + yi, b = perm[xi + 1] + yi;
      const g00 = perm[a], g01 = perm[a + 1], g10 = perm[b], g11 = perm[b + 1];
      const n00 = gx[g00] * xf + gy[g00] * yf, n10 = gx[g10] * (xf - 1) + gy[g10] * yf;
      const n01 = gx[g01] * xf + gy[g01] * (yf - 1), n11 = gx[g11] * (xf - 1) + gy[g11] * (yf - 1);
      const x0 = n00 + u * (n10 - n00), x1 = n01 + u * (n11 - n01);
      return (x0 + v * (x1 - x0)) * 1.4142;
    }
    function fbm(x, y, oct, gain) {
      gain = gain || 0.5;
      let s = 0, a = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        s += a * n2(x, y); norm += a; a *= gain;
        const nx = x * 1.6 - y * 1.2, ny = x * 1.2 + y * 1.6; x = nx + 17.3; y = ny + 9.1;
      }
      return s / norm;
    }
    return { n2, fbm };
  }
  function hash2(ix, iy, s) {
    let h = (Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ s) | 0;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const W3 = new Float32Array(3);
  function worley(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j;
      const px = cx + hash2(cx, cy, s), py = cy + hash2(cx, cy, s + 101);
      const dx = px - x, dy = py - y, d = dx * dx + dy * dy;
      if (d < f1) { f2 = f1; f1 = d; id = hash2(cx, cy, s + 202); } else if (d < f2) f2 = d;
    }
    W3[0] = Math.sqrt(f1); W3[1] = Math.sqrt(f2); W3[2] = id; return W3;
  }

  const N = makeNoise(4127);
  const N2 = makeNoise(991);

  // ------------------------------------------------------------------ world
  // landmasses: 0 CAP, 1 HIGHMARCH, 2 SUNDRY, 3 SCATTER, 4 FARSOUTH
  const BLOBS = [
    [0, 84, 171, 46, 10, -5], [0, 132, 164, 16, 7, 12], [0, 186, 167, 48, 11, 3], [0, 238, 161, 14, 6, 0],
    [0, 290, 171, 42, 10, 5], [0, 336, 164, 16, 6, -10],
    [1, 70, 214, 34, 16, -18], [1, 104, 232, 44, 22, 8], [1, 136, 250, 22, 10, 34], [1, 62, 262, 36, 26, 14], [1, 108, 288, 40, 26, -24],
    [1, 34, 296, 14, 18, 0], [1, 86, 328, 44, 24, 10], [1, 120, 352, 30, 18, -30], [1, 98, 388, 40, 26, -12], [1, 60, 372, 18, 14, 0],
    [1, 100, 438, 42, 30, 16], [1, 78, 488, 46, 32, -8], [1, 40, 520, 16, 22, 20], [1, 108, 538, 40, 30, 18], [1, 136, 512, 16, 12, -20],
    [1, 82, 588, 34, 30, -14], [1, 62, 630, 20, 15, 24],
    [2, 300, 246, 74, 33, 4], [2, 246, 270, 24, 30, -20], [2, 306, 302, 66, 42, -6], [2, 322, 368, 52, 46, 8],
    [2, 306, 438, 46, 43, -10], [2, 336, 500, 32, 25, 25], [2, 360, 330, 18, 30, 0],
    [3, 198, 342, 17, 10, -20], [3, 228, 374, 13, 10, 30], [3, 188, 390, 17, 11, 10], [3, 215, 412, 13, 9, -30],
    [3, 177, 430, 17, 12, 20], [3, 207, 448, 15, 9, 0], [3, 168, 465, 14, 9, -15], [3, 231, 455, 10, 8, 0],
    [4, 198, 630, 52, 29, -10], [4, 258, 606, 56, 35, 5], [4, 322, 612, 46, 35, -12], [4, 292, 652, 60, 23, 0],
    [4, 222, 662, 48, 17, 5], [4, 352, 645, 24, 21, 0], [4, 236, 580, 18, 12, 0],
  ].map(b => ({ lm: b[0], x: b[1], y: b[2], irx: 1 / b[3], iry: 1 / b[4], c: Math.cos(b[5] * Math.PI / 180), s: Math.sin(b[5] * Math.PI / 180), r: Math.max(b[3], b[4]) }));

  // regions: [lm, x, y, state, pop, wired(2 W,1 P,0 O), labs, name]
  const REG = [
    [0, 74, 170, 'blue', 1, 1, 0, 'Rimeholt'], [0, 166, 166, 'blue', 1, 1, 0, 'Northwick Spit'], [0, 212, 164, 'blue', 1, 0, 0, 'Pale Isles'], [0, 292, 170, 'blue', 1, 1, 0, 'Hollin Cap'],
    [1, 54, 222, 'blue', 2, 2, 0, 'Vessary'], [1, 114, 232, 'blue', 3, 2, 0, 'Glassharbour'], [1, 60, 280, 'blue', 2, 2, 0, 'Quillon'], [1, 118, 300, 'blue', 2, 2, 0, 'Edda Vale'],
    [1, 62, 342, 'off', 2, 1, 0, 'Ashkettle'], [1, 124, 352, 'off', 2, 2, 0, 'Morrow Downs'], [1, 95, 395, 'off', 2, 1, 0, 'Saltreach'],
    [1, 98, 442, 'cut', 2, 1, 0, 'Fennick'],
    [1, 72, 495, 'lit', 2, 2, 1, 'Larkspire'], [1, 118, 540, 'lit', 3, 2, 2, 'Copperfall'], [1, 80, 600, 'lit', 2, 0, 0, 'Corvane'],
    [2, 242, 260, 'shield', 2, 1, 0, 'Wenmoor'], [2, 282, 232, 'blue', 2, 2, 0, 'Ostry'], [2, 326, 224, 'blue', 2, 2, 0, 'Harrowgate'], [2, 362, 252, 'blue', 2, 2, 0, 'Kelpmouth'],
    [2, 356, 300, 'blue', 2, 1, 0, 'Dunmarrow'], [2, 298, 286, 'sel', 3, 2, 2, 'Tallowmere'], [2, 340, 342, 'shield', 2, 1, 0, 'Brackwater'],
    [2, 262, 318, 'lit', 2, 1, 0, 'Lintel'], [2, 296, 360, 'lit', 3, 2, 0, 'Sundry Reach'], [2, 338, 398, 'lit', 2, 2, 1, 'Orrin'], [2, 300, 445, 'lit', 2, 1, 0, 'Weald'], [2, 334, 500, 'lit', 2, 0, 0, 'Cindergap'],
    [3, 198, 342, 'hit', 1, 1, 0, 'Tern Isle'], [3, 227, 373, 'lit', 1, 1, 0, 'Gull Rock'], [3, 189, 388, 'lit', 1, 1, 0, 'Middling'], [3, 214, 410, 'lit', 1, 0, 0, 'Shoal'],
    [3, 178, 428, 'lit', 1, 2, 1, 'Lantern Key'], [3, 207, 446, 'lit', 1, 1, 0, 'Pebbleby'], [3, 170, 463, 'lit', 1, 0, 0, 'Driftholm'], [3, 229, 453, 'lit', 1, 1, 0, 'Wickstone'],
    [4, 165, 632, 'lit', 2, 1, 0, 'Iceward'], [4, 234, 592, 'lit', 3, 2, 0, 'Brindle Coast'], [4, 290, 590, 'lit', 2, 2, 1, 'Marram'], [4, 338, 610, 'lit', 2, 2, 0, 'Southfold'],
    [4, 205, 660, 'lit', 1, 1, 0, 'Whitesand'], [4, 268, 650, 'lit', 2, 1, 0, 'Hearth'], [4, 335, 656, 'lit', 1, 0, 0, 'Floe End'],
  ].map((r, i) => ({ i, lm: r[0], x: r[1], y: r[2], state: r[3], pop: r[4], wired: r[5], labs: r[6], name: r[7] }));
  const SEEDS = [[], [], [], [], []];
  REG.forEach(r => SEEDS[r.lm].push(r));
  const byName = n => REG.find(r => r.name === n);

  const BOX = { x0: 8, y0: 150, w: 374, h: 546 };
  const LABELS = [['THE CAP', 318, 194, 0], ['HIGHMARCH', 94, 374, 0], ['THE SCATTER', 201, 418, 0], ['SUNDRY', 312, 432, 0], ['FARSOUTH', 266, 672, 0]];

  // sample the world at design point (X,Y)
  const S = { h: 0, lm: -1, rid: -1, bd: 99, f: 0 };
  function sample(X, Y, wantRegion) {
    const wx = N.fbm(X / 42, Y / 42, 4) * 19, wy = N.fbm(X / 42 + 31.7, Y / 42 + 11.3, 4) * 19;
    const x = X + wx, y = Y + wy;
    let best = -9, lm = 0;
    for (let k = 0; k < BLOBS.length; k++) {
      const b = BLOBS[k];
      const dx = x - b.x, dy = y - b.y;
      if (dx > b.r + 40 || dx < -b.r - 40 || dy > b.r + 40 || dy < -b.r - 40) continue;
      const u = (dx * b.c + dy * b.s) * b.irx, v = (-dx * b.s + dy * b.c) * b.iry;
      const f = 1 - Math.sqrt(u * u + v * v);
      if (f > best) { best = f; lm = b.lm; }
    }
    if (best < -0.9) { S.h = -1; S.lm = -1; S.rid = -1; S.f = best; return S; }
    const detail = N.fbm(X / 23, Y / 23, 6) * 0.44 + N2.fbm(X / 6.5, Y / 6.5, 3) * 0.07;
    const sc = lm === 3 ? 0.4 : 1.05;
    S.h = best + detail * sc - 0.03; S.lm = lm; S.f = best;
    if (wantRegion && S.h > -0.2) {
      const jx = N2.fbm(X / 17 + 50, Y / 17, 3) * 7, jy = N2.fbm(X / 17, Y / 17 + 50, 3) * 7;
      const qx = X + jx, qy = Y + jy;
      const seeds = SEEDS[lm];
      let d1 = 1e9, d2 = 1e9, i1 = -1, i2 = -1;
      for (let k = 0; k < seeds.length; k++) {
        const s = seeds[k]; const dx = qx - s.x, dy = qy - s.y; const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = k; } else if (d < d2) { d2 = d; i2 = k; }
      }
      S.rid = seeds[i1].i;
      if (i2 >= 0) {
        const a = seeds[i1], b = seeds[i2];
        const L = Math.hypot(a.x - b.x, a.y - b.y);
        S.bd = (d2 - d1) / (2 * L);
      } else S.bd = 99;
    } else { S.rid = -1; S.bd = 99; }
    return S;
  }

  // ------------------------------------------------------------- utilities
  function boxBlur(src, w, h, r, passes) {
    r = Math.max(1, Math.round(r));
    const inv = 1 / (2 * r + 1);
    let a = new Float32Array(src); const b = new Float32Array(src.length);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < h; y++) {
        const row = y * w; let acc = 0;
        for (let x = -r; x <= r; x++) acc += a[row + clamp(x, 0, w - 1)];
        for (let x = 0; x < w; x++) {
          b[row + x] = acc * inv;
          acc += a[row + Math.min(x + r + 1, w - 1)] - a[row + Math.max(x - r, 0)];
        }
      }
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += b[clamp(y, 0, h - 1) * w + x];
        for (let y = 0; y < h; y++) {
          a[y * w + x] = acc * inv;
          acc += b[Math.min(y + r + 1, h - 1) * w + x] - b[Math.max(y - r, 0) * w + x];
        }
      }
    }
    return a;
  }

  function glowSprite(rgb, size, hard) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    const [R, G, B] = rgb;
    gr.addColorStop(0, `rgba(${R},${G},${B},1)`);
    gr.addColorStop(hard ? 0.18 : 0.08, `rgba(${R},${G},${B},${hard ? 0.55 : 0.6})`);
    gr.addColorStop(0.35, `rgba(${R},${G},${B},0.16)`);
    gr.addColorStop(0.7, `rgba(${R},${G},${B},0.04)`);
    gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  }

  // catmull-rom through points -> dense polyline
  function spline(pts, step) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); const n = Math.max(2, Math.ceil(L / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function quadPts(a, c, b, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return out;
  }
  function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  function pointAt(p, d) {
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= l) { const t = d / l; return [mix(p[i - 1][0], p[i][0], t), mix(p[i - 1][1], p[i][1], t), Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0])]; }
      d -= l;
    }
    const a = p[p.length - 2], b = p[p.length - 1];
    return [b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0])];
  }

  // -------------------------------------------------------- city lights
  // Night-photo logic: big cities sit at river mouths and on coasts, towns string
  // out along coasts, rivers and power lines, and the interior stays dark.
  function buildLights() {
    const rng = mulberry32(777);
    const lights = [], clusters = [], rivers = [], grid = [];
    // pass 1: geography of every region (candidate land, shore, river, cities)
    for (const r of REG) {
      const pts = [];
      for (let t = 0; t < 1800 && pts.length < 420; t++) {
        const X = r.x + (rng() * 2 - 1) * 50, Y = r.y + (rng() * 2 - 1) * (r.lm === 0 ? 16 : 46);
        const s = sample(X, Y, true);
        if (s.rid === r.i && s.h > 0.012) pts.push([X, Y, s.h]);
      }
      if (!pts.length) continue;
      r.pts = pts;
      r.coast = pts.filter(p => p[2] < 0.1);
      // one river per larger region: from the high ground to the nearest shore
      let river = null, mouth = null;
      if ((r.lm === 1 || r.lm === 2 || r.lm === 4) && pts.length > 60) {
        let hi = pts[0]; for (const p of pts) if (p[2] > hi[2]) hi = p;
        let bd = 1e9;
        for (const c of r.coast) { const d = Math.hypot(c[0] - hi[0], c[1] - hi[1]); if (d < bd) { bd = d; mouth = c; } }
        if (mouth && bd > 13) {
          const dx = mouth[0] - hi[0], dy = mouth[1] - hi[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
          const pp = [];
          for (let k = 0; k <= 5; k++) { const t = k / 5; const m = k === 0 || k === 5 ? 0 : (rng() - 0.5) * L * 0.32; pp.push([hi[0] + dx * t + nx * m, hi[1] + dy * t + ny * m]); }
          pp.push([mouth[0] + dx / L * 3, mouth[1] + dy / L * 3]);
          river = spline(pp, 0.6);
          rivers.push({ r: r.i, pts: river });
        } else mouth = null;
      }
      r.river = river;
      // cities: the first at the river mouth (or the best harbour), the rest on shores and rivers
      const nC = Math.max(1, r.pop + (r.wired === 2 ? 1 : 0) + (r.wired === 0 ? -1 : 0));
      const cents = [];
      const pick = (pool, minD) => {
        let best = pool[0], bs = -1e9;
        for (let k = 0; k < 22; k++) {
          const p = pool[Math.floor(rng() * pool.length)];
          let sc = rng() * 0.6;
          for (const q of cents) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); sc += d < minD ? -3 : Math.min(d, 26) / 40; }
          if (sc > bs) { bs = sc; best = p; }
        }
        return best;
      };
      const shore = r.coast.length > 5 ? r.coast : pts;
      const c0 = mouth ? [mouth[0] - (mouth[0] - r.x) * 0.06, mouth[1] - (mouth[1] - r.y) * 0.06] : pick(shore, 10);
      cents.push([c0[0], c0[1], 1]);
      for (let c = 1; c < nC; c++) {
        let p;
        if (river && rng() < 0.4) { const q = river[Math.floor((0.15 + rng() * 0.55) * river.length)]; p = q; }
        else p = pick(shore, 13);
        cents.push([p[0], p[1], 0.42 + rng() * 0.32]);
      }
      r.cents = cents;
      // local power lines from the main city to the others
      r.lines = [];
      for (let k = 1; k < cents.length; k++) {
        const a = cents[0], b = cents[k];
        const mid = [(a[0] + b[0]) / 2 + (rng() - 0.5) * 7, (a[1] + b[1]) / 2 + (rng() - 0.5) * 7];
        r.lines.push(quadPts(a, mid, b, 24));
      }
      clusters.push(...cents.map(c => ({ x: c[0], y: c[1], w: c[2] * r.pop * (r.wired === 0 ? 0.6 : 1), r: r.i })));
    }
    // trunk lines between neighbouring main cities on the same landmass
    for (let a = 0; a < REG.length; a++) for (let b = a + 1; b < REG.length; b++) {
      const A = REG[a], B = REG[b];
      if (A.lm !== B.lm || !A.cents || !B.cents || A.lm === 3 || A.lm === 0) continue;
      const d = Math.hypot(A.x - B.x, A.y - B.y); if (d > 62) continue;
      const p = A.cents[0], q = B.cents[0];
      const mid = [(p[0] + q[0]) / 2 + (rng() - 0.5) * 10, (p[1] + q[1]) / 2 + (rng() - 0.5) * 10];
      const line = quadPts(p, mid, q, 40);
      // keep only trunks that stay on land
      let ok = true; for (let k = 0; k < line.length; k += 4) { if (sample(line[k][0], line[k][1], false).h < 0.0) { ok = false; break; } }
      if (ok) grid.push({ a, b, pts: line });
    }
    // pass 2: place the lights
    for (const r of REG) {
      if (!r.pts) continue;
      const cents = r.cents, pts = r.pts, shore = r.coast.length > 5 ? r.coast : pts;
      const inR = (X, Y) => { const s = sample(X, Y, true); return s.rid === r.i && s.h > 0.004; };
      const myLines = r.lines.slice();
      for (const g of grid) if (g.a === r.i || g.b === r.i) myLines.push(g.pts);
      const dens = [0.4, 1.1, 1.75][r.wired];
      const n = Math.round(r.pop * dens * 38 + (r.wired === 0 ? 6 : 14));
      const dimK = r.wired === 0 ? 0.72 : 1;
      let made = 0, guard = 0;
      while (made < n && guard++ < n * 10) {
        const kind = rng();
        let X, Y, b, big = false;
        if (kind < 0.3) { // city cores, sized by population
          const ci = rng() < 0.55 ? 0 : Math.floor(rng() * cents.length), c = cents[ci];
          const sg = (ci === 0 ? 1.5 + 0.75 * r.pop : 1.0 + 0.35 * r.pop) * (r.wired === 0 ? 0.7 : 1);
          const a = rng() * TAU, rr = Math.sqrt(-2 * Math.log(rng() + 1e-6)) * sg * 0.7;
          X = c[0] + Math.cos(a) * rr; Y = c[1] + Math.sin(a) * rr;
          b = (ci === 0 ? 0.78 : 0.6) + rng() * 0.3 - rr / sg * 0.12; big = rng() < 0.16;
        } else if (kind < 0.62) { // coastal strings
          const p = shore[Math.floor(rng() * shore.length)];
          X = p[0] + (rng() - 0.5) * 1.4; Y = p[1] + (rng() - 0.5) * 1.4;
          b = 0.42 + rng() * 0.42;
        } else if (kind < 0.76 && r.river) { // along the river
          const q = r.river[Math.floor(rng() * (r.river.length - 6))];
          X = q[0] + (rng() - 0.5) * 1.6; Y = q[1] + (rng() - 0.5) * 1.6;
          b = 0.3 + rng() * 0.34;
        } else if (kind < 0.94 && myLines.length) { // along power lines
          const L = myLines[Math.floor(rng() * myLines.length)];
          const q = L[Math.floor(rng() * L.length)];
          X = q[0] + (rng() - 0.5) * 1.2; Y = q[1] + (rng() - 0.5) * 1.2;
          b = 0.26 + rng() * 0.32;
        } else { // a few lonely farms inland
          const p = pts[Math.floor(rng() * pts.length)];
          X = p[0]; Y = p[1]; b = 0.14 + rng() * 0.2;
        }
        if (!inR(X, Y)) continue;
        lights.push({ x: X, y: Y, b: clamp(b * dimK, 0.08, 1), r: r.i, tw: rng(), big });
        made++;
      }
      // decorative warm flickers for switched-off places: small clusters of 2-4 candles
      r.flick = [];
      for (let k = 0; k < 7; k++) {
        const p = rng() < 0.6 ? shore[Math.floor(rng() * shore.length)] : pts[Math.floor(rng() * pts.length)];
        const m = 2 + Math.floor(rng() * 3), dots = [];
        for (let q = 0; q < m; q++) dots.push([p[0] + (rng() - 0.5) * 2.4, p[1] + (rng() - 0.5) * 2.0, 0.5 + rng() * 0.5]);
        r.flick.push({ x: p[0], y: p[1], a: 0.55 + rng() * 0.45, dots });
      }
    }
    return { lights, clusters, rivers, grid };
  }

  let LIGHTS = null;

  // ------------------------------------------------------------------ paint
  function paint(canvas, o) {
    const t0 = performance.now(); let tl = t0; const T_ = (nm) => { if (o.timing) { const t = performance.now(); console.error('t', nm, Math.round(t - tl)); tl = t; } };
    const dpr = o.dpr, cw = o.cssW, ch = o.cssH;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    canvas.width = W; canvas.height = H;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');
    const s = o.rect.w / BOX.w, SD = s * dpr; // device px per design px
    const toDev = (X, Y) => [(o.rect.x + (X - BOX.x0) * s) * dpr, (o.rect.y + (Y - BOX.y0) * s) * dpr];
    const toCss = (X, Y) => [o.rect.x + (X - BOX.x0) * s, o.rect.y + (Y - BOX.y0) * s];
    const win = o.state === 'win';
    const stateOf = r => (win ? 'lit' : r.state);
    if (!LIGHTS) LIGHTS = buildLights();

    const n = W * H;
    const hA = new Float32Array(n).fill(-1);
    const fA = new Float32Array(n);
    const rid = new Int16Array(n).fill(-1);
    const bdA = new Float32Array(n).fill(99);
    const rel = new Float32Array(n);
    const XA = new Float32Array(W), YA = new Float32Array(H);
    for (let x = 0; x < W; x++) XA[x] = BOX.x0 + (x / dpr - o.rect.x) / s;
    for (let y = 0; y < H; y++) YA[y] = BOX.y0 + (y / dpr - o.rect.y) / s;

    for (let y = 0; y < H; y++) {
      const Y = YA[y];
      if (Y < BOX.y0 - 30 || Y > BOX.y0 + BOX.h + 30) continue;
      for (let x = 0; x < W; x++) {
        const X = XA[x];
        if (X < BOX.x0 - 30 || X > BOX.x0 + BOX.w + 30) continue;
        const sm = sample(X, Y, true);
        const i = y * W + x;
        hA[i] = sm.h; fA[i] = sm.f; rid[i] = sm.rid; bdA[i] = sm.bd;
        if (sm.h > -0.1) {
          const belt = sstep(0.0, 0.35, N.fbm(X / 70 + 7, Y / 70 - 3, 2) + 0.12) * sstep(0.02, 0.4, sm.f);
          const rr = N.fbm(X / 24 + 3, Y / 24, 3); const ridge = 1 - Math.abs(rr) * 2.2;
          rel[i] = sstep(-0.05, 0.6, sm.h) * 0.34 + N.fbm(X / 30 + 5, Y / 30, 4) * 0.13
                 + Math.max(0, ridge) * Math.max(0, ridge) * belt * 0.3 + N2.fbm(X / 5, Y / 5, 2) * 0.01;
        }
      }
    }
    T_('sample');
    // signed distance to coast (device px) and coverage
    const sd = new Float32Array(n), cov = new Float32Array(n);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; const h = hA[i];
      if (h < -0.6) { sd[i] = -99; continue; }
      const gx = (hA[i + 1] - hA[i - 1]) * 0.5, gy = (hA[i + W] - hA[i - W]) * 0.5;
      const g = Math.sqrt(gx * gx + gy * gy) + 1e-5;
      const d = h / g; sd[i] = d; cov[i] = clamp(d + 0.5, 0, 1);
    }
    const covNear = boxBlur(cov, W, H, 1.6 * SD, 3);
    const covFar = boxBlur(cov, W, H, 9 * SD, 3);

    T_('sdf');
    // region-state masks
    const regState = REG.map(stateOf);
    const isBlue = REG.map((r, k) => regState[k] === 'blue' || regState[k] === 'cut');
    const isLitLand = REG.map((r, k) => ['lit', 'shield', 'sel', 'hit'].includes(regState[k]));
    const blueM = new Float32Array(n), cutM = new Float32Array(n), offM = new Float32Array(n), shM = new Float32Array(n), litM = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = rid[i]; if (r < 0 || hA[i] < -0.05) continue;
      if (regState[r] === 'blue') blueM[i] = 1;
      if (regState[r] === 'cut') cutM[i] = 1;
      if (regState[r] === 'off') offM[i] = 1;
      if (regState[r] === 'shield') shM[i] = 1;
      if (isLitLand[r] && regState[r] !== 'hit') litM[i] = cov[i];
    }
    const blueS = boxBlur(blueM, W, H, 2.2 * SD, 3), cutS = boxBlur(cutM, W, H, 2.2 * SD, 3);
    const blueL = boxBlur(blueM, W, H, 13 * SD, 3);
    const offS = boxBlur(offM, W, H, 0.8 * SD, 2);
    const shS = boxBlur(shM, W, H, 1.0 * SD, 2);
    const litS = boxBlur(litM, W, H, 3.2 * SD, 2);

    // frost field
    const hit = byName('Tern Isle');
    const hitP = [hit.x + 4, hit.y - 3];
    const frost = new Float32Array(n);
    if (!win) for (let y = 0; y < H; y++) {
      const Y = YA[y];
      for (let x = 0; x < W; x++) {
        const i = y * W + x; if (cov[i] <= 0 || rid[i] < 0) continue;
        const X = XA[x]; const r = rid[i]; const st = regState[r];
        let F = 0;
        const nz = N2.fbm(X / 8, Y / 8, 4);
        const b = blueS[i] + nz * 0.5;
        F = sstep(0.36, 0.58, b);
        if (st === 'sel') F = sstep(0.33, 0.39, blueL[i] + nz * 0.16) * 0.95;
        if (st === 'hit') {
          const d = Math.hypot(X - hitP[0], Y - hitP[1]);
          F = sstep(0.2, -0.05, d / 13 - 0.55 + nz * 0.5);
        }
        if (st === 'cut') F = sstep(0.36, 0.58, cutS[i] + nz * 0.5) * 0.4;
        F *= (1 - offS[i]) * (1 - shS[i]);
        frost[i] = F * cov[i];
      }
    }
    const frostLive = new Float32Array(n); for (let i = 0; i < n; i++) if (rid[i] >= 0 && regState[rid[i]] !== 'cut') frostLive[i] = frost[i];
    const frostL = boxBlur(frostLive, W, H, 4 * SD, 2);
    const frostAt0 = (X, Y) => { const xi = Math.round((o.rect.x + (X - BOX.x0) * s) * dpr), yi = Math.round((o.rect.y + (Y - BOX.y0) * s) * dpr); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return 0; return frost[yi * W + xi]; };

    T_('frostfield');
    // frost seeds: every captured city is where the ice is thickest
    const fSeeds = [];
    if (!win) for (const c of LIGHTS.clusters) {
      const st = regState[c.r];
      if (st === 'blue' || st === 'cut') fSeeds.push({ x: c.x, y: c.y, w: Math.max(0.5, c.w), cut: st === 'cut' });
      else if ((st === 'sel' || st === 'hit') && frostAt0(c.x, c.y) > 0.4) fSeeds.push({ x: c.x, y: c.y, w: c.w * 0.7, cut: false });
    }
    if (!win) fSeeds.push({ x: hitP[0], y: hitP[1], w: 0.9, cut: false });
    // per-pixel ice density: dense ice-white at the cities, thinning toward the front
    const fDen = new Float32Array(n), fMid = new Float32Array(n);
    if (fSeeds.length) for (let y = 0; y < H; y++) {
      const Y = YA[y];
      for (let x = 0; x < W; x++) {
        const i = y * W + x; if (frost[i] <= 0.002) continue;
        const X = XA[x];
        let dn = 0, dm = 0;
        for (let k = 0; k < fSeeds.length; k++) {
          const q = fSeeds[k]; const dx = X - q.x, dy = Y - q.y;
          if (dx > 60 || dx < -60 || dy > 60 || dy < -60) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          const a = Math.exp(-d / (3.2 + 2.6 * q.w)); if (a > dn) dn = a;
          const m = Math.exp(-d / (10 + 7 * q.w)) * Math.min(1, 0.55 + 0.3 * q.w); if (m > dm) dm = m;
        }
        fDen[i] = dn; fMid[i] = dm;
      }
    }

    T_('density');
    // light density (for warm / cold light spill on the land)
    const dens = new Float32Array(n);
    for (const L of LIGHTS.lights) {
      const st = regState[L.r]; if (st === 'off') continue;
      const p = toDev(L.x, L.y); const xi = Math.round(p[0]), yi = Math.round(p[1]);
      if (xi < 0 || yi < 0 || xi >= W || yi >= H) continue;
      dens[yi * W + xi] += L.b * (st === 'cut' ? 0.3 : 1);
    }
    const densS = boxBlur(dens, W, H, 3.2 * SD, 3), densL = boxBlur(dens, W, H, 9 * SD, 3), densXL = boxBlur(dens, W, H, 15 * SD, 2);
    const dK = 1 / (SD * SD);
    T_('densblur');
    // ------------------------------------------------ compose ImageData
    const img = ctx.createImageData(W, H); const D = img.data;
    const selR = o.select === false ? -1 : REG.findIndex(r => r.state === 'sel');
    const prevSet = o.preview ? new Set(o.preview.map(nm => byName(nm).i)) : null;
    const hexK = 1 / 4.4; // hex cell in design px
    for (let y = 0; y < H; y++) {
      const Y = YA[y]; const ty = y / H;
      // ocean gradient #070D1A -> #0E1A30
      const ty2 = o.oceanFlat ? ty * 0.35 : ty; const oR = mix(7, 14, ty2), oG = mix(13, 26, ty2), oB = mix(26, 48, ty2);
      for (let x = 0; x < W; x++) {
        const i = y * W + x, X = XA[x];
        // ----- ocean
        let r = oR, g = oG, b = oB;
        const deep = N.fbm(X / 70, Y / 70, 3);
        r += deep * 3; g += deep * 5; b += deep * 8;
        const cf = covFar[i], cn = covNear[i];
        // shallows
        r += cf * 10; g += cf * 24; b += cf * 30;
        // shimmer (stretched)
        const sh = N2.fbm(X / 34 + 3, Y / 3.2, 3);
        const shv = Math.max(0, sh - 0.22) * (0.6 + 0.4 * Math.sin(X / 23 + Y / 41));
        r += shv * 20; g += shv * 34; b += shv * 52;
        // graticule
        const gp = Math.abs(((Y - 150 + 1000) % 54.6) - 27.3);
        const gm = Math.abs(((X - 8 + 1000 + Math.sin(Y / 160) * 6) % 46.75) - 23.4);
        const gl = (Math.max(0, 1 - (27.3 - gp) * SD / 0.9) + Math.max(0, 1 - (23.4 - gm) * SD / 0.9)) * 0.06 * (1 - cf);
        r += gl * 140; g += gl * 160; b += gl * 190;
        // depth contours (route-map style)
        if (cov[i] < 0.5 && cf > 0.02) {
          for (const lv of [0.06, 0.16, 0.32]) {
            const gx = (covFar[i + 1] - covFar[i - 1]) * 0.5, gy = (covFar[i + W] - covFar[i - W]) * 0.5;
            const gg = Math.sqrt(gx * gx + gy * gy) + 1e-6;
            const dd = Math.abs(cf - lv) / gg;
            const a = Math.max(0, 1 - dd / (0.55 * dpr)) * 0.07 * (lv === 0.06 ? 0.8 : 1);
            r += a * 120; g += a * 170; b += a * 200;
          }
        }
        // coast glow #2C4A5E
        const cg = cn * (1 - cov[i]);
        r += cg * 44 * 0.55; g += cg * 74 * 0.55; b += cg * 94 * 0.55;
        // sea ice near Farsouth / Cap
        if ((Y > 655 || Y < 182) && cov[i] < 1) {
          const ice = sstep(0.1, 0.2, N2.fbm(X / 6, Y / 3, 4) + cf * 0.6 - 0.12) * sstep(0.03, 0.2, cf) * (Y > 655 ? sstep(652, 672, Y) : sstep(184, 172, Y));
          r = mix(r, 66, ice * 0.75); g = mix(g, 86, ice * 0.75); b = mix(b, 104, ice * 0.75);
        }
        const c = cov[i];
        if (c > 0) {
          const h = hA[i];
          // ----- land relief
          const ri = rid[i];
          const st = ri >= 0 ? regState[ri] : 'lit';
          const hc = clamp(h, 0, 1.2);
          // height & shading (from neighbours)
          const hl = hA[i - 1] || h, hr = hA[i + 1] || h, hu = hA[i - W] || h, hd = hA[i + W] || h;
          const rid0 = N.n2(X / 13, Y / 13), rg = 1 - Math.abs(rid0);
          const mtn = sstep(0.12, 0.55, fA[i]) * rg * rg * rg;
          const dx = (rel[i + 1] - rel[i - 1]) * 0.5 * SD, dy = (rel[i + W] - rel[i - W]) * 0.5 * SD;
          const bump = 0;
          let shade = (-dx * 0.8 - dy) * 20;
          shade = clamp(shade, -1, 1);
          // climate bands
          const cold = Math.max(sstep(250, 210, Y), sstep(600, 650, Y));
          const hot = sstep(352, 392, Y) * sstep(508, 468, Y);
          const tmp = clamp(1 - cold - hot, 0, 1);
          let lr = 23 * tmp + 31 * cold + 31 * hot, lg = 34 * tmp + 42 * cold + 33 * hot, lb = 40 * tmp + 54 * cold + 32 * hot;
          const elev = clamp(rel[i] * 1.3, 0, 1);
          lr += elev * 8; lg += elev * 10; lb += elev * 10;
          // snow on cold heights
          const snow = cold * sstep(0.3, 0.7, elev + N2.fbm(X / 9, Y / 9, 3) * 0.3) * (Y > 400 ? 1 : 0.7);
          lr = mix(lr, 74, snow * 0.6); lg = mix(lg, 92, snow * 0.6); lb = mix(lb, 108, snow * 0.6);
          // ice shelf on Farsouth's south rim
          if (Y > 636) {
            const ie = sstep(636, 668, Y + N2.fbm(X / 9, Y / 9, 3) * 14) * sstep(0.32, 0.02, h - N.fbm(X / 5, Y / 5, 2) * 0.1);
            const crack = 1 - sstep(0.0, 0.06, Math.abs(N2.fbm(X / 6 + 3, Y / 3, 3)));
            lr = mix(lr, 92 - crack * 30, ie * 0.8); lg = mix(lg, 114 - crack * 30, ie * 0.8); lb = mix(lb, 132 - crack * 26, ie * 0.8);
          }
          const paintv = 1 + N.fbm(X / 28, Y / 28, 3) * 0.16;
          lr *= paintv; lg *= paintv; lb *= paintv;
          // relief lit from the north-west, kept low so the lights carry the land at night
          if (shade > 0) { lr += shade * 9; lg += shade * 11.5; lb += shade * 12.5; } else { lr *= 1 + shade * 0.55; lg *= 1 + shade * 0.55; lb *= 1 + shade * 0.5; }
          lr *= 0.8; lg *= 0.82; lb *= 0.86;
          // light spill: warm haze where people are, cold where TIDY runs things
          if (st !== 'off') {
            const dv = clamp((densS[i] * 2.0 + densL[i] * 3.4) * dK * 14, 0, 1.5);
            const hz = clamp(densXL[i] * dK * 160, 0, 1);
            if (frost[i] > 0.45) { lr += dv * 8; lg += dv * 30; lb += dv * 32; }
            else if (st !== 'cut') { lr += dv * 80 + hz * 30; lg += dv * 46 + hz * 17; lb += dv * 8 + hz * 2; }
          }
          // coast rim light
          const rim = sstep(2.5 * SD, 0.0, sd[i]);
          lr += rim * 12; lg += rim * 22; lb += rim * 28;
          // ----- state layers
          if (st === 'off') {
            // switched off: black at ~85%, the painted relief still faintly readable
            const k = 0.86;
            const rl = shade > 0 ? shade * 11 : shade * 5;
            lr = mix(lr, 2, k) + rl * 0.8 + elev * 3; lg = mix(lg, 3, k) + rl * 0.9 + elev * 3.4; lb = mix(lb, 5, k) + rl * 1.1 + elev * 4.2;
          }
          if (st === 'cut') {
            // cut off: the forest colour drains to cold slate under the dead frost
            const lum0 = (lr * 0.3 + lg * 0.5 + lb * 0.2);
            lr = mix(lr, lum0 * 0.5 + 4, 0.9); lg = mix(lg, lum0 * 0.66 + 6, 0.9); lb = mix(lb, lum0 * 0.74 + 9, 0.9);
          }
          // frost: a crystalline sheet, ice-white at TIDY's cities, thinning to a violet front
          const F = frost[i];
          if (F > 0.002) {
            const cut = st === 'cut';
            const Fu = cut ? F / 0.4 : F;
            const Dn = fDen[i], Dm = fMid[i];
            const wv = worley(X / 3.4 + 11.3, Y / 3.4 - 7.1, 913);
            const fed = wv[1] - wv[0], fid = wv[2];
            const facetLine = 1 - sstep(0.02, 0.1, fed);
            const facetLit = 0.8 + 0.32 * fid;
            const t = clamp(Dm * 0.42 + Dn * 0.9, 0, 1);
            let fr, fg, fb;
            if (cut) { const ft = 0.55 + 0.6 * fid; fr = 94 * ft; fg = 127 * ft; fb = 134 * ft; }
            else if (t < 0.5) { const u = t / 0.5; fr = mix(16, 50, u); fg = mix(74, 196, u); fb = mix(86, 200, u); }
            else { const u = (t - 0.5) / 0.5; fr = mix(50, 222, u); fg = mix(196, 255, u); fb = mix(200, 252, u); }
            if (!cut) { fr *= facetLit; fg *= facetLit; fb *= facetLit; }
            const lum = clamp((lr * 0.3 + lg * 0.5 + lb * 0.2 - 14) / 40, 0, 1.3);
            fr += lum * 8; fg += lum * 16; fb += lum * 16;
            const k = cut ? 0.4 * Fu * 0.95 : Fu * (0.38 + 0.56 * t);
            lr = mix(lr, fr, k); lg = mix(lg, fg, k); lb = mix(lb, fb, k);
            // crystal lattice: bright facet edges, densest near the cities
            const LL = facetLine * Fu * (cut ? 0.4 : 0.1 + 0.12 * t);
            const lc = cut ? [140, 170, 178] : (t > 0.62 ? [40, 170, 182] : [215, 255, 250]);
            lr = mix(lr, lc[0], LL); lg = mix(lg, lc[1], LL); lb = mix(lb, lc[2], LL);
            if (!cut) {
              const glit = hash2(x, y, 7) > 0.9975 - t * 0.004 ? Fu * (0.35 + 0.5 * t) : 0;
              lr = mix(lr, 240, glit); lg = mix(lg, 255, glit); lb = mix(lb, 255, glit);
              // violet leading edge, only where the frost faces land it has not taken
              const front = sstep(0.03, 0.22, litS[i]);
              const edge = sstep(0.03, 0.12, Fu) * (1 - sstep(0.2, 0.42, Fu));
              const V = edge * front;
              lr = mix(lr, 140, V) + V * 30; lg = mix(lg, 124, V) + V * 18; lb = mix(lb, 255, V) + V * 40;
            }
          }
          // violet aura just ahead of the frost on land it has not taken
          if (!win && F < 0.35 && st !== 'off' && st !== 'cut') {
            const au = clamp(frostL[i] * 2.0 - F * 3.5 - 0.12, 0, 1) * (1 - offS[i]) * 0.3;
            if (au > 0.004) { lr = mix(lr, 104, au) + au * 18; lg = mix(lg, 90, au) + au * 8; lb = mix(lb, 235, au) + au * 30; }
          }
          // region borders: clear #2C4A5E hairlines so every one of the 42 places reads
          if (ri >= 0) {
            const bdev = bdA[i] * SD;
            let ba = 1 - sstep(0.35 * dpr, 0.35 * dpr + 1.0, bdev);
            if (ba > 0) {
              if (st === 'off') { lr = mix(lr, 58, ba * 0.9); lg = mix(lg, 66, ba * 0.9); lb = mix(lb, 80, ba * 0.9); }
              else if (F > 0.3 && st !== 'cut') { lr = mix(lr, 190, ba * 0.32 * F); lg = mix(lg, 248, ba * 0.32 * F); lb = mix(lb, 250, ba * 0.32 * F); }
              else { lr = mix(lr, 62, ba * 0.62); lg = mix(lg, 104, ba * 0.62); lb = mix(lb, 132, ba * 0.62); }
            }
            // previewed upgrade target (e.g. Old Ways on every Offline region): strong amber glow fill
            if (prevSet && prevSet.has(ri)) {
              const din2 = Math.min(bdev, sd[i]);
              const edgeG = 1 - sstep(0, 7 * SD, din2);
              const inner = 0.24 + 0.4 * edgeG;
              lr = mix(lr, 210, inner * 0.55) + inner * 34; lg = mix(lg, 128, inner * 0.55) + inner * 18; lb = mix(lb, 40, inner * 0.55) + inner * 2;
              const line = 1 - sstep(0.9 * dpr, 1.8 * dpr, din2);
              lr = mix(lr, 255, line); lg = mix(lg, 214, line); lb = mix(lb, 130, line);
            }
            // distance inside region boundary (device px)
            const din = Math.min(bdev, sd[i]);
            // switched-off outline #3A4250
            if (st === 'off') { const a = 1 - sstep(0.6 * dpr, 1.2 * dpr, din); lr = mix(lr, 58, a); lg = mix(lg, 66, a); lb = mix(lb, 80, a); }
            if (st === 'cut') {
              // dashed grey hairline: cut off from the network
              const rc = REG[ri];
              const ang = Math.atan2(Y - rc.y, X - rc.x) * 34;
              const dash = (((ang / 3.2) % 1) + 1) % 1 < 0.55 ? 1 : 0;
              const a = (1 - sstep(0.55 * dpr, 1.15 * dpr, din)) * dash;
              lr = mix(lr, 128, a); lg = mix(lg, 140, a); lb = mix(lb, 158, a);
            }
            // shield hex mesh
            if (st === 'shield') {
              const band = 1 - sstep(0, 11 * SD, din);
              if (band > 0) {
                let hx = X * hexK, hy = Y * hexK;
                const ax = ((hx % 1) + 1) % 1 - 0.5, ay = ((hy % 1.732) + 1.732) % 1.732 - 0.866;
                const bx = (((hx - 0.5) % 1) + 1) % 1 - 0.5, by = (((hy - 0.866) % 1.732) + 1.732) % 1.732 - 0.866;
                let gx, gy; if (ax * ax + ay * ay < bx * bx + by * by) { gx = ax; gy = ay; } else { gx = bx; gy = by; }
                gx = Math.abs(gx); gy = Math.abs(gy);
                const hd = Math.max(gx * 0.5 + gy * 0.866, gx);
                const ed = (0.5 - hd) / hexK * SD; // device px to hex edge
                const line = 1 - sstep(0.3 * dpr, 0.85 * dpr, ed);
                const push = clamp(frostL[i] * 3.2, 0, 1);
                const shimmer = 0.55 + 0.45 * Math.sin(X * 0.9 + Y * 0.35 + N.n2(X / 5, Y / 5) * 4);
                const a = Math.pow(band, 1.5) * (0.5 + 0.5 * push * shimmer);
                lr = mix(lr, 255, line * a * 0.95); lg = mix(lg, 181, line * a * 0.95); lb = mix(lb, 71, line * a * 0.95);
                lr += band * 18 * (0.4 + push); lg += band * 11 * (0.4 + push); lb += band * 3;
                const rimA = 1 - sstep(0.8 * dpr, 1.6 * dpr, din);
                lr = mix(lr, 255, rimA * 0.85); lg = mix(lg, 200, rimA * 0.85); lb = mix(lb, 110, rimA * 0.85);
              }
            }
            if (ri === selR && !win) {
              const a = 1 - sstep(1.5 * dpr - 0.5, 1.5 * dpr + 0.6, din);
              lr = mix(lr, 255, a); lg = mix(lg, 255, a); lb = mix(lb, 255, a);
            }
          }
          r = mix(r, lr, c); g = mix(g, lg, c); b = mix(b, lb, c);
        }
        const j = i * 4;
        D[j] = r; D[j + 1] = g; D[j + 2] = b; D[j + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    T_('compose');
    // ---------------------------------------------- helper canvases & masks
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const seaMask = mk(); {
      const g = seaMask.getContext('2d'); const id = g.createImageData(W, H);
      for (let i = 0; i < n; i++) { id.data[i * 4 + 3] = 255 * (1 - cov[i]); }
      g.putImageData(id, 0, 0);
    }
    const frostMask = mk(); {
      const g = frostMask.getContext('2d'); const id = g.createImageData(W, H);
      for (let i = 0; i < n; i++) { id.data[i * 4 + 3] = 255 * clamp(frost[i] * 1.3, 0, 1); }
      g.putImageData(id, 0, 0);
    }
    const landAt = (X, Y) => { const p = toDev(X, Y); const xi = Math.round(p[0]), yi = Math.round(p[1]); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return 0; return cov[yi * W + xi]; };
    const frostAt = (X, Y) => { const p = toDev(X, Y); const xi = Math.round(p[0]), yi = Math.round(p[1]); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return 0; return frost[yi * W + xi]; };
    const ridAt = (X, Y) => { const p = toDev(X, Y); const xi = Math.round(p[0]), yi = Math.round(p[1]); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return -1; return rid[yi * W + xi]; };

    const AMB = [255, 181, 71], AMBC = [255, 227, 163], CY = [69, 230, 224], ICE = [217, 255, 252];
    const sp = {
      amber: glowSprite(AMB, 64), amberHard: glowSprite([255, 200, 120], 64, true), cyan: glowSprite(CY, 64), ice: glowSprite(ICE, 64, true),
      warm: glowSprite([255, 158, 61], 32), white: glowSprite([255, 245, 225], 64, true), violet: glowSprite([123, 108, 255], 64),
    };
    const dot = (g, spr, X, Y, rad, a) => { const p = toDev(X, Y); const R = rad * SD; g.globalAlpha = a; g.drawImage(spr, p[0] - R, p[1] - R, R * 2, R * 2); };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    // ----------------------------------------------------- routes & cables
    const rng = mulberry32(3301);
    const routes = mk(); const rg = routes.getContext('2d');
    rg.lineCap = 'round'; rg.lineJoin = 'round';
    function strokePts(g, pts, col, wDesign, dash) {
      g.beginPath(); pts.forEach((p, k) => { const d = toDev(p[0], p[1]); k ? g.lineTo(d[0], d[1]) : g.moveTo(d[0], d[1]); });
      g.strokeStyle = col; g.lineWidth = Math.max(0.6, wDesign * SD); g.setLineDash(dash ? dash.map(v => v * SD) : []); g.stroke(); g.setLineDash([]);
    }
    // sea cables (ocean floor): dotted
    const cables = [
      { p: [[350, 174], [364, 188], [372, 204], [372, 222]], blue: true, pulses: 2 },
      { p: [[96, 178], [86, 188], [78, 196], [72, 206]], blue: true, pulses: 1 },
      { p: [[150, 304], [160, 328], [164, 356], [159, 388], [150, 414], [141, 436]], snapped: true },
      { p: [[233, 372], [242, 360], [250, 344], [254, 330]] },
      { p: [[166, 466], [154, 474], [142, 484]] },
      { p: [[232, 458], [238, 490], [240, 530], [238, 572]] },
      { p: [[334, 520], [328, 545], [322, 576]] },
      { p: [[100, 622], [118, 634], [136, 638], [150, 634]] },
      { p: [[194, 352], [210, 363], [221, 371]] },
      { p: [[192, 396], [204, 404], [210, 408]] },
      { p: [[184, 436], [196, 444], [202, 446]] },
    ].map(c => ({ ...c, pts: spline(c.p, 1) }));
    const cablesC = mk(); const cg = cablesC.getContext('2d'); cg.lineCap = 'round';
    for (const c of cables) {
      if (c.snapped) {
        // TIDY's feeder cable to Fennick, snapped where it passed the firebreak: live above, dead below
        const L = polyLen(c.pts); const a = [], b = [];
        let acc = 0; c.pts.forEach((p, k) => { if (k) acc += Math.hypot(p[0] - c.pts[k - 1][0], p[1] - c.pts[k - 1][1]); (acc < L * 0.36 ? a : acc > L * 0.47 ? b : []).push(p); });
        strokePts(cg, a, win ? rgba([44, 74, 94], 0.95) : rgba([69, 200, 210], 0.6), 0.75, [0.6, 1.6]);
        strokePts(cg, b, rgba([58, 66, 80], 0.95), 0.7, [0.6, 1.6]);
        c.ends = [a[a.length - 1], b[0]]; c.live = a;
      } else strokePts(cg, c.pts, c.blue && !win ? rgba([69, 200, 210], 0.55) : rgba([44, 74, 94], 0.95), 0.7, [0.6, 1.6]);
    }
    cg.globalCompositeOperation = 'destination-in'; cg.drawImage(seaMask, 0, 0);
    ctx.drawImage(cablesC, 0, 0);

    // power lines on land + lab lines to base
    const base = { x: 236, y: 583 };
    const labLines = [
      [[118, 540], [108, 568], [92, 598], [100, 622], [126, 637], [158, 632], [196, 612], [222, 596], [base.x, base.y]],
      [[72, 495], [90, 520], [112, 545], [108, 568], [92, 598], [100, 622], [126, 637], [158, 632], [196, 612], [222, 596], [base.x, base.y]],
      [[298, 286], [284, 318], [292, 356], [304, 398], [300, 440], [318, 482], [330, 520], [318, 556], [292, 580], [262, 588], [base.x, base.y]],
      [[338, 398], [318, 420], [302, 442], [318, 482], [330, 520], [318, 556], [292, 580], [262, 588], [base.x, base.y]],
      [[178, 428], [192, 440], [207, 446], [226, 454], [236, 490], [240, 530], [base.x, base.y]],
      [[290, 590], [262, 588], [base.x, base.y]],
    ].map(p => spline(p, 0.8));
    const labPos = [[118, 540], [126, 532], [72, 495], [298, 286], [306, 292], [338, 398], [178, 428], [290, 590]];
    // rivers: thin dark channels with a faint coast-glow edge
    const rivC = mk(); const rv = rivC.getContext('2d'); rv.lineCap = 'round'; rv.lineJoin = 'round';
    for (const R of LIGHTS.rivers) {
      const st = regState[R.r];
      strokePts(rv, R.pts, st === 'off' ? 'rgba(14,18,24,0.7)' : 'rgba(30,52,70,0.35)', 1.6);
      strokePts(rv, R.pts, st === 'off' ? 'rgba(4,6,9,1)' : 'rgba(9,16,28,0.95)', 0.7);
    }
    ctx.drawImage(rivC, 0, 0);
    // power lines (local and trunk), coloured by whoever runs the ground under them
    const gridC = mk(); const gg = gridC.getContext('2d'); gg.lineCap = 'round';
    const lineCol = (X, Y) => {
      const ri = ridAt(X, Y); const st = ri >= 0 ? regState[ri] : 'lit';
      if (st === 'off') return rgba([58, 66, 80], 0.8);
      if (st === 'cut') return rgba([120, 140, 150], 0.22);
      if (st === 'blue' || ((st === 'sel' || st === 'hit') && frostAt(X, Y) > 0.4)) return rgba(CY, 0.3);
      return rgba(AMB, 0.24);
    };
    const strokeColoured = (pts, w) => {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        strokePts(gg, [a, b], lineCol((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), w);
      }
    };
    for (const r of REG) if (r.lines) for (const L of r.lines) strokeColoured(L, 0.42);
    for (const g of LIGHTS.grid) strokeColoured(g.pts, 0.5);
    // land segments of lab lines
    if (!win || true) for (const L of labLines) {
      let seg = []; const flush = () => { if (seg.length > 1) strokePts(gg, seg, rgba(AMB, 0.3), 0.55); seg = []; };
      for (const p of L) { if (landAt(p[0], p[1]) > 0.5) seg.push(p); else { flush(); } }
      flush();
    }
    // blue power lines into the firebreak: the live part ends at the border, the dead part is dimmed
    const deadLine = spline([[116, 268], [118, 296], [112, 316], [106, 336], [100, 362], [96, 392]], 0.6);
    const deadLine2 = spline([[64, 262], [62, 290], [58, 312], [60, 336], [62, 352]], 0.6);
    const blueLines = [];
    if (!win) {
      for (const DL of [deadLine, deadLine2]) {
        const live = [], dead = [];
        let hitOff = false;
        for (const p of DL) {
          if (!hitOff) { const sm = sample(p[0], p[1], true); if (sm.rid >= 0 && regState[sm.rid] === 'off' && sm.h > -0.05) hitOff = true; }
          (hitOff ? dead : live).push(p);
        }
        if (dead.length) dead.unshift(live[live.length - 1]);
        strokePts(gg, live, rgba(CY, 0.55), 0.6);
        if (dead.length > 1) strokePts(gg, dead, rgba([58, 66, 80], 0.95), 0.5);
        blueLines.push(live);
      }
    }
    ctx.drawImage(gridC, 0, 0);

    T_('routes');
    // ------------------------------------------------------- city lights
    const LG = mk(); const lg = LG.getContext('2d'); lg.globalCompositeOperation = 'lighter';
    const sizeK = clamp(1.0 / Math.sqrt(SD / 2), 0.85, 1.35);
    const isBlueLight = (L) => { const st = regState[L.r]; if (st === 'blue' || st === 'cut') return true; if (st === 'sel' || st === 'hit') return frostAt(L.x, L.y) > 0.45; return false; };
    const coreDot = (X, Y, rad, col, a) => { const p = toDev(X, Y); lg.globalAlpha = a; lg.fillStyle = col; lg.beginPath(); lg.arc(p[0], p[1], Math.max(0.5, rad * SD), 0, TAU); lg.fill(); };
    // light pollution haze around clusters
    for (const c of LIGHTS.clusters) {
      const st = regState[c.r]; if (st === 'off') continue;
      const blue = isBlueLight({ r: c.r, x: c.x, y: c.y });
      if (blue && st === 'cut') continue;
      const a = (blue ? 0.07 : 0.17) * Math.min(1.7, c.w);
      dot(lg, blue ? sp.cyan : sp.amber, c.x, c.y, 8 + c.w * 4, a);
      dot(lg, blue ? sp.cyan : sp.amber, c.x, c.y, 3.5 + c.w * 1.6, a * 1.25);
    }
    // amber bloom layer (blurred below) so dense clusters glow like a night photo
    const AB = mk(); const ab = AB.getContext('2d'); ab.globalCompositeOperation = 'lighter';
    for (const L of LIGHTS.lights) {
      const st = regState[L.r]; if (st === 'off') continue;
      const blue = isBlueLight(L);
      if (blue) {
        // TIDY's lights: perfectly synced points, all at the same phase, no twinkle
        if (st === 'cut') {
          dot(lg, sp.cyan, L.x, L.y, 1.8 * sizeK, 0.08);
          coreDot(L.x, L.y, 0.32 * sizeK, '#9FB6BC', 0.45);
        } else {
          dot(lg, sp.cyan, L.x, L.y, 2.6 * sizeK, 0.3);
          coreDot(L.x, L.y, 0.42 * sizeK, '#E9FFFD', 0.95);
        }
      } else {
        const tw = win ? (0.35 + 1.05 * L.tw) : (0.6 + 0.65 * L.tw);
        const b = L.b * tw;
        dot(lg, sp.amber, L.x, L.y, (2.0 + 3.8 * L.b) * sizeK, 0.44 * b);
        coreDot(L.x, L.y, (0.3 + 0.42 * L.b) * sizeK, b > 0.62 ? '#FFF3DA' : '#FFD58A', Math.min(1, 0.42 + 0.72 * b));
        dot(ab, sp.amber, L.x, L.y, 7, 0.85 * L.b);
      }
    }
    // synced city points: TIDY's cities are bigger points on the same beat (no rings)
    if (!win) for (const r of REG) {
      const st = regState[r.i]; if (!(st === 'blue') || !r.cents) continue;
      for (let k = 0; k < r.cents.length; k++) {
        const c = r.cents[k]; const big = k === 0;
        dot(lg, sp.cyan, c[0], c[1], big ? 7 : 4.5, big ? 0.55 : 0.4);
        dot(lg, sp.ice, c[0], c[1], big ? 2.2 : 1.5, 0.95);
      }
    }
    // twinkle glints on the brightest amber lights
    for (const L of LIGHTS.lights) {
      const st = regState[L.r]; if (st === 'off' || !L.big) continue;
      if (isBlueLight(L)) continue;
      if (L.tw < (win ? 0.55 : 0.8)) continue;
      const p = toDev(L.x, L.y); const R = (win ? 4.2 : 3.4) * SD * sizeK;
      lg.globalAlpha = 0.55;
      const gr = lg.createLinearGradient(p[0] - R, 0, p[0] + R, 0);
      gr.addColorStop(0, 'rgba(255,214,140,0)'); gr.addColorStop(0.5, 'rgba(255,236,190,0.9)'); gr.addColorStop(1, 'rgba(255,214,140,0)');
      lg.fillStyle = gr; lg.fillRect(p[0] - R, p[1] - 0.35 * dpr, R * 2, 0.7 * dpr);
      const gv = lg.createLinearGradient(0, p[1] - R, 0, p[1] + R);
      gv.addColorStop(0, 'rgba(255,214,140,0)'); gv.addColorStop(0.5, 'rgba(255,236,190,0.9)'); gv.addColorStop(1, 'rgba(255,214,140,0)');
      lg.fillStyle = gv; lg.fillRect(p[0] - 0.35 * dpr, p[1] - R, 0.7 * dpr, R * 2);
    }
    // candle flickers in switched-off places
    for (const r of REG) {
      if (regState[r.i] !== 'off' || !r.flick) continue;
      for (const f of r.flick) {
        dot(lg, sp.warm, f.x, f.y, 5.2 * sizeK, 0.42 * f.a);
        dot(lg, sp.warm, f.x, f.y, 2.4 * sizeK, 0.5 * f.a);
        for (const d of f.dots) {
          const p = toDev(d[0], d[1]); lg.globalAlpha = Math.min(1, f.a * d[2] * 1.1);
          lg.fillStyle = d[2] > 0.8 ? '#FFD9A0' : '#FF9E3D';
          lg.beginPath(); lg.arc(p[0], p[1], Math.max(0.7, 0.62 * SD * sizeK * (0.7 + 0.5 * d[2])), 0, TAU); lg.fill();
        }
      }
    }
    // warm bloom (#FFB547, ~12%) over the dense clusters, then the lights themselves
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${7 * SD}px)`; ctx.globalAlpha = o.bloom || 0.3; ctx.drawImage(AB, 0, 0);
    ctx.filter = `blur(${2.4 * SD}px)`; ctx.globalAlpha = 0.12; ctx.drawImage(AB, 0, 0);
    ctx.filter = 'none'; ctx.restore();
    ctx.drawImage(LG, 0, 0);

    T_('lights');
    // ------------------------------------------------- frost crystals
    // Small six-armed ice stars sit on TIDY's cities; at the front, thin crystalline
    // fingers reach into land it has not taken yet, tipped with violet.
    if (!win && fSeeds.length) {
      const drng = mulberry32(42);
      const segs = []; // [x1,y1,x2,y2,t,depth,kind]  kind 0 city star, 1 front finger
      const tips = [];
      // city crystals: straight six-armed dendrites with 60-degree branches, bright
      // ice-white at the city and thinning to faint cyan as they spread out
      const xsegs = []; // [x1,y1,x2,y2, a(0..1 brightness), depth, cut]
      function xarm(cx, cy, R, x, y, ang, len, depth, cut) {
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        const steps = Math.max(1, Math.round(len / 2.2));
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps, t1 = (k + 1) / steps;
          const ax = mix(x, ex, t0), ay = mix(y, ey, t0), bx = mix(x, ex, t1), by = mix(y, ey, t1);
          const dm = Math.hypot((ax + bx) / 2 - cx, (ay + by) / 2 - cy);
          xsegs.push([ax, ay, bx, by, Math.exp(-dm / (0.42 * R)), depth, cut]);
        }
        if (depth >= 2) return;
        const nb = depth === 0 ? Math.max(2, Math.floor(len / 3.4)) : Math.max(1, Math.floor(len / 4.2));
        for (let j = 0; j < nb; j++) {
          const t = (j + 0.55) / (nb + 0.35);
          const bx = mix(x, ex, t), by = mix(y, ey, t);
          const bl = len * (1 - t) * (depth === 0 ? 0.52 : 0.45) * (0.75 + drng() * 0.4);
          if (bl < 0.9) continue;
          xarm(cx, cy, R, bx, by, ang + Math.PI / 3, bl, depth + 1, cut);
          xarm(cx, cy, R, bx, by, ang - Math.PI / 3, bl * (0.85 + drng() * 0.3), depth + 1, cut);
        }
      }
      for (const q of fSeeds) {
        const R = (7 + 6.5 * Math.min(q.w, 2.6)) * (q.cut ? 0.85 : 1);
        const a0 = drng() * TAU;
        for (let k = 0; k < 6; k++) xarm(q.x, q.y, R, q.x, q.y, a0 + k * TAU / 6 + (drng() - 0.5) * 0.06, R * (0.8 + drng() * 0.35), 0, q.cut);
      }
      // smaller crystals on TIDY's lesser lights
      for (const Lt of LIGHTS.lights) {
        if (Lt.b < 0.55 || drng() > 0.22) continue;
        const st = regState[Lt.r]; if (!(st === 'blue' || st === 'cut')) continue;
        const R = 2.6 + drng() * 2.6, a0 = drng() * TAU;
        for (let k = 0; k < 6; k++) xarm(Lt.x, Lt.y, R * 1.4, Lt.x, Lt.y, a0 + k * TAU / 6, R, 1, st === 'cut');
      }
      {
        const XC = mk(); const xc = XC.getContext('2d'); xc.lineCap = 'round';
        const XG = mk(); const xg = XG.getContext('2d'); xg.lineCap = 'round';
        const wd = [0.5, 0.32, 0.22];
        for (const sg of xsegs) {
          const A = toDev(sg[0], sg[1]), B = toDev(sg[2], sg[3]); const a = sg[4];
          if (sg[6]) {
            xc.strokeStyle = `rgba(150,180,188,${0.28 * (0.35 + 0.65 * a)})`;
            xc.lineWidth = Math.max(0.5, wd[sg[5]] * SD * 0.9);
          } else {
            const r = Math.round(mix(69, 236, a)), g = Math.round(mix(220, 255, a)), b = Math.round(mix(222, 253, a));
            xc.strokeStyle = `rgba(${r},${g},${b},${0.3 + 0.68 * a})`;
            xc.lineWidth = Math.max(0.5, wd[sg[5]] * SD * (0.6 + 0.6 * a));
            xg.strokeStyle = `rgba(69,230,224,${0.18 + 0.5 * a})`; xg.lineWidth = wd[sg[5]] * SD * 3.2;
            xg.beginPath(); xg.moveTo(A[0], A[1]); xg.lineTo(B[0], B[1]); xg.stroke();
          }
          xc.beginPath(); xc.moveTo(A[0], A[1]); xc.lineTo(B[0], B[1]); xc.stroke();
        }
        const XB = mk(); const xb = XB.getContext('2d'); xb.filter = `blur(${1.3 * SD}px)`; xb.drawImage(XG, 0, 0);
        for (const C of [XB, XC]) { const g = C.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(frostMask, 0, 0); }
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5; ctx.drawImage(XB, 0, 0);
        ctx.globalAlpha = 0.95; ctx.drawImage(XC, 0, 0); ctx.restore();
      }
      // front fingers
      function finger(x, y, ang, len, depth) {
        let px = x, py = y, a = ang; const pts = [[x, y]];
        for (let k = 0; k < 3; k++) {
          a += (drng() - 0.5) * 0.16;
          const nx = px + Math.cos(a) * len / 3, ny = py + Math.sin(a) * len / 3;
          segs.push([px, py, nx, ny, (k + 1) / 3, depth, 1]); pts.push([nx, ny]); px = nx; py = ny;
        }
        tips.push([px, py, depth]);
        if (depth === 0) {
          const nb = 2 + Math.floor(drng() * 2);
          for (let k = 0; k < nb; k++) {
            const t = 0.28 + 0.55 * k / nb + (drng() - 0.5) * 0.08;
            const sgi = Math.min(2, Math.floor(t * 3)), ft = t * 3 - sgi;
            const bx = mix(pts[sgi][0], pts[sgi + 1][0], ft), by = mix(pts[sgi][1], pts[sgi + 1][1], ft);
            const bl = len * (0.4 * (1 - t) + 0.08);
            finger(bx, by, ang + Math.PI / 3 + (drng() - 0.5) * 0.12, bl * (0.8 + drng() * 0.4), 1);
            finger(bx, by, ang - Math.PI / 3 + (drng() - 0.5) * 0.12, bl * (0.8 + drng() * 0.4), 1);
          }
        }
      }
      const g0 = toDev(BOX.x0, BOX.y0);
      for (let Y = BOX.y0; Y < BOX.y0 + BOX.h; Y += 1.6) for (let X = BOX.x0; X < BOX.x0 + BOX.w; X += 1.6) {
        const d = toDev(X + (drng() - 0.5) * 1.2, Y + (drng() - 0.5) * 1.2); const xi = Math.round(d[0]), yi = Math.round(d[1]);
        if (xi < 3 || yi < 3 || xi >= W - 3 || yi >= H - 3) continue;
        const i = yi * W + xi; const ri = rid[i]; if (ri < 0) continue;
        const st = regState[ri]; if (st === 'cut' || st === 'off') continue;
        const F = frost[i]; if (F < 0.28 || F > 0.92 || litS[i] < 0.05 || cov[i] < 0.9) continue;
        if (drng() > (st === 'sel' ? 0.2 : 0.4)) continue;
        const k2 = Math.max(2, Math.round(1.2 * SD));
        let gx = litS[i + k2] - litS[i - k2], gy = litS[i + k2 * W] - litS[i - k2 * W];
        const gl = Math.hypot(gx, gy); if (gl < 1e-4) continue;
        const ang = Math.atan2(gy, gx) + (drng() - 0.5) * 0.7;
        const len = (st === 'sel' ? 6 + drng() * 7 : 4 + drng() * 6) * (0.8 + 0.4 * litS[i]);
        finger(X, Y, ang, len, 0);
      }
      // mask: land the frost may enter (not the firebreak, not shielded ground)
      const dMask = mk(); {
        const g = dMask.getContext('2d'); const id = g.createImageData(W, H);
        for (let i = 0; i < n; i++) id.data[i * 4 + 3] = 255 * clamp(cov[i] * (1 - offS[i]) * (1 - shS[i]) * (rid[i] >= 0 && regState[rid[i]] === 'cut' ? 0 : 1) + (frost[i] > 0.05 && rid[i] >= 0 && regState[rid[i]] === 'cut' ? 1 : 0), 0, 1);
        g.putImageData(id, 0, 0);
      }
      const FD = mk(); const fd = FD.getContext('2d'); fd.lineCap = 'round';
      const FG = mk(); const fgx = FG.getContext('2d'); fgx.lineCap = 'round';
      const colAt = (t, kind, alpha) => {
        if (kind === 2) return `rgba(150,178,186,${alpha * 0.4})`;
        if (kind === 0) return `rgba(232,255,253,${alpha})`;
        const u = sstep(0.55, 1.0, t);
        return `rgba(${Math.round(mix(225, 168, u))},${Math.round(mix(255, 156, u))},${Math.round(mix(252, 255, u))},${alpha})`;
      };
      for (const sg of segs) {
        const A = toDev(sg[0], sg[1]), B = toDev(sg[2], sg[3]);
        const wBase = sg[6] === 1 ? (sg[5] === 0 ? 0.62 : 0.36) : (sg[5] === 0 ? 0.5 : 0.3);
        const al = sg[6] === 1 ? (sg[5] === 0 ? 0.92 : 0.7) * (1 - 0.35 * sg[4]) : 0.95;
        fd.strokeStyle = colAt(sg[4], sg[6], al); fd.lineWidth = Math.max(0.55, wBase * SD * (sg[6] === 1 ? 1 - 0.45 * sg[4] : 1));
        fd.beginPath(); fd.moveTo(A[0], A[1]); fd.lineTo(B[0], B[1]); fd.stroke();
        fgx.strokeStyle = sg[6] === 1 ? `rgba(${sg[4] > 0.7 ? '123,108,255' : '69,230,224'},0.6)` : (sg[6] === 2 ? 'rgba(94,127,134,0.2)' : 'rgba(69,230,224,0.7)');
        fgx.lineWidth = wBase * 3.2 * SD;
        fgx.beginPath(); fgx.moveTo(A[0], A[1]); fgx.lineTo(B[0], B[1]); fgx.stroke();
      }
      for (const t of tips) {
        const p = toDev(t[0], t[1]);
        fd.globalAlpha = t[2] === 0 ? 0.95 : 0.7;
        fd.drawImage(sp.violet, p[0] - 2.6 * SD, p[1] - 2.6 * SD, 5.2 * SD, 5.2 * SD);
        fd.fillStyle = '#CFC8FF'; fd.beginPath(); fd.arc(p[0], p[1], Math.max(0.6, (t[2] === 0 ? 0.42 : 0.3) * SD), 0, TAU); fd.fill();
      }
      fd.globalAlpha = 1;
      const FB = mk(); const fb = FB.getContext('2d'); fb.filter = `blur(${1.4 * SD}px)`; fb.drawImage(FG, 0, 0);
      for (const C of [FB, FD]) { const g = C.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(dMask, 0, 0); }
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.55; ctx.drawImage(FB, 0, 0);
      ctx.globalAlpha = 1; ctx.drawImage(FD, 0, 0); ctx.restore();
    }

    T_('crystals');
    // ------------------------------------------------------------ pulses
    const PG = mk(); const pg = PG.getContext('2d'); pg.globalCompositeOperation = 'lighter';
    function comet(path, d, col, len, wid, a) {
      const p = pointAt(path, d); const q = pointAt(path, Math.max(0, d - len));
      const P = toDev(p[0], p[1]), Q = toDev(q[0], q[1]);
      const gr = pg.createLinearGradient(Q[0], Q[1], P[0], P[1]);
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, a));
      pg.strokeStyle = gr; pg.lineWidth = wid * SD; pg.lineCap = 'round';
      pg.beginPath(); pg.moveTo(Q[0], Q[1]); pg.lineTo(P[0], P[1]); pg.stroke();
      dot(pg, col === CY ? sp.ice : sp.white, p[0], p[1], 1.1, a);
      dot(pg, col === CY ? sp.cyan : sp.amber, p[0], p[1], 4.5, a * 0.6);
    }
    if (!win) {
      // amber lab pulses heading to base
      labLines.forEach((L, k) => {
        const len = polyLen(L); const nP = Math.max(1, Math.round(len / 46));
        for (let j = 0; j < nP; j++) { const d = ((j + 0.35 + k * 0.17) / nP) * len; comet(L, d % len, AMB, 7, 0.8, 0.9); }
      });
      // blue synced pulses on cables from the north
      for (const c of cables.filter(c => c.blue)) {
        const len = polyLen(c.pts);
        for (let j = 0; j < c.pulses; j++) comet(c.pts, ((j + 0.6) / c.pulses) * len, CY, 6, 0.8, 0.95);
      }
      // blue pulses on lines that stop dead at the firebreak
      for (const BL of blueLines) {
        const len = polyLen(BL);
        comet(BL, len * 0.45, CY, 5, 0.8, 0.9);
        comet(BL, len - 0.3, CY, 6, 0.9, 1);
        const e = BL[BL.length - 1];
        // spark burst where the pulse hits the firebreak border
        dot(pg, sp.cyan, e[0], e[1], 9, 0.7);
        dot(pg, sp.ice, e[0], e[1], 3, 1);
        const P = toDev(e[0], e[1]); const dir = pointAt(BL, len - 0.5)[2];
        const brng = mulberry32(Math.round(e[0] * 31 + e[1]));
        pg.lineCap = 'round';
        for (let k = 0; k < 9; k++) {
          const a = dir + Math.PI + (brng() - 0.5) * 2.6 + (k % 2 ? 0 : Math.PI * 0.0);
          const r0 = 1.4 * SD, r1 = (3.4 + brng() * 3.6) * SD;
          pg.strokeStyle = k % 3 ? 'rgba(181,255,249,0.9)' : 'rgba(255,255,255,0.95)';
          pg.lineWidth = Math.max(0.7, 0.4 * SD);
          pg.beginPath(); pg.moveTo(P[0] + Math.cos(a) * r0, P[1] + Math.sin(a) * r0); pg.lineTo(P[0] + Math.cos(a) * r1, P[1] + Math.sin(a) * r1); pg.stroke();
        }
        for (let k = 0; k < 5; k++) {
          const a = dir + Math.PI + (brng() - 0.5) * 3, r = (3 + brng() * 4) * SD;
          pg.fillStyle = '#D9FFFC'; pg.globalAlpha = 0.6 + brng() * 0.4;
          pg.beginPath(); pg.arc(P[0] + Math.cos(a) * r, P[1] + Math.sin(a) * r, Math.max(0.5, 0.3 * SD), 0, TAU); pg.fill();
        }
        pg.globalAlpha = 1;
      }
      // snapped cable: frayed ends, a pulse dying at the break, sparks falling into the sea
      const sc = cables.find(c => c.snapped);
      comet(sc.live, polyLen(sc.live) - 0.4, CY, 6, 0.85, 0.95);
      sc.ends.forEach((e, ei) => {
        const dirp = ei === 0 ? pointAt(sc.live, polyLen(sc.live) - 0.5)[2] : Math.atan2(sc.ends[1][1] - sc.ends[0][1], sc.ends[1][0] - sc.ends[0][0]);
        const P = toDev(e[0], e[1]);
        // frayed strands
        pg.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const a = dirp + (ei === 0 ? 0 : Math.PI) + (k - 1) * 0.55;
          pg.strokeStyle = 'rgba(255,214,150,0.9)'; pg.lineWidth = Math.max(0.6, 0.35 * SD);
          pg.beginPath(); pg.moveTo(P[0], P[1]); pg.lineTo(P[0] + Math.cos(a) * 1.8 * SD, P[1] + Math.sin(a) * 1.8 * SD); pg.stroke();
        }
        dot(pg, sp.amber, e[0], e[1], 14, 1);
        dot(pg, sp.amberHard, e[0], e[1], 5, 1);
        dot(pg, sp.white, e[0], e[1], 3.2, 1);
        const srng = mulberry32(71 + ei * 13);
        for (let k = 0; k < 22; k++) {
          const ang = -Math.PI / 2 + (srng() - 0.5) * 2.6, v0 = 2 + srng() * 4.5;
          const t = srng();
          const ox = Math.cos(ang) * v0 * (0.5 + t), oy = Math.sin(ang) * v0 * (0.5 + t) + t * t * 15;
          const q = toDev(e[0] + ox, e[1] + oy);
          const q0 = toDev(e[0] + ox * 0.82, e[1] + oy - 1.6 - t * 1.4);
          const al = 0.95 - t * 0.55;
          const tg = pg.createLinearGradient(q0[0], q0[1], q[0], q[1]);
          tg.addColorStop(0, 'rgba(255,181,71,0)'); tg.addColorStop(1, `rgba(255,213,138,${al})`);
          pg.strokeStyle = tg; pg.lineWidth = Math.max(0.6, 0.32 * SD);
          pg.beginPath(); pg.moveTo(q0[0], q0[1]); pg.lineTo(q[0], q[1]); pg.stroke();
          pg.globalAlpha = al; pg.fillStyle = k % 3 ? '#FFD58A' : '#FFFFFF';
          pg.beginPath(); pg.arc(q[0], q[1], (0.4 + srng() * 0.35) * SD, 0, TAU); pg.fill(); pg.globalAlpha = 1;
        }
      });
      // a snapped-link badge beside the gap
      {
        const m = [(sc.ends[0][0] + sc.ends[1][0]) / 2, (sc.ends[0][1] + sc.ends[1][1]) / 2];
        const M = toDev(m[0] + 9, m[1] - 2); const u = SD;
        pg.save(); pg.globalCompositeOperation = 'source-over';
        pg.fillStyle = 'rgba(8,12,20,0.92)'; pg.strokeStyle = 'rgba(232,238,248,0.35)'; pg.lineWidth = Math.max(0.8, 0.5 * u);
        pg.beginPath(); pg.arc(M[0], M[1], 5.6 * u, 0, TAU); pg.fill(); pg.stroke();
        pg.translate(M[0], M[1]); pg.rotate(-Math.PI / 4);
        pg.strokeStyle = '#E8EEF8'; pg.lineWidth = Math.max(0.9, 0.75 * u); pg.lineCap = 'round';
        const half = (dir) => { pg.beginPath(); pg.moveTo(dir * 0.9 * u, -1.1 * u); pg.lineTo(dir * 2.6 * u, -1.1 * u); pg.arc(dir * 2.6 * u, 0, 1.1 * u, -Math.PI / 2, Math.PI / 2, dir < 0); pg.lineTo(dir * 0.9 * u, 1.1 * u); pg.stroke(); };
        half(1); half(-1);
        pg.strokeStyle = '#FFB547'; pg.lineWidth = Math.max(0.8, 0.55 * u);
        pg.beginPath(); pg.moveTo(-0.3 * u, -2.6 * u); pg.lineTo(0.3 * u, -1.8 * u); pg.moveTo(-0.3 * u, 2.6 * u); pg.lineTo(0.3 * u, 1.8 * u); pg.stroke();
        pg.restore();
      }
    }
    ctx.drawImage(PG, 0, 0);

    // ----------------------------------------------------- arcs, beams, base
    const FX = mk(); const fx = FX.getContext('2d'); fx.lineCap = 'round';
    const out = { toCss, SD, s, base, labPos, regions: REG };
    if (!win) {
      // flight arc Glassharbour -> Tern Isle (flashing)
      const gh = o.airport || [134, 247], tern = hitP;
      const arc = quadPts(gh, o.flightCtrl || [196, 262], tern, 90);
      fx.globalCompositeOperation = 'lighter';
      for (let k = 1; k < arc.length; k++) {
        const t = k / arc.length;
        const a = toDev(arc[k - 1][0], arc[k - 1][1]), b = toDev(arc[k][0], arc[k][1]);
        fx.strokeStyle = rgba(CY, 0.14 * t); fx.lineWidth = 5 * SD; fx.beginPath(); fx.moveTo(a[0], a[1]); fx.lineTo(b[0], b[1]); fx.stroke();
        fx.strokeStyle = rgba(ICE, 0.25 + 0.7 * t); fx.lineWidth = (0.6 + 0.6 * t) * SD; fx.beginPath(); fx.moveTo(a[0], a[1]); fx.lineTo(b[0], b[1]); fx.stroke();
      }
      // landing burst (no ring: the dashed ring belongs to the next hop only)
      dot(fx, sp.cyan, tern[0], tern[1], 12, 0.75); dot(fx, sp.ice, tern[0], tern[1], 3.2, 1);
      { const T = toDev(tern[0], tern[1]); const brng = mulberry32(5);
        fx.lineCap = 'round';
        for (let k = 0; k < 10; k++) { const a = k * TAU / 10 + brng() * 0.3, r0 = 2.2 * SD, r1 = (4 + brng() * 3.2) * SD;
          fx.strokeStyle = k % 2 ? 'rgba(217,255,252,0.75)' : 'rgba(69,230,224,0.6)'; fx.lineWidth = Math.max(0.6, 0.32 * SD);
          fx.beginPath(); fx.moveTo(T[0] + Math.cos(a) * r0, T[1] + Math.sin(a) * r0); fx.lineTo(T[0] + Math.cos(a) * r1, T[1] + Math.sin(a) * r1); fx.stroke(); } }
      // airport glyph at Glassharbour: a tiny plane
      { const G = toDev(gh[0], gh[1]); const ah0 = pointAt(arc, 2)[2];
        dot(fx, sp.cyan, gh[0], gh[1], 6, 0.5);
        fx.save(); fx.translate(G[0], G[1]); fx.rotate(ah0 + Math.PI / 2); const u = SD * 0.62;
        fx.globalCompositeOperation = 'source-over'; fx.fillStyle = '#E9FFFD';
        fx.beginPath(); fx.moveTo(0, -4 * u); fx.quadraticCurveTo(0.7 * u, -3.4 * u, 0.7 * u, -1.6 * u); fx.lineTo(4 * u, 0.6 * u); fx.lineTo(4 * u, 1.5 * u); fx.lineTo(0.7 * u, 0.6 * u);
        fx.lineTo(0.6 * u, 2.8 * u); fx.lineTo(1.7 * u, 3.7 * u); fx.lineTo(1.7 * u, 4.3 * u); fx.lineTo(0, 3.8 * u); fx.lineTo(-1.7 * u, 4.3 * u); fx.lineTo(-1.7 * u, 3.7 * u); fx.lineTo(-0.6 * u, 2.8 * u);
        fx.lineTo(-0.7 * u, 0.6 * u); fx.lineTo(-4 * u, 1.5 * u); fx.lineTo(-4 * u, 0.6 * u); fx.lineTo(-0.7 * u, -1.6 * u); fx.quadraticCurveTo(-0.7 * u, -3.4 * u, 0, -4 * u); fx.fill();
        fx.restore(); fx.globalCompositeOperation = 'lighter'; }
      // next-hop dotted arc Tern Isle -> Middling
      const mid = byName('Middling');
      const tgt = [mid.x - 1, mid.y];
      const hop = quadPts(tern, o.hopCtrl || [176, 352], tgt, 120);
      const hl = polyLen(hop);
      fx.globalCompositeOperation = 'lighter';
      for (let d = 2.5; d < hl - 3.5; d += 2.6) {
        const p = pointAt(hop, d); dot(fx, sp.cyan, p[0], p[1], 2.6, 0.45); dot(fx, sp.ice, p[0], p[1], 0.75, 0.95);
      }
      // arrow head
      const ah = pointAt(hop, hl - 3.2); const A = toDev(ah[0], ah[1]);
      fx.save(); fx.translate(A[0], A[1]); fx.rotate(ah[2]);
      fx.fillStyle = rgba(ICE, 0.95); fx.beginPath(); fx.moveTo(1.8 * SD, 0); fx.lineTo(-1.6 * SD, -1.6 * SD); fx.lineTo(-0.8 * SD, 0); fx.lineTo(-1.6 * SD, 1.6 * SD); fx.closePath(); fx.fill(); fx.restore();
      // target reticle
      const Tg = toDev(tgt[0], tgt[1]);
      fx.setLineDash([2 * SD, 1.6 * SD]); fx.strokeStyle = rgba(CY, 0.85); fx.lineWidth = 0.75 * SD;
      fx.beginPath(); fx.arc(Tg[0], Tg[1], 9 * SD, 0, TAU); fx.stroke(); fx.setLineDash([]);
      fx.strokeStyle = rgba(CY, 0.25); fx.beginPath(); fx.arc(Tg[0], Tg[1], 13 * SD, 0, TAU); fx.stroke();
      out.hopTarget = tgt;
    }
    ctx.drawImage(FX, 0, 0);

    // labs (flask icons)
    function flask(X, Y, sz) {
      const p = toDev(X, Y); const k = sz * SD / 8;
      ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; const gl = sp.amber; ctx.drawImage(gl, -9, -9, 18, 18);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const path = new Path2D('M-1.5,-4.2 L1.5,-4.2 L1.5,-1.2 L4,3.2 Q4.4,4.2 3.3,4.2 L-3.3,4.2 Q-4.4,4.2 -4,3.2 L-1.5,-1.2 Z');
      ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(7,10,16,0.85)'; ctx.stroke(path);
      ctx.fillStyle = '#FFB547'; ctx.fill(path);
      ctx.fillStyle = '#FFE3A3'; ctx.fillRect(-2.2, -4.9, 4.4, 1.1);
      ctx.fillStyle = 'rgba(120,60,0,0.55)'; ctx.beginPath(); ctx.moveTo(-2.6, 1.6); ctx.lineTo(2.6, 1.6); ctx.lineTo(3.4, 3.4); ctx.lineTo(-3.4, 3.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const labIcons = [[112, 532], [124, 539], [74, 488], [290, 300], [302, 304], [346, 410], [174, 434], [292, 583]];
    labIcons.forEach(p => flask(p[0], p[1], o.labSize || 8.5));

    // upgrade preview: a small amber shield glyph on every region the switch would touch
    if (prevSet) {
      for (const ri of prevSet) {
        const r = REG[ri]; const c = r.cents ? r.cents[0] : [r.x, r.y];
        const X = c[0] + 6, Y = c[1] - 6;
        const p = toDev(X, Y); const R = 4.6 * SD;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(sp.amber, p[0] - R * 3, p[1] - R * 3, R * 6, R * 6);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        const hex = (rr) => { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 3; ctx.lineTo(p[0] + Math.cos(a) * rr, p[1] + Math.sin(a) * rr); } ctx.closePath(); };
        hex(R + 1.2 * SD); ctx.fillStyle = 'rgba(14,10,4,0.85)'; ctx.fill();
        hex(R); ctx.fillStyle = 'rgba(255,181,71,0.22)'; ctx.fill(); ctx.lineWidth = 1.1 * SD; ctx.strokeStyle = '#FFB547'; ctx.stroke();
        hex(R * 0.45); ctx.lineWidth = 0.8 * SD; ctx.strokeStyle = '#FFE3A3'; ctx.stroke();
        ctx.restore();
      }
    }

    // beams (6 x 28 design px): a light shaft topped by a bright spark you tap (it bobs gently)
    function beam(X, Y, hgt) {
      const p = toDev(X, Y); const w = 6 * SD, hh = hgt * SD;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // ground splash
      ctx.globalAlpha = 0.7; ctx.drawImage(sp.amber, p[0] - 7 * SD, p[1] - 2.6 * SD, 14 * SD, 5.2 * SD);
      // shaft
      const gr = ctx.createLinearGradient(0, p[1], 0, p[1] - hh);
      gr.addColorStop(0, 'rgba(255,181,71,0.62)'); gr.addColorStop(0.6, 'rgba(255,181,71,0.26)'); gr.addColorStop(1, 'rgba(255,181,71,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = gr;
      ctx.filter = `blur(${0.9 * SD}px)`;
      ctx.beginPath(); ctx.moveTo(p[0] - w / 2, p[1]); ctx.lineTo(p[0] - w * 0.3, p[1] - hh); ctx.lineTo(p[0] + w * 0.3, p[1] - hh); ctx.lineTo(p[0] + w / 2, p[1]); ctx.closePath(); ctx.fill();
      ctx.filter = 'none';
      const gc = ctx.createLinearGradient(0, p[1], 0, p[1] - hh);
      gc.addColorStop(0, 'rgba(255,236,200,0.85)'); gc.addColorStop(1, 'rgba(255,227,163,0)');
      ctx.fillStyle = gc; ctx.fillRect(p[0] - 0.55 * SD, p[1] - hh, 1.1 * SD, hh);
      ctx.restore();
      // bob: a soft vertical smear behind the spark
      const t = toDev(X, Y - hgt - 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
      ctx.drawImage(sp.amber, t[0] - 5 * SD, t[1] - 9 * SD, 10 * SD, 18 * SD); ctx.restore();
      spark(X, Y - hgt - 3, 6.2, true);
    }
    function spark(X, Y, R, big) {
      const p = toDev(X, Y); const r = R * SD;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = big ? 0.95 : 0.8; ctx.drawImage(sp.amber, p[0] - r * 2.6, p[1] - r * 2.6, r * 5.2, r * 5.2);
      ctx.restore();
      ctx.save();
      // four-point spark (same glyph as the Sparks counter)
      const star = (rr, inner) => { ctx.beginPath(); ctx.moveTo(p[0], p[1] - rr); ctx.quadraticCurveTo(p[0] + rr * inner, p[1] - rr * inner, p[0] + rr, p[1]); ctx.quadraticCurveTo(p[0] + rr * inner, p[1] + rr * inner, p[0], p[1] + rr); ctx.quadraticCurveTo(p[0] - rr * inner, p[1] + rr * inner, p[0] - rr, p[1]); ctx.quadraticCurveTo(p[0] - rr * inner, p[1] - rr * inner, p[0], p[1] - rr); ctx.closePath(); };
      ctx.shadowColor = 'rgba(10,8,4,0.6)'; ctx.shadowBlur = 2 * SD;
      star(r, 0.13); ctx.fillStyle = '#FFB547'; ctx.fill();
      ctx.shadowBlur = 0;
      star(r * 0.55, 0.13); ctx.fillStyle = '#FFE3A3'; ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9;
      ctx.drawImage(sp.white, p[0] - r * 0.5, p[1] - r * 0.5, r, r);
      ctx.restore();
    }
    out.spark = spark;
    if (!win && o.beams !== false) for (const bm of (o.beamAt || [[330, 500], [306, 640]])) beam(bm[0], bm[1], 28);

    // base: a soft column of light (~18 px wide at the ground, gone by ~70 px) over a pool of glow
    function column(hgt, wGround, strength) {
      const p = toDev(base.x, base.y);
      const H = hgt * SD, Wg = wGround * SD;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // ground pool
      ctx.globalAlpha = 1 * strength; ctx.drawImage(sp.amber, p[0] - 36 * SD, p[1] - 11 * SD, 72 * SD, 22 * SD);
      ctx.globalAlpha = 0.55 * strength; ctx.drawImage(sp.amberHard, p[0] - 16 * SD, p[1] - 5 * SD, 32 * SD, 10 * SD);
      // soft body of the column
      const layer = (wb, wt, a0, blur) => {
        const g = ctx.createLinearGradient(0, p[1], 0, p[1] - H);
        g.addColorStop(0, `rgba(255,190,90,${a0})`); g.addColorStop(0.45, `rgba(255,181,71,${a0 * 0.7})`); g.addColorStop(0.8, `rgba(255,181,71,${a0 * 0.28})`); g.addColorStop(1, 'rgba(255,181,71,0)');
        ctx.fillStyle = g; ctx.filter = `blur(${blur * SD}px)`; ctx.globalAlpha = strength;
        ctx.beginPath(); ctx.moveTo(p[0] - wb / 2, p[1]); ctx.lineTo(p[0] - wt / 2, p[1] - H); ctx.lineTo(p[0] + wt / 2, p[1] - H); ctx.lineTo(p[0] + wb / 2, p[1]); ctx.closePath(); ctx.fill();
      };
      layer(Wg * 1.9, Wg * 1.7, 0.22, 6);
      layer(Wg * 1.0, Wg * 0.95, 0.36, 2.4);
      layer(Wg * 0.45, Wg * 0.42, 0.3, 1.2);
      ctx.filter = 'none';
      const core = ctx.createLinearGradient(0, p[1], 0, p[1] - H * 0.6);
      core.addColorStop(0, 'rgba(255,246,226,0.45)'); core.addColorStop(0.5, 'rgba(255,227,163,0.14)'); core.addColorStop(1, 'rgba(255,227,163,0)');
      ctx.fillStyle = core; ctx.globalAlpha = strength; ctx.filter = `blur(${1.2 * SD}px)`; ctx.fillRect(p[0] - 2.2 * SD, p[1] - H * 0.6, 4.4 * SD, H * 0.6); ctx.filter = 'none';
      ctx.globalAlpha = 0.7 * strength; ctx.drawImage(sp.white, p[0] - 5 * SD, p[1] - 2.2 * SD, 10 * SD, 4.4 * SD);
      ctx.restore();
    }
    column(win ? 125 : 70, 18, 1);

    // ------------------------------------------------ win: shockwave + glitter
    if (win) {
      const p = toDev(base.x, base.y);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // warm bloom over the whole lit world
      const wb = ctx.createRadialGradient(p[0], p[1] - 80 * SD, 10 * SD, p[0], p[1] - 80 * SD, 330 * SD);
      wb.addColorStop(0, 'rgba(255,181,71,0.16)'); wb.addColorStop(0.5, 'rgba(255,170,60,0.08)'); wb.addColorStop(1, 'rgba(255,160,50,0)');
      ctx.fillStyle = wb; ctx.fillRect(0, 0, W, H);
      // two clear shockwave rings with a soft trailing falloff
      for (const [R, a] of (o.rings || [[92, 0.5], [178, 0.38]])) {
        const r0 = R - 16, r1 = R + 6, L = r1 - r0, st = (v) => clamp((v - r0) / L, 0, 1);
        const gr = ctx.createRadialGradient(p[0], p[1], r0 * SD, p[0], p[1], r1 * SD);
        gr.addColorStop(0, 'rgba(255,181,71,0)');
        gr.addColorStop(st(R - 6), `rgba(255,181,71,${a * 0.12})`);
        gr.addColorStop(st(R - 1.4), `rgba(255,200,110,${a * 0.55})`);
        gr.addColorStop(st(R), `rgba(255,236,190,${a})`);
        gr.addColorStop(st(R + 1.3), `rgba(255,200,110,${a * 0.45})`);
        gr.addColorStop(1, 'rgba(255,181,71,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p[0], p[1], r1 * SD, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // the last shards of frost: sparse ice-white and gold glints falling with short trails
      const g = mulberry32(919);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 30; k++) {
        const X = 36 + g() * 112, Y = 182 + g() * 120;
        const gold = g() < 0.45;
        const sz = (0.9 + g() * g() * 2.2) * (o.glitterK || 1);
        const q = toDev(X, Y);
        const a = 0.55 + g() * 0.45;
        const tl = (4 + g() * 6) * SD;
        const tg = ctx.createLinearGradient(0, q[1] - tl, 0, q[1]);
        tg.addColorStop(0, gold ? 'rgba(255,213,138,0)' : 'rgba(217,255,252,0)'); tg.addColorStop(1, gold ? `rgba(255,227,163,${a * 0.55})` : `rgba(235,255,253,${a * 0.5})`);
        ctx.fillStyle = tg; ctx.fillRect(q[0] - 0.25 * SD, q[1] - tl, 0.5 * SD, tl);
        ctx.globalAlpha = a * 0.55; ctx.drawImage(gold ? sp.amber : sp.white, q[0] - sz * 2.6 * SD, q[1] - sz * 2.6 * SD, sz * 5.2 * SD, sz * 5.2 * SD);
        ctx.globalAlpha = a;
        // four-point glint
        const r = sz * SD * 1.5, w0 = Math.max(0.5, 0.22 * SD);
        ctx.fillStyle = gold ? '#FFE9BE' : '#F4FFFE';
        ctx.beginPath(); ctx.moveTo(q[0], q[1] - r); ctx.lineTo(q[0] + w0, q[1] - w0); ctx.lineTo(q[0] + r, q[1]); ctx.lineTo(q[0] + w0, q[1] + w0); ctx.lineTo(q[0], q[1] + r); ctx.lineTo(q[0] - w0, q[1] + w0); ctx.lineTo(q[0] - r, q[1]); ctx.lineTo(q[0] - w0, q[1] - w0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // ships (decorative ocean life)
    if (o.ships) {
      ctx.save();
      for (const [X, Y, ang, col] of o.ships) {
        const p = toDev(X, Y);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
        const wl = 14 * SD;
        ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(150,180,210,0.16)';
        ctx.beginPath(); ctx.moveTo(-1 * SD, 0); ctx.lineTo(-wl, -2.6 * SD); ctx.moveTo(-1 * SD, 0); ctx.lineTo(-wl, 2.6 * SD); ctx.stroke();
        ctx.fillStyle = 'rgba(180,195,215,0.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 1.6 * SD, 0.6 * SD, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        dot(ctx, col === 'g' ? sp.cyan : sp.amber, X, Y, 3, 0.45); dot(ctx, sp.amberHard, X, Y, 0.8, 0.9);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }

    T_('fx');
    // ------------------------------------------------------------- clouds
    {
      // computed at half resolution (clouds are soft), then scaled up with a light blur
      const W2 = Math.ceil(W / 2), H2 = Math.ceil(H / 2);
      const CL = document.createElement('canvas'); CL.width = W2; CL.height = H2; const cgx = CL.getContext('2d'); const id = cgx.createImageData(W2, H2);
      const zones = o.clouds || [[30, 470, 70, 34], [210, 520, 60, 16], [372, 440, 40, 40], [150, 200, 50, 20], [255, 690, 60, 18], [330, 160, 40, 14], [40, 680, 50, 30]];
      for (let y = 0; y < H2; y += 1) {
        const Y = YA[Math.min(H - 1, y * 2)];
        for (let x = 0; x < W2; x++) {
          const X = XA[Math.min(W - 1, x * 2)];
          let z = 0;
          for (const q of zones) { const dx = (X - q[0]) / q[2], dy = (Y - q[1]) / q[3]; const e = dx * dx + dy * dy; if (e < 9) z += Math.exp(-e); }
          if (z < 0.03) continue;
          const c = N.fbm(X / 30 + 40, Y / 11, 5, 0.55);
          const a = sstep(-0.1, 0.3, c + (z - 0.55) * 0.55) * clamp(z * 1.2, 0, 1);
          if (a <= 0) continue;
          const j = (y * W2 + x) * 4;
          const lit = 0.75 + 0.25 * N2.fbm(X / 9, Y / 5, 3);
          id.data[j] = 175 * lit; id.data[j + 1] = 192 * lit; id.data[j + 2] = 218 * lit; id.data[j + 3] = 255 * a * 0.3;
        }
      }
      cgx.putImageData(id, 0, 0);
      ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.filter = `blur(${0.7 * dpr}px)`; ctx.drawImage(CL, 0, 0, W, H); ctx.restore();
    }

    T_('clouds');
    // ------------------------------------------------------------- aurora
    if (o.aurora !== false) {
      const AU = mk(); const ag = AU.getContext('2d'); ag.globalCompositeOperation = 'lighter';
      const x0 = toDev(30, 0)[0], x1 = toDev(360, 0)[0];
      for (let rb = 0; rb < 2; rb++) {
        for (let px = x0; px < x1; px += 1) {
          const X = BOX.x0 + (px / dpr - o.rect.x) / s;
          // ribbons hug the Cap's north coast and stay low, under the goal line
          const yc = (rb ? 154 : 150.5) + Math.sin(X / 34 + rb * 2) * 2 + N.fbm(X / 60 + rb * 10, rb, 3) * 3;
          const fold = Math.max(0, N.fbm(X / 22 + rb * 7, 3.3, 4) + 0.15);
          const stri = 0.6 + 0.4 * N2.fbm(X / 2.6, rb * 5, 2);
          const edgeFade = sstep(36, 70, X) * sstep(352, 318, X);
          const a = Math.min(1, fold * 2.6) * stri * edgeFade * (rb ? 0.7 : 1);
          if (a <= 0.01) continue;
          const len = (7 + 8 * fold) * SD * (o.auroraH || 1);
          const p = toDev(X, yc);
          const gr = ag.createLinearGradient(0, p[1], 0, p[1] - len);
          // soft green (never TIDY's cyan), violet tips; warmer gold-green on the win screen
          const c0 = win ? [190, 255, 150] : [125, 255, 178], c1 = win ? [255, 222, 150] : [125, 255, 178], c2 = win ? [255, 190, 120] : [123, 108, 255];
          gr.addColorStop(0, `rgba(${c0},0)`);
          gr.addColorStop(0.04, `rgba(${c0},${0.85 * a})`);
          gr.addColorStop(0.14, `rgba(${c0},${0.6 * a})`);
          gr.addColorStop(0.45, `rgba(${c1},${0.32 * a})`);
          gr.addColorStop(0.8, `rgba(${c2},${0.12 * a})`);
          gr.addColorStop(1, `rgba(${c2},0)`);
          ag.fillStyle = gr; ag.fillRect(p[0], p[1] - len, 1, len + 2 * SD);
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; ctx.filter = `blur(${1.2 * SD}px)`; ctx.drawImage(AU, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 0.55; ctx.drawImage(AU, 0, 0); ctx.restore();
    }

    // ------------------------------------------- switch preview: dim the rest of the world
    if (prevSet) {
      const pm = new Float32Array(n);
      for (let i = 0; i < n; i++) if (rid[i] >= 0 && prevSet.has(rid[i])) pm[i] = cov[i];
      const pmS = boxBlur(pm, W, H, 1.2 * SD, 2);
      const DM = mk(); const dg = DM.getContext('2d'); const id = dg.createImageData(W, H);
      for (let i = 0; i < n; i++) { id.data[i * 4] = 2; id.data[i * 4 + 1] = 4; id.data[i * 4 + 2] = 9; id.data[i * 4 + 3] = 255 * 0.32 * (1 - clamp(pmS[i] * 1.4, 0, 1)); }
      dg.putImageData(id, 0, 0); ctx.drawImage(DM, 0, 0);
      // amber glow spilling just outside the previewed regions
      const GL = mk(); const gl = GL.getContext('2d'); const id2 = gl.createImageData(W, H);
      for (let i = 0; i < n; i++) { id2.data[i * 4] = 255; id2.data[i * 4 + 1] = 170; id2.data[i * 4 + 2] = 60; id2.data[i * 4 + 3] = 255 * pm[i]; }
      gl.putImageData(id2, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = `blur(${6 * SD}px)`; ctx.globalAlpha = 0.42; ctx.drawImage(GL, 0, 0);
      ctx.filter = `blur(${2 * SD}px)`; ctx.globalAlpha = 0.1; ctx.drawImage(GL, 0, 0); ctx.restore();
    }

    // ------------------------------------------------- continent labels
    // Set horizontally on (or tight against) each landmass: 40% white, wide tracking, dark halo.
    if (o.labels !== false) {
      ctx.save();
      const labs = o.labelSet || LABELS;
      for (const [t, X, Y, rot] of labs) {
        const p = toDev(X, Y);
        const fs = (o.labelPx || 10.5) * dpr;
        ctx.save(); ctx.translate(p[0], p[1]); if (rot) ctx.rotate(rot * Math.PI / 180);
        ctx.font = `500 ${fs}px Jost`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${fs * 0.34}px`;
        const ox = 'letterSpacing' in ctx ? fs * 0.17 : 0; // centre despite trailing tracking
        ctx.lineJoin = 'round'; ctx.lineWidth = 2.6 * dpr; ctx.strokeStyle = 'rgba(3,6,12,0.62)';
        ctx.strokeText(t, ox, 0);
        ctx.fillStyle = 'rgba(232,238,248,0.4)'; ctx.fillText(t, ox, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    T_('labels');
    // ------------------------------------------------- grain + vignette
    {
      const GR = document.createElement('canvas'); const gw = Math.ceil(W / 2), gh = Math.ceil(H / 2);
      GR.width = W; GR.height = H; const gx = GR.getContext('2d'); const id = gx.createImageData(W, H);
      const gr = mulberry32(55);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const j = (y * W + x) * 4; const v = 128 + (gr() - 0.5) * 70 + N2.n2(x / dpr / 1.3, y / dpr / 9) * 26;
        id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = 255;
      }
      gx.putImageData(id, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain || 0.14; ctx.drawImage(GR, 0, 0); ctx.restore();
      const vg = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(2,4,9,0)'); vg.addColorStop(1, 'rgba(2,4,9,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    out.ms = performance.now() - t0; out.nLights = LIGHTS.lights.length;
    out.regionCenter = name => { const r = byName(name); return toCss(r.x, r.y); };
    out.ctx = ctx;
    return out;
  }

  window.OffSwitchWorld = { paint, REG, byName };
})();
