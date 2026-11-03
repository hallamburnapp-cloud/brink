import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HEADLINE_KINDS, HIDDEN_KINDS, PHONE_KINDS, checkContent } from '../engine/content';
import { RULES } from '../engine/rules';
import { REGIONS as MAP } from '../../thirty/ui/map/data';
import { fill, missingSlots } from './fill';
import { loadRedlinesContent, loadRedlinesRaw } from './load';
import { REGION_IDS, REGION_INFO, REGION_INFOS, isRegionId } from './regions';
import { LADDER_WORDS, MAX_TAPE_CHARS } from './schema';
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
    // SPEC-SMALL "every word on a form or a slip is true of what the engine does": BACK IT moves no piece, so no form says it does.
    expect(fill(moment.options.back.cost, { piece: 'the brigade', cost: 12 })).toBe('we stand by it in public · costs 12 influence · we keep our word');
    expect(fill(moment.options.down.cost, { region: 'Lintel' })).toBe("protest and hold · they'll believe us less · Lintel may fall");
    for (const p of content!.phones) for (const key of ['back', 'down', 'wait'] as const) expect(p.options[key].cost, `${p.id}.${key}`).not.toMatch(/\b(move|send) \{piece\}|\{piece\} (up|in)\b|they may move first|the stakes go up/);
    // A form that costs influence names the number (the trawler's LEAN ON THEM: {waitCost}).
    for (const p of content!.phones.filter((x) => x.kind === 'trawler')) expect(p.options.wait.cost).toContain('{waitCost}');
    // A carried call's slips are a week on, never the first round's word for word; the Director says what doubt looks like.
    for (const p of content!.phones.filter((x) => ['test', 'test-inherited', 'feint'].includes(x.kind))) {
      expect(p.againAdvisers, p.id).toBeDefined();
      for (const r of ['hawk', 'dove', 'intel'] as const) expect(p.againAdvisers![r]).not.toBe(p.advisers[r]);
      expect(p.intelDoubted, p.id).toBeDefined();
    }
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

  it('binds every number word about a rule to RULES, so a rule change fails until the words follow', () => {
    const S = content!.strings;
    const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
    const value = (token: string): number => {
      const t = token.toLowerCase();
      if (/^\d+$/.test(t)) return Number(t);
      const w = S.numbers.indexOf(t);
      return w >= 0 ? w : ORDINALS.indexOf(t);
    };
    // Where a sentence names a rule's number, and the rule it must equal.
    const BINDINGS: Array<[RegExp, number, string]> = [
      [/\b(\w+) weeks\b/gi, RULES.weeks, 'weeks'],
      [/\bweek (\w+) ends\b/gi, RULES.weeks, 'weeks'],
      [/^of (\d+)$/gi, RULES.weeks, 'weeks'],
      [/\bworld war at (\d+)\b/gi, RULES.warLimit, 'warLimit'],
      [/\b(\w+) is world war\b/gi, RULES.warLimit, 'warLimit'],
      [/\bthe (\w+) place is fighting\b/gi, RULES.warLimit, 'warLimit'],
      [/\bat (\d+) they sign\b/gi, RULES.willSign, 'willSign'],
      [/\b(\w+) promises is the most\b/gi, RULES.maxPromises, 'maxPromises'],
      [/\b(\w+) promises at most\b/gi, RULES.maxPromises, 'maxPromises'],
      [/\bcosts (\d+) influence a week\b/gi, RULES.upkeep, 'upkeep'],
      [/\bcosts (\d+) influence · one move a week\b/gi, RULES.moveCost, 'moveCost'],
      [/\bcosts (\d+) now\b/gi, RULES.promiseCost, 'promiseCost'],
      [/\bthen (\d+) a week\b/gi, RULES.upkeep, 'upkeep'],
      [/\bpromise costs (\d+) a week\b/gi, RULES.upkeep, 'upkeep'],
      [/\bgain (\d+) a week\b/gi, RULES.income, 'income'],
      [/\bfrom week (\w+)\b/gi, RULES.wayOut.fromWeek, 'wayOut.fromWeek'],
    ];
    /** Numbers that are not a rule's (a count, a round of the call, a flavour line). */
    const FREE = [/\bsecond source\b/i, /\b(second|third) week of this\b/i, /\bthree ways out\b/i, /^1 place fighting\b/, /\bthree lines\b/i, /\bin two places a week\b/i];
    const NUMBER = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|[2-9]|\d{2,})\b/gi;
    const all: Array<[string, string]> = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node === 'string') all.push([path, node]);
      else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    };
    walk({ ...S, numbers: [], flavour: [] }, '');
    let bound = 0;
    for (const [path, text] of all) {
      const covered: Array<[number, number]> = [];
      for (const [re, rule, name] of BINDINGS) {
        for (const m of text.matchAll(re)) {
          const n = value(m[1]);
          if (n < 0) continue;
          bound++;
          expect(n, `${path}: "${text}" names ${m[1]}, but RULES.${name} is ${rule}`).toBe(rule);
          covered.push([m.index!, m.index! + m[0].length]);
        }
      }
      for (const re of FREE) {
        const m = re.exec(text);
        if (m) covered.push([m.index, m.index + m[0].length]);
      }
      for (const m of text.matchAll(NUMBER)) {
        const inside = covered.some(([a, b]) => m.index! >= a && m.index! < b);
        expect(inside, `${path}: "${text}" names "${m[0]}"; bind it to a rule in this test or list it as free`).toBe(true);
      }
    }
    // Every rule the screens name is bound somewhere: the weeks, world war, the treaty line.
    expect(bound).toBeGreaterThanOrEqual(10);
    // The calendar and the WAR line read the numbers from the rules through their slots, never from the pack.
    expect(fill(S.screen.weekOf, { weeks: RULES.weeks })).toBe(`of ${RULES.weeks}`);
    for (const k of ['warNone', 'warOne', 'warMany'] as const) expect(S.screen[k]).toContain('world war at {limit}');
    expect(S.headlines.frozen).toMatch(new RegExp(`^Week ${S.numbers[RULES.weeks]} ends`));
    expect(S.endings.frozen[0]).toMatch(new RegExp(`^Week ${S.numbers[RULES.weeks]} ends`));
  });

  it('keeps every line the teleprinter prints within its width', () => {
    const S = content!.strings;
    const samples = samplesFor(content);
    // The widest value each tape slot can take once the engine fills it.
    const tape: Record<string, string> = {
      ...samples,
      n: 'two places',
      why: Object.values(S.wintermast).map((w) => fill(w, samples)).reduce((a, b) => (b.length > a.length ? b : a), ''),
      bloc: Object.values(S.blocs).reduce((a, b) => (b.length > a.length ? b : a), ''),
      term: Object.values(S.terms).reduce((a, b) => (b.length > a.length ? b : a), ''),
      step: S.words.steps.reduce((a, b) => (b.length > a.length ? b : a), ''),
      piece: Object.values(S.pieces).reduce((a, b) => (b.length > a.length ? b : a), ''),
      region: Object.values(REGION_INFO).map((r) => r.name).reduce((a, b) => (b.length > a.length ? b : a), ''),
      from: Object.values(REGION_INFO).map((r) => r.name).reduce((a, b) => (b.length > a.length ? b : a), ''),
    };
    // The spread names two neighbours: every real pair (outside the Cap) is filled.
    for (const r of REGION_INFOS) {
      if (r.bloc === 'CAP') continue;
      for (const n of r.neighbours) {
        if (REGION_INFO[n].bloc === 'CAP') continue;
        const line = fill(S.headlines.spread, { from: r.name, region: REGION_INFO[n].name });
        expect(line.length, `headlines.spread: "${line}"`).toBeLessThanOrEqual(MAX_TAPE_CHARS);
      }
    }
    for (const kind of HEADLINE_KINDS) {
      if (kind === 'declared' || kind === 'spread') continue;
      const line = fill(S.headlines[kind], tape);
      expect(missingSlots(S.headlines[kind], tape), kind).toEqual([]);
      expect(line.length, `headlines.${kind}: "${line}"`).toBeLessThanOrEqual(MAX_TAPE_CHARS);
    }
    for (const l of content!.lines) expect(fill(S.headlines.declared, { line: l.tape }).length, l.id).toBeLessThanOrEqual(MAX_TAPE_CHARS);
    for (const f of S.flavour) expect(f.length, f).toBeLessThanOrEqual(MAX_TAPE_CHARS);
    // The places' own names fit beside the longest fixed words too.
    expect(MAX_TAPE_CHARS).toBe(46);
  });

  it('every declared line\'s tape form is true on the sheet: it names exactly what crosses it and exactly where', () => {
    const name = (id: string) => REGION_INFO[id].name;
    const scatter = REGION_INFOS.filter((r) => r.bloc === 'SCT').map((r) => r.id);
    const x = (id: string) => MAP.find((r) => r.id === id)!.x;
    const y = (id: string) => MAP.find((r) => r.id === id)!.y;
    const middle = scatter.reduce((a, r) => a + x(r), 0) / scatter.length;
    // The outer islands: the Scatter's seaward column, out from the Republic's coast (Tern Isle, where the fleet starts, is not one).
    const outer = scatter.filter((r) => x(r) > middle);
    expect(outer.sort()).toEqual(['DRF', 'LNK', 'SHL']);
    expect(outer).not.toContain('TRN');
    const PHRASES: Array<[RegExp, string[]]> = [
      [/\bthe Sound\b/, REGION_INFOS.filter((r) => r.bloc === 'SND').map((r) => r.id)],
      [/\bthe Scatter\b/, scatter],
      [/\bthe outer islands\b/, outer],
      [/\bFarsouth's ports\b/, REGION_INFOS.filter((r) => r.bloc === 'FRS' && r.port).map((r) => r.id)],
      [/\bFarsouth\b(?!'s)/, REGION_INFOS.filter((r) => r.bloc === 'FRS').map((r) => r.id)],
      [/\bnorth of Edda Vale\b/, REGION_INFOS.filter((r) => r.bloc === 'HMR' && y(r.id) < y('EDV') - 20).map((r) => r.id)],
    ];
    const WHAT: Record<string, RegExp> = { proximity: /\bforces\b/, sea: /\b(fleet|warships)\b/, missiles: /\bbrigade\b/, alliance: /\bpromises\b/ };
    for (const l of content!.lines) {
      expect(l.tape, l.id).toMatch(WHAT[l.kind]);
      const named = new Set<string>();
      let rest = l.tape.replace(/^Wintermast: /, '');
      for (const [re, ids] of PHRASES) if (re.test(rest)) {
        ids.forEach((r) => named.add(r));
        rest = rest.replace(re, '');
      }
      for (const r of REGION_INFOS) if (r.bloc !== 'CAP' && rest.includes(r.name)) named.add(r.id);
      expect([...named].sort(), `${l.id}: "${l.tape}" against ${l.regions.map(name).join(', ')}`).toEqual([...l.regions].sort());
    }
  });

  it('the explanation and HOW TO PLAY open with the sheet as it is drawn: hatched, then red, with the clock\'s ticks', () => {
    const S = content!.strings;
    const first = 'The Federation is pushing. Where it pushes, the map is hatched; where it wins, it turns red.';
    expect(S.explanation[0].startsWith(first)).toBe(true);
    expect(S.howToPlay.lines[0].startsWith(first)).toBe(true);
    expect(S.explanation[0]).toMatch(/\bticks\b/i);
    expect(S.howToPlay.lines[0]).toMatch(/\bticks\b/i);
    expect(JSON.stringify(S)).not.toMatch(/amber/i);
  });

  it('HOW TO PLAY says what a watcher sees first and how to act (the second review): pins and arrows, the clock, press and hold, tap a counter then a place, the three lines, influence, and when 100 does not sign', () => {
    const S = content!.strings;
    const all = S.howToPlay.lines.join(' ');
    expect(all).toMatch(/pins and pencil arrows/i);
    expect(all).toMatch(/feint/);
    expect(all).toMatch(/press and hold/i);
    expect(all).toMatch(/tap your fleet or brigade, then a place/i);
    expect(all).toMatch(/three lines/);
    expect(all).toMatch(new RegExp(`gain ${RULES.income} a week`));
    expect(all).toMatch(/unless they took a place that week or a hatched place stands unanswered/);
    expect(all).toMatch(/provocation/);
    // The second recheck's cold tester: the limit of three promises, the full price of a provocation, WAIT's rising price,
    // and which falls move the ladder (a place you could have reached) are on the card, not found by paying.
    expect(all).toMatch(new RegExp(`${S.numbers[RULES.maxPromises]} promises at most`));
    expect(all).toMatch(/provocation, backed at full price/);
    expect(all).toMatch(/WAIT raises the price/);
    expect(all).toMatch(/losing a place you could have reached, moves them up/);
    expect(S.explanation[1]).toMatch(/press and hold/i);
    // The slips' and the note's words for what an order would do (the screens wire them; SPEC-SMALL "A form that will fail says so").
    for (const k of ['moveHint', 'crosses', 'leavesDashed', 'promiseCall', 'promiseProvokes'] as const) expect(S.act[k].length).toBeGreaterThan(5);
    expect(S.act.crosses).toContain('{line}');
    expect(S.note.fallsMany).toContain('{places}');
    expect(S.refusals['too-early']).toBeTruthy();
    expect(S.screen.warOne).toMatch(/place/);
    expect(S.screen.north).toBe('N');
  });

  it('says what another bloc signs, and prints an answer as the act, never the forecast', () => {
    const S = content!.strings;
    expect(S.headlines.blocSigned).toMatch(/treaty/);
    expect('heldWeek' in S.headlines).toBe(false);
    for (const set of Object.values(S.answers)) for (const t of Object.values(set)) {
      expect(t).toMatch(/^You /);
      expect(t).not.toMatch(/\b(will|likely|may)\b/);
    }
    expect(fill(S.answers['fall-unpromised'].wait, { region: 'Vessary' })).toBe('You protested at Vessary.');
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
