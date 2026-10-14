/**
 * The Big Board (spec 10: 0,47,390,60): the clock, the crisis and its dots, the Summit chip, the
 * crisis total in split-flap over the target, the Funds coin and the progress rule. On the first
 * night, hints take the leverage module's place. The menu button lives on the clock module so
 * there is always a way home.
 */
import type { JSX } from 'preact';
import { boardLabels, formatShort, type RunState } from '../../engine';
import { Coin } from '../art';
import { boardHint } from '../app/hints';
import { balloon, reduced, sheet } from '../app/store';
import * as A from '../fx/anim';
import { FlapRow, type FlapMotion, type FlapStyle } from './SplitFlap';

const CLOCK: FlapStyle = { w: 12, h: 20, size: 17, gap: 1.5, sep: 6, skin: 'steel' };
const TOTAL: FlapStyle = { w: 21.5, h: 32, size: 28, gap: 2, sep: 6, skin: 'steel' };

export function BigBoard({ s }: { s: RunState }): JSX.Element {
  const b = boardLabels(s);
  const hint = boardHint.value;
  const heat = A.heat.value;
  const cleared = s.crisis.cleared && !A.holdCleared.value;
  const totalNow = A.totalShown.value ?? s.crisis.total;
  const target = s.crisis.target;
  const progress = target > 0n ? Math.min(1, Number((totalNow * 10_000n) / target) / 10_000) : 0;
  const funds = A.fundsShown.value ?? s.funds;

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
        <FlapRow text={b.clock} style={CLOCK} motion={boardMotion(3, 70, 30)} />
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

      {hint ? (
        <BoardHint key={hint.n} text={hint.text} />
      ) : (
        <>
          <div class="label abs" style={{ left: '112px', top: '50px' }}>
            LEVERAGE
          </div>
          <div class={`backlit abs${heat ? ' hot' : ''}`} style={{ left: '128px', top: '60px', width: '108px', height: '32px' }} />
          <div class={`total abs${heat ? ' hot' : ''}`}>
            <TotalTiles s={s} />
          </div>
          <div class="target abs" style={{ fontSize: targetSize(target) }}>
            <span class="slash">/</span>
            <span class="num">{formatShort(target, 7)}</span>
          </div>
          {cleared && <div key={A.clearedStamp.value} class={`stamp-cleared abs${reduced.value ? ' still' : ''}`}>CLEARED</div>}
        </>
      )}

      <div class="funds abs">
        <Coin size={20} class="coin" />
        <span class="amount num">{funds}</span>
      </div>

      <div class={`rule${progress >= 1 ? ' done' : ''}${progress <= 0 ? ' empty' : ''}`}>
        <div class="fill" style={{ width: `${(progress * 100).toFixed(2)}%` }} />
      </div>
    </div>
  );
}

function targetSize(target: bigint): string {
  const len = formatShort(target, 7).length;
  return len <= 5 ? '14px' : len === 6 ? '12.5px' : '11px';
}

function boardMotion(flips: number, flipMs: number, stagger: number): FlapMotion {
  return { flips, flipMs, stagger, instant: false, reduced: reduced.value };
}

/** The leverage tiles: the crisis total, cascading right to left when a sweep lands. */
function TotalTiles({ s }: { s: RunState }): JSX.Element {
  const show = A.boardShow.value;
  const total = A.totalShown.value ?? s.crisis.total;
  const text = show?.text ?? formatShort(total, 7);
  const nTiles = Math.max(5, Array.from(text).filter((c) => c !== ',' && c !== '.').length);
  // A cascade fits its 3 flips per tile, 40 ms apart from the right, into the slam's budget.
  const motion: FlapMotion = show
    ? { flips: 3, flipMs: Math.max(36, (show.ms - 40 * (nTiles - 1)) / 3), stagger: 40, instant: false, reduced: reduced.value }
    : { flips: 2, flipMs: 70, stagger: 30, instant: false, reduced: reduced.value };
  return <FlapRow text={text} style={TOTAL} motion={motion} minTiles={5} maxWidth={124} class="right" />;
}

function BoardHint({ text }: { text: string }): JSX.Element {
  return (
    <div class="board-hint abs" role="status" aria-live="polite">
      <span>{text}</span>
    </div>
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
