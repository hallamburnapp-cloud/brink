import { compendium } from '../../meta/compendium';
import { isUnlocked } from '../../meta/unlocks';
import { FEATURES } from '../../config';
import { PieceCard } from '../components/PieceCard';
import { content, endlessAvailable, goto } from '../store';

const KIND_LABEL = { nuclear: 'NUCLEAR WAR', removed: 'REMOVED', standdown: 'STAND-DOWN', survival: 'SURVIVAL', special: 'SPECIAL' } as const;

export function Compendium() {
  const c = content.value;
  const comp = compendium(c);
  const kinds = ['standdown', 'survival', 'removed', 'nuclear', 'special'] as const;
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="flex items-center justify-between pt-2">
        <button class="mono text-[11px] tracking-[0.2em] text-mute hover:text-paper" onClick={() => goto('home')}>
          ← HOME
        </button>
        <div class="mono text-[11px] tracking-[0.2em] text-mute">{comp.percent}% COMPLETE</div>
      </header>
      <h2 class="serif text-2xl font-semibold">Endings</h2>
      <div class="h-1 w-full overflow-hidden rounded-full bg-paper/10">
        <div class="h-full bg-paper" style={{ width: `${comp.percent}%` }} />
      </div>
      {kinds.map((k) => {
        const list = comp.entries.filter((x) => x.ending.kind === k);
        if (!list.length) return null;
        return (
          <section key={k}>
            <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">
              {KIND_LABEL[k]} · {list.filter((x) => x.seen > 0).length}/{list.length}
            </div>
            <ul class="space-y-1.5">
              {list
                .filter((x) => x.seen > 0)
                .map((x) => (
                  <li key={x.id} class="paper-dark rounded-md px-3 py-2">
                    <div class="flex items-center justify-between gap-2">
                      <div class="serif text-[15px] font-semibold">
                        {x.ending.emoji} {x.ending.name}
                      </div>
                      <div class="mono text-[10px] text-mute">×{x.seen}</div>
                    </div>
                    <div class="serif text-[12px] text-paper/70">{x.ending.compendium}</div>
                  </li>
                ))}
              {list.some((x) => x.seen === 0) && (
                <li class="paper-dark rounded-md px-3 py-2 opacity-70">
                  <div class="serif text-[13px] text-paper/70">
                    {list.filter((x) => x.seen === 0).length} more to find.
                  </div>
                </li>
              )}
            </ul>
          </section>
        );
      })}

      {endlessAvailable.value && <h2 class="serif mt-4 text-2xl font-semibold">Posture <span class="mono text-[10px] tracking-[0.24em] text-mute">EXPERT</span></h2>}
      {endlessAvailable.value && (['advisor', 'doctrine', 'asset'] as const).map((pool) => (
        <section key={pool}>
          <div class="mono mb-2 text-[10px] tracking-[0.24em] text-mute">{pool.toUpperCase()}S</div>
          <div class="flex flex-col gap-2">
            {c.pieceOrder
              .filter((id) => c.pieces[id].pool === pool)
              .map((id) => {
                const p = c.pieces[id];
                const locked = !!p.unlock && !FEATURES.allUnlocked && !isUnlocked(p.unlock.id);
                return <PieceCard key={id} piece={p} locked={locked} />;
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
