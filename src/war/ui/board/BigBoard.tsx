/**
 * The Big Board (SPEC section 10: 0,47,390,60), the goal display, always on show: GOLD n/30 with a
 * 30-segment bar on the left, WAR n/10 with a 10-segment bar on the right, the menu button between
 * them. Ghost segments show what the current pins would do before SEND; at war 8 or 9 the last
 * segments pulse. Both counts are text as well as bars, so colour is never the only signal.
 */
import type { JSX } from 'preact';
import { goalView, type GameState } from '../../engine';
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
  // A miss preview: the WAR bar's next segment blinks; in the final push the board ghosts CEASEFIRE.
  const missing = !!after && after.red > red;
  const ceasefire = !!after && s.phase === 'choose' && s.deal.finalPush && after.gold === gold;
  const danger = warDanger(red, g.warLimit);
  return (
    <div class="layer board-layer">
      <div class="board">
        <i class="rivet" style={{ left: '5px', top: '5px' }} />
        <i class="rivet" style={{ right: '5px', top: '5px' }} />
        <i class="rivet" style={{ left: '5px', bottom: '5px' }} />
        <i class="rivet" style={{ right: '5px', bottom: '5px' }} />
      </div>

      <div class={`goal-count gold abs${glow === 'gold' ? ' glow' : ''}`} style={rectStyle(R.goldCount)} aria-label={`Gold: ${gold} of ${g.goldGoal} regions`}>
        <span class="goal-label">GOLD</span>
        <FlapRow text={String(gold)} style={COUNT} motion={{ flips: 2, flipMs: 70, stagger: 30, instant: false, reduced: reduced.value, click: 0.5 }} minTiles={2} unlitPadding />
        <span class="goal-of num">/{g.goldGoal}</span>
      </div>

      <MenuButton />

      <div
        class={`goal-count war abs${glow === 'war' ? ' glow' : ''}${danger ? ' danger' : ''}`}
        style={rectStyle(R.warCount)}
        aria-label={`War: ${red} of ${g.warLimit} regions`}
      >
        <span class="goal-label">WAR</span>
        <FlapRow text={String(red)} style={COUNT} motion={{ flips: 2, flipMs: 70, stagger: 30, instant: false, reduced: reduced.value, click: 0.5 }} minTiles={2} unlitPadding />
        <span class="goal-of num">/{g.warLimit}</span>
      </div>

      <Bar kind="gold" segs={segments(g.goldGoal, gold, after?.gold ?? null)} glow={glow === 'gold'} />
      <Bar kind="war" segs={segments(g.warLimit, red, after?.red ?? null)} glow={glow === 'war'} danger={danger} blink={missing} />
      {ceasefire && <div class="ceasefire-ghost abs">CEASEFIRE</div>}
    </div>
  );
}

function Bar({ kind, segs, glow, danger = false, blink = false }: { kind: 'gold' | 'war'; segs: Seg[]; glow: boolean; danger?: boolean; blink?: boolean }): JSX.Element {
  const r = kind === 'gold' ? R.goldBar : R.warBar;
  return (
    <div class={`goal-bar ${kind} abs${glow ? ' glow' : ''}${danger ? ' danger' : ''}${blink ? ' blink' : ''}`} style={rectStyle(r)} aria-hidden="true">
      {segs.map((seg, i) => (
        <i key={i} class={`seg ${seg}`} />
      ))}
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
