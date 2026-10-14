"""Replay crises and deals in the Python reference (docs/war/reference) for the cross-check.

    python3 src/war/sim/crosscheck.py cases.json results.json [spec-ties|reference-ties]

cases.json comes from src/war/sim/crosscheck.ts. Each crisis case carries the deck orders the
TypeScript bot saw (the opening pile and every reshuffle of the spent regions) and, for the
random tapper, its picks. A stand-in for random.Random hands those out, so the reference bot
plays the identical deal; every committed sweep is recorded and written back for comparison.

Ties: when two Surround rings have the same neighbour weight, the spec (section 3) takes the
westmost ringed region; the reference takes the last one in map order. With 'spec-ties' (the
default) the reference is patched in memory to follow the spec, so the replay must match exactly;
'reference-ties' runs it as shipped, to count how often that ruling changes a sweep.
"""
import json
import os
import sys

REF = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'docs', 'war', 'reference'))
sys.path.insert(0, REF)

import itertools  # noqa: E402

import engine  # noqa: E402  (importing it installs the final LADDER into patterns)
import crisis  # noqa: E402
import patterns as P  # noqa: E402
import spread  # noqa: E402

KEY = {'SINGLE': 'SINGLE', 'LINK': 'LINK', 'TWOLINK': 'TWO_LINKS', 'WORLD': 'WORLDWIDE', 'CHAIN': 'CHAIN',
       'FRONT': 'FRONT', 'SURR': 'SURROUND', 'NETWORK': 'NETWORK', 'BLOC': 'BLOC', 'WHOLE': 'WHOLE_BLOC',
       'AROUND': 'AROUND_THE_WORLD'}


_detect = P.detect


def detect_spec_ties(sel, adj=None, regions=None, bloc_of=None, live_regions=None, enabled=None):
    """patterns.detect, but a Surround tie goes to the westmost ringed region (spec section 3)."""
    adj = adj if adj is not None else P.ADJ
    regions = regions if regions is not None else P.REGIONS
    k, scoring = _detect(sel, adj=adj, regions=regions, bloc_of=bloc_of, live_regions=live_regions, enabled=enabled)
    if k == 'SURR':
        s = set(sel)
        rings = [(sum(regions[x][2] for x in adj[r]), r) for r in regions
                 if r not in s and len(adj[r]) >= P.SURR_MIN and adj[r] <= s]
        top = max(w for w, _ in rings)
        ringed = min((r for w, r in rings if w == top), key=lambda r: (regions[r][3], regions[r][4]))
        scoring = set(adj[ringed])
    return k, scoring


class Diverged(Exception):
    pass


class Replay:
    """Stands in for random.Random: hands out recorded deck orders and bot picks."""

    def __init__(self, shuffles, picks=()):
        self.shuffles = [list(s) for s in shuffles]
        self.picks = [list(p) for p in picks]

    def shuffle(self, xs):
        if not self.shuffles:
            raise Diverged('the reference reshuffled where the port did not')
        order = self.shuffles.pop(0)
        if sorted(order) != sorted(xs):
            raise Diverged('different regions to reshuffle: %s vs %s' % (sorted(xs), sorted(order)))
        xs[:] = order

    def randint(self, a, b):
        return len(self.picks[0])

    def sample(self, xs, n):
        pick = self.picks.pop(0)
        if len(pick) != n or any(r not in xs for r in pick):
            raise Diverged('random pick %s not in the lit hand %s' % (pick, list(xs)))
        return pick


def twist_of(t):
    if t is None:
        return None
    if t['kind'] == 'BLACKOUT':
        return ('BLACKOUT', t['colour'])
    return {'GRIDLOCK': 'GRIDLOCK', 'FULL_TABLE': 'FULLTABLE'}[t['kind']]


def random_crisis(target, rng, pick, record):
    """randbot.crisis(), verbatim but for the score spy (randbot.py runs its table on import)."""
    w = engine.World(); live = list(w.reg); rng.shuffle(live); hot = live[0]; lit = live[:8]; pile = live[8:]; spent = []; total = 0
    for s in range(4):
        sel = pick(lit, rng)
        lev = record(w, sel, lit, hot, commit=True)[0]; total += lev
        for r in sel: lit.remove(r); spent.append(r)
        need = 8 - len(lit)
        if need > len(pile): rng.shuffle(spent); pile += spent; spent = []
        lit += pile[:need]; del pile[:need]
        if total >= target: return True, total, 3 - s
    return False, total, 0


def rand_pick(lit, rng):
    n = rng.randint(1, 5); return tuple(rng.sample(lit, n))


def replay_crisis(case):
    sweeps = []
    real_score = engine.score

    def record(w, sel, lit, hot=None, twist=None, trace=None, commit=False):
        r = real_score(w, sel, lit, hot, twist, trace, commit)
        if commit:
            sweeps.append({'pins': list(sel), 'pattern': KEY[r[1]], 'leverage': str(r[0])})
        return r

    rng = Replay([case['opening']] + case['reshuffles'], case.get('picks', []))
    try:
        if case['bot'] == 'random':
            ok, total, left = random_crisis(case['target'], rng, rand_pick, record)
        else:
            crisis.score = record
            w = engine.World()
            w.staff = [{'id': s} for s in case['staff']]
            ok, total, left, _top = crisis.play_crisis(w, case['target'], rng, use_air=case['airlift'],
                                                       twist=twist_of(case['twist']))
        unused = len(rng.shuffles)
        out = {'id': case['id'], 'cleared': bool(ok), 'total': str(total), 'sweepsLeft': left, 'sweeps': sweeps}
        if unused:
            out['error'] = 'the port reshuffled %d more time(s) than the reference' % unused
        return out
    except Diverged as e:
        return {'id': case['id'], 'error': str(e), 'sweeps': sweeps}
    finally:
        crisis.score = real_score


def replay_deal(case):
    """spread.run() for one deal: every selection of 1-5, scored the way spread.py scores it."""
    ladder = {k[0]: (k[2], k[3]) for k in P.LADDER}
    deal = case['deal']
    hot = deal[0]
    plays = []
    for n in range(1, 6):
        for sel in itertools.combinations(deal, n):
            plays.append(spread.score_plain(sel, hot, ladder))
    vals = sorted(v for _, v in plays)
    m = len(vals) // 2
    bk, bv = max(plays, key=lambda p: p[1])
    other = max((v for k, v in plays if k != bk), default=0)
    return {'id': case['id'], 'best': str(bv), 'bestPattern': KEY[bk], 'middleSum': str(vals[m - 1] + vals[m]),
            'bestOther': str(other)}


def main():
    if (sys.argv[3] if len(sys.argv) > 3 else 'spec-ties') == 'spec-ties':
        P.detect = detect_spec_ties
    with open(sys.argv[1]) as f:
        cases = json.load(f)
    out = {'crises': [replay_crisis(c) for c in cases['crises']], 'deals': [replay_deal(d) for d in cases['deals']]}
    with open(sys.argv[2], 'w') as f:
        json.dump(out, f)


if __name__ == '__main__':
    main()
