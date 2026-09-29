/**
 * Probe: where the danger dial sits when the crisis starts, per policy, and how the
 * crisis then goes. Read-only; prints a small table.
 *
 *   BRINK_SIM_LENIENT=1 npx tsx tools/probes/night-danger.ts [runs=1000]
 */
import { loadContent } from '../load';
import { runOne, type RunObserver } from '../../src/sim/simulate';
import { policyByName, type PolicyName } from '../../src/sim/policies';
import type { RunState, Seat } from '../../src/engine/types';

const runs = Number(process.argv[2] ?? 1000);
const { content } = loadContent();
const seats: Seat[] = ['republic', 'federation', 'coalition'];

function pct(n: number, d: number): string {
  return d ? `${((100 * n) / d).toFixed(1)}%` : '—';
}
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

for (const name of ['heuristic', 'greedy', 'random'] as PolicyName[]) {
  const atCrisis: number[] = [];
  const dawnByBand = new Map<string, { n: number; dawn: number; nuclear: number }>();
  let reached = 0;
  let dawn = 0;
  let nuclear = 0;
  for (let i = 0; i < runs; i++) {
    let start: number | null = null;
    const observer: RunObserver = {
      onCard() {},
      onEvents(events, state: RunState) {
        if (start === null && events.some((e) => e.type === 'flashpoint_start')) start = state.meters.escalation;
      },
    };
    const summary = runOne(content, { seed: `PROBE-${i}`, seat: seats[i % 3], policy: policyByName(name), mode: 'night', observer });
    if (start === null) continue;
    reached++;
    atCrisis.push(start);
    const kind = summary.kind;
    const isDawn = kind === 'standdown' || kind === 'survival';
    if (isDawn) dawn++;
    if (kind === 'nuclear') nuclear++;
    const band = start < 30 ? '<30' : start < 50 ? '30–49' : start < 70 ? '50–69' : start < 85 ? '70–84' : '85+';
    const b = dawnByBand.get(band) ?? { n: 0, dawn: 0, nuclear: 0 };
    b.n++;
    if (isDawn) b.dawn++;
    if (kind === 'nuclear') b.nuclear++;
    dawnByBand.set(band, b);
  }
  console.log(`\n== ${name}: ${reached}/${runs} reached the crisis; danger at 5:20 median ${quantile(atCrisis, 0.5)}, p25 ${quantile(atCrisis, 0.25)}, p75 ${quantile(atCrisis, 0.75)}; dawn ${pct(dawn, reached)}, nuclear ${pct(nuclear, reached)} of those`);
  for (const band of ['<30', '30–49', '50–69', '70–84', '85+']) {
    const b = dawnByBand.get(band);
    if (b) console.log(`   danger ${band.padEnd(6)} n=${String(b.n).padStart(4)}  dawn ${pct(b.dawn, b.n).padStart(6)}  nuclear ${pct(b.nuclear, b.n).padStart(6)}`);
  }
}
