/**
 * What a send would do, drawn under the markers on every tap (SPEC 8, "While choosing"): dashed
 * gold outlines on the regions it would win (gold stripes over red where war's region would be won
 * back), red hatching on the crisis for a MISS; the red dashed outline on the region war takes
 * next; and the long-press or intro highlight.
 */
import type { RegionId } from '../contract';
import { REGION } from '../data';
import { css, GOLD, GOLD_RIM, HATCH_STEP, INK, LINEN, WAR, WAR_TEXT } from '../palette';
import { getPaths } from '../paths';
import type { Gfx } from '../draw';
import type { Scene } from '../scene';
import { hatch } from './land';

function regionFill(g: Gfx, id: RegionId, color: string): void {
  g.ctx.fillStyle = color;
  g.ctx.fill(getPaths().region[id]);
}

/** A dashed outline kept inside the plate, over a dark keyline so it reads on any fill. */
function dashedOutline(g: Gfx, id: RegionId, color: string, width: number, dash: [number, number], offset: number): void {
  const { ctx } = g;
  const path = getPaths().region[id];
  ctx.save();
  ctx.clip(path);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8,11,15,0.6)';
  ctx.lineWidth = width * 2 + 3;
  ctx.stroke(path);
  ctx.setLineDash(dash);
  ctx.lineDashOffset = offset;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 2;
  ctx.stroke(path);
  ctx.restore();
}

/** Dashes march slowly round a preview outline (still under reduced motion). */
function march(s: Scene): number {
  return s.reduced ? 0 : -s.now / 110;
}

export function paintPreviews(g: Gfx, s: Scene): void {
  for (const r of s.list) {
    const pv = r.preview;
    if (!pv) continue;
    if (pv.kind === 'win') {
      // War's region won back: gold stripes between the red hatching.
      if (r.owner === 'red') hatch(g, r.id, css(GOLD, 0.9), 2.2, HATCH_STEP, HATCH_STEP / 2);
      else regionFill(g, r.id, css(GOLD_RIM, 0.1));
      dashedOutline(g, r.id, css(GOLD), 1.6, [6, 4], march(s));
    } else {
      // MISS: the crisis will turn red.
      regionFill(g, r.id, css(WAR, 0.16));
      hatch(g, r.id, css(WAR, 0.85), 2);
      dashedOutline(g, r.id, css(WAR_TEXT), 1.2, [5, 4], march(s));
    }
  }
}

/** The region war will take next by itself: a red dashed outline (its tag sits with the markers). */
export function paintWarNext(g: Gfx, s: Scene): void {
  const w = s.warNext;
  if (!w) return;
  const r = s.regions[w.id];
  // A win preview on the same region says more (the send would take it first).
  if (r.preview?.kind === 'win') return;
  const urgent = w.turns <= 1;
  const beat = urgent && !s.reduced ? 0.5 + 0.5 * Math.sin((s.now / 900) * Math.PI * 2) : 0.5;
  regionFill(g, w.id, css(WAR, (urgent ? 0.1 + 0.08 * beat : 0.07) * r.dimNow));
  dashedOutline(g, w.id, css(WAR_TEXT, (0.75 + 0.25 * beat) * Math.max(0.5, r.dimNow)), 1.1, [5, 4], 0);
}

/**
 * A long-press highlight (the ports, capitals or gold a shop card acts on) or the intro's emphasis:
 * the rest of the table recedes a little and each highlighted region breathes (a soft light on its
 * plate and a turning ring round its pin, plus an edge when there are only a few). `nearMiss`: the
 * WAR card points at the free regions that were left, over lights out: each is outlined in marching
 * gold (what it would have taken), and nothing else recedes (lights out has already dimmed it).
 */
export function paintHighlight(g: Gfx, s: Scene, fadeIn: number, nearMiss = false): void {
  const valid = s.highlight;
  if (!valid) return;
  const { ctx } = g;
  if (nearMiss) {
    for (const id of valid) {
      if (!REGION[id]) continue;
      regionFill(g, id, css(GOLD_RIM, 0.12 * fadeIn));
      dashedOutline(g, id, css(GOLD, fadeIn), 1.8, [6, 4], march(s));
    }
    return;
  }
  const breath = s.reduced ? 0.6 : 0.5 + 0.5 * Math.sin((s.now / 1200) * Math.PI * 2);
  for (const r of s.list) if (!valid.has(r.id)) regionFill(g, r.id, css(INK, 0.3 * fadeIn));
  // An edge marks a few regions well; on many it would turn the borders into a wireframe.
  const edges = valid.size <= 8;
  for (const id of valid) {
    const def = REGION[id];
    if (!def) continue;
    regionFill(g, id, css(LINEN, (0.05 + 0.06 * breath) * fadeIn));
    if (edges) {
      const path = getPaths().region[id];
      ctx.save();
      ctx.clip(path);
      ctx.strokeStyle = css(LINEN, (0.5 + 0.35 * breath) * fadeIn);
      ctx.lineWidth = 3;
      ctx.stroke(path);
      ctx.restore();
    }
    ctx.save();
    if (edges) {
      const ring = (rad: number) => {
        ctx.beginPath();
        ctx.arc(def.x, def.y, rad, 0, Math.PI * 2);
        ctx.stroke();
      };
      ctx.strokeStyle = css(INK, 0.45 * fadeIn);
      ctx.lineWidth = 2.8;
      ring(17 + 1.5 * breath);
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = s.reduced ? 0 : -s.now / 60;
      ctx.strokeStyle = css(LINEN, (0.6 + 0.35 * breath) * fadeIn);
      ctx.lineWidth = 1.3;
      ring(17 + 1.5 * breath);
    } else {
      // Many regions: thirty rings alike would read as hit areas, so a soft light breathes instead.
      const core = ctx.createRadialGradient(def.x, def.y, 1, def.x, def.y, 16);
      core.addColorStop(0, css(LINEN, (0.22 + 0.18 * breath) * fadeIn));
      core.addColorStop(1, css(LINEN, 0));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(def.x, def.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
