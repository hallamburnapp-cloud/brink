/**
 * Sheets over the war room: the menu (always one tap away on the Big Board), Run Info (the
 * pattern ladder, from the readout), How to play, and the quit confirmation.
 */
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { audio } from '../../../audio';
import { boardLabels, formatShort, patternTable, type RunState } from '../../engine';
import { PATTERN, PATTERNS } from '../../content/patterns';
import { Glyph } from '../art';
import { quitToTitle } from '../app/actions';
import { prefs, reduced, screen, setPrefs, sheet } from '../app/store';

function stop(e: Event): void {
  e.stopPropagation();
}

export function Sheets({ s }: { s: RunState | null }): JSX.Element | null {
  const which = sheet.value;
  if (!which) return null;
  // Only a tap on the scrim itself closes: a click that swapped one sheet for another must not.
  const close = (e: MouseEvent) => {
    if (e.target === e.currentTarget) sheet.value = null;
  };
  return (
    <div class="scrim" onPointerDown={stop} onClick={close}>
      {which === 'menu' && <Menu />}
      {which === 'quit' && <QuitConfirm />}
      {which === 'howto' && <HowTo onClose={() => (sheet.value = screen.value === 'game' ? 'menu' : null)} />}
      {which === 'runinfo' && s && <RunInfo s={s} />}
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

function Menu(): JSX.Element {
  const [muted, setMuted] = useState(audio.isMuted());
  const p = prefs.value;
  const inGame = screen.value === 'game';
  return (
    <div class="sheet menu" onClick={stop} role="dialog" aria-label="Menu">
      <div class="sheet-head">
        <span class="sheet-title">WAR ROOM</span>
        <button class="icon-btn" aria-label="Close" onClick={() => (sheet.value = null)}>
          <Glyph name="close" size={16} />
        </button>
      </div>
      {inGame && (
        <button class="brass wide" onClick={() => (sheet.value = null)}>
          <span class="btn-title">RESUME</span>
        </button>
      )}
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
        <span class="setting-name">MOTION</span>
        <Segmented
          label="Motion"
          value={reduced.value ? 'reduce' : 'full'}
          options={[
            ['full', 'FULL'],
            ['reduce', 'REDUCED'],
          ]}
          onChange={(v) => setPrefs({ motion: v })}
        />
      </div>
      <button class="row-btn" onClick={() => (sheet.value = 'howto')}>
        <span>HOW TO PLAY</span>
        <Glyph name="arrow" size={10} />
      </button>
      {inGame && (
        <button class="row-btn" onClick={() => (sheet.value = 'runinfo')}>
          <span>PATTERNS AND LEVELS</span>
          <Glyph name="arrow" size={10} />
        </button>
      )}
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
  return (
    <div class="sheet confirm" onClick={stop} role="alertdialog" aria-label="Quit this night?">
      <div class="sheet-title">QUIT THIS NIGHT?</div>
      <p class="sheet-line">The run ends here. Nothing is saved.</p>
      <div class="confirm-row">
        <button class="btn-outline" onClick={() => (sheet.value = null)}>
          <span class="btn-title">STAY</span>
        </button>
        <button class="btn-outline alarm" onClick={quitToTitle}>
          <span class="btn-title">QUIT</span>
        </button>
      </div>
    </div>
  );
}

function RunInfo({ s }: { s: RunState }): JSX.Element {
  const rows = patternTable(s);
  const b = boardLabels(s);
  const best = s.best;
  return (
    <div class="sheet runinfo" onClick={() => (sheet.value = null)} role="dialog" aria-label="Run Info">
      <div class="sheet-head">
        <span class="sheet-title">PATTERNS</span>
        <span class="sheet-sub num">
          {b.hour} · {b.crisis}
        </span>
        <button class="icon-btn" aria-label="Close" onClick={() => (sheet.value = null)}>
          <Glyph name="close" size={16} />
        </button>
      </div>
      <div class="ladder">
        {rows.map((r) => (
          <div key={r.id} class={`rung${r.hidden ? ' secret' : ''}${r.made ? ' made' : ''}`}>
            <span class="rung-name">{r.name}</span>
            <span class="rung-shape">{r.hidden ? 'A secret shape. Find it on the map.' : r.shape}</span>
            <span class="rung-lv num">{r.hidden ? '' : `Lv ${r.level}`}</span>
            <span class="rung-val num">
              {r.hidden ? (
                <span class="c-muted">??? × ???</span>
              ) : (
                <>
                  <span class="c-inf">{r.influence}</span>
                  <span class="c-muted"> × </span>
                  <span class="c-mom">{r.momentum}</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <div class="sheet-foot">
        {best ? (
          <span>
            BEST SWEEP <b>{PATTERN[best.pattern].name}</b> <span class="num">{formatShort(best.leverage, 9)}</span>
          </span>
        ) : (
          <span>Your pins score as their best pattern: the biggest Influence × Momentum.</span>
        )}
      </div>
    </div>
  );
}

/** How to play: three steps, then every public rung of the ladder with the shape it takes. */
export function HowTo({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div class="sheet howto" onClick={stop} role="dialog" aria-label="How to play">
      <div class="sheet-head">
        <span class="sheet-title">HOW TO PLAY</span>
        <button class="icon-btn" aria-label="Close" onClick={onClose}>
          <Glyph name="close" size={16} />
        </button>
      </div>
      <ol class="steps">
        <li>
          <b>Pin lit regions.</b> Each crisis lights 8: tap up to 5. A region's number adds to{' '}
          <span class="c-inf">Influence</span>. The red ring scores twice.
        </li>
        <li>
          <b>Make a shape.</b> Neighbours join by border, bridge or sea lane. The shape is the pattern. Bigger shapes multiply.
        </li>
        <li>
          <b>Sweep.</b> <span class="c-inf">Influence</span> × <span class="c-mom">Momentum</span> adds to your total. Reach the
          target in 4 sweeps, or the world tips. Green lamp: this sweep clears it. SWAP spends pinned regions and lights new ones.
        </li>
        <li>
          <b>Staff and threads.</b> Staff fire seat 1 to 5: put × staff after + staff (hold one and drag). Each sweep wears a
          thread between joined pins; join along it again and it adds its traffic.
        </li>
        <li>
          <b>The Briefing.</b> A clear pays Funds: hire staff, file Orders (stamps for the map) and Playbooks (pattern levels).
        </li>
      </ol>
      <div class="mini-ladder">
        {PATTERNS.filter((p) => !p.secret).map((p) => (
          <div key={p.id} class="mini-rung">
            <span class="rung-name">{p.name}</span>
            <span class="rung-val num">
              <span class="c-inf">{p.baseInfluence}</span>
              <span class="c-muted"> × </span>
              <span class="c-mom">{p.baseMomentum}</span>
            </span>
            <span class="rung-shape">{p.shape}</span>
          </div>
        ))}
        <div class="mini-rung secret">
          <span class="rung-name">??? · ???</span>
          <span class="rung-val num c-muted">two secrets</span>
          <span class="rung-shape">Found by redrawing the map.</span>
        </div>
      </div>
      <p class="sheet-line">Hold until 01:00: three hours, nine crises.</p>
    </div>
  );
}
