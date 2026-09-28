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

## Content
- **D-030 Hidden values in prose.** `describeHidden()` gives four bands per value; card text and advisor language carry them. Only Signals Intercept reveals numbers.
- **D-031 Fictional names.** Powers: Republic (Arden), Federation (Kaskad), Coalition (Qorum). Minor states: Vestria, Sorrel Straits, Isle of Caldor, Amberline, Northern Compact, Assembly of Nations. The validator rejects real-world names.
- **D-032 One speaker for both intel directors.** Director Lyle speaks on warnings whichever piece you hold; the piece changes what he brings you, not his face.

## Tech
- **D-040 Preact over React** for the initial-JS budget. **Tailwind v4** via the Vite plugin. **Zod** only at build/validate time; runtime content is compiled JSON in a virtual module.
- **D-041 Content hot reload** through a virtual module with HMR accept, so a run in progress keeps its state while the deck updates. Content changes route through `handleHotUpdate` so Vite never falls back to a full reload mid-run.
- **D-042 Content chunk.** Compiled content is a separate chunk (~60 KB gzipped) loaded with the app; the size check reports it separately from the 40 KB app bundle, and both together sit well under the 250 KB budget.
- **D-043 No webfonts.** System serif and monospace stacks; zero third-party requests, instant offline.

## Product
- **D-050 Daily seat rotation** is independent of unlocks: the Daily is free and every seat appears in rotation, which is also the cheapest way to let players taste locked seats.
- **D-051 itch.io build ships everything unlocked** (`VITE_ALL_UNLOCKED=1`) as the brief asks; unlock *progress* is still tracked, so the service record fills in. A future switch to "paid but with the ladder" is one env var (`VITE_PAYWALL=0 VITE_ALL_UNLOCKED=0`).
- **D-052 Cohort analytics without identifiers.** `days_since_first_run` (an integer computed on the device) rides on `run_start` and `daily_played` so day-7 return can be read as a cohort proportion. Still no cookies, no ids.
- **D-053 Locked seat hints are shown in the seat picker** rather than hidden: the unlock condition is the marketing.
