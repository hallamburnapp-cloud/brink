/**
 * The readout (spec 10: 0,691,390,48): the pattern your pins make, its level, and INFLUENCE x
 * MOMENTUM. It answers every tap at once ('CHAIN 30 x 3' becomes 'FRONT 45 x 4' as a pin goes
 * down). During a sweep the boxes lock on the base, count up as numbers land (a multiplier lands
 * heavier than an add), hold their breath, and slam together into the sweep's sum, '68 x 4 = 272',
 * which stays on the readout until the next pin; tap that sum for the LAST SWEEP receipt. Tap the
 * rest of the readout for Run Info. While an Order is armed it becomes the Order's prompt with DONE
 * and CANCEL. A slam of 10x the target is also stamped big over the map.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { armedView, formatM10Short, formatShort, preview, twistInForce, type RunState, type SweepRecord } from '../../engine';
import { cancelOrder, confirmOrder } from '../app/actions';
import { pressNote, receiptOpen, reduced, run, sheet, speed } from '../app/store';
import { FlapRow, type FlapMotion, type FlapStyle } from '../board/SplitFlap';
import * as A from '../fx/anim';
import { ReceiptPaper } from './ReceiptPaper';

const BOX: FlapStyle = { w: 13.4, h: 24, size: 22, gap: 0, sep: 6.5, skin: 'bare' };

/** The latest sweep, if it belongs to the crisis on the table (it stays on show until the next pin). */
function lastOfCrisis(s: RunState): SweepRecord | null {
  const l = s.lastSweep;
  return l && s.phase === 'crisis' && l.hour === s.crisis.hour && l.crisisIndex === s.crisis.index ? l : null;
}

export function Readout({ s }: { s: RunState }): JSX.Element {
  const armed = armedView(s);
  if (armed) return <OrderPrompt prompt={armed.prompt} name={armed.name} canConfirm={armed.canConfirm} />;

  const p = preview(s);
  const sweepBoxes = A.boxes.value;
  const stamped = A.stampedPattern.value;
  const name = stamped?.name ?? p.name;
  const level = stamped?.level ?? p.level;
  const I = sweepBoxes?.I ?? (p.pattern ? p.influence : null);
  const M10 = sweepBoxes?.M10 ?? (p.pattern ? p.m10 : null);
  const slam = A.slam.value;
  const fullTable = twistInForce(s)?.kind === 'FULL_TABLE';
  // The slam's sum: from the sweep playing now, or (once it has settled) the crisis's last sweep
  // until a pin goes down.
  const settled = !sweepBoxes && p.pins.length === 0 ? lastOfCrisis(s) : null;
  // During playback the shown run is the pre-sweep one; the sweep's record is on the run itself.
  const playing = slam === 'hit' && sweepBoxes ? run.value?.lastSweep : null;
  const sum = playing ?? settled;

  return (
    <div class={`layer readout-layer${slam !== 'idle' ? ` slam-${slam}` : ''}`}>
      <div class="readout" role="button" tabIndex={0} onClick={() => (sheet.value = 'runinfo')} aria-label="Readout. Tap for Run Info." />
      <PatternName name={name} level={level} stampN={stamped?.n ?? 0} pins={p.pins.length} loose={stamped ? 0 : p.loose.length} />
      {fullTable && <Sockets filled={p.pins.length} />}
      <Box kind="inf" label="INFLUENCE" text={I === null ? null : formatShort(I, 6)} sweeping={!!sweepBoxes} />
      <span class="times abs">×</span>
      <Box kind="mom" label="MOMENTUM" text={M10 === null ? null : formatM10Short(M10, 5)} sweeping={!!sweepBoxes} />
      {sum && <Sum I={sum.influence} M10={sum.m10} leverage={sum.leverage} still={!playing} big={!!playing && sum.leverage >= sum.target - sum.totalBefore} />}
      {settled && <LastSweep key={`${settled.hour}:${settled.crisisIndex}:${settled.n}`} rec={settled} />}
      <Showcase />
    </div>
  );
}

function PatternName({
  name,
  level,
  stampN,
  pins,
  loose,
}: {
  name: string | null;
  level: number;
  stampN: number;
  pins: number;
  /** Pins down that are not in the shape: they score nothing and are still used up. */
  loose: number;
}): JSX.Element {
  const el = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // A rubber stamp when the sweep names the pattern; a small press when the pins change it.
  useEffect(() => {
    if (!stampN || !box.current || reduced.value) return;
    box.current.animate(
      [
        { transform: 'scale(1.4)', opacity: 0 },
        { opacity: 1, offset: 0.4 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 200 / speed.value, easing: 'cubic-bezier(.34,1.56,.64,1)' },
    );
  }, [stampN]);
  useEffect(() => {
    if (stampN || !name || !box.current || reduced.value) return;
    box.current.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }, [name, level, pins]);
  // Long names shrink to fit the 172 pt before the Influence box, never below 15 pt.
  useLayoutEffect(() => {
    const n = el.current;
    if (!n) return;
    n.style.fontSize = '20px';
    const w = n.scrollWidth;
    if (w > 132) n.style.fontSize = `${Math.max(15, (20 * 132) / w).toFixed(1)}px`;
  }, [name]);

  // Keyed apart, so the empty line never inherits the name's fitted size.
  if (!name) {
    return (
      <div key="empty" class="pattern abs empty">
        <span class="tap-lit">Tap lit regions</span>
      </div>
    );
  }
  return (
    <div key="name" class="pattern abs" ref={box}>
      <span ref={el} class="pattern-name">
        {name}
      </span>
      <span class="pattern-lv num">Lv {level}</span>
      {loose > 0 && <span class="pattern-loose">{loose} LOOSE · SCORES NOTHING</span>}
    </div>
  );
}

function Box({ kind, label, text, sweeping }: { kind: 'inf' | 'mom'; label: string; text: string | null; sweeping: boolean }): JSX.Element {
  const el = useRef<HTMLDivElement>(null);
  const bump = A.bumps.value;
  const n = kind === 'inf' ? bump.inf : bump.mom;
  const mult = kind === 'mom' ? bump.mult : 0;
  const pulse = (keyframes: Keyframe[], ms: number, easing = 'cubic-bezier(.22,1,.36,1)') => {
    if (!el.current || reduced.value || typeof el.current.animate !== 'function') return;
    el.current.animate(keyframes, { duration: ms / speed.value, easing });
  };
  // An add lands with a bump and a bright rim.
  useEffect(() => {
    if (!n || !el.current || reduced.value) return;
    el.current.classList.remove('bump');
    void el.current.offsetWidth;
    el.current.classList.add('bump');
    const t = window.setTimeout(() => el.current?.classList.remove('bump'), 120 / speed.value);
    return () => clearTimeout(t);
  }, [n]);
  // A multiplier lands heavier: the box swells and wobbles, more for a bigger factor.
  useEffect(() => {
    if (!mult) return;
    const w = A.multWeight.value;
    pulse(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: `scale(${(1 + 0.25 * w).toFixed(3)}) rotate(-4deg)`, offset: 0.35 },
        { transform: `scale(${(1 + 0.12 * w).toFixed(3)}) rotate(3deg)`, offset: 0.65 },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      220,
    );
  }, [mult]);
  // The stamp locks the base in place: a press, not a scramble.
  useEffect(() => {
    if (bump.base) pulse([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], 180);
  }, [bump.base]);
  // The held breath before the slam: both boxes swell once together. It runs on the `scale`
  // property, so it composes with a multiplier's swell (on `transform`) instead of cutting it off.
  const breath = A.breath.value;
  useEffect(() => {
    if (breath) pulse([{ scale: '1' }, { scale: '1.06', offset: 0.6 }, { scale: '1' }], 280, 'cubic-bezier(.65,0,.35,1)');
  }, [breath]);
  // While a sweep plays, numbers swap in place as they land (the landing pulse carries them).
  const motion: FlapMotion = { flips: 1, flipMs: 80, stagger: 12, instant: sweeping, reduced: reduced.value };
  return (
    <div ref={el} class={`box ${kind} abs${text === null ? ' idle' : ''}${pressNote.value?.box === kind ? ' peeked' : ''}`}>
      <span class="lbl">{label}</span>
      <span class="val num">{text === null ? <span class="dash">–</span> : <FlapRow text={text} style={BOX} motion={motion} class="center" />}</span>
    </div>
  );
}

/**
 * The slam's sum, in one plate across both boxes: the two factors in their colours over the result,
 * '68 x 4 = 272'. It pops in on contact; once the sweep has settled it stays, still.
 */
function Sum({ I, M10, leverage, still, big }: { I: bigint; M10: bigint; leverage: bigint; still: boolean; big: boolean }): JSX.Element {
  const lev = formatShort(leverage, 9);
  // A sweep that covers what is left of the target lands bigger, with a white flash.
  return (
    <div class={`product abs${still || reduced.value ? ' still' : ''}${big ? ' big' : ''}`} aria-live="polite" aria-label={`This sweep: ${formatShort(I, 9)} times ${formatM10Short(M10, 7)} equals ${lev}`}>
      <span class="eqn num">
        <span class="f-inf">{formatShort(I, 7)}</span>
        <span class="by">×</span>
        <span class="f-mom">{formatM10Short(M10, 6)}</span>
      </span>
      <span class="res num">
        <span class="eq">=</span>
        {lev}
      </span>
    </div>
  );
}

/**
 * The settled sum is a tab: tapping it unfolds the LAST SWEEP receipt above the readout, where the
 * points came from line by line. A tap on it or anywhere else folds it away; the next pin takes it
 * with the sum.
 */
function LastSweep({ rec }: { rec: SweepRecord }): JSX.Element {
  const open = receiptOpen.value === 'readout';
  return (
    <>
      <button
        class="sum-tab abs"
        aria-expanded={open}
        aria-label="Last sweep: where the points came from"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => (receiptOpen.value = open ? null : 'readout')}
      />
      {open && <ReceiptPaper rec={rec} bottom={157} />}
    </>
  );
}

/** A slam of 10x the target or more: the product stamped big over the map before it flies up. */
function Showcase(): JSX.Element | null {
  const sc = A.showcase.value;
  if (!sc) return null;
  return (
    <div key={sc.n} class="showcase abs" aria-hidden="true">
      <span class="big num">{sc.text}</span>
      <span class="sub">{sc.sub}</span>
    </div>
  );
}

function Sockets({ filled }: { filled: number }): JSX.Element {
  return (
    <div class="sockets abs" aria-label={`${filled} of 5 pins`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} class={i < filled ? 'on' : ''} />
      ))}
    </div>
  );
}

function OrderPrompt({ prompt, name, canConfirm }: { prompt: string; name: string; canConfirm: boolean }): JSX.Element {
  return (
    <div class="layer readout-layer">
      <div class="readout armed" />
      <div class="armed-text abs">
        <span class="armed-name">{name}</span>
        <span class="armed-prompt">{prompt}</span>
      </div>
      {canConfirm && (
        <button class="mini-btn brass-mini abs" style={{ left: '232px' }} onClick={confirmOrder}>
          DONE
        </button>
      )}
      <button class="mini-btn abs" style={{ left: '308px' }} onClick={cancelOrder}>
        CANCEL
      </button>
    </div>
  );
}
