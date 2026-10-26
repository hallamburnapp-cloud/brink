/**
 * Cross-reference and voice checks on a compiled pack: regions exist, advisers and callers exist
 * and have voices, every phone is forty words or fewer once filled, no option or adviser line
 * carries a conditional annotation ("if they", "if you"), the Director reports only what she has
 * seen, slots are known and the right ones are present, the eight lines and the phone and debrief
 * kinds the first build needs are all there, the words on screen are the right words, and the
 * engine's own `checkContent` finds nothing missing. Pure: takes content, returns issues.
 */
import { checkContent } from '../engine/content.ts';
import { fill, slotsOf } from './fill.ts';
import { CAP_BLOC, REGION_INFO, isRegionId, regionName } from './regions.ts';
import {
  DECLARED_LINES,
  HARD_TAPE_CHARS,
  HIDDEN_KINDS,
  LADDER_WORDS,
  LINE_KINDS,
  MAX_ADVISER_CHARS,
  MAX_ADVISER_WORDS,
  MAX_COST_CHARS,
  MAX_LABEL_WORDS,
  MAX_LINE_WORDS,
  MAX_PHONE_WORDS,
  MAX_TAPE_CHARS,
  MAX_THOUGHT_WORDS,
  MAX_WINTERMAST_CHARS,
  PHONE_KEYS,
  SOFT_COST_CHARS,
  TEST_KINDS,
  UPPER_PATHS,
  wordCount,
} from './schema.ts';
import type { ContentIssue, LineKind, PackPhone, PhoneKind, RedlinesPack } from './types.ts';

/**
 * How many words a slot may expand to, for the forty-word count: a region name is two words
 * ("Lantern Key"), a piece two ("the brigade"), a line's text ten (quote it nowhere in a call).
 */
export const SLOT_WIDTH: Readonly<Record<string, number>> = {
  region: 2, promise: 2, from: 2, at: 2, bloc: 2, piece: 2, n: 2, cost: 1, step: 1, week: 1,
  line: 10, why: 10, term: 4, fighting: 4, because: 14, cause: 10, a: 3, b: 3, hold: 6,
};

/** The widest values each slot takes, for the character limits; the pack's own longest strings where it has them. */
export function samplesFor(c: RedlinesPack | null): Record<string, string> {
  const longest = (xs: readonly string[], fallback: string) => xs.reduce((a, b) => (b.length > a.length ? b : a), fallback);
  const S = c?.strings;
  return {
    region: 'Brindle Coast', promise: 'Brindle Coast', from: 'Morrow Downs', at: 'Morrow Downs', bloc: 'the Scatter', piece: 'the brigade',
    n: 'eleven places', cost: '24', step: 'FIGHTING', week: '8', fighting: 'eleven places still fighting',
    line: longest(c?.lines.map((l) => l.text) ?? [], 'Republic forces in the Sound would be a grave matter. We say it once, and we say it plainly.'),
    why: longest(S ? Object.values(S.why) : [], 'your promise at Brindle Coast was the thing in their way'),
    term: longest(S ? Object.values(S.terms) : [], 'a dropped promise'),
    because: longest(S ? Object.values(S.because) : [], 'They stopped because they could not take Brindle Coast and you gave them a way out.'),
    cause: longest(S ? Object.values(S.causes) : [], 'when the promise you inherited was tested and you backed down'),
    a: 'not very hungry', b: 'not easily scared',
    hold: longest(S ? Object.values(S.hold) : [], 'nothing of ours is within reach'),
  };
}

/** Slots each file may use (src/redlines/engine/content.ts). */
export const PHONE_SLOTS: readonly string[] = ['region', 'promise', 'line', 'cost', 'piece', 'from', 'step'];
export const DEBRIEF_SLOTS: readonly string[] = [...PHONE_SLOTS, 'why', 'n'];
export const STRING_SLOTS: readonly string[] = Object.keys(SLOT_WIDTH);

/** Slots a phone kind's message must carry, so the call always says where. */
export const REQUIRED_SLOTS: Readonly<Record<PhoneKind, readonly string[]>> = {
  test: ['region'],
  'test-inherited': ['region'],
  feint: ['region'],
  'false-alarm': ['region'],
  trawler: ['region'],
  'bluff-crossed': ['region'],
  summit: [],
  'fall-unpromised': ['region'],
};

/** How many templates of each kind the first build needs (SPEC-SMALL "What is built first", BUILD.md). */
export const MIN_PHONES: Readonly<Record<PhoneKind, number>> = {
  'test-inherited': 2, test: 1, feint: 2, 'false-alarm': 1, trawler: 1, 'bluff-crossed': 1, summit: 1, 'fall-unpromised': 1,
};
export const MIN_PHONES_TOTAL = 8;

/** The conditional annotation the review rejected: never, in any option or adviser line. */
const CONDITIONAL = /\bif (they|you)\b/i;
const ANY_IF = /\bif\b/i;
/** Naming what the enemy is like, in any voice (the dials name it, in the debrief only). */
const PROFILE = /\b(scared of us|takes what's unguarded|pushes when we blink|wants three|their appetite|their jumpiness|jumpy)\b/i;
/** The Director reports what she has seen: never their minds, never odds. */
const INTEL_MIND = /\bthey (think|want|believe|mean|intend|will|would|are going to|are bluffing|are testing)\b/i;
const INTEL_ODDS = /(\d+\s?%|\bper ?cent\b|\bchance\b|\bodds\b|\btimes in\b|\bprobabl|\blikely\b|\bsure\b|\bfairly\b)/i;
/** The fictional world: no real powers, no real places. */
const REAL_WORLD = /\b(NATO|Russia|Russian|America|American|China|Chinese|Soviet|Washington|Moscow|Ukraine|Europe|European|Pentagon|Kremlin|USA|U\.S\.|Britain|British|England|Germany|France|Japan|Korea)\b/;
/** The brand is one constant (BRAND.name), never written in content. */
const BRAND_WORD = /\bBRINK\b/;

export function wordsWithSlots(text: string): number {
  // Each slot stands in for one word here and adds the rest of its width, so "{region}." stays one word plus one.
  let extra = 0;
  const stood = text.replace(/\{([a-z][a-zA-Z]*)\}/g, (_m, name: string) => {
    extra += (SLOT_WIDTH[name] ?? 2) - 1;
    return 'slot';
  });
  return wordCount(stood) + extra;
}

export function validateRedlines(content: RedlinesPack): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });
  const samples = samplesFor(content);
  const sampleFill = (t: string) => fill(t, samples);

  const checkWorld = (where: string, text: string, label?: string) => {
    const at = label ? `${label}: ` : '';
    if (REAL_WORLD.test(text)) err(where, `${at}names the real world ("${REAL_WORLD.exec(text)?.[0]}"); the world is fictional`);
    if (BRAND_WORD.test(text)) err(where, `${at}writes the brand name; it is one constant (BRAND.name), never content`);
  };
  const checkSlots = (where: string, text: string, allowed: readonly string[], label: string) => {
    for (const slot of slotsOf(text)) if (!allowed.includes(slot)) err(where, `${label}: unknown slot {${slot}} (allowed: ${allowed.map((s) => `{${s}}`).join(' ')})`);
  };
  const checkVoice = (where: string, text: string, label: string) => {
    if (CONDITIONAL.test(text)) err(where, `${label}: "${CONDITIONAL.exec(text)?.[0]}" is a conditional annotation; advisers argue in character, nobody annotates`);
    else if (ANY_IF.test(text)) warn(where, `${label}: an "if"; say it as a plain statement or an order`);
    if (PROFILE.test(text)) err(where, `${label}: names what the enemy is like ("${PROFILE.exec(text)?.[0]}"); the player does the inference`);
  };

  // ---------------------------------------------------------------- advisers
  for (const role of ['hawk', 'dove', 'intel'] as const) if (!content.advisers[role]) err('advisers.yaml', `no "${role}" adviser: every call needs the Hawk, the Dove and the Director`);
  if (!content.advisers.ambassador) err('advisers.yaml', 'no "ambassador": the inherited promise and the summit are his to call about');
  for (const id of content.adviserOrder) {
    const a = content.advisers[id];
    const where = `advisers.yaml › ${id}`;
    if (!a.voice.trim()) err(where, 'the voice note is empty');
    if (!/^the /i.test(a.tag)) warn(where, `the tag is written "the Hawk", not "${a.tag}"`);
    checkWorld(where, `${a.name} ${a.role} ${a.tag} ${a.voice}`);
  }

  // ---------------------------------------------------------------- lines
  if (content.lines.length < DECLARED_LINES) err('lines.yaml', `${content.lines.length} lines; Wintermast has ${DECLARED_LINES} to draw from`);
  else if (content.lines.length > DECLARED_LINES) warn('lines.yaml', `${content.lines.length} lines; the spec names ${DECLARED_LINES}`);
  const kindsSeen = new Set<LineKind>();
  for (const l of content.lines) {
    const where = `lines.yaml › ${l.id}`;
    kindsSeen.add(l.kind);
    for (const r of l.regions) {
      if (!isRegionId(r)) err(where, `unknown region "${r}"`);
      else if (REGION_INFO[r].bloc === CAP_BLOC) err(where, `${regionName(r)} is in the Cap: a line is about places outside the Federation`);
    }
    if (new Set(l.regions).size !== l.regions.length) err(where, 'a region is listed twice');
    if (wordCount(l.text) > MAX_LINE_WORDS) err(where, `the declaration is ${wordCount(l.text)} words; at most ${MAX_LINE_WORDS}`);
    if (l.tape.length > HARD_TAPE_CHARS) err(where, `the tape line is ${l.tape.length} characters; the teleprinter prints ${MAX_TAPE_CHARS}`);
    else if (l.tape.length > MAX_TAPE_CHARS) warn(where, `the tape line is ${l.tape.length} characters; aim for ${MAX_TAPE_CHARS}`);
    if (!/^Wintermast\b/.test(l.tape)) warn(where, 'the tape line starts with "Wintermast", so the watcher knows who is speaking');
    for (const [label, text] of [['text', l.text], ['tape', l.tape]] as const) {
      if (slotsOf(text).length) err(where, `${label}: a line carries no slots`);
      checkWorld(where, text, label);
    }
    if (PROFILE.test(l.text)) err(where, 'the declaration names what they are like; Wintermast declares, it does not confess');
  }
  for (const k of LINE_KINDS) if (!kindsSeen.has(k)) warn('lines.yaml', `no ${k} line`);

  // ---------------------------------------------------------------- phones
  if (content.phones.length < MIN_PHONES_TOTAL) err('phones.yaml', `${content.phones.length} templates; the first build has at least ${MIN_PHONES_TOTAL}`);
  for (const [kind, min] of Object.entries(MIN_PHONES) as [PhoneKind, number][]) {
    const n = content.phones.filter((p) => p.kind === kind).length;
    if (n < min) (kind === 'test' ? warn : err)('phones.yaml', `${n} "${kind}" template${n === 1 ? '' : 's'}; the first build needs ${min}`);
  }
  for (const p of content.phones) validatePhone(content, p, issues, samples);
  // The trawler rings about an island you promised or one you did not; a template marked for one case needs a partner for the other (or one marked for neither).
  const trawlers = content.phones.filter((p) => p.kind === 'trawler');
  for (const when of ['promised', 'unpromised'] as const) {
    if (trawlers.length && !trawlers.some((p) => !p.when || p.when === when)) err('phones.yaml', `no trawler template for an island you ${when === 'promised' ? 'promised' : 'did not promise'} ("when: ${when}", or one without "when")`);
  }

  // ---------------------------------------------------------------- debrief
  for (const kind of HIDDEN_KINDS) if (!content.debrief[kind]?.length) err('debrief.yaml', `no thought for the hidden event "${kind}"`);
  for (const kind of HIDDEN_KINDS) {
    const where = `debrief.yaml › ${kind}`;
    (content.debrief[kind] ?? []).forEach((t, i, all) => {
      const label = all.length > 1 ? `thought ${i + 1}` : 'thought';
      const n = wordsWithSlots(t);
      if (n > MAX_THOUGHT_WORDS) err(where, `${label}: ${n} words; a thought is ${MAX_THOUGHT_WORDS} or fewer`);
      checkSlots(where, t, DEBRIEF_SLOTS, label);
      if (!/\b(they|you|your|them|their)\b/i.test(t)) warn(where, `${label}: addressed to nobody; thoughts say "they" and "you"`);
      if (/\b(will|shall)\b/i.test(t)) warn(where, `${label}: the debrief is in the past tense`);
      if (PROFILE.test(t)) err(where, `${label}: names a profile; the dials are named only in strings.dials`);
      if (/^\{piece\}/.test(t)) err(where, `${label}: starts with {piece}, which the engine fills in lower case ("the brigade")`);
      checkWorld(where, t, label);
    });
  }

  // ---------------------------------------------------------------- strings
  validateStrings(content, issues, samples);

  // ---------------------------------------------------------------- the engine's own list of what it needs
  for (const problem of checkContent(content)) err('engine › checkContent', problem);

  return issues;
}

function validatePhone(content: RedlinesPack, p: PackPhone, issues: ContentIssue[], samples: Record<string, string>): void {
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });
  const where = `phones.yaml › ${p.id}`;
  const isTest = TEST_KINDS.includes(p.kind);
  const sampleFill = (t: string) => fill(t, samples);

  if (!content.advisers[p.caller]) err(where, `unknown caller "${p.caller}"`);
  if (p.when && p.kind !== 'trawler') warn(where, '"when" is only read on a trawler template');
  if (p.kind === 'trawler' && p.when === 'unpromised' && /\bour promise\b/i.test(`${p.text} ${p.advisers.hawk} ${p.advisers.dove} ${p.advisers.intel}`)) err(where, 'an unpromised trawler call must not claim "our promise"');

  const checkText = (label: string, text: string) => {
    const n = wordsWithSlots(text);
    if (n > MAX_PHONE_WORDS) err(where, `${label}: ${n} words once the slots are filled; the call is ${MAX_PHONE_WORDS} words or fewer`);
    for (const slot of slotsOf(text)) if (!PHONE_SLOTS.includes(slot)) err(where, `${label}: unknown slot {${slot}} (allowed: ${PHONE_SLOTS.map((s) => `{${s}}`).join(' ')})`);
    if (/\{line\}/.test(text)) warn(where, `${label}: {line} is a whole declaration, up to ${MAX_LINE_WORDS} words; a call rarely has room to quote it`);
    if (CONDITIONAL.test(text)) err(where, `${label}: "${CONDITIONAL.exec(text)?.[0]}" is a conditional annotation`);
    if (PROFILE.test(text)) err(where, `${label}: names what the enemy is like ("${PROFILE.exec(text)?.[0]}")`);
    if (REAL_WORLD.test(text)) err(where, `${label}: names the real world ("${REAL_WORLD.exec(text)?.[0]}")`);
    if (BRAND_WORD.test(text)) err(where, `${label}: writes the brand name`);
    if (!/[.!?]$/.test(text.trim())) warn(where, `${label}: does not end with a full stop`);
    if (/^\{piece\}/.test(text) || /[.!?]\s+\{piece\}/.test(text)) err(where, `${label}: a sentence starts with {piece}, which the engine fills in lower case ("the brigade")`);
  };
  checkText('text', p.text);
  for (const slot of REQUIRED_SLOTS[p.kind]) if (!slotsOf(p.text).includes(slot)) err(where, `text: a "${p.kind}" call names {${slot}}`);
  if (p.again) checkText('again', p.again);
  else if (isTest) warn(where, `a "${p.kind}" call reads better with "again": the message for the second week after WAIT`);
  if (!isTest && p.again) warn(where, '"again" is only read on a test (an event is answered once)');

  for (const role of ['hawk', 'dove', 'intel'] as const) {
    const t = p.advisers[role];
    const label = `advisers.${role}`;
    const n = wordsWithSlots(t);
    const filled = sampleFill(t);
    if (n > MAX_ADVISER_WORDS) err(where, `${label}: ${n} words; a slip is one line, at most ${MAX_ADVISER_WORDS}`);
    if (filled.length > MAX_ADVISER_CHARS) err(where, `${label}: ${filled.length} characters once filled; the slip holds ${MAX_ADVISER_CHARS}`);
    for (const slot of slotsOf(t)) if (!PHONE_SLOTS.includes(slot)) err(where, `${label}: unknown slot {${slot}}`);
    if (CONDITIONAL.test(t)) err(where, `${label}: "${CONDITIONAL.exec(t)?.[0]}" is a conditional annotation; advisers argue in character, nobody annotates`);
    else if (ANY_IF.test(t)) warn(where, `${label}: an "if"; say it as a plain statement or an order`);
    if (PROFILE.test(t)) err(where, `${label}: names what the enemy is like ("${PROFILE.exec(t)?.[0]}"); the player does the inference`);
    if (role === 'intel') {
      if (INTEL_MIND.test(t)) err(where, `${label}: "${INTEL_MIND.exec(t)?.[0]}" reads their minds; the Director reports what she has seen`);
      if (INTEL_ODDS.test(t)) err(where, `${label}: "${INTEL_ODDS.exec(t)?.[0]}" is an estimate; the Director gives no odds`);
    }
    if (/^\{piece\}/.test(t) || /[.!?]\s+\{piece\}/.test(t)) err(where, `${label}: a sentence starts with {piece}, which the engine fills in lower case`);
    checkWorldLine(where, t, label, err);
  }

  // Options: three, each with a word and a cost in plain words.
  for (const key of PHONE_KEYS) {
    const o = p.options[key];
    const label = `options.${key}`;
    if (!/^[A-Z][A-Z' ]*$/.test(o.label)) err(where, `${label}: the label "${o.label}" is typed in capitals, letters only`);
    if (wordCount(o.label) > MAX_LABEL_WORDS) err(where, `${label}: the label "${o.label}" is ${wordCount(o.label)} words; at most ${MAX_LABEL_WORDS}`);
    if (slotsOf(o.label).length) err(where, `${label}: a label carries no slots`);
    const c = o.cost;
    const filled = sampleFill(c);
    if (filled.length > MAX_COST_CHARS) err(where, `${label}.cost: ${filled.length} characters once filled; the form holds ${MAX_COST_CHARS}`);
    else if (filled.length > SOFT_COST_CHARS) warn(where, `${label}.cost: ${filled.length} characters once filled; aim for ${SOFT_COST_CHARS}`);
    if (!c.includes('·')) warn(where, `${label}.cost: a cost is clauses joined by " · " ("costs 12 influence · we keep our word")`);
    for (const slot of slotsOf(c)) if (!PHONE_SLOTS.includes(slot)) err(where, `${label}.cost: unknown slot {${slot}}`);
    if (key !== 'back' && /\{cost\}/.test(c)) err(where, `${label}.cost: {cost} is the BACK IT price; it means nothing under ${o.label}`);
    if (CONDITIONAL.test(c)) err(where, `${label}.cost: "${CONDITIONAL.exec(c)?.[0]}" is a conditional annotation; the cost is in plain words`);
    else if (ANY_IF.test(c)) warn(where, `${label}.cost: an "if"; say what it costs and what may follow`);
    if (PROFILE.test(c)) err(where, `${label}.cost: names what the enemy is like`);
    if (/[.!?]$/.test(c.trim())) warn(where, `${label}.cost: a cost has no full stop`);
    checkWorldLine(where, c, `${label}.cost`, err);
  }
  if (isTest && !/\{cost\}/.test(p.options.back.cost)) warn(where, 'options.back.cost: the BACK IT cost says "{cost} influence"');
  const labels = PHONE_KEYS.map((k) => p.options[k].label.toLowerCase());
  if (new Set(labels).size !== labels.length) err(where, 'two choices say the same word');
  if (isTest) {
    const W = content.strings.words;
    const got = PHONE_KEYS.map((k) => p.options[k].label);
    if (got[0] !== W.back || got[1] !== W.down || got[2] !== W.wait) warn(where, `a test's choices are ${W.back} / ${W.down} / ${W.wait} (this one says ${got.join(' / ')})`);
  }
}

function checkWorldLine(where: string, text: string, label: string, err: (w: string, m: string) => void): void {
  if (REAL_WORLD.test(text)) err(where, `${label}: names the real world ("${REAL_WORLD.exec(text)?.[0]}")`);
  if (BRAND_WORD.test(text)) err(where, `${label}: writes the brand name`);
}

function validateStrings(content: RedlinesPack, issues: ContentIssue[], samples: Record<string, string>): void {
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });
  const S = content.strings;
  const where = (path: string) => `strings.yaml › ${path}`;
  const sampleFill = (t: string) => fill(t, samples);

  // Every string: known slots, fictional, no brand, no annotation.
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'string') {
      for (const slot of slotsOf(node)) if (!STRING_SLOTS.includes(slot)) err(where(path), `unknown slot {${slot}}`);
      if (REAL_WORLD.test(node)) err(where(path), `names the real world ("${REAL_WORLD.exec(node)?.[0]}")`);
      if (BRAND_WORD.test(node)) err(where(path), 'writes the brand name; it is one constant (BRAND.name)');
      if (CONDITIONAL.test(node)) err(where(path), `"${CONDITIONAL.exec(node)?.[0]}" is a conditional annotation`);
      if (PROFILE.test(node) && !path.startsWith('dials.')) err(where(path), 'names what the enemy is like outside the dials');
      return;
    }
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(S, '');

  const get = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), S);
  for (const path of UPPER_PATHS) {
    const v = get(path);
    if (typeof v === 'string' && v !== v.toUpperCase()) warn(where(path), `"${v}" is a word on a form or a stamp: typed in capitals`);
  }

  const needs = (path: string, text: string, slots: string[]) => {
    for (const slot of slots) if (!slotsOf(text).includes(slot)) err(where(path), `names {${slot}}`);
  };
  if (S.words.steps.join('|') !== LADDER_WORDS.join('|')) err(where('words.steps'), `the ladder words are ${LADDER_WORDS.join(', ')}`);
  if (S.words.defend !== 'WE DEFEND') err(where('words.defend'), 'the promise mark reads WE DEFEND');
  if (S.words.worldWar !== 'WORLD WAR') err(where('words.worldWar'), 'the last tick reads WORLD WAR');
  if (S.words.sendOrders !== 'SEND ORDERS') err(where('words.sendOrders'), 'the week ends with SEND ORDERS');
  if (S.words.back !== 'BACK IT' || S.words.down !== 'BACK DOWN' || S.words.wait !== 'WAIT') err(where('words'), 'the three answers are BACK IT, BACK DOWN, WAIT');
  if (S.act.promise !== 'PROMISE TO DEFEND') err(where('act.promise'), 'the hold menu reads PROMISE TO DEFEND');
  needs('collision.alliance', S.collision.alliance, ['region', 'line']);
  needs('collision.forces', S.collision.forces, ['region', 'line', 'piece']);
  needs('collision.near', S.collision.near, ['region', 'line', 'piece']);
  needs('collision.heading', S.collision.heading, ['region']);
  needs('endings.treaty[0]', S.endings.treaty[0], ['week', 'fighting']);
  needs('endings.treaty[1]', S.endings.treaty[1], ['because']);
  needs('endings.frozen[1]', S.endings.frozen[1], ['fighting']);
  needs('endings.war[0]', S.endings.war[0], ['week']);
  needs('endings.war[1]', S.endings.war[1], ['region', 'cause']);
  needs('dials.line', S.dials.line, ['a', 'b']);
  for (const k of ['many', 'sentenceMany', 'placesMany'] as const) needs(`counts.${k}`, S.counts[k], ['n']);
  needs('screen.warMany', S.screen.warMany, ['n']);
  needs('debrief.week', S.debrief.week, ['week']);
  for (const k of ['heldAndWayOut', 'held'] as const) needs(`because.${k}`, S.because[k], ['region']);
  for (const k of ['piece-there', 'piece-near'] as const) needs(`hold.${k}`, S.hold[k], ['piece']);
  for (const [k, t] of Object.entries(S.causes)) if (/^[A-Z]/.test(t) || /[.!?]$/.test(t)) warn(where(`causes.${k}`), 'a cause continues "It began at X, ..." in lower case, no full stop');

  // Wintermast's words for a refused way out: quoted, short enough for the tape after "Wintermast: ".
  for (const [k, t] of Object.entries(S.wintermast)) {
    const filled = sampleFill(t);
    if (!/^'.*'$/.test(t.trim())) warn(where(`wintermast.${k}`), "Wintermast's words are quoted: 'nothing to talk about yet'");
    if (filled.length > MAX_WINTERMAST_CHARS) err(where(`wintermast.${k}`), `${filled.length} characters once filled; the tape has room for ${MAX_WINTERMAST_CHARS} after "Wintermast: "`);
  }
  // The tape: 46 characters once filled. `declared` is filled with the line's `tape` (the engine prints the short form);
  // `wayOutRefusedWhy` is filled with Wintermast's words, not a debrief reason.
  const longestWord = Object.values(S.wintermast).reduce((a, b) => (sampleFill(b).length > sampleFill(a).length ? b : a), '');
  const tapeSamples = { ...samples, why: sampleFill(longestWord) };
  const tapeFill = (t: string) => fill(t, tapeSamples);
  for (const [k, t] of Object.entries(S.headlines)) {
    const filled = k === 'declared' ? fill(t, { ...samples, line: samples.region }) : tapeFill(t);
    if (filled.length > HARD_TAPE_CHARS) err(where(`headlines.${k}`), `${filled.length} characters once filled; the teleprinter prints ${MAX_TAPE_CHARS}`);
    else if (filled.length > MAX_TAPE_CHARS) warn(where(`headlines.${k}`), `${filled.length} characters once filled; aim for ${MAX_TAPE_CHARS}`);
    if (/[.!?]$/.test(t.trim()) && k !== 'declared') warn(where(`headlines.${k}`), 'a tape line has no full stop; clauses join with " · "');
  }
  S.flavour.forEach((t, i) => {
    if (t.length > HARD_TAPE_CHARS) err(where(`flavour[${i}]`), `${t.length} characters; the teleprinter prints ${MAX_TAPE_CHARS}`);
    else if (t.length > MAX_TAPE_CHARS) warn(where(`flavour[${i}]`), `${t.length} characters; aim for ${MAX_TAPE_CHARS}`);
  });
  if (S.flavour.length < 3) warn(where('flavour'), 'fewer than three flavour lines; the tape repeats itself');
  S.explanation.forEach((t, i) => {
    if (wordCount(t) > 24) warn(where(`explanation[${i}]`), `${wordCount(t)} words; an explanation line is one typed line, about 20 words`);
  });
  S.howToPlay.lines.forEach((t, i) => {
    if (wordCount(t) > 36) warn(where(`howToPlay.lines[${i}]`), `${wordCount(t)} words; keep each rule to two typed lines`);
  });
  for (const [k, t] of Object.entries(S.why)) if (/^[A-Z]/.test(t) || /[.!?]$/.test(t)) warn(where(`why.${k}`), 'a reason continues "... because" in lower case, no full stop');
  for (const [k, t] of Object.entries(S.acts)) if (!/[.!?]$/.test(t)) warn(where(`acts.${k}`), 'an act is a sentence in the log; it ends with a full stop');
}

/** A one-line count for the validator's banner. */
export function summariseRedlines(content: RedlinesPack | null): { advisers: number; lines: number; phones: number; kinds: number; thoughts: number; strings: number } {
  if (!content) return { advisers: 0, lines: 0, phones: 0, kinds: 0, thoughts: 0, strings: 0 };
  let strings = 0;
  const count = (node: unknown) => {
    if (typeof node === 'string') strings++;
    else if (Array.isArray(node)) node.forEach(count);
    else if (node && typeof node === 'object') Object.values(node).forEach(count);
  };
  count(content.strings);
  return {
    advisers: content.adviserOrder.length,
    lines: content.lines.length,
    phones: content.phones.length,
    kinds: new Set(content.phones.map((p) => p.kind)).size,
    thoughts: Object.values(content.debrief).reduce((n, xs) => n + xs.length, 0),
    strings,
  };
}

export function formatRedlinesIssues(issues: ContentIssue[]): string {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const lines: string[] = [];
  for (const i of errors) lines.push(`  ✖ ${i.where}: ${i.message}`);
  for (const i of warnings) lines.push(`  ⚠ ${i.where}: ${i.message}`);
  lines.push(`${errors.length} error(s), ${warnings.length} warning(s)`);
  return lines.join('\n');
}
