/**
 * Text the fonts cannot set on their own (STYLE 4): ◆ ⚓ ★ → become drawn glyphs, and a staff rule
 * has its effect picked out in the colour of the box it feeds ('+20 points' cyan, '×1.5 multiplier'
 * amber), with 'capital' and 'port' carrying the star and anchor the map draws.
 */

export type GlyphChar = 'anchor' | 'star' | 'diamond' | 'arrow';

/** A run of text, or a glyph in its place. */
export type RichPart = { text: string } | { glyph: GlyphChar };

const GLYPH_OF: Record<string, GlyphChar> = { '⚓': 'anchor', '★': 'star', '◆': 'diamond', '→': 'arrow' };

export function parseRich(s: string): RichPart[] {
  const out: RichPart[] = [];
  let run = '';
  for (const ch of Array.from(s)) {
    const g = GLYPH_OF[ch];
    if (g) {
      if (run) out.push({ text: run });
      run = '';
      out.push({ glyph: g });
    } else run += ch;
  }
  if (run) out.push({ text: run });
  return out;
}

/** 'capital' and 'port' gain the map's star and anchor (thin-spaced), once. */
export function markTerms(rule: string): string {
  return rule.replace(/\b(ports?|capitals?)\b(?! [⚓★])/gi, (w) => `${w} ${w.toLowerCase().startsWith('port') ? '⚓' : '★'}`);
}

export type Tone = 'points' | 'multiplier';

/** A rule split round its effect: the effect in its box's colour, the rest plain. */
export interface RuleParts {
  before: string;
  effect: string | null;
  tone: Tone | null;
  after: string;
}

export function ruleParts(rule: string): RuleParts {
  const m = /[+×][\d.]+ (points|multiplier)/.exec(rule);
  if (!m) return { before: rule, effect: null, tone: null, after: '' };
  return {
    before: rule.slice(0, m.index),
    effect: m[0],
    tone: m[1] === 'points' ? 'points' : 'multiplier',
    after: rule.slice(m.index + m[0].length),
  };
}
