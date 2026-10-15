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
5. A game lasts about 15 minutes (13.6 by the time model for a first game, 17.8 for a slow first-timer) and ends
   WORLD UNITED at 30/30, in a CEASEFIRE if the last push for war's regions misses three times, or in WAR.

## What is here

| File | What |
| --- | --- |
| `SPEC.md` | The build spec: rules, intro, coached first game, turn loop, scoring with worked examples, staff and shop, map animation, screens, goal display, menu, cuts and module mapping, tests and gates. |
| `reference/rules.py` | The rules, integer-exact (multiplier in tenths, floored each step, as the engine's BigInt). |
| `reference/bots.py` | Six bots (random, novice, greedy, preview, sensible, breaker) and the game loop. |
| `reference/calibrate.py` | Plays N games per bot and prints the 17 gates. `python3 calibrate.py 5000 --write` wrote `RESULTS.txt`. |
| `reference/timing.py` | The time model (director timings plus assumed human decision times). |
| `reference/examples.py` | Prints every number the spec quotes. |
| `reference/fixtures.py`, `fixtures.json` | 1,850 fixed cases (deals that are dead, live or won only by a reorder; the push's crisis draw; final-push sends among them) plus the scripted first game that the TypeScript engine must reproduce. |
| `reference/map.json` | A byte-for-byte copy of `src/war/content/map.json`. |
| `reference/RESULTS.txt` | The 5,000-games-per-bot run: ALL GATES PASS. |

Run from `docs/war/v2/reference/` with `python3` (standard library only; about 6.5 minutes for 5,000 games per bot
on 4 cores). Nothing outside `docs/war/v2/` was changed.

## Headline results (5,000 games per bot)

| | Sensible | Preview-number buyer | Breaker | Greedy, no shop | Novice | Random |
| --- | --: | --: | --: | --: | --: | --: |
| WORLD UNITED (30/30) | 49.7% | 35.6% | 30.8% | 0% | 0% | 0% |
| CEASEFIRE | 12.8% | 20.9% | 8.7% | 0% | 0% | 0% |
| WAR | 37.5% | 43.5% | 60.5% | 100% | 100% | 100% |
| median turns | 15 | 16 | 13 | 9 | 8 | 6 |
| first-game minutes, median / p90 | 13.6 / 18.0 | 14.1 / 19.0 | 11.7 / 16.9 | 9.0 | 6.9 | 5.0 |

Best send at least 2x the median on 99.3% of turns; best send wins where the median would lose to war on 57.2%.
Held games where war reached 6+: 66%. Close losses (WAR holding 18+ gold): 9.3%. Sends over 1,000,000 in 8.9% of
sensible games; a 5+ region send in 7.1%. No stalls; 0.7% of sensible games reach turn 25. Dead deals (no legal
send wins under any seat order): 13.0% of sensible turns as dealt, 10.0% after a swap; deals only a reorder wins
(REORDER STAFF TO WIN): 3.7% of the preview-number buyer's turns, which it now acts on. (With pin it to claim it,
the forgiving push and its crises drawn where they can be won; the earlier runs are in git history.)

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
| The win stamped WORLD UNITED with up to 9 red regions left, against the owner's "win when the whole map is yours". | WORLD UNITED now means 30/30. When grey runs out, crises flare on red regions (the final push); a miss there ends the game as a CEASEFIRE, graded ★★ (25-29) or ★ (21-24); ★★★ only for 30/30. 73% of pushes succeed. (Since the second review the push forgives two misses: its third is the CEASEFIRE; see below.) |
| Pins and the crisis were unrelated places ("why does pinning Shoal settle Tallowmere?"). | Crises flare beside your gold; lit regions are dealt within 3 joins of the crisis; the crisis is lit and pinning it doubles the score (90.6% of sensible sends do); the score flies into the crisis ring before it collapses. A separate "must link to the crisis" rule was tested and changed nothing, so it was left out. |
| Tripling maths in the rules and coach. | Rule line: "Beat it by more, win more regions." The readout shows NEXT REGION AT, the SEND lever says WINS 2 REGIONS, the map numbers the regions a send wins. No arithmetic in any coach line. |
| Length tail (p90 21.9 min; 12% of games dragging to turns 25-26). | First-game p90 16.5 min (gate ≤ 18); no game past 25 turns, and fewer than 0.1% reach turn 25. Sim gates now include minutes, minutes for winning games, and p90. (Since the forgiving push: 0.3% reach turn 25, the longest 28.) |
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

### After the second review: a loss must come from the player's choices

The critics found games lost through turns where no send on the table could win, and every CEASEFIRE they saw
ended on such a deal: the player had nothing to decide. The lead's decisions, both built end to end (reference,
fixtures, calibration, engine, simulator, UI, copy, tests):

- **A. The final push forgives.** A push miss changes no region and spends one of three misses; the third ends
  the game as a CEASEFIRE (stars as before, by gold held). The Big Board lights three lamps beside WAR under
  "PUSH" (lit: misses left; a miss preview blinks the one it would put out); SEND reads "MISS · 2 LEFT", "MISS · 1
  LEFT", then "MISS · CEASEFIRE"; the rules line is "No grey left? Crises flare on red: win each back. Three
  misses: ceasefire."; the coach "No grey left. Win back the red. Three misses: ceasefire."; the CEASEFIRE card
  says "The final push missed three times." The crisis draw is unchanged: the three misses are the fairness.
  Result: every gate passes; the push lasts 3 turns at the median (was 2) and the first-game p90 rises from 16.3
  to 17.4 minutes (gate 18). Honestly, for a best-send player it rarely saves the push (0.7% of sensible pushes
  miss and still unite; WORLD UNITED 48.3% to 48.7%), because a push that misses has usually fallen behind the
  target curve; what it buys is two more deals, a swap each and often a shop, so the ending follows choices.
- **B. Dead deals are announced.** Each turn the engine asks whether any legal send of the lit regions reaches the
  target (`deadDeal`, the shop's fast enumeration; asked again after a SWAP). When none does, before any pin the
  readout says "NO SEND CAN WIN", the lever "NO SEND CAN WIN · SWAP" while SWAP can help (and SWAP beckons), or
  "NO SEND CAN WIN" once it cannot; a one-time coach line explains: "Nothing here can win. SWAP for new regions,
  and hire stronger staff at the next shop." Exposed as `readoutView.dead`, `sendLabel.dead` and
  `controlsView.swap.beckon`. The deal rule did not change. The novice bot now swaps on a dead deal (the game
  tells it to); the best-send bots always did.
- **C.** Nothing else in the rules or numbers changed. The save is version 3 (it carries the push's misses); a
  version 2 save loads into it exactly.

### The final fix: dead means dead under every seat order, and the push draws where it can be won

The critics replayed it. The three-strike push worked; one notice was wrong: "NO SEND CAN WIN" appeared on deals
the player could win by dragging staff into another order (36.8% of the preview-number buyer's "dead" deals; it
decided two of the four games a critic played to win), and about 40% of best-send CEASEFIREs still gave no
in-turn choice. The lead's refinements, built end to end (reference first, then fixtures, calibration, engine,
simulator, UI, copy, tests, this record):

- **B2. Dead only under every seat order.** `dealState` scores the deal's legal sends under every distinct
  seating (`seat_orders` / `seatOrders`: permutations merged when they score alike, at most 120 for five seats;
  the sends another send beats in every feature are dropped first, so it is fast). 'dead' says NO SEND CAN WIN as
  before; 'reorder' (none wins as seated, one does in another order) says "REORDER STAFF TO WIN" on the readout,
  the staff that sit elsewhere in a winning order beckon, and a one-time coach line says "Drag your staff into a
  new order: this deal can win." The best-send bots act on it (they drag into the best seating, then send); the
  novice does not. The critic's position (CRIT-preview-3, turn 10) is a unit and an end-to-end test.
- **B3. A dead deal says how to end the turn.** Once SWAP cannot help, the lever reads "NO SEND CAN WIN · SEND TO
  PASS" ("· USES A MISS" in the push), on two lines on the unlit lever, and one pin lights it. The coach suggests a
  hire only when a shop follows the turn and an offer is within reach (coins, plus the best sale on a full
  table); otherwise "Nothing here can win. Pin one region and send to move on." (with a swap left: "Nothing here
  can win. SWAP for new regions.").
- **B4.** The coach strip lies along the map's foot when the crisis is in the top third of the map, so it never
  covers the ring or its target.
- **A2. The push's crisis is drawn where it can be won**: from the red regions touching gold where some legal send
  on a fresh deal, with the best seat order, reaches the target; otherwise from any, as before.
- **A3. The lamps read as lives**: "PUSH" over them, "MISSES LEFT" under them, lit gold-white for a miss left,
  red-hatched for one spent; SEND reads "MISS · 2 MISSES LEFT", "MISS · 1 MISS LEFT", "MISS · CEASEFIRE".

Gates, before → after (5,000 games each): G1 62.5% → 62.5%, G2 48.7% → 49.7%, G3 0.0% → 0.0%, G4 0.0% → 0.0%,
G5 99.3% → 99.3%, G6 15 → 15, G7 13.6 → 13.6, G8 17.4 → **18.0** (its limit: the push's crises can now be won, so
long pushes run longer), G9 14.2 → 14.2, G10 65.9% → 65.9%, G11 9.3% → 9.3%, G12 0.6% → 0.6%, G13 8 → 8, G14
44.7% → 56.5% (the preview bot reorders on REORDER STAFF TO WIN), G15 Old Hand 22.2% → 21.8%, G16 Strategist
73.4% → 72.9%, G17 0 → 0: ALL GATES PASS. The TypeScript port (2,000 games) passes them all (G8 17.7) and 1,800
of its games replay identically in the reference.

Honestly, the push's misses are still mostly forced for a best-send player: each of its CEASEFIREs ends on three
deals no seating wins; 26% of sensible CEASEFIREs had SWAP unusable on all three, 17% nothing affordable after
the first miss, 7% both (the critic's own count before A2 was about 40%; this run counts an offer as affordable
when a sale would pay for it). In 21% of push turns nothing red can be won on any deal and the draw falls back to all
red. The choice that decides a push is made at the shops before it, whose red YOUR BEST · NEXT TARGET header
says when the line-up is behind. SPEC sections 1, 16 and 17 carry the numbers.

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

1. **CEASEFIRE.** Decided (A, A2, A3 above): the push forgives two misses, draws its crises where they can be won,
   and its third miss ends the game as a CEASEFIRE (you keep 21-29 regions, ★★ or ★). Open: whether players read
   the lamps as lives (playtests); whether SWAP in the push should draw from a wider pile (it is often empty
   there); whether the game should warn as the last grey region falls when the line-up is behind.
2. **Length.** The model gives 13.6 minutes for a first game (p90 18.0, the gate's limit) and 17.8 for a slow
   first-timer. Should the target be the middle of that, or a touch longer (the 5x/25x ladder adds about a turn)?
3. **The crisis ×2.** "Pin the white ring to double your score" is the first lesson and right about 90% of the time.
   Happy with that as the hook, or should it matter less?
4. **The CROWN demo.** A title button in review builds only, or a permanent "Demo" entry in the menu?
5. **Playtests.** Five timed phone playtests before content lock, with the gate "median 13-17 minutes", before any
   tuning by hand.
