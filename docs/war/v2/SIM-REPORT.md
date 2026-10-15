# WIN THE WORLD: simulator report

**For the owner.** We had six computer players of different skill play 30,000 games of the rebuilt game:
a careful player keeps the world in 63 games out of 100 (48 of them with the whole map gold), while one that
never hires staff, or taps at random, loses every time. A first game lasts about 13½ minutes, and 9 games in
10 finish within 16½, which is the 15 minutes you asked for.

**Result: all 17 gates of SPEC section 16 pass, at the exact thresholds,** with 5,000 games per bot (the
reference's own sample size), and again at the CLI's default of 2,000 games per bot. Every number sits within
sampling noise of the Python reference's `RESULTS.txt`. No engine bug was found: the TypeScript engine and the
reference agree on all 1,504 fixture cases, and the unmodified reference plays all 30,000 games of this run
again on the same random streams, identically, turn for turn.

**Update: the final fix (dead under every seat order; the push draws where it can be won).** A deal is now dead
(NO SEND CAN WIN) only when no legal send wins under any seat order of the line-up; a deal that only another
order wins says REORDER STAFF TO WIN, and the best-send bots (greedy, preview, sensible, breaker) drag their staff
into the best seating for it before they send. In the final push the crisis is drawn from the red regions some
fresh deal can win, when any can. The reference, its fixtures (now 1,850 cases: 200 dead / reorder / live deals,
120 push crisis draws and 80 final-push sends among them) and `RESULTS.txt` were regenerated (no tunable
changed). `npx tsx tools/war-sim.ts --replay 300 --strict` (2,000 games per bot): all 1,904 cross-checks agree,
the unmodified reference plays 1,800 of the games again identically (20,530 turns, every reorder and every push
draw included) and prints the same gates, and **all 17 gates pass**: G1 62.9% (reference 62.5%), G2 50.2%
(49.7%), G7 13.2 (13.6), G8 17.7 (18.0), G9 14.2 (14.2), G10 64.4% (65.9%), G11 8.1% (9.3%), G13 8 (8), G14
56.4% (56.5%), G15 Old Hand 20.3% (21.8%), G16 Strategist 73.2% (72.9%), the rest as before. Two gates moved in
the reference: G14 (the preview-number buyer) from 44.7% to 56.5%, because it now acts on REORDER STAFF TO WIN
(3.7% of its turns), and G8 (the first-game p90) from 17.4 to 18.0 minutes, exactly its limit, because pushes
whose crises can be won run longer (p90 7 turns, was 6). SPEC section 16 has the table and the honest account of
what the push's misses still are for a best-send player.

**Update: the fair game (the forgiving push and announced dead deals).** After the second review the final
push allows three misses (a push miss changes no region; the third is a CEASEFIRE), and a deal no legal send can
win is announced before any pin (NO SEND CAN WIN); the novice bot now swaps on such a deal, as the game tells it
to. The reference, its fixtures (now 1,680 cases, 150 dead deals and 80 final-push sends among them) and
`RESULTS.txt` were regenerated. `npm run sim:war -- --replay 300` (2,000 games per bot): all 1,734 cross-checks
agree, the unmodified reference plays 1,800 of the games again identically (20,048 turns) and prints the same
gates, and **all 17 gates pass**: G1 62.9% (reference 62.5%), G2 49.0% (48.7%), G7 13.2 (13.6), G8 17.3 (17.4),
G9 14.2 (14.2), G10 64.4% (65.9%), G13 8 (8), G14 44.0% (44.7%), G15 Old Hand 20.5% (22.2%), G16 Strategist
72.8% (73.4%), the rest as before. The largest move against the one-miss push is G8, the first-game p90, from
16.3 to 17.4 minutes (limit 18): push games last 3 turns at the median instead of 2. SPEC section 16 has the
whole before-and-after table and what the three misses buy (rarely a push saved for a best-send player: 0.7%).

**Update: pin it to claim it.** After the first review of the build, a win's extra regions go to the regions
the player pinned before the nearest others (SPEC section 5, step 6). The reference, its fixtures and
`RESULTS.txt` were regenerated, and the run was repeated: `npx tsx tools/war-sim.ts --games 5000 --replay 5000
--strict` cross-checks all 1,504 fixture cases, the unmodified reference plays all 30,000 games again
identically (333,372 turns), and **all 17 gates pass**:

| Gate | Threshold | This sim | Reference | Result |
| --- | --- | --: | --: | --- |
| G1 sensible holds the world | 55-70% | 63.2% | 62.5% | PASS |
| G2 sensible WORLD UNITED (30/30) | ≥ 40% | 48.4% | 48.3% | PASS |
| G3 greedy, never shops, holds | < 25% | 0.0% | 0.0% | PASS |
| G4 random holds | < 5% | 0.0% | 0.0% | PASS |
| G5 best send ≥ 2x the median send (sensible, opening deal) | ≥ 85% of turns | 99.3% | 99.3% | PASS |
| G6 sensible median game | 15-19 turns | 15.0 | 15.0 | PASS |
| G7 first-game minutes, median | 13-16 | 13.4 | 13.5 | PASS |
| G8 first-game minutes, p90 | ≤ 18 | 16.3 | 16.3 | PASS |
| G9 first-game minutes, games that hold, median | 14-17 | 14.1 | 14.1 | PASS |
| G10 held games where war reached 6+ | ≥ 25% | 64.8% | 65.9% | PASS |
| G11 close losses (WAR while holding 18+ gold) | 6-14% of games | 9.3% | 9.3% | PASS |
| G12 hopeless losses (WAR holding ≤ 8 gold) | < 10% of games | 0.5% | 0.6% | PASS |
| G13 novice median game | ≥ 7 turns | 8.0 | 8.0 | PASS |
| G14 preview bot holds | ≥ 30% | 44.7% | 44.7% | PASS |
| G15 every staff in held line-ups | ≥ 8% each | Old Hand 21.7% | Old Hand 22.1% | PASS |
| G16 no staff in held line-ups above | ≤ 85% | Strategist 72.5% | Strategist 73.0% | PASS |
| G17 stalls (every bot) | 0 | 0 | 0 | PASS |

Against the earlier rule, every number moved by sampling noise except G10 (51.9% → 64.8%): the bots pin for
score, not to take war's regions back, so big sends now retake fewer red regions and war more often reaches 6.
The default 2,000-game run also passes (G1 62.9%, G10 64.4%, G14 44.0%). The sections below are the report on
the earlier rule, kept for its method and detail; their numbers differ from the above only as described.

---

## 1. The gates, beside the reference (the earlier rule)

`npx tsx tools/war-sim.ts --games 5000 --replay 5000 --strict`: 5,000 games per bot, seeds W0-W4999 (54 s on 3
processes, plus 6½ minutes for the replay). The reference column is `docs/war/v2/reference/RESULTS.txt`
(`python3 calibrate.py 5000`, also seeds W0-W4999, but drawn by Python's own generator, so the 5,000 games are
different games).

| Gate | Threshold | This sim | Reference | Result |
| --- | --- | --: | --: | --- |
| G1 sensible holds the world | 55-70% | 63.0% | 63.1% | PASS |
| G2 sensible WORLD UNITED (30/30) | ≥ 40% | 48.3% | 48.9% | PASS |
| G3 greedy, never shops, holds | < 25% | 0.0% | 0.0% | PASS |
| G4 random holds | < 5% | 0.0% | 0.0% | PASS |
| G5 best send ≥ 2x the median send (sensible, opening deal) | ≥ 85% of turns | 99.3% | 99.3% | PASS |
| G6 sensible median game | 15-19 turns | 15.0 | 15.0 | PASS |
| G7 first-game minutes, median | 13-16 | 13.6 | 13.6 | PASS |
| G8 first-game minutes, p90 | ≤ 18 | 16.4 | 16.5 | PASS |
| G9 first-game minutes, games that hold, median | 14-17 | 14.2 | 14.1 | PASS |
| G10 held games where war reached 6+ | ≥ 25% | 51.9% | 51.4% | PASS |
| G11 close losses (WAR while holding 18+ gold) | 6-14% of games | 9.0% | 8.7% | PASS |
| G12 hopeless losses (WAR holding ≤ 8 gold) | < 10% of games | 0.5% | 0.6% | PASS |
| G13 novice median game | ≥ 7 turns | 8.0 | 8.0 | PASS |
| G14 preview bot holds | ≥ 30% | 44.2% | 45.0% | PASS |
| G15 every staff in held line-ups | ≥ 8% each | Old Hand 21.7% | Old Hand 23.0% | PASS |
| G16 no staff in held line-ups above | ≤ 85% | Strategist 73.3% | Strategist 74.2% | PASS |
| G17 stalls (every bot) | 0 | 0 | 0 | PASS |

The default run (`npx tsx tools/war-sim.ts`, 2,000 games per bot, the size SPEC section 16 names for CI) also
prints ALL GATES PASS: G1 62.9%, G2 48.3%, G7 13.6, G8 16.4, G9 14.1, G10 50.5%, G11 8.7%, G14 44.0%, G15 Old Hand
22.0%, G16 Strategist 74.3%, the rest as above.

## 2. Outcomes, every bot

| Bot |  | Games | WORLD UNITED | CEASEFIRE | Holds | WAR | Stalls | Turns: median (p10-p90) | First-game minutes: median / p90 |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: |
| random | this sim | 5,000 | 0.0% | 0.0% | 0.0% | 100.0% | 0 | 6.0 (6-8) | 5.0 / 6.3 |
|  | reference | 5,000 | 0.0% | 0.0% | 0.0% | 100.0% | 0 | 6.0 (6-8) | 5.0 / 6.3 |
| novice | this sim | 5,000 | 0.0% | 0.0% | 0.0% | 100.0% | 0 | 8.0 (6-9) | 6.7 / 7.6 |
|  | reference | 5,000 | 0.0% | 0.0% | 0.0% | 100.0% | 0 | 8.0 (6-9) | 6.7 / 7.6 |
| greedy | this sim | 5,000 | 0.0% | 0.0% | 0.0% | 100.0% | 0 | 9.0 (9-9) | 9.0 / 9.1 |
|  | reference | 5,000 | 0.0% | 0.0% | 0.0% | 100.0% | 0 | 9.0 (9-9) | 9.0 / 9.1 |
| preview | this sim | 5,000 | 26.5% | 17.7% | 44.2% | 55.8% | 0 | 15.0 (12-18) | 13.3 / 16.0 |
|  | reference | 5,000 | 27.1% | 17.9% | 45.0% | 55.0% | 0 | 15.0 (12-18) | 13.4 / 16.0 |
| sensible | this sim | 5,000 | 48.3% | 14.7% | 63.0% | 37.0% | 0 | 15.0 (12-19) | 13.6 / 16.4 |
|  | reference | 5,000 | 48.9% | 14.2% | 63.1% | 36.9% | 0 | 15.0 (12-19) | 13.6 / 16.5 |
| breaker | this sim | 5,000 | 29.3% | 9.7% | 39.0% | 61.0% | 0 | 13.0 (9-18) | 11.3 / 15.7 |
|  | reference | 5,000 | 30.5% | 9.4% | 39.8% | 60.2% | 0 | 13.0 (9-18) | 11.7 / 15.7 |

No game of any bot ran past turn 25 (one sensible game in 5,000 reached it).

## 3. More of the game, beside the reference

this sim (reference):

|  | sensible | preview | breaker |
| --- | --: | --: | --: |
| best send ≥ 2x the median send (turns) | 99.3% (99.3%) | 99.5% (99.5%) | 99.4% (99.4%) |
| best send wins where the median misses | 59.0% (58.5%) | 59.0% (58.4%) | 55.6% (55.5%) |
| sends that pin the crisis | 90.6% (90.6%) | 91.4% (91.7%) | 93.7% (93.8%) |
| games that reach the final push | 54.1% (53.1%) | 38.7% (38.5%) | 32.2% (32.1%) |
| best send per game, median | 121,134 (126,036) | 13,574 (13,758) | 9,404 (10,281) |
| games with a 1,000,000+ send | 8.8% (8.0%) | 4.8% (4.9%) | 8.0% (8.8%) |
| games with a send that wins 5+ regions | 6.9% (7.2%) | 4.5% (5.2%) | 6.8% (7.2%) |
| winning sends that take 1 region | 48.3% (47.7%) | 53.3% (53.1%) | 55.1% (54.3%) |
| winning sends that take 2 regions | 45.1% (45.5%) | 41.8% (41.7%) | 39.2% (39.8%) |
| winning sends that take 3+ regions | 6.6% (6.6%) | 4.9% (5.2%) | 5.7% (5.9%) |
| held games where war reached 6+ | 51.9% (51.4%) | 57.1% (57.1%) | 53.3% (51.2%) |
| close losses (WAR holding 18+ gold) | 9.0% (8.7%) | 15.2% (15.0%) | 6.1% (6.1%) |
| hopeless losses (WAR holding ≤ 8 gold) | 0.5% (0.6%) | 0.7% (0.7%) | 35.4% (35.0%) |

Staff in the final line-ups of held games (sensible): Strategist 73.3% (74.2%), Harbourmaster 70.3% (71.7%),
Sovereign 67.3% (67.2%), Governor 54.9% (54.8%), Herald 46.0% (46.0%), Quartermaster 45.4% (43.5%), Surveyor
45.0% (47.1%), Duty Officer 40.9% (38.0%), Deputy 33.1% (32.5%), Old Hand 21.7% (23.0%).

Sensible, other figures: CEASEFIRE in 14.7% of games, holding 21-29 gold (21: 107 games, 22: 113, 23: 130, 24: 95,
25: 82, 26: 64, 27: 56, 28: 50, 29: 39); a median of 1 miss a game and 4 spreads of war by itself; losses at a
median of turn 15, holding 15 gold with 5 grey left; 3 misses in a row end a loss at the median; best send per game
p90 859,622 and max 14,096,793 (the reference's maximum too); 15.4% of sends score 10x the target or more.

**The curve** (sensible, games still going; the reference's is in `RESULTS.txt`): 99.9-100% of sends win on turns
1-7, then the share of winning sends falls 97.8% (turn 8) → 95.8% (9) → 88.2% (11) → 75.6% (14) → 61-71% (turns
17-21), while war sits at a median of 5-6; the median game has 14 gold after turn 8 and 21 after turn 13.

## 4. The time model (SPEC section 12)

The phone time model is `reference/timing.py`, ported in `src/war/sim/timing.ts` (a unit test checks it against
the reference's own output to the last float digit). Sensible bot, 5,000 games, minutes:

| Model | median | p10 | p90 | SPEC section 12 |
| --- | --: | --: | --: | --- |
| first game (intro 25 s, coach 15 + 6 s, first shop +15 s) | 13.6 | 10.6 | 16.4 | 13.6 / 16.5 |
| first game, games that hold | 14.2 | 11.2 | 17.0 | 14.1 / 17.0 |
| practised (no intro or coach) | 12.6 | 9.6 | 15.4 | 12.6 / 15.4 |
| slow first-timer (20 s + 3 s a pin, 50 s shops) | 17.9 | 14.0 | 21.6 | 17.8 / 21.6 |
| fast player (8 s + 1.8 s a pin, 20 s shops) | 9.2 | 7.0 | 11.2 | 9.1 |

It remains a model, not a measurement: SPEC section 17's five timed phone playtests still decide.

## 5. How we know this is the reference's game

Three checks, from the smallest unit to whole games:

1. **Fixtures** (`src/war/sim/crosscheck.ts`, in CI): all 1,504 cases of `reference/fixtures.json` replayed
   through the engine's public functions with no difference: the map and tunables, the 10 staff cards, T(1..40),
   400 scores (80 with the full trace, event by event), 200 ladder cases, 300 legal, 100 group-count and 100 lift
   cases, 200 win orders, 150 war spreads, and FIRST-WORLD turns 1-2 played through `newGame`, `pin`, `send`.
2. **Whole games on identical inputs** (`src/war/sim/replay.py`, `--replay N`): the engine draws from its own
   seeded generator (`src/engine/rng.ts`), not Python's. `replay.py` ports that generator to Python (a few
   dozen lines) and hands it to the unmodified `rules.py` and `bots.py` in place of `random.Random`, so the reference
   deals, draws its shop offers and makes every bot decision from exactly the numbers the TypeScript game drew.
   Each game is then played by the reference's own `play()` and compared turn by turn: crisis, pins sent, score,
   regions won, regions recoloured, swaps, firing staff, pops, gold, war and grey counts, coins, war's spread, the
   final push, the shop (affordable, bought, line-up and coins after it), and the ending. **All 30,000 games of
   the run above (335,835 turns, all six bots) matched, and `calibrate.py`'s own `summarize` and `gates`, run on
   those replayed games, print the same 17 values as this simulator.** A tampering test (a score off by one,
   different pins, a wrong line-up, a wrong ending) is caught every time.
3. **Statistics** (section 1-3 above): the two columns are two different random samples of 5,000 games each.
   Two-proportion tests on the outcome shares, the detail rows and the staff shares give |z| ≤ 1.7 on all but two
   of 34 comparisons (breaker's war 6+ at 2.1 and the Duty Officer share at 2.4), which is what chance gives over
   that many comparisons; step 2 shows the rules and the bots are the same, so these gaps can only be sampling
   noise.

One ruling differs on purpose. The engine refuses a SWAP when its pile is empty (`src/war/engine/README.md`:
"SWAP is refused (not used up) when nothing is unpinned or the pile is empty"), where the reference plays it as
a no-op. The bot then plays on exactly as the reference does (nothing else changes), and the time model counts
no swap, since the player cannot spend 7 s on a disabled button; `replay.py` logs the reference's no-op swap the
same way. That is about 0.5 swaps a sensible game, so the reference's minutes run about 3.5 s a game longer.

## 6. Method

- **Bots** (`src/war/sim/bots.ts`, `sensible.ts`): ports of `reference/bots.py` (random, novice, greedy, preview,
  sensible, breaker), each with its own stream seeded `<seed>:bot` as in the reference. They read the deal through
  the engine's exports (`sendOptions`, `pinnable`, `crisisPool`, `dealPool`, `dealFeatures`, `Scorer`,
  `previewNumber`, `bestOnOpening`) and act only through its public actions: `pin` (in a tappable order),
  `clearPins`, `swap`, `send`, `nextTurn`, `buy` (with `replaceSeat` for a full table), `reroll` and `moveSeat`.
  A refused action throws, so a bot cannot quietly break a rule.
- **A game** (`play.ts`): the reference's `play()`: the bot picks a send; if it asks to swap (greedy and the
  shoppers when their best send misses; novice when it cannot make a group of 3), it pins what it keeps, swaps,
  and picks again; then it sends. After turns 2, 4, 6 ... it shops. A game still going after turn 60 is a stall.
  Each turn logs what the gates and the time model read; each turn's opening deal is also scored in full for G5.
- **Seeds**: W0 ... W{N-1} for every bot, so all bots meet the same war starts.
- **Statistics and gates** (`summary.ts`, `stats.ts`, `gates.ts`): `calibrate.py`'s `summarize` and `gates`,
  ported with its exact definitions (Python's median, `q()` for percentiles) and the thresholds of SPEC section 16
  (inclusive where it says "55-70%" or "≥", exclusive where it says "<").
- **CI** (`src/war/sim/gates.test.ts`, 15 s): the fixture cross-check; the 17 gates on 300 games per bot, each
  allowed its sampling noise (two standard errors at the threshold for a share, the order-statistic interval for
  a median or p90; G17 exact); and, where python3 is installed, 25 games per bot replayed in the reference.
  `bots.test.ts` covers the seatings, the time model, the statistics, the bots' helpers and one game per bot.
- **Running it**: `npx tsx tools/war-sim.ts` (2,000 games per bot, 22 s on 3 processes; `--games N`,
  `--bots`, `--seed`, `--jobs`, `--md`, `--json`, `--replay N`, `--strict`).

## 7. Engine bugs found

None. Every fixture case, every replayed game and every gate agrees with the reference, and no rule or number was
changed.

Two notes for the screens, from the same runs: on 15.5% of the sensible bot's turns the deal leaves the swap pile
empty (the crisis sits in a corner, or war holds much of what is within 3 joins; at war 8-9 it is about half of
all turns), so SWAP is disabled there. `controlsView(s).swap.sub` still reads "1 left" on those turns, and the
one-time coach line "Short? SWAP brings new regions. Your pins stay." (`src/war/ui/app/teach.ts`) checks
`swapsLeft` rather than `swapProblem(s)`, so it can point at a disabled button.
