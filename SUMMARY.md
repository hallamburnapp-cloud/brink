# SUMMARY.md — BRINK, The Brink Hotel

*It's 3am at The Brink. The phone is ringing.*

BRINK is a swipe-card comedy about one night on the desk of a hotel that is not quite
coping: four bars, one rule, about two minutes, the same night for everyone, a review you
can paste anywhere. This is the one-page account of what exists after the third redesign
(HOTEL.md; the step back that led to it is in `docs/step-back/`), what the numbers say,
and what is left. Everything named here is in this folder. The two earlier games (the
crisis and its two-minute night) are kept whole as the `content-crisis/` pack and tag
`v0.3.0-night`; they run on the same engine and appear on no screen.

## Why the setting changed

The owner said twice that the night did not work for a wide audience. A panel of four
critiques, six concepts and three judges (`docs/step-back/`) agreed on the cause: the
ceiling was the theme, not the mechanics. A nuclear-crisis premise reads as a strategy game
to the people who would never download one; every ending is a flavour of catastrophe; five
dials of state read as a dashboard; the climax was dice. All three judges chose a hotel.
The hotel keeps everything the engine learned (the clock, two sentences a card, the same
night for everyone, no numbers on screen, Home one tap away) and changes what a card is
about: a swan in the bath, sixty for breakfast and no eggs, a critic who is not called that.

## What was built

| Area | Delivered |
| --- | --- |
| The pack (`content/`) | Twelve Bookings (The Swan, The Wedding, The Alarm, The Critic, The Power Cut, The Inspector, The Flood, The Lift, The Band, The Man Who Isn't Here, The Snow, The Dog Show), each a night with a shape: an opener at 3:00, three beats, a head in the five o'clock hour, three tied cards; a pool of regulars for any hour; four comedy cards for a full bar; a review in five bands per Booking, four falls; a cast of fourteen with names in the Guest Book and roles on the cards. Written by machine to a validator-enforced contract, then a comedy-editing pass; strict validation 0 errors, 0 warnings |
| The rules (`rules.night`) | Eighteen cards of ten minutes; four one-sided bars (a bar fails only at 0; 100 clamps and seats a comedy card); no escalation; the night wears every bar down 1.5 a card (`drift`); whoever spoke last is unlikely to ring again straight away (`speaker_cooldown`); a gentler first night |
| Engine (`src/engine`) | Content packs (`BRINK_CONTENT_DIR`); Bookings pinned into the queue at run start and replicated for Home's "tomorrow"; reviews banded by the stars (`starsFor`); the reply line on every choice and every roll's outcome; memory flags between nights; the clock on the cards' minutes. 329 unit tests including replay determinism |
| Screens (`src/ui`) | Home in three states (CLOCK IN; TONIGHT with the Booking's name and teaser, ANSWER IT or pick the phone back up at the clock it was left; today's review with SHARE and tomorrow's Booking); the Desk (HOME, the clock, the bell, four bars with ghost previews and arrows, the reply line, the card with the Booking and the time, two choices with chips); the Review (stars, byline, headline, quote, two paragraphs, the stamp on a night that ended early, the moment, one row and the bars, Copy result / Share image, tomorrow, AGAIN, the plate slip); the Guest Book (reviews by Booking as pages, blank until earned; the nights that ended early; the Archive); the plate's purchase screen; About, Settings, Privacy |
| Share | Text: `BRINK #212 · THE SWAN · ★★★★☆`, one row of nine cells coloured by the lowest bar, the quote and byline, the link. PNG: brass letterhead, the Booking, the clock, the review's name, the stars with a DAWN or FELL AT stamp, the quote, the row and the four bars; the plate's badge when bought. The link preview names tonight's Booking |
| The purchase | The Brass Plate, $3.99 / £2.99 / €3.99, one payment: choose the night you work (with a seed to send), the Guest Book in full, work any past Tonight again, a badge on shared reviews. Offered on the review after a four- or five-star night (never after a fall, never on the first night), under the practice night on Home, and in the Archive. No typed name (D-097) |
| Balance (`src/sim`, `tools/`) | B1–B6 in the simulator for `voice: hotel` with stars, the bars' end mean and each Booking's dawn rate; `tools/sweep-hotel.ts` over drift, scale and start; `tools/booking-nets.ts` for each Booking's economics; five iterations in BALANCE.md "The hotel" |
| Playtesting | `tools/playtest.ts --game hotel` plays a chosen Booking and seed through the real screens in four styles with a transcript, the reply lines and the review; `tools/smoke/hotel.ts` walks the first night, tonight and every screen with screenshots; `e2e/hotel.spec.ts` and `e2e/unlock.spec.ts` on a Pixel 7 viewport |
| Docs | HOTEL.md, docs/step-back/, README, ENGINE §13, CONTENT §10, THEME, DECISIONS D-089–D-099, BALANCE "The hotel", PLAYTEST "The hotel", STORE, LAUNCH, RISKS 13–15, CHANGELOG 0.4.0, BLOCKERS B-007–B-008, this file |

## The night, in one paragraph

You are the Night Manager. Every card is someone at the desk with a problem and two ways
to answer it; swipe left or right, and the hotel answers back in one line. Four bars,
**Guests, Staff, Money, the Building**: if any reaches the floor the night is over (a
walkout, the staff walking, the Owner on the phone, the fire brigade). Every card is ten
minutes of the clock; the night wears the bars down by itself, and what you choose decides
where they end. At 6:00 the Day Manager walks in with her own pen and a guest writes your
review: one star to five, with the line everyone quotes. The same night for everyone each
day, one attempt. Nothing on screen is a number but the clock.

## What the simulator says (BALANCE.md "The hotel", 1,000 nights a bot)

| Target | Result |
| --- | --- |
| B1 Careful bot reaches 6:00 on 75–90% of nights | see BALANCE.md H-5 |
| B2 Random bot reaches 6:00 on 15–25% | see BALANCE.md H-5 |
| B3 Careful bot's stars at 6:00 roughly 5/25/40/20/10 | see BALANCE.md H-5 |
| B4 No single review above 15% | see BALANCE.md H-5 |
| B5 Median night the full eighteen cards, ≤ 2.5 minutes | see BALANCE.md H-5 |
| B6 Every Booking reaches 6:00 on both bots | see BALANCE.md H-5 |

The finding that mattered: the cards as written were a fair trade, so nobody could lose
(careful 100%, random 90%). One rule, the night wearing every bar down a little per card,
and a 34-cell sweep made it a game; then the star bands had to be re-read from where a
careful night actually ends (a mean of 27 of 100), because bands written for bars that
stay high gave three stars 73% of the time. Two targets were revised with their reasons
written down (D-096). Each Booking's spine was measured and the ones that taxed both
answers were softened so no night is unwinnable by its cards.

## What the playtests say (PLAYTEST.md "The hotel")

The harness plays the hotel the way a person sees it: bar fills, the ghost segment under a
thumb, the chips, the reply. Its transcripts read as the game should: the Majestic's
towels, a terrine nobody ordered, "God did not fit the tap". The screens were walked end to
end on a Pixel 7 viewport (first open, the desk, Home from the desk with the night kept,
tonight, the review, the share text and image, the Guest Book, the plate).

## What is not done, and what to do first

1. **A human comedy pass.** The pack is machine-written to a contract and machine-edited
   once; it reads well in samples (RISKS.md 13 has the test). The owner for about three
   days, or a comedy editor for roughly £1,500–3,000, on the spine cards and the five-star
   reviews, which is where the share text comes from. This is the one question in the report.
2. **A human playtest** (RISKS.md Protocol P). Every number above is a bot's. The two
   things to watch: whether the stars feel earned (RISKS.md 14) and whether a two-minute
   night with no numbers is legible on card one.
3. **The plate's name.** HOTEL.md put the player's name on the plate and on shared
   reviews; it is not built because the brief forbids user-generated content (D-097).
   The owner decides.
4. **Rewind.** HOTEL.md listed "rewind to the card the night turned on" for the plate; the
   engine saves state per card, so it is a day's work, and it is not in 0.4.0.
5. **Store assets** (STORE.md §4–5) from the real build; the link preview already renders
   tonight's Booking.
6. **The tag push** (BLOCKERS.md B-007).

## How to run it

```bash
npm install
npm run dev                          # http://localhost:5173, the hotel; content hot-reloads
npm test                             # 329 unit tests
BRINK_VOICE=strict npm run content:validate   # 0 errors, 0 warnings
npm run sim -- --mode night --policy heuristic,random --runs 1000   # B1–B6
npx tsx tools/playtest.ts --game hotel --style careful --booking "The Flood" --seed ABC
npx playwright test                  # Pixel 7 viewport, reduced motion, stubbed Worker
npm run build                        # validate, OG image, vite build
BRINK_CONTENT_DIR=content-crisis npm run dev   # the crisis game, same engine
```

Source: All rights reserved. © Hallam Burnapp. All content fictional; no accounts,
no chat, no comments, no leaderboards with names, no user-generated content.
