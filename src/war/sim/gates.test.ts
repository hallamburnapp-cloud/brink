/**
 * SPEC sections 15 and 16 in CI: every case of docs/war/v2/reference/fixtures.json replayed through
 * the engine with no difference, and the 17 simulator gates on a fixed 300-game sample per bot. On
 * a sample this size each gate is allowed its sampling noise (about two standard errors, or the
 * order-statistic interval for medians); the full-size run is `npx tsx tools/war-sim.ts`, where the
 * thresholds apply exactly (docs/war/v2/SIM-REPORT.md). Where python3 is installed, a few games per
 * bot are also played again by the Python reference on the same random streams (replay.py).
 */
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { crosscheckFixtures, crosscheckText } from './crosscheck';
import { GATES } from './gates';
import { runReplay } from './replay';
import { simulate, type SimResults } from './simulate';

const hasPython = spawnSync('python3', ['--version']).status === 0;

describe('cross-check: the reference fixtures through the engine', () => {
  const r = crosscheckFixtures();

  it('replays every case with no difference', () => {
    expect(r.ok, crosscheckText(r)).toBe(true);
  });

  it('covers every kind of case', () => {
    const cases = Object.fromEntries(r.sections.map((s) => [s.name, s.cases]));
    expect(cases).toEqual({
      'map and tunables': 2,
      staff: 10,
      targets: 40,
      score: 400,
      ladder: 200,
      'legal, groups and lift': 500,
      'win order and war spread': 350,
      'FIRST-WORLD game': 2,
    });
  });
});

describe('simulator gates (SPEC section 16) on 300 games per bot', () => {
  let res: SimResults;

  it('plays 300 games with each of the six bots', async () => {
    res = await simulate({ games: 300, prefix: 'W' });
    for (const s of Object.values(res.stats)) expect(s?.n).toBe(300);
    expect(res.gates.map((g) => g.id)).toEqual(GATES.map((g) => g.id));
    expect(res.gates).toHaveLength(17);
  }, 60_000);

  for (const spec of GATES) {
    it(`${spec.id} ${spec.title}: ${spec.threshold}`, () => {
      const g = res.gates.find((x) => x.id === spec.id)!;
      expect(g.passLoose, `${g.id} measured ${g.text}, threshold ${g.threshold}`).toBe(true);
    });
  }

  it('no game stalls, exactly', () => {
    expect(res.gates.find((g) => g.id === 'G17')!.value).toBe(0);
  });
});

describe.skipIf(!hasPython)('replay: the Python reference plays the same games', () => {
  it('plays 25 games per bot identically, turn for turn, and prints the same gate values', () => {
    const r = runReplay(25, 'R');
    expect(r.ok, r.text).toBe(true);
    expect(r.games).toBe(150);
  }, 60_000);
});
