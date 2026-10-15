# BRINK: THIRTY DAYS — the build, how to run it, what is in it

## What it is

You lead the Republic as the world slides towards war. Thirty days; each day one message from an adviser and two
buttons (sometimes a tap on the map instead). Every button says in plain words what it will do to DANGER and to
the world. Keep DANGER under 100 for thirty days (HELD), calm the whole map before then (STAND-DOWN), or lose when
it fills (WAR). After days 5, 10, 15, 20 and 25 three people offer to join your team; each one changes what your
decisions do, and they stack. That building is the Balatro part, and it stays in the background: the only number
on screen is DANGER.

The game screen is exactly four things, top to bottom: the strip (DAY n OF 30 and the DANGER gauge), the map, the
team row (hidden until you hold someone) and the card. Nothing else is ever drawn. A day plays in two beats so the
watcher can follow cause and effect: first what the button did (the map recolours, the needle slides, a `−7` floats
that matches the hint just tapped), then, only when something happened, what the night did (war spreading, a crisis
heating a neighbour, trouble flaring) with its own `+3`. `SPEC.md` is the design source; this file is the build.

## Files

| Where | What |
| --- | --- |
| `docs/thirty-days/SPEC.md` | The spec. Short and exact; everything here answers to it. |
| `docs/thirty-days/ENGINE.md` | The rules engine: API, state, trace, rulings beyond the spec, tuning log. |
| `docs/thirty-days/CONTENT.md` | The card format, the cast, the hint convention, the validator. |
| `docs/thirty-days/screens/` | Release screenshots of the built app (below). |
| `content-thirty/` | The pack: 127 cards in YAML (ten arcs, a card for every region, domestic cards, six map days), six advisers, twelve pieces. |
| `src/thirty/content/` | The strict schema (zod), the compiler, the validator, the Node loader; `virtual:thirty-content` in the browser. |
| `src/thirty/engine/` | Pure TypeScript rules, content passed in: `newGame`, `choose`, `tapRegion`, `pick`, `preview`, the save. |
| `src/thirty/sim/` | The simulator: a random bot and a sensible bot against the spec's balance gates. |
| `src/thirty/ui/` | The Preact screens: the four things, the title, the explanation, the menu, the endings, the playback. `ui/app/engine.ts` is the one seam to the engine and the content. |
| `src/thirty/main.tsx`, `src/thirty/meta.ts` | The entry point and the page-head text. `src/main.tsx` boots it when `VITE_GAME=thirty`. |
| `tools/vite-plugin-thirty.ts` | Compiles the pack into the bundle, hot reloads it in dev, refuses a production build with content errors. |
| `tools/thirty-validate.ts`, `tools/thirty-sim.ts` | The validator and the simulator CLIs. |
| `tools/thirty-page.py` | Packs a page build into one HTML file plus a files map for an artifact page. |
| `playwright.thirty.config.ts`, `e2e/thirty.spec.ts` | End to end on a Pixel 7 viewport and a desktop window, against the production build. |

The hotel (`src/ui`, `src/engine`, `content/`) and the war room (`src/war`, `docs/war`) are untouched and dormant;
THIRTY DAYS reuses the war room's map geometry, fonts (`public/war/fonts`), seeded RNG and Web Audio recipes by
import or by copy, never by changing them.

## Run

```
npm install
npm run dev:thirty            # http://localhost:5173, hot reload for code and for content-thirty/*.yaml
```

The title shows the product name, THIRTY DAYS, PLAY (or CONTINUE and NEW GAME when a game is saved) and HOW TO
PLAY. The game saves itself after every day under `brink.thirty.v1.save` in localStorage; the only other key is
`brink.thirty.v1.prefs` (whether the explanation has been seen). No accounts, no network requests at runtime.

In dev (and in any build made with `VITE_THIRTY_HOOK=1`) `window.__thirty` is a scripting hook: `seed(s)`,
`state()`, `choose(side)`, `tap(regionId)`, `pick(i)`, `preview(option)`, `set(patch)`, `centre(regionId)`. The
tests and the screenshots use it to reach positions a hand would take minutes to reach.

## Test

```
npm run typecheck                    # tsc for the whole project
npm run test:thirty                  # vitest: content, engine, sim, UI logic
npm test                             # the whole suite, all three games
npm run content:validate:thirty      # the pack: ids, regions, tags, odds, follow-ups, day ranges, hints; add -- --strict to fail on warnings
npm run sim:thirty                   # 2,000 games per bot against the spec's gates; exits 1 if a gate fails
npm run e2e:thirty                   # Playwright: builds with the hook, serves on port 4580, Chromium
```

`e2e/thirty.spec.ts` drives the game with real taps: the title, the two explanation screens, day 1 (and that the
screen is exactly four things), a calming choice (the hint says Danger down, the region cools, the gauge falls,
the delta floats), a heating choice, a map day by tapping a glowing place on the canvas, a risky choice (the odds on
the hint line, the roll's result on it), the team offer and a pick (the chip, its rule), the save and CONTINUE, the
menu (the button, Esc, the phone's back button), QUIT TO TITLE, the three endings with PLAY AGAIN / REPLAY THIS
SEED / HOME, determinism (the same seed and choices hash the same twice in the browser and in Node), and a desktop
window. Every test fails on a console error, an uncaught exception or a request that leaves the page's origin.
`THIRTY_E2E_DEV=1` runs the tests against the dev server; `THIRTY_E2E_PORT` moves the port.

## Build and pack

```
npm run build:thirty          # validates the pack, then dist-thirty/ (relative base, PWA, service worker)
npm run build:thirty-page     # the same without the PWA, into dist-thirty-page/
python3 tools/thirty-page.py dist-thirty-page <out>   # <out>/thirty-days.html and <out>/files.json
```

`dist-thirty/index.html` can be served from any static host or sub-path (`BRINK_BASE` sets the base; the scripts
use `./`). The page build is for an embedded artifact page: `thirty-days.html` is the head and body without the
document skeleton (title `BRINK: Thirty Days`), `files.json` maps every asset the page loads to its file on disk.
The build is about 520 KB (29 precached files, fonts included); its scripts and styles are 95 KB gzipped on the wire.

## Balance

`npm run sim:thirty` plays 2,000 games per bot and prints the eight gates from SPEC "Balance gates", the outcomes,
the piece take rates and the DANGER curve. The world only slides because of rulings beyond the spec's pressure
paragraph (a card lights its region on arrival; calm regions flare at night, more as the month goes on; a tense
region can boil over on its own); every one is a number in `src/thirty/engine/rules.ts` and `ENGINE.md` keeps the
log of what was tried. See the "Known issues" below for where the gates stand on the shipped numbers.

## Screens (the built app, 390 x 844 at 3x; t-16 is a 1440 x 900 window)

| | |
| --- | --- |
| `t-01-title` | The name, the title line, PLAY, HOW TO PLAY, over the dimmed world. |
| `t-02-explain-1`, `t-03-explain-2` | The explanation over the live map: the two lines, the colour key; the team line with three empty places. |
| `t-04-day1` | Day 1: the strip, the map with today's region ringed, the card with two buttons and their hints. |
| `t-05-choice-hint` | The same day with two pieces held: the engine writes the hint (`Danger down · calms 2 regions`). |
| `t-06-after-calm` | 700 ms after a calming tap: the region blue, the needle at 4, `−7` floating, the chips glowing. |
| `t-07-after-heat` | After escorting the tankers: Lintel amber, `+2` floating (the choice's own change; the night's follows as a second beat). |
| `t-08-map-day` | A map day: three glowing places with one-line labels; the card says what to tap. |
| `t-09-team-offer` | After day 5: three people, each with its rule, and NO ONE THIS TIME. |
| `t-10-team-row` | Three chips held; the hints count the regions a choice reaches. |
| `t-11-risky` | A risky choice after its roll: `Held` on the hint line. |
| `t-12-stand-down`, `t-13-held`, `t-14-war` | The three endings: two lines of story, the final map, the three buttons. |
| `t-15-menu` | RESUME, HOW TO PLAY, SOUND, QUIT TO TITLE. |
| `t-16-desktop` | The frame letterboxed on the table in a desktop window. |

## Known issues

- The balance gates G1 (random choices hold in under 10% of games) and G2 (the sensible bot holds in 55 to 70%)
  sit on their thresholds and come out either side of them depending on the seed set; the other six pass on every
  run. `ENGINE.md` "Tuning log" has the figures and what each lever did.
- When pieces change what a button does, the engine's hint replaces the whole authored line (`Danger down · calms
  2 regions`) rather than only its DANGER clause, so the authored flavour clause is lost on those days.
- The team row drops the chips' icons when five are held, so the row fits 390 pt.
- Audio, the phone's back button and real safe-area insets are covered by logic tests and the e2e, not heard or
  felt on a device here.
