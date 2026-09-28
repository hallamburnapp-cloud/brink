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

## Targets

| # | Target | Why |
| --- | --- | --- |
| T1 | Heuristic median survival 28–45 days | A careful player should usually see Week Four; nobody should coast to the end |
| T2 | No ending above 30% of outcomes | Variety of failure is the replay loop |
| T3 | Every card reachable (never-seen list empty across policies) | Dead content is wasted content |
| T4 | Every piece picked 15–60% of the time when offered (heuristic) | No auto-picks, no dead picks |
| T5 | ≥ 12 piece pairs with a stand-down rate ≥ 10 points from baseline | Builds must change the ending profile, not just the numbers |
| T6 | Heuristic stand-down ("perfect run") > 0% and < 8% | Possible, rare, earned |

Secondary readouts: act reached, cards per run, timer expiry rate, near-miss rate,
per-seat medians, piece pick rates, and per-card impact scores (used for the weakest-card
list in the balance report).

## Method

1. `npm run content:validate` must be clean (errors) before a run counts.
2. `npm run sim -- --runs 20000 --policy all --seed iterN` → `sim-output/report-latest.md`.
3. Read the Targets table first, then the ending distribution, then pick rates and combos.
4. Change the smallest number of things that plausibly move the failing target; log the
   hypothesis before running again.
5. Never tune by editing the simulator's policies to fit the content.

## Iterations

_Logged below as they run. Each entry: what the report said, what changed and why, what the next report said._
