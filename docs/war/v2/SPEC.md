# WIN THE WORLD: build spec (BRINK v2)

This is the build spec for the rebuild. An engineer can implement it from this page, the reference in
`docs/war/v2/reference/`, and the existing code. Every number here is printed by the reference:
`python3 examples.py` (worked examples), `python3 calibrate.py 5000 --write` (simulator gates, in
`reference/RESULTS.txt`) and `python3 fixtures.py` (the cases the TypeScript engine must match, in
`reference/fixtures.json`).

The product name is still read only from `BRAND.name` in `src/config.ts` (`'BRINK'`). "Win the World" is
the game's title line and its only mode. All places, people and things are fictional. There are no
accounts, chat, named leaderboards or anything user-to-user, and there are no runtime network calls.

Contents
1. The goal and the end conditions
2. The rules as the player reads them (final copy)
3. The explanation at the start (three screens)
4. The first game, taught by doing (seed FIRST-WORLD)
5. The turn loop, with every number
6. Scoring, with worked examples
7. The staff and the shop
8. What the map shows and how it animates
9. The screens, on the existing war-room layout
10. The always-visible goal display
11. The menu and the way home
12. Pacing: why a game lasts about 15 minutes
13. Seeds: FIRST-WORLD and the CROWN demo
14. What is cut from the slice, and what each module becomes
15. Engine tests (exact cases and numbers)
16. Simulator gates (exact thresholds) and the results
17. Risks and open questions

---

## 1. The goal and the end conditions

**Goal: turn all 30 regions gold before war holds 10.**

Every region is in one of three states, and colour means ownership and nothing else:

| State | Meaning | On the map |
| --- | --- | --- |
| Grey | free | one neutral grey (no bloc tint), with its number and name |
| Gold | yours, for good: gold never turns back | bright gold fill with a light rim and a soft glow |
| Red | held by war | red fill with 45° hatching, pulsing slowly |

Start of every game: Lantern Key (LNK, the capital in the middle) is gold. War holds 3 joined regions, each
at least 3 joins from Lantern Key. The other 26 are grey. GOLD reads 1/30 and WAR reads 3/10 from the first
second.

The game ends, checked after every turn, in one of three ways:

| End | When | What it means |
| --- | --- | --- |
| **WORLD UNITED** (win) | all 30 regions are gold | the whole map is yours: the owner's "win when the whole map is yours" |
| **WAR** (loss) | war holds 10 or more regions | war took too much |
| **CEASEFIRE** (lesser win) | in the final push (below) a send misses | the war stops where it stands; you keep what you hold (21-29 regions) |

**The final push.** When no grey region is left and war still holds some, crises flare on red regions
touching your gold. A win takes the crisis region back (and more, by the same ladder). A miss ends the game
as a CEASEFIRE. The push is short: in the simulation, 55% of games reach it, it lasts 2 turns at the median,
and 74% of pushes end WORLD UNITED.

**Why this shape.** The judges' first must-fix was that the slice-era design stamped WORLD UNITED with up to
nine red regions still on the map. Here WORLD UNITED means 30/30, always. The game must also always end:
a miss in the push cannot hand war more ground (no grey is left and gold is gold for good), so the push ends
on its first miss. CEASEFIRE is graded with stars on its card so it reads as an honest lesser result:
★★★ is reserved for WORLD UNITED, ★★ for a CEASEFIRE holding 25-29, ★ for a CEASEFIRE holding 21-24.

Every turn decides at least one region (a win turns at least one gold, a miss turns one red, a push miss
ends the game), so no game can stall. In 30,000 simulated games none did, and none ran past turn 25.

---

## 2. The rules as the player reads them (final copy)

This is the "How to play" sheet, word for word (133 words, then the 9-word marks line; `RULES_COPY` and `MARKS_COPY` in
`src/war/ui/app/copy.ts`). One colour word everywhere: gold is yours, red is war, grey is free.

> Turn all 30 regions gold before war holds 10.
> Each turn a crisis flares beside your gold, with a target. Nearby regions light up.
> Pin up to 5 lit regions that touch each other (dashed sea lanes count). Pin the crisis itself to double your score.
> Score: add their numbers, times how many you pinned. Staff then boost it, left to right.
> Once a turn you may swap unpinned lit regions.
> Beat the target: the crisis turns gold for good. Beat it by more, win more regions: your pins first.
> Miss: war takes it. Every 3rd turn, war also spreads by itself, into the red tag.
> Each region won pays 1 coin. Every 2 turns, hire staff.
> No grey left? Crises flare on red: win each to unite the world. Miss one: ceasefire.
>
> ★ capital · ⚓ port: some staff score them. (drawn under the list, with the glyphs)

No player ever has to calculate. The readout says "NEXT REGION AT 4,400 · 620 MORE", the SEND lever says
"WINS 2 REGIONS" or "MISS · SHORT BY 620", and the map puts a gold check on each region a send would win
before SEND is pressed. **Pin it to claim it:** a win takes the crisis, then the regions you pinned that are
not gold yet, then the nearest others (section 5, step 6), so the player decides which regions a big send
takes, and can save the region war is tagged to spread into by pinning it in a win.

---

## 3. The explanation at the start (three screens)

Shown on the first launch, on the real map, before the first turn. Menu > How to play (and HOW TO PLAY on
the title) replays the screens, then shows the rules sheet. Each screen plays its lesson in short beats: the
coach strip (full width, 16 pt, every beat at most 2 lines and 72 characters) says what the map is doing as
it does it, never four rules at once. Copy: `INTRO_COPY` in `src/war/ui/app/copy.ts`; timing: `intro.ts`.

- **Taps.** A tap is listened to once the screen's lesson has played (about 5.1 s, 7.3 s and 8.8 s). A tap
  before then does not leave the screen: it hurries the rest of the lesson at 2x (ending a send that is
  playing), so nobody skips the stakes by accident. The tap-to-continue pill (95, 644, 200, 40) appears when
  the lesson is done: TAP TO CONTINUE, or TRY IT on a first launch's last screen.
- **SKIP** sits in the same foot row (310, 648, 64, 32; 44 pt hit height) and leaves at once; a send
  playing unwinds first, so nothing of it lands on the game.
- **The console wakes with the lesson.** On screen 1 (no crisis yet) the readout and controls rest dimmed
  and blank (TARGET "–", no SEND label). TARGET appears with the ring on screen 2; the rest wakes on the
  first pin.
- The Big Board and its bars are live throughout.

**Screen 1: the goal**

> Win the world: turn all 30 regions gold before war holds 10.
> Gold is yours. Red is war: it holds 3 already. Grey is free.

The map is the plain world at rest: every region named, nothing lit, no ring. Lantern Key gold; Dunmarrow,
Orrinth and Floe End red.
- 0.3 s: GOLD 1/30 glows; a shockwave from Lantern Key.
- 1.0 s: a 1.2 s gold wave rolls out from Lantern Key over all 30 regions and fades back (the goal, shown
  before it is explained); the GOLD bar fills to 30 and empties with it, a step at a time (never rolling
  through impossible counts).
- 2.6 s: the second beat; WAR 3/10 glows; the three red regions flash twice.

**Screen 2: the turn**

> Each turn a crisis flares by your gold: the white ring. Beat its target.
> Pin lit regions that touch each other (dashed lanes count). Up to 5.
> Add their numbers, times how many you pinned. The crisis doubles it.
> 33 × 8 = 264. That beats 64 by plenty: 2 regions.

- 0.0 s: the white crisis ring drops on Shoal with its target "64" and a small "×2" chip; TARGET 64 shows.
  Ten regions light one by one: Lantern Key, Pebbleby, Tern Isle, Gullrest, Driftholm, Lintel, Marram,
  Morrow Downs, Kelpmouth, Tallowmere.
- 1.9 s: a ghost finger pins Shoal, Lantern Key, Pebbleby, then Marram across the dashed sea lane. White
  threads snap between the pins. The console wakes on the first pin; with the second, the third beat says
  "add their numbers, times how many" while both boxes pulse (POINTS and MULTIPLIER are those two things).
  The readout counts 7 × 2 = 14, 17 × 4 = 68, 23 × 6 = 138, 33 × 8 = 264; the SEND sub-label turns from
  "MISS" to "WINS 1 REGION" to "WINS 2 REGIONS", and gold checks appear on Shoal and Pebbleby.
- The last beat names the result: 264 against 64, 2 regions.

**Screen 3: the outcome, played as the game plays it**

> Beat it: the crisis turns gold for good. Beat it by more: your pins too.
> Miss: war takes it. Every 3rd turn war also spreads, into the red tag.
> Staff boost your score. Hire them every 2 turns.

- The four-pin send plays through the real director at 2x: scan line, flying numbers, slam, the score into
  the ring, then gold ink floods Shoal, then Pebbleby (a pin). GOLD 1/30 becomes 3/30.
- The scene rewinds (a 300 ms cross-fade, labelled "AGAIN: SHOAL ALONE") and Shoal alone (14) is sent as turn 3,
  resolved by the engine like any send (the readout keeps the lesson's TARGET 64): a miss, red
  ink runs into Shoal (WAR 4/10), then a drum and war spreads by itself into Pebbleby, the region the tag
  ("WAR · THIS TURN") moved to as soon as the miss was pinned (with Shoal red, Pebbleby is the grey region
  touching war nearest your gold). WAR 5/10. The tag then sits on war's next target reading "WAR · THIS TURN"
  (never turn 4's numbers).
- Last beat ("AGAIN, WITH STAFF", cross-faded): the same four pins, and a ghost desk lamp in seat 1 (a dashed
  rim, 55%, no glow, before and after its pop) lands its "+4": the multiplier flips 8 to 12. The empty rail
  reads "STAFF · HIRE AFTER TURN 2"; on TRY IT the ghost fades out over 300 ms.
- The foot row (the pill and SKIP) sits on an opaque band of the table colour over the bottom row of the map,
  so no region name shows through or is cut by it.
- TRY IT starts turn 1 on this same map.

---

## 4. The first game, taught by doing (seed FIRST-WORLD)

The first game on a device uses seed `FIRST-WORLD` (section 13). Turns 1-2 and the first shop are fixed;
the coach strip (the existing `Coach.tsx`) shows one line at a time. All later games are random and
uncoached apart from the one-time lines below.

**Turn 1.** Target 64. Crisis: Shoal (7, port). Lit: Lantern Key 10★ (gold), Pebbleby 6⚓, Tern Isle 5⚓,
Gullrest 3⚓, Driftholm 4⚓, Lintel 6⚓, Marram 10★⚓, Morrow Downs 7⚓, Kelpmouth 5⚓, Tallowmere 10★. SWAP is
disabled on turn 1. Each step enables only what it names.

| Step | Coach line | What the player does | What the screen shows |
| --- | --- | --- | --- |
| 1 | "Tap the crisis: the white ring." | A finger pulses on Shoal; only Shoal is tappable. | Before any pin the readout says "PIN THE CRISIS FOR ×2". With Shoal: 7 × 2 = 14, "NEED 50 MORE". SEND: "MISS · SHORT BY 50". Shoal hatched red (preview). |
| 2 | "Now a lit region touching it." | Lantern Key, Pebbleby and Lintel breathe; the rest lose their glow. | With Lantern Key: 17 × 4 = 68. SEND: "WINS 1 REGION". A gold check on Shoal. |
| 3 | "68 beats 64. Shoal will turn gold." (2.2 s, read in full), then "More pins score more. Up to 5." | Any lit region touching a pin can be added. | With Pebbleby: 138. With Marram (over the dashed lane): 264, "WINS 2 REGIONS", a gold check on Pebbleby too. With Tern Isle: 380. |
| 4 | when "WINS 2" first shows: "Beat it by more: win more regions. Your pins go first." (3 s, read in full) Then "SEND." | The SEND lever beckons. | |
| 5 | after the send: "Gold is yours for good. Each region won pays ◆1." | | Cascade; Shoal, then Pebbleby flood gold. GOLD 3/30. Coins 4 → 6. |

Turn 1 has 137 legal sends; 100 of them win; 40 win 2 regions; the median scores 145; the best is 390
(Lintel + Marram + Pebbleby + Shoal + Tallowmere). Without the crisis, the five biggest neighbours (Lantern
Key + Pebbleby + Tern Isle + Gullrest + Driftholm) score only 140: the crisis x2 is the lesson.

Pin it to claim it, on this deal: Shoal + Lantern Key + Lintel + Tallowmere also scores 264 (WINS 2), and it
wins Shoal, then the pinned Lintel, not Pebbleby (nearer, but not pinned).

From turn 1 the red tag "WAR · 3 TURNS" sits on Marram, where war will spread after turn 3 (section 8).

**Turn 2.** Target 96. Crisis: Tern Isle. Lit: Lantern Key, Shoal and Pebbleby (gold if turn 1 went as
coached), Gullrest, Morrow Downs, Rimeholt, Edda Vale, Ashkettle, Driftholm, Glassmoor. SWAP is enabled.
- Coach at the start: "Gold regions can be pinned too." (3.5 s), then "Once a turn, SWAP brings new regions.
  Your pins stay." (4 s) while SWAP beckons.
- One-time line when the live score is within 10% below the next mark: "Close to the next region. Try other pins."
- Facts the tests assert: Tern Isle + Lantern Key + Pebbleby + Shoal + Gullrest = 310 (WINS 1, next
  region at 384); Tern Isle + Morrow Downs + Edda Vale + Lantern Key + Pebbleby = 380 (WINS 1); Tern Isle +
  Morrow Downs + Edda Vale + Lantern Key + Shoal = 390, the only one of the 171 legal sends that wins 2
  (Tern Isle, then Morrow Downs). After it: GOLD 5/30, coins 8.
- If turn 1 missed, Shoal is red and is skipped; the scripted list tops up from the turn's pile.

**First shop (after turn 2).** Fixed offers: Duty Officer ◆3, Quartermaster ◆3, Harbourmaster ◆6.
Coach: "Hire staff. They boost every send. The number shows by how much." The cards' preview lines read
(best send of the turn just played, rescored):

| Card | Preview line |
| --- | --- |
| Duty Officer | 390 → 702 |
| Quartermaster | 390 → 590 |
| Harbourmaster | 390 → 2,343 |

(Duty Officer and Quartermaster together: 390 → 1,062.) With 8 coins the player can take the Harbourmaster
or both cheap ones: a real choice, with the numbers in front of them. On the first send after a hire, the
new staff's rail hop and its fly label are drawn 1.5x larger with a gold underline ("+4 · new"), so the jump
is attributed to the hire.

**Turn 3 onward** is dealt by the game's own seeded streams. Coach at the start of turn 3: "Every 3rd turn war
spreads into the red tag. Pin it in a win to save it." After turn 3, war spreads (Marram, unless the player
has won it; pinning Marram in a winning send claims it, and the tag hops to where war will go instead).

**Coach timing.** Teaching lines (turn 1's "68 beats 64", "Beat it by more", turn 2's two lines, the first
shop's lines) stay their whole time: a queued line waits and a tap does not end them. Other timed lines
stay at least 1.8 s. Shop lines are dropped when the shop is left.

**Coach lines in every game** (one-time lines show once per device, in any game):

| Trigger | Line |
| --- | --- |
| first MISS preview with SWAP usable and 5 pins down or nothing lit that can be added (one-time) | "Short? SWAP brings new regions. Your pins stay." (SWAP beckons) |
| a dealt turn (or a swap) where no legal send can beat the target, with SWAP usable | "No send wins this deal. SWAP brings new regions." (SWAP beckons) |
| the same with no swap left | "No send can win this turn: war will take the crisis." (in the push: "...: a miss now is a ceasefire.") |
| first miss sent (one-time) | "War took it. Ten red and you lose." |
| war spreads by itself, every time, in every game | "War spread to Marram by itself." (the region named, said with the spread's drum; it holds through the red ink and the next deal clears it) |
| the first shop offering a port or capital staff, or the Herald (one-time) | "⚓ marks a port, ★ a capital. Some staff score them." |
| first shop that opens on a full table with offers left (one-time, read in full) | "Full table. Tap a seat to replace it." |
| first shop whose header says the line-up is behind (one-time, read in full) | "Behind: your best last turn would miss the next target. Hire to catch up." |
| first time a + multiplier staff sits right of a × staff (one-time) | "Order matters: + multiplier staff work best left of × staff. Drag to reorder." |
| first deal (after the coached turns) where your own gold touches the crisis but is not lit (one-time) | "Only lit regions can be pinned. SWAP brings others." (SWAP beckons; with no swap: "Only lit regions can be pinned, even your own gold.") |
| first Deputy seated (one-time) | "The Deputy copies whoever sits to its right." |
| first final push (one-time) | "No grey left. Win back the red. One miss: ceasefire." |
| first WAR at 8 or more (one-time) | "Two more red and the war wins." ("One more red and the war wins." when war went straight to 9) |

---

## 5. The turn loop, with every number

Every tunable is in `reference/rules.py` (`P` and `STAFF`); this section restates them.

**Start.** Lantern Key gold; war 3 joined regions placed by the `war` stream (the first anywhere at least 3
joins from Lantern Key, each next one a random grey neighbour of war at least 3 joins from Lantern Key);
coins ◆4; 5 empty seats; turn 0.

**Each turn t = 1, 2, 3 ...**

1. **CRISIS (1.3 s).** Target T(t) = 64 × 1.5^(t-1), rounded to 2 significant figures (halves up):

   | t | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
   | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
   | T | 64 | 96 | 140 | 220 | 320 | 490 | 730 | 1,100 | 1,600 | 2,500 | 3,700 | 5,500 | 8,300 |

   | t | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 |
   | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
   | T | 12,000 | 19,000 | 28,000 | 42,000 | 63,000 | 95,000 | 140,000 | 210,000 | 320,000 | 480,000 | 720,000 | 1,100,000 | 1,600,000 |

   The crisis region is drawn by the `crisis` stream from: grey regions touching gold; if none, any grey
   region; if no grey region is left, red regions touching gold (the final push; such a region always exists).
2. **DEAL (1.2 s).** The pile is every region that is not red and not the crisis, within 3 joins of the
   crisis (land, causeway or sea lane), shuffled by the `deal` stream. The first 10 light. If none of the 10
   touches the crisis, the first pile region that does swaps places with the 10th. The crisis region is
   always lit too (it is the 11th lit region). If the pile has fewer than 10, all of it lights.
3. **PIN.** Pin 1-5 lit regions (the crisis counts as one) that form one touching group (land border,
   island causeway or dashed sea lane).
   - Tap rule: a lit region can be pinned if nothing is pinned yet or it touches a pin; with 5 pins, nothing
     more can be pinned. While at least one pin is down, lit regions that cannot be added lose their pin
     socket's glow at once (socket 45%, number 75%, name 62%) and a grey or red plate drops to the dark tone;
     gold is never dimmed.
   - Lift rule: tapping a pin lifts it, plus every pin no longer touching the group that holds the earliest
     remaining pin (pins are kept in tap order).
   - The readout, the SEND sub-label and the map preview update on every tap.
4. **SWAP (optional, once a turn).** Every lit region that is not pinned (the crisis excepted) goes dark and
   to the bottom of the pile; as many regions light from the top. Pins stay. If the pile was short, regions
   that just went dark come back.
5. **SEND.** Score the pins (section 6). The cascade takes 3.5-8 s and can be skipped with a tap.
6. **OUTCOME.**
   - **Win** (score ≥ T): regions won = the number of marks the score reaches: T, 4T, 16T, then each mark
     double the last (32T, 64T, 128T ...). No cap (but never more regions than are left to win).
     **Pin it to claim it.** The regions are claimed in this order:
     1. the crisis region;
     2. then the pinned regions that are not gold, nearest the crisis first;
     3. then, if the send wins more regions than that, the nearest other regions that are not gold.

     "Nearest" counts joins from the crisis (land, causeway or sea lane); at equal distance war's before
     grey, then the higher number, then west, then north (the same tie-breaks in steps 2 and 3). So a
     player decides which regions a big send takes, and can save the region war is tagged to spread into
     by pinning it in a winning send. ◆1 per region won.
   - **Miss** (score < T): the crisis region turns red. In the final push, a miss ends the game: CEASEFIRE.
7. **WAR SPREADS** after turns 3, 6, 9 ... (not after a turn that ended the game, and not once war holds 10):
   war takes one grey region
   touching war, the one nearest your gold (fewest joins to any gold region), then the higher number, then
   west, then north. Nothing happens if war holds no region or no grey region touches war.
8. **OLD HAND** grows: +0.2 at the end of every turn it is seated.
9. **CHECK.** War holds 10 or more: WAR. All 30 gold: WORLD UNITED. (CEASEFIRE was set in step 6.)
10. **SHOP** after turns 2, 4, 6 ... unless the game ended (section 7). NEXT TURN starts turn t + 1.

---

## 6. Scoring, with worked examples

**Formula.** SCORE = POINTS × MULTIPLIER, rounded down, built in this order (which is also the animation order):

1. Each pin, west to east (by x, then y): +its number (3-10) to POINTS and +1 to MULTIPLIER.
2. Each staff, seat 1 to 5 (a Deputy fires as the staff to its right). A per-region staff (Governor,
   Harbourmaster, Sovereign) fires once per matching pin, west to east, each firing its own pop from the
   region on the map.
3. The crisis region pinned: ×2 MULTIPLIER (applied last).

**Arithmetic, exactly as the engine does it.** POINTS is a whole number (BigInt). MULTIPLIER is held in
tenths, M10 = 10 × multiplier (BigInt). +4 is M10 + 40; ×1.5 is M10 × 15 ÷ 10 floored; ×2 is M10 × 2; ×3 is
M10 × 3; Old Hand ×1.8 is M10 × 18 ÷ 10 floored. Every step floors to a tenth. SCORE = POINTS × M10 ÷ 10,
floored. The MULTIPLIER box prints a whole multiplier whole ("8", "12": times how many) and one decimal
otherwise ("40.5"); the engine's `formatM10` keeps one decimal for traces and tests.

**The region ladder** at target 1,100: 1 region at 1,100; 2 at 4,400; 3 at 17,600; 4 at 35,200; 5 at 70,400;
6 at 140,800; 7 at 281,600; 8 at 563,200. A score of 1,000,000 wins 8; the next region is at 1,126,400.

### Example 1: FIRST-WORLD turns 1-2 (no staff)
See section 4: Shoal alone 14; + Lantern Key 68 (WIN 1); + Pebbleby 138; + Marram 264 (WIN 2, next region at
1,024: Shoal, then Pebbleby); + Tern Isle 380; best 390; median of 137 legal sends 145. Pin it to claim it:
Shoal + Lantern Key + Lintel + Tallowmere is also 264, and wins Shoal, then the pinned Lintel (Pebbleby is
nearer, but not pinned). Turn 2: 310, 380, then 390 (WIN 2: Tern Isle, then the pinned Morrow Downs).

### Example 2: an ordinary turn 11 (target 3,700), from a real simulated game (seed W56)
Gold (21): Brackwater, Driftholm, Floe End, Frostmere, Glassmoor, Gullrest, Hearth, Kellmark, Kelpmouth,
Lantern Key, Morrow Downs, Marram, Orrinth, Pebbleby, Rimeholt, Shoal, Saltwhite, Tallowmere, Tern Isle,
Wintermast, Wenmoor. War (5): Ashkettle, Brindle Coast, Edda Vale, Northwake, Vessary. Grey (4): Dunmarrow,
Iceward, Lintel, Quillon. Crisis: Lintel. Lit: Lantern Key, Dunmarrow, Marram, Gullrest, Pebbleby, Tallowmere,
Floe End, Orrinth, Driftholm, Wintermast. Seats: 1 Quartermaster, 2 Duty Officer, 3 Strategist, 4 Governor,
5 Harbourmaster.

Best send, Marram + Lintel + Floe End + Tallowmere + Orrinth:

| Step | POINTS | MULTIPLIER |
| --- | --: | --: |
| pins: Marram +10, Lintel +6, Floe End +7, Tallowmere +10, Orrinth +7 | 40 | 5.0 |
| seat 1 Quartermaster +20 points | 60 | 5.0 |
| seat 2 Duty Officer +4 | 60 | 9.0 |
| seat 3 Strategist ×3 (5 pins) | 60 | 27.0 |
| seat 4 Governor ×1.5 from Marram, Floe End, Tallowmere, Orrinth (gold) | 60 | 40.5, 60.7, 91.0, 136.5 |
| seat 5 Harbourmaster ×1.5 from Marram, Lintel, Floe End, Orrinth (ports) | 60 | 204.7, 307.0, 460.5, 690.7 |
| crisis Lintel pinned ×2 | 60 | 1,381.4 |
| **SCORE** | | **82,884** |

82,884 is 22.4x the target: WIN 3 → Lintel, Dunmarrow (1 join), Brindle Coast (4 joins, war's, before grey
Iceward at the same distance). Every pin but the crisis is already gold, so the regions beyond Lintel are the
nearest others. The other choices on this deal:

| Send | Score | Result |
| --- | --: | --- |
| Lintel + Tallowmere (crisis and one neighbour) | 972 | MISS |
| Pebbleby + Marram + Lantern Key + Driftholm + Floe End (five gold, no crisis) | 59,052 | WIN 2 |
| Lintel + Dunmarrow + Floe End + Tallowmere + Orrinth (through grey Dunmarrow) | 32,542 | WIN 2 |
| the best send with Duty Officer moved to seat 5 | 46,428 | WIN 2 |
| the best send with Quartermaster moved to seat 5 (points adders can sit anywhere) | 82,884 | WIN 3 |
| the best send with no staff | 400 | MISS |

56 legal sends; the median scores 2,006 (the best is 41x it); 21 of the 56 win.

### Example 3: the Crown, the break (turn 14, target 12,000)
Same map. Seats: 1 Duty Officer, 2 Deputy (copies seat 3), 3 Sovereign, 4 Harbourmaster, 5 Herald (every pin
counts as a capital and a port). Same five pins:

| Step | POINTS | MULTIPLIER |
| --- | --: | --: |
| pins | 40 | 5.0 |
| seat 1 Duty Officer +4 | 40 | 9.0 |
| seat 2 Deputy as Sovereign: ×2 from each of the 5 pins | 40 | 288.0 |
| seat 3 Sovereign: ×2 from each of the 5 pins | 40 | 9,216.0 |
| seat 4 Harbourmaster: ×1.5 from each of the 5 pins | 40 | 69,984.0 |
| crisis ×2 | 40 | 139,968.0 |
| **SCORE** | | **5,598,720** |

That is 466x the target: WIN 7 → Lintel, Dunmarrow, Brindle Coast, Iceward, Edda Vale, Ashkettle, Vessary.
Four of war's five regions turn gold in one send. With the Deputy in seat 3 instead (copying the
Harbourmaster): 1,328,576, WIN 5. With no Deputy: 174,960, WIN 2. Five 10-point pins (the crisis among them)
with this line-up score 6,998,400.

### Example 4: where wins and war go (Example 2's map, crisis Lintel)
With the best send's pins (all gold but the crisis): WIN 1: Lintel. WIN 2: + Dunmarrow. WIN 3: + Brindle
Coast. WIN 5: + Iceward, Edda Vale. WIN 8: + Ashkettle, Vessary, Northwake. Pins that are not gold go first:
with Vessary and Northwake (war's, 5 joins each) pinned, WIN 4 takes Lintel, Vessary, Northwake, then
Dunmarrow. A miss: Lintel turns red (war 5 → 6). War spreading by itself on this map goes to Iceward
(touches Brindle Coast, 1 join from gold Marram), not Quillon (2 joins from gold).

### Example 5: the final push
No grey left; war holds Edda Vale, Ashkettle, Quillon (27/30 gold). Crises can flare on any of the three
(each touches gold). A win of 2 on Edda Vale (no other red pinned) takes Edda Vale, then Ashkettle; a win of 3 takes all three:
WORLD UNITED. A miss: CEASEFIRE, 27 of 30, ★★.

---

## 7. The staff and the shop

Ten staff, at most one of each. Each rule is 8 words or fewer and printed on the card exactly. Every icon
already exists in `src/war/ui/icons/staff`. The chip is the seat label (8 pt, the colour of what it adds:
cyan for points, amber for multiplier).

| id | Name | Icon object | Price | Sells | Rule (printed) | Chip |
| --- | --- | --- | --: | --: | --- | --- |
| DUTY | Duty Officer | desk lamp | ◆3 | ◆1 | "+4 multiplier." | +4 |
| QM | Quartermaster | supply crate | ◆3 | ◆1 | "+20 points." | +20 |
| SURVEYOR | Surveyor | theodolite | ◆4 | ◆2 | "+1 multiplier for every 3 regions you hold." | +n (live: gold ÷ 3) |
| OLDHAND | Old Hand | tin mug | ◆4 | ◆2 | "×1 multiplier. Grows by 0.2 every turn." | ×n.n (live) |
| SOVEREIGN | Sovereign | signet ring | ◆5 | ◆2 | "×2 multiplier for each capital pinned." | ×2 CAPITAL |
| STRATEGIST | Strategist | folded map | ◆5 | ◆2 | "×3 multiplier if you pin 4 or 5." | ×3 IF 4+ |
| GOVERNOR | Governor | wax seal | ◆6 | ◆3 | "×1.5 multiplier for each gold region pinned." | ×1.5 GOLD |
| HARBOUR | Harbourmaster | ship's bell | ◆6 | ◆3 | "×1.5 multiplier for each port pinned." | ×1.5 PORT |
| HERALD | Herald | paper crown | ◆6 | ◆3 | "Every pin counts as a capital and port." | ALL PINS ★ ⚓ (two lines) |
| DEPUTY | Deputy | carbon paper | ◆7 | ◆3 | "Copies the staff to its right." | COPY (→ name of what it copies) |

Rulings:
- Surveyor counts gold regions held when SEND is pressed (before the outcome).
- Old Hand starts at ×1.0 when hired, +0.2 at the end of every turn it is seated; selling it resets it.
  A Deputy copying it multiplies by the same value.
- A Deputy at the far right, or copying the Herald, does nothing. Copying a per-region staff fires once per
  matching pin again.
- The Herald is passive; with it seated every pin fires the Sovereign and the Harbourmaster.
- The crisis region counts as a pin for the Strategist and the per-region staff (it is never gold).

**Money.** Start ◆4. ◆1 per region won. Nothing else pays: no interest, no per-turn income.

**The shop** opens after turns 2, 4, 6 ... (about 7 visits a game) in the existing Briefing tray:
- 3 offers drawn by the `shop` stream, uniformly among staff not seated.
- Buy into the leftmost free seat. With 5 seats full, tapping an offer you can afford (counting the sale)
  makes each seat show a tag with the preview number if that seat were replaced; tap a seat to replace it
  (the old staff sells for half), or tap the card again to cancel.
- Sell: tap a seated staff, then SELL ◆n in its balloon. Half the price, rounded down.
- Reroll: ◆2, then ◆3, ◆4 ... within the same visit.
- Drag seats to reorder (the rail is visible above the tray).
- **The preview number** on every card: "BEST LAST TURN 390 → 2,343". The engine (`bestLastTurn`) rescores the
  turn just played: every send its deal offered (its crisis and its lit regions as first dealt and as they
  stood at SEND, after a swap), on the map as it was when SEND was pressed (a crisis is never gold while
  pinned, so a crisis just won does not count for the Governor), with the line-up as it is and with that staff
  added to the first free seat, or in place of the seat you would replace. It prints the best send's score
  before and after: played as the best send, the left number is the score the player just saw. It is computed
  by enumerating those groups (at most a few hundred) with the fast scorer. In the simulation a bot that
  follows only this number keeps the world in 44.4% of games (the reference's own preview bot, which rescores
  the opening deal on today's map, 44.7%); a bot that never shops keeps it in none.
- **Behind.** When the line-up's best last turn (the cards' left number) would miss the next target, the
  header says so in red: "YOUR BEST 2,926 · NEXT TARGET 5,500", a turn before the misses come (in the
  simulation 17-22% of shops; every lost game showed it at least once).
- When no offer is affordable even after a sale, the NEXT TURN button pulses at once.
- Long-press an offer: the map lights where it acts (ports, capitals or your gold).

**Why scores explode.** Per-region staff multiply once per matching pin, so five matching pins give ×7.6
(×1.5) or ×32 (×2). The Governor turns territory into multiplier: the more of the map is gold, the more of
each deal is gold. The Herald makes every pin match the Sovereign and the Harbourmaster; a Deputy squares
whatever it copies. In the simulation 8% of sensible games have a send over 1,000,000 and 7.2% have a send
that wins 5 or more regions; the maximum seen was 14,096,793.

---

## 8. What the map shows and how it animates

The map is the finished canvas renderer (`src/war/ui/map/*`) with ownership added. Durations are at 1x; 2x,
4x, tap-to-skip and reduced motion work as now.

**Palette** (`palette.ts`):

| Thing | Colour |
| --- | --- |
| Gold (yours) | fill #F2D27A at 85%, rim 1.5 pt #FFE9A8, soft glow, 6 s shimmer; the same at every level: gold is never dimmed |
| Red (war) | fill #E0483C at 75%, 45° hatching 2 pt #7A1E17 every 6 pt, 4 s pulse of ±10% brightness |
| Grey (free) | one neutral slate #83868A (HSL saturation ≤ 0.05, no bloc hue) brought to three luminance levels: lit 0.15 (in this turn's deal), rest 0.105 (no deal on the table: the title, intro screen 1, between turns, the shop, the end cards), dark 0.055 (left out of a deal on the table) |
| Crisis ring | white #F4F1E8, 2.5 pt, amber (#FFB547) outer glow, 1.6 s pulse (was red) |
| Threads between pins | white #F4F1E8 at 90% (was #E0483C) |

Red appears only for war: war regions, the WAR count and bar, MISS labels. The three states differ by
brightness as well as hue, so the map reads in sunlight, in greyscale and for colour-blind players
(palette and scene tests check gold > grey > red-hatch at every level, and that every grey tone is neutral).
The five blocs of the map carry no colour and no glyph on the map: they are content identity only.

**Always on the map**
- The crisis ring with its target badge ("1,100", 13 pt, on a dark chip by the ring) and a "×2" chip on the
  ring that lights when the crisis is pinned. The chip slides along the ring (up to 42 pt sideways) to stay
  clear of the neighbours' names.
- Every region shows its number (with ★ capital, ⚓ port) and its name. Lit regions are bright with a pin
  socket. With a deal on the table, regions left out of it are dark (names at 42%); with no deal on the
  table the whole world rests at the rest tone, every region named (gold 90%, grey and red 72%). The scene
  cross-fades between the two over 260 ms when a deal arrives or the table clears.
- **The war tag:** the region war will spread to next (the engine's `warSpreadTarget`) has a red dashed
  outline and a tag (11 pt caps). While choosing: "WAR · 3 TURNS", "WAR · 2 TURNS", "WAR · THIS TURN".
  Between turns (the outcome, the shop) it counts from the coming turn: "WAR · IN 2 TURNS", "WAR · NEXT
  TURN"; it stamps to the choosing wording when the next deal lights. On a spread turn the tag shows where
  war would go if SEND went now (wins turned gold, or a miss turning the crisis red) and hops there as the
  pins change: pinning the tagged region in a winning send moves the tag to war's next choice. No tag when
  war cannot spread. Every move of the tag is a 300 ms arc hop, and a new count stamps in.

**While choosing (every tap, instant)**
- Pins drop with the existing thock; white threads snap along the joins between pins (dashed for sea lanes).
- Lit regions that cannot be added lose the glow of their socket (45%), number 75%, name 62%, and a grey or red
  plate drops to the dark tone. Gold is never dimmed: a gold plate keeps its fill, number and name at 100%.
- WIN preview: a gold check chip on each region the send would win (pin it to claim it: the crisis, your
  non-gold pins, then the nearest others); a war region that would be won back shows gold-over-red stripes.
  No numerals: the only numbers on the map are the regions' own and the ring's target.
- MISS preview: the crisis region hatched red; the WAR bar's next segment blinks; in the push, the board
  shows "CEASEFIRE" ghosted.
- Ghost segments on the GOLD and WAR bars show the outcome before SEND.

**On SEND** (the existing director, with fewer event kinds):
1. 150 ms dim (grey and red only: gold is never dimmed); a scan line sweeps west to east, its small pointer
   at the map's top edge only while it sweeps; each pin flashes and flings "+n" into POINTS.
2. Each staff hops on the rail and flings its "+20", "+4", "×3" into the boxes. A per-region staff pops
   "×1.5" or "×2" from each matching region on the map (150 ms each, a shudder on every ×).
3. The crisis ring stamps "×2" (300 ms) when pinned.
4. The 200 ms slam, sized by score ÷ target. At 16x or more (three regions on the ladder: `SHOWCASE_AT`) the
   showcase plate and the gold bloom play. The showcase number sits in the half of the map away from the
   crisis, never over the ring or its chip; its dark plate fades in 80 ms after the number.
5. **The score flies from the readout (or the showcase) into the crisis ring (300 ms)**, and the ring catches
   it: it swells 25% and its chip turns to a gold check on a win (a red cross on a miss), holding 160 ms
   (`CATCH_MS`), before it collapses. A skipped send still shows the verdict.

A send that changes little (a miss, or one region under 4x) plays brisk: its beats at 1.6x with a 300 ms plate
hold. Big sends, the showcase and the coached first game's turns 1-3 keep full length.

**Outcome: WIN** (1.0 s for the crisis + 0.5 s per further region, capped at 5 s):
- the ring collapses (300 ms), a white shockwave rolls from the crisis (600 ms, existing);
- `inkSpread` in gold floods the crisis (600 ms); ink starts at the plate's edge nearest its source, so a
  region changes colour the moment its ink starts;
- each further region, in claim order: a gold pulse travels along the shortest chain of joins from the crisis
  (150 ms a join), leaving a lit gold thread (4 pt, white core) that stays 0.9 s after it arrives, so a long
  jump reads; then gold ink floods it (400 ms); a red region won back wipes red to gold with a white edge flash
  and a deeper chord;
- with every region: the GOLD flap ticks, one GOLD bar segment fills, one coin flies to the coin chip (90 ms).

**Outcome: MISS** (0.8 s): no slam flourish; the drone dips; a red pulse crosses the border, then red ink
runs from the nearest war region into the crisis from the shared border (700 ms), or blooms from its centre if
no war region touches it; the WAR flap ticks, a WAR bar segment fills, a 2 px shake. The miss's red hatch stays
on the crisis through the cascade and its ink, so it never reads as safe.

While the outcome plays, the pin threads step back to 35%: the gold paths a win travels along are drawn in
saturated gold with a soft glow and a light dash running towards the region won, never like a white thread.

**War spreads by itself** (after turns 3, 6, 9 ..., 0.5 s after the outcome): a low drum, a red pulse crosses
the border (150 ms), then red ink runs from the touching war region into the tagged region from the shared
border (700 ms); the tag stays on it reading "WAR · NOW" until the ink has run, then hops to the next target.
The WAR count and bar tick. The coach says "War spread to Marram by itself." (the region named).

**Endings** (from the ending's first beat the readout says how the game ended, "WORLD UNITED 30/30",
"CEASEFIRE 26/30" or "WAR 10/10", the boxes and the score plate clear, and SEND rests blank)
- WORLD UNITED, the loudest beat in the game: the sunrise sweep from the east; then "WORLD UNITED" slams over
  the map in gold stencil ("30 OF 30 · THE WORLD IS GOLD" under it), in the half away from the last region won,
  with the gold bloom and a 6 px shake, while a gold wave pulses every region outward from the last one won over
  a rising run of 12 notes and the game's longest haptic (`UNITED_BUZZ`); the GOLD count glows and a shimmer
  runs the full bar. The stamp lifts and the all-gold world holds alone for 1.5 s before the card.
- CEASEFIRE: the red regions' outlines flash once (900 ms) and red fades to its ceased tone over 600 ms (the
  war stops where it stands), with a soft haptic (40, 80, 40 ms); the WAR bar freezes in the ceased tone,
  stamped "STOPPED"; gold stays lit.
- WAR: `lightsOut` over grey regions only (2 s); gold stays lit (it was yours for good), red pulses once; a
  heavier haptic (`WAR_ENDING_BUZZ` 120, 60, 120, 60, 300 ms) than an ordinary miss. The free regions the card
  names (3 or fewer left) never go dark: they stay lit, outlined in marching gold from the first moment.

**Reduced motion** resolves a send in about 1.1 s. Its sounds are thinned: one pin note, one multiplier note
at the climb's top pitch, the slam, and nothing repeating within 120 ms (`CALM_GAP_MS`).

---

## 9. The screens, on the existing war-room layout

Portrait 390 x 844, the existing frame; desktop and Steam letterbox the same frame, as now. Rects are
x, y, w, h. Background #0B0F14 with the 6% vignette.

**Title.** `BRAND.name` large (as now), "WIN THE WORLD" under it (14 pt caps, gold). Buttons, stacked at
x 24, w 342: PLAY (or CONTINUE when a saved game exists, with NEW GAME under it; over a game in progress NEW
GAME asks once, "START A NEW GAME? Your game in progress will be lost." KEEP MY GAME / NEW GAME), HOW TO PLAY, and in review
builds only CROWN DEMO (section 13). A first launch goes PLAY → intro → FIRST-WORLD. A finished game whose
end card was never seen (the tab was reloaded or killed during the last send) shows CONTINUE "See how your
world ended", which opens straight to its end card. The title's legend: GOLD yours · RED war · GREY free,
with the map's own rest grey as the swatch. The backdrop map is veiled opaque behind the board, the premise and
the legend (to y 300, clear by y 360), so no map label sits under the title's words. While the title lifts,
its words and buttons fade out (110 ms) before its map does (the title's own fade waits for them), so no two
texts ever cross-fade over each other.

**Intro.** Section 3: the game screen with the coach strip carrying the copy, the tap-to-continue pill and
SKIP in the foot row of the map.

**Game.**

| Rect | What |
| --- | --- |
| 0, 0, 390, 47 | safe area |
| 0, 47, 390, 60 | the Big Board: goal counts, menu, the two bars (section 10) |
| 0, 107, 390, 64 | staff rail, unchanged: 5 seats of 64 x 58 at x 17, 90, 163, 236, 309; tap for the rule balloon; long-press and drag to reorder. With no staff yet it carries a plate "STAFF · HIRE AFTER TURN 2" |
| 0, 171, 390, 520 | the map; the coach strip overlays its top edge when coaching |
| 0, 691, 390, 48 | readout (below) |
| 0, 739, 390, 68 | controls (below) |
| 0, 807, 390, 37 | home indicator |

Readout:
- 16, 693, 170, 20: "TARGET" (11 pt caps, 60% white) then the target (17 pt), e.g. "TARGET 1,100".
- 16, 717, 170, 16 (11 pt): "PIN THE CRISIS FOR ×2" (quieter) before any pin; "NEED 50 MORE" while the pins
  miss; "NEXT REGION AT 4,400 · 620 MORE" once they win (when that is too long, "NEXT REGION 17,600 · 9,820
  MORE", then units); "UNITES THE WORLD" when nothing is left beyond.
- Between turns (from the moment the score is in the ring to the next deal, shop or not) the readout shows
  "NEXT TARGET 96" with no stale line; at an ending it says how the game ended (section 8).
- POINTS box 196, 695, 86, 40 (cyan #5FD4F4) × MULTIPLIER box 300, 695, 74, 40 (amber #FFB547): the existing
  boxes, relabelled, live on every tap; they collide into the score after SEND. A whole multiplier prints
  whole ("8"), a fractional one with one decimal ("40.5"). A decimal is never cut off: one that does not fit
  the box is printed in units, rounded ("1.17K"), and the score plate prints it in full ("36 × 1,165.8 =
  41,968"), so its sum always adds up.

Controls:
- SWAP 16, 745, 104, 56: "SWAP" (15 pt) over "1 left", "used", "no new regions" (the pile is empty) or, locked
  on the coached turn 1, "from turn 2" (10 pt). It beckons when a coach line points at it.
- Coin chip 128, 745, 70, 56: the coin and "◆ 7" (18 pt).
- SEND 206, 745, 168, 56: the brass lever, "SEND" (17 pt) over a sub-label (11 pt) that always says what will
  happen: "WINS 2 REGIONS" (gold), "MISS · SHORT BY 620" (red), "MISS · CEASEFIRE" (red, final push),
  "PIN A REGION" (disabled: unlit pewter-brass, no glow), and, from the moment the score is in the ring,
  "NEXT CRISIS…" or "SHOP…" (off tone), blank at an ending.
- Desktop and Steam keys: Space sends, S swaps, 1-5 select seats (arrows move a selected seat), Esc opens the menu.

**Shop.** The existing Briefing tray rises to 0, 451, 390, 356 over the map; the Big Board and rail stay visible.
- 16, 463: "SHOP · NEXT TARGET 1,600" (13 pt), or, when the line-up is behind (section 7), "YOUR BEST 2,926 ·
  NEXT TARGET 5,500" with YOUR BEST in red.
- Offer cards 16, 485, 110, 180 / 140, 485, 110, 180 / 264, 485, 110, 180: 40 pt icon, name (12 pt), rule
  (11 pt, up to 3 lines), price tag bottom right, and the preview line at the bottom: "BEST LAST TURN" (9 pt
  caps) over "390 → 2,343" (13 pt, the arrow amber).
- REROLL ◆2: 16, 677, 171, 44. NEXT TURN →: 203, 677, 171, 44.
- Receipt (the existing ReceiptPaper): 16, 729, 358, 28: "LAST TURN · WIN 2 · +◆2", plus "WAR SPREAD TO MARRAM" when it did.
- The shop's coach line sits at the map's top edge (not on the tray's lip), so the gold in the middle of the
  map stays visible above the tray. Both sides of a preview arrow use one number format ("3,931 → 4,139", or
  "3.93K → 13.3K" when either is too long).

**End screens.** The map stays in view: the card takes the height of what it says and hangs over the upper
map (24, 182, 342, at most 240), or stands on the lower map (bottom at 686) when the regions it points at (WAR's
free regions that were left, or the red regions a CEASEFIRE leaves outlined) are in the upper half. The console carries on: BEST SEND in the readout band (16, 693, 358, 44: the score and
"39× THE TARGET", or "NEEDED 64" when the best send missed, never "0.0x"); HOME on SWAP's place
(16, 745, 182, 56); NEW GAME on the SEND lever (206, 745, 168, 56; "A NEW WORLD", a new deal in under 2 s).
- WORLD UNITED ★★★: "WORLD UNITED · 30 of 30" (28 pt); "Turn 15 · war peaked at 6"; biggest turn ("7 regions");
  the 5 staff in seat order.
- CEASEFIRE ★★ or ★: "CEASEFIRE · 26 of 30 gold"; "War held 4 regions when it stopped."; staff. The red
  regions stay outlined.
- WAR: "WAR · war took 10 regions. You held 18 of 30." When grey left ≤ 3: "Only N free regions were left to
  win." Those regions stay lit through the lights out, outlined in marching gold. Staff.
- BIGGEST TURN is left out when no region was won; no staff reads "None hired".
- A share image of the final map may be rendered locally (canvas to PNG) for the system share sheet; it carries
  no names and no in-app sharing between users.

---

## 10. The always-visible goal display

The Big Board (0, 47, 390, 60, the existing panel #12161C with split-flap digits) is re-laid out:

| Rect | What |
| --- | --- |
| 16, 50, 150, 26 | "GOLD" (11 pt caps, #F2D27A), then the count as split-flaps: "14" (22 pt) + "/30" (14 pt) |
| 179, 50, 32, 32 | the menu button ≡ (existing component; 44 x 44 hit area) |
| 224, 50, 150, 26 | right-aligned: "WAR" (11 pt caps, #E0483C), then "4" (22 pt) + "/10" (14 pt) |
| 16, 84, 209, 16 | GOLD bar: 30 segments of 6 x 16 pt with 1 pt gaps, filled gold from the left |
| 245, 84, 129, 16 | WAR bar: 10 segments of 12 x 16 pt with 1 pt gaps, filled red from the left; at 8 or 9 the last segments pulse and the drone rises |

Both counts are text, so colour is never the only signal. The bars change one segment at a time in step with
the map, and a count's tiles flip together (9 → 10 never reads "19/10" on the way). No clock, turn number, crisis dots, Summit chip, Leverage, pattern name or in-tray. (The turn number
appears only in the menu sheet and on the end card.) With the readout's target and
the SEND sub-label, the player always sees: how much of the world is gold, how close war is, what this
turn needs, what the pins will do, the coins and the five seats.

---

## 11. The menu and the way home

- The menu button ≡ on the Big Board, the Android/browser back button and Esc all open the existing menu sheet:
  RESUME, HOW TO PLAY (the intro, then the rules sheet with a PRACTICE button that starts FIRST-WORLD),
  SOUND on/off, SPEED 1x/2x/4x, REDUCED MOTION, QUIT TO TITLE.
  The sheet also shows "Turn 9 · next shop after turn 10".
- QUIT TO TITLE asks once: "LEAVE THIS GAME?" with "Your game is saved. CONTINUE on the title picks it up."
  (LEAVE / STAY). The title then shows CONTINUE.
- PRACTICE never loses a game in progress: the game is saved as it stands, and a practice started over it is
  never saved (its quit dialog says "LEAVE PRACTICE? Practice is not saved. CONTINUE on the title picks up your
  game."). Opened from a game, the rules sheet's bright button is BACK and PRACTICE the quiet one. The CROWN
  demo follows the same rule.
- Back while the menu is open closes it. Back on the title does nothing on the web and exits on Android.
- The back button's guard keeps one history entry of its own and never navigates to let go of it: when nothing
  of ours is open it releases the entry logically and takes the same entry up again when needed, and whether
  a popstate is ours is read from `history.state`. So no path (How to play from the title, then CLOSE, the X
  or the scrim; PRACTICE, then QUIT TO TITLE) can ever send the browser back past the game.
- The shop and the end card are inside the game: back opens the menu over them.
- The game saves after every SEND, every shop action and on `visibilitychange` to hidden, to localStorage key
  `brink.war.v2.save` (versioned JSON with BigInts as strings; unreadable saves are discarded). No network.
  A finished game stays saved until its end card has shown, so a reload or a killed app during the last send
  still shows how the world ended (CONTINUE "See how your world ended"); the card being seen clears it.
- HOW TO PLAY from the menu during a send: the send jumps to its end and settles first, nothing of it lands on
  the intro, and a turn that had finished is dealt when the rules sheet closes.

---

## 12. Pacing: why a game lasts about 15 minutes

Time model (`reference/timing.py`), built on the director's real timings plus assumed human decision times
(the slowest of the three judges' constants). It is a model, not a measurement.

| Per turn | Seconds |
| --- | --: |
| crisis flare and board flip | 1.3 |
| deal light-up | 1.2 |
| choosing: 14 s + 2.5 s per pin (4.95 pins on average) | 26.4 |
| swap: 7 s each (0.12 a turn) | 0.8 |
| cascade: 2.7 s + 0.30 per pin + 0.25 per firing staff + 0.15 per region pop, capped at 8 s | 5.4 |
| outcome stamp and coins | 1.2 |
| map recolouring: 0.8 s + 0.5 s a region, capped at 5 s | 1.6 |
| **mean per turn** | **37.8** |

Plus: a shop visit 30 s (8 s when nothing is affordable; 73% of visits have something affordable), about 7 visits
a game; the end card 10 s. A first game adds the intro (25 s) and the coach (15 s on turn 1, 6 s on turn 2,
15 s at the first shop).

| Sensible bot, 5,000 games | median | p10 | p90 |
| --- | --: | --: | --: |
| turns | 15 | 12 | 19 |
| minutes, first-game model | 13.5 | | 16.3 |
| minutes, first-game model, games that keep the world | 14.1 | | 16.8 |
| minutes, practised (no intro or coach) | 12.5 | | 15.2 |
| minutes, slow first-timer (20 s + 3 s a pin, 50 s shops) | 17.7 | | 21.3 |
| minutes, fast player (8 s + 1.8 s a pin, 20 s shops) | 9.1 | | |

Why it lands there: 26 grey regions are a visible clock that both sides use up. A winning send takes 1.6
regions on average (1: 47.6%, 2: 45.5%, 3+: 6.7%), war takes about 4 regions by itself and about 1 by misses,
and 55% of games add a 2-turn final push. Losses come at turns 11-18 (median 15). No game ran past turn 25.
(The time model predates the brisk pacing of section 8, which only shortens small late sends.)

The curve, sensible bot (games still going): turns 1-8 are taught and almost always won (98-100% of sends win:
the shop and war decide the early game); from turn 9 the share of winning sends falls 95% → 87% (turn 11) →
75% (turn 14) → 60-71% (turns 17-21), while war sits at a median of 5-6.

---

## 13. Seeds: FIRST-WORLD and the CROWN demo

The TypeScript engine uses its own seeded generator (`src/engine/rng.ts`), forked into `war`, `crisis`,
`deal` and `shop` streams. It does not need to reproduce Python's random numbers: everything the tests compare
is fixed data (`fixtures.json`) or scripted below.

**FIRST-WORLD** (the first game on a device, and PRACTICE in How to play):
- war: Dunmarrow, Orrinth, Floe End.
- turn 1: crisis Shoal; lit in this order: Lantern Key, Pebbleby, Tern Isle, Gullrest, Driftholm, Lintel,
  Marram, Morrow Downs, Kelpmouth, Tallowmere; the swap pile in order: Brindle Coast, Iceward, Rimeholt,
  Saltwhite, Glassmoor, Hearth, Kellmark, Brackwater (SWAP is disabled on turn 1).
- turn 2: crisis Tern Isle (always in the pool: it touches Lantern Key and cannot be won on turn 1); lit:
  Lantern Key, Shoal, Pebbleby, Gullrest, Morrow Downs, Rimeholt, Edda Vale, Ashkettle, Driftholm, Glassmoor;
  swap pile: Marram, Quillon, Vessary, Brindle Coast, Iceward, Saltwhite, Lintel, Hearth. Red regions in either
  list are skipped and the list tops up from the pile.
- shop after turn 2: Duty Officer, Quartermaster, Harbourmaster.
- from turn 3: the streams seeded with 'FIRST-WORLD'.
- With the coached sends: after turn 1 GOLD 3 (Shoal, Pebbleby), coins 6; after turn 2 GOLD 5 (Tern Isle,
  Morrow Downs), coins 8. War spreads to Marram after turn 3 if it is still grey (pinning Marram in a winning
  send on turn 3 claims it, and war goes elsewhere). In the Python reference the sensible bot goes on to WORLD
  UNITED in 14 turns; the novice bot loses at turn 10.

**CROWN** (review builds: a title button; in all builds: the dev hook `__war.demo('crown')`). It lets the
owner feel the break in the first session. It loads Example 3 exactly: turn 14, target 12,000; the Example 2
map; seats Duty Officer, Deputy, Sovereign, Harbourmaster, Herald; coins ◆6; crisis Lintel; lit Lantern Key,
Dunmarrow, Marram, Gullrest, Pebbleby, Tallowmere, Floe End, Orrinth, Driftholm, Wintermast; swap pile Shoal,
Kelpmouth, Kellmark, Brackwater, Tern Isle, Glassmoor. Pinning Marram, Lintel, Floe End, Tallowmere and Orrinth
scores 5,598,720 and wins 7 regions; the game then continues with streams seeded 'CROWN' (one grey region,
Quillon, and one red, Northwake, are left).

---

## 14. What is cut from the slice, and what each module becomes

**Cut, and why**
- The 11 patterns and their levels: one rule ("pins that touch, times how many") replaces them.
- INFLUENCE × MOMENTUM = LEVERAGE: renamed POINTS × MULTIPLIER = SCORE.
- 4 sweeps and 3 swaps per crisis with a running total: one send and at most one swap per turn, so one
  decision is one outcome on the map.
- The flashpoint scoring twice: it became the crisis region, pinned for ×2, and it is the region that changes.
- Loose pins and "LOOSE" tags: pins must touch.
- 20 staff became 10. Gone: Hotline Operator, Treasurer, Rail Clerk, Mediator, Envoy, Courier, Ferry Master,
  Signals Officer, Admiral, Chief of Staff. Retriggers (AGAIN), standby and per-timing Deputy copies are gone:
  every staff fires once, left to right, per-region staff once per matching pin.
- The 8 Orders, the in-tray, Playbooks, folders: the map changes only through ownership.
- Interest, overwhelm pay, unused-sweep pay: ◆1 per region won.
- Hours, Flare-up/Standoff/Summit, twists (Gridlock, Blackout, Full Table), the 22:00-to-01:00 clock and
  "survive till dawn": the goal is the map; escalation is the target curve and war.
- Traffic threads, brass pins, influence glow: threads only between current pins (white); no brass pins.
- The CLEARS lamp: the SEND sub-label. The Late Shift and Mid Shift sandboxes: the CROWN demo.

**Kept as identity, not rules:** the five blocs (content only: no tint and no glyph on the map), ★ capitals
and ⚓ ports (three staff use them), region numbers 3-10, the map (unchanged). Brass pins on won crises are
cut: they meant nothing a player could act on.

**Module by module** (no file outside `docs/war/v2/` was changed by this design)

| Module | Becomes |
| --- | --- |
| `src/war/content/map.json`, `map.ts` | unchanged |
| `src/war/content/staff.ts` | 10 rows: id, name, object, price, rule, chip (section 7); `rarity` and `timing` columns removed |
| `src/war/content/orders.ts`, `patterns.ts` | deleted |
| `src/war/engine/board.ts`, `hash.ts`, `format.ts` | kept (`formatShort`, `formatM10`, `formatFunds`) |
| `src/war/engine/deck.ts` | kept for the seeded shuffle; the deal becomes "non-red within 3 joins of the crisis" |
| `src/war/engine/patterns.ts` | becomes `groups.ts`: `touching`, `legal`, `groups`, `canAdd`, `lift` (port of the Python) |
| `src/war/engine/score.ts` | rewritten: pins, seats, crisis ×2, trace (section 6) |
| `src/war/engine/run.ts` | rewritten: `newGame(seed, {firstWorld, demo})`, `pin`, `unpin`, `swap`, `send`, `buy(slot, replaceSeat?)`, `sell`, `reroll`, `moveSeat`, `nextTurn`; ownership, outcome, war spread, final push, ends |
| `src/war/engine/shop.ts` | simplified: 3 offers, buy/replace, sell, reroll, `previewNumber(state, offer, replaceSeat?)` |
| `src/war/engine/view.ts` | `goalView` (gold, red, grey, warNext {region, turns}, the tag's words), `regionViews` (owner, preview in claim order, lit/dark, pinned, capital, port), `readoutView`, `sendLabel`, `shopView`, `endView` |
| `src/war/engine/orders.ts`, `hours.ts`, `draft.ts` | deleted |
| `src/war/ui/map/contract.ts` | `RegionView` gains `owner: 'grey' \| 'gold' \| 'red'`, `preview: {kind: 'win' \| 'war', order} \| null`; loses `stamp`, `brass` (score), `glow`, `airlift`; `MapView.flashpoint` becomes `crisis: {id, target, doubled}`; gains `warNext: {id, turns} \| null`; loses `cables`, `gridlock`, `ferry`, `blackout`, `armed`; `joinedPins` stays |
| `src/war/ui/map/fx.ts` | `inkSpread(source, targets, ms, colour)` gains the colour (it copied the source bloc colour) and starts at the shared border; `shockwave`, `mapFlash`, `lightsOut`, `flash`, `scanTo`, `pulseThread`, `dimExcept` kept; `ringCatch` added (the ring catches the score); `dropBrass`, `stampPulse`, `standbyPulse`, `scanAgain`, `heat` removed |
| `src/war/ui/map/layers/land.ts`, `markers.ts`, `palette.ts` | ownership fills and hatching in one neutral grey; a gold check on each region a send would win; the war tag; the white ring and threads; the bearing strip ("W — SCORING — E") is cut |
| `src/war/ui/board/*` | BigBoard re-laid out (section 10); SplitFlap and odometer reused; clock, crisis dots, Summit chip removed; progress rule replaced by the two bars |
| `src/war/ui/director/*` | kept: dim, scan, pin flyers, rail hops, shudders, slam, showcase, sounds, haptics, skip, speed, reduced motion. Every staff uses the 'desk' timing; per-region pops reuse the pin pop at the region; new beats `crisisX2`, `toRing` (score flies into the ring), `claim`, `warTake`, `warSpread`; removed: thread traffic, stamp, standby, AGAIN |
| `src/war/ui/rail/StaffRail.tsx` | unchanged mechanics; new chips; "new" highlight on the first send after a hire |
| `src/war/ui/briefing/Briefing.tsx` | the shop: 3 cards with preview lines, reroll, NEXT TURN, receipt; folder and in-tray removed; full-table replace flow |
| `src/war/ui/readout/*` | TARGET + NEXT REGION AT; POINTS and MULTIPLIER boxes; ReceiptPaper reused in the shop |
| `src/war/ui/controls/Controls.tsx` | SWAP, coin chip, SEND with sub-label |
| `src/war/ui/sheets/Coach.tsx`, `app/hints.ts` | the intro screens and the coach lines of sections 3-4 |
| `src/war/ui/app/*` | App, store, history (back button), guards, curtain, storage (the save), menu: kept |
| `src/war/ui/screens/*` | Title gains CONTINUE, HOW TO PLAY, CROWN DEMO (review builds); EndCard shows the three endings |
| `src/war/meta.ts` | tagline "Turn the whole world gold before war holds 10." |
| `src/war/sim/*`, `tools/war-sim.ts` | the harness stays; bots become ports of `reference/bots.py`; gates of section 16; `crosscheck.ts` reads `reference/fixtures.json` |
| Playwright e2e | rewritten (section 15) |

---

## 15. Engine tests (exact cases and numbers)

`npx vitest run src/war/engine src/war/content` must cover:

1. **Map:** 30 regions, 45 land joins, 9 sea lanes, 18 ports, 5 capitals (unchanged tests).
2. **Targets:** T(1..26) equal the table in section 5; `fixtures.json` `targets` holds T(1..40).
3. **Ladder** at T = 1,100: 1,099 → 0 (next 1,100); 1,100 → 1 (next 4,400); 4,399 → 1; 4,400 → 2 (next
   17,600); 17,600 → 3 (next 35,200); 35,200 → 4 (next 70,400); 140,800 → 6 (next 281,600); 1,000,000 → 8
   (next 1,126,400). Plus the 200 `ladder` fixture cases.
4. **Scoring:** the 400 `score` fixture cases (owner map, crisis, pins, seats, Old Hand value → score, points,
   M10; the first 80 also carry the full trace, event by event).
5. **Example 1:** on FIRST-WORLD turn 1: Shoal 14; Shoal + Lantern Key 68 (WIN 1); + Pebbleby 138;
   + Marram 264 (WIN 2, next 1,024); + Tern Isle 380; Lantern Key + Pebbleby + Tern Isle + Gullrest +
   Driftholm 140 (WIN 1); 137 legal sends, median 145, 100 win, 40 win 2, best 390. Sending the coached five
   wins Shoal then Pebbleby; GOLD 3, coins 6. Pin it to claim it: Shoal + Lantern Key + Lintel + Tallowmere
   (264) wins Shoal then Lintel, and Pebbleby stays grey. Turn 2: 310, 380, 390; 171 legal sends, exactly 1
   wins 2; sending 390 wins Tern Isle then Morrow Downs; GOLD 5, coins 8. (`fixtures.json` `firstWorld`.)
6. **First shop previews:** 390 → 702 (Duty Officer), 590 (Quartermaster), 2,343 (Harbourmaster); both cheap
   ones 1,062.
7. **Example 2:** 82,884 with the trace of section 6 (multiplier after each event: 5.0, 5.0, 9.0, 27.0, 40.5,
   60.7, 91.0, 136.5, 204.7, 307.0, 460.5, 690.7, 1,381.4); WIN 3 → Lintel, Dunmarrow, Brindle Coast;
   972 / 59,052 / 32,542 for the other sends; 46,428 with Duty Officer in seat 5; 82,884 with Quartermaster in
   seat 5; 400 with no staff; 56 legal sends, median 2,006, 21 win.
8. **Example 3:** 5,598,720, WIN 7 → Lintel, Dunmarrow, Brindle Coast, Iceward, Edda Vale, Ashkettle,
   Vessary; Deputy in seat 3: 1,328,576 (WIN 5); no Deputy: 174,960 (WIN 2).
9. **Win order (pin it to claim it):** Example 4's list; pinned regions that are not gold go first, nearest
   first (Vessary and Northwake pinned: WIN 4 → Lintel, Vessary, Northwake, Dunmarrow); gold pins are skipped;
   the 200 `winOrder` fixture cases, each with its own pins (0-5 regions drawn from a stream of their own).
10. **War spreads by itself:** Example 2 map → Iceward; FIRST-WORLD start → Marram; the 150 `warSpread` cases;
    no spread when war holds nothing or touches no grey; spread only after turns 3, 6, 9 ...
11. **Legal groups:** the 300 `legal` and 100 `groups` (count) cases; the 100 `lift` cases (tap order).
12. **Final push:** Example 5; a miss in the push sets CEASEFIRE and changes no region; WORLD UNITED only at 30
    gold; WAR at 10 red, checked after war's own spread.
13. **Shop:** offers never include a seated staff; buy into the leftmost seat; replace sells for half
    (floor); reroll 2, 3, 4 then resets next visit; Old Hand resets on sale; FIRST-WORLD's fixed offers.
14. **Determinism:** the same seed and actions give the same `hashState` and `hashTrace` in Chromium, WebKit and
    Firefox (Playwright).

**Simulator cross-check** (`src/war/sim/crosscheck.ts`): replays every `fixtures.json` case through the
TypeScript engine; any difference fails CI.

**Playwright e2e** (phone viewport 390 x 844 and desktop):
- intro: three screens, each beat on the strip, an early tap hurries a screen without leaving it, SKIP, TRY IT;
  How to play replays them;
- FIRST-WORLD turn 1 coached: only Shoal tappable at step 1; after Lantern Key the SEND sub-label reads
  "WINS 1 REGION"; after Marram it reads "WINS 2 REGIONS" and two win previews (gold checks) exist; send →
  GOLD 3/30;
- pin it to claim it: Shoal + Lantern Key + Lintel + Tallowmere previews and wins Shoal and Lintel, not
  Pebbleby;
- touch rule: Lintel–Shoal and Morrow Downs–Tern Isle (sea lanes) count as touching; a lit region that cannot
  be added is dimmed within one frame of the tap;
- turn 2 → the shop with Duty Officer, Quartermaster, Harbourmaster and preview lines 702 / 590 / 2,343;
- full-table replace; sell; reroll; drag to reorder;
- a miss turns the crisis red and the WAR count ticks; war spreads after turn 3 (dev hook);
- all three end cards via the dev hook; NEW GAME and HOME;
- back button: game → menu → game; menu → QUIT TO TITLE → confirm → title shows CONTINUE; reload resumes;
- the way home from How to play: with another page before the game in the tab, title → HOW TO PLAY → SKIP →
  CLOSE (and the X, and the scrim) keeps the game's URL and the title; PRACTICE → QUIT TO TITLE → LEAVE too;
- a reload during the game-ending send: the title offers CONTINUE "See how your world ended", the end card
  shows once, then HOME leaves nothing to continue;
- HOW TO PLAY from the menu during a send: the intro plays, nothing is dealt under it, and BACK finds turn 2.

Dev hook: `window.__war = {seed(s), state(), pin(ids), send(), swap(), buy(i, replaceSeat?), sell(seat),
reroll(), next(), demo('crown'), setOwner(map)}`.

---

## 16. Simulator gates (exact thresholds) and the results

`python3 calibrate.py 5000` in `reference/` (and the TypeScript port in CI with 2,000 games) must print
ALL GATES PASS. "Holds the world" means WORLD UNITED or CEASEFIRE. Six bots (`reference/bots.py`): random,
novice (a weak human: random 3-5 groups, cheapest staff), greedy (best send, never shops), preview (best send,
buys by the card's preview number only), sensible (best send, look-ahead shop), breaker (sensible, chases the
Crown).

| Gate | Threshold | Result (5,000 games each) |
| --- | --- | --: |
| G1 sensible holds the world | 55-70% | 62.5% |
| G2 sensible WORLD UNITED (30/30) | ≥ 40% | 48.3% |
| G3 greedy, never shops, holds | < 25% | 0.0% |
| G4 random holds | < 5% | 0.0% |
| G5 best send ≥ 2x the median send (sensible, opening deal) | ≥ 85% of turns | 99.3% |
| G6 sensible median game | 15-19 turns | 15 |
| G7 first-game minutes, median | 13-16 | 13.5 |
| G8 first-game minutes, p90 | ≤ 18 | 16.3 |
| G9 first-game minutes, games that hold, median | 14-17 | 14.1 |
| G10 held games where war reached 6+ | ≥ 25% | 65.9% |
| G11 close losses (WAR while holding 18+ gold) | 6-14% of games | 9.3% |
| G12 hopeless losses (WAR holding ≤ 8 gold) | < 10% of games | 0.6% |
| G13 novice median game | ≥ 7 turns | 8 |
| G14 preview bot holds | ≥ 30% | 44.7% |
| G15 every staff in held line-ups | ≥ 8% each | lowest Old Hand 22.1% |
| G16 no staff in held line-ups above | ≤ 85% | highest Strategist 73.0% |
| G17 stalls | 0 | 0 |

These are the results with pin it to claim it (the win order of section 5, step 6). Against the earlier rule
(extra wins to the nearest regions, pinned or not) every gate still passes and moves by sampling noise, except
G10, which rises from 51.4% to 65.9%: the bots pin for score, not to take war's regions back, so a big send
now takes back fewer red regions and war more often reaches 6 (a closer race; the gate wants at least 25%).

More results (sensible): 14.2% of games end in CEASEFIRE (holding 21-29); 37.5% in WAR. The best send beats the
median send's regions by 1.16 on average and wins where the median misses on 57.8% of turns; 90.0% of its sends
pin the crisis (the rest are, for example, five gold ports). Best send per game: median 118,305, p90 878,681,
max 14,488,371. Staff in held line-ups: Strategist 73%, Harbourmaster 72%, Sovereign 68%, Governor 56%, Surveyor
47%, Herald 46%, Quartermaster 44%, Duty Officer 38%, Deputy 33%, Old Hand 22%. Misses in a row that end a loss:
median 3. Breaker: holds 39.5% (it buys pieces before it has an engine). Full output: `reference/RESULTS.txt`.

**Choice spread, honestly.** The crisis ×2 is part of why the best send beats the median by 2x on 99% of turns
(sends that skip the crisis are half price). The fairer reading is in the other numbers: on most turns the
best send wins the crisis where the median send would lose it to war (57.8% with pin it to claim it), and a mid-game deal like Example 2 offers
MISS, WIN 2 and WIN 3 among sends a player would actually consider.

---

## 17. Risks and open questions

- **Length is modelled, not measured.** First game 13.6 min (p90 16.5), slow first-timer 17.8. Run 5 timed phone
  playtests before content lock (gate: median 13-17 min). Levers, in order: shop 2 offers or skip the shop when
  nothing is affordable; target growth x1.45-1.55; ladder (5, 25) instead of (4, 16) adds about a turn.
- **CEASEFIRE needs the owner's yes** (open question 1 in README). If rejected, the alternative is a forgiving push
  (three misses end it).
- **Pinning the crisis is nearly always right** (90.0% of sensible sends). That makes the first lesson simple but
  the decision light; staff that reward not pinning it (five gold ports) are the depth. Watch in playtests.
- **Wins beyond your pins go to the nearest non-gold region and can jump** across your own territory late
  (Example 2: the third region is 4 joins away). The lit gold thread along the join path (section 8) makes the
  jump readable; pin it to claim it lets a player choose instead.
- **Dead deals.** Late in a game some deals have no winning send at all, even after a swap (a review's bot
  count: about 12% of deals, 25% from turn 10, for a player who plays the best send), so some misses and every
  CEASEFIRE follow a deal nothing could win. The game now says so the moment such a turn is dealt ("No send wins
  this deal. SWAP brings new regions."). Changing the deal rule (for example, swapping a winning region in from
  the pile) is a rules change: re-run the gates if it is tried.
- **The shop is mandatory** (greedy without a shop holds 0%). The fixed first shop, preview numbers and the
  "new hire" highlight carry it; if playtesters skip buying, raise ◆4 start to ◆6.
- **Strategist at 74%** of winning line-ups is the most common piece; it is "×3 for 4+ pins", which nearly every
  send meets. If it feels mandatory, price it ◆6 and re-run the gates.
- **War spreads on a fixed beat** (every 3rd turn). If it reads as arbitrary, the tag on the target region and the
  "WAR · 2 TURNS" countdown are the fix; do not hide them.
- **Bots are not people.** The sensible bot enumerates every send; human hold rates will be lower early and may be
  higher for planners. The novice and preview bots bracket a new player (0% and 45%).
- **Tone and rating:** war is fills, hatching and ink only; no units, casualties or explosions (PEGI 7 / E10+).
- **Carried over:** the BRINK name needs trademark clearance; the fictional region names still need a gazetteer pass.
