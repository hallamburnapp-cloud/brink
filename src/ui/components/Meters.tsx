import type { EffectKey, Effects, MeterKey, RunState } from '../../engine/types';
import { METERS } from '../../engine/types';
import { describeHidden } from '../../engine/run';

const LABEL: Record<MeterKey, string> = { public: 'PUBLIC', military: 'MILITARY', allies: 'ALLIES', economy: 'ECONOMY', escalation: 'ESCALATION' };

function colourFor(key: MeterKey, v: number): string {
  if (key === 'escalation') {
    if (v >= 80) return 'var(--color-red)';
    if (v >= 60) return '#e08a3b';
    if (v >= 40) return 'var(--color-amber)';
    return 'var(--color-blue)';
  }
  const edge = Math.min(v, 100 - v);
  if (edge <= 12) return 'var(--color-red)';
  if (edge <= 25) return 'var(--color-amber)';
  return 'var(--color-paper)';
}

function dotSize(delta: number): number {
  const a = Math.abs(delta);
  return a >= 10 ? 12 : a >= 5 ? 8 : 5;
}

export interface MetersProps {
  state: RunState;
  /** Preview from the tilted choice (after modifiers). */
  preview: Effects | null;
  hiddenCosts: EffectKey[];
  /** Deltas just applied, for the reaction flash. */
  applied: Partial<Record<string, number>>;
}

export function Meters({ state, preview, hiddenCosts, applied }: MetersProps) {
  return (
    <div class="grid grid-cols-5 gap-2" role="group" aria-label="Meters">
      {METERS.map((k) => {
        const v = state.meters[k];
        const p = preview?.[k];
        const hidden = hiddenCosts.includes(k);
        const a = applied[k];
        return (
          <div key={k} class="flex flex-col items-center gap-1">
            <div class="meter-preview flex h-4 items-center justify-center" style={{ opacity: p !== undefined || hidden ? 1 : 0 }} aria-hidden="true">
              {hidden ? (
                <span class="mono text-[12px] font-bold text-red">?</span>
              ) : p !== undefined ? (
                <span
                  class="inline-block rounded-full"
                  style={{
                    width: dotSize(p),
                    height: dotSize(p),
                    background: (k === 'escalation' ? p > 0 : p < 0) ? 'var(--color-red)' : 'var(--color-green)',
                    boxShadow: `0 0 ${dotSize(p)}px currentColor`,
                  }}
                />
              ) : null}
            </div>
            <div class="meter-track relative h-14 w-full overflow-hidden rounded-[2px]" title={`${LABEL[k]} ${v}`}>
              <div class="meter-fill absolute bottom-0 left-0 right-0" style={{ height: `${v}%`, background: colourFor(k, v), opacity: 0.85 }} />
              {[25, 50, 75].map((t) => (
                <div key={t} class="absolute left-0 right-0 border-t border-navy/60" style={{ bottom: `${t}%` }} />
              ))}
              {a !== undefined && a !== 0 && (
                <div key={`${a}-${state.cardsPlayed}`} class="rise mono absolute inset-x-0 top-1 text-center text-[10px] font-bold" style={{ color: (k === 'escalation' ? a > 0 : a < 0) ? 'var(--color-red)' : 'var(--color-green)' }}>
                  {a > 0 ? `+${a}` : a}
                </div>
              )}
            </div>
            <div class="mono text-[9px] tracking-[0.12em] text-mute">{LABEL[k]}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Hidden values shown only in words — or numbers where an asset revealed them. */
export function HiddenReadout({ state, rivalName, otherName }: { state: RunState; rivalName: string; otherName: string }) {
  const parts: string[] = [];
  const rev = (k: keyof RunState['hidden']) => state.revealed.includes(k);
  parts.push(`${rivalName}: ${rev('trust_primary') ? state.hidden.trust_primary : describeHidden('trust_primary', state.hidden.trust_primary)}`);
  parts.push(`${otherName}: ${rev('trust_secondary') ? state.hidden.trust_secondary : describeHidden('trust_secondary', state.hidden.trust_secondary)}`);
  parts.push(`intel: ${rev('intel') ? state.hidden.intel : describeHidden('intel', state.hidden.intel)}`);
  parts.push(`hands: ${rev('commitment') ? state.hidden.commitment : describeHidden('commitment', state.hidden.commitment)}`);
  return (
    <div class="mono flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tracking-wide text-mute" aria-label="Situation">
      {parts.map((p) => (
        <span key={p}>{p}</span>
      ))}
    </div>
  );
}
