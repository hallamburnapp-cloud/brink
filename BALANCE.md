# BALANCE.md — simulator targets and iterations

The headless simulator (`npm run sim`) plays complete runs with three bot policies
through the real engine and the real content:

| Policy | Behaviour |
| --- | --- |
| random | Uniform choices; lets 30% of timers expire; picks pieces at random |
| greedy | Keeps the most endangered visible meter furthest from its edge; ignores hidden costs; 10% expiry |
| heuristic | Plays like a careful human with only visible information: avoids edges, de-escalates above 60, values odds by probability, spends Hotline charges, buries dead cards, builds around shared tags; 5% expiry |

Each iteration runs 20,000 runs per policy (60,000 total) across all three seats at
DEFCON 5 with a fixed seed base, so two iterations differ only by the content and
rules changed between them.

## Targets (brinkmanship scaling)

| # | Target | Why |
| --- | --- | --- |
| T1 | Heuristic bot wins 5–12% of runs at DEFCON 5 | Winning (reaching a run-end ending) must be earned, not routine |
| T2 | ≥ 10 archetypes reach the Endgame ≥ 10% of the time (runs where the archetype was assembled by act 3) | Every build must be playable, not just the best one |
| T3 | No single piece in more than 35% of winning builds | No mandatory pick |
| T4 | Median heuristic run 15–25 estimated minutes (cards × 11 s + rolls × 4 s + shops × 30 s + accidents × 3 s) | The run length the daily habit needs |
| T5 | ≥ 3% of heuristic runs reach a score ≥ 100 × the final target (700,000 at DEFCON 5) | "Broke the game" runs must exist |

Secondary readouts: every card reachable, piece buy rates 15–60% when offered, combos with
a ≥ 10-point win-rate difference, ending distribution, act reached, ante met/missed/smashed
per act, accident rate and severity, capital earned and spent, orders used, score
distribution (median, p90, p99, max), timer expiry and near-miss rates, per-seat tables,
per-card impact (used for the weakest-card list) and weakest pieces.

## Method

1. `npm run content:validate` must be clean (errors) before a run counts.
2. `npm run sim -- --runs 20000 --policy all --seed iterN` → `sim-output/report-latest.md`.
3. Read the Targets table first, then the ending distribution, then pick rates and combos.
4. Change the smallest number of things that plausibly move the failing target; log the
   hypothesis before running again.
5. Never tune by editing the simulator's policies to fit the content.

## Iterations

_At least eight, logged below as they run. Each entry: what the report said, what changed and why, what the next report said._

### Iteration 0 — first read (partial deck, no endings yet; 600 heuristic runs, `BRINK_SIM_LENIENT=1`)

Content at this point: 316 cards (10 arcs + 5 flashpoints + bluffs), 64 pieces, 17 scaling endings; the pressure, domestic,
alliance and advisor decks and the story endings were still being authored, so nuclear endings show as `fallback_nuclear`.

| Measure | Value |
| --- | --- |
| Heuristic win | 0% |
| Died in Week One / Two / Three / Four | 20.7% / 37.8% / 36.3% / 5.2% |
| Average peak escalation | 98.8 |
| Forced nuclear from flashpoints (intercept exchange, straits, midnight, blind) | 23.7% of runs |
| Antes met: act 1 / 2 / 3 | 99.8% / 25% / 21% |
| Pieces bought per run | 1.55 (capital earned 8.3) |

Diagnosis from traces (`scratchpad/probe-trace.ts`): the flashpoint decks were written to the old §5 numbers (±12..±30). The
Line at Sea sequence from a healthy state (escalation 27, meters ~45) has **no survivable path**: the firm sides add
+12/+14/+18/+24 escalation plus failure branches of +8..+20 (four cards take 17 → 100), and the restrained sides drain
military −14/−16/−16 and public −13/−12/−10, which is the officers' coup from 45. One in five runs died inside the
Week One flashpoint. The heuristic, which cannot look ahead, alternates between the two deaths.

### Iteration 1 — flashpoint and bluff swings rescaled

Change: every visible-meter effect on flashpoint cards (`content/cards/fp_*.yaml`) scaled ×0.5 for the four office meters
and ×0.6 for escalation, odds outcomes included; bluff cards ×0.7. Magnitudes ≥ 30 (the forced-ending cards) kept, since
the ending fires regardless. 519 values changed (`scratchpad/rescale.py`). CONTENT.md §5 now says flashpoint ±8..±16.
The engine's act/difficulty cost scaling (×1.1..×1.5) still makes late flashpoints bite harder.

| Measure | Before | After |
| --- | --- | --- |
| Died in Week One | 20.7% | 3.8% |
| Reached Week Three or later | 41.5% | 75.2% |
| Reached Endgame | 0% | 1.8% |
| Heuristic win | 0% | 0% |
| Median estimated minutes | 9.0 | 12.2 |
| Median score | 2,481 | 3,202 |
| Average peak escalation | 98.8 | 97.3 |
| Top nuclear causes | fallback 41%, intercept exchange 14% | fallback 22%, bluff called ×2 17%, rogue commander 14%, false alarm 10.5% |

Next: runs now die in Weeks Three and Four at the top of the curve, mostly to accidents and to the second called bluff.
Both are the loop working as designed against a bot that does not de-escalate hard enough and a deck that is still
missing its 130 calm cards; hold further changes until the full deck validates, then re-read escalation drift and the
accident curve.

### Iteration 2 — the economy and the ante ladder (pressure, domestic, alliance and advisor decks now in: 450 cards)

Read (`scratchpad/probe-antes.ts`, 300 heuristic runs): leverage banked per act against the targets.

| Act | Target | Heuristic leverage p25 / median / p75 | Met |
| --- | --- | --- | --- |
| 1 | 250 | 273 / 299 / 333 | 94% |
| 2 | 900 | 378 / 473 / 635 | 13% |
| 3 | 2,500 | 804 / 1,373 / 2,257 | 18% |
| 4 | 7,000 | 868 / 1,445 / 2,057 | 3% |

Capital earned per run: median 7 → one piece per run. A missed ante paid nothing, so a build that missed Week Two never
formed and missed everything after it: a death spiral with no way back, which is not the Balatro loop (there, money
keeps coming while you are alive).

Changes:
- **Act stipend**: 2 PC at the start of every act after the first (`ACT_STIPEND`, engine).
- **Consolation**: a missed ante still pays 2 PC when at least half the target was banked (`CONSOLATION`, `CONSOLATION_RATIO`).
- **Targets** 250 / 900 / 2,500 / 7,000 / 20,000 → **250 / 500 / 1,600 / 4,500 / 12,000**. Week Two is now met by a
  median calm run with one piece; Week Three needs a build or a climb to ~60; Week Four needs a brink posture or a strong
  build; the Endgame needs both. The final target sets the "broke the game" line: 100 × 12,000 = 1,200,000.
- **Bot calibration** (logged, not content): the heuristic prices escalation above 60 quadratically (/8 instead of /20),
  treats 80 as its wall unless it holds a brink piece, and stops being paid for leverage as it nears that wall. Before
  this it traded +10 escalation at 71 for a leverage credit under ante pressure and climbed to 100 chasing an ante it had
  already met. It also weighs the expected escalation of an odds roll (p × success + (1 − p) × failure) from the card
  definition, as a veteran would.

| Measure | Iter 1 | Iter 2 |
| --- | --- | --- |
| Capital earned per run (median) | 7 | 16 |
| Pieces bought per run | 1.55 | 2.49 |
| Antes met: Week Two / Three / Four | 25% / 21% / 0% | 47% / 33% / 13% |
| Reached Week Four or later | 23.6% | 35% |
| Heuristic win | 0% | 0.17% |
| Median estimated minutes | 12.2 | 13.2 |

### Iteration 3 — where the escalation comes from

Attribution over 300 heuristic runs (`scratchpad/probe-attrib.ts`), escalation gained per run by source:
ordinary choices +25.7 · flashpoint choices +19.6 · accidents +11.9 · flashpoint odds outcomes +10.5 · ordinary odds
outcomes +7.6 = **+75 per run** from a start of 20, over 53 cards. The deck's calm-side drift is −1.26 per card, so the
climb is chosen under pressure from the other four meters, which is the game; but flashpoints (11 cards of 53) supplied
40% of it and accidents another 16%, and both arrive when escalation is already high.

Changes: flashpoint escalation climbs ×0.75 (71 values; de-escalating sides untouched; ≥ 30 kept); accident base
escalation 7/5/9/5 → 5/4/7/4 (severity still ×1 → ×2 from 50 to 100).

| Measure | Iter 2 | Iter 3 |
| --- | --- | --- |
| Escalation per run: flashpoint choice / odds / accident | 19.6 / 10.5 / 11.9 | 18.1 / 10.0 / 9.6 (over 11.5 flashpoint cards instead of 10.6: runs live longer) |
| Cards per run | 52.9 | 56.3 |
| Reached Week Four or later | 35% | 45.3% |
| Heuristic win | 0.17% | 0.33% |
| Average peak escalation | 96.4 | 93.8 |
| Median estimated minutes | 13.2 | 14.0 |

Still to explain before the full-scale runs: `special_resigned` at 8% (the advisor resignation card fires far more often
than a weight-0.5 card should), and the calm build's inability to hold 60: the office meters push it up the ladder.

Resolved: the resignation card's "Sign it" side has no printed cost, so the bot signed; the heuristic now treats any
choice that forces a losing ending as a hard avoid (a veteran knows what the letter is).

### Iteration 4 — first full-scale run (20,000 × 3 policies, `--seed iter4`), then cooling and the economy

Full deck validated (450 cards, 80 endings). Full-scale read: **T1 0.57%** (85% nuclear), T2 0 of 15 archetypes,
T3 dove_fm in 83% of the 114 winning builds, T4 13.9 min, T5 0% (max score 53,421). Greedy dies of the office meters
(3.7% nuclear, 0.03% win); random 65% nuclear.

Deck drift per ordinary card at random play (`scratchpad/probe-meters.ts`): public −0.58, military −0.28, allies −0.18,
economy −0.57, escalation +1.05. Economy is touched by 26% of cards and its *best* side averages +0.08: it only goes down.
Over ~70 ordinary cards a neutral player loses ~40 public, ~40 economy and gains ~73 escalation; protecting the office
meters means taking the escalatory side, which is how a calm build ends at 100.

Changes:
- **Cooling** (new act knob, `cooling: 0.5` on every act in rules.yaml, `COOLING_FLOOR` 25): each ordinary card cools
  escalation by 0.5 expected while it is above 25. A crisis nobody feeds cools; the ladder must be climbed on purpose,
  which is the design. Flashpoint and bluff cards never cool. Endless acts inherit it.
- **Economy** costs on ordinary cards ×0.7 (120 values); economy drift −0.57 → −0.35 per card.

| Measure (600 heuristic runs) | Iter 3 | Iter 4 |
| --- | --- | --- |
| Heuristic win | 0.33% | 2.17% |
| Reached Endgame | 3.5% | 10% (+2.2% into endless) |
| Median estimated minutes | 14.0 | 15.7 |
| Capital earned (median) | 16 | 19 |
| Antes met: Week Two / Three / Four / Endgame | 47% / 33% / 13% / 0% | 35% / 19% / 18% / 2% |

Cooling lowers the escalation multiplier of calm play, so the antes slipped: Week Three's median bank is 960 against 1,600.

### Iteration 5 — the ante ladder against the cooled pace

Targets 250 / 500 / 1,600 / 4,500 / 12,000 → **250 / 450 / 1,200 / 3,200 / 7,000**. Intent by act: Week Two met by a
calm median run; Week Three by a calm run with two pieces or a warm one; Week Four by a build or a brink posture; the
Endgame only by both (a brink build at 90 with ×2 from pieces banks ~5,000 in 10 cards, so 7,000 stays the wall that
separates good builds from great ones). Final target 7,000 → the "broke the game" line is 700,000.

Full-scale (`--seed iter5`, 20,000 × 3): **T4 PASS** (15.8 min, p10 8.9, p90 20.6). T1 2.38%. T2 6 of 15 (accident_farmer
20%, alliance_engine 21%, peace_movement 14%, intel_machine 11%, red_lines_gambler 28%, sea_power 11% reach the
Endgame; nine archetypes assembled in ≥ 20 runs). T3 dove_fm 57%, civil_defence 36%, allied_basing 35%. T5 0% (max 78,881).
Antes met: 94% / 47% / 42% / 25% / 10% by act, which is the ladder we wanted. Deaths: 84% nuclear (bluff called ×2 17%,
accidents 29%, story flashpoint endings 25%), 14% removed (mostly public 0). 45% of runs die in Week Four.

### Iteration 6 — attrition

Traces of Week Four deaths (`scratchpad/probe-run.ts`): escalation 70–80, but public 9–16, military 9–20, allies 5–35,
economy 13–21. The runs were not climbing; they were bleeding. The deck is negative-sum on all four office meters and
the act cost scaling (×1.35 in Week Four, ×1.5 in the Endgame) multiplied the bleed exactly when the meters were lowest,
so the bot was cornered into whichever side did not kill it this card.

Changes:
- **Recovery** (new act knob, `recovery: 0.15`): each ordinary card drifts every office meter 0.15 expected toward 50.
  Opinion regresses, markets recover, alliances persist. Endless acts inherit it.
- **Act cost scaling** 1.00 / 1.10 / 1.20 / 1.35 / 1.50 → **1.00 / 1.08 / 1.16 / 1.28 / 1.40**.

Probes (1,000 heuristic runs each) while choosing the pair:

| Recovery | Scaling | Heuristic win | Median min |
| --- | --- | --- | --- |
| 0 | 1.05 / 1.12 / 1.20 / 1.30 | 12.1% | 18.3 |
| 0.25 | 1.05 / 1.12 / 1.20 / 1.30 | 19.8% | 19.2 |
| 0.15 | 1.10 / 1.20 / 1.35 / 1.50 (old) | 4.2% | 17.0 |
| **0.15** | **1.08 / 1.16 / 1.28 / 1.40** | **9.6%** | **18.0** |

The scaling is the bigger lever; recovery is the gentler one. The chosen pair sits in the middle of T1 with room for the
full-scale run to land either side.

Full-scale (`--seed iter6`): **T1 PASS 9.76%** (0.27% stand-down, 9.49% survival), **T4 PASS 18.2 min** (p10 9.0, p90
22.5, 72 cards, 6.7 shops). T2 9 of 15 (10 assembled in ≥ 20 runs; hair_trigger at 8% is the miss; the_ladder, cyber_ghost,
deadman and madman are assembled in fewer than 5 runs each because their cores are legendary at 12 PC and the bot
almost never holds 12 PC). T3 dove_fm 41%, civil_defence 35.9%. T5 0% (max 141,473). Antes met 94 / 45 / 29 / 17 / 8%.

### Iteration 7 — builds and the endless

Diagnosis: legendaries were offered in ~6.5% of runs each and bought in 0–1% (price 12 against a median income of 22
spread over six shop visits); dove_fm (uncommon, +0.75 mult on de-escalation and stronger de-escalation) was the
calm build's mandatory pick; scaling pieces were capped at +2..+6 so no build could compound; the endless climb
(+30% per act) and its targets (×2.8 per act) meant every endless act was a missed ante and a flashpoint at the top of
the curve, so winners died within 1.2 endless acts and the score ceiling sat at 141k.

Changes:
- Prices 3 / 5 / 8 / 12 → **3 / 5 / 7 / 9**.
- **dove_fm is rare** (offered ~40% as often).
- Scale caps doubled (+3 → +6, +2 → +4, +6 → +12; mechanics text updated) so long runs compound.
- Endless: escalation curve **×2 per endless act** (was +30%), endless targets **×2 per act** (was ×2.8) so a build that is
  still scaling can keep meeting antes and earning capital; heuristic brink builds now aim for the band their piece is
  paid from (Madman wants ≥ 90).

Probe (2,000 heuristic runs): T1 7.35%, T4 18.0 min, max score 93k → 234k after the endless changes; endless survival
still 1.24 acts on average (the endless flashpoint at the top of the curve is what kills). T5 remains 0%: a run needs
~700,000, which is a perfect build (Σmult +6, Madman ×3, a retrigger, held at 92 for 40 cards with accident mitigation
= ~11k per card). That build exists in the engine and a strong human can assemble it; the heuristic does not.

Full-scale (`--seed iter7`): T1 PASS 7.48%, T4 PASS 18.0 min; T2 9 of 15 (hair_trigger 6%, shield_wall 8% short;
madman/deadman/the_ladder/cyber_ghost still assembled in fewer than 3 runs); T3 civil_defence 44%, early_warning 40%,
paranoid_intel 36% (the accident-farming build had become the mandatory way to survive the top of the curve); **T5 3 runs
≥ 700,000 (0.02%), max 985,709** — the game can be broken, once the endless climb compounds.

### Iteration 8 — the mandatory picks

Changes: civil_defence and early_warning **uncommon** (they were commons in every shop); legendary offer weight 0.8 →
**1.2** and price 9 → **8** so a run sees a legendary it can afford about once.

Full-scale (`--seed iter8`, 20,000 × 3 = 60,000 runs, 190 s):

| Target | Result | Value |
| --- | --- | --- |
| T1 heuristic win 5–12% | **PASS** | 6.66% (0.09% stand-down, 6.57% survival) |
| T2 ≥ 10 archetypes reach the Endgame ≥ 10% | **PASS** | 11 of 15 (war_economy 27%, alliance_engine 30%, peace_movement 21%, accident_farmer 35%, intel_machine 30%, red_lines_gambler 44%, ledger 29%, sea_power 20%, quiet_diplomat 38%, hair_trigger 11%, shield_wall 28%); deadman, cyber_ghost, the_ladder and madman are assembled in 6–9 runs each, too few to count |
| T3 no piece in > 35% of winning builds | **PASS** | top allied_basing 22.9%, alliance_first 22.8%, paranoid_intel 21.8%, civil_defence 18.8% |
| T4 median 15–25 estimated minutes | **PASS** | 17.85 (p10 9.0, p90 22.2; 69.6 cards, 6.5 shops) |
| T5 ≥ 3% of runs score ≥ 100 × final target | **FAIL** | 0.03% (5 runs ≥ 700,000; max 1,449,326; p99 36,531) |

Antes met by act: 94% / 46% / 30% / 15% / 6.5%; endless acts 8% / 13%. Deaths: 83% nuclear (bluff called ×2 is the
single largest cause), 10% removed. Pieces bought 2.5 per run, orders 0.7.

**On T5.** The ceiling is real: five heuristic runs broke the game and the best scored 1.45 million, so the compounding
exists (scale caps, Madman's ×3 from 90, retriggers, the ×2 endless climb). The heuristic reaches it in 0.03% of runs
because it is a survival bot: it holds a band and de-escalates on threat, and it does not deliberately farm the top of
the curve for 40 cards with Perfect Intel and a Veto in hand, which is what the 700,000 line asks for. Three honest
routes remain and none was taken tonight: (1) an aggressive "break it" bot as a fourth policy, so T5 measures the
build rather than the heuristic's temperament; (2) stronger compounding on the legendaries (Brinkmanship uncapped,
The Button ×4, retrigger-all on Open Line), which lifts every human's ceiling but also the bot's variance in the other
four targets; (3) a lower final ante, which would make the Endgame trivial. Route (1) is recommended and is written up
in RISKS.md and SUMMARY.md as the first post-launch balance task.

### Iteration 9 — the rewrites applied

The 15 card rewrites and 5 piece rewrites from the final report below were applied (plus `adv_01` loosened to
`pieces_any` and the new closer `defector_23_nothing_crossed` for the doubted defector path). Full-scale
(`--seed iter9`): **T1 PASS 6.82%**, **T2 PASS 10 of 15**, **T3 PASS** (top paranoid_intel 24.3%), **T4 PASS 17.9 min**,
T5 0% (max 533,791). The new weakest-piece list is predelegation, commercial_sat, open_line, quiet_room, dockyards
(all within ±2.5pp of neutral, none a mandatory pick); the new weakest-card list is led by the new closer and the
rewritten defector cards, which now have visible stakes but are still the quiet end of the deck. Two cards were never
seen in 60,000 runs (`adv_27_no_hard_feelings`, `debris_17_eleven_seconds`): both gates need a specific pair; loosen
in the next content pass.

## Final report (iteration 8, rewrites since applied in iteration 9)

The report is `sim-output/report-latest.md` (regenerate with `npm run sim -- --runs 20000 --policy all --seed iter8`).
The tables below are lifted from it.

### The 15 weakest cards, with rewrites

The simulator's impact score (mean visible-meter swing per play + mean gap between the two previews) undervalues cards
whose stakes are hidden values, and it flags breather cards that exist for pacing. The rewrites below keep each card's
job and give it visible teeth; where the two sides were near-identical they now diverge. **Applied in iteration 9.**

| # | Card | Seen | Left % | Impact | Problem | Proposed rewrite |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `defector_01_the_ferry` | 7,358 | 96% | 4.2 | Both sides set `defector:arrived` and queue Lantern with ±1..±3 effects; the choice is cosmetic | Left "Fly him in tonight": `intel: 4, trust_primary: -4, public: -2`, set `defector:flown`, Lantern in 1. Right "Leave him on Caldor. Send a team.": `intel: -2, military: -3, allies: 2` plus odds "The passengers are counted" 0.6 (intel): success `intel: 4`; failure `public: -4, trust_primary: -3`, follow `defector_16_six_oclock` |
| 2 | `defector_02_the_embassy_gate` | 4,004 | 68% | 5.1 | Same shape as 01; extraction and patience cost the same | Left: `intel: 5, trust_secondary: -6, allies: -3` (Amberline notices the car). Right: `intel: 2, trust_secondary: 2, military: -3, trust_primary: -3, escalation: -1`, Lantern in 4, set `defector:slow` |
| 3 | `defector_15_the_winter_colonel` | 2,611 | 84% | 6.0 | The lunch is all hidden values; nothing visible is at stake | Failure adds `public: -4, allies: -3` (the formal question is leaked). Right "No lunches": `military: 2, commitment: 4, intel: -3` |
| 4 | `press_04_three_twenty` | 8,338 | 99.6% | 6.0 | Breather; the "sleep" side is strictly right (99.6%) | Left: `intel: -4, escalation: -2, public: 2`. Right: `intel: 3, escalation: 2, public: -2` (you look like this on camera at six) |
| 5 | `press_24_the_birthday` | 3,968 | 99.4% | 7.1 | As 4 | Left: `intel: -3, escalation: -2, public: 3`. Right: `intel: 2, escalation: 2, public: -3` (the empty chair is photographed) |
| 6 | `press_14_the_hospital` | 4,182 | 98.2% | 7.1 | As 4 | Left: `intel: -4, military: -2, public: 4`. Right: `intel: 3, escalation: 1, public: -3` |
| 7 | `press_18_the_rumour` | 4,761 | 84% | 8.0 | 50/50 roll for ±2..±5 hidden points | Success `intel: 6, trust_primary: -2, military: 2`; failure `intel: -3, trust_primary: -6, escalation: 3`. Right (let it lie): `intel: -4, trust_primary: 2, public: -2` (it prints anyway) |
| 8 | `dom_fed_01_two_bulletins` | 2,718 | 57% | 9.0 | Symmetric ±3 | Queue: `public: -5, economy: 2, trust_primary: -3, commitment: 2`. Harvest: `public: 4, intel: -3, economy: -2, commitment: 2` |
| 9 | `dom_fed_11_three_hundred_names` | 1,475 | 28% | 9.0 | Charging the students looks free; releasing them costs military | Release: `public: 4, military: -5, trust_primary: 3, trust_secondary: 2, escalation: -2`. Charge: `public: -3, military: 3, trust_primary: -4, trust_secondary: -4, intel: -2` (the list leaks; the square fills) |
| 10 | `blackout_03_eleven_hours` | 2,005 | 92% | 9.5 | Act 3–5 entry with act-1 numbers | Left: `public: 4, intel: -5, military: -3, commitment: -3`. Right: `public: 3, escalation: 6, military: 3, commitment: 6, trust_primary: -5` |
| 11 | `proxy_05_no_insignia` | 7,724 | 95% | 9.5 | Denial is strictly worse tonight *and* later | Deny: `public: 2, intel: -2, trust_primary: -2, commitment: 4` (it holds tonight; the 70% follow carries the bill). Admit: `public: -4, commitment: 6, allies: 3, trust_primary: -2, escalation: 2` |
| 12 | `dom_fed_03_accreditation` | 2,694 | 71% | 9.9 | Small, symmetric | Interview: `public: -3, trust_primary: 4, trust_secondary: 3, allies: 2, intel: 1`. Pull it: `public: 3, trust_primary: -5, allies: -4, intel: -2, economy: -1` |
| 13 | `dom_coa_07_the_drills` | 1,424 | 91% | 11.0 | Breather, one-sided | Left: `public: 4, intel: -3, military: -2`. Right: `public: -3, intel: 2, escalation: 1` |
| 14 | `defector_19_the_guest` | 1,187 | 34% | 11.5 | The doubted path's only card and it leads nowhere (the review's "doubted path has no ending") | Right "Take his phone": `intel: 3, public: -3, commitment: 2`, set `defector:held`, follow a new closer `defector_23_nothing_crossed` (aide, acts 3–5: the nineteenth passes; Lyle was right or the plan was never for the Straits; `intel: 4, public: 2` / `military: -3, trust_primary: 3`) |
| 15 | `defector_13_seventy_two_hours` | 2,085 | 98% | 11.7 | Detention never chosen | Detain: `public: -2, intel: 5, allies: -2, military: 2`. Register him: `public: 3, intel: -4, trust_primary: -4, commitment: 3` with the existing 60% follow |

Also flagged: `adv_01_a_senior_defence_source` was never seen by any policy in 60,000 runs (its `pieces_all` gate
needs two specific advisors); loosen to `pieces_any` or attach it to the hawk alone.

### The 5 weakest pieces, with rewrites

Ranked by the lowest combined rank of buy rate and |Δ win| (pieces nobody wants, or that change nothing). **Applied in iteration 9.**

| # | Piece | Rarity | Buy rate | Held runs | Δ win | Problem | Proposed rewrite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `missile_defence` | uncommon | 0.5% | 59 | +0.1 | A permanent trust drift (−1 per 5 cards) for +0.5 mult on tags that appear on ~8% of cards | Drop the drift to `-0.1`; make the Layer scale: `{ kind: scale, on: roll_success, tags: [intercept], mult_add: 0.4, max: 4 }`; keep the +20% intercept odds |
| 2 | `quiet_room` | rare | 2.5% | 130 | −0.5 | ×1.6 on `back_channel` only; back-channel choices are ~3% of the deck, so the room is usually empty | Widen to `[back_channel, diplomacy]` at ×1.4 and add `+8 base` on the same tags; the trust ×1.2 stays |
| 3 | `deterrence_by_denial` | uncommon | 0.5% | 60 | −1.7 | Two drifts' worth of trust for a mult on rare tags; the `deterrence` rule makes rivals dig in | Make the drift conditional: `when: { values: { escalation: { min: 60 } } }`; add `{ kind: leverage, tags: [deterrence], mult_add: 0.3 }` and `{ kind: accident, severity_mult: 0.85 }` (denial buys minutes) |
| 4 | `cyber_director` | uncommon | 0.17% | 21 | −1.9 | Core of cyber_ghost (assembled 8 times in 20,000 runs); +6 base / +0.4 mult on cyber, attribution, space, but nothing that keeps a run alive | Add `{ kind: accident, mult: 0.85 }` (attribution errors are her job) and `{ kind: rule, rule: capital_per_act, value: 1 }` (the unit bills); raise the odds bonus to +0.2 |
| 5 | `commercial_sat` | common | 0.69% | 134 | −2.2 | +2 escalation on every space choice cancels its own +6 base; the economy drift (+0.15) is invisible | Remove the escalation add; make it `{ kind: effect, key: economy, tags: [space], sign: pos, add: 2 }` and lift the capital rule to 2 per act; it becomes the economy piece of the space arcs |

### Other reads from the final report

- **Strongest pairs** (Δ win vs runs holding neither): admiral + dove_fm +45pp (113 runs), alliance_first + dove_fm
  +35pp, allied_basing + dove_fm +35pp, bunker + iron_nerve +29pp, civil_defence + hardened_nc3 +28pp, bunker +
  civil_defence +22pp (376 runs). dove_fm is now rare and sits in 16% of wins (was 83% in iteration 4).
- **hawk_general** is the anti-piece: held in 355 runs, 6 wins, Δ win −5pp, Δ nuclear +7pp. Intended (SYNERGIES.md
  "The General's War"), and the shop still sells him at 3% because he pays leverage.
- **Timer expiry** 5% of timed cards (heuristic), 30% (random). Near-miss rate 9.9% of rolls, as designed.
- **Deck coverage**: 449 of 450 cards seen; 1 never (adv_01).
