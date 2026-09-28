# CONTENT.md — authoring BRINK

Everything the player reads lives in `/content` as YAML. The engine never
contains story. This document is the contract: the world, the schema, the
registries you must use (speakers, pieces, flags, tags), the numbers, the voice
guide, and eight annotated cards.

Validate with `npm run content:validate` (CI runs it). The dev server hot
reloads content: edit a card while a run is open and the next card uses it.

---

## 1. The world

Three great powers. No real states, people, atrocities or trademarks — ever.
The validator rejects a blocklist of real-world names.

| Seat | id | "the …" | Leader | Capital | Rivals (primary, secondary) |
| --- | --- | --- | --- | --- | --- |
| The Republic | `republic` | the Republic | the President | Arden | federation, coalition |
| The Federation | `federation` | the Federation | the Premier | Kaskad | republic, coalition |
| The Coalition | `coalition` | the Coalition | the Chairman | Qorum | federation, republic |

Minor states (use freely): **Vestria** (contested borderland between the powers),
**the Sorrel Straits** (the chokepoint), **the Isle of Caldor**, **Amberline** (buffer
state), **the Northern Compact** (the allied bloc; its leader is Prime Minister
Selene Varga), **the Assembly of Nations** (the multilateral body).

**Templates** in any text: `{us}` the Republic · `{Us}` · `{rival}` · `{Rival}` ·
`{other}` · `{Other}` · `{leader}` (the President) · `{capital}` · `{rival_capital}` ·
`{other_capital}` · `{rival_adj}` · `{other_adj}` · `{us_adj}` · `{rival_leader}` ·
`{other_leader}`. Write seat-agnostic cards with templates; seat-specific cards use
`seats:`.

Time: a run is Week One → Week Four → Endgame (acts 1–5). Each card is half a day.

---

## 2. File layout and ids

```
content/
  rules.yaml            acts + difficulties
  speakers.yaml         who talks (portrait manifest key = art)
  seats/<seat>.yaml
  pieces/{advisors,doctrines,assets}.yaml
  flashpoints/*.yaml    list of flashpoint definitions
  endings/*.yaml        list of endings
  cards/<arc-or-group>.yaml   list of cards, one file per arc/group
```

Ids are `snake_case`. Card ids are prefixed by their file/arc: `blackout_03_dark_pass`.
Flags are namespaced with a colon: `blackout:attributed_rival`. Engine flags you may
condition on without setting: `seat:<id>`, `mode:<daily|endless>`, `arc:<arc>` (set
when any card of that arc has been played), `piece:<id>` (held), plus every piece's
`grants` flag (see §4).

---

## 3. Schema

### Card
```yaml
- id: blackout_01_dark_sky        # required, unique
  arc: satellite_blackout         # optional; groups cards for pacing and the arc: flag
  advisor: cyber_director         # speaker id (§4.1)
  acts: [1, 3]                    # inclusive act range, or a single int; default [1,5]
  seats: [republic]               # optional; default all seats
  weight: 1.2                     # draw weight 0..10; default 1
  timer: 10                       # optional countdown seconds (design band 8–12)
  timeout: right                  # which side fires on expiry; default right
  tags: [space, attribution]      # card tags (weights + analytics)
  text: >-                        # 2–4 sentences, ≤ 520 chars
    ...
  left:  { ... }                  # choice (below)
  right: { ... }
  conditions: { ... }             # optional gate (below)
  warning:                        # optional intel-governed branch (§3.4)
    true_follow: blackout_02_confirmed
    false_follow: blackout_02_ghost
    in: 2
  once: true                      # default true (shown at most once per run)
  chained: true                   # default: true if referenced by any follow/warning/flashpoint entry
  flashpoint: fp_intercept        # only for cards inside a flashpoint sequence
  note: authoring notes, ignored
```

### Choice
```yaml
left:
  text: "Jam the uplink"                  # ≤ 60 chars, imperative or a line of dialogue
  effects: { escalation: 8, trust_primary: -6, military: 3 }   # ints, ±1..±25 (flashpoints to ±35)
  tags: [military, cyber]                  # choice tags: what modifiers match on (§4.3)
  odds:                                    # optional roll, shown before choosing
    label: Attribution
    base: 0.55
    tags: [attribution, intel]             # odds tags (§4.4)
    success: { text: "...", effects: {...}, set: [...], clear: [...], follow: [...], ending: id }
    failure: { ... }
  follow: [{ card: blackout_03_dark_pass, in: 2, chance: 0.7 }]   # queue card in N cards (0 = next)
  set: [blackout:started]
  clear: [false_alarm_live]
  ending: nuclear_midnight                 # force an ending now
  reveal: trust_primary                    # reveal a hidden value on the HUD
  spend_charge: deescalation               # uses a Hotline Protocol charge if available
```
Effect keys: `public military allies economy escalation` (visible, 0–100) and
`trust_primary trust_secondary intel commitment` (hidden, 0–100). Positive
escalation is bad. Hidden values never appear as numbers; the text must carry them.

### Conditions
```yaml
conditions:
  flags_all: [a, b]      flags_any: [c, d]      flags_none: [e]
  values: { escalation: { min: 40, max: 80 }, intel: { max: 50 } }
  pieces_any: [admiral, blue_water_fleet]   pieces_all: []   pieces_none: []
  day: { min: 8 }        seen: [card_id]   unseen: [card_id]   act_card_min: 4
```
Every flag you require must be set somewhere (card `set`, odds `set`, or a piece's
`grants`). The validator enforces this.

### Warning cards (§ the false-alarm engine)
A card with `warning:` is a report that may be true. When it is drawn, the engine
rolls against **intel reliability** (hidden `intel` ± pieces ± act). On the choice,
it queues `true_follow` or `false_follow` after `in` cards. Tag the card `warning`.
A false branch that the player does not investigate should `set: [false_alarm_live]`;
investigating clears it. If `false_alarm_live` is still set when an act ends, the
flashpoint may open on its **false-alarm entry** — a false alarm reaching a
flashpoint is the core drama. Hardened NC3 floors the truth roll; Launch on Warning
turns the false-alarm flashpoint into a launch decision.

### Flashpoint
```yaml
- id: fp_intercept
  name: The Intercept
  acts: [1, 5]
  weight: 1
  entry: fp_intercept_01
  false_alarm_entry: fp_intercept_fa_01      # optional
  conditions: { flags_none: [fp:intercept_done] }
  blurb: One line for the compendium.
```
Cards inside carry `flashpoint: fp_intercept`, chain with `follow` (`in` is forced
to 0), branch by odds and flags, and end with terminal cards that `set` an outcome
flag (e.g. `fp:intercept_restrained`). Every act must be covered by at least one
flashpoint; the Endgame (act 5) flashpoint decides the ending via `run_end`.

### Ending
```yaml
- id: standdown_summit
  name: The Communiqué
  kind: standdown                # nuclear | removed | standdown | survival | special
  trigger: { type: run_end }     # or { type: meter, key: public, at: 0 } or { type: forced }
  conditions: { flags_all: [summit:communique], values: { escalation: { max: 35 } } }
  seats: [republic]              # optional
  priority: 30                   # highest matching wins; fallbacks are priority 0
  text: >-                       # 2–5 short paragraphs, story quality, ≤ 1600 chars
  moment_label: The moment it held
  compendium: One line for the compendium.
  emoji: "🕊️"
  achievements: [standdown_any]  # optional meta unlock ids
```
Required fallbacks (priority 0): `fallback_nuclear`, `fallback_<meter>_<0|100>` for the
four office meters, `fallback_standdown`, `fallback_survival`, `fallback_special`.
Stand-down means the endgame flashpoint finished with escalation ≤ 35.

---

## 4. Registries (use these exactly)

### 4.1 Speakers (`advisor:`)
`aide` Mara Quell (private secretary, default voice) · `hawk_general` · `dove_fm` ·
`intel_director` · `spin_doctor` · `ambassador` · `cyber_director` · `treasury` ·
`admiral` · `peace_leader` · `contractor` · `fixer` · `hotline` · `watch_officer` ·
`press` · `ally_leader` · `rival_leader` · `other_leader` · `opposition` · `family` ·
`scientist` · `envoy` · `legal`. Voices in §6.

### 4.2 Pieces and the flags they grant (`pieces_any:` / `flags_all:`)
Advisors: `hawk_general`→has_hawk · `dove_fm`→has_dove · `paranoid_intel`→has_paranoid_intel ·
`cautious_intel`→has_cautious_intel · `spin_doctor`→has_spin · `ambassador`→has_ambassador ·
`cyber_director`→has_cyber_director · `treasury_hawk`→has_treasury · `fixer`→has_fixer ·
`admiral`→has_admiral · `peace_leader`→has_peace_leader · `contractor`→has_contractor.
Doctrines: `launch_on_warning`→doctrine_low · `deterrence_by_denial`→doctrine_denial ·
`strategic_ambiguity`→doctrine_ambiguity · `no_first_use`→doctrine_nfu ·
`escalate_to_deescalate`→doctrine_e2d · `alliance_first`→doctrine_alliance_first ·
`fortress`→doctrine_fortress · `transparency`→doctrine_transparency · `red_lines`→doctrine_red_lines ·
`hotline_protocol`→doctrine_hotline · `predelegation`→doctrine_predelegation · `minimal_deterrence`→doctrine_minimal.
Assets: `early_warning`→asset_ew · `back_channel`→asset_back_channel · `cyber_unit`→asset_cyber_unit ·
`missile_defence`→asset_md · `blue_water_fleet`→asset_fleet · `hardened_nc3`→asset_nc3 ·
`commercial_sat`→asset_comsat · `allied_basing`→asset_basing · `strategic_reserve`→asset_reserve ·
`rapid_response`→asset_rrb · `signals_intercept`→asset_sigint · `civil_defence`→asset_civil_defence.

Pieces are the build. Give every piece at least two cards that only appear when it is
held (`pieces_any`), and at least one card that punishes or complicates it.

### 4.3 Choice tags (modifiers match on these — spell them exactly)
Stance: `military` `strike` `limited_strike` `mobilise` `deterrence` `reassurance`
`deescalate` `concede` `back_channel` `diplomacy` `public_commitment` `walk_back`
`sanction` `investigate` `stall` `transparency` `secrecy` `escalatory`.
Domain: `naval` `blockade` `cyber` `attribution` `space` `proxy` `probe` `missile_defence`
`misperception` `alliance` `alliance_demand` `nuclear` `warning` `commitment_trap`
`economy` `domestic` `intel` `personal` `basing` `entanglement` `filler`.
Rules: a choice that publicly ties your hands is `public_commitment`; one that reverses
a stated position is `walk_back` (the engine multiplies its public cost by
commitment level — the commitment trap). Limited strikes are `limited_strike` (E2D).
Hotline de-escalations that should be free under Hotline Protocol carry
`spend_charge: deescalation` and the `deescalate` tag.

### 4.4 Odds tags
`adversary` (rival must back down; trust shifts the odds ±25%) · `secondary` (other power) ·
`intel` (intel reliability shifts odds) · `alliance` (commitment shifts odds) · `intercept` ·
`attribution` · `cyber` · `naval` · `diplomacy` · `back_channel` · `first_use` · `military` ·
`strike` · `proxy`. Always show what the roll is for in `label` ("Intercept", "They blink").

### 4.5 Arcs and their flags (cross-arc hooks must use these names)
| Arc (`arc:`) | Flags (`<arc>:<state>`) | Piece hooks |
| --- | --- | --- |
| `satellite_blackout` | started, attributed_rival, attributed_other, accident, retaliated, resolved | cyber_director, early_warning, commercial_sat, cyber_unit |
| `false_alarm` | reported, investigated, stood_down, acted; engine flag `false_alarm_live` | hardened_nc3, launch_on_warning, paranoid_intel, cautious_intel, early_warning |
| `undersea_cables` | cut, attributed, repaired, escorted, retaliated | admiral, blue_water_fleet, treasury_hawk, strategic_reserve, cyber_director |
| `proxy_incident` | clash, advisers_in, brigade_deployed, ceasefire, escalated, withdrawn | rapid_response, hawk_general, allied_basing, alliance_first |
| `cyber_early_warning` | intrusion, attributed, purged, counterhacked, disclosed | cyber_unit, early_warning, hardened_nc3, transparency |
| `blockade` | declared, ours, run, lifted, shots_fired | admiral, blue_water_fleet, fortress, strategic_reserve |
| `defector` | arrived, believed, doubted, returned, public | paranoid_intel, cautious_intel, signals_intercept, spin_doctor, transparency |
| `debris_cascade` | event, blamed_us, blamed_rival, moratorium, cascade | commercial_sat, missile_defence, cyber_director |
| `ultimatum` | received, issued, deadline_passed, met, backed_down, called_bluff | red_lines, spin_doctor, strategic_ambiguity, hotline_protocol |
| `summit` | proposed, agreed, collapsed, held, communique | ambassador, back_channel, dove_fm, no_first_use, envoy |

Flashpoints: `fp_intercept` (The Intercept, acts 1–5, has false-alarm entry) ·
`fp_line_at_sea` (The Line at Sea, acts 1–4) · `fp_midnight` (Midnight, acts 2–5) ·
`fp_cascade` (The Cascade, acts 2–4) · `fp_summit` (The Summit, acts 3–5). Outcome flags:
`fp:<id>_<outcome>` e.g. `fp:intercept_restrained`, `fp:midnight_backed_down`, `fp:summit_communique`.

---

## 5. Numbers

| | Act 1 | Act 2 | Act 3 | Act 4 | Act 5 |
| --- | --- | --- | --- | --- | --- |
| Cards before flashpoint | 14 | 14 | 16 | 16 | 10 |
| Cost scale (engine) | ×1.0 | ×1.1 | ×1.2 | ×1.35 | ×1.5 |
| Intel shift | 0 | −5 | −10 | −15 | −20 |
| Timer scale | ×1.0 | ×0.9 | ×0.8 | ×0.7 | ×0.6 |

Author base numbers for act 1 and let the engine scale costs:
- Ordinary card: effects ±3..±8 on one or two meters, ±3..±10 on hidden values.
- Arc development: ±6..±12. Arc resolution: ±10..±18.
- Flashpoint: ±12..±30; a catastrophic failure may force an ending.
- Escalation: ordinary +2..+8 / −2..−6; flashpoint −10..−20 on a good resolution.
- A choice should never be free. Both choices should cost something; the good choice
  costs the thing you can currently least afford.
- Odds `base` 0.35–0.75; tag it so pieces and hidden values move it.
- Timers on ~20% of cards, 8–12 seconds; the timeout side should be the worse one.
- Weight: 1 default; 0.6 for rare flavour; 1.5–2 for entry cards you want most runs to see.
- Cards per arc: 22–30 across acts 1–5, at least 3 non-chained entry points with
  different act ranges so the arc can start early or late.

---

## 6. Voice guide

Tone: tense, dry, occasionally darkly funny, never edgy for its own sake, never
preachy. The theory is felt as consequence; nobody says "security dilemma". Advisors
are people with agendas, not tutorials. Card text: 2–4 sentences, ≤ 520 characters,
present tense, concrete nouns (a number, a place, a time). Choice text: ≤ 60
characters, no ellipses, no "Option A". Never explain a mechanic in the text; the
preview icons do that.

Sentence rules: one idea per sentence. A speaker's first sentence is the fact, the
last is the pressure. Vary length; one short sentence per card is a good rhythm.

| Speaker | How they speak |
| --- | --- |
| aide (Mara Quell) | Calm, procedural. Reads the schedule at 3am. Rarely opines; when she does it lands. |
| hawk_general (Vasska) | Clipped, capabilities and windows. Says "them", never "the enemy". Hides cost in passive voice. |
| dove_fm (Marrow) | Long view, dry, weary. Reaches for what the other side sees. "We" means the world. |
| intel_director (Lyle) | Hedged to the exact degree of confidence: "we assess", "single source", "moderate confidence". Never "I think". |
| spin_doctor (Karrick) | Fast, headlines and half-lives. Every problem is framing until it isn't. |
| ambassador (Okonkwo-Reyes) | Courteous, anecdotes that turn out to be warnings. Remembers the last crisis. |
| cyber_director (Vance) | Precise, allergic to false certainty. "Consistent with" is not "is". |
| treasury (Roke) | Numbers, then consequences, then a dry joke. |
| admiral (Volanski) | Plain, loyal, distances and hours. What a captain does when he cannot reach you. |
| peace_leader (Delacroix-Amin) | Moral, unhurried, addresses you as a person. Often right, which is the problem. |
| contractor (Ashby-Tal) | Smooth. Says "capability" where others say "weapon". Always has a product. |
| fixer (Nkemelu) | Polite text, profane spirit. Solves it and never says how. |
| hotline | Translated, formal, a beat late. The pauses are the message. |
| watch_officer (Rennick) | Reads the board: times, tracks, confidence. |
| press (Ferrante) | Questions that are statements. Knows the leak before you do. |
| ally_leader (Varga) | Warm in public, blunt in private. Asks what you will do. |
| rival_leader / other_leader | Only via hotline, summit or statement. Never a villain; a man with a domestic audience. |
| opposition (Ahlgren) | Reasonable tone, lethal timing. |
| family (Jonah) | Asks if you have eaten. Short. Real. |
| scientist (Benn-Sato) | Physics as weather. Frightening because he is not frightened. |
| envoy (Lindqvist) | Multilateral, patient, there to be blamed for the compromise. |
| legal (Castellane) | What you may do versus what you can later be seen to have done. |

---

## 7. Eight annotated cards

```yaml
# 1. ARC ENTRY — non-chained, wide act range, sets the arc's first flag.
- id: blackout_01_dark_sky
  arc: satellite_blackout
  advisor: cyber_director
  acts: [1, 3]
  weight: 1.5                      # most runs should meet this arc
  tags: [space, attribution]
  text: >-
    At 02:14 our reconnaissance satellite over the Sorrel Straits stopped
    answering. No debris, no flash, no warning. It is consistent with a jammer,
    a laser, or a power fault. I can give you which one in two days or a guess
    in two minutes.
  left:
    text: "Give me the guess"
    effects: { intel: -6, escalation: 3 }        # you act on worse information
    tags: [intel, stall]
    set: [blackout:started]
    follow: [{ card: blackout_02_guess, in: 1 }]
  right:
    text: "Take the two days"
    effects: { military: -3, public: -2 }        # the generals hate waiting
    tags: [investigate, intel]
    set: [blackout:started]
    follow: [{ card: blackout_02_report, in: 3 }]
```
```yaml
# 2. WARNING CARD — truth decided by intel reliability; the false branch may go live.
- id: false_alarm_01_two_tracks
  arc: false_alarm
  advisor: watch_officer
  acts: [1, 5]
  timer: 10                        # time pressure: the timeout side is the worse one
  timeout: left
  tags: [warning, nuclear]
  warning: { true_follow: false_alarm_02_confirmed, false_follow: false_alarm_02_ghost, in: 1 }
  text: >-
    Two tracks out of the northern sector, ballistic profile, confidence
    moderate. The second radar has not picked them up yet. You have about
    ninety seconds before I have to wake the release authority.
  left:
    text: "Wake them"
    effects: { escalation: 6, military: 3 }
    tags: [military, nuclear]
    set: [false_alarm:acted]
  right:
    text: "Wait for the second radar"
    effects: { military: -4, intel: 3 }
    tags: [stall, intel, nuclear]
```
```yaml
# 3. FALSE BRANCH — chained; if uninvestigated the false alarm goes live.
- id: false_alarm_02_ghost
  arc: false_alarm
  advisor: intel_director
  acts: [1, 5]
  tags: [nuclear, intel, misperception]
  text: >-
    The second radar saw nothing. The first is now reporting a software
    exception. We assess, with low confidence, that there were no tracks.
    The General's staff want the alert level kept where it is.
  left:
    text: "Stand down and pull the logs"
    effects: { military: -3, intel: 5, escalation: -2 }
    tags: [investigate, deescalate]
    set: [false_alarm:investigated, false_alarm:stood_down]
    clear: [false_alarm_live]
  right:
    text: "Keep the alert level"
    effects: { military: 3, escalation: 3, public: -2 }
    tags: [military, nuclear]
    set: [false_alarm_live]           # the ghost survives — a flashpoint may open on it
```
```yaml
# 4. ODDS ROLL — probability shown before the choice; hidden trust moves it.
- id: ultimatum_05_the_call
  arc: ultimatum
  advisor: hotline
  acts: [2, 5]
  conditions: { flags_all: [ultimatum:received], flags_none: [ultimatum:deadline_passed] }
  tags: [diplomacy, commitment_trap]
  text: >-
    "{Rival_leader} is prepared to extend the deadline by seventy-two hours,
    if {us} announces a pause in the deployments." A pause. Not a
    withdrawal. The translator repeats the word twice.
  left:
    text: "Announce the pause"
    effects: { escalation: -8, military: -5, commitment: -10 }
    tags: [deescalate, walk_back, diplomacy]        # walk_back: costs more the more committed you are
    set: [ultimatum:backed_down]
  right:
    text: "Call the bluff"
    effects: { commitment: 8 }
    tags: [deterrence, public_commitment]
    odds:
      label: They blink
      base: 0.45
      tags: [adversary]                              # trust_primary shifts this ±25%
      success: { effects: { escalation: -6, public: 8, trust_primary: -4 }, set: [ultimatum:called_bluff] }
      failure: { effects: { escalation: 14, allies: -6 }, set: [ultimatum:deadline_passed], follow: [{ card: ultimatum_06_after_midnight, in: 0 }] }
```
```yaml
# 5. PIECE-GATED LINE — only with the Admiral; makes the build feel like a build.
- id: blockade_07_her_ships
  arc: blockade
  advisor: admiral
  acts: [1, 4]
  conditions: { flags_all: [blockade:declared], pieces_any: [admiral] }
  tags: [naval, blockade]
  text: >-
    Three of theirs, five of ours, forty miles of water and one tanker that has
    not answered a hail in six hours. My captains can board her before dawn.
    Or they can shadow her and let the world watch who moves first.
  left:
    text: "Board her"
    effects: { military: 6, escalation: 7, economy: 2 }
    tags: [naval, military, escalatory]
    odds:
      label: Boarding
      base: 0.6
      tags: [naval]
      success: { set: [blockade:run], effects: { public: 5, trust_primary: -6 } }
      failure: { set: [blockade:shots_fired], effects: { escalation: 10, public: -6 } }
  right:
    text: "Shadow her"
    effects: { military: -2, escalation: 1, allies: 3 }
    tags: [naval, stall, reassurance]
```
```yaml
# 6. DOMESTIC PRESSURE — seat-specific voice, no arc; keeps the deck deep.
- id: dom_fed_03_the_queue
  advisor: treasury
  seats: [federation]
  acts: [2, 5]
  tags: [domestic, economy]
  text: >-
    Bread is not the problem. The queue is the problem, because it is outside a
    bank and it is on camera. I can open the reserve. I can also let the
    cameras find something else to film.
  left:
    text: "Open the reserve"
    effects: { economy: -7, public: 6 }
    tags: [economy, domestic]
  right:
    text: "Move the cameras"
    effects: { public: -4, military: 2, trust_secondary: -3 }
    tags: [domestic, secrecy]
```
```yaml
# 7. ADVISOR PERSONAL LINE — loyalty and rivalry; the build talks back.
- id: adv_hawk_dove_01
  advisor: aide
  acts: [2, 5]
  conditions: { pieces_all: [hawk_general, dove_fm] }
  tags: [personal, domestic]
  text: >-
    The General and the Foreign Minister have both asked to see you alone
    before the security council. Separately. Neither knows the other asked.
    I can give them ten minutes each, or put them in the same room.
  left:
    text: "Same room"
    effects: { military: -3, allies: 4, intel: 3 }
    tags: [personal, transparency]
  right:
    text: "Ten minutes each"
    effects: { military: 3, allies: -2, commitment: 4 }
    tags: [personal, secrecy]
```
```yaml
# 8. FLASHPOINT TERMINAL — inside a sequence, sets the outcome flag, big swings.
- id: fp_intercept_06_restraint
  flashpoint: fp_intercept
  advisor: hawk_general
  acts: [1, 5]
  timer: 8
  timeout: left
  tags: [nuclear, military]
  text: >-
    Intercept confirmed. One warhead, non-nuclear, into the sea. They will call
    it a test. I have a package that answers a test with a test, and I can have
    it airborne in four minutes.
  left:
    text: "Send the package"
    effects: { escalation: 18, military: 8, public: 4, trust_primary: -15 }
    tags: [strike, military, escalatory]
    set: [fp:intercept_retaliated]
  right:
    text: "Call it a test"
    effects: { escalation: -12, military: -8, public: -5, trust_primary: 6 }
    tags: [deescalate, reassurance]
    set: [fp:intercept_restrained]
```

---

## 8. Checklist before you commit a file

- `npm run content:validate` passes with no errors (warnings are advice).
- Every flag you require is set somewhere; every follow-up target exists.
- Every arc has 3+ entry cards with staggered act ranges and a resolution.
- No real-world names. No "TODO". No mechanics explained in prose.
- Each card reads well aloud in the speaker's voice.
