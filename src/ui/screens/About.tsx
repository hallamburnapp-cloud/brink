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
      <article class="paper serif space-y-3 rounded-md p-5 text-[16px] leading-relaxed text-ink">
        <h2 class="serif text-2xl font-semibold">How the night works</h2>
        <p>It is 3am at The Brink and the phone is ringing. You are the Night Manager of a hotel that is not quite coping. Each card is someone at the desk with a problem and two ways to answer it. Swipe, or tap a choice, and the hotel answers back in one line.</p>
        <p>
          Four bars: <span class="mono text-[13px]">GUESTS · STAFF · MONEY · THE BUILDING</span>. If any of them reaches the floor, the night is over. The night wears them down by itself; what you choose decides where they end.
        </p>
        <p>Every card is ten minutes of the clock. At 6:00 the Day Manager walks in and a guest writes your review: one star to five, with the line everyone quotes.</p>
        <p>Tonight is the same for everyone. One attempt. Your result is the Booking, the stars, one row of squares and the quote, and you can paste it anywhere without giving the night away. Practice nights are free and nobody reads those reviews but you.</p>
        <p>The Brass Plate lets you choose the night you work, opens every page of the Guest Book, works any past Tonight again, and puts a badge on the reviews you share.</p>
        <p class="mono text-[11px] text-ink-2/70">{BRAND.copyright} The hotel, its staff and its guests are fictional.</p>
      </article>
    </div>
  );
}
