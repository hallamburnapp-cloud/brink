import { useEffect, useState } from 'preact/hooks';
import { BRAND } from '../../config';
import { renderShareCard, share, shareText, stripCells, summariseMoment, type ShareCardData } from '../../meta/share';
import { track } from '../../meta/analytics';
import { dailyStreak, msUntilNextDaily } from '../../meta/daily';
import { content, currentEnding, endingText, endlessAvailable, goto, momentCard, run, runAgain, runMeta, toast } from '../store';
import { Speaker } from './Run';
import { template } from '../../engine/run';
import { DIAL_LABEL, isDawn, nightClock, resultEmoji, resultLine } from '../../engine/night';
import { METERS } from '../../engine/types';

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** The simple ruleset's ending: the time, the ending, the strip, and one button that matters. */
export function Dawn() {
  const s = run.value;
  const m = runMeta.value;
  const e = currentEnding.value;
  const c = content.value;
  const [png, setPng] = useState<Blob | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(fmt(msUntilNextDaily()));
  useEffect(() => {
    const id = setInterval(() => setCountdown(fmt(msUntilNextDaily())), 30000);
    return () => clearInterval(id);
  }, []);
  if (!s || !m) return null;
  const kind = e?.kind ?? 'special';
  const dawn = isDawn(kind);
  const seat = c.seats[s.seat];
  const moment = momentCard();
  const clock = nightClock(s, kind);
  const streak = dailyStreak();
  const data: ShareCardData = {
    brand: BRAND.name,
    url: BRAND.url,
    seatName: seat.name,
    seatAccent: seat.accent,
    days: Math.floor(s.day),
    endingName: e?.name ?? 'The night ends',
    endingEmoji: e?.emoji ?? '🌑',
    endingKind: kind,
    momentLabel: e?.moment_label ?? 'The moment',
    moment: moment ? summariseMoment(moment.text) : null,
    trail: s.trail,
    seed: s.seed,
    mode: m.mode,
    dailyNumber: m.dailyNumber,
    streak: m.mode === 'daily' ? streak : undefined,
    pieces: [],
    clock,
    dawn,
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

  const cells = stripCells(s.trail, 12);
  const speaker = moment ? c.speakers[moment.advisor] ?? c.speakers.aide : null;

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

  return (
    <div class="flex flex-1 flex-col gap-4 rise pt-2">
      <div class="mono flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
        <span>{m.mode === 'daily' ? `${BRAND.name} #${m.dailyNumber}` : `SEED ${s.seed}`}</span>
        <span>{seat.name.toUpperCase()}</span>
      </div>

      <section class={`rounded-md p-5 ${dawn ? 'paper' : 'paper-dark'}`}>
        <div class={`mono text-[11px] tracking-[0.3em] ${dawn ? 'text-ink-2/70' : kind === 'nuclear' ? 'text-red' : 'text-amber'}`}>{resultEmoji(kind)} {resultLine(s, kind)}</div>
        <h2 class={`serif mt-1 text-3xl font-semibold leading-tight ${dawn ? 'text-ink' : 'text-paper'}`}>
          <span class="mr-2">{e?.emoji ?? ''}</span>
          {e?.name ?? 'The night ends'}
        </h2>
        <div class={`serif mt-3 space-y-3 text-[16px] leading-relaxed ${dawn ? 'text-ink' : 'text-paper/90'}`}>
          {(e ? endingText(e) : 'The record for this night has no ending on file.')
            .split(/\n\s*\n/)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      </section>

      <section class="paper-dark rounded-md p-4" aria-label="The night, dial by dial">
        <div class="mono mb-2 flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
          <span>3:00</span>
          <span>{dawn ? 'DAWN' : `FELL AT ${clock}`}</span>
          <span>6:00</span>
        </div>
        <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
          {METERS.map((k, row) => (
            <>
              <div key={k} class="mono text-[9px] tracking-[0.14em] text-mute">
                {DIAL_LABEL[k]}
              </div>
              <div key={k + 'v'} class="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cells[row].length}, minmax(0, 1fr))` }}>
                {cells[row].map((colour, i) => (
                  <span key={i} class="strip-cell" style={{ background: colour }} />
                ))}
              </div>
            </>
          ))}
        </div>
      </section>

      {moment && speaker && (
        <section class="paper-dark rounded-md p-4">
          <div class="mono text-[10px] tracking-[0.24em] text-mute">{(e?.moment_label ?? 'The moment').toUpperCase()}</div>
          <div class="mt-2">
            <Speaker art={speaker.art} accent={speaker.accent} name={template(c, s, speaker.role)} role={template(c, s, speaker.name)} />
          </div>
          <p class="serif mt-2 text-[14px] leading-snug text-paper/90">{moment.text}</p>
        </section>
      )}

      {pngUrl && <img src={pngUrl} alt="Share card" class="w-full rounded-md border border-paper/10" />}

      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-primary" onClick={copyResult}>
          Copy result
        </button>
        <button class="btn" onClick={doShare}>
          Share image
        </button>
      </div>

      {m.mode === 'daily' ? (
        <section class="paper-dark rounded-md p-4">
          <div class="mono text-[10px] tracking-[0.24em] text-mute">TOMORROW'S NIGHT IN {countdown}</div>
          {streak > 1 && <div class="serif mt-1 text-sm text-paper/80">{streak} nights in a row.</div>}
          {endlessAvailable.value ? (
            <button class="btn mt-3 w-full" onClick={runAgain}>
              Another night now
            </button>
          ) : (
            <button class="btn mt-3 w-full" onClick={() => goto('paywall')}>
              Night after night · unlock
            </button>
          )}
        </section>
      ) : (
        <button class="btn btn-danger" onClick={runAgain}>
          Another night
        </button>
      )}
      <button class="btn" onClick={() => goto('home')}>
        Home
      </button>
    </div>
  );
}
