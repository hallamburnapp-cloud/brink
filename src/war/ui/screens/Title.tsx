/**
 * The title (SPEC section 9): the product name on the board, 'WIN THE WORLD' under it, one line
 * that says what the game is, the world as every game starts (Lantern Key gold, war on three
 * regions) glowing behind, and the ways in: PLAY (or CONTINUE and NEW GAME when a game is saved),
 * HOW TO PLAY and, in review builds only (SPEC 13), the CROWN DEMO.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { BRAND } from '../../../config';
import { goalView, newGame } from '../../engine';
import { WAR_META } from '../../meta';
import { createMap, Glyph } from '../art';
import { askNewGame, continueGame, crownDemo, howToPlay, play } from '../app/actions';
import { prefs, reduced, saved, sheet } from '../app/store';
import { readSave } from '../app/storage';
import { FlapRow, type FlapStyle } from '../board/SplitFlap';
import { mapViewFor, NO_EXTRAS } from '../table/view';

const WORD: FlapStyle = { w: 50, h: 72, size: 60, gap: 5, sep: 10, skin: 'steel' };

/** Review builds (development, and VITE_WAR_REVIEW=1 such as the owner's page) offer the CROWN DEMO. */
const REVIEW = import.meta.env.DEV || import.meta.env.VITE_WAR_REVIEW === '1';

/**
 * `leaving`: the war room is already mounted underneath (the title is its curtain until the table
 * has drawn); `lifting`: the curtain fades away.
 */
export function Title({ leaving = false, lifting = false }: { leaving?: boolean; lifting?: boolean }): JSX.Element {
  const [word, setWord] = useState(' '.repeat(BRAND.name.length));
  const [muted, setMuted] = useState(audio.isMuted());
  useEffect(() => {
    const t = window.setTimeout(() => setWord(BRAND.name), reduced.value ? 0 : 250);
    return () => clearTimeout(t);
  }, []);
  // While the title is the curtain over a game that has just started (which saves it), it keeps
  // the buttons it was tapped on: PLAY never turns into CONTINUE as it fades.
  const savedShown = useRef(saved.value);
  if (!leaving) savedShown.current = saved.value;
  const hasSave = savedShown.current;
  const first = !prefs.value.playedFirst;
  // Without the demo button the stack sits a little lower, nearer the thumb.
  const y = (top: number) => `${top + (REVIEW ? 0 : 24)}px`;

  return (
    <div class={`title-screen${leaving ? ' leaving' : ''}${lifting ? ' lifting' : ''}${hasSave ? ' saved' : ''}`} aria-hidden={leaving ? 'true' : undefined}>
      <TitleMap />
      <div class="title-veil" />
      <div class="title-board abs">
        <i class="rivet" style={{ left: '6px', top: '6px' }} />
        <i class="rivet" style={{ right: '6px', top: '6px' }} />
        <i class="rivet" style={{ left: '6px', bottom: '6px' }} />
        <i class="rivet" style={{ right: '6px', bottom: '6px' }} />
        <div class="backlit word-light" />
        <div class="word">
          <FlapRow text={word} style={WORD} motion={{ flips: 5, flipMs: 70, stagger: 70, instant: false, reduced: reduced.value }} />
        </div>
        <div class="title-kicker">WIN THE WORLD</div>
      </div>
      <p class="premise abs">{WAR_META.tagline}</p>
      <Legend />

      {hasSave ? (
        <>
          <button class="brass title-main abs" style={{ top: y(548) }} onClick={continueGame}>
            <span class="btn-title">CONTINUE</span>
            <span class="btn-sub">{saveLine()}</span>
          </button>
          <button class="btn-outline title-btn abs" style={{ top: y(614) }} onClick={askNewGame}>
            <span class="btn-title">NEW GAME</span>
          </button>
        </>
      ) : (
        <button class="brass title-main abs" style={{ top: y(596) }} onClick={play}>
          <span class="btn-title">PLAY</span>
          <span class="btn-sub">{first ? 'A short how-to, then your first world' : 'A new world'}</span>
        </button>
      )}
      <button class="btn-outline title-btn abs" style={{ top: y(668) }} onClick={howToPlay}>
        <span class="btn-title">HOW TO PLAY</span>
      </button>
      {REVIEW && (
        <button class="btn-outline title-btn demo abs" style={{ top: '722px' }} onClick={crownDemo}>
          <span class="btn-title">CROWN DEMO</span>
          <span class="btn-sub">one huge turn, set up</span>
        </button>
      )}
      <div class="title-foot abs">
        <button
          class="foot-btn"
          onClick={() => {
            audio.unlock();
            audio.setMuted(!muted);
            setMuted(!muted);
          }}
          aria-label={muted ? 'Sound off' : 'Sound on'}
        >
          <Glyph name={muted ? 'soundOff' : 'soundOn'} size={14} />
          <span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span>
        </button>
        <button class="foot-btn" onClick={() => (sheet.value = 'menu')} aria-label="Settings">
          <Glyph name="settings" size={14} />
          <span>SETTINGS</span>
        </button>
      </div>
    </div>
  );
}

/** 'Turn 9 · Gold 14 · War 4' for the CONTINUE button ('See how it ended' for a finished game). */
function saveLine(): string {
  const s = readSave();
  if (!s) return '';
  if (s.phase === 'over') return 'See how your world ended';
  const g = goalView(s);
  return `Turn ${s.turn} · Gold ${g.gold} · War ${g.red}`;
}

/** The three colours, said once on the title: what the map means at a glance. */
function Legend(): JSX.Element {
  return (
    <div class="title-legend abs" aria-label="Gold is yours, red is war, grey is free">
      <span class="lg gold">
        <i />
        GOLD · yours
      </span>
      <span class="lg red">
        <i />
        RED · war
      </span>
      <span class="lg grey">
        <i />
        GREY · free
      </span>
    </div>
  );
}

/** The world every game starts from, glowing behind the title. */
function TitleMap(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  // The lamp comes on once the table has drawn: it fades in, never pops in after a dark hole.
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const map = createMap(canvas.current!, { reducedMotion: true, speed: 1 });
    map.update(mapViewFor(newGame('FIRST-WORLD'), { ...NO_EXTRAS, calm: true }));
    let live = true;
    void map.ready().then(() => live && setLit(true));
    return () => {
      live = false;
      map.destroy();
    };
  }, []);
  return (
    <div class={`title-map abs${lit ? ' lit' : ''}`}>
      <canvas ref={canvas} style={{ width: '390px', height: '520px' }} aria-hidden="true" />
    </div>
  );
}
