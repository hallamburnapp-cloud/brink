# PLAYTEST.md — real runs in a mobile browser

The harness (`tools/playtest.ts`) drives the shipped game in a Pixel-7-sized Chromium
through the DOM only, using what a player sees: the card text, the two choice lines, the
odds (a word in the night, a percentage in Expert), the preview dots, the dial fills or
meter bars and the clock or HUD. It plays with a named decision style, buys in the shop, and writes
a transcript and screenshots to `playtest-output/` (git-ignored; the transcripts
quoted below are kept under `docs/playtests/`). Motion and sound are on; the e2e
suite is the one that emulates reduced motion.

Styles: **dove** takes the calmer line and buys de-escalation; **hawk** takes the
firmer line and buys leverage; **balanced** reads the preview dots and protects the
lowest meter; **gambler** takes every roll it can and the higher leverage.

## The night

`npx tsx tools/playtest.ts --game night --style <dove|hawk|balanced|gambler> --seat <seat> --seed <seed> --static`
drives the redesigned game the way a person sees it: five dial fills, the preview dots, the
odds as words (Likely / Even / Risky), the clock. The four styles are the Expert ones with
their shop logic idle: the dove takes the calmer line, the hawk the firmer, the balanced
style protects the lowest dial, the gambler takes every roll. They are cruder than the
simulator's calm bot (BALANCE.md "The night"), which reads the same dots but weighs them,
so their results sit between the simulator's greedy bot (20% dawn) and its calm bot (61%).
Transcripts, share cards and three screenshots are under `docs/playtests/night/`.

| Run | Seat | Style | Result | Ending | Cards | Rolls | Danger at 5:20 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NIGHT-DOVE-FINAL | Republic | dove | 🌑 Fell at 5:48 | 🏛️ Impeached (people at the edge in the crisis) | 28 | 3 | 51 |
| NIGHT-HAWK-FINAL | Federation | hawk | ☢️ 5:55 | 🕛 Midnight (two failed rolls at full alert) | 54 | 5 | 67 |
| NIGHT-BALANCED-FINAL | Coalition | balanced | ☢️ 5:59 | 📝 The Paper at Vellmar (the summit walked out at danger 99) | 42 | 6 | 58 |
| NIGHT-GAMBLER-FINAL | Republic | gambler | ☢️ 5:06 | 🌊 Forty Miles of Water (before the crisis) | 31 | 4 | — |

Earlier runs on the same build with the pre-final rules: NIGHT-DOVE-2 (Republic) and
NIGHT-HAWK-3 (Federation) both reached 🌅 Dawn through The Empty Chair at Vellmar.

### What the four nights say

**The voice works on a phone.** Every card in the four transcripts is two sentences a tired
person can read in five seconds, the choices read as two different actions ("Halt trading.
Call it maintenance" / "Open the markets on time"), and the speakers sound like people:
the Chancellor's "a very well organised anchor", the Partner's "a bed, which I mention
because you seem to have forgotten where it is", the Hotline's "courtesies are remembered".
Nothing on any screen was a number except the clock (`08-crisis.png`).

**The crisis is where careful nights end, as the simulator said.** The dove kept every
dial mid until 5:20 and then lost the people dial in the crisis (an Impeached, not a
nuclear war); the balanced run arrived at danger 58, the calm bot's median, and the
summit's five cards took it 73 → 99 with one roll lost. Those are the "crisis kills 38%
of arrivals" nights in person. What a human will see that the bots do not: the danger
dial going red card by card through the crisis with the odds words turning to RISKY.

**The hawk's 54 cards is the longest night the harness has produced** (the sim's average
is 29): a firm line keeps opening follow-ups, so the clock sat at 5:59 for the whole
crisis. The clock capping at 5:59 is by design; a hawk's night lasting six minutes rather
than four is the pace target's edge (N3 measures the average, not the tail).

**The gambler fell at 5:06 on a blockade it had fed all night**: every roll taken, danger
at 97 by 4:45, and Forty Miles of Water before the crisis came. A careless night ends on a
dial, as the random bot's 86% says.

### What to do with this

1. Nothing in the rules before humans play. Four bot nights are four; the simulator's
   15,000 pass all five targets, and the harness styles are meant to be crude.
2. If human dawn rates come in under 30% (LAUNCH.md §7), the first lever is the crisis's
   own escalation values on the flashpoint cards (a +15 per card through the summit is what
   turned 58 into 99), not the act scales.
3. The e2e suite (tonight end to end on a phone, the dawn screen's unlock offer, the unlock
   flow, a tampered token, restore by email) is green on the final content.

---

## Expert

Everything below is the Expert game, which the harness plays without `--game night`.

## Runs

| Run | Seat | Style | Days | Cards | Ending | Score | Pieces bought |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PT-DOVE-1 | Republic | dove | 21 | 61 | 🏢 Consulted (removed: allies 100) | 1,642 | Allied Basing Rights, Trade Desk, Ambassador, Commercial Satellite Deal, Fortress |
| PT-HAWK-1 | Federation | hawk | 9 | 34 | 💥 Harrow Vale (nuclear, forced by the Intercept flashpoint) | 625 | none (4 PC at the only shop; nothing it wanted was affordable) |
| PT-BAL-1 | Coalition | balanced | 16 | 44 | 🏢 Consulted (removed: allies 100) | 1,508 | Peace Movement Leader, Cautious Intel, Allied Basing Rights, The Courier |
| PT-GAMB-2 | Republic | gambler | 9 | 49 | ⚓ Not Ordinary (nuclear, forced by the Line at Sea flashpoint) | 919 | Alliance First |

Earlier in the night, before the balance pass: hawk-SCALE1 (Republic, 40 cards, ended
Day 11 on the fallback ending because no endings existed yet) proved the loop in the
browser: leverage lines, the tally, the mid-act shop, an accident roll at escalation
50+ and the Week Two target banner.

### PT-DOVE-1 — the dove is consulted into a protectorate

The Republic, quarantine of the Straits on card one. The dove asked what "military
character" meant (15 leverage instead of 36), called it a dispute over inspections,
slept for two hours when Jonah asked, halted trading and called it maintenance. By the
first shop it had 4 PC and bought Allied Basing Rights, then Trade Desk, the
Ambassador, the Commercial Satellite Deal and Fortress: a coherent alliance build,
assembled by a bot that only reads the shop cards' first lines.

Week One's ante (250) was met at 292; the Line at Sea flashpoint was survived with
one Boarding roll held at 55%. Week Two's ante was **missed by 21 (429 / 450)**: the
BLUFF CALLED banner, Roke's "markets have decided you will not do what you said",
then Midnight, where "They hold: 25%" failed and the guns walked toward the
battalion. Escalation never passed 52. Week Three opened at 1,214 score with 5 PC;
the run ended on Day 21 when the allies meter reached 100: **Consulted**, the
protectorate ending ("every hour you spent making sure the allies were consulted was
an hour in which they learned they did not have to ask"). Score 1,642, a new local
best. Six rolls, seven timed cards, no accident ever fired.

What felt great: the near miss on the Week Two ante is the best moment of the run.
The bar was red all week, the total landed 21 short, and the bluff card that followed
was *about* the miss. The ending is a direct consequence of the build, not of a
meter drifting. What felt flat: the dove never saw the top of the curve, so the tally
never slammed; its biggest single choice was 134.

### PT-HAWK-1 — the hawk launches on Day 9

The Federation. The hawk flew the replacement satellite and said nothing, told the
Compact's parliament "yes", and walked into the Week One flashpoint, The Intercept,
at escalation 28 with military 68. It released the interceptors (55%: failed, rolled
98), answered the inert impact with an inert package of its own ("They swallow it:
25%": failed, rolled 87), and when two tracks appeared with nine minutes on the clock
it took the 104-leverage side, **Launch the response**, over "Intercept. Only
intercept." (78). Harrow Vale. Nine days.

What felt great: the flashpoint is a real sequence with rising stakes and the
ending is earned by three consecutive decisions; the "moment" card is the nine-minute
card. What felt off: a first-time hawk can end the game on Day 9 without ever seeing
a shop between acts. The sequence is fair (the calmer side was available and printed
its leverage), but the odds on the package (25%) read as a trap. Logged for the
content pass: the package roll is printed at 25% only because trust was on the floor
(base 0.5, adversary rolls carry ±25% from trust); the sequence is the hawk's own bill.
Kept. Watched under RISKS.md assumption 5.

### PT-BAL-1 — the balanced Coalition is consulted away in sixteen days

The Coalition, balanced style: it reads the preview dots and protects whichever meter
is lowest. It bought the Peace Movement Leader at the first shop, then Cautious Intel
and Allied Basing Rights, then the Courier: a stand-down build with an alliance piece
in it. Week One's ante was met; the Line at Sea flashpoint passed with a failed Boarding
roll that cost military rather than the run; "It holds: 76%" failed on a 98 in Week Two,
and "They sign: 50%" failed on a 91. Allies climbed from 46 to 96 in thirty-two cards,
because every alliance card's safer side is the consulted side, and the run ended on
Day 16 with the same ending as the dove's: **Consulted**. Score 1,508.

What felt great: the build was legible by the second shop and the two failed rolls
were read as bad luck, not as the game cheating (both were printed, both were above
50%). What felt flat: the balanced bot never looked at the top edge of a meter, and
neither did the dove; two of four runs ended by *allies 100*, which the simulator's
heuristic hits in 0.2% of runs because it guards both edges. The meter turns red within
12 of either edge, so a human sees it coming; a first-time player may not know that
"too consulted" is a way to lose. Logged: the first-run standing orders should say so
in one line.

### PT-GAMB-1 — the gambler clears the Straits

The Republic, gambler style: every roll it can take and the higher leverage. Alliance
First at the first shop. "Strike: 60%" held by 4 (the near-miss line reads "Held by
4%"), then the Line at Sea: Boarding held, the Kestrel across the freighter's bow at
escalation 85 (396 leverage on one card), and "They blink" at 25% failed. The
percentage was 25 and not 50 because the gambler had spent the rival's trust to the
floor in Week One, and adversary rolls carry ±25% from trust: the card printed the
consequence of nine days of choices. Vasska asked for ninety minutes to clear the
Straits; the torpedo was **Not Ordinary**. Day 9, score 919, best single choice 168.

An earlier gambler run (PT-GAMB-1) reached the same flashpoint at escalation 91 with
547 leverage on the table and ended the same way; the harness lost its ending screen to
a page reload and the run is recorded only by its best score (2,026). What felt great:
the tally at 396 and 547 is the slam the dove never heard. What felt off: nothing in the
sequence was unfair, but the two aggressive styles both died on Day 9 without a second
shop, so the aggressive newcomer's first run is short. Reigns-short, with an instant
restart; kept, and watched (RISKS.md assumption 5).

## What the runs changed

- **Flashpoint numbers** (BALANCE.md iteration 1): the first hawk smoke run and the
  simulator traces showed the Line at Sea sequence had no survivable path from a
  healthy state; every flashpoint's visible-meter swings were rescaled before these
  runs.
- **The fallback ending screen** now prints days and score, so a run without a
  matching ending is still a readable record (found when the e2e daily spec hit it).
- **The e2e helper** waits for the choice buttons to re-enable instead of spending its
  step budget on the tally animation, resumes after a hot reload, and the config
  emulates reduced motion so a full run fits the test budget.
- **The playtest harness** exits when the transcript is written (it used to hang on the
  dev server's shell wrapper).

## e2e

`npx playwright test` (Pixel 7 viewport, reduced motion, stubbed unlock Worker):

| Spec | Result |
| --- | --- |
| Daily run: plays a full daily run on a phone, shares, offers an instant restart | pass (1.5 min) |
| Daily run: replay this seed reproduces the first card | pass (39.7 s) |
| Unlock flow: Endless is locked, then unlocked after the Stripe redirect | pass |
| Unlock flow: a tampered token is rejected | pass |
| Unlock flow: restore by email unlocks | pass |

## What felt great, flat, and what was fixed (overall)

**Great.** The leverage line under every choice changes how the card reads: "12×1×1.76
= 21" against "13×1×1.76 = 23" makes a quiet domestic card a small bet, and
"25×1 = 25 · MARKETS TURN 27%" makes a bluff card a real one. The ante bar turning red
in the last third of an act is pressure you can feel without a timer. Bluff cards are
about the miss. The endings are screenshots people would post. The Deep Bunker's
"a bed you have never slept in" and the Ambassador's warnings-as-anecdotes give the
shop a voice.

**Flat.** A calm run never hears the big slam; the juice is proportional to leverage,
so the dove's best moment is a banner. The accident strip only matters above 50 and a
dove never sees it fire. Week One's ante is met by 94% of runs, which makes the first
banner a formality.

**Fixed tonight.** Flashpoint swings; the fallback ending; the e2e helper; the harness
exit; the resignation card (the bot signed it because "Sign it" had no printed cost;
it now avoids forced losing endings, and the card keeps its trap for humans).

**Not fixed, logged.** "Too consulted" as a loss the standing orders should name; the dove's
low ceiling (a de-escalation build needs one visible payoff moment, e.g. the Quiet
Room's mult landing on a stand-down card); the harness cannot see ante banners in the
DOM and so does not log them (the transcripts note antes only through the bluff
cards).
