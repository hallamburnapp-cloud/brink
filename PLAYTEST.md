# PLAYTEST.md — real runs in a mobile browser

The harness (`tools/playtest.ts`) drives the shipped game in a Pixel-7-sized Chromium
through the DOM only, using what a player sees: the card text, the two choice
lines with their printed leverage, the odds percentage, the preview dots, the meter
bars and the HUD. It plays with a named decision style, buys in the shop, and writes
a transcript and screenshots to `playtest-output/` (git-ignored; the transcripts
quoted below are kept under `docs/playtests/`). Motion and sound are on; the e2e
suite is the one that emulates reduced motion.

Styles: **dove** takes the calmer line and buys de-escalation; **hawk** takes the
firmer line and buys leverage; **balanced** reads the preview dots and protects the
lowest meter; **gambler** takes every roll it can and the higher leverage.

## Runs

| Run | Seat | Style | Days | Cards | Ending | Score | Pieces bought |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PT-DOVE-1 | Republic | dove | 21 | 61 | 🏢 Consulted (removed: allies 100) | 1,642 | Allied Basing Rights, Trade Desk, Ambassador, Commercial Satellite Deal, Fortress |
| PT-HAWK-1 | Federation | hawk | 9 | 34 | 💥 Harrow Vale (nuclear, forced by the Intercept flashpoint) | 987 | one |
| PT-BAL-1 | Coalition | balanced | {BAL_DAYS} | {BAL_CARDS} | {BAL_ENDING} | {BAL_SCORE} | {BAL_PIECES} |
| PT-GAMB-1 | Republic | gambler | {GAMB_DAYS} | {GAMB_CARDS} | {GAMB_ENDING} | {GAMB_SCORE} | {GAMB_PIECES} |

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
content pass: raise "They swallow it" to 0.35 and let the hotline side cost military
rather than end the sequence.

### PT-BAL-1 — {BAL_TITLE}

{BAL_TEXT}

### PT-GAMB-1 — {GAMB_TITLE}

{GAMB_TEXT}

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
| Daily run: plays a full daily run on a phone, shares, offers an instant restart | {E2E_DAILY} |
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

**Not fixed, logged.** The Week One Intercept package odds (0.25) for hawks; the dove's
low ceiling (a de-escalation build needs one visible payoff moment, e.g. the Quiet
Room's mult landing on a stand-down card); the harness cannot see ante banners in the
DOM and so does not log them (the transcripts note antes only through the bluff
cards).
