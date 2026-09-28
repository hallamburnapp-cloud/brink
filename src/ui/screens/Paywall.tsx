import { useEffect, useState } from 'preact/hooks';
import { paymentLinkUrl, restoreByEmail } from '../../meta/unlock';
import { track } from '../../meta/analytics';
import { endlessAvailable, goto, toast } from '../store';

export function Paywall() {
  const [email, setEmail] = useState('');
  const [busyRestore, setBusyRestore] = useState(false);
  useEffect(() => {
    track('unlock_viewed');
  }, []);
  const link = paymentLinkUrl();
  const restore = async () => {
    if (!email.includes('@')) return toast('Enter the email you used at checkout.', 'warn');
    setBusyRestore(true);
    const r = await restoreByEmail(email);
    setBusyRestore(false);
    if (r === 'unlocked') {
      endlessAvailable.value = true;
      toast('Restored. Endless is yours.', 'good');
      goto('home');
    } else toast(r === 'not_found' ? 'No purchase found for that email.' : 'Could not reach the unlock server.', 'warn');
  };
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">ENDLESS</div>
      </header>
      <section class="paper rounded-md p-5 text-ink">
        <div class="mono text-[11px] tracking-[0.3em] text-ink-2/70">ONE-TIME PURCHASE</div>
        <h2 class="serif mt-1 text-3xl font-semibold leading-tight">The whole crisis, every night.</h2>
        <ul class="serif mt-3 space-y-1.5 text-[15px]">
          <li>· All three seats and every DEFCON tier</li>
          <li>· Unlimited runs, any seed, replay and share seeds</li>
          <li>· Every posture piece, every ending, the full compendium</li>
          <li>· The Daily stays free forever</li>
        </ul>
        <p class="mono mt-3 text-[11px] text-ink-2/70">Payment by Stripe. No account. A token is stored on this device; restore on any other with your email.</p>
      </section>
      {link ? (
        <a class="btn btn-primary" href={link} rel="noopener">
          Unlock Endless
        </a>
      ) : (
        <div class="btn" aria-disabled="true">
          Purchases are not configured in this build
        </div>
      )}
      <section class="paper-dark rounded-md p-4">
        <div class="mono text-[10px] tracking-[0.24em] text-mute">RESTORE PURCHASE</div>
        <div class="mt-2 flex gap-2">
          <input class="mono flex-1 rounded-sm border border-paper/20 bg-transparent px-3 py-2 text-sm text-paper placeholder:text-mute/60" type="email" placeholder="email used at checkout" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} />
          <button class="btn" disabled={busyRestore} onClick={restore}>
            Restore
          </button>
        </div>
      </section>
    </div>
  );
}
