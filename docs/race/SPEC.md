# BRINK: Treaty Against War — design (v4, after the owner's verdict on Thirty Days)

Status: **proposed, not built**. The owner approves or changes this page and the mockup (`docs/race/mockup.html`,
published as a private page) before any code is written.

## Why this version exists

After Thirty Days the owner said: "Honestly, I don't think you're getting it. I think we need a wholesale redesign.
It looks crap, doesn't make sense, and certainly doesn't do what we want it to do." Asked what the game is closest
to in the hand, they said: "Like Plague Inc: interactive, got a deep goal to it, addictive, a map." Then: the game
should above all **grip** (a tense story of a world sliding to war, the 3am phone call); the map is **the board**;
the clock runs in **real time** with pause and fast-forward; the race is **treaty against war**; what grips in
Plague Inc is all four of watching it spread, the upgrade tree, the headlines and the race; the look is **Plague
Inc's layout with war-room dressing**.

Every build before this one was turn-based cards. This one is a real-time map game. It keeps the brief's story
(you lead a great power as the world slides towards war), its fictional powers, its arcs, and its product rules
(no accounts, no user-to-user features, nothing leaves the phone, all names fictional, BRINK in one constant).

## The game in three sentences (also the explanation at the start, over the live map, skippable)

1. The world is sliding towards war. Red spreads across the map by itself, day by day.
2. You lead the Republic. Tap the bubbles, spend influence on policies, get the treaty signed.
3. Treaty first: you win. War covers the world first: you lose.

The test of every screen: someone who never plays games, watching over the player's shoulder, can say what is
happening and what the player is trying to do. Here: "red is spreading, she's popping the bubbles and buying
things, and the blue bar has to beat the red one."

## The screen (portrait 390 x 844, Plague Inc's layout)

Top to bottom:

1. **Top bar** (0, 0, 390, 60): INFLUENCE and its number (the points you spend; Plague Inc's DNA) at the left,
   DAY n in the centre, pause / play / fast at the right.
2. **The race** (0, 60, 390, 56): two bars with the same finish line. WAR fills red as regions fall (finish: 20 of
   30). TREATY fills blue towards 100%. Whichever reaches the end first ends the game.
3. **The map** (0, 116, 390, 520): the thirty fictional regions in five blocs (the Cap: the Federation; Highmarch:
   the Republic, you, with the flag on Edda Vale; the Scatter; the Sound; Farsouth), the war room's geometry
   reused. Each region is CALM (dark slate), TENSE (amber edge) or FIGHTING (red, hatched). Fighting spreads along
   borders and sea lanes. Bubbles appear on it and fade if not tapped: **amber** gives influence, **red** is a
   flashpoint (a tense region about to fall; a timer ring), **blue** is a talk (treaty progress).
4. **The ticker** (0, 636, 390, 28): one line of headlines: what the world did, what you did, what it cost.
5. **The panel** (0, 664, 390, 146; slides up to 430 when a tab is opened): three tabs. WORLD: the state of the
   map in a sentence and the legend. POLICY: the tree. TREATY: the five blocs and what each wants.

Nothing else is drawn. No numbers on the map, no pins, no cards. A crisis popup is the only thing that ever covers
the map, and it stops the clock.

Look: war-room dressing. Near-black blue panels, thin light rules, status-lamp colours (red, amber, blue, green),
condensed capitals for labels (Barlow Condensed, self-hosted), mono numerals (JetBrains Mono), a dark slate map
with red hatching. The mockup shows it.

## How it plays

- **Time.** Sixty days. A day is about 12 s at normal speed and 4 s at fast: 12 to 15 minutes a game. Pause at
  any time; every popup pauses. Nothing happens while paused.
- **Spread.** A fighting region spreads to a random neighbour every few days, faster as more of the world fights.
  A region beside fighting turns tense first; a tense region shows a red flashpoint bubble with a timer ring:
  tapped in time it calms a step (and pays influence), missed it falls to fighting. Calm regions also turn tense
  from the arcs and from the player's own deterrence moves.
- **Influence.** Earned by tapping amber bubbles, by a small daily trickle from every calm region in the Republic's
  bloc, and by Home Front policies. Spent on the tree and on bringing blocs aboard the treaty.
- **The treaty.** Starts at 0%. Blue talk bubbles add a few percent each; Diplomacy adds a little every day; each
  bloc that signs adds 20. A bloc signs when its condition is met and nothing in it is fighting. The Federation
  signs last, and only when the fighting it started has stopped. Every point of spread makes the treaty harder:
  that is the race.
- **Win.** Treaty at 100%: "The treaty was signed on day 41." The day is the score.
- **Lose.** Fighting in twenty regions, or fighting in the Republic's capital: "World war, day 33." The final map
  shows where it began and where it ended.
- **Saved after every day;** CONTINUE on the title. Title: name, PLAY / CONTINUE, HOW TO PLAY.

## The policy tree (eighteen nodes, bought in order down a branch, rising costs)

| Diplomacy (blue) | Deterrence (red) | Home Front (green) |
| --- | --- | --- |
| Hotline · a flashpoint you tap also calms its neighbours a little | Alert level · the capital cannot fall while held; its neighbours turn tense | Press office · amber bubbles give double |
| Back-channel · blue bubbles last twice as long | Fleet posture · fighting cannot cross a sea lane into your bloc | Intelligence · flashpoints are announced a day early in the ticker |
| Envoy corps · talk bubbles appear twice as often | Forward brigade · spread into Highmarch halves; the Federation's regions turn tense | Civil defence · a fallen region in your bloc counts half towards WAR |
| Summit · Farsouth's condition; treaty +1% a day | Border guard · flashpoints on your borders tick twice as slowly | Rationing · the daily trickle doubles |
| Ceasefire talks · a fighting region can be talked down (a blue bubble appears on it) | Air cover · spread everywhere slows by a third for ten days | Cyber shield · the cyberattack and false-alarm arcs cannot hurt you |
| Grand bargain · every bloc aboard adds 30 instead of 20 | Last warning · the Federation stops spreading for five days; a false alarm costs a region | War chest · every node costs a quarter less |

Deterrence slows the spread but makes the world tenser (its side effects are the trade-off). Diplomacy moves the
treaty. Home Front earns and protects. This is the Balatro building, in Plague Inc's clothes: a build that pays
off, visible on the map.

## The phone at 3am (the crisis popups)

Ten arcs from the original brief, three to five popups each, chained over days: the satellite blackout, the false
alarm, the undersea cables, the proxy incident, the cyberattack on early warning, the blockade, the defector, the
debris cascade, the ultimatum, the summit. A popup stops the clock, puts one adviser's message (forty words or
fewer) on the screen and two or three choices. Every choice says what it costs and what it does in words:
`Influence −10 · Shoal stays open · Lintel turns tense`; `Treaty +4% · slower`; `60% it works · if not, Shoal
falls tonight`. About one popup every two days. The arcs are where the story lives; the map is where you see what
you did. The six advisers and the card pack from Thirty Days are the raw material.

## Balance gates (simulator, 2,000 games per bot; numbers to be tuned)

- A bot that taps nothing and buys nothing loses by day 30 in 95% of games.
- A bot that taps every bubble but buys nothing holds to day 60 in under 15%.
- A sensible bot (taps, buys down one branch, answers popups by the hint) wins the treaty in 45 to 60%, loses in
  the rest; the median win on day 40 to 50; the war bar reaches 12 of 20 in the median game (it must feel close).
- A hawk bot (Deterrence first) wins in 30 to 50%: there is more than one way to play.
- Every node is bought by the sensible bot in at least 10% of games.

## What is built first

A playable slice: the real-time map with spread and the three bubbles, the two bars, pause and fast, the ticker,
the tree with all eighteen nodes, twelve popups from three arcs, win and lose, the three-line explanation. No
sound, no menus beyond pause, no save. Then the owner's partner plays it while the owner watches, before anything
else is added. If the slice does not grip, the design changes, not the polish.

## Three things for the owner to decide

1. Only bubbles, popups and the tree act on the map (as in Plague Inc; recommended). Or direct map moves too.
2. Sixty days at 12 to 15 minutes (recommended for a phone). Or longer, like Plague Inc's 20 to 30.
3. The look in the mockup: war-room dressing on Plague Inc's layout. Name anything wrong now.

## What is reused

The map geometry and renderer (`src/thirty/ui/map`, 390 x 520 as the war room drew it), the seeded RNG, the frame
fit, the fonts, the Web Audio recipes, the content schema and validator pattern, the six advisers and the arcs'
text as raw material for the popups. New: `src/race/` (clock, spread, bubbles, tree, treaty, ticker, popups,
simulator), `content-race/`, `VITE_GAME=race`. Everything before it stays dormant and untouched.
