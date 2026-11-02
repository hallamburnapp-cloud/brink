/**
 * The playback against the real engine (SPEC-SMALL "Rulings after the recheck"): real games, played by the
 * simulator's bots on the real pack, each resolve turned into the beats the screen plays, and every beat checked
 * against the engine's own facts for its line (WeekLog.beats). The WAR boxes are counted from the sheet the beat
 * draws, so "the WAR boxes always match the sheet" holds when that count equals the engine's on every beat; the
 * stamp and the bar are the engine's step and treaty beside the same line; and no place the playback washed red
 * is un-washed again inside the same week (a place that falls stays fallen that week).
 */
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../../../engine/rng';
import { answerPhone, endWeek, holdable, newGame, REGION_IDS, regionName, weeksLeft, type GameState, type RegionId } from '../../engine';
import { loadRedlinesContent } from '../../content/load';
import { BOTS, type BotName } from '../../sim/bots';
import { viewFromState } from '../paper/view';
import type { PaperView, PieceView } from '../paper/contract';
import { barMover, countFighting, newFacts, weekBeats, type Beat } from './beats';

// beats.ts reads words.ts, which reads the seam; the seam's own imports (the virtual pack) are the browser's, so the fake stands in for it.
vi.mock('./engine', async () => await import('./fakeEngine'));

const pack = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
const names = new Map(REGION_IDS.map((id) => [regionName(id), id]));
const idOf = (name: string): RegionId | null => names.get(name) ?? null;
const viewOf = (s: GameState): PaperView => viewFromState(s, (r) => holdable(s, r).ok, { weeksLeft: (r) => weeksLeft(s, r) });

function beatsOf(before: GameState, after: GameState): Beat[] {
  return weekBeats({
    before,
    after,
    headlines: pack.strings.headlines,
    idOf,
    holdable: (pieces: readonly PieceView[], region: RegionId) => holdable({ ...before, pieces: pieces.map((p) => ({ kind: p.kind, at: p.at })) }, region).ok,
    startView: viewOf(before),
    endView: viewOf(after),
    steps: pack.strings.words.steps,
    barMove: (kind, slots) => barMover({ willQuiet: 5, willBloc: 10, willWayOut: 15, willPerGain: 5, willHumiliated: 10 }, pack.strings.numbers)(kind, slots),
  });
}

interface Check {
  beats: number;
  resolves: number;
  wrong: string[];
}

/** Play one game under a bot, checking every resolve's beats against the engine's facts. */
function check(bot: BotName, seed: string, out: Check): void {
  const b = BOTS[bot];
  const rng = new Rng(`${bot}:${seed}`);
  let s = newGame(pack, seed);
  // The places the playback has washed red this week (both halves of a week around the phone), beyond those fighting as it began.
  let week = s.week;
  let washed = new Set<RegionId>();
  let fightingAtStart = new Set<RegionId>();
  for (let guard = 0; s.phase !== 'ended' && guard < 60; guard++) {
    const before = s.phase === 'act' ? b.act(pack, s, rng) : s;
    const after = before.phase === 'act' ? endWeek(pack, before) : answerPhone(pack, before, b.answer(pack, before, rng));
    if (before.week !== week || out.resolves === 0 || before.phase === 'act') {
      week = before.week;
      washed = new Set();
      fightingAtStart = new Set(REGION_IDS.filter((r) => before.regions[r].state === 'fighting'));
    }
    const facts = newFacts(before, after);
    const beats = beatsOf(before, after);
    out.resolves++;
    if (!facts) {
      out.wrong.push(`${bot} ${seed} week ${before.week}: no facts beside the lines`);
      break;
    }
    if (facts.length) expect(beats.length).toBe(facts.length);
    beats.forEach((beat, i) => {
      const f = facts[i];
      if (!f) return;
      out.beats++;
      const at = `${bot} ${seed} week ${before.week} "${beat.text}"`;
      if (beat.kind !== f.kind) out.wrong.push(`${at}: read as ${beat.kind}, the engine wrote ${f.kind}`);
      if (beat.war !== f.war) out.wrong.push(`${at}: the sheet shows ${beat.war} fighting, the engine says ${f.war}`);
      if (countFighting(beat.view) !== beat.war) out.wrong.push(`${at}: the WAR boxes say ${beat.war}, the sheet ${countFighting(beat.view)}`);
      if (beat.step !== f.step) out.wrong.push(`${at}: the stamp says step ${beat.step}, the engine ${f.step}`);
      if (beat.treaty !== f.treaty) out.wrong.push(`${at}: the bar says ${beat.treaty}, the engine ${f.treaty}`);
      for (const id of washed) if (beat.view.states[id] !== 'fighting') out.wrong.push(`${at}: ${id} fell and came back inside one week's playback`);
      for (const [id, st] of Object.entries(beat.view.states)) if (st === 'fighting' && !fightingAtStart.has(id)) washed.add(id);
      // A pressed place on the sheet carries its weeks left as ticks (the engine's weeksLeft), or none when it is answered.
      for (const [id, n] of Object.entries(beat.view.clocks ?? {})) if (beat.view.states[id] !== 'pressed' || n < 1 || n > 3) out.wrong.push(`${at}: ${id} carries ${n} ticks while ${beat.view.states[id] ?? 'calm'}`);
    });
    // The last beat is the engine's state.
    const last = beats[beats.length - 1];
    if (last && last.war !== after.war) out.wrong.push(`${bot} ${seed} week ${before.week}: the last beat shows ${last.war}, the state says ${after.war}`);
    s = after;
  }
}

describe('the playback against the real engine', () => {
  it('gives every beat the engine\'s kind, step and bar, and WAR boxes that match the sheet, in real games of every bot', () => {
    const out: Check = { beats: 0, resolves: 0, wrong: [] };
    const bots: BotName[] = ['sensible', 'careful', 'passive', 'far-promise', 'no-orders', 'seller', 'promise-everything'];
    for (const bot of bots) for (let i = 0; i < 40; i++) check(bot, `BEATS${i}`, out);
    expect(out.wrong.slice(0, 8)).toEqual([]);
    expect(out.resolves).toBeGreaterThan(1500);
    expect(out.beats).toBeGreaterThan(10_000);
  });
});
