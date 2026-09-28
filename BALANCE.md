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
| T5 | ≥ 3% of heuristic runs reach a score ≥ 100 × the final target (2,000,000 at DEFCON 5) | "Broke the game" runs must exist |

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
