/**
 * Every button and every map label tells the truth, over whole games on the shipped pack: the first
 * words promise what DANGER does, a `here` line says what heats, an `unchanged` line is never left
 * with only a calming clause, the line after a risky tap reads the same way, and a label fits the map.
 * This is the sweep the playtests ran by hand (ENGINE.md "What the playtests' numbers read now").
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { loadThirtyContent } from '../content/load.ts';
import { claimFor, claimOf, fit } from '../engine/hint.ts';
import { preview, todayOptions } from '../engine/preview.ts';
import { choose, newGame, pick, tapRegion } from '../engine/run.ts';
import { todayCard } from '../engine/cards.ts';
import type { GameState } from '../engine/types.ts';
import { regionName } from '../engine/world.ts';
import { sensibleBot } from './bots.ts';

const PACK = join(process.cwd(), 'content-thirty');
const { content } = loadThirtyContent(PACK);
/** The map's label width (src/thirty/ui/parts/MapPane.tsx MAP_LABEL_MAX). */
const LABEL_MAX = 46;
const GAMES = 150;

interface Seen {
  buttons: number;
  labels: number;
  lies: string[];
}

function sweep(games: number): Seen {
  const seen: Seen = { buttons: 0, labels: 0, lies: [] };
  const lie = (what: string) => seen.lies.length < 20 && seen.lies.push(what);
  for (let i = 0; i < games; i++) {
    const seed = `HINT${i}`;
    const rng = new Rng(`sweep:${seed}`);
    let s: GameState = newGame(content, seed);
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 80) {
      if (s.phase === 'offer') {
        s = pick(content, s, sensibleBot.pick(content, s, rng)).state;
        continue;
      }
      const card = todayCard(content, s)!;
      for (const o of todayOptions(content, s)) {
        const p = preview(content, s, o)!;
        seen.buttons++;
        const where = `${seed} day ${s.day} ${card.id} ${o}: "${p.hint}" (${p.dangerBefore} -> ${p.dangerAfter})`;
        const claim = claimOf(p.hint);
        if (claim === null) lie(`no DANGER word: ${where}`);
        else if (claim !== claimFor(p.dangerAfter - p.dangerBefore)) lie(`the first words lie: ${where}`);
        if (p.hint.length > 60) lie(`over 60: ${where}`);
        const heats = /\bheats? \b|goes? to war/.test(p.hint);
        if (/^Danger down here/.test(p.hint) && !heats) lie(`"here" with nothing heating: ${where}`);
        if (/^Danger unchanged · [^,]+ (calms|cools)$/.test(p.hint)) lie(`"unchanged" with only a calming: ${where}`);
        if (p.odds !== null && p.odds > 0 && p.odds < 100 && !p.hint.includes(`(${p.odds}%)`)) lie(`odds missing: ${where}`);
        if (card.map) {
          seen.labels++;
          const label = fit(p.hint, LABEL_MAX, regionName(o));
          if (label.length > LABEL_MAX) lie(`label over ${LABEL_MAX}: ${label}`);
          if (claimOf(label) !== claim) lie(`label changed the promise: ${label} from ${where}`);
          if (/^Danger down here/.test(label) && !/\bheats? \b|goes? to war/.test(label)) lie(`label "here" with nothing heating: ${label}`);
          if (/^Danger unchanged · [^,]+ (calms|cools)$/.test(label)) lie(`label "unchanged" with only a calming: ${label}`);
        }
      }
      const o = sensibleBot.option(content, s, rng);
      const p = preview(content, s, o)!;
      const r = card.map ? tapRegion(content, s, o) : choose(content, s, o as 'left' | 'right');
      expect(r.ok).toBe(true);
      const t = r.state.log[r.state.log.length - 1];
      const roll = t.steps.find((x) => x.kind === 'roll');
      if (roll && roll.kind === 'roll') {
        const delta = t.dangerAfterChoice - t.dangerBefore;
        const want = roll.held ? 'It worked · Danger ' : 'It failed · Danger ';
        const word = delta < 0 ? 'down' : delta > 0 ? 'up' : 'unchanged';
        if (!roll.text.startsWith(`${want}${word}`)) lie(`roll text: "${roll.text}" for ${delta} on ${seed} day ${s.day}`);
      } else if (t.dangerAfterChoice !== p.dangerAfter) lie(`preview ${p.dangerAfter} but the choice read ${t.dangerAfterChoice} on ${seed} day ${s.day} ${card.id}`);
      s = r.state;
    }
    expect(s.phase).toBe('over');
  }
  return seen;
}

describe('every hint tells the truth over whole games on the shipped pack', () => {
  const seen = sweep(GAMES);

  it('the first words promise what DANGER does, on every button and every map label', () => {
    expect(seen.buttons).toBeGreaterThan(GAMES * 20);
    expect(seen.labels).toBeGreaterThan(GAMES);
    expect(seen.lies, seen.lies.join('\n')).toEqual([]);
  });
});
