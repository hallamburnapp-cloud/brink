# BRINK: the war-room roguelike

Balatro-style building where the world map is the hand, played from a war room.

- `DESIGN.md`: the chosen design in full, why it meets the owner's three anchors, its risks and open questions.
- `PROTOTYPE-SPEC.md`: the spec for the playable slice (map data, patterns, scoring order, staff, Orders, the shop, timings, the first-night seed, simulator gates).
- `STUDY.md`: the research on Balatro and on what the owner likes, the audit of this repository, the five designs, the judges and the ranking.
- `reference/`: a Python reference implementation of the rules. `python3 ex2.py` and `python3 ex3.py` print the worked examples the spec quotes (Front 252; 10,920 against 8,736 when two staff swap seats); the TypeScript engine must reproduce them. `map.json` is the thirty regions with positions, ports, neighbours and sea lanes; `preview.png` is the greybox map.

Decision: D-102 in `DECISIONS.md`.
