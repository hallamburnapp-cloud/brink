# BRINK: Red Lines — the first build, how to run it, what is in it

## What it is

The Federation (the Cap, in the north) is pushing. You lead the Republic. Eight weeks, one turn a week: you
see where their forces are heading (two pins and pencil arrows on the map; one may be a feint), you promise
to defend places by pressing and holding them (a grease-pencil ring, WE DEFEND: solid where your fleet or
brigade is within reach, dashed where it is not, and everyone can see which), you move your two counters, you
may give them a way out (drop a promise, pull a piece back, a summit), and you SEND ORDERS. The week plays back
on the sheet a beat at a time with its headline on the teleprinter tape. When they test a promise the phone
rings: the room goes dark, the handset is off the hook, a caller's forty words, three advisers on torn slips
arguing in character (nobody annotates), and three typed forms: BACK IT, BACK DOWN, WAIT. WAR counts the
places fighting on eight pencil boxes (the eighth is WORLD WAR); TREATY is their willingness to sign (at 100
they sign, if no place fell that week); the red rubber stamp says how far up the ladder they are: TESTING,
PUSHING, MASSING, FIGHTING, ALL-OUT. Three endings (TREATY, WORLD WAR, FROZEN) on a typed card with the
score, then the debrief: the weeks replayed, one typed page each, with what they were thinking under what
you did, and the two hidden dials named in words.

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
| `docs/redlines/ENGINE.md` | The rules engine: API, state, a week's order of operations, the rulings, the simulator and the tuning log (round 12 is this build's). |
| `docs/redlines/CONTENT.md` | The pack format: advisers, lines, phones, debrief thoughts, strings; slots; the voice rules; the validator. |
| `docs/redlines/looks/` | The art direction: `MOMENT.md` (the moment every look draws) and `paper/` (the chosen look, `frame.html` and `call.html` from `tools/redlines-paper/build.py`). |
| `docs/redlines/screens/` | Release screenshots of the built app (below). |
| `content-redlines/` | The pack: four advisers, eight declared lines, eleven phone templates, 36 debrief thoughts, 250 strings, in YAML. |
| `src/redlines/engine/` | Pure TypeScript rules, content passed in, deterministic from the seed: `newGame`, `promise`, `withdraw`, `movePiece`, `offerWayOut`, `endWeek`, `answerPhone`, `debrief`, the save. |
| `src/redlines/sim/` | The simulator: four bots (passive, promise-everything, far-promise opening, sensible) against BUILD.md's seven gates. |
| `src/redlines/content/` | The strict schema (zod), the compiler, the validator, the Node loader; `virtual:redlines-content` in the browser. |
| `src/redlines/ui/paper/` | The paper map (one SVG, marks as keyed layers updated by diff) and the paper parts (calendar, index card, stamp, tape, handset, slips, typed forms, typed cards, debrief pages). |
| `src/redlines/ui/app/`, `src/redlines/ui/screens/` | The Preact app: the store, the actions, the playback, the gestures, the screens (title, explanation, the week, the phone, the endings and the debrief, the menu). `ui/app/engine.ts` is the one seam to the engine and the content. |
| `src/redlines/main.tsx`, `src/redlines/meta.ts`, `redlines.html` | The entry point and the page-head text. `src/main.tsx` boots it when `VITE_GAME=redlines`. |
| `tools/vite-plugin-redlines.ts` | Compiles the pack into the bundle, hot reloads it in dev, refuses a production build with content errors. |
| `tools/redlines-validate.ts`, `tools/redlines-sim.ts` | The validator and the simulator CLIs. |
| `tools/redlines-page.py` | Packs a page build into one HTML file plus a files map for an artifact page. |
| `playwright.redlines.config.ts`, `e2e/redlines.spec.ts` | End to end on a Pixel-7-like phone and a desktop window, against the production build. |

The hotel (`src/ui`, `src/engine`, `content/`), the war room (`src/war`) and THIRTY DAYS (`src/thirty`) are
untouched and dormant; Red Lines reuses the shared map's thirty regions (`src/thirty/ui/map/data.ts`) and the
seeded RNG (`src/engine/rng.ts`) by import, never by changing them. Its fonts are `public/redlines/fonts`
(Special Elite for type, Caveat for the hand).

## Run

```
npm install
npm run dev:redlines          # http://localhost:5173, hot reload for code and for content-redlines/*.yaml
```

The title shows the product name, Red Lines in the hand, PLAY (or CONTINUE and PLAY when a game is saved) and
HOW TO PLAY over the world as it stands. The game saves itself after every order and every resolve under
`brink.redlines.v1.save` in localStorage; the only other key is `brink.redlines.v1.prefs` (whether the three
explanation lines have been seen, and the SOUND setting, which is a preference only: there is no sound in this
build). No accounts, no network requests at runtime.

In dev (and in any build made with `VITE_REDLINES_HOOK=1`) `window.__redlines` is a scripting hook:
`seed(s)`, `state()`, `promise(region)`, `withdraw(region)`, `move(kind, region)`, `wayOut(term, detail?)`,
`endWeek()`, `answer(key)`, `set(patch)`, `busy()`, `centre(region)`, `frame()`, `title()`, `explain(step)`,
and a few more for screenshots (`src/redlines/ui/app/devHook.ts`). Every call drives the same functions a tap
does; `endWeek()` and `answer()` resolve when the playback has finished.

## Test

```
npm run typecheck                    # tsc for the whole project
npm run test:redlines                # vitest: engine, sim, content, paper map, UI logic (177 tests)
npm test                             # the whole suite, all four games
npm run content:validate:redlines    # the pack; add -- --strict to fail on warnings (the build does)
npm run sim:redlines                 # 2,000 games per bot on the real pack against the seven gates; exits 1 if one fails
npm run e2e:redlines                 # Playwright: builds with the hook, serves on port 4610, Chromium
```

`e2e/redlines.spec.ts` drives the game with real taps: the title, the three explanation lines over the live
map and the collision on its slip, week 1 (the calendar, the note, the index card's words, SEND ORDERS, the
tape); a promise by tap-and-hold (the slip says solid and why; the ring and WE DEFEND appear), a withdraw, a
dashed promise, the refusals in the content's words, a counter tapped and moved; A WAY OUT's form and an offer;
SEND ORDERS and the playback (the tape feeds, the note repeats the line, the hatching scribbles in, week 2's
pins); the phone (the room dark, the handset, the clock, the caller's forty words, the three advisers, the
three forms with their costs, the tested place marked) answered BACK IT; a WAIT carried into the next week
with the stakes up and BACK DOWN on the second round; the three endings reached through the hook's `set()`
with their cards and the debrief pages; CONTINUE after a reload; the menu (the tag, Esc, the back button),
HOW TO PLAY, QUIT TO TITLE asking once; a desktop window where the mouse plays. Every test fails on a console
error, an uncaught exception or a request that leaves the page's origin. `REDLINES_E2E_DEV=1` runs the tests
against the dev server; `REDLINES_E2E_PORT` moves the port.

## Build and pack

```
npm run build:redlines        # validates the pack strictly, then dist-redlines/ (relative base, PWA, service worker)
npm run build:redlines-page   # the same without the PWA registration, into dist-redlines-page/
python3 tools/redlines-page.py dist-redlines-page <out>   # <out>/red-lines.html and <out>/files.json
```

`dist-redlines/index.html` can be served from any static host or sub-path (`BRINK_BASE` sets the base; the
scripts use `./`). The page build is for an embedded artifact page: `red-lines.html` is the head and body
without the document skeleton (title `BRINK: Red Lines`), `files.json` maps every asset the page loads (12
files, 318 KB, the two fonts included) to its file on disk. The app's scripts and styles are about 60 KB
gzipped on the wire.

## Balance

`npm run sim:redlines` plays 2,000 games per bot on the real pack and judges BUILD.md's seven gates: the
passive bot loses 100%; the far-promise opening (one cheap dashed promise, backed once) wins 11.8% against the
sensible bot's 47.9%; the sensible bot signs a treaty in 47.9% of games (the gate is a third to a half), ends
FROZEN in 13.5% (under 15%) and loses to WORLD WAR in 38.6%; its median treaty is signed in week 5; every
debrief has at least twelve hidden lines; nothing stalls. The same gates pass on two other seed sets
(`--seed S`, `--seed T`). The owner's cut set the WORLD WAR line at eight of thirty; the tuning that closed the
FROZEN gate on top of that (spread from MASSING, a cheaper summit a stopped Federation takes, the sensible bot
no longer offering to drop a promise it drew the same week) is round 12 of `ENGINE.md`'s log, with what was
tried and rejected.

## Screens (the built app, 390 x 844 at 3x; r-12 is a 1440 x 900 window)

| | |
| --- | --- |
| `r-01-title` | The name, Red Lines in the hand, PLAY, HOW TO PLAY on a typed card over the world. |
| `r-02-explanation` | The first of the three typed lines over the live map, numbered, SKIP and NEXT. |
| `r-03-collision` | The opening's dilemma on its own slip: the promise you inherited against a line they drew. BEGIN. |
| `r-04-week-1` | Week 1: the calendar, the note, the inherited promise as a dashed ring with WE DEFEND, their two headings as red pushpins with pencil arrows, the fleet and brigade counters, the index card (WAR as eight boxes, TREATY, THEY ARE and the stamp, SEND ORDERS), the tape. |
| `r-05-promise-held` | Vessary promised by tap-and-hold: the solid grease-pencil ring and WE DEFEND; the note says what you did. |
| `r-06-promise-dashed` | A dashed ring round Shoal beside it: a promise nothing of yours can reach, and everyone can see it. |
| `r-07-playback` | SEND ORDERS mid-playback: ORDERS SENT, a line feeding onto the tape, the same line large on the note, the sheet changing with it. |
| `r-08-phone` | The call: the room dark, the handset, the clock, the caller's forty words, the three torn slips, BACK IT / BACK DOWN / WAIT with their costs; Driftholm over-circled TESTED. |
| `r-09-ending` | An ending's typed card over the map as it was left: the two lines and the score. |
| `r-10-debrief-1`, `r-11-debrief-2` | Two pages of the debrief: what you did, what they were thinking (in red), the page number. |
| `r-12-desktop` | The frame letterboxed on the dark desk in a desktop window. |

## Known issues and decisions

- A fall at MASSING now spreads (three neighbours a week, five at FIGHTING, eight at ALL-OUT), so backing down
  at PUSHING can cost three places and run the ladder to ALL-OUT in one week; the debrief says so in plain
  words. This is what makes a collapse end in WORLD WAR inside the eight weeks rather than FROZEN at seven
  places; the owner may prefer a gentler curve (`spreadByStep` in `src/redlines/engine/rules.ts`).
- The two gates G3 and G4 are coupled through the treaty bar, which moves in fives: the pass has about two
  points of margin on each side on each of the three seed sets.
- The intel slip of the mock ("They think you'll back down. We are fairly sure.") is not on the week screen:
  it reads the Federation's mind, which the review ruled out, and the spec's screen has no place for it.
- Not built, by the brief: sound (SOUND in the menu is a stored preference), the cabinet draft, the Coalition
  and private warnings of `SPEC.md` v5.1, "a sea lane open" (lanes are always open), a hand-routed arrow path
  for long headings (the arrow is a gently curved pencil stroke).
