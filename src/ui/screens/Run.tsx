import { useState } from 'preact/hooks';
import type { EffectKey, Effects } from '../../engine/types';
import { template } from '../../engine/run';
import { Card, ChoiceButtons } from '../components/Card';
import { HiddenReadout, Meters } from '../components/Meters';
import { Timer } from '../components/Timer';
import { RollOverlay } from '../components/RollOverlay';
import { Intro } from '../components/Intro';
import { Offer } from './Offer';
import { abandonRun, bury, busy, cardView, content, decide, lastApplied, rollOverlay, run, runMeta, settings, toast } from '../store';
import { Portrait } from '../art/Portrait';

export function Run() {
  const s = run.value;
  const c = content.value;
  const v = cardView.value;
  const [tilt, setTilt] = useState<{ side: 'left' | 'right' | null; strength: number }>({ side: null, strength: 0 });
  const [menu, setMenu] = useState(false);
  if (!s) return null;
  const seat = c.seats[s.seat];
  const rival = c.seats[seat.rivals[0]];
  const other = c.seats[seat.rivals[1]];

  if (s.phase === 'offer') return <Offer />;
  if (s.phase === 'ended' || !v) return <div class="mono p-6 text-center text-mute">…</div>;

  const preview: Effects | null = tilt.side ? v[tilt.side].preview : null;
  const hidden: EffectKey[] = tilt.side ? v[tilt.side].hiddenCosts : [];
  const speakerName = template(c, s, v.advisor.name);
  const speakerRole = template(c, s, v.advisor.role);
  const paused = busy.value || !!rollOverlay.value || menu || !settings.value.seenIntro;

  return (
    <div class="flex flex-1 flex-col gap-3">
      <header class="flex items-center justify-between">
        <button class="mono flex items-center gap-2 text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => setMenu(!menu)} aria-label="Menu">
          <span class="inline-block h-2 w-2 rounded-full" style={{ background: seat.accent }} />
          {seat.name.toUpperCase()} · {v.actName.toUpperCase()}
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">
          {runMeta.value?.mode === 'daily' ? `DAILY #${runMeta.value.dailyNumber}` : `SEED ${s.seed}`}
        </div>
      </header>

      {menu && (
        <div class="paper-dark rise rounded-md p-3">
          <div class="mono mb-2 text-[10px] tracking-[0.2em] text-mute">POSTURE</div>
          {s.pieces.length === 0 ? (
            <div class="serif text-sm text-paper/70">No posture yet. The first offer comes after the first flashpoint.</div>
          ) : (
            <ul class="flex flex-wrap gap-1.5">
              {s.pieces.map((id) => {
                const p = c.pieces[id];
                return (
                  <li key={id} class="mono rounded-sm border px-2 py-1 text-[10px] tracking-wide" style={{ borderColor: p.accent, color: p.accent }} title={p.mechanics}>
                    {p.name}
                  </li>
                );
              })}
            </ul>
          )}
          <div class="mt-3 flex gap-2">
            <button class="btn flex-1" onClick={() => setMenu(false)}>
              Back to the desk
            </button>
            <button
              class="btn flex-1 text-red"
              onClick={() => {
                if (confirm('Abandon this run? The world will have to manage without you.')) abandonRun();
              }}
            >
              Abandon run
            </button>
          </div>
        </div>
      )}

      <Meters state={s} preview={preview} hiddenCosts={hidden} applied={lastApplied.value} />
      <HiddenReadout state={s} rivalName={rival.name} otherName={other.name} />

      <div class="mt-1">
        <Timer seconds={v.timer} resetKey={v.id} paused={paused} onExpire={() => decide('timeout')} />
      </div>

      <Card card={v} disabled={busy.value || !!rollOverlay.value} onTilt={(side, strength) => setTilt({ side, strength })} onCommit={(side) => decide(side)} speakerName={speakerName} speakerRole={speakerRole} />

      <ChoiceButtons card={v} disabled={busy.value || !!rollOverlay.value} onHover={(side) => setTilt({ side, strength: side ? 1 : 0 })} onCommit={(side) => decide(side)} />

      <div class="flex items-center justify-between">
        <div class="mono text-[10px] tracking-[0.16em] text-mute">
          {s.charges.deescalation > 0 && <span class="mr-3 text-blue">HOTLINE ×{s.charges.deescalation}</span>}
          {s.charges.removal > 0 && !v.isFlashpoint && (
            <button class="link text-paper/80" onClick={() => (busy.value ? null : bury())}>
              BURY THIS CARD ×{s.charges.removal}
            </button>
          )}
        </div>
        <div class="mono text-[10px] tracking-[0.16em] text-mute">← drag or tap →</div>
      </div>

      {rollOverlay.value && <RollOverlay result={rollOverlay.value.result} slow={rollOverlay.value.slow} />}
      <Intro />
    </div>
  );
}

export function Speaker({ art, accent, name, role }: { art: string; accent: string; name: string; role: string }) {
  return (
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 overflow-hidden rounded-sm bg-navy" style={{ color: accent }}>
        <Portrait art={art} accent={accent} size={40} title={name} />
      </div>
      <div>
        <div class="serif text-sm font-semibold">{name}</div>
        <div class="mono text-[10px] uppercase tracking-[0.16em] text-mute">{role}</div>
      </div>
    </div>
  );
}

export function copySeed(seed: string) {
  navigator.clipboard?.writeText(seed).then(() => toast('Seed copied', 'good')).catch(() => toast(seed));
}
