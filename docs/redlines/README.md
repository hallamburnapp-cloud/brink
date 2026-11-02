# BRINK: Red Lines — the first build, how to run it, what is in it

## What it is

The Federation (the Cap, in the north) is pushing. You lead the Republic. Ten weeks, one turn a week (about
twelve minutes a game): you see where their forces are heading (two pins and pencil arrows on the map; one may be a feint), you promise
to defend places by pressing and holding them (a grease-pencil ring, WE DEFEND: solid where your fleet or
brigade is within reach, dashed where it is not, and everyone can see which), you move your two counters, you
may give them a way out (drop a promise, pull a piece back, a summit), and you SEND ORDERS. The week plays back
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
| `content-redlines/` | The pack: four advisers, eight declared lines, thirteen phone templates, 47 debrief thoughts (39 kinds), 285 strings, in YAML. |
| `src/redlines/engine/` | Pure TypeScript rules, content passed in, deterministic from the seed: `newGame`, `promise`, `withdraw`, `movePiece`, `offerWayOut`, `endWeek`, `answerPhone`, `debrief`, the save. |
| `src/redlines/sim/` | The simulator: six gated bots (passive, promise-everything, far-promise opening, sensible, no-orders, seller) against ten gates, and a careful-hand bot reported beside them. |
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
npm run test:redlines                # vitest: engine, sim, content, paper map, UI logic (258 tests)
npm test                             # the whole suite, all four games
npm run content:validate:redlines    # the pack; add -- --strict to fail on warnings (the build does)
npm run sim:redlines                 # 2,000 games per bot on the real pack against the ten gates; exits 1 if one fails
npm run e2e:redlines                 # Playwright: builds with the hook, serves on port 4610, Chromium
```

`e2e/redlines.spec.ts` drives the game with real taps: the title, the three explanation lines over the live
map and the collision on its slip, week 1 (the calendar's "of 10", the note, the index card's words, SEND ORDERS,
the tape); a promise by tap-and-hold (the slip says solid and why; the ring and WE DEFEND appear), a withdraw, a
dashed promise, the refusals in the content's words, a counter tapped and moved, and a tap on the MOVE slip heard by the sheet under it; A WAY OUT's form and an
offer; SEND ORDERS and the playback (the tape feeds, the note repeats the line, the hatching scribbles in with its
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
HOW TO PLAY, QUIT TO TITLE asking once; a desktop window where the mouse plays. Every test fails on a console
error, an uncaught exception or a request that leaves the page's origin. The seeds (`E2E-WEEK-18`, `E2E-QUIET-1`,
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
and `files.json` maps every asset the page loads (14 files, 396 KB, the three fonts included) to its file on disk.
The app's scripts and styles are about 70 KB gzipped on the wire.

## Balance

`npm run sim:redlines` plays 2,000 games per bot on the real pack (seeds R) and judges the ten gates of
`ENGINE.md` (BUILD.md's seven, with SPEC-SMALL's ten-weeks ruling: sensible treaty a third to a half, FROZEN under
20%, passive loses more than 70%; plus the no-orders, seller and unfilled-slot gates); `--seed S` and `--seed T`
judge two more seed sets. Every game is also checked against the recheck's invariants (cause before effect, no place
that falls and comes back inside a week, the WAR count beside every line, the clock against the real fall); a broken
one fails `--strict`. The figures of this build (round 14 of `ENGINE.md`'s tuning log), treaty share unless said:

| | seeds R | seeds S | seeds T | gate |
| --- | --- | --- | --- | --- |
| sensible: treaty / war / frozen | 40.8 / 51.1 / 8.1 | 42.5 / 50.0 / 7.5 | 41.9 / 50.6 / 7.4 | G3 treaty 33 to 50; G4 frozen under 20 |
| sensible: median treaty week | 5 | 5 | 5 | G5 week 5 to 7 |
| far-promise opening | 16.8 | 17.4 | 17.6 | G2 at most half of sensible (20.4 / 21.3 / 21.0) |
| no orders | 10.3 | 10.3 | 9.8 | G8 at most half of sensible |
| the sold far promise (seller) | 11.2 | 12.6 | 11.0 | G9 ten points under sensible |
| passive: loses | 100 | 100 | 100 | G1 more than 70 |
| promise-everything | 2.1 | 2.2 | 2.4 | |
| fewest hidden lines in a debrief; stalls; unfilled slots; broken invariants | 9; 0; 0; 0 | 9; 0; 0; 0 | 9; 0; 0; 0 | G6 six; G7, G10 none |
| **careful hand** (reported, not gated): treaty / war / frozen | 20.8 / 65.3 / 13.9 | 21.9 / 64.5 / 13.6 | 22.3 / 64.5 / 13.3 | none |
| careful hand: a solid test unbacked for want of influence | 14.9% of games | 15.8% | 15.3% | none |

All ten gates pass on all three seed sets; the nearest margin is G2 on seeds T, 3.4 points. The careful hand (withdraw
the far inherited rings, walk a piece to the front, promise only what a piece holds, back every solid test it can pay
for, take their summit) signs about one game in five, median week 6 (SPEC-SMALL "Hand play is reported, not gated").
It is a floor for careful play rather than a measure of it: in real-tap games it never steps a piece into a pressed
place to answer it, never promises an island under a declared line even when the line is the bluff, and lets an
unpromised place go on the phone with influence in hand. Two careful games played by real taps on the built app
(seed `SWG-RRP`) both ended in WORLD WAR, in weeks 7 and 8; the recheck's six hand-played games produced no treaty
either. Whether influence is too tight is for the owner and the cold testers to judge before any retune.

## Screens (the built app, 390 x 844 at 3x; r-12 is a 1440 x 900 window)

Seed `E2E-WEEK-18` from r-02 on; the orders and the answers on screen are real taps, and the rest of the game the
sensible hand's, to the treaty of week 6.

| | |
| --- | --- |
| `r-01-title` | The name, Red Lines in the hand, "Ten weeks. …", PLAY, HOW TO PLAY on a typed card over the world. |
| `r-02-explanation` | The first of the three typed lines over the live map (hatched where they push, red where they win, ticks for the weeks left), numbered, SKIP and NEXT; WEEK 1 of 10 on the calendar. |
| `r-03-collision` | The opening's dilemma on its own slip: the promise you inherited against a line they drew. BEGIN. |
| `r-04-week-1` | WEEK 1 of 10: the calendar, the note, the inherited promise as a dashed ring with WE DEFEND, their two headings as red pushpins with pencil arrows, the fleet and brigade counters, the index card (WAR as eight boxes, TREATY, THEY ARE and the stamp, SEND ORDERS), the tape. |
| `r-05-promise-held` | Vessary promised by tap-and-hold: the solid grease-pencil ring and WE DEFEND; the note says what you did. |
| `r-06-promise-dashed` | A dashed ring round Shoal beside it: a promise nothing of yours can reach, and everyone can see it. |
| `r-07-playback` | SEND ORDERS mid-playback: ORDERS SENT, the stamp just slammed to PUSHING (the inherited promise crossed their line), the test line fed onto the tape and large on the note, Driftholm over-circled TESTED on the sheet. |
| `r-08-phone` | The call: the room dark, the handset, the clock, the caller's forty words, the three torn slips, "26 influence in hand" scribbled beside BACK IT / BACK DOWN / WAIT and their costs; Driftholm over-circled TESTED under the handset. |
| `r-09-ending` | TREATY in week 6 on its typed card over the map as it was left: the two lines and the score (52 = 100 − 8 × 6). |
| `r-10-debrief-1`, `r-11-debrief-2` | The debrief's first two pages: what you did (the WAIT printed as "You asked for a week at Driftholm"), what they were thinking (in red), the page number. |
| `r-12-desktop` | Week 2 of the same game in a desktop window, the frame on the dark desk: Driftholm hatched with its two ticks, TESTED across it, the pins on its shore. |

## Known issues and decisions

- The Scatter is crowded: six islands in a band 110 px wide. The marks keep clear of every printed name and of
  each other (`arrange.ts`, checked by `paper.test.ts` on the critics' cases and on sixty seeded sheets; a fuzz of
  300 random sheets finds a small clash in four or five), but a WE DEFEND may sit beside its ring rather than under
  it, and a promise ring round an island crosses the island's own printed name (the ring is the place's, the name
  under it still reads). A counter standing on a place that is already fighting can lose its clear spot to the
  FIGHTING stamp (a rare position). TESTED sits across its island or round its red ring; a tested island their pins
  start from keeps its middle for the word (the pins stand on its shore).
- The weeks-left ticks follow the engine's `weeksLeft`: a pressed place that a piece of yours stands in, or a solid
  promise covers, has its clock paused and draws none. The clock reads the ladder, so a step up shortens every
  running clock at once (three ticks at TESTING can become one at MASSING); the tape says the step ("· now
  PUSHING") and HOW TO PLAY says the higher they climb, the sooner a hatched place falls.
- The TREATY bar moves beside each line that moves it, so in a week a place fell a way out can take it to 100% for a
  beat before "They took one place this week" brings it back (at 100 they sign only if no place fell that week).
- More than eight places can be fighting when two falls and a spread land in the week that crosses the line; the
  eight WAR boxes are then all hatched and the game ends at WORLD WAR as it does at eight.
- The call's SEND THEM about a place nobody promised moves the nearest piece there whatever line Wintermast drew
  around it; the line is crossed when the next week opens and the tape says so ("the fleet at Shoal crosses a line").
  The form's cost line does not warn of it.
- Placement costs about 30 ms a sheet in Node; on a phone's CPU (Chromium throttled four times) a whole resolve and
  its answer ran with three long tasks, the longest 151 ms, against beats of 1.15 s.
- The intel slip of the mock ("They think you'll back down. We are fairly sure.") is not on the week screen:
  it reads the Federation's mind, which the review ruled out, and the spec's screen has no place for it.
- Not built, by the brief: sound (SOUND in the menu is a stored preference), the cabinet draft, the Coalition
  and private warnings of `SPEC.md` v5.1, "a sea lane open" (lanes are always open), a hand-routed arrow path
  for long headings (the arrow is a gently curved pencil stroke, and a hop between neighbouring islands a bowed one).
