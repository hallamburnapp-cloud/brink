/**
 * The strip (SPEC "The screen", 1): the menu button, DAY n OF 30 on the left and the DANGER gauge
 * on the right: a 200 pt bar from cool blue to red, a needle, the number at the needle and, when a
 * choice moves it, the small delta that floats beside it for a second.
 */
import type { JSX } from 'preact';
import { openMenu } from '../app/actions';
import { R, rectStyle } from '../app/layout';
import { delta, needle, shown, sweep } from '../app/store';
import { deltaText, gaugeColour, needleX, numberX } from './gauge';
import { Glyph } from './icons';

export function Strip(): JSX.Element {
  const s = shown.value;
  const day = s?.day ?? 1;
  const d = needle.value;
  const colour = gaugeColour(d);
  const fl = delta.value;
  return (
    <div class="strip abs" style={rectStyle(R.strip)}>
      <button class="menu-btn abs" style={rectStyle([R.menu[0], R.menu[1] - R.strip[1], R.menu[2], R.menu[3]])} onClick={openMenu} aria-label="Menu">
        <Glyph name="menu" size={18} />
      </button>
      <div class="day abs" style={rectStyle([R.day[0], 0, R.day[2], R.day[3]])}>
        DAY <span class="num">{day}</span> OF 30
      </div>
      <div class={`gauge abs${sweep.value ? ' sweeping' : ''}`} style={rectStyle([R.gauge[0], 0, R.gauge[2], R.gauge[3]])} role="meter" aria-label="Danger" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d}>
        <div class="gauge-label">DANGER</div>
        <div class="gauge-bar">
          <div class="gauge-fill" style={{ width: `${needleX(d)}px` }} />
          <div class="gauge-needle" style={{ left: `${needleX(d)}px`, background: colour }} />
        </div>
        <div class="gauge-number num" style={{ left: `${numberX(d)}px`, color: colour }}>
          {d}
        </div>
        {fl && (
          <div key={fl.key} class={`gauge-delta num ${fl.n < 0 ? 'down' : 'up'}`} style={{ left: `${numberX(d) + (fl.n < 0 ? -34 : 30)}px` }} aria-live="polite">
            {deltaText(fl.n)}
          </div>
        )}
      </div>
    </div>
  );
}
