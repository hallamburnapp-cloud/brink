/**
 * Text helpers that never let the fonts' missing symbols fall back to emoji: seat chips, running
 * text with ◆ ⚓ ★ → ≤, and Funds amounts.
 */
import type { JSX } from 'preact';
import { Glyph, type GlyphName } from '../art';
import { markTerms, parseChip, parseRich, STAFF_TONE, type ChipTone } from './chip';
import type { StaffId } from '../../content/staff';

const TONE_CLASS: Record<ChipTone, string> = {
  inf: 'c-inf',
  mom: 'c-mom',
  funds: 'c-funds',
  plain: 'c-plain',
  muted: 'c-muted',
};

/** A seat chip: the effect in its meaning colour, the qualifier muted. */
export function Chip({ id, chip }: { id: StaffId; chip: string }): JSX.Element {
  const parts = parseChip(chip, STAFF_TONE[id]);
  return (
    <span class="chip-text">
      {parts.map((p, i) =>
        'unit' in p ? (
          <span key={i} class={`chip-unit ${TONE_CLASS[p.tone]}`}>
            {p.unit}
          </span>
        ) : 'glyph' in p ? (
          <span key={i} class={`chip-glyph ${TONE_CLASS[p.tone]}`}>
            <Glyph name={p.glyph} size={p.glyph === 'star' ? 7.5 : 8} />
          </span>
        ) : (
          <span key={i} class={TONE_CLASS[p.tone]}>
            {p.text}
          </span>
        ),
      )}
    </span>
  );
}

/** Running text with glyphs in place of ◆ ⚓ ★ → ≤. `size` is the glyph height in px. */
export function Rich({ text, size = 10 }: { text: string; size?: number }): JSX.Element {
  return (
    <>
      {parseRich(text).map((p, i) =>
        'glyph' in p ? (
          <span key={i} class="rich-glyph">
            <Glyph name={p.glyph as GlyphName} size={p.glyph === 'arrow' ? size * 0.8 : size} />
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** '◆4' with the diamond drawn. */
export function Funds({ n, size = 10, class: cls }: { n: number; size?: number; class?: string }): JSX.Element {
  return (
    <span class={`funds-text ${cls ?? ''}`}>
      <span class="rich-glyph">
        <Glyph name="diamond" size={size} />
      </span>
      <span class="num">{n}</span>
    </span>
  );
}

/**
 * A rule with its effect picked out in its meaning colour ('Each Port ⚓ that scores:
 * <b>+15 Influence</b>'), as on the Briefing cards; Ports and Capitals carry the map's marks.
 */
export function RuleText({ rule: plain }: { rule: string }): JSX.Element {
  const rule = markTerms(plain);
  const m = /([+x×]\s?[\d.]+\s(?:Influence|Momentum)|\+\d+\sFunds|scores twice|triple|joined to each other|counts as a Capital|Copies)/.exec(rule);
  if (!m) return <Rich text={rule} />;
  const tone = /Momentum/.test(m[0]) ? 'mom' : /Influence|triple/.test(m[0]) ? 'inf' : /Funds/.test(m[0]) ? 'funds' : 'plain';
  return (
    <>
      <Rich text={rule.slice(0, m.index)} />
      <b class={`rule-effect c-${tone}`}>
        <Rich text={m[0]} />
      </b>
      <Rich text={rule.slice(m.index + m[0].length)} />
    </>
  );
}
