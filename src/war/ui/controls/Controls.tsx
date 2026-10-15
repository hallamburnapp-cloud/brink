/**
 * The controls (SPEC 9: 0,739,390,68): SWAP with what is left of it, the coin chip, and the brass
 * SEND lever whose sub-label always says what will happen ('WINS 2 REGIONS' in gold, 'MISS · SHORT
 * BY 620' in red, in the final push 'MISS · 2 MISSES LEFT', 'PIN A REGION' with the lever unlit,
 * 'NEXT CRISIS…' between turns). On a dead deal the unlit lever says, in red on two lines, 'NO SEND
 * CAN WIN' and what to do: 'SWAP' (SWAP beckons) while it can bring new regions, else 'SEND TO PASS'
 * ('USES A MISS' in the final push); one pin down and the lever can be pulled. A refused tap says
 * why in a toast. The coach can make SEND or SWAP beckon; during the intro the console rests dimmed
 * until the lesson reaches it.
 */
import type { JSX } from 'preact';
import { controlsView, formatInt, type GameState } from '../../engine';
import { Coin } from '../art';
import { above, sendNow, swapNow } from '../app/actions';
import { coach } from '../app/hints';
import { introView } from '../app/intro';
import * as P from '../app/playback';
import { showToast } from '../app/store';
import { turnOneStep } from '../app/teach';
import { R, rectStyle } from '../common/layout';

/** SWAP's sub-label: 'from turn 2' while it is locked (it never reads as an order to end the turn). */
export function swapSub(s: GameState, sub: string): string {
  return s.phase === 'choose' && s.deal.swapLocked ? 'from turn 2' : sub;
}

export function Controls({ s }: { s: GameState }): JSX.Element {
  const c = controlsView(s);
  const step = turnOneStep(s);
  // While the outcome plays the lever is done with this send: it says what comes next ('NEXT
  // CRISIS…', 'SHOP…'), or nothing once the game has ended, in the off tone.
  const ahead = introView.value ? null : P.ahead.value;
  const between = s.phase === 'outcome' || ahead !== null;
  // The first turn opens SEND only once the pins win (each step enables only what it names).
  const sendOn = !between && c.send.enabled && (!step || step.send);
  const swapOn = !between && c.swap.enabled;
  const coins = P.coins.value ?? c.coins;
  // SWAP beckons while the deal is dead and a swap can still bring new regions, as well as when the coach points at it.
  const beckon = coach.value?.beckon ?? (c.swap.beckon ? 'swap' : null);
  const veil = (introView.value?.console ?? 'live') !== 'live';
  const sendText = ahead === 'shop' ? 'SHOP…' : ahead === 'turn' || s.phase === 'outcome' ? 'NEXT CRISIS…' : between ? '' : c.send.text;
  const onSend = () => {
    if (sendOn) void sendNow();
    else if (s.phase === 'choose') {
      showToast(step && c.send.enabled ? `Beat ${formatInt(s.deal.target)} first: add regions.` : 'Pin a lit region first.', above(R.send));
    }
  };
  const sub = swapSub(s, c.swap.sub);
  const deadSub = !between && c.send.dead && !s.deal.pins.length ? (c.send.text.split(' · ') as [string, string]) : null;
  return (
    <div class={`layer controls-layer${veil ? ' veil' : ''}`}>
      <div class="controls" />
      <button
        class={`btn-outline swap abs${swapOn ? '' : ' off'}${swapOn && beckon === 'swap' ? ' beckon' : ''}`}
        style={rectStyle(R.swap)}
        onClick={() => (swapOn ? swapNow() : !between && showToast(c.swap.reason ?? 'No swap now.', above(R.swap)))}
        aria-label={`Swap, ${sub}`}
      >
        <span class="btn-title">SWAP</span>
        <span class="btn-sub">{sub}</span>
      </button>

      <div class="coin-chip abs" style={rectStyle(R.coins)} aria-label={`${coins} coins`}>
        <Coin size={22} class="coin" />
        <span class="amount num">{coins}</span>
      </div>

      <button
        class={`brass send abs${sendOn ? '' : ' disabled'}${P.leverDown.value ? ' pressed' : ''}${sendOn && beckon === 'send' ? ' beckon' : ''}`}
        style={rectStyle(R.send)}
        onClick={onSend}
        aria-label={`Send. ${sendText}`}
      >
        <span class="btn-title">SEND</span>
        {deadSub ? (
          // A dead deal before any pin: the news, then what to do about it, on two lines.
          <span class={`send-sub ${c.send.tone} dead`}>
            <span class="dead-news">{deadSub[0]}</span>
            <span class="dead-act">{deadSub[1]}</span>
          </span>
        ) : (
          <span class={`send-sub ${between ? 'off' : c.send.tone}`}>{sendText}</span>
        )}
      </button>
    </div>
  );
}
