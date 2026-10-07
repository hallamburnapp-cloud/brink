import { useEffect } from 'preact/hooks';
import { screen, run, shake, toasts, banner, hotel } from './store';
import { Home } from './screens/Home';
import { SeatSelect } from './screens/SeatSelect';
import { Run } from './screens/Run';
import { Night } from './screens/Night';
import { Desk } from './screens/Desk';
import { Review } from './screens/Review';
import { HotelHome } from './screens/HotelHome';
import { GuestBook } from './screens/GuestBook';
import { Ending } from './screens/Ending';
import { Dawn } from './screens/Dawn';
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
  const h = hotel.value;
  useEffect(() => {
    const el = document.getElementById('app');
    if (!el || shake.value.n === 0) return;
    el.classList.remove('shake');
    el.style.setProperty('--shake', String(Math.min(2, shake.value.strength)));
    void el.offsetWidth;
    el.classList.add('shake');
    const t = setTimeout(() => el.classList.remove('shake'), 700);
    return () => clearTimeout(t);
  }, [shake.value]);

  return (
    <div class={`bg-crt min-h-dvh text-paper ${run.value?.flashpoint && s === 'run' ? 'pulse-red' : ''}`}>
      <DevBanner />
      <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-6 pt-[max(env(safe-area-inset-top),12px)]">
        {s === 'home' && (h ? <HotelHome /> : <Home />)}
        {s === 'seat' && <SeatSelect />}
        {s === 'run' && (run.value?.ruleset === 'simple' ? (h ? <Desk /> : <Night />) : <Run />)}
        {s === 'ending' && (run.value?.ruleset === 'simple' ? (h ? <Review /> : <Dawn />) : <Ending />)}
        {s === 'compendium' && (h ? <GuestBook /> : <Compendium />)}
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
  const red = b.kind === 'flashpoint' || b.kind === 'ante_missed' || b.kind === 'deadman';
  const green = b.kind === 'ante_met' || b.kind === 'ante_smashed';
  const simple = run.value?.ruleset === 'simple';
  const label = b.kind === 'flashpoint' ? (simple ? 'THE PHONE' : 'PRIORITY') : b.kind === 'ante_missed' ? 'THE ANTE' : green ? 'THE ANTE' : b.kind === 'deadman' ? 'FAILSAFE' : simple ? 'TONIGHT' : 'BRIEFING';
  return (
    <div class="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-50 flex justify-center px-4" aria-live="polite">
      <div class={`rise flex items-baseline gap-3 rounded-md ${red ? 'bg-red text-white' : green ? 'bg-green text-ink' : 'paper'} px-4 py-2 text-center shadow-2xl ${b.kind === 'ante_smashed' ? 'scale-110' : ''}`}>
        <span class="mono text-[10px] tracking-[0.3em] opacity-80">{label}</span>
        <span class="serif text-lg font-semibold tracking-wide">{b.title}</span>
        {b.sub && <span class="mono text-[10px] tracking-[0.2em] uppercase opacity-80">{b.sub}</span>}
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
