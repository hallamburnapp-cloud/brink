import { useEffect, useState } from 'preact/hooks';
import { BRAND, FEATURES, VERSION } from '../../config';
import { dailyNumber, dailyPlayed, dailySeat, dailyStreak, getDailyRecord, msUntilNextDaily } from '../../meta/daily';
import { hasEndless } from '../../meta/unlock';
import { compendium } from '../../meta/compendium';
import { stripCells } from '../../meta/share';
import { content, endlessAvailable, goto, hasSavedRun, resumeRun, savedRunMode, startDaily, startNight } from '../store';
import { Mark } from '../components/Mark';
import { DIAL_LABEL } from '../../engine/night';
import { METERS } from '../../engine/types';

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
  const cells = rec?.trail ? stripCells(rec.trail, 12) : null;
  const endingName = rec ? c.endings[rec.ending]?.name ?? '' : '';

  return (
    <div class="flex flex-1 flex-col gap-5 pt-6">
      <header class="flex flex-col items-center gap-3 pt-4 text-center">
        <Mark size={64} />
        <h1 class="serif text-5xl font-semibold tracking-[0.18em]">{BRAND.name}</h1>
        <p class="serif max-w-[300px] text-[15px] leading-snug text-paper/75">It's 3am. The phone is ringing. Make it to dawn.</p>
      </header>

      {hasSavedRun.value && savedRunMode.value !== 'daily' && (
        <button class="btn btn-danger" onClick={() => resumeRun()}>
          Pick the phone back up {savedRunMode.value === 'night' ? '· the night you left' : savedRunMode.value ? '· Expert' : ''}
        </button>
      )}

      <section class="paper-dark rounded-md p-4" aria-label="Tonight">
        <div class="mono flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
          <span>TONIGHT · #{dailyNumber()}</span>
          <span>{streak > 1 ? `${streak} NIGHTS IN A ROW` : 'SAME NIGHT FOR EVERYONE'}</span>
        </div>
        {!played ? (
          <>
            <div class="serif mt-2 text-xl font-semibold" style={{ color: seat.accent }}>
              You are {seat.the}.
            </div>
            {hasSavedRun.value && savedRunMode.value === 'daily' ? (
              <>
                <button class="btn btn-primary mt-3 w-full py-4 text-lg" onClick={() => resumeRun()}>
                  Pick the phone back up
                </button>
                <div class="mono mt-2 text-center text-[10px] tracking-[0.14em] text-mute">TONIGHT IS WHERE YOU LEFT IT</div>
              </>
            ) : (
              <>
                <button class="btn btn-primary mt-3 w-full py-4 text-lg" onClick={startDaily}>
                  Play tonight
                </button>
                <div class="mono mt-2 text-center text-[10px] tracking-[0.14em] text-mute">ONE ATTEMPT · TWO MINUTES</div>
              </>
            )}
          </>
        ) : (
          <>
            <div class="mt-2 flex items-baseline justify-between gap-3">
              <div class="serif text-xl font-semibold">
                {rec?.dawn ? '🌅 Dawn' : rec?.kind === 'nuclear' ? `☢️ ${rec.clock ?? ''}` : `🌑 Fell at ${rec?.clock ?? ''}`}
              </div>
              <div class="mono text-[10px] tracking-[0.14em] text-mute">{endingName.toUpperCase()}</div>
            </div>
            {cells && (
              <div class="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
                {METERS.map((k, row) => (
                  <>
                    <div key={k} class="mono text-[8px] tracking-[0.14em] text-mute">
                      {DIAL_LABEL[k]}
                    </div>
                    <div key={k + 'v'} class="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cells[row].length}, minmax(0, 1fr))` }}>
                      {cells[row].map((colour, i) => (
                        <span key={i} class="strip-cell" style={{ background: colour }} />
                      ))}
                    </div>
                  </>
                ))}
              </div>
            )}
            <div class="mono mt-3 text-[10px] tracking-[0.14em] text-mute">TOMORROW'S NIGHT IN {countdown}</div>
          </>
        )}
      </section>

      <section class="paper-dark rounded-md p-4" aria-label="Night after night">
        <div class="mono text-[10px] tracking-[0.24em] text-mute">NIGHT AFTER NIGHT</div>
        <div class="mt-2 flex items-center justify-between gap-3">
          <div>
            <div class="serif text-lg font-semibold">Any night, any seat</div>
            <div class="serif text-xs text-paper/70">Unlimited nights. Share a seed. Expert mode for the numbers.</div>
          </div>
          {endlessAvailable.value ? (
            <button class="btn btn-primary" onClick={() => startNight()}>
              Play
            </button>
          ) : (
            <button class="btn" onClick={() => goto('paywall')}>
              Unlock
            </button>
          )}
        </div>
        {endlessAvailable.value && (
          <div class="mono mt-2 flex gap-3 text-[10px] tracking-[0.14em]">
            <button class="link text-paper/80" onClick={() => goto('seat')}>
              CHOOSE A SEAT OR SEED
            </button>
            <button class="link text-paper/60" onClick={() => goto('seat')}>
              EXPERT
            </button>
          </div>
        )}
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
