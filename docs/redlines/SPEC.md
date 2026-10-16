# BRINK: Red Lines — design (v5.1, the second draft of the redesign, after three critics read it)

Status: **proposed, not built**. This replaces `docs/race/SPEC.md` ("Treaty Against War", the first draft) after the
owner's review of it (`REVIEW.md`), and was then read by three independent critics (a systems designer, a scholar
of deterrence and crisis bargaining, a non-gamer who watches over a shoulder; `CRITICS.md`) before the owner saw
it. The owner approves or changes this page before any code is written.

## Words on screen

The game uses plain words everywhere a player or a watcher reads. This document uses the same words.

| On screen | What it means underneath |
| --- | --- |
| **the Federation** (one name everywhere; Wintermast is only its capital) | the adversary agent |
| **WE DEFEND** (a white outline you drew) | a public promise to defend a region |
| **BACK IT / BACK DOWN / WAIT** | the choices when a promise is tested |
| **under pressure** (amber, dotted) / **fighting** (red, hatched) | region states; "fighting" is used for regions only |
| **They are: TESTING · PUSHING · MASSING · FIGHTING · ALL-OUT** | the Federation's escalation step, under the WAR bar at all times |
| **TREATY n%** (the blue bar) | intelligence's estimate of the Federation's willingness to sign |
| **they believe us more / less** | the Federation's read of you (credibility) |
| **a way out** | an offer the Federation can present at home as a win |
| **what they're like**: *takes what's unguarded* · *scared of us* · *wants three places* · *pushes when we blink* | the four behaviours; never named by intelligence, only described |

## The game in three sentences (the explanation at the start, over the live map, skippable)

1. The Federation is pushing. Where it pushes, the map turns amber, then red.
2. You lead the Republic. Work out what kind of enemy this is, promise to defend what you can hold, and keep your
   word when they test you.
3. Give them a way to stop and they sign. Let them win, or back them into a corner, and it is war.

During the explanation THE FEDERATION is lettered across the Cap and both capitals carry a flag (the Republic's on
Edda Vale, the Federation's on Wintermast), so the watcher knows who is who before the clock starts. The third
line of the explanation names this run's dilemma in plain words: "You inherited a promise to Shoal. We think
they will not stand for a fleet there."

The test of every screen stays: someone who never plays games, watching over the player's shoulder, can say what
is happening and what the player is trying to do. Here: "the Federation, the flag up top, keeps pushing; she's
working out what they're like and promising to defend places; the blue bar is them agreeing to stop."

## The other side (the centre of the design)

**Two dials and a name.** Every Federation is drawn with two hidden dials, each 0.2 to 0.8: **appetite** (how
hard it pushes undefended places) and **jumpiness** (how little force near its borders it tolerates). The
dominant dial names what they're like, but the other is always there, so the right amount of firmness is a dial
found by feel, not a switch. Four names, and a fifth thing: once per run, on a trigger, the behaviour can drift
(a *takes what's unguarded* that is backed down to twice becomes *pushes when we blink*; a *scared of us* shown
force for ten days acquires claims).

| What they're like | How they behave | Brake (buys days, not the game) | Accelerator |
| --- | --- | --- | --- |
| Takes what's unguarded | Pushes where nothing is promised; probes every promise once. | A promise backed when tested: they turn away from it for 5 to 8 days. | A promise you back down from: they push harder there and elsewhere. |
| Scared of us | Reads force near their borders as a threat and answers it with force. | Reassurance: the hotline, a pullback, a summit offer. **Backing down near them is a step down**, not up. | A brigade on their border, a fleet in their water, a public ultimatum. |
| Wants three places | Has three named claims and pushes them. | Being blocked twice at a claim, or a way out that concedes one. | Ways out that say nothing about the claims. |
| Pushes when we blink | Doubles down when blocked once; raises the stakes when you hesitate. | Backing a promise twice in a row, then a way out. | WAIT, a half-measure, a split answer, a back-down. |

**Every brake buys days, not the game.** A brake drops them one step and holds for five to eight days; then they
resume against a new target, and the same brake costs more the second time (the second backing costs more
influence; the second reassurance reads as weakness unless they believe you). **Gains breed pushes**: a region
taken unanswered is a step up for every Federation.

**Their lines.** Two or three real red lines per run, hidden, from a list of eight (no Republic forces in the
Sound; the sea lanes to the Cap stay open; no alliance with Farsouth; no missiles north of Edda Vale, and four
more), **and one or two bluffs**. Every line, real or bluff, is declared before it can be crossed: a note or a
speech in the ticker ("Wintermast: Republic forces in the Sound would be a grave matter"). Intelligence reports
"they say the Sound is a line; 40 to 60% they mean it". Crossing a bluff costs nothing and makes them believe you
more. Crossing a real one climbs the ladder within a day (two steps for a *scared* Federation when the line is
about proximity, one otherwise) with a headline that says why. A pullback uncrosses a line at a small cost in
belief. This is the call-their-bluff decision the game is about.

**The ladder** is public posture and is on the main screen at all times: They are TESTING · PUSHING · MASSING ·
FIGHTING · ALL-OUT. The step sets how many regions they push at once and how fast a pushed region falls. Up a
step: a real line crossed, a promise backed down from, a gain unanswered, their own accelerator, an accident. Down
a step: their brake, a way out accepted, two pushes blocked in a row. At MASSING and FIGHTING both sides are
afraid: the treaty estimate rises every day (+2, +3) but each day carries a chance of an accidental step up (3%,
6%). That is brinkmanship: climbing to force a settlement is possible and dangerous. At ALL-OUT the WAR bar fills
in days. A Federation that stays at FIGHTING for ten days climbs on its own, so the clock cannot be run out.

**What they think of you** (hidden). They believe you more when you back a promise, when you do more than you
say, when the home front holds. Less when you back down in public, when a bluff of yours is called, when the home
front cracks. Spoken only, by the Intel Director, as a headline and a confidence in words: "They think you'll
back down. We are fairly sure."

**Their willingness to sign**, the TREATY bar, is intelligence's estimate, two or three days behind the truth with
a soft leading edge, so it cannot be used as an instant probe. Underneath: up each day they make no gains **while
they are TESTING or PUSHING**; above that, only from blocks, ways out and other blocs' signatures, never from quiet
days (so sitting still is not a strategy). Up when a way out is accepted; up when another bloc signs (a fixed 10
each, at most 30 from signatures); down each day they gain; down when humiliated (a public ultimatum they must
refuse); down when the Coalition leans their way. **Capped at 75% until one way out has been accepted**, and the
top quarter of the bar is greyed with "they need a way out" until then. They sign when the estimate's truth
reaches 100 **and no region has fallen in the last seven days**; while a fall is recent the bar wears a notch and
the ticker says "They will not sign while the guns are this fresh." Regions still fighting at the signing are the
score's cost, not a bar.

## The world

**The map**: the war room's thirty regions and five blocs. Highmarch is the Republic (your flag on Edda Vale). The
Cap is the Federation (their flag on Wintermast). The Scatter (islands) and the Sound are the ground between you.
Farsouth is the Coalition, the third power and a swing: it leans towards you when you are restrained and
believed, towards the Federation when you back down or overreach; its bloc tints from blue-grey to red-grey as it
leans; its signature is worth 20; if it leans all the way it joins their side and the Sound falls faster. You can
court it (a summit offer, a trade card), and once courted it acts once per run on its own, attributed to you in
the ticker, which can cross "no alliance with Farsouth" on your behalf: alliance has a price.

**Region states**: CALM; **under pressure** (amber, dotted; the dots densify day by day as it nears falling);
**fighting** (red, hatched). Nothing spreads by itself: every amber region is one the Federation chose. A region
under pressure falls when left unanswered for a number of days set by the ladder step; on an escalation only the
ringed region falls at once and the others speed up. **Regions recover**: fighting drops to under pressure when
the ladder steps down or a way out names it (ticker: "Guns quiet at Vessary"); under pressure returns to calm
after seven quiet days. The WAR bar runs both ways.

**What is drawn**: the states; white WE DEFEND outlines on your promises; a small white chevron (land) or anchor
(sea) wherever Republic force is deployed, removed on pullback; the Federation's force markers moving towards the
regions it will push next, two days ahead, so the watcher sees it coming; a ring where you are being tested, left
on the map for the rest of that day as the record; signature marks on blocs that have signed. Nothing to tap but
the regions themselves (to promise) and the tabs. No bubbles.

**Promises (the main verb).** Tap and hold a calm or under-pressure region outside the Cap: PROMISE TO DEFEND. A
promise costs 1 influence a day (the garrison); at most three at a time; WITHDRAW quietly before it is tested
(they believe you a little less, far less than a back-down). **A promise deters when you are believed**: at good
standing a promised region is pushed half as often and falls at half speed; at poor standing a promise invites a
test (the bluff is called). The confirm says which: "At our standing this line deters" / "this line invites". A
*takes what's unguarded* Federation probes each promise once regardless. **Every push on a promised region is a
test**, and the phone rings the day it turns amber. Defending without a promise is possible through a FORCE card,
costs more, and counts as overreach for the Coalition: the promise is the cheap credible way to defend, silence
then force the expensive one. You inherit nought to two promises at setup (made before your time), and the
setup guarantees at least one collision between an inherited promise or a claim and a probable red line, named
in the explanation. The Old Ambassador's first phone on day 1 says what you inherited and why.

**The two bars**: WAR counts regions fighting (end: 12 of 30). TREATY is the estimate above (end: 100 and seven
quiet days). The ladder word sits under them. Every move of the blue bar of more than two points gets a plain
ticker line the same day ("Farsouth edges towards Wintermast: they're less willing"; "Three quiet days: they're
more willing"), and the WORLD tab keeps the last three lines.

## You: the cabinet (the drafted hand)

**Five drafts**, on days 1, 12, 24, 36 and 48: the Chief of Staff brings three cards from a pool of forty; take
one, or none for +6 influence; one reroll per draft for 3. Hand limit six; measures are spent when played, people
and policies stay. Twelve people, eighteen measures, ten policies; tags FORCE, TALK, INTEL, HOME. **Base synergies
by tag so every run has some**: any two FORCE, backing a promise costs 3 less; TALK + INTEL, the range on a way out
narrows; two HOME, the income floor rises. **Named pairs as rare spikes**: Hotline + Back-channel (ways out land
more often and the range narrows); Fleet to the Scatter + a promise in the Scatter (a test there resolves without
a fight unless one of their lines is in that water, and the Director says which); Spymaster + Intercepts (their
lines read by day 10); Hawk General + Reserves (backing a promise costs no influence, but each backing is a step up
against every Federation: mobilisation is read as mobilisation whoever they are). Every FORCE card prints its
risk ("may read as a threat, depending what they're like"); every TALK card its cost ("they may read it as
weakness"); **every INTEL card its risk too** (the Spymaster is wrong one time in six and says so; Intercepts can
be caught, a step up for a *scared* Federation). No card removes content and no card removes the doubt.

**Measures are played only from a phone or a test**, as extra options that appear when the card is in hand, so
the hand widens your choices and the clock never runs while you act.

**Influence** (the top-bar number): start 30; +2 a day; promises −1 a day each; phone options between −15 and +10;
cards 8 to 20; ways out 10 to 25; reroll 3; passing a draft +6. Backing a promise costs 12 the first time and
falls to 6 when they believe you, so the record of backing lines pays. HOME cards raise the daily rate: the home
front is the floor. The WORLD tab's first line says what influence is. The cost to back a promise is printed on
its outline the day it goes amber ("to back: 12"), and the Chief of Staff warns the day before you would be
short.

**The home front** is one hidden dial with three spoken states (steady, restless, cracking), moved by public
back-downs, by long fighting, by loud blocks (up) and by HOME cards; below the line income halves and they
believe you less. One ticker line now and then, one sentence in the WORLD tab, nothing more in the slice.

## The 3am phone

**Scheduled**: about eight a game, one every seven days, from the arcs. **Unscheduled**: a test whenever they push
a promised region (at most three promises, so at most a handful). The five drafts are stops too. A median game
of 45 days is about thirteen stops, one every 40 to 45 seconds of running clock; the top bar shows the next
scheduled call ("next call: day 14") so the watcher sees the rhythm.

**A test is up to three rounds**, and the clock is stopped throughout. Round one: BACK IT / BACK DOWN / WAIT, each
with its cost in words ("Influence −12 · we keep our word · if they are scared of us, this is how it starts";
"They believe us less · Lintel likely falls within days · if they are scared of us, this calms them"; "A day
passes · 30 to 50% Lintel falls · confirmation may arrive"). If you back it, they back down with a chance set by
what they're like and the step (*takes what's unguarded* at TESTING about nine times in ten; *pushes when we blink*
at MASSING about four in ten); otherwise round two: "They have not moved. REINFORCE (a step up, −influence) /
HOLD (a day; 50 to 70% they blink) / PULL BACK (worse than backing down at once)." A quiet retreat (half the cost
in belief) exists when Press blackout or Back-channel is in hand. People in your cabinet add a one-line opinion
each (the Hawk General and the Dove Foreign Minister rarely agree).

**Two kinds of line**: WARN (private, through the Back-channel: a small effect on tests, a small cost if ignored)
and PROMISE (public, the full mechanic). **Two kinds of block**: loud (the Press Secretary: the home front rises,
they are humiliated and less willing) and quiet (they can climb down).

**Fog, honestly.** The Intel Director speaks in ranges about events ("Early warning shows six launches. Nothing
else confirms it. We are 30 to 50% sure it is real.") and in words about states ("they think you'll back down;
we are fairly sure"). The content validator checks that every hidden probability lies inside the range the
Director states. **The false alarm is coupled to the ladder**: below ALL-OUT a "real" alarm is a test or an
exercise, never an instant loss; the cost is in the response (force in public is the *scared* Federation's
trigger; panic makes them believe you less); the Hotline in hand resolves it ("Wintermast picks up. It was a
flock."). Consequences can land days later and the ticker says when ("Three days ago the tankers turned back.
The Sound remembers."). **Ways out name their content** from a slot: a promise you will drop, a claim you concede,
a deployment you pull back, a summit without preconditions; each prints the read as a range in the Director's
voice ("if they're hungry, 50 to 70% this feeds them") and its cost to the Coalition's lean.

**Templates**: forty, each mapped to one lever before it is written (the blockade to the sea-lane line; the false
alarm to the ladder; the defector to a line revealed with a confidence; the ultimatum to humiliation; the
trawler to alliance entrapment: "Shoal has seized a Federation trawler. Wintermast demands it back. Disown them /
Back them, the test comes early / Lean on them privately"). Arcs with no lever are dropped. Slots for the place,
the adviser and what they're like, so two runs rarely read the same.

## Variance

Setup draws the two dials and the name, two or three real lines and one or two bluffs, the claims (for *wants
three places*), nought to two inherited promises, the Coalition's lean, two or three first flashpoints, and
shuffles the cards; it guarantees one collision and names it. **Intelligence never names what they're like**; it
reports behaviour ("they have pushed four unpromised regions and tested none of ours"), its confidence grows with
the diagnostic things the Federation has done (not with the calendar), and the ending names them. **Three
leaders**, one unlock per win in a fixed order: the Dove (Hotline in hand; ways out cheap), the Hawk (the first
backing of the run is free), the Spymaster (one of their lines known on day one; they believe you less at the
start). **A daily seed**: the same world for everyone on a date; your best stays on your phone; nothing is shared,
nobody is named.

## Endings and the score

- **TREATY**: "Signed on day 41 with two regions still fighting. They stopped because they could not take Vessary
  and you gave them a way out." The ending names what they were like.
- **WORLD WAR**: "Day 33. It began at Shoal, when the promise you inherited was tested and you backed down." The map
  draws the chain through your deployments, their lines and the steps.
- **FROZEN**: day 60 with neither. "Nothing was signed. Two regions still fight. They came within a week of
  stopping." Below every treaty, ordered by how close it came.

One number: (60 − day) × 10 − 15 per region fighting at the signing, printed the same way on the ending and the
daily-seed card.

## The screen (Plague Inc's layout, war-room dressing, portrait 390 x 844)

1. **Top bar**: INFLUENCE n · DAY n · next call: day n · pause / play / fast (12 s a day; 4 s fast).
2. **The race**: WAR n of 12 (red) over TREATY n% (blue, soft edge, greyed above 75 until a way out). Under them,
   in the Federation's colour: *They are: PUSHING*.
3. **The map**: as drawn above.
4. **The ticker**: one Federation move a day, your moves' effects, every blue-bar move, the world's reaction.
5. **The panel**, three tabs: WORLD (the map in a sentence, the legend, the last three ticker lines, what
   influence is); CABINET (your hand, the next draft's day); THE OTHER SIDE (what intelligence knows and how sure
   it is: their behaviour so far, their declared lines with "they mean it" ranges, what they think of you, and A
   WAY OUT, the one verb, available at PUSHING or above).

When the Federation moves in response to you (a back-down, a line crossed, a way out accepted), the cause region
and the response regions flash together for two seconds and the ticker pins the line for the day ("After Shoal
backed down: pushing Vessary, Lintel"). The fog stays where it belongs: what they're like, which lines are real,
what they think of you.

## Session

Sixty days at 12 s a day is twelve minutes of clock; thirteen stops at 30 to 45 s of reading each add seven to
ten. **A full game is about twenty minutes**; a treaty on day 41 is about fifteen. If the owner wants fifteen
minutes flat, forty-five days with four drafts (open decision 4).

## What is built first (the slice)

**Cheap and in the slice**: the Federation with two names (*takes what's unguarded*, *scared of us*) and per-run
dials; declared lines with bluffs; the ladder with its fear bonus and accident chance; what they think of you,
and promises that deter when believed; tests of up to three rounds with WAIT; a way out with named content and
the 75% cap; region recovery; the ladder word on screen; your deployments drawn; one inherited-promise template;
twenty of the forty cards with the five drafts and the reroll; eight phone templates from three arcs; the three
endings; the explanation with the collision named. **Not in the slice, by decision, because they are research
projects in disguise**: a general two-sided misperception process; a domestic-politics model beyond the one home
front dial; intelligence that infers rather than counts; four fully distinct behaviours with learned tells;
leaders, the daily seed, sound, save.

**Order of proof**: the simulator and its gates pass before any tester sits down. Then five cold testers who are
not the owner's partner, three plays each; count the unprompted fourth game and, after play three, ask each what
the other side wanted and what they would do differently. Pass: at least three of five play a fourth game, and at
least two describe the Federation rather than the cards when asked what changed. A tester who recites a recipe
and stops is the failure the review named.

## Balance gates (a simulator with the agent in it, 2,000 games per bot per behaviour)

- **Passive** (never promises, never answers): loses by day 40 in more than 80% of games against every behaviour.
- **Pledge everything and back everything**: reaches ALL-OUT in more than half of games against *scared of us*,
  wins more than 60% against *takes what's unguarded*.
- **Never promise, block ad hoc with FORCE cards**: wins at least ten points less often than the sensible bot
  against every behaviour (the promise must be worth drawing).
- **Fortress** (block everything, offer nothing) and **silent hawk** (no promises, force on every push): each loses
  to at least one behaviour in more than 60% of games.
- **Appeaser** (backs down from everything, offers everything): beats the passive bot against *scared of us*,
  loses badly against *takes what's unguarded*.
- **Oracle** (told what they're like on day 1): wins no more than 15 points above the sensible bot. If it wins 90%,
  the behaviours are cartoons and the dials widen.
- **Sensible** (reads behaviour, promises what it can hold, offers a way out when the bar caps): wins 40 to 55%
  overall; the median treaty on day 40 to 50; the WAR bar's median peak is 7 and the median at signing is 4 or
  fewer; fewer than 20% of its losses come with the treaty estimate above 80; fewer than 10% of its games end
  FROZEN; it is short of influence when tested in fewer than 10% of games.
- **Cards**: every card drafted in 8 to 25% of the sensible bot's games (both dead cards and auto-picks fail).

## Open decisions for the owner

1. **Fog at the start.** Proposed: what they're like is never named by intelligence, only described; their lines
   are declared but "they mean it" starts at 40 to 60%. More fog is more real and harder to read over a shoulder.
2. **Stops.** Five drafts and about eight scheduled calls, plus tests; about thirteen in a median game. Fewer, and
   the drafts fold into the calls.
3. **The Coalition as the swing power** (Farsouth, with one action of its own per run), or five equal blocs.
4. **Length.** Sixty days (about twenty minutes a full game) or forty-five (about fifteen).

## What is reused

The map geometry and renderer, the seeded RNG, the frame fit, the fonts, the content schema and validator
pattern, the six advisers, the arcs' text as raw material for the templates. New: `src/redlines/` (clock, the
Federation agent, promises, cabinet, treaty, ticker, phones, simulator), `content-redlines/`, `VITE_GAME=redlines`.
