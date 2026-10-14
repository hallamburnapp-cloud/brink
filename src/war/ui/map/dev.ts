/**
 * Dev harness for the map renderer (not shipped). Serve with `npx vite --port 5201 --strictPort`
 * and open /src/war/ui/map/dev.html?state=<name>. Named states render on a frozen clock at a fixed
 * moment (for screenshots, window.__ready turns true when drawn); ?state=play is a live table you
 * can tap, with a mock sweep that exercises every effect at real speed.
 */
import type { RegionId } from './contract';
import { createMapController, realClock, type Clock, type MapDevHooks } from './controller';
import { REGION, REGIONS, pairKey } from './data';
import { MAP_FONTS } from './draw';
import type { MapControllerPlus } from './extensions';
import { eventTimes, joinsAmong, makeView, SCENARIOS, type ViewSpec } from './dev-states';

declare global {
  interface Window {
    __ready?: boolean;
    __map?: MapControllerPlus & MapDevHooks;
    /** Play mode's mock table, for scripted checks. */
    __table?: () => { lit: RegionId[]; pinned: RegionId[]; flashpoint: RegionId };
  }
}

const params = new URLSearchParams(location.search);
const stateName = params.get('state') ?? 'play';
const reduced = params.has('reduced');
const canvas = document.getElementById('map') as HTMLCanvasElement;

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = `${import.meta.env.BASE_URL}war/fonts/fonts.css`;
document.head.appendChild(link);

function nav(): void {
  const states = document.getElementById('states')!;
  for (const name of ['play', ...Object.keys(SCENARIOS)]) {
    const a = document.createElement('a');
    a.href = `?state=${name}`;
    a.textContent = name;
    if (name === stateName) a.setAttribute('aria-current', 'page');
    states.appendChild(a);
  }
  document.getElementById('caption')!.textContent =
    stateName === 'play' ? 'Tap lit regions to pin them, then SWEEP.' : (SCENARIOS[stateName]?.title ?? 'Unknown state');
}

function button(label: string, onClick: () => void): void {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  document.getElementById('actions')!.appendChild(b);
}

async function fontsLoaded(): Promise<void> {
  await Promise.all(MAP_FONTS.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
}

/** A frozen scenario: effects are scripted on a manual clock, then one frame is drawn. */
async function renderScenario(name: string): Promise<void> {
  const sc = SCENARIOS[name];
  let t = 0;
  const clock: Clock = { ...realClock, now: () => t };
  const map = createMapController(canvas, { reducedMotion: reduced, speed: 1 }, { clock, maxScale: 3 });
  window.__map = map;
  map.update(makeView(sc.view));
  if (sc.script) sc.script(map, { at: (ms) => (t = ms) });
  else t = 2000;
  if (sc.capture !== undefined) t = sc.capture;
  await fontsLoaded();
  map.renderNow();
  await map.ready();
  showStats(map);
  window.__ready = true;
}

function showStats(map: MapDevHooks): void {
  const s = map.stats();
  document.getElementById('stats')!.textContent =
    `frames ${s.frames} · bakes ${s.bakes} · last frame ${s.lastFrameMs.toFixed(1)} ms · last bake ${s.lastBakeMs.toFixed(1)} ms`;
}

// ------------------------------------------------------------------ play mode

interface Table {
  lit: RegionId[];
  pinned: RegionId[];
  spent: RegionId[];
  traffic: Map<string, number>;
  brass: Record<RegionId, number>;
  scored: Record<RegionId, number>;
  flashpoint: RegionId;
  total: number;
  target: number;
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(prev?: Table): Table {
  const ids = shuffle(REGIONS.map((r) => r.id));
  return {
    lit: ids.slice(0, 8),
    pinned: [],
    spent: [],
    traffic: prev?.traffic ?? new Map(),
    brass: prev?.brass ?? {},
    scored: prev?.scored ?? {},
    flashpoint: ids[0],
    total: 0,
    target: 300,
  };
}

function specOf(t: Table, ring: number): ViewSpec {
  return {
    lit: t.lit,
    pinned: t.pinned,
    spent: t.spent,
    brass: t.brass,
    glow: Object.fromEntries(Object.entries(t.scored).map(([id, n]) => [id, Math.min(0.4, 0.03 * n)])),
    threads: [...t.traffic].map(([k, n]) => [...(k.split('|') as [string, string]), n] as [string, string, number]),
    flashpoint: t.flashpoint,
    ring,
    sweepOrder: true,
  };
}

function startPlay(): void {
  const map = createMapController(canvas, { reducedMotion: reduced, speed: Number(params.get('speed') ?? 1) });
  window.__map = map;
  let table = deal();
  let busy = false;
  const ring = () => Math.max(0, 1 - table.total / table.target);
  const render = () => map.update(makeView(specOf(table, ring())));
  render();
  window.__table = () => ({ lit: table.lit, pinned: table.pinned, flashpoint: table.flashpoint });

  canvas.addEventListener('pointerdown', (e) => {
    if (busy) return;
    const rect = canvas.getBoundingClientRect();
    const id = map.hit(((e.clientX - rect.left) / rect.width) * 390, ((e.clientY - rect.top) / rect.height) * 520);
    if (!id || !table.lit.includes(id)) return;
    if (table.pinned.includes(id)) table.pinned = table.pinned.filter((p) => p !== id);
    else if (table.pinned.length < 5) table.pinned = [...table.pinned, id];
    render();
  });

  button('Sweep', () => void sweep());
  button('New deal', () => {
    if (busy) return;
    map.fx.reset();
    table = deal(table);
    render();
  });
  button('Lights out', () => {
    if (busy) return;
    busy = true;
    void map.fx.lightsOut().then(() =>
      setTimeout(() => {
        map.fx.reset();
        busy = false;
      }, 600),
    );
  });
  button('Defect', () => {
    if (busy || table.lit.length < 3) return;
    const [src, a, b] = table.lit;
    void map.fx.inkSpread(src, [a, b]);
  });
  button('Speed 1/2/4', () => {
    const next = { 1: 2, 2: 4, 4: 1 }[Number(params.get('speed') ?? 1)] ?? 1;
    params.set('speed', String(next));
    map.setSpeed(next);
  });

  async function sweep(): Promise<void> {
    if (busy || table.pinned.length === 0) return;
    busy = true;
    const order = [...table.pinned].sort((a, b) => REGION[a].x - REGION[b].x || REGION[a].y - REGION[b].y);
    const joins = new Set(joinsAmong(order).map(([a, b]) => pairKey(a, b)));
    const times = eventTimes(order.length + (order.includes(table.flashpoint) ? 1 : 0));
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const t0 = performance.now();
    const until = async (ms: number) => sleep(Math.max(0, ms - (performance.now() - t0)));
    map.fx.dimExcept(order);
    let k = 0;
    let influence = 10;
    for (const id of order) {
      const passes = id === table.flashpoint ? 2 : 1;
      for (let pass = 0; pass < passes; pass++) {
        await until(times[k]);
        if (pass === 0) map.fx.scanTo(REGION[id].x);
        else map.fx.scanAgain(REGION[id].x);
        map.fx.flash(id);
        influence += REGION[id].weight;
        if (k === 2) map.fx.heat(true);
        if (pass === 0) {
          await until(times[k] + 60);
          for (const q of order.slice(0, order.indexOf(id))) if (joins.has(pairKey(id, q))) map.fx.pulseThread(q, id);
        }
        k++;
      }
    }
    await until(times[times.length - 1] + 400);
    const leverage = influence * (2 + joins.size);
    map.fx.heat(false);
    map.fx.scanTo(null);
    map.fx.dimExcept(null);
    for (const key of joins) table.traffic.set(key, (table.traffic.get(key) ?? 0) + 1);
    for (const id of order) table.scored[id] = (table.scored[id] ?? 0) + 1;
    table.total += leverage;
    table.spent = [...table.spent, ...table.pinned];
    table.lit = table.lit.filter((id) => !table.pinned.includes(id));
    table.pinned = [];
    const fresh = shuffle(REGIONS.map((r) => r.id).filter((id) => !table.lit.includes(id) && !table.spent.includes(id)));
    table.lit = [...table.lit, ...fresh.slice(0, 8 - table.lit.length)];
    render();
    if (table.total >= table.target) {
      await sleep(350);
      const top = order.reduce((a, b) => (REGION[b].weight > REGION[a].weight ? b : a));
      await map.fx.shockwave(table.flashpoint);
      table.brass[top] = (table.brass[top] ?? 0) + 1;
      render();
      await map.fx.dropBrass(top);
      await sleep(900);
      map.fx.reset();
      table = deal(table);
      render();
    }
    busy = false;
  }

  setInterval(() => showStats(map), 500);
  window.__ready = true;
}

nav();
if (stateName === 'play') startPlay();
else if (SCENARIOS[stateName]) void renderScenario(stateName);
