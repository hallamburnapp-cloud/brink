import { useEffect, useState } from 'preact/hooks';
import { BRAND, FEATURES, VERSION } from '../../config';
import { dailyDateKey, dailyNumber, dailyPlayed, dailySeat, dailyStreak, getDailyRecord, msUntilNextDaily } from '../../meta/daily';
import { hasEndless } from '../../meta/unlock';
import { compendium } from '../../meta/compendium';
import { formatScore, getBestScore } from '../../meta/score';
import { content, endlessAvailable, goto, hasSavedRun, resumeRun, startDaily } from '../store';
import { Mark } from '../components/Mark';

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function Home() {
  const c = content.value;
  const played = dailyPlayed();
  const rec = played ? getDailyRecord() : null;
  const seat = c.seats[dailySeat()];
  const [countdown, setCountdown] = useState(fmt(msUntilNextDaily()));
  useEffect(() => {
    const id = setInterval(() => setCountdown(fmt(msUntilNextDaily())), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (FEATURES.paywall && !FEATURES.allUnlocked) hasEndless().then((ok) => (endlessAvailable.value = ok));
  }, []);
  const comp = compendium(c);
  const streak = dailyStreak();
  const best = getBestScore();

  return (
    <div class="flex flex-1 flex-col gap-6 pt-6">
      <header class="flex flex-col items-center gap-3 pt-6 text-center">
        <Mark size={72} />
        <h1 class="serif text-5xl font-semibold tracking-[0.18em]">{BRAND.name}</h1>
        <p class="serif max-w-[320px] text-sm leading-snug text-paper/70">{BRAND.tagline}</p>
      </header>

      {hasSavedRun.value && (
        <button class="btn btn-danger" onClick={() => resumeRun()}>
          Resume the crisis in progress
        </button>
      )}

      <section class="paper-dark rounded-md p-4">
        <div class="mono flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
          <span>DAILY #{dailyNumber()}</span>
          <span>{dailyDateKey()}</span>
        </div>
        <div class="mt-2 flex items-center justify-between gap-3">
          <div>
            <div class="serif text-xl font-semibold" style={{ color: seat.accent }}>
              {seat.name}
            </div>
            <div class="serif text-xs text-paper/70">Same seed for everyone. One attempt.{streak > 1 ? ` Streak ${streak}.` : ''}</div>
          </div>
          {!played ? (
            <button class="btn btn-primary" onClick={startDaily}>
              Play
            </button>
          ) : (
            <div class="mono text-right text-[10px] tracking-[0.14em] text-mute">
              <div class="text-paper/80">{rec?.days} DAYS · {rec ? c.endings[rec.ending]?.name.toUpperCase() : ''}</div>
              <div>NEXT IN {countdown}</div>
            </div>
          )}
        </div>
      </section>

      <section class="paper-dark rounded-md p-4">
        <div class="mono text-[10px] tracking-[0.24em] text-mute">ENDLESS</div>
        <div class="mt-2 flex items-center justify-between gap-3">
          <div>
            <div class="serif text-xl font-semibold">Every seat, every seed</div>
            <div class="serif text-xs text-paper/70">Unlimited runs. Choose a seat, a DEFCON tier, share a seed.</div>
            {best && (
              <div class="mono mt-1 text-[10px] tracking-[0.14em] text-amber">
                BEST SCORE {formatScore(best.score)} · {c.seats[best.seat as keyof typeof c.seats]?.name ?? best.seat}
                {best.endless ? ` · ENDLESS ${best.act - c.acts.length}` : ''}
              </div>
            )}
          </div>
          {endlessAvailable.value ? (
            <button class="btn btn-primary" onClick={() => goto('seat')}>
              Play
            </button>
          ) : (
            <button class="btn" onClick={() => goto('paywall')}>
              Unlock
            </button>
          )}
        </div>
      </section>

      <nav class="grid grid-cols-2 gap-2">
        <button class="btn" onClick={() => goto('compendium')}>
          Endings {comp.seen}/{comp.total}
        </button>
        <button class="btn" onClick={() => goto('stats')}>
          Record
        </button>
        <button class="btn" onClick={() => goto('settings')}>
          Settings
        </button>
        <button class="btn" onClick={() => goto('about')}>
          About
        </button>
      </nav>

      <footer class="mono mt-auto flex items-center justify-between pt-4 text-[10px] tracking-[0.14em] text-mute">
        <span>{BRAND.copyright}</span>
        <span class="flex gap-3">
          <button class="link" onClick={() => goto('privacy')}>
            PRIVACY
          </button>
          <span>v{VERSION}</span>
        </span>
      </footer>
    </div>
  );
}
