# ENGINE.md — how a run works

The engine (`src/engine`) is pure TypeScript with no DOM access. It takes compiled
content and a `RunState`, mutates the state in place, and returns events for the UI,
audio and simulator. Because the RNG state travels inside `RunState`, a serialised run
resumes identically and a seed replays identically.

```
createRun(content, {seed, seat, mode, difficulty, unlocked}) → RunState
view(content, state)                     → CardView (text, previews, odds %, timer, LEVERAGE breakdown, accident)
choose(content, state, side|'timeout')   → {state, events}
buryCard / useOrder(content, state, i)   → {state, events}      during a card
buyPiece / sellPiece / rerollShop / buyOrder / removeTag / leaveShop   in the shop
continueRun(content, state)              → into endless acts after a win
serialise / deserialise
```

The core loop is **brinkmanship scaling**: every choice scores leverage; each act sets a
leverage target (the ante) that must be reached before its flashpoint; political capital
buys posture pieces and one-shot orders in the shop; living high on the escalation curve
multiplies everything and invites accidents; escalation 100 is nuclear war.

## 1. Values

Five visible meters 0–100: **public, military, allies, economy, escalation**. Any of
the first four at 0 or 100 removes you from office; escalation at 100 is nuclear war
(unless the Deadman Switch is held and unused, which resets it to 70 once).

Four hidden values 0–100: **trust_primary**, **trust_secondary**, **intel** (warning
reliability), **commitment** (how publicly boxed in you are). Surfaced in prose via
`describeHidden()`; printed only when an asset reveals them.

Run economy: **political capital** (spent in the shop), **act leverage** against the
**act target**, and **score** (total leverage, the number to beat).

## 2. Leverage (`leverage.ts`)

Every choice carries a printed **base** (authored, or derived by the compiler from
its effects and tags: bigger moves and escalatory moves are worth more). Pieces carry
`leverage` modifiers that add base, add mult or multiply mult when their tags and
conditions match, `retrigger` modifiers that score matching choices again, and
`scale` modifiers that grow a permanent bonus during the run.

```
1. base       = printed base + Σ base_add (pieces, run-grown bonuses)
2. multAdd    = 1 + Σ mult_add (pieces, run-grown bonuses)
3. mult       = multAdd × Π mult_mult (pieces, "Double Down" orders)
4. escMult    = curve(escalation)  ×(1 + 0.3 × endless acts)
5. retriggers = Σ retrigger pieces + queued order retriggers
   total      = round(base × mult × escMult × (1 + retriggers))
```

Escalation curve (piecewise linear): ×1 at 0–29, ×2 at 50, ×5 at 80, ×12 at 95, ×20 at 99.
Leverage is computed on the state **as shown** (before the choice's effects), so the
preview is exactly what is scored. Per-step modifiers (`per: escalation, per_above: 50,
per_step: 10, mult_add: 0.5`) add their term once per full step above the threshold.

### Worked example — Madman at 92

Choice *Send the package*, base 24, tags `[strike, military]`. Held: **Hawk General**
(+8 base, +0.5 mult on military), **Madman Theory** (×3 while escalation ≥ 90; +0.5 mult
per 10 above 50), **Second Strike** (retrigger strikes). Escalation 92.

| step | value |
| --- | --- |
| base | 24 + 8 = 32 |
| multAdd | 1 + 0.5 (Hawk) + 2.0 (Madman: 4 steps × 0.5) = 3.5 |
| mult | 3.5 × 3 (Madman ≥ 90) = 10.5 |
| escMult | curve(92) = 9.8 |
| retriggers | 1 (Second Strike) |
| total | 32 × 10.5 × 9.8 × 2 = **6,586** |

The same card at escalation 30 with no pieces scores 24. That gap is the game.

## 3. Accidents

Ordinary cards drawn at escalation ≥ 50 may carry an accident (75% of the time when the
chance is non-zero). The chance follows escalation: 4% at 50, 12% at 70, 22% at 85,
35% at 95, 45% at 99, then × piece `accident` multipliers (Signals Intercept 0.7, Madman
1.2 …). The type (false alarm, misread, rogue commander, attribution error) and the
probability are shown on the card before the choice. On the choice the engine rolls;
Madman Theory rolls twice and fires if either fires; Perfect Intel resolves the roll on
draw and shows WILL FIRE / CLEAR. Severity scales ×1 at 50 → ×2 at 100, × piece
`severity_mult` (Hardened NC3 0.6). A false-alarm accident sets `false_alarm_live`, so
the next flashpoint can open on its false-alarm entry. Surviving a fired accident, or
weathering one that does not fire, feeds `scale` pieces (Iron Nerve, Paranoid Director).

## 4. Antes and flashpoints

Each act has a target (rules.yaml: 250, 450, 1,200, 3,200, 7,000; × difficulty
`target_scale`; endless acts ×2 each, matching the endless climb). Leverage from ordinary cards accumulates in
`actLeverage`; flashpoint cards add to the score but not to the ante. When the act's
cards are spent:

- **met**: capital += 4 + act, plus +1 per extra 50% of the target (max +4); ≥ 2× the
  target is a **smash** (`ante_smashed` scale trigger, the big slam);
- **missed**: the bluff is called: a `bluff: true` card (or the flashpoint's `bluff_entry`)
  plays first, with two punishing choices, then the flashpoint sequence proceeds. With no
  flashpoint left for the act the bluff card is dealt on its own. Banking at least half the
  target still pays a consolation of 2 PC.
- Every act after the first also pays a stipend of 2 PC at its start, so a build keeps growing
  after a called bluff (constants in `leverage.ts`: `ACT_STIPEND`, `CONSOLATION`, `CONSOLATION_RATIO`).

Flashpoints are chosen by act range and weight (×4 for a false-alarm entry when a false
alarm is live), each once per run (repeatable in endless). Inside a flashpoint only
flashpoint cards (and bluff cards) surface; ordinary follow-ups wait.

## 5. The shop

Opens after each flashpoint (and once mid-act at the halfway card, or after a card with
`shop: true`). Offers 4 pieces (+`extra_offer`) weighted by rarity (common 10, uncommon
6, rare 2.5, legendary 0.8) × `offer_weight`, priced by rarity (3/5/8/12 × `shop_discount`),
and 2 orders. Reroll costs 2, +1 per reroll (`free_rerolls` first); selling returns 50%
(`sell_bonus`); removing a tag from the deck costs 4, once per visit, from a fixed list of
removable tags. Max 6 pieces (`extra_piece_slot`) and 2 orders (`extra_order_slot`).
`excludes` and unlock state filter offers; capital never goes below 0.

## 6. Orders

One-shot consumables used during a card: meter deltas (Stand-Down Order −20 escalation),
`retrigger_next`, `mult_next`, `reveal`, `skip_accident` (only consumed if an accident is
attached), `bury`, `capital`, `charge` (a Hotline charge), `leverage` (flat score).

## 7. Endless

A winning `run_end` ending (stand-down or survival) sets `canContinue`. `continueRun`
opens a shop and begins act 6 with the target ×2, the escalation curve ×2 per endless act, cost scale +0.15 per act, intel −5
per act, timers −5% per act, and the escalation curve ×(1 + 0.3 × endless acts). It ends
only by losing. Score is total leverage; the best is kept locally (no names, no network).

## 8. The modifier resolver (`modifiers.ts`)

Meter effects resolve in one fixed order so acquisition order never matters:

```
1. filter    modifiers whose key/tags/sign match
2. add       v = base + Σ add          (`always` adds inject effects on untouched keys)
3. guard     if sign(v) ≠ sign(base) → 0   (adds never flip a cost into a gain)
4. multiply  v = v × Π mult
5. scale     costs (negative office meters, positive escalation) × act.effect_scale × difficulty.effect_scale
6. round     half away from zero;  7. clamp (0..100; escalation floor/ceiling; military/economy floors)
```

Named rules with level semantics (`warning_floor`, `military_floor`, `economy_floor`,
`sell_bonus`) take the strongest value; `shop_discount` and `escalate_to_deescalate`
multiply; the rest sum.

### Worked example — the Dove backs down

*Announce the pause*, `{escalation −8, military −5, public −6}`, tags `[deescalate, walk_back]`,
commitment 60. Held: Dove FM (escalation ×1.4 on deescalate; public ×0.6; military ×0.7;
allies −2 always), Spin Doctor (public ×0.6; commitment_lock +1).

Commitment trap first: public × (1 + 0.6 × (1 + 1)) = −6 × 2.2 = −13.2. Then the
resolver: escalation −11, military −4 (−3.5 rounds away from zero), public −13.2 × 0.36 =
**−5**, allies −2. Without the Spin Doctor: −6 × 1.6 × 0.6 = −6. He dampens the noise and
raises the price of reversing.

## 9. Odds rolls

`p = clamp((base + Σadd + situational) × Πmult, 0.03, 0.97)` with situational terms
`adversary +(trust_primary − 50)/200`, `secondary`, `intel +(intel − 50)/200`, `alliance
+(commitment − 50)/250`. The roll and its margin are reported; a margin under 5 points is a
near miss ("Missed by 3%").

## 10. Intel, warnings, timers, drawing

Reliability `clamp((intel + Σadd) × Πmult + act.intel_shift + difficulty.intel_shift, 5, 95)`;
a warning card's truth is rolled on draw (Hardened NC3 floors it at 70%) and its true or
false follow-up is queued on the choice. Timers `clamp(round((base + Σadd) × Πmult ×
act.timer_scale × difficulty.timer_scale), 4, 30)`; expiry plays the card's timeout side
(Pre-delegation: the military side). Drawing: due follow-ups first (in order, flashpoint
cards only inside their flashpoint), then a weighted random draw over eligible cards
(act, seat, mode, `once`, conditions, removed tags, ×0.25 for a third concurrent arc's
entry, warning frequency for cards with a truth roll); with nothing eligible, any
act-appropriate card may repeat.

After every ordinary card (never a flashpoint or bluff card) the act's two drifts apply:
**cooling** takes `act.cooling` expected points off escalation while it is above 25 (a crisis
nobody feeds cools; the ladder is climbed on purpose), and **recovery** moves each office meter
`act.recovery` expected points toward 50 (opinion regresses, markets recover, alliances
persist). Fractions are rolled on the run's RNG, so replays match. Both are set per act in
rules.yaml (0.5 and 0.15 at launch) and inherited by endless acts.

## 11. Endings and "the moment"

Triggers: meter threshold, `run_end`, or `forced`. Highest priority among matching
endings wins; `fallback_*` guarantee something fires. Stand-down requires escalation ≤ 35
at the end of the Endgame flashpoint. The moment card: the card that pushed hardest
toward the fatal edge in the last ten (meter endings), the biggest escalation cut of the
run (stand-down), the single biggest score (survival), else the last card.

## 12. Determinism

`RunState` is plain JSON. The RNG (xoshiro128**) is seeded from `"${seed}|${seat}|${difficulty}"`
and its state lives in the run. Nothing in the engine reads the clock or `Math.random`.
