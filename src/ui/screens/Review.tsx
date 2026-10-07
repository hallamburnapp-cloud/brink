import { useEffect, useState } from 'preact/hooks';
import { BRAND, FEATURES } from '../../config';
import { hotelStripCells, renderShareCard, share, shareText, summariseMoment, type ShareCardData } from '../../meta/share';
import { track } from '../../meta/analytics';
import { dailyPlayed, dailyStreak, msUntilNextDaily } from '../../meta/daily';
import { template } from '../../engine/run';
import { FALL_STAMP, fallenBar, shiftClock, starsFor } from '../../engine/night';
import { content, currentEnding, endingText, endlessAvailable, goto, momentCard, run, runMeta, startShift, toast } from '../store';
import { Speaker } from './Run';
import { Stars } from '../components/Stars';
import { Bars } from '../components/Bars';
import { bylineText, fmtCountdown, tomorrowBooking } from '../hotel';

/**
 * The Review: what a guest wrote at 6:00, or the stamp on a night that ended early.
 * HOME left, SHARE right; stars, byline, headline, the quote, the paragraphs, the moment,
 * one row for the night and where the bars stood; then tomorrow, again, and the plate.
 */
export function Review() {
  const s = run.value;
  const m = runMeta.value;
  const e = currentEnding.value;
  const c = content.value;
  const [png, setPng] = useState<Blob | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(fmtCountdown(msUntilNextDaily()));
  useEffect(() => {
    const id = setInterval(() => setCountdown(fmtCountdown(msUntilNextDaily())), 30000);
    return () => clearInterval(id);
  }, []);
  if (!s || !m) return null;
  const seat = c.seats[s.seat];
  const booking = s.booking ? c.bookings[s.booking] ?? null : null;
  const fell = fallenBar(s);
  const dawn = fell === null;
  const stars = starsFor(s);
  const clock = shiftClock(c, s);
  const moment = momentCard();
  const streak = dailyStreak();
  const byline = bylineText(c, e?.byline);
  const quote = e?.quote;
  const daily = m.mode === 'daily';
  const firstNight = s.difficulty === 1;
  const tomorrow = tomorrowBooking(c, s.seat);
  const data: ShareCardData = {
    brand: BRAND.name,
    url: BRAND.url,
    seatName: seat.name,
    seatAccent: seat.accent,
    days: Math.floor(s.day),
    endingName: e?.name ?? 'The night ends',
    endingEmoji: e?.emoji ?? '',
    endingKind: e?.kind ?? 'special',
    momentLabel: e?.moment_label ?? 'The moment',
    moment: moment ? summariseMoment(moment.text) : null,
    trail: s.trail,
    seed: s.seed,
    mode: m.mode,
    dailyNumber: m.dailyNumber,
    streak: daily ? streak : undefined,
    pieces: [],
    clock,
    dawn,
    stars,
    bookingName: booking?.name,
    quote,
    byline,
    badge: endlessAvailable.value,
  };
  useEffect(() => {
    let url: string | null = null;
    renderShareCard(data)
      .then((b) => {
        setPng(b);
        url = URL.createObjectURL(b);
        setPngUrl(url);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [s.seed, e?.id]);

  const cells = hotelStripCells(s.trail, 12);
  const speaker = moment ? c.speakers[moment.advisor] ?? Object.values(c.speakers)[0] : null;

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(shareText(data));
      toast('Copied. Paste it anywhere.', 'good');
      track('share', { method: 'text', ending: e?.id ?? '' });
    } catch {
      toast('Clipboard unavailable.', 'warn');
    }
  };
  const doShare = async () => {
    const r = await share(data, png ?? undefined);
    track('share', { method: r, ending: e?.id ?? '' });
    toast(r === 'shared' ? 'Shared.' : r === 'copied' ? 'Copied to clipboard.' : r === 'downloaded' ? 'Image saved.' : 'Sharing is not available here.', r === 'failed' ? 'warn' : 'good');
  };
  const plate = FEATURES.paywall && !endlessAvailable.value && dawn && stars >= 4 && !firstNight;
  const tonightOpen = firstNight && !dailyPlayed();

  return (
    <div class="flex flex-1 flex-col gap-4 rise pt-2">
      <header class="flex items-center justify-between gap-2">
        <button class="mono -ml-1 shrink-0 rounded-sm px-1 py-2 text-[11px] tracking-[0.2em] text-paper/80 hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <span class="mono truncate text-[10px] tracking-[0.2em] text-mute">
          {daily ? `${BRAND.name} #${m.dailyNumber}` : firstNight ? 'YOUR FIRST NIGHT' : 'PRACTICE'}
          {booking ? ` · ${booking.name.toUpperCase()}` : ''}
        </span>
        <button class="mono -mr-1 shrink-0 rounded-sm px-1 py-2 text-[11px] tracking-[0.2em] text-brass hover:text-paper" onClick={doShare}>
          SHARE
        </button>
      </header>

      <section class={`rounded-md p-5 ${dawn ? 'paper' : 'paper-dark'}`} aria-label="The review">
        <div class="flex items-center justify-between gap-3">
          <Stars n={stars} onPaper={dawn} class="text-2xl" />
          <span class={`mono text-[10px] tracking-[0.2em] ${dawn ? 'text-ink-2/70' : 'text-mute'}`}>{dawn ? '6:00 · DAWN' : clock}</span>
        </div>
        {fell && (
          <div class="mono mt-3 inline-block rounded-sm border-2 border-red px-2 py-1 text-[11px] tracking-[0.24em] text-red" style={{ transform: 'rotate(-3deg)' }}>
            {FALL_STAMP[fell]} · {clock}
          </div>
        )}
        <h2 class={`serif mt-2 text-3xl font-semibold leading-tight ${dawn ? 'text-ink' : 'text-paper'}`}>
          {e?.emoji ? <span class="mr-2">{e.emoji}</span> : null}
          {e?.name ?? 'The night ends'}
        </h2>
        {quote && (
          <blockquote class={`serif mt-3 text-[17px] italic leading-snug ${dawn ? 'text-ink' : 'text-paper/90'}`}>
            “{quote}”
            {byline && <footer class={`mono mt-1 text-[10px] not-italic tracking-[0.2em] ${dawn ? 'text-ink-2/70' : 'text-mute'}`}>— {byline.toUpperCase()}</footer>}
          </blockquote>
        )}
        <div class={`serif mt-3 space-y-3 text-[15px] leading-relaxed ${dawn ? 'text-ink' : 'text-paper/90'}`}>
          {(e ? endingText(e) : 'The record for this night has no review on file.')
            .split(/\n\s*\n/)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      </section>

      {moment && speaker && (
        <section class="paper-dark rounded-md p-4" aria-label="The moment">
          <div class="mono text-[10px] tracking-[0.24em] text-mute">{(e?.moment_label ?? 'The moment').toUpperCase()}</div>
          <div class="mt-2">
            <Speaker art={speaker.art} accent={speaker.accent} name={template(c, s, speaker.role)} role="" />
          </div>
          <p class="serif mt-2 text-[14px] leading-snug text-paper/90">{moment.text}</p>
        </section>
      )}

      <section class="paper-dark rounded-md p-4" aria-label="The night">
        <div class="mono mb-2 flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
          <span>3:00</span>
          <span>{dawn ? 'DAWN' : `FELL AT ${clock}`}</span>
          <span>6:00</span>
        </div>
        <div class="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
          {cells.map((colour, i) => (
            <span key={i} class="strip-cell" style={{ background: colour }} />
          ))}
        </div>
        <div class="mt-4">
          <Bars state={s} preview={null} hiddenCosts={[]} applied={{}} />
        </div>
      </section>

      {pngUrl && <img src={pngUrl} alt="Share card" class="w-full rounded-md border border-paper/10" />}

      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-primary" onClick={copyResult}>
          Copy result
        </button>
        <button class="btn" onClick={doShare}>
          Share image
        </button>
      </div>

      {plate && (
        <section class="paper-dark rounded-md border border-brass/40 p-4" aria-label="The brass plate">
          <div class="mono text-[10px] tracking-[0.24em] text-brass">THE BRASS PLATE</div>
          <div class="serif mt-1 text-sm text-paper/85">A night like that deserves a plate on the desk. Choose the night you work, read the Guest Book in full, work any past Tonight again, and wear the badge on your reviews.</div>
          <button class="btn mt-3 w-full" onClick={() => goto('paywall')}>
            Unlock for {FEATURES.priceLabel}
          </button>
        </section>
      )}

      {tonightOpen && (
        <button class="btn btn-primary py-4 text-lg" onClick={() => startShift('tonight')}>
          Now the real one · tonight
        </button>
      )}

      {daily ? (
        <section class="paper-dark rounded-md p-4" aria-label="Tomorrow">
          <div class="mono text-[10px] tracking-[0.24em] text-mute">TOMORROW'S NIGHT IN {countdown}</div>
          {tomorrow && <div class="serif mt-1 text-lg font-semibold text-brass">Tomorrow: {tomorrow.name}</div>}
          {tomorrow && <div class="serif text-sm text-paper/75">{tomorrow.teaser}</div>}
          {streak > 1 && <div class="mono mt-2 text-[10px] tracking-[0.14em] text-mute">{streak} NIGHTS IN A ROW</div>}
          <button class="btn mt-3 w-full" onClick={() => startShift('again')}>
            Work tonight again · practice
          </button>
        </section>
      ) : (
        <div class="grid grid-cols-2 gap-2">
          <button class="btn btn-danger" onClick={() => startShift('again')}>
            Again · same night
          </button>
          <button class="btn" onClick={() => startShift('practice')}>
            Another night
          </button>
        </div>
      )}
      <button class="btn" onClick={() => goto('home')}>
        Home
      </button>
    </div>
  );
}
