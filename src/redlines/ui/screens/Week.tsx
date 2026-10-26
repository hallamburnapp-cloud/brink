/**
 * The week (SPEC-SMALL "A week": SEE, ACT): the desk calendar, the handwritten note (this week's
 * orders in plain words, or the opening's dilemma), the index card with WAR, TREATY, THEY ARE and
 * SEND ORDERS, the A WAY OUT slip, the tape. The finger on the sheet: press and hold a place and a
 * slip is put down beside it (PROMISE TO DEFEND, WITHDRAW, or why not); tap a counter and it lifts,
 * tap a place and it moves there. While the week resolves the same papers show the playback's frame
 * and a tap anywhere skips to the end.
 */
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { Calendar, IndexCard, Note, PencilUnderline, Tape } from '../paper';
import { seedOf } from '../paper/rand';
import { armRegion, cancelAct, doPromise, doWithdraw, holdEnd, holdStart, openMenu, openWayOut, sendOrders, skipPlayback, tapSheet } from '../app/actions';
import { blocOf, content, holdable, kindMoves, pieceOf, promiseAt, regionName, RULES, type PieceKind, type RegionId } from '../app/engine';
import { HoldGesture } from '../app/gesture';
import { toFramePoint } from '../app/layout';
import { getMap } from '../app/mapRef';
import { placeSlip, type Pt } from '../app/slips';
import { armed, busy, frameFit, lifted, play, refusal, shown } from '../app/store';
import { tapeFor } from '../app/tape';
import { noteFor, promiseLine, stepWord, warSub } from '../app/words';

export function Week(): JSX.Element | null {
  const S = content.strings;
  const s = shown.value;
  if (!s) return null;
  const p = play.value;
  const note = p ? p.note : noteFor(s, S, regionName, (r) => S.blocs[blocOf(r)]);
  const frame = p ?? { step: s.fed.step, war: s.war, treaty: s.treaty, tape: tapeFor(s) };
  const offerLabel = s.offer ? S.act.termLabels[s.offer.term] : null;
  return (
    <>
      <TouchSheet />
      <Calendar head={S.words.week} n={s.week} of={S.screen.weekOf} note={S.words.influence} value={s.influence} />
      <button type="button" class="rl-tag pp-obj pp-ty" onClick={openMenu} disabled={!!p}>
        {S.menu.menu}
      </button>
      <Note text={note} class={note.length > 110 ? 'rl-long' : undefined} />
      <button type="button" class="rl-wayout pp-obj pp-ty" onClick={openWayOut} disabled={!!p || !!s.offer || busy.value}>
        <span class="w">
          {S.words.wayOut}
          <PencilUnderline seed={seedOf('rl:wayout')} />
        </span>
        {s.offer ? (
          <span class="c">
            {offerLabel} · {S.act.wayOutOffered}
          </span>
        ) : null}
      </button>
      <IndexCard
        war={{ label: S.words.war, count: frame.war, max: RULES.warLimit, sub: warSub(S, frame.war), last: S.words.worldWar }}
        treaty={{ label: S.words.treaty, value: frame.treaty, sub: S.screen.treatySub }}
        they={{ label: S.words.theyAre, word: stepWord(S, frame.step) }}
        slip={{ text: p ? S.screen.ordersSent : S.words.sendOrders, onTap: () => void sendOrders(), disabled: !!p || busy.value }}
      />
      <Tape lines={frame.tape} />
      {!p && <ActSlip />}
      {!p && <MoveSlip />}
      <RefusalSlip />
      {p && <button type="button" class="rl-skip" aria-label={S.screen.next} onClick={skipPlayback} />}
    </>
  );
}

/** The sheet's pointer layer: the hold gesture over the map, in frame px. */
function TouchSheet(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useMemo(
    () =>
      new HoldGesture<RegionId, PieceKind>({
        hit: (x, y) => getMap()?.hit(x, y) ?? null,
        counterAt: (x, y) => counterAt(x, y),
        onHoldStart: holdStart,
        onHoldEnd: holdEnd,
        onHold: armRegion,
        onTap: tapSheet,
        setTimer: (fn, ms) => setTimeout(fn, ms),
        clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      }),
    [],
  );
  useEffect(() => () => gesture.cancel(), [gesture]);
  const at = (e: PointerEvent) => toFramePoint(e.clientX, e.clientY, frameFit.value);
  return (
    <div
      ref={ref}
      class="rl-touch"
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const { x, y } = at(e);
        ref.current?.setPointerCapture(e.pointerId);
        gesture.down(x, y);
      }}
      onPointerMove={(e) => {
        const { x, y } = at(e);
        gesture.move(x, y);
      }}
      onPointerUp={() => gesture.up()}
      onPointerCancel={() => gesture.cancel()}
      onLostPointerCapture={() => gesture.cancel()}
    />
  );
}

/** The counter under a frame point: the sheet's .pp-piece groups carry their kind. */
function counterAt(fx: number, fy: number): PieceKind | null {
  if (typeof document === 'undefined' || !document.elementsFromPoint) return null;
  const f = frameFit.value;
  const els = document.elementsFromPoint(f.left + fx * f.scale, f.top + fy * f.scale);
  for (const el of els) {
    const g = el.closest?.('.pp-piece');
    if (g) {
      const kind = g.getAttribute('data-kind');
      if (kind === 'fleet' || kind === 'brigade') return kind;
    }
  }
  return null;
}

/** Where a slip anchored to a place goes: under it (or beside or over it), inside the sheet, clear of the places in `avoid`. */
export function slipPlace(region: RegionId, width: number, height: number, avoid: readonly RegionId[] = []): { left: number; top: number } {
  const map = getMap();
  const c = map?.centre(region) ?? { x: 195, y: 300 };
  const pts = avoid.map((r) => map?.centre(r)).filter((p): p is Pt => !!p);
  return placeSlip(c, width, height, pts);
}

const SLIP_W = 252;
const SLIP_H = 88;
/** The MOVE slip is narrow so it can sit beside the counter and leave the places it can move to clear. */
const MOVE_W = 168;
const MOVE_H = 70;

/** The slip a hold puts down: the place's name and state, the act, its cost, CANCEL. */
function ActSlip(): JSX.Element | null {
  const a = armed.value;
  const s = shown.value;
  if (!a || !s) return null;
  const S = content.strings;
  const pos = slipPlace(a.region, SLIP_W, SLIP_H);
  const tags: string[] = [];
  const rec = s.regions[a.region];
  if (rec?.state === 'pressed') tags.push(S.screen.pressed);
  if (rec?.state === 'fighting') tags.push(S.words.fighting);
  if (promiseAt(s, a.region)?.inherited) tags.push(S.screen.inherited);
  if (s.fed.headings.some((h) => h.to === a.region)) tags.push(S.screen.heading);
  const head = [regionName(a.region).toUpperCase(), ...tags].join(' · ');
  const cost = a.act === 'promise' ? promiseLine(S, holdable(s, a.region), regionName) : a.act === 'withdraw' ? S.act.withdrawCost : a.reason ?? '';
  const word = a.act === 'promise' ? S.act.promise : a.act === 'withdraw' ? S.act.withdraw : null;
  return (
    <div class="rl-slip pp-obj pp-ty" style={{ left: `${pos.left}px`, top: `${pos.top}px`, width: `${SLIP_W}px` }}>
      <div class="hd">
        <span>{head}</span>
        <button type="button" class="rl-x" onClick={cancelAct}>
          {S.act.cancel}
        </button>
      </div>
      {word ? (
        <button type="button" class="rl-word" onClick={() => (a.act === 'promise' ? doPromise(a.region) : doWithdraw(a.region))}>
          {word}
          <PencilUnderline seed={seedOf('rl:' + a.act)} />
        </button>
      ) : null}
      <div class="c">{cost}</div>
    </div>
  );
}

/** The slip beside a lifted counter: MOVE, the cost, CANCEL. */
function MoveSlip(): JSX.Element | null {
  const kind = lifted.value;
  const s = shown.value;
  if (!kind || !s) return null;
  const S = content.strings;
  const piece = pieceOf(s, kind);
  if (!piece) return null;
  // The slip leaves every place the counter could move to clear for the tap that moves it (or is refused: one move a week).
  const pos = slipPlace(piece.at, MOVE_W, MOVE_H, kindMoves(kind, piece.at, pieceOf(s, 'fleet')?.at ?? null));
  return (
    <div class="rl-slip rl-move pp-obj pp-ty" style={{ left: `${pos.left}px`, top: `${pos.top}px`, width: `${MOVE_W}px` }}>
      <div class="hd">
        <span>{S.pieces[kind].toUpperCase()}</span>
        <button type="button" class="rl-x" onClick={cancelAct}>
          {S.act.cancel}
        </button>
      </div>
      <div class="w">{S.act.move}</div>
      <div class="c">{S.act.moveCost}</div>
    </div>
  );
}

/** A refused order, in the content's words, on a torn slip for a moment. */
function RefusalSlip(): JSX.Element | null {
  const r = refusal.value;
  if (!r) return null;
  return (
    <div class="rl-refusal pp-obj pp-ty" key={r.key} role="status">
      {r.text}
    </div>
  );
}
