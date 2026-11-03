# BRINK: Red Lines — the first build, how to run it, what is in it

## What it is

The Federation (the Cap, in the north) is pushing. You lead the Republic. Ten weeks, one turn a week (about
twelve minutes a game): you see where their forces are heading (two pins and pencil arrows on the map; one may be a feint), you promise
to defend places by pressing and holding them, or with a plain tap (a grease-pencil ring, WE DEFEND: solid where your fleet or
brigade is within reach, dashed where it is not, and everyone can see which), you move your two counters (tap one and the
places it can reach are pencilled round with dots), you may give them a way out from week three (drop a promise, pull a
piece back, a summit), and you SEND ORDERS. Wintermast's three declared lines stay pinned at the head of the tape in red
all game. An order that would cross one of them, leave a ring dashed, leave a hatched place to fall this week, or turn their
arrow into a call says so on its slip before it is paid for (a move like that asks MOVE HERE first; a ring on a place already
hatched says it is a provocation, backed at the full price; a ring on a place at its last tick says it will be a call, or, when
another test has the week, that it is too late to pause it). A dashed ring's PROMISE and WITHDRAW slips say how many moves the
nearest piece is from holding it and what backing it will cost; an inherited ring inside a declared line says on its WITHDRAW
slip that keeping it crosses the line; a ring drawn this week and taken back before SEND ORDERS is no order at all (its 2 come
back, no belief is lost, and its slip does not say otherwise). A way out they cannot take (before week three, the week after one
was accepted, a piece already at home, a promise they already called a small thing) is dimmed with their reason. The note says
which places fall when the week ends, which of them a piece of ours can still reach and which nothing can, and when the falls
or the fighting's own spread would be world war; the warning stays under the orders as they are given. The week plays back
on the sheet a beat at a time with its headline on the teleprinter tape, cause before effect. Where they push, the
place is hatched in red pencil and carries its weeks left as pencil ticks beside the hatching (three, two, one; the
last week's single tick ringed); where they win, it is washed red and stamped FIGHTING. When they test a promise the phone
rings: the room goes dark, the handset is off the hook, a caller's forty words, three advisers on torn slips
arguing in character (nobody annotates), and three typed forms: BACK IT, BACK DOWN, WAIT, with the influence in hand scribbled beside them (a
form you cannot afford says why in its own typed line; WAIT says what backing it will cost next week). The sheet slides under the
handset so the tested place's red ring and the whole TESTED word show between the handset and the caller card. WAR counts the places fighting on the sheet on eight
pencil boxes (the eighth is WORLD WAR); TREATY is their willingness to sign (at 100
they sign, if no place fell that week); the red rubber stamp says how far up the ladder they are: TESTING,
PUSHING, MASSING, FIGHTING, ALL-OUT (a bar at 100 that does not sign says why on the tape and names the places it would
not sign over when the line fits the teleprinter). Three endings (TREATY, WORLD WAR, FROZEN at the end of week 10) on a
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
| `content-redlines/` | The pack: four advisers, eight declared lines, thirteen phone templates (eight kinds), 61 debrief thoughts, 330 strings, in YAML. |
| `src/redlines/engine/` | Pure TypeScript rules, content passed in, deterministic from the seed: `newGame`, `promise`, `withdraw`, `movePiece`, `offerWayOut`, `endWeek`, `answerPhone`, `debrief`, the save. |
| `src/redlines/sim/` | The simulator: fourteen bots (passive, promise-everything, far-promise opening, sensible, no-orders, seller, careful; the second review's shark, summit-only and shark-still; the second recheck's shark-door, shark-noring, shark-quiet and shark-quiet-noring) against fourteen gates, the careful hand reported beside them, and the ablations that gate G13 and G14. |
| `src/redlines/content/` | The strict schema (zod), the compiler, the validator, the Node loader; `virtual:redlines-content` in the browser. |
| `src/redlines/ui/paper/` | The paper map (one SVG, marks as keyed layers updated by diff), where every mark goes (`arrange.ts`: each word, counter, pin, stamp, weeks-left tick and WORLD WAR chain number kept off the printed names, the bloc titles, the flags, the other marks and the other places' rings, against the faces' real glyph boxes in `metrics.ts`, measured by `tools/redlines-paper/metrics.mjs`; `land.ts`: which island body and which plate a spot lies on, so a WE DEFEND never reads as another island's; `geometry.ts`: what covers the sheet on the call, and the least slide that shows TESTED whole), and the paper parts (calendar, index card, stamp, tape, handset, slips, typed forms, typed cards, debrief pages). |
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
npm run sim:redlines                 # 2,000 games per bot on the real pack against the fourteen gates; exits 1 if one fails
npm run e2e:redlines                 # Playwright: builds with the hook, serves on port 4610, Chromium
```

The counts of this build: `npm run test:redlines` 24 files and 366 tests (engine, sim, content, paper map, UI logic,
the two `review2.test.ts` files holding the second review's findings and the two `recheck2.test.ts` files the second
recheck's, to the real engine and pack); `npm run e2e:redlines` 21 tests (20 on the phone, one in a desktop window).

`e2e/redlines.spec.ts` drives the game with real taps: the title, the three explanation lines over the live
map and the collision on its slip, week 1 (the calendar's "of 10", the note, the index card's words, SEND ORDERS,
the tape, Wintermast's three declared lines pinned at its head); a promise by tap-and-hold (the slip says solid and why; the ring and WE DEFEND appear), a withdraw
of a ring drawn the same week (no belief line on its slip; the 2 come back, belief unchanged), the inherited ring's WITHDRAW slip (keeping it crosses a
declared line, in the line's tape words; the nearest piece's distance and BACK IT's price), a dashed promise with its price on the slip, the refusals in the content's words, a counter tapped and moved (the places it can reach pencilled round, the MOVE
word inert, a tap on the rest of the slip heard by the sheet under it); a plain tap on a place putting its slip down; a move that
crosses a declared line and leaves a ring dashed asking MOVE HERE first in the line's tape words; a ring on a place already
hatched saying on its slip that it is a provocation (and drawn as one); said before you pay (the second recheck's rulings): a MOVE HERE slip naming the hatched
place the brigade would leave to fall this week, a ring at a last tick that is "too late to pause it" when another test has the week and a call when none does,
that call's BACK IT at the full price (12, where a believed solid ring costs 6) and its WAIT saying the next week's price, and backing it buying the pause only
("You backed Morrow Downs" alone, no step down, the place still hatched with its clock stopped, line for line the week the engine plays in Node); the note on the
eve of a fall (what a piece can still reach and what nothing can, kept under an order as it is given, "That would be world war." for a fall that fills the eighth
box, and the spread's own warning at FIGHTING); a slip put down under the finger (a hold on Hearth or
Floe End, at the foot of the sheet) taking nothing from the lift of that finger, and the next press promising; A WAY OUT's form
dimmed in week 1 with their reason, dimmed the week after a way out was accepted, then in week 3 naming only the piece away
from home, and an offer; a thumb drumming every 150 ms
through a playback never answering the call; SEND ORDERS and the playback (the tape feeds, the note repeats the line, the hatching scribbles in with its
weeks-left ticks, the WAR boxes the sheet's own count, week 2's pins); the phone (the room dark, the handset, the clock, the caller's forty words, the three advisers, the
three forms with their costs, WAIT saying "backing it next week costs 30", the tested place marked) answered BACK IT; a WAIT carried into the next week
with the stakes up, the caller and the template kept with the pack's `again` text, and BACK DOWN on the second
round; the influence in hand on the call and an unaffordable BACK IT saying why; their summit (ACCEPT moves the
bar +15 beside its line and the stamp back to TESTING; it never rings over a way out of yours); the trawler about
an island under a ring of yours, or in words that claim no promise, answered BACK THEM; cause before effect on the
sheet, read beat by beat (the tape's newest line, the WAR boxes, the places drawn fighting and their red stamps, the
stamp, the bar) against the engine's own lines for two staged weeks: BACK DOWN at a dashed ring facing a scared
Federation ("they stand down", then "Driftholm has fallen", then the place that fell a week earlier quiet) and a summit
offered by its typed form in a week a pressed place's single ringed tick runs out (the fall, then "Wintermast
accepts" with the bar, then "They ease off · now TESTING" with the stamp, then only the earlier place back); a bar at 100 that does not
sign (the tape's newest line "No treaty · Vessary and Quillon unanswered", the bar at 100%, the two places hatched on the sheet); every line the engine can
print laid into the real tape after a WEEK 10 tag in the real font, and the live tape; the three endings reached
through the hook's `set()` with their cards (a staged tally gives the closing card its lessons; the WORLD WAR sheet numbers every place
fighting in the order it fell, the first ringed, each number on no stamp and nearer its own stamp than any other; week 8 runs on,
week 10 is FROZEN) and the debrief pages; CONTINUE after a reload; the menu (the tag, Esc, the back button),
HOW TO PLAY, QUIT TO TITLE asking once, PLAY over the game in progress asking once too; a desktop window where the mouse plays. Every test fails on a console
error, an uncaught exception or a request that leaves the page's origin. The seeds (`E2E-WEEK-21`, `E2E-QUIET-15`, `FIX-25`,
`E2E-SUMMIT-1`, `E2E-TRAWLER-3`; `RULING-A0` and `RULING-B1` for the two staged weeks) were found by a seed finder that replays the engine in Node with the properties
each test needs (re-checked against round 16's engine: all still hold); the second recheck's tests stage a desk on
`E2E-WEEK-21` and ask the engine's own forecasts what the slips and the note must say; what they do is computed in Node
from the same pack, never written out. `REDLINES_E2E_DEV=1`
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
and `files.json` maps every asset the page loads (14 files, 439 KB, the three fonts included) to its file on disk.
The app's scripts and styles are about 88 KB gzipped on the wire (263 KB raw).

## Balance

`npm run sim:redlines` plays 2,000 games per bot on the real pack (seeds R) and judges the fourteen gates of
`ENGINE.md` (BUILD.md's seven, with SPEC-SMALL's ten-weeks ruling: sensible treaty a third to a half, FROZEN under
20%, passive loses more than 70%; the no-orders, seller and unfilled-slot gates; the second review's G11 and G12; and
the second recheck's: no shark, the strongest lines found from what is on screen, signs more than 55%; reading their
nerve pays, G13: the door-reader beats the shark against a scared Federation; and G14: the one rule "ring the hatched
places" is worth at most 25 points to the shark by ablation); `--seed S` and `--seed T` judge two more seed sets. Every
game is also checked against the invariants (cause before effect, no place that falls and comes back inside a week, the
WAR count beside every line, the clock against the real fall, no turn-away after a feint or a provocation); a broken one
fails `--strict`. The figures of this build (round 16 of `ENGINE.md`'s tuning log; the integration re-ran seeds R on the final tree and
got the same output, and the engine is unchanged since S and T were run), treaty share unless said:

| | seeds R | seeds S | seeds T | gate |
| --- | --- | --- | --- | --- |
| sensible: treaty / war / frozen | 40.4 / 46.0 / 13.7 | 41.7 / 45.0 / 13.4 | 40.7 / 44.4 / 14.9 | G3 treaty 33 to 50; G4 frozen under 20 |
| sensible: median treaty week | 5 | 5 | 5 | G5 week 5 to 7 |
| far-promise opening | 7.0 | 6.8 | 6.6 | G2 at most half of sensible |
| no orders; the sold far promise (seller) | 0.5; 0.4 | 0.5; 0.2 | 0.6; 0.6 | G8 at most half of sensible; G9 ten points under |
| passive: loses | 100 | 100 | 100 | G1 more than 70 |
| promise-everything | 0.1 | 0.3 | 0.2 | |
| shark; the quiet shark (the strongest) | 30.7; 41.3 | 31.6; 41.3 | 31.5; 42.4 | G11 at most 55 |
| summit-only; shark-still (never moves a piece) | 1.6; 6.7 | 1.3; 6.4 | 1.3; 7.6 | G12 at most 45 |
| door-reader against a scared Federation, against the shark | 68.9 vs 32.5 | 68.8 vs 32.7 | 70.3 vs 33.4 | G13 the reader wins |
| "ring the hatched places", worth to the shark | 17.6 points | 18.1 | 19.8 | G14 at most 25 |
| fewest hidden lines in a debrief; stalls; unfilled slots; broken invariants | 7; 0; 0; 0 | 8; 0; 0; 0 | 8; 0; 0; 0 | G6 six; G7, G10 none |
| **careful hand** (reported, not gated): treaty / war / frozen | 20.2 / 60.6 / 19.3 | 20.2 / 61.5 / 18.4 | 21.6 / 59.1 / 19.4 | none |

All fourteen gates pass on all three seed sets. Round 16's levers are in `ENGINE.md`: a provocation backed at the full
price buys the pause only (no step down, no turn-away), believed at 70; a step up takes one tick off a running clock and
never the last; a piece at a scared Federation's door holds a push back every week it stands there, and a pull-back from
there is almost always accepted. The careful hand (withdraw the far inherited rings, walk a piece to the front, promise
only what a piece holds, back every solid test it can pay for, take their summit, never offer a way out of its own) is a
floor for careful play, not a measure of it. The integration's real-tap game of this build (the built app, a fresh PLAY
that drew seed `Y5B-ZX8`; a hand that drops the far inheritance, walks the fleet up, rings what a piece holds, backs every
test it can pay for and offers a summit after a quiet week) signed in week 5 for 60, every beat's WAR count, TREATY figure
and stamp on screen the engine's own for that line. Two real-tap games of 0.8.1 by the same hand signed in week 4 for 68.

## Screens (the built app, 390 x 844 at 3x; r-12 is a 1440 x 900 window)

The built app (`vite preview` of a hook build), seed `Y5B-ZX8` from r-02 on: the seed the integration's real-tap game drew
from the title's PLAY. Every order and every answer on screen is a real tap, to the treaty of week 5. Each PNG has a WebP
beside it.

| | |
| --- | --- |
| `r-01-title` | The name, Red Lines in the hand, "Ten weeks. Promise what you can hold. Keep your word.", PLAY, HOW TO PLAY on a typed card over the world as it stands. |
| `r-02-explanation` | The first of the three typed lines over the live map of week 1, with the marks it names drawn faintly where they will come: a ghost of hatching with its ticks on their first arrow's target (Vessary), a ghost red wash stamped FIGHTING on the second (Driftholm); numbered, SKIP and NEXT; Wintermast's three declared lines pinned in red at the head of the tape. |
| `r-03-collision` | The opening's dilemma on its own slip: the promise to Iceward you inherited against a line they drew ("A Republic guarantee to any town of Farsouth is an alliance against the Federation"). BEGIN. |
| `r-04-week-1` | WEEK 1 of 10: the calendar and the influence, the note (the dilemma), the inherited promise as a dashed ring with WE DEFEND (Iceward), their two headings as red pushpins with pencil arrows (to Vessary and Driftholm), the fleet and brigade counters, the index card (WAR as eight boxes, TREATY, THEY ARE and the stamp, SEND ORDERS), A WAY OUT, and the tape with the three declared lines pinned at its head. |
| `r-05-promise-held` | Iceward's ring withdrawn, the fleet moved to Gullrest, Vessary and Driftholm promised by tap-and-hold: solid grease-pencil rings and WE DEFEND (the brigade at Edda Vale holds Vessary, the fleet at Gullrest Driftholm); the note says what you did; influence 23. |
| `r-06-promise-dashed` | A hold on Marram: before anything is paid, the slip says the ring would be dashed ("nothing of ours is within reach · a dashed ring invites a test") and, in red, that it would cross a declared line, in the line's tape words, and how far the nearest piece is and what backing it would cost ("the fleet is 2 moves away · backing it costs 24"). |
| `r-07-playback` | SEND ORDERS mid-playback: ORDERS SENT, the test line fed onto the tape and written on the note, Vessary over-circled in red and marked TESTED; the stamp still TESTING. |
| `r-08-phone` | The call: the room dark, the handset, WEEK 1 INCOMING, the Hawk's forty words about the armour on the Vessary line, the three torn slips, "23 influence in hand", BACK IT (6: the price that says they believe you), BACK DOWN, and WAIT with what backing it will cost next week (12); the sheet slid so Vessary's red ring and the whole TESTED word show under the handset. |
| `r-09-ending` | TREATY in week 5 on its typed card under the map: "They stopped because they could not take Driftholm and you gave them a way out. They keep their forces at Kelpmouth and Brackwater." Score 60 (100 − 8 × 5); the sheet shows those two places still hatched and no pins. |
| `r-10-debrief-1`, `r-11-debrief-2` | The debrief's first two pages: what you did, then what they were thinking, in red (Vessary was picked before your orders, when nobody had promised it; they meant it there and turned away when you backed it; the arrow at Driftholm was for show; in week 2 they went for Driftholm to see whether you meant it, and stepped back when you came). |
| `r-12-desktop` | Week 2 of the same game in a desktop window, the frame on the dark desk: the solid rings at Vessary and Driftholm, the fleet at Gullrest, their pins at Driftholm and Kelpmouth, week 1's last lines under the three lines pinned on the tape. |

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
  lose its clear spot to the FIGHTING stamp (a rare position). Since the second recheck a WE DEFEND is also kept off
  another island's body and another plate's land (`land.ts`; the look recheck: it read as the island it sat on). The
  integration re-ran the look critic's full fuzz on the final tree (`node fuzz.cjs 40 L2`, then `node analyze.cjs L2`
  against the hook dev server: 320 bot games, 13,121 reachable sheets, 20,851 WE DEFENDs): nearer another place's printed
  name than its own ring 14 (0.1%; 14.8% at the recheck), nearer another island's body 24 (0.1%; 14.7%), nearer another
  island or plate than its own ring and land 603 (2.9%), more than half on another place's land 1,685 (8.1%; 39%), mostly
  a land place's word running across the plate boundary inside its own ring (Vessary's into Rimeholt, Driftholm's ring
  edge over Kelpmouth's). A mark on print or on another mark on 304 sheets (2.3%): a pushpin on its own place's name 166,
  a WE DEFEND on a bloc title 93, ticks on their own place's name 38, the rest under ten each. A mark that moved more than
  3 px though its place did not: 10.0% of 12,801 consecutive sheets, 2.0% with nothing new on its old spot. The jitter case
  the look recheck named is still there in about one test in eleven: the WE DEFEND already on the sheet moves at the test's
  beat in 80 of 856 tests (77 of 771 at the recheck), and again when the test ends in 15 of 581 (36 of 543).
- The WORLD WAR chain numbers are placed by the solver like the words (beside their own stamp, in its tilt, clear of every
  other mark and printed name, never nearer another stamp than their own). On the look critic's 237 reachable WORLD WAR
  endings (2,140 numbers) none touches a stamp and none is as near another stamp as its own; 3 sheets still have a number on
  another mark or on print (one on LANTERN KEY's printed name beside Lintel's stamp: nearer Lintel's stamp, but a reader
  could take it for Lantern Key's). In the integration's re-run of the critic's fuzz (250 WORLD WAR endings, 2,272 numbers) no
  number lies on print, on a stamp or on another word; a promise ring crosses one on 4 sheets. There is no line joining 1, 2, 3 (an owner's question below).
- On the call the sheet slides by the least that shows the tested place's red ring in the band under the handset and the
  whole TESTED word clear of the handset, its cord, the clock tag and the caller card (`geometry.ts` `callShiftFor`, worked
  out after the map has drawn the sheet): TESTED fully visible on all 956 of the look critic's reachable call sheets, the
  ring never less than 65% visible.
- The bloc titles over a fighting plate take the wash's colour in their halo; FARSOUTH moved off the Marram/Saltwhite line.
  The titles are letter-spaced, so a halo had nothing to cover between the letters and HIGHMARCH's dashed boundary showed
  through them: since the integration the printed plate boundaries are masked out under each title's ink box (`sheet.ts`,
  `-knock`), as a printed map breaks a line for its label. Only the printed boundaries are masked; the hatching, the wash
  and the pencil marks are not.
- A step down the ladder adds its tick back when the week turns, not on its own beat (a step up takes its tick on its own
  line). The tape's "They ease off · now {step}" is the step's own line.
- A ring drawn this week and withdrawn before SEND ORDERS: the engine gives the 2 back and takes no belief, and the WITHDRAW
  slip says so instead of the belief line ("no order yet · the 2 influence comes back", `act.undoCost`, the 2 from
  `RULES.promiseCost`).
- A test call speaks of the place it is about: the one template whose words are about ships (`test-ships`) carries
  `place: island` and is drawn only for an island, so a land place such as Morrow Downs never hears "we see whether the
  ships stay". The pool is still one pool for a real push and a feint (the place narrows it, never the kind of push).
- A bar at 100 that does not sign names the places on the tape when the line fits ("No treaty · Vessary and Quillon
  unanswered"), else counts them ("two places"); the sheet marks them only as it marks every hatched place (no extra mark
  for "unanswered").
- The weeks-left ticks follow the engine's `weeksLeft`: a pressed place that a piece of yours stands in, or a solid
  promise covers, has its clock paused and draws none. Each place keeps its own clock, set by the step it was
  pressed at; a step up takes one tick off every running clock and never the last (round 16: "The ladder is not a
  cliff, at any rung"); the tape says the step ("· now PUSHING") and HOW TO PLAY says each step shortens the clocks by a
  tick.
- The TREATY bar moves beside each line that moves it, so in a week a place fell a way out can take it to 100% for a
  beat before "They took one place this week" brings it back; a bar at 100 that does not sign says why on the tape ("No
  treaty · they took a place this week", "No treaty · Vessary and Quillon unanswered").
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
- A far promise offered up as A WAY OUT is refused outright the first time (the tape: "'Lintel? a small thing'") and is
  not dimmed before it: whether they minded it reads a hidden fact (a real alliance line drawn round it), so the form cannot
  say so before you pay without telling you which line is real. Once refused, the same promise is dimmed with "they called it
  a small thing" while it stays out of their way.
- The call's SEND THEM about a place nobody promised moves the nearest piece there whatever line Wintermast drew
  around it; the line is crossed when the next week opens and the tape says so ("the fleet at Shoal crosses a line").
  The form's cost line does not warn of it.
- Placement costs about 15 to 35 ms a sheet in the browser on this machine (the look critic measured a median of 20.7 ms,
  p99 45 ms, at full speed, and a median of 75 ms with the CPU throttled four times), against beats of 1.15 s; a WORLD WAR
  ending adds its chain numbers as movers (eight to twelve more) on its one sheet. The map now draws
  in the same frame as the index card beside it (a layout effect), so a fall's WAR box and its red wash appear together.
- The intel slip of the mock ("They think you'll back down. We are fairly sure.") is not on the week screen:
  it reads the Federation's mind, which the review ruled out, and the spec's screen has no place for it.
- Not built, by the brief: sound (SOUND in the menu is a stored preference), the cabinet draft, the Coalition
  and private warnings of `SPEC.md` v5.1, "a sea lane open" (lanes are always open), a hand-routed arrow path
  for long headings (the arrow is a gently curved pencil stroke, and a hop between neighbouring islands a bowed one).

## Questions for the owner (open after the second recheck)

Each with the build's recommendation; none blocks a build. The balance questions of 0.8.1 (the provocation's belief and
price, the FROZEN gate, the summit at the foot of the ladder) were decided by the rulings after the second recheck and are
in `ENGINE.md`'s round 16.

1. **"Stands unanswered" is read as a place a piece could hold with one line-free move, whose clock has ticked.** Read
   literally (any hatched place), nobody signs. Recommendation: keep; the tape now names the places, and the TREATY card
   names the places they keep their forces at.
2. **A far promise offered up as A WAY OUT the first time is paid for and refused, not dimmed**: dimming it before the
   first refusal would say which alliance line is real. Once refused ("a small thing") it is dimmed with those words.
   Recommendation: keep.
3. **A line joining the WORLD WAR chain's numbers** (the look critic's suggestion: a light red line through 1, 2, 3).
   Recommendation: leave it out; the numbers sit by their own stamps, and a line across up to twelve places would cross
   most of the sheet.
4. **A short phone window (390 x 664)** scales the frame to 0.79 (counter labels 5.2 px). Recommendation: a compact desk
   below about 740 px of height (no compass, two running tape lines, the note beside the index card).
5. **Their heading arrows are graphite**, the colour of the player's hand (the reference draws them dark too).
   Recommendation: red pencil, so red always means the Federation.
6. **The call shows no pinned lines** (the forms fill the room; the lines return when it is answered). Recommendation:
   keep.
7. **Back during a playback skips it**, as a tap does. Recommendation: keep.
8. **The Hawk still says "Send the fleet tonight"** while BACK IT moves no piece and no form says it does: the Hawk is
   confident and sometimes wrong, in character. Recommendation: keep.
9. **The places a bar at 100 did not sign over are named on the tape but not marked on the sheet** beyond their hatching.
   Recommendation: keep; a second mark on a hatched place would crowd the Scatter, and the tape line names them.
10. **Which shark "about 25 points" applies to.** G14 gates the plain shark: ringing the hatched places is worth it 17.6 /
    18.1 / 19.8 points on seeds R / S / T. For the quiet shark (no way out of its own) the same rule is worth 29.8 / 29.4 /
    31.7 points; that is reported, not gated. Recommendation: accept it; without a way out, ringing the hatched places is
    how that player answers them. If it must be 25, the levers left are a cheaper summit, or letting a provocation draw a
    feint in some weeks.
11. **The tape after a ring that came too late.** A ring drawn on a place at its last tick while another test has the week
    says "too late to pause it" on its slip before you pay, and the debrief says "Your ring at X came too late"; the tape
    still says "X taken unanswered · now STEP" of a place promised that week (17 of 1,200 bot games on seeds T).
    Recommendation: leave it; the ring did not answer the place and the step is real. If it should change, a headline such
    as "X taken · your ring came too late · now {step}" fits the 46 characters.
12. **A way out taken in a week they took one place.** The rule refuses outright only at two places gained that week (one
    halves the chance, `RULES.wayOut.gainedRefuse` 2, `gainedScale` 0.5); in such a week the debrief's reason is "they
    wanted to stop while they were ahead", which is true of the place just taken (the niche recheck's scan flagged 118 of
    3,000 games because it counted only earlier weeks; 172 of 733 such reasons on seeds T follow a fall the same week and
    none follows nothing taken at all). Recommendation: keep; SPEC-SMALL says "accepted less while" they are winning, not
    never.
