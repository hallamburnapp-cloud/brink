import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkContent } from '../engine/content';
import { loadRedlinesContent } from './load';
import { compileRedlines, lineSchema, phoneSchema, type RawRedlines } from './schema';
import { validateRedlines, wordsWithSlots } from './validate';

const PACK = join(process.cwd(), 'content-redlines');

// The MOMENT.md call, as a template.
const call = {
  id: 'test-inherited-armour',
  kind: 'test-inherited',
  caller: 'hawk',
  text: 'Federation armour is at {region}, the promise you inherited. Two brigades, lights on, not moving. They want to see what you do.',
  again: 'A week on. The armour at {region} has not moved.',
  advisers: {
    hawk: 'Move now. Or never promise anything again.',
    dove: 'Keeping it puts {piece} on their doorstep. Think how that looks from Wintermast.',
    intel: 'Two brigades at {region}. Lights on since dusk. Their radio went quiet at midnight.',
  },
  options: {
    back: { label: 'BACK IT', cost: 'move {piece} up · costs {cost} influence · we keep our word' },
    down: { label: 'BACK DOWN', cost: "protest and hold · they'll believe us less · {region} will likely fall" },
    wait: { label: 'WAIT', cost: 'a week · {region} may fall · a second source may arrive' },
  },
};

/** The shipped pack with one file's items swapped, so a check can be exercised against real neighbours. */
function packWith(patch: Partial<Record<keyof RawRedlines, unknown>>): RawRedlines {
  const { content } = loadRedlinesContent(PACK);
  if (!content) throw new Error('the shipped pack did not compile');
  return {
    advisers: { file: 'advisers.yaml', items: patch.advisers ?? content.adviserOrder.map((id) => content.advisers[id]) },
    lines: { file: 'lines.yaml', items: patch.lines ?? content.lines },
    phones: { file: 'phones.yaml', items: patch.phones ?? content.phones },
    debrief: { file: 'debrief.yaml', items: patch.debrief ?? Object.entries(content.debrief).map(([kind, thoughts]) => ({ kind, thoughts })) },
    strings: { file: 'strings.yaml', items: patch.strings ?? content.strings },
  };
}

function issuesFor(raw: RawRedlines) {
  const c = compileRedlines(raw);
  return c.content ? [...c.issues, ...validateRedlines(c.content)] : c.issues;
}
const errors = (raw: RawRedlines) => issuesFor(raw).filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`);

describe('the phone format', () => {
  it('accepts the call from MOMENT.md', () => {
    expect(phoneSchema.safeParse(call).success).toBe(true);
  });

  it('needs the three options back, down and wait, known kinds and callers, and no unknown keys', () => {
    const { back, down } = call.options;
    expect(phoneSchema.safeParse({ ...call, options: { back, down } }).success).toBe(false);
    expect(phoneSchema.safeParse({ ...call, options: { ...call.options, maybe: back } }).success).toBe(false);
    expect(phoneSchema.safeParse({ ...call, kind: 'fall' }).success).toBe(false);
    expect(phoneSchema.safeParse({ ...call, caller: 'chief' }).success).toBe(false);
    expect(phoneSchema.safeParse({ ...call, mood: 'tense' }).success).toBe(false);
    expect(phoneSchema.safeParse({ ...call, advisers: { hawk: 'a', dove: 'b' } }).success).toBe(false);
  });

  it('counts slots at their widest when checking the forty words', () => {
    expect(wordsWithSlots('Armour is at {region}.')).toBe(5);
    expect(wordsWithSlots('move {piece} up')).toBe(4);
    const long = Array.from({ length: 39 }, (_, i) => `w${i}`).join(' ') + ' {region}';
    expect(wordsWithSlots(long)).toBe(41);
  });
});

describe('the validator', () => {
  it('passes the shipped pack with no errors, and the engine finds nothing missing', () => {
    const { content, issues } = loadRedlinesContent(PACK);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(checkContent(content!)).toEqual([]);
  });

  it('refuses a phone over forty words once filled', () => {
    const text = Array.from({ length: 38 }, (_, i) => `word${i}`).join(' ') + ' at {region}.';
    const errs = errors(packWith({ phones: [{ ...call, id: 'too-long', text }] }));
    expect(errs.some((e) => /too-long: text: 41 words/.test(e))).toBe(true);
  });

  it('refuses "if they" and "if you" in options and adviser lines, and the profile words', () => {
    const bad = {
      ...call,
      id: 'annotated',
      advisers: { ...call.advisers, hawk: 'If they are scared of us, this works.' },
      options: { ...call.options, back: { ...call.options.back, cost: 'costs {cost} · if you back it they fold' } },
    };
    const errs = errors(packWith({ phones: [bad] }));
    expect(errs.some((e) => /advisers\.hawk: "If they" is a conditional annotation/.test(e))).toBe(true);
    expect(errs.some((e) => /options\.back\.cost: "if you" is a conditional annotation/.test(e))).toBe(true);
    expect(errs.some((e) => /names what the enemy is like \("scared of us"\)/.test(e))).toBe(true);
  });

  it('keeps the Director to what she has seen', () => {
    const bad = { ...call, id: 'mind-reader', advisers: { ...call.advisers, intel: 'They think you will back down. Nine times in ten.' } };
    const errs = errors(packWith({ phones: [bad] }));
    expect(errs.some((e) => /advisers\.intel: "They think" reads their minds/.test(e))).toBe(true);
    expect(errs.some((e) => /advisers\.intel: "times in" is an estimate/.test(e))).toBe(true);
  });

  it('checks slots, required slots, {cost} under the wrong word, and how many templates the build needs', () => {
    const bad = {
      ...call,
      id: 'bad-slots',
      text: 'Armour is at {place}.',
      options: { ...call.options, wait: { label: 'WAIT', cost: 'a week · costs {cost} influence' } },
    };
    const errs = errors(packWith({ phones: [bad] }));
    expect(errs.some((e) => /unknown slot \{place\}/.test(e))).toBe(true);
    expect(errs.some((e) => /text: a "test-inherited" call names \{region\}/.test(e))).toBe(true);
    expect(errs.some((e) => /options\.wait\.cost: \{cost\} is the BACK IT price/.test(e))).toBe(true);
    expect(errs.some((e) => /phones\.yaml: 1 templates?; the first build has at least 8/.test(e))).toBe(true);
    expect(errs.some((e) => /0 "feint" templates; the first build needs 2/.test(e))).toBe(true);
    // The engine's own check reports the missing kinds too.
    expect(errs.some((e) => /engine › checkContent: phones: no template of kind summit/.test(e))).toBe(true);
  });

  it('checks the lines: real regions outside the Cap, eight of them, no slots', () => {
    const line = { id: 'x', kind: 'sea', regions: ['SHL'], text: 'No.', tape: 'Wintermast: no' };
    expect(lineSchema.safeParse(line).success).toBe(true);
    expect(lineSchema.safeParse({ ...line, kind: 'border' }).success).toBe(false);
    expect(lineSchema.safeParse({ ...line, trips: 'fleet' }).success).toBe(false);
    const { content } = loadRedlinesContent(PACK);
    const shipped = content!.lines;
    const errs = errors(packWith({ lines: [...shipped.slice(0, 7), { ...line, regions: ['WMS', 'ZZZ'], text: 'No {region}.' }] }));
    expect(errs.some((e) => /Wintermast is in the Cap/.test(e))).toBe(true);
    expect(errs.some((e) => /unknown region "ZZZ"/.test(e))).toBe(true);
    expect(errs.some((e) => /text: a line carries no slots/.test(e))).toBe(true);
    expect(errors(packWith({ lines: shipped.slice(0, 7) })).some((e) => /7 lines; Wintermast has 8/.test(e))).toBe(true);
  });

  it('refuses a missing adviser voice and a missing debrief kind', () => {
    const { content } = loadRedlinesContent(PACK);
    const advisers = content!.adviserOrder.map((id) => content!.advisers[id]);
    expect(errors(packWith({ advisers: advisers.map((a) => (a.id === 'dove' ? { ...a, voice: '' } : a)) })).some((e) => /advisers\.yaml › dove/.test(e))).toBe(true);
    const thoughts = Object.entries(content!.debrief)
      .filter(([k]) => k !== 'feintBackedDown')
      .map(([kind, thoughts]) => ({ kind, thoughts }));
    const errs = errors(packWith({ debrief: thoughts }));
    expect(errs.some((e) => /no thought for the hidden event "feintBackedDown"/.test(e))).toBe(true);
    expect(errs.some((e) => /engine › checkContent: debrief: missing feintBackedDown/.test(e))).toBe(true);
  });

  it('holds the words on screen to the spec', () => {
    const { content } = loadRedlinesContent(PACK);
    const strings = JSON.parse(JSON.stringify(content!.strings));
    strings.words.steps = ['TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'TOTAL'];
    strings.words.defend = 'WE PROTECT';
    strings.collision.alliance = 'You inherited a promise to {region}.';
    strings.dials.line = 'They were {appetite} and {jumpiness}.';
    const errs = errors(packWith({ strings }));
    expect(errs.some((e) => /words\.steps: the ladder words are TESTING, PUSHING, MASSING, FIGHTING, ALL-OUT/.test(e))).toBe(true);
    expect(errs.some((e) => /words\.defend/.test(e))).toBe(true);
    expect(errs.some((e) => /collision\.alliance: names \{line\}/.test(e))).toBe(true);
    expect(errs.some((e) => /dials\.line: names \{a\}/.test(e))).toBe(true);
    expect(errs.some((e) => /dials\.line: unknown slot \{appetite\}/.test(e))).toBe(true);
    // An unknown or misspelled key in strings.yaml is a compile error, so a typo cannot hide a missing word.
    const typo = JSON.parse(JSON.stringify(content!.strings));
    typo.headlines.fel = typo.headlines.fell;
    delete typo.headlines.fell;
    expect(compileRedlines(packWith({ strings: typo })).content).toBeNull();
  });

  it('never lets the brand name or the real world into the content', () => {
    const bad = { ...call, id: 'branded', text: 'Welcome to BRINK. Armour is at {region}.', advisers: { ...call.advisers, dove: 'This is not Russia.' } };
    const errs = errors(packWith({ phones: [bad] }));
    expect(errs.some((e) => /writes the brand name/.test(e))).toBe(true);
    expect(errs.some((e) => /names the real world/.test(e))).toBe(true);
  });
});
