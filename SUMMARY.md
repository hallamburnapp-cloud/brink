# SUMMARY.md — BRINK, the redesign

*It's 3am. The phone is ringing. Make it to dawn.*

BRINK is a swipe-card game about surviving one night of an international crisis: five
dials, one rule, two to four minutes, the same night for everyone, a result you can paste
anywhere. The long game it grew out of (leverage, antes, the shop, endless escalation) is
whole and untouched as **Expert** mode behind the one purchase. This file is the one-page
account of what exists after the redesign (REDESIGN.md), what the numbers say, and what
is left. Everything named here is in this folder.

## What was built

| Area | Delivered |
| --- | --- |
| The night (`src/engine/run.ts`, `night.ts`) | The simple ruleset on the same deterministic engine: five acts of 5/5/5/5/1 cards named by the clock, seven minutes of the clock a card, the crisis (one flashpoint) at 5:20am, dawn at 6:00; no accidents, antes, shop, pieces, orders or endless; the danger dial moves every crisis roll by (50 − danger)/250; dawns named by the dials. Expert (`endless`, `challenge`) unchanged. 316 unit tests including replay determinism |
| Content (`content/`) | **451 cards** (10 arcs, 5 flashpoints, 6 bluff cards, pressure, three domestic decks, alliance, advisors) and **94 endings**, every one rewritten to the voice contract (two sentences and 180 characters a card, 34 a choice, two paragraphs an ending, no jargon), enforced by the validator (`BRINK_VOICE=strict`); ids, effects, tags, conditions and follow-ups unchanged; 64 pieces, 13 orders, 15 archetypes and 5 DEFCON tiers for Expert; 23 speakers shown by role; `rules.yaml` `night.acts` |
| Content pipeline | Zod schema and compiler, semantic validator (dangling references, reachability, impossible conditions, unreachable endings, deck depth, fictional-world lint, unknown template variables, the voice contract), Vite virtual module with hot reload that keeps a run in progress and keeps the last good content when a compile fails |
| Game (`src/ui`) | Phone-first Preact + Tailwind v4: Home built around tonight (You are the President · Play tonight · one attempt, two minutes; the result strip and the countdown after), the Night screen (clock, five glyph dials with preview dots, timer, card, two choices, swipe hint), the Dawn screen (DAWN / FELL AT 4:35, the ending, the strip, the moment, the share image, Copy result, tomorrow's countdown, the unlock offer once), a one-line intro, seat picker with A NIGHT / EXPERT, paywall, unlock, record, compendium, settings, privacy; the Expert screens as before; reduced motion |
| Sound (`src/audio`) | Web Audio synthesis, no assets; the night uses the tick, the phone, the roll and the drone |
| Meta (`src/meta`) | Tonight (UTC seed, seat rotation, one attempt, streak of nights played), the strip and the one-line result text, the share PNG with the dial names and the 3:00 → 6:00 axis, 94-ending compendium, nights/dawns/Expert statistics, 21 unlocks (Expert), ECDSA-signed unlock tokens, cookie-free analytics off by default, localStorage with try/catch everywhere |
| Monetisation and builds | Stripe Payment Link → Cloudflare Worker issuing signed tokens (tests, deploy notes), "Night after night" for one payment (STORE.md: $3.99 / £2.99 / €3.99); itch.io zip; Tauri v2 config with a Steamworks stub; Capacitor config; PWA; initial JS 52 KB gzipped (budget 250) |
| Simulator (`src/sim`, `tools/sim.ts`) | Random, greedy and calm (heuristic) bots; `--mode night` with the five night targets N1–N5; 15,000 nights in 19 s; `tools/probes/night-danger.ts` for the danger dial at the crisis; Expert's T1–T5 and 60,000-run reports as before |
| Playtest harness (`tools/playtest.ts`) | Plays the real game in a mobile Chromium from the DOM alone; `--game night` reads dial fills and odds words and ends on the dawn screen; `--static` against the built app; four decision styles |
| CI (`.github/workflows/ci.yml`, `pages.yml`) | Typecheck, tests, validator, simulator smoke, build with size budget, Playwright e2e; Cloudflare Pages and GitHub Pages deploys opt in by repository variable |
| Documents | REDESIGN, README, ENGINE (§12 the night), SYNERGIES, CONTENT (§5 the night's table), THEME, DECISIONS (D-001…D-088), BALANCE ("The night"), PLAYTEST, PRIVACY, CHANGELOG (0.3.0), BLOCKERS, STORE, LAUNCH, RISKS, LICENSE, this file |

## The night, in one paragraph

Every card is someone at your door with a problem and two ways to answer it. Five dials,
**People, Army, Allies, Money, Danger**: a dial that empties or fills ends your night, and
Danger full ends everyone's. Every card is seven minutes of the clock. At 5:20am the crisis
comes, a short sequence with the odds written on the choices in plain words, and a calm
night makes them kinder. Reach 6:00 and it is dawn, and the dials decide which dawn. The
same night for everyone each day, one attempt; the result is five rows of coloured squares
and 🌅 Dawn or 🌑 Fell at 4:35, which says everything to people who played and nothing to
people who have not. Nothing on screen is a number but the clock. That paragraph is longer
than the game's own explanation, which is one line.

## What the simulator says (BALANCE.md "The night", 5,000 × 3 nights)

| Target | Result |
| --- | --- |
| N1 Calm bot reaches dawn 45–65% | **PASS** 61.3% (fell: 6.5% on a dial, 32.2% nuclear) |
| N2 Random bot reaches dawn under 10% | **PASS** 7.6% (85.7% fell on a dial) |
| N3 A night is 2–4 minutes | **PASS** 3.7 min (28.9 cards including the crisis, 5.0 rolls) |
| N4 No ending in more than 35% of nights | **PASS** top ending 26.1%, 25 distinct |
| N5 The crisis ends 25–45% of the nights that reach it | **PASS** 37.7% |

Four iterations are logged. The finding that mattered: before the redesign's one engine
rule, the calm bot arrived at the crisis with the danger dial at 67 and lost 44% of the
time regardless of how the night had gone. With the danger dial moving the crisis odds
and cooling 0.3 a card, arriving at 30–49 gives 72% dawn and 85+ gives 20%; the greedy
bot, which protects the danger dial and arrives at 32, reaches the crisis less often and
comes out of it more often. That is the trade the night is about. The Expert game keeps
its own targets (4 of 5 PASS; T5 is the honest miss, BLOCKERS.md B-004).

## What the playtests say (PLAYTEST.md)

The harness plays the night the way a person sees it, dial fills and odds words only.
The runs after the balance pass are in PLAYTEST.md "The night" with their transcripts and
screenshots under `docs/playtests/night/`. The e2e suite (tonight end to end on a phone,
the dawn screen's unlock offer, the unlock flow, a tampered token, restore by email) is
green.

## What is not done, and what to do first

1. **A human playtest.** Every number above is a bot's. The bet (RISKS.md 11–12) is that a
   two-minute night with no numbers is legible on card one and that people reach dawn near
   40%; the events in LAUNCH.md §7 (dawn rate, the fell-at histogram, the paywall view rate)
   are the check, and `danger_at_crisis` on `run_end` would let the probe be run on humans.
2. **The crisis's own numbers.** 32% of careful nights end in nuclear war at the crisis; if
   humans find it cruel, the flashpoint cards' escalation values (CONTENT.md §5) are the
   next lever, not the scales.
3. **Clock times inside the cards.** The rewrite kept the fiction's own timestamps
   ("at 04:10 the rebels crossed the river", "the deadline is at midnight") from the
   five-week timeline; on a 3:00–6:00 clock a few read oddly. The endings say "the
   deadline" with no hour; a pass over the ultimatum and Midnight decks to do the same, or
   to say times as people do ("an hour ago"), is the next content job (CONTENT.md §5).
4. **Expert's T5** (BALANCE.md iteration 10): the endless ramp measured against the breaker
   policy.
5. **Store assets.** Capsule, screenshots and the 30-second trailer from the real night build
   (STORE.md §4–5); the OG image already renders tonight's seat.
6. **Pinned nights** (LAUNCH.md §6) once the first fortnight's numbers say which arcs land.

## How to run it

```bash
npm install
npm run dev                          # http://localhost:5173, content hot-reloads
npm test                             # 316 unit tests
BRINK_VOICE=strict npm run content:validate   # 0 errors
npm run sim -- --mode night --policy all --runs 5000
npx tsx tools/playtest.ts --game night --style balanced --seat republic --seed ABC
npx playwright test                  # Pixel 7 viewport, reduced motion, stubbed Worker
npm run build                        # validate, OG image, vite build, size budget
```

Source: All rights reserved. © Hallam Burnapp. All content fictional; no accounts,
no chat, no comments, no leaderboards with names, no user-generated content.
