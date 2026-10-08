import { useEffect, useState } from 'preact/hooks';
import { BRAND, FEATURES, VERSION } from '../../config';
import type { EndingKind } from '../../engine/types';
import { bookingForSeed } from '../../engine/run';
import { dailyNumber, dailyPlayed, dailySeed, dailyStreak, msUntilNextDaily, type DailyRecord } from '../../meta/daily';
import { hasEndless } from '../../meta/unlock';
import { guestBook } from '../../meta/guestbook';
import { hotelStripCells, shareText, type ShareCardData } from '../../meta/share';
import { track } from '../../meta/analytics';
import { content, endlessAvailable, goto, hasSavedRun, hotelSeat, isFirstNight, resumeRun, run, savedRunMode, savedRunSummary, startArchived, startBooking, startShift, toast, todaysReview } from '../store';
import { Mark } from '../components/Mark';
import { Stars } from '../components/Stars';
import { bylineText, fmtCountdown, tomorrowBooking } from '../hotel';

/**
 * Home, three states. The first open: the mark, one line, CLOCK IN. After that: TONIGHT
 * (answer it, pick it back up, or today's review with SHARE), PRACTICE NIGHT, the plate,
 * the Guest Book. Nothing else above the fold.
 */
export function HotelHome() {
  const c = content.value;
  const seatId = hotelSeat();
  const played = dailyPlayed();
  const rec = played ? todaysReview() : null;
  const [countdown, setCountdown] = useState(fmtCountdown(msUntilNextDaily()));
  const [pick, setPick] = useState(false);
  const [seed, setSeed] = useState('');
  useEffect(() => {
    const id = setInterval(() => setCountdown(fmtCountdown(msUntilNextDaily())), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (FEATURES.paywall && !FEATURES.allUnlocked) hasEndless().then((ok) => (endlessAvailable.value = ok));
  }, []);
  const first = isFirstNight() && !played;
  const tonight = bookingForSeed(c, dailySeed(), seatId, 5);
  const tomorrow = tomorrowBooking(c, seatId);
  const streak = dailyStreak();
  const saved = savedRunSummary();
  const savedDaily = hasSavedRun.value && savedRunMode.value === 'daily';
  const savedPractice = hasSavedRun.value && !savedDaily;
  const book = guestBook(c);

  const footer = (
    <footer class="mono mt-auto flex items-center justify-between pt-4 text-[10px] tracking-[0.14em] text-mute">
      <span>{BRAND.copyright}</span>
      <span class="flex gap-3">
        <button class="link" onClick={() => goto('privacy')}>
          PRIVACY
        </button>
        <span>v{VERSION}</span>
      </span>
    </footer>
  );

  if (first) {
    return (
      <div class="flex flex-1 flex-col gap-6 pt-10">
        <header class="flex flex-col items-center gap-4 pt-6 text-center">
          <Mark size={72} />
          <h1 class="serif text-5xl font-semibold tracking-[0.18em]">{BRAND.name}</h1>
          <p class="serif max-w-[300px] text-[17px] leading-snug text-paper/80">It's 3am at The Brink. The phone is ringing.</p>
        </header>
        <button class="btn btn-primary mt-4 w-full py-5 text-xl" onClick={() => startShift('practice')}>
          Clock in
        </button>
        <div class="mono -mt-3 text-center text-[10px] tracking-[0.18em] text-mute">YOUR FIRST NIGHT IS A QUIET ONE · ABOUT TWO MINUTES</div>
        <nav class="mt-auto grid grid-cols-2 gap-2">
          <button class="btn" onClick={() => goto('settings')}>
            Settings
          </button>
          <button class="btn" onClick={() => goto('about')}>
            About
          </button>
        </nav>
        {footer}
      </div>
    );
  }

  return (
    <div class="flex flex-1 flex-col gap-5 pt-6">
      <header class="flex flex-col items-center gap-3 pt-2 text-center">
        <Mark size={56} />
        <h1 class="serif text-4xl font-semibold tracking-[0.18em]">{BRAND.name}</h1>
        <p class="serif text-[14px] text-paper/70">The night desk at The Brink Hotel.</p>
      </header>

      <section class="paper-dark rounded-md p-4" aria-label="Tonight">
        <div class="mono flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
          <span>TONIGHT · #{dailyNumber()}</span>
          <span>{streak > 1 ? `${streak} NIGHTS IN A ROW` : 'SAME NIGHT FOR EVERYONE'}</span>
        </div>
        {!played ? (
          <>
            <div class="serif mt-2 text-xl font-semibold text-brass">{tonight?.name ?? 'The night'}</div>
            {tonight && <div class="serif text-sm text-paper/75">{tonight.teaser}</div>}
            {savedDaily ? (
              <>
                <button class="btn btn-primary mt-3 w-full py-4 text-lg" onClick={() => resumeRun()}>
                  Pick the phone back up{saved.clock ? ` · ${saved.clock}` : ''}
                </button>
                <div class="mono mt-2 text-center text-[10px] tracking-[0.14em] text-mute">TONIGHT IS WHERE YOU LEFT IT</div>
              </>
            ) : (
              <>
                <button class="btn btn-primary mt-3 w-full py-4 text-lg" onClick={() => startShift('tonight')}>
                  Answer it
                </button>
                <div class="mono mt-2 text-center text-[10px] tracking-[0.14em] text-mute">ONE ATTEMPT · ABOUT TWO MINUTES</div>
              </>
            )}
          </>
        ) : (
          <>
            {rec && <TodaysReview rec={rec} />}
            <div class="mt-3 border-t border-paper/10 pt-3">
              <div class="mono text-[10px] tracking-[0.14em] text-mute">TOMORROW'S NIGHT IN {countdown}</div>
              {tomorrow && (
                <div class="serif mt-1 text-sm text-paper/80">
                  Tomorrow: <span class="font-semibold text-brass">{tomorrow.name}</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section class="paper-dark rounded-md p-4" aria-label="Practice night">
        <div class="mono text-[10px] tracking-[0.24em] text-mute">PRACTICE NIGHT</div>
        <div class="mt-2 flex items-center justify-between gap-3">
          <div>
            <div class="serif text-lg font-semibold">Any night from the book</div>
            <div class="serif text-xs text-paper/70">Not recorded. Nobody reads these reviews but you.</div>
          </div>
          {savedPractice ? (
            <button class="btn btn-primary shrink-0" onClick={() => resumeRun()}>
              Pick it back up
            </button>
          ) : (
            <button class="btn btn-primary shrink-0" onClick={() => startShift('practice')}>
              Work one
            </button>
          )}
        </div>
        {savedPractice && saved.booking && <div class="mono mt-2 text-[10px] tracking-[0.14em] text-mute">{saved.booking.toUpperCase()}{saved.clock ? ` · ${saved.clock}` : ''}</div>}
        {endlessAvailable.value ? (
          <>
            <button class="link mono mt-3 text-[10px] tracking-[0.14em] text-paper/80" onClick={() => setPick(!pick)} aria-expanded={pick}>
              CHOOSE THE NIGHT
            </button>
            {pick && (
              <div class="mt-2">
                <input
                  class="mono w-full rounded-sm border border-paper/20 bg-transparent px-3 py-2 text-sm text-paper placeholder:text-mute/60"
                  placeholder="a seed to send along (optional)"
                  value={seed}
                  onInput={(e) => setSeed((e.target as HTMLInputElement).value)}
                  aria-label="Seed"
                />
                <div class="mt-2 grid grid-cols-2 gap-1.5">
                  {c.bookingOrder.map((id) => (
                    <button key={id} class="btn py-2 text-sm" onClick={() => startBooking(id, seed.trim() || undefined)}>
                      {c.bookings[id].name}
                    </button>
                  ))}
                </div>
                <div class="mono mt-2 text-[10px] tracking-[0.14em] text-mute">THE SAME SEED AND BOOKING GIVE THE SAME NIGHT TO ANYONE WITH THE PLATE</div>
              </div>
            )}
          </>
        ) : FEATURES.paywall ? (
          <div class="mt-3 flex items-center justify-between gap-3 border-t border-paper/10 pt-3">
            <div>
              <div class="mono text-[10px] tracking-[0.24em] text-brass">THE BRASS PLATE</div>
              <div class="serif text-xs text-paper/70">Choose the night. The Guest Book in full. Every past Tonight. A badge on your reviews.</div>
            </div>
            <button class="btn shrink-0" onClick={() => goto('paywall')}>
              Unlock · {FEATURES.priceLabel}
            </button>
          </div>
        ) : null}
      </section>

      <nav class="grid grid-cols-2 gap-2">
        <button class="btn col-span-2 flex items-center justify-between" onClick={() => goto('compendium')}>
          <span>Guest Book</span>
          <span class="mono text-[10px] tracking-[0.2em] text-mute">
            {book.seen}/{book.total} REVIEWS
          </span>
        </button>
        <button class="btn" onClick={() => goto('settings')}>
          Settings
        </button>
        <button class="btn" onClick={() => goto('about')}>
          About
        </button>
      </nav>

      {footer}
    </div>
  );
}

/** Today's review from the record: stars, the headline, the quote, one row, SHARE. */
function TodaysReview({ rec }: { rec: DailyRecord }) {
  const c = content.value;
  const cells = rec.trail ? hotelStripCells(rec.trail, 12) : null;
  const booking = rec.booking ? c.bookings[rec.booking]?.name : undefined;
  const byline = bylineText(c, rec.byline);
  const stars = rec.stars ?? (rec.dawn ? 3 : 1);
  const seat = c.seats[rec.seat];
  const data: ShareCardData = {
    brand: BRAND.name,
    url: BRAND.url,
    seatName: seat?.name ?? '',
    seatAccent: seat?.accent ?? '#c9a24a',
    days: rec.days,
    endingName: rec.name ?? '',
    endingEmoji: '',
    endingKind: rec.kind as EndingKind,
    momentLabel: '',
    moment: null,
    trail: rec.trail ?? [],
    seed: rec.seed,
    mode: 'daily',
    dailyNumber: rec.number,
    streak: dailyStreak(),
    clock: rec.clock,
    dawn: rec.dawn,
    stars,
    bookingName: booking,
    quote: rec.quote,
    byline,
    badge: endlessAvailable.value,
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(data));
      toast('Copied. Paste it anywhere.', 'good');
      track('share', { method: 'text', ending: rec.ending });
    } catch {
      toast('Clipboard unavailable.', 'warn');
    }
  };
  const reopen = !!run.value && run.value.seed === rec.seed && run.value.phase === 'ended';
  return (
    <>
      <div class="mt-2 flex items-center justify-between gap-3">
        <Stars n={stars} class="text-xl" />
        <span class="mono text-[10px] tracking-[0.14em] text-mute">
          {booking?.toUpperCase() ?? ''}
          {rec.dawn ? '' : ` · FELL AT ${rec.clock ?? ''}`}
        </span>
      </div>
      <div class="serif mt-1 text-lg font-semibold">{rec.name}</div>
      {rec.quote && (
        <div class="serif text-sm italic text-paper/80">
          “{rec.quote}”{byline ? <span class="mono not-italic text-[10px] tracking-[0.14em] text-mute"> — {byline.toUpperCase()}</span> : null}
        </div>
      )}
      {cells && (
        <div class="mt-3 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
          {cells.map((colour, i) => (
            <span key={i} class="strip-cell" style={{ background: colour }} />
          ))}
        </div>
      )}
      <div class="mt-3 grid grid-cols-2 gap-2">
        <button class="btn btn-primary" onClick={copy}>
          Share
        </button>
        {reopen ? (
          <button class="btn" onClick={() => goto('ending')}>
            Read it again
          </button>
        ) : (
          <button class="btn" onClick={() => startArchived(rec)}>
            Work it again
          </button>
        )}
      </div>
    </>
  );
}
