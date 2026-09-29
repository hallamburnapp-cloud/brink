import { BRAND, FEATURES } from '../../config';
import { goto } from '../store';

export function Privacy() {
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">PRIVACY</div>
      </header>
      <article class="paper space-y-3 rounded-md p-5 text-[15px] leading-relaxed text-ink">
        <h2 class="serif text-2xl font-semibold">Privacy</h2>
        <p>
          {BRAND.name} is a single-player game. There are no accounts, no chat, no comments, no leaderboards with names, and no way for one player to
          send anything to another.
        </p>
        <h3 class="serif text-lg font-semibold">What is stored on your device</h3>
        <p>
          Your progress (unlocks, statistics, the endings you have seen, the run in progress, settings and, if you bought Night after night, a purchase token)
          is stored in your browser's local storage. Nothing is sent to us. Clearing site data removes it.
        </p>
        <h3 class="serif text-lg font-semibold">Cookies</h3>
        <p>We set no cookies. Strictly necessary storage as described above is all there is.</p>
        <h3 class="serif text-lg font-semibold">Analytics</h3>
        <p>
          {FEATURES.analytics === 'off'
            ? 'Analytics are switched off in this build.'
            : 'We use cookie-free, aggregate analytics that record no identifiers and no location: which mode was played, how long runs last, which endings happen. It cannot be used to identify you.'}
        </p>
        <h3 class="serif text-lg font-semibold">Payments</h3>
        <p>
          Purchases of Night after night are handled entirely by Stripe on Stripe's pages. We never see your card details. To issue and restore your unlock, our
          server sees the email address you used at checkout, in hashed form, and nothing else.
        </p>
        <h3 class="serif text-lg font-semibold">Location</h3>
        <p>We never request or infer your location.</p>
        <h3 class="serif text-lg font-semibold">Contact</h3>
        <p>{BRAND.supportEmail ? BRAND.supportEmail : 'Support contact is published on the store page.'}</p>
        <p class="mono text-[11px] text-ink-2/70">{BRAND.copyright} All content fictional.</p>
      </article>
    </div>
  );
}
