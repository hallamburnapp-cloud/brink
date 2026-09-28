import type { PieceDef } from '../../engine/types';
import { PieceIcon, Portrait } from '../art/Portrait';

const POOL_LABEL = { advisor: 'ADVISOR', doctrine: 'DOCTRINE', asset: 'ASSET' } as const;

export function PieceCard({ piece, onPick, compact, held, locked }: { piece: PieceDef; onPick?: () => void; compact?: boolean; held?: boolean; locked?: boolean }) {
  const Art = piece.pool === 'advisor' ? Portrait : PieceIcon;
  return (
    <button
      class={`paper-dark relative flex w-full items-start gap-3 rounded-md p-3 text-left transition ${onPick ? 'hover:border-paper/40 active:translate-y-px' : 'cursor-default'} ${locked ? 'opacity-50' : ''}`}
      onClick={onPick}
      disabled={!onPick}
      style={{ ['--accent' as any]: piece.accent }}
    >
      <div class="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-navy" style={{ color: piece.accent }}>
        <Art art={piece.art} accent={piece.accent} size={48} title={piece.name} />
      </div>
      <div class="min-w-0 flex-1">
        <div class="mono flex items-center gap-2 text-[9px] tracking-[0.2em]" style={{ color: piece.accent }}>
          <span>{POOL_LABEL[piece.pool]}</span>
          {held && <span class="text-paper/70">· HELD</span>}
          {locked && <span class="text-paper/70">· LOCKED</span>}
        </div>
        <div class="serif text-[15px] font-semibold leading-tight text-paper">{piece.name}</div>
        {piece.pool === 'advisor' && <div class="mono text-[10px] uppercase tracking-[0.14em] text-mute">{piece.title}</div>}
        {!compact && <div class="serif mt-1.5 text-[13px] leading-snug text-paper/85">{locked && piece.unlock ? piece.unlock.hint : piece.blurb}</div>}
        {!compact && !locked && <div class="mono mt-1.5 text-[10px] leading-snug text-mute">{piece.mechanics}</div>}
      </div>
    </button>
  );
}
