import type { EffectKey, Effects, MeterKey, RunState } from '../../engine/types';
import { METERS } from '../../engine/types';
import { DIAL_LABEL } from '../../engine/night';

/** Five dials with no numbers: a filled glyph, a dot for what the tilted choice will move, a flash for what just moved. */
export interface DialsProps {
  state: RunState;
  preview: Effects | null;
  hiddenCosts: EffectKey[];
  applied: Partial<Record<string, number>>;
}

function fillColour(key: MeterKey, v: number): string {
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
  return a >= 12 ? 14 : a >= 6 ? 10 : 6;
}

const GLYPH: Record<MeterKey, string> = {
  public: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0Z',
  military: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6Z',
  allies: 'M4 8h16M4 12h16M4 16h16M8 4v16M16 4v16',
  economy: 'M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H9.5a2.5 2.5 0 0 0 0 5H16',
  escalation: 'M12 3l9 17H3Zm0 5v5m0 3v1',
};

export function Dials({ state, preview, hiddenCosts, applied }: DialsProps) {
  return (
    <div class="grid grid-cols-5 gap-2" role="group" aria-label="Dials">
      {METERS.map((k) => {
        const v = state.meters[k];
        const p = preview?.[k];
        const hidden = hiddenCosts.includes(k);
        const a = applied[k];
        const bad = (d: number) => (k === 'escalation' ? d > 0 : d < 0);
        const edge = k === 'escalation' ? 100 - v : Math.min(v, 100 - v);
        return (
          <div key={k} class="flex flex-col items-center gap-1" aria-label={`${DIAL_LABEL[k]} ${edge <= 12 ? 'at the edge' : edge <= 25 ? 'near the edge' : 'steady'}`}>
            <div class="flex h-4 items-center justify-center" style={{ opacity: p !== undefined || hidden ? 1 : 0 }} aria-hidden="true">
              {hidden ? (
                <span class="mono text-[13px] font-bold text-red">?</span>
              ) : p !== undefined && p !== 0 ? (
                <span class="inline-block rounded-full" style={{ width: dotSize(p), height: dotSize(p), background: bad(p) ? 'var(--color-red)' : 'var(--color-green)', boxShadow: `0 0 ${dotSize(p)}px currentColor` }} />
              ) : null}
            </div>
            <div class={`dial relative h-[68px] w-full overflow-hidden rounded-md ${edge <= 12 ? 'dial-edge' : ''}`}>
              <div class="dial-fill absolute inset-x-0 bottom-0" style={{ height: `${v}%`, background: fillColour(k, v), opacity: 0.9 }} />
              <svg viewBox="0 0 24 24" class="absolute inset-0 m-auto h-8 w-8 mix-blend-difference" fill="none" stroke="var(--color-paper)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={GLYPH[k]} />
              </svg>
              {a !== undefined && a !== 0 && (
                <div key={`${a}-${state.cardsPlayed}`} class="rise absolute inset-x-0 top-1 text-center text-[16px] leading-none" style={{ color: bad(a) ? 'var(--color-red)' : 'var(--color-green)' }} aria-hidden="true">
                  {bad(a) ? (k === 'escalation' ? '▲' : '▼') : k === 'escalation' ? '▼' : '▲'}
                </div>
              )}
            </div>
            <div class={`mono text-[9px] tracking-[0.14em] ${edge <= 12 ? 'text-red' : 'text-mute'}`}>{DIAL_LABEL[k]}</div>
          </div>
        );
      })}
    </div>
  );
}
