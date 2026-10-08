# BRINK

*It's 3am at The Brink. The phone is ringing.*

BRINK is a swipe-card game about one night on the desk of a hotel that is not quite
coping. You are the Night Manager; every card is someone at the desk with a problem and
two ways to answer it. Swipe left or right, keep four bars (**Guests, Staff, Money, the
Building**) off the floor until 6:00, and a guest writes your review. Every card is ten
minutes of the clock; eighteen cards is a night; the night wears the bars down by itself,
and what you choose decides where they end.

Every night has a Booking: the swan in the bath of Room 412, the wedding with sixty for
breakfast and no eggs, the critic who is not called that, the lift with a Labrador in it.
Everyone in the world gets the same night each day (**Tonight**): one attempt, about two
minutes, and a result you can paste anywhere without giving the night away:
`BRINK #212 · THE SWAN · ★★★★☆`, one row of coloured squares, the line a guest wrote.
One purchase, **The Brass Plate**, lets you choose the night you work, opens the Guest
Book in full, works any past Tonight again, and puts a badge on the reviews you share.

Nothing on the desk is a number except the clock. The whole rulebook is one line and it
is the only thing the game explains. See HOTEL.md for the design, BALANCE.md "The hotel"
for the numbers, `docs/step-back/` for why the setting changed, and CHANGELOG.md for what
changed. The crisis game BRINK grew out of is kept whole as the `content-crisis/` pack
(REDESIGN.md, ENGINE.md §2–7) and runs with `BRINK_CONTENT_DIR=content-crisis`.

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
npm run sim -- --mode night --policy heuristic,random --runs 1000   # the hotel's balance (B1–B6) → sim-output/
npx tsx tools/sweep-hotel.ts --drift 1,1.5 --scale 1.2,1.4 --start 65   # the three balance levers as a grid
npx tsx tools/booking-nets.ts                                            # what each Booking's spine costs
npx tsx tools/smoke/hotel.ts   # the first night and tonight through the real screens, screenshots + share text (needs a served build on :4180)
npm run e2e            # Playwright, mobile viewport (Pixel 7), stubbed unlock Worker
BRINK_VOICE=strict npm run content:validate   # the voice contract as errors (the CI default)
BRINK_CONTENT_DIR=content-crisis npm run dev  # the crisis game (0.3.0), same engine, its own pack
```

Playwright uses its own Chromium in CI; locally, `PW_CHROMIUM_PATH=/path/to/chrome`
points it at an existing binary (a pre-installed `/opt/pw-browsers/chromium` is
detected automatically). `BRINK_CONTENT_LENIENT=1 npx vite build` builds a preview
even while content has validation errors; `npm run build` refuses.

## Play it

Three ways to see BRINK running as a game, from fastest to most permanent:

1. **On your machine.** `npm install && npm run dev`, then open the printed URL on a phone
   or in a narrow browser window. Tonight and practice nights are free; set
   `VITE_PAYWALL=false` in `.env` to open The Brass Plate without the Stripe flow.
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
content/     YAML, the hotel pack: bookings, cards, endings (reviews), seats, speakers, rules     → CONTENT.md, HOTEL.md
content-crisis/  the crisis packs (0.3.0): cards, endings, pieces, orders, archetypes, flashpoints → REDESIGN.md
src/engine   pure deterministic engine                                          → ENGINE.md
src/content  zod schema, compiler, semantic validator
src/sim      bot policies + simulator                                           → BALANCE.md
src/ui       Preact app, screens, components, SVG art manifest                  → THEME.md
src/meta     daily seeding, unlocks, stats, compendium, share card, unlock token, analytics
src/audio    Web Audio synthesis (no assets)
tools/       validator CLI, Vite content plugin, simulator CLI, OG image, icons, itch zip, size check
worker/      Cloudflare Worker: Stripe → signed unlock tokens (own package, tests, README)
e2e/         Playwright specs (the hotel on a phone, the plate, the unlock flow)
```

## Documents

HOTEL.md · docs/step-back/ · REDESIGN.md (superseded) · ENGINE.md · SYNERGIES.md · CONTENT.md · THEME.md ·
DECISIONS.md · BALANCE.md · PLAYTEST.md · PRIVACY.md · CHANGELOG.md · BLOCKERS.md · STORE.md · LAUNCH.md ·
RISKS.md · SUMMARY.md

## Legal

No accounts, chat, comments, leaderboards with names or any user-to-user feature.
All content fictional. See PRIVACY.md and LICENSE.md.
