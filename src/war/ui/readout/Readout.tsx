/**
 * The readout (SPEC 9: 0,691,390,48): what this turn needs and what the pins make. On the left,
 * TARGET and the line under it ('PIN THE CRISIS FOR ×2' before any pin, 'NEED 1,100' while the pins
 * miss, 'NEXT REGION AT 4,400' once they win); on the right POINTS x MULTIPLIER, live on every tap
 * (a whole multiplier prints whole: 'times how many'). During a send the director drives the boxes
 * (they count up as numbers land, then collide into the score plate); a score of 16x the target (SHOWCASE_AT) is
 * also stamped big over the map, in the half away from the crisis ring. Between turns the readout
 * says what comes next, and during the intro it wakes only when the lesson reaches it.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatInt, formatShort, goalView, readoutView, type GameState } from '../../engine';
import { introView } from '../app/intro';
import * as P from '../app/playback';
import { reduced, run, speed } from '../app/store';
import { rollSteps } from '../board/odometer';
import { FlapRow, type FlapMotion, type FlapStyle } from '../board/SplitFlap';
import { MAP_Y, showcaseAt } from '../common/layout';
import { formatMult } from '../common/numbers';
import { isEnding, readoutLeft } from './left';
import { getMap } from '../table/mapRef';

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
  // The intro wakes the console as the lesson reaches it: nothing on the goal screen, then TARGET.
  const intro = introView.value?.console ?? 'live';
  const ahead = introView.value ? null : P.ahead.value;
  const ended = isEnding(ahead);
  const final = run.value ? goalView(run.value) : null;
  const left = readoutLeft(s, r.line, { ahead, intro: !!introView.value, final });
  const veil = intro === 'live' ? '' : ` veil-${intro}`;
  // The game has ended: the boxes and the plate have done their work.
  const shownPoints = ended ? null : points;
  const shownM10 = ended ? null : m10;
  return (
    <div class={`layer readout-layer${slam !== 'idle' ? ` slam-${slam}` : ''}${veil}`}>
      <div class="readout" />
      <div class="ro-target abs">
        <span class="ro-label">{left.label}</span>
        <span key={`${s.turn}:${left.label}`} class={`ro-value num${reduced.value ? '' : ' arrive'}${left.tone ? ` end-${left.tone}` : ''}`}>
          {intro === 'off' ? '–' : left.value}
        </span>
      </div>
      <div class={`ro-line abs${wins ? ' wins' : ''}${pinned ? '' : ' hint'}`} aria-live="polite">
        {intro === 'live' ? left.line : ''}
      </div>
      <Box kind="points" label="POINTS" text={shownPoints === null || intro !== 'live' ? null : formatShort(shownPoints, 6)} counting={!!live} />
      <span class="times abs">×</span>
      <Box kind="mult" label="MULTIPLIER" text={shownM10 === null || intro !== 'live' ? null : formatMult(shownM10, 6)} counting={!!live} />
      {slam === 'hit' && rec && !ended && <Plate points={rec.points} m10={rec.m10} score={rec.score} big={rec.score >= rec.target} />}
      <Showcase crisis={s.deal.crisis} />
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

/** The plate's sum has room for the multiplier in full ('36 × 1,165.8 = 41,968': it adds up). */
const PLATE_MULT_GLYPHS = 10;

/** The score plate: the boxes collide into it, and its number rolls up to the score. */
function Plate({ points, m10, score, big }: { points: bigint; m10: bigint; score: bigint; big: boolean }): JSX.Element {
  const text = useRoll(score, 260);
  return (
    <div class={`product abs${big ? ' big' : ''}${reduced.value ? ' still' : ''}`} aria-live="polite" aria-label={`Score ${formatInt(score)}`}>
      <span class="eqn num">
        <span class="f-points">{formatShort(points, 7)}</span>
        <span class="by">×</span>
        <span class="f-mult">{formatMult(m10, PLATE_MULT_GLYPHS)}</span>
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

/** The showcase's height: the number, its line, and the dark plate behind them. */
const SHOWCASE_H = 164;

/** A score of 16x the target or more (SHOWCASE_AT): stamped big over the map, in the half away from the ring. */
function Showcase({ crisis }: { crisis: string }): JSX.Element | null {
  const sc = P.showcase.value;
  if (!sc) return null;
  // In the half of the map away from the crisis ring (or, for WORLD UNITED, the last region won).
  const pin = getMap()?.pinPos(sc.region ?? crisis) ?? null;
  const at = showcaseAt(pin ? pin.y : null);
  const united = sc.kind === 'united';
  return (
    <div
      key={sc.n}
      class={`showcase abs${united ? ' united' : ''}`}
      style={{ top: `${at.y - SHOWCASE_H / 2}px`, height: `${SHOWCASE_H}px` }}
      aria-hidden={united ? undefined : 'true'}
      role={united ? 'status' : undefined}
      data-map-y={at.y - MAP_Y}
    >
      <span class={`big${united ? '' : ' num'}`}>{sc.text}</span>
      <span class="sub">{sc.sub}</span>
    </div>
  );
}
