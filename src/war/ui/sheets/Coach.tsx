/**
 * The coach: one typed line on a strip of linen tape. In play it is pinned along the table's top
 * edge, just under the rail, so the Big Board's goal stays in view above it; in the Briefing it is
 * tucked under the tray's lip, beside the cards. A line drops in, and slips away when it ends.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { coach, type CoachLine, type CoachSpot } from '../app/hints';
import { reduced } from '../app/store';
import { emphasis } from '../common/chip';

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
  return (
    <div key={line.n} class={`coach abs on-${at}${live ? '' : ' out'}`} role="status" aria-live="polite">
      <i class="tack" />
      <span class="coach-text">
        {emphasis(line.text).map((p, i) => (p.em ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}
      </span>
      <i class="tack" />
    </div>
  );
}
