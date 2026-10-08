# Four critiques of the night (v0.3.0)

## Games-Industry Product And Monetisation Lead (Shipped F2P And Premium Mobile). Judging The Funnel: First-Session Comprehension, Session Length, Reason To Return, Reason To Share, Reason To Pay, And Whether The Theme Caps The Audience.

**verdict.** No, this does not work for a wide paying audience, and it is not a polish problem. It is a superbly written niche Cold War thriller (a 70-card, three-week Expert deck) wearing a Wordle costume: the daily, the strip and the streak are bolted onto content that was never built for a three-minute night, so a civilian's first session is dense, incoherent as a story, contradicted by its own clock, and ends about 60% of the time on a dice roll stamped NUCLEAR WAR, after which the game offers to sell them more of the thing that just beat them. The engine, tooling and prose are genuinely valuable; the game wrapped around them should be rebuilt from the audience inward, not retuned.

**problems.**

- **title.** The theme caps the audience before a single mechanic is judged
  
  **severity.** fatal
  
  **evidence.** Every share card in docs/playtests/night/*-share.png carries a red NUCLEAR WAR stamp. The ending list (content/endings/) is roughly 26 nuclear, 33 removed-from-office, 16 stand-down, 14 survival: about two-thirds of all outcomes are losses, and a third of careful nights end in nuclear war (BALANCE.md N-2/N-4: calm bot 32% nuclear). The launch plan (LAUNCH.md) targets HN, r/roguelites, r/gamedev and 'grand-strategy / geopolitics YouTubers'. The Show HN body ends 'I'd like to know when you fell'.
  
  **why it matters.** The dailies that reached millions (Wordle, Connections, Heardle) are wholesome, clever and safe to post in a family group chat; their audience skews female and 35+. Nobody posts '☢️ 5:59 NUCLEAR WAR' to their mum, and in a year of real geopolitical anxiety many will find it distasteful. The owner's goal is 'a wide base of people'; this theme, in this register, has a ceiling of strategy-literate men who read about international affairs, which is a market of tens of thousands, not millions. The launch plan already knows this, which is why every channel in it is a nerd channel.
- **title.** Card one is unreadable to a civilian, and the one-line rulebook does not explain the one thing that needs explaining
  
  **severity.** fatal
  
  **evidence.** First card of the dove and balanced nights (dove-NIGHT-DOVE-FINAL-04-card.png): 'Three cables were cut in the Sorrel Straits at 3:40, eleven minutes apart, which is a very well organised anchor. The markets open in four hours on a fifth of the bandwidth.' Choices: 'Halt trading. Call it maintenance' / 'Open the markets on time'. The intro overlay reads only 'Swipe. Keep the five dials off the edges. Make it to dawn.' The DANGER dial fills blue-to-red and is bad when full; the other four are bad at either edge; nothing on screen says which is which (About has to explain it). RISKS.md #11 names this exact risk as the redesign's bet.
  
  **why it matters.** An invented proper noun, a joke that requires knowing ships' anchors cut undersea cables, 'a fifth of the bandwidth', and a timestamp 40 minutes in the future of the 3:00 AM clock on the same screen. The voice contract made sentences shorter, not simpler: this is still Le Carré, and Le Carré is a 5% audience. A first-time player cannot tell what either choice does to any dial without dragging, and does not know a full ARMY dial is as fatal as an empty one. First-session comprehension is the top of the funnel; everything below it is irrelevant if this leaks 50% on card one.
- **title.** The deck contradicts the clock, which is the only number on screen and the whole premise
  
  **severity.** fatal
  
  **evidence.** hawk-NIGHT-HAWK-FINAL-08-crisis.png: clock reads 5:27 AM; the card reads 'Ten past eleven, the deadline is midnight'. Transcripts: 'Thursday the Assembly votes', 'the court sits Monday', 'Come to Qorum on the twentieth', 'Tomorrow I ask the chamber', 'this is day twelve', 'Four days since you were home', 'mortars that fire at 17:00'. Across content/cards/*.yaml: 'midnight' appears 103 times, 'noon' 19, 'tomorrow' 14, 'Monday' 12, 'Thursday' 8.
  
  **why it matters.** The pitch is 'It's 3am. The phone is ringing.' Every third card tells the player it is actually a Tuesday afternoon in week two. The 451 cards were authored for a three-week Expert game and re-voiced, not re-set; a reader notices by card three and stops believing the frame. For a game whose single legible number is the clock, this is a typo in the title.
- **title.** A night has no story, so the ending feels unrelated to what you did
  
  **severity.** fatal
  
  **evidence.** The balanced transcript, in order: cut cables, an Assembly vote, a trawler, a repair ship, a cabinet feud, an ally's warships, a missile track, a cable recorder, a school drone, a daughter's birthday, the moon, a satellite, a laser shot, border observers, a defection, a destroyer, then a five-card summit and the ending 'The Paper at Vellmar'. The 'moment' card the game picks is the laser shot; the ending is a summit walkout. Eight arcs touched, none resolved. REDESIGN.md: '21 cards and then the crisis'; the crisis is the only sequence with continuity.
  
  **why it matters.** Reigns survives a shuffled deck because runs are long and the gags land per card. A three-minute session has to be one situation that escalates and pays off, or the player cannot connect their choices to the outcome and the loss reads as arbitrary. The Expert game's weeks and flashpoints gave arcs room to breathe; the night stripped the structure and kept the shuffle. Return-tomorrow depends on 'I know what I'd do differently'; nothing here teaches that.
- **title.** Most first nights end in a loss the player cannot diagnose, then a 24-hour lockout
  
  **severity.** major
  
  **evidence.** All four harness nights lost: Impeached, Midnight, The Paper at Vellmar, Forty Miles of Water. Balanced run: six rolls, four failed at 'even' or 'risky'. The dove kept every dial mid-range for 22 cards and lost PEOPLE inside the crisis. Hidden values steer the odds and are 'felt, never shown' (REDESIGN.md). Sim: a bot that reads dials perfectly reaches dawn 61%; RISKS.md #12 hopes humans land near 40%. Dawn.tsx after a loss: the ending, 'TOMORROW'S NIGHT IN 23h 58m', and a locked 'Night after night · unlock' button.
  
  **why it matters.** Wordle is won 95%+ of the time and when you lose you can see exactly why. Daily retention is built on near-misses the player understands. Here ~60% of first-timers lose to a roll whose odds were moved by numbers they were never shown, cannot retry, and are told to come back tomorrow for a different shuffle. That is the retention curve of a slot machine without the slot machine's payout schedule. RISKS.md #1 and #5 already flagged 'odds feel random' for Expert; removing the numbers made it worse, not better.
- **title.** The share strip has no shape, so it carries no story and no hook
  
  **severity.** major
  
  **evidence.** share.ts shareText for the night: 'BRINK #12 ☢️ 5:59', then five rows of ten coloured squares (50 emoji) with no row labels, then the URL. The strips in all four share PNGs are mostly yellow and green with a red tail on the DANGER row. Because the crisis kills most careful nights, nearly every result reads 'Fell at 5:3x–5:5x'. STORE.md: 'everyone who played tonight knows exactly what it means.'
  
  **why it matters.** Wordle's grid is legible to people who did not play: six rows, the shape tells you how close it was. Fifty unlabeled squares tell an outsider nothing and tell a player only 'yellow, then red'. The one legible token is '☢️ 5:59', which out of context is a time. There is no 'what did you get?' comparison because the outcome space is binary (dawn or not) and the time is nearly always the same. The strip is the entire acquisition plan (REDESIGN.md: 'the strip is the ad') and it is not an ad anyone will click.
- **title.** The paywall sells the wrong product at the worst moment
  
  **severity.** major
  
  **evidence.** The offer appears once, on the Dawn screen, usually after a loss: 'Night after night · unlock' for £2.99, listing 'Another night whenever you want one', 'Replay a night from its seed', 'Expert mode: the long game with the numbers on' (Paywall.tsx). The free player has never seen Expert, cannot preview a second night, and has just been told they fell. No trial night, no gift, no cosmetic or identity value, no app store presence at launch. RISKS.md #3 hopes for 2% conversion.
  
  **why it matters.** 'Pay to be beaten again on a random seat, plus a mode we won't show you' is a hard sell at any price. Web-only daily to one-time unlock, no store, no accounts, no ads: realistic conversion is 0.5–1.5% of paywall viewers, net about £2.50 after Stripe. To clear even £2k a month you need roughly 100k monthly actives reaching the dawn screen. Nothing in this theme or this funnel gets there. There is also no second purchase, no reason to spend twice, and no cross-device identity, so the small base you do convert cannot be grown or re-engaged.
- **title.** The redesign is a veneer; the Expert game leaks onto every free screen
  
  **severity.** major
  
  **evidence.** record.png (the free Record screen): 'UNLOCKS 0/21 — The Federation: Survive to Week Three once · DEFCON 4 · DEFCON 1 · Launch on Warning · Hardened NC3 · Pre-delegation · Escalate to De-escalate · Brinkmanship: Smash three antes'. seat-night.png: Federation and Coalition 'LOCKED — Survive to Week Three once' even though they rotate free in Tonight. hawk-08-crisis.png in night mode shows a '+2 political capital' toast. endings.png: ~90 grey locked rows plus a 'Pieces' section. Card header shows 'CHANCELLOR ANSELM ROKE' under 'Your Chancellor' despite 'names only in the compendium'. Home has 'Endings 0/94' for a once-a-day game. Eight of the words on the Record screen are on REDESIGN.md's own banned list.
  
  **why it matters.** A new player who taps anything but Play meets DEFCON tiers, NC3 and antes within one screen. It tells them the simple game is a lobby for a complicated one, and it tells you the redesign was done at the run screen and not through the product. The owner's 'I just still don't like it' is what a veneer feels like from the outside.
- **title.** You could not get home from the run, and the fix on disk is a patch, not a decision
  
  **severity.** major
  
  **evidence.** Shipped run screen (dove-04-card.png, hawk-08-crisis.png): header is an 11px grey '● THE NIGHT' label that is secretly a menu button, and the clock. The menu offered 'Back to the phone' or 'Leave the night' with confirm('Leave tonight unfinished? It counts as played.'), so the only visible exit forfeited the daily. On Dawn, 'Home' is the last button after the ending, the strip, the moment, the PNG preview, two share buttons, the countdown and the paywall. The working copy of Night.tsx (line 44) now adds '← HOME' and a three-button menu: 'Back to the phone / Home / Leave'.
  
  **why it matters.** The owner found the one navigation bug a mass audience will find in the first minute, and it existed because 'nothing else on screen' was treated as a styling rule rather than a product decision about what a player needs. Three exits in a hidden menu on a screen whose promise is one card and two choices is the same mistake with more buttons.
- **title.** 'Two minutes' is a promise the game breaks by half
  
  **severity.** major
  
  **evidence.** Home.tsx: 'ONE ATTEMPT · TWO MINUTES'. BALANCE.md N3: calm bot averages 3.7 minutes at 7s per card and 4s per roll. PLAYTEST.md: the hawk night ran 54 card events with the clock pinned at 5:59 'for the whole crisis'. Cards are up to 180 characters of dense prose; the roll overlay has a slow-motion mode; a human reads this register at well over 7 seconds a card.
  
  **why it matters.** A civilian's real first night is four to six minutes of hard reading with no pause affordance they can see and a single attempt. The pitch on the home screen is off by 2–3x, and the mismatch lands exactly where trust is formed.
- **title.** Three grey fictional powers give the player nothing to be
  
  **severity.** minor
  
  **evidence.** Home: 'You are the Coalition.' Seat text: 'A maritime democracy with the world's widest alliance network and a public that changes its mind every news cycle.' Place names: Arden, Kaskad, Qorum, Vellmar, Sorrel Straits, Caldor, Vestria, Hollin Ridge. RISKS.md #6: 'which country am I'.
  
  **why it matters.** Reigns gives you a king and a dynasty; this gives you a seat that rotates daily between three beige states. Mass audiences need a character or a side to root for; a rotating abstraction with made-up geography asks them to learn a world in three minutes and then forget it.
- **title.** The dial conventions are inverted between dials and only colour tells you
  
  **severity.** minor
  
  **evidence.** Dials.tsx: PEOPLE/ARMY/ALLIES/MONEY fill paper-coloured and go red within 12 of either edge; DANGER fills blue→amber→orange→red and is fatal only when full. The About screen has to spell out 'If any of the first four hits the edge, you are out. If danger fills, everyone is.'
  
  **why it matters.** Both-edges-bad is already the part of Reigns that first-timers get wrong ('too consulted is a way to lose', PLAYTEST.md). Mixing it with a one-edge dial in the same row, distinguished only by hue, means a colourblind or hurried player cannot read the board the game refuses to explain.

**keep.**

- The engine: deterministic, seedable, bit-identical replay, serialisable mid-run state, conditions/flags/follow-ups, warning truth decided at draw time. This is the hardest thing to build and it is done and tested (316 unit tests).
- The content pipeline and validator, especially the voice contract as a lint rule (two sentences, 180 characters, 34-character choices, banned words). The discipline it enforced is why 451 cards could be rewritten in parallel without drift; it will do the same for whatever deck replaces this one.
- The prose, judged as prose. The Partner cards ('a bed, which I mention because you seem to have forgotten where it is'), the Hotline ('courtesies are remembered'), the endings' last lines ('Your Private Secretary had a note for 6:00. It said: sleep.'). This is hire-grade writing; the problem is who it is written for, not how well.
- The human cards specifically (the Partner, the daughter's birthday, the mother in hospital). They are the only moments in the deck a casual player will feel, and they point at where a wider game lives: people, not postures.
- The Danger-dial-moves-the-crisis-odds rule: a risk/reward mechanic a player can see without a single number. Keep the idea even if the crisis goes.
- Preview dots on tilt and the arrows on applied changes: the right primitive for a no-numbers interface.
- The simulator with bot policies and explicit, logged targets (N1–N5), and the Playwright harness that plays the real build from the DOM. These let you rebuild fast and prove it; most studios do not have them.
- The art direction of the result card: the paper, the serif, the red stamp, the strip's grid, the 3:00 → 6:00 axis. The craft is there; the content on it needs to be something people want to post.
- The clock as the only number on screen. The idea is right; the deck just has to obey it.
- The commercial plumbing: Stripe Payment Link → Cloudflare Worker → ECDSA-signed offline token, restore by email, PWA at 52 KB gzipped, itch zip, Tauri and Capacitor scaffolds, cookie-free analytics. None of this needs touching for a different game.
- The daily infrastructure: UTC seed, one-attempt record, streak of nights played, resumable saved run. Reusable as-is.


## A First-Time Player On A Phone Who Has Never Played A Reigns-Like, Has 90 Seconds On A Bus, And Will Never Read A Help Screen. Walked From The Home Screen Through The Intro, The First Card, A Mid-Night Card, The Crisis And The Ending Using The Four Final Harness Transcripts, Their Screenshots, And The Home/Night/Dawn/Card/Dials Source.

**verdict.** No, this does not work for a wide paying audience, and the reason is the format, not the finish. The redesign bolted Wordle's one-attempt-a-day onto a game with Reigns' learning curve: a stranger gets exactly one run of a system nobody has explained, loses it about 85% of the time (BALANCE.md: random bot 7.6% dawn, greedy 20%; 0 of 4 final harness nights reached dawn), and is then shown a 19-hour countdown or a £2.99 button. On top of that the deck was re-voiced but never re-timed, so the very first card contradicts the clock the whole pitch is built on, and the only mechanics-teaching the game has (dots on the dials) is wired to a drag gesture while the two big tap buttons, the obvious affordance on a phone, commit with no preview at all.

**problems.**

- **title.** The only attempt is the tutorial
  
  **severity.** fatal
  
  **evidence.** Home.tsx: 'PLAY TONIGHT' with 'ONE ATTEMPT · TWO MINUTES' underneath. BALANCE.md 'The night': random bot reaches dawn 7.6% (85.7% removed on a dial), greedy 20%, calm 61%; a first-timer tapping without a preview sits between random and greedy. PLAYTEST.md: none of the four FINAL harness nights reached dawn (Impeached 5:48, Midnight 5:55, The Paper at Vellmar 5:59, Forty Miles of Water 5:06). Dawn.tsx after a daily: 'TOMORROW'S NIGHT IN 19h 42m' and 'Night after night · unlock'. startDaily(): 'Tonight is already on record. Come back after midnight UTC.'
  
  **why it matters.** Wordle's one-a-day works because every player already knows the rules before they open it; Reigns works because death is a one-second restart and run three is where it clicks. BRINK takes the constraint from one and the learning curve from the other. The first impression for most new players is: lose a game you did not understand, then be told to come back tomorrow or pay. The purchase is positioned, in effect, as 'buy the tutorial'. Nothing you do to the run screen fixes this; the free player must be able to die and restart instantly until the loop is learned, and the daily should be what veterans share, not what newcomers bounce off.
- **title.** The fiction contradicts the clock from the first sentence
  
  **severity.** fatal
  
  **evidence.** dove-NIGHT-DOVE-FINAL-04-card.png: header clock 3:00 AM; card text 'Three cables were cut in the Sorrel Straits at 3:40'. hawk-NIGHT-HAWK-FINAL-08-crisis.png (clock 5:27 AM) and dove-NIGHT-DOVE-2-09-crisis.png (5:59 AM): 'Ten past eleven, the deadline is midnight' / 'It is 23:10 and the deadline is at midnight'. Balanced transcript at 3:07 AM: 'Thursday the Assembly votes'; hawk at 3:14: 'Northern Anvil starts Monday'; balanced crisis at 5:34: 'His plane lands in twenty minutes and yours already has' (the player is at a lakeside summit while, per the frame, answering a phone at 3am). Partner card at 4:10 AM: 'It's twenty past three'.
  
  **why it matters.** The entire pitch is 'It's 3am. The phone is ringing. Make it to dawn.' The 451 cards were written for a three-week crisis with weeks, Mondays, votes and summits, then re-voiced to two sentences without being re-timed to one night. A bus player does not analyse this; they feel 'this doesn't make sense' on card one and stop trusting the text, and the clock, the only number on screen and the thing you are asking them to care about, becomes decoration.
- **title.** Mechanics are taught only by a gesture most phone players will not make
  
  **severity.** fatal
  
  **evidence.** REDESIGN.md: 'Mechanics are never explained in the text. Dots on the dials do that.' Card.tsx ChoiceButtons: preview fires on onMouseEnter/onMouseLeave/onFocus; onClick commits immediately, so a tap on a phone shows no dots before the choice lands. The two 72px-tall buttons at the bottom are the largest tap targets on the screen; '← swipe →' is 10px grey mono text under them. Intro overlay (IntroSimple): 'Swipe. Keep the five dials off the edges. Make it to dawn.' Dials.tsx shows only a transient ▲/▼ flash after the fact.
  
  **why it matters.** The tap path, which is most players, plays the whole night blind: every card is a coin flip between two sentences with no visible stake, no cause is ever connected to an effect, and the night ends on a dial the player never saw move for a reason. REDESIGN's own 'done' test ('a new player understands the game from the first card without reading anything') fails for the input method the layout itself encourages.
- **title.** Card one is written for someone who already lives in this world
  
  **severity.** major
  
  **evidence.** First cards of the four FINAL runs: 'Three cables were cut in the Sorrel Straits at 3:40, eleven minutes apart, which is a very well organised anchor. The markets open in four hours on a fifth of the bandwidth.' / 'Three orders sit unsigned on your desk, Exercise Ironwood first among them.' / 'The nine o'clock news is cut two ways: the queue outside the Savings Bank, blaming the sanctions, or the harvest.' The dove run's 28 cards introduce Sorrel Straits, Vestria, Kestrel Bridge, Kaskad, Caldor, Hollin Ridge, Colonel Strand, General Holt, Vellmar and the Assembly with no map. Choices with no readable stake: 'Joint statement. My name first' vs 'Ships yes. Statement no'; 'Give the General the chair' vs 'Give the Minister the chair'.
  
  **why it matters.** The voice is genuinely good, and that is the trap: 'a very well organised anchor' is a dry joke that requires knowing anchors cut cables, and it is the first thing a stranger reads. Reigns' first card is 'the peasants are hungry' with four icons. Here the stranger has no stake signal in the text, none in the choice labels, and (see above) none on the dials unless they drag. Wit has to sit on top of legibility, not instead of it.
- **title.** The crisis is the last chapter of a novel the player has not read, and it is where careful nights die
  
  **severity.** major
  
  **evidence.** BALANCE.md N5: the crisis ends 37.7% of calm nights that reach it; the calm bot's nuclear share is 32%; 98.4% of calm nights reach it. Crisis cards in the balanced run: 'He asked about the lake door, which has none', 'Their folder is on the table', 'give me something to take home that is not a knife', 'My paper thanks the Federation first, skips the ridge', 'Stay the night, or fly at 06:40 past the cameras'. Four of five summit cards are about seating, doors and paper; the ridge and the battalion were never on screen in that run. hawk-08-crisis.png: the danger dial is orange and the header turns red with 'THE PHONE · THE CRISIS · MIDNIGHT'.
  
  **why it matters.** The single most likely story a first-timer tells is 'it was going fine for twenty cards, then I got nuked over a chair'. The climax is the one part of the night the player has least context for and the part most likely to end it. If the daily is the ad, the ad's last frame is confusion.
- **title.** Wins read as losses and losses are mislabelled
  
  **severity.** major
  
  **evidence.** dove-NIGHT-DOVE-2-11-ending.png, a 🌅 DAWN result: 'The Empty Chair at Vellmar. The summit failed. One of you left the house on the lake before dawn ... that footage will play for a decade under the word collapse.' BALANCE.md N4: this is the calm bot's most common ending at 26.1% of all its dawns. balanced-NIGHT-BALANCED-FINAL-share.png: 'The Paper at Vellmar' carries the ☢️ icon and a red NUCLEAR WAR stamp, while its text says only that both delegations went home without a paper; no war is mentioned.
  
  **why it matters.** The ending screen is the only reward and the share card is the only advertisement. If the most common win tells you the summit collapsed, and a loss is stamped NUCLEAR WAR over prose about a walk-out, neither the player nor the friend they send it to knows what happened or whether to be impressed.
- **title.** The result strip speaks a different colour language from the game it summarises
  
  **severity.** major
  
  **evidence.** Dials.tsx fillColour: mid-range fill is paper (neutral), within 25 of an edge amber, within 12 red; danger is blue below 40. share.ts OFFICE_BANDS: 41–60 is 🟨 yellow, 81–100 is 🟦 blue 'best'. dove-2 dawn strip: the ALLIES row is solid blue (81–100), a range the run screen would have shown as amber/red 'near the edge' and which ends the night at 100. balanced-12-ending.png: 60 cells, roughly 50 of them the same yellow. The text share emits five rows of ten to twelve emoji (emojiStrip), i.e. 50–60 coloured squares.
  
  **why it matters.** The strip is the whole growth loop. A player who just watched five paper-coloured tiles stay calm all night receives a wall of warning-yellow; a player whose allies dial was redlining receives a row of 'best' blue. Wordle's grid is five wide and readable at a glance in any chat; sixty emoji wrap, blur and say nothing. People will not paste it.
- **title.** 'Two minutes' is a promise the first night breaks, and the clock freezes
  
  **severity.** major
  
  **evidence.** Home: 'ONE ATTEMPT · TWO MINUTES'. FINAL runs: 28, 31, 42 and 54 cards. BALANCE.md N3 targets 2–4 minutes for a bot at 7 s per card; a human reading unfamiliar proper nouns will be slower. 87 of 451 cards are timed at 8–12 seconds with an accelerating heartbeat (Timer.tsx); balanced-NIGHT-BALANCED-FINAL-04-card.png shows a 10 s timer bar already drawn behind the intro overlay on the first card. PLAYTEST.md on the hawk run: 'the clock sat at 5:59 for the whole crisis', called 'by design'.
  
  **why it matters.** The bus player budgeted 90 seconds. A ten-second timer with a heartbeat that starts the instant they tap 'Answer the phone', on a card about Exercise Ironwood, is hostile. A clock that stops at 5:59 while cards keep arriving does not read as design to anyone outside the team; it reads as the game being stuck one minute from the win it promised.
- **title.** The home screen sells before it teaches, in jargon
  
  **severity.** major
  
  **evidence.** dove-NIGHT-DOVE-2-01-home.png / Home.tsx: 'TONIGHT · #2 · SAME NIGHT FOR EVERYONE', 'You are the Federation.' (no explanation of what a seat is or why it matters), PLAY TONIGHT, then a second card 'NIGHT AFTER NIGHT · Any night, any seat · Unlimited nights. Share a seed. Expert mode for the numbers.' with CHOOSE A SEAT OR SEED and EXPERT links and a PLAY/UNLOCK button, then ENDINGS 0/80, RECORD, SETTINGS, ABOUT. The daily seat rotates, so tomorrow the player is a different country with different advisors and start values (BALANCE: Federation 57% vs Coalition 64% calm dawn).
  
  **why it matters.** Six calls to action and a price before a single swipe. 'Seat', 'seed' and 'Expert mode for the numbers' are words from the engine, not from a player's life. Wordle's home screen is the board. And a protagonist that changes every day is one more thing a newcomer cannot build a model of.
- **title.** An interruption is treated as a forfeit (the missing Home button was the symptom)
  
  **severity.** major
  
  **evidence.** Night.tsx as shipped: the only header control is a grey dot labelled 'THE NIGHT'/'TONIGHT' that toggles a menu; the menu's exit is 'Leave the night' behind confirm('Leave tonight unfinished? It counts as played.'). The current working copy has just added a '← HOME' button and a 'Home keeps the night where it is' line, but the red Leave path still says 'End tonight unfinished? It counts as played.' store.ts does persist the run and Home offers 'Pick the phone back up', so the plumbing for a safe exit already existed; the UI never exposed it.
  
  **why it matters.** On a bus, being interrupted is the normal case, not the edge case. A first-timer who sees 'it counts as played' will believe the day is burnt, and a game that punishes putting the phone away is the opposite of a daily habit. The owner noticed the missing button; the design decision behind it (one attempt, leaving forfeits) is the real fault.
- **title.** Expert leaks into the night
  
  **severity.** minor
  
  **evidence.** hawk-NIGHT-HAWK-FINAL-08-crisis.png: a toast reading '+2 political capital' at the bottom of a screen whose promise is no numbers (store.ts:490; the phrase is on the validator's banned list in validate.ts:99). playtest-output/screens/seat-night.png: with 'A NIGHT' selected, the Federation and Coalition show 'LOCKED · Survive to Week Three once.' and 'Reach any Stand-Down or Survival ending', Expert unlock hints in night vocabulary.
  
  **why it matters.** Each leak is small, but each one is a number or a term the player was promised they would never see, and each one says 'there is a bigger, more complicated game underneath this and you are not being told about it'.
- **title.** The one rule misleads about the fifth dial
  
  **severity.** minor
  
  **evidence.** IntroSimple: 'Keep the five dials off the edges.' On the first card DANGER is a thin blue strip at the bottom of its tile (value ~20), the only dial visibly touching an edge. The clarification 'Danger full ends everything' exists only in the in-run menu nobody will open.
  
  **why it matters.** A literal reader of the only sentence the game explains will try to lift Danger off the bottom edge. The rule is the one line of the pitch and it is wrong for one of the five things it governs.
- **title.** The ending screen buries the share under two copies of the strip
  
  **severity.** minor
  
  **evidence.** Dawn.tsx order: result line and ending prose, the strip card, the moment card, the rendered share PNG (which contains the strip again), then 'Copy result' / 'Share image', then the countdown and unlock card, then Home. balanced-NIGHT-BALANCED-FINAL-12-ending.png: the first viewport ends mid-strip; the share buttons are roughly three phone-screens down. The share PNG footer reads 'brink.example'.
  
  **why it matters.** The share is the growth loop and it sits below the fold twice over, after a duplicate of itself. The moment of highest emotion (the headline) is the moment to offer the button, not three scrolls later.

**keep.**

- The engine and content pipeline: deterministic seeds that replay, hidden values that steer odds and warnings, conditions/flags/follow-ups, the validator, the simulator and the N1–N5 habit of writing targets before tuning. None of the problems above are engine problems.
- The 3am frame itself: 'It's 3am. The phone is ringing. Make it to dawn' is the right hook and the clock-as-the-only-number is the right instinct. It needs the deck to obey it, not to be replaced.
- The voice at its best, which is very good: the Partner ('There is soup, and a bed, which I mention because you seem to have forgotten where it is'), the Hotline ('courtesies are remembered'), the General ('I do not say it, I am saying they say it'), and ending lines like 'Your Private Secretary had a note for 6:00. It said: sleep.'
- The ending format: emoji + headline name + two short paragraphs + 'the moment' card with the speaker's portrait. As prose these are screenshot-worthy; the fix is matching the label to the text, not rewriting the text.
- Odds as words (Likely / Even / Risky) with the percentage shown only in the crisis, the roll overlay, and the danger-dial-to-odds link: a calm night makes the crisis kinder is a real, learnable rule that rewards the player where they can see it.
- The visual identity: paper card on navy, the serif/mono pairing, the portraits, the dial tiles with glyphs, and the share PNG's typography and red stamp. The components are handsome; it is what they say and when that is wrong.
- The friction-free commercial skeleton: free forever, no account, one purchase through a Stripe link, restore by email, PWA that works offline. Keep the shape even if what the purchase unlocks changes.
- The saved-run plumbing already in store.ts (persist on every card, resume from Home, history-aware back button): the safe way out of a night existed under the hood and should be the default, not a menu option.
- The playtest harness and transcripts: being able to see what a dove, a hawk, a gambler and a balanced player actually read is exactly how the problems above were found, and it is how the next design should be judged before a human sees it.


## Game Designer Who Has Studied Reigns, Wordle, Balatro And The Nyt Games; Judging The Core Loop (Swipe Feedback, Humour, Visible Goal And Progress, Retellable Runs, Fairness) Against The Specific Moves Those Games Make.

**verdict.** No, not for a wide paying audience, and not because of the wrapper. The night is a handsomely written Reigns clone with the feedback and the comedy removed: a swipe produces a 16px arrow and a glyph that moves two pixels, the payoff prose for every gamble is never shown, and the climax is three coin flips at a clock stuck on 5:59 that kill a third of careful players. The daily, the streak and the strip are bolted onto a loop that is not yet fun on its own, and the strip (fifty yellow squares) tells a friend nothing. The engine, the voice and the tooling are good and should survive; the loop has to be rebuilt around consequence.

**problems.**

- **title.** A swipe has no payoff: the consequence of a choice is effectively invisible
  
  **severity.** fatal
  
  **evidence.** Dials.tsx: after a decision the only feedback is a ▲/▼ glyph in the dial (one 'rise' animation) and a fill height change; a -4 on a 68px dial is under 3px. store.ts processEvents in the simple ruleset emits no text, no toast, no reaction card. RollOverlay in simple mode shows the label, HELD/FAILED and 'It went your way.' / 'It did not.' The YAML outcome prose that carries the story ('The second look shows tarpaulins, a crane and a tea urn. Maintenance.', 'The line rings for six minutes. When it is answered, the duty officer at their end has no instructions and says so.') is never emitted: RollResult (types.ts:484) has no text field and run.ts:427 reads outcome.effects/set/follow/ending, never outcome.text. Screenshot balanced-06-card.png at 4:03: red ▼ on People, green ▲ on Army, red ▲ on Danger, nothing else, and the arrows are gone before the next card is read.
  
  **why it matters.** Reigns gives every swipe a line of reaction from the world before the next card and the stat bars jump 10–20% so you see the hit. Balatro animates and names every number change in sequence. Wordle's whole game is that each guess returns a complete, unambiguous verdict. Without a readable consequence there is no learning, no 'aha', no sense the swipe mattered; the player is reading 28 paragraphs while a bar twitches. This is the single reason the owner 'still doesn't like it' and cannot say why.
- **title.** The visible goal is a clock that lies, and the climax that actually decides the night is dice
  
  **severity.** fatal
  
  **evidence.** night.ts clockMinutes caps at 5:59 (Math.min(NIGHT_END_MIN - 1, …)): the balanced run sat on 5:59 from card 42, the hawk from card ~27 of 54. REDESIGN promises '21 cards and then the crisis'; the balanced transcript has 23 pre-crisis cards and BALANCE N3 averages 28.9. BALANCE N5: the crisis kills 37.7% of careful nights that reach it and 98.4% of calm nights reach it, so the crisis is where almost every careful loss happens; the calm bot's 32% nuclear share is the crisis. Balanced transcript: danger 58 at 5:20 (the calm bot's median), five crisis cards took it 73→99 with 'Risky' and 'Even' rolls failing three times. Dove: every dial mid until 5:20, then Impeached at 5:48 inside the crisis.
  
  **why it matters.** Wordle never lets luck decide the result; Balatro shows every multiplier so a loss is a readable mistake; NYT Connections tells you exactly how close you were. Here a player plays 21 cards carefully and then a hidden-odds sequence flips coins while the clock, the only number on screen and the thing they were told to reach, stops moving. It reads as the game cheating, which is the one thing a daily people must return to cannot afford.
- **title.** The share strip is unreadable, so the growth loop the whole plan rests on is dead
  
  **severity.** fatal
  
  **evidence.** dove-share.png and hawk-share.png: five rows × ten squares, almost all yellow and orange; the viewer cannot tell which crisis it was, what killed you, or how you did relative to them. shareText for the night is 'BRINK #2 🌑 Fell at 5:48', an optional streak line, five emoji rows, a URL: 50–60 cells of five-colour information. Because 98% of careful nights reach the crisis and the clock caps at 5:59, nearly everyone's 'fell at' lands in the same 5:27–5:59 window, so there is no comparison hook. The one retellable line, the moment ('Nobody asks a pause of what.'), is truncated with '…' on the card and absent from the text share.
  
  **why it matters.** Wordle's grid works because a reader reconstructs the drama from three colours and six rows without seeing the answer (the near miss on row 3, the save on row 4), and because the number in the header is directly comparable. 'The strip is the ad' is the stated plan; this ad conveys nothing and invites no reply.
- **title.** The writing has wit but the loop never lets a joke land; there is no humour on screen
  
  **severity.** major
  
  **evidence.** Four transcripts, roughly 150 cards: the register is uniformly tired, dry and grave ('Three cables were cut… which is a very well organised anchor'). Portraits are static; no character ever reacts to what you just did. The only follow-ups arrive 2–3 cards later with no callback cue. The Partner cards ('a bed, which I mention because you seem to have forgotten where it is') are the only warmth and there are two or three per night. The outcome lines that are funny ('tarpaulins, a crane and a tea urn') are the ones never displayed (see problem 1). Ending text is good but arrives after the player has lost interest in a run they cannot read.
  
  **why it matters.** Reigns is played by millions because the king dying is a punchline and the dog, the devil and the Templar are running gags that pay off; Balatro's jokers are absurd on purpose. A wide audience needs release. BRINK is a Whitehall drama without a laugh in it, and drama with no release at 3am on a phone is homework.
- **title.** Hidden information with no tell makes odds and costs feel arbitrary
  
  **severity.** major
  
  **evidence.** Preview dots show direction in three sizes; hidden values (trust, commitment, intel) steer the odds and are 'felt, never shown' (REDESIGN). Dove transcript: 'They vote yes: even' failed, 'They give way: risky' failed; hawk: four 'risky' rolls in a row failed. The player cannot see why a roll is Even rather than Likely or do anything to change it. The red '?' for hidden costs is only explained in the Expert intro, never in the night's one-line onboarding.
  
  **why it matters.** Reigns hides magnitude but its four stats move big and the cause is always on the card. Balatro's lesson is the opposite: show everything and let mastery be arithmetic. BRINK does neither: direction shown, magnitude ambiguous, odds as words, odds driven by numbers you never see. Two 'RISKY' failures with no explanation is indistinguishable from a rigged game.
- **title.** The night has no shape: 'two minutes' is false and no day has an idea
  
  **severity.** major
  
  **evidence.** Home: 'ONE ATTEMPT · TWO MINUTES'. BALANCE N3: 3.7 minutes average; balanced run 42 cards; hawk 54 cards (six-plus minutes, PLAYTEST calls it 'by design'). Balanced transcript card order: cables → trawler → repair ship → missile track → cable recorder → radar ghost → drone chip → daughter's birthday → the moon → satellite → laser shot → observers → summit: at least seven unrelated plots in 25 cards, none resolved. false_alarm.yaml contains a proper three-beat mystery (one track → the ghost → 'the radar saw the moon rise') and the night surfaces one or two beats of it among twenty other arcs.
  
  **why it matters.** Every NYT daily is one idea you can describe in a sentence ('today's Connections had a brutal purple'). Reigns gates arcs behind years so a run has a spine. A daily with no 'today's idea' gives people nothing to talk about and nothing to come back for beyond the streak.
- **title.** Losing to dice, one attempt, and the exits are hidden
  
  **severity.** major
  
  **evidence.** Dawn.tsx render order: seed line, ending card, strip, the moment, a PNG of the same strip again, Copy/Share, the countdown and unlock offer, and Home as the last button below the fold (Dawn.tsx:175). Mid-run, '← HOME' is 11px muted mono text (Night.tsx:44), and the menu's 'Leave' confirms 'End tonight unfinished? It counts as played.' With a ~50% dawn rate (N1 target 45–65%) half of players get a loss they cannot learn from and 'Tomorrow's night in 14h 02m'.
  
  **why it matters.** One attempt per day works when winning is mostly skill and common (Wordle wins ~97% of the time) or when a loss teaches you the answer. Reigns' answer is the instant restart; death is the loop. This is the owner's 'can't easily go back to the home screen', and it is a symptom: the ending screen is built to sell and share, not to let a player who just lost to a coin flip leave or try again.
- **title.** Nothing to get better at, nothing to collect, and the meta still belongs to the old game
  
  **severity.** major
  
  **evidence.** record.png: 'UNLOCKS 0/21' lists 'DEFCON 4: Survive to Week Four once', 'Hardened NC3', 'Pre-delegation', 'Brinkmanship: Smash three antes', none reachable from the night. seat-night.png: the Federation and Coalition are 'LOCKED · Survive to Week Three once' on the night's own seat screen. Home: 'ENDINGS 0/82' is the only night-relevant meta, and 25 distinct endings appear across 5,000 calm nights (N4), 26% of them The Empty Chair. The streak counts nights played, not won.
  
  **why it matters.** Balatro's run teaches you a synergy you will want next run; Wordle's streak is mastery made visible and protected by a high win rate. Because consequences are unreadable (1) and the climax is dice (2), there is no skill curve, so there is nothing a progress system could even measure. The leftover Expert unlocks make the whole app look unfinished to a newcomer.
- **title.** Five near-identical dials; the one that matters looks like the other four
  
  **severity.** minor
  
  **evidence.** Dials.tsx: five same-size squares with a line-icon and a fill; the fill colour only changes within 25 of an edge. dove-04-card.png at 3:00: four dials at ~50–60% and Danger at 20% look like the same component. REDESIGN says the Danger dial is 'the crisis's luck', yet it is drawn identically and the rule linking it to the crisis odds is explained nowhere on screen.
  
  **why it matters.** Reigns' four icons are memorable objects and a bar at 90% is unmistakable. If the Danger dial is the strategic heart of the night it needs to look and behave like it.
- **title.** Proper nouns and real names on every card contradict the spec and tax a newcomer
  
  **severity.** minor
  
  **evidence.** Card.tsx simple mode prints the role and then the name (CHANCELLOR ANSELM ROKE, DR TEODORA VANCE, GENERAL OREN VASSKA) although REDESIGN says 'names only in the compendium'. The balanced transcript names Arden, Kaskad, Qorum, Vellmar, Caldor, Hollin Ridge, Vestria and the Sorrel Straits; a first-time player cannot tell ally from rival from third power.
  
  **why it matters.** Each unfamiliar noun is a half-second of friction on a card that is supposed to be read in five seconds; across 28 cards it is the difference between 'I get it' and 'I don't know what's going on'.

**keep.**

- The voice and the validator that enforces it: two sentences, concrete nouns, no jargon ('a very well organised anchor', 'a bed, which I mention because you seem to have forgotten where it is'). This is better prose than Reigns ships.
- The deterministic engine: seeds that replay, flags, follow-ups, warnings with true/false branches, hidden values, odds, forced endings. It is more capable than what Reigns runs on; it is under-used, not wrong.
- The three-beat mini-mystery shape in false_alarm.yaml (one track → the ghost → 'the radar saw the moon rise') and the summit/midnight/line-at-sea sequences: this is the spine a night should have, surfaced whole instead of shuffled.
- The outcome prose already written for every gamble (success and failure lines). It is the best writing in the game and is currently never displayed.
- Ending names as headlines plus the 'moment' card ('Impeached', 'Forty Miles of Water', 'The Paper at Vellmar', 'The moment the House stopped listening'): the right retelling hook, currently buried and truncated.
- The drag/tilt card with preview dots on the dials: correct Reigns mechanics, well implemented.
- The idea that the Danger dial moves the crisis odds: a single rule a player can hold in their head. Keep the rule, make it visible.
- Infrastructure: UTC daily seed with seat rotation, streak storage, PNG share card renderer, Stripe one-time unlock and Worker, PWA build, Playwright harness that reads the DOM like a player, simulator with bot policies and the N1–N5 target discipline.
- The share card's visual design (paper, red stamp, big clock, brand line): attractive; it needs readable content, not a new look.


## Mobile Ux Reviewer: Navigation, Hierarchy, Tappability, Text Density, Onboarding, Dead Ends, Leaving Mid-Run, The Share And Unlock Moments

**verdict.** Card by card, the night is the best thing you have built: the voice is sharp, the card is big and legible, and the save-and-resume plumbing is solid. The frame around it fails a phone player at every transition: the first card can be a ten-second quiz under two overlapping overlays, the dials read backwards (a full bar looks strong when it means you are about to fall), the only consequence-teaching mechanism never fires for people who tap, the result screen buries Share and Home two screens down and cannot be reopened, the climax is an ellipsis with a "Leave" button, and the one purchase has no price on any screen. This is not a game a wide audience will finish, share or pay for yet, and almost none of that is the engine's fault.

**problems.**

- **title.** Home is a 26px grey label on the run screen and the last of six buttons on the result screen; the result screen itself has no header
  
  **severity.** fatal
  
  **evidence.** Night.tsx header: `← HOME` is 11px mono, text-mute (#7c8b9a on navy), px-1 py-1, so the hit area is roughly 60×26px against a 44pt minimum, and it looks like a caption, not a control. Dawn.tsx has no header at all; `Home` is the final `btn` after the ending card, the strip, the moment, a 4:5 PNG of the same thing, Copy/Share, and the unlock box. In the 1082×2202 full-page captures (dove-10-ending.png, hawk-10-ending.png, balanced-12-ending.png) the buttons are below the bottom edge; at a 915px viewport Home sits past ~1950 CSS px, more than two screens down. The e2e test literally says "Every other screen has Home at the top left" and skips the ending screen.
  
  **why it matters.** This is the owner's exact complaint and the data agrees. In a daily game the loop is play, look, share, leave. If leaving is hard, people close the tab, and closing the tab here destroys the result (next item).
- **title.** The Dawn screen is a one-shot dead end: leave it and tonight's ending, moment and share card are gone for good
  
  **severity.** fatal
  
  **evidence.** store.ts finishRun(): `remove(RUN_KEY)` runs before `goto('ending')`, so the ended run exists only in memory. Home.tsx when `played` shows a one-line result, the ending name at 10px uppercase, and a mini-strip with 8px labels; there is no button to reopen the ending and no Copy/Share on Home. Close the tab on the Dawn screen, or tap Home, and the only screenshot-able surface the design says is "the ad" cannot be reached again until tomorrow.
  
  **why it matters.** The share is the growth channel. Any player who reads the ending, puts the phone down, and comes back to share has nothing to share. Wordle lets you re-share today's result from the home screen forever.
- **title.** Dials read backwards: a full bar looks strong when it means you are about to fall
  
  **severity.** fatal
  
  **evidence.** Dials.tsx fills a vertical box from the bottom; for People/Army/Allies/Money both 0 and 100 are fatal but the visual grammar is a progress bar. hawk-08-crisis.png: ARMY is ~70% full and tinted amber because `edge <= 25`; a new player reads "army strong". The intro says "keep the five dials off the edges" without ever saying what an edge is or that the top is one. DANGER alone is a normal fill-equals-bad bar, so two incompatible grammars sit side by side in the same row. The ALLIES glyph is a hash grid; MONEY is a currency-like squiggle; neither is readable at 32px.
  
  **why it matters.** The entire rulebook is "keep the dials off the edges". If the dial cannot be read, the one rule cannot be followed, and every loss feels arbitrary.
- **title.** The only consequence-teaching mechanism (dots on the dials) never fires for players who tap
  
  **severity.** fatal
  
  **evidence.** REDESIGN.md: "Mechanics are never explained in the text. Dots on the dials do that." Card.tsx/Dials.tsx show the preview dots only during a drag or on `onMouseEnter`/`onFocus` of ChoiceButtons. Touch has no hover; a tap on a 72px choice button commits instantly with no preview. The buttons are large, labelled, and sit directly under the card, so most phone players will tap. Your own e2e helper plays the whole night by tapping `Right:` buttons and never sees a dot.
  
  **why it matters.** A tap player never learns what any choice costs, so the game is a coin flip with good prose. Reigns works because the drag is the only input; here you offered a second input and forgot to teach through it.
- **title.** The unlock has no price anywhere in the app
  
  **severity.** fatal
  
  **evidence.** Home.tsx: `Unlock`. Dawn.tsx: `Night after night · unlock` as a plain grey `btn`, visually identical to the `Home` button under it. Paywall.tsx: "ONE-TIME PURCHASE" and "Unlock for one payment". `grep -rn "2\.99\|3\.99\|price" src/` finds no price string in the UI; REDESIGN.md says £2.99/$3.99. The player must click through to a Stripe page to discover what "one payment" means.
  
  **why it matters.** An impulse price only works if it is visible at the impulse. Hiding it turns a £2.99 tap into a leap of faith and kills conversion on the one screen (Dawn) where the offer is supposed to land.
- **title.** The shared strip cannot be read by the person receiving it, and the headline result is the smallest text on the screen
  
  **severity.** fatal
  
  **evidence.** share.ts emojiStrip: 5 rows × 10 emoji = 50 coloured squares with no row labels, where 🟩 on row 5 (Danger, inverted) means the opposite of 🟩 on rows 1–4. Text head for a nuclear night is `BRINK #12 ☢️ 5:59`, an emoji and a time with no verb. On screen (dove-10-ending.png) "FELL AT 5:48" is 11px amber mono above a 30px ending name; the share card PNG is a different layout again (10 columns vs 12 on screen) and truncates the moment mid-sentence: "our laser on Caldor has clear sky and…". The e2e asserts only that the text has ≥7 lines.
  
  **why it matters.** Wordle's grid encodes the score in its shape; every BRINK result is the same 10×5 rectangle of mostly yellow. A recipient cannot tell a good night from a bad one, so the strip does no marketing.
- **title.** Onboarding: the first card can be a ten-second timed card, shown under two overlapping overlays, and the intro never explains the rule it states
  
  **severity.** major
  
  **evidence.** balanced-03-intro.png: the dimmed "TONIGHT 3:00 AM THE PHONE IS RINGING" banner (z-50) sits under the intro sheet's dim (z-52) while a timer bar reads `10s` at the right; the first card ("Three orders sit unsigned…") is a timed card. The moment the player taps ANSWER THE PHONE they have ten seconds to read two sentences, two choices, and five unlabeled dials for the first time, with a heartbeat accelerating. IntroSimple says "Swipe." while two tap buttons and a "← swipe →" hint are also on screen. `settings.seenIntro` is global and never shows again, even for someone back after a month. The actual rules (both edges are fatal, danger ends everyone, calm helps the crisis) live only in About and behind the run-screen menu.
  
  **why it matters.** A daily lives or dies on first-night completion. The design doc's own done criterion is "a new player understands the game from the first card without reading anything"; this screen does the opposite.
- **title.** The start and crisis banners cover the speaker's name on the card for 1.4–2.2 seconds
  
  **severity.** major
  
  **evidence.** App.tsx Banner is `fixed top-[18%]`, exactly where the card header is. dove-04-card.png: "Your Chancellor" is hidden under the TONIGHT banner; hawk-08-crisis.png: "Your Private Secretary" is hidden under the red THE CRISIS banner, whose sub-line reads "5:27 AM · MIDNIGHT", two different times in one line (the clock and the flashpoint's name).
  
  **why it matters.** Who is speaking is the first thing a card must communicate; the game hides it at the two moments that matter most.
- **title.** The climax is an ellipsis and a "Leave the night" button, and tapping it loses the ending
  
  **severity.** major
  
  **evidence.** store.ts finishRun() sets the run to ended, then waits 900ms + 1500ms (nuclear) or 500ms before `goto('ending')`. Night.tsx renders `if (s.phase === 'ended' || !v) return <… > <button onClick={abandonRun}>Leave the night</button>` during that gap, so the shake and the nuclear sound play over an empty screen with an escape hatch. abandonRun() nulls the run and goes Home; the daily record is already saved, so the player gets the mini-strip but never reads the ending they just earned.
  
  **why it matters.** Every lost night ends on a placeholder. The one dramatic beat the game has is spent on a layout fallback.
- **title.** The clock pins at 5:59, so most crisis deaths read "Fell at 5:59" and lie about how close you were
  
  **severity.** major
  
  **evidence.** night.ts clockMinutes() caps at NIGHT_END_MIN − 1. PLAYTEST.md: "the clock sat at 5:59 for the whole crisis… by design"; the hawk night ran 54 cards, so the only number on screen stopped moving for its last stretch. balanced-12-ending.png and its share card both headline "5:59 FELL / NUCLEAR WAR". The Home promises "ONE ATTEMPT · TWO MINUTES"; the four bot transcripts are 28, 31, 42 and 54 cards with 3–6 rolls at up to 4 seconds each, i.e. three to six minutes.
  
  **why it matters.** "One minute from dawn" is the most shareable result the game can produce, and it will be the most common and the least true. The two-minute promise on Home sets up the same disappointment.
- **title.** "End tonight unfinished? It counts as played" is false; the one-attempt daily can be restarted from the menu
  
  **severity.** major
  
  **evidence.** Night.tsx menu Leave → `confirm('End tonight unfinished? It counts as played.')` → abandonRun(). abandonRun() removes the saved run and never calls saveDailyRecord, so daily.ts dailyPlayed() stays false and Home shows "Play tonight" again. Separately, Timer.tsx resets to the full count on remount, so leaving to Home (or a reload) on a timed card refunds the timer.
  
  **why it matters.** Either the copy lies to honest players or the rule is void for curious ones. For a shared daily with streaks, the integrity of "one attempt" is the product.
- **title.** Expert vocabulary leaks onto the free night's screens
  
  **severity.** major
  
  **evidence.** hawk-08-crisis.png shows a "+2 political capital" toast during the night; store.ts processEvents `case 'capital'` is not gated on `simple`, and "political capital" is on REDESIGN's banned list. Stats.tsx shows every free player STAND-DOWNS, TIMERS EXPIRED, EXPERT GAMES, LONGEST EXPERT GAME and MOST FATAL DOCTRINE; record.png also lists unlocks named Hardened NC3, Pre-delegation, Launch on Warning, DEFCON 4. Compendium.tsx groups endings under STAND-DOWN / SURVIVAL / REMOVED / NUCLEAR WAR / SPECIAL. Card.tsx prints the speaker's real name under the role on every card (CHANCELLOR ANSELM ROKE) although the design says names belong in the compendium only.
  
  **why it matters.** The whole point of the redesign was one register. Every leak tells a casual player there is a bigger, harder game they are not understanding.
- **title.** "ENDINGS 0/82" on Home opens a 43,000-pixel wall of redactions
  
  **severity.** major
  
  **evidence.** endings.png is 1082×43202: roughly fifty phone-screens of identical `▒▒▒▒▒▒ / Not yet witnessed.` rows, with a `0% COMPLETE` bar at the top and, when unlocked, the Expert Posture pieces underneath. It is one of the four nav buttons on Home and the first thing a curious new player will tap after the Play button.
  
  **why it matters.** A brand-new player's second screen tells them there are 82 things they have not done. That is a wall, not a hook.
- **title.** The purchase flow leaves the app and can strand the token in the wrong browser; the restore path is two hops and the error copy points to the wrong screen
  
  **severity.** major
  
  **evidence.** Paywall.tsx: `<a href={stripeLink}>` with no target. Installed as a PWA on iOS, that opens Safari; Stripe redirects to `/unlocked` in Safari, whose localStorage is separate from the home-screen app, so the app stays locked. Unlocked.tsx error copy says "use Restore purchase in Settings", but Settings.tsx only has a Restore button that bounces back to the Paywall screen where the email field actually is. The email input is 14px (iOS zooms on focus under 16px; you have suppressed that with `maximum-scale=1`, which also removes pinch-zoom for everyone).
  
  **why it matters.** The one time a player hands you money is the one time the flow must not lose them. This one can, and the recovery copy is wrong.
- **title.** The rulebook and the leave controls hide behind an unlabelled dot, and the menu shoves the board down instead of overlaying it
  
  **severity.** major
  
  **evidence.** Night.tsx header right: `TONIGHT ●` / `THE NIGHT ●`, 11px mono, muted, a label with a dot; nothing says it is a button. Tapping it inserts an inline `paper-dark` panel above the dials, pushing dials, card and choices down. The panel holds the only in-run rules text plus three equal-weight buttons: Back to the phone / Home / Leave (Leave is red text in a grey button, then a native `confirm()`).
  
  **why it matters.** The owner could not find the way home because the way home is disguised as a status label.
- **title.** Text density: a dozen label sizes under 12px and three renderings of the same strip on one screen
  
  **severity.** minor
  
  **evidence.** Home strip labels `text-[8px]`; dial labels 9px; nearly every caption 10px with 0.14–0.3em tracking; `← HOME` 11px; footer PRIVACY 10px. Dawn.tsx shows the strip as DOM cells (12 columns), again inside the PNG preview (10 columns), and again as emoji when copied; the ending text, the moment card and the PNG repeat the ending name and the moment three times. The seat screen's STRONG/EXPOSED lines are 10px mono.
  
  **why it matters.** Small muted mono reads as decoration, so players skip it; and the things being skipped are the result, the labels and the navigation.
- **title.** Inconsistent button semantics: red means destructive everywhere except where it means "play again"
  
  **severity.** minor
  
  **evidence.** Dawn.tsx in night mode: `Another night` is `btn-danger` (solid red) while `Copy result` is `btn-primary` (white) and `Home` and the unlock are identical grey `btn`s. Night.tsx: `Leave` is red text in a grey button. Home.tsx: the resume button for a saved non-daily run is also `btn-danger`.
  
  **why it matters.** Players learn one colour grammar per app. Red-to-continue and grey-to-pay is the wrong way round.
- **title.** Home copy and state do not match the player's situation
  
  **severity.** minor
  
  **evidence.** "You are the Federation." in red is the first thing under TONIGHT and means nothing to a newcomer; REDESIGN says the seat is named on the ending only. If yesterday's night was left half-played and the date rolled over, Home shows today's number and today's seat while "Pick the phone back up" resumes yesterday's night on a different seat. After playing, the streak line only appears at ≥2 and there is no share action on Home.
  
  **why it matters.** Home is the screen people see every day; every mismatch there is a daily reminder that the game is not quite looking after them.

**keep.**

- The card voice and the speakers: two sentences, concrete, funny without jokes ("a very well organised anchor", "a bed, which I mention because you seem to have forgotten where it is"). This is the asset.
- The physical card: 20px serif on paper, large portrait, role as the headline, two 72px tap buttons plus drag with tilt and resistance, choice text revealed as a stamp. Nothing to redesign here except where the dots appear.
- The save-on-every-card plumbing and history handling in store.ts: a night left mid-card resumes exactly, the browser/phone back button walks back to Home without ending the run, and the daily is filed under its seed's day.
- The share PNG card: big clock, rotated stamp, moment line, strip with labels. It is the most finished surface in the app and the right template for the on-screen result.
- The visual identity: navy, paper, mono caps, CRT scanlines, dial-edge red pulse. Coherent and distinctive; keep the palette and type, fix the sizes and the grammar.
- The roll overlay's language (HELD / FAILED, "Held by a hair.", "It did not.") and its no-numbers-except-in-the-crisis rule.
- Clock as the only number, as a principle. Fix the cap, keep the idea.
- Accessibility groundwork: aria labels on dials, choices, timer and the roll dialog; reduced-motion and mute settings; keyboard arrows commit choices.


