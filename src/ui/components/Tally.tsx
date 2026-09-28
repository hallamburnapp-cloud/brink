import { useEffect, useState } from 'preact/hooks';
import type { LeverageBreakdown } from '../../engine/types';
import { reducedMotion } from '../store';
import { snd } from '../sound';
import { formatScore } from '../../meta/score';

/**
 * The chips-and-mult moment: BASE counts up, MULT counts up, ESC shows, then the
 * result slams in. Duration scales with the result; ticks rise in pitch.
 */
export function Tally({ breakdown, actLeverage, actTarget }: { breakdown: LeverageBreakdown; actLeverage: number; actTarget: number }) {
  const reduce = reducedMotion();
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(reduce ? 3 : 0);
  const [base, setBase] = useState(reduce ? breakdown.base : 0);
  const [mult, setMult] = useState(reduce ? breakdown.mult : 1);
  const b = breakdown;
  const big = Math.min(1, Math.log10(Math.max(1, b.total)) / 5);

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    const steps = b.total < 60 ? 6 : b.total < 400 ? 9 : 12;
    const stepMs = b.total < 60 ? 40 : b.total < 400 ? 50 : 60;
    (async () => {
      for (let i = 1; i <= steps && !cancelled; i++) {
        setBase(Math.round((b.base * i) / steps));
        snd.play('tally_tick', { intensity: i / steps });
        await new Promise((r) => setTimeout(r, stepMs));
      }
      if (cancelled) return;
      setStage(1);
      const msteps = b.mult <= 1.05 ? 1 : Math.min(12, Math.max(4, Math.round(b.mult * 2)));
      for (let i = 1; i <= msteps && !cancelled; i++) {
        setMult(Math.round((1 + ((b.mult - 1) * i) / msteps) * 100) / 100);
        snd.play('tally_mult', { intensity: i / msteps });
        await new Promise((r) => setTimeout(r, stepMs));
      }
      if (cancelled) return;
      setStage(2);
      await new Promise((r) => setTimeout(r, 160));
      if (cancelled) return;
      setStage(3);
    })();
    return () => {
      cancelled = true;
    };
  }, [b, reduce]);

  const pct = Math.min(100, (actLeverage / Math.max(1, actTarget)) * 100);
  return (
    <div class="pointer-events-none fixed inset-x-0 top-[22%] z-[54] flex justify-center px-4" aria-live="polite" aria-label={`Leverage ${b.total}`}>
      <div class="paper w-full max-w-[380px] rounded-md px-5 py-4 shadow-2xl rise" style={{ transform: stage === 3 && !reduce ? `scale(${1 + big * 0.08})` : undefined, transition: 'transform 180ms cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div class="mono flex items-end justify-between text-[10px] tracking-[0.3em] text-ink-2/60">
          <span>LEVERAGE</span>
          {b.retriggers > 0 && <span class="text-red-2">×{1 + b.retriggers} RETRIGGER</span>}
        </div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="flex flex-col">
            <span class="mono text-[9px] tracking-[0.2em] text-blue">BASE</span>
            <span class="serif text-3xl font-bold tabular-nums text-blue">{base}</span>
          </div>
          <span class={`serif text-2xl text-ink-2 ${stage >= 1 ? '' : 'opacity-20'}`}>×</span>
          <div class={`flex flex-col ${stage >= 1 ? '' : 'opacity-20'}`}>
            <span class="mono text-[9px] tracking-[0.2em] text-red">MULT</span>
            <span class="serif text-3xl font-bold tabular-nums text-red">{mult.toFixed(mult >= 10 ? 0 : 1)}</span>
          </div>
          {b.escMult > 1 && (
            <>
              <span class={`serif text-2xl text-ink-2 ${stage >= 2 ? '' : 'opacity-20'}`}>×</span>
              <div class={`flex flex-col ${stage >= 2 ? '' : 'opacity-20'}`}>
                <span class="mono text-[9px] tracking-[0.2em] text-amber">ESC {b.escalation}</span>
                <span class="serif text-3xl font-bold tabular-nums text-amber">{b.escMult}</span>
              </div>
            </>
          )}
        </div>
        <div class={`mt-2 flex items-baseline justify-between border-t border-ink/10 pt-2 ${stage >= 3 ? 'rise' : 'opacity-0'}`}>
          <span class="mono text-[10px] tracking-[0.3em] text-ink-2/60">SCORED</span>
          <span class="serif font-bold tabular-nums text-ink" style={{ fontSize: `${28 + big * 22}px`, lineHeight: 1 }}>
            +{formatScore(b.total)}
          </span>
        </div>
        <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div class="h-full bg-red transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div class="mono mt-1 flex justify-between text-[10px] text-ink-2/70">
          <span>ACT {formatScore(actLeverage)}</span>
          <span>TARGET {formatScore(actTarget)}</span>
        </div>
      </div>
    </div>
  );
}
