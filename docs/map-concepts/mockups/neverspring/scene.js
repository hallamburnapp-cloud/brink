// NEVERSPRING: the shared mid-game moment (Year 3, Midwinter).
(function () {
const O = NSO;
const MID = {
  hearths: [[10.1, 0.52], [10.58, 0.6]],
  warn: [11.08, 0.6],
  furnace: [9.0, 0.82],
  blizzard: [1.9, 0.74],
  crystals: [[11.55, 0.55], [0.25, 0.6], [2.5, 0.53]],
  iceberg: [0.25, 0.9],
  // five lines feed Toradel; weight is how much each one carries (thickest first)
  lines: {
    velloran: { name: 'Velloran rail', w: 3.0, pts: [[9.85, 0.56], [9.58, 0.625], [9.32, 0.71], [9.13, 0.775], [9.0, 0.82]], glint: 0.62, vehicles: [{ kind: 'train', t: 0.35 }] },
    ostrel: { name: 'Ostrel rail', w: 2.4, pts: [[6.95, 0.86], [7.35, 0.878], [7.85, 0.885], [8.3, 0.872], [8.7, 0.85], [9.0, 0.82]], glint: 0.5, vehicles: [{ kind: 'train', t: 0.78 }] },
    sel: { name: 'Sel Harbour ships', w: 1.9, glint: 0.86, vehicles: [{ kind: 'ship', t: 0.36 }] },
    mirrin: { name: 'Mirrin road', w: 1.3, pts: [[10.92, 0.64], [10.45, 0.695], [9.9, 0.745], [9.45, 0.79], [9.0, 0.82]], glint: 0.4 }
  }
};
function paintMid(px, unit, extra = {}) {
  return NS.paintWorld(Object.assign({ px, unit, state: 'mid', hearths: MID.hearths, storms: [MID.blizzard] }, extra));
}
const toHR = ([x, y]) => [NS.hourOf(x, y), Math.hypot(x, y)];
// route a ship lane through open water, clear of coasts and of the rim
function seaRoute(world, from, to) {
  const N = 200, cell = 2 / N; const idx = (i, j) => j * N + i;
  const toIJ = (x, y) => [Math.round((x + 1) / cell - 0.5), Math.round((y + 1) / cell - 0.5)];
  const cost = new Float32Array(N * N);
  const wet = (x, y) => { const sm = world.sample(x, y); return !(sm.cov > 0.05 || sm.white > 0.2); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -1 + (i + 0.5) * cell, y = -1 + (j + 0.5) * cell; const r = Math.hypot(x, y);
    if (r > 0.975 || !wet(x, y)) { cost[idx(i, j)] = Infinity; continue; }
    let near = 0, far = 0;
    for (let a = 0; a < 8; a++) { const ca = Math.cos(a * Math.PI / 4), sa = Math.sin(a * Math.PI / 4); if (!wet(x + ca * 0.03, y + sa * 0.03)) near++; if (!wet(x + ca * 0.055, y + sa * 0.055)) far++; }
    cost[idx(i, j)] = 1 + near * 1.2 + far * 0.4 + 8 * NS.smooth(0.955, 0.975, r);
  }
  const [si, sj] = toIJ(...from), [ti, tj] = toIJ(...to);
  const dist = new Float32Array(N * N).fill(Infinity), prev = new Int32Array(N * N).fill(-1), done = new Uint8Array(N * N);
  const heap = []; const push = (d, k) => { heap.push([d, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  dist[idx(si, sj)] = 0; push(0, idx(si, sj));
  while (heap.length) { const [d, k] = pop(); if (done[k]) continue; done[k] = 1; if (k === idx(ti, tj)) break; const i = k % N, j = (k / N) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; const nk = idx(ni, nj); const c = cost[nk]; if (!isFinite(c)) continue; const nd = d + c * Math.hypot(di, dj); if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push(nd, nk); } } }
  if (!isFinite(dist[idx(ti, tj)])) return null;
  const out = []; let k = idx(ti, tj); while (k >= 0) { out.push([-1 + (k % N + 0.5) * cell, -1 + (((k / N) | 0) + 0.5) * cell]); k = prev[k]; }
  out.reverse();
  // smooth, then thin
  const sm = out.map((p, i) => { let sx = 0, sy = 0, n = 0; for (let j = Math.max(0, i - 4); j <= Math.min(out.length - 1, i + 4); j++) { sx += out[j][0]; sy += out[j][1]; n++; } return [sx / n, sy / n]; });
  return sm.filter((_, i) => i % 6 === 0 || i === sm.length - 1).map(toHR);
}
// one smooth arc across the Western Ocean: out between the isles, then down the open water off the west coast
function oceanLane() { return [[0.78, 0.835], [0.32, 0.79], [11.85, 0.79], [11.5, 0.862], [11.2, 0.94], [10.5, 0.953], [9.8, 0.953], [9.28, 0.94], [9.0, 0.82]]; }
// the Narrows: a grey line from the Toradel network up to the ice bridge, broken there; the ships turned back beyond it
function narrowsGeometry(world) {
  const B = world.bridge; if (!B) return null;
  const rr = Math.hypot(B.x, B.y); const nx = B.x / rr, ny = B.y / rr;
  const P = (t, n = 0) => [B.x + B.tx * t + nx * n, B.y + B.ty * t + ny * n];
  const endNear = P(B.hi + 0.008), port = P(B.hi + 0.035, 0.05);
  const near = [MID.furnace, [8.76, 0.765], [8.6, 0.66], toHR(port), toHR(P(B.hi + 0.02, 0.022)), toHR(endNear)];
  const farStart = P(B.lo - 0.01);
  const far = [toHR(farStart), toHR(P(B.lo - 0.05, -0.004)), toHR(P(B.lo - 0.1, 0.006)), toHR(P(B.lo - 0.15, 0.03))];
  const ang = Math.atan2(-B.ty, -B.tx); // heading away from the ice, back to the Sun Sea
  return { B, P, near, far, endNear, ang, ships: [{ p: P(B.lo - 0.024, -0.007), turn: 1, wl: 0.7, wr: 0.85 }, { p: P(B.lo - 0.05, 0.012), turn: -1, wl: 0.8, wr: 0.9 }] };
}
function drawMid(ctx, v, world, k, opts = {}) {
  O.drawDisc(ctx, v, world, { k });
  ctx.save(); ctx.beginPath(); ctx.arc(v.cx, v.cy, v.R - 0.5, 0, Math.PI * 2); ctx.clip();
  // wind ribbons from the pole towards 12 and 5 o'clock
  O.drawWind(ctx, v, [[7.6, 0.05], [9.6, 0.13], [10.8, 0.25], [11.55, 0.38], [0.1, 0.5], [0.45, 0.63]], k, { width: 2.6, alpha: 0.34, seed: 3 });
  O.drawWind(ctx, v, [[1.6, 0.05], [3.0, 0.13], [3.9, 0.25], [4.5, 0.38], [4.95, 0.5], [5.3, 0.62]], k, { width: 2.4, alpha: 0.32, seed: 5 });
  const L = O.cityLights(world, 4242, { count: opts.cities || 72, villages: opts.villages || 150, spacing: 0.048,
    fixed: [[9.85, 0.56, 0.95], [10.92, 0.64, 0.8], [6.95, 0.86, 0.85], [0.78, 0.835, 0.55], [11.3, 0.845, 0.45], [11.68, 0.9, 0.35], [1.12, 0.94, 0.35], [8.62, 0.66, 0.7]],
    avoid: [[9.0, 0.82, 0.07]] });
  O.drawLights(ctx, v, L, k);
  const F = v.P(...MID.furnace);
  const NG = narrowsGeometry(world);
  if (NG && NG.B.mask) {
    // the strait has just cracked over: a cold glow and a few glints on the new ice
    const m = NG.B.mask; const c = document.createElement('canvas'); c.width = m.width; c.height = m.height; const g = c.getContext('2d');
    g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#BFE4FA'; g.fillRect(0, 0, c.width, c.height);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.filter = `blur(${3.4 * k}px)`; ctx.globalAlpha = 0.8; ctx.drawImage(c, v.cx - v.R, v.cy - v.R, 2 * v.R, 2 * v.R);
    ctx.filter = `blur(${0.8 * k}px)`; ctx.globalAlpha = 0.45; ctx.drawImage(c, v.cx - v.R, v.cy - v.R, 2 * v.R, 2 * v.R);
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.restore();
    const S0 = p => v.W(p[0], p[1]);
    ctx.save(); ctx.fillStyle = '#FFFFFF';
    for (const [t, n, s] of [[0.0, -0.006, 2.6], [-0.03, 0.01, 1.8], [0.028, 0.012, 1.6]]) { const [x, y] = S0(NG.P(t, n)); O.starPath(ctx, x, y, s * k, 0.35 * k, 4, 0.3); ctx.fill(); }
    ctx.restore();
  }
  if (NG) {
    const S = p => v.W(p[0], p[1]);
    O.drawCutLine(ctx, v, NG.near, NG.far, S(NG.endNear), k, NG.ships.map(s => { const q = S(s.p); return { x: q[0], y: q[1], ang: NG.ang, turn: s.turn, wl: s.wl, wr: s.wr }; }));
  }
  const ln = MID.lines;
  const lane = oceanLane();
  const order = [['mirrin', ln.mirrin.pts], ['sel', lane], ['ostrel', ln.ostrel.pts], ['velloran', ln.velloran.pts]];
  for (const [key, pts] of order) { const d = ln[key]; O.drawFuelLine(ctx, v, pts, { k, weight: d.w, endAt: F, endGap: 13.5, glint: d.glint, vehicles: d.vehicles }); }
  MID.hearths.forEach(([h, r]) => { const [x, y] = v.P(h, r); O.drawHearth(ctx, x, y, k); });
  { const [x, y] = v.P(...MID.warn); O.drawWarnRing(ctx, x, y, k); }
  { let best = MID.iceberg, bd = 9; for (let a = 0; a < 900; a++) { const hh = MID.iceberg[0] + (a % 30 - 15) * 0.02, rr = MID.iceberg[1] + (Math.floor(a / 30) - 15) * 0.004; const p = NS.polar(hh, rr); let ok = true;
      for (const [dx, dy] of [[0, 0], [0.03, 0], [-0.03, 0], [0, 0.03], [0, -0.03]]) { const s2 = world.sample(p[0] + dx, p[1] + dy); if (s2.cov > 0.01 || s2.white > 0.05) ok = false; }
      const d = Math.abs(hh - MID.iceberg[0]) * 0.5 + Math.abs(rr - MID.iceberg[1]); if (ok && d < bd) { bd = d; best = [hh, rr]; } }
    const [x, y] = v.P(...best); O.drawIceberg(ctx, x, y, k); }
  { const [x, y] = v.P(...MID.blizzard); O.drawBlizzard(ctx, x, y, k); }
  ctx.restore();
  O.grainOver(ctx, v, 77, 0.05);
  ctx.save(); ctx.beginPath(); ctx.arc(v.cx, v.cy, v.R - 0.5, 0, Math.PI * 2); ctx.clip();
  MID.crystals.forEach(([h, r]) => { const [x, y] = v.P(h, r); O.drawCrystal(ctx, x, y, k); });
  ctx.restore();
  // the Furnace: brightest thing on the map
  O.drawFurnaceColumn(ctx, F[0], F[1], k, opts.columnH || 64);
  O.drawFurnace(ctx, F[0], F[1], k, true);
  if (opts.label !== false) O.drawLabel(ctx, 'TORADEL', F[0] + 19 * k, F[1] + 5 * k, { font: `700 ${opts.labelSize || 10.5}px 'Hanken Grotesk'`, spacing: (opts.labelSpacing || 1.8) + 'px', color: '#FFD27A', halo: 2 });
  return { L, NG, F };
}
window.NSS = { MID, paintMid, drawMid, seaRoute, narrowsGeometry };
})();
