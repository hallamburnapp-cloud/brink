# Changelog

All notable changes to BRINK. Dates are UTC.

## 0.4.0 — 2026-10-08 (The Brink Hotel)

The setting changed; the brand, the engine and the loop did not (D-089; the step back is on
record in `docs/step-back/`). BRINK is the night desk at The Brink Hotel: 3am, the phone,
eighteen cards of ten minutes, four bars, a review at 6:00, the same night for everyone.

### Engine
- Content packs: `BRINK_CONTENT_DIR` selects the pack for the dev server, the build, the validator and the simulator; the crisis game is preserved as `content-crisis/` and tag `v0.3.0-night`.
- The hotel's rules in `rules.night`: a fixed card count, minutes per card (and a per-card `minutes`), one-sided bars (a bar fails only at 0; 100 clamps and seats a comedy card), escalation off, a first-night scale, and `drift` (the night wears every bar down a little per card).
- Bookings: a night's situation (opener, three beats in slot windows, a head in the five o'clock hour) pinned into the queue at run start; `bookingForSeed` replicates the draw so Home can promise tomorrow's.
- Reviews: endings with `stars`, `byline` and `quote` choose their band with `conditions.stars`; `starsFor` bands the mean of the four bars; a bar on the floor is a one-star review with a stamp.
- The reply line: `reply` on every choice; the engine emits a `reply` event, and the outcome text of every odds roll (authored for the crisis packs and never shown) is now shown.
- Memory: `memory:*` flags persist between nights (up to eight) and are seeded into the next.
- The hotel's clock runs on the cards' minutes and reaches 6:00 exactly on the last card.

### Content (`content/`, the hotel pack)
- Twelve Bookings (The Swan, The Wedding, The Alarm, The Critic, The Power Cut, The Inspector, The Flood, The Lift, The Band, The Man Who Isn't Here, The Snow, The Dog Show), five spine cards and three tied cards each; a pool of regulars across the three hours; four comedy cards for a full bar; reviews in five bands per Booking, four falls, the fallbacks.
- A cast of 14 roles with names in the Guest Book and roles on the cards, plus the lead guests.
- The voice contract for the hotel, enforced by the validator under `voice: hotel`: cards ≤ 150 characters and two sentences, choices ≤ 34, a reply ≤ 80 on every side, moves ±8..±25, no roll carries an ending, no weekday or "tomorrow" words.

### Interface
- Home in three states: the first open (one button, CLOCK IN, a practice night on The Swan), tonight (the Booking's name and teaser, ANSWER IT or pick the phone back up at the clock it was left), today's review with SHARE and tomorrow's Booking.
- The Desk: HOME, the clock, the bell; four horizontal bars with icons, a ghost segment for the tilted choice and an arrow that stays until the next decision; the card with the Booking and the time in its footer; two choices with at-rest chips naming the bars they move; the reply line.
- The Review: stars, byline, headline, the quote, two paragraphs, the stamp on a night that ended early, the moment card, one row for the night and where the bars stood, Copy result / Share image, tomorrow's Booking, AGAIN, the plate slip after a four- or five-star night.
- The Guest Book: reviews by Booking as pages (blank until earned; the plate opens every page), the nights that ended early, the Archive of every Tonight worked (the plate works any of them again).
- The Brass Plate: one purchase; choose the night you work, the Guest Book in full, the Archive, a badge on shared reviews. No typed name (D-097).
- Home is one tap away from every screen, every screen change is a history entry, and the first entry is Home so the phone's back button never leaves the app by surprise.

### Share
- Text: `BRINK #212 · THE SWAN · ★★★★☆`, one row of nine cells coloured by the lowest bar with the fall as a single red cell, the quote and its byline, the link.
- PNG: a brass letterhead, the Booking, the clock, the review's name, the stars as the big number with a DAWN or FELL AT stamp, the quote in italic serif with the byline, the row and the four bars at the end; the plate's badge when bought.

### Balance (BALANCE.md "The hotel")
- B1–B6 in the simulator for `voice: hotel`, with stars, the bars' end mean and each Booking's dawn rate in the report; a sweep tool over drift, scale and start; a per-Booking economics report.
- Drift 1.5, costs ×1.4, start 65/60, a speaker cooldown of 0.2; star bands 41/34/27/21 and bar colours good 41 / low 21 / danger 12, read from where a careful night ends. All six targets pass at 2,000 nights a bot (BALANCE.md H-5).

### Tooling and tests
- `tools/smoke/hotel.ts` plays the first night and tonight through the real screens with screenshots; `e2e/hotel.spec.ts` covers the loop on a phone; unit tests for the strip, the share text, the stars, the falls and the Guest Book.

## 0.3.0 — 2026-09-30 (the night)

The second redesign (REDESIGN.md, since superseded by HOTEL.md): the simple ruleset for `daily` and `night` (no accidents, antes, shop, pieces, orders or leverage on screen), 3:00am to 6:00am at seven minutes a card, five dials with no numbers, the crisis only at the end with the danger dial moving its odds, dawn named by the dials, all 451 cards and 92 endings rewritten to a two-sentence voice enforced by the validator, Home one tap away from inside a night, tonight as one attempt that waits. Balance N1–N5 in BALANCE.md "The night"; the pack is kept as `content-crisis/`.

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
- Iteration 9 applied the fifteen card rewrites, five piece rewrites and a closer for the defector's doubted path (451 cards). Final simulator report under `docs/sim-report-iter8.md` (iteration 9 report in `docs/sim-report-iter9.md`); BALANCE.md logs eight iterations, the target table (4 of 5 pass) and the weakest cards and pieces with rewrites; SUMMARY.md.

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
