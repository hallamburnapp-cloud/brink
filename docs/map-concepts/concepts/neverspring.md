# NEVERSPRING

> You are a winter that will not end. Cover the whole world in snow before its people light the great Furnace that would bring back spring.

Working-title note: NEVERSPRING (working title; one constant, BRAND.name in /home/user/brink/src/config.ts)

## Pitch

You play the winter itself. The game is one round, painted world seen from above its North Pole, cold in the middle and warm at the edges. You start as a single patch of snow and spread outward, region by region. The people of the world, whom you only ever see as warm city lights, wake up and start building a giant Furnace to bring spring back. Ships and trains carry fuel to it along glowing lines you can see on the map. Freeze a strait and the fuel ships turn back; freeze the land a line runs through and it goes dark. Turn every land white before the Furnace is lit and you win. If it lights first, a wave of gold sweeps the world and the snow melts. Nobody is ever hurt: people stay in, light their hearths and wait.

## Goal and win

Goal line, on screen every second: “Freeze the world before the Furnace is lit.”

WIN: all 40 land regions frozen, and the count on the race strip reads 40 of 40. The last city light goes out, aurora ribbons circle the world, and the card reads “It is quiet everywhere.”

LOSS (the only one): the Furnace fire reaches the middle of the race strip. The Furnace lights, a gold ring sweeps inward from it across the whole map, and the snow melts to green in 3 seconds. The card reads “Spring came.” It adds one line on why and one tip, worked out from the final state (“The Sun Sea line fed the Furnace for three years. Try Pack Ice.”).

Rules that keep it readable and fair:
- Progress never goes backwards without warning. A fully frozen region stays frozen for the rest of the game. Summer only pushes back the soft edge of regions still being frozen, and thaws sea ice you have not locked. The earlier ‘your winter melted’ loss is removed.
- No waiting for the last region. A region with frozen land on every side freezes three times faster (‘the cold closes in’), and a ‘Skip to the end’ button appears as soon as the simulation knows the result.
- No Greenland trap. Every region has at least two ways in, one of them through the sky (wind), and the content checker fails any map that breaks this. Here isolation helps you: a place that cuts itself off loses its fuel.

Length: a typical game is 6 to 9 in-game years. That is 18 to 27 minutes at 1×, or 10 to 15 minutes played mostly at 2× and 4×.

## What you do

EVERY 10 SECONDS: watch the snow creep outward. Ice crystals glint on newly frozen ground and where you cut a line. Tap one and it shatters into Frost, the only currency. An untapped crystal melts into a little extra snow nearby after about 8 seconds, so nothing is wasted, and at 4× crystals collect themselves. When the Storm button has a charge, drag the cloud onto the map and let go. A blizzard swirls there and freezes that land or sea in 3 to 4 seconds. Storms are loud: nearby city lights flare and the world notices you sooner.

EVERY MINUTE OR SO, one real decision, made on the map:
1. Grow one crystal on the Snowflake (reach, strength or stealth). Each one makes the rest cost more, so you commit to a shape.
2. Aim a storm: grow your coverage, freeze a strait to cut the fattest fuel line, or hit the spot where a faint amber ring says a Hearth is about to light.
3. Quiet or loud: storms and fast freezing win ground now but wake the world sooner.
4. Get ready for summer: lock key seas and edges before the melt.
5. Tap the Furnace flame and every line feeding it lights up, thickest first. Choose which one to cut, and how: sea ice, a frozen river, or freezing the region it starts from.

## The map

A fictional, Earth-like world seen from straight above its North Pole and painted as one ROUND disc, cold at the centre and warm at the rim. White growing from the middle to the edge is the whole game in one picture, so the theme explains itself.

40 land regions on 5 landmasses, plus 8 sea zones that can freeze. This is cut from 48 so that the average region is about 40 px across on a phone.
- THE NORTHLANDS (9 regions), ringing the frozen Polar Sea at the centre: tundra and pine, few people, the usual start.
- THE HEARTLAND (9), the middle ring from 7 to 2 o'clock: farms, rivers and rich cities. Most fuel lines start here.
- THE HIGH COUNTRY (6): a mountain spine from near the pole out to the rim at 4 o'clock, the ‘snow road’ into the hot lands.
- THE SUNLANDS (10), the outer rim from 5 to 11 o'clock: desert, jungle and warm coasts. Hardest to freeze, and usually where the Furnace is built.
- THE SCATTERED ISLES (6), in the Western Ocean on the rim from 11 to 1 o'clock, reached by drift ice, icebergs or wind.
Sea zones include the Polar Sea, the Narrows (a strait at 8 o'clock between the Northlands and the Heartland), the Inner Sea, the Western Ocean, the Sun Sea and the Warm Current, a warm tongue of sea that reaches in at 1 o'clock and resists freezing.

Names are short invented words (Hask, Ostrel, Toradel, Sel Harbour, Velloran, Mirrin), and each must pass the content checker's check against real places and trademarks. Each region's attributes are shown in words, never numbers: climate (polar, cold, mild, dry, hot or wet), height (low, hills or high), people (few, some or many), wealth (poor, middling or rich), coast, and neighbours worked out from the art.

Why fictional and round:
- the no-real-countries rule;
- Apple's rule 1.1.2 (no real governments as enemies);
- no border disputes;
- nothing like Plague Inc.'s flat real Earth;
- a circle fits a phone held upright, a PC screen and a Steam Deck without re-laying out the map.
It keeps the realism players already reason with: cold north, hot rim, mountains hold snow, deserts resist, islands are remote, rich lands build faster.

The disc is PAINTED TWICE, once thawed and once frozen (iced lakes, snow-laden pines, frozen harbours). The frozen painting is revealed region by region through a noise texture, so snow looks hand-painted and rich, never like a blank or unloaded area. Taps snap to the nearest region centre, rim islands get 44 px tap zones, and pinch zoom runs from 1× to 3×.

## The counter force

THE FURNACE: one counter-force, one side of the race strip.
1. ASLEEP: until the world notices you, the Furnace side of the strip is a dotted outline with a closed eye. Snow in mild or rich regions, storms, and time passing open the eye in steps (closed, half, open). Quiet crystals slow it.
2. THE WORLD WAKES: the camera nudges to the Furnace site for 3 seconds and a beam of gold light rises. The eye becomes a flame, and the only mid-game hint appears: “They're building a Furnace. Cut what feeds it.” The site is chosen per game, usually the richest warm region on the rim.
3. SUPPLY LINES: the Furnace burns slowly on its own, and every amber fuel line feeding it makes it faster. Lines start in unfrozen rich or crowded regions and take the shortest path through unfrozen land and open sea. They are drawn as dotted amber arcs with ship and train glints moving along them. Freeze a strait, a river or a region on the path and the line either reroutes the long way or goes grey. The flame on the strip shows the Furnace's speed (small, medium, roaring) and visibly shrinks when you cut a line. Tap the flame to light up every feeding line, thickest first.
4. HEARTHS: in alarmed regions, cities light amber glass domes that hold back the snow. A Hearth cut off from every fuel path flickers and goes out after about a season. About 5 seconds ahead, a faint dashed amber ring shows where the next Hearth will light and a dotted arc shows where the next line is about to open, so a storm can get there first.
5. SUMMER is the world's ally: sea ice you have not locked breaks up and ships sail again, and the soft edge of the snow retreats.
6. LAST WINDOW: once the Furnace passes three-quarters, an icebreaker forces one cut sea lane back open each season. Cutting every line is therefore never a guaranteed early win.
7. THE END OF IT: the Furnace's own region cannot freeze while any line still feeds it. Cut them all and its glow gutters; freeze that region and the Furnace goes out, which almost always wins the game.

## Upgrades

THE SNOWFLAKE (its button is labelled Grow). One six-armed snowflake that grows as you buy. The centre crystal, First Frost, is owned from the start. There are three pairs of arms with five crystals each, 30 in all. A typical game grows 15 to 20 of them, so no two winters have the same shape, and the finished snowflake goes on the share card.

Rules:
- The first crystals cost about 4 Frost and the last about 20 to 28.
- Every crystal you own adds 2 to the cost of all the others.
- You can melt a crystal back for half its cost.
- Every crystal shows a loudness mark: a hush mark or a small storm mark.
- Each description is one line of 60 characters or fewer with no digits; the content checker enforces this.
- Selecting a crystal previews its effect on the live map before you buy.

WIND, pale cyan (reach)
- SKY: North Wind (“Snow drifts into neighbouring lands.”), Storm Front (one more storm cloud), Jet Stream (drag a river of wind across an ocean), Snow Clouds (snow settles on warm land), Endless Gale (winds keep blowing through summer).
- SEA: Cold Current (frozen coasts chill the coast opposite), Drift Ice (floes carry snow to islands), Pack Ice (seas beside frozen land freeze, and ships turn back), Icebergs (bergs drift out and freeze far coasts), Frozen Ocean (sea ice no longer breaks up in summer).

COLD, white (strength)
- SNOW: Heavy Snow (it piles up faster), Blizzard (storms grow bigger), Mountain Snow (it races along high ground), Snow in the Sand (it settles in dry lands), White Sky (a little snow falls everywhere).
- ICE: Hard Frost (the snow edge holds through summer), Frozen Rivers (rivers freeze and inland lines are cut), Black Ice (every line carries less), Chill Through Walls (Hearths burn out faster), Frozen Harbours (frozen coasts close their ports for good).

HUSH, lavender (stealth and stalling)
- QUIET: Mild Days (the world is slower to notice), Just a Cold Snap (experts dismiss your first year), Soft Snow (storms make less noise), Lost Forecasts (the world forgets you a little each summer), Silent Winter (Hearths are slower to light).
- DARK: Short Days (winters start early and end late), Grey Skies (summer barely melts you), Cold Summer (summers are short and cool), Year Without Summer (the next summer never comes), Dim Sun (the Furnace burns slower).

How the map changes:
- Sky draws white wind ribbons.
- Sea turns seas white and sets icebergs drifting.
- Snow speeds up the white front and whitens the mountain spines.
- Ice gives the regions it holds a crisp blue rim that does not retreat.
- Quiet keeps city lights dim and the eye closed.
- Dark tints the rim towards dusk while the flame shrinks.

## First 60 seconds

Four taps and one drag, about four short lines of text, and no rules screen.
- 0–3 s: the app opens straight onto the painted round world at dusk, turning a few degrees, with city lights twinkling. The NEVERSPRING wordmark fades in and out. The race strip shows the goal line, an empty white side, and a closed eye on the Furnace side.
- 3–6 s: one line appears over the map, “Where does winter begin?” The cold northern regions shimmer faint blue, with a soft chime.
- 6–8 s (TAP 1): the player taps a region. An ice crystal forms under the finger with a crackle, and the frozen painting blooms outward over 2 seconds. The season pill reads “Year 1 · Late Autumn” and the count reads 1 of 40.
- 8–12 s: the radio line slides in: “Hask reports snow in early autumn. Farmers puzzled.”
- 12–16 s (TAP 2): a crystal glints on the new snow and a ghost finger taps it. The player taps it too: it shatters, sparkles fly into the Grow button, Frost goes from 0 to 5, and the button starts breathing.
- 16–22 s (TAP 3): the ghost finger moves to Grow. The Snowflake sheet rises with only the first crystal of each arm lit, and North Wind pulses with its line and cost.
- 22–28 s (TAP 4): the player taps Grow. The crystal grows into the arm with a chime and the sheet slides away. A white wind ribbon unfurls into two neighbouring regions, and snow lands there 3 seconds later.
- 28–40 s (DRAG): the Storm button bobs and a ghost finger drags a cloud onto the map. The player drags their own. A blizzard swirls and a region turns white in 4 seconds; nearby city lights flare amber and the eye half-opens. One caption appears beside the eye for 3 seconds: “Storms are fast. And loud.”
- 40–60 s: the 2× button glows once. Crystals pop up and most players tap them without prompting. The snow edge visibly pushes outward. Radio: “Ice cream sellers in Sel Harbour report a slow week.”
There are only two later prompts: the Furnace moment (“They're building a Furnace. Cut what feeds it.”) and the first summer (“Summer melts the soft edge. Hard Frost holds it.”).

## Main screen for mockup

PORTRAIT PHONE 390×844, mid-game (Year 3, Midwinter). Safe areas: top 47, bottom 34. System sans-serif throughout.

1. BACKGROUND (0–844, full bleed): ink #0B1622 with about 50 faint 1 px stars (white at 10–30%) and a soft radial glow #9CC9E8 at 12% behind the disc. White status-bar glyphs.

2. RACE STRIP (x16–374, y56–130): panel #0F1E2E at 88%, 1 px border #2A4058, radius 16.
- Row 1 (y64–80): the goal line, centred, 13 px medium #C9D6E2: “Freeze the world before the Furnace is lit.”
- Row 2 (y90–112): one race bar from x26 to x364, filled from both ends, 22 px tall, fully rounded, empty track #1C3047.
  - Left end: a 22 px circle (x26–48) with a white snowflake glyph #F2F7FB.
  - White fill grows rightward from x48: #F2F7FB with a 2 px blue shadow edge #9CC9E8 and a few sparkle specks. In the mockup it reaches x135 (26 of 40).
  - Right end: a 22 px circle (x342–364) with an amber flame glyph at medium size (the flame's size shows the Furnace's speed).
  - Amber fill grows leftward from x342: gradient #F2A23A to #FFD27A with moving glints. In the mockup it reaches x282.
  - Finish mark in the centre (x182–208): a 26 px circle, fill #0B1622, 2 px ring #C9D6E2, with a split glyph (half snowflake, half sun) in #C9D6E2. Tapping it shows one line of ‘What now?’ advice and pulses the relevant place on the map.
- Row 3 (y116–128): on the left, 11 px semibold #F2F7FB at x28: “26 of 40 frozen”. On the right, 11 px semibold #F2A23A, right-aligned at x362: “Furnace”. These are the only progress labels; there are no percentages.

3. INFO ROW (y138–170):
- Left: season pill x16–184, 32 tall, fill #0F1E2E, radius 16. A 20 px ring dial (white winter arc, gold summer arc, a dot for now sitting in the white), then “Year 3 · Midwinter” in 13 px #C9D6E2.
- Right: speed control x214–374, 32 tall, four segments: pause bars, “1×”, “2×”, “4×”. The active segment (1×) is filled #F2F7FB with #0B1622 text; the others are #0F1E2E with #C9D6E2 text.

4. THE MAP DISC: centre (195, 384), diameter 370 (x10–380, y199–569), with a soft 6 px halo #9CC9E8 at 25% and stars outside. Clock positions below are as seen on screen, with 12 o'clock at the top.
- Centre: the Polar Sea as pale cracked pack ice #DCEAF4 with crack lines #9CC9E8.
- Northlands (inner ring): fully frozen painting, white #F2F7FB with blue shadows #9CC9E8, snow-laden pines as tiny dark-green specks, no city lights.
- The Narrows (strait at 8 o'clock, between the inner and middle rings): frozen into cracked white ice. One fuel line crosses it, drawn in grey #6B7A88 and broken, with a small spark at the break and two stopped ship glints that have turned back.
- Heartland (middle ring): fully white from 12 to 2 o'clock. From 7 to 11 o'clock it is still thawed: ochre fields #C9A46A and green #5E7F4E, dense with amber city lights #F2A23A. A ragged white front with organic edges runs between the two. Two amber Hearth domes (18 px glass rings with bloom) sit on the front at about 10 o'clock. A faint dashed amber ring (24 px) at about 11 o'clock marks where the next Hearth will light.
- High Country: a white mountain spine from the centre to the rim at 4 o'clock.
- Inner Sea (3 to 5 o'clock, middle ring): ink teal #1E4A5A, with its northern half covered in pack ice.
- Sunlands (outer rim, 5 to 11 o'clock): tan desert #D8B47C, jungle #3F6B45 and warm coasts, with dense amber city lights.
- THE FURNACE: at 9 o'clock on the rim, in Toradel. A 22 px gold star #FFD27A with a soft light column fading upward about 60 px, labelled “TORADEL” beside it in 10 px letter-spaced capitals #FFD27A. This is the only label shown at this zoom.
- Five dotted amber fuel lines (2 px dots #F2A23A with travelling glints) converge on Toradel: one from 7 o'clock along the rim, two from the Heartland at 10 and 11 o'clock, one across the Western Ocean from 1 o'clock carrying a ship glint, and the broken grey one at the Narrows.
- Scattered Isles (rim, 11 to 1 o'clock): six small islands, two white and four green with lights, with a small white iceberg drifting beside them.
- Warm Current: a faint, warmer teal tongue #2C6B70 reaching in from the rim at 1 o'clock.
- A blizzard at 2 o'clock: a 46 px white swirl with spiral arms at 70%.
- Two white wind ribbons (thin streamlines at 30%) arcing out from the centre towards 12 and 5 o'clock.
- Three ice crystals (16 px sparkles with 44 px tap areas) glinting on fresh snow near 11, 12 and 3 o'clock.

5. RADIO LINE (x16–374, y584–618): pill #0F1E2E at 80%, radius 17, a 14 px amber radio glyph at the left, and one line of 14 px #DCE6EF text: “Ice closes the Narrows. Fuel ships turn back.” New lines slide in from the right, and tapping one flies the camera to the place it names. When a region is tapped, a region card takes this slot: its name in 15 px bold, word chips such as “Hot · Coast · Feeds the Furnace”, a thin frost bar, and no numbers.

6. DOCK (y650–800), with labels in 11 px #8FA3B5 under each button:
- Left: Focus, a 52 px circle (x24–76, y686–738), fill #13263A, a disc glyph in #C9D6E2, label “Focus”. It zooms back out to the whole world.
- Centre: Grow, an 88 px circle (x151–239, y664–752) with a gradient from #EAF4FB to #A9CDE6, a 36 px #0B1622 snowflake glyph, and a breathing 6 px ring #9CC9E8 because a crystal is affordable. A white pill overlapping its base (y744–768) holds a small snowflake glyph and “38” in 15 px bold #0B1622. That is the Frost count, the only big number on screen. Label “Grow” at y774.
- Right: Storm, a 72 px circle (x290–362, y676–748), fill #13263A, a white cloud glyph, three charge pips under it (two white, one empty) and a thin recharge arc #9CC9E8 at 60%. Label “Storm”. Dragging from it shows a ghost swirl with a ring showing the storm's size.
- Home indicator area: y810–844, over ink.

SNOWFLAKE SHEET (opened from Grow): it rises to cover y300–844 while the disc shrinks into the top 280 px, so previews stay visible. It holds a 300 px snowflake with arm labels SKY and SEA (#9CC9E8), SNOW and ICE (white), and QUIET and DARK (#B9B2D8). Below it: the selected crystal's name (17 px bold), its one line (14 px), and a Grow button showing the cost.

LANDSCAPE PC 1280×720 (and Steam Deck 1280×800): the disc is centred at (600, 350) with a diameter of 620. The left column (x24–284) holds the race strip as a card, plus season and speed. The right column (x936–1256) keeps the Snowflake always open, with Storm and Frost below it. The radio line runs along the bottom centre.

## End screen for mockup

WIN SCREEN, 390×844.
- Background: ink #0B1622 with stars and a soft aurora glow.
- y78–110: “It is quiet everywhere.” in 26 px semibold #F2F7FB, centred.
- y116–134: “Your winter froze all 40 lands in Year 6.” in 14 px #C9D6E2, centred.
- THE FINAL WORLD: the disc at centre (195, 318), diameter 320 (x35–355, y158–478). It is entirely the frozen painting, with no city lights anywhere. At 9 o'clock the Furnace is a cold grey star #6B7A88 with no light column. Two translucent aurora ribbons (#5FE3B5 to #7FD6E8 at 45%) arc around the rim from 10 to 4 o'clock.
- y488–520: a centred “Replay” pill (104×32, fill #0F1E2E at 88%, a play triangle and 13 px #F2F7FB text). Tapping it plays a 10-second, high-speed replay of the whole game on the disc above.
- TIMELINE CARD (x16–374, y532–612): panel #0F1E2E at 88%, radius 14. Along the bottom axis, labels “Y1” to “Y6” in 10 px #8FA3B5. A 2 px white line #F2F7FB rises to the top; a 2 px amber line #F2A23A rises to about three-quarters, then goes flat. Small markers sit above the axis: white cloud ticks for each storm, grey break ticks for each line cut, and an eye marker at Year 2 where the world woke.
- FACTS (y624–690): on the left (x16–80), a 64 px thumbnail of the player's finished snowflake, with long SKY and ICE arms. On the right (x92–374), three lines of 13 px #DCE6EF text: “You cut 4 fuel lines. The Narrows mattered most.” / “The world noticed you in Year 2.” / “The Furnace got three-quarters built.”
- BUTTONS: “New winter”, a pill at x16–302, y704–756, fill #EAF4FB, 16 px semibold #0B1622 text. Share, a 52 px circle at x322–374 with a share glyph on #13263A. Below them (y768–792), a centred text link in 14 px #9CC9E8: “Same world, same start”.

LOSS VARIANT (same layout): the disc shows the moment after the thaw. Snow covers only the inner third, the rim is green and ochre with its lights back on, and Toradel is a bright gold star with a tall light column. The heading reads “Spring came.” in #FFD27A, with the subline “You froze 31 of 40 lands.” The facts block becomes a reason card with a 3 px amber left border: “The Sun Sea line fed the Furnace for three years.” and, in #9CC9E8, “Try Pack Ice to close it.” The main button reads “Try again”.

## Art direction

‘A painted dusk atlas of a round world, coming to life.’ One commissioned gouache or watercolour disc in a permanent blue-hour dusk, so that warm city lights read clearly: ochre plains, deep-green pine, tan deserts, slate mountains with soft hill shading, an ink-teal ocean with gentle depth bands, and pale rivers. The same disc is painted a second time, frozen (iced lakes, snow-laden pines, frozen harbours), and revealed through a noise texture with blue shadows and a little sparkle, so the winning world looks richer, not blanker.

On top of the painting:
- seas that crack over into ice;
- thin white wind streamlines;
- amber city lights with a soft glow;
- Hearth domes as amber glass rings;
- dotted fuel lines with travelling glints;
- the Furnace as a gold star whose light column pulses faster near the end.
Crimson appears only on the Furnace side of the strip above 90%.

Colour has one meaning everywhere: white and blue are you, amber and gold are them. That pair is safe for red-green colour blindness and differs strongly in brightness. Snow also carries a texture and Hearths a ring shape, so nothing relies on colour alone.

References in words:
- an antique polar-projection atlas brought to life (but not the UN emblem: no laurel, no flat blue on white);
- Mini Metro's restraint;
- city lights seen from orbit, but painted;
- the calm of a snow globe;
- the warm-cold light of Alto's Odyssey.
Not Frostpunk: no steampunk machinery, no city-builder interface, and the word ‘Generator’ is never used.

UI: ink panels, 1 px frost borders, system sans-serif, simple line icons and one SVG wordmark.

Signature animations: the crystal shattering, a sea cracking over, a fuel line greying and rerouting, a Hearth dome snapping on and guttering, the Furnace beam rising, the gold thaw wave (loss) and the aurora (win).

Music: calm piano and strings. An instrument joins as each landmass freezes, and the existing drone tightens as the Furnace climbs.

At sign-off the artist shows the same layout in two treatments, serious dusk and a warmer storybook look, and the owner picks by eye.

## Palette

- #0B1622 night ink: page background and home area
- #0F1E2E panels (race strip, pills, radio line) at 80–88%
- #2A4058 panel borders
- #1C3047 empty race-bar track
- #F2F7FB snow white: your side of the race, frozen land, the Frost pill
- #9CC9E8 snow shadows, frost accents, disc halo, breathing ring
- #DCEAF4 pack ice on frozen seas
- #1E4A5A open sea (ink teal)
- #2C6B70 the Warm Current
- #C9A46A thawed farmland ochre
- #5E7F4E thawed pine and meadow
- #D8B47C desert tan on the rim
- #F2A23A city lights, Hearths, fuel lines, start of the Furnace fill
- #FFD27A Furnace star and end of the Furnace fill
- #6B7A88 cut fuel lines; the cold Furnace after a win
- #B9B2D8 the Hush arms of the Snowflake
- #C9D6E2 main UI text
- #8FA3B5 secondary text and labels
- #5FE3B5 aurora on the win screen
- #E4573D the Furnace side only, above 90%

## Session and replay

ONE GAME: 18 to 27 minutes at 1×, or 10 to 15 at 2× and 4×. Pause, 2× and 4× are free from the start. One in-game month is 15 seconds at 1×, and a year is 3 minutes. The game autosaves every 10 seconds and when you leave, and resumes mid-month on any device. A first game always ends well inside Steam's 2-hour refund window.

REPLAY:
- 4 difficulties: Easy, Normal, Hard, Bitter.
- 8 winter types, each unlocked by winning on Normal and each changing a rule:
  - Snow: balanced.
  - Fog: nearly silent but weak.
  - Hail: loud, with fast storms.
  - Glacier: slow, crushes Hearths, poor at sea.
  - Sea Ice: starts in an ocean.
  - Grey Sky: dims the sun, but fades unless fed.
  - Polar Night: no summers, but the Furnace starts early.
  - The Hush: wins by putting out every city light.
- 12 launch scenarios, including Two Furnaces, The Warm Current, Island Furnace, Early Warning and Short Fuse.
- Every game varies the start region, the Furnace site, which lines exist, the odds of Hearths, and map events, which are shown only on the map and in one radio line.

PHONE HABIT: the free Daily Winter. Everyone gets the same world, starting mid-race in Year 3. It takes 5 to 8 minutes, replays are allowed, and it keeps a local best and a streak only: no names, no leaderboard.

META (all stored on the device):
- The Snow Globe Shelf keeps every finished winter as a tiny globe of its final map and snowflake.
- 40 achievements, matched one to one with Steam.
- Every end screen has ‘Same world, same start’ and a 10-second replay with your storms and cuts marked.

STEAM DEPTH: 8 winters on 4 difficulties plus 12 scenarios comes to about 20 to 40 hours for completionists. After launch: two free scenario updates a year, then paid packs, ‘Spring’ (play as the Furnace builders) and ‘The Far Side’ (a south-polar disc).

## Monetisation

PHONE:
- Free download, with no ads, no currencies, no timers and no accounts.
- Free content: the Snow winter on Easy and Normal on the full world (a complete game to a clear win or loss), the Daily Winter forever, and three scenarios.
- One permanent ‘Full game’ unlock at £3.99/$3.99 through Apple's and Google's own billing, with Restore Purchases. It adds all eight winters, Hard and Bitter, every scenario and the full Snow Globe Shelf.
- The unlock is offered quietly on the first end screen and on locked items, never mid-game.
- Later packs at £1.99–£2.99.

STEAM:
- $9.99/£8.50 for the complete game with no in-game purchases (the existing everything-unlocked build), so Steam's in-game payment rule never applies.
- Achievements shown inside the game, Steam Cloud saves, and Steam Deck Verified as a target.
- 10–15% launch discount; DLC at $4.99 and a soundtrack; $14.99 only after two expansions.
- Coming Soon page as soon as the main-screen art is final. Demo in Steam Next Fest, 14–21 June 2027 (demo review due about 10 May). Launch in November 2027, to meet the first snow.

WEB:
- The same free content on our own site and on itch.io, with itch.io collecting VAT. A Steam wishlist link on desktop.
- A £3.99 browser unlock through the existing Stripe Payment Link → Cloudflare Worker → signed token flow, switched to Stripe Managed Payments so Stripe handles VAT.
- The plan name in the code changes from 'endless' to 'full' in src/meta/unlock.ts, worker/src/index.ts and worker/src/crypto.ts together.

ACROSS ALL THREE: no Stripe link or web price inside the store builds, cookie-free analytics only, and no Poki.

## How it answers the four complaints

(a) COULDN'T TELL WHAT TO DO
- One goal sentence is on screen every second.
- One race bar: white grows from the left and fire from the right, towards one mark in the middle.
- One big number (Frost) and one count (26 of 40 frozen); everything else is words or light.
- No rules screen: four taps and a drag, guided by a ghost finger and about four short lines.
- Tapping the flame shows why the Furnace is fast, and tapping the middle mark answers ‘What now?’.
- The content checker caps headlines and descriptions at 60 characters and bans digits in descriptions. A fixed list of on-screen elements fails the build if anything is added.

(b) CHOICES FELT POINTLESS
- There is no score anywhere. Every action changes the map within 1 to 4 seconds: freeze the Narrows and the ships turn back, the line goes grey and the flame on the strip shrinks a size.
- The choices are real trade-offs. Storms win ground but wake the world. Reach, strength and quiet all compete for the same Frost. Each crystal raises the price of the rest.
- An automated test fails the build if a purchase does not change the map within 15 seconds at 1×.
- The balance simulator must show that:
  - a player who does nothing always loses;
  - a random buyer wins under 25% of games on Normal;
  - rushing, quiet and line-cutting styles each win 50 to 70%;
  - no crystal appears in more than 35% of winning builds;
  - fewer than 30% of games are decided by minute 10.
- The end replay marks your storms and cuts, so you can see what mattered.

(c) LOOKED UNFINISHED
- One commissioned world, painted twice, is the face of the product.
- A final-quality mockup and a 20-second clip are approved before any game code.
- No placeholder art can ship; an automated check enforces it.
- Real music and sound.
- The main screen mid-game is the first store screenshot and the share card.

(d) WRONG FOR THE MARKET
- ‘Be the winter that never ends’ is understood in one second by anyone.
- It keeps Plague Inc.'s ‘you are the threat’ thrill with no disease, war or real places, so it passes every app store and ad platform and rates about 9+ / PEGI 7.
- It is built for phones held upright, with the whole world on screen.
- Prices match what already sells on all three channels.
- The niche is empty, and every year's first snow is free news to hang marketing on.

## Distance from plague inc

Shared, honestly: the genre skeleton (spread across a map, a currency spent on upgrades, a race against one counter-force).

Different on every surface a player or reviewer sees:
- Premise: weather, not disease. No hosts, infection, deaths, DNA, cure or ‘evolve’; the verb is always ‘Grow’, and the content checker bans Plague's vocabulary.
- Map: an invented round polar world painted at dusk, not a flat real Earth with red dots.
- Verbs Plague lacks: you drag storms onto the map and aim the Jet Stream.
- Counter-force: a physical Furnace on the map, fed by fuel lines you cut, not an abstract research bar.
- Isolation helps you: cut-off Hearths gutter out. That is the reverse of Plague's border closures and its Greenland problem.
- Seasons make the snow line breathe each year.
- Upgrades: one six-armed snowflake that grows as you buy, not three tabs of hexagons.
- Pickups: ice crystals that melt into local snow if ignored, not bubbles.
- Layout: race strip at the top, buttons along the bottom centre, radio line at the bottom; no ‘World’ or ‘Disease’ buttons; no ‘Inc.’ in the name.
- Marketing line: ‘Be the winter that never ends.’, never ‘Can you X the world?’.

The nearest other neighbour is Frostpunk, with its eternal winter and its Generator. Here we are the winter, not the city: no steampunk, no city building, and no ‘Generator’.

Some reviews will still say ‘Plague Inc. with snow’. The risk of Apple rejecting it as a copycat (guideline 4.1) is low, given the different premise, art, layout and wording.

## Risks

- Owner taste: winter as the premise, and a round map instead of a flat one, may still not be the picture in his head. Mitigation: a final-quality painted main screen in two treatments, plus a 20-second clip, before any game code. The simulation does not depend on the theme, so a new look would cost art, not code.
- Clone perception: some reviews will say ‘Plague Inc. with snow’, and Steam players will compare it with Frostpunk. Every store asset must lead with what is ours: the round world, dragging storms, cutting the Furnace's fuel lines and the snowflake.
- The picture is the pitch. The twice-painted disc (estimated £3k–£8k) and the music (£2k–£5k) must be excellent. The snow reveal and glow must hold 60 frames a second on a mid-range Android phone and on Steam Deck, whose web engine has the weakest graphics support. Test on real devices from week 2.
- Balance: cutting lines could snowball into an early win, or storms could dominate. The defences are the summer sea thaw, the late icebreaker, bots with hard targets, a parameter sweep and human playtests every two weeks; bots cannot judge how a game feels.
- Small tap targets: regions average about 40 px on a 370 px disc and are smaller at the centre. Mitigations: snapping to region centres, 44 px tap zones, pinch zoom and storms that do not need precision. Test with real thumbs early.
- Seasonal interest and discovery: interest may dip in the northern summer, pay-once games are about 4% of phone downloads, and there is no ad budget or tracking. The plan relies on screenshots, the share card, 5k–7k Steam wishlists before launch, Next Fest and a November launch.
- Scope: about 16–22 developer-weeks plus art and music. The desktop and phone app builds have never been built, iOS needs a Mac, and there are three separate purchase systems to test.
- Determinism: the Daily Winter and replays need integer-only maths, with the game state checked to be identical in Chrome, Safari and Firefox engines.
- The name needs a formal trademark and app store search.

## Build plan

STEP 0 (1 week, plus artist time): a final-quality phone mockup in two treatments plus a 20-second clip. The owner signs off by eye before any game code.

REUSE AS IS (from /home/user/brink):
- src/engine/rng.ts (the seeded random-number generator, with separate streams for spread, alarm, Hearths, events, headlines and bots).
- src/meta/storage.ts.
- src/meta/unlock.ts with worker/ (configuration only, plus renaming the plan from 'endless' to 'full' in src/meta/unlock.ts, worker/src/index.ts and worker/src/crypto.ts together).
- The src/audio core: drone.ts follows the Furnace and heartbeat.ts plays above 90%.
- tools/vite-plugin-content.ts.
- tools/zip.ts and tools/build-itch.ts.

REUSE WITH CHANGES:
- tools/load.ts, tools/validate.ts and src/content. New folders regions/, seas.yaml, crystals/, winters/, scenarios/ and headlines/, plus rules.yaml. Cross-check against map.json. Add checks against real place names, Plague vocabulary and words from the film Frozen; 60-character limits; no digits in descriptions; and two ways into every region, one of them by sky.
- src/engine/modifiers.ts becomes the resolver for crystal effects.
- src/engine/conditions.ts reads the frozen count, Furnace progress, season, crystals and region state.
- tools/sim.ts with src/sim/simulate.ts and policies.ts, about 70% rewritten. Bots: idle, random, rush, quiet and line-cutter.
- src/meta/daily.ts (Daily Winter) and src/meta/share.ts (the final disc drawn from the region map, plus the snowflake).
- tools/og-image.ts, tools/icons.ts and tools/size-check.ts (250 KB of JavaScript plus a budget for textures).
- The PWA settings in vite.config.ts (any orientation, a larger offline cache limit).
- src-tauri (a 1280×720 window and the Steamworks library), capacitor.config.ts, playwright.config.ts and e2e/ (a test hook, screenshot baselines, and checks that game state is identical across browser engines).

RETIRE, do not adapt: src/engine/run.ts, leverage.ts, night.ts, fixture.ts and types.ts; the card UI and store in src/ui; content/ and content-crisis/.

BUILD NEW:
- tools/map-build.ts: turns the round SVG into a crisp-edged region map, thawed and frozen textures at 2048 and 4096 px, a distance field for glows, adjacency, rivers, sea paths and map.json.
- A raw WebGL2 renderer: one full-screen quad, a per-region state texture, the frozen-painting reveal, instanced lines and glints, DOM labels, a Canvas 2D fallback, and recovery when the graphics context is lost.
- Camera and input: touch, mouse, keys and gamepad.
- The simulation core: pure code with a fixed tick of one in-game day, and 1× = 2 ticks a second. Integer frost from 0 to 1000 per region. Fuel lines are recomputed by breadth-first search over the 48 land and sea cells, only when a cell freezes. A (tick, action) command log. Commands: start, collect, grow, melt, storm, aimWind, setSpeed.
- The Snowflake sheet, radio director, HUD, end screen with replay, Daily Winter, Snow Globe Shelf, and the three store purchase integrations.

ORDER OF WORK:
1. Step 0.
2. Map pipeline and a rough, art-free simulation with bots (weeks 1–3).
3. Renderer and input (weeks 2–5), with real-device tests from week 2.
4. HUD, Snowflake, radio, first minute, win and loss (weeks 4–7).
5. A web vertical slice at about week 7: one disc, 18 crystals, storms, the Furnace and its lines, Hearths, seasons.
6. Content, winters, scenarios, Daily Winter and audio (weeks 8–13).
7. Steam build and Next Fest demo (review due about 10 May 2027).
8. Capacitor iOS and Android builds with store billing.
9. Steam launch in November 2027.
Total: about 16–22 developer-weeks, plus art and music.

HARDEST PART: making the twice-painted disc and the snow reveal look like the mockup at 60 frames a second on a mid-range phone, and tuning the simulation so that a storm or a cut line feels decisive without deciding the whole game.

## Judge scores

Owner-lens judge, 51/70 (top pick): ‘Plague's fantasy on a map that explains itself, with the best choice in the set: freeze a strait and the fuel ships turn back.’ Against: the clone label, small tap targets, and summer melt confusing a first game.

Publisher judge, 49/70 (top pick): ‘Every decision is a geographic move you can see’, and it keeps the dark end-the-world thrill without disease or war. Against: flat white may read as blank, and the Frostpunk comparison.

Designer judge, 49/70 (top pick): ‘Where you spread is decisive and readable.’ Against: cutting lines can snowball, and a white overlay may look blank.

Combined 149, the highest. Matches the owner's answers 23 of 30, also the highest.

Changes made in response:
- a second, frozen painting instead of a white overlay;
- one race bar filled from both ends, with a region count;
- a frozen region never thaws (summer only moves the soft edge);
- sea ice thaws in summer, and a late icebreaker reopens one lane;
- advance warnings for new Hearths and lines;
- an end-screen replay, and a reason plus a tip on every loss;
- 40 regions instead of 48.
