/**
 * Markers (STYLE 5.7 layer 14), drawn every frame on top of the land: brass tacks, pins and lit
 * heads, weights with capital stars and port anchors, names, sweep-order badges and the stamp
 * marks that sit on the pin (RELAY's double ring, ECHO's doubled head). Pin and head art is
 * pre-rendered into small sprites per colour, so a frame is mostly drawImage and text.
 */
import type { Colour } from '../contract';
import { GLYPH } from '../data';
import { anchor, easeIn, FONT_LABEL, FONT_MONO, glyphPath, starPath, text, textWidth, withShadow, type Gfx } from '../draw';
import {
  ALARM,
  BLOC,
  BRASS,
  css,
  GOLD,
  HALO,
  hex,
  INFLUENCE,
  LINEN,
  mix,
  MOMENTUM,
  PEWTER,
  scale,
  SEA,
  TYPE_INK,
  weightInk,
  WHITE,
  type RGB,
} from '../palette';
import type { RegionVis, Scene } from '../scene';
import { makeLayer, type Layer } from './static';

/** Sprite canvases are SPRITE pt square with the pin centre at SPRITE_C. */
const SPRITE = 30;
const SPRITE_C = 13;
const sprites = new Map<string, Layer>();

function sprite(key: string, k: number, paint: (g: Gfx) => void): Layer {
  const id = `${key}@${k}`;
  let l = sprites.get(id);
  if (!l) {
    l = makeLayer(k, SPRITE, SPRITE);
    paint(l);
    sprites.set(id, l);
  }
  return l;
}

type PinKind = Colour | 'loose' | 'airlift';

/** A brass pin pushed into the glass with a coloured glass head (17 pt across). */
function pinSprite(kind: PinKind, k: number): Layer {
  return sprite(`pin:${kind}`, k, (g) => {
    const { ctx } = g;
    const x = SPRITE_C;
    const y = SPRITE_C;
    const collar =
      kind === 'loose'
        ? { hi: PEWTER.hi, a: PEWTER.base, c: PEWTER.lo, lo: scale(PEWTER.lo, 0.6) }
        : { hi: BRASS.hi, a: BRASS.a, c: BRASS.c, lo: BRASS.lo };
    const head: RGB = kind === 'loose' ? hex('#7E848D') : kind === 'airlift' ? mix(LINEN, WHITE, 0.5) : BLOC[kind];
    withShadow(g, 'rgba(0,0,0,0.75)', 5 / 3, 1, 4 / 3, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
    let grad = ctx.createRadialGradient(x - 3, y - 3.5, 0.5, x, y, 9);
    grad.addColorStop(0, css(collar.hi));
    grad.addColorStop(0.4, css(collar.a));
    grad.addColorStop(0.75, css(collar.c));
    grad.addColorStop(1, css(collar.lo));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,6,0.85)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    grad = ctx.createRadialGradient(x - 2.2, y - 2.6, 0.4, x, y, 6.6);
    grad.addColorStop(0, css(mix(WHITE, head, 0.7)));
    grad.addColorStop(0.35, css(head));
    grad.addColorStop(1, css(scale(head, kind === 'airlift' ? 0.62 : 0.42)));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,8,12,0.55)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(x - 2.3, y - 2.7, 1.9, 1.15, -0.7, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'airlift') {
      // AIRLIFT: a white enamel head carrying an up-chevron (the stamp's wing), in type ink.
      ctx.strokeStyle = css(TYPE_INK, 0.85);
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 2.8, y + 1.9);
      ctx.lineTo(x, y - 1.1);
      ctx.lineTo(x + 2.8, y + 1.9);
      ctx.stroke();
    }
  });
}

/** A lit region's glowing pin head (16 pt) with its bloc glyph. The halo is drawn live (it breathes). */
function headSprite(colour: Colour, k: number): Layer {
  return sprite(`head:${colour}`, k, (g) => {
    const { ctx } = g;
    const x = SPRITE_C;
    const y = SPRITE_C;
    withShadow(g, 'rgba(255,236,200,0.9)', 2, 0, 0, () => {
      const h = ctx.createRadialGradient(x - 2, y - 2.4, 0.5, x, y, 8);
      h.addColorStop(0, '#FFFFFF');
      h.addColorStop(0.6, '#FFF1D6');
      h.addColorStop(1, '#E8D2A8');
      ctx.fillStyle = h;
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
    glyphPath(ctx, GLYPH[colour], x, y + 0.3, 6.4);
    ctx.fillStyle = css(scale(BLOC[colour], 0.62));
    ctx.fill();
  });
}

function blit(g: Gfx, l: Layer, x: number, y: number, alpha: number, s = 1): void {
  const { ctx } = g;
  ctx.save();
  ctx.globalAlpha = alpha;
  const size = SPRITE * s;
  ctx.drawImage(l.canvas, x - SPRITE_C * s, y - SPRITE_C * s, size, size);
  ctx.restore();
}

/** Breathing period for lit heads (ms); each region is offset so the table never pulses in unison. */
const BREATH_MS = 2600;

/** The breathing ring on a lit region that would join the pins (quicker than the lit breath). */
const JOIN_BREATH_MS = 1100;

function litHalo(g: Gfx, x: number, y: number, alpha: number, breath: number): void {
  const { ctx } = g;
  const r = 15 + 1.6 * breath;
  const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
  grad.addColorStop(0, `rgba(255,240,210,${0.55 * alpha * (0.8 + 0.2 * breath)})`);
  grad.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** One brass tack (4 pt), lit from the top-left. */
function tack(g: Gfx, bx: number, by: number, alpha: number, shadowK = 1, scale = 1): void {
  const { ctx } = g;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (scale !== 1) {
    ctx.translate(bx, by);
    ctx.scale(scale, scale);
    ctx.translate(-bx, -by);
  }
  withShadow(g, `rgba(0,0,0,${0.8 * shadowK})`, 2.5 / 3, 1 / 3, 1.6 / 3, () => {
    ctx.fillStyle = css(BRASS.lo);
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  const grad = ctx.createLinearGradient(bx - 3, by - 3, bx + 3, by + 3);
  grad.addColorStop(0, css(BRASS.hi));
  grad.addColorStop(0.5, css(BRASS.b));
  grad.addColorStop(1, css(BRASS.c));
  ctx.fillStyle = grad;
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

/**
 * Earned brass pins: up to 3 tacks stacked left of the pin like coins, then an 'x4' count. `drop`
 * (0..1) animates the newest tack: big, close to the eye, falling from 60 pt above onto the glass
 * (250 ms, shrinking from 2.5x as it falls, its shadow gathering under it), then a 60 ms bounce.
 */
function paintBrass(g: Gfx, x: number, y: number, n: number, alpha: number, drop: number | null): void {
  const shown = Math.min(3, n);
  for (let i = shown - 1; i >= 0; i--) {
    const bx = x - 14.5 - i * 4.5;
    let by = y + 2;
    let shadowK = 1;
    let scale = 1;
    if (drop !== null && i === shown - 1) {
      const fallEnd = 250 / 310;
      if (drop < fallEnd) {
        const f = easeIn(drop / fallEnd);
        by -= 60 * (1 - f);
        scale = 2.5 - 1.5 * f;
        shadowK = 0.2 + 0.8 * f;
        // Its shadow waits on the glass where it will land, tightening as the pin comes down.
        const { ctx } = g;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${(0.15 + 0.4 * f) * alpha})`;
        ctx.beginPath();
        ctx.ellipse(bx + 1, y + 3.5, 4 + 6 * (1 - f), 2 + 3 * (1 - f), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const b = (drop - fallEnd) / (1 - fallEnd);
        by -= 3 * Math.sin(Math.PI * b);
      }
    }
    tack(g, bx, by, alpha, shadowK, scale);
  }
  if (n > 3) {
    text(g.ctx, `×${n}`, x - 34, y + 2, { font: `800 7px ${FONT_MONO}`, color: css(BRASS.a, alpha), align: 'right', halo: [HALO, 2.2] });
  }
}

/** A rounded rectangle path (no roundRect: older Safari). */
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface MarkerTiming {
  /** Pin-drop progress per region (0..1), for pins just pushed in. */
  pinDrop: (id: string) => number | null;
  /** Brass-drop progress per region (0..1). */
  brassDrop: (id: string) => number | null;
}

function paintRegionMarker(g: Gfx, r: RegionVis, s: Scene, t: MarkerTiming): void {
  const { ctx } = g;
  const { x, y } = r.def;
  const col = BLOC[r.colour];
  const a = r.dimNow;
  const held = r.pinned || r.airlift;
  const lit = held || r.status === 'lit';
  if (r.status === 'retired') return;

  const drop = t.brassDrop(r.id);
  const brass = Math.max(r.brass, drop === null ? 0 : 1);
  if (brass) paintBrass(g, x, y, brass, Math.max(0.55, a), drop);

  // RELAY: a double ring around the pin.
  if (r.stamp === 'RELAY') {
    const big = lit;
    ctx.save();
    ctx.strokeStyle = css(LINEN, 0.75 * Math.max(0.45, a));
    ctx.lineWidth = 1;
    for (const rr of big ? [11.5, 14.2] : [7.5, 10]) {
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (held) {
    const kind: Colour | 'loose' | 'airlift' = r.loose ? 'loose' : r.airlift ? 'airlift' : r.colour;
    if (r.stamp === 'ECHO') blit(g, pinSprite(kind, g.k), x + 5.5, y - 5, 0.8 * a, 0.92);
    const push = t.pinDrop(r.id);
    // Pushed in: from 1.4x above the glass down to 1.0 (accelerating in, stopping dead).
    const sc = push === null ? 1 : 1.4 - 0.4 * easeIn(push);
    blit(g, pinSprite(kind, g.k), x, y, r.loose ? Math.max(0.55, a) : a, sc);
  } else if (r.status === 'lit') {
    if (r.stamp === 'ECHO') blit(g, headSprite(r.colour, g.k), x + 5.5, y - 5, 0.75 * a, 0.92);
    const breath = s.reduced ? 0.5 : 0.5 + 0.5 * Math.sin((s.now / BREATH_MS) * Math.PI * 2 + r.def.index * 1.7);
    litHalo(g, x, y, a * (r.blackout ? 0.5 : 1) * (r.joinable ? 1.4 : 1), breath);
    blit(g, headSprite(r.colour, g.k), x, y, a * (r.blackout ? 0.7 : 1));
    // It would join the pins already down: a ring breathes round its head.
    if (r.joinable) {
      const jb = s.reduced ? 0.6 : 0.5 + 0.5 * Math.sin((s.now / JOIN_BREATH_MS) * Math.PI * 2);
      ctx.save();
      ctx.strokeStyle = css(LINEN, (0.35 + 0.45 * jb) * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, 11 + 2 * jb, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (r.status === 'spent') {
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
    const ga = r.blackout ? 0.3 : Math.max(0.35, a);
    ctx.save();
    if (r.stamp === 'ECHO') {
      glyphPath(ctx, GLYPH[r.colour], x + 3, y - 2.5, 6);
      ctx.fillStyle = css(mix(col, SEA, 0.55), ga * 0.5);
      ctx.fill();
    }
    glyphPath(ctx, GLYPH[r.colour], x, y, 6);
    ctx.fillStyle = css(mix(col, SEA, 0.55), ga);
    ctx.fill();
    ctx.restore();
  }

  // Weight, then the capital star or the port anchor.
  const big = lit;
  const wx = x + (held ? 11.5 : big ? 10.5 : 6);
  const wFont = big ? `800 11px ${FONT_MONO}` : `700 8.5px ${FONT_MONO}`;
  const spent = r.status === 'spent';
  const wA = big ? a : spent ? 0.32 : 0.62 * Math.max(a, 0.5) * (r.blackout ? 0.6 : 1);
  // While choosing, a pin that will score shows what it adds (the engine's silent scorer): its
  // number becomes its Influence, every pass, thread, stamp and pin staff included ('+20' on the
  // flashpoint), and anything it does to Momentum follows the port or capital mark in amber
  // ('+5', 'x1.5'). Loose and blacked-out pins add nothing and keep the plain number; during a
  // sweep the pops carry it.
  const chip = r.chip && !r.loose && !r.blackout ? r.chip : null;
  const label = chip ? chip.inf : String(r.def.weight);
  text(ctx, label, wx, y + 0.5, {
    font: wFont,
    color: chip ? css(INFLUENCE, a) : css(weightInk(r.colour, big), wA),
    align: 'left',
    halo: [`rgba(6,11,17,${0.85 * Math.max(a, 0.4)})`, big ? 3 : 2.4],
  });
  const tagX = wx + textWidth(ctx, label, wFont) + (big ? 5 : 4);
  // BLACKOUT: the region adds nothing this crisis, so its number is struck out in alarm red.
  if (r.blackout && big) {
    ctx.save();
    ctx.strokeStyle = css(ALARM, 0.95 * a);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wx - 1.5, y + 3.5);
    ctx.lineTo(tagX - 3, y - 3.5);
    ctx.stroke();
    ctx.restore();
  }
  const tagA = big ? a : spent ? 0.3 : 0.5 * Math.max(a, 0.5) * (r.blackout ? 0.6 : 1);
  if (r.capital) {
    ctx.save();
    starPath(ctx, tagX, y, big ? 4 : 3.2);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(6,11,17,${0.85 * Math.max(a, 0.4)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = css(GOLD, tagA);
    ctx.fill();
    ctx.restore();
  } else if (r.port) {
    anchor(ctx, tagX, y + 0.2, big ? 7 : 5.6, css(mix(LINEN, col, 0.7), tagA), big ? 1 : 0.85);
  }
  if (chip?.mom) {
    const mx = tagX + (r.capital || r.port ? 6 : 0);
    text(ctx, chip.mom, mx, y + 0.5, {
      font: `800 9.5px ${FONT_MONO}`,
      color: css(MOMENTUM, a),
      align: 'left',
      halo: [`rgba(20,10,2,${0.9 * a})`, 2.6],
    });
  }

  if (lit) {
    const name = r.def.name.toUpperCase();
    const nameFont = `600 9px ${FONT_LABEL}`;
    text(ctx, name, x, y + 15.5, { font: nameFont, color: css(LINEN, 0.92 * a), halo: [`rgba(6,11,17,${0.8 * a})`, 2.6], tracking: 0.6 });
    // A region that scores more than once says so beside its name: the flashpoint always (the red
    // ring scores twice), and while choosing any pin the Courier, an Echo or the Signals Officer
    // makes score again.
    const times = r.loose ? 1 : r.chip && !r.blackout ? r.chip.passes : r.id === s.flashpoint ? 2 : 1;
    if (times > 1 && !(r.id === s.flashpoint && (s.cooled || s.collapse !== null))) {
      const nameW = textWidth(ctx, name, nameFont) + 0.6 * name.length;
      text(ctx, `×${times}`, x + nameW / 2 + 3, y + 15.5, {
        font: `800 8.5px ${FONT_MONO}`,
        color: css(MOMENTUM, a),
        align: 'left',
        halo: [`rgba(20,10,2,${0.9 * a})`, 2.6],
      });
    }
  }

  // A loose pin is spent by the sweep but scores nothing: it says so where the order badge would be.
  if (held && r.loose && a > 0.5) {
    const font = `700 7px ${FONT_LABEL}`;
    const w = textWidth(ctx, 'LOOSE', font) + 0.8 * 5 + 6;
    const bx = x - 7 - w;
    const by = y - 13;
    ctx.save();
    ctx.fillStyle = 'rgba(20,24,30,0.92)';
    pill(ctx, bx, by - 5, w, 10, 2.5);
    ctx.fill();
    ctx.strokeStyle = css(PEWTER.base, 0.8);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
    text(ctx, 'LOOSE', bx + w / 2, by + 0.4, { font, color: css(PEWTER.hi, 0.95), tracking: 0.8 });
  }

  if (r.order !== null && a > 0.5) {
    const bx = x - 8.5;
    const by = y - 8.5;
    const done = r.orderDone;
    ctx.save();
    withShadow(g, 'rgba(0,0,0,0.6)', 2 / 3, 0.5 / 3, 1 / 3, () => {
      ctx.fillStyle = done ? css(LINEN, 0.95) : 'rgba(20,24,30,0.95)';
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = done ? 'rgba(42,37,32,0.6)' : css(LINEN, 0.6);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
    text(ctx, String(r.order), bx, by + 0.4, { font: `800 7px ${FONT_MONO}`, color: done ? css(TYPE_INK) : css(LINEN, 0.95) });
  }
}

export function paintMarkers(g: Gfx, s: Scene, t: MarkerTiming): void {
  // Unpinned first, so pins (the player's choices) always sit on top.
  for (const r of s.list) if (!(r.pinned || r.airlift)) paintRegionMarker(g, r, s, t);
  for (const r of s.list) if (r.pinned || r.airlift) paintRegionMarker(g, r, s, t);
}

/**
 * The first-night finger (spec 11): a tap ripple on the pin, a ring pressed in and lifted again
 * with rings spreading from it. No hand is drawn (STYLE 6: no figures).
 */
export function paintFinger(g: Gfx, x: number, y: number, now: number, reduced: boolean): void {
  const { ctx } = g;
  const period = 1300;
  const p = reduced ? 0.35 : (now % period) / period;
  // The press: the touch ring tightens onto the pin, then the ripple leaves it.
  const press = reduced ? 1 : p < 0.25 ? easeIn(p / 0.25) : 1;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 6, x, y, 24);
  glow.addColorStop(0, `rgba(255,246,224,${0.3 * press})`);
  glow.addColorStop(1, 'rgba(255,246,224,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  const touch = 17 - 5 * press;
  ctx.strokeStyle = css(LINEN, 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, touch, 0, Math.PI * 2);
  ctx.stroke();
  if (!reduced && p >= 0.25) {
    for (const lag of [0, 0.22]) {
      const q = (p - 0.25 - lag) / 0.6;
      if (q < 0 || q > 1) continue;
      ctx.strokeStyle = css(LINEN, 0.8 * (1 - q));
      ctx.lineWidth = 1.6 * (1 - q) + 0.4;
      ctx.beginPath();
      ctx.arc(x, y, 12 + 22 * Math.sqrt(q), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
