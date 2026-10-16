import { describe, expect, it } from 'vitest';
import { composeHint, fit, heatsText, hintLine, isPlain, type HintInput } from './hint.ts';
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

/** A show of force as the card wrote it: today's region calms, the named neighbour heats, the sum falls. */
const force: HintInput = {
  ...base,
  tag: 'FORCE',
  authored: 'Danger down here · heats Pebbleby',
  namedNeighbour: true,
  dangerBefore: 5,
  dangerAfter: 2,
  changes: [
    { region: 'SHL', from: 2, to: 0, why: 'choice' },
    { region: 'PBB', from: 0, to: 1, why: 'choice' },
  ],
};

describe('when the authored hint stands', () => {
  it('a plain CALM, a FORCE that names its neighbour and lowers the sum, a RISKY at its printed odds, every HOME', () => {
    expect(isPlain(base)).toBe(true);
    expect(hintLine(base)).toBe('Danger down · the strait calms');
    expect(isPlain(force)).toBe(true);
    expect(hintLine(force)).toBe('Danger down here · heats Pebbleby');
    expect(isPlain({ ...force, namedNeighbour: false })).toBe(false);
    expect(isPlain({ ...base, tag: 'RISKY', printedOdds: 70, odds: 70 })).toBe(true);
    expect(isPlain({ ...base, tag: 'RISKY', printedOdds: 70, odds: 100 })).toBe(false);
    expect(isPlain({ ...base, tag: 'HOME', authored: 'Danger unchanged · a quiet day', heatBefore: 0, changes: [], dangerAfter: 5 })).toBe(true);
  });

  it('not when a piece fired, a penalty lands, or the region is already calm', () => {
    expect(isPlain({ ...base, pieces: ['old-ambassador'] })).toBe(false);
    expect(isPlain({ ...base, penalty: 15 })).toBe(false);
    expect(isPlain({ ...base, heatBefore: 0, changes: [] })).toBe(false);
  });

  it('not when the first words would lie: the sum does not fall, or rises', () => {
    // A tense region: the force takes it to calm (-2) and the named neighbour heats (+2).
    const even: HintInput = {
      ...force,
      heatBefore: 1,
      dangerBefore: 2,
      dangerAfter: 2,
      changes: [
        { region: 'SHL', from: 1, to: 0, why: 'choice' },
        { region: 'PBB', from: 0, to: 1, why: 'choice' },
      ],
    };
    expect(isPlain(even)).toBe(false);
    expect(hintLine(even)).toBe('Danger unchanged · Shoal calms, heats Pebbleby');
    // The neighbour tips into war: the sum rises, and "heats" would understate it.
    const war: HintInput = {
      ...force,
      heatBefore: 1,
      dangerBefore: 7,
      dangerAfter: 12,
      changes: [
        { region: 'SHL', from: 1, to: 0, why: 'choice' },
        { region: 'PBB', from: 2, to: 3, why: 'choice' },
      ],
    };
    expect(hintLine(war)).toBe('Danger up · Shoal calms, Pebbleby goes to war');
    // The named neighbour is already at war and cannot heat: no "here".
    const quietNeighbour: HintInput = { ...force, changes: [{ region: 'SHL', from: 2, to: 0, why: 'choice' }] };
    expect(isPlain(quietNeighbour)).toBe(false);
    expect(hintLine(quietNeighbour)).toBe('Danger down · Shoal calms');
    // A calming button written with "here" (it heats a named region) is held to the same words.
    const fright: HintInput = { ...base, authored: 'Danger down here · Gullrest takes fright', dangerAfter: 2, changes: [...base.changes, { region: 'GUL', from: 0, to: 1, why: 'choice' }] };
    expect(isPlain(fright)).toBe(true);
    expect(isPlain({ ...fright, dangerAfter: 5 })).toBe(false);
    expect(hintLine({ ...fright, dangerAfter: 5 })).toBe('Danger unchanged · Shoal cools, heats Gullrest');
    expect(isPlain({ ...fright, changes: base.changes })).toBe(false);
    // A risky line's printed miss must cost something: the region at war cannot heat.
    const risky: HintInput = { ...base, tag: 'RISKY', authored: 'Danger down if it works (70%) · if not, Shoal heats', printedOdds: 70, odds: 70 };
    expect(isPlain({ ...risky, missed: { danger: 7, changes: [{ region: 'SHL', from: 2, to: 3, why: 'choice' }] } })).toBe(true);
    expect(isPlain({ ...risky, heatBefore: 3, dangerBefore: 12, dangerAfter: 2, missed: { danger: 12, changes: [] } })).toBe(false);
    expect(hintLine({ ...risky, heatBefore: 3, dangerBefore: 12, dangerAfter: 2, changes: [{ region: 'SHL', from: 3, to: 1, why: 'choice' }], missed: { danger: 12, changes: [] } })).toBe(
      'Danger down if it works (70%) · if not, nothing changes',
    );
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
    expect(hintLine({ ...risky, odds: 0, certainBy: 'real-alarm', dangerAfter: 12, changes: [{ region: 'SHL', from: 2, to: 3, why: 'choice' }] })).toBe('Danger up · the alarm is real, Shoal goes to war');
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
    ).toBe('Danger up · Lintel calms, Kelpmouth goes to war, DANGER +15');
  });

  it('fits sixty characters by dropping what the DANGER words already say, keeping a risky miss and what heats', () => {
    expect(fit('Danger down · calms 4 regions')).toBe('Danger down · calms 4 regions');
    expect(fit('Danger down if it works (65%) · calms Shoal and 2 more, if not, Shoal heats, Shoal guarded for a week')).toBe(
      'Danger down if it works (65%) · if not, Shoal heats',
    );
    // "Danger down here" says the region calms: its own clause goes before a cost does.
    expect(fit('Danger down here · Brindle Coast calms, heats Morrow Downs, DANGER +15')).toBe('Danger down here · heats Morrow Downs, DANGER +15');
    // The clause that explains "here" is kept; the acted region's calming goes first (the playtests' day-11 line).
    expect(fit('Danger down here · Floe End calms, heats Orrinth and Edda Vale', 60, 'Floe End')).toBe('Danger down here · heats Orrinth and Edda Vale');
    expect(fit('Danger down here · calms Brindle Coast and 2 more, heats Saltwhite and Hearth')).toBe('Danger down here · heats Saltwhite and Hearth');
    // Two heated regions shorten to a count before anything a "here" line needs is lost.
    expect(fit('Danger down here · heats Brindle Coast and Morrow Downs', 50)).toBe('Danger down here · heats Brindle Coast and 1 more');
    expect(fit('Danger down here · heats Brindle Coast and Morrow Downs', 46)).toBe('Danger down here · heats 2 places');
    // "Danger unchanged" is never left with only a calming clause: the calming shortens to "calms here" first.
    expect(fit('Danger unchanged · Morrow Downs calms, heats Ashkettle', 46, 'Morrow Downs')).toBe('Danger unchanged · calms here, heats Ashkettle');
    expect(fit('x'.repeat(70))).toHaveLength(60);
  });

  it('labels on the map (46 characters): the place\'s own calming goes first, what heats stays, a risky label keeps its odds', () => {
    const label = (line: string, acted?: string) => fit(line, 46, acted);
    expect(label('Danger down · Shoal calms')).toBe('Danger down · Shoal calms');
    expect(label('Danger unchanged · Vessary guarded for a week')).toBe('Danger unchanged · Vessary guarded for a week');
    expect(label('Danger down here · Orrinth calms, heats Dunmarrow, Orrinth is warned', 'Orrinth')).toBe('Danger down here · heats Dunmarrow');
    expect(label('Danger down here · calms Brindle Coast and 2 more, heats Floe End', 'Brindle Coast')).toBe('Danger down here · heats Floe End');
    expect(label('Danger down · calms Tern Isle and 3 more, heats Gullrest', 'Tern Isle')).toBe('Danger down · heats Gullrest');
    // Both names of what heats are worth more than the calming the label sits on.
    expect(label('Danger unchanged · Brindle Coast calms, heats Saltwhite and Hearth', 'Brindle Coast')).toBe('Danger unchanged · heats Saltwhite and Hearth');
    expect(label('Danger unchanged · Morrow Downs calms, heats Ashkettle', 'Morrow Downs')).toBe('Danger unchanged · calms here, heats Ashkettle');
    expect(label('Danger down if it works (60%) · if not, Northwake heats')).toBe('Danger down if it works (60%)');
    expect(fit('Danger up even if it works (60%) · heats Lintel and 2 more', 20)).toBe('Danger up even if i…');
  });

  it('writes what heats at each length', () => {
    expect(heatsText(['Lintel'])).toBe('heats Lintel');
    expect(heatsText(['Lintel', 'Shoal'])).toBe('heats Lintel and Shoal');
    expect(heatsText(['Lintel', 'Shoal', 'Orrinth'])).toBe('heats Lintel and 2 more');
    expect(heatsText(['Lintel'], 2)).toBe('heats Lintel and 2 more');
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
