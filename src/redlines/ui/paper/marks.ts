/**
 * The marks: what the hand puts on the printed sheet for a view, as keyed items per layer, and the
 * keyed layer that diffs them into the SVG. A mark's markup depends only on its key, so an
 * unchanged mark is never redrawn; a new one enters (a ring draws, a pin drops, the stamp slams),
 * a gone one leaves. Pure except for `Layer`.
 */
import type { MapWords, PaperView, PieceKind, RegionId } from './contract';
import { rnd, seedOf } from './rand';
import type { SheetGeom } from './sheet';
import { counterGlyph, greaseRing, pencilArrow, pencilLine, pushpin, type P } from './strokes';

export type Enter = 'draw' | 'fade' | 'drop' | 'slam' | 'none';

export interface Item {
  key: string;
  /** One element (a <g>). */
  html: string;
  enter: Enter;
  /** Applied on every update to an existing node too (position, lifted). */
  patch?: (el: SVGGElement) => void;
}

export interface MarkSet {
  press: Item[];
  fight: Item[];
  hold: Item[];
  head: Item[];
  piece: Item[];
  prom: Item[];
  test: Item[];
  hw: Item[];
  stamp: Item[];
  /** Printed names set in red: the places fighting. */
  redNames: Set<RegionId>;
}

const f1 = (n: number) => n.toFixed(1);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** How big a grease ring round a region is (frame px): the plate's extent, held within what a hand draws. */
export function ringSize(geom: SheetGeom, id: RegionId): { rx: number; ry: number } {
  if (geom.island[id]) return { rx: 25, ry: 26 };
  const b = geom.bounds[id];
  const hw = (b.x1 - b.x0) / 2;
  const hh = (b.y1 - b.y0) / 2;
  return { rx: clamp(hw + 2, 22, 38), ry: clamp(hh * 0.92, 20, 38) };
}

/** The sheet's foot (frame px): a word written lower than this lands on the desk, under the note. */
export const SHEET_FOOT = 494;

/** Where WE DEFEND goes: under the ring; over it for an island whose name is under it, and for the bottom row, where under would be off the sheet. */
export function defendPos(geom: SheetGeom, id: RegionId): { x: number; y: number; rot: number } {
  const [cx, cy] = geom.centre[id];
  const { ry } = ringSize(geom, id);
  const g = rnd('defend' + id);
  const rot = -(3 + g.random() * 3);
  const under = cy + ry + 17;
  if ((geom.island[id] && geom.label[id][1] > cy) || under > SHEET_FOOT) return { x: cx + 4, y: cy - ry - 5, rot };
  return { x: cx + 4, y: under, rot };
}

/** Where TESTED goes: under the name on land, across the island at sea. */
export function testedPos(geom: SheetGeom, id: RegionId): { x: number; y: number } {
  const [cx, cy] = geom.centre[id];
  const [lx, ly] = geom.label[id];
  return geom.island[id] ? { x: cx + 2, y: cy + 5 } : { x: lx + 2, y: ly + 21 };
}

/** The pushpin on the place their forces are leaving, nudged toward where they are heading. */
export function pinPos(geom: SheetGeom, from: RegionId, to: RegionId): P {
  const [fx, fy] = geom.centre[from];
  const [tx, ty] = geom.centre[to];
  const len = Math.hypot(tx - fx, ty - fy) || 1;
  const k = geom.island[from] ? 11 : 20;
  return [fx + ((tx - fx) / len) * k, fy + ((ty - fy) / len) * k];
}

/** The counter's place beside a region, the second counter under the first. */
export function piecePos(geom: SheetGeom, at: RegionId, slot: number): P {
  const [cx, cy] = geom.centre[at];
  const dx = geom.island[at] ? 24 : 26;
  const dy = geom.island[at] ? 7 : 9;
  return [cx + dx, cy + dy + slot * 16];
}

function dashFor(rx: number, ry: number, turns: number): string {
  const len = Math.PI * (rx + ry) * turns;
  return `${(9 / len).toFixed(4)} ${(6 / len).toFixed(4)}`;
}

/** The marks for a view. `p` is the id prefix of the sheet's defs. */
export function marksOf(view: PaperView, geom: SheetGeom, words: MapWords, p: string): MarkSet {
  const m: MarkSet = { press: [], fight: [], hold: [], head: [], piece: [], prom: [], test: [], hw: [], stamp: [], redNames: new Set() };
  const known = (id: RegionId) => id in geom.shape;

  for (const [id, state] of Object.entries(view.states)) {
    if (!known(id)) continue;
    const d = geom.shape[id];
    if (state === 'pressed') {
      m.press.push({
        key: `press:${id}`,
        enter: 'fade',
        html: `<g class="pp-mk"><path d="${d}" fill="url(#${p}-hatch)" fill-opacity="0.95"/><path d="${d}" fill="none" stroke="#b5261b" stroke-width="1.1" stroke-opacity="0.55"/></g>`,
      });
    } else if (state === 'fighting') {
      m.fight.push({
        key: `fight:${id}`,
        enter: 'fade',
        html: `<g class="pp-mk"><path d="${d}" fill="#b3261e" fill-opacity="0.5" filter="url(#${p}-wash)"/><path d="${d}" fill="none" stroke="#8e1a12" stroke-width="1.4" stroke-opacity="0.7"/></g>`,
      });
      m.redNames.add(id);
      const [cx, cy] = geom.centre[id];
      const [lx, ly] = geom.label[id];
      const sx = geom.island[id] ? cx : lx;
      const sy = geom.island[id] ? cy + 1 : ly + 13;
      m.stamp.push({
        key: `stamp:${id}`,
        enter: 'slam',
        html:
          `<g class="pp-mk" transform="translate(${f1(sx)} ${f1(sy)}) rotate(-12)" filter="url(#${p}-ink)" opacity="0.9"><g class="pp-slam">` +
          `<rect x="-26" y="-7" width="52" height="14" fill="none" stroke="#a51d12" stroke-width="1.2"/>` +
          `<text class="pp-stamp-sm" x="0" y="3.6" text-anchor="middle">${esc(words.fighting)}</text></g></g>`,
      });
    }
  }

  if (view.pressed && known(view.pressed)) {
    const d = geom.shape[view.pressed];
    m.hold.push({
      key: `hold:${view.pressed}`,
      enter: 'none',
      html: `<g class="pp-mk pp-hold"><path d="${d}" fill="#2b2418" fill-opacity="0.09" stroke="#2b2418" stroke-width="2.2" stroke-opacity="0.5" stroke-linejoin="round"/></g>`,
    });
  }

  for (const h of view.headings) {
    if (!known(h.from) || !known(h.to) || h.from === h.to) continue;
    const [px, py] = pinPos(geom, h.from, h.to);
    const [tx, ty] = geom.centre[h.to];
    const len = Math.hypot(tx - px, ty - py) || 1;
    const ux = (tx - px) / len;
    const uy = (ty - py) / len;
    const stop = geom.island[h.to] ? 23 : 17;
    const start: P = [px + ux * 8, py + uy * 8];
    const end: P = [tx - ux * stop, ty - uy * stop];
    const g = rnd(`arrow:${h.from}:${h.to}`);
    const bend = (g.random() < 0.5 ? -1 : 1) * Math.min(14, len * 0.12);
    const mid: P = [(start[0] + end[0]) / 2 - uy * bend, (start[1] + end[1]) / 2 + ux * bend];
    const { d, head } = pencilArrow([start, mid, end], seedOf(h.from + h.to));
    m.head.push({
      key: `arrow:${h.from}:${h.to}`,
      enter: 'draw',
      html:
        `<g class="pp-mk" fill="none" stroke="#2f2a24" stroke-width="1.7" stroke-opacity="0.85" stroke-linecap="round" stroke-linejoin="round" filter="url(#${p}-rough)">` +
        `<path class="pp-arrow" pathLength="1" d="${d}"/><path class="pp-arrow pp-arrow-head" pathLength="1" d="${head}"/>` +
        `<path class="pp-arrow" pathLength="1" d="${d}" stroke-width="0.6" stroke-opacity="0.5" transform="translate(0.9 0.7)"/></g>`,
    });
  }
  for (const h of view.headings) {
    if (!known(h.from) || !known(h.to) || h.from === h.to) continue;
    const [px, py] = pinPos(geom, h.from, h.to);
    m.head.push({ key: `pin:${h.from}:${h.to}`, enter: 'drop', html: `<g class="pp-mk">${pushpin(px, py, p)}</g>` });
  }

  const slots: Record<RegionId, number> = {};
  for (const piece of view.pieces) {
    if (!known(piece.at)) continue;
    const slot = slots[piece.at] ?? 0;
    slots[piece.at] = slot + 1;
    const [x, y] = piecePos(geom, piece.at, slot);
    const lifted = view.lifted === piece.kind;
    const label = piece.kind === 'fleet' ? words.fleet : words.brigade;
    m.piece.push({
      key: `piece:${piece.kind}`,
      enter: 'fade',
      html:
        `<g class="pp-mk pp-piece" data-kind="${piece.kind}"><g class="pp-chit" transform="rotate(-9)">${counterGlyph(piece.kind, p)}</g>` +
        (label ? `<text class="pp-ct" y="15" text-anchor="middle">${esc(label)}</text>` : '') +
        `</g>`,
      patch: (el) => {
        el.style.transform = `translate(${f1(x)}px, ${f1(y)}px)`;
        el.classList.toggle('pp-lift', lifted);
        el.setAttribute('data-at', piece.at);
      },
    });
  }

  for (const pr of view.promises) {
    if (!known(pr.region)) continue;
    const [cx, cy] = geom.centre[pr.region];
    const { rx, ry } = ringSize(geom, pr.region);
    const g = rnd('ring' + pr.region);
    const turns = 1.08 + g.random() * 0.08;
    const start = -1.6 + g.random() * 1.2;
    const d = greaseRing(cx, cy, rx, ry, seedOf('ring' + pr.region), turns, start);
    m.prom.push({
      key: `prom:${pr.region}:${pr.solid ? 's' : 'd'}`,
      enter: pr.solid ? 'draw' : 'fade',
      html: pr.solid
        ? `<g class="pp-mk"><path class="pp-ring pp-solid" pathLength="1" d="${d}"/></g>`
        : `<g class="pp-mk"><path class="pp-ring pp-dashed" pathLength="1" stroke-dasharray="${dashFor(rx, ry, turns)}" d="${d}"/></g>`,
    });
    const t = defendPos(geom, pr.region);
    m.hw.push({
      key: `hw:defend:${pr.region}`,
      enter: 'fade',
      html: `<g class="pp-mk"><text class="pp-hw" transform="translate(${f1(t.x)} ${f1(t.y)}) rotate(${t.rot.toFixed(1)})" text-anchor="middle">${esc(words.defend)}</text></g>`,
    });
  }

  if (view.tested && known(view.tested)) {
    const id = view.tested;
    const [cx, cy] = geom.centre[id];
    const { rx, ry } = ringSize(geom, id);
    const d = greaseRing(cx, cy, rx + 5, ry + 5, seedOf('test' + id), 1.55, 0.6, 1.2);
    const [lx, ly] = geom.label[id];
    const half = geom.nameHalf[id];
    m.test.push({
      key: `test:${id}`,
      enter: 'draw',
      html:
        `<g class="pp-mk"><path class="pp-ring pp-solid" pathLength="1" d="${d}"/>` +
        `<path class="pp-under" pathLength="1" d="${pencilLine(lx - half, ly + 2.6, lx + half, ly + 3.4, seedOf('u1' + id), 0.5)}" stroke-width="1.5"/>` +
        `<path class="pp-under" pathLength="1" d="${pencilLine(lx - half + 1, ly + 4.4, lx + half - 2, ly + 5.2, seedOf('u2' + id), 0.5)}" stroke-width="1.1" stroke-opacity="0.6"/></g>`,
    });
    const t = testedPos(geom, id);
    m.hw.push({
      key: `hw:tested:${id}`,
      enter: 'fade',
      html:
        `<g class="pp-mk"><text class="pp-hw pp-hwred" transform="translate(${f1(t.x)} ${f1(t.y)}) rotate(-3)" text-anchor="middle">${esc(words.tested)}</text>` +
        `<path d="${pencilLine(t.x - 16, t.y + 3.2, t.x + 17, t.y + 2.2, seedOf('u3' + id), 0.6)}" fill="none" stroke="#c0271a" stroke-width="1.6" stroke-opacity="0.85" stroke-linecap="round" filter="url(#${p}-rough)"/></g>`,
    });
  }

  return m;
}

/** How long the longest entrance takes (the ring's draw), so update() can promise it is over. */
export const SETTLE_MS = 650;
const LEAVE_MS = 240;
const ENTRANCES = ['pp-in', 'pp-in-draw', 'pp-in-fade', 'pp-in-drop', 'pp-in-slam'];

/**
 * A keyed layer: nodes live as long as their key is in the list, in the list's order. A node that is
 * already in place is never moved (re-inserting a node restarts its CSS animations, and every mark
 * would blink on every beat); one is inserted only where the order has changed. The entrance classes
 * come off once the entrance has run, so a later move draws nothing.
 */
export class Layer {
  private nodes = new Map<string, SVGGElement>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private el: SVGGElement,
    private scratch: SVGGElement,
  ) {}

  /** Returns true when a new mark was put down with an entrance. */
  set(items: Item[], animate: boolean): boolean {
    const keep = new Set(items.map((i) => i.key));
    for (const [key, node] of this.nodes) {
      if (keep.has(key)) continue;
      this.nodes.delete(key);
      if (animate) {
        node.classList.remove(...ENTRANCES);
        node.classList.add('pp-out');
        this.later(() => node.remove(), LEAVE_MS);
      } else node.remove();
    }
    let animated = false;
    let prev: Element | null = null;
    for (const it of items) {
      let node = this.nodes.get(it.key);
      if (!node) {
        this.scratch.innerHTML = it.html;
        node = this.scratch.firstElementChild as SVGGElement;
        node.setAttribute('data-key', it.key);
        if (animate && it.enter !== 'none') {
          const fresh = node;
          fresh.classList.add('pp-in', `pp-in-${it.enter}`);
          this.later(() => fresh.classList.remove(...ENTRANCES), SETTLE_MS + 50);
          animated = true;
        }
        this.nodes.set(it.key, node);
      }
      it.patch?.(node);
      // In order after the previous kept node (the leaving nodes, still fading, may sit between).
      if (node.parentNode !== this.el || (prev ? node.previousElementSibling !== prev && !onlyLeavingBetween(prev, node) : false)) {
        this.el.insertBefore(node, prev ? prev.nextSibling : this.el.firstChild);
      }
      prev = node;
    }
    return animated;
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const node of this.nodes.values()) node.remove();
    this.nodes.clear();
  }
}

/** True when every element between `a` and `b` (siblings, a before b) is a leaving mark. */
function onlyLeavingBetween(a: Element, b: Element): boolean {
  let n = a.nextElementSibling;
  while (n && n !== b) {
    if (!n.classList.contains('pp-out')) return false;
    n = n.nextElementSibling;
  }
  return n === b;
}

export type { PieceKind };
