/**
 * The war room in play: Big Board, staff rail, plotting table, readout and controls, with the
 * Briefing tray and the end report rising over them when their moment comes.
 */
import type { JSX } from 'preact';
import type { RunState } from '../../engine';
import { quitToTitle } from '../app/actions';
import { shown } from '../app/store';
import { BigBoard } from '../board/BigBoard';
import { Briefing } from '../briefing/Briefing';
import { ControlHint, Controls } from '../controls/Controls';
import { revealOutcome } from '../fx/anim';
import { StaffRail } from '../rail/StaffRail';
import { Readout } from '../readout/Readout';
import { Balloons, Toast } from '../sheets/Balloons';
import { Table } from '../table/Table';
import { EndCard } from './EndCard';
import { Glyph } from '../art';

export function Game(): JSX.Element | null {
  const s = shown.value;
  if (!s) return null;
  const over = s.phase === 'missed' || s.phase === 'sliceEnd';
  const reveal = revealOutcome.value;
  return (
    <>
      <Table />
      <i class="rail-shadow" />
      <i class="trim abs" style={{ top: '689px' }} />
      <BigBoard s={s} />
      <StaffRail s={s} />
      {over && reveal ? <EndConsole s={s} /> : <Readout s={s} />}
      {over && reveal ? null : <Controls s={s} />}
      {s.phase === 'briefing' && reveal && <Briefing s={s} />}
      {over && reveal && <EndCard s={s} />}
      <Balloons s={s} />
      <ControlHint />
      <Toast />
    </>
  );
}

/** After the night: the console offers the way home. */
function EndConsole({ s }: { s: RunState }): JSX.Element {
  return (
    <div class="layer controls-layer">
      <div class="readout quiet" />
      <span class="quiet-line abs">{s.phase === 'missed' ? 'The lights are out on the table.' : 'Dawn is coming up over the table.'}</span>
      <div class="controls" />
      <button class="btn-outline abs home-btn" onClick={quitToTitle}>
        <Glyph name="home" size={15} />
        <span class="btn-title">TITLE</span>
      </button>
    </div>
  );
}
