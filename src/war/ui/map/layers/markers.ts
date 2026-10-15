/**
 * Markers (STYLE 5.7 layer 14), drawn every frame on top of the land: pin sockets on lit regions
 * and pins pushed into them, numbers with capital stars and port anchors, names, the gold check of
 * a win preview and the war tag. The only numbers on the map are the regions' own (and the target
 * on the ring): no order badges, no glyphs that look like prices. Socket and pin art is
 * pre-rendered into small sprites, so a frame is mostly drawImage and text.
 */
import type { Owner } from '../contract';
import { MAP_H as H, MAP_W as W, REGION, REGIONS } from '../data';
import {
  anchor,
  easeIn,
  easeInOut,
  easeOut,
  FONT_LABEL,
  FONT_MONO,
  glowStroke,
  lerp,
  roundRect,
  starPath,
  text,
  textWidth,
  withShadow,
  type Gfx,
} from '../draw';
import { BRASS, css, GOLD, GOLD_INK, hex, LINEN, markInk, mix, RING_WHITE, WAR, WAR_TEXT, WHITE, type RGB } from '../palette';
import type { RegionVis, Scene } from '../scene';
import { BADGE_H, labelBoxes, ringLayout, ringRadius, WIN_CHIP_AT, WIN_CHIP_HALF, type Box } from './ring';
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

export interface MarkerTiming {
  /** Pin-drop progress per region (0..1), for pins just pushed in. */
  pinDrop: (id: string) => number | null;
}

/** Where a region's win-preview check sits: above and right of its pin, clear of its number. */
export function winChipAt(r: RegionVis): { x: number; y: number } {
  return { x: r.def.x + WIN_CHIP_AT.dx, y: r.def.y + WIN_CHIP_AT.dy };
}

function nameInk(owner: Owner, a: number): { color: string; halo: [string, number] } {
  return owner === 'gold'
    ? { color: css(GOLD_INK, a), halo: [`rgba(255,240,196,${0.75 * a})`, 2.6] }
    : { color: css(LINEN, 0.94 * a), halo: [`rgba(6,11,17,${0.85 * a})`, 2.6] };
}

function numberHalo(owner: Owner, a: number, wide: number): [string, number] {
  return [owner === 'gold' ? `rgba(255,240,196,${0.6 * a})` : `rgba(6,11,17,${0.85 * Math.max(a, 0.4)})`, wide];
}

/** The capital star or the port anchor after a number, at `tagX`. */
function paintTag(g: Gfx, r: RegionVis, tagX: number, y: number, big: boolean, a: number): void {
  const { ctx } = g;
  const ink: RGB = r.owner === 'gold' ? GOLD_INK : LINEN;
  if (r.capital) {
    ctx.save();
    starPath(ctx, tagX, y, big ? 4 : 3.4);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = r.owner === 'gold' ? `rgba(255,240,196,${0.6 * a})` : `rgba(6,11,17,${0.85 * Math.max(a, 0.4)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = css(ink, a);
    ctx.fill();
    ctx.restore();
  } else if (r.port) {
    anchor(ctx, tagX, y + 0.2, big ? 7 : 6, css(ink, a * 0.9), big ? 1 : 0.9);
  }
}

/** How wide a capital star or port anchor is after a number (0 for neither). */
function tagWidth(r: RegionVis, big: boolean): number {
  return r.capital || r.port ? (big ? 9 : 8) : 0;
}

/**
 * How strongly a region's marks show (SPEC 8, "While choosing"). A lit region that cannot be added
 * to these pins steps back (its socket loses its glow, its number and name dim a little) but stays
 * readable; gold never dims, because faded gold reads as lost. Out of the deal, free and war regions
 * step back further while a deal is on the table, and read in full when the world is at rest.
 */
export function markAlpha(r: Pick<RegionVis, 'owner' | 'lit' | 'live' | 'pinned'>, rest: boolean): { socket: number; number: number; name: number } {
  const gold = r.owner === 'gold';
  if (r.pinned || r.live) return { socket: 1, number: 1, name: 1 };
  if (r.lit) return gold ? { socket: 0.45, number: 1, name: 1 } : { socket: 0.45, number: 0.75, name: 0.62 };
  if (gold || rest) return { socket: 0, number: gold ? 0.9 : 0.85, name: gold ? 0.9 : 0.72 };
  return { socket: 0, number: 0.7, name: 0.42 };
}

function paintRegionMarker(g: Gfx, r: RegionVis, s: Scene, t: MarkerTiming): void {
  const { ctx } = g;
  const { x, y } = r.def;
  const a = r.dimNow;
  const ink = markInk(r.owner);
  const k = markAlpha(r, s.rest);

  if (r.pinned) {
    const push = t.pinDrop(r.id);
    // Pushed in: from 1.4x above the glass down to 1.0 (accelerating in, stopping dead).
    const sc = push === null ? 1 : 1.4 - 0.4 * easeIn(push);
    blit(g, pinSprite(g.k), x, y, a, sc);
  } else if (r.lit) {
    const breath = s.reduced ? 0.5 : 0.5 + 0.5 * Math.sin((s.now / BREATH_MS) * Math.PI * 2 + r.def.index * 1.7);
    if (r.live) litHalo(g, x, y, a * (r.joinable ? 1.4 : 1), breath);
    blit(g, socketSprite(g.k), x, y, k.socket * a);
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
  }

  const label = String(r.def.weight);
  const numA = k.number * a;
  const nameA = k.name * a;
  if (r.lit || r.pinned) {
    // In the deal: the number right of the socket, then the star or anchor; the name under it.
    const wx = x + (r.pinned ? 11.5 : 10.5);
    const font = `800 11px ${FONT_MONO}`;
    text(ctx, label, wx, y + 0.5, { font, color: css(ink.text, numA), align: 'left', halo: numberHalo(r.owner, numA, 3) });
    paintTag(g, r, wx + textWidth(ctx, label, font) + 5, y, true, numA);
    const n = nameInk(r.owner, nameA);
    text(ctx, r.def.name.toUpperCase(), x, y + 15.5, { font: `600 9px ${FONT_LABEL}`, color: n.color, halo: n.halo, tracking: 0.6 });
    return;
  }
  // Out of the deal: the number (and its star or anchor) centred on the pin, the name under it.
  const font = `700 9.5px ${FONT_MONO}`;
  const nw = textWidth(ctx, label, font);
  const tw = tagWidth(r, false);
  const x0 = x - (nw + (tw ? tw + 2 : 0)) / 2;
  text(ctx, label, x0, y - 2.5, { font, color: css(ink.text, numA), align: 'left', halo: numberHalo(r.owner, numA, 2.6) });
  if (tw) paintTag(g, r, x0 + nw + 2 + tw / 2, y - 3, false, numA);
  const n = nameInk(r.owner, nameA);
  text(ctx, r.def.name.toUpperCase(), x, y + 8.5, { font: `600 8.5px ${FONT_LABEL}`, color: n.color, halo: n.halo, tracking: 0.55 });
}

/** The gold check on a region a send would win: it turns gold (the order is the engine's, not the player's to read). */
function paintWinCheck(g: Gfx, r: RegionVis): void {
  const { ctx } = g;
  const { x, y } = winChipAt(r);
  const h = 2 * WIN_CHIP_HALF;
  ctx.save();
  withShadow(g, 'rgba(0,0,0,0.65)', 1.2, 0.4, 1, () => {
    ctx.fillStyle = css(GOLD);
    roundRect(ctx, x - h / 2, y - h / 2, h, h, 3.5);
    ctx.fill();
  });
  ctx.strokeStyle = 'rgba(58,44,10,0.9)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = css(GOLD_INK);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 3.6, y + 0.2);
  ctx.lineTo(x - 1, y + 2.8);
  ctx.lineTo(x + 3.8, y - 2.6);
  ctx.stroke();
  ctx.restore();
}

const WAR_TAG_FONT = `700 11px ${FONT_LABEL}`;
const WAR_TAG_H = 17;

/**
 * The war tag's words. During a turn: 'WAR · 3 TURNS', 'WAR · 2 TURNS', 'WAR · THIS TURN'. Between
 * turns (`between`: the count runs from the coming turn): 'WAR · IN 2 TURNS', 'WAR · NEXT TURN'.
 * As war spreads into the region: 'WAR · NOW'.
 */
export function warTagText(turns: number, between = false): string {
  if (turns <= 0) return 'WAR · NOW';
  if (between) return turns === 1 ? 'WAR · NEXT TURN' : `WAR · IN ${turns} TURNS`;
  return turns === 1 ? 'WAR · THIS TURN' : `WAR · ${turns} TURNS`;
}

/** Sideways moves the war tag may make to clear a neighbour's name (map points). */
const TAG_SHIFTS = [0, 8, 16, 24, 32].flatMap((d) => (d ? [-d, d] : [0]));

const tagSpots = new Map<string, { x: number; y: number }>();

/**
 * Where the war tag sits: under the region's marks (under the ring on a crisis), or above them near
 * the bottom edge. It keeps clear of the crisis ring's chip (`avoid`, a must) and of the names and
 * numbers of the regions round it (the ones a player is about to pin), moving a little sideways or
 * above its region when it has to; the smallest move that clears them wins.
 */
export function warTagAt(r: RegionVis, width: number, avoid: Box | null = null): { x: number; y: number } {
  const key = `${r.id}|${r.crisis ? 1 : 0}|${Math.round(width)}|${avoid ? `${avoid.x0},${avoid.y0},${avoid.x1},${avoid.y1}` : ''}`;
  let at = tagSpots.get(key);
  if (!at) {
    at = placeWarTag(r, width, avoid);
    if (tagSpots.size > 512) tagSpots.clear();
    tagSpots.set(key, at);
  }
  return at;
}

function placeWarTag(r: RegionVis, width: number, avoid: Box | null): { x: number; y: number } {
  // One place whether the region is lit or not, so the tag never jumps when a deal lights it.
  const below = r.crisis ? ringRadius(r.id) + 12 : 31;
  const above = r.crisis ? ringRadius(r.id) + 34 : 30;
  const cx = r.def.x;
  const clampX = (x: number) => Math.min(W - width / 2 - 3, Math.max(width / 2 + 3, x));
  const box = (x: number, y: number): Box => ({ x0: x - width / 2, y0: y - WAR_TAG_H / 2, x1: x + width / 2, y1: y + WAR_TAG_H / 2 });
  const low = r.def.y + below;
  const high = r.def.y - above;
  const rows = [
    ...(low + WAR_TAG_H / 2 <= H - 3 ? [{ y: low, cost: 0 }] : []),
    ...(high - WAR_TAG_H / 2 >= 6 ? [{ y: high, cost: 18 }] : []),
  ];
  if (!rows.length) return { x: clampX(cx), y: high };
  const names = REGIONS.filter((o) => o.id !== r.id && Math.abs(o.x - cx) < 140 && Math.abs(o.y - r.def.y) < 90).flatMap((o) => labelBoxes(o.id));
  let best = { x: clampX(cx), y: rows[0].y, cost: Infinity };
  for (const row of rows) {
    for (const dx of TAG_SHIFTS) {
      const x = clampX(cx + dx);
      const b = box(x, row.y);
      const chip = avoid ? overlapArea(b, avoid) : 0;
      const cost = row.cost + 0.5 * Math.abs(x - cx) + (chip > 0 ? 1e6 : 0) + names.reduce((sum, n) => sum + overlapArea(b, n), 0);
      if (cost < best.cost - 1e-6) best = { x, y: row.y, cost };
    }
  }
  return { x: best.x, y: best.y };
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/** The crisis ring's chip, which the war tag keeps clear of. */
function chipBox(s: Scene): Box | null {
  if (!s.ring) return null;
  const L = ringLayout(s.ring.id, s.ring.target);
  return { x0: L.badge.x - L.width / 2 - 2, y0: L.badge.y - BADGE_H / 2 - 2, x1: L.badge.x + L.width / 2 + 2, y1: L.badge.y + BADGE_H / 2 + 2 };
}

function paintWarTag(g: Gfx, s: Scene): void {
  const w = s.warNext;
  if (!w) return;
  const r = s.regions[w.id];
  const { ctx } = g;
  const label = warTagText(w.turns, w.between);
  const width = textWidth(ctx, label, WAR_TAG_FONT) + 0.9 * label.length + 14;
  const avoid = chipBox(s);
  let { x, y } = warTagAt(r, width, avoid);
  // The tag hops from the region it was on, in a low arc, so the player sees where war goes next.
  const hop = s.tagHop;
  if (hop && hop.to === w.id && s.regions[hop.from]) {
    const from = warTagAt(s.regions[hop.from], width, avoid);
    const e = easeInOut(hop.p);
    x = lerp(from.x, x, e);
    y = lerp(from.y, y, e) - 14 * Math.sin(Math.PI * e);
  }
  // A new count stamps in: the tag swells and settles.
  const sc = s.tagStamp === null ? 1 : 1 + 0.22 * (1 - easeOut(s.tagStamp));
  const urgent = w.turns <= 1;
  const beat = urgent && !s.reduced ? 0.5 + 0.5 * Math.sin((s.now / 900) * Math.PI * 2) : 0.5;
  // A send that would win the region first makes the tag moot: it steps back.
  const a = Math.max(0.6, r.dimNow) * (r.preview?.kind === 'win' ? 0.45 : 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.globalAlpha = a;
  const box = () => roundRect(ctx, -width / 2, -WAR_TAG_H / 2, width, WAR_TAG_H, 3);
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
  ctx.globalAlpha = 1;
  text(ctx, label, 0, 0.6, {
    font: WAR_TAG_FONT,
    color: urgent ? css(WHITE, a) : css(mix(WAR_TEXT, WHITE, 0.15), a),
    tracking: 0.9,
  });
  ctx.restore();
}

export function paintMarkers(g: Gfx, s: Scene, t: MarkerTiming): void {
  // Unpinned first, so pins (the player's choices) always sit on top.
  for (const r of s.list) if (!r.pinned) paintRegionMarker(g, r, s, t);
  for (const r of s.list) if (r.pinned) paintRegionMarker(g, r, s, t);
  for (const r of s.list) if (r.preview?.kind === 'win') paintWinCheck(g, r);
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
