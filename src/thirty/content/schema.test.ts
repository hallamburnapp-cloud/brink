import { describe, expect, it } from 'vitest';
import { choiceCardSchema, compileThirty, mapCardSchema, pieceSchema, type RawThirty } from './schema';
import { validateThirty } from './validate';

const advisers = { file: 'advisers.yaml', items: [{ id: 'admiral', name: 'T. Reyde', role: 'Admiral', voice: 'Dry.' }, { id: 'intel', name: 'D. Fell', role: 'Intel Director', voice: 'Hedged.' }] };
const pieces = {
  file: 'pieces.yaml',
  items: [
    { id: 'red-lines', name: 'Red Lines', chip: 'Red Line', icon: 'flag', kind: 'policy', rule: 'Name one region.', tags: ['map'] },
    { id: 'cautious-intel', name: 'Cautious Intel Director', chip: 'Cautious', icon: 'eye', kind: 'adviser', rule: 'False alarms are marked.', tags: ['arcs'], excludes: ['paranoid-intel'] },
    { id: 'paranoid-intel', name: 'Paranoid Intel Director', chip: 'Paranoid', icon: 'radar', kind: 'adviser', rule: 'Warnings come early.', tags: ['arcs'], excludes: ['cautious-intel'] },
  ],
};
const raw = (cards: Record<string, unknown[]>): RawThirty => ({
  advisers,
  pieces,
  cards: Object.entries(cards).map(([file, items]) => ({ file, items })),
});

// The spec's three example cards, as written in SPEC.md "The content".
const strait = {
  id: 'strait-01',
  arc: 'blockade',
  adviser: 'admiral',
  region: 'SHL',
  day: [3, 12],
  text: 'Federation ships are sitting across the Shoal strait. Our tankers are turning back. The crews want orders.',
  left: { text: 'Escort the tankers through', tag: 'FORCE', hint: 'Danger down here · heats Lintel', heats: 'LTL' },
  right: { text: 'Reroute and talk', tag: 'CALM', hint: 'Danger down · slower' },
};
const alarm = {
  id: 'alarm-02',
  arc: 'false-alarm',
  adviser: 'intel',
  region: 'WMS',
  day: [8, 22],
  text: 'Early warning shows six launches over the Cap. Nothing else confirms it. We have four minutes.',
  left: { text: 'Wait for a second source', tag: 'RISKY', odds: 70, hint: 'Holds 70% · if real, the Cap burns' },
  right: { text: 'Raise the alert', tag: 'FORCE', hint: 'Danger up · the Federation sees it' },
};
const fleet = {
  id: 'fleet-map',
  adviser: 'admiral',
  map: true,
  text: 'The fleet can be in one place by morning. Tap where it goes.',
  targets: [
    { region: 'SHL', hint: 'Calms the strait' },
    { region: 'ORN', hint: 'Warns Orrinth off' },
    { region: 'VSY', hint: 'Guards home' },
  ],
};

describe('the card format', () => {
  it('accepts the three example cards from the spec', () => {
    expect(choiceCardSchema.safeParse(strait).success).toBe(true);
    expect(choiceCardSchema.safeParse(alarm).success).toBe(true);
    expect(mapCardSchema.safeParse(fleet).success).toBe(true);
  });

  it('fills defaults: day 1–30, follow-up window, target tag', () => {
    const r = mapCardSchema.safeParse(fleet);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.day).toEqual([1, 30]);
      expect(r.data.targets[0].tag).toBe('CALM');
    }
    const c = choiceCardSchema.safeParse({ ...strait, left: { ...strait.left, follow: 'strait-02' }, right: { ...strait.right, follow: { card: 'strait-03', in: 2 } } });
    expect(c.success).toBe(true);
    if (c.success) {
      expect(c.data.left.follow).toEqual({ card: 'strait-02', in: [1, 2] });
      expect(c.data.right.follow).toEqual({ card: 'strait-03', in: [2, 2] });
    }
  });

  it('rejects odds outside 5–95, odds without RISKY and RISKY without odds', () => {
    const risky = (odds?: number) => ({ ...alarm, left: { ...alarm.left, odds } });
    expect(choiceCardSchema.safeParse(risky(4)).success).toBe(false);
    expect(choiceCardSchema.safeParse(risky(96)).success).toBe(false);
    expect(choiceCardSchema.safeParse(risky(undefined)).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, right: { ...strait.right, odds: 50 } }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, right: { ...strait.right, fail: { crisis: 'ORN' } } }).success).toBe(false);
  });

  it('rejects messages over 40 words, missing hints, unknown keys, bad ids and reversed day ranges', () => {
    expect(choiceCardSchema.safeParse({ ...strait, text: Array(41).fill('word').join(' ') }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, text: Array(40).fill('word').join(' ') }).success).toBe(true);
    expect(choiceCardSchema.safeParse({ ...strait, left: { text: 'Escort them', tag: 'FORCE' } }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, left: { ...strait.left, hint: 'x'.repeat(61) } }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, weight: 3 }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, id: 'Strait_01' }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, day: [12, 3] }).success).toBe(false);
    expect(choiceCardSchema.safeParse({ ...strait, day: [0, 31] }).success).toBe(false);
  });

  it('wants two or three targets on a map card and a region on a choice card', () => {
    expect(mapCardSchema.safeParse({ ...fleet, targets: fleet.targets.slice(0, 1) }).success).toBe(false);
    expect(mapCardSchema.safeParse({ ...fleet, targets: [...fleet.targets, { region: 'LNK', hint: 'Four' }] }).success).toBe(false);
    const { region, ...noRegion } = strait;
    expect(region).toBe('SHL');
    expect(choiceCardSchema.safeParse(noRegion).success).toBe(false);
  });

  it('keeps pieces to the printed shape', () => {
    expect(pieceSchema.safeParse(pieces.items[0]).success).toBe(true);
    expect(pieceSchema.safeParse({ ...pieces.items[0], tags: [] }).success).toBe(false);
    expect(pieceSchema.safeParse({ ...pieces.items[0], chip: 'Much too long a chip' }).success).toBe(false);
    expect(pieceSchema.safeParse({ ...pieces.items[0], kind: 'gadget' }).success).toBe(false);
  });
});

describe('compileThirty', () => {
  it('assembles advisers, pieces, cards and arcs, and marks follow-up targets as chained', () => {
    const { content, issues } = compileThirty(
      raw({
        'arcs/blockade.yaml': [{ ...strait, left: { ...strait.left, follow: 'strait-02' } }, { ...strait, id: 'strait-02', day: [4, 14] }],
        'map.yaml': [fleet],
      }),
    );
    expect(issues).toEqual([]);
    expect(content.adviserOrder).toEqual(['admiral', 'intel']);
    expect(content.pieceOrder).toEqual(['red-lines', 'cautious-intel', 'paranoid-intel']);
    expect(content.cardOrder).toEqual(['strait-01', 'strait-02', 'fleet-map']);
    expect(content.arcs).toEqual({ blockade: ['strait-01', 'strait-02'] });
    expect(content.cards['strait-01'].chained).toBe(false);
    expect(content.cards['strait-02'].chained).toBe(true);
    expect(content.cards['fleet-map'].map).toBe(true);
    expect(content.cards['fleet-map'].region).toBeNull();
    expect(content.cards['strait-01'].when).toEqual({ heat: [0, 3], pieces: [], without: [] });
    expect(content.pieces['red-lines'].excludes).toEqual([]);
  });

  it('reports duplicate ids, shape errors and non-list files by file and id, and keeps the rest', () => {
    const { content, issues } = compileThirty(
      raw({
        'arcs/blockade.yaml': [strait, strait, { ...alarm, arc: 'blockade', left: { text: 'Wait', tag: 'RISKY', hint: 'x' } }],
        'regions.yaml': { not: 'a list' } as unknown as unknown[],
      }),
    );
    expect(content.cardOrder).toEqual(['strait-01']);
    expect(issues.map((i) => i.where)).toEqual(['arcs/blockade.yaml › strait-01', 'arcs/blockade.yaml › alarm-02', 'regions.yaml']);
    expect(issues[0].message).toMatch(/duplicate card id/);
    expect(issues[1].message).toMatch(/left\.odds/);
    expect(issues[2].message).toMatch(/YAML list/);
  });
});

describe('validateThirty', () => {
  const compileOk = (cards: Record<string, unknown[]>) => {
    const { content, issues } = compileThirty(raw(cards));
    expect(issues).toEqual([]);
    return validateThirty(content);
  };
  const errors = (issues: ReturnType<typeof validateThirty>) => issues.filter((i) => i.level === 'error').map((i) => i.message);
  const warnings = (issues: ReturnType<typeof validateThirty>) => issues.filter((i) => i.level === 'warning').map((i) => i.message);

  it('passes the spec examples with only coverage warnings', () => {
    const issues = compileOk({ 'arcs/blockade.yaml': [strait], 'arcs/false-alarm.yaml': [alarm], 'map.yaml': [fleet] });
    expect(errors(issues)).toEqual([]);
    expect(warnings(issues).filter((w) => /no card is set/.test(w))).toHaveLength(28);
    expect(warnings(issues).filter((w) => /arcs run 3 to 5/.test(w))).toHaveLength(2);
  });

  it('flags unknown regions, advisers and pieces', () => {
    const issues = compileOk({
      'arcs/blockade.yaml': [{ ...strait, region: 'XXX', adviser: 'nobody', when: { pieces: ['hotline'] }, left: { ...strait.left, heats: 'ZZZ' } }],
    });
    expect(errors(issues)).toEqual([
      expect.stringMatching(/unknown adviser "nobody"/),
      expect.stringMatching(/unknown region "XXX"/),
      expect.stringMatching(/unknown piece "hotline"/),
      expect.stringMatching(/heats names unknown region "ZZZ"/),
    ]);
  });

  it('flags dangling, cross-arc and unreachable follow-ups', () => {
    const issues = compileOk({
      'arcs/blockade.yaml': [
        { ...strait, left: { ...strait.left, follow: 'ghost' }, right: { ...strait.right, follow: { card: 'strait-late', in: [1, 2] } } },
        { ...strait, id: 'strait-late', day: [20, 30], left: { ...strait.left, follow: 'alarm-02' }, right: { ...strait.right } },
      ],
      'arcs/false-alarm.yaml': [alarm],
    });
    expect(errors(issues)).toEqual([
      expect.stringMatching(/follow-up names unknown card "ghost"/),
      expect.stringMatching(/due on days 4–14 but that card runs days 20–30 \(no overlap\)/),
      expect.stringMatching(/"alarm-02" is in arc false-alarm, not blockade/),
      expect.stringMatching(/arc "false-alarm" has no entry card/),
    ]);
  });

  it('wants a FORCE choice to heat a neighbour and arc files to hold their own arc', () => {
    const issues = compileOk({
      'arcs/blockade.yaml': [{ ...strait, left: { ...strait.left, heats: 'MRM' } }, { ...alarm, left: { ...alarm.left, fail: { heats: 'WMS' } } }],
      'regions.yaml': [{ ...fleet, id: 'fleet-twice', targets: [fleet.targets[0], fleet.targets[0]] }],
    });
    expect(errors(issues)).toEqual([
      expect.stringMatching(/Marram does not border Shoal/),
      expect.stringMatching(/belong to arc "blockade" \(this one says "false-alarm"\)/),
      expect.stringMatching(/names the region the choice already acts on \(Wintermast\)/),
      expect.stringMatching(/Shoal is offered twice/),
    ]);
  });

  it('keeps domestic cards at home and warns about thin arcs, unnamed regions and one-sided excludes', () => {
    const { content, issues: compiled } = compileThirty(
      raw({
        'domestic.yaml': [{ ...strait, id: 'home-01', arc: undefined, adviser: 'intel', domestic: 'public', region: 'ORN', left: { ...strait.left, heats: undefined } }],
        'arcs/blockade.yaml': [{ ...strait, text: 'Ships are sitting across the strait. The crews want orders.' }],
      }),
    );
    expect(compiled).toEqual([]);
    content.pieces['paranoid-intel'].excludes = [];
    const issues = validateThirty(content);
    expect(errors(issues)).toEqual([expect.stringMatching(/set at home \(Highmarch\), not Orrinth/)]);
    expect(warnings(issues)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/does not exclude it back/),
        expect.stringMatching(/usually the Chief of Staff/),
        expect.stringMatching(/does not name Shoal/),
        expect.stringMatching(/arc "blockade" has 1 card/),
      ]),
    );
  });
});
