/**
 * What is drawn over the land, every frame: the home flag on the capital, today's thin white ring
 * with the region's name under it (and the news the card brought, 'NOW TENSE'), and on a map day
 * the glowing places with their one-line labels. Nothing else: no numbers, no pins, no threads.
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
/** Labels keep this far from the map's edges. */
const EDGE = 8;

export interface Label {
  id: RegionId;
  text: string;
  x: number;
  y: number;
  w: number;
  /** A tap target's label (glows with it) rather than the ring's name. */
  target: boolean;
  /** Placed away from its natural slot under or over the ring: a thin leader joins it to its region. */
  displaced: boolean;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function overlaps(a: Box, b: Box): boolean {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
}

/** Half the gap kept between label boxes (6 px in all), so two labels never read as one. */
const GAP = 3;

function box(l: { x: number; y: number; w: number }): Box {
  return { x0: l.x - l.w / 2 - GAP, y0: l.y - LABEL_H / 2 - GAP, x1: l.x + l.w / 2 + GAP, y1: l.y + LABEL_H / 2 + GAP };
}

/** The flag's footprint on the capital, which no label may cover. */
export function flagBox(id: RegionId): Box | null {
  const def = REGION[id];
  if (!def) return null;
  return { x0: def.x - 4, y0: def.y - 12, x1: def.x + 12, y1: def.y + 9 };
}

/**
 * Where the labels sit. The ring's name goes under the ring (above it near the bottom edge); a
 * target's label goes on the side of its region away from the map's centre, so the labels of
 * neighbouring targets spread out instead of stacking over one another. Every label stays on the
 * map, clear of the others (a 6 px gap) and of the boxes to `avoid` (the flag): one that would
 * cover something slides to the side of its region, then steps to the next row, and a label that
 * had to leave its natural slot is marked `displaced` so a leader can join it to its region (three
 * targets on one landmass no longer stack in an anonymous column). `measure` gives a label's text
 * width; pure otherwise, so there is a test.
 */
export function placeLabels(items: Array<{ id: RegionId; text: string; target: boolean }>, measure: (s: string) => number, avoid: readonly Box[] = []): Label[] {
  const out: Label[] = [];
  for (const it of items) {
    const def = REGION[it.id];
    if (!def) continue;
    const w = Math.min(W - 2 * EDGE, measure(it.text) + LABEL_PAD * 2);
    const r = ringRadius(it.id);
    const clampX = (x: number) => Math.min(W - w / 2 - EDGE, Math.max(w / 2 + EDGE, x));
    const x = clampX(def.x);
    const below = def.y + r + 4 + LABEL_H / 2;
    const above = def.y - r - 4 - LABEL_H / 2;
    const outward = it.target && def.y < H / 2;
    const first = outward ? [above, below] : [below, above];
    const rows = [first[0], first[1], first[0] + (first[0] === below ? 1 : -1) * (LABEL_H + 3), first[1] + (first[1] === below ? 1 : -1) * (LABEL_H + 3)];
    // The natural slots first (under or over, centred), then slid to either side, then the next rows.
    const shift = w / 2 + 10;
    const slots: Array<{ x: number; y: number; natural: boolean }> = [
      { x, y: rows[0], natural: true },
      { x, y: rows[1], natural: true },
      ...[rows[0], rows[1]].flatMap((y) => [clampX(def.x - shift), clampX(def.x + shift)].map((sx) => ({ x: sx, y, natural: false }))),
      { x, y: rows[2], natural: false },
      { x, y: rows[3], natural: false },
      ...[rows[2], rows[3]].flatMap((y) => [clampX(def.x - shift), clampX(def.x + shift)].map((sx) => ({ x: sx, y, natural: false }))),
    ];
    let placed: Label | null = null;
    for (const slot of slots) {
      if (slot.y - LABEL_H / 2 < EDGE || slot.y + LABEL_H / 2 > H - EDGE) continue;
      const cand: Label = { id: it.id, text: it.text, x: slot.x, y: slot.y, w, target: it.target, displaced: !slot.natural };
      const b = box(cand);
      if (!out.some((o) => overlaps(box(o), b)) && !avoid.some((a) => overlaps(a, b))) {
        placed = cand;
        break;
      }
    }
    if (!placed) {
      const y = Math.min(H - EDGE - LABEL_H / 2, Math.max(EDGE + LABEL_H / 2, rows[0]));
      placed = { id: it.id, text: it.text, x, y, w, target: it.target, displaced: true };
    }
    out.push(placed);
  }
  return out;
}

/** A thin line from a displaced label's nearest edge to the edge of its region's ring, so the watcher knows whose it is. */
function paintLeader(ctx: Ctx, l: Label, alpha: number): void {
  const def = REGION[l.id];
  if (!def) return;
  const r = ringRadius(l.id);
  // From the label box, the point nearest the region; towards the region, stopping at the ring.
  const bx = Math.min(l.x + l.w / 2, Math.max(l.x - l.w / 2, def.x));
  const by = Math.min(l.y + LABEL_H / 2, Math.max(l.y - LABEL_H / 2, def.y));
  const dx = def.x - bx;
  const dy = def.y - by;
  const d = Math.hypot(dx, dy);
  if (d <= r + 3) return;
  const ex = def.x - (dx / d) * (r + 1);
  const ey = def.y - (dy / d) * (r + 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(6,10,18,0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = css(RING_WHITE, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.restore();
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

/** The small flag on the home capital: a short pole and a filled pennant, white, with a dark halo so it reads on any heat. */
function paintFlag(g: Gfx, id: RegionId): void {
  const def = REGION[id];
  if (!def) return;
  const { ctx } = g;
  const x = def.x - 2;
  const y = def.y + 7;
  const pennant = () => {
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 11, y - 10.5);
    ctx.lineTo(x, y - 7);
    ctx.closePath();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(6,10,18,0.75)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 14);
  ctx.stroke();
  pennant();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = css(RING_WHITE);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 14);
  ctx.stroke();
  pennant();
  ctx.fillStyle = css(RING_WHITE);
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

/** A thin dark seam on every glowing plate's edge, so two neighbouring targets never fuse into one. */
function paintSeams(g: Gfx, targets: readonly Target[]): void {
  const { ctx } = g;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(6,10,18,0.7)';
  ctx.lineWidth = 1;
  for (const t of targets) {
    const path = getPaths().region[t.id];
    if (path) ctx.stroke(path);
  }
  ctx.restore();
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
  if (view.targets.length > 1) paintSeams(g, view.targets);
  if (view.ring) paintRing(g, view.ring);
  ctx.restore();
  const items: Array<{ id: RegionId; text: string; target: boolean }> = [];
  for (const target of view.targets) items.push({ id: target.id, text: target.label, target: true });
  if (view.ring && !view.targets.some((x) => x.id === view.ring)) {
    const name = REGION[view.ring]?.name.toUpperCase() ?? '';
    items.push({ id: view.ring, text: view.ringNote ? `${name} · ${view.ringNote}` : name, target: false });
  }
  const flag = flagBox(view.home);
  const labels = placeLabels(items, (s) => textWidth(ctx, s, LABEL_FONT, LABEL_TRACK), flag ? [flag] : []);
  for (const l of labels) if (l.displaced) paintLeader(ctx, l, a);
  for (const l of labels) paintLabel(ctx, l, a, brights.get(l.id) ?? 0);
}
