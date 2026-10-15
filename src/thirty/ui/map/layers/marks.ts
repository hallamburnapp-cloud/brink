/**
 * What is drawn over the land, every frame: the home flag on the capital, today's thin white ring
 * with the region's name under it, and on a map day the glowing places with their one-line labels.
 * Nothing else: no numbers, no pins, no threads, no tags.
 */
import type { MapView, RegionId, Target } from '../contract';
import { ISLAND_R, MAP_H as H, MAP_W as W, REGION, REGIONS } from '../data';
import { easeInOut, FONT_LABEL, roundRect, text, textWidth, type Ctx, type Gfx } from '../draw';
import { css, LABEL_BG, RING_WHITE, TENSE, WHITE } from '../palette';
import { getPaths } from '../paths';

const ringRadii = new Map<RegionId, number>();

/**
 * The ring's radius for a region: it marks that one place, so it hugs its centre. Islands ring their
 * disc; on the mainland it reaches half way to the nearest other centre (17 to 26 pt), and it stays
 * on the map.
 */
export function ringRadius(id: RegionId): number {
  let r = ringRadii.get(id);
  if (r === undefined) {
    const def = REGION[id];
    let nearest = Infinity;
    for (const o of REGIONS) if (o.id !== id) nearest = Math.min(nearest, Math.hypot(o.x - def.x, o.y - def.y));
    r = def.island ? ISLAND_R + 3 : Math.min(26, Math.max(17, nearest / 2));
    r = Math.min(r, def.x - 4, W - def.x - 4, def.y - 6, H - def.y - 4);
    ringRadii.set(id, r);
  }
  return r;
}

export const LABEL_FONT = `600 11px ${FONT_LABEL}`;
const LABEL_TRACK = 0.4;
export const LABEL_H = 17;
const LABEL_PAD = 7;

export interface Label {
  id: RegionId;
  text: string;
  x: number;
  y: number;
  w: number;
  /** A tap target's label (glows with it) rather than the ring's name. */
  target: boolean;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function overlaps(a: Box, b: Box): boolean {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
}

function box(l: { x: number; y: number; w: number }): Box {
  return { x0: l.x - l.w / 2 - 2, y0: l.y - LABEL_H / 2 - 2, x1: l.x + l.w / 2 + 2, y1: l.y + LABEL_H / 2 + 2 };
}

/**
 * Where the labels sit: each under its region's ring (above it near the bottom edge), kept on the
 * map and clear of one another: a label that would cover an earlier one steps down (or up) a row.
 * `measure` gives a label's text width; pure otherwise, so the placement has a test.
 */
export function placeLabels(items: Array<{ id: RegionId; text: string; target: boolean }>, measure: (s: string) => number): Label[] {
  const out: Label[] = [];
  for (const it of items) {
    const def = REGION[it.id];
    if (!def) continue;
    const w = Math.min(W - 8, measure(it.text) + LABEL_PAD * 2);
    const r = ringRadius(it.id);
    const x = Math.min(W - w / 2 - 3, Math.max(w / 2 + 3, def.x));
    const below = def.y + r + 4 + LABEL_H / 2;
    const above = def.y - r - 4 - LABEL_H / 2;
    const rows = below + LABEL_H / 2 <= H - 3 ? [below, above, below + LABEL_H + 3, above - LABEL_H - 3] : [above, above - LABEL_H - 3];
    let placed: Label | null = null;
    for (const y of rows) {
      if (y - LABEL_H / 2 < 2 || y + LABEL_H / 2 > H - 2) continue;
      const cand = { id: it.id, text: it.text, x, y, w, target: it.target };
      if (!out.some((o) => overlaps(box(o), box(cand)))) {
        placed = cand;
        break;
      }
    }
    out.push(placed ?? { id: it.id, text: it.text, x, y: rows[0], w, target: it.target });
  }
  return out;
}

function paintLabel(ctx: Ctx, l: Label, alpha: number, bright: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, l.x - l.w / 2, l.y - LABEL_H / 2, l.w, LABEL_H, 4);
  ctx.fillStyle = css(LABEL_BG, 0.86);
  ctx.fill();
  if (l.target) {
    ctx.strokeStyle = css(TENSE, 0.55 + 0.35 * bright);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  text(ctx, l.text, l.x, l.y + 0.5, { font: LABEL_FONT, color: css(l.target ? WHITE : RING_WHITE, l.target ? 1 : 0.92), tracking: LABEL_TRACK });
  ctx.restore();
}

/** The small flag on the home capital: a pole and a pennant, white, no colour of its own. */
function paintFlag(g: Gfx, id: RegionId): void {
  const def = REGION[id];
  if (!def) return;
  const { ctx } = g;
  const x = def.x - 1;
  const y = def.y + 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // A dark halo so the mark reads on any heat.
  ctx.strokeStyle = 'rgba(6,10,18,0.7)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y - 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(6,10,18,0.7)';
  ctx.beginPath();
  ctx.moveTo(x - 1, y - 9);
  ctx.lineTo(x + 9, y - 6);
  ctx.lineTo(x - 1, y - 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(RING_WHITE);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y - 8);
  ctx.stroke();
  ctx.fillStyle = css(RING_WHITE);
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 8, y - 5.5);
  ctx.lineTo(x, y - 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Today's region: a thin white ring. */
function paintRing(g: Gfx, id: RegionId): void {
  const def = REGION[id];
  if (!def) return;
  const { ctx } = g;
  const r = ringRadius(id);
  ctx.save();
  ctx.strokeStyle = 'rgba(6,10,18,0.55)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(def.x, def.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = css(RING_WHITE, 0.95);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(def.x, def.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

const BREATH_MS = 1800;

/** A place the player may tap: its plate lit from within, a soft halo on the sea, a breathing rim. */
function paintTarget(g: Gfx, t: Target, now: number, reduced: boolean, pressed: boolean): number {
  const def = REGION[t.id];
  if (!def) return 0;
  const { ctx } = g;
  const breath = reduced ? 0.6 : 0.5 + 0.5 * Math.sin((now / BREATH_MS) * Math.PI * 2 + def.index * 1.3);
  const lift = pressed ? 1 : breath;
  const path = getPaths().region[t.id];
  const r = ringRadius(t.id);
  ctx.save();
  const halo = ctx.createRadialGradient(def.x, def.y, r * 0.6, def.x, def.y, r + 22);
  halo.addColorStop(0, `rgba(255,236,190,${0.22 + 0.14 * lift})`);
  halo.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(def.x, def.y, r + 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,228,170,${0.1 + 0.08 * lift})`;
  ctx.fill(path);
  ctx.clip(path);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(255,236,190,${0.35 + 0.3 * lift})`;
  ctx.lineWidth = 6;
  ctx.stroke(path);
  ctx.strokeStyle = `rgba(255,250,235,${0.8 + 0.2 * lift})`;
  ctx.lineWidth = 2.2;
  ctx.stroke(path);
  ctx.restore();
  return breath;
}

export interface MarksTiming {
  now: number;
  reduced: boolean;
  /** Marks fading in with a new card, 0..1. */
  arrive: number;
}

export function paintMarks(g: Gfx, view: MapView, t: MarksTiming): void {
  const { ctx } = g;
  const a = easeInOut(t.arrive);
  paintFlag(g, view.home);
  const brights = new Map<RegionId, number>();
  ctx.save();
  ctx.globalAlpha = a;
  for (const target of view.targets) brights.set(target.id, paintTarget(g, target, t.now, t.reduced, view.pressed === target.id));
  if (view.ring) paintRing(g, view.ring);
  ctx.restore();
  const items: Array<{ id: RegionId; text: string; target: boolean }> = [];
  for (const target of view.targets) items.push({ id: target.id, text: target.label, target: true });
  if (view.ring && !view.targets.some((x) => x.id === view.ring)) items.push({ id: view.ring, text: REGION[view.ring]?.name.toUpperCase() ?? '', target: false });
  const labels = placeLabels(items, (s) => textWidth(ctx, s, LABEL_FONT, LABEL_TRACK));
  for (const l of labels) paintLabel(ctx, l, a, brights.get(l.id) ?? 0);
}
