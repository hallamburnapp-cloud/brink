# BRINK: Red Lines — the first build, how to run it, what is in it

## What it is

The Federation (the Cap, in the north) is pushing. You lead the Republic. Ten weeks, one turn a week (about
twelve minutes a game): you see where their forces are heading (two pins and pencil arrows on the map; one may be a feint), you promise
to defend places by pressing and holding them, or with a plain tap (a grease-pencil ring, WE DEFEND: solid where your fleet or
brigade is within reach, dashed where it is not, and everyone can see which), you move your two counters (tap one and the
places it can reach are pencilled round with dots), you may give them a way out from week three (drop a promise, pull a
piece back, a summit), and you SEND ORDERS. Wintermast's three declared lines stay pinned at the head of the tape in red
all game. An order that would cross one of them, leave a ring dashed, or turn their arrow into a call says so on its slip
before it is paid for (a move like that asks MOVE HERE first, and a ring on a place already hatched says it is a provocation); a
way out they cannot take (before week three, the week after one was accepted, a piece already at home) is dimmed with their reason;
and the note says which places fall when the week ends, and when that would be world war. The week plays back
on the sheet a beat at a time with its headline on the teleprinter tape, cause before effect. Where they push, the
place is hatched in red pencil and carries its weeks left as pencil ticks beside the hatching (three, two, one; the
last week's single tick ringed); where they win, it is washed red and stamped FIGHTING. When they test a promise the phone
rings: the room goes dark, the handset is off the hook, a caller's forty words, three advisers on torn slips
arguing in character (nobody annotates), and three typed forms: BACK IT, BACK DOWN, WAIT, with the influence in hand scribbled beside them (a
form you cannot afford says why in its own typed line). WAR counts the places fighting on the sheet on eight
pencil boxes (the eighth is WORLD WAR); TREATY is their willingness to sign (at 100
they sign, if no place fell that week); the red rubber stamp says how far up the ladder they are: TESTING,
PUSHING, MASSING, FIGHTING, ALL-OUT. Three endings (TREATY, WORLD WAR, FROZEN at the end of week 10) on a
typed card with the score, then the debrief: the weeks replayed, one typed page each, with what they were
thinking under what you did (your answers printed as the acts they were), and a closing card with two or three
lessons drawn from the game's own events and the two hidden dials named in words.

The look is the paper situation room throughout (`docs/redlines/looks/paper/`): a printed map under a lamp,
the desk calendar, the index card paper-clipped to the corner, the tape, the handset. No dashboard chrome;
colour means three things (red the Federation and danger, graphite your hand, blue the treaty). Every word on
screen comes from `content-redlines/` or the compiled content; the product name is one constant
(`BRAND.name`). `SPEC-SMALL.md` is the game; `BUILD.md` the contract between the builders; this file is the
build.

## Files

| Where | What |
| --- | --- |
| `docs/redlines/SPEC-SMALL.md` | The game, exactly (v6, the owner's cut), and the owner's three decisions. |
| `docs/redlines/BUILD.md` | Who built what, the engine API, the content files, the look, the acceptance tests. |
| `docs/redlines/ENGINE.md` | The rules engine: API, state, a week's order of operations, the rulings, the simulator and the tuning log (the latest round is this build's). |
| `docs/redlines/CONTENT.md` | The pack format: advisers, lines, phones, debrief thoughts, strings; slots; the voice rules; the validator. |
| `docs/redlines/looks/` | The art direction: `MOMENT.md` (the moment every look draws) and `paper/` (the chosen look, `frame.html` and `call.html` from `tools/redlines-paper/build.py`). |
| `docs/redlines/screens/` | Release screenshots of the built app (below). |
| `content-redlines/` | The pack: four advisers, eight declared lines, thirteen phone templates, 53 debrief thoughts (45 kinds), 311 strings, in YAML. |
| `src/redlines/engine/` | Pure TypeScript rules, content passed in, deterministic from the seed: `newGame`, `promise`, `withdraw`, `movePiece`, `offerWayOut`, `endWeek`, `answerPhone`, `debrief`, the save. |
| `src/redlines/sim/` | The simulator: nine gated bots (passive, promise-everything, far-promise opening, sensible, no-orders, seller, and the second review's shark, summit-only and shark-still) against twelve gates, and a careful-hand bot reported beside them. |
| `src/redlines/content/` | The strict schema (zod), the compiler, the validator, the Node loader; `virtual:redlines-content` in the browser. |
| `src/redlines/ui/paper/` | The paper map (one SVG, marks as keyed layers updated by diff), where every mark goes (`arrange.ts`: each word, counter, pin, stamp and weeks-left tick kept off the printed names, the bloc titles, the flags, the other marks and the other places' rings, against the faces' real glyph boxes in `metrics.ts`, measured by `tools/redlines-paper/metrics.mjs`), and the paper parts (calendar, index card, stamp, tape, handset, slips, typed forms, typed cards, debrief pages). |
| `src/redlines/ui/app/`, `src/redlines/ui/screens/` | The Preact app: the store, the actions, the playback (`beats.ts`: one beat per tape line, its kind, place, stamp and bar the engine's own facts for that line, `WeekLog.beats`, and the WAR boxes counted from the sheet each beat draws; a save from before the facts is read back by the headline kinds and RULES' numbers), the gestures, the screens (title, explanation, the week, the phone, the endings and the debrief, the menu). `ui/app/engine.ts` is the one seam to the engine and the content (the engine's own `netActs`, `actLine` and `weeksLeft` come through it). |
| `src/redlines/main.tsx`, `src/redlines/meta.ts`, `redlines.html` | The entry point and the page-head text. `src/main.tsx` boots it when `VITE_GAME=redlines`. |
| `tools/vite-plugin-redlines.ts` | Compiles the pack into the bundle, hot reloads it in dev, refuses a production build with content errors. |
| `tools/redlines-validate.ts`, `tools/redlines-sim.ts` | The validator and the simulator CLIs. |
| `tools/redlines-page.py` | Packs a page build into one HTML file plus a files map for an artifact page. |
| `tools/redlines-paper/` | The art director's generator (`build.py`) and the font measurer (`metrics.mjs`). |
| `playwright.redlines.config.ts`, `e2e/redlines.spec.ts` | End to end on a Pixel-7-like phone and a desktop window, against the production build. |

The hotel (`src/ui`, `src/engine`, `content/`), the war room (`src/war`) and THIRTY DAYS (`src/thirty`) are
untouched and dormant; Red Lines reuses the shared map's thirty regions (`src/thirty/ui/map/data.ts`) and the
seeded RNG (`src/engine/rng.ts`) by import, never by changing them. Its three self-hosted fonts are
`public/redlines/fonts` (Special Elite for type, Caveat for the hand, Gelasio for the printed sheet's names), all
under the Open Font License.

## Run

```
npm install
npm run dev:redlines          # http://localhost:5173, hot reload for code and for content-redlines/*.yaml
```

The title shows the product name, Red Lines in the hand, PLAY (or CONTINUE and PLAY when a game is saved) and
HOW TO PLAY over the world as it stands. The game saves itself after every order and every resolve under
`brink.redlines.v1.save` in localStorage; the only other key is `brink.redlines.v1.prefs` (whether the three
explanation lines have been seen, the SOUND setting, which is a preference only: there is no sound in this
build, and the debrief page being read, so a reload comes back to it). No accounts, no network requests at runtime.

In dev (and in any build made with `VITE_REDLINES_HOOK=1`) `window.__redlines` is a scripting hook:
`seed(s)`, `state()`, `promise(region)`, `withdraw(region)`, `move(kind, region)`, `wayOut(term, detail?)`,
`endWeek()`, `answer(key)`, `set(patch)`, `busy()`, `centre(region)`, `frame()`, `title()`, `explain(step)`,
and a few more for screenshots (`src/redlines/ui/app/devHook.ts`). Every call drives the same functions a tap
does; `endWeek()` and `answer()` resolve when the playback has finished.

## Test

```
npm run typecheck                    # tsc for the whole project
npm run test:redlines                # vitest: engine, sim, content, paper map, UI logic
npm test                             # the whole suite, all four games
npm run content:validate:redlines    # the pack; add -- --strict to fail on warnings (the build does)
npm run sim:redlines                 # 2,000 games per bot on the real pack against the twelve gates; exits 1 if one fails
npm run e2e:redlines                 # Playwright: builds with the hook, serves on port 4610, Chromium
```

The counts of this build: `npm run test:redlines` 22 files and 324 tests (engine, sim, content, paper map, UI logic,
the two `review2.test.ts` files holding the second review's findings to the real engine and pack); `npm test` 87 files
and 1,298 tests for all four games; `npm run e2e:redlines` 18 tests (17 on the phone, one in a desktop window).

`e2e/redlines.spec.ts` drives the game with real taps: the title, the three explanation lines over the live
map and the collision on its slip, week 1 (the calendar's "of 10", the note, the index card's words, SEND ORDERS,
the tape, Wintermast's three declared lines pinned at its head); a promise by tap-and-hold (the slip says solid and why; the ring and WE DEFEND appear), a withdraw, a
dashed promise, the refusals in the content's words, a counter tapped and moved (the places it can reach pencilled round, the MOVE
word inert, a tap on the rest of the slip heard by the sheet under it); a plain tap on a place putting its slip down; a move that
crosses a declared line and leaves a ring dashed asking MOVE HERE first in the line's tape words; a ring on a place already
hatched saying on its slip that it is a provocation (and drawn as one); a slip put down under the finger (a hold on Hearth or
Floe End, at the foot of the sheet) taking nothing from the lift of that finger, and the next press promising; A WAY OUT's form
dimmed in week 1 with their reason, dimmed the week after a way out was accepted, then in week 3 naming only the piece away
from home, and an offer; a thumb drumming every 150 ms
through a playback never answering the call; SEND ORDERS and the playback (the tape feeds, the note repeats the line, the hatching scribbles in with its
weeks-left ticks, the WAR boxes the sheet's own count, week 2's pins); the phone (the room dark, the handset, the clock, the caller's forty words, the three advisers, the
three forms with their costs, the tested place marked) answered BACK IT; a WAIT carried into the next week
with the stakes up, the caller and the template kept with the pack's `again` text, and BACK DOWN on the second
round; the influence in hand on the call and an unaffordable BACK IT saying why; their summit (ACCEPT moves the
bar +15 beside its line and the stamp back to TESTING; it never rings over a way out of yours); the trawler about
an island under a ring of yours, or in words that claim no promise, answered BACK THEM; cause before effect on the
sheet, read beat by beat (the tape's newest line, the WAR boxes, the places drawn fighting and their red stamps, the
stamp, the bar) against the engine's own lines for two staged weeks: BACK DOWN at a dashed ring facing a scared
Federation ("they stand down", then "Driftholm has fallen", then the place that fell a week earlier quiet) and a summit
offered by its typed form in a week a pressed place's single ringed tick runs out (the fall, then "Wintermast
accepts", then only the earlier place back); every line the engine can
print laid into the real tape after a WEEK 10 tag in the real font, and the live tape; the three endings reached
through the hook's `set()` with their cards (a staged tally gives the closing card its lessons; week 8 runs on,
week 10 is FROZEN) and the debrief pages; CONTINUE after a reload; the menu (the tag, Esc, the back button),
HOW TO PLAY, QUIT TO TITLE asking once, PLAY over the game in progress asking once too; a desktop window where the mouse plays. Every test fails on a console
error, an uncaught exception or a request that leaves the page's origin. The seeds (`E2E-WEEK-21`, `E2E-QUIET-15`, `FIX-25`,
`E2E-SUMMIT-1`, `E2E-TRAWLER-3`; `RULING-A0` and `RULING-B1` for the two staged weeks) were found by a seed finder that replays the engine in Node with the properties
each test needs; what they do is computed in Node from the same pack, never written out. `REDLINES_E2E_DEV=1`
runs the tests against the dev server; `REDLINES_E2E_PORT` moves the port.

## Build and pack

```
npm run build:redlines        # validates the pack strictly, then dist-redlines/ (relative base, PWA, service worker)
npm run build:redlines-page   # the same with VITE_PWA=off (no service worker, no workbox, no manifest), into dist-redlines-page/
python3 tools/redlines-page.py dist-redlines-page <out>   # <out>/red-lines.html and <out>/files.json
```

`dist-redlines/index.html` can be served from any static host or sub-path (`BRINK_BASE` sets the base; the
scripts use `./`). The page build is for an embedded artifact page: `red-lines.html` is the head and body
without the document skeleton (1,716 bytes; title `BRINK: Red Lines`, the page's title BRAND.name from the build),
and `files.json` maps every asset the page loads (14 files, 422 KB, the three fonts included) to its file on disk.
The app's scripts and styles are about 80 KB gzipped on the wire (245 KB raw).

## Balance

`npm run sim:redlines` plays 2,000 games per bot on the real pack (seeds R) and judges the twelve gates of
`ENGINE.md` (BUILD.md's seven, with SPEC-SMALL's ten-weeks ruling: sensible treaty a third to a half, FROZEN under
20%, passive loses more than 70%; the no-orders, seller and unfilled-slot gates; and the second review's: the shark,
the strongest line found from what is on screen, signs at most 60%, and no one-rule bot more than 45%); `--seed S` and
`--seed T` judge two more seed sets. Every game is also checked against the recheck's invariants (cause before effect,
no place that falls and comes back inside a week, the WAR count beside every line, the clock against the real fall); a
broken one fails `--strict`. The figures of this build (round 15 of `ENGINE.md`'s tuning log, integrated), treaty share
unless said:

| | seeds R | seeds S | seeds T | gate |
| --- | --- | --- | --- | --- |
| sensible: treaty / war / frozen | 43.6 / 41.3 / 15.0 | 44.6 / 39.9 / 15.6 | 43.2 / 39.4 / 17.4 | G3 treaty 33 to 50; G4 frozen under 20 |
| sensible: median treaty week | 5 | 5 | 5 | G5 week 5 to 7 |
| far-promise opening | 9.7 | 9.5 | 8.8 | G2 at most half of sensible (21.8 / 22.3 / 21.6) |
| no orders | 0.5 | 0.5 | 0.6 | G8 at most half of sensible |
| the sold far promise (seller) | 0.2 | 0.1 | 0.1 | G9 ten points under sensible |
| passive: loses | 100 | 100 | 100 | G1 more than 70 |
| promise-everything | 0.2 | 0.3 | 0.3 | |
| **shark** (rings on hatched places, never on an arrow's target, a summit after every quiet week) | 55.9 | 57.3 | 56.8 | G11 at most 60 |
| summit-only; shark-still (never moves a piece) | 1.6; 13.3 | 1.3; 14.1 | 1.3; 13.8 | G12 at most 45 |
| fewest hidden lines in a debrief; stalls; unfilled slots; broken invariants | 8; 0; 0; 0 | 8; 0; 0; 0 | 7; 0; 0; 0 | G6 six; G7, G10 none |
| **careful hand** (reported, not gated): treaty / war / frozen | 21.0 / 58.3 / 20.8 | 21.1 / 59.4 / 19.6 | 22.4 / 56.8 / 20.8 | none |
| careful hand: median treaty week; a solid test unbacked for want of influence | 5; 0.0% of games | 5; 0.0% | 5; 0.1% | none |

All twelve gates pass on all three seed sets; the nearest margins are G4 on seeds T (2.6 points) and G11 on seeds S
(2.7). The integration made one refusal that was fixed in advance a dimmed form (a way out the week after one was
accepted, `'too-soon'`); a shark that no longer pays 15 for it signed 60.1% on S, so a summit offered at the foot of the
ladder is taken a little less (0.35 at TESTING, 0.45 before): `ENGINE.md` has every variant tried. The careful hand
(withdraw the far inherited rings, walk a piece to the front, promise only what a piece holds, back every solid test it
can pay for, take their summit, never offer a way out of its own) signs about one game in five, and with BACK IT at 6
from belief 40 it never lacks the price. It is a floor for careful play, not a measure of it: two real-tap games on
the built app by a hand that also offers a summit after a quiet week (seeds `4F7-3Q3` and `X4E-QY7`, both drawn by
PLAY) signed in week 4 for 68, the practical ceiling (100 − 8 × 4), each with the Sound still hatched and named on the
TREATY card; a third by the same hand (seed `KBJ-UCC`) lost its summits to a gaining Federation and ended FROZEN with
seven places fighting, five of them in a Sound nothing of ours could reach. Whether that spread is the game the owner
wants is the owner's and the cold testers' call.

## Screens (the built app, 390 x 844 at 3x; r-12 is a 1440 x 900 window)

The built app (`vite preview` of a hook build), seed `X4E-QY7` from r-02 on: the seed the integration's real-tap game drew
from the title's PLAY. Every order and every answer on screen is a real tap, to the treaty of week 4.

| | |
| --- | --- |
| `r-01-title` | The name, Red Lines in the hand, "Ten weeks. …", PLAY, HOW TO PLAY on a typed card over the world as it stands. |
| `r-02-explanation` | The first of the three typed lines over the live map of week 1, with the marks it names drawn faintly where they will come: a ghost of hatching with its three ticks on their first arrow's target (Driftholm), a ghost red wash stamped FIGHTING on the second (Vessary); numbered, SKIP and NEXT. |
| `r-03-collision` | The opening's dilemma on its own slip: the promise to Driftholm you inherited against a line they drew ("Lantern Key and its islands choose their own friends"). BEGIN. |
| `r-04-week-1` | WEEK 1 of 10: the calendar and the influence, the note (the dilemma), the two inherited promises as dashed rings with WE DEFEND (Driftholm, Tallowmere), their two headings as red pushpins with pencil arrows, the fleet and brigade counters, the index card (WAR as eight boxes, TREATY, THEY ARE and the stamp, SEND ORDERS), A WAY OUT, and the tape with Wintermast's three declared lines pinned in red at its head. |
| `r-05-promise-held` | Tallowmere's ring withdrawn, the fleet moved to Gullrest (Driftholm's ring is solid now), Vessary promised by tap-and-hold: solid grease-pencil rings and WE DEFEND; the note says what you did. |
| `r-06-promise-dashed` | A hold on Shoal: before anything is paid, the slip says the ring would be dashed ("nothing of ours is within reach · a dashed ring invites a test") and, in red, that it would cross a declared line, in the line's tape words. |
| `r-07-playback` | SEND ORDERS mid-playback: ORDERS SENT, the stamp slammed to PUSHING (the promise at Driftholm crossed their line), the test line fed onto the tape and written on the note, Driftholm over-circled TESTED. |
| `r-08-phone` | The call: the room dark, the handset, WEEK 1 INCOMING, the Ambassador's forty words about the promise he made, the three torn slips, "25 influence in hand", BACK IT (6: the price that says they believe you), BACK DOWN and WAIT with their costs. |
| `r-09-ending` | TREATY in week 4 on its typed card under the map: "They stopped because they could not take Driftholm and you gave them a way out. They keep their forces at Kelpmouth, Brackwater, Tallowmere, Dunmarrow and Orrinth." Score 68 (100 − 8 × 4); the sheet shows the Sound still hatched and no pins. |
| `r-10-debrief-1`, `r-11-debrief-2` | The debrief's first two pages: what you did, then what they were thinking, in red (the line at Driftholm was real; the column at Vessary was a feint; "They were not coming to Vessary. You paid 6 influence to meet a column that was never going to move."). |
| `r-12-desktop` | Week 2 of the same game in a desktop window, the frame on the dark desk: the solid rings at Vessary and Driftholm, the fleet at Gullrest, their pins at Vessary and Kelpmouth, the three lines pinned on the tape. |

## Known issues and decisions

- The Scatter is crowded: six islands in a band 110 px wide. The marks keep clear of every printed name and of
  each other (`arrange.ts`, checked by `paper.test.ts` on the critics' cases and on sixty seeded sheets). A WE DEFEND is
  never set as another place's caption (stacked over its name, or on its line within a word-space) and never nearer
  another place's name than its own ring; it touches its ring, or, where the Scatter leaves no room against the ring, it
  is tied to it by a short pencil leader. The printed names (and the bloc titles) are set a second time over the rings
  and arrows with a paper halo, so a pencil line breaks under a name as on a printed map. Placement remembers the sheet
  before it: a word, a counter, a pin, a stamp or ticks stay where they are while their spot is clear (a pencil mark does
  not walk). Measured with the look critic's own in-page measure on its 8,972 reachable sheets (280 games): a word,
  counter, pin, stamp or ticks over print or another mark on 207 sheets (791 before; a mark on LANTERN KEY on 4, 642
  before; a pin on a bloc title on none, 153 before), WE DEFEND or TESTED nearer another place's name than its own ring
  in 131 of 16,633 placements (2,289 before), a mark that moved though its place did not on 10.5% of consecutive beats
  (32% before). What is left is mostly a pushpin on its own place's name. A ring still crosses the space of its own
  island's name (the name is drawn over it). A counter standing on a place that is already fighting can
  lose its clear spot to the FIGHTING stamp (a rare position).
- The weeks-left ticks follow the engine's `weeksLeft`: a pressed place that a piece of yours stands in, or a solid
  promise covers, has its clock paused and draws none. The clock reads the ladder, so a step up shortens every
  running clock at once (three ticks at TESTING can become one at MASSING); the tape says the step ("· now
  PUSHING") and HOW TO PLAY says the higher they climb, the sooner a hatched place falls.
- The TREATY bar moves beside each line that moves it, so in a week a place fell a way out can take it to 100% for a
  beat before "They took one place this week" brings it back; a bar at 100 that does not sign says why on the tape ("No
  treaty · they took a place this week", "No treaty · two still unanswered").
- More than eight places are often fighting when WORLD WAR comes (the robustness critic saw 9 to 11 in 21 of 25 WORLD WAR
  endings): two falls and a spread can land in the week that crosses the line. The eight WAR boxes are then all hatched,
  the tape says how many ("{n} places are fighting · WORLD WAR"), and the ending's sheet numbers the falls in red pencil in
  the order they fell, the first ringed (SPEC-SMALL "The map draws the chain"); its card lies on the desk under the map.
- On a short phone window (390 x 664, a browser with its bars) the 390 x 844 frame is scaled to 0.79: everything
  still fits and plays, but the type is small (the counters' labels are now 6.6 px, 5.2 px at that scale). A compact
  desk for short windows (the compass, the gap under the note and the tape's spare line given up) is a layout decision
  left open.
- The call shows the last two lines of the tape, without the three declared lines (the call covers the room; the
  lines are back at the tape's head when it is answered).
- A thumb drumming on the glass to skip a playback does not answer the call: the forms arm only once the finger has
  been still for 450 ms, and a tap counts only when its press began after that (the e2e and `review2.test.ts` drum it).
  A tap anywhere skips a playback from its first moment.
- A slip on the sheet (PROMISE TO DEFEND or WITHDRAW, the lifted counter's, MOVE HERE) takes only a press that began after
  it was put down (`armed.ts` `slipTakes`). A place at the foot of the sheet (Farsouth) has its slip laid over it, under the
  finger that held it; until the integration the lift of that finger pressed what lay there: a hold on Hearth promised it,
  a hold on Floe End cancelled its own slip (found by the integration's real-tap game; the e2e holds both).
- A far promise offered up as A WAY OUT is refused outright (the tape: "'Lintel? a small thing'") but is not dimmed on the
  form: whether they minded it reads a hidden fact (a real alliance line drawn round it), so the form cannot say so
  before you pay without telling you which line is real. An owner's question.
- The call's SEND THEM about a place nobody promised moves the nearest piece there whatever line Wintermast drew
  around it; the line is crossed when the next week opens and the tape says so ("the fleet at Shoal crosses a line").
  The form's cost line does not warn of it.
- Placement costs about 15 to 35 ms a sheet in the browser on this machine (the look critic measured a median of 75 ms
  with the CPU throttled four times, and most beats as long tasks over 50 ms), against beats of 1.15 s. The map now draws
  in the same frame as the index card beside it (a layout effect), so a fall's WAR box and its red wash appear together.
- The intel slip of the mock ("They think you'll back down. We are fairly sure.") is not on the week screen:
  it reads the Federation's mind, which the review ruled out, and the spec's screen has no place for it.
- Not built, by the brief: sound (SOUND in the menu is a stored preference), the cabinet draft, the Coalition
  and private warnings of `SPEC.md` v5.1, "a sea lane open" (lanes are always open), a hand-routed arrow path
  for long headings (the arrow is a gently curved pencil stroke, and a hop between neighbouring islands a bowed one).

## Questions for the owner (open after the second review)

Each with the build's recommendation; none blocks a build.

1. **A provocation is believed at 60, BACK IT's price steps at 40.** One threshold would be simpler; at 40 the shark signs
   61.8% and G11 fails without another lever. Recommendation: keep 60.
2. **"Stands unanswered" is read as a place a piece could hold with one line-free move, whose clock has ticked.** Read
   literally (any hatched place), nobody signs (sensible 0.1 to 0.8%). Recommendation: keep; the TREATY card names the
   places they keep their forces at.
3. **FROZEN is the tight gate** (17.4% on seeds T, 2.6 under the line): a Sound the declared lines fence off falls with
   no step. Recommendation: accept, or let a place nothing can reach fall faster (a change to the sheet's clock).
4. **The summit at the foot of the ladder** (the integration's lever, 0.35 at TESTING, so that a refusal fixed in
   advance is never paid for and the shark stays under 60%). Recommendation: keep; the visible price is unchanged.
5. **A far promise offered up is paid for and refused, not dimmed**: dimming it would say which alliance line is real.
   Recommendation: keep the price; the tape says why.
6. **Hand play spreads wide**: two real-tap games by a hand that offers a summit after a quiet week signed in week 4 for
   68 with the Sound still hatched, a third ended FROZEN with seven places fighting. Recommendation: let the cold
   testers play before any retune.
7. **A short phone window (390 x 664)** scales the frame to 0.79. Recommendation: a compact desk below about 740 px of
   height (no compass, two running tape lines, the note beside the index card).
8. **Their heading arrows are graphite**, the colour of the player's hand (the reference draws them dark too).
   Recommendation: red pencil, so red always means the Federation.
9. **The call shows no pinned lines** (the forms fill the room; the lines return when it is answered). Recommendation:
   keep.
10. **Back during a playback skips it**, as a tap does. Recommendation: keep.
11. **The Hawk still says "Send the fleet tonight"** while BACK IT moves no piece and no form says it does: the Hawk is
    confident and sometimes wrong, in character. Recommendation: keep.
