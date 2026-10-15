/**
 * What one choice does to the map (SPEC "Choices" and "The team"): the tag's own effect, the pieces
 * that amplify it, the consequences the button named, and the policies' penalties, applied to a
 * Working in the order the UI animates them. choose/tapRegion commit the Working; preview reads it
 * and throws it away, so both always agree.
 */
import type { Card, ChoiceTag, Consequence, Follow, MapTarget, RegionId } from '../content/types.ts';
import { isAlarmCard, isTalks } from './cards.ts';
import { rollText } from './hint.ts';
import { CRISIS, RULES } from './rules.ts';
import type { DealtCard } from './types.ts';
import { HOME_CAPITAL, forceTarget, hotNeighbours, hottestFirst, isSea, neighboursOf, regionName, REGION_IDS } from './world.ts';
import type { Working } from './working.ts';

/** One option of today's card, flattened: a button, or a map target with its tapped region. */
export interface Act extends Consequence {
  option: 'left' | 'right' | RegionId;
  tag: ChoiceTag;
  /** The button's action text; a map target has none. */
  text: string | null;
  hint: string;
  odds?: number;
  fail?: Consequence;
  /** The region the option acts on: the card's region, or the tapped target. */
  acted: RegionId;
}

/** The option named, or null when the card has no such option (a side on a map day, a region that is not a target). */
export function actOf(card: Card, option: 'left' | 'right' | RegionId): Act | null {
  if (card.map) {
    const t: MapTarget | undefined = card.targets.find((x) => x.region === option);
    if (!t) return null;
    const { region, ...rest } = t;
    return { ...rest, option, text: null, acted: region };
  }
  if (option !== 'left' && option !== 'right') return null;
  const c = card[option];
  return { ...c, option, acted: card.region };
}

export interface Resolution {
  /** RISKY: whether it held; null for the other tags. */
  held: boolean | null;
  /** RISKY: the chance it holds as the player should see it (100 when certain); null otherwise. */
  odds: number | null;
  certain: boolean;
  /** A HOME choice: the day after has no domestic card. */
  home: boolean;
  /** Follow-ups to queue (the arc goes on). */
  follows: Follow[];
  /** The neighbour a show of force heated (named by the card or picked by the engine). */
  forced: RegionId | null;
}

/**
 * The chance a RISKY option holds, after pieces: the Dove makes talks (a Foreign Minister's or the Old
 * Ambassador's card) certain; a false alarm marked
 * by the Cautious director is known to hold (a real one to fail); the Paranoid director's warnings
 * are false one in four on top of the printed odds.
 */
export function effectiveOdds(w: Working, card: Card, dealt: DealtCard, act: Act): number | null {
  if (act.tag !== 'RISKY' || act.odds === undefined) return null;
  if (w.has('dove-foreign') && isTalks(card)) return 100;
  if (isAlarmCard(card)) {
    if (dealt.alarm === 'false') return 100;
    if (dealt.alarm === 'real') return 0;
    if (w.has('paranoid-intel')) return Math.round(100 * (RULES.paranoidFalse + (1 - RULES.paranoidFalse) * (act.odds / 100)));
  }
  return act.odds;
}

/** Whether the RISKY option holds today, from the roll made when the card was dealt. */
export function holds(w: Working, card: Card, dealt: DealtCard, act: Act): boolean {
  if (w.has('dove-foreign') && isTalks(card)) return true;
  if (isAlarmCard(card)) return dealt.alarmFalse;
  return dealt.roll * 100 < (act.odds ?? 0);
}

/** How far a missed roll fell past the odds, at least 1 (for the log; the player reads `It failed · ...`). */
export function missedBy(roll: number, odds: number): number {
  return Math.max(1, Math.ceil(roll * 100 - odds));
}

/**
 * Apply the option to the Working. `force` fixes a RISKY outcome (the preview asks for both branches).
 */
export function resolve(w: Working, card: Card, dealt: DealtCard, act: Act, force?: 'held' | 'missed'): Resolution {
  const acted = act.acted;
  const follows: Follow[] = [];
  const out: Resolution = { held: null, odds: null, certain: false, home: false, follows, forced: null };
  const alarm = isAlarmCard(card);
  const dangerBefore = w.danger();
  /** The roll step to caption once the choice is complete, and the index its own heat steps start at. */
  let roll: { at: number; from: number } | null = null;

  const consequences = (c: Consequence | undefined, skipHeats: boolean) => {
    if (!c) return;
    if (c.heats && !skipHeats) w.heat(c.heats, 1, 'choice');
    if (c.crisis && w.heats[c.crisis] < CRISIS) w.heat(c.crisis, CRISIS - w.heats[c.crisis], 'choice');
    if (c.relieve && w.heats[c.relieve] === CRISIS) w.cool(c.relieve, 1, 'choice');
    if (c.mark) w.mark(c.mark, acted);
    if (c.follow) follows.push(c.follow);
  };

  // The Old Ambassador's "one step more" rides on every cooling a calming choice makes (ENGINE.md "Rulings").
  const ambassador = (region: RegionId) => {
    if (w.has('old-ambassador')) w.cool(region, RULES.oldAmbassadorExtra, 'piece', { piece: 'old-ambassador' });
  };
  const calmingPieces = () => {
    ambassador(acted);
    let reached: RegionId | null = null;
    if (w.has('back-channel')) {
      const [n] = hotNeighbours(w.heats, acted);
      if (n) {
        w.cool(n, RULES.backChannelReach, 'piece', { piece: 'back-channel' });
        ambassador(n);
        reached = n;
      }
    }
    if (w.has('peace-movement')) {
      const near = new Set(neighboursOf(acted));
      const others = REGION_IDS.filter((r) => r !== acted && r !== reached && w.heats[r] > 0);
      for (const r of hottestFirst(w.heats, others, (r) => near.has(r)).slice(0, RULES.peaceMovementReach)) {
        w.cool(r, 1, 'piece', { piece: 'peace-movement' });
        ambassador(r);
      }
    }
  };

  switch (act.tag) {
    case 'CALM': {
      w.cool(acted, RULES.calmCool, 'choice');
      calmingPieces();
      consequences(act, false);
      break;
    }
    case 'FORCE': {
      w.cool(acted, RULES.forceCool, 'choice');
      if (w.has('hawk-general')) w.cool(acted, RULES.hawkExtra, 'piece', { piece: 'hawk-general' });
      const target = act.heats ?? forceTarget(w.heats, acted, (r) => !w.protectedFrom(r, false));
      if (target) {
        w.heat(target, RULES.forceHeat, 'choice');
        out.forced = target;
      }
      if (w.has('loyal-admiral') && isSea(acted)) {
        for (const n of neighboursOf(acted)) if (isSea(n)) w.cool(n, RULES.admiralCool, 'piece', { piece: 'loyal-admiral' });
      }
      if (w.has('peace-movement')) w.heat(HOME_CAPITAL, 1, 'piece', { piece: 'peace-movement' });
      consequences(act, true);
      break;
    }
    case 'RISKY': {
      const odds = effectiveOdds(w, card, dealt, act) ?? 0;
      out.odds = odds;
      out.certain = odds === 100;
      if (w.has('dove-foreign') && isTalks(card)) w.note('dove-foreign', 'Talks cannot fail');
      const held = force ? force === 'held' : holds(w, card, dealt, act);
      out.held = held;
      if (!force) {
        const at = w.steps.length;
        w.steps.push({ kind: 'roll', odds, roll: dealt.roll, held, text: '' });
        if (alarm) w.steps.push({ kind: 'alarm', false: dealt.alarmFalse });
        roll = { at, from: w.steps.filter((x) => x.kind === 'heat').length };
      }
      if (held) {
        w.cool(acted, RULES.riskyCool, 'choice');
        consequences(act, false);
      } else {
        w.heat(acted, RULES.riskyMissHeat, 'choice');
        consequences(act.fail, false);
      }
      break;
    }
    case 'HOME': {
      out.home = true;
      consequences(act, false);
      break;
    }
  }

  // Launch on Warning: a false alarm on a region you have warned is +20 (the mark may be today's).
  if (alarm && dealt.alarmFalse && w.has('launch-on-warning') && w.warned.has(acted)) {
    w.addPenalty(RULES.falseAlarmPenalty, 'launch-on-warning', acted, `A false alarm over ${regionName(acted)}`);
  }
  // The line after the tap says what the roll did, in the hint's own words, once everything it did is known.
  if (roll) {
    const step = w.steps[roll.at];
    if (step.kind === 'roll') step.text = rollText(out.held === true, w.changes().slice(roll.from), acted, w.danger() - dangerBefore);
  }
  return out;
}
