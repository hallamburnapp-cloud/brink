import { useState } from 'preact/hooks';
import type { EffectKey, Effects } from '../../engine/types';
import { template } from '../../engine/run';
import { shiftClock } from '../../engine/night';
import { Card, ChoiceButtons } from '../components/Card';
import { Bars } from '../components/Bars';
import { Timer } from '../components/Timer';
import { RollOverlay } from '../components/RollOverlay';
import { abandonRun, busy, cardView, content, decide, lastApplied, leaveToHome, reply, rollOverlay, run, runMeta, settings, updateSettings } from '../store';

/**
 * The night desk: HOME, the clock, the bell; four bars; the world's last answer; the card;
 * two choices with their chips. Nothing on this screen is a number except the clock.
 */
export function Desk() {
  const s = run.value;
  const c = content.value;
  const v = cardView.value;
  const [tilt, setTilt] = useState<{ side: 'left' | 'right' | null; strength: number }>({ side: null, strength: 0 });
  const [bell, setBell] = useState(false);
  if (!s) return null;
  const m = runMeta.value;
  const clock = shiftClock(c, s);
  const label = m?.mode === 'daily' ? 'TONIGHT' : 'PRACTICE';
  const booking = s.booking ? c.bookings[s.booking]?.name ?? null : null;
  const firstNight = s.difficulty === 1;
  const r = reply.value;
  const replySpeaker = r ? template(c, s, c.speakers[r.speaker]?.role ?? '') : '';

  const header = (
    <header class="flex items-center justify-between gap-2">
      <button class="mono -ml-1 shrink-0 rounded-sm px-1 py-2 text-[11px] tracking-[0.2em] text-paper/80 hover:text-paper" onClick={leaveToHome} aria-label="Home (the night is saved where it is)">
        ← HOME
      </button>
      <div class="clock mono text-[17px] text-paper" aria-label={`The time is ${clock}`}>
        {clock}
      </div>
      <button class="mono flex shrink-0 items-center gap-2 rounded-sm px-1 py-2 text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => setBell(!bell)} aria-label="The desk bell: the rule, sound, tonight's booking" aria-expanded={bell}>
        {label}
        <span class="inline-block h-2 w-2 rounded-full bg-brass/80" />
      </button>
    </header>
  );

  if (s.phase === 'ended' || !v) {
    // The beat between the last card and the review: the bars stay, nothing is tappable.
    return (
      <div class="flex flex-1 flex-col gap-3">
        {header}
        <Bars state={s} preview={null} hiddenCosts={[]} applied={lastApplied.value} />
        {r && (
          <div class="reply-line serif min-h-[40px] text-[15px] leading-snug text-paper/90">
            <span class="mono mr-2 text-[9px] tracking-[0.16em] text-mute">{replySpeaker.toUpperCase()}</span>
            {r.text}
          </div>
        )}
        <div class="mono mt-10 text-center text-[11px] tracking-[0.3em] text-mute">…</div>
      </div>
    );
  }

  const preview: Effects | null = tilt.side ? v[tilt.side].preview : null;
  const hidden: EffectKey[] = tilt.side ? v[tilt.side].hiddenCosts : [];
  const speakerName = template(c, s, v.advisor.name);
  const speakerRole = template(c, s, v.advisor.role);
  const overlay = !!rollOverlay.value;
  const paused = busy.value || overlay || bell;
  const cardId = v.id;

  return (
    <div class="flex flex-1 flex-col gap-3">
      {header}

      {bell && (
        <div class="paper-dark rise rounded-md p-3" role="region" aria-label="The desk bell">
          <div class="serif text-sm text-paper/85">Keep the four bars off the floor until 6:00. Empty ends the night; full is good. Home keeps the night exactly where it is.</div>
          {booking && <div class="mono mt-2 text-[10px] tracking-[0.2em] text-mute">TONIGHT · {booking.toUpperCase()}</div>}
          <div class="mt-3 flex gap-2">
            <button class="btn flex-1" onClick={() => setBell(false)}>
              Back to the desk
            </button>
            <button class="btn flex-1" onClick={() => updateSettings({ muted: !settings.value.muted })}>
              {settings.value.muted ? 'Sound on' : 'Sound off'}
            </button>
            {m?.mode !== 'daily' && (
              <button
                class="btn flex-1 text-red"
                onClick={() => {
                  if (confirm('End this practice night?')) abandonRun();
                }}
              >
                Leave
              </button>
            )}
          </div>
        </div>
      )}

      <Bars state={s} preview={preview} hiddenCosts={hidden} applied={lastApplied.value} />

      <div class="min-h-[40px]" aria-live="polite">
        {r ? (
          <div key={s.cardsPlayed} class="reply-line serif text-[15px] leading-snug text-paper/90">
            <span class="mono mr-2 text-[9px] tracking-[0.16em] text-mute">{replySpeaker.toUpperCase()}</span>
            {r.text}
          </div>
        ) : firstNight && s.cardsPlayed < 2 ? (
          <div class="mono text-center text-[10px] tracking-[0.18em] text-mute">KEEP THE FOUR BARS OFF THE FLOOR UNTIL 6:00</div>
        ) : null}
      </div>

      {v.timer !== null && (
        <div>
          <Timer seconds={v.timer} resetKey={v.id} paused={paused} onExpire={() => decide('timeout', cardId)} />
        </div>
      )}

      <Card
        card={v}
        disabled={busy.value || overlay}
        onTilt={(side, strength) => setTilt({ side, strength })}
        onCommit={(side) => decide(side, cardId)}
        speakerName={speakerName}
        speakerRole={speakerRole}
        simple
        footer={clock}
        tag={booking ? booking.toUpperCase() : ''}
      />

      <ChoiceButtons card={v} disabled={busy.value || overlay} onHover={(side) => setTilt({ side, strength: side ? 1 : 0 })} onCommit={(side) => decide(side, cardId)} simple chips />

      <div class="mono text-center text-[10px] tracking-[0.16em] text-mute">← swipe, or tap →</div>

      {rollOverlay.value && <RollOverlay result={rollOverlay.value.result} slow={rollOverlay.value.slow} simple />}
    </div>
  );
}
