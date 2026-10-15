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
        score=[], ladder=[], legal=[], groups=[], winOrder=[], warSpread=[], lift=[], dead=[], pushDraw=[], push=[],
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
    # Dead deals (decision B, B2): what the game says of a deal before any pin. 'live' some legal send
    # of the lit regions reaches the target as seated; 'reorder' none does as seated but one does
    # under another seating (REORDER STAFF TO WIN); 'dead' none does under any seating (NO SEND CAN
    # WIN), with the lever's label for a swap usable or not, in the push or not. Drawn from a stream of
    # their own, so the cases above stay as they were.
    drng = random.Random('fixtures-v2-dead')
    while len(out['dead']) < 200:
        owner = rand_owner(drng)
        if not any(owner[r] == 'gold' for r in R.IDS):
            owner[R.P['HOME']] = 'gold'
        non = [r for r in R.IDS if owner[r] != 'gold']
        if not non:
            continue
        c = drng.choice(non)
        pool = [r for r in R.IDS if r != c and owner[r] != 'red']
        lit = drng.sample(pool, min(10, len(pool), drng.randint(1, 10)))
        seats = drng.sample(R.STAFF_IDS, drng.randint(0, 5))
        old = 10 + 2 * drng.randint(0, 15)
        held = sum(1 for r in R.IDS if owner[r] == 'gold')
        sc = R.Scorer(seats, held, old)
        best = max(sc(R.feats(g, owner, c)) for g in R.groups(lit, c))
        fs = R.reduce_feats({R.feats(g, owner, c) for g in R.groups(lit, c)})
        seating, any_best = R.best_seating(fs, seats, held, old)
        T = drng.choice((best, best + 1, any_best, any_best + 1, R.target(drng.randint(1, 26))))
        swap, final = drng.random() < 0.5, drng.random() < 0.3
        g = R.Game('fixtures-dead')
        g.owner, g.crisis, g.lit, g.seats, g.oldhand_m10, g.target = dict(owner), c, list(lit), list(seats), old, T
        g.final_push, g.swaps_left, g.pile = final, 1 if swap else 0, [x for x in pool if x not in lit][:1] if swap else []
        if swap and not g.pile:
            continue
        p = g.preview([])
        out['dead'].append(dict(owner=enc(owner), crisis=c, lit=lit, seats=seats, oldhandM10=old, target=str(T),
                                best=str(best), bestAnyOrder=str(any_best), seating=seating, state=p['state'],
                                dead=p['state'] == 'dead', swap=swap, finalPush=final, pile=list(g.pile),
                                label=p['label'], line=p['line']))
    # The push's crisis draw (A2): with no grey left, the red regions touching gold that some fresh deal
    # could win with the best seating of the line-up (any touching group of up to 5 of the regions within
    # NEAR joins that are not red, and the crisis), or all of them when none could.
    xrng = random.Random('fixtures-v2-push-draw')
    while len(out['pushDraw']) < 120:
        owner = {r: 'gold' for r in R.IDS}
        for r in xrng.sample(R.IDS, xrng.randint(1, 9)):
            owner[r] = 'red'
        red = [r for r in R.IDS if owner[r] == 'red' and any(owner[n] == 'gold' for n in R.ADJ[r])]
        if not red:
            continue
        g = R.Game('fixtures-push-draw')
        g.owner = owner
        g.seats = xrng.sample(R.STAFF_IDS, xrng.randint(0, 5))
        g.oldhand_m10 = 10 + 2 * xrng.randint(0, 15)
        # A turn whose target some candidates reach and others do not, where there is one (two cases in
        # three), else any late turn.
        best = []
        for c in red:
            pile = [r for r in R.IDS if r != c and owner[r] != 'red' and R.DIST[c][r] <= R.P['NEAR']]
            fs = R.reduce_feats({R.feats(x, owner, c) for x in R.groups(pile, c)})
            best.append(R.best_seating(fs, g.seats, sum(1 for r in R.IDS if owner[r] == 'gold'), g.oldhand_m10)[1])
        split = [t for t in range(1, 41) if min(best) < R.target(t) <= max(best)]
        g.turn = xrng.choice(split) if split and xrng.random() < 2 / 3 else xrng.randint(8, 30)
        g.target = R.target(g.turn)
        pool = g.push_pool(list(red))
        out['pushDraw'].append(dict(owner=enc(owner), turn=g.turn, seats=list(g.seats), oldhandM10=g.oldhand_m10,
                                    red=red, pool=pool, draw=g.push_draw))
    # The forgiving final push: a send with 0-2 push misses already made. A miss changes no region and
    # counts; the PUSH_MISSES-th is a CEASEFIRE. A win takes regions back as ever.
    prng2 = random.Random('fixtures-v2-push')
    while len(out['push']) < 80:
        owner = {r: 'gold' for r in R.IDS}
        for r in prng2.sample(R.IDS, prng2.randint(1, 9)):
            owner[r] = 'red'
        reds = [r for r in R.IDS if owner[r] == 'red' and any(owner[n] == 'gold' for n in R.ADJ[r])]
        if not reds or not any(owner[r] == 'gold' for r in R.IDS):
            continue
        g = R.Game('fixtures-push')
        g.owner = dict(owner)
        g.turn = prng2.randint(14, 24)
        g.final_push = True
        g.crisis = prng2.choice(reds)
        g.lit = [r for r in R.IDS if r != g.crisis and owner[r] != 'red' and R.DIST[g.crisis][r] <= R.P['NEAR']][:10]
        g.seats = prng2.sample(R.STAFF_IDS, prng2.randint(0, 5))
        g.oldhand_m10 = 10 + 2 * prng2.randint(0, 15)
        g.push_misses = prng2.randint(0, R.P['PUSH_MISSES'] - 1)
        pins = list(prng2.choice(R.groups(g.lit, g.crisis)))
        sc = R.score_pins(pins, g.seats, g.owner, g.crisis, g.oldhand_m10)[0]
        g.target = prng2.choice((sc, sc + 1, sc * 4, max(1, sc // 5)))
        before = dict(dict(owner=enc(owner), crisis=g.crisis, lit=list(g.lit), pins=pins, seats=list(g.seats),
                           oldhandM10=g.oldhand_m10, turn=g.turn, target=str(g.target), pushMissesBefore=g.push_misses,
                           label=g.preview(pins)['label']))
        rec = g.send(pins)
        out['push'].append(dict(before, score=str(rec['score']), result=rec['result'], won=rec['won'],
                                pushMissesAfter=g.push_misses, ending=g.result, ownerAfter=enc(g.owner)))
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
    print('wrote %s (%d score, %d ladder, %d legal, %d groups, %d winOrder, %d warSpread, %d lift, %d dead, %d pushDraw, %d push cases)' % (
        path, len(out['score']), len(out['ladder']), len(out['legal']), len(out['groups']), len(out['winOrder']),
        len(out['warSpread']), len(out['lift']), len(out['dead']), len(out['pushDraw']), len(out['push'])))


if __name__ == '__main__':
    main()
