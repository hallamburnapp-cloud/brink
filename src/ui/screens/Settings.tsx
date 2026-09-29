import { goto, settings, updateSettings, toast } from '../store';
import { audio } from '../../audio';
import { FEATURES } from '../../config';

export function Settings() {
  const s = settings.value;
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">SETTINGS</div>
      </header>
      <h2 class="serif text-2xl font-semibold">Settings</h2>
      <Row label="Sound" desc="Synthesised in the browser. Nothing is downloaded.">
        <button
          class={`btn ${s.muted ? '' : 'btn-primary'}`}
          onClick={() => {
            updateSettings({ muted: !s.muted });
            if (s.muted) {
              audio.unlock();
              audio.play('commit');
            }
          }}
        >
          {s.muted ? 'Muted' : 'On'}
        </button>
      </Row>
      <Row label="Motion" desc="Reduce animation, shake and slow-motion rolls. Follows your system setting by default.">
        <button class={`btn ${s.motion === 'reduce' ? 'btn-primary' : ''}`} onClick={() => updateSettings({ motion: s.motion === 'reduce' ? 'auto' : 'reduce' })}>
          {s.motion === 'reduce' ? 'Reduced' : 'Auto'}
        </button>
      </Row>
      {FEATURES.paywall && (
        <Row label="Purchase" desc="Restore your unlock on this device.">
          <button class="btn" onClick={() => goto('paywall')}>
            Restore
          </button>
        </Row>
      )}
      <Row label="Local data" desc="Progress lives only in this browser. Clearing it cannot be undone.">
        <button
          class="btn text-red"
          onClick={() => {
            if (!confirm('Erase all local progress, unlocks and statistics on this device?')) return;
            try {
              const keys = Object.keys(localStorage).filter((k) => k.startsWith('brink.') && k !== 'brink.unlock.token');
              keys.forEach((k) => localStorage.removeItem(k));
              toast('Erased. Reloading…', 'good');
              setTimeout(() => location.reload(), 600);
            } catch {
              toast('Storage unavailable.', 'warn');
            }
          }}
        >
          Erase
        </button>
      </Row>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: preact.ComponentChildren }) {
  return (
    <div class="paper-dark flex items-center justify-between gap-3 rounded-md p-4">
      <div>
        <div class="serif text-base font-semibold">{label}</div>
        <div class="serif text-[12px] text-paper/70">{desc}</div>
      </div>
      {children}
    </div>
  );
}
