/**
 * The marks: what the hand puts on the printed sheet for a view, as keyed items per layer, and the
 * keyed layer that diffs them into the SVG. A mark's markup depends only on its key, so an
 * unchanged mark is never redrawn; a new one enters (a ring draws, a pin drops, the stamp slams),
 * a gone one leaves. Pure except for `Layer`.
 *
 * Where a mark goes is arrange.ts: every word, counter, pin, stamp and weeks-left tick is kept off the
 * printed names, the bloc titles, the flags, the other marks and the other places' rings.
 */
import type { MapWords, PaperView, PieceKind, RegionId } from './contract';
import type { Bounds } from './geometry';
import type { Box } from './place';
import { arrange, arrowFor, LABEL_AT, LEADER_GAP, leaderSegment, ringGeom, testRingGeom, TICK_GAP, type Arrangement } from './arrange';
import { rnd, seedOf } from './rand';
import type { SheetGeom } from './sheet';
import { counterGlyph, greaseRing, pencilArrow, pencilLine, pushpin, type P } from './strokes';

export { ringGeom, ringSize, SHEET_FOOT, type RingGeom } from './arrange';

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
  clock: Item[];
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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const EMPTY: PaperView = { states: {}, promises: [], headings: [], pieces: [], tested: null, pressed: null, lifted: null };
const WORDS_FOR_ONE = { defend: 'WE DEFEND', tested: 'TESTED', fighting: 'FIGHTING', blocs: { CAP: '', HMR: '', SCT: '', SND: '', FRS: '' }, north: 'N', fleet: 'FLEET', brigade: 'BRIGADE' } as MapWords;

/** Where WE DEFEND goes for one promise on the bare sheet (its baseline point and tilt). */
export function defendPos(geom: SheetGeom, id: RegionId, word = 'WE DEFEND'): { x: number; y: number; rot: number } {
  return arrange({ ...EMPTY, promises: [{ region: id, solid: true }] }, geom, { ...WORDS_FOR_ONE, defend: word }).defend.get(id)!;
}

/** Where TESTED goes for one tested place on the bare sheet. */
export function testedPos(geom: SheetGeom, id: RegionId, word = 'TESTED'): { x: number; y: number } {
  const t = arrange({ ...EMPTY, tested: id }, geom, { ...WORDS_FOR_ONE, tested: word }).tested!;
  return { x: t.x, y: t.y };
}

/** Where one counter stands at a place on the bare sheet. */
export function piecePos(geom: SheetGeom, at: RegionId, kind: PieceKind = 'fleet'): P {
  const c = arrange({ ...EMPTY, pieces: [{ kind, at }] }, geom, WORDS_FOR_ONE).pieces.get(kind)!;
  return [c.x, c.y];
}

/** Where the pushpin goes for one heading on the bare sheet. */
export function pinPos(geom: SheetGeom, from: RegionId, to: RegionId): P {
  return arrange({ ...EMPTY, headings: [{ from, to }] }, geom, WORDS_FOR_ONE).pins.get(`${from}:${to}`)!;
}

/** The arrow for one heading on the bare sheet: from the pin's rim to the destination's rim, never a stub. */
export function arrowEnds(geom: SheetGeom, from: RegionId, to: RegionId): { start: P; end: P; mid: P } {
  return arrowFor(geom, pinPos(geom, from, to), from, to);
}

/** The FIGHTING stamp on one place on the bare sheet: on the name's line on land, across the island at sea. */
export function stampPos(geom: SheetGeom, id: RegionId): { x: number; y: number; rot: number; scale: number } {
  return arrange({ ...EMPTY, states: { [id]: 'fighting' } }, geom, WORDS_FOR_ONE).stamps.get(id)!;
}

function dashFor(rx: number, ry: number, turns: number): string {
  const len = Math.PI * (rx + ry) * turns;
  return `${(9 / len).toFixed(4)} ${(6 / len).toFixed(4)}`;
}

/** The weeks-left ticks: n short pencil strokes; the last week's single stroke ringed. */
function ticks(x: number, y: number, n: number, seed: string): string {
  const out: string[] = [];
  const g = seedOf(seed);
  if (n <= 1) {
    // An upright tick well inside a wider ring reads as one week ringed, not as a struck-through nought (the second review).
    out.push(`<path class="pp-tick" d="${pencilLine(x + 0.2, y - 3.1, x - 0.2, y + 3.1, g, 0.2, 3)}"/>`);
    out.push(`<path class="pp-tick pp-tick-ring" d="${greaseRing(x, y, 7.2, 7.2, g + 1, 1.08, -1.2, 0.5, 18)}"/>`);
  } else {
    const x0 = x - ((n - 1) * TICK_GAP) / 2;
    for (let i = 0; i < n; i++) {
      const tx = x0 + i * TICK_GAP;
      out.push(`<path class="pp-tick" d="${pencilLine(tx + 0.7, y - 4, tx - 0.7, y + 4, g + i, 0.25, 3)}"/>`);
    }
  }
  return out.join('');
}

/** How far a WE DEFEND may stand off its ring before a leader ties it there. */
export const LEADER_FROM = LEADER_GAP;

/**
 * The pencil leader from a word to its ring: from the word's box edge nearest the ring to the ring's line, when the
 * gap is more than LEADER_FROM; null when the word touches its ring. The same segment the placement judged.
 */
export function leaderFor(at: Arrangement, key: string, ring: { cx: number; cy: number; rx: number; ry: number }): [P, P] | null {
  return leaderSegment(at.placed.filter((p) => p.key === key).map((p) => p.box), ring);
}

/** The last arrangement, kept: a held finger or a lifted counter changes the view but not where anything goes. */
let lastKey = '';
let lastGeom: SheetGeom | null = null;
let lastWords: MapWords | null = null;
let last: Arrangement | null = null;
function arranged(view: PaperView, geom: SheetGeom, words: MapWords): Arrangement {
  const key = JSON.stringify([view.states, view.promises, view.headings, view.pieces, view.tested, view.clocks ?? {}, view.chain ?? []]);
  if (last && key === lastKey && geom === lastGeom && words === lastWords) return last;
  // The last arrangement is passed in: a mark whose spot is still clear stays put (a pencil mark does not walk).
  last = arrange(view, geom, words, undefined, geom === lastGeom && words === lastWords ? last : null);
  lastKey = key;
  lastGeom = geom;
  lastWords = words;
  return last;
}

/**
 * The tested place's marks as this view places them (the day frame's px): the TESTED word's boxes and the red ring. The call
 * slides the sheet by these (geometry.ts callShiftFor), so the word is never under the handset or the caller card.
 */
export function testedMarks(given: PaperView, geom: SheetGeom, words: MapWords): { id: RegionId; word: Box[]; ring: { cx: number; cy: number; rx: number; ry: number } } | null {
  const { view } = withGhost(given);
  const id = view.tested;
  if (!id || !(id in geom.shape)) return null;
  const at = arranged(view, geom, words);
  return { id, word: at.placed.filter((p) => p.key === `tested:${id}`).map((p) => p.box), ring: testRingGeom(geom, id) };
}

/** The marks for a view. `p` is the id prefix of the sheet's defs. */
/**
 * The view with the explanation's ghost marks folded in (a ghost of hatching with its ticks, a ghost of the red
 * wash), so they are placed like any other mark; `ghosts` names the places whose marks are only ghosts.
 */
function withGhost(view: PaperView): { view: PaperView; ghosts: Set<RegionId> } {
  const g = view.ghost;
  const ghosts = new Set<RegionId>();
  if (!g) return { view, ghosts };
  const states = { ...view.states };
  const clocks = { ...(view.clocks ?? {}) };
  if (g.pressed && !states[g.pressed]) {
    states[g.pressed] = 'pressed';
    if (g.ticks) clocks[g.pressed] = g.ticks;
    ghosts.add(g.pressed);
  }
  if (g.fighting && !states[g.fighting]) {
    states[g.fighting] = 'fighting';
    ghosts.add(g.fighting);
  }
  return { view: { ...view, states, clocks }, ghosts };
}

export function marksOf(given: PaperView, geom: SheetGeom, words: MapWords, p: string): MarkSet {
  const m: MarkSet = { press: [], fight: [], hold: [], clock: [], head: [], piece: [], prom: [], test: [], hw: [], stamp: [], redNames: new Set() };
  const known = (id: RegionId) => id in geom.shape;
  const { view, ghosts } = withGhost(given);
  const ghostCls = (id: RegionId) => (ghosts.has(id) ? ' pp-ghost' : '');
  const ghostKey = (id: RegionId) => (ghosts.has(id) ? ':ghost' : '');
  const at: Arrangement = arranged(view, geom, words);

  for (const [id, state] of Object.entries(view.states)) {
    if (!known(id)) continue;
    const d = geom.shape[id];
    if (state === 'pressed') {
      m.press.push({
        key: `press:${id}${ghostKey(id)}`,
        enter: 'fade',
        html: `<g class="pp-mk${ghostCls(id)}"><path d="${d}" fill="url(#${p}-hatch)" fill-opacity="0.95"/><path d="${d}" fill="none" stroke="#b5261b" stroke-width="1.1" stroke-opacity="0.55"/></g>`,
      });
    } else if (state === 'fighting') {
      m.fight.push({
        key: `fight:${id}${ghostKey(id)}`,
        enter: 'fade',
        html: `<g class="pp-mk${ghostCls(id)}"><path d="${d}" fill="#b3261e" fill-opacity="0.5" filter="url(#${p}-wash)"/><path d="${d}" fill="none" stroke="#8e1a12" stroke-width="1.4" stroke-opacity="0.7"/></g>`,
      });
      if (!ghosts.has(id)) m.redNames.add(id);
      const st = at.stamps.get(id)!;
      // An island's stamp is wider than the island: a paper knock-out under its letters keeps the coastline out of them.
      const knock = geom.island[id] ? `<rect x="-25" y="-6" width="50" height="12" fill="#efe2bf" fill-opacity="0.82"/>` : '';
      m.stamp.push({
        key: `stamp:${id}${ghostKey(id)}`,
        enter: 'slam',
        html:
          `<g class="pp-mk${ghostCls(id)}" transform="translate(${f1(st.x)} ${f1(st.y)}) rotate(${st.rot}) scale(${st.scale})" filter="url(#${p}-ink)" opacity="0.9"><g class="pp-slam">` +
          knock +
          `<rect x="-26" y="-7" width="52" height="14" fill="none" stroke="#a51d12" stroke-width="1.2"/>` +
          `<text class="pp-stamp-sm" x="0" y="3.6" text-anchor="middle">${esc(words.fighting)}</text></g></g>`,
      });
    }
  }

  for (const [id, c] of at.clocks) {
    m.clock.push({
      key: `clock:${id}:${c.n}${ghostKey(id)}`,
      enter: 'fade',
      html: `<g class="pp-mk pp-clockmk${ghostCls(id)}" data-n="${c.n}">${ticks(c.x, c.y, c.n, 'clock' + id)}</g>`,
    });
  }

  // A lifted counter: the places it can reach this week, pencilled round lightly (the second review: reach was learned one refusal at a time).
  // A dotted pencil circle inside each (round the island at sea), lighter than any promise ring and dotted, not dashed.
  for (const id of view.reach ?? []) {
    if (!known(id)) continue;
    const r = ringGeom(geom, id);
    const k = geom.island[id] ? 0.86 : 0.72;
    m.hold.push({
      key: `reach:${id}`,
      enter: 'fade',
      html: `<g class="pp-mk pp-reach"><path d="${geom.shape[id]}" fill="#2b2418" fill-opacity="0.07"/><ellipse cx="${f1(r.cx)}" cy="${f1(r.cy)}" rx="${f1(r.rx * k)}" ry="${f1(r.ry * k)}" fill="none" stroke="#2b2418" stroke-width="1.7" stroke-opacity="0.62" stroke-dasharray="0.1 3.4" stroke-linecap="round"/></g>`,
    });
  }

  if (view.pressed && known(view.pressed)) {
    const d = geom.shape[view.pressed];
    m.hold.push({
      key: `hold:${view.pressed}`,
      enter: 'none',
      html: `<g class="pp-mk pp-hold"><path d="${d}" fill="#2b2418" fill-opacity="0.09" stroke="#2b2418" stroke-width="2.2" stroke-opacity="0.5" stroke-linejoin="round"/></g>`,
    });
  }

  // The WORLD WAR chain: each place that fell numbered in red pencil in the order it fell, the first ringed.
  const chain = (view.chain ?? []).filter((id) => known(id) && view.states[id] === 'fighting');
  // Where each number goes is arrange.ts: beside its own stamp, clear of every other mark.
  chain.forEach((id, i) => {
    const c = at.chain.get(id);
    if (!c) return;
    m.stamp.push({
      key: `chain:${id}:${i + 1}`,
      enter: 'fade',
      html: `<g class="pp-mk pp-chain"><text class="pp-hw pp-hwred pp-chain-n" x="${f1(c.x)}" y="${f1(c.y)}" text-anchor="middle">${c.n}</text></g>`,
    });
    if (i === 0) {
      const r = testRingGeom(geom, id);
      m.test.push({ key: `chain-first:${id}`, enter: 'draw', html: `<g class="pp-mk"><path class="pp-ring pp-solid" pathLength="1" d="${greaseRing(r.cx, r.cy, r.rx, r.ry, seedOf('chain' + id), 1.45, 0.2, 1.2)}"/></g>` });
    }
  });

  for (const [key, a] of at.arrows) {
    const [from, to] = key.split(':');
    const { d, head } = pencilArrow([a.start, a.mid, a.end], seedOf(from + to));
    m.head.push({
      key: `arrow:${key}`,
      enter: 'draw',
      html:
        `<g class="pp-mk" fill="none" stroke="#2f2a24" stroke-width="1.7" stroke-opacity="0.85" stroke-linecap="round" stroke-linejoin="round" filter="url(#${p}-rough)">` +
        `<path class="pp-arrow" pathLength="1" d="${d}"/><path class="pp-arrow pp-arrow-head" pathLength="1" d="${head}"/>` +
        `<path class="pp-arrow" pathLength="1" d="${d}" stroke-width="0.6" stroke-opacity="0.5" transform="translate(0.9 0.7)"/></g>`,
    });
  }
  for (const [key, pin] of at.pins) m.head.push({ key: `pin:${key}`, enter: 'drop', html: `<g class="pp-mk">${pushpin(pin[0], pin[1], p)}</g>` });

  for (const piece of view.pieces) {
    const pos = at.pieces.get(piece.kind);
    if (!pos) continue;
    const { x, y } = pos;
    const label = piece.kind === 'fleet' ? words.fleet : words.brigade;
    const lifted = view.lifted === piece.kind;
    const l = LABEL_AT[pos.label];
    m.piece.push({
      key: `piece:${piece.kind}`,
      enter: 'fade',
      html:
        `<g class="pp-mk pp-piece" data-kind="${piece.kind}"><g class="pp-chit" transform="rotate(-9)">${counterGlyph(piece.kind, p)}</g>` +
        (label ? `<text class="pp-ct" x="${l.dx}" y="${l.dy}" text-anchor="${l.anchor}">${esc(label)}</text>` : '') +
        `</g>`,
      patch: (el) => {
        el.style.transform = `translate(${f1(x)}px, ${f1(y)}px)`;
        el.classList.toggle('pp-lift', lifted);
        el.setAttribute('data-at', piece.at);
      },
    });
  }

  const promised = view.promises.filter((pr) => known(pr.region));
  for (const pr of promised) {
    const r = ringGeom(geom, pr.region);
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
    const t = at.defend.get(pr.region)!;
    // A WE DEFEND that could not be written against its ring (the Scatter is crowded) is tied to it by a short pencil
    // leader, as a printed map ties a label to a small place, so it never reads as the island beside it.
    const lead = leaderFor(at, `defend:${pr.region}`, view.tested === pr.region ? testRingGeom(geom, pr.region) : r);
    m.hw.push({
      key: `hw:defend:${pr.region}`,
      enter: 'fade',
      html:
        `<g class="pp-mk">` +
        (lead ? `<path class="pp-leader" d="${pencilLine(lead[0][0], lead[0][1], lead[1][0], lead[1][1], seedOf('lead' + pr.region), 0.3)}"/>` : '') +
        `<text class="pp-hw" transform="translate(${f1(t.x)} ${f1(t.y)}) rotate(${t.rot.toFixed(1)})" text-anchor="middle">${esc(words.defend)}</text></g>`,
    });
  }

  if (at.tested) {
    const { id } = at.tested;
    const r = testRingGeom(geom, id);
    const d = greaseRing(r.cx, r.cy, r.rx, r.ry, seedOf('test' + id), 1.55, 0.6, 1.2);
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
    const t = at.tested;
    m.hw.push({
      key: `hw:tested:${id}`,
      enter: 'fade',
      html:
        `<g class="pp-mk"><text class="pp-hw pp-hwred" transform="translate(${f1(t.x)} ${f1(t.y)}) rotate(${t.rot})" text-anchor="middle">${esc(words.tested)}</text>` +
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
