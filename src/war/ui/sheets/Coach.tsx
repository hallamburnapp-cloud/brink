/**
 * The coach: one typed line on a strip of linen tape. In play it is pinned along the map's top
 * edge, just under the rail, so the goal on the Big Board stays in view above it; in the shop it
 * is tucked under the tray's lip. A line drops in, and slips away when it ends; a line cut short (SEND
 * pressed, the shop left, the next deal) goes at once.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { coach, wasCut, type CoachLine } from '../app/hints';
import { reduced } from '../app/store';
import type { CoachSpot } from '../app/teach';
import { Rich } from '../common/text';

const OUT_MS = 160;

export function Coach({ at }: { at: CoachSpot }): JSX.Element | null {
  const live = coach.value?.at === at ? coach.value : null;
  /** The line on show at the last render, and the one slipping away (worked out in render, so the
   * strip never blanks for a frame between the two). */
  const was = useRef<CoachLine | null>(null);
  const leaving = useRef<{ line: CoachLine; until: number } | null>(null);
  const [, redraw] = useState(0);
  const now = performance.now();
  if (live) {
    leaving.current = null;
  } else if (was.current) {
    // A line that ended on its own slips away; one cut (SEND pressed, the shop left, the next deal)
    // goes at once, so it never shows over what replaced it.
    leaving.current = reduced.value || wasCut(was.current.n) ? null : { line: was.current, until: now + OUT_MS };
  }
  was.current = live;
  const out = leaving.current && leaving.current.until > now ? leaving.current : null;

  useEffect(() => {
    if (!out) return;
    const t = window.setTimeout(() => redraw((k) => k + 1), Math.max(0, out.until - performance.now()) + 5);
    return () => clearTimeout(t);
  }, [out?.line.n]);

  const line = live ?? out?.line ?? null;
  if (!line) return null;
  return <Strip key={line.n} text={line.text} at={at} out={!live} />;
}

/** The tape itself (the intro sets its own copy on it, larger). */
export function Strip({ text, at, out = false, big = false }: { text: string; at: CoachSpot; out?: boolean; big?: boolean }): JSX.Element {
  return (
    <div class={`coach abs on-${at}${out ? ' out' : ''}${big ? ' big' : ''}`} role="status" aria-live="polite">
      <i class="tack" />
      <span class="coach-text">
        <Rich text={text} size={12} />
      </span>
      <i class="tack" />
    </div>
  );
}
