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

`kind` is what of yours crosses it, in the covered regions (the engine's rule): `proximity` either piece standing
there, `sea` the fleet there, `missiles` the brigade there (it carries them), `alliance` a WE DEFEND ring there.
Regions are the map's three-letter ids and never in the Cap. Exactly eight lines; the engine draws three before
week 1 (two real, one a bluff), prints each on the tape (`headlines.declared`) and writes the opening's collision
from one of the real ones. `text` is Wintermast's own words (30 words or fewer); `tape` is the pack's extra, the
headline form, because a whole declaration does not fit the teleprinter (see "For the engine").

The eight shipped: `sound-forces` (proximity · the Sound), `scatter-forces` (proximity · the Scatter), `cap-lanes`
(sea · Driftholm, Kelpmouth), `shoal-strait` (sea · Shoal, Lintel), `farsouth-alliance` (alliance · Farsouth),
`scatter-promises` (alliance · the Scatter), `north-missiles` (missiles · Vessary, Rimeholt), `south-ports` (sea ·
Brindle Coast, Marram, Floe End). The MOMENT.md collision is an inherited promise to Lintel against
`sound-forces`: keeping the promise puts the brigade in the Sound.

## Phones

```yaml
- id: test-inherited-armour
  kind: test-inherited   # test | test-inherited | feint | false-alarm | trawler | bluff-crossed | summit | fall-unpromised
  caller: hawk
  text: "Federation armour is at {region}, the promise you inherited. Two brigades, lights on, not moving. They want to see what you do."
  again: "A week on. The armour at {region} has not moved, and there is more of it. ..."   # test kinds: rounds 2 and 3, after WAIT
  advisers:
    hawk: "Move now. Or never promise anything again."
    dove: "Keeping it puts {piece} on their doorstep. Think how that looks from Wintermast."
    intel: "Two brigades at {region}. Lights on since dusk. Their radio went quiet at midnight."
  options:
    back: { label: BACK IT,   cost: "move {piece} up · costs {cost} influence · we keep our word" }
    down: { label: BACK DOWN, cost: "protest and hold · they'll believe us less · {region} will likely fall" }
    wait: { label: WAIT,      cost: "a week · {region} may fall · a second source may arrive" }
```

- `text` is the 3am call: forty words or fewer **once the slots are filled** (the validator counts `{region}`,
  `{piece}` and `{from}` as two words each), in-world, dry, tense, ending in a full stop.
- **The three test kinds are one pool.** The engine draws a real push and a feint from `test`, `test-inherited`
  and `feint` alike (`test-inherited` first when the promise was inherited), so no template is a tell: the
  Director's observations must be true of a real push and of a feint ("Their fuel trucks have not been found";
  "I count one regiment, their radio says two"). The Hawk is confident in every template and wrong whenever the
  push was for show; the debrief says which it was. `again` is the message when the same call comes back after
  WAIT; on round 3 the engine replaces the WAIT cost with `words.waitIsBackDown`.
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
| `{piece}` | your nearest piece, **with its article** | `strings.pieces`: "the brigade", "the fleet" (so write "move {piece} up", never "the {piece}") |
| `{from}` | the other heading's place | its name |
| `{step}` | the ladder word | TESTING ... ALL-OUT |
| `{line}` | a declared line's whole text | up to 30 words: quote it nowhere in a call (the validator warns) |

The engine's `fill` does not capitalise, so no sentence may start with `{piece}` (the validator refuses it).
Thoughts may also use `{why}` (a reason from `strings.why`) and `{n}`; strings may use any of these plus
`{term} {bloc} {at} {week} {fighting} {because} {cause} {a} {b} {hold}`. A kind's required slot: every kind but
`summit` names `{region}`.

### What each kind is, and what the three keys do (`src/redlines/engine/content.ts`, `phone.ts`, `resolve.ts`)

| kind | when it rings | back | down | wait |
| --- | --- | --- | --- | --- |
| `test` / `test-inherited` / `feint` | their forces have arrived at a promised place and not moved | BACK IT: move the piece up, costs `{cost}` (12; 6 once believed; 24 from too far, and it may fail; +6 a round) | BACK DOWN: belief falls, the place likely falls | WAIT: the call comes back next week, stakes up; the third WAIT is backing down |
| `false-alarm` | early warning at `{region}` (MASSING and above; never an instant loss) | go on alert: force they can see | stand down | a second source |
| `trawler` | an allied island (`{region}`, a Scatter port) has seized a Federation trawler | back the ally | disown them | lean on them privately |
| `bluff-crossed` | you crossed a declared line at `{region}` and Wintermast has said nothing | hold your ground | pull back | wait and see |
| `summit` | Wintermast proposes a summit | accept (costs influence; counts as a way out) | refuse | ask for terms (the offer lapses) |
| `fall-unpromised` | a place nobody promised will fall this week and `{piece}` could reach it | send what you have | let it go | protest |

## Debrief

```yaml
- kind: feintBackedDown          # one of the engine's HIDDEN_KINDS
  thoughts:
    - "They were bluffing at {region}. Backing it would have cost nothing."
```

One entry per hidden event kind (all 28 of `HIDDEN_KINDS` are required), variants to pick from (the engine picks
by seed), each in the past tense, addressed to the player, 30 words or fewer. The engine writes one filled thought
into that week's `WeekLog.hidden` for every hidden decision it makes; the ending screen replays them under the
player's own orders (`strings.acts`). The kinds: `heading feint bothReal notTested feintBacked feintBackedDown
feintWaited realBacked realBackFailed realBackedDown realWaited waitedFell lineReal lineBluff fall spread
wayOutAccepted wayOutRefused accident jumpy jumpyQuiet believed doubted falseAlarm trawler summit unpromised
bluffPhone`. `{why}` is filled from `strings.why` ("They went for Lintel because nobody had promised it."); the
dials are named by `strings.dials` ("They were {a} and {b}." with hungry / patient / not very hungry and easily
scared / watchful / not easily scared).

## Strings

The first sections are the engine's `Strings`, key for key (its `checkContent` lists any missing key); the
sections from `title` on are the screens'. Every section of `strings.yaml` and who reads it:

| section | holds | reader |
| --- | --- | --- |
| `words` | WE DEFEND, TESTED, FIGHTING, BACK IT, BACK DOWN, WAIT, `steps` (TESTING PUSHING MASSING FIGHTING ALL-OUT), `waitIsBackDown`, SEND ORDERS, A WAY OUT, THEY ARE, WAR, TREATY, WORLD WAR, FROZEN, WEEK, influence | engine, map, screens |
| `explanation` | the three lines of SPEC-SMALL "The game in three sentences" | screens |
| `collision` | the opening's dilemma by what collides: `alliance`, `forces`, `near` (slots `{region}`, `{line}`, `{piece}`), `heading` | engine (`GameState.collision`) |
| `blocs`, `pieces`, `terms`, `numbers`, `counts` | "the Sound"; "the brigade", "your alert", "your promise"; the way-out nouns; number words 0..12; "one place still fighting" | engine |
| `endings`, `because`, `causes` | the two typed lines of each ending (`{week}`, `{fighting}`, `{because}`, `{region}`, `{cause}`); the treaty's reasons; the world war's "when ..." clauses | engine (`Ending.lines`) |
| `dials` | the dial words and "They were {a} and {b}." | engine (`Ending.dials`) |
| `why` | the 16 reasons that fill `{why}` | engine |
| `headlines` | the 42 tape lines the engine writes, 46 characters once filled | engine (`headline`, `WeekLog.visible`) |
| `acts` | the player's orders as the log writes them | engine (`WeekLog.acts`) |
| `refusals`, `hold` | the words for a refused order and for a solid or dashed ring (the engine returns codes) | screens |
| `title`, `screen`, `act`, `note`, `phone`, `menu`, `debrief`, `howToPlay`, `flavour` | PLAY / CONTINUE / HOW TO PLAY, the WAR note, PROMISE TO DEFEND / WITHDRAW / MOVE HERE, the way-out form, the handwritten situation note ("They are pushing {bloc}." "They have taken {region}." "Your promise at {region} is being tested now."), INCOMING, the menu, THE DEBRIEF's words, the seven rules a player can read, in-world headlines for a thin week | screens |

The validator holds the fixed words to the spec: the ladder words, WE DEFEND, WORLD WAR, SEND ORDERS, BACK IT /
BACK DOWN / WAIT, PROMISE TO DEFEND, the slots each sentence needs, thirteen number words, tape lines within 46
characters once filled, capitals on every word that sits on a form or a stamp.

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
feints, one each of the rest); a missing adviser or voice; a missing debrief kind, a thought over 30 words; the
ladder words, WE DEFEND, WORLD WAR, SEND ORDERS, PROMISE TO DEFEND, the sentence slots, the number words; the brand
name or a real-world name in any text; and anything the engine's own `checkContent` lists. Warnings: an "if" of any
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
  `LineDef`, `HiddenKind` ...) and adds `RedlinesPack`, `PackLine` (`+ tape`), `PackPhone` (`+ again?`),
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

4 advisers · 8 lines (2 proximity, 3 sea, 2 alliance, 1 missiles) · 11 phone templates (2 `test-inherited`,
2 `test`, 2 `feint`, 1 each of `false-alarm`, `trawler`, `bluff-crossed`, `summit`, `fall-unpromised`) · 36
thoughts across the 28 hidden event kinds · 243 strings (42 headlines, 16 reasons, 14 refusals, 10 flavour
lines). Strict-clean, and the engine's `checkContent` returns nothing.
