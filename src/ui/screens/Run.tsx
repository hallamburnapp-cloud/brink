import { useState } from 'preact/hooks';
import type { EffectKey, Effects } from '../../engine/types';
import { template } from '../../engine/run';
import { Card, ChoiceButtons } from '../components/Card';
import { HiddenReadout, Meters } from '../components/Meters';
import { Timer } from '../components/Timer';
import { RollOverlay } from '../components/RollOverlay';
import { AccidentOverlay } from '../components/AccidentOverlay';
import { Tally } from '../components/Tally';
import { Intro } from '../components/Intro';
import { Shop } from './Shop';
import { abandonRun, accidentOverlay, bury, busy, cardView, content, decide, lastApplied, rollOverlay, run, runMeta, settings, tally, toast, useOrderAt } from '../store';
import { Portrait, PieceIcon } from '../art/Portrait';
import { formatScore } from '../../meta/score';

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

  if (s.phase === 'shop') return <Shop />;
  if (s.phase === 'ended' || !v) {
    return (
      <div class="flex flex-1 flex-col items-center justify-center gap-3">
        <div class="mono text-mute">…</div>
        <button class="btn" onClick={abandonRun}>
          Abandon run
        </button>
      </div>
    );
  }

  const preview: Effects | null = tilt.side ? v[tilt.side].preview : null;
  const hidden: EffectKey[] = tilt.side ? v[tilt.side].hiddenCosts : [];
  const speakerName = template(c, s, v.advisor.name);
  const speakerRole = template(c, s, v.advisor.role);
  const overlay = !!rollOverlay.value || !!accidentOverlay.value || !!tally.value;
  const paused = busy.value || overlay || menu || !settings.value.seenIntro;
  const pct = Math.min(100, (s.actLeverage / Math.max(1, s.actTarget)) * 100);
  const cardId = v.id;

  return (
    <div class="flex flex-1 flex-col gap-3">
      <header class="flex items-center justify-between">
        <button class="mono flex items-center gap-2 text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => setMenu(!menu)} aria-label="Menu">
          <span class="inline-block h-2 w-2 rounded-full" style={{ background: seat.accent }} />
          {seat.name.toUpperCase()} · {v.actName.toUpperCase()}
        </button>
        <div class="mono flex items-center gap-3 text-[11px] tracking-[0.2em] text-mute">
          <span title="Political capital" class="text-amber">
            PC {s.capital}
          </span>
          <span title="Score">{formatScore(s.score)}</span>
        </div>
      </header>

      {/* The ante: leverage this act against the target */}
      <div class="flex items-center gap-2" aria-label={`Act leverage ${s.actLeverage} of ${s.actTarget}`}>
        <div class="mono text-[9px] tracking-[0.2em] text-mute">ANTE</div>
        <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-paper/10">
          <div class={`absolute inset-y-0 left-0 ${pct >= 100 ? 'bg-green' : 'bg-red'} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <div class={`mono text-[11px] tabular-nums ${pct >= 100 ? 'text-green' : 'text-paper/80'}`}>
          {formatScore(s.actLeverage)} / {formatScore(s.actTarget)}
        </div>
      </div>

      {menu && (
        <div class="paper-dark rise rounded-md p-3">
          <div class="mono mb-2 text-[10px] tracking-[0.2em] text-mute">POSTURE</div>
          {s.pieces.length === 0 ? (
            <div class="serif text-sm text-paper/70">No posture yet. The back room opens mid-week.</div>
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
          <div class="mono mt-2 text-[10px] text-mute">
            SEED {s.seed} · {runMeta.value?.mode === 'challenge' ? 'CHALLENGE' : 'EXPERT'}
            {s.endless ? ` · ENDLESS ACT ${s.act - c.acts.length}` : ''}
          </div>
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
        <Timer seconds={v.timer} resetKey={v.id} paused={paused} onExpire={() => decide('timeout', cardId)} />
      </div>

      {v.accident && (
        <div class={`mono flex items-center justify-between rounded-sm border px-3 py-1.5 text-[11px] tracking-[0.14em] ${v.accident.known === true ? 'border-red bg-red/20 text-red' : v.accident.known === false ? 'border-green/50 text-green' : 'border-red/50 text-red'}`} role="status">
          <span>ACCIDENT · {v.accident.label.toUpperCase()}</span>
          <span class="font-bold">{v.accident.known === true ? 'WILL FIRE' : v.accident.known === false ? 'CLEAR' : `${Math.round(v.accident.p * 100)}%`}</span>
        </div>
      )}

      <Card
        card={v}
        disabled={busy.value || overlay}
        onTilt={(side, strength) => setTilt({ side, strength })}
        onCommit={(side) => decide(side, cardId)}
        speakerName={speakerName}
        speakerRole={speakerRole}
      />

      <ChoiceButtons card={v} disabled={busy.value || overlay} onHover={(side) => setTilt({ side, strength: side ? 1 : 0 })} onCommit={(side) => decide(side, cardId)} />

      <div class="flex items-center justify-between gap-2">
        <div class="mono flex flex-wrap items-center gap-2 text-[10px] tracking-[0.16em] text-mute">
          {s.orders.map((id, i) => {
            const o = c.orders[id];
            if (!o) return null;
            return (
              <button key={`${id}-${i}`} class="flex items-center gap-1 rounded-sm border border-paper/25 px-2 py-1 text-paper/90 hover:border-paper/60 disabled:opacity-50" disabled={busy.value || overlay} onClick={() => useOrderAt(i)} title={o.mechanics}>
                <span class="h-3.5 w-3.5" style={{ color: o.accent }}>
                  <PieceIcon art={o.art} accent={o.accent} size={14} />
                </span>
                {o.name.toUpperCase()}
              </button>
            );
          })}
          {s.charges.deescalation > 0 && <span class="text-blue">HOTLINE ×{s.charges.deescalation}</span>}
          {s.charges.removal > 0 && !v.isFlashpoint && (
            <button class="link text-paper/80" onClick={() => (busy.value ? null : bury())}>
              BURY ×{s.charges.removal}
            </button>
          )}
        </div>
        <div class="mono shrink-0 text-[10px] tracking-[0.16em] text-mute">← drag →</div>
      </div>

      {tally.value && <Tally key={tally.value.key} breakdown={tally.value.breakdown} actLeverage={tally.value.actLeverage} actTarget={tally.value.actTarget} />}
      {rollOverlay.value && <RollOverlay result={rollOverlay.value.result} slow={rollOverlay.value.slow} />}
      {accidentOverlay.value && <AccidentOverlay result={accidentOverlay.value.result} phase={accidentOverlay.value.phase} />}
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
