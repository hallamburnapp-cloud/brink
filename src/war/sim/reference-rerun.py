"""Re-run the reference calibration (docs/war/reference/calib2.py) with more crises per row.

    python3 src/war/sim/reference-rerun.py 1000 5 0,1,2,3      # crises per row, seed, row indexes

The spec's calibration figures come from 200 crises a row (about +/-7 points at 95%). This runs
the same loop (crisis.play_crisis, random.Random(seed) per row, no Airlift) on any number of
crises, one tab-separated line per row: index, staff, twist, target, crises, cleared, %, median.
Its 1,000-crisis output is PY_RERUN in reference.ts.
"""
import os
import random
import statistics
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'docs', 'war', 'reference')))

from engine import World  # noqa: E402
from crisis import play_crisis  # noqa: E402

BUILDS = {'bare': [], 'duty': ['DUTY'], 'duty+hotline': ['DUTY', 'HOTLINE'],
          'hotline+duty+strategist': ['HOTLINE', 'DUTY', 'STRATEGIST']}
ROWS = [('bare', 300, None), ('bare', 450, None), ('bare', 600, None), ('bare', 900, None),
        ('bare', 1350, None), ('bare', 1800, None), ('bare', 2500, None), ('bare', 600, 'GRIDLOCK'),
        ('duty', 1800, None), ('duty', 2500, None), ('duty', 3750, None),
        ('duty+hotline', 2500, None), ('duty+hotline', 3750, None), ('duty+hotline', 5000, None),
        ('duty+hotline', 1800, 'BLACKOUT'),
        ('hotline+duty+strategist', 3750, None), ('hotline+duty+strategist', 5000, None),
        ('hotline+duty+strategist', 5000, 'FULLTABLE'), ('hotline+duty+strategist', 9000, None)]


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    rows = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else range(len(ROWS))
    for i in rows:
        name, target, twist_kind = ROWS[i]
        rng = random.Random(seed)
        wins = 0
        totals = []
        for _ in range(n):
            w = World()
            w.staff = [{'id': s} for s in BUILDS[name]]
            twist = ('BLACKOUT', rng.choice(['CAP', 'HMR', 'SCT', 'SND', 'FRS'])) if twist_kind == 'BLACKOUT' else twist_kind
            ok, total, _left, _top = play_crisis(w, target, rng, use_air=False, twist=twist)
            wins += ok
            totals.append(total)
        print(f'{i}\t{name}\t{twist_kind}\t{target}\t{n}\t{wins}\t{100 * wins / n:.1f}\t{statistics.median(totals):.0f}', flush=True)


if __name__ == '__main__':
    main()
