# RISKS.md — the ten assumptions most likely to be wrong

Each entry: why it is risky, the leading indicator, a concrete test that fits in the
first two weeks (event and threshold, or a playtest protocol with sample size), and
the fallback if it fails. Tests use the cookie-free events in PRIVACY.md, the headless
simulator (`npm run sim`), or Protocol P below. Where a test needs an event property
that does not exist yet, it says so; each such addition is one integer or boolean
computed on the device, and PRIVACY.md's table is updated with it.

## Protocol P — the twelve-person playtest

Twelve testers, recruited from the launch channels on Days 1–3 with an unlock link:
four who play Reigns-style or mobile narrative games, four who play Balatro or Slay the
Spire, four who read about strategy or international affairs and play little. Remote,
45 minutes, screen shared, think-aloud, recorded with consent, no help given. One Daily
run and one Endless run each. Probes at fixed points, asked the same way every time:

| Probe | When | Question |
| --- | --- | --- |
| P1 | After the tenth card | "How much does the rival trust you right now? What told you?" |
| P2 | After the first offer | "Why did you pick that one? What do you expect it to do?" |
| P3 | After the first failed roll | "Was that fair? One to five. What would have changed the number?" |
| P4 | After the second offer | "What is your build doing? Name one thing two of your pieces do together." |
| P5 | After the ending | "Name three places or people from the run. Did it feel like a real crisis, one to five?" |
| P6 | Close | "Would you play tomorrow's? Why or why not? Would you pay $5.99 for the rest?" |

Run it in week one, report in week two. Sample of twelve gives direction, not
precision: a threshold of 8/12 is chosen because 4/12 failing is where a pattern
stops being individual.

---

## Summary

| # | Assumption | Severity if wrong | Test window | Owner of the test |
| --- | --- | --- | --- | --- |
| 1 | Players understand hidden values from prose alone | High: the flashpoints feel random | Days 1–10 | Protocol P + events |
| 2 | A 10–25 minute run fits the daily habit | High: the streak never forms | Days 0–13 | Events |
| 3 | The paywall on Endless converts at ≥ 2% | High: no revenue | Days 0–13 | Events + Stripe |
| 4 | The posture system produces legible builds by act 3 | Medium-high: the roguelite promise fails | Days −3–10 | Sim + Protocol P + events |
| 5 | Odds with near misses feel fair rather than random | High: the loss ending is resented | Days 1–13 | Protocol P + events |
| 6 | The fictional world reads as grounded, not generic | Medium: store-page bounce, "which country am I" | Days 0–10 | Protocol P + comment coding |
| 7 | No-social positioning does not kill virality | High: no organic growth at all | Days 0–13 | Events |
| 8 | Content authoring at 300+ cards keeps quality | Medium-high: the deck dilutes | Days −3–13 | Sim + read-aloud + Protocol P |
| 9 | Balance targets hold for humans as well as bots | Medium-high: too punishing or too easy | Days 0–13 | Events vs sim |
| 10 | PWA install and offline matter | Low-medium: wasted engineering | Days 0–13 | Events |

---

## 1. Players understand hidden values from prose alone

**Why it is risky.** Trust, intel reliability and commitment are surfaced only through
`describeHidden()`'s four bands ("they expect the worst", "wary", "moderate confidence",
"boxed in") and through advisor language; the odds already include them silently
((trust − 50)/200 on `adversary` rolls). If players do not connect the words to the
percentage, the design's central idea reads as noise and the flashpoint as a dice roll.
Only Signals Intercept prints a number. Every reassurance build depends on players
noticing trust move.

**Leading indicator.** Comments that call "They blink" luck; P1 answers of "no idea";
low holding of trust pieces (No First Use, Back-Channel, Old Ambassador) in
`run_end.pieces` relative to deterrence pieces.

**Test.** Protocol P, P1 and P3: ≥ 8/12 give the correct band for the rival at P1 and
cite a phrase or a speaker; ≥ 6/12 at P3 name trust, a piece, or intel as something
that would have moved the number. Event check by Day 10 (n ≥ 1,000 `run_end`): No First
Use, Back-Channel or Old Ambassador appear in ≥ 25% of `run_end.pieces` lists; if they
are under 15% while deterrence pieces are over 40%, players are not seeing what trust
buys.

**Fallback.** Show the odds' components in the roll overlay ("base 45 · your posture
+16 · their distrust −14 → 47%"); the engine already computes the terms. Then, if still
failing: a one-line intel note on the HUD when a hidden value crosses a band ("Kaskad:
wary → suspicious"), and Signals Intercept offered in the first offer for a player's
first three runs.

## 2. A 10–25 minute run fits the daily habit

**Why it is risky.** Daily-puzzle habits are built on two-to-five-minute sessions; a
run is about 90 cards. The Daily is one attempt: an unfinished Daily writes no record,
and a streak that breaks because someone had to leave at card 60 is a streak that does
not come back. The run does persist in local storage and a Daily straddling midnight
is filed under the day it was issued, so interruption is survivable; abandonment is not.

**Leading indicator.** Daily completion rate falling with the day-of-week; `run_end`
skewed to acts 1–2 for `mode: daily`; P6 "no, too long".

**Test.** By Day 13 with n ≥ 500 `daily_played`: completion = count(`run_end{mode:
daily}`) ÷ count(`daily_played`) ≥ 70%. Protocol P: median wall-clock time for the
Daily ≤ 20 minutes and ≥ 10/12 finish in one sitting. (Duration is not an event
property; add `minutes` bucketed to 5 on `run_end` if the Protocol P numbers and the
completion rate disagree.)

**Fallback.** A shorter Daily via content, not code: a Daily act table in `rules.yaml`
(10/10/12/12/8 cards) for `mode: daily` only, reducing a run to roughly 12–15 minutes.
Make "Resume the crisis in progress" the first thing on the home screen when a Daily is
open (it already is a button; make it the hero). Last resort: two attempts per Daily,
which weakens the shared-seed story and is taken only if completion is under 50%.

## 3. The paywall on Endless converts at ≥ 2%

**Why it is risky.** Web games rarely convert; there is no account, so there is no
email nurture and no second chance after the tab closes; the buying moment is a single
button on the ending screen after one free run; the buyer must trust a Stripe link from
a game they met an hour ago; tax handling on the web is ours.

**Leading indicator.** Paywall view rate = count(`unlock_viewed`) ÷ count(`run_end{mode:
daily}`) under 15% (nobody wants more); Stripe checkout sessions started but not
completed (Stripe's own dashboard shows this).

**Test.** By Day 13 with ≥ 1,000 `unlock_viewed`: count(`unlock_completed`) ÷
count(`unlock_viewed`) ≥ 2%. `unlock_viewed` counts views, not sessions, so this
undercounts conversion slightly: conservative in the right direction. Companion: Stripe
checkout completion ≥ 30% of checkouts started, and paywall view rate ≥ 25%. Protocol P
P6: ≥ 6/12 say yes to $5.99.

**Fallback.** In order: (1) copy — the paywall's four bullets are the pitch; test a
version that shows the player's own unlocked seats and pieces as "yours, waiting";
(2) price — two Stripe Payment Links, $5.99 and $3.99, alternated by UTC day, read
`unlock_completed` per day (no identifiers needed); (3) a second free Endless run per
UTC day, so the first paywall appears after the third run, not the second; (4) itch as
the primary store on the web page if Stripe conversion stays under 1% for 14 days.

## 4. The posture system produces legible builds by act 3

**Why it is risky.** A player holds two pieces at the start of Week Three and four by
the Endgame. For a pair to be felt, the piece-gated cards (`pieces_any`) have to appear
and the arithmetic has to be visible in previews. 36 pieces means 630 pairs; SYNERGIES.md
designs 34 of them. If offers feel like flavour text rather than levers, the roguelite
audience leaves after one run.

**Leading indicator.** Sim `combos` target failing; `rare` cards list containing
piece-gated cards; `run_end.pieces` showing pieces that are never held; P2 answers of
"the name sounded good"; P4 blank.

**Test.** Day −3: `npm run sim -- --runs 20000 --policy all --strict` passes the pair
target (≥ 12 pairs with |Δ stand-down| ≥ 10 points) and the pick band (every offered
piece picked 15–60%). Content check: every piece has ≥ 2 `pieces_any` cards and one that
complicates it (CONTENT.md §4.2; grep the YAML, make the validator warn). Protocol P,
P4: ≥ 8/12 describe one interaction correctly. Events by Day 13 (n ≥ 2,000 `run_end`):
no piece in fewer than 3% of `run_end.pieces` lists and none in more than 40%.

**Fallback.** Surface the designed pair text on the offer screen when a held piece pairs
with an offered one (SYNERGIES.md entries as one-line "with the Hawk General:" notes).
Give each seat a starting piece (`starting_pieces` exists in the seat schema and is
empty) so the first offer is already a pair. Reduce the pool to 24 pieces for launch if
the pick band fails for more than eight pieces after a tuning pass.

## 5. Odds with near misses feel fair rather than random

**Why it is risky.** A 47% at Midnight can end a 20-minute run. Balatro and Slay the
Spire avoid a die at the moment of loss; Reigns has no odds at all. "Missed by 3%" is
designed as honesty but can read as taunting. The clamp is 3–97%, so nothing is ever
certain, which is the point and the risk.

**Leading indicator.** Comments using "RNG" as a verdict; `share` rate after nuclear
endings far below the rate after stand-downs (people share losses they accept); P3
scores under 3.

**Test.** Protocol P, P3: mean ≥ 3.5 of 5 and ≥ 9/12 can name what would have changed
the number. Events by Day 13: share rate by ending kind, count(`share` where ending is
nuclear) ÷ count(`run_end{kind: nuclear}`) ≥ 50% of the same ratio for stand-downs.
Sim: near-miss rate (reported per policy) between 15% and 30% of rolls; if higher, the
odds are clustering at 50% and every roll feels like a coin.

**Fallback.** Show the components of the probability in the overlay (as in Risk 1). Add
a "margin ledger" line to the ending screen: the sum of margins across the run, so a
player can see they were unlucky rather than told. Content: convert the worst
catastrophic-failure branches from forced endings into a follow-up card with one more
decision. Engine, last: raise the floor on Endgame rolls to 0.25.

## 6. The fictional world reads as grounded, not generic

**Why it is risky.** The three powers are deliberately abstract, the validator forbids
real names, and abstraction reads as "generic Cold War" unless the specifics do the
work: 02:14, the Sorrel Straits, the headland at Caldor, Prime Minister Varga, a queue
outside a bank on camera. If players ask "which country am I supposed to be", the
premise has failed at the store page.

**Leading indicator.** Comments asking for real countries; P5 recall of zero proper
nouns; share-card moment lines that could belong to any game.

**Test.** Protocol P, P5: ≥ 8/12 recall two or more in-world proper nouns unprompted, and
≥ 8/12 score "felt like a real crisis" at 4 or 5. Comment coding on Days 0–10 (HN,
Reddit, itch): of substantive comments about the setting, ≤ 20% call it generic or ask
for real states; ≥ 30% quote a line or a name.

**Fallback.** More seat-specific domestic cards (`dom_*`) so each seat has its own
texture; recurring named people across arcs (Varga, Jonah, Ferrante) on a schedule;
a one-screen briefing before a player's first run, in Mara Quell's voice, naming the
Straits, the Compact and the Assembly; a compendium page with a schematic map drawn in
the SVG style already used for portraits.

## 7. No-social positioning does not kill virality

**Why it is risky.** No leaderboards, no comments, no friends. Growth rests on the
share card (PNG and the text with the five-row strip), the daily OG image, and other
people's channels. Wordle spread on an emoji grid in group chats, which we have; it also
spread on a shared score to beat, which we do not.

**Leading indicator.** Share rate = count(`share`) ÷ count(`run_end`) under 10%;
`share.method` dominated by `downloaded` (the native sheet is failing on mobile);
`daily_played` flat from Day 7 to Day 13 with no posts in between.

**Test.** By Day 13: share rate ≥ 15% overall and ≥ 25% for Daily runs; `shared` (the
native sheet) is the most common method on mobile; the 7-day mean of `daily_played`
from Day 7 to Day 13 rises ≥ 10% with no new channel posts in that window (organic
growth; group-chat traffic appears as "direct" in Plausible, so referrers cannot be
used). Protocol P: after the ending, ≥ 6/12 share or copy without being asked.

**Fallback.** Make the strip the ending screen's hero, above the ending text. A seed
deep link (`?seed=`) so "play the same crisis I did" is one tap — a new small feature,
Endless only. Weekly aggregate post ("38% of you reached Midnight this week") as a
community artefact without any user-to-user feature. If none of this moves share rate
past 10%, accept that growth is paid-for through outreach and plan spend accordingly.

## 8. Content authoring at 300+ cards keeps quality

**Why it is risky.** Four arcs exist (96 cards); the plan is ten arcs, domestic and
advisor cards, five flashpoint sequences and 40+ endings, all in one voice, by one or
a few writers under time pressure. The validator checks structure, not prose. Weak
cards dilute the deck; the content-gap fallback repeats cards when the deck is thin;
a card that does nothing teaches players to stop reading.

**Leading indicator.** Sim "weakest cards" list with many entries seen in ≥ 1% of runs;
repeats within a run; testers skimming (card dwell under four seconds); "I've seen this
card" comments.

**Test.** Day −3 and Day 8: sim weakest-card list reviewed; every card in the bottom
5% by impact is rewritten or cut before the next deploy; repeated cards occur in under
2% of simulated runs (add the count to the report if it is not there). Read-aloud pass
on 40 sampled cards: a second person guesses the speaker from the text alone and is
right ≥ 70% of the time. Protocol P: each tester names "the card you would cut"; any card
named three times is rewritten.

**Fallback.** Ship fewer: eight arcs at launch rather than ten, 220 cards that all pull.
Raise entry weights on the strongest arcs so thin ones appear less. Editorial pass by
someone who has not written any of it. Keep the deck hot-reloadable so rewrites land
daily without a release.

## 9. The balance targets hold for humans as well as bots

**Why it is risky.** Every target (median survival 28–45 days, no ending above 30%,
pick band, pair deltas, perfect-run rate 0–8%) is measured on the heuristic bot. The bot
reads previews and tags; humans read prose, get attached to advisors, and refuse
choices the bot takes. Humans could die at day 15 (too punishing for a daily habit) or
coast to day 50 (no tension).

**Leading indicator.** `run_end.days` median outside 28–45 for humans; `run_end.kind`
with nuclear above 50% or stand-down above 12%; a single ending above 30% of
`run_end.ending`; per-seat medians diverging by more than 10 days.

**Test.** By Day 13 with n ≥ 2,000 `run_end` at difficulty 5: human median `days` in
28–45; top ending ≤ 30%; nuclear share ≤ 45%; stand-down 2–10%; every seat's median
within 8 days of the others. Compare the human distribution with
`sim-output/report-latest.json` from the same content version.

**Fallback.** Tuning without code: `rules.yaml` `effect_scale` per act and the DEFCON 5
row; act card counts; arc entry weights. Content: the flashpoint terminal cards' swing
(±12..±30). If humans are far from the bot, retune the heuristic policy to imitate the
observed human left/right rates per tag so the simulator predicts humans better next
time, and rerun the targets.

## 10. PWA install and offline matter

**Why it is risky.** Engineering went into the service worker, the 250 KB budget and the
manifest. If nobody installs, the Daily habit rests on bookmarks and the OG image, and
iOS buries "Add to Home Screen". Offline play only matters if people play where there is
no signal; that is plausible for a 15-minute crisis on a commute and unproven.

**Leading indicator.** No way to know today: neither the install prompt nor
standalone mode is in the events.

**Test.** Add one boolean, `standalone`, to `run_start` and `daily_played`, from
`matchMedia('(display-mode: standalone)')` — a context fact, no identifier. By Day 13:
≥ 10% of `daily_played` from standalone; and, once `days_since_first_run` exists
(LAUNCH.md §7.2), day-7 return for standalone plays ≥ 2 × that of browser plays. If the
share is under 3%, installs are not happening; if the return ratio is under 1.2, they
are not helping.

**Fallback.** Stop polishing the PWA; keep the service worker for speed only. Spend the
effort on the Steam and desktop build, and on the Capacitor groundwork for stores where
"install" is the default. Add an install hint on the Daily card after a three-day
streak; if that lifts standalone above 10% in a week, keep it; otherwise leave the PWA
as a quiet feature for the people who find it.
