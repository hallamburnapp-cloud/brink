# BRINK: Red Lines — the content (format, voice, validator)

The pack is `content-redlines/`: five YAML files, checked by a strict schema and a validator, compiled to one
JSON module (`virtual:redlines-content`) at build and dev time. The game is `SPEC-SMALL.md`; the seams are
`BUILD.md` ("The content"); the shape the engine reads is `src/redlines/engine/content.ts` (`RedlinesContent`,
`Strings`, the kind lists), which this pipeline compiles to exactly. This file is the format, the voice rules,
the validator, and what the engine and the screens must know to use the words.

## The files

```
content-redlines/
  advisers.yaml   the four people who speak: hawk, dove, intel, ambassador (id, name, role, tag, voice)
  lines.yaml      the eight lines Wintermast can declare (id, kind, regions, text, tape)
  phones.yaml     the phone templates, at least eight (kind, caller, text, again, three adviser lines, options back/down/wait)
  debrief.yaml    the Federation's hidden thoughts: one entry per hidden event kind, variants with slots
  strings.yaml    every other word on screen: the engine's sections key for key, then the screens' sections
```

The first four are YAML lists; `strings.yaml` is a map with every key named (an unknown key is an error, so a typo
cannot hide a missing word). Fictional world throughout: no real powers, places or brands; the brand name is never
written in content (it is `BRAND.name` in `src/config.ts`, one constant).

## Advisers

```yaml
- id: hawk               # hawk | dove | intel | ambassador (the engine's ADVISER_IDS)
  name: Ruun Halder      # fictional; the caller card types it in capitals
  role: General
  tag: the Hawk          # written by hand under the name
  voice: "Confident and blunt ..."   # for the writer and the validator, never shown
```

All four are required, each with a `voice`. Hawk, dove and intel have a slip on every call; the ambassador is a
caller only (the inherited promise, the summit). The slip header is the id and the role in capitals: `HAWK · GENERAL`.

## Lines

```yaml
- id: sound-forces
  kind: proximity        # proximity | sea | alliance | missiles
  regions: [KLP, BRK, LTL, TLM, DNM, ORN]
  text: "Republic forces in the Sound would be a grave matter. We say it once, and we say it plainly."
  tape: "Wintermast: no Republic forces in the Sound"   # 46 characters or fewer; the teleprinter prints capitals
```

**The tape form is true on the sheet** (SPEC-SMALL "Rulings after the recheck"): it names exactly what crosses the
line (proximity: forces; sea: the fleet or warships; missiles: the brigade; alliance: promises) and exactly where:
the places by name, or a phrase whose places are exactly the line's regions ("the Sound", "the Scatter",
"Farsouth", "Farsouth's ports", "north of Edda Vale", "the outer islands"). `load.test.ts` reads every tape back to
its regions and compares; a tape that drops the word that makes it true ("in the Scatter" for a line that leaves
out Tern Isle, where the fleet starts) fails. No line of either pack is crossed by the pieces where they start.

`kind` is what of yours crosses it, in the covered regions (the engine's rule): `proximity` either piece standing
there, `sea` the fleet there, `missiles` the brigade there (it carries them), `alliance` a WE DEFEND ring there.
Regions are the map's three-letter ids and never in the Cap. Exactly eight lines; the engine draws three before
week 1 (two real, one a bluff), prints each on the tape (`headlines.declared`) and writes the opening's collision
from one of the real ones. `text` is Wintermast's own words (30 words or fewer); `tape` is the pack's extra, the
headline form, because a whole declaration does not fit the teleprinter (see "For the engine").

The eight shipped, with their tape forms: `sound-forces` (proximity · the Sound: "Wintermast: no Republic forces in
the Sound"), `scatter-forces` (proximity · the outer islands, Driftholm, Lantern Key and Shoal, the Scatter's
seaward column out from the Republic's coast: "Wintermast: no forces on the outer islands"; Tern Isle, Gullrest and
Pebbleby face the Republic, so the fleet starts outside it and its first moves cross nothing), `cap-lanes` (sea ·
Driftholm, Kelpmouth: "Wintermast: no fleet at Driftholm or Kelpmouth"), `shoal-strait` (sea · Shoal, Lintel:
"Wintermast: no warships at Shoal or Lintel"), `farsouth-alliance` (alliance · Farsouth: "Wintermast: no promises
to Farsouth"), `scatter-promises` (alliance · the Scatter: "Wintermast: no promises to the Scatter"),
`north-missiles` (missiles · Vessary, Rimeholt: "Wintermast: no brigade north of Edda Vale"), `south-ports` (sea ·
Brindle Coast, Marram, Floe End: "Wintermast: no fleet in Farsouth's ports"). The MOMENT.md collision is an inherited
promise to Lintel against `sound-forces`: keeping the promise puts the brigade in the Sound.

## Phones

```yaml
- id: test-inherited-armour
  kind: test-inherited   # test | test-inherited | feint | false-alarm | trawler | bluff-crossed | summit | fall-unpromised
  caller: hawk
  # when: promised       # trawler templates only: 'promised' (an island under a ring of yours; the words may claim the
                         # promise) or 'unpromised' (one you never promised; the words claim none). Absent: either.
  # place: island        # test kinds only: 'island' (words that fit only an island: ships off it, as test-ships) or
                         # 'land'. Absent: either. The place narrows the pool, never the kind of push: no tell.
  text: "Federation armour is at {region}, the promise you inherited. Two brigades, lights on, not moving. They want to see what you do."
  again: "A week on. The armour at {region} has not moved, and there is more of it. ..."   # test kinds: round 2, after WAIT
  advisers:
    hawk: "Move now. Or never promise anything again."
    dove: "Keeping it puts {piece} on their doorstep. Think how that looks from Wintermast."
    intel: "Two brigades at {region}. Lights on since dusk. Their radio went quiet at midnight."
  againAdvisers:          # test kinds: the slips on round 2 (a week on: never the first round's words)
    hawk: "A week gone and they are still there. Every day we wait, the promise is worth less."
    dove: "Waiting has not made it smaller. Decide what we are, and say it."
    intel: "The armour at {region} has not moved. Fuel trucks came up in the night. The lights are still on."
  lastAgain: "Two weeks now at {region}. The armour has dug in for the winter, ..."   # test kinds: round 3, after a second WAIT
  lastAdvisers:           # test kinds: the slips on round 3 (never round 2's words again)
    hawk: "Two weeks of silence is an answer already. Change it tonight."
    dove: "The time we bought is spent. Whatever we say now, we say for good."
    intel: "The armour at {region} has dug in. Families are leaving by the coast road."
  intelDoubted: "Two brigades at {region}. Their papers stopped printing our warnings last week."   # test kinds: the Director's slip while they doubt you
  options:
    back: { label: BACK IT,   cost: "we stand by it in public · costs {cost} influence · we keep our word" }
    down: { label: BACK DOWN, cost: "protest and hold · they'll believe us less · {region} may fall" }
    wait: { label: WAIT,      cost: "a week · {region} may fall · we see whether the armour stays" }
```

- `text` is the 3am call: forty words or fewer **once the slots are filled** (the validator counts `{region}`,
  `{piece}` and `{from}` as two words each), in-world, dry, tense, ending in a full stop.
- **The three test kinds are one pool.** The engine draws a real push and a feint from `test`, `test-inherited`
  and `feint` alike (`test-inherited` first when the promise was inherited), so no template is a tell: the
  Director's observations must be true of a real push and of a feint ("Their fuel trucks have not been found";
  "I count one regiment, their radio says two"). The Hawk is confident in every template and wrong whenever the
  push was for show; the debrief says which it was. `again` is the message when the same call comes back after
  WAIT, and `againAdvisers` its three slips (a week on: the validator refuses a slip that repeats the first round's
  words); `lastAgain` and `lastAdvisers` are the third and last round's (round 16, the shoulder recheck: round three
  repeated round two word for word; absent, round three reads round two's); on round 3 the engine replaces the WAIT
  cost with `words.waitIsBackDown`, and on rounds 1 and 2 it appends `words.waitNext` ("backing it next week costs
  {cost}", the price BACK IT will carry after the WAIT, read with the belief the WAIT itself costs: the cold recheck
  found the rise hidden). SEND THEM on a `fall-unpromised` call appends `words.leavesToFall` ("leaves {region} to fall")
  when the piece it sends answers a pressed place at its last tick (the engine's `leavesToFall`). `intelDoubted` is the Director's
  slip while they do not believe your promises (belief under 40, when BACK IT costs its higher price: SPEC-SMALL
  "Doubt is visible where it matters"); she says what she has seen of it ("Their staff have stopped asking about our
  rings"), never what it means.
- **Every word on a form is true of what the engine does** (SPEC-SMALL "The bluff is not a free read" and the
  second review): BACK IT moves no piece, so no form says "move {piece} up" or "send {piece}" (`load.test.ts` refuses
  it); BACK DOWN's place "may fall"; a WAIT says what a week shows ("we see whether the armour stays"), never "they
  may move first" or "the stakes go up" for a call that carries none; a form that costs influence names the number
  (`{cost}` under BACK IT, `{waitCost}` under the third word: LEAN ON THEM costs 3). The `bluff-crossed` call rings
  for a real line crossed as well as for the bluff (no tell), so its words are true of both.
- `options` is a map `back · down · wait`. `label` is the word on the typed form (capitals, letters only, at most
  three words); `cost` the line under it: plain words, clauses joined by ` · `, what it costs and what may follow,
  never a full stop. On a test the labels are BACK IT / BACK DOWN / WAIT (`words.back/down/wait`); an event uses
  its own words (GO ON ALERT / STAND DOWN / WAIT; BACK THEM / DISOWN THEM / LEAN ON THEM; HOLD / PULL BACK / WAIT;
  ACCEPT / REFUSE / ASK FOR TERMS; SEND THEM / LET IT GO / PROTEST).
- Every adviser line is one slip: at most 22 words and 120 characters once filled.

### Slots (the engine's, `src/redlines/engine/phone.ts`)

| slot | means | value |
| --- | --- | --- |
| `{region}` | the place the call is about | its name |
| `{promise}` | the promised place (on a test, the same as `{region}`) | its name |
| `{cost}` | what BACK IT costs this round | a number; **only meaningful in `back.cost` and in `text`** (the validator refuses it under the other two words) |
| `{waitCost}` | what the third word costs (LEAN ON THEM: 3) | a number; only in `wait.cost` |
| `{piece}` | the piece that holds the place, else the nearest by its own routes (the fleet for an island the brigade can never reach), **with its article** | `strings.pieces`: "the brigade", "the fleet" (so write "Send {piece}", never "the {piece}") |
| `{from}` | the other heading's place | its name |
| `{step}` | the ladder word | TESTING ... ALL-OUT |
| `{line}` | a declared line's whole text | up to 30 words: quote it nowhere in a call (the validator warns) |

The engine's `fill` does not capitalise, so no sentence may start with `{piece}` (the validator refuses it).
Thoughts may also use `{why}` (a reason from `strings.why`) and `{n}`; strings may use any of these plus
`{term} {bloc} {at} {week} {fighting} {because} {cause} {a} {b} {hold} {influence} {weeks} {limit} {places}` (`{places}` a listed phrase of names, "Shoal and Lintel"; `{weeks}` and `{limit}` are
the rules' count of weeks and world war's place, `RULES.weeks` and `RULES.warLimit`, filled by the screens). A kind's required slot: every kind but
`summit` names `{region}`.

### What each kind is, and what the three keys do (`src/redlines/engine/content.ts`, `phone.ts`, `resolve.ts`)

| kind | when it rings | back | down | wait |
| --- | --- | --- | --- | --- |
| `test` / `test-inherited` / `feint` | their forces have arrived at a promised place and not moved | BACK IT: stand by it in public, costs `{cost}` (12; 6 from belief 40; 24 from too far, and it may fail; +6 a round) | BACK DOWN: belief falls, the place may fall | WAIT: the call comes back next week, stakes up; the third WAIT is backing down |
| `false-alarm` | early warning at `{region}` (PUSHING and above; never an instant loss) | go on alert: force they can see | stand down | a second source |
| `trawler` | an allied island (`{region}`, a Scatter port) has seized a Federation trawler: one under a ring of yours when there is one (`when: promised`), else one you never promised (`when: unpromised`); the engine picks the template that fits | back the ally (the island counts as answered this week) | disown them | lean on them privately (costs `{waitCost}`) |
| `bluff-crossed` | you crossed a declared line at `{region}`, the bluff or a real one (a real one also climbs a step on the tape; the call itself is no tell) | hold your ground | pull back | wait and see |
| `summit` | Wintermast proposes a summit (never in a week you have a way out on the table; two templates, so the second offer reads differently) | accept (costs influence; counts as a way out) | refuse (−10 on the bar: their public offer refused in public) | ask for terms (the offer lapses) |
| `fall-unpromised` | a place nobody promised will fall this week and `{piece}` could reach it | send what you have | let it go | protest |

## Debrief

```yaml
- kind: feintBackedDown          # one of the engine's HIDDEN_KINDS
  thoughts:
    - "They were bluffing at {region}. Backing it would have cost nothing."
```

One entry per hidden event kind (all 52 of `HIDDEN_KINDS` are required), variants to pick from (the engine picks
by seed), each in the past tense, addressed to the player, 30 words or fewer. The engine writes one filled thought
into that week's `WeekLog.hidden` for every hidden decision it makes; the ending screen replays them under the
player's own orders (`strings.acts`). The kinds: `heading feint bothReal notTested feintBacked feintBackedDown
feintWaited realBacked realBackFailed realBackedDown realBackedDownEased realWaited waitedFell lineReal lineBluff
fall fallOutOfReach spread wayOutAccepted wayOutRefused accident jumpy jumpyQuiet believed doubted falseAlarm
trawler summit unpromised bluffPhone bothRealTimetable jumpyWary realBackedDownTop headingThen lastTick provokedBacked
fallTooLate`, and the closing card's lessons `lessonFeintBacked lessonBackedDown lessonBackedDownHeld
lessonBackedDownFeint lessonBackedDownEased lessonJumpy lessonFarDrop lessonNoMoves lessonNoOrders lessonDashedTested
lessonOutOfReach lessonKeptWord lessonStoppedThenTalked lessonNoSign lessonNoSignTaken` (the engine
draws up to three a game, from what happened, as `Ending.lessons`; SPEC-SMALL "The debrief reads motives when they
were formed": a lesson prints once, on the closing card, never on a week's page). Each lesson is true of the game by
construction: `lessonBackedDown` ("the place fell anyway") only for a place that fell after the back-down and stayed
fallen; `lessonBackedDownHeld` (a step climbed, no fall claimed), `lessonBackedDownFeint` (a column only for show) and
`lessonBackedDownEased` (a scared Federation stood down too, once) otherwise; `lessonNoOrders` only when a place a
piece could have reached fell unanswered, counting the idle weeks in which a piece could have answered a hatched
place with one move; `lessonJumpy` names the piece whose doorstep climbed the ladder. Round 16 (SPEC-SMALL "A lesson
answers something the player did or could see"): `lessonOutOfReach` only for a place the player had ringed at some
time (inherited rings count), or when no other lesson applies; `lessonNoSign` ("The bar reached 100 in week {week},
but {region} stood hatched and unanswered ...") and `lessonNoSignTaken` (a place taken that week) come first in a game
that was not a treaty, naming the last week the bar stood at 100 and did not sign; `lessonKeptWord` ("by the end they
believed you") only when their belief ended at 40 or more. The page's own truths (round 16): `realBackedDownTop` for a
back-down at ALL-OUT, which climbs nothing; `headingThen` ("When they chose {region}, {why}.") whenever the place has
changed since the heading was planned (you promised it after their orders were given), so the page never contradicts
its own WHAT YOU DID; `lastTick` when they come to take a promised place at its last tick (a call); `provokedBacked`
for a provocation backed (a pause, not a retreat); `fallTooLate` for a ring that came too late (never "unanswered");
`feintWaited` says the column went home, and the tape says so too, the week after or, in a game's last week, before
the ending line. `bothReal` is said of two real
arrows before the timetable ("neither column was for show"), `bothRealTimetable` from it ("by their timetable"), and
`heading`'s reason is the one recorded when the heading was planned (`headingThen` when the place has changed since);
`bothRealTimetable` is said once a game, the first week the timetable takes over (round 16). SPEC-SMALL "The debrief teaches": `heading` is written
at most once a week and only for a test or a new front; `feint` only when the player acted on the feint's place;
the answer kinds (`feintBacked` ...) say "they were bluffing" themselves. `{why}` is filled from `strings.why`
("They went for Lintel because nobody had promised it."); the dials are named by `strings.dials` ("They were {a}
and {b}." with hungry / neither hungry nor careful / not very hungry and easily scared / neither bold nor nervous /
not easily scared), or by `dials.lineOne` ("They were {a}. You never came close enough to see whether they
scare.") when nothing in the game let jumpiness act.

## Strings

The first sections are the engine's `Strings`, key for key (its `checkContent` lists any missing key); the
sections from `title` on are the screens'. Every section of `strings.yaml` and who reads it:

| section | holds | reader |
| --- | --- | --- |
| `words` | WE DEFEND, TESTED, FIGHTING, BACK IT, BACK DOWN, WAIT, `steps` (TESTING PUSHING MASSING FIGHTING ALL-OUT), `waitIsBackDown`, `waitNext` and `leavesToFall` (round 16: appended to the call's WAIT and SEND THEM forms), SEND ORDERS, A WAY OUT, THEY ARE, WAR, TREATY, WORLD WAR, FROZEN, WEEK, influence | engine, map, screens |
| `explanation` | the three lines of SPEC-SMALL "The game in three sentences"; the first matches the sheet (SPEC-SMALL ruling): "The Federation is pushing. Where it pushes, the map is hatched; where it wins, it turns red." and the clock: "Ticks count the weeks before it wins." (HOW TO PLAY's first line says the same) | screens |
| `collision` | the opening's dilemma by what collides: `alliance`, `forces`, `near` (slots `{region}`, `{line}`, `{piece}`), `heading`; drawn from any of the three lines, the bluff included, and each is true of the sheet (`forces`'s "Nothing of ours can reach it" only when no piece can hold it by a route that crosses no declared line) | engine (`GameState.collision`) |
| `blocs`, `pieces`, `terms`, `numbers`, `counts` | "the Sound"; "the brigade", "your alert", "your promise"; the way-out nouns; number words 0..12; "one place still fighting" | engine |
| `endings`, `because`, `causes` | the two typed lines of each ending (`{week}`, `{fighting}`, `{because}`, `{region}`, `{cause}`); the treaty's reasons, and `because.leaves` ("They keep their forces at {places}.") after them when places are still hatched at the signing (round 16: `because.stalled`, "their pushes had stopped paying", in place of `quiet`'s "nothing cheap was left to take" when places are still hatched; `held`'s "could not take {region}" only of a place no longer pressed); the world war's "when ..." clauses, with `causes.out-of-reach` ("which nothing of ours could reach") for a first fall the tape called out of reach | engine (`Ending.lines`) |
| `dials` | the dial words, "They were {a} and {b}." and `lineOne` for a game that never showed jumpiness | engine (`Ending.dials`) |
| `why` | the 19 reasons that fill `{why}` in the debrief (`noGain` for a summit over nothing taken with nothing hatched, never "while they were ahead"; `noGainYet` with places still hatched (round 16); `tooSoon` for a way out the week after one was accepted) | engine |
| `wintermast` | Wintermast's own short quoted words for a refused way out (`noNeed gaining indifferent noThreat notAfraid hungry tooSoon`), 34 characters once filled: the tape's "Wintermast: 'nothing to talk about yet'" after "Wintermast refuses: a summit" | engine (`headlines.wayOutRefusedWhy`) |
| `headlines` | the 58 tape lines the engine writes (the engine starts each with a capital, whatever its first slot), 46 characters once filled with the widest values each slot takes (the spread with every real pair of neighbours; `load.test.ts` "keeps every line the teleprinter prints within its width"). Every mover of the ladder says "· now {step}" (`lineCrossed`, `takenStepUp`, `jumpy`, `accident`, `backedDown`, `summitAccepted`) only when the step changed: `lineCrossedSame`, `backedDownSame`, `summitAcceptedSame` say "· still {step}" (a jumpy step or an accident at ALL-OUT says nothing); `quietWeek` is "They took nothing this week" (never "a quiet week" beside their pushes); `worldWar` counts the places ("{n} places are fighting · WORLD WAR"); `wary` (a scared Federation holds a push back near your piece on its doorstep); `noSignTaken` / `noSignPressed` say why a bar at 100 did not sign (round 16: `noSignPressed` names the places while the line fits the teleprinter, "No treaty · Tern Isle and Shoal unanswered", and counts them otherwise; also said when the bar touched 100 this week and came down); round 16: `backedOnly` ("You backed {region}": a feint backed, or a provocation's pause, never "they turn away"), `easedStep` ("They ease off · now {step}", the step down after a backing that held or a way out accepted, on its own line after its cause), `feintGoneNew` (the column went home and this week's arrow points at the same place again); `lineCrossedAt` (what crossed a line and where), `fellOutOfReach` ("{region} out of reach · still {step}"), `takenStepUp` with `{n}` (the place, or "two places"), `feintGone`, `pushedAgain`, `wayOutRefusedWhy`, `backedDownEased`; `blocSigned` says what they sign ("{bloc} signs the call for a treaty"); an answer prints as the act it was on the tape too (PROTEST about a place nobody promised is `unpromisedProtested`, "You protested at {region}", not `unpromisedLet`'s "You let {region} go"); `frozen` "Week ten ends · nothing was signed". Round 13's `heldWeek` is gone with its rule (the +5 is paid whenever nothing was taken). The engine writes them cause before effect (`ENGINE.md` "A week") | engine (`headline`, `WeekLog.visible`, `WeekLog.beats`) |
| `acts` | the player's orders as the log writes them | engine (`WeekLog.acts`, `actLine`) |
| `answers` | the player's answer on the phone as the act it was, by the call (`test` for the three test kinds, `false-alarm`, `trawler`, `bluff-crossed`, `summit`, `fall-unpromised`) and the key (`back`, `down`, `wait`): "You backed your promise at {region}.", "You protested at {region}.", "You accepted their summit." (SPEC-SMALL: "What you did is printed as what you did"; never the form's forecast, which the validator refuses: no "will", "may", "likely"). A third WAIT on a test prints `test.down` | engine (`WeekLog.acts`, `actLine`), screens (the note) |
| `refusals`, `hold` | the words for a refused order and for a solid or dashed ring (the engine returns codes; `too-early`, `too-soon` (the week after a way out was accepted: "they took a way out last week"), `piece-home`, `no-promises` and round 16's `small-thing` (a standing promise already refused as "a small thing" and still out of their way: the engine's `smallThing`) are a way out that would fail, dimmed before you pay) | screens |
| `title`, `screen`, `act`, `note`, `phone`, `menu`, `debrief`, `howToPlay`, `flavour` | PLAY / CONTINUE / HOW TO PLAY and "Ten weeks. …", the one question PLAY asks over a game in progress (`title.newGameSure`, answered with the menu's YES and NO), the calendar's "of {weeks}" and the WAR note's "world war at {limit}" (the numbers come from `RULES`, never from the pack), the notice over a phone held sideways (`screen.upright`, "Turn your phone upright"), PROMISE TO DEFEND / WITHDRAW / MOVE HERE, the way-out form, the handwritten situation note ("They are pushing {bloc}." "They have taken {region}." "Your promise at {region} is being tested now."), INCOMING and the call's influence (`phone.inHand` "{influence} influence in hand"; `phone.needs`, the end of a form you cannot afford, "needs {cost} · you have {influence}"), the menu, THE DEBRIEF's words ("The weeks again, …": a game can end before week 10), the eight rules a player can read (the pins and arrows, the clock and what stops it, how to promise and to move, solid and dashed, the three lines, influence, the treaty and when it is not signed, the ways out from week three), in-world headlines for a thin week. The second review's words for the slips and the note (the screens wire them): `act.moveHint`, `act.crosses` ({line}: a declared line's tape words), `act.leavesDashed`, `act.promiseCall`, `act.promiseProvokes` ("a provocation here · they may test it first", on the slip of a hatched place nothing of ours stands in: the engine's `isProvocation`); `note.fallsOne` / `fallsMany` / `worldWarEve` (the eve of a fall, the engine's `fallsThisWeek` and `fallsEndTheGame`), `note.movedDashed`; round 16 (SPEC-SMALL "Rulings after the second recheck"): `act.tooLate` (the PROMISE slip of a ring that cannot pause a place at its last tick: `promiseTooLate`), `act.movesAway` / `movesAwayOne` (a dashed ring's slip: how far the nearest piece is, `nearestHold`), `act.backPrice` (what BACK IT will cost if the ring is tested: `ringBackCost`, the full price for a provocation), `act.keepCrosses` (the WITHDRAW slip of a ring a declared line covers: `linesCrossedByPromise`), `act.undoCost` (the WITHDRAW slip of a ring drawn this week, which the engine undoes: "no order yet · the {cost} influence comes back", {cost} from `RULES.promiseCost`), `act.leavesToFall` (MOVE HERE: `leavesToFall`), `note.fallsOneFar` / `fallsManyFar` (falls nothing of ours can reach this week: those not in `fallsAnswerable`), `note.spreadWorldWar` (the spread alone fills the eighth box: `spreadEndsTheGame`); HOW TO PLAY says three promises at most, the provocation's full price, WAIT's rising price, and which falls move the ladder and that each step shortens the clocks by a tick; `screen.north` (the compass letter); `screen.warOne` / `warMany` say "places" | screens |

The validator holds the fixed words to the spec: the ladder words, WE DEFEND, WORLD WAR, SEND ORDERS, BACK IT /
BACK DOWN / WAIT, PROMISE TO DEFEND, the slots each sentence needs, thirteen number words, tape lines within 46
characters once filled, capitals on every word that sits on a form or a stamp, answers that are acts.

**Number words follow the rules.** `load.test.ts` "binds every number word about a rule to RULES": every
sentence that names a rule's number ("Ten weeks", "Week ten ends", "Eight is world
war", "At 100 they sign", "three promises is the most", "costs 2 now, then 1 a week", "You gain 8 a week",
"costs 3 influence · one move a week", "From week three") is read back and compared with `RULES` (`weeks`, `warLimit`,
`willSign`, `maxPromises`, `promiseCost`, `upkeep`, `income`, `moveCost`, `wayOut.fromWeek`), and any other number word in `strings.yaml` must be bound or listed as free
(a count, the call's second and third week, a flavour line). A rule change fails the test until the words follow.
The two numbers the screens print beside a rule are not words at all: the calendar's `screen.weekOf` is "of {weeks}"
and the WAR note's `screen.warNone` / `warOne` / `warMany` end "world war at {limit}", filled from `RULES.weeks` and
`RULES.warLimit` (the validator requires both slots).

## The voice

- **Plain English, in-world.** Someone who never plays games reads the slip over the player's shoulder and can
  repeat it. No game terms: not "belief", "appetite", "state", "turn", "round", "template", "slot".
- **Forty words.** The call says the situation and what is at stake, then stops. Two or three sentences.
- **Nobody annotates.** Never a conditional about what the enemy is like: not "if they are scared of us", not "if
  you back it they fold", not "they take what's unguarded". The validator refuses `if they` and `if you` in any
  option or adviser line, warns on any other `if`, and refuses the profile words (scared of us, takes what's
  unguarded, pushes when we blink, wants three, jumpy) everywhere but the dials.
- **Three voices.** The Hawk: confident, blunt, a verb first, certain every time and wrong some of the time ("This
  is the real one. Move everything we have."). The Dove: cautious, full sentences, what was said in public and
  what it costs. The Director: only what she has seen or counted (places, numbers, hours); the validator refuses
  "they think / want / believe / mean / will" and any odds (`%`, "chance", "times in", "probably", "likely",
  "sure") in her line. The player does the inference.
- **Costs in plain words**, three clauses: what we do · what it costs · what may follow. "move the brigade up ·
  costs 12 influence · we keep our word"; "protest and hold · they'll believe us less · Lintel will likely fall";
  "a week · Lintel may fall · a second source may arrive".
- **Lines as Wintermast would declare them**: a sentence or two in the first person plural, cold, no threat
  spelled out beyond "we will not allow that". Every tape line begins "Wintermast", so the watcher knows who speaks.
- **Thoughts in the past tense, to the player**: "They were bluffing at Shoal. Backing it would have cost nothing."
- **Fictional**: the Republic (Highmarch, capital Edda Vale), the Federation (the Cap, capital Wintermast), the
  Scatter, the Sound, Farsouth and the thirty regions. Nothing real.

## Validate

```
npx tsx tools/redlines-validate.ts              # errors exit 1
npx tsx tools/redlines-validate.ts --strict     # warnings exit 1 too
npx tsx tools/redlines-validate.ts --json
npx vitest run src/redlines/content
```

(`npm run content:validate:redlines` once the integrator adds the script.) `BRINK_REDLINES_DIR=path` points every
tool at another pack.

Errors: schema (unknown keys, bad ids, a kind, key or caller outside the engine's lists, options not exactly
back/down/wait, empty text, a strings key missing or misspelled); duplicate ids and kinds; a phone over forty words
once filled; `if they` / `if you` in an option or adviser line; profile words anywhere but the dials; the Director
reading minds or giving odds; an unknown slot, a required slot missing, `{cost}` under a word other than BACK IT,
a sentence starting with `{piece}`; a label in lower case or over three words, a cost over 110 characters once
filled; an unknown region; a line in the Cap, fewer than eight lines, a declaration over 30 words, a tape line over
56 characters; fewer than eight templates or fewer than the first build needs of a kind (two inherited tests, two
feints, one each of the rest); a trawler template for a promised island without one for an unpromised island (or
one that fits both), an unpromised trawler call that claims "our promise"; Wintermast's words over 34 characters;
a missing adviser or voice; a missing debrief kind, a thought over 30 words; the ladder words, WE DEFEND, WORLD
WAR, SEND ORDERS, PROMISE TO DEFEND, the sentence slots (`phone.inHand` names {influence}, `phone.needs` {cost} and
{influence}), the number words; an answer that forecasts ("will", "may", "likely") instead of saying what you did;
the brand name or a real-world name in any text; and anything the engine's own `checkContent` lists (every
`answers` key among them). Warnings: an "if" of any
other kind, a tape line over 46 characters, a cost over 92, a missing ` · `, a thought that addresses nobody or
uses the future, a lower-case word on a form, a test without `again`, a test labelled other than BACK IT / BACK
DOWN / WAIT, a why or cause clause that does not continue its sentence. The shipped pack is strict-clean.

## For the engine and the screens

- Browser: `import { content, contentIssues, onRedlinesContentChange, fill, pick, numberWord, regionName, BLOC_NAMES } from 'src/redlines/content/index.ts'`.
  `content` is a `RedlinesPack`, which **is** the engine's `RedlinesContent` (pass it to `newGame`, `endWeek`,
  `answerPhone` as it is) plus the pack's extras; in dev a YAML save replaces it in place and calls the listeners.
- Node (engine tests, the simulator, tools): `loadRedlinesContent(root?)` from `src/redlines/content/load.ts`
  returns `{ content: RedlinesPack | null, issues }` (`content` is null only when strings.yaml did not compile).
- Types: `src/redlines/content/types.ts` re-exports the engine's (`RedlinesContent`, `Strings`, `PhoneTemplate`,
  `LineDef`, `HiddenKind` ...) and adds `RedlinesPack`, `PackLine` (`+ tape`), `PackPhone` (`+ again?`; the engine's
  `PhoneTemplate` carries `againAdvisers?` and `intelDoubted?`),
  `ScreenStrings` / `PackStrings` (the screens' sections) and `ContentIssue`. The compiler asserts at compile time
  that the strings schema and the engine's `Strings` agree, so a change to `content.ts` fails `tsc` here until the
  schema and the YAML follow.
- The pack's extras the engine uses: `line.tape` for the `declared` headline (the engine's `LineDef` carries
  it as an optional field and prints it in place of the whole declaration, so `headlines.declared` is just
  `{line}` and the tape reads "WINTERMAST: NO REPUBLIC FORCES IN THE SOUND"); `phone.again` for rounds 2 and 3
  of a carried test.
- `fill(text, slots)` (the content's, for the screens) fills `{slot}`s and capitalises a slot that starts a
  sentence; the engine's `words.ts fill` does not, hence the rule above. `missingSlots`, `pick(variants, n)`,
  `numberWord(strings.numbers, n)`.
- Regions: `src/redlines/content/regions.ts` (`REGION_INFO`, `REGION_IDS`, `BLOC_NAMES` with SND as "the Sound",
  `CAP_BLOC`, `HOME_BLOC`, `HOME_CAPITAL`, `FED_CAPITAL`, `regionName`, `blocOf`, `regionsOf`), read from the
  shared `src/war/content/map.ts` (the same data the engine's `world.ts` reads through `thirty/ui/map/data.ts`).
- The Vite plugin is `tools/vite-plugin-redlines.ts` (`redlinesContentPlugin()`, virtual module
  `virtual:redlines-content`, HMR to `src/redlines/content/index.ts`). A production build throws on content
  errors (`BRINK_CONTENT_LENIENT=1` lets a preview through).

## What is in the pack

4 advisers · 8 lines (2 proximity, 3 sea, 2 alliance, 1 missiles) · 13 phone templates (2 `test-inherited`,
2 `test`, 2 `feint`, 2 `trawler` (promised and unpromised), 2 `summit`, 1 each of `false-alarm`, `bluff-crossed`,
`fall-unpromised`) · 61 thoughts across the 52 hidden event kinds (fifteen of them the closing card's lessons) · 330
strings (58 headlines, 18 answers, 19 reasons, 7 of Wintermast's words, 19 refusals, 10 flavour lines, eight rules). Strict-clean,
and the engine's `checkContent` returns nothing.
