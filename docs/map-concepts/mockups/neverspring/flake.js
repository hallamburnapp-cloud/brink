// NEVERSPRING: the Snowflake, one six-armed ice crystal that grows as you buy.
// Owned crystals are bright faceted ice with a glow; the rest are frosted, translucent ice waiting to grow.
(function () {
const TAU = Math.PI * 2;
const WIND = { col: '#9CC9E8', light: '#F0FAFF', dark: '#8EC2E6', rgb: '156,201,232' };
const COLD = { col: '#F2F7FB', light: '#FFFFFF', dark: '#C6D8E8', rgb: '242,247,251' };
const HUSH = { col: '#B9B2D8', light: '#EEEAFB', dark: '#A39BCB', rgb: '185,178,216' };
// clockwise from 12 o'clock
const ARMS = [
  { key: 'SKY', ang: 0, ...WIND }, { key: 'SEA', ang: 60, ...WIND },
  { key: 'SNOW', ang: 120, ...COLD }, { key: 'ICE', ang: 180, ...COLD },
  { key: 'DARK', ang: 240, ...HUSH }, { key: 'QUIET', ang: 300, ...HUSH }
];
const NODE = [0.3, 0.45, 0.6, 0.745, 0.885];
const BRANCH = [0.17, 0.155, 0.135, 0.105, 0.07];

function glow(ctx, x, y, r, rgb, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
function bladePath(ctx, ax, ay, bx, by, w) {
  const L = Math.hypot(bx - ax, by - ay); const dx = (bx - ax) / L, dy = (by - ay) / L; const nx = -dy, ny = dx; const hw = w / 2;
  const p1 = [ax + dx * w * 0.5 + nx * hw, ay + dy * w * 0.5 + ny * hw], p2 = [bx - dx * w * 1.2 + nx * hw, by - dy * w * 1.2 + ny * hw];
  const p4 = [bx - dx * w * 1.2 - nx * hw, by - dy * w * 1.2 - ny * hw], p5 = [ax + dx * w * 0.5 - nx * hw, ay + dy * w * 0.5 - ny * hw];
  return { all: () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(...p1); ctx.lineTo(...p2); ctx.lineTo(bx, by); ctx.lineTo(...p4); ctx.lineTo(...p5); ctx.closePath(); },
    lit: (side) => { ctx.beginPath(); ctx.moveTo(ax, ay); if (side > 0) { ctx.lineTo(...p1); ctx.lineTo(...p2); } else { ctx.lineTo(...p5); ctx.lineTo(...p4); } ctx.lineTo(bx, by); ctx.closePath(); }, nx, ny };
}
function blade(ctx, ax, ay, bx, by, w, arm, owned, o) {
  const b = bladePath(ctx, ax, ay, bx, by, w);
  const litSide = (b.nx * -0.6 + b.ny * -0.8) > 0 ? 1 : -1;
  if (owned) {
    ctx.save(); ctx.shadowColor = `rgba(${arm.rgb},0.8)`; ctx.shadowBlur = o.glowBlur; b.all(); ctx.fillStyle = arm.dark; ctx.fill(); ctx.restore();
    b.lit(litSide); ctx.fillStyle = arm.light; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = o.hair; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  } else {
    // frosted, translucent ice: a soft body, a lit edge, no outline
    b.all(); ctx.fillStyle = `rgba(${arm.rgb},${o.frost})`; ctx.fill();
    b.lit(litSide); ctx.fillStyle = `rgba(255,255,255,${o.frost * 0.9})`; ctx.fill();
    ctx.strokeStyle = `rgba(${arm.rgb},${o.frost * 1.1})`; ctx.lineWidth = o.hair; b.all(); ctx.stroke();
  }
}
function hexPath(ctx, x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
// a crystal: a hexagonal ice plate, lit from the centre, with ribs to its points
function gem(ctx, x, y, r, rot, arm, owned, o) {
  if (owned) {
    glow(ctx, x, y, r * 2.8, arm.rgb, 0.45);
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.05, x, y, r); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, arm.light); g.addColorStop(1, arm.dark);
    hexPath(ctx, x, y, r, rot + Math.PI / 6); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = o.hair * 1.2; ctx.stroke();
    ctx.strokeStyle = `rgba(${arm.rgb},0.9)`; ctx.lineWidth = o.hair; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + Math.PI / 6 + i * Math.PI / 3; ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); ctx.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); } ctx.stroke();
    hexPath(ctx, x, y, r * 0.3, rot); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  } else {
    hexPath(ctx, x, y, r, rot + Math.PI / 6); ctx.fillStyle = 'rgba(11,22,34,0.55)'; ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${o.frost * 1.5})`); g.addColorStop(1, `rgba(${arm.rgb},${o.frost * 0.55})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(${arm.rgb},${o.frost * 1.7})`; ctx.lineWidth = o.hair; ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${o.frost * 1.2})`; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + Math.PI / 6 + i * Math.PI / 3; ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); } ctx.stroke();
  }
}

// owned: {SKY: n, ...}; o: { R, labels, labelSize, selected: ['SEA', 3], gem }
function drawFlake(ctx, cx, cy, owned, o) {
  const R = o.R; const opt = { hair: Math.max(0.6, R * 0.007), frost: o.frost || 0.2, glowBlur: R * 0.05 };
  const gr = (o.gem || 0.06) * R;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  glow(ctx, cx, cy, R * 1.1, '156,201,232', o.bodyGlow != null ? o.bodyGlow : 0.08);
  for (const pass of [0, 1]) ARMS.forEach(arm => {
    const a = (arm.ang - 90) * Math.PI / 180; const ux = Math.cos(a), uy = Math.sin(a);
    const P = d => [cx + ux * d * R, cy + uy * d * R];
    const n = owned[arm.key] || 0;
    if (pass === 0) blade(ctx, ...P(0.1), ...P(1.0), R * 0.06, arm, false, opt);
    else if (n > 0) blade(ctx, ...P(0.1), ...P(n === 5 ? 1.0 : NODE[n - 1] + 0.06), R * 0.066, arm, true, opt);
    for (let k = 0; k < 5; k++) {
      const own = k < n; if ((pass === 1) !== own) continue;
      const [nx0, ny0] = P(NODE[k]);
      for (const sg of [-1, 1]) { const b = a + sg * Math.PI / 3; const L = BRANCH[k] * R; blade(ctx, nx0, ny0, nx0 + Math.cos(b) * L, ny0 + Math.sin(b) * L, R * 0.048, arm, own, opt); }
      gem(ctx, nx0, ny0, gr * (1 - k * 0.06), a, arm, own, opt);
    }
  });
  // the selected crystal: a white ring and a breath of light
  if (o.selected) ARMS.forEach(arm => {
    if (arm.key !== o.selected[0]) return; const a = (arm.ang - 90) * Math.PI / 180; const k = o.selected[1] - 1;
    const x = cx + Math.cos(a) * NODE[k] * R, y = cy + Math.sin(a) * NODE[k] * R; const rr = gr * (1 - k * 0.06);
    glow(ctx, x, y, rr * 4, arm.rgb, 0.55);
    gem(ctx, x, y, rr, a, arm, false, { ...opt, frost: 0.45 });
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1.4, R * 0.012); ctx.beginPath(); ctx.arc(x, y, rr + R * 0.04, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(${arm.rgb},0.45)`; ctx.lineWidth = Math.max(2.5, R * 0.022); ctx.beginPath(); ctx.arc(x, y, rr + R * 0.075, 0, TAU); ctx.stroke();
  });
  // centre: First Frost
  glow(ctx, cx, cy, R * 0.3, '242,247,251', 0.45);
  gem(ctx, cx, cy, R * 0.105, Math.PI / 6, COLD, true, opt);
  if (o.labels) {
    ctx.font = `700 ${o.labelSize || 12}px 'Hanken Grotesk'`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.8px';
    ARMS.forEach(arm => { const a = (arm.ang - 90) * Math.PI / 180; const d = arm.ang % 180 === 0 ? 1.11 : 1.15; ctx.fillStyle = arm.col; ctx.fillText(arm.key, cx + Math.cos(a) * d * R + 0.9, cy + Math.sin(a) * d * R); });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  ctx.restore();
}
window.NSF = { drawFlake, ARMS };
})();
