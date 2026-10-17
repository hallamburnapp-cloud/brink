import { describe, expect, it } from 'vitest';
import { HEADLINE_KINDS, HIDDEN_KINDS, checkContent } from './content.ts';
import { FIXTURE_CONTENT } from './testkit.ts';

describe('the fixture pack', () => {
  it('has everything the engine needs', () => {
    expect(checkContent(FIXTURE_CONTENT)).toEqual([]);
  });
  it('every phone is forty words or fewer and never says "if they"', () => {
    for (const p of FIXTURE_CONTENT.phones) {
      expect(p.text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(40);
      const all = [p.text, p.advisers.hawk, p.advisers.dove, p.advisers.intel, ...Object.values(p.options).flatMap((o) => [o.label, o.cost])].join(' ');
      expect(/\bif they\b/i.test(all)).toBe(false);
    }
  });
  it('has the eight kinds of call the spec asks for', () => {
    const kinds = new Set(FIXTURE_CONTENT.phones.map((p) => p.kind));
    for (const k of ['test-inherited', 'test', 'feint', 'false-alarm', 'trawler', 'bluff-crossed', 'summit', 'fall-unpromised']) expect(kinds.has(k as never)).toBe(true);
    expect(FIXTURE_CONTENT.phones.filter((p) => p.kind === 'test-inherited')).toHaveLength(2);
    expect(FIXTURE_CONTENT.phones.filter((p) => p.kind === 'feint')).toHaveLength(2);
  });
  it('checkContent names what is missing', () => {
    const broken = JSON.parse(JSON.stringify(FIXTURE_CONTENT));
    delete broken.strings.headlines.fell;
    delete broken.debrief.feint;
    broken.phones = broken.phones.filter((p: { kind: string }) => p.kind !== 'summit');
    const out = checkContent(broken);
    expect(out).toEqual(expect.arrayContaining([expect.stringContaining('headlines: missing fell'), expect.stringContaining('debrief: missing feint'), expect.stringContaining('no template of kind summit')]));
  });
  it('the kind lists are the keys the strings carry', () => {
    expect(Object.keys(FIXTURE_CONTENT.strings.headlines).sort()).toEqual([...HEADLINE_KINDS].sort());
    expect(Object.keys(FIXTURE_CONTENT.debrief).sort()).toEqual([...HIDDEN_KINDS].sort());
  });
});
