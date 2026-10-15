/** Pure readings of the engine's trace for the playback (no DOM, no content), so they have tests. */
import type { HeatStep } from '../map';
import type { DayTrace, Heat, RegionId, TraceStep } from './engine';

/** The heat steps of a trace (or an arrival), as the map animates them, in order. */
export function heatSteps(steps: readonly TraceStep[]): HeatStep[] {
  const out: HeatStep[] = [];
  for (const s of steps) if (s.kind === 'heat') out.push({ region: s.region, from: s.from, to: s.to, source: s.source ?? null });
  return out;
}

/** The heats after these steps have been applied to `heats`. */
export function applySteps(heats: Readonly<Record<RegionId, Heat>>, steps: readonly HeatStep[]): Record<RegionId, Heat> {
  const out = { ...heats };
  for (const s of steps) out[s.region] = s.to;
  return out;
}

/**
 * A day's heat steps in two beats: what the choice did (the tag, the pieces, the consequences) and
 * what the night did (spread, pressure, flares). The engine's 'choice' checkpoint divides them; a
 * trace without one is all choice.
 */
export function splitDay(steps: readonly TraceStep[]): { choice: HeatStep[]; night: HeatStep[] } {
  const cut = steps.findIndex((s) => s.kind === 'danger' && s.at === 'choice');
  if (cut < 0) return { choice: heatSteps(steps), night: [] };
  return { choice: heatSteps(steps.slice(0, cut)), night: heatSteps(steps.slice(cut)) };
}

/** The roll step of a day, if a RISKY option was played. */
export function rollOf(trace: Pick<DayTrace, 'steps'>): { text: string; held: boolean } | null {
  const r = trace.steps.find((s) => s.kind === 'roll');
  return r && r.kind === 'roll' ? { text: r.text, held: r.held } : null;
}
