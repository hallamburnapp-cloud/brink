import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HIDDEN_KINDS, PHONE_KINDS, checkContent } from '../engine/content';
import { fill, missingSlots } from './fill';
import { loadRedlinesContent, loadRedlinesRaw } from './load';
import { REGION_IDS, REGION_INFO, isRegionId } from './regions';
import { LADDER_WORDS } from './schema';
import { samplesFor, wordsWithSlots } from './validate';

const PACK = join(process.cwd(), 'content-redlines');

describe('the shipped pack', () => {
  const { content, issues } = loadRedlinesContent(PACK);

  it('loads with no errors and no warnings (the validator is strict-clean) and satisfies the engine', () => {
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.filter((i) => i.level === 'warning')).toEqual([]);
    expect(content).not.toBeNull();
    expect(checkContent(content!)).toEqual([]);
  });

  it('has the four advisers with voices, the Hawk, the Dove and the Director first', () => {
    expect(content!.adviserOrder).toEqual(['hawk', 'dove', 'intel', 'ambassador']);
    for (const id of content!.adviserOrder) expect(content!.advisers[id].voice.length).toBeGreaterThan(20);
    expect(content!.advisers.hawk.name).toBe('Ruun Halder');
    expect(content!.advisers.hawk.tag).toBe('the Hawk');
  });

  it('has eight declared lines, each covering real regions outside the Cap, of all four kinds, with a tape line', () => {
    expect(content!.lines).toHaveLength(8);
    expect([...new Set(content!.lines.map((l) => l.kind))].sort()).toEqual(['alliance', 'missiles', 'proximity', 'sea']);
    for (const l of content!.lines) {
      expect(l.regions.length).toBeGreaterThan(0);
      for (const r of l.regions) {
        expect(isRegionId(r)).toBe(true);
        expect(REGION_INFO[r].bloc).not.toBe('CAP');
      }
      expect(l.tape.length).toBeLessThanOrEqual(46);
    }
    // The collision of MOMENT.md: the inherited promise at Lintel against forces in the Sound.
    const sound = content!.lines.find((l) => l.id === 'sound-forces')!;
    expect(sound.kind).toBe('proximity');
    expect(sound.regions).toContain('LTL');
  });

  it('has at least eight phone templates covering every kind the engine rings', () => {
    expect(content!.phones.length).toBeGreaterThanOrEqual(8);
    const byKind = (k: string) => content!.phones.filter((p) => p.kind === k).length;
    expect(byKind('test-inherited')).toBeGreaterThanOrEqual(2);
    expect(byKind('feint')).toBeGreaterThanOrEqual(2);
    for (const kind of PHONE_KINDS) expect(byKind(kind)).toBeGreaterThanOrEqual(1);
  });

  it('keeps every call to forty words once filled, with three choices and no annotation', () => {
    const samples = samplesFor(content);
    for (const p of content!.phones) {
      expect(wordsWithSlots(p.text)).toBeLessThanOrEqual(40);
      if (p.again) expect(wordsWithSlots(p.again)).toBeLessThanOrEqual(40);
      expect(Object.keys(p.options)).toEqual(['back', 'down', 'wait']);
      const texts = [p.text, p.again ?? '', p.advisers.hawk, p.advisers.dove, p.advisers.intel, p.options.back.cost, p.options.down.cost, p.options.wait.cost];
      for (const text of texts) {
        expect(text).not.toMatch(/\bif (they|you)\b/i);
        expect(missingSlots(text, samples)).toEqual([]);
      }
      expect(content!.advisers[p.caller]).toBeDefined();
    }
    // The MOMENT.md call fills to its forty words, with the engine's slot values.
    const moment = content!.phones.find((p) => p.id === 'test-inherited-armour')!;
    expect(fill(moment.text, { region: 'Lintel' })).toBe('Federation armour is at Lintel, the promise you inherited. Two brigades, lights on, not moving. They want to see what you do.');
    expect(fill(moment.options.back.cost, { piece: 'the brigade', cost: 12 })).toBe('move the brigade up · costs 12 influence · we keep our word');
    expect(fill(moment.options.down.cost, { region: 'Lintel' })).toBe("protest and hold · they'll believe us less · Lintel will likely fall");
  });

  it('has a thought for every hidden event the engine logs', () => {
    for (const kind of HIDDEN_KINDS) expect(content!.debrief[kind].length).toBeGreaterThan(0);
    expect(fill(content!.debrief.feintBackedDown[0], { region: 'Shoal' })).toBe('They were bluffing at Shoal. Backing it would have cost nothing.');
    expect(fill(content!.debrief.jumpy[0], { piece: 'the brigade', region: 'Vessary' })).toBe('To them, the brigade at Vessary looked like an invasion.');
  });

  it('carries the words on screen from the spec', () => {
    const S = content!.strings;
    expect(S.words.steps).toEqual([...LADDER_WORDS]);
    expect(S.words.defend).toBe('WE DEFEND');
    expect(S.words.worldWar).toBe('WORLD WAR');
    expect(S.words.sendOrders).toBe('SEND ORDERS');
    expect(S.act.promise).toBe('PROMISE TO DEFEND');
    expect(S.explanation).toHaveLength(3);
    expect(fill(S.endings.treaty[0], { week: 6, fighting: S.counts.one })).toBe('Signed in week 6 with one place still fighting.');
    expect(fill(S.dials.line, { a: S.dials.appetite.high, b: S.dials.jumpiness.low })).toBe('They were hungry and not easily scared.');
    expect(S.numbers).toHaveLength(13);
    expect(JSON.stringify(S)).not.toMatch(/\bBRINK\b/);
  });

  it('reads the thirty regions from the shared map', () => {
    expect(REGION_IDS).toHaveLength(30);
    expect(REGION_INFO.LTL.blocName).toBe('the Sound');
    expect(REGION_INFO.EDV.capital).toBe(true);
  });
});

describe('loadRedlinesRaw', () => {
  const dir = mkdtempSync(join(tmpdir(), 'redlines-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reports missing files and YAML parse errors by file, and compiles nothing without strings.yaml', () => {
    writeFileSync(join(dir, 'advisers.yaml'), '- id: hawk\n  name: [unclosed\n');
    const { raw, issues } = loadRedlinesRaw(dir);
    expect(raw.phones.file).toBe('phones.yaml');
    expect(issues.find((i) => i.where === 'advisers.yaml')?.message).toMatch(/YAML parse error/);
    expect(issues.find((i) => i.where === 'strings.yaml')?.message).toBe('file is missing');
    const { content, issues: all } = loadRedlinesContent(dir);
    expect(content).toBeNull();
    expect(all.filter((i) => i.level === 'error').length).toBeGreaterThanOrEqual(2);
  });
});
