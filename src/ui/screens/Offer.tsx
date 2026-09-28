import { useState } from 'preact/hooks';
import { PieceCard } from '../components/PieceCard';
import { busy, content, run, takePiece } from '../store';

export function Offer() {
  const s = run.value;
  const c = content.value;
  const [chosen, setChosen] = useState<string | null>(null);
  if (!s || !s.offer) return null;
  const nextAct = c.acts[Math.min(s.act, c.acts.length - 1)];
  return (
    <div class="flex flex-1 flex-col gap-4 rise">
      <header class="pt-2 text-center">
        <div class="mono text-[11px] tracking-[0.3em] text-mute">END OF {c.acts[s.act - 1].name.toUpperCase()}</div>
        <h2 class="serif mt-1 text-2xl font-semibold">Adjust your posture</h2>
        <p class="serif mt-1 text-sm text-paper/70">Three people want a word before {nextAct.name}. Take one into the room.</p>
      </header>
      <div class="flex flex-col gap-3">
        {s.offer.map((id) => {
          const p = c.pieces[id];
          if (!p) return null;
          return (
            <div key={id} class={chosen === id ? 'ring-2 ring-paper/70 rounded-md' : ''}>
              <PieceCard piece={p} onPick={() => setChosen(id)} />
            </div>
          );
        })}
      </div>
      <div class="mt-auto flex flex-col gap-2 pt-2">
        <button class="btn btn-primary" disabled={!chosen || busy.value} onClick={() => chosen && takePiece(chosen)}>
          {chosen ? `Bring in ${c.pieces[chosen].pool === 'advisor' ? c.pieces[chosen].name.split(' ').slice(-1)[0] : c.pieces[chosen].name}` : 'Choose one'}
        </button>
        {s.pieces.length > 0 && (
          <div class="mono text-center text-[10px] tracking-[0.16em] text-mute">HELD: {s.pieces.map((id) => c.pieces[id]?.name).join(' · ')}</div>
        )}
      </div>
    </div>
  );
}
