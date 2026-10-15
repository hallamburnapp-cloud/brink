/**
 * Cross-reference checks on a compiled pack: regions exist and neighbour claims hold, advisers
 * and pieces exist, follow-ups land on real cards of the same arc in reachable days, map cards
 * and domestic cards are well formed; warnings for thin coverage. Pure: takes content, returns issues.
 */
import { HOME_BLOC, REGION_IDS, REGION_INFO, REGION_SETS, areNeighbours, isRegionId } from './regions.ts';
import { DAYS, followsOf, wordCount } from './schema.ts';
import type { Card, Consequence, ContentIssue, ThirtyContent } from './types.ts';

export const MIN_ARC_CARDS = 3;

function regionName(id: string): string {
  return REGION_INFO[id]?.name ?? id;
}

/** True when the message names the card's region, by its name or its bloc's ("the Cap"). */
function textNamesRegion(text: string, region: string): boolean {
  const info = REGION_INFO[region];
  if (!info) return true;
  const lower = text.toLowerCase();
  return lower.includes(info.name.toLowerCase()) || lower.includes(info.blocName.toLowerCase().replace(/^the /, ''));
}

export function validateThirty(content: ThirtyContent): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });

  for (const id of content.pieceOrder) {
    const p = content.pieces[id];
    const where = `pieces.yaml › ${id}`;
    for (const x of p.excludes) {
      if (!content.pieces[x]) err(where, `excludes unknown piece "${x}"`);
      else if (!content.pieces[x].excludes.includes(id)) warn(where, `excludes "${x}" but "${x}" does not exclude it back`);
    }
  }

  const named = new Set<string>();

  for (const id of content.cardOrder) {
    const card = content.cards[id];
    const where = `${card.file} › ${id}`;

    if (!content.advisers[card.adviser]) err(where, `unknown adviser "${card.adviser}"`);
    if (card.region !== null && !isRegionId(card.region)) err(where, `unknown region "${card.region}"`);
    if (card.region) named.add(card.region);

    // arcs/<name>.yaml holds that arc's cards and nothing else.
    const arcFile = /^arcs\/([a-z0-9-]+)\.ya?ml$/.exec(card.file)?.[1];
    if (arcFile && card.arc !== arcFile) err(where, `cards in arcs/${arcFile}.yaml belong to arc "${arcFile}" (this one says ${card.arc ? `"${card.arc}"` : 'none'})`);
    if (!arcFile && card.arc) err(where, `arc cards live in arcs/${card.arc}.yaml`);

    for (const p of [...card.when.pieces, ...card.when.without]) if (!content.pieces[p]) err(where, `condition names unknown piece "${p}"`);
    for (const p of card.when.pieces) if (card.when.without.includes(p)) err(where, `condition both needs and forbids "${p}"`);

    if (card.domestic) {
      if (card.map) err(where, 'a domestic card is a choice card, not a map card');
      else if (REGION_INFO[card.region] && REGION_INFO[card.region].bloc !== HOME_BLOC) err(where, `a domestic card is set at home (Highmarch), not ${regionName(card.region)}`);
      if (card.adviser !== 'chief') warn(where, 'domestic cards are usually the Chief of Staff\'s');
    }

    if (card.region && !card.map && !textNamesRegion(card.text, card.region)) warn(where, `the message does not name ${regionName(card.region)} (every card names its region)`);
    // A warning card is resolved by waiting or not: it needs the RISKY "wait" whose odds are the chance the alarm is false.
    if (card.alarm && (card.map || (card.left.tag !== 'RISKY' && card.right.tag !== 'RISKY'))) err(where, 'a warning card (alarm: true) is a choice card with a RISKY option (the wait)');
    if (wordCount(card.text) > 40) err(where, 'the message is over 40 words');

    // CONTENT.md "Hints": a risky button says its odds as `(65%)`, so the line reads "Danger down if it works (65%) · ...".
    const checkRiskyHint = (c: { tag: string; odds?: number; hint: string }, label: string) => {
      if (c.tag === 'RISKY' && c.odds !== undefined && !c.hint.includes(`(${c.odds}%)`)) {
        warn(where, `${label}: a risky hint states its odds, "Danger down if it works (${c.odds}%) · ..."`);
      }
    };

    const checkConsequence = (c: Consequence | undefined, actedOn: string | null, tag: string, label: string) => {
      if (!c) return;
      for (const key of ['heats', 'crisis', 'relieve'] as const) {
        const r = c[key];
        if (r === undefined) continue;
        if (!isRegionId(r)) err(where, `${label}: ${key} names unknown region "${r}"`);
        else if (r === actedOn) err(where, `${label}: ${key} names the region the choice already acts on (${regionName(r)})`);
      }
      if (tag === 'FORCE' && c.heats && actedOn && isRegionId(c.heats) && !areNeighbours(actedOn, c.heats)) {
        err(where, `${label}: a FORCE choice heats a neighbour, and ${regionName(c.heats)} does not border ${regionName(actedOn)}`);
      }
      if (c.follow) {
        const target = content.cards[c.follow.card];
        if (!target) {
          err(where, `${label}: follow-up names unknown card "${c.follow.card}"`);
          return;
        }
        if (!card.arc) err(where, `${label}: only an arc card issues follow-ups`);
        else if (target.arc !== card.arc) err(where, `${label}: follow-up "${target.id}" is in arc ${target.arc ?? 'none'}, not ${card.arc}`);
        if (target.id === card.id) err(where, `${label}: a card cannot follow itself`);
        // The follow-up is due in [day + in.min, day + in.max]; some such day must fall inside the target's own range.
        const soonest = card.day[0] + c.follow.in[0];
        const latest = card.day[1] + c.follow.in[1];
        if (soonest > DAYS) err(where, `${label}: follow-up "${target.id}" would be due after day ${DAYS}`);
        else if (latest < target.day[0] || soonest > target.day[1]) {
          err(where, `${label}: follow-up "${target.id}" is due on days ${soonest}–${Math.min(latest, DAYS)} but that card runs days ${target.day[0]}–${target.day[1]} (no overlap)`);
        }
      }
    };

    if (card.map) {
      const seen = new Set<string>();
      card.targets.forEach((t, i) => {
        const label = `target ${i + 1}`;
        if (!isRegionId(t.region)) err(where, `${label}: unknown region "${t.region}"`);
        if (!t.from) {
          if (seen.has(t.region)) err(where, `${label}: ${regionName(t.region)} is offered twice`);
          seen.add(t.region);
        } else {
          if (!REGION_SETS[t.from].includes(t.region)) err(where, `${label}: the fallback ${regionName(t.region)} is not in the set "${t.from}"`);
          if (t.heats) err(where, `${label}: a place chosen on the live map cannot name the neighbour it heats (the engine picks it)`);
        }
        if (t.mark === 'red-line' && !card.when.pieces.includes('red-lines')) warn(where, `${label}: draws a red line, so the card should need the red-lines piece (when.pieces)`);
        checkRiskyHint(t, label);
        checkConsequence(t, t.from ? null : t.region, t.tag, label);
        checkConsequence(t.fail, t.from ? null : t.region, t.tag, `${label} (fail)`);
      });
    } else {
      for (const side of ['left', 'right'] as const) {
        const ch = card[side];
        const words = wordCount(ch.text);
        if (words < 3 || words > 5) warn(where, `${side}: the action "${ch.text}" is ${words} word${words === 1 ? '' : 's'}; aim for 3 to 5`);
        checkRiskyHint(ch, side);
        checkConsequence(ch, card.region, ch.tag, side);
        checkConsequence(ch.fail, card.region, ch.tag, `${side} (fail)`);
      }
      if (card.left.text.trim().toLowerCase() === card.right.text.trim().toLowerCase()) err(where, 'both buttons say the same thing');
    }
  }

  // Coverage.
  for (const r of REGION_IDS) if (!named.has(r)) warn('regions.yaml', `no card is set in ${regionName(r)} (${r})`);
  for (const [arc, ids] of Object.entries(content.arcs)) {
    if (ids.length < MIN_ARC_CARDS) warn(`arcs/${arc}.yaml`, `arc "${arc}" has ${ids.length} card${ids.length === 1 ? '' : 's'}; arcs run 3 to 5`);
    const entries = ids.filter((id) => !content.cards[id].chained);
    if (ids.length && entries.length === 0) err(`arcs/${arc}.yaml`, `arc "${arc}" has no entry card: every card is someone's follow-up`);
  }
  if (content.adviserOrder.length === 0) err('advisers.yaml', 'no advisers');
  if (content.pieceOrder.length === 0) err('pieces.yaml', 'no pieces');

  return issues;
}

/** A one-line count for the validator's banner. */
export function summariseThirty(content: ThirtyContent): { cards: number; arcs: number; mapCards: number; domestic: number; advisers: number; pieces: number } {
  const cards: Card[] = content.cardOrder.map((id) => content.cards[id]);
  return {
    cards: cards.length,
    arcs: Object.keys(content.arcs).length,
    mapCards: cards.filter((c) => c.map).length,
    domestic: cards.filter((c) => c.domestic).length,
    advisers: content.adviserOrder.length,
    pieces: content.pieceOrder.length,
  };
}

export function formatThirtyIssues(issues: ContentIssue[]): string {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const lines: string[] = [];
  for (const i of errors) lines.push(`  ✖ ${i.where}: ${i.message}`);
  for (const i of warnings) lines.push(`  ⚠ ${i.where}: ${i.message}`);
  lines.push(`${errors.length} error(s), ${warnings.length} warning(s)`);
  return lines.join('\n');
}
