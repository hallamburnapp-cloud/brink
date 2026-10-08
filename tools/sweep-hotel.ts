/**
 * Hotel balance sweep: runs the simulator over a grid of the three balance levers without
 * touching the pack on disk, and prints one row per cell against the B targets.
 *
 *   BRINK_CONTENT_DIR=content-hotel npx tsx tools/sweep-hotel.ts --drift 0,1,2 --scale 1,1.3 --start 65,55 --runs 300
 *
 * Levers: `drift` (rules.night.drift, the per-card sag of every bar), `scale` (effect_scale on
 * the night's acts), `start` (the seat's starting bars; money starts five lower).
 */
import type { Content, Seat } from '../src/engine/types';
import { simulate } from '../src/sim/simulate';
import { formatIssues, loadContent } from './load';

function list(flag: string, dflt: number[]): number[] {
  const i = process.argv.indexOf(flag);
  if (i < 0 || !process.argv[i + 1]) return dflt;
  return process.argv[i + 1].split(',').map(Number).filter((n) => Number.isFinite(n));
}
function num(flag: string, dflt: number): number {
  const i = process.argv.indexOf(flag);
  return i < 0 || !process.argv[i + 1] ? dflt : Number(process.argv[i + 1]);
}

function withLevers(base: Content, drift: number, scale: number, start: number): Content {
  const c = structuredClone(base);
  c.night.drift = drift;
  for (const a of c.nightActs) a.effect_scale = scale;
  for (const id of Object.keys(c.seats) as Seat[]) {
    const seat = c.seats[id];
    seat.meters = { ...seat.meters, public: start, military: start, allies: start, economy: start - 5 };
  }
  return c;
}

function main(): void {
  const { content, issues } = loadContent();
  if (issues.some((i) => i.level === 'error')) {
    console.error(formatIssues(issues));
    process.exit(1);
  }
  const drifts = list('--drift', [0, 1, 2]);
  const scales = list('--scale', [1, 1.3]);
  const starts = list('--start', [65, 55]);
  const runs = num('--runs', 300);
  console.log(`| drift | scale | start | careful dawn % | random dawn % | careful stars at 6:00, 1..5 | careful bar mean p10/p50/p90 | random stars at 6:00, 1..5 | top review % | B pass |`);
  console.log(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const drift of drifts)
    for (const scale of scales)
      for (const start of starts) {
        const c = withLevers(content, drift, scale, start);
        const r = simulate(c, { runs, policies: ['heuristic', 'random'], seats: 'all', seedBase: 'sweep', difficulty: 5, mode: 'night' });
        const h = r.policies.heuristic;
        const rnd = r.policies.random;
        const stars = (p: typeof h) => (p.stars ? p.stars.dawnDist.map((d) => Math.round(d)).join('/') : '—');
        const pass = r.targets.filter((t) => t.status === 'PASS').map((t) => t.id.replace('hotel_', '')).join(' ');
        const bm = h.stars ? `${h.stars.barMean.p10}/${h.stars.barMean.median}/${h.stars.barMean.p90}` : '—';
        console.log(`| ${drift} | ${scale} | ${start} | ${h.winRate} | ${rnd.winRate} | ${stars(h)} | ${bm} | ${stars(rnd)} | ${h.topEnding} ${h.topEndingShare} | ${pass || '—'} |`);
      }
}

main();
