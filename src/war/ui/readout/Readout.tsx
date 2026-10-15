/**
 * The readout (SPEC 9: 0,691,390,48): what this turn needs and what the pins make. On the left,
 * TARGET and the line under it ('NEED 1,100' until the pins win, then 'NEXT REGION AT 4,400'); on
 * the right POINTS x MULTIPLIER, live on every tap. During a send the director drives the boxes
 * (they count up as numbers land, then collide into the score plate); a score of 10x the target
 * is also stamped big over the map.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatInt, formatM10Short, formatShort, readoutView, type GameState } from '../../engine';
import * as P from '../app/playback';
import { reduced, run, speed } from '../app/store';
import { rollSteps } from '../board/odometer';
import { FlapRow, type FlapMotion, type FlapStyle } from '../board/SplitFlap';

const BOX: FlapStyle = { w: 13.4, h: 24, size: 22, gap: 0, sep: 6.5, skin: 'bare' };

export function Readout({ s }: { s: GameState }): JSX.Element {
  const r = readoutView(s);
  const live = P.boxes.value;
  const slam = P.slam.value;
  const choosing = s.phase === 'choose';
  const pinned = choosing && s.deal.pins.length > 0;
  const points = live?.points ?? (pinned ? r.points : null);
  const m10 = live?.m10 ?? (pinned ? r.m10 : null);
  const wins = pinned && r.regions > 0;
  const rec = run.value?.lastSend ?? null;
  return (
    <div class={`layer readout-layer${slam !== 'idle' ? ` slam-${slam}` : ''}`}>
      <div class="readout" />
      <div class="ro-target abs">
        <span class="ro-label">TARGET</span>
        <span key={s.turn} class={`ro-value num${reduced.value ? '' : ' arrive'}`}>
          {r.targetText}
        </span>
      </div>
      <div class={`ro-line abs${wins ? ' wins' : ''}`} aria-live="polite">
        {r.line}
      </div>
      <Box kind="points" label="POINTS" text={points === null ? null : formatShort(points, 6)} counting={!!live} />
      <span class="times abs">×</span>
      <Box kind="mult" label="MULTIPLIER" text={m10 === null ? null : formatM10Short(m10, 6)} counting={!!live} />
      {slam === 'hit' && rec && <Plate points={rec.points} m10={rec.m10} score={rec.score} big={rec.score >= rec.target} />}
      <Showcase />
    </div>
  );
}

function Box({ kind, label, text, counting }: { kind: 'points' | 'mult'; label: string; text: string | null; counting: boolean }): JSX.Element {
  const el = useRef<HTMLDivElement>(null);
  const bump = P.bumps.value;
  const n = kind === 'points' ? bump.points : bump.mult;
  // A number lands: the box bumps (a multiplier heavier, with a wobble sized by its weight).
  useEffect(() => {
    const node = el.current;
    if (!n || !node || reduced.value || typeof node.animate !== 'function') return;
    const w = kind === 'mult' ? P.multWeight.value : 0.4;
    node.animate(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: `scale(${(1 + 0.2 * w).toFixed(3)}) rotate(${kind === 'mult' ? -3 : 0}deg)`, offset: 0.35 },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 200 / speed.value, easing: 'cubic-bezier(.22,1,.36,1)' },
    );
  }, [n]);
  const motion: FlapMotion = { flips: 1, flipMs: 80, stagger: 12, instant: counting, reduced: reduced.value };
  return (
    <div ref={el} class={`box ${kind} abs${text === null ? ' idle' : ''}`}>
      <span class="lbl">{label}</span>
      <span class="val num">{text === null ? <span class="dash">–</span> : <FlapRow text={text} style={BOX} motion={motion} class="center" maxWidth={kind === 'points' ? 80 : 68} />}</span>
    </div>
  );
}

/** The score plate: the boxes collide into it, and its number rolls up to the score. */
function Plate({ points, m10, score, big }: { points: bigint; m10: bigint; score: bigint; big: boolean }): JSX.Element {
  const text = useRoll(score, 260);
  return (
    <div class={`product abs${big ? ' big' : ''}${reduced.value ? ' still' : ''}`} aria-live="polite" aria-label={`Score ${formatInt(score)}`}>
      <span class="eqn num">
        <span class="f-points">{formatShort(points, 7)}</span>
        <span class="by">×</span>
        <span class="f-mult">{formatM10Short(m10, 6)}</span>
      </span>
      <span class="res num">
        <span class="eq">=</span>
        {text}
      </span>
    </div>
  );
}

/** A number rolling up from zero like an odometer over `ms` (at once under reduced motion). */
function useRoll(to: bigint, ms: number): string {
  const [text, setText] = useState(() => (reduced.value ? formatShort(to, 9) : '0'));
  useEffect(() => {
    if (reduced.value) {
      setText(formatShort(to, 9));
      return;
    }
    const timers = rollSteps(0n, to, ms / speed.value).map((step) => window.setTimeout(() => setText(formatShort(step.value, 9)), step.at));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [to]);
  return text;
}

/** A score of 10x the target or more: stamped big over the map. */
function Showcase(): JSX.Element | null {
  const sc = P.showcase.value;
  if (!sc) return null;
  return (
    <div key={sc.n} class="showcase abs" aria-hidden="true">
      <span class="big num">{sc.text}</span>
      <span class="sub">{sc.sub}</span>
    </div>
  );
}
