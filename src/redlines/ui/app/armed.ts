/**
 * A form that has just been laid on the desk is not yet taking taps: a thumb drumming to skip a
 * playback would otherwise answer the phone with the tap after the one that skipped (the second
 * review: six taps 150 ms apart answered BACK DOWN every time). The forms arm only once the finger has
 * been still for ARM_MS: every press that lands while they are unarmed starts the wait again. And a tap
 * counts only when its press began after the forms were armed, so a finger already on the glass when
 * they arm does not answer either. At once under reduced motion. The scripting hook drives the actions
 * directly and is never held.
 */
import { effect } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { armed as slipArmed, lifted, moveAsk, reduced } from './store';

/** How long the finger must be still, after a call or a card is laid down, before its forms take taps. */
export const ARM_MS = 450;

type Clock = () => number;
type Timers = { set: (fn: () => void, ms: number) => unknown; clear: (t: unknown) => void };

/**
 * The gate, pure (its clock and timers passed in), so it has tests. `press()` is every pointer or key press
 * anywhere on the page; `accepts()` says whether the press behind a tap began after the gate armed.
 */
export class ArmGate {
  private armedAt = Infinity;
  private lastPress = -Infinity;
  private timer: unknown = null;
  armed = false;

  constructor(
    private readonly ms: number,
    private readonly now: Clock,
    private readonly timers: Timers,
    private readonly onArm: () => void = () => {},
  ) {}

  /** A new call or card: unarmed, and the wait begins. */
  reset(): void {
    this.armed = false;
    this.armedAt = Infinity;
    this.wait();
  }

  /** Armed at once (reduced motion). */
  armNow(): void {
    this.cancel();
    this.armed = true;
    this.armedAt = -Infinity;
  }

  /** A press anywhere: while unarmed it starts the wait again. */
  press(): void {
    this.lastPress = this.now();
    if (!this.armed) this.wait();
  }

  /** Whether a tap now answers: armed, and its press began after arming. */
  accepts(): boolean {
    return this.armed && this.lastPress >= this.armedAt;
  }

  cancel(): void {
    if (this.timer !== null) this.timers.clear(this.timer);
    this.timer = null;
  }

  private wait(): void {
    this.cancel();
    this.timer = this.timers.set(() => {
      this.timer = null;
      this.armed = true;
      this.armedAt = this.now();
      this.onArm();
    }, this.ms);
  }
}

/** Every gate on the page hears every press (capture phase, before any form's own handler). */
const gates = new Set<ArmGate>();
/** When the last press anywhere on the page began (a slip takes only a press that began after it was put down). */
let lastPressAt = -Infinity;
if (typeof document !== 'undefined') {
  const hear = () => {
    lastPressAt = now();
    for (const g of gates) g.press();
  };
  document.addEventListener('pointerdown', hear, true);
  document.addEventListener('keydown', hear, true);
}

const now: Clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const timers: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t as ReturnType<typeof setTimeout>) };

/**
 * A slip on the sheet (PROMISE TO DEFEND / WITHDRAW, the lifted counter's, MOVE HERE) takes only a tap whose press
 * began after the slip was last put down or changed. A slip that a hold or a tap lays under the finger (a place at the
 * foot of the sheet: the slip goes over it) would otherwise take the lift of that same finger as a tap on whatever it
 * laid there: the integration's real-tap game held Hearth and the lift promised it; a hold on Floe End cancelled its
 * own slip. No wait, and reduced motion changes nothing: the slip answers the very next press.
 */
let slipSince = -Infinity;
effect(() => {
  void slipArmed.value;
  void lifted.value;
  void moveAsk.value;
  slipSince = now();
});
/** Whether the tap being handled now began after the slip on the sheet was put down (a slip button's guard). */
export function slipTakes(): boolean {
  return lastPressAt > slipSince;
}

/**
 * The gate for the forms of one call or card (`key` changes with a new one): `armed` for the look (the
 * forms' .rl-armed), `accepts()` to ask, in a tap's handler, whether that tap is an answer.
 */
export function useArmedGate(key: string | number, ms = ARM_MS): { armed: boolean; accepts: () => boolean } {
  const [armed, setArmed] = useState(reduced.value);
  const gate = useMemo(() => new ArmGate(ms, now, timers, () => setArmed(true)), [ms]);
  useEffect(() => {
    gates.add(gate);
    if (reduced.value) {
      gate.armNow();
      setArmed(true);
    } else {
      setArmed(false);
      gate.reset();
    }
    return () => {
      gate.cancel();
      gates.delete(gate);
    };
  }, [key, gate]);
  return { armed, accepts: () => gate.accepts() };
}

/** True once the finger has been still for `ms` since `key` last changed (a new call, a new card). */
export function useArmed(key: string | number, ms = ARM_MS): boolean {
  return useArmedGate(key, ms).armed;
}
