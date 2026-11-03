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
import { armRegion, cancelAct, doPromise, doWithdraw, holdEnd, holdStart, moveTo, openMenu, openWayOut, sendOrders, skipPlayback, tapSheet } from '../app/actions';
import { blocOf, content, holdable, kindMoves, pieceOf, promiseAt, regionName, RULES, type PieceKind, type RegionId } from '../app/engine';
import { moveWarnings, promiseWarnings, tryMove, withdrawCostLine, withdrawWarnings } from '../app/orders';
import { slipTakes } from '../app/armed';
import { HoldGesture } from '../app/gesture';
import { toFramePoint } from '../app/layout';
import { getMap } from '../app/mapRef';
import { placeSlip, type Pt } from '../app/slips';
import { armed, busy, frameFit, lifted, moveAsk, movedDashed, play, refusal, shown } from '../app/store';
import { pinnedFor, tapeFor } from '../app/tape';
import { capitalised, fightingCount, noteFor, promiseLine, stepWord, warSub, weekOfLine } from '../app/words';

export function Week(): JSX.Element | null {
  const S = content.strings;
  const s = shown.value;
  if (!s) return null;
  const p = play.value;
  const dashed = movedDashed.value.week === s.week ? movedDashed.value.regions : [];
  const note = capitalised(p ? p.note : noteFor(s, S, regionName, (r) => S.blocs[blocOf(r)], dashed));
  // The WAR boxes count the places fighting on the sheet, as the playback's beats do: the two never disagree.
  // Wintermast's three declared lines stay pinned at the tape's head all game (SPEC-SMALL "The three lines stay on the sheet").
  const pinned = pinnedFor(s);
  const frame = p ?? { step: s.fed.step, war: fightingCount(s), treaty: s.treaty, tape: tapeFor(s, undefined, pinned) };
  const offerLabel = s.offer ? S.act.termLabels[s.offer.term] : null;
  return (
    <>
      <TouchSheet />
      <Calendar head={S.words.week} n={s.week} of={weekOfLine(S, RULES.weeks)} note={S.words.influence} value={s.influence} />
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
        war={{ label: S.words.war, count: frame.war, max: RULES.warLimit, sub: warSub(S, frame.war, RULES.warLimit), last: S.words.worldWar }}
        treaty={{ label: S.words.treaty, value: frame.treaty, sub: S.screen.treatySub }}
        they={{ label: S.words.theyAre, word: stepWord(S, frame.step) }}
        slip={{ text: p ? S.screen.ordersSent : S.words.sendOrders, onTap: () => void sendOrders(), disabled: !!p || busy.value }}
      />
      <Tape lines={frame.tape} pinned={pinned} />
      {!p && <ActSlip />}
      {!p && <MoveSlip />}
      <RefusalSlip />
      {/* From the first moment of a playback (before its first line prints), a tap anywhere skips it. */}
      {(p || busy.value) && <button type="button" class="rl-skip" aria-label={S.screen.next} onClick={skipPlayback} />}
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
const MOVE_H = 84;

/** The slip a hold puts down: the place's name and state, the act, its cost, CANCEL. */
function ActSlip(): JSX.Element | null {
  const a = armed.value;
  const s = shown.value;
  if (!a || !s) return null;
  const S = content.strings;
  // What the promise would set off, before it is paid for: a declared line it crosses, in the line's own tape words,
  // that a ring on their arrow's target will be a call, and that a ring on a besieged place is a provocation.
  const warns = a.act === 'promise' ? promiseWarnings(s, a.region) : a.act === 'withdraw' ? withdrawWarnings(s, a.region) : [];
  const pos = slipPlace(a.region, SLIP_W, SLIP_H + 24 * warns.length);
  // What a watcher wants first: their forces heading here; then the place's state; then whose promise it is.
  const tags: string[] = [];
  const rec = s.regions[a.region];
  if (s.fed.headings.some((h) => h.to === a.region)) tags.push(S.screen.heading);
  if (rec?.state === 'pressed') tags.push(S.screen.pressed);
  if (rec?.state === 'fighting') tags.push(S.words.fighting);
  if (promiseAt(s, a.region)?.inherited) tags.push(S.screen.inherited);
  const head = [regionName(a.region).toUpperCase(), ...tags].join(' · ');
  const cost = a.act === 'promise' ? promiseLine(S, holdable(s, a.region), regionName) : a.act === 'withdraw' ? withdrawCostLine(s, a.region) : a.reason ?? '';
  const word = a.act === 'promise' ? S.act.promise : a.act === 'withdraw' ? S.act.withdraw : null;
  return (
    <div class="rl-slip pp-obj pp-ty" style={{ left: `${pos.left}px`, top: `${pos.top}px`, width: `${SLIP_W}px` }}>
      <div class="hd">
        <span>{head}</span>
        <button type="button" class="rl-x" onClick={() => slipTakes() && cancelAct()}>
          {S.act.cancel}
        </button>
      </div>
      {word ? (
        <button type="button" class="rl-word" onClick={() => slipTakes() && (a.act === 'promise' ? doPromise(a.region) : doWithdraw(a.region))}>
          {word}
          <PencilUnderline seed={seedOf('rl:' + a.act)} />
        </button>
      ) : null}
      {cost ? <div class="c">{cost}</div> : null}
      {warns.map((w, i) => (
        <div class="c rl-warn" key={i}>
          {w}
        </div>
      ))}
    </div>
  );
}

/** The MOVE HERE slip is wider: it carries the line a move would cross and the rings it would leave dashed. */
const ASK_W = 236;

/**
 * The slip beside a lifted counter: MOVE, the cost, CANCEL; the places it can reach are pencilled round on the
 * sheet. A tap on a place it can reach moves it, unless the move would cross a declared line or leave a ring
 * dashed: then the MOVE HERE slip is put down at that place and says so before anything is paid.
 */
function MoveSlip(): JSX.Element | null {
  const kind = lifted.value;
  const s = shown.value;
  if (!kind || !s) return null;
  const S = content.strings;
  const piece = pieceOf(s, kind);
  if (!piece) return null;
  const ask = moveAsk.value?.kind === kind ? moveAsk.value : null;
  if (ask) {
    const warns = moveWarnings(tryMove(s, kind, ask.region));
    const pos = slipPlace(ask.region, ASK_W, 74 + 24 * warns.length, [piece.at]);
    return (
      <div class="rl-slip rl-move rl-ask pp-obj pp-ty" style={{ left: `${pos.left}px`, top: `${pos.top}px`, width: `${ASK_W}px` }}>
        <div class="hd">
          <span>{`${S.pieces[kind].toUpperCase()} · ${regionName(ask.region).toUpperCase()}`}</span>
          <button type="button" class="rl-x" onClick={() => slipTakes() && cancelAct()}>
            {S.act.cancel}
          </button>
        </div>
        <button type="button" class="rl-word" onClick={() => slipTakes() && moveTo(kind, ask.region)}>
          {S.act.moveHere}
          <PencilUnderline seed={seedOf('rl:movehere')} />
        </button>
        <div class="c">{S.act.moveCost}</div>
        {warns.map((w, i) => (
          <div class="c rl-warn" key={i}>
            {w}
          </div>
        ))}
      </div>
    );
  }
  // The slip leaves every place the counter could move to clear for the tap that moves it (or is refused: one move a week).
  const pos = slipPlace(piece.at, MOVE_W, MOVE_H, kindMoves(kind, piece.at, pieceOf(s, 'fleet')?.at ?? null));
  const hint = S.act.moveHint;
  return (
    // The slip lets a tap through to the sheet under it (a place it covers can still be tapped); CANCEL takes taps, and
    // the MOVE word is inert (a tap on it once fell through to a refusal: the second review).
    <div class="rl-slip rl-move rl-through pp-obj pp-ty" style={{ left: `${pos.left}px`, top: `${pos.top}px`, width: `${MOVE_W}px` }}>
      <div class="hd">
        <span>{S.pieces[kind].toUpperCase()}</span>
        <button type="button" class="rl-x" onClick={() => slipTakes() && cancelAct()}>
          {S.act.cancel}
        </button>
      </div>
      <div class="w rl-inert">{S.act.move}</div>
      <div class="c">{S.act.moveCost}</div>
      <div class="c rl-hint">{hint}</div>
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
