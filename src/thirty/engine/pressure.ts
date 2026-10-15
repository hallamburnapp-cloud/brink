/**
 * Pressure at the end of every day (SPEC "Pressure"): each WAR region heats one CALM or TENSE
 * neighbour by one step; each CRISIS region has a chance (the spec's one in three on day 1, sliding
 * to RULES.crisisPressureEnd by day 30) to heat one neighbour (ruling: a CRISIS neighbour may be
 * pushed to WAR); and, as the month slides, a TENSE region may boil over on its own. Launch on Warning stops war spreading from a warned
 * region; a guarded region turns pressure away; the Spin Doctor's home never heats. Regions are
 * taken in map order from a snapshot of the heats as the day ended, so a region heated tonight does
 * not spread tonight.
 */
import type { Rng } from '../../engine/rng.ts';
import { CALM, CRISIS, RULES, TENSE, WAR, crisisPressureAt, flareAt, tensePressureAt } from './rules.ts';
import { REGION_IDS, neighboursOf, regionName } from './world.ts';
import type { Working } from './working.ts';

export function pressure(w: Working, rng: Rng): void {
  const snapshot = { ...w.heats };
  const open = (n: string, max: number) => w.heats[n] <= max && !w.protectedFrom(n, true);

  for (const r of REGION_IDS) {
    if (snapshot[r] !== WAR) continue;
    const options = neighboursOf(r).filter((n) => open(n, TENSE));
    if (!options.length) continue;
    if (w.has('launch-on-warning') && w.warned.has(r)) {
      w.note('launch-on-warning', `War does not spread from ${regionName(r)}`);
      continue;
    }
    for (let i = 0; i < RULES.warSpreads && options.length; i++) {
      const pick = rng.pick(options);
      w.heat(pick, 1, 'spread', { source: r, pressure: true });
      options.splice(options.indexOf(pick), 1);
    }
  }

  const reach = RULES.crisisPressureReachesCrisis ? CRISIS : TENSE;
  const crisisOdds = crisisPressureAt(w.day);
  for (const r of REGION_IDS) {
    if (snapshot[r] !== CRISIS) continue;
    if (rng.next() >= crisisOdds) continue;
    const options = neighboursOf(r).filter((n) => open(n, reach));
    if (!options.length) continue;
    w.heat(rng.pick(options), 1, 'pressure', { source: r, pressure: true });
  }

  // The slide (tunable, off when the odds are 0): a TENSE region may boil over on its own.
  const tenseOdds = tensePressureAt(w.day);
  if (tenseOdds > 0) {
    for (const r of REGION_IDS) {
      if (snapshot[r] !== TENSE || w.heats[r] !== TENSE) continue;
      if (rng.next() >= tenseOdds) continue;
      w.heat(r, 1, 'pressure', { source: r, pressure: true });
    }
  }

  // Flares: trouble starts somewhere calm.
  const flares = flareAt(w.day);
  if (flares > 0) {
    let n = Math.floor(flares);
    if (rng.next() < flares - n) n += 1;
    const calm = REGION_IDS.filter((r) => snapshot[r] === CALM && w.heats[r] === CALM && !w.protectedFrom(r, true));
    for (let i = 0; i < n && calm.length; i++) {
      const pick = rng.pick(calm);
      calm.splice(calm.indexOf(pick), 1);
      w.heat(pick, 1, 'flare', { pressure: true });
    }
  }
}
