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
        <h2 class="serif text-2xl font-semibold">How the night works</h2>
        <p>It is 3am and the phone is ringing. You lead a country in a crisis that will not wait for morning. Each card is someone at your door with a problem and two ways to answer it. Swipe, or tap a choice.</p>
        <p>
          Five dials: <span class="mono text-[13px]">PEOPLE · ARMY · ALLIES · MONEY · DANGER</span>. If any of the first four hits the edge, you are out. If danger fills, everyone is.
        </p>
        <p>Every card moves the clock seven minutes. Reach 6:00 and the night is yours. The last call of the night is the crisis, and it comes with odds.</p>
        <p>Tonight is the same for everyone. One attempt. Your result is a strip you can paste anywhere without giving the night away.</p>
        <p>Night after night unlocks any night on any seat, seeds you can share, and Expert mode, which puts the numbers back on.</p>
        <p class="mono text-[11px] text-ink-2/70">{BRAND.copyright} All persons, states and events are fictional.</p>
      </article>
    </div>
  );
}
