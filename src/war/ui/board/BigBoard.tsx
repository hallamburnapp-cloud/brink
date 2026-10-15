/**
 * The Big Board (SPEC section 10: 0,47,390,60), the goal display, always on show: GOLD n/30 with a
 * 30-segment bar on the left, WAR n/10 with a 10-segment bar on the right, the menu button between
 * them. Ghost segments show what the current pins would do before SEND; at war 8 or 9 the last
 * segments pulse. Both counts are text as well as bars, so colour is never the only signal. In the
 * final push three lamps beside WAR, between 'PUSH' and 'MISSES LEFT', count the misses left like
 * lives: a miss preview blinks the lamp it would put out (on the last one the board also ghosts
 * CEASEFIRE over the WAR bar).
 */
import type { JSX } from 'preact';
import { goalView, type GameState } from '../../engine';
import { introView } from '../app/intro';
import * as P from '../app/playback';
import { reduced, sheet } from '../app/store';
import { R, rectStyle } from '../common/layout';
import { segments, warDanger, type Seg } from './bars';
import { FlapRow, type FlapStyle } from './SplitFlap';

const COUNT: FlapStyle = { w: 17, h: 26, size: 22, gap: 1.5, sep: 5, skin: 'steel' };

export function BigBoard({ s }: { s: GameState }): JSX.Element {
  const g = goalView(s);
  const shownGoal = P.goal.value;
  const gold = shownGoal?.gold ?? g.gold;
  const red = shownGoal?.red ?? g.red;
  // Ghosts only while choosing, and never while the outcome is being counted.
  const after = shownGoal ? null : g.after;
  const glow = P.goalGlow.value;
  // A miss preview: the WAR bar's next segment blinks. In the final push a miss puts out one of the
  // push's lamps (it blinks); on the last one the board ghosts CEASEFIRE.
  const missing = !!after && after.red > red;
  const pushMiss = !!after && s.phase === 'choose' && s.deal.finalPush && after.gold === gold;
  const misses = P.pushMisses.value ?? s.pushMisses;
  const ceasefire = pushMiss && !!g.push && misses + 1 >= g.push.limit;
  const danger = warDanger(red, g.warLimit);
  // The intro's gold wave steps the count fast: the flaps set each step at once (rolling through
  // the digits between would read '36/30' for a frame). Otherwise the count moves one region at a
  // time with every tile in step (atomic, no stagger): 9 → 10 never reads '19/10' on the way.
  const instant = introView.value?.screen === 1;
  const motion = { flips: 1, flipMs: 90, stagger: 0, atomic: true, instant, reduced: reduced.value, click: 0.5 };
  // How the game ended, from the ending's first beat: WORLD UNITED glows the whole GOLD bar; a
  // CEASEFIRE freezes the WAR bar in its ceased tone, stamped STOPPED.
  const ahead = introView.value ? null : P.ahead.value;
  const ending = ahead === 'WORLD UNITED' || ahead === 'CEASEFIRE' || ahead === 'WAR' ? ahead : s.ending;
  const united = ending === 'WORLD UNITED';
  const ceased = ending === 'CEASEFIRE';
  return (
    <div class="layer board-layer">
      <div class="board">
        <i class="rivet" style={{ left: '5px', top: '5px' }} />
        <i class="rivet" style={{ right: '5px', top: '5px' }} />
        <i class="rivet" style={{ left: '5px', bottom: '5px' }} />
        <i class="rivet" style={{ right: '5px', bottom: '5px' }} />
      </div>

      <div
        class={`goal-count gold abs${glow === 'gold' || united ? ' glow' : ''}${united ? ' united' : ''}`}
        style={rectStyle(R.goldCount)}
        aria-label={`Gold: ${gold} of ${g.goldGoal} regions`}
      >
        <span class="goal-label">GOLD</span>
        <FlapRow text={String(gold)} style={COUNT} motion={motion} minTiles={2} unlitPadding />
        <span class="goal-of num">/{g.goldGoal}</span>
      </div>

      <MenuButton />

      <div
        class={`goal-count war abs${glow === 'war' ? ' glow' : ''}${danger && !ceased ? ' danger' : ''}${ceased ? ' ceased' : ''}`}
        style={rectStyle(R.warCount)}
        aria-label={`War: ${red} of ${g.warLimit} regions`}
      >
        <span class="goal-label">WAR</span>
        <FlapRow text={String(red)} style={COUNT} motion={motion} minTiles={2} unlitPadding />
        <span class="goal-of num">/{g.warLimit}</span>
      </div>

      {g.push && <PushLamps misses={misses} limit={g.push.limit} blink={pushMiss} />}

      <Bar kind="gold" segs={segments(g.goldGoal, gold, after?.gold ?? null)} glow={glow === 'gold'} extra={united ? 'united' : ''} />
      <Bar kind="war" segs={segments(g.warLimit, red, after?.red ?? null)} glow={glow === 'war'} danger={danger && !ceased} blink={missing} extra={ceased ? 'ceased' : ''} />
      {ceasefire && <div class="ceasefire-ghost abs">CEASEFIRE</div>}
      {ceased && (
        <div class="war-stopped abs" role="status">
          STOPPED
        </div>
      )}
    </div>
  );
}

function Bar({
  kind,
  segs,
  glow,
  danger = false,
  blink = false,
  extra = '',
}: {
  kind: 'gold' | 'war';
  segs: Seg[];
  glow: boolean;
  danger?: boolean;
  blink?: boolean;
  /** 'united': a shimmer runs the length of the full bar; 'ceased': the war's bar stops, dimmed. */
  extra?: '' | 'united' | 'ceased';
}): JSX.Element {
  const r = kind === 'gold' ? R.goldBar : R.warBar;
  return (
    <div class={`goal-bar ${kind} abs${glow ? ' glow' : ''}${danger ? ' danger' : ''}${blink ? ' blink' : ''}${extra ? ` ${extra}` : ''}`} style={rectStyle(r)} aria-hidden="true">
      {segs.map((seg, i) => (
        <i key={i} class={`seg ${seg}`} />
      ))}
    </div>
  );
}

/**
 * The final push's lamps, read as lives: 'PUSH' over one lamp per miss the push allows, 'MISSES LEFT'
 * under them. A miss still left is lit bright gold-white; a spent one is red-hatched, used up from the
 * right. `blink`: the pins would miss, so the next lamp to go out blinks.
 */
function PushLamps({ misses, limit, blink }: { misses: number; limit: number; blink: boolean }): JSX.Element {
  const left = Math.max(0, limit - misses);
  const label = left === 0 ? 'PUSH · MISSES LEFT: none' : `PUSH · MISSES LEFT: ${left} of ${limit}; the last is a ceasefire`;
  return (
    <div class="push-lamps abs" style={rectStyle(R.pushLamps)} role="status" aria-label={label}>
      <span class="push-cap">PUSH</span>
      <span class="push-row">
        {Array.from({ length: limit }, (_, i) => {
          const lit = i < left;
          const next = blink && i === left - 1;
          return <i key={i} class={`lamp${lit ? ' lit' : ' out'}${next ? ' next' : ''}`} />;
        })}
      </span>
      <span class="push-cap sub">MISSES LEFT</span>
    </div>
  );
}

function MenuButton(): JSX.Element {
  return (
    <button class="menu-btn abs" style={rectStyle(R.menu)} aria-label="Menu" onClick={() => (sheet.value = 'menu')}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <path d="M4.5 6 H15.5 M4.5 10 H15.5 M4.5 14 H15.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
    </button>
  );
}
