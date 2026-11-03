/**
 * Where every mark goes on the sheet for a view: the hand never writes on a printed name, a bloc title, a
 * flag or another mark, and a word or a counter never sits inside or on another place's ring.
 *
 * The fixed marks are put down first, each clear of the print and of those before it: the FIGHTING
 * stamps (on their own place, off the names and the bloc titles), the pushpins (on the place their forces
 * leave, toward where they are heading, off the names and the stamps; two pins from one place stand apart)
 * and the pencil arrows. Then the marks that can move round their place (the counters, TESTED, WE DEFEND,
 * the weeks-left ticks beside a pressed place's hatching) are offered many spots each and placed together:
 * every one is an obstacle for every other, with the faces' real glyph boxes (text.ts) and a margin, and
 * the placing is repeated until no mark can find a clearer spot. Pure: no DOM.
 */
import type { MapWords, PaperView, PieceKind, RegionId } from './contract';
import { around, covers, overlap, ringObstacle, type Box, type Ellipse, type Obstacle } from './place';
import { rnd } from './rand';
import type { SheetGeom } from './sheet';
import { inkBox, inkSlices, sliceTurned, TEXT } from './text';
import { landNear } from './land';

import type { P } from './strokes';
export type { P };

// ---------------------------------------------------------------- the sheet's frame and the rings

/** The sheet's foot (frame px): a mark lower than this lands on the desk, under the note. */
export const SHEET_FOOT = 494;
/** The paper the hand may write on: inside the neat line, under the title, above the note. */
export const MARK_FRAME: Box = { x0: 12, y0: 52, x1: 378, y1: SHEET_FOOT };
/** The ring, its TESTED ring (5 px bigger) and the pencil's width must end this far inside the frame's sides. */
const RING_MARGIN = 14;
/** A ring is pulled in by at most this much; past it the ring is drawn smaller instead. */
const RING_PULL = 12;
/** The drawn island's radius (frame px), as sheet.ts draws it. */
const ISLE_R = 17.8;

export interface RingGeom {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** How big a grease ring round a region is (frame px): the plate's extent, held within what a hand draws. */
export function ringSize(geom: SheetGeom, id: RegionId): { rx: number; ry: number } {
  if (geom.island[id]) return { rx: 25, ry: 26 };
  const b = geom.bounds[id];
  const hw = (b.x1 - b.x0) / 2;
  const hh = (b.y1 - b.y0) / 2;
  return { rx: clamp(hw + 2, 22, 38), ry: clamp(hh * 0.92, 20, 38) };
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

/** The red ring over a tested place: the promise ring, five px bigger. */
export function testRingGeom(geom: SheetGeom, id: RegionId): RingGeom {
  const r = ringGeom(geom, id);
  return { cx: r.cx, cy: r.cy, rx: r.rx + 5, ry: r.ry + 5 };
}

// ---------------------------------------------------------------- the marks' shapes

/** The counter's chit (15 x 13 at −9°, its shadow under it) about its centre. */
export function chitBox(x: number, y: number): Box {
  return { x0: x - 9, y0: y - 9.2, x1: x + 9.4, y1: y + 8.6 };
}
/** Where a counter's typed label sits against its chit: under it (the reference), over it, or to a side when the place is cramped. */
export type LabelAt = 'below' | 'above' | 'right' | 'left';
export const LABEL_AT: Record<LabelAt, { dx: number; dy: number; anchor: 'middle' | 'start' | 'end'; rank: number }> = {
  below: { dx: 0, dy: 15, anchor: 'middle', rank: 0 },
  above: { dx: 0, dy: -11.5, anchor: 'middle', rank: 3 },
  right: { dx: 11, dy: 2, anchor: 'start', rank: 4 },
  left: { dx: -11, dy: 2, anchor: 'end', rank: 4 },
};
const LABEL_ORDER: LabelAt[] = ['below', 'above', 'right', 'left'];

/** The counter's typed label beside its chit. */
export function counterLabelBox(label: string, x: number, y: number, at: LabelAt = 'below'): Box {
  const l = LABEL_AT[at];
  return inkBox(TEXT.counter, label, x + l.dx, y + l.dy, l.anchor, 0, 1);
}
/** The pushpin's head and its shadow. */
export function pinBox(x: number, y: number): Box {
  return { x0: x - 9, y0: y - 6, x1: x + 6, y1: y + 8.4 };
}
/** The FIGHTING stamp (52 x 14 before its scale), turned. */
export function stampBoxes(st: { x: number; y: number; rot: number; scale: number }): Box[] {
  const k = st.scale;
  return sliceTurned({ x0: -27 * k, y0: -7.6 * k, x1: 27 * k, y1: 7.6 * k }, st.x, st.y, st.rot, 1);
}
/** The weeks-left ticks (n short strokes, or one ringed). */
export function clockBox(x: number, y: number, n: number): Box {
  if (n <= 1) return around(x, y, 16, 16);
  const half = ((n - 1) * TICK_GAP) / 2 + 2.2;
  return { x0: x - half, y0: y - 6, x1: x + half, y1: y + 6 };
}
/** The space between two ticks. */
export const TICK_GAP = 3.6;

function wordBoxes(word: string, x: number, y: number, rot: number, red: boolean): Box[] {
  const boxes = inkSlices(red ? TEXT.handRed : TEXT.hand, word, x, y, rot, 1.4, 1);
  // TESTED is underlined in red pencil under its baseline.
  if (red) boxes.push({ x0: x - 17.5, y0: y + 1, x1: x + 18.5, y1: y + 5.2 });
  return boxes;
}

// ---------------------------------------------------------------- what is placed

export interface Stamp {
  x: number;
  y: number;
  rot: number;
  scale: number;
}
export interface Arrow {
  start: P;
  mid: P;
  end: P;
}
export interface Placed {
  /** What kind of mark (for tests and the critics' measure). */
  kind: 'stamp' | 'pin' | 'chit' | 'label' | 'word' | 'clock' | 'chain';
  key: string;
  box: Box;
}
export interface Arrangement {
  stamps: Map<RegionId, Stamp>;
  /** By `from:to`. */
  pins: Map<string, P>;
  arrows: Map<string, Arrow>;
  pieces: Map<PieceKind, { x: number; y: number; label: LabelAt }>;
  defend: Map<RegionId, { x: number; y: number; rot: number }>;
  tested: { id: RegionId; x: number; y: number; rot: number } | null;
  /** Weeks-left ticks: where, and how many. */
  clocks: Map<RegionId, { x: number; y: number; n: number }>;
  /** The WORLD WAR chain's numbers: each fall's place in the order, at its baseline's middle. */
  chain: Map<RegionId, { x: number; y: number; n: number }>;
  /** Every placed mark's boxes. */
  placed: Placed[];
}

// ---------------------------------------------------------------- weights

/** What covering a thing costs per px². A printed name, a flag or another mark: never, if any spot is clear. */
const W = {
  name: 24,
  bloc: 18,
  flag: 24,
  mark: 24,
  frame: 24,
  arrow: 1.2,
} as const;

interface Rules {
  /** How near its own ring's line (px either side) a mark counts as on it: the pencil's half width, and more for a counter. */
  ownBand?: number;
  /** Another place's ring, whole: nothing of this mark inside it. */
  otherRing: number;
  /** This mark's own ring's stroke (a counter or a word does not sit on the line). */
  ownStroke: number;
  /** Another island's disc. */
  otherIsle: number;
}
const RULES_BY: Record<'word' | 'tested' | 'piece' | 'clock', Rules> = {
  // A word may touch its own ring (it reads as the ring's), a counter may stand on its own ring's line (the reference
  // draws the fleet so); neither inside or on anyone else's.
  // A word's own ring may touch it but not run through its letters (a word tucked inside the ring sits clear of the line).
  word: { otherRing: 6, ownStroke: 6, otherIsle: 3, ownBand: 1.8 },
  // TESTED is written across its own place (the island, the plate under the name): its own rings may run under it.
  tested: { otherRing: 6, ownStroke: 0.15, otherIsle: 3 },
  piece: { otherRing: 12, ownStroke: 0.3, otherIsle: 12 },
  clock: { otherRing: 6, ownStroke: 2, otherIsle: 4 },
};

/**
 * A word written over another place's land reads as that place's: this much a px² of it (the sea, or its own plate,
 * is free). The second review found WE DEFEND written over the next place in one placement in seven; a word on
 * another plate now costs about as much as a small clash, so the sea or the word's own plate wins when either is clear.
 */
const OTHER_PLATE = 0.05;
/** A word drifting off its own ring's line: this much a px past the first few (a WE DEFEND touches its ring). */
const OFF_RING = 8;
/** A counter that reads as standing at another place says the wrong thing. */
const NOT_MINE = 30;
/**
 * A word nearer another place's printed name than its own ring, or set as that name's caption (stacked over or under
 * it, or on its line within a word-space), reads as that place's: refused whenever any other spot is offered.
 */
const READS_AS_OTHER = 900;

/**
 * The second recheck (the look critic's whose-is-it test on the body, not only the name): a WE DEFEND reads as the place
 * whose land or ring is nearest it. A spot whose word comes nearer another island's coast or another plate than its own
 * ring and its own land costs this much a px of the difference. The ring is judged WOBBLE px further than its ideal line
 * (the grease ring wanders and the glyphs sit inside their boxes), so a word that only just touches its ring keeps a
 * few px of sea between it and anyone else's land. Measured with the look critic's in-page fuzz (seeds L2-0..3, 1,894
 * WE DEFENDs): 2.9% with another's land nearer at 90 (1.6% at 140), but above 100 the word starts to lie on printed
 * names and other marks again on the seeded sheets of paper.test.ts, so 90 is the price that keeps both.
 */
const WHOSE = 90;
const WOBBLE = 4;
/** A word written on its own land pays this share of its own ring's line under it (the halo breaks the line there). */
const MINE_STROKE = 0.1;
/** Across its own island: taken over a clear spot against the ring, never over one that reads as another's. */
const ACROSS_RANK = 6;
/** Across its own island, the word's middle sits this far above the island's (TESTED, when it comes, takes the lower half). */
const ACROSS_DY = -6;
/** A word whose middle lies nearer another place's ring or island (in their own radii) than its own, or on another place's land, reads as that place's. */
const NOT_OWN_WORD = 300;

/**
 * How much nearer another place's land (an island's coast or a plate) comes to a word than its own ring and its own land,
 * in px (0 when its own are at least as near). `rings` are the word's own (the black one; the red one round it when it
 * is tested); the word is judged by its glyphs' turned slices, not the padded box.
 */
function nearerOtherLand(geom: SheetGeom, own: RegionId, rings: readonly Ellipse[], slices: readonly Box[]): number {
  let mine = Infinity;
  let theirs = Infinity;
  for (const b of slices) {
    const l = landNear(geom, own, b);
    if (l.own < mine) mine = l.own;
    if (l.other < theirs) theirs = l.other;
  }
  const ring = Math.min(...rings.map((e) => offRing(e, slices)));
  return Math.max(0, Math.min(ring + WOBBLE, mine) - theirs);
}

/** How much of a box lies on land that is not `own`'s (sampled on a 4 x 3 grid), as an area. */
function onOtherLand(geom: SheetGeom, own: RegionId, boxes: readonly Box[]): number {
  let a = 0;
  for (const b of boxes) {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const r = geom.regionAt(b.x0 + ((i + 0.5) * (b.x1 - b.x0)) / 4, b.y0 + ((j + 0.5) * (b.y1 - b.y0)) / 3);
        if (r && r !== own && !geom.island[r]) n++;
      }
    }
    a += (n / 12) * (b.x1 - b.x0) * (b.y1 - b.y0);
  }
  return a;
}

/** The gap between two boxes (0 when they touch or overlap). */
function gap(a: Box, b: Box): number {
  const dx = Math.max(b.x0 - a.x1, 0, a.x0 - b.x1);
  const dy = Math.max(b.y0 - a.y1, 0, a.y0 - b.y1);
  return Math.hypot(dx, dy);
}

/** Whether a word (its boxes) stands nearer another place's printed name than its own ring's line: it would read as that place's. */
function nearerAnotherName(geom: SheetGeom, own: RegionId, ring: Ellipse, boxes: readonly Box[]): boolean {
  const all: Box = { x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)), x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)) };
  // The word's nearest approach to its own ring's line, from points round its edge (0 when it crosses the line).
  let inside = false;
  let outside_ = false;
  let toRing = Infinity;
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 2; j++) {
      const x = all.x0 + ((all.x1 - all.x0) * i) / 4;
      const y = all.y0 + ((all.y1 - all.y0) * j) / 2;
      const q = Math.hypot((x - ring.cx) / ring.rx, (y - ring.cy) / ring.ry);
      if (q <= 1) inside = true;
      else outside_ = true;
      toRing = Math.min(toRing, Math.abs(q - 1) * Math.min(ring.rx, ring.ry));
    }
  }
  if (inside && outside_) toRing = 0;
  // Nearer another place's name than its own ring's line, or within a few px of as near: it would read as that place's.
  for (const id of Object.keys(geom.shape)) if (id !== own && gap(all, geom.labelBox[id]) < toRing + 4) return true;
  return false;
}

/** Whether a point lies inside a ring (a word written there, on its own land, reads as the ring's whatever its distance to the line). */
function inRing(r: Ellipse, x: number, y: number): boolean {
  return Math.hypot((x - r.cx) / r.rx, (y - r.cy) / r.ry) < 1;
}

/** How far a word's box stands off its own ring's line (0 when it touches or crosses it). */
function offRing(ring: Ellipse, boxes: readonly Box[]): number {
  let best = Infinity;
  let inside = false;
  let outside_ = false;
  for (const b of boxes) {
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 2; j++) {
        const x = b.x0 + ((b.x1 - b.x0) * i) / 4;
        const y = b.y0 + ((b.y1 - b.y0) * j) / 2;
        const q = Math.hypot((x - ring.cx) / ring.rx, (y - ring.cy) / ring.ry);
        if (q <= 1) inside = true;
        else outside_ = true;
        best = Math.min(best, Math.abs(q - 1) * Math.min(ring.rx, ring.ry));
      }
    }
  }
  return inside && outside_ ? 0 : best;
}

/**
 * Whether a word is set as another place's caption: stacked over or under that place's printed name (sharing much of
 * its width, within a line's height) or on its line within a word-space ("LANTERN KEY WE DEFEND", "WE DEFEND / LINTEL").
 */
function captionOfAnother(geom: SheetGeom, own: RegionId, boxes: readonly Box[]): boolean {
  const all: Box = { x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)), x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)) };
  for (const id of Object.keys(geom.shape)) {
    if (id === own) continue;
    const n = geom.labelBox[id];
    const xo = Math.min(all.x1, n.x1) - Math.max(all.x0, n.x0);
    const yo = Math.min(all.y1, n.y1) - Math.max(all.y0, n.y0);
    const narrow = Math.min(all.x1 - all.x0, n.x1 - n.x0);
    const vgap = Math.max(n.y0 - all.y1, all.y0 - n.y1);
    const hgap = Math.max(n.x0 - all.x1, all.x0 - n.x1);
    if (xo > narrow * 0.35 && vgap < 14) return true;
    if (yo > 0 && hgap < 9) return true;
  }
  return false;
}

/**
 * A WE DEFEND written more than LEADER_GAP off its ring is tied to it by a pencil leader (marks.ts): a spot whose leader
 * would cross a printed name or a bloc title costs this, so the leader is never drawn through print.
 */
const LEADER_THROUGH_PRINT = 160;
export const LEADER_GAP = 5;

/** The leader from a word (its boxes) to a ring, as marks.ts draws it, or null when the word touches the ring. */
export function leaderSegment(boxes: readonly Box[], ring: Ellipse): [P, P] | null {
  if (!boxes.length) return null;
  const b = { x0: Math.min(...boxes.map((q) => q.x0)), y0: Math.min(...boxes.map((q) => q.y0)), x1: Math.max(...boxes.map((q) => q.x1)), y1: Math.max(...boxes.map((q) => q.y1)) };
  const dx = (b.x0 + b.x1) / 2 - ring.cx;
  const dy = (b.y0 + b.y1) / 2 - ring.cy;
  const q = Math.hypot(dx / ring.rx, dy / ring.ry);
  if (q <= 1) return null;
  const onRing: P = [ring.cx + dx / q, ring.cy + dy / q];
  const end: P = [Math.max(b.x0 + 2, Math.min(b.x1 - 2, onRing[0])), Math.max(b.y0 + 2, Math.min(b.y1 - 2, onRing[1]))];
  const gap = Math.hypot(end[0] - onRing[0], end[1] - onRing[1]);
  if (gap <= LEADER_GAP) return null;
  const ux = (onRing[0] - end[0]) / gap;
  const uy = (onRing[1] - end[1]) / gap;
  return [
    [end[0] + ux * 2, end[1] + uy * 2],
    [onRing[0] - ux * 2.5, onRing[1] - uy * 2.5],
  ];
}

/** Whether a leader would run through a printed name or a bloc title. */
function leaderThroughPrint(geom: SheetGeom, seg: [P, P] | null): boolean {
  if (!seg) return false;
  const [[x0, y0], [x1, y1]] = seg;
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5));
  const print = [...Object.values(geom.labelBox), ...geom.blocBoxes];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    if (print.some((p) => x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1)) return true;
  }
  return false;
}

/**
 * What a hand-written word of `own` costs for reading as another place's: the two tests above. A word near either of
 * its place's rings (the black promise ring, or the red one round it when tested) is judged by the nearer one.
 */
function readsAsOther(geom: SheetGeom, own: RegionId, rings: readonly Ellipse[], boxes: readonly Box[]): number {
  if (captionOfAnother(geom, own, boxes)) return READS_AS_OTHER;
  return rings.every((ring) => nearerAnotherName(geom, own, ring, boxes)) ? READS_AS_OTHER : 0;
}

/** How far a frame box pokes out of the paper, as an area. */
function outside(b: Box, f: Box = MARK_FRAME): number {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  let a = 0;
  if (b.x0 < f.x0) a += (f.x0 - b.x0) * h;
  if (b.x1 > f.x1) a += (b.x1 - f.x1) * h;
  if (b.y0 < f.y0) a += (f.y0 - b.y0) * w;
  if (b.y1 > f.y1) a += (b.y1 - f.y1) * w;
  return a;
}

function costBoxes(boxes: readonly Box[], obstacles: readonly Obstacle[]): number {
  let c = 0;
  for (const b of boxes) {
    c += outside(b) * W.frame;
    for (const o of obstacles) c += covers(b, o) * o.weight;
  }
  return c;
}

/** The printed sheet as obstacles: every name, every bloc title, the two flags. */
function printed(geom: SheetGeom): Obstacle[] {
  const out: Obstacle[] = [];
  for (const id of Object.keys(geom.shape)) out.push({ box: geom.labelBox[id], weight: W.name });
  for (const b of geom.blocBoxes) out.push({ box: b, weight: W.bloc });
  for (const b of geom.flagBoxes) out.push({ box: b, weight: W.flag });
  return out;
}

// ---------------------------------------------------------------- the fixed marks

/** The FIGHTING stamp's spots on a place: across an island; on land on the name's line, under it first, inside the plate. */
function stampSpots(geom: SheetGeom, id: RegionId, pinned = false): Array<Stamp & { rank: number }> {
  const [cx, cy] = geom.centre[id];
  if (geom.island[id]) {
    // Left islands tilt one way, right islands the other; the stamp is smaller than the island. An island their
    // forces leave from keeps its upper half for the pushpin: the stamp sits low and flatter.
    const rot = cx < 200 ? -12 : 8;
    if (pinned) return [5, 6, 4].map((dy, i) => ({ x: cx, y: cy + 1 + dy, rot: rot / 2, scale: 0.76, rank: i }));
    return [0, -3, 3].map((dy, i) => ({ x: cx, y: cy + 1 + dy, rot, scale: 0.8, rank: i }));
  }
  const [lx, ly] = geom.label[id];
  const out: Array<Stamp & { rank: number }> = [];
  // On the name's line, under it first; anywhere on the plate after that, a little smaller or less tilted when the plate is cramped.
  for (let dy = -27; dy <= 27; dy += 3) {
    for (let dx = -24; dx <= 24; dx += 4) {
      const x = lx + dx;
      const y = ly + dy;
      if (geom.regionAt(x, y) !== id) continue;
      const near = Math.abs(dy - 13) * 0.6 + Math.abs(dx) * 0.35 + (dy < 0 ? 2 : 0);
      out.push({ x, y, rot: -12, scale: 1, rank: near });
      out.push({ x, y, rot: -6, scale: 0.86, rank: near + 4 });
    }
  }
  return out;
}

/** How much of a mark's box lies off its own plate (sampled at its corners and edges' middles). */
function offPlate(geom: SheetGeom, id: RegionId, b: Box): number {
  let n = 0;
  const xs = [b.x0, (b.x0 + b.x1) / 2, b.x1];
  const ys = [b.y0, (b.y0 + b.y1) / 2, b.y1];
  for (const x of xs) for (const y of ys) if (geom.regionAt(x, y) !== id) n++;
  return n;
}

/** The stamps, each clear of the print and of the others: placed in turn, then each again against all the rest until none moves. */
function placeStamps(
  geom: SheetGeom,
  ids: readonly RegionId[],
  base: readonly Obstacle[],
  placed: Placed[],
  fixed: Obstacle[],
  pinned: ReadonlySet<RegionId> = new Set(),
  prev?: ReadonlyMap<RegionId, Stamp>,
  incumbents: readonly Obstacle[] = [],
): Map<RegionId, Stamp> {
  const order = [...ids].sort();
  // A stamp that has slammed stays where it landed while its spot is clear (its old spot is always on offer).
  const spots = order.map((id) => {
    const list = stampSpots(geom, id, pinned.has(id));
    const was = prev?.get(id);
    return was && !list.some((s) => samePlace(s, was) && s.rot === was.rot && s.scale === was.scale) ? [...list, { ...was, rank: 1 }] : list;
  });
  const own = spots.map((list, i) => {
    const id = order[i];
    const was = prev?.get(id);
    const match = list.map((s) => !!was && samePlace(s, was) && s.rot === was.rot && s.scale === was.scale);
    const held = match.some(Boolean);
    // A new stamp keeps off the marks already on the sheet (a pin, a counter, a word, ticks), so they need not move for it.
    const others = [...base, ...incumbents];
    return list.map((s, k) => {
      const boxes = stampBoxes(s);
      return { boxes, cost: costBoxes(boxes, near(others, boxes)) + s.rank + (geom.island[id] ? 0 : boxes.reduce((n, b) => n + offPlate(geom, id, b), 0) * 6) + (held && !match[k] ? STICK : 0) };
    });
  });
  const chosen = order.map(() => -1);
  const pick = (i: number) => {
    let best = 0;
    let bestCost = Infinity;
    own[i].forEach((c, k) => {
      let cost = c.cost;
      if (cost >= bestCost) return;
      for (let j = 0; j < order.length; j++) if (j !== i && chosen[j] >= 0) for (const a of c.boxes) for (const b of own[j][chosen[j]].boxes) cost += overlap(a, b) * W.mark;
      if (cost < bestCost) {
        bestCost = cost;
        best = k;
      }
    });
    return best;
  };
  for (let i = 0; i < order.length; i++) chosen[i] = pick(i);
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (let i = 0; i < order.length; i++) {
      const k = pick(i);
      if (k !== chosen[i]) {
        chosen[i] = k;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const out = new Map<RegionId, Stamp>();
  order.forEach((id, i) => {
    const st = spots[i][chosen[i]] ?? { x: geom.centre[id][0], y: geom.centre[id][1], rot: -12, scale: geom.island[id] ? 0.8 : 1 };
    const s: Stamp = { x: st.x, y: st.y, rot: st.rot, scale: st.scale };
    out.set(id, s);
    for (const b of stampBoxes(s)) {
      fixed.push({ box: b, weight: W.mark });
      placed.push({ kind: 'stamp', key: `stamp:${id}`, box: b });
    }
  });
  return out;
}

/** The obstacles that could touch any of these boxes (a quick cull, so a mark's many spots are judged against a few things). */
function near(obstacles: readonly Obstacle[], boxes: readonly Box[], pad = 0): Obstacle[] {
  if (!boxes.length) return [];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x0);
    y0 = Math.min(y0, b.y0);
    x1 = Math.max(x1, b.x1);
    y1 = Math.max(y1, b.y1);
  }
  const all = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  return obstacles.filter((o) => overlap(all, o.box) > 0);
}

/** How far the pin sits from its place's centre toward where their forces are heading, by preference. */
const PIN_NUDGE = 10;
const PIN_NUDGE_ISLAND = 9;

/** A pushpin on a bloc title hides the title's letters (Orrinth's pin on THE SOUND): refused while any other spot is clear. */
const PIN_ON_BLOC = 10;

function placePins(geom: SheetGeom, headings: ReadonlyArray<{ from: RegionId; to: RegionId }>, base: readonly Obstacle[], placed: Placed[], fixed: Obstacle[], prev?: ReadonlyMap<string, P>): Map<string, P> {
  const out = new Map<string, P>();
  const names = base.filter((o) => o.weight === W.name);
  const forPins = (o: Obstacle): Obstacle => (o.weight === W.bloc && geom.blocBoxes.includes(o.box) ? { box: o.box, weight: o.weight * PIN_ON_BLOC } : o);
  for (const h of headings) {
    const key = `${h.from}:${h.to}`;
    if (out.has(key)) continue;
    const [fx, fy] = geom.centre[h.from];
    const [tx, ty] = geom.centre[h.to];
    const toward = Math.atan2(ty - fy, tx - fx);
    const isle = geom.island[h.from];
    const want = isle ? PIN_NUDGE_ISLAND : PIN_NUDGE;
    // An island's pin stands on it, or (when a stamp fills it) on its shore just outside.
    const dists = isle ? [0, 4, 8, 11, 14, 17, 21, 25] : [0, 4, 8, 10, 12, 16, 20, 24, 28, 32, 36];
    const local = near([...base, ...fixed], [geom.bounds[h.from]], 20).map(forPins);
    const tries: Array<{ p: P; cost: number }> = [];
    for (const d of dists) {
      for (let k = 0; k < 24; k++) {
        const a = toward + (k * Math.PI) / 12;
        const x = fx + Math.cos(a) * d;
        const y = fy + Math.sin(a) * d;
        const r = geom.regionAt(x, y);
        if (isle ? r !== null && r !== h.from : r !== h.from) continue;
        // Toward the destination first (the pin reads as the start of the arrow), at the usual nudge.
        const turn = Math.min(k, 24 - k) / 12;
        const rank = Math.abs(d - want) * 0.35 + (d === 0 ? 0 : turn * 9) + (isle && d > ISLE_R ? 8 : 0);
        tries.push({ p: [x, y], cost: costBoxes([pinBox(x, y)], local) + rank });
      }
    }
    // A pin that has dropped stays in its hole while the hole is clear.
    const was = prev?.get(key);
    if (was && tries.some((t) => samePlace({ x: t.p[0], y: t.p[1] }, { x: was[0], y: was[1] }))) {
      for (const t of tries) if (!samePlace({ x: t.p[0], y: t.p[1] }, { x: was[0], y: was[1] })) t.cost += STICK;
    }
    // The arrow a pin starts should not run through a printed name either (judged for every spot that could still win).
    tries.sort((a, b) => a.cost - b.cost);
    let best: P = tries[0]?.p ?? [fx, fy];
    let bestCost = Infinity;
    for (const t of tries) {
      if (t.cost >= bestCost) break;
      const path = arrowPoints(arrowFor(geom, t.p, h.from, h.to), 4).map(([ax, ay]) => around(ax, ay, 2.5, 2.5));
      const c = t.cost + costBoxes(path, near(names, path)) * 0.25;
      if (c < bestCost) {
        bestCost = c;
        best = t.p;
      }
    }
    out.set(key, best);
    const b = pinBox(best[0], best[1]);
    fixed.push({ box: b, weight: W.mark });
    placed.push({ kind: 'pin', key: `pin:${key}`, box: b });
  }
  return out;
}

/**
 * The arrow from a pin to where their forces are heading: from the pin's rim to the destination's rim. A
 * short hop (a neighbouring island) is drawn as a bowed arc leaving the pin to one side and landing on the
 * destination's shoulder, so it reads as an arrow and not a tick.
 */
export function arrowFor(geom: SheetGeom, pin: P, from: RegionId, to: RegionId): Arrow {
  const [px, py] = pin;
  const [tx, ty] = geom.centre[to];
  const len = Math.hypot(tx - px, ty - py) || 1;
  const ux = (tx - px) / len;
  const uy = (ty - py) / len;
  const g = rnd(`arrow:${from}:${to}`);
  const side = g.random() < 0.5 ? -1 : 1;
  const nx = -uy * side;
  const ny = ux * side;
  const stop = geom.island[to] ? ISLE_R + 2.5 : 15;
  let start: P = [px + ux * 8, py + uy * 8];
  let end: P = [tx - ux * stop, ty - uy * stop];
  let drawn = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (drawn >= 34) {
    // The head stops short of the place's printed name when the name stands in its way (Vessary's is at its pin).
    if (!geom.island[to]) {
      const lb = geom.labelBox[to];
      for (let t = 0; t <= 1; t += 0.02) {
        const x = start[0] + (end[0] - start[0]) * t;
        const y = start[1] + (end[1] - start[1]) * t;
        if (x > lb.x0 - 5 && x < lb.x1 + 5 && y > lb.y0 - 5 && y < lb.y1 + 5) {
          end = [x, y];
          break;
        }
      }
      drawn = Math.hypot(end[0] - start[0], end[1] - start[1]);
    }
    const bend = Math.min(14, drawn * 0.12) * side;
    return { start, mid: [(start[0] + end[0]) / 2 - uy * bend, (start[1] + end[1]) / 2 + ux * bend], end };
  }
  // A short hop: leave the pin at 55° to the line, land on the destination's near shoulder, bow out between.
  const a = (55 * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  start = [px + (ux * ca + nx * sa) * 8, py + (uy * ca + ny * sa) * 8];
  end = [tx + (-ux * ca + nx * sa) * stop, ty + (-uy * ca + ny * sa) * stop];
  drawn = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const bow = Math.max(12, drawn * 0.45);
  return { start, mid: [(start[0] + end[0]) / 2 + nx * bow, (start[1] + end[1]) / 2 + ny * bow], end };
}

/** Points along an arrow's curve (a quadratic through its middle), every few px. */
function arrowPoints(a: Arrow, step = 5): P[] {
  const [s, m, e] = [a.start, a.mid, a.end];
  // The control point that makes the quadratic pass through `mid` at t = 0.5.
  const c: P = [2 * m[0] - (s[0] + e[0]) / 2, 2 * m[1] - (s[1] + e[1]) / 2];
  const len = Math.hypot(m[0] - s[0], m[1] - s[1]) + Math.hypot(e[0] - m[0], e[1] - m[1]);
  const n = Math.max(2, Math.ceil(len / step));
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * s[0] + 2 * u * t * c[0] + t * t * e[0], u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]]);
  }
  return out;
}

// ---------------------------------------------------------------- the marks that move round their place

interface Cand {
  x: number;
  y: number;
  rot: number;
  rank: number;
  /** A counter's label: under, over or beside the chit. */
  label?: LabelAt;
  /** A word whose middle lies on its own place's land (across its island, inside its plate). */
  mine?: boolean;
}
interface Mover {
  key: string;
  kind: 'piece' | 'word' | 'clock';
  cands: Cand[];
  shape: (c: Cand) => Box[];
  /** The kinds of the boxes `shape` returns (for the record of what was placed). */
  kinds: (c: Cand) => Placed['kind'][];
  obstacles: Obstacle[];
  /** A spot's own extra cost besides its rank and its obstacles (a word on another place's land). */
  extra?: (c: Cand, boxes: readonly Box[]) => number;
}

/** The rings on the sheet: each promise's, and the tested place's red one. */
interface SheetRing {
  owner: RegionId;
  e: Ellipse;
}

/** The obstacles a moving mark of `owner` must keep clear of besides the print and the fixed marks: the rings and the islands. */
function ringsFor(geom: SheetGeom, owner: RegionId | null, rings: readonly SheetRing[], rules: Rules): Obstacle[] {
  const out: Obstacle[] = [];
  for (const r of rings) {
    if (r.owner === owner) out.push(ringObstacle(r.e, rules.ownStroke, rules.ownBand ?? 3));
    else out.push(ringObstacle(r.e, rules.otherRing));
  }
  for (const id of Object.keys(geom.shape)) {
    if (!geom.island[id] || id === owner) continue;
    const [cx, cy] = geom.centre[id];
    out.push(ringObstacle({ cx, cy, rx: ISLE_R + 1, ry: ISLE_R + 1 }, rules.otherIsle));
  }
  return out;
}

/** Which ring or island a point reads as belonging to: the one it is nearest, measured in each one's own radii. */
function nearestOwner(geom: SheetGeom, x: number, y: number, rings: readonly SheetRing[]): RegionId | null {
  let best: RegionId | null = null;
  let bestQ = Infinity;
  const consider = (id: RegionId, e: Ellipse) => {
    const q = Math.hypot((x - e.cx) / e.rx, (y - e.cy) / e.ry);
    if (q < bestQ) {
      bestQ = q;
      best = id;
    }
  };
  for (const r of rings) consider(r.owner, r.e);
  for (const id of Object.keys(geom.shape)) if (geom.island[id]) consider(id, { cx: geom.centre[id][0], cy: geom.centre[id][1], rx: 25, ry: 26 });
  return best;
}

/** Which place a counter at (x, y) reads as standing at: the nearest, measured in each place's own ring radii. */
function readsAt(geom: SheetGeom, x: number, y: number): RegionId | null {
  let best: RegionId | null = null;
  let bestQ = Infinity;
  for (const id of Object.keys(geom.shape)) {
    const [cx, cy] = geom.centre[id];
    const { rx, ry } = ringSize(geom, id);
    const q = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (q < bestQ) {
      bestQ = q;
      best = id;
    }
  }
  return best;
}

/** A word's spots round a ring: every 15° about it, just clear of the line and a little further out; under the ring is preferred. */
function ringSpots(r: Ellipse, w: number, up: number, down: number, inner = false): Cand[] {
  const out: Cand[] = [];
  const h = up + down;
  // A land place's ring is offered spots inside it too (tucked under the ring's line, as the reference writes it).
  const ds = inner ? [-22, -16, -10, -5, 0, 3, 7, 12, 18, 26] : [-5, 0, 3, 7, 12, 18, 26];
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const support = Math.abs((w / 2) * ca) + Math.abs((h / 2) * sa);
    for (const d of ds) {
      const cx = r.cx + (r.rx + 2.5 + support + d) * ca;
      const cy = r.cy + (r.ry + 2.5 + support + d) * sa;
      // Under the ring is preferred, then over it, then the sides; nearer the line is preferred. Each spot is also
      // offered a few px along the ring either way, so a word can slip past a corner of something.
      const rank = 2.5 * (1 - sa) + Math.max(0, d) * 0.45 + (d < 0 ? 3 + (d < -5 ? 1 : 0) : 0);
      for (const slide of [0, -5, 5]) out.push({ x: cx - sa * slide, y: cy + ca * slide + (up - down) / 2, rot: 0, rank: rank + Math.abs(slide) * 0.15 });
    }
  }
  return out;
}

function counterSpots(geom: SheetGeom, at: RegionId, text: string): Cand[] {
  const [cx, cy] = geom.centre[at];
  const isle = geom.island[at];
  // Beside the place, right of its name as the reference draws the fleet; the nearer that, the better.
  const px = cx + (isle ? 26 : 28);
  const py = cy + (isle ? 2 : 9);
  const out: Cand[] = [];
  for (let dx = -50; dx <= 50; dx += 5) {
    for (let dy = -45; dy <= 45; dy += 5) {
      const x = cx + dx;
      const y = cy + dy;
      const ok = (qx: number, qy: number) => {
        const r = geom.regionAt(qx, qy);
        return isle ? r === null || r === at : r === at;
      };
      if (isle && Math.hypot(dx, dy) > 46) continue;
      // A land counter stands on its own plate (an island's in the water round it or on it): the chit's middle and
      // sides must be, and every corner of the chit and of its label off the plate costs (it would hang over the coast).
      if (!ok(x, y) || !ok(x - 8, y) || !ok(x + 8, y) || !ok(x, y + 8)) continue;
      const corners = (b: Box) => [ok(b.x0, b.y0), ok(b.x1, b.y0), ok(b.x0, b.y1), ok(b.x1, b.y1)].filter((v) => !v).length;
      const chitOff = corners(chitBox(x, y));
      for (const label of LABEL_ORDER) {
        const l = LABEL_AT[label];
        const lx = x + l.dx + (l.anchor === 'start' ? 12 : l.anchor === 'end' ? -12 : 0);
        if (!ok(lx, y + l.dy - 2)) continue;
        const off = chitOff + (text ? corners(counterLabelBox(text, x, y, label)) : 0);
        out.push({ x, y, rot: 0, rank: Math.hypot(x - px, y - py) * 0.3 + l.rank + off * 4, label });
      }
    }
  }
  if (!out.length) out.push({ x: px, y: py, rot: 0, rank: 0, label: 'below' });
  return out;
}

function clockSpots(geom: SheetGeom, id: RegionId, n: number): Cand[] {
  const [cx, cy] = geom.centre[id];
  const lb = geom.labelBox[id];
  const [lx, ly] = geom.label[id];
  const out: Cand[] = [];
  const half = (clockBox(0, 0, n).x1 - clockBox(0, 0, n).x0) / 2;
  if (geom.island[id]) {
    // Beside the island's hatching, in the water: right of it first.
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8;
      for (const d of [ISLE_R + 6, ISLE_R + 10, ISLE_R + 15]) {
        const x = cx + Math.cos(a) * (d + Math.abs(Math.cos(a)) * (half - 5));
        const y = cy + Math.sin(a) * d;
        const r = geom.regionAt(x, y);
        if (r !== null && r !== id) continue;
        out.push({ x, y, rot: 0, rank: Math.min(k, 16 - k) * 0.5 + (d - ISLE_R - 6) * 0.3 });
      }
    }
    return out;
  }
  // On the hatched plate, beside the printed name: after it on its line first.
  const px = lb.x1 + half + 3;
  const py = ly - 3;
  for (let dx = -56; dx <= 56; dx += 4) {
    for (let dy = -32; dy <= 32; dy += 4) {
      const x = lx + dx;
      const y = py + dy;
      if (geom.regionAt(x, y) !== id || geom.regionAt(x - half, y) !== id || geom.regionAt(x + half, y) !== id) continue;
      out.push({ x, y, rot: 0, rank: Math.hypot(x - px, y - py) * 0.25 });
    }
  }
  if (!out.length) out.push({ x: cx, y: cy, rot: 0, rank: 0 });
  return out;
}

/** The gap between a chain number's box and its own stamp, and how far it sits from the stamp's middle (px). */
const CHAIN_GAPS = [1.5, 4, 7, 11, 16, 22];
/**
 * A chain number's spots round its own stamp, in the stamp's turned frame: before its left end first (the number
 * reads "1 FIGHTING"), then after its right end, then over and under it. (x, y) is the box's middle.
 */
function chainSpots(st: Stamp, w: number, h: number): Cand[] {
  const a = (st.rot * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hw = 27 * st.scale;
  const hh = 7.6 * st.scale;
  const out: Cand[] = [];
  const at = (u: number, v: number, rank: number) => out.push({ x: st.x + u * ca - v * sa, y: st.y + u * sa + v * ca, rot: 0, rank });
  CHAIN_GAPS.forEach((g, i) => {
    const r = i * 1.2;
    for (const v of [0, -3, 3]) {
      at(-hw - g - w / 2, v, r + Math.abs(v) * 0.3);
      at(hw + g + w / 2, v, r + 1 + Math.abs(v) * 0.3);
    }
    for (const u of [-18, -9, 0, 9, 18]) {
      at(u, -hh - g - h / 2, r + 2 + Math.abs(u) * 0.08);
      at(u, hh + g + h / 2, r + 2.5 + Math.abs(u) * 0.08);
    }
    // Off a corner, when both ends and both sides are taken (a cramped Sound).
    for (const su of [-1, 1]) for (const sv of [-1, 1]) at(su * (hw + g * 0.7 + w / 2), sv * (hh + g * 0.7 + h / 2), r + 3.5);
  });
  return out;
}
/** A chain number nearer another stamp than its own reads as that fall's number: refused whenever any other spot is offered. */
const NOT_OWN_NUMBER = 400;

/**
 * A pencil mark on paper does not walk (the second review: a third of the playback's beats moved a WE DEFEND, a pin,
 * a counter or a set of ticks whose own place had not changed). A mark already on the sheet keeps its spot unless the
 * spot now costs more than this (a clash of a couple of px² does): every other spot pays it.
 */
export const STICK = 60;

/** Where each moving mark was in the last arrangement, by its mover key. */
type PrevSpots = Map<string, { x: number; y: number; label?: LabelAt }>;

function prevSpots(prev: Arrangement | null | undefined): PrevSpots {
  const out: PrevSpots = new Map();
  if (!prev) return out;
  for (const [id, d] of prev.defend) out.set(`defend:${id}`, { x: d.x, y: d.y });
  if (prev.tested) out.set(`tested:${prev.tested.id}`, { x: prev.tested.x, y: prev.tested.y });
  for (const [k, c] of prev.pieces) out.set(`piece:${k}`, { x: c.x, y: c.y, label: c.label });
  for (const [id, c] of prev.clocks) out.set(`clock:${id}`, { x: c.x, y: c.y });
  for (const [id, c] of prev.chain ?? []) out.set(`chain:${id}`, { x: c.x, y: c.y });
  return out;
}

const samePlace = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5;

/** The stick a spot pays: STICK unless it is the mark's last spot (and only when that spot is still on offer). */
function stickCosts<T extends { x: number; y: number; label?: LabelAt }>(cands: readonly T[], was: { x: number; y: number; label?: LabelAt } | undefined): number[] {
  if (!was) return cands.map(() => 0);
  const same = cands.map((c) => samePlace(c, was) && (was.label === undefined || c.label === undefined || c.label === was.label));
  if (!same.some(Boolean)) return cands.map(() => 0);
  return same.map((v) => (v ? 0 : STICK));
}

/** Place the moving marks together: greedy in order, then each re-placed against all the others until none moves. */
function solve(movers: readonly Mover[], debug?: (key: string, ranked: Array<{ x: number; y: number; cost: number; rank: number }>) => void, prev: PrevSpots = new Map()): number[] {
  const shapes = movers.map((m) => m.cands.map((c) => m.shape(c)));
  const fixedCost = movers.map((m, i) => {
    const local = near(m.obstacles, shapes[i].flat());
    const stick = stickCosts(m.cands, prev.get(m.key));
    return m.cands.map((c, k) => {
      const boxes = shapes[i][k];
      return costBoxes(boxes, local) + c.rank + (m.extra ? m.extra(c, boxes) : 0) + stick[k];
    });
  });
  const chosen = movers.map(() => -1);
  const clash = (a: readonly Box[], b: readonly Box[]) => {
    let s = 0;
    for (const x of a) for (const y of b) s += overlap(x, y);
    return s * W.mark;
  };
  const pick = (i: number) => {
    let best = 0;
    let bestCost = Infinity;
    for (let c = 0; c < movers[i].cands.length; c++) {
      let cost = fixedCost[i][c];
      if (cost >= bestCost) continue;
      for (let j = 0; j < movers.length; j++) if (j !== i && chosen[j] >= 0) cost += clash(shapes[i][c], shapes[j][chosen[j]]);
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }
    return best;
  };
  if (debug) movers.forEach((m, i) => debug(m.key, m.cands.map((c, k) => ({ x: c.x, y: c.y, cost: fixedCost[i][k], rank: c.rank })).sort((a, b) => a.cost - b.cost).slice(0, 8)));
  // The marks already on the sheet are put down first, in their old spots where those are clear; the new ones then
  // find room round them (else a new TESTED could take the spot of a WE DEFEND that was there before it).
  const order = movers.map((_, i) => i).sort((a, b) => Number(!prev.has(movers[a].key)) - Number(!prev.has(movers[b].key)));
  for (const i of order) chosen[i] = pick(i);
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (const i of order) {
      const c = pick(i);
      if (c !== chosen[i]) {
        chosen[i] = c;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return chosen;
}

/** The hand's slight tilt for a place's WE DEFEND (seeded, so it never jitters). */
export function defendTilt(id: RegionId): number {
  const g = rnd('defend' + id);
  return -(3 + g.random() * 3);
}

/**
 * Everything placed for a view. `prev` is the arrangement on the sheet before this one (the last beat): a mark whose
 * spot is still clear stays where it is.
 */
export function arrange(view: PaperView, geom: SheetGeom, words: MapWords, debug?: Parameters<typeof solve>[1], prev?: Arrangement | null): Arrangement {
  const known = (id: RegionId) => id in geom.shape;
  const base = printed(geom);
  const placed: Placed[] = [];
  const fixed: Obstacle[] = [];

  const fighting = Object.entries(view.states)
    .filter(([id, s]) => s === 'fighting' && known(id))
    .map(([id]) => id);
  const headings = view.headings.filter((h) => known(h.from) && known(h.to) && h.from !== h.to);
  // The marks on the sheet before this one that are still wanted (a pin of a heading still drawn, a counter, a word,
  // ticks): a new stamp keeps off them a little, so they can stay where they are.
  const still = new Set([...headings.map((h) => `pin:${h.from}:${h.to}`), ...view.pieces.map((p) => `piece:${p.kind}`), ...view.promises.map((p) => `defend:${p.region}`), ...Object.keys(view.clocks ?? {}).map((id) => `clock:${id}`)]);
  const incumbents: Obstacle[] = (prev?.placed ?? []).filter((m) => m.kind !== 'stamp' && still.has(m.key)).map((m) => ({ box: m.box, weight: W.mark / 4 }));
  const stamps = placeStamps(geom, fighting, base, placed, fixed, new Set(headings.map((h) => h.from)), prev?.stamps, incumbents);

  // A tested island that is also a foothold keeps its middle for TESTED: the pins stand off it (on its shore), so the
  // word sits across its own island instead of being pushed round the crowded ring (the recheck's Driftholm sheet).
  const testedIsle = view.tested && known(view.tested) && geom.island[view.tested] && headings.some((h) => h.from === view.tested) ? view.tested : null;
  const reserved: Obstacle[] = testedIsle
    ? wordBoxes(words.tested, geom.centre[testedIsle][0] + 2, geom.centre[testedIsle][1] + 5, -3, true).map((b) => ({ box: { x0: b.x0 - 4, y0: b.y0 - 7, x1: b.x1 + 4, y1: b.y1 + 7 }, weight: W.mark / 3 }))
    : [];
  fixed.push(...reserved);
  const pins = placePins(geom, headings, base, placed, fixed, prev?.pins);
  for (const r of reserved) fixed.splice(fixed.indexOf(r), 1);
  const arrows = new Map<string, Arrow>();
  for (const h of headings) {
    const key = `${h.from}:${h.to}`;
    const a = arrowFor(geom, pins.get(key)!, h.from, h.to);
    arrows.set(key, a);
    for (const [x, y] of arrowPoints(a)) fixed.push({ box: around(x, y, 3.5, 3.5), weight: W.arrow });
  }

  const promised = view.promises.filter((p) => known(p.region));
  const tested = view.tested && known(view.tested) ? view.tested : null;
  const rings: SheetRing[] = promised.map((p) => ({ owner: p.region, e: ringGeom(geom, p.region) }));
  if (tested) rings.push({ owner: tested, e: testRingGeom(geom, tested) });

  const movers: Mover[] = [];
  const all = [...base, ...fixed];

  // TESTED: under the name inside its ring on land, across the island at sea; round the ring when that is taken.
  if (tested) {
    const id = tested;
    const [cx, cy] = geom.centre[id];
    const [lx, ly] = geom.label[id];
    const first: Cand[] = geom.island[id]
      ? [-2, 2, 5, 8, 11].flatMap((dy) => [0, -4, 4].map((dx) => ({ x: cx + 2 + dx, y: cy + dy, rot: -3, rank: Math.abs(dy - 5) * 0.4 + Math.abs(dx) * 0.3 })))
      : [
          { x: lx + 2, y: ly + 21, rot: -3, rank: 0 },
          { x: lx + 2, y: ly + 24, rot: -3, rank: 1 },
          { x: lx + 2, y: ly - 12, rot: -3, rank: 6 },
        ];
    const box = inkBox(TEXT.handRed, words.tested, 0, 0);
    // On the call the sheet slides the tested place up under the handset and the caller card covers what lies below its
    // red ring: on land TESTED stays inside the ring, beside it or over it, never under it (the second review found it
    // 92% covered on the call when Rimeholt was tested).
    const tr = testRingGeom(geom, id);
    const below = (c: Cand) => !geom.island[id] && c.y - 2 > tr.cy + tr.ry;
    const around_ = ringSpots(tr, box.x1 - box.x0, -box.y0, box.y1).map((c) => ({ ...c, rot: -3, rank: c.rank + 8 + (below(c) ? 120 : 0) }));
    const rules = RULES_BY.tested;
    movers.push({
      key: `tested:${id}`,
      kind: 'word',
      cands: [...first, ...around_],
      shape: (c) => wordBoxes(words.tested, c.x, c.y, c.rot, true),
      kinds: () => ['word', 'word'],
      obstacles: [...all, ...ringsFor(geom, id, rings, rules)],
      extra: (_c, boxes) => onOtherLand(geom, id, boxes) * OTHER_PLATE + readsAsOther(geom, id, [testRingGeom(geom, id)], boxes) + Math.max(0, offRing(testRingGeom(geom, id), boxes) - 3) * OFF_RING,
    });
  }

  // A promised island keeps its middle for its WE DEFEND, written across it (below): a counter standing there or ticks
  // beside it keep off that band, so the word need not be pushed round the crowded Scatter to where it reads as the
  // next island's (the second recheck: Tern Isle's word above Lantern Key while the fleet sat on Tern Isle).
  const defendBox = inkBox(TEXT.hand, words.defend, 0, 0);
  const band: Obstacle[] = promised
    .filter((p) => geom.island[p.region])
    .flatMap((p) => {
      const [ix, iy] = geom.centre[p.region];
      return wordBoxes(words.defend, ix, iy + ACROSS_DY + (-defendBox.y0 - defendBox.y1) / 2, defendTilt(p.region) / 2, false).map((b) => ({ box: { x0: b.x0 - 2, y0: b.y0 - 1, x1: b.x1 + 2, y1: b.y1 + 1 }, weight: W.mark / 3 }));
    });

  // The counters, on their own place.
  const pieces = view.pieces.filter((p) => known(p.at));
  for (const piece of pieces) {
    const label = piece.kind === 'fleet' ? words.fleet : words.brigade;
    const rules = RULES_BY.piece;
    movers.push({
      key: `piece:${piece.kind}`,
      kind: 'piece',
      cands: counterSpots(geom, piece.at, label),
      shape: (c) => (label ? [chitBox(c.x, c.y), counterLabelBox(label, c.x, c.y, c.label)] : [chitBox(c.x, c.y)]),
      kinds: () => (label ? ['chit', 'label'] : ['chit']),
      obstacles: [...all, ...band, ...ringsFor(geom, piece.at, rings, rules)],
      // A counter that reads as standing at another place says the wrong thing (the brigade "at Vessary").
      extra: (c) => (readsAt(geom, c.x, c.y + 3) !== piece.at ? NOT_MINE : 0),
    });
  }

  // WE DEFEND round each ring, nearer its own ring and its own land than anyone else's (the second recheck: the word was
  // read by the island or the plate it lay on, not only by the name beside it). A Scatter island is also offered its
  // own body: written across the island inside its ring, as TESTED is, the word can only be that island's; the ring's
  // pencil runs under the word's paper halo there.
  for (const p of promised) {
    const id = p.region;
    const rot = defendTilt(id);
    const box = inkBox(TEXT.hand, words.defend, 0, 0);
    const rules = RULES_BY.word;
    const ring = ringGeom(geom, id);
    const red = testRingGeom(geom, id);
    const up = -box.y0;
    const down = box.y1;
    const round: Cand[] = ringSpots(ring, box.x1 - box.x0, up, down, !geom.island[id]).map((c) => {
      const owner = nearestOwner(geom, c.x, c.y - 4, rings);
      const under = geom.regionAt(c.x, c.y - (up - down) / 2);
      // Its middle nearer another ring or island, or lying on another place's land: it reads as that place's.
      const other = (owner !== null && owner !== id) || (under !== null && under !== id);
      return { ...c, rot, rank: c.rank + (other ? NOT_OWN_WORD : 0), mine: under === id };
    });
    const [ix, iy] = geom.centre[id];
    const across: Cand[] = geom.island[id]
      ? [-14, -11, -8, -5, -2, 1, 4, 7, 10].flatMap((dy) => [-12, -9, -6, -3, 0, 3, 6, 9, 12].map((dx) => ({ x: ix + dx, y: iy + dy + (up - down) / 2, rot: rot / 2, rank: ACROSS_RANK + Math.abs(dy - ACROSS_DY) * 0.3 + Math.abs(dx) * 0.2, mine: true })))
      : [];
    const ownRing = ringObstacle(ring, rules.ownStroke, rules.ownBand ?? 3);
    movers.push({
      key: `defend:${id}`,
      kind: 'word',
      cands: [...round, ...across],
      shape: (c) => wordBoxes(words.defend, c.x, c.y, c.rot, false),
      kinds: () => ['word'],
      // Its own rings are judged in `extra`: the black one's line may run under a word written on its own land; the red
      // ring a test draws round its place may run under the word (the word's paper halo breaks it), so a test does not
      // move a WE DEFEND already on the sheet (the second review: it jumped on the test and back after it).
      obstacles: [...all, ...ringsFor(geom, id, rings.filter((r) => r.owner !== id), rules), ...(tested === id ? [ringObstacle(red, 0.3, 3)] : [])],
      // The word touches its ring: the black one, or (when its place is tested) the red one round it.
      extra: (c, boxes) => {
        const near = tested === id ? [ring, red] : [ring];
        const lead = leaderThroughPrint(geom, leaderSegment(boxes, near[near.length - 1])) ? LEADER_THROUGH_PRINT : 0;
        let cross = 0;
        for (const b of boxes) cross += covers(b, ownRing) * ownRing.weight;
        const ink = inkSlices(TEXT.hand, words.defend, c.x, c.y, c.rot, 0, 4);
        return (
          cross * (c.mine ? MINE_STROKE : 1) +
          nearerOtherLand(geom, id, near, ink) * WHOSE +
          onOtherLand(geom, id, boxes) * OTHER_PLATE +
          readsAsOther(geom, id, near, boxes) +
          (c.mine && inRing(ring, c.x, c.y - (up - down) / 2) ? 0 : Math.max(0, Math.min(...near.map((e) => offRing(e, boxes))) - 3) * OFF_RING) +
          lead
        );
      },
    });
  }

  // The weeks left on each pressed place's clock, beside its hatching.
  for (const [id, n] of Object.entries(view.clocks ?? {})) {
    if (!known(id) || view.states[id] !== 'pressed' || !(n >= 1)) continue;
    const k = Math.min(3, Math.round(n));
    const rules = RULES_BY.clock;
    movers.push({
      key: `clock:${id}`,
      kind: 'clock',
      cands: clockSpots(geom, id, k),
      shape: (c) => [clockBox(c.x, c.y, k)],
      kinds: () => ['clock'],
      obstacles: [...all, ...ringsFor(geom, id, rings, rules)],
    });
  }

  // The WORLD WAR chain (the look critic's recheck: numbers set at a fixed offset from their stamps landed on another
  // place's stamp, a counter or a word in 136 of 237 endings): each number is a mover like the words, beside its own
  // stamp and clear of every other mark, and nearer its own stamp than any other, so the order reads.
  const chainIds = (view.chain ?? []).filter((id) => stamps.has(id));
  const chainAt = new Map<string, { n: number; mid: number }>();
  chainIds.forEach((id, i) => {
    const n = String(i + 1);
    const st = stamps.get(id)!;
    const local = inkBox(TEXT.chain, n, 0, 0, 'middle', 0, 1.4);
    const w = local.x1 - local.x0;
    const h = local.y1 - local.y0;
    const mid = (local.y0 + local.y1) / 2;
    const own = stampBoxes(st);
    const others = chainIds.filter((o) => o !== id).map((o) => stampBoxes(stamps.get(o)!));
    const key = `chain:${id}`;
    chainAt.set(key, { n: i + 1, mid });
    movers.push({
      key,
      kind: 'word',
      cands: chainSpots(st, w, h),
      shape: (c) => [inkBox(TEXT.chain, n, c.x, c.y - mid, 'middle', 0, 1.4)],
      kinds: () => ['chain'],
      obstacles: [...all, ...ringsFor(geom, id, rings, RULES_BY.clock)],
      extra: (_c, boxes) => {
        const d = Math.min(...own.map((b) => gap(boxes[0], b)));
        return others.some((o) => Math.min(...o.map((b) => gap(boxes[0], b))) < d + 3) ? NOT_OWN_NUMBER : 0;
      },
    });
  });

  const chosen = solve(movers, debug, prevSpots(prev));
  const out: Arrangement = { stamps, pins, arrows, pieces: new Map(), defend: new Map(), tested: null, clocks: new Map(), chain: new Map(), placed };
  movers.forEach((m, i) => {
    const c = m.cands[chosen[i]];
    const kinds = m.kinds(c);
    m.shape(c).forEach((b, j) => placed.push({ kind: kinds[j] ?? 'word', key: m.key, box: b }));
    const [what, id] = m.key.split(':') as [string, string];
    if (what === 'piece') out.pieces.set(id as PieceKind, { x: c.x, y: c.y, label: c.label ?? 'below' });
    else if (what === 'defend') out.defend.set(id, { x: c.x, y: c.y, rot: c.rot });
    else if (what === 'tested') out.tested = { id, x: c.x, y: c.y, rot: c.rot };
    else if (what === 'clock') out.clocks.set(id, { x: c.x, y: c.y, n: Math.min(3, Math.round(view.clocks![id])) });
    else if (what === 'chain') {
      const k = chainAt.get(m.key)!;
      out.chain.set(id, { x: c.x, y: c.y - k.mid, n: k.n });
    }
  });
  return out;
}
