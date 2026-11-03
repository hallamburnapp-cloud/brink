/**
 * The third recheck's findings in the engine's paths, one test (or more) each, and SPEC-SMALL's "Rulings after the third
 * recheck" as the engine reads them (docs/redlines/ENGINE.md, round 17).
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { loadRedlinesContent } from '../content/load.ts';
import { holdInfo, isAnswered, weeksLeft } from './board.ts';
import type { RedlinesContent } from './content.ts';
import { lessonsOf } from './debrief.ts';
import { fallsAnswerable, fallsThisWeek, ringsLeftDashed } from './forecast.ts';
import { makePhone } from './phone.ts';
import { RULES } from './rules.ts';
import { answerPhone, endWeek, newGame, promise } from './run.ts';
import { loadGame, saveGame } from './save.ts';
import { fixtureGame } from './testkit.ts';
import type { GameState, Heading, Line, RegionId } from './types.ts';
import { fill } from './words.ts';
import { REGION_IDS, isCap, regionName } from './world.ts';
import { brokenInvariants } from '../sim/invariants.ts';
import { BOTS } from '../sim/bots.ts';
import { playGame } from '../sim/play.ts';

const shipped = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
const pack = shipped as unknown as RedlinesContent;
const H = pack.strings.headlines;
const W = pack.strings.words;
const line = (kind: keyof typeof H, slots: Record<string, string> = {}) => {
  const t = fill(H[kind], slots);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const thoughts = (kind: string, slots: Record<string, string>) => (pack.debrief[kind as keyof typeof pack.debrief] ?? []).map((t) => fill(t, slots));

const quietLines: Line[] = [
  { id: 'farsouth-alliance', text: 'Any alliance with Farsouth is a line.', real: true },
  { id: 'cap-lanes', text: 'The sea lanes to the Cap stay open.', real: true },
  { id: 'missiles-north', text: 'No missiles north of Edda Vale.', real: false },
];
function staged(headings: Heading[], seed = 'r3'): GameState {
  const s = fixtureGame(seed);
  s.promises = [];
  s.pieces = [
    { kind: 'fleet', at: 'ASK' },
    { kind: 'brigade', at: 'EDV' },
  ];
  s.fed.headings = headings;
  s.fed.lines = quietLines.map((l) => ({ ...l }));
  s.fed.jumpiness = 0.3;
  s.collision = '';
  return s;
}

/**
 * Plays a game with the given answer to every call and no orders (the shoulder's passive hand), recording each week's note
 * as the act phase opens: the places it says fall this week, and which of them a piece of ours can still reach.
 */
function notesAndFalls(seed: string, answer: 'wait' | 'down' | 'back'): Array<{ week: number; far: RegionId[]; near: RegionId[]; s: GameState }> {
  let s = newGame(pack, seed);
  const out: Array<{ week: number; far: RegionId[]; near: RegionId[]; s: GameState }> = [];
  let k = 0;
  while (s.phase !== 'ended' && k++ < 80) {
    if (s.phase === 'act') {
      const falls = fallsThisWeek(s);
      const near = fallsAnswerable(s);
      const week = s.week;
      s = endWeek(pack, s);
      out.push({ week, far: falls.filter((r) => !near.includes(r)), near, s });
    } else s = answerPhone(pack, s, s.phone && answer === 'back' && s.influence < 24 ? 'wait' : answer);
  }
  return out.map((o) => ({ ...o, s }));
}

describe('out of reach means out of reach, by the note (SPEC-SMALL, the third recheck; the shoulder and cold blockers)', () => {
  it('U29 played passively: Kelpmouth, called out of reach by the week-3 note, falls without a step and without blame', () => {
    const weeks = notesAndFalls('U29', 'wait');
    const w3 = weeks.find((w) => w.week === 3)!;
    expect(w3.far).toContain('KLP');
    const end = w3.s;
    expect(end.regions.KLP.fellReach).toBe(false);
    const log = end.log.find((l) => l.week === 3)!;
    expect(log.visible).toContain(line('fellOutOfReach', { region: 'Kelpmouth', step: pack.strings.words.steps[log.danger.step - 1] }));
    expect(log.visible.some((v) => v.includes('Kelpmouth taken unanswered'))).toBe(false);
    expect(log.hidden.some((h) => h.includes('Nobody answered at Kelpmouth') || h.includes('You left Kelpmouth unanswered'))).toBe(false);
    expect(log.hidden).toEqual(expect.arrayContaining([thoughts('fallOutOfReach', { region: 'Kelpmouth' })[0]]));
  });

  it('across 40 passive games, no place the note called out of reach is counted reachable, and none it called reachable is "out of reach"', () => {
    let far = 0;
    let near = 0;
    for (let i = 0; i < 40; i++) {
      const seed = `U${i}`;
      let s = newGame(pack, seed);
      let k = 0;
      while (s.phase !== 'ended' && k++ < 80) {
        if (s.phase === 'act') {
          const falls = fallsThisWeek(s);
          const ans = fallsAnswerable(s);
          const week = s.week;
          s = endWeek(pack, s);
          while (s.phase === 'phone') s = answerPhone(pack, s, 'wait');
          for (const r of falls) {
            const rec = s.regions[r];
            // Only the places that fell by their clock this week (a WAIT's carried test is not in the note).
            if (rec.state !== 'fighting' || rec.fellWeek !== week || rec.fellBy !== 'unanswered') continue;
            const log = s.log.find((l) => l.week === week)!;
            if (ans.includes(r)) {
              near++;
              expect(rec.fellReach, `${seed} week ${week} ${r}`).toBe(true);
            } else {
              far++;
              expect(rec.fellReach, `${seed} week ${week} ${r}`).toBe(false);
              expect(log.visible.some((v) => v.startsWith(`${regionName(r)} taken unanswered`))).toBe(false);
            }
          }
          expect(brokenInvariants(s)).toEqual([]);
        } else s = answerPhone(pack, s, 'wait');
      }
    }
    expect(far).toBeGreaterThan(0);
    expect(near).toBeGreaterThan(0);
  });

  it('the note\'s marks survive a save and a reload, and a bad mark is refused', () => {
    let s = newGame(pack, 'U29');
    while (s.week < 3 && s.phase !== 'ended') {
      s = endWeek(pack, s);
      while (s.phase === 'phone') s = answerPhone(pack, s, 'wait');
    }
    expect(s.regions.KLP.noteFar).toBe(true);
    const back = loadGame(saveGame(s))!;
    expect(back.regions.KLP.noteFar).toBe(true);
    const bad = JSON.parse(saveGame(s));
    const body = bad.state ?? bad;
    body.regions.KLP.noteFar = 'yes';
    expect(loadGame(JSON.stringify(bad))).toBeNull();
  });

  it('the bots\' games keep the same agreement (careful, sensible, shark-quiet, passive), and the invariants hold', () => {
    for (const bot of ['careful', 'sensible', 'shark-quiet', 'passive'] as const) {
      for (let i = 0; i < 15; i++) {
        const r = playGame(pack, BOTS[bot], `${bot}-n${i}`);
        expect(r.brokenFirst, `${bot} ${i}`).toBeNull();
      }
    }
  });
});

describe('an out-of-reach fall is war, not a failure (SPEC-SMALL, the third recheck; the niche and cold majors)', () => {
  it('fills its WAR box, costs nothing on the bar, is no quiet week, and they still do not sign over it', () => {
    const s = staged([{ from: 'NWK', to: 'VSY', real: false }, { from: 'KLM', to: 'QLN', real: false }]);
    s.week = 5;
    s.fed.will = RULES.willSign;
    s.treaty = RULES.willSign;
    // Tallowmere is inland in the Sound: nothing of ours can ever reach it.
    s.regions.TLM = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3, noteFar: true };
    let n = endWeek(pack, s);
    while (n.phase === 'phone') n = answerPhone(pack, n, 'down');
    expect(n.regions.TLM.state).toBe('fighting');
    expect(n.regions.TLM.fellReach).toBe(false);
    expect(n.war).toBe(s.war + 1);
    expect(n.treaty).toBe(RULES.willSign);
    expect(n.log[0].visible.some((v) => v.startsWith('A quiet week'))).toBe(false);
    expect(n.ending).toBeNull();
    expect(n.log[0].visible).toContain(line('noSignTaken'));
  });

  it('the bar-at-100 lesson keeps the first week it did not sign (the shoulder and cold minors)', () => {
    const s = staged([]);
    s.tally!.noSign = { week: 5, taken: false, regions: ['RMH'] };
    s.week = 6;
    s.fed.will = RULES.willSign;
    s.treaty = RULES.willSign;
    s.regions.TLM = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3, noteFar: true };
    let n = endWeek(pack, s);
    while (n.phase === 'phone') n = answerPhone(pack, n, 'down');
    expect(n.tally!.noSign).toEqual({ week: 5, taken: false, regions: ['RMH'] });
    const lessons = lessonsOf(pack, n, 'frozen');
    expect(lessons[0]).toContain('week 5');
    expect(lessons[0]).toContain('Rimeholt');
  });
});

describe('a provocation costs what it claims, dashed too (the shoulder major)', () => {
  // A hatched place nothing of ours holds, their real arrow on it.
  const far = (): { s: GameState; region: RegionId } => {
    const base = staged([]);
    const region = REGION_IDS.find((r) => !isCap(r) && !holdInfo(base, r).ok && !quietLines.some(() => false) && r !== 'TLM' && r !== 'BRK' && r !== 'DNM' && ['DRF', 'KLP', 'LTL', 'SHL', 'RMH', 'GUL'].includes(r))!;
    const s = staged([{ from: 'NWK', to: region, real: true }, { from: 'KLM', to: 'QLN', real: false }]);
    s.regions[region] = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    s.fed.belief = 30;
    s.fed.step = 2;
    s.influence = 60;
    return { s, region };
  };
  it('backed and held, a dashed provocation buys the pause only: no step down, no turn-away, no restarted clock, no fall that week', () => {
    let seen = 0;
    for (let i = 0; i < 12 && seen < 2; i++) {
      const { s, region } = far();
      s.seed = `dash-${i}`;
      const r = promise(s, region);
      if (!r.ok) throw new Error(r.reason);
      expect(r.state.promises.find((p) => p.region === region)?.provocation).toBe(true);
      expect(holdInfo(r.state, region).ok).toBe(false);
      const rang = endWeek(pack, r.state);
      expect(rang.phone?.region).toBe(region);
      const ticked = rang.regions[region].pressedWeeks;
      const n = answerPhone(pack, rang, 'back');
      const log = n.log[n.log.length - 1];
      if (!log.visible.includes(line('backedFar', { region: regionName(region) }))) continue;
      seen++;
      expect(n.fed.step).toBe(2);
      expect(n.turnedAway[region]).toBeUndefined();
      expect(log.visible).not.toContain(line('easedStep', { step: 'TESTING' }));
      expect(log.hidden).toEqual(expect.arrayContaining([thoughts('provokedBacked', { region: regionName(region) })[0]]));
      expect(log.hidden.some((h) => h.includes('turned away'))).toBe(false);
      // The pause: this week's tick taken back, so the clock stands as the sheet showed it at SEND ORDERS.
      expect(n.regions[region].state).toBe('pressed');
      expect(n.regions[region].pressedWeeks).toBe(ticked - 1);
      expect(brokenInvariants(n)).toEqual([]);
    }
    expect(seen).toBeGreaterThan(0);
  });
  it('at its last tick, backed and held, it does not fall the same week', () => {
    let seen = 0;
    for (let i = 0; i < 12 && seen < 1; i++) {
      const { s, region } = far();
      s.seed = `dash-last-${i}`;
      s.regions[region] = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 3 };
      const r = promise(s, region);
      if (!r.ok) throw new Error(r.reason);
      const rang = endWeek(pack, r.state);
      expect(rang.phone?.region).toBe(region);
      const n = answerPhone(pack, rang, 'back');
      const log = n.log[n.log.length - 1];
      if (!log.visible.includes(line('backedFar', { region: regionName(region) }))) continue;
      seen++;
      expect(n.regions[region].state).toBe('pressed');
      expect(log.visible).not.toContain(line('fell', { region: regionName(region) }));
      expect(weeksLeft(n, region)).toBe(1);
      expect(brokenInvariants(n)).toEqual([]);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('the call says what it costs before you pay (the shoulder and cold majors)', () => {
  it('SEND THEM says which solid rings the piece would leave dashed, as the MOVE slip does', () => {
    // Vessary at its last tick, nobody's promise, within the brigade's one move; a solid ring the brigade alone holds.
    const s = staged([]);
    s.pieces[0].at = 'LNK';
    s.regions.VSY = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 2 };
    const ringed = REGION_IDS.find((r) => r !== 'VSY' && !isCap(r) && s.regions[r].state === 'calm' && ringsLeftDashed({ ...s, promises: [{ region: r, since: 1, inherited: false }] }, 'brigade', 'VSY').includes(r));
    expect(ringed).toBeTruthy();
    s.promises = [{ region: ringed!, since: 1, inherited: false }];
    expect(holdInfo(s, 'VSY').piece?.kind).toBe('brigade');
    const p = makePhone(pack, s, new Rng('send'), { kind: 'fall-unpromised', region: 'VSY', round: 1 })!;
    const back = p.options.find((o) => o.key === 'back')!;
    expect(back.cost).toContain(fill(W.leavesDashed!, { region: regionName(ringed!) }));
    // Nothing to leave dashed: the form says nothing of it.
    const bare = staged([]);
    bare.pieces[0].at = 'LNK';
    bare.regions.VSY = { state: 'pressed', pressedWeeks: 2, quietWeeks: 0, clock: 2 };
    const q = makePhone(pack, bare, new Rng('send'), { kind: 'fall-unpromised', region: 'VSY', round: 1 })!;
    expect(q.options.find((o) => o.key === 'back')!.cost).not.toContain('dashed');
  });

  it('BACK IT on a ring nothing of ours holds says it may fail; a held ring keeps its own words', () => {
    const s = staged([{ from: 'NWK', to: 'KLP', real: true }]);
    s.promises = [{ region: 'KLP', since: 0, inherited: true }];
    expect(holdInfo(s, 'KLP').ok).toBe(false);
    const p = makePhone(pack, s, new Rng('far'), { kind: 'test', region: 'KLP', round: 1 })!;
    const back = p.options.find((o) => o.key === 'back')!.cost;
    expect(back).toBe(fill(W.backFar!, { cost: RULES.backFarCost }));
    expect(back).not.toContain('we keep');
    const held = staged([{ from: 'NWK', to: 'VSY', real: true }]);
    held.promises = [{ region: 'VSY', since: 0, inherited: false }];
    expect(holdInfo(held, 'VSY').ok).toBe(true);
    const q = makePhone(pack, held, new Rng('far'), { kind: 'test', region: 'VSY', round: 1 })!;
    expect(q.options.find((o) => o.key === 'back')!.cost).not.toContain('may fail');
  });
});

describe('the debrief and the tape say a thing once, and truly (the shoulder minors)', () => {
  it('the plain "both arrows were real" is said once a game, like the timetable line', () => {
    const plain = new Set(thoughts('bothReal', {}));
    let said = 0;
    for (const seed of ['TWQ-MUX', 'SH4-QNT', ...Array.from({ length: 30 }, (_, i) => `both-${i}`)]) {
      const games = notesAndFalls(seed, 'wait');
      const end = games[games.length - 1]?.s;
      if (!end) continue;
      const n = end.log.reduce((a, l) => a + l.hidden.filter((h) => plain.has(h)).length, 0);
      said += n;
      expect(n, seed).toBeLessThanOrEqual(1);
    }
    expect(said).toBeGreaterThan(0);
  });
  it('a scared back-down says they ease off, never that they stand down (the place still falls)', () => {
    expect(H.backedDownEased).not.toContain('stand down');
    expect(H.backedDownEased).toContain('ease off');
  });
  it('the note\'s out-of-reach sentence says "now" (it is true as of the orders given)', () => {
    expect(shipped.strings.note.fallsOneFar.endsWith('now.')).toBe(true);
    expect(shipped.strings.note.fallsManyFar.endsWith('now.')).toBe(true);
  });
  it('isAnswered is unchanged for a solid ring (a sanity check on the staging)', () => {
    const s = staged([]);
    s.promises = [{ region: 'VSY', since: 1, inherited: false }];
    s.regions.VSY = { state: 'pressed', pressedWeeks: 1, quietWeeks: 0, clock: 3 };
    expect(isAnswered(s, 'VSY')).toBe(true);
  });
});
