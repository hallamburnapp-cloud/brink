import { useEffect } from 'preact/hooks';
import { screen, run, shake, toasts, banner } from './store';
import { Home } from './screens/Home';
import { SeatSelect } from './screens/SeatSelect';
import { Run } from './screens/Run';
import { Ending } from './screens/Ending';
import { Compendium } from './screens/Compendium';
import { Stats } from './screens/Stats';
import { Privacy } from './screens/Privacy';
import { Unlocked } from './screens/Unlocked';
import { Settings } from './screens/Settings';
import { Paywall } from './screens/Paywall';
import { About } from './screens/About';
import { DevBanner } from './components/DevBanner';

export function App() {
  const s = screen.value;
  useEffect(() => {
    const el = document.getElementById('app');
    if (!el || shake.value === 0) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    const t = setTimeout(() => el.classList.remove('shake'), 700);
    return () => clearTimeout(t);
  }, [shake.value]);

  return (
    <div class={`bg-crt min-h-dvh text-paper ${run.value?.flashpoint && s === 'run' ? 'pulse-red' : ''}`}>
      <DevBanner />
      <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-6 pt-[max(env(safe-area-inset-top),12px)]">
        {s === 'home' && <Home />}
        {s === 'seat' && <SeatSelect />}
        {s === 'run' && <Run />}
        {s === 'ending' && <Ending />}
        {s === 'compendium' && <Compendium />}
        {s === 'stats' && <Stats />}
        {s === 'privacy' && <Privacy />}
        {s === 'unlocked' && <Unlocked />}
        {s === 'settings' && <Settings />}
        {s === 'paywall' && <Paywall />}
        {s === 'about' && <About />}
      </div>
      <Banner />
      <Toasts />
    </div>
  );
}

function Banner() {
  const b = banner.value;
  if (!b) return null;
  return (
    <div class="pointer-events-none fixed inset-x-0 top-[18%] z-50 flex justify-center px-4" aria-live="polite">
      <div class={`rise ${b.kind === 'flashpoint' ? 'bg-red text-white' : 'paper'} px-6 py-4 text-center shadow-2xl`} style="min-width: 240px">
        <div class="mono text-[11px] tracking-[0.3em] opacity-80">{b.kind === 'flashpoint' ? 'PRIORITY' : 'BRIEFING'}</div>
        <div class="serif text-2xl font-semibold tracking-wide">{b.title}</div>
        {b.sub && <div class="mono mt-1 text-xs tracking-[0.2em] uppercase opacity-80">{b.sub}</div>}
      </div>
    </div>
  );
}

function Toasts() {
  const list = toasts.value;
  if (!list.length) return null;
  return (
    <div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          class={`rise mono max-w-[440px] rounded-sm px-3 py-2 text-xs tracking-wide shadow-lg ${t.kind === 'warn' ? 'bg-amber text-ink' : t.kind === 'good' ? 'bg-paper text-ink' : 'bg-navy-3 text-paper'}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
