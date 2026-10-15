/**
 * Text components that never let the fonts' missing symbols fall back to emoji: running text with
 * ◆ ⚓ ★ →, coin amounts, a staff rule with its effect in colour, and a seat chip's lines.
 */
import type { JSX } from 'preact';
import { Glyph } from '../art';
import { markTerms, parseRich, ruleParts } from './rich';

/** Running text with glyphs in place of ◆ ⚓ ★ →. `size` is the glyph height in px. */
export function Rich({ text, size = 10 }: { text: string; size?: number }): JSX.Element {
  return (
    <>
      {parseRich(text).map((p, i) =>
        'glyph' in p ? (
          <span key={i} class="rich-glyph">
            <Glyph name={p.glyph} size={p.glyph === 'arrow' ? size * 0.8 : size} />
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

/** A staff rule as printed on its card: the effect in its box's colour, capitals and ports marked. */
export function RuleText({ rule, size = 10 }: { rule: string; size?: number }): JSX.Element {
  const p = ruleParts(markTerms(rule));
  return (
    <>
      <Rich text={p.before} size={size} />
      {p.effect && (
        <b class={`rule-effect c-${p.tone}`}>
          <Rich text={p.effect} size={size} />
        </b>
      )}
      <Rich text={p.after} size={size} />
    </>
  );
}

/** A seat chip: one line ('+20', '×1.5 GOLD') or two ('ALL PINS' over '★ ⚓', 'COPY' over '→ Sovereign'). */
export function Chip({ lines, tone }: { lines: string[]; tone: 'points' | 'multiplier' }): JSX.Element {
  return (
    <span class={`chip-text c-${tone}${lines.length > 1 ? ' two' : ''}`}>
      {lines.map((l, i) => (
        <span key={i} class="chip-line">
          <Rich text={l} size={7.5} />
        </span>
      ))}
    </span>
  );
}
