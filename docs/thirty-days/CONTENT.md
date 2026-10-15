# BRINK: THIRTY DAYS — writing the cards

The pack is `content-thirty/`. It is YAML, checked by a strict schema and a validator, compiled to one JSON
module at build and dev time. The spec is `SPEC.md` in this folder; this file is the format and the voice.

## The files

```
content-thirty/
  advisers.yaml        the six advisers who speak (id, name, role, voice)
  pieces.yaml          the twelve team pieces (rule as printed, tags)
  regions.yaml         single-day cards: at least one for every one of the 30 regions
  domestic.yaml        the Chief of Staff's cards (public, economy), set at home
  map.yaml             the map-tap cards (where the fleet goes, where the envoy flies ...)
  arcs/<arc>.yaml      one file per arc, 3 to 5 cards chained by follow-ups
```

Every file is a YAML list. A card in `arcs/blockade.yaml` must say `arc: blockade`; nothing else may.

## A card

```yaml
- id: strait-01                 # kebab-case, unique across the pack
  arc: blockade                 # omit on single-day, domestic and most map cards
  adviser: admiral              # foreign | general | intel | admiral | chief | ambassador
  region: SHL                   # today's region, ringed on the map (a three-letter id from the map)
  day: [3, 12]                  # days it may be drawn, inclusive; omit for [1, 30]
  when: { heat: [1, 3] }        # optional: heat range of the region, pieces held / not held
  text: Federation ships are sitting across the Shoal strait. Our tankers are turning back. The crews want orders.
  left:  { text: Escort the tankers through, tag: FORCE, hint: "Danger down here · heats Lintel", heats: LTL, follow: strait-02 }
  right: { text: Reroute and talk,           tag: CALM,  hint: "Danger down · slower", follow: { card: strait-03, in: [1, 3] } }
```

`text` is the message: two or three sentences, 40 words or fewer. `left` and `right` are the two buttons.

### A choice

| key | meaning |
| --- | --- |
| `text` | the action, 3 to 5 words (quote it if it has a comma) |
| `tag` | `CALM` cools today's region by 1 · `FORCE` cools it by 2 and heats one neighbour by 1 · `RISKY` rolls `odds`: success cools by 2, failure heats by 1 · `HOME` leaves the map alone but holds off the next domestic card |
| `hint` | one line, at most 60 characters, plainly what will happen (see "Hints") |
| `odds` | `RISKY` only, 5 to 95: the chance it holds |
| `heats` | a region that heats one step. On a `FORCE` choice, the neighbour that takes the heat (it must border the card's region) |
| `crisis` | a region elsewhere that rises to CRISIS (an arc's consequence) |
| `relieve` | a region elsewhere whose CRISIS falls to TENSE |
| `mark` | a lasting mark on the card's region: `red-line`, `warned`, `guarded` (see types.ts) |
| `follow` | the next card of the arc: `strait-02` (due in 1–2 days), or `{ card: strait-02, in: 3 }`, or `in: [1, 3]` |
| `fail` | `RISKY` only: `{ heats, crisis, relieve, mark, follow }` applied when the roll misses, on top of the +1 heat |

Everything in `heats`, `crisis`, `relieve` and `fail` must be said in the hint. Nothing happens that the player was not told.

### Conditions

`when: { heat: [1, 3], pieces: [red-lines], without: [spin-doctor] }`. `heat` is the range the card's region
must be in (0 CALM, 1 TENSE, 2 CRISIS, 3 WAR); `pieces` must all be held; `without` none. All optional.

### A map card

```yaml
- id: fleet-map
  adviser: admiral
  map: true
  day: [2, 28]
  text: The fleet can be in one place by morning. Tap where it goes.
  targets:
    - { region: SHL, hint: "Calms the strait" }
    - { region: ORN, hint: "Warns Orrinth off · heats Dunmarrow", tag: FORCE, heats: DNM, mark: warned }
    - { region: VSY, hint: "Guards home", mark: guarded }
```

Two or three `targets`; each glows on the map with its `hint` as the label and acts on the tapped region by its
`tag` (`CALM` unless said). A target takes the same keys as a choice, minus `text`. `region` is optional on a
map card. The "where to draw the red line" card needs `when: { pieces: [red-lines] }` and `mark: red-line`.

### Domestic cards

`domestic: public` or `domestic: economy`, adviser `chief`, region in Highmarch (VSY, RMH, QLN, EDV, ASK, MRD).
The engine holds one back when yesterday's choice was `HOME`; the Spin Doctor stops them altogether.

### Arcs and follow-ups

An arc is 3 to 5 cards in `arcs/<arc>.yaml`. The entry card (no follow-up names it) is drawn by its day
range; the others are `chained` and come only when a follow-up is due. A follow-up's due window
(`card.day + in`) must overlap the target's own `day` range, and both cards must be in the same arc. A branch
is just two follow-ups: `left` to one card, `right` to another.

## Advisers and pieces

`advisers.yaml`: `id`, `name` (fictional), `role`, `voice` (one line for the writer, never shown), optional
`portrait` key. `pieces.yaml`: `id`, `name`, `chip` (one word, at most 12 characters), `icon`, `kind`
(`adviser` | `policy`), `rule` (exactly as printed when the chip is tapped), `tags` (one or two of `CALM`,
`FORCE`, `RISKY`, `HOME`, `any`, `arcs`, `map`), optional `excludes`. The twelve pieces are the spec's table.

## The voice

- Plain English, in-world. Someone who never plays games reads the card over the player's shoulder and knows what
  is happening and what the two buttons do.
- No game terms. Not "heat", "region", "tag", "effect", "roll", "turn". The one allowed word is DANGER, and only in hints.
- Every card names its region in the message, by its name ("the Shoal strait", "Wintermast") or its bloc ("the Cap").
  The validator warns when it cannot find either.
- 40 words or fewer. Two or three sentences. Say the situation, say what is at stake, stop.
- Each adviser sounds like themselves (`voice` in advisers.yaml): the Foreign Minister measured, the General blunt,
  the Intel Director hedged, the Admiral dry, the Chief of Staff domestic and tired, the Old Ambassador warm.
- Actions are 3 to 5 words, a verb first: "Escort the tankers through", "Reroute and talk".
- All places, people and powers are fictional: the Republic (Highmarch), the Federation (the Cap), the Scatter,
  Sundry, Farsouth, and the 30 regions of the map. No real names, brands or countries.

### Hints

A hint says what will happen, in two parts joined by ` · `. First, what DANGER does; then the consequence in
the world:

```
Danger down · the strait calms
Danger down here · heats Lintel          (a FORCE choice: names the neighbour)
Holds 70% · if real, the Cap burns       (a RISKY choice: the odds, then the miss)
Nothing changes abroad · a quiet day at home   (a HOME choice)
```

The hint is what the player sees before committing. When pieces change the outcome (Old Ambassador and
Back-Channel turning one Talks into a wave of calm), the game says so on the same line in words
("Danger down · calms 5 regions"); the authored hint is the plain case.

## Validate

```
npm run content:validate:thirty            # errors exit 1
npm run content:validate:thirty -- --strict   # warnings exit 1 too
npm run content:validate:thirty -- --json
npx vitest run src/thirty/content
```

Errors: schema (unknown keys, bad ids, missing hint, odds outside 5–95 or on a non-RISKY choice, message over
40 words, action over 6 words, hint over 60 characters, map card with fewer than 2 or more than 3 targets,
reversed day range), duplicate ids, unknown regions, advisers and pieces, follow-ups to missing cards, to other
arcs or with no day overlap, a FORCE `heats` that is not a neighbour, a domestic card away from home, an arc
with no entry card, a card in the wrong arc file. Warnings: a region with no card, an arc with fewer than 3
cards, a message that does not name its region, an action outside 3 to 5 words, a one-sided `excludes`.

`BRINK_THIRTY_DIR=path` points every tool at another pack. The dev server reloads the pack on save and keeps
the last good one while a file is mid-edit; a production build refuses a pack with errors.

## For the engine and the UI

`src/thirty/content/index.ts` exports `content` (the compiled `ThirtyContent`), `contentIssues`, and
`onThirtyContentChange(fn)`. Node code (tests, validator, simulator) uses `loadThirtyContent(root?)` from
`src/thirty/content/load.ts`. Types are in `src/thirty/content/types.ts`; the region table (ids, names, blocs,
neighbours, `HOME_BLOC`, `HOME_CAPITAL`) in `src/thirty/content/regions.ts`. The Vite plugin is
`tools/vite-plugin-thirty.ts` (`thirtyContentPlugin()`, virtual module `virtual:thirty-content`).

## The cast

Everything is fictional. Five powers share the map; the player is the Republic.

| Power | Bloc on the map | Regions, and what each one is for in the cards |
| --- | --- | --- |
| **The Republic** (us) | Highmarch (HMR) | Edda Vale (the capital; the Chief of Staff's cards), Vessary (our northern port and radar network, facing Northwake), Rimeholt (port; the ferry and cable to Gullrest), Quillon (mines and the rail line), Ashkettle (southern fishing port, facing Brindle Coast), Morrow Downs (port; the Tern Isle garrison sails from here) |
| **The Federation** (the rival) | The Cap (CAP) | Wintermast (the capital; its president and parliament), Northwake (main port, troop ships), Frostmere (missile fields), Wenmoor (tank exercises), Glassmoor (shipyards, facing Driftholm), Kellmark (rocket launch site, facing Kelpmouth) |
| **The Coalition** | Sundry (SND) | Formally neutral, leaning Federation. Tallowmere (the capital; a parliament that votes on a Federation pact), Kelpmouth (port; our consulate), Brackwater (oil), Lintel (the port on the Shoal), Dunmarrow (small; a new radar on its hill), Orrinth (hard-line; a militia on the Floe End road) |
| **The Scatter** | The Scatter (SCT) | The island league, neutral by habit and friendly to us; it hosts talks. Lantern Key (the capital; the minister with the old dog), Gullrest (the cable landing), Driftholm (facing Glassmoor; fish for fuel), Tern Isle (our garrison), Pebbleby (fishing), Shoal (the strait our tankers use) |
| **Farsouth** | Farsouth (FRS) | The non-aligned south. Marram (the capital; hosts the summit), Brindle Coast (our oldest treaty ally), Floe End (our training team), Iceward (cold and poor), Saltwhite (farmers), Hearth (takes in the families from Floe End) |

Our friends by name, which the "which ally to reassure" card calls: Brindle Coast (treaty), Tern Isle (garrison), Gullrest
(cable). Floe End has our trainers; Kelpmouth has our consulate.

The six advisers (`advisers.yaml`) and the tic that makes each one recognisable in a line:

| Adviser | Name | Sounds like |
| --- | --- | --- |
| Foreign Minister | Mara Teshen | Measured. "We might", never "we must". Weighs the other side's reasons. |
| General | Ruun Halder | Blunt. Numbers first, short sentences, "decide by nightfall". |
| Intel Director | Dagny Fell | Hedged. "Probably. Possibly." Names the gap in what she knows. |
| Admiral | Tomas Reyde | Dry. Calls ships by what they carry ("the big grey ships with the ramps"); one wry note a card. |
| Chief of Staff | Wen Adair | Domestic and tired. Queues, prices, the morning papers; wants one quiet day. |
| Old Ambassador | Aurelio Stane | Warm. Knew everyone's mother; remembers an older crisis that ended fine. |

Recurring people, never named: Wintermast's president and his chief of staff (the aide who liked chess); Lantern Key's
minister (and her dog, Admiral); Marram's president; Tallowmere's foreign minister; Lintel's mayor; Orrinth's governor
("the loud one") and its militia leader; the Federation colonel of The Defector; Floe End's mayor.

## The arcs

Ten arcs, four cards each (40 cards). Every arc branches at its first card and closes on a fourth card both branches
reach, so a player sees three cards of each arc in a game and a different middle card on replay. Day ranges are set so a
whole arc fits before day 30.

| Arc | File | Cards | Shape | Where | The story |
| --- | --- | --- | --- | --- | --- |
| The Blockade | `blockade.yaml` | strait-01..04 | 01 → 02 (Lintel) / 03 (Lantern Key) → 04 | SHL, LTL, LNK | Federation ships close the Shoal. Escort and Lintel turns on us; talk and the Ambassador gets a room. Then: is the strait open? |
| The False Alarm | `false-alarm.yaml` | alarm-01..04 | linear | WMS, FRM | Wintermast raises readiness; six launches that are not real (alarm-02); the truth about Frostmere; a shared early-warning line. |
| Satellite Blackout | `satellite-blackout.yaml` | blackout-01..04 | 01 → 02 (ask) / 03 (fly) → 04 | NWK | Our eyes over Northwake go dark for four days; troop ships load; what moved while we were blind? |
| Undersea Cables | `undersea-cables.yaml` | cables-01..04 | 01 → 02 (repair) / 03 (boarding, DRF) → 04 | GUL, DRF | The Gullrest cable is cut under a survey ship; splice it or board her; then Gullrest asks for ships for good. |
| Proxy Incident | `proxy-incident.yaml` | proxy-01..04 | 01 → 03 (we left) / 02 (we shot back, ORN) → 04 (MRM) | FLE, ORN, MRM | Our trainers at Floe End take fire from over the Orrinth line; Marram's president rings the Ambassador. |
| Cyberattack on Early Warning | `cyberattack.yaml` | cyber-01..04 | 01 → 02 (went dark) / 03 (hunted) → 04 (WMS) | VSY, WMS | Someone is inside Vessary's radar network; blind nights or a hunt to a Kelpmouth office; Wintermast offers a treaty. |
| The Defector | `defector.yaml` | defector-01..04 | 01 → 02 (he gets out, TRN) / 03 (he goes back) → 04 (TLM) | KLP, TRN, TLM | A Federation colonel walks into the Kelpmouth consulate; his papers point at Tern Isle; Tallowmere asks what our word is worth. |
| Debris Cascade | `debris-cascade.yaml` | debris-01..04 | 01 → 02 (joint clean-up) / 03 (debris hits) → 04 | KLM | The Federation shoots down a satellite over Kellmark; the debris takes the Scatter's weather birds; a rule against it. |
| The Ultimatum | `ultimatum.yaml` | ultimatum-01..04 | 01 → 02 (thinned) / 03 (reinforced) → 04 (LNK) | TRN, LNK | Two days to leave Tern Isle (only when Tern Isle is already tense); Lantern Key offers its own small flag. |
| The Summit | `summit.yaml` | summit-01..04 | 01 → 02 (they come) / 03 (no summit yet) → 04 | MRM | Marram will host if we ask first; be snubbed or wait; the side door; who pulls back from the Scatter first. |

Two arcs use `fail.follow` beside `follow` on a RISKY button (defector-01 right, summit-01 left): a hit goes one way,
a miss the other. The engine schedules one of the two, never both.

## What is in the pack

127 cards: 40 arc cards (10 arcs × 4), 68 single-day cards in `regions.yaml` (two for every region, the first of each
pair unconditioned so a region always has a card, plus four for days 1–5 and four for days 24–30), 13 domestic cards
for the Chief of Staff (`domestic.yaml`: 7 public, 6 economy, across Edda Vale, Quillon, Rimeholt, Ashkettle, Morrow
Downs and Vessary), and 6 map cards (`map.yaml`: fleet, envoy, which front comes home, where the brigade stands, which
ally hears from us, where the red line goes). Buttons and targets: 126 CALM, 54 RISKY, 43 FORCE, 35 HOME. Risky odds
run 55–75. The validator is clean with `--strict`.

### Hints, as written

- `Danger down · <what the world does>` for CALM; `Danger down here · heats <neighbour>` for FORCE, with `, guards <here>`
  or `, <here> is warned` / `warns <here> off` when the choice also carries a mark.
- `Holds N% · if <the miss>, <region> heats` for RISKY; a `fail.crisis` is said as `<region> boils over` or `joins in`.
- `Nothing changes abroad · <what happens at home or in the room>` for HOME, on every card including those set abroad,
  so the four forms stay recognisable.
- `relieve` is said as `<region> eases`; a `heats` on a CALM button as `<region> takes fright`.

### What the engine must know that the schema does not say

1. **Which card is the false alarm.** alarm-02 is the one the Cautious Intel Director marks and the one Launch on
   Warning's +20 applies to. There is no schema key; the engine can hold the id, or the schema can grow `alarm: true`.
2. **Which risky choices are "talks"** for the Dove Foreign Minister ("risky talks become certain"). No key; the
   simplest rule is a RISKY button on a `foreign` or `ambassador` card, or a map target whose hint starts "Talks".
3. **`fail.follow`** on a RISKY button replaces `follow` on a miss (defector-01, summit-01).
4. **`heats` on a CALM button or target** (ultimatum-02 right, pullback-map's Tern Isle) is a plain +1 step on the named
   region, applied after the tag's own effect.
5. **A `when.heat` of `[0, 1]`** marks a quiet-day card (schoolchildren's letters, a fish deal); `[1, 3]` a card that
   needs trouble already there. The first card of every region pair has no condition.
