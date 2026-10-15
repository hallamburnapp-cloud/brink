/**
 * The left of the readout as words (SPEC 9): the label, the number and the line under them, for
 * every moment of a turn: choosing ('PIN THE CRISIS FOR ×2', on a dead deal 'NO SEND CAN WIN', on a
 * deal only another seating wins 'REORDER STAFF TO WIN',
 * 'NEED 50 MORE', 'NEXT REGION AT 384 · 34 MORE'), the outcome and the shop ('NEXT TARGET 3,700'),
 * the ending ('WORLD UNITED 30/30') and the intro, whose lesson keeps its own target. Pure, so it is
 * tested without a screen.
 */
import { formatInt, readoutView, RULES, target, type Ending, type GameState } from '../../engine';
import { unitForm } from '../common/numbers';

/** How the console reads while the outcome plays (P.ahead), or null while choosing and scoring. */
export type Ahead = 'turn' | 'shop' | 'end' | Ending | null;

/** The game has ended: the readout says how (from the ending's first beat). */
export function isEnding(a: Ahead): a is Ending {
  return a === 'WORLD UNITED' || a === 'CEASEFIRE' || a === 'WAR';
}

/** The width of the line under TARGET, in characters at 11 pt caps (172 pt). */
const LINE_CHARS = 30;

export interface ReadoutLeft {
  label: string;
  value: string;
  line: string;
  /** The value's tone: the ending's colour. */
  tone?: 'gold' | 'red';
  /**
   * The line's tone: 'dead' when no send on the table can win (said in war's red, not as a hint);
   * 'reorder' when only another seating wins (said in the seats' brass: a move to make).
   */
  lineTone?: 'dead' | 'reorder';
}

/**
 * The left of the readout: the label, the number, and the line under them (`line`: the engine's).
 * `ahead`: the outcome is playing (the director's word on what comes next, or the ending); `intro`:
 * the intro's lesson keeps its own target (64) whatever turn its sends are played as; `final`: the
 * counts the game ended on.
 */
export function readoutLeft(
  s: GameState,
  line: string,
  { ahead = null, intro = false, final = null }: { ahead?: Ahead; intro?: boolean; final?: { gold: number; red: number } | null } = {},
): ReadoutLeft {
  if (isEnding(ahead) && final) {
    if (ahead === 'WAR') return { label: 'WAR', value: `${final.red}/${RULES.loseAt}`, line: '', tone: 'red' };
    return { label: ahead, value: `${final.gold}/${RULES.regions}`, line: '', tone: 'gold' };
  }
  const value = formatInt(s.deal.target);
  if (intro && s.phase !== 'choose') return { label: 'TARGET', value, line: '' };
  if (!intro && (ahead === 'turn' || ahead === 'shop' || s.phase === 'outcome' || s.phase === 'shop')) {
    // The turn is done: the next one's target, and nothing stale about the last.
    return { label: 'NEXT TARGET', value: formatInt(target(s.turn + 1)), line: '' };
  }
  if (s.phase !== 'choose' || ahead) return { label: 'TARGET', value, line: '' };
  const r = readoutView(s);
  // Before any pin: the hint, or, when no legal send can reach the target as the staff sit, says so
  // plainly: NO SEND CAN WIN, or REORDER STAFF TO WIN when another seating wins.
  if (s.deal.pins.length === 0) {
    if (r.deal === 'dead' || r.deal === 'reorder') return { label: 'TARGET', value, line: r.line, lineTone: r.deal };
    return { label: 'TARGET', value, line: 'PIN THE CRISIS FOR ×2' };
  }
  // A miss: how far short, not the target over again.
  if (r.regions === 0 && r.score < r.target) return { label: 'TARGET', value, line: `NEED ${formatInt(r.target - r.score)} MORE` };
  // A win: how far the next region is, so nobody multiplies POINTS by MULTIPLIER in their head.
  if (r.regions > 0 && line.startsWith('NEXT REGION AT')) {
    const more = r.nextMark - r.score;
    const forms = [
      `NEXT REGION AT ${formatInt(r.nextMark)} · ${formatInt(more)} MORE`,
      `NEXT REGION ${formatInt(r.nextMark)} · ${formatInt(more)} MORE`,
    ];
    const fits = forms.find((f) => f.length <= LINE_CHARS);
    return { label: 'TARGET', value, line: fits ?? `NEXT REGION ${unitForm(r.nextMark)} · ${unitForm(more)} MORE` };
  }
  return { label: 'TARGET', value, line };
}

