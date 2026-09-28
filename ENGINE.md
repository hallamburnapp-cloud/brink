# ENGINE.md — how a run works

The engine (`src/engine`) is pure TypeScript with no DOM access. It takes compiled
content and a `RunState`, mutates the state in place, and returns events for the UI,
audio and simulator. Because the RNG state travels inside `RunState`, a serialised
run resumes identically and a seed replays identically.

```
createRun(content, {seed, seat, mode, difficulty, unlocked}) → RunState
view(content, state)                → CardView   (text, previews, odds %, timer)
choose(content, state, side|'timeout') → {state, events}
buryCard(content, state)            → {state, events}   (Chief of Staff)
pickPiece(content, state, pieceId)  → {state, events}   (between acts)
serialise / deserialise
```

## 1. Values

Five visible meters 0–100: **public, military, allies, economy, escalation**. Any of
the first four at 0 or 100 removes you from office; escalation at 100 is nuclear war.

Four hidden values 0–100: **trust_primary** (the primary rival's trust in you),
**trust_secondary**, **intel** (reliability of warnings), **commitment** (how publicly
boxed in you are). They are surfaced in prose through `describeHidden()` and are
only printed when an asset reveals them.

## 2. The modifier resolver (`modifiers.ts`)

Every posture piece is a list of `ModifierDef`s. The resolver applies them in one
fixed order so that the order in which pieces were acquired never matters:

```
effect delta for key k with choice tags T:

  1. filter    modifiers whose key/tags/sign match (k, T, sign(base))
  2. add       v = base + Σ add
  3. guard     if sign(v) ≠ sign(base) then v = 0        (adds never flip a cost into a gain)
  4. multiply  v = v × Π mult
  5. scale     if k is a visible meter AND the delta is a cost
                 (negative on public/military/allies/economy, positive on escalation)
               then v = v × act.effect_scale × difficulty.effect_scale
  6. round     half away from zero
  7. clamp     to the value's bounds (0..100; escalation floor/ceiling; military/economy floors)
```

`always` modifiers inject their `add` into choices that do not touch the key at all
(e.g. the Dove's "every de-escalation costs 2 allies"). Injected sums become the base
for that key and are then multiplied like any other effect; they are never counted twice.

### Worked example A — the Hawk mobilises

Choice: *Mobilise the northern corps*, effects `{ military: +4, escalation: +5, public: -3 }`, tags `[military, mobilise]`. Held: **Hawk General** (military ×1.5 on military/mobilise; escalation +2 on those tags; hides escalation cost), **Defence Contractor** (military ×1.4; economy −2 always; trust −2 always on military). Act 3 (×1.2), DEFCON 5 (×1.0).

| key | base | Σadd | guard | ×Πmult | scale (cost?) | result |
| --- | --- | --- | --- | --- | --- | --- |
| military | +4 | 0 | +4 | ×1.5 ×1.4 = 8.4 | gain: no | **+8** |
| escalation | +5 | +2 | +7 | ×1 | cost: ×1.2 = 8.4 | **+8** (hidden in preview) |
| public | −3 | 0 | −3 | ×1 | cost: ×1.2 = −3.6 | **−4** |
| economy | 0 | −2 (always) | −2 | ×1 | cost: ×1.2 = −2.4 | **−2** |
| trust_primary | 0 | −2 (always) | −2 | ×1 | hidden: no scale | **−2** |
| trust_secondary | 0 | −2 (always) | −2 | ×1 | hidden: no scale | **−2** |

The player sees military +8, public −4, economy −2 and a "?" where escalation would
be. That is the Hawk: stronger, and lying by omission.

### Worked example B — the Dove backs down

Choice: *Announce the pause*, effects `{ escalation: -8, military: -5, public: -6 }`, tags `[deescalate, walk_back]`, commitment 60. Held: **Dove FM** (escalation ×1.4 on deescalate; public ×0.6 and military ×0.7 on deescalate; allies −2 always), **Spin Doctor** (public ×0.6; commitment_lock 1.0). Act 1.

Engine pre-step (commitment trap): `walk_back` with a public cost → public × (1 + commitment/100 × lock) = −6 × 1.6 = −9.6.

| key | base | ×Πmult | result |
| --- | --- | --- | --- |
| escalation | −8 | ×1.4 | **−11** |
| military | −5 | ×0.7 | **−4** (−3.5 rounds away from zero) |
| public | −9.6 | ×0.6 (Dove) ×0.6 (Spin) | **−3** |
| allies | −2 (always) | ×1 | **−2** |

Without the Spin Doctor the same choice would cost public −4 at commitment 0 and −6 at
commitment 60. With him and a commitment of 100 it costs −7: he makes ordinary swings
smaller but turns every public reversal into a story.

## 3. Odds rolls

```
p = clamp( (base + Σadd + situational) × Πmult , 0.03, 0.97 )
situational:  adversary  +(trust_primary − 50)/200
              secondary  +(trust_secondary − 50)/200
              intel      +(intel − 50)/200
              alliance   +(commitment − 50)/250
```
The displayed percentage already includes all of this. The roll is `rng.next() < p`;
the margin `|p − roll| × 100` is reported and a margin under 5 is a **near miss**
("Missed by 3%", "Held by 2%"). Because hidden values sit inside `situational`, a
player who has spent the run building trust sees the odds move without being told why.

### Worked example C — "They blink"

Base 0.45, tags `[adversary]`. Trust with the primary rival is 22 (they expect the
worst). Held: **Red Lines** (+0.08 adversary), **Launch on Warning** (+0.08 adversary).
`p = (0.45 + 0.16 + (22−50)/200) × 1 = 0.47`. Deterrence bought 16 points; distrust
took back 14. The player sees **47%**.

## 4. Intel, warnings and false alarms

Effective reliability: `clamp((intel + Σadd) × Πmult + act.intel_shift + difficulty.intel_shift, 5, 95)`.
When a card with `warning:` is **drawn**, the engine rolls `rng < reliability/100 (+bias)`;
Hardened NC3's `warning_floor` raises the probability to at least 70%. The truth is
stored in the state (never shown) and on the choice the true or false follow-up is
queued. Content sets `false_alarm_live` on uninvestigated false branches; if it is
still set when an act ends, flashpoints with a `false_alarm_entry` are weighted ×4
and open on that entry. Launch on Warning turns that entry into a launch decision.

## 5. Timers

`seconds = clamp(round((base + Σadd) × Πmult × act.timer_scale × difficulty.timer_scale), 4, 30)`.
Expiry plays the card's `timeout` side (default right); Pre-delegation overrides it to
the side tagged military/strike/escalatory.

## 6. Drawing cards

1. Due follow-ups (`in` reached 0) in queue order, skipping any whose conditions fail.
   Inside a flashpoint only flashpoint cards surface; others wait.
2. If inside a flashpoint and nothing is due, the flashpoint ends → offer / run end.
3. If `actCards ≥ act.cards`, a flashpoint starts (weighted by `weight`, ×4 for
   false-alarm entries when a false alarm is live; each flashpoint once per run).
4. Otherwise a weighted random draw over eligible cards: not chained, not flashpoint,
   act and seat and mode match, not seen (if `once`), conditions hold. Weight =
   `weight × Π(weight mults by tag/id) × (1 + warning_frequency)` for warning cards, and
   ×0.25 for entry cards of a third concurrent arc (at most two arcs run at once).
5. Content gap fallback: any unconditioned act-appropriate card may repeat.

Each played card advances the day by `act.day_per_card` (0.5) or 0.25 inside a
flashpoint, snapshots the five meters into `trail` (for the share strip), applies
passive **drifts** (fractional drifts are applied stochastically, e.g. −0.25 per card
is a −1 one card in four), and ticks the queue.

## 7. Acts, offers, difficulty

| Act | Cards | Cost scale | Intel shift | Timer scale |
| --- | --- | --- | --- | --- |
| Week One | 14 | ×1.00 | 0 | ×1.00 |
| Week Two | 14 | ×1.10 | −5 | ×0.90 |
| Week Three | 16 | ×1.20 | −10 | ×0.80 |
| Week Four | 16 | ×1.35 | −15 | ×0.70 |
| Endgame | 10 | ×1.50 | −20 | ×0.60 |

After each flashpoint (except the last) the player is offered three pieces — one per
pool when possible — filtered by seat, unlock state and `excludes`, weighted by
`offer_weight`. Charges (Hotline Protocol de-escalations, Fixer removals) reset per act.

DEFCON tiers multiply cost scale, shift intel, shorten timers and raise starting
escalation (DEFCON 5: neutral … DEFCON 1: ×1.5, −20, ×0.65, +20).

## 8. Endings

Triggers: a meter threshold, `run_end` (after the Endgame flashpoint) or `forced` (from
a choice or odds outcome). Among endings matching the trigger, seat and conditions, the
highest `priority` wins (ties by content order); `fallback_*` endings (priority 0)
guarantee something always fires. A stand-down is a `run_end` ending whose conditions
require escalation ≤ 35.

`moment` — the card shown as "the moment it went wrong / held": for meter endings, the
card among the last ten that pushed hardest toward the fatal edge; for stand-downs, the
card that pulled escalation down the most over the whole run; otherwise the last card.

## 9. Determinism and serialisation

`RunState` is plain JSON (`serialise`/`deserialise`). The RNG (xoshiro128**) is seeded
from `"${seed}|${seat}|${difficulty}"` and its four words live in the state. The
Daily seed is `daily-YYYY-MM-DD`; "Replay this seed" reuses the same seed string.
Tests in `src/engine/*.test.ts` assert bit-identical replays and mid-run resume.

## 10. Named rules

Rules are modifiers of `kind: rule` interpreted by the engine: `hide_escalation_cost`,
`free_deescalation_per_act`, `remove_card_per_act`, `reveal_intel|trust|commitment`,
`trust_variance` (±n noise on trust deltas), `commitment_lock` (multiplier on the
commitment trap), `warning_floor`, `warning_frequency`, `launch_on_warning` (content
hook), `escalation_twitch` (+15% escalation per act from Week Three), `allies_anchor`
(allies drift toward 50), `military_floor`, `economy_floor`, `security_dilemma`
(+n escalation on military tags), `red_lines` (+n commitment on public commitments),
`escalate_to_deescalate` (limited strikes ×mult escalation; floor +5 per use, max 60),
`predelegation` (timeouts choose the military side), plus markers `nfu`, `deterrence`,
`reassurance` that content conditions on.
