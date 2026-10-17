/**
 * The paper map controller: one SVG (the printed sheet, built once) with the marks as keyed layers
 * updated by diff. Nothing is redrawn per frame: the grain lives in its own static SVG (parts.tsx,
 * Grain), the sheet's filters are rendered once by the browser and cached, and an update touches
 * only the marks that changed.
 *
 *   const map = createPaperMap(host, { words });
 *   await map.update(view);          // PaperView (contract.ts); resolves when the new marks have settled
 *   map.hit(fx, fy);                 // frame px -> RegionId | null
 *   map.centre('LTL');               // frame px of the place, for a real tap
 *   map.setShift(CALL_SHIFT);        // the call: the sheet slides up under the handset
 */
import { EMPTY_VIEW, MAP_WORDS, type MapWords, type PaperMap, type PaperMapOptions, type PaperView, type RegionId, type UpdateOptions } from './contract';
import { FRAME, boundsOf, centreOf, getGeometry, hitFrame } from './geometry';
import { Layer, SETTLE_MS, marksOf } from './marks';
import { buildSheet } from './sheet';

const NS = 'http://www.w3.org/2000/svg';

export function createPaperMap(host: HTMLElement, opts: PaperMapOptions = {}): PaperMap {
  const p = opts.idPrefix ?? 'pp';
  const words: MapWords = { ...MAP_WORDS, ...opts.words, blocs: { ...MAP_WORDS.blocs, ...(opts.words?.blocs ?? {}) } };
  const geo = getGeometry();
  const sheet = buildSheet(words, p, FRAME, geo);

  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
  svg.setAttribute('class', 'pp-map');
  svg.setAttribute('viewBox', '0 0 390 844');
  svg.setAttribute('aria-label', opts.label ?? 'Situation map');
  svg.innerHTML = sheet.markup;
  if (opts.desk === false) svg.classList.add('pp-nodesk');
  host.appendChild(svg);

  const scratch = document.createElementNS(NS, 'g') as SVGGElement;
  const layer = (cls: string) => new Layer(svg.querySelector(`.pp-l-${cls}`) as SVGGElement, scratch);
  const layers = {
    press: layer('press'),
    fight: layer('fight'),
    hold: layer('hold'),
    head: layer('head'),
    piece: layer('piece'),
    prom: layer('prom'),
    test: layer('test'),
    hw: layer('hw'),
    stamp: layer('stamp'),
  };
  const names: Record<RegionId, SVGTextElement | null> = {};
  for (const id of Object.keys(sheet.geom.shape)) names[id] = svg.querySelector(`#${p}-nm-${id}`);
  let red = new Set<RegionId>();

  const systemReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reduced = opts.reducedMotion ?? systemReduced;
  let shift = 0;
  let first = true;
  let destroyed = false;

  const applyShift = () => {
    svg.style.transform = shift ? `translateY(${shift}px)` : '';
  };
  svg.classList.toggle('pp-reduced', reduced);
  if (opts.shift) {
    shift = opts.shift;
    applyShift();
  }

  function update(view: PaperView, o: UpdateOptions = {}): Promise<void> {
    if (destroyed) return Promise.resolve();
    const m = marksOf(view, sheet.geom, words, p);
    // The first view is the state of the world as the sheet is found: it is already on the paper.
    const animate = (o.animate ?? true) && !reduced && !first;
    first = false;
    let any = false;
    any = layers.press.set(m.press, animate) || any;
    any = layers.fight.set(m.fight, animate) || any;
    layers.hold.set(m.hold, false);
    any = layers.head.set(m.head, animate) || any;
    any = layers.piece.set(m.piece, animate) || any;
    any = layers.prom.set(m.prom, animate) || any;
    any = layers.test.set(m.test, animate) || any;
    any = layers.hw.set(m.hw, animate) || any;
    any = layers.stamp.set(m.stamp, animate) || any;
    for (const id of red) if (!m.redNames.has(id)) names[id]?.classList.remove('pp-red');
    for (const id of m.redNames) if (!red.has(id)) names[id]?.classList.add('pp-red');
    red = m.redNames;
    return any ? new Promise((r) => setTimeout(r, SETTLE_MS)) : Promise.resolve();
  }

  const api: PaperMap = {
    update,
    hit: (fx, fy) => hitFrame(geo, FRAME, fx, fy - shift),
    centre: (id) => {
      const c = centreOf(FRAME, id);
      return c && { x: c.x, y: c.y + shift };
    },
    bounds: (id) => {
      const b = boundsOf(geo, FRAME, id);
      return b && { x0: b.x0, y0: b.y0 + shift, x1: b.x1, y1: b.y1 + shift };
    },
    setShift: (px) => {
      shift = px;
      applyShift();
    },
    setReducedMotion: (r) => {
      reduced = r;
      svg.classList.toggle('pp-reduced', r);
    },
    svg,
    destroy: () => {
      destroyed = true;
      for (const l of Object.values(layers)) l.clear();
      svg.remove();
    },
  };
  return api;
}

export { EMPTY_VIEW };
