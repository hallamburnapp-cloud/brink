# REDESIGN.md — BRINK, the daily night

This document replaces the player-facing design. The engine, content pipeline and
production tooling stay; what the player sees, reads and does is rebuilt for one
audience: everyone with a phone and two minutes. The previous design (leverage,
antes, the shop, pieces, accidents) is kept as **Expert**, behind the unlock, for the
people who want it. Nothing below refers to it again except to say what was removed.

## The pitch, in one breath

It's 3am. The phone is ringing. Swipe left or right, keep five dials off the edges,
and make it to dawn. Everyone in the world gets the same night. Share how far you got.

## The one rule

**Keep the dials off the edges until 6:00am.** Five dials: **People**, **Army**,
**Allies**, **Money**, **Danger**. A dial that empties or fills ends your night;
Danger full ends everyone's. That is the entire rulebook, and it is the first and
only thing the game explains.

## The night

- A night is **21 cards and then the crisis**, 3:00am to 6:00am. Every card is seven
  minutes of the clock; the clock is the only number on screen.
- The last stretch (from about 5:20am) is the **crisis**: a short, escalating
  sequence with visible odds. Making it through is dawn.
- The danger dial is the crisis's luck. Arrive at 5:20am with it half full and the
  odds are as written; empty, and every roll of the crisis is a fifth more likely to
  go your way; full, a fifth less. The odds words on the choices already say so, so
  a calm night is rewarded where the player can see it and nothing has to be explained.
- Reaching 6:00am is a win. The dials at dawn pick which dawn you get (a quiet one,
  a wary one, a hollow one). Losing gives a named ending too. Every ending is
  short enough to read in ten seconds and good enough to screenshot.
- Same night for everyone (UTC date seed, seat rotates daily). One attempt. The
  result is a strip of emoji, one row per dial, one column per twenty minutes,
  plus the time you fell or **DAWN**. Streak counts nights played, not won.

## What the player sees

- **Home**: the mark, the date, one big **Play tonight** button, your streak, and
  yesterday's strip if you played. Below it, quietly: **Night after night**
  (the unlock), Endings, Record, Settings.
- **Run**: the clock, five dials as filled glyphs with no numbers, the card (who is
  speaking as a role, two sentences at most), two choices. Dragging tilts the card
  and shows dots on the dials that will move. A thin timer bar on the few timed
  cards. Nothing else on screen. No score, no capital, no bars, no percentages
  except on the crisis cards, where a single line reads "Risky: 60% it holds".
- **Ending**: the time on the clock, the ending name, two short paragraphs, the
  strip, **Copy result**, and either "Tomorrow at midnight UTC" or, with the unlock,
  **Another night**.
- **Onboarding** is one line over the first card: "Swipe. Keep the dials off the
  edges. Make it to dawn." Nothing else.

## The voice (every card, every ending)

Plain English a tired person can read in five seconds. Wit, not jokes. Concrete
and human. This is the contract the validator enforces:

- Card text: **at most two sentences, at most 180 characters**. First sentence is the
  fact; second is the pressure. No third.
- Choices: **at most 34 characters**, imperative, no ellipses.
- Speakers are shown by **role** ("Your General", "Your Spin Doctor", "The Hotline",
  "Your Partner"), names only in the compendium. Roles in `speakers.yaml` are the
  display line; write to them.
- **Banned words** (they are the wall): NC3, DEFCON, predelegation, escalation
  dominance, attribution, kinetic, doctrine, deterrence-by-denial, leverage, ante,
  political capital, commitment trap, security dilemma, intel reliability, assess
  with confidence, salvo, SIGINT, ELINT, TEL, ISR, CONOPS, and any acronym a
  newspaper would spell out. Say "the missiles", "the radar", "our spies", "the
  markets", "the generals".
- Fictional names stay fictional. Places and people already in the world stay
  (Sorrel Straits, Caldor, Vestria, Amberline, the Compact, Varga, Vasska), but a
  card must make sense to someone who has never heard of them: "the Straits" is
  fine; a sentence that only works if you know last week's card is not.
- Numbers as people say them: "four ships", "six minutes", "half the country".
- Endings: **at most two paragraphs, at most 420 characters**, a name that is a
  headline, an emoji. The "moment" card stays.
- Mechanics are never explained in the text. Dots on the dials do that.

## What is removed from the player's view (kept in the engine for Expert)

Leverage lines, the tally, the ante bar, political capital, the shop, pieces, orders,
accidents and their odds strip, the score, the best score, the act names and week
banners, the DEFCON tiers, "The Republic / Federation / Coalition" as a choice (the
seat rotates daily and is named on the ending only). Hidden values still exist and
still steer odds and warnings; they are felt, never shown.

## Modes

| Mode | Who | What |
| --- | --- | --- |
| **Tonight** (daily) | everyone, free | the shared night, one attempt, the strip, the streak |
| **Night after night** | the unlock | unlimited nights on any seat, the last thirty dailies, seeds to share |
| **Expert** | the unlock | the previous game: leverage, antes, shop, endless escalation |

## Money

Free daily forever. One purchase, **Night after night**, at an impulse price
(£2.99 / $3.99), through the existing Stripe Payment Link and Worker, restore by
email, no account. The daily is the marketing: the strip is the ad, the streak is
the habit, the locked "Another night" button on the ending screen is the offer,
shown once per night and never nagged. App-store builds (Capacitor) sell the same
unlock as an in-app purchase later; the web build ships first.

## Difficulty

One difficulty. A night is calibrated so that a careful player makes dawn about
half the time and a careless one falls around 4:30am: the simulator's calm bot
should reach dawn 45–65% of the time and the random bot under 10% (the first draft
of this file said 30–45% for the calm bot; a daily that people come back to is one
they win about half the time when they play carefully, and the bot reads the dials
better than a person will, so its band sits above a person's; BALANCE.md "The
night"). Tuned with the existing knobs (cooling, cost scale, escalation scale, the
danger-to-odds link, card numbers), never by explaining more.

## Fiction

Unchanged in substance: three fictional powers, the Straits, the Compact, the
advisors with their agendas. What changes is the register: from Whitehall memo to a
person telling you what is happening at 3am, briefly, because there is no time.

## What "done" means

- A new player understands the game from the first card without reading anything.
- A night takes two to four minutes.
- The result strip is something a person would post.
- Nothing on the run screen is a number except the clock.
- All 451 cards and 92 endings pass the voice contract.
- The simulator's calm bot reaches dawn 45–65% of the time, the random bot under 10%,
  and the crisis ends 25–45% of the calm nights that reach it (BALANCE.md N1–N5).
