/**
 * Screen shake and haptics. The shake moves the whole war room (not the letterbox): random offsets
 * re-picked every 16 ms, decaying linearly to zero over the shake (STYLE 7). The room also punches
 * in by just enough that an offset never uncovers the frame's edge. Reduced motion never shakes.
 * Haptics go through navigator.vibrate wherever it exists.
 */
import { FRAME_W } from '../common/layout';

let el: HTMLElement | null = null;
let raf = 0;
let until = 0;
let started = 0;
let amp = 0;
let lastPick = 0;

/** The element that shakes (the frame's inner wrapper). */
export function setShakeTarget(target: HTMLElement | null): void {
  el = target;
}

export function shake(px: number, ms: number): void {
  if (!el || px <= 0 || ms <= 0) return;
  const now = performance.now();
  // A stronger shake takes over; a weaker one during a strong one is absorbed.
  const remaining = until > now ? amp * ((until - now) / Math.max(1, until - started)) : 0;
  if (px < remaining) return;
  amp = px;
  started = now;
  until = now + ms;
  if (!raf) raf = requestAnimationFrame(step);
}

function step(now: number): void {
  raf = 0;
  if (!el) return;
  if (now >= until) {
    el.style.transform = '';
    return;
  }
  if (now - lastPick >= 16) {
    lastPick = now;
    const a = amp * ((until - now) / Math.max(1, until - started));
    const x = (Math.random() * 2 - 1) * a;
    const y = (Math.random() * 2 - 1) * a;
    // Scaled about the centre, the room overhangs each side by a px: an offset of up to a stays covered.
    const k = 1 + (2 * a) / FRAME_W;
    el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${k.toFixed(4)})`;
  }
  raf = requestAnimationFrame(step);
}

export function stopShake(): void {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  until = 0;
  if (el) el.style.transform = '';
}

/** A haptic pulse, where supported. */
export function buzz(ms: number): void {
  try {
    const nav = navigator as Navigator & { vibrate?: (p: number) => boolean };
    if (typeof nav.vibrate === 'function') nav.vibrate(ms);
  } catch {
    /* some browsers throw outside a user gesture */
  }
}
