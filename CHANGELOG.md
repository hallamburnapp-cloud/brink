# Changelog

All notable changes to BRINK. Dates are UTC.

## 0.1.0 — 2026-09-28 (build night)

### Engine
- Seeded xoshiro128** RNG with serialisable state and string seeds.
- Data model for cards, choices, odds, follow-ups, conditions, warnings, pieces, modifiers, endings, seats, flashpoints, acts and difficulties.
- Modifier resolver with documented deterministic order (add → sign guard → multiply → cost scaling → round → clamp), `always` injections, odds/intel/timer/weight resolution, escalation floors and ceilings.
- Run state machine: draw with arc pacing, warning truth rolls, odds with near misses, follow-up queue, flashpoint sequences with false-alarm entries, between-act offers, drifts and named rules, ending selection and "the moment it went wrong".
- Vitest coverage for RNG, resolver order, conditions, run transitions, serialisation and replay determinism.

### Content pipeline
- Zod schema and compiler for YAML content; semantic validator (dangling references, reachability, impossible conditions, flashpoint cycles, unreachable endings, deck depth, fictional-world lint).
- Vite virtual module `virtual:brink-content` with hot reload; CLI `npm run content:validate`.
- Rules (5 acts, 5 DEFCON tiers), 23 speakers, 3 seats, 36 posture pieces.
