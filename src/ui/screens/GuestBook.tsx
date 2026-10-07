import { FEATURES } from '../../config';
import { getStats } from '../../meta/stats';
import { dailyHistory } from '../../meta/daily';
import { guestBook } from '../../meta/guestbook';
import { content, endlessAvailable, goto, startArchived } from '../store';
import { Stars } from '../components/Stars';
import { bylineText } from '../hotel';

/**
 * The Guest Book: reviews collected, by Booking, as pages. A page is blank until a night
 * earns it (the plate opens every page); the nights that ended early sit at the back;
 * then the Archive, every Tonight worked, which the plate lets you work again.
 */
export function GuestBook() {
  const c = content.value;
  const book = guestBook(c);
  const stats = getStats();
  const archive = dailyHistory(30);
  const full = endlessAvailable.value;
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono -ml-1 rounded-sm px-1 py-2 text-[11px] tracking-[0.2em] text-paper/80 hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">
          {stats.nights} {stats.nights === 1 ? 'NIGHT' : 'NIGHTS'} · {stats.dawns} TO DAWN
        </div>
      </header>
      <h2 class="serif text-2xl font-semibold">Guest Book</h2>
      <p class="serif -mt-2 text-sm text-paper/70">
        {book.seen} of {book.total} reviews written. {full ? 'The plate opens every page.' : 'A page stays blank until a night earns it.'}
      </p>

      {book.sections.map(({ booking, pages, seen }) => (
        <section key={booking.id} aria-label={booking.name}>
          <div class="mono mb-2 flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
            <span>{booking.name.toUpperCase()}</span>
            <span>
              {seen}/{pages.length}
            </span>
          </div>
          <ul class="space-y-1.5">
            {pages.map((p) =>
              p.seen > 0 || full ? (
                <li key={p.id} class={`paper-dark rounded-md px-3 py-2 ${p.seen === 0 ? 'opacity-70' : ''}`}>
                  <div class="flex items-center justify-between gap-2">
                    <div class="serif text-[15px] font-semibold">{p.ending.name}</div>
                    <Stars n={p.ending.stars ?? 1} class="text-sm" />
                  </div>
                  {p.seen > 0 && p.ending.quote ? (
                    <div class="serif text-[13px] italic text-paper/80">
                      “{p.ending.quote}”
                      {p.ending.byline ? <span class="mono not-italic text-[9px] tracking-[0.14em] text-mute"> — {bylineText(c, p.ending.byline)?.toUpperCase()}</span> : null}
                    </div>
                  ) : (
                    <div class="serif text-[12px] text-paper/60">Not yet written in your hand.</div>
                  )}
                  {p.seen > 1 && <div class="mono mt-1 text-[9px] tracking-[0.14em] text-mute">×{p.seen}</div>}
                </li>
              ) : (
                <li key={p.id} class="blank-page rounded-md px-3 py-3" aria-label="A blank page">
                  <div class="h-2 w-2/3 rounded-full bg-paper/10" />
                  <div class="mt-1.5 h-2 w-1/2 rounded-full bg-paper/10" />
                </li>
              ),
            )}
          </ul>
        </section>
      ))}

      {book.falls.some((p) => p.seen > 0 || full) && (
        <section aria-label="The nights that ended early">
          <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">THE NIGHTS THAT ENDED EARLY</div>
          <ul class="space-y-1.5">
            {book.falls
              .filter((p) => p.seen > 0 || full)
              .map((p) => (
                <li key={p.id} class={`paper-dark rounded-md px-3 py-2 ${p.seen === 0 ? 'opacity-70' : ''}`}>
                  <div class="flex items-center justify-between gap-2">
                    <div class="serif text-[15px] font-semibold">{p.ending.name}</div>
                    {p.seen > 0 && <div class="mono text-[10px] text-mute">×{p.seen}</div>}
                  </div>
                  <div class="serif text-[12px] text-paper/70">{p.ending.compendium}</div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {archive.length > 0 && (
        <section aria-label="The archive">
          <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">THE ARCHIVE · EVERY TONIGHT YOU WORKED</div>
          <ul class="space-y-1.5">
            {archive.map((r) => (
              <li key={r.dateKey} class="paper-dark flex items-center justify-between gap-3 rounded-md px-3 py-2">
                <div class="min-w-0">
                  <div class="mono text-[10px] tracking-[0.14em] text-mute">
                    #{r.number}
                    {r.booking && c.bookings[r.booking] ? ` · ${c.bookings[r.booking].name.toUpperCase()}` : ''}
                  </div>
                  <div class="flex items-center gap-2">
                    <Stars n={r.stars ?? (r.dawn ? 3 : 1)} class="text-sm" />
                    <span class="serif truncate text-[14px]">{r.name ?? ''}</span>
                  </div>
                </div>
                {full && (
                  <button class="btn shrink-0 py-2 text-sm" onClick={() => startArchived(r)}>
                    Work it again
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!full && FEATURES.paywall && (
            <button class="btn mt-2 w-full" onClick={() => goto('paywall')}>
              Work any past Tonight again · {FEATURES.priceLabel}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
