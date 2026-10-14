/**
 * The readout (spec 10: 0,691,390,48): the pattern your pins make, its level, and INFLUENCE x
 * MOMENTUM. It answers every tap at once ('CHAIN 30 x 3' becomes 'FRONT 45 x 4' as a pin goes
 * down), and during a sweep the boxes count up and slam together. Tap it for Run Info.
 * While an Order is armed it becomes the Order's prompt with DONE and CANCEL.
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { armedView, formatM10Short, formatShort, preview, twistInForce, type RunState } from '../../engine';
import { cancelOrder, confirmOrder } from '../app/actions';
import { reduced, run, sheet, speed } from '../app/store';
import { FlapRow, type FlapMotion, type FlapStyle } from '../board/SplitFlap';
import * as A from '../fx/anim';

const BOX: FlapStyle = { w: 13.4, h: 24, size: 22, gap: 0, sep: 6.5, skin: 'bare' };

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

  return (
    <div class={`layer readout-layer${slam !== 'idle' ? ` slam-${slam}` : ''}`}>
      <div class="readout" role="button" tabIndex={0} onClick={() => (sheet.value = 'runinfo')} aria-label="Readout. Tap for Run Info." />
      <PatternName name={name} level={level} stampN={stamped?.n ?? 0} pins={p.pins.length} />
      {fullTable && <Sockets filled={p.pins.length} />}
      <Box kind="inf" label="INFLUENCE" text={I === null ? null : formatShort(I, 6)} sweeping={!!sweepBoxes} />
      <span class="times abs">×</span>
      <Box kind="mom" label="MOMENTUM" text={M10 === null ? null : formatM10Short(M10, 5)} sweeping={!!sweepBoxes} />
      {slam === 'hit' && sweepBoxes && <Product />}
    </div>
  );
}

function PatternName({ name, level, stampN, pins }: { name: string | null; level: number; stampN: number; pins: number }): JSX.Element {
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

  if (!name) {
    return (
      <div class="pattern abs empty">
        <span class="tap-lit">Tap lit regions</span>
      </div>
    );
  }
  return (
    <div class="pattern abs" ref={box}>
      <span ref={el} class="pattern-name">
        {name}
      </span>
      <span class="pattern-lv num">Lv {level}</span>
    </div>
  );
}

function Box({ kind, label, text, sweeping }: { kind: 'inf' | 'mom'; label: string; text: string | null; sweeping: boolean }): JSX.Element {
  const el = useRef<HTMLDivElement>(null);
  const bump = A.bumps.value;
  const n = kind === 'inf' ? bump.inf : bump.mom;
  const mult = kind === 'mom' ? bump.mult : 0;
  useEffect(() => {
    if (!n || !el.current || reduced.value) return;
    el.current.classList.remove('bump');
    void el.current.offsetWidth;
    el.current.classList.add('bump');
    const t = window.setTimeout(() => el.current?.classList.remove('bump'), 120 / speed.value);
    return () => clearTimeout(t);
  }, [n]);
  useEffect(() => {
    if (!mult || !el.current || reduced.value) return;
    el.current.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], {
      duration: 160 / speed.value,
      easing: 'cubic-bezier(.22,1,.36,1)',
    });
  }, [mult]);
  const flip = A.baseFlip.value;
  const motion: FlapMotion = { flips: 1, flipMs: 80, stagger: 12, instant: sweeping, reduced: reduced.value };
  const baseMotion: FlapMotion = { flips: 3, flipMs: 60 / speed.value, stagger: 0, instant: false, reduced: reduced.value };
  return (
    <div ref={el} class={`box ${kind} abs${text === null ? ' idle' : ''}`}>
      <span class="lbl">{label}</span>
      <span class="val num">
        {text === null ? (
          <span class="dash">–</span>
        ) : (
          <FlapRow key={sweeping ? `f${flip}` : 'live'} text={text} style={BOX} motion={motion} from={sweeping ? '' : undefined} fromMotion={baseMotion} class="center" />
        )}
      </span>
    </div>
  );
}

/** After the slam: the sweep's leverage, from the engine's record, in one plate across both boxes. */
function Product(): JSX.Element {
  // During playback the shown run is the pre-sweep one; the record is on the run itself.
  const lev = run.value?.lastSweep?.leverage ?? 0n;
  return (
    <div class="product abs" aria-live="polite">
      <span class="plbl">LEVERAGE</span>
      <span class="eq">=</span>
      <span class="num">{formatShort(lev, 9)}</span>
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
