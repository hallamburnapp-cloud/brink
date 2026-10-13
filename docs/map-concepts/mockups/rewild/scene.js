// REWILD — the mid-game moment (Year 2, 27 of 42 green), shared by the phone and PC screens.
(function (G) {
'use strict';
const ST = {
  // turned for good: three in the Old Heart, the south of the Long Coast, the west of the Dry Belt, two Glass Isles, all of the Hook
  turned: [4, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
  // how far the living front has crept into the regions not yet turned (map units)
  creep: { 26: 40, 27: 18, 7: 16, 8: 18, 12: 16, 13: 12, 5: 12, 6: 8, 11: 7 },
  blobs: [[206, 230, 10]],
  fringe: { 7: 6.5, 8: 7.5 },   // mowing crews have cut the front back to here
  walls: [5, 6], surrounded: 11, warn: 13,
  works: [[244, 222, 'run'], [124, 334, 'run'], [176, 362, 'run'], [318, 296, 'run'], [334, 512, 'rust'], [277, 628, 'rust']],
  trees: [[248, 630, 3], [312, 522, 9]],
};
// night: inside a large circle centred off the map to the east, so the terminator is a gentle arc
const NCFG = { cx: 1172, cy: 434, R: 900, soft: 14, y0: 190, y1: 680, fade: 30 };

function drawMidGame(ctx, cv, info, opt) {
  opt = opt || {};
  const s = info.s, dpr = info.dpr, sp = opt.spriteS || 1;
  const NF = RWS.nightFn(NCFG);
  const T = (x, y) => info.toCss(x, y);
  const W = cv.width / dpr, H = cv.height / dpr;
  // painterly finish: a soft luminous wash and light from the upper left
  { const bc = document.createElement('canvas'); bc.width = cv.width; bc.height = cv.height; const b = bc.getContext('2d'); b.filter = `blur(${6 * dpr / 2 * s}px)`; b.drawImage(cv, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.24; ctx.drawImage(bc, 0, 0); ctx.restore();
    const c = T(60, 180); const lg = ctx.createRadialGradient(c[0], c[1], 20 * s, c[0], c[1], 520 * s); lg.addColorStop(0, 'rgba(255,244,214,0.20)'); lg.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  RWS.drawRivers(ctx, info, {});
  // the first green speck in the North Reach, where the geese landed
  { const c = T(206, 230); const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 13 * s); g.addColorStop(0, 'rgba(143,214,148,0.45)'); g.addColorStop(1, 'rgba(143,214,148,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], 13 * s, 0, 7); ctx.fill(); }
  // sea current: Southern Hook -> Glass Isles
  RWS.drawRoute(ctx, T(146, 664), T(84, 650), T(92, 598), { color: 'rgba(94,138,150,0.95)', width: 1.5 * sp, dash: [4.5 * sp, 3.5 * sp], glow: 'rgba(205,228,230,0.35)', glint: [0.3, 0.72] });
  // one city mark per region, under everything that stands on the map
  RW.REG.forEach(R => RWS.drawCity(ctx, info, R, { turned: ST.turned.includes(R.i), night: NF(R.x, R.y), phase: 'base', sc: sp }));
  // walls: a closed ring round each of two worried regions; the surrounded region's pulsing ring
  ST.walls.forEach(r => RWS.drawWalls(ctx, RWS.regionContour(info, q => q === r, 3.3), sp));
  RWS.drawSurroundRing(ctx, RWS.regionContour(info, r => r === ST.surrounded, 2.2), sp);
  if (opt.beforeNight) opt.beforeNight(T, NF);
  RWS.drawNight(ctx, info, NCFG, { shadow: 0.45 });
  RWS.drawRivers(ctx, info, { night: NF, emissive: true });
  RW.REG.forEach(R => RWS.drawCity(ctx, info, R, { turned: ST.turned.includes(R.i), night: NF(R.x, R.y), phase: 'glow', sc: sp }));
  // the next wall: Marrish's own border, flickering a few seconds ahead
  RWS.drawWarnLine(ctx, RWS.regionContour(info, r => r === ST.warn, 1.2), sp);
  // Works and Great Trees (sprites under the night band are dimmed and rim-lit)
  for (const [x, y, st] of ST.works) RWS.withNight(ctx, info, NF(x, y) * 0.75, o => RWS.drawWorks(o, ...T(x, y), sp, st, { rustScale: 1.0 }));
  const nightRing = '95,242,200', dayRing = '143,214,148';
  for (const [x, y, seed] of ST.trees) { const nf = NF(x, y);
    RWS.withNight(ctx, info, nf * 0.6, o => RWS.drawGreatTree(o, ...T(x, y), 30 * sp, { seed, ring: 21 * s, ringColor: nf > 0.5 ? nightRing : dayRing }), nf > 0.3 ? (o => RWS.drawGreatTree(o, ...T(x, y), 30 * sp, { seed, rim: 'rgba(95,242,200,0.6)', rimOnly: true })) : null); }
  // blooms
  const bs = opt.bloomSize || 28;
  RWS.drawBloom(ctx, ...T(214, 656), bs, { rot: 0.2 });
  RWS.drawBloom(ctx, ...T(84, 446), bs, { rot: 0.7 });
  RWS.drawBloom(ctx, ...T(338, 446), bs, { rot: 0.45 });
  // goose flyway: Long Coast -> the North Reach speck
  const p0 = T(322, 372), p1 = T(226, 330), p2 = T(208, 240);
  RWS.drawRoute(ctx, p0, p1, p2, { color: 'rgba(250,248,238,0.9)', width: 1.5 * sp, dash: [0.1, 4.6 * sp], glow: 'rgba(255,255,240,0.16)', glint: [0.82] });
  { const t = 0.5, a = RWS.bez(p0, p1, p2, t), b = RWS.bez(p0, p1, p2, t + 0.02); RWS.drawGeese(ctx, a[0], a[1], 1.05 * sp, Math.atan2(b[1] - a[1], b[0] - a[0])); }
  if (opt.afterSprites) opt.afterSprites(T, NF);
  // continent names: one rule. By day ink at 60% with a cream halo; by night cream at 85% with an ink halo
  const fs = opt.labelSize || 10;
  const font = `700 ${fs}px 'Alegreya Sans'`, ls = fs * 0.2;
  const styleAt = (x, y) => { const p = info.toP(x, y); return NF(p[0], p[1]) > 0.5 ? { fill: 'rgba(244,239,228,0.85)', halo: 'rgba(22,32,28,0.62)', haloW: 3.6 * fs / 10 } : { fill: 'rgba(34,48,42,0.6)', halo: 'rgba(244,239,228,0.8)', haloW: 3.6 * fs / 10 }; };
  const L = (t, x, y, k, rot) => { const c = T(x, y); RWS.drawArcLabel(ctx, t, c[0], c[1], { font, ls, k: k / s, rot, styleAt }); };
  const LB = opt.labels || {};
  L('THE NORTH REACH', ...(LB.nr || [134, 236]), 0.004, -0.02);
  L('THE OLD HEART', ...(LB.oh || [112, 306]), 0.005, -0.05);
  L('THE DRY BELT', ...(LB.db || [172, 441]), 0.005, 0.02);
  L('THE GLASS ISLES', ...(LB.gi || [158, 527]), -0.006, 0.1);
  L('THE SOUTHERN HOOK', ...(LB.sh || [171, 597]), 0.003, -0.2);
  L('THE LONG', ...(LB.lc1 || [326, 404]), 0, 0);
  L('COAST', ...(LB.lc2 || [326, 404 + fs * 1.25 / s]), 0, 0);
  return { T, NF };
}
G.RWSCENE = { ST, NCFG, drawMidGame };
})(window);
