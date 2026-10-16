/**
 * Pressure at the end of every day (SPEC "Pressure"): each WAR region heats one CALM or TENSE
 * neighbour by one step (the red spreads); each CRISIS region has the spec's one-in-three chance to
 * heat one CALM or TENSE neighbour; and, from RULES.warFromCrisisDay, a CRISIS region that borders
 * another CRISIS region may push it to WAR, and a crisis that has stood RULES.crisisTipAfter nights
 * may go to WAR on its own, at chances that rise through the month (this is where red comes from:
 * orange left standing). The slide beyond the spec is small: a TENSE region may boil over on its own
 * late in the month, and a calm region flares about every other night, never one the choice cooled
 * today. Launch on Warning stops war spreading from a warned region; a guarded
 * region turns pressure away (silently, to another neighbour); the Spin Doctor's home and a warned
 * region under Launch on Warning absorb it instead, and the trace says so (the chip glows, the night
 * line names it). Regions are taken in map order from a snapshot of the heats as the day ended, so a
 * region heated tonight does not spread tonight.
 */
import type { Rng } from '../../engine/rng.ts';
import { CALM, CRISIS, RULES, TENSE, WAR, crisisPressureAt, crisisTipAt, flareAt, tensePressureAt, warFromCrisisAt } from './rules.ts';
import { REGION_IDS, neighboursOf, regionName } from './world.ts';
import type { Working } from './working.ts';

export function pressure(w: Working, rng: Rng): void {
  const snapshot = { ...w.heats };
  // A guard deflects; a piece's protection is left among the options so that it absorbs the heat and is seen to.
  const open = (n: string, max: number) => w.heats[n] <= max && w.protectedFrom(n, true) !== 'guarded';

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

  const crisisOdds = crisisPressureAt(w.day);
  const warOdds = warFromCrisisAt(w.day);
  const tipOdds = crisisTipAt(w.day);
  for (const r of REGION_IDS) {
    if (snapshot[r] !== CRISIS) continue;
    if (rng.next() < crisisOdds) {
      const options = neighboursOf(r).filter((n) => open(n, TENSE));
      if (options.length) w.heat(rng.pick(options), 1, 'pressure', { source: r, pressure: true });
    }
    // Two crises side by side: one may tip the other into war.
    if (warOdds > 0 && rng.next() < warOdds) {
      const beside = neighboursOf(r).filter((n) => snapshot[n] === CRISIS && w.heats[n] === CRISIS && w.protectedFrom(n, true) !== 'guarded');
      if (beside.length) w.heat(rng.pick(beside), 1, 'pressure', { source: r, pressure: true });
    }
    // A crisis left standing turns red (never one the choice cooled today: it is answered).
    const stood = w.day - (w.hotSince[r] ?? w.day);
    if (tipOdds > 0 && stood >= RULES.crisisTipAfter && w.heats[r] === CRISIS && !w.cooledToday.has(r) && rng.next() < tipOdds) {
      w.heat(r, 1, 'pressure', { source: r, pressure: true });
    }
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

  // Flares: trouble starts somewhere calm, never where the choice brought calm today.
  const flares = flareAt(w.day);
  if (flares > 0) {
    let n = Math.floor(flares);
    if (rng.next() < flares - n) n += 1;
    const calm = REGION_IDS.filter((r) => snapshot[r] === CALM && w.heats[r] === CALM && !w.cooledToday.has(r) && !w.protectedFrom(r, true));
    for (let i = 0; i < n && calm.length; i++) {
      const pick = rng.pick(calm);
      calm.splice(calm.indexOf(pick), 1);
      w.heat(pick, 1, 'flare', { pressure: true });
    }
  }
}
