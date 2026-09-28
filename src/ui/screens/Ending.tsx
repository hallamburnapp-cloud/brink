import { useEffect, useState } from 'preact/hooks';
import { BRAND } from '../../config';
import { emojiStrip, renderShareCard, share, shareText, summariseMoment, type ShareCardData } from '../../meta/share';
import { track } from '../../meta/analytics';
import { UNLOCKS } from '../../meta/unlocks';
import { content, currentEnding, endingText, goto, momentCard, replaySeed, run, runAgain, runMeta, toast } from '../store';
import { Speaker } from './Run';
import { template } from '../../engine/run';

const KIND_LABEL = { nuclear: 'NUCLEAR WAR', removed: 'REMOVED FROM OFFICE', standdown: 'STAND-DOWN', survival: 'SURVIVAL', special: 'SPECIAL' } as const;

export function Ending() {
  const s = run.value;
  const m = runMeta.value;
  const e = currentEnding.value;
  const c = content.value;
  const [png, setPng] = useState<Blob | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  if (!s || !m) return null;
  if (!e) {
    // Content without a matching ending (hot reload mid-run, or a missing fallback): never strand the player.
    return (
      <div class="flex flex-1 flex-col gap-4 rise pt-2">
        <section class="paper rounded-md p-5 text-ink">
          <div class="mono text-[11px] tracking-[0.3em] text-ink-2/70">RECORD ENDS</div>
          <h2 class="serif mt-1 text-3xl font-semibold">The file closes here.</h2>
          <p class="serif mt-3 text-[15px]">Day {Math.floor(s.day)}. The record for this run has no ending on file ({s.ending ?? 'none'}).</p>
        </section>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn btn-danger" onClick={runAgain}>
            Run again
          </button>
          <button class="btn" onClick={replaySeed}>
            Replay this seed
          </button>
        </div>
        <button class="btn" onClick={() => goto('home')}>
          Home
        </button>
      </div>
    );
  }
  const seat = c.seats[s.seat];
  const moment = momentCard();
  const data: ShareCardData = {
    brand: BRAND.name,
    url: BRAND.url,
    seatName: seat.name,
    seatAccent: seat.accent,
    days: Math.floor(s.day),
    endingName: e.name,
    endingEmoji: e.emoji,
    endingKind: e.kind,
    momentLabel: e.moment_label,
    moment: moment ? summariseMoment(moment.text) : null,
    trail: s.trail,
    seed: s.seed,
    mode: m.mode,
    dailyNumber: m.dailyNumber,
    pieces: s.pieces.map((id) => c.pieces[id]?.name).filter(Boolean) as string[],
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
  }, [s.seed, e.id]);

  const strip = emojiStrip(s.trail);
  const kindColour = e.kind === 'nuclear' ? 'text-red' : e.kind === 'standdown' ? 'text-green' : e.kind === 'survival' ? 'text-blue' : 'text-amber';
  const speaker = moment ? c.speakers[moment.advisor] ?? c.speakers.aide : null;

  const doShare = async () => {
    const r = await share(data, png ?? undefined);
    track('share', { method: r, ending: e.id });
    toast(r === 'shared' ? 'Shared.' : r === 'copied' ? 'Copied to clipboard.' : r === 'downloaded' ? 'Image saved.' : 'Sharing is not available here.', r === 'failed' ? 'warn' : 'good');
  };
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText(data));
      toast('Copied.', 'good');
      track('share', { method: 'text', ending: e.id });
    } catch {
      toast('Clipboard unavailable.', 'warn');
    }
  };

  return (
    <div class="flex flex-1 flex-col gap-4 rise pt-2">
      <div class="mono flex items-center justify-between text-[10px] tracking-[0.24em] text-mute">
        <span>{m.mode === 'daily' ? `DAILY #${m.dailyNumber}` : `SEED ${s.seed}`}</span>
        <span>{seat.name.toUpperCase()} · DAY {Math.floor(s.day)}</span>
      </div>

      <section class="paper rounded-md p-5">
        <div class={`mono text-[11px] tracking-[0.3em] ${kindColour}`}>{KIND_LABEL[e.kind]}</div>
        <h2 class="serif mt-1 text-3xl font-semibold leading-tight text-ink">
          <span class="mr-2">{e.emoji}</span>
          {e.name}
        </h2>
        <div class="serif mt-3 space-y-3 text-[15px] leading-relaxed text-ink">
          {endingText(e)
            .split(/\n\s*\n/)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
        <div class="mono mt-4 text-[10px] tracking-[0.24em] text-ink-2/70">{Math.floor(s.day)} DAYS IN OFFICE</div>
      </section>

      {moment && speaker && (
        <section class="paper-dark rounded-md p-4">
          <div class="mono text-[10px] tracking-[0.24em] text-mute">{e.moment_label.toUpperCase()}</div>
          <div class="mt-2">
            <Speaker art={speaker.art} accent={speaker.accent} name={template(c, s, speaker.name)} role={template(c, s, speaker.role)} />
          </div>
          <p class="serif mt-2 text-[14px] leading-snug text-paper/90">{moment.text}</p>
        </section>
      )}

      <section class="paper-dark rounded-md p-4">
        <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">THE RUN</div>
        <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
          {['PUBLIC', 'MILITARY', 'ALLIES', 'ECONOMY', 'ESCALATION'].map((label, i) => (
            <>
              <div key={label} class="mono text-[9px] tracking-[0.14em] text-mute">
                {label}
              </div>
              <div key={label + 'v'} class="text-[13px] leading-none tracking-[0.05em]">
                {strip[i]}
              </div>
            </>
          ))}
        </div>
        {s.pieces.length > 0 && <div class="mono mt-3 text-[10px] leading-snug tracking-wide text-mute">POSTURE · {s.pieces.map((id) => c.pieces[id]?.name).join(' · ')}</div>}
      </section>

      {m.unlockedNow.length > 0 && (
        <section class="paper-dark rounded-md border-amber/40 p-4">
          <div class="mono text-[10px] tracking-[0.24em] text-amber">UNLOCKED</div>
          <ul class="mt-1 space-y-1">
            {m.unlockedNow.map((id) => {
              const u = UNLOCKS.find((x) => x.id === id);
              return (
                <li key={id} class="serif text-sm">
                  <span class="font-semibold">{u?.label ?? id}</span>
                  {u && <span class="text-paper/70"> — {u.hint}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pngUrl && <img src={pngUrl} alt="Share card" class="w-full rounded-md border border-paper/10" />}

      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-primary" onClick={doShare}>
          Share
        </button>
        <button class="btn" onClick={copyText}>
          Copy text
        </button>
        <button class="btn btn-danger" onClick={runAgain}>
          {m.mode === 'daily' ? 'Run again (Endless)' : 'Run again'}
        </button>
        <button class="btn" onClick={replaySeed}>
          Replay this seed
        </button>
      </div>
      <button class="btn" onClick={() => goto('home')}>
        Home
      </button>
    </div>
  );
}
