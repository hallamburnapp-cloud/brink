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
        <div class="mono text-[11px] tracking-[0.3em] text-ink-2/70">NIGHT AFTER NIGHT</div>
        {status === 'working' && <h2 class="serif mt-1 text-2xl font-semibold">Confirming your purchase…</h2>}
        {(status === 'unlocked' || status === 'already') && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">Night after night is yours.</h2>
            <p class="serif mt-2 text-[15px]">Any night, any seat, any seed, and Expert mode. The token is stored on this device; use Restore on another device with the same email.</p>
          </>
        )}
        {status === 'invalid' && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">That link did not check out.</h2>
            <p class="serif mt-2 text-[15px]">If you paid, use Restore purchase in Settings with the email you used at checkout.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 class="serif mt-1 text-2xl font-semibold">We could not reach the unlock server.</h2>
            <p class="serif mt-2 text-[15px]">Try again in a minute, or use Restore purchase in Settings.</p>
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
