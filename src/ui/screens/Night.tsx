import { useState } from 'preact/hooks';
import type { EffectKey, Effects } from '../../engine/types';
import { template } from '../../engine/run';
import { Card, ChoiceButtons } from '../components/Card';
import { Dials } from '../components/Dials';
import { Timer } from '../components/Timer';
import { RollOverlay } from '../components/RollOverlay';
import { IntroSimple } from '../components/Intro';
import { abandonRun, busy, cardView, content, decide, lastApplied, rollOverlay, run, runMeta, settings } from '../store';
import { nightClock } from '../../engine/night';

/** The simple ruleset's run screen: the clock, five dials, the card, two choices. Nothing else. */
export function Night() {
  const s = run.value;
  const c = content.value;
  const v = cardView.value;
  const [tilt, setTilt] = useState<{ side: 'left' | 'right' | null; strength: number }>({ side: null, strength: 0 });
  const [menu, setMenu] = useState(false);
  if (!s) return null;
  if (s.phase === 'ended' || !v) {
    return (
      <div class="flex flex-1 flex-col items-center justify-center gap-3">
        <div class="mono text-mute">…</div>
        <button class="btn" onClick={abandonRun}>
          Leave the night
        </button>
      </div>
    );
  }

  const preview: Effects | null = tilt.side ? v[tilt.side].preview : null;
  const hidden: EffectKey[] = tilt.side ? v[tilt.side].hiddenCosts : [];
  const speakerName = template(c, s, v.advisor.name);
  const speakerRole = template(c, s, v.advisor.role);
  const overlay = !!rollOverlay.value;
  const paused = busy.value || overlay || menu || !settings.value.seenIntro;
  const clock = nightClock(s);
  const cardId = v.id;
  const m = runMeta.value;

  return (
    <div class="flex flex-1 flex-col gap-3">
      <header class="flex items-center justify-between">
        <button class="mono flex items-center gap-2 text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => setMenu(!menu)} aria-label="Menu">
          <span class="inline-block h-2 w-2 rounded-full bg-paper/50" />
          {m?.mode === 'daily' ? 'TONIGHT' : 'THE NIGHT'}
        </button>
        <div class={`clock mono text-[15px] ${s.flashpoint ? 'text-red' : 'text-paper/90'}`} aria-label={`The time is ${clock}`}>
          {clock}
          <span class="text-[10px] text-mute"> AM</span>
        </div>
      </header>

      {menu && (
        <div class="paper-dark rise rounded-md p-3">
          <div class="serif text-sm text-paper/80">Keep the five dials off the edges until 6:00. Danger full ends everything.</div>
          <div class="mt-3 flex gap-2">
            <button class="btn flex-1" onClick={() => setMenu(false)}>
              Back to the phone
            </button>
            <button
              class="btn flex-1 text-red"
              onClick={() => {
                if (confirm('Leave tonight unfinished? It counts as played.')) abandonRun();
              }}
            >
              Leave the night
            </button>
          </div>
        </div>
      )}

      <Dials state={s} preview={preview} hiddenCosts={hidden} applied={lastApplied.value} />

      <div class="mt-1">
        <Timer seconds={v.timer} resetKey={v.id} paused={paused} onExpire={() => decide('timeout', cardId)} />
      </div>

      <Card
        card={v}
        disabled={busy.value || overlay}
        onTilt={(side, strength) => setTilt({ side, strength })}
        onCommit={(side) => decide(side, cardId)}
        speakerName={speakerName}
        speakerRole={speakerRole}
        simple
        footer={`${clock} AM`}
      />

      <ChoiceButtons card={v} disabled={busy.value || overlay} onHover={(side) => setTilt({ side, strength: side ? 1 : 0 })} onCommit={(side) => decide(side, cardId)} simple />

      <div class="mono text-center text-[10px] tracking-[0.16em] text-mute">← swipe →</div>

      {rollOverlay.value && <RollOverlay result={rollOverlay.value.result} slow={rollOverlay.value.slow} />}
      <IntroSimple />
    </div>
  );
}
