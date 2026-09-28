import { settings, updateSettings } from '../store';

/** One-time overlay on the first card of the first run. Three lines, in-world. */
export function Intro() {
  if (settings.value.seenIntro) return null;
  return (
    <div class="fixed inset-0 z-[52] flex items-end justify-center bg-navy/80 px-4 pb-[max(env(safe-area-inset-bottom),16px)] fade-in" role="dialog" aria-label="How this works">
      <div class="paper w-full max-w-[440px] rounded-md p-5 text-ink shadow-2xl">
        <div class="mono text-[11px] tracking-[0.3em] text-ink-2/70">STANDING ORDERS</div>
        <ol class="serif mt-2 space-y-2 text-[15px] leading-snug">
          <li>
            <span class="font-semibold">Drag the card</span> left or right, or tap a choice. Dots above the meters show what it costs. A red <span class="mono font-bold text-red">?</span> means nobody told you.
          </li>
          <li>
            <span class="font-semibold">Any meter at the floor or the ceiling</span> ends your time in office. Escalation at the top ends everything.
          </li>
          <li>
            <span class="font-semibold">What they believe about you</span> is never a number. Listen to the people in the room. Odds are shown before you roll; near misses after.
          </li>
        </ol>
        <button class="btn btn-primary mt-4 w-full" onClick={() => updateSettings({ seenIntro: true })}>
          Pick up the phone
        </button>
      </div>
    </div>
  );
}
