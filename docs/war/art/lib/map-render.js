/*
 * War room: the plotting-table map, painted on one canvas (390 x 520 map points).
 * Reference painter for the art pages. Every recipe here is described in ../STYLE.md;
 * the game's map renderer should reproduce the same layers in the same order.
 *
 * Usage: WarMap.paint(canvas, { dpr, state }) after fonts have loaded.
 */
(function () {
  'use strict';

  const MAP = window.WAR_MAP;
  const W = MAP.frame.w;
  const H = MAP.frame.h;
  const R = Object.fromEntries(MAP.regions.map((r) => [r.id, r]));
  const ISLANDS = new Set(MAP.islands.regions);
  const ISLAND_R = MAP.islands.radius;

  /* ------------------------------------------------------------------ colour */

  const BLOC = Object.fromEntries(Object.entries(MAP.colours).map(([k, v]) => [k, hex(v.hex)]));
  const SEA = hex('#0d1b2a');
  const WHITE = [255, 255, 255];
  const THREAD = hex('#e0483c');
  const HEAT = hex('#fff6e0');
  const ALARM = hex('#ff5a4e');
  const COOL = hex('#6fa8ff'); // --standby: a cooled flashpoint
  const INK = hex('#05080c');
  const LINEN = hex('#e9e2d2');
  const BRASS = { hi: hex('#f7e0a3'), a: hex('#e3c078'), b: hex('#c9a35b'), c: hex('#9e7b3b'), lo: hex('#5a4219') };

  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function css(c, a = 1) {
    return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  }
  /** `top` at opacity t over `under`. */
  function mix(top, under, t) {
    return [0, 1, 2].map((i) => top[i] * t + under[i] * (1 - t));
  }
  function scale(c, k) {
    return c.map((v) => Math.min(255, v * k));
  }

  /**
   * Region plate per state: the base tint (opaque, over the sea) and the backlight at its pin.
   * The plates are tinted glass on a light table: unlit glass is a deep bloc hue, lit glass glows
   * from a lamp beneath its pin.
   */
  // Unlit glass per bloc: hand-picked jewel tones (mixing a warm hue with the navy sea muddies it).
  const DARK = {
    CAP: hex('#172e46'),
    HMR: hex('#0f352e'),
    SCT: hex('#34301a'),
    SND: hex('#3c1d1a'),
    FRS: hex('#251e44'),
  };
  // base: bloc colour over its dark tone; core: the lamp under the pin (white mixed into the bloc).
  const PLATE = {
    dark: { base: 0, core: 0, coreA: 0, sea: 0 },
    spent: { base: 0, core: 0, coreA: 0, sea: 0.5 },
    lit: { base: 0.56, core: 0.22, coreA: 0.5, sea: 0 },
    scored: { base: 0.86, core: 0.5, coreA: 0.85, sea: 0 },
    flash: { base: 1, core: 0.55, coreA: 0.8, sea: 0 },
  };
  function fillFor(bloc, state) {
    const p = PLATE[state] || PLATE.dark;
    const c = mix(BLOC[bloc], DARK[bloc], p.base);
    return p.sea ? mix(SEA, c, p.sea) : c;
  }
  function coreFor(bloc, state) {
    const p = PLATE[state] || PLATE.dark;
    return [mix(WHITE, BLOC[bloc], p.core), p.coreA];
  }

  /* ---------------------------------------------------------------- geometry */

  /** Sutherland-Hodgman against one half-plane: keep points with nx*x + ny*y <= c. */
  function clipHalf(poly, nx, ny, c) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const dp = nx * p[0] + ny * p[1] - c;
      const dq = nx * q[0] + ny * q[1] - c;
      if (dp <= 0) out.push(p);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
        const t = dp / (dp - dq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  }

  /** Voronoi cell of each mainland region, clipped to its landmass outline. */
  function buildCells() {
    const cells = {};
    for (const [mass, outline] of Object.entries(MAP.landmassOutlines)) {
      const pins = MAP.regions.filter((r) => r.colour === mass);
      // Clip against the outline's bounding box (grown 12 pt) rather than the outline itself:
      // the drawn coast wanders a few points either side of the outline and clips the plates.
      const xs = outline.map((v) => v[0]);
      const ys = outline.map((v) => v[1]);
      const x0 = Math.min(...xs) - 12;
      const x1 = Math.max(...xs) + 12;
      const y0 = Math.min(...ys) - 12;
      const y1 = Math.max(...ys) + 12;
      for (const p of pins) {
        let poly = [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
        ];
        for (const q of pins) {
          if (q === p) continue;
          const nx = q.x - p.x;
          const ny = q.y - p.y;
          const c = (q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y) / 2;
          poly = clipHalf(poly, nx, ny, c);
        }
        cells[p.id] = { mass, poly };
      }
    }
    return cells;
  }
  const CELLS = buildCells();

  /**
   * Coastline: the outline polygon with its corners rounded (radius 6 pt), resampled every
   * 2.5 pt and given a fine seeded "chart" edge (two octaves, under 1.6 pt). Internal borders
   * stay straight bisectors, so the drawn joins are exactly the land joins.
   * style 'plate' skips the fine edge and keeps the cut-glass rounded polygon.
   */
  function coastline(poly, seed, style) {
    const rounded = roundCorners(poly, 6);
    if (style === 'plate') return rounded;
    const pts = resample(rounded, 2.5);
    const rnd = mulberry(seed);
    const n = pts.length;
    // Value noise around the loop (periodic, so the seam is invisible).
    const oct = (period, amp) => {
      const k = Math.max(3, Math.round(n / period));
      const v = Array.from({ length: k }, () => rnd() * 2 - 1);
      return (i) => {
        const x = (i / n) * k;
        const a = Math.floor(x) % k;
        const f = x - Math.floor(x);
        const s = f * f * (3 - 2 * f);
        return (v[a] * (1 - s) + v[(a + 1) % k] * s) * amp;
      };
    };
    const o1 = oct(5, 1.1);
    const o2 = oct(2, 0.45);
    return pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      const tx = b[0] - a[0];
      const ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      const d = o1(i) + o2(i);
      return [p[0] + (ty / l) * d, p[1] - (tx / l) * d];
    });
  }
  function roundCorners(poly, rc) {
    const out = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const p = poly[(i - 1 + n) % n];
      const c = poly[i];
      const q = poly[(i + 1) % n];
      const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]);
      const l2 = Math.hypot(q[0] - c[0], q[1] - c[1]);
      const r = Math.min(rc, l1 / 2, l2 / 2);
      const a = [c[0] + ((p[0] - c[0]) / l1) * r, c[1] + ((p[1] - c[1]) / l1) * r];
      const b = [c[0] + ((q[0] - c[0]) / l2) * r, c[1] + ((q[1] - c[1]) / l2) * r];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        // Quadratic Bezier a -> c -> b.
        out.push([
          (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
          (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
        ]);
      }
    }
    return out;
  }
  function resample(pts, step) {
    const out = [];
    const n = pts.length;
    let carry = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let d = carry;
      while (d < l) {
        out.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]);
        d += step;
      }
      carry = d - l;
    }
    return out;
  }
  function mulberry(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const COAST_STYLE = window.WAR_COAST_STYLE || 'chart';
  const COASTS = Object.fromEntries(
    Object.entries(MAP.landmassOutlines).map(([k, poly], i) => [k, coastline(poly, 1009 + i * 7919, COAST_STYLE)]),
  );

  function polyPath(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function coastPath(ctx, mass) {
    polyPath(ctx, COASTS[mass]);
  }
  /** All land (mainland coasts and island discs) as one path. */
  function allLandPath(ctx) {
    for (const mass of Object.keys(COASTS)) coastPath(ctx, mass);
    for (const id of ISLANDS) {
      const r = R[id];
      ctx.moveTo(r.x + ISLAND_R, r.y);
      ctx.arc(r.x, r.y, ISLAND_R, 0, Math.PI * 2);
    }
  }
  /** The shape of one region (cell clipped by the coast, or the island disc). */
  function regionClip(ctx, id) {
    const r = R[id];
    ctx.beginPath();
    if (ISLANDS.has(id)) {
      ctx.arc(r.x, r.y, ISLAND_R, 0, Math.PI * 2);
      ctx.clip();
    } else {
      coastPath(ctx, CELLS[id].mass);
      ctx.clip();
      ctx.beginPath();
      polyPath(ctx, CELLS[id].poly);
      ctx.clip();
    }
  }
  function regionPath(ctx, id) {
    const r = R[id];
    ctx.beginPath();
    if (ISLANDS.has(id)) ctx.arc(r.x, r.y, ISLAND_R, 0, Math.PI * 2);
    else polyPath(ctx, CELLS[id].poly);
  }

  /* ------------------------------------------------------------------ glyphs */

  function glyphPath(ctx, kind, x, y, s) {
    const h = s / 2;
    ctx.beginPath();
    switch (kind) {
      case 'triangle':
        ctx.moveTo(x, y - h * 1.1);
        ctx.lineTo(x + h * 1.05, y + h * 0.75);
        ctx.lineTo(x - h * 1.05, y + h * 0.75);
        ctx.closePath();
        break;
      case 'circle':
        ctx.arc(x, y, h * 0.92, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(x, y - h * 1.15);
        ctx.lineTo(x + h * 0.95, y);
        ctx.lineTo(x, y + h * 1.15);
        ctx.lineTo(x - h * 0.95, y);
        ctx.closePath();
        break;
      case 'square':
        ctx.rect(x - h * 0.82, y - h * 0.82, h * 1.64, h * 1.64);
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          const px = x + Math.cos(a) * h * 1.02;
          const py = y + Math.sin(a) * h * 1.02;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.closePath();
        break;
    }
  }
  function starPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  /** A 7 pt anchor drawn with strokes (the font subsets have no anchor glyph). */
  function anchor(ctx, x, y, s, color, lw) {
    const k = s / 7;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw / k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -2.6, 0.95, 0, Math.PI * 2);
    ctx.moveTo(0, -1.6);
    ctx.lineTo(0, 3.3);
    ctx.moveTo(-1.7, -0.6);
    ctx.lineTo(1.7, -0.6);
    ctx.moveTo(-2.9, 1.2);
    ctx.quadraticCurveTo(-2.4, 3.4, 0, 3.4);
    ctx.quadraticCurveTo(2.4, 3.4, 2.9, 1.2);
    ctx.stroke();
    ctx.restore();
  }

  /* ----------------------------------------------------------------- helpers */

  function shadowed(ctx, color, blur, dx, dy, draw) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = dx;
    ctx.shadowOffsetY = dy;
    draw();
    ctx.restore();
  }
  /**
   * Blurred silhouette without ctx.filter (not available in older Safari): draw the shape far
   * off-canvas and let its shadow fall back into view.
   */
  function blurredShape(ctx, dpr, color, blur, drawPath) {
    const OFF = 4000;
    ctx.save();
    ctx.translate(-OFF, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * dpr;
    ctx.shadowOffsetX = OFF * dpr;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    drawPath(ctx);
    ctx.fill();
    ctx.restore();
  }
  function layer(dpr) {
    const c = document.createElement('canvas');
    c.width = W * dpr;
    c.height = H * dpr;
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    return [c, x];
  }
  function text(ctx, str, x, y, font, color, align = 'center', halo = null, tracking = 0) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = tracking + 'px';
    if (halo) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = halo[0];
      ctx.lineWidth = halo[1];
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function lerp(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  /* ------------------------------------------------------------------ layers */

  function paintSea(ctx, dpr, S) {
    ctx.fillStyle = css(SEA);
    ctx.fillRect(0, 0, W, H);
    // Backlight: the lamp under the glass pools light in the middle of the table.
    const g = ctx.createRadialGradient(W * 0.52, H * 0.46, 10, W * 0.52, H * 0.46, H * 0.62);
    g.addColorStop(0, 'rgba(30,62,92,0.55)');
    g.addColorStop(0.55, 'rgba(18,38,58,0.25)');
    g.addColorStop(1, 'rgba(4,9,15,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Graticule on a 39 pt grid (the bearing strip's tick spacing), with registration crosses.
    ctx.save();
    ctx.strokeStyle = 'rgba(157,184,217,0.055)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 39; x < W; x += 39) {
      ctx.moveTo(x + 0.25, 10);
      ctx.lineTo(x + 0.25, H);
    }
    for (let y = 49; y < H; y += 39) {
      ctx.moveTo(0, y + 0.25);
      ctx.lineTo(W, y + 0.25);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(157,184,217,0.2)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 39; x < W; x += 39) {
      for (let y = 49; y < H; y += 39) {
        ctx.moveTo(x - 2.5, y);
        ctx.lineTo(x + 2.5, y);
        ctx.moveTo(x, y - 2.5);
        ctx.lineTo(x, y + 2.5);
      }
    }
    ctx.stroke();
    ctx.restore();

    // Coastal shelf: a soft halo of shallower water around every coast.
    blurredShape(ctx, dpr, 'rgba(38,78,112,0.38)', 16, (c) => allLandPath(c));
    blurredShape(ctx, dpr, 'rgba(46,92,130,0.22)', 5, (c) => allLandPath(c));

    // Depth contours at 7 and 15 pt off the coast, like a chart.
    for (const [d, a] of [
      [7, 0.11],
      [15, 0.06],
    ]) {
      const [lc, lx] = layer(dpr);
      lx.lineJoin = 'round';
      lx.strokeStyle = `rgba(157,184,217,${a})`;
      lx.lineWidth = d * 2 + 0.7;
      lx.beginPath();
      allLandPath(lx);
      lx.stroke();
      lx.globalCompositeOperation = 'destination-out';
      lx.lineWidth = d * 2 - 0.7;
      lx.stroke();
      lx.fill();
      ctx.drawImage(lc, 0, 0, W, H);
    }
  }

  /**
   * Terrain: faint isolines of a seeded value-noise field, clipped to the land, so the plates
   * read as country rather than panels. Baked once (marching squares on a 3 pt grid).
   */
  let TERRAIN = null;
  function terrainSegments() {
    if (TERRAIN) return TERRAIN;
    const rnd = mulberry(4242);
    const G = 34;
    const gw = Math.ceil(W / G) + 2;
    const gh = Math.ceil(H / G) + 2;
    const grid = Array.from({ length: gw * gh }, () => rnd());
    const val = (x, y) => {
      const gx = x / G;
      const gy = y / G;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = gx - ix;
      const fy = gy - iy;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const g = (i, j) => grid[(iy + j) * gw + (ix + i)];
      const a = g(0, 0) * (1 - sx) + g(1, 0) * sx;
      const b = g(0, 1) * (1 - sx) + g(1, 1) * sx;
      return a * (1 - sy) + b * sy;
    };
    const field = (x, y) => 0.7 * val(x, y) + 0.3 * val(x * 2.3 + 91, y * 2.3 + 37);
    const S = 3;
    const nx = Math.ceil(W / S);
    const ny = Math.ceil(H / S);
    const F = new Float32Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[j * (nx + 1) + i] = field(i * S, j * S);
    const segs = [];
    for (const lv of [0.38, 0.46, 0.54, 0.62, 0.7]) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const v0 = F[j * (nx + 1) + i];
          const v1 = F[j * (nx + 1) + i + 1];
          const v2 = F[(j + 1) * (nx + 1) + i + 1];
          const v3 = F[(j + 1) * (nx + 1) + i];
          const x = i * S;
          const y = j * S;
          const pts = [];
          const edge = (a, b, pa, pb) => {
            if ((a < lv) !== (b < lv)) {
              const t = (lv - a) / (b - a);
              pts.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]);
            }
          };
          edge(v0, v1, [x, y], [x + S, y]);
          edge(v1, v2, [x + S, y], [x + S, y + S]);
          edge(v2, v3, [x + S, y + S], [x, y + S]);
          edge(v3, v0, [x, y + S], [x, y]);
          if (pts.length >= 2) segs.push(pts[0], pts[1]);
          if (pts.length === 4) segs.push(pts[2], pts[3]);
        }
      }
    }
    TERRAIN = segs;
    return segs;
  }
  function paintTerrain(ctx, S) {
    const segs = terrainSegments();
    ctx.save();
    ctx.beginPath();
    allLandPath(ctx);
    ctx.clip();
    ctx.beginPath();
    for (let k = 0; k < segs.length; k += 2) {
      ctx.moveTo(segs[k][0], segs[k][1]);
      ctx.lineTo(segs[k + 1][0], segs[k + 1][1]);
    }
    ctx.strokeStyle = S.scoring ? 'rgba(233,226,210,0.045)' : 'rgba(233,226,210,0.07)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  function paintLand(ctx, dpr, S) {
    // Plates sit on the glass: a soft contact shadow under every landmass.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 7 * dpr;
    ctx.shadowOffsetY = 2.5 * dpr;
    ctx.fillStyle = css(SEA);
    ctx.beginPath();
    allLandPath(ctx);
    ctx.fill();
    ctx.restore();

    for (const r of MAP.regions) {
      const st = S.regions[r.id];
      const fs = st.fillState;
      ctx.save();
      regionClip(ctx, r.id);
      ctx.fillStyle = css(fillFor(st.colour, fs));
      ctx.fillRect(0, 0, W, H);
      // Light falls off towards the plate's edges.
      const [core, coreA] = coreFor(st.colour, fs);
      const g = ctx.createRadialGradient(r.x, r.y - 2, 1, r.x, r.y, ISLANDS.has(r.id) ? 30 : 58);
      if (coreA > 0) {
        g.addColorStop(0, css(core, coreA));
        g.addColorStop(0.45, css(core, coreA * 0.28));
        g.addColorStop(1, 'rgba(0,0,0,0.16)');
      } else {
        g.addColorStop(0, css(BLOC[st.colour], 0.07));
        g.addColorStop(1, 'rgba(0,0,0,0.12)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Influence glow, +3% per scoring (capped at +40%).
      if (st.glow > 0) {
        ctx.fillStyle = css(BLOC[st.colour], st.glow * 0.6);
        ctx.fillRect(0, 0, W, H);
      }
      if (st.dim < 1) {
        ctx.fillStyle = css(INK, (1 - st.dim) * 0.85);
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    paintTerrain(ctx, S);

    // Region borders: an etched 1 pt line with a faint highlight on its lower-right lip.
    for (const r of MAP.regions) {
      if (ISLANDS.has(r.id)) continue;
      ctx.save();
      ctx.beginPath();
      coastPath(ctx, CELLS[r.id].mass);
      ctx.clip();
      ctx.beginPath();
      polyPath(ctx, CELLS[r.id].poly.map((p) => [p[0] + 0.7, p[1] + 0.7]));
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      polyPath(ctx, CELLS[r.id].poly);
      ctx.strokeStyle = 'rgba(5,10,16,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Bevel: the cut edge of each plate, lit from the top-left lamp.
    const bevel = (pathFn, x0, y0, x1, y1, dimA) => {
      ctx.save();
      ctx.beginPath();
      pathFn();
      ctx.clip();
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(255,250,235,${0.3 * dimA})`);
      g.addColorStop(0.5, `rgba(255,250,235,${0.06 * dimA})`);
      g.addColorStop(1, `rgba(0,0,0,${0.45 * dimA})`);
      ctx.strokeStyle = g;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.beginPath();
      pathFn();
      ctx.stroke();
      ctx.restore();
    };
    for (const mass of Object.keys(COASTS)) {
      const o = MAP.landmassOutlines[mass];
      const xs = o.map((v) => v[0]);
      const ys = o.map((v) => v[1]);
      bevel(() => coastPath(ctx, mass), Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), S.massDim[mass]);
    }
    for (const id of ISLANDS) {
      const r = R[id];
      const lit = ['lit', 'scored', 'flash'].includes(S.regions[id].fillState);
      bevel(() => ctx.arc(r.x, r.y, ISLAND_R, 0, Math.PI * 2), r.x - 20, r.y - 20, r.x + 20, r.y + 20, lit ? 1 : 0.45);
    }

    // Coast line: a crisp hairline in the bloc colour.
    ctx.save();
    ctx.lineJoin = 'round';
    for (const mass of Object.keys(COASTS)) {
      ctx.beginPath();
      coastPath(ctx, mass);
      ctx.strokeStyle = css(mix(BLOC[mass], SEA, 0.75), 0.75 * S.massDim[mass]);
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
    for (const id of ISLANDS) {
      const r = R[id];
      ctx.beginPath();
      ctx.arc(r.x, r.y, ISLAND_R, 0, Math.PI * 2);
      ctx.strokeStyle = css(mix(BLOC.SCT, SEA, 0.75), 0.75 * (S.regions[id].dim < 1 ? 0.6 : 1));
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Fortify: bastion hatching along the inside of the region's border. */
  function paintStamps(ctx, dpr, S) {
    for (const r of MAP.regions) {
      const st = S.regions[r.id];
      if (st.stamp !== 'FORTIFY') continue;
      ctx.save();
      regionClip(ctx, r.id);
      const [hc, hx] = layer(dpr);
      hx.strokeStyle = css(LINEN, 0.55 * st.dim);
      hx.lineWidth = 1;
      hx.beginPath();
      for (let k = -H; k < W + H; k += 4.5) {
        hx.moveTo(k, 0);
        hx.lineTo(k - H, H);
      }
      hx.stroke();
      // Keep only a 6 pt band inside the border.
      hx.globalCompositeOperation = 'destination-in';
      hx.lineJoin = 'round';
      hx.lineWidth = 12;
      regionPath(hx, r.id);
      hx.stroke();
      ctx.drawImage(hc, 0, 0, W, H);
      regionPath(ctx, r.id);
      ctx.strokeStyle = css(LINEN, 0.5 * st.dim);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function islandEdgePoint(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    return [a.x + ((b.x - a.x) / d) * ISLAND_R, a.y + ((b.y - a.y) / d) * ISLAND_R];
  }

  function paintJoins(ctx, dpr, S) {
    // Causeways: 6 pt bars between disc edges.
    for (const [a, b] of MAP.landJoins) {
      if (!(ISLANDS.has(a) && ISLANDS.has(b))) continue;
      const A = R[a];
      const B = R[b];
      const p = islandEdgePoint(A, B);
      const q = islandEdgePoint(B, A);
      const dim = Math.min(S.regions[a].dim, S.regions[b].dim);
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.55 * dim;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#2a3a4a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
      // Lit edge: the side of the bar facing the top-left lamp.
      let nx = -(q[1] - p[1]);
      let ny = q[0] - p[0];
      const nl = Math.hypot(nx, ny);
      if (nx + ny > 0) {
        nx = -nx;
        ny = -ny;
      }
      const ox = (nx / nl) * 2.6;
      const oy = (ny / nl) * 2.6;
      ctx.strokeStyle = 'rgba(157,184,217,0.18)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p[0] + ox, p[1] + oy);
      ctx.lineTo(q[0] + ox, q[1] + oy);
      ctx.stroke();
      ctx.restore();
    }
    // Sea lanes: white 1.5 pt dashes, 4 on 4 off, centre to centre.
    for (const [a, b] of MAP.seaLanes) {
      const A = R[a];
      const B = R[b];
      const dim = Math.min(S.regions[a].dim, S.regions[b].dim);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = `rgba(233,240,248,${0.16 + 0.34 * dim})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function threadWidth(traffic) {
    if (traffic >= 10) return 4.5;
    if (traffic >= 6) return 3.5;
    if (traffic >= 3) return 2.5;
    return 1.5;
  }

  function paintThreads(ctx, dpr, S, activeOnly) {
    for (const t of S.threads) {
      if (!!t.active !== activeOnly) continue;
      const A = R[t.a];
      const B = R[t.b];
      const w = t.active ? Math.max(2, threadWidth(t.traffic)) : threadWidth(t.traffic);
      const a = t.active ? 1 : t.alpha ?? 0.6;
      ctx.save();
      ctx.lineCap = 'round';
      // Shadow on the glass: the thread is strung just above the table.
      ctx.strokeStyle = `rgba(0,0,0,${0.5 * a})`;
      ctx.lineWidth = w + 0.6;
      ctx.beginPath();
      ctx.moveTo(A.x + 1.4, A.y + 2.2);
      ctx.lineTo(B.x + 1.4, B.y + 2.2);
      ctx.stroke();
      // Body.
      const glowA = t.hot ? 1 : t.traffic >= 6 ? 0.7 : 0.3 * a;
      shadowed(ctx, css(t.hot ? hex('#ff5a3c') : THREAD, glowA), t.hot ? 10 : 5, 0, 0, () => {
        ctx.strokeStyle = css(THREAD, a);
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      });
      // Heat: the cord burns from the inside, a thin white-hot filament until the slam.
      if (t.hot) {
        ctx.strokeStyle = 'rgba(255,170,120,0.9)';
        ctx.lineWidth = w * 0.62;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
        ctx.strokeStyle = css(HEAT, 0.95);
        ctx.lineWidth = Math.max(0.6, w * 0.26);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      } else {
        // Twist highlight on the top edge of the cord.
        ctx.strokeStyle = `rgba(255,190,170,${0.4 * a})`;
        ctx.lineWidth = Math.max(0.5, w * 0.28);
        ctx.beginPath();
        ctx.moveTo(A.x - 0.3, A.y - w * 0.22);
        ctx.lineTo(B.x - 0.3, B.y - w * 0.22);
        ctx.stroke();
      }
      if (t.traffic >= 10 && t.showCount !== false) {
        const m = lerp([A.x, A.y], [B.x, B.y], 0.5);
        text(ctx, String(t.traffic), m[0], m[1] - 7, '800 8px "JetBrains Mono"', css(LINEN, a), 'center', ['rgba(5,8,12,0.9)', 2.5]);
      }
      ctx.restore();
    }
  }

  /** A pulse running along a thread from one pin to the next, with its traffic pop. */
  function paintPulse(ctx, S) {
    const p = S.pulse;
    if (!p) return;
    const A = R[p.from];
    const B = R[p.to];
    const head = lerp([A.x, A.y], [B.x, B.y], p.t);
    const tail = lerp([A.x, A.y], [B.x, B.y], Math.max(0, p.t - 0.35));
    ctx.save();
    const g = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
    g.addColorStop(0, 'rgba(255,246,224,0)');
    g.addColorStop(1, 'rgba(255,246,224,0.95)');
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tail[0], tail[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.stroke();
    shadowed(ctx, 'rgba(255,246,224,1)', 10, 0, 0, () => {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(head[0], head[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    if (p.pop) {
      const m = lerp([A.x, A.y], [B.x, B.y], p.popAt ?? 0.5);
      text(ctx, p.pop, m[0] + (p.popDx ?? 9), m[1] + (p.popDy ?? -8), '800 11px "JetBrains Mono"', '#d4f6ff', 'center', ['rgba(7,36,49,0.95)', 3]);
    }
  }

  function paintFlashpoint(ctx, S) {
    const f = S.flashpoint;
    if (!f) return;
    const r = R[f.id];
    const R0 = f.r0 ?? 64;
    const rad = Math.max(0, f.ring) * R0;
    const col = f.cooled ? COOL : ALARM;
    ctx.save();
    if (!f.cooled) {
      // Soft red bloom inside the live ring.
      const g = ctx.createRadialGradient(r.x, r.y, rad * 0.4, r.x, r.y, rad + 8);
      g.addColorStop(0, css(ALARM, 0));
      g.addColorStop(0.8, css(ALARM, 0.16));
      g.addColorStop(1, css(ALARM, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad + 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (rad > 0) {
      shadowed(ctx, css(col, 0.9), 8, 0, 0, () => {
        ctx.strokeStyle = css(col);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
        ctx.stroke();
      });
      // Reticle ticks at the four bearings.
      ctx.strokeStyle = css(col, 0.95);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.moveTo(r.x + Math.cos(a) * (rad + 3), r.y + Math.sin(a) * (rad + 3));
        ctx.lineTo(r.x + Math.cos(a) * (rad + 8), r.y + Math.sin(a) * (rad + 8));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The earned brass pins: flat brass tacks beside the region's pin (up to 3, then a count). */
  function paintBrass(ctx, x, y, n, a) {
    const shown = Math.min(3, n);
    for (let i = shown - 1; i >= 0; i--) {
      const bx = x - 16 - i * 5;
      const by = y + 2;
      ctx.save();
      ctx.globalAlpha = a;
      shadowed(ctx, 'rgba(0,0,0,0.8)', 2.5, 1, 1.6, () => {
        ctx.fillStyle = css(BRASS.lo);
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      const g = ctx.createLinearGradient(bx - 3, by - 3, bx + 3, by + 3);
      g.addColorStop(0, css(BRASS.hi));
      g.addColorStop(0.5, css(BRASS.b));
      g.addColorStop(1, css(BRASS.c));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,248,225,0.9)';
      ctx.beginPath();
      ctx.arc(bx - 1.1, by - 1.2, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,26,8,0.9)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (n > 3) text(ctx, '\u00d7' + n, x - 34, y + 2, '800 7px "JetBrains Mono"', css(BRASS.a, a), 'right');
  }

  /** A brass pin pushed into the glass, with a coloured glass head (17 pt across). */
  function paintPin(ctx, x, y, col, a = 1) {
    ctx.save();
    ctx.globalAlpha = a;
    // Cast shadow, down and right (the lamp is top-left).
    shadowed(ctx, 'rgba(0,0,0,0.75)', 5, 3, 4, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
    // Brass collar.
    let g = ctx.createRadialGradient(x - 3, y - 3.5, 0.5, x, y, 9);
    g.addColorStop(0, css(BRASS.hi));
    g.addColorStop(0.4, css(BRASS.a));
    g.addColorStop(0.75, css(BRASS.c));
    g.addColorStop(1, css(BRASS.lo));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,6,0.85)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Glass head.
    g = ctx.createRadialGradient(x - 2.2, y - 2.6, 0.4, x, y, 6.6);
    g.addColorStop(0, css(mix(WHITE, col, 0.7)));
    g.addColorStop(0.35, css(col));
    g.addColorStop(1, css(scale(col, 0.42)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,8,12,0.55)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Specular highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(x - 2.3, y - 2.7, 1.9, 1.15, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A lit region's 16 pt glowing pin head with its bloc glyph. */
  function paintLitHead(ctx, x, y, region, a) {
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 1, x, y, 15);
    g.addColorStop(0, 'rgba(255,240,210,0.55)');
    g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    shadowed(ctx, 'rgba(255,236,200,0.9)', 6, 0, 0, () => {
      const h = ctx.createRadialGradient(x - 2, y - 2.4, 0.5, x, y, 8);
      h.addColorStop(0, '#ffffff');
      h.addColorStop(0.6, '#fff1d6');
      h.addColorStop(1, '#e8d2a8');
      ctx.fillStyle = h;
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
    glyphPath(ctx, MAP.colours[region.colourNow].glyph, x, y + 0.3, 6.4);
    ctx.fillStyle = css(scale(BLOC[region.colourNow], 0.62));
    ctx.fill();
    ctx.restore();
  }

  function paintMarkers(ctx, S) {
    for (const r of MAP.regions) {
      const st = S.regions[r.id];
      const col = BLOC[st.colour];
      const a = st.dim;
      const lit = st.status === 'lit' || st.pinned;
      const x = r.x;
      const y = r.y;
      if (st.brass) paintBrass(ctx, x, y, st.brass, Math.max(0.55, a));

      if (st.pinned) {
        paintPin(ctx, x, y, col, a);
      } else if (st.status === 'lit') {
        paintLitHead(ctx, x, y, { colourNow: st.colour }, a);
      } else if (st.status === 'spent') {
        ctx.save();
        ctx.strokeStyle = css(LINEN, 0.42 * Math.max(a, 0.6));
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 2.6, y - 2.6);
        ctx.lineTo(x + 2.6, y + 2.6);
        ctx.moveTo(x + 2.6, y - 2.6);
        ctx.lineTo(x - 2.6, y + 2.6);
        ctx.stroke();
        ctx.restore();
      } else {
        // Dark: the bloc glyph as a 6 pt mark.
        ctx.save();
        glyphPath(ctx, MAP.colours[st.colour].glyph, x, y, 6);
        ctx.fillStyle = css(mix(col, SEA, 0.55), Math.max(0.35, a));
        ctx.fill();
        ctx.restore();
      }

      // Weight, with the capital star or port anchor after it.
      const wx = x + (st.pinned ? 11.5 : lit ? 10.5 : 6);
      const big = lit;
      const wFont = big ? '800 11px "JetBrains Mono"' : '700 8.5px "JetBrains Mono"';
      const wCol = big ? css(mix(LINEN, col, 0.8), a) : css(mix(col, LINEN, 0.45), st.status === 'spent' ? 0.32 : 0.62 * Math.max(a, 0.5));
      const halo = ['rgba(6,11,17,0.85)', big ? 3 : 2.4];
      text(ctx, String(r.weight), wx, y + 0.5, wFont, wCol, 'left', halo);
      ctx.save();
      ctx.font = wFont;
      const ww = ctx.measureText(String(r.weight)).width;
      ctx.restore();
      const tagX = wx + ww + (big ? 5 : 4);
      const tagA = big ? a : st.status === 'spent' ? 0.3 : 0.5 * Math.max(a, 0.5);
      if (st.capital) {
        ctx.save();
        starPath(ctx, tagX, y, big ? 4 : 3.2);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(6,11,17,0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = css(hex('#f2c94c'), tagA);
        ctx.fill();
        ctx.restore();
      } else if (st.port) {
        anchor(ctx, tagX, y + 0.2, big ? 7 : 5.6, css(mix(LINEN, col, 0.7), tagA), big ? 1 : 0.85);
      }

      // Names: lit and pinned regions only.
      if (lit) {
        text(ctx, r.name.toUpperCase(), x, y + 15.5, '600 9px "Barlow Condensed"', css(LINEN, 0.92 * a), 'center', ['rgba(6,11,17,0.8)', 2.6], 0.6);
      }
      if (st.order && a > 0.5) {
        const bx = x - 8.5;
        const by = y - 8.5;
        ctx.save();
        shadowed(ctx, 'rgba(0,0,0,0.6)', 2, 0.5, 1, () => {
          ctx.fillStyle = st.orderDone ? css(LINEN, 0.95) : 'rgba(20,24,30,0.95)';
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.strokeStyle = st.orderDone ? 'rgba(42,37,32,0.6)' : css(LINEN, 0.6);
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
        text(ctx, String(st.order), bx, by + 0.4, '800 7px "JetBrains Mono"', st.orderDone ? '#2a2520' : css(LINEN, 0.95), 'center');
      }
    }
  }

  /** Flash bloom on the region being scored. */
  function paintFlashBloom(ctx, dpr, S) {
    for (const r of MAP.regions) {
      const st = S.regions[r.id];
      if (st.fillState !== 'flash') continue;
      blurredShape(ctx, dpr, 'rgba(255,246,224,0.55)', 14, (c) => {
        if (ISLANDS.has(r.id)) c.arc(r.x, r.y, ISLAND_R, 0, Math.PI * 2);
        else polyPath(c, CELLS[r.id].poly);
      });
      ctx.save();
      regionClip(ctx, r.id);
      regionPath(ctx, r.id);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  function paintScan(ctx, S) {
    if (S.scanX == null) return;
    const x = S.scanX;
    ctx.save();
    // Wake: the line has just jumped here from the west.
    const g = ctx.createLinearGradient(x - 44, 0, x, 0);
    g.addColorStop(0, 'rgba(255,246,224,0)');
    g.addColorStop(1, 'rgba(255,246,224,0.07)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 44, 10, 44, H - 10);
    shadowed(ctx, 'rgba(255,255,255,0.4)', 10, 0, 0, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(x - 1, 10, 2, H - 10);
    });
    ctx.restore();
  }

  function paintBearing(ctx, S) {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, 12);
    g.addColorStop(0, 'rgba(4,7,11,0.85)');
    g.addColorStop(1, 'rgba(4,7,11,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = 'rgba(233,226,210,0.08)';
    ctx.fillRect(0, 10, W, 0.6);
    ctx.strokeStyle = 'rgba(233,226,210,0.32)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 39) {
      ctx.moveTo(x + 0.35, 10);
      ctx.lineTo(x + 0.35, 5);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(233,226,210,0.16)';
    ctx.beginPath();
    for (let x = 13; x < W; x += 13) {
      if (x % 39 === 0) continue;
      ctx.moveTo(x + 0.35, 10);
      ctx.lineTo(x + 0.35, 7.5);
    }
    ctx.stroke();
    // Label plate in the middle: W --- SWEEP ---> E
    const cx = W / 2;
    ctx.fillStyle = 'rgba(4,7,11,0.95)';
    ctx.fillRect(cx - 52, 0, 104, 10);
    const ls = 'rgba(233,226,210,0.42)';
    text(ctx, 'W', cx - 45, 5.4, '600 8px "Barlow Condensed"', ls, 'center');
    text(ctx, 'SWEEP', cx, 5.4, '600 8px "Barlow Condensed"', ls, 'center', null, 1.4);
    text(ctx, 'E', cx + 45, 5.4, '600 8px "Barlow Condensed"', ls, 'center');
    ctx.strokeStyle = ls;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 39, 5);
    ctx.lineTo(cx - 17, 5);
    ctx.moveTo(cx + 17, 5);
    ctx.lineTo(cx + 38, 5);
    ctx.stroke();
    ctx.fillStyle = ls;
    ctx.beginPath();
    ctx.moveTo(cx + 39.5, 5);
    ctx.lineTo(cx + 36, 3);
    ctx.lineTo(cx + 36, 7);
    ctx.closePath();
    ctx.fill();
    // Cursor where the scan line is.
    if (S.scanX != null) {
      shadowed(ctx, 'rgba(255,255,255,0.8)', 6, 0, 0, () => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(S.scanX - 4, 2);
        ctx.lineTo(S.scanX + 4, 2);
        ctx.lineTo(S.scanX, 9.5);
        ctx.closePath();
        ctx.fill();
      });
    }
    ctx.restore();
  }

  let NOISE = null;
  function noiseTile() {
    if (NOISE) return NOISE;
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const x = c.getContext('2d');
    const img = x.createImageData(192, 192);
    const rnd = mulberry(77);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd();
      const on = v > 0.5 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = on;
      img.data[i + 3] = Math.floor(rnd() * 22);
    }
    x.putImageData(img, 0, 0);
    NOISE = c;
    return c;
  }

  function paintGlass(ctx, dpr) {
    ctx.save();
    // Grain, one speck per device pixel.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat');
    ctx.fillRect(0, 0, W * dpr, H * dpr);
    ctx.restore();
    ctx.save();
    // Sheen across the glass from the top-left lamp.
    const s = ctx.createLinearGradient(0, 0, W * 0.7, H * 0.55);
    s.addColorStop(0, 'rgba(220,235,255,0.05)');
    s.addColorStop(0.45, 'rgba(220,235,255,0.012)');
    s.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H);
    // Edge vignette of the table.
    const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.36, W / 2, H * 0.48, H * 0.78);
    v.addColorStop(0, 'rgba(3,6,10,0)');
    v.addColorStop(1, 'rgba(3,6,10,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    // The staff rail overhangs the table: a short shadow under it.
    const t = ctx.createLinearGradient(0, 10, 0, 26);
    t.addColorStop(0, 'rgba(0,0,0,0.35)');
    t.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = t;
    ctx.fillRect(0, 10, W, 16);
    ctx.restore();
  }

  /* ------------------------------------------------------------------- state */

  /**
   * state.regions: { [id]: { status: 'lit'|'dark'|'spent', pinned, phase: 'scored'|'flash'|'pending',
   *   order, orderDone, brass, stamp, glow, colour } }  (missing ids are 'dark')
   * state.scoring: ids in the scoring set while a sweep plays (everything else dims to 30%)
   */
  function normalise(state) {
    const scoring = state.scoring ? new Set(state.scoring) : null;
    const regions = {};
    for (const r of MAP.regions) {
      const s = Object.assign({ status: 'dark', pinned: false, brass: 0, stamp: null, glow: 0 }, state.regions?.[r.id]);
      s.colour = s.colour || r.colour;
      s.capital = s.capital ?? r.capital;
      s.port = s.port ?? r.port;
      if (s.phase === 'scored') s.fillState = 'scored';
      else if (s.phase === 'flash') s.fillState = 'flash';
      else s.fillState = s.status === 'lit' || s.pinned ? 'lit' : s.status;
      s.dim = scoring && !scoring.has(r.id) ? (s.status === 'lit' ? 0.3 : 0.55) : 1;
      regions[r.id] = s;
    }
    const massDim = {};
    for (const m of Object.keys(MAP.landmassOutlines)) massDim[m] = scoring ? 0.6 : 1;
    return Object.assign({ threads: [], scanX: null, pulse: null, flashpoint: null }, state, { regions, massDim });
  }

  function paint(canvas, opts) {
    const dpr = opts.dpr || window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = normalise(opts.state || {});

    paintSea(ctx, dpr, S);
    if (S.scoring) {
      // During a sweep the table itself dims a little too; the scoring plates stay at full light.
      ctx.fillStyle = 'rgba(6,10,15,0.32)';
      ctx.fillRect(0, 0, W, H);
    }
    paintLand(ctx, dpr, S);
    paintStamps(ctx, dpr, S);
    paintJoins(ctx, dpr, S);
    paintThreads(ctx, dpr, S, false);
    paintFlashBloom(ctx, dpr, S);
    paintThreads(ctx, dpr, S, true);
    paintPulse(ctx, S);
    paintFlashpoint(ctx, S);
    paintScan(ctx, S);
    paintMarkers(ctx, S);
    paintBearing(ctx, S);
    paintGlass(ctx, dpr);
    if (opts.after) opts.after(ctx, S);
  }

  window.WarMap = { paint, W, H, regions: R, cells: CELLS, coasts: COASTS, fillFor, coreFor, DARK, hex, css, mix };
})();
