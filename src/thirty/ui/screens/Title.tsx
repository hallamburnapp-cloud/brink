/**
 * The title: nothing but the name, the title line, PLAY (or CONTINUE, with NEW GAME under it) and
 * HOW TO PLAY, over the world as it stands, dimmed.
 */
import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { BRAND } from '../../../config';
import { continueGame, howToPlay, newGameNow, play } from '../app/actions';
import { content, HOME_CAPITAL, newGame } from '../app/engine';
import { R, rectStyle } from '../app/layout';
import { saved } from '../app/store';
import { readSave } from '../app/storage';
import { createMap, MAP_H, MAP_W } from '../map';

export function Title(): JSX.Element {
  const hasSave = saved.value;
  const save = hasSave ? readSave() : null;
  const sub = save ? (save.phase === 'over' ? 'See how it ended' : `Day ${save.day} of 30`) : null;
  return (
    <div class="title abs" style={rectStyle([0, 0, 390, 844])}>
      <TitleMap />
      <div class="title-veil abs" />
      <div class="title-words abs">
        <div class="title-name">{BRAND.name}</div>
        <div class="title-line">THIRTY DAYS</div>
      </div>
      <div class="title-buttons abs">
        {hasSave ? (
          <>
            <button class="main-btn big" onClick={continueGame}>
              <span>CONTINUE</span>
              {sub && <small>{sub}</small>}
            </button>
            <button class="quiet-btn" onClick={newGameNow}>
              NEW GAME
            </button>
          </>
        ) : (
          <button class="main-btn big" onClick={play}>
            <span>PLAY</span>
          </button>
        )}
        <button class="quiet-btn" onClick={howToPlay}>
          HOW TO PLAY
        </button>
      </div>
    </div>
  );
}

/** The world behind the title: the saved game's map, or a fresh one. */
function TitleMap(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const map = createMap(canvas.current!, { reducedMotion: true });
    const s = readSave() ?? newGame(content, 'A-SAMPLE-WORLD');
    map.update({ heats: s.heats, ring: null, targets: [], home: HOME_CAPITAL, pressed: null });
    return () => map.destroy();
  }, []);
  return (
    <div class="title-map abs" style={rectStyle(R.map)}>
      <canvas ref={canvas} style={{ width: `${MAP_W}px`, height: `${MAP_H}px` }} aria-hidden="true" />
    </div>
  );
}
