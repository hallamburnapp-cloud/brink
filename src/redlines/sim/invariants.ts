/**
 * What every game must keep true, week by week, read from the engine's own log (SPEC-SMALL "Rulings after the
 * recheck"): cause before effect on the tape, no place that falls and recovers in one week, the WAR count beside
 * every line equal to the sheet's, WORLD WAR naming the first place that fell and stayed fallen. The simulator
 * runs this on every game it plays (a broken invariant fails --strict), and the tests run it on their own games.
 * Pure: reads a finished (or unfinished) state, returns the broken rules in plain words.
 */
import { fightingRegions } from '../engine/board.ts';
import { firstFallen } from '../engine/debrief.ts';
import type { GameState, LogBeat, RegionId } from '../engine/types.ts';

/** The tape kinds that make a place fall (WAR +1). */
export const FALL_KINDS: readonly string[] = ['fell', 'waitedFell', 'spread'];
/** The tape kinds that step the ladder down, and so may quiet a place (the cause of a "Guns quiet at X"). */
export const STEP_DOWN_KINDS: readonly string[] = ['backed', 'backedFar', 'backedDownEased', 'summitAccepted', 'wayOutAccepted', 'easedStep'];
/** The answers that lose a place (the cause of its "X has fallen" in the same week). */
const LOSING_ANSWERS: readonly string[] = ['backedDown', 'backedDownEased', 'backFailed', 'bluffPulled'];
/** The lines that end a game, always last. */
const ENDINGS: readonly string[] = ['worldWar', 'treatySigned', 'frozen'];

/** Every broken rule in the game so far, as `week n: ...` lines (empty when the game kept them all). */
export function brokenInvariants(s: GameState): string[] {
  const out: string[] = [];
  let warBefore = 0;
  for (const w of s.log) {
    const at = (msg: string) => out.push(`week ${w.week}: ${msg}`);
    const beats: LogBeat[] = w.beats ?? [];
    if (beats.length !== w.visible.length) {
      at(`${w.visible.length} tape lines but ${beats.length} beats`);
      continue;
    }
    const fell = new Set<RegionId>();
    const back = new Set<RegionId>();
    let war = warBefore;
    beats.forEach((b, i) => {
      const before = beats.slice(0, i);
      const kinds = before.map((x) => x.kind);
      // The WAR count beside each line: +1 for a fall, −1 for a place quieted, nothing else moves it.
      const delta = (FALL_KINDS.includes(b.kind) ? 1 : 0) - (b.kind === 'recovered' ? 1 : 0);
      if (b.war !== war + delta) at(`"${w.visible[i]}" says WAR ${b.war}, the sheet was ${war} and the line moves it by ${delta}`);
      war = b.war;
      if (FALL_KINDS.includes(b.kind) && b.region) {
        if (back.has(b.region)) at(`${b.region} came back and fell again in the same week`);
        fell.add(b.region);
        // A place lost by an answer this week falls after the answer's line.
        const lostBy = beats.findIndex((x) => LOSING_ANSWERS.includes(x.kind) && x.region === b.region);
        if (lostBy > i) at(`"${w.visible[i]}" before its cause "${w.visible[lostBy]}"`);
      }
      if (b.kind === 'recovered') {
        if (!kinds.some((k) => STEP_DOWN_KINDS.includes(k))) at(`"${w.visible[i]}" with no step down before it`);
        if (b.region && fell.has(b.region)) at(`${b.region} fell and recovered in the same week`);
        if (b.region) back.add(b.region);
      }
      if (b.kind === 'calmed' && b.region && fell.has(b.region)) at(`${b.region} fell and was calm again in the same week`);
      // A step down is said on its own line, right after its cause, and the stamp eases on that line (the cold recheck).
      if (b.kind === 'easedStep' && !(i > 0 && ['backed', 'backedFar', 'wayOutAccepted'].includes(beats[i - 1].kind) && beats[i - 1].step === b.step + 1)) at(`"${w.visible[i]}" not right after the backing or the way out that eased them`);
      if (['backed', 'backedFar', 'wayOutAccepted'].includes(b.kind) && i > 0 && b.step < beats[i - 1].step) at(`"${w.visible[i]}" eases the stamp before its own line`);
      if (b.kind === 'lineCrossed' && !kinds.includes('lineCrossedAt')) at(`"${w.visible[i]}" before the line it names was crossed`);
      if (b.kind === 'takenStepUp' && !kinds.some((k) => k === 'fell' || k === 'waitedFell')) at(`"${w.visible[i]}" before any place fell`);
      if (b.kind === 'fellOutOfReach' && !before.some((x) => x.kind === 'fell' && x.region === b.region)) at(`"${w.visible[i]}" before the fall it explains`);
      if (b.kind === 'wayOutRefusedWhy' && beats[i - 1]?.kind !== 'wayOutRefused') at(`"${w.visible[i]}" not right after the refusal`);
      if (b.kind === 'blocSigned' && beats[i - 1]?.kind !== 'quietWeek') at(`"${w.visible[i]}" not right after a quiet week`);
      if (b.kind === 'quietWeek' && fell.size) at(`a quiet week in a week ${[...fell].join(', ')} fell`);
      if ((b.kind === 'gainedWeek' || b.kind === 'quietWeek') && beats.slice(i + 1).some((x) => FALL_KINDS.includes(x.kind))) at(`"${w.visible[i]}" before a fall of the same week`);
      if (ENDINGS.includes(b.kind) && i !== beats.length - 1) at(`"${w.visible[i]}" is not the last line`);
    });
    // No place both fell and recovered this week, by the state too.
    for (const [r, rec] of Object.entries(s.regions)) if (rec.fellWeek === w.week && rec.recoveredWeek === w.week) at(`${r} fell and recovered in week ${w.week}`);
    if (beats.length && w.danger.war !== war && (w.week < s.week || s.phase === 'ended')) at(`the week ends at WAR ${w.danger.war} but its last line says ${war}`);
    warBefore = w.week < s.week || s.phase === 'ended' ? w.danger.war : war;
  }
  if (s.war !== fightingRegions(s).length) out.push(`the state says WAR ${s.war} with ${fightingRegions(s).length} places fighting`);
  if (s.ending?.kind === 'war') {
    const first = firstFallen(s);
    if (!first || s.regions[first].state !== 'fighting') out.push(`WORLD WAR names ${first}, which is not fighting`);
    else if (!s.log.some((w) => (w.beats ?? []).some((b) => FALL_KINDS.includes(b.kind) && b.region === first))) out.push(`WORLD WAR names ${first}, which never fell on the tape`);
  }
  return out;
}
