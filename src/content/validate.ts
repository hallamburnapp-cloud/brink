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

/** Flags the engine sets itself (see CONTENT.md §4.6). `false_alarm_live` and `endless` are exact names. */
const ENGINE_FLAG_PREFIXES = ['seat:', 'mode:', 'arc:', 'piece:', 'unlocked:', 'accident:', 'ante:', 'peak:', 'deadman:', 'booking:', 'full:', 'memory:'];
const ENGINE_FLAGS = new Set(['false_alarm_live', 'endless']);

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
  if (settable.has(flag) || ENGINE_FLAGS.has(flag)) return true;
  return ENGINE_FLAG_PREFIXES.some((p) => flag.startsWith(p));
}

/**
 * The voice contract (REDESIGN.md): what a tired person can read in five seconds.
 * Violations are errors when BRINK_VOICE=strict (the rewrite workflow and CI after
 * the rewrite) and warnings otherwise, so a half-rewritten deck still builds.
 */
export const VOICE = {
  cardChars: 180,
  cardSentences: 2,
  choiceChars: 34,
  outcomeChars: 160,
  endingChars: 420,
  endingParagraphs: 2,
  compendiumChars: 120,
} as const;

/** Jargon that is the wall between the game and a wide audience. Matched as whole words, case-insensitively. */
export const BANNED_JARGON = [
  'NC3', 'DEFCON', 'predelegation', 'pre-delegation', 'escalation dominance', 'attribution', 'kinetic', 'doctrine',
  'deterrence by denial', 'deterrence-by-denial', 'leverage', 'ante', 'political capital', 'commitment trap',
  'security dilemma', 'intel reliability', 'moderate confidence', 'high confidence', 'low confidence', 'we assess',
  'salvo', 'SIGINT', 'ELINT', 'ISR', 'CONOPS', 'TEL', 'C2', 'early-warning constellation', 'launch on warning',
  'second strike', 'first use', 'no first use', 'flashpoint', 'de-escalat', 'deescalat', 'escalatory', 'posture',
  'situational', 'assessment', 'liaison', 'accreditation', 'quarantine of the straits',
];

/** The hotel's additional limits (HOTEL.md "The voice contract"). */
export const HOTEL_VOICE = { cardChars: 150, replyChars: 80, minVisibleMove: 8, maxMove: 25 } as const;
const TIME_WORDS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|yesterday|noon|midnight|next week|last week|this morning|this afternoon)\b/gi;
function timeWordsIn(text: string): string[] {
  return (text.match(TIME_WORDS) ?? []).map((w) => w.toLowerCase());
}

export function voiceStrict(): boolean {
  return typeof process !== 'undefined' && process.env?.BRINK_VOICE === 'strict';
}

function paragraphs(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
}

function jargonIn(text: string): string[] {
  const hits: string[] = [];
  for (const w of BANNED_JARGON) {
    const re = new RegExp(`(^|[^A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`, 'i');
    if (re.test(text)) hits.push(w);
  }
  return hits;
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
  if (Object.keys(speakers).length === 0) err('speakers', 'at least one speaker is required (the first is the fallback voice)');

  // ---- cards
  const forcedEndingRefs = new Set<string>();
  let bluffCards = 0;
  for (const id of content.cardOrder) {
    const c = cards[id];
    const where = `card ${id}`;
    if (!speakers[c.advisor]) err(where, `unknown speaker "${c.advisor}"`);
    if (c.flashpoint && !flashpoints[c.flashpoint]) err(where, `unknown flashpoint "${c.flashpoint}"`);
    if (c.bluff) {
      bluffCards++;
      if (c.flashpoint) err(where, 'a bluff card belongs to no single flashpoint (drop flashpoint:)');
    }
    for (const t of followTargets(c)) {
      if (!cards[t]) err(where, `follow-up to unknown card "${t}"`);
      else if (t === id) err(where, 'card follows up to itself');
      else {
        const target = cards[t];
        if (target.flashpoint && target.flashpoint !== c.flashpoint) err(where, `follows up to "${t}" which belongs to flashpoint ${target.flashpoint}; it can only surface inside that flashpoint`);
        if (c.seats && target.seats && !c.seats.every((s) => target.seats!.includes(s))) warn(where, `follow-up "${t}" is limited to fewer seats than this card; it will be dropped for the others`);
      }
    }
    if (c.flashpoint && c.warning && c.warning.in > 0) warn(where, 'warning follow-ups inside a flashpoint surface immediately (in is forced to 0)');
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
    {
      const voice = voiceStrict() ? err : warn;
      const t = c.text.replace(/\s+/g, ' ').trim();
      if (sentences(t) > VOICE.cardSentences) voice(where, `voice: text has ${sentences(t)} sentences (max ${VOICE.cardSentences})`);
      if (t.length > VOICE.cardChars) voice(where, `voice: text is ${t.length} chars (max ${VOICE.cardChars})`);
      for (const side of ['left', 'right'] as const) {
        const ch = c[side];
        if (ch.text.length > VOICE.choiceChars) voice(`${where}.${side}`, `voice: choice is ${ch.text.length} chars (max ${VOICE.choiceChars})`);
        if (/\.\.\.|…/.test(ch.text)) voice(`${where}.${side}`, 'voice: no ellipses in a choice');
        for (const j of jargonIn(ch.text)) voice(`${where}.${side}`, `voice: jargon "${j}"`);
        if (ch.odds) {
          for (const o of ['success', 'failure'] as const) {
            const ot = ch.odds[o].text;
            if (ot && ot.length > VOICE.outcomeChars) voice(`${where}.${side}.odds.${o}`, `voice: outcome is ${ot.length} chars (max ${VOICE.outcomeChars})`);
            if (ot) for (const j of jargonIn(ot)) voice(`${where}.${side}.odds.${o}`, `voice: jargon "${j}"`);
          }
          for (const j of jargonIn(ch.odds.label)) voice(`${where}.${side}.odds`, `voice: jargon "${j}" in the odds label`);
        }
      }
      for (const j of jargonIn(t)) voice(where, `voice: jargon "${j}"`);
      if (content.voice === 'hotel') {
        // The hotel's contract (HOTEL.md): shorter cards, a reply on every side, everything happens tonight.
        if (t.length > HOTEL_VOICE.cardChars) voice(where, `hotel: text is ${t.length} chars (max ${HOTEL_VOICE.cardChars})`);
        for (const tw of timeWordsIn(t)) voice(where, `hotel: "${tw}" (everything happens tonight, between 3:00 and 6:00)`);
        let visible = false;
        for (const side of ['left', 'right'] as const) {
          const ch = c[side];
          const w = `${where}.${side}`;
          if (!ch.odds && !ch.reply) voice(w, 'hotel: every choice needs a reply (the world answers in one line)');
          if (ch.reply && ch.reply.length > HOTEL_VOICE.replyChars) voice(w, `hotel: reply is ${ch.reply.length} chars (max ${HOTEL_VOICE.replyChars})`);
          if (ch.reply) for (const tw of timeWordsIn(ch.reply)) voice(w, `hotel: "${tw}" in the reply`);
          if (ch.odds) {
            for (const o of ['success', 'failure'] as const) {
              if (!ch.odds[o].text) voice(`${w}.odds.${o}`, 'hotel: an odds outcome needs its sentence (it is the reply)');
              if (ch.odds[o].ending && content.night.oneSided) err(`${w}.odds.${o}`, 'hotel: no roll may carry an ending');
            }
          }
          const moves = (fx: Record<string, number | undefined> | undefined) => Object.entries(fx ?? {}).filter(([k]) => ['public', 'military', 'allies', 'economy'].includes(k)).map(([, v]) => Math.abs(v ?? 0));
          const biggest = Math.max(0, ...moves(ch.effects), ...moves(ch.odds?.success.effects), ...moves(ch.odds?.failure.effects));
          if (biggest >= HOTEL_VOICE.minVisibleMove) visible = true;
          if (biggest > HOTEL_VOICE.maxMove) warn(w, `hotel: a move of ${biggest} is more than a bar should take in one card (max ${HOTEL_VOICE.maxMove})`);
          if (!content.night.useEscalation && (ch.effects.escalation || ch.odds?.success.effects?.escalation || ch.odds?.failure.effects?.escalation)) warn(w, 'hotel: escalation is not used in this pack');
        }
        if (!visible) warn(where, `hotel: neither choice moves a bar by ${HOTEL_VOICE.minVisibleMove} or more (a change must be visible)`);
      }
    }
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

  if (bluffCards === 0 && content.voice !== 'hotel') warn('cards', 'no bluff cards (bluff: true): a missed ante has no "bluff called" card unless every flashpoint sets bluff_entry');

  // ---- reachability (BFS from drawable roots + flashpoint entries + bluff cards)
  const reachable = new Set<string>();
  const stack: string[] = [];
  for (const id of content.cardOrder) {
    const c = cards[id];
    if ((!c.chained && !c.flashpoint && c.weight > 0) || c.bluff) stack.push(id);
  }
  for (const fp of Object.values(flashpoints)) {
    if (cards[fp.entry]) {
      stack.push(fp.entry);
      if (cards[fp.entry].conditions) err(`flashpoint ${fp.id}`, `entry card "${fp.entry}" has conditions; a flashpoint entry must always be playable`);
    } else err(`flashpoint ${fp.id}`, `entry card "${fp.entry}" does not exist`);
    for (const [label, entry] of [['false_alarm_entry', fp.false_alarm_entry], ['bluff_entry', fp.bluff_entry]] as const) {
      if (!entry) continue;
      if (cards[entry]) {
        stack.push(entry);
        if (cards[entry].conditions) err(`flashpoint ${fp.id}`, `${label} card "${entry}" has conditions; it must always be playable`);
      } else err(`flashpoint ${fp.id}`, `${label} card "${entry}" does not exist`);
    }
    checkCond(`flashpoint ${fp.id}`, fp.conditions);
    if (fp.acts[0] > fp.acts[1]) err(`flashpoint ${fp.id}`, 'acts range is empty');
  }
  // The hotel seats these itself: a Booking's spine and the full-bar comedy cards.
  for (const id of content.bookingOrder) {
    const b = content.bookings[id];
    for (const c of [b.opener, ...b.beats.map((x) => x.card), b.head.card]) if (cards[c]) stack.push(c);
  }
  for (const c of Object.values(content.night.fullCards)) if (c && cards[c]) stack.push(c);
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
  const requiredFallbacks = content.night.oneSided && !content.night.useEscalation ? REQUIRED_FALLBACK_ENDINGS.filter((f) => !/_100$|nuclear|standdown/.test(f)) : REQUIRED_FALLBACK_ENDINGS;
  for (const f of requiredFallbacks) if (!endings[f]) err('endings', `missing required fallback ending "${f}"`);
  const meterTriggers = new Set<string>();
  for (const id of content.endingOrder) {
    const e = endings[id];
    const where = `ending ${id}`;
    checkCond(where, e.conditions);
    if (e.trigger.type === 'forced' && !forcedEndingRefs.has(id) && !id.startsWith('fallback_')) err(where, 'forced ending is never referenced by any choice or odds outcome');
    if (e.trigger.type === 'meter' && !id.startsWith('fallback_')) meterTriggers.add(`${e.trigger.key}:${e.trigger.at}`);
    if (e.trigger.type === 'meter' && e.trigger.key === 'escalation' && e.trigger.at === 0) err(where, 'escalation 0 is not an ending trigger');
    if (e.trigger.type === 'run_end' && !id.startsWith('fallback_') && content.night.useEscalation) {
      const max = e.conditions?.values?.escalation?.max;
      if (e.kind === 'standdown' && (max === undefined || max > 35)) err(where, 'a stand-down ending must require values.escalation.max ≤ 35 (the engine picks endings by priority, not kind)');
      if (e.kind === 'survival' && max !== undefined && max <= 35) warn(where, 'a survival ending limited to escalation ≤ 35 competes with stand-downs');
    }
    lint(where, e.text, issues);
    lint(where, e.compendium, issues);
    {
      const voice = voiceStrict() ? err : warn;
      const t = e.text.trim();
      if (t.length > VOICE.endingChars) voice(where, `voice: text is ${t.length} chars (max ${VOICE.endingChars})`);
      if (paragraphs(t) > VOICE.endingParagraphs) voice(where, `voice: ${paragraphs(t)} paragraphs (max ${VOICE.endingParagraphs})`);
      if (e.compendium.length > VOICE.compendiumChars) voice(where, `voice: compendium line is ${e.compendium.length} chars (max ${VOICE.compendiumChars})`);
      for (const j of jargonIn(t + ' ' + e.name + ' ' + e.compendium + ' ' + e.moment_label)) voice(where, `voice: jargon "${j}"`);
    }
  }
  for (const k of ['public', 'military', 'allies', 'economy']) for (const at of content.night.oneSided ? [0] : [0, 100]) if (!meterTriggers.has(`${k}:${at}`)) warn('endings', `no authored ending for ${k} reaching ${at} (fallback will be used)`);
  if (content.night.useEscalation && !meterTriggers.has('escalation:100')) warn('endings', 'no authored nuclear ending (fallback will be used)');
  const hasRunEnd = content.endingOrder.some((id) => endings[id].trigger.type === 'run_end' && !id.startsWith('fallback_'));
  if (!hasRunEnd) warn('endings', 'no authored run_end (stand-down / survival) endings');

  // ---- bookings (the hotel)
  for (const id of content.bookingOrder) {
    const b = content.bookings[id];
    const where = `booking ${id}`;
    const nightCards = content.night.cards ?? content.nightActs.reduce((n, a) => n + a.cards, 0);
    if (!cards[b.opener]) err(where, `opener "${b.opener}" does not exist`);
    else if (cards[b.opener].conditions) err(where, `opener "${b.opener}" has conditions; the opener is always card one`);
    for (const cid of [b.opener, ...b.beats.map((x) => x.card), b.head.card]) {
      const c = cards[cid];
      if (c && c.minutes !== undefined && content.night.cards !== undefined && c.minutes !== content.night.minutes)
        warn(where, `"${cid}" takes ${c.minutes} minutes; a night of ${content.night.cards} cards lands on 6:00 only when every card takes ${content.night.minutes}`);
    }
    if (!content.speakers[b.lead]) err(where, `lead "${b.lead}" is not a speaker`);
    const pins = [...b.beats.map((x, i) => ({ ...x, label: `beat ${i + 1}` })), { ...b.head, label: 'head' }];
    let last = 1;
    for (const pin of pins) {
      if (!cards[pin.card]) err(where, `${pin.label} card "${pin.card}" does not exist`);
      if (pin.slot[0] > pin.slot[1]) err(where, `${pin.label} slot window ${pin.slot[0]}–${pin.slot[1]} is empty`);
      if (pin.slot[1] > nightCards) err(where, `${pin.label} slot ${pin.slot[1]} is past the night's ${nightCards} cards`);
      if (pin.slot[0] <= last) warn(where, `${pin.label} window starts at ${pin.slot[0]}, not after the previous pin (${last})`);
      last = pin.slot[1];
    }
    const reviews = content.endingOrder.filter((e) => endings[e].trigger.type === 'run_end' && (endings[e].conditions?.flags_all ?? []).includes(`booking:${id}`));
    if (reviews.length < 3) warn(where, `${reviews.length} review(s) condition on booking:${id} (aim for three star bands)`);
    const bands = new Set(reviews.map((e) => endings[e].stars ?? 0));
    if (reviews.length >= 3 && bands.size < 3) warn(where, 'the reviews share star bands; a night should read differently at two, three and five stars');
  }
  if (content.voice === 'hotel') {
    for (const id of content.endingOrder) {
      const e = endings[id];
      if (id.startsWith('fallback_')) continue;
      if (!e.quote) warn(`ending ${id}`, 'hotel: a review needs its quote (the line people share)');
      if (e.byline && !content.speakers[e.byline]) err(`ending ${id}`, `hotel: byline "${e.byline}" is not a speaker`);
      if (e.trigger.type === 'run_end' && !e.stars) warn(`ending ${id}`, 'hotel: a review at 6:00 needs its stars');
    }
  }

  // ---- pieces
  for (const id of content.pieceOrder) {
    const p = pieces[id];
    const where = `piece ${id}`;
    for (const m of p.modifiers) {
      if (m.kind === 'weight' && m.ids) for (const c of m.ids) if (!cards[c]) err(where, `weight modifier references unknown card "${c}"`);
      if (m.kind === 'drift') checkCond(where, m.when);
    }
    for (const x of p.excludes ?? []) if (!pieces[x]) err(where, `excludes unknown piece "${x}"`);
    if (p.offer_weight <= 0) warn(where, 'offer_weight 0: never offered in the shop');
    const scoring = p.modifiers.some((m) => m.kind === 'leverage' || m.kind === 'retrigger' || m.kind === 'scale');
    if (!scoring) warn(where, 'piece has no leverage, retrigger or scale modifier: it cannot help a build scale');
    lint(where, p.blurb, issues);
  }
  for (const id of content.orderOrder) {
    const o = content.orders[id];
    lint(`order ${id}`, o.blurb, issues);
  }
  for (const a of Object.values(content.archetypes)) {
    const where = `archetype ${a.id}`;
    for (const p of [...a.core, ...a.support]) if (!pieces[p]) err(where, `references unknown piece "${p}"`);
    lint(where, a.blurb, issues);
  }
  for (let i = 1; i < content.acts.length; i++) if (content.acts[i].target <= content.acts[i - 1].target) warn('rules', `act ${content.acts[i].index} target does not rise above act ${content.acts[i - 1].index}`);
  for (const s of SEATS) {
    const seat = seats[s];
    if (!seat) continue;
    for (const p of seat.starting_pieces) if (!pieces[p]) err(`seat ${s}`, `starting piece "${p}" does not exist`);
    if (seat.rivals.includes(s)) err(`seat ${s}`, 'a seat cannot be its own rival');
    lint(`seat ${s}`, seat.blurb, issues);
  }

  // ---- deck depth per act × seat (baseline = drawable, unconditioned, non-warning)
  // A pack that only plays the night (the hotel) is judged on its night acts and its own seats.
  const deckActs = content.voice === 'hotel' ? content.nightActs : content.acts;
  const deckSeats = content.voice === 'hotel' ? (Object.keys(seats) as typeof SEATS[number][]) : SEATS;
  for (const act of deckActs) {
    for (const s of deckSeats) {
      let baseline = 0;
      let drawable = 0;
      for (const id of content.cardOrder) {
        const c = cards[id];
        if (c.chained || c.flashpoint || c.bluff || c.weight <= 0) continue;
        if (act.index < c.acts[0] || act.index > c.acts[1]) continue;
        if (c.seats && !c.seats.includes(s)) continue;
        drawable++;
        if (!c.conditions && !c.warning) baseline++;
      }
      if (baseline < Math.ceil(act.cards / 2)) err(`deck act ${act.index} / ${s}`, `only ${baseline} unconditioned drawable cards for ${act.cards} slots (deck would repeat)`);
      else if (drawable < act.cards + 4) warn(`deck act ${act.index} / ${s}`, `only ${drawable} drawable cards for ${act.cards} slots (thin deck)`);
    }
    const fps = Object.values(flashpoints).filter((f) => act.index >= f.acts[0] && act.index <= f.acts[1]);
    if (fps.length === 0 && content.voice !== 'hotel') warn(`act ${act.index}`, 'no flashpoint covers this act');
  }

  return issues;
}

/** Template variables the engine substitutes (see template() in engine/run.ts); a capitalised first letter is allowed. */
export const TEMPLATE_VARS = new Set([
  'us', 'rival', 'other', 'leader', 'capital', 'rival_capital', 'other_capital', 'rival_adj', 'other_adj', 'us_adj', 'rival_leader', 'other_leader',
]);

function knownTemplate(name: string): boolean {
  return TEMPLATE_VARS.has(name) || TEMPLATE_VARS.has(name.charAt(0).toLowerCase() + name.slice(1));
}

function lint(where: string, text: string, issues: ContentIssue[]): void {
  for (const w of FORBIDDEN_WORDS) {
    const re = new RegExp(`(^|[^A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z])`);
    if (re.test(text)) issues.push({ level: 'error', where, message: `copy contains forbidden real-world or placeholder term "${w.trim()}"` });
  }
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    if (!knownTemplate(m[1])) issues.push({ level: 'error', where, message: `unknown template variable {${m[1]}} (known: ${[...TEMPLATE_VARS].join(', ')}, optionally capitalised)` });
  }
}

export function summarise(content: Content): Record<string, number> {
  return {
    cards: content.cardOrder.length,
    orders: content.orderOrder.length,
    archetypes: Object.keys(content.archetypes).length,
    legendaries: content.pieceOrder.filter((id) => content.pieces[id].rarity === 'legendary').length,
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
