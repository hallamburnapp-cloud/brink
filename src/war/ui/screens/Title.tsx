/**
 * The title: the war room with its lamp on. The name flaps in on the board, one line says what
 * the game is, a typed card says how to play, and three ways in: NEW NIGHT, and the LATE SHIFT and
 * MID SHIFT tables already set up. The plotting table glows behind it all.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { BRAND } from '../../../config';
import { newRun } from '../../engine';
import { createMap, Glyph, type MapControllerPlus } from '../art';
import { newNight, startSandbox } from '../app/actions';
import { prefs, reduced, sheet } from '../app/store';
import { FlapRow, type FlapStyle } from '../board/SplitFlap';
import { mapViewOf, NO_EXTRAS } from '../table/view';

const WORD: FlapStyle = { w: 50, h: 72, size: 60, gap: 5, sep: 10, skin: 'steel' };

export function Title(): JSX.Element {
  const [word, setWord] = useState(' '.repeat(BRAND.name.length));
  const [muted, setMuted] = useState(audio.isMuted());
  useEffect(() => {
    const t = window.setTimeout(() => setWord(BRAND.name), reduced.value ? 0 : 250);
    return () => clearTimeout(t);
  }, []);
  const first = !prefs.value.playedFirstNight;

  return (
    <div class="title-screen">
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
        <div class="title-kicker">THE WAR-ROOM ROGUELIKE</div>
      </div>
      <p class="premise abs">Each crisis lights eight regions. Pin the shape that holds them, and hold the world until dawn.</p>

      <div class="orders-card abs">
        <div class="oc-head">
          <span>STANDING ORDERS</span>
          <span class="oc-stamp">HOW TO PLAY</span>
        </div>
        <ol>
          <li>
            <b>PIN</b>
            <span>Tap lit regions, up to 5. Pins that touch join up.</span>
          </li>
          <li>
            <b>SHAPE</b>
            <span>The shape they make is the pattern. Bigger shapes score far more.</span>
          </li>
          <li>
            <b>SWEEP</b>
            <span>
              <i class="c-inf-ink">Influence</i> × <i class="c-mom-ink">Momentum</i> must reach the target in 4 sweeps.
            </span>
          </li>
        </ol>
        <div class="oc-ladder">
          <Rung n={2} name="LINK" v="10×2" />
          <Rung n={3} name="CHAIN" v="30×3" />
          <Rung n={4} name="FRONT" v="45×4" />
          <Rung n={5} name="NETWORK" v="70×6" />
        </div>
        <button class="oc-more" onClick={() => (sheet.value = 'howto')}>
          ALL PATTERNS <Glyph name="arrow" size={8} />
        </button>
      </div>

      <button class="brass title-new abs" onClick={newNight}>
        <span class="btn-title">NEW NIGHT</span>
        <span class="btn-sub">{first ? 'The first night · 22:00' : '22:00 · a fresh map'}</span>
      </button>
      <button class="btn-outline title-sand abs" style={{ left: '24px' }} onClick={() => startSandbox('late')}>
        <span class="btn-title">LATE SHIFT</span>
        <span class="btn-sub">a desk at full power</span>
      </button>
      <button class="btn-outline title-sand abs" style={{ left: '199px' }} onClick={() => startSandbox('mid')}>
        <span class="btn-title">MID SHIFT</span>
        <span class="btn-sub">01:00 · three staff</span>
      </button>
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

/** A pattern as dots joined in a row, its base values beside it. */
function Rung({ n, name, v }: { n: number; name: string; v: string }): JSX.Element {
  const w = 8 + (n - 1) * 9;
  return (
    <span class="oc-rung">
      <svg width={w} height="8" viewBox={`0 0 ${w} 8`} aria-hidden="true">
        <path d={`M4 4 H${w - 4}`} stroke="#C4372C" stroke-width="1.4" />
        {Array.from({ length: n }, (_, i) => (
          <circle key={i} cx={4 + i * 9} cy="4" r="2.6" fill="#2A2520" />
        ))}
      </svg>
      <b>{name}</b>
      <span class="num">{v}</span>
    </span>
  );
}

/**
 * Lit on the title: the far south shows in the gap between the orders card and NEW NIGHT, so its
 * glass, pins and names read whole; everything under the card stays dark (a lit name half under
 * the card edge looks like a mistake).
 */
const TITLE_LIT = new Set(['BRN', 'MRM', 'FLE']);
const TITLE_THREADS = [
  { a: 'BRN', b: 'MRM', traffic: 3 },
  { a: 'MRM', b: 'FLE', traffic: 6 },
];

/** The plotting table behind the title: a night already in play, quietly glowing. */
function TitleMap(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current!;
    const map = createMap(c, { reducedMotion: true, speed: 1 }) as MapControllerPlus;
    const view = mapViewOf(newRun('FIRST-NIGHT'), NO_EXTRAS);
    const regions = Object.fromEntries(
      Object.entries(view.regions).map(([id, r]) => [id, { ...r, status: TITLE_LIT.has(id) ? ('lit' as const) : ('dark' as const) }]),
    );
    map.update({ ...view, regions, threads: TITLE_THREADS, flashpoint: null });
    return () => map.destroy();
  }, []);
  return (
    <div class="title-map abs">
      <canvas ref={canvas} style={{ width: '390px', height: '520px' }} aria-hidden="true" />
    </div>
  );
}
