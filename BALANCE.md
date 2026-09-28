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
