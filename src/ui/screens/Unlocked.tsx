import { useEffect, useState } from 'preact/hooks';
import { completeUnlockFromUrl } from '../../meta/unlock';
import { track } from '../../meta/analytics';
import { endlessAvailable, goto } from '../store';

export function Unlocked() {
  const [status, setStatus] = useState<'working' | 'unlocked' | 'already' | 'invalid' | 'error' | 'none'>('working');
  useEffect(() => {
    completeUnlockFromUrl(location.search).then((r) => {
      setStatus(r);
      if (r === 'unlocked' || r === 'already') {
        endlessAvailable.value = true;
        if (r === 'unlocked') track('unlock_completed');
      }
    });
  }, []);
  return (
    <div class="flex flex-1 flex-col gap-4 rise pt-10">
      <div class="paper rounded-md p-5 text-ink">
        <div class="mono text-[11px] tracking-[0.3em] text-ink-2/70">THE BRASS PLATE</div>
        {status === 'working' && <h2 class="serif mt-1 text-2xl font-semibold">Confirming your purchase…</h2>}
        {(status === 'unlocked' || status === 'already') && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">The plate is on the desk.</h2>
            <p class="serif mt-2 text-[15px]">Choose the night you work, read every page of the Guest Book, work any past Tonight again, and wear the badge on your reviews. The token is stored in this browser; if you play from the home-screen app or another device, use Restore there with the same email.</p>
          </>
        )}
        {status === 'invalid' && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">That link did not check out.</h2>
            <p class="serif mt-2 text-[15px]">If you paid, open the unlock screen (Home → Unlock) and use Restore with the email you used at checkout.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">We could not reach the unlock server.</h2>
            <p class="serif mt-2 text-[15px]">Try again in a minute, or open the unlock screen (Home → Unlock) and use Restore with your email.</p>
          </>
        )}
        {status === 'none' && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">Nothing to unlock here.</h2>
            <p class="serif mt-2 text-[15px]">This page confirms purchases after Stripe redirects you back.</p>
          </>
        )}
      </div>
      <button class="btn btn-primary" onClick={() => goto('home')}>
        Continue
      </button>
    </div>
  );
}
