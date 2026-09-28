# BRINK

*It's 3am, the phone is ringing, and every choice might be the one that ends the world.*

BRINK is a premium, run-based crisis-strategy game. You lead one of three great
powers through a five-week slide towards world war, one card at a time. Five
meters, four hidden values you only ever hear about, posture pieces that combine
into builds, flashpoints with visible odds, forty-plus endings, a daily seed shared
by everyone, and an instant restart.

The heart of it is brinkmanship scaling. Every choice scores **leverage** =
base × mult × the escalation curve (×1 below 30, ×2 at 50, ×5 at 80, ×12 at 95,
×20 at 99). Each week is an **ante**: hit the leverage target or the other side
calls your bluff. Political capital buys **pieces** and one-shot **orders** in the
shop between weeks. Above 50 the odds of an **accident** (false alarm, misread,
rogue commander, attribution error) are shown before every choice. 100 is nuclear
war. The best runs live at 85–97 and get out. Winners can keep going into endless
escalation for a local best score. See ENGINE.md and SYNERGIES.md.

Working title: BRINK (one constant in `src/config.ts`). © Hallam Burnapp. All rights reserved.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173 — content in /content hot-reloads mid-run
```

```bash
npm test               # engine, content pipeline, meta, share, sim unit tests (vitest)
npm run typecheck
npm run content:validate   # schema + semantic validation of /content (CI gate)
npm run sim -- --runs 20000 --policy all      # headless balance simulator → sim-output/ (BRINK_SIM_LENIENT=1 runs with content errors; --policy breaker measures the ceiling)
npx tsx tools/playtest.ts --style hawk --seat federation --seed ABC --out playtest-output   # a real run in a mobile Chromium with a transcript
npm run e2e            # Playwright, mobile viewport (Pixel 7), stubbed unlock Worker
npx tsx tools/playtest.ts --style dove --seat republic --seed ABC   # play a real run headlessly, write transcript + screenshots
```

Playwright uses its own Chromium in CI; locally, `PW_CHROMIUM_PATH=/path/to/chrome`
points it at an existing binary (a pre-installed `/opt/pw-browsers/chromium` is
detected automatically). `BRINK_CONTENT_LENIENT=1 npx vite build` builds a preview
even while content has validation errors; `npm run build` refuses.

## Build and deploy

```bash
npm run build          # validate content → daily OG image → Vite build → dist/ (PWA)
npm run size           # initial JS budget check (< 250 KB gzipped)
npm run preview

npm run build:itch     # everything-unlocked zip → dist-itch/brink-itch.zip
```

Environment variables are documented in `.env.example`; none are required for the
free offline build. CI (`.github/workflows/ci.yml`) runs typecheck, tests, the
validator, a simulator smoke run, the build with the size budget and the e2e suite;
on `main` it deploys `dist/` to Cloudflare Pages and the unlock Worker with Wrangler.
Custom domain: attach it to the Pages project and set `PUBLIC_URL`.

Secrets for deploy: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Repository
variables: `PUBLIC_URL`, `PAYWALL`, `STRIPE_PAYMENT_LINK`, `UNLOCK_WORKER_URL`,
`UNLOCK_PUBLIC_KEY`, `ANALYTICS`, `ANALYTICS_DOMAIN`, `SUPPORT_EMAIL`, `CF_PAGES_PROJECT`.

Desktop (Tauri) configuration lives in `src-tauri/` with a Steamworks stub and store
asset checklist in `tauri/`; iOS/Android groundwork in `capacitor.config.ts`.

## Layout

```
content/     YAML: cards, endings, pieces, orders, archetypes, seats, flashpoints, speakers, rules → CONTENT.md
src/engine   pure deterministic engine                                          → ENGINE.md
src/content  zod schema, compiler, semantic validator
src/sim      bot policies + simulator                                           → BALANCE.md
src/ui       Preact app, screens, components, SVG art manifest                  → THEME.md
src/meta     daily seeding, unlocks, stats, compendium, share card, unlock token, analytics
src/audio    Web Audio synthesis (no assets)
tools/       validator CLI, Vite content plugin, simulator CLI, OG image, icons, itch zip, size check
worker/      Cloudflare Worker: Stripe → signed unlock tokens (own package, tests, README)
e2e/         Playwright specs (daily run, share, unlock flow)
```

## Documents

ENGINE.md · SYNERGIES.md · CONTENT.md · THEME.md · DECISIONS.md · BALANCE.md · PLAYTEST.md ·
PRIVACY.md · CHANGELOG.md · BLOCKERS.md · STORE.md · LAUNCH.md · RISKS.md · SUMMARY.md

## Legal

No accounts, chat, comments, leaderboards with names or any user-to-user feature.
All content fictional. See PRIVACY.md and LICENSE.md.
