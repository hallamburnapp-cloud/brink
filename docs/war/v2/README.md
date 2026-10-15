# WIN THE WORLD (BRINK v2): summary and decision record

## The game, in five sentences

1. BRINK is a short strategy game on a world map in a war room: 30 fictional regions, one of them already yours
   (gold), three already held by war (red).
2. The goal is on screen from the first second: turn all 30 regions gold (GOLD 1/30) before war holds 10
   (WAR 3/10).
3. Each turn a crisis flares beside your gold with a target; you pin up to five nearby lit regions that touch,
   add their numbers and multiply by how many you pinned (pinning the crisis itself doubles it); beat the target
   and the crisis turns gold for good, beat it by more and you win more regions (your own pins first: pin it to
   claim it), miss and war takes it.
4. Every second turn you hire staff (ten kinds) who multiply each send left to right, so scores climb from
   hundreds to millions and a broken build can turn seven regions gold in one send.
5. A game lasts about 15 minutes (13.5 by the time model for a first game, 17.7 for a slow first-timer) and ends
   WORLD UNITED at 30/30, in a CEASEFIRE if the last push for war's regions fails, or in WAR.

## What is here

| File | What |
| --- | --- |
| `SPEC.md` | The build spec: rules, intro, coached first game, turn loop, scoring with worked examples, staff and shop, map animation, screens, goal display, menu, cuts and module mapping, tests and gates. |
| `reference/rules.py` | The rules, integer-exact (multiplier in tenths, floored each step, as the engine's BigInt). |
| `reference/bots.py` | Six bots (random, novice, greedy, preview, sensible, breaker) and the game loop. |
| `reference/calibrate.py` | Plays N games per bot and prints the 17 gates. `python3 calibrate.py 5000 --write` wrote `RESULTS.txt`. |
| `reference/timing.py` | The time model (director timings plus assumed human decision times). |
| `reference/examples.py` | Prints every number the spec quotes. |
| `reference/fixtures.py`, `fixtures.json` | 1,450 fixed cases plus the scripted first game that the TypeScript engine must reproduce. |
| `reference/map.json` | A byte-for-byte copy of `src/war/content/map.json`. |
| `reference/RESULTS.txt` | The 5,000-games-per-bot run: ALL GATES PASS. |

Run from `docs/war/v2/reference/` with `python3` (standard library only; about 3.5 minutes for 5,000 games per bot
on 4 cores). Nothing outside `docs/war/v2/` was changed.

## Headline results (5,000 games per bot)

| | Sensible | Preview-number buyer | Breaker | Greedy, no shop | Novice | Random |
| --- | --: | --: | --: | --: | --: | --: |
| WORLD UNITED (30/30) | 48.3% | 26.6% | 29.5% | 0% | 0% | 0% |
| CEASEFIRE | 14.2% | 18.1% | 10.0% | 0% | 0% | 0% |
| WAR | 37.5% | 55.3% | 60.5% | 100% | 100% | 100% |
| median turns | 15 | 15 | 13 | 9 | 8 | 6 |
| first-game minutes, median / p90 | 13.5 / 16.3 | 13.3 / 15.8 | 11.7 / 15.6 | 9.0 | 6.7 | 5.0 |

Best send at least 2x the median on 99.3% of turns; best send wins where the median would lose to war on 57.8%.
Held games where war reached 6+: 66%. Close losses (WAR holding 18+ gold): 9.3%. Sends over 1,000,000 in 8.8% of
sensible games; a 5+ region send in 7.1%. No stalls, no game past turn 25. (With pin it to claim it; the earlier
rule's run is in git history: every gate moved by sampling noise except war reaching 6+, which was 51%.)

## Decision record

### Why this design

Three designs went to three judges (owner's view, designer, tech). All three picked the same winner.

| Judge | Plague (one send a turn) | Balatro (2 plays + 3 swaps) | Mobile (pick 1 of 3 crises) |
| --- | --: | --: | --: |
| Owner's view | **54.5** | 53.5 | 53.5 |
| Designer | **54** | 52 | 52 |
| Tech | **54** | 44 | 51 |

The plague design is the option the owner picked (Plague Inc style: settle crises to turn regions your colour for
good, war spreads red when you fail, win the whole map, lose if war takes too much). It keeps the pin-thread-cascade
core the owner called "interesting" and cuts what made the slice senseless: one send and one outcome on the map per
turn. Balatro had the best building but kept most of the slice's machinery (two plays that add up, shared swaps,
spent regions), and its 15 minutes rested on 4 s of thinking per play (22.5 min with the plague time constants).
Mobile was the simplest to read but its turn was hollow: about 40% of turns had exactly one winnable crisis, the
same "choices felt pointless" problem.

### What the judges required, and what was done

| Must-fix (merged from the three judges) | Done |
| --- | --- |
| The win stamped WORLD UNITED with up to 9 red regions left, against the owner's "win when the whole map is yours". | WORLD UNITED now means 30/30. When grey runs out, crises flare on red regions (the final push); a miss there ends the game as a CEASEFIRE, graded ★★ (25-29) or ★ (21-24); ★★★ only for 30/30. 73% of pushes succeed. |
| Pins and the crisis were unrelated places ("why does pinning Shoal settle Tallowmere?"). | Crises flare beside your gold; lit regions are dealt within 3 joins of the crisis; the crisis is lit and pinning it doubles the score (90.6% of sensible sends do); the score flies into the crisis ring before it collapses. A separate "must link to the crisis" rule was tested and changed nothing, so it was left out. |
| Tripling maths in the rules and coach. | Rule line: "Beat it by more, win more regions." The readout shows NEXT REGION AT, the SEND lever says WINS 2 REGIONS, the map numbers the regions a send wins. No arithmetic in any coach line. |
| Length tail (p90 21.9 min; 12% of games dragging to turns 25-26). | First-game p90 16.5 min (gate ≤ 18); no game past 25 turns, and fewer than 0.1% reach turn 25. Sim gates now include minutes, minutes for winning games, and p90. |
| A struggling newcomer died in about 2 minutes. | War starts at 3; the miss streak is gone; the first two turns are scripted and coached. The novice bot lasts 8 turns (6.7 min) at the median. |
| Staff balance: Mediator dead weight, Governor and Duty Officer in 91-93% of wins, Herald's cryptic chip. | Mediator replaced by the Surveyor; prices rebalanced; every staff is in 23-74% of winning line-ups (gates 8% and 85%). Herald's chip is "ALL PINS ★ ⚓" over two lines and its rule is plain. |
| Legibility: a 6 pt race bar with 7 pt labels. | Two bars as in the owner's preview: GOLD 30 segments and WAR 10 segments, both 16 pt tall, counts in 22 pt split-flaps. |
| The shop is mandatory (no-shop play wins 0%), so the first shop must be unmistakable. | Fixed first offers, a coach line, a preview number on every card (390 → 2,343), and the new hire's first firing highlighted. A bot that only follows the preview number holds 45%. |
| War invisible in mid-game (designer). | War spreads by itself after every 3rd turn, with a red tag on the region it will take next ("WAR · 2 TURNS"). 51% of winning games see war at 6+. |
| Let the explosion reach the map (designer). | The region ladder doubles after 16x (32x, 64x, 128x ...) with no cap; the Crown example wins 7 regions; a CROWN demo seed lets the owner feel it in the first session. |
| Red overloaded: threads and the ring were war's red (tech). | Threads and the crisis ring are white; red means war only; war regions are hatched. |
| Exact arithmetic and a trustworthy reference (designer, tech). | The reference is integer-only (tenths, floored per step, per-region pops as separate steps); `examples.py` prints exactly the plays the spec quotes; `fixtures.json` is generated from it. |
| Swap semantics and ownership rendering (tech). | Swap keeps pins, once a turn. `RegionView.owner`, `preview` and `inkSpread(colour)` are specified with scene tests. |
| Hard rules. | BRINK only in `src/config.ts`; fictional names; no network; local share image only. |

Grafts taken: the preview number on shop cards; the SEND sub-label in words; the gold wave on intro screen 1;
starting with Lantern Key gold and crises beside your gold; the literal 30/30 win; white threads and hatched war;
the "not on screen" discipline (no turn number, clock or pattern name on the HUD); one colour word ("gold");
desktop keys; per-region pops from the map; the Surveyor for the Mediator; stars on the lesser ending; the near-miss
lines on the WAR card; brass pins as decoration. Not taken: a region-ladder bar (the "NEXT REGION AT" line and the
SEND sub-label say the same thing in words, at readable sizes); a separate flood rule at 27x (the doubling ladder
does the same job with no extra rule).

### What was tuned, and what was rejected

Each variant was run at 300-1,500 games per bot before the final 5,000-game run.
- Lit regions 8 vs 10: 10 gives more real options (72 legal sends at the median).
- "Pins touching the crisis count double" as a base rule: lifted the mid-game spread a little, not the early game; dropped.
- Crisis pinnable for x2, with or without a must-link rule: the same results either way; kept x2, dropped the link rule.
- War spreading by itself every 2 / 3 / 4 turns or never: never left war harmless (1.4% of wins saw war at 6+);
  every 2 was too strong; every 4 made the race weak; every 3 kept.
- The miss streak (1, then 2, then 3 regions): it only shortened weak players' games; dropped.
- Ladder steps: 3x (games of 11-13 turns), 5x then 25x (fewer big sends), 4x then 16x then doubling (kept).
- A two-phase target curve (steep, then gentle) to create late floods: builds plateau once 5 seats are full, so it
  did not; dropped. Growth x1.45 vs x1.5 vs x1.55: little difference; x1.5 kept for "each target is half again the last".
- Four war regions at the start: no length gain; three kept.
- Prices: the Harbourmaster at ◆5 sat in 93% of winning line-ups; ◆6 brought it to 72%.

### After the first review of the build: pin it to claim it

The critics found one rule a newcomer could not follow: a win's extra regions went to the regions nearest the
crisis whether or not they were pinned, so a pinned region war was about to take could go to war while an
unpinned one turned gold. The lead's decision: **pin it to claim it.** A win claims the crisis first, then the
pinned regions that are not gold (nearest first, then the old tie-breaks), then, if the send wins more, the
nearest other regions. The reference, its fixtures (each win-order case now carries pins), the calibration
(ALL GATES PASS; war reaching 6+ in held games rose from 51% to 66%), the engine, the simulator, the map's win
preview and the coach ("Beat it by more: win more regions. Your pins go first.") all follow it. The same review
made free regions one neutral grey (no bloc hue), stopped gold from ever dimming, and cut the bearing strip;
CEASEFIRE, the crisis ×2 and the ten staff are unchanged.

### What changed from the slice the owner played

| The slice | v2 |
| --- | --- |
| No end goal; survive till 01:00; nothing on the map changed hands | GOLD n/30 and WAR n/10 from the first second; regions turn gold or red for good |
| 8 lit regions, 11 patterns with levels, Influence × Momentum = Leverage | 10 lit near the crisis; pins that touch; points × multiplier = score |
| 4 sweeps and 3 swaps a crisis, adding to a total | one send and at most one swap a turn; the map changes every turn |
| Flashpoint scored twice | the crisis region: pin it for ×2; it is the region that changes |
| 20 staff with standby, AGAIN and per-timing copies; cryptic chips | 10 staff, each fires once left to right; rules of 8 words or fewer |
| 8 Orders, in-tray, Playbooks, folders, interest, overwhelm | none; ◆1 per region won |
| 3 Hours, Flare-up/Standoff/Summit, Gridlock/Blackout/Full Table | one target curve, war spreading every 3rd turn, the final push |
| No explanation | three intro screens on the real map, a coached first game, How to play in the menu |
| Hard to get home | menu (and back button) with QUIT TO TITLE and a saved game to CONTINUE |
| Reused unchanged | the map and its renderer, Big Board flaps, the scoring director, staff rail, Briefing tray, icons, coach strip, menu, back-button handling, phone/desktop fit, deterministic engine style, sim harness, Playwright |

## Open questions for the owner

1. **CEASEFIRE.** If the final push misses, the game ends as a CEASEFIRE (you keep 21-29 regions, ★★ or ★), because
   war cannot take more ground there and the game must end. Is that right, or should the push forgive two misses?
2. **Length.** The model gives 13.5 minutes for a first game and 17.7 for a slow first-timer. Should the target be the
   middle of that, or a touch longer (the 5x/25x ladder adds about a turn)?
3. **The crisis ×2.** "Pin the white ring to double your score" is the first lesson and right about 90% of the time.
   Happy with that as the hook, or should it matter less?
4. **The CROWN demo.** A title button in review builds only, or a permanent "Demo" entry in the menu?
5. **Playtests.** Five timed phone playtests before content lock, with the gate "median 13-17 minutes", before any
   tuning by hand.
