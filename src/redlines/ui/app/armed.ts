/**
 * A form that has just been laid on the desk is not yet taking taps: a thumb drumming to skip a
 * playback would otherwise answer the phone with the tap after the one that skipped. The forms are
 * armed once their entrance (paper.css rl-in, 300 ms after a 400 ms delay) has put them on the paper;
 * at once under reduced motion. The scripting hook drives the actions directly and is never held.
 */
import { useEffect, useState } from 'preact/hooks';
import { reduced } from './store';

/** How long after a call or a card is laid down its forms start taking taps. */
export const ARM_MS = 450;

/** True once `ms` have passed since `key` last changed (a new call, a new card). */
export function useArmed(key: string | number, ms = ARM_MS): boolean {
  const [armed, setArmed] = useState(reduced.value);
  useEffect(() => {
    if (reduced.value) {
      setArmed(true);
      return;
    }
    setArmed(false);
    const t = setTimeout(() => setArmed(true), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return armed;
}
