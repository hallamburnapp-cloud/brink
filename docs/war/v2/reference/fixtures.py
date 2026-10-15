"""Writes fixtures.json: positions the TypeScript engine must reproduce exactly.

    python3 fixtures.py            (writes fixtures.json next to this file)

Owner maps are 30-character strings in IDS order (the region ids sorted: ASK BRK BRN DNM DRF EDV FLE
FRM GLM GUL HRT ICW KLM KLP LNK LTL MRD MRM NWK ORN PBB QLN RMH SHL SLW TLM TRN VSY WMS WNM), one
character a region: '.' grey, 'G' gold, 'R' war. Scores are strings (they can exceed 2^53).
The cases are drawn from a fixed seed, so the file only changes when the rules change.
"""
import sys
sys.dont_write_bytecode = True

import json
import os
import random

import rules as R

CH = {'grey': '.', 'gold': 'G', 'red': 'R'}


def enc(owner):
    return ''.join(CH[owner[r]] for r in R.IDS)


def rand_owner(rng):
    o = {}
    pg, pr = rng.random(), rng.random() * 0.4
    for r in R.IDS:
        x = rng.random()
        o[r] = 'gold' if x < pg * 0.8 else 'red' if x < pg * 0.8 + pr * 0.4 else 'grey'
    return o


def main():
    rng = random.Random('fixtures-v2')
    prng = random.Random('fixtures-v2-pins')
    out = dict(
        about='BRINK v2 Win the World reference fixtures. See docs/war/v2/SPEC.md section 15.',
        ids=R.IDS,
        params={k: (list(v) if isinstance(v, tuple) else v) for k, v in R.P.items()},
        staff={k: dict(name=v[0], icon=v[1], price=v[2], rule=v[3], chip=v[4]) for k, v in R.STAFF.items()},
        targets=[R.target(t) for t in range(1, 41)],
        score=[], ladder=[], legal=[], groups=[], winOrder=[], warSpread=[], lift=[],
    )
    while len(out['score']) < 400:
        i = len(out['score'])
        owner = rand_owner(rng)
        non = [r for r in R.IDS if owner[r] != 'gold']
        if not non:
            continue
        c = rng.choice(non)
        lit = rng.sample([r for r in R.IDS if r != c and owner[r] != 'red'], min(10, sum(1 for r in R.IDS if r != c and owner[r] != 'red')))
        gs = R.groups(lit, c)
        pins = list(rng.choice(gs))
        seats = rng.sample(R.STAFF_IDS, rng.randint(0, 5))
        old = 10 + 2 * rng.randint(0, 15)
        tr = [] if i < 80 else None
        s, pts, m10 = R.score_pins(pins, seats, owner, c, old, trace=tr)
        case = dict(owner=enc(owner), crisis=c, lit=lit, pins=pins, seats=seats, oldhandM10=old,
                    score=str(s), points=pts, m10=str(m10))
        if tr is not None:
            case['trace'] = [[str(x) if isinstance(x, int) and abs(x) > 2 ** 52 else x for x in e] for e in tr]
        out['score'].append(case)
    for i in range(200):
        T = R.target(rng.randint(1, 30))
        s = int(T * (10 ** rng.uniform(-0.5, 3.5)))
        out['ladder'].append(dict(target=T, score=str(s), regions=R.regions_won(s, T), next=str(R.next_bar(s, T))))
    for i in range(300):
        c = rng.choice(R.IDS)
        lit = rng.sample([r for r in R.IDS if r != c], 10)
        pool = R.pinnable(lit, c)
        pins = rng.sample(pool if rng.random() < 0.8 else R.IDS, rng.randint(1, 6))
        out['legal'].append(dict(crisis=c, lit=lit, pins=pins, legal=R.legal(pins, lit, c)))
    for i in range(100):
        c = rng.choice(R.IDS)
        lit = rng.sample([r for r in R.IDS if r != c], rng.randint(4, 10))
        out['groups'].append(dict(crisis=c, lit=lit, count=len(R.groups(lit, c))))
    for i in range(200):
        owner = rand_owner(rng)
        non = [r for r in R.IDS if owner[r] != 'gold']
        if not non:
            continue
        c = rng.choice(non)
        k = rng.randint(1, 9)
        # pin it to claim it: pins drawn from a stream of their own, so the other cases stay as they were
        pins = prng.sample(R.IDS, prng.randint(0, 5))
        out['winOrder'].append(dict(owner=enc(owner), crisis=c, k=k, pins=pins, order=R.win_order(c, owner, k, pins)))
    for i in range(150):
        owner = rand_owner(rng)
        if not any(owner[r] == 'gold' for r in R.IDS):
            owner[R.P['HOME']] = 'gold'
        out['warSpread'].append(dict(owner=enc(owner), spreadsTo=R.war_spread_target(owner)))
    while len(out['lift']) < 100:
        c = rng.choice(R.IDS)
        lit = rng.sample([r for r in R.IDS if r != c], 10)
        big = [x for x in R.groups(lit, c) if len(x) >= 3]
        if not big:
            continue
        g = list(rng.choice(big))
        rng.shuffle(g)
        r = rng.choice(g)
        out['lift'].append(dict(pinsInTapOrder=g, lift=r, left=R.lift(g, r)))
    # the scripted first game, turns 1-2, with the coached sends
    g = R.Game('FIRST-WORLD', first_world=True)
    script = []
    for pins in (['SHL', 'LNK', 'PBB', 'MRM', 'TRN'], ['TRN', 'MRD', 'EDV', 'LNK', 'SHL']):
        g.begin_turn()
        lit = list(g.lit)
        rec = g.send(pins)
        script.append(dict(turn=rec['turn'], crisis=rec['crisis'], target=rec['target'], lit=lit, pins=pins,
                           score=str(rec['score']), won=rec['won'], gold=rec['gold'], red=rec['red'], coins=rec['coins'],
                           owner=enc(g.owner)))
    out['firstWorld'] = script
    path = os.path.join(R.HERE, 'fixtures.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('wrote %s (%d score, %d ladder, %d legal, %d groups, %d winOrder, %d warSpread, %d lift cases)' % (
        path, len(out['score']), len(out['ladder']), len(out['legal']), len(out['groups']), len(out['winOrder']),
        len(out['warSpread']), len(out['lift'])))


if __name__ == '__main__':
    main()
