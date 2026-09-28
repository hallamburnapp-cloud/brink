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
- **D-041 Content hot reload** through a virtual module with HMR accept, so a run in progress keeps its state while the deck updates.
