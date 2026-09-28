# SUMMARY.md — BRINK, the build night

*It's 3am, the phone is ringing, and every choice might be the one that ends the world.*

BRINK is a premium run-based crisis-strategy game: a Reigns card interface over a
Balatro-style scaling loop. This file is the one-page account of what exists, what
the numbers say, and what is left. Everything named here is in this folder.

## What was built

| Area | Delivered |
| --- | --- |
| Engine (`src/engine`) | Deterministic, serialisable run state; leverage = base × mult × escalation curve × retriggers with a documented resolve order; accidents above 50; per-act antes with bluff cards; political capital and the shop (pieces, rerolls, selling, tag removal, one-shot orders); Deadman Switch; endless escalation; cooling and recovery drifts; 92 endings with "the moment it went wrong"; 314 unit tests including replay determinism |
| Content (`content/`) | **451 cards** (10 arcs, 5 flashpoints with 68 cards, 6 bluff cards, pressure, three domestic decks, alliance, advisors), **92 endings** (26 nuclear, 34 removed, 17 stand-down, 13 survival, 2 special, 12 fallbacks), **64 pieces** (19 advisors, 18 doctrines, 27 assets; 10 legendaries), **13 orders**, **15 archetypes**, 23 speakers, 3 seats, 5 DEFCON tiers; validator clean (0 errors, 0 warnings) |
| Content pipeline | Zod schema and compiler, semantic validator (dangling references, reachability, impossible conditions, unreachable endings, deck depth, fictional-world lint, unknown template variables), Vite virtual module with hot reload that keeps a run in progress |
| Game (`src/ui`) | Preact + Tailwind v4 on a phone-first layout: drag/tilt card, five meters with preview dots, the leverage line under every choice, animated tally with slam scaled to the result, ante bar and capital in the HUD, accident strip, shop, orders bar, timers with heartbeat, odds roll overlay with near misses, banners, ending screen with score and local best, compendium, service record, settings, privacy, purchase and restore screens, first-run standing orders, reduced motion |
| Sound (`src/audio`) | Web Audio synthesis, no assets: 26 sounds including tally ticks, mult chips, slam, ante smash and miss, held breath, accident and clear, capital, retrigger; heartbeat and escalation pulse; drone; global intensity |
| Meta (`src/meta`) | Daily seed (UTC) with seat rotation, one attempt and streak; 21 unlocks; endings compendium; statistics; share card PNG and text with score; localStorage with try/catch everywhere; ECDSA-signed unlock tokens; cookie-free analytics off by default |
| Monetisation and builds | Stripe Payment Link → Cloudflare Worker issuing signed tokens (tests, deploy notes); itch.io zip; Tauri v2 config with a Steamworks stub; Capacitor config; PWA icons and a daily Open Graph image at build; initial-JS size budget |
| Simulator (`src/sim`, `tools/sim.ts`) | Random, greedy and heuristic policies that buy pieces and orders and continue into endless; 60,000-run reports with the five balance targets, archetypes, piece shares, combos, per-card impact, weakest cards and pieces |
| Playtest harness (`tools/playtest.ts`) | Plays the real game in a mobile Chromium by reading the DOM, with four decision styles; transcripts and screenshots |
| CI (`.github/workflows/ci.yml`) | Typecheck, tests, validator, simulator smoke, build with size budget, Playwright e2e, Cloudflare Pages and Worker deploys |
| Documents | README, ENGINE, SYNERGIES (34 interactions, 15 archetypes), CONTENT, THEME, DECISIONS (D-001…D-077), BALANCE, PLAYTEST, PRIVACY, CHANGELOG, BLOCKERS, STORE, LAUNCH, RISKS, LICENSE, this file |

## The scaling core, in one paragraph

Every choice prints a base and scores **leverage** = base × (1 + Σ mult adds) × Π mult
multipliers × the escalation curve (×1 below 30, ×2 at 50, ×5 at 80, ×12 at 95, ×20 at
99) × (1 + retriggers). Each week is an **ante**: bank the target or the other side
calls your bluff with a punishing card before the flashpoint. Political capital buys
pieces, orders, rerolls and tag removals in the shop. Above 50 the odds of an
**accident** are printed before every choice and rise with escalation; 100 is nuclear
war; the best runs live at 85–97 and get out. Winners can continue into endless
escalation, where the curve doubles every act, for a local best score.

## What the simulator says (BALANCE.md, iteration 9, 60,000 runs)

| Target | Result |
| --- | --- |
| T1 Heuristic wins 5–12% at DEFCON 5 | **PASS** 6.8% |
| T2 ≥ 10 archetypes reach the Endgame ≥ 10% of the time | **PASS** 10 of 15 |
| T3 No piece in > 35% of winning builds | **PASS** top 24.3% |
| T4 Median run 15–25 estimated minutes | **PASS** 17.9 min |
| T5 ≥ 3% of runs score 100× the final target | **FAIL** 0–0.03% across iterations 7–9 (five runs did in iteration 8; best 1.45 million) |

Nine iterations are logged with hypotheses and before/after numbers. The big
levers, in order of effect: flashpoint numbers (±8..±16, not ±12..±30), act cost
scaling (1.08/1.16/1.28/1.40), cooling (escalation −0.5 per ordinary card above 25),
recovery (office meters +0.15 toward 50), the economy (stipend, consolation,
prices 3/5/7/8), the ante ladder (250/450/1,200/3,200/7,000), the endless climb (×2
per act). T5 is the honest miss: the compounding exists and the game can be broken,
but the survival heuristic does not farm the top of the curve; the recommended fix is
a fourth "break it" policy (RISKS.md row 9, BLOCKERS.md B-004).

The balance report (BALANCE.md, "Final report") ranks the 15 weakest cards and 5
weakest pieces with proposed rewrites.

## What the playtests say (PLAYTEST.md)

Four full runs in the browser with four styles: the dove was consulted into a
protectorate on Day 21 after missing the Week Two ante by 21 leverage; the hawk
launched on Day 9 in the Intercept flashpoint; the balanced run was also consulted
away on Day 16; the gambler's run is described in PLAYTEST.md. The near miss on the
ante and the forced flashpoint endings are the moments that feel like the game. The
e2e suite (daily run, replay, unlock flow, tampered token, restore) is green.

## What is not done, and what to do first

1. **T5.** The aggressive `breaker` policy exists (BALANCE.md iteration 10) and shows the
   binding constraint is endless survival, not the multiplier; the next step is a gentler
   endless ramp measured against it.
2. **The next 15 weakest cards.** The first fifteen (and five pieces) were rewritten in iteration 9; the report's method finds the next set.
3. **Content polish from the review** (scratch notes in BALANCE.md and CONTENT.md
   §4.6): repeated punchlines across arcs, the `warning` domain tag, the blockade
   strand with `shots_fired`, the proxy stall after two cards.
4. **A human playtest** under RISKS.md Protocol P before the store page goes live.
5. **Repository.** BRINK is a self-contained `brink/` folder on the designated branch
   because a new repository could not be created from this session (BLOCKERS.md
   B-001 has the three-line `git subtree split` to give it its own).

## How to run it

```bash
npm install
npm run dev              # http://localhost:5173, content hot-reloads
npm test                 # 314 unit tests
npm run content:validate # 0 errors, 0 warnings
npm run sim -- --runs 20000 --policy all
npx playwright test      # Pixel 7 viewport, reduced motion, stubbed Worker
npm run build            # validate, OG image, vite build, size budget
```

Source: All rights reserved. © Hallam Burnapp. All content fictional; no accounts,
no chat, no comments, no leaderboards with names, no user-generated content.
