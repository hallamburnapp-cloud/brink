import { useEffect, useState } from 'preact/hooks';
import type { RollResult } from '../../engine/types';
import { reducedMotion } from '../store';

/** The odds roll: a needle sweeps to the roll; the threshold is the probability. */
export function RollOverlay({ result, slow }: { result: RollResult; slow: boolean }) {
  const [phase, setPhase] = useState<'spin' | 'done'>('spin');
  const reduce = reducedMotion();
  const dur = reduce ? 0 : slow ? 2400 : 1300;
  useEffect(() => {
    const t = setTimeout(() => setPhase('done'), dur + 50);
    return () => clearTimeout(t);
  }, [result]);
  const pct = Math.round(result.p * 100);
  const rollPct = Math.round(result.roll * 100);
  const width = 300;
  return (
    <div class={`fixed inset-0 z-[55] flex items-center justify-center bg-navy/85 px-6 fade-in ${slow ? 'pulse-red' : ''}`} role="dialog" aria-live="assertive" aria-label={`${result.label}: ${pct} percent`}>
      <div class="paper w-full max-w-[360px] rounded-md p-5 shadow-2xl">
        <div class="mono text-[11px] tracking-[0.3em] text-ink-2/70">{slow ? 'FINAL ROLL' : 'ROLL'}</div>
        <div class="serif mt-1 text-2xl font-semibold text-ink">{result.label}</div>
        <div class="mono mt-1 text-sm text-ink-2">
          Odds <span class="font-bold">{pct}%</span>
        </div>
        <div class="relative mt-5 h-8" style={{ width: '100%' }}>
          {/* success zone */}
          <div class="absolute inset-y-0 left-0 rounded-l-sm bg-green/70" style={{ width: `${pct}%` }} />
          <div class="absolute inset-y-0 rounded-r-sm bg-red/60" style={{ left: `${pct}%`, right: 0 }} />
          {/* needle */}
          <div
            class={`absolute -top-1 -bottom-1 w-[3px] bg-ink ${reduce ? '' : 'needle'}`}
            style={{ left: 0, ['--needle-x' as any]: `calc(${rollPct}% * ${width} / 100 * (100% / ${width}px))`, transform: reduce ? `translateX(${rollPct}%)` : undefined, ['--needle-dur' as any]: `${dur}ms` }}
          />
          <NeedleExact rollPct={rollPct} dur={dur} reduce={reduce} />
          <div class="mono absolute -bottom-5 left-0 text-[10px] text-ink-2/60">0</div>
          <div class="mono absolute -bottom-5 right-0 text-[10px] text-ink-2/60">100</div>
        </div>
        <div class="mt-8 min-h-[3.2rem]">
          {phase === 'done' && (
            <div class="rise">
              <div class={`serif text-3xl font-bold ${result.success ? 'text-green' : 'text-red'}`}>{result.success ? 'HELD' : 'FAILED'}</div>
              <div class="mono text-xs text-ink-2">
                Rolled {rollPct} against {pct}
                {result.nearMiss && (
                  <span class="ml-2 font-bold text-red-2">
                    · {result.success ? 'Held by' : 'Missed by'} {Math.max(1, Math.round(result.margin))}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The needle is positioned in percent of the track; CSS var animation needs a px-free target, so a second element does the sweep. */
function NeedleExact({ rollPct, dur, reduce }: { rollPct: number; dur: number; reduce: boolean }) {
  const [x, setX] = useState(0);
  useEffect(() => {
    if (reduce) {
      setX(rollPct);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      // overshoot then settle for drama
      const wobble = k < 1 ? Math.sin(k * Math.PI * 3) * (1 - k) * 6 : 0;
      setX(Math.max(0, Math.min(100, rollPct * eased + wobble)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rollPct, dur, reduce]);
  return <div class="absolute -top-2 -bottom-2 w-[3px] bg-ink shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ left: `calc(${x}% - 1px)` }} />;
}
