# DECISIONS.md

Open design decisions, chosen for fun and finishability, logged as they were made.

## Project home
- **D-001 Repository.** The brief says "this empty repo", but the session was attached to four existing repositories and creating a new one was refused (GitHub App integration: 403). BRINK is built as a fully self-contained project at `brink/` and pushed to the designated branch `claude/brink-game-build-0csh6q` of `flashpoint-2027`. It does not read, import or depend on anything outside `brink/`. Moving it to its own repository is one command (`git subtree split -P brink -b brink-main`). See BLOCKERS.md.

## Engine
- **D-010 Modifier order.** Sum additive modifiers, then multiply, then scale by act × difficulty, then round half away from zero, then clamp. Addition-before-multiplication makes acquisition order irrelevant, which makes builds legible. An additive modifier can never flip an effect's sign (it becomes 0 instead) so pieces can soften costs but never turn a cost into a benefit.
- **D-011 Scaling applies to costs only.** Act and difficulty scaling multiplies costs (negative meter deltas, positive escalation) but not benefits, otherwise late-game healing pieces would grow with the pressure they are meant to resist.
- **D-012 Hidden values are never scaled.** Trust, intel and commitment are the slow story of the run; act pressure is expressed through the visible meters and the intel shift.
- **D-013 Integer meters, fractional drifts.** Meters stay integers. A drift of −0.25 per card is applied as a −1 with probability 0.25 from the seeded RNG, which keeps state small and replay exact.
- **D-014 Odds situational terms.** Rolls tagged `adversary` gain (trust − 50)/200, `intel` rolls gain (intel − 50)/200, `alliance` rolls gain (commitment − 50)/250. Hidden values therefore decide flashpoints without ever being printed.
- **D-015 Near miss = within 5 points.** Displayed as "Missed by 3%" or "Held by 2%".
- **D-016 Warning truth decided on draw.** So the UI can never leak it, and the seed alone fixes it.
- **D-017 Arc pacing.** At most two arcs with pending follow-ups; entry cards of further arcs are weighted ×0.25 until one resolves.
- **D-018 Offers.** Three pieces, one per pool when possible, weighted by `offer_weight`, filtered by seat, unlock state and `excludes`. No currency in v1.
- **D-019 Stand-down threshold.** Escalation ≤ 35 when the Endgame flashpoint ends.
- **D-020 The moment it went wrong.** For meter endings, the card in the last ten that pushed hardest toward the fatal edge; for stand-downs, the card that pulled escalation down the most in the whole run; otherwise the last card.
- **D-021 Timeout side.** Authored per card (default right); Pre-delegation overrides it to the military option.
- **D-022 Minimal Deterrence ceiling.** Escalation is capped at 95 while held: you cannot drift into war, only be pushed by a forced flashpoint ending. Balanced by ×1.5 military losses and weaker deterrence.

## Brinkmanship scaling (the redesign)
- **D-060 Leverage order.** base adds → mult adds → mult multipliers → escalation multiplier → retriggers. Addition before multiplication keeps piece order irrelevant; retriggers multiply the whole result so they read as "score it again". The preview equals the score (computed on the pre-choice state) so there are no hidden surprises in the tally.
- **D-061 Derived base.** Authors may omit `base`; the compiler derives it from the size of the move so the 300+ cards written before the redesign score sensibly. Hand-tuned bases override.
- **D-062 Escalation curve.** As briefed: ×1 to 29, ×2 at 50, ×5 at 80, ×12 at 95, ×20 at 99, linear between. Endless adds +30% per act so scores keep climbing.
- **D-063 Accidents live above 50.** Chance 4%→45% from 50 to 99, attached to 75% of ordinary cards there, shown as a percentage before the choice; severity ×1→×2. Flashpoint and bluff cards never carry accidents (they are already the danger).
- **D-064 Antes count ordinary cards only.** Flashpoint leverage goes to the score, not the ante, so the ante is decided before the flashpoint and the bluff card can precede it.
- **D-065 Ante rewards.** 4 + act capital for meeting, +1 per extra 50% (max +4), "smashed" at 2×; missing plays a generic bluff card (six authored) or the flashpoint's own.
- **D-066 Shop economy.** Prices by rarity 3/5/8/12, starting capital 4, reroll 2 rising by 1, sell 50%, tag removal 4 once per visit, cap 6 pieces / 2 orders. A mid-act shop opens at the halfway card (acts of 8+ cards) so the first act is not pieceless.
- **D-067 Act 1 target 250** rather than 300 so a pieceless first act at moderate escalation can still meet it; later targets as briefed, to be tuned by the simulator.
- **D-068 Endless is opt-in after a win** and repeats flashpoints; the daily record is filed at the first ending, so continuing never changes a Daily result.
- **D-069 Deadman Switch is once per run** and leaves escalation at 70 (or the floor if higher), so a Madman run keeps its multipliers but not its immunity.
- **D-070 Rules that are levels merge by max, discounts by product, counts by sum** so duplicate rules from two pieces behave sensibly.
- **D-071 The engine publishes outcome flags** (`accident:*`, `ante:*`, `peak:*`, `deadman:fired`, `endless`; CONTENT.md §4.6) instead of exposing run stats to conditions. Endings and cards condition on the same vocabulary, the validator can whitelist it, and the flag list is the whole contract.
- **D-072 Accident endings outrank story endings.** When an accident took escalation to 100 (`accident:fatal`), the accident is the story, so the four accident wars sit at priority 45; story nuclear endings live at 20–40 and the generic fallback at 0.
- **D-074 Cooling is an act knob, not a card.** Escalation cools 0.5 per ordinary card above 25 (`cooling` in rules.yaml). Without it a neutral deck drifted +1.05 escalation per card and every calm build still died at 100; with it the ladder has to be climbed on purpose, which is the design, and the knob is one number per act instead of 700 card edits.
- **D-075 Flashpoint numbers are ±8..±16, not ±12..±30.** The old band made a five-card flashpoint unsurvivable from a healthy state on either path; the engine's act scaling (×1.1..×1.5) still makes late flashpoints bite.
- **D-076 A missed ante is not a death spiral.** Every act after the first pays a 2 PC stipend and a near miss (≥ 50% of the target) pays 2 PC consolation, so a build that stumbles in Week Two can still grow; the bluff card and the lost reward remain the punishment.
- **D-077 The heuristic bot is calibrated, not fitted.** Its escalation pricing, wall (80 unless it holds a brink piece), odds expectation and forced-ending avoidance were changed because it made trades no player would (signing a resignation letter because it had no printed cost); every such change is logged in BALANCE.md and none reads the content it plays against.
- **D-073 Endless never ends by run_end.** Every endless act reopens the shop; the run ends only by a meter hitting 0 or 100, and two endless-only removed endings (public and military at 100) say what happens to a leader who will not stop.

## The night (the redesign, 2026-09-29)
- **D-078 Two rulesets, one engine.** `daily` and `night` run the simple ruleset (no accidents, antes, shop, pieces, orders, leverage display or endless); `endless` and `challenge` keep the Expert game untouched. One `RunState`, one replay path, one content set; `rulesetFor(mode)` is the only switch. Rebuilding a second engine for a wide audience would have thrown away 315 tests and a balanced deck for no player-visible gain.
- **D-079 Nothing on the run screen is a number except the clock.** Five glyph dials with a fill and a colour, preview dots for the tilted choice, odds as a word (Likely ≥ 0.7, Even ≥ 0.5, Risky), percentages only on the crisis cards, and a roll overlay without a scale. The Expert HUD is the same components with the numbers on.
- **D-080 Seven minutes of the clock per card; 21 cards, then the crisis.** 3:00am to 6:00am at seven minutes a card is 25 cards; five acts of 5/5/5/5/1 spend 21 on ordinary cards and leave the crisis's own cards to run the clock to 5:59, and dawn is 6:00 exactly. The day counter still ticks underneath (0.1 per card) so the Expert record and the moment logic keep working.
- **D-081 The crisis only at the end.** One flashpoint per night, weighted by the arcs the night touched, so the shareable strip ends in a spike rather than five. The four earlier acts have `flashpoint: false`; the first draft with a flashpoint per act made the night twelve minutes long and killed the random bot before 4:00 every time.
- **D-082 Dawn is named by the dials.** Two run-end endings above the flashpoint outcomes: A Quiet Dawn (every dial in the middle and danger below 40) and A Red Dawn (danger 75+), so the night's shape, not only its last card, picks the dawn; the flashpoint-specific dawns fill the middle. Added when the calm bot saw The Empty Chair at Vellmar in 36.5% of its nights (N4).
- **D-083 The danger dial moves the crisis odds.** `resolveOdds` gains `(50 − danger) / 250` on every roll of the night's flashpoint (±0.2 between an empty and a full dial), in the night only. Measured before the link: the calm bot arrived at the crisis with danger at a median of 67 and the crisis killed 44% of the nights that reached it regardless of how they had gone; after it, arriving at 30–49 gives 72% dawn and 85+ gives 20%, so the visible dial is the lever a player can learn without a tutorial. Hidden values still shift odds as in Expert.
- **D-084 The night's drifts and scales.** Office costs ×1.6 → ×2.6 across the five acts (the deck was authored for a 70-card run; the night is 21), escalation scale ×1.0 throughout, cooling 0.3 per ordinary card, no recovery. The first night draft removed both drifts and ramped escalation to ×1.3, which sent every careful night into the crisis at danger 80+; cooling 0.3 with a flat escalation scale puts the median arrival at 59 and lets a player who protects the danger dial arrive calm.
- **D-085 The night's targets replace T1–T5 for the simple ruleset.** N1 calm bot dawn 45–65%, N2 random bot dawn < 10%, N3 average night 2–4 minutes at 7 s a card, N4 no ending in more than 35% of calm nights, N5 the crisis ends 25–45% of the calm nights that reach it. The first draft of REDESIGN.md said 30–45% for N1 and was revised before any tuning to it: a daily people return to is one a careful player wins about half the time, and the bot reads the dials better than a person will. N5 was first written as "share of falls in the crisis", which for a bot that never falls on a dial is always ~95% and measures the bot, not the design; it now measures the crisis's own kill rate.
- **D-086 The voice contract is a validator rule, not a style guide.** Card text ≤ 2 sentences and ≤ 180 characters, choices ≤ 34, outcomes ≤ 160, endings ≤ 2 paragraphs and ≤ 420, compendium ≤ 120, a banned-jargon list, no ellipses in choices; `BRINK_VOICE=strict` turns the warnings into errors and becomes the CI default once the rewrite lands. Speakers are shown role first ("Your General"), name second.
- **D-087 The record counts nights and dawns.** `Stats.nights` and `Stats.dawns` are kept apart from Expert's runs and days; the night-by-night history shows Dawn or the time of the fall. Best-days and the piece statistics stay Expert-only.
- **D-088 Unlock copy says "Night after night", never "Endless".** Endless is an Expert mode, not the product; the one purchase is described by what it gives (any night, any seat, seeds, Expert) on the paywall, the unlock page, Settings and Privacy.

## Content
- **D-030 Hidden values in prose.** `describeHidden()` gives four bands per value; card text and advisor language carry them. Only Signals Intercept reveals numbers.
- **D-031 Fictional names.** Powers: Republic (Arden), Federation (Kaskad), Coalition (Qorum). Minor states: Vestria, Sorrel Straits, Isle of Caldor, Amberline, Northern Compact, Assembly of Nations. The validator rejects real-world names.
- **D-032 One speaker for both intel directors.** Director Lyle speaks on warnings whichever piece you hold; the piece changes what he brings you, not his face.

## Tech
- **D-040 Preact over React** for the initial-JS budget. **Tailwind v4** via the Vite plugin. **Zod** only at build/validate time; runtime content is compiled JSON in a virtual module.
- **D-041 Content hot reload** through a virtual module with HMR accept, so a run in progress keeps its state while the deck updates. Content changes route through `handleHotUpdate` so Vite never falls back to a full reload mid-run.
- **D-042 Content chunk.** Compiled content is a separate, dynamically imported chunk (~169 KB gzipped at 450 cards and 92 endings) loaded at boot; the size check counts only the initial JS (49 KB gzipped of a 250 KB budget) and reports the content chunk separately.
- **D-043 No webfonts.** System serif and monospace stacks; zero third-party requests, instant offline.

## Product
- **D-050 Daily seat rotation** is independent of unlocks: the Daily is free and every seat appears in rotation, which is also the cheapest way to let players taste locked seats.
- **D-051 itch.io build ships everything unlocked** (`VITE_ALL_UNLOCKED=1`) as the brief asks; unlock *progress* is still tracked, so the service record fills in. A future switch to "paid but with the ladder" is one env var (`VITE_PAYWALL=0 VITE_ALL_UNLOCKED=0`).
- **D-052 Cohort analytics without identifiers.** `days_since_first_run` (an integer computed on the device) rides on `run_start` and `daily_played` so day-7 return can be read as a cohort proportion. Still no cookies, no ids.
- **D-053 Locked seat hints are shown in the seat picker** rather than hidden: the unlock condition is the marketing.
