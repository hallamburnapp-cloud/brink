# Simulator report: the night slice

**What this means for you.** Your choices matter: the best move on a deal is usually about 8 times an
ordinary one, no single shape is the answer much more than 30% of the time, and tapping at random
clears the first crisis only 1 time in 10. Good play without staff falls before midnight, while hiring
sensible staff holds the whole night 99% of the time, so the slice can be learned and won, and the real
test of a build begins after 01:00.

All five simulator gates pass. The TypeScript bots and engine play the same game as the Python
reference sweep for sweep, and no engine bug was found. One gate (no pattern best in more than 30% of
deals) sits exactly on its line in the reference design itself; see [Gate 2](#gate-2-sits-on-its-line).

Run: `npx tsx tools/war-sim.ts --runs 1000 --full-runs 200 --crosscheck 100` (seed `war-sim`, 9 min on
3 processes, plus about 2 min for the cross-check).

## The five gates (spec section 14)

| # | Gate | Needs | This sim | Reference | |
| - | --- | --- | --- | --- | --- |
| 1 | Best legal play is at least 3x the median play, share of fresh deals | 90% or more | **96.0%** (40,000 deals) | 96% | PASS |
| 2 | No pattern is the best play in more than 30% of deals | 30% or less | **29.8%**, Chain (40,000 deals) | 29% | PASS |
| 3 | Random tapper clears the 22:00 Flare-up (300) | 15% or less | **10.0%** (1,000 crises) | 9% | PASS |
| 4 | Greedy, no staff: 22:00 Flare-up (300) | 95% or more | **100.0%** (1,000) | 100% | PASS |
|   | Greedy, no staff: 00:00 Flare-up (2,500) | 15% or less | **7.2%** (1,000) | 7% | |
| 5 | Greedy with Duty Officer + Hotline Operator: 00:00 Flare-up (2,500) | 90% or more | **98.9%** (1,000) | 99% | PASS |

The vitest version (`npx vitest run src/war/sim`, about 15 s) checks the same five gates on 150 crises
per row and 600 deals, allowing two standard errors of slack for that smaller sample.

## Calibration (spec section 7)

The greedy bot plays one crisis from a fresh map: no Airlift, no carried-over traffic, Playbooks,
stamps or brass, staff seated in the order shown. "Spec" is the figure printed in the spec; "Reference"
is the run it was rounded from (200 crises a row, about +/-7 points at 95%). Because that is so coarse,
the same reference loop was re-run at 1,000 crises a row (`src/war/sim/reference-rerun.py`). "Gap" is
this sim minus that re-run. No gap is beyond sampling noise (two standard errors).

| Staff | Twist | Target | Spec | Reference | Ref re-run | This sim | Median total | Gap |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| No staff | | 300 | 100% | 100.0% (200) | 100.0% (1,000) | 100.0% (1,000) | 420 | +0.0 |
| No staff | | 450 | 100% | 100.0% (200) | 99.8% | 99.8% | 600 | +0.0 |
| No staff | | 600 | 98% | 98.0% (200) | 97.7% | 97.8% | 730 | +0.1 |
| No staff | | 900 | 90% | 90.0% (200) | 93.0% | 93.3% | 1,012 | +0.3 |
| No staff | | 1,350 | 71% | 71.0% (200) | 72.9% | 71.5% | 1,437 | -1.4 |
| No staff | | 1,800 | 34% | 34.0% (200) | 38.0% | 38.7% | 1,664 | +0.7 |
| No staff | | 2,500 | 7% | 7.0% (200) | 8.0% | 7.2% | 1,546 | -0.8 |
| No staff | Gridlock | 600 | 84% | 83.5% (200) | 83.3% | 84.4% | 677 | +1.1 |
| Duty Officer | | 1,800 | 92% | 92.0% (200) | 90.1% | 88.5% | 2,010 | -1.6 |
| Duty Officer | | 2,500 | 50% | 49.5% (200) | 56.7% | 56.5% | 2,558 | -0.2 |
| Duty Officer | | 3,750 | 10% | 10.0% (200) | 11.7% | 10.9% | 2,624 | -0.8 |
| Duty + Hotline | | 2,500 | 99% | 99.0% (200) | 98.4% | 98.9% | 3,008 | +0.5 |
| Duty + Hotline | | 3,750 | 83% | 83.0% (200) | 85.6% | 84.6% | 4,115 | -1.0 |
| Duty + Hotline | | 5,000 | 59% | 58.5% (200) | 59.4% | 59.3% | 5,147 | -0.1 |
| Duty + Hotline | Blackout | 1,800 | 100% | 100.0% (200) | 99.4% | 99.9% | 2,228 | +0.5 |
| Hotline, Duty, Strategist | | 3,750 | 97% | 96.5% (200) | 96.6% | 97.6% | 4,521 | +1.0 |
| Hotline, Duty, Strategist | | 5,000 | 93% | 92.5% (200) | 92.0% | 92.2% | 5,898 | +0.2 |
| Hotline, Duty, Strategist | Full Table | 5,000 | 92% | 91.5% (200) | 91.2% | 93.0% | 5,864 | +1.8 |
| Hotline, Duty, Strategist | | 9,000 | 54% | 53.5% (200) | 57.9% | 60.1% | 9,272 | +2.2 |
| Random tapper | | 300 | 9% | 9.3% (2,000) | 9.3% (2,000) | 10.0% | 118 | +0.7 |

Three spec figures are off by more than a few points: Duty Officer at 2,500 (spec 50%, about 57% in
both the re-run and this sim), No staff at 1,800 (34% against about 38%) and three staff at 9,000 (54%
against 58-60%). In each case the reference itself gives the higher figure once it plays more crises,
so these are sampling noise in the spec's 200-crisis table, not a difference in the port. The spec
figures can be updated to the re-run's if anyone quotes them again.

## Choice spread (spec section 14)

Deal 8 random regions on the starting map (the first is the flashpoint), score every legal selection
of 1 to 5 of them with no staff (218 plays), and compare the best play with the median play.

| 40,000 fresh deals | This sim | Reference (4,000) |
| --- | --- | --- |
| Best play / median play | 8.4x (p10 3.5x, p90 16.2x) | 8.4x (p10 3.5x, p90 16.0x) |
| Best play at least 3x the median | 96.0% | 96.0% |
| Best play / best play of another pattern | 1.74x (p10 1.16x, p90 2.71x) | 1.74x (p10 1.17x, p90 2.72x) |
| Best play's leverage | 160 (p10 120, p90 588) | 162 (p10 120, p90 582) |

| Pattern | Can be made | Ref | Is the best play | Ref |
| --- | ---: | ---: | ---: | ---: |
| SINGLE | 100.0% | 100.0% | 0.1% | 0.1% |
| LINK | 99.2% | 99.4% | 1.3% | 1.1% |
| TWO LINKS | 77.6% | 77.6% | 7.2% | 7.5% |
| WORLDWIDE | 44.8% | 44.4% | 19.7% | 20.6% |
| CHAIN | 69.7% | 69.2% | **29.8%** | 29.2% |
| FRONT | 29.1% | 28.8% | 14.0% | 14.1% |
| SURROUND | 21.1% | 21.0% | 16.2% | 16.3% |
| NETWORK | 10.9% | 10.7% | 10.6% | 10.2% |
| BLOC | 1.1% | 1.1% | 1.1% | 1.1% |
| WHOLE BLOC | 0.0% | 0.0% | 0.0% | 0.0% |
| AROUND THE WORLD | 0.0% | 0.0% | 0.0% | 0.0% |

The best play is usually a Chain, Worldwide, Surround or Front, and the runner-up of a different shape
is a median 1.74x behind, so the shape you go for decides the sweep.

### Gate 2 sits on its line

Chain's share of best plays is 30.0%, give or take 0.1 point, which is exactly the gate's threshold:

| Sample | Chain is the best play |
| --- | --- |
| Reference, `final_spread.py 4000` (seed 1) | 29.2% (the spec's 29%) |
| Reference, unmodified, 40,000 deals, seed 2 | 30.0% |
| Reference, unmodified, 40,000 deals, seed 3 | 30.2% |
| This sim, 40,000 deals, seed `war-sim` (the run above) | 29.8% (11,933) |
| This sim, 40,000 deals, seed `spread40k` | 30.0% (12,013, which is 30.03%) |

The port scores every deal exactly as the reference does (see the cross-check below), so this is a
property of the design, not of the port: the spec's 29% was one 4,000-deal sample. The gate passes or
fails on the seed. Chain at 30% is not dominant in the sense the gate guards against (the runner-up is
Worldwide at 20%), so I read it as a pass, but it is the designer's call whether to accept "30% or
less" as met at 30.0%, raise the line slightly, or nudge Chain or Worldwide. No rule or number was
changed to pass it.

## How far each bot gets (full runs)

Full runs of the real slice through the engine: traffic, brass and Old Hand counts carry over, Summit
twists apply, payouts and Briefings are the real ones. Greedy plays every crisis as above and never
buys. Builder plays the same way and, in each Briefing, buys the staff that most raise its mean best
sweep on six sample deals of the current map, per Fund, selling its weakest seat when the table is
full and rerolling when it holds more than the ◆20 that earns full interest. Runs that hold the slice
carry on with KEEP GOING.

| Crisis | Target | Greedy, no buying (200 runs) | Builder (200 runs) |
| --- | ---: | ---: | ---: |
| 22:00 Flare-up | 300 | 100.0% | 100.0% |
| 22:00 Standoff | 450 | 99.5% | 100.0% |
| 22:00 Summit (Gridlock) | 600 | 80.0% | 100.0% |
| 23:00 Flare-up | 900 | 74.5% | 100.0% |
| 23:00 Standoff | 1,350 | 57.0% | 100.0% |
| 23:00 Summit (Blackout) | 1,800 | 21.0% | 100.0% |
| 00:00 Flare-up | 2,500 | 3.5% | 100.0% |
| 00:00 Standoff | 3,750 | 0.0% | 100.0% |
| 00:00 Summit (Full Table) | 5,000 | 0.0% | 99.0% |

| After the slice (KEEP GOING) | Summit target | Builder |
| --- | ---: | ---: |
| 01:00 | 12,000 | 77.0% |
| 02:00 | 26,400 | 49.0% |
| 03:00 | 58,080 | 24.5% |
| 04:00 | 127,776 | 14.5% |
| 05:00 | 281,107 | 10.5% |
| Overtime 06:00 | 618,435 | 4.5% |

- Greedy without staff clears 4.4 of 9 crises on average and never holds the night. Its best sweep is a
  median 711.
- Builder holds until 01:00 in 99% of runs, hiring about 13 staff and selling about 8 per run. Its best
  sweep is a median 21,797. It hires Harbourmaster, Governor, Hotline Operator, Quartermaster and Duty
  Officer most often (each about 1.2 times per run), then Ferry Master, Envoy and Strategist.
- The 29 runs that clear the 04:00 Summit are port engines: Deputy (in 25 of them), Admiral (23) and
  Ferry Master (22), usually with Herald and Signals Officer or with Courier and Strategist. Their best
  sweeps are a median 910,000 and reach 33 million.
- **Port dominance, the risk DESIGN.md names, shows up.** In the builder's final line-ups, Ferry Master
  sits in 72.5% of runs, Harbourmaster in 65%, Hotline Operator and Strategist in 52.5% each, Deputy in
  38.5% and Admiral in 36%. The design's target is no staff in more than 35% of winning builds, and
  almost every builder run wins the slice. This is one bot's taste, not players', and it is not one of
  the five gates, but it points the same way as the design's warning: Ferry Master (all 18 Ports
  joined) is the staff to watch.
- Read the builder as a strong player: it checks all 218 selections every sweep, which a person does
  with the readout and the CLEARS lamp rather than arithmetic. It buys staff only (no Orders or
  Playbooks), so the KEEP GOING figures are a floor for what full building can do. If the slice is
  meant to threaten a skilled player before 01:00, the 00:00 targets are the place to look.

## Is the port the same game as the reference? The cross-check

`--crosscheck N` plays N crises per row with the TypeScript bots, writes each crisis's deck order (the
opening pile and every reshuffle of the spent regions) and the random tapper's picks to JSON, and
replays them in the unmodified Python reference (`src/war/sim/crosscheck.py` drives
`docs/war/reference/crisis.py` with a stand-in for `random.Random` that hands out those orders). Every
committed sweep is compared: pins, pattern and leverage, then the result. Spread deals are compared
deal by deal (best play, its pattern, the median and the best other pattern).

| Rows replayed (100 crises each) | Identical |
| --- | --- |
| No staff at 900 and 2,500; Gridlock at 600 | 300 / 300 crises |
| Duty Officer at 2,500; Duty + Hotline at 5,000 and Blackout 1,800 | 300 / 300 |
| Hotline, Duty, Strategist at 9,000 and Full Table 5,000 | 200 / 200 |
| Random tapper at 300 | 100 / 100 |
| No staff at 900 with one free Airlift (crisis.py's `use_air`) | 100 / 100 |
| Choice spread | 400 / 400 deals |

In all, 3,379 sweeps matched. The Python calibration also agrees with this sim within noise on every
row above, as expected for two implementations that play identical deals identically.

**Engine bugs found: none.** One deliberate difference, already a documented engine ruling: when two
Surround rings tie on neighbour weight, the spec (section 3) scores the westmost ringed region and the
reference scores the last one in map order. Example: under Full Table, pins Marram, Iceward, Ashkettle,
Floe End and Saltwhite ring both Brindle Coast (10 + 4 + 6) and Hearth (10 + 7 + 3). The engine follows
the spec. The cross-check applies the spec's tie rule to the reference by default; with
`--reference-ties` it runs the reference's own rule, and the same 1,000 crises and 400 deals still all
match, so the ruling changes a sweep very rarely (it showed up once in a separate 20-crisis sample).

## Method

- **Engine, not a copy of it.** Every bot drives `src/war/engine` through its public actions
  (`newRun`, `pin`, `swap`, `sweep`, `useOrder`, the Briefing actions, `keepGoing`) and scores with
  `scorePins` / `scoreSelection`. Nothing about the rules is re-implemented in the simulator.
- **Greedy** (`src/war/sim/greedy.ts`) ports `play_crisis()` from `crisis.py`: it scores every subset of
  up to 5 lit pins (only the 5-pin ones under Full Table) in `itertools` order and keeps the first
  best; it swaps while best x sweeps left < 0.8 x the remaining target, sending the lit regions outside
  the best play's scoring set, lightest first, at most 5. The comparison is done in doubles, as the
  reference does, so borderline swaps match.
- **Random tapper** (`random-bot.ts`) ports `randbot.py`: 1 to 5 random lit pins per sweep, no swaps.
- **Choice spread** (`spread.ts`) ports `spread.py`, scoring with the real engine on a fresh map.
- **Calibration rows** (`calibration.ts`) follow `calib2.py`: one fresh run per crisis, the row's staff
  seated in its order, the Summit twist forced on (Blackout picks a colour per crisis).
- **Seeds.** The simulator uses the game's own RNG (`src/engine/rng.ts`), so its deals differ from the
  Python's and agreement is statistical. Crisis i of every row is dealt from seed `war-sim-i`, so rows
  share their opening deals; spread deal i and full run i are seeded the same way. Every number is
  reproducible from the seed.
- **Sampling.** 1,000 crises a row give about +/-3 points at 95% near 50% and about +/-1.5 near 5% or
  95%; 40,000 deals give +/-0.45 points on a 30% share.

## Reproduce

```
npx tsx tools/war-sim.ts --runs 1000 --full-runs 200 --crosscheck 100   # this report
npx tsx tools/war-sim.ts --runs 200 --full-runs 0                       # about a minute
npx vitest run src/war/sim                                              # gates on a small sample
python3 src/war/sim/reference-rerun.py 1000 5                           # the reference re-run column
```

Options: `--deals N` (default 40 x runs), `--seed S`, `--jobs J` (worker processes), `--json PATH`
(raw results), `--strict` (exit 1 when a gate fails or the cross-check finds a difference),
`--reference-ties`, `--quiet`.
