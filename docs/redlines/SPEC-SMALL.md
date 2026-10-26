# BRINK: Red Lines — the small game (v6)

Status: **proposed, not built**. This is the cut of `SPEC.md` (v5.1) after the owner's second review
(`REVIEW-2.md`). Everything that is not on this page is out of the first build. The owner approves or changes
this page, and picks a look from the three mocked beside it, before any code is written.

## What the review said, and what this cut does

| The review | This cut |
| --- | --- |
| Too dense: every critique answered with a rule; a wargame's rulebook in a phone session. | One agent, one verb, one phone, two bars, a word for the ladder, eight weeks. The cabinet draft, the Coalition, private warnings, loud and quiet blocks, leaders and seeds are **out of the first build**. No lag on the bar, no cap, no quiet-day clauses: the bar's movers fit in five lines below. |
| The real-time clock is dead weight. | **Turn-based, one turn a week, eight weeks.** The map shows where their forces are heading next; which push is real and which is a feint stays hidden. You act, then the week resolves. (If the owner keeps real time, a week is 45 seconds of clock and the phone rings at its end; nothing else changes.) |
| The phone hands you the answer with conditional annotations. | **Advisers argue in character; nobody annotates.** The Hawk is confident and sometimes wrong. The Director reports what she has seen, never what it means. The player does the inference. Forty words, never more. |
| Credibility from the record alone bakes in one side of a debate. | **They believe a promise when you have kept promises and when you could actually hold the place.** A promise outline is solid where you can hold it (your fleet or brigade within reach, a sea lane open, not deep in their bloc) and dashed where you cannot: a promise you cannot keep is drawn as a bluff, and everyone can see it. |
| A solved opening: one cheap far promise, backed once. | A far promise cannot be held, so it is dashed, invites a test, costs double to back and may fail. The simulator checks this opening first. |
| The maths does not close. | The score is ordered by construction (below). The win condition is one sentence. WAR is drawn as eight pencil boxes with the last one labelled WORLD WAR. |
| The critics were simulated; validation is cheap. | They were. The slice is the phone, promises, one Federation and ten minutes, and the bar is cold testers. |
| Lift the fog at the end. | **The debrief**: after the ending, the eight weeks replay with the Federation's hidden thoughts under each of your decisions ("Week 3: they were bluffing at Shoal. Backing it would have cost nothing." "Week 5: your fleet looked like an invasion."). Every loss is a lesson; that is the next run. |

## The game in three sentences

1. The Federation is pushing. Where it pushes, the map turns amber, then red.
2. You lead the Republic. Promise to defend what you can hold, and keep your word when they test you.
3. Give them a way to stop and they sign. Let them win, or back them into a corner, and it is war.

## A week (one turn)

1. **See.** The map shows what they did last week and where their forces are heading now (two places; one is
   real, one may be a feint). The headline strip says what changed and why, in one line each.
2. **Act.** Draw or withdraw promises (at most three; solid where you can hold them, dashed where you cannot).
   Move your two pieces (one fleet, one brigade): a piece within reach makes a promise solid. Offer a way out
   if you want to (one of three named terms: drop a promise, pull a piece back, a summit without
   preconditions; each with its price). Each act costs influence; you have about 30 and earn about 8 a week.
3. **The phone.** If they tested a promise this week, or an event fired, the call: the caller's message in forty
   words, the advisers in character, then BACK IT / BACK DOWN / WAIT. WAIT carries the test into next week with
   the stakes up.
4. **Resolve.** Pushes land, places fall or recover, the ladder moves, the two bars move, and the strip says why.

Eight weeks. A full game is ten minutes.

## The other side

One Federation per run, drawn with two hidden dials: **appetite** (how hard it pushes unguarded places) and
**jumpiness** (how little force near its borders it tolerates). No names, no profiles on screen; the debrief
names them at the end. It declares three lines before the game starts (in the opening strip): two real, one a
bluff; you are not told which. Crossing a real line moves it up the ladder; crossing the bluff does nothing and
makes it believe you more. Its ladder is one word on screen: TESTING, PUSHING, MASSING, FIGHTING, ALL-OUT. Up a
step: a real line crossed, a promise you backed down from, a place taken unanswered **that something of yours
could have reached** (a place no piece of yours could reach falls without a step: the tape says "out of
reach"), or, at MASSING and above, an accident (one chance in twenty a week). **The fighting spreads only at
FIGHTING and ALL-OUT**, never at MASSING, and the tape names the places it spread to. (If the frozen gate and this
gentler spread cannot both hold at eight weeks, keep the gentler spread and let the frozen gate sit at 20%.) Down a step: a promise backed and held, a way out accepted. It
believes you more when you back a promise you could hold; less when you back down, or back a promise you could
not hold and it fails.

**It tests promises it does not believe.** That is the whole deterrence model, and it is visible: dashed
outlines get tested; solid ones mostly do not.

**Rulings after the first build's review** (the deep-strategy critic's findings, decided here so the fixers follow
one reading):
- **The ladder is not a cliff.** Falls move the ladder at most one step in a week; the fall clock reads the step
  the week started at; the fighting spreads only at FIGHTING and ALL-OUT, one or two places a week, and a piece
  or a solid promise spares a place from spread.
- **You start within reach of the war.** The fleet starts at Tern Isle (the Scatter), the brigade at Edda Vale;
  the Federation's first fronts touch the Scatter and Highmarch before the Sound.
- **Backing a feint earns nothing.** They were not coming; the debrief says so. WAIT buys information: the second
  week's call reads differently when the column was a feint. BACK DOWN near a scared Federation is a step down.
- **A far promise cannot be sold.** A dropped promise moves them only when it is within their reach or under test;
  otherwise the offer is indifferent to them and the tape says so.
- **Sitting still does not win.** A quiet week pays +5 only when no place is pressed and unanswered, and a push
  on a place whose clock has run down takes it or opens a new front next door. Gate: a no-orders bot wins at most
  half as often as the sensible bot.
- **Sentences are true.** The treaty ending names a place they really pushed, never a feint; WORLD WAR names the
  first place that fell on the tape; the trawler rings only about a promised island, or in words that claim no
  promise.
- **The debrief teaches.** At most one heading and one feint line a week, and only when it changed something;
  the closing card draws two or three lessons from the game's own events.

## The two bars

- **WAR**: regions fighting, drawn as eight pencil boxes; the eighth is WORLD WAR and the game is lost there. (The first draft said twelve of thirty; in eight weeks twelve is out of reach and a collapse ran out of weeks instead of ending, so the engine's tuning set the line at eight. One box a week, legible.)
- **TREATY**: their willingness to sign, 0 to 100. Each week: +5 if they gained nothing this week; +15 when a
  way out is accepted; +10 when another bloc signs (at most two); −5 for each place they gained; −10 when they
  are humiliated (a public ultimatum they must refuse). **A refused way out costs nothing on the bar**: the
  tape prints their reason that week ("Wintermast refuses: a summit · 'nothing to talk about yet'"), so
  offering to talk is never punished, only unanswered. **At 100 they sign, if no place fell this week.** Those
  are all the rules the bar has. Every mover prints its own line on the tape beside the bar's move.

## Endings and the score

- **TREATY** on week w with f places fighting: score 100 − 10w − 5f, never below 10. "Signed in week 6 with one
  place still fighting. They stopped because they could not take Vessary and you gave them a way out."
- **FROZEN**: week 8 ends with neither. Score 9 − f, never below 1. "Nothing was signed."
- **WORLD WAR**: score 0. "Week 5. It began at Shoal, when the promise you inherited was tested and you backed
  down." The map draws the chain.
- Then **the debrief**: the eight weeks replayed with their hidden thoughts shown at each decision, and the two
  dials named in words ("They were hungry and not easily scared").

## The screen (whichever look the owner picks)

The map is the hero and takes most of the screen. Above it, small: the week, the influence, the two bars and the
ladder word. Below it, one line of headline. Promises as outlines (solid or dashed) marked WE DEFEND; your two
pieces drawn; their forces drawn moving; the tested place marked. The call covers the map and stops everything:
a face, forty words, three choices. Nothing else. No tabs in the first build; the sentence a watcher needs is
the headline line.

## What is built first, this week

The map with its states; one Federation with two dials and three declared lines; promises with hold and bluff;
two pieces; the ladder; the two bars; eight weeks; the phone with eight templates (two inherited-promise tests,
two feints, a false alarm, a trawler incident, a bluff crossed, a summit offer); the three endings; the debrief.
No cabinet, no Coalition, no leaders, no daily seed, no sound, no save. A simulator with four bots (passive,
promise-everything, far-promise opening, sensible) runs before anyone plays: the passive bot must lose most
games, the far-promise opening must not beat the sensible bot, and the sensible bot must win between a third
and a half. Then five cold testers who are not the owner's partner, two games each and the debrief; the pass is
that most of them can say what the Federation was like without being told, and play a third game unasked.

## The owner's decisions (2026-10-17)

1. **The look: the situation room throughout** (`looks/paper/`): the paper map under a lamp, grease-pencil promises, red pushpins, the rubber-stamped ladder word, the teleprinter tape, the handset and typed slips for the call.
2. **Turn-based by week.**
3. **A deep strategy game for a niche.** The first build is this slice; the cabinet draft, the Coalition and private warnings from `SPEC.md` return in the second and third builds. The first build's engine leaves room for them without building them.

## Two decisions that were put to the owner (kept for the record)

1. **Turn-based by week, or real time.** The review's case for turns is strong (nothing happens between stops
   that needs a clock). The owner chose real time for the Plague Inc feel; this page recommends turns.
2. **Who it is for.** A broad phone game (this cut) or a deep strategy game for a niche (then v5.1's cabinet,
   Coalition and warnings come back in later builds, but not in the first).
