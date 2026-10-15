/**
 * Sheets over the war room (SPEC section 11): the menu (always one tap away on the Big Board, and
 * on the back button and Esc), the quit confirmation, the rules ('How to play', section 2's copy
 * word for word) with PRACTICE, and NEW GAME's confirmation when a saved game would be lost.
 */
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { menuView, type GameState } from '../../engine';
import { Glyph } from '../art';
import { howToPlay, newGameNow, practice, quitToTitle } from '../app/actions';
import { MARKS_COPY, RULES_COPY } from '../app/copy';
import { Rich } from '../common/text';
import { prefs, reduced, screen, setPrefs, sheet, unsaved } from '../app/store';

function stop(e: Event): void {
  e.stopPropagation();
}

export function Sheets({ s }: { s: GameState | null }): JSX.Element | null {
  const which = sheet.value;
  if (!which) return null;
  // Only a tap on the scrim itself closes: a click that swapped one sheet for another must not.
  const close = (e: MouseEvent) => {
    if (e.target === e.currentTarget) sheet.value = null;
  };
  return (
    <div class="scrim" onPointerDown={stop} onClick={close}>
      {which === 'menu' && <Menu s={s} />}
      {which === 'quit' && <QuitConfirm />}
      {which === 'rules' && <Rules />}
      {which === 'newgame' && <NewGameConfirm />}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  label: string;
}): JSX.Element {
  return (
    <div class="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} role="radio" aria-checked={v === value} class={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Menu({ s }: { s: GameState | null }): JSX.Element {
  const [muted, setMuted] = useState(audio.isMuted());
  const p = prefs.value;
  const inGame = screen.value === 'game' && !!s;
  return (
    <div class="sheet menu" onClick={stop} role="dialog" aria-label="Menu">
      <div class="sheet-head">
        <span class="sheet-title">{inGame ? 'MENU' : 'SETTINGS'}</span>
        <button class="icon-btn" aria-label="Close" onClick={() => (sheet.value = null)}>
          <Glyph name="close" size={16} />
        </button>
      </div>
      {inGame && s && <div class="menu-line num">{menuView(s).line}</div>}
      {inGame && (
        <button class="brass wide" onClick={() => (sheet.value = null)}>
          <span class="btn-title">RESUME</span>
        </button>
      )}
      <button class="row-btn" onClick={howToPlay}>
        <span>HOW TO PLAY</span>
        <Glyph name="arrow" size={10} />
      </button>
      <div class="setting">
        <span class="setting-name">SOUND</span>
        <Segmented
          label="Sound"
          value={muted ? 'off' : 'on'}
          options={[
            ['on', 'ON'],
            ['off', 'OFF'],
          ]}
          onChange={(v) => {
            audio.unlock();
            audio.setMuted(v === 'off');
            setMuted(v === 'off');
          }}
        />
      </div>
      <div class="setting">
        <span class="setting-name">SPEED</span>
        <Segmented
          label="Speed"
          value={p.speed}
          options={[
            [1, '1×'],
            [2, '2×'],
            [4, '4×'],
          ]}
          onChange={(v) => setPrefs({ speed: v })}
        />
      </div>
      <div class="setting">
        <span class="setting-name">REDUCED MOTION</span>
        <Segmented
          label="Reduced motion"
          value={reduced.value ? 'reduce' : 'full'}
          options={[
            ['reduce', 'ON'],
            ['full', 'OFF'],
          ]}
          onChange={(v) => setPrefs({ motion: v })}
        />
      </div>
      {inGame && (
        <button class="row-btn alarm" onClick={() => (sheet.value = 'quit')}>
          <span>QUIT TO TITLE</span>
          <Glyph name="home" size={14} />
        </button>
      )}
    </div>
  );
}

function QuitConfirm(): JSX.Element {
  // A practice over a game in progress is never saved: the game under it is what CONTINUE finds.
  const practice = unsaved.value;
  return (
    <div class="sheet confirm" onClick={stop} role="alertdialog" aria-label="Leave this game?">
      <div class="sheet-title">{practice ? 'LEAVE PRACTICE?' : 'LEAVE THIS GAME?'}</div>
      <p class="sheet-line">
        {practice ? 'Practice is not saved. CONTINUE on the title picks up your game.' : 'Your game is saved. CONTINUE on the title picks it up.'}
      </p>
      <div class="confirm-row">
        <button class="btn-outline" onClick={() => (sheet.value = 'menu')}>
          <span class="btn-title">STAY</span>
        </button>
        <button class="btn-outline leave" onClick={quitToTitle}>
          <span class="btn-title">LEAVE</span>
        </button>
      </div>
    </div>
  );
}

/** NEW GAME over a saved game in progress: asked once, so a tap never loses a game. */
function NewGameConfirm(): JSX.Element {
  return (
    <div class="sheet confirm" onClick={stop} role="alertdialog" aria-label="Start a new game?">
      <div class="sheet-title">START A NEW GAME?</div>
      <p class="sheet-line">Your game in progress will be lost.</p>
      <div class="confirm-row">
        <button class="btn-outline" onClick={() => (sheet.value = null)}>
          <span class="btn-title">KEEP MY GAME</span>
        </button>
        <button class="btn-outline leave" onClick={newGameNow}>
          <span class="btn-title">NEW GAME</span>
        </button>
      </div>
    </div>
  );
}

/** The colour words keep their colours in the rules: gold is yours, red is war, grey is free. */
function Coloured({ text }: { text: string }): JSX.Element {
  const parts = text.split(/\b(gold|red|grey|war)\b/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} class={`w-${p === 'war' ? 'red' : p}`}>
            {p}
          </b>
        ) : (
          <Rich key={i} text={p} size={11} />
        ),
      )}
    </>
  );
}

function Rules(): JSX.Element {
  const [goal, ...rest] = RULES_COPY;
  // Opened from a game, BACK to it is the bright button; PRACTICE is the quiet one (it never loses
  // the game in progress either way: practice over it is not saved).
  const inGame = screen.value === 'game';
  const back = () => (sheet.value = inGame ? 'menu' : null);
  return (
    <div class="sheet rules" onClick={stop} role="dialog" aria-label="How to play">
      <div class="sheet-head">
        <span class="sheet-title">HOW TO PLAY</span>
        <button class="icon-btn" aria-label="Close" onClick={back}>
          <Glyph name="close" size={16} />
        </button>
      </div>
      <p class="rules-goal">
        <Coloured text={goal} />
      </p>
      <ol class="steps">
        {rest.map((line) => (
          <li key={line}>
            <Coloured text={line} />
          </li>
        ))}
      </ol>
      <p class="rules-marks">
        <Rich text={MARKS_COPY} size={11} />
      </p>
      <div class="confirm-row">
        {inGame ? (
          <>
            <button class="btn-outline" onClick={practice}>
              <span class="btn-title">PRACTICE</span>
            </button>
            <button class="brass" onClick={back}>
              <span class="btn-title">BACK</span>
            </button>
          </>
        ) : (
          <>
            <button class="btn-outline" onClick={back}>
              <span class="btn-title">CLOSE</span>
            </button>
            <button class="brass" onClick={practice}>
              <span class="btn-title">PRACTICE</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
