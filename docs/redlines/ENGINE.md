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
import { newGame, promise, withdraw, movePiece, offerWayOut, endWeek, answerPhone, debrief, saveGame, loadGame } from '@/redlines/engine';
```

## The API (one line each)

| function | does |
| --- | --- |
| `newGame(content, seed): GameState` | Week 1: the dials, three declared lines (two real, one bluff), one or two inherited promises, the collision in one sentence, their first two headings, 30 influence. |
| `canPromise(s, region): { ok, reason? }` | Outside the Cap, calm or pressed, fewer than three promises, influence for the garrison (2). `reason` is a `strings.refusals` code. |
| `holdable(s, region): { ok, why, piece? }` | A piece within reach (there, or one move away: a land join for the brigade, a lane or the coast for the fleet) and not inside the Cap. `why` is a `strings.hold` code. Solid when ok, dashed when not. |
| `promise(s, region): Result` / `withdraw(s, region): Result` | Draw a promise (costs 2 now, 1 a week after) or take it back (belief −5, nothing else). Not the promise under test: answer the phone. |
| `movesFor(s, kind): RegionId[]` / `movePiece(s, kind, region): Result` | One move per piece per week, cost 3. The fleet on lanes and coasts; the brigade on land joins, or across a lane when the fleet is at either end. Never into the Cap. |
| `offerWayOut(s, term, detail?): Result` | Once a week: `'drop-promise'` (a promised region, 10), `'pull-back'` (`'fleet'` or `'brigade'`, 15), `'summit'` (20). The price is paid now; Wintermast answers at the resolve. |
| `endWeek(content, s): GameState` | SEND ORDERS. Resolves the week (below). Returns phase `'phone'` when a test or an event rings, else the next week (`'act'`) or the ending (`'ended'`). |
| `canAnswer(s, key): { ok, reason? }` / `answerCost(s, key)` | Whether BACK IT can be paid (`'no-influence'` otherwise) and what an answer costs. |
| `answerPhone(content, s, key): GameState` | `'back'`, `'down'` or `'wait'`. Finishes the week. WAIT carries a test to next week with the stakes up (round 2, then 3); the third WAIT is backing down. Returns the state unchanged when `canAnswer` says no. |
| `debrief(s): { week, what, thought }[]` | Every hidden line of the game under that week's orders, for the ending screen. |
| `scoreOf(ending): number` | Treaty `100 − 10w − 5f` (min 10), frozen `9 − f` (min 1), war 0. |
| `saveGame(s): string` / `loadGame(text): GameState \| null` | Versioned JSON (`brink.redlines`, version 1); `loadGame` returns null for anything it cannot trust. Store under `SAVE_KEY` = `brink.redlines.v1.save`. |
| `RULES`, `STEP_WORDS`, `fallWeeksAt(step)`, `pushesAt(step)`, `spreadAt(step)` | Every number (`rules.ts`), the five words, the per-step tables. |
| `checkContent(content): string[]` | What a pack is missing for the engine to run (empty when fine). |
| `REGION_IDS`, `REGION`, `NEAR_CAP`, `isCap`, `isSea`, `reachOf`, `fleetMoves`, `brigadeMoves`, `distance`, `regionName` | The map as the rules see it (`world.ts`, from `src/thirty/ui/map/data.ts`). |

`Result` is `{ ok: true, state }` or `{ ok: false, reason }`; the reason is a code from
`REFUSAL_CODES` (`'inside-the-cap'`, `'already-fighting'`, `'already-promised'`, `'three-promises'`,
`'no-influence'`, `'not-promised'`, `'under-test'`, `'moved-already'`, `'not-adjacent'`,
`'no-such-piece'`, `'offered-already'`, `'bad-term'`, `'not-this-phase'`, `'no-such-phone'`), and the
words for it are `content.strings.refusals[code]`.

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
}
interface WeekLog { week; visible: string[]; hidden: string[]; danger: { war; treaty; step }; acts: string[] }
```

`fed.appetite`, `fed.jumpiness`, `fed.belief`, `lines[].real` and `headings[].real` are in the state
because the save needs them; the screens never show them. The debrief does.

Determinism: there is no RNG state in the save. Every roll comes from a stream named by the seed and
the moment (`${seed}:setup`, `${seed}:w${week}:a` for the first half of a week, `:c` for the answer's
roll, `:b` for the second half), so the same seed and the same orders give the same state, and a game
saved and loaded continues exactly as the unsaved one (`run.test.ts` "determinism and the save").

## A week (what `endWeek` and `answerPhone` do, in order)

1. **The clocks.** Every pressed place that is *answered* (a piece of yours stands in it, or a solid
   promise covers it and is not the one under test) counts a quiet week; every other pressed place
   counts a week towards its fall.
2. **Their lines.** Each declared line not yet crossed is checked: `proximity` (any piece of yours in
   its regions), `sea` (the fleet), `missiles` (the brigade), `alliance` (a promise of yours). A real
   line crossed is a step up with a headline that quotes it; a bluff crossed is belief +10 and silence
   (and, later this week, the bluff-crossed call if nothing else rings). A line is crossed once.
3. **A carried test** (you waited last week): if the place's clock has run down, they take it ("You
   waited too long"); else it rings again below with the round up.
4. **Their pushes land** where the headings pointed. A real push on an unpromised place presses it
   (calm → pressed). A real push, or a feint, on a promised place is a **test**. A feint on an unpromised
   place is "a column that stopped short".
5. **The phone**: the carried test first, else the new test, else one event (bluff crossed; a place
   nobody promised about to fall that a piece could reach; a summit offer; a false alarm; the trawler).
   If something rings, `endWeek` returns with phase `'phone'` and the rest waits for `answerPhone`.
6. **The answer** (see "The phone").
7. **Places fall**: pressed, unanswered, clock run down (3 weeks at TESTING, 2 at PUSHING, 1 from
   MASSING). From MASSING the fighting spreads on its own to neighbours of a fighting place: 3 a week at
   MASSING (answered places spared), 5 at FIGHTING and 8 at ALL-OUT (only a piece standing in a place
   keeps it out).
8. **The way out** you offered is answered (below): accepted is +15, a step down, the term kept;
   refused is −10 (humiliated).
9. **The ladder**: a step up for each place taken this week; a jumpy step when a piece of yours stands
   on their doorstep (chance jumpiness × 0.45); at MASSING and above an accident, one in twenty.
10. **Recoveries**: two quiet weeks and a pressed place is calm again.
11. **The bars**: +5 if they gained nothing, −5 per place taken; in a quiet week from week 3 another
    bloc may sign (+10, at most two). WAR is the count of fighting places.
12. **The endings**: eight fighting is WORLD WAR (SPEC-SMALL v6: eight pencil boxes); the bar at 100
    with no place fallen this week is the TREATY; the end of week 8 with neither is FROZEN.
13. **Next week**: their headings are planned, influence is paid (+8 − 1 per promise), the week's
    orders are cleared.

## The other side (agent.ts)

- **Headings.** Two every week. Real pushes number `pushesByStep` (one at TESTING and PUSHING, two from
  MASSING), plus one more some weeks for a hungry Federation (chance `(appetite − 0.5) × 2`). When
  only one push is real the other arrow is a feint; when two are due, one week in three the second is
  a feint instead. Their forces reach one step (land join or lane) from a foothold: the Cap, or any
  place pressed or fighting. Each real push is a **new front** (an unguarded calm place) with chance
  = appetite; otherwise they **test a promise** (weighted by how little they believe it: dashed 1.4,
  solid but doubted 0.9, solid and believed 0.3 rising to 0.6 up the ladder) or keep the pressure on
  a place already pressed (0.6). At most one promised place is targeted a week, none while a test is
  pending, and none they turned away from in the last two weeks. The feint points at a promised place
  half the time. Highmarch itself is pushed half as readily; the Cap never.
- **Belief** (hidden, starts 50). Up: a solid promise backed (+15), a bluff crossed (+10), backing an
  ally (+8), going on alert (+5), sending force to a place nobody promised (+5). Down: backing down
  (−15), a far back that failed (−15), waiting while they take a place (−15), withdrawing (−5), each
  WAIT (−5), disowning an ally (−8). Below 40 they test even solid promises; at 60 BACK IT costs 6.
- **Ways out.** Refused before week 3 ("they saw no need to talk yet") and whenever they took two
  places this week; one place halves the chance. Drop a promise they minded (one they were heading
  for, testing, or that nothing of yours could reach; and at least a week old): 0.8, else 0.35. Pull
  back a piece from their doorstep or a crossed line: 0.35 + 0.6 × jumpiness, else 0.2. A summit:
  0.45 / 0.55 / 0.7 / 0.75 / 0.8 by step, + (will − 50) / 150, + 0.5 when they took nothing last week
  either (they have been stopped, and a stopped Federation talks), − (appetite − 0.5) × 0.4. Clamped
  to 0.05..0.95. The summit costs 15, the pull-back 15, the dropped promise 10.

## The phone (phone.ts, resolve.ts)

A test draws one template from the pool `test` + `test-inherited` + `feint`, so no template is a tell;
an inherited promise prefers `test-inherited`. BACK IT costs 12 (6 once belief ≥ 60) for a solid
promise, 24 for a dashed one which then fails one time in three; each WAIT adds 6 to the next round.
On a real push: back and held → belief up, a step down, they turn away from the place for two weeks
(not after a far back: that taught them nothing); back down → belief −15, the promise gone, the place
pressed, a step up; wait → the place pressed, round +1. On a feint: back → belief up, no step; back
down → the step up all the same (a public back-down), the place untouched; wait → it lapses.

Events ring at most four times a game, only when no test rings, and never carry a round:
`false-alarm` (MASSING and above): alert costs 6, belief +5, and a jumpy Federation may climb a step;
stand down or wait, nothing. `trawler` (from week 2): back the island (6; belief +8, bar −5), disown
it (belief −8, bar +5), lean on it (3). `bluff-crossed`: hold (nothing), pull back (belief −5, the
piece goes home or the promise is withdrawn), wait. `summit` (their own offer, from week 4, at most
twice, when the bar is at 45 or more and they have been stopped): accept (10; a step down, +15),
refuse (−5), ask for terms (lapses). `fall-unpromised`: send what you have (15; the nearest piece moves
in and the place is answered, belief +5), let it go, protest.

## Rulings (where the spec is silent)

1. **Reach.** A promise is solid when a piece stands in the place or one move away; "a sea lane open" is
   not modelled in the first build (lanes are always open).
2. **The brigade crosses water** only across a lane whose end the fleet holds (it is carried).
3. **Answered.** A pressed place is answered by a piece standing in it, or by a solid promise not under
   test; its clock pauses and two quiet weeks make it calm. The clock runs every week otherwise.
4. **Fall clock** 3 / 2 / 1 / 1 / 1 by step (BUILD's numbers).
5. **Pieces start** at Ashkettle (the fleet) and Edda Vale (the brigade); a way out that pulls a piece
   back sends it there.
6. **A step up per place taken** ("a place taken unanswered"), tried capped at one a week in rounds
   1–6 (too kind; see the log).
7. **Spread.** From MASSING the fighting spreads on its own to neighbours of a fighting place: three a
   week at MASSING (answered places spared), five at FIGHTING and eight at ALL-OUT, and from FIGHTING
   over promises (only a piece standing in a place keeps it out: the fighting rolls over a promise nobody
   is there to keep). The spec's upper ladder otherwise had no teeth, v5.1's "the WAR bar fills in
   days" is the intent, and with WORLD WAR at eight (round 12) this is what turns a collapse that ran out
   of weeks into the war it was.
8. **A step down quiets one place**: the fighting place that fell most recently becomes pressed; a way
   out that names a place quiets that one too.
9. **Humiliation** is a way out they refuse (a public offer they had to turn down): −10.
10. **Blocs sign** in quiet weeks from week 3, chance 0.45 each week (0.5 until round 12), the Scatter
    then Farsouth.
11. **The bar starts at 55** (the spec gives no start). Round 9 of the log says why.
12. **Jumpiness** acts through their doorstep (Vessary, Kelpmouth, Driftholm, the three places that
    touch the Cap): a piece there climbs the ladder with chance jumpiness × 0.45 a week, and a
    pull-back from there is taken with chance 0.35 + 0.6 × jumpiness.
13. **One phone a week**; a test takes priority over an event; a second promised target is never
    chosen while one test is pending.
14. **Backing a dashed promise that holds** earns no belief and does not turn them away (the solved
    opening, round 5).
15. **A way out before week 3** is refused: nothing has stopped them yet (round 11).
16. **The dials in words**: under 0.4 careful / not easily scared, over 0.6 hungry / easily scared,
    between steady / watchful.

## The simulator and the tuning log

`npx tsx tools/redlines-sim.ts [--games 2000] [--bots ...] [--seed R] [--pack content-redlines] [--strict] [--md] [--json out.json]`.
Four bots (`src/redlines/sim/bots.ts`): passive (never promises, backs down on every call),
promise-everything (three promises wherever, backs every test it can pay for), far-promise (the
sensible bot with one unholdable promise forced in week 1, kept and backed once), sensible (walks its
pieces towards the arrows and the three doors, promises holdable threatened places, withdraws what it
cannot reach, backs the tests it can hold, waits once on a test it cannot, offers a way out from week 3
whenever it can afford one and they took nothing last week). Gates as BUILD.md; `--strict` exits 1.

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

The numbers ended on, 2,000 games per bot, seeds R0–R1999, the real pack (`npm run sim:redlines`,
which is `tools/redlines-sim.ts --pack content-redlines --strict`):

```
BRINK · RED LINES SIMULATOR
2,000 games per bot (passive, promise-everything, far-promise, sensible), seeds R0-R1999, 11 phone templates from /home/user/brink/content-redlines · 5.2 s

GATES (BUILD.md "The simulator")
gate  what                                                      value           result
G1    Passive loses (war or frozen) in more than 70%            100.0%          PASS
G2    The far-promise opening wins no more often than sensible  11.8% vs 47.9%  PASS
G3    Sensible wins (treaty) between a third and a half         47.9%           PASS
G4    Sensible ends FROZEN in fewer than 15%                    13.5%           PASS
G5    The median sensible treaty is signed in week 5 to 7       week 5          PASS
G6    Every game's debrief has at least six hidden lines        min 12          PASS
G7    No game stalls                                            0               PASS
=> ALL GATES PASS

OUTCOMES
bot                 games  treaty  war    frozen  stalls  median score  treaty week (median)  war week (median)  war peak (median)
passive             2000   0.1%    99.2%  0.8%    0       0             6                     5                  11
promise-everything  2000   0.8%    98.9%  0.4%    0       0             6                     4                  10
far-promise         2000   11.8%   80.3%  7.8%    0       0             5                     6                  10
sensible            2000   47.9%   38.6%  13.5%   0       8             5                     7                  2

THE PHONE (means per game)
bot                 phones  tests  backed  backed down  waited  ways out offered  accepted  short of influence  hidden lines (min / median)
passive             2.3     1.1    0.0     1.1          0.0     0.0               0.0       0.0%                14 / 20
promise-everything  4.4     4.4    1.4     2.9          0.0     0.0               0.0       93.0%               14 / 22
far-promise         5.3     4.6    1.9     0.7          2.0     1.0               0.6       78.8%               13 / 29
sensible            3.9     2.8    2.5     0.1          0.2     1.4               1.4       18.9%               12 / 27

THE LADDER (games by the highest step reached)
bot                 TESTING  PUSHING  MASSING  FIGHTING  ALL-OUT
passive             0.0%     0.1%     0.0%     0.1%      99.9%
promise-everything  0.0%     0.7%     0.3%     0.1%      99.0%
far-promise         1.9%     9.1%     3.9%     0.8%      84.3%
sensible            8.8%     37.5%    10.0%    1.7%      42.1%

TREATIES BY WEEK (sensible)
week      1  2  3  4    5    6    7    8
treaties  0  0  0  140  408  283  106  21

WHAT THEY WERE LIKE (sensible)
treaty share by dial                                      low    mid    high
appetite (careful / steady / hungry)                      69.4%  49.1%  25.6%
jumpiness (not easily scared / watchful / easily scared)  49.2%  47.7%  46.8%
```

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

The dials as the sensible bot meets them now: appetite careful 69% treaty, steady 49%, hungry 26%;
jumpiness makes little difference to the sensible bot's outcome because it keeps its pieces off their
doorstep (it decides false alarms, pull-backs and a human's brigade at Vessary).

## What the next build has room for (not built)

The cabinet draft, the Coalition and private warnings of `SPEC.md` v5.1 would attach as: more
`PieceKind`s and acts (the cabinet), a third bloc's lean in `Federation`-like state (the Coalition),
and a `warn` act beside `promise` (a private line with a smaller test). The week's order of operations
(`resolve.ts`) has one phone a week and one way out a week by ruling, not by structure.
