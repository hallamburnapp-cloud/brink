/**
 * The crisis ring (SPEC 8): white #F4F1E8, 2.5 pt, an amber outer glow and a 1.6 s pulse, sized to
 * its region. On top of the ring sits one dark chip: the target ("1,100", 13 pt) and, joined to it,
 * the ×2 that lights amber when the crisis is pinned (and stamps when the send doubles). On a win
 * the ring collapses into its region.
 */
import type { RegionId } from '../contract';
import { MAP_H as H, MAP_W as W, REGION, REGIONS } from '../data';
import { easeBack, easeIn, easeOut, FONT_MONO, glowStroke, lerp, roundRect, text, textWidth, type Gfx } from '../draw';
import { AMBER, css, hex, RING_WHITE } from '../palette';
import type { RingVis } from '../scene';

const ringRadii = new Map<RegionId, number>();

/**
 * The ring's radius for a region: it marks that one region, so it hugs its pin. Islands ring their
 * 24 pt disc; on the mainland it reaches half way to the nearest other pin (22 to 32 pt), and it
 * always stays on the map, clear of the bearing strip.
 */
export function ringRadius(id: RegionId): number {
  let r = ringRadii.get(id);
  if (r === undefined) {
    const def = REGION[id];
    let nearest = Infinity;
    for (const o of REGIONS) if (o.id !== id) nearest = Math.min(nearest, Math.hypot(o.x - def.x, o.y - def.y));
    r = def.island ? 27 : Math.min(32, Math.max(22, nearest / 2));
    r = Math.min(r, def.x - 4, W - def.x - 4, def.y - 8, H - def.y - 4);
    ringRadii.set(id, r);
  }
  return r;
}

const RING_PULSE_MS = 1600;
const TARGET_FONT = `800 13px ${FONT_MONO}`;
const DOUBLE_FONT = `800 10.5px ${FONT_MONO}`;
export const BADGE_H = 19;
/** The ×2 segment's width, joined to the right of the target. */
const DOUBLE_W = 24;
/** The widest badge the layout allows for ("1,600,000" plus the ×2). */
export const BADGE_MAX_W = 104;
/** Where a win-preview number sits relative to a region's pin (the crisis's too, inside its ring). */
export const WIN_CHIP_AT = { dx: 11, dy: -14 };
/** The win-preview chip's half size. */
export const WIN_CHIP_HALF = 7;
const AMBER_INK = hex('#241606');

export interface RingLayout {
  x: number;
  y: number;
  r: number;
  /** Centre of the target-and-×2 chip: on top of the ring (under it near the map's top edge). */
  badge: { x: number; y: number };
}

/** Where the ring and its chip sit for a crisis on this region. */
export function ringLayout(id: RegionId): RingLayout {
  const { x, y } = REGION[id];
  const r = ringRadius(id);
  // The chip rides the top of the ring, high enough to clear the win number above the pin.
  const above = Math.min(y - r - 5.5, y + WIN_CHIP_AT.dy - WIN_CHIP_HALF - BADGE_H / 2 - 1);
  const by = above - BADGE_H / 2 >= 13 ? above : y + Math.max(r + 5.5, 31.5);
  const half = BADGE_MAX_W / 2;
  return { x, y, r, badge: { x: Math.min(W - half - 2, Math.max(half + 2, x)), y: by } };
}

/** The ring's breath, 0..1, at time `now` (1.6 s). */
function ringBreath(now: number, reduced: boolean): number {
  return reduced ? 0.5 : 0.5 + 0.5 * Math.sin((now / RING_PULSE_MS) * Math.PI * 2);
}

export function paintRing(g: Gfx, ring: RingVis, now: number, reduced: boolean, fade: number): void {
  const c = ring.collapse ?? 0;
  if (c >= 1 || fade <= 0) return;
  const { ctx } = g;
  const L = ringLayout(ring.id);
  const breath = ringBreath(now, reduced);
  // Collapsing: the ring closes in on the pin, burning brighter as it goes.
  const rad = Math.max(0.5, L.r * (1 - easeIn(c)) + (c > 0 ? 0 : 0.8 * breath));
  const chip = fade * (1 - Math.min(1, c / 0.35));

  ctx.save();
  ctx.globalAlpha = fade;
  // A faint wash inside the ring: the crisis region is the one that changes.
  const wash = ctx.createRadialGradient(L.x, L.y, rad * 0.35, L.x, L.y, rad);
  wash.addColorStop(0, css(RING_WHITE, 0));
  wash.addColorStop(1, css(RING_WHITE, 0.07 + 0.05 * breath + 0.2 * c));
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.arc(L.x, L.y, rad, 0, Math.PI * 2);
  ctx.fill();

  const circle = () => {
    ctx.beginPath();
    ctx.arc(L.x, L.y, rad, 0, Math.PI * 2);
    ctx.stroke();
  };
  // The amber glow sits outside the ring only.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(L.x, L.y, rad, 0, Math.PI * 2, true);
  ctx.clip('evenodd');
  glowStroke(ctx, circle, (a) => css(AMBER, Math.min(1, a * (1.5 + 1.2 * breath + 2 * c))), 2.5, 3.2 + 1.6 * breath);
  ctx.restore();
  // A dark keyline under the white, so the ring reads on gold as well as on the dark table.
  ctx.strokeStyle = 'rgba(8,11,15,0.55)';
  ctx.lineWidth = 4.2;
  circle();
  ctx.strokeStyle = css(RING_WHITE);
  ctx.lineWidth = 2.5;
  circle();
  ctx.restore();

  if (chip > 0) paintBadge(g, L, ring, chip, reduced);
}

/** The target on a dark chip, with the ×2 joined on its right: dim until the crisis is pinned, then amber. */
function paintBadge(g: Gfx, L: RingLayout, ring: RingVis, alpha: number, reduced: boolean): void {
  const { ctx } = g;
  const tw = Math.ceil(textWidth(ctx, ring.target, TARGET_FONT)) + 14;
  const w = tw + DOUBLE_W;
  const x = L.badge.x - w / 2;
  const y = L.badge.y - BADGE_H / 2;
  const on = ring.doubled;
  const dx = x + tw + DOUBLE_W / 2;
  const stamp = ring.stamp;
  const s = stamp === null || reduced ? 1 : lerp(1.7, 1, easeBack(Math.min(1, stamp / 0.7)));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3 * g.k;
  ctx.shadowOffsetY = 1 * g.k;
  ctx.fillStyle = 'rgba(8,11,15,0.95)';
  roundRect(ctx, x, y, w, BADGE_H, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = css(RING_WHITE, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  // The ×2 segment.
  ctx.save();
  ctx.translate(dx, L.badge.y);
  ctx.scale(s, s);
  const seg = () => roundRect(ctx, -DOUBLE_W / 2 + 1.5, -BADGE_H / 2 + 1.5, DOUBLE_W - 3, BADGE_H - 3, 3);
  if (on) {
    glowStroke(ctx, () => {
      seg();
      ctx.stroke();
    }, (a) => css(AMBER, a * 1.4), 1, 3);
    ctx.fillStyle = css(AMBER);
  } else {
    ctx.fillStyle = css(AMBER, 0.12);
  }
  seg();
  ctx.fill();
  ctx.restore();
  ctx.restore();

  text(ctx, ring.target, x + tw / 2, L.badge.y + 0.5, { font: TARGET_FONT, color: css(RING_WHITE, alpha) });
  ctx.save();
  ctx.translate(dx, L.badge.y + 0.5);
  ctx.scale(s, s);
  text(ctx, '×2', 0, 0, { font: DOUBLE_FONT, color: on ? css(AMBER_INK, alpha) : css(AMBER, 0.75 * alpha) });
  ctx.restore();
  // The stamp: a white flash ring leaves the ×2.
  if (stamp !== null && !reduced) {
    const p = easeOut(stamp);
    ctx.save();
    ctx.strokeStyle = `rgba(255,250,240,${0.9 * (1 - stamp) * alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(dx, L.badge.y, 10 + 18 * p, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
