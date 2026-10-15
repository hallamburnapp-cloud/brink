import { describe, expect, it } from 'vitest';
import { composeHint, fit, hintLine, isPlain, type HintInput } from './hint.ts';
import { preview } from './preview.ts';
import { fixture, quiet, withCard, withTeam } from './testkit.ts';

const content = fixture();

const base: HintInput = {
  tag: 'CALM',
  authored: 'Danger down · the strait calms',
  acted: 'SHL',
  heatBefore: 2,
  namedNeighbour: false,
  printedOdds: null,
  odds: null,
  certainBy: null,
  dangerBefore: 5,
  dangerAfter: 2,
  changes: [{ region: 'SHL', from: 2, to: 1, why: 'choice' }],
  pieces: [],
  penalty: 0,
};

describe('when the authored hint stands', () => {
  it('a plain CALM, a FORCE that names its neighbour, a RISKY at its printed odds, every HOME', () => {
    expect(isPlain(base)).toBe(true);
    expect(hintLine(base)).toBe('Danger down · the strait calms');
    expect(isPlain({ ...base, tag: 'FORCE', namedNeighbour: true })).toBe(true);
    expect(isPlain({ ...base, tag: 'FORCE', namedNeighbour: false })).toBe(false);
    expect(isPlain({ ...base, tag: 'RISKY', printedOdds: 70, odds: 70 })).toBe(true);
    expect(isPlain({ ...base, tag: 'RISKY', printedOdds: 70, odds: 100 })).toBe(false);
    expect(isPlain({ ...base, tag: 'HOME', heatBefore: 0, changes: [] })).toBe(true);
  });

  it('not when a piece fired, a penalty lands, or the region is already calm', () => {
    expect(isPlain({ ...base, pieces: ['old-ambassador'] })).toBe(false);
    expect(isPlain({ ...base, penalty: 15 })).toBe(false);
    expect(isPlain({ ...base, heatBefore: 0, changes: [] })).toBe(false);
  });
});

describe('the engine\'s own line', () => {
  it('counts the regions a wave of calm reaches', () => {
    const h: HintInput = {
      ...base,
      pieces: ['old-ambassador', 'back-channel', 'peace-movement'],
      dangerAfter: 0,
      changes: [
        { region: 'SHL', from: 2, to: 1, why: 'choice' },
        { region: 'SHL', from: 1, to: 0, why: 'piece', piece: 'old-ambassador' },
        { region: 'LNK', from: 1, to: 0, why: 'piece', piece: 'back-channel' },
        { region: 'WMS', from: 3, to: 2, why: 'piece', piece: 'peace-movement' },
        { region: 'ORN', from: 2, to: 1, why: 'piece', piece: 'peace-movement' },
      ],
    };
    expect(hintLine(h)).toBe('Danger down · cools Shoal and 3 more');
    // Every region reaching CALM: "calms".
    expect(composeHint({ ...h, changes: h.changes.map((c) => ({ ...c, to: 0 as const })) })).toBe('Danger down · calms Shoal and 3 more');
  });

  it('names a mark, so guarding a calm region does not read as nothing', () => {
    const guard: HintInput = { ...base, heatBefore: 0, dangerBefore: 2, dangerAfter: 2, changes: [], mark: 'guarded' };
    expect(composeHint(guard)).toBe('Danger unchanged · Shoal guarded for a week');
    expect(composeHint({ ...guard, mark: 'warned' })).toBe('Danger unchanged · Shoal is warned');
    expect(composeHint({ ...guard, mark: 'red-line' })).toBe('Danger unchanged · the red line is Shoal');
    // With a heat change the mark follows the world clause, and is the first thing fit() drops.
    expect(composeHint({ ...base, pieces: ['old-ambassador'], changes: [{ region: 'SHL', from: 2, to: 0, why: 'choice' }], mark: 'guarded' })).toBe(
      'Danger down · Shoal calms, Shoal guarded for a week',
    );
  });

  it('says what one region does', () => {
    expect(composeHint({ ...base, pieces: ['old-ambassador'], changes: [{ region: 'SHL', from: 2, to: 0, why: 'choice' }] })).toBe('Danger down · Shoal calms');
    expect(composeHint({ ...base, pieces: ['old-ambassador'], heatBefore: 3, changes: [{ region: 'SHL', from: 3, to: 1, why: 'choice' }] })).toBe('Danger down · Shoal cools');
  });

  it('a show of force that picks its own neighbour', () => {
    const h: HintInput = {
      ...base,
      tag: 'FORCE',
      dangerBefore: 5,
      dangerAfter: 2,
      changes: [
        { region: 'SHL', from: 2, to: 0, why: 'choice' },
        { region: 'PBB', from: 0, to: 1, why: 'choice' },
      ],
    };
    expect(hintLine(h)).toBe('Danger down here · Shoal calms, heats Pebbleby');
  });

  it('the odds, certain talks, a false alarm, a real one', () => {
    const risky: HintInput = { ...base, tag: 'RISKY', printedOdds: 70, odds: 77, changes: [{ region: 'SHL', from: 2, to: 0, why: 'choice' }], dangerAfter: 0 };
    expect(hintLine(risky)).toBe('Danger down if it works (77%) · Shoal calms');
    // With the miss known, the acted region's own calming is implied by "Danger down"; the miss is spelled out.
    expect(hintLine({ ...risky, missed: { danger: 12, changes: [{ region: 'SHL', from: 2, to: 3, why: 'choice' }] } })).toBe('Danger down if it works (77%) · if not, Shoal goes to war');
    expect(
      hintLine({
        ...risky,
        pieces: ['old-ambassador', 'back-channel'],
        changes: [
          { region: 'SHL', from: 2, to: 0, why: 'choice' },
          { region: 'LTL', from: 1, to: 0, why: 'piece', piece: 'back-channel' },
        ],
        missed: { danger: 12, changes: [{ region: 'SHL', from: 2, to: 3, why: 'choice' }, { region: 'LTL', from: 0, to: 2, why: 'choice' }] },
      }),
    ).toBe('Danger down if it works (77%) · if not, Shoal goes to war');
    // A miss that changes nothing (the region already at war) is said too.
    expect(hintLine({ ...risky, heatBefore: 3, changes: [{ region: 'SHL', from: 3, to: 1, why: 'choice' }], dangerBefore: 12, dangerAfter: 2, missed: { danger: 12, changes: [] } })).toBe(
      'Danger down if it works (77%) · if not, nothing changes',
    );
    // A risky option whose success changes nothing says so, and still says the miss.
    expect(hintLine({ ...risky, heatBefore: 0, changes: [], dangerAfter: 5, missed: { danger: 7, changes: [{ region: 'SHL', from: 0, to: 1, why: 'choice' }] } })).toBe(
      'Danger unchanged if it works (77%) · if not, Shoal heats',
    );
    expect(hintLine({ ...risky, odds: 100, certainBy: 'dove-foreign', pieces: ['dove-foreign'] })).toBe('Danger down · talks cannot fail, Shoal calms');
    expect(hintLine({ ...risky, odds: 100, certainBy: 'false-alarm' })).toBe('Danger down · a false alarm, Shoal calms');
    expect(hintLine({ ...risky, odds: 0, certainBy: 'real-alarm', dangerAfter: 12, changes: [{ region: 'SHL', from: 2, to: 3, why: 'choice' }] })).toBe('Danger up · the alarm is real, heats Shoal');
  });

  it('nothing to do, a quiet day, a crossed red line', () => {
    expect(hintLine({ ...base, heatBefore: 0, changes: [], dangerAfter: 5 })).toBe('Danger unchanged · nothing to calm in Shoal');
    expect(composeHint({ ...base, tag: 'HOME', changes: [], dangerAfter: 5 })).toBe('Danger unchanged · a quiet day at home');
    // One phrase for no net change, even when the world moved: a cool and a heat that cancel.
    expect(
      composeHint({
        ...base,
        tag: 'FORCE',
        pieces: ['peace-movement'],
        dangerAfter: 5,
        changes: [
          { region: 'SHL', from: 1, to: 0, why: 'choice' },
          { region: 'EDV', from: 0, to: 1, why: 'piece', piece: 'peace-movement' },
        ],
      }),
    ).toBe('Danger unchanged · Shoal calms, heats Edda Vale');
    expect(
      hintLine({
        ...base,
        tag: 'FORCE',
        namedNeighbour: true,
        penalty: 15,
        dangerAfter: 27,
        changes: [
          { region: 'LTL', from: 2, to: 0, why: 'choice' },
          { region: 'KLP', from: 2, to: 3, why: 'choice' },
        ],
      }),
    ).toBe('Danger up · Lintel calms, heats Kelpmouth, DANGER +15');
  });

  it('fits sixty characters by dropping the last clauses, keeping a risky miss for last', () => {
    expect(fit('Danger down · calms 4 regions')).toBe('Danger down · calms 4 regions');
    expect(fit('Danger down if it works (65%) · calms Shoal and 2 more, if not, Shoal heats, Shoal guarded for a week')).toBe(
      'Danger down if it works (65%) · if not, Shoal heats',
    );
    expect(fit('Danger down here · Brindle Coast calms, heats Morrow Downs, DANGER +15')).toBe('Danger down here · Brindle Coast calms, heats Morrow Downs');
    expect(fit('x'.repeat(70))).toHaveLength(60);
  });
});

describe('preview', () => {
  it('computes exactly what choose would, with the pieces applied, and the hint in words', () => {
    const s = withCard(content, withTeam(quiet(content, 'plain-shl', { SHL: 3, LNK: 2, WMS: 3 }), ['old-ambassador', 'back-channel', 'peace-movement']), 'plain-shl');
    const p = preview(content, s, 'left')!;
    expect(p.tag).toBe('CALM');
    expect(p.text).toBe('Talk it down');
    expect(p.dangerBefore).toBe(29);
    expect(p.dangerAfter).toBe(2 + 0 + 2);
    expect(p.pieces).toEqual(['old-ambassador', 'back-channel', 'peace-movement']);
    expect(p.hint).toBe('Danger down · cools Shoal and 2 more');
    expect(p.odds).toBeNull();
    expect(p.changesIfMissed).toBeNull();
  });

  it('shows both branches of a risk and the odds after pieces', () => {
    const s = quiet(content, 'shoal-risky', { SHL: 2 });
    const p = preview(content, s, 'left')!;
    expect(p.odds).toBe(70);
    expect(p.hint).toBe('Danger down if it works (70%) · if not, Shoal heats');
    expect(p.dangerAfter).toBe(0);
    expect(p.dangerIfMissed).toBe(12 + 5);
    expect(p.changesIfMissed).toEqual([
      { region: 'SHL', from: 2, to: 3, why: 'choice' },
      { region: 'LTL', from: 0, to: 2, why: 'choice' },
    ]);
    const home = preview(content, s, 'right')!;
    expect(home.hint).toBe('Danger unchanged · a quiet day at home');
    expect(home.changes).toEqual([]);
  });

  it('a map target previews by region, with no action text', () => {
    const s = quiet(content, 'fleet-map', { ORN: 2 });
    const p = preview(content, s, 'ORN')!;
    expect(p.text).toBeNull();
    expect(p.tag).toBe('FORCE');
    // A place on a map day is always labelled by the engine, DANGER first, so the glowing places compare.
    expect(p.hint).toBe('Danger down here · Orrinth calms, heats Dunmarrow');
    expect(preview(content, s, 'SHL')!.hint).toBe('Danger unchanged · nothing to calm in Shoal');
    expect(preview(content, s, 'left')).toBeNull();
    expect(preview(content, s, 'EDV')).toBeNull();
  });

  it('a certain talk under the Dove says so', () => {
    const s = withCard(content, withTeam(quiet(content, 'shoal-talks', { SHL: 2 }), ['dove-foreign']), 'shoal-talks');
    const p = preview(content, s, 'left')!;
    expect(p.odds).toBe(100);
    expect(p.hint).toBe('Danger down · talks cannot fail, Shoal calms');
    expect(p.dangerIfMissed).toBeNull();
  });
});
