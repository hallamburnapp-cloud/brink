import type { EffectKey, Effects, MeterKey, RunState } from '../../engine/types';
import { BARS, BAR_LABEL } from '../../engine/night';

/**
 * The hotel's four bars: GUESTS · STAFF · MONEY · THE BUILDING. Horizontal, filling from the
 * left, the universal progress-bar grammar: full is good, empty ends the night. No numbers.
 * A ghost segment shows where the tilted choice would take a bar; the arrow after a decision
 * stays until the next one, so cause and effect are both on screen while the next card is read.
 */
export interface BarsProps {
  state: RunState;
  preview: Effects | null;
  hiddenCosts: EffectKey[];
  applied: Partial<Record<string, number>>;
}

const ICON: Record<Exclude<MeterKey, 'escalation'>, string> = {
  public: 'M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20a6 6 0 0 1 12 0Zm8 0a6 6 0 0 1 12 0Z',
  military: 'M6 8h12v2H6Zm1 2v10h10V10M9 14h6M12 4v4',
  economy: 'M4 7h16v12H4Zm0 4h16M8 15h3',
  allies: 'M3 21V9l9-6 9 6v12Zm6 0v-7h6v7M12 6v3',
};

function fillColour(v: number): string {
  if (v <= 12) return 'var(--color-red)';
  if (v <= 25) return 'var(--color-amber)';
  if (v >= 50) return 'var(--color-brass)';
  return 'var(--color-paper)';
}

export function Bars({ state, preview, hiddenCosts, applied }: BarsProps) {
  return (
    <div class="grid grid-cols-2 gap-x-3 gap-y-2" role="group" aria-label="The four bars">
      {BARS.map((k) => {
        const v = Math.max(0, Math.min(100, state.meters[k]));
        const p = preview?.[k];
        const hidden = hiddenCosts.includes(k);
        const a = applied[k];
        const target = p !== undefined ? Math.max(0, Math.min(100, v + p)) : null;
        const low = v <= 25;
        const word = v <= 12 ? 'nearly empty' : v <= 25 ? 'low' : v >= 85 ? 'full' : 'steady';
        return (
          <div key={k} class={`bar ${v <= 12 ? 'bar-low' : ''}`} aria-label={`${BAR_LABEL[k]} ${word}`}>
            <div class="mb-1 flex items-center justify-between">
              <span class={`mono flex items-center gap-1.5 text-[9px] tracking-[0.16em] ${low ? 'text-amber' : 'text-mute'}`}>
                <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d={ICON[k]} />
                </svg>
                {BAR_LABEL[k]}
              </span>
              <span class="h-3 text-[11px] leading-none" aria-hidden="true">
                {hidden ? (
                  <span class="mono font-bold text-red">?</span>
                ) : a !== undefined && a !== 0 ? (
                  <span class={a > 0 ? 'text-green' : 'text-red'}>{a > 0 ? '▲' : '▼'}</span>
                ) : null}
              </span>
            </div>
            <div class="bar-track relative h-3 w-full overflow-hidden rounded-full">
              {/* the ghost: where the tilted choice would leave the bar */}
              {target !== null && target !== v && (
                <div
                  class="bar-ghost absolute inset-y-0"
                  style={{ left: `${Math.min(v, target)}%`, width: `${Math.abs(target - v)}%`, background: target < v ? 'var(--color-red)' : 'var(--color-green)' }}
                />
              )}
              <div class="bar-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${v}%`, background: fillColour(v) }} />
              {target !== null && target > v && <div class="bar-ghost absolute inset-y-0 rounded-r-full" style={{ left: `${v}%`, width: `${target - v}%`, background: 'var(--color-green)' }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
