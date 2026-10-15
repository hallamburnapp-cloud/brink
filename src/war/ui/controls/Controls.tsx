/**
 * The controls (SPEC 9: 0,739,390,68): SWAP with what is left of it, the coin chip, and the brass
 * SEND lever whose sub-label always says what will happen ('WINS 2 REGIONS' in gold, 'MISS · SHORT
 * BY 620' in red, 'PIN A REGION' with the lever unlit). A refused tap says why in a toast.
 */
import type { JSX } from 'preact';
import { controlsView, formatInt, type GameState } from '../../engine';
import { Coin } from '../art';
import { above, sendNow, swapNow } from '../app/actions';
import { coach } from '../app/hints';
import * as P from '../app/playback';
import { showToast } from '../app/store';
import { turnOneStep } from '../app/teach';
import { R, rectStyle } from '../common/layout';

export function Controls({ s }: { s: GameState }): JSX.Element {
  const c = controlsView(s);
  const step = turnOneStep(s);
  // The first turn opens SEND only once the pins win (each step enables only what it names).
  const sendOn = c.send.enabled && (!step || step.send);
  const coins = P.coins.value ?? c.coins;
  const beckon = sendOn && !!coach.value?.beckon;
  const onSend = () => {
    if (sendOn) void sendNow();
    else if (s.phase === 'choose') {
      showToast(step && c.send.enabled ? `Beat ${formatInt(s.deal.target)} first: add regions.` : 'Pin a lit region first.', above(R.send));
    }
  };
  return (
    <div class="layer controls-layer">
      <div class="controls" />
      <button
        class={`btn-outline swap abs${c.swap.enabled ? '' : ' off'}`}
        style={rectStyle(R.swap)}
        onClick={() => (c.swap.enabled ? swapNow() : showToast(c.swap.reason ?? 'No swap now.', above(R.swap)))}
        aria-label={`Swap, ${c.swap.sub}`}
      >
        <span class="btn-title">SWAP</span>
        <span class="btn-sub">{c.swap.sub}</span>
      </button>

      <div class="coin-chip abs" style={rectStyle(R.coins)} aria-label={`${coins} coins`}>
        <Coin size={22} class="coin" />
        <span class="amount num">{coins}</span>
      </div>

      <button
        class={`brass send abs${sendOn ? '' : ' disabled'}${P.leverDown.value ? ' pressed' : ''}${beckon ? ' beckon' : ''}`}
        style={rectStyle(R.send)}
        onClick={onSend}
        aria-label={`Send. ${c.send.text}`}
      >
        <span class="btn-title">SEND</span>
        <span class={`send-sub ${c.send.tone}`}>{c.send.text}</span>
      </button>
    </div>
  );
}
