# Changelog

All notable changes to BRINK. Dates are UTC.

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
