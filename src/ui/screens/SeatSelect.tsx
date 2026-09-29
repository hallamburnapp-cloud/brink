import { useState } from 'preact/hooks';
import type { Seat } from '../../engine/types';
import { SEATS } from '../../engine/types';
import { randomSeed } from '../../engine/rng';
import { content, difficultyUnlocked, goto, seatUnlocked, startNight, startRun } from '../store';

export function SeatSelect() {
  const c = content.value;
  const [seat, setSeat] = useState<Seat>('republic');
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [seed, setSeed] = useState('');
  const [expert, setExpert] = useState(false);
  const chosen = c.seats[seat];
  // The night is "any night, any seat"; the seat ladder belongs to Expert.
  const ok = !expert || (seatUnlocked(seat) && difficultyUnlocked(level));
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono flex gap-1 text-[10px] tracking-[0.2em]" role="tablist" aria-label="Game">
          <button class={`rounded-sm px-2 py-1 ${!expert ? 'bg-paper text-ink' : 'text-mute hover:text-paper'}`} role="tab" aria-selected={!expert} onClick={() => setExpert(false)}>
            A NIGHT
          </button>
          <button class={`rounded-sm px-2 py-1 ${expert ? 'bg-paper text-ink' : 'text-mute hover:text-paper'}`} role="tab" aria-selected={expert} onClick={() => setExpert(true)}>
            EXPERT
          </button>
        </div>
      </header>
      <h2 class="serif text-2xl font-semibold">Take a seat</h2>
      {expert && <p class="serif -mt-2 text-sm text-paper/70">The long game: leverage on every choice, weekly targets, the shop, endless escalation. Numbers everywhere.</p>}
      <div class="flex flex-col gap-2">
        {SEATS.map((id) => {
          const s = c.seats[id];
          const unlocked = !expert || seatUnlocked(id);
          return (
            <button
              key={id}
              class={`paper-dark rounded-md p-3 text-left transition ${seat === id ? 'ring-2' : ''} ${unlocked ? 'hover:border-paper/40' : 'opacity-60'}`}
              style={{ ['--tw-ring-color' as any]: s.accent }}
              onClick={() => setSeat(id)}
            >
              <div class="flex items-center justify-between">
                <div class="serif text-lg font-semibold" style={{ color: s.accent }}>
                  {s.name}
                </div>
                <div class="mono text-[10px] tracking-[0.2em] text-mute">{unlocked ? s.leader_title.toUpperCase() : 'LOCKED'}</div>
              </div>
              <div class="serif mt-1 text-[13px] leading-snug text-paper/80">{unlocked ? s.blurb : s.unlock?.hint}</div>
              {unlocked && seat === id && (
                <div class="mono mt-2 grid grid-cols-1 gap-0.5 text-[10px] leading-snug text-mute">
                  <div>
                    <span class="text-green">STRONG</span> {s.strengths}
                  </div>
                  <div>
                    <span class="text-red">EXPOSED</span> {s.vulnerabilities}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {expert && (
      <div>
        <div class="mono mb-1 text-[10px] tracking-[0.24em] text-mute">DEFCON</div>
        <div class="grid grid-cols-5 gap-1">
          {c.difficulties.map((d) => {
            const unlocked = difficultyUnlocked(d.level);
            return (
              <button
                key={d.level}
                class={`mono rounded-sm border py-2 text-xs ${level === d.level ? 'bg-paper text-ink' : 'text-paper/80'} ${unlocked ? '' : 'opacity-40'}`}
                style={{ borderColor: level === d.level ? 'var(--color-paper)' : 'rgba(236,231,216,0.2)' }}
                disabled={!unlocked}
                title={unlocked ? d.name : 'Locked'}
                onClick={() => setLevel(d.level)}
              >
                {d.level}
              </button>
            );
          })}
        </div>
      </div>
      )}

      <div>
        <div class="mono mb-1 text-[10px] tracking-[0.24em] text-mute">SEED (optional)</div>
        <div class="flex gap-2">
          <input class="mono flex-1 rounded-sm border border-paper/20 bg-transparent px-3 py-2 text-sm uppercase tracking-widest text-paper placeholder:text-mute/60" placeholder={randomSeed()} value={seed} onInput={(e) => setSeed((e.target as HTMLInputElement).value.trim())} maxLength={32} />
          <button class="btn" onClick={() => setSeed(randomSeed())}>
            New
          </button>
        </div>
      </div>

      <button class="btn btn-primary mt-auto" disabled={!ok} onClick={() => (expert ? startRun({ mode: 'endless', seat, seed: seed || undefined, difficulty: level }) : startNight(seat, seed || undefined))}>
        {expert ? `Pick up the phone as ${chosen.leader_title}` : `Start the night as ${chosen.leader_title}`}
      </button>
    </div>
  );
}
