/**
 * The team row (SPEC "The screen", 3): the advisers and policies held, up to five chips (an icon
 * and a name: the whole name while the names fit the row, else the pack's one word). Hidden until
 * one is held. Tap a chip: its rule, in place of the chips; tap the rule to put the chips back. A
 * chip that changed today's outcome glows for a second after the choice. During the explanation's
 * second screen it shows three empty slots.
 */
import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { content } from '../app/engine';
import { R, rectStyle } from '../app/layout';
import { chipOpen, explain, glow, shown } from '../app/store';
import { chipLabels } from '../app/words';
import { Glyph } from './icons';

const RULE_MS = 5000;

export function TeamRow(): JSX.Element | null {
  const s = shown.value;
  const open = chipOpen.value;
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => (chipOpen.value = null), RULE_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (explain.value === 2) {
    return (
      <div class="team abs slots" style={rectStyle(R.team)} aria-label="Three empty team places">
        {[0, 1, 2].map((i) => (
          <span key={i} class="slot" />
        ))}
      </div>
    );
  }
  const team = s?.team ?? [];
  if (!team.length) return null;
  const piece = open ? content.pieces[open] : null;
  if (piece) {
    return (
      <button class="team abs rule" style={rectStyle(R.team)} onClick={() => (chipOpen.value = null)} aria-label={`${piece.name}: ${piece.rule}. Tap to close.`}>
        <span class="rule-name">{piece.name.toUpperCase()}</span>
        <span class="rule-text">{piece.rule}</span>
      </button>
    );
  }
  const pieces = team.map((id) => content.pieces[id]).filter((p): p is NonNullable<typeof p> => !!p);
  const labels = chipLabels(pieces);
  return (
    <div class={`team abs n${team.length}`} style={rectStyle(R.team)} role="list" aria-label="Your team">
      {pieces.map((p, i) => {
        const lit = glow.value.includes(p.id);
        return (
          <button key={p.id} class={`chip${lit ? ' lit' : ''}`} role="listitem" onClick={() => (chipOpen.value = p.id)} aria-label={`${p.name}: ${p.rule}`}>
            {team.length < 5 && <Glyph name={p.icon} size={13} />}
            <span>{labels[i]}</span>
          </button>
        );
      })}
    </div>
  );
}
