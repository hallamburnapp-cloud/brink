import { useEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../audio';

export interface TimerProps {
  /** Total seconds; null → no timer. */
  seconds: number | null;
  /** Key that resets the timer (card id). */
  resetKey: string;
  paused: boolean;
  onExpire: () => void;
}

/** Visible countdown with a heartbeat that accelerates. */
export function Timer({ seconds, resetKey, paused, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds ?? 0);
  const fired = useRef(false);
  const lastBeat = useRef(0);

  useEffect(() => {
    setRemaining(seconds ?? 0);
    fired.current = false;
    lastBeat.current = 0;
    if (seconds === null) audio.heartbeat(null);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (seconds === null || paused || fired.current) {
      if (seconds === null || paused) audio.heartbeat(null);
      return;
    }
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setRemaining((r) => {
        const next = Math.max(0, r - dt);
        const frac = seconds > 0 ? next / seconds : 0;
        const bpm = Math.round(60 + (1 - frac) * 110);
        if (now - lastBeat.current > 500) {
          audio.heartbeat(bpm);
          lastBeat.current = now;
        }
        if (next <= 0 && !fired.current) {
          fired.current = true;
          audio.heartbeat(null);
          setTimeout(onExpire, 0);
        }
        return next;
      });
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [seconds, paused, resetKey]);

  useEffect(() => () => audio.heartbeat(null), []);

  if (seconds === null) return null;
  const frac = seconds > 0 ? remaining / seconds : 0;
  const urgent = frac < 0.35;
  return (
    <div class="flex items-center gap-2" role="timer" aria-live="off" aria-label={`${Math.ceil(remaining)} seconds`}>
      <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-paper/10">
        <div class="absolute inset-y-0 left-0" style={{ width: `${frac * 100}%`, background: urgent ? 'var(--color-red)' : 'var(--color-paper)', transition: 'width 100ms linear' }} />
      </div>
      <div class={`mono w-9 text-right text-xs tabular-nums ${urgent ? 'text-red blink' : 'text-paper/80'}`}>{Math.ceil(remaining)}s</div>
    </div>
  );
}
