/**
 * The war room in play: the Big Board (the goal), the staff rail, the map, the readout and the
 * controls, with the shop tray and the end card rising over them when their moment comes, and the
 * intro's overlay on top while it runs.
 */
import type { JSX } from 'preact';
import { introView } from '../app/intro';
import { revealOutcome } from '../app/playback';
import { shown } from '../app/store';
import { BigBoard } from '../board/BigBoard';
import { Briefing } from '../briefing/Briefing';
import { Controls } from '../controls/Controls';
import { StaffRail } from '../rail/StaffRail';
import { Readout } from '../readout/Readout';
import { Balloons, Toast } from '../sheets/Balloons';
import { Coach } from '../sheets/Coach';
import { Table } from '../table/Table';
import { EndCard } from './EndCard';
import { IntroOverlay } from './Intro';

export function Game(): JSX.Element | null {
  const s = shown.value;
  if (!s) return null;
  const reveal = revealOutcome.value;
  const over = s.phase === 'over' && reveal;
  const intro = !!introView.value;
  return (
    <>
      <Table />
      <i class="rail-shadow" />
      {!intro && !over && <Coach at="map" />}
      {!intro && !over && <Coach at="tray" />}
      <i class="trim abs" style={{ top: '689px' }} />
      <BigBoard s={s} />
      <StaffRail s={s} />
      {over ? <QuietConsole /> : <Readout s={s} />}
      {!over && <Controls s={s} />}
      {s.phase === 'shop' && reveal && !intro && <Briefing s={s} />}
      {over && <EndCard s={s} />}
      <Balloons s={s} />
      <Toast />
      <IntroOverlay />
    </>
  );
}

/** After the game: the console rests, empty, under the end card's buttons. */
function QuietConsole(): JSX.Element {
  return (
    <div class="layer controls-layer" aria-hidden="true">
      <div class="readout quiet" />
      <div class="controls" />
    </div>
  );
}
