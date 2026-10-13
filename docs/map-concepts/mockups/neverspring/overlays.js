// NEVERSPRING overlays: painted light, lines and weather on top of the world disc.
(function () {
'use strict';
const { polar, mulberry32, clamp, smooth, mix, N1, N2, N3, N4, N5, fbm } = NS;
const TAU = Math.PI * 2;

function makeView(cx, cy, R) {
  return {
    cx, cy, R,
    P(h, r) { const p = polar(h, r); return [cx + p[0] * R, cy + p[1] * R]; },
    W(x, y) { return [cx + x * R, cy + y * R]; },
    toWorld(sx, sy) { return [(sx - cx) / R, (sy - cy) / R]; }
  };
}
function off(w, h, ctx) { const dpr = ctx.getTransform().a; const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr); const o = c.getContext('2d'); o.scale(dpr, dpr); return { c, o, dpr }; }

// ---------- background ----------
function drawSky(ctx, w, h, v, opts = {}) {
  ctx.fillStyle = '#0B1622'; ctx.fillRect(0, 0, w, h);
  let g = ctx.createRadialGradient(v.cx, v.cy, v.R * 0.7, v.cx, v.cy, v.R * 1.75);
  g.addColorStop(0, 'rgba(156,201,232,0.12)'); g.addColorStop(0.45, 'rgba(156,201,232,0.045)'); g.addColorStop(1, 'rgba(156,201,232,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  g = ctx.createLinearGradient(0, h * 0.55, 0, h);
  g.addColorStop(0, 'rgba(20,40,62,0)'); g.addColorStop(1, 'rgba(20,40,62,0.3)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(opts.starSeed || 404);
  const n = opts.stars || 50; let placed = 0;
  for (let i = 0; i < n * 4 && placed < n; i++) {
    const x = rnd() * w, y = rnd() * h; const d = Math.hypot(x - v.cx, y - v.cy);
    const a = 0.1 + rnd() * 0.2; const big = rnd() > 0.92;
    if (d < v.R + 12) continue; placed++;
    ctx.fillStyle = `rgba(255,255,255,${big ? a + 0.12 : a})`;
    ctx.beginPath(); ctx.arc(x, y, big ? 0.85 : 0.55, 0, TAU); ctx.fill();
    if (big) { const gg = ctx.createRadialGradient(x, y, 0, x, y, 3.5); gg.addColorStop(0, 'rgba(200,225,245,0.16)'); gg.addColorStop(1, 'rgba(200,225,245,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 4, y - 4, 8, 8); }
  }
}

// the disc, its halo and an engraved atlas bezel with degree ticks
function drawDisc(ctx, v, world, opts = {}) {
  const { cx, cy, R } = v; const k = opts.k || 1;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, R - 2, cx, cy, R + 14 * k); g.addColorStop(0, 'rgba(156,201,232,0.25)'); g.addColorStop(0.4, 'rgba(156,201,232,0.08)'); g.addColorStop(1, 'rgba(156,201,232,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 14 * k, 0, TAU); ctx.fill();
  // a soft ink shadow under the disc
  const g2 = ctx.createRadialGradient(cx + 2, cy + 5, R * 0.9, cx + 2, cy + 5, R * 1.06); g2.addColorStop(0, 'rgba(3,8,14,0.5)'); g2.addColorStop(1, 'rgba(3,8,14,0)');
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx + 2, cy + 5, R * 1.06, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.drawImage(world.canvas, cx - R, cy - R, 2 * R, 2 * R);
  if (opts.bezel === false) return;
  ctx.save();
  // inner neatline: a hairline just inside the coast of the disc
  ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, TAU); ctx.strokeStyle = 'rgba(11,22,34,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  const r0 = R + 1.2 * k, r1 = R + 5.2 * k;
  ctx.beginPath(); ctx.arc(cx, cy, r0, 0, TAU); ctx.strokeStyle = 'rgba(214,232,246,0.55)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r1, 0, TAU); ctx.strokeStyle = 'rgba(214,232,246,0.26)'; ctx.lineWidth = 0.7; ctx.stroke();
  for (let i = 0; i < 360; i += 5) {
    const a = i / 180 * Math.PI; const big = i % 30 === 0, mid = i % 10 === 0;
    const a0 = r0, a1 = big ? r1 + 1.6 * k : mid ? r0 + 2.6 * k : r0 + 1.6 * k;
    ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * a0, cy - Math.cos(a) * a0); ctx.lineTo(cx + Math.sin(a) * a1, cy - Math.cos(a) * a1);
    ctx.strokeStyle = big ? 'rgba(226,238,248,0.6)' : mid ? 'rgba(214,232,246,0.38)' : 'rgba(214,232,246,0.24)'; ctx.lineWidth = big ? 0.9 : 0.6; ctx.stroke();
  }
  ctx.restore();
}

// a whisper of paper grain over everything drawn on the disc, so overlays sit in the painting
function grainOver(ctx, v, seed, amt = 0.06) {
  const { o, c, dpr } = off(v.R * 2, v.R * 2, ctx);
  const img = o.createImageData(c.width, c.height); const rnd = mulberry32(seed || 9);
  for (let i = 0; i < img.data.length; i += 4) { const n = rnd(); const val = n > 0.5 ? 255 : 0; img.data[i] = val; img.data[i + 1] = val; img.data[i + 2] = val; img.data[i + 3] = Math.abs(n - 0.5) * 2 * 255 * amt; }
  o.putImageData(img, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.arc(v.cx, v.cy, v.R - 0.5, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'soft-light';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, (v.cx - v.R) * dpr, (v.cy - v.R) * dpr); ctx.restore();
}

// ---------- city lights: dense, clustered on coasts and rivers ----------
function glowDot(ctx, x, y, r, core, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  if (core > 0) { ctx.fillStyle = `rgba(255,226,170,${Math.min(1, a * 2.2)})`; ctx.beginPath(); ctx.arc(x, y, core, 0, TAU); ctx.fill(); }
}
function cityLights(world, seed, opts = {}) {
  const rnd = mulberry32(seed);
  const ok = (x, y, m = 0.004) => { const s = world.sample(x, y); return s.land && s.cov > 0.99 && s.white < 0.04 && s.l > m && s.coast > 0.8 && Math.hypot(x, y) < 0.975; };
  const avoid = (opts.avoid || []).map(([h, r, d]) => { const p = polar(h, r); return [p[0], p[1], d]; });
  const cities = [];
  (opts.fixed || []).forEach(c => { const p = polar(c[0], c[1]); cities.push([p[0], p[1], c[2]]); });
  const want = opts.count || 70;
  for (let t = 0; t < 20000 && cities.length < want; t++) {
    const x = rnd() * 2 - 1, y = rnd() * 2 - 1; if (!ok(x, y, 0.008)) continue;
    const s = world.sample(x, y); const reg = world.regions[s.rid]; if (!reg || !reg.people) continue;
    // people live on coasts and rivers
    const pull = (reg.people >= 2 ? 0.5 : 0.25) + (s.coast < 7 ? 0.45 : 0) + (s.river > 0.2 ? 0.4 : 0) - (s.mnt > 0.3 ? 0.4 : 0);
    if (rnd() > pull) continue;
    if (cities.some(c => Math.hypot(c[0] - x, c[1] - y) < (opts.spacing || 0.05))) continue;
    if (avoid.some(a => Math.hypot(a[0] - x, a[1] - y) < a[2])) continue;
    cities.push([x, y, (reg.people >= 2 ? 0.55 : 0.35) + rnd() * 0.45]);
  }
  const lights = [];
  for (const [cx, cy, size] of cities) {
    const n = Math.round(5 + size * 12);
    for (let i = 0; i < n; i++) {
      const rr = i === 0 ? 0 : Math.pow(rnd(), 1.2) * 0.024 * (0.6 + size * 0.6); const a = rnd() * TAU;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (!ok(x, y, 0.001)) continue;
      lights.push([x, y, i === 0 ? size : (0.22 + rnd() * 0.45) * size, i === 0 ? 1 : 0]);
    }
  }
  // villages strung along rivers and coasts
  for (let t = 0, n = 0; t < 20000 && n < (opts.villages || 140); t++) {
    const x = rnd() * 2 - 1, y = rnd() * 2 - 1; if (!ok(x, y)) continue;
    const s = world.sample(x, y); const reg = world.regions[s.rid]; if (!reg || !reg.people) continue;
    if (rnd() > 0.2 + (s.coast < 6 ? 0.45 : 0) + (s.river > 0.2 ? 0.5 : 0)) continue;
    if (avoid.some(a => Math.hypot(a[0] - x, a[1] - y) < a[2] * 0.7)) continue;
    lights.push([x, y, 0.12 + rnd() * 0.14, 0]); n++;
  }
  return { lights, cities };
}
function drawLights(ctx, v, L, k) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // a warm haze over the lit lands, so the amber side glows at thumbnail size
  for (const [x, y, s] of L.cities) { const [sx, sy] = v.W(x, y); glowDot(ctx, sx, sy, (13 + s * 10) * k, 0, '242,140,40', 0.045 + 0.05 * s); }
  for (const [x, y, s] of L.cities) { const [sx, sy] = v.W(x, y); glowDot(ctx, sx, sy, (4.5 + s * 4) * k, 0, '242,160,60', 0.16 + 0.14 * s); }
  for (const [x, y, s, core] of L.lights) {
    const [sx, sy] = v.W(x, y);
    if (s > 0.18) glowDot(ctx, sx, sy, (1.3 + s * 2.2) * k, 0, '242,162,58', 0.2 + s * 0.24);
    ctx.fillStyle = `rgba(255,${205 + s * 40 | 0},${130 + s * 80 | 0},${0.5 + s * 0.5})`;
    const cr = (0.3 + s * 0.32 + core * 0.2) * k; ctx.beginPath(); ctx.arc(sx, sy, cr, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------- curves ----------
function catmull(pts, seg = 14) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) { const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
function resample(path, step) {
  const out = [{ x: path[0][0], y: path[0][1], a: Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]) }]; let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i]; const seg = Math.hypot(bx - ax, by - ay); if (seg < 1e-6) continue; const ang = Math.atan2(by - ay, bx - ax);
    let t = step - carry;
    while (t <= seg) { out.push({ x: ax + (bx - ax) * t / seg, y: ay + (by - ay) * t / seg, a: ang }); t += step; }
    carry = seg - (t - step);
  }
  return out;
}
function screenPath(v, hr) { return catmull(hr.map(p => p.length === 2 && p.scr ? p : v.P(p[0], p[1])), 16); }
function trimPath(path, from, endPt, gap) { // cut the path where it comes within gap of endPt
  if (!endPt) return path; const out = [];
  for (const p of path) { if (Math.hypot(p[0] - endPt[0], p[1] - endPt[1]) < gap) break; out.push(p); }
  return out.length > 1 ? out : path;
}

// a live fuel line: amber dots sized by how much it carries, chevrons pointing at the Furnace, a travelling glint
function drawFuelLine(ctx, v, hr, o) {
  const k = o.k || 1; const w = o.weight || 2;
  let path = o.path || screenPath(v, hr); path = trimPath(path, 0, o.endAt, (o.endGap || 0) * k);
  const dots = resample(path, (3.4 + w * 0.7) * k);
  ctx.save();
  // a soft amber under-glow so the line reads as one stroke
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.strokeStyle = `rgba(242,162,58,${0.08 + w * 0.035})`; ctx.lineWidth = (2.2 + w * 1.5) * k; ctx.stroke();
  ctx.strokeStyle = 'rgba(11,22,34,0.35)'; ctx.lineWidth = (0.9 + w * 0.55) * k; ctx.stroke();
  // the source: a small amber ring
  if (o.source !== false) { const d = dots[0]; ctx.fillStyle = 'rgba(11,22,34,0.6)'; ctx.beginPath(); ctx.arc(d.x, d.y, (2.2 + w * 0.5) * k, 0, TAU); ctx.fill(); ctx.strokeStyle = '#F2A23A'; ctx.lineWidth = 1 * k; ctx.beginPath(); ctx.arc(d.x, d.y, (1.8 + w * 0.45) * k, 0, TAU); ctx.stroke(); }
  const rad = (0.62 + w * 0.32) * k; const chevEvery = 6;
  dots.forEach((d, i) => {
    if (i === 0 && o.source !== false) return;
    if (i % chevEvery === 3 && i < dots.length - 2) {
      // a chevron pointing along the flow, towards the Furnace
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); const c = (1.7 + w * 0.5) * k;
      ctx.beginPath(); ctx.moveTo(-c * 0.7, -c); ctx.lineTo(c * 0.55, 0); ctx.lineTo(-c * 0.7, c);
      ctx.strokeStyle = 'rgba(11,22,34,0.7)'; ctx.lineWidth = (1.0 + w * 0.35) * k + 1.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = '#FFD27A'; ctx.lineWidth = (0.7 + w * 0.3) * k; ctx.stroke(); ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(11,22,34,0.55)'; ctx.beginPath(); ctx.arc(d.x + 0.25 * k, d.y + 0.45 * k, rad + 0.45 * k, 0, TAU); ctx.fill();
    ctx.fillStyle = '#F2A23A'; ctx.beginPath(); ctx.arc(d.x, d.y, rad, 0, TAU); ctx.fill();
  });
  // one glint travelling along, with a short comet tail
  const gt = o.glint != null ? o.glint : 0.55;
  const gi = Math.floor(gt * (dots.length - 1));
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 5; j++) { const d = dots[gi - j]; if (!d) break; const a = 1 - j / 5;
    if (j === 0) glowDot(ctx, d.x, d.y, (5 + w * 1.5) * k, 0, '255,210,122', 0.6);
    ctx.fillStyle = `rgba(255,240,205,${0.95 * a})`; ctx.beginPath(); ctx.arc(d.x, d.y, (rad + 0.5 * k) * (1 - j * 0.12), 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  (o.vehicles || []).forEach(vh => {
    const d = dots[Math.floor(vh.t * (dots.length - 1))]; if (!d) return;
    if (vh.kind === 'ship') drawShip(ctx, d.x, d.y, d.a, k, { live: true });
    else drawTrain(ctx, d.x, d.y, d.a, k);
  });
  ctx.restore();
  return dots;
}
function drawShip(ctx, x, y, ang, k, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.lineCap = 'round';
  const Lh = (o.turn ? 4.4 : 3.8) * k, Bw = (o.turn ? 1.7 : 1.45) * k;
  if (o.turn) {
    // a U-turn wake: the ship sailed towards the ice, swung round and is heading back out
    const s = o.turn, R = 3.2 * k * (o.wr || 1);
    const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) {
      // straight back from the stern, around a half circle, and a short way forward on the other side
      let px, py; const L1 = 4.5 * k * (o.wl || 1);
      if (t < 0.35) { const u = t / 0.35; px = -Lh - u * L1; py = 0; }
      else if (t < 0.8) { const u = (t - 0.35) / 0.45; const a = Math.PI * u; px = -Lh - L1 - Math.sin(a) * R; py = s * (R - Math.cos(a) * R); }
      else { const u = (t - 0.8) / 0.2; px = -Lh - L1 + u * 3.5 * k; py = s * 2 * R; }
      pts.push([px, py, t]); }
    for (let i = 1; i < pts.length; i++) { const a = 0.95 * (1 - pts[i][2]) + 0.12; ctx.strokeStyle = `rgba(232,244,252,${a})`; ctx.lineWidth = (1.25 - 0.6 * pts[i][2]) * k; ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
  } else {
    for (const sg of [-1, 1]) { const g = ctx.createLinearGradient(-Lh, 0, -Lh - 9 * k, 0); g.addColorStop(0, 'rgba(230,242,250,0.7)'); g.addColorStop(1, 'rgba(230,242,250,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 0.75 * k; ctx.beginPath(); ctx.moveTo(-Lh * 0.7, sg * Bw * 0.5); ctx.lineTo(-Lh - 9 * k, sg * 3.6 * k); ctx.stroke(); }
  }
  if (o.live) { ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, 0, 0, 7 * k, 0, '255,210,122', 0.5); ctx.globalCompositeOperation = 'source-over'; }
  ctx.fillStyle = 'rgba(6,14,24,0.6)'; hull(ctx, 0.4 * k, 0.7 * k, Lh, Bw); ctx.fill();
  ctx.fillStyle = o.live ? '#FFE9C2' : '#DCE6EF'; hull(ctx, 0, 0, Lh, Bw); ctx.fill();
  ctx.strokeStyle = o.live ? 'rgba(120,70,20,0.8)' : 'rgba(30,48,66,0.95)'; ctx.lineWidth = 0.55 * k; ctx.stroke();
  ctx.fillStyle = o.live ? '#C98A3A' : '#7D8B99'; ctx.fillRect(-Lh * 0.55, -Bw * 0.45, Lh * 0.55, Bw * 0.9);
  ctx.restore();
}
function hull(ctx, ox, oy, L, B) { ctx.beginPath(); ctx.moveTo(ox + L, oy); ctx.quadraticCurveTo(ox + L * 0.35, oy - B * 1.05, ox - L, oy - B * 0.8); ctx.lineTo(ox - L, oy + B * 0.8); ctx.quadraticCurveTo(ox + L * 0.35, oy + B * 1.05, ox + L, oy); ctx.closePath(); }
function drawTrain(ctx, x, y, ang, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, 0, 0, 7 * k, 0, '255,210,122', 0.5); ctx.globalCompositeOperation = 'source-over';
  for (let c = 0; c < 3; c++) { ctx.fillStyle = 'rgba(6,14,24,0.55)'; ctx.beginPath(); ctx.roundRect((-5.4 + c * 3.6) * k + 0.4 * k, -1.1 * k + 0.6 * k, 3 * k, 2.2 * k, 0.7 * k); ctx.fill();
    ctx.fillStyle = c === 2 ? '#FFF1D6' : '#FFE0A6'; ctx.beginPath(); ctx.roundRect((-5.4 + c * 3.6) * k, -1.1 * k, 3 * k, 2.2 * k, 0.7 * k); ctx.fill(); }
  ctx.restore();
}

// a cut line: grey dots with an ink outline, ending at the ice
function greyDots(ctx, path, k, o = {}) {
  const dots = resample(path, (o.step || 4.4) * k); const n = dots.length;
  dots.forEach((d, i) => { const t = n > 1 ? i / (n - 1) : 1; const fade = o.fadeOut ? 1 - t * 0.85 : (o.fadeIn ? 0.35 + 0.65 * t : 1);
    ctx.fillStyle = `rgba(11,22,34,${0.85 * fade})`; ctx.beginPath(); ctx.arc(d.x, d.y, (o.r || 1.25) * k + 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(138,152,166,${fade})`; ctx.beginPath(); ctx.arc(d.x, d.y, (o.r || 1.25) * k, 0, TAU); ctx.fill(); });
  return dots;
}
function drawSpark(ctx, x, y, k) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, x, y, 9 * k, 0, '242,162,58', 0.6); glowDot(ctx, x, y, 3.5 * k, 0, '255,236,200', 0.9);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#FFE6B0'; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; const r0 = 1.6 * k, r1 = (i % 2 ? 3.6 : 5.6) * k; ctx.lineWidth = (i % 2 ? 0.6 : 0.9) * k; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 1.1 * k, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCutLine(ctx, v, near, far, breakPt, k, ships) {
  ctx.save();
  const a = greyDots(ctx, screenPath(v, near), k, { fadeIn: false });
  const b = far ? greyDots(ctx, screenPath(v, far), k, { fadeOut: true, r: 1.1 }) : [];
  (ships || []).forEach(s => drawShip(ctx, s.x, s.y, s.ang, k, { turn: s.turn, wl: s.wl, wr: s.wr }));
  if (breakPt) drawSpark(ctx, breakPt[0], breakPt[1], k);
  ctx.restore();
  return a;
}

// ---------- hearths, rings, furnace ----------
// a Hearth: an amber glass dome, the land showing through it
function drawHearth(ctx, x, y, k) {
  const r = 9 * k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, x, y, r * 2.7, 0, '242,162,58', 0.32);
  ctx.globalCompositeOperation = 'source-over';
  // a lightly tinted interior, warm light pooling low inside the glass
  let g = ctx.createRadialGradient(x, y + r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,214,140,0.30)'); g.addColorStop(0.7, 'rgba(242,162,58,0.10)'); g.addColorStop(1, 'rgba(242,162,58,0.22)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  // the glass ring
  ctx.strokeStyle = 'rgba(11,22,34,0.55)'; ctx.lineWidth = 2.6 * k; ctx.beginPath(); ctx.arc(x, y, r + 0.3 * k, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#F2A23A'; ctx.lineWidth = 1.5 * k; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  // a thin highlight arc, upper left
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,248,232,0.95)'; ctx.lineWidth = 0.9 * k;
  ctx.beginPath(); ctx.arc(x, y, r - 2.2 * k, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,232,0.5)'; ctx.lineWidth = 0.7 * k; ctx.beginPath(); ctx.arc(x, y, r - 2.2 * k, Math.PI * 1.52, Math.PI * 1.6); ctx.stroke();
  ctx.restore();
}
function drawWarnRing(ctx, x, y, k) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, x, y, 16 * k, 0, '242,162,58', 0.1); ctx.globalCompositeOperation = 'source-over';
  ctx.setLineDash([2.6 * k, 2.4 * k]); ctx.strokeStyle = 'rgba(11,22,34,0.45)'; ctx.lineWidth = 2.4 * k; ctx.beginPath(); ctx.arc(x, y, 12 * k, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(242,162,58,0.9)'; ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.arc(x, y, 12 * k, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
function starPath(ctx, x, y, R, r, n, rot) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n; const rr = i % 2 ? r : R; ctx.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } ctx.closePath(); }
function drawFurnaceColumn(ctx, x, y, k, columnH) {
  const ch = (columnH || 90) * k, cw = 12 * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createLinearGradient(0, y, 0, y - ch);
  g.addColorStop(0, 'rgba(255,200,110,0.65)'); g.addColorStop(0.3, 'rgba(255,200,110,0.28)'); g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - cw * 0.5, y); ctx.bezierCurveTo(x - cw * 0.3, y - ch * 0.4, x - cw * 0.12, y - ch * 0.7, x - cw * 0.14, y - ch); ctx.lineTo(x + cw * 0.14, y - ch); ctx.bezierCurveTo(x + cw * 0.12, y - ch * 0.7, x + cw * 0.3, y - ch * 0.4, x + cw * 0.5, y); ctx.fill();
  g = ctx.createLinearGradient(0, y, 0, y - ch * 0.9); g.addColorStop(0, 'rgba(255,250,232,0.95)'); g.addColorStop(1, 'rgba(255,250,232,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 1 * k, y - ch * 0.9, 2 * k, ch * 0.9);
  for (const [t, a] of [[0.34, 0.5], [0.62, 0.3]]) { const yy = y - ch * t; const gg = ctx.createRadialGradient(x, yy, 0, x, yy, 7 * k); gg.addColorStop(0, `rgba(255,236,190,${a})`); gg.addColorStop(1, 'rgba(255,236,190,0)'); ctx.fillStyle = gg; ctx.save(); ctx.translate(x, yy); ctx.scale(1, 0.45); ctx.translate(-x, -yy); ctx.fillRect(x - 7 * k, yy - 7 * k, 14 * k, 14 * k); ctx.restore(); }
  ctx.restore();
}
// the Furnace: a forge-sun, a round glowing core with flame tongues and a heat-shimmer ring.
// Cold, it is a dark iron ember dusted with frost.
function flameTongue(ctx, x, y, a, r0, len, wid, curl) {
  const b0 = a - wid, b1 = a + wid; const tip = a + curl; const rt = r0 + len;
  const p = (ang, r) => [x + Math.sin(ang) * r, y - Math.cos(ang) * r];
  ctx.beginPath(); ctx.moveTo(...p(b0, r0 * 0.92));
  const c1 = p(b0 + curl * 0.15, r0 + len * 0.55), c2 = p(b1 + curl * 0.7, r0 + len * 0.45);
  ctx.quadraticCurveTo(c1[0], c1[1], ...p(tip, rt));
  ctx.quadraticCurveTo(c2[0], c2[1], ...p(b1, r0 * 0.92));
  ctx.closePath();
}
function drawFurnace(ctx, x, y, k, lit) {
  ctx.save();
  const r0 = 5.6 * k;
  if (lit) {
    let g = ctx.createRadialGradient(x, y, 0, x, y, 24 * k); g.addColorStop(0, 'rgba(11,22,34,0.85)'); g.addColorStop(0.6, 'rgba(11,22,34,0.6)'); g.addColorStop(1, 'rgba(11,22,34,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 24 * k, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, x, y, 40 * k, 0, '255,170,70', 0.5);
    glowDot(ctx, x, y, 17 * k, 0, '255,224,150', 0.7);
    ctx.globalCompositeOperation = 'source-over';
    // heat shimmer: two wavering rings
    for (const [rr, amp, waves, al, lw] of [[15.5, 0.9, 15, 0.7, 0.95], [19.5, 0.8, 11, 0.32, 0.8]]) {
      ctx.beginPath(); for (let i = 0; i <= 180; i++) { const a = i / 180 * TAU; const q = (rr + amp * Math.sin(a * waves) + 0.4 * Math.sin(a * 3 + 1)) * k; ctx.lineTo(x + Math.sin(a) * q, y - Math.cos(a) * q); }
      ctx.closePath(); ctx.strokeStyle = `rgba(255,214,140,${al})`; ctx.lineWidth = lw * k; ctx.setLineDash(rr > 17 ? [3 * k, 2.2 * k] : []); ctx.stroke(); ctx.setLineDash([]); }
    // flame tongues, curling clockwise
    const fg = ctx.createRadialGradient(x, y, r0 * 0.6, x, y, 13.5 * k); fg.addColorStop(0, '#FFF6D8'); fg.addColorStop(0.45, '#FFD27A'); fg.addColorStop(1, '#F2A23A');
    ctx.fillStyle = fg;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.12; const long = i % 2 === 0; flameTongue(ctx, x, y, a, r0, (long ? 7.4 : 4.6) * k, long ? 0.3 : 0.24, long ? 0.42 : 0.3); ctx.fill(); }
    ctx.strokeStyle = 'rgba(150,80,10,0.35)'; ctx.lineWidth = 0.4 * k;
    for (let i = 0; i < 12; i += 2) { const a = i / 12 * TAU + 0.12; flameTongue(ctx, x, y, a, r0, 7.4 * k, 0.3, 0.42); ctx.stroke(); }
    // the core
    g = ctx.createRadialGradient(x - 1.2 * k, y - 1.4 * k, 0, x, y, r0 + 0.6 * k); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#FFF3CC'); g.addColorStop(1, '#FFC85E');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.6 * k; ctx.beginPath(); ctx.arc(x, y, r0 - 1.4 * k, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
  } else {
    // a faint cool shadow under it
    let g = ctx.createRadialGradient(x + 1 * k, y + 2 * k, 0, x + 1 * k, y + 2 * k, 18 * k); g.addColorStop(0, 'rgba(40,70,100,0.35)'); g.addColorStop(1, 'rgba(40,70,100,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 1 * k, y + 2 * k, 18 * k, 0, TAU); ctx.fill();
    ctx.beginPath(); for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; const q = (15.5 + 0.7 * Math.sin(a * 15)) * k; ctx.lineTo(x + Math.sin(a) * q, y - Math.cos(a) * q); }
    ctx.closePath(); ctx.strokeStyle = 'rgba(107,122,136,0.5)'; ctx.lineWidth = 0.8 * k; ctx.stroke();
    const fg = ctx.createRadialGradient(x - 3 * k, y - 3 * k, 0, x, y, 13 * k); fg.addColorStop(0, '#5F6D7B'); fg.addColorStop(1, '#2F3A46');
    ctx.fillStyle = fg;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.12; const long = i % 2 === 0; flameTongue(ctx, x, y, a, r0, (long ? 7.0 : 4.4) * k, long ? 0.3 : 0.24, long ? 0.42 : 0.3); ctx.fill(); }
    ctx.strokeStyle = 'rgba(20,28,36,0.6)'; ctx.lineWidth = 0.5 * k;
    for (let i = 0; i < 12; i += 2) { const a = i / 12 * TAU + 0.12; flameTongue(ctx, x, y, a, r0, 7.0 * k, 0.3, 0.42); ctx.stroke(); }
    g = ctx.createRadialGradient(x - 1.5 * k, y - 1.5 * k, 0, x, y, r0); g.addColorStop(0, '#7A8794'); g.addColorStop(0.6, '#4A5664'); g.addColorStop(1, '#2C3541');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r0, 0, TAU); ctx.fill();
    // a last dull ember deep in the iron
    g = ctx.createRadialGradient(x + 0.8 * k, y + 1 * k, 0, x + 0.8 * k, y + 1 * k, 2.6 * k); g.addColorStop(0, 'rgba(150,96,70,0.55)'); g.addColorStop(1, 'rgba(150,96,70,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 0.8 * k, y + 1 * k, 2.6 * k, 0, TAU); ctx.fill();
    // frost: a rime on the upper-left edges and a dusting of specks
    ctx.strokeStyle = 'rgba(236,246,252,0.8)'; ctx.lineWidth = 0.9 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r0 - 0.3 * k, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ctx.strokeStyle = 'rgba(236,246,252,0.65)'; ctx.lineWidth = 0.7 * k;
    for (let i = 0; i < 12; i += 1) { const a = i / 12 * TAU + 0.12; if (Math.sin(a + 0.8) > -0.2) continue; const long = i % 2 === 0; const r1 = r0 + (long ? 4.5 : 2.8) * k;
      ctx.beginPath(); ctx.moveTo(x + Math.sin(a - 0.2) * (r0 + 0.5 * k), y - Math.cos(a - 0.2) * (r0 + 0.5 * k)); ctx.lineTo(x + Math.sin(a + 0.1) * r1, y - Math.cos(a + 0.1) * r1); ctx.stroke(); }
    const rnd = mulberry32(17);
    for (let i = 0; i < 26; i++) { const a = rnd() * TAU; const rr = rnd() * 12 * k; const px = x + Math.sin(a) * rr, py = y - Math.cos(a) * rr; const up = (px - x) * -0.6 + (py - y) * -0.8;
      if (up < -2 * k && rnd() > 0.3) continue; ctx.fillStyle = `rgba(242,248,252,${0.55 + rnd() * 0.45})`; ctx.beginPath(); ctx.arc(px, py, (0.3 + rnd() * 0.45) * k, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function drawLabel(ctx, text, x, y, o) {
  ctx.save(); ctx.font = o.font; ctx.textBaseline = 'middle'; ctx.textAlign = o.align || 'left';
  if ('letterSpacing' in ctx) ctx.letterSpacing = o.spacing || '0px';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.shadowColor = 'rgba(8,16,26,0.9)'; ctx.shadowBlur = 6; ctx.strokeStyle = 'rgba(11,22,34,0.92)'; ctx.lineWidth = (o.halo || 2) * 2; ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0; ctx.strokeText(text, x, y);
  ctx.fillStyle = o.color; ctx.fillText(text, x, y); ctx.restore();
}

// ---------- weather ----------
// a translucent spiral cloud with streaks of blowing snow
function drawBlizzard(ctx, x, y, k, seed = 31) {
  const R = 25 * k; const pad = 12 * k; const S = 2 * (R + pad); const C = S / 2;
  const { c, o, dpr } = off(S, S, ctx);
  // cloud mass: soft puffs laid along three spiral arms
  const rnd = mulberry32(seed);
  const puff = (px, py, r, a) => { const g = o.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(240,248,255,${a * 0.55})`); g.addColorStop(1, 'rgba(240,248,255,0)'); o.fillStyle = g; o.beginPath(); o.arc(px, py, r, 0, TAU); o.fill(); };
  puff(C, C, R * 0.55, 0.55);
  for (let arm = 0; arm < 3; arm++) {
    const base = arm * TAU / 3 + 0.4;
    for (let t = 0; t <= 1.0001; t += 0.055) {
      const a = base + t * 2.7; const rr = R * (0.12 + 0.9 * t);
      const px = C + Math.cos(a) * rr + (rnd() - 0.5) * 2 * k, py = C + Math.sin(a) * rr + (rnd() - 0.5) * 2 * k;
      puff(px, py, R * (0.34 - 0.2 * t) * (0.8 + rnd() * 0.4), 0.34 * (1 - t * 0.6));
    }
  }
  // erode with noise so the edges go wispy
  const img = o.getImageData(0, 0, c.width, c.height); const D = img.data; const cw = c.width;
  for (let py = 0; py < c.height; py++) for (let px = 0; px < cw; px++) {
    const o4 = (py * cw + px) * 4; if (!D[o4 + 3]) continue;
    const dx = (px / dpr - C) / R, dy = (py / dpr - C) / R; const rho = Math.hypot(dx, dy); const th = Math.atan2(dy, dx);
    const n = 0.5 + 0.5 * fbm(N3, dx * 3 + Math.cos(th - 2 * Math.log(rho + 0.1)) * 0.6, dy * 3, 4, 2, 0.55);
    const eye = 1 - 0.75 * smooth(0.16, 0.0, rho);
    let a = D[o4 + 3] / 255; a = clamp(a * (0.45 + 1.0 * n) * eye, 0, 0.9);
    const cool = clamp(1 - a * 1.4, 0, 1); D[o4] = 255 - cool * 40; D[o4 + 1] = 255 - cool * 20; D[o4 + 2] = 255; D[o4 + 3] = a * 255;
  }
  o.putImageData(img, 0, 0);
  // fine streaks of blowing snow on the arms
  o.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const arm = i % 3; const t0 = 0.25 + rnd() * 0.65; const base = arm * TAU / 3 + 0.4;
    o.beginPath(); for (let s = 0; s <= 6; s++) { const t = t0 + s * 0.022; const a = base + t * 2.7 + (rnd() - 0.5) * 0.02; const rr = R * (0.12 + 0.9 * t) + (i % 2 ? 2 : -2) * k; const X = C + Math.cos(a) * rr, Y = C + Math.sin(a) * rr; s ? o.lineTo(X, Y) : o.moveTo(X, Y); }
    o.strokeStyle = `rgba(255,255,255,${0.35 + rnd() * 0.35})`; o.lineWidth = (0.35 + rnd() * 0.3) * k; o.stroke();
  }
  for (let i = 0; i < 22; i++) { const a = rnd() * TAU, rr = (0.9 + rnd() * 0.45) * R; o.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.45})`; o.beginPath(); o.arc(C + Math.cos(a) * rr, C + Math.sin(a) * rr, (0.3 + rnd() * 0.35) * k, 0, TAU); o.fill(); }
  ctx.save();
  ctx.globalAlpha = 0.5; ctx.filter = `blur(${2.5 * k}px) brightness(0)`; ctx.drawImage(c, x - C + 2.5 * k, y - C + 4 * k, S, S);
  ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.drawImage(c, x - C, y - C, S, S);
  ctx.restore();
}
function drawWind(ctx, v, hr, k, o = {}) {
  const base = screenPath(v, hr); const n = base.length; const maxW = (o.width || 2.4) * k;
  const L = [], R = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1); const q = base[Math.min(i + 1, n - 1)], pp = base[Math.max(i - 1, 0)]; const dx = q[0] - pp[0], dy = q[1] - pp[1]; const dl = Math.hypot(dx, dy) || 1;
    const w = maxW * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.9) * (0.55 + 0.45 * t) * 0.5; const nx = -dy / dl, ny = dx / dl;
    L.push([base[i][0] + nx * w, base[i][1] + ny * w]); R.push([base[i][0] - nx * w, base[i][1] - ny * w]); }
  const shape = () => { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); };
  ctx.save();
  ctx.filter = `blur(${2.4 * k}px)`; ctx.fillStyle = `rgba(214,236,250,${(o.alpha || 0.33) * 0.8})`; shape(); ctx.fill(); ctx.filter = 'none';
  const g = ctx.createLinearGradient(base[0][0], base[0][1], base[n - 1][0], base[n - 1][1]);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.25, `rgba(255,255,255,${o.alpha || 0.33})`); g.addColorStop(0.85, `rgba(255,255,255,${(o.alpha || 0.33) * 1.1})`); g.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = g; shape(); ctx.fill();
  // a few flakes riding the wind
  const rnd = mulberry32(o.seed || 3);
  for (let i = 0; i < 7; i++) { const t = 0.2 + rnd() * 0.75; const p = base[Math.floor(t * (n - 1))]; ctx.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.3})`; ctx.beginPath(); ctx.arc(p[0] + (rnd() - 0.5) * 6 * k, p[1] + (rnd() - 0.5) * 6 * k, (0.4 + rnd() * 0.4) * k, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// the ice crystal you tap: a small cluster of glinting ice shards with a soft pulsing glow (no ring)
function shard(ctx, x, y, h, w, rot, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const H = h * k, Wd = w * k;
  const P = [[0, -H], [Wd * 0.5, -H * 0.72], [Wd * 0.5, 0], [0, H * 0.12], [-Wd * 0.5, 0], [-Wd * 0.5, -H * 0.72]];
  ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  ctx.fillStyle = '#7FC0E2'; ctx.fill();
  // lit left face and its bright tip
  ctx.beginPath(); ctx.moveTo(0, -H); ctx.lineTo(-Wd * 0.5, -H * 0.72); ctx.lineTo(-Wd * 0.5, 0); ctx.lineTo(0, H * 0.12); ctx.closePath();
  const g = ctx.createLinearGradient(0, -H, 0, H * 0.1); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D4EFFC'); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -H); ctx.lineTo(Wd * 0.5, -H * 0.72); ctx.lineTo(Wd * 0.08, -H * 0.62); ctx.closePath(); ctx.fillStyle = '#E6F7FF'; ctx.fill();
  ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  ctx.strokeStyle = 'rgba(30,86,128,0.75)'; ctx.lineWidth = 0.55 * k; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function drawCrystal(ctx, x, y, k, o = {}) {
  ctx.save();
  // a soft pulse of cold light, caught at its brightest
  ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, x, y - 2 * k, 15 * k, 0, '156,214,244', 0.38); ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(x, y - 2 * k, 9 * k, x, y - 2 * k, 15 * k); g.addColorStop(0, 'rgba(156,214,244,0)'); g.addColorStop(0.6, 'rgba(156,214,244,0.16)'); g.addColorStop(1, 'rgba(156,214,244,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 2 * k, 15 * k, 0, TAU); ctx.fill();
  // a blue shadow on the snow
  ctx.fillStyle = 'rgba(40,90,140,0.35)'; ctx.beginPath(); ctx.ellipse(x + 1.5 * k, y + 2.6 * k, 6.5 * k, 1.8 * k, 0, 0, TAU); ctx.fill();
  shard(ctx, x - 3.4 * k, y + 2.2 * k, 7.0, 3.4, -0.42, k);
  shard(ctx, x + 3.6 * k, y + 2.2 * k, 7.8, 3.4, 0.38, k);
  shard(ctx, x, y + 2.6 * k, 12.5, 4.4, 0.04, k);
  // the glint
  const gx = x - 0.3 * k, gy = y - 9.6 * k;
  ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, gx, gy, 5 * k, 0, '230,248,255', 0.8); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#FFFFFF'; starPath(ctx, gx, gy, 4.6 * k, 0.55 * k, 4, 0); ctx.fill();
  starPath(ctx, gx, gy, 2.2 * k, 0.4 * k, 4, Math.PI / 4); ctx.fill();
  ctx.restore();
}
// an iceberg: a floe with its blue body showing under the water
function drawIceberg(ctx, x, y, k, seed = 5) {
  ctx.save();
  const rnd = mulberry32(seed);
  const shape = (cx, cy, s) => { ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const rr = s * (0.78 + 0.22 * Math.sin(a * 3 + 1) + 0.12 * Math.sin(a * 5)) * (a > 2.4 && a < 3.6 ? 0.82 : 1); const X = cx + Math.cos(a) * rr * 1.25, Y = cy + Math.sin(a) * rr * 0.9; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.closePath(); };
  // underwater body
  ctx.fillStyle = 'rgba(156,201,232,0.32)'; shape(x + 1.6 * k, y + 2.4 * k, 6.6 * k); ctx.fill();
  ctx.fillStyle = 'rgba(156,201,232,0.22)'; shape(x + 2.4 * k, y + 3.6 * k, 8.2 * k); ctx.fill();
  // drift trail
  ctx.strokeStyle = 'rgba(214,234,248,0.35)'; ctx.lineWidth = 0.6 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 6 * k, y + 2 * k); ctx.quadraticCurveTo(x - 11 * k, y + 3 * k, x - 16 * k, y + 1.5 * k); ctx.stroke();
  // the floe
  const g = ctx.createLinearGradient(x - 5 * k, y - 4 * k, x + 5 * k, y + 4 * k); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#EAF3FA'); g.addColorStop(1, '#C7DDEE');
  ctx.fillStyle = g; shape(x, y, 4.6 * k); ctx.fill();
  ctx.strokeStyle = 'rgba(90,140,186,0.8)'; ctx.lineWidth = 0.6 * k; ctx.stroke();
  ctx.strokeStyle = 'rgba(126,172,210,0.7)'; ctx.lineWidth = 0.5 * k; ctx.beginPath(); ctx.moveTo(x - 2 * k, y - 2.5 * k); ctx.lineTo(x + 0.5 * k, y); ctx.lineTo(x + 3.5 * k, y + 0.8 * k); ctx.stroke();
  // a small companion piece
  ctx.fillStyle = 'rgba(156,201,232,0.3)'; shape(x + 9 * k, y + 4.2 * k, 2.4 * k); ctx.fill();
  ctx.fillStyle = '#EEF5FB'; shape(x + 8.4 * k, y + 3.4 * k, 1.6 * k); ctx.fill();
  ctx.restore();
}

// win-screen aurora: two translucent curtains with soft vertical rays, outside and over the rim from 10 to 4 o'clock
function drawAurora(ctx, v, ribbons, opts = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height; const dpr = ctx.getTransform().a;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const o = c.getContext('2d'); o.scale(dpr, dpr);
  o.globalCompositeOperation = 'lighter'; o.lineCap = 'butt';
  ribbons.forEach((rb, ri) => {
    const path = catmull(rb.pts, 30); const pts = resample(path, 0.5);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i]; const t = i / (n - 1);
      const env = smooth(0, 0.14, t) * smooth(1, 0.82, t);
      const dx = Math.abs(Math.cos(p.a)); const wgt = 0.25 + 0.75 * dx;
      const rays = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * N2(i * 0.045 + ri * 40, 3.1), 2.2);
      const fold = 0.65 + 0.35 * Math.sin(t * 19 + ri * 2.3);
      const hgt = (rb.h || 34) * (0.55 + 0.45 * (0.5 + 0.5 * N3(i * 0.02 + ri * 9, 1.7))) * (rb.hScale ? rb.hScale(p.x, p.y) : 1);
      let a = (rb.a || 0.45) * env * rays * fold * wgt * 0.5;
      const inside = Math.hypot(p.x - v.cx, p.y - v.cy) < v.R + 1;
      const g = o.createLinearGradient(0, p.y + 2, 0, p.y - hgt);
      if (inside) { g.addColorStop(0, `rgba(127,214,232,${a * 0.35})`); g.addColorStop(1, 'rgba(127,214,232,0)'); }
      else { g.addColorStop(0, `rgba(95,227,181,0)`); g.addColorStop(0.06, `rgba(95,227,181,${a})`); g.addColorStop(0.4, `rgba(110,220,206,${a * 0.55})`); g.addColorStop(1, 'rgba(127,214,232,0)'); }
      o.strokeStyle = g; o.lineWidth = 0.9; o.beginPath(); o.moveTo(p.x, p.y + 2); o.lineTo(p.x, p.y - hgt); o.stroke();
    }
  });
  // a brighter hem along the lower edge of each curtain, outside the disc only
  ribbons.forEach((rb, ri) => {
    const pts = resample(catmull(rb.pts, 30), 1.5); const n = pts.length;
    for (let i = 1; i < n; i++) { const p = pts[i], q = pts[i - 1]; const t = i / (n - 1); if (Math.hypot(p.x - v.cx, p.y - v.cy) < v.R + 2) continue;
      const env = smooth(0, 0.14, t) * smooth(1, 0.82, t) * (0.6 + 0.4 * Math.sin(t * 19 + ri * 2.3));
      o.strokeStyle = `rgba(150,255,214,${0.32 * env * (rb.a || 0.45) / 0.45})`; o.lineWidth = 1.4; o.beginPath(); o.moveTo(q.x, q.y + 1.5); o.lineTo(p.x, p.y + 1.5); o.stroke(); }
  });
  // keep green off the snow: inside the disc only the faint cool top colour survives
  o.globalCompositeOperation = 'destination-out'; o.fillStyle = 'rgba(0,0,0,0.6)'; o.beginPath(); o.arc(v.cx, v.cy, v.R - 1, 0, TAU); o.fill();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${1.6 * dpr}px)`; ctx.drawImage(c, 0, 0); ctx.filter = `blur(${0.4 * dpr}px)`; ctx.globalAlpha = 0.8; ctx.drawImage(c, 0, 0);
  ctx.restore();
}

window.NSO = { makeView, drawSky, drawDisc, grainOver, cityLights, drawLights, drawFuelLine, drawCutLine, drawSpark, greyDots, drawShip, drawHearth, drawWarnRing, drawFurnace, drawFurnaceColumn, drawLabel, drawBlizzard, drawWind, drawCrystal, drawIceberg, drawAurora, glowDot, screenPath, starPath, catmull, resample };
})();
