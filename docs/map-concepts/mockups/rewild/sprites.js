// REWILD — hand-drawn sprites and light layers painted over the world.
(function (G) {
'use strict';
const { OX, OY, WW, WH, REG, RIVER_SRC, landField, hash2, clamp, sstep, lerp, N, fbm, mulberry32, CITY_R } = G.RW;

function rgba(h, a) { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); return `rgba(${r},${g},${b},${a})`; }

// ---------- rivers ----------
function traceRiver(sx, sy, seed) {
  const pts = [[sx, sy]]; let x = sx, y = sy; let px0 = 0, py0 = 0;
  for (let i = 0; i < 320; i++) {
    const e = 0.8;
    const gx = landField(x + e, y) - landField(x - e, y), gy = landField(x, y + e) - landField(x, y - e);
    let l = Math.hypot(gx, gy) || 1; let dx = gx / l, dy = gy / l;
    const a = 0.9 * N[6 + (seed % 4)](x / 16, y / 16);
    const ca = Math.cos(a), sa = Math.sin(a); let nx = dx * ca - dy * sa, ny = dx * sa + dy * ca;
    if (i > 0) { nx = nx * 0.45 + px0 * 0.55; ny = ny * 0.45 + py0 * 0.55; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m; }
    px0 = nx; py0 = ny; x += nx * 1.3; y += ny * 1.3; pts.push([x, y]);
    if (landField(x, y) > 1.2) return pts;
    if (i > 30) { const q = pts[pts.length - 25]; if (Math.hypot(q[0] - x, q[1] - y) < 8) return null; }
  }
  return null;
}
function chaikinP(l, n) { for (let k = 0; k < n; k++) { const o = [l[0]]; for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(l[l.length - 1]); l = o; } return l; }
function plen(l) { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; }
const RIVERS = RIVER_SRC.map((src, ri) => traceRiver(src[0], src[1], ri)).filter(p => p && p.length >= 10 && plen(p) > 13).map(p => chaikinP(p.filter((_, i) => i % 2 === 0 || i === p.length - 1), 2));
// one continuous tapered ribbon per river, from a thread inland to its widest at the sea
function riverRibbon(ctx, info, pts, i0, i1, w0, w1) {
  const L = [], R = []; const n = pts.length;
  for (let i = i0; i <= i1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    const t = i / (n - 1), w = (w0 + (w1 - w0) * Math.pow(t, 0.85)) * info.s * 0.5;
    const c = info.toCss(pts[i][0], pts[i][1]);
    L.push([c[0] - ty * w, c[1] + tx * w]); R.push([c[0] + ty * w, c[1] - tx * w]);
  }
  ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath();
}
function riverRuns(info, pts) {
  // split a river into runs over green and over grey land (with a one-point overlap so the ribbon stays continuous)
  const runs = []; let st = 0, g0 = info.sample(pts[0][0], pts[0][1]).rv > 0.5;
  for (let i = 1; i < pts.length; i++) { const g = info.sample(pts[i][0], pts[i][1]).rv > 0.5; if (g !== g0) { runs.push([st, i, g0]); st = i - 1; g0 = g; } }
  runs.push([st, pts.length - 1, g0]); return runs;
}
function drawRivers(ctx, info, opt) {
  opt = opt || {};
  const sc = opt.width || 1;
  ctx.save();
  for (const pts of RIVERS) {
    const runs = riverRuns(info, pts);
    if (opt.emissive) { // at night, green rivers lift a little toward teal: one soft stroke per run, never beads
      const nf = opt.night;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [a, b, g] of runs) {
        if (!g) continue;
        const mid = pts[(a + b) >> 1], f = nf ? nf(mid[0], mid[1]) : 1; if (f < 0.05) continue;
        ctx.filter = `blur(${1.6 * info.s}px)`; ctx.strokeStyle = rgba('#5FF2C8', 0.22 * f); ctx.lineWidth = 3.2 * info.s * sc;
        ctx.beginPath(); for (let i = a; i <= b; i++) { const c = info.toCss(pts[i][0], pts[i][1]); i === a ? ctx.moveTo(c[0], c[1]) : ctx.lineTo(c[0], c[1]); } ctx.stroke();
        ctx.filter = 'none';
        riverRibbon(ctx, info, pts, a, b, 0.25 * sc, 0.7 * sc); ctx.fillStyle = rgba('#5FF2C8', 0.3 * f); ctx.fill();
      }
      continue;
    }
    for (const [a, b, g] of runs) {
      if (g) { // a soft glow either side, then the ribbon in leaf green
        ctx.save(); ctx.filter = `blur(${1.4 * info.s}px)`; riverRibbon(ctx, info, pts, a, b, 2.4 * sc, 4.4 * sc); ctx.fillStyle = rgba('#8FD694', 0.32); ctx.fill(); ctx.restore();
        riverRibbon(ctx, info, pts, a, b, 0.55 * sc, 1.85 * sc); ctx.fillStyle = '#8FD694'; ctx.fill();
        riverRibbon(ctx, info, pts, a, b, 0.15 * sc, 0.55 * sc); ctx.fillStyle = 'rgba(226,247,214,0.55)'; ctx.fill();
      } else {
        riverRibbon(ctx, info, pts, a, b, 0.55 * sc, 1.85 * sc); ctx.fillStyle = rgba('#5B7480', 0.9); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// ---------- routes (sea currents, flyways) ----------
function bez(p0, p1, p2, t) { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; }
function drawRoute(ctx, p0, p1, p2, o) {
  const N2 = 160; const pts = [];
  for (let i = 0; i <= N2; i++) pts.push(bez(p0, p1, p2, i / N2));
  ctx.save(); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]);
  if (o.glow) { ctx.strokeStyle = o.glow; ctx.lineWidth = o.width * 4; ctx.filter = 'blur(2px)'; ctx.setLineDash([]); ctx.stroke(); ctx.filter = 'none'; }
  ctx.setLineDash(o.dash); ctx.lineDashOffset = o.offset || 0; ctx.strokeStyle = o.color; ctx.lineWidth = o.width; ctx.stroke();
  ctx.setLineDash([]);
  if (o.glint) {
    for (const gt of o.glint) { const p = bez(p0, p1, p2, gt); const R = o.width * 4.2; const gr = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R); gr.addColorStop(0, 'rgba(255,255,250,0.95)'); gr.addColorStop(0.35, 'rgba(255,255,240,0.45)'); gr.addColorStop(1, 'rgba(255,255,240,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  return pts;
}

// ---------- bloom ----------
function drawBloom(ctx, x, y, size, opt) {
  opt = opt || {};
  const r = size / 2, lift = opt.lift === undefined ? 2.5 : opt.lift;
  ctx.save(); ctx.translate(x, y);
  // a soft warm glow, no ring
  const hg = ctx.createRadialGradient(0, -lift, r * 0.2, 0, -lift, r * 1.9);
  hg.addColorStop(0, 'rgba(255,233,168,0.62)'); hg.addColorStop(0.45, 'rgba(255,233,168,0.24)'); hg.addColorStop(1, 'rgba(255,233,168,0)');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -lift, r * 1.9, 0, 7); ctx.fill();
  // the shadow stays on the ground while the flower bobs above it
  ctx.save(); ctx.filter = 'blur(1.6px)'; ctx.fillStyle = 'rgba(12,30,18,0.42)'; ctx.beginPath(); ctx.ellipse(1.2, r * 0.62, r * 0.62, r * 0.22, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.translate(0, -lift);
  ctx.rotate(opt.rot || 0.3);
  const NP = 6;
  for (let i = 0; i < NP; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / NP);
    const g = ctx.createLinearGradient(0, 0, 0, -r);
    g.addColorStop(0, '#FFD98A'); g.addColorStop(0.35, '#FFE9A8'); g.addColorStop(1, '#FFF8E2');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(190,140,50,0.6)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-r * 0.5, -r * 0.3, -r * 0.44, -r * 0.92, 0, -r * 0.98); ctx.bezierCurveTo(r * 0.44, -r * 0.92, r * 0.5, -r * 0.3, 0, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,180,90,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, -r * 0.75); ctx.stroke();
    ctx.restore();
  }
  const cg = ctx.createRadialGradient(-r * 0.08, -r * 0.08, 0, 0, 0, r * 0.3);
  cg.addColorStop(0, '#FFD873'); cg.addColorStop(1, '#E29A22');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,90,20,0.6)'; for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15, 0.55, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---------- geese: a clean V of three cream geese with ink outlines, about 10 pt across ----------
function goosePath(o) {
  // top-down, heading +x; wingspan ~10 units, length ~8
  o.beginPath();
  o.moveTo(4.6, 0);                                 // beak tip
  o.quadraticCurveTo(4.1, -0.55, 3.2, -0.5);        // head
  o.quadraticCurveTo(2.2, -0.42, 1.5, -0.62);       // neck
  o.bezierCurveTo(1.3, -2.4, 0.2, -4.0, -1.6, -5.1); // leading edge, left wing
  o.quadraticCurveTo(-1.2, -3.3, -1.0, -1.15);      // trailing edge back to the body
  o.quadraticCurveTo(-2.3, -0.9, -3.3, -0.55);      // body
  o.lineTo(-4.1, 0);                                // tail
  o.lineTo(-3.3, 0.55);
  o.quadraticCurveTo(-2.3, 0.9, -1.0, 1.15);
  o.quadraticCurveTo(-1.2, 3.3, -1.6, 5.1);         // right wing
  o.bezierCurveTo(0.2, 4.0, 1.3, 2.4, 1.5, 0.62);
  o.quadraticCurveTo(2.2, 0.42, 3.2, 0.5);
  o.quadraticCurveTo(4.1, 0.55, 4.6, 0);
  o.closePath();
}
function drawGoose(ctx, x, y, s, ang, opt) {
  opt = opt || {};
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  if (opt.shadow !== false) { ctx.save(); ctx.translate(2.2 * s, 3.4 * s); ctx.scale(s, s); goosePath(ctx); ctx.fillStyle = 'rgba(10,20,26,0.18)'; ctx.fill(); ctx.restore(); }
  ctx.scale(s, s);
  goosePath(ctx);
  ctx.fillStyle = opt.body || '#F4EFE4'; ctx.fill();
  ctx.lineJoin = 'round'; ctx.strokeStyle = opt.ink || '#22302A'; ctx.lineWidth = 0.85 / s * (opt.inkW || 1); ctx.stroke();
  // darker wing tips and a dark head, so it reads as a goose
  ctx.save(); goosePath(ctx); ctx.clip();
  ctx.fillStyle = 'rgba(34,48,42,0.32)'; ctx.beginPath(); ctx.ellipse(-1.4, -4.4, 1.0, 1.2, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-1.4, 4.4, 1.0, 1.2, -0.3, 0, 7); ctx.fill();
  ctx.fillStyle = opt.ink || '#22302A'; ctx.beginPath(); ctx.ellipse(3.6, 0, 1.15, 0.62, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function drawGeese(ctx, x, y, s, ang, opt) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (const [dx, dy] of [[-7.5, -7], [-7.5, 7], [0, 0]]) drawGoose(ctx, x + (dx * ca - dy * sa) * s, y + (dx * sa + dy * ca) * s, s, ang, opt);
}

// ---------- the Works ----------
function worksShape(o, rusted) {
  // hall with a sawtooth roof and a tall chimney; drawn about 20 units high
  const hg = o.createLinearGradient(-10, 0, 3, 0);
  if (rusted) { hg.addColorStop(0, '#B0774E'); hg.addColorStop(1, '#8A5638'); } else { hg.addColorStop(0, '#878C90'); hg.addColorStop(1, '#666B6F'); }
  o.fillStyle = hg; o.fillRect(-10.5, -7.5, 13.5, 7.5);
  o.fillStyle = rusted ? '#6B3A22' : '#4F5357'; o.beginPath(); o.moveTo(-10.5, -7.5);
  for (let t = 0; t < 4; t++) { o.lineTo(-10.5 + t * 3.375, -11); o.lineTo(-7.125 + t * 3.375, -7.5); }
  o.closePath(); o.fill();
  o.fillStyle = rusted ? 'rgba(255,214,170,0.45)' : 'rgba(225,230,232,0.6)'; for (let t = 0; t < 4; t++) o.fillRect(-10.1 + t * 3.375, -10.6, 0.8, 2.8);
  o.fillStyle = rusted ? 'rgba(46,22,10,0.6)' : 'rgba(30,34,38,0.6)'; for (let t = 0; t < 4; t++) o.fillRect(-9.4 + t * 3.2, -5, 1.8, 2.4);
  o.strokeStyle = 'rgba(16,18,20,0.55)'; o.lineWidth = 0.5; o.strokeRect(-10.5, -7.5, 13.5, 7.5);
  const cg = o.createLinearGradient(3, 0, 8.6, 0);
  if (rusted) { cg.addColorStop(0, '#D0844C'); cg.addColorStop(0.4, '#A0522D'); cg.addColorStop(1, '#6E3418'); }
  else { cg.addColorStop(0, '#B4B8BB'); cg.addColorStop(0.45, '#8E9296'); cg.addColorStop(1, '#5A5E62'); }
  o.fillStyle = cg; o.beginPath();
  if (rusted) { o.moveTo(3, 0); o.lineTo(3.8, -17.6); o.lineTo(4.7, -19.6); o.lineTo(5.5, -18); o.lineTo(6.4, -20.6); o.lineTo(7.1, -18.4); o.lineTo(7.8, -18.9); o.lineTo(8.6, 0); }
  else { o.moveTo(3, 0); o.lineTo(3.9, -21); o.lineTo(7.7, -21); o.lineTo(8.6, 0); }
  o.closePath(); o.fill();
  o.strokeStyle = 'rgba(16,18,20,0.5)'; o.lineWidth = 0.5; o.stroke();
  if (!rusted) { o.fillStyle = '#3F4347'; o.fillRect(3.5, -22, 4.6, 1.6); o.fillStyle = 'rgba(237,230,214,0.9)'; o.fillRect(3.8, -17.2, 4.1, 1.2); o.fillRect(3.6, -13.2, 4.4, 1.1); }
}
function worksVines(o) {
  // a vine climbs the chimney in a loose spiral and spills over the hall roof; the rust stays readable between the leaves
  o.strokeStyle = '#1F5A35'; o.lineWidth = 0.95; o.lineCap = 'round';
  o.beginPath(); o.moveTo(2.6, 0.4); o.bezierCurveTo(9.6, -2.6, 2.6, -6.2, 8.4, -9.4); o.bezierCurveTo(10.2, -10.8, 3.6, -12.6, 5.6, -16.6); o.stroke();
  o.beginPath(); o.moveTo(-10.8, 0.4); o.bezierCurveTo(-9.6, -3.6, -7.6, -6.4, -4.2, -9.6); o.bezierCurveTo(-2.4, -11.2, -0.6, -9.8, 1.2, -8.6); o.stroke();
  const leaves = [[8.8, -2.4, 0.6, 1], [3.6, -5.6, -0.8, 0.9], [9.2, -9, 0.4, 1], [4.4, -12.6, -0.6, 0.85], [6.4, -16, 0.2, 0.8], [-10, -2.4, -0.5, 1], [-7.6, -5.8, 0.6, 1.05], [-4.6, -9.4, 0.2, 1.1], [-1.2, -10.4, -0.9, 0.95], [1.8, -8.2, 0.9, 0.9], [-12, 0, 0.3, 0.9], [1.4, -1.2, 1.2, 0.9]];
  leaves.forEach(([lx, ly, a, k], i) => { o.save(); o.translate(lx, ly); o.rotate(a); o.scale(k, k); o.fillStyle = '#2F7D4F'; o.beginPath(); o.ellipse(0, 0, 2.0, 1.15, 0, 0, 7); o.fill(); o.fillStyle = i % 3 ? '#8FD694' : '#6CC07A'; o.beginPath(); o.ellipse(-0.35, -0.3, 1.2, 0.6, 0, 0, 7); o.fill(); o.restore(); });
  o.fillStyle = 'rgba(62,155,95,0.95)'; o.beginPath(); o.ellipse(-6, -10.2, 3.6, 1.2, -0.05, 0, 7); o.fill();
  o.fillStyle = 'rgba(143,214,148,0.9)'; o.beginPath(); o.ellipse(-6.8, -10.7, 1.9, 0.55, -0.05, 0, 7); o.fill();
}
function drawWorks(ctx, x, y, sc, state, opt) {
  opt = opt || {};
  const rusted = state !== 'run';
  const k = rusted ? (opt.rustScale || 1.0) : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * k, sc * k);
  ctx.save(); ctx.filter = 'blur(0.8px)'; ctx.fillStyle = 'rgba(16,22,20,0.42)'; ctx.beginPath(); ctx.ellipse(3, 1, 12.5, 2.8, 0, 0, 7); ctx.fill(); ctx.restore();
  if (rusted) {
    // a cream halo so the overgrown Works reads on dark forest
    const S = 4, W = 34 * S, H = 32 * S; const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const o = oc.getContext('2d');
    o.setTransform(S, 0, 0, S, 16 * S, 26 * S); worksShape(o, true); worksVines(o);
    const hc = document.createElement('canvas'); hc.width = W; hc.height = H; const h = hc.getContext('2d');
    const hw = (opt.halo || 1.5) / (sc * k) * S;
    for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; h.drawImage(oc, Math.cos(t) * hw, Math.sin(t) * hw); }
    h.globalCompositeOperation = 'source-in'; h.fillStyle = opt.haloColor || 'rgba(244,239,228,0.92)'; h.fillRect(0, 0, W, H);
    ctx.drawImage(hc, -16, -26, 34, 32); ctx.drawImage(oc, -16, -26, 34, 32);
  } else {
    worksShape(ctx, false);
    const puffs = [[6, -25.5, 4.2, 0.96], [9, -31.5, 5.2, 0.9], [13.4, -36.6, 6.1, 0.8], [19.2, -40.6, 6.9, 0.66], [26, -43.6, 7.6, 0.5], [33.4, -45.6, 8.2, 0.32]];
    for (const [px, py, r, a] of puffs) { ctx.fillStyle = `rgba(92,95,99,${0.62 * a})`; ctx.beginPath(); ctx.arc(px + r * 0.18, py + r * 0.34, r * 0.92, 0, 7); ctx.fill(); }
    for (const [px, py, r, a] of puffs) {
      const gr = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, 0, px, py - r * 0.1, r);
      gr.addColorStop(0, `rgba(246,245,240,${a})`); gr.addColorStop(0.55, `rgba(216,214,208,${a * 0.95})`); gr.addColorStop(0.85, `rgba(196,194,188,${a * 0.6})`); gr.addColorStop(1, 'rgba(190,188,182,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py - r * 0.1, r, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- Great Tree ----------
const TREE_KINDS = {
  oak: { clumps: [[-7.5, -17, 6.2], [7.5, -17, 6.4], [0, -21.5, 7.8], [-4.5, -25, 5.8], [5, -25.5, 5.6], [0, -16, 6.2], [-10, -20.5, 4.4], [10, -20, 4.6], [0.5, -28.5, 4.6]], sy: 1, trunkTop: -12 },
  tall: { clumps: [[0, -12, 4.6], [-1.6, -16, 4.8], [1.6, -19.5, 4.6], [-0.8, -23.5, 4.2], [0.8, -27.2, 3.6], [0, -30.6, 2.8], [2.6, -14.6, 3.4], [-2.8, -20.6, 3.3]], sy: 1, trunkTop: -9 },
  acacia: { clumps: [[-10, -18.5, 4.4], [-5, -20.4, 5.4], [0.5, -21, 5.8], [6, -20.4, 5.2], [11, -18.8, 4.2], [-2, -22.6, 4.4], [4, -22.8, 4]], sy: 0.52, trunkTop: -17 },
};
const TREE_PAL = {
  leaf: { base: ['#2E6B3A', '#3D8443'], mid: ['#58A452', '#77BC5E'], hi: ['#A8D97A', '#D2EC9A'] },
  conifer: { base: ['#1E4A34', '#29593F'], mid: ['#3A7552', '#4D8C62'], hi: ['#7DB894', '#A9D5B0'] },
  savanna: { base: ['#3A5E30', '#4A713A'], mid: ['#6C9A48', '#86AF55'], hi: ['#B9D27E', '#DCE89C'] },
};
function drawGreatTree(ctx, x, y, size, opt) {
  opt = opt || {};
  const rnd = mulberry32(opt.seed || 7);
  const K = TREE_KINDS[opt.kind || 'oak'], P = TREE_PAL[opt.pal || 'leaf'];
  const s = size / 28;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const clumps = K.clumps, sy = K.sy;
  const blob = (cx, cy, r) => { ctx.beginPath(); ctx.ellipse(cx, cy, r, r * sy, 0, 0, 7); };
  if (opt.ring && !opt.rimOnly) { // the ground this tree holds
    const R = opt.ring / s, col = opt.ringColor || '143,214,148';
    ctx.save(); ctx.scale(1, 0.62);
    const g = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},0.16)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.filter = `blur(${1.5}px)`; ctx.strokeStyle = `rgba(${col},0.55)`; ctx.lineWidth = 3.2 / s; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke(); ctx.filter = 'none';
    ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 1.2 / s; ctx.setLineDash([5 / s, 2.6 / s]); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  if (!opt.rimOnly) {
    // cast shadow, falling down-right from the light in the upper left
    ctx.save(); ctx.filter = `blur(${Math.max(0.6, 1.4 * s)}px)`; ctx.fillStyle = 'rgba(10,26,18,0.42)';
    ctx.beginPath(); ctx.ellipse(9, 2.2, opt.kind === 'tall' ? 9 : 14, 4.2, -0.12, 0, 7); ctx.fill(); ctx.restore();
    const tg = ctx.createLinearGradient(-3, 0, 3, 0); tg.addColorStop(0, '#9A7350'); tg.addColorStop(0.5, '#7A5536'); tg.addColorStop(1, '#4A3220');
    ctx.fillStyle = tg; ctx.beginPath();
    if (opt.kind === 'acacia') {
      ctx.moveTo(-3.4, 0.6); ctx.quadraticCurveTo(-0.8, -2, -1.2, -9); ctx.lineTo(1.2, -9); ctx.quadraticCurveTo(1, -2, 3.6, 0.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5A3D28'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -8.5); ctx.quadraticCurveTo(-4, -13, -7, -17.5); ctx.moveTo(0, -8.5); ctx.quadraticCurveTo(3, -13.5, 7, -18); ctx.moveTo(-0.2, -9); ctx.lineTo(0.6, -19); ctx.stroke();
    } else {
      const tt = K.trunkTop;
      ctx.moveTo(-5.2, 0.6); ctx.quadraticCurveTo(-2, -1, -1.9, -6); ctx.lineTo(-2.5, tt); ctx.lineTo(2.3, tt); ctx.lineTo(2, -6); ctx.quadraticCurveTo(2.2, -1, 5.6, 0.6); ctx.quadraticCurveTo(0, -0.6, -5.2, 0.6); ctx.fill();
      if (opt.kind !== 'tall') { ctx.strokeStyle = '#5A3E28'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-1, -10); ctx.quadraticCurveTo(-5, -13, -7, -16); ctx.moveTo(1, -10.5); ctx.quadraticCurveTo(5, -13, 7.5, -15.5); ctx.stroke(); }
    }
    // a thin ink edge round the crown keeps it crisp on any ground
    ctx.save(); ctx.strokeStyle = 'rgba(22,40,28,0.55)'; ctx.lineWidth = 1.6; for (const [cx, cy, r] of clumps) { blob(cx, cy, r); ctx.stroke(); } ctx.restore();
    for (const [cx, cy, r] of clumps) { ctx.fillStyle = P.base[0]; blob(cx + 0.8, cy + 0.9, r); ctx.fill(); }
    for (const [cx, cy, r] of clumps) { const g = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5 * sy, r * 0.1, cx, cy, r); g.addColorStop(0, P.mid[1]); g.addColorStop(0.65, P.mid[0]); g.addColorStop(1, P.base[1]); ctx.fillStyle = g; blob(cx, cy, r); ctx.fill(); }
    for (let i = 0; i < 80; i++) {
      const c = clumps[Math.floor(rnd() * clumps.length)]; const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * c[2] * 0.95;
      const dx = Math.cos(a) * rr, dy = Math.sin(a) * rr * sy; const lit = (-dx - dy / sy) / (c[2] * 1.4);
      ctx.fillStyle = lit > 0.2 ? P.hi[rnd() < 0.5 ? 0 : 1] : lit > -0.2 ? P.mid[1] : P.base[1];
      ctx.globalAlpha = 0.55 + rnd() * 0.4;
      ctx.beginPath(); ctx.ellipse(c[0] + dx, c[1] + dy, 1.1 + rnd() * 0.9, 0.7 + rnd() * 0.5, rnd() * 3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (opt.pal !== 'conifer') for (let i = 0; i < (opt.kind === 'acacia' ? 6 : 16); i++) { const c = clumps[Math.floor(rnd() * clumps.length)]; const a = rnd() * 6.28, rr = rnd() * c[2] * 0.85; ctx.fillStyle = rnd() < 0.55 ? '#FFE9F0' : '#FFF4CC'; ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * sy, 0.75, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(232,150,170,0.6)'; ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * rr + 0.2, c[1] + Math.sin(a) * rr * sy + 0.2, 0.3, 0, 7); ctx.fill(); }
  }
  if (opt.rim) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [cx, cy, r] of clumps) { const g = ctx.createRadialGradient(cx + r * 0.6, cy - r * 0.2, 0, cx + r * 0.6, cy - r * 0.2, r * 0.9); g.addColorStop(0, opt.rim); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; blob(cx, cy, r); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

// ---------- the next wall: the region's own border, traced as a flickering dashed line ----------
function drawWarnLine(ctx, loops, sc) {
  sc = sc || 1;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.filter = `blur(${1.6 * sc}px)`; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3.4 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); } ctx.filter = 'none';
  const rnd = mulberry32(991);
  for (const l of loops) {
    // dashes laid along the path, each with its own brightness: a line that flickers
    let acc = 0, on = true, seg = [];
    const dash = 3.4 * sc, gap = 2.8 * sc;
    const flush = () => { if (seg.length > 1) { const a = rnd() < 0.18 ? 0.35 : 0.8 + rnd() * 0.2; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.4 * sc; pathOf(ctx, seg); ctx.stroke(); } seg = []; };
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1], b = l[i]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (on) { if (!seg.length) seg.push(a); seg.push(b); }
      acc += d;
      if (on && acc > dash) { flush(); on = false; acc = 0; } else if (!on && acc > gap) { on = true; acc = 0; }
    }
    flush();
  }
  ctx.restore();
}

// ---------- night band: a gently curved terminator, like an old world-clock map ----------
// cfg: { cx, cy, R, soft, y0, y1 } in map units. Night lies inside a large circle whose centre is off the map to the
// east, so the terminator is an arc; it fades out above and below the world so it never runs behind the interface.
function nightFn(cfg) {
  const fadeY = cfg.fade || 26;
  return (px, py) => {
    const d = Math.hypot(px - cfg.cx, py - cfg.cy);
    const env = sstep(cfg.y0 - fadeY, cfg.y0 + fadeY, py) * (1 - sstep(cfg.y1 - fadeY, cfg.y1 + fadeY, py));
    return sstep(-cfg.soft, cfg.soft, cfg.R - d) * env;
  };
}
function drawNight(ctx, info, cfg, opt) {
  opt = opt || {};
  const { Wd, Hd, dpr, s, ox, oy, RV, RIM, D } = info;
  const NF = nightFn(cfg);
  const img = ctx.getImageData(0, 0, Wd, Hd), P = img.data;
  const bc = document.createElement('canvas'); bc.width = Wd; bc.height = Hd; const bx = bc.getContext('2d'); bx.filter = `blur(${(opt.nightBlur || 1.1) * dpr}px)`; bx.drawImage(ctx.canvas, 0, 0); const BL = bx.getImageData(0, 0, Wd, Hd).data;
  const emis = new ImageData(Wd, Hd), E = emis.data;
  const A = opt.shadow === undefined ? 0.45 : opt.shadow; const soften = opt.soften === undefined ? 0.4 : opt.soften;
  const nc = [11 / 255, 18 / 255, 32 / 255];
  const coastW = opt.coastW || 2.2;
  for (let j = 0; j < Hd; j++) {
    const py = OY + ((j + 0.5) / dpr - oy) / s;
    for (let i = 0; i < Wd; i++) {
      const px = OX + ((i + 0.5) / dpr - ox) / s;
      const k = j * Wd + i, k4 = k * 4;
      const f = NF(px, py);
      if (f < 0.001) continue;
      let r = P[k4], g = P[k4 + 1], b = P[k4 + 2];
      if (soften > 0) { const q = f * soften; r += (BL[k4] - r) * q; g += (BL[k4 + 1] - g) * q; b += (BL[k4 + 2] - b) * q; }
      const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
      const m = A * f;
      r *= 1 - m * (1 - nc[0]); g *= 1 - m * (1 - nc[1]); b *= 1 - m * (1 - nc[2]);
      const dk = D[k];
      if (dk < 0.4 && RV[k] > 0.02) {
        const rv = RV[k];
        const coast = rv * (1 - sstep(0.2, coastW, -dk)) * sstep(-0.6, 0.2, -dk + 0.4);
        const e = f * (RIM[k] * 0.42 + coast * 0.85 + rv * sstep(0.6, 0.85, lum) * 0.1);
        if (e > 0.004) { E[k4] = 95; E[k4 + 1] = 242; E[k4 + 2] = 200; E[k4 + 3] = Math.min(1, e) * 255; }
      }
      P[k4] = r; P[k4 + 1] = g; P[k4 + 2] = b;
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(img, 0, 0);
  const c2 = document.createElement('canvas'); c2.width = Wd; c2.height = Hd; c2.getContext('2d').putImageData(emis, 0, 0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = opt.teal === undefined ? 0.75 : opt.teal; ctx.drawImage(c2, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opt.bloom === undefined ? 0.4 : opt.bloom; ctx.filter = `blur(${3.2 * dpr * s}px)`; ctx.drawImage(c2, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.restore();
  return NF;
}
// a warm wash on the day side (end screen dusk), capped low so the greens keep their colour
function drawDusk(ctx, W, H, amt) {
  ctx.save(); ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, `rgba(255,190,120,${amt})`); g.addColorStop(1, `rgba(255,170,130,${amt * 0.4})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------- cities: one consistent mark per region ----------
// grey land: a small cluster of grey blocks; green land: the footprint is painted under the canopy and a few lights show
function cityBlocks(R) {
  const rnd = mulberry32(R.i * 977 + 13); const rc = CITY_R(R); const out = [];
  const cell = 2.7, n = Math.ceil(rc / cell) + 1;
  const ca = Math.cos(R.ang), sa = Math.sin(R.ang);
  for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) {
    const x = a * cell + (rnd() - 0.5) * 0.5, y = b * cell + (rnd() - 0.5) * 0.5; const q = Math.hypot(x, y * 1.12);
    if (rnd() > 1.1 - sstep(rc * 0.25, rc + 0.4, q) * 1.15) continue;
    const wide = rnd() < 0.3;
    out.push({ x: R.x + x * ca + y * sa, y: R.y - x * sa + y * ca, w: cell * (wide ? 1.15 : 0.62 + rnd() * 0.2), h: cell * (0.55 + rnd() * 0.25), tall: q < rc * 0.4 ? 0.6 + rnd() * 0.6 : rnd() * 0.6, v: rnd() });
  }
  out.sort((p, q) => p.y - q.y);
  return out;
}
function drawCity(ctx, info, R, opt) {
  // opt: { turned, night (0..1), sc, phase: 'base' (drawn before the night pass) | 'glow' (after it) }
  const s = info.s, sc = opt.sc || 1, nf = opt.night || 0, ph = opt.phase || 'all';
  const base = ph !== 'glow', glow = ph !== 'base';
  const c = info.toCss(R.x, R.y); const rc = CITY_R(R) * s;
  const rnd = mulberry32(R.i * 131 + 7);
  ctx.save();
  if (!opt.turned) {
    const blocks = cityBlocks(R);
    if (base) {
    // a soft paved apron anchors the cluster
    const ag = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rc * 1.5); ag.addColorStop(0, `rgba(70,74,78,${0.28})`); ag.addColorStop(1, 'rgba(70,74,78,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(c[0], c[1], rc * 1.5, 0, 7); ctx.fill();
    const dark = ph === 'all' ? nf * 0.5 : 0;
    const shade = (hx, k) => { const r = parseInt(hx.slice(1, 3), 16), g = parseInt(hx.slice(3, 5), 16), b = parseInt(hx.slice(5, 7), 16); const m = 1 - k; return `rgb(${r * m | 0},${g * m | 0},${b * m | 0})`; };
    for (const B of blocks) {
      const p = info.toCss(B.x, B.y), w = B.w * s, h = B.h * s, ht = (0.5 + B.tall * 1.0) * s;
      ctx.fillStyle = `rgba(20,24,28,${0.35 * (1 - nf * 0.5)})`; ctx.fillRect(p[0] - w / 2 + ht * 0.5, p[1] - h / 2 + ht * 0.35, w, h);
      ctx.fillStyle = shade('#4E5256', dark); ctx.fillRect(p[0] - w / 2, p[1] - h / 2 + 0.2, w, h + ht * 0.45);
      const roof = ['#7F8387', '#8C9093', '#999C9E', '#727679'][Math.floor(B.v * 4)];
      ctx.fillStyle = shade(roof, dark); ctx.fillRect(p[0] - w / 2, p[1] - h / 2 - ht * 0.15, w, h);
      ctx.fillStyle = `rgba(226,228,224,${0.55 * (1 - nf * 0.7)})`; ctx.fillRect(p[0] - w / 2, p[1] - h / 2 - ht * 0.15, w, Math.max(0.5, 0.3 * s)); ctx.fillRect(p[0] - w / 2, p[1] - h / 2 - ht * 0.15, Math.max(0.5, 0.3 * s), h);
    }
    }
    if (glow && nf > 0.05) { // worried amber lights on the night side: one tidy cluster
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rc * 2.4); g.addColorStop(0, rgba('#F2B33D', 0.42 * nf)); g.addColorStop(0.45, rgba('#F2B33D', 0.14 * nf)); g.addColorStop(1, rgba('#F2B33D', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], rc * 2.4, 0, 7); ctx.fill();
      const na = 5 + Math.floor(rnd() * 3); for (let i = 0; i < na; i++) { const a = R.ang + i * 2.39996 + rnd() * 0.5, rr = (i === 0 ? 0 : 0.3 + 0.55 * Math.sqrt(rnd())) * CITY_R(R); const p = info.toCss(R.x + Math.cos(a) * rr, R.y + Math.sin(a) * rr * 0.9); const k = i === 0 ? 1 : 0.65 + 0.35 * rnd(); ctx.fillStyle = rgba('#F2B33D', 0.45 * nf * k); ctx.beginPath(); ctx.arc(p[0], p[1], 1.25 * s * sc, 0, 7); ctx.fill(); ctx.fillStyle = rgba('#FFE7A8', 0.95 * nf * k); ctx.beginPath(); ctx.arc(p[0], p[1], 0.55 * s * sc * (i === 0 ? 1.2 : 1), 0, 7); ctx.fill(); }
    }
  } else {
    // three to five lights on the old footprint, softened to teal at night, pale and small by day
    const n = 3 + Math.floor(rnd() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) { const a = R.ang + i * 2.39996 + rnd() * 0.4, rr = opt.ringOut ? (0.75 + 0.4 * rnd()) * CITY_R(R) : (i === 0 ? 0 : 0.45 + 0.35 * rnd()) * CITY_R(R) * 0.85; pts.push(info.toCss(R.x + Math.cos(a) * rr * 1.25, R.y + 2 + Math.sin(a) * rr * 0.7)); }
    if (glow && nf > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rc * 1.9); g.addColorStop(0, rgba('#5FF2C8', 0.3 * nf)); g.addColorStop(1, rgba('#5FF2C8', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], rc * 1.9, 0, 7); ctx.fill();
      pts.forEach((p, i) => { const k = i === 0 ? 1 : 0.6 + 0.3 * rnd(); ctx.fillStyle = rgba('#5FF2C8', 0.42 * nf * k); ctx.beginPath(); ctx.arc(p[0], p[1], 1.15 * s * sc, 0, 7); ctx.fill(); ctx.fillStyle = rgba('#E6FFF6', 0.9 * nf * k); ctx.beginPath(); ctx.arc(p[0], p[1], 0.5 * s * sc * (i === 0 ? 1.2 : 1), 0, 7); ctx.fill(); });
    }
    const day = 1 - nf;
    if (base && day > 0.05) for (const p of pts) { ctx.fillStyle = `rgba(255,246,214,${0.75 * day * (opt.dayLights || 1)})`; ctx.beginPath(); ctx.arc(p[0], p[1], 0.62 * s * sc, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(255,236,170,${0.22 * day * (opt.dayLights || 1)})`; ctx.beginPath(); ctx.arc(p[0], p[1], 1.5 * s * sc, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- continent labels, set along a gentle arc ----------
function drawArcLabel(ctx, text, x, y, o) {
  // o: { font, ls, k (curvature 1/px, + bows up), rot, styleAt(x,y) -> {fill, halo, haloW} }
  ctx.save();
  ctx.font = o.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  const ls = o.ls || 2, chars = [...text];
  const ws = chars.map(ch => ctx.measureText(ch).width);
  const L = ws.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
  const k = o.k || 0, rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
  let sPos = -L / 2;
  const items = [];
  chars.forEach((ch, i) => {
    const sc = sPos + ws[i] / 2; sPos += ws[i] + ls;
    let lx = sc, ly = 0, a = 0;
    if (k) { const R = 1 / k; a = sc * k; lx = R * Math.sin(a); ly = R - R * Math.cos(a); }
    const gx = x + lx * cr - ly * sr, gy = y + lx * sr + ly * cr;
    items.push([ch, gx, gy, a + rot]);
  });
  for (const pass of [0, 1]) for (const [ch, gx, gy, a] of items) {
    if (ch === ' ') continue;
    const st = o.styleAt ? o.styleAt(gx, gy) : o;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(a);
    if (pass === 0) { ctx.lineJoin = 'round'; ctx.strokeStyle = st.halo; ctx.lineWidth = st.haloW || 2.4; ctx.strokeText(ch, 0, 0); }
    else { ctx.fillStyle = st.fill; ctx.fillText(ch, 0, 0); }
    ctx.restore();
  }
  ctx.restore();
}

// ---------- region outlines (marching squares on the painted region field) ----------
function regionContour(info, pred, inset) {
  const { Wd, Hd, dpr, RG, BD, D } = info;
  let x0 = Wd, y0 = Hd, x1 = 0, y1 = 0;
  for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) { const r = RG[j * Wd + i]; if (r >= 0 && pred(r)) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; } }
  if (x1 < x0) return [];
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(Wd - 1, x1 + 2); y1 = Math.min(Hd - 1, y1 + 2);
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const V = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = (j + y0) * Wd + (i + x0); const r = RG[k]; V[j * W + i] = (r >= 0 && pred(r)) ? Math.min(pred(info.R2[k]) ? 99 : BD[k], -D[k]) - inset : -inset - 1; }
  const segs = []; const eid = new Map();
  const pt = (ia, ja, ib, jb) => { const va = V[ja * W + ia], vb = V[jb * W + ib]; const t = va / (va - vb); return [(x0 + ia + (ib - ia) * t + 0.5) / dpr, (y0 + ja + (jb - ja) * t + 0.5) / dpr]; };
  const add = (e1, p1, e2, p2) => { const si = segs.length; segs.push([e1, p1, e2, p2]); for (const e of [e1, e2]) { if (!eid.has(e)) eid.set(e, []); eid.get(e).push(si); } };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = V[j * W + i] > 0, b = V[j * W + i + 1] > 0, c = V[(j + 1) * W + i + 1] > 0, d = V[(j + 1) * W + i] > 0;
    const idx = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const T = () => [(j * W + i) * 2, pt(i, j, i + 1, j)], B = () => [((j + 1) * W + i) * 2, pt(i, j + 1, i + 1, j + 1)];
    const Lf = () => [(j * W + i) * 2 + 1, pt(i, j, i, j + 1)], Rt = () => [(j * W + i + 1) * 2 + 1, pt(i + 1, j, i + 1, j + 1)];
    const S = (u, v) => { const p = u(), q = v(); add(p[0], p[1], q[0], q[1]); };
    switch (idx) {
      case 1: case 14: S(Lf, B); break; case 2: case 13: S(B, Rt); break; case 3: case 12: S(Lf, Rt); break;
      case 4: case 11: S(T, Rt); break; case 6: case 9: S(T, B); break; case 7: case 8: S(T, Lf); break;
      case 5: S(T, Lf); S(B, Rt); break; case 10: S(T, Rt); S(Lf, B); break;
    }
  }
  const used = new Uint8Array(segs.length); const loops = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue; used[s0] = 1;
    const line = [segs[s0][1], segs[s0][3]];
    let endE = segs[s0][2], startE = segs[s0][0];
    for (let dir = 0; dir < 2; dir++) {
      let e = dir === 0 ? endE : startE;
      for (;;) {
        const lst = eid.get(e) || []; let nx = -1;
        for (const si of lst) if (!used[si]) { nx = si; break; }
        if (nx < 0) break; used[nx] = 1;
        const sg = segs[nx]; const fwd = sg[0] === e; const np = fwd ? sg[3] : sg[1]; e = fwd ? sg[2] : sg[0];
        if (dir === 0) line.push(np); else line.unshift(np);
      }
    }
    if (line.length > 8) loops.push(line);
  }
  return loops.map(l => smoothLine(l, 2.4));
}
function smoothLine(l, sigma) {
  // resample at ~0.75 px, then a gaussian moving average: calm, hand-inked outlines
  const rs = [l[0]]; let carry = 0; const st = 0.75;
  for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = st - carry; while (t <= d) { rs.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]); t += st; } carry = d - (t - st); }
  const closed = Math.hypot(l[0][0] - l[l.length - 1][0], l[0][1] - l[l.length - 1][1]) < 2;
  const n = rs.length, h = Math.ceil(sigma * 2.5 / st), w = []; let ws = 0;
  for (let k = -h; k <= h; k++) { const v = Math.exp(-0.5 * Math.pow(k * st / sigma, 2)); w.push(v); ws += v; }
  const out = [];
  for (let i = 0; i < n; i++) { let x = 0, y = 0, tw = 0; for (let k = -h; k <= h; k++) { let j = i + k; if (closed) j = ((j % n) + n) % n; else if (j < 0 || j >= n) continue; const v = w[k + h]; x += rs[j][0] * v; y += rs[j][1] * v; tw += v; } out.push([x / tw, y / tw]); }
  return out;
}
function chaikin(l) { const o = [l[0]]; for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(l[l.length - 1]); return o; }
function pathOf(ctx, l) { ctx.beginPath(); l.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }
function landOnly(info, loops, minIn) {
  // break outlines wherever they run along the coast: walls stand between regions, not on beaches
  const out = [];
  for (const l of loops) {
    let cur = [];
    for (const p of l) {
      const i = Math.round(p[0] * info.dpr), j = Math.round(p[1] * info.dpr);
      const d = (i >= 0 && j >= 0 && i < info.Wd && j < info.Hd) ? info.D[j * info.Wd + i] : 9;
      if (d < -minIn) cur.push(p); else { if (cur.length > 6) out.push(cur); cur = []; }
    }
    if (cur.length > 6) out.push(cur);
  }
  return out;
}
function drawWalls(ctx, loops, sc) {
  sc = sc || 1;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // drop shadow
  ctx.save(); ctx.translate(0.8 * sc, 1.3 * sc); ctx.filter = `blur(${0.7 * sc}px)`; ctx.strokeStyle = 'rgba(14,20,18,0.5)'; ctx.lineWidth = 2.2 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); } ctx.restore();
  // the wall: a raised 2 px line, darker on its lower face
  ctx.strokeStyle = '#9C9483'; ctx.lineWidth = 2.1 * sc; ctx.save(); ctx.translate(0, 0.55 * sc); for (const l of loops) { pathOf(ctx, l); ctx.stroke(); } ctx.restore();
  ctx.strokeStyle = '#EDE6D6'; ctx.lineWidth = 1.7 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); }
  // tiny posts along it
  const step = 9 * sc;
  for (const l of loops) {
    let acc = step * 0.5;
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1], b = l[i]; const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (acc <= seg) {
        const t = acc / seg; const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        ctx.fillStyle = 'rgba(14,20,18,0.42)'; ctx.beginPath(); ctx.arc(x + 0.7 * sc, y + 0.9 * sc, 1.25 * sc, 0, 7); ctx.fill();
        ctx.fillStyle = '#9C9483'; ctx.beginPath(); ctx.arc(x, y + 0.3 * sc, 1.25 * sc, 0, 7); ctx.fill();
        ctx.fillStyle = '#FFFBF2'; ctx.beginPath(); ctx.arc(x, y - 0.2 * sc, 1.15 * sc, 0, 7); ctx.fill();
        acc += step;
      }
      acc -= seg;
    }
  }
  ctx.restore();
}
function drawSurroundRing(ctx, loops, sc) {
  sc = sc || 1;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${2 * sc}px)`; ctx.strokeStyle = 'rgba(143,214,148,0.6)'; ctx.lineWidth = 4.5 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); }
  ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(20,50,30,0.35)'; ctx.lineWidth = 3.2 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); }
  ctx.strokeStyle = '#8FD694'; ctx.lineWidth = 2 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(230,255,226,0.8)'; ctx.lineWidth = 0.7 * sc; for (const l of loops) { pathOf(ctx, l); ctx.stroke(); }
  ctx.restore();
}

function withNight(ctx, info, nfv, draw, rim) {
  if (nfv < 0.02) { draw(ctx); return; }
  const oc = document.createElement('canvas'); oc.width = info.Wd; oc.height = info.Hd; const o = oc.getContext('2d');
  o.setTransform(info.dpr, 0, 0, info.dpr, 0, 0); draw(o);
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop'; o.fillStyle = `rgba(11,18,32,${0.45 * nfv})`; o.fillRect(0, 0, oc.width, oc.height);
  o.globalCompositeOperation = 'source-over';
  if (rim) { o.setTransform(info.dpr, 0, 0, info.dpr, 0, 0); rim(o); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(oc, 0, 0); ctx.restore();
}
G.RWS = { withNight, drawRivers, drawRoute, drawWorks, drawGreatTree, drawBloom, drawGeese, drawGoose, nightFn, drawNight, drawDusk, drawCity, drawArcLabel, regionContour, drawWalls, drawWarnLine, drawSurroundRing, landOnly, rgba, bez, traceRiver, RIVERS };
})(window);
