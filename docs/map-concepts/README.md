# Map concepts (October 2026)

The owner rejected three card-swipe versions of BRINK. On 13 October 2026 they answered four questions:

1. **The game in their head:** Plague Inc style. A world map that reacts as you make decisions; a longer strategic game with a clear win or loss.
2. **Setting:** open. Any theme, if the game is better for it.
3. **Markets:** phone app stores, Steam and the web.
4. **What was wrong with the first build:** all four. Couldn't tell what to do; choices felt pointless; looked unfinished; wrong for the market.

This folder is the design study that followed: research on Plague Inc. and the market, an audit of this repository, six concepts, three judges scoring against the owner's answers, a shortlist of three, and finished-looking mockups of each. The owner chooses; nothing is built until they do. The chooser page is a private artifact: https://claude.ai/artifact/Lo7z4zbsscToa1EabEftgk

## Why the last three missed

All three earlier versions were the same game underneath: a card with a few sentences of text that you swiped left or right. That is nothing like the world map that reacts to your decisions, which is what you had in mind. Because each choice only nudged a score or a bar, picking one option over the other made almost no visible difference, so the game was hard to read and the choices felt pointless. The screens were mostly text and placeholder art, so none of them looked like a finished product people would pay for. Each redesign kept the card core and changed only the setting (a nuclear crisis, a two-minute daily night, a comedy hotel), so the real problem was never fixed, and the comedy hotel moved even further from the serious, world-scale game you described; we also trusted an AI panel's taste over your own answers, which is how the hotel was recommended unanimously and still missed.

## Principles every shortlisted concept follows

- The map is the whole game (your answer 1, ‘a world map that reacts’). Each concept is one illustrated, fictional world that visibly changes colour as you play. The main loop has no cards, no swipes and no text screens. Every action happens on the map, or in one sheet that keeps the map visible above it.
- One race, one sentence, one way to win and one way to lose (answer 1, ‘a clear win or loss’, and complaint a). The goal sentence is on screen every second. One strip shows you and one counter-force racing to one finish. A region you have won stays won, so your progress never goes backwards without warning.
- Every choice is a move you can see within seconds (complaint b). There are no score numbers anywhere. Touching an upgrade first shows where it will act. After you buy it, the map changes within 1 to 4 seconds; an automated test fails the build if this takes longer than 15 seconds at normal speed. The balance simulator must prove that the key choices change who wins, and that a do-nothing player always loses.
- Show, don't explain (complaint a). The screen shows one big number (the currency) and one count of places; everything else is light, colour and short words. There is no rules screen. The first minute is about five taps with hints of six words or fewer. The content checker enforces text limits and bans digits in upgrade descriptions, and a fixed list of on-screen elements fails the build if anything is added.
- Every game turns on a real two-sided decision about places (answer 1, ‘a longer strategic game’). The first half is quiet against loud: spread unseen, or act boldly and wake the enemy. The second half is a target on the map that controls how fast the enemy moves (fuel lines to cut, factories to overgrow, chokepoints to black out). The enemy shows where it is going a few seconds ahead, so you plan rather than react.
- The picture comes first, and nothing unfinished ever ships (complaint c, and you judge with your eyes). Before any game code, you see a final-quality painted main screen at phone size and a 20-second clip, in two tones. All art and music are commissioned from people. No placeholder art can reach any channel. The main screen mid-game is the first store screenshot, and the final map is the share card.
- World-scale stakes in a setting every store and parent accepts (answer 2 and complaint d). The world and names are invented; there is no disease, war, real place, real brand or gore. It is serious enough to feel like a crisis strategy game, not a comedy: jokes live only in one-line headlines and fade as the stakes rise. Target ratings are around Apple 9+ and PEGI 7.
- Built once, sold on all three channels (answer 3). Phones come first, held upright, with the whole world on one screen. Steam and Steam Deck get the same game with docked panels, keyboard and gamepad. A free web demo feeds both. Phones get a free first game plus one £3.99 unlock, Steam gets a complete $9.99 game, and the web sells the unlock through Stripe. No ads, no accounts, no chat, no leaderboards with names and no tracking.

## The shortlist

- **NEVERSPRING**: You are a winter that will not end. Cover the whole world in snow before its people light the great Furnace that would bring back spring. ([spec](concepts/neverspring.md), [mockups](mockups/neverspring/))
- **REWILD**: You are the last living seed on a grey, paved planet. Turn the whole world green again before its cities finish clearing you away. ([spec](concepts/rewild.md), [mockups](mockups/rewild/))
- **OFF SWITCH**: A polite household AI called TIDY is quietly taking over the world one city light at a time. Build the off switch before it runs half the planet. ([spec](concepts/off-switch.md), [mockups](mockups/off-switch/))

## Recommendation

I would pick NEVERSPRING. It is the only one of the three where you are the force covering the world, which is the Plague Inc. fantasy you chose; its key move (freeze a strait and watch the Furnace's fuel ships turn back) is the clearest proof in any concept that your choices matter; and it scored highest with all three judges and on matching your answers. Choose REWILD if you want the widest, family-friendly audience and the brightest store picture, or OFF SWITCH if the tense, save-the-world crisis of the original BRINK is still the game you see in your head. Whichever you pick, nothing gets built until you have seen one painted main screen and a 20-second clip and approved them.

## Questions for the owner after they choose

- What can you spend on commissioned art and music? A rough guide is £5k–£13k for the painted map, icons and score. Or should we plan a simpler look we can make ourselves? The answer decides how the art is made and how long the build takes.
- On phones, should the game be free with one £3.99 unlock and no ads, or paid upfront at about £1.99 on iPhone? The answer changes the purchase code, how much of the game is free, and the purchase screens.
- Should Steam launch first, with a demo in Steam Next Fest in June 2027 and phones after, or should phones launch first? The answer decides which we build first: the desktop/Steam version, or the iPhone and Android apps with their store billing.

## Ranking (sum of three judges, each out of 70)

- NEVERSPRING: 149 (matches the owner's answer: 23 of 30)
- REWILD: 131 (matches the owner's answer: 20 of 30)
- OFF SWITCH: 126 (matches the owner's answer: 20 of 30)
- EVERY CORNER: 117 (matches the owner's answer: 13 of 30)
- CATCHY: 114 (matches the owner's answer: 12 of 30)
- Wake Up, Hearth: 84 (matches the owner's answer: 10 of 20)
- WAKE UP, HEARTH: 43 (matches the owner's answer: 5 of 10)

## Files

- `concepts/` the three shortlisted specs in full, as the synthesis wrote them.
- `all-six-concepts.md` every concept the panel generated, before judging.
- `judges.md` the three judges' scores and verdicts.
- `research-plague-inc.md`, `research-market.md` the research, with sources and confidence.
- `code-audit.md` what in this repository can be reused for a map game.
- `mockups/<concept>/` the phone main screen, the win screen and the PC screen (WebP), plus the HTML and canvas source that drew them. Re-render with `tools/render.mjs` after fetching fonts with `tools/fetch-fonts.py` (the fonts are not committed).

The mockups were drawn in code to show the look and layout. In the real game a commissioned illustrator paints the map.

