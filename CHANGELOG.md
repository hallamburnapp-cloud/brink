# Changelog

All notable changes to BRINK. Dates are UTC.

## 0.2.0 — 2026-09-28 (the brinkmanship scaling core)

### Engine
- Leverage on every choice: base × mult × escalation multiplier × retriggers, with a documented resolve order, per-step and conditional multipliers, run-grown scaling bonuses and a curve from ×1 (0–29) to ×20 (99).
- Accidents above escalation 50 (false alarm, misread, rogue commander, attribution error) shown as odds before the choice; Perfect Intel resolves them in advance; Madman Theory rolls them twice.
- Antes: per-act leverage targets, political capital rewards with a smash bonus, and "bluff called" cards when missed.
- The shop between acts and mid-act: pieces by rarity with prices, rerolls, selling, tag removal, one-shot orders (13), capped at 6 pieces and 2 orders.
- Deadman Switch, endless escalation after a win with rising targets and a climbing curve, total-leverage score with a local best.
- Engine-set outcome flags (`accident:*`, `ante:*`, `peak:*`, `deadman:fired`, `endless`) that endings and cards can condition on; a called bluff is dealt even when no flashpoint is left for the act; One More Call charges spend without the Hotline.
- Rule maps and active-flag sets are cached on the hot path (simulations ~25% faster, replay unchanged).
- Balance knobs from the first eight iterations: act cooling, act stipend and consolation capital, softened accident escalation, flashpoint numbers ±8..±16, the ante ladder 250/450/1,200/3,200/7,000 (BALANCE.md).
- Review fixes: commitment lock semantics, warning follow-ups inside flashpoints, once-semantics in queues, timeout side recording, mode checks in fallback draws, injected `always` multipliers, rule level merging.

### Content
- 64 posture pieces (19 advisors, 18 doctrines, 27 assets) with rarities and leverage lanes, including 10 legendaries; 13 orders; 15 archetypes; 6 bluff cards.
- 17 scaling-core endings: the four accident wars, the spent Deadman Switch, the endless night, called bluffs, smashed antes, minimal deterrence, from the brink, living at ninety, and two endless-only removals.

### UI
- Animated leverage tally (base counts up, mult counts up, slam scaled to the result), ante bar and capital in the HUD, accident strip with WILL FIRE/CLEAR under Perfect Intel, the shop screen, orders bar, ante banners, endless continuation and best score on the ending and home screens.
- Sound for the loop: tally ticks and mult chips, a slam that scales with the result, ante smash and miss, a held breath before accident rolls, accident and clear, capital, retrigger; a continuous pulse above escalation 80 and a global intensity that colours the drone.
- Share card carries the score (and the endless act count).

### Tooling
- Simulator rewritten for the loop: shop-aware policies that buy pieces and orders, endless continuation, archetype tracking, the T1–T5 targets, weakest cards and pieces; `BRINK_SIM_LENIENT=1` runs with content errors for early reads.
- Playwright e2e emulates reduced motion and waits for enabled choices so full runs fit the budget; all five specs green.
- Four harness playtests (dove, hawk, balanced, gambler) with transcripts and share cards under `docs/playtests/`; PLAYTEST.md.
- Final simulator report under `docs/sim-report-iter8.md`; BALANCE.md logs eight iterations, the target table (4 of 5 pass) and the weakest cards and pieces with rewrites; SUMMARY.md.

## 0.1.0 — 2026-09-28 (build night)

### Engine
- Seeded xoshiro128** RNG with serialisable state and string seeds.
- Data model for cards, choices, odds, follow-ups, conditions, warnings, pieces, modifiers, endings, seats, flashpoints, acts and difficulties.
- Modifier resolver with documented deterministic order (add → sign guard → multiply → cost scaling → round → clamp), `always` injections, odds/intel/timer/weight resolution, escalation floors and ceilings.
- Run state machine: draw with arc pacing, warning truth rolls, odds with near misses, follow-up queue, flashpoint sequences with false-alarm entries, between-act offers, drifts and named rules, ending selection and "the moment it went wrong".
- Vitest coverage for RNG, resolver order, conditions, run transitions, serialisation and replay determinism.

### Content pipeline
- Zod schema and compiler for YAML content; semantic validator (dangling references, reachability, impossible conditions, flashpoint cycles, unreachable endings, deck depth, fictional-world lint).
- Vite virtual module `virtual:brink-content` with hot reload (a run in progress keeps its state); CLI `npm run content:validate`.
- Rules (5 acts, 5 DEFCON tiers), 23 speakers, 3 seats, 36 posture pieces with 34 documented interactions (SYNERGIES.md).

### Game
- Preact UI: home, seat select (DEFCON tiers, seeds), run screen with Reigns-style drag/tilt card, meters with preview dots and hidden-cost "?", timer bar with accelerating heartbeat, odds-roll overlay with near misses and slow motion in flashpoints, between-act offers, ending screen with the moment card, five-row meter strip, share PNG and text, instant restart and seed replay; compendium, service record, settings, privacy, purchase and restore screens; first-run standing orders.
- Theme (THEME.md): navy / briefing paper / escalation-driven red, CSS-only CRT and paper textures, reduced-motion support.
- Web Audio synthesis for every sound (no assets), mute persisted.
- SVG silhouette portraits for 23 speakers and 36 piece icons behind a swappable manifest.
- Daily mode (UTC seed and seat rotation, one attempt, streak), 16 unlocks, endings compendium with completion, statistics, cookie-free analytics (off by default).

### Monetisation and builds
- Daily free / Endless one-time purchase: Stripe Payment Link → Cloudflare Worker issuing ECDSA-signed tokens, restore by email, webhook, tests and deploy notes; client verification with a public key.
- itch.io zip build (dependency-free ZIP writer), Tauri v2 desktop config with Steamworks stub and store-asset checklist, Capacitor config, daily-changing Open Graph image and PWA icons at build time, initial-JS size budget check.

### Tooling
- Headless balance simulator with random, greedy and heuristic policies and a full report (targets, distributions, pick rates, combos, per-card impact).
- Playwright e2e on a Pixel 7 viewport with a stubbed unlock Worker; Playwright playtest harness that plays real runs with named decision styles and writes transcripts and screenshots.
- GitHub Actions CI: typecheck, tests, validator, simulator smoke, build with size budget, e2e, Cloudflare Pages and Worker deploys.
