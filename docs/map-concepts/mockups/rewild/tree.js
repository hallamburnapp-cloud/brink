// REWILD — the Tree: node layout, icons and the hand-painted tree behind it.
(function (G) {
'use strict';
const sv = (c, inner, sw = 1.8) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ICON = {
  fast: c => sv(c, `<path d="M6.5 12.5l5.5-5.5 5.5 5.5"/><path d="M6.5 18.5L12 13l5.5 5.5"/>`, 2.1),
  blooms: c => sv(c, `<circle cx="12" cy="12" r="2.2" fill="${c}"/><path d="M12 9.6c-1.6-1.4-1.8-3.6 0-5.2 1.8 1.6 1.6 3.8 0 5.2zM14.3 11.3c.4-2.1 2.2-3.4 4.6-2.8-.5 2.4-2.4 3.4-4.6 2.8zM13.4 14.2c2 .8 2.8 2.9 1.7 5-2.1-1-2.6-3.1-1.7-5zM10.6 14.2c-2 .8-2.8 2.9-1.7 5 2.1-1 2.6-3.1 1.7-5zM9.7 11.3c-.4-2.1-2.2-3.4-4.6-2.8.5 2.4 2.4 3.4 4.6 2.8z"/>`, 1.5),
  bees: c => sv(c, `<ellipse cx="12" cy="14.2" rx="4.3" ry="5.4"/><path d="M8.1 12.6h7.8M8.1 15.8h7.8"/><path d="M10.4 9.2C8.6 5.8 4.6 6 4.9 8.4c.3 2 3.7 2.4 5.5.8zM13.6 9.2c1.8-3.4 5.8-3.2 5.5-.8-.3 2-3.7 2.4-5.5.8z"/>`, 1.6),
  agt: c => sv(c, `<path d="M10.5 20.5v-5"/><path d="M10.5 15.6c-3.6 0-5.8-2-5.8-4.6 0-2.4 1.8-3.6 3.2-3.8.6-2 1.6-3 2.6-3s2 1 2.6 3c1.4.2 3.2 1.4 3.2 3.8"/><path d="M7.5 20.5h6"/><path d="M18.5 14.2v6M15.5 17.2h6"/>`, 1.8),
  canopy: c => sv(c, `<path d="M6.4 14.6a3 3 0 0 1-.3-6 4.2 4.2 0 0 1 7.9-1.7 3.4 3.4 0 0 1 4.2 3.7 2.6 2.6 0 0 1-.5 4z"/><path d="M12 14.6v5.9M9.6 20.5h4.8M12 17.2l-1.8-1.6"/><path d="M2.6 9.2c-.9 1.6-.9 3.6 0 5.2M21.4 9.2c.9 1.6.9 3.6 0 5.2"/>`, 1.7),
  vines: c => sv(c, `<path d="M3 20.5c4.6-.7 6.5-3.8 7.4-7.4S13.3 5 17.8 4.2"/><path d="M8 21.5c4.4-1 6.3-4.6 7-7.8.8-3 2.4-5.4 6.4-5.9"/><path d="M5.6 21c4.4-.8 6.2-4.2 7.1-7.6S15.6 5.6 20 5.8" stroke-width="1.1" stroke-dasharray="1.6 2.1"/><path d="M15.4 14.6c1.3-.1 2.2-.9 2.6-2.2"/><path d="M18 12.4c.5-1.8 1.9-2.6 3.6-2.3-.5 1.8-1.9 2.6-3.6 2.3z" fill="${c}"/>`, 1.6),
  thorns: c => sv(c, `<path d="M12 21.5c-.6-6 .6-12.4 0-19"/><path d="M12 7.4l-3.4-2.2M12.2 11.2l3.4-2.2M11.9 15l-3.4-2.2M12.1 18.8l3.4-2.2"/>`, 1.8),
  spring: c => sv(c, `<circle cx="12" cy="12" r="3.6" fill="${c}" fill-opacity=".25"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>`, 1.8),
  river: c => sv(c, `<path d="M3 8.6c3-2.2 5.4 2 9 0s6-2.2 9 0M3 15.4c3-2.2 5.4 2 9 0s6-2.2 9 0"/>`, 1.8),
  drift: c => sv(c, `<path d="M5.2 10.4h11.2M5.2 14.6h11.2"/><path d="M5.2 10.4c-1.2 0-2.1.9-2.1 2.1s.9 2.1 2.1 2.1"/><ellipse cx="16.6" cy="12.5" rx="2" ry="2.1"/><circle cx="16.6" cy="12.5" r=".55" fill="${c}"/><path d="M8.5 10.4V7.6"/><path d="M8.5 8c-.2-1.5-1.3-2.3-2.8-2.2.1 1.4 1.2 2.3 2.8 2.2zM8.5 7.6c.3-1.2 1.3-1.8 2.6-1.7-.1 1.2-1.1 1.9-2.6 1.7z" fill="${c}"/><path d="M2.6 19c2-1.3 3.6 1.1 6 0s4-1.3 6 0 3.6 1.1 6.8 0"/>`, 1.6),
  dandelion: c => sv(c, `<path d="M12 21.5v-9.5"/><circle cx="12" cy="8.2" r="4.4" stroke-dasharray="1.4 1.6"/><circle cx="12" cy="8.2" r="1.1" fill="${c}"/><path d="M18.6 4.2l1.6-1M19.4 7.4l1.8-.2"/>`, 1.6),
  geese: c => sv(c, `<path d="M8.6 7.2c1.1-1.3 2.3-1.3 3.4 0 1.1-1.3 2.3-1.3 3.4 0"/><path d="M3.6 13c1.1-1.3 2.3-1.3 3.4 0 1.1-1.3 2.3-1.3 3.4 0"/><path d="M13.6 13c1.1-1.3 2.3-1.3 3.4 0 1.1-1.3 2.3-1.3 3.4 0"/><path d="M5 19.5c3-2 4.6 1 7 0s4-2 7 0" stroke-width="1.2" opacity=".6"/>`, 1.7),
  longmig: c => sv(c, `<path d="M3.2 18.6C4.6 12.4 8.6 8.6 14.2 7.4" stroke-dasharray=".1 2.6"/><path d="M15 7.6c1.2-1.6 2.6-1.6 3.8 0 1.2-1.6 2.6-1.6 3.6-.2" /><path d="M13.6 20.5c1.4-1.9 2.8-2.7 4.4-2.7s3 .8 4.2 2.7"/><path d="M18 17.8v-2.6M18 15.4c-.9-.9-2-1-3-.4M18 15.4c.9-.9 2-1 3-.4"/>`, 1.6),
  seedrain: c => sv(c, `<path d="M7 13.6h10a3.4 3.4 0 0 0 .4-6.8 5 5 0 0 0-9.6 1.1A3.2 3.2 0 0 0 7 13.6z"/><path d="M8.6 17l-.7 2.4M12.6 17l-.7 2.4M16.6 17l-.7 2.4"/>`, 1.7),
  pine: c => sv(c, `<path d="M12 3l-5 7h3l-4 6h12l-4-6h3z"/><path d="M12 16v5"/>`, 1.7),
  cactus: c => sv(c, `<path d="M10.5 21V5.4a1.8 1.8 0 0 1 3.6 0V21"/><path d="M10.5 14H8a2 2 0 0 1-2-2V9.4M14.1 12h1.9a2 2 0 0 0 2-2V7.6"/><path d="M7 21h10.5"/>`, 1.7),
  lichen: c => sv(c, `<path d="M2.8 19.5l6.4-11 3.8 6 2.8-3.8 5.4 8.8z"/><circle cx="8.6" cy="15.6" r="1" fill="${c}"/><circle cx="12.6" cy="17.4" r=".9" fill="${c}"/><circle cx="16.6" cy="16.6" r="1" fill="${c}"/>`, 1.7),
  deep: c => sv(c, `<path d="M3 9.6h18"/><path d="M12 9.6V6.4"/><path d="M12 6.8c-.3-1.8-1.6-2.8-3.4-2.6.1 1.7 1.4 2.8 3.4 2.6zM12 6.4c.4-1.5 1.6-2.3 3.2-2.1-.1 1.5-1.4 2.3-3.2 2.1z" fill="${c}"/><path d="M12 9.6v11.4M12 12.6c-1.8.8-3 2.4-3.4 4.8M12 14.8c1.7.7 2.8 2.1 3.2 4.2M9.1 15.2l-2 .6M14.6 17.4l1.9.3"/>`, 1.6),
  cracks: c => sv(c, `<rect x="3.8" y="10.4" width="16.4" height="10" rx="1.6"/><path d="M11 10.4l2 3.6-2.6 2 1.8 4.4"/><path d="M12.2 10.4V7.6c0-2.2 1.8-3.6 4.2-3.4-.1 2.2-1.8 3.4-4.2 3.4"/>`, 1.6),
  threads: c => sv(c, `<path d="M3 7.6h18"/><path d="M6 4.6v3M18 4.6v3" stroke-width="2.2"/><path d="M4.6 12.4c3 2 5-2 8 0s4.6 2 6.4 0M4.6 17.4c3 2 5-2 8 0s4.6 2 6.4 0"/>`, 1.7),
  hush: c => sv(c, `<path d="M3.2 10.6c3.4 4.6 14.2 4.6 17.6 0"/><path d="M6.2 13.8l-1.6 2.2M12 15.4v2.8M17.8 13.8l1.6 2.2"/>`, 1.8),
  rust: c => sv(c, `<path d="M3.5 20.5v-6.4l3.6-2.4v2.4l3.6-2.4v2.4l3.4-2.2V5.4h3.6v15.1z"/><path d="M15.4 9.2c1.6-1.6 3.6-1.6 5-.2-1.4 1.6-3.4 1.6-5 .2z" fill="${c}"/>`, 1.6),
};
const NODES = [
  { k: 'spring', n: 'Spring', x: 220, y: 128, st: 'lock', big: 1, sec: 'b', cost: 140 },
  { k: 'canopy', n: 'Canopy', x: 122, y: 184, st: 'open', sec: 'b', cost: 72 },
  { k: 'agt', n: 'Another Great Tree', x: 316, y: 184, st: 'own', sec: 'b' },
  { k: 'blooms', n: 'More Blooms', x: 52, y: 270, st: 'own', sec: 'b' },
  { k: 'bees', n: 'Bees', x: 158, y: 272, st: 'open', sec: 'b', cost: 34 },
  { k: 'vines', n: 'Road Vines', x: 286, y: 272, st: 'lock', sec: 'b', cost: 58 },
  { k: 'thorns', n: 'Thorns', x: 388, y: 270, st: 'open', sec: 'b', cost: 66 },
  { k: 'fast', n: 'Fast Growth', x: 220, y: 326, st: 'own', sec: 'b' },
  { k: 'river', n: 'Riverbanks', x: 176, y: 386, st: 'own', sec: 'r' },
  { k: 'drift', n: 'Driftwood', x: 110, y: 389, st: 'own', sec: 'r' },
  { k: 'dandelion', n: 'Dandelion Clocks', x: 44, y: 386, st: 'open', sec: 'r', cost: 29 },
  { k: 'geese', n: 'Migrating Geese', x: 264, y: 386, st: 'own', sec: 'r' },
  { k: 'longmig', n: 'Long Migration', x: 330, y: 389, st: 'open', sel: 1, sec: 'r', cost: 21 },
  { k: 'seedrain', n: 'Seed Rain', x: 396, y: 386, st: 'lock', sec: 'r', cost: 90 },
  { k: 'deep', n: 'Deep Roots', x: 220, y: 488, st: 'own', sec: 'q' },
  { k: 'pine', n: 'Pine Roots', x: 54, y: 522, st: 'open', sec: 'q', cost: 18 },
  { k: 'cactus', n: 'Cactus Roots', x: 140, y: 534, st: 'own', sec: 'q' },
  { k: 'cracks', n: 'Cracks', x: 292, y: 534, st: 'open', sec: 'q', cost: 48 },
  { k: 'rust', n: 'Rust', x: 386, y: 522, st: 'own', sec: 'q' },
  { k: 'lichen', n: 'Lichen', x: 106, y: 600, st: 'open', sec: 'q', cost: 23 },
  { k: 'threads', n: 'Underground Threads', x: 220, y: 582, st: 'lock', sec: 'q', cost: 52 },
  { k: 'hush', n: 'Hush', x: 348, y: 600, st: 'open', sec: 'q', cost: 41 },
];
const BY = {}; NODES.forEach(n => BY[n.k] = n);
const GROUND = 438, TX = 220;
const P = k => [BY[k].x, BY[k].y];
// branches: cubic curves [a, c1, c2, b]; own: grown (a vine runs along it), upTo: the vine stops at this fraction
const LIMBS = [
  { p: [[TX, GROUND], [TX + 3, 400], [TX - 2, 350], P('fast')], w0: 30, w1: 19, own: 1 },
  { p: [P('fast'), [TX - 4, 270], [TX + 3, 190], P('spring')], w0: 14, w1: 5 },
  { p: [[TX - 3, 300], [196, 268], [160, 232], P('canopy')], w0: 12, w1: 5 },
  { p: [[TX + 3, 296], [246, 262], [282, 228], P('agt')], w0: 12, w1: 5, own: 1 },
  { p: [[192, 282], [182, 280], [170, 276], P('bees')], w0: 6, w1: 4 },
  { p: [[198, 290], [150, 304], [96, 288], P('blooms')], w0: 7.5, w1: 4, own: 1 },
  { p: [[246, 286], [258, 282], [272, 276], P('vines')], w0: 6, w1: 4 },
  { p: [[244, 294], [300, 306], [350, 292], P('thorns')], w0: 7.5, w1: 4 },
  { p: [[TX - 8, 410], [170, 398], [100, 392], P('dandelion')], w0: 12, w1: 4, own: 1, upTo: 0.66 },
  { p: [[TX + 8, 410], [270, 398], [340, 392], P('seedrain')], w0: 12, w1: 4, own: 1, upTo: 0.3 },
];
// roots: tapered, wandering, with rootlets
const ROOTS = [
  { p: [[TX, GROUND], [TX - 3, 470], [TX + 4, 540], P('threads')], w0: 20, w1: 2.5, own: 1, upTo: 0.42, seed: 1 },
  { p: [[TX - 10, GROUND + 6], [170, 452], [96, 470], P('pine')], w0: 10, w1: 2, seed: 2 },
  { p: [[TX - 6, GROUND + 10], [196, 480], [158, 500], P('cactus')], w0: 9, w1: 2, own: 1, seed: 3 },
  { p: [[TX + 6, GROUND + 10], [246, 482], [282, 500], P('cracks')], w0: 9, w1: 2, seed: 4 },
  { p: [[TX + 10, GROUND + 6], [276, 450], [344, 468], P('rust')], w0: 10, w1: 2, own: 1, seed: 5 },
  { p: [[140, 472], [114, 510], [118, 560], P('lichen')], w0: 4.5, w1: 1.6, seed: 6 },
  { p: [[304, 474], [332, 508], [344, 560], P('hush')], w0: 4.5, w1: 1.6, seed: 7 },
];
function cub(p, t) { const u = 1 - t; return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]; }
function samples(L, wob, seed) {
  const n = 60, out = []; const ph = (seed || 1) * 1.7;
  for (let i = 0; i <= n; i++) {
    const t = i / n; const a = cub(L.p, Math.max(0, t - 0.01)), b = cub(L.p, Math.min(1, t + 0.01)), c = cub(L.p, t);
    let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    const off = wob ? wob * Math.sin(t * Math.PI) * (Math.sin(t * 9 + ph) * 0.7 + Math.sin(t * 23 + ph * 2) * 0.3) : 0;
    out.push({ x: c[0] - ty * off, y: c[1] + tx * off, nx: -ty, ny: tx, t });
  }
  return out;
}
function tapered(ctx, S, w0, w1, pw) {
  const w = t => (w0 + (w1 - w0) * Math.pow(t, pw || 0.8)) / 2;
  ctx.beginPath(); S.forEach((q, i) => { const r = w(q.t); i ? ctx.lineTo(q.x + q.nx * r, q.y + q.ny * r) : ctx.moveTo(q.x + q.nx * r, q.y + q.ny * r); });
  for (let i = S.length - 1; i >= 0; i--) { const q = S[i], r = w(q.t); ctx.lineTo(q.x - q.nx * r, q.y - q.ny * r); }
  ctx.closePath();
}

function paintTree(cv, dpr) {
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = RW.mulberry32(77);
  // soil: a soft wash below the ground line
  const sg = ctx.createLinearGradient(0, GROUND - 6, 0, 660);
  sg.addColorStop(0, 'rgba(160,120,80,0.16)'); sg.addColorStop(0.25, 'rgba(160,120,80,0.10)'); sg.addColorStop(1, 'rgba(160,120,80,0.02)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, GROUND + 2);
  for (let x = 0; x <= 440; x += 10) ctx.lineTo(x, GROUND + 2 + Math.sin(x * 0.07) * 1.5);
  ctx.lineTo(440, 660); ctx.lineTo(0, 660); ctx.fill();
  for (let i = 0; i < 220; i++) { const x = rnd() * 440, y = GROUND + 8 + rnd() * 210; ctx.fillStyle = `rgba(120,90,60,${0.05 + rnd() * 0.08})`; ctx.beginPath(); ctx.arc(x, y, 0.6 + rnd() * 1.4, 0, 7); ctx.fill(); }
  // crown: soft green washes behind the branches
  const wash = (x, y, r, a, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  [[220, 214, 150, 0.22], [110, 244, 100, 0.16], [330, 244, 100, 0.16], [220, 144, 90, 0.16], [60, 284, 70, 0.12], [380, 284, 70, 0.12]].forEach(([x, y, r, a]) => wash(x, y, r, a, 'rgba(143,214,148,A)'));
  [[200, 254, 110, 0.10], [260, 194, 90, 0.08]].forEach(([x, y, r, a]) => wash(x, y, r, a, 'rgba(62,155,95,A)'));
  for (let i = 0; i < 260; i++) {
    const a = rnd() * 6.283, rr = Math.sqrt(rnd());
    const x = 220 + Math.cos(a) * 205 * rr, y = 222 + Math.sin(a) * 118 * rr;
    if (y > 350) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * 6.28);
    ctx.fillStyle = rnd() < 0.5 ? `rgba(62,155,95,${0.08 + rnd() * 0.12})` : `rgba(143,214,148,${0.12 + rnd() * 0.16})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 3 + rnd() * 4, 1.6 + rnd() * 2, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  // roots first, under the soil line: tapered and wandering, a few rootlets each
  for (const L of ROOTS) {
    const S = samples(L, 3.2, L.seed);
    tapered(ctx, S, L.w0, L.w1, 0.7); ctx.fillStyle = 'rgba(150,110,74,0.62)'; ctx.fill();
    ctx.save(); tapered(ctx, S.map(q => ({ ...q, x: q.x - q.nx * 0.8, y: q.y - q.ny * 0.8 })), L.w0 * 0.45, L.w1 * 0.4, 0.7); ctx.fillStyle = 'rgba(196,160,118,0.35)'; ctx.fill(); ctx.restore();
    const rr = RW.mulberry32(L.seed * 31);
    for (let k = 0; k < 3; k++) {
      const t0 = 0.25 + rr() * 0.6, q = S[Math.round(t0 * 60)]; const side = rr() < 0.5 ? -1 : 1; const len = 10 + rr() * 12;
      const b = [q.x + (q.nx * side * 0.8 + (S[60].x - S[0].x) / 300) * len, q.y + (q.ny * side * 0.8) * len + len * 0.45];
      const R2 = { p: [[q.x, q.y], [q.x + q.nx * side * len * 0.3, q.y + q.ny * side * len * 0.3 + 3], [b[0] - 2, b[1] - 3], b] };
      tapered(ctx, samples(R2, 1.2, k + L.seed), Math.max(1.4, (L.w0 + (L.w1 - L.w0) * t0) * 0.42), 0.4, 1); ctx.fillStyle = 'rgba(150,110,74,0.5)'; ctx.fill();
    }
  }
  // branches: tapered painted strokes with a lit edge
  for (const L of LIMBS) {
    const S = samples(L, 1.4, 9);
    tapered(ctx, S, L.w0, L.w1, 0.8); ctx.fillStyle = 'rgba(104,74,50,0.92)'; ctx.fill();
    ctx.save(); tapered(ctx, S.map(q => ({ ...q, x: q.x - q.nx * L.w0 * 0.18, y: q.y - q.ny * L.w0 * 0.18 })), L.w0 * 0.28, L.w1 * 0.25, 0.8); ctx.fillStyle = 'rgba(190,150,110,0.45)'; ctx.fill(); ctx.restore();
  }
  // grown paths: a green vine runs along every branch and root you own
  const vine = (L, wob, seed) => {
    const S = samples(L, wob, seed); const lim = L.upTo || 1;
    ctx.strokeStyle = '#3E9B5F'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
    S.forEach((q, i) => { if (q.t > lim) return; const w = Math.sin(q.t * 40) * 1.6; const x = q.x + q.nx * w, y = q.y + q.ny * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    for (let i = 2; i < S.length; i += 6) { const q = S[i]; if (q.t > lim) break; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(q.ny, q.nx) + (i % 2 ? 0.6 : Math.PI - 0.6)); ctx.fillStyle = i % 3 ? '#8FD694' : '#3E9B5F'; ctx.beginPath(); ctx.ellipse(4, 0, 4, 1.9, 0, 0, 7); ctx.fill(); ctx.restore(); }
  };
  LIMBS.forEach(L => { if (L.own) vine(L, 1.4, 9); });
  ROOTS.forEach(L => { if (L.own) vine(L, 3.2, L.seed); });
  // trunk bark lines
  ctx.strokeStyle = 'rgba(60,40,26,0.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(TX - 8 + i * 4, GROUND - 6); ctx.bezierCurveTo(TX - 7 + i * 3.5, 400, TX - 6 + i * 3, 360, TX - 4 + i * 2, 334); ctx.stroke(); }
  // ground line with grass tufts
  ctx.strokeStyle = 'rgba(80,70,50,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let x = 6; x <= 434; x += 4) { const y = GROUND + Math.sin(x * 0.07) * 1.5; x === 6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  for (let i = 0; i < 46; i++) { const x = 8 + rnd() * 424; if (Math.abs(x - TX) < 24) continue; const y = GROUND + Math.sin(x * 0.07) * 1.5; ctx.strokeStyle = `rgba(62,155,95,${0.45 + rnd() * 0.4})`; ctx.lineWidth = 1.1; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + j * 1.6, y); ctx.quadraticCurveTo(x + j * 2.4, y - 3, x + j * 3.4 + (rnd() - 0.5) * 2, y - 5 - rnd() * 3); ctx.stroke(); } }
  // root flare
  ctx.fillStyle = 'rgba(104,74,50,0.92)'; ctx.beginPath(); ctx.moveTo(TX - 26, GROUND + 3); ctx.quadraticCurveTo(TX - 12, GROUND - 4, TX - 13, GROUND - 22); ctx.lineTo(TX + 13, GROUND - 22); ctx.quadraticCurveTo(TX + 12, GROUND - 4, TX + 28, GROUND + 3); ctx.closePath(); ctx.fill();
}

const SEEDS = 64;
const seedGlyph = (c, sz) => RWI.seed(c, sz, c === '#F2B33D' ? '#A8680F' : 'rgba(110,100,80,.6)', 'rgba(110,70,20,.55)', 'rgba(255,255,255,.6)');
function nodeHTML(nd) {
  const sz = nd.big ? 50 : 42;
  let bg, br, ic, lab, extra = '', op = 1;
  if (nd.st === 'own') { bg = 'radial-gradient(circle at 35% 30%,#5DBB7C,#3E9B5F 55%,#2F7D4F)'; br = '2px solid #F7F3EA'; ic = '#FFFFFF'; lab = '#22302A'; extra = 'box-shadow:0 0 0 1px rgba(47,125,79,.55),0 3px 8px -2px rgba(20,60,36,.45);'; }
  else if (nd.st === 'open') { bg = '#FBF8F1'; br = '2px solid #3E9B5F'; ic = '#2F7D4F'; lab = '#22302A'; extra = 'box-shadow:0 3px 8px -3px rgba(20,40,30,.3);'; }
  else { bg = 'rgba(240,235,224,.7)'; br = '1.5px dashed #B9B19C'; ic = '#ABA38E'; lab = '#8F8875'; op = 0.55; }
  if (nd.big && nd.st === 'lock') { br = '2px dashed #D9B36A'; ic = '#C7A04F'; bg = 'rgba(244,236,218,.8)'; op = 0.7; }
  if (nd.sel) extra = 'box-shadow:0 0 0 3px #F4EFE4,0 0 0 5.5px #F2B33D,0 0 18px 6px rgba(242,179,61,.45);';
  const icon = ICON[nd.k](ic).replace('width="22" height="22"', `width="${nd.big ? 26 : 22}" height="${nd.big ? 26 : 22}"`);
  const words = nd.n.split(' ');
  let l1 = nd.n, l2 = '';
  if (nd.n.length > 12 && words.length > 1) { l1 = words.slice(0, words.length > 2 ? 2 : 1).join(' '); l2 = words.slice(words.length > 2 ? 2 : 1).join(' '); if (l1.length > 12 && words.length > 2) { l1 = words[0]; l2 = words.slice(1).join(' '); } }
  const ly = nd.y + sz / 2 + 3;
  let chip = '';
  if (nd.st !== 'own' && nd.cost) {
    const ok = nd.st === 'open' && nd.cost <= SEEDS;
    const cy = ly + (l2 ? 32 : 17) + 1;
    const sty = ok ? 'color:#7A4F04;background:#FFF1CC;border:1px solid rgba(214,150,30,.8);box-shadow:0 1px 0 rgba(214,150,30,.25)'
      : nd.st === 'lock' ? 'color:#9C957F;background:rgba(236,231,219,.9);border:1px dashed rgba(156,149,127,.7)' : 'color:#5E5E52;background:rgba(246,242,233,.95);border:1px solid rgba(34,48,42,.2)';
    chip = `<div class="ncost" style="left:${nd.x - 32}px;top:${cy}px;opacity:${op}"><span style="${sty}">${seedGlyph(ok ? '#F2B33D' : nd.st === 'lock' ? '#C9C1AB' : '#B9B09A', 12)}${nd.cost}</span></div>`;
  }
  return `<div class="node" style="left:${nd.x - sz / 2}px;top:${nd.y - sz / 2}px;width:${sz}px;height:${sz}px;background:${bg};border:${br};opacity:${op};${extra}">${icon}</div>
  <div class="nlab" style="left:${nd.x - 50}px;top:${ly}px;color:${lab};opacity:${op === 1 ? 1 : 0.85};${nd.sel ? 'font-weight:800;color:#22302A' : ''}"><span>${l1}${l2 ? '<br>' + l2 : ''}</span></div>${chip}`;
}
G.RWTREE = { NODES, ICON, paintTree, nodeHTML, GROUND };
})(window);
