import { favouriteAdvisor, getStats, mostFatalDoctrine } from '../../meta/stats';
import { dailyHistory, dailyStreak } from '../../meta/daily';
import { unlockProgress, UNLOCKS, isUnlocked } from '../../meta/unlocks';
import { content, goto } from '../store';

export function Stats() {
  const c = content.value;
  const st = getStats();
  const fav = favouriteAdvisor(st, c);
  const fatal = mostFatalDoctrine(st, c);
  const prog = unlockProgress();
  const history = dailyHistory(14);
  const expertRuns = Math.max(0, st.runs - st.nights);
  const rows: [string, string | number][] = [
    ['Nights played', st.nights],
    ['Reached dawn', st.nights ? `${st.dawns} of ${st.nights}` : '—'],
    ['Nights in a row', dailyStreak()],
    ['Endings seen', Object.keys(st.endingsSeen).length],
    ['Stand-downs', st.standdowns],
    ['Timers expired', st.timeouts],
    ['Near misses', st.nearMisses],
    ['Expert games', expertRuns],
    ['Longest Expert game', st.bestDays ? `${st.bestDays} days` : '—'],
    ['Favourite advisor', fav ?? '—'],
    ['Most fatal doctrine', fatal ?? '—'],
  ];
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">RECORD</div>
      </header>
      <h2 class="serif text-2xl font-semibold">Service record</h2>
      <dl class="paper-dark grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-md p-4">
        {rows.map(([k, v]) => (
          <>
            <dt key={k} class="mono text-[10px] tracking-[0.18em] text-mute">
              {k.toUpperCase()}
            </dt>
            <dd key={k + 'v'} class="serif text-right text-sm">
              {v}
            </dd>
          </>
        ))}
      </dl>
      <section>
        <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">
          UNLOCKS · {prog.unlocked}/{prog.total}
        </div>
        <ul class="space-y-1">
          {UNLOCKS.map((u) => {
            const ok = isUnlocked(u.id);
            return (
              <li key={u.id} class={`paper-dark flex items-start gap-3 rounded-md px-3 py-2 ${ok ? '' : 'opacity-60'}`}>
                <span class={`mono mt-0.5 text-[10px] ${ok ? 'text-green' : 'text-mute'}`}>{ok ? '■' : '□'}</span>
                <div>
                  <div class="serif text-sm font-semibold">{u.label}</div>
                  <div class="serif text-[12px] text-paper/70">{u.hint}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {history.length > 0 && (
        <section>
          <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">NIGHT BY NIGHT</div>
          <ul class="space-y-1">
            {history.map((r) => (
              <li key={r.dateKey} class="mono flex items-center justify-between text-[11px] text-paper/80">
                <span>
                  #{r.number} · {c.seats[r.seat]?.name}
                </span>
                <span>
                  {r.dawn ? '🌅 Dawn' : r.clock ? `🌑 ${r.clock}` : `${r.days}d`} · {c.endings[r.ending]?.name ?? r.ending}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
