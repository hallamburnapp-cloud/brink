import type { AccidentResult } from '../../engine/types';
import { ACCIDENT_LABEL, ACCIDENT_TEXT } from '../../engine/leverage';

/** The held breath, then the verdict. */
export function AccidentOverlay({ result, phase }: { result: AccidentResult; phase: 'breath' | 'result' }) {
  const fired = result.fired;
  return (
    <div class={`fixed inset-0 z-[56] flex items-center justify-center px-6 ${phase === 'breath' ? 'bg-navy/70' : fired ? 'bg-red/30' : 'bg-navy/60'} fade-in`} role="alert" aria-label={`${ACCIDENT_LABEL[result.type]} ${fired ? 'happened' : 'did not happen'}`}>
      <div class={`w-full max-w-[360px] rounded-md p-5 shadow-2xl ${fired && phase === 'result' ? 'bg-red text-white' : 'paper text-ink'}`}>
        <div class="mono text-[11px] tracking-[0.3em] opacity-70">{phase === 'breath' ? 'ACCIDENT ROLL' : fired ? 'ACCIDENT' : 'CLEAR'}</div>
        <div class="serif mt-1 text-2xl font-semibold">{ACCIDENT_LABEL[result.type]}</div>
        {phase === 'breath' ? (
          <div class="mono mt-3 text-sm opacity-80">
            {Math.round(result.p * 100)}% <span class="blink">…</span>
          </div>
        ) : (
          <div class="serif mt-2 text-[15px] leading-snug">
            {fired ? ACCIDENT_TEXT[result.type] : 'Nothing on the board. This time.'}
            {fired && (
              <div class="mono mt-2 text-[11px] opacity-90">
                {Object.entries(result.applied)
                  .map(([k, v]) => `${k.replace('_', ' ')} ${v! > 0 ? '+' : ''}${v}`)
                  .join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
