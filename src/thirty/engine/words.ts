/**
 * Plain lines about what the engine did between a tap and the next card, for the UI's beats (the
 * watcher must be able to say why the number moved; SPEC "Why this version exists"). No game terms:
 * each step of the night becomes a short clause, the most important first. This is the one place
 * the night is put into words; the UI shows the line under its OVERNIGHT label.
 */
import { WAR } from './rules.ts';
import type { DayTrace, RegionId, TraceStep } from './types.ts';
import { regionName } from './world.ts';

type Heat = Extract<TraceStep, { kind: 'heat' }>;

/** The steps of the night: everything after the 'choice' checkpoint. */
export function nightSteps(trace: Pick<DayTrace, 'steps'>): TraceStep[] {
  const cut = trace.steps.findIndex((s) => s.kind === 'danger' && s.at === 'choice');
  return cut < 0 ? [] : trace.steps.slice(cut + 1);
}

/** 'Quillon', 'Quillon and Marram', 'Quillon, Marram and Shoal', 'Quillon, Marram and 2 other places'. */
export function listNames(ids: readonly RegionId[]): string {
  const names = [...new Set(ids)].map(regionName);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} other places`;
}

function groupBySource(steps: Heat[]): Map<RegionId, Heat[]> {
  const out = new Map<RegionId, Heat[]>();
  for (const s of steps) out.set(s.source!, [...(out.get(s.source!) ?? []), s]);
  return out;
}

/** One clause per source while there are two or fewer; a crowd is one clause. */
function bySource(steps: Heat[], one: (source: RegionId, regions: RegionId[]) => string, many: (regions: RegionId[]) => string): string[] {
  const groups = groupBySource(steps);
  if (groups.size <= 2) return [...groups.entries()].map(([src, g]) => one(src, g.map((x) => x.region)));
  return [many(steps.map((x) => x.region))];
}

/**
 * What the night did, in one plain sentence, from the steps after the choice: where the fighting
 * began, war spreading, a crisis tipping a neighbour into war or spilling over, a tense place
 * boiling over, trouble flaring somewhere calm, the news tomorrow's card brings, a policy's
 * penalty. Null when nothing happened. Example: `The war in Vessary spread to Edda Vale; trouble
 * flared in Quillon, Marram and Shoal.`
 */
export function nightLine(trace: Pick<DayTrace, 'steps'>): string | null {
  const steps = nightSteps(trace);
  const heats = steps.filter((s): s is Heat => s.kind === 'heat' && s.to !== s.from);
  const penalties = steps.filter((s) => s.kind === 'penalty');
  if (!heats.length && !penalties.length) return null;

  const up = heats.filter((s) => s.to > s.from);
  const war = up.filter((s) => s.why === 'war');
  const spread = up.filter((s) => s.why === 'spread' && s.source);
  const pressure = up.filter((s) => s.why === 'pressure');
  const tipped = pressure.filter((s) => s.source && s.source !== s.region && s.to === WAR);
  const spilled = pressure.filter((s) => s.source && s.source !== s.region && s.to < WAR);
  const boiled = pressure.filter((s) => !s.source || s.source === s.region);
  const flared = up.filter((s) => s.why === 'flare');
  const news = up.filter((s) => s.why === 'news');
  const named = new Set<Heat>([...war, ...spread, ...tipped, ...spilled, ...boiled, ...flared, ...news]);
  const otherUp = up.filter((s) => !named.has(s));
  const down = heats.filter((s) => s.to < s.from);

  const clauses: string[] = [];
  if (war.length) clauses.push(`the fighting began in ${listNames(war.map((s) => s.region))}`);
  clauses.push(
    ...bySource(
      spread,
      (src, regions) => `the war in ${regionName(src)} spread to ${listNames(regions)}`,
      (regions) => `the war spread to ${listNames(regions)}`,
    ),
  );
  clauses.push(
    ...bySource(
      tipped,
      (src, regions) => `the crisis in ${regionName(src)} tipped ${listNames(regions)} into war`,
      (regions) => `crises tipped ${listNames(regions)} into war`,
    ),
  );
  clauses.push(
    ...bySource(
      spilled,
      (src, regions) => `the crisis in ${regionName(src)} spilled into ${listNames(regions)}`,
      (regions) => `crises spilled into ${listNames(regions)}`,
    ),
  );
  if (boiled.length) clauses.push(`${listNames(boiled.map((s) => s.region))} boiled over`);
  if (flared.length) clauses.push(`trouble flared in ${listNames(flared.map((s) => s.region))}`);
  if (otherUp.length) clauses.push(`trouble grew in ${listNames(otherUp.map((s) => s.region))}`);
  if (news.length) clauses.push(`the morning brought bad news from ${listNames(news.map((s) => s.region))}`);
  if (down.length) {
    const hotline = down.filter((s) => s.piece === 'hotline');
    const rest = down.filter((s) => s.piece !== 'hotline');
    if (hotline.length) clauses.push(`the Hotline calmed ${listNames(hotline.map((s) => s.region))}`);
    if (rest.length) clauses.push(`${listNames(rest.map((s) => s.region))} calmed`);
  }
  for (const p of penalties) if (p.kind === 'penalty') clauses.push(`${p.text}: DANGER +${p.amount}`);

  const line = clauses.join('; ');
  return `${line[0].toUpperCase()}${line.slice(1)}.`;
}

/** What DANGER did overnight (after the choice, before the next card), signed. */
export function nightDelta(trace: Pick<DayTrace, 'dangerAfterChoice' | 'dangerAfter'>): number {
  return trace.dangerAfter - trace.dangerAfterChoice;
}
