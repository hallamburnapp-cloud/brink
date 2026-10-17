# BRINK: Red Lines, first build — the contract between the builders

Read `SPEC-SMALL.md` first (the game, exactly), then `looks/paper/frame.html`, `looks/paper/call.html` and
`looks/MOMENT.md` (the look, exactly), then this file (who builds what, and the seams). `SPEC.md` (v5.1) is the
full design the slice was cut from: read it only to leave room for its cabinet, Coalition and warnings, never to
build them. `REVIEW.md` and `REVIEW-2.md` are the owner's reviews of the drafts; the owner's three decisions are in
`SPEC-SMALL.md` ("The owner's decisions"). The product rules stand: fictional world; no accounts, no chat, no
user-to-user features; nothing leaves the phone; BRINK in one constant (`BRAND.name`).

The test of every screen: someone who never plays games, watching over the player's shoulder, can say what is
happening and what the player is trying to do.

## Ownership (parallel builders; nobody edits another builder's paths)

| Builder | Owns | Reuses (read, never edit) |
| --- | --- | --- |
| **engine** | `src/redlines/engine/**`, `src/redlines/sim/**`, `tools/redlines-sim.ts`, `docs/redlines/ENGINE.md` | `src/thirty/engine/rng.ts` or `src/engine/rng.ts` (seeded RNG, fork), `src/thirty/ui/map/data.ts` (regions, joins, sea lanes) |
| **content** | `src/redlines/content/**`, `content-redlines/**`, `tools/vite-plugin-redlines.ts`, `tools/redlines-validate.ts`, `docs/redlines/CONTENT.md` | `src/thirty/content/*` and `tools/vite-plugin-thirty.ts` (the pattern: zod schema, compiled JSON, virtual module with HMR, validator CLI) |
| **map** | `src/redlines/ui/paper/**` (the paper map renderer and the paper parts: calendar, index card, stamp, tape, slip, handset, typed forms), `public/redlines/**` (fonts are already there) | `tools/redlines-paper/build.py` (the art director's generator: port its drawing to TypeScript), `docs/redlines/looks/paper/*.html` |
| **screens** | `src/redlines/ui/app/**`, `src/redlines/ui/screens/**`, `src/redlines/ui/redlines.css`, `src/redlines/main.tsx`, `src/redlines/meta.ts`, `redlines.html` | `src/thirty/ui/app/*` (fit, curtain, history/back button, storage, dev hook: copy the patterns), `src/thirty/ui/screens/*` |
| **integrator** (after the four) | `src/main.tsx` (the `VITE_GAME=redlines` branch), `vite.config.ts`, `package.json` scripts, `playwright.redlines.config.ts`, `e2e/redlines.spec.ts`, `tools/redlines-page.py`, `docs/redlines/README.md`, and any seam file the builders left requests in | everything |

Shared files are read-only for builders. A builder who needs a change outside its paths writes the request in its
report (`not_done`), and the integrator makes it.

## The engine (pure TypeScript, content passed in, deterministic from the seed)

```ts
// src/redlines/engine/types.ts
export type RegionId = string;                     // the 30 ids in src/thirty/ui/map/data.ts
export type RegionState = 'calm' | 'pressed' | 'fighting';
export type Step = 1 | 2 | 3 | 4 | 5;               // TESTING PUSHING MASSING FIGHTING ALL-OUT
export const STEP_WORDS = ['', 'TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT'] as const;
export type PieceKind = 'fleet' | 'brigade';
export interface Piece { kind: PieceKind; at: RegionId }
export interface PromiseMark { region: RegionId; since: number; inherited: boolean }
export interface Line { id: string; text: string; real: boolean }          // declared before week 1; real hidden
export interface Heading { from: RegionId; to: RegionId; real: boolean }  // where their forces are heading; real hidden
export interface Federation {
  appetite: number; jumpiness: number;   // 0.2..0.8, hidden
  step: Step;                            // public (the stamped word)
  belief: number;                        // 0..100, hidden: how far they believe your promises
  will: number;                          // 0..100: the TREATY bar (public)
  lines: Line[];                         // 3: two real, one bluff
  headings: Heading[];                   // what the map shows for next week (2, one may be a feint)
}
export interface RegionRec { state: RegionState; pressedWeeks: number; fellWeek?: number; recoveredWeek?: number }
export type Phase = 'act' | 'phone' | 'ended';
export interface PhoneOption { key: 'back' | 'down' | 'wait'; label: string; cost: string }
export interface Phone { template: string; caller: { name: string; role: string; tag: string }; text: string;
  advisers: { hawk: string; dove: string; intel: string }; region: RegionId | null; round: 1 | 2 | 3; options: PhoneOption[] }
export interface WeekLog { week: number; visible: string[]; hidden: string[]; danger: { war: number; treaty: number; step: Step } }
export type EndingKind = 'treaty' | 'war' | 'frozen';
export interface Ending { kind: EndingKind; week: number; fighting: number; score: number; lines: [string, string]; because: string; dials: string }
export interface GameState {
  seed: string; week: number; phase: Phase; influence: number;
  regions: Record<RegionId, RegionRec>; promises: PromiseMark[]; pieces: Piece[];
  fed: Federation; war: number; treaty: number;          // war = regions fighting; treaty = fed.will
  phone: Phone | null; pendingTest: RegionId | null; log: WeekLog[]; ending: Ending | null;
  collision: string;                                      // the opening's dilemma in one plain sentence
  headline: string[];                                     // the tape, newest last (keep 6)
}
```

```ts
// src/redlines/engine/index.ts (the API)
newGame(content, seed): GameState
canPromise(s, region): { ok: boolean; reason?: string }          // outside the Cap, calm or pressed, < 3 promises, influence for upkeep
holdable(s, region): { ok: boolean; why: string }               // a piece within reach (same region, a neighbour, or a sea-lane neighbour for the fleet), the region not inside the Cap
promise(s, region): Result;  withdraw(s, region): Result        // withdraw: belief -5, no other cost
movePiece(s, kind, region): Result                              // one move per piece per week; the fleet moves on sea lanes and coasts, the brigade on land joins; cost 3
offerWayOut(s, term: 'drop-promise' | 'pull-back' | 'summit', detail?): Result   // once a week; price 10..25; the answer lands at resolve
endWeek(s): GameState            // resolves: their push (by appetite/jumpiness/headings), tests of promises they do not believe, falls and recoveries, the ladder, the bars; may set phase 'phone'
answerPhone(s, key): GameState   // continues the resolve; WAIT carries the test to next week with the stakes up (round+1); round 3 WAIT = back down
debrief(s): Array<{ week; what: string; thought: string }>    // the hidden thoughts per decision, for the ending screen
scoreOf(ending): number          // treaty: 100 - 10w - 5f (min 10); frozen: 9 - f (min 1); war: 0
type Result = { ok: true; state: GameState } | { ok: false; reason: string }
```

Rules the engine must implement are in `SPEC-SMALL.md` ("The other side", "The two bars", "A week", "Endings and
the score"). Where the spec is silent, choose the simplest reading, write it in `ENGINE.md` under "Rulings", and
make it a named constant in `rules.ts`. Numbers to start from: influence 30 at start, +8 a week, −1 a week per
promise; back a holdable promise 12 (6 once belief ≥ 60), back a non-holdable one 24 and it fails one time in
three; a way out 10 to 25. The Federation tests a promise it does not believe (dashed, or belief < 40); it pushes
where its headings pointed (the real one), with a feint one week in three; a pressed region falls after N weeks
unanswered (N = 3 at TESTING, 2 at PUSHING, 1 at MASSING and above); fighting drops to pressed when the ladder
steps down or a way out names it; pressed returns to calm after two quiet weeks. The ladder and the bars exactly
as the spec. The opening: the setup draws dials, three lines (two real, one bluff, from `content-redlines/lines.yaml`),
nought to two inherited promises and guarantees one collision between an inherited promise (or a claim) and a
real line, written as `collision` in plain words.

**The debrief is not optional**: every hidden decision the agent makes (a feint, a test of a dashed promise, a
bluff crossed, a step up for a crossed line, a way out refused and why) writes one `hidden` line in that week's
`WeekLog` in plain words, in the past tense, addressed to the player ("They were bluffing at Shoal. Backing it
would have cost nothing."). The ending screen replays them.

**The simulator** (`src/redlines/sim`, `tools/redlines-sim.ts`): bots passive, promise-everything, far-promise
opening (one cheap far promise, back it once), sensible (promises holdable places near their headings, backs
tests it can hold, offers a way out when the treaty stalls at MASSING or above). Gates (2,000 games per bot,
`--strict` exits 1 on failure): passive loses (war or frozen) in more than 70%; far-promise opening wins no more
often than sensible; sensible wins (treaty) between a third and a half, loses to WORLD WAR in at least a quarter, and ends FROZEN in fewer than 15% (if a collapse runs out of weeks instead of reaching WORLD WAR, lower the WORLD WAR line, now eight of thirty, rather than adding a hidden rule); the
median sensible treaty is signed in week 5 to 7; every game's debrief has at least six hidden lines.

## The content (`content-redlines/`, YAML, strict schema, validator, virtual module)

- `advisers.yaml`: hawk, dove, intel, ambassador (name, role, tag, voice note).
- `lines.yaml`: eight declared lines (id, text as Wintermast would say it, kind: proximity | sea | alliance | missiles; which regions it covers).
- `phones.yaml`: at least eight templates with slots `{region}`, `{promise}`, `{line}`: two inherited-promise tests, a feint revealed, a false alarm (coupled to the ladder: never an instant loss), the trawler incident (alliance entrapment), a bluff crossed, a summit offer, a region falling with no promise. Each: caller, text ≤ 40 words, three adviser lines in character (no conditional annotations, ever; intel reports observations only), options with cost text in plain words. The validator refuses more than 40 words and any option text containing "if they".
- `debrief.yaml`: thought templates per hidden event kind, with slots.
- `strings.yaml`: the explanation's three lines, the collision sentence template, the ending lines, the words on screen (WE DEFEND, BACK IT, BACK DOWN, WAIT, the ladder words).

Mirror `src/thirty/content/` (schema.ts, types.ts, load.ts, validate.ts, index.ts, virtual.d.ts) and
`tools/vite-plugin-thirty.ts` → `tools/vite-plugin-redlines.ts` (virtual module `virtual:redlines-content`).

## The look (the map builder and the screens builder)

The reference is `docs/redlines/looks/paper/frame.html` and `call.html`, generated by
`tools/redlines-paper/build.py`. Port the drawing to TypeScript (`src/redlines/ui/paper/`): the paper (SVG
feTurbulence grain, the lamp's pool, the vignette), coastlines in ink with water-lining and hachured hills, the
bloc washes, names set like a printed sheet, THE CAP / HIGHMARCH / THE SCATTER / THE SOUND / FARSOUTH, the two
invented flags, the compass. Then the marks, as layers over the map, driven by `GameState`: grease-pencil rings
for promises (solid when `holdable`, dashed when not) with WE DEFEND in the handwriting face; red pencil hatching
for pressed, a red wash and FIGHTING stamp for fighting; red pushpins with a pencil arrow for the headings; the
fleet and brigade as paper counters; the tested place over-circled in hard red pencil with TESTED underlined.
The desk calendar (WEEK n of 8; influence as a scribble); the index card paper-clipped to the corner (WAR as
twelve pencil boxes with the twelfth labelled WORLD WAR; TREATY as a pencil-hatched bar; THEY ARE and the red
rubber stamp; "next call" replaced by what the week needs: SEND ORDERS); the teleprinter tape (the last three
headlines); the intel slip. The call: the clock on the dark flip-tag, the bakelite handset off the hook, the
caller card, the three torn adviser slips, the three typed forms with a pencil underline. Fonts: `public/redlines/fonts/fonts.css`
(Special Elite for type, Caveat for the hand). Nothing outside this look: no dashboard chrome, no status-lamp
colours, no condensed capitals. Colour means three things only: red is the Federation and danger, graphite is
your hand, blue is the treaty and the Republic's flag.

The screens builder makes the app around it: the frame fit and curtain (copy from `src/thirty/ui/app`), the
title (BRINK, "Red Lines", PLAY / CONTINUE, HOW TO PLAY, in the look), the explanation (three typed lines over the
live map, then the collision on a slip, skippable), the week loop (SEE: the map; ACT: tap and hold a region to
PROMISE TO DEFEND or withdraw, tap a counter then a region to move it, A WAY OUT as a typed form from the index
card; SEND ORDERS ends the week), the resolve playback (pins drop, hatching scribbles in, the stamp slams when
the ladder word changes, the tape feeds a line at a time; each beat with its headline so the watcher can follow),
the phone (full screen, stops everything, up to three rounds), the endings (a typed card with the two lines and
the score) and the debrief (the eight weeks as typed notes with the hidden thoughts, one page a week, flip
through), a save after every week (`brink.redlines.v1.save`), a dev hook `window.__redlines` (seed(seed), state(), promise(region), withdraw(region), move(kind, region),
wayOut(term), endWeek(), answer(key), set(patch), busy(), centre(region) → the region's centre in frame px for
real taps, title(), explain(step)) in dev or with `VITE_REDLINES_HOOK=1`; every call drives the same functions a
tap does, and endWeek()/answer() resolve when the playback has finished. The menu: HOW TO PLAY, SOUND off by default (no
sound in this build), QUIT TO TITLE.

Layout: portrait 390 x 844 fitted and letterboxed as the war room and Thirty Days do it. On a desktop window the
frame sits centred on a dark desk.

## Acceptance

- `npx tsc --noEmit -p tsconfig.json` clean; `npx vitest run` green (engine, content, sim, ui logic); the
  validator strict-clean; `npm run sim:redlines` passes its gates; `npm run e2e:redlines` (Playwright, real taps:
  title, explanation, a promise by tap-and-hold, a piece moved, SEND ORDERS, the phone answered, an ending and
  the debrief, CONTINUE after reload, the desktop window) green with zero console errors and zero off-origin
  requests; `npm run build:redlines` and `build:redlines-page` build; release screenshots `docs/redlines/screens/r-01..r-12`
  from the built app, looked at one by one.
- Every screen passes the over-the-shoulder test; every word on screen is from `strings.yaml` or the content.
