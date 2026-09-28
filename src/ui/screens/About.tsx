import { BRAND } from '../../config';
import { goto } from '../store';

export function About() {
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">ABOUT</div>
      </header>
      <article class="paper space-y-3 rounded-md p-5 text-[15px] leading-relaxed text-ink">
        <h2 class="serif text-2xl font-semibold">How to hold it together</h2>
        <p>You are the leader of a great power. Each card is a person at your door with a problem and two ways to make it worse. Drag the card, or tap a choice.</p>
        <p>
          Five things matter: <span class="mono text-[13px]">PUBLIC · MILITARY · ALLIES · ECONOMY · ESCALATION</span>. If any of the first four hits the floor or the ceiling, you are removed
          from office. If escalation reaches the top, nobody is.
        </p>
        <p>
          The things that matter most you cannot see: what the other side believes about you, how good your warnings are, how boxed in you have made yourself. Your advisors will tell
          you, in their own words and with their own agendas.
        </p>
        <p>Each week ends in a flashpoint. Between weeks, three people want a word. What you bring into the room is your posture; postures combine, and not always the way you meant.</p>
        <p>Odds are shown before you choose. Near misses are shown after. A seed replays identically, so when the world ends you can find out exactly where.</p>
        <p class="mono text-[11px] text-ink-2/70">{BRAND.copyright} All persons, states and events are fictional.</p>
      </article>
    </div>
  );
}
