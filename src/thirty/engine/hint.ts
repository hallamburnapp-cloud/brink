/**
 * The hint line under a button, in words (SPEC "The card"; CONTENT.md "Hints"). The authored hint is
 * the plain case; when pieces change the outcome, or the map makes the printed line untrue (the
 * region is already calm, a show of force must pick its own neighbour, the named neighbour cannot
 * heat, the sum does not fall), or the option is a place on a map day (every glowing label is written
 * the same way so they compare), the engine writes the line: what DANGER does, then what happens in
 * the world, joined by ' · ', at most 60 characters.
 *
 * The forms a non-gamer meets, and only these:
 *   Danger down · Shoal calms                       Danger down here · Shoal calms, heats Pebbleby
 *   Danger up · heats Lintel                        Danger unchanged · Vessary guarded for a week
 *   Danger down if it works (65%) · if not, Shoal heats
 * and after a risky tap, on the same line: `It worked · Danger down, Shoal calms` / `It failed · Danger
 * up, Shoal heats`.
 *
 * The first word is a promise: a line that starts `Danger down` is shown only when DANGER will fall,
 * `Danger down here` only when it falls and a neighbour heats, `Danger unchanged` only when the sum
 * stays. `isPlain` holds the authored line to that; `fit` keeps the clause that explains the promise
 * (the heats clause of a `here` line) when the line must be shortened.
 */
import { MAX_HINT_CHARS } from '../content/schema.ts';
import type { ChoiceTag, Heat, Mark, RegionId } from '../content/types.ts';
import { CRISIS, WAR } from './rules.ts';
import type { HeatChange } from './types.ts';
import { regionName } from './world.ts';

export interface HintInput {
  tag: ChoiceTag;
  authored: string;
  acted: RegionId;
  /** The acted region's heat before the choice. */
  heatBefore: Heat;
  /** The card named the neighbour a show of force heats (so the authored line can name it). */
  namedNeighbour: boolean;
  /** RISKY: the odds as printed. */
  printedOdds: number | null;
  /** RISKY: the odds after pieces (100 certain, 0 known to fail). */
  odds: number | null;
  /** Why a RISKY option is certain or doomed. */
  certainBy: 'dove-foreign' | 'false-alarm' | 'real-alarm' | null;
  dangerBefore: number;
  dangerAfter: number;
  changes: HeatChange[];
  pieces: string[];
  penalty: number;
  /** The mark the option puts on the acted region (guarded, warned, the red line), if any. */
  mark?: Mark | null;
  /** RISKY: what the miss does (null when the outcome is certain). */
  missed?: { danger: number; changes: HeatChange[] } | null;
  /** A place on a map day: its label is always the engine's. */
  map?: boolean;
}

export type Claim = 'down' | 'up' | 'same';

/** What a line's first words promise about DANGER, or null for a line in other words. */
export function claimOf(line: string): Claim | null {
  const l = line.toLowerCase();
  if (l.startsWith('danger down')) return 'down';
  if (l.startsWith('danger up')) return 'up';
  if (l.startsWith('danger unchanged')) return 'same';
  return null;
}

/** The DANGER word for a change. */
export function claimFor(delta: number): Claim {
  return delta < 0 ? 'down' : delta > 0 ? 'up' : 'same';
}

const saysHere = (line: string) => /^danger down here\b/i.test(line);

/** Each region's heat before and after all the changes (a heat undone by a later cooling is no change). */
function netChanges(changes: readonly HeatChange[]): Map<RegionId, { from: Heat; to: Heat }> {
  const final = new Map<RegionId, { from: Heat; to: Heat }>();
  for (const c of changes) {
    const f = final.get(c.region);
    final.set(c.region, { from: f ? f.from : c.from, to: c.to });
  }
  return final;
}

/** True when some region ends the choice hotter than it began: the line says `here` and what heats. */
const heated = (changes: readonly HeatChange[]) => [...netChanges(changes).values()].some((x) => x.to > x.from);

/**
 * True when the authored line tells the truth today and nothing more needs saying: no piece or
 * penalty changed the outcome, its DANGER word is the real one, and the world it describes happens
 * (a `here` line's neighbour heats, a risky line's miss costs something, its odds are the printed ones).
 */
export function isPlain(h: HintInput): boolean {
  if (h.map || h.pieces.length || h.penalty) return false;
  const claim = claimOf(h.authored);
  const actual = claimFor(h.dangerAfter - h.dangerBefore);
  if (claim !== null && claim !== actual) return false;
  if (saysHere(h.authored) !== (actual === 'down' && heated(h.changes))) return false;
  switch (h.tag) {
    case 'HOME':
      return true;
    case 'CALM':
      return h.heatBefore > 0;
    case 'FORCE':
      return h.heatBefore > 0 && h.namedNeighbour && heated(h.changes);
    case 'RISKY':
      // The authored line promises "Danger down if it works (N%)" and a miss that costs: true at the printed odds.
      return h.heatBefore > 0 && h.odds === h.printedOdds && actual === 'down' && (!h.missed || h.missed.danger > h.dangerBefore);
  }
}

export function hintLine(h: HintInput): string {
  if (isPlain(h)) return h.authored;
  const { danger, clauses } = compose(h);
  return fitClauses(danger, clauses, MAX_HINT_CHARS);
}

/** The engine's own line, before fitting it to one line. */
export function composeHint(h: HintInput): string {
  const { danger, clauses } = compose(h);
  return join(danger, clauses);
}

// ---------------------------------------------------------------- clauses

/**
 * The kinds of clause a line is made of, so that fitting can drop the least needed first:
 * `certain` why a risk is certain; `own` the acted region's own calming; `cool` another cooling or a
 * wave; `heats` the regions that heat; `war` a region that goes to war; `miss` what a missed risk does;
 * `penalty` a policy's DANGER; `mark` a guard, a warning, the red line; `none` the nothing-happens
 * words; `other` anything parsed from a line the engine did not write.
 */
export type ClauseKind = 'certain' | 'own' | 'cool' | 'heats' | 'war' | 'miss' | 'penalty' | 'mark' | 'none' | 'other';

export interface Clause {
  kind: ClauseKind;
  text: string;
  /** `heats`: the names, in order (the text is written from them at the chosen length). */
  names?: string[];
  /** `heats`: regions beyond the names that an authored or already shortened line counted ("and 2 more"). */
  more?: number;
  /** `miss`: the parts of the miss, 'Shoal heats', 'Lintel boils over'. */
  items?: string[];
  /** `own`: the verb, so the clause can shorten to 'calms here'. */
  verb?: 'calms' | 'cools';
}

/** `heats Lintel`, `heats Lintel and Shoal`, `heats Lintel and 2 more`. */
export function heatsText(names: readonly string[], more = 0): string {
  const rest = names.length - 1 + more;
  if (rest <= 0) return `heats ${names[0]}`;
  if (rest === 1 && more === 0) return `heats ${names[0]} and ${names[1]}`;
  return `heats ${names[0]} and ${rest} more`;
}

function compose(h: HintInput): { danger: string; clauses: Clause[] } {
  const delta = h.dangerAfter - h.dangerBefore;
  const risky = h.tag === 'RISKY' && h.odds !== null && h.odds > 0 && h.odds < 100;

  let danger = delta < 0 ? (heated(h.changes) ? 'Danger down here' : 'Danger down') : delta > 0 ? 'Danger up' : 'Danger unchanged';
  if (risky) danger = delta > 0 ? `Danger up even if it works (${h.odds}%)` : `${danger} if it works (${h.odds}%)`;

  const clauses: Clause[] = [];
  if (h.certainBy === 'dove-foreign') clauses.push({ kind: 'certain', text: 'talks cannot fail' });
  else if (h.certainBy === 'false-alarm') clauses.push({ kind: 'certain', text: 'a false alarm' });
  else if (h.certainBy === 'real-alarm') clauses.push({ kind: 'certain', text: 'the alarm is real' });

  const world = worldParts(h.changes, h.acted);
  // A risky button says what the miss does; when it does nothing (the region is already at war) it says so.
  const miss = risky && h.missed ? worldClauses(h.missed.changes, h.acted, true) : [];
  if (risky && h.missed && !miss.length) miss.push('nothing changes');
  // "Danger down" already says the acted region calms: when the miss has words, only a wave or a side effect needs more.
  clauses.push(...(miss.length ? world.filter((c) => c.kind !== 'own') : world));
  if (miss.length) clauses.push({ kind: 'miss', text: `if not, ${miss.join(' and ')}`, items: miss });
  if (h.penalty) clauses.push({ kind: 'penalty', text: `DANGER +${h.penalty}` });
  if (h.mark) clauses.push({ kind: 'mark', text: markClause(h.mark, h.acted) });

  if (!clauses.length) {
    if (h.tag === 'HOME') clauses.push({ kind: 'none', text: 'a quiet day at home' });
    else if (h.heatBefore === 0) clauses.push({ kind: 'none', text: `nothing to calm in ${regionName(h.acted)}` });
    else clauses.push({ kind: 'none', text: 'nothing changes abroad' });
  }
  return { danger, clauses };
}

/**
 * What the world does, as tagged clauses: the regions that cool (the acted region named first) and
 * the regions that heat; a region that reaches WAR is its own clause ("Kellmark goes to war"), since
 * "heats" would understate it.
 */
export function worldParts(changes: readonly HeatChange[], acted: RegionId | null): Clause[] {
  const out: Clause[] = [];
  const final = netChanges(changes);
  const order = (ids: RegionId[]) => (acted && ids.includes(acted) ? [acted, ...ids.filter((r) => r !== acted)] : ids);
  const cooled = order([...final.entries()].filter(([, x]) => x.to < x.from).map(([r]) => r));
  const heatedUp = order([...final.entries()].filter(([, x]) => x.to > x.from).map(([r]) => r));

  if (cooled.length === 1) {
    const r = cooled[0];
    const verb = final.get(r)!.to === 0 ? 'calms' : 'cools';
    out.push({ kind: r === acted ? 'own' : 'cool', text: `${regionName(r)} ${verb}`, verb });
  } else if (cooled.length > 1) {
    const all = cooled.every((r) => final.get(r)!.to === 0);
    out.push({ kind: 'cool', text: `${all ? 'calms' : 'cools'} ${regionName(cooled[0])} and ${cooled.length - 1} more` });
  }

  const toWar = heatedUp.filter((r) => final.get(r)!.to === WAR);
  const rest = heatedUp.filter((r) => final.get(r)!.to !== WAR);
  if (rest.length) {
    const names = rest.map(regionName);
    out.push({ kind: 'heats', text: heatsText(names), names });
  }
  if (toWar.length === 1) out.push({ kind: 'war', text: `${regionName(toWar[0])} goes to war` });
  else if (toWar.length > 1) out.push({ kind: 'war', text: `${regionName(toWar[0])} and ${toWar.length - 1} more go to war` });
  return out;
}

/**
 * What the world does, as plain strings. `plain` writes each heated region as its own clause
 * ("Shoal heats", "Lintel boils over", "Kellmark goes to war") for the miss of a risky button and
 * the line after a roll.
 */
export function worldClauses(changes: readonly HeatChange[], acted: RegionId | null, plain = false): string[] {
  if (!plain) return worldParts(changes, acted).map((c) => c.text);
  const out: string[] = [];
  const final = netChanges(changes);
  const cooled = worldParts(changes, acted).filter((c) => c.kind === 'own' || c.kind === 'cool');
  out.push(...cooled.map((c) => c.text));
  const order = (ids: RegionId[]) => (acted && ids.includes(acted) ? [acted, ...ids.filter((r) => r !== acted)] : ids);
  for (const r of order([...final.entries()].filter(([, x]) => x.to > x.from).map(([r]) => r))) {
    const x = final.get(r)!;
    out.push(x.to === WAR ? `${regionName(r)} goes to war` : x.to === CRISIS && x.from === 0 ? `${regionName(r)} boils over` : `${regionName(r)} heats`);
  }
  return out;
}

/**
 * The line after a risky tap, in the hint's own words, DANGER first: `It worked · Danger down, Shoal
 * calms`, `It failed · Danger up, Shoal heats and Lintel boils over`. `delta` is what the choice did
 * to DANGER (a policy's penalty included).
 */
export function rollText(held: boolean, changes: readonly HeatChange[], acted: RegionId, delta: number): string {
  const head = held ? 'It worked' : 'It failed';
  const danger = delta < 0 ? 'Danger down' : delta > 0 ? 'Danger up' : 'Danger unchanged';
  const world = worldClauses(changes, acted, true).join(' and ');
  return fit(world ? `${head} · ${danger}, ${world}` : `${head} · ${danger}`);
}

/** What a mark does, in words: the player should know the region is guarded, warned or the red line. */
function markClause(mark: Mark, region: RegionId): string {
  switch (mark) {
    case 'guarded':
      return `${regionName(region)} guarded for a week`;
    case 'warned':
      return `${regionName(region)} is warned`;
    case 'red-line':
      return `the red line is ${regionName(region)}`;
  }
}

// ---------------------------------------------------------------- fitting

const join = (danger: string, clauses: readonly Clause[]) => (clauses.length ? `${danger} · ${clauses.map((c) => c.text).join(', ')}` : danger);

/**
 * Read the clauses of a line the engine (or a writer) produced, the miss kept whole ('if not, Shoal
 * heats' is one clause, not two). `acted` names today's region, so its own calming can be told from
 * another region's; without it a lone 'X calms' is taken as the acted region's.
 */
export function parseClauses(world: string, acted?: string): Clause[] {
  const parts: string[] = [];
  for (const p of world.split(', ')) {
    if (parts.length && parts[parts.length - 1] === 'if not') parts[parts.length - 1] = `if not, ${p}`;
    else parts.push(p);
  }
  return parts.map((text): Clause => {
    let m: RegExpExecArray | null;
    if (text.startsWith('if not, ')) return { kind: 'miss', text, items: text.slice(8).split(' and ') };
    if (/^DANGER \+\d+$/.test(text)) return { kind: 'penalty', text };
    if (/ guarded for a week$| is warned$/.test(text) || text.startsWith('the red line is ')) return { kind: 'mark', text };
    if (/^(talks cannot fail|a false alarm|the alarm is real)$/.test(text)) return { kind: 'certain', text };
    if ((m = /^heats (.+) and (\d+) more$/.exec(text))) return { kind: 'heats', text, names: [m[1]], more: Number(m[2]) };
    if ((m = /^heats (.+) and (.+)$/.exec(text))) return { kind: 'heats', text, names: [m[1], m[2]] };
    if ((m = /^heats (.+)$/.exec(text))) return { kind: 'heats', text, names: [m[1]] };
    if (/ goes? to war$/.test(text)) return { kind: 'war', text };
    if (/^(calms|cools) .+ and \d+ more$/.test(text)) return { kind: 'cool', text };
    if ((m = /^(.+) (calms|cools)$/.exec(text))) {
      const verb = m[2] as 'calms' | 'cools';
      return { kind: acted === undefined || m[1] === acted ? 'own' : 'cool', text, verb };
    }
    if (/^(a quiet day at home|nothing to calm in .+|nothing changes abroad)$/.test(text)) return { kind: 'none', text };
    return { kind: 'other', text };
  });
}

/**
 * At most `max` characters, dropping what the DANGER words already say or what matters least, in this
 * order: the mark; the acted region's own calming when the line says `Danger down` (it is implied);
 * the penalty; `heats A and B` to `heats A and 1 more`; the miss to its first part; the why-certain
 * words; a wave; the acted region's calming shortened to `calms here`, then dropped; `heats ...` to
 * `heats 3 places`; then, last and never on a `here` line, the heats clause; then the rest from the
 * end; then a cut. A line that starts `Danger down here` always keeps a clause that says what heats;
 * a line that starts `Danger unchanged` is never left with only a calming clause.
 */
export function fitClauses(danger: string, input: readonly Clause[], max = MAX_HINT_CHARS): string {
  let clauses = input.map((c) => ({ ...c }));
  const fits = () => join(danger, clauses).length <= max;
  if (fits()) return join(danger, clauses);
  const here = /\bhere\b/.test(danger);
  const down = /^danger down/i.test(danger);
  const has = (kind: ClauseKind) => clauses.some((c) => c.kind === kind);
  const drop = (kind: ClauseKind) => (clauses = clauses.filter((c) => c.kind !== kind));
  const heats = () => clauses.find((c) => c.kind === 'heats');
  const own = () => clauses.find((c) => c.kind === 'own');

  // A shortening that does not make the line fit is undone, so a later drop keeps the whole words.
  const shorten = (run: () => boolean) => ({ shorten: true, run });
  const dropping = (run: () => boolean) => ({ shorten: false, run });
  const moves = [
    dropping(() => has('mark') && (drop('mark'), true)),
    dropping(() => down && has('own') && (drop('own'), true)),
    dropping(() => has('penalty') && (drop('penalty'), true)),
    shorten(() => {
      const h = heats();
      if (!h?.names || h.names.length < 2) return false;
      h.more = (h.more ?? 0) + h.names.length - 1;
      h.names = [h.names[0]];
      h.text = heatsText(h.names, h.more);
      return true;
    }),
    shorten(() => {
      const m = clauses.find((c) => c.kind === 'miss');
      if (!m?.items || m.items.length < 2) return false;
      m.items = [m.items[0]];
      m.text = `if not, ${m.items[0]}`;
      return true;
    }),
    dropping(() => has('certain') && (drop('certain'), true)),
    dropping(() => has('cool') && (drop('cool'), true)),
    shorten(() => {
      const o = own();
      if (!o?.verb || o.text === `${o.verb} here`) return false;
      o.text = `${o.verb} here`;
      return true;
    }),
    dropping(() => has('own') && (drop('own'), true)),
    shorten(() => {
      const h = heats();
      if (!h?.names) return false;
      const n = h.names.length + (h.more ?? 0);
      const text = `heats ${n} place${n === 1 ? '' : 's'}`;
      if (h.text === text) return false;
      h.text = text;
      return true;
    }),
    dropping(() => !here && has('heats') && (drop('heats'), true)),
    dropping(() => !here && has('war') && (drop('war'), true)),
  ];
  const copy = () => clauses.map((c) => ({ ...c, names: c.names && [...c.names], items: c.items && [...c.items] }));
  for (let pass = 0; pass < 2; pass++) {
    for (const move of moves) {
      const before = copy();
      if (!move.run()) continue;
      if (fits()) return join(danger, clauses);
      // First pass: keep every shortening tentative; second pass: let them add up.
      if (move.shorten && pass === 0) clauses = before;
    }
  }
  // The rest from the end, keeping what a `here` line must say.
  while (clauses.length > 1) {
    let i = clauses.length - 1;
    while (i > 0 && here && (clauses[i].kind === 'heats' || clauses[i].kind === 'war')) i--;
    clauses.splice(i, 1);
    if (fits()) return join(danger, clauses);
  }
  const out = join(danger, clauses);
  if (out.length <= max) return out;
  // One clause left and still too long: the DANGER words alone (they are the promise), else a cut.
  return danger.length <= max ? danger : `${danger.slice(0, max - 1)}…`;
}

/**
 * Fit a finished line to `max` characters by the same rules, reading its clauses back; `acted` is
 * today's region's name, so its own calming is known from another region's.
 */
export function fit(line: string, max = MAX_HINT_CHARS, acted?: string): string {
  if (line.length <= max) return line;
  const at = line.indexOf(' · ');
  if (at < 0) return `${line.slice(0, max - 1)}…`;
  return fitClauses(line.slice(0, at), parseClauses(line.slice(at + 3), acted), max);
}
