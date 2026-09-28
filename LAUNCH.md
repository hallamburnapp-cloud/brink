# LAUNCH.md — fourteen days, no audience

Assumptions. Day 0 is a Tuesday; the Daily rolls at 00:00 UTC; the web build is on
Cloudflare Pages with `VITE_ANALYTICS=plausible` switched on from Day −1; the itch.io
page is paid; the Steam page is a Coming Soon page whose desktop build follows later.
Nobody is subscribed to anything of ours. Every channel below is somebody else's, so
every post follows that channel's rules and gives more than it asks.

Preconditions (not in the table because they take longer than three days): the Steam
Coming Soon page submitted and approved; Stripe live mode tested with a real card and
refunded; the unlock Worker deployed; `VITE_PUBLIC_URL` set so share text and the OG
image carry the real domain; the press kit uploaded to itch as a free download
("BRINK — press kit": capsule, six screenshots, trailer, fact sheet, STORE.md copy).

---

## 1. Day by day

| Day | Channel | Action | Asset needed | Success signal |
| --- | --- | --- | --- | --- |
| −3 Sat | Build | Content freeze. `npm run content:validate`, `npm run sim -- --runs 20000 --policy all --strict`, `npm run e2e`, `npm run size`. Play Day 0's Daily seed end to end on a phone; if it opens on a dull card, pin a mined seed (§6) | Green CI; the Day 0 seed | All targets PASS; one human run of the Day 0 Daily finished under 25 min |
| −2 Sun | Video | Capture and cut the 30-second trailer and the six screenshots from the real build (STORE.md §4–5). Portrait cut for the itch page | Screen captures at 1920 × 1080 and 1080 × 1920 | Trailer under 30 s, audio from the build, no mock-ups |
| −1 Mon | Web, streamers | Deploy to the real domain with analytics on; confirm `run_start` arrives in Plausible from a private window. Send the cold email (§4.1) to ten grand-strategy / geopolitics YouTubers with an unlock link and a seed | Unlock tokens via `/unlocked?token=`; the press-kit link | Events visible; ten emails out, zero bounces |
| 0 Tue | Web, itch, HN, own accounts | 00:00 UTC Daily #N is live. 09:00 UTC itch page public. 13:30–14:30 UTC Show HN (§2). Bluesky and Mastodon posts with today's share card, one each. Stay in the HN thread all day; answer every technical question | Show HN body; a share card from your own Daily run | HN: front page for ≥ 1 h or ≥ 60 points; ≥ 1,500 `run_start` by midnight UTC |
| 1 Wed | Reddit | r/WebGames post (free Daily link, one honest paragraph). itch devlog #1: "How the modifier resolver keeps builds legible" with the worked examples from ENGINE.md | Devlog text; one GIF of a piece changing a preview | Post stays up; ≥ 50 upvotes; devlog ≥ 100 views |
| 2 Thu | Reddit | r/roguelites post with the dev flair: what is roguelite about it (pieces, seeds, restart) and what is not (no deck). Reply to every comment within the hour | A 20-second GIF of the offer screen and a flashpoint roll | Not removed; comment ratio ≥ 0.3 per upvote (people arguing about the design is the signal) |
| 3 Fri | Reddit, streamers | r/gamedev: a technical write-up on the balance simulator with real numbers (targets, pass/fail, one surprising pair), no store link in the body, link in a comment if asked. Send the seed challenge (§4.4) to ten more channels | `sim-output/report-latest.md` excerpts | ≥ 20 comments; two channels reply |
| 4 Sat | Reddit | r/webdev "Showoff Saturday": a 250 KB PWA with a deterministic engine, offline, no accounts. Technical framing only | Lighthouse screenshot; size-check output | ≥ 30 upvotes; someone opens a bug on the PWA |
| 5 Sun | Reddit | r/Games Indie Sunday post in the required format (§3). r/playmygame post the same day with the free Daily and a promise to play three others' games (then do it) | One-line description; the Steam link; the itch link | Indie Sunday: ≥ 40 upvotes; playmygame: three pieces of feedback given, two received |
| 6 Mon | Metrics, build | First read of the numbers (§7): runs per session, Daily completion rate, share rate, paywall view rate. Ship 0.1.1 with the three most-reported bugs. Follow up (§4.3) with the twenty channels contacted | Plausible dashboard; CHANGELOG entry | 0.1.1 live before 18:00 UTC; ≥ 3 channel replies total |
| 7 Tue | itch, own accounts | Devlog #2: "Week one by the numbers" — runs, completion, the most common ending, the most fatal doctrine, the pair that surprised us. Honest, with charts. Post the link on Bluesky/Mastodon and as a comment in the still-live HN thread if it is | Aggregates from Plausible and the sim | ≥ 300 devlog views; one external write-up or repost |
| 8 Wed | Content | Content patch: the arc players complain about most gets six new cards; the weakest-card list from the sim gets rewrites. Hot-deploy; the Daily seed for Day 9 is re-verified because content changes the draw | New YAML, validator green | Weakest-card impact floor rises; no validator errors |
| 9 Thu | Web, own accounts | First pinned Daily (§6): Dark Sky, on the Republic seat (the `satellite_blackout` arc exists; the Sorrel Cable waits for its arc). Post the seed and the OG image. Send the same seed to every channel contacted as a "play this one" nudge | `content/daily.yaml` entry; OG image for the day | `daily_played` on Day 9 ≥ 1.2 × the Day 2–8 average |
| 10 Fri | Streamers, Reddit | Second outreach wave: ten new channels, cold email with any clip a streamer has already made. r/strategy and r/IndieGaming (one of them, whichever's rules fit the asset) | A clip or the trailer | One stream or video scheduled |
| 11 Sat | Build | No posts. Fix what the week broke. Review accessibility: reduced motion, contrast, font size on small phones | — | Zero open P1 bugs |
| 12 Sun | Reddit | Indie Sunday again only if the sticky's cadence rule allows and there is something new (a clip, the content patch). Otherwise r/indiegames with the trailer | Trailer or clip | Not removed; ≥ 30 upvotes |
| 13 Mon | Steam | Wishlist push: devlog #3 "What's in the Steam build" (offline install, three OSs, achievements if the Steamworks stub is wired by then). Submit the desktop build for Steam review if it is ready; otherwise set the date | Tauri bundles; achievement icons if applicable | ≥ 500 wishlists cumulative (check current Steamworks dashboard) |
| 14 Tue | Decision | Read the two metrics (§7). Pick the quadrant. Write the next fourteen days from it | Two numbers | A decision, written down, with the numbers next to it |

Cadence rules for the whole table: one subreddit per day at most; never the same asset
on two subreddits on the same day; every post answered for 24 hours; nothing posted on a
day when the build is broken.

---

## 2. Show HN

Show HN rules, as we understand them: it must be something people can try now; the
title says what it is; the first comment from the author gives context; no asking for
votes anywhere; answer everything. The Daily is playable without an account in a
browser, so it qualifies.

### Title options

1. `Show HN: BRINK – a browser roguelite about a nuclear crisis, with a shared daily seed and no accounts`
2. `Show HN: A crisis-strategy card game whose balance is tuned by a 20k-run headless simulator`
3. `Show HN: BRINK – deterministic crisis-strategy runs in 250 KB of JS, no cookies, no backend for play`

Use 1 unless the day's front page is already heavy on games, in which case 2.

### Body (post as the first comment; the URL field is the game)

> I've been building BRINK for the last while, alone. It's a run-based strategy game in the browser: you lead one of three fictional great powers through five weeks of a crisis, one two-choice card at a time, with five visible meters and four hidden values (adversary trust, intel reliability, commitment) that only ever reach you as prose. Each week ends in a flashpoint where the odds are shown before you commit and the margin after ("Missed by 3%"). Runs are 10–25 minutes. The Daily is free: same seed and seat for everyone, one attempt. Endless is a one-time purchase.
>
> The parts I think are technically interesting:
>
> **Determinism.** The engine is pure TypeScript with no DOM access. The RNG (xoshiro128\*\*) is seeded from `"${seed}|${seat}|${difficulty}"` and its four state words live inside the serialisable run state, so a run resumes bit-identically mid-flashpoint and "Replay this seed" reproduces every draw, roll and warning truth-value. Warning cards decide whether they're true at draw time, not at choice time, so the UI cannot leak it and the seed alone fixes it. Tests assert identical replays.
>
> **The modifier resolver.** Every posture piece (advisor, doctrine, asset) is a list of small modifiers. For each effect the resolver applies them in one fixed order: filter → sum the additive terms → sign guard (an add can soften a cost to zero but never flip it into a gain) → multiply → scale costs only by act × difficulty → round half away from zero → clamp. Addition before multiplication means acquisition order never matters, so two pieces together are always the same thing and every "synergy" is arithmetic, not a special case. There's a worked example in ENGINE.md.
>
> **Balance simulator.** Three bot policies (random, greedy on the visible previews, and a heuristic that reads the same view a player gets) play 20,000 headless runs in a few seconds. The report checks targets: median survival 28–45 days, no ending above 30%, every offered piece picked 15–60% of the time, at least 12 piece pairs whose stand-down rate differs by ≥ 10 points from baseline, and a "perfect run" rate above zero and under 8%. `--strict` fails CI when a target fails. It also lists the weakest cards by measured impact, which is how I find prose that does nothing.
>
> Other bits: content is YAML compiled through a zod schema and a semantic validator (dangling flags, unreachable endings, flashpoint cycles, a blocklist of real-world names — the world is fictional on purpose); Preact + Vite, under 250 KB gzipped initial JS, installable PWA, offline; all audio is synthesised in Web Audio at runtime, no files; no accounts, no cookies, no analytics unless a flag is set, and then cookie-free; the paid unlock is a Stripe Payment Link → Cloudflare Worker → ECDSA-signed token verified offline in the browser.
>
> What I'm not sure about: whether hidden values carried by prose alone are legible, and whether the bots' balance holds for humans. If you play the Daily, I'd like to know whether a failed 47% felt fair and what you thought the other side thought of you.

---

## 3. itch.io: tags and launch-day tactics

Tags (ten): `roguelite`, `card-game`, `strategy`, `political`, `text-based`,
`multiple-endings`, `singleplayer`, `daily`, `nuclear`, `minimalist`. Genre Strategy.
Made with: TypeScript, Preact, Vite, Web Audio.

Tactics, in order of expected return:

1. **Devlogs are the channel.** itch surfaces devlogs on followers' feeds and on the
   game's page; ours are technical and honest (Days 1, 7, 13). Each ends with the seed
   of the day.
2. **Free press kit as a separate download** on the game page, so the page has a free
   file and appears in more filters without giving the game away.
3. **Jam-adjacent communities, carefully.** BRINK is not a jam game and must not pretend
   to be. Where it fits: the 7DRL community's off-season discussion (roguelike people who
   care about determinism and seeds); itch's own "Strategy" and "Card Game" browse pages
   (ranking is by recent activity, so devlog and comment on launch day); r/roguelikedev's
   Sharing Saturday only as a developer sharing the simulator and resolver, never the
   store link. Do not post in jam submission threads.
4. **Price display.** Set "$5.99 or more"; itch shows the "or more" and a tip prompt.
5. **The embed.** 430 × 860, mobile friendly, fullscreen button, no autoplay. The first
   screenshot is the page hero; use #1 from STORE.md (the card mid-drag with the timer).
6. **Comments on.** itch page comments are itch's feature, moderated by us; they are
   not a feature of the game and do not change our no-user-to-user position. Reply to
   every one for the first fortnight.

---

## 4. Subreddits

Conservative summary of each community's self-promotion rules as we understand them;
"check sidebar" means read the current rules and stickies on the day before posting.
Post as the developer, say so in the first line, and never post the same text twice.

| Subreddit | Their rules (as understood) | Our post and how it complies |
| --- | --- | --- |
| r/roguelites | Developer posts allowed with the developer flair; expected to be substantive and to engage; excessive self-promotion removed. Check sidebar for current flair names | Day 2. Flair as developer; explain what is roguelite about it and what is not (no deck); a GIF, the free Daily link, itch link in the body. Stay in the comments |
| r/incremental_games | For incremental/idle games. BRINK is not one | Do not post |
| r/WebGames | Browser-playable games, including your own; must actually be playable in the browser without a download or a paywall in front. Check sidebar for self-post tagging | Day 1. The free Daily is the link; one paragraph; disclose it is ours |
| r/IndieGaming | Developer promotion allowed within limits (frequency caps; video or image posts preferred). Check sidebar for the current cap | Day 10 (or r/indiegames instead, not both on the same day). Trailer post, developer disclosed, one per fortnight |
| r/indiegames | Promotion allowed with the appropriate flair; gameplay footage preferred; low-effort posts removed. Check sidebar | Day 12 if Indie Sunday is not repeated. Trailer with the "Promotion" flair or current equivalent |
| r/geopolitics | Serious-analysis community; submissions must be substantive articles; games, memes and self-promotion are removed | Do not post. If a member independently writes about the game's model of escalation, answer questions there without linking |
| r/CredibleDefense | Strict sourcing and no self-promotion; off-topic and promotional posts removed | Do not post, ever. The register of the game was built by reading communities like this; that is the relationship |
| r/wargames | Hex-and-counter and tabletop wargaming; digital posts tolerated when relevant; promotion rules vary. Check sidebar | Weak fit. At most one post, late (after Day 14), framed as a question about abstraction in crisis games, with the link in a comment |
| r/strategy | Small, mixed; game posts allowed; check sidebar for self-promo limits | Day 10 alternate. Text post about the hidden-value design with the link at the end |
| r/Games | Self-promotion only in the weekly Indie Sunday thread, posted on Sunday as a self post with the Indie Sunday flair; title format `Game Name - Developer - one-line description`; the developer must be the poster; a store page link is expected; cadence limits per game — check the sticky | Day 5: `BRINK - Hallam Burnapp - a crisis-strategy roguelite where the odds are shown before you choose and the margin after`. Steam and itch links, the free Daily, and a paragraph on what is different. Day 12 only if the sticky allows |
| r/playmygame | For feedback; you are expected to play and give feedback on other posted games; games should be free to try; platform flair required. Check sidebar | Day 5. The free Daily qualifies; flair Web; give feedback to three games the same day |
| r/gamedev | No self-promotion outside designated threads; technical and postmortem posts with real substance allowed as discussion; Feedback Friday thread exists in some form — check the current sticky | Day 3. A simulator write-up with numbers and methodology, no store link in the body. Feedback Friday thread if live that week |
| r/InternetIsBeautiful | Websites, not games; games are redirected to r/WebGames | Do not post |
| r/webdev | "Showoff Saturday" allows personal projects on Saturdays with technical detail | Day 4. The PWA and the deterministic engine; size budget; no store pitch |
| r/roguelikes | Traditional roguelikes only; roguelites are redirected | Do not post |
| r/roguelikedev | For developers; Sharing Saturday thread for progress; not for launches | Sharing Saturday, resolver and simulator only, if we have something new to say |

---

## 5. Outreach templates (each under 150 words; no hype adjectives)

Targets: grand-strategy and geopolitics channels on YouTube and Twitch; Reigns and
deckbuilder streamers second. Personalise the first line with the specific video or
stream that made us write. Replace `{name}`, `{video}`, `{seed}`, `{link}`.

### 5.1 Cold email

> Subject: BRINK — a 20-minute crisis game, one seed for you
>
> {name} — your {video} on how leaders misread each other during a crisis is the reason I'm writing.
>
> I've made BRINK, a browser strategy game about that: you lead one of three fictional great powers through five weeks of a crisis, one two-choice card at a time. Adversary trust is hidden and carried only by what your advisors say; the odds at each flashpoint are shown before you commit and the margin after. Runs are 10–25 minutes.
>
> Here is an unlock link for the full game, no account: {link}. If you want a run nobody else has seen, type the seed `{seed}` in Endless.
>
> Press kit: {presskit}. Happy to answer any question about the model. No obligation.
>
> Hallam Burnapp

### 5.2 Short DM

> Hi {name} — I made a browser game about crisis escalation, 20 minutes a run, odds shown before you choose. Unlock link (no account): {link}. Seed `{seed}` is yours if you want one nobody has played. Press kit: {presskit}. — Hallam

### 5.3 Follow-up (five days later)

> Subject: Re: BRINK — a 20-minute crisis game
>
> {name} — one follow-up and then I'll stop.
>
> Since I wrote, {number} people have played the Daily; the most common ending is "{ending}", and {percent}% of runs reach Midnight. The unlock link still works: {link}.
>
> If a game about hidden trust and visible odds isn't for your channel, no reply needed.
>
> Hallam

### 5.4 The seed challenge

> Subject: A seed with your name on it
>
> {name} — BRINK runs are deterministic: the same seed gives every player the same cards, warnings and rolls, so two people can play the same crisis and compare where it went wrong.
>
> Seed `{seed}` is yours. Nobody has played it. It opens with {opening: e.g. a satellite going dark over the Straits} on the {seat} seat. I'll play it after you and publish my run's share card next to yours, if you like.
>
> Unlock link (no account): {link}. Type the seed under Endless → seat → seed.
>
> Hallam

### 5.5 Press-kit line

> BRINK is a run-based crisis-strategy game for browser, itch.io and Steam. You lead one of three fictional great powers through five weeks on the edge of world war, one two-choice card at a time; five meters are visible, four values are hidden and carried by prose; each week ends in a flashpoint with odds shown before the choice and the margin after. 36 posture pieces combine into builds; 40+ endings each name the card that decided them. A free Daily gives everyone the same seed, one attempt and a streak; Endless is a one-time purchase. Runs take 10–25 minutes. No accounts, no online features. Solo developer: Hallam Burnapp (UK). Release: {date}. Price: Daily free; Endless $5.99 web/itch.io, $7.99 Steam.

---

## 6. Pinned Dailies: three crises for real news cycles

The Daily should occasionally rhyme with the week: not with a real event, never with a
real casualty, but with the recurring *kinds* of story that surface every year —
something cut under the sea, something dark in orbit, a week when the leaders are all
in one building. Rule: pin to cycles, never to deaths; if a real crisis is killing
people this week, the Daily is unpinned and ordinary.

| Pinned Daily | Fictional theme | Rhymes with | Seat | Arc opened | When to schedule |
| --- | --- | --- | --- | --- | --- |
| The Sorrel Cable | Two of the four fibre trunks under the Sorrel Straits stop carrying traffic within an hour of each other; a survey ship with its transponder off was in the area | Recurring undersea-cable damage stories (several a year) | Coalition (the power whose cables everyone runs through) | `undersea_cables` (when the arc ships; registry entry exists) | The week such a story is in the news, provided nobody was hurt |
| Dark Sky | The reconnaissance satellite over the Straits goes dark at 02:14; consistent with a jammer, a laser or a fault | Recurring satellite-interference, GNSS-jamming and debris stories | Republic | `satellite_blackout` (written) | Same rule |
| Summit Week | The Assembly of Nations convenes; a communiqué is drafted before anyone has agreed to it; the hotline rings during the group photograph | The calendar of annual multilateral gatherings, which are dated years ahead | Federation (few friends; the summit is the way out) | `summit` (when the arc ships) | The Thursday of the real gathering |

### The config table (proposed)

The Daily today is fully determined by `src/meta/daily.ts`: seed `daily-YYYY-MM-DD`,
seat by `dailyNumber() − 1 mod 3`, DEFCON 5. Proposed: a content file the engine
already knows how to ship (compiled with the rest of `/content`, so the itch build and
the OG image tool see the same table), consulted first, with the current formula as
the fallback.

```yaml
# content/daily.yaml — pinned Dailies. Dates not listed fall back to the formula.
- date: 2026-10-07                 # UTC day
  title: The Sorrel Cable          # shown on the home card and in the OG image
  seat: coalition                  # overrides the rotation
  seed: daily-2026-10-07-cable     # any string; see mining below
  opens_with: cables_01_the_splice # optional: card queued at in: 0 on run start
  defcon: 5                        # optional; Daily stays DEFCON 5 unless said otherwise
```

Two ways to honour `opens_with`, cheapest first:

1. **Seed mining, no engine change.** Because the engine is deterministic, a script
   (`tools/daily-mine.ts`) can run `createRun` + `view` over candidate seeds
   `daily-<date>-<n>` for the pinned seat and return the first whose opening four cards
   include an entry card of the wanted arc. Write that seed into the table. Nothing in
   the engine changes; the Daily is still just a seed.
2. **A `createRun` option.** `opens_with` pushes the named card onto the follow-up queue
   at `in: 0`, subject to its conditions. One small engine hook; deterministic because
   the queue is state.

Plumbing to adjust when the table lands: `dailySeed()` and `dailySeat()` read the table
before the formula; `tools/og-image.ts` reads the same table so the link preview says
"The Sorrel Cable"; `dailyRecordFromRun` currently parses the date with
`^daily-(\d{4}-\d{2}-\d{2})$` and must accept a suffix
(`^daily-(\d{4}-\d{2}-\d{2})(-[a-z0-9-]+)?$`) or a run straddling midnight is filed on
the wrong day; the e2e suite gets one pinned fixture. Pinned seeds are announced only
after 00:00 UTC on the day.

---

## 7. The two numbers

Both are computed from the cookie-free events in PRIVACY.md. There are no identifiers,
so nothing is counted per person; everything is counted per event, and the trick is to
find events that fire exactly once per unit we care about.

### 7.1 Runs per session ≥ 2.5

**Population.** Sessions in which a second run was possible. On the web, a free Daily
player *cannot* run again (one attempt; "Run again" opens the paywall), so a web-wide
average is capped near 1 by design and would fail regardless of the game. Measure over:
(a) the itch build, on its own Plausible site (set `VITE_ANALYTICS_DOMAIN` differently
for the itch flavour); (b) web sessions with at least one `run_start{mode: endless}`.

**From today's events.** `run_end` carries `runs_this_session`, an in-memory counter
that starts at 1 per page load and increments at each `run_start`. Then:

- sessions ≈ count(`run_end` where `runs_this_session = 1`)
- runs ≈ count(`run_start`)
- runs per session ≈ runs ÷ sessions

Bias: a session that abandons run 1 and finishes run 2 emits no `runs_this_session = 1`
event, so sessions are undercounted and the ratio overstated. Treat ≥ 2.5 as needing a
margin: call it met at ≥ 2.8 on this estimator.

**With one property added (recommended, no privacy change).** Add `runs_this_session`
to the `run_start` event; the value already exists in `startRun` (`countRun()`), it just
is not sent. Then sessions = count(`run_start` where `runs_this_session = 1`) exactly,
runs per session = count(`run_start`) ÷ that, and the breakdown of `run_start` by
`runs_this_session` is the within-session retention curve (share reaching a 2nd run,
a 3rd…). Update the PRIVACY.md table line for `run_start`.

**The Daily-side companion.** For free web sessions, the equivalent of "wanted to run
again" is the paywall view rate: count(`unlock_viewed`) ÷ count(`run_end{mode: daily}`).
Target ≥ 25%. Its conversion is count(`unlock_completed`) ÷ count(`unlock_viewed`) (§RISKS 3).

### 7.2 Day-7 return ≥ 15%

**What exists.** `daily_played{number}` fires at most once per device per UTC day, by
construction (one attempt). It is the only event that is one-per-device-per-day, which
makes it the right base for retention. But with no identifiers, today's events give
only a population proxy: count(`daily_played` on day D+7) ÷ count(`daily_played` on
day D). That is "how big is the Daily a week later", not "who came back", and it is
polluted by every new arrival. Report it, do not decide on it.

**With one integer property added (recommended).** Add `days_since_first_run` to
`daily_played` (and to `run_start`), computed on the device from a `firstPlayedAt`
timestamp stored alongside `brink.stats` (one new field), bucketed at 30+. It is a
gameplay fact about the device, not an identifier, and nothing else changes. Then:

- cohort(D) = count(`daily_played` on day D where `days_since_first_run = 0`)
- returned(D) = count(`daily_played` on day D+7 where `days_since_first_run = 7`)
- day-7 return(D) = returned(D) ÷ cohort(D)

Read it as a 7-day rolling mean from Day 7 onwards (cohorts Day 0–6 are readable by
Day 13). Also add `streak` to `daily_played` (already computed by `dailyStreak()`):
the share of plays with `streak ≥ 2` is the habit's health check, readable from Day 1.
Update the PRIVACY.md table for both events.

### 7.3 The 2 × 2

| | Day-7 return ≥ 15% | Day-7 return < 15% |
| --- | --- | --- |
| **Runs per session ≥ 2.5** | **Double down.** The run is good and the habit holds. Ship the Steam build; pin one Daily a week; second content wave (arcs 5–10); third outreach wave with clips that exist; raise the itch price to $6.99 after the first 500 sales, not before | **The run is good; the Daily is not pulling.** Do not spend on marketing. Fix the habit loop: make the streak visible on the ending screen; show tomorrow's seat and time; PWA install hint after a 3-day streak; test a pinned Daily every day for a week and read `daily_played` per day. Re-read after 7 days |
| **Runs per session < 2.5** | **People come back but do not restart.** Check the unlock funnel first (paywall view rate, Stripe checkout conversion); if the funnel is fine, the ending screen is: put "Replay this seed" first, show the moment card larger, test a second free Endless run per day as a product change. Look at run length: if median `run_end.days` is high, runs are too long to restart | **Stop and playtest.** Neither the run nor the habit holds. Run the 12-person protocol in RISKS.md before spending a further hour on channels. Question the audience: Reigns players may be the market, not grand-strategy players; retarget the outreach list. Consider shortening the Daily (act card counts in `rules.yaml`) |

Decision on Day 14, written into DECISIONS.md with the two numbers, the estimator used
and its known bias.
