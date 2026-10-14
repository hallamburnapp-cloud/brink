/**
 * Seat chips ('+15⚓', '×2·4', '+8M·3') split into coloured runs and glyphs. The fonts lack
 * ⚓ ★ ◆ ≤ (STYLE 4), so those become SVG glyphs; the effect is coloured by the box it feeds and
 * any qualifier after '·' or '≤' sits in the secondary text colour.
 */
import type { StaffId } from '../../content/staff';

export type ChipTone = 'inf' | 'mom' | 'funds' | 'plain' | 'muted';
export type GlyphChar = 'anchor' | 'star' | 'diamond' | 'atMost';

export type ChipPart = { text: string; tone: ChipTone } | { glyph: GlyphChar; tone: ChipTone };

const GLYPH_OF: Record<string, GlyphChar> = { '⚓': 'anchor', '★': 'star', '◆': 'diamond', '≤': 'atMost' };

/** What each staff's number feeds, which colours its chip. */
export const STAFF_TONE: Readonly<Record<StaffId, ChipTone>> = {
  DUTY: 'mom',
  QM: 'inf',
  HARBOUR: 'inf',
  SURVEYOR: 'inf',
  HOTLINE: 'mom',
  GOVERNOR: 'mom',
  TREASURER: 'funds',
  OLDHAND: 'inf',
  RAILCLERK: 'inf',
  MEDIATOR: 'mom',
  STRATEGIST: 'mom',
  ENVOY: 'mom',
  COURIER: 'plain',
  FERRY: 'plain',
  SIGNALS: 'plain',
  ADMIRAL: 'mom',
  CHIEF: 'mom',
  DEPUTY: 'muted',
  HERALD: 'plain',
  SOVEREIGN: 'mom',
};

export function parseChip(chip: string, tone: ChipTone): ChipPart[] {
  const parts: ChipPart[] = [];
  let qualifier = false;
  let run = '';
  let runTone: ChipTone = tone;
  const flush = () => {
    if (run) parts.push({ text: run, tone: runTone });
    run = '';
  };
  for (const ch of Array.from(chip)) {
    if (ch === '·' || ch === '≤') qualifier = true;
    const t: ChipTone = qualifier ? 'muted' : tone;
    const g = GLYPH_OF[ch];
    if (g) {
      flush();
      parts.push({ glyph: g, tone: g === 'star' && !qualifier ? 'plain' : t });
      continue;
    }
    if (t !== runTone) {
      flush();
      runTone = t;
    }
    run += ch;
  }
  flush();
  // 'sb' (standby) after the effect reads as a qualifier too.
  return parts.map((p) => ('text' in p && p.text === 'sb' ? { ...p, tone: 'muted' } : p));
}

/** Text with the font-less symbols swapped for glyph markers, for rules and prices. */
export type RichPart = { text: string } | { glyph: GlyphChar | 'arrow' };

export function parseRich(s: string): RichPart[] {
  const out: RichPart[] = [];
  let run = '';
  for (const ch of Array.from(s)) {
    const g = ch === '→' ? 'arrow' : GLYPH_OF[ch];
    if (g) {
      if (run) out.push({ text: run });
      run = '';
      out.push({ glyph: g });
    } else run += ch;
  }
  if (run) out.push({ text: run });
  return out;
}
