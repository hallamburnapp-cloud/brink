/**
 * The Big Board (spec 10: 0,47,390,60): the clock, the crisis and its dots, the Summit chip, the
 * crisis total in split-flap over the target and the sweeps left, the Funds coin and the progress
 * rule. The goal is always on show: nothing ever covers the leverage module. After a slam the total
 * rolls up like an odometer, one flap click per leaf. The menu button lives on the clock module so
 * there is always a way home.
 */
import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { boardLabels, formatShort, type RunState } from '../../engine';
import { Coin } from '../art';
import { balloon, reduced, sheet } from '../app/store';
import * as A from '../fx/anim';
import { layoutOf, rollSteps } from './odometer';
import { FlapRow, tilesOf, type FlapMotion, type FlapStyle } from './SplitFlap';

const CLOCK: FlapStyle = { w: 12, h: 20, size: 17, gap: 1.5, sep: 6, skin: 'steel' };
const TOTAL: FlapStyle = { w: 21.5, h: 32, size: 28, gap: 2, sep: 6, skin: 'steel' };
/** The total's tiles sit right-aligned in 112,60,124,32. */
const TOTAL_RIGHT = 236;
const TOTAL_W = 124;

export function BigBoard({ s }: { s: RunState }): JSX.Element {
  const b = boardLabels(s);
  const heat = A.heat.value;
  const cleared = s.crisis.cleared && !A.holdCleared.value;
  const totalNow = A.totalShown.value ?? s.crisis.total;
  const target = s.crisis.target;
  const progress = share(totalNow, target);
  const funds = A.fundsShown.value ?? s.funds;
  const roll = A.boardRoll.value;
  // During the sweep events the rule shows a ghost of what this sweep has made so far.
  const live = A.boxes.value;
  const ghost = live && A.slam.value === 'idle' && s.phase === 'crisis' ? share(totalNow + (live.I * live.M10) / 10n, target) : null;
  const sweepsLeft = s.phase === 'crisis' && !s.crisis.cleared ? s.crisis.sweepsLeft : null;

  return (
    <div class="layer board-layer">
      <div class={`board${heat ? ' heat' : ''}`}>
        <div class="board-backlight" />
        <i class="divider" style={{ left: '104px' }} />
        <i class="divider" style={{ left: '299px' }} />
        <i class="rivet" style={{ left: '5px', top: '5px' }} />
        <i class="rivet" style={{ right: '5px', top: '5px' }} />
        <i class="rivet" style={{ left: '5px', bottom: '9px' }} />
        <i class="rivet" style={{ right: '5px', bottom: '9px' }} />
      </div>

      <div class="backlit soft abs" style={{ left: '16px', top: '51px', width: '57px', height: '20px' }} />
      <div class="abs" style={{ left: '16px', top: '51px' }}>
        <FlapRow text={b.clock} style={CLOCK} motion={{ flips: 3, flipMs: 70, stagger: 30, instant: false, reduced: reduced.value, click: 0.15 }} />
      </div>
      <MenuButton />
      <div class="crisis-line abs">
        <span>{b.crisis}</span>
        <span class="dots">
          {[0, 1, 2].map((i) => {
            const state = i < b.crisisIndex || (i === b.crisisIndex && s.crisis.cleared) ? 'done' : i === b.crisisIndex ? 'live' : 'todo';
            return <i key={i} class={`dot ${state}`} />;
          })}
        </span>
      </div>
      <button
        class={`summit-chip abs${b.twistNow ? ' now' : ''}`}
        onClick={() => (balloon.value = balloon.value?.kind === 'summit' ? null : { kind: 'summit', index: 0 })}
        aria-label={`${b.summitChip}. ${b.twistRule}`}
      >
        {b.summitChip}
      </button>

      <div class="label abs" style={{ left: '112px', top: '50px' }}>
        LEVERAGE
      </div>
      <TotalTiles total={totalNow} target={target} roll={roll} heat={heat} />
      <div
        key={`${s.crisis.hour}:${s.crisis.index}`}
        class={`target abs${reduced.value ? '' : ' arrive'}`}
        style={{ fontSize: targetSize(target) }}
      >
        <span class="slash">/</span>
        <span class="num">{formatShort(target, 7)}</span>
      </div>
      {sweepsLeft !== null && (
        <div class={`sweeps-left abs${sweepsLeft === 1 ? ' last' : ''}`}>
          {sweepsLeft} SWEEP{sweepsLeft === 1 ? '' : 'S'} LEFT
        </div>
      )}
      {cleared && <div key={A.clearedStamp.value} class={`stamp-cleared abs${reduced.value ? ' still' : ''}`}>CLEARED</div>}

      <div class="funds abs">
        <Coin size={20} class="coin" />
        <span class="amount num">{funds}</span>
      </div>

      <div class={`rule${progress >= 1 ? ' done' : ''}${progress <= 0 ? ' empty' : ''}`}>
        {ghost !== null && ghost > progress && <div class={`ghost${ghost >= 1 ? ' full' : ''}`} style={{ width: `${(ghost * 100).toFixed(2)}%` }} />}
        <div class="fill" style={{ width: `${(progress * 100).toFixed(2)}%`, transitionDuration: roll ? `${Math.round(roll.ms)}ms` : undefined }} />
      </div>
    </div>
  );
}

/** total / target, 0..1. */
function share(total: bigint, target: bigint): number {
  return target > 0n ? Math.min(1, Number((total * 10_000n) / target) / 10_000) : 0;
}

function targetSize(target: bigint): string {
  const len = formatShort(target, 7).length;
  return len <= 5 ? '14px' : len === 6 ? '12.5px' : '11px';
}

/** How many digit tiles a number needs on the board ('1,350' needs 4, '600M' needs 4). */
function tileCount(text: string): number {
  return tilesOf(text, 0).filter((c) => c !== ',' && c !== '.').length;
}

/** The text the board shows while a roll plays: each odometer step in turn. */
function useRoll(roll: A.BoardRoll | null): string | null {
  const [text, setText] = useState<{ n: number; text: string } | null>(null);
  useEffect(() => {
    if (!roll) return;
    const timers = rollSteps(roll.from, roll.to, roll.ms).map((step) => window.setTimeout(() => setText({ n: roll.n, text: step.text }), step.at));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [roll?.n]);
  if (!roll) return null;
  return text?.n === roll.n ? text.text : formatShort(roll.from, 7);
}

/**
 * The leverage tiles: as many as the target has digits, the unused ones unpowered, and a zero shown
 * dim until the first sweep lands (an idle board, not dead digits). The backlight sits only behind
 * the powered tiles.
 */
function TotalTiles({ total, target, roll, heat }: { total: bigint; target: bigint; roll: A.BoardRoll | null; heat: boolean }): JSX.Element {
  const rolled = useRoll(roll);
  const text = rolled ?? formatShort(total, 7);
  const minTiles = tileCount(formatShort(target, 7));
  const chars = tilesOf(text, minTiles);
  const nTiles = tileCount(chars.join(''));
  const nSeps = chars.length - nTiles;
  const need = nTiles * TOTAL.w + nSeps * TOTAL.sep + (chars.length - 1) * TOTAL.gap;
  const w = need > TOTAL_W ? (TOTAL_W - nSeps * TOTAL.sep - (chars.length - 1) * TOTAL.gap) / nTiles : TOTAL.w;
  const lit = tileCount(text);
  const litW = lit * w + nSeps * TOTAL.sep + (lit + nSeps - 1) * TOTAL.gap;
  // A roll steps the value: one leaf per step, landing before the next, each with its click.
  const stepMs = roll ? roll.ms / Math.max(2, Math.floor(roll.ms / 70)) : 0;
  const motion: FlapMotion = roll
    ? { flips: 1, flipMs: Math.max(30, Math.min(60, stepMs * 0.85)), stagger: 6, instant: false, reduced: reduced.value, click: 0.25 }
    : { flips: 2, flipMs: 70, stagger: 30, instant: false, reduced: reduced.value, click: 0.2 };
  return (
    <>
      <div class={`backlit abs${heat ? ' hot' : ''}`} style={{ left: `${TOTAL_RIGHT - litW + 7}px`, top: '60px', width: `${litW - 7}px`, height: '32px' }} />
      <div class={`total abs${heat ? ' hot' : ''}${total === 0n && !roll ? ' idle' : ''}`}>
        <FlapRow key={layoutOf(text)} text={text} style={TOTAL} motion={motion} minTiles={minTiles} maxWidth={TOTAL_W} unlitPadding class="right" />
      </div>
    </>
  );
}

function MenuButton(): JSX.Element {
  return (
    <button class="menu-btn abs" aria-label="Menu" onClick={() => (sheet.value = 'menu')}>
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <path d="M5 6.5 H15 M5 10 H15 M5 13.5 H15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
  );
}
