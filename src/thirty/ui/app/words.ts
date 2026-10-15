/**
 * The words the screen adds beside the engine's: the news a card brings its region ('NOW TENSE'),
 * which chips glow as a card arrives, and the chips' names. The night's line and a risky roll's
 * result are the engine's (`nightLine`, the roll step's text), so there is one wording of each.
 * Pure: no DOM, no signals, so every line has a test.
 */
import type { Heat, PieceId, RegionId, TraceStep } from './engine';

type HeatStepT = Extract<TraceStep, { kind: 'heat' }>;

const HEAT_WORD: Record<Heat, string> = { 0: 'calm', 1: 'tense', 2: 'a crisis', 3: 'at war' };

/**
 * What the card's news did to its own region, for the label under the ring: 'NOW TENSE', 'NOW A
 * CRISIS', 'CALMED BY THE HOTLINE'. The news is in the card's arrival steps, or (when the engine
 * deals tomorrow's card at night) among the last night's steps. Null when nothing changed there.
 */
export function newsLabel(region: RegionId | null, arrival: readonly TraceStep[], lastNight: readonly TraceStep[] = []): string | null {
  if (!region) return null;
  const news = lastNight.filter((s): s is HeatStepT => s.kind === 'heat' && s.why === 'news' && s.region === region);
  const mine = [...news, ...arrival.filter((s): s is HeatStepT => s.kind === 'heat' && s.region === region)].filter((s) => s.to !== s.from);
  if (!mine.length) return null;
  const last = mine[mine.length - 1];
  if (last.to < mine[0].from) {
    if (mine.some((s) => s.piece === 'hotline')) return 'CALMED BY THE HOTLINE';
    return last.to === 0 ? 'NOW CALM' : `NOW ${HEAT_WORD[last.to].toUpperCase()}`;
  }
  return `NOW ${HEAT_WORD[last.to].toUpperCase()}`;
}

/** The pieces that acted as the card arrived (the Hotline, the Cautious director): their chips glow. */
export function arrivalPieces(arrival: readonly TraceStep[]): PieceId[] {
  const out: PieceId[] = [];
  for (const s of arrival) {
    const id = s.kind === 'heat' ? s.piece : s.kind === 'piece' ? s.piece : undefined;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * The chip row's measure, in frame px (measured in Chromium: the 12 pt chip font advances about
 * 6 px per upper-case character; a chip's padding, icon and gap add 43). Four chips close up a
 * little; five drop their icons and step the font down.
 */
function chipMetrics(count: number): { char: number; fixed: number; gap: number } {
  if (count >= 5) return { char: 5.6, fixed: 16, gap: 6 };
  if (count === 4) return { char: 6.1, fixed: 37, gap: 6 };
  return { char: 6.1, fixed: 43, gap: 8 };
}
const ROW_INNER_PX = 390 - 24;

/**
 * What the chips say: the whole name ('SPIN DOCTOR', 'BACK-CHANNEL') while the names fit the row,
 * else the one-word name from the pack. Names are easier on a watcher; the row is 390 px wide.
 */
export function chipLabels(team: readonly { name: string; chip: string }[]): string[] {
  const m = chipMetrics(team.length);
  const width = (labels: string[]) => labels.reduce((w, l) => w + l.length * m.char + m.fixed, 0) + m.gap * Math.max(0, labels.length - 1);
  const full = team.map((p) => p.name.toUpperCase());
  if (width(full) <= ROW_INNER_PX) return full;
  return team.map((p) => p.chip.toUpperCase());
}
