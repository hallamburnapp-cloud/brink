/**
 * The staff rail (spec 10: 0,107,390,64): five seats on leather. Each seat holds a staff's object
 * on felt in its rarity's metal rim, its seat number and its chip. Tap for the rule balloon;
 * long-press (300 ms) and drag to change seats while the others slide aside. Seats that would fire
 * for the current pins sit up a little; seats that fire during a sweep hop.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { preview, seatViews, type RunState, type SeatView } from '../../engine';
import type { StaffId } from '../../content/staff';
import { StaffIcon } from '../art';
import { moveSeat } from '../app/actions';
import { balloon, busy, frameScale, reduced, speed } from '../app/store';
import { dragOrder, SEAT_X, SEAT_Y, slotAt } from '../common/layout';
import { Chip } from '../common/text';
import { hops } from '../fx/anim';
import { buzz } from '../fx/shake';

const LONG_PRESS_MS = 300;

interface Drag {
  from: number;
  /** Dragged seat's left edge, frame px. */
  left: number;
  to: number;
}

export function StaffRail({ s }: { s: RunState }): JSX.Element {
  const seats = seatViews(s);
  const firing = s.phase === 'crisis' && s.crisis.pins.length > 0 ? new Set(preview(s).firingSeats) : new Set<number>();
  const [drag, setDrag] = useState<Drag | null>(null);
  const order = drag ? dragOrder(seats.length, drag.from, drag.to) : seats.map((_, i) => i);
  const open = balloon.value?.kind === 'seat' ? balloon.value.index : -1;

  return (
    <>
      <div class="rail">
        <i class="stitch" style={{ top: '2.5px' }} />
        <i class="stitch" style={{ top: '60.5px' }} />
      </div>
      {Array.from({ length: s.seatCount }, (_, i) => i)
        .filter((i) => i >= seats.length)
        .map((i) => (
          <div key={`empty${i}`} class="seat empty abs" style={{ left: `${SEAT_X[i]}px`, top: `${SEAT_Y}px` }}>
            <div class="felt">
              <span class="no">{i + 1}</span>
              <span class="vacant">VACANT</span>
            </div>
          </div>
        ))}
      {seats.map((v) => {
        const slot = order.indexOf(v.seat);
        const dragging = drag?.from === v.seat;
        const left = dragging ? drag.left : SEAT_X[slot];
        return (
          <Seat
            key={v.uid}
            v={v}
            number={slot + 1}
            left={left}
            dragging={dragging}
            sliding={!!drag && !dragging}
            ready={firing.has(v.seat)}
            open={open === v.seat}
            count={seats.length}
            onDrag={setDrag}
          />
        );
      })}
    </>
  );
}

interface SeatProps {
  v: SeatView;
  number: number;
  left: number;
  dragging: boolean;
  sliding: boolean;
  ready: boolean;
  open: boolean;
  count: number;
  onDrag: (d: Drag | null) => void;
}

function Seat({ v, number, left, dragging, sliding, ready, open, count, onDrag }: SeatProps): JSX.Element {
  const el = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; timer: number; dragging: boolean; to: number; id: number } | null>(null);
  const hop = hops.value[v.seat] ?? 0;
  const [lit, setLit] = useState(false);

  // A hop: 6 pt up in 50 ms, down in 70 ms with a one-frame squash; the chip lights for the beat.
  useEffect(() => {
    if (!hop) return;
    const rate = speed.value;
    setLit(true);
    const t = window.setTimeout(() => setLit(false), 260 / rate);
    const node = el.current;
    if (node && !reduced.value && typeof node.animate === 'function') {
      node.animate(
        [
          { transform: 'translateY(0)', easing: 'cubic-bezier(.22,1,.36,1)' },
          { transform: 'translateY(-6px)', offset: 0.42, easing: 'cubic-bezier(.55,0,1,.45)' },
          { transform: 'translateY(0) scaleY(0.94)', offset: 0.92 },
          { transform: 'translateY(0) scaleY(1)' },
        ],
        { duration: 120 / rate },
      );
    }
    return () => clearTimeout(t);
  }, [hop]);

  const end = () => {
    const p = press.current;
    if (!p) return;
    clearTimeout(p.timer);
    press.current = null;
    return p;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (busy.value) return;
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const p = { x: e.clientX, y: e.clientY, timer: 0, dragging: false, to: v.seat, id: e.pointerId };
    p.timer = window.setTimeout(() => {
      if (count < 2) return;
      p.dragging = true;
      buzz(10);
      try {
        target.setPointerCapture(p.id);
      } catch {
        /* the pointer may already be gone */
      }
      balloon.value = null;
      onDrag({ from: v.seat, left: SEAT_X[v.seat], to: v.seat });
    }, LONG_PRESS_MS);
    press.current = p;
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const scale = frameScale.value || 1;
    const dx = (e.clientX - p.x) / scale;
    const dy = (e.clientY - p.y) / scale;
    if (!p.dragging) {
      if (Math.hypot(dx, dy) > 10) end();
      return;
    }
    const minLeft = SEAT_X[0] - 6;
    const maxLeft = SEAT_X[count - 1] + 6;
    const leftNow = Math.max(minLeft, Math.min(maxLeft, SEAT_X[v.seat] + dx));
    p.to = slotAt(leftNow + 32, count);
    onDrag({ from: v.seat, left: leftNow, to: p.to });
  };

  const onPointerUp = (e: PointerEvent) => {
    e.stopPropagation();
    const p = end();
    if (!p) return;
    if (p.dragging) {
      onDrag(null);
      moveSeat(v.seat, p.to);
      return;
    }
    balloon.value = open ? null : { kind: 'seat', index: v.seat };
  };

  const onPointerCancel = () => {
    const p = end();
    if (p?.dragging) onDrag(null);
  };

  const cls = [
    'seat',
    'abs',
    v.rarity,
    dragging ? 'dragging' : '',
    sliding ? 'sliding' : '',
    ready ? 'ready' : '',
    lit ? 'firing' : '',
    open ? 'open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={el}
      class={cls}
      style={{ left: `${left}px`, top: `${SEAT_Y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role="button"
      aria-label={`Seat ${number}: ${v.name}. ${v.rule}`}
    >
      <div class="felt">
        <span class="no">{number}</span>
        <span class="obj">
          <StaffIcon id={v.id as StaffId} size={34} />
        </span>
        {v.id === 'OLDHAND' && <span class="count-tag num">{v.count}</span>}
        {v.id === 'DEPUTY' && v.copies && (
          <span class="copy-tag">
            <StaffIcon id={v.copies as StaffId} size={14} />
          </span>
        )}
        <span class="chip">
          <Chip id={v.id as StaffId} chip={v.chip} />
        </span>
      </div>
    </div>
  );
}
