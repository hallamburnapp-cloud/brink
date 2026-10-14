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
| Grey | free | the region's bloc tint at 25% saturation, with its glyph and number |
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
as a CEASEFIRE. The push is short: in the simulation, 53% of games reach it, it lasts 2 turns at the median,
and 73% of pushes end WORLD UNITED.

**Why this shape.** The judges' first must-fix was that the slice-era design stamped WORLD UNITED with up to
nine red regions still on the map. Here WORLD UNITED means 30/30, always. The game must also always end:
a miss in the push cannot hand war more ground (no grey is left and gold is gold for good), so the push ends
on its first miss. CEASEFIRE is graded with stars on its card so it reads as an honest lesser result:
★★★ is reserved for WORLD UNITED, ★★ for a CEASEFIRE holding 25-29, ★ for a CEASEFIRE holding 21-24.

Every turn decides at least one region (a win turns at least one gold, a miss turns one red, a push miss
ends the game), so no game can stall. In 30,000 simulated games none did, and none ran past turn 25.

---

## 2. The rules as the player reads them (final copy)

This is the "How to play" sheet, word for word (120 words). One colour word everywhere: gold is yours,
red is war, grey is free.

> Turn all 30 regions gold before war holds 10.
> Each turn a crisis flares beside your gold, with a target. Nearby regions light up.
> Pin up to 5 lit regions that touch. Pin the crisis itself to double your score.
> Score: add their numbers, times how many you pinned. Staff then boost it, left to right.
> Once a turn you may swap unpinned lit regions.
> Beat the target: the crisis turns gold for good. Beat it by more, win more regions.
> Miss: war takes it. Every 3rd turn, war also spreads by itself.
> Each region won pays 1 coin. Every 2 turns, hire staff.
> No grey left? Crises flare on red: win each to unite the world. Miss one: ceasefire.

No player ever has to calculate. The readout says "NEXT REGION AT 4,400", the SEND lever says
"WINS 2 REGIONS" or "MISS · SHORT BY 620", and the map draws the regions a send would win, numbered, before
SEND is pressed.

---

## 3. The explanation at the start (three screens)

Shown on the first launch, on the real map, before the first turn. Each screen plays a 4-6 s animation and
then waits for a tap anywhere (taps are ignored for the first 1.5 s). SKIP sits at the top right of the
map (322, 179, 52, 32; 44 pt hit height) on every screen, clear of the goal counts. Menu > How to play replays the screens, then shows the rules sheet. The text sits
in the coach strip at the top of the map (16 pt, at most 2 lines); the Big Board and bars are live.

**Screen 1 (23 words)**

> Win the world. Lantern Key is yours: gold. War has already taken 3 regions: red. Turn all 30 gold before war holds 10.

The map: 26 grey regions, Lantern Key gold, Dunmarrow, Orrinth and Floe End red and pulsing.
- 0.3 s: GOLD 1/30 on the board glows; Lantern Key pulses.
- 1.0 s: a 1.2 s gold wave rolls out from Lantern Key over all 30 regions and fades back (the goal, shown
  before it is explained); the GOLD bar fills to 30 and empties with it.
- 2.6 s: WAR 3/10 glows; the three red regions pulse twice.

**Screen 2 (25 words)**

> Each turn a crisis flares beside your gold. Pin lit regions that touch. Add their numbers, times how many. Pin the crisis to double it.

The map:
- 0.0 s: the white crisis ring drops on Shoal with its target badge "64" and a small "×2" chip.
- 0.4 s: ten regions light one by one (the existing light-up, 1.2 s): Lantern Key, Pebbleby, Tern Isle,
  Gullrest, Driftholm, Lintel, Marram, Morrow Downs, Kelpmouth, Tallowmere.
- 2.0 s: a ghost finger taps Shoal, Lantern Key, Pebbleby, then Marram across the dashed sea lane. White
  threads snap between the pins. The readout counts 7 × 2.0 = 14, then 17 × 4.0 = 68, then 23 × 6.0 = 138,
  then 33 × 8.0 = 264. The SEND sub-label turns from "MISS" to "WINS 1 REGION" to "WINS 2 REGIONS", and
  dashed gold outlines numbered 1 (Shoal) and 2 (Pebbleby) appear.

**Screen 3 (22 words)**

> Beat the target: the crisis turns gold for good. Miss: war takes it. War also spreads by itself. Staff multiply your score.

The map:
- 0.0 s: the send plays at 2x speed; gold ink floods Shoal, then Pebbleby. GOLD 1/30 becomes 3/30.
- 1.8 s: the scene rewinds (0.4 s) and replays as a miss with Shoal alone (14): red ink blooms in Shoal.
  WAR 3/10 becomes 4/10.
- 3.2 s: a drum hit; red ink runs from Floe End into Marram (where war spreads first on this map).
  WAR becomes 5/10.
- 4.4 s: the map resets to the start. An empty staff seat lights with a desk lamp and "+4".
- The tap-to-continue label reads TRY IT and starts turn 1 on this same map.

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
| 1 | "Tap the crisis: the white ring." | A finger pulses on Shoal; only Shoal is tappable. | 7 × 2.0 = 14. SEND: "MISS · SHORT BY 50". Shoal hatched red (preview). |
| 2 | "Now a lit region touching it." | Lantern Key, Pebbleby and Lintel breathe; the rest dim. | With Lantern Key: 17 × 4.0 = 68. SEND: "WINS 1 REGION". Shoal outlined gold "1". |
| 3 | "68 beats 64. Shoal will turn gold." (2 s), then "More pins score more. Up to 5." | Any lit region touching a pin can be added. | With Pebbleby: 138. With Marram (over the dashed lane): 264, "WINS 2 REGIONS", Pebbleby outlined "2". With Tern Isle: 380. |
| 4 | when "WINS 2" first shows: "Beat it by more: win more regions." Then "SEND." | The SEND lever beckons. | |
| 5 | after the send: "Gold is yours for good." | | Cascade; Shoal, then Pebbleby flood gold. GOLD 3/30. Coins 4 → 6. |

Turn 1 has 137 legal sends; 100 of them win; 40 win 2 regions; the median scores 145; the best is 390
(Lintel + Marram + Pebbleby + Shoal + Tallowmere). Without the crisis, the five biggest neighbours (Lantern
Key + Pebbleby + Tern Isle + Gullrest + Driftholm) score only 140: the crisis x2 is the lesson.

From turn 1 the red tag "WAR · 3 TURNS" sits on Marram, where war will spread after turn 3 (section 8).

**Turn 2.** Target 96. Crisis: Tern Isle. Lit: Lantern Key, Shoal and Pebbleby (gold if turn 1 went as
coached), Gullrest, Morrow Downs, Rimeholt, Edda Vale, Ashkettle, Driftholm, Glassmoor. SWAP is enabled.
- Coach at the start: "Gold regions can be pinned too."
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

**Turn 3 onward** is dealt by the game's own seeded streams. Coach at the start of turn 3: "War spreads by
itself every 3rd turn. Watch the red tag." After turn 3, war spreads (Marram, unless the player has won it).

**One-time coach lines** (each shows once per device, in any game):

| Trigger | Line |
| --- | --- |
| first MISS preview with 5 pins and a swap left | "Short? SWAP brings new regions. Your pins stay." |
| first miss sent | "War took it. Ten red and you lose." |
| first time war spreads by itself in a game after the first | "War spread by itself." (1.5 s) |
| first shop with all 5 seats full | "Full table. Tap a seat to replace it." |
| first Deputy seated | "The Deputy copies whoever sits to its right." |
| first final push | "No grey left. Win back the red. One miss: ceasefire." |
| first WAR at 8 or more | "Two more red and the war wins." |

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
     more can be pinned. While at least one pin is down, lit regions that cannot be added dim to 30% at once.
   - Lift rule: tapping a pin lifts it, plus every pin no longer touching the group that holds the earliest
     remaining pin (pins are kept in tap order).
   - The readout, the SEND sub-label and the map preview update on every tap.
4. **SWAP (optional, once a turn).** Every lit region that is not pinned (the crisis excepted) goes dark and
   to the bottom of the pile; as many regions light from the top. Pins stay. If the pile was short, regions
   that just went dark come back.
5. **SEND.** Score the pins (section 6). The cascade takes 3.5-8 s and can be skipped with a tap.
6. **OUTCOME.**
   - **Win** (score ≥ T): regions won = the number of marks the score reaches: T, 4T, 16T, then each mark
     double the last (32T, 64T, 128T ...). No cap. The crisis region turns gold first. Each further region is
     the nearest region that is not gold, counted in joins from the crisis; at equal distance war's before
     grey, then the higher number, then west, then north. ◆1 per region won.
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
floored. Display the multiplier with `formatM10` (one decimal).

**The region ladder** at target 1,100: 1 region at 1,100; 2 at 4,400; 3 at 17,600; 4 at 35,200; 5 at 70,400;
6 at 140,800; 7 at 281,600; 8 at 563,200. A score of 1,000,000 wins 8; the next region is at 1,126,400.

### Example 1: FIRST-WORLD turns 1-2 (no staff)
See section 4: Shoal alone 14; + Lantern Key 68 (WIN 1); + Pebbleby 138; + Marram 264 (WIN 2, next region at
1,024); + Tern Isle 380; best 390; median of 137 legal sends 145. Turn 2: 310, 380, then 390 (WIN 2).

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
Iceward at the same distance). The other choices on this deal:

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
WIN 1: Lintel. WIN 2: + Dunmarrow. WIN 3: + Brindle Coast. WIN 5: + Iceward, Edda Vale. WIN 8: + Ashkettle,
Vessary, Northwake. A miss: Lintel turns red (war 5 → 6). War spreading by itself on this map goes to Iceward
(touches Brindle Coast, 1 join from gold Marram), not Quillon (2 joins from gold).

### Example 5: the final push
No grey left; war holds Edda Vale, Ashkettle, Quillon (27/30 gold). Crises can flare on any of the three
(each touches gold). A win of 2 on Edda Vale takes Edda Vale, then Ashkettle; a win of 3 takes all three:
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
- **The preview number** on every card: "BEST LAST TURN 390 → 2,343". The engine rescores the opening deal of
  the turn just played (its crisis and its 10 lit regions, on today's map) with that staff added to the first
  free seat, or in place of the seat you would replace, and prints the best send's score before and after.
  It is computed by enumerating that deal's legal groups (at most a few hundred) with the fast scorer.
  In the simulation a bot that follows only this number keeps the world in 45% of games; a bot that never
  shops keeps it in none.
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
| Gold (yours) | fill #F2D27A at 85%, rim 1.5 pt #FFE9A8, soft glow, 6 s shimmer |
| Red (war) | fill #E0483C at 75%, 45° hatching 2 pt #7A1E17 every 6 pt, 4 s pulse of ±10% brightness |
| Grey (free) | the bloc hex at 25% saturation, 35% over #16222F, with glyph and number |
| Crisis ring | white #F4F1E8, 2.5 pt, amber (#FFB547) outer glow, 1.6 s pulse (was red) |
| Threads between pins | white #F4F1E8 at 90% (was #E0483C) |

Red appears only for war: war regions, the WAR count and bar, MISS labels. The three states differ by
brightness as well as hue, so the map reads in sunlight, in greyscale and for colour-blind players
(scene tests check the luminance order gold > grey > red-hatch).

**Always on the map**
- The crisis ring with its target badge ("1,100", 13 pt, on a dark chip above the ring) and a "×2" chip on
  the ring that lights when the crisis is pinned.
- Lit regions bright with a pin socket; dark regions at 30%.
- **The war tag:** the region war will spread to next (the engine's `warSpreadTarget`) has a red dashed
  outline and a tag "WAR · 3 TURNS", "WAR · 2 TURNS" or "WAR · THIS TURN" (11 pt caps). No tag when war
  cannot spread.
- A small brass pin on each region won as a crisis (decoration only, the existing `dropBrass`).

**While choosing (every tap, instant)**
- Pins drop with the existing thock; white threads snap along the joins between pins (dashed for sea lanes).
- Lit regions that cannot be added dim to 30%.
- WIN preview: dashed gold outlines on every region the send would win, numbered 1, 2, 3 ... in spread order;
  a war region that would be won back shows gold-over-red stripes.
- MISS preview: the crisis region hatched red; the WAR bar's next segment blinks; in the push, the board
  shows "CEASEFIRE" ghosted.
- Ghost segments on the GOLD and WAR bars show the outcome before SEND.

**On SEND** (the existing director, with fewer event kinds):
1. 150 ms dim; scan line west to east; each pin flashes and flings "+n" into POINTS.
2. Each staff hops on the rail and flings its "+20", "+4", "×3" into the boxes. A per-region staff pops
   "×1.5" or "×2" from each matching region on the map (150 ms each, a shudder on every ×).
3. The crisis ring stamps "×2" (300 ms) when pinned.
4. The 200 ms slam, sized by score ÷ target. At 10x or more the existing showcase plate and full-map flash
   (in gold) play.
5. **The score flies from the readout into the crisis ring (300 ms)** before the ring collapses: the send
   visibly lands on the place that changes.

**Outcome: WIN** (1.0 s for the crisis + 0.5 s per further region, capped at 5 s):
- the ring collapses (300 ms), a white shockwave rolls from the crisis (600 ms, existing);
- `inkSpread` in gold floods the crisis (600 ms);
- each further region: a gold pulse travels along the shortest chain of joins from the crisis (150 ms), then
  gold ink floods it (400 ms); a red region won back wipes red to gold with a white edge flash and a deeper
  chord;
- with every region: the GOLD flap ticks, one GOLD bar segment fills, one coin flies to the coin chip (90 ms).

**Outcome: MISS** (0.8 s): no slam flourish; the drone dips; red ink runs from the nearest war region into the
crisis (700 ms), or blooms from its centre if no war region touches it; the WAR flap ticks, a WAR bar segment
fills, a 2 px shake.

**War spreads by itself** (after turns 3, 6, 9 ..., 0.5 s after the outcome): a low drum, red ink runs from
the touching war region into the tagged region (700 ms), the WAR count and bar tick, the tag moves to the next
target.

**Endings**
- WORLD UNITED: the existing sunrise sweep from the east, then a gold wave from the last region won.
- CEASEFIRE: red regions stop pulsing and fade to 60% (the war stops where it stands); gold stays lit.
- WAR: `lightsOut` over grey regions only (2 s); gold stays lit (it was yours for good), red pulses once.

---

## 9. The screens, on the existing war-room layout

Portrait 390 x 844, the existing frame; desktop and Steam letterbox the same frame, as now. Rects are
x, y, w, h. Background #0B0F14 with the 6% vignette.

**Title.** `BRAND.name` large (as now), "WIN THE WORLD" under it (14 pt caps, gold). Buttons, stacked at
x 24, w 342: PLAY (or CONTINUE when a saved game exists, with NEW GAME under it), HOW TO PLAY, and in review
builds only CROWN DEMO (section 13). A first launch goes PLAY → intro → FIRST-WORLD.

**Intro.** Section 3: the game screen with the coach strip carrying the copy and a SKIP button.

**Game.**

| Rect | What |
| --- | --- |
| 0, 0, 390, 47 | safe area |
| 0, 47, 390, 60 | the Big Board: goal counts, menu, the two bars (section 10) |
| 0, 107, 390, 64 | staff rail, unchanged: 5 seats of 64 x 58 at x 17, 90, 163, 236, 309; tap for the rule balloon; long-press and drag to reorder |
| 0, 171, 390, 520 | the map; the coach strip overlays its top edge when coaching |
| 0, 691, 390, 48 | readout (below) |
| 0, 739, 390, 68 | controls (below) |
| 0, 807, 390, 37 | home indicator |

Readout:
- 16, 693, 170, 20: "TARGET" (11 pt caps, 60% white) then the target (17 pt), e.g. "TARGET 1,100".
- 16, 717, 170, 16: "NEXT REGION AT 4,400" (11 pt) once the pins win; "NEED 1,100" before.
- POINTS box 196, 695, 86, 40 (cyan #5FD4F4) × MULTIPLIER box 300, 695, 74, 40 (amber #FFB547): the existing
  boxes, relabelled, live on every tap; they collide into the score after SEND.

Controls:
- SWAP 16, 745, 104, 56: "SWAP" (15 pt) over "1 left" or "used" (10 pt).
- Coin chip 128, 745, 70, 56: the coin and "◆ 7" (18 pt).
- SEND 206, 745, 168, 56: the brass lever, "SEND" (17 pt) over a sub-label (11 pt) that always says what will
  happen: "WINS 2 REGIONS" (gold), "MISS · SHORT BY 620" (red), "MISS · CEASEFIRE" (red, final push),
  "PIN A REGION" (disabled, 40%).
- Desktop and Steam keys: Space sends, S swaps, 1-5 select seats (arrows move a selected seat), Esc opens the menu.

**Shop.** The existing Briefing tray rises to 0, 451, 390, 356 over the map; the Big Board and rail stay visible.
- 16, 463: "SHOP · NEXT TARGET 1,600" (13 pt).
- Offer cards 16, 485, 110, 180 / 140, 485, 110, 180 / 264, 485, 110, 180: 40 pt icon, name (12 pt), rule
  (11 pt, up to 3 lines), price tag bottom right, and the preview line at the bottom: "BEST LAST TURN" (9 pt
  caps) over "390 → 2,343" (13 pt, the arrow amber).
- REROLL ◆2: 16, 677, 171, 44. NEXT TURN →: 203, 677, 171, 44.
- Receipt (the existing ReceiptPaper): 16, 729, 358, 28: "LAST TURN · WIN 2 · +◆2", plus "WAR SPREAD TO MARRAM" when it did.

**End screens.** The map at 100% stays behind a card at 24, 200, 342, 300; NEW GAME at 24, 520, 342, 56
(a new deal in under 2 s); HOME at 24, 584, 342, 44.
- WORLD UNITED ★★★: "WORLD UNITED · 30 of 30" (28 pt); "Turn 15 · war peaked at 6"; best send
  ("749,414 · 39x the target"); biggest turn ("7 regions"); the 5 staff in seat order.
- CEASEFIRE ★★ or ★: "CEASEFIRE · 26 of 30 gold"; "War held 4 regions when it stopped."; best send; staff.
  The red regions stay outlined.
- WAR: "WAR · war took 10 regions. You held 18 of 30." When grey left ≤ 3: "N grey regions from the final
  push." Those grey regions are outlined gold on the dark map. Best send; staff.
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
the map. No clock, turn number, crisis dots, Summit chip, Leverage, pattern name or in-tray. (The turn number
appears only in the menu sheet and on the end card.) With the readout's target and
the SEND sub-label, the player always sees: how much of the world is gold, how close war is, what this
turn needs, what the pins will do, the coins and the five seats.

---

## 11. The menu and the way home

- The menu button ≡ on the Big Board, the Android/browser back button and Esc all open the existing menu sheet:
  RESUME, HOW TO PLAY (the intro, then the rules sheet with a PRACTICE button that starts FIRST-WORLD),
  SOUND on/off, SPEED 1x/2x/4x, REDUCED MOTION, QUIT TO TITLE.
  The sheet also shows "Turn 9 · next shop after turn 10".
- QUIT TO TITLE asks once: "Leave this game? It is saved." (LEAVE / STAY). The title then shows CONTINUE.
- Back while the menu is open closes it. Back on the title does nothing on the web and exits on Android.
- The shop and the end card are inside the game: back opens the menu over them.
- The game saves after every SEND, every shop action and on `visibilitychange` to hidden, to localStorage key
  `brink.war.v2.save` (versioned JSON with BigInts as strings; unreadable saves are discarded). No network.

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
| minutes, first-game model | 13.6 | | 16.5 |
| minutes, first-game model, games that keep the world | 14.1 | | 17.0 |
| minutes, practised (no intro or coach) | 12.6 | | 15.4 |
| minutes, slow first-timer (20 s + 3 s a pin, 50 s shops) | 17.8 | | 21.6 |
| minutes, fast player (8 s + 1.8 s a pin, 20 s shops) | 9.1 | | |

Why it lands there: 26 grey regions are a visible clock that both sides use up. A winning send takes 1.6
regions on average (1: 47.7%, 2: 45.5%, 3+: 6.8%), war takes about 4 regions by itself and about 1 by misses,
and 53% of games add a 2-turn final push. Losses come at turns 11-18 (median 15). No game ran past turn 25.

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
  Morrow Downs), coins 8. War spreads to Marram after turn 3 if it is still grey. In the Python reference the
  sensible bot goes on to WORLD UNITED in 15 turns; the novice bot loses at turn 9.

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
- Traffic threads, brass pins as score, influence glow: threads only between current pins (white); brass pins
  are decoration.
- The CLEARS lamp: the SEND sub-label. The Late Shift and Mid Shift sandboxes: the CROWN demo.

**Kept as identity, not rules:** the five bloc colours and glyphs (as grey tints), ★ capitals and ⚓ ports
(three staff use them), region numbers 3-10, the map (unchanged).

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
| `src/war/engine/view.ts` | `goalView` (gold, red, grey, warNext {region, turns}), `regionViews` (owner, preview, lit/dark, pinned, capital, port), `readoutView`, `sendLabel`, `shopView`, `endView` |
| `src/war/engine/orders.ts`, `hours.ts`, `draft.ts` | deleted |
| `src/war/ui/map/contract.ts` | `RegionView` gains `owner: 'grey' \| 'gold' \| 'red'`, `preview: {kind: 'win' \| 'war', order} \| null`; loses `stamp`, `brass` (score), `glow`, `airlift`; `MapView.flashpoint` becomes `crisis: {id, target, doubled}`; gains `warNext: {id, turns} \| null`; loses `cables`, `gridlock`, `ferry`, `blackout`, `armed`; `joinedPins` stays |
| `src/war/ui/map/fx.ts` | `inkSpread(source, targets, ms, colour)` gains the colour (it copied the source bloc colour); `shockwave`, `mapFlash`, `lightsOut`, `flash`, `scanTo`, `pulseThread`, `dimExcept`, `dropBrass` kept; `stampPulse`, `standbyPulse`, `scanAgain`, `heat` removed |
| `src/war/ui/map/layers/land.ts`, `overlays.ts`, `palette.ts` | ownership fills and hatching; preview outlines with order numbers; the war tag; the white ring and threads |
| `src/war/ui/board/*` | BigBoard re-laid out (section 10); SplitFlap and odometer reused; clock, crisis dots, Summit chip removed; progress rule replaced by the two bars |
| `src/war/ui/director/*` | kept: dim, scan, pin flyers, rail hops, shudders, slam, showcase, sounds, haptics, skip, speed, reduced motion. Every staff uses the 'desk' timing; per-region pops reuse the pin pop at the region; new beats `crisisX2`, `toRing` (score flies into the ring), `claim`, `warTake`, `warSpread`; removed: thread traffic, stamp, standby, AGAIN |
| `src/war/ui/rail/StaffRail.tsx` | unchanged mechanics; new chips; "new" highlight on the first send after a hire |
| `src/war/ui/briefing/Briefing.tsx` | the shop: 3 cards with preview lines, reroll, NEXT TURN, receipt; folder and in-tray removed; full-table replace flow |
| `src/war/ui/readout/*` | TARGET + NEXT REGION AT; POINTS and MULTIPLIER boxes; ReceiptPaper reused in the shop |
| `src/war/ui/controls/Controls.tsx` | SWAP, coin chip, SEND with sub-label |
| `src/war/ui/sheets/Coach.tsx`, `app/hints.ts` | the intro screens and the coach lines of sections 3-4 |
| `src/war/ui/app/*` | App, store, history (back button), guards, curtain, storage (the save), menu: kept |
| `src/war/ui/screens/*` | Title gains CONTINUE, HOW TO PLAY, CROWN DEMO (review builds); EndCard shows the three endings |
| `src/war/meta.ts` | tagline "Turn the whole world gold before war takes ten regions." |
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
   wins Shoal then Pebbleby; GOLD 3, coins 6. Turn 2: 310, 380, 390; 171 legal sends, exactly 1 wins 2;
   sending 390 wins Tern Isle then Morrow Downs; GOLD 5, coins 8. (`fixtures.json` `firstWorld`.)
6. **First shop previews:** 390 → 702 (Duty Officer), 590 (Quartermaster), 2,343 (Harbourmaster); both cheap
   ones 1,062.
7. **Example 2:** 82,884 with the trace of section 6 (multiplier after each event: 5.0, 5.0, 9.0, 27.0, 40.5,
   60.7, 91.0, 136.5, 204.7, 307.0, 460.5, 690.7, 1,381.4); WIN 3 → Lintel, Dunmarrow, Brindle Coast;
   972 / 59,052 / 32,542 for the other sends; 46,428 with Duty Officer in seat 5; 82,884 with Quartermaster in
   seat 5; 400 with no staff; 56 legal sends, median 2,006, 21 win.
8. **Example 3:** 5,598,720, WIN 7 → Lintel, Dunmarrow, Brindle Coast, Iceward, Edda Vale, Ashkettle,
   Vessary; Deputy in seat 3: 1,328,576 (WIN 5); no Deputy: 174,960 (WIN 2).
9. **Spread order:** Example 4's list; the 200 `winOrder` fixture cases.
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
- intro: three screens, SKIP, TRY IT; How to play replays them;
- FIRST-WORLD turn 1 coached: only Shoal tappable at step 1; after Lantern Key the SEND sub-label reads
  "WINS 1 REGION"; after Marram it reads "WINS 2 REGIONS" and two numbered outlines exist; send → GOLD 3/30;
- touch rule: Lintel–Shoal and Morrow Downs–Tern Isle (sea lanes) count as touching; a lit region that cannot
  be added is dimmed within one frame of the tap;
- turn 2 → the shop with Duty Officer, Quartermaster, Harbourmaster and preview lines 702 / 590 / 2,343;
- full-table replace; sell; reroll; drag to reorder;
- a miss turns the crisis red and the WAR count ticks; war spreads after turn 3 (dev hook);
- all three end cards via the dev hook; NEW GAME and HOME;
- back button: game → menu → game; menu → QUIT TO TITLE → confirm → title shows CONTINUE; reload resumes.

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
| G1 sensible holds the world | 55-70% | 63.1% |
| G2 sensible WORLD UNITED (30/30) | ≥ 40% | 48.9% |
| G3 greedy, never shops, holds | < 25% | 0.0% |
| G4 random holds | < 5% | 0.0% |
| G5 best send ≥ 2x the median send (sensible, opening deal) | ≥ 85% of turns | 99.3% |
| G6 sensible median game | 15-19 turns | 15 |
| G7 first-game minutes, median | 13-16 | 13.6 |
| G8 first-game minutes, p90 | ≤ 18 | 16.5 |
| G9 first-game minutes, games that hold, median | 14-17 | 14.1 |
| G10 held games where war reached 6+ | ≥ 25% | 51.4% |
| G11 close losses (WAR while holding 18+ gold) | 6-14% of games | 8.7% |
| G12 hopeless losses (WAR holding ≤ 8 gold) | < 10% of games | 0.6% |
| G13 novice median game | ≥ 7 turns | 8 |
| G14 preview bot holds | ≥ 30% | 45.0% |
| G15 every staff in held line-ups | ≥ 8% each | lowest Old Hand 23.0% |
| G16 no staff in held line-ups above | ≤ 85% | highest Strategist 74.2% |
| G17 stalls | 0 | 0 |

More results (sensible): 14.2% of games end in CEASEFIRE (holding 21-29); 36.9% in WAR. The best send beats the
median send's regions by 1.16 on average and wins where the median misses on 58.5% of turns; 90.6% of its sends
pin the crisis (the rest are, for example, five gold ports). Best send per game: median 126,036, p90 793,497,
max 14,096,793. Staff in held line-ups: Strategist 74%, Harbourmaster 72%, Sovereign 67%, Governor 55%, Surveyor
47%, Herald 46%, Quartermaster 44%, Duty Officer 38%, Deputy 33%, Old Hand 23%. Misses in a row that end a loss:
median 3. Breaker: holds 39.8% (it buys pieces before it has an engine). Full output: `reference/RESULTS.txt`.

**Choice spread, honestly.** The crisis ×2 is part of why the best send beats the median by 2x on 99% of turns
(sends that skip the crisis are half price). The fairer reading is in the other numbers: on 58.5% of turns the
best send wins the crisis where the median send would lose it to war, and a mid-game deal like Example 2 offers
MISS, WIN 2 and WIN 3 among sends a player would actually consider.

---

## 17. Risks and open questions

- **Length is modelled, not measured.** First game 13.6 min (p90 16.5), slow first-timer 17.8. Run 5 timed phone
  playtests before content lock (gate: median 13-17 min). Levers, in order: shop 2 offers or skip the shop when
  nothing is affordable; target growth x1.45-1.55; ladder (5, 25) instead of (4, 16) adds about a turn.
- **CEASEFIRE needs the owner's yes** (open question 1 in README). If rejected, the alternative is a forgiving push
  (three misses end it).
- **Pinning the crisis is nearly always right** (90.6% of sensible sends). That makes the first lesson simple but
  the decision light; staff that reward not pinning it (five gold ports) are the depth. Watch in playtests.
- **Spread to "nearest non-gold" can jump** across your own territory late (Example 2: the third region is 4 joins
  away). The gold pulse along the join path must make the jump readable.
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
