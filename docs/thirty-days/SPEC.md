# BRINK: THIRTY DAYS — build spec (v3)

The product name is `BRAND.name` ('BRINK'). "Thirty Days" is the title line. All places, people and
powers are fictional. No accounts, no user-to-user features, no runtime network calls.

## Why this version exists

The owner's brief: you lead a great power as the world slides towards war and must hold it together, with the
compulsion of Balatro delivered through an instantly understood interface. After the war-room builds the owner
said: "Too many visuals, my partner has no clue what is going on. You've not understood the brief." They then
confirmed four things: the story is stopping the war; each turn is mostly one message with two choices,
sometimes a tap on the map; the Balatro-style scoring stays in the background; you win early by calming the
world to zero or by surviving to day 30, and lose if danger fills.

The test of every screen: someone who never plays games, watching over the player's shoulder, can say what
is happening and what the player is trying to do.

## The game in five sentences (this is also the explanation at the start, on the map)

1. The world is sliding towards war. You lead the Republic. Each day, one decision.
2. Keep DANGER below 100 for thirty days. Calm the whole map and the crisis ends early.
3. Your advisers make your decisions count for more. Choose them well.

(Screen 1 shows lines 1 and 2 over the live map; screen 2 shows line 3 with the three empty team slots. Then
DAY 1. Skippable. Replayable from the menu.)

## The screen (portrait 390 x 844, letterboxed and fitted as the war room is now)

Exactly four things, top to bottom. Nothing else is ever drawn.

1. **The strip** (0, 47, 390, 56): left, `DAY 7 OF 30` (16 pt caps). Right, the DANGER gauge: a 200 pt bar
   with a needle, the word DANGER above it (10 pt caps) and the number at the needle (18 pt). The bar's colour
   runs cool blue at 0 to red at 100. When a choice moves it, the needle slides over 600 ms and a small
   `-18` or `+9` floats beside it for one second. That is the only number that ever moves on screen.
2. **The map** (0, 103, 390, 400): the existing 30-region fictional world, redrawn at this height. Each
   region is in one of four states: CALM (muted blue-grey), TENSE (amber), CRISIS (orange, slow pulse), WAR
   (red with hatching). Your home bloc (Highmarch) carries a small flag mark on its capital. Today's region
   wears a thin white ring. On a map day, the two or three places you may tap glow and carry a one-line label.
   Nothing else is drawn on the map: no numbers, no pins, no threads, no tags.
3. **The team row** (0, 507, 390, 40): the advisers and policies you hold, up to five chips (icon and a
   one-word name). Hidden until you hold one. Tap a chip: its rule in one line. When a chip changed today's
   outcome, it glows for a second after the choice.
4. **The card** (0, 551, 390, 256): the adviser's name and role in small caps with a silhouette portrait
   (12 pt), the message (17 pt, two or three sentences, never more than 40 words), then two buttons
   (each 390-32 wide, 56 tall): the action in 3 to 5 words (16 pt) and a hint line (12 pt) that says
   plainly what will happen, for example `Danger down · the Strait calms`, `Risky · holds 65%`,
   `Danger up · the General is pleased`. On a map day the card says what to do (`Tap where the fleet goes`)
   and the buttons are replaced by the glowing regions.

Home indicator below. The menu button is a small `≡` at the top left of the strip: RESUME, HOW TO PLAY,
SOUND, QUIT TO TITLE (the game is saved after every day; the title shows CONTINUE). The phone's back button
and Esc open the menu. Nothing on the title but the name, the title line, PLAY / CONTINUE, HOW TO PLAY.

Look: calm and clean. One text face (Barlow Condensed, already self-hosted) and one numbers face (JetBrains
Mono). Dark navy table, off-white card, the gauge the only saturated colour outside the map. No split-flap
boards, no leather, no brass, no coins.

## The rules

**Regions.** Each of the 30 regions has a heat: 0 CALM, 1 TENSE, 2 CRISIS, 3 WAR. The map starts with three
TENSE regions and one CRISIS region (seeded, never in Highmarch on day 1).

**Danger** is read off the map, never kept separately: `DANGER = min(100, 2 x TENSE + 5 x CRISIS + 12 x WAR)`
counted over all regions. (Four WAR regions and a few crises is war; the start reads 11.)

**Days.** 30 days. Each day one card. The card names a region (today's region, ringed). The player chooses;
the choice changes heats (today's region and sometimes its neighbours); the map recolours; the gauge moves;
the next day begins. No timers.

**Pressure.** At the end of every day, each WAR region heats one CALM or TENSE neighbour by one step (the red
spreads, Plague-Inc style); each CRISIS region has a 1 in 3 chance to heat one neighbour; and, from day 6, a
crisis left standing a night may turn red on its own, as may one that borders another crisis. This is what the
player is fighting: orange that is not answered becomes red, and red spreads. A region at WAR cools only
through a choice that targets it or a piece that reaches it. (ENGINE.md "Rulings" has the numbers.)

**Choices.** Every choice carries effects on heats, by tag:
- `CALM` choices cool today's region by 1 (talks, concessions, pulling back).
- `FORCE` choices cool today's region by 2 but heat one neighbour by 1 (shows of force, blockades).
- `RISKY` choices show odds (`holds 65%`): on success cool by 2, on failure heat by 1 and show `Missed by n%`
  on the hint line for a second. Odds are seeded and the roll is shown as a short needle sweep on the gauge.
- `HOME` choices do nothing to the map but prevent a domestic card (public, economy) from coming; they exist
  so that "do nothing abroad" is sometimes right.
- Some choices add or remove one CRISIS elsewhere (the arcs' consequences), always named in the hint.

**The team (the building, kept in the background).** After days 5, 10, 15, 20 and 25: a card offers three
pieces; the player takes one (or none). Twelve pieces, each with a one-line rule and a tag it amplifies.
Pieces are the Balatro part: they multiply what a choice does, and they stack.

| Piece | Rule (as printed) | Tag |
| --- | --- | --- |
| Old Ambassador | Every calming choice cools one step more. | CALM |
| Back-Channel | Calming choices also cool one neighbour. | CALM |
| Peace Movement | Calming choices cool two extra regions; force choices heat home. | CALM / FORCE |
| Hotline | Once a week, a crisis card calms itself before you choose. | any |
| Dove Foreign Minister | Talks never fail: risky talks become certain. | RISKY |
| Hawk General | A show of force also cools every neighbouring region one step, and still heats one of them. | FORCE |
| Loyal Admiral | A show of force at sea also cools every neighbouring region two steps. | FORCE |
| Cautious Intel Director | False alarms are marked before you choose; every risky choice is 10 points more likely to work. | arcs, RISKY |
| Paranoid Intel Director | Trouble is spotted early: a place in crisis gets its card by the next morning. | any |
| Spin Doctor | No domestic cards. Home never heats. | HOME |
| Red Lines | Name one region: it calms twice as fast, but if it reaches war, danger +15. | map |
| Launch on Warning | Every show of force warns its region; a warned region never heats at night. A false alarm there is +20. | arcs, FORCE |

(The five force and intelligence pieces were rewritten after the fifth build's playtests: as first written the
Hawk General acted in 1% of the games it was held, the two directors and Launch on Warning hung on the one warning
card in the pack, and a force build lost 92% of games. Now a hawk who builds on force holds about as often as
the spec asks of a dove; see ENGINE.md "Tuning", item 15.)

Stacking is the point. Old Ambassador + Back-Channel + Peace Movement turns one Talks choice into a wave of
calm across four regions; the map goes blue in a ripple and the gauge drops by 8 to 12 in one go on a map of
tense regions, by 20 or more when the wave reaches crises and wars. Hawk General + Loyal Admiral turns one
show of force at sea into a wave of its own over every neighbour. The hint line shows this before the choice
(`Danger down · calms Shoal and 3 more`), so the player sees their build work before they commit, in words.

**Ends** (checked after each day's pressure):
- `DANGER >= 100`: **WAR**. The ending names where the fighting began (the first region to go red, and the
  day), the region that was the last straw, and says so when too many crises at once decided it.
- `DANGER == 0` after the choice, from day 10, once the gauge has been at 30 or more on some day:
  **STAND-DOWN**. The crisis is over early; the day is the score. (The spec's first reading, "after day 5",
  gave a day-6 win over a map that was never in danger; a calm map before there has been a crisis is a quiet
  morning, and the month goes on.)
- End of day 30 with `DANGER < 100`: **HELD**. Graded by the final danger: under 20 is a clean hold.
Every ending: two lines of story, the final map, PLAY AGAIN (new seed), REPLAY THIS SEED, HOME.

**Length.** 30 days at about 20 seconds each, five team picks at about 20 seconds, the explanation once:
12 to 15 minutes. A STAND-DOWN is shorter.

## The content

Plain English, in-world, no game terms except DANGER. Every card names its region. 40 words or fewer.
Advisers (six, each a silhouette portrait and a voice): the Foreign Minister (measured), the General (blunt),
the Intel Director (hedged), the Admiral (dry), the Chief of Staff (domestic, tired), the Old Ambassador
(warm, long-winded in few words).

Arcs, each 3 to 5 cards chained over days, drawn from the original brief: Satellite Blackout, The False Alarm,
Undersea Cables, Proxy Incident, Cyberattack on Early Warning, The Blockade, The Defector, Debris Cascade,
The Ultimatum, The Summit. Plus single-day cards for every region, domestic cards (public, economy) for the
Chief of Staff, and six map-tap cards (where the fleet goes, which front to pull back, where to send the
envoy, where to station the brigade, which ally to reassure, where to draw the red line).

Target: 120 cards, in `content-thirty/` as YAML with a strict schema and a validator (ids, regions, tags,
effects, follow-ups, odds, conditions on day range and pieces held). Three example cards:

```
id: strait-01
arc: blockade
adviser: admiral
region: SHL
day: [3, 12]
text: Federation ships are sitting across the Shoal strait. Our tankers are turning back. The crews want orders.
left:  { text: Escort the tankers through,  tag: FORCE, hint: "Danger down here · heats Lintel" }
right: { text: Reroute and talk,            tag: CALM,  hint: "Danger down · slower" }
```

```
id: alarm-02
arc: false-alarm
adviser: intel
region: WMS
day: [8, 22]
text: Early warning shows six launches over the Cap. Nothing else confirms it. We have four minutes.
left:  { text: Wait for a second source, tag: RISKY, odds: 70, hint: "Holds 70% · if real, the Cap burns" }
right: { text: Raise the alert,          tag: FORCE, hint: "Danger up · the Federation sees it" }
```

```
id: fleet-map
adviser: admiral
map: true
text: The fleet can be in one place by morning. Tap where it goes.
targets: [{ region: SHL, hint: "Calms the strait" }, { region: ORN, hint: "Warns Orrinth off" }, { region: VSY, hint: "Guards home" }]
```

## Balance gates (simulator, 2,000 games per bot)

- Random choices: holds to day 30 in under 10% of games.
- A sensible policy (prefers calming the hottest region, takes stacking pieces): holds in 55 to 70%,
  stand-down early in 15 to 30%, war in the rest.
- Every piece is taken by the sensible bot in at least 10% of games; none in more than 70%.
- A game runs 20 to 30 days at the median; no game stalls.
- The median sensible game feels close: red on the map (a region at war) before the end, or the gauge above
  60 at least once. (The first reading was the gauge alone; the fifth build met it only through the late amber
  wash the owner's partner saw as "whatever he presses it climbs". Red that spreads each night is the threat a
  watcher can see; see ENGINE.md "Tuning", item 15. Owner's call whether the gauge alone should come back.)
- A hawk (takes the force pieces, prefers shows of force when they are nearly as good) holds in 40 to 65%:
  there is more than one way to play.

## What is reused, what is new

- Reuse: the map geometry and renderer (`src/war/ui/map`: cells, hit testing, DPR, ink spread, fonts), with
  the four heat states replacing ownership; the frame fit, the menu, the back-button handling, the save
  pattern, the seeded RNG, the Web Audio sounds (a soft tick per day, a low tone when danger passes 60 and 80,
  a chord on STAND-DOWN, a single low note on WAR).
- New: `src/thirty/` (engine, content loader and validator, UI, simulator), `content-thirty/`,
  `VITE_GAME=thirty`. The war-room and hotel code stay dormant and untouched.

## Out of scope for this build

Seats other than the Republic, unlocks, the daily, sharing, payments, music.
