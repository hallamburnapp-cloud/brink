"""Generate reference-cases.json: random scoring positions scored by the Python reference.

Run from the repository root:
    python3 src/war/engine/fixtures/gen-reference-cases.py > src/war/engine/fixtures/reference-cases.json

Every pattern stays at level 1 (where the reference's rung order and the spec's product rule
agree), and positions with an exact tie between two Surround rings or two Link pairs are
skipped (the reference breaks those by iteration order, the spec by westmost).
"""
import itertools, json, os, random, sys

REF = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'docs', 'war', 'reference')
sys.path.insert(0, os.path.abspath(REF))

from board import REGIONS, LAND, LANES  # noqa: E402
import engine  # noqa: E402
import patterns as P  # noqa: E402

KEY = {'SINGLE': 'SINGLE', 'LINK': 'LINK', 'TWOLINK': 'TWO_LINKS', 'WORLD': 'WORLDWIDE', 'CHAIN': 'CHAIN',
       'FRONT': 'FRONT', 'SURR': 'SURROUND', 'NETWORK': 'NETWORK', 'BLOC': 'BLOC', 'WHOLE': 'WHOLE_BLOC',
       'AROUND': 'AROUND_THE_WORLD'}
STAFF = ['DUTY', 'QM', 'HARBOUR', 'SURVEYOR', 'HOTLINE', 'GOVERNOR', 'OLDHAND', 'RAILCLERK', 'MEDIATOR',
         'STRATEGIST', 'ENVOY', 'COURIER', 'FERRY', 'SIGNALS', 'ADMIRAL', 'CHIEF', 'DEPUTY', 'HERALD', 'SOVEREIGN']
COLOURS = ['CAP', 'HMR', 'SCT', 'SND', 'FRS']
JOINS = [tuple(j) for j in list(LAND) + list(LANES)]
IDS = list(REGIONS)


def ambiguous(w, sel, twist):
    adj = w.adj(twist == 'GRIDLOCK')
    s = set(sel)
    live = [r for r in w.reg if not w.reg[r]['retired']]
    weights = [sum(REGIONS[x][2] for x in adj[r]) for r in live
               if r not in s and len(adj[r]) >= 3 and adj[r] <= s]
    if weights and weights.count(max(weights)) > 1:
        return True
    comps = P.components(sel, adj)
    pairs = [sum(REGIONS[x][2] for x in c) for c in comps if len(c) == 2]
    return len(pairs) >= 2 and pairs.count(max(pairs)) > 1


def pick_pins(rng, w, live, twist):
    """Random pins, biased towards shapes: joined groups, rings, one colour, five colours."""
    adj = w.adj(twist == 'GRIDLOCK')
    roll = rng.random()
    n = rng.randint(1, 5)
    if roll < 0.45:  # grow a joined group
        sel = [rng.choice(live)]
        while len(sel) < n:
            frontier = sorted({y for x in sel for y in adj[x] if y not in sel})
            if not frontier:
                break
            sel.append(rng.choice(frontier))
        return sel
    if roll < 0.6:  # ring a region
        rings = [r for r in live if 3 <= len(adj[r]) <= 5]
        r = rng.choice(rings)
        sel = sorted(adj[r])
        extra = [x for x in live if x not in sel and x != r]
        return sel + rng.sample(extra, rng.randint(0, 5 - len(sel)))
    if roll < 0.7:  # one colour
        c = rng.choice(COLOURS)
        same = [r for r in live if w.reg[r]['bloc'] == c]
        return rng.sample(same, min(len(same), 5))
    if roll < 0.8:  # five colours
        return [rng.choice([r for r in live if w.reg[r]['bloc'] == c] or live) for c in COLOURS][:5]
    return rng.sample(live, n)


def case(rng):
    w = engine.World()
    staff = rng.sample(STAFF, rng.randint(0, 5))
    if 'CHIEF' in staff and rng.random() < 0.5:
        staff.append('CHIEF')  # never doubles in the shop, but the Deputy can copy it
        staff = staff[:5]
    w.staff = [{'id': s, 'var': 5 * rng.randint(0, 6) if s == 'OLDHAND' else 0} for s in staff]
    for a, b in rng.sample(JOINS, rng.randint(0, 10)):
        w.traffic[frozenset((a, b))] = rng.randint(1, 9)
    for r in rng.sample(IDS, rng.randint(0, 4)):
        w.reg[r]['stamp'] = rng.choice(['FORTIFY', 'RELAY', 'ECHO'])
    for r in rng.sample(IDS, rng.randint(0, 3)):
        w.reg[r]['pins'] = rng.randint(1, 3)
    cables = []
    for _ in range(rng.randint(0, 2)):
        a, b = rng.sample(IDS, 2)
        if frozenset((a, b)) in w.joins or frozenset((a, b)) in w.cables:
            continue
        w.cables.add(frozenset((a, b)))
        w.reg[a]['port'] = True
        w.reg[b]['port'] = True
        cables.append([a, b])
    promoted = [r for r in rng.sample(IDS, rng.randint(0, 2)) if not w.reg[r]['cap']]
    for r in promoted:
        w.reg[r]['cap'] = True
    recolour = {}
    for r in rng.sample(IDS, rng.randint(0, 3)):
        recolour[r] = rng.choice(COLOURS)
        w.reg[r]['bloc'] = recolour[r]
    retired = rng.sample(IDS, rng.randint(0, 4)) if rng.random() < 0.3 else []
    for r in retired:
        w.reg[r]['retired'] = True
    live = [r for r in IDS if r not in retired]
    roll = rng.random()
    if roll < 0.15:
        twist = 'GRIDLOCK'
    elif roll < 0.3 and 'CHIEF' not in staff:
        twist = ('BLACKOUT', rng.choice(COLOURS))
    else:
        twist = None
    sel = list(dict.fromkeys(pick_pins(rng, w, live, twist)))
    lit = sel + rng.sample([r for r in live if r not in sel], 8 - len(sel))
    if len(sel) < 5 and rng.random() < 0.25:
        # The last pin came by Airlift: it is not lit, so light another region instead.
        lit.remove(sel[-1])
        lit.append(rng.choice([r for r in live if r not in lit and r not in sel]))
    rng.shuffle(lit)
    hot = rng.choice(lit) if rng.random() < 0.7 else None
    if ambiguous(w, sel, twist):
        return None
    lev, k, scoring, top = engine.score(w, tuple(sel), lit, hot, twist)
    return {
        'staff': staff,
        'oldHand': [s['var'] for s in w.staff],
        'traffic': [[a, b, t] for j, t in w.traffic.items() for a, b in [sorted(j)]],
        'stamps': {r: w.reg[r]['stamp'] for r in IDS if w.reg[r]['stamp']},
        'brass': {r: w.reg[r]['pins'] for r in IDS if w.reg[r]['pins']},
        'cables': cables,
        'promoted': promoted,
        'colour': recolour,
        'retired': retired,
        'twist': twist if twist is None or isinstance(twist, str) else list(twist),
        'lit': lit,
        'flashpoint': hot,
        'pins': sel,
        'leverage': str(lev),
        'pattern': KEY[k],
        'scoring': sorted(scoring),
        'top': top,
    }


def main():
    rng = random.Random(20261013)
    out = []
    while len(out) < 1200:
        c = case(rng)
        if c:
            out.append(c)
    json.dump(out, sys.stdout, separators=(',', ':'))


main()
