/**
 * Markers (STYLE 5.7 layer 14), drawn every frame on top of the land: decorative brass tacks, pin
 * sockets on lit regions and pins pushed into them, glyphs on dark regions, numbers with capital
 * stars and port anchors, names, pin order badges, the numbered gold chips of a win preview and
 * the war tag. Socket and pin art is pre-rendered into small sprites, so a frame is mostly
 * drawImage and text.
 */
import type { Owner } from '../contract';
import { GLYPH, MAP_H as H, MAP_W as W, REGION } from '../data';
import {
  anchor,
  easeIn,
  FONT_LABEL,
  FONT_MONO,
  glowStroke,
  glyphPath,
  roundRect,
  starPath,
  text,
  textWidth,
  withShadow,
  type Gfx,
} from '../draw';
import { BRASS, css, GOLD, GOLD_INK, greyGlyph, hex, LINEN, markInk, mix, RING_WHITE, TYPE_INK, WAR, WAR_TEXT, WHITE, type RGB } from '../palette';
import type { RegionVis, Scene } from '../scene';
import { BRASS_TACK } from './effects';
import { ringRadius, WIN_CHIP_AT, WIN_CHIP_HALF } from './ring';
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

function brassCollar(g: Gfx, x: number, y: number, r: number): void {
  const { ctx } = g;
  const grad = ctx.createRadialGradient(x - 3, y - 3.5, 0.5, x, y, r + 0.5);
  grad.addColorStop(0, css(BRASS.hi));
  grad.addColorStop(0.4, css(BRASS.a));
  grad.addColorStop(0.75, css(BRASS.c));
  grad.addColorStop(1, css(BRASS.lo));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,6,0.9)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

/** A lit region's pin socket: a brass grommet set into the glass, its hole waiting for a pin. */
function socketSprite(k: number): Layer {
  return sprite('socket', k, (g) => {
    const { ctx } = g;
    const x = SPRITE_C;
    const y = SPRITE_C;
    withShadow(g, 'rgba(0,0,0,0.7)', 2, 0.5, 1, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 7.4, 0, Math.PI * 2);
      ctx.fill();
    });
    brassCollar(g, x, y, 7.4);
    // The hole: dark, with the far (lower-right) wall catching the lamp.
    const hole = ctx.createRadialGradient(x - 1, y - 1.2, 0.3, x, y, 4.6);
    hole.addColorStop(0, '#020304');
    hole.addColorStop(0.7, '#0A0D11');
    hole.addColorStop(1, '#1B2027');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(BRASS.hi, 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, 4.1, -0.1 * Math.PI, 0.55 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,12,3,0.9)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, 4.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,230,0.85)';
    ctx.beginPath();
    ctx.ellipse(x - 3.6, y - 4.4, 1.6, 0.9, -0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A brass pin pushed into the socket, its white enamel head the colour of the threads. */
function pinSprite(k: number): Layer {
  return sprite('pin', k, (g) => {
    const { ctx } = g;
    const x = SPRITE_C;
    const y = SPRITE_C;
    withShadow(g, 'rgba(0,0,0,0.75)', 5 / 3, 1, 4 / 3, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
    brassCollar(g, x, y, 8.5);
    const head = ctx.createRadialGradient(x - 2.2, y - 2.6, 0.4, x, y, 6.6);
    head.addColorStop(0, '#FFFFFF');
    head.addColorStop(0.4, css(RING_WHITE));
    head.addColorStop(1, css(hex('#A9A08C')));
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(x, y, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,8,12,0.6)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(x - 2.3, y - 2.7, 1.9, 1.15, -0.7, 0, Math.PI * 2);
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

/** Breathing period for lit sockets (ms); each region is offset so the table never pulses in unison. */
const BREATH_MS = 2600;
/** The breathing ring on a lit region that would join the pins (quicker than the lit breath). */
const JOIN_BREATH_MS = 1100;

function litHalo(g: Gfx, x: number, y: number, alpha: number, breath: number): void {
  const { ctx } = g;
  const r = 15 + 1.6 * breath;
  const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
  grad.addColorStop(0, `rgba(255,240,210,${0.5 * alpha * (0.8 + 0.2 * breath)})`);
  grad.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** One brass tack (4 pt), lit from the top-left: a crisis this region was won on. */
function tack(g: Gfx, bx: number, by: number, alpha: number, shadowK = 1, size = 1): void {
  const { ctx } = g;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (size !== 1) {
    ctx.translate(bx, by);
    ctx.scale(size, size);
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
 * The decorative brass tack. `drop` (0..1) animates it: big, close to the eye, falling from 60 pt
 * above onto the glass (250 ms, shrinking from 2.5x as it falls, its shadow gathering under it),
 * then a 60 ms bounce.
 */
function paintBrass(g: Gfx, x: number, y: number, alpha: number, drop: number | null): void {
  const bx = x + BRASS_TACK.dx;
  const restY = y + BRASS_TACK.dy;
  let by = restY;
  let shadowK = 1;
  let size = 1;
  if (drop !== null) {
    const fallEnd = 250 / 310;
    if (drop < fallEnd) {
      const f = easeIn(drop / fallEnd);
      by -= 60 * (1 - f);
      size = 2.5 - 1.5 * f;
      shadowK = 0.2 + 0.8 * f;
      const { ctx } = g;
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${(0.15 + 0.4 * f) * alpha})`;
      ctx.beginPath();
      ctx.ellipse(bx + 1, restY + 1.5, 4 + 6 * (1 - f), 2 + 3 * (1 - f), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      by -= 3 * Math.sin(Math.PI * ((drop - fallEnd) / (1 - fallEnd)));
    }
  }
  tack(g, bx, by, alpha, shadowK, size);
}

export interface MarkerTiming {
  /** Pin-drop progress per region (0..1), for pins just pushed in. */
  pinDrop: (id: string) => number | null;
  /** Brass-drop progress per region (0..1). */
  brassDrop: (id: string) => number | null;
}

/** Where a region's win-preview number sits: above and right of its pin, clear of its number. */
export function winChipAt(r: RegionVis): { x: number; y: number } {
  return { x: r.def.x + WIN_CHIP_AT.dx, y: r.def.y + WIN_CHIP_AT.dy };
}

function nameInk(owner: Owner, a: number): { color: string; halo: [string, number] } {
  return owner === 'gold'
    ? { color: css(GOLD_INK, a), halo: [`rgba(255,240,196,${0.75 * a})`, 2.6] }
    : { color: css(LINEN, 0.94 * a), halo: [`rgba(6,11,17,${0.85 * a})`, 2.6] };
}

function paintRegionMarker(g: Gfx, r: RegionVis, s: Scene, t: MarkerTiming): void {
  const { ctx } = g;
  const { x, y } = r.def;
  const a = r.dimNow;
  const ink = markInk(r.owner);

  const drop = t.brassDrop(r.id);
  if (r.brass || drop !== null) paintBrass(g, x, y, Math.max(0.55, a), drop);

  // Lit but not in play (it cannot be added to these pins): its marks drop to 30%.
  const markA = r.lit && !r.live ? 0.3 * a : a;
  if (r.pinned) {
    const push = t.pinDrop(r.id);
    // Pushed in: from 1.4x above the glass down to 1.0 (accelerating in, stopping dead).
    const sc = push === null ? 1 : 1.4 - 0.4 * easeIn(push);
    blit(g, pinSprite(g.k), x, y, a, sc);
  } else if (r.lit) {
    const breath = s.reduced ? 0.5 : 0.5 + 0.5 * Math.sin((s.now / BREATH_MS) * Math.PI * 2 + r.def.index * 1.7);
    if (r.live) litHalo(g, x, y, a * (r.joinable ? 1.4 : 1), breath);
    blit(g, socketSprite(g.k), x, y, markA);
    if (r.joinable) {
      // It would join the pins already down: a ring breathes round its socket.
      const jb = s.reduced ? 0.6 : 0.5 + 0.5 * Math.sin((s.now / JOIN_BREATH_MS) * Math.PI * 2);
      const ring = () => {
        ctx.beginPath();
        ctx.arc(x, y, 11 + 2 * jb, 0, Math.PI * 2);
        ctx.stroke();
      };
      ctx.save();
      ctx.strokeStyle = `rgba(6,11,17,${0.5 * a})`;
      ctx.lineWidth = 3;
      ring();
      ctx.strokeStyle = css(RING_WHITE, (0.45 + 0.5 * jb) * a);
      ctx.lineWidth = 1.5;
      ring();
      ctx.restore();
    }
  } else {
    glyphPath(ctx, GLYPH[r.def.colour], x, y, 6);
    ctx.fillStyle = css(r.owner === 'grey' ? greyGlyph(r.def.colour) : ink.glyph, 0.85 * a);
    ctx.fill();
  }

  // The number, then the capital star or the port anchor.
  const big = r.lit || r.pinned;
  const wx = x + (r.pinned ? 11.5 : big ? 10.5 : 6);
  const wFont = big ? `800 11px ${FONT_MONO}` : `700 8.5px ${FONT_MONO}`;
  const label = String(r.def.weight);
  const wA = big ? markA : 0.88 * a;
  text(ctx, label, wx, y + 0.5, {
    font: wFont,
    color: css(ink.text, wA),
    align: 'left',
    halo: [r.owner === 'gold' ? `rgba(255,240,196,${0.6 * wA})` : `rgba(6,11,17,${0.85 * Math.max(wA, 0.4)})`, big ? 3 : 2.4],
  });
  const tagX = wx + textWidth(ctx, label, wFont) + (big ? 5 : 4);
  const tagA = big ? markA : 0.7 * a;
  const tagInk: RGB = r.owner === 'gold' ? GOLD_INK : LINEN;
  if (r.capital) {
    ctx.save();
    starPath(ctx, tagX, y, big ? 4 : 3.2);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = r.owner === 'gold' ? `rgba(255,240,196,${0.6 * tagA})` : `rgba(6,11,17,${0.85 * Math.max(tagA, 0.4)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = css(tagInk, tagA);
    ctx.fill();
    ctx.restore();
  } else if (r.port) {
    anchor(ctx, tagX, y + 0.2, big ? 7 : 5.6, css(tagInk, tagA * 0.9), big ? 1 : 0.85);
  }

  if (big) {
    const n = nameInk(r.owner, markA);
    text(ctx, r.def.name.toUpperCase(), x, y + 15.5, { font: `600 9px ${FONT_LABEL}`, color: n.color, halo: n.halo, tracking: 0.6 });
  }

  // The scoring order counts off during the send; while choosing, the only numbers on the map are
  // the gold win numbers, so a pin never carries two.
  if (r.order !== null && s.sweeping && a > 0.5) {
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

/** The numbered gold chip on a region a send would win (1 = the crisis). */
function paintWinChip(g: Gfx, r: RegionVis, order: number): void {
  const { ctx } = g;
  const { x, y } = winChipAt(r);
  const label = String(order);
  const font = `800 9.5px ${FONT_MONO}`;
  const w = Math.max(2 * WIN_CHIP_HALF, textWidth(ctx, label, font) + 8);
  const h = 2 * WIN_CHIP_HALF;
  ctx.save();
  withShadow(g, 'rgba(0,0,0,0.65)', 1.2, 0.4, 1, () => {
    ctx.fillStyle = css(GOLD);
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 3.5);
    ctx.fill();
  });
  ctx.strokeStyle = 'rgba(58,44,10,0.9)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,230,0.7)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 3, y - h / 2 + 1);
  ctx.lineTo(x + w / 2 - 3, y - h / 2 + 1);
  ctx.stroke();
  ctx.restore();
  text(ctx, label, x, y + 0.6, { font, color: css(GOLD_INK) });
}

const WAR_TAG_FONT = `700 11px ${FONT_LABEL}`;
const WAR_TAG_H = 17;

/** The war tag's words: 'WAR · 3 TURNS', 'WAR · 2 TURNS', 'WAR · THIS TURN'. */
export function warTagText(turns: number): string {
  return turns <= 1 ? 'WAR · THIS TURN' : `WAR · ${turns} TURNS`;
}

/** Where the war tag sits: under the region's marks (under the ring on a crisis), or above near the bottom edge. */
export function warTagAt(r: RegionVis, width: number): { x: number; y: number } {
  // One place whether the region is lit or not, so the tag never jumps when a deal lights it.
  const below = r.crisis ? ringRadius(r.id) + 12 : 31;
  const above = r.crisis ? ringRadius(r.id) + 34 : 30;
  let y = r.def.y + below;
  if (y + WAR_TAG_H / 2 > H - 3) y = r.def.y - above;
  const x = Math.min(W - width / 2 - 3, Math.max(width / 2 + 3, r.def.x));
  return { x, y };
}

function paintWarTag(g: Gfx, s: Scene): void {
  const w = s.warNext;
  if (!w) return;
  const r = s.regions[w.id];
  const { ctx } = g;
  const label = warTagText(w.turns);
  const width = textWidth(ctx, label, WAR_TAG_FONT) + 0.9 * label.length + 14;
  const { x, y } = warTagAt(r, width);
  const urgent = w.turns <= 1;
  const beat = urgent && !s.reduced ? 0.5 + 0.5 * Math.sin((s.now / 900) * Math.PI * 2) : 0.5;
  // A send that would win the region first makes the tag moot: it steps back.
  const a = Math.max(0.6, r.dimNow) * (r.preview?.kind === 'win' ? 0.45 : 1);
  ctx.save();
  ctx.globalAlpha = a;
  const box = () => roundRect(ctx, x - width / 2, y - WAR_TAG_H / 2, width, WAR_TAG_H, 3);
  if (urgent) {
    glowStroke(ctx, () => {
      box();
      ctx.stroke();
    }, (k) => css(WAR, k * (0.8 + 0.8 * beat)), 1, 4);
  }
  withShadow(g, 'rgba(0,0,0,0.6)', 2, 0.5, 1, () => {
    ctx.fillStyle = urgent ? css(WAR) : 'rgba(26,9,8,0.95)';
    box();
    ctx.fill();
  });
  ctx.strokeStyle = urgent ? 'rgba(255,214,206,0.85)' : css(WAR_TEXT, 0.9);
  ctx.lineWidth = 1;
  box();
  ctx.stroke();
  ctx.restore();
  text(ctx, label, x, y + 0.6, {
    font: WAR_TAG_FONT,
    color: urgent ? css(WHITE, a) : css(mix(WAR_TEXT, WHITE, 0.15), a),
    tracking: 0.9,
  });
}

export function paintMarkers(g: Gfx, s: Scene, t: MarkerTiming): void {
  // Unpinned first, so pins (the player's choices) always sit on top.
  for (const r of s.list) if (!r.pinned) paintRegionMarker(g, r, s, t);
  for (const r of s.list) if (r.pinned) paintRegionMarker(g, r, s, t);
  for (const r of s.list) if (r.preview?.kind === 'win') paintWinChip(g, r, r.preview.order);
  paintWarTag(g, s);
  if (s.finger) paintFinger(g, REGION[s.finger].x, REGION[s.finger].y, s.now, s.reduced);
}

/**
 * The teaching finger: a tap ripple on the pin, a ring pressed in and lifted again with rings
 * spreading from it. No hand is drawn (STYLE 6: no figures).
 */
function paintFinger(g: Gfx, x: number, y: number, now: number, reduced: boolean): void {
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
  ctx.strokeStyle = 'rgba(6,11,17,0.5)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(x, y, touch, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = css(LINEN, 0.95);
  ctx.lineWidth = 2;
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
