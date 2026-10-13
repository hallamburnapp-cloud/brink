# BRINK (working title; store subtitle: The War-Room Roguelike). Built on Design 3, with grafts from Designs 1, 2, 4 and 5.

The design chosen from the Balatro-on-a-world-map study (see STUDY.md). The owner's three anchors: a world map that reacts, Balatro-style building, a war room main screen.

> Pin glowing regions of a world map into shapes, seat a war room of odd experts who multiply every move, and watch one number blow past the crisis.
Store page line one: 'The war-room roguelike: pin a world map into shapes, seat a staff that multiplies them, and push one number past the brink.'

## What went wrong before

Every version so far either had numbers with nothing to build on, or had no numbers at all. In v0.2 you picked A or B on a text card. Both answers were scored against the same position, so they almost always came out within a few percent of each other (your '21 vs 23'). The bigger number usually meant edging closer to losing, your pieces were hidden in a menu, and missing the target didn't even end the run. That is why it felt pointless and confusing. v0.3, v0.4 and the three map concepts then dropped the score and the building, which is the one part of the gameplay you asked to keep. The root problem: Balatro's 'collect pieces, combos multiply, scores explode' needs a hand of things you choose a combination from, and a yes-or-no card can't be a combination. This design makes the world map itself the hand. Each crisis lights eight regions and you pin up to five. The shape the pins make on the map is the scoring pattern (a chain, a front, a ring around a region, one pin in every bloc), and the staff seated at your war-room table multiply it. In simulation, the best choice is usually 3 to 10 times better than a typical one, not 2 points better, and every sweep leaves a permanent mark on the map.

## Why this meets the anchors

1. BALATRO-STYLE BUILDING (collect pieces, combos multiply, scores explode, you can break the game)
- Every sweep is Influence x Momentum against one target.
- The world map is the hand: 8 lit regions, up to 5 pins. The geographic shape the pins make is the pattern, on an 11-rung ladder whose base products run from 5 to 2,700.
- 60 staff fire in seat order: +Influence, +Momentum, x Momentum, retriggers, scaling, economy, a copier and rule-benders, plus 5 legendaries built to break the game.
- Playbooks level patterns, Orders edit the deck (which is the map), and the shop runs on interest.
- Measured on this map: the best play is a median 8.4x the median play, and at least 3x it in 96% of deals. Seat order alone flips a crisis between clear and miss (10,920 against 8,736). A five-pin late-game sweep reaches 10.6 billion, and Overtime runs to a googol.

2. A WORLD MAP THAT REACTS (your decisions visibly change it)
- The map is the board you play on, not decoration.
- During a sweep: regions light in order, numbers rise out of them, and threads pulse along real borders and sea lanes.
- After every sweep: threads wear thicker with traffic and scored regions glow brighter.
- After every crisis: the flashpoint ring shrinks as your total climbs, then collapses with a shockwave, and a brass pin marks where you won.
- Across the run: cables, defections, merges, retirements and stamps redraw the world.
- At dawn the night map is your share image.

3. A WAR ROOM (what fills the screen: 'a world map and a war room')
- Portrait screen: a lit glass plotting table fills 520 of 844 pt.
- A split-flap Big Board carries the clock, the target and Leverage.
- Your staff sit along the table edge as the objects they keep: bell, seal, morse key, telescope, carbon paper.
- Crises flare as red rings from 22:00 until dawn.
- It stays non-graphic, fictional and calming: no gambling imagery and no casualties.

It also answers v0.2's failures directly: one score against one target, choices that differ by multiples, a build visible at all times, a single way to lose, and no meters or prose.

## Fantasy

You run the night desk of a war room on the worst night a made-up world has had. The room is dark except for a back-lit glass plotting table, where a world of five blocs (the Cap, Highmarch, the Scatter, Sundry and Farsouth) is drawn in light. Your staff sit around the table: a Harbourmaster with a ship's bell, a Governor with a wax seal, a Signals Officer at a morse key, a Deputy with a sheet of carbon paper. You never see a face, only the object each one keeps.

From 22:00 until dawn, crises flare up as red rings on the map. Each one puts a number on the split-flap board: the LEVERAGE you need before everyone stands down. You don't move armies. You push brass pins into the regions that are live tonight (envoys, aid, trade, broadcasts, quiet phone calls). Pins that touch join with red thread, and joined pins make shapes: a Chain, a Front, a ring that Surrounds a region, a Network. Shapes become Leverage, and your staff multiply it. Reach the number and the flashpoint cools from red to blue.

Over the night you also redraw the world. You lay cable across the sea, persuade regions to change bloc, fortify a coast and retire the regions you don't need. The threads you use most wear thicker and brighter, and every crisis you clear leaves a brass pin where you won it. By dawn the table is covered in your work, and that picture is your run.

The tone is calm, wry and low-stakes, like solitaire at 3 a.m. Nobody is hurt and nothing is destroyed, and the number measures how steady the world is. If you miss a target the world tips over the brink: the map's lights go out one region at a time, and one tap starts a new night.

## The board

ONE FICTIONAL WORLD: 30 REGIONS IN 5 BLOCS
The world is drawn on a back-lit glass plotting table in a portrait frame 390 x 520 pt. That fills a phone's width with no pan and no zoom, and the same plate sits in the middle of the landscape screen.

THE FIVE BLOCS
Each bloc is a landmass, a colour and a glyph, so colour is never the only signal. Numbers are weights.
- THE CAP (north, sky blue, triangle): Northwake 4, Frostmere 3, Wintermast 10 (capital), Wenmoor 6, Glassmoor 5, Kellmark 7.
- HIGHMARCH (west, teal, circle): Vessary 5, Rimeholt 3, Quillon 4, Edda Vale 10 (capital), Ashkettle 6, Morrow Downs 7.
- THE SCATTER (six islands in the inner sea, gold, diamond): Gullrest 3, Driftholm 4, Tern Isle 5, Lantern Key 10 (capital), Pebbleby 6, Shoal 7.
- SUNDRY (east, coral, square): Kelpmouth 5, Brackwater 4, Lintel 6, Tallowmere 10 (capital), Dunmarrow 3, Orrinth 7.
- FARSOUTH (south, violet, hexagon): Brindle Coast 6, Marram 10 (capital), Floe End 7, Iceward 4, Saltwhite 3, Hearth 5.
Every bloc has the same weights {10, 7, 6, 5, 4, 3}, 35 per bloc, so no bloc is the rich one.

WHAT EACH REGION HAS
- A colour (its bloc).
- A WEIGHT from 3 to 10, printed on its pin. This is the Influence it adds when it scores, the way a card's rank adds chips.
- At most two tags: CAPITAL (star, one per bloc) and PORT (anchor). A port is any region with a sea lane; 18 of the 30 are ports.

JOINS
There is one adjacency rule: regions that share a border, a causeway or a dashed sea lane are joined.
- 36 land borders across the four mainland blocs (9 each), plus 9 causeways between the Scatter islands.
- 9 dashed sea lanes: Northwake-Vessary, Kellmark-Kelpmouth, Glassmoor-Driftholm, Rimeholt-Gullrest, Morrow Downs-Tern Isle, Ashkettle-Brindle Coast, Shoal-Lintel, Pebbleby-Marram, Orrinth-Floe End.
- That makes 54 joins: 3.6 neighbours per region on average, from 2 to 6. The big capitals (Edda Vale, Lantern Key and Tallowmere with 5 neighbours each, Marram with 6) are natural centres to ring.
- No region has more than one sea lane. So on the starting map, five joined pins can never cover all five blocs, which keeps the secret pattern AROUND THE WORLD locked until you lay cable.

THE MAP IS THE DECK
The 30 regions are your cards. Each crisis shuffles them and lights 8. Editing regions (stamps, recolouring, cables, retiring, merging) is your deck-building, and every edit is permanent and visible.

READING IT ON A PHONE
- Mainland regions are 58-93 pt across, with a median of about 70.
- The six islands are 48 pt discs, with 44 pt hit circles and taps that snap to the nearest lit pin.
- Lit regions show their name and weight. Dark regions show only their glyph and weight.
- Long-press any region for its name, weight, tags, stamp, thread traffic and neighbours.
- I rasterised the layout: the borders the art draws match the adjacency list exactly.

FICTIONAL
The coastlines and names are invented. The names come from the repo's mockup list; 'Hollin' (a Tolkien name) and 'Glassharbour' have already been replaced, and all of them still need a gazetteer and trademark pass. Later WORLDS (an Archipelago, an Old Continent) are new maps that change every pattern's odds.

## The verb

PIN, THEN SWEEP.

1. Eight regions are lit on the dark map. Tap a lit region to push a brass pin into it, up to 5 pins. Tap a pin again to lift it.
2. As soon as two pins are joined, a red thread snaps taut between them, drawn along the real border, causeway or dashed lane.
3. Under the map, the readout names the pattern your pins make and its two base numbers, for example 'FRONT 45 x 4'.
4. Pins that will not score turn grey. Pins that will score get a small sweep-order number (1-5, west to east), so you can see the order before you commit.
5. Then use the same selection with one of two buttons:
   - SWEEP scores it. A scan line crosses the map from west to east and each scoring region fires in turn.
   - SWAP sends those regions dark and lights new ones (3 swaps per crisis), so you can hunt for a better shape.
6. AIRLIFT is an Order you buy at the Briefing. Drag the white airlift pin onto any region that is not spent, lit or dark, to add it to this sweep. It is how you close a ring or reach the fifth region of a Network.

BETWEEN CRISES, at the Briefing:
- Drag staff along the table to change their seats. They fire left to right, so seat order is a skill.
- Buy and sell.
- Drag Orders straight onto the map to stamp, recolour, cable or retire regions.

CONTROLS ON OTHER PLATFORMS
- PC: click to pin; Space sweeps, S swaps, and number keys pick seats.
- Controller and Steam Deck: the d-pad hops between lit regions from west to east, and A pins.

In one sentence: you choose where to push, and the shape your pins make on the map is the move.

## The hand

PATTERNS: THE SHAPE YOUR PINS MAKE
- If your pins fit more than one pattern, you get the one with the highest base product at its current level (ties go to the higher rung).
- Only the pins in that pattern score. The others are 'loose' and do nothing.
- The pattern's name and base appear live as you tap.

Each rung below gives: the rule; base Influence x Momentum (with the product in brackets); what one Playbook level adds; and two percentages: how often the pattern is possible in a fresh 8-region deal, and how often it is the best play. The percentages come from simulating 4,000 deals on this exact map, with no swaps and no staff.

1. SINGLE: no two pins joined; only your heaviest pin scores. 5 x 1 (5). +10 / +1. Possible 100%, best 0.1%.
2. LINK: two joined pins. 10 x 2 (20). +15 / +1. Possible 99%, best 1%.
3. TWO LINKS: two separate joined pairs. 20 x 2 (40). +20 / +1. Possible 78%, best 8%.
4. WORLDWIDE: five pins, one of each colour. 30 x 2 (60). +25 / +2. Possible 44%, best 21%.
5. CHAIN: three pins joined in one group. 30 x 3 (90). +20 / +2. Possible 69%, best 29%.
6. FRONT: four pins joined in one group. 45 x 4 (180). +25 / +3. Possible 29%, best 14%.
7. SURROUND: pins on every neighbour of one unpinned region that has 3 or more neighbours. The ringed region glows. 50 x 5 (250). +30 / +3. Possible 21%, best 16%.
8. NETWORK: five pins joined in one group. 70 x 6 (420). +35 / +3. Possible 11%, best 10%.
9. BLOC: five pins of one colour. 90 x 8 (720). +40 / +4. Possible 1% and best 1% on the starting map; routine once you repaint the map.

SECRET PATTERNS
They show as ??? until you make one, and both are impossible on the starting map.
10. WHOLE BLOC: every remaining region of one colour, once that colour is down to 3-5 regions (through Retire, Defect or Merge). 140 x 12 (1,680). +50 / +4.
11. AROUND THE WORLD: five joined pins, one of each colour. Needs cables or the Ferry Master. 180 x 15 (2,700). +50 / +5.

The base products run from 5 to 720 on the public ladder (144x) and up to 2,700 with secrets (540x).

MEASURED SPREAD
- The best play on a deal scores a median 8.4x the median legal play (p10 3.5x, p90 16x). It is at least 3x the median in 96% of deals.
- The best play beats the best play of any other pattern by a median 1.74x.
- No pattern is the best play in more than 29% of deals. Worldwide was 33% until I cut its base to 30 x 2.
- A bot that taps 1-5 random lit regions clears the first target of 300 only 9% of the time. A bot that plays the best shape clears it 100% of the time.
So the shape you choose decides the outcome. It is never '21 vs 23'.

## Round structure

A ROUND IS A CRISIS
Each Hour of the night has three crises: FLARE-UP (target x1), STANDOFF (x1.5) and SUMMIT (x2, plus one twist rule).

EACH CRISIS HAS
- One TARGET on the split-flap board ('TARGET 450'), with a goal line that never leaves the screen: 'Reach 450 · 3 sweeps left'.
- A FLASHPOINT: one region with a pulsing red ring, always lit in the first deal. If it scores, it scores twice.
- 4 SWEEPS and 3 SWAPS, with 8 lit regions. Pin up to 5 per sweep and swap up to 5 per swap.

REFILLING
- Every region you sweep (whether it scored or was loose) and every region you swap goes dim, or spent, for the rest of the crisis. Fresh regions light to bring the hand back to 8.
- If the pile runs out, the spent regions are shuffled back in.
- Each sweep's Leverage adds to the crisis total.

WHEN YOU HIT THE TARGET
The crisis ends the moment the total reaches the target. The flashpoint ring collapses, the region cools from red to blue, a white shockwave rolls across the map and CLEARED is stamped on the board. Then:
- A BRASS PIN drops on the top-scoring region of the sweep that cleared the crisis. From then on that region adds +5 Influence every time it scores, for the rest of the run, and pins stack.
- You are paid Funds:
  - Flare-up 3, Standoff 4, Summit 5 (Dawn Summit 8);
  - +1 for each unused sweep;
  - +1 interest for every 5 Funds held (cap +4);
  - OVERWHELM: +1, +2 or +3 if the crisis total reached 2x, 4x or 8x the target. Overkill always pays.
- The Briefing (the shop) opens.

WHEN YOU MISS
If your 4th sweep ends below the target, the run is over and the world tips over the brink. The map's lights go out region by region over 2 seconds, with no explosions. A summary shows your night map, your best sweep and the Hour you reached. NEW NIGHT is one tap and takes under 2 seconds. Missing a target is the only way to lose: there are no meters, no health and no second win condition.

SKIPPING
You may skip a Flare-up or Standoff for a Favour (a one-off reward). Summits can't be skipped. Each Hour's Summit twist is painted on the map from the start of the Hour, so you can buy for it.

## Scoring

THE FORMULA
LEVERAGE = INFLUENCE (cyan) x MOMENTUM (amber). Each sweep's Leverage adds to the crisis total, and the total is measured against one target.

EXACT ORDER (this is also the animation order)
1. TWIST: the Summit rule applies first, if there is one. For example, Gridlock removes sea lanes and cables from the joins.
2. PATTERN: Influence and Momentum start at the pattern's base plus its levels.
3. SWEEP: the scoring pins go in map order, west to east by pin position (ties go north first). For each pin:
   a. Add its weight, plus 5 for each brass pin on it, to Influence.
   b. First pass only: every thread from this pin to a pin that has already scored this sweep lights up and adds its TRAFFIC to Influence.
   c. Its stamp fires: Fortify +20 Influence, Beacon +4 Momentum, Relay x1.5 Momentum.
   d. Every staff with an 'each X that scores' rule fires, seat 1 to 5.
   e. If the pin scores again, repeat a, c and d once for each extra time. Pins score again through the flashpoint, an Echo stamp, the Courier, the Signals Officer, the Lighthouse Keeper, the Night Watch, or a Deputy copying one of these.
4. STANDBY: lit regions you did not pin, west to east. Reserve stamps and standby staff such as the Chief of Staff fire here.
5. DESK: each staff's flat rule, seat 1 to 5: +Influence, +Momentum, x Momentum, and conditional rules. A Deputy fires as a copy of the staff to its right.
6. SLAM: Leverage = Influence x Momentum, rounded down.
7. AFTER: every thread in the pattern gains +1 traffic for the rest of the run and is drawn thicker. Staff that grow update. If the crisis total has reached the target, the crisis clears.

NUMBER RULES
- Influence is a whole number.
- Momentum is kept to one decimal, and after every x step it is rounded down to one decimal.
- The engine stores both as BigInt, with Momentum stored in tenths. A seed therefore scores identically on every browser and device, and nothing overflows.
- Display: full digits up to 999,999,999, then '10.6B' and '1.20T', then e-notation from 1e15, and GOOGOL at 1e100.

WHAT YOU SEE BEFORE YOU COMMIT
- The pattern name, its level and its base (for example 'NETWORK Lv3 140 x 12').
- The sweep-order numbers on the scoring pins.
- The staff that will fire lift slightly on the rail.
- A CLEARS lamp on the SWEEP button, which turns green if this sweep will reach the target.
The total itself is never shown in advance; it is the reveal. An exact-total preview is an accessibility setting, unlocked after the first win.

------------------------------------------------
EXAMPLE 1. EARLY GAME (hundreds): 22:00 Flare-up, target 300, no staff, every pattern at level 1
Flashpoint: Lantern Key. Lit: Lantern Key, Gullrest, Shoal, Edda Vale, Quillon, Northwake, Iceward, Hearth.
Pin Lantern Key, Gullrest and Shoal. Two causeways meet at Lantern Key, so this is a CHAIN: 30 x 3.
- Gullrest +3 → Influence 33.
- Lantern Key +10 → 43. It is the flashpoint, so it scores again: +10 → 53.
- Shoal +7 → 60. The threads have no traffic yet.
- Momentum stays 3. Slam: 60 x 3 = 180. The board reads 180 / 300.
Other plays on the same deal:
- Lantern Key alone (SINGLE): (5 + 10 + 10) x 1 = 25. This is also the median of all 218 legal plays.
- Lantern Key and Gullrest (LINK): (10 + 3 + 10 + 10) x 2 = 66.
- Edda Vale and Quillon (LINK): 24 x 2 = 48.
The Chain is 7.2x the median play.
Sweep 2. Frostmere, Wenmoor and Wintermast light up beside Northwake. Pin all four: FRONT, 45 x 4.
- Northwake +4, Wenmoor +6, Frostmere +3, Wintermast +10 → Influence 68.
- Slam: 68 x 4 = 272.
The total is 452: CLEARED with 2 sweeps unused.
- Funds: 5 + 1 interest + 3 for the crisis + 2 for unused sweeps = 11.
- A brass pin drops on Wintermast.
- The six threads used so far now carry traffic 1.

------------------------------------------------
EXAMPLE 2. MID GAME (thousands, 3 staff): 01:00 Standoff, target 9,000
Setup:
- Network is at level 3: Influence 70 + 2 x 35 = 140, Momentum 6 + 2 x 3 = 12.
- Kelpmouth is Fortified.
- Traffic: Shoal-Lintel 2, Lintel-Tallowmere 3, Kelpmouth-Tallowmere 2, Kellmark-Kelpmouth 1.
- Flashpoint: Tallowmere.
- Seats, left to right:
  1. HARBOURMASTER: each Port that scores +15 Influence.
  2. HOTLINE OPERATOR: +8 Momentum if 3 or more scoring pins are joined.
  3. STRATEGIST: x2 Momentum if 4 or more scoring pins are joined.
Pins: Shoal, Lintel, Kelpmouth, Kellmark and Tallowmere. Shoal-Lintel and Kellmark-Kelpmouth are sea lanes, so this is a NETWORK across three blocs.
- Start: Influence 140, Momentum 12.
- Shoal (port): +7 = 147; Harbourmaster +15 = 162.
- Lintel (port): +6 = 168; thread from Shoal +2 = 170; Harbourmaster +15 = 185.
- Kelpmouth (port): +5 = 190; Fortified +20 = 210; Harbourmaster +15 = 225.
- Kellmark (port): +7 = 232; thread from Kelpmouth +1 = 233; Harbourmaster +15 = 248.
- Tallowmere: +10 = 258; threads from Lintel +3 and Kelpmouth +2 = 263; flashpoint, again +10 = 273.
- Desk: Hotline Operator: 12 + 8 = 20. Strategist: x2 = 40.
- Slam: 273 x 40 = 10,920. One sweep clears 9,000. The brass pin lands on Kelpmouth, which contributed the most Influence (40).
Checks:
- The same pins with no staff: 213 x 12 = 2,556.
- On the same deal with the same staff, the best Front scores 3,720, the best Chain 1,276, and the median play 110.
- Drag the Strategist to the left of the Hotline Operator: Momentum becomes (12 x 2) + 8 = 32, and 273 x 32 = 8,736. That misses 9,000 by 264. Seat order decided the crisis.

------------------------------------------------
EXAMPLE 3. BROKEN LATE GAME (billions): Overtime 10:00 Flare-up, target 600,000,000
Setup:
- Network is at level 6: 245 x 21.
- Lantern Key carries 2 brass pins, so it counts as 10 + 10.
- Traffic: Edda Vale-Morrow Downs 6, Morrow Downs-Tern Isle 9, Tern Isle-Gullrest 4, Gullrest-Lantern Key 3, Tern Isle-Lantern Key 7.
- Seats, left to right:
  1. HERALD: every region counts as a Capital.
  2. GOVERNOR: each Capital that scores +5 Momentum.
  3. SIGNALS OFFICER: Capitals score twice.
  4. DEPUTY: copies the staff to its right.
  5. THE SOVEREIGN (legendary): each Capital that scores x2 Momentum.
Pins: Edda Vale, Morrow Downs, Tern Isle, Gullrest and Lantern Key, joined by land, a sea lane and causeways: a NETWORK.
Every pin now counts as a capital, so every pin scores twice: 10 scoring events. Each event adds the pin's weight to Influence, then Momentum becomes (M + 5) x 2 x 2.
- Momentum: 21 → 104 (Edda Vale) → 436 → 1,764 (Morrow Downs) → 7,076 → 28,324 (Tern Isle) → 113,316 → 453,284 (Gullrest) → 1,813,156 → 7,252,644 (Lantern Key) → 29,010,596.
- Influence: 245 + each weight scored twice, 2 x (10 + 7 + 5 + 3 + 20) = 90, + thread traffic 6 + 9 + 4 + 3 + 7 = 29. Total 364.
- Slam: 364 x 29,010,596 = 10,559,856,944, shown as 10.6B. That is 17.6x the target in one sweep.
Seat order is the skill:
- Drag the Governor to the far right and each event becomes M x 4 + 5. The result is 8,651,450,444, which loses 1.9 billion.
- Drag the Deputy so it copies the Signals Officer instead. Capitals then score three times but get only one x2 each: 415,461,382, which is 25x less.
I computed all three examples with a reference implementation of exactly this order. They are the prototype's unit tests.

## How the map reacts

WHILE YOU CHOOSE
- Lit regions glow warm white and dark regions sit at 30%.
- Each tap drops a brass pin with a soft thock. A thread snaps taut along each join between your pins.
- The pattern draws itself:
  - SURROUND rings the encircled region in light;
  - BLOC tints its pins in their colour;
  - WORLDWIDE fans five hairlines out to its pins;
  - FRONT and NETWORK pull the thread tight.
- Loose pins grey out, and scoring pins show their sweep-order number.
- Touch a staff on the rail and the map shows where it acts. The Harbourmaster lights the 18 ports, the Governor lights the capitals, and the Chief of Staff lights the lit capitals you have left unpinned.

DURING THE SWEEP
- Everything that isn't scoring dims to 30%.
- A thin scan line crosses the table from west to east. A bearing strip along the map's top edge shows the direction.
- At each scoring pin:
  - the region flashes white, then floods its bloc colour, and its number rises out of the region itself;
  - each thread back to an earlier pin lights as a pulse running along it, and its traffic number pops on the thread;
  - stamps pulse;
  - a retrigger snaps the scan line back with an AGAIN tag.
- Once the running total passes what is left of the target, the threads burn white-hot and the Big Board's backlight goes from amber to white. This is our 'flame': light, not fire.

AFTER EVERY SWEEP (the map never resets)
- TRAFFIC: every thread in the pattern gains +1 for the rest of the run and is drawn thicker and brighter:
  - 1-2 traffic: 1.5 pt;
  - 3-5: 2.5 pt;
  - 6-9: 3.5 pt and glowing;
  - 10 or more: 4.5 pt, with its number shown.
  By dawn the worn web of thread is your build.
- INFLUENCE GLOW: a region's fill brightens each time it scores, by +3% per scoring up to +40%. A Sea Lanes run ends with lit coasts; a Crown run ends with blazing capitals.
- The flashpoint ring shrinks in step with the crisis total, so the map is your progress bar.

WHEN A CRISIS CLEARS
- The ring collapses inward and the region cools from red to blue.
- A white shockwave rolls across the whole map, and every region it passes blinks.
- A brass pin drops into the top-scoring region and stays. By dawn there are about 24 brass pins: a record of where the night was won.
- Overwhelm (2x, 4x, 8x) sends a second ripple across the map.

ACROSS THE RUN (every map edit is permanent and drawn)
- Stamps: Fortify (bastion hatching), Relay (double ring), Echo (doubled pin head), Beacon (lamp), Reserve (blue flag), Treasury (gold coin).
- Lay Cable draws a glowing brass cable across the sea.
- Defect repaints a region, and the new colour spreads like ink.
- Merge erases a border and joins the two names.
- Retire shutters a region dark.
- Promote adds a star.
- Every thread ever laid also leaves a faint graphite trace.

SUMMITS ARE PAINTED WHERE THEY BITE
Blackout darkens a bloc. Gridlock crosses out the sea lanes. Embargo greys out the anchors. Full Table puts five empty pin sockets on the readout.

THE CLOCK SETS THE LIGHT
At 22:00 the room is dusk-amber. From 01:00 to 04:00 it is deep night, so your glow matters more. At the 05:00 Dawn Summit the sky pales from the east.

ENDINGS
A win sweeps sunrise across the map and redraws your best sweep's thread in gold. A loss puts the lights out region by region. Either way, the final night map (threads, pins, stamps and ink) is the share image.

## Pieces

STAFF: THE JOKER EQUIVALENT
Staff are the people of your war room, seated along the far edge of the table. Each is drawn only as the object they keep (a ship's bell, a wax seal, a morse key, carbon paper), so there are no faces and no portraits to fake.

THE BASICS
- SEATS: 5. The Extra Chair and Long Table upgrades raise this to 7.
- ORDER: staff fire in seat order, left to right. Drag to reorder at any time between sweeps.
- SELLING: half the price, rounded down, minimum 1.
- RARITY: Common, Uncommon and Rare appear in the shop at 70% / 25% / 5%. Legendaries come only from the Sealed Envelope gambit.
- PRICES: Common ◆3-5, Uncommon ◆6-7, Rare ◆8-10.
- MEDALS (on about 1 shop staff in 25, +◆3): Brass +30 Influence, Silver +6 Momentum, Gold x1.5 Momentum, Ghost (takes no seat).
- LAUNCH SET: 60 staff (24 Common, 20 Uncommon, 11 Rare, 5 Legendary). 45 are available on a first run and 15 are unlocked by feats.
- Every rule is one line, keyed to something you can see on the map.
- TIMING: 'each X that scores' rules fire at the pin during the sweep. 'Standby' rules fire for lit regions you left unpinned. Everything else fires in the desk pass, in seat order.
- v0.2's nuclear and military names (Launch on Warning, The Button, Deadman Switch, Madman Theory) are retired.

30 EXAMPLES (name and object, rarity, price: exact rule)

+INFLUENCE
1. QUARTERMASTER (supply crate), Common ◆3: +30 Influence.
2. HARBOURMASTER (ship's bell), Common ◆4: each Port that scores +15 Influence.
3. SURVEYOR (theodolite), Common ◆4: each scoring region of weight 4 or less +15 Influence.
4. LIAISON (two telephones), Uncommon ◆6: each scoring pin gives +8 Influence for every other scoring pin joined to it.
5. RAIL CLERK (timetable), Uncommon ◆6: threads add triple their traffic.

+MOMENTUM
6. DUTY OFFICER (desk lamp), Common ◆3: +4 Momentum.
7. HOTLINE OPERATOR (red telephone), Common ◆4: +8 Momentum if 3 or more scoring pins are joined.
8. GOVERNOR (wax seal), Common ◆5: each Capital that scores +5 Momentum.
9. LINGUIST (phrasebook), Common ◆4: +3 Momentum for each colour among the scoring pins.
10. NAVIGATOR (sextant), Common ◆4: +3 Momentum each time a sea-lane or cable thread lights.

x MOMENTUM
11. MEDIATOR (teacup), Uncommon ◆6: x3 Momentum if you pinned 3 regions or fewer.
12. STRATEGIST (folded map), Uncommon ◆7: x2 Momentum if 4 or more scoring pins are joined.
13. ENVOY (diplomatic bag), Uncommon ◆7: x2 Momentum if the scoring pins cover 4 or more colours.
14. FLAG SECRETARY (flag bundle), Rare ◆8: x2 Momentum if every scoring pin is one colour (2 or more pins).
15. ADMIRAL (brass telescope), Rare ◆8: each Port that scores x1.5 Momentum.
16. CHIEF OF STAFF (clipboard), Rare ◆9, standby: each lit Capital you did not pin x1.5 Momentum.

RETRIGGERS
17. COURIER (leather satchel), Uncommon ◆6: the first pin in the sweep scores twice.
18. NIGHT WATCH (lantern), Uncommon ◆6: regions with a brass pin score twice.
19. SIGNALS OFFICER (morse key), Rare ◆8: Capitals score twice.
20. LIGHTHOUSE KEEPER (foghorn), Rare ◆9: Ports score twice.

SCALING
21. OLD HAND (tin mug), Common ◆5: +Influence equal to its count. Gains +5 after every sweep (starts at 0; the count is shown on the mug).
22. ARCHIVIST (stamp album), Uncommon ◆6: +2 Momentum for every stamped region on the map.
23. CARTOGRAPHER (brass dividers), Uncommon ◆6: +1 Momentum for every thread on the map with 3 or more traffic.
24. CRISIS MANAGER (pressure gauge), Rare ◆9: x Momentum equal to its count. Starts at x1 and gains x0.5 each time a single sweep clears a whole crisis.

ECONOMY
25. TREASURER (cash box), Common ◆4: +4 Funds whenever a crisis clears.
26. TOLL KEEPER (toll gate), Common ◆5: each Port that scores +1 Funds.
27. BANKER (strongbox), Uncommon ◆6: +1 Momentum for every 5 Funds you hold, and your interest cap is 4 higher.

COPIER
28. DEPUTY (carbon paper), Rare ◆10: copies the staff in the seat to its right (its rule, its count and its timing).

RULE-BENDERS
29. FERRY MASTER (ferry timetable), Uncommon ◆7: all Ports count as joined to each other. While it is seated, the map draws dotted ferry arcs.
30. HERALD (paper crown), Rare ◆8: every region counts as a Capital.
The launch set also includes:
- SECRETARY (shorthand pad): Network, Bloc and Worldwide need only 4 pins.
- HOST (open door): loose pins score too.
- RADIO OPERATOR: regions two joins apart count as joined.
- UNDERSTUDY: standby effects fire twice.
- LOOKOUT (binoculars): see the next 3 regions due to light; +1 swap.

5 LEGENDARIES (from the Sealed Envelope only; each enables a broken build)
L1. THE SOVEREIGN (signet ring): each Capital that scores x2 Momentum. With the Herald, the Signals Officer and a Deputy copy, this is Example 3: 10.6 billion in one sweep.
L2. THE ECHO (tape recorder): every scoring pin scores twice. With the Admiral and the Lighthouse Keeper, five ports become 20 rounds of x1.5.
L3. THE NIGHT PORTER (pocket watch): x Momentum equal to its count. Starts at x1 and gains x1 for each crisis you clear with 2 or more sweeps unused. A clean night ends near x15.
L4. THE CARTOGRAPHER'S PEN (fountain pen): threads add their traffic to Momentum instead of Influence, and each thread that lights gains +5 traffic instead of +1. With the Rail Clerk, worn lanes become huge multipliers.
L5. THE OVERPRINT (rubber stamp): region stamps fire twice. A Relay becomes x2.25, a Fortify +40, and an Echo region scores three times.

## Archetypes

Each build has a core, a look on the map, a way to break the game and a Summit that counters it. A build counts as assembled once two of its core staff are seated. Simulator targets: every build can reach dawn at Alert 1, and no staff appears in more than 35% of winning builds.

1. SEA LANES (ports)
- Core: Harbourmaster, Admiral, Lighthouse Keeper, Ferry Master, Toll Keeper.
- Map: Lay Cable (both ends become ports); Relay stamps on ports.
- Plays: Networks along lanes and causeways. With the Ferry Master, any five lit ports make a Network.
- Breaks: the Admiral plus the Lighthouse Keeper give x2.25 per port. With a Deputy copying the Admiral, five ports reach about x3,300.
- Look: glowing cables and worn sea threads.
- Countered by: Embargo and Gridlock.

2. THE CROWN (capitals)
- Core: Governor, Signals Officer, Herald, Chief of Staff; The Sovereign.
- Map: Promote.
- Breaks: worked Example 3, 10.6 billion in one sweep.
- Look: stars everywhere.
- Countered by: Capital Freeze.

3. ONE COLOUR (blocs)
- Core: Flag Secretary, Secretary, Bloc Playbooks.
- Map: Defect to paint the world one colour, then Retire and Merge to shrink a colour to 3-5 regions, which unlocks WHOLE BLOC (140 x 12).
- Breaks: a 3-region Whole Bloc under the Mediator (x3) and the Flag Secretary (x2).
- Look: one colour spreading like ink.
- Countered by: Blackout.

4. QUIET ROOM (small sweeps)
- Core: Mediator, Courier, Surveyor, Old Hand; Surround and Chain Playbooks; Echo stamps.
- Plays: 3-pin Surrounds round 3-neighbour regions such as Wenmoor, Dunmarrow and Iceward.
- Breaks: a Deputy copying the Mediator gives x9 on three pins.
- Countered by: Full Table.

5. THE WEB (joined shapes and traffic)
- Core: Liaison, Hotline Operator, Strategist, Rail Clerk, Cartographer; The Cartographer's Pen.
- Map: Lay Cable and Hub stamps. You sweep the same corridor every crisis until its threads carry 10, 20, then 30 traffic.
- Breaks: the Pen turns traffic into Momentum, and the Rail Clerk triples it.
- Look: one thick, glowing trunk route.
- Countered by: Gridlock and Quiet Traffic.

6. RESERVE (what you leave lit)
- Core: Chief of Staff, Understudy, Reserve stamps; Wider Table upgrades.
- Plays: small sweeps that deliberately leave capitals and Reserve regions lit.
- Breaks: three lit Reserve capitals doubled by the Understudy give x1.5 six times, about x11.4. With the Herald, every lit region counts as a capital.
- Countered by: Undertow.

7. LEDGER (money into score)
- Core: Treasurer, Toll Keeper, Banker; Treasury stamps; bond upgrades; The Night Porter.
- Plays: skip purchases to bank interest. This is the 'my nerve made this' build.
- Breaks: holding ◆80 gives the Banker +16 Momentum, and a Deputy copy adds +16 more.
- Countered by: Alert levels that cut income.

8. GRAND TOUR (every colour)
- Core: Linguist, Envoy, Host; Worldwide Playbooks.
- Map: Lay Cable until AROUND THE WORLD (180 x 15) opens.
- Breaks: Around the World at level 4 or higher with the Envoy (x2) and the Linguist (+15).
- Look: one thread circling the world.
- Countered by: Blackout.

## Consumables and shop

FUNDS (◆) ARE THE CURRENCY
You start a run with ◆5. When a crisis clears you earn:
- the clear reward: Flare-up 3, Standoff 4, Summit 5, Dawn Summit 8;
- +1 for each unused sweep;
- interest: +1 for every ◆5 held, counted before the payout, capped at +4 (the Savings Bond adds +4 to the cap, the Treasury Bond +8 more, and the Banker +4);
- Overwhelm: +1 at 2x the target, +2 at 4x, +3 at 8x.
Early income is 6-9 per crisis, enough for one staff or two papers per Briefing. Saving for interest against buying now is a real choice every time.

THE BRIEFING (the shop; opens after every cleared crisis, 23 times a night)
A linen briefing tray rises over the lower half of the screen, and the map stays visible above it.
- 2 OFFER slots, weighted staff 70 / Order 15 / Playbook 15.
- 2 FOLDER slots (packs).
- 1 WAR ROOM UPGRADE, a new one each Hour.
- REROLL costs ◆4, then +1 each time, and resets at the next Briefing.
- SELL: tap a seated staff or a paper to sell it for half price.
- The first Briefing of every run holds a Recruit Folder.
- Long-press any offer and the map shows where it acts.

PAPERS (consumables)
Papers sit in an IN-TRAY of 2 slots. You can use them during a crisis (before a sweep) or at the Briefing.

PLAYBOOKS (the planet equivalent, ◆3)
There is one per pattern. Each adds +1 level to its pattern for the rest of the run, for example 'Network Playbook: +35 Influence, +3 Momentum'. Playbooks apply as soon as you buy them. A secret pattern's Playbook appears only after you have made that pattern. Levels give a run its name: 'my Surround run'.

ORDERS (the tarot equivalent, ◆3; 20 at launch)
Orders can target any region, lit or dark. A region holds one stamp, and a new stamp replaces the old one.
1. FORTIFY: up to 2 regions; +20 Influence each time they score.
2. BEACON: up to 2 regions; +4 Momentum each time they score.
3. RELAY: 1 region; x1.5 Momentum each time it scores.
4. ECHO: 1 region; it scores twice.
5. TREASURY: up to 2 regions; +3 Funds each time they score.
6. RESERVE: up to 2 regions; x1.5 Momentum while lit and unpinned (standby).
7. HUB: 1 region is joined to every region of its colour.
8. LAY CABLE: join any two regions with a drawn cable; both become Ports.
9. DEFECT: up to 2 regions take the colour of a third region you choose, and the ink spreads.
10. MERGE: two joined regions of the same colour become one; weights add, joins combine and one stamp is kept.
11. RETIRE: up to 2 regions go dark for the run and never light again.
12. RAISE: +3 weight on up to 2 regions.
13. PROMOTE: 1 region becomes a Capital.
14. AIRLIFT: during a crisis, add one pin to any region that isn't spent, lit or dark.
15. FORECAST: see the next 6 regions due to light this crisis.
16. REQUISITION: +2 Funds for each stamped region on the map (up to +20).
17. RECRUIT: a random Common staff (needs a free seat).
18. SECOND OPINION: 2 random Playbooks, applied now.
19. REPEAT: copy the last Order you used.
20. MOVE STAMP: move one stamp to another region.
WHY AIRLIFT IS AN ORDER: the judges asked for a free airlift every crisis. In simulation that made NETWORK the best play in 65% of deals and flattened the pattern ladder, so airlift is a paper you buy (and the Air Wing upgrade). It stays a choice, not a default.

GAMBITS (the spectral equivalent; high risk; found only in Black Folders; 10 at launch)
- SEALED ENVELOPE: a Legendary staff (needs a free seat). This is the only source of Legendaries.
- SELL-OUT: a Rare staff; your Funds drop to 0.
- TWIN: copy one random staff; all the others leave.
- UNIFICATION: every region joins one random colour, and you lose 1 swap per crisis for the rest of the run. The whole world repaints in one move.
- WORLD CONGRESS: every pattern gains +1 level.
- DEEP COVER: Echo-stamp 3 random regions; lose ◆5.
- LANDSLIDE: +4 weight on every region of one random colour; one random staff leaves.
- REDRAW: shuffle every region's colour.
- OPEN SEA: lay 3 random cables; 1 fewer lit region for the rest of the run.
- OVERPRINT: give one staff a random Medal; another random staff leaves.

FOLDERS (packs)
- Recruit (staff), Orders and Playbook folders: ◆4 (pick 1 of 3), ◆6 (pick 1 of 5), ◆8 (pick 2 of 5).
- Black Folder: ◆6, pick 1 of 2 gambits. It appears in about 1 Briefing in 6.
- When an Orders folder opens, the tray slides down so you can tap the whole map.

WAR ROOM UPGRADES (the voucher equivalent; ◆10 each, permanent, in pairs; the second of a pair needs the first)
- Second Phone / Third Phone: +1 swap each.
- Extra Chair / Long Table: +1 seat each.
- Wider Table / Widest Table: 9, then 10 lit regions.
- Night Shift / Double Shift: +1 sweep each.
- Savings Bond / Treasury Bond: interest cap +4, then +8 more.
- Discount Desk / Trade Deal: prices -25%, then -50%.
- Forecast Board / Radar Room: always see the next 3, then 6, regions due to light. This is the main tool for managing luck.
- Archive / Big Archive: +1 in-tray slot each.
- Map Room / Atlas: Playbooks appear twice as often, then give 2 levels each.
- Air Wing / Air Bridge: 1, then 2, free Airlifts per crisis.

FAVOURS (the reward for skipping a Flare-up or Standoff)
A free Rare in the next Briefing; +1 level to the pattern you sweep most; +◆12; a free large Orders Folder; free rerolls at the next Briefing; a free Airlift.

HOW THE SHOP CHANGES THE MAP
You drag Orders onto regions, and the change is drawn at once and stays for the run. Long-pressing a staff offer lights the regions it cares about.

## Progression

THE NIGHT: 8 HOURS x 3 CRISES = 24 CRISES, 22:00 TO DAWN
Targets (Flare-up / Standoff / Summit):
- 22:00: 300 / 450 / 600
- 23:00: 900 / 1,350 / 1,800
- 00:00: 2,500 / 3,750 / 5,000
- 01:00: 6,000 / 9,000 / 12,000
- 02:00: 12,000 / 18,000 / 24,000
- 03:00: 22,000 / 33,000 / 44,000
- 04:00: 38,000 / 57,000 / 76,000
- 05:00: 60,000 / 90,000 / Dawn Summit 120,000
That is a 200x rise; Balatro's base curve is 167x. The first three Hours open at the brief's 300 / 900 / 2,500.

CALIBRATION
I used a reference bot that plays the best legal sweep and swaps sensibly, over 200 crises per row, with no airlift.
- No staff: 300 / 450 / 600 cleared 100% / 100% / 98%; 900 90%; 1,350 71%; 1,800 34%; 2,500 7%. Gridlock at 600: 84%. You can learn the first Hour bare-handed; Hour 2 needs a staff.
- One Duty Officer: 1,800 92%, 2,500 50%, 3,750 10%.
- Duty Officer + Hotline Operator (◆7 of Commons): 2,500 99%, 3,750 83%, 5,000 59%.
- Three staff: 3,750 97%, 5,000 93% (92% under Full Table), 9,000 54%.
- A bot tapping random regions clears 300 only 9% of the time.
Hours 4-8 are first guesses for the bots to tune.

WINNING
Clear the 05:00 Dawn Summit. Sunrise sweeps the map from the east. The Dawn screen shows your night map, best sweep, night total and staff, with two choices: NEW NIGHT or KEEP THE LIGHTS ON (Overtime).

SUMMITS (one twist each; 20 at launch; painted on the map at the start of the Hour)
Ten examples:
1. BLACKOUT: one named colour scores nothing. Its regions still count for shapes.
2. FOG: lit regions hide their colour and weight until pinned.
3. EMBARGO: Ports score nothing.
4. GRIDLOCK: sea lanes and cables are cut.
5. ONE VOICE: every sweep must make the same pattern as your first.
6. FULL TABLE: every sweep must pin exactly 5.
7. STONEWALL: no rule, but the target is x4 instead of x2.
8. DEADLINE: one sweep only, at target x1.
9. CAPITAL FREEZE: Capitals score nothing.
10. COLD DESK: before each sweep, one random staff is switched off (shown).
The rest of the pool includes Recount (pattern bases halved), Rising Tide (target +10% after each sweep), Split Map (no joins across the centre line), Small Talk (Single, Link and Two Links score nothing), Undertow (unpinned lit regions are swapped out after every sweep) and Quiet Traffic (threads add nothing).

DAWN SUMMITS (5)
- The Long Table: target x6.
- Last Light: 6 lit regions and no swaps.
- The Quorum: only Worldwide, Network, Bloc and the secret patterns score.
- Static: every stamp is switched off.
- Lights Out: borders and colours are hidden.

OVERTIME (endless)
The Flare-up target for Overtime hour h is 60,000 x 10^(0.1h² + 0.3h). Standoff is x1.5 and Summit x2.
- 06:00: 151k. 07:00: 600k. 08:00: 3.8M. 09:00: 38M. 10:00: 600M.
- 11:00: 15B. 13:00: 3.8e13. 15:00: 6e17.
- At Overtime hour 30 the target passes a googol. The split-flap board runs out of flaps and spins off its axle: this is the GOOGOL ending, kept as a local record.
All numbers are exact BigInt.

META (no accounts; everything is kept on the device)
- 8 DOCTRINES (the starting decks), each with its unlock:
  - Open Map: the start.
  - Night Watch: +1 swap. Unlock: reach 00:00.
  - Big Table: +1 seat, -1 sweep. Unlock: win once.
  - Wide Table: 10 lit regions, -1 seat. Unlock: make 10 Surrounds.
  - Two Camps: the world starts as two colours, west and east. Bloc is easy and Worldwide impossible. Unlock: make 5 Blocs.
  - Cartographer: start with 2 Lay Cables and the Forecast Board. Unlock: lay 8 cables in one run.
  - Treasury: start with ◆15 and a Banker. Unlock: hold ◆40.
  - Long Night: 10 Hours, every pattern starts at level 2, targets x1.5. Unlock: win at Alert 4.
- 8 ALERT LEVELS per doctrine (the stakes), cumulative:
  - Alert 2: Flare-ups pay nothing.
  - Alert 3: targets +25% from 00:00.
  - Alert 4: three random regions start retired.
  - Alert 5: -1 swap.
  - Alert 6: flashpoints no longer score twice.
  - Alert 7: some shop staff are Bolted (can't be sold or moved).
  - Alert 8: the Dawn Summit has two twists.
- 3 WORLDS:
  - The Five Blocs (launch).
  - The Archipelago: 6 colours of 5 islands, with many lanes. Unlock: win once.
  - The Old Continent: one landmass of 5 colours round an inland lake, with no lanes. Unlock: reach dawn at Alert 4.
  A world is new map data plus one baked plate, and it changes every pattern's odds.
- 15 STAFF unlocked by feats. Examples: make a Surround (Understudy); score 100,000 in one sweep (Deputy); lay 3 cables in one run (Ferry Master); clear a crisis using only sweeps of 3 pins or fewer (Mediator); make every public pattern in one run (Secretary).
- THE ARCHIVE: every staff, pattern (secrets as ???), Order and Summit you have seen.
- LOCAL STATS: runs, wins and win rate per doctrine and Alert level, best sweep, best night, furthest Overtime, favourite pattern.
- DAILY MAP: the same seeded night for everyone each UTC day, with a local best and streak and a share image. No names and no leaderboards.
- SHORT NIGHT (unlocked by the first win): 4 Hours, about 15 minutes.

## War room screen

THE LOOK
- A dark room around a back-lit glass plotting table. The light comes from the table.
- Ink-blue sea (#0D1B2A) and land in muted bloc tints with hair-thin borders. Lit regions are warm white.
- Brass pins with coloured glass heads, and red thread that turns white-hot.
- Every number sits on split-flap (Solari) boards that clatter.
- Staff are small brass, bakelite and paper objects on brass plaques along the far edge of the table, each with a rarity rim: pewter for Common, brass for Uncommon, silver-blue for Rare, gold for Legendary.
- Orders are typed paper slips with a rubber stamp. Funds are a brass coin.
- The lamp light follows the clock.
- Colour only ever carries meaning: Influence cyan #5FD4F4, Momentum amber #FFB547, target red #FF5A4E, Funds brass #C9A35B. The bloc colours always come with a glyph.
- Type, all open-licence from Google Fonts: Barlow Condensed for labels, JetBrains Mono for numbers, Saira Stencil One for pattern names.
- No cards, no felt, no chips, no CRT, no pixel art, no portraits, no mascot.

PORTRAIT PHONE, 390 x 844 pt (rects are x, y, w, h)
- 0, 0, 390, 47: status bar.
- 0, 47, 390, 60: THE BIG BOARD.
  - Clock '23:00' at 16, 51 (17 pt mono). Under it 'STANDOFF ●●○' (9 pt caps). Under that the Summit chip 'SUMMIT: BLACKOUT' (8 pt, red caps).
  - 'LEVERAGE' label (8 pt) at 112, 50. The crisis total in 28 pt split-flap at 112, 60, followed by '/ 1,350' (14 pt), ending at x 296.
  - Funds coin at 304, 57, 70, 40: '◆ 11'.
  - A 4 pt progress rule across 0, 103, 390, 4 fills amber and turns white at the target.
  - This strip is the only place the score and target appear.
- 0, 107, 390, 64: THE STAFF RAIL.
  - 5 seats of 64 x 58 at x = 17, 90, 163, 236, 309, y = 110.
  - Each seat shows a 34 pt object, a seat number (7 pt) and an effect chip along the bottom edge ('+15⚓', 'x2', '+8M'). Growing staff carry a count tag.
  - Tap a seat for its one-line rule; long-press and drag to reorder. The rail is never hidden behind a menu.
- 0, 171, 390, 520: THE MAP. Full bleed and the biggest thing on screen. It shows:
  - a bearing strip along its top 10 pt, with the sweep direction W to E;
  - the flashpoint ring, the 8 lit regions, pins and threads;
  - traffic thickness, stamps, cables and brass pins;
  - the Summit twist painted where it applies.
- 0, 691, 390, 48: THE READOUT.
  - The pattern name at 16, 697 (20 pt stencil) followed by 'Lv 2'. When nothing is selected it reads 'Tap lit regions'.
  - INFLUENCE box at 196, 695, 86, 40 (cyan), then 'x', then the MOMENTUM box at 300, 695, 74, 40 (amber).
  - The cascade counts up in these two boxes.
- 0, 739, 390, 68: THE CONTROLS.
  - SWAP at 16, 745, 96, 56 ('SWAP · 3').
  - Two in-tray paper slots at 120, 745, 52, 56 and 178, 745, 52, 56.
  - SWEEP at 238, 745, 136, 56: a brass lever button ('SWEEP · 4'). Its CLEARS lamp is a 12 pt bulb at 352, 751.
- 0, 807, 390, 37: home indicator.
There are no meters and no paragraphs anywhere.

THE BRIEFING (portrait)
The tray rises over 0, 451, 390, 356 and the map stays visible from y 171 to 451. It shows two offer cards of 171 x 150, a folder card, REROLL ◆4 and NEXT CRISIS. Long-pressing an offer lights the map above.

LANDSCAPE PC (1920 x 1080, scales to 1280 x 800 for Steam Deck)
- LEFT PANEL (x 0-440):
  - the Big Board (clock, crisis, Summit chip), y 40-150;
  - LEVERAGE in 72 pt with the target and progress rule, y 170-320;
  - the pattern name in 40 pt with the INFLUENCE and MOMENTUM boxes (170 x 80 each), y 360-520;
  - sweep and swap counters, y 560-620;
  - Funds, y 660.
- TOP CENTRE: the staff rail, 5 seats of 170 x 140 at x 520, 710, 900, 1090 and 1280, y 24-164, with room for 2 more.
- CENTRE: the same map plate at 645 x 860, at 637, 196.
- RIGHT PANEL (x 1480-1900):
  - the Summit card, 1500, 40, 380, 200;
  - the pattern list (11 rows with levels; secrets shown as ???), 1500, 260, 380, 460;
  - two in-tray slots;
  - SWAP and the SWEEP lever, 180 x 120 each, at y 900.
- During the Briefing the shop appears in the right panel and a band under the rail, and the map stays fully visible.
- Keys: click to pin, Space to sweep, S to swap.

## The scoring moment

Timings below are at 1x speed, for worked Example 2: a 5-pin Network with 3 staff, target 9,000.

0.00 s. SWEEP pressed. The brass lever drops with a low thock and a medium haptic. Over 0.15 s everything that is not scoring dims to 30%.

0.15 s. The threads between the scoring pins tighten from 1 pt to 2 pt. 'NETWORK' is rubber-stamped onto the readout (a 0.2 s ink thunk). The two boxes flap to their base, 140 x 12.

0.45 s. The scan line enters from the west. Each scoring event takes 320 ms, and each one after that is 6% quicker, so the sweep accelerates.
- 0.45 s, Shoal: the region flashes white, then gold. A cyan '+7' rises from the island and flies into the Influence box, with a tick sound one step up a pentatonic scale. The ship's bell in seat 1 hops 6 pt and flings '+15' (162).
- 0.77 s, Lintel: '+6'. A pulse runs back along the dashed lane from Shoal and pops '+2', then the bell rings again (185).
- 1.07 s, Kelpmouth: '+5', the Fortified hatching flashes '+20', then the bell (225).
- 1.36 s, Kellmark: '+7', the lane pulse '+1', then the bell (248).
- 1.62 s, Tallowmere: '+10', and two threads light '+3' and '+2' (263).
- 1.87 s: the scan line snaps back, an amber 'AGAIN' tag appears over Tallowmere (the flashpoint), the note repeats an octave up, and Influence reaches 273.

2.10 s. THE DESK, 0.25 s per firing staff.
- The red telephone in seat 2 rings: '+8' flies to Momentum (20).
- The folded map in seat 3 snaps open: 'x2'. The Momentum box shudders, grows and doubles to 40, with a deep brass chunk and a 2 px kick.

2.60 s. THE SLAM. The cyan and amber boxes slide together in 0.2 s and collide with a heavy stamp. The bass of the slam scales with log10 of the result.
- Screen shake depends on the sweep's share of the target still left, not on the raw number: none under 25%, 2 px from 25% to 1x, 5 px from 1x to 10x, 9 px at 10x or more, plus a map flash. Here it is 1.2x, so 5 px.
- '10,920' prints on the Big Board in a right-to-left flap cascade (0.4 s).

THE HEAT. As soon as the running product passes the target still left, which here happens at the desk pass, the Big Board's backlight goes from amber to white-hot and the threads burn white. This is our flame: light, not fire.

3.20 s. The crisis total ticks up (0.3 s), and the flashpoint ring shrinks to nothing.

3.50 s. CLEARED.
- The ring collapses with a soft whoomp and a rising major chord.
- Tallowmere cools from red to blue.
- A white shockwave rolls across the whole map in 0.6 s, and every region it crosses blinks.
- 'CLEARED' is stamped onto the board at a 3° tilt.
- A brass pin falls into Kelpmouth with a bounce.

4.10-4.90 s. Coins click into the Funds coin one by one, 90 ms apart. Then the Briefing tray rises.

SCALING THE SPECTACLE
- From 10x the target, the whole map flashes in the colour of the top-scoring region.
- From 100x, light races along every lane and cable.
- After the 12th scoring event, each event takes 60 ms and the notes become a glissando. Example 3's 10 events take about 4.3 s in total.

SETTINGS
Speeds 1x, 2x and 4x, and a tap skips to the slam. Reduced motion: no shake, no flying numbers, the counters update in place, and the whole sequence takes 1.2 s or less; all sounds stay.

SOUND
All audio is synthesised, using the repo's existing sfx.ts voices: tally_tick per pin, tally_mult per staff, retrigger for AGAIN, tally_slam for the slam, ante_smash for a clear, ante_miss for a loss and capital for coins. There are no audio files.

## First 60 seconds

There is no rules screen and no logo longer than 1 second. Hints are single lines on the Big Board and appear only on the first night.

0:00. The app opens straight into the war room. A lamp clicks on and the map glows dim amber. The clock reads 22:00. The board flaps to 'Hold the world together until dawn.'

0:03. A red ring pulses on Lantern Key and the board clatters to 'TARGET 300'. Eight regions light one by one, with a click each: Lantern Key, Gullrest, Shoal, Edda Vale, Quillon, Northwake, Iceward and Hearth. Hint: 'Tap a lit region.' A finger icon pulses on Lantern Key.

0:06. TAP 1, Lantern Key. A brass pin drops with a light haptic. The readout says 'SINGLE 5 x 1'. Hint: 'Pins that touch join up.' Gullrest and Shoal, which are joined to it, start to breathe.

0:09. TAP 2, Gullrest. A thread snaps along the causeway: 'LINK 10 x 2'.

0:11. TAP 3, Shoal. 'CHAIN 30 x 3'. Small order numbers 1, 2 and 3 appear on Gullrest, Lantern Key and Shoal. The SWEEP lever glows. Hint: 'Sweep.'

0:13. TAP 4, SWEEP. The scan line crosses the map: Gullrest +3; Lantern Key +10, then AGAIN +10; Shoal +7. The boxes slam 60 x 3 = 180. The board reads 180 / 300 · 3 sweeps left, and the red ring shrinks to 40%.

0:17. Frostmere, Wenmoor and Wintermast light up beside Northwake. This time there is no hint. Most players tap the four northern regions and see 'FRONT 45 x 4', and the CLEARS lamp turns green.

0:22. Sweep. 68 x 4 = 272, so the total is 452. The ring collapses, a shockwave rolls across the map and CLEARED is stamped. A brass pin drops into Wintermast. Coins click: ◆5 becomes ◆11 (+1 interest, +3 for the crisis, +2 for unused sweeps).

0:29. The Briefing tray rises, with the map still visible above it. On offer: DUTY OFFICER ◆3 (a desk lamp, '+4 Momentum'), HARBOURMASTER ◆4 (a ship's bell, 'Ports +15 Influence') and a Recruit Folder ◆4. Hint: 'Hire staff. They sit at your table and fire every sweep.' Long-pressing the Harbourmaster lights all 18 ports. Tapping the Duty Officer slides the lamp into seat 1.

0:37. NEXT CRISIS: 'STANDOFF 450'. A new red ring appears.

0:41. The player pins a Chain and sweeps. After the pins, the desk lamp hops and '+4' flies into Momentum: 3 becomes 7, and the sweep more than doubles. It is the first time they see their own staff work.

0:55. If the deal has no joined pair, a hint appears over SWAP: 'Nothing joins? Select regions and SWAP them.' After the Standoff, the board shows 'SUMMIT: GRIDLOCK. Sea lanes are cut', and the lanes are crossed out on the map.

At 60 s the player has pinned, joined, made two patterns, swept, cleared, hired and watched a staff multiply a sweep. They have read five short lines. Later rules arrive as one line each, the first time they matter: the first Order bought ('Drag it onto the map'), seat order the first time a x staff is seated, and Playbooks the first time one is offered.

## Why it fixes the complaints

'I COULDN'T TELL WHAT TO DO (too many numbers, bars and rules; no idea how to win)'
- There is one goal, always on screen: 'Reach 450 · 3 sweeps left'.
- There is one action: tap lit regions.
- There is one way to win (reach dawn) and one way to lose (miss a target). v0.2 had two win conditions and taught four rules before play.
- During scoring, exactly two numbers multiply, and the result is checked against one target.
- The game names the pattern as you tap, draws the threads, numbers the sweep order, and lights a CLEARS lamp when a sweep will finish the crisis.
- There are no meters, odds, timers, hidden values or paragraphs.
- The first crisis is scripted to teach a Chain and a Front without a rules screen.

'MY CHOICES FELT POINTLESS (21 vs 23)'
- The pattern bases run from 5 to 720, and 2,700 with secrets.
- On this exact map, the best play is a median 8.4x the median play, and at least 3x it in 96% of deals.
- In the tutorial deal, the Chain scores 180 against a Single's 25. In Example 2, the Network scores 10,920 against a Chain's 1,276 and a median play of 110.
- Seat order alone turns 8,736 (a miss) into 10,920 (a clear).
- A bot tapping at random clears the first target 9% of the time; good play clears it 100% of the time.
- The bigger number always points towards winning. Nothing hidden inflates it, unlike v0.2's escalation multiplier.
- Your build sits on the rail from the first Briefing and fires visibly in every sweep. Every sweep also changes the map permanently through traffic, brass pins and influence glow.

'IT LOOKED UNFINISHED (placeholder art, walls of text)'
- There are no portraits and no prose. Every rule is one line.
- The game rests on one hero object, the lit map table, plus split-flap boards, brass pins, thread and about 65 small desk objects. That art list is small enough to commission and finish.
- The greybox uses flat bloc colours and glyphs, which look deliberate.
- A painted war-room screen is made alongside the greybox, so the look and the fun are judged separately.

'WRONG FOR MY MARKET'
- It is a Balatro-like, the most proven premium roguelike shape on Steam and phones. Balatro has sold 5M+, about half of that after its mobile launch, and Gambonanza, a Balatro-like on a board, sold 300k.
- No Balatro-like we could find uses a world map, and 'pins on a world map' reads in one glance in a muted 6-second clip.
- It plays with one thumb in portrait, in crises of about a minute, and saves after every sweep.
- It has no cards, chips or slots, so it avoids the gambling imagery that cost Balatro a PEGI 18. It is non-graphic and fully fictional.
- There are no accounts and no social features (UK Online Safety Act). The Daily Map and share images keep the social side off-platform.

## Why it is balatro compelling

WHERE THE ONE-MORE-RUN PULL COMES FROM
1. Visible near-misses. You can see the Surround that is one region away, so you swap 'just once more'. The ladder's gaps are 1.5x to 2x per rung.
2. An engine you set up and then watch run. Per-pin x staff, retriggers, copiers and stamps compound, and both seat order and where you pin (west to east) change the result. There is always a better arrangement to find.
3. The map is a deck you rewrite permanently. Cables, defections, merges, retirements, stamps, worn threads and brass pins mean that by dawn your world looks unlike anyone else's, and the share image proves it.
4. Discovery. Secret patterns open only through map surgery (Whole Bloc, Around the World), there are five legendaries, and Black Folders are rare.
5. Overkill always pays: brass pins, Overwhelm Funds and the Crisis Manager.
6. A Summit every Hour forces a pivot. Doctrines times Alert levels give 64 ladders, there are Worlds to unlock, and Overtime runs to a googol.
7. Restart takes under 2 seconds. There is a Daily Map and a Short Night mode.

THE BREAKING-THE-GAME MOMENTS
- The Admiral plus the Lighthouse Keeper make every port x2.25.
- The Crown build reaches 10.6 billion from five pins (Example 3).
- The Cartographer's Pen plus the Rail Clerk turn a worn trunk route into a multiplier.
- The Overprint on Relay stamps, and the Night Porter climbing to about x15.
Builds grow exponentially while targets grow on a fixed curve, so a good build ends up hundreds of times over the target, and Overtime runs until the display gives out.

WHAT COULD MAKE IT FALL FLAT (honestly)
- Geometry reads more slowly than poker hands. Players must scan 8 scattered regions, and nobody arrives already knowing the ladder.
- Surround and loose pins may confuse.
- Chain and Worldwide are the best play in about half of fresh deals, so play may feel samey until staff and Playbooks pull players elsewhere.
- A sweep across a map may feel slower than cards stepping forward.
- The deals are random. Lantz called Balatro a 'slot machine' for the same reason; swaps, Forecast and Radar have to make it feel managed.
- 18 of the 30 regions are ports, so Sea Lanes may dominate.
- The same map every run could wear thin before Worlds unlock.
- A late-game map full of stamps and threads could become noise.
- A war room can read as cold or military.
None of this is known until 5-10 people play a greybox on their own phones. LocalThunk's one-hour retention test is the bar.

## Run length and platforms

LENGTH
- A crisis takes 40-70 s: 2-4 sweeps of about 8 s of thought each, plus a 3-5 s cascade. A Briefing takes 20-40 s.
- A full night (24 crises) takes 30-45 minutes. An early loss comes after 8-15 minutes.
- After the first win, Short Night (4 Hours) takes about 15 minutes.
- The Daily Map is one full night.
- The game saves after every sweep and every purchase. The save is plain JSON with the RNG state inside, so a killed app resumes exactly where it stopped.
- NEW NIGHT takes under 2 s.

PLATFORMS (one TypeScript codebase, the existing repo)
- iOS and Android (Capacitor): portrait first, one thumb, haptics on every pin; landscape on tablets. Premium at about $6.99 with no IAP and no ads, or a free demo plus one store-billing unlock if a store favours that. The Stripe link never ships in store builds.
- Steam (Windows, macOS and Linux via Tauri; Steam Deck as a target): the landscape layout, with mouse, keyboard and controller. $9.99, with a demo that has no round limit: Hours 1-3 and the Daily Map, replayable forever. Balatro's unlimited demo was its best marketing.
- Web (a PWA on our own site and itch): the same demo, then a one-time $6.99 unlock through the existing Stripe → Worker → offline-token flow.

RATING TARGET
PEGI 7 / ESRB E10+: no gambling imagery, nothing graphic, everything fictional.

COMPLIANCE
- No accounts, chat, names, leaderboards or user-generated content.
- Best scores and stats stay on the device. Sharing is an image or text through the OS share sheet.
- Analytics are cookie-free and off by default. No location is used.
- © Hallam Burnapp, all rights reserved.

## Distance from balatro

WHAT IS OURS
- THE VERB: pinning regions on a world map. The shape is the move.
- THE HAND: the lit regions of a fictional world. Patterns are geography (Link, Chain, Front, Surround, Network, Worldwide, Bloc), with no ranks, suits or poker hands. Scoring order comes from the map itself, west to east.
- THE DECK: the map, permanently edited by cables, defections, merges, stamps and retirements.
- NEW MECHANICS:
  - thread traffic that wears into the map;
  - brass pins from cleared crises;
  - Standby, a spatial version of effects from cards held in hand;
  - a flashpoint that scores twice;
  - the CLEARS lamp;
  - secret patterns unlocked by map surgery;
  - Worlds.
- THE LOOK: a back-lit plotting table, brass pins and red thread, split-flap boards, desk objects on brass plaques, typed paper Orders, dusk-to-dawn light. No cards, felt, chips, jesters, CRT, pixel art or mascot.

THE NAMES (Balatro term → ours)
- Score → Leverage.
- Chips x Mult → Influence x Momentum.
- Blinds → Flare-up / Standoff / Summit.
- Ante → Hour; run → Night.
- Hand / discard → Sweep / Swap.
- Cards in hand → lit regions; deck → the map.
- Poker hands → Patterns.
- Planets → Playbooks.
- Jokers → Staff in Seats.
- Tarots → Orders.
- Spectrals → Gambits.
- Packs → Folders.
- Vouchers → War Room Upgrades.
- Tags → Favours.
- Decks → Doctrines.
- Stakes → Alert levels.
- Editions → Medals.
- Money → Funds.
- Endless → Overtime; naneinf → the Googol ending.

OUR NUMBERS
Pattern bases (Link 10 x 2, Worldwide 30 x 2, Bloc 90 x 8), the target curve, the payouts (3 / 4 / 5 / 8), the interest cap (+4) and the reroll start (◆4) differ from Balatro's tables.

OPENLY LEARNED (mechanics, not presentation)
- two numbers multiplied against a rising target;
- 4 plays and 3 discards from a hand of 8;
- an ordered rail of modifiers;
- permanent pattern levels;
- deck editing;
- an interest economy with rising rerolls;
- rule-twist bosses, stakes and skip rewards;
- a super-exponential endless mode.
Keep a written list of these differences in case of an App Store guideline 4.1 'copycat' query.

## Risks

- The geometry hand is the whole bet, and no person has played it yet. Every number here comes from a bot on a candidate map. Players may read 'joined' across sea lanes and causeways slowly, or misread Surround and loose pins. Gate: a greybox on real phones, where players name the shape before the readout does.
- Samey choices. On fresh deals Chain (29%) and Worldwide (21%) are the best play about half the time. Staff, Playbooks and Summits must pull players towards other shapes. Measure how often each pattern is actually swept, and cut or retune any pattern that is swept more than 35% of the time.
- Port dominance. 18 of the 30 regions are ports, so Harbourmaster, Admiral and Lighthouse Keeper may cannibalise other builds. Watch the rule that no staff appears in more than 35% of winning builds, and remove a sea lane if needed. Every lane change shifts every pattern's odds, so re-run the spread simulation each time.
- Phone clutter late in a run. Traffic thickness, brass pins, stamps, cables and influence glow on a 390 x 520 map could turn into noise. It needs a strict glyph budget, pins grouped as 'x4', and a hold-to-see clean map. Test on a 4.7-inch phone.
- Cascade pace. A sweep across a map spreads the eye's attention and may feel slower than cards stepping forward. Long Overtime chains need compression. Build and tune the cascade first, ahead of content.
- Luck. Deals are random, and Lantz's 'slot machine' criticism of Balatro applies here too. Swaps, Forecast, the Radar Room, Airlift and orders that can target any region must make the night feel managed.
- Clone perception. Press will call it 'Balatro on a map'. That works as a genre label but is risky under App Store guideline 4.1 (copycat apps). The vocabulary, look and numbers must stay our own, and no poker or joker imagery may creep in.
- Market hook. Every recent hit used a universally known object (cards, slots, plinko, chess). 'Pins on a world map' has to read in a muted 6-second clip. Test the clip and the store capsule with non-players before production.
- Tone and rating. Titles such as Admiral and words such as 'war room' and 'flashpoint' can read as military. Keep the staff drawn as objects, use no combat verbs, keep the theme calming and non-graphic, and keep the nuclear names retired.
- Names and trademark. 'Brink' is also a 2011 Splash Damage/Bethesda game, and a clearance search is needed before any store page. The region names need a gazetteer check, and FORBIDDEN_WORDS in /home/user/brink/src/content/validate.ts holds only about 60 terms.
- Exponential balance. v0.2 never produced a broken run (its T5 target was hit 0% of the time). Random, greedy, builder and breaker bots are needed from day one, with targets per Alert level and per archetype, or 'numbers go up' quietly fails again.
- Determinism. Daily Map scores must match across V8, JavaScriptCore and SpiderMonkey. The engine uses BigInt with Momentum in tenths and floors after every multiply, and a cross-engine Playwright hash test must enforce it.
- Scope and art. 60 staff, 20 Orders, 25 Summits, 8 doctrines, 8 Alert levels, 3 worlds and three purchase paths is 6-9 months for a small team. The map plate and about 65 object icons probably need commissioning (an earlier estimate was £5k-13k). The 9-second canvas painters can only be used as a build-time bake.
- Owner fit. This is the fifth direction. The owner must play the greybox on his own phone, including the Late Shift button that sends a 10-billion sweep, and see a painted screen, before any content or art spend.
- Sunk cost. Adapting v0.2's run.ts, the meters or the card UI would drag the old game back in. Extract only the RNG, the shop and target functions, term attribution, the audio, and the daily, share, storage and payment code.

## Prototype scope

THE SMALLEST SLICE THAT PROVES THE FUN: a 5-7 day web greybox in portrait at 390 x 844, built in the existing repo.

BUILD
- The full 30-region map with Voronoi greybox cells, glyphs, weights, lanes and causeways.
- Tap-to-pin with live detection of all 11 patterns (the 2 secrets hidden until made).
- Threads with persistent traffic.
- The exact ordered BigInt engine, emitting an event trace.
- The full cascade with the existing synthesised sounds and shake gated on share of target. This is the one part polished to near-final quality.
- 3 Hours (9 crises: 300 to 5,000) with three Summits: Gridlock, Blackout and Full Table. Missing a target ends the run.
- 20 staff, 8 Orders and Playbooks.
- A Briefing with 2 offers, 1 folder, reroll and sell.
- Brass pins, Overwhelm and interest.
- The scripted first night.
- LATE SHIFT and MID SHIFT sandbox buttons that load worked Examples 3 and 2, so the owner sends a 10.6-billion sweep in his first session.
- Bots (random, greedy, builder) reporting choice spread and how far each gets.

FAKE OR LEAVE OUT
Final art, music beyond the existing drone, saving, meta and unlocks, the Daily Map, Overtime (except the sandbox), doctrines, Alert levels, upgrades, gambits, medals, skipping, the other 12 Orders and 40 staff, the landscape layout, the share card and payments.

ALONGSIDE
One painted portrait war-room screen at final quality, so the owner judges the look and the fun separately.

GO / NO-GO
- 5 of 5 new players can say the goal within 60 s.
- At least 4 of 5 make a Front or better by crisis 2.
- At least 3 of 5 reorder seats without being told.
- At least 1 plays for an hour unprompted (LocalThunk's rubric).
- The simulator gates pass.
- The owner plays three runs, presses Late Shift, and says it is the game he meant.

## Runner-up

Design 4, The Ring, came second. Players commit wooden counters in formations on a 25-region ring world, the board scores theatre by theatre, staff sit in seats around the table, and a brass pin marks every calmed crisis. It was the owner-proxy judge's second choice and the publisher judge's first. It had the most legible board, it was the cheapest to build, its 12.8x choice spread was verified, and it is the most literal war room. It lost on four counts:
- Its world reads as a board-game track (four strips round a cross-shaped sea) rather than a world map.
- Its rack of counters puts a card tray back between the player and the map.
- By its own numbers, Spread or Pincer is the best play in 65% of racks, which is the samey-choice trap behind 'nothing I did mattered'.
- Its military vocabulary (Field Marshal, Purge, Black Budget) narrows the market and raises the age rating.
Its best ideas are grafted into the winner: staff seated in an order that matters, a brass pin for every cleared crisis, Overwhelm payouts, a printed sweep order, and Worlds as the meta layer. Design 2 (city lines with worn-lane traffic) was a close third, and its traffic mechanic is grafted in too.

## Open questions for the owner

- Tone: your staff are roles (Harbourmaster, Governor, Signals Officer, Admiral), each drawn only as the object they keep, and nothing on the map is ever attacked. Is that the right amount of war room? The alternatives are more military (fleets, generals; this means a higher age rating and a narrower market) or less (pure desk objects with no job titles).
- Name: 'Brink' is also the title of a 2011 Bethesda/Splash Damage game, so the store name may be blocked. Should we keep BRINK as the working title and pay for a trademark clearance search now, or pick a fallback name today (for example 'Night Desk' or 'Big Board')?
- Run length on phones: a full night is 24 crises, about 35-45 minutes, like Balatro. Should the default phone run be the full night, or a 4-Hour 'Short Night' (about 15-20 minutes), with the full night as a mode on phones and the main mode on Steam?
