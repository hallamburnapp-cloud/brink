import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardView } from '../../engine/types';
import { Portrait } from '../art/Portrait';
import { reducedMotion } from '../store';

export interface CardProps {
  card: CardView;
  disabled: boolean;
  onTilt: (side: 'left' | 'right' | null, strength: number) => void;
  onCommit: (side: 'left' | 'right') => void;
  /** Speaker display name (templated). */
  speakerName: string;
  speakerRole: string;
}

const THRESHOLD = 88;

/** Reigns-style card: drag with resistance, tilt reveals the choice, release commits. */
export function Card({ card, disabled, onTilt, onCommit, speakerName, speakerRole }: CardProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<null | 'left' | 'right'>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDx(0);
    setLeaving(null);
    setDragging(false);
    start.current = null;
    onTilt(null, 0);
  }, [card.id]);

  const side: 'left' | 'right' | null = Math.abs(dx) > 12 ? (dx < 0 ? 'left' : 'right') : null;
  const strength = Math.min(1, Math.abs(dx) / THRESHOLD);

  const commit = (s: 'left' | 'right') => {
    if (disabled || leaving) return;
    setLeaving(s);
    onTilt(null, 0);
    const ms = reducedMotion() ? 0 : 320;
    setTimeout(() => onCommit(s), ms);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (disabled || leaving) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const raw = e.clientX - start.current.x;
    // resistance beyond the threshold
    const abs = Math.abs(raw);
    const eased = abs <= THRESHOLD ? abs : THRESHOLD + (abs - THRESHOLD) * 0.35;
    const next = Math.sign(raw) * eased;
    setDx(next);
    const s: 'left' | 'right' | null = Math.abs(next) > 12 ? (next < 0 ? 'left' : 'right') : null;
    onTilt(s, Math.min(1, Math.abs(next) / THRESHOLD));
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    start.current = null;
    setDragging(false);
    if (Math.abs(dx) >= THRESHOLD) commit(dx < 0 ? 'left' : 'right');
    else {
      setDx(0);
      onTilt(null, 0);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled || leaving) return;
      if (e.key === 'ArrowLeft') commit('left');
      if (e.key === 'ArrowRight') commit('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, leaving, card.id]);

  const reduce = reducedMotion();
  const rot = reduce ? 0 : dx * 0.05;
  const transform = leaving
    ? `translateX(${leaving === 'left' ? -720 : 720}px) rotate(${leaving === 'left' ? -18 : 18}deg)`
    : `translateX(${dx}px) rotate(${rot}deg)`;
  const transition = dragging ? 'none' : leaving ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div class="relative" style={{ perspective: '1200px' }}>
      <div class="card-under-2 paper absolute inset-0 rounded-md" aria-hidden="true" />
      <div class="card-under-1 paper absolute inset-0 rounded-md" aria-hidden="true" />
      <div
        ref={el}
        key={card.id}
        class={`card paper relative flex min-h-[420px] flex-col rounded-md ${reduce ? '' : 'card-enter'}`}
        style={{ transform, transition, opacity: leaving ? 0 : 1 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="group"
        aria-label={`Card from ${speakerName}`}
      >
        {/* choice reveal ribbons */}
        <div class="pointer-events-none absolute left-3 top-3 max-w-[70%] transition-opacity" style={{ opacity: side === 'left' ? 0.35 + strength * 0.65 : 0 }}>
          <span class="stamp text-[11px] text-red-2">{card.left.text}</span>
        </div>
        <div class="pointer-events-none absolute right-3 top-3 max-w-[70%] text-right transition-opacity" style={{ opacity: side === 'right' ? 0.35 + strength * 0.65 : 0 }}>
          <span class="stamp text-[11px] text-ink-2">{card.right.text}</span>
        </div>

        <div class="flex items-center gap-3 border-b border-ink/10 px-5 pb-3 pt-12">
          <div class="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-navy" style={{ color: card.advisor.accent }}>
            <Portrait art={card.advisor.art} accent={card.advisor.accent} size={56} title={speakerName} />
          </div>
          <div class="min-w-0">
            <div class="serif truncate text-base font-semibold text-ink">{speakerName}</div>
            <div class="mono truncate text-[10px] uppercase tracking-[0.18em] text-ink-2/70">{speakerRole}</div>
          </div>
        </div>

        <div class="serif flex-1 px-5 py-4 text-[17px] leading-[1.45] text-ink" style={{ textWrap: 'pretty' } as any}>
          {card.text}
        </div>

        <div class="mono flex items-center justify-between px-5 pb-3 text-[10px] uppercase tracking-[0.18em] text-ink-2/60">
          <span>{card.isFlashpoint ? `FLASHPOINT · ${card.flashpointName}` : card.actName}</span>
          <span>Day {card.day}</span>
        </div>
      </div>
    </div>
  );
}

export interface ChoiceButtonsProps {
  card: CardView;
  disabled: boolean;
  onHover: (side: 'left' | 'right' | null) => void;
  onCommit: (side: 'left' | 'right') => void;
}

/** Tap targets under the card (also the accessible path). */
export function ChoiceButtons({ card, disabled, onHover, onCommit }: ChoiceButtonsProps) {
  const btn = (side: 'left' | 'right') => {
    const c = card[side];
    return (
      <button
        class={`paper-dark flex min-h-[64px] flex-1 flex-col items-${side === 'left' ? 'start' : 'end'} justify-center gap-1 rounded-sm px-3 py-2 text-${side} transition hover:border-paper/40 active:translate-y-px disabled:opacity-50`}
        disabled={disabled}
        onMouseEnter={() => onHover(side)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(side)}
        onBlur={() => onHover(null)}
        onClick={() => onCommit(side)}
        aria-label={`${side === 'left' ? 'Left' : 'Right'}: ${c.text}${c.odds ? `, ${c.odds.label} ${Math.round(c.odds.p * 100)} percent` : ''}`}
      >
        <span class="serif text-[15px] leading-tight text-paper">{c.text}</span>
        <span class="mono flex items-center gap-2 text-[10px] tracking-[0.14em] text-mute">
          {c.odds && (
            <span class={c.odds.p >= 0.6 ? 'text-green' : c.odds.p >= 0.45 ? 'text-amber' : 'text-red'}>
              {c.odds.label.toUpperCase()} {Math.round(c.odds.p * 100)}%
            </span>
          )}
          {c.usesCharge && <span class="text-blue">HOTLINE</span>}
          {c.hiddenCosts.length > 0 && <span class="text-red">?</span>}
        </span>
      </button>
    );
  };
  return (
    <div class="flex gap-2">
      {btn('left')}
      {btn('right')}
    </div>
  );
}
