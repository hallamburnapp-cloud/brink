# BRINK: the war-room roguelike

Balatro-style building where the world map is the hand, played from a war room.

- `DESIGN.md`: the chosen design in full, why it meets the owner's three anchors, its risks and open questions.
- `PROTOTYPE-SPEC.md`: the spec for the playable slice (map data, patterns, scoring order, staff, Orders, the shop, timings, the first-night seed, simulator gates).
- `STUDY.md`: the research on Balatro and on what the owner likes, the audit of this repository, the five designs, the judges and the ranking.
- `reference/`: a Python reference implementation of the rules. `python3 ex2.py` and `python3 ex3.py` print the worked examples the spec quotes (Front 252; 10,920 against 8,736 when two staff swap seats); the TypeScript engine must reproduce them. `map.json` is the thirty regions with positions, ports, neighbours and sea lanes; `preview.png` is the greybox map.

Decision: D-102 in `DECISIONS.md`.

## The playable slice

- Play it: `npm run dev:war` (or `npm run build:war` for `dist-war/`, playable from any static host or sub-path).
- Code: `src/war/engine` (rules, BigInt scoring, run state machine; its README is the API), `src/war/content` (map, patterns, staff, Orders), `src/war/ui` (the war room: `map/` canvas renderer, `icons/`, `director/` scoring animation, board, rail, readout, controls, briefing, screens), `src/war/sim` and `tools/war-sim.ts` (bots and balance gates).
- Tests: `npm run test:war`, `npm run e2e:war`, `npm run sim:war` (about 9 minutes; results in `SIM-REPORT.md`).
- Look: `art/STYLE.md`, the style frames `art/style-frame.webp` and `art/style-briefing.webp`, the icon sheet `art/icons-sheet.webp`; screenshots of the built app in `screens/`.
