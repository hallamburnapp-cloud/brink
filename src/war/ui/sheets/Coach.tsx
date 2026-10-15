/**
 * The coach: one typed line on a strip of linen tape. In play it is pinned along the map's top
 * edge, just under the rail, so the goal on the Big Board stays in view above it; in the shop it
 * is tucked under the tray's lip. A line drops in, and slips away when it ends.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { coach, type CoachLine } from '../app/hints';
import { reduced } from '../app/store';
import type { CoachSpot } from '../app/teach';

const OUT_MS = 160;

export function Coach({ at }: { at: CoachSpot }): JSX.Element | null {
  const live = coach.value?.at === at ? coach.value : null;
  const last = useRef<CoachLine | null>(null);
  const [leaving, setLeaving] = useState<CoachLine | null>(null);

  useEffect(() => {
    const was = last.current;
    last.current = live;
    if (live || !was || reduced.value) {
      setLeaving(null);
      return;
    }
    setLeaving(was);
    const t = window.setTimeout(() => setLeaving(null), OUT_MS);
    return () => clearTimeout(t);
  }, [live?.n]);

  const line = live ?? leaving;
  if (!line) return null;
  return <Strip key={line.n} text={line.text} at={at} out={!live} />;
}

/** The tape itself (the intro sets its own copy on it, larger). */
export function Strip({ text, at, out = false, big = false }: { text: string; at: CoachSpot; out?: boolean; big?: boolean }): JSX.Element {
  return (
    <div class={`coach abs on-${at}${out ? ' out' : ''}${big ? ' big' : ''}`} role="status" aria-live="polite">
      <i class="tack" />
      <span class="coach-text">{text}</span>
      <i class="tack" />
    </div>
  );
}
