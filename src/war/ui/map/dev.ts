/**
 * Dev harness for the map renderer (not shipped). Serve with `npx vite --port 5301 --strictPort`
 * and open /src/war/ui/map/dev.html?state=<name>. Named states render on a frozen clock at a fixed
 * moment (for screenshots, window.__ready turns true when drawn); ?state=play is a live table with
 * a mock turn loop (touching pins, a preview, the send's cascade, gold and red ink, war spreading
 * every 3rd turn) that exercises every effect at real speed. The mock rules only approximate the
 * engine's; they are here to watch the map, not to play the game.
 */
import type { InkColour, MapController, Owner, RegionId } from './contract';
import { createMapController, realClock, type Clock, type MapDevHooks } from './controller';
import { LAND_JOINS, REGION, REGIONS, SEA_LANES } from './data';
import { MAP_FONTS } from './draw';
import { canAdd, makeView, SCENARIOS, type ViewSpec } from './dev-states';
import { westEast } from './scene';

declare global {
  interface Window {
    __ready?: boolean;
    __map?: MapController & MapDevHooks;
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
    stateName === 'play' ? 'Tap lit regions that touch, then SEND.' : (SCENARIOS[stateName]?.title ?? 'Unknown state');
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

// ------------------------------------------------------------------ play mode (a mock turn loop)

const ADJ = new Map<RegionId, RegionId[]>(REGIONS.map((r) => [r.id, []]));
for (const [a, b] of [...LAND_JOINS, ...SEA_LANES]) {
  ADJ.get(a)!.push(b);
  ADJ.get(b)!.push(a);
}

function joinsFrom(src: RegionId): Map<RegionId, number> {
  const d = new Map([[src, 0]]);
  const todo = [src];
  while (todo.length) {
    const x = todo.shift()!;
    for (const n of ADJ.get(x)!) {
      if (d.has(n)) continue;
      d.set(n, d.get(x)! + 1);
      todo.push(n);
    }
  }
  return d;
}

/** The shortest chain of joins between two regions, both ends included. */
function chain(a: RegionId, b: RegionId): RegionId[] {
  const prev = new Map<RegionId, RegionId>([[a, a]]);
  const todo = [a];
  while (todo.length) {
    const x = todo.shift()!;
    if (x === b) break;
    for (const n of ADJ.get(x)!) {
      if (prev.has(n)) continue;
      prev.set(n, x);
      todo.push(n);
    }
  }
  const out = [b];
  while (out[0] !== a) out.unshift(prev.get(out[0])!);
  return out;
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Game {
  owner: Record<RegionId, Owner>;
  turn: number;
  crisis: RegionId;
  lit: RegionId[];
  pins: RegionId[];
  brass: RegionId[];
}

const target = (t: number) => Math.round(64 * Math.pow(1.5, t - 1));
const ids = (g: Game, o: Owner) => REGIONS.map((r) => r.id).filter((id) => g.owner[id] === o);

function score(g: Game): number {
  const pts = g.pins.reduce((s, id) => s + REGION[id].weight, 0);
  return pts * g.pins.length * (g.pins.includes(g.crisis) ? 2 : 1);
}

function regionsWon(g: Game): number {
  const T = target(g.turn);
  const s = score(g);
  let n = 0;
  for (let mark = T, i = 0; s >= mark; i++, mark = i < 2 ? mark * 4 : mark * 2) n++;
  return n;
}

/** Pin it to claim it: the crisis, then pinned regions that are not gold, then the nearest others. */
function winOrder(g: Game, k: number): RegionId[] {
  const d = joinsFrom(g.crisis);
  const pinned = (id: RegionId) => (g.pins.includes(id) ? 0 : 1);
  const cand = REGIONS.filter((r) => r.id !== g.crisis && g.owner[r.id] !== 'gold').sort(
    (a, b) =>
      pinned(a.id) - pinned(b.id) ||
      d.get(a.id)! - d.get(b.id)! ||
      (g.owner[a.id] === 'red' ? 0 : 1) - (g.owner[b.id] === 'red' ? 0 : 1) ||
      b.weight - a.weight ||
      a.x - b.x ||
      a.y - b.y,
  );
  return [g.crisis, ...cand.slice(0, k - 1).map((r) => r.id)];
}

function warTarget(g: Game): RegionId | null {
  const gold = ids(g, 'gold');
  const cand = ids(g, 'grey').filter((id) => ADJ.get(id)!.some((n) => g.owner[n] === 'red'));
  const near = (id: RegionId) => Math.min(...gold.map((x) => joinsFrom(id).get(x) ?? 99));
  return cand.sort((a, b) => near(a) - near(b) || REGION[b].weight - REGION[a].weight)[0] ?? null;
}

function deal(g: Game): void {
  const grey = ids(g, 'grey');
  const touching = grey.filter((id) => ADJ.get(id)!.some((n) => g.owner[n] === 'gold'));
  const push = ids(g, 'red').filter((id) => ADJ.get(id)!.some((n) => g.owner[n] === 'gold'));
  g.crisis = shuffle(touching.length ? touching : grey.length ? grey : push)[0];
  const d = joinsFrom(g.crisis);
  g.lit = shuffle(REGIONS.map((r) => r.id).filter((id) => id !== g.crisis && g.owner[id] !== 'red' && d.get(id)! <= 3)).slice(0, 10);
  g.pins = [];
}

function specOf(g: Game, warNext: RegionId | null): ViewSpec {
  const won = regionsWon(g);
  const turns = 3 - ((g.turn - 1) % 3);
  return {
    gold: ids(g, 'gold'),
    red: ids(g, 'red'),
    lit: g.lit,
    pinned: g.pins,
    crisis: { id: g.crisis, target: target(g.turn).toLocaleString('en-GB') },
    preview: g.pins.length ? (won ? winOrder(g, won) : 'miss') : null,
    warNext: warNext ? { id: warNext, turns } : null,
    brass: g.brass,
  };
}

function startPlay(): void {
  const map = createMapController(canvas, { reducedMotion: reduced, speed: Number(params.get('speed') ?? 1) });
  window.__map = map;
  const owner = Object.fromEntries(REGIONS.map((r) => [r.id, 'grey' as Owner]));
  owner.LNK = 'gold';
  for (const id of ['DNM', 'ORN', 'FLE']) owner[id] = 'red';
  const game: Game = { owner, turn: 1, crisis: 'SHL', lit: [], pins: [], brass: [] };
  let busy = false;
  const render = (spec?: Partial<ViewSpec>) => map.update(makeView({ ...specOf(game, warTarget(game)), ...spec }));
  const newTurn = () => {
    deal(game);
    map.lightUp(game.lit, 110);
    render();
  };
  newTurn();

  canvas.addEventListener('pointerdown', (e) => {
    if (busy) return;
    const rect = canvas.getBoundingClientRect();
    const id = map.hit(((e.clientX - rect.left) / rect.width) * 390, ((e.clientY - rect.top) / rect.height) * 520);
    if (!id || !(game.lit.includes(id) || id === game.crisis)) return;
    if (game.pins.includes(id)) game.pins = game.pins.filter((p) => p !== id);
    else if (canAdd(id, game.pins)) game.pins = [...game.pins, id];
    render();
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms / Number(params.get('speed') ?? 1)));

  async function claim(id: RegionId, from: RegionId, colour: InkColour, ms: number): Promise<void> {
    game.owner[id] = colour;
    render({ crisis: null, pinned: [] });
    await map.fx.inkSpread(from, [id], colour, ms);
  }

  async function send(): Promise<void> {
    if (busy || !game.pins.length) return;
    busy = true;
    const won = regionsWon(game);
    const order = [...game.pins].sort(westEast);
    map.fx.dimExcept(order);
    await sleep(150);
    for (const [i, id] of order.entries()) {
      map.fx.scanTo(REGION[id].x);
      map.fx.flash(id);
      if (i) map.fx.pulseThread(order[i - 1], id);
      await sleep(260);
    }
    map.fx.scanTo(null);
    if (game.pins.includes(game.crisis)) {
      map.fx.ringStamp();
      await sleep(320);
    }
    if (won >= 10 && game.pins.length) map.fx.bloom(game.crisis, '#F2D27A');
    map.fx.dimExcept(null);
    if (won) {
      await map.fx.ringCollapse();
      void map.fx.shockwave(game.crisis);
      if (!game.brass.includes(game.crisis)) game.brass = [...game.brass, game.crisis];
      await claim(game.crisis, game.crisis, 'gold', 600);
      for (const id of winOrder(game, won).slice(1)) {
        const path = chain(game.crisis, id);
        await map.fx.travel(path, 'gold');
        await claim(id, path[path.length - 2], 'gold', 400);
      }
    } else {
      const red = ADJ.get(game.crisis)!.find((n) => game.owner[n] === 'red');
      await claim(game.crisis, red ?? game.crisis, 'red', 700);
    }
    if (game.turn % 3 === 0) {
      const t = warTarget(game);
      if (t) {
        await sleep(500);
        const from = ADJ.get(t)!.find((n) => game.owner[n] === 'red')!;
        await claim(t, from, 'red', 700);
      }
    }
    await sleep(400);
    const red = ids(game, 'red').length;
    const gold = ids(game, 'gold').length;
    if (red >= 10) await map.fx.lightsOut();
    else if (gold === 30) await map.fx.wave(game.crisis, 'gold', 1600);
    else {
      map.fx.reset();
      game.turn++;
      newTurn();
    }
    busy = false;
  }

  button('Send', () => void send());
  button('Swap', () => {
    if (busy) return;
    const d = joinsFrom(game.crisis);
    const fresh = shuffle(REGIONS.map((r) => r.id).filter((id) => id !== game.crisis && game.owner[id] !== 'red' && !game.lit.includes(id) && d.get(id)! <= 3));
    const keep = game.lit.filter((id) => game.pins.includes(id));
    const add = fresh.slice(0, game.lit.length - keep.length);
    game.lit = [...keep, ...add];
    map.lightUp(add, 110);
    render();
  });
  button('Intro wave', () => void map.fx.wave('LNK', 'gold'));
  button('Speed 1/2/4', () => {
    const next = { 1: 2, 2: 4, 4: 1 }[Number(params.get('speed') ?? 1)] ?? 1;
    params.set('speed', String(next));
    map.setSpeed(next);
  });

  setInterval(() => showStats(map), 500);
  window.__ready = true;
}

nav();
if (stateName === 'play') startPlay();
else if (SCENARIOS[stateName]) void renderScenario(stateName);
