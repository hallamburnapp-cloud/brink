/**
 * The staff rail (SPEC 9: 0,107,390,64): five seats on leather, fired left to right. Each seat
 * holds a staff's object on felt, its seat number and its chip (cyan for points, amber for
 * multiplier; live values for the Surveyor and the Old Hand; COPY → name for the Deputy). Tap for
 * the rule balloon; long-press (300 ms) and drag to change seats while the others slide aside. A
 * hire glows 'NEW' until its first send. In the shop's full-table flow each seat shows the number
 * it would make if replaced, and a tap hires into it.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatShort, nextShopAfter, preview, seatViews, shopView, type GameState, type SeatView } from '../../engine';
import { StaffIcon } from '../art';
import { buyOffer, moveSeat } from '../app/actions';
import { introSeat, introView } from '../app/intro';
import * as P from '../app/playback';
import { balloon, busy, frameScale, reduced, replacing, speed } from '../app/store';
import { dragOrder, SEAT_X, SEAT_Y, SEATS, slotAt } from '../common/layout';
import { Chip } from '../common/text';
import { buzz } from '../fx/shake';

const LONG_PRESS_MS = 300;

interface Drag {
  from: number;
  /** The dragged seat's left edge, frame px. */
  left: number;
  to: number;
}

export function StaffRail({ s }: { s: GameState }): JSX.Element {
  const seats = seatViews(s);
  const firing = new Set(preview(s)?.firing ?? []);
  const [drag, setDrag] = useState<Drag | null>(null);
  const order = drag ? dragOrder(seats.length, drag.from, drag.to) : seats.map((_, i) => i);
  const open = balloon.value?.seat ?? -1;
  const slot = replacing.value;
  const offer = slot !== null ? shopView(s)?.offers[slot] : null;
  const ghost = useLeaving(introSeat.value, 300);
  // No staff yet: the empty rail says what it is for and when it fills.
  // (The intro's scenes play other turns of the first game: it always speaks of the first shop.)
  const shopAfter = introView.value ? 2 : nextShopAfter(s.phase === 'choose' ? s.turn : s.turn + 1);
  const plate = seats.length === 0 && s.phase !== 'shop' && s.phase !== 'over' ? `STAFF · HIRE AFTER TURN ${shopAfter}` : null;
  return (
    <>
      <div class="rail">
        <i class="stitch" style={{ top: '2.5px' }} />
        <i class="stitch" style={{ top: '60.5px' }} />
      </div>
      {Array.from({ length: SEATS }, (_, i) => i)
        .filter((i) => i >= seats.length && ghost?.value.seat !== i)
        .map((i) => (
          <div key={`empty${i}`} class={`seat empty abs${plate ? ' quiet' : ''}`} style={{ left: `${SEAT_X[i]}px`, top: `${SEAT_Y}px` }}>
            <div class="felt">
              <span class="no">{i + 1}</span>
              {!plate && <span class="vacant">EMPTY</span>}
            </div>
          </div>
        ))}
      {plate && (
        <div class={`rail-plate abs${ghost ? ' beside' : ''}`} aria-label={plate}>
          {plate}
        </div>
      )}
      {ghost && (
        <div
          class={`seat abs intro-seat${ghost.value.fired ? ' fired' : ''}${ghost.leaving ? ' leaving' : ''}`}
          style={{ left: `${SEAT_X[ghost.value.seat]}px`, top: `${SEAT_Y}px` }}
          aria-hidden="true"
        >
          <div class="felt">
            <span class="no">{ghost.value.seat + 1}</span>
            <span class="obj">
              <StaffIcon id={ghost.value.id} size={32} />
            </span>
            <span class="chip">
              <Chip lines={[ghost.value.chip]} tone="multiplier" />
            </span>
          </div>
        </div>
      )}
      {seats.map((v) => {
        const at = order.indexOf(v.seat);
        const dragging = drag?.from === v.seat;
        const tag = offer?.replace?.[v.seat] ?? null;
        return (
          <Seat
            key={v.uid}
            v={v}
            number={at + 1}
            left={dragging ? drag.left : SEAT_X[at]}
            dragging={dragging}
            sliding={!!drag && !dragging}
            ready={firing.has(v.seat)}
            open={open === v.seat}
            count={seats.length}
            onDrag={setDrag}
            replace={
              tag && slot !== null
                ? {
                    slot,
                    text: formatShort(tag.after, 5),
                    affordable: tag.affordable,
                    // Lower than the line-up makes now: the dim tone, never the same gold as a gain.
                    worse: !!offer?.preview && tag.after < offer.preview.before,
                  }
                : null
            }
          />
        );
      })}
    </>
  );
}

/**
 * A value that fades out instead of vanishing: when it turns null, the last one stays `ms` longer
 * as `leaving` (at once under reduced motion). The intro's ghost lamp fades as TRY IT starts turn 1.
 */
function useLeaving<T>(value: T | null, ms: number): { value: T; leaving: boolean } | null {
  const last = useRef<T | null>(null);
  const [, redraw] = useState(0);
  const until = useRef(0);
  if (value !== null) {
    last.current = value;
    until.current = 0;
  } else if (last.current !== null && until.current === 0) {
    until.current = reduced.value ? -1 : performance.now() + ms;
  }
  const leaving = value === null && last.current !== null && until.current > performance.now();
  useEffect(() => {
    if (!leaving) {
      if (value === null) last.current = null;
      return;
    }
    const t = window.setTimeout(() => {
      last.current = null;
      redraw((k) => k + 1);
    }, Math.max(0, until.current - performance.now()));
    return () => clearTimeout(t);
  }, [leaving]);
  if (value !== null) return { value, leaving: false };
  return leaving && last.current !== null ? { value: last.current, leaving: true } : null;
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
  /** The full-table flow: what replacing this seat would make (`worse`: less than now). */
  replace: { slot: number; text: string; affordable: boolean; worse: boolean } | null;
}

function Seat({ v, number, left, dragging, sliding, ready, open, count, onDrag, replace }: SeatProps): JSX.Element {
  const el = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; timer: number; dragging: boolean; to: number; id: number } | null>(null);
  const hop = P.hops.value[v.seat] ?? 0;
  const [lit, setLit] = useState(false);

  // A hop: 6 pt up in 50 ms, down in 70 ms with a one-frame squash; the chip lights for the beat.
  // A new hire's first hop is drawn 1.5x larger (SPEC 4), so the jump is attributed to the hire.
  useEffect(() => {
    if (!hop) return;
    const rate = speed.value;
    setLit(true);
    const t = window.setTimeout(() => setLit(false), 260 / rate);
    const node = el.current;
    if (node && !reduced.value && typeof node.animate === 'function') {
      const up = v.isNew ? 'translateY(-9px) scale(1.08)' : 'translateY(-6px)';
      node.animate(
        [
          { transform: 'translateY(0)', easing: 'cubic-bezier(.22,1,.36,1)' },
          { transform: up, offset: 0.42, easing: 'cubic-bezier(.55,0,1,.45)' },
          { transform: 'translateY(0) scaleY(0.94)', offset: 0.92 },
          { transform: 'translateY(0) scaleY(1)' },
        ],
        { duration: (v.isNew ? 180 : 120) / rate },
      );
    }
    return () => clearTimeout(t);
  }, [hop]);

  const end = () => {
    const p = press.current;
    if (!p) return null;
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
      if (count < 2 || replace) return;
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
    if (!p.dragging) {
      if (Math.hypot(dx, (e.clientY - p.y) / scale) > 10) end();
      return;
    }
    const leftNow = Math.max(SEAT_X[0] - 6, Math.min(SEAT_X[count - 1] + 6, SEAT_X[v.seat] + dx));
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
    if (replace) {
      buyOffer(replace.slot, v.seat);
      return;
    }
    balloon.value = open ? null : { seat: v.seat };
  };

  const onPointerCancel = () => {
    const p = end();
    if (p?.dragging) onDrag(null);
  };

  const cls = [
    'seat',
    'abs',
    v.tone,
    dragging ? 'dragging' : '',
    sliding ? 'sliding' : '',
    ready ? 'ready' : '',
    lit ? 'firing' : '',
    open ? 'open' : '',
    v.isNew ? 'new' : '',
    replace ? 'replaceable' : '',
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
      aria-label={replace ? `Replace seat ${number}, ${v.name}: best last turn ${replace.text}` : `Seat ${number}: ${v.name}. ${v.rule}`}
    >
      <div class="felt">
        <span class="no">{number}</span>
        <span class="obj">
          <StaffIcon id={v.id} size={v.chipLines.length > 1 ? 28 : 32} />
        </span>
        {v.isNew && <span class="new-tag">NEW</span>}
        <span class={`chip${v.chipLines.length > 1 ? ' two' : ''}`}>
          <Chip lines={v.chipLines} tone={v.tone} />
        </span>
      </div>
      {replace && (
        <span class={`replace-tag num${replace.affordable ? (replace.worse ? ' worse' : '') : ' poor'}`}>
          <span class="rt-arrow">→</span>
          {replace.text}
        </span>
      )}
    </div>
  );
}
