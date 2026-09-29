# BRINK

*It's 3am. The phone is ringing. Make it to dawn.*

BRINK is a swipe-card game about surviving one night of an international crisis. You
lead a country; every card is someone at your door with a problem and two ways to answer
it. Swipe left or right, keep five dials (**People, Army, Allies, Money, Danger**) off the
edges, and reach 6:00am. Every card is seven minutes of the clock. The last stretch is
**the crisis**, a short sequence with visible odds, and a calm night makes it kinder.

Everyone in the world gets the same night each day (**Tonight**): one attempt, two to
four minutes, and a result you can paste anywhere without giving the night away: a strip
of coloured squares, one row per dial, ending in 🌅 Dawn or 🌑 Fell at 4:35. Streaks count
nights played. One purchase, **Night after night**, opens any night on any seat, seeds to
share, and **Expert** mode, the long game with the numbers on (leverage, antes, the shop,
endless escalation; ENGINE.md §2–7).

Nothing on the run screen is a number except the clock. The whole rulebook is one line
and it is the only thing the game explains. See REDESIGN.md for the design, BALANCE.md
"The night" for the numbers, and CHANGELOG.md for what changed.

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
npm run sim -- --mode night --policy all --runs 5000   # the night's balance (N1–N5) → sim-output/; omit --mode for Expert (T1–T5)
npx tsx tools/playtest.ts --game night --style balanced --seat republic --seed ABC   # a real night in a mobile Chromium, transcript + screenshots
npx tsx tools/playtest.ts --style hawk --seat federation --seed ABC              # the same for Expert
npm run e2e            # Playwright, mobile viewport (Pixel 7), stubbed unlock Worker
BRINK_VOICE=strict npm run content:validate   # the voice contract (two-sentence cards, no jargon) as errors
```

Playwright uses its own Chromium in CI; locally, `PW_CHROMIUM_PATH=/path/to/chrome`
points it at an existing binary (a pre-installed `/opt/pw-browsers/chromium` is
detected automatically). `BRINK_CONTENT_LENIENT=1 npx vite build` builds a preview
even while content has validation errors; `npm run build` refuses.

## Play it

Three ways to see BRINK running as a game, from fastest to most permanent:

1. **On your machine.** `npm install && npm run dev`, then open the printed URL on a phone
   or in a narrow browser window. Tonight is free; set `VITE_PAYWALL=false` in `.env` to
   open Night after night (and Expert) without the Stripe flow.
2. **On itch.io in two minutes.** `npm run build:itch` writes `dist-itch/brink-itch.zip`.
   On itch.io: Create new project → Kind of project "HTML" → upload the zip → tick "This
   file will be played in the browser" → viewport 430 × 860, portrait → save as Draft.
   The itch flavour ships with everything unlocked and no paywall.
3. **A live URL.** `.github/workflows/pages.yml` deploys to GitHub Pages at
   `https://<owner>.github.io/<repo>/` on every push to `main` (enable once: Settings →
   Pages → Source: GitHub Actions; free for public repositories). `.github/workflows/ci.yml`
   deploys to Cloudflare Pages instead, which is free for private repositories: add the
   secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to the repository. Both
   workflows only run when `brink/` is the root of its own repository.

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
e2e/         Playwright specs (tonight, the dawn screen and the unlock offer, the unlock flow)
```

## Documents

REDESIGN.md · ENGINE.md · SYNERGIES.md · CONTENT.md · THEME.md · DECISIONS.md · BALANCE.md ·
PLAYTEST.md · PRIVACY.md · CHANGELOG.md · BLOCKERS.md · STORE.md · LAUNCH.md · RISKS.md · SUMMARY.md

## Legal

No accounts, chat, comments, leaderboards with names or any user-to-user feature.
All content fictional. See PRIVACY.md and LICENSE.md.
