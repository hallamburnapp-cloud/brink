/**
 * Semantic validation on compiled Content: dangling references, unreachable
 * cards, impossible conditions, endings that can never fire, deck depth, and
 * copy lint (fictional-world guard, no placeholder text). Pure; used by the
 * CLI (tools/validate.ts), the Vite plugin and CI.
 */
import type { CardDef, ChoiceDef, ConditionDef, Content, Seat } from '../engine/types.ts';
import { SEATS } from '../engine/types.ts';
import type { ContentIssue } from './schema.ts';

export const REQUIRED_FALLBACK_ENDINGS = [
  'fallback_nuclear',
  'fallback_public_0',
  'fallback_public_100',
  'fallback_military_0',
  'fallback_military_100',
  'fallback_allies_0',
  'fallback_allies_100',
  'fallback_economy_0',
  'fallback_economy_100',
  'fallback_standdown',
  'fallback_survival',
  'fallback_special',
];

/** Real-world names that must never appear in copy (fully fictional world). */
export const FORBIDDEN_WORDS = [
  'Russia', 'Russian', 'China', 'Chinese', 'America', 'American', 'United States', 'NATO', 'Ukraine', 'Taiwan', 'Moscow', 'Beijing',
  'Washington', 'Kremlin', 'Pentagon', 'Putin', 'Trump', 'Biden', 'Iran', 'Israel', 'Korea', 'Japan', 'India', 'Pakistan',
  'Britain', 'British', 'France', 'French', 'Germany', 'German', 'Europe', 'European', 'Soviet', 'USSR', 'Cuba', 'Cuban', 'Hiroshima',
  'Nagasaki', 'Chernobyl', 'Berlin', 'London', 'Paris', 'Tokyo', 'Kyiv', 'Kiev', 'Crimea', 'Baltic', 'Pacific', 'Atlantic', 'Arctic',
  'Africa', 'Asia', 'Middle East', 'lorem', 'ipsum', 'TODO', 'TBD', 'placeholder',
];

const ENGINE_FLAG_PREFIXES = ['seat:', 'mode:', 'arc:', 'piece:', 'unlocked:'];

function choices(c: CardDef): ChoiceDef[] {
  return [c.left, c.right];
}

function* followTargets(c: CardDef): Generator<string> {
  for (const ch of choices(c)) {
    for (const f of ch.follow ?? []) yield f.card;
    if (ch.odds) for (const o of [ch.odds.success, ch.odds.failure]) for (const f of o.follow ?? []) yield f.card;
  }
  if (c.warning) {
    yield c.warning.true_follow;
    yield c.warning.false_follow;
  }
}

function* endingRefs(c: CardDef): Generator<string> {
  for (const ch of choices(c)) {
    if (ch.ending) yield ch.ending;
    if (ch.odds) {
      if (ch.odds.success.ending) yield ch.odds.success.ending;
      if (ch.odds.failure.ending) yield ch.odds.failure.ending;
    }
  }
}

function setFlags(c: CardDef, into: Set<string>): void {
  for (const ch of choices(c)) {
    for (const f of ch.set ?? []) into.add(f);
    if (ch.odds) for (const o of [ch.odds.success, ch.odds.failure]) for (const f of o.set ?? []) into.add(f);
  }
}

function conditionFlags(cond: ConditionDef | undefined): { required: string[]; forbidden: string[] } {
  if (!cond) return { required: [], forbidden: [] };
  return { required: [...(cond.flags_all ?? []), ...(cond.flags_any ?? [])], forbidden: cond.flags_none ?? [] };
}

function flagIsSettable(flag: string, settable: Set<string>): boolean {
  if (settable.has(flag)) return true;
  return ENGINE_FLAG_PREFIXES.some((p) => flag.startsWith(p));
}

function sentences(text: string): number {
  return (text.match(/[.!?]["”']?(\s|$)/g) ?? []).length;
}

export function validateContent(content: Content): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });
  const { cards, pieces, endings, flashpoints, speakers, seats } = content;

  // ---- settable flags: cards, pieces, and engine-generated ones
  const settable = new Set<string>();
  for (const id of content.cardOrder) setFlags(cards[id], settable);
  for (const id of content.pieceOrder) for (const g of pieces[id].grants) settable.add(g);

  const checkCond = (where: string, cond: ConditionDef | undefined, cardSeats?: Seat[]) => {
    if (!cond) return;
    const { required, forbidden } = conditionFlags(cond);
    for (const f of required) if (!flagIsSettable(f, settable)) err(where, `requires flag "${f}" which nothing ever sets`);
    for (const f of forbidden) if (!flagIsSettable(f, settable)) warn(where, `excludes flag "${f}" which nothing ever sets (typo?)`);
    const all = new Set(cond.flags_all ?? []);
    for (const f of cond.flags_none ?? []) if (all.has(f)) err(where, `flag "${f}" is both required and forbidden`);
    if (cond.values) {
      for (const [k, r] of Object.entries(cond.values)) {
        if (!r) continue;
        if (r.min !== undefined && r.max !== undefined && r.min > r.max) err(where, `values.${k}: min ${r.min} > max ${r.max}`);
        if ((r.min !== undefined && (r.min < 0 || r.min > 100)) || (r.max !== undefined && (r.max < 0 || r.max > 100))) err(where, `values.${k}: outside 0..100`);
      }
    }
    if (cond.day && cond.day.min !== undefined && cond.day.max !== undefined && cond.day.min > cond.day.max) err(where, 'day: min > max');
    for (const p of [...(cond.pieces_any ?? []), ...(cond.pieces_all ?? []), ...(cond.pieces_none ?? [])]) {
      if (!pieces[p]) err(where, `references unknown piece "${p}"`);
      else if (cardSeats && pieces[p].seats && !pieces[p].seats!.some((s) => cardSeats.includes(s))) warn(where, `piece "${p}" is never offered to this card's seats`);
    }
    for (const c of [...(cond.seen ?? []), ...(cond.unseen ?? [])]) if (!cards[c]) err(where, `references unknown card "${c}"`);
    const anyAll = new Set([...(cond.pieces_all ?? [])]);
    for (const p of cond.pieces_none ?? []) if (anyAll.has(p)) err(where, `piece "${p}" is both required and forbidden`);
  };

  // ---- speakers
  if (!speakers.aide) err('speakers', 'a speaker with id "aide" is required as the fallback voice');

  // ---- cards
  const forcedEndingRefs = new Set<string>();
  for (const id of content.cardOrder) {
    const c = cards[id];
    const where = `card ${id}`;
    if (!speakers[c.advisor]) err(where, `unknown speaker "${c.advisor}"`);
    if (c.flashpoint && !flashpoints[c.flashpoint]) err(where, `unknown flashpoint "${c.flashpoint}"`);
    for (const t of followTargets(c)) {
      if (!cards[t]) err(where, `follow-up to unknown card "${t}"`);
      else if (t === id) err(where, 'card follows up to itself');
    }
    for (const e of endingRefs(c)) {
      forcedEndingRefs.add(e);
      if (!endings[e]) err(where, `forces unknown ending "${e}"`);
    }
    checkCond(where, c.conditions, c.seats);
    if (c.acts[0] > c.acts[1]) err(where, `acts range ${c.acts[0]}..${c.acts[1]} is empty`);
    if (c.warning && !c.tags.includes('warning')) warn(where, 'warning card should carry the "warning" tag so intel pieces can weight it');
    if (c.warning && c.warning.true_follow === c.warning.false_follow) warn(where, 'warning true/false follow-ups are the same card');
    if (!c.chained && c.weight <= 0) warn(where, 'weight 0 and not chained: can never be drawn');
    if (c.timer !== undefined && (c.timer < 6 || c.timer > 15)) warn(where, `timer ${c.timer}s is outside the 6–15s design band`);
    if (sentences(c.text) > 4) warn(where, `text has ${sentences(c.text)} sentences (max 4)`);
    for (const side of ['left', 'right'] as const) {
      const ch = c[side];
      const w = `${where}.${side}`;
      const hasAnything =
        Object.keys(ch.effects).length > 0 || ch.odds || (ch.follow?.length ?? 0) > 0 || (ch.set?.length ?? 0) > 0 || (ch.clear?.length ?? 0) > 0 || ch.ending || ch.reveal;
      if (!hasAnything) warn(w, 'choice does nothing (no effects, odds, follow-ups, flags or ending)');
      if (ch.text.length > 64) warn(w, `choice text is ${ch.text.length} chars (aim ≤ 60)`);
      if (ch.spend_charge && !ch.tags.includes('deescalate')) warn(w, 'spend_charge choices should be tagged "deescalate"');
      if (ch.odds && JSON.stringify(ch.odds.success) === JSON.stringify(ch.odds.failure)) warn(w, 'odds success and failure outcomes are identical');
      if (ch.odds) {
        if (ch.odds.success.text) lint(`${w}.odds.success`, ch.odds.success.text, issues);
        if (ch.odds.failure.text) lint(`${w}.odds.failure`, ch.odds.failure.text, issues);
      }
    }
    lint(where, c.text, issues);
    lint(`${where}.left`, c.left.text, issues);
    lint(`${where}.right`, c.right.text, issues);
  }

  // ---- reachability (BFS from drawable roots + flashpoint entries)
  const reachable = new Set<string>();
  const stack: string[] = [];
  for (const id of content.cardOrder) {
    const c = cards[id];
    if (!c.chained && !c.flashpoint && c.weight > 0) stack.push(id);
  }
  for (const fp of Object.values(flashpoints)) {
    if (cards[fp.entry]) stack.push(fp.entry);
    else err(`flashpoint ${fp.id}`, `entry card "${fp.entry}" does not exist`);
    if (fp.false_alarm_entry) {
      if (cards[fp.false_alarm_entry]) stack.push(fp.false_alarm_entry);
      else err(`flashpoint ${fp.id}`, `false_alarm_entry card "${fp.false_alarm_entry}" does not exist`);
    }
    checkCond(`flashpoint ${fp.id}`, fp.conditions);
    if (fp.acts[0] > fp.acts[1]) err(`flashpoint ${fp.id}`, 'acts range is empty');
  }
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const c = cards[id];
    if (!c) continue;
    for (const t of followTargets(c)) if (cards[t] && !reachable.has(t)) stack.push(t);
  }
  for (const id of content.cardOrder) if (!reachable.has(id)) err(`card ${id}`, 'unreachable: chained but nothing leads to it');

  // ---- flashpoint chains: membership and cycles
  for (const fp of Object.values(flashpoints)) {
    const entries = [fp.entry, fp.false_alarm_entry].filter((x): x is string => !!x && !!cards[x]);
    for (const entry of entries) {
      const seen = new Set<string>();
      const path: string[] = [];
      const visit = (id: string): void => {
        if (path.includes(id)) {
          err(`flashpoint ${fp.id}`, `cycle in card chain: ${[...path, id].join(' → ')}`);
          return;
        }
        if (seen.has(id)) return;
        seen.add(id);
        path.push(id);
        const c = cards[id];
        if (c) {
          if (c.flashpoint !== fp.id) warn(`flashpoint ${fp.id}`, `card "${id}" is reached inside the flashpoint but is not marked flashpoint: ${fp.id}`);
          for (const t of followTargets(c)) if (cards[t] && cards[t].flashpoint === fp.id) visit(t);
        }
        path.pop();
      };
      visit(entry);
      if (seen.size < 2) warn(`flashpoint ${fp.id}`, 'flashpoint sequence is a single card; design calls for multi-card sequences');
    }
  }
  const fpReach = new Set<string>();
  for (const fp of Object.values(flashpoints)) {
    const s = [fp.entry, fp.false_alarm_entry].filter((x): x is string => !!x);
    while (s.length) {
      const id = s.pop()!;
      if (fpReach.has(id) || !cards[id]) continue;
      fpReach.add(id);
      for (const t of followTargets(cards[id])) s.push(t);
    }
  }
  for (const id of content.cardOrder) if (cards[id].flashpoint && !fpReach.has(id)) err(`card ${id}`, `marked flashpoint "${cards[id].flashpoint}" but not reachable from its entry`);

  // ---- endings
  for (const f of REQUIRED_FALLBACK_ENDINGS) if (!endings[f]) err('endings', `missing required fallback ending "${f}"`);
  const meterTriggers = new Set<string>();
  for (const id of content.endingOrder) {
    const e = endings[id];
    const where = `ending ${id}`;
    checkCond(where, e.conditions);
    if (e.trigger.type === 'forced' && !forcedEndingRefs.has(id) && !id.startsWith('fallback_')) err(where, 'forced ending is never referenced by any choice or odds outcome');
    if (e.trigger.type === 'meter' && !id.startsWith('fallback_')) meterTriggers.add(`${e.trigger.key}:${e.trigger.at}`);
    if (e.trigger.type === 'meter' && e.trigger.key === 'escalation' && e.trigger.at === 0) err(where, 'escalation 0 is not an ending trigger');
    lint(where, e.text, issues);
    lint(where, e.compendium, issues);
  }
  for (const k of ['public', 'military', 'allies', 'economy']) for (const at of [0, 100]) if (!meterTriggers.has(`${k}:${at}`)) warn('endings', `no authored ending for ${k} reaching ${at} (fallback will be used)`);
  if (!meterTriggers.has('escalation:100')) warn('endings', 'no authored nuclear ending (fallback will be used)');
  const hasRunEnd = content.endingOrder.some((id) => endings[id].trigger.type === 'run_end' && !id.startsWith('fallback_'));
  if (!hasRunEnd) warn('endings', 'no authored run_end (stand-down / survival) endings');

  // ---- pieces
  for (const id of content.pieceOrder) {
    const p = pieces[id];
    const where = `piece ${id}`;
    for (const m of p.modifiers) {
      if (m.kind === 'weight' && m.ids) for (const c of m.ids) if (!cards[c]) err(where, `weight modifier references unknown card "${c}"`);
      if (m.kind === 'drift') checkCond(where, m.when);
    }
    for (const x of p.excludes ?? []) if (!pieces[x]) err(where, `excludes unknown piece "${x}"`);
    lint(where, p.blurb, issues);
  }
  for (const s of SEATS) {
    const seat = seats[s];
    if (!seat) continue;
    for (const p of seat.starting_pieces) if (!pieces[p]) err(`seat ${s}`, `starting piece "${p}" does not exist`);
    if (seat.rivals.includes(s)) err(`seat ${s}`, 'a seat cannot be its own rival');
    lint(`seat ${s}`, seat.blurb, issues);
  }

  // ---- deck depth per act × seat (baseline = drawable, unconditioned, non-warning)
  for (const act of content.acts) {
    for (const s of SEATS) {
      let baseline = 0;
      let drawable = 0;
      for (const id of content.cardOrder) {
        const c = cards[id];
        if (c.chained || c.flashpoint || c.weight <= 0) continue;
        if (act.index < c.acts[0] || act.index > c.acts[1]) continue;
        if (c.seats && !c.seats.includes(s)) continue;
        drawable++;
        if (!c.conditions && !c.warning) baseline++;
      }
      if (baseline < Math.ceil(act.cards / 2)) err(`deck act ${act.index} / ${s}`, `only ${baseline} unconditioned drawable cards for ${act.cards} slots (deck would repeat)`);
      else if (drawable < act.cards + 4) warn(`deck act ${act.index} / ${s}`, `only ${drawable} drawable cards for ${act.cards} slots (thin deck)`);
    }
    const fps = Object.values(flashpoints).filter((f) => act.index >= f.acts[0] && act.index <= f.acts[1]);
    if (fps.length === 0) warn(`act ${act.index}`, 'no flashpoint covers this act');
  }

  return issues;
}

/** Template variables the engine substitutes (see template() in engine/run.ts). */
export const TEMPLATE_VARS = new Set([
  'us', 'Us', 'rival', 'Rival', 'other', 'Other', 'leader', 'capital', 'rival_capital', 'other_capital',
  'rival_adj', 'other_adj', 'us_adj', 'rival_leader', 'other_leader',
]);

function lint(where: string, text: string, issues: ContentIssue[]): void {
  for (const w of FORBIDDEN_WORDS) {
    const re = new RegExp(`(^|[^A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`);
    if (re.test(text)) issues.push({ level: 'error', where, message: `copy contains forbidden real-world or placeholder term "${w.trim()}"` });
  }
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    if (!TEMPLATE_VARS.has(m[1])) issues.push({ level: 'error', where, message: `unknown template variable {${m[1]}} (known: ${[...TEMPLATE_VARS].join(', ')})` });
  }
}

export function summarise(content: Content): Record<string, number> {
  return {
    cards: content.cardOrder.length,
    arcs: new Set(content.cardOrder.map((id) => content.cards[id].arc).filter(Boolean)).size,
    pieces: content.pieceOrder.length,
    advisors: content.pieceOrder.filter((id) => content.pieces[id].pool === 'advisor').length,
    doctrines: content.pieceOrder.filter((id) => content.pieces[id].pool === 'doctrine').length,
    assets: content.pieceOrder.filter((id) => content.pieces[id].pool === 'asset').length,
    endings: content.endingOrder.filter((id) => !id.startsWith('fallback_')).length,
    flashpoints: Object.keys(content.flashpoints).length,
    speakers: Object.keys(content.speakers).length,
  };
}
