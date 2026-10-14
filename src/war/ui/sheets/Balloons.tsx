/**
 * Balloons and toasts: the rule balloon under a seat (spec 10: 220 x 40, over the map), a paper's
 * balloon in the Briefing (USE / SELL), the Summit chip's rule, and the one-line refusals.
 */
import type { JSX } from 'preact';
import { boardLabels, boardOf, regionViews, seatViews, trayViews, twistInForce, type RegionId, type RunState } from '../../engine';
import { COLOURS, REGION } from '../../content/map';
import { STAFF_DEF, type StaffId, type StaffTiming } from '../../content/staff';
import { BlocGlyph } from '../art';
import { armSlot, sellSeat, sellTray } from '../app/actions';
import { balloon, pressNote, toast } from '../app/store';
import { clampBalloonX, R, SEAT_X, SEAT_W } from '../common/layout';
import { Funds, RuleText } from '../common/text';

export function Balloons({ s }: { s: RunState }): JSX.Element | null {
  const b = balloon.value;
  if (!b) return null;
  if (b.kind === 'seat') return <SeatBalloon s={s} seat={b.index} />;
  if (b.kind === 'paper') return <PaperBalloon s={s} slot={b.index} />;
  if (b.kind === 'region' && b.region) return <RegionBalloon s={s} id={b.region} />;
  return <SummitBalloon s={s} />;
}

function stop(e: Event): void {
  e.stopPropagation();
}

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
/** Staff whose turn comes in seat order during a sweep (rule and on-clear staff never take a turn). */
const FIRES_IN_ORDER = new Set<StaffTiming>(['pin', 'desk', 'again', 'standby', 'copy']);

function SeatBalloon({ s, seat }: { s: RunState; seat: number }): JSX.Element | null {
  const v = seatViews(s)[seat];
  if (!v) return null;
  const canSell = s.phase === 'briefing';
  const w = 220;
  const cx = SEAT_X[seat] + SEAT_W / 2;
  const left = clampBalloonX(cx, w);
  const copies = v.copies ? STAFF_DEF[v.copies as StaffId].name : null;
  return (
    <div class="balloon down abs" style={{ left: `${left}px`, top: '176px', width: `${w}px` }} onPointerDown={stop}>
      <i class="nib" style={{ left: `${cx - left - 6}px` }} />
      <div class="b-head">
        <span class="b-name">{v.name}</span>
        <span class="b-meta">{STAFF_DEF[v.id as StaffId].rarity.toUpperCase()}</span>
      </div>
      <div class="b-rule">
        <RuleText rule={v.rule} />
        {v.id === 'DEPUTY' && <span class="b-note">{copies ? ` Now copying the ${copies}.` : ' Nothing to its right to copy.'}</span>}
        {v.id === 'OLDHAND' && <span class="b-note"> Count: {v.count}.</span>}
        {v.id === 'FERRY' && twistInForce(s)?.kind === 'GRIDLOCK' && <span class="b-note alarm"> Off duty under GRIDLOCK.</span>}
      </div>
      {s.staff.length > 1 && (
        <div class="b-drag">
          {FIRES_IN_ORDER.has(STAFF_DEF[v.id as StaffId].timing) ? `Fires ${ORDINAL[seat]}.` : `Seat ${seat + 1}.`} Hold a seat and drag to
          reorder.
        </div>
      )}
      {canSell && (
        <button class="mini-btn brass-mini sell" onClick={() => sellSeat(seat)}>
          SELL <Funds n={v.sell} size={8} />
        </button>
      )}
    </div>
  );
}

function PaperBalloon({ s, slot }: { s: RunState; slot: number }): JSX.Element | null {
  const p = trayViews(s).find((x) => x.slot === slot);
  if (!p) return null;
  const r = slot === 0 ? R.tray0 : R.tray1;
  const w = 220;
  const cx = r[0] + r[2] / 2;
  const left = clampBalloonX(cx, w);
  return (
    <div class="balloon up abs" style={{ left: `${left}px`, bottom: `${844 - r[1] + 8}px`, width: `${w}px` }} onPointerDown={stop}>
      <i class="nib" style={{ left: `${cx - left - 6}px` }} />
      <div class="b-head">
        <span class="b-name">{p.name}</span>
        <span class="b-meta">ORDER</span>
      </div>
      <div class="b-rule">
        <RuleText rule={p.rule} />
      </div>
      <div class="b-actions">
        {p.reason ? (
          <span class="b-note">{p.reason}</span>
        ) : (
          <button
            class="mini-btn"
            onClick={() => {
              balloon.value = null;
              armSlot(slot, r);
            }}
          >
            USE
          </button>
        )}
        <button class="mini-btn brass-mini" onClick={() => sellTray(slot)}>
          SELL <Funds n={p.sell} size={8} />
        </button>
      </div>
    </div>
  );
}

const STAMP_LINE = {
  FORTIFY: 'FORTIFY: +20 Influence each time it scores.',
  RELAY: 'RELAY: x1.5 Momentum each time it scores.',
  ECHO: 'ECHO: it scores twice.',
} as const;

const STATUS_LINE = {
  lit: 'Lit: pin it this sweep.',
  dark: 'In the pile: it may light later.',
  spent: 'Spent for this crisis.',
  retired: 'Retired for the night.',
} as const;

/**
 * A long-press on a region: its card. Its number, what it is (Capital, Port), its stamp and brass,
 * and the worn threads it carries (what joining along them adds).
 */
function RegionBalloon({ s, id }: { s: RunState; id: RegionId }): JSX.Element {
  const v = regionViews(s)[id];
  const def = REGION[id];
  const board = boardOf(s);
  const worn = [...(board.adj.get(id) ?? [])]
    .map((q) => ({ name: REGION[q].name, t: board.traffic(id, q) }))
    .filter((x) => x.t > 0);
  const lane = def.lane && v.port ? ` to ${REGION[def.lane].name}` : '';
  // RuleText sets the star and the anchor beside the words, as on the map.
  const kinds = [v.capital ? 'Capital' : null, v.port ? `Port${lane}` : null].filter(Boolean).join(' · ');
  const w = 214;
  const y = 171 + def.y;
  const left = clampBalloonX(def.x, w);
  const below = def.y < 260;
  const place = below ? { top: `${y + 18}px` } : { bottom: `${844 - y + 18}px` };
  return (
    <div class={`balloon ${below ? 'down' : 'up'} abs region-card`} style={{ left: `${left}px`, width: `${w}px`, ...place }} onPointerDown={stop}>
      <i class="nib" style={{ left: `${def.x - left - 6}px` }} />
      <div class="b-head">
        <span class="b-name">{def.name}</span>
        <span class="b-meta">
          <BlocGlyph colour={v.colour} size={8} /> {COLOURS[v.colour].name.toUpperCase()}
        </span>
      </div>
      <div class="b-rule">
        <RuleText rule={`Number ${def.weight}: +${def.weight + 5 * v.brass} Influence each time it scores.`} />
        {kinds && (
          <span class="b-note">
            {' '}
            <RuleText rule={`${kinds}.`} />
          </span>
        )}
      </div>
      {(v.stamp || v.brass > 0) && (
        <div class="b-rule">
          {v.stamp && <RuleText rule={STAMP_LINE[v.stamp]} />}
          {v.brass > 0 && ` ${v.brass} brass pin${v.brass > 1 ? 's' : ''} (+${5 * v.brass}).`}
        </div>
      )}
      {worn.length > 0 && <div class="b-drag">Worn threads: {worn.map((x) => `${x.name} +${x.t}`).join(', ')}.</div>}
      <div class="b-drag">{STATUS_LINE[v.status]}</div>
    </div>
  );
}

function SummitBalloon({ s }: { s: RunState }): JSX.Element {
  const b = boardLabels(s);
  return (
    <div class="balloon down abs" style={{ left: '10px', top: '102px', width: '220px' }} onPointerDown={stop}>
      <i class="nib" style={{ left: '40px' }} />
      <div class="b-head">
        <span class="b-name alarm">{b.summitChip}</span>
        <span class="b-meta">{b.twistNow ? 'IN FORCE' : 'AT THE SUMMIT'}</span>
      </div>
      <div class="b-rule">{b.twistRule}</div>
    </div>
  );
}

/**
 * A held Briefing card with no place on the map: when it fires and what it does, on the readout
 * row, its nib at the box it feeds (which pulses).
 */
export function PeekNote(): JSX.Element | null {
  const n = pressNote.value;
  if (!n) return null;
  return (
    <div class={`peek-note abs${n.box ? ` to-${n.box}` : ''}`} role="status">
      {n.box && <i class="nib" />}
      <span class="pn-head">{n.head}</span>
      <span class="pn-text">
        <RuleText rule={n.text} />
      </span>
    </div>
  );
}

export function Toast(): JSX.Element | null {
  const t = toast.value;
  if (!t) return null;
  const w = 240;
  const left = t.x === null ? (390 - w) / 2 : clampBalloonX(t.x, w);
  return (
    <div key={t.n} class="toast abs" style={{ left: `${left}px`, bottom: `${844 - t.bottom}px`, width: `${w}px` }} role="alert">
      <span>{t.text}</span>
    </div>
  );
}
