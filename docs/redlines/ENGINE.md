# BRINK: Red Lines — the engine

`src/redlines/engine` is pure TypeScript: no DOM, no imports of the virtual content module. Every
function takes a state and returns a new one (the one passed in is never changed), so a Preact signal
can hold a state and see every change. The content comes in as one typed object (`RedlinesContent`,
`src/redlines/engine/content.ts`), compiled by the content builder from `content-redlines/`; the
engine's own fixture pack (`src/redlines/engine/testkit.ts`) lets the tests and the simulator run without it.
The game is `docs/redlines/SPEC-SMALL.md`; the seams are `BUILD.md`. This file is the API, the state,
the rulings where the spec is silent, and the tuning log. The simulator is `src/redlines/sim` and
`tools/redlines-sim.ts`.

```ts
import { newGame, promise, withdraw, movePiece, offerWayOut, canOfferWayOut, endWeek, answerPhone, debrief, weeksLeft, actLine, netActs, saveGame, loadGame } from '@/redlines/engine';
import { declaredTapes, linesCrossedByMove, linesCrossedByPromise, ringsLeftDashed, promiseWillRing, isProvocation, fallsThisWeek, fallsEndTheGame } from '@/redlines/engine';
```

## The API (one line each)

| function | does |
| --- | --- |
| `newGame(content, seed): GameState` | Week 1: the dials, three declared lines (two real, one bluff), one or two inherited promises, the collision in one sentence, their first two headings, 30 influence. |
| `canPromise(s, region): { ok, reason? }` | Outside the Cap, calm or pressed, fewer than three promises, influence for the garrison (2). `reason` is a `strings.refusals` code. |
| `holdable(s, region): { ok, why, piece? }` | A piece within reach (there, or one move away: a land join for the brigade, a lane or the coast for the fleet) and not inside the Cap. `why` is a `strings.hold` code. Solid when ok, dashed when not. |
| `promise(s, region): Result` / `withdraw(s, region): Result` | Draw a promise (costs 2 now, 1 a week after) or take it back (belief −5, nothing else). Not the promise under test: answer the phone. |
| `movesFor(s, kind): RegionId[]` / `movePiece(s, kind, region): Result` | One move per piece per week, cost 3. The fleet on lanes and coasts; the brigade on land joins, or across a lane when the fleet is at either end. Never into the Cap. |
| `offerWayOut(s, term, detail?): Result` | Once a week: `'drop-promise'` (a promised region, 10), `'pull-back'` (`'fleet'` or `'brigade'`, 15), `'summit'` (15). The price is paid now; Wintermast answers at the resolve. Refused before you pay when it would fail (round 15): `'too-early'` before week 3, `'no-promises'`, `'piece-home'` (a piece already at home); and (the integration) `'too-soon'` the week after a way out (yours or their summit) was accepted. |
| `canOfferWayOut(s, term, detail?): { ok, reason? }` / `pullBackPieces(s)` | Whether a term can be offered now and the code when not (with no `detail`: for the term as a whole, which is what the form dims); the pieces a pull-back can name (those away from home). |
| `isProvocation(s, region)` | A ring drawn here now would be a provocation: the place is hatched and no piece of yours stands in it (SPEC-SMALL "No formula wins"). The PROMISE slip says so. |
| `declaredTapes(s)`, `linesCrossedByMove(s, kind, to)`, `linesCrossedByPromise(s, region)` | The three declarations in their tape words (`forecast.ts`); the uncrossed declared lines a move or a promise would cross, in their tape words (SPEC-SMALL "The three lines stay on the sheet"). |
| `ringsLeftDashed(s, kind, to)`, `promiseWillRing(s, region)`, `fallsThisWeek(s)`, `fallsEndTheGame(s)` | The solid rings a move would leave dashed; whether a ring on a place will be a call (an arrow points at it); the places whose single ringed tick runs out when this week resolves, and whether those falls make the eighth place fighting (SPEC-SMALL "A form that will fail says so before you pay"). |
| `endWeek(content, s): GameState` | SEND ORDERS. Resolves the week (below). Returns phase `'phone'` when a test or an event rings, else the next week (`'act'`) or the ending (`'ended'`). |
| `canAnswer(s, key): { ok, reason? }` / `answerCost(s, key)` | Whether BACK IT can be paid (`'no-influence'` otherwise) and what an answer costs. |
| `answerPhone(content, s, key): GameState` | `'back'`, `'down'` or `'wait'`. Finishes the week. WAIT carries a test to next week with the stakes up (round 2, then 3); the third WAIT is backing down. Returns the state unchanged when `canAnswer` says no. |
| `weeksLeft(s, region): number \| null` | The pencil ticks beside a hatched place (SPEC-SMALL "A pressed place shows its clock"): the week-ends left before a pressed, unanswered place falls on the fall clock, 3, 2 or 1 by the step the week starts at (1: it falls when this week resolves unless something of yours answers it first). `null` for a place that is calm, already fighting, answered now (a piece of yours in it, or a solid promise not under test: its clock is paused), or once the game has ended. In the act phase it reads the clock the coming resolve reads; on the phone (this week's tick counted) this week's end is the 1. Checked against the real fall in `clock.test.ts` and in every simulated game. |
| `actLine(content, act): string` | One act in the log's words: an order ("You promised to defend Lintel.") or an answer on the phone as the act it was (`strings.answers`: "You protested at Vessary.", never the form's forecast; the third WAIT on a test prints as backing down). The debrief's "what you did" is written with it; the screens' note can use it too. |
| `netActs(acts): Act[]` | The week's orders with a promise and its same-week withdrawal cancelled out: what the debrief's "what you did" and the screens' note both print (the screens read it through their seam, `ui/app/engine.ts`). |
| `debrief(s): { week, what, thought }[]` | Every hidden line of the game under that week's orders, for the ending screen. |
| `scoreOf(ending): number` | Treaty `100 − 8w − 5f` (min 10; SPEC-SMALL "Ten weeks, not eight"), frozen `9 − f` (min 1), war 0. |
| `saveGame(s): string` / `loadGame(text): GameState \| null` | Versioned JSON (`brink.redlines`, version 1); `loadGame` returns null for anything it cannot trust. Store under `SAVE_KEY` = `brink.redlines.v1.save`. |
| `RULES`, `STEP_WORDS`, `fallWeeksAt(step)`, `pushesAt(step)`, `spreadAt(step)`, `isScared(jumpiness)` | Every number (`rules.ts`), the five words, the per-step tables, the "scared" mark on the jumpiness dial. |
| `couldHaveReached(s, region, weeks)`, `holdDistance(s, piece, region)`, `closedTo(s, kind)`, `reachableWithoutLines(s, region)`, `pieceDistance(kind, from, to)`, `isSpared(s, region)`, `canRecover(s, region)` | The reach rulings below: whether a piece could have got within one move of a place in the weeks it stood pressed, by a route that crosses no declared line (round 15: SPEC-SMALL "Out of reach means out of reach"); the moves that takes; the places the declared lines close to a piece of that kind; whether any line-free route holds it at all; a piece's own moves between two places; what the spread of the fighting spares; whether a fighting place may come back (only one that fell in an earlier week). |
| `nearestPiece(s, region)`, `unansweredRegions(s)`, `believedRing(s, region)`, `summitWhy(s)`, `wayOutTooSoon(s)`, `crossedLineAt(s, region)` | The piece a call names (the one that holds the place, else the nearest by its own routes: never the brigade for an island); the hatched places that stand unanswered (the treaty is not signed over them); a ring they believe; why a summit was offered or taken; a way out accepted last week; whether a crossed line is drawn round a place. |
| `promiseMinded(s, region)`, `clockRunDown(s, region)` | Whether a dropped promise moves them (within their reach, in their arrows or under test); whether a push on a pressed place would be wasted. |
| `lessonsOf(c, s)`, `backDownLesson(s)`, `closingLines(c, s)`, `dialsLine(c, fed, jumpinessSeen)` | The closing card: two or three lessons from the game's own events, each true of what happened (round 15), then the dials (jumpiness named only when something let it show). Printed once, on the card: never in a week's `hidden`. |
| `stepAtWeekStart(s)`, `trawlerPool(c, promised)`, `answerGroup(kind)` | The step the fall clocks read; the trawler templates that fit a promised or an unpromised island; which `strings.answers` set a call's answer is printed from. |
| `checkContent(content): string[]` | What a pack is missing for the engine to run (empty when fine). |
| `REGION_IDS`, `REGION`, `NEAR_CAP`, `isCap`, `isSea`, `reachOf`, `fleetMoves`, `brigadeMoves`, `distance`, `regionName` | The map as the rules see it (`world.ts`, from `src/thirty/ui/map/data.ts`). |

`Result` is `{ ok: true, state }` or `{ ok: false, reason }`; the reason is a code from
`REFUSAL_CODES` (`'inside-the-cap'`, `'already-fighting'`, `'already-promised'`, `'three-promises'`,
`'no-influence'`, `'not-promised'`, `'under-test'`, `'moved-already'`, `'not-adjacent'`,
`'no-such-piece'`, `'offered-already'`, `'bad-term'`, `'not-this-phase'`, `'no-such-phone'`, and the four a way out
that would fail is refused with before its price is paid: `'too-early'`, `'too-soon'`, `'piece-home'`, `'no-promises'`),
and the words for it are `content.strings.refusals[code]`.

**Content goes in where words come out.** `newGame`, `endWeek` and `answerPhone` take the pack because
the week writes the tape, the hidden lines and the phone; the acts (`promise`, `movePiece` ...) do not.
`BUILD.md` sketched `endWeek(s)`; the pack had to be passed somewhere, and this is the thirty-days pattern.

## The state

`src/redlines/engine/types.ts` is BUILD.md's block word for word, plus the fields marked "beyond
BUILD.md" (the screens may ignore them):

```ts
interface GameState {
  seed; week; phase: 'act' | 'phone' | 'ended'; influence;
  regions: Record<RegionId, { state: 'calm' | 'pressed' | 'fighting'; pressedWeeks; fellWeek?; recoveredWeek?; quietWeeks; fellBy? }>;
  promises: { region; since; inherited }[]; pieces: [{ kind: 'fleet'; at }, { kind: 'brigade'; at }];
  fed: { appetite; jumpiness; step: 1..5; belief; will; lines: { id; text; real }[]; headings: { from; to; real }[] };
  war; treaty;                 // regions fighting; = fed.will
  phone: Phone | null;         // the call on the line (phase 'phone'); phone.kind says what it is about
  pendingTest: RegionId | null; log: WeekLog[]; ending: Ending | null; collision: string; headline: string[];
  // beyond BUILD.md
  offer: { term; detail; price } | null;   // this week's way out, answered at the resolve
  moved: PieceKind[]; acts: Act[];         // this week's moves and orders (cleared at the turn of the week)
  signed: 0 | 1 | 2; waysOut: number;      // blocs that signed; ways out accepted
  crossed: Record<lineId, week>;           // a line is crossed once
  pendingRound: 1 | 2 | 3; turnedAway: Record<RegionId, week>; events: number; phonesUsed: string[];
  lastBacked: RegionId | null; beliefWas: number;
  feintGone?: RegionId | null;               // a feint you waited on last week: this week's tape says the column has gone
  tally?: Tally;                             // counts for the closing card's lessons (tests solid/dashed, feints backed, back-downs,
                                             // falls out of reach, moves, idle weeks, far drops, "stopped then talked", jumpinessSeen;
                                             // round 15: every back-down with what it was, idle weeks an order could have answered,
                                             // doorstep steps and the first piece, the scared step-downs used; integrated: a back-down
                                             // at the top of the ladder is marked `top`, since it climbed no step)
  afterCall?: Heading[] | null;              // round 15: the other columns of a week with a test call, landing after the answer
  headingSaid?: number;                      // round 15: the week the one "they went for X" thought was written (across the call)
  wayOutWeek?: number | null;                // round 15: the week a way out (yours or their summit) was last accepted
  quietRing?: RegionId | null;               // integrated: a believed ring this week's plan leaves alone, said on this week's page
}
interface Line { id; text; real; kind?; regions?; tape? }      // round 15: the pack's line copied in (the rules read reach without the pack)
interface Heading { from; to; real; why?; whyPiece?; timetable? } // round 15: the reason recorded when planned; a push the timetable added
interface PromiseMark { region; since; inherited; provocation? } // round 15: drawn on a place already under siege
interface RegionRec { ...; fellSeq?: number; fellReach?: boolean }   // the order of the falls (WORLD WAR names the lowest still fighting); whether something of yours could have reached it
interface Ending { ...; lessons?: string[] }                           // the closing card's two or three lessons
interface WeekLog { week; visible: string[]; hidden: string[]; danger: { war; treaty; step }; acts: string[];
  beats?: { kind; region; war; step; treaty }[] }                       // one per visible line, in step with it (after the recheck)
type Act = ... | { kind: 'answer'; key; region; phone; round? }       // the round tells a third WAIT (backing down) from a first
```

**The WAR count is always the sheet's** (SPEC-SMALL "Rulings after the recheck"): `war` is recounted by every fall and
every recovery (`board.ts` `fall`, `recover`, `countWar`), so a state returned mid-week (phase `'phone'`, after a place
fell as the week opened) carries it too. **Every tape line carries its facts** in `WeekLog.beats`, in step with
`visible`: the headline kind it was written from, the place it names (an id, or null) and the sheet right after it
(places fighting, the ladder's step, the TREATY bar). The resolve says each line right after the change it reports,
so a playback can set the WAR boxes, the stamp and the bar beat by beat from the beats and never disagree with the
sheet. A save from before them has no beats and loads.

The fields with `?` came after the first review (round 13); a save from before them loads with the tally at
zeros. `log[last].danger.step` is the step the week started at while the week is in progress (the entry is
opened at `beginWeek` and overwritten at the end), which is what the fall clocks read.

`fed.appetite`, `fed.jumpiness`, `fed.belief`, `lines[].real` and `headings[].real` are in the state
because the save needs them; the screens never show them. The debrief does.

Determinism: there is no RNG state in the save. Every roll comes from a stream named by the seed and
the moment (`${seed}:setup`, `${seed}:w${week}:a` for the first half of a week, `:c` for the answer's
roll, `:b` for the second half), so the same seed and the same orders give the same state, and a game
saved and loaded continues exactly as the unsaved one (`run.test.ts` "determinism and the save").

## A week (what `endWeek` and `answerPhone` do, in order)

**Cause before effect** (SPEC-SMALL "Rulings after the recheck"): every path prints what you or they did before
what it caused, and each line is said right after the change it reports. "Backed down at Shoal · they stand down",
then "Shoal has fallen"; "Wintermast accepts: a summit", then "Guns quiet at X". **A place that falls stays fallen
that week**: a step down eases the ladder word at once, but only a place that fell in an earlier week comes back
(`recoverOne`, `canRecover`), and a place that came back this week is not spread into again the same week. The
simulator checks both on every game it plays (`src/redlines/sim/invariants.ts`, below).

1. **The clocks.** Every pressed place that is *answered* (a piece of yours stands in it, or a solid
   promise covers it and is not the one under test) counts a quiet week; every other pressed place
   counts a week towards its fall. (`weeksLeft` is this clock as the sheet shows it.)
2. **Their lines.** Each declared line not yet crossed is checked: `proximity` (any piece of yours in
   its regions), `sea` (the fleet), `missiles` (the brigade), `alliance` (a promise of yours). A real
   line crossed prints what crossed it and where ("The fleet at Lintel crosses a line"), then a step up
   with Wintermast's word ("Wintermast: 'our line' · now PUSHING"; "· still ALL-OUT" at the top); a bluff crossed is
   belief +10 and silence. Either way, later this week, the `bluff-crossed` call rings if nothing else does (round 15,
   SPEC-SMALL "The bluff is not a free read": a real line rings it too, so the call is no tell; its debrief thought is
   the bluff's only when the line was the bluff). A line is crossed once.
3. **WAIT bought information**: a feint you waited on last week is gone ("Vessary: their column has gone
   home"). **A carried test** (a real one you waited on): if the place's clock has run down, they take it
   ("You waited too long · Vessary has fallen"); else the tape says it again ("They are testing your promise at
   Vessary") and it rings below with the round up, with the first round's template and its `againAdvisers`.
4. **Their pushes land** where the headings pointed. A real push, or a feint, on a promised place is a **test**
   ("They are testing your promise at X"). **SPEC-SMALL "The feint keeps its mystery"** (round 15): when a test call
   rings, the other columns wait in `afterCall` and land after the answer (6b), so the call rings before the other
   column's line prints; in a week with no test call they land here. A real push on an unpromised place presses it
   (calm → pressed, "Federation forces push into X"; "More Federation forces into X" when it was pressed already; the
   place is pressed, then the line is said). A feint on an unpromised place is "a column that stopped short". The
   debrief gets at most one "they went for X" thought a week (across the call, `headingSaid`), with the reason
   recorded when the heading was planned, and only for a test or a new front; a feint's thought only when you acted
   on it. Two real arrows are "neither column was for show" (`bothReal`), or, when the timetable added the second,
   `bothRealTimetable` (their timetable, not their appetite).
5. **The phone**: the carried test first, else the new test, else one event (bluff crossed; a place
   nobody promised about to fall that a piece could reach; their summit offer, never in a week you have a
   way out on the table; a false alarm; the trawler, about an island under a ring of yours when there is
   one). If something rings, `endWeek` returns with phase `'phone'` and the rest waits for `answerPhone`.
6. **The answer** (see "The phone"). The answer is written into the week's acts as the act it was (`actLine`).
   Its lines come cause first: the backing, then the place the step down quiets; the back-down, then the fall it
   costs (a scared Federation's step down after a back-down quiets no place: round 15).
6b. **The other columns land** (a week with a test call): their pushes and stops print now, after the answer.
7. **Places fall**: pressed, unanswered, clock run down (3 weeks at TESTING, 2 at PUSHING, 1 from
   MASSING; the clock reads the step the week **started** at). A place nothing of yours could have reached (round 15:
   by a route that crosses no declared line) falls without a step and the tape says so ("Brackwater out of reach ·
   still TESTING"). At FIGHTING (one place) and ALL-OUT (two) the fighting spreads on its own to neighbours of a
   fighting place; a piece standing in a place, a solid promise on it, its having come back this week, or a promise
   backed and held this week (round 15: "it held" is never followed by its spread) spares it. The falls print before
   the spread.
8. **The way out** you offered is answered (below): accepted is +15, a step down, the term kept, printed as
   "Wintermast accepts: a summit" and then any place it returns (the one the step down quiets, and a place the
   term named, each only if it fell in an earlier week); refused costs nothing on the bar and the tape prints their
   reason ("Wintermast refuses: a summit", "Wintermast: 'one thing at a time'"). A way out that could only fail is
   refused before you pay (round 15: too early, no promise, a piece at home).
9. **The ladder**: at most one step a week for the places taken unanswered that something of yours could
   have reached ("Vessary taken unanswered · now PUSHING"; "two places taken unanswered · now MASSING"). A place
   lost by an answer this week (backed down from, a failed back, the third WAIT) was answered, badly: its step was
   the back-down's, and it is not also "taken unanswered". **Their doorstep** (round 15, SPEC-SMALL "Backing down is
   never the best answer"): a piece of yours on it slows an easily scared Federation (chance jumpiness × 0.45: "Their
   forces hold back near X", and next week's plan holds one push back, its arrow stopping short) and provokes a bold
   one (chance (1 − jumpiness) × 0.45: "'Provocation' at X · now PUSHING"); at MASSING and above an accident, one in
   twenty. A step that cannot climb (ALL-OUT) prints nothing.
10. **Recoveries**: two quiet weeks and a pressed place is calm again.
11. **The bars**: −5 per place taken ("They took one place this week"); +5 whenever nothing was taken ("They took
    nothing this week": SPEC-SMALL ruling "Ten weeks, not eight", the plain spec rule, pressed places or not); in such
    a week from week 3 another bloc may sign the call for a treaty (+10, at most two). A week in which a place fell
    never pays the +5 (nothing that fell this week has come back).
12. **The endings**: eight or more fighting is WORLD WAR ("Nine places are fighting · WORLD WAR": the line counts);
    the bar at 100 with no place fallen this week **and no hatched place standing unanswered** is the TREATY (round
    15, SPEC-SMALL "The treaty is signed over a quiet map"; `unansweredRegions`: pressed, unanswered, its clock ticked
    at least once, and a piece of yours could hold it with one line-free move); at 100 without the signing the tape
    says why ("No treaty · they took a place this week", "No treaty · Vessary still unanswered"); the TREATY card names
    the places still hatched ("They keep their forces at Shoal."); the end of week 10 with neither is FROZEN. The
    closing card's lessons and the dials are the ending's (`Ending.lessons`, `Ending.dials`), printed once, on the card;
    no headings are planned for a week that never comes.
13. **Next week**: a provocation ring they now believe becomes an ordinary ring; their headings are planned (a
    scared Federation slowed by a doorstep piece holds one push back), influence is paid (+8 − 1 per promise), the
    week's orders are cleared. A believed ring the plan leaves alone (`notTested`) is kept as `quietRing` and said when
    that week resolves, on its own page, if the ring still stands solid with no arrow at it (the integration: it was
    said on the page of the week before, where their column could be at that very ring: "They were not coming to
    Vessary", then "They left Vessary alone because they believed you"); once a game per place, whichever of its two
    wordings was said.

## The other side (agent.ts)

- **Headings.** Two every week. Real pushes number `pushesByStep` (one at TESTING and PUSHING, two from
  MASSING), plus one more some weeks for a hungry Federation (chance `(appetite − 0.5) × 2`). When
  only one push is real the other arrow is a feint; when two are due, one week in three the second is
  a feint instead. **From week 3 both arrows are real** (`bothRealFromWeek`: 4 in round 14, 3 from round 15), but one
  week in ten one of them is still a feint (`lateFeintChance`, round 15: SPEC-SMALL "The feint keeps its mystery").
  Each heading carries its reason (`why`) as it is planned, and `timetable` when the timetable added it.
  **A ring drawn on a place already under siege** (round 15, `PromiseMark.provocation`: hatched, no piece of yours in
  it) draws their first push the week after, unless they believe it (belief 60, `provocationBelief`); until then it
  pauses no clock. Backed and held on its call, or believed, it is an ordinary ring.
  Their forces reach one step (land join or lane) from a foothold: the Cap, or any place pressed or fighting.
  **A ring they do not believe** (dashed, or solid while belief is under 40) in their reach draws the first push
  six times in ten (`weight.dashedFirst`, round 14: SPEC-SMALL "It tests promises it does not believe ... dashed
  outlines get tested"). Each other real push is a **new front** (an unguarded calm place) with chance = appetite,
  and always once a place is fighting (`newFrontsFromFighting` 1, round 14: once they have taken a place they go
  for the next); otherwise a **test of a promise** and **pressure kept on** a place already pressed are weighed
  together (dashed 1.4, solid but doubted 0.9, solid and believed 0.3 rising to 0.6 up the ladder, pressure 0.6:
  "solid ones mostly do not" get tested). A push on a pressed place whose clock has run down is never spent (it
  falls anyway). At most one promised place is targeted a week, none while a test is pending, and none they turned
  away from in the last three weeks. The feint points at a promised place half the time. Highmarch itself is
  pushed half as readily; the Cap never; in weeks 1 and 2 the Sound weighs a quarter (SPEC-SMALL: the first fronts
  touch the Scatter and Highmarch before the Sound).
- **Belief** (hidden, starts 50). Up: a solid promise backed (+15), a bluff crossed (+10), backing an
  ally (+8), going on alert (+5), sending force to a place nobody promised (+5). Down: backing down
  (−15), a far back that failed (−15), waiting while they take a place (−15), withdrawing (−5), each
  WAIT (−5), disowning an ally (−8). Below 40 they test even solid promises; from 40 BACK IT costs 6 (round 15,
  SPEC-SMALL "Doubt is visible where it matters": 60 until round 14), so the cheaper price is the sign that they
  believe you; below 40 the Director's slip on a test says what she has seen of their doubt (`intelDoubted`).
- **Ways out.** Not offered before week 3 (round 15: `offerWayOut` refuses it before the price is paid, `'too-early'`)
  and refused whenever they took two places this week; one place halves the chance. Refused the week after a way
  out (yours or their summit) was accepted (round 15: at most one in any two weeks, `'tooSoon'`: "Wintermast: 'one
  thing at a time'"); a refusal fixed in advance, so from the integration it cannot be offered at all (`'too-soon'`,
  before the price is paid, and the form dims it: "they took a way out last week"). Drop a promise they minded (`promiseMinded`: within their reach next week, in their arrows,
  under test, or on a real alliance line; and at least a week old): 0.8; any other is refused outright ("a small
  thing": round 15 reads SPEC-SMALL's "a far promise cannot be sold" literally; 0.35 until then). Pull back a piece
  away from home (a piece at home cannot be offered, `'piece-home'`) from their doorstep or standing inside a line it
  crossed: 0.35 + 0.6 × jumpiness, else 0.2 (round 15: read from the piece, not from any line crossed anywhere). A
  summit: 0.35 / 0.55 / 0.7 / 0.75 / 0.8 by step (0.45 at TESTING until the integration: see the tuning log), + (will − 50) / 150, + 0.5 when they took nothing last week either
  and nothing is hatched (round 15: they have been stopped, and a stopped Federation talks; not while their siege
  stands), − (appetite − 0.5) × 0.4. Every way out is then multiplied by 0.6 for each hatched place standing
  unanswered (round 15: they do not talk while they are winning). Clamped to 0.05..0.95. The summit costs 15, the
  pull-back 15, the dropped promise 10. A refusal costs nothing but the price; the tape prints their reason. Their
  own summit offer follows the same two rules (never the week after an accepted way out; its chance × 0.6 a standing
  unanswered place).

## The phone (phone.ts, resolve.ts)

A test draws one template from the pool `test` + `test-inherited` + `feint`, so no template is a tell;
an inherited promise prefers `test-inherited`. BACK IT costs 12 (6 once belief ≥ 40; ≥ 60 until round 14) for a
solid promise, 24 for a dashed one which then fails one time in three; each WAIT adds 6 to the next round. BACK IT
stands by the promise in public: it moves no piece, and no form says it does (round 15). A back that holds answers
the place that week: a clock already running there starts again, and the spread passes it by, so "it held" is never
followed by its fall the same week. The call's `{piece}` is the piece that holds the place, else the nearest by its
own routes (`nearestPiece`: the fleet for an island; until round 14 a dashed ring named the brigade).
The second and third round of a carried test keep the first round's template (its `again` text, its
caller) with the template's `againAdvisers` (a week on: round 15; the first round's slips repeated word for word
until then): one crisis, one voice. While they doubt you (belief under 40) the Director's slip on a test is the
template's `intelDoubted`. On a real push: back and held → belief up, a step down,
they turn away from the place for three weeks (not after a far back: that taught them nothing); back
down → belief −15, the promise gone, the place pressed, and a step **up** ("· still ALL-OUT" at the top), or a step
**down** when the Federation is easily scared (jumpiness over 0.6: "Backed down at X · they stand down"), at most
once a game, from PUSHING up, and returning no place (round 15, SPEC-SMALL "Backing down is never the best answer");
backing down from a ring
nothing of yours could hold loses the place at once (`backDownFarTakes`, round 14), printed after the back-down
("Backed down at X · now PUSHING", then "X has fallen"); wait → the place pressed, round +1. On a feint: back → nothing earned (no belief, no turn-away, not the treaty's
"could not take X"; the price is paid and the debrief says they were never coming); back down → the
step up all the same (a public back-down), the place untouched; wait → it lapses, and next week's
tape says the column has gone home.

Events ring at most four times a game, only when no test rings, and never carry a round:
`false-alarm` (PUSHING and above): alert costs 6, belief +5, and a jumpy Federation may climb a step;
stand down or wait, nothing. `trawler` (from week 2; about an island under a ring of yours when there is
one, with a template that may speak of the promise, else one you never promised, with a template that
claims none): back the island (6; belief +8; the island's clock restarts, so it is not "taken, nobody
came" the week after), disown it (belief −8), lean on it (3, and its form names the 3: `{waitCost}`); the bar never
moves (it has five movers). Their excuse in the debrief is "whether you meant it" for a promised island, "nobody had
promised it" for one nobody promised (round 15).
`bluff-crossed` (a line crossed this week, the bluff or a real one: round 15): hold (nothing), pull back (belief −5,
the piece goes home or the promise is withdrawn), wait (nothing; its form says "costs nothing tonight · we see what
they do", never "they may move first"). `summit` (their own offer, from week 4, at most twice, when the bar is at 45 or more and they have
been stopped, never in a week you have a way out on the table nor the week after a way out was accepted, its chance
× 0.6 for each hatched place standing unanswered): accept (10; a step down, +15; "· still TESTING" at the foot; why
they offered it is "both sides afraid" from MASSING, "while they were ahead" only when they hold a place they took,
else "they had taken nothing"), refuse
(−10: the one humiliation in the first build, their public offer refused in public), ask for terms
(lapses). `fall-unpromised`: send what you have (15; the nearest piece moves in and the place is
answered, belief +5), let it go, protest (the tape says "You protested at X", `unpromisedProtested`; until the
integration it printed "You let X go" for both, which a real-tap game showed).

**What you did is printed as what you did** (SPEC-SMALL ruling): the week's acts log an answer from
`strings.answers` by the call and the key ("You backed your promise at Lintel.", "You protested at Vessary.",
"You accepted their summit."), never the form's label and forecast ("PROTEST · a protest and nothing else ·
Vessary will likely fall"). `actLine` writes it; the debrief's "what you did" and the screens' note read it.

## Rulings (where the spec is silent)

1. **Reach.** A promise is solid when a piece stands in the place or one move away; "a sea lane open" is
   not modelled in the first build (lanes are always open).
2. **The brigade crosses water** only across a lane whose end the fleet holds (it is carried).
3. **Answered.** A pressed place is answered by a piece standing in it, or by a solid promise not under
   test; its clock pauses and two quiet weeks make it calm. The clock runs every week otherwise.
4. **Fall clock** 3 / 2 / 1 / 1 / 1 by step (BUILD's numbers).
5. **Pieces start** at Tern Isle (the fleet; SPEC-SMALL's ruling "you start within reach of the war";
   Ashkettle until round 13) and Edda Vale (the brigade); a way out that pulls a piece back sends it there.
6. **Falls move the ladder at most one step a week** (SPEC-SMALL ruling; a step per place in rounds
   9–12), and only for places taken unanswered that **something of yours could have reached**: a piece
   could have been within one move of the place by the time it fell, given the weeks it stood pressed and
   the week's warning the arrow gave (`couldHaveReached`: the piece's own distance to the place, less the
   one move that still holds it, within weeks pressed + 1; the fleet at Tern Isle could have reached
   Kelpmouth in the three weeks it stood pressed at TESTING; Brackwater, inland, never). A fall nothing
   could have reached climbs no step and the tape says "out of reach".
7. **Spread** only at FIGHTING (one place a week) and ALL-OUT (two), to neighbours of a fighting place; a
   piece standing in a place or a solid promise on it spares it, and so does a place that came back this week
   (SPEC-SMALL ruling; round 12's 3 / 5 / 8 from MASSING made the ladder a cliff; round 14's two at FIGHTING
   changed nothing measurable and was dropped).
8. **A step down quiets one place**: the fighting place that fell most recently **in an earlier week** becomes
   pressed (by the order of the falls, `fellSeq`); a way out that names a place quiets that one too, on the same
   condition. A place that fell this week stays fallen this week (SPEC-SMALL "Rulings after the recheck"; until
   round 14 a step down could undo the fall it followed: "Shoal has fallen", then "Guns quiet at Shoal").
9. **A refused way out costs nothing on the bar** (SPEC-SMALL ruling; −10 until round 13); the tape prints
   Wintermast's short reason (`strings.wintermast`). The spec's −10 for humiliation is paid only when their
   own summit offer is refused in public.
10. **Blocs sign** in quiet weeks from week 3, chance 0.45 each week (0.5 until round 12), the Scatter
    then Farsouth.
11. **The bar starts at 45** (the spec gives no start; 55 until round 13, 50 in round 13, 45 from round 14 with
    the ten weeks and the plain +5: see the log).
12. **Jumpiness** acts through their doorstep (Vessary, Kelpmouth, Driftholm, the three places that
    touch the Cap): a piece there climbs the ladder with chance jumpiness × 0.45 a week, and a
    pull-back from there is taken with chance 0.35 + 0.6 × jumpiness.
13. **One phone a week**; a test takes priority over an event; a second promised target is never
    chosen while one test is pending.
14. **Backing a dashed promise that holds** earns no belief and does not turn them away (the solved
    opening, round 5). **Backing a feint earns nothing at all** (SPEC-SMALL ruling): they were not coming;
    the debrief says so.
15. **A way out before week 3** is refused: nothing has stopped them yet (round 11). From round 15 it cannot be
    offered at all (`'too-early'`, before the price is paid: SPEC-SMALL "A form that will fail says so before you pay").
16. **The dials in words**: under 0.4 careful / not easily scared, over 0.6 hungry / easily scared,
    between steady / watchful. The jumpiness word is given only when something let the dial act where the
    player could see it (a piece on their doorstep, an alarm answered, a pull-back offered, a back-down at a
    test); otherwise the closing card names appetite alone and says you never came close enough to learn.
17. **The quiet week's +5 whenever they gained nothing** (SPEC-SMALL ruling "Ten weeks, not eight": the plain
    spec rule). Round 13's reading (no +5 while a place a piece could reach stood pressed and unanswered,
    `RULES.quietBlockedBy`, `unansweredRegions` and the `heldWeek` headline) is gone. Sitting still is punished
    by the Federation instead: once a place has fallen every push opens a new front (`newFrontsFromFighting`), so
    the no-orders bot wins 10% against the sensible bot's 41% (G8). The ruling's own lever for a passive player (a
    push on an unpromised place whose clock has run down takes it) was not needed and is not built.
18. **BACK DOWN near a scared Federation is a step down** (SPEC-SMALL ruling): when jumpiness is over 0.6
    a back-down at a real test eases them a step instead of climbing one (the promise still goes and the
    place is still pressed). Round 15 (rule 40): at most once a game, and it returns no place; jumpiness now shows in
    the main loop too (the doorstep slows the scared and provokes the bold).
19. **A far promise cannot be sold** (SPEC-SMALL ruling): a dropped promise is "minded" only when the place
    is within their reach next week, in their arrows, under test or on a real alliance line (`promiseMinded`);
    otherwise it is a small thing to them and the tape says so. Until round 14 that was a 0.35 chance, and an accepted
    far promise was called "the thing in their way"; from round 15 it is refused outright (`dropIndifferent` 0).
20. **Sentences are true** (SPEC-SMALL ruling): `lastBacked` (the treaty's "they could not take X") is set
    only on a real test, and (round 15) cleared when that place falls or is backed down from; WORLD WAR names the first place that fell and stayed fallen (the lowest `fellSeq` among
    the places fighting at the end; with no same-week recovery the tape never shows that place undone); the trawler
    rings about a promised island, or in words that claim no promise; their summit offer never rings in a
    week the player has a way out on the table (two summits in one week contradicted each other).
21. **The debrief teaches** (SPEC-SMALL ruling): at most one "they went for X" thought a week, and only
    when it changed something (a test; a new front a piece could have covered); a feint's thought only when
    the player acted on it; the closing card draws up to three lessons from the game's own tally
    (`lessonsOf`: a feint backed, a back-down said as it went, a doorstep that climbed the ladder, a far promise
    offered up, no moves, no orders, only dashed rings tested, a place out of reach, every word kept, stopped then
    talked; round 15: each true of what happened, rule 42).
22. **Ten weeks** (SPEC-SMALL ruling "Ten weeks, not eight"): `RULES.weeks` 10; FROZEN at the end of week 10;
    a treaty in week w scores `100 − 8w − 5f` (`RULES.score.treatyPerWeek` 8), never below 10. The pack's
    number words follow the rules: `src/redlines/content/load.test.ts` binds every number word about a rule
    (the weeks, world war's eighth place, the treaty's 100, three promises, the costs) to `RULES`, so a rule
    change fails until the words follow.
23. **Cause before effect** (SPEC-SMALL "Rulings after the recheck"): the order is "Backed down at X", then "X
    has fallen"; "You backed X", then "Guns quiet at Y"; "Wintermast accepts: …", then "Guns quiet at Y"; the
    falls of the week, then the spread; a place pressed before "Federation forces push into X" is said. Each line
    is said after its own change, so its beat is the sheet it describes.
24. **A place that falls stays fallen that week, and one that came back stays back** (the same ruling): only a
    place that fell in an earlier week can be quieted (`canRecover`), and the spread passes over a place that came
    back this week. No week's playback shows a place fall and recover, in either order; a week with a fall is
    never a quiet week; WORLD WAR names the first place that fell and stayed fallen.
25. **The WAR boxes always match the sheet**: `war` is recounted by every fall and recovery, mid-week included,
    and each tape line's beat carries the count right after it.
26. **A pressed place shows its clock**: `weeksLeft` (the API above), the same arithmetic as the fall: the act
    phase's value is the number of week-ends to the fall if nothing of yours answers it.
27. **A place lost by an answer climbs no second step**: a place backed down from, lost by a failed back or by
    the third WAIT this week is not also "taken unanswered" (the WAIT-then-BACK DOWN path printed "Backed down
    at Driftholm · now MASSING" and then "Driftholm taken unanswered · now FIGHTING").
28. **A backed promise that holds answers its place that week**: a clock already running there starts again
    (as the trawler's BACK THEM does), so "it held" is never followed by "has fallen" the same week.
29. **What you did is printed as what you did** (SPEC-SMALL ruling): `strings.answers` and `actLine` (see "The
    phone").
30. **Every declared line's tape form is true on the sheet** (SPEC-SMALL ruling): the tape names exactly what
    crosses the line (forces, the fleet or warships, the brigade, promises) and exactly where (the places, or a
    bloc every one of whose places it covers), checked in `load.test.ts`. The Scatter's forces line covers the
    outer islands, the seaward column out from the Republic's coast (Driftholm, Lantern Key, Shoal; the
    Scatter's islands east of its middle on the map), and its tape says so ("Wintermast: no forces on the outer
    islands"); Tern Isle, where the fleet starts, and its neighbours Gullrest and Pebbleby are inner, so the
    first move of a careful hand crosses nothing. No line of either pack is crossed by doing nothing
    (`run.test.ts`).
31. **The second inherited promise is never Edda Vale**, the Republic's own capital.
32. **Another bloc signs the call for a treaty** (`headlines.blocSigned`: "the Scatter signs the call for a
    treaty"): the tape says what they sign.

**Rulings after the second review** (round 15: SPEC-SMALL's last block, as the engine reads it; the owner can
overrule any of them, and the tuning log below says what each costs):

33. **No formula wins.** The shark (the second review's visible-information player) and its one-rule cousins are
    simulator bots and gated: G11 the shark signs at most 60%, G12 neither summits-only nor never-move-a-piece more
    than 45%. The levers, all in the fiction: a way out (yours or their summit) is accepted × 0.6 for each hatched
    place standing unanswered; the "they have been stopped" +0.5 counts only when nothing is hatched; at most one way
    out accepted in any two weeks (`wayOut.spacing`; "Wintermast: 'one thing at a time'"); a ring drawn on a place
    already under siege is a provocation (rule 37).
34. **The treaty is signed over a quiet map, or says what it leaves.** At 100 they sign if nothing fell that week
    and no hatched place stands unanswered (`unansweredRegions`): pressed, nothing of yours answering it, its clock
    ticked at least once (a place pushed this very week has not been yours to answer yet), and within one line-free
    move of a piece of yours. A place nothing of yours can reach does not block the signing (rule 39 makes it out of
    reach, and round 13 found the literal reading freezes every game: here it took sensible to 0.8%). The tape says why
    a bar at 100 did not sign; the TREATY card names the places still hatched ("They keep their forces at Shoal.").
35. **The feint keeps its mystery.** A test call rings before the other column's line prints; that column lands after
    the answer (`afterCall`). Feints continue after the timetable's week, one week in ten (`lateFeintChance`). Two real
    arrows the timetable made are blamed on the timetable (`bothRealTimetable`), not appetite.
36. **The bluff is not a free read.** The opening's collision is drawn from any of the three lines (684 of 2,000
    openings on the real pack are about the bluff: one in three); a real line crossed rings the same `bluff-crossed` call (its step
    on the tape before it); every word on the call's forms is true (WAIT "costs nothing tonight · we see what they do").
37. **A ring drawn on a place already under siege is a provocation** (`PromiseMark.provocation`, `isProvocation`: the
    place hatched, no piece of yours in it). It pauses no clock until they believe it or it is backed on its call; their
    next plan tests it first unless they believe it. **They believe a provocation at belief 60** (`provocationBelief`,
    the debrief's "by now they believed you" line), not the 40 at which they stop testing a ring on an open place: at
    40 the shark signed 61.8% and G11 failed. An owner's question (the price on BACK IT, the visible sign of belief,
    steps at 40).
38. **Doubt is visible where it matters.** BACK IT costs 6 from belief 40 (`believedAt` = `beliefTest`), 12 under it;
    under it the Director's slip on a test says what she has seen of their doubt (`intelDoubted`).
39. **Out of reach means out of reach.** A route through a place a declared line not yet crossed closes to that piece
    (`closedTo`: proximity to both, sea to the fleet, missiles to the brigade; all three lines, since you are not told
    which is the bluff) is not a route (`holdDistance`, `couldHaveReached`). A place only such a route reaches falls
    with no step, and the collision's "nothing of ours can reach it" is drawn only for such a place (and names the
    piece that could get there across the line).
40. **Backing down is never the best answer.** The scared Federation's step down after a back-down happens at most
    once a game (`easedPerGame`), from PUSHING up, and returns no place. Their doorstep: a piece of yours next to the
    Cap slows an easily scared Federation (a push held back next week, "Their forces hold back near X") and provokes
    a bold one (a step up, chance (1 − jumpiness) × 0.45; jumpiness × 0.45 until round 14, which provoked the scared).
41. **A form that will fail says so before you pay.** `offerWayOut` refuses before the price: `'too-early'` before week
    3, `'too-soon'` the week after an accepted way out (the integration), `'no-promises'`, `'piece-home'`;
    `canOfferWayOut` says so for the form to dim. A far promise offered up is still paid for and refused ("a small
    thing"): whether they minded it reads a real alliance line, which the form cannot show (an owner's question). The screens' slips and note read
    `linesCrossedByMove`, `linesCrossedByPromise`, `ringsLeftDashed`, `promiseWillRing`, `isProvocation`,
    `fallsThisWeek` and `fallsEndTheGame` (the words are `strings.act` and `strings.note`).
42. **The debrief reads motives when they were formed.** Each heading's reason is recorded when it is planned
    (`Heading.why`); `notTested` only of a believed ring the plan did not point at, said on the page of the week it was left
    alone (the integration: `quietRing`); a lesson only from what happened
    (`backDownLesson`: "the place fell anyway" only of a place that fell after the back-down and stayed fallen; "they
    climbed a step for it" never of a back-down at the top of the ladder, "· still ALL-OUT" (the integration,
    `BackDownRec.top`: 1 card in 1,800 bot games said it);
    no-orders only when a place a piece could have reached fell unanswered, counting the idle weeks an order could
    have answered), never false, and printed once, on the closing card (no longer the last week's last lines).
43. **Sentences are true, again.** `lastBacked` is cleared when the place falls or is backed down from; a tape line
    says "· now STEP" only when the step changed ("· still TESTING"; a jumpy step or an accident at ALL-OUT prints
    nothing); the +5 line is "They took nothing this week"; WORLD WAR counts its places; the debrief's intro says
    "the weeks", not "the ten weeks"; the summit's reason is "they had taken nothing" when they had; the trawler over an
    island nobody promised is "nobody had promised it"; a far promise offered up is refused, never "the thing in their
    way"; a pull-back is read from the piece (a piece far from their door is no threat); a tape line starts with a
    capital; the week's log always carries its beats (a carried test's week says "They are testing ..." first); no
    headings are planned once the game has ended.
44. **The opening's tape ends on the three declarations** (the inherited promises print first), so the screens' last
    three tape lines are the three lines; `declaredTapes` gives them for a slip that keeps them on the sheet.

## The simulator and the tuning log

`npx tsx tools/redlines-sim.ts [--games 2000] [--bots ...] [--seed R] [--pack content-redlines] [--strict] [--md] [--json out.json]`.
Ten bots (`src/redlines/sim/bots.ts`; round 15 added the last three, SPEC-SMALL "No formula wins"): **shark** (the
second review's visible-information line: drop dashed rings a move cannot fix; walk the pieces to cover the hatched,
unanswered places, the shortest clock first, stepping into them, never onto a line declared for the piece, never
stranding a solid ring; ring the hatched places a piece holds, never an arrow's target; drop rings on calm places
nobody heads for; from week 3 a summit after every quiet week; back every solid test it can pay for, wait on a dashed
one, take their summit), **summit-only** (withdraw everything, never move, back down on every test, a summit every
week it can), **shark-still** (the shark that never moves a piece); and the seven before them: passive (never promises, backs down on every call), passive (never promises, backs down on every call),
promise-everything (three promises wherever, backs every test it can pay for), far-promise (the review's
opening: in week 1 one promise two or more moves from both pieces, nearest their arrows; its pieces never walk
towards it; the far price, 24, kept in hand for everything, ways out included; backed from afar whenever it is
tested and can be paid for; everything else the sensible bot), sensible (walks its pieces towards the arrows and
the three doors, promises holdable threatened places, withdraws what it cannot reach, backs the tests it can hold,
waits once on a test it cannot, offers a way out from week 3 whenever it can afford one and they took nothing last
week, and saves for a summit when one would sign), no-orders (withdraws everything in week 1 and sits still,
taking their summit when it comes: SPEC-SMALL's "sitting still" line), seller (one far dashed promise at a time,
offered up as a dropped promise the week after: the sold far promise of the second review) and **careful** (the
hand the recheck's critic played: withdraw the far inherited rings, walk one piece a move a week towards the front,
never onto a line declared for it, promise only what a piece holds keeping BACK IT's price in hand, back every solid
test it can pay for and back down otherwise, take their summit, offer no way out of its own). The careful hand is
**reported beside the gates, never gated** (SPEC-SMALL "Hand play is reported, not gated"): its treaty / war /
frozen shares, its median treaty week and the share of games in which a solid test went unbacked for want of
influence.

The gates (`src/redlines/sim/gates.ts`) are SPEC-SMALL's ruling "Ten weeks, not eight" word for word: G1 passive
loses in more than 70%; **G2 the far-promise opening wins at most half as often as sensible** (it was "no more
often"); G3 sensible treaty 33 to 50%; G4 FROZEN under 20%; G5 the median treaty in week 5 to 7; G6 six hidden
lines (round 15: the closing card's lessons and dials count, since they print once, on the card); G7 no stall; G8
no-orders at most half of sensible; G9 the seller ten points under sensible; G10 no unfilled slot; G11 the shark at
most 60%; G12 no one-rule bot (summit-only, shark-still) over 45%. `--strict` exits 1 on a failed gate.

**The invariants** (`src/redlines/sim/invariants.ts`, SPEC-SMALL "Rulings after the recheck"), checked on every
game the simulator plays, every week, from the log's beats: no place both falls and recovers in a week (in either
order); a "Guns quiet" only after a step down's cause; a place an answer lost falls after the answer's line; "our
line" after what crossed it; "taken unanswered" after a fall; "out of reach" after its fall; Wintermast's reason
right after the refusal; a bloc's signing right after a quiet week; no quiet week in a week with a fall, and the
week's bar line after every fall; the ending line last; the WAR count beside every line equal to the sheet's (+1 a
fall, −1 a place quieted, nothing else) and to the state's after every call; the clock the sheet showed at SEND
ORDERS (`weeksLeft`) against the falls the week printed (a place that falls by the clock had one week left); and
WORLD WAR naming a place that is fighting and fell on the tape. The count is printed under the gates ("INVARIANTS:
none broken in 14,000 games"); any broken one fails `--strict`. `sim.test.ts` runs every bot on both packs through
it and feeds it a crafted bad log to prove it bites.

The log, each round 400–600 games per bot unless stated, sensible's treaty / war / frozen:

| round | change | sensible T / W / F | note |
| --- | --- | --- | --- |
| 1 | first numbers as BUILD.md (2 pushes from MASSING, reach 2, clock every week, 1 step a week for falls) | 0 / 3 / 97 | the ladder ran away in 70% of games and nothing brought it down |
| 2 | creeping front (reach 1), pushes 1/1/1/2/2, blocs from week 2 | 0 / 1 / 99 | same; the Sound is unreachable for weeks and falls place by place |
| 3 | clock runs only where they push again; believed promises tested more up the ladder; way out refused only at 2 gains; bot walks and respects lines | 0 / 0 / 100 | ladder tamed (80% stay at TESTING) but the bar never fills: no ways out are accepted at TESTING |
| 4 | a blocked Federation takes a summit (+0.2); bar starts 30; their summit offer from PUSHING; bot offers ways out | 37 / 0 / 63 | G3 and G5 pass; far-promise 46% beats sensible: a dashed promise is a lightning rod |
| 5 | far back earns no belief and no turn-away; an accepted drop-promise turns them away; summit offer from TESTING | 70 / 0 / 30 | solved opening sunk (63%); the game too kind |
| 6 | clock every week again (the spec's reading) | 6 / 0 / 93 | too harsh: the first falls come before the pieces can reach |
| 7 | appetite = the chance each push opens a new front (else a test or pressure kept on); accepted drop no longer turns them away; bar 35; summit price 20 | 34 / 2 / 64 | G3 back; frozen games are collapses that ran out of weeks, and near-misses at 60–99 |
| 8 | spread 2 / 4 at FIGHTING / ALL-OUT; summit offers 0.5 when blocked | 40 / 5 / 55 | |
| 9 | a step up per place taken; appetite adds a second push some weeks; bar 40; ALL-OUT spread rolls over promises; summit offers at most two; bot drops far promises first | 45 / 13 / 43 | war finally comes for the sensible bot |
| 10 | blocs and summit offers from week 3; two pushes from MASSING; spread 3 / 6; bar 45 | 39 / 23 / 38 | 103 of 790 treaties in week 3: a promise drawn and sold the same week |
| 11 | a promise must be a week old to be minded; "blocked" from week 3; no way out before week 3; their summit from week 4; bar 50 then 55 | 39 / 23 / 38 | the fixture pack; G4 failed at 38.5% in 2,000 games (the first build's report) |
| 12 (the integrator, on the real pack) | WORLD WAR at eight (SPEC-SMALL v6); the sensible bot offers to drop only a promise a week old (its same-week offers were refused 7 times in 10 at −10 each); spread from MASSING 3 / 5 / 8 and over promises from FIGHTING; a stopped Federation takes a summit more (0.45 / 0.55 at TESTING / PUSHING, +0.5 when blocked, an indifferent drop 0.35); the summit 15; blocs 0.45 | 48 / 39 / 13 | all seven gates pass on seeds R, S and T (2,000 games each): treaty 47.9 / 48.5 / 48.0, frozen 13.5 / 12.4 / 14.0 |
| 13 (the engine fixer, after the second review: SPEC-SMALL's rulings) | the fleet starts at Tern Isle; the fall clock reads the step the week started at; falls move the ladder at most one step a week, and only for places something of yours could have reached (`couldHaveReached`, counting the weeks pressed); spread only at FIGHTING / ALL-OUT, 1 / 2, spared by a piece or a solid promise; a refused way out costs nothing on the bar, their summit refused costs 10; backing a feint earns nothing; BACK DOWN eases a scared Federation; a far promise cannot be sold; the trawler and the bar no longer meet; tests and pressure weighed together (believed rings mostly left alone), turn-away 3 weeks, the Sound a quarter in weeks 1–2; the quiet +5 only with no reachable place pressed and unanswered; Tern Isle off the Scatter forces line (the fleet starts there); the bar starts at 50 | 39 / 10 / 51 | read literally ("no place pressed and unanswered"), the ruling froze the bar in 97% of games (sensible 2 / 1 / 97): the Sound is beyond both pieces and a push there blocked the +5 for three weeks at a time; counting only reachable places gave 61 / 0 / 39 at bar 55, and the bar came down to 50 for G3 (45 left no margin once the fleet's home port was taken off the Scatter line). With a ladder that careful play never climbs, WORLD WAR against the sensible bot is rare by construction, so its losses are FROZEN: G4 cannot hold at 20% together with G3's upper half (see below) |
| 14 (the rebuild, after the recheck: SPEC-SMALL's ten-weeks and recheck rulings; 2,000 games per bot, seeds R) | ten weeks, the treaty 100 − 8w − 5f, FROZEN at the end of week 10; the +5 whenever nothing was taken; cause before effect and no same-week recovery; the far-promise bot rebuilt as the review's opening; then the levers below: both arrows real from week 4, an unbelieved ring in reach draws the first push six times in ten, every push a new front once a place is fighting, backing down from a dashed ring loses it at once, the bar starts at 45 | 40.8 / 51.1 / 8.1 | all ten gates pass on R, S and T with margin; no invariant broken in 42,000 games |
| 15 (the engine fixer, after the second review: SPEC-SMALL's "Rulings after the second review"; 2,000 games per bot, seeds R; ten bots) | the truths (lessons, the treaty's place, the forms, the tape, the debrief's motives) and the rulings: the shark and its one-rule cousins gated (G11, G12); a way out accepted × 0.6 a standing unanswered place, the stopped pull only with nothing hatched, one accepted way out in two weeks; a ring on a besieged place a provocation (believed at 60); the treaty only over a map with no reachable place standing unanswered; the other column after the call, a late feint one week in ten, both arrows real from week 3; the collision from any line; a real line rings the call; BACK IT 6 from belief 40; routes through declared lines are not routes; the scared step down once, no place back; the doorstep slows the scared and provokes the bold; then the bar at 50 and blocs at 0.55 | 42.1 / 43.0 / 14.8 | all twelve gates pass on R, S and T; the shark 55.8 / 56.8 / 56.7; no invariant broken in 60,000 games |
| 15, integrated (the integrator; 2,000 games per bot, seeds R / S / T) | a way out the week after an accepted one is refused before the price is paid (`'too-soon'`: a refusal fixed in advance, dimmed on the form); with it the shark signed 58.9 / 60.1 / 60.0 and G11 failed on S, so a summit at TESTING is taken at 0.35 (0.45); the debrief's left-alone ring on the page of the week it was left alone, once a game; no "they climbed a step" lesson for a back-down at the top | 43.6 / 41.3 / 15.0 | all twelve gates pass on R, S and T; the shark 55.9 / 57.3 / 56.8; no invariant broken in 60,000 games |

**Round 15 in detail** (the engine fixer, after the second review). The review's shark reproduced on this tree before
any change: 79.6% treaties on seeds T (500 games; summit-only 26.0%, the shark that never moves 63.4%, sensible 40.6%).
The truths first (no rule meant to move a number): the closing card's lessons, the treaty's "could not take X", the
forms and the tape, the debrief's motives, the way-out refusals before the price, the opening's tape. With them and
the routes through declared lines (rule 39), round 14's rules gave (1,000 games, seeds R) sensible 40.3 / 42.4 / 17.3,
far-promise 15.1, no-orders 11.4, seller 3.0 (the far promise now refused outright), careful 19.8 / 52.6 / 27.6: the
lines closing routes made more falls out of reach, so fewer collapses climb to WORLD WAR and FROZEN rose from 8% to
17%. Then the rulings' levers, every variant tried (sensible treaty / war / frozen; then careful, shark, summit-only,
shark-still treaty; 500 games on seeds R unless marked):

| variant | sensible | careful | shark | summit-only | shark-still | gates |
| --- | --- | --- | --- | --- | --- | --- |
| every lever on, "stands unanswered" read literally (any hatched place unanswered; 1,000) | 0.1 / 58.1 / 41.8 | 0.0 | 5.3 | 0.0 | 0.6 | G3, G4, G6, G9 fail: a place pushed this week blocks the signing every week |
| a place stands unanswered once its clock has ticked (1,000) | 0.8 / 56.2 / 43.0 | 0.5 | 20.0 | 0.0 | 4.8 | G3, G4, G5 |
| from that, the quiet map off | 24.8 / 48.6 / 26.6 | 12.4 | 56.6 | 6.2 | 24.6 | the quiet map is the lever that bites |
| from that, the unanswered × 0.6 off; the stopped pull always; one way out a week; BACK IT 6 at 60; provocations off (one at a time) | 0.8 · 0.8 · 1.2 · 0.4 · 0.8 treaty | 0.8 · 0.6 · 0.6 · 0.4 · 0.6 | 20.4 · 24.8 · 25.6 · 17.2 · 22.0 | 0.0 | 5.2 · 5.8 · 5.2 · 3.8 · 5.6 | each small beside the quiet map |
| every round-15 lever off (round 14's rules with this round's truths) | 38.8 / 44.0 / 17.2 | 18.4 | 85.8 | 32.6 | 63.6 | G11, G12 fail |
| stands unanswered after two ticks | 10.0 / 52.8 / 37.2 | 5.2 | 42.4 | 5.0 | 17.4 | G3, G4 |
| **only places a piece could hold with one line-free move stand unanswered** (rule 34) | 31.0 / 44.6 / 24.4 | 15.4 | 56.4 | 1.4 | 13.4 | G3, G4 |
| the same with two moves / with two ticks | 27.2 / 47.0 / 25.8 · 38.2 / 40.4 / 21.4 | 12.0 · 18.0 | 53.0 · 65.0 | 1.2 · 8.8 | 12.2 · 25.6 | G3, G4 · G4, G11 |
| one move, the bar at 50 | 41.2 / 38.0 / 20.8 | 20.2 | 61.8 | 3.0 | 18.6 | G4, G11 |
| one move, the bar at 55 | 53.4 / 32.6 / 14.0 | 30.6 | 70.6 | 3.6 | 23.4 | G3, G5, G11 |
| one move, blocs at 0.6 | 38.6 / 41.0 / 20.4 | 19.6 | 60.4 | 1.8 | 15.4 | G4, G11 |
| bar 50, a provocation believed at 60 (rule 37) | 40.8 / 38.2 / 21.0 | 19.4 | 55.2 | 3.0 | 14.4 | G4 |
| bar 50, a provocation never believed | 39.2 / 38.4 / 22.4 | 17.4 | 47.6 | 3.0 | 9.8 | G4; against the ruling's "unless they believe you" |
| bar 50: two places of spread at FIGHTING; three pushes at ALL-OUT; three from FIGHTING | 41.2 / 38.0 / 20.8 (all three) | 20.2 | 61.8 | 3.0 | 18.6 | no effect: FROZEN games never climb past PUSHING (73% of their falls are out of reach; 6.4 falls a game, the bar at 60 to 90) |
| bar 50, both arrows real from week 3 | 38.2 / 43.2 / 18.6 | 18.4 | 60.0 | 1.8 | 16.2 | pass with no margin on G11 |
| bar 55, from week 3 | 49.4 / 38.2 / 12.4 | 27.6 | 65.8 | 1.8 | 20.4 | G5, G11 |
| bar 50, no late feint | 38.8 / 43.8 / 17.4 | 19.2 | 60.2 | 2.2 | 16.0 | G11 |
| bar 50, from week 3, the way out's × 0.6 counts every standing place (reachable or not); bar 55 the same | 26.0 / 52.4 / 21.6 · 37.2 / 47.2 / 15.6 | 12.2 · 19.8 | 53.4 · 60.2 | 1.0 · 1.4 | 13.2 · 16.6 | G3, G4 · G5, G11 |
| bar 50, from week 3, × 0.4 a standing place | 38.2 / 43.8 / 18.0 | 18.6 | 60.0 | 1.8 | 14.8 | no margin |
| C1: bar 50, from week 3, provocation believed at 60 (1,000; R / S / T) | 40.2 / 40.2 / 38.3 treaty, frozen 17.1 / 19.6 / 19.5 | 18.0 / 18.1 / 20.6 | 54.7 / 57.8 / 53.9 | 1.7 / 1.8 / 1.8 | 12.9 / 13.7 / 12.6 | pass, G4 by 0.4 on S |
| C1, both arrows from week 2 (1,000, S) | 20.8 / 55.1 / 24.1 | 10.8 | 47.1 | 0.6 | 8.9 | G3, G4 |
| C1, a late feint one week in ten (1,000, S) | 39.8 / 42.0 / 18.2 | 17.1 | 56.3 | 1.5 | 13.2 | pass |
| C1, a hungrier second push (scale 3); the Sound at half in weeks 1-2 (1,000, S) | 38.9 / 41.1 / 20.0 · 34.5 / 44.9 / 20.6 | 17.9 · 14.8 | 56.6 · 49.8 | 1.8 · 3.0 | 13.0 · 13.9 | G4 · G4 |
| C1 + late feints 0.1 (2,000; R / S / T) | 37.4 / 38.5 / 37.4 treaty, frozen 17.0 / 17.1 / 19.3 | 18.3 / 17.5 / 19.6 | 52.4 / 54.3 / 53.4 | 1.4 / 1.3 / 1.4 | 11.4 / 12.6 / 11.9 | pass, G4 by 0.7 on T |
| that, blocs 0.55 / 0.6; late feints 0.08 with blocs 0.5 (2,000, T) | 41.5 / 41.4 / 17.1 · 44.4 / 40.0 / 15.6 · 39.3 / 42.6 / 18.1 | 22.4 · 23.9 · 21.0 | 56.7 · 57.8 · 55.0 | 1.6 · 1.6 · 1.3 | 13.4 · 14.5 · 12.3 | pass |
| **chosen: C1 + late feints 0.1 + blocs 0.55** (2,000, the simulator CLI; R / S / T) | 42.1 / 43.8 / 41.5 treaty, war 43.0 / 41.8 / 41.4, frozen 14.8 / 14.4 / 17.1 | 21.0 / 21.1 / 22.4 | 55.8 / 56.8 / 56.7 | 1.8 / 1.6 / 1.6 | 13.5 / 14.3 / 13.5 | all twelve pass; nearest margins G4 2.9 (T), G11 3.2 (S) |

Why these levers. The shark's line had two halves: rings on hatched places (a pause for 2 influence and no call) and
a summit after every quiet week (the +0.5 for a stopped Federation, which a quiet week while their siege stood still
earned). The ruling's own levers hit both, but its treaty rule, read literally, hit every player: a place pushed this
week is hatched and unanswered at every week's end, and an unreachable one stands for its whole clock, so nobody
signed. Two readings keep the ruling's sense: a place stands unanswered once its clock has ticked (a week's push has
not yet been yours to answer), and only when a piece of yours could hold it with one line-free move (a place you
cannot reach is not yours to answer, as round 13 found for the +5; rule 39 already gives its fall no step). With them
the bar at 50 brings the sensible bot back to the gate's middle. The shark still tracked the sensible bot one and a
half times over until the provocation was read as asking for more belief than a ring on an open place (60, the
debrief's "by now they believed you"): the shark's rings are drawn into their siege, the sensible bot's ahead of it.
FROZEN is this round's tight gate: with routes through declared lines closed, the falls of a fenced-off Sound carry
no step, the ladder stays low, and a game can run out of weeks with six places fighting. Both arrows real from week 3
and the blocs at 0.55 keep it under 20% on all three seed sets; the spread, the pushes at the top of the ladder and
the Sound's early weight do not reach those games. The no-orders bot and the seller now almost never sign (0.5% and
0.1%): a passive map always has a standing place, and a far promise cannot be sold at all.

**Round 15, integrated.** The screens fixer's way-out form dims a term the engine says cannot be offered; one refusal
fixed in advance was left out of it: a way out the week after one was accepted ("Wintermast: 'one thing at a time'",
rule 33's spacing), still paid for in full. The integration refuses it before the price (`'too-soon'`) and the form
dims it ("they took a way out last week"). A shark that no longer throws 15 away on it is a stronger shark: 58.9 / 60.1
/ 60.0 on R / S / T (G11 fails on S), sensible 44.0 / 45.4 / 43.6. The variants tried with it (sensible treaty / war /
frozen; careful, shark, summit-only, shark-still treaty; 2,000 games, a scratch harness over `simulate`):

| variant (with `'too-soon'`) | sensible | careful | shark | summit-only | shark-still | gates |
| --- | --- | --- | --- | --- | --- | --- |
| nothing else (R / S / T, the simulator CLI) | 44.0 · 45.4 · 43.6 treaty | 21.0 · 21.1 · 22.4 | 58.9 · 60.1 · 60.0 | | | G11 fails on S |
| at most one accepted way out in three weeks (S) | 44.9 / 39.3 / 15.9 | 20.9 | 60.6 | 1.1 | 14.9 | G11 |
| blocs sign at 0.5 (S) | 42.5 / 41.2 / 16.3 | 19.4 | 59.0 | 1.4 | 14.8 | pass, G11 by 1.0 |
| the stopped pull 0.4 (S) | 45.4 / 39.5 / 15.1 | 21.1 | 60.0 | 1.6 | 15.8 | G11 |
| the summit costs 20 (R / S / T) | 42.1 / 41.8 / 16.1 · 44.4 / 39.1 / 16.5 · 41.1 / 40.9 / 18.1 | 21.0 · 21.1 · 22.4 | 56.0 · 56.6 · 57.3 | 1.8 · 1.6 · 1.6 | 13.4 · 14.3 · 12.7 | pass; G4 by 1.9 on T, and every player's price changes |
| a summit at TESTING taken at 0.40 (R / S / T) | 43.9 / 41.1 / 15.0 · 45.0 / 39.7 / 15.3 · 43.4 / 39.3 / 17.4 | 21.0 · 21.1 · 22.4 | 57.3 · 58.6 · 58.5 | 1.6 · 1.3 · 1.4 | 14.1 · 14.7 · 14.4 | pass, G11 by 1.4 on S |
| **chosen: a summit at TESTING taken at 0.35** (R / S / T) | 43.6 / 41.3 / 15.0 · 44.6 / 39.9 / 15.6 · 43.2 / 39.4 / 17.4 | 21.0 · 21.1 · 22.4 | 55.9 · 57.3 · 56.8 | 1.6 · 1.3 · 1.3 | 13.3 · 14.1 · 13.8 | all twelve pass; nearest margins G4 2.6 (T), G11 2.7 (S) |

Why this lever: the shark's gain was the influence a sure refusal no longer cost it, spent on summits at the foot of the
ladder (it stays at TESTING in 43% of its games); the careful hand offers no way out and does not move; the visible price
of a summit stays 15 for everybody. The integration's two debrief truths (the left-alone ring said on its own week's page,
and no "they climbed a step" for a back-down at the top) roll no dice and move no number; the fewest hidden lines in a
debrief went from 9 / 9 / 8 to 8 / 8 / 7 (G6 is six).

The numbers ended on (round 15, integrated), 2,000 games per bot, seeds R0–R1999, the real pack (`npm run sim:redlines`):

```
BRINK · RED LINES SIMULATOR
2,000 games per bot (passive, promise-everything, far-promise, sensible, no-orders, seller, careful, shark, summit-only, shark-still), seeds R0-R1999, 13 phone templates from content-redlines · 37.5 s

GATES (BUILD.md "The simulator")
gate  what                                                                    value                result
G1    Passive loses (war or frozen) in more than 70%                          100.0%               PASS
G2    The far-promise opening wins at most half as often as sensible          9.7% vs 43.6%        PASS
G3    Sensible wins (treaty) between a third and a half                       43.6%                PASS
G4    Sensible ends FROZEN in fewer than 20%                                  15.0%                PASS
G5    The median sensible treaty is signed in week 5 to 7                     week 5               PASS
G6    Every game's debrief has at least six hidden lines                      min 8                PASS
G7    No game stalls                                                          0                    PASS
G8    Sitting still (no orders) wins at most half as often as sensible        0.5% vs 43.6%        PASS
G9    The sold far promise wins at least ten points less often than sensible  0.2% vs 43.6%        PASS
G10   No line reaches the player with a slot unfilled                         0                    PASS
G11   The shark (the strongest visible line found) signs at most 60%          55.9%                PASS
G12   No one-rule bot (summits only; never move a piece) signs more than 45%  13.3% (shark-still)  PASS
=> ALL GATES PASS

INVARIANTS: none broken in 20,000 games (cause before effect, no place falls and recovers in a week, WAR beside every line, the clock against the real fall)

HAND PLAY (SPEC-SMALL: reported beside the gates, not gated)
hand     games  treaty  war    frozen  treaty week (median)  a solid test unbacked for influence
careful  2000   21.0%   58.3%  20.8%   5                     0.0%

OUTCOMES
bot                 games  treaty  war     frozen  stalls  median score  treaty week (median)  war week (median)  war peak (median)
passive             2000   0.0%    100.0%  0.0%    0       0             -                     6                  9
promise-everything  2000   0.2%    95.3%   4.5%    0       0             6                     7                  9
far-promise         2000   9.7%    71.9%   18.5%   0       0             5                     9                  8
sensible            2000   43.6%   41.3%   15.0%   0       3             5                     9                  6
no-orders           2000   0.5%    99.4%   0.1%    0       0             5                     7                  9
seller              2000   0.2%    99.7%   0.1%    0       0             5                     7                  9
careful             2000   21.0%   58.3%   20.8%   0       0             5                     9                  8
shark               2000   55.9%   16.2%   28.0%   0       39            5                     9                  1
summit-only         2000   1.6%    98.3%   0.1%    0       0             5                     7                  9
shark-still         2000   13.3%   46.3%   40.5%   0       2             6                     9                  7

THE PHONE (means per game)
bot                 phones  tests  backed  backed down  waited  ways out offered  accepted  short of influence  idle weeks  hidden lines (min / median)
passive             4.0     1.0    0.0     1.0          0.0     0.0               0.0       0.0%                100.0%      20 / 26
promise-everything  6.8     5.9    2.6     3.3          0.0     0.0               0.1       93.4%               45.2%       19 / 34
far-promise         7.1     5.4    3.0     1.0          1.4     1.0               0.6       49.0%               45.7%       10 / 40
sensible            4.4     3.3    3.1     0.0          0.1     1.8               1.2       6.3%                36.9%       11 / 36
no-orders           3.2     0.0    0.0     0.0          0.0     0.0               0.4       0.0%                86.6%       11 / 27
seller              3.3     0.2    0.2     0.0          0.0     4.7               0.1       0.4%                18.4%       12 / 33
careful             5.6     3.4    3.4     0.0          0.0     0.0               0.7       0.0%                46.6%       10 / 35
shark               3.4     2.1    1.9     0.0          0.2     2.0               1.0       10.0%               12.6%       8 / 23
summit-only         3.0     0.0    0.0     0.0          0.0     4.7               0.5       0.0%                22.5%       11 / 32
shark-still         3.9     1.7    1.7     0.0          0.1     2.6               1.0       4.9%                32.5%       10 / 36

THE LADDER (games by the highest step reached)
bot                 TESTING  PUSHING  MASSING  FIGHTING  ALL-OUT
passive             0.0%     0.1%     2.0%     20.0%     77.9%
promise-everything  0.1%     3.1%     6.8%     15.0%     75.0%
far-promise         2.5%     25.2%    21.6%    31.8%     18.9%
sensible            30.5%    30.8%    20.4%    13.4%     4.9%
no-orders           0.5%     0.1%     7.2%     39.9%     52.3%
seller              0.1%     0.4%     6.3%     36.0%     57.3%
careful             25.3%    19.4%    20.2%    19.3%     15.8%
shark               43.0%    30.2%    9.2%     9.7%      8.1%
summit-only         1.5%     0.2%     5.5%     40.3%     52.6%
shark-still         4.5%     32.8%    18.5%    21.9%     22.2%

TREATIES BY WEEK (sensible)
week      1  2  3  4    5    6    7   8   9   10
treaties  0  0  0  247  439  108  44  20  13  2

WHAT THEY WERE LIKE (sensible)
treaty share by dial                                      low    mid    high
appetite (careful / steady / hungry)                      60.8%  44.7%  25.7%
jumpiness (not easily scared / watchful / easily scared)  42.5%  42.4%  46.2%
```

**Round 15, integrated, on three seed sets** (2,000 games per bot; `--seed S` and `--seed T` reproduce them): sensible
treaty 43.6 / 44.6 / 43.2, war 41.3 / 39.9 / 39.4, frozen 15.0 / 15.6 / 17.4, median treaty week 5 / 5 / 5; the shark
55.9 / 57.3 / 56.8; summit-only 1.6 / 1.3 / 1.3; shark-still 13.3 / 14.1 / 13.8; far-promise 9.7 / 9.5 / 8.8; no-orders
0.5 / 0.5 / 0.6; seller 0.2 / 0.1 / 0.1; promise-everything 0.2 / 0.3 / 0.3; passive loses 100 / 100 / 100; the fewest
hidden lines in a debrief 8 / 8 / 7; no unfilled slot, no stall, no invariant broken in 60,000 games. **The careful
hand** (reported, not gated): treaty 21.0 / 21.1 / 22.4%, war 58.3 / 59.4 / 56.8%, frozen 20.8 / 19.6 / 20.8%, median
treaty week 5; a solid test unbacked for want of influence in 0.0 / 0.0 / 0.1% of its games (BACK IT costs 6 from
belief 40). Before the integration (the engine fixer's round 15): sensible 42.1 / 43.8 / 41.5, frozen 14.8 / 14.4 /
17.1, the shark 55.8 / 56.8 / 56.7, the careful hand the same (it offers no way out).

The round-14 sections below are history: its levers, its numbers and its integration, before the second review.

**Round 14 in detail.** The lost integrator's report of this round (all ten gates on R, S and T: sensible 48.4 / 36.2
/ 15.4, far-promise 23.5%, no-orders 16.6%, seller 17.6%) was the starting point; its code was lost with the
container, so the round was rebuilt and re-tuned on this tree, after the recheck's engine fixes (which change the
game: a step down no longer undoes the week's own fall, a held back answers its place, the Scatter's forces line
covers three islands, not five). Its levers as reported (`bothRealFromWeek` 4, `weight.dashedFirst` 0.6,
`newFrontsFromFighting` 2, two places of spread at FIGHTING, `backDownFarTakes`, the bar at 50) gave on this tree
**sensible 49.1 / 40.9 / 10.0, far-promise 27.0%: G2 fails** (half of 49.1 is 24.6) and G3 sits 0.9 under its
ceiling. Every variant tried, 1,000 games per bot on seeds R unless marked 2,000, sensible treaty / war / frozen,
then far-promise, no-orders, seller (treaty %), careful hand (treaty / war / frozen):

| variant (from the reported levers unless said) | sensible | far | no-orders | seller | careful | gates |
| --- | --- | --- | --- | --- | --- | --- |
| the reported levers as they stand | 49.1 / 40.9 / 10.0 | 27.0 | 14.5 | 14.8 | 29.2 / 53.3 / 17.5 | G2 fails |
| a dashed ring draws the first push 8 or 10 times in 10 | 49.2 / 41.0 / 9.8 | 27.3 | 14.5 | 14.7 | 29.0 / 53.4 / 17.6 | G2; no effect (the far ring is rarely in their reach) |
| one place of spread at FIGHTING (the gentler reading) | 49.1 / 40.7 / 10.2 | 27.0 | 14.5 | 14.8 | 29.2 / 53.1 / 17.7 | G2; no effect: kept, as the gentler spread |
| the bar starts at 45 | 41.0 / 43.8 / 15.2 | 19.6 | 10.9 | 12.1 | 20.5 / 56.2 / 23.3 | pass, G2 by 0.9 |
| both arrows real from week 3 | 46.1 / 45.7 / 8.2 | 22.7 | 1.4 | 3.9 | 25.3 / 56.6 / 18.1 | pass, G2 by 0.4; sitting still never wins |
| both arrows real from week 5 | 52.4 / 34.6 / 13.0 | 31.8 | 16.3 | 17.3 | 36.6 / 43.1 / 20.3 | G2, G3 |
| new fronts once one place is fighting | 48.6 / 46.1 / 5.3 | 24.6 | 14.1 | 14.2 | 27.2 / 62.0 / 10.8 | G2 by 0.1 |
| new fronts once three are fighting | 49.5 / 37.8 / 12.7 | 27.4 | 14.5 | 14.9 | 29.2 / 48.2 / 22.6 | G2 |
| blocs sign at 0.35 | 45.4 / 42.4 / 12.2 | 23.1 | 12.9 | 13.4 | 25.2 / 54.6 / 20.2 | G2 |
| far backs fail one time in two (BUILD's 1 in 3) | 49.1 / 40.9 / 10.0 | 27.2 | 14.5 | 14.8 | | G2; the far bot backs 0.4 times a game |
| a failed far back takes the place at once | 49.1 / 40.9 / 10.0 | 26.5 | 14.5 | 14.8 | | G2 (the lost round rejected it too) |
| a far back that holds earns no step down | 49.1 / 40.9 / 10.0 | 26.8 | 14.5 | 14.8 | | G2; against the spec's "backed and held" |
| a far back costs 30 | 49.1 / 40.9 / 10.0 | 25.7 | 14.5 | 14.8 | | G2 |
| bar 45 + new fronts at one | 39.7 / 51.7 / 8.6 | 17.5 | 10.4 | 11.8 | 19.0 / 66.6 / 14.4 | pass |
| new fronts at one + blocs 0.35 | 45.2 / 48.3 / 6.5 | 19.7 | 12.7 | 12.7 | 24.4 / 63.6 / 12.0 | pass, G2 by 2.9 |
| new fronts at one + blocs 0.4 (2,000; R / S / T) | 47.3 / 47.6 / 46.9 treaty | 21.6 / 22.9 / 21.4 | 12.8 / 13.6 / 12.2 | 12.7 / 13.7 / 12.3 | 26.1 / 27.6 / 28.7 treaty | pass; G2 by 0.9 on S |
| bar 45 + new fronts at one + blocs 0.5 (2,000; R / S / T) | 43.6 / 44.8 / 43.7 treaty | 18.8 / 18.6 / 19.0 | 10.8 / 10.9 / 10.6 | 11.8 / 13.2 / 11.3 | 22.9 / 23.6 / 24.1 treaty | pass |
| **bar 45 + new fronts at one, one spread at FIGHTING (chosen; 2,000; R / S / T)** | 40.7 / 42.3 / 41.9 treaty | 17.2 / 17.2 / 17.4 | 10.3 / 10.3 / 9.8 | 11.2 / 12.6 / 11.0 | 20.9 / 21.9 / 22.3 treaty | pass with margin |
| then: the first push goes to any ring they do not believe (dashed, or solid while belief is under 40), not only a dashed one (2,000; R / S / T) | 40.8 / 42.5 / 41.9 treaty | 16.8 / 17.4 / 17.6 | 10.3 / 10.3 / 9.8 | 11.2 / 12.6 / 11.0 | 20.8 / 21.9 / 22.3 treaty | kept: the spec's "tests promises it does not believe", so a collapse still tests a doubted ring |
| around the choice (2,000, R): bar 40 | 32.8 / 56.7 / 10.5 | 10.8 | 8.8 | 8.4 | 15.0 / 68.8 / 16.1 | G3 |
| bar 50 | 48.9 / 46.0 / 5.1 | 22.9 | 13.3 | 13.4 | 28.1 / 61.3 / 10.7 | pass by 1.1 (G3) and 1.5 (G2) |
| new fronts once two are fighting (the reported value) | 41.3 / 43.5 / 15.3 | 18.3 | 10.8 | 11.6 | 21.6 / 54.3 / 24.2 | pass, G4 by 4.7 |
| two places of spread at FIGHTING (the reported value) | 40.8 / 51.1 / 8.1 | 16.8 | 10.3 | 11.2 | 20.8 / 65.4 / 13.8 | pass; the same as one |
| both arrows real from week 3 / from week 5 | 36.2 / 56.4 / 7.4 · 44.6 / 47.1 / 8.3 | 12.6 · 19.1 | 0.3 · 12.2 | 2.9 · 13.6 | 17.8 · 27.1 treaty | pass · pass |
| no first push for an unbelieved ring / always | 40.6 / 51.6 / 7.8 · 40.9 / 51.0 / 8.1 | 18.1 · 16.7 | 10.3 · 10.3 | 11.2 · 11.3 | 21.1 · 20.6 treaty | pass · pass |
| backing down from a dashed ring leaves it pressed (no `backDownFarTakes`) | 40.8 / 51.1 / 8.1 | 17.3 | 10.3 | 11.2 | 20.8 / 65.3 / 13.9 | pass; kept for the tape's sake (the critic's path) |
| blocs sign at 0.55 | 45.6 / 47.6 / 6.8 | 19.7 | 11.3 | 12.4 | 25.3 / 62.9 / 11.8 | pass |

Why these levers. The far-promise bot, rebuilt as the review played it, backs its far ring only 0.4 times a game:
it is tested about twice, and with the far price kept in hand it can rarely pay; it waits, then backs down, and the
ring is lost. So nothing about the far back itself (its cost, its odds, its step) moves G2; what separates it from
the sensible bot is that it loses a place early and spends the game short. **Once a place is fighting, every push
opens a new front** (`newFrontsFromFighting` 1): a hand that has lost a place pays for it at once, which sinks the
far opening, the sold promise and sitting still together, and a collapse ends inside the ten weeks instead of
FROZEN. That alone left the sensible bot at the gate's ceiling (48.6%); **the bar starts at 45** (one quiet week
lower) centres it (40.8 / 42.5 / 41.9 on R / S / T). Two places of spread at FIGHTING changed nothing measurable and
the gentler one place stays; the first push for a ring they do not believe changes little for the bots (their
rings are mostly solid and believed) but is the spec's deterrence model, and it keeps a collapsing Federation testing
a doubted ring instead of only opening fronts. The ruling's passive-player lever (a push on an unpromised place
whose clock has run down takes it) is not built: G8 holds with eleven points of margin without it.

Round 14's numbers (history), 2,000 games per bot, seeds R0–R1999, the real pack (`npm run sim:redlines`,
which is `tools/redlines-sim.ts --pack content-redlines --strict`):

```
BRINK · RED LINES SIMULATOR
2,000 games per bot (passive, promise-everything, far-promise, sensible, no-orders, seller, careful), seeds R0-R1999, 13 phone templates from content-redlines · 20.6 s

GATES (BUILD.md "The simulator")
gate  what                                                                    value           result
G1    Passive loses (war or frozen) in more than 70%                          100.0%          PASS
G2    The far-promise opening wins at most half as often as sensible          16.8% vs 40.8%  PASS
G3    Sensible wins (treaty) between a third and a half                       40.8%           PASS
G4    Sensible ends FROZEN in fewer than 20%                                  8.1%            PASS
G5    The median sensible treaty is signed in week 5 to 7                     week 5          PASS
G6    Every game's debrief has at least six hidden lines                      min 9           PASS
G7    No game stalls                                                          0               PASS
G8    Sitting still (no orders) wins at most half as often as sensible        10.3% vs 40.8%  PASS
G9    The sold far promise wins at least ten points less often than sensible  11.2% vs 40.8%  PASS
G10   No line reaches the player with a slot unfilled                         0               PASS
=> ALL GATES PASS

INVARIANTS: none broken in 14,000 games (cause before effect, no place falls and recovers in a week, WAR beside every line, the clock against the real fall)

HAND PLAY (SPEC-SMALL: reported beside the gates, not gated)
hand     games  treaty  war    frozen  treaty week (median)  a solid test unbacked for influence
careful  2000   20.8%   65.3%  13.9%   6                     14.9%

OUTCOMES
bot                 games  treaty  war     frozen  stalls  median score  treaty week (median)  war week (median)  war peak (median)
passive             2000   0.0%    100.0%  0.0%    0       0             -                     6                  9
promise-everything  2000   2.1%    91.8%   6.2%    0       0             5                     8                  9
far-promise         2000   16.8%   74.8%   8.5%    0       0             6                     9                  8
sensible            2000   40.8%   51.1%   8.1%    0       0             5                     9                  8
no-orders           2000   10.3%   89.7%   0.1%    0       0             6                     7                  9
seller              2000   11.2%   88.8%   0.0%    0       0             5                     7                  9
careful             2000   20.8%   65.3%   13.9%   0       0             6                     9                  8

THE PHONE (means per game)
bot                 phones  tests  backed  backed down  waited  ways out offered  accepted  short of influence  idle weeks  hidden lines (min / median)
passive             4.1     1.1    0.0     1.1          0.0     0.0               0.0       0.0%                100.0%      20 / 26
promise-everything  7.1     6.1    2.5     3.6          0.0     0.0               0.2       92.8%               40.6%       12 / 35
far-promise         6.7     5.0    2.4     1.1          1.5     1.0               0.9       50.0%               51.6%       10 / 40
sensible            5.0     3.4    2.7     0.2          0.5     1.5               1.3       28.1%               39.1%       9 / 37
no-orders           3.4     0.0    0.0     0.0          0.0     0.0               0.8       0.0%                86.0%       10 / 27
seller              3.2     0.2    0.2     0.0          0.0     3.9               0.9       0.8%                18.6%       10 / 31
careful             5.9     3.3    3.1     0.2          0.0     0.0               0.9       14.9%               49.8%       10 / 37

THE LADDER (games by the highest step reached)
bot                 TESTING  PUSHING  MASSING  FIGHTING  ALL-OUT
passive             0.0%     0.0%     1.1%     21.3%     77.6%
promise-everything  0.5%     19.4%    8.3%     8.5%      63.3%
far-promise         5.3%     17.5%    13.7%    32.2%     31.3%
sensible            21.1%    23.0%    12.8%    23.1%     20.0%
no-orders           0.0%     10.3%    2.1%     21.8%     65.8%
seller              0.3%     10.8%    1.1%     19.6%     68.3%
careful             10.1%    18.8%    18.5%    30.3%     22.3%

TREATIES BY WEEK (sensible)
week      1  2  3  4    5    6    7   8   9   10
treaties  0  0  0  251  328  110  62  49  15  1

WHAT THEY WERE LIKE (sensible)
treaty share by dial                                      low    mid    high
appetite (careful / steady / hungry)                      53.4%  42.3%  26.8%
jumpiness (not easily scared / watchful / easily scared)  38.2%  40.5%  43.8%
```

**Round 14 on three seed sets** (2,000 games per bot, `--seed S` and `--seed T` reproduce them): sensible treaty
40.8 / 42.5 / 41.9, war 51.1 / 50.0 / 50.6, frozen 8.1 / 7.5 / 7.4, median treaty week 5 / 5 / 5; far-promise 16.8 /
17.4 / 17.6 (half of sensible: 20.4 / 21.3 / 21.0); no-orders 10.3 / 10.3 / 9.8; seller 11.2 / 12.6 / 11.0; passive
loses 100 / 100 / 100; promise-everything 2.1 / 2.2 / 2.4; min hidden lines 9; no unfilled slot; no stall; no
invariant broken. All ten gates pass on all three, the nearest margin 3.4 points (G2 on T). **The careful hand**
(reported, not gated): treaty 20.8 / 21.9 / 22.3%, war 65.3 / 64.5 / 64.5%, frozen 13.9 / 13.6 / 13.3%, median
treaty week 6, and in 14.9 / 15.8 / 15.3% of its games a solid test went unbacked for want of influence. The
recheck's six hand-played games produced no treaty (the hand reached 90% in week 6 and broke on influence in week
7); the bot signs about one game in five. Whether influence is too tight is the owner's and the cold testers' call
(SPEC-SMALL), not this round's.

**Round 14, integrated** (the integrator, on the tree with the screens' work joined to the engine's): `npm run
sim:redlines` and `--seed S` / `--seed T` re-run with every figure above unchanged (the integration changed one tape
line, PROTEST about a place nobody promised, which draws no roll) and no invariant broken in 42,000 games. The
screens now play a week from the log's own beats (`WeekLog.beats`: the kind, the place, the step and the bar beside
each line) and count the WAR boxes from the sheet each beat draws; `src/redlines/ui/app/beats.engine.test.ts` plays
280 real games of the seven bots through the playback and finds the sheet's count equal to the engine's on every
beat. Two real-tap games on the built app (seed `SWG-RRP`, from the title's PLAY) were played as a careful hand: the
bot's own decisions lost to WORLD WAR in week 7, a person's reading of the same rules (step a piece into a pressed
place, send what you have when an unpromised place is about to fall) lost in week 8. What the bot does that a person
would not: once a piece is within one move of the front it never steps *into* a pressed place to answer it (a piece
standing in a place pauses its clock), it never promises an island a declared line covers even when the line is the
bluff, and it lets an unpromised place go on the phone with influence in hand. Its 21% treaty share is a floor for
careful play, not a measure of it; whether influence is too tight remains the owner's and the cold testers' call.

The history below is round 13's (eight weeks), kept for the record: the G4 failure it describes is what the owner's
ten-weeks ruling answered (round 14 above).

**Round 13 on three seed sets** (2,000 games per bot, seeds R / S / T, the bar at 50): sensible treaty 42.3 /
38.6 / 40.4, war 7.0 / 8.4 / 7.4, frozen 50.7 / 53.0 / 52.2, median treaty week 5; passive loses 100 / 100 / 100
(war 88–90); far-promise 36.9 / 35.5 / 36.3; no-orders 8.9 / 9.7 / 8.6; seller 10.0 / 10.3 / 9.7; min hidden 6; no
unfilled slot; no stall. Gates G1–G3 and G5–G10 pass on all three; **G4 fails at about 50%**. Why, and what the
owner can choose:

- Under the rulings a careful player's ladder does not climb: tests are backed (a step down), lines avoided, no
  back-downs, and a place nothing could reach falls without a step. Without the ladder there is no spread, and
  eight falls by pushes alone (one a week at TESTING and PUSHING, three weeks' clock) do not fit in eight weeks.
  So the sensible bot cannot lose to WORLD WAR except through accidents and hungry Federations (6–7%); its loss
  is FROZEN: a Sound place or two taken every two or three weeks, −5 each and a fall blocking the signing that
  week, with the bar at 60–95 at the end (near misses) or four to six places fighting (collapses that ran out of
  weeks). G3's upper half (≤ 50% treaty) and G4 (< 20% frozen) together need WORLD WAR in 30% of sensible games,
  which the rulings rule out.
- Options, in the owner's gift: (a) accept FROZEN as the sensible player's loss and set G4 to "frozen under 55%"
  (or judge "treaty between a third and a half, and fewer than 10% WORLD WAR" instead); (b) let a place that
  stood pressed for its full clock count as a step whether or not a piece could have reached it (`fellReach`
  always true: this restores war but contradicts "out of reach falls without a step"); (c) make the Sound
  reachable (a lane Tern Isle–Lintel, or two fleet moves a week), so that the unanswerable front that freezes
  these games can be answered; (d) raise the bar's start to 50–55 and accept 52–65% treaties (G3's upper half
  fails instead). The numbers for each were in that round's scratch tuning harness (not kept in the tree).
- The two tuning knobs the round left in `rules.ts` for that choice: `quietBlockedBy` ('reachable' | 'any') and
  `outOfReachFallWeeks` (null: the step's clock; 2: the Sound falls faster, sensible 42 / 1 / 57; 0: at once,
  passive 85% war but sensible 6 / 9 / 84). Both were removed in round 14 (the ruling made the +5 plain, and the
  ten weeks closed G4 without a faster Sound clock).

**How round 12 closed G4.** The first build's frozen games on this pack (28.5% at 2,000 games, with
WORLD WAR already at eight) split three ways: near-misses, a careful Federation held to a place or two
with the bar at 60–99 at the end of week 8 (323 games); collapses that reached ALL-OUT only in week 7
or 8 and ran out of weeks at five to seven places fighting (108); and games in between (139). Three
things, each in its own place:

1. The sensible bot was offering to drop a promise it had drawn that same week, which ruling 11 sees
   through (0.25); 1,108 of its 1,566 drop-promise offers were refused, at −10 each. It now offers only
   a promise a week old (`src/redlines/sim/bots.ts`). That alone took frozen to 23.8% and treaty to 46.7%.
2. The collapses are paced by the fall clock (3 / 2 / 1 weeks), so a Federation that started taking
   places in week 4 reached ALL-OUT in week 8 with the WAR count a tick short. Spread now starts at
   MASSING (3 / 5 / 8, over promises from FIGHTING), so a collapse that is a collapse ends as WORLD WAR
   inside the eight weeks. Pushes (2 or 3 a week), the fall clock at PUSHING and a hungrier second push
   were tried and either did nothing (the ladder, not the pushes, was the bottleneck) or sank the treaty
   share to 20–37%.
3. The near-misses needed a way out they could afford late: the summit, which a stopped Federation
   takes almost every time, came down from 20 to 15 (BUILD's range is 10 to 25), and the acceptance of a
   way out when they have been stopped rose (+0.5 blocked; 0.45 / 0.55 at the two low steps). Blocs
   sign at 0.45 instead of 0.5 so the treaty share stays under a half. The bar's start (55) is
   unchanged: it moves in fives, so only a change of five would matter, and 60 gave 60% treaties.

Every variant in between is in the scratch tuning harness's output; the two gates are coupled through
the bar (every lever that signs a near-miss also signs an easy game), so the pass has about two points
of margin on each side on each of the three seed sets, and `--seed S` or `--seed T` reproduce the
other two.

The dials as the sensible bot meets them now (round 14, seeds R): appetite careful 53% treaty, steady 42%, hungry
27%; jumpiness makes little difference to the sensible bot's outcome (38 / 41 / 44%) because it keeps its pieces off
their doorstep (it decides false alarms, pull-backs and a human's brigade at Vessary). Round 14's variants were run
with a scratch harness (RULES overrides as JSON over `simulate`, the gate numbers in one line a variant; not kept in
the tree): any of them can be re-run by setting the RULES value and running `tools/redlines-sim.ts`.

## What the next build has room for (not built)

The cabinet draft, the Coalition and private warnings of `SPEC.md` v5.1 would attach as: more
`PieceKind`s and acts (the cabinet), a third bloc's lean in `Federation`-like state (the Coalition),
and a `warn` act beside `promise` (a private line with a smaller test). The week's order of operations
(`resolve.ts`) has one phone a week and one way out a week by ruling, not by structure.
