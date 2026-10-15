/**
 * The intro's overlay (SPEC section 3): the beat's copy on the coach strip, full width along the
 * map's top edge, and a row at the foot of the map with the tap-to-continue pill (TRY IT on the last
 * screen of a first launch) and SKIP. The whole frame is the tap target (an early tap hurries the
 * lesson); the game underneath is drawn but never touched.
 *
 * Taps act on click, not on press: the last tap opens the rules sheet (How to play), and a sheet
 * opened on press would take that same tap's click on whichever of its buttons lay under the finger.
 */
import type { JSX } from 'preact';
import { finishIntro, introTap, introView } from '../app/intro';
import { R, rectStyle } from '../common/layout';
import { Strip } from '../sheets/Coach';

export function IntroOverlay(): JSX.Element | null {
  const v = introView.value;
  if (!v) return null;
  return (
    <div class="intro-layer" onClick={() => introTap()} role="dialog" aria-label={`How to play, ${v.screen} of 3`}>
      <Strip key={`${v.screen}:${v.text}`} text={v.text} at="map" big />
      {v.replay && (
        <div key={v.replay} class="intro-replay abs" aria-live="polite">
          {v.replay}
        </div>
      )}
      <i class="intro-foot abs" aria-hidden="true" />
      <div class={`intro-next abs${v.tapReady ? ' on' : ''}${v.tapLabel === 'TRY IT' ? ' try' : ''}`} style={rectStyle(R.introNext)} aria-live="polite">
        <span class="dots" aria-label={`${v.screen} of 3`}>
          {[1, 2, 3].map((i) => (
            <i key={i} class={i === v.screen ? 'on' : i < v.screen ? 'done' : ''} />
          ))}
        </span>
        <span class="label">{v.tapLabel}</span>
      </div>
      <button
        class="intro-skip abs"
        style={rectStyle(R.skip)}
        onClick={(e) => {
          e.stopPropagation();
          finishIntro();
        }}
      >
        SKIP
      </button>
    </div>
  );
}
