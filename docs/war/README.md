# WIN THE WORLD: the war-room game (v2)

A short strategy game on a world map, played from a war room. Thirty fictional regions; one is yours
(gold), three are held by war (red). Each turn a crisis flares beside your gold with a target: pin up to
five lit regions that touch, add their numbers and multiply by how many you pinned (pin the crisis itself
to double it), and staff you hire boost the score left to right. Beat the target and the crisis turns gold
for good, beat it by more and you win more regions; miss and war takes it, and every third turn war also
spreads by itself. Turn all 30 gold before war holds 10. A game lasts about 15 minutes and ends WORLD
UNITED (30 of 30), in a CEASEFIRE (the last push for war's regions missed) or in WAR.

The product name is read only from `BRAND.name` in `src/config.ts`. Everything in the game is fictional;
there are no accounts, no network calls and nothing user-to-user. Settings and the one saved game live in
`localStorage` (`brink.war.v2.prefs`, `brink.war.v2.save`).

## Where things are

| What | Where |
| --- | --- |
| The build spec (authoritative) | `v2/SPEC.md` |
| The decision record and the owner's open questions | `v2/README.md` |
| The Python reference: rules, bots, gates, worked examples, fixtures | `v2/reference/` (`python3 examples.py` prints every number the spec quotes) |
| The simulator report (TypeScript port beside the reference) | `v2/SIM-REPORT.md` |
| The look (materials, type, colour, icons) | `art/STYLE.md` |
| Release screenshots of the built app | `screens/v2-*.webp` (below) |
| Working captures from the build | `screens/work/` |
| The previous slice (superseded: its design, spec, study, reference and screenshots) | `DESIGN.md`, `PROTOTYPE-SPEC.md`, `STUDY.md`, `SIM-REPORT.md`, `reference/`, `screens/slice/` |

The code:

| Folder | What |
| --- | --- |
| `src/war/content` | The map (30 regions, joins, sea lanes, ports, capitals) and the 10 staff. |
| `src/war/engine` | The rules: deterministic, BigInt scoring with a trace, the turn loop, ownership, the shop, views for the UI, the save. Its `README.md` is the API. |
| `src/war/ui/map` | The canvas map renderer, built to the contract in `contract.ts` (ownership, previews, the crisis ring, the war tag, ink and the other effects). |
| `src/war/ui/director` | The send animation: the cascade, the outcome on the map, war spreading, the endings. |
| `src/war/ui/app` | The app shell: store, actions, the intro and the coached first game, coach lines, back button, save. |
| `src/war/ui/*` | The Big Board (goal counts and bars), staff rail, readout, controls, shop (Briefing tray), sheets, title and end cards, icons, flying numbers. |
| `src/war/sim`, `tools/war-sim.ts` | Six bots ported from the reference, the 17 gates, the fixture cross-check and the replay check. |
| `e2e/war.spec.ts`, `playwright.war.config.ts` | End-to-end tests on a 390 x 844 phone and a desktop window. |

## Run, test, build

```sh
npm run dev:war                 # the game on the Vite dev server (the window.__war hook is on)
npm run test:war                # unit tests for src/war (engine, content, UI logic, sim gates)
npm run sim:war                 # 2,000 games per bot; fails on a gate or a fixture difference (--strict)
npm run e2e:war                 # builds with the test hook and plays the game in Chromium
npm run build:war               # dist-war/: the release build, playable from any static host or sub-path
npm run build:war-page          # dist-war-page/: a review build (CROWN DEMO on the title, no service worker)
python3 tools/war-page.py dist-war-page <out dir>   # packs the review build into a page and its files list
```

`WAR_E2E_PORT` picks the e2e server's port (default 4180) and `WAR_E2E_DEV=1` runs the e2e against the
dev server. Review builds (`VITE_WAR_REVIEW=1`, and the dev server) show the CROWN DEMO on the title: the
Example 3 break at turn 14, 5,598,720 and seven regions in one send.

The e2e covers SPEC section 15: the three intro screens with SKIP and TRY IT and HOW TO PLAY replaying
them; FIRST-WORLD turn 1 coached step by step with the exact labels and GOLD 3/30 after; sea lanes
touching and a lit region dimming within a frame; the first shop's 702 / 590 / 2,343; full-table replace,
sell, reroll and drag to reorder; a miss turning the crisis red and war spreading after turn 3; all three
end cards with NEW GAME and HOME; the back button, QUIT TO TITLE, CONTINUE and a reload resuming; the
CROWN demo; reduced motion finishing a send within 1.2 s; deterministic state and trace hashes; desktop
mouse and keys. Every test fails on a console error or a request that leaves the page's origin.

The dev hook (`window.__war`, in dev builds or with `VITE_WAR_HOOK=1`): `seed(s)`, `state()`,
`pin(ids)`, `send()`, `swap()`, `buy(i, replaceSeat?)`, `sell(seat)`, `reroll()`, `next()`,
`demo('crown')`, `setOwner(map)`, plus `move`, `intro`, `speed`, `motion`, `skip`, `sheet`, `title`,
`busy`, `hash` and `view` (the map view on show).

## Release screenshots

Captured from the built app (`npm run build:war`) at 390 x 844, 3x, played with real taps from the title
or from saved positions of simulated games; the desktop shot is 1440 x 900.

| | |
| --- | --- |
| `v2-01-title` | The title: what the game is, and the three colours. |
| `v2-02-intro-1` | Intro 1: the goal, a gold wave over the world, GOLD 30/30 for a moment. |
| `v2-03-intro-2` | Intro 2: the crisis ring and its target, four pins, WINS 2 REGIONS. |
| `v2-04-intro-3` | Intro 3: a miss turns Shoal red, war spreads into Marram; TRY IT. |
| `v2-05-turn1-coach` | The coached first turn: "Tap the crisis: the white ring." |
| `v2-06-win2-preview` | Four pins: numbered gold outlines show the two regions SEND will win. |
| `v2-07-cascade` | A mid-game send: the new Sovereign's "×2 · new" from Marram. |
| `v2-08-gold-flood` | The first win: the ring has landed, gold floods Shoal. |
| `v2-09-shop` | The first shop: 390 → 702, 590, 2,343. |
| `v2-10-miss` | A miss: red ink in the crisis, WAR ticks to 7. |
| `v2-11-war-spreads` | "War spread by itself.", and the receipt says where. |
| `v2-12-crown-slam` | The CROWN demo: 5,598,720, 466x the target, WINS 7. |
| `v2-13-world-united`, `v2-14-ceasefire`, `v2-15-war` | The three end cards. |
| `v2-16-menu` | The menu: the way home, speed, sound, reduced motion. |
| `v2-17-desktop` | The same frame on a desktop. |

The PNG captures stay out of git (`.gitignore`); the WebP copies are what the repository keeps.
