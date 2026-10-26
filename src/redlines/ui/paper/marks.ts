/**
 * The marks: what the hand puts on the printed sheet for a view, as keyed items per layer, and the
 * keyed layer that diffs them into the SVG. A mark's markup depends only on its key, so an
 * unchanged mark is never redrawn; a new one enters (a ring draws, a pin drops, the stamp slams),
 * a gone one leaves. Pure except for `Layer`.
 *
 * Where a mark goes is chosen against the sheet (place.ts): a ring near the sheet's edge is pulled
 * in so it and its TESTED ring stay on the paper; WE DEFEND and TESTED take the clearest of a few
 * spots round the ring (never on a printed name, a bloc title, another island, a pin or a counter);
 * a counter sits beside its place where the name is not; a pin clears an offset name; an arrow to a
 * neighbour reaches the neighbour's rim; two adjacent islands' stamps are small and tilt apart.
 */
import type { MapWords, PaperView, PieceKind, RegionId } from './contract';
import type { Bounds } from './geometry';
import { around, orders, pickSpot, pickSpotCost, type Box, type Obstacle, type Spot } from './place';
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
/** The ring, its TESTED ring (5 px bigger) and the pencil's width must end this far inside the frame's sides. */
const RING_MARGIN = 14;
/** A ring is pulled in by at most this much; past it the ring is drawn smaller instead. */
const RING_PULL = 12;

export interface RingGeom {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** The ring round a region: its size, with its centre pulled in from the sheet's side where it would run off. */
export function ringGeom(geom: SheetGeom, id: RegionId): RingGeom {
  const [x, cy] = geom.centre[id];
  let { rx, ry } = ringSize(geom, id);
  let cx = x;
  const over = cx + rx + RING_MARGIN - 390;
  if (over > 0) {
    cx -= Math.min(over, RING_PULL);
    rx -= Math.max(0, over - RING_PULL);
  }
  const under = RING_MARGIN - (cx - rx);
  if (under > 0) {
    cx += Math.min(under, RING_PULL);
    rx -= Math.max(0, under - RING_PULL);
  }
  return { cx, cy, rx: Math.max(18, rx), ry };
}

/** The hand's word, as a box: Caveat at 12.5 px is about 6.4 px a letter. */
const HW_H = 12;
function hwWidth(word: string, size = 12.5): number {
  return word.length * size * 0.52 + 4;
}
/** The box of a word whose baseline is at (x, y), centred. */
function hwBox(x: number, y: number, w: number): Box {
  return { x0: x - w / 2, y0: y - HW_H + 1, x1: x + w / 2, y1: y + 2 };
}

/** The counter's box: the chit (15 x 13, rotated a little, bigger while lifted) and the tiny label under it. */
function pieceBox(x: number, y: number, labelled: boolean): Box {
  return { x0: x - 8, y0: y - 10, x1: x + 8, y1: labelled ? y + 17 : y + 6 };
}

const PIN_R = 5.2;
function pinBox(p: P): Box {
  return around(p[0], p[1] + 1, 2 * PIN_R + 2, 2 * PIN_R + 4);
}

/** The island discs' boxes, as the hand sees them (a word must not sit on another island). */
function islandBox(geom: SheetGeom, id: RegionId): Box {
  return geom.bounds[id];
}

/** The printed sheet's obstacles: every name, the bloc titles, the island discs (except `self`); for an island's own word, the mainland too (its word belongs in the sea). */
function printedObstacles(geom: SheetGeom, self: RegionId | null, offshore = false): Obstacle[] {
  const out: Obstacle[] = [];
  for (const id of Object.keys(geom.shape)) {
    if (id !== self) out.push({ box: geom.labelBox[id], weight: 3 });
    if (geom.island[id] && id !== self) out.push({ box: geom.bounds[id], weight: 1.2 });
    if (offshore && !geom.island[id]) out.push({ box: geom.bounds[id], weight: 0.8 });
  }
  // The Scatter's title is small and faint, printed in the water its islands crowd: a word may cross it before it crosses a name.
  geom.blocBoxes.forEach((b, i) => out.push({ box: b, weight: geom.blocSmall[i] ? 1.2 : 2.5 }));
  return out;
}

/** The sheet a word may be written on: the frame's sides, under the title, above the note. */
const WORD_FRAME: Box = { x0: 4, y0: 50, x1: 386, y1: SHEET_FOOT };

/** The spots a hand tries for a word round a ring, the first preferred: under, over, then off to a side of either, then beside. */
function wordSpots(r: RingGeom, w: number): Spot[] {
  const under = r.cy + r.ry + 17;
  const over = r.cy - r.ry - 7;
  const beside = r.rx + w / 2 + 4;
  return [
    { x: r.cx + 4, y: under, rank: 0 },
    { x: r.cx - 10, y: under, rank: 4 },
    { x: r.cx + 4, y: over, rank: 6 },
    { x: r.cx - 10, y: over, rank: 8 },
    { x: r.cx + 18, y: over, rank: 8 },
    { x: r.cx - 24, y: under - 2, rank: 10 },
    { x: r.cx + 30, y: under - 2, rank: 10 },
    { x: r.cx - 44, y: under - 2, rank: 12 },
    { x: r.cx + 48, y: under - 2, rank: 12 },
    { x: r.cx - 24, y: over + 1, rank: 14 },
    { x: r.cx + 30, y: over + 1, rank: 14 },
    { x: r.cx - 44, y: over + 1, rank: 16 },
    { x: r.cx + 48, y: over + 1, rank: 16 },
    { x: r.cx + beside, y: r.cy + 5, rank: 18 },
    { x: r.cx - beside, y: r.cy + 5, rank: 18 },
    { x: r.cx + beside, y: r.cy + 16, rank: 20 },
    { x: r.cx - beside, y: r.cy + 16, rank: 20 },
    { x: r.cx + beside, y: r.cy - 7, rank: 20 },
    { x: r.cx - beside, y: r.cy - 7, rank: 20 },
  ];
}

/** A word's spots kept inside the sheet's sides (a spot below the foot is judged, and loses, rather than pulled up onto the ring). */
function withinSides(spots: readonly Spot[], w: number): Spot[] {
  return spots.map((s) => ({ x: Math.max(WORD_FRAME.x0 + w / 2, Math.min(WORD_FRAME.x1 - w / 2, s.x)), y: s.y, rank: s.rank }));
}

/**
 * Where WE DEFEND goes: the clearest spot round the ring (under it first). `others` are the marks already
 * on the sheet (pins, counters, the other words). Returns the baseline point and a slight tilt.
 */
export function defendPos(geom: SheetGeom, id: RegionId, others: readonly Obstacle[] = [], word = 'WE DEFEND'): { x: number; y: number; rot: number } {
  return defendPosCost(geom, id, others, word).pos;
}

function defendPosCost(geom: SheetGeom, id: RegionId, others: readonly Obstacle[], word: string): { pos: { x: number; y: number; rot: number }; cost: number } {
  const r = ringGeom(geom, id);
  const g = rnd('defend' + id);
  const rot = -(3 + g.random() * 3);
  const w = hwWidth(word);
  const obstacles = [...printedObstacles(geom, id, geom.island[id]), { box: geom.labelBox[id], weight: 3 }, ...others];
  const { spot, cost } = pickSpotCost(withinSides(wordSpots(r, w), w), (s) => hwBox(s.x, s.y, w), obstacles, WORD_FRAME);
  return { pos: { x: spot.x, y: spot.y, rot }, cost };
}

/**
 * WE DEFEND for every promise at once: the words are placed in whichever order lets them all sit
 * clearest (two neighbouring islands' words would otherwise crowd each other by who came first).
 */
export function defendPositions(geom: SheetGeom, ids: readonly RegionId[], others: readonly Obstacle[], word: string): Map<RegionId, { x: number; y: number; rot: number }> {
  const w = hwWidth(word);
  let best: Map<RegionId, { x: number; y: number; rot: number }> | null = null;
  let bestCost = Infinity;
  for (const order of orders(ids)) {
    const placed: Obstacle[] = [...others];
    const out = new Map<RegionId, { x: number; y: number; rot: number }>();
    let total = 0;
    for (const id of order) {
      const ringBoxes = ids.filter((o) => o !== id).map((o) => ringGeom(geom, o)).map((rg) => ({ box: around(rg.cx, rg.cy, 2 * rg.rx, 2 * rg.ry), weight: 0.6 }));
      const { pos, cost } = defendPosCost(geom, id, [...placed, ...ringBoxes], word);
      out.set(id, pos);
      placed.push({ box: hwBox(pos.x, pos.y, w), weight: 3 });
      total += cost;
    }
    if (total < bestCost) {
      bestCost = total;
      best = out;
    }
  }
  return best ?? new Map();
}

/** Where TESTED goes: under the name on land, across the island at sea; elsewhere when that is taken. */
export function testedPos(geom: SheetGeom, id: RegionId, others: readonly Obstacle[] = [], word = 'TESTED'): { x: number; y: number } {
  const r = ringGeom(geom, id);
  const [lx, ly] = geom.label[id];
  const w = hwWidth(word, 13.5);
  const first: Spot[] = geom.island[id]
    ? [
        { x: r.cx + 2, y: r.cy + 5, rank: 0 },
        { x: r.cx + 2, y: ly > r.cy ? ly + 12 : ly - 11, rank: 8 },
      ]
    : [
        { x: lx + 2, y: ly + 21, rank: 0 },
        { x: lx + 2, y: ly - 12, rank: 8 },
      ];
  const spots = [...first, ...wordSpots(r, w).map((s) => ({ ...s, rank: s.rank + 10 }))];
  // Across the island there is no name to cover; on land the word must clear the printed names (its own too).
  const obstacles = [...printedObstacles(geom, geom.island[id] ? id : null, geom.island[id]), ...others];
  const best = pickSpot(withinSides(spots, w), (s) => hwBox(s.x, s.y, w), obstacles, WORD_FRAME);
  return { x: best.x, y: best.y };
}

/** How far from its place's centre the pushpin sits, toward where their forces are heading. */
const PIN_NUDGE = 10;
const PIN_NUDGE_ISLAND = 17;

/** The pushpin on the place their forces are leaving, nudged toward where they are heading and clear of an offset name. */
export function pinPos(geom: SheetGeom, from: RegionId, to: RegionId): P {
  const [fx, fy] = geom.centre[from];
  const [tx, ty] = geom.centre[to];
  const len = Math.hypot(tx - fx, ty - fy) || 1;
  const ux = (tx - fx) / len;
  const uy = (ty - fy) / len;
  const k = geom.island[from] ? PIN_NUDGE_ISLAND : PIN_NUDGE;
  const at = (d: number, side = 0): P => [fx + ux * d - uy * side, fy + uy * d + ux * side];
  // A name printed away from the pin (Northwake's is under it): the pin steps round it.
  const [lx, ly] = geom.label[from];
  const offset = Math.hypot(lx - fx, ly - fy) > 6;
  if (!offset) return at(k);
  const label: Obstacle[] = [{ box: geom.labelBox[from], weight: 1 }];
  const spots: Spot[] = [
    { x: 0, y: 0, rank: 0 },
    { x: 1, y: 0, rank: 1 },
    { x: 2, y: 0, rank: 2 },
    { x: 3, y: 0, rank: 3 },
    { x: 4, y: 0, rank: 4 },
  ];
  const tries: P[] = [at(k), at(k + 6), at(k, 12), at(k, -12), at(4)];
  const best = pickSpot(spots, (s) => pinBox(tries[s.x]), label);
  return tries[best.x];
}

/** The arrow from a pin to where their forces are heading: from the pin's rim to the destination's rim, never a stub. */
export function arrowEnds(geom: SheetGeom, from: RegionId, to: RegionId): { start: P; end: P } {
  const [px, py] = pinPos(geom, from, to);
  const [tx, ty] = geom.centre[to];
  const len = Math.hypot(tx - px, ty - py) || 1;
  const ux = (tx - px) / len;
  const uy = (ty - py) / len;
  const start: P = [px + ux * 8, py + uy * 8];
  const stop = geom.island[to] ? 20 : 17;
  let end: P = [tx - ux * stop, ty - uy * stop];
  const drawn = Math.hypot(end[0] - start[0], end[1] - start[1]);
  // A neighbour so close the arrow would vanish under its name: the stroke goes on to the coast anyway.
  if (drawn < 16) end = [start[0] + ux * 16, start[1] + uy * 16];
  return { start, end };
}

/** The counter's spots beside a region: right of the name, left of it, under the place, over it. */
export function piecePos(geom: SheetGeom, at: RegionId, slot: number, others: readonly Obstacle[] = [], labelled = true): P {
  const [cx, cy] = geom.centre[at];
  const isle = geom.island[at];
  const dx = isle ? 24 : 28;
  const dy = isle ? 7 : 9;
  const { ry } = ringSize(geom, at);
  const spots: Spot[] = [
    { x: cx + dx, y: cy + dy, rank: 0 },
    { x: cx + dx, y: cy - 10, rank: 4 },
    { x: cx - dx, y: cy + dy, rank: 6 },
    { x: cx - dx, y: cy - 10, rank: 8 },
    { x: cx, y: cy + (isle ? ry : Math.min(ry, 24)) + 1, rank: 10 },
    { x: cx, y: cy - (isle ? ry : Math.min(ry, 24)) - 9, rank: 14 },
  ];
  const obstacles = [...printedObstacles(geom, null), ...others];
  const best = pickSpot(spots, (s) => pieceBox(s.x, s.y + slot * 16, labelled), obstacles);
  return [best.x, best.y + slot * 16];
}

function dashFor(rx: number, ry: number, turns: number): string {
  const len = Math.PI * (rx + ry) * turns;
  return `${(9 / len).toFixed(4)} ${(6 / len).toFixed(4)}`;
}

/** The FIGHTING stamp on a place: on the name's line on land, across the island at sea (smaller, tilting either way so neighbours' stamps read apart). */
export function stampPos(geom: SheetGeom, id: RegionId): { x: number; y: number; rot: number; scale: number } {
  const [cx, cy] = geom.centre[id];
  const [lx, ly] = geom.label[id];
  if (!geom.island[id]) return { x: lx, y: ly + 13, rot: -12, scale: 1 };
  // Left islands tilt one way, right islands the other; the stamp is smaller than the island.
  const rot = cx < 200 ? -12 : 8;
  return { x: cx, y: cy + 1, rot, scale: 0.8 };
}

/** The marks for a view. `p` is the id prefix of the sheet's defs. */
export function marksOf(view: PaperView, geom: SheetGeom, words: MapWords, p: string): MarkSet {
  const m: MarkSet = { press: [], fight: [], hold: [], head: [], piece: [], prom: [], test: [], hw: [], stamp: [], redNames: new Set() };
  const known = (id: RegionId) => id in geom.shape;
  /** What the hand has put down so far this view, for the next mark to keep clear of. */
  const placed: Obstacle[] = [];

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
      const st = stampPos(geom, id);
      placed.push({ box: around(st.x, st.y, 52 * st.scale, 14 * st.scale), weight: 1.5 });
      m.stamp.push({
        key: `stamp:${id}`,
        enter: 'slam',
        html:
          `<g class="pp-mk" transform="translate(${f1(st.x)} ${f1(st.y)}) rotate(${st.rot}) scale(${st.scale})" filter="url(#${p}-ink)" opacity="0.9"><g class="pp-slam">` +
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

  const headings = view.headings.filter((h) => known(h.from) && known(h.to) && h.from !== h.to);
  for (const h of headings) {
    const { start, end } = arrowEnds(geom, h.from, h.to);
    const len = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1;
    const ux = (end[0] - start[0]) / len;
    const uy = (end[1] - start[1]) / len;
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
  for (const h of headings) {
    const pin = pinPos(geom, h.from, h.to);
    placed.push({ box: pinBox(pin), weight: 3 });
    m.head.push({ key: `pin:${h.from}:${h.to}`, enter: 'drop', html: `<g class="pp-mk">${pushpin(pin[0], pin[1], p)}</g>` });
  }

  const slots: Record<RegionId, number> = {};
  for (const piece of view.pieces) {
    if (!known(piece.at)) continue;
    const slot = slots[piece.at] ?? 0;
    slots[piece.at] = slot + 1;
    const label = piece.kind === 'fleet' ? words.fleet : words.brigade;
    const [x, y] = piecePos(geom, piece.at, slot, placed, !!label);
    placed.push({ box: pieceBox(x, y, !!label), weight: 3 });
    const lifted = view.lifted === piece.kind;
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

  // The rings themselves are obstacles for the words: a word is not written across another ring.
  const promised = view.promises.filter((pr) => known(pr.region));
  const rings = new Map(promised.map((pr) => [pr.region, ringGeom(geom, pr.region)]));
  const ringObstacles = (except: RegionId): Obstacle[] => [...rings.entries()].filter(([id]) => id !== except).map(([, r]) => ({ box: around(r.cx, r.cy, 2 * r.rx, 2 * r.ry), weight: 0.6 }));

  for (const pr of promised) {
    const r = rings.get(pr.region)!;
    const g = rnd('ring' + pr.region);
    const turns = 1.08 + g.random() * 0.08;
    const start = -1.6 + g.random() * 1.2;
    const d = greaseRing(r.cx, r.cy, r.rx, r.ry, seedOf('ring' + pr.region), turns, start);
    m.prom.push({
      key: `prom:${pr.region}:${pr.solid ? 's' : 'd'}`,
      enter: pr.solid ? 'draw' : 'fade',
      html: pr.solid
        ? `<g class="pp-mk"><path class="pp-ring pp-solid" pathLength="1" d="${d}"/></g>`
        : `<g class="pp-mk"><path class="pp-ring pp-dashed" pathLength="1" stroke-dasharray="${dashFor(r.rx, r.ry, turns)}" d="${d}"/></g>`,
    });
  }
  // The words go down after every ring is known, placed together so each is clear of the others.
  const defendAt = defendPositions(geom, promised.map((pr) => pr.region), placed, words.defend);
  for (const pr of promised) {
    const t = defendAt.get(pr.region) ?? defendPos(geom, pr.region, placed, words.defend);
    placed.push({ box: hwBox(t.x, t.y, hwWidth(words.defend)), weight: 3 });
    m.hw.push({
      key: `hw:defend:${pr.region}`,
      enter: 'fade',
      html: `<g class="pp-mk"><text class="pp-hw" transform="translate(${f1(t.x)} ${f1(t.y)}) rotate(${t.rot.toFixed(1)})" text-anchor="middle">${esc(words.defend)}</text></g>`,
    });
  }

  if (view.tested && known(view.tested)) {
    const id = view.tested;
    const r = rings.get(id) ?? ringGeom(geom, id);
    const d = greaseRing(r.cx, r.cy, r.rx + 5, r.ry + 5, seedOf('test' + id), 1.55, 0.6, 1.2);
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
    const t = testedPos(geom, id, [...placed, ...ringObstacles(id)], words.tested);
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
  /** The markup each node was made from, so a mark written somewhere else is redrawn in place. */
  private source = new Map<string, string>();
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
      this.source.delete(key);
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
        this.source.set(it.key, it.html);
      } else if (this.source.get(it.key) !== it.html) {
        // The same mark, written somewhere else (a word moved clear of a new pin): redrawn in place, no entrance.
        this.scratch.innerHTML = it.html;
        const fresh = this.scratch.firstElementChild as SVGGElement;
        fresh.setAttribute('data-key', it.key);
        node.replaceWith(fresh);
        node = fresh;
        this.nodes.set(it.key, node);
        this.source.set(it.key, it.html);
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
    this.source.clear();
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

export type { PieceKind, Bounds };
