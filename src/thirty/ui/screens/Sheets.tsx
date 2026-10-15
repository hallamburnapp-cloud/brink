/**
 * The menu (the ≡ button, the back button, Esc): RESUME, HOW TO PLAY, SOUND, QUIT TO TITLE; and
 * the quit confirmation: 'Leave this game? It is saved.'
 */
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { howToPlay, quitToTitle, toggleSound } from '../app/actions';
import { Glyph } from '../parts/icons';
import { run, sheet } from '../app/store';

function stop(e: Event): void {
  e.stopPropagation();
}

export function Sheets(): JSX.Element | null {
  const which = sheet.value;
  if (!which) return null;
  const close = (e: MouseEvent) => {
    if (e.target === e.currentTarget) sheet.value = null;
  };
  return (
    <div class="scrim abs" onPointerDown={stop} onClick={close}>
      {which === 'menu' ? <Menu /> : <QuitConfirm />}
    </div>
  );
}

function Menu(): JSX.Element {
  const [muted, setMuted] = useState(audio.isMuted());
  const inGame = run.value !== null;
  return (
    <div class="sheet" onClick={stop} role="dialog" aria-label="Menu">
      <div class="sheet-head">
        <span class="sheet-title">MENU</span>
        <button class="icon-btn" aria-label="Close" onClick={() => (sheet.value = null)}>
          <Glyph name="close" size={16} />
        </button>
      </div>
      {inGame && (
        <button class="main-btn wide" onClick={() => (sheet.value = null)}>
          RESUME
        </button>
      )}
      <button class="row-btn" onClick={howToPlay}>
        HOW TO PLAY
      </button>
      <button class="row-btn" onClick={() => setMuted(toggleSound())} aria-pressed={!muted}>
        <span>SOUND</span>
        <span class="row-value">{muted ? 'OFF' : 'ON'}</span>
      </button>
      {inGame && (
        <button class="row-btn leave" onClick={() => (sheet.value = 'quit')}>
          QUIT TO TITLE
        </button>
      )}
    </div>
  );
}

function QuitConfirm(): JSX.Element {
  return (
    <div class="sheet confirm" onClick={stop} role="alertdialog" aria-label="Leave this game?">
      <div class="sheet-title">LEAVE THIS GAME?</div>
      <p class="sheet-line">It is saved. CONTINUE on the title picks it up.</p>
      <div class="pair">
        <button class="main-btn" onClick={() => (sheet.value = 'menu')}>
          STAY
        </button>
        <button class="quiet-btn" onClick={quitToTitle}>
          LEAVE
        </button>
      </div>
    </div>
  );
}
